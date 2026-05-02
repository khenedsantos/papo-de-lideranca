(function () {
  const LEVEL_LABEL = {
    ESSENTIAL: "essencial",
    DEEPENING: "aprofundamento",
    PROVOCATION: "provocação",
  };

  const PROMPTS = [
    {
      key: "main_idea",
      label: "qual ideia deste livro você levaria para sua liderança?",
    },
    {
      key: "practical_application",
      label: "em que situação prática este livro pode ajudar?",
    },
    {
      key: "leadership_situation",
      label: "que pergunta este livro deixou para você?",
    },
  ];

  const state = {
    detail: null,
    related: {
      articles: [],
      shortEditions: [],
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.classList.contains("livro-page")) return;

    bindEvents();
    loadBook();
  });

  async function loadBook() {
    const slug = new URLSearchParams(window.location.search).get("slug");

    if (!slug) {
      renderError("não encontramos este livro na estante. volte para a curadoria completa.");
      return;
    }

    setState("abrindo sua leitura guiada...");

    try {
      const api = getApi();
      const [detail, articles, shortEditions] = await Promise.all([
        api.apiFetch(`/books/${encodeURIComponent(slug)}`),
        api.apiFetch("/articles").catch(() => []),
        api.apiFetch("/short-editions").catch(() => []),
      ]);

      state.detail = detail;
      state.related.articles = articles || [];
      state.related.shortEditions = shortEditions || [];

      renderBook();
    } catch (error) {
      if (error && error.status === 403) {
        renderError('esta estante é exclusiva para assinantes ativos. <a href="./assinatura.html">ver assinatura</a>');
        return;
      }

      renderError("não encontramos este livro na estante. volte para a curadoria completa.");
    }
  }

  function bindEvents() {
    document.addEventListener("input", (event) => {
      const textarea = event.target.closest("[data-note-textarea]");
      if (!textarea) return;
      updateCounter(textarea);
    });

    document.addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-note-form]");
      if (!form) return;

      event.preventDefault();
      await submitNote(form);
    });
  }

  function renderBook() {
    const detail = state.detail || {};
    const book = detail.book || {};

    document.title = `${book.title || "livro"} | Papo de Liderança`;
    setText("[data-book-category]", book.category || "curadoria");
    setText("[data-book-level]", formatLevel(book.level));
    setText("[data-book-read-time]", book.readTime || "tempo editorial");
    setText("[data-book-title]", book.title || "livro");
    setText("[data-book-author]", book.author || "");
    setText("[data-book-description]", book.description || "");
    setText("[data-book-why]", book.whyRead || "");
    setText("[data-book-practical-use]", book.practicalUse || "escolha uma ideia e aplique em uma conversa real nesta semana.");

    renderCover(book);
    renderPurchase(book);
    renderIdeas(book.keyIdeas || book.whatYouWillLearn || []);
    renderQuestions(book.guidedQuestions || []);
    renderConnections(book);
    renderCommunityNotes(detail.communityNotes || []);
    renderMyNotes(detail.myNotes || []);

    clearState();
    const shell = document.querySelector("[data-book-shell]");
    if (shell) shell.hidden = false;
  }

  function renderCover(book) {
    const cover = document.querySelector("[data-book-cover]");
    if (!cover) return;

    const coverUrl = resolveCoverUrl(book.coverUrl);
    const alt = book.coverAlt || `Capa editorial de ${book.title}`;

    if (coverUrl) {
      cover.innerHTML = `<img class="book-cover-image" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(alt)}">`;
      cover.removeAttribute("aria-label");
      cover.removeAttribute("aria-hidden");
      return;
    }

    cover.innerHTML = `<span>${escapeHtml(getCoverTitle(book.title))}</span>`;
    cover.setAttribute("aria-label", alt);
    cover.removeAttribute("aria-hidden");
  }

  function renderPurchase(book) {
    const link = document.querySelector("[data-book-purchase]");
    const muted = document.querySelector("[data-book-purchase-muted]");
    const note = document.querySelector("[data-book-purchase-note]");

    if (!link || !muted || !note) return;

    if (book.purchaseUrl) {
      link.hidden = false;
      link.href = book.purchaseUrl;
      link.textContent = book.purchaseLabel || `ver opção de compra${book.purchaseProvider ? ` em ${book.purchaseProvider}` : ""}`;
      muted.hidden = true;
      note.hidden = false;
      note.textContent = book.purchaseProvider
        ? `compra externa com ${book.purchaseProvider}, fora do Papo de Liderança.`
        : "a compra acontece fora do Papo de Liderança, diretamente com o parceiro indicado.";
      return;
    }

    link.hidden = true;
    muted.hidden = false;
    note.hidden = true;
  }

  function renderIdeas(ideas) {
    const container = document.querySelector("[data-book-key-ideas]");
    if (!container) return;

    const normalized = normalizeList(ideas).slice(0, 3);

    if (!normalized.length) {
      container.innerHTML = '<p class="book-community-empty">as ideias centrais desta leitura ainda estão em curadoria.</p>';
      return;
    }

    container.innerHTML = normalized.map((idea, index) => `
      <article class="book-idea">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <p>${escapeHtml(extractText(idea))}</p>
      </article>
    `).join("");
  }

  function renderQuestions(questions) {
    const container = document.querySelector("[data-book-questions]");
    if (!container) return;

    const normalized = normalizeList(questions);

    container.innerHTML = normalized.length
      ? normalized.map((question) => `<li>${escapeHtml(extractText(question))}</li>`).join("")
      : "<li>que pergunta desta leitura ajuda a tomar uma decisão melhor ainda esta semana?</li>";
  }

  function renderConnections(book) {
    const container = document.querySelector("[data-book-connections]");
    const section = document.querySelector("[data-book-connections-section]");
    if (!container || !section) return;

    const articleLinks = (book.relatedArticleSlugs || []).map((slug) => {
      const article = state.related.articles.find((item) => item.slug === slug);
      return {
        type: "artigo",
        title: article ? article.title : humanizeSlug(slug),
        description: article ? article.summary || article.excerpt : "leitura relacionada no acervo",
        href: buildReadingUrl({ type: "article", slug }),
      };
    });

    const editionLinks = (book.relatedShortEditionSlugs || []).map((slug) => {
      const edition = state.related.shortEditions.find((item) => item.slug === slug);
      return {
        type: "edição curta",
        title: edition ? edition.title : humanizeSlug(slug),
        description: edition ? edition.summary || edition.excerpt : "edição relacionada no acervo",
        href: buildReadingUrl({ type: "short-edition", slug }),
      };
    });

    const links = [...articleLinks, ...editionLinks];

    if (!links.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    container.innerHTML = links.map((item) => `
      <a href="${escapeHtml(item.href)}">
        <span>${escapeHtml(item.type)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.description)}</small>
      </a>
    `).join("");
  }

  function renderCommunityNotes(notes) {
    const container = document.querySelector("[data-community-notes]");
    if (!container) return;

    if (!notes.length) {
      container.innerHTML = '<p class="book-community-empty">as margens da comunidade ainda estão em curadoria para este livro.</p>';
      return;
    }

    container.innerHTML = notes.map((note) => `
      <article class="book-note-card${note.isHighlighted ? " is-highlighted" : ""}">
        <div class="estante-meta">
          <span>${escapeHtml(promptLabel(note.promptKey))}</span>
          ${note.isHighlighted ? "<span>nota destacada</span>" : ""}
        </div>
        <p>${escapeHtml(note.content)}</p>
        <strong>${escapeHtml(note.authorLabel || "assinante")}</strong>
      </article>
    `).join("");
  }

  function renderMyNotes(notes) {
    const container = document.querySelector("[data-my-note-prompts]");
    if (!container) return;

    container.innerHTML = PROMPTS.map((prompt) => {
      const note = notes.find((item) => item.promptKey === prompt.key);
      const content = note ? note.content : "";

      return `
        <form class="book-note-card" data-note-form data-prompt-key="${prompt.key}">
          <label>
            <span>${escapeHtml(prompt.label)}</span>
            <textarea data-note-textarea maxlength="500" placeholder="escreva uma nota curta, concreta e útil">${escapeHtml(content)}</textarea>
          </label>
          <div class="book-note-foot">
            <span class="book-note-status">${note ? statusLabel(note.status) : "nova nota"}</span>
            <span data-note-counter>${content.length}/500</span>
            <button type="submit">salvar nota</button>
          </div>
          <p class="book-note-message" data-note-message></p>
        </form>
      `;
    }).join("");
  }

  async function submitNote(form) {
    const detail = state.detail || {};
    const book = detail.book || {};
    const textarea = form.querySelector("[data-note-textarea]");
    const message = form.querySelector("[data-note-message]");
    const promptKey = form.dataset.promptKey;
    const content = textarea ? textarea.value.trim() : "";

    if (!content || content.length < 20) {
      setFormMessage(message, "escreva pelo menos 20 caracteres para salvar uma nota útil.", true);
      return;
    }

    if (content.length > 500) {
      setFormMessage(message, "sua nota precisa ter no máximo 500 caracteres.", true);
      return;
    }

    try {
      const saved = await getApi().apiFetch(`/books/${encodeURIComponent(book.slug)}/notes`, {
        method: "POST",
        body: {
          promptKey,
          content,
        },
      });

      const notes = detail.myNotes || [];
      const index = notes.findIndex((note) => note.promptKey === saved.promptKey);
      if (index >= 0) notes[index] = saved;
      else notes.push(saved);
      detail.myNotes = notes;

      renderMyNotes(notes);
      const updatedForm = document.querySelector(`[data-note-form][data-prompt-key="${promptKey}"]`);
      setFormMessage(updatedForm && updatedForm.querySelector("[data-note-message]"), "sua nota foi salva e pode ser revisada antes de aparecer para outros assinantes.");
    } catch (error) {
      setFormMessage(message, "não foi possível salvar sua nota agora. tente novamente em instantes.", true);
    }
  }

  function updateCounter(textarea) {
    const form = textarea.closest("[data-note-form]");
    const counter = form ? form.querySelector("[data-note-counter]") : null;
    if (counter) counter.textContent = `${textarea.value.length}/500`;
  }

  function setFormMessage(node, text, isError) {
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("is-error", Boolean(isError));
  }

  function setState(message) {
    const node = document.querySelector("[data-book-state]");
    if (!node) return;
    node.hidden = false;
    node.innerHTML = message;
  }

  function clearState() {
    const node = document.querySelector("[data-book-state]");
    if (!node) return;
    node.hidden = true;
    node.textContent = "";
  }

  function renderError(message) {
    const shell = document.querySelector("[data-book-shell]");
    if (shell) shell.hidden = true;
    setState(`${message} <a href="./estante.html">voltar para a curadoria completa</a>`);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value || "";
  }

  function getApi() {
    if (!window.PapoApi || !window.PapoApi.apiFetch) {
      throw new Error("API indisponível.");
    }

    return window.PapoApi;
  }

  function buildReadingUrl(item) {
    if (window.PapoReadingRoutes && window.PapoReadingRoutes.buildReadingUrl) {
      return window.PapoReadingRoutes.buildReadingUrl(item);
    }

    return `./leitura.html?type=${encodeURIComponent(item.type)}&slug=${encodeURIComponent(item.slug)}`;
  }

  function formatLevel(level) {
    return LEVEL_LABEL[level] || String(level || "leitura").toLowerCase();
  }

  function resolveCoverUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("../") || url.startsWith("./")) return url;
    if (url.startsWith("/assets/")) return `..${url}`;
    if (url.startsWith("/")) {
      return window.PapoAuth && window.PapoAuth.resolveAssetUrl
        ? window.PapoAuth.resolveAssetUrl(url)
        : url;
    }

    return url;
  }

  function statusLabel(status) {
    if (status === "APPROVED") return "aprovada";
    if (status === "REJECTED") return "revisar";
    return "em revisão";
  }

  function promptLabel(promptKey) {
    const prompt = PROMPTS.find((item) => item.key === promptKey);
    return prompt ? prompt.label : "nota de leitura";
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function extractText(value) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return value.text || value.title || value.idea || JSON.stringify(value);
    }

    return "";
  }

  function humanizeSlug(slug) {
    return String(slug || "")
      .replace(/^artigo-/, "")
      .replace(/-/g, " ");
  }

  function getCoverTitle(title) {
    const words = String(title || "livro").split(/\s+/).filter(Boolean);
    return words.slice(0, 4).join(" ");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

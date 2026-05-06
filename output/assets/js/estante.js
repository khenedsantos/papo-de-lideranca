(function () {
  const LEVEL_LABEL = {
    ESSENTIAL: "essencial",
    DEEPENING: "aprofundamento",
    PROVOCATION: "provocação",
  };

  const DEFAULT_PURCHASE_LABEL = "comprar livro indicado";
  const CARD_COVER_ZOOM = "3";
  const FEATURED_COVER_ZOOM = "4";

  const BOOK_ENRICHMENT = {
    "gestor-eficaz": {
      coverUrl: "https://books.google.com/books/content?id=fG_ADwAAQBAJ&printsec=frontcover&img=1&zoom=3&source=gbs_api",
      coverAlt: "Capa do livro O gestor eficaz, de Peter Drucker",
      curationNote: "Para líderes que precisam separar agenda cheia de contribuição real.",
      impactLabel: "para decisões de prioridade",
    },
    "lideranca-daniel-goleman": {
      coverUrl: "https://books.google.com/books/content?id=tZFsBgAAQBAJ&printsec=frontcover&img=1&zoom=3&source=gbs_api",
      coverAlt: "Capa do livro Liderança, de Daniel Goleman",
      curationNote: "Para observar como presença emocional, clima e influência atravessam a liderança.",
      impactLabel: "para clima e influência",
    },
    "comece-pelo-porque": {
      coverUrl: "https://books.google.com/books/publisher/content?edge=curl&id=uGBwDwAAQBAJ&img=1&imgtk=AFLRE72u-dPh4Cr-pLajfw2ewZcHnN9uizSupcsBFixcC453qBJihD3n-BpTamru2_nXRF6ehcu9Gz0-F9khEx0Klaic-mRdlssrWqoKD_YLeIyFcTV8F6_ghTmofzf4gP8TPHgk4Zdl&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro Comece pelo porquê, de Simon Sinek",
      curationNote: "Para comunicar direção sem transformar propósito em frase decorativa.",
      impactLabel: "para alinhamento de direção",
    },
    "sete-habitos-pessoas-altamente-eficazes": {
      coverUrl: "https://books.google.com.br/books/publisher/content?edge=curl&id=A7jGCgAAQBAJ&img=1&imgtk=AFLRE724mPGt_yrtFcpNOcBOCtm1zNoIGNFqtkWsc6R1Qga4qzYZCfZBAgONMTRN2U7cj8GPaRaWldhgBN0MwJHne6Je_LQ7A2Rov5DufHd2r_Pl6bdRFPEv-FiRgYBePD0WbaonQ1Ib&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro Os 7 hábitos das pessoas altamente eficazes, de Stephen Covey",
      curationNote: "Para transformar intenção em consistência sem depender de picos de motivação.",
      impactLabel: "para consistência pessoal",
    },
    mindset: {
      coverUrl: "https://books.google.es/books/publisher/content?id=tDgqDwAAQBAJ&img=1&imgtk=AFLRE708G-gAiawgpZENXch_G6h3ztEVPW2oyydUlnjbTtrltKiV6m-uh6IrYoUUqjBlj_eRepxTf_hebEiQQP51eqVYal_QlrklVNCpltCYh1YFKrHYB_OpqLUrj58NHL-boaebnaoF&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro Mindset, de Carol Dweck",
      curationNote: "Para reduzir defesa diante de erro, feedback e aprendizado.",
      impactLabel: "para cultura de aprendizado",
    },
    essencialismo: {
      coverUrl: "https://books.google.com.br/books/publisher/content?edge=curl&id=yvR4CAAAQBAJ&img=1&imgtk=AFLRE71PqoVy7oMfQ2Z3L179VJoE0ld3KVB2diPOtMS4OqV_3YuFTnOQJM6UoqPLYAZgJzlLNQhLKvJcnMrvnwuMJ8RnqDjPKJnx_ZH_QxJYoS4aTJo3RLCD0ZZgncYBoqF4tW1aEd24&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro Essencialismo, de Greg McKeown",
      curationNote: "Para decidir o que merece espaço quando tudo parece importante.",
      impactLabel: "para foco sob excesso",
    },
    "conversas-dificeis": {
      coverUrl: "https://books.google.com.br/books/publisher/content?edge=curl&id=bsYpEAAAQBAJ&img=1&imgtk=AFLRE70DK-82P_PQzz-v2MmwX1wbGgh18w8Fg24JWZ_5IpYHqC_iTfSs6ntS61dm5by0DQmL6PnfhbdJpfKijTIo2cTZmLJD5atQdadjS0oOxWPZHhM5e7c6TUFN7Ygt5D1T1iXxkL0_&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro Conversas difíceis, de Douglas Stone, Bruce Patton e Sheila Heen",
      curationNote: "Para atravessar conversas em que clareza, vínculo e responsabilidade precisam coexistir.",
      impactLabel: "para conversas difíceis",
    },
    "coragem-de-ser-imperfeito": {
      coverUrl: "https://books.google.fr/books/publisher/content?edge=curl&id=zd-yAAAAQBAJ&img=1&imgtk=AFLRE738bC0fVUafrpkCjeNk8fT_hOGQWAi3XhO6SRkmxvCPPytFRyYE6PKEf7u7i9MWJV9c6p_s35jXwd9sjokVruhxrGw4kX6mdvenFgOgEJcoHwZeTxIZh0ITJh3hvA72-IAseZv0&printsec=frontcover&zoom=3",
      coverAlt: "Capa do livro A coragem de ser imperfeito, de Brené Brown",
      curationNote: "Para liderar com mais presença quando insegurança, imagem e aprovação entram na sala.",
      impactLabel: "para presença sob exposição",
    },
  };

  const state = {
    books: [],
    filters: {
      category: "all",
      level: "all",
      q: "",
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.classList.contains("estante-page") || document.body.classList.contains("livro-page")) {
      return;
    }

    bindEvents();
    loadBooks();
  });

  async function loadBooks() {
    setState("organizando sua estante...");

    try {
      const api = getApi();
      const books = await api.apiFetch("/books");
      state.books = await enrichBooks(books, api);
      renderCategoryFilters();
      renderBooks();
    } catch (error) {
      renderLoadError(error);
    }
  }

  function bindEvents() {
    const search = document.querySelector("[data-estante-search]");
    const controls = document.querySelector(".estante-controls");

    document.addEventListener("error", handleCoverError, true);
    document.addEventListener("load", handleCoverLoad, true);

    if (controls) {
      controls.setAttribute("aria-label", "Busca da estante");
    }

    if (search) {
      setupSearchControl(search);
      search.addEventListener("input", () => {
        state.filters.q = search.value.trim();
        renderBooks();
      });
    }

    document.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-category]");
      const levelButton = event.target.closest("[data-level]");
      const clearButton = event.target.closest("[data-estante-clear]");
      const searchClearButton = event.target.closest("[data-estante-search-clear]");

      if (categoryButton) {
        state.filters.category = categoryButton.dataset.category || "all";
        renderBooks();
      }

      if (levelButton) {
        state.filters.level = levelButton.dataset.level || "all";
        renderBooks();
      }

      if (clearButton || searchClearButton) {
        resetFilters();
        renderBooks();
      }
    });
  }

  function setupSearchControl(search) {
    search.setAttribute("placeholder", "buscar por livro, autor ou desafio");
    search.setAttribute("aria-label", "buscar por livro, autor ou desafio");

    const controlsShell = search.closest(".estante-controls-shell");
    const label = search.closest(".estante-search");

    if (!controlsShell || !label || controlsShell.querySelector("[data-estante-search-clear]")) return;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "estante-search-clear";
    clearButton.setAttribute("data-estante-search-clear", "");
    clearButton.setAttribute("aria-label", "limpar busca");
    clearButton.hidden = true;
    clearButton.textContent = "limpar";

    label.insertAdjacentElement("afterend", clearButton);
  }

  async function enrichBooks(books, api) {
    const normalizedBooks = Array.isArray(books) ? books : [];

    const enriched = await Promise.all(normalizedBooks.map(async (book) => {
      try {
        const detail = await api.apiFetch(`/books/${encodeURIComponent(book.slug)}`);
        return normalizeBook({ ...book, ...(detail && detail.book ? detail.book : {}) });
      } catch (error) {
        return normalizeBook(book);
      }
    }));

    return enriched.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }

  function normalizeBook(book) {
    const enrichment = BOOK_ENRICHMENT[book.slug] || {};
    const title = book.title || "livro";
    const author = book.author || "autor";
    const purchaseUrl = book.purchaseUrl || "";

    return {
      ...book,
      coverUrl: enrichment.coverUrl || book.coverUrl || "",
      coverAlt: enrichment.coverAlt || book.coverAlt || `Capa do livro ${title}, de ${author}`,
      purchaseUrl,
      purchaseLabel: book.purchaseLabel || DEFAULT_PURCHASE_LABEL,
      hasPurchaseUrl: Boolean(purchaseUrl || book.hasPurchaseUrl),
      curationNote: enrichment.curationNote || book.curationNote || book.whyRead || book.description || "",
      impactLabel: enrichment.impactLabel || book.impactLabel || book.category || "para ler com intenção",
    };
  }

  function renderCategoryFilters() {
    const container = document.querySelector("[data-estante-category-filters]");
    if (!container) return;

    const categories = Array.from(new Set(state.books.map((book) => book.category).filter(Boolean))).sort();

    container.innerHTML = [
      '<button class="is-active" type="button" data-category="all">todos</button>',
      ...categories.map((category) => (
        `<button type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
      )),
    ].join("");
  }

  function renderBooks() {
    renderActiveFilters();
    renderFeaturedBook();

    const grid = document.querySelector("[data-estante-grid]");
    const resultCount = document.querySelector("[data-estante-result-count]");
    const books = getFilteredBooks();

    if (resultCount) {
      resultCount.textContent = state.filters.q
        ? `${books.length} ${books.length === 1 ? "resultado encontrado" : "resultados encontrados"}`
        : `${state.books.length} ${state.books.length === 1 ? "livro" : "livros"}`;
    }

    if (!grid) return;

    if (!books.length) {
      grid.innerHTML = "";
      setState("<strong>nenhum resultado encontrado</strong><span>tente buscar por outro tema, autor ou desafio.</span>", "empty");
      return;
    }

    clearState();
    grid.innerHTML = books.map(renderBookCard).join("");
  }

  function renderFeaturedBook() {
    const container = document.querySelector("[data-estante-featured]");
    if (!container) return;

    const featured = state.books.find((book) => book.isFeatured) || state.books[0];

    if (!featured) {
      container.innerHTML = '<div class="estante-loading-card">a curadoria está sendo preparada.</div>';
      return;
    }

    container.innerHTML = `
      ${renderCover(featured, { loading: "eager", zoom: FEATURED_COVER_ZOOM })}
      <div class="estante-featured-copy">
        <div class="estante-meta">
          <span>${escapeHtml(featured.category)}</span>
          <span>${escapeHtml(formatLevel(featured.level))}</span>
          ${featured.readTime ? `<span>${escapeHtml(featured.readTime)}</span>` : ""}
        </div>
        <h3>${escapeHtml(featured.title)}</h3>
        <p class="estante-author">${escapeHtml(featured.author)}</p>
        <p>${escapeHtml(featured.whyRead || featured.description)}</p>
        <div class="estante-featured-value">
          <span>por que vale sua atenção</span>
          <p>${escapeHtml(featured.curationNote || featured.practicalUse || featured.description)}</p>
        </div>
        <div class="estante-card-actions">
          <a class="estante-primary-action" href="./livro.html?slug=${encodeURIComponent(featured.slug)}">abrir leitura guiada</a>
          ${renderPurchaseAction(featured)}
        </div>
        ${featured.purchaseUrl ? '<p class="estante-partner-note">a compra acontece fora do Papo de Liderança, pelo parceiro indicado.</p>' : ""}
      </div>
    `;
  }

  function renderBookCard(book) {
    return `
      <article class="estante-card">
        ${renderCover(book, { loading: "eager" })}
        <div class="estante-card-copy">
          <div class="estante-meta">
            <span>${escapeHtml(book.category)}</span>
            <span>${escapeHtml(formatLevel(book.level))}</span>
          </div>
          <h3>${escapeHtml(book.title)}</h3>
          <p class="estante-author">${escapeHtml(book.author)}</p>
          <p>${escapeHtml(book.curationNote || book.description)}</p>
          <p class="estante-card-impact">${escapeHtml(book.impactLabel || "para ler com intenção")}</p>
          <div class="estante-card-actions">
            <a class="estante-card-link" href="./livro.html?slug=${encodeURIComponent(book.slug)}">abrir leitura guiada</a>
            ${renderPurchaseAction(book, { compact: true })}
          </div>
        </div>
      </article>
    `;
  }

  function renderCover(book, options = {}) {
    const coverUrl = resolveCoverUrl(withGoogleCoverZoom(book.coverUrl, options.zoom || CARD_COVER_ZOOM));
    const title = book.title || "livro";
    const author = book.author || "autor";
    const alt = book.coverAlt || `Capa do livro ${title}, de ${author}`;
    const loading = options.loading || "lazy";
    const fallback = `
      <div class="estante-cover-fallback" aria-hidden="true">
        <small>curadoria</small>
        <strong>${escapeHtml(getCoverTitle(title))}</strong>
        <span>${escapeHtml(author)}</span>
      </div>
    `;

    if (coverUrl) {
      return `
        <figure class="estante-cover-frame" aria-label="${escapeHtml(alt)}">
          <img class="estante-book-cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(alt)}" loading="${escapeHtml(loading)}" decoding="async">
          ${fallback}
        </figure>
      `;
    }

    return `
      <div class="estante-cover-frame estante-cover-frame--fallback" aria-label="${escapeHtml(alt)}">
        ${fallback}
      </div>
    `;
  }

  function renderPurchaseAction(book, options = {}) {
    if (!book.purchaseUrl) {
      return '<span class="estante-purchase-muted">opção de compra em curadoria</span>';
    }

    const label = book.purchaseLabel || DEFAULT_PURCHASE_LABEL;
    const className = options.compact
      ? "estante-purchase-text"
      : "estante-secondary-action estante-purchase-link";

    return `
      <a class="${className}" href="${escapeHtml(book.purchaseUrl)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(label === "ver opção de compra" ? DEFAULT_PURCHASE_LABEL : label)}
      </a>
    `;
  }

  function handleCoverError(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.classList.contains("estante-book-cover")) return;

    activateCoverFallback(image);
  }

  function handleCoverLoad(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.classList.contains("estante-book-cover")) return;
    if (image.naturalWidth > 1 && image.naturalHeight > 1) return;

    activateCoverFallback(image);
  }

  function activateCoverFallback(image) {
    const frame = image.closest(".estante-cover-frame");
    if (!frame) return;

    frame.classList.add("estante-cover-frame--fallback");
    image.remove();
  }

  function getFilteredBooks() {
    const query = normalize(state.filters.q);

    return state.books.filter((book) => {
      const matchesCategory = state.filters.category === "all" || book.category === state.filters.category;
      const matchesLevel = state.filters.level === "all" || book.level === state.filters.level;
      const text = normalize([
        book.title,
        book.subtitle,
        book.author,
        book.category,
        formatLevel(book.level),
        book.level,
        book.slug,
        book.readTime,
        book.description,
        book.whyRead,
        book.curationNote,
        book.impactLabel,
        book.purchaseProvider,
        flattenSearchValue(book.keyIdeas),
        flattenSearchValue(book.guidedQuestions),
        flattenSearchValue(book.whatYouWillLearn),
        flattenSearchValue(book.practicalUse),
      ].filter(Boolean).join(" "));
      const matchesQuery = !query || matchesSearch(text, query);

      return matchesCategory && matchesLevel && matchesQuery;
    });
  }

  function renderActiveFilters() {
    document.querySelectorAll("[data-category]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.category === state.filters.category);
    });

    document.querySelectorAll("[data-level]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.level === state.filters.level);
    });

    document.querySelectorAll("[data-estante-clear]").forEach((button) => {
      button.hidden = !hasActiveFilters();
    });

    document.querySelectorAll("[data-estante-search-clear]").forEach((button) => {
      button.hidden = !state.filters.q.trim();
    });
  }

  function resetFilters() {
    state.filters.category = "all";
    state.filters.level = "all";
    state.filters.q = "";

    const search = document.querySelector("[data-estante-search]");
    if (search) search.value = "";
  }

  function hasActiveFilters() {
    return state.filters.category !== "all" || state.filters.level !== "all" || Boolean(state.filters.q);
  }

  function renderLoadError(error) {
    if (error && error.status === 403) {
      setState(
        'esta estante é exclusiva para assinantes ativos. <a href="./assinatura.html">ver assinatura</a>',
        "locked",
      );
      return;
    }

    setState("não foi possível carregar a estante agora. tente novamente em instantes.", "error");
  }

  function setState(message, modifier) {
    const node = document.querySelector("[data-estante-state]");
    if (!node) return;

    node.hidden = false;
    node.className = "estante-state";
    if (modifier) node.classList.add(`estante-state--${modifier}`);
    node.innerHTML = message;
  }

  function clearState() {
    const node = document.querySelector("[data-estante-state]");
    if (!node) return;
    node.hidden = true;
    node.textContent = "";
  }

  function getApi() {
    if (!window.PapoApi || !window.PapoApi.apiFetch) {
      throw new Error("API indisponível.");
    }

    return window.PapoApi;
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

  function withGoogleCoverZoom(url, zoom) {
    if (!url || !zoom || !/books\.google/i.test(url)) return url;
    if (/[?&]zoom=\d+/i.test(url)) {
      return url.replace(/([?&]zoom=)\d+/i, `$1${zoom}`);
    }

    return `${url}${url.includes("?") ? "&" : "?"}zoom=${encodeURIComponent(zoom)}`;
  }

  function getCoverTitle(title) {
    const words = String(title || "livro").split(/\s+/).filter(Boolean);
    return words.slice(0, 4).join(" ");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchesSearch(haystack, query) {
    return query.split(" ").filter(Boolean).every((word) => haystack.includes(word));
  }

  function flattenSearchValue(value) {
    if (Array.isArray(value)) return value.map(flattenSearchValue).filter(Boolean).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(flattenSearchValue).filter(Boolean).join(" ");
    return value == null ? "" : String(value);
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

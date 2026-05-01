(function () {
  const PROGRESS_MILESTONES = [10, 25, 50, 75, 100];
  const TYPE_CONFIG = {
    article: {
      apiType: "ARTICLE",
      label: "artigo",
      list: "listArticles",
      detail: "getArticle",
    },
    "short-edition": {
      apiType: "SHORT_EDITION",
      label: "edi\u00e7\u00e3o curta",
      list: "listShortEditions",
      detail: "getShortEdition",
    },
  };

  const readerState = {
    auth: null,
    content: null,
    list: [],
    savedProgress: 0,
    lastSentProgress: 0,
    visualProgress: 0,
    saveInFlight: false,
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (!body.classList.contains("reader-page")) return;

    bindReaderShell(auth);

    if (!auth || !auth.hasToken()) {
      redirectToLogin();
      return;
    }

    readerState.auth = auth;
    await loadReader(auth);
  });

  function bindReaderShell(auth) {
    const header = document.querySelector(".dashboard-header");
    const syncHeader = () => {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });

    document.querySelectorAll("[data-auth-logout]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (auth) auth.clearSession();
        redirectToLogin();
      });
    });
  }

  async function loadReader(auth) {
    const params = new URLSearchParams(window.location.search);
    const type = normalizeType(params.get("type"));
    const id = params.get("id") || "";
    const slug = params.get("slug") || "";

    if (!type || (!id && !slug)) {
      renderNotFound();
      return;
    }

    try {
      setReaderState("abrindo sua leitura...", "");

      const resolved = await resolveContent(auth, type, id, slug);
      readerState.content = normalizeContent(resolved.raw, type);
      readerState.list = resolved.list;

      if (!readerState.content || !readerState.content.id) {
        renderNotFound();
        return;
      }

      if (redirectToStaticRoute(readerState.content)) {
        return;
      }

      await loadExistingProgress(auth, readerState.content);
      renderReader(readerState.content);
      if (readerState.content.hasFullContent) {
        setupProgressTracking();
        saveProgress(Math.max(readerState.savedProgress, 10), false);
      }
      setReaderState("", "");
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
        redirectToLogin();
        return;
      }

      renderNotFound();
    }
  }

  async function resolveContent(auth, type, id, slug) {
    const config = TYPE_CONFIG[type];
    const listPromise = auth[config.list] ?auth[config.list]().catch(() => []) : Promise.resolve([]);
    let raw = null;

    if (slug) {
      raw = await fetchDetail(auth, config, slug);
    }

    if (!raw && id) {
      raw = await fetchDetail(auth, config, id);
    }

    const list = await listPromise;
    const safeList = Array.isArray(list) ?list : [];
    const match = findRawItem(safeList, id, slug);

    if (!raw && match && match.slug) {
      raw = await fetchDetail(auth, config, match.slug);
    }

    return {
      raw: raw || match || null,
      list: safeList.map((item) => normalizeListItem(item, type)),
    };
  }

  async function fetchDetail(auth, config, identifier) {
    if (!identifier || !auth[config.detail]) return null;
    return auth[config.detail](identifier).catch(() => null);
  }

  function redirectToStaticRoute(content) {
    const routes = window.PapoReadingRoutes;

    if (!content || !content.slug || !routes) {
      return false;
    }

    const staticRoutes =
      content.type === "article"
        ? routes.STATIC_ARTICLE_ROUTES
        : content.type === "short-edition"
          ? routes.STATIC_SHORT_EDITION_ROUTES
          : null;
    const target = staticRoutes && staticRoutes[content.slug];

    if (!target) return false;

    window.location.replace(target);
    return true;
  }

  async function loadExistingProgress(auth, content) {
    const progressList = await auth
      .getReadingProgress({ contentType: content.apiType })
      .catch(() => []);
    const progress = (Array.isArray(progressList) ?progressList : []).find((item) => {
      const itemId = String(item.contentId || (item.content && item.content.id) || "");
      const itemSlug = String((item.content && item.content.slug) || "");

      return itemId === String(content.id) || (content.slug && itemSlug === content.slug);
    });

    readerState.savedProgress = normalizePercent(progress && progress.progressPercent);
    readerState.lastSentProgress = readerState.savedProgress;
    readerState.visualProgress = readerState.savedProgress;
  }

  function renderReader(content) {
    const article = document.querySelector("[data-reader-article]");

    document.title = `${content.title} | Papo de Lideran\u00e7a`;
    setText("[data-reader-type]", TYPE_CONFIG[content.type].label);
    setText("[data-reader-title]", content.title);
    setText("[data-reader-summary]", content.summary || "uma leitura editorial para voltar ao que importa com mais clareza.");
    setText("[data-reader-category]", content.categoryName || "acervo");
    setText("[data-reader-crumb-category]", content.categoryName || "acervo");
    setText("[data-reader-time]", content.readTime ?`${content.readTime} min` : "tempo editorial");
    setText("[data-reader-date]", content.publishedAt ?formatDate(content.publishedAt) : "acervo");
    renderContent(content);
    renderNext(content);
    setVisualProgress(readerState.savedProgress);

    if (article) article.hidden = false;
  }

  function renderContent(content) {
    const node = document.querySelector("[data-reader-content]");
    if (!node) return;

    if (content.type === "short-edition") {
      if (!content.hasFullContent) {
        renderMissingContentState(content, node);
        return;
      }

      node.innerHTML = getFullContent(content.raw)
        ?renderArticleBody(getFullContent(content.raw))
        : renderShortEdition(content.raw);
      return;
    }

    if (!content.hasFullContent) {
      renderMissingContentState(content, node);
      return;
    }

    node.innerHTML = renderArticleBody(getFullContent(content.raw));
  }

  function renderShortEdition(raw) {
    const sections = [];
    const idea = raw.ideaCentral || "";
    const whatMatters = normalizeList(raw.whatMatters || raw.what_matters);
    const applyToday = normalizeList(raw.applyToday || raw.apply_today);
    const quote = raw.quoteOfWeek || raw.quote || raw.highlight || "";

    if (idea) {
      sections.push(`<h2>ideia central</h2><p>${escapeHtml(idea)}</p>`);
    }

    if (whatMatters.length) {
      sections.push(`<h2>o que importa</h2>${renderList(whatMatters)}`);
    }

    if (applyToday.length) {
      sections.push(`<h2>aplique hoje</h2>${renderList(applyToday)}`);
    }

    if (quote) {
      sections.push(`<blockquote>${escapeHtml(quote)}</blockquote>`);
    }

    return sections.join("") || "<p>esta edi\u00e7\u00e3o curta ainda n\u00e3o trouxe corpo editorial completo.</p>";
  }

  function renderMissingContentState(content, node) {
    console.warn("[reader] conte\u00fado completo ausente", {
      type: content.type,
      id: content.id,
      slug: content.slug,
      item: content.raw,
    });

    setVisualProgress(0);

    node.innerHTML = `
      <section class="reader-missing-content" aria-label="Conteúdo indisponível">
        <span>rota editorial</span>
        <h2>leitura indispon\u00edvel nesta rota</h2>
        <p>Encontramos a refer\u00eancia desta leitura, mas o conte\u00fado completo ainda n\u00e3o est\u00e1 dispon\u00edvel por esta origem.</p>
        <a href="./biblioteca.html">voltar \u00e0 biblioteca</a>
      </section>
    `;
  }

  function renderArticleBody(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "<p>esta leitura ainda n\u00e3o trouxe corpo editorial completo.</p>";
    }

    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    return text
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(renderMarkdownBlock)
      .join("");
  }

  function renderMarkdownBlock(block) {
    if (/^###\s+/.test(block)) {
      return `<h3>${escapeHtml(block.replace(/^###\s+/, ""))}</h3>`;
    }

    if (/^##?\s+/.test(block)) {
      return `<h2>${escapeHtml(block.replace(/^##?\s+/, ""))}</h2>`;
    }

    if (/^>\s+/.test(block)) {
      return `<blockquote>${escapeHtml(block.replace(/^>\s+/, ""))}</blockquote>`;
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));

    if (isList) {
      return renderList(lines.map((line) => line.replace(/^[-*]\s+/, "")));
    }

    return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
  }

  function renderNext(content) {
    const nextLink = document.querySelector("[data-reader-next]");
    if (!nextLink) return;

    const currentIndex = readerState.list.findIndex((item) => {
      return item.id === String(content.id) || (content.slug && item.slug === content.slug);
    });
    const next = currentIndex >= 0 ? readerState.list[currentIndex + 1] : null;

    if (!next) {
      nextLink.hidden = true;
      return;
    }

    nextLink.hidden = false;
    nextLink.setAttribute("href", buildReadingUrl(next));
    nextLink.textContent = "pr\u00f3xima leitura";
  }

  function setupProgressTracking() {
    updateScrollProgress();

    window.addEventListener("scroll", throttle(updateScrollProgress, 140), { passive: true });
    window.addEventListener("resize", throttle(updateScrollProgress, 180));
    window.addEventListener("pagehide", () => saveProgress(readerState.visualProgress, true));

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        saveProgress(readerState.visualProgress, true);
      }
    });
  }

  function updateScrollProgress() {
    const article = document.querySelector("[data-reader-article]");
    if (!article || article.hidden) return;

    const scrollPercent = calculateScrollPercent(article);
    const visualProgress = Math.max(readerState.savedProgress, scrollPercent);

    readerState.visualProgress = visualProgress;
    setVisualProgress(visualProgress);
    saveProgress(visualProgress, false);
  }

  function calculateScrollPercent(article) {
    const rect = article.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const height = Math.max(article.offsetHeight - window.innerHeight * 0.66, 1);
    const current = window.scrollY + window.innerHeight * 0.28 - top;
    const percent = Math.round((current / height) * 100);
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48;

    return atBottom ?100 : normalizePercent(percent);
  }

  function saveProgress(percent, keepalive) {
    const auth = readerState.auth;
    const content = readerState.content;
    const candidate = Math.max(readerState.savedProgress, normalizePercent(percent));
    const targetProgress = normalizeProgressMilestone(candidate);

    if (!auth || !content || !content.id || targetProgress <= 0) return;
    if (!keepalive && targetProgress <= readerState.lastSentProgress) return;
    if (keepalive && targetProgress <= readerState.savedProgress) return;
    if (readerState.saveInFlight && !keepalive) return;

    readerState.lastSentProgress = targetProgress;
    readerState.saveInFlight = true;

    auth
      .upsertReadingProgress(
        {
          contentType: content.apiType,
          contentId: content.id,
          slug: content.slug,
          progressPercent: targetProgress,
          completed: targetProgress >= 100,
        },
        { keepalive },
      )
      .then((result) => {
        const saved = result && result.progressPercent ?result.progressPercent : targetProgress;
        readerState.savedProgress = Math.max(readerState.savedProgress, normalizePercent(saved));
      })
      .catch(() => {
        return null;
      })
      .finally(() => {
        readerState.saveInFlight = false;
      });
  }

  function setVisualProgress(percent) {
    const normalized = normalizePercent(percent);
    const bar = document.querySelector("[data-reader-progress-bar]");

    if (bar) bar.style.width = `${normalized}%`;
    setText("[data-reader-progress-label]", `${normalized}% lido`);
  }

  function normalizeContent(raw, type) {
    if (!raw) return null;

    const category = resolveCategory(raw);
    const config = TYPE_CONFIG[type];

    return {
      raw,
      type,
      apiType: config.apiType,
      id: String(raw.id || ""),
      slug: raw.slug || "",
      title: raw.title || "leitura editorial",
      summary: getSummary(raw),
      categoryName: category.name,
      readTime: Number(raw.readTimeMinutes || raw.readingTimeMinutes || raw.readTime || raw.readingTime) || 0,
      publishedAt: raw.publishedAt || raw.createdAt || raw.updatedAt || null,
      hasFullContent: hasFullReadableContent(raw, type),
    };
  }

  function normalizeListItem(raw, type) {
    return {
      type,
      id: String((raw && raw.id) || ""),
      slug: (raw && raw.slug) || "",
    };
  }

  function findRawItem(list, id, slug) {
    return list.find((item) => {
      const itemId = String((item && item.id) || "");
      const itemSlug = String((item && item.slug) || "");

      return (id && itemId === String(id)) || (slug && itemSlug === String(slug));
    });
  }

  function resolveCategory(raw) {
    const category = raw && raw.category;
    const name =
      (category && (category.name || category.title)) ||
      (raw && (raw.categoryName || raw.categoryTitle || raw.theme)) ||
      "acervo";

    return { name };
  }

  function normalizeList(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item) return "";
        return item.text || item.title || item.content || item.label || "";
      })
      .filter(Boolean);
  }

  function renderList(items) {
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function getFullContent(item) {
    return (
      (item && (item.contentHtml || item.htmlContent || item.content || item.body || item.text)) ||
      ""
    );
  }

  function getSummary(item) {
    return (item && (item.summary || item.excerpt || item.description || item.ideaCentral)) || "";
  }

  function hasFullReadableContent(item, type) {
    if (!item) return false;
    if (String(getFullContent(item)).trim()) return true;

    if (type === "short-edition") {
      return Boolean(
        normalizeList(item.whatMatters || item.what_matters).length ||
          normalizeList(item.applyToday || item.apply_today).length ||
          item.quoteOfWeek ||
          item.quote ||
          item.highlight,
      );
    }

    return false;
  }

  function normalizeType(value) {
    const type = String(value || "").toLowerCase().replace(/_/g, "-");
    if (type === "article") return "article";
    if (
      type === "short-edition" ||
      type === "shortedition" ||
      type === "short-editions" ||
      type === "edition"
    ) {
      return "short-edition";
    }
    return "";
  }

  function buildReadingUrl(item) {
    if (window.PapoReadingRoutes && window.PapoReadingRoutes.buildReadingUrl) {
      return window.PapoReadingRoutes.buildReadingUrl(item);
    }

    const type = item && item.type ?item.type : "article";
    const params = new URLSearchParams({ type });

    if (item && item.slug) params.set("slug", item.slug);
    else if (item && item.id) params.set("id", item.id);

    return `./leitura.html?${params.toString()}`;
  }

  function normalizePercent(value) {
    const number = Number.parseInt(value || 0, 10);
    return Math.max(0, Math.min(Number.isFinite(number) ?number : 0, 100));
  }

  function normalizeProgressMilestone(value) {
    const percent = normalizePercent(value);
    const completedAwarePercent = percent >= 90 ?100 : percent;

    for (let index = PROGRESS_MILESTONES.length - 1; index >= 0; index -= 1) {
      const milestone = PROGRESS_MILESTONES[index];
      if (completedAwarePercent >= milestone) return milestone;
    }

    return 0;
  }

  function setReaderState(message, className) {
    const node = document.querySelector("[data-reader-state]");
    if (!node) return;

    node.textContent = message;
    node.className = "reader-state";
    if (message && !className) node.classList.add("app-loading-state");
    if (className === "is-error") node.classList.add("app-error-state");
    if (className) node.classList.add(className);
    node.hidden = !message;
  }

  function renderNotFound() {
    const article = document.querySelector("[data-reader-article]");
    const node = document.querySelector("[data-reader-state]");
    if (article) article.hidden = true;

    if (!node) return;

    node.className = "reader-state is-error app-error-state";
    node.hidden = false;
    node.innerHTML = `
      <strong>leitura indispon\u00edvel nesta rota</strong>
      <span>n\u00e3o encontramos o conte\u00fado solicitado. volte para a biblioteca e escolha outra leitura.</span>
      <a href="./biblioteca.html">voltar \u00e0 biblioteca</a>
    `;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = String(value || "");
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "acervo";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function throttle(callback, delay) {
    let waiting = false;
    let latestArgs = null;

    return function throttled() {
      latestArgs = arguments;

      if (waiting) return;

      waiting = true;
      window.setTimeout(() => {
        waiting = false;
        callback.apply(null, latestArgs);
      }, delay);
    };
  }

  function redirectToLogin() {
    window.location.replace("../auth/login.html");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();

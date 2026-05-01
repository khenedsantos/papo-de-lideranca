(function () {
  const TYPE_LABEL = {
    article: "artigo",
    "short-edition": "edi\u00e7\u00e3o curta",
  };

  const STATUS_LABEL = {
    "not-started": "novo",
    "in-progress": "em andamento",
    completed: "conclu\u00eddo",
  };

  const state = {
    auth: null,
    categories: [],
    items: [],
    filters: {
      query: "",
      type: "all",
      status: "all",
      category: "all",
    },
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (!body.classList.contains("library-page")) return;

    bindLibraryEvents();

    if (!auth || !auth.hasToken()) {
      redirectToLogin();
      return;
    }

    await loadLibrary(auth);
    bindRefresh(auth);
  });

  let refreshInFlight = null;

  async function loadLibrary(auth) {
    if (refreshInFlight) return refreshInFlight;

    state.auth = auth;
    setStateMessage("preparando o acervo...", "");

    refreshInFlight = Promise.allSettled([
      auth.listCategories ?auth.listCategories() : Promise.resolve([]),
      auth.listArticles(),
      auth.listShortEditions(),
      auth.getReadingProgress(),
    ])
      .then((results) => {
        const [categoriesResult, articlesResult, editionsResult, progressResult] = results;

        if (hasAuthError(results)) {
          auth.clearSession();
          redirectToLogin();
          return;
        }

        if (articlesResult.status === "rejected" && editionsResult.status === "rejected") {
          throw articlesResult.reason || editionsResult.reason;
        }

        const categories = asArray(unwrap(categoriesResult, []));
        const articles = asArray(unwrap(articlesResult, []));
        const editions = asArray(unwrap(editionsResult, []));
        const progressList = asArray(unwrap(progressResult, []));
        const progressIndex = buildProgressIndex(progressList);

        state.categories = categories;
        state.items = normalizeItems(articles, editions, progressIndex);

        renderCategoryFilters();
        renderLibrary();
      })
      .catch((error) => {
        setStateMessage(
          error instanceof TypeError
            ?"não conseguimos conectar o acervo à API local agora."
            : "não conseguimos carregar o acervo agora.",
          "is-error",
          "verifique a conexão ou tente novamente em instantes.",
          "retry",
        );
        renderEmptyFeatures();
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  }

  function bindRefresh(auth) {
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) loadLibrary(auth);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadLibrary(auth);
    });

    window.addEventListener("focus", () => loadLibrary(auth));
  }

  function bindLibraryEvents() {
    const search = document.querySelector("[data-library-search]");

    if (search) {
      search.addEventListener("input", () => {
        state.filters.query = normalizeSearch(search.value);
        renderLibrary();
      });
    }

    document.addEventListener("click", (event) => {
      const typeButton = event.target.closest("[data-filter-type]");
      const statusButton = event.target.closest("[data-filter-status]");
      const categoryButton = event.target.closest("[data-filter-category]");
      const clearButton = event.target.closest("[data-library-clear]");
      const retryButton = event.target.closest("[data-library-retry]");

      if (typeButton) {
        state.filters.type = typeButton.getAttribute("data-filter-type") || "all";
        syncButtons("[data-filter-type]", state.filters.type);
        renderLibrary();
      }

      if (statusButton) {
        state.filters.status = statusButton.getAttribute("data-filter-status") || "all";
        syncButtons("[data-filter-status]", state.filters.status);
        renderLibrary();
      }

      if (categoryButton) {
        state.filters.category = categoryButton.getAttribute("data-filter-category") || "all";
        syncButtons("[data-filter-category]", state.filters.category);
        renderLibrary();
      }

      if (clearButton) {
        resetFilters();
        renderLibrary();
      }

      if (retryButton && state.auth) {
        loadLibrary(state.auth);
      }
    });
  }

  function normalizeItems(articles, editions, progressIndex) {
    const articleItems = (Array.isArray(articles) ?articles : []).map((article, index) =>
      normalizeItem(article, "article", "ARTICLE", index, progressIndex),
    );

    const editionItems = (Array.isArray(editions) ?editions : []).map((edition, index) =>
      normalizeItem(edition, "short-edition", "SHORT_EDITION", articleItems.length + index, progressIndex),
    );

    return articleItems
      .concat(editionItems)
      .sort((left, right) => {
        const rightTime = getDateTime(right.publishedAt);
        const leftTime = getDateTime(left.publishedAt);

        if (rightTime !== leftTime) return rightTime - leftTime;
        return left.order - right.order;
      });
  }

  function normalizeItem(raw, type, apiType, order, progressIndex) {
    const id = raw && raw.id ?String(raw.id) : "";
    const slug = raw && raw.slug ?String(raw.slug) : "";
    const progress = findProgress(progressIndex, apiType, id, slug);
    const category = resolveCategory(raw);
    const percent = normalizePercent(progress && progress.progressPercent);
    const status = resolveStatus(progress, percent);

    return {
      type,
      apiType,
      id,
      slug,
      order,
      title: (raw && raw.title) || "leitura editorial",
      summary: (raw && (raw.summary || raw.excerpt || raw.description || raw.ideaCentral)) || "",
      categoryName: category.name,
      categorySlug: category.slug,
      readTime: Number(raw && (raw.readTimeMinutes || raw.readingTimeMinutes || raw.readTime || raw.readingTime)) || 0,
      publishedAt: raw && (raw.publishedAt || raw.createdAt || raw.updatedAt || null),
      progressPercent: percent,
      status,
      updatedAt: progress && (progress.updatedAt || progress.lastReadAt || progress.completedAt || null),
      staticPath: raw && (raw.staticPath || raw.staticUrl || ""),
      href: buildReadingUrl({
        type,
        id,
        slug,
        staticPath: raw && (raw.staticPath || raw.staticUrl || ""),
      }),
      source: raw || {},
    };
  }

  function buildProgressIndex(progressList) {
    const index = new Map();

    (Array.isArray(progressList) ?progressList : []).forEach((entry) => {
      if (!entry) return;

      const apiType = normalizeApiType(entry.contentType);
      const content = entry.content || {};
      const id = entry.contentId || content.id || "";
      const slug = content.slug || "";

      if (apiType && id) index.set(`${apiType}:id:${String(id)}`, entry);
      if (apiType && slug) index.set(`${apiType}:slug:${String(slug)}`, entry);
    });

    return index;
  }

  function findProgress(progressIndex, apiType, id, slug) {
    return progressIndex.get(`${apiType}:id:${id}`) || progressIndex.get(`${apiType}:slug:${slug}`) || null;
  }

  function renderCategoryFilters() {
    const container = document.querySelector("[data-library-category-filters]");
    const shell = document.querySelector("[data-library-category-shell]");
    if (!container) return;

    const categories = new Map();

    state.categories.forEach((category) => {
      const slug = normalizeSlug(category.slug || category.name);
      if (!slug) return;
      categories.set(slug, category.name || slug);
    });

    state.items.forEach((item) => {
      if (!item.categorySlug) return;
      categories.set(item.categorySlug, item.categoryName || item.categorySlug);
    });

    if (shell) {
      shell.hidden = categories.size === 0;
    }

    if (!categories.size) {
      state.filters.category = "all";
      container.innerHTML = "";
      return;
    }

    container.innerHTML = [
      '<button class="is-active" type="button" data-filter-category="all">todas</button>',
    ]
      .concat(
        Array.from(categories.entries()).map(([slug, name]) => {
          return `<button type="button" data-filter-category="${escapeHtml(slug)}">${escapeHtml(name)}</button>`;
        }),
      )
      .join("");

    if (state.filters.category !== "all" && !categories.has(state.filters.category)) {
      state.filters.category = "all";
    }

    syncButtons("[data-filter-category]", state.filters.category);
  }

  function renderLibrary() {
    renderStats();
    renderFeatureCards();
    renderGrid();
    renderFilterState();
    syncProgressBars();
  }

  function renderStats() {
    setText("[data-library-total]", state.items.length);
    setText("[data-library-in-progress]", state.items.filter((item) => item.status === "in-progress").length);
    setText("[data-library-completed]", state.items.filter((item) => item.status === "completed").length);
  }

  function renderFeatureCards() {
    const inProgress = state.items
      .filter((item) => item.status === "in-progress")
      .sort(sortByRecentActivity)[0];
    const recommended = state.items.find((item) => item.status === "not-started") || state.items[0] || null;
    const latestEdition = state.items
      .filter((item) => item.type === "short-edition")
      .sort(sortByPublishedDate)[0];
    const latest = latestEdition || state.items.slice().sort(sortByPublishedDate)[0] || null;

    renderFeature("[data-library-continue]", inProgress, {
      eyebrow: "continuar lendo",
      title: "sua pr\u00f3xima leitura est\u00e1 esperando",
      summary: "nenhuma leitura em andamento agora. abra o acervo e escolha com calma.",
      cta: "abrir biblioteca",
      href: "./biblioteca.html",
    });

    renderFeature("[data-library-recommended]", recommended, {
      eyebrow: "recomendado para hoje",
      title: "escolha uma leitura para manter o ritmo",
      summary: "quando o acervo carregar, uma sugest\u00e3o aparece aqui.",
      cta: "ver sugest\u00e3o",
      href: "./biblioteca.html",
    });

    renderFeature("[data-library-latest]", latest, {
      eyebrow: "edi\u00e7\u00e3o mais recente",
      title: "sem novidade carregada",
      summary: "artigos e edi\u00e7\u00f5es curtas aparecem juntos no acervo.",
      cta: "abrir leitura",
      href: "./biblioteca.html",
    });
  }

  function renderFeature(selector, item, fallback) {
    const node = document.querySelector(selector);
    if (!node) return;

    if (!item) {
      node.innerHTML = `
        <div class="library-feature-top">
          <span class="library-card-eyebrow">${escapeHtml(fallback.eyebrow)}</span>
        </div>
        <div class="library-feature-body">
          <h3>${escapeHtml(fallback.title)}</h3>
          <p>${escapeHtml(fallback.summary)}</p>
        </div>
        <div class="library-feature-bottom">
          <a href="${escapeHtml(fallback.href)}">${escapeHtml(fallback.cta)}</a>
        </div>
      `;
      return;
    }

    node.innerHTML = `
      <div class="library-feature-top">
        <span class="library-card-eyebrow">${escapeHtml(fallback.eyebrow)}</span>
        <div class="library-card-meta">
          <span>${escapeHtml(TYPE_LABEL[item.type])}</span>
          <span>${escapeHtml(item.categoryName || "acervo")}</span>
          ${item.readTime ?`<span>${item.readTime} min</span>` : ""}
        </div>
      </div>
      <div class="library-feature-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary || fallback.summary)}</p>
      </div>
      <div class="library-feature-bottom">
        ${item.progressPercent > 0 ?renderProgress(item.progressPercent) : ""}
        <a href="${escapeHtml(item.href)}">${escapeHtml(item.status === "in-progress" ?"continuar leitura" : fallback.cta)}</a>
      </div>
    `;
  }

  function renderGrid() {
    const grid = document.querySelector("[data-library-grid]");
    const filtered = getFilteredItems();

    if (!grid) return;

    setText(
      "[data-library-result-count]",
      `${filtered.length} ${filtered.length === 1 ?"leitura encontrada" : "leituras encontradas"}`,
    );

    if (!state.items.length) {
      grid.innerHTML = "";
      setStateMessage(
        "o acervo ainda não retornou leituras",
        "is-empty",
        "tente novamente em instantes ou verifique a API local.",
        "retry",
      );
      return;
    }

    if (!filtered.length) {
      grid.innerHTML = "";
      setText("[data-library-result-count]", "nenhuma leitura encontrada");
      setStateMessage(
        "nenhuma leitura encontrada",
        "is-empty",
        "tente remover algum filtro ou buscar por outro tema do acervo.",
        "clear",
      );
      return;
    }

    setStateMessage("", "");
    grid.innerHTML = filtered.map(renderCard).join("");
  }

  function renderCard(item) {
    return `
      <article class="library-card library-card--${escapeHtml(item.status)}">
        <a class="library-card-link" href="${escapeHtml(item.href)}">
          <div class="library-card-top">
            <span class="library-card-type">${escapeHtml(TYPE_LABEL[item.type])}</span>
            <span class="library-card-status">${escapeHtml(STATUS_LABEL[item.status])}</span>
          </div>
          <div class="library-card-copy">
            <span class="library-card-category">${escapeHtml(item.categoryName || "acervo")}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary || "uma leitura para aprofundar repert\u00f3rio e voltar ao que importa com clareza.")}</p>
          </div>
          <div class="library-card-bottom">
            <span>${item.readTime ?`${item.readTime} min` : "tempo editorial"}</span>
            <span>${item.publishedAt ?formatDate(item.publishedAt) : "acervo"}</span>
          </div>
          ${renderProgress(item.progressPercent)}
        </a>
      </article>
    `;
  }

  function renderProgress(percent) {
    const normalized = normalizePercent(percent);

    return `
      <div class="library-progress" aria-label="Progresso ${normalized}%">
        <span><i data-progress-fill="${normalized}"></i></span>
        <strong>${normalized}%</strong>
      </div>
    `;
  }

  function renderEmptyFeatures() {
    ["[data-library-continue]", "[data-library-recommended]", "[data-library-latest]"].forEach((selector) => {
      renderFeature(selector, null, {
        eyebrow: "biblioteca",
        title: "acervo indispon\u00edvel",
        summary: "verifique a API local para sincronizar leituras reais.",
        cta: "tentar novamente",
        href: "./biblioteca.html",
      });
    });
  }

  function getFilteredItems() {
    return state.items.filter((item) => {
      const haystack = normalizeSearch(
        [item.title, item.summary, item.categoryName, TYPE_LABEL[item.type]].filter(Boolean).join(" "),
      );

      if (state.filters.query && !haystack.includes(state.filters.query)) return false;
      if (state.filters.type !== "all" && item.type !== state.filters.type) return false;
      if (state.filters.status !== "all" && item.status !== state.filters.status) return false;
      if (state.filters.category !== "all" && item.categorySlug !== state.filters.category) return false;

      return true;
    });
  }

  function resolveCategory(raw) {
    const category = raw && raw.category;
    const explicitName =
      (category && (category.name || category.title)) ||
      (raw && (raw.categoryName || raw.categoryTitle || raw.theme)) ||
      "";
    const name = explicitName || "acervo";

    return {
      name,
      slug: explicitName ? normalizeSlug((category && category.slug) || raw.categorySlug || explicitName) : "",
    };
  }

  function resolveStatus(progress, percent) {
    if ((progress && progress.status === "COMPLETED") || percent >= 100) return "completed";
    if (percent > 0) return "in-progress";
    return "not-started";
  }

  function buildReadingUrl(item) {
    if (window.PapoReadingRoutes && window.PapoReadingRoutes.buildReadingUrl) {
      return window.PapoReadingRoutes.buildReadingUrl(item);
    }

    const type = normalizeItemType(item && item.type);
    const params = new URLSearchParams({ type });

    if (item && item.slug) params.set("slug", item.slug);
    else if (item && item.id) params.set("id", item.id);

    return `./leitura.html?${params.toString()}`;
  }

  function resetFilters() {
    state.filters.query = "";
    state.filters.type = "all";
    state.filters.status = "all";
    state.filters.category = "all";

    const search = document.querySelector("[data-library-search]");
    if (search) search.value = "";

    syncButtons("[data-filter-type]", "all");
    syncButtons("[data-filter-status]", "all");
    syncButtons("[data-filter-category]", "all");
  }

  function renderFilterState() {
    document.querySelectorAll("[data-library-clear]").forEach((button) => {
      button.hidden = !hasActiveFilters();
    });
  }

  function hasActiveFilters() {
    return Boolean(
      state.filters.query ||
        state.filters.type !== "all" ||
        state.filters.status !== "all" ||
        state.filters.category !== "all",
    );
  }

  function syncButtons(selector, activeValue) {
    document.querySelectorAll(selector).forEach((button) => {
      const value =
        button.getAttribute("data-filter-type") ||
        button.getAttribute("data-filter-status") ||
        button.getAttribute("data-filter-category");

      button.classList.toggle("is-active", value === activeValue);
    });
  }

  function setStateMessage(message, className, detail, action) {
    const node = document.querySelector("[data-library-state]");
    if (!node) return;

    node.className = "library-state";
    if (message && !className) node.classList.add("app-loading-state");
    if (className === "is-error") node.classList.add("app-error-state");
    if (className === "is-empty") node.classList.add("app-empty-state");
    if (className) node.classList.add(className);
    node.hidden = !message;

    if (!message) {
      node.textContent = "";
      return;
    }

    if (detail || action) {
      const actionHtml = action === "clear"
        ?'<button type="button" data-library-clear>limpar filtros</button>'
        : action === "retry"
          ?'<button type="button" data-library-retry>tentar novamente</button>'
          : "";

      node.innerHTML = `
        <strong>${escapeHtml(message)}</strong>
        ${detail ?`<span>${escapeHtml(detail)}</span>` : ""}
        ${actionHtml}
      `;
      return;
    }

    node.textContent = message;
  }

  function hasAuthError(results) {
    return results.some((result) => {
      const error = result && result.status === "rejected" ?result.reason : null;
      return error && (error.status === 401 || error.status === 403);
    });
  }

  function unwrap(result, fallback) {
    return result && result.status === "fulfilled" ?result.value : fallback;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.items)) return value.items;
    if (value && Array.isArray(value.data)) return value.data;
    return [];
  }

  function normalizeApiType(type) {
    const value = String(type || "").toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");
    if (value === "ARTICLE") return "ARTICLE";
    if (value === "SHORT_EDITION" || value === "SHORTEDITION" || value === "SHORT_EDITIONS" || value === "EDITION") {
      return "SHORT_EDITION";
    }
    return "";
  }

  function normalizeItemType(type) {
    if (window.PapoReadingRoutes && window.PapoReadingRoutes.normalizeReadingType) {
      return window.PapoReadingRoutes.normalizeReadingType(type);
    }

    const value = String(type || "").toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
    if (value === "article") return "article";
    if (value === "short-edition" || value === "shortedition" || value === "short-editions" || value === "edition") {
      return "short-edition";
    }
    return value || "article";
  }

  function normalizePercent(value) {
    const number = Number.parseInt(value || 0, 10);
    return Math.max(0, Math.min(Number.isFinite(number) ?number : 0, 100));
  }

  function normalizeSearch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function normalizeSlug(value) {
    return normalizeSearch(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function sortByRecentActivity(left, right) {
    return getDateTime(right.updatedAt) - getDateTime(left.updatedAt);
  }

  function sortByPublishedDate(left, right) {
    const diff = getDateTime(right.publishedAt) - getDateTime(left.publishedAt);
    return diff || left.order - right.order;
  }

  function getDateTime(value) {
    const date = value ?new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ?date.getTime() : 0;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "acervo";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = String(value);
    });
  }

  function syncProgressBars() {
    document.querySelectorAll("[data-progress-fill]").forEach((node) => {
      const width = normalizePercent(node.getAttribute("data-progress-fill"));
      node.style.width = `${width}%`;
    });
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

(function () {
  const LEVEL_LABEL = {
    ESSENTIAL: "essencial",
    DEEPENING: "aprofundamento",
    PROVOCATION: "provocação",
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
      state.books = await api.apiFetch("/books");
      renderCategoryFilters();
      renderBooks();
    } catch (error) {
      renderLoadError(error);
    }
  }

  function bindEvents() {
    const search = document.querySelector("[data-estante-search]");
    const controls = document.querySelector(".estante-controls");

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
      ${renderCover(featured)}
      <div class="estante-featured-copy">
        <div class="estante-meta">
          <span>${escapeHtml(featured.category)}</span>
          <span>${escapeHtml(formatLevel(featured.level))}</span>
          ${featured.readTime ? `<span>${escapeHtml(featured.readTime)}</span>` : ""}
        </div>
        <h3>${escapeHtml(featured.title)}</h3>
        <p class="estante-author">${escapeHtml(featured.author)}</p>
        <p>${escapeHtml(featured.whyRead || featured.description)}</p>
        <div class="estante-card-actions">
          <a class="estante-card-link" href="./livro.html?slug=${encodeURIComponent(featured.slug)}">abrir leitura guiada</a>
          ${featured.hasPurchaseUrl ? '<span class="estante-partner-note">compra externa disponível no detalhe</span>' : ""}
        </div>
      </div>
    `;
  }

  function renderBookCard(book) {
    return `
      <article class="estante-card">
        ${renderCover(book)}
        <div class="estante-card-copy">
          <div class="estante-meta">
            <span>${escapeHtml(book.category)}</span>
            <span>${escapeHtml(formatLevel(book.level))}</span>
          </div>
          <h3>${escapeHtml(book.title)}</h3>
          <p class="estante-author">${escapeHtml(book.author)}</p>
          <p>${escapeHtml(book.description)}</p>
          <p><strong>por que está na estante:</strong> ${escapeHtml(book.whyRead)}</p>
          <div class="estante-card-actions">
            <a class="estante-card-link" href="./livro.html?slug=${encodeURIComponent(book.slug)}">ver leitura guiada</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderCover(book) {
    const coverUrl = resolveCoverUrl(book.coverUrl);

    if (coverUrl) {
      return `
        <figure class="estante-cover-frame">
          <img class="estante-book-cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(book.coverAlt || `Capa editorial de ${book.title}`)}" loading="lazy">
        </figure>
      `;
    }

    return `
      <div class="estante-cover-frame estante-cover-frame--fallback" aria-label="${escapeHtml(book.coverAlt || `Capa editorial de ${book.title}`)}">
        <span>${escapeHtml(getCoverTitle(book.title))}</span>
      </div>
    `;
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

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const isInternalPage = Boolean(
        body.classList.contains("dashboard-page") ||
        body.classList.contains("estante-page") ||
        body.classList.contains("livro-page") ||
        body.classList.contains("app-article-page") ||
        body.classList.contains("app-category-page") ||
        body.classList.contains("short-edition-page") ||
        body.classList.contains("short-editions-page"),
    );

    if (!isInternalPage) return;

    const auth = window.PapoAuth || null;
    const session = window.PapoSession || null;

    normalizeInternalHeader(auth);
    bindLogout(auth, session);
    guardInternalPage(auth, session);
    ensureEditorialClosure();
  });

  function normalizeInternalHeader(auth) {
    const header = document.querySelector(".site-header");
    const brand = header ?header.querySelector(".brand") : null;
    const nav = header ?header.querySelector(".main-nav") : null;
    const actions = header ?header.querySelector(".header-actions") : null;

    if (!header || !brand || !nav || !actions) return;

    const paths = getInternalPaths();
    const active = resolveActiveSection();

    brand.setAttribute("href", paths.dashboard);
    nav.innerHTML = [
      renderNavLink(paths.dashboard, "minha área", active === "dashboard"),
      renderNavLink(paths.biblioteca, "biblioteca", active === "biblioteca"),
      renderNavLink(paths.progresso, "progresso", active === "progresso"),
      renderNavLink(paths.estante, "estante", active === "estante"),
      renderNavLink(paths.conta, "conta", active === "conta"),
    ].join("");

    actions.innerHTML = `<a class="header-login" href="${paths.login}" data-auth-logout>sair</a>`;

    const syncHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });

    if (auth && auth.getStoredUser) {
      const user = auth.getStoredUser();
      if (user && user.name) {
        header.setAttribute("data-user", user.name);
      }
    }
  }

  function bindLogout(auth, session) {
    document.querySelectorAll("[data-auth-logout]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (session && session.logout) {
          session.logout(getInternalPaths().login);
          return;
        }
        if (auth && auth.clearSession) auth.clearSession();
        window.location.replace(getInternalPaths().login);
      });
    });
  }

  function guardInternalPage(auth, session) {
    const body = document.body;
    const shouldGuard = !body.classList.contains("public-page");

    if (!shouldGuard) return;

    if (session && session.requireAuth) {
      session.requireAuth(getInternalPaths().login);
      return;
    }

    if (!auth) return;

    if (!auth.hasToken || !auth.hasToken()) {
      window.location.replace(getInternalPaths().login);
    }
  }

  function ensureEditorialClosure() {
    const body = document.body;

    if (body.classList.contains("app-article-page")) {
      const footer = document.querySelector(".app-article-footer");
      if (!footer || footer.querySelector(".app-article-actions")) return;

      const paths = getInternalPaths();
      const actions = document.createElement("div");
      actions.className = "app-article-actions";
      actions.innerHTML = `<a class="app-article-link" href="${paths.biblioteca}">voltar à biblioteca</a>`;
      footer.appendChild(actions);
    }

    if (body.classList.contains("short-edition-page")) {
      const next = document.querySelector(".short-edition-next");
      if (!next || next.querySelector(".short-edition-shell-action")) return;

      const paths = getInternalPaths();
      const action = document.createElement("a");
      action.className = "short-edition-link short-edition-shell-action";
      action.href = paths.biblioteca;
      action.textContent = "voltar à biblioteca";
      next.appendChild(action);
    }
  }

  function renderNavLink(href, label, active) {
    return `<a${active ? ' class="is-current" aria-current="page"' : ""} href="${href}">${label}</a>`;
  }

  function resolveActiveSection() {
    const page = document.body.dataset.page || "";
    const path = window.location.pathname;

    if (page === "dashboard" || /dashboard\.html$/.test(path)) return "dashboard";
    if (page === "progresso" || /progresso\.html$/.test(path)) return "progresso";
    if (page === "estante" || page === "livro" || /estante\.html$|livro\.html$/.test(path)) {
      return "estante";
    }
    if (page === "perfil" || page === "assinatura" || /perfil\.html$|assinatura\.html$/.test(path)) {
      return "conta";
    }

    return "biblioteca";
  }

  function getInternalPaths() {
    const path = window.location.pathname;
    const nested = /\/app\/(artigos|edicoes|categorias)\//.test(path);
    const appPrefix = nested ?"../" : "./";
    const authPrefix = nested ?"../../auth/" : "../auth/";

    return {
      dashboard: `${appPrefix}dashboard.html`,
      biblioteca: `${appPrefix}biblioteca.html`,
      progresso: `${appPrefix}progresso.html`,
      estante: `${appPrefix}estante.html`,
      conta: `${appPrefix}perfil.html`,
      login: `${authPrefix}login.html`,
    };
  }
})();

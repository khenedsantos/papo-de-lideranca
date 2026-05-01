(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const auth = window.PapoAuth;
    const body = document.body;

    if (!body.classList.contains("dashboard-page")) return;

    body.classList.add("dashboard-ready");
    setupDashboardMotion();
    bindLogout(auth);

    if (body.dataset.page !== "dashboard") return;

    if (!auth || !auth.hasToken()) {
      redirectToLogin();
      return;
    }

    await loadDashboard(auth);
    bindDashboardRefresh(auth);
  });

  let refreshInFlight = null;

  async function loadDashboard(auth) {
    if (refreshInFlight) return refreshInFlight;

    setFeedback("organizando sua área...", "");

    refreshInFlight = Promise.all([
      auth.getCurrentUser(),
      auth.getAccountSummary(),
      auth.getReadingProgressSummary(),
      auth.getReadingProgress(),
    ])
      .then(([user, accountSummary, summary, progressList]) => {
        renderUser(user || {}, accountSummary || {});
        renderRoutine(summary || {});
        renderContinueReading(findCurrentReading(progressList || [], summary || {}));
        renderFeedback(summary && summary.feedback ?summary.feedback : null);
        setFeedback("", "");
      })
      .catch((error) => {
        if (error && (error.status === 401 || error.status === 403)) {
          auth.clearSession();
          redirectToLogin();
          return;
        }

        setFeedback(
          error instanceof TypeError
            ?"não conseguimos conectar sua área à API local agora."
            : "não conseguimos carregar esta área agora.",
          "is-error",
        );
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  }

  function bindDashboardRefresh(auth) {
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) loadDashboard(auth);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadDashboard(auth);
    });

    window.addEventListener("focus", () => loadDashboard(auth));
  }

  function bindLogout(auth) {
    document.querySelectorAll("[data-auth-logout]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (auth) auth.clearSession();
        redirectToLogin();
      });
    });
  }

  function renderUser(user, accountSummary) {
    const subscription = accountSummary.subscription || user.subscription || {};
    const firstName = window.PapoAuth && window.PapoAuth.getUserFirstName
      ?window.PapoAuth.getUserFirstName(user)
      : (user.name || "assinante").trim().split(/\s+/)[0];
    const displayName = window.PapoAuth && window.PapoAuth.getUserDisplayName
      ?window.PapoAuth.getUserDisplayName(user)
      : user.name || "assinante Papo";
    const access = resolveAccessStatus(accountSummary.user || user);

    setText("[data-user-first-name]", firstName);
    setText("[data-user-name]", displayName);
    setText("[data-user-email]", user.email || "e-mail n\u00e3o informado");
    setText("[data-user-plan-chip]", subscription.label || formatPlan(subscription.plan));
    setText("[data-user-access]", access.label);
    setText("[data-user-last-login-short]", formatDateTimeShort(user.lastLoginAt));
  }

  function renderRoutine(summary) {
    const currentWeek = summary.currentWeek || {};
    const streak = summary.streak || {};
    const totals = summary.totals || {};
    const completed = Number.parseInt(currentWeek.completedReadings || 0, 10);
    const activeDays = Number.parseInt(currentWeek.activeDays || 0, 10);
    const readMinutes = Number.parseInt(currentWeek.readMinutes || totals.readMinutes || 0, 10);
    const streakDays = Number.parseInt(streak.currentDays || 0, 10);

    setText("[data-dashboard-streak-chip]", `continuidade ${streakDays} ${streakDays === 1 ?"dia" : "dias"}`);
    setText("[data-dashboard-week-readings]", String(completed));
    setText("[data-dashboard-week-days]", String(activeDays));
    setText("[data-dashboard-total-minutes]", String(readMinutes));
    setText("[data-dashboard-library-count]", "acervo curado");
  }

  function renderContinueReading(progress) {
    if (!progress) {
      setText("[data-current-reading-status]", "pronta para come\u00e7ar");
      setText("[data-current-reading-category]", "biblioteca");
      setText("[data-current-reading-time]", "-- min");
      setText("[data-current-reading-title]", "sua pr\u00f3xima leitura est\u00e1 esperando por voc\u00ea");
      setText(
        "[data-current-reading-excerpt]",
        "abra a biblioteca para escolher o pr\u00f3ximo texto ou edi\u00e7\u00e3o curta com calma.",
      );
      setProgressValue(0);
      setLink("[data-current-reading-link]", "./biblioteca.html", "abrir biblioteca");
      return;
    }

    const content = progress.content || {};
    const category = content.category || {};
    const percent = normalizePercent(progress.progressPercent);
    const href = buildReaderHref(progress.contentType, content.id || progress.contentId, content.slug);

    setText("[data-current-reading-status]", "em andamento");
    setText("[data-current-reading-category]", formatCategoryName(category.name || content.categoryName));
    setText("[data-current-reading-time]", `${content.readTimeMinutes || content.readingTimeMinutes || 0} min`);
    setText("[data-current-reading-title]", content.title || "leitura em andamento");
    setText(
      "[data-current-reading-excerpt]",
      content.excerpt || content.summary || "retome a leitura no ponto mais \u00fatil para o seu momento.",
    );
    setProgressValue(percent);
    setLink("[data-current-reading-link]", href, "continuar leitura");
  }

  function renderFeedback(feedback) {
    if (!feedback) return;

    setText("[data-dashboard-feedback-level]", formatFeedbackLevel(feedback.level));
    setText("[data-dashboard-feedback-title]", feedback.title || "boa base para continuar");
    setText(
      "[data-dashboard-feedback-message]",
      feedback.message || "uma leitura breve j\u00e1 mant\u00e9m a semana em movimento.",
    );
  }

  function findCurrentReading(progressList, summary) {
    const candidates = (progressList || [])
      .filter((item) => {
        const percent = Number.parseInt(item.progressPercent || 0, 10);
        return percent > 0 && percent < 100;
      })
      .sort((left, right) => {
        const rightTime = new Date(right.updatedAt || right.lastReadAt || 0).getTime();
        const leftTime = new Date(left.updatedAt || left.lastReadAt || 0).getTime();
        return rightTime - leftTime;
      });

    if (candidates.length) return candidates[0];
    if (summary.currentReading) return summary.currentReading;

    return null;
  }

  function buildReaderHref(contentType, id, slug) {
    const type = normalizeReaderType(contentType);

    if (window.PapoReadingRoutes && window.PapoReadingRoutes.buildReadingUrl) {
      return window.PapoReadingRoutes.buildReadingUrl({ type, id, slug });
    }

    const params = new URLSearchParams({ type });

    if (slug) params.set("slug", slug);
    else if (id) params.set("id", id);

    return `./leitura.html?${params.toString()}`;
  }

  function normalizeReaderType(contentType) {
    const value = String(contentType || "").toUpperCase().replace(/-/g, "_");
    return value === "SHORT_EDITION" ?"short-edition" : "article";
  }

  function setProgressValue(progress) {
    const percent = normalizePercent(progress);
    const bar = document.querySelector("[data-current-reading-progress]");
    const fill = bar ?bar.querySelector("span") : null;

    if (fill) fill.style.width = `${percent}%`;
    setText("[data-current-reading-progress-label]", `${percent}%`);
  }

  function setupDashboardMotion() {
    const header = document.querySelector(".dashboard-header");
    const syncHeader = () => {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll(".dashboard-hero-stage").forEach((item, index) => {
      if (reduceMotion) {
        item.classList.add("is-visible");
        return;
      }

      window.setTimeout(() => item.classList.add("is-visible"), 100 * index);
    });

    document.querySelectorAll("[data-reveal]:not(.dashboard-hero-stage)").forEach((item) => {
      if (reduceMotion || !("IntersectionObserver" in window)) {
        item.classList.add("is-visible");
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 });

      observer.observe(item);
    });
  }

  function setFeedback(message, type) {
    const feedback = document.querySelector("[data-dashboard-feedback]");
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove("is-error", "is-success");
    if (type) feedback.classList.add(type);
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setLink(selector, href, label) {
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute("href", href);
      if (label) node.textContent = label;
    });
  }

  function redirectToLogin() {
    window.location.replace("../auth/login.html");
  }

  function normalizePercent(value) {
    const number = Number.parseInt(value || 0, 10);
    return Math.max(0, Math.min(Number.isFinite(number) ?number : 0, 100));
  }

  function formatCategoryName(name) {
    return String(name || "acervo").toLowerCase();
  }

  function formatPlan(plan) {
    if (plan === "PREMIUM") return "plano premium";
    if (plan === "FREE") return "plano free";
    return "plano editorial";
  }

  function formatFeedbackLevel(level) {
    if (level === "positive") return "bom progresso";
    if (level === "attention") return "aten\u00e7\u00e3o";
    return "continuidade";
  }

  function resolveAccessStatus(user) {
    if (user && user.hasCompletedAccess && user.isActive !== false) {
      return { label: "acesso conclu\u00eddo" };
    }

    if (user && user.isActive === false) {
      return { label: "acesso inativo" };
    }

    return { label: "acesso ativo" };
  }

  function formatDateTimeShort(value) {
    if (!value) return "ainda n\u00e3o registrado";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "indispon\u00edvel";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  window.PapoDashboard = {
    buildReaderHref,
  };
})();

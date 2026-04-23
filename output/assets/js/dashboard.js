document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.PapoAuth;
  const body = document.body;

  if (!body.classList.contains("dashboard-page")) return;

  body.classList.add("dashboard-ready");
  setupDashboardMotion();
  decorateDashboardEditionLabels();
  bindLogout(auth);

  if (!auth || !auth.hasToken()) {
    redirectToLogin();
    return;
  }

  if (body.dataset.page !== "dashboard") {
    return;
  }

  await loadDashboardState(auth, true);
  bindDashboardRefresh(auth);
});

let dashboardRefreshInFlight = null;

const EDITORIAL_ARTICLE_ORDER = [
  "artigo-autoridade-sem-dureza",
  "artigo-carreira-antes-da-promocao",
  "artigo-feedback-que-desenvolve",
  "artigo-liderar-sem-microgerenciar",
  "artigo-mentalidade-que-gera-influencia",
  "artigo-produtividade-do-lider",
  "artigo-relevancia-sem-autopromocao",
  "artigo-disciplina-emocional-sob-pressao",
  "artigo-rituais-simples-para-alinhamento",
  "artigo-proteger-tempo-de-pensamento-estrategico",
];

const EDITION_INDEX_BY_SLUG = new Map(
  EDITORIAL_ARTICLE_ORDER.map((slug, index) => [slug, index + 1]),
);

async function loadDashboardState(auth, isInitialLoad) {
  if (dashboardRefreshInFlight) {
    return dashboardRefreshInFlight;
  }

  if (isInitialLoad) {
    setDashboardFeedback("Carregando os dados reais da sua conta...", "");
  }

  dashboardRefreshInFlight = Promise.all([
    auth.getCurrentUser(),
    auth.getReadingProgressSummary(),
  ])
    .then(([user, readingSummary]) => {
      populateDashboard(user);
      populateDashboardReadingSummary(readingSummary);
      setDashboardFeedback("", "");
    })
    .catch((error) => {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
        redirectToLogin();
        return;
      }

      setDashboardFeedback(
        error instanceof TypeError
          ? "Nao foi possivel conectar o dashboard com a API local. Verifique se o backend esta ativo em 127.0.0.1:3001."
          : "Seus dados nao puderam ser carregados agora. Tente atualizar a pagina em instantes.",
        "is-error",
      );
    })
    .finally(() => {
      dashboardRefreshInFlight = null;
    });

  return dashboardRefreshInFlight;
}

function bindDashboardRefresh(auth) {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      loadDashboardState(auth, false);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadDashboardState(auth, false);
    }
  });

  window.addEventListener("focus", () => {
    loadDashboardState(auth, false);
  });
}

function redirectToLogin() {
  window.location.replace("../auth/login.html");
}

function bindLogout(auth) {
  document.querySelectorAll("[data-auth-logout]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (auth) {
        auth.clearSession();
      }

      redirectToLogin();
    });
  });
}

function setDashboardFeedback(message, type) {
  const feedback = document.querySelector("[data-dashboard-feedback]");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-success");

  if (type) {
    feedback.classList.add(type);
  }
}

function populateDashboard(user) {
  const subscription = user.subscription || {};
  const firstName = (user.name || "assinante").trim().split(/\s+/)[0];
  const role = formatRole(user.role);
  const plan = formatPlan(subscription.plan);
  const status = formatSubscriptionStatus(subscription.status);
  const membership = subscription.plan || subscription.status
    ? `${plan} · ${status}`
    : "assinatura nao vinculada";
  const lastLogin = formatDateTime(user.lastLoginAt);
  const accessStatus = user.hasCompletedAccess
    ? "acesso concluido"
    : "acesso pendente";

  setText("[data-user-first-name]", firstName.toLowerCase());
  setText("[data-user-initials]", getUserInitials(user.name, user.email));
  setText("[data-user-name]", user.name || "Nao informado");
  setText("[data-user-email]", user.email || "Nao informado");
  setText("[data-user-role]", role);
  setText("[data-user-plan]", plan);
  setText("[data-user-status]", formatCompactSubscriptionStatus(subscription.status));
  setText("[data-user-membership]", membership);
  setText("[data-user-last-login]", lastLogin);
  setText("[data-user-access]", accessStatus);
  setText("[data-user-plan-detail]", subscription.plan ? plan : "sem assinatura vinculada");
  setText("[data-user-status-detail]", subscription.status ? status : "sem status informado");
}

function populateDashboardReadingSummary(summary) {
  if (!summary) return;

  const journeyBlock = summary.journeyBlock || buildLegacyJourneyBlock(summary);
  const item = journeyBlock.item || null;
  const isContinuing = journeyBlock.mode === "CONTINUE_READING";
  const isRevision = journeyBlock.ctaLabel === "revisitar leitura";
  const readingHref = item
    ? buildReadingHref(item.contentType || "ARTICLE", item.slug)
    : "./biblioteca.html";
  const stateLabel = isContinuing
    ? "em andamento"
    : isRevision
      ? "leitura concluída"
      : "próxima leitura sugerida";
  const itemProgress = isContinuing
    ? Number.parseInt(journeyBlock.progressPercent ?? journeyBlock.journeyPercent ?? 0, 10)
    : 0;

  setText("[data-journey-headline]", journeyBlock.headline || "sua próxima leitura já está pronta.");
  setText(
    "[data-journey-support]",
    journeyBlock.supportText || "sem uma leitura em andamento agora, esta é a próxima sugestão editorial para continuar sua linha de raciocínio.",
  );
  setLink(
    "[data-current-reading-link]",
    readingHref,
    journeyBlock.ctaLabel || (isContinuing ? "continuar leitura" : "começar nova leitura"),
  );
  setText("[data-journey-percent-label]", `${normalizePercent(journeyBlock.journeyPercent)}%`);
  setProgressValue(
    document.querySelector("[data-journey-progress]"),
    journeyBlock.journeyPercent,
    null,
  );
  setText("[data-journey-reading-days]", `${Number.parseInt(journeyBlock.readingDaysThisWeek || 0, 10)} / 7`);
  setText("[data-journey-dedicated-time]", formatDedicatedTime(journeyBlock.dedicatedMinutesThisWeek));
  setText("[data-journey-completed-week]", String(Number.parseInt(journeyBlock.completedThisWeek || 0, 10)));
  populateEditorialProgress(journeyBlock);
  setText("[data-current-reading-progress-title]", stateLabel);
  setText("[data-current-reading-title]", item ? item.title : "explore a biblioteca editorial");
  setText(
    "[data-current-reading-excerpt]",
    item
      ? item.excerpt
      : "sem uma leitura em andamento agora, escolha a próxima peça para continuar sua linha de raciocínio.",
  );
  setProgressValue(
    document.querySelector("[data-current-reading-progress]"),
    itemProgress,
    document.querySelector("[data-current-reading-progress-label]"),
    isContinuing ? `${itemProgress}% lido` : stateLabel,
  );
  setLink(
    "[data-journey-secondary-cta]",
    readingHref,
    isContinuing ? "continue de onde parou" : "abrir sugestão",
  );
  setText(
    "[data-journey-next-step]",
    journeyBlock.nextStepText || "ver o próximo ponto editorial para manter a sequência de leitura.",
  );
  setLink("[data-journey-next-link]", readingHref, "ver próximo ponto");
}

function populateEditorialProgress(journeyBlock) {
  const completedThisWeek = Number.parseInt(journeyBlock.completedThisWeek || 0, 10);
  const dedicatedMinutes = Number.parseInt(journeyBlock.dedicatedMinutesThisWeek || 0, 10);
  const readingDays = Math.max(0, Math.min(Number.parseInt(journeyBlock.readingDaysThisWeek || 0, 10), 7));
  const weeklyGoal = 5;
  const goalPercent = Math.max(0, Math.min(Math.round((completedThisWeek / weeklyGoal) * 100), 100));

  setText("[data-editorial-read-count]", String(completedThisWeek));
  setText("[data-editorial-minutes]", String(dedicatedMinutes));
  setText("[data-editorial-days]", String(readingDays));
  setText("[data-editorial-streak-count]", `${readingDays} ${readingDays === 1 ? "dia" : "dias"}`);
  setText("[data-editorial-goal-label]", `${completedThisWeek}/${weeklyGoal} leituras concluídas`);
  setText(
    "[data-editorial-goal-support]",
    goalPercent >= 60 ? "você está no caminho certo!" : "um pequeno avanço já mantém a jornada ativa.",
  );
  setText("[data-editorial-goal-percent]", `${goalPercent}%`);

  document.querySelectorAll("[data-editorial-goal-bar]").forEach((bar) => {
    bar.style.width = `${goalPercent}%`;
  });

  document.querySelectorAll("[data-streak-day]").forEach((day, index) => {
    day.classList.toggle("is-active", index < readingDays);
  });
}

function buildLegacyJourneyBlock(summary) {
  const continueBlock = summary.continueBlock || {};
  const item = continueBlock.item || null;
  const isContinuing = continueBlock.mode === "CONTINUE_READING";

  return {
    mode: continueBlock.mode || "START_NEXT_READING",
    headline: isContinuing
      ? "você está construindo consistência."
      : "sua próxima leitura já está pronta.",
    supportText: isContinuing
      ? "continue avançando um pouco a cada dia. pequenos passos geram grandes mudanças."
      : "sem uma leitura em andamento agora, esta é a próxima sugestão editorial para continuar sua linha de raciocínio.",
    ctaLabel: resolveDashboardCtaLabel(continueBlock),
    journeyPercent: isContinuing
      ? Number.parseInt(continueBlock.progressPercent || 0, 10)
      : 0,
    progressPercent: Number.parseInt(continueBlock.progressPercent || 0, 10),
    readingDaysThisWeek: 0,
    dedicatedMinutesThisWeek: 0,
    completedThisWeek: Number.parseInt(summary.completedInLast7Days || 0, 10),
    item,
    nextStepText: isContinuing
      ? "voltar ao trecho em que clareza e respeito deixam de competir na conversa."
      : "começar pelo artigo sugerido para manter a sequência editorial.",
  };
}

function normalizePercent(value) {
  return Math.max(0, Math.min(Number.parseInt(value || 0, 10), 100));
}

function formatDedicatedTime(minutes) {
  const normalized = Math.max(0, Number.parseInt(minutes || 0, 10));

  if (normalized >= 60) {
    const hours = Math.floor(normalized / 60);
    const remainingMinutes = normalized % 60;
    return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  return `${normalized} min`;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setLink(selector, href, label) {
  document.querySelectorAll(selector).forEach((node) => {
    node.setAttribute("href", href);
    if (label) {
      node.textContent = label;
    }
  });
}

function setProgressValue(bar, progress, labelNode, forcedLabel) {
  const normalized = Math.max(0, Math.min(Number.parseInt(progress || 0, 10), 100));

  if (bar) {
    bar.dataset.progress = String(normalized);
    const fill = bar.querySelector("span");
    if (fill) {
      fill.style.width = `${normalized}%`;
    }
  }

  if (labelNode) {
    labelNode.textContent = forcedLabel || `${normalized}%`;
  }
}

function formatRole(role) {
  if (role === "ADMIN") {
    return "administrador";
  }

  if (role === "MEMBER") {
    return "assinante";
  }

  return "perfil nao informado";
}

function getUserInitials(name, email) {
  const source = (name || email || "Papo Liderança").trim();
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatPlan(plan) {
  if (plan === "PREMIUM") {
    return "plano premium";
  }

  if (plan === "FREE") {
    return "plano free";
  }

  return "plano indisponivel";
}

function formatSubscriptionStatus(status) {
  if (status === "ACTIVE") {
    return "assinatura ativa";
  }

  if (status === "PAUSED") {
    return "assinatura pausada";
  }

  if (status === "CANCELED") {
    return "assinatura cancelada";
  }

  return "status indisponivel";
}

function formatCompactSubscriptionStatus(status) {
  if (status === "ACTIVE") {
    return "ativa";
  }

  if (status === "PAUSED") {
    return "pausada";
  }

  if (status === "CANCELED") {
    return "cancelada";
  }

  return "indisponível";
}

function formatCategoryName(name) {
  return (name || "leitura").toLowerCase();
}

function formatDateTime(value) {
  if (!value) {
    return "ultimo acesso ainda nao registrado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ultimo acesso indisponivel";
  }

  return "ultimo acesso em " + new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildReadingHref(contentType, slug) {
  if (!slug) {
    return "./biblioteca.html";
  }

  if (contentType === "SHORT_EDITION") {
    return `./edicoes/${slug}.html`;
  }

  return `./artigos/${slug}.html`;
}

function resolveDashboardCtaLabel(continueBlock) {
  if (!continueBlock) {
    return "come\u00e7ar nova leitura";
  }

  if (continueBlock.mode === "CONTINUE_READING") {
    return "continuar leitura";
  }

  if (continueBlock.ctaLabel === "revisitar leitura") {
    return "revisitar leitura";
  }

  return "come\u00e7ar nova leitura";
}

function decorateDashboardEditionLabels() {
  document
    .querySelectorAll(
      '.dashboard-highlight-card a[href*="./artigos/artigo-"], .dashboard-apply-note a[href*="./artigos/artigo-"], .dashboard-latest-row a[href*="./artigos/artigo-"]',
    )
    .forEach((link) => {
      const slug = extractArticleSlugFromHref(link.getAttribute("href"));
      const label = getEditionLabel(slug);

      if (!label) return;

      const card = link.closest(
        ".dashboard-highlight-card, .dashboard-apply-note, .dashboard-latest-row",
      );

      if (!card) return;

      const copy = card.querySelector(
        ".dashboard-highlight-copy, .dashboard-apply-note-copy, .dashboard-latest-row-copy",
      );
      const title = copy && copy.querySelector("h3");

      if (!copy || !title) return;

      let editionNode = copy.querySelector("[data-edition-label]");

      if (!editionNode) {
        editionNode = document.createElement("span");
        editionNode.className = "dashboard-edition-index";
        editionNode.setAttribute("data-edition-label", "true");
        copy.insertBefore(editionNode, title);
      }

      editionNode.textContent = label;
    });
}

function extractArticleSlugFromHref(href) {
  if (!href) {
    return "";
  }

  const match = href.match(/(artigo-[^.?#]+)\.html/i);
  return match ? match[1] : "";
}

function getEditionLabel(slug) {
  const index = EDITION_INDEX_BY_SLUG.get(slug);

  if (!index) {
    return "";
  }

  return `edi\u00e7\u00e3o ${String(index).padStart(2, "0")}`;
}

function setupDashboardMotion() {
  const header = document.querySelector(".dashboard-header");
  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  document.querySelectorAll("[data-progress]").forEach((bar) => {
    const fill = bar.querySelector("span");
    if (!fill) return;

    const progress = Number.parseInt(bar.dataset.progress || "0", 10);
    window.requestAnimationFrame(() => {
      fill.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
    });
  });

  const heroStages = document.querySelectorAll(".dashboard-hero-stage");
  heroStages.forEach((item, index) => {
    window.setTimeout(() => {
      item.classList.add("is-visible");
    }, 120 * index);
  });

  const reveals = document.querySelectorAll("[data-reveal]:not(.dashboard-hero-stage)");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -10% 0px",
    });

    reveals.forEach((item) => observer.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll("[data-read-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const original = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = original;
      button.textContent = "abrindo...";

      window.setTimeout(() => {
        button.textContent = original;
      }, 900);
    });
  });

  const tiltCards = document.querySelectorAll("[data-tilt]");
  tiltCards.forEach((card) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const reset = () => {
      card.style.transform = "";
    };

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateX = y * -1.4;
      const rotateY = x * 1.8;
      card.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
  });
}

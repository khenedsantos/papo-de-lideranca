document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.PapoAuth;
  const body = document.body;

  if (!body.classList.contains("dashboard-page")) return;

  body.classList.add("dashboard-ready");
  setupDashboardMotion();
  bindLogout(auth);

  if (!auth || !auth.hasToken()) {
    redirectToLogin();
    return;
  }

  if (body.dataset.page !== "dashboard") {
    return;
  }

  setDashboardFeedback("Carregando os dados reais da sua conta...", "");

  try {
    const user = await auth.getCurrentUser();
    populateDashboard(user);
    setDashboardFeedback("", "");
  } catch (error) {
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
  }
});

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
  const lastLogin = formatDateTime(user.lastLoginAt);
  const accessStatus = user.hasCompletedAccess
    ? "acesso concluido"
    : "acesso pendente";

  setText("[data-user-first-name]", firstName.toLowerCase());
  setText("[data-user-name]", user.name || "Nao informado");
  setText("[data-user-email]", user.email || "Nao informado");
  setText("[data-user-role]", role);
  setText("[data-user-plan]", plan);
  setText("[data-user-status]", status);
  setText("[data-user-last-login]", lastLogin);
  setText("[data-user-access]", accessStatus);
  setText("[data-user-plan-detail]", subscription.plan ? plan : "sem assinatura vinculada");
  setText("[data-user-status-detail]", subscription.status ? status : "sem status informado");
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
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

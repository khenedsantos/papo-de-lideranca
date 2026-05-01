(function () {
  const SUPPORT_EMAIL = "contato@papodelideranca.com";

  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (body.dataset.page !== "assinatura") return;

    if (!auth || !auth.hasToken()) {
      window.location.replace("../auth/login.html");
      return;
    }

    try {
      const summary = await auth.getAccountSummary();
      renderSubscription(summary || {});
      setPageFeedback("");
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
        window.location.replace("../auth/login.html");
        return;
      }

      setPageFeedback(
        error instanceof TypeError
          ?"não foi possível conectar a assinatura à API local agora."
          : "os dados da assinatura não puderam ser carregados neste momento.",
        "is-error",
      );
    }
  });

  function renderSubscription(summary) {
    const user = summary.user || {};
    const subscription = summary.subscription || {};
    const accessStatus = resolveAccessStatus(user);

    setText("[data-plan-name]", subscription.label || "plano free");
    setText("[data-plan-status]", formatSubscriptionStatus(subscription.status));
    setText(
      "[data-plan-description]",
      subscription.description || "sua assinatura pode ser ajustada com o suporte editorial.",
    );
    setText("[data-plan-email]", user.email || "e-mail não informado");
    setText("[data-plan-role]", formatRole(user.role));
    setText("[data-plan-access]", accessStatus.label);
    setText("[data-plan-last-login]", formatDateTimeShort(user.lastLoginAt));
    setText("[data-plan-support-copy]", "sua assinatura é gerenciada pelo suporte editorial.");
    setText("[data-plan-status-badge]", accessStatus.label);
    setText("[data-profile-status-copy]", accessStatus.copy);

    setHref("[data-plan-support-link]", buildSupportHref(user.email));
    setBadgeState(document.querySelector("[data-plan-status]"), resolveSubscriptionTone(subscription.status));
    setBadgeState(document.querySelector("[data-plan-status-badge]"), accessStatus.tone);
  }

  function resolveAccessStatus(user) {
    if (user && user.hasCompletedAccess && user.isActive !== false) {
      return {
        label: "acesso concluído",
        tone: "success",
        copy: "sua conta está em dia",
      };
    }

    if (user && user.isActive === false) {
      return {
        label: "acesso inativo",
        tone: "muted",
        copy: "sua conta precisa de revisão",
      };
    }

    return {
      label: "acesso pendente",
      tone: "warning",
      copy: "sua conta ainda precisa concluir algumas etapas",
    };
  }

  function resolveSubscriptionTone(status) {
    if (status === "ACTIVE") return "success";
    if (status === "PAUSED") return "warning";
    return "muted";
  }

  function formatSubscriptionStatus(status) {
    if (status === "ACTIVE") return "ativa";
    if (status === "PAUSED") return "pausada";
    if (status === "CANCELED") return "cancelada";
    return "indisponível";
  }

  function formatRole(role) {
    if (role === "ADMIN") return "administrador";
    if (role === "MEMBER") return "membro";
    return "perfil não informado";
  }

  function formatDateTimeShort(value) {
    if (!value) return "ainda não registrado";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "indisponível";

    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);

    const timeLabel = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return `${dateLabel}, ${timeLabel}`;
  }

  function buildSupportHref(email) {
    const subject = encodeURIComponent(
      `Assinatura | Papo de Liderança${email ?` | ${email}` : ""}`,
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
  }

  function setPageFeedback(message, type) {
    const node = document.querySelector("[data-account-feedback]");
    if (!node) return;
    node.textContent = message || "";
    node.classList.remove("is-error", "is-success");
    if (type) node.classList.add(type);
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setHref(selector, href) {
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute("href", href);
    });
  }

  function setBadgeState(node, tone) {
    if (!node) return;
    node.classList.remove("is-warning", "is-muted");
    if (tone === "warning") node.classList.add("is-warning");
    if (tone === "muted") node.classList.add("is-muted");
  }
})();

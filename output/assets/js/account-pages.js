(function () {
  const SUPPORT_EMAIL = "contato@papodelideranca.com";
  const AVATAR_MAX_SIZE = 3 * 1024 * 1024;
  const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
  let profileSummary = null;
  let profileEventsBound = false;

  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (!body.classList.contains("account-page")) return;

    bindLogout(auth);

    if (!auth || !auth.hasToken()) {
      window.location.replace("../auth/login.html");
      return;
    }

    try {
      const summary = await auth.getAccountSummary();
      profileSummary = summary || {};
      renderAccountPage(body.dataset.page, profileSummary);

      if (body.dataset.page === "perfil") {
        bindProfileInteractions(auth);
      }
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
        window.location.replace("../auth/login.html");
        return;
      }

      setPageFeedback(
        error instanceof TypeError
          ?"não foi possível conectar a página da conta à API local agora."
          : "os dados da conta não puderam ser carregados neste momento.",
        "is-error",
      );
    }
  });

  function bindLogout(auth) {
    document.querySelectorAll("[data-auth-logout]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();

        if (auth) {
          auth.clearSession();
        }

        window.location.replace("../auth/login.html");
      });
    });
  }

  function renderAccountPage(page, summary) {
    if (page === "perfil") {
      renderProfilePage(summary);
      return;
    }

    if (page === "assinatura") {
      renderSubscriptionPage(summary);
    }
  }

  function renderProfilePage(summary) {
    const user = summary.user || {};
    const subscription = summary.subscription || {};
    const displayName = getUserDisplayName(user);
    const role = formatRole(user.role);
    const accessStatus = resolveAccessStatus(user);

    setText("[data-profile-name]", displayName || "nome não informado");
    setText("[data-profile-email]", user.email || "e-mail não informado");
    setText("[data-profile-role]", role);
    setText("[data-profile-role-detail]", resolveRoleSupport(user.role, user.isActive));
    setText("[data-profile-last-login]", formatDateTimeShort(user.lastLoginAt));
    setText("[data-profile-last-login-detail]", resolveLastLoginDetail());
    renderProfileAvatar(user);
    setText("[data-profile-status-copy]", resolveStatusCopy(accessStatus, subscription));
    setText("[data-profile-status-support]", resolveStatusSupport(accessStatus, subscription));
    setText("[data-profile-status-badge]", accessStatus.label);
    setHref("[data-profile-email-support]", buildEmailChangeHref(user.email));

    setBadgeState(document.querySelector("[data-profile-status-badge]"), accessStatus.tone);
  }

  function bindProfileInteractions(auth) {
    if (profileEventsBound) return;
    profileEventsBound = true;

    const nameButton = document.querySelector("[data-profile-edit-name]");
    const avatarButton = document.querySelector("[data-profile-avatar-button]");
    const avatarInput = document.querySelector("[data-profile-avatar-input]");

    nameButton?.addEventListener("click", () => openProfileField("name"));
    avatarButton?.addEventListener("click", () => avatarInput?.click());

    document.querySelectorAll("[data-profile-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveProfileField(auth, form.getAttribute("data-profile-form") || "");
      });
    });

    document.querySelectorAll("[data-profile-cancel]").forEach((button) => {
      button.addEventListener("click", () => {
        closeProfileField(button.getAttribute("data-profile-cancel") || "");
        setPageFeedback("");
      });
    });

    avatarInput?.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0] ?avatarInput.files[0] : null;
      uploadProfileAvatar(auth, avatarInput, file);
    });
  }

  function openProfileField(field) {
    if (field !== "name") return;

    const row = document.querySelector(`[data-profile-field-row="${field}"]`);
    const form = row?.querySelector(`[data-profile-form="${field}"]`);
    const valueNode = document.querySelector("[data-profile-name]");
    const editButton = document.querySelector("[data-profile-edit-name]");
    const input = form?.querySelector("input");
    const user = (profileSummary && profileSummary.user) || {};

    if (!row || !form || !input || !valueNode || !editButton) return;

    input.value = getUserDisplayName(user);
    form.hidden = false;
    valueNode.hidden = true;
    editButton.hidden = true;
    row.classList.add("is-editing");
    input.focus();
    input.select();
  }

  function closeProfileField(field) {
    if (field !== "name") return;

    const row = document.querySelector(`[data-profile-field-row="${field}"]`);
    const form = row?.querySelector(`[data-profile-form="${field}"]`);
    const valueNode = document.querySelector("[data-profile-name]");
    const editButton = document.querySelector("[data-profile-edit-name]");

    if (!row || !form || !valueNode || !editButton) return;

    form.hidden = true;
    valueNode.hidden = false;
    editButton.hidden = false;
    row.classList.remove("is-editing");
    setFormLoading(form, false);
  }

  async function saveProfileField(auth, field) {
    if (field !== "name") return;

    const form = document.querySelector(`[data-profile-form="${field}"]`);
    const input = form?.querySelector("input");
    const value = normalizeProfileValue(field, input?.value || "");

    if (!form || !input) return;

    if (!validateProfileField(field, value)) {
      input.setAttribute("aria-invalid", "true");
      setPageFeedback("informe um nome com pelo menos 2 caracteres.", "is-error");
      return;
    }

    input.removeAttribute("aria-invalid");
    setFormLoading(form, true);
    setPageFeedback("salvando alteração...", "");

    try {
      const user = await auth.updateCurrentUser({ [field]: value });
      profileSummary = Object.assign({}, profileSummary, {
        user: Object.assign({}, profileSummary?.user || {}, user),
      });
      closeProfileField(field);
      renderProfilePage(profileSummary);
      setPageFeedback("nome atualizado.", "is-success");
    } catch (error) {
      setPageFeedback(resolveProfileError(error), "is-error");
    } finally {
      setFormLoading(form, false);
    }
  }

  async function uploadProfileAvatar(auth, input, file) {
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setPageFeedback("envie uma imagem em JPG, PNG ou WEBP.", "is-error");
      input.value = "";
      return;
    }

    if (file.size > AVATAR_MAX_SIZE) {
      setPageFeedback("a imagem precisa ter até 3MB.", "is-error");
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewAvatar(previewUrl);
    setPageFeedback("enviando foto...", "");

    try {
      const user = await auth.uploadAvatar(file);
      profileSummary = Object.assign({}, profileSummary, {
        user: Object.assign({}, profileSummary?.user || {}, user),
      });
      renderProfilePage(profileSummary);
      setPageFeedback("foto atualizada.", "is-success");
    } catch (error) {
      renderProfileAvatar((profileSummary && profileSummary.user) || {});
      setPageFeedback(resolveProfileError(error), "is-error");
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.value = "";
    }
  }

  function renderProfileAvatar(user) {
    const avatar = document.querySelector("[data-profile-avatar]");
    const initials = document.querySelector("[data-profile-avatar-initials]");
    const image = document.querySelector("[data-profile-avatar-image]");
    const avatarUrl = resolveAssetUrl(user.avatarUrl);

    if (!avatar || !initials || !image) return;

    avatar.classList.remove("is-uploading");

    if (avatarUrl) {
      image.src = avatarUrl;
      image.hidden = false;
      initials.hidden = true;
      avatar.classList.add("has-image");
      return;
    }

    image.removeAttribute("src");
    image.hidden = true;
    initials.hidden = false;
    initials.textContent = getUserInitials(user.name, user.email);
    avatar.classList.remove("has-image");
  }

  function previewAvatar(url) {
    const avatar = document.querySelector("[data-profile-avatar]");
    const initials = document.querySelector("[data-profile-avatar-initials]");
    const image = document.querySelector("[data-profile-avatar-image]");

    if (!avatar || !initials || !image) return;

    image.src = url;
    image.hidden = false;
    initials.hidden = true;
    avatar.classList.add("has-image", "is-uploading");
  }

  function normalizeProfileValue(field, value) {
    const trimmed = String(value || "").trim().replace(/\s+/g, " ");

    return trimmed;
  }

  function validateProfileField(field, value) {
    return field === "name" && value.length >= 2 && value.length <= 80;
  }

  function setFormLoading(form, loading) {
    form.classList.toggle("is-saving", Boolean(loading));
    form.querySelectorAll("button, input").forEach((node) => {
      node.disabled = Boolean(loading);
    });
  }

  function resolveProfileError(error) {
    const message = error && error.payload && error.payload.message;

    if (Array.isArray(message) && message.length) {
      return message[0];
    }

    if (typeof message === "string") {
      return message;
    }

    if (error instanceof TypeError) {
      return "não foi possível conectar com a API local agora.";
    }

    return "não foi possível salvar a alteração neste momento.";
  }

  function renderSubscriptionPage(summary) {
    const user = summary.user || {};
    const subscription = summary.subscription || {};
    const accessStatus = resolveAccessStatus(user);
    const supportHref = buildSupportHref(user.email, "assinatura");

    setText("[data-plan-name]", subscription.label || "plano free");
    setText("[data-plan-status]", formatCompactSubscriptionStatus(subscription.status));
    setText(
      "[data-plan-description]",
      subscription.description || "sua assinatura pode ser ajustada com o suporte editorial.",
    );
    setText("[data-plan-role]", formatRole(user.role));
    setText("[data-plan-access]", accessStatus.label);
    setText("[data-plan-last-login]", formatDateTimeShort(user.lastLoginAt));
    setText("[data-plan-support-copy]", "fale com o suporte editorial para qualquer ajuste de plano.");
    setText("[data-plan-status-badge]", accessStatus.label);

    setHref("[data-plan-support-link]", supportHref);
    setBadgeState(document.querySelector("[data-plan-status]"), resolveSubscriptionTone(subscription.status));
    setBadgeState(document.querySelector("[data-plan-status-badge]"), accessStatus.tone);
  }

  function resolveStatusCopy(accessStatus, subscription) {
    if (accessStatus.tone === "success" && subscription.status === "ACTIVE") {
      return "sua conta está em dia";
    }

    if (accessStatus.tone === "warning") {
      return "sua conta ainda precisa concluir algumas etapas";
    }

    return "sua conta precisa de revisão";
  }

  function resolveStatusSupport(accessStatus, subscription) {
    if (accessStatus.tone === "success" && subscription.status === "ACTIVE") {
      return "todos os acessos e informações estão seguros.";
    }

    if (accessStatus.tone === "warning") {
      return "finalize o fluxo de acesso para liberar todas as funcionalidades.";
    }

    return "fale com o suporte para revisar o estado da conta.";
  }

  function resolveLastLoginDetail() {
    return "navegador Chrome • São Paulo, BR";
  }

  function resolveAccessStatus(user) {
    if (user && user.hasCompletedAccess && user.isActive !== false) {
      return { label: "acesso concluído", tone: "success" };
    }

    if (user && user.isActive === false) {
      return { label: "acesso inativo", tone: "muted" };
    }

    return { label: "acesso pendente", tone: "warning" };
  }

  function resolveSubscriptionTone(status) {
    if (status === "ACTIVE") return "success";
    if (status === "PAUSED") return "warning";
    return "muted";
  }

  function formatRole(role) {
    if (role === "ADMIN") return "administrador";
    if (role === "MEMBER") return "membro";
    return "perfil não informado";
  }

  function resolveRoleSupport(role, isActive) {
    if (role === "ADMIN") {
      return isActive === false
        ?"acesso administrativo temporariamente inativo."
        : "você tem acesso total à plataforma.";
    }

    return isActive === false
      ?"o acesso de leitura está temporariamente inativo."
      : "sua conta já está configurada para a experiência editorial.";
  }

  function formatCompactSubscriptionStatus(status) {
    if (status === "ACTIVE") return "ativa";
    if (status === "PAUSED") return "pausada";
    if (status === "CANCELED") return "cancelada";
    return "indisponível";
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

  function getUserDisplayName(user) {
    if (window.PapoAuth && window.PapoAuth.getUserDisplayName) {
      return window.PapoAuth.getUserDisplayName(user);
    }

    return (user && user.name ?user.name.trim() : "") || "assinante Papo";
  }

  function getUserInitials(name, email) {
    const source = getUserDisplayName({ name, email });
    const parts = source
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }

  function resolveAssetUrl(url) {
    if (window.PapoAuth && window.PapoAuth.resolveAssetUrl) {
      return window.PapoAuth.resolveAssetUrl(url);
    }

    return url || "";
  }

  function buildSupportHref(email, topic) {
    const subject = encodeURIComponent(
      `suporte | Papo de Liderança${email ?` | ${email}` : ""} | ${topic}`,
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
  }

  function buildEmailChangeHref(email) {
    const subject = encodeURIComponent("Solicitação de alteração de e-mail");
    const body = encodeURIComponent(
      `Olá, equipe Papo de Liderança.\n\nQuero solicitar a alteração do e-mail de acesso${email ?` atualmente cadastrado como ${email}` : ""}.`,
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
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

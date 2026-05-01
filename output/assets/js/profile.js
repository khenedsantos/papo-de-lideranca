(function () {
  const SUPPORT_EMAIL = "contato@papodelideranca.com";
  const AVATAR_MAX_SIZE = 3 * 1024 * 1024;
  const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
  let profileUser = null;
  let eventsBound = false;

  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (body.dataset.page !== "perfil") return;

    if (!auth || !auth.hasToken()) {
      window.location.replace("../auth/login.html");
      return;
    }

    try {
      const user = await auth.getCurrentUser();
      profileUser = user || {};
      renderProfile(profileUser);
      bindProfileInteractions(auth);
      setPageFeedback("");
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

  function bindProfileInteractions(auth) {
    if (eventsBound) return;
    eventsBound = true;

    const nameButton = document.querySelector("[data-profile-edit-name]");
    const avatarButton = document.querySelector("[data-profile-avatar-button]");
    const avatarInput = document.querySelector("[data-profile-avatar-input]");

    nameButton?.addEventListener("click", openNameField);
    avatarButton?.addEventListener("click", () => avatarInput?.click());

    document.querySelectorAll("[data-profile-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveName(auth, form);
      });
    });

    document.querySelectorAll("[data-profile-cancel]").forEach((button) => {
      button.addEventListener("click", () => {
        closeNameField();
        setPageFeedback("");
      });
    });

    avatarInput?.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0] ?avatarInput.files[0] : null;
      uploadAvatar(auth, avatarInput, file);
    });
  }

  function renderProfile(user) {
    const displayName = getUserDisplayName(user);
    const access = resolveAccessStatus(user);

    setText("[data-profile-name]", displayName || "nome não informado");
    setText("[data-profile-email]", user.email || "e-mail não informado");
    setText("[data-profile-role]", formatRole(user.role));
    setText("[data-profile-role-detail]", resolveRoleSupport(user.role, user.isActive));
    setText("[data-profile-last-login]", formatDateTimeShort(user.lastLoginAt));
    setText("[data-profile-last-login-detail]", "último acesso registrado na plataforma");
    setText("[data-profile-status-copy]", access.copy);
    setText("[data-profile-status-support]", access.support);
    setText("[data-profile-status-badge]", access.label);
    setHref("[data-profile-email-support]", buildEmailChangeHref());
    renderAvatar(user);
    setBadgeState(document.querySelector("[data-profile-status-badge]"), access.tone);
  }

  function openNameField() {
    const row = document.querySelector('[data-profile-field-row="name"]');
    const form = row?.querySelector('[data-profile-form="name"]');
    const valueNode = document.querySelector("[data-profile-name]");
    const editButton = document.querySelector("[data-profile-edit-name]");
    const input = form?.querySelector("input");

    if (!row || !form || !input || !valueNode || !editButton) return;

    input.value = getUserDisplayName(profileUser || {});
    form.hidden = false;
    valueNode.hidden = true;
    editButton.hidden = true;
    row.classList.add("is-editing");
    input.focus();
    input.select();
  }

  function closeNameField() {
    const row = document.querySelector('[data-profile-field-row="name"]');
    const form = row?.querySelector('[data-profile-form="name"]');
    const valueNode = document.querySelector("[data-profile-name]");
    const editButton = document.querySelector("[data-profile-edit-name]");

    if (!row || !form || !valueNode || !editButton) return;

    form.hidden = true;
    valueNode.hidden = false;
    editButton.hidden = false;
    row.classList.remove("is-editing");
    setFormLoading(form, false);
  }

  async function saveName(auth, form) {
    const input = form?.querySelector("input");
    const name = normalizeName(input?.value || "");

    if (!form || !input) return;

    if (name.length < 2 || name.length > 80) {
      input.setAttribute("aria-invalid", "true");
      setPageFeedback("informe um nome com pelo menos 2 caracteres.", "is-error");
      return;
    }

    input.removeAttribute("aria-invalid");
    setFormLoading(form, true);
    setPageFeedback("salvando alteração...", "");

    try {
      const user = await auth.updateCurrentUser({ name });
      profileUser = user || profileUser || {};
      closeNameField();
      renderProfile(profileUser);
      setPageFeedback("nome atualizado.", "is-success");
    } catch (error) {
      setPageFeedback(resolveProfileError(error), "is-error");
    } finally {
      setFormLoading(form, false);
    }
  }

  async function uploadAvatar(auth, input, file) {
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
      profileUser = user || profileUser || {};
      renderProfile(profileUser);
      setPageFeedback("foto atualizada.", "is-success");
    } catch (error) {
      renderAvatar(profileUser || {});
      setPageFeedback(resolveProfileError(error), "is-error");
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.value = "";
    }
  }

  function renderAvatar(user) {
    const avatar = document.querySelector("[data-profile-avatar]");
    const initials = document.querySelector("[data-profile-avatar-initials]");
    const image = document.querySelector("[data-profile-avatar-image]");
    const avatarUrl = resolveAssetUrl(user.avatarUrl);

    if (!avatar || !initials || !image) return;

    avatar.classList.remove("is-uploading");

    if (avatarUrl) {
      image.src = avatarUrl;
      image.alt = user.name ?`Foto de perfil de ${user.name}` : "Foto de perfil";
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
    image.alt = "Prévia da foto de perfil";
    image.hidden = false;
    initials.hidden = true;
    avatar.classList.add("has-image", "is-uploading");
  }

  function normalizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function setFormLoading(form, loading) {
    form.classList.toggle("is-saving", Boolean(loading));
    form.querySelectorAll("button, input").forEach((node) => {
      node.disabled = Boolean(loading);
    });
  }

  function resolveProfileError(error) {
    const message = error && error.payload && error.payload.message;

    if (Array.isArray(message) && message.length) return message[0];
    if (typeof message === "string") return message;
    if (error instanceof TypeError) return "não foi possível conectar com a API local agora.";

    return "não foi possível salvar a alteração neste momento.";
  }

  function resolveAccessStatus(user) {
    if (user && user.hasCompletedAccess && user.isActive !== false) {
      return {
        label: "acesso concluído",
        tone: "success",
        copy: "sua conta está em dia",
        support: "todos os acessos e informações estão seguros.",
      };
    }

    if (user && user.isActive === false) {
      return {
        label: "acesso inativo",
        tone: "muted",
        copy: "sua conta precisa de revisão",
        support: "fale com o suporte para revisar o estado da conta.",
      };
    }

    return {
      label: "acesso pendente",
      tone: "warning",
      copy: "sua conta ainda precisa concluir algumas etapas",
      support: "finalize o fluxo de acesso para liberar todas as funcionalidades.",
    };
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
    const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);

    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();

    return source.slice(0, 2).toUpperCase();
  }

  function resolveAssetUrl(url) {
    if (window.PapoAuth && window.PapoAuth.resolveAssetUrl) {
      return window.PapoAuth.resolveAssetUrl(url);
    }

    return url || "";
  }

  function buildEmailChangeHref() {
    const subject = encodeURIComponent("Solicitação de alteração de e-mail");
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-forgot-password-form]");
  const auth = window.PapoAuth;

  if (!form) return;

  const emailField = form.querySelector('input[type="email"]');
  const feedback = form.querySelector("[data-auth-feedback]");
  const submit = form.querySelector('button[type="submit"]');
  const resetPanel = document.querySelector("[data-reset-link-panel]");
  const resetLink = document.querySelector("[data-reset-link]");
  const resetNote = document.querySelector("[data-reset-link-note]");

  const setLoading = (loading) => {
    if (!submit) return;

    submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.textContent = loading
      ? "enviando..."
      : (submit.dataset.originalLabel || "enviar link");
  };

  const setFieldInvalid = (field, invalid) => {
    if (!field) return;

    const shell = field.closest(".auth-input-shell");
    field.toggleAttribute("aria-invalid", Boolean(invalid));

    if (shell) {
      shell.classList.toggle("is-invalid", Boolean(invalid));
    }
  };

  const showFeedback = (message, type) => {
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove("is-error", "is-success");

    if (type) {
      feedback.classList.add(type);
    }
  };

  const clearFeedback = () => {
    if (!feedback) return;
    feedback.textContent = "";
    feedback.classList.remove("is-error", "is-success");
  };

  const hideResetPanel = () => {
    if (!resetPanel) return;
    resetPanel.hidden = true;
  };

  const showResetPanel = (token) => {
    if (!resetPanel || !resetLink) return;

    resetLink.href = `./redefinir-senha.html?token=${encodeURIComponent(token)}`;
    resetPanel.hidden = false;

    if (resetNote) {
      resetNote.textContent = "em ambiente local, o link de redefinição já está pronto para o teste real.";
    }
  };

  emailField?.addEventListener("input", () => {
    setFieldInvalid(emailField, false);
    clearFeedback();
    hideResetPanel();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailValue = emailField?.value.trim() || "";
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    if (emailField) {
      emailField.value = emailValue;
    }

    setFieldInvalid(emailField, !emailLooksValid);
    hideResetPanel();

    if (!auth) {
      showFeedback("A camada de autenticação não foi carregada corretamente.", "is-error");
      return;
    }

    if (!emailLooksValid) {
      showFeedback("Informe um e-mail válido para continuar.", "is-error");
      return;
    }

    setLoading(true);
    clearFeedback();

    try {
      const result = await auth.forgotPassword({ email: emailValue });

      showFeedback(
        result.message || "Se o e-mail existir, um link de redefinição foi preparado.",
        "is-success",
      );

      if (result.resetToken) {
        showResetPanel(result.resetToken);
      }
    } catch (error) {
      if (error && error.status === 400) {
        showFeedback("Não foi possível validar esse e-mail. Revise o campo e tente novamente.", "is-error");
      } else if (error instanceof TypeError) {
        showFeedback("Não foi possível falar com a API local agora. Verifique se o backend está ativo.", "is-error");
      } else {
        showFeedback("Não foi possível preparar a redefinição agora. Tente novamente em instantes.", "is-error");
      }
    } finally {
      setLoading(false);
    }
  });
});

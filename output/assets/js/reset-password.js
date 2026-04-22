document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-reset-password-form]");
  const auth = window.PapoAuth;

  if (!form) return;

  const passwordField = form.querySelector('input[name="password"]');
  const confirmField = form.querySelector('input[name="confirm-password"]');
  const tokenField = form.querySelector('input[name="token"]');
  const feedback = form.querySelector("[data-auth-feedback]");
  const submit = form.querySelector('button[type="submit"]');
  const successPanel = document.querySelector("[data-reset-success]");
  const tokenStatus = document.querySelector("[data-token-status]");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const setLoading = (loading) => {
    if (!submit) return;

    submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.textContent = loading
      ? "redefinindo..."
      : (submit.dataset.originalLabel || "redefinir senha");
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

  const showSuccessPanel = () => {
    if (!successPanel) return;
    successPanel.hidden = false;
  };

  form.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = form.querySelector(`#${button.getAttribute("aria-controls")}`);
      if (!input) return;

      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "ocultar" : "mostrar";
      button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    });
  });

  [passwordField, confirmField].forEach((field) => {
    field?.addEventListener("input", () => {
      setFieldInvalid(field, false);
      clearFeedback();
    });
  });

  if (tokenField) {
    tokenField.value = token;
  }

  if (tokenStatus) {
    tokenStatus.textContent = token
      ? "token validado para esta sessão de redefinição."
      : "nenhum token de redefinição foi encontrado neste link.";
  }

  if (!token) {
    setLoading(false);
    if (submit) {
      submit.disabled = true;
    }
    showFeedback("Este link de redefinição está incompleto. Solicite um novo link para continuar.", "is-error");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const passwordValue = passwordField?.value.trim() || "";
    const confirmValue = confirmField?.value.trim() || "";
    const passwordIsValid = passwordValue.length >= 8;
    const passwordsMatch = passwordValue === confirmValue;

    setFieldInvalid(passwordField, !passwordIsValid);
    setFieldInvalid(confirmField, !passwordsMatch || !confirmValue);

    if (!auth) {
      showFeedback("A camada de autenticação não foi carregada corretamente.", "is-error");
      return;
    }

    if (!passwordIsValid) {
      showFeedback("Use uma senha com pelo menos 8 caracteres.", "is-error");
      return;
    }

    if (!passwordsMatch) {
      showFeedback("As senhas não conferem. Revise os campos e tente novamente.", "is-error");
      return;
    }

    setLoading(true);
    clearFeedback();

    try {
      const result = await auth.resetPassword({
        token,
        password: passwordValue,
        confirmPassword: confirmValue,
      });

      showFeedback(result.message || "Senha redefinida com sucesso.", "is-success");
      showSuccessPanel();

      window.setTimeout(() => {
        window.location.assign("./login.html");
      }, 1200);
    } catch (error) {
      const message = (error && error.message) || "";

      if (message.toLowerCase().includes("expirado")) {
        showFeedback("Este link expirou. Solicite uma nova redefinição para continuar.", "is-error");
      } else if (message.toLowerCase().includes("inválido") || message.toLowerCase().includes("invalido")) {
        showFeedback("O token de redefinição não é válido. Solicite um novo link para continuar.", "is-error");
      } else if (error instanceof TypeError) {
        showFeedback("Não foi possível falar com a API local agora. Verifique se o backend está ativo.", "is-error");
      } else {
        showFeedback("Não foi possível redefinir sua senha agora. Tente novamente em instantes.", "is-error");
      }
    } finally {
      setLoading(false);
    }
  });
});

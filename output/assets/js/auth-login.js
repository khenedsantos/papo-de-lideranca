document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-auth-form]");
  const auth = window.PapoAuth;

  if (!form) return;

  const feedback = form.querySelector("[data-auth-feedback]");
  const submit = form.querySelector('button[type="submit"]');
  const emailField = form.querySelector('input[type="email"]');
  const passwordField = form.querySelector('input[type="password"]');
  const redirectUrl = form.dataset.redirectUrl || "../app/dashboard.html";

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

  const setLoading = (loading) => {
    if (!submit) return;

    submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.setAttribute("aria-busy", loading ? "true" : "false");
    submit.textContent = loading
      ? "entrando..."
      : (submit.dataset.originalLabel || "entrar");
  };

  const mapErrorMessage = (error) => {
    if (!error) {
      return form.dataset.errorMessage || "Nao foi possivel entrar agora. Revise seus dados e tente novamente.";
    }

    if (error.status === 401) {
      return "E-mail ou senha invalidos. Revise seus dados e tente novamente.";
    }

    if (error.status === 403) {
      return "Seu acesso ainda nao foi criado. Conclua a criacao de senha para entrar.";
    }

    if (error.status >= 500) {
      return "Nao foi possivel validar seu acesso agora. Tente novamente em instantes.";
    }

    if (error instanceof TypeError) {
      return "Nao foi possivel falar com a API local. Verifique se o backend esta ativo em 127.0.0.1:3001.";
    }

    return error.message || form.dataset.errorMessage || "Nao foi possivel entrar agora. Revise seus dados e tente novamente.";
  };

  if (auth && auth.hasToken()) {
    window.location.replace(redirectUrl);
    return;
  }

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

  [emailField, passwordField].forEach((field) => {
    field?.addEventListener("input", () => {
      setFieldInvalid(field, false);
      clearFeedback();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailValue = emailField?.value.trim() || "";
    const passwordValue = passwordField?.value.trim() || "";
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    if (emailField) {
      emailField.value = emailValue;
    }

    setFieldInvalid(emailField, !emailLooksValid);
    setFieldInvalid(passwordField, !passwordValue);

    if (!emailField || !emailLooksValid || !passwordValue) {
      showFeedback(
        form.dataset.errorMessage || "Nao foi possivel entrar agora. Revise seus dados e tente novamente.",
        "is-error",
      );
      return;
    }

    if (!auth) {
      showFeedback("A camada de autenticacao nao foi carregada corretamente.", "is-error");
      return;
    }

    setLoading(true);
    clearFeedback();

    try {
      await auth.login({
        email: emailValue,
        password: passwordValue,
      });

      showFeedback(
        form.dataset.successMessage || "Acesso validado. Redirecionando para a sua area.",
        "is-success",
      );

      window.setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 320);
    } catch (error) {
      showFeedback(mapErrorMessage(error), "is-error");
      setLoading(false);
      setFieldInvalid(passwordField, true);
    }
  });
});

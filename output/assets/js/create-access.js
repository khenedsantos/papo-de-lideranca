document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-create-access-form]");
  const auth = window.PapoAuth;

  if (!form) return;

  const emailField = form.querySelector('input[name="email"]');
  const nameField = form.querySelector('input[name="name"]');
  const passwordField = form.querySelector('input[name="password"]');
  const confirmField = form.querySelector('input[name="confirm-password"]');
  const feedback = form.querySelector("[data-auth-feedback]");
  const submit = form.querySelector('button[type="submit"]');
  const successPanel = document.querySelector("[data-create-access-success]");
  const params = new URLSearchParams(window.location.search);
  const prefilledEmail = (params.get("email") || "").trim().toLowerCase();
  let isComplete = false;

  const setLoading = (loading) => {
    if (!submit) return;

    submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
    submit.disabled = loading || isComplete;
    submit.classList.toggle("is-loading", loading);
    submit.textContent = loading
      ?"criando acesso..."
      : (submit.dataset.originalLabel || "criar acesso");
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
      input.type = show ?"text" : "password";
      button.textContent = show ?"ocultar" : "mostrar";
      button.setAttribute("aria-label", show ?"Ocultar senha" : "Mostrar senha");
    });
  });

  [nameField, emailField, passwordField, confirmField].forEach((field) => {
    field?.addEventListener("input", () => {
      setFieldInvalid(field, false);
      clearFeedback();
    });
  });

  if (emailField && prefilledEmail) {
    emailField.value = prefilledEmail;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nameValue = (nameField?.value || "").trim().replace(/\s+/g, " ");
    const emailValue = (emailField?.value || "").trim().toLowerCase();
    const passwordValue = (passwordField?.value || "").trim();
    const confirmValue = (confirmField?.value || "").trim();
    const nameIsValid = nameValue.length >= 2;
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    const passwordIsValid = passwordValue.length >= 8;
    const passwordsMatch = passwordValue === confirmValue;

    if (nameField) {
      nameField.value = nameValue;
    }

    if (emailField) {
      emailField.value = emailValue;
    }

    setFieldInvalid(nameField, !nameIsValid);
    setFieldInvalid(emailField, !emailLooksValid);
    setFieldInvalid(passwordField, !passwordIsValid);
    setFieldInvalid(confirmField, !passwordsMatch || !confirmValue);

    if (!auth) {
      showFeedback("Não foi possível iniciar a criação de acesso agora. Recarregue a página e tente novamente.", "is-error");
      return;
    }

    if (!nameIsValid) {
      showFeedback("Informe seu nome completo para personalizar sua área.", "is-error");
      return;
    }

    if (!emailLooksValid) {
      showFeedback("Informe o e-mail do convite para continuar.", "is-error");
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
      const result = await auth.createAccess({
        name: nameValue,
        email: emailValue,
        password: passwordValue,
        confirmPassword: confirmValue,
      });

      showFeedback(result.message || "Acesso criado com sucesso.", "is-success");
      isComplete = true;
      setLoading(false);
      showSuccessPanel();

      window.setTimeout(() => {
        window.location.assign("./login.html");
      }, 1200);
    } catch (error) {
      if (error && error.status === 404) {
        showFeedback("Não encontramos um convite ativo para esse e-mail.", "is-error");
      } else if (error && error.status === 409) {
        showFeedback("Esse acesso já foi concluído. Você já pode entrar ou recuperar sua senha.", "is-error");
      } else if (error && error.status === 400) {
        showFeedback("Revise os dados informados e tente novamente.", "is-error");
      } else if (error instanceof TypeError) {
        showFeedback("O serviço de acesso não respondeu agora. Verifique se o backend local está ativo e tente novamente.", "is-error");
      } else {
        showFeedback("Não foi possível concluir seu acesso agora. Tente novamente em instantes.", "is-error");
      }
    } finally {
      setLoading(false);
    }
  });
});

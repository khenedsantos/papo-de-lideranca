document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("[data-auth-form]");

  forms.forEach((form) => {
    const feedback = form.querySelector("[data-auth-feedback]");
    const submit = form.querySelector('button[type="submit"]');
    const emailField = form.querySelector('input[type="email"]');
    const passwordField = form.querySelector('input[type="password"]');

    const showFeedback = (message, type) => {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.classList.remove("is-error", "is-success");
      if (type) feedback.classList.add(type);
    };

    const clearFeedback = () => {
      if (!feedback) return;
      feedback.textContent = "";
      feedback.classList.remove("is-error", "is-success");
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

    [emailField, passwordField].forEach((field) => {
      field?.addEventListener("input", () => {
        field.removeAttribute("aria-invalid");
        clearFeedback();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const emailValue = emailField?.value.trim() || "";
      const passwordValue = passwordField?.value.trim() || "";
      const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

      if (emailField) {
        emailField.value = emailValue;
        emailField.setCustomValidity("");
      }

      if (!emailField || !emailLooksValid || !emailField.checkValidity() || !passwordValue) {
        if (emailField && (!emailLooksValid || !emailField.checkValidity())) {
          emailField.setAttribute("aria-invalid", "true");
        }

        showFeedback(
          form.dataset.errorMessage || "não foi possível entrar agora. revise seus dados ou tente novamente.",
          "is-error"
        );
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
        submit.textContent = "entrando...";
      }

      window.setTimeout(() => {
        showFeedback(
          form.dataset.successMessage || "acesso validado. agora é só conectar este passo com a autenticação real.",
          "is-success"
        );

        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalLabel || submit.textContent;
        }
      }, 700);
    });
  });
});

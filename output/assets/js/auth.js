document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("[data-auth-form]");

  forms.forEach((form) => {
    const feedback = form.querySelector("[data-auth-feedback]");
    const submit = form.querySelector('button[type="submit"]');

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

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (submit) {
        submit.disabled = true;
        submit.dataset.originalLabel = submit.dataset.originalLabel || submit.textContent;
        submit.textContent = "enviando...";
      }

      window.setTimeout(() => {
        if (feedback) {
          feedback.textContent = form.dataset.successMessage || "Tudo pronto. Agora é só conectar essa tela com a autenticação.";
        }

        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalLabel || submit.textContent;
        }
      }, 800);
    });
  });
});

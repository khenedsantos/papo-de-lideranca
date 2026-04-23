document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  if (!body) return;

  const isSupportedPage =
    body.classList.contains("dashboard-page") ||
    body.classList.contains("biblioteca-page") ||
    body.classList.contains("app-article-page") ||
    body.classList.contains("short-edition-page");

  if (!isSupportedPage) return;

  const button = createBackToTopButton(resolveBackToTopTheme(body));
  document.body.appendChild(button);

  const syncVisibility = () => {
    button.classList.toggle("is-visible", window.scrollY > 420);
  };

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });

  syncVisibility();
  window.addEventListener("scroll", syncVisibility, { passive: true });
  window.addEventListener("pageshow", syncVisibility);
});

function createBackToTopButton(theme) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top-button";
  button.setAttribute("aria-label", "Voltar ao topo da página");
  button.setAttribute("data-theme", theme);
  button.innerHTML =
    '<span class="back-to-top-button__icon" aria-hidden="true">↑</span><span class="back-to-top-button__label">voltar ao topo</span>';
  return button;
}

function resolveBackToTopTheme(body) {
  if (body.classList.contains("app-article-page")) {
    return "light";
  }

  if (body.classList.contains("dashboard-page--lite")) {
    return "light";
  }

  return "dark";
}

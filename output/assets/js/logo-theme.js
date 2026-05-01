function setupAdaptiveLogo() {
  const header = document.querySelector(".site-header");
  const logo = document.querySelector(".logo[data-logo-light][data-logo-dark]");
  const body = document.body;

  if (!header || !logo || !body) return;

  const lightSrc = logo.getAttribute("data-logo-light");
  const darkSrc = logo.getAttribute("data-logo-dark");
  const scrollVariant = body.dataset.scrollLogo || "";

  function getBaseVariant() {
    return body.classList.contains("theme-dark") ?"light" : "dark";
  }

  function getScrollVariant(baseVariant) {
    if (!header.classList.contains("is-scrolled")) return baseVariant;
    if (scrollVariant === "light") return "light";
    if (scrollVariant === "dark") return "dark";
    return baseVariant;
  }

  function syncLogo() {
    const variant = getScrollVariant(getBaseVariant());
    const nextSrc = variant === "light" ?lightSrc : darkSrc;
    if (nextSrc && logo.getAttribute("src") !== nextSrc) {
      logo.setAttribute("src", nextSrc);
    }
  }

  syncLogo();
  window.addEventListener("scroll", syncLogo, { passive: true });

  const observer = new MutationObserver(syncLogo);
  observer.observe(header, { attributes: true, attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", setupAdaptiveLogo);

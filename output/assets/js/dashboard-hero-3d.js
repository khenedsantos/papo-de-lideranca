document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("dashboard-ready");

  const header = document.querySelector(".dashboard-header");
  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  document.querySelectorAll("[data-progress]").forEach((bar) => {
    const fill = bar.querySelector("span");
    if (!fill) return;
    const progress = Number.parseInt(bar.dataset.progress || "0", 10);
    window.requestAnimationFrame(() => {
      fill.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
    });
  });

  const heroStages = document.querySelectorAll(".dashboard-hero-stage");
  heroStages.forEach((item, index) => {
    window.setTimeout(() => {
      item.classList.add("is-visible");
    }, 120 * index);
  });

  const reveals = document.querySelectorAll("[data-reveal]:not(.dashboard-hero-stage)");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.15,
    rootMargin: "0px 0px -10% 0px"
  });

  reveals.forEach((item) => observer.observe(item));

  document.querySelectorAll("[data-read-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const original = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = original;
      button.textContent = "abrindo...";

      window.setTimeout(() => {
        button.textContent = original;
      }, 900);
    });
  });

  const tiltCards = document.querySelectorAll("[data-tilt]");
  tiltCards.forEach((card) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const reset = () => {
      card.style.transform = "";
    };

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateX = y * -1.4;
      const rotateY = x * 1.8;
      card.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
  });
});


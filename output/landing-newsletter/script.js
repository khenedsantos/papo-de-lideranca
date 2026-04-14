function setupNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");

  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupHeaderScrollState() {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  const syncState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  syncState();
  window.addEventListener("scroll", syncState, { passive: true });
}

function setupAccordion() {
  const items = document.querySelectorAll(".faq-item");

  items.forEach((item) => {
    const button = item.querySelector(".faq-question");
    if (!button) return;
    button.setAttribute(
      "aria-expanded",
      String(item.classList.contains("is-open"))
    );
  });

  items.forEach((item) => {
    const button = item.querySelector(".faq-question");
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      items.forEach((entry) => {
        entry.classList.remove("is-open");
        const entryButton = entry.querySelector(".faq-question");
        if (entryButton) entryButton.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function setupHeroSwiper() {
  const swiper = document.querySelector("[data-hero-swiper]");
  const track = swiper?.querySelector("[data-hero-swiper-track]");
  const count = swiper?.querySelector("[data-hero-swiper-count]");
  const progress = swiper?.querySelector("[data-hero-swiper-progress]");
  const slides = track ? Array.from(track.children) : [];

  if (!swiper || !track || slides.length === 0) return;

  let currentIndex = 0;
  let autoplayId = null;
  const interval = 3000;

  function update() {
    slides.forEach((slide, index) => {
      slide.classList.remove(
        "is-active",
        "is-prev",
        "is-next",
        "is-hidden-left",
        "is-hidden-right"
      );

      const relativeIndex =
        (index - currentIndex + slides.length) % slides.length;

      if (relativeIndex === 0) {
        slide.classList.add("is-active");
      } else if (relativeIndex === 1) {
        slide.classList.add("is-next");
      } else if (relativeIndex === slides.length - 1) {
        slide.classList.add("is-prev");
      } else if (relativeIndex < slides.length / 2) {
        slide.classList.add("is-hidden-right");
      } else {
        slide.classList.add("is-hidden-left");
      }
    });

    if (count) {
      count.textContent = String(currentIndex + 1).padStart(2, "0");
    }

    if (progress) {
      progress.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
    }
  }

  function goTo(index) {
    currentIndex = (index + slides.length) % slides.length;
    update();
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function stopAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayId = window.setInterval(next, interval);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  swiper.addEventListener("mouseenter", stopAutoplay);
  swiper.addEventListener("mouseleave", startAutoplay);
  swiper.addEventListener("focusin", stopAutoplay);
  swiper.addEventListener("focusout", startAutoplay);

  update();
  startAutoplay();
}

function setupCarousel(carousel) {
  const track = carousel.querySelector("[data-carousel-track]");
  const slides = track ? Array.from(track.children) : [];
  const dotsContainer = carousel.querySelector("[data-carousel-dots]");
  const externalControls = document.querySelector(
    `[data-carousel-controls="${carousel.id}"]`
  );

  if (!track || !dotsContainer || slides.length === 0) return;

  let currentIndex = 0;
  let autoplayId = null;
  const interval = Number(carousel.dataset.interval || 4600);
  const autoplayEnabled = carousel.dataset.autoplay === "true";

  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para o slide ${index + 1}`);
    dot.addEventListener("click", () => {
      goTo(index);
      restartAutoplay();
    });
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.children);

  function update() {
    track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
    });
  }

  function goTo(index) {
    currentIndex = (index + slides.length) % slides.length;
    update();
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function previous() {
    goTo(currentIndex - 1);
  }

  function stopAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  function startAutoplay() {
    if (!autoplayEnabled) return;
    stopAutoplay();
    autoplayId = window.setInterval(next, interval);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  const prevButton = externalControls?.querySelector("[data-carousel-prev]");
  const nextButton = externalControls?.querySelector("[data-carousel-next]");

  prevButton?.addEventListener("click", () => {
    previous();
    restartAutoplay();
  });

  nextButton?.addEventListener("click", () => {
    next();
    restartAutoplay();
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", startAutoplay);

  update();
  startAutoplay();
}

function setupForms() {
  const forms = document.querySelectorAll("[data-newsletter-form]");

  forms.forEach((form) => {
    const feedback = form.parentElement.querySelector("[data-form-feedback]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const emailField = form.querySelector('input[type="email"]');
      const email = emailField?.value.trim() || "";

      if (!email || !email.includes("@")) {
        if (feedback) {
          feedback.textContent = "Digite um e-mail válido para continuar.";
        }
        return;
      }

      if (feedback) {
        feedback.textContent =
          "Inscrição simulada com sucesso para teste local. Para integrar com sua ferramenta, edite o envio em script.js.";
      }

      form.reset();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupHeaderScrollState();
  setupAccordion();
  setupHeroSwiper();
  setupForms();
  document.querySelectorAll("[data-carousel]").forEach(setupCarousel);
});

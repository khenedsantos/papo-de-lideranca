(function () {
  "use strict";

  const READY_FLAG = "articleReadingReady";
  const MIN_HEADINGS_FOR_TOC = 3;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArticleReading, { once: true });
  } else {
    initArticleReading();
  }

  function initArticleReading() {
    const body = document.body;

    if (!body || !body.classList.contains("app-article-page")) return;
    if (body.dataset[READY_FLAG] === "true") return;

    body.dataset[READY_FLAG] = "true";

    const shell = document.querySelector(".app-article-shell");
    const hero = document.querySelector(".app-article-hero");
    const prose = document.querySelector(".app-article-prose");

    if (!shell || !hero || !prose) return;

    const progressBar = createProgressBar();
    const headings = Array.from(prose.querySelectorAll("h2"))
      .filter((heading) => normalizeText(heading.textContent).length > 0);

    ensureHeadingIds(headings);

    const readingPanel = createReadingPanel(headings);
    if (readingPanel) {
      hero.insertAdjacentElement("afterend", readingPanel);
      body.classList.add("has-reading-panel");
    }

    createReflectionBlock(shell);
    setupReadingState(progressBar, headings);
  }

  function createProgressBar() {
    const existing = document.querySelector(".app-reading-progress span");
    if (existing) return existing;

    const wrapper = document.createElement("div");
    const bar = document.createElement("span");

    wrapper.className = "app-reading-progress";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.appendChild(bar);

    document.body.prepend(wrapper);

    return bar;
  }

  function createReadingPanel(headings) {
    const note = createReadingNote();
    const toc = headings.length >= MIN_HEADINGS_FOR_TOC
      ? createReadingToc(headings)
      : null;

    if (!note && !toc) return null;

    const panel = document.createElement("aside");
    panel.className = "app-reading-panel";
    panel.setAttribute("aria-label", "apoio de leitura");

    if (note) panel.appendChild(note);
    if (toc) panel.appendChild(toc);

    return panel;
  }

  function createReadingNote() {
    const category = getText(".app-article-kicker");
    const title = getText(".app-article-hero h1");
    const subtitle = getText(".app-article-subtitle");
    const time = getReadingTime();

    if (!title || (!subtitle && !time && !category)) return null;

    const note = document.createElement("section");
    const label = document.createElement("p");
    const meta = document.createElement("p");
    const copy = document.createElement("p");

    note.className = "app-reading-note app-reading-card";
    note.setAttribute("aria-label", `apoio de leitura: ${title}`);

    label.className = "app-reading-eyebrow";
    label.textContent = "para ler quando";

    meta.className = "app-reading-note-meta";
    meta.textContent = [category, time].filter(Boolean).join(" | ");

    copy.className = "app-reading-note-copy";
    copy.textContent = buildNoteCopy({ category, title, subtitle, time });

    note.appendChild(label);
    if (meta.textContent) note.appendChild(meta);
    note.appendChild(copy);

    return note;
  }

  function createReadingToc(headings) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const list = document.createElement("ol");

    details.className = "app-reading-toc app-reading-card";
    details.open = true;

    summary.className = "app-reading-eyebrow";
    summary.textContent = "nesta leitura";

    headings.forEach((heading) => {
      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = `#${heading.id}`;
      link.textContent = normalizeText(heading.textContent);
      link.dataset.articleTocLink = heading.id;

      item.appendChild(link);
      list.appendChild(item);
    });

    details.appendChild(summary);
    details.appendChild(list);

    return details;
  }

  function createReflectionBlock(shell) {
    if (document.querySelector(".app-article-reflection")) return;

    const category = getText(".app-article-kicker");
    const related = shell.querySelector(".app-article-related");
    const footer = shell.querySelector(".app-article-footer");
    const reflection = document.createElement("section");
    const label = document.createElement("p");
    const question = document.createElement("p");

    reflection.className = "app-article-reflection";
    reflection.setAttribute("aria-label", "pergunta de reflexao");

    label.className = "app-reading-eyebrow";
    label.textContent = "para pensar durante a leitura";

    question.className = "app-article-reflection-question";
    question.textContent = buildReflectionQuestion(category);

    reflection.appendChild(label);
    reflection.appendChild(question);

    const anchor = related || footer;
    if (anchor) {
      shell.insertBefore(reflection, anchor);
    } else {
      shell.appendChild(reflection);
    }
  }

  function setupReadingState(progressBar, headings) {
    let ticking = false;
    let activeSection = null;

    const update = () => {
      ticking = false;
      updateProgress(progressBar);
      activeSection = updateActiveHeading(headings, activeSection);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    update();
  }

  function updateProgress(progressBar) {
    const doc = document.documentElement;
    const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const progress = clamp((window.scrollY || window.pageYOffset || 0) / maxScroll, 0, 1);

    progressBar.style.transform = `scaleX(${progress})`;
    document.body.classList.toggle("is-reading-article", progress > 0.04 && progress < 0.96);
    document.body.classList.toggle("has-finished-article", progress >= 0.96);
  }

  function updateActiveHeading(headings, activeSection) {
    if (!headings.length) return null;

    const targetLine = window.innerHeight * 0.34;
    let current = headings[0];

    headings.forEach((heading) => {
      if (heading.getBoundingClientRect().top <= targetLine) {
        current = heading;
      }
    });

    const currentSection = current.closest("section");

    if (activeSection && activeSection !== currentSection) {
      activeSection.classList.remove("is-current-reading-section");
    }

    if (currentSection) {
      currentSection.classList.add("is-current-reading-section");
    }

    updateTocLinks(current.id);

    return currentSection;
  }

  function updateTocLinks(activeId) {
    const links = document.querySelectorAll("[data-article-toc-link]");

    links.forEach((link) => {
      const isActive = link.dataset.articleTocLink === activeId;

      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function ensureHeadingIds(headings) {
    const usedIds = new Set(
      Array.from(document.querySelectorAll("[id]"))
        .map((element) => element.id)
        .filter(Boolean),
    );

    headings.forEach((heading, index) => {
      if (heading.id) return;

      const baseId = slugify(heading.textContent) || `leitura-${index + 1}`;
      let id = baseId;
      let suffix = 2;

      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      heading.id = id;
      usedIds.add(id);
    });
  }

  function buildNoteCopy(data) {
    const time = data.time || "alguns minutos";
    const theme = data.category || "este tema";
    const title = data.title ? `\"${data.title}\"` : "esta leitura";

    if (data.subtitle) {
      return `use ${title} como uma pausa curta para transformar leitura em crit\u00e9rio antes de decidir, conversar ou priorizar.`;
    }

    return `use esta pausa curta para olhar ${theme} com calma antes de uma decis\u00e3o, conversa ou prioridade importante.`;
  }

  function buildReflectionQuestion(category) {
    if (category) {
      return `qual decis\u00e3o, conversa ou prioridade sobre ${category} esta leitura ajuda voc\u00ea a enxergar com mais clareza hoje?`;
    }

    return "qual decis\u00e3o, conversa ou prioridade esta leitura ajuda voc\u00ea a enxergar com mais clareza hoje?";
  }

  function getReadingTime() {
    const metaItems = Array.from(document.querySelectorAll(".app-article-meta span"));
    const timeItem = metaItems.find((item) => /min/i.test(item.textContent || ""));

    return timeItem ? normalizeText(timeItem.textContent) : "";
  }

  function getText(selector) {
    const element = document.querySelector(selector);
    return element ? normalizeText(element.textContent) : "";
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function slugify(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();

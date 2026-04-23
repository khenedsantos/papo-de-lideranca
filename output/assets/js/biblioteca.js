document.addEventListener("DOMContentLoaded", async () => {
  const body = document.body;
  const auth = window.PapoAuth;

  if (!body.classList.contains("biblioteca-page")) return;
  if (!auth || !auth.hasToken()) return;

  await loadBibliotecaState(auth);
  bindBibliotecaRefresh(auth);
});

let bibliotecaRefreshInFlight = null;

const EDITORIAL_ARTICLE_ORDER = [
  "artigo-autoridade-sem-dureza",
  "artigo-carreira-antes-da-promocao",
  "artigo-feedback-que-desenvolve",
  "artigo-liderar-sem-microgerenciar",
  "artigo-mentalidade-que-gera-influencia",
  "artigo-produtividade-do-lider",
  "artigo-relevancia-sem-autopromocao",
  "artigo-disciplina-emocional-sob-pressao",
  "artigo-rituais-simples-para-alinhamento",
  "artigo-proteger-tempo-de-pensamento-estrategico",
];

const EDITION_INDEX_BY_SLUG = new Map(
  EDITORIAL_ARTICLE_ORDER.map((slug, index) => [slug, index + 1]),
);

async function loadBibliotecaState(auth) {
  if (bibliotecaRefreshInFlight) {
    return bibliotecaRefreshInFlight;
  }

  bibliotecaRefreshInFlight = Promise.all([
    auth.getReadingProgress({ contentType: "ARTICLE" }),
    auth.getReadingProgressSummary(),
  ])
    .then(([progressList, summary]) => {
      const progressBySlug = new Map();

      (progressList || []).forEach((item) => {
        if (!item || !item.content || !item.content.slug) return;
        progressBySlug.set(item.content.slug, item);
      });

      decorateBibliotecaCards(progressBySlug);
      populateBibliotecaCurrentReading(summary, progressBySlug);
      decorateBibliotecaEditionLabels();
    })
    .catch((error) => {
      if (error && (error.status === 401 || error.status === 403) && auth) {
        auth.clearSession();
        window.location.replace("../auth/login.html");
      }
    })
    .finally(() => {
      bibliotecaRefreshInFlight = null;
    });

  return bibliotecaRefreshInFlight;
}

function bindBibliotecaRefresh(auth) {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      loadBibliotecaState(auth);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadBibliotecaState(auth);
    }
  });

  window.addEventListener("focus", () => {
    loadBibliotecaState(auth);
  });
}

function populateBibliotecaCurrentReading(summary, progressBySlug) {
  const currentReading = resolveBibliotecaCurrentReading(summary, progressBySlug);

  if (!currentReading || !currentReading.content) return;

  applyBibliotecaCurrentReading(currentReading);
}

function applyBibliotecaCurrentReading(currentReading) {
  const content = currentReading.content;
  const progressPercent = Number.parseInt(currentReading.progressPercent || 0, 10);
  const state = resolveReadingState(currentReading);
  const isSuggestion = state === "SUGGESTED";
  const isCompleted = state === "COMPLETED";

  setText("[data-library-current-category]", formatCategoryName(content.category && content.category.name));
  setText("[data-library-current-time]", `${content.readTimeMinutes || 0} min`);
  setText("[data-library-current-title]", content.title || "leitura em andamento");
  setText(
    "[data-library-current-excerpt]",
    isSuggestion
      ? "sem uma leitura em andamento agora, esta \u00e9 a pr\u00f3xima sugest\u00e3o editorial para continuar sua linha de racioc\u00ednio."
      : isCompleted
        ? "esta leitura j\u00e1 foi conclu\u00edda e segue dispon\u00edvel para revis\u00e3o quando fizer sentido."
        : content.excerpt || "retome a leitura em andamento com o progresso real da sua conta.",
  );
  setLink(
    "[data-library-current-link]",
    `./artigos/${content.slug}.html`,
    isSuggestion
      ? "come\u00e7ar nova leitura"
      : isCompleted
        ? "revisitar leitura"
        : "continuar leitura",
  );
  setProgressValue(
    document.querySelector("[data-library-current-progress]"),
    isSuggestion || isCompleted ? null : progressPercent,
    document.querySelector("[data-library-current-progress-label]"),
    isSuggestion ? "pronta" : isCompleted ? "conclu\u00edda" : null,
  );

  setCurrentStateLabel(
    isSuggestion
      ? "pr\u00f3xima leitura sugerida"
      : isCompleted
        ? "leitura conclu\u00edda"
        : "leitura em andamento",
  );
  syncCurrentFeatureState(isSuggestion, isCompleted);

  if (isSuggestion) {
    setText("[data-library-current-note-label]", "\u00faltima leitura");
    setText(
      "[data-library-current-note-value]",
      "sem uma leitura em andamento agora, esta \u00e9 a pr\u00f3xima sugest\u00e3o editorial para continuar sua linha de racioc\u00ednio.",
    );
    return;
  }

  if (isCompleted) {
    setText("[data-library-current-note-label]", "\u00faltima leitura");
    setText(
      "[data-library-current-note-value]",
      "esta leitura j\u00e1 foi conclu\u00edda e segue dispon\u00edvel para revis\u00e3o quando fizer sentido.",
    );
    return;
  }

  setText("[data-library-current-note-label]", "leitura em andamento");
  setText(
    "[data-library-current-note-value]",
    `retomar com ${progressPercent}% j\u00e1 percorrido e seguir do ponto em que a leitura come\u00e7ou a gerar valor.`,
  );
}

function resolveBibliotecaCurrentReading(summary, progressBySlug) {
  if (
    summary &&
    summary.continueBlock &&
    summary.continueBlock.item &&
    summary.continueBlock.item.contentType === "ARTICLE"
  ) {
    return {
      content: summary.continueBlock.item,
      progressPercent: summary.continueBlock.progressPercent,
      status: summary.continueBlock.mode === "CONTINUE_READING" ? "IN_PROGRESS" : "SUGGESTED",
      mode: summary.continueBlock.mode,
      ctaLabel: summary.continueBlock.ctaLabel || "",
    };
  }

  if (
    summary &&
    summary.currentReading &&
    summary.currentReading.contentType === "ARTICLE"
  ) {
    return summary.currentReading;
  }

  const inProgressArticles = Array.from(progressBySlug.values()).filter(
    (item) => item.status === "IN_PROGRESS",
  );

  if (inProgressArticles.length > 0) {
    return inProgressArticles.sort((a, b) => {
      return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime();
    })[0];
  }

  if (
    summary &&
    summary.lastReading &&
    summary.lastReading.contentType === "ARTICLE"
  ) {
    return summary.lastReading;
  }

  return null;
}

function decorateBibliotecaCards(progressBySlug) {
  document.querySelectorAll('a[href*="./artigos/artigo-"]').forEach((link) => {
    const slug = extractArticleSlug(link.getAttribute("href"));
    if (!slug) return;

    const progress = progressBySlug.get(slug);
    if (!progress) return;

    const card = link.closest(
      ".biblioteca-feature, .biblioteca-compact-card, .biblioteca-entry",
    );

    if (!card) return;

    card.classList.add("is-reading-progress");
    card.classList.remove("is-in-progress", "is-completed");

    if (progress.status === "COMPLETED") {
      card.classList.add("is-completed");
    } else if (progress.status === "IN_PROGRESS") {
      card.classList.add("is-in-progress");
    }

    const badge = ensureProgressBadge(card);
    badge.textContent = progress.status === "COMPLETED"
      ? "leitura conclu\u00edda"
      : "leitura em andamento";
  });
}

function ensureProgressBadge(card) {
  let badge = card.querySelector("[data-reading-badge]");

  if (badge) return badge;

  badge = document.createElement("span");
  badge.className = "biblioteca-reading-badge";
  badge.setAttribute("data-reading-badge", "true");

  const meta = card.querySelector(".biblioteca-meta, .biblioteca-entry-meta");
  if (meta) {
    meta.appendChild(badge);
    return badge;
  }

  card.insertBefore(badge, card.firstChild);
  return badge;
}

function decorateBibliotecaEditionLabels() {
  document
    .querySelectorAll('a[href*="./artigos/artigo-"]')
    .forEach((link) => {
      const slug = extractArticleSlug(link.getAttribute("href"));
      const label = getEditionLabel(slug);

      if (!label) return;

      if (link.closest(".biblioteca-topic-links, .biblioteca-popular")) {
        upsertInlineEditionLabel(link, label);
        return;
      }

      const card = link.closest(
        ".biblioteca-feature, .biblioteca-compact-card, .biblioteca-entry",
      );

      if (!card) return;

      const copy = card.querySelector(
        ".biblioteca-feature-copy, .biblioteca-entry-copy",
      ) || card;
      const title = copy.querySelector("h3");

      if (!title) return;

      let editionNode = copy.querySelector("[data-edition-label]");

      if (!editionNode) {
        editionNode = document.createElement("span");
        editionNode.className = "biblioteca-edition-index";
        editionNode.setAttribute("data-edition-label", "true");
        copy.insertBefore(editionNode, title);
      }

      editionNode.textContent = label;
    });
}

function upsertInlineEditionLabel(link, label) {
  let editionNode = link.querySelector("[data-edition-inline]");

  if (!editionNode) {
    editionNode = document.createElement("span");
    editionNode.className = "biblioteca-edition-inline";
    editionNode.setAttribute("data-edition-inline", "true");
    link.insertBefore(editionNode, link.firstChild);
  }

  editionNode.textContent = `${label} ·`;
}

function extractArticleSlug(href) {
  if (!href) return "";

  const match = href.match(/(artigo-[^.?#]+)\.html/i);
  return match ? match[1] : "";
}

function getEditionLabel(slug) {
  const index = EDITION_INDEX_BY_SLUG.get(slug);

  if (!index) {
    return "";
  }

  return `edi\u00e7\u00e3o ${String(index).padStart(2, "0")}`;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setLink(selector, href, label) {
  document.querySelectorAll(selector).forEach((node) => {
    node.setAttribute("href", href);
    if (label) {
      node.textContent = label;
    }
  });
}

function setProgressValue(bar, progress, labelNode, forcedLabel) {
  const normalized = Math.max(0, Math.min(Number.parseInt(progress || 0, 10), 100));

  if (bar) {
    const fill = bar.querySelector("span");
    if (fill) {
      fill.style.width = `${normalized}%`;
    }
  }

  if (labelNode) {
    labelNode.textContent = forcedLabel || `${normalized}%`;
  }
}

function formatCategoryName(name) {
  return (name || "leitura").toLowerCase();
}

function resolveReadingState(currentReading) {
  if (currentReading.mode === "START_NEXT_READING") {
    return currentReading.ctaLabel === "revisitar leitura" ? "COMPLETED" : "SUGGESTED";
  }

  if (currentReading.status === "COMPLETED") {
    return "COMPLETED";
  }

  return "IN_PROGRESS";
}

function setCurrentStateLabel(value) {
  const explicit = document.querySelector("[data-library-current-state]");
  if (explicit) {
    explicit.textContent = value;
    return;
  }

  const fallback = document.querySelector(".biblioteca-feature .biblioteca-progress-head span");
  if (fallback) {
    fallback.textContent = value;
  }
}

function syncCurrentFeatureState(isSuggestion, isCompleted) {
  const shell = document.querySelector("[data-library-current-shell]");
  if (!shell) return;

  shell.classList.remove("is-suggested", "is-completed");

  if (isSuggestion) {
    shell.classList.add("is-suggested");
    return;
  }

  if (isCompleted) {
    shell.classList.add("is-completed");
  }
}

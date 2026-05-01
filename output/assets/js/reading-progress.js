const READING_PROGRESS_MILESTONES = [10, 25, 50, 75, 100];

document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.PapoAuth;
  const body = document.body;

  if (!auth || !auth.hasToken()) return;

  const isArticle = body.classList.contains("app-article-page");
  const isShortEdition = body.classList.contains("short-edition-page");

  if (!isArticle && !isShortEdition) return;

  const contentType = isArticle ?"ARTICLE" : "SHORT_EDITION";
  const slug = resolveCurrentSlug(contentType);

  if (!slug) return;

  try {
    const [contents, progressList] = await Promise.all([
      loadContentList(auth, contentType),
      auth.getReadingProgress({ contentType: contentType }),
    ]);

    const content = (contents || []).find((item) => item.slug === slug);
    if (!content) return;

    const existingProgress = (progressList || []).find((item) => item.contentId === content.id);
    let highestSavedProgress = existingProgress
      ?Number.parseInt(existingProgress.progressPercent || 0, 10)
      : 0;
    let pendingRequest = Promise.resolve();

    const postProgress = (value, options) => {
      const normalized = Math.max(0, Math.min(Number.parseInt(value || 0, 10), 100));
      const forceActivity = Boolean(options && options.forceActivity);

      if (normalized <= highestSavedProgress && !forceActivity) return;

      pendingRequest = pendingRequest
        .catch(() => null)
        .then(() => auth.upsertReadingProgress({
          contentType: contentType,
          contentId: content.id,
          slug: content.slug,
          progressPercent: normalized,
          completed: normalized >= 100,
        }, options))
        .then(() => {
          highestSavedProgress = Math.max(highestSavedProgress, normalized);
        })
        .catch(() => null);
    };

    postProgress(Math.max(10, highestSavedProgress), { forceActivity: true });

    let ticking = false;

    const handleProgress = () => {
      ticking = false;
      postProgress(calculateReadingProgressPercent());
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(handleProgress);
    }, { passive: true });

    const flushProgress = () => {
      postProgress(calculateReadingProgressPercent(), { keepalive: true });
    };

    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushProgress();
      }
    });

    handleProgress();
  } catch (error) {
    return null;
  }
});

function resolveCurrentSlug(contentType) {
  const path = window.location.pathname.split("/").pop() || "";
  const filename = decodeURIComponent(path).replace(/\.html$/i, "");

  return filename;
}

function calculateViewportProgress() {
  const scrollTop = window.scrollY || window.pageYOffset || 0;
  const scrollable = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    0,
  );

  if (scrollable === 0) {
    return 100;
  }

  return Math.max(0, Math.min((scrollTop / scrollable) * 100, 100));
}

function calculateReadingProgressPercent() {
  const viewportPercent = calculateViewportProgress();

  if (viewportPercent >= 99) {
    return 100;
  }

  if (viewportPercent <= 0) {
    return 10;
  }

  const completedAwarePercent = viewportPercent >= 90 ?100 : viewportPercent;

  for (let index = READING_PROGRESS_MILESTONES.length - 1; index >= 0; index -= 1) {
    const milestone = READING_PROGRESS_MILESTONES[index];
    if (completedAwarePercent >= milestone) return milestone;
  }

  return 10;
}

async function loadContentList(auth, contentType) {
  if (contentType === "ARTICLE") {
    return auth.listArticles();
  }

  return auth.listShortEditions();
}

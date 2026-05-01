(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const body = document.body;
    const auth = window.PapoAuth;

    if (!body.classList.contains("progresso-page")) return;

    bindLogout(auth);
    bindGoalForm(auth);

    if (!auth || !auth.hasToken()) {
      redirectToLogin();
      return;
    }

    await loadProgressPage(auth);
  });

  async function loadProgressPage(auth) {
    try {
      const summary = await auth.getReadingProgressSummary();
      renderProgressSummary(summary || {});
      setPageFeedback("", "");
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
        redirectToLogin();
        return;
      }

      setPageFeedback("não conseguimos carregar esta área agora.", "is-error");
    }
  }

  function bindLogout(auth) {
    document.querySelectorAll("[data-auth-logout]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();

        if (auth) {
          auth.clearSession();
        }

        redirectToLogin();
      });
    });
  }

  function bindGoalForm(auth) {
    document.addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-progress-goal-form]");
      if (!form) return;

      event.preventDefault();

      if (!auth || !auth.hasToken()) {
        redirectToLogin();
        return;
      }

      const input = form.querySelector("[data-progress-goal-input]");
      const button = form.querySelector('button[type="submit"]');
      const weeklyTarget = Number.parseInt(input && input.value ?input.value : "", 10);

      if (!Number.isFinite(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 50) {
        setPageFeedback("defina um ritmo entre 1 e 50 leituras por semana.", "is-error");
        return;
      }

      if (button) {
        button.disabled = true;
      }

      try {
        const summary = await auth.updateReadingGoal({ weeklyTarget });
        renderProgressSummary(summary || {});
        setPageFeedback("ritmo da semana atualizado.", "is-success");
        window.setTimeout(() => setPageFeedback("", ""), 1800);
      } catch (error) {
        if (error && (error.status === 401 || error.status === 403)) {
          auth.clearSession();
          redirectToLogin();
          return;
        }

        setPageFeedback("não foi possível salvar o ritmo agora.", "is-error");
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    });
  }

  function renderProgressSummary(summary) {
    const totals = summary.totals || {};
    const currentWeek = summary.currentWeek || {};
    const streak = summary.streak || {};
    const goal = summary.goal || {};
    const feedback = summary.feedback || {};
    const completedValue = goal.completed != null ? goal.completed : currentWeek.completedReadings || 0;
    const completed = Number.parseInt(completedValue, 10);
    const weeklyTarget = Math.max(1, Number.parseInt(goal.weeklyTarget || 5, 10));
    const goalPercentValue = goal.percent != null ? goal.percent : Math.round((completed / weeklyTarget) * 100);
    const goalPercent = Math.max(0, Number.parseInt(goalPercentValue, 10));
    const streakDays = Math.max(0, Number.parseInt(streak.currentDays || 0, 10));
    const activeDays = Math.max(0, Number.parseInt(currentWeek.activeDays || 0, 10));
    const readMinutes = Math.max(0, Number.parseInt(currentWeek.readMinutes || 0, 10));

    setText("[data-progress-total-completed]", String(Number.parseInt(totals.completedReadings || 0, 10)));
    setText("[data-progress-total-minutes]", formatMinutes(Number.parseInt(totals.readMinutes || 0, 10)));
    setText("[data-progress-streak]", `${streakDays} ${streakDays === 1 ?"dia" : "dias"}`);
    setText("[data-progress-last-active]", formatLastActive(streak.lastActiveDate));
    setText("[data-progress-active-days]", `${activeDays}/7`);
    setText("[data-progress-week-completed]", `${completed} ${completed === 1 ?"leitura" : "leituras"}`);
    setText("[data-progress-goal-label]", `${completed}/${weeklyTarget} leituras`);
    setText("[data-progress-goal-percent]", `${goalPercent}%`);
    setText("[data-progress-state-copy]", buildStateCopy({
      completed,
      weeklyTarget,
      activeDays,
      readMinutes,
      streakDays,
    }));
    setText(
      "[data-progress-week-copy]",
      readMinutes > 0
        ?`${formatMinutes(readMinutes)} investidos nesta semana.`
        : "a semana ainda pode começar com uma leitura breve.",
    );
    setText("[data-progress-feedback-level]", formatFeedbackLevel(feedback.level));
    setText("[data-progress-feedback-title]", feedback.title || "progresso em atualização");
    setText(
      "[data-progress-feedback-message]",
      feedback.message || "o feedback será calculado com base no seu progresso real.",
    );
    setFeedbackState(document.querySelector("[data-progress-feedback-card]"), feedback.level);
    setGoalInputValue(weeklyTarget);

    document.querySelectorAll("[data-progress-goal-bar]").forEach((bar) => {
      bar.style.width = `${Math.min(goalPercent, 100)}%`;
    });

    renderWeekDays(currentWeek.days || []);
  }

  function renderWeekDays(days) {
    const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    const nodes = document.querySelectorAll("[data-progress-week-days] span");

    nodes.forEach((node, index) => {
      const day = days[index] || {};
      node.textContent = day.key || labels[index];
      node.classList.toggle("is-active", Boolean(day.active));
    });
  }

  function buildStateCopy(state) {
    if (state.completed >= state.weeklyTarget) {
      return `seu ritmo da semana passou do combinado com ${state.completed} leituras concluídas.`;
    }

    if (state.activeDays >= 2 || state.streakDays >= 2) {
      return `sua presença aparece em ${state.activeDays} dias da semana e ${state.streakDays} dias de continuidade.`;
    }

    return "sua rotina editorial ainda está no começo da semana.";
  }

  function formatMinutes(minutes) {
    const normalized = Math.max(0, Number.parseInt(minutes || 0, 10));

    if (normalized >= 60) {
      const hours = Math.floor(normalized / 60);
      const rest = normalized % 60;
      return rest ?`${hours}h ${rest}min` : `${hours}h`;
    }

    return `${normalized} min`;
  }

  function formatLastActive(value) {
    if (!value) return "sem leitura registrada";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "última leitura indisponível";

    const label = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);

    return `última leitura em ${label}`;
  }

  function setGoalInputValue(value) {
    document.querySelectorAll("[data-progress-goal-input]").forEach((input) => {
      input.value = String(value);
    });
  }

  function setFeedbackState(node, level) {
    if (!node) return;

    node.classList.remove("is-positive", "is-neutral", "is-attention");

    if (level === "positive") {
      node.classList.add("is-positive");
    } else if (level === "attention") {
      node.classList.add("is-attention");
    } else {
      node.classList.add("is-neutral");
    }
  }

  function formatFeedbackLevel(level) {
    if (level === "positive") return "bom progresso";
    if (level === "attention") return "atenção";
    return "continuidade";
  }

  function setPageFeedback(message, type) {
    const node = document.querySelector("[data-progress-page-feedback]");
    if (!node) return;

    node.textContent = message;
    node.classList.remove("is-error", "is-success");

    if (type) {
      node.classList.add(type);
    }
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function redirectToLogin() {
    window.location.replace("../auth/login.html");
  }
})();

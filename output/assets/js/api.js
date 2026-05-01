(function () {
  const API_BASE_URL = "http://127.0.0.1:3001/api/v1";
  const SESSION_STORAGE_KEY = "papo_lideranca_session";

  function safeParse(value) {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function readSession() {
    try {
      return safeParse(window.localStorage.getItem(SESSION_STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writeSession(session) {
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      return null;
    }

    return session;
  }

  function resolveRequestToken(config) {
    if (config && Object.prototype.hasOwnProperty.call(config, "token")) {
      return config.token || "";
    }

    if (config && config.auth === false) return "";

    return readSession().accessToken || "";
  }

  function handleUnauthorized(config) {
    if (config && config.auth === false) return;

    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      return;
    }
  }

  async function request(path, options) {
    const config = options || {};
    const token = resolveRequestToken(config);
    const headers = Object.assign(
      {
        Accept: "application/json",
      },
      config.body ?{ "Content-Type": "application/json" } : {},
      config.headers || {},
    );

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const response = await window.fetch(API_BASE_URL + path, {
      method: config.method || "GET",
      headers,
      body: config.body ?JSON.stringify(config.body) : undefined,
      keepalive: Boolean(config.keepalive),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ?await response.json().catch(function () {
          return null;
        })
      : await response.text().catch(function () {
          return "";
        });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(config);
      }

      const error = new Error(
        (payload && payload.message) || "Não foi possível concluir a solicitação.",
      );

      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function requestFormData(path, options) {
    const config = options || {};
    const token = resolveRequestToken(config);
    const headers = Object.assign(
      {
        Accept: "application/json",
      },
      config.headers || {},
    );

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const response = await window.fetch(API_BASE_URL + path, {
      method: config.method || "POST",
      headers,
      body: config.body,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ?await response.json().catch(function () {
          return null;
        })
      : await response.text().catch(function () {
          return "";
        });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(config);
      }

      const error = new Error(
        (payload && payload.message) || "Não foi possível concluir a solicitação.",
      );

      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function deriveNameFromEmail(email) {
    const prefix = String(email || "").split("@")[0] || "assinante";
    return prefix
      .split(/[._-]+/)
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(" ") || "assinante";
  }

  function getUserDisplayName(user) {
    const name = user && typeof user.name === "string" ?user.name.trim() : "";
    return name || deriveNameFromEmail(user && user.email);
  }

  function getUserFirstName(user) {
    const displayName = getUserDisplayName(user);
    return displayName.split(/\s+/).filter(Boolean)[0] || "assinante";
  }

  function resolveAssetUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.charAt(0) === "/") return API_BASE_URL.replace(/\/api\/v1$/, "") + url;
    return url;
  }

  const PapoAuth = {
    API_BASE_URL: API_BASE_URL,
    getSession: function () {
      return readSession();
    },
    getToken: function () {
      return readSession().accessToken || "";
    },
    getStoredUser: function () {
      return readSession().user || null;
    },
    hasToken: function () {
      return Boolean(this.getToken());
    },
    saveSession: function (session) {
      const current = readSession();

      return writeSession({
        accessToken: session.accessToken || current.accessToken || "",
        user: session.user || current.user || null,
      });
    },
    updateStoredUser: function (user) {
      const current = readSession();

      return writeSession({
        accessToken: current.accessToken || "",
        user: user || null,
      });
    },
    clearSession: function () {
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        return null;
      }

      return null;
    },
    login: async function (credentials) {
      const result = await request("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: credentials.email,
          password: credentials.password,
        },
      });

      this.saveSession({
        accessToken: result.accessToken,
        user: result.user || null,
      });

      return result;
    },
    createAccess: async function (payload) {
      return request("/auth/create-access", {
        method: "POST",
        auth: false,
        body: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          confirmPassword: payload.confirmPassword,
        },
      });
    },
    forgotPassword: async function (payload) {
      return request("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: {
          email: payload.email,
        },
      });
    },
    resetPassword: async function (payload) {
      return request("/auth/reset-password", {
        method: "POST",
        auth: false,
        body: {
          token: payload.token,
          password: payload.password,
          confirmPassword: payload.confirmPassword,
        },
      });
    },
    getReadingProgress: async function (filters) {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      const params = new URLSearchParams();
      const query = filters || {};

      if (query.contentType) {
        params.set("contentType", query.contentType);
      }

      if (query.status) {
        params.set("status", query.status);
      }

      return request(`/reading-progress${params.toString() ?`?${params.toString()}` : ""}`, {
        token: token,
      });
    },
    getReadingProgressSummary: async function () {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      return request("/reading-progress/summary", {
        token: token,
      });
    },
    updateReadingGoal: async function (payload) {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      return request("/reading-progress/goal", {
        method: "PATCH",
        token: token,
        body: {
          weeklyTarget: payload.weeklyTarget,
        },
      });
    },
    upsertReadingProgress: async function (payload, options) {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      return request("/reading-progress", {
        method: "POST",
        token: token,
        keepalive: Boolean(options && options.keepalive),
        body: {
          contentType: payload.contentType || payload.itemType,
          itemType: payload.itemType || payload.contentType,
          contentId: payload.contentId,
          slug: payload.slug,
          progressPercent: payload.progressPercent,
          completed: Boolean(payload.completed),
        },
      });
    },
    listArticles: async function () {
      return request("/articles");
    },
    getArticle: async function (slug) {
      return request("/articles/" + encodeURIComponent(slug));
    },
    listCategories: async function () {
      return request("/categories");
    },
    listShortEditions: async function () {
      return request("/short-editions");
    },
    getShortEdition: async function (slug) {
      return request("/short-editions/" + encodeURIComponent(slug));
    },
    getAccountSummary: async function () {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      let summary;

      try {
        summary = await request("/users/account-summary", {
          token: token,
        });
      } catch (error) {
        if (!error || error.status !== 404) {
          throw error;
        }

        const user = await request("/users/me", {
          token: token,
        });

        summary = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            role: user.role,
            isActive: user.isActive !== false,
            hasCompletedAccess: Boolean(user.hasCompletedAccess),
            lastLoginAt: user.lastLoginAt || null,
          },
          subscription: {
            plan: user.subscription && user.subscription.plan ?user.subscription.plan : "FREE",
            status: user.subscription && user.subscription.status ?user.subscription.status : "CANCELED",
            label: user.subscription && user.subscription.plan === "PREMIUM"
              ?"plano premium"
              : "plano free",
            description: user.subscription && user.subscription.status === "ACTIVE" && user.subscription.plan === "PREMIUM"
              ?"acesso completo ao acervo"
              : user.subscription && user.subscription.status === "ACTIVE"
              ?"acesso ao núcleo editorial disponível"
                : user.subscription && user.subscription.status === "PAUSED"
                  ?"assinatura pausada no momento"
                  : "assinatura indisponível no momento",
          },
        };
      }

      if (summary && summary.user) {
        this.updateStoredUser(summary.user);
      }

      return summary;
    },
    getCurrentUser: async function () {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      const user = await request("/users/me", {
        token: token,
      });

      this.updateStoredUser(user);
      return user;
    },
    updateCurrentUser: async function (payload) {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      const user = await request("/users/me", {
        method: "PATCH",
        token: token,
        body: payload,
      });

      this.updateStoredUser(user);
      return user;
    },
    uploadAvatar: async function (file) {
      const token = this.getToken();

      if (!token) {
        const error = new Error("Sessao ausente.");
        error.status = 401;
        throw error;
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const user = await requestFormData("/users/me/avatar", {
        method: "PATCH",
        token: token,
        body: formData,
      });

      this.updateStoredUser(user);
      return user;
    },
    getUserDisplayName: getUserDisplayName,
    getUserFirstName: getUserFirstName,
    deriveNameFromEmail: deriveNameFromEmail,
    resolveAssetUrl: resolveAssetUrl,
    apiFetch: request,
  };

  const STATIC_ARTICLE_ROUTES = {
    "artigo-agenda-cheia-nao-e-sinal-de-direcao": "./artigos/artigo-agenda-cheia-nao-e-sinal-de-direcao.html",
    "artigo-alinhamento-real-nasce-de-expectativa-clara": "./artigos/artigo-alinhamento-real-nasce-de-expectativa-clara.html",
    "artigo-autoconsciencia-que-melhora-decisao": "./artigos/artigo-autoconsciencia-que-melhora-decisao.html",
    "artigo-autoridade-sem-dureza": "./artigos/artigo-autoridade-sem-dureza.html",
    "artigo-carreira-antes-da-promocao": "./artigos/artigo-carreira-antes-da-promocao.html",
    "artigo-carreira-boa-pede-leitura-de-contexto": "./artigos/artigo-carreira-boa-pede-leitura-de-contexto.html",
    "artigo-clareza-interna-antes-da-conversa-dificil": "./artigos/artigo-clareza-interna-antes-da-conversa-dificil.html",
    "artigo-confianca-de-equipe-se-constroi-na-previsibilidade": "./artigos/artigo-confianca-de-equipe-se-constroi-na-previsibilidade.html",
    "artigo-consistencia-vale-mais-que-picos-de-performance": "./artigos/artigo-consistencia-vale-mais-que-picos-de-performance.html",
    "artigo-corrigir-rota-sem-humilhar-ninguem": "./artigos/artigo-corrigir-rota-sem-humilhar-ninguem.html",
    "artigo-crescer-sem-parecer-sempre-disponivel": "./artigos/artigo-crescer-sem-parecer-sempre-disponivel.html",
    "artigo-custo-de-tentar-provar-valor-o-tempo-todo": "./artigos/artigo-custo-de-tentar-provar-valor-o-tempo-todo.html",
    "artigo-custo-invisivel-da-atencao-fragmentada": "./artigos/artigo-custo-invisivel-da-atencao-fragmentada.html",
    "artigo-delegar-sem-desaparecer-da-responsabilidade": "./artigos/artigo-delegar-sem-desaparecer-da-responsabilidade.html",
    "artigo-diferenca-entre-confianca-e-rigidez-interna": "./artigos/artigo-diferenca-entre-confianca-e-rigidez-interna.html",
    "artigo-disciplina-emocional-sob-pressao": "./artigos/artigo-disciplina-emocional-sob-pressao.html",
    "artigo-disciplina-mental-para-nao-decidir-no-reflexo": "./artigos/artigo-disciplina-mental-para-nao-decidir-no-reflexo.html",
    "artigo-equipes-maduras-precisam-de-contexto-melhor": "./artigos/artigo-equipes-maduras-precisam-de-contexto-melhor.html",
    "artigo-erro-de-revisar-tudo-no-detalhe": "./artigos/artigo-erro-de-revisar-tudo-no-detalhe.html",
    "artigo-feedback-que-desenvolve": "./artigos/artigo-feedback-que-desenvolve.html",
    "artigo-foco-estrategico-tambem-e-uma-decisao-de-agenda": "./artigos/artigo-foco-estrategico-tambem-e-uma-decisao-de-agenda.html",
    "artigo-gestao-boa-protege-autonomia-com-criterio": "./artigos/artigo-gestao-boa-protege-autonomia-com-criterio.html",
    "artigo-lider-precisa-de-blocos-sem-resposta-imediata": "./artigos/artigo-lider-precisa-de-blocos-sem-resposta-imediata.html",
    "artigo-liderar-sem-microgerenciar": "./artigos/artigo-liderar-sem-microgerenciar.html",
    "artigo-maturidade-profissional-aparece-antes-do-cargo": "./artigos/artigo-maturidade-profissional-aparece-antes-do-cargo.html",
    "artigo-menos-defesa-mais-discernimento": "./artigos/artigo-menos-defesa-mais-discernimento.html",
    "artigo-mentalidade-que-gera-influencia": "./artigos/artigo-mentalidade-que-gera-influencia.html",
    "artigo-o-que-cortar-antes-de-tentar-fazer-mais": "./artigos/artigo-o-que-cortar-antes-de-tentar-fazer-mais.html",
    "artigo-o-que-faz-alguem-parecer-pronto-para-o-proximo-nivel": "./artigos/artigo-o-que-faz-alguem-parecer-pronto-para-o-proximo-nivel.html",
    "artigo-parar-de-trabalhar-no-modo-interrupcao": "./artigos/artigo-parar-de-trabalhar-no-modo-interrupcao.html",
    "artigo-presenca-madura-nao-precisa-disputar-atencao": "./artigos/artigo-presenca-madura-nao-precisa-disputar-atencao.html",
    "artigo-prioridade-boa-reduz-mais-ruido-do-que-tarefa": "./artigos/artigo-prioridade-boa-reduz-mais-ruido-do-que-tarefa.html",
    "artigo-produtividade-do-lider": "./artigos/artigo-produtividade-do-lider.html",
    "artigo-produtividade-melhor-comeca-no-filtro": "./artigos/artigo-produtividade-melhor-comeca-no-filtro.html",
    "artigo-proteger-energia-para-o-que-realmente-importa": "./artigos/artigo-proteger-energia-para-o-que-realmente-importa.html",
    "artigo-proteger-tempo-de-pensamento-estrategico": "./artigos/artigo-proteger-tempo-de-pensamento-estrategico.html",
    "artigo-quando-a-ansiedade-comeca-a-dirigir-sua-leitura": "./artigos/artigo-quando-a-ansiedade-comeca-a-dirigir-sua-leitura.html",
    "artigo-quando-a-equipe-depende-demais-do-lider": "./artigos/artigo-quando-a-equipe-depende-demais-do-lider.html",
    "artigo-quando-a-lideranca-para-de-centralizar-tudo": "./artigos/artigo-quando-a-lideranca-para-de-centralizar-tudo.html",
    "artigo-quando-dizer-sim-enfraquece-sua-trajetoria": "./artigos/artigo-quando-dizer-sim-enfraquece-sua-trajetoria.html",
    "artigo-reduzir-retrabalho-sem-aumentar-controle": "./artigos/artigo-reduzir-retrabalho-sem-aumentar-controle.html",
    "artigo-relevancia-sem-autopromocao": "./artigos/artigo-relevancia-sem-autopromocao.html",
    "artigo-repertorio-emocional-para-nao-contaminar-o-time": "./artigos/artigo-repertorio-emocional-para-nao-contaminar-o-time.html",
    "artigo-reputacao-profissional-se-constroi-no-detalhe": "./artigos/artigo-reputacao-profissional-se-constroi-no-detalhe.html",
    "artigo-reunioes-demais-empobrecem-a-semana": "./artigos/artigo-reunioes-demais-empobrecem-a-semana.html",
    "artigo-risco-de-pensar-so-a-partir-da-urgencia": "./artigos/artigo-risco-de-pensar-so-a-partir-da-urgencia.html",
    "artigo-rituais-simples-para-alinhamento": "./artigos/artigo-rituais-simples-para-alinhamento.html",
    "artigo-ser-lembrado-pelo-criterio-nao-pelo-ruido": "./artigos/artigo-ser-lembrado-pelo-criterio-nao-pelo-ruido.html",
    "artigo-sustentar-criterio-quando-o-ambiente-acelera": "./artigos/artigo-sustentar-criterio-quando-o-ambiente-acelera.html",
    "artigo-visibilidade-madura-sem-performar-palco": "./artigos/artigo-visibilidade-madura-sem-performar-palco.html",
  };

  const STATIC_SHORT_EDITION_ROUTES = {
    "clareza-antes-da-reacao": "./edicoes/clareza-antes-da-reacao.html",
    "crescimento-sem-virar-urgencia-cronica": "./edicoes/crescimento-sem-virar-urgencia-cronica.html",
    "o-que-sustenta-um-time-quando-o-cenario-oscila": "./edicoes/o-que-sustenta-um-time-quando-o-cenario-oscila.html",
    "proteger-tempo-de-pensamento-estrategico": "./edicoes/proteger-tempo-de-pensamento-estrategico.html",
    "repertorio-melhor-decisoes-melhores": "./edicoes/repertorio-melhor-decisoes-melhores.html",
    "rituais-simples-para-alinhamento": "./edicoes/rituais-simples-para-alinhamento.html",
  };

  function normalizeReadingType(type) {
    const value = String(type || "").toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");

    if (value === "article") return "article";
    if (
      value === "short-edition" ||
      value === "shortedition" ||
      value === "short-editions" ||
      value === "edition"
    ) {
      return "short-edition";
    }

    return value || "article";
  }

  function buildReadingUrl(item) {
    const content = item && item.content ?item.content : {};
    const type = normalizeReadingType(
      (item && (item.type || item.contentType)) || content.type || content.contentType,
    );
    const slug = item && item.slug ?String(item.slug) : String(content.slug || "");
    const id = item && item.id ?String(item.id) : String((item && item.contentId) || content.id || "");

    const staticPath =
      (item && (item.staticPath || item.staticUrl)) ||
      content.staticPath ||
      content.staticUrl ||
      "";

    if (type === "article" && slug && STATIC_ARTICLE_ROUTES[slug]) {
      return STATIC_ARTICLE_ROUTES[slug];
    }

    if (type === "short-edition" && slug && STATIC_SHORT_EDITION_ROUTES[slug]) {
      return STATIC_SHORT_EDITION_ROUTES[slug];
    }

    if (staticPath) {
      return staticPath;
    }

    const params = new URLSearchParams({ type });

    if (slug) params.set("slug", slug);
    else if (id) params.set("id", id);

    return `./leitura.html?${params.toString()}`;
  }

  window.PapoAuth = PapoAuth;
  window.PapoApi = {
    API_BASE_URL,
    apiFetch: request,
    apiFetchFormData: requestFormData,
  };
  window.PapoReadingRoutes = {
    STATIC_ARTICLE_ROUTES,
    STATIC_SHORT_EDITION_ROUTES,
    buildReadingUrl,
    normalizeReadingType,
  };
})();

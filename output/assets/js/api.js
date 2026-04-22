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

  async function request(path, options) {
    const config = options || {};
    const headers = Object.assign(
      {
        Accept: "application/json",
      },
      config.body ? { "Content-Type": "application/json" } : {},
      config.headers || {},
    );

    if (config.token) {
      headers.Authorization = "Bearer " + config.token;
    }

    const response = await window.fetch(API_BASE_URL + path, {
      method: config.method || "GET",
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(function () {
          return null;
        })
      : await response.text().catch(function () {
          return "";
        });

    if (!response.ok) {
      const error = new Error(
        (payload && payload.message) || "Nao foi possivel concluir a solicitacao.",
      );

      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
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
        body: {
          email: payload.email,
          password: payload.password,
          confirmPassword: payload.confirmPassword,
        },
      });
    },
    forgotPassword: async function (payload) {
      return request("/auth/forgot-password", {
        method: "POST",
        body: {
          email: payload.email,
        },
      });
    },
    resetPassword: async function (payload) {
      return request("/auth/reset-password", {
        method: "POST",
        body: {
          token: payload.token,
          password: payload.password,
          confirmPassword: payload.confirmPassword,
        },
      });
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
  };

  window.PapoAuth = PapoAuth;
})();

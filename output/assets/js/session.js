(function () {
  const auth = window.PapoAuth;

  function getToken() {
    return auth && auth.getToken ?auth.getToken() : "";
  }

  function setToken(accessToken, user) {
    if (!auth || !auth.saveSession) return null;

    return auth.saveSession({
      accessToken,
      user: user || null,
    });
  }

  function clearSession() {
    if (auth && auth.clearSession) {
      return auth.clearSession();
    }

    return null;
  }

  function getCurrentUser() {
    if (auth && auth.getCurrentUser) {
      return auth.getCurrentUser();
    }

    return Promise.reject(new Error("Sessão indisponível."));
  }

  function requireAuth(loginPath) {
    if (getToken()) return true;

    window.location.replace(loginPath || "../auth/login.html");
    return false;
  }

  function logout(loginPath) {
    clearSession();
    window.location.replace(loginPath || "../auth/login.html");
  }

  function getFirstName(user) {
    if (auth && auth.getUserFirstName) {
      return auth.getUserFirstName(user);
    }

    const name = user && typeof user.name === "string" ?user.name.trim() : "";

    if (name) {
      return name.split(/\s+/).filter(Boolean)[0] || "assinante";
    }

    const email = user && typeof user.email === "string" ?user.email : "";
    return email.split("@")[0] || "assinante";
  }

  window.PapoSession = {
    getToken,
    setToken,
    clearSession,
    getCurrentUser,
    requireAuth,
    logout,
    getFirstName,
  };
})();

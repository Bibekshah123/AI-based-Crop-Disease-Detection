import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  // Validate an existing token on load.
  useEffect(() => {
    let active = true;
    // No token → nothing to validate. `loading` already starts false in this
    // case (initialized from the stored token), so no state update is needed.
    if (!token) return;
    api
      .me()
      .then((data) => active && setUser(data))
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setUser({ username: data.username, email: data.email });
    return data;
  }, []);

  const signup = useCallback(async (username, email, password) => {
    return api.signup(username, email, password);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

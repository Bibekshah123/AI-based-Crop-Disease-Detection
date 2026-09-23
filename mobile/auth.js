/* Optional accounts for the mobile client.
   The token lives in expo-secure-store (Android Keystore) rather than plain
   storage, because it is a bearer credential: anything holding it can read that
   user's history. Diagnosis never requires a token — signing in only adds
   history that follows the farmer to another phone. */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin, signup as apiSignup, me as apiMe } from "./api";

const KEY = "cropsense.token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore a previous session on launch, and drop the token if the server no
  // longer accepts it (expired, or the account is gone).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY);
        if (!saved) return;
        const profile = await apiMe(saved);
        if (!active) return;
        setToken(saved);
        setUser(profile);
      } catch {
        await SecureStore.deleteItemAsync(KEY).catch(() => {});
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username.trim(), password);
    await SecureStore.setItemAsync(KEY, data.access_token);
    setToken(data.access_token);
    setUser({ username: data.username, email: data.email });
    return data;
  }, []);

  const signup = useCallback(
    (username, email, password) => apiSignup(username.trim(), email.trim(), password),
    []
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

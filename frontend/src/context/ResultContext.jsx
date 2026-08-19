import { createContext, useContext, useState, useCallback } from "react";

/* Carries the most recent prediction from Diagnose to the Result page.
   Also mirrored to sessionStorage so a refresh of /result still shows data
   (the image is a downscaled data URL, kept small). */
const KEY = "cropsense.lastResult";
const ResultContext = createContext(null);

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ResultProvider({ children }) {
  const [result, setResult] = useState(loadFromSession);

  const publish = useCallback((payload) => {
    setResult(payload);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota — in-memory copy still works this session */
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ResultContext.Provider value={{ result, publish, clear }}>
      {children}
    </ResultContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within ResultProvider");
  return ctx;
}

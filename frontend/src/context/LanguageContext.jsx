/* Language selection, persisted per browser. English is the default; the
   toggle in the header switches to Nepali. Disease content comes from the
   API's *_np fields (see normalize.js); UI chrome comes from lib/strings.js. */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "../lib/strings";

const KEY = "cropsense.lang";
const LanguageContext = createContext(null);

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "np" || v === "en" ? v : "en";
  } catch {
    return "en"; // private mode / storage blocked
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore quota / private mode */
    }
    document.documentElement.lang = lang === "np" ? "ne" : "en";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggle: () => setLang((l) => (l === "en" ? "np" : "en")),
      t: STRINGS[lang] ?? STRINGS.en,
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

import { useLang } from "../context/LanguageContext";
import a from "../pages/auth.module.css";

/* The only control on the sign-in screens besides the form itself. */
export default function LangToggle() {
  const { lang, toggle, t } = useLang();
  return (
    <button
      type="button"
      className={a.langBtn}
      onClick={toggle}
      aria-label={lang === "en" ? t.switchToNepali : t.switchToEnglish}
      title={lang === "en" ? t.switchToNepali : t.switchToEnglish}
    >
      {lang === "en" ? "ने" : "EN"}
    </button>
  );
}

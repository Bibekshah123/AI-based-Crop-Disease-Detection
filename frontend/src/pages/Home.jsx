import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import s from "./pages.module.css";

export default function Home() {
  const { t } = useLang();
  const STEPS = [t.step1, t.step2, t.step3];
  return (
    <>
      <section className={s.hero}>
        <div className="container">
          <h1 className={s.heroTitle}>{t.homeTitle}</h1>
          <p className={s.heroText}>{t.homeLead}</p>
          <div className={s.heroActions}>
            <Link to="/diagnose" className="btn btn-primary">{t.checkALeaf}</Link>
            <Link to="/library" className="btn btn-secondary">{t.browseLibrary}</Link>
          </div>
        </div>
      </section>

      <section className={s.stepsSection}>
        <div className="container">
          <h2 className={s.stepsTitle}>{t.howItWorks}</h2>
          <ol className={s.steps}>
            {STEPS.map((text, i) => (
              <li key={i} className={s.step}>
                <span className={s.stepNum} aria-hidden="true">{i + 1}</span>
                <p className={s.stepText}>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

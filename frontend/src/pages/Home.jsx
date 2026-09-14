import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { CROPS, cropLabel } from "../lib/crops";
import hm from "./Home.module.css";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export default function Home() {
  const { t, lang } = useLang();

  const steps = [t.step1, t.step2, t.step3];

  return (
    <>
      <section className={hm.hero}>
        <div className={`container ${hm.heroInner}`}>
          <h1 className={hm.title}>{t.homeTitle}</h1>
          <p className={hm.lead}>{t.homeLead}</p>
          <Link to="/diagnose" className={`btn btn-primary ${hm.cta}`}>
            <CameraIcon />
            {t.checkALeaf}
          </Link>
          <Link to="/library" className={hm.secondaryLink}>{t.browseLibrary}</Link>
        </div>
      </section>

      <section className={hm.section}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.howItWorks}</h2>
          <ol className={hm.steps}>
            {steps.map((title, i) => (
              <li key={i} className={hm.step}>
                <span className={hm.stepNum} aria-hidden="true">{i + 1}</span>
                <span className={hm.stepTitle}>{title}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${hm.section} ${hm.sectionAlt}`}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.cropsCovered}</h2>
          <ul className={hm.crops}>
            {CROPS.map((c) => (
              <li key={c.id} className={hm.cropChip}>{cropLabel(c, lang)}</li>
            ))}
          </ul>
          <p className={hm.note}>
            {t.cropsCoveredNote} <Link to="/about">{t.readMore}</Link>
          </p>
        </div>
      </section>
    </>
  );
}

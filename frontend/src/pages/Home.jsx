import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { CROPS, cropLabel } from "../lib/crops";
import heroImage from "../assets/nepal-farming.webp";
import hm from "./Home.module.css";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <section className={hm.hero} style={{ "--hero-image": `url(${heroImage})` }}>
        <div className="container">
          <div className={hm.heroCopy}>
            <h1 className={hm.title}>{t.homeTitle}</h1>
            <p className={hm.lead}>{t.homeLead}</p>
            <div className={hm.heroActions}>
              <Link to="/diagnose" className={`btn btn-primary ${hm.cta}`}>
                <CameraIcon /> {t.checkALeaf}
              </Link>
              <Link to="/library" className={hm.libraryLink}>{t.browseLibrary} →</Link>
            </div>
          </div>
        </div>
        <a
          className={hm.credit}
          href="https://commons.wikimedia.org/wiki/File:Farming_in_Nepal.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Photo: Adman Payne, CC BY-SA 4.0
        </a>
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

import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { CROPS, cropLabel } from "../lib/crops";
import HeroArt from "../components/HeroArt";
import s from "./pages.module.css";
import hm from "./Home.module.css";

const CONDITION_COUNT = 51;

export default function Home() {
  const { t, lang } = useLang();

  const steps = [
    { title: t.step1, body: t.step1Desc },
    { title: t.step2, body: t.step2Desc },
    { title: t.step3, body: t.step3Desc },
  ];

  const outputs = [
    { title: t.getMatchTitle, body: t.getMatchBody },
    { title: t.getVisualTitle, body: t.getVisualBody },
    { title: t.getGuidanceTitle, body: t.getGuidanceBody },
    { title: t.getTreatmentTitle, body: t.getTreatmentBody },
  ];

  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <section className={s.hero}>
        <div className={`container ${hm.heroGrid}`}>
          <div className={hm.heroCopy}>
            <p className={hm.eyebrow}>{t.heroBadge}</p>
            <h1 className={s.heroTitle}>{t.homeTitle}</h1>
            <p className={s.heroText}>{t.homeLead}</p>
            <div className={hm.heroActions}>
              <Link to="/diagnose" className="btn btn-primary">{t.checkALeaf}</Link>
              <Link to="/library" className="btn btn-secondary">{t.browseLibrary}</Link>
            </div>

            <dl className={hm.stats}>
              <div className={hm.stat}>
                <dt className={hm.statValue}>{CROPS.length}</dt>
                <dd className={hm.statLabel}>{t.statCrops}</dd>
              </div>
              <div className={hm.stat}>
                <dt className={hm.statValue}>{CONDITION_COUNT}</dt>
                <dd className={hm.statLabel}>{t.statConditions}</dd>
              </div>
              <div className={hm.stat}>
                <dt className={hm.statValue}>2</dt>
                <dd className={hm.statLabel}>{t.statLanguages}</dd>
              </div>
            </dl>
          </div>

          <div className={hm.heroArt}>
            <HeroArt />
          </div>
        </div>
      </section>

      {/* How it works ---------------------------------------------------- */}
      <section className={hm.section}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.howItWorks}</h2>
          <ol className={hm.steps}>
            {steps.map((step, i) => (
              <li key={i} className={hm.step}>
                <span className={hm.stepNum} aria-hidden="true">{i + 1}</span>
                <h3 className={hm.stepTitle}>{step.title}</h3>
                <p className={hm.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you get back ----------------------------------------------- */}
      <section className={`${hm.section} ${hm.sectionAlt}`}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.whatYouGet}</h2>
          <ul className={hm.outputs}>
            {outputs.map((o, i) => (
              <li key={i} className={hm.output}>
                <h3 className={hm.outputTitle}>{o.title}</h3>
                <p className={hm.outputBody}>{o.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Crops covered + honesty note ------------------------------------ */}
      <section className={hm.section}>
        <div className={`container ${hm.closing}`}>
          <div>
            <h2 className={hm.sectionTitle}>{t.cropsCovered}</h2>
            <ul className={hm.crops}>
              {CROPS.map((c) => (
                <li key={c.id} className={hm.cropChip}>{cropLabel(c, lang)}</li>
              ))}
            </ul>
            <p className={hm.note}>{t.cropsCoveredNote}</p>
          </div>

          <aside className={hm.honest}>
            <h2 className={hm.honestTitle}>{t.honestTitle}</h2>
            <p className={hm.honestBody}>{t.honestBody}</p>
            <Link to="/about" className={hm.honestLink}>{t.readMore} →</Link>
          </aside>
        </div>
      </section>
    </>
  );
}

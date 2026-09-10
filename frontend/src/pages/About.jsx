import { useLang } from "../context/LanguageContext";
import { CROPS, cropLabel } from "../lib/crops";
import s from "./pages.module.css";
import a from "./About.module.css";

export default function About() {
  const { t, lang } = useLang();

  const steps = [t.aboutHowStep1, t.aboutHowStep2, t.aboutHowStep3, t.aboutHowStep4, t.aboutHowStep5];
  const bands = [
    { key: "high", tone: a.bandHigh, text: t.aboutConfHigh },
    { key: "moderate", tone: a.bandModerate, text: t.aboutConfModerate },
    { key: "uncertain", tone: a.bandUncertain, text: t.aboutConfUncertain },
  ];

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <div className={s.head}>
        <h1 className={s.title}>{t.aboutTitle}</h1>
        <p className={s.lead}>{t.aboutLead}</p>
      </div>

      <div className={a.stack}>
        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.whatItDoes}</h2>
          <p className={a.body}>{t.aboutWhatBody}</p>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutHow}</h2>
          <ol className={a.steps}>
            {steps.map((step, i) => (
              <li key={i} className={a.step}>
                <span className={a.stepNum} aria-hidden="true">{i + 1}</span>
                <span className={a.body}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutCoverage}</h2>
          <p className={a.body}>{t.aboutCoverageBody}</p>
          <ul className={a.crops}>
            {CROPS.map((c) => (
              <li key={c.id} className={a.cropChip}>{cropLabel(c, lang)}</li>
            ))}
          </ul>
          <p className={a.bodyMuted}>{t.aboutCoverageNote}</p>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutConfidence}</h2>
          <ul className={a.bands}>
            {bands.map((b) => (
              <li key={b.key} className={a.band}>
                <span className={`${a.bandDot} ${b.tone}`} aria-hidden="true" />
                <span className={a.body}>{b.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutUnsure}</h2>
          <p className={a.body}>{t.aboutUnsureBody}</p>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutPrivacy}</h2>
          <p className={a.body}>{t.aboutPrivacyBody}</p>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.limitations}</h2>
          <p className={a.body}>{t.aboutLimitationsBody}</p>
        </section>

        <section className={`surface ${a.panel} ${a.panelWarn}`}>
          <h2 className={a.h2}>{t.disclaimer}</h2>
          <p className={a.body}>{t.aboutDisclaimerBody}</p>
        </section>

        <section className={`surface ${a.panel}`}>
          <h2 className={a.h2}>{t.aboutProject}</h2>
          <p className={a.body}>{t.aboutProjectBody}</p>
        </section>
      </div>
    </div>
  );
}

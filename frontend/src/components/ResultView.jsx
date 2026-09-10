import { useState } from "react";
import { StatusBadge, ConfidenceMeter } from "./ui";
import { Status } from "../lib/normalize";
import { Feedback, getFeedback, setFeedback } from "../lib/feedback";
import { useLang } from "../context/LanguageContext";
import { cropName } from "../lib/crops";
import TreatmentCard from "./TreatmentCard";
import styles from "./ResultView.module.css";

export default function ResultView({ data, image, feedbackId, onCheckAnother }) {
  const { t, lang } = useLang();
  const uncertain = data.status === Status.UNCERTAIN;

  const sections = [
    { key: "symptoms", label: t.secSymptoms, value: data.symptoms },
    { key: "cause", label: t.secCause, value: data.cause },
    { key: "treatment", label: t.secTreatment, value: data.treatment },
    { key: "prevention", label: t.secPrevention, value: data.prevention },
  ].filter((s) => s.value);

  return (
    <div className={styles.result}>
      {/* Header ---------------------------------------------------------- */}
      <section className={`surface ${styles.header}`} aria-labelledby="result-heading">
        <div className={styles.headTop}>
          {data.cropType && <span className={styles.crop}>{cropName(data.cropType, lang)}</span>}
          <StatusBadge tone={data.tone}>{data.statusLabel}</StatusBadge>
        </div>
        <p className={styles.kicker}>{t.possibleMatch}</p>
        <h1 id="result-heading" className={styles.disease}>{data.disease}</h1>
        <ConfidenceMeter value={data.confidence} tone={data.tone} label={data.statusLabel} />
      </section>

      {/* Uncertainty guidance ------------------------------------------- */}
      {uncertain && (
        <div className={`note note-warning ${styles.uncertain}`} role="status">
          <div>
            <strong>{t.uncertainTitle}</strong>
            <p className={styles.uncertainText}>
              {data.message || t.notConfident} {t.uncertainBody}
            </p>
          </div>
        </div>
      )}

      {data.description && !uncertain && (
        <p className={styles.description}>{data.description}</p>
      )}

      {/* Image + Grad-CAM comparison ------------------------------------ */}
      <section className={`surface ${styles.visual}`} aria-labelledby="visual-heading">
        <h2 id="visual-heading" className={styles.sectionTitle}>{t.visualExplanation}</h2>
        <div className={styles.compare}>
          {image && (
            <figure className={styles.figure}>
              <img src={image} alt={t.yourPhotoAlt} className={styles.figImg} />
              <figcaption className={styles.figCap}>{t.yourPhoto}</figcaption>
            </figure>
          )}
          {data.gradcam && (
            <figure className={styles.figure}>
              <img src={data.gradcam} alt={t.heatmapAlt} className={styles.figImg} />
              <figcaption className={styles.figCap}>{t.modelAttention}</figcaption>
            </figure>
          )}
        </div>
        {data.gradcam && <p className={styles.gradcamNote}>{t.gradcamNote}</p>}
      </section>

      {/* Recommended treatment ------------------------------------------ */}
      {!uncertain && (
        <TreatmentCard
          treatments={data.treatments}
          disclaimer={data.treatmentDisclaimer}
          styles={styles}
        />
      )}

      {/* Guidance sections ---------------------------------------------- */}
      {sections.length > 0 && (
        <section className={styles.guidance} aria-label={t.guidance}>
          {uncertain && (
            <p className={styles.refNote}>
              {t.refNote}
            </p>
          )}
          <div className={styles.guidanceGrid}>
            {sections.map((s) => (
              <article key={s.key} className={`surface ${styles.card}`}>
                <h3 className={styles.cardTitle}>{s.label}</h3>
                <p className={styles.cardText}>{s.value}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Alternatives --------------------------------------------------- */}
      {data.alternatives.length > 0 && (
        <section className={`surface ${styles.alts}`} aria-labelledby="alts-heading">
          <h2 id="alts-heading" className={styles.sectionTitle}>{t.otherPossibilities}</h2>
          <ul className={styles.altList}>
            {data.alternatives.map((a, i) => (
              <li key={i} className={styles.altRow}>
                <span className={styles.altName}>{a.disease}</span>
                <span className={styles.altBar} aria-hidden="true">
                  <span className={styles.altFill} style={{ width: `${a.confidence}%` }} />
                </span>
                <span className={styles.altPct}>{a.confidence}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FeedbackControl feedbackId={feedbackId} />

      {/* Disclaimer ----------------------------------------------------- */}
      {data.disclaimer && (
        <p className={styles.disclaimer}>{data.disclaimer}</p>
      )}

      <div className={styles.footerActions}>
        <button type="button" className="btn btn-primary btn-block" onClick={onCheckAnother}>
          Check another leaf
        </button>
      </div>
    </div>
  );
}

function FeedbackControl({ feedbackId }) {
  const { t } = useLang();
  const [choice, setChoice] = useState(() => getFeedback(feedbackId));

  const record = (value) => {
    setChoice(value);
    setFeedback(feedbackId, value);
  };

  return (
    <section className={`surface ${styles.feedback}`} aria-label={t.feedbackRegion}>
      {choice ? (
        <p className={styles.feedbackDone} role="status">{t.feedbackSaved}</p>
      ) : (
        <>
          <span className={styles.feedbackQ}>{t.helpful}</span>
          <div className={styles.feedbackBtns}>
            <button type="button" className="btn btn-secondary" onClick={() => record(Feedback.HELPFUL)}>
              Yes, helpful
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => record(Feedback.WRONG)}>
              Report wrong result
            </button>
          </div>
        </>
      )}
    </section>
  );
}

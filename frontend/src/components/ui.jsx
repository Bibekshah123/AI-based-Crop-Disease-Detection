import { useLang } from "../context/LanguageContext";
import styles from "./ui.module.css";

/* Status badge — always pairs colour with text (never colour alone). */
export function StatusBadge({ tone = "neutral", children }) {
  return (
    <span className={`${styles.badge} ${styles[`tone_${tone}`]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}

/* Confidence meter with visible numeric value + status text. */
export function ConfidenceMeter({ value = 0, tone = "neutral", label }) {
  const { t } = useLang();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{t.confidence}</span>
        <span className={styles.meterValue}>{pct}%</span>
      </div>
      <div
        className={styles.track}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${t.confidence}: ${label}, ${pct}%` : `${t.confidence} ${pct}%`}
      >
        <div className={`${styles.fill} ${styles[`fill_${tone}`]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <span className={styles.spinner} role="status" aria-live="polite">
      <span className={styles.spinnerRing} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className={`note note-error ${styles.errorBox}`} role="alert">
      <div>
        <strong className={styles.errorTitle}>{title}</strong>
        {message && <p className={styles.errorMsg}>{message}</p>}
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

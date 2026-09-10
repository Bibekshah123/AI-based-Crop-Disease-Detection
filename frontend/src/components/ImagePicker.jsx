import { useRef, useId } from "react";
import { useLang } from "../context/LanguageContext";
import styles from "./ImagePicker.module.css";

export default function ImagePicker({ preview, fileName, onSelect, onClear, error }) {
  const { t } = useLang();
  const GUIDANCE = [t.tip1, t.tip2, t.tip3, t.tip4, t.tip5];
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const guidanceId = useId();

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onSelect(f);
    e.target.value = ""; // allow re-selecting the same file
  };

  return (
    <div>
      {preview ? (
        <figure className={styles.previewWrap}>
          <img src={preview} alt={fileName ? `Selected leaf photo: ${fileName}` : t.selectedPhoto} className={styles.previewImg} />
          <div className={styles.previewActions}>
            <button type="button" className="btn btn-secondary" onClick={() => uploadRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClear}>
              Remove
            </button>
          </div>
        </figure>
      ) : (
        <div className={styles.picker} aria-describedby={guidanceId}>
          <button type="button" className={`btn btn-primary ${styles.pickBtn}`} onClick={() => cameraRef.current?.click()}>
            <CameraIcon /> {t.takePhoto}
          </button>
          <button type="button" className={`btn btn-secondary ${styles.pickBtn}`} onClick={() => uploadRef.current?.click()}>
            <UploadIcon /> {t.uploadImage}
          </button>
        </div>
      )}

      {error && (
        <p className={`note note-error ${styles.error}`} role="alert">{error}</p>
      )}

      <input ref={uploadRef} type="file" accept="image/*" onChange={handleChange} hidden />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />

      <div className={styles.guidance} id={guidanceId}>
        <p className={styles.guidanceTitle}>{t.photoTips}</p>
        <ul className={styles.guidanceList}>
          {GUIDANCE.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" />
    </svg>
  );
}

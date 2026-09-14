import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ImagePicker from "../components/ImagePicker";
import { Spinner, ErrorState } from "../components/ui";
import { CROPS, CROP_ANY, cropLabel } from "../lib/crops";
import { predict, classifyError } from "../lib/api";
import { normalizePrediction, toHistoryRecord } from "../lib/normalize";
import { fileToDataUrl } from "../lib/image";
import { saveHistory, makeId } from "../lib/history";
import { useObjectUrl } from "../lib/useObjectUrl";
import { useResult } from "../context/ResultContext";
import { useLang } from "../context/LanguageContext";
import s from "./pages.module.css";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export default function Diagnose() {
  const navigate = useNavigate();
  const { publish } = useResult();
  const { lang, t } = useLang();

  const [cropType, setCropType] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useObjectUrl();
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // hard guard against duplicate submits

  const selectFile = (f) => {
    if (!f.type?.startsWith("image/")) {
      setValidationError(t.errPickImage);
      return;
    }
    if (f.size > MAX_BYTES) {
      setValidationError(t.errTooLarge);
      return;
    }
    setValidationError("");
    setApiError(null);
    setFile(f);
    setPreview(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setValidationError("");
  };

  const analyze = async () => {
    if (submittingRef.current) return;
    if (!cropType) {
      setValidationError(t.errPickCrop);
      return;
    }
    if (!file) {
      setValidationError(t.errNoPhoto);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setApiError(null);
    setValidationError("");

    // "Any crop" means the user does not know the crop: send no crop_type so the
    // backend skips the crop-mismatch check instead of comparing against a sentinel.
    const sentCrop = cropType === CROP_ANY ? null : cropType;

    try {
      const raw = await predict(file, sentCrop);
      const data = normalizePrediction(raw, { cropType: sentCrop ?? "", lang });
      const [thumb, medium] = await Promise.all([
        fileToDataUrl(file, 160, 0.7).catch(() => null),
        fileToDataUrl(file, 720, 0.8).catch(() => null),
      ]);

      const id = makeId();
      saveHistory(toHistoryRecord(data, { thumbnail: thumb, id, timestamp: Date.now() }));
      publish({ id, raw, cropType: sentCrop ?? "", image: medium });
      navigate("/result");
    } catch (err) {
      setApiError(classifyError(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className={`container ${s.page}`}>
      <div className={s.head}>
        <h1 className={s.title}>{t.diagnoseTitle}</h1>
        <p className={s.lead}>{t.diagnoseLead}</p>
      </div>

      <div className={s.workflow}>
        {/* Step 1: crop */}
        <section className={s.panel} aria-labelledby="crop-heading">
          <h2 id="crop-heading" className={s.panelTitle}>
            {t.stepSelectCrop} <span className={s.required} aria-hidden="true">*</span>
          </h2>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">{t.cropRequired}</legend>
            <div className={s.cropGrid} role="radiogroup" aria-label={t.cropRequired}>
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={cropType === c.id}
                  className={`${s.cropBtn} ${cropType === c.id ? s.cropBtnActive : ""}`}
                  onClick={() => { setCropType(c.id); setValidationError(""); }}
                >
                  {cropLabel(c, lang)}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={cropType === CROP_ANY}
                className={`${s.cropBtn} ${s.cropAny} ${cropType === CROP_ANY ? s.cropAnyActive : ""}`}
                onClick={() => { setCropType(CROP_ANY); setValidationError(""); }}
              >
                {t.anyCrop}
              </button>
            </div>
          </fieldset>
          {cropType === CROP_ANY && (
            <p className={s.cropHint}>
              {t.anyCropHint}
            </p>
          )}
        </section>

        {/* Step 2: photo */}
        <section className={s.panel} aria-labelledby="photo-heading">
          <h2 id="photo-heading" className={s.panelTitle}>{t.stepAddPhoto}</h2>
          <ImagePicker
            preview={preview}
            fileName={file?.name}
            onSelect={selectFile}
            onClear={clearFile}
            error={validationError}
            scanning={submitting}
          />

          <div className={s.fieldGap} />

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={analyze}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner label={t.loading} /> {t.analyzing}
              </>
            ) : (
              t.analyzeLeaf
            )}
          </button>

          {/* Live region for status + errors */}
          <div aria-live="polite" className="sr-only">
            {submitting ? t.analyzingLive : ""}
          </div>

          {apiError && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <ErrorState
                title={
                  apiError.status === 400
                    ? t.errBadImageTitle
                    : apiError.kind === "timeout"
                    ? t.errTimeoutTitle
                    : apiError.kind === "network"
                    ? t.errNetworkTitle
                    : t.errFailedTitle
                }
                message={apiError.status === 400 ? t.errBadImageBody : apiError.message}
                onRetry={analyze}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

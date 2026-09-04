import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ImagePicker from "../components/ImagePicker";
import { Spinner, ErrorState } from "../components/ui";
import { CROPS, CROP_ANY } from "../lib/crops";
import { predict, classifyError } from "../lib/api";
import { normalizePrediction, toHistoryRecord } from "../lib/normalize";
import { fileToDataUrl } from "../lib/image";
import { saveHistory, makeId } from "../lib/history";
import { useObjectUrl } from "../lib/useObjectUrl";
import { useResult } from "../context/ResultContext";
import s from "./pages.module.css";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export default function Diagnose() {
  const navigate = useNavigate();
  const { publish } = useResult();

  const [cropType, setCropType] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useObjectUrl();
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // hard guard against duplicate submits

  const selectFile = (f) => {
    if (!f.type?.startsWith("image/")) {
      setValidationError("Please choose an image file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setValidationError("That image is larger than 12 MB. Please use a smaller photo.");
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
      setValidationError("Please select a crop first.");
      return;
    }
    if (!file) {
      setValidationError("Please add a leaf photo.");
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
      const data = normalizePrediction(raw, { cropType: sentCrop ?? "" });
      const [thumb, medium] = await Promise.all([
        fileToDataUrl(file, 160, 0.7).catch(() => null),
        fileToDataUrl(file, 720, 0.8).catch(() => null),
      ]);

      const id = makeId();
      saveHistory(toHistoryRecord(data, { thumbnail: thumb, id, timestamp: Date.now() }));
      publish({ id, data, image: medium });
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
        <h1 className={s.title}>Diagnose a leaf</h1>
        <p className={s.lead}>Select the crop (or choose "Any crop"), add a clear photo of one affected leaf, then analyze.</p>
      </div>

      <div className={s.workflow}>
        {/* Step 1: crop */}
        <section className={s.panel} aria-labelledby="crop-heading">
          <h2 id="crop-heading" className={s.panelTitle}>
            1. Select the crop <span className={s.required} aria-hidden="true">*</span>
          </h2>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Crop (required)</legend>
            <div className={s.cropGrid} role="radiogroup" aria-label="Crop">
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={cropType === c.id}
                  className={`${s.cropBtn} ${cropType === c.id ? s.cropBtnActive : ""}`}
                  onClick={() => { setCropType(c.id); setValidationError(""); }}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={cropType === CROP_ANY}
                className={`${s.cropBtn} ${s.cropAny} ${cropType === CROP_ANY ? s.cropAnyActive : ""}`}
                onClick={() => { setCropType(CROP_ANY); setValidationError(""); }}
              >
                Any crop — I&apos;m not sure
              </button>
            </div>
          </fieldset>
          {cropType === CROP_ANY && (
            <p className={s.cropHint}>
              The leaf will still be identified across all 10 supported crops. Only the
              &ldquo;wrong crop selected&rdquo; warning is skipped.
            </p>
          )}
        </section>

        {/* Step 2: photo */}
        <section className={s.panel} aria-labelledby="photo-heading">
          <h2 id="photo-heading" className={s.panelTitle}>2. Add a leaf photo</h2>
          <ImagePicker
            preview={preview}
            fileName={file?.name}
            onSelect={selectFile}
            onClear={clearFile}
            error={validationError}
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
                <Spinner label="Analyzing" /> Analyzing leaf…
              </>
            ) : (
              "Analyze leaf"
            )}
          </button>

          {/* Live region for status + errors */}
          <div aria-live="polite" className="sr-only">
            {submitting ? "Analyzing your leaf photo, please wait." : ""}
          </div>

          {apiError && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <ErrorState
                title={
                  apiError.kind === "timeout"
                    ? "The analysis timed out"
                    : apiError.kind === "network"
                    ? "Can't reach the server"
                    : "Analysis failed"
                }
                message={apiError.message}
                onRetry={analyze}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

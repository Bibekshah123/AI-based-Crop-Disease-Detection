// Mirrors frontend/src/lib/normalize.js — one place to turn a raw /predict
// response into a display shape and derive the responsible confidence status.

export const Status = { HIGH: "high", MODERATE: "moderate", UNCERTAIN: "uncertain" };

const TONE = {
  [Status.HIGH]: "success",
  [Status.MODERATE]: "warning",
  [Status.UNCERTAIN]: "error",
};

// A result is "uncertain" whenever the backend flags any doubt, OR confidence
// is low. High/Moderate only apply to clean, confident predictions.
export function deriveStatus(raw) {
  const confidence = Number(raw?.confidence ?? 0);
  if (raw?.is_unknown || raw?.not_leaf || raw?.crop_mismatch || raw?.low_confidence) {
    return Status.UNCERTAIN;
  }
  if (confidence >= 80) return Status.HIGH;
  if (confidence >= 60) return Status.MODERATE;
  return Status.UNCERTAIN;
}

// Pick the English or Nepali (`*_np`) variant of a field.
function field(raw, key, lang) {
  if (lang === "np") return raw?.[`${key}_np`] || raw?.[key] || "";
  return raw?.[key] || "";
}

export function normalize(raw, lang = "en") {
  const confidence = Number(raw?.confidence ?? 0);
  const status = deriveStatus(raw);
  const top = Array.isArray(raw?.top_5_predictions) ? raw.top_5_predictions : [];

  return {
    disease: field(raw, "disease", lang) || "Unknown",
    description: field(raw, "description", lang),
    cause: field(raw, "cause", lang),
    symptoms: field(raw, "symptoms", lang),
    treatment: field(raw, "treatment", lang),
    prevention: field(raw, "prevention", lang),
    disclaimer: raw?.disclaimer || "",

    // Structured controls rendered by TreatmentCard. `note` and `dose` both have
    // Nepali variants from the backend and are swapped here, so the card can
    // render item.note / item.dose without knowing the language.
    // The ACTIVE INGREDIENT stays English on purpose: a farmer matches it
    // against the bottle label, which is printed in Latin script worldwide.
    treatments: Array.isArray(raw?.treatments)
      ? raw.treatments.map((item) => ({
          ...item,
          note: lang === "np" ? item?.note_np || item?.note || "" : item?.note || "",
          dose: lang === "np" ? item?.dose_np || item?.dose || "" : item?.dose || "",
        }))
      : [],
    treatmentDisclaimer:
      (lang === "np" ? raw?.treatment_disclaimer_np : raw?.treatment_disclaimer) ||
      raw?.treatment_disclaimer ||
      "",

    cropType: raw?.crop_type || "",
    confidence: Math.round(confidence * 10) / 10,
    status,
    tone: TONE[status],

    isUnknown: Boolean(raw?.is_unknown),
    notLeaf: Boolean(raw?.not_leaf),
    cropMismatch: Boolean(raw?.crop_mismatch),
    lowConfidence: Boolean(raw?.low_confidence),
    message: raw?.message || "",

    gradcam: raw?.gradcam_image || null,
    alternatives: top.slice(1, 4),
  };
}

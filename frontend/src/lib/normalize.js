/* Single source of truth for turning a raw /predict response into the shape
   the UI renders, and for deciding the confidence status + responsible wording.
   Kept pure so it is easy to unit-test. */

export const Status = {
  HIGH: "high",
  MODERATE: "moderate",
  UNCERTAIN: "uncertain",
};

const STATUS_META = {
  [Status.HIGH]: { label: "High confidence", label_np: "उच्च विश्वसनीयता", tone: "success" },
  [Status.MODERATE]: { label: "Moderate confidence", label_np: "मध्यम विश्वसनीयता", tone: "warning" },
  [Status.UNCERTAIN]: { label: "Uncertain result", label_np: "अनिश्चित नतिजा", tone: "error" },
};

export function statusMeta(status, lang = "en") {
  const m = STATUS_META[status] ?? STATUS_META[Status.UNCERTAIN];
  return { ...m, label: lang === "np" ? m.label_np : m.label };
}

/* A result is "uncertain" whenever the backend flags any doubt, OR the numeric
   confidence is low. High/Moderate only apply to clean, confident predictions. */
export function deriveStatus(raw) {
  const confidence = Number(raw?.confidence ?? 0);
  if (raw?.is_unknown || raw?.not_leaf || raw?.crop_mismatch || raw?.low_confidence) {
    return Status.UNCERTAIN;
  }
  if (confidence >= 80) return Status.HIGH;
  if (confidence >= 60) return Status.MODERATE;
  return Status.UNCERTAIN;
}

/* Pick the English or Nepali (`*_np`) variant of a field, falling back to
   English whenever a Nepali string is missing so nothing renders blank. */
function field(raw, key, lang) {
  if (lang === "np") return raw?.[`${key}_np`] || raw?.[key] || "";
  return raw?.[key] || "";
}

export function normalizePrediction(raw, { cropType, lang = "en" } = {}) {
  const confidence = Number(raw?.confidence ?? 0);
  const status = deriveStatus(raw);
  const top = Array.isArray(raw?.top_5_predictions) ? raw.top_5_predictions : [];

  return {
    lang,
    disease: field(raw, "disease", lang) || "Unknown",
    description: field(raw, "description", lang),
    cause: field(raw, "cause", lang),
    symptoms: field(raw, "symptoms", lang),
    treatment: field(raw, "treatment", lang),
    prevention: field(raw, "prevention", lang),
    disclaimer: field(raw, "disclaimer", lang),

    cropType: raw?.crop_type ?? cropType ?? "",
    confidence: Math.round(confidence * 10) / 10,
    status,
    statusLabel: statusMeta(status, lang).label,
    tone: statusMeta(status).tone,

    treatments: Array.isArray(raw?.treatments) ? raw.treatments : [],
    treatmentDisclaimer: field(raw, "treatment_disclaimer", lang),

    isUnknown: Boolean(raw?.is_unknown),
    notLeaf: Boolean(raw?.not_leaf),
    cropMismatch: Boolean(raw?.crop_mismatch),
    lowConfidence: Boolean(raw?.low_confidence),
    message: raw?.message ?? "",

    gradcam: raw?.gradcam_image ?? null,

    topPredictions: top.map((p) => ({
      ...p,
      disease: lang === "np" ? p.disease_np || p.disease : p.disease,
    })),
    // Alternatives = the runners-up after the main prediction (up to three).
    alternatives: top.slice(1, 4).map((p) => ({
      ...p,
      disease: lang === "np" ? p.disease_np || p.disease : p.disease,
    })),

    raw,
  };
}

/* The raw response, minus the two fields that would blow the storage quota.
   Keeping the raw payload (rather than a rendered snapshot) is what lets the
   detail view follow the language toggle instead of being frozen in whichever
   language the check happened to be saved in. */
export function trimRawForStorage(raw) {
  if (!raw) return null;
  // eslint-disable-next-line no-unused-vars
  const { gradcam_image, raw_probabilities, ...rest } = raw;
  return rest;
}

/* Compact record persisted to local history. Keeps the text guidance (small)
   so the detail view can be rebuilt, but drops the Grad-CAM base64 and raw
   payload to stay well within localStorage limits. */
export function toHistoryRecord(normalized, { thumbnail, id, timestamp }) {
  return {
    id,
    timestamp,
    crop: normalized.cropType,
    disease: normalized.disease,
    // Both names are kept so the list can follow the language toggle later - the
    // record would otherwise be frozen in whichever language it was saved in.
    diseaseEn: normalized.raw?.disease ?? normalized.disease,
    diseaseNp: normalized.raw?.disease_np ?? normalized.disease,
    confidence: normalized.confidence,
    status: normalized.status,
    statusLabel: normalized.statusLabel,
    tone: normalized.tone,
    thumbnail: thumbnail ?? null,
    // Re-normalised at render time in the current language (see HistoryDetail).
    raw: trimRawForStorage(normalized.raw),
  };
}

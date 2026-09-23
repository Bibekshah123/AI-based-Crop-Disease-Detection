/* Maps a row from GET /auth/history onto the same record shape the local
   history store uses, so the History page, its filters and the detail view all
   work unchanged whether a check came from this device or from the account. */
import { deriveStatus, statusMeta } from "./normalize";

export function fromServerRow(row, lang = "en") {
  const raw = {
    disease: row.disease,
    disease_np: row.disease_np,
    confidence: row.confidence,
    crop_type: row.crop_type || "",
    is_unknown: row.is_unknown,
    not_leaf: row.not_leaf,
    message: row.message,
    cause: row.cause,
    cause_np: row.cause_np,
    symptoms: row.symptoms,
    symptoms_np: row.symptoms_np,
    treatment: row.treatment,
    treatment_np: row.treatment_np,
    prevention: row.prevention,
    prevention_np: row.prevention_np,
    top_5_predictions: row.top_5_predictions || [],
  };
  const status = deriveStatus(raw);
  const meta = statusMeta(status, lang);

  return {
    id: row.id,
    timestamp: Date.parse(row.timestamp),
    crop: row.crop_type || "",
    disease: row.disease,
    diseaseEn: row.disease,
    diseaseNp: row.disease_np || row.disease,
    confidence: Math.round(Number(row.confidence ?? 0) * 10) / 10,
    status,
    statusLabel: meta.label,
    tone: meta.tone,
    thumbnail: row.thumbnail || null,
    fromAccount: true,
    raw,
  };
}

import axios from "axios";
import { API_URL } from "./config";

// Sends the image (and optional crop type) to the FastAPI /predict endpoint.
// Returns the JSON exactly as backend/main.py builds it:
//   { disease, disease_np, confidence, low_confidence, is_unknown,
//     crop_mismatch, message, symptoms, treatment, prevention, cause,
//     (+ *_np Nepali variants), top_5_predictions[], gradcam_image, ... }
export async function predict(imageUri, cropType) {
  const form = new FormData();
  form.append("file", {
    uri: imageUri,
    name: "leaf.jpg",
    type: "image/jpeg",
  });
  if (cropType) form.append("crop_type", cropType);

  const res = await axios.post(`${API_URL}/predict`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 40000,
  });
  return res.data;
}

// Quick connectivity check used by the app to give a helpful error.
export async function health() {
  const res = await axios.get(`${API_URL}/health`, { timeout: 8000 });
  return res.data;
}

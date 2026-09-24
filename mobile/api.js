import axios from "axios";
import { API_URL } from "./config";

const auth = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

// Sends the image (and optional crop type) to the FastAPI /predict endpoint.
// A token is optional: with one the backend also saves the result to the
// signed-in user's history, without one the diagnosis is simply not stored.
export async function predict(imageUri, cropType, token) {
  const form = new FormData();
  form.append("file", { uri: imageUri, name: "leaf.jpg", type: "image/jpeg" });
  if (cropType) form.append("crop_type", cropType);

  const res = await axios.post(`${API_URL}/predict`, form, {
    headers: { "Content-Type": "multipart/form-data", ...auth(token) },
    timeout: 40000,
  });
  return res.data;
}

// Quick connectivity check used by the app to give a helpful error.
export async function health() {
  const res = await axios.get(`${API_URL}/health`, { timeout: 8000 });
  return res.data;
}

/* ---- Accounts ----------------------------------------------------------- */

export async function login(username, password) {
  const res = await axios.post(
    `${API_URL}/auth/login`,
    { username, password },
    { timeout: 20000 }
  );
  return res.data; // { access_token, username, email }
}

export async function signup(username, email, password) {
  const res = await axios.post(
    `${API_URL}/auth/signup`,
    { username, email, password },
    { timeout: 20000 }
  );
  return res.data;
}

export async function me(token) {
  const res = await axios.get(`${API_URL}/auth/me`, {
    headers: auth(token),
    timeout: 20000,
  });
  return res.data;
}

export async function history(token, limit = 50) {
  const res = await axios.get(`${API_URL}/auth/history?limit=${limit}`, {
    headers: auth(token),
    timeout: 20000,
  });
  return res.data?.history ?? [];
}

export async function historyEntry(token, id) {
  const res = await axios.get(`${API_URL}/auth/history/${id}`, {
    headers: auth(token),
    timeout: 30000,
  });
  return res.data;
}

export async function deleteHistoryEntry(token, id) {
  const res = await axios.delete(`${API_URL}/auth/history/${id}`, {
    headers: auth(token),
    timeout: 20000,
  });
  return res.data;
}

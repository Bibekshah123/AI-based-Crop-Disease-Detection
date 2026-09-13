/* Central API service layer. No component should call axios directly or
   reference a hardcoded host — everything goes through here. */
import axios from "axios";

// Prefer the new name, fall back to the legacy one so existing .env files keep working.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "";

const PREDICT_TIMEOUT_MS = 60000;

export const http = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the auth token (if any) to every request.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---- Error normalization ------------------------------------------------ */

export const ErrorKind = {
  TIMEOUT: "timeout",
  NETWORK: "network",
  SERVER: "server",
  CLIENT: "client",
};

export function classifyError(error) {
  if (error?.code === "ECONNABORTED") {
    return { kind: ErrorKind.TIMEOUT, message: "The request took too long. Please try again." };
  }
  if (error?.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;
    if (status >= 500) {
      return { kind: ErrorKind.SERVER, message: detail || "The server had a problem. Please try again in a moment." };
    }
    return { kind: ErrorKind.CLIENT, message: detail || "The request could not be completed.", status };
  }
  return { kind: ErrorKind.NETWORK, message: "Could not reach the server. Check your connection and try again." };
}

/* ---- Prediction --------------------------------------------------------- */

export async function predict(file, cropType, { signal } = {}) {
  const form = new FormData();
  form.append("file", file);
  if (cropType) form.append("crop_type", cropType);

  const res = await http.post("/predict", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: PREDICT_TIMEOUT_MS,
    signal,
  });
  return res.data;
}

export async function healthCheck() {
  const res = await http.get("/health", { timeout: 8000 });
  return res.data;
}

/* ---- Auth --------------------------------------------------------------- */

export async function login(username, password) {
  const res = await http.post("/auth/login", { username, password });
  return res.data; // { access_token, username, email }
}

export async function signup(username, email, password) {
  const res = await http.post("/auth/signup", { username, email, password });
  return res.data;
}

export async function me() {
  const res = await http.get("/auth/me");
  return res.data;
}

export async function getServerHistory() {
  const res = await http.get("/auth/history");
  return res.data?.history ?? [];
}

export async function deleteServerHistory(id) {
  const res = await http.delete(`/auth/history/${id}`);
  return res.data;
}

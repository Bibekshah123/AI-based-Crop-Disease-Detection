// ── Backend address ───────────────────────────────────────────────
// Default is the live Hugging Face Space, which works on any phone and any
// network with no laptop running. It's the default here (not only in
// .env.local) because EAS cloud builds skip gitignored .env files.
//
// A free Space sleeps when idle; the first request after that can take
// longer while it wakes up.
//
// To test against a local backend instead, set EXPO_PUBLIC_API_URL in
// .env.local — Expo inlines EXPO_PUBLIC_* at build time:
//     EXPO_PUBLIC_API_URL=http://192.168.77.134:8000   (same Wi-Fi only)
//
// Test from the PHONE'S browser first:  https://bikkii-cropsense.hf.space/health
// If that returns JSON, the app will work.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://bikkii-cropsense.hf.space";

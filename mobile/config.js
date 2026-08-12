// ── Backend address ───────────────────────────────────────────────
// Default is the Tailscale (tailnet) address of the "bibek" machine that runs
// the FastAPI backend. This works from ANY network — mobile data, other Wi-Fi —
// as long as:
//   1. the phone has the Tailscale app installed and signed into technical.nifn@
//   2. the laptop is powered on with Tailscale up, and
//   3. the backend is running:  cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
//
// MagicDNS is enabled on this tailnet, so http://bibek.tail211902.ts.net:8000
// also works and survives an IP change. The raw IP is used here because it does
// not depend on DNS resolution on the device.
//
// To override without editing this file (e.g. plain LAN testing), set
// EXPO_PUBLIC_API_URL in a .env.local file — Expo inlines EXPO_PUBLIC_* at build time:
//     EXPO_PUBLIC_API_URL=http://192.168.77.106:8000
//
// Local LAN addresses of this machine, for reference:
//     Wi-Fi    (wlp0s20f3) 192.168.77.106   ← phones on the office Wi-Fi
//     Ethernet (enp0s31f6) 192.168.1.100    ← wired only, NOT reachable from phones
//
// Test from the PHONE'S browser first:  http://100.76.133.76:8000/health
// If that returns JSON, the app will work.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://100.76.133.76:8000";

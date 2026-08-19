# CropSense AI — Mobile App

React Native (Expo) client for the CropSense crop-disease-detection backend.
It's a **thin client**: it takes/picks a leaf photo, sends it to the FastAPI
`/predict` endpoint, and shows the disease, confidence, Grad-CAM heatmap, and
treatment guidance (English & Nepali).

## Run it (development)

1. **Start the backend so the phone can reach it** (bind to all interfaces):
   ```bash
   cd ../backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Point the app at your computer.** `config.js` defaults to the Tailscale
   address `http://100.76.133.76:8000`, which works from any network. To use a
   plain LAN IP instead, create `.env.local` (no code change needed):
   ```
   EXPO_PUBLIC_API_URL=http://192.168.77.106:8000
   ```
   Find your IP with `ip -4 -o addr show scope global` (Linux) / `ipconfig` (Windows).

   > ⚠️ This machine is on **two** networks: Wi-Fi `192.168.77.106` and Ethernet
   > `192.168.1.100`. Phones join the Wi-Fi, so the `192.168.1.x` wired address
   > is **not** reachable from them. If Expo advertises the wrong one, pin it:
   > `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.77.106 npm start`

   > Sanity check: open `http://<your-ip>:8000/health` in your **phone's**
   > browser. If you see JSON, the app will work. If it hangs, it's a firewall
   > or you're on a different Wi-Fi.

3. **Start Expo and open on your phone:**
   ```bash
   npm start
   ```
   Install **Expo Go** on your phone, then scan the QR code
   (Android: from Expo Go · iOS: from the Camera app).
   The phone and computer must be on the **same Wi-Fi**.

## Build an installable APK

Built in the cloud with EAS — no local Android SDK or JDK needed.

```bash
npx eas-cli login          # your Expo account
npx eas-cli init           # once: links the project, writes extra.eas.projectId
npx eas-cli build -p android --profile preview
```

When it finishes you get a download URL (also under **Builds** on expo.dev).
Open that link on any Android phone to install. First build takes ~15–25 min;
you'll be asked to generate a new Android keystore — answer **yes** and let EAS
store it.

Profiles in `eas.json`:

| Profile       | Output      | Use for                                  |
|---------------|-------------|------------------------------------------|
| `preview`     | APK         | **What you want** — sideloadable build.   |
| `development` | APK         | Dev client, replaces Expo Go.             |
| `production`  | AAB         | Play Store upload only (can't sideload).  |

### Making it work off your Wi-Fi

The backend URL is compiled into the APK. It defaults to the **Tailscale**
address, so the app works from mobile data or any other network — provided:

1. the phone has the **Tailscale** app, signed into `technical.nifn@`;
2. this laptop is on with Tailscale up; and
3. the backend is running (`uvicorn main:app --host 0.0.0.0 --port 8000`).

To build against a different backend, put `EXPO_PUBLIC_API_URL` in `.env.local`
before building. For a build that needs no Tailscale app and no laptop running,
host the backend somewhere public and use its **https** URL.

> The app talks to the backend over plain `http://`, which release Android
> blocks by default. `expo-build-properties` sets `usesCleartextTraffic` in
> `app.json` to allow it. If you move to an `https` URL, that can be removed.

## Files

| File           | What it does                                                        |
|----------------|---------------------------------------------------------------------|
| `config.js`    | The backend `API_URL` — the one thing you change.                   |
| `api.js`       | `predict()` / `health()` — talks to FastAPI.                        |
| `App.js`       | Diagnose flow: crop selector (required), camera/upload, preview, photo guidance, Analyze, EN/NP toggle. |
| `ResultView.js`| The result screen: possible match, confidence status, Grad-CAM comparison, guidance, alternatives, feedback. |
| `normalize.js` | Turns the raw `/predict` response into a display shape and derives the High/Moderate/Uncertain status. |
| `theme.js`     | Design tokens — the calm agricultural palette shared with the web app. |
| `strings.js`   | Bilingual (EN/NP) UI labels + the crop list.                        |

The design, wording, and result layout mirror the web app
(`frontend/src/…`): a light agricultural theme, "possible match" framing,
**High / Moderate / Uncertain** status (never a guaranteed diagnosis), a
side-by-side *Your photo* vs *Model attention* Grad-CAM comparison, an
uncertainty warning that recommends re-shooting and consulting an expert, and a
local "was this helpful?" control.

The response fields (`disease`, `confidence`, `gradcam_image`,
`top_5_predictions`, `symptoms`, `cause`, `treatment`, `prevention`,
`is_unknown`, `not_leaf`, `crop_mismatch`, `low_confidence`, and their `*_np`
Nepali variants) come straight from `backend/main.py`.

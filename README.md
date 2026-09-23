# CropSense AI — Crop Disease Detection System

An AI-powered system that identifies crop diseases from a photo of a leaf. Add a leaf image, and it predicts a **possible** disease with a confidence level, generates a **Grad-CAM heatmap** for explainability, verifies the image actually looks like a leaf, flags out-of-distribution ("unknown") inputs, and returns bilingual (English + Nepali) crop-care guidance.

The project ships **three parts** that all talk to the same FastAPI backend:

- **Web app** — a React (Vite) single-page app, redesigned as a calm, mobile-first agricultural decision-support tool.
- **Mobile app** — a React Native (Expo) client for taking leaf photos on a phone.
- **Backend + model** — FastAPI serving an EfficientNetB2 model, with PostgreSQL for optional accounts.

Built as a Final Year Project (FYP). Repository: <https://github.com/Bibekshah123/AI-based-Crop-Disease-Detection>

---

## Table of Contents

- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development (without Docker)](#local-development-without-docker)
- [Web App (Frontend)](#web-app-frontend)
- [Mobile App](#mobile-app)
- [How a Prediction Works](#how-a-prediction-works)
- [API Reference](#api-reference)
- [The Model](#the-model)
- [Supported Crops & Classes (52)](#supported-crops--classes-52)
- [Database](#database)
- [Authentication & History](#authentication--history)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Training Your Own Model](#training-your-own-model)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Highlights

- **Disease Detection** — Classifies leaf images into **52 disease / healthy / unknown categories** across **10 crops**.
- **Responsible Confidence** — Reports softmax confidence and a clear status: **High / Moderate / Uncertain**. Results are always framed as a *possible* match, never a guarantee.
- **Grad-CAM Heatmap** — Visual explanation overlaying the regions of the leaf the model focused on, shown side-by-side with your photo.
- **Leaf Pre-check** — Rejects images that don't look like a leaf (HSV colour masking + edge/contrast/aspect heuristics, 3 of 4 tests must pass) before wasting a prediction.
- **Leaf Cropping** — `crop_to_leaf` isolates the leaf from a cluttered field scene (excess-green mask + narrow diseased-tissue hue band) with safety rails that fall back to the original image, narrowing the lab→field gap at inference time.
- **Unknown / Out-of-Distribution Detection** — Five rules flag inputs the model shouldn't confidently classify: the Unknown class itself, **confidence < 30%**, a **near-tie** (confidence < 50% and top-1/top-2 margin < 5 pts), **normalized entropy > 0.90**, and **open-set rejection** — cosine similarity to 51 class centroids below the calibrated threshold **0.5596**. The result distinguishes *Crop Not Supported* from *Not Identified*.
- **Crop-Mismatch Check** — Warns when the predicted crop doesn't match the crop you selected.
- **Top Alternatives** — Shows the runner-up classifications with confidences, plus full raw per-class probabilities in the API.
- **Structured Treatments** — `treatments.json` carries 51 protocols / 122 entries with active ingredient, kind, formulation, dose, pre-harvest interval, re-spray interval and safety band, non-chemical options first, each with a bilingual disclaimer.
- **Fully Bilingual (English / नेपाली)** — A language toggle in the header switches the entire interface *and* all disease content. Every result ships `*_np` fields (disease name, description, cause, symptoms, treatment, prevention) for all 51 conditions, and treatment protocols carry `dose_np` / `note_np`. Scientific names, chemical names and formulation codes deliberately stay in Latin so they can be matched against the product label.
- **Disease Library** — Browsable reference of every crop/disease the model knows, built from the same curated knowledge base.
- **Per-account History** — Every check is saved to the signed-in user's account (hosted PostgreSQL) and mirrored into the browser for filters, search and the detail view. A user only ever sees their own rows.
- **Mobile App** — React Native (Expo) client with camera capture, crop selector, and an English/Nepali toggle.
- **Calm, Original UI** — Mobile-first, accessible, agricultural design system (no marketing fluff, no fake stats).
- **Accounts (required)** — bcrypt password hashing and 24-hour JWTs. Signing in is compulsory on the web app and the Android app; the sign-in screen doubles as the project's front door. `/predict` itself still accepts an anonymous request, so an expired token can never fail a diagnosis mid-request — the requirement is enforced by the clients.
- **Deployed and public** — API + model on a Hugging Face Space, web app on Vercel, Android APK from Expo EAS. `docker compose up --build` still brings up the whole stack locally (DB, API, web app, DB admin GUI). See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web app | React 19 + Vite 8, React Router 7, Axios, CSS Modules + design tokens (Nginx in production) |
| Mobile app | React Native 0.86 + **Expo (SDK 57)**, React 19.2, expo-image-picker, Axios |
| Backend | FastAPI (Python 3.10), Uvicorn |
| Model | **EfficientNetB2** transfer learning (TensorFlow 2.21 / Keras), ~8.5 M parameters |
| Image Processing | OpenCV, Pillow, NumPy |
| Explainability | Grad-CAM (JET colormap overlay) |
| Auth | JWT (`python-jose`), bcrypt |
| Database | PostgreSQL 16 |
| DB Admin | Adminer |
| Frontend tests | Vitest + React Testing Library |
| Containerization | Docker, Docker Compose |
| Hosting | Hugging Face Spaces (Gradio SDK) · Vercel · Expo EAS Build |

---

## Architecture

```
        ┌──────────────────────┐     ┌──────────────────────┐
        │   Web app (browser)  │     │  Mobile app (phone)  │
        │  React SPA, port 3000│     │  React Native / Expo │
        └───────────┬──────────┘     └───────────┬──────────┘
                    │        multipart image + crop_type      │
                    │   /predict, /health, /auth/*            │
                    └───────────────┬────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │            FastAPI backend (port 8000)       │
                    │  • Leaf pre-check (OpenCV)                    │
                    │  • EfficientNetB2 inference (TensorFlow)      │
                    │  • Unknown / crop-mismatch logic             │
                    │  • Grad-CAM heatmap                          │
                    │  • Disease knowledge lookup (EN/NP)          │
                    │  • JWT auth + history                        │
                    └───────────────┬──────────────────┬──────────┘
                                    │                  │
                          model weights (.h5)    PostgreSQL 16 (port 5432)
                       backend/last_final_model/  users + predictions
                                                        ▲
                                              Adminer GUI (port 8080)
```

The web app talks to the backend through relative paths (`/predict`, `/health`, `/auth/*`). In production **Nginx** proxies these to the backend container; in local dev **Vite's dev-server proxy** does the same (see `frontend/vite.config.js`). To point at a hosted backend, set `VITE_API_BASE_URL`. The mobile app points at the backend via `EXPO_PUBLIC_API_URL` (or its `config.js` default).

---

## Project Structure

```
.
├── docker-compose.yml                  # Orchestrates db, backend, frontend, adminer
├── database/
│   └── schema.sql                      # PostgreSQL schema (users, predictions)
├── backend/
│   ├── Dockerfile                      # python:3.10-slim + libgl for OpenCV
│   ├── main.py                         # FastAPI app: model load, /predict, Grad-CAM, auth
│   ├── auth.py                         # JWT + bcrypt helpers
│   ├── db.py                           # PostgreSQL access + table init
│   ├── class_names.json                # 52 class labels (index order matters)
│   ├── disease_info.json               # EN/NP knowledge base for all 52 classes
│   ├── predict_test.py                 # Standalone offline image tester (no web stack)
│   ├── requirements.txt
│   ├── treatments.json                 # 51 treatment protocols / 122 entries (EN + NP)
│   └── last_final_model/               # Active model set — the three files below are ONE matched
│       │                               #   set from the same training run (6 Sep 2026)
│       ├── best_model_phase2.weights.h5   # ← active EfficientNetB2 weights, 52 classes (Git LFS)
│       ├── class_names.json               # 52 class names, in output order
│       └── ood_stats.npz                  # 51 centroids × 512 dims, threshold 0.5596
├── frontend/                           # Web app (React + Vite)
│   ├── Dockerfile                      # node build → nginx:alpine serve
│   ├── .dockerignore                   # excludes host node_modules/dist from the image
│   ├── nginx.conf                      # SPA fallback + proxies /predict,/health,/auth/*
│   ├── vite.config.js                  # dev proxy + Vitest config
│   ├── .env.example
│   └── src/
│       ├── main.jsx                    # Entry: Router + Auth/Result providers + global CSS
│       ├── App.jsx                     # Route table + shared Layout
│       ├── styles/                     # tokens.css (design tokens) + global.css
│       ├── lib/                        # api.js (service layer), normalize.js, history.js,
│       │                               #   feedback.js, image.js, crops.js, useObjectUrl.js
│       ├── context/                    # AuthContext.jsx, ResultContext.jsx
│       ├── components/                 # Layout, ImagePicker, ResultView, ui, RequireAuth
│       ├── pages/                      # Home, Diagnose, Result, History, HistoryDetail,
│       │                               #   Library, LibraryDetail, Login, Register,
│       │                               #   Profile, About, NotFound
│       ├── data/diseases.json          # Disease library data (generated from disease_info.json)
│       └── *.test.js(x), test/setup.js # Vitest + React Testing Library
├── mobile/                             # Mobile app (React Native / Expo)
│   ├── App.js                          # UI: crop selector, camera/gallery, EN/NP, results
│   ├── api.js                          # predict() / health() → FastAPI
│   ├── config.js                       # API_URL (EXPO_PUBLIC_API_URL override)
│   ├── app.json / eas.json             # Expo + EAS build config
│   └── README.md                       # Run + APK build instructions
├── scripts/
│   ├── train_colab.ipynb               # EfficientNetB2 training notebook (Colab GPU)
│   ├── train_colab_google.ipynb        # EfficientNetB2 notebook (Google Drive variant)
│   ├── train.py                        # Legacy local training script (EfficientNetB3)
│   └── download_model.sh
├── WINDOWS.md                          # Windows setup notes
├── AI_Crop_Disease_FYP_Implementation_Guide.md
└── README.md
```

> Model weights are large binaries tracked with **Git LFS** (see `.gitattributes`). After cloning, run `git lfs pull` if the `.h5` files come down as pointers. Datasets (`Dataset.zip`, `FYP-dataset-updated.zip`) are **not** committed due to size.

---

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose
- Git LFS (so the model weights are real files, not LFS pointers)

### Run everything with one command

```bash
git clone https://github.com/Bibekshah123/AI-based-Crop-Disease-Detection.git
cd AI-based-Crop-Disease-Detection
git lfs pull                 # ensure backend/last_final_model/*.h5 are downloaded
docker compose up --build    # always --build so you get the current frontend
```

This starts four services:

| Service | URL | Purpose |
|---|---|---|
| **Web app** | <http://localhost:3000> | The React app |
| **Backend API** | <http://localhost:8000> | FastAPI |
| **Swagger UI** | <http://localhost:8000/docs> | Interactive API docs |
| **Adminer** | <http://localhost:8080> | PostgreSQL admin GUI |

Stop everything with `docker compose down` (add `-v` to also wipe the database volume).

> **Always use `--build` (or `docker compose build --no-cache frontend`).** Plain `docker compose up` reuses the previously built image, so you can end up staring at an old version of the web app. The frontend `.dockerignore` keeps host `node_modules`/`dist` out of the image so the container builds cleanly on Alpine.

---

## Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
> The backend loads weights from `backend/last_final_model/` at startup (override with `MODEL_PATH`). Database init is **non-fatal** — if PostgreSQL isn't reachable it logs a warning and keeps running, because `/predict` doesn't need the DB (only the optional auth/history endpoints do).

**Web app:**
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 — proxies /predict,/health,/auth to :8000
npm test               # run the Vitest suite
npm run build          # production bundle → frontend/dist/
```

**Mobile app:** see [Mobile App](#mobile-app).

---

## Web App (Frontend)

The web app is a mobile-first, accessible single-page app organized around a small set of pages:

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | What it does, how it works, what you get back, crops covered |
| Diagnose | `/diagnose` | Crop selector → camera/upload → analyze, with validation/loading/timeout/error states |
| Result | `/result` | Possible match, confidence status, Grad-CAM comparison, guidance (symptoms/cause/management/prevention), then recommended treatment, alternatives, feedback |
| History | `/history` · `/history/:id` | Local-first list with filters (crop/status/sort/search), per-item and **Delete all** (with confirmation), + detail view |
| Disease Library | `/library` · `/library/:id` | Reference data for every crop/disease |
| About & Disclaimer | `/about` | What the tool does and how to use it responsibly |

Design & engineering notes:

- **Design system** — a token-based palette (`src/styles/tokens.css`) and CSS Modules per component; calm agricultural greens on a light ground, no gradients/glow/neon.
- **Service layer** — all HTTP goes through `src/lib/api.js` (one Axios instance); no component hardcodes a host. Backend responses are normalized in one place (`src/lib/normalize.js`), which also derives the High/Moderate/Uncertain status.
- **Language** — `context/LanguageContext.jsx` holds the choice (persisted per browser, English by default) and `lib/strings.js` carries ~216 UI strings in both languages at enforced parity. Disease content is **not** frozen at prediction time: the raw API response is stored and re-normalized on every render, so toggling the language re-translates an existing result or a saved history entry.
- **Local-first history & feedback** — checks and "was this helpful?" responses are stored in `localStorage` (`src/lib/history.js`, `src/lib/feedback.js`); no backend change required.
- **Accessibility** — semantic landmarks, skip link, keyboard-operable controls, `aria-live` status, `role="alert"` errors, meaningful alt text, visible focus, `prefers-reduced-motion`, 44px touch targets, and status conveyed by text (not colour alone).

---

## Mobile App

A React Native (Expo SDK 57) thin client that reuses the same `/predict` endpoint — take/pick a leaf photo, get the disease, confidence, Grad-CAM, and guidance, with an English/Nepali toggle. It shares the web app's design and responsible wording (possible match, High/Moderate/Uncertain, Grad-CAM comparison, feedback).

**Crop selection is optional** and defaults to *Any crop*: a photo can be analysed in two taps, and choosing a crop only enables the mismatch warning. The app icon, adaptive icon and splash screen are generated from the web app's leaf mark. The backend URL defaults to the public Space **in code** (`mobile/config.js`), because EAS cloud builds ignore gitignored `.env` files; override with `EXPO_PUBLIC_API_URL` for local testing.

### Start the dev server (test on a real phone)

**Prerequisites:** Node.js, the **Expo Go** app on your phone, and the phone on the **same Wi‑Fi** as your computer.

```bash
cd mobile
npm install

# 1) Find your computer's Wi-Fi IP (the interface the phone can reach):
ip -4 -o addr show scope global | awk '{print $2, $4}'   # Linux
#   e.g. wlp0s20f3 192.168.77.106/24   → use 192.168.77.106
# macOS/Windows: `ipconfig getifaddr en0` / `ipconfig`

# 2) Make sure the backend is running and bound to all interfaces:
#      (in another terminal)  cd ../backend && uvicorn main:app --host 0.0.0.0 --port 8000

# 3) Start Metro, pinned to that Wi-Fi IP, with the app pointed at the backend
#    on the same network. Replace the IP with yours:
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.77.106 \
EXPO_PUBLIC_API_URL=http://192.168.77.106:8000 \
npx expo start
```

Then on your phone:
- **Scan the QR code** shown in the terminal with Expo Go (Android) or the Camera app (iOS), **or**
- open Expo Go → **Enter URL manually** → `exp://192.168.77.106:8081` (your IP, port 8081).

The app loads and — because `EXPO_PUBLIC_API_URL` points at the backend on the same Wi‑Fi — predictions work without Tailscale. To reload after a change, shake the phone → **Reload**. Stop the server with **Ctrl+C**.

> Simpler alternative: `npm start` alone also works if Metro auto-detects the right interface, but pinning `REACT_NATIVE_PACKAGER_HOSTNAME` avoids trouble when the machine has several networks (Wi‑Fi + Ethernet). If the phone can't share the Wi‑Fi, use `npx expo start --tunnel` (routes through Expo's servers; the backend must then be reachable via a public/Tailscale URL).

### Build an installable APK

```bash
cd mobile
npx eas-cli login                                  # free Expo account
npx eas-cli build -p android --profile preview     # → downloadable, installable .apk
```

The first run creates the EAS project and generates the Android keystore (Expo stores it — future updates must be signed with the same key). The build runs on Expo's servers and prints a download/QR link; the APK needs no Expo Go and no development server. See `mobile/README.md` for the full networking guide.

---

## How a Prediction Works

1. On **Diagnose**, the user selects a crop (required) and adds a leaf photo (camera or upload), then presses **Analyze leaf**.
2. The client `POST`s the image (and `crop_type`) to `/predict` as multipart form data (with duplicate-submit prevention and a request timeout).
3. The backend decodes the image, makes a thumbnail, and runs the **leaf pre-check** (`is_leaf_image`). If it fails, a "Not a Leaf" result is returned immediately.
4. `crop_to_leaf` isolates the leaf from the background (skipped safely when the mask is implausible), then the image is converted to RGB, resized to **224×224**, and passed through EfficientNet's `preprocess_input`.
5. **EfficientNetB2** produces a softmax distribution over the **52 classes**.
6. **Unknown detection** runs: the Unknown class, very low confidence, a tiny top-1/top-2 margin, high entropy, or a low cosine similarity to every class centroid relabels the result `Unknown`, as either *Crop Not Supported* or *Not Identified*.
7. **Crop-mismatch** is checked against the crop the user selected.
8. A **Grad-CAM heatmap** is generated from the backbone's last convolutional layer and overlaid on the original image.
9. Treatment/prevention info (EN + NP) is looked up from `disease_info.json`.
10. The client normalizes the payload, derives a **High / Moderate / Uncertain** status, saves it to local history, and renders the **Result** page.

---

## API Reference

Base URL: `http://localhost:8000`

### Core

| Method | Path | Description |
|---|---|---|
| GET | `/` | API status message |
| GET | `/health` | Health check — `status`, `model_loaded`, `model_backbone`, `number_of_classes` |
| POST | `/predict` | Predict disease from an uploaded image |

**`POST /predict`** — `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | ✅ | The leaf image (JPG/PNG/WEBP) |
| `crop_type` | string | optional | Selected crop, used for the mismatch check |

**Example response (abridged):**
```json
{
  "disease": "Potato Late Blight",
  "disease_np": "आलुको ढिलो डढुवा",
  "description": "Late blight is a devastating disease of potato...",
  "raw_class": "Potato__Late_Blight",
  "crop_type": "Potato",
  "crop_mismatch": false,
  "is_unknown": false,
  "not_leaf": false,
  "confidence": 92.4,
  "entropy": 0.1183,
  "low_confidence": false,
  "message": "Prediction completed successfully.",
  "top_5_predictions": [
    { "disease": "Potato Late Blight", "disease_np": "...", "confidence": 92.4 }
  ],
  "raw_probabilities": [ { "index": 34, "class_name": "Potato__Late_Blight", "probability": 92.4 } ],
  "cause": "Oomycete disease caused by Phytophthora infestans.",
  "symptoms": "Dark brown water-soaked spots on leaves and stems...",
  "treatment": "Remove infected plants and apply fungicide immediately.",
  "prevention": "Avoid excess moisture and use resistant varieties.",
  "disclaimer": "This is general guidance only. Consult an agricultural expert before treatment.",
  "gradcam_image": "data:image/jpeg;base64,..."
}
```

### Auth & History (implemented in backend)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create an account (`username`, `email`, `password`) |
| POST | `/auth/login` | Log in, returns a JWT bearer token |
| GET | `/auth/me` | Current user info (requires bearer token) |
| GET | `/auth/history?limit=50` | Prediction history for the logged-in user |
| DELETE | `/auth/history/{prediction_id}` | Delete a history entry |

---

## The Model

- **Backbone:** `EfficientNetB2` (ImageNet-pretrained), input **224 × 224 × 3**.
- **Head:** `GlobalAveragePooling2D → Dropout(0.5) → Dense(512, ReLU) → Dropout(0.5) → Dense(52, softmax)`.
- **Preprocessing:** EfficientNet's `preprocess_input` (raw 0–255 pixels, no manual rescaling).
- **Backbone toggle:** `MODEL_BACKBONE` in `main.py` switches preprocessing/architecture between `efficientnet` (default) and `mobilenetv2`.

**Two-phase transfer learning:**
1. **Phase 1 — feature extraction:** freeze the backbone, train only the new head.
2. **Phase 2 — fine-tuning:** unfreeze and train the full network at a much lower learning rate.

Both phases apply **class weighting** to counter class imbalance across crops.

**Weight-loading priority** (`MODEL_PATH`, default `backend/last_final_model/`): `best_model_phase2_final.weights.h5` → `best_model_phase2.weights.h5` → `best_model_phase1.weights.h5` → `model.weights.h5`. The active deployed model is **`last_final_model/best_model_phase2.weights.h5`** (EfficientNetB2, 52 classes). The weights, `class_names.json` and `ood_stats.npz` in that folder are one matched set from the same run — centroids are meaningless against different weights.

**Measured performance.** ~98.5–98.9% validation accuracy on the curated lab split (31 Aug 2026 run, 51 classes — the deployed run's notebook outputs were not saved). Measured through the deployed API on 226 independent **PlantDoc** field photographs: **48.0% top-1**, **81.8% top-5**, crop correct 70.9%, and **81.8% accuracy for predictions at ≥ 80% confidence**. Of 74 untrained-crop leaves, 28.4% were declined. Full protocol and caveats in `CropSense_Final_Report.pdf` §6.2.4.

---

## Supported Crops & Classes (52)

10 crops, 51 disease/healthy classes, plus a dedicated `Unknown` class for out-of-distribution inputs.

| Crop | Classes |
|---|---|
| **Apple** (4) | Black Rot, Cedar Rust, Scab, Healthy |
| **Banana** (7) | Black Sigatoka, Yellow Sigatoka, Bract Mosaic Virus, Insect Pest, Moko, Panama, Healthy |
| **Citrus** (3) | Canker, Greening, Healthy |
| **Cucumber** (3) | Downy Mildew, Powdery Mildew, Healthy |
| **Grape** (4) | Black Measles, Black Rot, Leaf Blight, Healthy |
| **Maize** (3) | Common Rust, Northern Leaf Blight, Healthy |
| **Mango** (8) | Anthracnose, Bacterial Canker, Cutting Weevil, Die Back, Gall Midge, Powdery Mildew, Sooty Mould, Healthy |
| **Potato** (3) | Early Blight, Late Blight, Healthy |
| **Rice** (6) | Bacterial Leaf Blight, Brown Spot, Leaf Blast, Leaf Scald, Leaf Smut, Narrow Brown Spot |
| **Tomato** (10) | Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Mosaic Virus, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Healthy |
| **Unknown** (1) | Unknown — assigned to out-of-distribution / non-matching images |

---

## Database

PostgreSQL 16 runs in a Docker container with a persistent volume (`pgdata`). Tables are created automatically when the backend starts (`init_db()` in `db.py`, mirroring `database/schema.sql`).

**Connection details (defaults):**

| Field | Value |
|---|---|
| Host | `db` (Docker network) / `localhost` (local) |
| Port | `5432` |
| Database | `crop_disease` |
| User | `app` |
| Password | `app_password` |

**Tables:**
- `users` — `id, username, email, password (bcrypt hash), created_at`
- `predictions` — per-user prediction history (`disease`, `disease_np`, `confidence`, `crop_type`, `is_unknown`, `not_leaf`, `message`, cause/symptoms/treatment/prevention EN+NP, `top_5_predictions`, `gradcam_image`, `thumbnail`, `timestamp`)

**Inspect data via Adminer** at <http://localhost:8080> — System `PostgreSQL`, Server `db`, user/password/database as above.

---

## Authentication & History

- **Signing in is compulsory** on both clients. On the web every route except
  `/login` and `/register` sits behind `RequireAuth` (a layout route); the Android
  app opens on the same gate.
- **Passwords** are hashed with bcrypt (truncated to bcrypt's 72-byte limit).
  **Sessions** are JWT HS256, valid 24 hours, signed with `JWT_SECRET` — set it in
  the deployment or a restart signs everybody out.
- **Token storage:** `localStorage` on the web, **expo-secure-store** (Android
  Keystore) in the app.
- **History** lives in the `predictions` table, written by `/predict` when the
  request carries a token. `/auth/history` filters by the username inside the
  token; deleting someone else's row returns **403**. The web app mirrors the
  account's rows into `localStorage` so filters, search and the detail view work
  offline and survive a refresh; deleting removes both copies.
- **`/predict` takes an optional bearer token** (`HTTPBearer(auto_error=False)`):
  with one the result is saved, without one it is simply not stored. Saving is
  wrapped in try/except so a database problem can never turn a successful
  diagnosis into an error.

## Environment Variables

| Variable | Default | Used by | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `""` (relative, proxied) | web app | Backend base URL. Empty in dev (Vite proxy); set to a full URL for a hosted backend. |
| `VITE_API_URL` | — | web app | Legacy name, still honoured as a fallback if `VITE_API_BASE_URL` is unset. |
| `EXPO_PUBLIC_API_URL` | see `mobile/config.js` | mobile app | Backend base URL compiled into the app. |
| `DB_HOST` | `db` (compose) / `localhost` | backend | PostgreSQL host |
| `DB_PORT` | `5432` | backend | PostgreSQL port |
| `DB_NAME` | `crop_disease` | backend | Database name |
| `DB_USER` | `app` | backend | Database user |
| `DB_PASSWORD` | `app_password` | backend | Database password |
| `DATABASE_URL` | — | backend | Full connection string for a hosted Postgres (Neon/Supabase). Wins over the `DB_*` variables and defaults to `sslmode=require`. |
| `DB_SSLMODE` | `require` with `DATABASE_URL`, else `prefer` | backend | TLS mode; local Docker Postgres has no TLS. |
| `JWT_SECRET` | random per process (with a warning) | backend | JWT signing key — **must be set**, or every restart signs users out |
| `TF_CPP_MIN_LOG_LEVEL` | `2` | backend | TensorFlow log verbosity |

---

## Testing

Frontend tests use **Vitest + React Testing Library** (jsdom):

```bash
cd frontend
npm test               # run once
npm run test:watch     # watch mode
```

**28 tests across 6 files**, all passing. Coverage focuses on the parts most worth protecting: response **normalization / confidence-status** logic (`src/lib/normalize.test.js`, 10), the **local history** store (`src/lib/history.test.js`, 4), the **ImagePicker** (3), a **ResultView** smoke test asserting the responsible wording, Grad-CAM note, uncertainty warning and feedback controls (4), the **History page** delete-all flow (3), and the **sign-in flow** (4: nothing reachable while signed out, signing in stores the token and shows the user, signing out clears it, a wrong password shows an error).

For quick backend checks without the web stack, use `backend/predict_test.py` — it runs the exact same model, weight-loading order, preprocessing, and confidence threshold as the API, with no web/auth/DB dependencies:

```bash
cd backend
python predict_test.py ../test.jpg          # single image
python predict_test.py /path/to/folder       # a whole folder
python predict_test.py ../test.jpg --topk 5  # show top-K
```

---

## Training Your Own Model

### Option 1 — Google Colab (recommended, free GPU)

1. Upload your dataset (e.g. `FYP-dataset-updated.zip`) to Google Drive.
2. Open [`scripts/train_colab.ipynb`](scripts/train_colab.ipynb) in Colab.
3. **Runtime → Change runtime type → T4 GPU**.
4. Point the dataset path in the notebook at your Drive file.
5. Run all cells. The notebook trains **EfficientNetB2 @ 224×224** with the two-phase schedule (and class weighting) and exports `.weights.h5` + `class_names.json`.
6. Copy the exported weights into a folder under `backend/` (e.g. `last_final_model/`) together with the matching `class_names.json` and `ood_stats.npz` — the three are one matched set from the same run. Point `MODEL_PATH` at it if the folder name differs.

`scripts/train_colab_google.ipynb` is a Google-Drive-oriented variant of the same B2 pipeline.

> `scripts/train.py` is an older **local** training script targeting EfficientNetB3 @ 300×300. It predates the current B2 backend and is kept for reference; the deployed model comes from the B2 Colab pipeline above.

---

## Deployment

Because the backend loads TensorFlow + a ~100 MB model, it needs roughly **1.5–2 GB RAM** — most 512 MB free tiers will OOM. The live split, all on free tiers with no card:

| Part | Platform | Address |
|---|---|---|
| Backend + model | **Hugging Face Space** (Gradio SDK, CPU) — weights via Git LFS | <https://bikkii-cropsense.hf.space> |
| Web app | **Vercel** — root dir `frontend`, `VITE_API_BASE_URL` set to the Space URL, auto-deploys on push to `main` | Vercel project URL |
| Mobile app | **Expo EAS Build** — installable `.apk` | download link from the build |
| Database | **Neon** serverless PostgreSQL (free tier, Singapore), over SSL | set as the `DATABASE_URL` secret on the Space |

Hugging Face moved Docker Spaces to a paid tier during the project, so the Space runs the free **Gradio SDK**: `app.py` mounts the FastAPI routes on `gr.Server` and starts through Gradio's own launcher (ZeroGPU only marks the app started that way; a self-started uvicorn fails with *address already in use* on port 7860). The model runs on CPU, and the Space sleeps when idle — open `/health` a few minutes before a demo to wake it.

The backend sends permissive CORS (`allow_origins=["*"]`), so the hosted web and mobile clients can call it directly. Full walkthrough, including the two deployment bugs hit and fixed, is in **[DEPLOYMENT.md](DEPLOYMENT.md)**; an end-to-end explanation of the whole system is in **[CROPSENSE_WORKFLOW.md](CROPSENSE_WORKFLOW.md)**.

---

## Known Limitations

- **Lab → field domain gap — measured.** ~98% on the curated lab split versus **48.0% top-1 on independent PlantDoc field photographs** (81.8% top-5; 81.8% correct when confidence ≥ 80%). 1,593 real field photos, field-realism augmentation and `crop_to_leaf` narrow the gap but do not close it. Leaf segmentation and expert-verified Nepali field data are the next steps.
- **Untrained-crop rejection is weak.** Only **28.4%** of 74 untrained-crop leaves were declined; the open-set score distributions for supported and untrained crops overlap almost completely (means 0.701 vs 0.711), and the 5% false-rejection rate targeted at calibration rose to 11.5% on field images.
- **No saved training metrics for the deployed checkpoint.** Both notebooks have zero cell outputs; the saved curves/confusion matrix come from the earlier 31 Aug 51-class run.
- **Input-size check is weaker than intended.** Pillow only raises above 2× `MAX_IMAGE_PIXELS`, so a 132 MP image is decoded rather than rejected (it still returns a safe *Not a Leaf*). Fix: check decoded dimensions explicitly and return 400.
- **Class imbalance.** Crops/classes with more training images can dominate; class weighting helps, but the strongest fix for the weakest classes is more data. Report **macro-F1** alongside accuracy.
- **Guidance is advisory.** Treatment/prevention text is general reference information, not a substitute for an agronomist. Every result carries a disclaimer to consult an agricultural expert before acting.
- **Server-side history is off by default.** History is stored locally in the browser; enabling per-account server history requires re-enabling `db_save_prediction(...)` in the backend.

---

## License

Developed as a Final Year Project (FYP). No formal open-source license is attached; contact the repository owner regarding reuse.

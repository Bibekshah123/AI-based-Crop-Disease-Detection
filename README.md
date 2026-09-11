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
- **Leaf Pre-check** — Rejects images that don't look like a leaf (HSV colour masking + edge/contrast/aspect heuristics) before wasting a prediction.
- **Unknown / Out-of-Distribution Detection** — Flags inputs the model shouldn't confidently classify, using **confidence threshold, top-1/top-2 margin, and prediction entropy**.
- **Crop-Mismatch Check** — Warns when the predicted crop doesn't match the crop you selected.
- **Top Alternatives** — Shows the runner-up classifications with confidences, plus full raw per-class probabilities in the API.
- **Fully Bilingual (English / नेपाली)** — A language toggle in the header switches the entire interface *and* all disease content. Every result ships `*_np` fields (disease name, description, cause, symptoms, treatment, prevention) for all 51 conditions, and treatment protocols carry `dose_np` / `note_np`. Scientific names, chemical names and formulation codes deliberately stay in Latin so they can be matched against the product label.
- **Disease Library** — Browsable reference of every crop/disease the model knows, built from the same curated knowledge base.
- **Local-First History** — Every check is saved in the browser (no login/DB needed), with filters and a detail view.
- **Mobile App** — React Native (Expo) client with camera capture, crop selector, and an English/Nepali toggle.
- **Calm, Original UI** — Mobile-first, accessible, agricultural design system (no marketing fluff, no fake stats).
- **No Sign-in Required** — JWT auth, bcrypt and the PostgreSQL schema are implemented in the backend, but the web app deliberately ships **no sign-in surface**: diagnosis has no dependency on identity, and history is local-first.
- **One-Command Deploy** — `docker compose up --build` brings up the whole stack (DB, API, web app, DB admin GUI).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web app | React 19 + Vite 8, React Router 7, Axios, CSS Modules + design tokens (Nginx in production) |
| Mobile app | React Native + **Expo (SDK 54)**, expo-image-picker, Axios |
| Backend | FastAPI (Python 3.10), Uvicorn |
| Model | **EfficientNetB2** transfer learning (TensorFlow / Keras) |
| Image Processing | OpenCV, Pillow, NumPy |
| Explainability | Grad-CAM (JET colormap overlay) |
| Auth | JWT (`python-jose`), bcrypt |
| Database | PostgreSQL 16 |
| DB Admin | Adminer |
| Frontend tests | Vitest + React Testing Library |
| Containerization | Docker, Docker Compose |

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
│   └── last_final_model/               # Active weights (tracked via Git LFS)
│       ├── best_model_phase2_final.weights.h5   # ← active EfficientNetB2 model (52 classes)
│       ├── best_model_phase1.weights.h5         # Phase-1 (head-only) weights
│       └── best_model_phase2.weights.h5         # legacy phase-2 weights
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

A React Native (Expo) thin client that reuses the same `/predict` endpoint — take/pick a leaf photo, get the disease, confidence, Grad-CAM, and guidance, with an English/Nepali toggle. It shares the web app's design and responsible wording (possible match, High/Moderate/Uncertain, Grad-CAM comparison, feedback).

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
npx eas-cli build -p android --profile preview
```

See `mobile/README.md` for the full networking guide (LAN IP vs. Tailscale) and the EAS build flow.

---

## How a Prediction Works

1. On **Diagnose**, the user selects a crop (required) and adds a leaf photo (camera or upload), then presses **Analyze leaf**.
2. The client `POST`s the image (and `crop_type`) to `/predict` as multipart form data (with duplicate-submit prevention and a request timeout).
3. The backend decodes the image, makes a thumbnail, and runs the **leaf pre-check** (`is_leaf_image`). If it fails, a "Not a Leaf" result is returned immediately.
4. The image is preprocessed — converted to RGB, resized to **224×224**, and passed through EfficientNet's `preprocess_input`.
5. **EfficientNetB2** produces a softmax distribution over the **52 classes**.
6. **Unknown detection** runs: if confidence is very low, the top-1/top-2 margin is tiny, or the distribution's entropy is high, the result is relabeled `Unknown`.
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

**Weight-loading priority** (`MODEL_PATH`, default `backend/last_final_model/`): `best_model_phase2_final.weights.h5` → `best_model_phase2.weights.h5` → `best_model_phase1.weights.h5` → `model.weights.h5`. The active deployed model is **`last_final_model/best_model_phase2.weights.h5`** (EfficientNetB2, 52 classes).

The model reaches high validation accuracy on the curated dataset split; see the training notebook output for exact per-run metrics. (Real-world/field accuracy is lower than lab accuracy — see [Known Limitations](#known-limitations).)

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

- **Prediction history** in the web app is **local-first**: every check is saved in the browser (`localStorage`) with a thumbnail and summary, so History works with **no login and no database**.
- **The web app has no sign-in.** JWT auth (`python-jose`), bcrypt hashing and the `/auth/*` endpoints are implemented and working, but the Login / Register / Profile routes were **removed from the web UI**: requiring an account to diagnose a leaf would be a barrier for the intended user, and the diagnosis has no dependency on identity. The page components remain on disk (unreferenced) so the work is still demonstrable. Without a database attached, the `/auth/*` endpoints return errors — which is why nothing in the UI points at them.
- **Server-side history** (`/auth/history`) exists in the backend but is only populated if you re-enable `db_save_prediction(...)` inside `/predict` (it's commented out by default), so the running app relies on local history.

---

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
| `JWT_SECRET` | `crop-disease-detection-secret-key-2024` | backend | JWT signing key — **override in production** |
| `TF_CPP_MIN_LOG_LEVEL` | `2` | backend | TensorFlow log verbosity |

---

## Testing

Frontend tests use **Vitest + React Testing Library** (jsdom):

```bash
cd frontend
npm test               # run once
npm run test:watch     # watch mode
```

Coverage focuses on the parts most worth protecting: the response **normalization / confidence-status** logic (`src/lib/normalize.test.js`), the **local history** store (`src/lib/history.test.js`), and a **ResultView** smoke test asserting the responsible wording, Grad-CAM note, uncertainty warning, and feedback controls.

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

Because the backend loads TensorFlow + a ~100 MB model, it needs roughly **1.5–2 GB RAM** — most 512 MB free tiers will OOM. A workable free split:

- **Backend + model** → a Docker host with enough RAM (e.g. Hugging Face Spaces, Docker SDK — free CPU tier has ample RAM). The model weights ship inside the image via Git LFS.
- **Database** → a managed Postgres (e.g. Neon/Supabase free tier). Optional — the app runs without it.
- **Web app** → any static host (e.g. Vercel/Netlify), with `VITE_API_BASE_URL` set to the backend's public URL.
- **Mobile app** → build an APK with EAS and set `EXPO_PUBLIC_API_URL` to the backend's public URL.

The backend already sends permissive CORS (`allow_origins=["*"]`), so the hosted web and mobile clients can call it directly.

---

## Known Limitations

- **Lab → field domain gap.** The model is trained largely on curated, clean-background leaf images. Real-world photos — with cluttered backgrounds, varied lighting, and multiple leaves — can be misclassified or flagged `Unknown`. Improving field generalization (leaf segmentation, domain-randomization augmentation, adding field datasets like PlantDoc) is future work.
- **Class imbalance.** Crops/classes with more training images can dominate; class weighting helps, but the strongest fix for the weakest classes is more data. Report **macro-F1** alongside accuracy.
- **Guidance is advisory.** Treatment/prevention text is general reference information, not a substitute for an agronomist. Every result carries a disclaimer to consult an agricultural expert before acting.
- **Server-side history is off by default.** History is stored locally in the browser; enabling per-account server history requires re-enabling `db_save_prediction(...)` in the backend.

---

## License

Developed as a Final Year Project (FYP). No formal open-source license is attached; contact the repository owner regarding reuse.

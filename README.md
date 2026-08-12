# CropSense AI — Crop Disease Detection System

A full-stack, AI-powered web application that identifies crop diseases from a photo of a leaf. Upload (or drag-and-drop) an image, and the system predicts the disease with a confidence score, generates a **Grad-CAM heatmap** for explainability, verifies the image actually looks like a leaf, flags out-of-distribution ("unknown") inputs, and returns bilingual (English + Nepali) treatment and prevention guidance.

Built as a Final Year Project (FYP). Repository: <https://github.com/Bibekshah123/AI-based-Crop-Disease-Detection>

---

## Table of Contents

- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development (without Docker)](#local-development-without-docker)
- [How a Prediction Works](#how-a-prediction-works)
- [API Reference](#api-reference)
- [The Model](#the-model)
- [Supported Crops & Classes (52)](#supported-crops--classes-52)
- [Database](#database)
- [Authentication & History](#authentication--history)
- [Environment Variables](#environment-variables)
- [Training Your Own Model](#training-your-own-model)
- [Testing Images Offline](#testing-images-offline)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Highlights

- **Disease Detection** — Classifies leaf images into **52 disease / healthy / unknown categories** across **10 crops**.
- **Confidence Score** — Reports softmax confidence for the top prediction, with a **low-confidence warning** below 60%.
- **Grad-CAM Heatmap** — Visual explanation overlaying the regions of the leaf the model focused on.
- **Leaf Pre-check** — Rejects images that don't look like a leaf (HSV colour masking + edge/contrast/aspect heuristics) before wasting a prediction.
- **Unknown / Out-of-Distribution Detection** — Flags inputs the model shouldn't confidently classify, using a combination of **confidence threshold, top-1/top-2 margin, and prediction entropy**.
- **Crop-Mismatch Check** — Warns when the predicted crop doesn't match the crop you selected.
- **Top-5 Predictions** — Shows alternative classifications with confidences, plus full raw per-class probabilities.
- **Bilingual Content** — Every result ships English and Nepali (`*_np`) fields (disease name, description, cause, symptoms, treatment, prevention).
- **Treatment Guidance** — Cause, symptoms, treatment, and prevention pulled from a curated knowledge base (`disease_info.json`).
- **Clean, Professional UI** — Modern React single-page app with a black/charcoal theme, drag-and-drop upload, and image preview.
- **Prediction History & Auth** — JWT auth, bcrypt password hashing, and per-user prediction history backed by PostgreSQL (scaffolded — see [note](#authentication--history)).
- **One-Command Deploy** — `docker compose up --build` brings up the whole stack (DB, API, frontend, DB admin GUI).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, Axios (served by Nginx in production) |
| Backend | FastAPI (Python 3.10), Uvicorn |
| Model | **EfficientNetB2** transfer learning (TensorFlow / Keras) |
| Image Processing | OpenCV, Pillow, NumPy |
| Explainability | Grad-CAM (JET colormap overlay) |
| Auth | JWT (`python-jose`), bcrypt |
| Database | PostgreSQL 16 |
| DB Admin | Adminer |
| Containerization | Docker, Docker Compose |

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │                   Browser                    │
                    │        React SPA (Vite build, port 3000)     │
                    └───────────────────────┬─────────────────────┘
                                            │  HTTP (multipart image + crop_type)
                             /predict, /health, /auth/*  (proxied by Nginx)
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
                          backend/best_model/     users + predictions
                                                        ▲
                                              Adminer GUI (port 8080)
```

The frontend talks to the backend through relative paths (`/predict`, `/health`, `/auth/*`). In production **Nginx** proxies these to the backend container; in local dev **Vite's dev-server proxy** does the same (see `frontend/vite.config.js`).

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
│   └── best_model/                     # Trained weights (tracked via Git LFS)
│       ├── best_model_phase2_final.weights.h5   # ← active EfficientNetB2 model (52 classes)
│       ├── best_model_phase1.weights.h5         # Phase-1 (head-only) weights
│       └── best_model_phase2.weights.h5         # legacy phase-2 weights
├── frontend/
│   ├── Dockerfile                      # node build → nginx:alpine serve
│   ├── nginx.conf                      # Proxies /predict, /health, /auth/* to backend
│   ├── vite.config.js                  # Dev-server proxy config
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx                    # Entry point
│       ├── App.jsx                     # Main app (upload → predict → result card)
│       ├── App.css                     # Component styles (black/charcoal theme)
│       ├── index.css                   # Global styles & design tokens
│       ├── History.jsx                 # Prediction history view
│       ├── Login.jsx / Signup.jsx      # Auth screens
│       └── AuthContext.jsx             # Auth state/provider
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
git lfs pull            # ensure backend/best_model/*.h5 are downloaded
docker compose up --build
```

This starts four services:

| Service | URL | Purpose |
|---|---|---|
| **Frontend** | <http://localhost:3000> | The web app |
| **Backend API** | <http://localhost:8000> | FastAPI |
| **Swagger UI** | <http://localhost:8000/docs> | Interactive API docs |
| **Adminer** | <http://localhost:8080> | PostgreSQL admin GUI |

Stop everything with `docker compose down` (add `-v` to also wipe the database volume).

---

## Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> The backend loads weights from `backend/best_model/` at startup and initializes the database. For DB-backed features you'll need a running PostgreSQL matching the `DB_*` env vars; for plain predictions the model works without it.

**Frontend:**
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, proxies API calls to :8000
```

Build a production bundle with `npm run build` (output in `frontend/dist/`).

---

## How a Prediction Works

1. The user selects a crop and uploads a leaf image (drag-and-drop or file browse).
2. The frontend `POST`s the image (and optional `crop_type`) to `/predict` as multipart form data.
3. The backend decodes the image, makes a thumbnail, and runs the **leaf pre-check** (`is_leaf_image`). If it fails, a "Not a Leaf" result is returned immediately.
4. The image is preprocessed — converted to RGB, resized to **224×224**, and passed through EfficientNet's `preprocess_input`.
5. **EfficientNetB2** produces a softmax distribution over the **52 classes**.
6. **Unknown detection** runs: if confidence is very low, the top-1/top-2 margin is tiny, or the distribution's entropy is high, the result is relabeled `Unknown`.
7. **Crop-mismatch** is checked against the crop the user selected.
8. A **Grad-CAM heatmap** is generated from the backbone's last convolutional layer and overlaid on the original image.
9. Treatment/prevention info (EN + NP) is looked up from `disease_info.json`.
10. A rich JSON payload is returned and rendered in the result card (disease, confidence bar, top-5, heatmap, guidance).

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

**Weight-loading priority** (`backend/best_model/`): `best_model_phase2_final.weights.h5` → `best_model_phase2.weights.h5` → `best_model_phase1.weights.h5` → `model.weights.h5`. The active deployed model is **`best_model_phase2_final.weights.h5`** (EfficientNetB2, 52 classes).

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

The backend fully implements JWT-based auth (`python-jose`), bcrypt password hashing, and per-user prediction history in PostgreSQL.

> **Current state:** the auth flow and history-saving are **commented out in the running app** — the login/signup UI is disabled in `frontend/src/App.jsx`, and `/predict` does not require a token or persist results. So out of the box the app runs **open** (no login needed). To enable auth, re-enable the commented `AuthProvider`/routes in the frontend and the `Depends(get_current_user)` / `db_save_prediction(...)` lines in `backend/main.py`.

---

## Environment Variables

| Variable | Default | Used by | Description |
|---|---|---|---|
| `VITE_API_URL` | `""` (relative, proxied) | frontend | Backend base URL for API calls in dev |
| `DB_HOST` | `db` (compose) / `localhost` | backend | PostgreSQL host |
| `DB_PORT` | `5432` | backend | PostgreSQL port |
| `DB_NAME` | `crop_disease` | backend | Database name |
| `DB_USER` | `app` | backend | Database user |
| `DB_PASSWORD` | `app_password` | backend | Database password |
| `JWT_SECRET` | `crop-disease-detection-secret-key-2024` | backend | JWT signing key — **override in production** |
| `TF_CPP_MIN_LOG_LEVEL` | `2` | backend | TensorFlow log verbosity |

---

## Training Your Own Model

### Option 1 — Google Colab (recommended, free GPU)

1. Upload your dataset (e.g. `FYP-dataset-updated.zip`) to Google Drive.
2. Open [`scripts/train_colab.ipynb`](scripts/train_colab.ipynb) in Colab.
3. **Runtime → Change runtime type → T4 GPU**.
4. Point the dataset path in the notebook at your Drive file.
5. Run all cells. The notebook trains **EfficientNetB2 @ 224×224** with the two-phase schedule and exports `.weights.h5` + `class_names.json`.
6. Copy the exported weights into `backend/best_model/` (as `best_model_phase2_final.weights.h5`) and update `backend/class_names.json` if the class set changed.

`scripts/train_colab_google.ipynb` is a Google-Drive-oriented variant of the same B2 pipeline.

> `scripts/train.py` is an older **local** training script targeting EfficientNetB3 @ 300×300. It predates the current B2 backend and is kept for reference; the deployed model comes from the B2 Colab pipeline above.

---

## Testing Images Offline

`backend/predict_test.py` runs the exact same model, weight-loading order, preprocessing, class list, and confidence threshold as the API — but with no web/auth/DB dependencies (only `tensorflow`, `pillow`, `numpy`). Handy for quickly checking images from the command line:

```bash
cd backend
python predict_test.py ../test.jpg                 # single image
python predict_test.py /path/to/leaf1.jpg leaf2.png # multiple
python predict_test.py /path/to/folder_of_images    # a whole folder
python predict_test.py ../test.jpg --topk 5         # show top-K
```

It prints the top-1 prediction with an `OK` / `LOW CONFIDENCE` verdict plus the top-K list.

---

## Known Limitations

- **Lab → field domain gap.** The model is trained largely on curated, clean-background leaf images. Real-world photos from the internet or a phone camera — with cluttered backgrounds, varied lighting, and multiple leaves — can be misclassified or flagged `Unknown`. Improving field generalization (leaf segmentation, domain-randomization augmentation, adding field datasets like PlantDoc) is a known area for future work.
- **Guidance is advisory.** Treatment/prevention text is general reference information, not a substitute for an agronomist. Every result carries a disclaimer to consult an agricultural expert before acting.
- **Auth/history disabled by default** in the running app (see the note above).

---

## License

Developed as a Final Year Project (FYP). No formal open-source license is attached; contact the repository owner regarding reuse.

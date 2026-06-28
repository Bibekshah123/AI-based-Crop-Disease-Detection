# CropSense AI — Crop Disease Detection System

A web-based AI system that identifies crop diseases from leaf images. Upload a photo of a crop leaf, and the system predicts the disease with a confidence score, shows a Grad-CAM heatmap for explainability, and provides treatment/prevention guidance.

## Features

- **Disease Detection** — Classifies leaf images into 24 disease/healthy categories across 10 crops
- **Confidence Score** — Displays how confident the model is in its prediction
- **Grad-CAM Heatmap** — Visual explanation showing which parts of the leaf the model focused on
- **Treatment Guidance** — Returns cause, symptoms, treatment, and prevention information
- **Top-5 Predictions** — Shows alternative possible classifications
- **Low-Confidence Warning** — Alerts the user when confidence is below 60%
- **Drag-and-Drop Upload** — Modern file upload with preview
- **Disclaimer** — Reminds users to consult an agricultural expert before acting on the results

## Tech Stack

| Component | Technology |
|---|---|---|
| Frontend | React + Vite (hosted on Nginx) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL 16 (Docker) |
| Model | EfficientNetB3 (TensorFlow / Keras) |
| Image Processing | OpenCV, Pillow |
| Explainability | Grad-CAM |
| Containerization | Docker, Docker Compose |

## Project Structure

```
.
├── docker-compose.yml              # Start all services with one command
├── database/
│   └── schema.sql                  # PostgreSQL schema
├── backend/
│   ├── Dockerfile
│   ├── main.py                      # FastAPI application
│   ├── requirements.txt
│   ├── class_names.json             # 24 disease class labels
│   ├── disease_info.json            # Treatment/prevention data
│   └── fyp_efficientnet_b3_model/
│       ├── model.weights.h5         # Trained EfficientNetB3 weights
│       ├── config.json
│       └── metadata.json
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   ├── App.css                  # Component styles
│   │   ├── index.css                # Global styles & variables
│   │   └── main.jsx                 # Entry point
│   └── package.json
├── scripts/
│   ├── train.py                     # Training script (runs locally)
│   └── train_colab.ipynb            # Colab notebook for GPU training
├── Dataset/                         # Training data (not committed)
├── Dataset.zip
└── README.md
```

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Run with Docker (Single Command)

```bash
docker compose up --build
```

This starts all services:
- **Frontend** → [http://localhost:3000](http://localhost:3000)
- **Backend API** → [http://localhost:8000](http://localhost:8000)
- **Swagger UI** → [http://localhost:8000/docs](http://localhost:8000/docs)
- **Adminer** (database GUI) → [http://localhost:8080](http://localhost:8080)

To stop: `docker compose down`

### Database

PostgreSQL 16 runs in a Docker container with persistent storage. Tables are created automatically when the backend starts.

**Connection details:**

| Field | Value |
|---|---|
| Host | `db` (Docker network) |
| Port | `5432` |
| Database | `crop_disease` |
| User | `app` |
| Password | `app_password` |

**View data via Adminer:**

Open [http://localhost:8080](http://localhost:8080) and login with:

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `db` |
| Username | `app` |
| Password | `app_password` |
| Database | `crop_disease` |

**Tables:**

- `users` — User accounts (username, email, password hash, created_at)
- `predictions` — Prediction history linked to users (disease, confidence, crop, Grad-CAM, thumbnail, treatment info)

## How It Works

1. User selects a crop type and uploads a leaf image (drag-and-drop or browse).
2. The frontend sends the image to the backend's `/predict` endpoint.
3. The backend preprocesses the image (resize to 300×300, EfficientNet normalization).
4. The EfficientNetB3 model predicts the disease class from 24 categories.
5. A Grad-CAM heatmap is generated showing the regions the model focused on.
6. The backend looks up treatment information from `disease_info.json`.
7. The result is returned as JSON and displayed in a clean, modern card layout.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | API status |
| GET | `/health` | Health check with model info |
| POST | `/predict` | Upload an image for disease prediction |

**`/predict` response:**
```json
{
  "disease": "Potato Late blight",
  "confidence": 92.4,
  "cause": "Fungal-like disease caused by Phytophthora infestans.",
  "symptoms": "Dark brown spots on leaves and stems.",
  "treatment": "Remove infected leaves and consult an agricultural officer.",
  "prevention": "Avoid excess moisture and improve air circulation.",
  "gradcam_image": "data:image/jpeg;base64,...",
  "top_5_predictions": [...],
  "raw_probabilities": [...],
  "disclaimer": "This is general guidance only. Consult an agricultural expert before treatment."
}
```

## Supported Crops & Classes (24)

| Crop | Classes |
|---|---|
| Apple | Apple scab, Black rot, Cedar apple rust, healthy |
| Banana | Healthy leaf, Panama disease, Sigatoka disease |
| Citrus | Canker, Greening, healthy |
| Coffee | No rust, Rust |
| Corn (maize) | Common rust, Northern Leaf Blight, healthy |
| Mango | Anthracnose, healthy, Powdery mildew |
| Potato | Late blight, healthy |
| Rice | Bacterial leaf blight, Brown spot, Leaf smut |
| Tomato | Bacterial spot, Late blight, healthy |

## Model Details

The model uses **EfficientNetB3** as the feature extractor backbone (pre-trained on ImageNet), followed by a Global Average Pooling layer, a Dense layer (256 units with ReLU), Dropout (0.3), and the output layer with softmax activation (24 units). Training uses a two-phase approach:

1. **Phase 1** — Train the newly added top layers while the backbone is frozen (15 epochs, LR=1e-3)
2. **Phase 2** — Fine-tune the entire model with a lower learning rate (15 epochs, LR=1e-5)

The model achieves ~95–97% validation accuracy on the PlantVillage-derived dataset.

## Training Your Own Model

### Option 1: Google Colab (Recommended — Free GPU)

1. Upload `Dataset.zip` to your Google Drive
2. Open [`scripts/train_colab.ipynb`](scripts/train_colab.ipynb) in Colab
3. **Runtime → Change runtime type → T4 GPU**
4. Update the `ZIP_PATH` in the notebook to point to your Drive file
5. Run all cells
6. Output files save to `MyDrive/crop_disease_model/`

### Option 2: Local Training

```bash
pip install tensorflow
python scripts/train.py
```

Output files are placed in `backend/fyp_efficientnet_b3_model/model.weights.h5` and `backend/class_names.json`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` (relative proxy) | Backend API URL for the frontend (used in dev mode) |
| `DB_HOST` | `db` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `crop_disease` | PostgreSQL database name |
| `DB_USER` | `app` | PostgreSQL user |
| `DB_PASSWORD` | `app_password` | PostgreSQL password |
| `JWT_SECRET` | (hardcoded default) | Secret key for JWT token signing |

## Dataset

The dataset is based on the PlantVillage dataset with additional classes for Banana, Coffee, Mango, and Rice. It contains 24 classes with approximately 40,000 images. The dataset is **not committed** to this repository due to size (~710 MB zipped). Upload `Dataset.zip` to Google Drive before training in Colab.

| Class | Images | Class | Images |
|---|---|---|---|
| Apple scab | 2,520 | Coffee Rust | 4,354 |
| Apple healthy | 2,500 | Corn common rust | 2,384 |
| Banana healthy | 1,312 | Corn healthy | 1,859 |
| Banana Panama | 328 | Corn Northern blight | 2,384 |
| Banana Sigatoka | 1,578 | Mango Anthracnose | 4,286 |
| Citrus Canker | 163 | Mango healthy | 2,764 |
| Citrus Greening | 204 | Mango powdery mildew | 1,327 |
| Citrus healthy | 58 | Potato late blight | 2,424 |
| Coffee NoRust | 1,468 | Potato healthy | 2,280 |

## License

This project was developed as a Final Year Project (FYP).

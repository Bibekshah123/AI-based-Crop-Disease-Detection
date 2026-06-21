# AI-Based Crop Disease Detection System

A web-based AI system that identifies crop diseases from leaf images. Users upload a photo of a crop leaf, and the system predicts the disease, shows a confidence score, displays a Grad-CAM heatmap for explainability, and provides treatment/prevention guidance.

## Features

- **Disease Detection** — Classifies leaf images into disease categories (supports 10 classes: Apple, Corn, Potato, Tomato diseases and healthy variants)
- **Confidence Score** — Displays how confident the model is in its prediction
- **Grad-CAM Heatmap** — Visual explanation showing which parts of the leaf the model focused on
- **Treatment Guidance** — Returns cause, symptoms, treatment, and prevention information
- **Top-5 Predictions** — Shows alternative possible classifications
- **Low-Confidence Warning** — Alerts the user when confidence is below 60%
- **Disclaimer** — Reminds users to consult an agricultural expert before acting on the results

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Model | MobileNetV2 (TensorFlow / Keras) |
| Image Processing | OpenCV, Pillow |
| Explainability | Grad-CAM |
| Containerization | Docker, Docker Compose |

## Project Structure

```
.
├── docker-compose.yml         # Start both services with one command
├── backend/
│   ├── Dockerfile
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt
│   ├── class_names.json        # 10 disease class labels
│   ├── disease_info.json       # Treatment/prevention data
│   ├── crop_disease_mobilenet_model_final.keras  # Trained model
│   └── model_extracted/        # Extracted model weights
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   └── App.css             # Styling
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- Docker & Docker Compose (optional)

### Option 1: Run Locally (Without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://127.0.0.1:8000`. Open `http://127.0.0.1:8000/docs` for the interactive Swagger UI.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://127.0.0.1:5173`.

### Option 2: Run with Docker (Single Command)

```bash
docker compose up --build
```

This starts both services:
- Frontend → `http://localhost:80`
- Backend API → `http://localhost:8000`
- Swagger UI → `http://localhost:8000/docs`

To stop: `docker compose down`

## How It Works

1. User selects a crop type (e.g., Tomato, Potato, Corn) and uploads a leaf image.
2. The frontend sends the image to the backend's `/predict` endpoint.
3. The backend preprocesses the image (resize to 224×224, normalize).
4. The MobileNetV2 model predicts the disease class.
5. A Grad-CAM heatmap is generated to show the regions the model focused on.
6. The backend looks up treatment information from `disease_info.json`.
7. The result is returned as JSON and displayed in the frontend.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | API status |
| GET | `/health` | Health check with model info |
| POST | `/predict` | Upload an image for disease prediction |

**`/predict` request:**
- `file` (multipart/form-data) — The leaf image
- `crop_type` (string, optional) — The type of crop

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
  "disclaimer": "This is general guidance only. Consult an agricultural expert before treatment."
}
```

## Supported Classes (10)

- Apple Black rot
- Apple healthy
- Corn Common rust
- Corn Northern Leaf Blight
- Potato Early blight
- Potato Late blight
- Potato healthy
- Tomato Early blight
- Tomato Late blight
- Tomato healthy

## Model Details

The model uses **MobileNetV2** as the feature extractor backbone, followed by a Global Average Pooling layer and two Dense layers (256 units with ReLU, and the output layer with softmax activation). It was trained on a crop disease dataset with 24 classes and fine-tuned to run with 10 output classes for this version.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend API URL for the frontend |

## License

This project was developed as a Final Year Project (FYP).

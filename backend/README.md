---
title: CropSense AI Backend
emoji: 🌿
colorFrom: green
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# CropSense AI — Crop Disease Detection API

FastAPI backend for the CropSense AI mobile/web app. Serves an EfficientNetB2
model that classifies crop-leaf diseases across 52 classes (10 crops).

## Endpoints
- `GET /health` — liveness check (returns JSON).
- `POST /predict` — multipart form: `file` (image), optional `crop_type`.
  Returns disease, confidence, symptoms/treatment/prevention (EN + Nepali),
  top-5 predictions, and a Grad-CAM overlay.

The `/predict` path does not require a database. Auth/history endpoints need a
Postgres instance (via `DB_*` env vars); if none is configured the server still
starts and prediction works normally.

## Notes for this Space
- Runs on the free CPU tier (16 GB RAM) — enough for TensorFlow + the model.
- A free Space sleeps after ~48h idle and takes ~30s to wake on the next request.
- Model weights (`best_model/best_model_phase2_final.weights.h5`) are stored with
  Git LFS in this Space repo.

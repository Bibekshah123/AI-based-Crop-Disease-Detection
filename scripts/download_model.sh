#!/usr/bin/env bash
set -e

MODEL_DIR="backend/updated-model"
MODEL_URL="https://github.com/Bibekshah123/AI-based-Crop-Disease-Detection/releases/download/v1.0/model.weights.h5"

if [ -f "$MODEL_DIR/model.weights.h5" ]; then
    echo "Model already exists at $MODEL_DIR/model.weights.h5"
    exit 0
fi

mkdir -p "$MODEL_DIR"
echo "Downloading model weights (129 MB)..."
curl -L -o "$MODEL_DIR/model.weights.h5" "$MODEL_URL"
echo "Done! Model saved to $MODEL_DIR/model.weights.h5"

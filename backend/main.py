from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
import numpy as np
import json
import io
import cv2
import base64

# ============================
# Configuration
# ============================
MODEL_PATH = "model.h5"
CLASS_NAMES_PATH = "class_names.json"
DISEASE_INFO_PATH = "disease_info.json"
IMG_SIZE = (224, 224)
LOW_CONFIDENCE_THRESHOLD = 0.60

# Set this based on your model:
# "mobilenetv2" or "efficientnet"
MODEL_BACKBONE = "mobilenetv2"

# ============================
# Initialize FastAPI
# ============================
app = FastAPI(title="AI-Based Crop Disease Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# Load model and JSON files
# ============================
model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

with open(DISEASE_INFO_PATH, "r") as f:
    disease_info = json.load(f)


# ============================
# Helper Functions
# ============================
def clean_label(label):
    """Convert dataset label to readable disease name."""
    return label.replace("___", " ").replace("_", " ")


def preprocess_image(image_bytes):
    """Convert uploaded image to model-ready format."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_image = image.copy()
    image = image.resize(IMG_SIZE)

    image_array = np.array(image)
    image_array = np.expand_dims(image_array, axis=0)

    if MODEL_BACKBONE == "mobilenetv2":
        image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)
    else:
        image_array = tf.keras.applications.efficientnet.preprocess_input(image_array)

    return image_array, original_image


def find_last_conv_layer(model):
    """Locate last convolutional layer for Grad-CAM."""
    for layer in reversed(model.layers):
        try:
            if len(layer.output_shape) == 4:
                return layer.name
        except Exception:
            continue
    return None


def generate_gradcam(img_array, model, class_index):
    """Generate Grad-CAM heatmap."""
    last_conv_layer_name = find_last_conv_layer(model)

    if last_conv_layer_name is None:
        return None

    grad_model = tf.keras.models.Model(
        [model.inputs],
        [model.get_layer(last_conv_layer_name).output, model.output]
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        loss = predictions[:, class_index]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = np.maximum(heatmap, 0)

    if np.max(heatmap) != 0:
        heatmap = heatmap / np.max(heatmap)

    return heatmap.numpy()


def overlay_gradcam(original_image, heatmap):
    """Overlay Grad-CAM heatmap on original image and return base64."""
    original_image = np.array(original_image)

    heatmap = cv2.resize(heatmap, (original_image.shape[1], original_image.shape[0]))
    heatmap = np.uint8(255 * heatmap)

    heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(original_image, 0.6, heatmap_color, 0.4, 0)

    _, buffer = cv2.imencode(".jpg", overlay)
    encoded = base64.b64encode(buffer).decode("utf-8")

    return f"data:image/jpeg;base64,{encoded}"


# ============================
# API Endpoints
# ============================
@app.get("/")
def home():
    return {"message": "AI Crop Disease Detection API is running"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_backbone": MODEL_BACKBONE,
        "number_of_classes": len(class_names)
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    crop_type: str = Form(None)
):
    image_bytes = await file.read()
    img_array, original_image = preprocess_image(image_bytes)

    predictions = model.predict(img_array)[0]

    top_index = int(np.argmax(predictions))
    raw_class = class_names[top_index]
    disease_name = clean_label(raw_class)
    confidence = float(predictions[top_index])

    # Top 5 predictions
    top_5_indices = predictions.argsort()[-5:][::-1]
    top_5_predictions = []
    for i in top_5_indices:
        top_5_predictions.append({
            "disease": clean_label(class_names[int(i)]),
            "confidence": round(float(predictions[int(i)]) * 100, 2)
        })

    # Grad-CAM
    heatmap = generate_gradcam(img_array, model, top_index)
    gradcam_image = overlay_gradcam(original_image, heatmap) if heatmap is not None else None

    # Disease information lookup
    info = disease_info.get(disease_name, {})

    # Low confidence fallback
    low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

    if low_confidence:
        message = "Low confidence prediction. Please upload a clearer image or consult an agricultural expert."
    else:
        message = "Prediction completed successfully."

    return {
        "disease": disease_name,
        "raw_class": raw_class,
        "crop_type": crop_type,
        "confidence": round(confidence * 100, 2),
        "low_confidence": low_confidence,
        "message": message,
        "top_5_predictions": top_5_predictions,
        "cause": info.get("cause", "Information not available."),
        "symptoms": info.get("symptoms", "Information not available."),
        "treatment": info.get("treatment", "Consult an agricultural expert for treatment guidance."),
        "prevention": info.get("prevention", "Follow good field hygiene and monitor regularly."),
        "disclaimer": info.get(
            "disclaimer",
            "This system provides general guidance only. Consult an agricultural expert before treatment."
        ),
        "gradcam_image": gradcam_image
    }
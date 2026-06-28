from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from PIL import Image
import tensorflow as tf
import numpy as np
import json
import io
import os
import datetime
import cv2
import base64
from auth import verify_password, get_password_hash, load_users, save_user, create_access_token, verify_token
from db import init_db, save_prediction as db_save_prediction, load_history, delete_prediction as db_delete_prediction

# ============================
# Configuration
# ============================
MODEL_PATH = "updated-model"
CLASS_NAMES_PATH = "class_names.json"
DISEASE_INFO_PATH = "disease_info.json"
IMG_SIZE = (300, 300)
LOW_CONFIDENCE_THRESHOLD = 0.60

# Set this based on your model:
# "mobilenetv2" or "efficientnet"
MODEL_BACKBONE = "efficientnet"


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

def load_crop_model(model_path, class_names):
    """Recreate model architecture and load weights from extracted h5 file."""
    num_classes = len(class_names)
    
    base_model = tf.keras.applications.EfficientNetB3(
        input_shape=(300, 300, 3),
        include_top=False,
        weights=None
    )
    
    inputs = tf.keras.Input(shape=(300, 300, 3))
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(256, activation="relu", name="dense_hidden")(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_output")(x)

    model = tf.keras.Model(inputs, outputs)
    model.load_weights("updated-model/model.weights.h5")
    
    return model

# ============================
# Load model and JSON files
# ============================
with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

with open(DISEASE_INFO_PATH, "r") as f:
    disease_info = json.load(f)

model = load_crop_model(MODEL_PATH, class_names)

# Initialize database tables
init_db()


# ============================
# Auth Schemas & Security
# ============================
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload.get("sub")


# ============================
# Auth Endpoints
# ============================
@app.post("/auth/signup")
def signup(req: SignupRequest):
    username = req.username.strip()
    email = req.email.strip()
    password = req.password

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")

    users = load_users()
    if username in users:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = get_password_hash(password)
    save_user(username, email, hashed)

    return {"message": "User created successfully. Please log in."}


@app.post("/auth/login")
def login(req: LoginRequest):
    username = req.username.strip()
    password = req.password

    users = load_users()
    user = users.get(username)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": username})
    return {"access_token": token, "token_type": "bearer", "username": username, "email": user["email"]}


@app.get("/auth/me")
def get_me(current_user: str = Depends(get_current_user)):
    users = load_users()
    user = users.get(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": current_user, "email": user["email"], "created_at": user["created_at"]}


# ============================
# Prediction History
# ============================

@app.get("/auth/history")
def get_history(limit: int = 50, username: str = Depends(get_current_user)):
    history = load_history(username, limit)
    return {"history": history, "count": len(history)}


@app.delete("/auth/history/{prediction_id}")
def delete_history_entry(prediction_id: str, username: str = Depends(get_current_user)):
    try:
        db_delete_prediction(prediction_id, username)
        return {"detail": "Prediction deleted"}
    except ValueError:
        raise HTTPException(status_code=404, detail="Prediction not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not authorized to delete this prediction")


# ============================
# Helper Functions
# ============================
def clean_label(label):
    """Convert dataset label to readable disease name."""
    name = label.replace("___", " ").replace("_", " ")
    return " ".join(name.split())


def is_leaf_image(image):
    """Pre-check if image looks like a leaf using relaxed criteria."""
    img_array = np.array(image)
    h, w = img_array.shape[:2]
    total = h * w

    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    green = cv2.inRange(hsv, (35, 30, 30), (85, 255, 255))
    brown = cv2.inRange(hsv, (10, 30, 30), (35, 255, 200))
    leaf_mask = cv2.bitwise_or(green, brown)
    leaf_ratio = cv2.countNonZero(leaf_mask) / total

    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    std_dev = float(np.std(gray))

    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.count_nonzero(edges) / total

    aspect_ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 1.0

    passes = 0
    if leaf_ratio > 0.05: passes += 1
    if std_dev > 20: passes += 1
    if edge_density > 0.008: passes += 1
    if aspect_ratio > 1.1: passes += 1

    return passes >= 3


def make_thumbnail(image, size=(160, 120)):
    thumb = image.copy()
    thumb.thumbnail(size, Image.LANCZOS)
    buf = io.BytesIO()
    thumb.save(buf, format="JPEG", quality=60)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


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
        if hasattr(layer, 'layers'):
            for inner_layer in reversed(layer.layers):
                try:
                    if len(inner_layer.output_shape) == 4 and not isinstance(inner_layer, tf.keras.layers.InputLayer):
                        return inner_layer.name
                except Exception:
                    continue
        try:
            if len(layer.output_shape) == 4 and not isinstance(layer, tf.keras.layers.InputLayer):
                return layer.name
        except Exception:
            continue
    return None


def generate_gradcam(img_array, model, class_index):
    """Generate Grad-CAM heatmap."""
    last_conv_layer_name = find_last_conv_layer(model)
    
    if last_conv_layer_name is None:
        return None
    
    # Find the base_model (the layer with many sub-layers like MobileNetV2)
    base_model = None
    for layer in model.layers:
        if hasattr(layer, 'layers') and len(layer.layers) > 10:
            base_model = layer
            break
    
    if base_model is None:
        return None
    
    # Find the target layer inside the base_model
    target_layer = None
    for layer in base_model.layers:
        if layer.name == last_conv_layer_name:
            target_layer = layer
            break
    
    if target_layer is None:
        return None

    try:
        # Create a model that outputs the last conv layer and the base model's final output
        base_grad_model = tf.keras.Model(
            [base_model.input],
            [target_layer.output, base_model.output]
        )
        
        with tf.GradientTape() as tape:
            # 1. Get conv output and base output
            conv_outputs, base_outputs = base_grad_model(img_array)
            
            # 2. Pass base_outputs through the remaining top layers of the main model
            x = base_outputs
            # Skip InputLayer (0) and base_model (find its index)
            start_idx = list(model.layers).index(base_model) + 1
            for layer in model.layers[start_idx:]:
                x = layer(x)
            
            predictions = x
            loss = predictions[:, class_index]
        
        # Calculate gradients of the loss w.r.t. the conv output
        grads = tape.gradient(loss, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = np.maximum(heatmap, 0)
        
        if np.max(heatmap) != 0:
            heatmap = heatmap / np.max(heatmap)
        
        return heatmap.numpy()
        
    except Exception as e:
        print(f"Grad-CAM generation failed: {e}")
        return None




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
    crop_type: str = Form(None),
    username: str = Depends(get_current_user)
):
    image_bytes = await file.read()
    img_array, original_image = preprocess_image(image_bytes)
    thumbnail = make_thumbnail(original_image)

    # Pre-check: does the image look like a leaf?
    if not is_leaf_image(original_image):
        result = {
            "disease": "Not a Leaf",
            "raw_class": "Unknown___Unknown",
            "crop_type": crop_type,
            "crop_mismatch": False,
            "is_unknown": True,
            "not_leaf": True,
            "confidence": 0,
            "low_confidence": True,
            "message": "Please upload a clear leaf image. The uploaded image does not appear to be a crop leaf.",
            "top_5_predictions": [],
            "raw_probabilities": [],
            "cause": "Image does not contain a recognizable leaf.",
            "symptoms": "No leaf detected in the image.",
            "treatment": "Take a new photo focused on a single crop leaf with a plain background.",
            "prevention": "Ensure good lighting and focus when taking photos of crop leaves.",
            "disclaimer": "AI result should be verified if symptoms appear later.",
            "gradcam_image": None
        }
        db_save_prediction(username, result, thumbnail)
        return result

    predictions = model.predict(img_array)[0]

    top_index = int(np.argmax(predictions))

    # Safety check for class_names index
    if top_index >= len(class_names):
        raw_class = f"Unknown_Class_{top_index}"
        disease_name = f"Unknown Disease (Class {top_index})"
    else:
        raw_class = class_names[top_index]
        disease_name = clean_label(raw_class)

    # Check if predicted crop matches selected crop type
    crop_mismatch = False
    if crop_type:
        pred_crop = raw_class.split("___")[0].split("__")[0].split("_")[0]
        if crop_type.lower() != pred_crop.lower():
            crop_mismatch = True

    confidence = float(predictions[top_index])

    # Unknown detection: low confidence + small margin between top predictions
    sorted_preds = np.sort(predictions)[::-1]
    top1, top2 = float(sorted_preds[0]), float(sorted_preds[1]) if len(sorted_preds) > 1 else 0
    confidence_margin = (top1 - top2) * 100
    is_unknown_input = confidence < 0.50 or (confidence < 0.65 and confidence_margin < 10)

    if is_unknown_input:
        raw_class = "Unknown___Unknown"
        disease_name = "Unknown"

    # Top 5 predictions
    top_5_indices = predictions.argsort()[-5:][::-1]
    top_5_predictions = []
    for i in top_5_indices:
        try:
            disease = clean_label(class_names[int(i)])
        except IndexError:
            disease = f"Unknown Disease (Class {int(i)})"
            
        pred_info = disease_info.get(disease, {})
        top_5_predictions.append({
            "disease": disease,
            "disease_np": pred_info.get("disease_np", disease),
            "confidence": round(float(predictions[int(i)]) * 100, 2)
        })

    # Grad-CAM
    heatmap = generate_gradcam(img_array, model, top_index)
    gradcam_image = overlay_gradcam(original_image, heatmap) if heatmap is not None else None

    # Disease information lookup
    info = disease_info.get(disease_name, {})

    # Low confidence fallback
    confidence_pct = round(confidence * 100, 2)
    low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

    if is_unknown_input:
        message = "Please upload a clear leaf image. This image does not match any known crop disease."
    elif crop_mismatch:
        message = f"This image appears to be a {pred_crop} leaf, not {crop_type}. Please upload a {crop_type} leaf for accurate results."
    elif low_confidence:
        message = "Low confidence prediction. Please upload a clearer image or consult an agricultural expert."
    else:
        message = "Prediction completed successfully."

    raw_probabilities = [
        {
            "index": int(i),
            "class_name": class_names[int(i)] if int(i) < len(class_names) else f"Unknown_{int(i)}",
            "probability": round(float(predictions[int(i)]) * 100, 2)
        }
        for i in range(len(predictions))
    ]

    result = {
        "disease": disease_name,
        "disease_np": info.get("disease_np", disease_name),
        "description": info.get("description", "No description available."),
        "description_np": info.get("description_np", "विवरण उपलब्ध छैन।"),
        "raw_class": raw_class,
        "crop_type": crop_type,
        "crop_mismatch": crop_mismatch,
        "is_unknown": is_unknown_input,
        "not_leaf": False,
        "confidence": confidence_pct,
        "low_confidence": low_confidence,
        "message": message,
        "top_5_predictions": top_5_predictions,
        "raw_probabilities": raw_probabilities,
        "cause": info.get("cause", "Information not available."),
        "cause_np": info.get("cause_np", "जानकारी उपलब्ध छैन।"),
        "symptoms": info.get("symptoms", "Information not available."),
        "symptoms_np": info.get("symptoms_np", "जानकारी उपलब्ध छैन।"),
        "treatment": info.get("treatment", "Consult an agricultural expert for treatment guidance."),
        "treatment_np": info.get("treatment_np", "कृषि विज्ञको सल्लाह लिनुहोस्।"),
        "prevention": info.get("prevention", "Follow good field hygiene and monitor regularly."),
        "prevention_np": info.get("prevention_np", "नियमित अनुगमन गर्ने।"),
        "disclaimer": info.get(
            "disclaimer",
            "This system provides general guidance only. Consult an agricultural expert before treatment."
        ),
        "gradcam_image": gradcam_image
    }
    db_save_prediction(username, result, thumbnail)
    return result
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB2
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
# Final trained model. class_names.json may or may not include the Unknown class
# depending on the training run, so nothing here assumes its presence: unknown
# inputs are caught by the not-a-leaf pre-check, the confidence/margin/entropy
# heuristic, the open-set distance rule, AND -- when the class does exist -- the
# model predicting UNKNOWN_CLASS directly.
# final_field_Model is the Sep 2026 run: Phase 2 fine-tuned on the lab set PLUS
# the ~1.6k real field photos. Final_Model is kept only as a fallback -- its
# phase 2 output layer is still at Glorot init (untrained) and scores at chance.
# Override with MODEL_PATH/CLASS_NAMES_PATH to fall back to an older run.
MODEL_PATH = os.getenv("MODEL_PATH", "final_field_Model")
CLASS_NAMES_PATH = os.getenv(
    "CLASS_NAMES_PATH", os.path.join(MODEL_PATH, "class_names.json")
)
DISEASE_INFO_PATH = "disease_info.json"
TREATMENTS_PATH = "treatments.json"

# The catch-all class produced by the training notebook. Must match
# UNKNOWN_CLASS in scripts/train_colab.ipynb section 15b.
UNKNOWN_CLASS = "Unknown___Unknown"
IMG_SIZE = (224, 224)
LOW_CONFIDENCE_THRESHOLD = 0.60
# Isolate the leaf from a busy field photo before classifying, so the model
# (trained on clean lab leaves) sees a lab-like centred leaf. Set LEAF_CROP=0
# to disable.
LEAF_CROP = os.getenv("LEAF_CROP", "1") == "1"

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
    
    base_model = EfficientNetB2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights=None
    )
    
    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    x = tf.keras.layers.Dense(512, activation="relu", name="dense_hidden")(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_output")(x)

    model = tf.keras.Model(inputs, outputs)
    
    phase2_final_path = os.path.join(model_path, "best_model_phase2_final.weights.h5")
    phase2_path = os.path.join(model_path, "best_model_phase2.weights.h5")
    phase1_path = os.path.join(model_path, "best_model_phase1.weights.h5")
    fallback_path = os.path.join(model_path, "model.weights.h5")

    if os.path.exists(phase2_final_path):
        print(f"Loading Phase 2 (final) weights: {phase2_final_path}")
        model.load_weights(phase2_final_path)
    elif os.path.exists(phase2_path):
        print(f"Loading Phase 2 weights: {phase2_path}")
        model.load_weights(phase2_path)
    elif os.path.exists(phase1_path):
        print(f"Loading Phase 1 weights: {phase1_path}")
        model.load_weights(phase1_path)
    elif os.path.exists(fallback_path):
        print(f"Loading weights: {fallback_path}")
        model.load_weights(fallback_path)
    else:
        raise FileNotFoundError(f"No weights found in {model_path}")

    return model


def check_weights_match(weights_file, n_classes):
    """The weights file and class_names.json are a matched pair produced by the
    same training run. If the classifier head has a different number of outputs
    than class_names.json has entries, load_weights fails with an opaque shape
    error -- so surface the real cause up front."""
    try:
        import h5py
        with h5py.File(weights_file, "r") as f:
            found = []

            def walk(g, path=""):
                for k in g:
                    item, cur = g[k], f"{path}/{k}"
                    if isinstance(item, h5py.Dataset):
                        # classifier kernel: 2-D and not inside the backbone
                        if len(item.shape) == 2 and "functional" not in cur and "optimizer" not in cur:
                            found.append(item.shape[-1])
                    else:
                        walk(item, cur)

            walk(f)
        if found and found[-1] != n_classes:
            print(
                f"\n*** WEIGHTS / CLASS-NAMES MISMATCH ***\n"
                f"  {weights_file} was trained with {found[-1]} classes\n"
                f"  class_names.json lists {n_classes} classes\n"
                f"  These must come from the SAME training run. Re-download both\n"
                f"  from the notebook, or set MODEL_PATH/CLASS_NAMES_PATH to an\n"
                f"  older matching pair (e.g. MODEL_PATH=best_model).\n"
            )
    except ImportError:
        pass  # h5py unavailable: fall through to Keras' own error

# ============================
# Load model and JSON files
# ============================
with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

with open(DISEASE_INFO_PATH, "r") as f:
    disease_info = json.load(f)

# Per-disease chemical/cultural control options. Optional: an older deployment
# without the file still serves predictions, just with no treatment card.
try:
    with open(TREATMENTS_PATH, "r") as f:
        treatments = json.load(f)
    print(f"Loaded treatment options for {len(treatments)} diseases.")
except FileNotFoundError:
    treatments = {}
    print(f"No {TREATMENTS_PATH} - predictions will carry no treatment recommendations.")

# Shown with every recommendation. Pesticide registration differs by country and
# the label on the bottle always overrides anything this app says.
TREATMENT_DISCLAIMER = (
    "Always read and follow the product label. Doses are general guidance - confirm "
    "the rate, the pre-harvest interval and local registration with your agrovet or "
    "agriculture office before spraying. Wear gloves, a mask and long sleeves."
)
TREATMENT_DISCLAIMER_NP = (
    "सधैं औषधिको लेबल पढेर पालना गर्नुहोस्। यहाँ दिइएको मात्रा सामान्य निर्देशन मात्र हो - "
    "छर्नु अघि मात्रा, बाली टिप्नु अघिको प्रतीक्षा अवधि र स्थानीय दर्ता आफ्नो कृषि पसल वा "
    "कृषि कार्यालयसँग पक्का गर्नुहोस्। पन्जा, मास्क र लामो बाहुला लगाउनुहोस्।"
)

# The crops this model actually covers, derived from class_names so the user-facing
# message can never drift from the trained classes.
SUPPORTED_CROPS = sorted({c.split("__")[0] for c in class_names if c != UNKNOWN_CLASS})
SUPPORTED_CROPS_TEXT = (
    ", ".join(SUPPORTED_CROPS[:-1]) + " and " + SUPPORTED_CROPS[-1]
    if len(SUPPORTED_CROPS) > 1 else (SUPPORTED_CROPS[0] if SUPPORTED_CROPS else "none")
)

# A confident prediction of the Unknown class means "this is a leaf, but not one
# of our crops". Below this it is just an uncertain guess about a crop we do cover.
UNSUPPORTED_CONFIDENCE = 0.50

for _w in ("best_model_phase2_final.weights.h5", "best_model_phase2.weights.h5",
           "best_model_phase1.weights.h5", "model.weights.h5"):
    _p = os.path.join(MODEL_PATH, _w)
    if os.path.exists(_p):
        check_weights_match(_p, len(class_names))
        break

model = load_crop_model(MODEL_PATH, class_names)

# ============================
# Open-set rejection (untrained crops)
# ============================
# A 52-way softmax is closed-set: an untrained crop (guava, papaya, coffee...)
# is always forced onto some trained class, often confidently, so confidence
# thresholds alone cannot reject it. ood_stats.npz holds one L2-normalised
# centroid per trained class in the penultimate feature space; an image whose
# highest cosine similarity to any centroid falls below the calibrated
# threshold is unfamiliar and is reported as Unknown. Produced by section 15c
# of scripts/train_colab.ipynb and must come from the SAME training run as the
# weights. If the file is absent the API still works, using the softmax
# heuristic alone.
OOD_STATS_PATH = os.path.join(MODEL_PATH, "ood_stats.npz")
ood_centroids = None
ood_threshold = None
ood_model = None

if os.path.exists(OOD_STATS_PATH):
    try:
        _stats = np.load(OOD_STATS_PATH, allow_pickle=False)
        ood_centroids = _stats["centroids"].astype(np.float32)
        ood_threshold = float(_stats["threshold"])
        _layer = str(_stats["embed_layer"]) if "embed_layer" in _stats else "dense_hidden"
        ood_model = tf.keras.Model(
            model.input, [model.output, model.get_layer(_layer).output]
        )
        print(
            f"Open-set rejection enabled: {ood_centroids.shape[0]} centroids, "
            f"threshold {ood_threshold:.4f} (layer '{_layer}')"
        )
    except Exception as exc:
        ood_centroids = ood_threshold = ood_model = None
        print(f"WARNING: could not load {OOD_STATS_PATH} ({exc}). "
              f"Untrained crops will only be caught by the softmax heuristic.")
else:
    print(f"No {OOD_STATS_PATH} - untrained crops are only caught by the softmax "
          f"heuristic. Run section 15c of the training notebook to generate it.")


def open_set_score(embedding):
    """Highest cosine similarity between this embedding and any trained-class
    centroid. Low means the image does not resemble any crop the model knows."""
    e = np.asarray(embedding, dtype=np.float32).reshape(-1)
    e = e / (np.linalg.norm(e) + 1e-9)
    return float(np.max(ood_centroids @ e))

# Initialize database tables (optional — auth/history is disabled by default,
# and /predict does not use the DB, so a missing/unreachable Postgres must not
# stop the server from starting).
try:
    init_db()
    print("Database connected and initialized.")
except Exception as e:
    print(f"WARNING: database unavailable ({e}). "
          "Auth/history endpoints will not work, but /predict is fine.")


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


def crop_to_leaf(pil_image):
    """Isolate the leaf region from a busy field photo so the model sees a
    lab-like centred leaf instead of soil, sky, and neighbouring plants.

    Builds a foreground mask from Excess-Green (healthy tissue) OR high
    saturation (yellow/brown diseased tissue), takes the largest blob, and
    crops to its padded bounding box. Every failure path returns the ORIGINAL
    image unchanged, so clean lab photos and unreliable masks are never mangled.
    """
    try:
        rgb = np.array(pil_image)
        if rgb.ndim != 3 or rgb.shape[2] != 3:
            return pil_image
        h, w = rgb.shape[:2]
        R = rgb[:, :, 0].astype(np.int32)
        G = rgb[:, :, 1].astype(np.int32)
        B = rgb[:, :, 2].astype(np.int32)

        exg = 2 * G - R - B                       # green vegetation
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        green = exg > 15
        # Bright yellow/orange diseased tissue. Deliberately narrow so dull brown
        # soil (which shares the hue) is NOT swept in as foreground.
        disease = (H >= 15) & (H <= 45) & (S > 110) & (V > 90)
        mask = ((green | disease)).astype(np.uint8) * 255

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return pil_image
        largest = max(contours, key=cv2.contourArea)
        area_frac = cv2.contourArea(largest) / float(h * w)

        # Leaf already fills the frame (lab photo) or mask is too small/large
        # to trust -> leave the image alone.
        if area_frac < 0.05 or area_frac > 0.90:
            return pil_image

        x, y, bw, bh = cv2.boundingRect(largest)
        pad_x, pad_y = int(bw * 0.10), int(bh * 0.10)
        x0, y0 = max(0, x - pad_x), max(0, y - pad_y)
        x1, y1 = min(w, x + bw + pad_x), min(h, y + bh + pad_y)

        # Reject absurdly thin crops.
        if (x1 - x0) < w * 0.15 or (y1 - y0) < h * 0.15:
            return pil_image

        return pil_image.crop((x0, y0, x1, y1))
    except Exception:
        return pil_image


def preprocess_image(image_bytes):
    """Convert uploaded image to model-ready format."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if LEAF_CROP:
        image = crop_to_leaf(image)               # focus on the leaf, not the scene
    original_image = image.copy()                 # Grad-CAM aligns to the cropped view
    image = image.resize(IMG_SIZE)

    image_array = np.array(image)
    image_array = np.expand_dims(image_array, axis=0)

    if MODEL_BACKBONE == "mobilenetv2":
        image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)
    else:
        image_array = tf.keras.applications.efficientnet.preprocess_input(image_array)

    return image_array, original_image


def _output_rank(layer):
    """Rank of a layer's output shape, or None if it has no single output.

    Keras 3 removed Layer.output_shape, so the Keras 2 spelling raises
    AttributeError on every layer. That silently made find_last_conv_layer
    return the base model wrapper instead of a conv layer, which disabled
    Grad-CAM entirely."""
    for attr in ("output", "output_shape"):
        try:
            value = getattr(layer, attr)
            shape = value.shape if attr == "output" else value
            return len(shape)
        except Exception:
            continue
    return None


def find_last_conv_layer(model):
    """Locate last convolutional layer for Grad-CAM."""
    for layer in reversed(model.layers):
        if hasattr(layer, 'layers'):
            for inner_layer in reversed(layer.layers):
                if isinstance(inner_layer, tf.keras.layers.InputLayer):
                    continue
                if _output_rank(inner_layer) == 4:
                    return inner_layer.name
        if isinstance(layer, tf.keras.layers.InputLayer):
            continue
        if _output_rank(layer) == 4:
            return layer.name
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
        # np.maximum on a tensor already returns an ndarray, so do not call
        # .numpy() on the result -- that raises AttributeError and the except
        # below swallows it, silently disabling the heatmap.
        heatmap = np.maximum(np.asarray(heatmap), 0)

        if np.max(heatmap) != 0:
            heatmap = heatmap / np.max(heatmap)

        return heatmap
        
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


def _to_native(obj):
    """Recursively convert numpy types to native Python for JSON serialization."""
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_native(v) for v in obj]
    return obj


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    crop_type: str = Form(None),
    # username: str = Depends(get_current_user)  # auth commented out
):
    image_bytes = await file.read()
    img_array, original_image = preprocess_image(image_bytes)
    thumbnail = make_thumbnail(original_image)

    # Pre-check: does the image look like a leaf?
    if not is_leaf_image(original_image):
        result = {
            "disease": "Not a Leaf",
            "disease_np": "पात होइन",
            "raw_class": UNKNOWN_CLASS,
            "crop_type": crop_type,
            "crop_mismatch": False,
            "is_unknown": True,
            "not_leaf": True,
            "unknown_reason": "not_leaf",
            "supported_crops": SUPPORTED_CROPS,
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
        result = _to_native(result)
        # db_save_prediction(username, result, thumbnail)  # auth commented out
        return result

    # One forward pass yields both the class probabilities and the penultimate
    # embedding used for open-set rejection.
    ood_score = None
    if ood_model is not None:
        _probs, _emb = ood_model.predict(img_array, verbose=0)
        predictions = _probs[0]
        ood_score = open_set_score(_emb[0])
    else:
        predictions = model.predict(img_array, verbose=0)[0]

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

    # Unknown detection: low confidence + margin + entropy
    sorted_preds = np.sort(predictions)[::-1]
    top1, top2 = float(sorted_preds[0]), float(sorted_preds[1]) if len(sorted_preds) > 1 else 0
    confidence_margin = (top1 - top2) * 100

    # Normalized entropy: 0 = model is certain, 1 = model is guessing uniformly
    probs = np.clip(predictions, 1e-12, 1.0)
    entropy = -np.sum(probs * np.log(probs)) / np.log(len(probs))

    # The softmax heuristic catches genuinely uncertain predictions. The
    # feature-distance rule catches the case softmax cannot: a crop the model
    # was never trained on, which it classifies confidently as something else.
    unfamiliar = ood_score is not None and ood_score < ood_threshold

    is_unknown_input = (
        # The model itself picked the Unknown class. Without this the softmax
        # heuristic never fires on a *confident* Unknown prediction, so the API
        # reported is_unknown=False and the display name fell through to
        # clean_label("Unknown___Unknown") == "Unknown Unknown", which is also
        # missing from disease_info.json. Mirrors backend_decision() in the
        # training notebook.
        raw_class == UNKNOWN_CLASS
        or confidence < 0.30
        or (confidence < 0.50 and confidence_margin < 5)
        or (entropy > 0.90)
        or unfamiliar
    )

    # Two very different situations land here and the user needs to know which:
    #   unsupported_crop - it looks like a leaf, just not a crop this model covers
    #   uncertain        - probably a supported crop, but the photo is unclear
    # "Unknown" told the user neither of those things.
    unknown_reason = None
    if is_unknown_input:
        unsupported = unfamiliar or (
            raw_class == UNKNOWN_CLASS and confidence >= UNSUPPORTED_CONFIDENCE
        )
        unknown_reason = "unsupported_crop" if unsupported else "uncertain"
        raw_class = UNKNOWN_CLASS
        disease_name = "Crop Not Supported" if unsupported else "Not Identified"

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

    if unknown_reason == "unsupported_crop":
        message = (f"This crop is not covered by CropSense. The leaf does not match any of "
                   f"the {len(SUPPORTED_CROPS)} crops this project was trained on: "
                   f"{SUPPORTED_CROPS_TEXT}.")
    elif unknown_reason == "uncertain":
        message = ("This leaf could not be identified confidently. Take a closer, sharper "
                   "photo of a single leaf in even daylight and try again.")
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
        "entropy": round(float(entropy), 4),
        "ood_score": round(ood_score, 4) if ood_score is not None else None,
        "unfamiliar_crop": bool(unfamiliar),
        "unknown_reason": unknown_reason,
        "treatments": treatments.get(disease_name, []),
        "treatment_disclaimer": TREATMENT_DISCLAIMER,
        "treatment_disclaimer_np": TREATMENT_DISCLAIMER_NP,
        "supported_crops": SUPPORTED_CROPS,
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
    result = _to_native(result)
    # db_save_prediction(username, result, thumbnail)  # auth commented out
    return result
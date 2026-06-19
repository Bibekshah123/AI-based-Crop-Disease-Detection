# AI-Based Crop Disease Detection System — Project Implementation Guide

## 1. Project Overview

This project is a **web-based AI crop disease detection system** designed for farmers, agricultural officers, and extension workers. The system allows a user to upload a crop leaf image through a browser-based interface. A trained deep learning model predicts the exact crop disease class, provides a confidence score, shows a Grad-CAM heatmap for explainability, and returns general treatment/prevention guidance.

The system should not only say **healthy/unhealthy**. It must identify the **specific disease name**, for example:

- `Potato Late Blight`
- `Tomato Early Blight`
- `Corn Common Rust`
- `Apple Black Rot`

The web app must also display:

- disease name
- confidence score
- top-5 possible predictions
- cause
- symptoms
- treatment guidance
- prevention guidance
- Grad-CAM explanation image
- disclaimer advising expert consultation

---

## 2. Main Technology Stack

Use the following stack unless there is a strong reason to change it:

```text
Dataset: PlantVillage or extracted custom crop disease image dataset
Model: EfficientNetB3 transfer learning
Framework: TensorFlow / Keras
Backend: FastAPI
Frontend: React.js + CSS / Tailwind CSS
Database: Supabase PostgreSQL
Image Storage: Cloudinary
Explainability: Grad-CAM
Deployment: Render for backend, Vercel for frontend
```

---

## 3. Expected Final System Flow

```text
User opens React web app
        ↓
User selects crop type
        ↓
User uploads leaf image
        ↓
Frontend sends image to FastAPI /predict endpoint
        ↓
Backend validates image quality
        ↓
Backend preprocesses image
        ↓
EfficientNetB3 predicts disease class
        ↓
Backend calculates confidence score and top-5 predictions
        ↓
Backend generates Grad-CAM heatmap
        ↓
Backend fetches disease treatment guidance from disease_info.json
        ↓
Backend returns JSON response
        ↓
Frontend displays disease, confidence, treatment, prevention and Grad-CAM
        ↓
Prediction is stored in Supabase and image/Grad-CAM can be stored in Cloudinary
```

---

## 4. Recommended Repository Structure

```text
ai-crop-disease-detection/
│
├── README.md
├── .gitignore
├── project_implementation_guide.md
│
├── dataset_raw/
│   └── class folders from original dataset
│
├── dataset_split/
│   ├── train/
│   ├── validation/
│   └── test/
│
├── model_training/
│   ├── split_dataset.py
│   ├── train_model.py
│   ├── test_prediction.py
│   ├── class_names.json
│   ├── disease_info.json
│   ├── efficientnetb3_model.h5
│   ├── classification_report.txt
│   └── confusion_matrix.png
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── efficientnetb3_model.h5
│   ├── class_names.json
│   ├── disease_info.json
│   └── .env.example
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   └── supabase_setup.md
│
├── deployment/
│   ├── render_backend.md
│   ├── vercel_frontend.md
│   └── environment_variables.md
│
└── testing/
    ├── model_evaluation.md
    ├── api_test_report.md
    ├── ui_test_cases.md
    └── uat_feedback.md
```

---

## 5. Dataset Structure Before Splitting

The original dataset should be organised by class folders:

```text
dataset_raw/
├── Apple___Black_rot/
├── Apple___healthy/
├── Corn___Common_rust/
├── Potato___Early_blight/
├── Potato___Late_blight/
├── Potato___healthy/
├── Tomato___Early_blight/
├── Tomato___Late_blight/
└── ...
```

Each folder is one classification label.

---

## 6. Dataset Structure After Splitting

Split dataset into:

```text
Train: 70%
Validation: 15%
Test: 15%
```

Final structure:

```text
dataset_split/
├── train/
│   ├── Potato___Early_blight/
│   ├── Potato___Late_blight/
│   └── ...
│
├── validation/
│   ├── Potato___Early_blight/
│   ├── Potato___Late_blight/
│   └── ...
│
└── test/
    ├── Potato___Early_blight/
    ├── Potato___Late_blight/
    └── ...
```

---

## 7. Dataset Splitting Script

Create `model_training/split_dataset.py`:

```python
import os
import shutil
import random
from pathlib import Path
from tqdm import tqdm

SOURCE_DIR = "../dataset_raw"
OUTPUT_DIR = "../dataset_split"

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".webp"]
random.seed(42)

for split in ["train", "validation", "test"]:
    os.makedirs(os.path.join(OUTPUT_DIR, split), exist_ok=True)

class_folders = [
    folder for folder in os.listdir(SOURCE_DIR)
    if os.path.isdir(os.path.join(SOURCE_DIR, folder))
]

print("Total classes found:", len(class_folders))

for class_name in class_folders:
    class_path = os.path.join(SOURCE_DIR, class_name)

    images = [
        img for img in os.listdir(class_path)
        if Path(img).suffix.lower() in IMAGE_EXTENSIONS
    ]

    random.shuffle(images)

    total = len(images)
    train_count = int(total * TRAIN_RATIO)
    val_count = int(total * VAL_RATIO)

    train_images = images[:train_count]
    val_images = images[train_count:train_count + val_count]
    test_images = images[train_count + val_count:]

    for split in ["train", "validation", "test"]:
        os.makedirs(os.path.join(OUTPUT_DIR, split, class_name), exist_ok=True)

    for img in tqdm(train_images, desc=f"Train - {class_name}"):
        shutil.copy2(os.path.join(class_path, img), os.path.join(OUTPUT_DIR, "train", class_name, img))

    for img in tqdm(val_images, desc=f"Validation - {class_name}"):
        shutil.copy2(os.path.join(class_path, img), os.path.join(OUTPUT_DIR, "validation", class_name, img))

    for img in tqdm(test_images, desc=f"Test - {class_name}"):
        shutil.copy2(os.path.join(class_path, img), os.path.join(OUTPUT_DIR, "test", class_name, img))

    print(f"{class_name}: Train={len(train_images)}, Val={len(val_images)}, Test={len(test_images)}")

print("Dataset split completed successfully!")
```

Run:

```bash
cd model_training
python split_dataset.py
```

---

## 8. Disease Information File

Create `disease_info.json`. This file maps prediction labels to cause, symptoms, treatment, prevention and disclaimer.

Example:

```json
{
  "Potato Late blight": {
    "cause": "Fungal-like disease caused by Phytophthora infestans.",
    "symptoms": "Dark brown or black spots on leaves and stems.",
    "treatment": "Remove infected leaves and consult an agricultural officer before applying recommended fungicide.",
    "prevention": "Avoid excess moisture, improve air circulation, and use disease-free seed potatoes.",
    "disclaimer": "This is general guidance only. Consult an agricultural expert before treatment."
  },
  "Potato Early blight": {
    "cause": "Fungal disease commonly caused by Alternaria solani.",
    "symptoms": "Brown circular spots with concentric rings on older leaves.",
    "treatment": "Remove infected leaves and use approved fungicide under expert guidance.",
    "prevention": "Rotate crops, avoid overhead irrigation, and maintain field hygiene.",
    "disclaimer": "This is general guidance only. Consult an agricultural expert before treatment."
  },
  "Tomato healthy": {
    "cause": "No visible disease detected.",
    "symptoms": "Leaf appears healthy.",
    "treatment": "No treatment required.",
    "prevention": "Continue regular monitoring and good field management.",
    "disclaimer": "This result is AI-generated and should be verified if symptoms appear later."
  }
}
```

Important: the cleaned model label must match the key in this JSON file.

---

## 9. Model Training Script

Create `model_training/train_model.py`:

```python
import os
import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

TRAIN_DIR = "../dataset_split/train"
VAL_DIR = "../dataset_split/validation"
TEST_DIR = "../dataset_split/test"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS_PHASE_1 = 10
EPOCHS_PHASE_2 = 10

train_data = tf.keras.preprocessing.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_data = tf.keras.preprocessing.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

test_data = tf.keras.preprocessing.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

class_names = train_data.class_names
num_classes = len(class_names)

with open("class_names.json", "w") as f:
    json.dump(class_names, f, indent=4)

print("Classes:", class_names)
print("Number of classes:", num_classes)

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.15),
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.2),
])

AUTOTUNE = tf.data.AUTOTUNE
train_data = train_data.prefetch(buffer_size=AUTOTUNE)
val_data = val_data.prefetch(buffer_size=AUTOTUNE)
test_data = test_data.prefetch(buffer_size=AUTOTUNE)

base_model = EfficientNetB3(
    include_top=False,
    weights="imagenet",
    input_shape=(224, 224, 3)
)

base_model.trainable = False

inputs = layers.Input(shape=(224, 224, 3))
x = data_augmentation(inputs)
x = tf.keras.applications.efficientnet.preprocess_input(x)
x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)

model = models.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

callbacks_phase1 = [
    EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
    ModelCheckpoint("best_model_phase1.h5", monitor="val_accuracy", save_best_only=True),
    ReduceLROnPlateau(monitor="val_loss", factor=0.2, patience=3)
]

print("Starting Phase 1 training...")
model.fit(
    train_data,
    validation_data=val_data,
    epochs=EPOCHS_PHASE_1,
    callbacks=callbacks_phase1
)

base_model.trainable = True

for layer in base_model.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

callbacks_phase2 = [
    EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
    ModelCheckpoint("efficientnetb3_model.h5", monitor="val_accuracy", save_best_only=True),
    ReduceLROnPlateau(monitor="val_loss", factor=0.2, patience=3)
]

print("Starting Phase 2 fine-tuning...")
model.fit(
    train_data,
    validation_data=val_data,
    epochs=EPOCHS_PHASE_2,
    callbacks=callbacks_phase2
)

model.save("efficientnetb3_model.h5")
print("Model saved as efficientnetb3_model.h5")

test_loss, test_accuracy = model.evaluate(test_data)
print("Test Accuracy:", test_accuracy)

y_true = []
y_pred = []

for images, labels in test_data:
    preds = model.predict(images)
    y_true.extend(labels.numpy())
    y_pred.extend(np.argmax(preds, axis=1))

report = classification_report(y_true, y_pred, target_names=class_names)
print(report)

with open("classification_report.txt", "w") as f:
    f.write(report)

cm = confusion_matrix(y_true, y_pred)

plt.figure(figsize=(14, 12))
sns.heatmap(cm, annot=False, cmap="Blues", xticklabels=class_names, yticklabels=class_names)
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")
plt.xticks(rotation=90)
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig("confusion_matrix.png")
plt.show()
```

---

## 10. Single Image Prediction Test

Create `model_training/test_prediction.py`:

```python
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image

MODEL_PATH = "efficientnetb3_model.h5"
CLASS_NAMES_PATH = "class_names.json"

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

def clean_label(label):
    return label.replace("___", " ").replace("_", " ")

img_path = "sample_leaf.jpg"

img = image.load_img(img_path, target_size=(224, 224))
img_array = image.img_to_array(img)
img_array = np.expand_dims(img_array, axis=0)
img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)

preds = model.predict(img_array)[0]

top_index = np.argmax(preds)
disease = clean_label(class_names[top_index])
confidence = float(preds[top_index])

print("Disease:", disease)
print("Confidence:", round(confidence * 100, 2), "%")

print("Top 5 Predictions:")
for i in preds.argsort()[-5:][::-1]:
    print(clean_label(class_names[i]), "-", round(float(preds[i]) * 100, 2), "%")
```

---

## 11. Backend Requirements

Create `backend/requirements.txt`:

```txt
fastapi
uvicorn
python-multipart
tensorflow
numpy
pillow
opencv-python
matplotlib
```

Copy these files from `model_training/` into `backend/`:

```text
efficientnetb3_model.h5
class_names.json
disease_info.json
```

---

## 12. FastAPI Backend

Create `backend/main.py`:

```python
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
import numpy as np
import json
import io
import cv2
import base64

app = FastAPI(title="AI-Based Crop Disease Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = tf.keras.models.load_model("efficientnetb3_model.h5")

with open("class_names.json", "r") as f:
    class_names = json.load(f)

with open("disease_info.json", "r") as f:
    disease_info = json.load(f)

IMG_SIZE = (224, 224)
LOW_CONFIDENCE_THRESHOLD = 0.60

def clean_label(label):
    return label.replace("___", " ").replace("_", " ")

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)
    return img_array, img

def find_last_conv_layer(model):
    for layer in reversed(model.layers):
        try:
            if len(layer.output_shape) == 4:
                return layer.name
        except Exception:
            continue
    return None

def generate_gradcam(img_array, model, class_index):
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

def overlay_gradcam(original_img, heatmap):
    original_img = np.array(original_img)
    heatmap = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
    heatmap = np.uint8(255 * heatmap)
    heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(original_img, 0.6, heatmap_color, 0.4, 0)
    _, buffer = cv2.imencode(".jpg", overlay)
    encoded = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"

@app.get("/")
def home():
    return {"message": "AI Crop Disease Detection API is running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "classes": len(class_names)
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...), crop_type: str = Form(None)):
    image_bytes = await file.read()
    img_array, original_img = preprocess_image(image_bytes)

    predictions = model.predict(img_array)[0]

    top_index = int(np.argmax(predictions))
    raw_label = class_names[top_index]
    disease_name = clean_label(raw_label)
    confidence = float(predictions[top_index])

    top_5_indices = predictions.argsort()[-5:][::-1]
    top_5_predictions = []

    for i in top_5_indices:
        top_5_predictions.append({
            "disease": clean_label(class_names[int(i)]),
            "confidence": round(float(predictions[int(i)]) * 100, 2)
        })

    heatmap = generate_gradcam(img_array, model, top_index)
    gradcam_image = overlay_gradcam(original_img, heatmap) if heatmap is not None else None

    info = disease_info.get(disease_name, {})
    is_low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

    if is_low_confidence:
        message = "Low confidence prediction. Please upload a clearer image or consult an agricultural expert."
    else:
        message = "Prediction completed successfully."

    return {
        "disease": disease_name,
        "raw_class": raw_label,
        "crop_type": crop_type,
        "confidence": round(confidence * 100, 2),
        "low_confidence": is_low_confidence,
        "message": message,
        "top_5_predictions": top_5_predictions,
        "cause": info.get("cause", "Information not available."),
        "symptoms": info.get("symptoms", "Information not available."),
        "treatment": info.get("treatment", "Consult an agricultural expert for treatment guidance."),
        "prevention": info.get("prevention", "Follow good field hygiene and monitor regularly."),
        "disclaimer": info.get("disclaimer", "This system provides general guidance only. Consult an agricultural expert before treatment."),
        "gradcam_image": gradcam_image
    }
```

Run backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

---

## 13. React Frontend

Create frontend:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios
npm run dev
```

Replace `frontend/src/App.jsx`:

```jsx
import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [cropType, setCropType] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const crops = ["Tomato", "Potato", "Corn", "Rice", "Banana", "Apple", "Pepper"];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);
    if (selected) setPreview(URL.createObjectURL(selected));
  };

  const handlePredict = async () => {
    if (!file) return alert("Please upload a leaf image.");
    if (!cropType) return alert("Please select crop type.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("crop_type", cropType);

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Prediction failed. Please check backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>AI-Based Crop Disease Detection</h1>
      <p className="subtitle">Upload a crop leaf image to detect disease and receive guidance.</p>

      <div className="card">
        <label>Select Crop Type</label>
        <select value={cropType} onChange={(e) => setCropType(e.target.value)}>
          <option value="">-- Select Crop --</option>
          {crops.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
        </select>

        <label>Upload Leaf Image</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />

        {preview && (
          <div className="preview-box">
            <img src={preview} alt="Leaf preview" />
          </div>
        )}

        <button onClick={handlePredict} disabled={loading}>
          {loading ? "Predicting..." : "Detect Disease"}
        </button>
      </div>

      {result && (
        <div className="result-card">
          <h2>Prediction Result</h2>

          {result.low_confidence && <div className="warning">{result.message}</div>}

          <p><strong>Disease:</strong> {result.disease}</p>
          <p><strong>Confidence:</strong> {result.confidence}%</p>

          <div className="confidence-bar">
            <div className="confidence-fill" style={{ width: `${result.confidence}%` }}></div>
          </div>

          <h3>Cause</h3>
          <p>{result.cause}</p>

          <h3>Symptoms</h3>
          <p>{result.symptoms}</p>

          <h3>Treatment</h3>
          <p>{result.treatment}</p>

          <h3>Prevention</h3>
          <p>{result.prevention}</p>

          <h3>Top 5 Predictions</h3>
          <ul>
            {result.top_5_predictions.map((item, index) => (
              <li key={index}>{item.disease}: {item.confidence}%</li>
            ))}
          </ul>

          {result.gradcam_image && (
            <>
              <h3>Grad-CAM Explanation</h3>
              <img src={result.gradcam_image} alt="Grad-CAM" className="gradcam" />
            </>
          )}

          <p className="disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
```

Replace `frontend/src/App.css`:

```css
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f3f4f6;
  color: #111827;
}

.app-container {
  max-width: 900px;
  margin: auto;
  padding: 30px;
}

h1 {
  text-align: center;
  color: #166534;
}

.subtitle {
  text-align: center;
  color: #4b5563;
  margin-bottom: 30px;
}

.card,
.result-card {
  background: white;
  padding: 24px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}

label {
  display: block;
  margin-top: 12px;
  font-weight: bold;
}

select,
input {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

button {
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

button:disabled {
  background: #9ca3af;
}

.preview-box {
  margin-top: 16px;
  text-align: center;
}

.preview-box img {
  max-width: 280px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
}

.confidence-bar {
  width: 100%;
  height: 18px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
  margin: 8px 0 16px;
}

.confidence-fill {
  height: 100%;
  background: #16a34a;
}

.warning {
  background: #fef3c7;
  color: #92400e;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.gradcam {
  max-width: 350px;
  width: 100%;
  border-radius: 10px;
  border: 1px solid #d1d5db;
}

.disclaimer {
  margin-top: 20px;
  font-size: 14px;
  color: #991b1b;
  background: #fee2e2;
  padding: 12px;
  border-radius: 8px;
}
```

---

## 14. Supabase Database Schema

Create `database/schema.sql`:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamp default now()
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  crop_type text,
  predicted_disease text,
  confidence numeric,
  image_url text,
  gradcam_url text,
  treatment text,
  created_at timestamp default now()
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references predictions(id),
  user_id uuid references users(id),
  is_correct boolean,
  feedback_text text,
  created_at timestamp default now()
);
```

---

## 15. Testing Checklist

### Model Testing

```text
[ ] Accuracy calculated
[ ] Precision calculated
[ ] Recall calculated
[ ] F1-score calculated
[ ] Confusion matrix generated
[ ] Baseline vs EfficientNetB3 compared
[ ] Real leaf photographs tested
[ ] Grad-CAM heatmaps checked
```

### Backend Testing

```text
[ ] /health endpoint works
[ ] /predict endpoint accepts image
[ ] Invalid image is rejected
[ ] Low-confidence fallback works
[ ] Top-5 predictions returned
[ ] Treatment guidance returned
[ ] Grad-CAM image returned
```

### Frontend Testing

```text
[ ] Crop selector works
[ ] Image upload preview works
[ ] Disease result displays
[ ] Confidence bar displays
[ ] Treatment and prevention display
[ ] Grad-CAM image displays
[ ] Low-confidence warning displays
```

### User Acceptance Testing

Ask at least 3 non-specialist users to test:

```text
[ ] Can user upload an image without help?
[ ] Can user understand disease result?
[ ] Can user understand confidence score?
[ ] Can user understand treatment guidance?
[ ] Can user understand disclaimer?
```

---

## 16. Deployment

### Backend Deployment on Render

Create `backend/Procfile`:

```txt
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Push backend to GitHub and deploy on Render.

### Frontend Deployment on Vercel

Update frontend API URL:

```jsx
const API_URL = "https://your-render-backend-url.onrender.com";
```

Then deploy frontend on Vercel.

---

## 17. Final Report Evidence to Collect

Collect the following screenshots/evidence:

```text
[ ] Dataset folder structure
[ ] Dataset class distribution
[ ] Training accuracy/loss graph
[ ] Validation accuracy/loss graph
[ ] Classification report
[ ] Confusion matrix
[ ] Grad-CAM examples
[ ] FastAPI Swagger page
[ ] React upload page
[ ] Prediction result page
[ ] Low-confidence fallback warning
[ ] Supabase prediction history table
[ ] Cloudinary uploaded images
[ ] Deployed Vercel frontend
[ ] Deployed Render backend
[ ] User testing feedback
```

---

## 18. Final Minimum Viable Product

The minimum successful FYP system must include:

```text
[ ] Dataset split completed
[ ] EfficientNetB3 trained
[ ] Disease class prediction working
[ ] Confidence score displayed
[ ] Treatment/prevention guidance displayed
[ ] FastAPI /predict endpoint working
[ ] React upload page working
[ ] Grad-CAM image displayed
[ ] Basic testing completed
```

---

## 19. Strong Final Version

For higher marks, also include:

```text
[ ] User authentication
[ ] Prediction history
[ ] Supabase database
[ ] Cloudinary image storage
[ ] Deployment to Vercel and Render
[ ] Real leaf image validation
[ ] UAT feedback
[ ] Bug-fix log
[ ] Final demo video
```

---

## 20. Final Development Order

Follow this order exactly:

```text
1. Organise dataset
2. Split dataset into train/validation/test
3. Create disease_info.json
4. Train EfficientNetB3
5. Test local prediction
6. Build FastAPI backend
7. Test /predict in Swagger UI
8. Build React frontend
9. Connect frontend to backend
10. Add Grad-CAM display
11. Add Supabase and Cloudinary
12. Test full system
13. Deploy backend
14. Deploy frontend
15. Collect screenshots and evidence
16. Write final report
17. Prepare viva presentation and demo
```

---

## 21. Expected Web App Output

Example output shown to user:

```text
Disease Detected: Potato Late Blight
Confidence: 92.4%

Cause:
Fungal-like infection caused by Phytophthora infestans.

Symptoms:
Dark brown spots on leaves and stems.

Treatment:
Remove infected leaves and consult an agricultural officer before applying fungicide.

Prevention:
Avoid excess moisture and improve spacing.

Disclaimer:
This is general advice only. Consult an agricultural expert before treatment.
```

---

## 22. Important Notes for the Implementing AI / Developer

- The system must classify **specific disease classes**, not only healthy/unhealthy.
- The model output class label must match `disease_info.json` after cleaning underscores.
- The backend must return prediction, confidence, top-5 predictions, treatment guidance and Grad-CAM.
- Confidence below 60% must trigger a low-confidence fallback warning.
- Treatment recommendations must be general and include a disclaimer.
- Heavy augmentation should only be applied to training data, not validation/test data.
- Full segmentation is optional and not required in the first version.
- If EfficientNetB3 is too slow for deployment, MobileNetV3 can be used as fallback.

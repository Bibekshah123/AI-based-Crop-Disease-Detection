"""
Quick offline tester for the crop-disease model.

Rebuilds the SAME model architecture, weight-load priority, preprocessing, class
list and confidence threshold as the API (main.py) — but with no web/auth/db
deps, so it runs with just tensorflow + pillow + numpy. Results match /predict.

Usage (run from the backend/ directory):
    python predict_test.py ../test.jpg
    python predict_test.py /path/to/leaf1.jpg /path/to/leaf2.png
    python predict_test.py /path/to/folder_of_images
    python predict_test.py ../test.jpg --topk 5
"""
import os
import sys
import glob
import json
import argparse

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB2
from PIL import Image

# --- must match main.py ---
# Must track main.py, or this tool tests a different model than the API serves.
MODEL_PATH = os.getenv("MODEL_PATH", "last_final_model")
CLASS_NAMES_PATH = os.getenv("CLASS_NAMES_PATH", os.path.join(MODEL_PATH, "class_names.json"))
IMG_SIZE = (224, 224)
LOW_CONFIDENCE_THRESHOLD = 0.60
IMG_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def load_crop_model(model_path, class_names):
    num_classes = len(class_names)
    base = EfficientNetB2(input_shape=(224, 224, 3), include_top=False, weights=None)
    inp = tf.keras.Input(shape=(224, 224, 3))
    x = base(inp, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    x = tf.keras.layers.Dense(512, activation="relu", name="dense_hidden")(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    out = tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_output")(x)
    model = tf.keras.Model(inp, out)

    for fname in (
        "best_model_phase2_final.weights.h5",
        "best_model_phase2.weights.h5",
        "best_model_phase1.weights.h5",
        "model.weights.h5",
    ):
        p = os.path.join(model_path, fname)
        if os.path.exists(p):
            print(f"Loaded weights: {p}")
            model.load_weights(p)
            return model
    raise FileNotFoundError(f"No weights found in {model_path}")


def preprocess_image(path):
    image = Image.open(path).convert("RGB").resize(IMG_SIZE)
    arr = np.expand_dims(np.array(image), axis=0)
    return tf.keras.applications.efficientnet.preprocess_input(arr)


def collect_images(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for ext in IMG_EXTS:
                files += glob.glob(os.path.join(p, f"*{ext}"))
                files += glob.glob(os.path.join(p, f"*{ext.upper()}"))
        elif os.path.isfile(p):
            files.append(p)
        else:
            print(f"  [skip] not found: {p}")
    return sorted(files)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+", help="image file(s) or folder(s)")
    ap.add_argument("--topk", type=int, default=5)
    args = ap.parse_args()

    with open(CLASS_NAMES_PATH) as f:
        class_names = json.load(f)
    model = load_crop_model(MODEL_PATH, class_names)

    files = collect_images(args.paths)
    if not files:
        print("No images found.")
        sys.exit(1)

    print(f"Model classes: {len(class_names)} | confidence threshold: {LOW_CONFIDENCE_THRESHOLD}")
    print(f"Testing {len(files)} image(s)...")
    for path in files:
        probs = model.predict(preprocess_image(path), verbose=0)[0]
        order = probs.argsort()[::-1][:args.topk]
        best_i = int(order[0])
        best_p = float(probs[best_i])
        verdict = ("LOW CONFIDENCE (below %.2f)" % LOW_CONFIDENCE_THRESHOLD
                   if best_p < LOW_CONFIDENCE_THRESHOLD else "OK")
        print(f"\n{os.path.basename(path)}")
        print(f"  top-1: {class_names[best_i]}  {best_p*100:5.2f}%   [{verdict}]")
        for rank, i in enumerate(order, 1):
            print(f"    {rank}. {class_names[int(i)]:35s} {float(probs[int(i)])*100:6.2f}%")


if __name__ == "__main__":
    main()

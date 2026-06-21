"""
Train EfficientNetB3 on crop disease dataset.
Usage: python scripts/train.py
"""

import os
import json
import shutil
import random
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import EfficientNetB3

random.seed(42)

# ============================
# Configuration
# ============================
DATASET_DIR = "Dataset"
OUTPUT_DIR = "backend"
MODEL_WEIGHTS_DIR = os.path.join(OUTPUT_DIR, "fyp_efficientnet_b3_model")
IMG_SIZE = (300, 300)
BATCH_SIZE = 32
NUM_EPOCHS_PHASE1 = 15
NUM_EPOCHS_PHASE2 = 15
VAL_SPLIT = 0.2
LEARNING_RATE_PHASE1 = 1e-3
LEARNING_RATE_PHASE2 = 1e-5


# ============================
# Step 1: Split data into train/val
# ============================
def split_data():
    base_dir = "data"
    train_dir = os.path.join(base_dir, "train")
    val_dir = os.path.join(base_dir, "val")

    if os.path.exists(base_dir):
        shutil.rmtree(base_dir)

    classes = sorted(os.listdir(DATASET_DIR))

    for cls in classes:
        src_dir = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(src_dir):
            continue

        images = [
            f for f in os.listdir(src_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        random.shuffle(images)

        split_idx = int(len(images) * (1 - VAL_SPLIT))
        train_images = images[:split_idx]
        val_images = images[split_idx:]

        os.makedirs(os.path.join(train_dir, cls), exist_ok=True)
        os.makedirs(os.path.join(val_dir, cls), exist_ok=True)

        for img in train_images:
            shutil.copy2(os.path.join(src_dir, img), os.path.join(train_dir, cls, img))
        for img in val_images:
            shutil.copy2(os.path.join(src_dir, img), os.path.join(val_dir, cls, img))

        print(f"{cls}: {len(train_images)} train, {len(val_images)} val")

    return classes


# ============================
# Step 2: Build data generators
# ============================
def create_generators():
    train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.15,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode="nearest",
        preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    )

    val_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    )

    train_gen = train_datagen.flow_from_directory(
        "data/train",
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=True,
    )

    val_gen = val_datagen.flow_from_directory(
        "data/val",
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=False,
    )

    return train_gen, val_gen


# ============================
# Step 3: Build model
# ============================
def build_model(num_classes):
    base_model = EfficientNetB3(
        include_top=False,
        weights="imagenet",
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    return model, base_model


# ============================
# Step 4: Train
# ============================
def train():
    print("=" * 50)
    print("Step 1: Splitting dataset into train/val (80/20)")
    print("=" * 50)
    classes = split_data()

    print("\n" + "=" * 50)
    print(f"Step 2: Loading data ({len(classes)} classes)")
    print("=" * 50)
    train_gen, val_gen = create_generators()

    print("\n" + "=" * 50)
    print("Step 3: Building EfficientNetB3 model")
    print("=" * 50)
    num_classes = len(classes)
    model, base_model = build_model(num_classes)
    model.summary()

    print("\n" + "=" * 50)
    print(f"Phase 1: Training top layers (LR={LEARNING_RATE_PHASE1})")
    print("=" * 50)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE_PHASE1),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=5, restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6
        ),
    ]

    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=NUM_EPOCHS_PHASE1,
        callbacks=callbacks,
        verbose=1,
    )

    print("\n" + "=" * 50)
    print(f"Phase 2: Fine-tuning entire model (LR={LEARNING_RATE_PHASE2})")
    print("=" * 50)
    base_model.trainable = True
    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE_PHASE2),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=NUM_EPOCHS_PHASE2,
        callbacks=callbacks,
        verbose=1,
    )

    # ============================
    # Step 5: Save model and class mapping
    # ============================
    print("\n" + "=" * 50)
    print("Step 5: Saving model")
    print("=" * 50)

    os.makedirs(MODEL_WEIGHTS_DIR, exist_ok=True)

    model.save_weights(os.path.join(MODEL_WEIGHTS_DIR, "model.weights.h5"))
    print(f"Weights saved to {MODEL_WEIGHTS_DIR}/model.weights.h5")

    class_names_path = os.path.join(OUTPUT_DIR, "class_names.json")
    with open(class_names_path, "w") as f:
        json.dump(classes, f, indent=2)
    print(f"Class names saved to {class_names_path}")
    print(f"Class order: {classes}")

    val_loss, val_acc = model.evaluate(val_gen, verbose=0)
    print(f"\nFinal validation accuracy: {val_acc:.4f} ({val_acc * 100:.2f}%)")
    print(f"Final validation loss: {val_loss:.4f}")

    print("\nTraining complete!")


if __name__ == "__main__":
    train()

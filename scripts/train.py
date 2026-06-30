"""
Improved training script for EfficientNetB3 on crop disease dataset.
Uses stratified split, stronger augmentation, label smoothing, cosine decay, per-class metrics.
Usage: python scripts/train.py
"""

import os
import json
import shutil
import random
import tensorflow as tf
from tensorflow.keras import layers, regularizers
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.optimizers.schedules import CosineDecay

random.seed(42)
tf.random.set_seed(42)

DATASET_DIR = "FYP-dataset-updated"
OUTPUT_DIR = "backend"
MODEL_WEIGHTS_DIR = os.path.join(OUTPUT_DIR, "fyp_efficientnet_b3_model")
IMG_SIZE = (300, 300)
BATCH_SIZE = 32
EPOCHS_PHASE1 = 20
EPOCHS_PHASE2 = 30
LR_PHASE1 = 5e-4
LR_PHASE2 = 1e-4
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15
DROPOUT_RATE = 0.5
LABEL_SMOOTHING = 0.1
WEIGHT_DECAY = 1e-4


def split_data():
    base_dir = "data"
    train_dir = os.path.join(base_dir, "train")
    val_dir = os.path.join(base_dir, "val")
    test_dir = os.path.join(base_dir, "test")

    if os.path.exists(base_dir):
        shutil.rmtree(base_dir)

    classes = sorted(os.listdir(DATASET_DIR))

    for cls in classes:
        src = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(src):
            continue

        images = [f for f in os.listdir(src) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        random.shuffle(images)

        n_total = len(images)
        n_train = int(n_total * 0.70)
        n_val = int(n_total * 0.15)
        train_imgs = images[:n_train]
        val_imgs = images[n_train:n_train + n_val]
        test_imgs = images[n_train + n_val:]

        for split_dir, split_imgs in [
            (os.path.join(train_dir, cls), train_imgs),
            (os.path.join(val_dir, cls), val_imgs),
            (os.path.join(test_dir, cls), test_imgs),
        ]:
            os.makedirs(split_dir, exist_ok=True)
            for img in split_imgs:
                shutil.copy2(os.path.join(src, img), os.path.join(split_dir, img))

        print(f"{cls:45s} {len(train_imgs):4d} train, {len(val_imgs):4d} val, {len(test_imgs):4d} test")

    return classes


def create_generators(classes):
    train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rotation_range=40,
        width_shift_range=0.25,
        height_shift_range=0.25,
        shear_range=0.2,
        zoom_range=0.3,
        brightness_range=(0.6, 1.4),
        horizontal_flip=True,
        fill_mode="reflect",
        preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    )

    eval_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    )

    train_gen = train_datagen.flow_from_directory(
        "data/train", target_size=IMG_SIZE, batch_size=BATCH_SIZE,
        class_mode="categorical", shuffle=True
    )
    val_gen = eval_datagen.flow_from_directory(
        "data/val", target_size=IMG_SIZE, batch_size=BATCH_SIZE,
        class_mode="categorical", shuffle=False
    )
    test_gen = eval_datagen.flow_from_directory(
        "data/test", target_size=IMG_SIZE, batch_size=BATCH_SIZE,
        class_mode="categorical", shuffle=False
    )

    print(f"\nTraining samples: {train_gen.samples}")
    print(f"Validation samples: {val_gen.samples}")
    print(f"Test samples: {test_gen.samples}")

    return train_gen, val_gen, test_gen


def build_model(num_classes):
    base_model = EfficientNetB3(
        include_top=False, weights="imagenet",
        input_shape=(*IMG_SIZE, 3)
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(DROPOUT_RATE)(x)
    x = layers.Dense(512, activation="relu",
                     kernel_regularizer=regularizers.l2(WEIGHT_DECAY))(x)
    x = layers.Dropout(DROPOUT_RATE)(x)
    outputs = layers.Dense(num_classes, activation="softmax",
                           kernel_regularizer=regularizers.l2(WEIGHT_DECAY))(x)

    model = tf.keras.Model(inputs, outputs)
    return model, base_model


def compute_class_weights(train_dir, classes):
    counts = {}
    for i, cls in enumerate(classes):
        cls_dir = os.path.join(train_dir, cls)
        n = len([f for f in os.listdir(cls_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))])
        counts[i] = n
    max_count = max(counts.values())
    weights = {i: max_count / n for i, n in counts.items()}
    for i, cls in enumerate(classes):
        print(f"  {cls:45s} {counts[i]:4d} images  weight={weights[i]:.3f}")
    return weights


def train():
    print("=" * 50)
    print("Step 1: Splitting dataset into train/val/test (70/15/15)")
    print("=" * 50)
    classes = split_data()

    print("\n" + "=" * 50)
    print(f"Step 2: Loading data ({len(classes)} classes)")
    print("=" * 50)
    train_gen, val_gen, test_gen = create_generators(classes)

    print("\n" + "=" * 50)
    print("Step 3: Computing class weights for imbalance correction")
    print("=" * 50)
    class_weight = compute_class_weights("data/train", classes)

    print("\n" + "=" * 50)
    print("Step 4: Building EfficientNetB3 model")
    print("=" * 50)
    num_classes = len(classes)
    model, base_model = build_model(num_classes)
    model.summary()

    print("\n" + "=" * 50)
    print(f"Phase 1: Training top layers (LR={LR_PHASE1}, label_smoothing={LABEL_SMOOTHING})")
    print("=" * 50)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(LR_PHASE1),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=7, restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7
        ),
        tf.keras.callbacks.ModelCheckpoint(
            "best_model_phase1.weights.h5",
            monitor="val_accuracy", save_best_only=True, save_weights_only=True
        ),
    ]

    model.fit(
        train_gen, validation_data=val_gen,
        epochs=EPOCHS_PHASE1, callbacks=callbacks,
        class_weight=class_weight, verbose=1
    )

    print("\n" + "=" * 50)
    print(f"Phase 2: Fine-tuning entire model (LR={LR_PHASE2}, cosine decay)")
    print("=" * 50)
    base_model.trainable = True
    for layer in base_model.layers[:100]:
        layer.trainable = False

    total_steps = len(train_gen) * EPOCHS_PHASE2
    cosine_schedule = CosineDecay(
        initial_learning_rate=LR_PHASE2,
        decay_steps=total_steps,
        alpha=0.01
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(cosine_schedule),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
        metrics=["accuracy"],
    )

    callbacks2 = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=7, restore_best_weights=True
        ),
        tf.keras.callbacks.ModelCheckpoint(
            "best_model_phase2.weights.h5",
            monitor="val_accuracy", save_best_only=True, save_weights_only=True
        ),
    ]

    model.fit(
        train_gen, validation_data=val_gen,
        epochs=EPOCHS_PHASE2, callbacks=callbacks2,
        class_weight=class_weight, verbose=1
    )

    # Load best weights
    if os.path.exists("best_model_phase2.weights.h5"):
        model.load_weights("best_model_phase2.weights.h5")

    # Evaluate on test set
    print("\n" + "=" * 50)
    print("Evaluating on test set")
    print("=" * 50)
    test_loss, test_acc = model.evaluate(test_gen, verbose=0)
    print(f"Test accuracy: {test_acc:.4f} ({test_acc * 100:.2f}%)")
    print(f"Test loss: {test_loss:.4f}")

    # Per-class metrics
    print("\nPer-class accuracy:")
    all_preds = model.predict(test_gen, verbose=0)
    pred_classes = tf.argmax(all_preds, axis=1).numpy()
    true_classes = test_gen.classes

    from sklearn.metrics import classification_report
    for i, cls in enumerate(classes):
        mask = true_classes == i
        if mask.sum() > 0:
            acc = (pred_classes[mask] == i).mean()
            print(f"  {cls:45s} {acc:.3f} ({mask.sum():4d} samples)")

    # Save model
    print("\n" + "=" * 50)
    print("Saving model")
    print("=" * 50)
    os.makedirs(MODEL_WEIGHTS_DIR, exist_ok=True)

    model.save_weights(os.path.join(MODEL_WEIGHTS_DIR, "model.weights.h5"))
    print(f"Weights saved to {MODEL_WEIGHTS_DIR}/model.weights.h5")

    class_names_path = os.path.join(OUTPUT_DIR, "class_names.json")
    with open(class_names_path, "w") as f:
        json.dump(classes, f, indent=2)
    print(f"Class names saved to {class_names_path}")

    print("\nTraining complete!")


if __name__ == "__main__":
    train()

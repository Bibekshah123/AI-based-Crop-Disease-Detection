# Prompt for Gemini — debug a collapsed EfficientNetB2 training run

I am training an image classifier in a Google Colab / Kaggle notebook and the
saved model is effectively untrained. I need you to find the bug in my notebook
and give me corrected cells.

## Project

- Crop leaf disease detection, FastAPI backend + React Native app (final year project).
- Model: **EfficientNetB2**, `include_top=False`, `weights='imagenet'`, input 224x224x3.
- Head: `GlobalAveragePooling2D -> Dropout(0.5) -> Dense(512, relu, name='dense_hidden', l2=1e-4)
  -> Dropout(0.5) -> Dense(N, softmax, name='dense_output', l2=1e-4)`.
- **52 classes**: 51 disease/healthy classes across 10 crops (Apple, Banana, Citrus,
  Cucumber, Grape, Maize, Mango, Potato, Rice, Tomato) + one `Unknown___Unknown`
  rejection class.
- Data pipeline: `ImageDataGenerator.flow_from_directory` over `data/train`,
  `data/val`, `data/test`, split 70/15/15 from class folders.
- Two-phase training:
  - Phase 1: base frozen, Adam lr=5e-4, 20 epochs, EarlyStopping(val_loss, patience=7),
    ReduceLROnPlateau.
  - Phase 2: unfreeze base except first 100 layers, Adam with CosineDecay(1e-4),
    30 epochs, EarlyStopping(val_loss, patience=7).
  - Loss: `CategoricalCrossentropy(label_smoothing=0.1)`. Class weights: sqrt-damped.
  - A custom `MacroF1Checkpoint` callback saves weights at the best validation macro-F1.
- Class balancing before training: majority classes undersampled to `median*2`,
  minority classes oversampled (offline augmented copies) up to `median*1.2`.
- Extra augmentation `field_augment`: random Gaussian blur, sensor noise, and a soft
  directional shadow, then `tf.keras.applications.efficientnet.preprocess_input`.

## What changed in this run

I added the `Unknown___Unknown` class so the model can reject crops it was not
trained on (e.g. a guava leaf). That folder is filled with **non-plant images**:
~500 random photos downloaded from Lorem Picsum, ~200 Gaussian-noise images, and
~300 synthetically drawn "leaf-like texture" images.

Previously the model had 51 classes (no Unknown) and worked — it produced confident
predictions (60–93%).

## The symptom (measured, not guessed)

After this run, I loaded the exported `best_model_phase2.weights.h5` into the exact
same architecture and ran inference on 24 real leaf images spanning 8 known classes:

- **0 / 24 correct.**
- Top-1 confidence is **~5% on every image** (uniform over 52 classes would be 1.9%).
- Normalized entropy is **~0.96** (max is 1.0) on every image.
- Every image is flagged "unknown" by my confidence thresholds.
- It behaves identically on a guava leaf and on an Apple Healthy leaf — no discrimination.

In other words the softmax output is essentially **uniform for all inputs**.

## What I already ruled out

- **Not a weight-loading bug.** `load_weights` succeeds, and I verified the loaded
  weights are NOT at initialization: BatchNorm `moving_mean` is not 0 and `moving_var`
  is not 1 (mean ≈ 11.9), and the `dense_output` kernel std is ≈ 0.059. So the file
  contains genuinely trained-but-bad weights.
- **Not a class-count mismatch.** The classifier head in the .h5 is `(512, 52)` and
  `class_names.json` has exactly 52 entries, in the same sorted order.
- **Not label-index shift.** That would give confident-but-wrong predictions; I observe
  low-confidence uniform predictions instead.

## Other clues

- The exported weights file is **35 MB**, while the previous (working) checkpoint from
  the same notebook was **102 MB**. 102 ≈ 3 × 35, i.e. the old file included Adam
  optimizer state and the new one does not.
- In the exported zip, `class_names.json` and the weights have a newer timestamp than
  `confusion_matrix.png` / `training_history.png`, suggesting those plots came from an
  earlier run.
- My notebook contains this guard, which silently skips training when an old
  checkpoint is still on disk:

```python
if os.path.exists(PHASE2_WEIGHTS):
    model.load_weights(PHASE2_WEIGHTS)
    print('Both training phases SKIPPED')
elif os.path.exists(PHASE1_WEIGHTS):
    model.load_weights(PHASE1_WEIGHTS)
    print('Phase 1 SKIPPED')
else:
    ...  # actually train
```

- I train on Colab free tier and **sessions frequently disconnect / hit time limits**,
  so a run may be interrupted partway.

## What I want from you

1. **Diagnose the most likely root cause** of a uniform-softmax, ~1/N-confidence model,
   given all of the above. Rank the hypotheses by likelihood and tell me exactly what
   to print/check in the notebook to confirm each one. Consider at least:
   - training being skipped or interrupted so an almost-untrained model was exported;
   - the model being saved before/independently of the best checkpoint being restored;
   - the ~1000 synthetic `Unknown___Unknown` images destabilizing training or
     dominating the loss;
   - learning-rate / optimizer / CosineDecay `decay_steps` misconfiguration;
   - a train-vs-inference preprocessing mismatch;
   - `base_model(inputs, training=False)` interacting badly with unfreezing in Phase 2;
   - label smoothing + class weights + heavy augmentation together preventing convergence.
2. **Tell me which single number in my notebook output settles it** (e.g. final
   training accuracy vs validation accuracy vs test accuracy) and what value would
   confirm each hypothesis.
3. **Give me corrected notebook cells** that:
   - guarantee training actually runs (no silent skip from a stale checkpoint);
   - are **resume-safe** across Colab disconnects — checkpoint every epoch to Google
     Drive and resume from the last epoch rather than restarting;
   - assert before export that the model is genuinely trained (e.g. fail loudly if
     final training accuracy is below a threshold, or if `model.output_shape` does not
     match `len(classes)`);
   - export weights and `class_names.json` as a guaranteed matched pair.
4. **Advise on the `Unknown___Unknown` class design.** My goal is that an unsupported
   crop (guava, papaya, coffee) is rejected. Filling this class with random photos and
   noise did not achieve that in the previous 51-class model — a guava leaf was
   confidently classified as "Potato Healthy" at 79%. Should this class instead contain
   real leaves of non-target crops? How many images, and how should I balance it against
   the other 51 classes so it does not dominate or collapse training?

Please be specific and give me runnable code, not general advice.

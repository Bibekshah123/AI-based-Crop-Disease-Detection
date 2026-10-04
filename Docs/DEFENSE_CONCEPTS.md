# CropSense AI — Deep-Learning Concepts for the Defense

Every deep-learning concept the project uses, in the order a panel is likely to
probe them. Each entry says what it is, where it appears in CropSense, and the
number to quote. For the full reasoning behind each design choice, see sections
E–L, P, V and Z of [CROPSENSE_WORKFLOW.md](CROPSENSE_WORKFLOW.md).

---

## Contents

1. [Neural network basics](#1-neural-network-basics)
2. [Loss and training](#2-loss-and-training)
3. [Transfer learning](#3-transfer-learning)
4. [Overfitting and regularisation](#4-overfitting-and-regularisation)
5. [Data handling](#5-data-handling)
6. [Evaluation metrics](#6-evaluation-metrics)
7. [Uncertainty and "I don't know"](#7-uncertainty-and-i-dont-know-open-set-recognition)
8. [Explainability](#8-explainability)
9. [Model deployment](#9-model-deployment)
10. [Most likely panel questions](#10-most-likely-panel-questions)

---

## 1. Neural network basics

| Concept | What it means | In CropSense |
|---|---|---|
| **CNN (convolutional neural network)** | Layers of small filters slide over the image. Early layers detect edges, later layers detect textures and lesion shapes. | EfficientNetB2 is the CNN. |
| **Feature map** | The grid of filter responses a convolution layer outputs. | Grad-CAM reads the last one. |
| **Activation / ReLU** | ReLU(x) = max(0, x). It adds non-linearity so the network can learn complex patterns. | The 512-unit `dense_hidden` layer. |
| **Logits and softmax** | Softmax turns the raw scores (logits) into probabilities that sum to 1. | The 52-way output; top-1 is the highest probability. |
| **Forward pass / backpropagation** | The forward pass computes the prediction. Backprop computes the gradient of the loss for every weight. | Training; Grad-CAM also uses gradients. |
| **Gradient descent** | Nudge every weight a small step against its gradient to reduce the loss. | The Adam optimiser does this. |
| **Epoch, batch, iteration** | Epoch = one pass over all training data. Batch = the images per update. Iteration = one update. | Batch size 64; at most 10 + 15 epochs. |
| **Parameters** | The learned weights. | 8.5 M in total, 7.77 M of them in the backbone. |

**Softmax formula:** pᵢ = e^(zᵢ) ÷ Σⱼ e^(zⱼ), where z are the logits. Because the
outputs always sum to 1, softmax can say which class is *most* likely but never
"none of these" (see section 7).

---

## 2. Loss and training

| Concept | What it means | In CropSense |
|---|---|---|
| **Categorical cross-entropy** | Loss = −log(probability given to the correct class). Being confidently wrong is penalised heavily. | The training loss. |
| **Label smoothing (0.1)** | The target is 90% on the true class, with 10% spread over the others, so the model isn't pushed to be 100% sure. | Makes the confidence number more honest. It's also why the loss levels off near 0.79 instead of reaching 0. |
| **Learning rate** | The step size of each update. | Phase 1: 5×10⁻⁴. Phase 2: 10⁻⁴. |
| **Adam** | An optimiser that adapts the step size for each weight. | Both phases. |
| **LR schedules** | ReduceLROnPlateau halves the rate when validation stops improving. Cosine decay lowers it smoothly along a cosine curve. | Phase 1 uses ReduceLROnPlateau; phase 2 uses cosine 10⁻⁴ → 10⁻⁶. |
| **Mixed precision** | Compute in float16 for speed, keep sensitive parts in float32. | The softmax output layer is forced to float32 because softmax is unstable in float16. |
| **Random seed** | Fixes randomness so a run can be repeated. | Seed 42. |

**Worked example (cross-entropy):** if the model gives the correct class 0.9,
the loss is −log(0.9) ≈ 0.105. If it gives only 0.1, the loss is −log(0.1) ≈ 2.30,
about 22 times larger.

---

## 3. Transfer learning

| Concept | What it means | In CropSense |
|---|---|---|
| **Transfer learning** | Reuse a network trained on another task and adapt it to yours. | Starts from ImageNet weights (1.2 M general photos). |
| **Feature extraction vs fine-tuning** | Feature extraction freezes the backbone and trains only the new head. Fine-tuning also updates backbone weights. | Phase 1 is feature extraction; phase 2 is fine-tuning. |
| **Freezing layers** | Frozen weights don't update during training. | The first 100 layers stay frozen in phase 2, because they hold generic edge and texture filters. |
| **Why two phases** | A randomly initialised head sends large, noisy gradients that would damage the pre-trained features. | Train the head first (748,084 trainable parameters), then fine-tune at a 100× smaller learning rate. |
| **EfficientNet / compound scaling** | Scales network depth, width and input resolution together with one coefficient, instead of growing only one. | B2 gives about 80% ImageNet top-1 with 9 M parameters (VGG16 has 138 M). |
| **Global average pooling (GAP)** | Averages each feature map into one number, replacing large fully connected layers. | GAP → dropout → Dense 512 → dropout → Dense 52. |
| **Embedding** | The vector a layer outputs, used as a compact description of the image. | The 512-dimensional `dense_hidden` output, used for unknown-crop detection. |

**Backbones compared (report Table 5):**

| Backbone | Parameters | ImageNet top-1 | Verdict |
|---|---|---|---|
| VGG16 | 138.4 M | 71.3% | Too big for free CPU hosting |
| ResNet50 | 25.6 M | 74.9% | Accurate but ~3× larger than B2 |
| MobileNetV2 | 3.5 M | 71.3% | Tried as a baseline; less accurate |
| **EfficientNetB2** | **9.2 M** | **80.1%** | **Chosen: best accuracy per parameter** |
| EfficientNetB3 | 12.3 M | 81.6% | Tried; needs 300 px input, more compute for little gain |

---

## 4. Overfitting and regularisation

| Concept | What it means | In CropSense |
|---|---|---|
| **Overfitting / underfitting** | Overfitting: the model memorises training data and does worse on new data. Underfitting: it hasn't learned enough. | Training accuracy rose past validation accuracy after about epoch 6: mild overfitting. |
| **Dropout (0.5)** | Randomly switches off half the units in a layer during training, so no unit can be relied on alone. | Two dropout layers in the head. |
| **L2 regularisation (weight decay)** | Adds a penalty for large weights (1×10⁻⁴) to the loss. | Both dense layers. |
| **Data augmentation** | Random changes to training images so the model sees more variety. | Rotation ±40°, shift, shear, zoom, brightness, channel shift, horizontal flip. No vertical flip, because leaves have a natural tip-to-stalk direction. |
| **Custom field augmentation** | Makes clean lab images look like phone photos. | Gaussian blur (p = 0.35), sensor noise (0.30), directional shadow (0.30). |
| **Early stopping** | Stops training when validation loss stops improving and restores the best weights. | Patience 7 epochs. |
| **Checkpointing** | Saves the best model seen so far. | Chosen by best validation macro-F1. |

**Why validation accuracy starts above training accuracy:** training accuracy is
measured with dropout and augmentation switched on, which makes the task harder;
validation is measured on clean images with dropout off. This is a common panel
question.

---

## 5. Data handling

| Concept | What it means | In CropSense |
|---|---|---|
| **Train / validation / test split** | Train learns the weights, validation guides tuning and checkpoint choice, test is untouched until the end. | 70/15/15 per class, seed 42. Lab and field images are split separately, then merged. |
| **Stratification** | Every class is split in the same proportions. | Splitting per class. |
| **Data leakage** | Test images that also appear in training inflate the score. | Near-duplicates removed with perceptual hashing, including 10 PlantDoc images that matched the field training set (236 → 226). |
| **Perceptual hash** | A fingerprint that stays similar for near-identical images. | 8×8 average hash, Hamming distance ≤ 4; 274 near-duplicates removed from the field set. |
| **Class imbalance** | Some classes have far more images than others. | 2,384 (maize common rust) vs 23 (banana yellow sigatoka), about 104:1. |
| **Under- and oversampling** | Drop images from big classes, repeat images from small ones. | Big classes capped at 2× the median; small ones raised to 1.2× the median, never more than 5× their real images. |
| **Class weights** | Mistakes on rare classes cost more in the loss. | Square-root damped: w = √(mean count ÷ class count), landing around 1.0–1.5. |
| **Label noise** | Some labels are simply wrong. | The web-sourced field images were cleaned and reviewed but not checked by an agronomist. |
| **Domain shift (lab → field gap)** | Test data looks different from training data, so accuracy drops. | The central finding: about 98.7% in the lab vs 48% in the field. |

---

## 6. Evaluation metrics

Know these formulas. TP = true positives, FP = false positives, FN = false
negatives.

| Metric | Formula / meaning | Your number |
|---|---|---|
| **Accuracy** | correct ÷ total | 98.5–98.9% lab validation (31 Aug run) |
| **Top-1 / top-5 accuracy** | Is the true class the first guess / in the top 5? | 48.0% / 81.8% on PlantDoc |
| **Precision** | TP ÷ (TP + FP): of the answers given, how many were right | Answers shown to users were right 56.1% of the time |
| **Recall** | TP ÷ (TP + FN): of the true cases, how many were found | Per-class accuracy on PlantDoc is per-class recall |
| **F1** | 2 × precision × recall ÷ (precision + recall): balances the two | — |
| **Macro-F1** | Average F1 over classes, each class weighted equally | The checkpoint metric, so rare classes count |
| **Micro / weighted F1** | Weighted by class size, so big classes dominate | Why it wasn't used |
| **Confusion matrix** | Grid of true class vs predicted class | Lab matrix strongly diagonal; field errors like Septoria → early blight |
| **Selective prediction (accuracy–coverage)** | Answer only when confident enough; trade coverage for accuracy | 81.8% right at ≥ 80% confidence, covering 22.3% of photos; 72.3% at ≥ 60% (43.9%) |
| **Confidence interval** | The likely range of the true value (Wilson interval) | 48% is roughly 40–56% (n = 148) |
| **Calibration** | Does "80% sure" mean right about 80% of the time? | Informally yes (81.8%). Temperature scaling and ECE are future work |
| **False rejection rate** | Known leaves wrongly rejected | Designed at 5%; measured 11.5% on field photos |

**Worked example.** For one class: 8 correct detections (TP), 2 other leaves
wrongly called this class (FP), 4 of its leaves missed (FN).
- Precision = 8 ÷ (8 + 2) = 0.80
- Recall = 8 ÷ (8 + 4) = 0.67
- F1 = 2 × 0.80 × 0.67 ÷ (0.80 + 0.67) ≈ 0.73

**Why accuracy misleads with imbalance:** with a 104:1 ratio, a model that never
predicts the rarest classes can still score high accuracy, because those classes
are a tiny share of the images. Macro-F1 gives each of them an equal vote, so the
checkpoint can't win by ignoring them.

---

## 7. Uncertainty and "I don't know" (open-set recognition)

| Concept | What it means | In CropSense |
|---|---|---|
| **Closed-set vs open-set** | Closed-set: every input is forced into a known class. Open-set: the model can reject an input. | Softmax is closed-set, so a five-rule gate adds rejection. |
| **Out-of-distribution (OOD)** | An input unlike the training data. | Crops the model never saw (strawberry, soybean, cherry…). |
| **Background / Unknown class** | An extra class trained on "other" images. | `Unknown___Unknown`, up to 1,000 images (≤ 35% synthetic). Gate rule 1. |
| **Max-softmax confidence** | The baseline OOD signal (Hendrycks & Gimpel, 2017). | Rule 2: confidence below 30%. |
| **Margin** | Top-1 probability minus top-2. | Rule 3: confidence below 50% and margin below 5 points (a near tie). |
| **Normalised entropy** | H = −Σ p·log p ÷ log(52): 0 = certain, 1 = uniform guessing. | Rule 4: above 0.90. |
| **L2 normalisation / cosine similarity** | Scale vectors to length 1; cosine similarity measures the angle between them (1 = same direction). | The image's embedding is compared with each class. |
| **Class centroid** | The mean embedding of a class. | 51 centroids × 512 dimensions (Unknown excluded, as it has no coherent centre). |
| **Percentile threshold** | Set the cut-off so a chosen share of known data passes. | τ = 0.5596, the 5th percentile of known validation leaves, so 95% are accepted. Rule 5. |
| **Why it failed** | The threshold was calibrated on lab-like data, and the shift to field photos moved all the scores. | Supported and untrained crops scored about the same (0.701 vs 0.711); only 28.4% of untrained crops were rejected. |
| **Alternatives (future work)** | Mahalanobis distance (distance using each class's spread), energy scores (from logits), temperature scaling (softening the softmax). | Know one line on each. |

**The five gate rules** (any one declines the answer):

| # | Rule | Shown as |
|---|---|---|
| 1 | Top class is `Unknown___Unknown` | Crop Not Supported (if ≥ 50%) or Not Identified |
| 2 | Top-1 < 0.30 | Not Identified |
| 3 | Top-1 < 0.50 and margin < 5 points | Not Identified |
| 4 | Normalised entropy > 0.90 | Not Identified |
| 5 | Cosine similarity to nearest centroid < 0.5596 | Crop Not Supported |

---

## 8. Explainability

| Concept | What it means | In CropSense |
|---|---|---|
| **Grad-CAM** | Weight each feature map of the last convolution layer by the average gradient of the class score, sum them, apply ReLU, and overlay the result on the photo as a heatmap. | On every result, from the 7×7 last layer, using the pre-softmax class score (logit). Drawn two-tone: red where the value is ≥ 50% of the peak (the model's attention), blue elsewhere. |
| **Saliency limits** | A heatmap can look convincing even when the model is wrong (Adebayo et al., 2018). | A Septoria leaf called early blight at 88% confidence still had a heatmap on real lesions, so the app says the heatmap "does not confirm the diagnosis". |
| **LIME / SHAP** | Other explanation methods that need many forward passes per image. | Rejected as too slow on free CPU hosting. |

**Grad-CAM in four steps:**
1. Find the last convolution layer (the last one with a 4-D spatial output).
2. Compute the gradient of the predicted class's score **before softmax** (the
   logit) with respect to that layer's feature maps. The softmax probability
   saturates when the model is confident and spreads the map.
3. Average the gradients per channel → one importance weight per feature map.
4. Weighted sum of the feature maps → ReLU → scale to 0–1 → resize to the photo,
   then draw two tones: red where the value is ≥ 50% of the peak, blue elsewhere.

---

## 9. Model deployment

| Concept | What it means | In CropSense |
|---|---|---|
| **Training vs inference** | Inference is only the forward pass, with dropout off and no weight updates. | CPU inference on the Hugging Face Space. |
| **Preprocessing parity** | Inference must prepare images exactly as training did. | EfficientNet's `preprocess_input` on raw 0–255 pixels, no extra /255, in the notebook, the API and the tester. |
| **Weights-only loading** | Rebuild the architecture in code, then load the saved weights. | Avoids Keras version mismatches between Colab and the server. |
| **Artefacts that travel together** | Files only valid with the weights they were made from. | Weights, `class_names.json` and `ood_stats.npz` must come from the same training run. |
| **Latency** | Time per prediction. | 0.79 s locally, 6.75 s on the live Space; Grad-CAM is most of it. |
| **Quantisation / TFLite** | A smaller, faster model format that runs on the phone. | Future work, for offline use in fields with no signal. |

---

## 10. Most likely panel questions

1. Why macro-F1 and not accuracy? Explain F1.
2. What is transfer learning, and why train in two phases?
3. Why did validation accuracy start above training accuracy?
4. What does label smoothing do, and why does the loss stop near 0.79?
5. How did you handle the class imbalance?
6. Why does field accuracy drop to 48%? (domain shift)
7. Why can't softmax reject an unknown crop? How was 0.5596 chosen?
8. What does Grad-CAM show, and what doesn't it prove?
9. How did you prevent data leakage in the evaluation?
10. Is the confidence meaningful? (the ≥ 80% → 81.8% result)
11. Is there overfitting? How did you control it?
12. Why EfficientNetB2 and not ResNet, VGG or MobileNet?

Answers to most of these, in the project's own words, are in section Z of
[CROPSENSE_WORKFLOW.md](CROPSENSE_WORKFLOW.md).

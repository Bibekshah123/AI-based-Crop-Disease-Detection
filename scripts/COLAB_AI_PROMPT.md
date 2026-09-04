# Prompts for the Colab built-in AI (Gemini in Colab)

The Colab assistant can already read this notebook and its cell outputs, so these
prompts only supply the evidence it CANNOT see (results measured outside Colab).
Use PROMPT 1 first. Then use the follow-ups depending on what it finds.

---

## PROMPT 1 — main diagnosis (paste this first)

```
This notebook trains an EfficientNetB2 crop-disease classifier on 52 classes and
exports best_model_phase2.weights.h5 + class_names.json.

I downloaded the exported weights and tested them OUTSIDE Colab, loading them into
the identical architecture. The result:

- 0 out of 24 correct on real leaf images from 8 known classes
- top-1 confidence is ~5% on EVERY image (uniform over 52 classes = 1.9%)
- normalized entropy ~0.96 out of 1.0 on EVERY image
- it gives the same uniform output for a guava leaf and an Apple Healthy leaf

So the exported model produces an essentially uniform softmax for all inputs.

I already ruled out these causes:
- NOT a load failure: the weights load fine and are not at initialization
  (BatchNorm moving_var mean is ~11.9, not 1.0; dense_output kernel std is ~0.059)
- NOT a class-count mismatch: the head in the .h5 is (512, 52) and class_names.json
  has 52 entries in the same sorted order
- NOT label-index shift: that would give confident wrong answers, not uniform ones

Extra clue: the exported file is 35 MB, but the previous working checkpoint from this
same notebook was 102 MB (~3x, i.e. the old one included Adam optimizer state).

Read every cell in this notebook and its outputs, then tell me:
1. Did training actually run this session, or was it skipped/interrupted? Quote the
   exact cell output that proves your answer.
2. What were the final training accuracy, validation accuracy, and test accuracy?
3. Given those numbers, what is the single most likely root cause of a uniform-softmax
   model? Rank your hypotheses and point at the specific cell and line responsible.

Do not suggest fixes yet. Diagnose first, citing cell outputs.
```

---

## PROMPT 2 — if it says training was SKIPPED or interrupted

```
Fix this notebook so training can never be silently skipped or silently exported
half-trained. Give me the corrected cells, ready to paste:

1. A cleanup cell to run before training that removes stale checkpoints and the old
   split, so a leftover file can never cause training to be skipped.
2. Make training resume-safe for Colab free tier, which disconnects often: save a
   checkpoint to Google Drive after EVERY epoch, and on restart automatically resume
   from the last completed epoch using initial_epoch instead of starting over.
3. A verification cell to run immediately BEFORE exporting that raises an exception
   (not just a print) if any of these fail:
   - model.output_shape[-1] != len(classes)
   - final training accuracy below 0.50
   - test accuracy below 0.50
4. An export cell that writes the weights and class_names.json together as a
   guaranteed matched pair from the same in-memory model.

Show the full replacement code for each cell and tell me which existing cell number
each one replaces.
```

---

## PROMPT 3 — if training DID run but accuracy is genuinely low

```
Training ran to completion in this notebook but the model still produces a near-uniform
softmax. Investigate these specific causes by inspecting my cells, and tell me which
one is responsible with evidence:

- The Unknown___Unknown class contains ~1000 synthetic images (random Lorem Picsum
  photos, Gaussian noise, drawn textures). Is it dominating the loss or destabilizing
  training? Print the per-class training image counts to check.
- The CosineDecay decay_steps value versus the actual number of steps run.
- Adam learning rates 5e-4 (phase 1) and 1e-4 (phase 2) combined with
  label_smoothing=0.1, sqrt class weights, and heavy augmentation.
- base_model(inputs, training=False) combined with unfreezing layers in Phase 2 --
  does this leave BatchNorm in the wrong mode during fine-tuning?
- Whether train and inference preprocessing match: my inference applies
  tf.keras.applications.efficientnet.preprocess_input to a uint8 [0,255] array.

Print the diagnostic values you need from my data, then name the single cause and give
me the corrected cell.
```

---

## PROMPT 4 — designing the Unknown class properly

```
The purpose of my Unknown___Unknown class is to reject crops the model was not trained
on. It currently holds random photos, Gaussian noise, and synthetic textures.

This does NOT work: in my earlier 51-class model a real guava leaf was classified as
"Potato Healthy" with 79% confidence, because a guava leaf resembles a leaf, not noise.

Advise me concretely:
1. Should this class instead hold real leaves of non-target crops (guava, papaya,
   coffee, tea, brinjal, chilli)? Should I keep the noise/random photos as well, or
   split them into a separate class?
2. How many images should it have relative to my other classes (which average a few
   hundred each) so it neither dominates training nor gets ignored?
3. How should it interact with my existing balancing code, which undersamples majority
   classes to median*2 and oversamples minorities to median*1.2?
4. Give me the code to add to this notebook to implement your recommendation.
```

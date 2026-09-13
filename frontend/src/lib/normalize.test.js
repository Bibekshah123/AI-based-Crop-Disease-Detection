import { describe, it, expect } from "vitest";
import { normalizePrediction, deriveStatus, Status, toHistoryRecord } from "./normalize";

const base = {
  disease: "Tomato Early Blight",
  confidence: 92.3,
  crop_type: "Tomato",
  top_5_predictions: [
    { disease: "Tomato Early Blight", confidence: 92.3 },
    { disease: "Tomato Late Blight", confidence: 4.1 },
    { disease: "Tomato Leaf Mold", confidence: 2.0 },
    { disease: "Tomato Healthy", confidence: 1.0 },
    { disease: "Tomato Septoria", confidence: 0.6 },
  ],
  gradcam_image: "data:image/jpeg;base64,xxx",
};

describe("deriveStatus", () => {
  it("returns high for confident, unflagged predictions", () => {
    expect(deriveStatus({ confidence: 85 })).toBe(Status.HIGH);
  });
  it("returns moderate for mid confidence", () => {
    expect(deriveStatus({ confidence: 70 })).toBe(Status.MODERATE);
  });
  it("returns uncertain for low confidence", () => {
    expect(deriveStatus({ confidence: 40 })).toBe(Status.UNCERTAIN);
  });
  it("forces uncertain when the backend flags doubt, even at high confidence", () => {
    expect(deriveStatus({ confidence: 99, is_unknown: true })).toBe(Status.UNCERTAIN);
    expect(deriveStatus({ confidence: 99, not_leaf: true })).toBe(Status.UNCERTAIN);
    expect(deriveStatus({ confidence: 99, crop_mismatch: true })).toBe(Status.UNCERTAIN);
    expect(deriveStatus({ confidence: 99, low_confidence: true })).toBe(Status.UNCERTAIN);
  });
});

describe("normalizePrediction", () => {
  it("maps core fields and derives high-confidence status", () => {
    const r = normalizePrediction(base);
    expect(r.disease).toBe("Tomato Early Blight");
    expect(r.status).toBe(Status.HIGH);
    expect(r.statusLabel).toBe("High confidence");
    expect(r.tone).toBe("success");
    expect(r.gradcam).toBe("data:image/jpeg;base64,xxx");
  });

  it("exposes up to three alternatives after the main prediction", () => {
    const r = normalizePrediction(base);
    expect(r.alternatives).toHaveLength(3);
    expect(r.alternatives[0].disease).toBe("Tomato Late Blight");
  });

  it("is defensive against missing fields", () => {
    const r = normalizePrediction({});
    expect(r.disease).toBe("Unknown");
    expect(r.alternatives).toEqual([]);
    expect(r.gradcam).toBeNull();
    expect(r.status).toBe(Status.UNCERTAIN);
  });

  it("falls back to the provided cropType when the response omits it", () => {
    const r = normalizePrediction({ confidence: 90 }, { cropType: "Rice" });
    expect(r.cropType).toBe("Rice");
  });
});

describe("history records are not frozen in one language", () => {
  const raw = {
    disease: "Tomato Late blight",
    disease_np: "गोलभेँडाको पछौटे डढुवा",
    symptoms: "Large dark lesions on leaves and stems.",
    symptoms_np: "पात र डाँठमा ठूला गाढा घाउ।",
    confidence: 97.7,
    crop_type: "Tomato",
    top_5_predictions: [{ disease: "Tomato Late blight", confidence: 97.7 }],
    gradcam_image: "data:image/jpeg;base64," + "A".repeat(50000),
    raw_probabilities: Array.from({ length: 52 }, (_, i) => ({ index: i, probability: 0 })),
  };

  it("drops the two oversized fields before storing", () => {
    const rec = toHistoryRecord(normalizePrediction(raw, { lang: "en" }), {
      thumbnail: null, id: "x", timestamp: 1,
    });
    expect(rec.raw.gradcam_image).toBeUndefined();
    expect(rec.raw.raw_probabilities).toBeUndefined();
    expect(rec.raw.symptoms_np).toBe("पात र डाँठमा ठूला गाढा घाउ।");
    expect(JSON.stringify(rec).length).toBeLessThan(5000);
  });

  it("a record saved in English still renders in Nepali", () => {
    const rec = toHistoryRecord(normalizePrediction(raw, { lang: "en" }), {
      thumbnail: null, id: "x", timestamp: 1,
    });
    const asNepali = normalizePrediction(rec.raw, { lang: "np" });
    expect(asNepali.disease).toBe("गोलभेँडाको पछौटे डढुवा");
    expect(asNepali.symptoms).toBe("पात र डाँठमा ठूला गाढा घाउ।");
    expect(asNepali.statusLabel).toBe("उच्च विश्वसनीयता");

    const asEnglish = normalizePrediction(rec.raw, { lang: "en" });
    expect(asEnglish.disease).toBe("Tomato Late blight");
    expect(asEnglish.statusLabel).toBe("High confidence");
  });
});

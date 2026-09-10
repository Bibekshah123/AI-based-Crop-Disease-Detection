import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultView from "./ResultView";
import { normalizePrediction } from "../lib/normalize";
import { LanguageProvider } from "../context/LanguageContext";

function renderResult(raw, image = "data:image/jpeg;base64,photo") {
  const data = normalizePrediction(raw);
  return render(
    <LanguageProvider>
      <ResultView data={data} image={image} feedbackId="test-1" onCheckAnother={() => {}} />
    </LanguageProvider>
  );
}

describe("ResultView", () => {
  beforeEach(() => localStorage.clear());

  it("shows responsible 'Possible match' wording and the disease", () => {
    renderResult({ disease: "Grape Black Rot", confidence: 88, top_5_predictions: [{ disease: "Grape Black Rot", confidence: 88 }] });
    expect(screen.getByText(/possible match/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grape Black Rot" })).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });

  it("renders the Grad-CAM explanation when a heatmap is present", () => {
    renderResult({ disease: "Apple Scab", confidence: 90, gradcam_image: "data:image/jpeg;base64,cam" });
    expect(screen.getByText(/does not confirm the diagnosis/i)).toBeInTheDocument();
    expect(screen.getByAltText(/regions that most influenced the model/i)).toBeInTheDocument();
  });

  it("surfaces an uncertainty warning for uncertain results", () => {
    renderResult({ disease: "Unknown", confidence: 20, low_confidence: true, message: "Low confidence." });
    expect(screen.getByText(/this result is uncertain/i)).toBeInTheDocument();
    expect(screen.getByText("Uncertain result")).toBeInTheDocument();
  });

  it("offers local feedback controls", () => {
    renderResult({ disease: "Rice Blast", confidence: 85, top_5_predictions: [{ disease: "Rice Blast", confidence: 85 }] });
    expect(screen.getByRole("button", { name: /yes, helpful/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /report wrong result/i })).toBeInTheDocument();
  });
});

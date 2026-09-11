import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ImagePicker from "./ImagePicker";
import { LanguageProvider } from "../context/LanguageContext";

const PREVIEW = "data:image/jpeg;base64,abc";

function renderPicker(props = {}) {
  return render(
    <LanguageProvider>
      <ImagePicker preview={PREVIEW} fileName="leaf.jpg" onSelect={() => {}} onClear={() => {}} {...props} />
    </LanguageProvider>
  );
}

describe("ImagePicker scanning state", () => {
  it("shows no scan overlay when idle", () => {
    renderPicker();
    expect(screen.queryByText(/scanning the leaf/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /remove/i })).toBeEnabled();
  });

  it("shows the scan overlay and locks the photo controls while analyzing", () => {
    renderPicker({ scanning: true });
    expect(screen.getByText(/scanning the leaf/i)).toBeInTheDocument();
    // the photo must not be swapped or dropped mid-request
    expect(screen.getByRole("button", { name: /replace/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /remove/i })).toBeDisabled();
  });

  it("keeps the overlay out of the accessibility tree", () => {
    const { container } = renderPicker({ scanning: true });
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeTruthy();
    expect(overlay.textContent).toMatch(/scanning the leaf/i);
  });
});

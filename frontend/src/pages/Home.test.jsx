import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Diagnose from "./Diagnose";
import { LanguageProvider } from "../context/LanguageContext";
import { ResultProvider } from "../context/ResultContext";

beforeAll(() => {
  URL.createObjectURL ??= () => "blob:test";
  URL.revokeObjectURL ??= () => {};
});

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LanguageProvider>
        <ResultProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diagnose" element={<Diagnose />} />
          </Routes>
        </ResultProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("Home – check a leaf", () => {
  it("opens the diagnose page with the photo picked on the home page", async () => {
    const { container } = renderApp();
    const input = container.querySelector('input[type="file"]:not([capture])');
    const photo = new File(["x"], "leaf.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, photo);

    expect(await screen.findByAltText(/leaf\.jpg/)).toBeInTheDocument();
  });

  it("shows an error instead of loading a file that is not an image", async () => {
    const { container } = renderApp();
    const input = container.querySelector('input[type="file"]:not([capture])');
    const doc = new File(["x"], "notes.pdf", { type: "application/pdf" });

    await userEvent.upload(input, doc, { applyAccept: false });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByAltText(/notes\.pdf/)).not.toBeInTheDocument();
  });
});

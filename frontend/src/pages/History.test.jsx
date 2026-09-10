import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import History from "./History";
import { LanguageProvider } from "../context/LanguageContext";
import { saveHistory } from "../lib/history";

function seed(n) {
  for (let i = 0; i < n; i++) {
    saveHistory({
      id: `rec-${i}`,
      timestamp: Date.now() - i * 1000,
      crop: "Tomato",
      disease: `Disease ${i}`,
      confidence: 90,
      status: "high",
      statusLabel: "High confidence",
      tone: "success",
      thumbnail: null,
      detail: { disease: `Disease ${i}` },
    });
  }
}

function renderHistory() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <History />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("History – delete all", () => {
  beforeEach(() => localStorage.clear());

  it("hides the delete-all control when there is no history", () => {
    renderHistory();
    expect(screen.queryByRole("button", { name: /delete all/i })).not.toBeInTheDocument();
  });

  it("asks for confirmation before clearing, and cancelling keeps the history", async () => {
    const user = userEvent.setup();
    seed(3);
    renderHistory();

    await user.click(screen.getByRole("button", { name: "Delete all" }));
    expect(screen.getByText(/delete all 3 saved checks/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Disease 0")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cropsense.history"))).toHaveLength(3);
  });

  it("clears every record and the underlying store when confirmed", async () => {
    const user = userEvent.setup();
    seed(3);
    renderHistory();

    await user.click(screen.getByRole("button", { name: "Delete all" }));
    await user.click(screen.getByRole("button", { name: /yes, delete all/i }));

    expect(screen.queryByText("Disease 0")).not.toBeInTheDocument();
    expect(screen.getByText(/no checks yet/i)).toBeInTheDocument();
    expect(localStorage.getItem("cropsense.history")).toBeNull();
    // the control itself disappears once there is nothing left to delete
    expect(screen.queryByRole("button", { name: "Delete all" })).not.toBeInTheDocument();
  });
});

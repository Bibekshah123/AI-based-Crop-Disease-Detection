import { describe, it, expect, beforeEach } from "vitest";
import { listHistory, saveHistory, getHistoryItem, removeHistory, clearHistory, makeId } from "./history";

describe("local history", () => {
  beforeEach(() => clearHistory());

  it("saves and lists newest-first", () => {
    saveHistory({ id: "a", timestamp: 1, disease: "A" });
    saveHistory({ id: "b", timestamp: 2, disease: "B" });
    const list = listHistory();
    expect(list.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("gets a single item by id", () => {
    saveHistory({ id: "x", timestamp: 5, disease: "X" });
    expect(getHistoryItem("x").disease).toBe("X");
    expect(getHistoryItem("missing")).toBeNull();
  });

  it("removes an item", () => {
    saveHistory({ id: "x", timestamp: 5 });
    removeHistory("x");
    expect(listHistory()).toHaveLength(0);
  });

  it("makeId produces unique ids", () => {
    expect(makeId()).not.toBe(makeId());
  });
});

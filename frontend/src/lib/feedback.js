/* Local, honest feedback store. Records the user's response in the browser —
   no fake network call, no backend change. Can be wired to a real endpoint
   later without touching the UI. */

const KEY = "cropsense.feedback";

export const Feedback = {
  HELPFUL: "helpful",
  WRONG: "wrong",
};

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function getFeedback(id) {
  if (!id) return null;
  return read()[id] || null;
}

export function setFeedback(id, value) {
  if (!id) return;
  const all = read();
  all[id] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore quota */
  }
}

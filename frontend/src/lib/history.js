/* Local-first prediction history, stored in the browser so it works with no
   login and no database. Records are small (small thumbnail + summary). */

const KEY = "cropsense.history";
const MAX_ENTRIES = 100;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    // Quota exceeded — drop the oldest and retry once.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.floor(MAX_ENTRIES / 2))));
      return true;
    } catch {
      return false;
    }
  }
}

export function listHistory() {
  return read().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function getHistoryItem(id) {
  return read().find((r) => r.id === id) || null;
}

export function saveHistory(record) {
  const list = read();
  list.unshift(record);
  write(list);
  return record;
}

export function removeHistory(id) {
  write(read().filter((r) => r.id !== id));
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function makeId() {
  // Time-ordered, collision-resistant enough for local records.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

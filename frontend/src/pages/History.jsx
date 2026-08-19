import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/ui";
import { listHistory, removeHistory } from "../lib/history";
import { statusMeta } from "../lib/normalize";
import s from "./pages.module.css";
import h from "./History.module.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "high", label: "High confidence" },
  { value: "moderate", label: "Moderate confidence" },
  { value: "uncertain", label: "Uncertain" },
];

function formatDate(ts) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return "";
  }
}

export default function History() {
  const [items, setItems] = useState(() => listHistory());
  const [crop, setCrop] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");

  const crops = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.crop).filter(Boolean)))],
    [items]
  );

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (crop !== "all" && i.crop !== crop) return false;
      if (status !== "all" && i.status !== status) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!`${i.disease} ${i.crop}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
    return list;
  }, [items, crop, status, sort, query]);

  const remove = (id) => {
    removeHistory(id);
    setItems(listHistory());
  };

  return (
    <div className={`container ${s.page}`}>
      <div className={s.head}>
        <h1 className={s.title}>Prediction history</h1>
        <p className={s.lead}>Your recent checks are saved on this device.</p>
      </div>

      {items.length === 0 ? (
        <div className="surface" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>No checks yet.</p>
          <Link to="/diagnose" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
            Check a leaf
          </Link>
        </div>
      ) : (
        <>
          <div className={h.filters}>
            <label className={h.filter}>
              <span className="sr-only">Search</span>
              <input
                className="input"
                type="search"
                placeholder="Search disease or crop"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className={h.filter}>
              <span className="sr-only">Filter by crop</span>
              <select className="select" value={crop} onChange={(e) => setCrop(e.target.value)}>
                {crops.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All crops" : c}</option>
                ))}
              </select>
            </label>
            <label className={h.filter}>
              <span className="sr-only">Filter by status</span>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className={h.filter}>
              <span className="sr-only">Sort order</span>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          <p className={h.count} aria-live="polite">{filtered.length} of {items.length} shown</p>

          {filtered.length === 0 ? (
            <div className="surface" style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-text-muted)" }}>
              No checks match these filters.
            </div>
          ) : (
            <ul className={h.list}>
              {filtered.map((item) => (
                <li key={item.id} className={h.item}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className={h.thumb} />
                  ) : (
                    <span className={h.thumbFallback} aria-hidden="true" />
                  )}
                  <div className={h.info}>
                    <div className={h.infoTop}>
                      <span className={h.crop}>{item.crop || "—"}</span>
                      <StatusBadge tone={item.tone || statusMeta(item.status).tone}>{item.statusLabel}</StatusBadge>
                    </div>
                    <p className={h.disease}>{item.disease}</p>
                    <p className={h.meta}>{item.confidence}% · {formatDate(item.timestamp)}</p>
                  </div>
                  <div className={h.actions}>
                    <Link to={`/history/${item.id}`} className="btn btn-secondary">Details</Link>
                    <button type="button" className="btn btn-ghost" onClick={() => remove(item.id)}>
                      <span className="sr-only">Delete check for {item.disease}</span>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

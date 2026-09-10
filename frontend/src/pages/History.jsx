import { useMemo, useState } from "react";
import { useLang } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/ui";
import { listHistory, removeHistory, clearHistory } from "../lib/history";
import { statusMeta } from "../lib/normalize";
import { cropName } from "../lib/crops";
import s from "./pages.module.css";
import h from "./History.module.css";

const STATUS_KEYS = [
  { value: "all", key: "allStatuses" },
  { value: "high", key: "statusHigh" },
  { value: "moderate", key: "statusModerate" },
  { value: "uncertain", key: "statusUncertain" },
];

function formatDate(ts, lang) {
  try {
    const locale = lang === "np" ? "ne-NP" : "en";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return "";
  }
}

export default function History() {
  const { t, lang } = useLang();
  // older records predate the two-name fields, so fall back to what they stored
  const nameOf = (item) =>
    (lang === "np" ? item.diseaseNp : item.diseaseEn) || item.disease;
  const STATUS_OPTIONS = STATUS_KEYS.map((o) => ({ value: o.value, label: t[o.key] }));
  const [items, setItems] = useState(() => listHistory());
  const [crop, setCrop] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [announcement, setAnnouncement] = useState("");

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

  const clearAll = () => {
    clearHistory();
    setItems([]);
    setConfirmingClear(false);
    setAnnouncement(t.historyCleared);
  };

  return (
    <div className={`container ${s.page}`}>
      <div className={`${s.head} ${h.headRow}`}>
        <div>
          <h1 className={s.title}>{t.historyTitle}</h1>
          <p className={s.lead}>{t.historyLead}</p>
        </div>

        {items.length > 0 &&
          (confirmingClear ? (
            <div className={h.clearConfirm} role="group" aria-label={t.deleteAll}>
              <p className={h.clearConfirmText}>{t.deleteAllConfirm(items.length)}</p>
              <div className={h.clearConfirmBtns}>
                <button type="button" className={`btn ${h.dangerBtn}`} onClick={clearAll}>
                  {t.deleteAllYes}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmingClear(false)}>
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmingClear(true)}>
              {t.deleteAll}
            </button>
          ))}
      </div>

      <div aria-live="polite" className="sr-only">{announcement}</div>

      {items.length === 0 ? (
        <div className="surface" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>{t.historyEmpty}</p>
          <Link to="/diagnose" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
            Check a leaf
          </Link>
        </div>
      ) : (
        <>
          <div className={h.filters}>
            <label className={h.filter}>
              <span className="sr-only">{t.search}</span>
              <input
                className="input"
                type="search"
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className={h.filter}>
              <span className="sr-only">{t.filterByCrop}</span>
              <select className="select" value={crop} onChange={(e) => setCrop(e.target.value)}>
                {crops.map((c) => (
                  <option key={c} value={c}>{c === "all" ? t.allCrops : c}</option>
                ))}
              </select>
            </label>
            <label className={h.filter}>
              <span className="sr-only">{t.filterByStatus}</span>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className={h.filter}>
              <span className="sr-only">{t.sortOrder}</span>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">{t.newestFirst}</option>
                <option value="oldest">{t.oldestFirst}</option>
              </select>
            </label>
          </div>

          <p className={h.count} aria-live="polite">{t.countShown(filtered.length, items.length)}</p>

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
                      <span className={h.crop}>{item.crop ? cropName(item.crop, lang) : "—"}</span>
                      <StatusBadge tone={item.tone || statusMeta(item.status).tone}>
                        {statusMeta(item.status, lang).label}
                      </StatusBadge>
                    </div>
                    <p className={h.disease}>{nameOf(item)}</p>
                    <p className={h.meta}>{item.confidence}% · {formatDate(item.timestamp, lang)}</p>
                  </div>
                  <div className={h.actions}>
                    <Link to={`/history/${item.id}`} className="btn btn-secondary">{t.details}</Link>
                    <button type="button" className="btn btn-ghost" onClick={() => remove(item.id)}>
                      <span className="sr-only">{t.deleteOneLabel(nameOf(item))}</span>
                      {t.deleteOne}
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

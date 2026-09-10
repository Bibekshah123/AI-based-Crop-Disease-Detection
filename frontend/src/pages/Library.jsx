import { useMemo, useState } from "react";
import { useLang } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import diseases from "../data/diseases.json";
import { CROPS, cropName } from "../lib/crops";
import s from "./pages.module.css";
import l from "./Library.module.css";

function shorten(text, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default function Library() {
  const { t, lang } = useLang();
  const [crop, setCrop] = useState("all");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return diseases.filter((d) => {
      if (crop !== "all" && d.crop !== crop) return false;
      if (q && !`${d.disease} ${d.symptoms}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [crop, query]);

  return (
    <div className={`container ${s.page}`}>
      <div className={s.head}>
        <h1 className={s.title}>{t.libraryTitle}</h1>
        <p className={s.lead}>
          Reference information for the crops and diseases this tool can recognize.
        </p>
      </div>

      <div className={l.filters}>
        <label className={l.filter}>
          <span className="sr-only">{t.searchDiseases}</span>
          <input
            className="input"
            type="search"
            placeholder={t.searchDiseasePlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={l.filter}>
          <span className="sr-only">{t.filterByCrop}</span>
          <select className="select" value={crop} onChange={(e) => setCrop(e.target.value)}>
            <option value="all">{t.allCrops}</option>
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className={l.count} aria-live="polite">{results.length} entries</p>

      <ul className={l.grid}>
        {results.map((d) => (
          <li key={d.id}>
            <Link to={`/library/${d.id}`} className={l.card}>
              <span className={l.crop}>{cropName(d.crop, lang)}</span>
              <span className={l.name}>{lang === "np" && d.name_np ? d.name_np : d.name}</span>
              <span className={l.symptoms}>{shorten(d.symptoms)}</span>
              <span className={l.more}>{t.viewDetails}</span>
            </Link>
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <div className="surface" style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-text-muted)" }}>
          No entries match your search.
        </div>
      )}
    </div>
  );
}

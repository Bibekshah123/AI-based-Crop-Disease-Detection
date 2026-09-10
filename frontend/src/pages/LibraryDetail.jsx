import { Link, useParams } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { cropName } from "../lib/crops";
import diseases from "../data/diseases.json";
import { EmptyState, StatusBadge } from "../components/ui";
import s from "./pages.module.css";
import l from "./Library.module.css";

export default function LibraryDetail() {
  const { t, lang } = useLang();
  const pick = (f) => (lang === "np" && entry?.[`${f}_np`]) || entry?.[f] || "";
  const { id } = useParams();
  const entry = diseases.find((d) => d.id === id);

  if (!entry) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title={t.entryNotFound}
          action={<Link to="/library" className="btn btn-primary">{t.backToLibraryBtn}</Link>}
        >
          {t.entryNotFoundBody}
        </EmptyState>
      </div>
    );
  }

  const sections = [
    { label: t.description, value: pick("description") },
    { label: t.secCause, value: pick("cause") },
    { label: t.secSymptoms, value: pick("symptoms") },
    { label: t.secTreatment, value: pick("treatment") },
    { label: t.secPrevention, value: pick("prevention") },
  ].filter((sec) => sec.value);

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <Link to="/library" className="btn btn-ghost" style={{ marginBottom: "var(--space-4)" }}>
        {t.backToLibrary}
      </Link>

      <div className={l.detailHead}>
        <span className={l.crop}>{cropName(entry.crop, lang)}</span>
        {entry.healthy && <StatusBadge tone="success">{t.healthy}</StatusBadge>}
        <h1 className={l.detailTitle}>{lang === "np" && entry.name_np ? entry.name_np : entry.name}</h1>
      </div>

      <div className={l.detailSections}>
        {sections.map((sec) => (
          <section key={sec.label} className={`surface ${l.detailCard}`}>
            <h2 className={l.detailCardTitle}>{sec.label}</h2>
            <p>{sec.value}</p>
          </section>
        ))}
      </div>

      {entry.disclaimer && <p className={l.disclaimer}>{pick("disclaimer")}</p>}
    </div>
  );
}

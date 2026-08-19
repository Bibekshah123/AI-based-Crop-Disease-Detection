import { Link, useParams } from "react-router-dom";
import diseases from "../data/diseases.json";
import { EmptyState, StatusBadge } from "../components/ui";
import s from "./pages.module.css";
import l from "./Library.module.css";

export default function LibraryDetail() {
  const { id } = useParams();
  const entry = diseases.find((d) => d.id === id);

  if (!entry) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title="Entry not found"
          action={<Link to="/library" className="btn btn-primary">Back to library</Link>}
        >
          That disease entry does not exist.
        </EmptyState>
      </div>
    );
  }

  const sections = [
    { label: "Description", value: entry.description },
    { label: "Cause", value: entry.cause },
    { label: "Symptoms", value: entry.symptoms },
    { label: "General management", value: entry.treatment },
    { label: "Prevention", value: entry.prevention },
  ].filter((sec) => sec.value);

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <Link to="/library" className="btn btn-ghost" style={{ marginBottom: "var(--space-4)" }}>
        ← Back to library
      </Link>

      <div className={l.detailHead}>
        <span className={l.crop}>{entry.crop}</span>
        {entry.healthy && <StatusBadge tone="success">Healthy</StatusBadge>}
        <h1 className={l.detailTitle}>{entry.name}</h1>
      </div>

      <div className={l.detailSections}>
        {sections.map((sec) => (
          <section key={sec.label} className={`surface ${l.detailCard}`}>
            <h2 className={l.detailCardTitle}>{sec.label}</h2>
            <p>{sec.value}</p>
          </section>
        ))}
      </div>

      {entry.disclaimer && <p className={l.disclaimer}>{entry.disclaimer}</p>}
    </div>
  );
}

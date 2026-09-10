import { useNavigate, useParams, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import ResultView from "../components/ResultView";
import { EmptyState } from "../components/ui";
import { getHistoryItem } from "../lib/history";
import s from "./pages.module.css";

export default function HistoryDetail() {
  const { t } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = getHistoryItem(id);

  if (!item?.detail) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title={t.checkNotFound}
          action={<Link to="/history" className="btn btn-primary">{t.backToHistory}</Link>}
        >
          {t.checkNotFoundBody}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <Link to="/history" className="btn btn-ghost" style={{ marginBottom: "var(--space-4)" }}>
        {t.backToHistoryLink}
      </Link>
      <ResultView
        data={item.detail}
        image={item.thumbnail}
        feedbackId={item.id}
        onCheckAnother={() => navigate("/diagnose")}
      />
    </div>
  );
}

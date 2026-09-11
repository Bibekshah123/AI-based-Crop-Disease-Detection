import { useNavigate, useParams, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { normalizePrediction } from "../lib/normalize";
import ResultView from "../components/ResultView";
import { EmptyState } from "../components/ui";
import { getHistoryItem } from "../lib/history";
import s from "./pages.module.css";

export default function HistoryDetail() {
  const { t, lang } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = getHistoryItem(id);

  // Records saved before this change kept a rendered snapshot in `detail`.
  const data = item?.raw
    ? normalizePrediction(item.raw, { cropType: item.crop, lang })
    : item?.detail;

  if (!data) {
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
        data={data}
        image={item.thumbnail}
        feedbackId={item.id}
        onCheckAnother={() => navigate("/diagnose")}
      />
    </div>
  );
}

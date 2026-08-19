import { useNavigate, useParams, Link } from "react-router-dom";
import ResultView from "../components/ResultView";
import { EmptyState } from "../components/ui";
import { getHistoryItem } from "../lib/history";
import s from "./pages.module.css";

export default function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = getHistoryItem(id);

  if (!item?.detail) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title="Check not found"
          action={<Link to="/history" className="btn btn-primary">Back to history</Link>}
        >
          This saved check is no longer available on this device.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <Link to="/history" className="btn btn-ghost" style={{ marginBottom: "var(--space-4)" }}>
        ← Back to history
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

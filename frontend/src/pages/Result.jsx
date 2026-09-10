import { useNavigate } from "react-router-dom";
import ResultView from "../components/ResultView";
import { EmptyState } from "../components/ui";
import { useResult } from "../context/ResultContext";
import { useLang } from "../context/LanguageContext";
import s from "./pages.module.css";

export default function Result() {
  const navigate = useNavigate();
  const { result, clear } = useResult();
  const { t } = useLang();

  const checkAnother = () => {
    clear();
    navigate("/diagnose");
  };

  if (!result?.data) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title={t.noResult}
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate("/diagnose")}>
              {t.checkALeaf}
            </button>
          }
        >
          {t.noResultBody}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <ResultView
        data={result.data}
        image={result.image}
        feedbackId={result.id}
        onCheckAnother={checkAnother}
      />
    </div>
  );
}

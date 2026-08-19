import { useNavigate } from "react-router-dom";
import ResultView from "../components/ResultView";
import { EmptyState } from "../components/ui";
import { useResult } from "../context/ResultContext";
import s from "./pages.module.css";

export default function Result() {
  const navigate = useNavigate();
  const { result, clear } = useResult();

  const checkAnother = () => {
    clear();
    navigate("/diagnose");
  };

  if (!result?.data) {
    return (
      <div className={`container ${s.page}`}>
        <EmptyState
          title="No result to show"
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate("/diagnose")}>
              Check a leaf
            </button>
          }
        >
          Start a diagnosis to see the possible disease match and guidance here.
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

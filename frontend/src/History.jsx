import { useNavigate } from "react-router-dom";

export default function History() {
  const navigate = useNavigate();

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="history-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Prediction History</h2>
      </div>
      <div className="history-empty">
        <p>History is disabled. Predictions are not saved when authentication is turned off.</p>
      </div>
    </div>
  );
}

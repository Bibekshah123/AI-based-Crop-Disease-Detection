import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function History() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/auth/history?limit=50`)
      .then((res) => setEntries(res.data.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/auth/history/${id}`);
      setEntries((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => (prev?.id === id ? null : prev));
    } catch {
      alert("Failed to delete prediction");
    }
  };

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-header">
          <button className="history-back" onClick={() => navigate("/")}>← Back</button>
          <h2>Prediction History</h2>
        </div>
        <div className="history-loading">Loading...</div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="history-page">
        <div className="history-header">
          <button className="history-back" onClick={() => setSelected(null)}>← Back</button>
          <h2>Prediction Details</h2>
          <button className="history-remove" onClick={(e) => handleDelete(e, selected.id)}>Remove</button>
        </div>
        <div className="history-detail">
          <div className="history-detail-images">
            {selected.thumbnail && (
              <div className="history-detail-img-wrap">
                <h4>Uploaded Image</h4>
                <img src={selected.thumbnail} alt="Uploaded" className="history-detail-img" />
              </div>
            )}
            {selected.gradcam_image && (
              <div className="history-detail-img-wrap">
                <h4>Grad-CAM</h4>
                <img src={selected.gradcam_image} alt="Grad-CAM" className="history-detail-img" />
              </div>
            )}
          </div>
          <div className="history-detail-info">
            <p><strong>Disease:</strong> {selected.disease}{selected.disease_np ? ` / ${selected.disease_np}` : ''}</p>
            <p><strong>Confidence:</strong> {selected.confidence}%</p>
            <p><strong>Crop:</strong> {selected.crop_type || "Not specified"}</p>
            <p><strong>Date:</strong> {new Date(selected.timestamp).toLocaleString()}</p>
            <p><strong>Message:</strong> {selected.message}</p>
            <p><strong>Cause:</strong> {selected.cause}{selected.cause_np ? ` / ${selected.cause_np}` : ''}</p>
            <p><strong>Symptoms:</strong> {selected.symptoms}{selected.symptoms_np ? ` / ${selected.symptoms_np}` : ''}</p>
            <p><strong>Treatment:</strong> {selected.treatment}{selected.treatment_np ? ` / ${selected.treatment_np}` : ''}</p>
            <p><strong>Prevention:</strong> {selected.prevention}{selected.prevention_np ? ` / ${selected.prevention_np}` : ''}</p>
          </div>
          {selected.top_5_predictions?.length > 0 && (
            <div className="history-top5">
              <h4>Top Predictions</h4>
              {selected.top_5_predictions.map((p, i) => (
                <div key={i} className="history-pred-row">
                  <span>#{i + 1} {p.disease}{p.disease_np ? ` / ${p.disease_np}` : ''}</span>
                  <div className="history-pred-bar"><div style={{ width: `${p.confidence}%` }} /></div>
                  <span>{p.confidence}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="history-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Prediction History</h2>
        <span className="history-count">{entries.length} predictions</span>
      </div>
      {entries.length === 0 ? (
        <div className="history-empty">
          <p>No predictions yet. Upload a leaf image to get started.</p>
        </div>
      ) : (
        <div className="history-list">
          {entries.map((entry) => (
            <div key={entry.id} className="history-card" onClick={() => setSelected(entry)}>
              {entry.thumbnail && (
                <img src={entry.thumbnail} alt="" className="history-thumb" />
              )}
              <div className="history-card-info">
                <div className="history-card-top">
                  <strong>{entry.disease}{entry.disease_np ? ` / ${entry.disease_np}` : ''}</strong>
                  <span className={`history-badge ${entry.not_leaf ? "badge-notleaf" : entry.is_unknown ? "badge-unknown" : entry.confidence >= 80 ? "badge-high" : entry.confidence >= 60 ? "badge-med" : "badge-low"}`}>
                    {entry.not_leaf ? "Not Leaf" : entry.is_unknown ? "Unknown" : entry.confidence + "%"}
                  </span>
                </div>
                <div className="history-card-meta">
                  {entry.crop_type && <span>{entry.crop_type}</span>}
                  <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="history-card-msg">{entry.message}</p>
              </div>
              <button
                className="history-card-remove"
                onClick={(e) => handleDelete(e, entry.id)}
              >Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

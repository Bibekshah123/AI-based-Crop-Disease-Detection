import { useState, useRef, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";
import Signup from "./Signup";
import History from "./History";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const CROPS = [
  { id: "Apple", label: "Apple", label_np: "स्याउ", color: "#dc2626" },
  { id: "Banana", label: "Banana", label_np: "केरा", color: "#eab308" },
  { id: "Citrus", label: "Citrus", label_np: "अन्जिर", color: "#f97316" },
  { id: "Coffee", label: "Coffee", label_np: "कफी", color: "#78350f" },
  { id: "Corn", label: "Corn", label_np: "मकै", color: "#a16207" },
  { id: "Mango", label: "Mango", label_np: "आँप", color: "#f59e0b" },
  { id: "Potato", label: "Potato", label_np: "आलु", color: "#92400e" },
  { id: "Rice", label: "Rice", label_np: "धान", color: "#65a30d" },
  { id: "Tomato", label: "Tomato", label_np: "टमाटर", color: "#ef4444" },
];

const TEXTS = {
  en: {
    hero_badge: "AI-Powered Analysis",
    hero_title_top: "Crop Disease Detection",
    upload_title: "Upload Image",
    select_crop: "Select Crop",
    upload_label: "Upload Leaf Image",
    drop_title: "Drop image here or click to browse",
    drop_hint: "Supports JPG, PNG, WEBP",
    detect: "Detect Disease",
    analyzing: "Analyzing...",
    no_analysis_title: "No Analysis Yet",
    no_analysis_text: "Upload a leaf image and select a crop to get started.",
    processing: "Processing image...",
    high_confidence: "High Confidence",
    medium_confidence: "Medium Confidence",
    low_confidence: "Low Confidence",
    confidence: "Confidence",
    cause: "Cause",
    symptoms: "Symptoms",
    treatment: "Treatment",
    prevention: "Prevention",
    top_predictions: "Top Predictions",
    gradcam_title: "Grad-CAM Heatmap",
    gradcam_hint: "Red areas show where the model focused",
    not_leaf: "Please upload a clear leaf image. The uploaded image does not appear to be a crop leaf.",
    remove: "Remove image",
    np: "नेपाली",
    en: "English",
    logout: "Logout",
    history: "History",
  },
  np: {
    hero_badge: "एआई-संचालित विश्लेषण",
    hero_title_top: "क्रप रोग पत्ता लगाउने",
    upload_title: "तस्वीर अपलोड गर्नुहोस्",
    select_crop: "बाली चयन गर्नुहोस्",
    upload_label: "पातको तस्वीर अपलोड गर्नुहोस्",
    drop_title: "तस्वीर यहाँ छोड्नुहोस् वा क्लिक गर्नुहोस्",
    drop_hint: "JPG, PNG, WEBP समर्थन गर्दछ",
    detect: "रोग पत्ता लगाउनुहोस्",
    analyzing: "विश्लेषण गर्दै...",
    no_analysis_title: "कुनै विश्लेषण छैन",
    no_analysis_text: "पातको तस्वीर अपलोड गर्नुहोस् र बाली चयन गर्नुहोस्।",
    processing: "तस्वीर प्रशोधन गर्दै...",
    high_confidence: "उच्च विश्वास",
    medium_confidence: "मध्यम विश्वास",
    low_confidence: "कम विश्वास",
    confidence: "विश्वास स्तर",
    cause: "कारण",
    symptoms: "लक्षणहरू",
    treatment: "उपचार",
    prevention: "रोकथाम",
    top_predictions: "शीर्ष अनुमानहरू",
    gradcam_title: "ग्र्याड-क्याम हिटम्याप",
    gradcam_hint: "रातो रङले मोडेलले ध्यान दिएको क्षेत्र देखाउँछ",
    not_leaf: "कृपया स्पष्ट पातको तस्वीर अपलोड गर्नुहोस्। यो तस्वीर बालीको पात जस्तो देखिँदैन।",
    remove: "तस्वीर हटाउनुहोस्",
    np: "नेपाली",
    en: "English",
    logout: "लग आउट",
    history: "इतिहास",
  },
};

const CONFIDENCE_COLORS = {
  high: { bg: "#dcfce7", text: "#166534", bar: "#22c55e" },
  medium: { bg: "#fef3c7", text: "#92400e", bar: "#f59e0b" },
  low: { bg: "#fee2e2", text: "#991b1b", bar: "#ef4444" },
};

function getConfidenceLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function MainApp() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cropType, setCropType] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("lang");
    return saved === "np" ? "np" : "en";
  });
  const fileInputRef = useRef(null);
  const { user, logout } = useAuth();
  const t = TEXTS[lang];

  const toggleLang = () => {
    const next = lang === "en" ? "np" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const handleFile = useCallback((selected) => {
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setPreview(URL.createObjectURL(selected));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("image/")) handleFile(dropped);
  }, [handleFile]);

  const handleFileChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const clearImage = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePredict = async () => {
    if (!file) return;
    if (!cropType) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("crop_type", cropType);

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        alert("Prediction failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const confidence = result?.confidence || 0;
  const level = getConfidenceLevel(confidence);
  const colors = CONFIDENCE_COLORS[level];

  const np = (key, fallback) => {
    if (lang !== "np") return null;
    return result?.[key] || fallback || null;
  };

  return (
    <div className="app">
      <section className="hero">
        <span className="hero-badge">{t.hero_badge}</span>
        <h1 className="hero-title">{t.hero_title_top}</h1>
        <div className="hero-top">
          <span className="hero-username">{user?.username}</span>
          <button className="history-btn" onClick={() => navigate("/history")}>{t.history}</button>
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === "en" ? "नेपाली" : "English"}
          </button>
          <button className="logout-btn" onClick={logout}>{t.logout}</button>
        </div>
      </section>

      <main className="main">
        <div className="layout">
          <div className="upload-column">
            <div className="card">
              <h2 className="card-title">{t.upload_title}</h2>

              <div className="crop-section">
                <label className="section-label">{t.select_crop}</label>
                <div className="crop-grid">
                  {CROPS.map((crop) => (
                    <button
                      key={crop.id}
                      className={`crop-chip ${cropType === crop.id ? "active" : ""}`}
                      style={{
                        borderColor: cropType === crop.id ? crop.color : "transparent",
                      }}
                      onClick={() => setCropType(crop.id)}
                    >
                      <span className="crop-name">{lang === "np" ? crop.label_np : crop.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="drop-section">
                <label className="section-label">{t.upload_label}</label>
                <div
                  className={`drop-zone ${dragOver ? "drag-over" : ""} ${preview ? "has-image" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {preview ? (
                    <div className="preview-wrapper">
                      <img src={preview} alt="Preview" className="preview-img" />
                      <button className="remove-btn" onClick={(e) => { e.stopPropagation(); clearImage(); }} title={t.remove}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="drop-empty">
                      <div className="upload-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className="drop-title">{t.drop_title}</p>
                      <p className="drop-hint">{t.drop_hint}</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
                </div>
              </div>

              <button
                className={`detect-btn ${loading ? "loading" : ""}`}
                onClick={handlePredict}
                disabled={loading || !file || !cropType}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    {t.analyzing}
                  </span>
                ) : (
                  <span className="btn-text">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {t.detect}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="results-column">
            {!result && !loading && (
              <div className="card empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3>{t.no_analysis_title}</h3>
                <p>{t.no_analysis_text}</p>
              </div>
            )}

            {loading && !result && (
              <div className="card loading-state">
                <div className="loading-bar-track">
                  <div className="loading-bar-fill" />
                </div>
                <p className="loading-text">{t.processing}</p>
              </div>
            )}

            {result && (
              <div className="result-container" key={result.disease}>
                <div className="card result-header" style={{ borderLeftColor: colors.bar }}>
                  <div className="result-badge" style={{ background: colors.bg, color: colors.text }}>
                    {level === "high" ? t.high_confidence : level === "medium" ? t.medium_confidence : t.low_confidence}
                  </div>
                  <h2 className="disease-name">{np("disease_np", result.disease) || result.disease}</h2>
                  <div className="confidence-section">
                    <div className="confidence-row">
                      <span className="confidence-label">{t.confidence}</span>
                      <span className="confidence-value" style={{ color: colors.text }}>{confidence}%</span>
                    </div>
                    <div className="confidence-track">
                      <div className="confidence-fill" style={{ width: `${confidence}%`, background: colors.bar }} />
                    </div>
                  </div>
                </div>

                {result.is_unknown && <div className="card alert-unknown">{result.message}</div>}
                {result.not_leaf && <div className="card alert-unknown">{t.not_leaf}</div>}
                {!result.is_unknown && result.crop_mismatch && <div className="card alert-error">{result.message}</div>}
                {!result.is_unknown && !result.crop_mismatch && result.low_confidence && <div className="card alert-warning">{result.message}</div>}

                <div className="card description-card">
                  <p className="description-text">{np("description_np", result.description) || result.description}</p>
                </div>

                <div className="info-grid">
                  <div className="card info-card">
                    <div className="info-icon cause-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h4>{t.cause}</h4>
                    <p>{np("cause_np", result.cause) || result.cause}</p>
                  </div>
                  <div className="card info-card">
                    <div className="info-icon symptom-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" /><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>
                    </div>
                    <h4>{t.symptoms}</h4>
                    <p>{np("symptoms_np", result.symptoms) || result.symptoms}</p>
                  </div>
                  <div className="card info-card">
                    <div className="info-icon treatment-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <h4>{t.treatment}</h4>
                    <p>{np("treatment_np", result.treatment) || result.treatment}</p>
                  </div>
                  <div className="card info-card">
                    <div className="info-icon prevention-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <h4>{t.prevention}</h4>
                    <p>{np("prevention_np", result.prevention) || result.prevention}</p>
                  </div>
                </div>

                <div className="card visual-section">
                  <div className="visual-grid">
                    <div className="top-predictions">
                      <h4>{t.top_predictions}</h4>
                      <div className="prediction-list">
                        {result.top_5_predictions?.map((item, i) => (
                          <div key={i} className="prediction-row">
                            <span className="prediction-rank">#{i + 1}</span>
                            <span className="prediction-name">{lang === "np" ? (item.disease_np || item.disease) : item.disease}</span>
                            <div className="prediction-bar-track">
                              <div className="prediction-bar-fill" style={{ width: `${item.confidence}%` }} />
                            </div>
                            <span className="prediction-conf">{item.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {result.gradcam_image && (
                      <div className="gradcam-section">
                        <h4>{t.gradcam_title}</h4>
                        <div className="gradcam-wrapper">
                          <img src={result.gradcam_image} alt="Grad-CAM" className="gradcam-img" />
                        </div>
                        <p className="gradcam-hint">{t.gradcam_hint}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card disclaimer-card">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{result.disclaimer}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect auth pages away when logged in
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user && isAuthPage) {
    if (location.pathname === "/signup") return <Signup onSwitch={() => navigate("/login")} />;
    return <Login onSwitch={() => navigate("/signup")} />;
  }

  if (!user) {
    return <Login onSwitch={() => navigate("/signup")} />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/history" element={<History />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

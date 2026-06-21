import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function App() {
  const [file, setFile] = useState(null);
  const [cropType, setCropType] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const crops = [
    "Tomato",
    "Potato",
    "Corn",
    "Apple",
    "Banana",
    "Pepper",
    "Rice"
  ];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handlePredict = async () => {
    if (!file) {
      alert("Please upload a leaf image.");
      return;
    }

    if (!cropType) {
      alert("Please select crop type.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("crop_type", cropType);

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Prediction failed. Please check the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>AI-Based Crop Disease Detection</h1>
      <p className="subtitle">
        Upload a crop leaf image to detect the disease and receive general guidance.
      </p>

      <div className="card">
        <label>Select Crop Type</label>
        <select
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
        >
          <option value="">-- Select Crop --</option>
          {crops.map((crop) => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>

        <label>Upload Leaf Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {preview && (
          <div className="preview-box">
            <img src={preview} alt="Leaf preview" />
          </div>
        )}

        <button onClick={handlePredict} disabled={loading}>
          {loading ? "Predicting..." : "Detect Disease"}
        </button>
      </div>

      {result && (
        <div className="result-card">
          <h2>Prediction Result</h2>

          {result.low_confidence && (
            <div className="warning">{result.message}</div>
          )}

          <p><strong>Disease:</strong> {result.disease}</p>
          <p><strong>Confidence:</strong> {result.confidence}%</p>

          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${result.confidence}%` }}
            ></div>
          </div>

          <h3>Cause</h3>
          <p>{result.cause}</p>

          <h3>Symptoms</h3>
          <p>{result.symptoms}</p>

          <h3>Treatment</h3>
          <p>{result.treatment}</p>

          <h3>Prevention</h3>
          <p>{result.prevention}</p>

          <h3>Top 5 Predictions</h3>
          <ul>
            {result.top_5_predictions.map((item, index) => (
              <li key={index}>
                {item.disease}: {item.confidence}%
              </li>
            ))}
          </ul>

          {result.gradcam_image && (
            <>
              <h3>Grad-CAM Explanation</h3>
              <img
                src={result.gradcam_image}
                alt="Grad-CAM"
                className="gradcam"
              />
            </>
          )}

          <p className="disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
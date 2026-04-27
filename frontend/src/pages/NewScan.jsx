import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function riskClass(riskLevel) {
  if (riskLevel === "High") return "status-high";
  if (riskLevel === "Medium") return "status-medium";
  return "status-low";
}

export default function NewScan() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    setResult(null);

    try {
      if (!file) {
        throw new Error("Select an image before analyzing.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const prediction = await apiFetch("/predict", {
        method: "POST",
        body: formData,
      });

      setResult(prediction);
      setSuccess("Scan analyzed successfully.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="workspace">
      <div className="workspace-inner">
        <div className="workspace-hero">
          <div>
            <h1>New Scan</h1>
            <p>
              Upload an oral image for AI-powered analysis. Results are linked
              to your account automatically.
            </p>
          </div>
        </div>

        {error ? <div className="message error">{error}</div> : null}
        {success ? <div className="message success">{success}</div> : null}

        <div className="scan-workspace">
          <form className="list-panel scan-form-panel" onSubmit={handleSubmit}>
            <h3>Upload Image</h3>

            <div className="field scan-field">
              <label htmlFor="scan_file">Oral image</label>
              <input
                id="scan_file"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleFileChange}
                className="file-input"
                required
              />
              <div className="note">
                Accepted formats: JPG, JPEG, PNG. The image is validated
                before inference runs.
              </div>
            </div>

            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Running analysis..." : "Analyze Scan"}
            </button>
          </form>

          <div className="list-panel scan-preview-panel">
            <h3>Scan preview</h3>
            {previewUrl ? (
              <img className="report-image" src={previewUrl} alt="Selected scan preview" />
            ) : (
              <div className="empty-panel">
                Choose an image to preview before submitting.
              </div>
            )}
          </div>
        </div>

        {result ? (
          <div className="scan-result-stack">
            <div className="panel-grid">
              <div className="panel">
                <h3>Prediction</h3>
                <strong>{result.prediction}</strong>
                <span>{Math.round(result.confidence * 100)}% model confidence</span>
              </div>
              <div className="panel">
                <h3>Risk level</h3>
                <strong>{result.risk_level}</strong>
                <span>{result.recommendation}</span>
              </div>
              <div className="panel">
                <h3>Report</h3>
                <strong>{new Date(result.timestamp).toLocaleDateString()}</strong>
                <Link className="text-link" to={`/scan/${result.id}`}>
                  View full report
                </Link>
              </div>
            </div>

            <div className="image-grid">
              <div className="list-panel">
                <h3>Stored original image</h3>
                <img className="report-image" src={result.image_url} alt="Stored original scan" />
              </div>
              <div className="list-panel">
                <h3>Grad-CAM heatmap</h3>
                <img className="report-image" src={result.heatmap_url} alt="Generated heatmap" />
              </div>
            </div>

            <div className="list-panel">
              <h3>Recommendation</h3>
              <div className="placeholder-row">
                <div>
                  <strong>{result.recommendation}</strong>
                  <div>{new Date(result.timestamp).toLocaleString()}</div>
                </div>
                <div className="row-actions">
                  <span className={`status-pill ${riskClass(result.risk_level)}`}>
                    {result.risk_level}
                  </span>
                  <span>{result.prediction}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

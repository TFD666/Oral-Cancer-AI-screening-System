import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { ArrowLeft, Camera, Upload } from "lucide-react";

export default function ScanUpload() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError("");
  }

  async function handleSubmit() {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiFetch("/predict", {
        method: "POST",
        body: formData,
      });

      // Navigate to scan detail with the new result
      navigate(`/scan/${result.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="app">
        <div className="result-header">
          <button className="back-btn" onClick={() => { setSubmitting(false); }}>
            <ArrowLeft size={18} />
          </button>
          <div className="result-header-text">
            <div className="result-header-title">Analyzing Scan</div>
          </div>
        </div>
        <div className="scan-analyzing">
          <div className="spinner" />
          <div className="scan-analyzing-text">Analyzing your scan...</div>
          <div className="scan-analyzing-sub">Our AI is examining the image. This usually takes about 30 seconds.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app page-enter">
      {/* Header */}
      <div className="result-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div className="result-header-text">
          <div className="result-header-title">New Scan</div>
          <div className="result-header-meta">Upload an oral image for AI analysis</div>
        </div>
      </div>

      <div className="scan-upload-page">
        {error && <div className="message error">{error}</div>}

        {/* Upload Zone */}
        {!previewUrl ? (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-zone-icon">📷</div>
            <div className="upload-zone-text">Tap to upload image</div>
            <div className="upload-zone-sub">JPG, JPEG, or PNG • Max 10MB</div>
          </div>
        ) : (
          <div>
            <img src={previewUrl} alt="Scan preview" className="scan-preview-img" />
            <button
              style={{
                marginTop: 8,
                padding: "8px 16px",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                width: "100%",
              }}
              onClick={() => {
                setFile(null);
                setPreviewUrl("");
              }}
            >
              Change Image
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Submit Button */}
        <button
          className="scan-submit-btn"
          onClick={handleSubmit}
          disabled={!file || submitting}
        >
          {submitting ? (
            <>Analyzing...</>
          ) : (
            <>
              <Camera size={18} />
              Analyze Scan
            </>
          )}
        </button>

        {/* Info */}
        <div style={{ marginTop: 20, padding: "16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 8 }}>📋 Tips for best results</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            • Ensure good lighting — natural light works best<br />
            • Focus on the area of concern<br />
            • Keep the camera steady and close-up<br />
            • Avoid blurry or dark images
          </div>
        </div>
      </div>

      <div className="spacer" />
    </div>
  );
}

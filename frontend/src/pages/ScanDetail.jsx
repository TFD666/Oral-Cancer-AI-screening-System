import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Download,
  Image as ImageIcon,
  Lightbulb,
  MapPin,
  MessageCircle,
  Share2,
  Shield,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

function riskHeadline(level) {
  if (level === "Low") return "No major concerns detected";
  if (level === "Medium") return "Some areas may need attention";
  return "Areas of concern detected";
}

function riskDescription(level, prediction) {
  if (prediction === "Non-Cancer" && level === "Low") {
    return "Our AI model did not identify major areas of concern. Continue routine monitoring and oral hygiene.";
  }

  if (level === "Low") {
    return "Our AI model found low-risk features in this scan. This is not a diagnosis.";
  }

  if (level === "Medium") {
    return "Our AI model found areas that may benefit from professional review. This is not a diagnosis.";
  }

  return "Our AI model has detected multiple areas that may need professional evaluation. This is not a diagnosis.";
}

function riskMeaning(level, prediction) {
  if (prediction === "Non-Cancer" && level === "Low") {
    return "No major concerning pattern was detected in this scan. Keep monitoring for changes and maintain regular oral hygiene.";
  }

  if (level === "Low") {
    return "The scan currently suggests a lower concern pattern, but changes should still be monitored over time.";
  }

  if (level === "Medium") {
    return "The scan shows patterns that may need attention. A dental review can help confirm what is happening.";
  }

  return "The AI has detected areas that show patterns associated with potential concern. Further evaluation by a specialist is strongly recommended.";
}

function formatDate(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function RiskIcon({ risk, size = 48 }) {
  if (risk === "Low") return <CheckCircle size={size} />;
  if (risk === "Medium") return <AlertTriangle size={size} />;
  return <Shield size={size} />;
}

const checklistByRisk = {
  Low: [
    "Continue regular oral hygiene",
    "Monitor any persistent symptoms",
    "Avoid tobacco and alcohol",
    "Repeat scans if symptoms change",
  ],
  Medium: [
    "Schedule a dental evaluation soon",
    "Do not ignore persistent symptoms",
    "Avoid tobacco and alcohol",
    "Follow up if the area changes",
  ],
  High: [
    "See a dentist / specialist promptly",
    "Do not ignore persistent symptoms",
    "Avoid tobacco and alcohol",
    "Follow up within days, not weeks",
  ],
};

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    let active = true;
    apiFetch(`/report/${id}`)
      .then((response) => active && setReport(response))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  const shareReport = () => {
    if (navigator.share) {
      navigator.share({ title: "Scan Result", url: window.location.href });
      return;
    }

    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="app result-dark-page result-loading-state">
        <div className="result-loader-card">
          <div className="spinner" />
          <p>Loading scan result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app result-dark-page result-error-state">
        <div className="result-error-card">
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button type="button" className="result-scan-again-btn" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const risk = report.risk_level || "Low";
  const rc = riskClass(risk);
  const confidence = report.model_confidence ?? report.confidence ?? 0.85;
  const confidencePercent = Math.round(confidence * 100);
  const prediction = report.prediction || "Non-Cancer";
  const checklist = checklistByRisk[risk] || checklistByRisk.Low;
  const scanId = report.id?.slice(0, 4) || "----";
  const predictionClass = prediction === "Cancer" ? "cancer" : "non-cancer";

  return (
    <div className={`app result-page result-dark-page ${rc} page-enter`}>
      <header className="result-premium-header">
        <button type="button" className="result-icon-button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>

        <div className="result-header-copy">
          <h1>Scan Result</h1>
          <p>
            Scan #{scanId}
            <span aria-hidden="true"> • </span>
            {formatDate(report.timestamp)}
            <span aria-hidden="true"> • </span>
            {formatTime(report.timestamp)}
          </p>
        </div>

        <button type="button" className="result-icon-button" onClick={() => window.print()} aria-label="Download report">
          <Download size={24} />
        </button>
      </header>

      <section className="result-hero-card card-enter stagger-1">
        <div className="result-hero-glow" />
        <div className="result-hero-icon">
          <RiskIcon risk={risk} size={54} />
        </div>

        <div className="result-risk-badge">{risk.toUpperCase()} RISK</div>
        <h2>{riskHeadline(risk)}</h2>
        <p className="result-hero-description">{riskDescription(risk, prediction)}</p>

        <div className="result-prediction-pill">
          <span>Prediction:</span>
          <strong className={predictionClass}>{prediction}</strong>
        </div>

        <div className="result-confidence-panel">
          <div className="result-confidence-main">
            <span className="result-confidence-icon">
              <ShieldCheck size={28} />
            </span>
            <span>Model Confidence:</span>
            <strong>{confidencePercent}%</strong>
          </div>
          <div className="result-confidence-explainer">
            This shows how confident the AI is in its assessment, not the probability of disease.
          </div>
        </div>
      </section>

      <section className="result-section card-enter stagger-2">
        <h3 className="result-section-title">Analysis Overview</h3>
        <div className="result-analysis-grid">
          <button
            type="button"
            className="result-image-card"
            onClick={() => report.image_url && setActiveImage({ src: report.image_url, label: "Original Image" })}
          >
            {report.image_url ? (
              <img src={report.image_url} alt="Original oral scan" />
            ) : (
              <div className="result-image-placeholder">No image available</div>
            )}
            <span className="result-image-label">Original Image</span>
            <span className="result-zoom-button">
              <ZoomIn size={18} />
            </span>
          </button>

          <button
            type="button"
            className="result-image-card"
            onClick={() => report.heatmap_url && setActiveImage({ src: report.heatmap_url, label: "AI Heatmap" })}
          >
            {report.heatmap_url ? (
              <img src={report.heatmap_url} alt="AI heatmap showing highlighted areas" />
            ) : (
              <div className="result-image-placeholder">No heatmap available</div>
            )}
            <span className="result-image-label">AI Heatmap <em>(Areas of concern)</em></span>
            <span className="result-zoom-button">
              <ZoomIn size={18} />
            </span>
          </button>
        </div>
      </section>

      <section className="result-info-grid card-enter stagger-3">
        <article className="result-info-card">
          <div className="result-info-title">
            <Lightbulb size={30} />
            <h3>What this means</h3>
          </div>
          <p>{report.recommendation || riskMeaning(risk, prediction)}</p>
        </article>

        <article className="result-info-card">
          <div className="result-info-title">
            <ClipboardCheck size={30} />
            <h3>What to do next</h3>
          </div>
          <div className="result-next-list">
            {checklist.map((item) => (
              <div className="result-next-item" key={item}>
                <CheckCircle size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="result-action-grid card-enter stagger-4">
        <button type="button" className="result-action-card ask-ai" onClick={() => navigate(`/care?scan_id=${report.id}`)}>
          <span className="result-action-icon">
            <MessageCircle size={28} />
          </span>
          <span className="result-action-copy">
            <strong>Ask AI About This</strong>
            <small>Get personalized guidance about your result</small>
          </span>
          <span className="result-action-arrow">
            <ChevronRight size={22} />
          </span>
        </button>

        <button
          type="button"
          className="result-action-card clinic"
          onClick={() => window.open("https://www.google.com/maps/search/dental+clinic+near+me", "_blank")}
        >
          <span className="result-action-icon">
            <MapPin size={28} />
          </span>
          <span className="result-action-copy">
            <strong>Find Nearby Clinic</strong>
            <small>Locate dental professionals near you</small>
          </span>
          <span className="result-action-arrow">
            <ChevronRight size={22} />
          </span>
        </button>

        <button type="button" className="result-action-card download" onClick={() => window.print()}>
          <span className="result-action-icon">
            <Download size={28} />
          </span>
          <span className="result-action-copy">
            <strong>Download Report</strong>
            <small>Save as PDF for your records</small>
          </span>
          <span className="result-action-arrow">
            <ChevronRight size={22} />
          </span>
        </button>
      </section>

      <section className="result-premium-disclaimer card-enter stagger-5">
        <AlertTriangle size={32} />
        <p>
          This is an AI-powered screening tool for informational purposes only. It is not a medical diagnosis.
          Always consult a qualified healthcare professional for medical advice.
        </p>
      </section>

      <div className="result-bottom-bar result-floating-actions">
        <button type="button" className="result-share-btn" onClick={shareReport}>
          <Share2 size={22} />
          Share
        </button>
        <button type="button" className="result-scan-again-btn" onClick={() => navigate("/scan")}>
          <Camera size={24} />
          Scan Again
        </button>
      </div>

      {activeImage && (
        <div className="image-modal-backdrop result-image-modal-backdrop" onClick={() => setActiveImage(null)}>
          <div className="image-modal result-image-modal" onClick={(event) => event.stopPropagation()}>
            <div className="image-modal-header">
              <div className="image-modal-title">
                <ImageIcon size={18} />
                {activeImage.label}
              </div>
              <button type="button" className="result-icon-button small" onClick={() => setActiveImage(null)} aria-label="Close image preview">
                <X size={18} />
              </button>
            </div>
            <img src={activeImage.src} alt={activeImage.label} className="image-modal-content" />
          </div>
        </div>
      )}
    </div>
  );
}

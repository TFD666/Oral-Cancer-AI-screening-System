import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  Download,
  Share2,
  Camera,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
  Image as ImageIcon,
} from "lucide-react";

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

function riskHeadline(level) {
  if (level === "Low") return "Areas reviewed with low concern";
  if (level === "Medium") return "Areas that may need attention";
  return "Areas of concern detected";
}

function riskMeaning(level, prediction) {
  if (prediction === "Non-Cancer" && level === "Low") {
    return "No major concerns detected on this screening.";
  }
  if (level === "Low") return "This scan shows only low-risk features at the moment.";
  if (level === "Medium") return "This scan shows areas that may need attention.";
  return "This scan shows areas that may need attention.";
}

function riskFollowup(level) {
  if (level === "Low") {
    return "This is not a diagnosis, but regular monitoring is still recommended.";
  }
  if (level === "Medium") {
    return "This is NOT a diagnosis, but further evaluation is recommended.";
  }
  return "This is NOT a diagnosis, but further evaluation is recommended.";
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

function ShieldIcon({ risk }) {
  if (risk === "Low") return <CheckCircle size={28} color="#52C9A0" />;
  if (risk === "Medium") return <AlertTriangle size={28} color="#EFA027" />;
  return <Shield size={28} color="#E24B4A" />;
}

const checklistByRisk = {
  Low: [
    "Continue your regular oral hygiene routine",
    "Monitor the area for changes or irritation",
    "Reduce tobacco and alcohol exposure if relevant",
    "Repeat a scan if symptoms appear or worsen",
  ],
  Medium: [
    "Schedule a dental evaluation soon",
    "Do not ignore persistent symptoms",
    "Avoid irritants such as tobacco or alcohol",
    "Follow up soon if the area changes",
  ],
  High: [
    "See a specialist promptly",
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
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);

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

  const clipPath = useMemo(
    () => ({ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }),
    [comparePosition],
  );

  if (loading) {
    return (
      <div className="app">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "var(--text-muted)" }}>Loading scan result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" style={{ padding: 20 }}>
        <div className="message error">{error}</div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const risk = report.risk_level || "Low";
  const rc = riskClass(risk);
  const confidence = report.model_confidence ?? report.confidence ?? 0.85;
  const prediction = report.prediction || "Non-Cancer";
  const checklist = checklistByRisk[risk] || checklistByRisk.Low;

  return (
    <div className="app result-page page-enter">
      <div className="result-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div className="result-header-text">
          <div className="result-header-title">Scan Result</div>
          <div className="result-header-meta">
            Scan #{report.id?.slice(0, 6)} · {formatDate(report.timestamp)} · {formatTime(report.timestamp)}
          </div>
        </div>
      </div>

      <div className={`result-card ${rc} card-enter stagger-1`}>
        <div className={`result-shield ${rc}`}>
          <ShieldIcon risk={risk} />
        </div>
        <div className={`result-badge ${rc}`}>{risk.toUpperCase()} RISK</div>
        <div className="result-headline">{riskHeadline(risk)}</div>
        <div className="result-desc result-desc-structured">
          <span>{riskMeaning(risk, prediction)}</span>
          <span>{riskFollowup(risk)}</span>
        </div>
        <div className="result-prediction-line">Prediction: {prediction}</div>
        <div className="confidence-stack">
          <div className="confidence-row">
            <CheckCircle size={14} color="var(--green)" />
            <span>Model Confidence: {Math.round(confidence * 100)}%</span>
          </div>
          <div className="confidence-subtext">
            This reflects how certain the AI is in its assessment, not the probability of disease.
          </div>
        </div>
      </div>

      <div className="analysis-section card-enter stagger-2">
        <div className="analysis-section-header">
          <div className="analysis-section-title">Analysis Overview</div>
          {report.image_url && report.heatmap_url && (
            <button className="analysis-toggle" onClick={() => setCompareMode((prev) => !prev)}>
              {compareMode ? "Split View" : "Compare"}
            </button>
          )}
        </div>

        {compareMode && report.image_url && report.heatmap_url ? (
          <div className="compare-view">
            <div className="compare-stage" onClick={() => setActiveImage({ src: report.heatmap_url, label: "AI Heatmap" })}>
              <img src={report.image_url} alt="Original oral scan" />
              <img src={report.heatmap_url} alt="AI heatmap overlay" style={clipPath} className="compare-overlay" />
              <div className="compare-divider" style={{ left: `${comparePosition}%` }} />
              <div className="compare-label left">Original Image</div>
              <div className="compare-label right">AI Heatmap</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={comparePosition}
              onChange={(event) => setComparePosition(Number(event.target.value))}
              className="compare-slider"
            />
          </div>
        ) : (
          <div className="analysis-grid">
            <button className="analysis-frame analysis-button-frame" onClick={() => report.image_url && setActiveImage({ src: report.image_url, label: "Original Image" })}>
              {report.image_url ? (
                <img src={report.image_url} alt="Original oral scan" />
              ) : (
                <div className="analysis-placeholder">No image</div>
              )}
              <div className="analysis-frame-label">Original Image</div>
            </button>
            <button className="analysis-frame analysis-button-frame" onClick={() => report.heatmap_url && setActiveImage({ src: report.heatmap_url, label: "AI Heatmap" })}>
              {report.heatmap_url ? (
                <img src={report.heatmap_url} alt="AI heatmap" className="result-heatmap-image" />
              ) : (
                <div className="analysis-placeholder">No heatmap</div>
              )}
              <div className="analysis-frame-label">AI Heatmap (Highlighted areas of concern)</div>
            </button>
          </div>
        )}
      </div>

      <div className="explain-grid card-enter stagger-3">
        <div className="explain-card">
          <div className="explain-card-title">What this means</div>
          <div className="explain-card-text">
            {report.recommendation || riskMeaning(risk, prediction)}
          </div>
        </div>
        <div className="explain-card">
          <div className="explain-card-title">What to do next</div>
          {checklist.map((item, index) => (
            <div className="checklist-item" key={item}>
              <span className={`result-priority-dot ${index === 0 ? "high" : "normal"}`} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="action-cards card-enter stagger-4">
        <div className="action-card action-card-primary" onClick={() => navigate(`/care?scan_id=${report.id}`)}>
          <div className="action-card-icon" style={{ background: "var(--green-bg)" }}>
            <MessageCircle size={20} color="var(--green)" />
          </div>
          <div className="action-card-text">
            <div className="action-card-title">Ask AI About This</div>
            <div className="action-card-sub">Get personalized guidance about your result</div>
          </div>
        </div>

        <div className="action-card" onClick={() => window.open("https://www.google.com/maps/search/dental+clinic+near+me", "_blank")}>
          <div className="action-card-icon" style={{ background: "var(--blue-bg)" }}>
            <MapPin size={20} color="var(--blue)" />
          </div>
          <div className="action-card-text">
            <div className="action-card-title">Find Nearby Clinic</div>
            <div className="action-card-sub">Locate dental professionals near you</div>
          </div>
        </div>

        <div className="action-card" onClick={() => window.print()}>
          <div className="action-card-icon" style={{ background: "#F3E8FF" }}>
            <Download size={20} color="#7C3AED" />
          </div>
          <div className="action-card-text">
            <div className="action-card-title">Download Report</div>
            <div className="action-card-sub">Save as PDF for your records</div>
          </div>
        </div>
      </div>

      <div className="disclaimer result-disclaimer card-enter stagger-5">
        <Info size={14} />
        <span>
          This AI screening result is informational only. It does not replace a clinical diagnosis from a qualified professional.
        </span>
      </div>

      <div className="result-bottom-bar">
        <button
          className="btn-outline"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: "Scan Result", url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }
          }}
        >
          <Share2 size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Share
        </button>
        <button className="btn-primary result-primary-bar" onClick={() => navigate("/scan")}>
          <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Scan Again
        </button>
      </div>

      {activeImage && (
        <div className="image-modal-backdrop" onClick={() => setActiveImage(null)}>
          <div className="image-modal" onClick={(event) => event.stopPropagation()}>
            <div className="image-modal-header">
              <div className="image-modal-title">
                <ImageIcon size={16} />
                {activeImage.label}
              </div>
              <button className="back-btn" onClick={() => setActiveImage(null)}>
                <X size={16} />
              </button>
            </div>
            <img src={activeImage.src} alt={activeImage.label} className="image-modal-content" />
          </div>
        </div>
      )}
    </div>
  );
}

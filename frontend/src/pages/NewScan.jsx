import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Crosshair,
  EyeOff,
  FileImage,
  ImagePlus,
  Lightbulb,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

const captureTips = [
  { label: "Clear lighting", icon: Lightbulb },
  { label: "Focus on area of concern", icon: Crosshair },
  { label: "Steady & close-up", icon: Camera },
  { label: "Avoid blurry or dark images", icon: EyeOff },
];

const nextSteps = [
  { title: "Risk Assessment", icon: ShieldCheck },
  { title: "Issue Detection", icon: Search },
  { title: "Health Insights", icon: Activity },
  { title: "Personalized Recommendations", icon: Sparkles },
];

const bestResultTips = [
  "Ensure good lighting - natural light works best",
  "Focus on the area of concern",
  "Keep the camera steady and close-up",
  "Avoid blurry or dark images",
  "Clean your mouth gently before capturing",
];

function riskClass(riskLevel) {
  if (riskLevel === "High") return "status-high";
  if (riskLevel === "Medium") return "status-medium";
  return "status-low";
}

function validateScanFile(nextFile) {
  if (!nextFile) return "";

  const extension = nextFile.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return "Invalid file type. Only JPG, JPEG, and PNG images are supported.";
  }

  if (nextFile.size > MAX_FILE_SIZE) {
    return "Image is too large. Please choose a file under 10 MB.";
  }

  return "";
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function NewScan() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
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

  function chooseFile(nextFile) {
    const validationError = validateScanFile(nextFile);
    setError(validationError);
    setSuccess("");
    setResult(null);

    if (validationError) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(nextFile);
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    chooseFile(nextFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    chooseFile(nextFile);
  }

  function clearFile(event) {
    event.stopPropagation();
    setFile(null);
    setPreviewUrl("");
    setError("");
    setSuccess("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
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

      const validationError = validateScanFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      const formData = new FormData();
      formData.append("file", file);

      const prediction = await apiFetch("/predict", {
        method: "POST",
        body: formData,
      });

      setResult(prediction);
      setSuccess("Scan analyzed successfully.");
      navigate(`/scan/${prediction.id}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app scan-dark-page page-enter">
      <div className="scan-shell">
        <header className="scan-premium-header">
          <button
            className="scan-back-button"
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={28} strokeWidth={2.6} />
          </button>
          <div>
            <h1>New Scan</h1>
            <p>Upload an oral image for AI analysis</p>
          </div>
        </header>

        {error ? <div className="scan-message scan-message-error">{error}</div> : null}
        {success ? <div className="scan-message scan-message-success">{success}</div> : null}

        <form className="scan-premium-form" onSubmit={handleSubmit}>
          <section
            className={`scan-upload-premium ${dragActive ? "is-dragging" : ""} ${
              previewUrl ? "has-preview" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFileChange}
              className="scan-hidden-input"
              aria-label="Upload oral scan image"
            />

            <div className="scan-upload-glow" aria-hidden="true" />

            {previewUrl ? (
              <div className="scan-preview-state">
                <div className="scan-preview-frame">
                  <img src={previewUrl} alt="Selected oral scan preview" />
                </div>
                <div className="scan-file-meta">
                  <span className="scan-file-icon">
                    <FileImage size={20} />
                  </span>
                  <div>
                    <strong>{file?.name}</strong>
                    <span>{file ? formatFileSize(file.size) : ""}</span>
                  </div>
                  <button type="button" onClick={clearFile} aria-label="Remove selected image">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="scan-empty-upload">
                <div className="scan-camera-orb">
                  <span className="scan-sparkle sparkle-one" aria-hidden="true" />
                  <span className="scan-sparkle sparkle-two" aria-hidden="true" />
                  <span className="scan-sparkle sparkle-three" aria-hidden="true" />
                  <Camera size={58} strokeWidth={2.2} />
                  <span className="scan-plus-badge">
                    <ImagePlus size={18} />
                  </span>
                </div>
                <h2>Tap to upload image</h2>
                <p>JPG, JPEG, PNG <span aria-hidden="true">•</span> Max 10MB</p>
              </div>
            )}

            <div className="scan-capture-grid">
              {captureTips.map(({ label, icon: Icon }) => (
                <div className="scan-capture-card" key={label}>
                  <Icon size={31} strokeWidth={2.1} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <button className="scan-analyze-premium" type="submit" disabled={submitting || !file}>
            {submitting ? (
              <>
                <Loader2 className="scan-button-spinner" size={26} />
                <span>Analyzing with AI...</span>
              </>
            ) : (
              <>
                <Camera size={27} strokeWidth={2.3} />
                <span>Analyze Scan</span>
              </>
            )}
          </button>
        </form>

        <section className="scan-info-card scan-next-card">
          <div className="scan-info-icon">
            <ShieldCheck size={40} strokeWidth={2.1} />
          </div>
          <div className="scan-info-content">
            <h2>What happens next?</h2>
            <p>Our AI will analyze your image and provide:</p>
            <div className="scan-next-grid">
              {nextSteps.map(({ title, icon: Icon }) => (
                <div className="scan-next-item" key={title}>
                  <Icon size={28} strokeWidth={2.1} />
                  <span>{title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="scan-info-card scan-tips-card-premium">
          <div className="scan-tips-copy">
            <h2>
              <BookOpen size={26} />
              Tips for best results
            </h2>
            <ul>
              {bestResultTips.map((tip) => (
                <li key={tip}>
                  <CheckCircle2 size={21} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="scan-tooth-art" aria-hidden="true">
            <div className="scan-tooth-orbit" />
            <div className="scan-tooth-shape" />
            <span className="scan-tooth-spark scan-tooth-spark-a" />
            <span className="scan-tooth-spark scan-tooth-spark-b" />
          </div>
        </section>

        {result ? (
          <section className="scan-inline-result">
            <div className="scan-inline-head">
              <div>
                <span className={`status-pill ${riskClass(result.risk_level)}`}>
                  {result.risk_level} Risk
                </span>
                <h2>{result.prediction}</h2>
                <p>{result.recommendation}</p>
              </div>
              <strong>{Math.round(result.confidence * 100)}%</strong>
            </div>
            <div className="scan-inline-images">
              <img src={result.image_url} alt="Stored original scan" />
              <img src={result.heatmap_url} alt="Generated heatmap" />
            </div>
            <Link className="scan-inline-link" to={`/scan/${result.id}`}>
              View Full Report
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}

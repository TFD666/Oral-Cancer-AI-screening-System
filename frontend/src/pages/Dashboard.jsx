import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Eye, Camera, ClipboardList, Sparkles, ShieldCheck } from "lucide-react";

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

function riskLabel(score) {
  if (score < 0.33) return "LOW RISK";
  if (score < 0.66) return "MEDIUM RISK";
  return "HIGH RISK";
}

function riskLevelFromScore(score) {
  if (score < 0.33) return "Low";
  if (score < 0.66) return "Medium";
  return "High";
}

function riskHint(score) {
  if (score < 0.33) return "No major concerns detected. Continue monitoring.";
  if (score < 0.66) return "Some areas may need attention. Monitor changes closely.";
  return "You should consult a specialist soon.";
}

function riskSummary(score) {
  if (score < 0.33) return "No major concerns detected";
  if (score < 0.66) return "Areas may need attention";
  return "Areas of concern detected";
}

function riskColor(score) {
  if (score < 0.33) return "#52C9A0";
  if (score < 0.66) return "#EFA027";
  return "#E24B4A";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function tooltipText(scan) {
  return `Scan #${scan.id?.slice(0, 6) ?? "----"} - ${scan.risk_level ?? "Low"} Risk`;
}

function HealthWave({ scans, navigate }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activeIdx, setActiveIdx] = useState(scans.length - 1);
  const containerRef = useRef(null);

  if (!scans?.length) return null;

  const ordered = [...scans].reverse();
  const width = 350;
  const height = 188;
  const padX = 26;
  const padTop = 24;
  const padBottom = 34;
  const count = ordered.length;

  const xs = count === 1
    ? [width / 2]
    : Array.from({ length: count }, (_, index) => padX + (index / (count - 1)) * (width - padX * 2));

  const ys = ordered.map((scan) => {
    const riskVal = Math.max(0, Math.min(1, scan.risk_score ?? 0));
    return padTop + (1 - riskVal) * (height - padTop - padBottom);
  });

  let lineD = `M ${xs[0]} ${ys[0]}`;
  for (let index = 0; index < count - 1; index += 1) {
    const cpx = (xs[index] + xs[index + 1]) / 2;
    lineD += ` C ${cpx} ${ys[index]}, ${cpx} ${ys[index + 1]}, ${xs[index + 1]} ${ys[index + 1]}`;
  }
  const fillD = `${lineD} L ${xs[count - 1]} ${height} L ${xs[0]} ${height} Z`;

  const latestRisk = ordered[count - 1]?.risk_score ?? 0.15;
  const activeIndex = hoveredIdx ?? activeIdx;
  const activeScan = ordered[activeIndex];
  const activeX = xs[activeIndex];
  const activeY = ys[activeIndex];

  return (
    <div className="wave-container dashboard-wave" ref={containerRef}>
      <div className="wave-axis-labels">
        <span>Older</span>
        <span>Recent</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="wave-svg">
        <defs>
          <linearGradient id="waveGradDashboard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={riskColor(latestRisk)} stopOpacity="0.34" />
            <stop offset="100%" stopColor={riskColor(latestRisk)} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={height - 18}
          x2={width - padX}
          y2={height - 18}
          stroke="rgba(17,24,39,0.08)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        <path d={fillD} fill="url(#waveGradDashboard)" className="wave-fill-path" />
        <path
          d={lineD}
          fill="none"
          stroke={riskColor(latestRisk)}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="wave-line-path"
        />

        {xs.map((x, index) => {
          const scan = ordered[index];
          const color = riskColor(scan.risk_score ?? 0.15);
          const isActive = activeIndex === index;
          return (
            <g key={scan.id ?? index}>
              {isActive && (
                <circle
                  cx={x}
                  cy={ys[index]}
                  r="12"
                  fill={color}
                  opacity="0.12"
                  className="wave-active-halo"
                />
              )}
              <circle
                cx={x}
                cy={ys[index]}
                r={isActive ? 6.5 : 5}
                fill={color}
                stroke="white"
                strokeWidth="2.5"
                className="wave-dot"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(index)}
                onBlur={() => setHoveredIdx(null)}
                onClick={() => navigate(`/scan/${scan.id}`)}
              >
                <title>{tooltipText(scan)}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      {activeScan && (
        <div
          className="wave-tooltip visible dashboard-wave-tooltip"
          style={{
            left: `${Math.max(10, Math.min(74, (activeX / width) * 100))}%`,
            top: `${Math.max(4, ((activeY - 56) / height) * 100)}%`,
          }}
        >
          <div className="wave-tooltip-date">{tooltipText(activeScan)}</div>
          <div className="wave-tooltip-risk" style={{ color: riskColor(activeScan.risk_score ?? 0.15) }}>
            {formatShortDate(activeScan.timestamp)} · {formatTime(activeScan.timestamp)}
          </div>
          <div className="wave-tooltip-conf">
            {Math.round((activeScan.confidence ?? 0.85) * 100)}% model confidence
          </div>
          <div className="wave-tooltip-arrow" />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="app">
      <div className="page-header">
        <div className="skeleton" style={{ width: 120, height: 16 }} />
        <div className="skeleton" style={{ width: 38, height: 38, borderRadius: "50%" }} />
      </div>
      <div style={{ padding: "0 20px" }}>
        <div className="skeleton skeleton-line" style={{ margin: "8px 0" }} />
        <div className="skeleton skeleton-line short" style={{ margin: "4px 0 16px" }} />
      </div>
      <div className="skeleton skeleton-wave" />
      <div className="skeleton skeleton-card" />
      <div style={{ padding: "0 20px", display: "flex", gap: 12 }}>
        <div className="skeleton" style={{ flex: 1, height: 116, borderRadius: 18 }} />
        <div className="skeleton" style={{ flex: 1, height: 116, borderRadius: 18 }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    apiFetch("/dashboard")
      .then((response) => active && setData(response))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="app page-enter" style={{ padding: 20 }}>
        <div className="message error">{error}</div>
      </div>
    );
  }

  const {
    user,
    latest_scan: latestScan,
    recent_scans: recentScans = [],
    total_scan_count: totalScanCount,
    days_since_last_scan: daysSinceLastScan,
    tip_of_the_day: tipOfTheDay,
  } = data;

  const latestRisk = latestScan ? (
    latestScan.risk_level === "Low" ? 0.15
      : latestScan.risk_level === "Medium" ? 0.5
        : 0.85
  ) : 0;

  const lastScanFilter = latestScan?.risk_level ? `${latestScan.risk_level} Risk` : "All Scans";
  const showEmpty = !latestScan;

  return (
    <div className="app page-enter">
      <div className="page-header">
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--green)" }}>OralAI Health</div>
        </div>
        <button className="header-avatar" onClick={() => navigate("/profile")}>
          {user.initials}
        </button>
      </div>

      <div className="greeting">
        <div className="greeting-sub">{getGreeting()}</div>
        <div className="greeting-main">{user.name} 👋</div>
      </div>

      {!showEmpty && (
        <button
          className="wave-card dashboard-status-card card-enter stagger-1"
          onClick={() => navigate(`/history?filter=${encodeURIComponent(lastScanFilter)}`)}
        >
          <div className="dashboard-status-copy">
            <div>
              <div className="dashboard-section-label">Your Current Status</div>
              <div className={`dashboard-risk-display ${riskClass(latestScan?.risk_level)}`}>
                {riskLabel(latestRisk)}
              </div>
              <div className="dashboard-support-text">Based on your most recent scan</div>
            </div>
            <div className={`risk-pill ${riskClass(latestScan?.risk_level)}`}>
              <span className={`risk-dot ${riskClass(latestScan?.risk_level)}`} />
              {latestScan?.risk_level} Risk
            </div>
          </div>

          <HealthWave scans={recentScans} navigate={navigate} />

          <div className="dashboard-status-footer">
            <div className="status-desc">{riskHint(latestRisk)}</div>
            <div className="dashboard-timeline-hint">Each dot represents a scan</div>
          </div>
        </button>
      )}

      {!showEmpty && (
        <button
          className="last-scan-card dashboard-last-scan card-enter stagger-2"
          onClick={() => navigate(`/scan/${latestScan.id}`)}
        >
          <div
            className="scan-card-stripe"
            style={{
              background: `linear-gradient(90deg, ${riskColor(latestRisk)}, rgba(59,168,245,0.92))`,
            }}
          />
          <div className="scan-card-body">
            <div className="dashboard-last-scan-header">
              <div>
                <div className="scan-card-title">Last Scan</div>
                <div className="scan-card-date">
                  {formatDate(latestScan.timestamp)} · {formatTime(latestScan.timestamp)}
                </div>
              </div>
              <span className={`risk-pill ${riskClass(latestScan.risk_level)}`}>
                {latestScan.risk_level}
              </span>
            </div>

            <div className="dashboard-last-scan-summary">{riskSummary(latestRisk)}</div>
            <div className="dashboard-last-scan-note">
              Model Confidence: {Math.round((latestScan.confidence ?? 0.85) * 100)}%
            </div>
            <div className="rec-text">
              {latestScan.recommendation || riskHint(latestRisk)}
            </div>

            <div className="view-report-btn dashboard-inline-cta">
              <Eye size={16} />
              View Full Report
            </div>
          </div>
        </button>
      )}

      <div className="scan-btn-wrap card-enter stagger-3">
        <button className="scan-btn dashboard-primary-scan" onClick={() => navigate("/scan")}>
          <div className="scan-btn-icon">
            <div className="pulse-ring" />
            <Camera size={22} color="white" />
          </div>
          <div>
            <div className="scan-btn-label">Start Scan</div>
            <div className="scan-btn-sub">Quick 30-second check</div>
          </div>
        </button>
      </div>

      <div className="dashboard-section-head card-enter stagger-4">
        <span>Quick Actions</span>
      </div>

      <div className="bottom-cards card-enter stagger-4">
        <button className="mini-card dashboard-action-card" onClick={() => navigate("/scan")}>
          <div className="mini-card-icon" style={{ background: "#EAF3DE" }}>
            <ShieldCheck size={16} color="#3B6D11" />
          </div>
          <div className="mini-card-title">Daily Check</div>
          <div className="mini-card-sub">Quick 10-second health check</div>
          <div className="btn-mini">Start</div>
        </button>

        <button
          className="mini-card dashboard-action-card"
          style={{ background: "linear-gradient(135deg, #F0F5FF, #E8F0FF)", borderColor: "rgba(56,107,229,0.1)" }}
          onClick={() => navigate("/history")}
        >
          <div className="mini-card-icon" style={{ background: "rgba(56,107,229,0.12)" }}>
            <ClipboardList size={16} color="#386BE5" />
          </div>
          <div className="mini-card-title" style={{ color: "#1B3A8C" }}>History</div>
          <div className="mini-card-sub" style={{ color: "#5070C0" }}>View your past scans</div>
          <div className="btn-mini" style={{ color: "#1B3A8C", background: "rgba(56,107,229,0.12)" }}>Open</div>
        </button>
      </div>

      {daysSinceLastScan !== null && daysSinceLastScan >= 3 && (
        <div className="reminder-card card-enter stagger-5">
          <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>⏰</div>
          <div>
            <div className="reminder-title">Time to check in</div>
            <div className="reminder-sub">
              You have not scanned in {daysSinceLastScan} days. Regular checks make changes easier to catch early.
            </div>
            <button className="btn-amber" onClick={() => navigate("/scan")}>Do Quick Check</button>
          </div>
        </div>
      )}

      <div className="tip-card dashboard-tip-card card-enter stagger-5">
        <div className="tip-icon-wrap">
          <Sparkles size={18} color="#EFA027" />
        </div>
        <div>
          <div className="tip-label">Tip of the Day</div>
          <p className="tip-text">{tipOfTheDay}</p>
        </div>
      </div>

      {showEmpty && (
        <div className="card-enter" style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🦷</div>
          <h3>Welcome to OralAI</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 20, fontSize: "0.88rem" }}>
            Start your first scan to get a clear baseline for your oral health.
          </p>
          <button className="scan-btn" onClick={() => navigate("/scan")} style={{ display: "inline-flex" }}>
            <Camera size={20} color="white" />
            <span style={{ fontWeight: 700 }}>Take Your First Scan</span>
          </button>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}

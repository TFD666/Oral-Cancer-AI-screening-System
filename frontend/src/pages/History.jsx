import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Filter,
  Lightbulb,
  MessageCircle,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";

const FILTERS = ["All Scans", "High Risk", "Medium Risk", "Low Risk"];

const RISK_META = {
  High: {
    className: "high",
    color: "#ef4444",
    label: "High Risk",
    summary: "Areas of concern detected",
    Icon: AlertTriangle,
  },
  Medium: {
    className: "medium",
    color: "#f97316",
    label: "Medium Risk",
    summary: "Some areas need attention",
    Icon: CircleAlert,
  },
  Low: {
    className: "low",
    color: "#14e292",
    label: "Low Risk",
    summary: "No major concerns detected",
    Icon: ShieldCheck,
  },
};

function riskClass(level) {
  return RISK_META[level]?.className || "low";
}

function riskScore(level) {
  if (level === "High") return 3;
  if (level === "Medium") return 2;
  return 1;
}

function riskMeta(level) {
  return RISK_META[level] || RISK_META.Low;
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function confidencePercent(scan) {
  const value = scan?.model_confidence ?? scan?.confidence ?? 0;
  if (value > 1) return Math.round(value);
  return Math.round(value * 100);
}

function average(items) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + riskScore(item.risk_level), 0) / items.length;
}

function deriveTrend(scans, backendTrend) {
  if (backendTrend?.trend) return backendTrend.trend;
  if (scans.length < 2) return "Stable";

  const chronological = [...scans].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const split = Math.max(1, Math.floor(chronological.length / 2));
  const older = chronological.slice(0, split);
  const recent = chronological.slice(split);
  const delta = average(recent) - average(older);

  if (delta > 0.25) return "Declining";
  if (delta < -0.25) return "Improving";
  return "Stable";
}

function getTrendContent(trendName, backendDescription) {
  if (trendName === "Declining") {
    return {
      className: "declining",
      label: "Declining",
      title: "Your Health Trend",
      insight: backendDescription || "Recent scans show increased risk levels. Consider a dental consultation.",
      recommendation: "Book a professional review soon and continue regular follow-up scans.",
      Icon: TrendingDown,
    };
  }

  if (trendName === "Improving") {
    return {
      className: "improving",
      label: "Improving",
      title: "Your Health Trend",
      insight: backendDescription || "Risk levels are decreasing across recent scans.",
      recommendation: "Keep the same care routine and continue monitoring regularly.",
      Icon: TrendingUp,
    };
  }

  return {
    className: "stable",
    label: "Stable",
    title: "Your Health Trend",
    insight: backendDescription || "Your oral health appears stable across recent scans.",
    recommendation: "Maintain routine oral hygiene and repeat checks consistently.",
    Icon: Minus,
  };
}

function buildTrendPoints(scans) {
  const source = [...scans]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-6);

  if (source.length === 0) {
    return [{ x: 24, y: 76, risk: "Low" }, { x: 256, y: 76, risk: "Low" }];
  }

  if (source.length === 1) {
    const risk = source[0].risk_level || "Low";
    const y = risk === "High" ? 28 : risk === "Medium" ? 52 : 76;
    return [{ x: 24, y, risk }, { x: 256, y, risk }];
  }

  const width = 280;
  return source.map((scan, index) => {
    const risk = scan.risk_level || "Low";
    return {
      x: 16 + (index * (width - 32)) / (source.length - 1),
      y: risk === "High" ? 28 : risk === "Medium" ? 52 : 76,
      risk,
    };
  });
}

function curvePath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const point = points[i];
    const midX = previous.x + (point.x - previous.x) / 2;
    d += ` C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }
  return d;
}

function areaPath(points) {
  const base = curvePath(points);
  if (!base) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${base} L ${last.x} 96 L ${first.x} 96 Z`;
}

function TrendGraph({ scans }) {
  const points = buildTrendPoints(scans);
  const line = curvePath(points);
  const area = areaPath(points);

  return (
    <div className="history-trend-graph">
      <svg viewBox="0 0 280 112" aria-hidden="true">
        <defs>
          <linearGradient id="historyLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#14e292" />
          </linearGradient>
          <linearGradient id="historyAreaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(239,68,68,0.24)" />
            <stop offset="50%" stopColor="rgba(249,115,22,0.16)" />
            <stop offset="100%" stopColor="rgba(20,226,146,0.22)" />
          </linearGradient>
          <filter id="historyTrendGlow" x="-30%" y="-50%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path className="history-trend-area" d={area} fill="url(#historyAreaGradient)" />
        <path className="history-trend-line" d={line} fill="none" stroke="url(#historyLineGradient)" strokeWidth="4" strokeLinecap="round" filter="url(#historyTrendGlow)" />
        {points.map((point, index) => (
          <g key={`${point.x}-${index}`} className={index === points.length - 1 ? "history-latest-node" : ""}>
            <circle cx={point.x} cy={point.y} r="9" fill={riskMeta(point.risk).color} opacity="0.22" />
            <circle cx={point.x} cy={point.y} r="5.8" fill={riskMeta(point.risk).color} stroke="#eaf6ff" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <div className="history-trend-axis">
        <span>Older</span>
        <i />
        <span>Recent</span>
      </div>
    </div>
  );
}

export default function History() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Scans");
  const [sortNewest, setSortNewest] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const filterRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initialFilter = searchParams.get("filter");
    if (initialFilter && FILTERS.includes(initialFilter)) {
      setActiveFilter(initialFilter);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    apiFetch("/history")
      .then((response) => active && setData(response))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const scans = data?.scans ?? [];
  const trend = data?.trend ?? {};
  const trendName = deriveTrend(scans, trend);
  const trendContent = getTrendContent(trendName, trend.description);

  const counts = useMemo(() => ({
    "All Scans": scans.length,
    "Low Risk": scans.filter((scan) => scan.risk_level === "Low").length,
    "Medium Risk": scans.filter((scan) => scan.risk_level === "Medium").length,
    "High Risk": scans.filter((scan) => scan.risk_level === "High").length,
  }), [scans]);

  const sortedScans = useMemo(() => {
    let filtered = scans;
    if (activeFilter === "Low Risk") filtered = scans.filter((scan) => scan.risk_level === "Low");
    else if (activeFilter === "Medium Risk") filtered = scans.filter((scan) => scan.risk_level === "Medium");
    else if (activeFilter === "High Risk") filtered = scans.filter((scan) => scan.risk_level === "High");

    return [...filtered].sort((a, b) => {
      const diff = new Date(b.timestamp) - new Date(a.timestamp);
      return sortNewest ? diff : -diff;
    });
  }, [activeFilter, scans, sortNewest]);

  const lastThree = [...scans]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="app history-dark-page">
        <div className="history-shell">
          <div className="skeleton" style={{ width: 140, height: 34, borderRadius: 14 }} />
          <div className="skeleton" style={{ width: "100%", height: 310, borderRadius: 28, marginTop: 24 }} />
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton" style={{ height: 118, marginTop: 12, borderRadius: 22 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app history-dark-page">
        <div className="history-shell">
          <div className="message error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app history-dark-page page-enter">
      <div className="history-shell">
        <header className="history-hero">
          <div>
            <h1>History</h1>
            <p>Track your scan history and health trends</p>
          </div>
          <div className="history-header-actions">
            <button className="history-icon-btn" onClick={() => filterRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="Show filters">
              <Filter size={23} />
            </button>
            <button className="history-avatar" onClick={() => navigate("/profile")} aria-label="Open profile">
              HT
            </button>
          </div>
        </header>

        <div className="history-filter-row" ref={filterRef}>
          {FILTERS.map((filter) => {
            const filterRisk = filter.replace(" Risk", "");
            const filterClass = filter === "All Scans" ? "all" : filterRisk.toLowerCase();
            return (
              <button
                key={filter}
                className={`history-filter-chip ${filterClass}${activeFilter === filter ? " active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                <span>{filter}</span>
                <strong>({counts[filter]})</strong>
              </button>
            );
          })}
        </div>

        {scans.length >= 2 && (
          <section className={`history-trend-panel ${trendContent.className}`}>
            <button className="history-insights-btn" onClick={() => setInsightsOpen(true)}>
              View Insights
              <ChevronRight size={18} />
            </button>
            <div className="history-trend-copy">
              <span>{trendContent.title}</span>
              <div className={`history-trend-icon ${trendContent.className}`}>
                <trendContent.Icon size={28} />
              </div>
              <h2>{trendContent.label}</h2>
              <p>{trendContent.insight}</p>
            </div>
            <TrendGraph scans={scans} />
            <div className="history-trend-tip">
              <Lightbulb size={22} />
              <span>Regular scans help in early detection and better outcomes.</span>
            </div>
          </section>
        )}

        <section className="history-recent-section">
          <div className="history-section-head">
            <h2>Recent Scans</h2>
            <button className="history-sort-toggle" onClick={() => setSortNewest((prev) => !prev)}>
              {sortNewest ? "Latest First" : "Oldest First"}
              <ArrowUpDown size={16} />
            </button>
          </div>

          {sortedScans.length > 0 ? (
            <div className="history-timeline-list">
              {sortedScans.map((scan) => {
                const meta = riskMeta(scan.risk_level);
                const Icon = meta.Icon;
                return (
                  <article
                    key={scan.id}
                    className={`history-timeline-card ${meta.className}`}
                    onClick={() => navigate(`/scan/${scan.id}`)}
                  >
                    <div className="history-card-accent" />
                    <div className="history-risk-orb">
                      <Icon size={34} />
                    </div>
                    <div className="history-card-main">
                      <h3>Scan #{scan.scan_number || scan.id?.slice(0, 6)}</h3>
                      <div className="history-scan-time">
                        {formatDate(scan.timestamp)} <span>•</span> {formatTime(scan.timestamp)}
                      </div>
                      <div className="history-scan-summary">
                        <Icon size={16} />
                        {meta.summary}
                      </div>
                    </div>
                    <div className="history-card-side">
                      <div className={`history-risk-badge ${meta.className}`}>{meta.label}</div>
                      <div className="history-confidence">{confidencePercent(scan)}% confidence</div>
                      <button
                        className="history-card-ai"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/care?scan_id=${scan.id}`);
                        }}
                        aria-label="Ask AI about this scan"
                      >
                        <MessageCircle size={15} />
                      </button>
                    </div>
                    <ChevronRight className="history-card-arrow" size={22} />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="history-empty">
              <div className="history-empty-icon">📋</div>
              <div className="history-empty-text">
                {scans.length === 0 ? "No scans yet" : `No ${activeFilter.toLowerCase().replace(" risk", "")} scans found`}
              </div>
              <div className="history-empty-sub">
                {scans.length === 0 ? "Start your first oral health check" : "Try a different filter"}
              </div>
              {scans.length === 0 && (
                <button className="history-cta-btn" onClick={() => navigate("/scan")}>
                  <Camera size={16} />
                  Start Scan
                </button>
              )}
            </div>
          )}
        </section>

        <section className="history-bottom-cta">
          <div className="history-cta-icon">
            <CalendarCheck size={31} />
          </div>
          <div className="history-cta-copy">
            <h2>Stay on top of your oral health</h2>
            <p>Regular scans help detect issues early and keep your smile healthy.</p>
          </div>
          <button className="history-start-btn" onClick={() => navigate("/scan")}>
            <Camera size={24} />
            Start New Scan
          </button>
        </section>
      </div>

      {insightsOpen && (
        <div className="image-modal-backdrop history-insights-backdrop" onClick={() => setInsightsOpen(false)}>
          <div className="history-insights-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="history-sheet-handle" />
            <div className="history-insights-head">
              <div>
                <h2>Health Insights</h2>
                <p>Based on your saved scan history</p>
              </div>
              <button className="back-btn" onClick={() => setInsightsOpen(false)} aria-label="Close insights">
                <X size={16} />
              </button>
            </div>
            <div className="history-insight-grid">
              <div>
                <span>Trend</span>
                <strong>{trendContent.label}</strong>
                <p>{trendContent.insight}</p>
              </div>
              <div>
                <span>Scan Frequency</span>
                <strong>{scans.length} total scans</strong>
                <p>{lastThree.length ? `Your last ${lastThree.length} scans are included in the current trend view.` : "Start scanning to build a trend history."}</p>
              </div>
              <div>
                <span>Recent Pattern</span>
                <strong>{lastThree.map((scan) => scan.risk_level).join(" → ") || "No pattern yet"}</strong>
                <p>{trendName === "Declining" ? "Higher recent risk levels need closer follow-up." : trendName === "Improving" ? "Recent risk levels are moving in a better direction." : "Recent risk levels are staying broadly consistent."}</p>
              </div>
              <div>
                <span>Recommendation</span>
                <strong>Next step</strong>
                <p>{trendContent.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}

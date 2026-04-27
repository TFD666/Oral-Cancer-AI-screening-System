import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Camera, ArrowUpDown, TrendingUp, TrendingDown, Minus, MessageCircle } from "lucide-react";

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

function riskEmoji(level) {
  if (level === "Low") return "😊";
  if (level === "Medium") return "👀";
  return "⚠️";
}

function insightText(level) {
  return level === "Low" ? "No major concerns detected" : "Areas of concern detected";
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

function TrendIcon({ trend }) {
  if (trend === "Improving") return <TrendingUp size={20} color="var(--green)" />;
  if (trend === "Declining") return <TrendingDown size={20} color="var(--red)" />;
  return <Minus size={20} color="var(--text-muted)" />;
}

const FILTERS = ["All Scans", "Low Risk", "Medium Risk", "High Risk"];

export default function History() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Scans");
  const [sortNewest, setSortNewest] = useState(true);
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

  const counts = useMemo(() => ({
    "All Scans": scans.length,
    "Low Risk": scans.filter((scan) => scan.risk_level === "Low").length,
    "Medium Risk": scans.filter((scan) => scan.risk_level === "Medium").length,
    "High Risk": scans.filter((scan) => scan.risk_level === "High").length,
  }), [scans]);

  let filtered = scans;
  if (activeFilter === "Low Risk") filtered = scans.filter((scan) => scan.risk_level === "Low");
  else if (activeFilter === "Medium Risk") filtered = scans.filter((scan) => scan.risk_level === "Medium");
  else if (activeFilter === "High Risk") filtered = scans.filter((scan) => scan.risk_level === "High");

  if (!sortNewest) {
    filtered = [...filtered].reverse();
  }

  function trendCopy() {
    if (trend.trend === "Declining") {
      return {
        title: "Your oral health trend is declining",
        subtitle: "Recent scans show increased risk levels",
      };
    }
    if (trend.trend === "Improving") {
      return {
        title: "Your oral health trend is improving",
        subtitle: "Recent scans show lower risk levels",
      };
    }
    return {
      title: "Your oral health trend is stable",
      subtitle: "Recent scans are staying at a similar risk level",
    };
  }

  if (loading) {
    return (
      <div className="app">
        <div className="page-header">
          <div className="skeleton" style={{ width: 80, height: 18 }} />
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px 14px" }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton" style={{ width: 88, height: 32, borderRadius: 20 }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 94 }} />
        {[1, 2, 3].map((item) => (
          <div key={item} className="skeleton" style={{ height: 92, margin: "0 20px 10px", borderRadius: 18 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" style={{ padding: 20 }}>
        <div className="message error">{error}</div>
      </div>
    );
  }

  const trendText = trendCopy();

  return (
    <div className="app page-enter">
      <div className="page-header">
        <h1 className="page-header-title">History</h1>
      </div>

      <div className="filter-chips history-filter-chips">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={`filter-chip${activeFilter === filter ? " active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
            <span className="filter-chip-count">{counts[filter]}</span>
          </button>
        ))}
      </div>

      {scans.length >= 2 && (
        <div className={`trend-card history-trend-card${trend.trend === "Declining" ? " declining" : trend.trend === "Improving" ? " improving" : ""}`}>
          <div className="trend-icon" style={{ background: trend.trend === "Declining" ? "var(--red-bg)" : trend.trend === "Improving" ? "var(--green-bg)" : "var(--bg)" }}>
            <TrendIcon trend={trend.trend} />
          </div>
          <div className="trend-text">
            <div className="trend-label">Trend Insight</div>
            <div className="trend-value">{trendText.title}</div>
            <div className="trend-desc">{trend.description || trendText.subtitle}</div>
          </div>
        </div>
      )}

      <div className="section-header">
        <span className="section-title">Scan Timeline</span>
        <button className="sort-btn" onClick={() => setSortNewest((prev) => !prev)}>
          <ArrowUpDown size={14} />
          {sortNewest ? "Latest first" : "Oldest first"}
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="scan-list history-scan-list">
          {filtered.map((scan) => (
            <div
              key={scan.id}
              className="scan-card history-scan-card"
              onClick={() => navigate(`/scan/${scan.id}`)}
            >
              <div className={`scan-card-left ${riskClass(scan.risk_level)}`} />
              <div
                className="scan-card-thumb"
                style={{
                  background: scan.risk_level === "Low" ? "var(--green-bg)"
                    : scan.risk_level === "Medium" ? "var(--amber-bg)"
                      : "var(--red-bg)",
                }}
              >
                {riskEmoji(scan.risk_level)}
              </div>
              <div className="scan-card-info">
                <div className="scan-card-row">
                  <span className="scan-card-id">Scan #{scan.scan_number || scan.id?.slice(0, 6)}</span>
                  <span className={`scan-badge ${riskClass(scan.risk_level)}`}>
                    {scan.risk_level} Risk
                  </span>
                </div>
                <div className="scan-card-row" style={{ marginTop: 2 }}>
                  <span className="scan-card-time">
                    {formatDate(scan.timestamp)} · {formatTime(scan.timestamp)}
                  </span>
                </div>
                <div className="scan-card-insight history-scan-summary">
                  <span>{insightText(scan.risk_level)}</span>
                </div>
                <div className="history-card-footer">
                  <span className="history-model-confidence">
                    Model confidence: {Math.round((scan.model_confidence ?? scan.confidence ?? 0.85) * 100)}%
                  </span>
                  <button
                    className="history-ai-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/care?scan_id=${scan.id}`);
                    }}
                  >
                    <MessageCircle size={14} />
                    Ask AI about this
                  </button>
                </div>
              </div>
            </div>
          ))}
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

      <div className="history-cta">
        <div className="history-cta-text">
          <div className="history-cta-title">Start New Scan</div>
          <div className="history-cta-sub">Regular scans help in early detection</div>
        </div>
        <button className="history-cta-btn" onClick={() => navigate("/scan")}>
          <Camera size={16} />
          Start Scan
        </button>
      </div>

      <div className="spacer" />
    </div>
  );
}

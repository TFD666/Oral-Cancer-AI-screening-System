import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  Camera,
  ChevronRight,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const FALLBACK_DAILY_TIPS = [
  "Brush your tongue daily to reduce bacteria.",
  "Regular oral checks help early detection.",
  "Stay hydrated to maintain oral health.",
];

let dailyTipsCache = null;

function riskClass(level) {
  return (level || "Low").toLowerCase();
}

function riskScoreFromLevel(level) {
  if (level === "High") return 0.86;
  if (level === "Medium") return 0.52;
  return 0.18;
}

function riskColor(level) {
  if (riskClass(level) === "high") return "#ef4444";
  if (riskClass(level) === "medium") return "#f97316";
  return "#4ade80";
}

function riskLabel(level) {
  return `${(level || "Low").toUpperCase()} RISK`;
}

function riskHint(level) {
  if (level === "High") return "You should consult a specialist soon.";
  if (level === "Medium") return "Monitor changes and consider a dental check-up.";
  return "No major concerns detected. Continue monitoring.";
}

function riskSummary(level) {
  if (level === "High") return "Areas of concern detected";
  if (level === "Medium") return "Some areas may need attention";
  return "No major concerns detected";
}

function riskDescription(level) {
  if (level === "High") return "Multiple areas may need attention. Consult a specialist for evaluation.";
  if (level === "Medium") return "Some areas may need monitoring. Consider a dental check-up.";
  return "Your latest scan looks stable. Keep monitoring regularly.";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Afternoon";
}

function formatDate(ts) {
  if (!ts) return "No scan yet";
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

function makeGraphScans(scans, latestScan) {
  const source = scans?.length ? [...scans].reverse() : [];

  if (source.length === 0 && latestScan) {
    source.push(latestScan);
  }

  while (source.length < 5) {
    const base = source[source.length - 1] || latestScan || {};
    const levels = ["High", "High", "Medium", "Low", "Low"];
    source.push({
      ...base,
      id: `${base.id || "scan"}-${source.length}`,
      risk_level: levels[source.length],
      risk_score: riskScoreFromLevel(levels[source.length]),
      synthetic: !base.id,
    });
  }

  return source.slice(-5);
}

function HealthGraph({ scans, latestScan }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const navigate = useNavigate();
  const graphScans = useMemo(() => makeGraphScans(scans, latestScan), [scans, latestScan]);

  const width = 560;
  const height = 260;
  const points = graphScans.map((scan, index) => {
    const x = 20 + index * 125;
    const score = scan.risk_score ?? riskScoreFromLevel(scan.risk_level);
    const y = 30 + (1 - Math.min(1, Math.max(0, score))) * 165;
    return { x, y, scan };
  });

  const baselineY = height - 40;
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const mid = prev.x + (point.x - prev.x) / 2;
    return `${path} C ${mid} ${prev.y}, ${mid} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
  const active = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="home-status-graph">
      <svg viewBox={`0 0 ${width} ${height}`} className="home-graph-svg" aria-label="Recent scan risk timeline">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path className="chart-area-path" d={areaPath} fill="url(#areaGradient)" />
        <path className="chart-line-path" d={linePath} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="220" x2="548" y2="220" stroke="rgba(180,195,213,0.25)" strokeDasharray="8 8" />
        {points.map(({ x, y, scan }, index) => (
          <g key={`${scan.id}-${index}`}>
            <circle
              cx={x}
              cy={y}
              r={activeIndex === index ? 12 : 8}
              fill={riskColor(scan.risk_level)}
              opacity={activeIndex === index ? 0.2 : 0}
            />
            <circle
              cx={x}
              cy={y}
              r="6"
              fill="rgba(2, 7, 13, 0.9)"
              stroke={riskColor(scan.risk_level)}
              strokeWidth="2.5"
              className="home-graph-dot"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(index);
              }}
            />
            <circle cx={x} cy={y} r="3" fill="#ffffff" pointerEvents="none" />
          </g>
        ))}
      </svg>
      {active && (
        <button
          className="home-graph-tooltip"
          style={{ left: `${Math.min(70, Math.max(4, (active.x / width) * 100 - 7))}%`, top: `${Math.max(0, (active.y / height) * 100 - 20)}%` }}
          onClick={(event) => {
            event.stopPropagation();
            if (!active.scan.synthetic && active.scan.id) navigate(`/scan/${active.scan.id}`);
          }}
        >
          <span>Scan #{String(active.scan.id || "----").slice(0, 6)}</span>
          <strong>{active.scan.risk_level || "Low"} Risk</strong>
        </button>
      )}
      <div className="home-graph-axis">
        <span>Older</span>
        <span>Recent</span>
      </div>
      <div className="home-risk-legend">
        <span><i className="legend-dot high" />High Risk</span>
        <span><i className="legend-dot medium" />Medium Risk</span>
        <span><i className="legend-dot low" />Low Risk</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="app home-dark-page">
      <div className="home-shell">
        <div className="skeleton" style={{ width: 180, height: 24, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 28 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 28, marginTop: 20 }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyTips, setDailyTips] = useState(dailyTipsCache || FALLBACK_DAILY_TIPS);
  const [tipIndex, setTipIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const tipPauseUntilRef = useRef(0);
  const tipTouchStartRef = useRef(null);
  const tipSwipeRef = useRef(false);
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

  useEffect(() => {
    if (dailyTipsCache) {
      setDailyTips(dailyTipsCache);
      return;
    }

    let active = true;
    apiFetch("/daily-tips")
      .then((response) => {
        const tips = Array.isArray(response?.tips) && response.tips.length ? response.tips : FALLBACK_DAILY_TIPS;
        dailyTipsCache = tips;
        if (active) {
          setDailyTips(tips);
          setTipIndex(0);
        }
      })
      .catch(() => {
        if (active) setDailyTips(FALLBACK_DAILY_TIPS);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (dailyTips.length <= 1) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() < tipPauseUntilRef.current) return;
      setTipIndex((current) => (current + 1) % dailyTips.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [dailyTips.length]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="app home-dark-page page-enter">
        <div className="home-shell">
          <div className="message error">{error}</div>
        </div>
      </div>
    );
  }

  const {
    user,
    latest_scan: latestScan,
    recent_scans: recentScans = [],
    tip_of_the_day: tipOfTheDay,
    days_since_last_scan: daysSinceLastScan,
    trend,
  } = data;

  const latestRisk = latestScan?.risk_level || "Low";
  const confidence = Math.round((latestScan?.model_confidence ?? latestScan?.confidence ?? 0.96) * 100);
  const initials = user?.initials || user?.name?.slice(0, 2)?.toUpperCase() || "AR";
  const firstName = user?.name || "Arsh Raj";
  const waveColor = riskColor(latestRisk);
  const activeTip = dailyTips[tipIndex % dailyTips.length] || tipOfTheDay || FALLBACK_DAILY_TIPS[0];
  const notifications = [
    {
      id: "daily-tip",
      icon: "💡",
      title: "Your daily oral tip is ready",
      body: activeTip,
    },
    ...(typeof daysSinceLastScan === "number"
      ? [{
          id: "scan-gap",
          icon: "📅",
          title: `It's been ${daysSinceLastScan} ${daysSinceLastScan === 1 ? "day" : "days"} since your last scan`,
          body: daysSinceLastScan >= 5 ? "A quick check can help you keep your oral health trend visible." : "Your scan routine is active. Keep monitoring regularly.",
        }]
      : []),
    ...(trend?.trend === "Improving"
      ? [{
          id: "improvement",
          icon: "↗",
          title: "Your recent scan showed improvement",
          body: trend.description || "Recent scans suggest your risk trend is moving in a better direction.",
        }]
      : []),
    {
      id: "recommendation",
      icon: "✓",
      title: "New health recommendation available",
      body: riskHint(latestRisk),
    },
  ];
  const openNotifications = () => {
    setNotificationsOpen((current) => !current);
    setHasUnreadNotifications(false);
  };
  const pauseTipAutoRotation = () => {
    tipPauseUntilRef.current = Date.now() + 4500;
  };
  const setManualTip = (nextIndex) => {
    pauseTipAutoRotation();
    setTipIndex(((nextIndex % dailyTips.length) + dailyTips.length) % dailyTips.length);
  };
  const openTipInCare = () => {
    navigate(`/care?prompt=${encodeURIComponent("Explain this oral health tip")}`);
  };
  const handleTipKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTipInCare();
    }
  };
  const handleTipTouchStart = (event) => {
    tipSwipeRef.current = false;
    tipTouchStartRef.current = event.touches[0]?.clientX ?? null;
  };
  const handleTipTouchEnd = (event) => {
    const startX = tipTouchStartRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    tipTouchStartRef.current = null;
    if (startX === null || endX === null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 32) return;
    tipSwipeRef.current = true;
    event.stopPropagation();
    setManualTip(tipIndex + (delta < 0 ? 1 : -1));
    window.setTimeout(() => {
      tipSwipeRef.current = false;
    }, 0);
  };

  return (
    <div className="app home-dark-page page-enter">
      <main className="home-shell">
        <header className="home-hero">
          <div className="home-hero-copy">
            <div className="home-greeting">{getGreeting()} <span className="home-sun">☀</span></div>
            <h1>Hello, {firstName} <span className="home-wave">👋</span></h1>
            <p>Track your oral health. Detect early. Stay healthy.</p>
          </div>
          <div className="home-header-actions">
            <button className={`home-bell${notificationsOpen ? " open" : ""}`} aria-label="Notifications" aria-expanded={notificationsOpen} onClick={openNotifications}>
              <Bell size={24} />
              {hasUnreadNotifications && <span />}
            </button>
            <button className="home-avatar" onClick={() => navigate("/profile")}>{initials}</button>
          </div>
        </header>
        <section className={`home-notification-drawer${notificationsOpen ? " open" : ""}`} aria-hidden={!notificationsOpen}>
          <div className="home-notification-head">
            <div>
              <strong>Notifications</strong>
              <small>{notifications.length ? "Today in your oral health" : "No new notifications"}</small>
            </div>
            <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
          </div>
          {notifications.length ? (
            <div className="home-notification-list">
              {notifications.map((notification) => (
                <button
                  type="button"
                  className="home-notification-item"
                  key={notification.id}
                  onClick={() => {
                    setNotificationsOpen(false);
                    if (notification.id === "daily-tip") navigate(`/care?prompt=${encodeURIComponent("Explain this oral health tip")}`);
                  }}
                >
                  <span>{notification.icon}</span>
                  <div>
                    <strong>{notification.title}</strong>
                    <small>{notification.body}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-notification-empty">
              <span>🔔</span>
              <strong>No new notifications</strong>
            </div>
          )}
        </section>

        <section className={`home-status-card ${riskClass(latestRisk)}`} onClick={() => navigate("/history")}>
          <div className="wave-container" aria-hidden="true">
            <div className="wave" style={{ backgroundColor: waveColor }} />
            <div className="wave wave2" style={{ backgroundColor: waveColor }} />
            <div className="wave wave3" style={{ backgroundColor: waveColor }} />
          </div>
          <div className="home-status-header">
            <div className="home-card-title">Your Current Status</div>
            <button className="home-history-link" onClick={(event) => { event.stopPropagation(); navigate("/history"); }}>
              View History
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="home-status-left">
            <div className={`home-risk-chip ${riskClass(latestRisk)}`}>{riskLabel(latestRisk)}</div>
            <p>Based on your most recent scan</p>
            <div className={`home-shield-orb ${riskClass(latestRisk)}`}>
              {latestRisk === "Low" ? <ShieldCheck size={52} /> : <ShieldAlert size={52} />}
            </div>
            <p className="home-status-advice">{riskHint(latestRisk)}</p>
          </div>
          <HealthGraph scans={recentScans} latestScan={latestScan} />
        </section>

        {latestScan && (
          <section className="home-last-scan" onClick={() => navigate(`/scan/${latestScan.id}`)}>
            <div className="home-last-top">
              <h2>Last Scan</h2>
              <div className="home-last-date">
                <CalendarCheck size={16} />
                {formatDate(latestScan.timestamp)} <span>•</span> {formatTime(latestScan.timestamp)}
              </div>
            </div>
            <div className="home-last-main">
              <div className="home-last-left">
                <div className={`home-scan-icon ${riskClass(latestRisk)}`}>
                  {latestRisk === "Low" ? <ShieldCheck size={48} /> : <AlertTriangle size={48} />}
                </div>
                <div className="home-last-copy">
                  <span className={`home-small-risk ${riskClass(latestRisk)}`}>{riskLabel(latestRisk)}</span>
                  <h3>{riskSummary(latestRisk)}</h3>
                  <p>{riskDescription(latestRisk)}</p>
                </div>
              </div>
              <div className="home-confidence">
                <span>Model Confidence</span>
                <strong>{confidence}%</strong>
                <div className="home-confidence-track">
                  <i style={{ width: `${Math.max(8, Math.min(100, confidence))}%` }} />
                </div>
              </div>
            </div>
            <button className="home-report-button" onClick={(event) => { event.stopPropagation(); navigate(`/scan/${latestScan.id}`); }}>
              View Full Report
              <ChevronRight size={20} />
            </button>
          </section>
        )}

        <button className="home-start-scan" onClick={() => navigate("/scan")}>
          <span className="home-start-icon"><Camera size={38} /></span>
          <span className="home-start-text">
            <strong>Start Scan</strong>
            <small>Quick 30-second check</small>
          </span>
          <span className="home-start-arrow"><ChevronRight size={34} /></span>
        </button>

        <section className="home-quick-section">
          <h2>Quick Actions</h2>
          <div className="home-quick-grid">
            <button className="home-quick-card daily" onClick={() => navigate("/scan")}>
              <span className="home-quick-icon"><CalendarCheck size={30} /></span>
              <strong>Daily Check</strong>
              <small>Quick 10-second health check</small>
              <i><ChevronRight size={26} /></i>
            </button>
            <button className="home-quick-card history" onClick={() => navigate("/history")}>
              <span className="home-quick-icon"><ClipboardList size={30} /></span>
              <strong>History</strong>
              <small>View your past scan reports</small>
              <i><ChevronRight size={26} /></i>
            </button>
          </div>
        </section>

        <section className="home-tip-card">
          <div className="home-tip-icon">💡</div>
          <div className="home-tip-copy">
            <button
              type="button"
              className="home-tip-main"
              onClick={() => {
                if (!tipSwipeRef.current) openTipInCare();
              }}
              onKeyDown={handleTipKeyDown}
              onTouchStart={handleTipTouchStart}
              onTouchEnd={handleTipTouchEnd}
              aria-label="Open AI assistant to explain this oral health tip"
            >
              <h2>Tip of the Day</h2>
              <p key={activeTip} className="home-tip-text">{activeTip}</p>
            </button>
            <div className="home-tip-controls" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="home-tip-nav"
                aria-label="Show previous oral health tip"
                onClick={(event) => {
                  event.stopPropagation();
                  setManualTip(tipIndex - 1);
                }}
              >
                ‹
              </button>
              <div className="home-tip-dots" role="tablist" aria-label="Daily health tip carousel">
              {dailyTips.slice(0, 3).map((tip, index) => (
                <button
                  key={`${tip}-${index}`}
                  type="button"
                  className={index === tipIndex % dailyTips.length ? "active" : ""}
                  aria-label={`Show oral health tip ${index + 1}`}
                  aria-selected={index === tipIndex % dailyTips.length}
                  onClick={(event) => {
                    event.stopPropagation();
                    setManualTip(index);
                  }}
                />
              ))}
              </div>
              <button
                type="button"
                className="home-tip-nav"
                aria-label="Show next oral health tip"
                onClick={(event) => {
                  event.stopPropagation();
                  setManualTip(tipIndex + 1);
                }}
              >
                ›
              </button>
            </div>
          </div>
          <div className="home-tooth-illustration">
            <span className="spark one">✦</span>
            <span className="spark two">✦</span>
            <div className="tooth-face">🦷</div>
            <div className="tooth-shield">✓</div>
          </div>
        </section>
      </main>
    </div>
  );
}

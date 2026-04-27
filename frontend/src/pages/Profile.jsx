import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { apiFetch } from "../lib/api";
import {
  User,
  Bell,
  Shield,
  HelpCircle,
  Info,
  Mail,
  ChevronRight,
  Download,
  Trash2,
  LogOut,
  FileText,
  X,
} from "lucide-react";

function riskTone(level) {
  if (level === "Low") return "var(--green)";
  if (level === "Medium") return "var(--amber)";
  if (level === "High") return "var(--red)";
  return "var(--text-muted)";
}

function riskMeaning(level) {
  if (level === "Low") return "Your oral health is stable - keep monitoring regularly.";
  if (level === "Medium") return "Your current risk is moderate - consider a dental follow-up soon.";
  if (level === "High") return "Your current risk is high - consider consulting a specialist.";
  return "No scan summary available yet.";
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [latestRisk, setLatestRisk] = useState(null);
  const [lastScanDate, setLastScanDate] = useState(null);
  const [totalScans, setTotalScans] = useState(0);
  const [scanReminders, setScanReminders] = useState(true);
  const [dailyTips, setDailyTips] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        let name = "User";
        let email = "";
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const meta = authUser.user_metadata || {};
            name = meta.full_name || meta.name || authUser.email?.split("@")[0] || "User";
            email = authUser.email || "";
          }
        } catch (_) {
          // keep fallback values
        }

        try {
          const dashboard = await apiFetch("/dashboard");
          if (!active) return;
          if (dashboard.user && name === "User") {
            name = dashboard.user.name || name;
            email = dashboard.user.email || email;
          }
          if (dashboard.latest_scan) {
            setLatestRisk(dashboard.latest_scan.risk_level);
            setLastScanDate(dashboard.latest_scan.timestamp);
          }
          setTotalScans(dashboard.total_scan_count || 0);
        } catch (err) {
          console.warn("Could not load dashboard data for profile:", err.message);
        }

        const initials = name
          .split(" ")
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase())
          .join("");
        setUser({ name, email, initials: initials || "?" });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/signin");
  }

  function formatLastScan(ts) {
    if (!ts) return "No scans yet";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function SettingsRow({ icon, iconBg, iconColor, title, description, danger = false, toggle, onClick, children }) {
    return (
      <button className={`settings-item${danger ? " danger" : ""}`} onClick={onClick}>
        <div className="settings-item-icon" style={{ background: iconBg }}>
          {icon}
        </div>
        <div className="settings-item-copy">
          <span className="settings-item-text" style={danger ? { color: "var(--red)" } : undefined}>{title}</span>
          <span className="settings-item-sub">{description}</span>
        </div>
        {toggle ? children : <ChevronRight size={16} className="settings-item-chevron" color={danger ? "#E24B4A" : iconColor} />}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <div className="page-header">
          <div className="skeleton" style={{ width: 140, height: 18 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: "50%", marginBottom: 12 }} />
          <div className="skeleton" style={{ width: 140, height: 16, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 180, height: 12 }} />
        </div>
        <div className="skeleton" style={{ height: 88, margin: "0 20px 16px", borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 120, margin: "0 20px 16px", borderRadius: 18 }} />
      </div>
    );
  }

  return (
    <div className="app page-enter">
      <div className="page-header">
        <h1 className="page-header-title">Profile & Settings</h1>
        <button style={{ padding: 8, borderRadius: "50%", background: "var(--bg)" }}>
          <Bell size={18} color="var(--text-secondary)" />
        </button>
      </div>

      <div className="profile-card profile-hero-card">
        <div className="profile-avatar profile-hero-avatar">{user?.initials}</div>
        <div className="profile-greeting">Hello, {user?.name?.split(" ")[0] || "there"} 👋</div>
        <div className="profile-email">Here's your oral health overview</div>
        <div className="profile-email" style={{ marginTop: 6 }}>{user?.email}</div>
        <button className="profile-edit-btn">
          <User size={14} />
          Edit Profile
        </button>
      </div>

      <div className="health-summary profile-health-summary">
        <div className="health-item">
          <div className="health-label">Current Risk Level</div>
          <div className="health-value" style={{ color: riskTone(latestRisk) }}>
            {latestRisk || "N/A"}
          </div>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div className="health-item">
          <div className="health-label">Last Scan Date</div>
          <div className="health-value" style={{ fontSize: "0.82rem" }}>
            {formatLastScan(lastScanDate)}
          </div>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div className="health-item">
          <div className="health-label">Total Scans Taken</div>
          <div className="health-value">{totalScans}</div>
        </div>
      </div>

      <div className="profile-risk-context">
        {riskMeaning(latestRisk)}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Account</div>
        <div className="settings-group">
          <SettingsRow
            icon={<User size={16} color="var(--blue)" />}
            iconBg="var(--blue-bg)"
            iconColor="var(--blue)"
            title="Edit Profile"
            description="Update your personal details"
          />
          <SettingsRow
            icon={<Shield size={16} color="#7C3AED" />}
            iconBg="#F3E8FF"
            iconColor="#7C3AED"
            title="Change Password"
            description="Strengthen access to your account"
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Notifications</div>
        <div className="settings-group">
          <SettingsRow
            icon={<Bell size={16} color="var(--green)" />}
            iconBg="var(--green-bg)"
            title="Scan Reminders"
            description="Get notified to perform regular checks"
            toggle
          >
            <button className={`toggle${scanReminders ? " on" : ""}`} onClick={(event) => { event.stopPropagation(); setScanReminders((prev) => !prev); }}>
              <div className="toggle-knob" />
            </button>
          </SettingsRow>
          <SettingsRow
            icon={<FileText size={16} color="var(--amber)" />}
            iconBg="var(--amber-bg)"
            title="Daily Health Tips"
            description="Receive daily oral health advice"
            toggle
          >
            <button className={`toggle${dailyTips ? " on" : ""}`} onClick={(event) => { event.stopPropagation(); setDailyTips((prev) => !prev); }}>
              <div className="toggle-knob" />
            </button>
          </SettingsRow>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data & Privacy</div>
        <div className="settings-group">
          <SettingsRow
            icon={<Download size={16} color="var(--blue)" />}
            iconBg="var(--blue-bg)"
            iconColor="var(--blue)"
            title="Download All Reports"
            description="Export your medical history"
          />
          <SettingsRow
            icon={<Shield size={16} color="var(--green)" />}
            iconBg="var(--green-bg)"
            iconColor="var(--green)"
            title="Privacy Policy"
            description="Learn how your data is protected"
          />
          <SettingsRow
            icon={<Trash2 size={16} color="var(--red)" />}
            iconBg="var(--red-bg)"
            iconColor="var(--red)"
            title="Delete Account"
            description="Permanently remove your account and records"
            danger
            onClick={() => setShowDeleteConfirm(true)}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Support & About</div>
        <div className="settings-group">
          <SettingsRow
            icon={<HelpCircle size={16} color="var(--amber)" />}
            iconBg="var(--amber-bg)"
            iconColor="var(--amber)"
            title="Help & FAQ"
            description="Find answers to common questions"
          />
          <SettingsRow
            icon={<Mail size={16} color="var(--blue)" />}
            iconBg="var(--blue-bg)"
            iconColor="var(--blue)"
            title="Contact Support"
            description="Reach out for assistance"
          />
          <SettingsRow
            icon={<Info size={16} color="var(--green)" />}
            iconBg="var(--green-bg)"
            iconColor="var(--green)"
            title="About OralAI"
            description="Learn more about this app"
          />
        </div>
      </div>

      <div className="profile-logout-wrap">
        <button className="logout-btn" onClick={handleSignOut}>
          <LogOut size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          Logout
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="image-modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="education-modal profile-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="education-modal-header">
              <div>
                <div className="education-modal-title">Delete account?</div>
                <div className="education-modal-subtitle">This action cannot be undone.</div>
              </div>
              <button className="back-btn" onClick={() => setShowDeleteConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="education-modal-list">
              <div className="education-modal-item">Your profile and saved reports would be removed permanently.</div>
            </div>
            <div className="profile-confirm-actions">
              <button className="btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="logout-btn profile-danger-btn" onClick={() => setShowDeleteConfirm(false)}>Delete Account</button>
            </div>
          </div>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}

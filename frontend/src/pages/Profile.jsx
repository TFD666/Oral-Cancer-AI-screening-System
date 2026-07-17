import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { apiFetch } from "../lib/api";
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  Headphones,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";

function riskClass(level) {
  if (level === "High") return "high";
  if (level === "Medium") return "medium";
  if (level === "Low") return "low";
  return "unknown";
}

function riskText(level) {
  if (level === "High") return "Consider consulting a specialist soon";
  if (level === "Medium") return "Consider a dental follow-up soon";
  if (level === "Low") return "Your oral health is stable";
  return "Start scanning to build your health overview";
}

function formatLastScan(ts) {
  if (!ts) return "No scans yet";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatLastScanTime(ts) {
  if (!ts) return "No scan time";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function loadStoredPreferences() {
  try {
    return JSON.parse(localStorage.getItem("oralai_profile_preferences") || "{}");
  } catch (_) {
    return {};
  }
}

function saveStoredPreferences(preferences) {
  localStorage.setItem("oralai_profile_preferences", JSON.stringify(preferences));
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
  const [activeModal, setActiveModal] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationRead, setNotificationRead] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const stored = loadStoredPreferences();
    if (typeof stored.scanReminders === "boolean") setScanReminders(stored.scanReminders);
    if (typeof stored.dailyTips === "boolean") setDailyTips(stored.dailyTips);
    if (stored.notificationRead) setNotificationRead(true);
  }, []);

  useEffect(() => {
    saveStoredPreferences({ scanReminders, dailyTips, notificationRead });
  }, [scanReminders, dailyTips, notificationRead]);

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

        try {
          const preferences = await apiFetch("/preferences");
          if (!active) return;
          name = preferences.display_name || name;
          email = preferences.email || email;
          if (typeof preferences.scan_reminders === "boolean") {
            setScanReminders(preferences.scan_reminders);
          }
          if (typeof preferences.daily_tips === "boolean") {
            setDailyTips(preferences.daily_tips);
          }
        } catch (err) {
          console.warn("Could not load profile preferences:", err.message);
        }

        const storedProfile = (() => {
          try {
            return JSON.parse(localStorage.getItem("oralai_profile_display") || "{}");
          } catch (_) {
            return {};
          }
        })();
        name = name || storedProfile.name || "User";
        email = email || storedProfile.email || "";

        const initials = name
          .split(" ")
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase())
          .join("");

        const nextUser = { name, email, initials: initials || "?" };
        setUser(nextUser);
        setProfileDraft({ name: nextUser.name, email: nextUser.email });
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

  async function updatePreference(key, value) {
    if (key === "scanReminders") setScanReminders(value);
    if (key === "dailyTips") setDailyTips(value);

    const payload = {};
    if (key === "scanReminders") payload.scan_reminders = value;
    if (key === "dailyTips") payload.daily_tips = value;

    try {
      await apiFetch("/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Could not save profile preference:", err.message);
    }
  }

  async function saveProfileDraft() {
    const next = {
      name: profileDraft.name.trim() || user?.name || "User",
      email: user?.email || profileDraft.email.trim() || "",
    };
    const initials = next.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
    localStorage.setItem("oralai_profile_display", JSON.stringify(next));
    setUser({ ...next, initials: initials || "?" });
    try {
      const saved = await apiFetch("/preferences", {
        method: "PUT",
        body: JSON.stringify({ display_name: next.name }),
      });
      const savedName = saved.display_name || next.name;
      const savedInitials = savedName
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("");
      setUser({
        name: savedName,
        email: saved.email || next.email,
        initials: savedInitials || "?",
      });
    } catch (err) {
      console.warn("Could not save profile display name:", err.message);
    }
    setActiveModal(null);
  }

  async function downloadReports() {
    try {
      const history = await apiFetch("/history");
      const payload = {
        exported_at: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        history,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "oralai-reports.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      setActiveModal("download");
    }
  }

  function Toggle({ checked, onChange, label }) {
    return (
      <button
        className={`profile-toggle${checked ? " on" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onChange(!checked);
        }}
        aria-label={label}
        aria-pressed={checked}
      >
        <span />
      </button>
    );
  }

  function SettingsRow({ icon, tone = "blue", title, description, danger = false, toggle, onClick, children }) {
    return (
      <button className={`profile-settings-row ${tone}${danger ? " danger" : ""}`} onClick={onClick}>
        <div className="profile-row-icon">{icon}</div>
        <div className="profile-row-copy">
          <span>{title}</span>
          <small>{description}</small>
        </div>
        {toggle ? children : <ChevronRight size={24} className="profile-row-chevron" />}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="app profile-dark-page">
        <div className="profile-shell">
          <div className="skeleton" style={{ width: 190, height: 34, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 260, marginTop: 28, borderRadius: 28 }} />
          <div className="skeleton" style={{ height: 160, marginTop: 18, borderRadius: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app profile-dark-page page-enter">
      <div className="profile-shell">
        <header className="profile-page-header">
          <h1>Profile & Settings</h1>
          <div className="profile-header-actions">
            <button
              className="profile-bell"
              onClick={() => {
                setNotificationOpen((open) => !open);
                setNotificationRead(true);
              }}
              aria-label="Open notifications"
            >
              <Bell size={28} />
              {!notificationRead && <span />}
            </button>
            <button className="profile-header-avatar" aria-label="Profile avatar">
              {user?.initials}
            </button>
          </div>
        </header>

        {notificationOpen && (
          <div className="profile-notification-panel">
            <strong>Notifications</strong>
            <p>{dailyTips ? "Your daily oral health tip is ready." : "Daily tips are turned off."}</p>
            <p>{scanReminders ? "Scan reminders are active for regular checks." : "Scan reminders are turned off."}</p>
          </div>
        )}

        <section className="profile-hero-panel">
          <div className="profile-avatar-wrap">
            <div className="profile-main-avatar">{user?.initials}</div>
            <button className="profile-avatar-edit" onClick={() => setActiveModal("edit")}>
              <Edit3 size={20} />
            </button>
          </div>
          <div className="profile-hero-copy">
            <h2>Hello, {user?.name || "there"} 👋</h2>
            <p>Here’s your oral health overview</p>
            <div className="profile-email-row">
              <Mail size={22} />
              <span>{user?.email || "No email available"}</span>
            </div>
            <button className="profile-edit-action" onClick={() => setActiveModal("edit")}>
              <User size={22} />
              Edit Profile
            </button>
          </div>
        </section>

        <section className="profile-stats-panel">
          <div className={`profile-stat ${riskClass(latestRisk)}`}>
            <div className="profile-stat-icon"><Shield size={24} /></div>
            <span>Current Risk Level</span>
            <strong>{latestRisk || "N/A"}</strong>
            <small>{riskText(latestRisk)}</small>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-icon"><CalendarDays size={24} /></div>
            <span>Last Scan Date</span>
            <strong>{formatLastScan(lastScanDate)}</strong>
            <small>{formatLastScanTime(lastScanDate)}</small>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-icon"><Camera size={24} /></div>
            <span>Total Scans Taken</span>
            <strong>{totalScans}</strong>
            <small>Keep tracking!</small>
          </div>
        </section>

        <section className="profile-section">
          <h2>Account</h2>
          <div className="profile-settings-group">
            <SettingsRow icon={<User size={26} />} tone="blue" title="Edit Profile" description="Update your personal information" onClick={() => setActiveModal("edit")} />
            <SettingsRow icon={<Lock size={26} />} tone="purple" title="Change Password" description="Update your account password" onClick={() => setActiveModal("password")} />
          </div>
        </section>

        <section className="profile-section">
          <h2>Notifications</h2>
          <div className="profile-settings-group">
            <SettingsRow icon={<Bell size={26} />} tone="green" title="Scan Reminders" description="Get notified to perform regular scans" toggle>
              <Toggle checked={scanReminders} onChange={(value) => updatePreference("scanReminders", value)} label="Toggle scan reminders" />
            </SettingsRow>
            <SettingsRow icon={<FileText size={26} />} tone="amber" title="Daily Health Tips" description="Receive daily oral health advice" toggle>
              <Toggle checked={dailyTips} onChange={(value) => updatePreference("dailyTips", value)} label="Toggle daily health tips" />
            </SettingsRow>
          </div>
        </section>

        <section className="profile-section">
          <h2>Data & Privacy</h2>
          <div className="profile-settings-group">
            <SettingsRow icon={<Download size={26} />} tone="blue" title="Download All Reports" description="Export your medical history" onClick={downloadReports} />
            <SettingsRow icon={<ShieldCheck size={26} />} tone="green" title="Privacy Policy" description="Learn how your data is protected" onClick={() => setActiveModal("privacy")} />
            <SettingsRow icon={<Trash2 size={26} />} tone="red" title="Delete Account" description="Permanently delete your account" danger onClick={() => setShowDeleteConfirm(true)} />
          </div>
        </section>

        <section className="profile-section">
          <h2>Support & About</h2>
          <div className="profile-settings-group">
            <SettingsRow icon={<HelpCircle size={26} />} tone="amber" title="Help & FAQ" description="Find answers to common questions" onClick={() => setActiveModal("faq")} />
            <SettingsRow icon={<Headphones size={26} />} tone="blue" title="Contact Support" description="Reach out to our support team" onClick={() => setActiveModal("support")} />
            <SettingsRow icon={<Info size={26} />} tone="green" title="About OralAI" description="Learn more about our mission" onClick={() => setActiveModal("about")} />
          </div>
        </section>

        <button className="profile-logout-button" onClick={handleSignOut}>
          <LogOut size={27} />
          Logout
        </button>
      </div>

      {activeModal && (
        <div className="image-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="education-modal profile-dark-modal" onClick={(event) => event.stopPropagation()}>
            <div className="education-modal-header">
              <div>
                <div className="education-modal-title">
                  {activeModal === "edit" && "Edit Profile"}
                  {activeModal === "password" && "Change Password"}
                  {activeModal === "privacy" && "Privacy Policy"}
                  {activeModal === "faq" && "Help & FAQ"}
                  {activeModal === "support" && "Contact Support"}
                  {activeModal === "about" && "About OralAI"}
                  {activeModal === "download" && "Download Reports"}
                </div>
                <div className="education-modal-subtitle">OralAI Health settings</div>
              </div>
              <button className="back-btn" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {activeModal === "edit" ? (
              <div className="profile-edit-form">
                <label>
                  Name
                  <input value={profileDraft.name} onChange={(event) => setProfileDraft((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <label>
                  Email
                  <input value={profileDraft.email} disabled readOnly />
                </label>
                <button className="profile-save-button" onClick={saveProfileDraft}>Save Changes</button>
              </div>
            ) : (
              <div className="education-modal-list">
                <div className="education-modal-item">
                  {activeModal === "password" && "Password changes are managed through your Google/Supabase sign-in provider."}
                  {activeModal === "privacy" && "Your scans and reports are protected with authenticated access. Private storage URLs are temporary and signed."}
                  {activeModal === "faq" && "Common questions: use regular scans, monitor persistent symptoms, and consult a dentist for concerning changes."}
                  {activeModal === "support" && `Contact support from your registered email: ${user?.email || "not available"}.`}
                  {activeModal === "about" && "OralAI helps users track oral health scans with AI-assisted explanations and safety-focused guidance."}
                  {activeModal === "download" && "Report export could not be prepared right now. Please try again after history is available."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="image-modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="education-modal profile-dark-modal" onClick={(event) => event.stopPropagation()}>
            <div className="education-modal-header">
              <div>
                <div className="education-modal-title">Delete account?</div>
                <div className="education-modal-subtitle">This requires confirmation.</div>
              </div>
              <button className="back-btn" onClick={() => setShowDeleteConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="education-modal-list">
              <div className="education-modal-item">This is a protected action. Account deletion is not performed instantly from this screen.</div>
            </div>
            <div className="profile-confirm-actions">
              <button className="btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="profile-delete-confirm" onClick={() => setShowDeleteConfirm(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}

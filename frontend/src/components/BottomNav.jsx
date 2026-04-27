import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, ClipboardList, User, Camera } from "lucide-react";

const tabs = [
  { key: "home", icon: Home, label: "Home", path: "/" },
  { key: "care", icon: MessageCircle, label: "Care", path: "/care" },
  { key: "scan", icon: Camera, label: "Scan", path: "/scan", fab: true },
  { key: "history", icon: ClipboardList, label: "History", path: "/history" },
  { key: "profile", icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide bottom nav on some pages
  const hiddenPaths = ["/signin", "/landing", "/scan/"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p) && p !== "/scan/") ||
      // Hide on scan detail pages (e.g. /scan/uuid) but not /scan itself
      (location.pathname.startsWith("/scan/") && location.pathname !== "/scan")) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.path);

        if (tab.fab) {
          return (
            <button
              key={tab.key}
              className="scan-fab"
              onClick={() => navigate(tab.path)}
              aria-label="Start scan"
            >
              <Icon size={24} />
            </button>
          );
        }

        return (
          <button
            key={tab.key}
            className={`nav-item${isActive ? " active" : ""}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{tab.label}</span>
            {isActive && <div className="nav-dot" />}
          </button>
        );
      })}
    </nav>
  );
}

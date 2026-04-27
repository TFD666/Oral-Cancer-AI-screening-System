import { useNavigate } from "react-router-dom";
import { Shield, Camera, TrendingUp } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="auth-page" style={{ justifyContent: "flex-start", paddingTop: "60px" }}>
      <div className="auth-logo">OA</div>
      <h1 className="auth-title">OralAI Health</h1>
      <p className="auth-subtitle" style={{ maxWidth: 340 }}>
        AI-powered oral health screening at your fingertips. Early detection saves lives.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 340, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 14, padding: "16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Camera size={20} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Quick Scan</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Upload an oral image for instant AI analysis</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, padding: "16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--blue-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shield size={20} color="var(--blue)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>AI-Powered</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Advanced deep learning models trained on clinical data</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, padding: "16px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--amber-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={20} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Track Progress</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Monitor your oral health trends over time</div>
          </div>
        </div>
      </div>

      <button
        className="google-btn"
        style={{ width: "100%", maxWidth: 340, justifyContent: "center" }}
        onClick={() => navigate("/signin")}
      >
        Get Started — Sign In
      </button>

      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 16, maxWidth: 300 }}>
        For screening purposes only. Not a substitute for professional medical advice.
      </p>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Send, MapPin, Bot, Circle, BookOpen, X } from "lucide-react";
import { apiFetch } from "../lib/api";

function timeNow() {
  const date = new Date();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

const GENERAL_SUGGESTIONS = [
  "I have mouth ulcers",
  "What are early signs?",
  "How to prevent oral cancer?",
];

const SCAN_SUGGESTIONS = [
  "Is this serious?",
  "What should I do?",
  "Explain my result",
];

const EDUCATION_CARDS = [
  {
    id: "early-signs",
    icon: "🔍",
    title: "Early Signs",
    subtitle: "Symptoms worth noticing early",
    bullets: [
      "Persistent white or red patches",
      "Sores that do not heal in 2 weeks",
      "Unusual lumps or thickening",
    ],
  },
  {
    id: "risk-factors",
    icon: "⚡",
    title: "Risk Factors",
    subtitle: "Habits and exposures that increase risk",
    bullets: [
      "Tobacco use (smoking or chewing)",
      "Excessive alcohol consumption",
      "HPV infection",
      "Prolonged sun exposure",
    ],
  },
];

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="clinic-rating">
      {"★".repeat(full)}
      {half && "½"}
      <span style={{ marginLeft: 2, fontSize: "0.7rem" }}>{rating}</span>
    </span>
  );
}

export default function CareGuidance() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [scanSummary, setScanSummary] = useState(null);
  const [scanRisk, setScanRisk] = useState(null);
  const [scanBannerVisible, setScanBannerVisible] = useState(true);
  const [activeEducationCard, setActiveEducationCard] = useState(null);
  const chatRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasInitRef = useRef(false);

  const scanId = searchParams.get("scan_id") || null;
  const fallbackSuggestions = useMemo(
    () => (scanId ? SCAN_SUGGESTIONS : GENERAL_SUGGESTIONS),
    [scanId],
  );

  useEffect(() => {
    setSuggestions(fallbackSuggestions);
  }, [fallbackSuggestions]);

  useEffect(() => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    if (scanId) {
      setMessages([
        {
          role: "ai",
          text: `I’m here to help you understand your recent scan (${scanId.slice(0, 8)}...). Ask what it means, how serious it looks, or what to do next.`,
          time: timeNow(),
        },
      ]);
    } else {
      setMessages([
        {
          role: "ai",
          text: "Ask me anything about your oral health or your scan results. I’ll explain things clearly and suggest sensible next steps.",
          time: timeNow(),
        },
      ]);
    }
  }, [scanId]);

  useEffect(() => {
    if (!scanId) return undefined;

    let active = true;
    apiFetch(`/report/${scanId}`)
      .then((report) => {
        if (!active) return;
        setScanRisk(report.risk_level || "Low");
      })
      .catch(() => {
        if (active) setScanRisk(null);
      });

    apiFetch(`/scan-summary/${scanId}`)
      .then((summary) => {
        if (!active) return;
        setScanSummary(summary.summary || null);
      })
      .catch(() => {
        if (active) setScanSummary(null);
      });

    return () => {
      active = false;
    };
  }, [scanId]);

  useEffect(() => {
    apiFetch("/nearby-clinics?lat=0&lng=0")
      .then(setClinics)
      .catch(() => setClinics([]));
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing]);

  async function sendMessage(text) {
    const message = (text || input).trim();
    if (!message || typing) return;

    setMessages((prev) => [...prev, { role: "user", text: message, time: timeNow() }]);
    setInput("");
    setTyping(true);

    try {
      const payload = { message };
      if (scanId) payload.scan_id = scanId;

      const response = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (Array.isArray(response.suggestions) && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions(fallbackSuggestions);
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: response.reply, time: timeNow() },
      ]);
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I'm having trouble connecting right now. Please try again.",
          time: timeNow(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app page-enter">
      <div className="page-header">
        <h1 className="page-header-title">Care & Guidance</h1>
        <button className="header-avatar" onClick={() => navigate("/profile")} style={{ fontSize: "0.9rem" }}>
          👤
        </button>
      </div>

      <div className="chat-card care-chat-card card-enter stagger-1">
        <div className="chat-header care-chat-header">
          <div className="chat-header-avatar">
            <Bot size={20} />
          </div>
          <div>
            <div className="chat-header-name">OralAI Assistant</div>
            <div className="care-chat-subtitle">Your Oral Health Assistant</div>
            <div className="chat-header-status">
              <Circle size={8} fill="#52C9A0" color="#52C9A0" className="care-online-dot" />
              Online
            </div>
          </div>
        </div>

        {scanId && scanBannerVisible && (
          <div className={`care-context-banner ${scanRisk ? riskClass(scanRisk) : "medium"}`}>
            <div>
              <div className="care-context-title">
                Discussing your recent scan{scanRisk ? ` (${scanRisk} Risk)` : ""}
              </div>
              {scanSummary && <div className="care-context-text">{scanSummary}</div>}
            </div>
            <button className="care-context-dismiss" onClick={() => setScanBannerVisible(false)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="chat-messages care-chat-messages" ref={chatRef}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`msg-row${message.role === "user" ? " user" : ""}`}>
              {message.role === "ai" && <div className="msg-bot-av">🤖</div>}
              <div className="care-message-block">
                <div className={`bubble ${message.role === "user" ? "user care-user-bubble" : "ai care-ai-bubble"}`}>
                  {message.text}
                </div>
                <div className="msg-time">{message.time}{message.role === "user" && " ✓✓"}</div>
              </div>
            </div>
          ))}

          {typing && (
            <div className="msg-row">
              <div className="msg-bot-av">🤖</div>
              <div className="care-message-block">
                <div className="bubble ai care-ai-bubble care-typing-bubble">
                  <div className="typing-bubble">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                  <div className="care-typing-label">AI is thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-bar care-chat-input-bar">
          <input
            type="text"
            className="chat-input care-chat-input"
            placeholder="Ask about your scan or oral health..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={typing}
          />
          <button className="chat-send care-chat-send" onClick={() => sendMessage()} disabled={typing || !input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="quick-chips care-suggestion-row">
        {(suggestions.length ? suggestions : fallbackSuggestions).map((suggestion) => (
          <button key={suggestion} className="chip care-chip" onClick={() => sendMessage(suggestion)} disabled={typing}>
            {suggestion}
          </button>
        ))}
      </div>

      {clinics.length > 0 && (
        <div className="nearby-section card-enter stagger-2">
          <div className="nearby-section-title">
            <MapPin size={16} color="var(--blue)" />
            Nearby Help
          </div>
          <div className="clinic-cards">
            {clinics.map((clinic, index) => (
              <div className="clinic-card" key={`${clinic.name}-${index}`}>
                <div className="clinic-icon">🏥</div>
                <div className="clinic-info">
                  <div className="clinic-name">{clinic.name}</div>
                  <div className="clinic-meta">
                    <Stars rating={clinic.rating} />
                    <span className="clinic-distance">📍 {clinic.distance_km} km</span>
                  </div>
                </div>
                <button className="clinic-dir-btn" onClick={() => window.open(clinic.maps_url, "_blank")}>
                  Directions
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="learn-section card-enter stagger-3">
        <div className="learn-section-title">
          <BookOpen size={16} color="var(--blue)" />
          Learn About Oral Health
        </div>
        <div className="learn-cards">
          {EDUCATION_CARDS.map((card) => (
            <button key={card.id} className="learn-card care-learn-card" onClick={() => setActiveEducationCard(card)}>
              <div className="learn-card-icon">{card.icon}</div>
              <div className="learn-card-title">{card.title}</div>
              <div className="learn-card-subtitle">{card.subtitle}</div>
              <div className="learn-card-text">
                {card.bullets.slice(0, 2).map((bullet) => (
                  <div key={bullet}>• {bullet}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeEducationCard && (
        <div className="image-modal-backdrop" onClick={() => setActiveEducationCard(null)}>
          <div className="education-modal" onClick={(event) => event.stopPropagation()}>
            <div className="education-modal-header">
              <div>
                <div className="education-modal-title">{activeEducationCard.title}</div>
                <div className="education-modal-subtitle">{activeEducationCard.subtitle}</div>
              </div>
              <button className="back-btn" onClick={() => setActiveEducationCard(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="education-modal-list">
              {activeEducationCard.bullets.map((bullet) => (
                <div key={bullet} className="education-modal-item">• {bullet}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

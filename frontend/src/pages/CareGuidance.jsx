import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Send, MapPin, Bot, Circle, BookOpen, X, ChevronLeft, MoreVertical, Paperclip, Shield, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
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

const EDUCATION_TOPICS = [
  {
    id: "early-signs",
    title: "Early Signs",
    category: "Awareness",
    summary: "Changes that should be watched and discussed with a dentist.",
    bullets: ["Persistent red or white patches", "Sores that do not heal", "Unusual lumps or thickening"],
  },
  {
    id: "risk-factors",
    title: "Risk Factors",
    category: "Prevention",
    summary: "Habits and exposures linked with higher oral health risk.",
    bullets: ["Tobacco use", "Excess alcohol", "HPV exposure"],
  },
  {
    id: "prevention",
    title: "Prevention",
    category: "Daily Care",
    summary: "Simple habits that reduce preventable oral health problems.",
    bullets: ["Avoid tobacco", "Limit alcohol", "Schedule regular dental checks"],
  },
  {
    id: "oral-hygiene",
    title: "Oral Hygiene",
    category: "Routine",
    summary: "Daily habits that support healthier teeth, gums, and mouth tissue.",
    bullets: ["Brush twice daily", "Clean your tongue", "Floss gently"],
  },
  {
    id: "tobacco-risks",
    title: "Tobacco Risks",
    category: "Risk Reduction",
    summary: "Why smoking and chewing tobacco need careful attention.",
    bullets: ["Irritates mouth tissue", "Raises long-term risk", "Can delay healing"],
  },
  {
    id: "visit-dentist",
    title: "When to Visit Dentist",
    category: "Action",
    summary: "Situations where professional review should not be delayed.",
    bullets: ["Symptoms last two weeks", "Pain or bleeding appears", "A patch changes quickly"],
  },
  {
    id: "self-exam",
    title: "Self Examination Guide",
    category: "Monitoring",
    summary: "A quick way to notice changes between regular dental visits.",
    bullets: ["Check lips and cheeks", "Look under the tongue", "Track visible changes"],
  },
];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = ".jpg,.jpeg,.png,.webp,.pdf,.txt";

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
  const [scanDetails, setScanDetails] = useState(null);
  const [scanBannerVisible, setScanBannerVisible] = useState(true);
  const [activeEducationCard, setActiveEducationCard] = useState(null);
  const [assistantMenuOpen, setAssistantMenuOpen] = useState(false);
  const [activeAssistantModal, setActiveAssistantModal] = useState(null);
  const [educationSheetOpen, setEducationSheetOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const chatRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasInitRef = useRef(false);

  const scanId = searchParams.get("scan_id") || null;
  const prompt = searchParams.get("prompt") || "";
  const fallbackSuggestions = useMemo(
    () => (scanId ? SCAN_SUGGESTIONS : GENERAL_SUGGESTIONS),
    [scanId],
  );

  useEffect(() => {
    setSuggestions(fallbackSuggestions);
  }, [fallbackSuggestions]);

  function initialAssistantMessage() {
    if (scanId) {
      return {
        role: "ai",
        text: `I'm here to help you understand your recent scan (${scanId.slice(0, 8)}...). Ask what it means, how serious it looks, or what to do next.`,
        time: timeNow(),
      };
    }

    return {
      role: "ai",
      text: "Ask me anything about your oral health or your scan results. I'll explain things clearly and suggest sensible next steps.",
      time: timeNow(),
    };
  }

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
        setScanDetails(report);
      })
      .catch(() => {
        if (active) {
          setScanRisk(null);
          setScanDetails(null);
        }
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
    if (prompt) setInput(prompt);
  }, [prompt]);

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

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  function formatFileSize(size) {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileExtension(name) {
    return name.split(".").pop()?.toLowerCase() || "";
  }

  function validateAttachment(file) {
    const extension = getFileExtension(file.name);
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf", "txt"];
    if (!allowedExtensions.includes(extension)) {
      return "Unsupported file type. Please attach JPG, PNG, WEBP, PDF, or TXT files.";
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return "File is too large. Please attach a file under 10 MB.";
    }

    return "";
  }

  function handleAttachmentSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const error = validateAttachment(file);
    if (error) {
      setAttachmentError(error);
      setAttachment(null);
      return;
    }

    const extension = getFileExtension(file.name);
    const isImage = ["jpg", "jpeg", "png", "webp"].includes(extension);
    setAttachmentError("");
    setAttachment({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      file,
      name: file.name,
      size: file.size,
      type: isImage ? "image" : extension,
      extension,
      previewUrl: isImage ? URL.createObjectURL(file) : null,
    });
  }

  async function buildMessageWithAttachment(message, selectedAttachment) {
    if (!selectedAttachment) return message;

    const lines = [
      message || "Please review the attached supporting file.",
      "",
      "Supporting attachment for this conversation:",
      `- Name: ${selectedAttachment.name}`,
      `- Type: ${selectedAttachment.extension.toUpperCase()}`,
      `- Size: ${formatFileSize(selectedAttachment.size)}`,
      `- Temporary reference: ${selectedAttachment.id}`,
    ];

    if (selectedAttachment.extension === "txt") {
      try {
        const text = await selectedAttachment.file.text();
        const excerpt = text.trim().slice(0, 1800);
        if (excerpt) {
          lines.push("- Text excerpt:");
          lines.push(excerpt);
        }
      } catch (_) {
        lines.push("- Text excerpt could not be read in the browser.");
      }
    }

    if (selectedAttachment.type === "image") {
      lines.push("- Note: The image is attached as supporting visual context; this chat upload is separate from the diagnostic scan flow.");
    }

    if (selectedAttachment.extension === "pdf") {
      lines.push("- Note: PDF parsing is not enabled yet, so only file metadata is available in this chat context.");
    }

    return lines.join("\n");
  }

  async function sendMessage(text) {
    const message = (text || input).trim();
    const selectedAttachment = attachment;
    if ((!message && !selectedAttachment) || typing) return;

    const visibleText = message || "Please review this supporting attachment.";
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: visibleText,
        time: timeNow(),
        attachment: selectedAttachment
          ? {
              name: selectedAttachment.name,
              size: selectedAttachment.size,
              type: selectedAttachment.type,
              extension: selectedAttachment.extension,
            }
          : null,
      },
    ]);
    setInput("");
    setAttachment(null);
    setAttachmentError("");
    setTyping(true);

    try {
      const payload = { message: await buildMessageWithAttachment(visibleText, selectedAttachment) };
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

  function resetVisibleConversation() {
    setMessages([initialAssistantMessage()]);
    setInput("");
    setTyping(false);
    setSuggestions(fallbackSuggestions);
  }

  function formatPercent(value) {
    if (typeof value !== "number") return "Not available";
    return `${Math.round(value * 100)}%`;
  }

  function formatScanTime(value) {
    if (!value) return "Not available";
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="app care-dark-page page-enter" onClick={() => assistantMenuOpen && setAssistantMenuOpen(false)}>
      <div className="page-header care-page-header">
        <button className="care-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ChevronLeft size={23} />
        </button>
        <h1 className="page-header-title">Care & Guidance</h1>
        <button className="header-avatar care-header-avatar" onClick={() => navigate("/profile")} aria-label="Open profile">
          👤
        </button>
      </div>

      <div className="chat-card care-chat-card card-enter stagger-1">
        <div className="chat-header care-chat-header">
          <div className="chat-header-avatar care-assistant-avatar">
            <Bot size={20} />
          </div>
          <div className="care-assistant-copy">
            <div className="chat-header-name">OralAI Assistant</div>
            <div className="care-chat-subtitle">Your Oral Health Assistant</div>
            <div className="chat-header-status">
              <Circle size={8} fill="#52C9A0" color="#52C9A0" className="care-online-dot" />
              Online
            </div>
          </div>
          <button
            className={`care-assistant-menu${assistantMenuOpen ? " active" : ""}`}
            aria-label="Assistant options"
            aria-expanded={assistantMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setAssistantMenuOpen((open) => !open);
            }}
          >
            <MoreVertical size={20} />
          </button>
          {assistantMenuOpen && (
            <div className="care-assistant-dropdown" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  resetVisibleConversation();
                  setAssistantMenuOpen(false);
                }}
              >
                <span>Clear Chat</span>
                <small>Clear visible messages</small>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAssistantModal("scan");
                  setAssistantMenuOpen(false);
                }}
              >
                <span>View Scan Context</span>
                <small>{scanId ? "Risk, confidence, and time" : "No active scan context"}</small>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetVisibleConversation();
                  setAssistantMenuOpen(false);
                }}
              >
                <span>Start New Conversation</span>
                <small>Reset this chat view</small>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAssistantModal("safety");
                  setAssistantMenuOpen(false);
                }}
              >
                <span>AI Safety Info</span>
                <small>How to use responses safely</small>
              </button>
            </div>
          )}
        </div>

        {scanId && scanBannerVisible && (
          <div className={`care-context-banner ${scanRisk ? riskClass(scanRisk) : "medium"}`}>
            <Shield size={22} className="care-context-icon" />
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
                {message.attachment && (
                  <div className="care-message-attachment">
                    {message.attachment.type === "image" ? <ImageIcon size={15} /> : <FileText size={15} />}
                    <span>{message.attachment.name}</span>
                  </div>
                )}
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

        {(attachment || attachmentError) && (
          <div className="care-attachment-preview-wrap">
            {attachment && (
              <div className="care-attachment-preview">
                <div className="care-attachment-thumb">
                  {attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt={attachment.name} loading="lazy" />
                  ) : (
                    <FileText size={22} />
                  )}
                </div>
                <div className="care-attachment-meta">
                  <strong>{attachment.name}</strong>
                  <span>{attachment.extension.toUpperCase()} • {formatFileSize(attachment.size)}</span>
                </div>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            {attachmentError && <div className="care-attachment-error">{attachmentError}</div>}
          </div>
        )}

        <div className="chat-input-bar care-chat-input-bar">
          <input
            ref={attachmentInputRef}
            type="file"
            className="care-attachment-input"
            accept={ACCEPTED_ATTACHMENT_TYPES}
            onChange={handleAttachmentSelect}
          />
          <button
            className="care-attach-btn"
            type="button"
            aria-label="Attach image, PDF, or text file"
            onClick={() => attachmentInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            className="chat-input care-chat-input"
            placeholder="Ask about your scan or oral health..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={typing}
          />
          <button className="chat-send care-chat-send" onClick={() => sendMessage()} disabled={typing || (!input.trim() && !attachment)}>
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
        <div className="care-learn-heading">
          <div className="learn-section-title">
            <BookOpen size={16} color="var(--blue)" />
            Learn About Oral Health
          </div>
          <button className="care-view-all" type="button" onClick={() => setEducationSheetOpen(true)}>View all</button>
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

      {educationSheetOpen && (
        <div className="image-modal-backdrop care-sheet-backdrop" onClick={() => setEducationSheetOpen(false)}>
          <div className="care-learn-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="care-sheet-handle" />
            <div className="care-sheet-header">
              <div>
                <div className="care-sheet-title">Learn About Oral Health</div>
                <div className="care-sheet-subtitle">Tap a topic to ask the assistant for a simple explanation.</div>
              </div>
              <button className="back-btn" onClick={() => setEducationSheetOpen(false)} aria-label="Close education sheet">
                <X size={16} />
              </button>
            </div>
            <div className="care-topic-grid">
              {EDUCATION_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className="care-topic-card"
                  onClick={() => {
                    setInput(`Explain ${topic.title.toLowerCase()} in simple words`);
                    setEducationSheetOpen(false);
                  }}
                >
                  <div className="care-topic-category">{topic.category}</div>
                  <div className="care-topic-title">{topic.title}</div>
                  <p>{topic.summary}</p>
                  <div className="care-topic-bullets">
                    {topic.bullets.slice(0, 2).map((bullet) => (
                      <span key={bullet}>{bullet}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAssistantModal && (
        <div className="image-modal-backdrop" onClick={() => setActiveAssistantModal(null)}>
          <div className="education-modal care-assistant-modal" onClick={(event) => event.stopPropagation()}>
            <div className="education-modal-header">
              <div>
                <div className="education-modal-title">
                  {activeAssistantModal === "scan" ? "Scan Context" : "AI Safety Info"}
                </div>
                <div className="education-modal-subtitle">
                  {activeAssistantModal === "scan" ? "Current context used by the assistant" : "Important medical guidance"}
                </div>
              </div>
              <button className="back-btn" onClick={() => setActiveAssistantModal(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {activeAssistantModal === "scan" ? (
              <div className="care-scan-context-list">
                <div><span>Scan ID</span><strong>{scanId ? scanId.slice(0, 8) : "No active scan"}</strong></div>
                <div><span>Risk Level</span><strong>{scanRisk || "Not available"}</strong></div>
                <div><span>Model Confidence</span><strong>{formatPercent(scanDetails?.confidence)}</strong></div>
                <div><span>Timestamp</span><strong>{formatScanTime(scanDetails?.timestamp)}</strong></div>
              </div>
            ) : (
              <p className="care-safety-copy">
                AI responses are informational only and should not replace professional medical advice.
              </p>
            )}
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

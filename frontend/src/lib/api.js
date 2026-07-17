import { supabase } from "./supabaseClient";
import { MOCK_RESPONSES, getMockReport } from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

/**
 * DEV MODE flag — when true, skips real API calls and returns mock data.
 * Set to false to use the real backend.
 */
const USE_MOCK = false;

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error("session-check-failed");
  }

  if (!session?.access_token) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error("missing-session");
    }

    return refreshedSession.access_token;
  }

  return session.access_token;
}

async function fetchWithToken(path, token, options = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

/**
 * Return mock data for a given API path.
 */
function getMock(path, options) {
  // Strip query string for route matching
  const cleanPath = path.split("?")[0];

  // Static routes
  if (MOCK_RESPONSES[cleanPath]) {
    return structuredClone(MOCK_RESPONSES[cleanPath]);
  }

  // /report/:id
  const reportMatch = cleanPath.match(/^\/report\/(.+)$/);
  if (reportMatch) {
    return getMockReport(reportMatch[1]);
  }

  // /predict (POST) — simulate small delay then return mock
  if (cleanPath === "/predict") {
    return structuredClone(MOCK_RESPONSES["/predict"]);
  }

  // /chat (POST) — local keyword-based AI mock
  if (cleanPath === "/chat") {
    const body = options?.body ? JSON.parse(options.body) : {};
    const msg = (body.message || "").toLowerCase();
    let reply = "That's a great question! Based on general oral health guidelines, I'd recommend maintaining regular dental check-ups and good hygiene habits. Would you like more specific advice?";

    if (msg.includes("ulcer"))
      reply = "Mouth ulcers are very common and usually heal within 7–14 days. Avoid spicy foods, rinse with salt water, and use over-the-counter gel for pain relief. If it doesn't heal in 3 weeks, see a dentist. 🦷";
    else if (msg.includes("serious"))
      reply = "Most oral symptoms are not serious, but watch for: patches lasting over 2 weeks, pain when swallowing, unexplained bleeding, or a lump in the neck. If you experience any of these, please consult a dentist promptly.";
    else if (msg.includes("early") || msg.includes("signs"))
      reply = "Early warning signs of oral issues include: persistent white or red patches, sores that don't heal, unusual lumps or swelling, and difficulty chewing or swallowing. Early detection is key — regular scans and dental visits help catch problems early! 🔍";
    else if (msg.includes("bleed") || msg.includes("gum"))
      reply = "Bleeding gums can indicate gingivitis, which is very treatable! Common causes include plaque buildup, brushing too hard, or vitamin deficiency. Improve your brushing technique, floss daily, and visit a dentist for a professional cleaning. 😊";
    else if (msg.includes("tooth") || msg.includes("pain") || msg.includes("ache"))
      reply = "Toothaches can range from mild sensitivity to severe pain. For immediate relief: rinse with warm salt water, use clove oil or OTC pain relievers. Avoid very hot/cold foods. If pain is severe or lasts more than 2 days, see a dentist.";
    else if (msg.includes("result") || msg.includes("scan") || msg.includes("risk"))
      reply = "Based on your latest scan, your risk level is Low with a Non-Cancer prediction. The 92% model confidence reflects model certainty, not the probability of disease. Continue your regular oral hygiene routine and schedule your next check-up in 6 months. Remember, AI screening supplements but does not replace professional medical diagnosis.";

    return { reply };
  }

  // Fallback
  return { mock: true, message: `No mock data for ${path}` };
}

export async function apiFetch(path, options = {}) {
  // ---------- MOCK MODE ----------
  if (USE_MOCK) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    return getMock(path, options);
  }

  // ---------- REAL MODE ----------
  let token = await getAccessToken();
  let response = await fetchWithToken(path, token, options);

  // Token may expire between app load and request. Refresh once and retry.
  if (response.status === 401) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (!refreshError && refreshedSession?.access_token) {
      token = refreshedSession.access_token;
      response = await fetchWithToken(path, token, options);
    }
  }

  if (!response.ok) {
    const fallback = { error: "Request failed." };
    let payload = fallback;

    try {
      payload = await response.json();
    } catch (_error) {
      payload = fallback;
    }

    const detail = payload?.detail ?? payload;
    const message =
      detail?.error ?? detail?.message ?? payload?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

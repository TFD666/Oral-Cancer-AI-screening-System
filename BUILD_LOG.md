# Build Log

## Session 1
- Created base monorepo structure: `backend/` and `frontend/`.
- Added backend FastAPI skeleton with:
  - Supabase admin configuration and auth dependency.
  - Route modules for auth, patients, predict, history, and report.
  - Inference pipeline scaffold for EfficientNet-B1/B2 ensemble logic.
  - Startup model loading that fails fast if model files are missing.
- Added frontend React+Vite skeleton with route map and placeholder pages.
- Added environment examples and initial SQL schema + RLS policies.

## Why this order
- Backend-first because your project's highest-risk complexity is medical inference + secure data access.
- Frontend scaffold second so pages can be implemented against stable API contracts.
- Grad-CAM full implementation intentionally deferred one step to keep startup stable first.

## Session 2
- Replaced the fake Grad-CAM placeholder with a real hook-based Grad-CAM implementation on EfficientNet-B1 `conv_head`.
- Kept Grad-CAM aligned with the ensemble's predicted class so the explanation follows the same decision path returned to the doctor.
- Fixed upload behavior so the original scan is stored with its true bytes and MIME type instead of PNG-converted content under the original filename.
- Updated `GET /report/{id}` to return signed URLs for stored files instead of raw storage paths.
- Stored the startup-selected device in application state so inference reuses the same execution target consistently.

## Why this order
- Explainability had to be made real before moving deeper into UI work, because a placeholder heatmap would create false trust in a clinical context.
- File integrity was fixed in the same pass because the original image is part of the audit trail, not just a display artifact.
- The report endpoint was updated alongside storage handling so historical records follow the same contract as fresh predictions.

## Session 3
- Added a real frontend entry shell instead of public-page placeholders: landing page, sign-in flow, request-access form, and a protected dashboard shell.
- Introduced a self-contained CSS system in `frontend/src/styles.css` because Tailwind was listed as a dependency but not actually wired into the current frontend entry path.
- Improved auth state handling in `ProtectedRoute` by subscribing to Supabase auth changes instead of checking session only once on mount.
- Added `VITE_API_BASE_URL` to the frontend environment example so request-access can target the backend explicitly.

## Why this order
- The frontend had reached the point where route names existed but user experience did not; turning routes into a real shell makes the next data wiring step much clearer.
- I used plain CSS first because relying on unwired Tailwind would create another fake layer of completion, similar to the earlier Grad-CAM placeholder problem on the backend.
- The dashboard remains intentionally data-light for now because the correct next step is wiring live API reads, not inventing static content that will be thrown away.

## Session 4
- Installed the backend runtime so the project can actually execute model-loading checks instead of only static inspection.
- Verified that both `.pth` files deserialize into plausible EfficientNet-style state dicts with expected key patterns.
- Found and fixed a startup path bug in `backend/app/main.py`: model weights were referenced as `backend/models/...`, which breaks when the server is launched from inside the `backend/` directory.

## Why this order
- Model loading is the base of the whole project, so it had to be tested before spending time on Supabase integration.
- The path bug is a classic environment-dependent failure: it hides during development if commands happen to be run from one directory and then surfaces later in deployment or handoff.

## Session 5
- Wired the provided Supabase project credentials into local backend and frontend `.env` files.
- Strengthened `backend/schema.sql` so it now includes `pgcrypto`, explicit insert/update/delete RLS policies, safer patient constraints, cascade behavior, and supporting indexes.
- Added `SUPABASE_SETUP.md` as the concrete setup checklist for tables, buckets, allowlist, Google OAuth, and redirect URLs.

## Why this order
- Once model loading was verified, the next priority was removing ambiguity from Supabase setup so the project is not blocked by dashboard-side guesswork.
- The SQL was tightened before execution because security and ownership rules are easiest to get right at schema time and harder to retrofit after data already exists.

## Session 6
- Added a shared authenticated frontend API helper so protected pages can call FastAPI with the Supabase access token consistently.
- Wired live backend data into `Dashboard`, `History`, `PatientList`, `PatientProfile`, and `Report`.
- Kept `NewScan` as an explicit next-step placeholder so the remaining missing workflow is visible instead of buried.

## Why this order
- Once Supabase was confirmed live, the next highest-value step was replacing protected-page placeholders with real doctor-scoped data reads.
- I introduced a shared API layer first because auth bugs multiply quickly if every page manages bearer tokens independently.

## Session 7
- Added `email-validator` to backend dependencies after a real startup smoke test exposed that `EmailStr` was used in schemas without its runtime validator package installed.

## Why this order
- This surfaced only when booting the app, which is the point: dependency truth lives in execution, not in static file structure.

## Session 8
- Implemented the actual `/scan` workflow on the frontend: existing-patient selection, inline patient creation, image preview, `/predict` submission, and live result rendering.
- Reused the shared authenticated API helper so scan submission follows the same token path as the other protected pages.
- Extended the CSS system with scan-specific layout, form, and result styles rather than leaving the page as a placeholder.

## Why this order
- The scan flow is the first feature that creates a complete clinical record chain, so it had to come after auth, patients, reports, and live backend connectivity were proven.
- Patient creation was kept inline because requiring users to leave the scan page would break the primary workflow the system is supposed to optimize.

## Session 9
- Fixed a real browser integration bug in backend CORS handling by allowing both `localhost:5173` and `127.0.0.1:5173` instead of a single hardcoded local origin.
- Switched CORS config from a single-origin string to a comma-separated origin list so local runtime URLs are less fragile.

## Why this order
- The failure surfaced only during the live scan workflow because that was the first path performing cross-origin authenticated writes from the browser.
- This is a good example of why runtime testing matters: build success and route wiring were both correct, but origin-level browser security still blocked the actual workflow.

## Session 10
- Changed backend auth verification to use a dedicated Supabase anon-key client for validating user bearer tokens, while keeping the service-role client for privileged operations.
- Added `SUPABASE_ANON_KEY` to backend configuration so auth verification and admin data access are no longer conflated.

## Why this order
- After CORS was fixed, the remaining failure was an auth-validation problem during real browser requests, which pointed at the backend token verification boundary rather than the frontend session state.

## Session 11
- Fixed the chat assistant model configuration after Groq rejected `llama3-8b-8192` as decommissioned.
- Added `GROQ_MODEL` to backend environment configuration and defaulted it to `llama-3.1-8b-instant`, which is available on the current Groq account.

## Why this order
- The browser showed a generic connection failure first because the backend was not running, but once the backend path was healthy the real AI-service failure was a decommissioned model name.
- Making the model configurable avoids repeating this same code edit when provider model names change again.

## Session 12
- Added Groq fallback model handling in the chat route so a single unavailable model no longer breaks the assistant immediately.
- Confirmed the patched backend was restarted and `/chat` CORS preflight returns `200`.

## Why this order
- The user still saw HTTP 502 after the first fix because the browser was talking to a long-running backend process started before the model change.
- Fallback models reduce provider-catalog fragility, which is important for a chat feature that depends on a third-party LLM API.

## Session 11
- **Verified the entire inference pipeline works end-to-end in isolation:** model loading → preprocessing → EfficientNet-B1/B2 ensemble → soft voting → Grad-CAM heatmap generation → structured result. All steps produce correct output.
- **Root-caused the "not responding" bug:** the predict endpoint was silently swallowing errors. When Supabase operations (auth verification, storage upload, DB insert) failed, the backend either returned a generic "Internal model inference error" or an unhandled 500 with no JSON body. The frontend's `apiFetch` then surfaced an unhelpful "Request failed" or "HTTP 500" message.
- **Added structured logging (`logging` module)** throughout the critical path: `main.py` (startup + device), `supabase_auth.py` (auth verification failures), `predict.py` (inference lifecycle, storage uploads, DB inserts), and `supabase_storage.py` (upload sizes, signed URL problems). Now every failure prints a full traceback to the backend console so you can see exactly what went wrong.
- **Added a global exception handler** in `main.py` so unhandled errors return `{"detail": {"error": "..."}}` JSON instead of raw HTML stack traces. This ensures the frontend's error extraction always finds a usable message.
- **Wrapped each stage of the predict endpoint in its own try/except:** inference, original image upload, heatmap upload, signed URL generation, and DB insert are now independent failure points with specific error messages instead of one giant catch-all.
- **Fixed storage path redundancy:** storage paths were `uploads/uuid_filename` inside bucket `uploads` (creating `uploads/uploads/uuid_filename`). Changed to just `uuid_filename` — the bucket name already identifies the container.

## Why this order
- The first priority was proving that the AI pipeline (the hardest-to-debug component) works. It did — the bug was never in the model code itself.
- Once inference was cleared, the remaining failure surface was Supabase I/O. Adding granular logging and try/except blocks is the only way to distinguish between "Supabase is unreachable," "bucket doesn't exist," "RLS blocked the insert," or "signed URL generation returned empty."
- The global exception handler was added because FastAPI's default HTML error page breaks the frontend's JSON error parser, turning real errors into silent "Request failed" messages.

## Session 12
- **Confirmed full pipeline works in production** from Session 11 backend logs: auth → patient creation → inference (1.9s) → storage upload (original 76KB + heatmap 84KB) → signed URLs → DB insert → 200 OK. No code changes needed for the core path.
- **Hardened all remaining routers** (`auth.py`, `patients.py`, `history.py`, `report.py`) with the same logging + granular try/except pattern applied to `predict.py` in Session 11. Every Supabase call now has its own error boundary and logs the traceback server-side.
- **Added input sanitization** (`app/sanitize.py`): a `clean_text()` utility that strips `<script>` tags, removes HTML markup, and collapses whitespace. Applied automatically via Pydantic `field_validator` in `schemas.py` to all user-facing text fields (`name`, `institution`, `reason`, `medical_history`).
- **Added string length constraints** to all schema fields (`min_length`, `max_length`) so excessively long inputs are rejected at the validation layer before reaching the database.
- **Enriched the history endpoint** to include `patient_name` in each row via a single batch query, eliminating the need for N+1 requests from any future frontend.
- **Ordered patient listings** by `created_at DESC` so the most recently created patients appear first.

## Why this order
- The predict pipeline was already proven working, so this session focused on defense-in-depth: making every other endpoint equally robust.
- Input sanitization was added at the Pydantic schema layer (not inside each router) because it applies uniformly to all routes that accept text, and it can't be accidentally skipped when adding new endpoints.
- History enrichment was done now because any future frontend (regardless of design) will need patient names next to predictions — baking it into the API avoids pushing that join logic into the UI.

## Session 13
- **Removed the system allowlist access restrictions:** The project scope transitioned from exclusively authorized medical professionals to an open model allowing full access to any user authenticated via Google OAuth. 
- Stripped `allowed_users` lookups and 403 rejections from `supabase_auth.py`, streamlining it to only rely on core JWT token verification.
- Dropped the unused POST `/auth/request-access` API along with its `AccessRequestIn` schema definition and removed `RequestAccess.jsx` and its routes from the frontend UI layers. Cleaned up remaining request-access links and legacy "authorized clinician only" texts in `SignIn.jsx` and `Landing.jsx`. 
- Overhauled `schema.sql` to explicitly eliminate the `allowed_users` and `access_requests` tables/indices, mirroring removals across the `SUPABASE_SETUP.md` guidelines.

## Why this order
- Since the authorization gating structure became completely nonfunctional weight, excising it across the DB schema mapping, authentication layers and UI paths cleanly was crucial so subsequent contributors wouldn't be misdirected trying to interface with obsolete request models.

## Session 14
- **Implemented implicit self-patient (Option A):** Each authenticated user now has exactly one "self" patient record, created transparently on their first scan. All scans link to this self-patient. The frontend no longer exposes any patient selection UI.
- **Created `backend/app/self_patient.py`:** A standalone utility module with `get_or_create_self_patient()` that looks up or auto-creates the self-patient row. It derives the display name from Google OAuth metadata (full_name) with a fallback to the email prefix.
- **Modified `POST /predict`:** Removed the mandatory `patient_id` Form field entirely. The endpoint now calls `get_or_create_self_patient()` internally, so the frontend only needs to send the image file. The `Form` import was replaced with the self-patient import.
- **Created `GET /dashboard`:** New aggregated endpoint (`backend/app/routers/dashboard.py`) that returns everything the Home Dashboard screen needs in one call: user info (name, email, initials), latest scan with signed image URLs, last 5 scans for the wave chart, total scan count, days since last scan, trend computation, and a rotating daily tip.
- **Enriched `GET /history`:** Now returns `{scans, trend}` instead of a flat array. Each scan row includes `scan_number` (sequential), `risk_score` (0-1 float for charts), and `insight_summary` (human-readable text). Removed the old patient-name enrichment since the UI is user-centric — there are no separate patients to label.
- **Extended `schema.sql`:** Added `user_preferences` table (display name, reminder/tip toggles) and `chat_messages` table (AI chat persistence with optional scan context). Added indexes and RLS policies for both. Renamed all RLS policies from "Doctors" to "Users" to match the new model, with `DROP POLICY IF EXISTS` guards for both old and new names.
- **Rewrote `frontend/src/pages/NewScan.jsx`:** Stripped all patient selection/creation UI (mode toggle, patient dropdown, inline patient form, `ensurePatientId()` function). The page is now a clean image-upload → submit → view-result flow. No `patient_id` is sent in the FormData.
- **Renamed API title:** `Oral Cancer Screening API` → `Oral Health Assistant API` in `main.py`.

## Why this order
- Self-patient is a foundational decision that every subsequent feature depends on. If scans still required `patient_id` from the client, the entire new UI would be blocked.
- The dashboard endpoint was created alongside self-patient because the home screen is the first thing users see and it needs aggregated data that previously didn't exist.
- History enrichment was done in the same pass because the new History page design expects computed fields (`scan_number`, `risk_score`, `trend`) that the old flat-array response didn't provide.
- Schema additions were bundled to avoid a second migration. `user_preferences` and `chat_messages` tables are needed for the Profile and Care pages — creating them now means those features have a stable schema to build against.
- Frontend was updated last because it depends on the backend contract change (no more `patient_id` in predict).

## Session 15 (Phase 4 — Frontend Rebuild)
- **Complete design system rewrite** (`styles.css`): Mobile-first CSS with Inter font, all component classes for Dashboard, Scan Detail, History, Care & Guidance, and Profile. Includes design tokens, color system, risk-level styling, toggle switches, typing animations, and responsive utilities. Old styles retained at bottom for backward compatibility.
- **New shared component `BottomNav.jsx`:** 5-tab bottom navigation (Home, Care, Scan FAB, History, Profile) with active dot indicators. Auto-hides on scan detail pages. Scan button is an elevated gradient FAB.
- **New `Dashboard.jsx`:** Calls `GET /dashboard`, renders greeting (time-of-day), health wave SVG chart with interactive dots, risk status pill, last scan summary card with findings/recommendation, Start Scan CTA, Daily Check/History mini-cards, conditional reminder card (≥3 days), and tip of the day.
- **New `ScanDetail.jsx`:** Reusable for fresh and historical scans. Shows result card (risk badge, shield icon, headline), original scan + AI heatmap side-by-side, what-this-means + what-to-do cards (checklists by risk level), action cards (Ask AI, Find Nearby Clinic, Download Report), disclaimer, and fixed bottom bar (Share, Scan Again).
- **New `History.jsx`:** Filter chips (All/Low/Medium/High), trend card (Improving/Stable/Declining), sort toggle, scan list cards with risk emojis/badges/confidence/insight, empty state, and bottom CTA.
- **New `CareGuidance.jsx`:** Chat UI with AI assistant (keyword-matching for now — ready for LLM backend in Phase 5), typing indicator, quick suggestion chips, learn-more education cards. Supports scan context via `?scan_id=` URL parameter from "Ask AI About This" action.
- **New `Profile.jsx`:** Profile card (avatar, name, email), health summary bar (current risk, last scan, total scans), settings sections (Account, Notifications with toggle switches, Data & Privacy, Support), and logout button. Pulls data from Supabase auth + dashboard API.
- **New `ScanUpload.jsx`:** Mobile-friendly scan page with tap-to-upload zone, image preview, analyzing spinner state, tips for best results. Navigates to `/scan/:id` on success.
- **Rewrote `App.jsx`:** Removed old top nav header, PatientList, PatientProfile, Report imports/routes. New routes: `/` (Dashboard), `/scan` (ScanUpload), `/scan/:id` (ScanDetail), `/history`, `/care`, `/profile`, `/signin`, `/landing`. Added `BottomNav` as always-visible sibling to `Routes`.
- **Updated `SignIn.jsx` and `Landing.jsx`:** Redesigned to match the new visual system with gradient backgrounds, feature cards, and OralAI branding.
- **Updated `ProtectedRoute.jsx`:** Changed loading text from "clinician session" to just "session".
- **Obsolete pages:** `PatientList.jsx`, `PatientProfile.jsx`, `Report.jsx`, and `NewScan.jsx` are no longer imported or routed. They remain on disk but are dead code.

## Why this order
- CSS design system was created first because every component depends on it.
- BottomNav was second because it's shared across all screens.
- Pages were built in UI priority order: Dashboard (first thing users see) → ScanDetail (core output) → History (list view) → Care (chat) → Profile (settings).
- App.jsx was last because it ties everything together and can't be tested until pages exist.

## Session 16
- **Fixed model-confidence interpretation in the chat assistant:** Chat context now sends `Prediction`, `Risk Level`, and `Model Confidence` with an explicit note that confidence is model certainty, not disease probability.
- **Strengthened the chat system prompt:** Added strict rules that confidence must never be interpreted as cancer likelihood and that explanations must prioritize risk level first, prediction second, confidence last.
- **Added deterministic contradiction protection:** If the LLM reply contradicts the scan prediction (`Cancer` described as non-cancerous, or `Non-Cancer` described as cancer detected), the backend replaces it with a safe deterministic explanation.
- **Improved scan-context security:** Specific scan context lookup now filters by both `id` and `created_by`, matching the user-scoped access pattern used elsewhere.
- **Added non-breaking `model_confidence` aliases** to prediction/report/history/dashboard API responses while keeping `confidence` for frontend compatibility during transition.
- **Updated visible UI wording** from generic "confidence" to "model confidence" where scan confidence is shown.
- **Added backend safety tests** covering confidence formatting, context ordering, prompt rules, contradiction detection, and fallback wording.

## Why this order
- The root bug was semantic: the LLM was receiving a technically correct but clinically ambiguous field name. Fixing the prompt alone would be fragile, so the context builder was corrected first.
- The deterministic contradiction guard was added because LLMs can still drift even with good prompts; safety-critical medical wording needs a code-level backstop.
- The API alias avoids a breaking migration while making the safer `model_confidence` name available for future frontend cleanup.

## Session 17
- **Root-caused a deeper contradiction in saved scan records:** some predictions were stored as `Non-Cancer` with `High` risk because `risk_level` was being derived from the model's top confidence score rather than the cancer-class score.
- **Introduced `app/clinical_logic.py`:** central source for `risk_from_cancer_score()`, `recommendation_for()`, and `normalize_prediction_record()`.
- **Fixed new inference behavior:** `backend/app/inference/pipeline.py` now calculates `risk_level` from the ensemble cancer score while keeping `confidence` as model certainty.
- **Normalized legacy rows at read-time:** `report.py`, `history.py`, `dashboard.py`, and `chat.py` now correct impossible old combinations like `Non-Cancer + High risk` before sending them to the UI or LLM.
- **Backfilled existing bad data in Supabase:** updated legacy `Non-Cancer` records with `High/Medium` risk to `Low` risk plus routine-monitoring recommendation so stored history matches the corrected logic.
- **Made the scan detail screen explicit:** the result card now shows the actual `Prediction` instead of only a risk badge, reducing the chance of user confusion.
- **Added backend tests** for the new clinical logic and normalization rules.

## Why this order
- This issue was not just an LLM wording problem; it was a clinical semantics bug in the saved data model. Fixing only the chat prompt would have hidden the symptom, not the cause.
- Read-time normalization was added alongside the inference fix because old rows already existed in the database and would otherwise keep producing contradictory screens until manually cleaned.

## Session 18
- **Refined the chat pipeline into the final memory/context/LLM flow:** guardrail -> query classifier -> intent detector -> memory retrieval -> context builder -> LLM -> response -> memory storage.
- **Separated memory correctly:** scan-linked chat now retrieves only messages for the same `scan_id`; general Care chat retrieves only messages where `scan_id` is null. Different scans are no longer mixed.
- **Kept scan context scan-aware only:** scan context is injected only when the request contains `scan_id`; general Care chat now relies on general memory instead of silently pulling the latest scan.
- **Added simple intent detection:** detects `explanation`, `seriousness`, `action`, `symptom`, and `general` with keyword logic and passes that intent into the LLM prompt.
- **Updated LLM parameters:** temperature `0.35`, max tokens `300`, top-p `0.9`.
- **Updated response contract:** `/chat` still returns `reply` and now also includes optional `suggestions` for follow-up chips.
- **Added memory pruning:** chat history is bounded to the newest 300 messages per user.
- **Updated frontend Care chips:** the Care page now uses backend-provided suggestions when available, falling back to the existing static chips.
- **Added tests:** coverage now verifies general vs scan memory separation, prompt ordering, intent detection, suggestions, repeated intent detection, and existing contradiction safety.

## Why this order
- Memory separation was the highest-risk part because mixing scan conversations can produce clinically wrong answers even when the LLM prompt is good.
- The response format was added as a non-breaking extension so existing frontend code that reads only `reply` continues to work.

## Session 19
- **Improved response quality controls:** The chat system prompt now asks for short 2-3 line paragraphs, softer clinical wording (`this suggests`, `it may indicate`), and less repetitive phrasing.
- **Strengthened intent-aware shaping:** The prompt now gives different emphasis for explanation, seriousness, action, and symptom intents so follow-up answers are less generic.
- **Improved memory usage guidance:** When prior messages exist, the LLM is told to reference the recent conversation naturally without repeating full earlier answers.
- **Expanded dynamic suggestions:** Suggestions now vary by intent, including action-specific prompts like `How urgent is this?` and `Can I wait before seeing a doctor?`.
- **Added `GET /scan-summary/{scan_id}`:** Uses the same scan context builder without chat memory and returns a concise scan explanation.
- **Added friendly LLM fallback handling:** Chat and scan-summary now return usable fallback text if the LLM provider fails instead of exposing a hard provider error to the user.
- **Added request logging:** Chat requests now log `user_id`, `scan_id`, `intent`, response time, and response length, including guardrail and out-of-scope returns.
- **Added tests** for summary prompt generation, dynamic suggestions, and friendly fallback messages.

## Why this order
- The response-quality changes were prompt-level and low-risk, so they were layered on top of the already-fixed memory separation and contradiction safeguards.
- The summary endpoint intentionally reuses scan context but skips memory, which keeps it deterministic and avoids accidental conversation bleed.

## Session 20
- **Refined the Home Dashboard UI without changing its data contract:** promoted the health overview into a clearer "Your Current Status" card, simplified the last-scan summary, made Start Scan the strongest CTA, added better quick actions, and clarified the wave chart timeline and scan-dot meaning.
- **Refined the Care & Guidance experience as a context-aware assistant:** upgraded the assistant identity, added a scan-context banner, improved chat spacing and typing state, switched the input copy to scan-aware language, cleaned error presentation, and made the learning cards actionable via in-app detail modals.
- **Refined the Result screen for trust and clarity:** separated result meaning from model confidence, explicitly explained that confidence is model certainty rather than disease probability, added tap-to-expand images and a compare mode, strengthened the action hierarchy, and tightened the disclaimer and bottom action bar.
- **Refined History into a health timeline:** added filter counts, stronger trend messaging, clearer scan summaries, per-scan AI entry points, and a more prominent bottom CTA while keeping the existing API shape.
- **Refined Profile & Settings into a more personal control center:** added a greeting-oriented hero card, clearer health summary labels, explanatory risk context, descriptive settings rows, and a delete-account confirmation modal.
- **Completed a coordinated CSS refinement pass** so spacing, hierarchy, animations, and interaction feedback stay consistent across all five screens instead of being implemented as isolated one-off tweaks.

## Why this order
- The page structure was updated before the styling because the root problem was information hierarchy, not decoration. If the order of meaning is wrong in the JSX, CSS can only mask it temporarily.
- The dashboard, result, history, care, and profile changes were handled together because they share the same design language and interaction vocabulary; doing them separately would have created visual drift and inconsistent behavioral cues.

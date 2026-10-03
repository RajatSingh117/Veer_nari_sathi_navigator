# PRD: Veer Nari Saathi — Backend & Integration

## 1. Overview
Web app that helps widows and families of fallen Indian soldiers discover the benefits they are entitled to, understand the paperwork, and get a ready-to-edit application letter. The frontend (Google Stitch export) already exists. Build the backend, wire it to the frontend, and deploy publicly.

Hard rules (hackathon constraints):
- GUIDANCE ONLY. Never declare someone "eligible" or "approved". Use "likely applicable", "check with the office". Every result and letter carries: "Draft/guidance only. Final decision is made by the concerned office."
- DUMMY DATA ONLY in demo. No real names/IDs. Show a banner: "Demo mode: use sample data."
- Must run on a public URL (no localhost). Free-tier only.
- AI must do real work: document reading, matching, drafting. Not rule-only.

## 2. Users
Primary: widows / next of kin of deceased service personnel, often elderly, low tech literacy, Hindi/Marathi/English.
Secondary: NGO volunteers or Zila Sainik Welfare helpers assisting families.

## 3. Core user flow
1. Landing -> choose language (EN/HI/MR)
2. 5 guided questions (answers stored in session)
3. Upload documents (service record, death certificate, ID proof) as image/PDF
4. AI extracts fields -> user reviews/edits extracted table
5. Matching engine returns benefit cards with status, documents needed, office
6. Benefit detail: step-by-step path + AI-drafted letter (edit, download PDF)
7. Checklist/tracker with optional reminder dates
8. Read-aloud available on every screen

## 4. Functional requirements
FR1 Session: anonymous session id; no login. Data auto-expires (24h).
FR2 Questionnaire: persist answers: relationship, branch, cause/year of death, state, number of dependent children.
FR3 Document intake: accept JPG/PNG/PDF up to 8 MB; store temporarily; send to Gemini vision for extraction.
FR4 Extraction: return structured JSON (name, service number, rank, unit, date of death, cause category, dependents, issuing authority) with per-field confidence. Low confidence (<0.7) fields flagged for user confirmation. User edits override AI values.
FR5 Matching: combine questionnaire + confirmed fields + knowledge base (Section 6). Gemini selects applicable entitlements and explains why, grounded ONLY in the KB. Output per benefit: id, title, plain-language explanation, status (ready / missing_docs), missing documents, office to visit, steps, source_url.
FR6 Letter drafting: Gemini drafts an application letter per benefit in the user's language using confirmed fields. Editable in UI; export PDF.
FR7 Translation/read-aloud: all AI outputs in EN/HI/MR; read-aloud via browser SpeechSynthesis (fallback: Gemini TTS if time).
FR8 Checklist: user can tick documents/steps, set a reminder date; reminders shown in-app (email/Telegram optional stretch).
FR9 Safety layer: post-process every AI output; strip any "you are eligible/approved/rejected" language; append the disclaimer; refuse to give legal/medical decisions.
FR10 Error handling: Gemini timeout/quota -> friendly retry message; unreadable document -> ask for re-upload with tips.

## 5. API endpoints
POST /api/session                  -> {sessionId}
POST /api/answers                  {sessionId, answers}
POST /api/documents/upload         multipart, returns {docId}
POST /api/documents/extract        {docId} -> extracted fields JSON + confidence
PUT  /api/fields                   {sessionId, confirmedFields}
POST /api/match                    {sessionId} -> benefits[]
POST /api/letter                   {sessionId, benefitId, language} -> {letterText}
POST /api/letter/pdf               {letterText} -> PDF
GET  /api/checklist/:sessionId
PUT  /api/checklist/:sessionId     {items, reminderDates}
GET  /api/health

## 6. Entitlement knowledge base (grounding data)
File: /data/entitlements.json. Schema:
{ id, title, summary_en/hi/mr, applies_when (conditions), documents_required[], office, steps[], source_url, last_verified }
Seed with these categories (I will verify exact rules/links from official sources before demo; leave TODO markers, do NOT invent figures):
- Family pension (ordinary / liberalised, depending on cause of death)
- ECHS health card for dependents
- Children's education support (e.g., PM Scholarship Scheme for wards)
- State welfare benefits (start with Maharashtra)
- Ex-gratia / one-time grants
The matcher must cite only entries from this file. If nothing matches, say so and suggest contacting the Zila Sainik Welfare Office.

## 7. AI pipeline & prompts
Model: newest Gemini Flash (pick from dropdown; do not hardcode an old name; make model name an env var).
Step A Extraction: vision prompt, strict JSON output, temperature 0.
Step B Matching: input = answers + fields + KB; output strict JSON; instruction "use only the provided KB; never state eligibility as final".
Step C Letter: input = benefit + fields + language; formal Indian government-letter format, placeholders for missing info.
Use JSON-schema / structured output; validate with zod; retry once on invalid JSON.
Cache AI results per session to protect free-tier quota.

## 8. Tech stack
- Next.js (App Router) + API routes, TypeScript. Integrate the Stitch HTML/Tailwind export as components; do not redesign UI.
- Gemini API (key via env GEMINI_API_KEY)
- Storage: Supabase (free tier: Postgres + storage bucket) OR in-memory/SQLite fallback if setup slows us down
- PDF: pdf-lib or @react-pdf/renderer (Devanagari font support required: Noto Sans Devanagari)
- Deploy: Vercel (public URL), env vars configured

## 9. Non-functional
- Mobile-first, works on low-end phones; page load < 3s
- Devanagari renders correctly everywhere including PDF
- No PII logged; uploads deleted after session expiry
- Rate-limit endpoints; basic input validation
- Accessibility: large text, keyboard navigable, ARIA labels

## 10. Acceptance criteria
- AC1: Upload a dummy service record image -> fields extracted and editable in <15s
- AC2: Dummy profile yields >=3 benefit cards, each grounded in KB with source_url
- AC3: Letter generated in Hindi and Marathi, renders properly, downloads as PDF
- AC4: No output contains final eligibility/approval language; disclaimer present everywhere
- AC5: Full flow works end to end on the deployed URL from a different network
- AC6: Seeded demo mode with one-click sample documents (dummy) for the video

## 11. Build order
1. Scaffold Next.js, import Stitch frontend, deploy a hello-world to Vercel
2. Session + questionnaire + KB JSON
3. Upload + Gemini extraction + edit table
4. Matching + benefit cards
5. Letter + PDF (Devanagari)
6. Checklist/reminders, read-aloud, safety post-processor
7. Demo mode with dummy sample docs, error states, polish

## 12. Out of scope
Login/accounts, real government API integration, payments, final eligibility decisions, native app.
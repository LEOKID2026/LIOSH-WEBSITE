# Security Data Inventory

**Generated:** 2026-05-23
**Companion to:** [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md)

Goal: enumerate every data class the product handles, classify sensitivity, identify where it lives, who can access it, and what retention applies.

## Sensitivity tiers

- **S1 — child PII / credentials.** Identifies a minor or grants access to their account.
- **S2 — child learning data.** Activity, answers, mastery, diagnostic results, parent-report content.
- **S3 — parent PII / credentials.** Identifies a parent or grants admin access over a child.
- **S4 — operational telemetry.** Logs, screenshots, internal QA artifacts.
- **S5 — public / non-sensitive.** Marketing pages, gallery, public games.

## Inventory

| Class | Tier | Where (storage) | Where (transit) | Producers | Consumers | Retention | Notes |
|-------|------|-----------------|-----------------|-----------|-----------|-----------|-------|
| Student `username`, `display_name`, `grade` | S1 | Supabase `learning_*` tables | parent + student API responses | parent at create-time | parent dashboard, student login | for product lifetime; deletable via parent | linked to register row R-OWN-01/02 |
| Student access PIN (4-digit) | S1 | hashed in Supabase | created via `/api/parent/create-student-access-code` | parent | student login | rotation possible by parent | brute-force surface — see R-AUTH-01 |
| Student session cookie | S1 | browser cookie | `/api/student/*`, `/api/learning/*`, `/api/arcade/*` | `/api/student/login` | server identity check | session lifetime (TBD per R-AUTH-04) | flags audit pending — R-COOKIE-01 |
| Parent email + password (Supabase auth) | S3 | Supabase auth | parent login flow | parent at signup | parent bearer token issuance | for account lifetime | not directly exposed to API code; managed by Supabase auth |
| Parent bearer token | S3 | client storage (Supabase session) | `Authorization: Bearer …` to `/api/parent/*` | Supabase auth | parent API auth | session lifetime | storage flags pending — R-COOKIE-01 |
| Parent ↔ student linkage | S3 | Supabase `learning_*` (parent_id FK) | parent dashboard, copilot-turn | parent on create-student | every parent API + ownership filter | for account lifetime | one missing filter → cross-tenant leak (R-RLS-01) |
| Learning sessions (`session_start`/`session_finish`) | S2 | Supabase `learning_sessions` (or equivalent) | `/api/learning/session/*` | student in product | parent report, diagnostic engine | indefinite (product feature) | aggregated into parent reports |
| Per-question answers + correctness | S2 | Supabase | `/api/learning/answer` | student | diagnostic engine, parent report | indefinite | sensitive: reveals child performance |
| Diagnostic results / mastery state | S2 | Supabase | parent report API | engine | parent dashboard, copilot | indefinite | drives Copilot grounding |
| Parent reports (short + detailed) | S2 | computed on read; PDFs may be exported client-side | `/api/parent/students/[studentId]/report-data`; PDF via `html2pdf.js` / `jspdf` | engine | parent | not server-stored unless artifact captured | nightly snapshots stored under `reports/` (S4) |
| Parent Copilot turn logs (server-side) | S2/S4 | server logs (telemetry path TBD) | `/api/parent/copilot-turn` | server | observability | retention TBD — R-LOG-02 | grounded LLM mode may include child summary |
| Hebrew nakdan / TTS payloads | S5 (text only) → may include child-typed text if route called from learning UI | server cache | `/api/hebrew-nakdan`, `/api/hebrew-audio-*` | client | external TTS / nakdan | cache TTL TBD | abuse / cost — R-RATE-01 |
| Arcade balances + room state | S2 | Supabase + ephemeral | `/api/arcade/*` | student actions | arcade engine | indefinite | service-role usage — R-RLS-01 |
| Engine review pack (admin) | S2/S4 | server-generated artifact | `/api/learning-simulator/*` | admin token holder | dev/owner only | local artifact | privileged; R-AUTH-02/03 |
| Nightly QA reports + screenshots | S2 (contain child names + activity) + S4 | `reports/virtual-student-daily/<date>/` (gitignored) | local + CI runner only | nightly Playwright runner | owner / dev | retention undefined — R-LOG-01 | screenshots include UI text in Hebrew |
| Adaptive planner artifacts | S4 | local filesystem | dev tools | dev | dev | as needed | not user-facing |
| Public site forms (`/contact`) | S3 | TBD (where do submissions land?) | `/contact` page → API TBD | site visitor | site owner | TBD — R-PUB-01 | spam / PII overshare risk |
| Gallery images | S5 | static assets / `/api/gallery` | `/api/gallery` | repo | public | static | not user-uploaded |

## Data flows worth highlighting

- **Parent → student creation:** parent supplies child name + grade → server creates `learning_*` row + access PIN. The child's identifier flows back into parent-only views.
- **Student → learning session:** student session cookie → `session/start` → `answer` (write) → `session/finish` → row in Supabase. Service-role used server-side; ownership currently enforced in application code (R-RLS-01).
- **Parent → report:** parent bearer → `/api/parent/students/[studentId]/report-data` → server filters by parent ownership → returns child summary. Cross-parent leak surface = R-OWN-01.
- **Parent → Copilot:** parent bearer (or student session) → `/api/parent/copilot-turn` → in production, server rebuilds snapshot from Supabase (HTTP 422 if not implemented for current path) → returns grounded reply. Trust invariant = R-COPILOT-01/02.
- **Child → solo games (`/student/solo-games/*`, `/student/games/*`):** mostly client-side; do not write child-PII to external services.

## Retention targets (proposed; owner approval needed)

| Tier | Default retention | Deletion path |
|------|-------------------|---------------|
| S1 — credentials, PIN | for account lifetime; PIN rotatable; account deletable by parent | parent UI: `/api/parent/delete-student` (verify cascading delete) |
| S2 — learning data | aligned with account lifetime; if account deleted, child learning data must follow | requires explicit confirmation that delete-student cascades |
| S3 — parent identity | Supabase auth lifecycle | Supabase delete-user API |
| S4 — local artifacts | rolling N days (e.g. 30); never committed to git | retention script TBD per R-LOG-01 |
| S5 — public | n/a | n/a |

## Linked register rows

R-AUTH-01..04 (auth + session), R-RLS-01..02 (storage scoping), R-OWN-01..02 (ownership), R-COOKIE-01 (cookie flags), R-LOG-01..02 (artifact + log retention), R-PRIV-01 (child-data legal posture), R-RATE-01 (abuse on Hebrew utility surface).

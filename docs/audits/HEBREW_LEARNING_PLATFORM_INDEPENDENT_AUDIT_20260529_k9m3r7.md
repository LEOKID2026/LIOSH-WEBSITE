# Hebrew Learning Platform — Independent Full-System Audit

**Audit date:** 2026-05-29  
**Auditor mode:** Read-only (no code changes, no commits, no destructive operations)  
**Scope:** Learning platform only (parent, student, teacher, school, guardian, reports, activities, exports, curriculum surfaces)  
**Out of scope:** Games, coins/economy, crypto, visual/game routes unrelated to learning, `.env` file presence as a standalone blocker  

---

## A. Executive Summary

### Overall readiness: **YELLOW**

The platform has a mature, service-role-centric architecture with strong per-route authorization, frozen activity question integrity, and recent report-engine hardening that appears to hold in code and unit tests. Core learning flows (student session, parent report API, teacher/school reports, classroom activities, enriched Excel export) are structurally sound.

Remaining risks cluster around: (1) **product truth / dual narrative engines** on parent UI, (2) **security hardening gaps** (CSV formula injection, unauthenticated utility APIs, staging admin gates, 4-digit PIN entropy), (3) **policy asymmetry** for private-teacher subject grants on non-discussion activities, (4) **performance** (heavy client bundles on report/export pages), and (5) **validation gaps** where SIM/stub data still dominates export QA rather than real full-text activities.

### Top 10 risks

| # | Risk | Severity |
|---|------|----------|
| 1 | Parent UI runs a second client diagnostic engine alongside server `parentFacing`, risking contradictory narratives on thin data | HIGH (product truth) |
| 2 | Teacher vs parent numeric divergence (classroom activity included in teacher/school reports but not parent API) can confuse stakeholders if undocumented | HIGH (product truth) |
| 3 | CSV export lacks formula-injection neutralization; student answer text can reach teacher CSV/Excel cells | MEDIUM–HIGH (security) |
| 4 | Private teachers bypass `private_teacher_subjects` on non-discussion activity create/report paths | MEDIUM (authorization policy) |
| 5 | Unauthenticated Hebrew TTS/nakdan/health utility APIs (cost, reconnaissance) | MEDIUM (security/abuse) |
| 6 | `engine-review-pack-status` API requires admin token only in production; staging may expose artifacts with public flag alone | HIGH (non-prod/staging) |
| 7 | Teacher activity report page bundles `xlsx-js-style` (~325 kB page JS); parent report ~680 kB with html2pdf path | MEDIUM (performance) |
| 8 | Class report per-student summaries are full-subject while cohort rollups are subject-scoped — misleading for school math teachers | MEDIUM (product truth) |
| 9 | Enriched Excel export validated heavily on SIM-shaped `question_set`; real activity with full stems/options still needs manual sign-off | MEDIUM (validation gap) |
| 10 | 4-digit student PIN + in-memory rate limits on serverless | MEDIUM (auth abuse) |

### Launch-blocking items (real users / broad QA)

| Item | Severity | Notes |
|------|----------|-------|
| Parent dual-engine narrative conflict on thin/zero data | HIGH | Product correctness before parent-facing launch |
| CSV formula injection on legacy CSV export | MEDIUM–HIGH | Easy exploit when teacher opens CSV in Excel |
| Private-teacher subject grant gap (if product requires parity) | MEDIUM | Policy decision + code alignment |
| Staging `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` without token | HIGH | Only if staging is network-exposed |
| Real non-SIM activity export sign-off | MEDIUM | QA gap, not necessarily code bug |

### Areas that look solid

- Per-route API guards (`requireTeacherApiContext`, `requireSchoolManagerApiContext`, `requireGuardianApiContext`, student cookie session)
- IDOR mitigations on report/activity paths via ownership helpers
- Classroom activity freeze-at-create + validate-at-activate + server-side scoring
- Discussion excluded from class diagnostic rollups (`.neq("mode", "discussion")`)
- Teacher activity PDF v1 correctly disabled and not imported in production pages
- Enriched Excel export: 7 sheets, RTL, Hebrew labels, X/N correctness, no AI recommendations (171/171 selftest pass)
- Recent fixes verified in code: parent preview truth source, V2 thin-data guard, subject-permission reconciliation
- Core learning tables RLS enabled; anon client returns zero rows (verified live)
- Parent copilot: server-side payload rebuild in production; LLM keys server-only
- Cross-school class scope checks via `loadSchoolClassInScope`

---

## B. Scope Covered

### Routes (learning-related, sampled + build manifest)

**Parent:** `/parent/login`, `/parent/dashboard`, `/parent/child-report`, `/parent/school-inbox`, `/learning/parent-report`, `/learning/parent-report-detailed`  
**Student:** `/student/login`, `/student/home`, `/student/activity/[activityId]`, `/student/worksheet/[worksheetId]`, `/learning/*-master` (6 subjects)  
**Teacher:** `/teacher/login`, `/teacher/dashboard`, `/teacher/class/[classId]`, activities/discussion/worksheets flows, `/teacher/student/[studentId]`, `/teacher/students/activities/*`  
**School:** `/school/dashboard`, `/school/classes`, `/school/students`, `/school/teachers`, `/school/messages`  
**Guardian:** `/guardian/login`, `/guardian/view`  
**Dev (noted, not launch surfaces):** `/learning/dev-db-report-preview`, `/learning/dev/engine-review`, `/learning/dev-student-simulator`

### APIs (categories audited)

- `pages/api/parent/*` — report-data, copilot-turn, list/create/update students, mini-report (guardian)
- `pages/api/student/*` — login, activities, learning session/answer, worksheets
- `pages/api/teacher/*` — activities, report, report-export, student reports, classes, worksheets, discussion
- `pages/api/school/*` — students report-data, classes browse-status, messages, account management
- `pages/api/guardian/*` — login, me, report-data, school-messages
- Utility: `hebrew-nakdan`, `hebrew-audio-*`, `learning-supabase/health`, `learning-simulator/*`

### Key files

| Area | Primary files |
|------|----------------|
| Auth | `lib/teacher-server/teacher-request.server.js`, `lib/learning-supabase/student-auth.js`, `lib/guardian-server/guardian-session.server.js`, `lib/school-server/school-request.server.js` |
| Reports | `lib/parent-server/report-data-aggregate.server.js`, `lib/teacher-server/teacher-report.server.js`, `lib/teacher-server/teacher-guidance-v2.server.js`, `lib/school-server/school-subjects.server.js` |
| Activities | `lib/teacher-server/teacher-activities.server.js`, `lib/classroom-activities/classroom-activities-shared.server.js` |
| Export | `lib/teacher-portal/teacher-activity-report-export.js`, `pages/api/teacher/activities/[activityId]/report-export.js` |
| RLS | `supabase/migrations/001_learning_core_foundation.sql`, `020_teacher_portal_rls.sql`, `024_classroom_activities.sql`, `026_student_activities.sql` |

### Commands run

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** (exit 0, ~61s) |
| `npm run test:activity-report-export` | **PASS** (171/171) |
| `npm run test:no-positive-conclusion-decisioning` | **PASS** |
| `node scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **PASS** |
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** |
| `node scripts/tests/student-activities-unit.mjs` | **PASS** |
| `node scripts/tests/teacher-class-report-aggregation-unit.mjs` | **PASS** |
| `node scripts/tests/school-portal-cache-unit.mjs` | **PASS** |
| `node scripts/tests/diagnostic-report-bundle-self-check.mjs` | **PASS** |
| `node scripts/tests/hebrew-activity-title-unit.mjs` | **PASS** |
| `node scripts/tests/teacher-dashboard-roster-unit.mjs` | **PASS** |
| `node scripts/verify-learning-rls.mjs --anon-only` | **PASS** (anon zero rows on private tables) |

### Commands skipped (reason)

| Command | Reason |
|---------|--------|
| `node scripts/tests/student-report-flow-regression.mjs` | Requires `NEXT_PUBLIC_LEARNING_SUPABASE_URL` at runtime (not loaded in audit shell) |
| `node scripts/tests/verify-teacher-report-subject-reconciliation.mjs` | Same env dependency |
| `node scripts/tests/demo-school-*-regression.mjs` | Same env dependency |
| `npm run verify:learning-rls` (full mode) | Creates/deletes auth users; skipped to avoid mutating remote data |
| `npm run test:e2e:teacher-activities` | Requires `.env.local` + Playwright runtime; not executed in this audit |
| `npm run qa:school:daily` | Mutating sim script; explicitly out of scope |
| Browser manual UI QA | Not executed; UI findings from static code + build bundle analysis |

---

## C. Findings by Severity

### BLOCKER

*No confirmed BLOCKER found that would prevent a controlled demo with known QA accounts*, assuming staging admin flags are off and users understand teacher vs parent report scope. Items below are launch blockers for **broad real-user rollout**, not internal demo.

---

### HIGH

#### H-001 — Parent UI dual diagnostic authority

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **Area** | Report engine truth / parent-facing safety |
| **Files/routes** | `pages/learning/parent-report.js`, `pages/learning/parent-report-detailed.js`, `lib/learning-supabase/parent-dashboard-report-bridge.js`, `utils/parent-report-v2.js`, `utils/detailed-parent-report.js`, `pages/api/parent/students/[studentId]/report-data.js` |
| **What was checked** | Data flow from API → client regeneration vs server `parentFacing` |
| **Evidence** | Parent page imports `generateParentReportV2`, `generateDetailedParentReport`, and calls `runParentReportGenerationFromApiBody` after fetching API. Server also builds `parentFacing` via `enrichPayloadWithParentFacing`. |
| **Why it matters** | Two engines with different thresholds can show conflicting insights/recommendations for the same child. |
| **User/product impact** | Parents may see “professional certainty” from client cards while server blocks recommendations — or vice versa. |
| **Security/privacy** | Low direct security impact; high trust impact. |
| **Reproduction** | Load parent report with 1–4 answers in a subject; compare server `parentFacing.insights` (network tab) vs rendered diagnostic cards. |
| **Suggested fix** | Choose single authority (server-only narratives for launch, or clearly label layers); align thin-data gates. |
| **Status** | **Confirmed** |

#### H-002 — Teacher/school reports include classroom activity; parent API does not

| Field | Detail |
|-------|--------|
| **Severity** | HIGH (product truth, intentional boundary) |
| **Area** | Report consistency |
| **Files** | `lib/teacher-server/teacher-report.server.js` (`buildTeacherStudentReportPayload` merges classroom; `buildTeacherParentReportPreviewPayload` does not), `pages/api/parent/students/[studentId]/report-data.js` |
| **Evidence** | Teacher path calls `mergeClassroomActivityRollupIntoReportPayload`; parent API uses `aggregateParentReportPayload` only. Documented in `docs/diagnostics/DIAGNOSTIC_REPORT_TRUTH_FIX_CLOSURE.md`. |
| **Why it matters** | Teachers comparing “what parent sees” vs their dashboard may see different totals unless preview route is used. |
| **Impact** | Support confusion; perceived “bug” if undocumented. |
| **Suggested fix** | Product copy on teacher preview; ensure teachers use `/api/teacher/students/:id/parent-report-data` for parity checks. |
| **Status** | **Confirmed intentional** — document for launch |

#### H-003 — Engine review admin API weak in non-production

| Field | Detail |
|-------|--------|
| **Severity** | HIGH (staging/deployments) |
| **Area** | Auth / security |
| **Files** | `pages/api/learning-simulator/engine-review-pack-status.js` |
| **Evidence** | Token check gated behind `isProductionRuntime()`; non-prod only checks `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN === "true"`. |
| **Why it matters** | Staging with flag enabled exposes internal engine review artifacts without secret. |
| **Impact** | Information disclosure of diagnostic internals. |
| **Suggested fix** | Require `ENGINE_REVIEW_ADMIN_TOKEN` in all deployed environments. |
| **Status** | **Confirmed** |

#### H-004 — Parent report ships html2pdf export (separate from teacher PDF v1)

| Field | Detail |
|-------|--------|
| **Severity** | HIGH (scope clarification — parent PDF exists) |
| **Area** | PDF status |
| **Files** | `pages/learning/parent-report.js` (imports `exportReportToPDF` from `utils/math-report-generator.js`), button “🖨️ הדפס / 📄 ייצא ל-PDF” ~line 4129 |
| **Evidence** | `math-report-generator.js` dynamically imports `html2pdf.js`. Build: `/learning/parent-report` **680 kB** First Load JS. |
| **Why it matters** | Audit scope item 8 asked to verify teacher PDF v1 not shipping; parent PDF is a **separate approved path** using html2pdf, not jsPDF v1. |
| **Impact** | Large bundle; print/PDF UX depends on browser. Not a teacher-activity PDF v1 leak. |
| **Suggested fix** | Confirm product approval for parent PDF; lazy-load html2pdf on button click only. |
| **Status** | **Confirmed** — needs manual product sign-off |

---

### MEDIUM

#### M-001 — CSV formula injection not neutralized

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM–HIGH |
| **Area** | Export security |
| **Files** | `lib/teacher-portal/teacher-activity-report-export.js` — `csvEscapeCell()` |
| **Evidence** | Escapes `"`, `,`, newlines only; no prefix neutralization for `=`, `+`, `-`, `@`, `\t`. Enriched sheet 4 includes raw `selectedAnswer` text. |
| **Why it matters** | Excel/LibreOffice can execute formulas when opening CSV. |
| **Impact** | Teacher workstation compromise if malicious student enters `=cmd|' /C calc'!A0` style answer. |
| **Reproduction** | Create activity; student submits answer starting with `=`; export CSV; open in Excel. |
| **Suggested fix** | Prefix risky cells with `'` or tab; set XLSX cell type string explicitly. |
| **Status** | **Confirmed** |

#### M-002 — Private teacher subject grants not enforced on regular activities

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Authorization / private teacher portal |
| **Files** | `lib/school-server/school-subjects.server.js` — `assertSchoolTeacherSubjectAllowed` returns `{ ok: true }` when no school membership; `assertDiscussionActivitySubjectAllowed` correctly calls `assertPrivateTeacherSubjectAllowed` |
| **Evidence** | Discussion create uses private grant check; regular activity create/report uses school assert only. |
| **Why it matters** | If product intent is `private_teacher_subjects` gates all subjects, private teachers can create any subject activity. |
| **Impact** | Unauthorized subject activities/reports for private teachers without grants. |
| **Suggested fix** | Route non-discussion creates through `assertPrivateTeacherSubjectAllowed` when no school membership. |
| **Status** | **Confirmed** — policy-dependent |

#### M-003 — Class report: full student summary vs subject-scoped cohort

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Report engine truth |
| **Files** | `lib/teacher-server/teacher-class-report.server.js` |
| **Evidence** | `studentSummaries` use full payload summary; `aggregateClassReportFromStudentPayloads` rolls up `scopeSubjects` only. |
| **Impact** | Math teacher sees English home-practice totals in per-student roster cards while class cohort stats are math-only. |
| **Suggested fix** | Scope per-student summary to class `subject_focus` or label UI explicitly. |
| **Status** | **Confirmed** |

#### M-004 — Teacher activity report page bundle bloat

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Performance |
| **Files** | `pages/teacher/class/[classId]/activities/[activityId]/report.js` imports `teacher-activity-report-export.js` which imports `xlsx-js-style` |
| **Evidence** | Build output: page **325 kB**, total **501 kB** First Load JS for report route. |
| **Impact** | Slow first load on mobile/school networks; memory on export. |
| **Suggested fix** | Dynamic `import()` xlsx builder only on Excel button click. |
| **Status** | **Confirmed** |

#### M-005 — Unauthenticated Hebrew utility APIs

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Security / abuse |
| **Files** | `pages/api/hebrew-nakdan.js`, `hebrew-audio-ensure.js`, `hebrew-audio-stream.js`, `hebrew-audio-artifact.js` |
| **Evidence** | Rate limit only; no auth. |
| **Impact** | TTS cost abuse; nakdan compute abuse. |
| **Suggested fix** | Require student/teacher session or stricter quotas + CAPTCHA on public routes. |
| **Status** | **Confirmed** |

#### M-006 — `learning-supabase/health` unauthenticated table probe

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Security |
| **Files** | `pages/api/learning-supabase/health.js` |
| **Evidence** | Uses anon client to probe 13 table names; non-prod may expose `DEV_PROJECT_HOST`. |
| **Impact** | Reconnaissance; schema existence leak. |
| **Suggested fix** | Auth gate or remove from production routing. |
| **Status** | **Confirmed** |

#### M-007 — Parent APIs lack explicit `role === "parent"` claim

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM (defense-in-depth) |
| **Area** | Auth |
| **Files** | `lib/parent-server/policy-acceptance.server.js` — `resolveAuthenticatedParentUserId` |
| **Evidence** | Any valid Supabase JWT works; data scoped by `parent_id` only. |
| **Impact** | Teacher JWT could call parent APIs but typically sees empty data. |
| **Suggested fix** | Add `app_metadata.role === "parent"` check. |
| **Status** | **Suspected** low exploitability, **Confirmed** missing role gate |

#### M-008 — Report export API has no rate limit

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Performance / abuse |
| **Files** | `pages/api/teacher/activities/[activityId]/report-export.js` |
| **Evidence** | Activity **create** has rate limit (`pages/api/teacher/activities/index.js`); export GET does not. |
| **Impact** | Expensive enriched payload generation can be hammered. |
| **Suggested fix** | Per-teacher rate limit on export endpoints. |
| **Status** | **Confirmed** |

#### M-009 — 4-digit student PIN entropy

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Student auth |
| **Files** | `pages/api/student/login.js`, `lib/security/login-rate-limit.js` |
| **Evidence** | PIN hashed with HMAC; rate limit + lockout present (updates prior audit). |
| **Impact** | Brute force mitigated online; offline hash replay if DB compromised. |
| **Suggested fix** | Longer PIN/access code for production; monitor lockout metrics. |
| **Status** | **Confirmed** design tradeoff |

#### M-010 — Parent report bundle size

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Performance |
| **Files** | `pages/learning/parent-report.js` |
| **Evidence** | Build: **680 kB** First Load JS; includes recharts, copilot shell, diagnostic engines, html2pdf path. |
| **Impact** | Slow mobile load for primary parent surface. |
| **Suggested fix** | Route-based code splitting; defer copilot and PDF paths. |
| **Status** | **Confirmed** |

#### M-011 — Real non-SIM activity export validation gap

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Area** | Export / data quality |
| **Files** | `scripts/teacher-portal/activity-report-export-selftest.mjs`, `docs/activity-reports/TEACHER_PDF_V2_REDESIGN_PLAN.md` |
| **Evidence** | Selftest includes SIM stub shapes; plan notes placeholder `question_set` makes PDF sections look broken. |
| **Impact** | Production export with real MC options/long stems not fully signed off in this audit. |
| **Suggested fix** | Manual QA on one closed real activity per subject with full question text. |
| **Status** | **Needs manual verification** |

---

### LOW

#### L-001 — V1 guidance `insufficientData` uses AND gate (latent)

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Diagnostic correctness |
| **Files** | `lib/teacher-server/teacher-recommendations.server.js:199-200` |
| **Evidence** | V2 path guarded at `teacher-guidance-v2.server.js:394-402`; production uses V2. |
| **Status** | **Confirmed latent** |

#### L-002 — Parent API no max date-range cap

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Performance |
| **Files** | `pages/api/parent/students/[studentId]/report-data.js` vs `resolveTeacherReportDateRange` |
| **Evidence** | Parent accepts arbitrary `from`/`to`; teacher has `MAX_WINDOW_DAYS`. |
| **Status** | **Confirmed** |

#### L-003 — Classroom `latestActivity` vs submission timestamp semantics

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Report date filtering |
| **Files** | `lib/teacher-server/classroom-activity-class-report.server.js` |
| **Evidence** | Dashboard uses `closed_at || activated_at || created_at`; rollups prefer `submitted_at`. |
| **Status** | **Confirmed** edge case |

#### L-004 — Legacy CSV filename uses raw DB title (SIM markers)

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Export UX |
| **Files** | `teacher-activity-report-export.js` — selftest asserts CSV filename unchanged vs enriched |
| **Status** | **Confirmed** (by design for CSV backward compat) |

#### L-005 — Hardcoded dev topup secret in repo

| Field | Detail |
|-------|--------|
| **Severity** | LOW (dev-only) |
| **Files** | `pages/api/student/dev-add-coins.js` — `DEV_TOPUP_SECRET_CODE = "7479"` |
| **Evidence** | Guarded by `guardDevOnlyApiRoute` (404 in production). |
| **Status** | **Confirmed** |

#### L-006 — `.env.example` weak admin token placeholder

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Files** | `.env.example` — `ENGINE_REVIEW_ADMIN_TOKEN=7479` |
| **Status** | **Confirmed** |

#### L-007 — `moledet_geography` vs `moledet-geography` dual keys

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Curriculum mapping |
| **Files** | `report-data-aggregate.server.js` uses underscore; routes use hyphen; `hebrew-display-labels.js` maps both |
| **Status** | **Confirmed handled** in label layer |

#### L-008 — Student can start activity while teacher paused (live lesson)

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Area** | Activity lifecycle |
| **Files** | `teacher-activities.server.js` — `startStudentActivity` vs `isActivityAcceptingAnswers` |
| **Status** | **Suspected** — needs live-lesson QA |

---

### INFO

#### I-001 — Teacher activity PDF v1 isolated and disabled

| Field | Detail |
|-------|--------|
| **Files** | `lib/teacher-portal/teacher-activity-report-pdf-he.js` — `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false`; no `jspdf` in `pages/` |
| **Plan** | `docs/activity-reports/TEACHER_PDF_V2_REDESIGN_PLAN.md` exists, not implemented |
| **Status** | **Confirmed** |

#### I-002 — Discussion non-diagnostic firewall for class rollups

| Field | Detail |
|-------|--------|
| **Files** | `classroom-activity-class-report.server.js` — `.neq("mode", "discussion")` (4 query sites) |
| **Status** | **Confirmed** |

#### I-003 — Service-role-only RLS on classroom/student activity tables

| Field | Detail |
|-------|--------|
| **Files** | `024_classroom_activities.sql`, `026_student_activities.sql` — RLS on, no authenticated policies |
| **Status** | **Confirmed** |

#### I-004 — SIM/demo data markers in codebase

| Field | Detail |
|-------|--------|
| **Files** | `lib/teacher-server/teacher-access-prefix.server.js`, `lib/parent-server/parent-student-limit.server.js`, school sim scripts |
| **Status** | **Confirmed** — SIM data should not be used for launch quality claims |

#### I-005 — Worksheet PDF routes are teacher-uploaded PDFs, not jsPDF reports

| Field | Detail |
|-------|--------|
| **Files** | `pages/teacher/worksheets/*`, `pages/api/teacher/worksheet-activities/*` |
| **Status** | **Confirmed** separate product surface |

---

## D. Security Section

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| S-1 | IDOR on reports/activities mitigated via ownership helpers | — | **Solid** |
| S-2 | Service role never exposed client-side | — | **Confirmed** |
| S-3 | Anon RLS blocks direct table reads | — | **Verified live** |
| S-4 | CSV formula injection | MEDIUM–HIGH | **Confirmed** |
| S-5 | Unauthenticated Hebrew/TTS APIs | MEDIUM | **Confirmed** |
| S-6 | Health endpoint recon | MEDIUM | **Confirmed** |
| S-7 | Staging engine-review token bypass | HIGH | **Confirmed** |
| S-8 | Parent copilot server-side payload in prod | — | **Confirmed** |
| S-9 | LLM keys server-only (`OPENAI_API_KEY` in server utils, not NEXT_PUBLIC) | — | **Confirmed** |
| S-10 | XSS: learning UIs render question text as React text nodes; `dangerouslySetInnerHTML` only in dev `engine-review.js` | LOW | **Confirmed** |
| S-11 | Student session HttpOnly cookie; ID from cookie not body | — | **Confirmed** |
| S-12 | Guardian bound to single student_id | — | **Confirmed** |
| S-13 | Cross-school: `loadSchoolClassInScope` checks teacher membership OR school_id tag | — | **Confirmed** |
| S-14 | In-memory rate limits may not span serverless instances | LOW–MEDIUM | **Suspected** |
| S-15 | No SQL injection via raw SQL in audited API paths (Supabase query builder) | — | **Confirmed** |
| S-16 | CORS not broadly misconfigured for learning APIs (same-origin fetch pattern) | — | **INFO** |

---

## E. Report-Engine Truth Section

| Topic | Status | Notes |
|-------|--------|-------|
| Shared aggregator `aggregateParentReportPayload` | **Solid** | UTC inclusive dates, exclusive end |
| Teacher parent preview = parent truth | **Fixed verified** | No classroom merge |
| Teacher student report + classroom | **Intentional** | Document for users |
| V2 thin-data guard (`totalAnswers < MIN`) | **Fixed verified** | Unit tests pass |
| Subject-permission reconciliation | **Fixed verified** | `filterReportByPermittedSubjects` rebuilds summary, guidance, parentFacing, dailyActivity |
| `positiveConclusionAllowed` not in decision paths | **Verified** | CI test pass |
| Class report per-student vs cohort scope | **Issue M-003** | Misleading for subject teachers |
| Parent dual engine | **Issue H-001** | Highest product-truth risk |
| School manager reports unfiltered by subject | **Intentional** | Full student view |
| Dashboard cards align date window | **Verified in code** | Comments + shared helpers |
| Discussion excluded from diagnostic rollups | **Verified** | Per-activity export still analyzes discussion (correct for teacher session report) |

---

## F. UI/UX Section (static/code review — no live browser pass)

| Topic | Finding | Severity |
|-------|---------|----------|
| RTL | Export sheets set `rightToLeft`; parent/teacher shells use Hebrew RTL patterns | **OK** |
| Teacher report table | `overflow-x-auto` on student table | **OK** |
| Raw keys in teacher UI | `SubjectSummaryCards.jsx` uses `topicLabelHe(sid, t.topicKey)` — labels applied | **OK** |
| Raw keys in export | `looksLikeRawExportKey` guard in labels; selftest passes | **OK** |
| English dev labels | Dev simulator shows `subjectKey/topicKey` — dev-only surface | **INFO** |
| Parent PDF button visible | “הדפס / ייצא ל-PDF” on parent report | **INFO** (approved parent feature) |
| Teacher activity PDF button | **Not present** — Excel + CSV only | **OK** |
| Loading/error states | Student activity, teacher report pages handle error Hebrew messages | **OK** |
| Permission denied | APIs return Hebrew error messages via `sendTeacherApiError` / school equivalents | **OK** |
| Mobile bundle weight | Parent 680 kB, teacher report 501 kB — likely slow on 3G | **MEDIUM** |
| Long names/titles | Masked names in export; title sanitize for download stem | **OK** |

**Manual UI QA not performed** — recommend targeted pass on: parent report thin data, teacher class report subject-scoped class, student activity on mobile, school dashboard with many classes.

---

## G. Export Section

### Enriched Excel (teacher activity)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Dedicated `/report-export` API | **PASS** | `pages/api/teacher/activities/[activityId]/report-export.js` |
| Auth + ownership | **PASS** | `requireTeacherApiContext` + `buildEnrichedActivityReportPayload` → `loadTeacherActivityOwned` |
| Screen route unchanged | **PASS** | Screen uses `/report`; Excel uses `/report-export` |
| CSV unchanged | **PASS** | Selftest confirms legacy CSV behavior |
| 7 sheets | **PASS** | Selftest 171/171 |
| Hebrew-only labels | **PASS** | Label helpers + selftest |
| RTL | **PASS** | All sheets `rightToLeft` |
| No raw keys in export | **PASS** | Selftest + `looksLikeRawExportKey` |
| Frozen `question_set` | **PASS** | `teacher-activities-enriched.server.js` reads DB set + attempt snapshots |
| X/N correctness | **PASS** | Selftest |
| No fake recommendations | **PASS** | Sheet 7 factual + blank teacher action field |
| All skills | **PASS** | `buildAllSkillsFromAttempts` |
| Skipped unanswered rows | **PASS** | Sheet 4 includes empty answers for not_started |
| Teacher-only | **PASS** | Teacher auth gate |
| Real non-SIM limitation | **GAP** | See M-011 |

### CSV

| Requirement | Status |
|-------------|--------|
| Legacy 5-column CSV on screen data | **PASS** |
| Formula injection safe | **FAIL** — M-001 |
| UTF-8 BOM for Hebrew | **PASS** |

### PDF

| Requirement | Status |
|-------------|--------|
| Teacher PDF v1 button hidden | **PASS** |
| No jspdf in production pages | **PASS** |
| PDF v1 isolated in lib + scripts | **PASS** |
| PDF v2 plan only | **PASS** — `TEACHER_PDF_V2_REDESIGN_PLAN.md` |
| Parent PDF (html2pdf) | **Separate product** — visible on parent report (H-004) |

---

## H. Test Results Summary

```
npm run build                                      PASS (exit 0)
npm run test:activity-report-export                PASS (171/171)
npm run test:no-positive-conclusion-decisioning    PASS
diagnostic-report-truth-fix-unit.mjs               PASS
teacher-guidance-v2-unit.mjs                       PASS
student-activities-unit.mjs                        PASS
teacher-class-report-aggregation-unit.mjs          PASS
school-portal-cache-unit.mjs                       PASS
diagnostic-report-bundle-self-check.mjs            PASS
hebrew-activity-title-unit.mjs                     PASS
teacher-dashboard-roster-unit.mjs                  PASS
verify-learning-rls.mjs --anon-only                PASS

SKIPPED (env/runtime): student-report-flow-regression, verify-teacher-report-subject-reconciliation,
  demo-school-* regressions, full RLS verify, Playwright e2e
```

---

## I. Open Validation Gaps

1. **Real closed classroom activity** with full question stems and MC options — manual Excel export review not done in this audit.
2. **Live browser UI** on desktop/mobile for report overflow, RTL edge cases, long Hebrew strings.
3. **Cross-role IDOR fuzz testing** — code review positive; no dynamic penetration test run.
4. **Parent vs teacher numeric parity** — needs scripted comparison on same student/date window using parent API vs teacher parent-preview API.
5. **School sim at scale** — `qa:school:daily` not run (mutating); performance of 100+ class school unverified live.
6. **Full RLS parent/teacher JWT matrix** — only anon-only probe executed successfully.
7. **Parent copilot live LLM** — mass/soak scripts not run.
8. **Curriculum completeness** — subject `*-master.js` routes exist for all 6 subjects; full Ministry alignment not audited (per scope).

---

## J. Recommended Next Steps (prioritized, no implementation)

### P0 — Before broad parent/teacher launch

1. Resolve **parent dual-engine authority** (H-001): single narrative source or explicit UI layering.
2. Add **CSV/XLSX formula injection hardening** (M-001).
3. Document **teacher vs parent data scope** (classroom inclusion) in teacher-facing Hebrew copy (H-002).
4. Manual **real-activity export sign-off** per subject (M-011).
5. Require **admin token** for engine-review APIs in all environments (H-003).

### P1 — Security & policy hardening

6. Align **private teacher subject grants** for non-discussion activities if product requires (M-002).
7. Add **rate limits** to report-export and heavy report APIs (M-008).
8. Gate or remove **health** and **Hebrew utility** public APIs (M-005, M-006).
9. Add explicit **parent role** claim on parent routes (M-007).

### P2 — Product truth & UX

10. Fix or label **class report per-student summary scope** (M-003).
11. **Lazy-load** xlsx-js-style and html2pdf (M-004, M-010).
12. Cap **parent report date range** like teacher routes (L-002).

### P3 — QA automation

13. Run skipped regressions with `.env.local` in CI: `student-report-flow-regression`, `verify-teacher-report-subject-reconciliation`, `demo-school-*`.
14. Run `test:e2e:teacher-activities` in pre-release pipeline.
15. Execute manual mobile RTL pass (`qa:launch:mobile` script exists).

---

## Appendix: Architecture & Role Separation

```
┌─────────────┐     Bearer JWT      ┌──────────────────┐
│   Parent    │ ──────────────────► │ /api/parent/*    │ parent_id scope
└─────────────┘                     └──────────────────┘

┌─────────────┐     HttpOnly cookie ┌──────────────────┐
│   Student   │ ──────────────────► │ /api/student/*   │ session studentId
└─────────────┘                     └──────────────────┘

┌─────────────┐     Bearer JWT      ┌──────────────────┐
│   Teacher   │ ──────────────────► │ /api/teacher/*   │ teacherId + helpers
└─────────────┘   role=teacher      └──────────────────┘

┌─────────────┐     Bearer JWT      ┌──────────────────┐
│School Admin │ ──────────────────► │ /api/school/*    │ schoolId + manager role
└─────────────┘   role=teacher      └──────────────────┘

┌─────────────┐     Guardian cookie ┌──────────────────┐
│  Guardian   │ ──────────────────► │ /api/guardian/*  │ bound studentId
└─────────────┘                     └──────────────────┘
```

**Service-role pattern:** Browser uses anon key + RLS for parent reads; most teacher/school/student mutations and reports use server APIs with service role after authorization checks. Classroom activity tables have RLS enabled with **no client policies** — bypass only via server.

---

## Appendix: Regression Fix Verification (recent history)

| Fix area | Verified | Regression seen? |
|----------|----------|------------------|
| School-context teacher reports | `teacherHasSchoolContextReportAccess` | No |
| Dashboard cards + classroom | `teacher-dashboard.server.js` merge | No |
| Subject-permission reconciliation | `filterReportByPermittedSubjects` | No |
| Parent-report truth (teacher preview) | `buildTeacherParentReportPreviewPayload` no classroom | No |
| Thin-data guidance V2 | Extra guard + unit tests | No |

---

*End of audit report.*

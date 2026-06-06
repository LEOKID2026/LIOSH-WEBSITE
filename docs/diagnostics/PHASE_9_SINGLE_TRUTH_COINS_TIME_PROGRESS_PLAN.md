# Phase 9 — Single Truth for Coins / Time / Monthly Progress: Implementation Plan

**Project:** Diagnostic Truth Fix  
**Phase:** 9 — Single Truth (coins, credited time, monthly progress)  
**Date:** 2026-06-06  
**Revision:** 1  
**Status:** PLAN ONLY — awaiting owner approval before implementation  
**Prerequisite:** Phase 8 implementation **ACCEPTED** (2026-06-06)

---

> **NO APPLICATION CODE CHANGES WERE MADE in this document.**  
> This file is audit + plan only. Do not implement until owner approves scope below.

---

## 1. Goal

Make **DB/server the sole authority** for child coins, credited learning time, monthly progress, and any parent/student-facing progress numbers. `localStorage` may remain only as an **optimistic UI cache** that is always overwritten by server truth on load and never used to award coins, compute monthly tiers, or render authoritative parent reports.

### Product rules (owner-approved constraints)

| Rule | Meaning |
|------|---------|
| DB/server is source of truth | All displayed progress/coin/time numbers trace to Supabase tables or server-computed APIs |
| localStorage = cache only | May write for instant UI; must not win over server on conflict |
| `LEO_REWARD_CHOICE` deprecated/removed | No parent reward-choice system; do not migrate to a new parent reward product |
| No separate parent reward system | Only **child coins** + **monthly progress** remain |
| No UI/Hebrew/CSS unless approved | Phase 9 is wiring/truth migration; copy/layout changes are out of scope unless explicitly approved |
| No diagnostic conclusion changes | `diagnosticAccuracy`, `positiveEvidence`, `competitiveContext` untouched |
| No Phase 10 | Consumer-wide report verification deferred |
| Phase 4–8 intact | All existing phase test gates remain green |

---

## 2. Current localStorage Authority Audit

### 2.1 Primary LEO / progress keys

| Key(s) | File(s) | Stores | Writers | Readers | Today: authority or cache? | Proposed Phase 9 action |
|--------|---------|--------|---------|---------|---------------------------|-------------------------|
| `LEO_MONTHLY_PROGRESS` (global) | `utils/progress-storage.js` | `{ "YYYY-MM": { totalMinutes, totalExercises } }` | `addSessionProgress()` — called at session end in all 6 masters | Internal only (`loadMonthlyProgress` inside same module); cleared on student switch via `lib/learning-student-local-sync.js` | **De facto authority on device** for legacy monthly minutes (parallel write path, not reconciled with DB) | **Convert to cache** — write optional optimistic bump; on `GET /api/student/learning-profile` or `home-profile`, overwrite from `derived.monthlyMinutesIsraelMonth` |
| `liosh_lp_{studentId}_LEO_MONTHLY_PROGRESS` | `utils/progress-storage.js` | Same shape, namespaced per student | Same `addSessionProgress()` when `opts.studentId` set | Same | **Parallel authority** (device-local monthly totals) | **Convert to cache** — same server overwrite rule |
| `LEO_PROGRESS_LOG` / `liosh_lp_{studentId}_LEO_PROGRESS_LOG` | `utils/progress-storage.js` | Append-only session log `{ minutes, exercises, subject, topic, … }` max 1000 rows | `addSessionProgress()` → `appendProgressLog()` | No active product page found in repo (former `pages/parent/rewards.js` removed); `components/TrackingDebugPanel.js` debug only | **Orphan authority** — can diverge from DB across devices | **Remove as authority** — stop treating as progress source; either delete writes or mark debug-only; do not use for parent UI |
| `LEO_REWARD_CHOICE` | — | Parent prize selection per month | — | — | **Already removed** from application code (no matches in `*.js` / `*.mjs`) | **Confirm absent** — grep gate in tests; remove stale help-center links to `/parent/rewards` only if owner approves content touch (otherwise document as known stale help reference) |

### 2.2 Report bridge / seed pipeline (critical authority leak)

| Module | File path | Role | Writers | Readers | Authority? | Proposed action |
|--------|-----------|------|---------|---------|------------|-----------------|
| `parent-dashboard-report-bridge` | `lib/learning-supabase/parent-dashboard-report-bridge.js` | Fetches DB report API JSON → seeds `localStorage` → runs `generateParentReportV2` → restores keys | `runParentReportGenerationFromApiBody()` | `pages/learning/parent-report.js`, `pages/learning/parent-report-detailed.js` | **Yes** — parent report UI truth is still the localStorage-shaped legacy engine | **Remove** — replace with direct DB-payload rendering path (see §4) |
| `seed-db-report-local-storage` | `lib/learning-supabase/seed-db-report-local-storage.js` | Maps aggregated DB input → browser-shaped `mleo_*` keys (`SEEDED_MLEO_STORAGE_KEYS`) | Bridge + `lib/parent-server/db-input-to-detailed-report.server.js` + QA scripts | `generateParentReportV2`, `utils/parent-report-v2.js` | **Yes** for any code path still calling `generateParentReportV2` | **Remove from product path** — keep only behind explicit dev/QA script flag until Phase 10 retires `parent-report-v2.js` localStorage dependency entirely |

**`SEEDED_MLEO_STORAGE_KEYS` (all currently act as temporary report authority when bridge runs):**

| Key | Seeded from | Legacy meaning |
|-----|-------------|----------------|
| `mleo_time_tracking` | Aggregated topic `durationSeconds` per math operation | Per-operation seconds for parent report time charts |
| `mleo_geometry_time_tracking` | Same for geometry | Same |
| `mleo_english_time_tracking` | Same | Same |
| `mleo_science_time_tracking` | Same | Same |
| `mleo_hebrew_time_tracking` | Same | Same |
| `mleo_moledet_geography_time_tracking` | Same | Same |
| `mleo_math_master_progress` | Topic totals → progress blob | Legacy gamification progress |
| `mleo_geometry_master_progress` | Same | Same |
| `mleo_english_master_progress` | Same | Same |
| `mleo_science_master_progress` | Same | Same |
| `mleo_hebrew_master_progress` | Same | Same |
| `mleo_moledet_geography_master_progress` | Same | Same |
| `mleo_mistakes` / `mleo_*_mistakes` | `recentMistakes` from aggregator | Mistake list for legacy report engine |

**Proposed:** eliminate bridge seeding; parent report consumes `enrichPayloadWithParentFacing` output from `pages/api/parent/students/[studentId]/report-data.js` (already DB-first) without round-tripping through `localStorage`.

### 2.3 `mleo_*` keys that still act as authority or parallel truth

| Key pattern | File(s) | Stores | Writers | Readers | Authority? | Proposed action |
|-----------|---------|--------|---------|---------|------------|-----------------|
| `mleo_time_tracking`, `mleo_*_time_tracking` | `utils/math-time-tracking.js`, `utils/geometry-time-tracking.js`, `utils/english-time-tracking.js`, `utils/science-time-tracking.js`, `utils/hebrew-time-tracking.js`, `utils/moledet-geography-time-tracking.js` | Per-operation seconds, daily buckets | `trackOperationTime()` from masters at session end | `utils/parent-report-v2.js`, `utils/math-report-generator.js` | **Yes** on local-only parent report path; **No** when API bridge seeds from DB | **Demote to cache** — stop using for authoritative time; optional write for offline debug only |
| `mleo_*_master` + `_progress` | Master `STORAGE_KEY` constants; `utils/math-report-generator.js` | Legacy stars/level/progress JSON | Historically masters; now largely superseded by `student_learning_state.subjects.*.progressStore` PATCH | `parent-report-v2.js` `loadProgress()` | **Mixed** — DB `progressStore` is authoritative for HUD; localStorage progress still read by legacy report | **Leave as cache** or stop writing; report must not read it in product path |
| `mleo_mistakes`, `mleo_*_mistakes` | All 6 masters | Local mistake buffers | Masters on wrong answers | `parent-report-v2.js` | **Local-only** diagnostic buffer; server has `recentMistakes` in aggregator (Phase 4–8) | **Leave** for gameplay UX; **not** authority for parent report after bridge removal |
| `mleo_*_daily_streak`, `mleo_daily_challenge`, `mleo_weekly_challenge`, `mleo_*_daily_challenge` | `utils/daily-streak.js`, masters | Streak counters, challenge progress | Masters during play | Master lobby UI, `parent-report-v2.js` challenge section | **Local authority** for streak/challenge display in masters | **Out of Phase 9 core** — optional follow-up to migrate to `student_learning_state.challenges` (missions already DB-backed) |
| `mleo_player_name`, `mleo_player_avatar`, `mleo_player_avatar_image` | Masters, `lib/learning-student-local-sync.js`, `pages/student/home.js` | Display name / avatar | Sync from `/api/student/me`; user picks in UI | HUD, home hero | **Cache** (server profile wins when present) | **Leave as cache** — already cleared on student switch |
| `mleo_parent_report_contracts_v1` | `utils/parent-report-v2.js` | Parent report contract prefs | Parent report UI | `parent-report-v2.js` | UI preference cache | **Leave** — not progress authority |
| `mleo_*_book_*_resume_v1` / practice presets | `lib/learning-book/*-book-nav.js` | Book navigation resume | Book reader | Book CTA return | Session UX cache | **Leave** — unrelated to coins/monthly |
| `liosh_active_student_id` | `lib/learning-student-local-sync.js` | Last active student id | Login/sync | Student switch guard | Identity guard, not progress | **Leave** |
| `liosh_lp_{studentId}_*` (profile cache suffixes) | `lib/learning-client/studentLearningProfileClient.js` | Namespaced JSON cache blobs | `saveLocalCache()` | `readLocalCache()` merge helpers | **Cache** with explicit “server wins” merge | **Keep** — document server-wins policy in module header |

### 2.4 Summary: authority vs cache today

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHORITATIVE TODAY (server)                                            │
│  coin_transactions, student_coin_balances                                 │
│  learning_sessions.duration_seconds → monthlyMinutesIsraelMonth         │
│  student_learning_state (progressStore, scoresStore, challenges.daily)  │
│  answers.answer_payload timing fields (per-answer, not monthly rollup)    │
│  book_reading_sessions / book_page_visits (report-only, Phase 5)        │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │  PARALLEL / LEGACY (device)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STILL WRITTEN AT SESSION END (all 6 masters)                              │
│  addSessionProgress → LEO_MONTHLY_PROGRESS + LEO_PROGRESS_LOG           │
│  trackOperationTime → mleo_*_time_tracking                              │
│  finishLearningSession → learning_sessions (DB)  ← correct path exists  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │  PARENT REPORT UI (remote source)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ API report-data (DB) → bridge seeds localStorage → generateParentReportV2│
│ Diagnostic metrics already from DB; time/mistakes/gamification still     │
│ shaped through legacy localStorage contract                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Core Phase 9 problem:** two parallel monthly-minute writers (`addSessionProgress` vs `learning_sessions`) and parent report still depends on a localStorage rehydration shim despite DB aggregation already existing.

---

## 3. Current DB / Server Authority

### 3.1 Tables and fields

| Source | Location | Authoritative for | Notes |
|--------|----------|-------------------|-------|
| `coin_transactions` | `supabase/migrations/001_learning_core_foundation.sql`, `004_arcade_foundation.sql` | All coin earns/spends | Idempotent via `(student_id, idempotency_key)`; parent RLS read policy exists |
| `student_coin_balances` | Same migrations | Current balance | Updated by `arcade_coin_apply` RPC |
| `learning_sessions` | Core foundation | Session duration, monthly minutes rollup | `duration_seconds` written by `POST /api/learning/session/finish`; `computeStudentLearningDerived` sums completed sessions in Israel month |
| `answers` | Core foundation | Per-answer credited timing (Phase 3) | `answer_payload.rawTimeSpentMs`, `creditedTimeMs`, `timingStatus` — used for diagnostics/timing truth, **not** monthly rollup today |
| Assigned activity attempts | `parent_activity_attempts`, `classroom_activity_attempts`, `student_activity_attempts` | Per-question timing in `question_snapshot` JSONB | Phase 3 fields: `rawTimeSpentMs`, `creditedTimeMs`, `timingStatus` — **not** included in `monthlyMinutesIsraelMonth` today |
| Book reading | `book_reading_sessions`, `book_page_visits` (migration `056`) | Credited dwell for reports | Exposed via `mergeLearningActivityBookData` → `learningActivity.bookReadingMinutes`; **excluded** from monthly persistence job (Phase 5 boundary) |
| `student_learning_state` | Learning profile tables | Gamification (`progressStore`, `scoresStore`), `monthly.celebrationsShown`, `challenges.daily` missions | PATCH via `/api/student/learning-profile`; missions updated on session finish |

### 3.2 Server modules (coins / time / monthly)

| Module | Path | Responsibility |
|--------|------|----------------|
| Session coin awards | `lib/learning-supabase/learning-coin-award.server.js` | `awardLearningSessionCoins` — base 10 + accuracy tier; daily cap 300; idempotency `coin_session_{sessionId}`; gated by `ENABLE_SESSION_COIN_AWARDS` |
| Mission coins | `lib/learning-supabase/mission-progress.server.js` | 20 coins/mission; idempotency `mission_complete_{studentId}_{date}_{missionId}`; state in `student_learning_state.challenges.daily` |
| Monthly persistence job | `lib/learning-supabase/monthly-persistence-reward.server.js` | Tiers at 100/250/400/600 min; sums **`learning_sessions.duration_seconds` only**; idempotency `monthly_persistence_{studentId}_{yearMonthIsrael}` |
| Monthly minutes display | `lib/learning-supabase/student-learning-profile.server.js` → `computeStudentLearningDerived` | `monthlyMinutesIsraelMonth` from completed sessions in Israel calendar month |
| Session finish | `pages/api/learning/session/finish.js` | Persists `duration_seconds`, triggers coins + missions |
| Student home | `pages/api/student/home-profile.js` | Returns `derived` + `accountSnapshot` + missions |
| Student profile refresh | `pages/api/student/learning-profile.js` | GET/PATCH profile; includes `monthlyPersistenceStatus` via `evaluateMonthlyPersistenceReward` |
| Parent analytics API | `pages/api/parent/students/[studentId]/report-data.js` | `aggregateParentReportPayload` + `enrichPayloadWithParentFacing` — **already DB-first** for diagnostics |
| Coin balance | `pages/api/student/me.js` | Reads `student_coin_balances` |

### 3.3 Client APIs already consuming server truth (partial)

| Consumer | API / module | Server fields used |
|----------|--------------|-------------------|
| Student home | `GET /api/student/home-profile` → `buildStudentHomeView` | `derived.monthlyMinutesIsraelMonth`, `monthlyPersistence`, missions from DB |
| Subject master lobbies | `GET /api/student/learning-profile` → `buildSubjectMonthlyPersistenceView` | Same derived minutes + `monthlyPersistenceStatus` |
| Master HUD gamification | PATCH `student_learning_state` | `progressStore`, `scoresStore` |
| Coin display | `GET /api/student/me` | `coin_balance` |

**Gap:** session end still calls `addSessionProgress` (local) **and** `finishLearningSession` (DB). Parent report UI still uses bridge (local re-shape) even though API payload is DB-sourced.

---

## 4. Coins / Monthly Progress Behavior Audit (no changes in Phase 9 plan)

### 4.1 Session coins

| Aspect | Current behavior |
|--------|------------------|
| Trigger | `POST /api/learning/session/finish` after `learning_sessions` row updated |
| Formula | Base 10; +5 if accuracy ≥ 80%; +10 if accuracy ≥ 95% (non-stacking) |
| Duration input | `body.durationSeconds` from client — masters send `resolveMasterSessionDurationSeconds(sessionSecondsRef)` (credited ms capped via `utils/learning-time-credit`) |
| Accuracy input | Client-reported session accuracy from finish payload (not re-computed server-side from answers in finish handler) |
| Daily cap | 300 coins/day from `source_type = learning_session` (Israel midnight) |
| Feature flag | `ENABLE_SESSION_COIN_AWARDS=true` required |
| Competitive modes | Same finish path — challenge/speed/marathon sessions that call `finishLearningSession` with `duration_seconds > 0` are eligible; lower credited time may yield fewer effective coins only via shorter sessions, not a mode ban |

### 4.2 Daily / mission coins

| Aspect | Current behavior |
|--------|------------------|
| Missions | 3 per Israel day per grade band; progress updated on session finish (`totalQuestions`, `durationSeconds`, `subject`) |
| Reward | 20 coins each; separate from session daily cap |
| Storage | `student_learning_state.challenges.daily` |
| Display | `buildDailyMissionsView` on home + subject modals |

### 4.3 Monthly progress (minutes + coin tiers)

| Aspect | Current behavior |
|--------|------------------|
| Display minutes | `computeStudentLearningDerived` → sum of `learning_sessions.duration_seconds` for Israel month |
| UI goal | `MONTHLY_MINUTES_TARGET = 600` (`data/reward-options.js`) — product display goal, separate from persistence tiers |
| Persistence tiers | 100 / 250 / 400 / 600 minutes → 10K / 30K / 60K / 100K coins |
| Award mechanism | Admin/job `runMonthlyPersistenceAwardJob` — not automatic on child UI action |
| Celebration flag | `student_learning_state.monthly.celebrationsShown[ym]` — UI state only |
| Parallel local path | `addSessionProgress` adds wall-clock minutes from master session end — **can exceed DB** on same device |

### 4.4 Assigned activities

| Aspect | Current behavior |
|--------|------------------|
| Coins | **No** `coin_transactions` from assigned parent/class/student activities |
| `learning_sessions` | **No** rows created for assigned activity play |
| Time stored | `time_spent_ms` column + `question_snapshot.rawTimeSpentMs` / `creditedTimeMs` |
| Monthly minutes | **Not included** in `monthlyMinutesIsraelMonth` today |

### 4.5 Book reading

| Aspect | Current behavior |
|--------|------------------|
| Persistence | `book_reading_sessions.credited_dwell_ms` (Phase 5) |
| Reports | `learningActivity.bookReadingMinutes` in aggregator |
| Monthly minutes | **Excluded** from `computeStudentLearningDerived` and `monthly-persistence-reward.server.js` |
| Coins | **No** book reading coin awards |

**Phase 9 recommendation (owner decision point):** keep book reading **out of** monthly minutes and coin tiers in Phase 9 core (matches Phase 5 boundary). Document explicitly; add Phase 9 test that book minutes do not change `monthlyMinutesIsraelMonth`.

### 4.6 Competitive vs learning modes (coins/time)

| Mode | Session row? | Coins? | In monthly minutes? |
|------|--------------|--------|---------------------|
| `learning`, `practice` | Yes (if finish called) | Yes (if flag on) | Yes |
| `challenge`, `speed`, `marathon` | Yes (if finish called) | Yes (if flag on) | Yes |
| Assigned activities | No | No | No |
| Book reading | No (`book_reading_sessions`) | No | No (today) |

**Do not change** mode classification or diagnostic buckets in Phase 9.

---

## 5. Proposed Single-Truth Design

### 5.1 Authoritative data model (unchanged tables)

| Concern | Authoritative source | Canonical field(s) |
|---------|---------------------|-------------------|
| Coin balance | `student_coin_balances.balance` | Exposed via `/api/student/me` |
| Coin history | `coin_transactions` | Filter by `student_id`, `created_at`, `source_type`, `reason` |
| Monthly learning minutes | `learning_sessions` (completed, Israel month on `started_at`) | `sum(duration_seconds)/60` — already in `computeStudentLearningDerived` |
| Monthly persistence eligibility | Same session sum + `coin_transactions` idempotency check | `evaluateMonthlyPersistenceReward` |
| Per-answer timing | `answers.answer_payload` | `creditedTimeMs` (diagnostic/timing truth) |
| Assigned timing | Attempt `question_snapshot` + columns | Storage only until owner approves inclusion |
| Book reading time | `book_reading_sessions` | Report `learningActivity` only (Phase 9 core) |
| Gamification progress | `student_learning_state.subjects` | `progressStore`, `scoresStore` |
| Daily missions | `student_learning_state.challenges.daily` | Server init via `ensureDailyMissionsInDb` |

### 5.2 APIs to expose progress (existing + proposed)

| Endpoint | Status | Purpose |
|----------|--------|---------|
| `GET /api/student/me` | **Exists** | Identity + `coin_balance` |
| `GET /api/student/home-profile` | **Exists** | `derived`, `accountSnapshot`, missions, monthly journey inputs |
| `GET /api/student/learning-profile` | **Exists** | Subject lobbies + `monthlyPersistenceStatus` |
| `GET /api/student/me/monthly-progress` | **Proposed (thin)** | Optional dedicated contract: `{ yearMonthIsrael, creditedMinutes, sessionCount, goalMinutes, persistenceTiers, coinsEarnedThisMonth }` — can be implemented as wrapper over existing `computeStudentLearningDerived` + coin sum query **without duplicating logic** |
| `GET /api/parent/students/[studentId]/coin-history` | **Proposed** | Read-only `coin_transactions` for parent portal (month filter, Israel TZ) — replaces any deleted `/parent/rewards` localStorage page |
| `GET /api/parent/students/[studentId]/report-data` | **Exists** | Diagnostic + activity analytics — **becomes sole parent report input** after bridge removal |

**Note:** Phase 9 does **not** require a new monthly-progress API if owners accept consolidating on existing `home-profile` / `learning-profile` responses — the thin endpoint is optional for test clarity and mobile clients.

### 5.3 Parent dashboard / report (later read path)

| Consumer | Today | Phase 9 target |
|----------|-------|----------------|
| `pages/learning/parent-report.js` | DB API → bridge → `generateParentReportV2` | Render from `enrichPayloadWithParentFacing` payload + existing server builders (`parent-report-parent-facing.server.js`, `db-input-to-detailed-report.server.js` without browser `localStorage`) |
| `pages/learning/parent-report-detailed.js` | Same bridge | Same — detailed sections from server rebuild only |
| `pages/parent/dashboard.js` | Does not use `LEO_*` keys directly | No change in Phase 9 core unless dashboard shows monthly minutes (verify during implementation) |
| `pages/parent/child-report.js` | Guardian child report route | Ensure any progress widgets use report-data API, not `localStorage` |
| Help center `/parent/rewards` | **Page removed**; links remain in `data/help-center/content/parents.js` | Redirect or DB-backed replacement **only with owner UI approval** |

### 5.4 Student home / master lobbies (later read path)

| Surface | Today | Phase 9 target |
|---------|-------|----------------|
| `pages/student/home.js` | Already uses `buildStudentHomeView` from `home-profile` | Confirm no fallback to `loadMonthlyProgress` |
| Master monthly panel | `monthlyPersistenceView` from `learning-profile` refresh after session | After session: **only** `refreshStudentLearningProfileAfterSession()` updates minutes; remove reliance on `addSessionProgress` totals for display |
| `StudentMonthlyPersistencePanel` | Driven by `dashboardView.monthlyPersistence` from server | Unchanged UI; data source exclusively server |

### 5.5 localStorage keys — delete vs downgrade

| Key / module | Action |
|--------------|--------|
| `LEO_REWARD_CHOICE` | **Already gone** — verify + test |
| `LEO_PROGRESS_LOG` | **Stop authoritative use** — remove writes from product path or gate behind debug flag |
| `LEO_MONTHLY_PROGRESS` (+ namespaced) | **Cache only** — optional optimistic write; hydrate overwrite from server on profile fetch |
| `addSessionProgress` | Add module comment: **“UI cache only — not authoritative”**; consider deprecating `totalMinutes` accumulation in favor of session-finish refresh only |
| `parent-dashboard-report-bridge.js` | **Delete** from product imports |
| `seed-db-report-local-storage.js` | **Remove** from product imports; retain for dev scripts until Phase 10 retires `parent-report-v2` |
| `mleo_*_time_tracking` | **Stop** using for report authority; optional debug retention |
| `mleo_*_mistakes` | **Leave** (gameplay buffer) |
| Book resume keys | **Leave** |

### 5.6 Prerequisite environment checks (before implementation)

1. `ENABLE_SESSION_COIN_AWARDS=true` in all deployed environments (otherwise DB coin ledger is empty for sessions).
2. `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` (or equivalent credited-time path active) so `duration_seconds` reflects credited caps, not raw wall clock.
3. Confirm monthly persistence job operational schedule (admin/cron) if parents/children expect tier coins.

---

## 6. Migration / SQL Need

### 6.1 Verdict: **no new SQL required for Phase 9 core**

All required tables and columns already exist:

- `coin_transactions`, `student_coin_balances`
- `learning_sessions.duration_seconds`
- `answers.answer_payload` timing JSON
- `student_learning_state` JSONB columns
- `book_reading_sessions` (report-only boundary)
- Assigned attempt timing in JSONB (no monthly rollup today)

### 6.2 Optional SQL (out of Phase 9 core — owner opt-in only)

| Migration idea | Purpose | Recommendation |
|--------------|---------|----------------|
| `057_monthly_progress_rollup_view.sql` | Materialized view for monthly minutes + coin sums | **Defer** — `computeStudentLearningDerived` is sufficient at current scale |
| Column on `learning_sessions` for `credited_ms` vs `duration_seconds` | Split raw vs credited at DB layer | **Defer** — client already sends credited duration; document invariant instead |
| Include assigned/book time in rollup table | Single query for all time sources | **Defer** — requires product decision on inclusion (§4.4–4.5) |

**Owner runs SQL manually** if optional migrations are approved later. Phase 9 implementation should not assume migrations were applied.

---

## 7. Scope Proposal

### 7.1 Safe Phase 9 core (recommended first ship)

1. **Remove parent report bridge from product path** — `parent-report.js` / `parent-report-detailed.js` consume server-enriched payload directly; delete `parent-dashboard-report-bridge.js` imports.
2. **Demote `addSessionProgress`** — document cache-only; ensure all monthly UI reads `derived.monthlyMinutesIsraelMonth` after profile refresh; optional: stop incrementing `LEO_MONTHLY_PROGRESS` entirely if owner accepts removing optimistic local bump.
3. **Demote `LEO_PROGRESS_LOG`** — stop append in production path (or debug-only).
4. **Verify `LEO_REWARD_CHOICE` absent** — test gate + remove stale references in docs/help only if approved.
5. **Consolidate monthly progress API contract** — either document `home-profile`/`learning-profile` as canonical **or** add thin `GET /api/student/me/monthly-progress`.
6. **Parent coin read API** — `GET /api/parent/students/[studentId]/coin-history` (read-only, RLS-safe).
7. **Tests + build** — see §8; Phase 4–8 regressions green.
8. **Explicit non-inclusion** — book reading and assigned activity time remain **out of** monthly minutes/coins unless owner approves expansion in implementation checklist.

### 7.2 Optional follow-up (same phase or fast follow)

| Item | Rationale |
|------|-----------|
| Remove `trackOperationTime` writes from masters | Reduces parallel time authority; reports already have DB durations |
| Migrate daily streak keys to `student_learning_state.streaks` | Cross-device streak truth |
| Replace `/parent/rewards` help links with dashboard/report deep link | Requires Hebrew/content approval |
| Server-side session accuracy recompute on finish | Stronger coin fairness; behavior change — needs owner approval |
| Include assigned `creditedTimeMs` in monthly rollup | Product decision — affects monthly tiers |

### 7.3 Out of scope (Phase 9)

| Item | Deferred to |
|------|-------------|
| Phase 10 all-consumer diagnostic verification | Phase 10 |
| UI/Hebrew/CSS redesign of monthly panels | Owner approval gate |
| Changing `diagnosticAccuracy` / `positiveEvidence` / `competitiveContext` | Never in Phase 9 |
| New parent reward-choice product | Cancelled per owner |
| Rewriting entire `utils/parent-report-v2.js` | Phase 10 (may shrink to dev-only after bridge removal) |
| Coin formula or daily cap changes | Requires explicit owner approval |
| Automatic monthly persistence award on child UI | Stays admin/job |

---

## 8. Risk Assessment

| Risk | Description | Mitigation in Phase 9 |
|------|-------------|----------------------|
| **Double-counting time** | `addSessionProgress` + `learning_sessions` both increment on same session | Stop using local monthly totals for display; single read from `computeStudentLearningDerived` |
| **Coin over-award** | Changing finish/accuracy inputs or enabling flag mid-month | Phase 9 does **not** change coin formula; tests assert idempotency keys unchanged |
| **Losing visible progress** | Child sees lower minutes after cache cleared | Server hydrate on load; session finish → profile refresh already implemented in masters |
| **Stale browser cache** | Old `LEO_MONTHLY_PROGRESS` higher than DB | Overwrite cache from server on every `learning-profile`/`home-profile` fetch; clear on student switch (already in `learning-student-local-sync.js`) |
| **Parent ≠ child progress** | Parent report used localStorage-shaped time; child home used DB | Eliminate bridge; parent report uses same aggregator durations as API |
| **Book time inclusion** | Accidentally adding `bookReadingMinutes` to monthly tiers | Explicit test + code comment boundary; no changes to `monthly-persistence-reward.server.js` in core |
| **Assigned activity time inclusion** | Summing attempt `creditedTimeMs` into monthly minutes without product sign-off | Exclude in Phase 9 core; document in API contract |
| **Bridge removal regression** | Parent report sections empty if `generateParentReportV2` relied on seeded mistakes/time | Parallel run: compare API-only render vs bridge output in QA script before deletion |
| **Feature flag off** | `ENABLE_SESSION_COIN_AWARDS` false → empty coin history | Prerequisite check in §5.6 before ship |
| **Help center broken link** | `/parent/rewards` page missing | Document; optional redirect in follow-up with UI approval |

---

## 9. Tests Required (Phase 9 gate)

New file proposed: `tests/learning/phase9-single-truth-progress.test.mjs`

| # | Test | Assertion |
|---|------|-----------|
| 1 | localStorage not authoritative | After `addSessionProgress` bump, `computeStudentLearningDerived` unchanged (unit/server) |
| 2 | DB monthly minutes | Fixture sessions in Israel month → `monthlyMinutesIsraelMonth` equals sum of `duration_seconds/60` |
| 3 | Coin totals unchanged | `awardLearningSessionCoins` idempotency + formula snapshots match pre-Phase-9 baselines |
| 4 | Parent/student consistency | Same student fixture → `home-profile` minutes === value derivable from `learning_sessions` |
| 5 | Legacy cache missing | Empty `LEO_MONTHLY_PROGRESS` → student view still shows correct minutes from API |
| 6 | `LEO_REWARD_CHOICE` absent | Grep/export test — no key in `progress-storage.js` exports |
| 7 | Bridge removed | No production import of `parent-dashboard-report-bridge.js` in `pages/` (allow scripts/) |
| 8 | Book exclusion | Book reading rows present → `monthlyMinutesIsraelMonth` unchanged |
| 9 | Assigned exclusion | Parent activity attempts with credited time → monthly minutes unchanged (core scope) |
| 10 | Mission coins separate | Mission complete writes `coin_transactions` with `source_type=mission_complete` |
| 11 | Phase 4–8 regression | Run `phase4` through `phase8` test files green |
| 12 | Build | `npm run build` passes |

**Existing scripts to keep green:** `scripts/verify-phase1-coin-awards.mjs`, `scripts/verify-phase2-missions.mjs`, `scripts/verify-phase26-monthly-persistence.mjs`, `scripts/verify-israel-monthly-display.mjs`.

---

## 10. Implementation Order (after approval)

1. Prerequisite env verification (`ENABLE_SESSION_COIN_AWARDS`, learning time fairness flag).
2. Audit grep — confirm no `LEO_REWARD_CHOICE`; list all `addSessionProgress` / bridge imports.
3. Demote `progress-storage.js` (comments + optional stop log append).
4. Ensure student surfaces exclusively hydrate from `learning-profile` / `home-profile` (remove any stray `loadMonthlyProgress` readers if found).
5. Add parent `coin-history` API (read-only).
6. Optional: add `GET /api/student/me/monthly-progress` thin wrapper.
7. Remove bridge from `parent-report.js` / `parent-report-detailed.js`; wire server-facing report path.
8. Delete or quarantine `parent-dashboard-report-bridge.js` from product bundles.
9. Quarantine `seed-db-report-local-storage.js` to dev/QA scripts only.
10. Add `phase9-single-truth-progress.test.mjs` + run Phase 4–8 + build.
11. Implementation report for owner.

---

## 11. Owner Approval Checklist

Before implementation, confirm:

- [ ] **Book reading:** remain **out of** monthly minutes/coins in Phase 9 core?
- [ ] **Assigned activities:** remain **out of** monthly minutes/coins in Phase 9 core?
- [ ] **`addSessionProgress`:** keep as optimistic cache write, or **stop writing** entirely?
- [ ] **Monthly API:** use existing `home-profile` / `learning-profile` only, or add `GET /api/student/me/monthly-progress`?
- [ ] **Parent rewards page:** leave removed + help links stale, or approve minimal DB-backed replacement / redirect (UI)?
- [ ] **Bridge removal:** accept parent report rendering from server payload without `generateParentReportV2` localStorage seed (may need Phase 10 for full engine retirement)?
- [ ] **Coin formula:** explicitly **no change** in Phase 9?
- [ ] **Prerequisites:** confirm production env flags for session coins + credited time?

---

## 12. References

| Document / path | Relevance |
|-----------------|-----------|
| `.cursor/plans/diagnostic_truth_fix_plan_59fa56fa.plan.md` §Phase 9 | Master plan constraints |
| `docs/diagnostics/PHASE_5_LEARNING_BOOK_TRACKING_ARCHITECTURE_AUDIT.md` §16 | Book/coin/monthly boundary |
| `lib/learning-supabase/learning-coin-award.server.js` | Session coin authority |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Monthly tier coin job |
| `lib/learning-supabase/student-learning-profile.server.js` | `computeStudentLearningDerived` |
| `utils/progress-storage.js` | Legacy local monthly/log |
| `lib/learning-supabase/parent-dashboard-report-bridge.js` | Bridge to eliminate |
| `pages/api/parent/students/[studentId]/report-data.js` | DB-first parent analytics |
| `docs/diagnostics/PHASE_8_MCQ_ENGINE_COMPATIBILITY_PLAN.md` | Prior phase boundary |

---

*End of Phase 9 plan — implementation blocked until owner approval.*

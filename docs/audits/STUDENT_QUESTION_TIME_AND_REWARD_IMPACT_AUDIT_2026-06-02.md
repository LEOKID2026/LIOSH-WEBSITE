# Student Question Time Limits & Reward Impact — System Audit

**Date:** 2026-06-02  
**Scope:** Read-only audit of the current repo/workspace  
**Author:** Cursor agent (audit only — no code/DB/copy/CSS changes)

---

## 1. Executive Summary

The product has **two different time models** that do not match wall-clock study time for harder questions:

| Layer | What it measures | Hard cap? | Used for |
|-------|------------------|-----------|----------|
| **Session clock** (`sessionSecondsRef`) | Wall time between question boundaries, summed per session | **120 s (2 min) per question** | `learning_sessions.duration_seconds`, monthly persistence coins, daily “minutes” missions, `addSessionProgress` |
| **Topic localStorage clock** (`track*TopicTime` / `trackOperationTime`) | Duration when advancing to next question | **Discarded if ≥ 300 s (5 min)**; only credited if `0 < duration < 300` | Parent Report V2 rows (browser/local), legacy math report |
| **Per-answer clock** (`timeSpentMs`) | `Date.now() - questionStartTime` at submit | **No cap** in payload (API max 36M ms) | Supabase `answers.answer_payload`, fluency/slow-fast in aggregated parent report |
| **Challenge/Speed UI timer** | Countdown per question | **20 s (challenge) / 10 s (speed)** — ends game | Score/lives only in those modes; not used for parent monthly minutes |

**Owner concern validated:** A student who spends **4–8 minutes** on one hard geometry/math item (scratch paper, no clicks) will have at most **~2 minutes** credited to session/reward totals when they finally answer or leave, and **zero** credited to topic localStorage if the gap is ≥ 5 minutes. Per-answer `timeSpentMs` can still reflect the full interval for diagnostics/fluency, but **parent-facing “time on task” minutes and monthly reward tiers follow the capped session clock.**

**Severity:** **HIGH** — systematic undercount for deep work on hard items; affects fairness vs quick MCQ. Not classified as **BLOCKER** because answers and accuracy still record; the issue is **effort/time truth**, not silent data loss of attempts.

**Recommended direction (preview):** **Option E** (subject/difficulty-aware caps) or **Option A** (full active session time with idle guardrails), with explicit decoupling of anti-gaming caps from parent-facing totals — see §13–14.

---

## 2. Current Timer / Time Limit Findings

### 2.1 Regular learning (`mode === "learning"` / `"practice"`)

- **No per-question countdown** — `timeLeft` is set to `null` when not in challenge/speed (e.g. `math-master.js` ~2062, ~2785).
- Time still advances in the background via `questionStartTime` and `sessionStartRef`.
- **No auto-submit** on elapsed time in learning mode.
- **No tab-visibility pause** — no `document.hidden` / Page Visibility handlers found in learning masters.

### 2.2 Challenge / Speed modes (all six subject masters)

- **Per-question UI timer:** 20 s (challenge), 10 s (speed); Hebrew resets similarly after manual audio flow (~1833–1835).
- **Countdown:** `setTimeout` decrements `timeLeft` each second (`math-master.js` ~1378–1393).
- **`handleTimeUp`:** ends game, calls `recordSessionProgress()`, increments wrong, shows “הזמן נגמר”, does **not** auto-submit current question as correct/incorrect to DB beyond whatever was already saved.
- **Affects:** in-game score/streak/lives and session finish — **not** the same rules as learning mode for monthly minutes (still uses capped `sessionSecondsRef` when session ends).

### 2.3 Anti-gaming caps (intentional, documented in repo)

| Cap | Value | Where | Purpose |
|-----|-------|-------|---------|
| Per-question session credit | `Math.min(elapsedMs, 120_000)` | All 6 `*-master.js` `accumulateQuestionTime` / `trackCurrentQuestionTime` | Limit idle/tab-left-open credit per question |
| Topic localStorage credit | `duration < 300` (seconds) | `generateNewQuestion` / `trackCurrentQuestionTime` paths | Drop “unreasonable” per-question spans |
| Session finish minimum | `durationSeconds = max(1, round(totalSeconds))` | `recordSessionProgress` → `finishLearningSession` | At least 1 s recorded if any session time |
| `addSessionProgress` guard | Skip if `durationMinutes <= 0` | `utils/progress-storage.js` ~81–82 | No zero-minute log rows |
| Coin award | `durationSeconds <= 0` → 0 coins | `learning-coin-award.server.js` | No award for empty sessions |
| Daily session coin cap | 300 coins / Israel day | `learning-coin-award.server.js` | Anti-farming |
| Answer `timeSpentMs` API max | 36,000,000 ms | `pages/api/learning/answer.js` ~136 | Upper bound only |

**Verified by:** `node scripts/verify-time-cap.mjs` (all PASS) — documents 120 s cap and 6 masters.

### 2.4 Assigned activities (teacher / parent / student)

- **DB field:** `time_limit_seconds` on activities; **quiz mode requires** `timeLimitSeconds` at create time (`teacher-activities.server.js`, `student-activity.server.js`).
- **Student UI:** `pages/student/activity/[activityId].js` — **no client timer/countdown** found; `timeLimitSeconds` returned in API payload but not enforced in page code reviewed.
- **`timed_out` status:** Defined in schema/labels and read in reports — **no write/update to `timed_out` found** in `pages/api` or main `lib/teacher-server` play paths (status appears reserved/unwired for auto-expiry).
- **Per-answer time:** `pages/api/student/activities/[activityId]/answer.js` accepts `timeSpentMs` (0–36M ms).

### 2.5 Worksheets / PDF

- No question timers in `lib/worksheet-activities` (grep: no matches).
- Completion is mark-complete/submit flow — **not** integrated with `learning_sessions` duration caps above.

### 2.6 Learning Book

- Static content + links to practice targets (`pages/learning/book/**`, `components/learning-book/**`).
- **No independent timer** — practice launches subject masters → **inherits master caps**.

---

## 3. Per-Subject Findings

| Subject | Master page | Topic time LS key | Session cap | LS topic cap | Challenge timer |
|---------|-------------|-------------------|-------------|--------------|-----------------|
| Math | `math-master.js` | `mleo_time_tracking` | 120 s/q | < 300 s | 20s / 10s |
| Geometry | `geometry-master.js` | `mleo_geometry_time_tracking` | 120 s/q | < 300 s | 20s / 10s |
| Hebrew | `hebrew-master.js` | `mleo_hebrew_time_tracking` | 120 s/q | < 300 s | 20s / 10s |
| English | `english-master.js` | `mleo_english_time_tracking` | 120 s/q | < 300 s | 20s / 10s |
| Science | `science-master.js` | `mleo_science_time_tracking` | 120 s/q (via capped ms) | ≤ 300 s | 20s / 10s |
| Moledet/Geography | `moledet-geography-master.js` | `mleo_moledet_geography_time_tracking` | 120 s/q | < 300 s | 20s / 10s |

**Shared session pipeline (all six):**

1. `sessionStartRef = Date.now()` when game starts.  
2. On each question boundary: `accumulateQuestionTime()` → add `min(elapsed, 120_000)` ms to `sessionSecondsRef`.  
3. On session end / unmount: `recordSessionProgress()` → `addSessionProgress(totalMinutes, …)` + `finishLearningSession({ durationSeconds })`.

---

## 4. Regular Learning Flow Findings

### 4.1 Measurement start/stop

- **Question interval:** `questionStartTime` set when question displayed (`setQuestionStartTime(Date.now())`).
- **Session interval:** `sessionStartRef` at game start; cleared after `recordSessionProgress`.
- **Credited session duration:** Sum of per-question capped slices — **not** `Date.now() - sessionStartRef` (wall session length can exceed credited total).

### 4.2 Hints / explanation modals

- Opening hints/solution does **not** pause `questionStartTime` or `sessionSecondsRef` — timer keeps running (no pause logic found).

### 4.3 Navigation / refresh

- **Unmount cleanup:** e.g. geometry `useEffect` return calls `recordSessionProgress({ includePlannerRecommendation: false })` (~798–801) — partial credit up to caps possible.
- **Refresh mid-question:** in-memory timers reset; **localStorage topic totals** only update on question transition with valid duration; **DB session** may be incomplete if `finish` never called.

### 4.4 No answer submitted

- **Session:** If student leaves without `recordSessionProgress`, credited time may be **0** for that session (no finish row or `totalSeconds <= 0` early return ~1827–1832 math).
- **Answer row:** None — no `timeSpentMs` for that question.
- **Topic LS:** No increment unless `generateNewQuestion` runs with prior `questionStartTime` and `duration < 300`.

### 4.5 Scratch-paper time (no clicks)

- Clock runs on wall time until answer or question change.
- **Credited:** max **120 s** per question for rewards/session; topic LS **0** if gap ≥ 300 s.

---

## 5. Assigned Activity Findings

| Activity type | Time limit storage | Client enforcement | Time on reports |
|---------------|-------------------|--------------------|-----------------|
| Class quiz | `time_limit_seconds` required | Not found in student activity page | Aggregates use attempt/`time_spent_ms` when present |
| Class homework / discussion | Optional null | Due date for homework only | Same |
| Parent-assigned | `timeLimitSeconds: null` in `parent-activity.server.js` | N/A | Parent activity attempts in `report-data-aggregate` |
| Individual teacher student activity | Optional / quiz required | Payload only | `student-activity-play.server.js` |

**Risk:** Quiz time limits are **collected at creation** but **not visibly enforced** on the student play UI in the audited paths — **MEDIUM** product/QA gap, separate from master caps.

---

## 6. Storage Keys / DB Fields / LocalStorage Keys

### 6.1 LocalStorage (client)

| Key | Module | Contents |
|-----|--------|----------|
| `mleo_time_tracking` | `utils/math-time-tracking.js` | `operations[bucket].total` (seconds), `sessions[]`, `daily[date]` |
| `mleo_geometry_time_tracking` | `math-time-tracking.js` | `topics[topic].total`, `sessions[]`, `daily` |
| `mleo_english_time_tracking` | `utils/english-time-tracking.js` | Same pattern as geometry |
| `mleo_science_time_tracking` | `utils/science-time-tracking.js` | Same |
| `mleo_hebrew_time_tracking` | `utils/hebrew-time-tracking.js` | Same |
| `mleo_moledet_geography_time_tracking` | `utils/moledet-geography-time-tracking.js` | Same |
| `LEO_MONTHLY_PROGRESS` / `liosh_lp_{studentId}_LEO_MONTHLY_PROGRESS` | `utils/progress-storage.js` | `{ "YYYY-MM": { totalMinutes, totalExercises } }` |
| `LEO_PROGRESS_LOG` / namespaced | `progress-storage.js` | Session log entries `{ minutes, exercises, subject, topic, … }` max 1000 |
| `LEO_REWARD_CHOICE` | `progress-storage.js` | Parent prize selection per month |
| `mleo_daily_streak` (per game) | `utils/daily-streak.js` | Calendar-day streak — **not duration-based** |

### 6.2 Supabase (server)

| Table / field | Set by | Notes |
|---------------|--------|-------|
| `learning_sessions.duration_seconds` | `pages/api/learning/session/finish.js` | From client `durationSeconds` (capped sum) |
| `learning_sessions.started_at` / `ended_at` | session start/finish | Wall clock span ≠ duration_seconds |
| `answers.answer_payload.timeSpentMs` | `pages/api/learning/answer.js` | Uncapped client value (bounded at API max) |
| `coin_transactions` (learning_session) | `learning-coin-award.server.js` | Metadata includes `durationSeconds` |
| `student_learning_state.challenges.daily` | `mission-progress.server.js` | Minutes missions use `durationSeconds/60` |
| `student_activities.time_limit_seconds` | teacher/parent create | Quiz requirement |
| `student_activity_status.started_at` / `submitted_at` | activity play | Status `timed_out` enum exists, rarely set |

---

## 7. Downstream Impact Matrix

| Destination | Time source | Direct / indirect | Uses caps? | Notes |
|-------------|-------------|-------------------|------------|-------|
| Parent short report (V2 local) | LS `mleo_*_time_tracking` | Direct | **300 s/q, LS only** | Browser-local; `parent-report-v2.js` SUBJECTS[].trackingKey |
| Parent short report (DB/API) | `learning_sessions` + answers | Direct | **120 s/q session** | `report-data-aggregate.server.js` |
| Parent detailed report | V2 + detailed merge | Mixed | Both | `detailed-parent-report.js` `timeSpentMinutes` |
| Parent Copilot | Truth packet / report rows | Indirect | Inherits report | `timeSpentMinutes` from row snapshots |
| Student dashboard monthly UI | `derived.monthlyMinutesIsraelMonth` | Direct | **Session cap** | From profile aggregate over `learning_sessions` |
| Student subject lobby progress bar | Same derived | Direct | Session cap | `buildSubjectMonthlyPersistenceView` |
| Parent `/parent/rewards` page | `LEO_PROGRESS_LOG` | Direct | Session cap via `addSessionProgress` | **Can diverge from DB** |
| Monthly persistence coins (job) | `learning_sessions.duration_seconds` | Direct | Session cap | Tiers 100/250/400/600 min — `monthly-persistence-reward.server.js` |
| Session coins | `duration_seconds` at finish | Indirect | Zero if duration ≤ 0 | Accuracy tiers; `ENABLE_SESSION_COIN_AWARDS` |
| Daily missions “X minutes” | `durationSeconds` at finish | Direct | Session cap | g12: 5 min, g34: 8, g56: 10 targets |
| Streaks | Calendar day activity | **Not time** | N/A | `daily-streak.js` |
| Badges / XP / in-game score | Questions correct/streak | **Not session minutes** | N/A | |
| Teacher student report | `report-data` aggregate | Direct | Session + answer ms | |
| Teacher class report | Classroom + learning sessions | Mixed | | `classroom-activity-class-report.server.js` |
| School reports | Same aggregates | Mixed | | |
| Diagnostic engine | Answers, probes, mistakes | Indirect | **Per-answer ms** can be full | Probes use `responseMs` |
| Recommendation / planner | Session summary | Indirect | `durationSeconds` passed | `planner-recommendation.js` |
| Activity PDF export | Per-question attempts | Direct | `time_spent_ms` when recorded | |
| QA / virtual-student-qa | Real sessions | Indirect | Assumes finish payloads | `verify-time-cap.mjs` encodes 120 s |
| Fluency “slow” flag | Answer `timeSpentMs` | Direct | **> 60 s** slow | `REPORT_AGG_FLUENCY_THRESHOLDS.slowMs` |

---

## 8. Parent Report Impact

- **API-backed reports** sum `learning_sessions.duration_seconds` → **capped session time** (120 s per question max).
- **Per-answer fluency** uses **uncapped** `timeSpentMs` — a child can show as “slow” (>60 s) while **minutes column stays low** → parent may see “took long on questions” but “few minutes studied” (internal inconsistency) — **HIGH** UX truth risk.
- **Local-only V2** (when used without DB sync) applies **additional 300 s discard** on topic buckets.
- **Legacy fallback:** `sessionDurationSeconds` uses `session.duration` or estimates `total * 30` seconds if missing (`parent-report-v2.js` ~178–187).

---

## 9. Rewards / Coins / Streaks Impact

| Mechanism | Threshold | Time basis | Fairness on hard questions |
|-----------|-----------|------------|----------------------------|
| Parent monthly prize UI (`MONTHLY_MINUTES_TARGET = 600`) | 600 min + 300 exercises | Lobby: **DB**; rewards page log: **local** | Undercount long questions |
| Monthly persistence tiers | 100–600 min | DB `learning_sessions` | Same cap |
| Daily mission minutes | 5–10 min/day | `durationSeconds` at finish | Hard to complete if many long questions |
| Session coins | 10–20 per session | Needs `durationSeconds > 0` | Award ok if session finishes; amount not tied to minutes |
| Daily coin cap | 300/day | Per session awards | Independent of minutes |
| Streak | Play on calendar day | Not minutes | Unfairness **low** |

**`ENABLE_SESSION_COIN_AWARDS`:** Gates server coin writes only; does not change duration math.

---

## 10. Diagnostic / Recommendation Impact

- **Diagnostics:** Probe metadata uses `responseMs: timeSpentMs` from masters — **full wall time** for that question (good for “slow but thinking”).
- **Aggregated insights:** `slowMs: 60_000`, `fastMs: 6_000` on answer payloads — independent of session minute caps.
- **Recommendations:** Planner receives `durationSeconds` from finished session — **capped**; may under-weight practice effort when recommending next steps.
- **Copilot:** Narrative grounded in report rows — inherits capped `timeMinutes` for effort claims.

---

## 11. Edge Cases and Failure Modes

| Scenario | Session minutes | Topic LS | Answer `timeSpentMs` | Severity |
|----------|-----------------|----------|----------------------|----------|
| 8 min on one question then answer | ≤ 120 s | 0 (≥300) | ~480 s | **HIGH** |
| 3 min thinking, answer | 180 s credited? No — **120 s cap** | 180 s if <300 | ~180 s | **HIGH** |
| Tab background 1 h, one question | 120 s max | 0 if never advance | N/A until submit | **HIGH** (gaming also blocked) |
| Open hint 2 min | Included in question elapsed | | | **MEDIUM** |
| Refresh before finish | Often 0 session row | Partial LS if transition occurred | Partial | **MEDIUM** |
| Learning mode, no challenge timer | No forced submit | | | OK |
| Challenge time up | Session recorded, game ends | | | **LOW** (by design) |
| Parent rewards vs student UI minutes | Log vs DB mismatch | | | **MEDIUM** |
| Quiz `time_limit_seconds` | Not enforced client-side | | | **MEDIUM** |

---

## 12. Product Risk Assessment

| Risk | Classification | Rationale |
|------|----------------|-----------|
| Parent/child “minutes this month” materially below real effort on hard topics | **HIGH** | 120 s/q cap × DB aggregation |
| Fluency says “slow” but minutes say “little practice” | **HIGH** | Split clocks |
| Legacy parent rewards log ≠ student DB minutes | **MEDIUM** | Two stores |
| Long thinking without submit → no credit | **MEDIUM** | No finish/no answer |
| Idle tab farming | **LOW** (mitigated) | 120 s cap is deliberate anti-gaming |
| Quiz time limit non-enforcement | **MEDIUM** | Schema without client timer |
| Challenge mode time-up feels like “unfair limit” in learning | **LOW** | Only challenge/speed modes |

**Gaming:** Leaving a tab open on one question credits at most **2 minutes** per question transition — effective anti-gaming, but collides with legitimate deep work.

---

## 13. Decision Options

### Option A — No hard per-question limit; count full active session time

- **Pros:** Matches parent mental model; fair for geometry/word problems; aligns session wall clock with effort.
- **Cons:** Higher abuse surface without idle detection; needs tab-idle rules.
- **Abuse risk:** Medium–high without idle guard.
- **Parent truth:** High.
- **Child fairness:** High.
- **Implementation complexity:** Medium (replace `120_000` cap, revisit 300 s LS rule, QA overnight).

### Option B — Keep timer UI in challenge/speed only; do not use timers for rewards/reporting

- **Pros:** Minimal change to game modes; separates “game” from “effort accounting.”
- **Cons:** Does **not** fix 120 s/300 s caps in learning mode (main issue remains).
- **Abuse risk:** Unchanged.
- **Parent truth:** Low unless caps also removed.
- **Child fairness:** Low.
- **Implementation complexity:** Low — **insufficient alone**.

### Option C — Recommended time only (soft UI), no strict cap

- **Pros:** Guides students without punishing; good messaging.
- **Cons:** Still need backend policy for rewards; soft UI alone doesn’t fix DB.
- **Abuse risk:** Medium.
- **Parent truth:** Medium (if reporting uses uncapped clock).
- **Child fairness:** Medium–high.
- **Implementation complexity:** Medium.

### Option D — Cap time for rewards; show full time in parent report

- **Pros:** Keeps anti-gaming for coins/missions; restores parent trust on detailed report.
- **Cons:** Two truths — operational complexity; Copilot must know which metric to cite.
- **Abuse risk:** Low on rewards, medium on display.
- **Parent truth:** High on report, low on rewards.
- **Child fairness:** Split (fair narrative, capped prizes).
- **Implementation complexity:** Medium–high (dual fields in aggregate + copy).

### Option E — Subject/difficulty-based caps (e.g. geometry harder → 8 min/q)

- **Pros:** Targets owner concern; keeps some anti-gaming; can map `params.kind` / subject.
- **Cons:** Tuning burden; edge cases across grades; must document in QA gates.
- **Abuse risk:** Low–medium.
- **Parent truth:** Good if tuned well.
- **Child fairness:** High for hard subjects.
- **Implementation complexity:** High (policy table + tests).

---

## 14. Recommended Product Direction

1. **Treat as product bug, not “by design” for parents:** The 120 s cap is documented in `scripts/verify-time-cap.mjs` as anti-idle, but it **conflicts** with stated “minutes learned” on student UI and monthly tiers.
2. **Short term product decision:** Adopt **Option D or A**:
   - **Preferred:** **Option A + idle detection** (pause or stop crediting after N minutes without interaction) for rewards, and **uncapped `duration_seconds`** aligned to `sessionStartRef` wall time minus idle.
   - **Alternative if abuse is top concern:** **Option E** with geometry/hebrew word-problem kinds at **480 s** cap and MCQ at **120 s**.
3. **Align clocks:** Either derive parent **minutes** from sum of answer `timeSpentMs` (with sanitizer) or raise session cap to match — eliminate “slow answers, few minutes.”
4. **Unify parent rewards page** with `monthlyMinutesIsraelMonth` from DB (deprecate orphan `LEO_PROGRESS_LOG` for eligibility).
5. **Assigned quiz:** Implement client+server `time_limit_seconds` enforcement or remove field from teacher UX until wired.
6. **Do not change** challenge/speed **game** timers without separate games design review — they are scoring rules, not study-time limits.

---

## 15. Files Inspected

**Core time & progress**

- `utils/math-time-tracking.js`, `utils/hebrew-time-tracking.js`, `utils/english-time-tracking.js`, `utils/science-time-tracking.js`, `utils/moledet-geography-time-tracking.js`
- `utils/progress-storage.js`, `utils/daily-streak.js`, `utils/tracking-debug.js`
- `utils/parent-report-v2.js`, `utils/detailed-parent-report.js`, `utils/math-report-generator.js`

**Learning masters (all six)**

- `pages/learning/math-master.js`, `geometry-master.js`, `hebrew-master.js`, `english-master.js`, `science-master.js`, `moledet-geography-master.js`

**API / server**

- `pages/api/learning/session/finish.js`, `start.js`, `answer.js`, `planner-recommendation.js`
- `lib/learning-supabase/learning-coin-award.server.js`, `mission-progress.server.js`, `monthly-persistence-reward.server.js`, `student-learning-profile.server.js`, `report-data-adapter.js`
- `lib/parent-server/report-data-aggregate.server.js`
- `lib/teacher-server/teacher-activities.server.js`, `student-activity.server.js`, `student-activity-play.server.js`
- `lib/parent-server/parent-activity.server.js`

**Student / parent surfaces**

- `pages/parent/rewards.js`, `data/reward-options.js`
- `lib/learning-client/subjectMonthlyPersistenceView.js`
- `components/student/StudentMonthlyPersistencePanel.js`
- `pages/student/activity/[activityId].js`

**QA**

- `scripts/verify-time-cap.mjs`, `scripts/verify-phase26-monthly-persistence.mjs` (referenced)

**Learning book**

- `components/learning-book/*` (no separate timer)

---

## 16. Tests / Commands Run

| Command | Result |
|---------|--------|
| `rg -n "timer\|timeout\|…" pages components lib utils data scripts` | **Not run** — `rg` unavailable in PowerShell environment |
| Cursor **Grep** (same patterns) | **Used** — approximate match counts: pages ~29 files; utils ~35; lib ~25; components ~11; scripts ~150+ files with ≥1 match |
| `rg -n "reward\|coins\|…"` | Grep: pages/lib/utils extensive (see §7–9) |
| `rg -n "parent-report\|…"` | Grep: utils heavy (parent-report-v2, copilot, insights) |
| `node scripts/verify-time-cap.mjs` | **PASS** (5 unit + 6 static) |

---

## 17. What Was NOT Changed

- No application code, Hebrew copy, CSS/UI, or database schema
- No SQL writes, commits, pushes, or deploys
- No “fixes” implemented — findings only

---

*End of audit.*

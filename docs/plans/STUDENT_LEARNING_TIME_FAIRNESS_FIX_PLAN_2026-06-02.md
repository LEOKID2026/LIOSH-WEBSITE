# Student Learning Time Fairness — Implementation Plan

**Date:** 2026-06-02  
**Status:** Plan only — no implementation in this document  
**Prerequisite audit:** [`docs/audits/STUDENT_QUESTION_TIME_AND_REWARD_IMPACT_AUDIT_2026-06-02.md`](../audits/STUDENT_QUESTION_TIME_AND_REWARD_IMPACT_AUDIT_2026-06-02.md)

---

## 1. Problem summary

Regular **learning** and **practice** modes do not show a countdown, so students reasonably assume all thinking time counts—including scratch-paper work without clicks. Today the system:

- Credits at most **120 seconds per question** into `sessionSecondsRef` → `learning_sessions.duration_seconds`, monthly minutes, missions, and `addSessionProgress`.
- Writes **zero** topic localStorage time when a question span is **≥ 300 seconds** (`duration < 300` guard).
- Records **uncapped** `timeSpentMs` on answers for fluency/diagnostics.

That produces **HIGH severity unfairness**: a 6-minute geometry or word-problem attempt may show as ~2 minutes (or 0 in local topic totals) while diagnostics still flag “slow” work—parents and children see contradictory effort signals.

**Goal of this fix:** One shared **credited-effort policy** for learning/practice only, with tiered per-question caps, visibility-aware counting, and session-level anti-farming—without changing challenge/speed **game** timers (20s/10s).

---

## 2. Product decision

| Decision | Detail |
|----------|--------|
| **Scope** | All six subject masters in `mode === "learning"` or `mode === "practice"` (including `focusedPracticeMode`: normal, mistakes, graded). |
| **Out of scope (game rules)** | `challenge` and `speed` — keep existing **120s** session credit cap and existing countdown UI/behavior. |
| **Tiered caps (learning/practice)** | Default **300s**; hard calc/geometry/word-problem/multi-step **480s**; long reading/comprehension **600s**. |
| **Visibility** | Pause (or stop) **credited** time while tab/page hidden; do not use click-idle as primary signal. |
| **Anti-gaming** | Global per-session credited ceiling + per-question tier cap; visibility must be “on” for credit to accrue. |
| **localStorage topics** | Replace discard-at-300s with **credit up to tier cap** (never zero solely for being slow). |
| **Per-answer `timeSpentMs`** | Unchanged for diagnostics; optional **display-only** reconciliation in reports later—not required for v1. |
| **Assigned quiz `time_limit_seconds`** | **Not in this plan** — separate follow-up (§10). |
| **DB schema** | **No change** — larger `duration_seconds` values only. |
| **Hebrew copy / CSS** | **No change** in v1 (behavior-only). |

---

## 3. Current files/functions affected

### 3.1 Six masters (primary edits)

| File | Functions / sites to refactor |
|------|-------------------------------|
| `pages/learning/math-master.js` | `accumulateQuestionTime`, `trackCurrentQuestionTime`, `generateNewQuestion` (LS blocks ~1571, 1694, 1783), `recordSessionProgress` |
| `pages/learning/geometry-master.js` | `accumulateQuestionTime`, `generateNewQuestion` (~857, 1134), `recordSessionProgress` |
| `pages/learning/hebrew-master.js` | `accumulateQuestionTime`, `trackCurrentQuestionTime` (~1758), `recordSessionProgress` |
| `pages/learning/english-master.js` | `accumulateQuestionTime`, `trackCurrentQuestionTime` (~958), `recordSessionProgress` |
| `pages/learning/science-master.js` | `trackCurrentQuestionTime` (caps ms ~1466), `recordSessionProgress` |
| `pages/learning/moledet-geography-master.js` | `accumulateQuestionTime`, `trackCurrentQuestionTime` (~1507), `recordSessionProgress` |

**Pattern to remove:** `Math.min(elapsed, 120_000)` and `duration > 0 && duration < 300` in learning/practice paths.

### 3.2 Time tracking storage (secondary — call sites only)

| File | Role |
|------|------|
| `utils/math-time-tracking.js` | `trackOperationTime`, `trackGeometryTopicTime` — accept credited seconds as today (no cap inside util). |
| `utils/hebrew-time-tracking.js` | `trackHebrewTopicTime` |
| `utils/english-time-tracking.js` | `trackEnglishTopicTime` |
| `utils/science-time-tracking.js` | `trackScienceTopicTime` |
| `utils/moledet-geography-time-tracking.js` | `trackMoledetGeographyTopicTime` |

### 3.3 Progress & rewards (consumers — verify only)

| File | Role |
|------|------|
| `utils/progress-storage.js` | `addSessionProgress` — receives minutes from masters; no logic change. |
| `pages/api/learning/session/finish.js` | Persists `duration_seconds` |
| `lib/learning-supabase/learning-coin-award.server.js` | Coins if `durationSeconds > 0` |
| `lib/learning-supabase/mission-progress.server.js` | Minutes missions |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Sums session minutes |
| `lib/learning-supabase/student-learning-profile.server.js` | `monthlyMinutesIsraelMonth` |

### 3.4 Reports & Copilot (downstream — auto-improve)

| File | Role |
|------|------|
| `lib/parent-server/report-data-aggregate.server.js` | Sums `learning_sessions.duration_seconds` |
| `utils/parent-report-v2.js` | Local LS + `sessionDurationSeconds` |
| `utils/detailed-parent-report.js` | `timeSpentMinutes` |
| `utils/parent-copilot/truth-packet-v1.js` | Row `timeSpentMinutes` / `timeMinutes` |
| `pages/parent/rewards.js` | `LEO_PROGRESS_LOG` — should match after fix if same device |

### 3.5 QA / gates (must update)

| File | Role |
|------|------|
| `scripts/verify-time-cap.mjs` | Today asserts **120_000** — replace or extend |

### 3.6 Unchanged by design

- `handleTimeUp`, `timeLeft`, challenge/speed `useEffect` timers in all masters.
- `pages/api/learning/answer.js` — `timeSpentMs` payload rules.
- Learning book pages (inherit masters after fix).

---

## 4. Proposed shared time-credit policy helper

### 4.1 New modules (recommended layout)

```
utils/learning-time-credit/
  constants.js          # tier ms, session max, legacy challenge cap
  classify-question-tier.js   # pure: subject + question → tier
  compute-credited-ms.js      # pure: visible intervals + tier + session budget
  question-time-ledger.js     # mutable ledger class for one question
  index.js

hooks/
  useLearningVisibilityClock.js   # document.visibilityState + focus/blur

lib/learning-client/
  learning-time-credit-client.js  # thin re-export for masters (optional)
```

**Feature flag (rollback):** `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` (or env read in helper). When false, preserve **120_000** / **300** behavior exactly.

### 4.2 Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `TIER_DEFAULT_MS` | 300_000 | Regular MCQ / short items |
| `TIER_HARD_MS` | 480_000 | Multi-step, geometry conceptual, word problems |
| `TIER_LONG_READING_MS` | 600_000 | Reading / comprehension passages |
| `TIER_LEGACY_GAME_MS` | 120_000 | **challenge** / **speed** only |
| `SESSION_MAX_CREDITED_MS` | 10_800_000 (3 h) | Global abuse guard per `recordSessionProgress` |
| `VISIBILITY_STALE_MS` | optional 1_800_000 (30 min) | If single hidden stretch exceeds this on one question, stop credit until visible again (anti-tab-leave farm) |

### 4.3 Tier classification (pure function)

```text
resolveQuestionTimeCreditTier({ subjectId, gameMode, question }) → 'default' | 'hard' | 'long_reading' | 'legacy_game'
```

**`legacy_game`:** `gameMode === 'challenge' || gameMode === 'speed'` → cap **120s** (unchanged).

**`long_reading` (600s):**

| Subject | Rules (implement as explicit allowlist) |
|---------|----------------------------------------|
| Hebrew | `topic` or `operation` in `reading`, `comprehension`; or `params.kind` matches `/^reading_/` |
| English | `params.kind` story/passage types if present; or `topic` in reading-like keys from generator; `storyOnly` does not change tier alone—use **question** shape |
| Science | `params.kind` or `topic` indicates passage/comprehension (audit generator before coding) |
| Moledet | reading-heavy topic keys (audit `moledet-geography-question-generator.js`) |

**`hard` (480s):**

| Subject | Rules |
|---------|--------|
| Math | `operation === 'word_problems'` OR `params.kind` starts with `wp_` OR contains `multi_step` OR `story_` (align with `math-master.js` ~3043–3048) |
| Geometry | `params.kind` starts with `concept` (align with `geometry-master.js` ~1078) |
| Hebrew | Multi-step grammar, `hebrew_audio_recorded_manual`, complex composition kinds (audit bank) |
| English | Multi-clause translation / grammar construction kinds (audit bank) |
| Science | Multi-step numeric / lab-style kinds (audit bank) |
| Moledet | Multi-part map/analysis kinds (audit bank) |

**`default` (300s):** everything else in learning/practice.

**Precedence:** `long_reading` > `hard` > `default` (if a question matches both, use higher cap).

**Unit tests:** fixture table per subject with real `params.kind` samples from generators (`utils/*-question-generator.js`, `geometry-conceptual-bank.js`).

### 4.4 Visibility-aware ledger (per question)

Each master holds a ref: `questionTimeLedgerRef` created when `setQuestionStartTime(Date.now())`.

**Ledger state:**

- `tierCapMs` from classifier at question mount.
- `visibleAccumulatedMs` — credited so far this question.
- `lastVisibleAt` — timestamp when page became visible; `null` if hidden.
- `hiddenAccumulatedMs` — diagnostic only (not credited).

**API:**

- `ledger.onVisible()` / `ledger.onHidden()` — from hook.
- `ledger.closeQuestion()` → `{ creditedMs, creditedSecForTopic }` — flush interval, apply `min(visibleElapsed, tierCapMs - visibleAccumulatedMs)` cap **per slice**, return total for session + topic track.
- `ledger.peekCreditedMs()` — for mid-session debug panel.

**Replace:**

```js
sessionSecondsRef.current += Math.min(elapsed, 120_000);
```

with:

```js
sessionSecondsRef.current += ledger.closeQuestion().creditedMs; // on boundary
// OR increment from ledger.flushVisibleSlice() if splitting trackCurrentQuestionTime
```

**Important:** `questionStartTime` can remain for **answer `timeSpentMs`** (wall clock submit − start). Ledger is **only** for credited effort.

### 4.5 Session-level guard

In `recordSessionProgress` (shared helper or inline):

```js
const rawTotalMs = sessionSecondsRef.current;
const cappedTotalMs = Math.min(rawTotalMs, SESSION_MAX_CREDITED_MS);
durationSeconds = Math.max(1, Math.round(cappedTotalMs / 1000));
```

Log debug when cap hits (`tracking-debug.js` optional event).

### 4.6 Topic localStorage credit

**Old:** skip tracking if `duration >= 300`.  
**New:** `creditedSec = Math.min(floor(visibleMs/1000), tierCapSec)`; track if `creditedSec > 0`.

Pass **credited** duration into `trackOperationTime` / `track*TopicTime`, not raw wall clock.

---

## 5. Per-subject implementation map

| Subject | Master | Classifier inputs | Hook mount | Special notes |
|---------|--------|-------------------|------------|---------------|
| Math | `math-master.js` | `operation`, `params.kind`, `isStory` | `useLearningVisibilityClock` in game-active block | `trackCurrentQuestionTime` + `accumulateQuestionTime` both use ledger |
| Geometry | `geometry-master.js` | `topic`, `params.kind`, `concept*` | same | Mistake replay path (~855) must close ledger before swap |
| Hebrew | `hebrew-master.js` | `topic`, `operation`, `params.kind`, `answerMode` | same | Audio manual flow (~1780) still closes ledger on neutral finish |
| English | `english-master.js` | `topic`, `params.kind`, story flags on question | same | Dual `track` + `accumulate` ordering preserved |
| Science | `science-master.js` | `topic`, `params.kind`, `assignedGrade` | same | Today caps inside `trackCurrentQuestionTime` — unify to ledger |
| Moledet | `moledet-geography-master.js` | `topic`, `params.kind` | same | Same pattern as english |

**Implementation order (recommended):**

1. Shared util + tests (no master edits).
2. **Geometry** + **Math** (owner complaint hotspots).
3. Hebrew, English, Science, Moledet.
4. Update `scripts/verify-time-cap.mjs` → `scripts/verify-learning-time-credit.mjs`.
5. Virtual-student-qa / simulator thresholds if they assume 120s.

**Challenge/speed path:** branch at start of `accumulateQuestionTime` / `closeQuestion`:

```js
if (mode === 'challenge' || mode === 'speed') {
  return legacyAccumulate(120_000);
}
```

---

## 6. Parent report impact

| Report surface | Data source after fix | Action |
|----------------|----------------------|--------|
| Parent API report (`report-data-aggregate`) | `learning_sessions.duration_seconds` | **None** — auto higher totals |
| Parent Report V2 (local LS) | `mleo_*_time_tracking` | **None** — new credits on device |
| Detailed report | Merged snapshot | Verify row `timeMinutes` increases for slow-question sessions |
| Copilot truth packet | Row `timeSpentMinutes` | **None** — inherits session/row minutes |
| Fluency slow/fast | `timeSpentMs` on answers | May still show “slow” > credited minutes — **acceptable v1**; optional v2: parent copy explains “thinking time per question” vs “credited study minutes” |

**Optional v1.1 (not required for launch):** In `report-data-aggregate.server.js`, add derived field `creditedMinutesFromSessions` vs `avgAnswerMs` consistency flag for internal QA only—**no schema**.

**Historical data:** Past sessions remain capped; reports for old dates unchanged. Document in release notes.

---

## 7. Rewards / coins / streaks / monthly impact

| System | Mechanism | Expected change |
|--------|-----------|-----------------|
| Monthly persistence tiers (100–600 min) | Sum `learning_sessions.duration_seconds` | Students reach tiers faster when doing deep work — **intended** |
| Student lobby progress bar | `monthlyMinutesIsraelMonth` from profile | Aligns with DB |
| Parent `/parent/rewards` | `LEO_PROGRESS_LOG` via `addSessionProgress` | Same session finish → higher `minutes` on that browser |
| Daily missions (`minutes_*`) | `durationSeconds/60` on finish | Easier to complete — **intended** |
| Session coins | `durationSeconds > 0` | More sessions qualify; amount still accuracy-based |
| Daily 300 coin cap | Unchanged | |
| Streaks | Calendar day | Unchanged |

**Fairness review:** Re-run product check on `MONTHLY_MINUTES_TARGET` (600) — may need recalibration later; **out of scope** for this fix.

**Cross-device:** `addSessionProgress` remains local; DB is source of truth for student UI—existing divergence not introduced by this plan.

---

## 8. LocalStorage migration / backward compatibility

| Topic | Plan |
|-------|------|
| **Existing LS keys** | No migration script — historical totals stay as-is. |
| **New sessions** | Write credited seconds up to tier cap. |
| **Pre-fix bug (≥300s → 0)** | Cannot backfill; accept discontinuity at deploy date. |
| **Namespaced keys** `liosh_lp_*` | Unaffected. |
| **Feature flag off** | Old 120s/300 behavior for A/B rollback. |
| **Dev simulator / seed** | Update `scripts/help-center/seed-demo-report-data.mjs` and simulator session builders if they assume 120s caps. |

**Parent report V2 on old data:** Rows may still show low historical minutes; new practice improves forward.

---

## 9. Anti-gaming / idle / visibility rules

### 9.1 Visibility (primary)

- Use **Page Visibility API**: `document.visibilityState === 'visible'`.
- Optional supplement: `window` `focus` / `blur` for edge browsers—visibility is source of truth.
- While **hidden:** do not add to `visibleAccumulatedMs`.
- While **visible:** accumulate `now - lastVisibleAt` on question close or periodic flush.

**Scratch paper:** Student keeps tab visible on desk tablet → time counts up to tier cap. **No click required.**

### 9.2 What we explicitly do not do

- Do **not** pause credit for “no mouse movement” (penalizes thinking).
- Do **not** pause for hint/modal open (v1) — keeps logic simple; optional v2 if product wants hint time excluded.

### 9.3 Anti-farming guards

| Guard | Rule |
|-------|------|
| Per-question tier cap | Max credited = tier (300/480/600s) per question interval |
| Session ceiling | 3 hours credited per finished session |
| Challenge/speed | Stay at 120s/q |
| Hidden stale (optional) | If hidden > 30 min on same question without visible interval, freeze credit until visible |
| Tab visible idle farm | 8 min visible on one MCQ (300s cap) → only 300s credited, not 8 min |

### 9.4 `timeSpentMs` vs credited (diagnostics)

- Submit path continues: `Date.now() - questionStartTime` (full wall).
- If `timeSpentMs > tierCapMs`, diagnostics may label slow while credited = cap — **document** for support; optional later: clamp display in parent fluency only, not storage.

---

## 10. Assigned quiz follow-up item

**Finding (from audit):** `time_limit_seconds` stored; quiz creation requires it; **student activity UI does not enforce** countdown; `timed_out` status rarely set.

**Separate ticket — “Assigned activity quiz timer enforcement”:**

1. Product spec: per-activity vs whole-quiz timer; auto-submit vs block answers.
2. Client: `pages/student/activity/[activityId].js` + shared timer component.
3. Server: transition `student_activity_status` to `timed_out` on expiry; reject late answers.
4. Teacher report: show time limit compliance.
5. QA: classroom sim in `scripts/teacher-portal/teacher-activity-sim.mjs`.

**Explicitly excluded from learning-time fairness PR** to avoid scope creep.

---

## 11. Test plan

### 11.1 Unit tests (new)

| Suite | Cases |
|-------|--------|
| `classify-question-tier.test` | Fixtures per subject: default, hard, long_reading, legacy_game |
| `compute-credited-ms.test` | 90s visible → 90s; 400s visible hard tier → 400s; 500s visible hard → 480s; hidden 10 min + visible 2 min → 2 min |
| `session-cap.test` | Sum 4h credited → clamps to 3h |
| `visibility-ledger.test` | hide/show/hide cycles |

### 11.2 Update automation

| Script | Change |
|--------|--------|
| `scripts/verify-time-cap.mjs` | Deprecate or redirect to `verify-learning-time-credit.mjs` with new caps |
| `scripts/verify-phase26-monthly-persistence.mjs` | Session fixtures with 360s/q |
| `scripts/verify-phase2-missions.mjs` | Minutes mission progress with 8+ min session |

### 11.3 Integration / manual QA

See §12.

### 11.4 Regression

- Challenge mode: 25s on question → still **120s** credited max, game ends at 20s UI.
- Speed mode: same with 10s UI.
- `node scripts/verify-learning-time-credit.mjs` in CI optional step.

---

## 12. QA acceptance criteria

| # | Scenario | Mode | Expected credited (visible) |
|---|----------|------|----------------------------|
| 1 | MCQ 90s think, answer | learning | 90s |
| 2 | Geometry conceptual 6 min, answer | learning | 360s (under 480 cap) |
| 3 | Geometry conceptual 9 min, answer | learning | 480s (cap) |
| 4 | Hebrew reading passage 7 min | learning | 420s |
| 5 | Hebrew reading 11 min | learning | 600s cap |
| 6 | Math word problem `wp_*` 8 min | practice | 480s cap |
| 7 | Tab hidden 5 min, visible 2 min, answer | learning | ~120s (only visible) |
| 8 | Tab visible 20 min on one MCQ | learning | 300s cap (not 1200s) |
| 9 | Challenge: wait 25s, time up | challenge | ≤120s session; game over unchanged |
| 10 | Finish session → DB | learning | `duration_seconds` ≈ sum of credited |
| 11 | Student home monthly bar | learning | Increases by ~6 min after scenario 2 |
| 12 | Parent report API (7d) | learning | `durationSeconds` reflects scenario 2 |
| 13 | Topic LS `mleo_geometry_time_tracking` | learning | Non-zero after 6 min question |
| 14 | Feature flag OFF | learning | Legacy 120s / 300 discard behavior |

**Sign-off owners:** Product (fairness), Parent report QA, Child World (missions/coins).

---

## 13. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Misclassified tier (MCQ gets 480s) | Medium | Allowlist + generator fixtures; telemetry via `tracking-debug` |
| Under-classified (hard gets 300s) | Medium | Start with generous hard rules; expand from audit list |
| Monthly tier inflation | Medium | Product review thresholds post-launch |
| Visibility API false positives (mobile split-screen) | Low | focus+visibility combined |
| Master refactor regressions | Medium | One subject per PR; flag rollback |
| Copilot cites “minutes” that jump day-over-day | Low | Release note; historical unchanged |
| LEO_PROGRESS_LOG vs DB still diverges cross-device | Existing | Out of scope |

---

## 14. Rollback plan

1. Set `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=false` (or remove env) → instant revert to 120s/300 rules in helper.
2. Redeploy front-end only; **no DB rollback** (larger `duration_seconds` values remain valid).
3. If partial subject rollout used, revert per-master imports of ledger.
4. Restore `scripts/verify-time-cap.mjs` in CI.

---

## 15. What must not change

| Area | Constraint |
|------|------------|
| Challenge/speed **UI timers** | 20s / 10s countdown, `handleTimeUp`, lives/score |
| Challenge/speed **session credit** | Remains **120s/q** unless product explicitly revises later |
| `timeSpentMs` answer payload | Full wall time for diagnostics |
| DB schema | No new columns/tables |
| Hebrew UI strings | No copy changes in v1 |
| CSS / layout | No visual timer additions for learning mode |
| Assigned quiz enforcement | Separate project |
| Worksheet/PDF flows | Unchanged |
| Coin formula & daily 300 cap | Unchanged |
| Israel calendar month boundaries | Unchanged |
| `ENABLE_SESSION_COIN_AWARDS` semantics | Unchanged |

---

## Implementation phases (suggested PR sequence)

| Phase | Deliverable | Est. touch |
|-------|-------------|------------|
| **P0** | `utils/learning-time-credit/*` + unit tests + feature flag | ~4 files |
| **P1** | `useLearningVisibilityClock` hook | 1 file |
| **P2** | Math + Geometry masters wired | 2 large files |
| **P3** | Hebrew, English, Science, Moledet | 4 large files |
| **P4** | QA scripts + virtual-student-qa notes | scripts |
| **P5** | Internal doc + release note pointer | docs |

**Total estimated:** 8–12 engineering days including QA and classification audit per generator.

---

## References

- Audit: `docs/audits/STUDENT_QUESTION_TIME_AND_REWARD_IMPACT_AUDIT_2026-06-02.md`
- Existing cap test: `scripts/verify-time-cap.mjs`
- Mode reporting: `utils/report-track-meta.js`

---

*Plan only. No code, schema, copy, or deploy changes.*

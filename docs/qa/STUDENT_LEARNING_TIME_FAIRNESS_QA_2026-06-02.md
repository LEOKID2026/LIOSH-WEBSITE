# Student Learning Time Fairness — QA Report

**Date:** 2026-06-02  
**Scope:** QA only (P0–P3 complete). No deploy, no Vercel env change, no commits in this pass.  
**Feature flag:** `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1` (client; must be `"true"` to enable fairness)

---

## 1. Summary verdict

| Area | Result |
|------|--------|
| Automated tests & verify scripts | **PASS** (118 checks across 5 scripts) |
| Feature flag OFF (legacy rollback) | **PASS** (ledger + topic helpers) |
| Feature flag ON (fairness matrix) | **PASS** (all six subjects, simulated visible time) |
| Master wiring (6 subjects) | **PASS** |
| Report / reward chain (static) | **PASS** (duration flows to DB, missions, coins, parent aggregate) |
| Challenge/speed regression | **PASS** (no P0–P3 edits to `handleTimeUp`; credit stays 120s) |
| Production build | **PASS** (389/389 static pages, exit 0) |
| Live browser E2E with DB | **NOT RUN** (requires local student session + Supabase; see §5) |

**Recommendation:** **Safe to enable in staging** with `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` and a short manual smoke (one long question per subject). **Not yet recommended for production** until staging smoke and parent-facing minute deltas are reviewed once.

---

## 2. Feature flag OFF results

**Default today:** flag is OFF when env is unset or not `"true"` (`utils/learning-time-credit/feature-flag.js`).

| Check | Method | Result |
|-------|--------|--------|
| `isLearningTimeFairnessV1Enabled()` default | unit | OFF |
| Learning/practice `fairnessEnabled` on ledger | `resolveMasterFairnessEnabled("learning", false)` | false |
| Session credit per question | `QuestionTimeLedger` `fairnessEnabled: false` | **120s wall cap** (`legacyAccumulateQuestionMs`) |
| Topic localStorage credit | `topicCreditSecondsFromQuestionClose(..., false, rawSec)` | **0 if raw ≥ 300s**; positive if &lt; 300s |
| Challenge/speed tier | `gameMode` challenge/speed | **legacy_game → 120s** (unchanged) |
| Masters still use ledger | source grep | All six call `finalizeMasterQuestionLedger`; legacy path inside ledger |
| No `duration < 300` in masters | source grep | **Removed** — discard enforced in ledger when flag OFF |

**Normal answering flow:** No changes to answer comparison, feedback, or question generation in this QA pass. `timeSpentMs` remains `Date.now() - questionStartTime` (uncapped) on all six masters.

---

## 3. Feature flag ON results

**Simulation:** `fairnessEnabled: true` on `QuestionTimeLedger` (same code path as `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` in browser).

| Scenario | Expected | Verified |
|----------|----------|----------|
| Default MCQ, 20 min visible | 300s credited | PASS (math + all subjects via scripts) |
| Hard / multi-step, 8–9 min visible | 480s cap | PASS (math wp, geometry concept 9m, science experiments 8m) |
| Long reading, 7 min visible | 420s credited | PASS (hebrew/english comprehension/passage) |
| Long reading, 11 min visible | 600s cap | PASS (hebrew comprehension) |
| Hidden 5 min + visible 2 min | ~120s only | PASS (visibility slice; hidden not credited) |
| Geometry concept 6 min | 360s topic + session | PASS; topic LS non-zero |
| Visibility hook | learning/practice only | PASS (`useLearningVisibilityClock` when flag ON) |
| `timeSpentMs` | full wall clock | PASS (pattern on all masters) |

**Session finish:** `resolveMasterSessionDurationSeconds` applies **3h** cap on accumulated credited ms before `finishLearningSession({ durationSeconds })` and `addSessionProgress(durationMinutes)`.

---

## 4. Per-subject QA table

| Subject | Wired | Flag OFF legacy | Flag ON tiers (sample) | Topic LS (6m concept / long work) | timeSpentMs |
|---------|-------|-----------------|------------------------|-----------------------------------|-------------|
| Math | Yes | 120s / ≥300 discard | default 300s; wp hard 480s | via `trackOperationTime` credited sec | wall clock |
| Geometry | Yes | same | concept hard 480s; 6m → 360s | `trackGeometryTopicTime` | wall clock |
| Hebrew | Yes | same | comprehension long 600s; 7m → 420s | `trackHebrewTopicTime` | wall clock |
| English | Yes | same | passage long; grammar MCQ default | `trackEnglishTopicTime` | wall clock |
| Science | Yes | same | experiments hard 480s | `trackScienceTopicTime` | wall clock |
| Moledet/Geography | Yes | same | maps long_reading; 8m → 480s | `trackMoledetGeographyTopicTime` | wall clock |

Classifier allowlists: `utils/learning-time-credit/classify-question-tier.js` (subject-specific; not all questions marked hard/long).

---

## 5. Parent / report / reward surfaces

### Code-path verification (PASS)

1. **DB `learning_sessions.duration_seconds`**  
   - Masters → `recordSessionProgress` → `resolveMasterSessionDurationSeconds(sessionSecondsRef)` → `finishLearningSession({ durationSeconds })`.  
   - API `pages/api/learning/session/finish.js` writes `duration_seconds` from body.

2. **Monthly minutes (local + profile)**  
   - `addSessionProgress(durationMinutes, ...)` uses credited minutes from session finish (`utils/progress-storage.js`).  
   - Profile refresh after session (`refreshStudentLearningProfileAfterSession`) unchanged.

3. **Parent report API**  
   - `lib/parent-server/report-data-aggregate.server.js` sums `session.duration_seconds` into subject/daily rollups.

4. **Parent rewards / monthly progress**  
   - Lobby/monthly views driven by profile + `LEO_PROGRESS_LOG` local minutes; both increase when `durationMinutes` from finish increases.

5. **Daily minutes mission**  
   - `applySessionToMissions` adds `durationSeconds / 60` to `type: "minutes"` missions (`lib/learning-supabase/mission-progress.server.js`).  
   - QA: 360s → +6 min progress (formula check in `scripts/verify-learning-time-fairness-qa.mjs`).

6. **Coins**  
   - Formula unchanged: base 10; +5 @ 80% acc; +10 @ 95%; requires `durationSeconds > 0`.  
   - Daily cap 300 coins/session awards unchanged.  
   - QA: 360s @ 70% acc → 10 coins (not blocked by fairness).

7. **Streak**  
   - `updateDailyStreak` on correct answers; **not** tied to credited duration — unchanged.

### Live E2E (NOT RUN in this pass)

Requires: local app, authenticated student, `ENABLE_SESSION_COIN_AWARDS` if coin check desired, Supabase row inspection after one 6+ minute learning question with flag ON.

**Staging smoke checklist:**

1. Set `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` locally or on preview only.  
2. Complete one geometry concept question (~6 min, tab visible).  
3. End session; confirm `learning_sessions.duration_seconds` ≈ 360 (not 120, not 0).  
4. Confirm parent report minutes ↑ vs same session with flag OFF.  
5. Confirm topic time in browser LS (`mleo_*_time_tracking`) shows non-zero credited seconds for that topic.

---

## 6. Rewards / monthly / daily missions impact

| System | Uses credited `durationSeconds`? | Change when flag ON |
|--------|--------------------------------|---------------------|
| Session finish → DB | Yes | Higher for long valid work |
| `addSessionProgress` / monthly LS | Yes (`durationMinutes`) | Higher local monthly totals |
| Daily `minutes_*` mission | Yes (`durationSeconds/60`) | Faster mission progress |
| Session coins | Yes (must be &gt; 0) | More sessions qualify for base 10; formula unchanged |
| Coin daily cap 300 | Unchanged | — |
| Monthly persistence tiers (600 min target) | DB/profile minutes | Easier to hit tiers (intended) |
| Streak calendar | No (answer-based) | Unchanged |

---

## 7. Challenge / speed regression

| Item | Result | Notes |
|------|--------|-------|
| Credit tier | PASS | `legacy_game` → 120s cap regardless of fairness flag |
| `handleTimeUp` | PASS | Present on all six masters; **not modified** in P0–P3 |
| UI timers | PASS (unchanged) | Math, geometry, Hebrew, English, Moledet: **20s challenge / 10s speed** |
| Science timers | Pre-existing | **25s challenge / 12s speed** (already in `science-master.js` before fairness work) |
| Hebrew copy / CSS | PASS | No edits in fairness implementation |

---

## 8. Tests / build results

| Command | Result |
|---------|--------|
| `node --test tests/learning/learning-time-credit.test.mjs` | **19/19 pass** |
| `node scripts/verify-learning-time-credit.mjs` | **30/30 pass** |
| `node scripts/verify-math-geometry-time-credit-wiring.mjs` | **20/20 pass** |
| `node scripts/verify-all-masters-time-credit-wiring.mjs` | **49/49 pass** |
| `node scripts/verify-learning-time-fairness-qa.mjs` | **61/61 pass** (this QA pass) |
| `npm run build` | **Exit 0**; **389/389** static pages |

**Build note:** Previous ENOENT `.next` unlink issues were environmental. This QA build completed successfully **without** cleaning `.next` first.

---

## 9. Remaining risks

1. **Book snapshot return** — Restoring from learning book does not reopen ledger with original open timestamp (documented; not fixed in P0–P3).  
2. **Tier misclassification** — Wrong tier only affects credited minutes, not `timeSpentMs`.  
3. **Parent copy vs diagnostics** — Reports can still show “slow” answers while credited minutes are capped (accepted v1).  
4. **Science challenge timers** — 25s/12s differs from other masters (pre-existing).  
5. **Cross-device minutes** — `addSessionProgress` local vs DB profile divergence (pre-existing).  
6. **No production live test yet** — Staging smoke with real student session still required.  
7. **Historical sessions** — Past rows remain under old caps; reports show discontinuity at enable date.

---

## 10. Recommendation: safe or not safe to enable env

| Environment | Recommendation |
|-------------|----------------|
| **Production (`NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1`)** | **Do not enable yet** — wait for staging smoke + parent minute review |
| **Staging / preview** | **Safe to enable** — run manual checklist in §5 |
| **Local dev** | **Safe** — use `.env.local`: `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` |

**Rollback:** Remove env or set to anything other than `"true"` → immediate return to legacy 120s session cap and topic ≥300s discard via ledger `fairnessEnabled: false`.

---

## QA artifacts

- `scripts/verify-learning-time-fairness-qa.mjs` — consolidated QA script (flag OFF/ON, masters, challenge, report chain)  
- Related: `scripts/verify-all-masters-time-credit-wiring.mjs`, `docs/plans/STUDENT_LEARNING_TIME_FAIRNESS_FIX_PLAN_2026-06-02.md`, `docs/audits/STUDENT_QUESTION_TIME_AND_REWARD_IMPACT_AUDIT_2026-06-02.md`

**Explicitly not done in this pass:** deploy, commit, push, Vercel env change, Hebrew/UI/CSS/DB schema/assigned-quiz changes, live Supabase E2E.

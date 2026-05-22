---
name: Child World MVP Work Plan
overview: "Create `docs/CHILD_WORLD_PHASE_1_2_WORK_PLAN.md` — a practical, checkpoint-driven implementation guide for MVP Phase 1+2 (session coin awards, daily missions, monthly persistence reward). Docs-only: no code, no migrations, no UI changes."
todos:
  - id: write-mvp-workplan-doc
    content: Create docs/CHILD_WORLD_PHASE_1_2_WORK_PLAN.md with all 11 sections
    status: pending
isProject: false
---

# Child World MVP Work Plan — Document Creation

## What will be created

One new file: `docs/CHILD_WORLD_PHASE_1_2_WORK_PLAN.md`

No other files will be touched.

## Document structure and content

### Section 1 — MVP Goal
State that the goal is to make learning immediately and visibly rewarding:
- coins appear in the balance after a session completes
- three daily missions appear on `/student/home` with progress bars
- a monthly persistence bar shows current minutes vs next tier threshold
- no visual redesign, no cards, no shop, no avatar changes

### Section 2 — User Experience
What the student sees after MVP on `/student/home` (additive to existing dashboard):
- existing coin balance (already shown in hero from `/api/student/me`)
- **new:** daily missions panel — 3 checkboxes with progress, coin reward shown
- **new:** monthly persistence bar — "X / 100 minutes → 10,000 coins" with tier markers at 100/250/400/600
- no layout overhaul; new sections added below existing content

### Section 3 — Backend Work Plan

Six distinct backend tasks, in dependency order:

| # | Task | File(s) |
|---|---|---|
| 3A | Coin award helper | new `lib/learning-supabase/learning-coin-award.server.js` |
| 3B | Wire coin award into session finish | `pages/api/learning/session/finish.js` |
| 3C | Monthly display cache update on session finish | same finish handler or helper |
| 3D | Mission progress update on session finish | new `lib/learning-supabase/mission-progress.server.js` |
| 3E | Extend home-profile payload | `pages/api/student/home-profile.js` |
| 3F | Month-end reward job | new `lib/learning-supabase/monthly-persistence-reward.server.js` |

Key rules called out explicitly:
- 3B: idempotency key = `coin_session_{learningSessionId}` prevents double-award
- 3B: 0-second or invalid sessions → no award
- 3B: daily cap = 300 coins/day from session rewards (excluding monthly reward)
- 3C: `challenges.monthly.activeMinutes` updated as cache only; `learning_sessions` is authoritative
- 3F: month-end job queries `learning_sessions` directly (see SQL pattern in execution plan Section 7)
- 3F: idempotency key = `monthly_persistence_{studentId}_{year}_{month}`
- 3F: MVP trigger = manual/admin for first run; automatic scheduling is a post-MVP decision (owner D8 pending)

### Section 4 — Frontend Work Plan

Three additive changes to `/student/home.js` only:

| # | Task | Note |
|---|---|---|
| 4A | Daily missions panel component | Reads `homePayload.challenges.daily.missions`; shows progress bar + coin reward per mission |
| 4B | Monthly persistence progress bar | Reads `homePayload.challenges.monthly`; shows minutes vs tiers; tier markers |
| 4C | Coin balance refresh after session | No change needed — `/me` already provides balance; refresh trigger on page focus |

Also: `lib/learning-client/studentHomeDashboardClient.js` extended to map `challenges` field into view model.

All Hebrew text is placeholder only (`[OWNER APPROVAL REQUIRED]`) until owner approves copy.

Loading, empty, and error states called out for each new component.

### Section 5 — Data Flow

Two flows documented as mermaid diagrams:

**Per-session flow:**
```
StudentFinishesSession → POST /api/learning/session/finish
  → update learning_sessions (existing)
  → award session coins → coin_transactions (new)
  → update daily cap counter (new)
  → advance mission progress → challenges.daily (new)
  → update monthly display cache → challenges.monthly.activeMinutes (new)
  → return { ok: true } (unchanged shape)

StudentVisitsHome → GET /api/student/home-profile
  → read student_learning_state (existing)
  → return payload including challenges (new field exposed)
  → buildStudentHomeView maps challenges → missions panel + monthly bar (new)
```

**Month-end flow:**
```
Trigger (manual admin OR scheduled job)
  → query learning_sessions WHERE student_id + month + status=completed
  → SUM(duration_seconds)/60 = activeMinutes
  → compare to tiers (100/250/400/600)
  → if no tier reached → no award
  → if tier reached → write coin_transactions (idempotency key)
  → update student_coin_balances
  → update challenges.monthly.rewardAwarded = true
```

### Section 6 — Files Likely Touched

Exact file list with roles:
- [`pages/api/learning/session/finish.js`](pages/api/learning/session/finish.js) — add coin award + cache update + mission advance after existing session write
- [`pages/api/student/home-profile.js`](pages/api/student/home-profile.js) — expose `challenges` field (already in `student_learning_state`; just needs to be included in response)
- [`pages/student/home.js`](pages/student/home.js) — add missions panel + monthly bar UI sections
- [`lib/learning-client/studentHomeDashboardClient.js`](lib/learning-client/studentHomeDashboardClient.js) — map `challenges` into view model
- New: `lib/learning-supabase/learning-coin-award.server.js`
- New: `lib/learning-supabase/mission-progress.server.js`
- New: `lib/learning-supabase/monthly-persistence-reward.server.js`

### Section 7 — Files Not Touched

Explicit list:
- All `pages/learning/*-master.js` (6 files)
- `pages/api/learning/session/start.js`
- `pages/api/learning/answer.js`
- All `pages/learning/parent-report*.js`
- All `lib/parent-server/`
- All `utils/diagnostic-engine-v2/`
- All `utils/active-diagnostic-runtime/`
- All `utils/adaptive-learning-planner/`
- All `supabase/migrations/` (existing — new migration file only if needed)
- Hebrew audio pipeline
- `scripts/virtual-student-qa/` (QA scripts unchanged)

### Section 8 — Required Owner Decisions Before Implementation

Five open decisions for this MVP specifically:
1. Confirm per-session formula (10 base / +5 at 80% / +10 at 95%) — marked as approved baseline in 16A but needs implementation sign-off
2. Confirm daily cap of 300 coins/day from session rewards
3. Approve mission pool text (Hebrew, grade-banded — content not yet written)
4. Confirm month-end trigger: manual admin action for first MVP deployment, or automatic cron from day one
5. Approve UI placement on `/student/home` — below existing dashboard sections or above

### Section 9 — Implementation Checkpoints

Six checkpoints, each requiring owner review before proceeding:

| Checkpoint | Deliverable | Review criteria |
|---|---|---|
| A | Backend coin award only (no UI) | Simulated session → balance increases; idempotency works |
| B | Backend monthly reward calculator | Manual trigger → correct tier awarded; 87 min → no award |
| C | Backend daily mission state | Mission progress advances on session finish; resets daily |
| D | Home-profile payload extended | API returns `challenges` field correctly for all test students |
| E | `/student/home` UI additions | Missions panel + monthly bar render; existing page unchanged |
| F | Final verification (all gates) | Full QA pass including virtual-student D2 run |

### Section 10 — Acceptance Criteria

Fourteen pass/fail tests:
1. Completed session → `coin_transactions` row written
2. Same session finished twice → no double award (idempotency)
3. Session with `durationSeconds = 0` → no coin award
4. Invalid/missing `learningSessionId` → no coin award, 400 error
5. Student completes sessions beyond daily cap → awards stop at 300 coins/day
6. Monthly reward calculation queries `learning_sessions` directly
7. Student with 87 verified minutes → no monthly reward
8. Student with 105 verified minutes → 10,000 coins awarded
9. Student with 260 verified minutes → 30,000 coins awarded
10. Student with 650 verified minutes → 100,000 coins awarded (not 200,000)
11. Same student + same month → monthly reward awarded exactly once
12. Mission progress advances only from `status: "completed"` sessions
13. `/student/home` loads for all 12 AAA test students after changes
14. Virtual-student QA Phase D2 daily run passes without driver script changes

### Section 11 — Risks and Rollback

**Risks:**
- Coin inflation: per-session award too high → devalues monthly reward
- Duplicate awards: idempotency key collisions or missing keys
- Stale monthly cache: display shows different minutes than authoritative `learning_sessions` sum
- Homepage clutter: two new UI sections may crowd existing dashboard
- Mission text quality: Hebrew copy not yet approved, placeholder ships
- Breaking existing dashboard: new `home-profile` payload fields could cause null-reference errors in existing code

**Rollback mechanisms to plan for (feature flags):**
- `ENABLE_SESSION_COIN_AWARDS` env flag — disables coin writes in finish handler without deploy
- `SHOW_MISSIONS_PANEL` client flag — hides missions UI without touching session logic
- `SHOW_MONTHLY_PERSISTENCE_BAR` client flag — hides bar independently
- Month-end job: always manual-trigger first; never automated before at least one successful manual run is verified

## No other files changed

This plan creates only `docs/CHILD_WORLD_PHASE_1_2_WORK_PLAN.md`. Zero product files are modified.

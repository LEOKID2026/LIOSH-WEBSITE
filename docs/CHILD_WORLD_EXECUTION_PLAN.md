# Child World Execution Plan

**Document type:** Formal execution plan — owner approval required before any implementation  
**Status:** DRAFT — awaiting owner approval  
**Created:** 2026-05-22  
**Based on:** Codebase audit performed 2026-05-22 (all findings read-only)  
**Product:** Hebrew RTL learning website for children, grades 1–6  

---

> **APPROVAL RULE (Section 17)**  
> No implementation may begin until the owner explicitly approves this document and the specific phase to execute.

---

## 1. Purpose

The student-facing home page (`/student/home`) currently presents the child with a statistics dashboard: a list of numbers, accuracy rates, and subject cards. While the data is accurate, the presentation is not designed for children aged 6–12 and does not create emotional engagement or daily motivation to return.

The goal of the Child World project is to transform the student home page — and the broader student experience — into a personal learning world that:

- Greets the child as a character with a room, an identity, and goals
- Rewards real, verified learning activity with meaningful internal recognition
- Makes daily learning feel like progress toward something the child wants to see grow
- Gives the child things to discover, collect, and personalize — all earned through education
- Does not gamify in ways that replace or undermine learning
- Does not change the learning content, the question engines, or the diagnostic systems

The Child World is a **motivation and engagement layer on top of the existing learning platform**. It does not change how learning works. It changes what the child sees when they arrive, when they finish a session, and what they have to look forward to.

---

## 2. Product Boundaries

The following boundaries are permanent and non-negotiable for this project:

### What this is

- An **internal student experience** for the Hebrew learning website only
- An **internal learning coin system** — coins exist only within this website, earned only through verified learning activity, and spent only within this website's student shop
- A **cosmetic and motivational reward system** — cards, avatar items, room decorations, and visual effects
- An **engagement layer** that strengthens the learning habit without replacing learning

### What this is not

- Not connected to cryptocurrency, blockchain, NFTs, or any distributed ledger
- Not connected to any external token, presale, or coin project
- Not a real-money purchase system — no payments, no in-app purchases, no premium currency
- Not a trading system — cards and items cannot be transferred between students
- Not an external value system — nothing earned inside the site has value outside of it
- Not a replacement for learning — games are a bonus social area, not the primary activity

### Terminology

Legacy internal code names (such as `mleo_*` in localStorage keys and legacy file names) may appear in the codebase. These are technical identifiers only. This plan uses the following product terminology exclusively:

| This plan uses | Legacy code may say |
|---|---|
| Learning Coins | coin, mleo coin |
| Student Shop | shop, store |
| Child World / Student World | (no prior product name) |
| Online Games Area | arcade, student arcade |
| Fun Zone | mleo games, public games |
| Learning Subjects | masters, subject games |
| Student Collection | inventory, vault |

---

## 3. Current Existing Foundation

The following features are fully built and working as of the audit date. No changes are needed to these for the Child World to begin planning. This section documents what can be built upon.

### Student identity and session

- Student login via username + 4-digit PIN (`/student/login`, `pages/api/student/login.js`)
- HTTP-only session cookie, 7-day max age (`lib/learning-supabase/student-auth.js`)
- Student profile: name, grade level, avatar emoji or custom image
- `StudentAvatarPickerModal` — working avatar picker persisted to server
- `student_learning_state` table (Supabase, migration `017`) — one row per student, stores subjects JSON, monthly progress, challenges, streaks, achievements, and profile

### Student home/dashboard

- `/student/home` — working dashboard page
- Shows: avatar, name, coins, 10 stat cards, monthly journey bar, 6 subject cards, badges, recommendation block
- Data served by `GET /api/student/home-profile`
- View model built by `lib/learning-client/studentHomeDashboardClient.js`

### Learning subjects (6 working subject masters)

- `/learning/math-master` — procedural math questions, all operations, grades 1–6
- `/learning/geometry-master` — procedural + conceptual bank, topics by grade
- `/learning/hebrew-master` — Hebrew language, MCQ + typing + audio tasks
- `/learning/english-master` — English MCQ, vocabulary, grammar, sentences
- `/learning/science-master` — Science MCQ, static question bank by grade
- `/learning/moledet-geography-master` — Geography/homeland MCQ, static bank by grade

### Active time tracking and anti-idle

- Each question tracks `questionStartTime = Date.now()` when displayed
- When a student advances, `elapsed = Date.now() - questionStartTime`
- Elapsed is **capped at 60,000 ms (60 seconds)** per question: `Math.min(elapsed, 60000)`
- This accumulated sum becomes `durationSeconds` sent to `POST /api/learning/session/finish`
- **Idle time is automatically excluded** — a student who stares at a question for 5 minutes contributes only 60 seconds to their session duration
- There is no mouse/keyboard/visibility idle detection — the per-question cap is the mechanism

### Learning session persistence (Supabase)

- `POST /api/learning/session/start` → inserts `learning_sessions` row
- `POST /api/learning/answer` → inserts `answers` row per question
- `POST /api/learning/session/finish` → updates `learning_sessions` with `duration_seconds`, `status: "completed"`, accuracy summary
- All three use service-role Supabase access. The virtual-student QA harness asserts on all three

### Coin and shop infrastructure (exists but partially unused)

- `student_coin_balances` — Supabase table, one row per student, balance + lifetime earned/spent
- `coin_transactions` — full ledger with `direction`, `amount`, `reason`, `source_type`, `source_id`, `idempotency_key`
- `coin_reward_rules` / `coin_spend_rules` — config tables for earn/spend rules
- `shop_items` — shop catalog table (exists, no data seeded, no student UI)
- `student_inventory` — owned items per student (exists, always empty, no student UI)
- Currently, coins are **only awarded through winning multiplayer online game matches** — learning sessions do not award coins

### Online games (existing, fully working)

- **Online Games Area** (`/student/arcade`, `/student/games/*`) — 7 multiplayer games (Connect Four, Checkers, Chess, Snakes & Ladders, Dominoes, Bingo, Ludo), room-based, authenticated, coin-entry and pot-payout system
- **Solo Leo games** (`/game`, `/student/solo-games/*`) — 10 authenticated solo games with coins/diamonds rewards
- **Offline Games** (`/offline/*`) — 4 same-device local games, no persistence

### Parent reports (fully working, must not be disrupted)

- `GET /api/parent/students/[studentId]/report-data` — full learning analytics
- Returns: sessions, accuracy per subject, daily activity, diagnostic evidence, learning time
- Built from `learning_sessions` + `answers` + `student_learning_state`
- Three-layer diagnostic engine: in-session probes, post-session adaptive planner, parent-report Diagnostic Engine V2

### Diagnostic engine (fully working, must not be touched)

- `utils/active-diagnostic-runtime/` — in-session probe routing
- `utils/adaptive-learning-planner/` — post-session recommendations
- `utils/diagnostic-engine-v2/` — parent-report analysis

---

## 4. Target Child World Concept

When the Child World is complete, the student experience looks like this:

### Student World / Room

When a logged-in student visits `/student/home` (or a new `/student/world` route — see Owner Decision D8), they see a **personal room or world**, not a statistics table. The room is a visual space that grows with the student's learning:

- A simple room starts at registration
- New visual areas, furniture, and decorations unlock as the student reaches learning milestones
- The room can be personalized with items purchased in the Student Shop

### Avatar

The student has a character avatar. The existing emoji/image picker becomes an "outfit your character" experience over time. Avatar items (clothing, accessories, character skins) are purchasable from the Student Shop using Learning Coins.

### Missions

Every day, the student sees 3 daily missions on their world home screen:
- "Answer 10 math questions today"
- "Practice two different subjects"
- "Complete a challenge session"

Weekly missions and monthly goals also exist. Missions are completed by doing real learning sessions. Completing a mission awards Learning Coins.

### Monthly Persistence Reward

The Monthly Persistence Reward is the **largest single reward in the Child World economy**. It is awarded once per month, at the end of the month, based solely on verified active learning minutes accumulated during that calendar month.

**Reward tiers (tier-based, not cumulative):**

| Verified active learning minutes | Learning Coins awarded |
|---|---|
| 100 minutes/month | 10,000 coins |
| 250 minutes/month | 30,000 coins |
| 400 minutes/month | 60,000 coins |
| 600+ minutes/month | 100,000 coins |

**Rules:**
- The reward is **tier-based**: a child who reaches 600 minutes receives **100,000 coins total** for the month — not the sum of all tiers below.
- The maximum monthly reward is **100,000 Learning Coins**.
- Only verified active learning time counts. Idle screen time does not count.
- The existing **60-second-per-question cap** is the active learning validation mechanism — the same `duration_seconds` value written to `learning_sessions` at session finish is used.
- The reward is calculated and awarded once per month by a server process that sums all qualifying `learning_sessions.duration_seconds` for that student within the month.
- This reward is internal to the Child World. No real money, no external value.

The Monthly Persistence Reward is deliberately large. It is the primary motivator for sustained daily learning throughout the month, not just occasional sessions. All other coin earn rates (per-session, per-mission, per-game) are calibrated to be meaningful but clearly smaller than the monthly reward, so that consistent monthly effort always yields the largest payoff.

### Monthly Progress Bar

The existing monthly learning goal (minutes of active learning) is preserved and visualized as a progress bar in the student world, showing current progress toward each reward tier. The progress bar displays the child's current minutes and which tier they are approaching next.

### Learning Coins

The student earns Learning Coins by:
1. **Monthly Persistence Reward** (by far the largest — up to 100,000 coins/month for sustained learning)
2. Completing learning sessions (regular per-session awards)
3. Completing daily/weekly missions (significant)
4. Winning online games (minor bonus only, strictly capped)

Coins are spent in the Student Shop.

### Cards and Collection

Students collect educational cards — visual cards with subjects, facts, characters, and achievements. Cards are obtained by:
1. Opening card packs purchased with Learning Coins
2. Completing certain missions or milestones
3. Cannot be obtained any other way

Card collection is displayed as a personal collection board in the student world.

### Student Shop

An internal shop accessible from the student world where students spend Learning Coins on:
- Card packs (3 cards per pack, varying rarity)
- Avatar items (clothing, accessories)
- Room decorations (furniture, posters, plants)
- Visual effects (color themes, sparkle effects)
- Special badge frames

No real-money purchases. No premium currency. All items cost only Learning Coins.

### Online Games Area

The existing Online Games Lobby (`/student/arcade`) is accessible from the student world as a clearly labeled bonus/social area. It remains coin-gated (spending coins to enter a match). Winning games awards a small daily-capped bonus of Learning Coins. Games are always secondary to learning in the UI hierarchy.

### Parent-Safe Visibility

Parents see learning progress only — minutes, accuracy, missions completed, subjects practiced. Parents do not see detailed cosmetics, card names, or room decorations.

---

## 5. MVP Definition

The MVP is the smallest version of the Child World that is safe, useful, and visible to students without breaking anything that currently works.

### MVP includes

1. **Learning Coins awarded from learning sessions** — a student who completes a learning session earns Learning Coins. The amount is determined by duration and accuracy (owner must approve per-session amounts in Decision D1). The coin balance visible on `/student/home` increases after learning.
2. **Three daily missions visible on `/student/home`** — a simple panel showing today's missions with progress bars. Completing a mission awards additional coins.
3. **Monthly Persistence Reward tracking and award** — the server tracks each student's total verified active learning minutes for the current month by summing `learning_sessions.duration_seconds` (authoritative source of truth) for all completed sessions within the calendar month. At month end (or on the first day of the following month), the server queries `learning_sessions` directly to calculate which tier was reached and credits the corresponding coins (10K / 30K / 60K / 100K) in a single `coin_transactions` entry with `reason: "monthly_persistence_reward"`. The `/student/home` monthly progress bar shows a cached display of current minutes and the next tier threshold — this cache is for display only and is not used as the basis for the reward calculation.
4. **No UI redesign of `/student/home`** — the missions panel and monthly tier progress bar are added as new sections. The existing dashboard structure is preserved.

### MVP explicitly excludes

- Visual world/room redesign
- Avatar items or outfit changes
- Card collection
- Student Shop
- Room decorations
- Personalized/diagnostic missions
- Weekly missions (can be considered for MVP+ after daily missions work)
- Any changes to learning master pages
- Any changes to parent reports
- Any changes to the session/answer/finish APIs beyond the coin award hook in `session/finish`

### MVP success criteria

- A student who completes a learning session sees their coin balance increase
- A student who visits `/student/home` sees today's 3 missions and their current progress
- A student who visits `/student/home` sees the monthly tier progress bar with current minutes and next tier target
- Completing a mission fires a coin award and the transaction is recorded in `coin_transactions`
- At month end, a student who reached a tier receives the correct monthly reward (10K / 30K / 60K / 100K) as a single transaction
- A student who did not reach 100 minutes receives no monthly persistence reward for that month
- The virtual-student QA daily run passes without modification to the QA driver scripts
- The parent report is unchanged

---

## 6. Phased Implementation Plan

### Phase 0 — Owner Decisions + Baseline QA

**Goal:** Finalize all unanswered owner decisions (Section 16) and confirm the QA baseline is stable before any code is written.

**Scope:**
- Owner reviews and approves this document
- Owner answers all decisions in Section 16
- QA team confirms virtual-student Phase D2 daily run passes for all 12 AAA test students
- Parent report API confirmed stable
- No code changes of any kind

**Files touched:** None  
**Files not touched:** Everything  
**Data changes:** None  
**QA required:** Full Phase D2 daily run passes  
**Owner approval checkpoint:** This entire document must be approved before Phase 1 begins

---

### Phase 1 — Server-Side Learning Coin Awards

**Goal:** Students earn Learning Coins when they finish a real, verified learning session. No UI changes. No student-visible changes except the coin balance on `/student/home` increasing.

**Scope:**
- Add coin-award logic inside `POST /api/learning/session/finish` (server-side only, service role)
- Use `coin_reward_rules` table or server constants (owner decision D1 and D2) for amounts
- Write a `coin_transactions` row: `reason: "learning_session"`, `source_type: "session"`, `source_id: learningSessionId`, with idempotency key to prevent double-award
- `student_coin_balances` updated by existing coin-apply mechanism
- Daily/session cap enforced server-side

**Files likely touched:**
- `pages/api/learning/session/finish.js` — add coin award call after session is written
- `lib/learning-supabase/learning-activity.js` — may need a coin-award helper
- Possibly a new `lib/learning-supabase/learning-coin-award.server.js` (new file, not editing existing)

**Files not touched:**
- `pages/api/learning/session/start.js` — unchanged
- `pages/api/learning/answer.js` — unchanged
- All learning master pages — unchanged
- All parent report files — unchanged
- `supabase/migrations/` (existing) — no schema changes needed; tables exist

**Data changes:**
- New rows in `coin_transactions` after each qualifying session
- Updates to `student_coin_balances.balance` and `lifetime_earned`
- No schema changes; existing tables used

**QA required:**
- Virtual-student QA Phase D2 daily run must still pass without changes to driver scripts
- New assertion: coin balance after simulated session ≥ balance before session
- Idempotency test: same `learningSessionId` called twice does not double-award
- Daily cap test: student completes >N sessions in one day, extra sessions do not over-award

**Owner approval checkpoint:** Owner approves coin amounts and daily cap before Phase 1 begins (Decisions D1, D2)

> **✅ Owner Decision (2026-05-22): Asia/Jerusalem calendar — mandatory for all student-facing day/month logic**
>
> All student-facing daily resets (daily caps, daily missions, streaks) and monthly progress
> display **must** use `Asia/Jerusalem` calendar boundaries. UTC midnight and UTC calendar
> months must never be used for student-facing logic.
>
> **Shared helper:** `lib/learning-supabase/israel-calendar.server.js`
> - `getIsraelDateString()` — today's date in Israel (`YYYY-MM-DD`)
> - `getTodayIsraelMidnightUtc()` — Israel day start as UTC instant
> - `getIsraelMonthBounds()` — Israel month start/end as UTC instants + `ym` key
>
> **Phase 1 (daily cap):** `learning-coin-award.server.js` uses `getTodayIsraelMidnightUtc()`.
>
> **Phase 2 (monthly display):** `computeStudentLearningDerived()` in
> `student-learning-profile.server.js` uses `getIsraelMonthBounds()` for
> `monthlyMinutesIsraelMonth` / `yearMonthIsrael`. Legacy field names
> (`monthlyMinutesUtcMonth`, `yearMonthUtc`) are kept as aliases with identical values —
> they are misnamed and should be migrated away in a future cleanup.

---

### Phase 2 — Daily Missions Panel

**Goal:** Students see 3 daily missions on `/student/home` and earn coins by completing them through real learning activity.

**Scope:**
- Define a static daily mission pool (owner approves pool at this phase)
- Server selects 3 missions per student per day, based on grade level and recent activity
- Mission progress updated server-side when `session/finish` is called (checking if any active missions are now advanced or completed)
- Mission completion awards coins and writes a `coin_transactions` row
- `student_learning_state.challenges` field (currently empty) populated with today's missions JSON
- A new section on `/student/home` renders the missions panel (first visible UI addition)
- Missions reset at midnight (daily)

**Proposed `challenges` JSON shape:**
```json
{
  "daily": {
    "date": "2026-05-22",
    "missions": [
      {
        "id": "m_math_10q",
        "label": "ענה על 10 שאלות חשבון",
        "target": 10,
        "progress": 3,
        "done": false,
        "coinReward": 20
      }
    ]
  },
  "weekly": { "weekStart": "2026-05-18", "missions": [] },
  "monthly": {
    "month": "2026-05",
    "activeMinutes": 87,
    "currentTier": null,
    "nextTierMinutes": 100,
    "nextTierReward": 10000,
    "rewardAwarded": false
  },
  "milestones": []
}
```

The `monthly.activeMinutes` field is a **display cache only**. It is updated server-side as a convenience when a session finishes so that `/student/home` can show the progress bar without querying `learning_sessions` on every page load. It is **not** the authoritative source for the Monthly Persistence Reward calculation.

> **Source of truth rule:** The month-end reward calculation always queries `learning_sessions.duration_seconds` directly (summing all `status: "completed"` sessions for the student within the calendar month). If `monthly.activeMinutes` in the cached JSON ever differs from the live `learning_sessions` sum, the `learning_sessions` sum wins. The reward is based on the authoritative session data, not the cached value.

**Files likely touched:**
- `pages/api/student/home-profile.js` — include missions in payload
- `pages/api/learning/session/finish.js` — advance mission progress after session
- `lib/learning-client/studentHomeDashboardClient.js` — include missions in view model
- `pages/student/home.js` — add missions panel UI section
- Possibly a new `lib/learning-supabase/mission-progress.server.js` (new file)

**Files not touched:**
- All learning master pages — unchanged
- `pages/api/learning/session/start.js` — unchanged
- `pages/api/learning/answer.js` — unchanged
- All parent report files — unchanged
- All diagnostic engine files — unchanged

**Data changes:**
- `student_learning_state.challenges` populated (existing field, currently empty)
- New `coin_transactions` rows for mission completions

**QA required:**
- Virtual-student QA Phase D2 daily run passes
- Simulated session advances correct mission progress
- Mission completion fires coin award
- Daily missions reset correctly
- Home-profile API returns missions correctly for new students (empty/seeded state)

**Owner approval checkpoint:** Owner approves mission pool content and coin rewards for missions before Phase 2 begins (Decision D3)

---

### Phase 3 — Cards, Collection, and Student Shop

**Goal:** Students can spend Learning Coins on card packs and browse their collection.

**Scope:**
- Seed `shop_items` table with initial card pack catalog (common pack, rare pack, etc.)
- Seed a `cards` catalog (if separate from `shop_items` — see Decision D4)
- New route: `/student/shop` — shows available items with coin prices
- New route: `/student/collection` — shows owned cards as a grid
- Server: card pack purchase flow — spend coins → draw N cards from catalog based on rarity weights → insert rows into `student_inventory`
- Card rarity odds shown transparently on every pack (no hidden odds)
- `/student/home` gains a "My Cards" link and a small collection preview

**Files likely touched:**
- New `pages/student/shop.js`
- New `pages/student/collection.js`
- New `pages/api/student/shop/purchase.js`
- New `pages/api/student/collection.js`
- `pages/_app.js` — add new routes to `STUDENT_PROTECTED_ROUTES`
- `pages/student/home.js` — add collection preview and shop link

**Files not touched:**
- All learning master pages — unchanged
- All session/answer/finish APIs — unchanged
- All parent report files — unchanged
- All diagnostic engine files — unchanged

**Data changes:**
- `shop_items` seeded with card packs and items
- `student_inventory` populated when purchases are made
- `coin_transactions` records each purchase with `reason: "shop_purchase"`, `source_type: "shop_item"`

**QA required:**
- Purchase flow: balance is sufficient → cards appear in inventory
- Purchase flow: balance insufficient → graceful failure, no coin deduction
- Rarity distribution: verify over N simulated purchases the distribution is approximately correct
- Virtual-student QA Phase D2 daily run continues to pass

**Owner approval checkpoint:** Owner approves card content, pack prices, and rarity percentages before Phase 3 begins (Decisions D5, D10)

---

### Phase 4 — Visual Student World / Room Redesign

**Goal:** `/student/home` is visually transformed into a personal room/world. This is the first major UI redesign.

**Scope:**
- Design and implement the room/world visual component
- World Level computed from learning milestones (sessions completed, subjects covered, monthly goals reached) — automatic, no coins required
- Avatar items (purchased in Phase 3) rendered on the avatar character
- Room decorations (purchased in Phase 3) rendered in the room
- Existing stats and monthly progress preserved within the world visual
- Missions panel (from Phase 2) integrated into the world layout

**Files likely touched:**
- `pages/student/home.js` — full redesign of layout and components
- New `components/student/StudentWorldRoom.jsx`
- New `components/student/StudentWorldAvatar.jsx`
- `components/student/StudentAvatarPickerModal.js` — extended for avatar item layering
- `pages/api/student/home-profile.js` — include world level, room items, avatar items in payload
- `lib/learning-client/studentHomeDashboardClient.js` — world level computation

**Files not touched:**
- All learning master pages — unchanged
- All session/answer/finish APIs — unchanged
- All parent report files — unchanged
- All diagnostic engine files — unchanged
- `pages/student/login.js` — unchanged
- Auth flow — unchanged

**Data changes:**
- No new tables required if world state lives in `student_learning_state` (owner Decision D4)
- World Level derived field computed server-side from existing session data

**QA required:**
- `/student/home` loads correctly for all 12 AAA test students after redesign
- Existing home-profile API payload consumed correctly
- Login → home redirect still works
- New UI components have `data-testid` attributes
- Virtual-student QA Phase D2 daily run passes (preflight checks `/student/home` loads)
- Parent report is unchanged

**Owner approval checkpoint:** Owner approves visual design and world layout before Phase 4 begins (Decision D8)

---

### Phase 5 — Personalized / Diagnostic Missions

**Goal:** The adaptive learning planner feeds personalized missions into the child world, so missions reflect each student's actual weak areas.

**Scope:**
- `POST /api/learning/planner-recommendation` output is used as input to generate a "recommended mission" for the student
- This recommended mission appears alongside the static daily missions in the missions panel
- No changes to the planner logic itself — it is used as-is
- Mission labeled as "המלצה אישית" (personal recommendation) so child understands why it was given

**Files likely touched:**
- `lib/learning-client/scheduleAdaptivePlannerRecommendation.js` — read planner output
- `pages/api/student/home-profile.js` — include diagnostic mission in payload if planner has output
- `pages/student/home.js` (or world component) — render the personalized mission

**Files not touched:**
- `utils/adaptive-learning-planner/adaptive-planner.js` — not modified, output consumed
- `pages/api/learning/planner-recommendation.js` — not modified
- All learning master pages — unchanged
- All session/answer/finish APIs — unchanged
- All parent report files — unchanged
- All diagnostic engine files — unchanged

**Data changes:**
- Diagnostic mission stored in `student_learning_state.challenges.daily.missions` alongside static missions

**QA required:**
- Student with identified weak area receives a relevant diagnostic mission
- Student without planner data receives only static missions (no error)
- Planner recommendation endpoint continues to pass its existing tests
- Virtual-student QA Phase D2 daily run passes

**Owner approval checkpoint:** Owner approves the personalized mission feature and labeling before Phase 5 begins

---

## 7. Data Architecture

### What stays server-side (Supabase, authoritative)

| Data | Table | Why server-side |
|---|---|---|
| Learning session records | `learning_sessions` | **Authoritative source of truth** for parent reports, coin awards, and Monthly Persistence Reward calculation |
| Per-question answers | `answers` | Source of truth for accuracy, diagnostic evidence |
| Coin balance | `student_coin_balances` | Financial ledger; must be server-verified |
| Coin transactions | `coin_transactions` | Audit trail; must be server-verified |
| Mission progress | `student_learning_state.challenges` | Must be server-verified; cannot be self-awarded |
| Monthly active minutes (display cache) | `student_learning_state.challenges.monthly.activeMinutes` | Cache for `/student/home` progress bar display only — **not** used as basis for reward calculation; `learning_sessions` always wins on mismatch |
| Monthly Persistence Reward award record | `coin_transactions` with `reason: "monthly_persistence_reward"` | Audit trail; idempotency key prevents double-award |
| Card/item inventory | `student_inventory` | Must be server-verified; cannot be self-awarded |
| World level | Derived from `learning_sessions` | Derived, not stored |
| Student profile/avatar | `student_learning_state.profile` | Already server-synced |
| Subject progress/scores | `student_learning_state.subjects` | Already server-synced |
| Monthly progress | `student_learning_state.monthly` | Already server-synced |

### What can remain cosmetic / local (localStorage, acceptable)

| Data | Key | Why local-ok |
|---|---|---|
| Subject scores/progress (display cache) | `mleo_*_master`, `mleo_*_progress` | Already synced to server; local is display cache |
| Sound settings | `mleo_sound_settings` | Preference only, no reward impact |
| Learning intel for question weighting | `mleo_*_learning_intel` | Affects question selection UX only, not rewards |
| MLEO mini-game high scores | `mleoHighScore`, etc. | Public games, no reward impact |
| Bingo dab marks | `ov2_bingo_marks_v1:...` | Temporary per-match state, server is authoritative for result |

### What must NOT stay local if it affects rewards

| Data | Risk if local | Required action |
|---|---|---|
| Daily streak | Can be spoofed; used for coin awards | Must be synced to `student_learning_state.streaks` before streak awards go live |
| Weekly challenge progress | Can be spoofed; used for mission completion | Must be server-verified (Phase 2 handles this) |
| Mission progress | Cannot be self-awarded | Server-only from Phase 2 |
| Coin balance | Cannot be client-controlled | Always server-only (already is) |

### What should be stored in `student_learning_state`

`student_learning_state` has the following JSONB fields currently in use:
- `subjects` — per-subject progress stores
- `monthly` — monthly minutes, exercises, reward choices
- `streaks` — streak data
- `achievements` — earned badges
- `profile` — avatar emoji, custom image

Proposed additions (to existing JSONB fields or new field):
- `challenges` — missions state (field exists, currently empty)

### How missions should be stored

All mission state lives in `student_learning_state.challenges` (server-side JSONB). This is written by the server at `session/finish` time. The client reads it from the `home-profile` API. The client never writes mission progress directly.

If card collection grows large (hundreds of unique cards per student), `student_inventory` rows are the right structure (already exists). A new `cards` catalog table (separate from `shop_items`) may be needed if cards have educational metadata (subject, grade, fact text) that is separate from shop pricing metadata.

### How the Monthly Persistence Reward is calculated (source of truth)

The Monthly Persistence Reward is calculated by querying `learning_sessions` directly — **not** from any cached field:

```
SELECT SUM(duration_seconds) / 60 AS active_minutes
FROM learning_sessions
WHERE student_id = :studentId
  AND status = 'completed'
  AND started_at >= :monthStart
  AND started_at < :monthEnd
```

The result is compared against the tier thresholds (100 / 250 / 400 / 600 minutes). The highest tier reached determines the reward. The cached `student_learning_state.challenges.monthly.activeMinutes` field is only used to render the progress bar on `/student/home` between page loads — it is never the input to the reward calculation. If the two values ever diverge, `learning_sessions` is always correct.

### How cards/inventory should be stored

Each owned card is a row in `student_inventory`: `student_id`, `item_id`, `quantity`, `obtained_at`, `source` (mission/pack/milestone). The card catalog (what cards exist, their rarity, their content) lives in `shop_items` or a new `cards` table.

### How learning coins should be recorded

Every coin movement goes through `coin_transactions` with:
- `direction`: `credit` (earn) or `debit` (spend)
- `amount`: coin quantity
- `reason`: human-readable reason code (e.g., `"learning_session"`, `"mission_complete"`, `"shop_purchase"`)
- `source_type`: `"session"`, `"mission"`, `"arcade_win"`, `"shop_item"`
- `source_id`: the relevant ID (session ID, mission ID, etc.)
- `idempotency_key`: prevents double-award on retry

---

## 8. Coin Economy Decision

### The Monthly Persistence Reward is the anchor

The coin economy is anchored by the Monthly Persistence Reward. All other earn rates are calibrated relative to it. This is not negotiable — it is the design principle that keeps learning as the primary driver of the economy.

**Monthly Persistence Reward tiers (official, as approved by owner):**

| Verified active learning minutes/month | Learning Coins awarded |
|---|---|
| 100 minutes | 10,000 coins |
| 250 minutes | 30,000 coins |
| 400 minutes | 60,000 coins |
| 600+ minutes | 100,000 coins |

**Calculation rule:** Tier-based, not cumulative. The student receives the coins for the single highest tier they reached. Example: a student who reaches 600 minutes receives 100,000 coins — not 10,000 + 30,000 + 60,000 + 100,000.

**Active minutes definition and source of truth:** The authoritative active-minutes figure is computed by summing `learning_sessions.duration_seconds / 60` for the student within the calendar month, filtered to `status: "completed"` sessions. The 60-second-per-question cap is already applied during session recording — no additional filtering is needed at month-end calculation. The `student_learning_state.challenges.monthly.activeMinutes` cache field exists only for fast progress-bar display on `/student/home` and is **never** used as input to the reward calculation. On any mismatch between the cache and `learning_sessions`, `learning_sessions` is always correct.

**Award timing:** Once per calendar month. The server calculates and awards on the first day of the following month (or at a scheduled end-of-month job). An idempotency key (`monthly_persistence_{studentId}_{year}_{month}`) prevents double-award.

> **Calibration rule:** All per-session coin awards, daily mission rewards, and weekly mission rewards must be set at values that make the monthly persistence reward feel like the biggest prize. A child who earns 200 coins/day from sessions and missions earns ~6,000 coins/month from daily activity — far less than the 10,000–100,000 monthly reward. This gap is intentional: it rewards sustained monthly commitment, not just active days.

### Balance model options

Owner must choose between two models before Phase 1 begins (Decision D1).

#### Option A — Unified single balance (recommended)

One `student_coin_balances` row per student. All earnings (learning sessions, missions, monthly reward, game wins) and all spending (student shop, arcade entry) use the same balance.

**Pros:** Simple. Already exists. No schema changes needed. Child sees one number and understands it.  
**Cons:** Arcade entry fees and losses reduce the same balance as shop savings. Mitigated by the coin cap on game earnings.

#### Option B — Split balance: Learning Coins vs Game Coins

Two sub-balances per student. Learning sessions, missions, and the Monthly Persistence Reward earn Learning Coins. Arcade wins earn Game Coins. Shop purchases spend Learning Coins only. Arcade entry costs Game Coins only.

**Pros:** Monthly persistence savings cannot be eroded by arcade losses.  
**Cons:** Requires schema addition. Two balances to display. More complex for a child aged 6–12 to understand.

**Recommended option:** Option A (unified), with a strict daily cap on game-earned coins.

### Proposed per-session earn rates (for owner review — pending Decision D1)

These are proposed rates only. Owner must approve before Phase 1.

| Activity | Proposed coins | Cap |
|---|---|---|
| Complete any learning session | 10 base | Once per subject per day |
| Session accuracy ≥ 80% | +5 bonus | Per session |
| Session accuracy ≥ 95% | +10 bonus | Per session |
| Daily mission completed | 20 | Per mission |
| Weekly mission completed | 75 | Per mission |
| Win an online game | 5 | 3 per day max (15 coins/day max from games) |

**Approximate monthly earnings from daily activity** (active student, 2–3 subjects/day):  
~45–75 coins/day × 25 active days = ~1,100–1,875 coins from daily sessions and missions.  
This is deliberately far below even the lowest monthly persistence reward tier (10,000 coins), ensuring the Monthly Persistence Reward is always the dominant prize.

### Daily and monthly caps

- A **per-day cap** on game-earned coins (max 15/day from games) is required to prevent games from being more rewarding than learning.
- A per-day cap on learning-earned coins is optional — grinding many sessions in one day is actual learning, which is positive. Owner decides (Decision D2).
- There is no monthly cap on the Monthly Persistence Reward — it is already naturally capped at 100,000 by the tier structure.

### Risks

- If per-session awards are set too high (thousands of coins per session), the Monthly Persistence Reward loses its significance. Awards must stay in the low tens per session.
- If game coins are not capped, games can become the fastest way to accumulate coins.
- If coins accumulate faster than shop items can be added, children will have nothing to spend on. The card pack catalog must be planned before Phase 3.
- Arcade entry fees (existing: 10 / 100 / 1,000 / 10,000 coins) are already in production. The new per-session earn rates must be calibrated to keep these entry tiers meaningful — a 10-coin entry should cost approximately one session's worth of earnings, not a negligible fraction.

---

## 9. Mission Model

### Two distinct reward layers

The mission model has two separate reward layers that work together but serve different purposes:

| Layer | Type | Resets | Purpose |
|---|---|---|---|
| **Daily missions** | Short-term, action-based | Every day | Reward showing up and doing something today |
| **Monthly Persistence Reward** | Long-term, consistency-based | Every month | Reward the habit of sustained learning over the whole month |

These two layers must not be confused. Daily missions reward short-term daily action. The Monthly Persistence Reward rewards long-term monthly consistency. A child who completes daily missions but learns only 5 minutes per day will not reach the monthly reward tiers. A child who learns deeply but skips days will still accumulate minutes toward the monthly reward.

### Daily missions

- 3 missions generated per student per calendar day
- Selected from a static pool (MVP) or diagnostic engine output (Phase 5)
- Pool is segmented by grade level (grades 1–2, 3–4, 5–6)
- Examples: "Answer 10 math questions", "Practice Hebrew for 5 minutes", "Complete a challenge session", "Answer 5 science questions correctly"
- Reset at midnight (server-side, UTC+3 for Israeli timezone)
- Coin rewards are modest (proposed ~20 coins/mission) — calibrated to be meaningful but far below the monthly reward

### Weekly missions

- 1–2 missions per week
- Higher coin rewards than daily missions (proposed ~75 coins/mission)
- Examples: "Practice 4 different subjects this week", "Complete 5 sessions this week", "Get 80% accuracy in 3 sessions"
- Reset every Monday

### Monthly Persistence Reward (core mechanism — see also Section 8)

The monthly reward is **not a mission** — it is a separate mechanism that runs independently of daily/weekly missions. It is calculated automatically from `learning_sessions.duration_seconds` for the month and does not require any mission assignment or completion trigger.

- Tiers: 100 min → 10,000 coins / 250 min → 30,000 coins / 400 min → 60,000 coins / 600+ min → 100,000 coins
- Tier-based (not cumulative): only the highest reached tier is awarded
- Awarded once per month by server job at end of month
- Shown on `/student/home` as a progress bar with tier markers
- Not dependent on missions completing or failing

### Milestone missions (one-time, never repeat)

- "Complete your first learning session" — awards on first session
- "Practice 3 different subjects" — awards once when 3 subjects have been used
- "Answer 100 questions correctly (lifetime)" — awards once
- "Reach a 7-day learning streak" — awards once
- Stored in `student_learning_state.challenges.milestones`

### Future diagnostic missions (Phase 5)

- Powered by the adaptive planner output from `utils/adaptive-learning-planner/`
- Example: "You struggled with fractions — try 5 fraction questions"
- One diagnostic mission per day, alongside the 3 static missions
- Not part of MVP

### What counts as valid mission progress

- **Counts:** Questions answered in a live, server-recorded learning session (`learning_sessions` + `answers`)
- **Counts:** Sessions with `status: "completed"` in `learning_sessions`
- **Counts:** Duration credited via the 60-second-per-question cap mechanism (same source as Monthly Persistence Reward minutes)
- **Does not count:** Idle screen time
- **Does not count:** Client-side localStorage values (too easy to manipulate)
- **Does not count:** Incomplete sessions (started but not finished)
- **Does not count:** Offline game or Fun Zone play
- **Does not count:** Winning online games (unless owner explicitly approves this — Decision D6)

---

## 10. Cards / Collection / Shop Model

### Card types

| Type | Description | Examples |
|---|---|---|
| Subject hero cards | A character representing a subject | "Math Wizard", "Science Explorer", "Hebrew Champion" |
| Fact cards | An educational fact from the curriculum | A science fact, a geography landmark, a Hebrew vocabulary item |
| Achievement cards | Awarded for reaching a milestone | "First 100 correct answers — Science" |
| Character cards | Fictional learning-world characters | Illustrative characters from the site |
| Seasonal cards | Special limited cards for holidays or school events | Hanukkah, Purim, back-to-school |

### Rarity tiers

| Rarity | Pull probability | Visual indicator |
|---|---|---|
| Common | 70% | Standard border |
| Rare | 25% | Colored/glowing border |
| Special | 5% | Animated/full-art border |

Rarity is cosmetic only. Rare and Special cards provide no educational or game advantage. Pull probabilities are shown to the child before any pack is opened.

### How cards are earned

- **Card packs** purchased from the Student Shop with Learning Coins (primary method)
- **Mission completion** — specific milestone missions award a card directly (no purchase needed)
- **Monthly goal completion** — one special card per month for reaching the monthly learning goal
- **Cannot be obtained** through real money, trading, external sources, or any other mechanism

### How card packs work

- Each pack contains a fixed number of cards (e.g., 3 cards per pack)
- The server draws cards from the catalog using rarity-weighted random selection
- The rarity distribution is shown before purchase ("This pack has a 5% chance of a Special card")
- No duplicate guarantee in MVP (may be added later if collection fills up)
- No pack "forcing" mechanics — no designed frustration loops

### Child safety notes

- No card trading between students
- No card resale or external value
- Rarity odds always visible — no hidden mechanics
- No "near miss" or compulsive-loop mechanics in pack opening
- No subscription or auto-renewal for packs

### MVP vs later

**MVP (Phase 3):** Card packs only (no avatar items or room decorations yet). Initial catalog of 20–30 cards covering all 6 subjects. Common and Rare tiers only (Special in later batch).

**Later (Phase 4+):** Avatar items, room decorations, visual effects, seasonal cards, Special tier, badge frames.

---

## 11. Online Games Integration

### Current state

Three game areas exist inside the site:

1. **Fun Zone** — public, no auth required, local scores only, no coin connection
2. **Offline Games** — same-device social games, no persistence, no coins
3. **Online Games Area** — authenticated multiplayer, Supabase-backed, coin entry/payout

### Integration with Child World

**Fun Zone** (public mini-games):
- Remains unchanged as a free public area
- Accessible from the Child World home as a "take a break" or "Fun Zone" link
- Does not award Learning Coins
- Does not contribute to missions
- No student login required

**Offline Games**:
- Remain unchanged
- No connection to Child World, coins, or missions

**Online Games Area** (multiplayer):
- Becomes clearly labeled as a **bonus social area** within the Child World navigation
- Entry fee mechanic remains (costs Learning Coins to enter a match)
- Winning a match awards a small daily-capped Learning Coin bonus (see Section 8)
- Whether online game wins count toward missions is an owner decision (Decision D6)
- The games lobby link on the Child World home screen is positioned below the learning subjects, smaller in visual weight

### UI hierarchy (games must never dominate)

```
PRIMARY    → [Go Learn — 6 subjects]          (large, prominent, always first)
SECONDARY  → [Today's Missions]               (visible, actionable)
TERTIARY   → [Online Games — bonus/social]    (below the fold, clearly secondary)
BACKGROUND → [Fun Zone]                        (footer or sidebar link, minimal)
```

### Principles

- Learning is the only path to major coin accumulation
- Games are a social/fun bonus — they must never be the best way to earn coins
- No game mechanic should make a child feel they must play games to afford shop items
- A child who never plays any games should have a fully satisfying Child World experience from learning alone

---

## 12. Parent Visibility

### What parents see (educational focus)

| Information | Source | Currently shown? |
|---|---|---|
| Active learning minutes (daily/weekly/monthly) | `learning_sessions.duration_seconds` | ✅ Yes |
| Sessions per subject | `learning_sessions.subject` | ✅ Yes |
| Accuracy per subject and topic | `answers.is_correct` | ✅ Yes |
| Monthly goal progress | `student_learning_state.monthly` | ✅ Yes |
| Daily learning streak | Will be server-synced in Phase 2 | ⚠️ After Phase 2 |
| Missions completed this week | `student_learning_state.challenges` | ⚠️ After Phase 2 |
| Learning rewards summary | "Earned X coins from learning this month" | New, simple addition |
| Diagnostic insights | Diagnostic Engine V2 output | ✅ Yes |

### What parents do NOT see

- The child's specific card collection (individual card names and counts)
- Room decoration choices
- Avatar outfit items
- Individual arcade game results
- Cosmetic purchase history from the Student Shop

### Parent report changes required

**None in MVP.** The parent report (`/learning/parent-report`, `/learning/parent-report-detailed`, and `GET /api/parent/students/[studentId]/report-data`) is not touched during any phase of Child World development.

Post-MVP additions to the parent report are additive only and require a separate owner decision:
- A one-line "missions completed: N this week" on the monthly summary
- A "learning rewards" line: coins earned from learning (not from games, not shop balance)

These additions do not change the report structure, do not add diagnostic content, and do not expose cosmetics.

---

## 13. Files Allowed Later

The following files are relevant to future Child World phases but must not be touched until the corresponding phase is approved and the phase plan is reviewed:

**Phase 1 relevant:**
```
pages/api/learning/session/finish.js
lib/learning-supabase/learning-activity.js
lib/learning-supabase/canonical-learning-write-meta.server.js
lib/learning-shared/student-learning-profile-model.js
supabase/migrations/001_learning_core_foundation.sql   (reference only — for coin table structure)
```

**Phase 2 relevant:**
```
pages/api/student/home-profile.js
pages/api/student/learning-profile.js
lib/learning-client/studentHomeDashboardClient.js
pages/student/home.js
supabase/migrations/017_student_learning_state.sql   (reference only — challenges field)
```

**Phase 3 relevant:**
```
pages/_app.js                            (add new routes to STUDENT_PROTECTED_ROUTES)
lib/arcade/server/arcade-coins.js        (reference coin spend pattern — do not modify)
pages/api/arcade/balance.js              (reference balance read pattern — do not modify)
```

**Phase 4 relevant:**
```
pages/student/home.js
components/student/StudentAvatarPickerModal.js
lib/learning-client/student-avatar-profile-sync.js
lib/learning-student-local-sync.js
```

**Phase 5 relevant:**
```
utils/adaptive-learning-planner/adaptive-planner.js   (read output only — do not modify)
pages/api/learning/planner-recommendation.js          (call — do not modify)
lib/learning-client/scheduleAdaptivePlannerRecommendation.js
components/LearningPlannerRecommendationBlock.js
```

---

## 14. Files Forbidden / High Risk

The following files must not be touched during any Child World phase without explicit owner approval and a separate detailed technical review:

| File / directory | Risk | Reason |
|---|---|---|
| `pages/api/learning/answer.js` | Critical | Virtual-student QA harness asserts on every call. Any shape change breaks QA |
| `pages/api/learning/session/start.js` | Critical | Virtual-student QA harness asserts on this call |
| `pages/learning/math-master.js` | High | 3000+ line monolith; question generation, session tracking, time tracking all intertwined |
| `pages/learning/geometry-master.js` | High | Same risk as math-master |
| `pages/learning/hebrew-master.js` | High | Same risk + Hebrew audio coupling |
| `pages/learning/english-master.js` | High | Same risk |
| `pages/learning/science-master.js` | High | Same risk |
| `pages/learning/moledet-geography-master.js` | High | Same risk |
| `scripts/virtual-student-qa/` (entire directory) | Critical | Active QA runner and harness; do not change until code changes are validated |
| `utils/diagnostic-engine-v2/` (entire directory) | High | Parent analytics engine; complex, tested, not student-facing |
| `utils/active-diagnostic-runtime/` (entire directory) | High | In-session probe routing; any change affects question selection across all 6 subjects |
| `utils/adaptive-learning-planner/` (entire directory) | High | Working planner; Phase 5 uses its output but must not modify it |
| `components/learning/StudentQuestionDisplay.jsx` | High | Shared rendering component across all 6 masters |
| `pages/learning/parent-report.js` | Medium | Parent-facing; out of scope |
| `pages/learning/parent-report-detailed.js` | Medium | Parent-facing; out of scope |
| `lib/parent-server/` (entire directory) | High | Parent analytics pipeline; stable and tested |
| `lib/parent-copilot/` (entire directory) | Medium | Unrelated to Child World |
| `supabase/migrations/` (all existing files) | Critical | Live production schema; only additive new migration files going forward |
| `utils/hebrew-audio-build1.js` | Medium | Fragile Hebrew audio pipeline; no relation to Child World |
| `pages/api/hebrew-audio-ensure.js` | Medium | Same |
| `pages/api/hebrew-audio-stream.js` | Medium | Same |
| `pages/api/hebrew-audio-artifact.js` | Medium | Same |
| `data/hebrew-questions/g1.js` – `g6.js` | Low | Archive files; not imported by app; leave as historical reference |

---

## 15. QA Gates

The following QA gates must be passed at each phase boundary. A gate failure blocks the next phase.

### Gate 0 — Baseline (before any implementation)

- [ ] Virtual-student Phase D2 daily run completes successfully for all 12 AAA test students
- [ ] All 6 subject drivers complete without errors (math, geometry, hebrew, english, science, moledet)
- [ ] `POST /api/learning/session/start` returns `{ ok: true, learningSessionId }` for each driver
- [ ] `POST /api/learning/answer` records correctly for each question
- [ ] `POST /api/learning/session/finish` records `status: "completed"` with correct duration
- [ ] Parent report API (`GET /api/parent/students/[studentId]/report-data`) returns valid data for all 12 AAA students
- [ ] `/student/home` loads correctly for all 12 AAA students
- [ ] Coin balances readable via `GET /api/student/me` for all 12 AAA students

### Gate 1 — After Phase 1 (coin awards)

- [ ] All Gate 0 checks pass without modification to QA driver scripts
- [ ] Simulated student completes a session → `student_coin_balances.balance` increases by expected amount
- [ ] `coin_transactions` contains a new row with `reason: "learning_session"`, correct `source_id`
- [ ] Same `learningSessionId` called twice → second call is idempotent (no double-award)
- [ ] Student completes sessions beyond daily cap → extra sessions do not over-award coins
- [ ] Student with 0-second session (stopped immediately) → no coin award
- [ ] Parent report unchanged

### Gate 2 — After Phase 2 (missions + monthly persistence tracking)

- [ ] All Gate 1 checks pass
- [ ] `GET /api/student/home-profile` returns missions array for all test students
- [ ] New student (no sessions) sees missions with `progress: 0`
- [ ] Simulated session matching a mission criteria → mission `progress` advances
- [ ] Completing a mission → `coin_transactions` row with `reason: "mission_complete"`
- [ ] Missions reset at correct time (daily reset verified)
- [ ] `/student/home` renders missions panel without errors
- [ ] Missions panel shows correct progress after a simulated learning run
- [ ] `student_learning_state.challenges.monthly.activeMinutes` increments correctly after each completed session (cache update)
- [ ] Monthly progress bar on `/student/home` renders correctly with current minutes and next tier target
- [ ] Month-end reward job queries `learning_sessions.duration_seconds` directly (not the cached field) to calculate the tier
- [ ] Month-end reward job awards correct tier: student at 87 min → no award; student at 105 min → 10,000 coins
- [ ] Month-end reward job is idempotent: running twice for the same student+month does not double-award
- [ ] Student at 650 minutes receives 100,000 coins (not 10K + 30K + 60K + 100K combined)
- [ ] If `monthly.activeMinutes` cache is stale or missing, month-end job still produces correct award from `learning_sessions` directly

### Gate 3 — After Phase 3 (shop + cards)

- [ ] All Gate 2 checks pass
- [ ] `/student/shop` loads correctly for logged-in student
- [ ] `/student/collection` loads correctly, showing owned cards
- [ ] Purchase with sufficient balance: `student_inventory` gains new rows, balance decreases, transaction recorded
- [ ] Purchase with insufficient balance: server returns error, no coin deduction, no inventory change
- [ ] Card rarity distribution verified over simulated purchases
- [ ] Virtual-student QA Phase D2 daily run passes

### Gate 4 — After Phase 4 (world room / visual redesign)

- [ ] All Gate 3 checks pass
- [ ] `/student/home` loads correctly for all 12 AAA test students after redesign
- [ ] No existing E2E test selectors broken (check QA scripts for any `/student/home` references)
- [ ] New UI components have `data-testid` attributes
- [ ] Login → home redirect works correctly
- [ ] Avatar items render on avatar correctly (if any purchased)
- [ ] Room decorations render correctly (if any purchased)
- [ ] World Level displayed correctly based on session count
- [ ] Parent report unchanged

### Gate 5 — After Phase 5 (diagnostic missions)

- [ ] All Gate 4 checks pass
- [ ] Student with identified weak area receives a relevant diagnostic mission in daily missions
- [ ] Student without planner output receives only static missions (no crash, no empty panel)
- [ ] `POST /api/learning/planner-recommendation` continues to respond correctly
- [ ] Completing a diagnostic mission advances mission progress and awards coins

---

## 16. Owner Decisions Required Before Execution

The following decisions cannot be made by the development team. Each one requires an explicit owner answer before the corresponding phase begins.

**D1. Coin earn amounts**
What is the proposed coin award per completed learning session? What is the bonus for high accuracy? Owner must set an anchor amount (e.g., "a typical active student earns approximately X coins per week from learning").

**D2. Daily earning cap**
Should there be a maximum Learning Coins per day from learning activity? What is the cap? Without a cap, a student could grind sessions in one day.

**D3. Mission pool content (Phase 2)**
Who will write and approve the initial daily mission pool? Should missions be in Hebrew only? Should they vary by grade? Owner must approve the mission text before Phase 2.

**D4. Data model: JSONB fields vs new tables**
Should all Child World state (missions, room items, card collection, world level) live as JSONB fields in `student_learning_state`, or should new normalized tables be created for cards and inventory? (Note: `student_inventory` already exists for inventory — this decision mainly concerns whether missions and world state stay in JSONB or get their own tables.)

**D5. Card content source (Phase 3)**
Who produces card artwork and fact text? What is the initial catalog size? Can Phase 3 ship with a minimal placeholder set and grow later?

**D6. Do online game wins count toward missions?**
Should winning an online game contribute to any mission? (e.g., "Play 2 online games this week.") Or are missions exclusively learning-session-based?

**D7. Parent visibility of coins**
Should the parent dashboard show the child's Learning Coin balance? Or only learning-derived stats (minutes, accuracy, missions)?

**D8. `/student/home` transform vs new `/student/world` route**
Should the existing `/student/home` be redesigned in-place, or should a new `/student/world` route be created with `/student/home` redirecting to it? In-place is lower risk for auth continuity; a new route is architecturally cleaner.

**D9. QA harness extension (Phase 1)**
Before Phase 1 ships, should the virtual-student QA harness (`scripts/virtual-student-qa/run.mjs`) be extended to assert on coin balance after sessions? If yes, QA driver updates are part of Phase 1 scope.

**D10. Shop pricing and pack structure (Phase 3)**
What is the price of a common card pack? A rare pack? What is the target time-to-first-pack for a new student? Owner must set prices relative to earn rates decided in D1/D2.

**D11. MVP scope confirmation**
Is the MVP definition in Section 5 (coin awards + daily missions panel, no visual redesign) approved? Or should the MVP be smaller (Phase 1 only — coins but no missions UI) or larger (include Phase 3 card shop)?

**D12. Monthly Persistence Reward — active minute thresholds**
The Monthly Persistence Reward tiers are defined as a core Child World mechanism (Section 4, Section 8). The tier thresholds proposed are: 100 / 250 / 400 / 600 minutes per month, yielding 10K / 30K / 60K / 100K Learning Coins respectively. Owner must confirm whether these exact minute thresholds are approved, or provide alternative thresholds before Phase 1 begins. The coin amounts per tier (10K / 30K / 60K / 100K) are approved as stated in this document.

---

## 16A. Owner Decisions — Approved Baseline for Phase 0 Planning

The following decisions represent the owner-approved planning baseline. They authorize Phase 0 (baseline QA and decisions review) only. They do **not** authorize Phase 1 or Phase 2 implementation. Implementation requires explicit owner approval after Phase 0 QA passes.

---

**D1. Coin earn amounts — Approved baseline**

| Activity | Learning Coins |
|---|---|
| Complete a learning session | 10 base |
| Session accuracy ≥ 80% | +5 bonus |
| Session accuracy ≥ 95% | +10 bonus |

These are small daily rewards. They must remain far below the Monthly Persistence Reward at all times. A student earning the maximum per-session bonus every day accumulates far less per month than even the lowest monthly persistence tier (10,000 coins).

---

**D2. Daily earning cap — Approved baseline**

- Daily cap from regular learning-session rewards: **300 Learning Coins/day**
- The Monthly Persistence Reward is **separate** and is not subject to this daily cap — it is awarded once per month by a server job, not per session
- Mission rewards have their own caps and must be calibrated separately before Phase 2

---

**D3. Mission pool — Approved baseline**

- MVP missions are **Hebrew-only**
- Missions are grade-banded into three tiers:
  - Grades 1–2
  - Grades 3–4
  - Grades 5–6
- Mission text content requires owner approval before any implementation begins (Phase 2 checkpoint)

---

**D4. Data model — Approved baseline**

- MVP daily mission state lives in `student_learning_state.challenges` (existing JSONB field)
- Monthly progress display cache may live in `student_learning_state.challenges.monthly` (display only)
- **Monthly Persistence Reward calculation uses `learning_sessions.duration_seconds` as the sole source of truth** — not the cache
- Future cards, shop items, and inventory use `student_inventory`, `shop_items`, or new normalized tables as needed
- Reward-authoritative data must never live only in localStorage

---

**D5. Card content — Approved baseline**

- Cards are **not part of MVP**
- Cards begin only in Phase 3 or later
- Initial card catalog target: 24–36 owner-approved cards before Phase 3 begins

---

**D6. Online game wins and missions — Approved baseline**

- Online game wins do **not** count toward learning missions in MVP
- Online games remain a bonus/social area only
- Learning is the only source of major rewards
- This decision may be revisited before Phase 3 with explicit owner approval

---

**D7. Parent visibility of coins — Approved baseline**

- Parent dashboard and reports do **not** show coin balance, shop items, card collection, or cosmetics in MVP
- Post-MVP, parents may see educational progress only: learning minutes, missions completed, subjects practiced
- No cosmetic data is ever surfaced in parent reports

---

**D8. Route decision — Approved baseline**

- Gradually transform the existing `/student/home` page
- Do **not** create a new `/student/world` route in MVP
- This keeps auth continuity and avoids redirect complexity during Phase 1–2

---

**D9. QA harness — Approved baseline**

- Phase 1 must include QA verification that coin balance increases after a real simulated learning session (via the virtual-student QA runner)
- QA driver scripts (`scripts/virtual-student-qa/`) must not be rewritten unless absolutely necessary for the new assertions
- If new assertions require QA driver changes, those changes are explicitly scoped as part of Phase 1

---

**D10. Shop pricing — Approved baseline**

- Student Shop is **not part of MVP**
- Pricing and pack structure will be decided and approved before Phase 3 begins
- No placeholder prices or provisional content to be built in earlier phases

---

**D11. MVP scope — Approved baseline**

MVP = **Phase 1 + Phase 2** only:

| Included in MVP | Excluded from MVP |
|---|---|
| Server-side learning coin awards (per session) | Visual world/room redesign |
| Daily missions panel on `/student/home` | Cards and card collection |
| Monthly Persistence Reward tracking, display, and month-end award | Student Shop |
| | Avatar items or outfit layering |
| | Weekly missions |
| | Personalized/diagnostic missions |
| | Any changes to learning master pages |
| | Any changes to parent reports |

---

**D12. Monthly Persistence Reward thresholds — Approved baseline**

| Verified active learning minutes/month | Learning Coins awarded |
|---|---|
| 100 minutes | 10,000 coins |
| 250 minutes | 30,000 coins |
| 400 minutes | 60,000 coins |
| 600+ minutes | 100,000 coins |

Rules (approved):
- Highest tier only — not cumulative
- Maximum monthly reward: 100,000 Learning Coins
- Only verified active learning time counts (`learning_sessions.duration_seconds`, 60-second-per-question cap already applied)
- No idle time, no real money, no crypto, no external value

---

> **Scope of these approvals:**
> Decisions D1–D12 above authorize **planning and Phase 0 baseline QA only**.
> They do **not** authorize Phase 1 or Phase 2 implementation.
> Implementation of any phase still requires explicit owner approval after Phase 0 QA passes and the phase plan is reviewed.

---

## 17. Explicit Approval Rule

> **No implementation may begin until the owner explicitly approves this document and the specific phase to execute.**

Each phase has its own approval checkpoint listed in Section 6. Approval of this document as a whole authorizes planning discussions only. Approval of a specific phase's checkpoint authorizes implementation of that phase only. No phase may be started speculatively without checkpoint approval.

Implementation is defined as: writing or editing any product code, creating or modifying any database migration, changing any UI component, adding or modifying any API route, or making any change to the Supabase schema.

---

## Appendix A — Supabase Tables Reference

| Table | Status | Child World usage |
|---|---|---|
| `students` | Existing, production | Read grade level for mission pool selection |
| `student_sessions` | Existing, production | Read only (auth) |
| `learning_sessions` | Existing, production | Trigger coin awards and mission progress |
| `answers` | Existing, production | Accuracy calculation for coin bonuses |
| `student_learning_state` | Existing, production | Store missions, streaks, world level; already used |
| `student_coin_balances` | Existing, production | Read/write for coin awards and purchases |
| `coin_transactions` | Existing, production | Write every coin movement |
| `coin_reward_rules` | Existing, empty | Optionally used for coin earn config |
| `coin_spend_rules` | Existing, empty | Optionally used for shop spend config |
| `shop_items` | Existing, empty | Seed with card packs and items in Phase 3 |
| `student_inventory` | Existing, empty | Populated in Phase 3 |
| `arcade_rooms` + related | Existing, production | No changes — read game win events for coin bonus |

---

## Appendix B — Existing localStorage Keys (Legacy Technical Names)

These localStorage keys exist in the current codebase under legacy internal naming. They are technical identifiers only and are not product concepts. The Child World plan does not depend on these for rewards — all reward-affecting state is server-side.

```
mleo_*_master           — subject scores (display cache, safe to read)
mleo_*_progress         — subject progress (display cache)
mleo_*_mistakes         — wrong-answer logs (used for in-session question weighting)
mleo_*_learning_intel   — topic weighting intel (UX only, not rewards)
mleo_daily_challenge    — daily challenge (local only; must be moved server-side before reward use)
mleo_weekly_challenge   — weekly challenge (same)
mleo_daily_streak       — daily streak (local only; must be server-synced before reward use)
mleo_player_name        — display name cache
mleo_player_avatar      — avatar cache
mleo_sound_settings     — sound preferences
LEO_MONTHLY_PROGRESS    — monthly minutes cache (partially synced to server)
LEO_REWARD_CHOICE       — parent prize choice (parent feature, separate from Child World)
liosh_active_student_id — current student ID
liosh_lp_{id}_*         — student-scoped versions of above keys
```

---

*This document was created on 2026-05-22 based on a read-only codebase audit. Updated 2026-05-22 to incorporate the Monthly Persistence Reward as a core Child World mechanism. Updated 2026-05-22 to clarify that `learning_sessions.duration_seconds` is the authoritative source of truth for Monthly Persistence Reward calculation, and that `student_learning_state.challenges.monthly.activeMinutes` is a display cache only. Updated 2026-05-22 to add Section 16A with owner-approved planning baseline decisions D1–D12. No product code was changed. No migrations were created. No UI was modified. This is a planning document only.*

*Document status: DRAFT — awaiting owner approval per Section 17.*

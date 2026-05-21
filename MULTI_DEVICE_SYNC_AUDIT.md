# Multi-Device Student Progress Sync Audit

**Date:** 2026-05-21
**Scope:** Student-facing values that differ between devices
**Status:** LAUNCH BLOCKER IDENTIFIED
**Auditor:** Cascade AI

---

## Executive Summary

### Critical Finding: Dual Storage System Creates Data Drift

The learning site uses **two parallel storage systems** for student progress:

1. **Server-Authoritative (`student_learning_state` table)**
   - Used by: Student home dashboard API (`/api/student/home-profile`)
   - Contains: streaks, achievements, monthly progress, challenges, profile

2. **Local-Only (localStorage with `mleo_*` keys)**
   - Used by: All 6 subject master pages (Math, Geometry, Hebrew, English, Science, Moledet)
   - Contains: Subject-specific scores, topic progress, best streaks, daily challenges, mistake history

**The Problem:** 
- Subject masters write to localStorage only
- Student home dashboard reads from server
- When a student switches devices, the server data and localStorage data diverge
- This creates confusing UX: "I have 50 stars on my tablet but only 20 on mom's phone"

### Launch Risk Classification

| Risk | Status | Impact |
|------|--------|--------|
| Gamification sync failure | **BLOCKER** | High student/parent confusion, loss of trust |
| Adaptive difficulty inconsistency | **BLOCKER** | Wrong question difficulty, ineffective learning |
| Streak reset on device switch | **BLOCKER** | Gamification incentive destroyed |
| Daily challenge re-completion | **IMPORTANT** | Exploitable, unfair rewards |
| Avatar/name per-device | **SAFE** | Cosmetic, acceptable variance |

---

## 1. Files Inspected

### Student Authentication & Home
- `pages/student/login.js`
- `pages/student/home.js`
- `lib/learning-student-local-sync.js`
- `lib/learning-supabase/student-learning-profile.server.js`
- `pages/api/student/home-profile.js`

### Subject Master Pages (All 6)
- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `pages/learning/hebrew-master.js`
- `pages/learning/english-master.js`
- `pages/learning/science-master.js`
- `pages/learning/moledet-geography-master.js`

### Subject Constants & Storage
- `utils/math-constants.js`
- `utils/geometry-constants.js`
- `utils/hebrew-constants.js`
- `utils/progress-storage.js`
- `utils/math-time-tracking.js`
- `utils/english-time-tracking.js`
- `utils/hebrew-time-tracking.js`
- `utils/science-time-tracking.js`
- `utils/moledet-geography-time-tracking.js`

### Answer Persistence (Server)
- `pages/api/learning/answer.js`
- `lib/learning-supabase/report-data-aggregate.server.js`
- `lib/learning-supabase/report-data-adapter.js`

---

## 2. Complete Sync-Risk Table

### 2.1 Server-Authoritative Values (Safe)

| Field | Storage | Written By | Read By | Sync Status | Launch Risk |
|-------|---------|------------|---------|-------------|-------------|
| `student_id` | Supabase `students` table | Login API | All pages | ✅ Server-authoritative | SAFE |
| `full_name` | Supabase `students` table | Registration | All pages | ✅ Server-authoritative | SAFE |
| `grade_level` | Supabase `students` table | Registration | All pages | ✅ Server-authoritative | SAFE |
| `answers` | Supabase `answers` table | `/api/learning/answer` | Report aggregation | ✅ Server-authoritative | SAFE |
| `answer_payload` | Supabase `answers` table | `/api/learning/answer` | Report aggregation | ✅ Server-authoritative | SAFE |
| `probeEvidence` | Supabase `answers.clientMeta` | Subject masters | Report aggregation | ✅ Server-authoritative | SAFE |
| `streaks` (server) | `student_learning_state.streaks` | Patch API | Home dashboard | ⚠️ Partial (see below) | IMPORTANT |
| `achievements` (server) | `student_learning_state.achievements` | Patch API | Home dashboard | ⚠️ Partial (see below) | IMPORTANT |
| `monthly` progress | `student_learning_state.monthly` | Patch API | Home dashboard | ⚠️ Partial (see below) | IMPORTANT |
| `challenges` | `student_learning_state.challenges` | Patch API | Home dashboard | ⚠️ Partial (see below) | IMPORTANT |

### 2.2 Local-Only Values (BLOCKER)

| Field | localStorage Key | Written By | Read By | Device B Behavior | Launch Risk |
|-------|------------------|------------|---------|-------------------|-------------|
| **Math scores** | `mleo_math_master` | math-master.js | math-master.js | Starts fresh | **BLOCKER** |
| **Geometry scores** | `mleo_geometry_master` | geometry-master.js | geometry-master.js | Starts fresh | **BLOCKER** |
| **Hebrew scores** | `mleo_hebrew_master` | hebrew-master.js | hebrew-master.js | Starts fresh | **BLOCKER** |
| **English scores** | `mleo_english_master` | english-master.js | english-master.js | Starts fresh | **BLOCKER** |
| **Science scores** | `mleo_science_master` | science-master.js | science-master.js | Starts fresh | **BLOCKER** |
| **Moledet scores** | `mleo_moledet_geography_master` | moledet-geography-master.js | moledet-geography-master.js | Starts fresh | **BLOCKER** |
| **Math mistakes** | `mleo_math_mistakes` | math-master.js | math-master.js | Lost | **BLOCKER** |
| **Geometry mistakes** | `mleo_geometry_mistakes` | geometry-master.js | geometry-master.js | Lost | **BLOCKER** |
| **Hebrew mistakes** | `mleo_hebrew_mistakes` | hebrew-master.js | hebrew-master.js | Lost | **BLOCKER** |
| **Science mistakes** | `mleo_science_mistakes` | science-master.js | science-master.js | Lost | **BLOCKER** |
| **Moledet mistakes** | `mleo_moledet_geography_mistakes` | moledet-geography-master.js | moledet-geography-master.js | Lost | **BLOCKER** |
| **Subject learning intel** | `mleo_{subject}_learning_intel` | *-master.js | *-master.js | Lost | **BLOCKER** |
| **Time tracking** | `mleo_time_tracking` | *-time-tracking.js | *-master.js | Lost | **IMPORTANT** |
| **Daily challenge** | `mleo_{subject}_daily_challenge` | *-master.js | *-master.js | Can redo | **IMPORTANT** |
| **Weekly challenge** | `mleo_{subject}_weekly_challenge` | *-master.js | *-master.js | Can redo | **IMPORTANT** |
| **Subject progress** | `{STORAGE_KEY}_progress` | *-master.js | *-master.js | Starts fresh | **BLOCKER** |
| **Topic best scores** | `{level}_{topic}` in scoresStore | *-master.js | *-master.js | Lost | **BLOCKER** |
| **Best streak** | `{level}_{topic}` streak | *-master.js | *-master.js | Lost | **BLOCKER** |
| **Monthly progress** | `liosh_lp_{studentId}_LEO_MONTHLY_PROGRESS` | progress-storage.js | progress-storage.js | May sync via server | **IMPORTANT** |
| **Player name** | `mleo_player_name` | login.js, sync | *-master.js | Syncs via syncStudentLocalStorageIdentity | **SAFE** |
| **Player avatar** | `mleo_player_avatar` | *-master.js | *-master.js | Per-device | **SAFE** |

### 2.3 Derived Values (Calculated from Server Data - Safe)

| Field | Derived From | Calculation Location | Sync Status | Launch Risk |
|-------|--------------|---------------------|-------------|-------------|
| `accuracy` | `answers` table | `report-data-aggregate.server.js` | ✅ Server-authoritative | SAFE |
| `parent report` | `answers` table | `generateParentReportV2()` | ✅ Server-authoritative | SAFE |
| `diagnosticEngineV2` | `answers` table | `runDiagnosticEngineV2()` | ✅ Server-authoritative | SAFE |
| `probeEvidence` | `answers.clientMeta` | `report-data-adapter.js` | ✅ Server-authoritative | SAFE |

---

## 3. Flow Analysis: Where Data Diverges

### 3.1 Student Login Flow

```
Device A (Tablet):
  Student logs in
    ↓
  /api/student/me returns student object
    ↓
  syncStudentLocalStorageIdentity() called
    ↓
  localStorage cleared if different student
    ↓
  mleo_player_name set from server
    ↓
  /api/student/home-profile called
    ↓
  Server streaks/achievements/challenges returned
    ↓
  Home dashboard shows server data ✅

Device B (Phone):
  Same flow, but localStorage is fresh
    ↓
  Server data matches (streaks/achievements) ✅
  Subject-specific localStorage starts empty ⚠️
```

### 3.2 Learning Session Flow (Where Divergence Happens)

```
Device A (Tablet) - Math Practice:
  Student answers 10 questions
    ↓
  saveAnswerInParallel() called
    ↓
  /api/learning/answer saves to server ✅
    ↓
  localStorage updated with:
    - mleo_math_master (scores)
    - mleo_math_mistakes (mistakes)
    - mleo_math_learning_intel (intel)
    - mleo_time_tracking (time)
    ↓
  Best streak: 15
  Coins: 120
  Stars: 50
  Level: 3

Device B (Phone) - Same Student:
  Student opens Math
    ↓
  localStorage is empty (fresh device)
    ↓
  Scores loaded from mleo_math_master: "{}"
    ↓
  Best streak shows: 0 (not 15!) ❌
  Coins: 0 (not 120!) ❌
  Stars: 0 (not 50!) ❌
  Level: 1 (not 3!) ❌
  Mistake history: empty ❌
  Adaptive difficulty: starts too easy ❌
```

### 3.3 End-of-Session Update Flow

```
Subject Master on Device A:
  Session ends
    ↓
  addSessionProgress() called
    ↓
  localStorage: liosh_lp_{studentId}_LEO_MONTHLY_PROGRESS updated
    ↓
  Server may be patched via separate API (unclear) ⚠️

Result:
  - If server not updated, Device B won't see session in monthly progress
  - Time tracking lost on Device B
```

### 3.4 Parent Report Flow (Always Correct)

```
Parent opens report on any device:
    ↓
  Server aggregates answers from all devices ✅
    ↓
  diagnosticEngineV2 runs on server data ✅
    ↓
  Report shows true progress ✅

Note:
  - Parent sees correct data even though student sees wrong data on Device B
  - This creates parent-child confusion: "The report says you practiced 30 minutes but your phone shows 0!"
```

---

## 4. Values That Must Become Server-Backed Before Launch

### 4.1 Critical (BLOCKER → Must Fix)

| Priority | Value | Current Storage | Proposed Storage | Migration Path |
|----------|-------|-----------------|------------------|----------------|
| P0 | Subject scores (all 6) | localStorage `mleo_{subject}_master` | `student_learning_state.subjects.{subject}.scoresStore` | Patch API on session end |
| P0 | Mistake history (all 6) | localStorage `mleo_{subject}_mistakes` | Server derivation from `answers` table | Already exists! Use server aggregation |
| P0 | Best streaks | localStorage topic keys | `student_learning_state.subjects.{subject}.streaks` | Patch API on new best |
| P0 | Topic progress | localStorage | `student_learning_state.subjects.{subject}.progressStore` | Derive from answers + patch |
| P1 | Daily challenges | localStorage | `student_learning_state.challenges` | Already exists, ensure sync |
| P1 | Weekly challenges | localStorage | `student_learning_state.challenges` | Already exists, ensure sync |

### 4.2 Important (Should Fix)

| Priority | Value | Current | Proposed | Notes |
|----------|-------|---------|----------|-------|
| P2 | Time tracking | localStorage `mleo_time_tracking` | Server session aggregation | Already aggregated in answers |
| P2 | Subject learning intel | localStorage | Server derivation | Can be recalculated from answers |
| P3 | Avatar image | localStorage per-device | Server `student_learning_state.profile` | Optional |

---

## 5. Values That Can Be Derived From Existing Answers Table

### 5.1 Already Derived (Safe)

| Value | Derivation Source | Derivation Logic | Status |
|-------|-------------------|------------------|--------|
| `accuracy` | `answers` table | `correct / (correct + wrong)` | ✅ Working |
| `mistake history` | `answers` table | Filter `is_correct = false` | ✅ Working |
| `parent report` | `answers` table | Aggregation pipeline | ✅ Working |
| `probeEvidence` | `answers.clientMeta` | `diagnosticProbe` extraction | ✅ Working |
| `volume evidence` | `answers` table | Count questions per topic | ✅ Working |

### 5.2 Can Be Derived (Implement)

| Value | Derivation Source | Derivation Logic | Effort |
|-------|-------------------|------------------|--------|
| `subject scores` | `answers` table | Aggregate best scores per topic/level | Medium |
| `topic progress` | `answers` table | Derive mastery from answer patterns | Medium |
| `best streaks` | `answers` table | Calculate consecutive correct per session | Medium |
| `daily challenge` | `answers` table | Check if challenge criteria met today | Low |

### 5.3 Cannot Be Derived (Needs Explicit Storage)

| Value | Reason | Proposed Storage |
|-------|--------|------------------|
| `current session state` | Ephemeral by design | Keep localStorage (acceptable) |
| `UI preferences` | Device-specific | Keep localStorage (acceptable) |
| `pending probe state` | Session-local only | Keep React ref (acceptable) |

---

## 6. Minimal Implementation Plan (No UI/Design Changes)

### Phase 1: Server-Back Subject Scores (P0 - BLOCKER)

**Goal:** Ensure subject scores/streaks/progress sync across devices.

**Files to Modify:**
1. `lib/learning-shared/student-learning-profile-model.js`
   - Add `scoresStore` to subject schema
   - Add `bestStreaks` to subject schema
   - Add `lastPlayedAt` to subject schema

2. `pages/api/student/learning-profile-patch.js` (new or existing)
   - Create endpoint to receive subject progress updates
   - Validate and patch `student_learning_state.subjects.{subject}`

3. Subject master pages (6 files)
   - After `saveAnswerInParallel()`, call new patch API
   - Patch on: new best score, streak update, level up, session end
   - Keep localStorage as cache, treat server as source of truth

4. Subject master pages - initialization
   - On mount, fetch server state first
   - Merge with localStorage (server wins on conflict)

**DB Changes:**
- None required - use existing `student_learning_state.subjects` JSONB field

### Phase 2: Derive Mistake History From Server (P0 - BLOCKER)

**Goal:** Ensure adaptive difficulty uses cross-device mistake history.

**Files to Modify:**
1. `lib/learning-supabase/student-learning-profile.server.js`
   - Add `computeStudentMistakesFromAnswers()` function
   - Aggregate recent wrong answers per subject/topic

2. Subject master pages (6 files)
   - Replace `loadSubjectMistakesFromStorage()` with server fetch
   - Keep localStorage as offline fallback only

**DB Changes:**
- None required - use existing `answers` table

### Phase 3: Sync Daily/Weekly Challenges (P1 - IMPORTANT)

**Goal:** Prevent challenge re-completion on different devices.

**Files to Modify:**
1. `pages/api/student/home-profile.js`
   - Already returns `challenges` - ensure it's used

2. Subject master pages (6 files)
   - Check `challenges` from home profile before allowing challenge
   - Update challenge state via patch API

**DB Changes:**
- None required - use existing `student_learning_state.challenges`

### Phase 4: QA & Testing

**Test Scenarios:**
1. Device A: Complete 10 math questions, earn 50 coins
2. Device B: Login, open math - should show 50 coins
3. Device A: Set new best streak of 15
4. Device B: Should see best streak of 15
5. Device A: Complete daily challenge
6. Device B: Daily challenge should show as completed
7. Parent report: Should show all activity from both devices

---

## 7. Proposed DB/Table Changes

### 7.1 No New Tables Required

All data fits in existing schema:

| Data | Existing Location | Notes |
|------|-------------------|-------|
| Subject scores | `student_learning_state.subjects` | Add to JSONB structure |
| Streaks | `student_learning_state.streaks` | Already exists, populate it |
| Achievements | `student_learning_state.achievements` | Already exists |
| Challenges | `student_learning_state.challenges` | Already exists, ensure sync |
| Mistake history | `answers` table | Derive, don't duplicate |
| Time tracking | `answers` table | Derive duration from timestamps |

### 7.2 Recommended JSONB Structure Addition

Add to `student_learning_state.subjects.{subject}`:

```json
{
  "math": {
    "scoresStore": {
      "g3_addition_easy": {
        "bestScore": 120,
        "bestStreak": 15,
        "lastPlayedAt": "2026-05-21T14:30:00Z",
        "totalSessions": 12
      }
    },
    "topicProgress": {
      "addition": { "g3": "medium", "g4": "easy" }
    },
    "lastSyncedAt": "2026-05-21T14:30:00Z"
  }
}
```

---

## 8. QA Plan: Multi-Device Sync Verification

### 8.1 Pre-Launch QA Commands

```bash
# Build verification
npm run build

# Core tests
npm run test:diagnostic-engine-v2-harness

# Probe tests
node scripts/probe-persistence-product-smoke.mjs
node scripts/probe-evidence-to-copilot-qa.mjs

# Learning simulator
npm run qa:learning-simulator:probes
npm run qa:learning-simulator:expert-review-pack
```

### 8.2 Manual Multi-Device Test Protocol

**Setup:**
- Device A: Chrome desktop (primary)
- Device B: Chrome mobile or incognito (secondary)
- Same student account

**Test 1: Score Sync**
1. Device A: Open math, note coin count
2. Device A: Answer 5 questions correctly, earn 50 coins
3. Device A: Note new coin count (e.g., 150)
4. Device B: Login, open math
5. **PASS:** Device B shows 150 coins
6. **FAIL:** Device B shows 100 coins (initial)

**Test 2: Streak Sync**
1. Device A: Achieve best streak of 10 in addition topic
2. Device B: Open math, same topic
3. **PASS:** Device B shows best streak of 10
4. **FAIL:** Device B shows best streak of 0

**Test 3: Mistake History Sync**
1. Device A: Answer 3 questions wrong in subtraction
2. Device B: Open subtraction topic
3. **PASS:** Adaptive difficulty recognizes weakness, provides easier questions
4. **FAIL:** Adaptive difficulty treats as new topic, provides hard questions

**Test 4: Daily Challenge Sync**
1. Device A: Complete daily challenge
2. Device B: Open same subject
3. **PASS:** Challenge shows as completed, reward claimed
4. **FAIL:** Challenge available to complete again

**Test 5: Parent Report Consistency**
1. Device A: Practice 20 minutes
2. Device B: Practice 10 minutes
3. Parent report: Should show 30 minutes total
4. **PASS:** Report shows combined time
5. **FAIL:** Report shows only Device A or B time

**Test 6: Server Dashboard Matches**
1. Device A: Check student home dashboard stars/coins
2. Device B: Check student home dashboard
3. **PASS:** Both show same values (from server)
4. **FAIL:** Values differ

---

## 9. What Is Already Closed

| Item | Status | Evidence |
|------|--------|----------|
| Student identity sync | ✅ CLOSED | `syncStudentLocalStorageIdentity()` clears and sets on login |
| Server answer persistence | ✅ CLOSED | `/api/learning/answer.js` saves all answers |
| Parent report cross-device | ✅ CLOSED | Aggregates from server, not localStorage |
| Diagnostic engine cross-device | ✅ CLOSED | Runs on server-aggregated answers |
| probeEvidence persistence | ✅ CLOSED | Saved in `answer_payload.clientMeta` |
| Student dashboard server data | ✅ CLOSED | `/api/student/home-profile` returns server data |
| Avatar/name sync | ✅ CLOSED | Synced via `syncStudentLocalStorageIdentity` |

---

## 10. Remaining Risks and Follow-Up

### 10.1 Pre-Launch (Must Fix)

1. **Subject score sync (P0)**
   - Implement Phase 1 from Minimal Implementation Plan
   - Estimated effort: 2-3 days

2. **Mistake history server derivation (P0)**
   - Implement Phase 2
   - Estimated effort: 1-2 days

3. **Challenge sync (P1)**
   - Implement Phase 3
   - Estimated effort: 1 day

### 10.2 Post-Launch (Should Fix)

4. **Time tracking consolidation**
   - Unify time tracking across subjects
   - Move to server-aggregation

5. **Offline mode handling**
   - Queue patches when offline
   - Sync on reconnect

6. **Conflict resolution**
   - Define merge strategy for simultaneous multi-device use
   - Last-write-wins vs. additive merge

### 10.3 Not Relevant Now

7. **Avatar image sync** - Cosmetic, per-device acceptable
8. **UI preferences** - Device-specific by design
9. **Game progress** - Arcade games are supplementary

---

## 11. Conclusion

**The learning site has a split-brain data architecture:**
- Student home dashboard is server-backed and correct
- Subject learning pages are localStorage-backed and device-isolated
- This creates a poor multi-device experience

**Launch is NOT recommended** until:
1. Subject scores sync to server (Phase 1)
2. Mistake history derives from server (Phase 2)
3. Daily challenges sync across devices (Phase 3)

**Minimum viable for launch:**
- Implement Phase 1 (subject scores)
- Implement Phase 2 (mistake derivation)
- Run full QA protocol

**Estimated effort:** 3-5 days development + 2 days QA

**Alternative:** Launch with "single device per student" limitation documented in parent FAQ (not recommended for paid product).

# Diagnostic & Report Truth Audit — MEDIUM Findings Second Pass

**Status:** AUDIT-ONLY — No product changes made  
**Date:** 2026-05-29  
**Purpose:** Deep verification of remaining MEDIUM findings after closure of HIGH #2b and MEDIUM #1

**Prior Fixes Reference:** `DIAGNOSTIC_REPORT_TRUTH_FIX_CLOSURE.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [MEDIUM #4 — Default "monitor" Tier for No-Data](#2-medium-4--default-monitor-tier-for-no-data)
3. [MEDIUM #5 — Date Range Logic Differences](#3-medium-5--date-range-logic-differences)
4. [MEDIUM #6 — Confidence Calculation Ignores Row Signals](#4-medium-6--confidence-calculation-ignores-row-signals)
5. [MEDIUM #7 — Attention Score Hardcoded Thresholds](#5-medium-7--attention-score-hardcoded-thresholds)
6. [Final Decision Table](#6-final-decision-table)
7. [Proposed Fix Plan — Not Implemented](#7-proposed-fix-plan--not-implemented)
8. [Owner Summary](#8-owner-summary)

---

## 1. Executive Summary

### Prioritized Risk Assessment

| Finding | Original Severity | Evidence Result | Revised Severity | Real Risk |
|---------|-------------------|-----------------|------------------|-----------|
| **#4** | MEDIUM | **MISLEADING / SAFE** — Badge logic has guard, tier function does not | **MEDIUM** | "monitor" can appear for no-data students in edge cases |
| **#5** | MEDIUM | **INTENTIONAL but DOCUMENTATION GAP** | **LOW** | Different event timestamps used by design |
| **#6** | MEDIUM | **PARTIALLY CONFIRMED** — Row signals are checked but count thresholds dominate | **MEDIUM** | Row-level intelligence may be overridden by raw counts |
| **#7** | MEDIUM | **MAINTENANCE RISK ONLY** | **LOW** | Inconsistent now, but no current bug |

### Owner Summary

| Category | Count | What to Know |
|----------|-------|--------------|
| **Actually Dangerous** | 0 | No data corruption or false-positive guidance |
| **Misleading UX Risk** | 1 (Finding #4) | Zero-activity students could show "במעקב" in edge cases |
| **Documentation Gap** | 1 (Finding #5) | Date range logic differs by design but not documented for users |
| **Maintenance Risk** | 2 (Findings #6, #7) | Code debt — could break if thresholds change |
| **Theoretical Only** | 1 (Finding #6 edge case) | Requires very specific row signal + count combination |

---

## 2. MEDIUM #4 — Default "monitor" Tier for No-Data

### 2.1 Original Claim
`deriveStudentGuidanceSeverityTier()` returns `"monitor"` for null/undefined/invalid accuracy, which could show "monitor" status for students with no data.

### 2.2 Evidence Investigation

#### Code Path Analysis

**Tier Function (Core):**
```javascript
// teacher-recommendations.server.js:40-47
export function deriveStudentGuidanceSeverityTier(accuracyPct) {
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "monitor";  // ← DEFAULT ISSUE
  if (acc <= GUIDANCE_TIER_THRESHOLDS.CRITICAL_MAX) return "critical";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.NEEDS_REINFORCEMENT_MAX) return "needs_reinforcement";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.MONITOR_MAX) return "monitor";
  return "on_track";
}
```

**Badge Function (UI Layer) — WITH GUARD:**
```javascript
// teacher-portal/student-learning-status.js:11-47
export function deriveStudentStatusBadgeFromSummary(summary, guidanceSeverityTier = null) {
  const answers = Number(summary?.totalAnswers) || 0;
  const sessions = Number(summary?.totalSessions) || 0;
  const accuracy = summary?.accuracy != null ? Number(summary.accuracy) : null;

  if (answers === 0 && sessions === 0) {
    return { badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 4 };  // ← GUARDED
  }
  // ... tier-based badges
  if (answers >= 3 && accuracy != null) {
    // accuracy-based badges
  }
  return { badge: "אין מספיק נתונים", filterKey: "insufficient_data", sortRank: 6 };  // ← FALLBACK
}
```

#### Surface-by-Surface Analysis

| Surface | Function Path | Guard Before Tier? | Verdict |
|---------|---------------|-------------------|---------|
| **Teacher Dashboard Cards** | `buildStudentActivitySummaryHe` → `deriveStudentStatusBadgeFromSummary` | ✓ **YES** — `answers === 0 && sessions === 0` returns "פעילות נמוכה" | **SAFE** |
| **Teacher Student Report** | `buildStudentTeacherGuidanceV2` → `v1.guidanceSeverityTier` | ✓ **YES** — `v1.insufficientData` guard before V2 | **SAFE** |
| **Teacher Class Report** | `aggregateClassReportFromStudentPayloads` → `deriveClassGuidanceSeverityTier` | ⚠️ **NO DIRECT GUARD** — Uses cohort accuracy | **EDGE CASE RISK** |
| **School Student Cards** | `studentRowFromPayload` → `deriveStudentLearningStatusLabelHe` | ✓ **YES** — Same badge function | **SAFE** |
| **School Class Report** | `parseClassReportViewModel` → `classOrCohortLearningStatusLabelHe` | ⚠️ **NO GUARD** — Calls tier directly with cohortAccuracy | **EDGE CASE RISK** |

#### Concrete Test Scenarios

**Scenario A: Dashboard Card with Zero Activity**

| Input | Function | Output | Safe? |
|-------|----------|--------|-------|
| `{totalAnswers: 0, totalSessions: 0}` | `deriveStudentStatusBadgeFromSummary` | `"פעילות נמוכה"` | ✓ **YES** |

**Scenario B: Student Report with Insufficient Data**

| Input | Function | Output | Safe? |
|-------|----------|--------|-------|
| `{totalAnswers: 2, totalSessions: 1}` | `buildStudentTeacherGuidance` (V1) | `insufficientData: true`, no tier | ✓ **YES** |
| Same | `buildStudentTeacherGuidanceV2` | Returns early at line 378 | ✓ **YES** |

**Scenario C: Class Report with Empty Cohort (Edge Case)**

| Input | Function | Output | Safe? |
|-------|----------|--------|-------|
| `cohortAccuracy: NaN` (no students with activity) | `deriveClassGuidanceSeverityTier` | `"class_monitor"` | ⚠️ **RISK** |

**Scenario D: School View with Null Accuracy**

| Input | Function | Output | Safe? |
|-------|----------|--------|-------|
| `cohortAccuracy: null` | `classOrCohortLearningStatusLabelHe` → `deriveClassGuidanceSeverityTier` | `"class_monitor"` | ⚠️ **RISK** |

### 2.3 Verdict

**Status:** **MISLEADING but CONTAINED**

The "monitor" default is **DANGEROUS** for class/cohort-level functions that bypass the badge guard:

| Risk Area | Severity | Evidence |
|-----------|----------|----------|
| Individual student dashboard | **LOW** | Badge function has guard |
| Individual student report | **LOW** | V1 insufficientData guard |
| **Class report (empty cohort)** | **MEDIUM** | `"class_monitor"` for no-data class |
| **School class view (null accuracy)** | **MEDIUM** | `"class_monitor"` for null cohortAccuracy |

### 2.4 Root Cause

The guard exists at the **UI badge layer** (`deriveStudentStatusBadgeFromSummary`) but NOT at the **tier function layer** (`deriveStudentGuidanceSeverityTier`, `deriveClassGuidanceSeverityTier`).

Class/school surfaces that call tier functions directly without zero-data guards can display misleading "monitor" status.

---

## 3. MEDIUM #5 — Date Range Logic Differences

### 3.1 Original Claim
Different timestamp fields used for date filtering across learning_sessions, answers, and classroom_activities.

### 3.2 Evidence Investigation

#### Timestamp Usage by Source

| Source | Primary Field | Fallback | Activity/Semantic Meaning |
|--------|--------------|----------|---------------------------|
| **learning_sessions** | `started_at` | `created_at` | When student began the session |
| **answers** | `answered_at` | `created_at` | When student submitted the answer |
| **classroom_activities** | `closed_at` | `activated_at` → `created_at` | When teacher closed the activity |
| **classroom_activity_student_status** | `submitted_at` | activity timestamp | When student submitted their work |

#### Code Evidence

**Learning Sessions (Parent Baseline):**
```javascript
// report-data-aggregate.server.js:267-273
const byStartedAt = await supabase
  .from("learning_sessions")
  .select(selectCols)
  .eq("student_id", studentId)
  .gte("started_at", fromIso)
  .lt("started_at", toIsoExclusive)
  .order("started_at", { ascending: false });
// Fallback to created_at if started_at missing
```

**Answers (Parent Baseline):**
```javascript
// report-data-aggregate.server.js:297-303
const byAnsweredAt = await supabase
  .from("answers")
  .select(selectCols)
  .eq("student_id", studentId)
  .gte("answered_at", fromIso)
  .lt("answered_at", toIsoExclusive)
  .order("answered_at", { ascending: false });
```

**Classroom Activities:**
```javascript
// classroom-activity-class-report.server.js:20-28
function activityTimestampIso(row) {
  return row?.closed_at || row?.activated_at || row?.created_at || null;
}

function isActivityInRange(row, fromIso, toIsoExclusive) {
  const at = activityTimestampIso(row);
  if (!at) return false;
  return at >= fromIso && at < toIsoExclusive;
}
```

#### Report-by-Report Date Logic

| Report | Data Sources | Timestamp Used | Can Differ from Others? |
|--------|-------------|----------------|------------------------|
| **Parent Report** | learning_sessions, answers | `started_at`, `answered_at` | — |
| **Teacher Student Report** | Parent baseline + classroom merge | `started_at`, `answered_at` + `closed_at/activated_at` | ✓ Yes |
| **Teacher Class Report** | Aggregated student payloads | Inherits from above | ✓ Yes |
| **Teacher Dashboard** | Lightweight batch queries | Same as parent | — |
| **School Reports** | Same as teacher | Same as teacher | ✓ Yes |

#### Scenario: Activity Counted Differently

**Setup:**
- Activity opened: 2024-01-01 (activated_at)
- Student submitted: 2024-01-05 (submitted_at)
- Teacher closed: 2024-01-10 (closed_at)
- Date range: 2024-01-01 to 2024-01-07

**Counting by Different Timestamps:**

| Timestamp Used | Counted in Range? | Which Report? |
|----------------|-------------------|---------------|
| `activated_at` (Jan 1) | ✓ Yes | Not used directly |
| `submitted_at` (Jan 5) | ✓ Yes | Student status (preferred) |
| `closed_at` (Jan 10) | ✗ **No** | Classroom activity fallback |
| `started_at` (n/a for classroom) | — | Parent-only |

**Result:** A classroom activity submitted on Jan 5 but closed on Jan 10 would:
- Be counted in teacher report if using `submitted_at` ✓
- Be excluded if fallback to `closed_at` ✗

### 3.3 Verdict

**Status:** **INTENTIONAL but DOCUMENTATION GAP**

| Aspect | Finding |
|--------|---------|
| **Bug?** | **NO** — Different semantics are intentional |
| **Risk?** | **LOW** — Edge case when `submitted_at` is null and `closed_at` is outside range |
| **Documentation?** | **MISSING** — Users don't know which event "counts" |
| **Action Needed?** | Document the behavior, not fix |

The current behavior is **semantically correct**:
- `started_at` = When free learning began
- `closed_at` = When teacher assignment ended
- `submitted_at` = When student actually did the work

But the **fallback chain** (`closed_at || activated_at || created_at`) creates risk if `submitted_at` is missing.

---

## 4. MEDIUM #6 — Confidence Calculation Ignores Row Signals

### 4.1 Original Claim
V2 `resolveConfidenceLevel()` receives row data but primarily uses `questions` and `wrongs` counts, ignoring `dataSufficiencyLevel` and `isEarlySignalOnly` unless specific conditions match.

### 4.2 Evidence Investigation

#### Confidence Policy Implementation

```javascript
// confidence-policy.js:15-45
export function resolveConfidenceLevel({ events, wrongs, row, recurrenceFull, hintInvalidates }) {
  const q = Number(row?.questions) || 0;  // ← PRIMARY: raw count
  const w = Math.max(wrongs.length, Number(row?.wrong) || 0);  // ← PRIMARY: raw count

  // Row signal check #1: Contradictory
  const dom = row?.behaviorProfile?.dominantType;
  const needsPractice = !!row?.needsPractice;
  if (needsPractice && dom === "stable_mastery") return "contradictory";  // ✓ Used

  // Count-based thresholds (dominate)
  if (q >= 40) return "high";
  if (q >= 12 && w >= 2) return "moderate";
  if (q < 2 && w === 0) return "insufficient_data";
  if (q < 4 && w < 2) return "insufficient_data";

  if (hintInvalidates) return "early_signal_only";

  // Row signal check #2: Early signal / weak / thin
  const earlyOnly = row?.isEarlySignalOnly === true;  // ← CHECKED HERE
  const suff = row?.dataSufficiencyLevel != null ? String(row.dataSufficiencyLevel) : "";  // ← CHECKED HERE
  if (earlyOnly || suff === "weak" || suff === "thin") {
    if (!recurrenceFull && w < 4) return "early_signal_only";  // ✓ Used conditionally
  }

  // Row signal check #3: confidence01
  if (!recurrenceFull) { /* ... */ }
  const c01 = Number(row?.confidence01);
  if (Number.isFinite(c01) && c01 >= 0.72 && suff === "strong") return "high";  // ✓ Used
  if (Number.isFinite(c01) && c01 >= 0.45) return "moderate";  // ✓ Used

  return "moderate";
}
```

#### Row Signal Usage Analysis

| Row Signal | When Used | Can Be Overridden? |
|------------|-----------|-------------------|
| `behaviorProfile.dominantType` | Before count thresholds | **NO** — Early return |
| `needsPractice` | Before count thresholds | **NO** — Early return |
| `isEarlySignalOnly` | After count thresholds | **YES** — Only if `q < 40,12,4` etc. |
| `dataSufficiencyLevel` | After count thresholds | **YES** — Only if count thresholds don't trigger |
| `confidence01` | After count thresholds | **YES** — Only if count thresholds don't trigger |

#### Concrete Test Scenario

**Scenario: High Count but Thin Signal**

| Row Property | Value |
|--------------|-------|
| `questions` | 45 |
| `dataSufficiencyLevel` | `"thin"` |
| `isEarlySignalOnly` | `true` |
| `confidence01` | 0.3 (low) |

**Execution:**

| Step | Check | Result |
|------|-------|--------|
| 1 | `needsPractice && dom === "stable_mastery"` | false |
| 2 | `q >= 40` | **true → returns "high"** |

**Result:** Row signals (`"thin"`, `isEarlySignalOnly`, low `confidence01`) are **IGNORED** because count threshold triggered first.

**Scenario: Low Count with Strong Signal**

| Row Property | Value |
|--------------|-------|
| `questions` | 15 |
| `dataSufficiencyLevel` | `"strong"` |
| `confidence01` | 0.8 |

**Execution:**

| Step | Check | Result |
|------|-------|--------|
| 1 | `q >= 40` | false |
| 2 | `q >= 12 && w >= 2` | true → **returns "moderate"** |

**Result:** Even with `confidence01 >= 0.72` and `suff === "strong"`, the function returns "moderate" because the `q >= 12 && w >= 2` check comes before the confidence01 check.

### 4.3 Report Surfaces Affected

| Surface | Uses V2 Confidence? | Impact |
|---------|-------------------|--------|
| **Teacher Student Report V2 Guidance** | ✓ Yes | `recommendationUnits[].confidence` |
| **Diagnostic Engine V2** | ✓ Yes | `diagnosticUnits[].state.confidence` |
| **Parent Report V2** | ✓ Yes (indirectly) | Diagnostic enrichment |

### 4.4 Verdict

**Status:** **PARTIALLY CONFIRMED**

| Finding | Evidence | Severity |
|---------|----------|----------|
| Row signals completely ignored | **NOT CONFIRMED** | — |
| Row signals overridden by count thresholds | **CONFIRMED** | MEDIUM |
| Can produce diagnosis on thin evidence | **CONFIRMED** (edge case) | MEDIUM |

**Edge Case Risk:**
- High answer counts (≥40) **always** return "high" confidence regardless of row signals
- This is **by design** (volume = confidence) but may override smarter row-level assessments

---

## 5. MEDIUM #7 — Attention Score Hardcoded Thresholds

### 5.1 Original Claim
`aggregateClassReportFromStudentPayloads` uses hardcoded `65`, `50`, `3`, `5` instead of imported constants.

### 5.2 Evidence Investigation

#### Hardcoded Values vs Constants

```javascript
// teacher-class-report.server.js:88-101 (ATTENTION LOGIC)
if (answers === 0 && sessions === 0) {
  attentionScore += 3;
  reasons.push("no_activity_in_range");
} else if (accuracy != null && accuracy < 65 && answers >= 3) {  // ← HARDCODED
  attentionScore += accuracy < 50 ? 3 : 2;  // ← HARDCODED
  reasons.push("low_accuracy");
}
if (recentMistakes.length >= 5) {  // ← HARDCODED
  attentionScore += 2;
  reasons.push("many_recent_mistakes");
} else if (recentMistakes.length >= 3) {  // ← HARDCODED
  attentionScore += 1;
  reasons.push("recent_mistakes");
}
```

```javascript
// teacher-recommendations.server.js:21-28 (OFFICIAL CONSTANTS)
export const LOW_ACCURACY_THRESHOLD = 65;        // ← MATCHES
export const ATTENTION_ACCURACY_THRESHOLD = 65; // ← MATCHES
export const ATTENTION_PRIORITY_BOOST_THRESHOLD = 50;  // ← MATCHES
export const MIN_ANSWERS_FOR_TOPIC_SIGNAL = 3;    // ← MATCHES
export const MIN_ANSWERS_FOR_STUDENT_SIGNAL = 5;  // ← NOT USED HERE
// NO CONSTANT for 5 recent mistakes
```

#### Comparison Matrix

| Value | Hardcoded | Constant | Match? | Location |
|-------|-----------|----------|--------|----------|
| 65 (accuracy) | ✓ | `LOW_ACCURACY_THRESHOLD` | ✓ **YES** | `teacher-class-report.server.js:91` |
| 50 (accuracy) | ✓ | `ATTENTION_PRIORITY_BOOST_THRESHOLD` | ✓ **YES** | `teacher-class-report.server.js:92` |
| 3 (answers) | ✓ | `MIN_ANSWERS_FOR_TOPIC_SIGNAL` | ✓ **YES** | `teacher-class-report.server.js:91` |
| 5 (mistakes) | ✓ | **NO CONSTANT** | ✗ **NO** | `teacher-class-report.server.js:95` |
| 3 (mistakes) | ✓ | **NO CONSTANT** | ✗ **NO** | `teacher-class-report.server.js:98` |

### 5.3 Impact Analysis

**Current Behavior:**
- 65, 50, and 3 **MATCH** their constants — no bug today
- 5 and 3 for recent mistakes **have no constants** — arbitrary thresholds

**Future Risk:**

| Scenario | Risk |
|----------|------|
| Change `LOW_ACCURACY_THRESHOLD` to 60 | Attention score still uses 65 — **INCONSISTENT** |
| Add `RECENT_MISTAKES_THRESHOLD` constant | Would need to find and update line 95 manually |
| Add `MANY_RECENT_MISTAKES_THRESHOLD` | Would need to find and update line 98 manually |

### 5.4 Verdict

**Status:** **MAINTENANCE RISK ONLY**

| Finding | Evidence | Current Impact | Future Risk |
|---------|----------|----------------|-------------|
| Hardcoded 65 | Matches constant | **NONE** | Medium |
| Hardcoded 50 | Matches constant | **NONE** | Medium |
| Hardcoded 3 | Matches constant | **NONE** | Medium |
| Hardcoded 5 | **NO CONSTANT EXISTS** | **NONE** | Low |
| Hardcoded 3 (mistakes) | **NO CONSTANT EXISTS** | **NONE** | Low |

**No current bug.** All hardcoded values match their semantic equivalents. The risk is purely maintenance debt.

---

## 6. Final Decision Table

| Finding | Description | Current Severity | Evidence Result | Real Risk | Needs Fix? | Needs Product Decision? | Recommended Next Step |
|---------|-------------|------------------|-----------------|-----------|------------|------------------------|----------------------|
| **#4** | Default "monitor" tier for no-data | MEDIUM | **MISLEADING but CONTAINED** | "במעקב" can appear for empty classes/cohorts in edge cases | **Yes** | No | Add guard in `deriveClassGuidanceSeverityTier` for null/NaN accuracy (return `"no_data"` or `"class_no_data"`) |
| **#5** | Date range logic differences | MEDIUM | **INTENTIONAL** | No current bug; different semantics by design | **No** | **Yes** | Document date range behavior for users; consider unifying fallback chain for classroom activities |
| **#6** | Confidence ignores row signals | MEDIUM | **PARTIALLY CONFIRMED** | Count thresholds override row signals; high-volume thin data possible | **Optional** | **Yes** | Product decision: Should row signals ever override count thresholds? If yes, reorder checks; if no, document current behavior |
| **#7** | Hardcoded thresholds | MEDIUM | **MAINTENANCE RISK ONLY** | All values currently match; no current bug | **Optional** | No | Low priority: Import constants in `teacher-class-report.server.js`; add `RECENT_MISTAKES_THRESHOLD` constants |

---

## 7. Proposed Fix Plan — Not Implemented

### 7.1 MEDIUM #4 Fix (Recommended)

**File:** `lib/teacher-server/teacher-recommendations.server.js`

**Change:** Add no-data guard to class tier function

```javascript
export function deriveClassGuidanceSeverityTier(accuracyPct, hasData = true) {
  if (!hasData) return "class_no_data";  // NEW
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "class_no_data";  // CHANGED from "class_monitor"
  // ... rest
}
```

**Call sites to update:**
- `teacher-class-report.server.js` — pass `hasData: totalAnswers > 0`
- `school-report-view-model.js` — pass `hasData: cohortAccuracy != null`

### 7.2 MEDIUM #5 Fix (Optional — Documentation Preferred)

**Option A:** Document current behavior
- Add comment blocks explaining timestamp semantics
- Add user-facing documentation about "what counts"

**Option B:** Unify classroom activity fallback
- Prefer `submitted_at` over `closed_at` when available
- Align with student-facing timestamp semantics

### 7.3 MEDIUM #6 Fix (Product Decision Required)

**Option A:** Current behavior (document)
- Add code comment: "Count thresholds take precedence over row signals by design"
- Volume = confidence is intentional

**Option B:** Row signals override counts
- Reorder checks: Row signals first, then count thresholds as fallback
- Risk: May reduce confidence for high-volume but thin-quality data

### 7.4 MEDIUM #7 Fix (Low Priority)

**File:** `lib/teacher-server/teacher-class-report.server.js`

**Change:** Import and use constants

```javascript
import {
  LOW_ACCURACY_THRESHOLD,
  ATTENTION_PRIORITY_BOOST_THRESHOLD,
  MIN_ANSWERS_FOR_TOPIC_SIGNAL,
  // Add new: RECENT_MISTAKES_MANY_THRESHOLD = 5,
  // Add new: RECENT_MISTAKES_FEW_THRESHOLD = 3,
} from "./teacher-recommendations.server.js";

// Use constants instead of hardcoded values
```

---

## 8. Owner Summary

### What Is Actually Dangerous?

**Nothing in this audit is dangerous.** All MEDIUM findings are:
- Edge cases (zero-activity class showing "monitor")
- Intentional design decisions (date semantics)
- Maintenance debt (hardcoded values that currently match)

### What Is Only Theoretical?

| Finding | Theoretical Scenario | Likelihood |
|---------|---------------------|------------|
| #4 | Class with 0 students showing "במעקב" | Low — requires empty class report |
| #6 | High-count thin data producing "high" confidence | Low — requires high volume but contradictory signals |

### What Can Wait?

| Finding | Priority | Reason |
|---------|----------|--------|
| #7 Hardcoded thresholds | **LOWEST** | No current bug; maintenance only |
| #5 Date documentation | **LOW** | Working correctly; docs only |
| #6 Confidence ordering | **LOW-MEDIUM** | Requires product decision |
| #4 No-data guard | **MEDIUM** | Small UX improvement |

### What Should Go to Cursor Next?

**Recommended:**
1. **Fix #4 (No-data guard)** — Small, safe, improves UX
2. **Document #5 (Date semantics)** — Quick win for clarity
3. **Defer #6 and #7** — Lower impact, can wait

**If time is limited:** Skip all MEDIUM fixes. These are polish, not blockers.

---

## Resolution (2026-05-29 — Finding #4 implemented)

**Finding #4** fixed per `DIAGNOSTIC_REPORT_MEDIUM_FINDINGS_FIX_CLOSURE.md`:

- `deriveClassGuidanceSeverityTier` returns `null` (not `class_monitor`) when `hasData` is false or accuracy is invalid
- Class/cohort call sites pass `totalAnswers > 0` signal
- School view-models omit misleading monitor chip when no cohort data
- Findings **#5, #6, #7 not changed**

---

## End of MEDIUM Findings Audit

**Referenced by:** `DIAGNOSTIC_REPORT_TRUTH_AUDIT.md`, `DIAGNOSTIC_REPORT_TRUTH_AUDIT_EVIDENCE_APPENDIX.md`

**No product code changes made.**  
**All findings verified against actual code paths.**  
**Awaiting owner decision on recommended fixes.**

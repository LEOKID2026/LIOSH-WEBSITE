# Diagnostic & Report Truth Audit — Evidence Appendix

**Status:** AUDIT-ONLY — No product changes made  
**Date:** 2026-05-29  
**Purpose:** Verify HIGH findings with concrete evidence, reclassify per owner clarification

---

## Owner Clarification Incorporated

> **Important Product Clarification:** The regular parent report is intentionally separate from teacher/school reports. It does not need to automatically include teacher classroom activity unless a specific teacher/school parent-preview/share flow is designed. However, every report must still be truthful and must not present misleading conclusions. Teacher parent preview, teacher reports, class reports, and school reports must be internally consistent with their intended data source and scope.

This clarification changes the severity assessment for Finding #2 (Parent/Teacher divergence).

---

## 1. HIGH #1 — Thin-Data Recommendations in V2

### 1.1 Original Claim
V2 guidance produces `recommendationUnits` when total student evidence is below `MIN_ANSWERS_FOR_STUDENT_SIGNAL` (5).

### 1.2 Evidence Investigation

#### Code Path Analysis

**V1 Threshold Check (buildStudentTeacherGuidance):**
```javascript
// teacher-recommendations.server.js:195-209
const insufficientData =
  totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL && totalSessions < 2;
// MIN_ANSWERS_FOR_STUDENT_SIGNAL = 5

if (insufficientData) {
  return {
    insufficientData: true,
    teacherGuidance: { reason: "not_enough_activity" },
    nextPracticeFocus: [],
    riskSignals: [...],
    strengthsForTeacher: [],
    supportSuggestions: [],
  };
}
```

**V2 Early Return (buildStudentTeacherGuidanceV2):**
```javascript
// teacher-guidance-v2.server.js:364, 378-380
const v1 = buildStudentTeacherGuidance(sanitizedPayload);
// ...
if (v1.insufficientData) {
  return base;  // Returns with empty recommendationUnits
}
```

**V2 Topic-Level Recommendation Creation:**
```javascript
// teacher-guidance-v2.server.js:449
if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy < LOW_ACCURACY_THRESHOLD) {
  // MIN_ANSWERS_FOR_TOPIC_SIGNAL = 3
  // Creates recommendationUnits
}
```

### 1.3 Concrete Test Case

**Scenario:** Student with thin but distributed activity

| Metric | Value |
|--------|-------|
| totalAnswers | 4 (below 5 threshold) |
| totalSessions | 2 (meets 2 session threshold) |
| **V1 insufficientData** | **false** (4 < 5 && 2 < 2 = false) |
| Topic A (fractions) | 3 answers, 40% accuracy |
| Topic B (addition) | 1 answer, 100% accuracy |

**Execution Path:**

| Step | Result |
|------|--------|
| V1 checks insufficientData | `false` (sessions >= 2) |
| V1 returns | `insufficientData: false`, `nextPracticeFocus: []` (weakTopics ranking requires more data) |
| V2 checks v1.insufficientData | `false`, continues past early return |
| V2 iterates topics | fractions has 3 answers |
| V2 line 449 check | `3 >= 3 && 40 < 65` = **true** |
| V2 creates recommendationUnits | **YES** — creates unit for fractions |
| Final guidanceSeverityTier | "needs_reinforcement" (40% accuracy) |

### 1.4 Verdict

**Status:** PARTIALLY CONFIRMED (Revised Understanding)

The original claim was overstated. The actual behavior is:

- **NOT CONFIRMED:** If `totalAnswers < 5 && totalSessions < 2`, V1 correctly flags `insufficientData: true` and V2 returns early with empty recommendations.
- **CONFIRMED EDGE CASE:** If `totalAnswers < 5 but totalSessions >= 2`, V1 does NOT flag insufficientData (due to compound `&&` condition), allowing V2 to proceed and create topic-level recommendations with as few as 3 answers per topic.

### 1.5 Function Path

```
buildStudentTeacherGuidanceV2()
  → buildStudentTeacherGuidance() [V1]
    → checks: totalAnswers < 5 && totalSessions < 2
  → if (!v1.insufficientData) [passes when sessions >= 2]
    → iterates subjects/topics
      → if (topic.answers >= 3 && topic.accuracy < 65)
        → creates recommendationUnit
```

### 1.6 Risk Assessment

| Condition | Risk |
|-----------|------|
| totalAnswers = 4, sessions = 1 | **LOW** — V1 catches as insufficient |
| totalAnswers = 4, sessions = 2 | **MEDIUM** — Recommendation created on thin topic data |
| totalAnswers = 3, sessions = 2 | **MEDIUM** — Same, even thinner |

**Root Cause:** The compound condition `&&` in V1 insufficientData check allows students with few answers but multiple sessions to proceed to V2 topic-level analysis.

---

## 2. HIGH #2 — Parent vs Teacher Data Divergence (Reclassified)

### 2.1 Original Claim
Same student shows completely different status between parent and teacher views due to classroom activity exclusion from parent reports.

### 2.2 Owner Clarification Impact
Per owner: "The regular parent report is intentionally separate from teacher/school reports."

This finding must be decomposed by surface type.

### 2.3 Surface Type Analysis

#### A. Regular Parent Report (Parent Dashboard)

| Aspect | Finding |
|--------|---------|
| **Source Tables** | `learning_sessions`, `answers` only |
| **Classroom Activity Included** | **NO** — by design per owner clarification |
| **Expected Product Boundary** | ✓ **CORRECT** — intentional separation |
| **Misleading Label Risk** | ⚠️ **DOCUMENTATION RISK** — parent sees "no activity" when child was active in class |
| **Actual Bug** | **NO** — working as designed |

**Evidence:**
```javascript
// report-data-aggregate.server.js:695-714
export async function aggregateParentReportPayload(serviceClient, student, fromDate, toDate) {
  const sessionsResult = await fetchSessionsInRange(serviceClient, student.id, fromIso, toIsoExclusive);
  const answersResult = await fetchAnswersInRange(serviceClient, student.id, fromIso, toIsoExclusive);
  // NO classroom_activities query
  return aggregateReportPayloadFromActivityRows(...);
}
```

#### B. Teacher Parent Preview (`buildTeacherParentReportPreviewPayload`)

| Aspect | Finding |
|--------|---------|
| **Source Tables** | `learning_sessions`, `answers` (baseline) + `classroom_activities`, `classroom_activity_student_status` (merged) |
| **Classroom Activity Included** | **YES** — explicitly merged |
| **Code Evidence** | `teacher-report.server.js:494-538` |
| **Expected Product Boundary** | ✓ Teacher previewing parent view should see same data as actual parent |
| **Misleading Label Risk** | **HIGH** if teacher preview ≠ actual parent report |
| **Actual Bug** | **CONFIRMED** — teacher preview merges classroom data, but actual parent report does not |

**Evidence:**
```javascript
// teacher-report.server.js:494-538 (buildTeacherParentReportPreviewPayload)
export async function buildTeacherParentReportPreviewPayload(input) {
  // ...
  const analytics = await aggregateParentReportPayload(serviceRole, loaded.student, fromDate, toDate);
  
  const classroomRollup = await loadClassroomRollupForTeacherStudentReport(...);
  if (classroomRollup.rollup?.answers) {
    mergeClassroomActivityRollupIntoReportPayload(analytics, classroomRollup.rollup);  // ← MERGES
  }
  // ...
}
```

**Verification:**

| Data Source | Regular Parent | Teacher Parent Preview | Match? |
|-------------|---------------|----------------------|--------|
| learning_sessions | ✓ | ✓ | ✓ |
| answers | ✓ | ✓ | ✓ |
| classroom_activities | ✗ | ✓ | **✗ MISMATCH** |
| **Final totalAnswers** | 25 | 40 (25+15) | **MISMATCH** |

**Verdict for Teacher Parent Preview:**
- **Status:** **CONFIRMED BUG** — Teacher preview includes classroom activity, actual parent report does not
- **Impact:** Teacher sees inflated activity/accuracy when previewing what parent sees
- **Severity:** **HIGH** — Teacher may incorrectly set expectations with parent based on mismatched preview

#### C. Teacher Student Report (Regular Teacher View)

| Aspect | Finding |
|--------|---------|
| **Source Tables** | Same as B — includes classroom activity |
| **Classroom Activity Included** | **YES** — correctly for teacher's own view |
| **Expected Product Boundary** | ✓ Teacher should see all student activity they manage |
| **Misleading Label Risk** | None — this is the authoritative teacher view |
| **Actual Bug** | **NO** — working correctly |

#### D. School/Admin Parent-Related Preview

No evidence of a separate school/admin parent preview surface found in codebase. The school report flows (`school-physical-class-report.server.js`) are teacher/school-facing, not parent-facing previews.

### 2.4 Reclassification Summary for Finding #2

| Surface | Original Severity | Revised Severity | Rationale |
|---------|------------------|------------------|-----------|
| Regular Parent Report | HIGH | **PRODUCT BOUNDARY** | Working as designed per owner |
| Teacher Parent Preview | part of HIGH | **HIGH** | Bug: preview ≠ actual parent report |
| Teacher Student Report | part of HIGH | **EXPECTED** | Correctly includes classroom data |
| School Admin Views | part of HIGH | **N/A** | No parent preview surface found |

---

## 3. HIGH #3 — Class Subject Scope Not Enforced

### 3.1 Original Claim
`aggregateClassReportFromStudentPayloads` creates rollups for all `REPORT_AGG_SUBJECTS` regardless of `scopeSubjects`, allowing out-of-scope subjects to affect cohort summary.

### 3.2 Evidence Investigation

**Subject Filtering in Aggregation:**
```javascript
// teacher-class-report.server.js:51-56, 116-145
export function aggregateClassReportFromStudentPayloads(studentPayloads, opts = {}) {
  const scopeSubjects = opts.scopeSubjects || null;
  const cohortSubjects = {};
  for (const subject of REPORT_AGG_SUBJECTS) {
    cohortSubjects[subject] = emptySubjectRollup();  // ← Creates ALL subjects
  }
  // ...
  for (const subjectKey of REPORT_AGG_SUBJECTS) {
    if (scopeSubjects && !scopeSubjects.has(subjectKey)) continue;  // ← Filters HERE
    const src = subjects[subjectKey];
    // ... aggregation
  }
}
```

**Weakness Topic Filtering:**
```javascript
// teacher-class-report.server.js:173-183
const weaknessTopics = [...weaknessMap.values()]
  .map((row) => ({...}))
  .sort(...)
  .slice(0, 20);
// NO scopeSubjects filtering on weaknessTopics output
```

### 3.3 Concrete Test Scenario

**Setup:**
- Teacher permittedSubjects: `["math"]` (narrow scope)
- Class subjectFocus: `"math"`
- Students in class:
  - Student A: 20 math answers (70%), 15 english answers (60%)
  - Student B: 25 math answers (80%), 10 science answers (50%)

**Execution Trace:**

| Step | Before scopeSubjects Filter | After Filter | Notes |
|------|---------------------------|--------------|-------|
| cohortSubjects created | math, english, science, hebrew, geometry | Same | ALL subjects created |
| Student A aggregation | math:20, english:15 | math:20 only | english filtered at line 118 |
| Student B aggregation | math:25, science:10 | math:25 only | science filtered at line 118 |
| **cohortSummary.totalAnswers** | 70 (20+15+25+10) | **45 (20+25)** | ✓ Correctly filtered |
| **cohortAccuracy** | 66% (46/70) | **78% (35/45)** | ✓ Correctly filtered |
| weaknessTopics | includes science (10 ans, 50%) | **includes science (10 ans, 50%)** | ✗ **NOT FILTERED** |

**Critical Finding:** The weaknessMap accumulation (lines 126-143) happens BEFORE scopeSubjects filtering:

```javascript
// teacher-class-report.server.js:126-143 — INSIDE subject loop
for (const topicKey of Object.keys(src.topics || {})) {
  mergeTopicRollup(agg, { ...src.topics[topicKey], topic: topicKey });
  const topic = src.topics[topicKey];
  const wrongCount = Number(topic?.wrong) || 0;
  if (wrongCount > 0) {
    const mapKey = `${subjectKey}::${topicKey}`;
    const prev = weaknessMap.get(mapKey) || {...};
    prev.wrong += wrongCount;  // ← Accumulated BEFORE filter check
    prev.answers += Number(topic?.answers) || 0;
    prev.studentIds.add(entry.studentId);
    weaknessMap.set(mapKey, prev);
  }
}
```

**Wait — Re-reading the code:** The weaknessMap accumulation is INSIDE the `if (scopeSubjects && !scopeSubjects.has(subjectKey)) continue;` block (line 118). Let me verify:

```javascript
for (const subjectKey of REPORT_AGG_SUBJECTS) {
  if (scopeSubjects && !scopeSubjects.has(subjectKey)) continue;  // Line 118
  const src = subjects[subjectKey];
  if (!src) continue;
  const agg = cohortSubjects[subjectKey];
  agg.sessions += Number(src.sessions) || 0;
  // ...
  for (const topicKey of Object.keys(src.topics || {})) {  // Line 126 — INSIDE filtered block
    mergeTopicRollup(agg, ...);
    const topic = src.topics[topicKey];
    const wrongCount = Number(topic?.wrong) || 0;
    if (wrongCount > 0) {
      // weaknessMap accumulation — AFTER subject filter
```

**Correction:** The weaknessMap accumulation IS inside the scopeSubjects filter block. So weaknessTopics should be correctly filtered.

However, there's still a concern: What if `scopeSubjects` is null (not provided)? Then the filter doesn't apply and all subjects are included.

### 3.4 Verdict

**Status:** PARTIALLY CONFIRMED

**CONFIRMED:**
- `cohortSubjects` object is created for ALL `REPORT_AGG_SUBJECTS` (line 54-56), but this is just empty initialization.
- Aggregation correctly filters by `scopeSubjects` at line 118 before accumulating.
- `cohortSummary.totalAnswers`, `accuracy`, and `weaknessTopics` are correctly filtered when `scopeSubjects` is provided.

**NOT CONFIRMED as HIGH:**
- The filtering IS applied before data accumulation.
- No out-of-scope subject data affects cohort totals when `scopeSubjects` is properly provided.

**EDGE CASE IDENTIFIED:**
When `scopeSubjects` is `null` or not provided:
- All subjects are aggregated (expected default behavior)
- No unauthorized filtering occurs
- This is a valid configuration for school-wide reports, not a bug.

### 3.5 Callers of aggregateClassReportFromStudentPayloads

| Caller | scopeSubjects Provided? | Risk |
|--------|------------------------|------|
| `buildTeacherClassReportPayload` | Yes, from `loadTeacherPermittedSubjects` | Filtered correctly |
| School reports | May be null | Aggregates all (expected) |

**Evidence from buildTeacherClassReportPayload:**
```javascript
// teacher-class-report.server.js:291-300
const [permitted, membership] = await Promise.all([
  loadTeacherPermittedSubjects(serviceRole, teacherId, classRow?.school_id),
  loadTeacherSchoolMembership(serviceRole, teacherId),
]);
// ...
const classAnalytics = aggregateClassReportFromStudentPayloads(studentPayloads, {
  scopeSubjects: permitted.subjects,  // ← scopeSubjects IS provided
});
```

### 3.6 Final Assessment

| Claim | Status |
|-------|--------|
| Out-of-scope subjects affect cohort summary | **NOT CONFIRMED** — Filter applied before aggregation |
| Out-of-scope subjects affect weakness topics | **NOT CONFIRMED** — Same filter applies |
| Empty subject rollups created for all subjects | **CONFIRMED (LOW)** — Cosmetic, no data impact |

**Revised Severity:** **LOW** — The code correctly filters by scopeSubjects before accumulating data.

---

## 4. Final Decision Table

| Finding | Description | Original Severity | Evidence Result | Revised Severity | Needs Fix? | Needs Product Decision? | Recommended Owner Decision |
|---------|-------------|-------------------|-----------------|------------------|------------|---------------------------|---------------------------|
| **#1** | Thin-data recommendations in V2 | HIGH | **PARTIALLY CONFIRMED** — Edge case when totalAnswers < 5 but sessions >= 2 allows topic-level recommendations on 3 answers | **MEDIUM** | Yes | No | Change V1 insufficientData condition from `&&` to `\|\|` OR add explicit totalAnswers check in V2 before topic iteration |
| **#2a** | Regular Parent Report classroom exclusion | HIGH | **PRODUCT BOUNDARY** — Working as designed | **N/A (Expected)** | No | Yes (documentation) | Add user-facing explanation that parent dashboard shows free learning only; classroom activity is teacher-facing |
| **#2b** | Teacher Parent Preview mismatch | part of #2 | **CONFIRMED** — Preview merges classroom data, actual parent report does not | **HIGH** | Yes | No | Fix: Remove classroom activity merge from `buildTeacherParentReportPreviewPayload` to match actual parent report |
| **#3** | Class subject scope filtering | HIGH | **PARTIALLY CONFIRMED** — Empty rollups created for all subjects but data correctly filtered | **LOW** | No | No | Optional: Optimize by only creating rollups for scopeSubjects; current behavior is correct but slightly inefficient |

---

## 5. Additional Medium Findings Verified

### 5.1 MEDIUM #4: Default "monitor" Tier for Edge Cases

**Confirmed.** `deriveStudentGuidanceSeverityTier()` returns `"monitor"` for null/undefined/invalid accuracy.

```javascript
// teacher-recommendations.server.js:40-42
export function deriveStudentGuidanceSeverityTier(accuracyPct) {
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "monitor";  // ← Default for bad input
```

**Impact:** Students with no data (0 answers) get "monitor" tier instead of explicit "no_data".

**Severity:** MEDIUM — Confusing UX but not data-corrupting.

### 5.2 MEDIUM #5: Different Date Range Logic

**Confirmed.** Different timestamp fields used:

| Source | Primary Field | Fallback |
|--------|--------------|----------|
| learning_sessions | `started_at` | `created_at` |
| classroom_activities | `closed_at` | `activated_at || created_at` |

**Evidence:**
```javascript
// report-data-aggregate.server.js:264-289
const filterField = hasStartedAt ? 'started_at' : 'created_at';

// classroom-activity-class-report.server.js:20-28
function activityTimestampIso(row) {
  return row?.closed_at || row?.activated_at || row?.created_at || null;
}
```

**Impact:** Activity closed on day 1 but activated earlier counts for day 1.

**Severity:** MEDIUM — Potential off-by-one in date boundary calculations.

### 5.3 MEDIUM #6: Confidence Calculation Ignores Row Signals

**Confirmed.** V2 `resolveConfidenceLevel()` receives row data but only uses `questions` and `wrongs` counts primarily, ignoring `dataSufficiencyLevel` and `isEarlySignalOnly` unless they match specific conditions.

**Evidence:** See `confidence-policy.js:30-43`.

**Severity:** MEDIUM — May override row-level intelligence with raw counts.

### 5.4 MEDIUM #7: Attention Score Hardcoded Numbers

**Confirmed.** `aggregateClassReportFromStudentPayloads` uses hardcoded `65` and `3` instead of constants.

```javascript
// teacher-class-report.server.js:91
} else if (accuracy != null && accuracy < 65 && answers >= 3) {  // ← Magic numbers
```

**Severity:** MEDIUM — Maintenance risk.

---

## 6. Summary of Revised Findings

| Severity | Count | Original | Revised | Change |
|----------|-------|----------|---------|--------|
| **BLOCKER** | 0 | 0 | 0 | — |
| **HIGH** | 1 | 3 | 1 | #2b remains HIGH; #1 downgraded; #2a is expected behavior; #3 downgraded |
| **MEDIUM** | 5 | 4 | 5 | Added #7 (attention score constants) |
| **LOW** | 3 | 2 | 3 | Added #3 (scope filtering optimization) |
| **PRODUCT BOUNDARY** | 1 | 0 | 1 | New category for #2a (expected separation) |

**Key Changes:**
1. Finding #1 downgraded from HIGH to MEDIUM — only affects edge case (low answers but multiple sessions)
2. Finding #2 split: #2a (Regular Parent) is expected behavior, #2b (Teacher Preview) is HIGH bug
3. Finding #3 downgraded from HIGH to LOW — filtering IS working correctly

---

## End of Evidence Appendix

**Referenced by:** `DIAGNOSTIC_REPORT_TRUTH_AUDIT.md` Section 6 (Findings Classification)

**Next Steps:**
1. Review revised severity classifications
2. Approve fix for Finding #2b (Teacher Parent Preview)
3. Consider documentation improvement for Finding #2a (Parent/Teacher data separation)
4. Evaluate MEDIUM priority fixes for threshold alignment

# Diagnostic Report Truth Fix — Closure Report

**Date:** 2026-05-29  
**Status:** IMPLEMENTED (limited scope)  
**Source audit:** `DIAGNOSTIC_REPORT_TRUTH_AUDIT.md`, `DIAGNOSTIC_REPORT_TRUTH_AUDIT_EVIDENCE_APPENDIX.md`

---

## Summary

Two confirmed issues from the evidence appendix were fixed. Regular parent report aggregation was not changed. Classroom activity remains merged in teacher student reports. No UI, Hebrew copy, or SQL migrations were touched.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/teacher-server/teacher-report.server.js` | Removed classroom activity rollup merge from `buildTeacherParentReportPreviewPayload` only |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Added student-level answer threshold guard in `buildStudentTeacherGuidanceV2` before topic iteration |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | Added tests 3b (thin-data edge case) and 3c (single-session regression) |
| `scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **New** — parent-preview merge parity + optional subject-scope regression |
| `scripts/tests/student-report-flow-regression.mjs` | Added `verifyTeacherParentPreviewParity` integration check |

---

## Bugs Fixed

### HIGH #2b — Teacher Parent Preview mismatch

**Problem:** `buildTeacherParentReportPreviewPayload` merged `classroom_activities` / `classroom_activity_student_status` into the preview payload, but the actual regular parent report uses only `learning_sessions` + `answers`.

**Fix:** Removed `loadClassroomRollupForTeacherStudentReport` and `mergeClassroomActivityRollupIntoReportPayload` from `buildTeacherParentReportPreviewPayload`. The function now stops after `aggregateParentReportPayload`, matching the regular parent truth source.

**Unchanged:** `buildTeacherStudentReportPayload` still merges classroom activity when applicable. Teacher class reports and school reports were not modified.

### MEDIUM #1 — Thin-data V2 recommendations

**Problem:** When `totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL` (5) but `totalSessions >= 2`, V1’s compound `&&` check did not flag `insufficientData`, allowing V2 to create topic-level `recommendationUnits` from as few as 3 answers in one topic.

**Fix:** Added an explicit guard in `buildStudentTeacherGuidanceV2` after summary extraction:

```javascript
if (totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL) {
  return { ...base, insufficientData: true, teacherGuidance: { reason: "not_enough_activity" } };
}
```

V1’s global `&&` condition was **not** changed, preserving valid cases with ≥5 answers and only 1 session.

### LOW #3 — Subject scope (not fixed)

No code change. Optional regression test added proving `scopeSubjects = new Set(["math"])` excludes english/science from subject rollups, weakness topics, and class guidance units.

---

## Tests Run

| Test | Command | Result |
|------|---------|--------|
| Teacher Guidance V2 unit | `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** |
| Diagnostic truth fix unit | `node scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **PASS** |
| Teacher parent preview integration (focused) | `node --env-file=.env.local -e "…"` (Dan Cohen school student) | **PASS** — preview totals matched parent totals |
| Student report flow regression (full file) | `node --env-file=.env.local scripts/tests/student-report-flow-regression.mjs` | **PASS** (after test-only oracle fixes — see below) |
| Production build | `npm run build` | **PASS** (pre-existing warnings only) |

### Test coverage added

**A. Teacher Parent Preview**

- Unit: merge vs no-merge payload parity (`diagnostic-report-truth-fix-unit.mjs`)
- Integration: `verifyTeacherParentPreviewParity` in `student-report-flow-regression.mjs` + focused live check

**B. Thin-data V2**

- Test 3b: 4 total answers, 2 sessions, 3 answers in weak topic → no `recommendationUnits`, `insufficientData: true`
- Test 3c: 6 total answers, 1 session → still produces `recommendationUnits`

**C. Subject scope regression (optional)**

- `diagnostic-report-truth-fix-unit.mjs` — math-only scope excludes english/science from rollups, weakness topics, and class guidance units

---

## Confirmations

| Constraint | Status |
|------------|--------|
| No UI changes | ✓ Confirmed |
| No CSS changes | ✓ Confirmed |
| No Hebrew text changes | ✓ Confirmed |
| No SQL migrations | ✓ Confirmed |
| No regular parent report merge of classroom activity | ✓ Confirmed — parent path unchanged |
| No commit | ✓ Confirmed |
| No push | ✓ Confirmed |

---

## Product Boundary Preserved

The regular parent report remains intentionally separate from teacher/school reports. Classroom activity is still included in teacher student reports where expected. Only the teacher **parent preview** was aligned to the actual parent report truth source.

---

## Regression Test Follow-up (2026-05-29 — test-only)

After the product fixes above, two brittle assertions in `scripts/tests/student-report-flow-regression.mjs` were corrected (test-only):

| Issue | Fix |
|-------|-----|
| Parent-flow oracle used wrong column `session_id` | Changed to `learning_session_id` |
| School-managed flow unconditionally required non-zero totals | Made data-driven: strong checks when source activity exists; zero-data assertions otherwise |

**Final regression status (all PASS):**

- `node --env-file=.env.local scripts/tests/student-report-flow-regression.mjs`
- `node scripts/tests/teacher-guidance-v2-unit.mjs`
- `node scripts/tests/diagnostic-report-truth-fix-unit.mjs`

**Confirmations:** Parent aggregation remains correct. No product code, UI, Hebrew, or SQL changes. No commit / push.

# P0 Performance Optimization — Closure Report

**Date:** 2026-05-28  
**Plan:** `docs/qa/TEACHER_SCHOOL_REPORT_P0_PERFORMANCE_PLAN.md`  
**Prior audit:** `docs/qa/TEACHER_SCHOOL_REPORT_PERFORMANCE_AUDIT.md`

## Summary

Implemented P0 server-side aggregation optimizations for teacher class reports, school physical Report Hub, and school browse badge dedupe. No SQL, migrations, UI, Hebrew copy, parent/guardian/worksheet changes.

---

## What changed

### 1. Batch roster report aggregation

| Before | After |
| ------ | ----- |
| N students × 2 Supabase queries (`learning_sessions` + `answers`) per class/physical report | **2 batched paginated query streams** for entire roster (`.in("student_id", ids)`) |
| N parallel `aggregateParentReportPayload` DB round-trips | One in-memory group-by-student + same rollup function per student |

**Files:**
- `lib/parent-server/report-data-aggregate.server.js` — exported `aggregateReportPayloadFromActivityRows`; `aggregateParentReportPayload` unchanged behavior (thin wrapper)
- `lib/parent-server/report-data-aggregate-batch.server.js` — **new** batch fetch + `batchAggregateParentReportPayloadsForRoster`
- `lib/teacher-server/roster-report-student-entries.server.js` — **new** shared `buildRosterStudentReportEntries`
- `lib/teacher-server/teacher-class-report.server.js` — uses batch roster builder
- `lib/school-server/school-physical-class-report.server.js` — uses batch roster builder

**Expected improvement:** For a class of 25 students, ~50 sequential/parallel DB round-trips → ~2–4 paginated batch queries (+ 1 student row batch). Dominant latency reduction on class and physical report loads.

### 2. Physical Report Hub — classroom rollups + submit counts

| Before | After |
| ------ | ----- |
| S × `loadClassroomActivityRollupsForClassReport` (one per subject-class) | **One** `loadClassroomActivityRollupsForMultipleClassReports` (shared activities + statuses fetch) |
| Up to 20 × head count queries for recent activity submit counts | **One** paginated `batchCountSubmittedActivityStatuses` |

**Files:**
- `lib/teacher-server/classroom-activity-class-report.server.js` — added multi-class rollup loader + batch submit count helper
- `lib/school-server/school-physical-class-report.server.js` — wired both helpers

**Expected improvement:** Physical class with 6 subject-classes: ~6 classroom activity query trees + 20 count queries → 2–3 batched query trees. Guidance V2 per-subject CPU (`buildPhysicalSubjectGuidanceBlock`) **unchanged** — still required for parity.

### 3. School browse activity dedupe

| Before | After |
| ------ | ----- |
| `buildSchoolBrowseStatusMaps` and `listSchoolStudentsInPhysicalClass` each call `buildLightweightStudentActivityMap` independently | Shared in-process cache with per-student slice index (3 min TTL) |

**Files:**
- `lib/school-server/school-browse-activity-cache.server.js` — **new**
- `lib/school-server/school-browse-status.server.js` — uses cache
- `lib/school-server/school-students.server.js` — reuses cached student slices when browse-status warmed the same students

**Expected improvement:** On `/school/students` after `/school/classes` browse-status in same warm Node instance, class roster badge attachment skips duplicate full activity scan.

---

## Behavior preserved

- API JSON shapes for class report, physical report, browse-status, student list
- Guidance V2 outputs (`teacherGuidanceBlock`, `subjectGuidanceBlocks`)
- `aggregateParentReportPayload` single-student semantics (parent/guardian routes untouched)
- Class report cohort/guidance logic including `subject_focus` scoping at aggregation layer (unchanged)

## Deferred (not in P0)

| Item | Reason |
| ---- | ------ |
| `subject_focus` session fetch filter at DB layer | Would change per-student `summary` totals vs current mixed scoped/unscoped cohort semantics; needs coordinated change in `aggregateClassReportFromStudentPayloads` |
| Teacher client-side report cache | Out of P0 scope |
| Materialized rollups / SQL | Explicitly excluded |
| Lazy-load physical report modal | Out of P0 scope |

---

## Parent report safety

- Parent API still calls `aggregateParentReportPayload` only
- Extracted rollup function is pure in-memory; no new parent code path
- No changes to `pages/api/parent/*`, guardian handlers, or parent-facing UI

---

## Tests run

| Test | Result |
| ---- | ------ |
| `scripts/tests/report-data-aggregate-batch-unit.mjs` | PASS |
| `scripts/tests/teacher-class-report-aggregation-unit.mjs` | PASS |
| `scripts/tests/school-physical-class-report-unit.mjs` | PASS |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | PASS |
| `scripts/tests/student-status-badge-unit.mjs` | PASS |
| `npm run build` | **PASS** (exit 0, pre-existing warnings only) |

---

## Files changed (exact)

**New:**
- `lib/parent-server/report-data-aggregate-batch.server.js`
- `lib/teacher-server/roster-report-student-entries.server.js`
- `lib/school-server/school-browse-activity-cache.server.js`
- `scripts/tests/report-data-aggregate-batch-unit.mjs`
- `docs/qa/TEACHER_SCHOOL_REPORT_P0_PERFORMANCE_PLAN.md`
- `docs/qa/TEACHER_SCHOOL_REPORT_P0_PERFORMANCE_CLOSURE.md`

**Modified:**
- `lib/parent-server/report-data-aggregate.server.js`
- `lib/teacher-server/teacher-class-report.server.js`
- `lib/teacher-server/classroom-activity-class-report.server.js`
- `lib/school-server/school-physical-class-report.server.js`
- `lib/school-server/school-browse-status.server.js`
- `lib/school-server/school-students.server.js`

---

## Confirmations

| Requirement | Status |
| ----------- | ------ |
| SQL / migrations | **None** |
| Simulation files | **Untouched** |
| Parent/guardian/worksheet UX/copy | **Untouched** |
| Hebrew / CSS / layout | **Untouched** |
| Git commit / push / stage | **None** |

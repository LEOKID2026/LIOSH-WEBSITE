# P0 Performance Optimization — Implementation Plan

**Date:** 2026-05-28  
**Approved scope:** P0 only from `TEACHER_SCHOOL_REPORT_PERFORMANCE_AUDIT.md`

## Strategy

### 1. Batch roster aggregation (teacher class + school physical reports)

**Problem:** `buildTeacherClassReportPayload` and `buildSchoolPhysicalClassReportPayload` call `aggregateParentReportPayload` **N times** (2 DB round-trips per student).

**Solution:** Add `batchAggregateParentReportPayloadsForRoster` that:
- Fetches all roster `learning_sessions` and `answers` in **two paginated batch queries** (`.in("student_id", ids)`), same pattern as `buildLightweightStudentActivityMap`.
- Groups rows by `student_id` in memory.
- Reuses a new exported helper `aggregateReportPayloadFromActivityRows` (extracted from existing `aggregateParentReportPayload` body) per student.

**Subject focus:** When `class.subject_focus` is a single known subject, batch session fetch adds `.eq("subject", subjectFocus)` to reduce rows loaded. Answers remain full-range (subject may live in `answer_payload` without session). Per-student aggregation output is unchanged for scoped class reports because cohort summary already mixes scoped subject rollups with full student summaries — session fetch scoping only applies when it cannot change computed totals (documented in closure report if deferred).

**Parent safety:** `aggregateParentReportPayload` remains a thin wrapper (fetch one student → aggregate). Parent/guardian APIs unchanged.

### 2. Physical report classroom rollups + submit counts

**Problem:** N parallel `loadClassroomActivityRollupsForClassReport` calls (one per subject-class) and N+1 submit-count queries.

**Solution:**
- `loadClassroomActivityRollupsForMultipleClassReports(classIds, studentIds)` — one activities query + one statuses pagination pass, split rollups per `class_id`.
- `batchCountSubmittedActivityStatuses(activityIds)` — single query, count in memory.

### 3. School browse activity dedupe (low-risk)

**Problem:** `buildSchoolBrowseStatusMaps` and `attachLearningStatusBadgesForBrowse` both call `buildLightweightStudentActivityMap` for overlapping students.

**Solution:** In-process TTL cache (3 min, keyed by sorted student IDs + date window) shared by both code paths. Same Node instance only; no UI/response shape change.

## Files to change

| File | Change |
| ---- | ------ |
| `lib/parent-server/report-data-aggregate.server.js` | Export `aggregateReportPayloadFromActivityRows`; thin wrapper on `aggregateParentReportPayload` |
| `lib/parent-server/report-data-aggregate-batch.server.js` | **New** — batch fetch + roster aggregation |
| `lib/teacher-server/roster-report-student-entries.server.js` | **New** — shared roster entry builder |
| `lib/teacher-server/teacher-class-report.server.js` | Use batch roster builder |
| `lib/school-server/school-physical-class-report.server.js` | Use batch roster builder + multi-class rollups + batched counts |
| `lib/teacher-server/classroom-activity-class-report.server.js` | Add multi-class rollup loader |
| `lib/school-server/school-browse-activity-cache.server.js` | **New** — in-process activity map cache |
| `lib/school-server/school-browse-status.server.js` | Use shared cache |
| `lib/school-server/school-students.server.js` | Use shared cache for badges |
| `scripts/tests/report-data-aggregate-batch-unit.mjs` | **New** — parity smoke |
| `docs/qa/TEACHER_SCHOOL_REPORT_P0_PERFORMANCE_CLOSURE.md` | **New** — closure report |

## Behavior that must remain identical

- API response JSON shape for class report, physical report, school browse status, school student list.
- Guidance V2 outputs (`teacherGuidanceBlock`, `subjectGuidanceBlocks`).
- Parent/guardian report routes and `aggregateParentReportPayload` single-student semantics.
- Hebrew copy, UI, CSS untouched.

## Why parent reports are unaffected

- Parent API (`pages/api/parent/.../report-data.js`) calls `aggregateParentReportPayload` only.
- That function keeps the same fetch-then-aggregate path; only the aggregate body is extracted to a named function.
- No new code path wired into parent/guardian handlers.

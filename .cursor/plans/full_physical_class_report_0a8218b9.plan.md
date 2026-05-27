---
name: Full Physical Class Report
overview: Add a school-manager-only "דוח כיתה כללי" that aggregates all subject-class records for one physical class into a single cross-subject report, while leaving every existing subject-class, teacher, parent, and student report completely unchanged.
todos:
  - id: phase1-export
    content: Export loadSubjectClassIdsForPhysical from school-operations.server.js
    status: pending
  - id: phase1-builder
    content: Create lib/school-server/school-physical-class-report.server.js with buildSchoolPhysicalClassReportPayload
    status: pending
  - id: phase1-unit
    content: Write unit tests for aggregation logic in scripts/tests/school-physical-class-report-unit.mjs
    status: pending
  - id: phase2-api
    content: Create pages/api/school/classes/physical-report.js API endpoint
    status: pending
  - id: phase2-api-tests
    content: "API regression tests: demo school, cross-school guard, bad params"
    status: pending
  - id: phase3-viewmodel
    content: Add parsePhysicalClassReportViewModel to school-report-view-model.js
    status: pending
  - id: phase3-labels
    content: Add new Hebrew label constants to school-ui.he.js
    status: pending
  - id: phase3-vm-tests
    content: Unit tests for parsePhysicalClassReportViewModel
    status: pending
  - id: phase4-ui
    content: "Update pages/school/classes/index.js: physical report button, handler, student drill-down"
    status: pending
  - id: phase4-e2e
    content: Playwright E2E tests in tests/e2e/school-physical-class-report.spec.ts
    status: pending
  - id: phase5-regression
    content: "Regression sweep: subject-class, teacher, parent, private teacher reports + Hebrew audit + build check"
    status: pending
  - id: phase5-docs
    content: Write docs/school-portal/FULL_PHYSICAL_CLASS_REPORT_PLAN.md
    status: pending
isProject: false
---

# Full Physical Class Report — Implementation Plan (B only)

## 1. Current Code Reuse Analysis

### What already exists that can be reused

- **`loadSubjectClassIdsForPhysical`** (`lib/school-server/school-operations.server.js`) — already resolves all 6 subject-class UUIDs for a given `schoolId + gradeLevel + physicalClassName`. Needs to be exported (currently internal).
- **`listSchoolStudentsInPhysicalClass`** (`lib/school-server/school-students.server.js`) — already returns the union-deduped student list for a physical class.
- **`aggregateClassReportFromStudentPayloads`** (`lib/teacher-server/teacher-class-report.server.js`) — pure, no I/O. Aggregates per-student payloads into cohort totals, subject rollups, weakness topics, attention list. Can be called on the physical class's student payloads directly.
- **`aggregateParentReportPayload`** (parent-server layer) — builds one student's analytics from their `learning_sessions`/`answers`. Already used inside `buildTeacherClassReportPayload`.
- **`loadClassroomActivityRollupsForClassReport`** (`lib/teacher-server/classroom-activity-class-report.server.js`) — loads classroom activity rollups per `classId`; can be called for each of the 6 subject-class IDs.
- **`loadSchoolScopedClassroomActivityRollupForStudentReport`** — already accepts `gradeLevel + physicalClassName`; used for student-level rollups inside the physical class. **Student report API already works for physical-class context — no change needed.**
- **`parseClassReportViewModel`** (`lib/school-portal/school-report-view-model.js`) — the view-model parser; a new `parsePhysicalClassReportViewModel` will follow the same pattern and return a compatible structure.
- **`SchoolReportModal` / `ReportHubModal`** — the existing 5-layer modal stack renders any `viewModel` with the correct shape. No modal changes needed for basic launch.
- **`requireSchoolManagerApiContext`** / `loadSchoolClassInScope` — auth primitives reused unchanged.

### What does NOT exist and must be built

- No cross-subject physical class report builder.
- No API endpoint for a physical-class-scoped report.
- No UI entry point at the physical-class selection level.
- No `parsePhysicalClassReportViewModel`.

---

## 2. Architecture Recommendation — Option A (direct aggregation)

**Option B (compose 6 existing `buildTeacherClassReportPayload` calls) is rejected** because:
- That function requires `teacherId` ownership; no single teacher owns all 6 subject classes.
- It would load 24 student payloads × 6 times → ~144 student-data fetches (severe double-counting and performance).
- Merging 6 already-aggregated cohort payloads correctly is fragile.

**Option A is chosen.** The new builder calls raw data loaders once per student and once per subject class — no teacher ownership is required, deduplication is guaranteed.

### Aggregation design (double-counting prevention)

Two data planes are handled separately:

| Plane | Source tables | Strategy |
|---|---|---|
| Home practice | `learning_sessions`, `answers` | Load per unique student (24 fetches, batched). Each student loaded **once**. Sessions are student-scoped, not class-scoped → zero double-counting. |
| Classroom activity | `classroom_activities`, `classroom_activity_student_status` | Load per subject-class ID (6 calls). Rollups are `(activity_id, student_id)` pairs → no cross-class duplication. |

Student roster: union `teacher_class_students` across all 6 subject-class IDs, deduped by `studentId` using a `Map`. Max `memberCount` per physical class is already the convention (`physicalClassStudentCount` in `school-drilldown.js`).

---

## 3. New Server Module

**`lib/school-server/school-physical-class-report.server.js`** (new file)

```javascript
export async function buildSchoolPhysicalClassReportPayload({
  serviceRole, schoolId, gradeLevel, physicalClassName, fromDate, toDate
})
```

Algorithm:

1. Call `loadSubjectClassIdsForPhysical(serviceRole, schoolId, gradeLevel, physicalClassName)` → up to 6 `{ classId, teacherId, teacherName, subjectFocus, memberCount, activityCount }` rows.
2. Union `teacher_class_students` for all resolved `classId`s; build a `Map<studentId, studentRow>` (deduplicated).
3. Load home-practice payload for each unique student via `aggregateParentReportPayload({ serviceRole, studentId, fromDate, toDate })` — concurrency cap 6, same pattern as `buildTeacherClassReportPayload`.
4. Load classroom activity rollup for each subject-class ID via `loadClassroomActivityRollupsForClassReport({ serviceRole, classId, fromDate, toDate })` — merge into per-student entries using `mergeClassroomActivityRollupIntoReportPayload` (already exported).
5. Call `aggregateClassReportFromStudentPayloads(mergedStudentPayloads)` → `{ cohortSummary, subjects, weaknessTopics, attentionList, recentActivity }`.
6. Build `subjectBreakdown` array: one entry per resolved subject class, with teacher name, member count, activity count, and cohort accuracy slice from `subjects[subjectFocus]`.
7. Return:

```javascript
{
  ok: true,
  payload: {
    reportMeta: { audience: "school_manager", source: "physical_class_report", version: "v1" },
    physicalClass: { name: physicalClassName, gradeLevel, schoolId },
    subjectClassIds: [/* 6 UUIDs */],
    subjectBreakdown: [/* per subject: classId, subjectFocus, subjectLabelHe, teacherName, memberCount, activityCount, accuracy */],
    roster: [/* deduped 24 students */],
    cohortSummary,
    subjects,
    weaknessTopics,   // grouped by subject
    attentionList,    // deduped by studentId
    recentActivity,
    students,         // per-student summary rows
  }
}
```

**Export `loadSubjectClassIdsForPhysical`** from `school-operations.server.js` (currently internal) so the new builder can import it.

---

## 4. New API Endpoint

**`pages/api/school/classes/physical-report.js`** (new file, GET only)

```
GET /api/school/classes/physical-report
  ?gradeLevel=1
  &physicalClassName=כיתה א׳ 1
  &windowDays=30
```

Route naming rationale: stays under `/api/school/classes/` namespace (consistent with existing), avoids a new path hierarchy, and the `physical-report` suffix makes the intent unambiguous. Alternative `physical-classes/report-data` is more RESTful but breaks the existing namespace pattern.

Handler outline:

1. `requireSchoolManagerApiContext` — school manager only.
2. Validate `gradeLevel` and `physicalClassName` (required, non-empty string).
3. `loadSchoolScope(serviceRole, schoolId)` — ensures the physical class's subject classes all belong to this school before fetching.
4. `resolveTeacherReportDateRange(req.query)`.
5. `buildSchoolPhysicalClassReportPayload({ serviceRole, schoolId, gradeLevel, physicalClassName, fromDate, toDate })`.
6. `writeSchoolClassViewedAudit` with `metadata: { source: "physical_class_report", gradeLevel, physicalClassName }`.
7. Return `{ ...payload }`.

**Security:** does NOT accept a `classId` — school scope is enforced by verifying all resolved subject-class `school_id`s match `ctx.schoolId`. Fails with `404 / physical_class_not_found` if any mismatch.

**Does not replace** `/api/school/classes/[classId]/report-data`.

---

## 5. View Model

**`lib/school-portal/school-report-view-model.js`** — add `parsePhysicalClassReportViewModel`:

```javascript
export function parsePhysicalClassReportViewModel(body, ctx = {})
// body: physical class report payload
// ctx: { schoolName? }
// returns: { kind: "physical_class", header, summaryCards, insight, navigation, sections, drilldowns, actions }
```

Shape mirrors `parseClassReportViewModel` for compatibility with `ReportHubModal`:

- `kind: "physical_class"` — lets UI discriminate between the two report types.
- `header.title` = `physicalClass.name` (e.g. `"כיתה א׳ 1"`).
- `header.subtitle` = `"דוח כיתה כללי · כל המקצועות"`.
- `header.chips` = school name, grade label, N students, N subjects.
- `summaryCards`: total students (`"תלמידים"`), total answers (`"תשובות"`), overall accuracy (`"דיוק"`), students with activity (`"פעילים"`), last activity date (`"פעילות אחרונה"`).
- `insight`: generated from `cohortSummary` (Hebrew narrative, same pattern as existing).
- `navigation` sections: `subjects` → `"פירוט לפי מקצוע"`, `students` → `"תלמידים בכיתה"`, `focus` → `"נושאים לחיזוק"`, `attention` → `"תלמידים שדורשים תשומת לב"`.
- `sections.subjects.items`: one row per subject — subjectLabelHe, teacherName, memberCount, accuracy, classId (for drill-down to existing subject report).
- `sections.students.items`: full physical class roster — student name, `דוח תלמיד` action.
- `sections.focus.items`: `weaknessTopics` with `subjectLabelHe` prefix.
- `sections.attention.items`: `attentionList` with `reasonHe` and `subjectLabelHe` per flag.
- `drilldowns.subjects` per subject key: opens **existing** `SchoolReportModal` with subject-class `classId` (reuses current flow unchanged).

No raw English keys visible anywhere in rendered output.

---

## 6. UI Changes — `pages/school/classes/index.js`

This is the only page file that needs changes. Current flow: grade → physical class → subject cards.

**Step 3 (subject cards view)** — add a primary button above the subject card grid:

```
[ דוח כיתה כללי ]   ← new, calls physical-report API
[ subject card 1 — מתמטיקה — דוח כיתה ]
[ subject card 2 — גיאומטריה — דוח כיתה ]
...
```

- New handler `openPhysicalClassReport(physicalGroup)`:
  - Calls `GET /api/school/classes/physical-report?gradeLevel=...&physicalClassName=...&windowDays=30`
  - Parses response via `parsePhysicalClassReportViewModel`
  - Opens `SchoolReportModal` with the new view model
- Subject-report drill-down from the physical report's subject section opens the **existing** subject-class report (same `openClassReport(cls)` handler, unchanged).
- Student report from the physical report uses `gradeLevel + physicalClassName` (no `classId`):

```javascript
const openStudentReportFromPhysical = async (studentId) => {
  const params = new URLSearchParams({
    windowDays: "30",
    gradeLevel: selectedPhysicalGroup.gradeLevel,
    physicalClassName: selectedPhysicalGroup.name,
  });
  // → existing /api/school/students/${studentId}/report-data?...
};
```

This path already works in the student report API — no API changes needed.

### Hebrew labels to add in `lib/school-portal/school-ui.he.js`

- `SCHOOL_PHYSICAL_CLASS_REPORT_TITLE = "דוח כיתה כללי"`
- `SCHOOL_PHYSICAL_CLASS_REPORT_BUTTON = "דוח כיתה כללי"`
- `SCHOOL_PHYSICAL_CLASS_ALL_SUBJECTS = "כל המקצועות"`
- `SCHOOL_PHYSICAL_CLASS_SUBJECT_BREAKDOWN = "פירוט לפי מקצוע"`
- `SCHOOL_PHYSICAL_CLASS_LOADING = "טוען דוח כיתה כללי…"`

---

## 7. Student Report Integration

**No API changes needed.** `GET /api/school/students/[studentId]/report-data` already handles the `gradeLevel + physicalClassName` code path:

```javascript
// pages/api/school/students/[studentId]/report-data.js (existing, ~lines 88-121)
if (!classId) {
  const schoolRollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
    serviceRole, schoolId, studentId,
    fromDate, toDate,
    gradeLevel,         // ← already accepted
    physicalClassName,  // ← already accepted
  });
}
```

The student report opened from the physical class report will show school-scoped activity limited to that physical class's subject classes — correct behavior.

---

## 8. Permission and Security Model

| Actor | Access |
|---|---|
| School manager | Full physical class report via new endpoint. Verified by `requireSchoolManagerApiContext`. |
| School teacher | Own subject-class reports only (existing `/api/school/classes/[classId]/report-data`). Cannot call physical-report endpoint (auth check). |
| Coordinator / future role | Not in scope. Default: deny until explicitly added. |
| Parent | Unchanged — own APIs. |
| Private teacher | Unchanged — own APIs. |
| Student | Unchanged. |

Security invariants enforced in `buildSchoolPhysicalClassReportPayload`:
- All resolved subject-class rows must have `school_id = schoolId` — hard error otherwise.
- `serviceRole` used only server-side.
- No data from another school can appear: student visibility checked via `loadSchoolVisibleStudentIds` or per-class `school_id` check.
- `physicalClassName` is URL-decoded before use; no SQL injection risk (Supabase parameterized queries).

---

## 9. Performance Approach

Expected query count for 24 students × 6 subjects (first load):

- Subject class resolution: 1 query (`loadSubjectClassIdsForPhysical`)
- Roster union: 1 batched query (`teacher_class_students WHERE class_id IN (...)`)
- Student home-practice payloads: 24 concurrent (batched 6) → ~4 rounds × 2 queries each = ~50 queries
- Classroom rollups: 6 queries (one per subject class) → parallel
- Total: ~60 queries

Estimated time: 4–8 seconds on cold start. Acceptable for an on-demand manager report.

Strategy:
- **No client cache** initially — fresh fetch each open.
- **No localStorage** — sensitive student data.
- **Parallel batching** at the server (concurrency 6, same as `buildTeacherClassReportPayload`).
- **Lazy drill-downs** — subject-class report and individual student reports are loaded on click only.
- **`schoolManagerExtras`** (classroom activity list) is skipped for the physical report — the subject breakdown already contains activity counts.
- Add a `console.time("physical_class_report")` wrapper in the server function for measurement.
- Future optimization (not in this phase): a single batched query for all 6 subject-class classroom rollups; Supabase `IN` clause on `class_id`.

---

## 10. Files Expected to Change

### New files

- `lib/school-server/school-physical-class-report.server.js`
- `pages/api/school/classes/physical-report.js`
- `docs/school-portal/FULL_PHYSICAL_CLASS_REPORT_PLAN.md` (this plan)

### Modified files

- `lib/school-server/school-operations.server.js` — export `loadSubjectClassIdsForPhysical`
- `lib/school-portal/school-report-view-model.js` — add `parsePhysicalClassReportViewModel`
- `lib/school-portal/school-ui.he.js` — add new Hebrew label constants
- `pages/school/classes/index.js` — add physical report button + handler + `openStudentReportFromPhysical`

### Unchanged files (explicitly)

- `pages/api/school/classes/[classId]/report-data.js`
- `lib/teacher-server/teacher-class-report.server.js`
- `pages/api/school/students/[studentId]/report-data.js`
- `pages/api/teacher/classes/[classId]/report-data.js`
- All parent-server and private-teacher APIs
- `lib/school-portal/school-drilldown.js`
- `components/school-portal/SchoolReportModal.jsx`
- `components/report-hub/ReportHubModal.jsx`

---

## 11. Tests

### Unit tests — `scripts/tests/school-physical-class-report-unit.mjs`

- `loadSubjectClassIdsForPhysical` returns 6 subject classes for a valid physical class
- `loadSubjectClassIdsForPhysical` returns error for unknown physical class
- Roster dedup: student appearing in 3 of 6 subject classes is counted once
- `aggregateClassReportFromStudentPayloads` on 24 deduped student payloads: total answers = sum of individual answers
- Weighted accuracy: (correct / answers) across all subjects
- `weaknessTopics` grouped by subject: entries from math are labelled "מתמטיקה"
- `attentionList` dedup: student with flags in 2 subjects appears once with highest score
- `parsePhysicalClassReportViewModel`: `summaryCards` include all 5 expected labels in Hebrew
- `parsePhysicalClassReportViewModel`: `sections.subjects.items` length = number of subject classes

### API regression — against demo school

- `GET /api/school/classes/physical-report?gradeLevel=1&physicalClassName=כיתה א׳ 1&windowDays=30`
  - Returns `200`, `payload.roster.length === 24`
  - `payload.subjectBreakdown.length === 6`
  - `payload.cohortSummary.totalAnswers === sum(each subject class cohort answers)` (or via direct DB rollup)
  - `payload.subjectBreakdown` each entry has Hebrew `subjectLabelHe`
- Cross-school: using school manager token from school B to request school A's physical class → `403 / physical_class_not_found`
- Missing params: omit `physicalClassName` → `400`
- Unknown physical class → `404`

### Playwright E2E — `tests/e2e/school-physical-class-report.spec.ts`

1. Login as school manager for demo school
2. Navigate to `/school/classes`
3. Select grade `"כיתה א׳"`
4. Select physical class `"כיתה א׳ 1"` — subject cards visible
5. Click `"דוח כיתה כללי"` button
6. `report-hub-main` appears; summary cards present
7. Navigate to `"פירוט לפי מקצוע"` section — 6 subject rows visible
8. Click subject row's `"דוח כיתה"` → nested subject-class report loads (existing report)
9. Go back; navigate to `"תלמידים בכיתה"` section — student rows visible
10. Click `"דוח תלמיד"` for one student → student report loads, `report-hub-student-main` appears
11. Verify student report has non-zero activity
12. Close → returns to physical class report
13. Repeat on mobile viewport (375px wide)

### Regression checks

- Existing subject-class report still opens via `"דוח כיתה"` on subject cards
- Teacher dashboard class report unchanged
- Parent report API smoke test
- Private teacher report API smoke test
- Hebrew visible text audit: no raw English keys in rendered physical report
- Build PASS (`npm run build`)

---

## 12. Phased Implementation Order

**Phase 1 — Server core (no UI)**
1. Export `loadSubjectClassIdsForPhysical` from `school-operations.server.js`
2. Create `lib/school-server/school-physical-class-report.server.js` with `buildSchoolPhysicalClassReportPayload`
3. Unit tests for the aggregation logic

**Phase 2 — API**
4. Create `pages/api/school/classes/physical-report.js`
5. API regression tests (demo school, cross-school guard, bad params)

**Phase 3 — View model**
6. Add `parsePhysicalClassReportViewModel` to `school-report-view-model.js`
7. Add Hebrew labels to `school-ui.he.js`
8. Unit tests for view model parsing

**Phase 4 — UI integration**
9. Update `pages/school/classes/index.js`: button, handler, student report from physical context
10. Playwright E2E tests

**Phase 5 — Regression + docs**
11. Full regression sweep (subject-class, teacher, parent, private teacher)
12. Hebrew audit
13. Build check
14. Write `docs/school-portal/FULL_PHYSICAL_CLASS_REPORT_PLAN.md`

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `aggregateClassReportFromStudentPayloads` produces subject accuracy only if student payload has `payload.subjects` populated | Verify subject data flows through for school-managed classes (classroom-only path); add fallback if `subjects` is sparse |
| `loadSubjectClassIdsForPhysical` currently errors if any of the 6 expected subjects is missing | Loosen to "at least 1 subject class found" for physical report; log missing subjects instead of aborting |
| Performance: 60+ DB queries may time out | Implement batched roster load (`IN` query) and parallel classroom rollups as baseline; measure with `console.time` on first implementation |
| `ReportHubModal` renders `kind: "class"` assumptions | Use `kind: "physical_class"` and verify `ReportHubBody` does not hard-code `kind === "class"` checks before shipping |
| Student report from physical context shows zero activity if `gradeLevel`/`physicalClassName` filtering misses a subject class | Test with demo seed; confirm `loadSchoolScopedClassroomActivityRollupForStudentReport` resolves all 6 subject class IDs from `name` match |
| Hebrew label overlap: `"דוח כיתה"` vs `"דוח כיתה כללי"` may be visually close | Use distinctly styled primary button (e.g. full-width, different variant) for physical report |

---

## 14. Explicit Non-Goals

- No simulation work
- No new DB tables or migrations
- No commit or push
- No teacher detail (A) physical-class card work
- No parent-report or private-teacher-report changes
- No student-report API changes (already supports the physical-class context)
- No caching implementation
- No coordinator or future-role permission design
- No performance optimization beyond basic batching
- No mobile-specific layout changes (existing ReportHubModal is already responsive)

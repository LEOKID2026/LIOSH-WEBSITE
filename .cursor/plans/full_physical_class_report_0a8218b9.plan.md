---
name: Full Physical Class Report
overview: Add a school-manager-only "דוח כיתה כללי" that aggregates all subject-class records for one physical class into a single cross-subject report, while leaving every existing subject-class, teacher, parent, and student report completely unchanged.
todos:
  - id: phase1-export
    content: Export loadSubjectClassIdsForPhysical from school-operations.server.js
    status: completed
  - id: phase1-builder
    content: Create lib/school-server/school-physical-class-report.server.js with buildSchoolPhysicalClassReportPayload
    status: completed
  - id: phase1-unit
    content: Write unit tests for aggregation logic in scripts/tests/school-physical-class-report-unit.mjs
    status: completed
  - id: phase2-api
    content: Create pages/api/school/classes/physical-report.js API endpoint
    status: completed
  - id: phase2-api-tests
    content: "API regression tests: demo school, cross-school guard, bad params"
    status: completed
  - id: phase3-viewmodel
    content: Add parsePhysicalClassReportViewModel to school-report-view-model.js
    status: completed
  - id: phase3-labels
    content: Add new Hebrew label constants to school-ui.he.js
    status: completed
  - id: phase3-vm-tests
    content: Unit tests for parsePhysicalClassReportViewModel
    status: completed
  - id: phase4-ui
    content: "Update pages/school/classes/index.js: physical report button, handler, student drill-down"
    status: completed
  - id: phase4-e2e
    content: Playwright E2E tests in tests/e2e/school-physical-class-report.spec.ts
    status: completed
  - id: phase5-regression
    content: "Regression sweep: subject-class, teacher, parent, private teacher reports + Hebrew audit + build check"
    status: completed
  - id: phase5-docs
    content: Write docs/school-portal/FULL_PHYSICAL_CLASS_REPORT_PLAN.md
    status: completed
isProject: false
---

# Full Physical Class Report — Implementation Plan (B only)

> **Amendment note (2026-05-27):** Plan updated with five required amendments: (1) action-first Report Hub — every displayed entity must have a direct navigation action; (2) dedicated `פעילויות אחרונות` section across all subjects; (3) teacher navigation via `כרטיס מורה`; (4) explicit navigation stack and back/close behavior; (5) extended test coverage for all action-first requirements.

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

1. Call `loadSubjectClassIdsForPhysical(serviceRole, schoolId, gradeLevel, physicalClassName)` → up to 6 `{ classId, teacherId, teacherName, subjectFocus, memberCount, activityCount }` rows. If fewer than 1 found, return `{ ok: false, status: 404, code: "physical_class_not_found" }` (loosened from the current "must have all 6" hard error — partial physical classes are allowed).
2. Union `teacher_class_students` for all resolved `classId`s with one batched query (`class_id IN (...)`); build a `Map<studentId, studentRow>` (deduplicated).
3. Load home-practice payload for each unique student via `aggregateParentReportPayload({ serviceRole, studentId, fromDate, toDate })` — concurrency cap 6, same pattern as `buildTeacherClassReportPayload`.
4. Load classroom activity rollup for each subject-class ID via `loadClassroomActivityRollupsForClassReport({ serviceRole, classId, fromDate, toDate })` — run 6 in parallel; merge into per-student entries using `mergeClassroomActivityRollupIntoReportPayload` (already exported).
5. Call `aggregateClassReportFromStudentPayloads(mergedStudentPayloads)` → `{ cohortSummary, subjects, weaknessTopics, attentionList, recentActivity }`.
6. Build `subjectBreakdown` array: one entry per resolved subject class, with **`teacherId`** (required for teacher navigation), `teacherName`, `classId`, `subjectFocus`, `subjectLabelHe`, `memberCount`, `activityCount`, and cohort accuracy slice from `subjects[subjectFocus]`.
7. Load recent classroom activities across all 6 class IDs:
   - Query `classroom_activities WHERE class_id IN (...) AND status != 'archived' ORDER BY created_at DESC LIMIT 20`
   - Enrich each row with `subjectFocus`, `subjectLabelHe`, `teacherName`, `teacherId` from `subjectBreakdown` by matching `class_id`
   - Include `submitted_count` and accuracy where available from the classroom rollup already loaded in step 4
8. Return:

```javascript
{
  ok: true,
  payload: {
    reportMeta: { audience: "school_manager", source: "physical_class_report", version: "v1" },
    physicalClass: { name: physicalClassName, gradeLevel, schoolId },
    subjectClassIds: [/* up to 6 UUIDs */],
    subjectBreakdown: [{
      classId, subjectFocus, subjectLabelHe,
      teacherId,        // ← required for teacher card navigation
      teacherName,
      memberCount, activityCount, accuracy
    }],
    roster: [/* deduped students: { studentId, displayName, physicalClassName, gradeLevel } */],
    cohortSummary,
    subjects,
    weaknessTopics,     // grouped by subject, includes studentIds per topic
    attentionList,      // deduped by studentId, includes subjectFocus per flag
    recentActivity,
    recentActivities: [{  // ← new, for פעילויות אחרונות section
      activityId, classId, title, subject, subjectLabelHe,
      teacherId, teacherName,
      mode, status, createdAt, activatedAt,
      submittedCount, accuracy
    }],
    students,           // per-student summary rows
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
- `navigation` sections (5 total — one per content section):
  1. `subjects` → `"פירוט לפי מקצוע"` with badge = number of subjects
  2. `activities` → `"פעילויות אחרונות"` with badge = `recentActivities.length`
  3. `students` → `"תלמידים בכיתה"` with badge = roster count
  4. `focus` → `"נושאים לחיזוק"` with badge = `weaknessTopics.length`
  5. `attention` → `"תלמידים שדורשים תשומת לב"` with badge = `attentionList.length`

There are exactly **5** navigation sections. Every reference to "6 sections" elsewhere in this plan is incorrect and superseded by this definition.

### Section item shapes (action-first)

Every item that represents an entity carries action slots. No item is render-only.

**`sections.subjects.items`** — one row per subject class:

```javascript
{
  id: classId,
  label: subjectLabelHe,                  // e.g. "מתמטיקה"
  detail: `${teacherName} · ${memberCount} תלמידים · ${activityCount} פעילויות`,
  accuracy,
  actions: [
    { id: "subject_report", label: "דוח מקצוע", classId },   // opens existing subject-class report modal
    { id: "teacher_card",   label: "כרטיס מורה", teacherId, teacherName }, // navigates to /school/teachers/[teacherId]
  ]
}
```

**`sections.activities.items`** — one row per recent classroom activity:

```javascript
{
  id: activityId,
  title,                              // activity title
  subject: subjectLabelHe,           // e.g. "עברית"
  teacherName,
  meta: `${submittedCount} הגישו · ${accuracy}% דיוק`,
  date: createdAt,
  actions: [
    { id: "open_subject_report", label: "דוח מקצוע", classId }, // opens related subject-class report
  ]
}
```

**Activity detail behavior — v1 explicit rule:**
- In v1, clicking an activity row opens the **related subject-class report** (the existing `SchoolReportModal` for that subject `classId`).
- There is **no standalone activity-detail modal** in this phase.
- A dedicated activity-detail modal (showing per-student submission status, individual answers, etc.) is a **future enhancement** and is explicitly out of scope for this implementation.
- The activity row must never be a dead end: the `"דוח מקצוע"` action is always present and always resolvable to a valid `classId`.

**`sections.students.items`** — one row per physical class student:

```javascript
{
  id: studentId,
  label: displayName,
  detail: `${physicalClassName} · ${gradeLevel}`,
  actions: [
    { id: "student_report", label: "דוח תלמיד", studentId },
  ]
}
```

**`sections.focus.items`** — one row per weak topic:

```javascript
{
  id: drilldownKey,            // "math::fractions"
  label: topicLabelHe,
  subject: subjectLabelHe,
  detail: `${wrongCount} טעויות · ${studentCount} תלמידים`,
  drilldownKey,
  // Drilldown expands to affected students, each with דוח תלמיד action
}
```

`drilldowns.focus[drilldownKey].items` = affected students, each with:
```javascript
{ id: studentId, label: displayName, actions: [{ id: "student_report", label: "דוח תלמיד", studentId }] }
```

**`sections.attention.items`** — one row per flagged student (deduped):

```javascript
{
  id: studentId,
  label: displayName,
  reasonHe,                    // e.g. "אין פעילות בטווח"
  subjects: [subjectLabelHe],  // which subjects triggered the flag
  actions: [
    { id: "student_report",  label: "דוח תלמיד",   studentId },
    { id: "subject_report",  label: subjectLabelHe, classId },  // if a single subject caused the flag
  ]
}
```

If the flag spans multiple subjects, the subject label in the attention row shows the first-flagging subject; all subjects are listed in `subjects[]`. The `דוח תלמיד` action is always present regardless.

No raw English keys visible anywhere in rendered output.

---

## 5a. Action-First Report Hub Rule (Amendment 1)

Every entity the physical class report renders follows this contract:

| Entity | Section | Primary action | Secondary action |
|---|---|---|---|
| Subject class | `"פירוט לפי מקצוע"` | `"דוח מקצוע"` → opens existing subject-class report modal | `"כרטיס מורה"` → opens teacher page |
| Teacher name | `"פירוט לפי מקצוע"` | `"כרטיס מורה"` → `/school/teachers/[teacherId]` | — |
| Classroom activity | `"פעילויות אחרונות"` | `"דוח מקצוע"` → opens related subject-class report modal | — |
| Student (roster) | `"תלמידים בכיתה"` | `"דוח תלמיד"` → student report (gradeLevel+physicalClassName scope) | — |
| Weak topic (topic row) | `"נושאים לחיזוק"` | Expand → affected students, each with `"דוח תלמיד"` | — |
| Weak topic (student in drilldown) | Topic drilldown | `"דוח תלמיד"` | — |
| Attention student | `"תלמידים שדורשים תשומת לב"` | `"דוח תלמיד"` | Subject label → `"דוח מקצוע"` if single subject triggered |

**No dead ends:** every modal layer has a working `"חזרה"` or `"סגירה"` button and never reaches a state with entities but no navigation.

The manager should not need to close the report and manually search elsewhere.

---

## 5b. Navigation Stack and Back/Close Behavior (Amendment 4)

The physical class report opens as a new `SchoolReportModal` instance (separate from any subject-class modal that may be open). This keeps modal Z-layers independent.

### Stack diagrams

```
Physical class report modal (primary)
  ├── report-hub-main        (summary + nav)
  ├── report-hub-detail      (section: subjects / students / focus / attention / activities)
  └── report-hub-drilldown   (weak-topic affected students)
      └── report-hub-student-main    (student report, nested)
          └── report-hub-student-detail
```

**Subject-class report drill-down** — opens as a **second `SchoolReportModal` stacked on top** (new instance, higher z-index):

```
Physical class report modal (layer 1, stays open underneath)
  └── Subject-class report modal (layer 2, opened on top)
        ├── report-hub-main
        └── report-hub-detail
        [close] → layer 2 closes; physical class report visible again
```

Back/close behavior:

- `"חזרה"` inside `report-hub-detail` / `report-hub-drilldown` → pops back to `report-hub-main` of same modal (existing `ReportHubModal` behavior, unchanged).
- `"סגירה"` on subject-class report modal → closes layer 2; physical class report remains open.
- `"סגירה"` on physical class report modal → closes entirely; returns to `/school/classes` subject-cards view.
- `"כרטיס מורה"` action → opens `/school/teachers/[teacherId]` in a **new browser tab** (`window.open(url, '_blank')`). Physical class report modal remains open in original tab. This avoids any navigation-away issue.

  **Teacher card behavior — v1 explicit rule:**
  - v1 implementation: `window.open('/school/teachers/' + teacherId, '_blank')` called synchronously inside the click handler (not inside a Promise or `setTimeout`) to avoid browser pop-up blocking.
  - On desktop browsers this opens a new tab reliably.
  - On mobile browsers `window.open(..., '_blank')` may be suppressed by the browser if not triggered by a direct user gesture. If suppressed, the fallback is to navigate the current tab to `/school/teachers/[teacherId]` using the router (`router.push`). The physical class report state is lost in this case — this is an accepted v1 limitation.
  - The implementation must detect the suppression case: if `window.open` returns `null`, fall back to `router.push`.
  - A future enhancement may replace this with an in-app teacher summary drawer/modal that preserves report context.
  - **Test requirement:** E2E must assert the teacher page link/navigation on both desktop viewport (new tab expected) and mobile viewport (fallback navigation accepted). The test must not fail on mobile due to the tab-opening difference — use a conditional assertion per viewport.
- `"דוח תלמיד"` from inside subject-class report (layer 2) — uses the **existing** nested student report mechanism already in `ReportHubModal`. Returns to subject-class report main on `"חזרה"`.
- `"דוח תלמיד"` from physical class report (layer 1) — uses the same nested student mechanism in layer 1. Returns to physical class report main on `"חזרה"`.

### Implementation note

`pages/school/classes/index.js` already manages a `reportClass` ref and a `nestedStudentVm` state for the existing subject-class flow. The physical class report adds a parallel state slice:

```javascript
const [physicalReportVm, setPhysicalReportVm] = useState(null);
const [physicalReportClass, setPhysicalReportClass] = useState(null);
const [subjectReportFromPhysical, setSubjectReportFromPhysical] = useState(null); // layer 2
```

The layer-2 subject report modal is a second `<SchoolReportModal>` rendered conditionally, with its own `onStudentReport` callback using the existing `openStudentReportFromClass` handler (unchanged).

---

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

New state additions:

```javascript
const [physicalReportVm, setPhysicalReportVm]       = useState(null);
const [physicalReportLoading, setPhysicalReportLoading] = useState(false);
const [subjectFromPhysicalVm, setSubjectFromPhysicalVm] = useState(null); // layer-2 modal
const [subjectFromPhysicalClass, setSubjectFromPhysicalClass] = useState(null);
```

New handler `openPhysicalClassReport(physicalGroup)`:
- Calls `GET /api/school/classes/physical-report?gradeLevel=...&physicalClassName=...&windowDays=30`
- Parses response via `parsePhysicalClassReportViewModel`
- Sets `physicalReportVm` → opens physical class report `SchoolReportModal`

Handler `openSubjectReportFromPhysical(cls)`:
- Reuses existing `openClassReport(cls)` logic but stores result in `subjectFromPhysicalVm` / `subjectFromPhysicalClass`
- Opens layer-2 `SchoolReportModal` stacked on top of physical report

Handler `openStudentReportFromPhysical(studentId)`:
- Does **not** pass `classId`; passes `gradeLevel + physicalClassName`
- Student report API already supports this path (see §7)

Handler `openTeacherCardFromPhysical(teacherId)`:
- `window.open(\`/school/teachers/\${teacherId}\`, '_blank')`
- Physical class report modal remains open in original tab

The `onStudentReport` prop of the layer-2 subject-class report modal reuses the **existing** `openStudentReportFromClass(studentId)` handler unchanged (it has a `classId` so passes `classId` to the student API as before).

### Hebrew labels to add in `lib/school-portal/school-ui.he.js`

- `SCHOOL_PHYSICAL_CLASS_REPORT_TITLE = "דוח כיתה כללי"`
- `SCHOOL_PHYSICAL_CLASS_REPORT_BUTTON = "דוח כיתה כללי"`
- `SCHOOL_PHYSICAL_CLASS_ALL_SUBJECTS = "כל המקצועות"`
- `SCHOOL_PHYSICAL_CLASS_SUBJECT_BREAKDOWN = "פירוט לפי מקצוע"`
- `SCHOOL_PHYSICAL_CLASS_RECENT_ACTIVITIES = "פעילויות אחרונות"`
- `SCHOOL_PHYSICAL_CLASS_LOADING = "טוען דוח כיתה כללי…"`
- `SCHOOL_TEACHER_CARD_ACTION = "כרטיס מורה"`

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
- Recent activities list: 1 query (`classroom_activities WHERE class_id IN (...)`)
- Total: ~60 queries

Estimated time: 4–8 seconds on cold start. Acceptable for an on-demand manager report.

Strategy:
- **No client cache** initially — fresh fetch each open.
- **No localStorage** — sensitive student data.
- **Parallel batching** at the server (concurrency 6, same as `buildTeacherClassReportPayload`).
- **Lazy drill-downs** — subject-class report and individual student reports are loaded on click only (separate API calls at click time). The physical class report's initial load does not pre-fetch any drill-down data.
- **`recentActivities`** list loaded in one query (not 6 separate requests) — single `IN` clause across all class IDs.
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

**Aggregation logic:**
- `loadSubjectClassIdsForPhysical` returns 6 subject classes for a valid physical class
- `loadSubjectClassIdsForPhysical` returns error for unknown physical class; returns partial result (not error) for a physical class with fewer than 6 subjects
- Roster dedup: student appearing in 3 of 6 subject classes is counted once
- `aggregateClassReportFromStudentPayloads` on 24 deduped student payloads: total answers = sum of individual answers
- Weighted accuracy: (correct / answers) across all subjects
- `weaknessTopics` grouped by subject: entries from math are labelled `"מתמטיקה"`
- `attentionList` dedup: student with flags in 2 subjects appears once with highest combined score; both subject labels present in `subjects[]`
- `recentActivities`: activity from math class has `subjectLabelHe: "מתמטיקה"` and `teacherName` populated

**View model (action-first):**
- `parsePhysicalClassReportViewModel`: `summaryCards` include all 5 expected Hebrew labels
- `parsePhysicalClassReportViewModel`: `sections.subjects.items` length = number of subject classes
- `sections.subjects.items[0].actions` includes both `"דוח מקצוע"` (with `classId`) and `"כרטיס מורה"` (with `teacherId`)
- `sections.activities.items[0].actions` includes `"דוח מקצוע"` action with `classId`
- `sections.students.items[0].actions` includes `"דוח תלמיד"` action with `studentId`
- `sections.focus.items[0]` has `drilldownKey`; `drilldowns.focus[key].items[0].actions` includes `"דוח תלמיד"`
- `sections.attention.items[0].actions` includes `"דוח תלמיד"`; if single subject flagged, also includes subject report action
- No item in any section has zero actions (no dead-end rows)
- Navigation has `activities` entry with `"פעילויות אחרונות"` label
- Navigation has **5** entries total: subjects, activities, students, focus, attention (not 6)

### API regression — against demo school

- `GET /api/school/classes/physical-report?gradeLevel=1&physicalClassName=כיתה א׳ 1&windowDays=30`
  - Returns `200`, `payload.roster.length === 24`
  - `payload.subjectBreakdown.length === 6`
  - `payload.subjectBreakdown` each entry has `teacherId`, `teacherName`, `subjectLabelHe`
  - `payload.recentActivities.length > 0`; each item has `classId`, `subjectLabelHe`, `teacherName`
  - `payload.cohortSummary.totalAnswers` equals sum of subject-class totals (or direct DB rollup)
  - No raw English subject keys in `subjectLabelHe` fields
- Cross-school: using school manager token from school B to request school A's physical class → `403 / physical_class_not_found`
- Missing params: omit `physicalClassName` → `400`
- Unknown physical class → `404`

### Playwright E2E — `tests/e2e/school-physical-class-report.spec.ts`

**Main flow:**
1. Login as school manager for demo school
2. Navigate to `/school/classes`
3. Select grade `"כיתה א׳"`
4. Select physical class `"כיתה א׳ 1"` — subject cards visible
5. `"דוח כיתה כללי"` button visible above subject cards
6. Click `"דוח כיתה כללי"` → `report-hub-main` appears; summary cards present

**Subject section + teacher navigation (Amendment 3):**
7. Navigate to `"פירוט לפי מקצוע"` section — 6 subject rows visible
8. Each row has `"דוח מקצוע"` button and `"כרטיס מורה"` button
9. Click `"דוח מקצוע"` for מתמטיקה → layer-2 subject-class report opens on top
10. Layer-2 report has `"סגירה"` button; click it → physical class report still open, returns to subject section
11. **Teacher card — desktop viewport:** Click `"כרטיס מורה"` → assert `window.open` was called with `/school/teachers/[teacherId]` and `'_blank'` (Playwright intercept or `page.waitForEvent('popup')`)
12. **Teacher card — mobile viewport (375px):** Click `"כרטיס מורה"` → assert either a new tab opened OR the page navigated to `/school/teachers/[teacherId]` (conditional assertion; test must not fail if pop-up is suppressed and fallback navigation occurs)

**Activities section (Amendment 2 + explicit v1 rule):**
13. Navigate to `"פעילויות אחרונות"` section — at least 1 activity row visible
14. Activity row shows activity title, subject label in Hebrew, and teacher name
15. Activity row has `"דוח מקצוע"` action button — no other action present
16. Click `"דוח מקצוע"` on activity row → related subject-class report opens (layer-2 modal); no standalone activity-detail modal appears
17. Verify: there is no activity-detail modal element in the DOM

**Student drill-down:**
15. Navigate to `"תלמידים בכיתה"` section — student rows visible
16. Each row has `"דוח תלמיד"` button
17. Click `"דוח תלמיד"` for one student → `report-hub-student-main` appears
18. Student report shows non-zero school/class activity
19. `"חזרה"` → returns to student list in physical class report

**Weak topics (Amendment 1):**
20. Navigate to `"נושאים לחיזוק"` section — at least 1 topic row visible with Hebrew subject prefix
21. Click a topic row → drilldown opens with affected student list
22. Each affected student has `"דוח תלמיד"` button (no dead end)

**Attention students (Amendment 1):**
23. Navigate to `"תלמידים שדורשים תשומת לב"` section
24. Each student row has `"דוח תלמיד"` button
25. Subject label (if present) is in Hebrew only

**Navigation stack (Amendment 4):**
26. Open subject-class report from physical report (layer 2)
27. Open `"דוח תלמיד"` from inside layer-2 report → nested student report appears
28. `"חזרה"` → returns to subject-class report (layer 2 main)
29. `"סגירה"` on layer 2 → physical class report (layer 1) visible again
30. `"סגירה"` on physical class report → `/school/classes` subject cards view

**Mobile (375px viewport):**
31. Repeat steps 6, 7, 8, 16, 17 on mobile — all actions visible and tappable

### Regression checks

- Existing subject-class report still opens via `"דוח כיתה"` on subject cards (unchanged path)
- Teacher dashboard class report unchanged
- Parent report API smoke test
- Private teacher report API smoke test
- Hebrew visible text audit: no raw English keys in rendered physical report sections
- Build PASS (`npm run build`)

---

## 12. Phased Implementation Order

**Phase 1 — Server core (no UI)**
1. Export `loadSubjectClassIdsForPhysical` from `school-operations.server.js`
2. Create `lib/school-server/school-physical-class-report.server.js` with `buildSchoolPhysicalClassReportPayload`; include `recentActivities` query and `teacherId` in `subjectBreakdown`
3. Unit tests for aggregation logic, `recentActivities` enrichment, and partial physical class (fewer than 6 subjects)

**Phase 2 — API**
4. Create `pages/api/school/classes/physical-report.js`
5. API regression tests (demo school, cross-school guard, bad params, `recentActivities` present, `teacherId` in breakdown)

**Phase 3 — View model**
6. Add `parsePhysicalClassReportViewModel` to `school-report-view-model.js` — include all action slots (subject report, teacher card, student report) on every item type
7. Add Hebrew labels to `school-ui.he.js` including `SCHOOL_PHYSICAL_CLASS_RECENT_ACTIVITIES` and `SCHOOL_TEACHER_CARD_ACTION`
8. Unit tests for view model: verify action slots, no dead-end rows, activities navigation entry, 5 navigation sections

**Phase 4 — UI integration**
9. Update `pages/school/classes/index.js`:
   - Physical report button + `openPhysicalClassReport` handler
   - `openSubjectReportFromPhysical` (layer-2 modal state)
   - `openStudentReportFromPhysical` (gradeLevel + physicalClassName, no classId)
   - `openTeacherCardFromPhysical` (`window.open`, new tab)
   - Layer-2 `<SchoolReportModal>` JSX for subject-class report from physical context
10. Playwright E2E tests covering all action-first requirements and navigation stack

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
| Layer-2 subject-class modal Z-index conflicts with physical class modal | Use existing `ReportModalFrame` z-index layering; test explicitly with both modals open |
| `"כרטיס מורה"` opens new tab — browser may block pop-up if not from direct user gesture | Detect `window.open` returning `null`; fall back to `router.push` (v1 accepted limitation). Tested explicitly on mobile viewport with conditional E2E assertion. |
| `recentActivities` enrichment: `classroom_activities` rows may not all have matching `class_id` in `subjectBreakdown` (e.g., archived subject class) | Filter activities to only those whose `class_id` is in the resolved subject class IDs; skip unenrichable rows |
| Attention list subject labels: student flagged for `no_activity_in_range` has no specific subject | Show `"כל המקצועות"` as subject label for cross-subject flags; do not show subject report action in that case |

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
- No mobile-specific layout changes (existing `ReportHubModal` is already responsive)
- No standalone activity-detail modal (v1: activity rows open the related subject-class report; a dedicated activity-detail modal is a future enhancement)
- No new teacher-report system (reuses existing `/school/teachers/[teacherId]` page)

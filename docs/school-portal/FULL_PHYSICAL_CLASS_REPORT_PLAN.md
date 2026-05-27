# Full Physical Class Report — Delivery Summary

## Overview

School managers can open **דוח כיתה כללי** from `/school/classes` after selecting a grade and physical class. The report aggregates all subject-class records for that physical class into one cross-subject view while leaving existing subject-class, teacher, parent, and private-teacher reports unchanged.

## Architecture

- **Option A (direct aggregation)** — `buildSchoolPhysicalClassReportPayload` in [`lib/school-server/school-physical-class-report.server.js`](../lib/school-server/school-physical-class-report.server.js)
- Resolves subject classes via `loadSubjectClassesForPhysicalReport` (relaxed: ≥1 subject)
- Dedupes roster across subject classes by `studentId`
- Loads each student's home-practice payload once; merges classroom rollups per subject class
- Aggregates with `aggregateClassReportFromStudentPayloads`

## API

```
GET /api/school/classes/physical-report?gradeLevel=1&physicalClassName=כיתה א׳ 1&windowDays=30
```

- School-manager auth only (`requireSchoolManagerApiContext`)
- Does not replace `/api/school/classes/[classId]/report-data`

## UI & Report Hub drill-downs

- Entry: **דוח כיתה כללי** button on physical class subject view (`pages/school/classes/index.js`)
- View model: `parsePhysicalClassReportViewModel` (`kind: "physical_class"`)
- **5 navigation sections:** פירוט לפי מקצוע, פעילויות אחרונות, תלמידים בכיתה, נושאים לחיזוק, תלמידים שדורשים תשומת לב
- **Action-first:** every row has navigation (דוח מקצוע, כרטיס מורה, דוח תלמיד)

### Modal stacking (QA-approved)

All drill-downs stay inside the Report Hub — **no new browser tabs, no page navigation**.

| Action | Behavior |
|--------|----------|
| **דוח מקצוע** | Opens subject-class report in a second `SchoolReportModal` with `stackZIndexBase={150}` so it renders **above** the physical report detail layer (z 110). Close returns to the physical report. |
| **כרטיס מורה** | Opens internal `SchoolTeacherCardModal` (z 320) using existing `GET /api/school/teachers/[teacherId]`. Shows name, role, student/class counts, school subjects, subjects in this physical class. **No** `window.open`, **no** `router.push`. |
| **דוח תלמיד** | Nested student report inside the same modal stack (existing Report Hub behavior). |

The full teacher detail page (`/school/teachers/[teacherId]`) remains available elsewhere — not from this report flow.

## Student reports from physical context

Uses existing API with `gradeLevel + physicalClassName` (no `classId`):

```
GET /api/school/students/[studentId]/report-data?windowDays=30&gradeLevel=1&physicalClassName=כיתה א׳ 1
```

## Tests

| Test | Path |
|------|------|
| Unit (aggregation + view model) | `scripts/tests/school-physical-class-report-unit.mjs` |
| API regression (demo school) | `scripts/tests/demo-school-physical-class-report-regression.mjs` |
| E2E (stacking + teacher card modal) | `tests/e2e/school-physical-class-report.spec.ts` |

Demo school verification (כיתה א׳ 1): 24 students, 6 subjects, 20 recent activities.

## Files changed (UI flow fix)

- `components/reporting/ReportHubModal.jsx` — `stackZIndexBase` prop for stacked modals
- `components/school-portal/SchoolReportModal.jsx` — passthrough `stackZIndexBase`
- `components/school-portal/SchoolTeacherCardModal.jsx` — **new** internal teacher card
- `pages/school/classes/index.js` — z-index stacking, teacher card modal, removed tab/page navigation

## Non-goals (unchanged)

- No DB schema changes
- No aggregation/API changes for physical report data
- No simulation work
- Teacher detail physical-class cards (scope A)
- Parent / private-teacher APIs untouched

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

## UI

- Entry: **דוח כיתה כללי** button on physical class subject view (`pages/school/classes/index.js`)
- View model: `parsePhysicalClassReportViewModel` (`kind: "physical_class"`)
- **5 navigation sections:** פירוט לפי מקצוע, פעילויות אחרונות, תלמידים בכיתה, נושאים לחיזוק, תלמידים שדורשים תשומת לב
- Action-first: every row has navigation (דוח מקצוע, כרטיס מורה, דוח תלמיד)
- Layer-2 subject-class report modal stacked on physical report
- Teacher card: `window.open` with `router.push` fallback

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
| E2E | `tests/e2e/school-physical-class-report.spec.ts` |

Demo school verification (כיתה א׳ 1): 24 students, 6 subjects, 20 recent activities.

## Files changed

**New**
- `lib/school-server/school-physical-class-report.server.js`
- `pages/api/school/classes/physical-report.js`
- `scripts/tests/school-physical-class-report-unit.mjs`
- `scripts/tests/demo-school-physical-class-report-regression.mjs`
- `tests/e2e/school-physical-class-report.spec.ts`

**Modified**
- `lib/school-server/school-operations.server.js` — export `loadSubjectClassesForPhysicalReport`
- `lib/school-portal/school-report-view-model.js` — `parsePhysicalClassReportViewModel`
- `lib/school-portal/school-ui.he.js` — Hebrew labels
- `pages/school/classes/index.js` — UI + handlers
- `components/reporting/ReportHubBody.jsx` — row actions
- `components/reporting/ReportHubModal.jsx` — `onRowAction`
- `components/school-portal/SchoolReportModal.jsx` — passthrough

## Non-goals (unchanged)

- No DB schema changes
- No simulation work
- Teacher detail physical-class cards (scope A)
- Parent / private-teacher APIs untouched

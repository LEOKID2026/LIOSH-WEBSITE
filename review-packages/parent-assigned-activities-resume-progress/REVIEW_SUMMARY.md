# Assigned Activities — Review Package (Resume + Layout UX)

Generated **2026-05-30**. Student assigned activity play page fixes for all scopes (`parent`, `student`, `class`). No SQL. No commit / push / deploy.

## Packages in this review

1. **Resume/progress** — restore saved attempts on refresh/reopen
2. **Math layout toggle** — ↕️ מאונך / ↔️ מאוזן for arithmetic
3. **Layout UX** — compact page, header row, 2×2 MCQ grid, geometry diagram labels

---

## Layout UX fixes (latest)

| Issue | Fix |
|-------|-----|
| Excessive scrolling | Reduced padding, smaller question min-heights, desktop 2-column split (question \| answers) |
| Back button wastes row | `חזרה לבית` on same row as title (physical left via `dir="ltr"` header) |
| 4 short MCQ = 4 rows | `grid-cols-2` on mobile for choices ≤16 chars; long text stays single column |
| Geometry label placement | Reuses `GeometryExplanationDiagram` with `compact` variant; improved hidden-angle label inset in `triangleLayoutFromAngles` |

## Resume/progress fixes

- Start response includes `attempts` + `resumeQuestionIndex` (all scopes)
- Client restores saved answers/feedback; blocks resubmit + read-only answered UI
- Numeric `0` restores via `selectedAnswer != null` check
- Server rejects duplicate answers (`question_already_answered`)

## Files in this package

| Path | Change |
|------|--------|
| `pages/student/activity/[activityId].js` | Compact layout, header row, 2-col grid, resume wiring |
| `components/student/StudentActivityQuestionSurface.jsx` | Compact question area + math toggle |
| `components/student/ClassroomGeometryQuestionDiagram.jsx` | `compact` diagram variant |
| `components/learning/geometry/GeometryExplanationDiagram.jsx` | `compact` DiagramFrame prop |
| `lib/classroom-activities/student-activity-choice-layout.client.js` | **New** — 2×2 vs 1-col choice logic |
| `lib/classroom-activities/student-activity-resume.shared.js` | **New** — resume index helpers |
| `lib/classroom-activities/student-activity-resume.server.js` | **New** — load attempts + duplicate guard |
| `lib/classroom-activities/student-activity-question-ui.client.js` | Math layout normalization |
| `lib/classroom-activities/student-activity-error-labels.client.js` | Hebrew error labels |
| `utils/geometry-diagram-layout.js` | Hidden-angle label positioning |
| `lib/parent-server/parent-activity.server.js` | Resume payload + duplicate guard |
| `lib/teacher-server/student-activity-play.server.js` | Resume (scope `student`) |
| `lib/teacher-server/teacher-activities.server.js` | Resume (scope `class`) |
| `tests/classroom-activities/student-activity-layout.test.mjs` | **New** |
| `tests/classroom-activities/student-activity-resume.test.mjs` | Resume regression |
| `tests/classroom-activities/student-activity-scope-labels.test.mjs` | Scope + math toggle |
| `tests/parent-server/parent-assigned-activities.test.mjs` | Parent activity server |

## Verification commands

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs tests/classroom-activities/student-activity-resume.test.mjs tests/classroom-activities/student-activity-layout.test.mjs tests/geometry-diagram-layout.test.mjs
npm run build
```

### Automated results (2026-05-30)

```
node --test (5 test files above)
# tests 52 | pass 52 | fail 0

npm run build
# exit code 0
```

## Manual browser QA checklist

Repeat for **parent**, **teacher individual**, and **classroom** scopes.

### Layout

| # | Check | Expected |
|---|-------|----------|
| L1 | Mobile page top | Less empty space; title + back on one row |
| L2 | Back link position | `← חזרה לבית` on left, title on right |
| L3 | 4 short MCQ | 2×2 grid on mobile |
| L4 | Long MCQ text | Single column |
| L5 | Desktop | Question/diagram left, answers/actions right; minimal scroll |
| L6 | Geometry diagram | Angle numbers + `?` near correct vertices |

### Resume (unchanged — re-verify)

| # | Check | Expected |
|---|-------|----------|
| R1 | Answer Q1 → refresh | Continues at first unanswered |
| R2 | Wrong answer → refresh | Answer locked, cannot edit |
| R3 | Submit → reopen | Completed screen |
| R4 | Math toggle | ↕️/↔️ still works after layout change |

### Parent monitoring (parent scope)

| # | Check | Expected |
|---|-------|----------|
| P1 | Student in progress | Parent sees **בתהליך** |
| P2 | After refresh | Counts unchanged |
| P3 | After submit | **הושלם** |

## Unchanged by design

- No SQL / schema changes
- Parent answers in `parent_activity_attempts` only
- Teacher/school reports unchanged
- No backend report or save/resume architecture changes in layout pass

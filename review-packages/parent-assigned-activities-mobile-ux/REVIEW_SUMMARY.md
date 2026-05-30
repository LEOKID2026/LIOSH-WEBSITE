# Parent Assigned Activities — Mobile UX Follow-up Review Package

Generated **2026-05-30**. Focused UX follow-up after manual mobile QA. No SQL, no backend architecture changes, no teacher/classroom/report changes.

## Fixes in this package

### 1. Parent dashboard — sent activities behind button/modal

- Child card shows compact button **פעילויות שנשלחו** (next to **שלח פעילות**)
- Full list + polling (8s) only while modal is open
- **צפה בתוצאות** detail modal unchanged

### 2. Hebrew-only topic/subject labels

- New `formatActivityTopicDisplayHe()` maps internal keys (e.g. `addition` → **חיבור**)
- Used in parent sent-activities modal and results modal
- Never shows raw English/internal keys to users

### 3. Student home tile — **פעילויות אישיות**

- Renamed from **פעילויות מהמורה**
- Count includes `scope: "student"` + `scope: "parent"` (not classroom)
- Fetches from `GET /api/student/activities` on home load

### 4. Assigned activity play — layout toggle

- New `StudentActivityQuestionSurface` reuses vertical/horizontal toggle (↕️ מאונך / ↔️ מאוזן)
- Session-only per question (resets on question change), same as subject practice
- Uses shared `buildVerticalOperation` logic for math ops

### 5. Mobile numeric keyboard for math/geometry

- `resolveStudentActivityAnswerInputProps()` sets `inputMode="decimal"` for math/geometry free-text answers
- Hebrew/English text subjects keep `inputMode="text"`
- Choice-button questions unaffected

## Files changed / added

| Path | Change |
|------|--------|
| `components/parent/ParentSentActivitiesPanel.jsx` | Button + modal (no inline list) |
| `components/student/StudentActivityQuestionSurface.jsx` | **New** — layout toggle surface |
| `components/student/StudentClassroomActivitiesPanel.jsx` | Scope sections (prior UX follow-up) |
| `lib/classroom-activities/student-activity-display-labels.client.js` | **New** — Hebrew topic labels |
| `lib/classroom-activities/student-activity-question-ui.client.js` | **New** — layout + input props |
| `lib/classroom-activities/student-activity-scope-labels.client.js` | Scope badge helper |
| `lib/parent-server/parent-activity-labels.client.js` | Parent monitoring Hebrew |
| `lib/parent-server/parent-activity.server.js` | List detail + startedAt |
| `pages/api/parent/activities/[activityId].js` | Detail endpoint |
| `pages/parent/dashboard.js` | Modal trigger placement |
| `pages/student/home.js` | Tile rename + personal count |
| `pages/student/activity/[activityId].js` | Layout surface + numeric input |
| `tests/classroom-activities/student-activity-scope-labels.test.mjs` | Extended regression tests |
| `tests/parent-server/parent-assigned-activities.test.mjs` | API/list/permission tests |

Plus prior package files (SQL migration reference, report aggregate, teacher-activities scope branches, AssignActivityModal, etc.).

## Verification

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs
npm run build
```

**Results (2026-05-30):**

```
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs
# tests 27 | pass 27 | fail 0

npm run build
# exit code 0
```

## Manual mobile QA checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Parent dashboard child card | Clean — no inline activity list |
| 2 | Tap **פעילויות שנשלחו** | Modal opens with sent activities |
| 3 | Topic display in modal | Hebrew only (e.g. **חיבור**, not `addition`) |
| 4 | Student home tile | **פעילויות אישיות** with count ≥ 1 when parent activity exists |
| 5 | Open activities panel | Parent activity under **פעילות אישית** section |
| 6 | Play math activity | ↕️/↔️ toggle visible for supported ops |
| 7 | Math answer input on mobile | Numeric/decimal keyboard opens |
| 8 | Hebrew/English activity | Text keyboard (not forced numeric) |
| 9 | Parent **צפה בתוצאות** | Still works with Hebrew topic labels |
| 10 | Teacher/class activities | Unchanged behavior |

## Unchanged by design

- No SQL
- Teacher activity logic / classroom activities / teacher-school reports
- Parent report architecture (`includeParentActivities` opt-in only)
- Parent answers stay in `parent_activity_attempts` only

## No commit / push / deploy

Per owner instructions.

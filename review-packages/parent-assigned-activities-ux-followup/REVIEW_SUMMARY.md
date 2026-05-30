# Parent Assigned Activities — UX Follow-up Review Package

Generated **2026-05-30** after manual browser QA found two product issues. This package is a focused follow-up only — no architecture changes, no SQL changes.

## Fixes in this package

### Issue 1 — Student scope label

**Problem:** Parent-assigned activities appeared under “פעילויות כיתה”.

**Fix:** Student activity list now partitions by `scope`:

| Scope | Section / badge |
|-------|-----------------|
| `class` | Section: `פעילויות כיתה` (unchanged) |
| `student` | Section: `פעילויות אישיות`, badge: `אישי` (unchanged) |
| `parent` | Section: `פעילות אישית`, badge: `פעילות אישית` |

UI-label-only. No backend semantics changed for class/student activities.

### Issue 2 — Parent sent-activity monitoring

**Problem:** Parent could send an activity but had no place to track status/results.

**Fix:** Per-child **פעילויות שנשלחו** panel on parent dashboard:

- Lists title, subject, topic, status, answer/correct counts, score, started/submitted times
- Polls `GET /api/parent/activities?studentId=...` every 8s while mounted
- **צפה בתוצאות** opens detail modal via new `GET /api/parent/activities/[activityId]`
- Detail endpoint verifies parent ownership + linked child; returns attempts from `parent_activity_attempts`

Approved Hebrew copy applied throughout.

## Files changed / added

| Path | Change |
|------|--------|
| `lib/classroom-activities/student-activity-scope-labels.client.js` | **New** — scope badge helper |
| `components/student/StudentClassroomActivitiesPanel.jsx` | Scope-based sections + badges |
| `lib/parent-server/parent-activity-labels.client.js` | **New** — parent monitoring Hebrew labels |
| `lib/parent-server/parent-activity.server.js` | `startedAt` on list; `getParentActivityDetailForParent` |
| `pages/api/parent/activities/[activityId].js` | **New** — authorized detail endpoint |
| `components/parent/ParentSentActivitiesPanel.jsx` | **New** — sent activities + polling + results modal |
| `pages/parent/dashboard.js` | Integrate sent-activities panel per child |
| `tests/classroom-activities/student-activity-scope-labels.test.mjs` | **New** — scope label regression tests |
| `tests/parent-server/parent-assigned-activities.test.mjs` | Extended list/detail/permission tests |

**Unchanged by design:** teacher activities, classroom behavior, teacher/school reports, SQL schema.

## Verification commands and results

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs
node --test tests/classroom-activities/student-activity-scope-labels.test.mjs
npm run build
```

**Results (2026-05-30):**

```
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs
# tests 23 | pass 23 | fail 0

npm run build
# exit code 0
# routes: /api/parent/activities, /api/parent/activities/[activityId]
```

## Test coverage added

1. `listParentActivitiesForParent` returns status/result fields (`studentStatus`, counts, `startedAt`, subject, topic)
2. `getParentActivityDetailForParent` returns 404 for wrong parent; 403 for unlinked child
3. `scope: "parent"` renders `פעילות אישית`, not classroom section
4. `scope: "class"` / `scope: "student"` regression (static source checks)
5. Detail API import resolution + correct `../../../../lib/` depth

## Manual QA checklist (post-deploy)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Student home with parent activity | Appears in **פעילות אישית** section with badge **פעילות אישית**, not under **פעילויות כיתה** |
| 2 | Student with class + teacher individual activities | Class and teacher labels unchanged |
| 3 | Parent dashboard per child | **פעילויות שנשלחו** section visible after send |
| 4 | Child starts activity | Parent panel updates status to **בתהליך** (within poll interval) |
| 5 | Child submits | Status **הושלם**, score/counts visible |
| 6 | **צפה בתוצאות** | Modal shows per-question results |
| 7 | Wrong parent / wrong activity ID | 403/404, no data leak |

## Remaining risks / open items

1. **Browser E2E not re-run by Cursor** — owner should confirm the 7 manual steps above.
2. **Polling only while dashboard mounted** — no WebSocket; acceptable per spec.
3. **No SQL / commit / push / deploy** — per owner instructions.
4. **Homework mode UI** still deferred (server supports; modal V1 = guided_practice only).

## Prior package files (still included)

Original parent-assigned-activities implementation files remain in this ZIP for full context:

- `supabase/migrations/051_parent_assigned_activities.sql` (already applied manually)
- `lib/parent-server/report-data-aggregate.server.js`
- `lib/teacher-server/teacher-activities.server.js`
- `pages/api/parent/activities/index.js`
- `pages/api/parent/students/[studentId]/report-data.js`
- `components/parent/AssignActivityModal.js`

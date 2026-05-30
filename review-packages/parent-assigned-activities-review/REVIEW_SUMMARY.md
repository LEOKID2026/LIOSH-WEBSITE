# Parent Assigned Activities — Corrected Review Package (v2)

This package was regenerated from the current working tree on 2026-05-30 after the prior ZIP was found stale.

## Corrections verified in this package

1. **`supabase/migrations/051_parent_assigned_activities.sql`**
   - Includes `parent_activity_attempts_student_answered_idx` on `(student_id, answered_at DESC)`
   - Includes `DROP TRIGGER IF EXISTS` before both trigger creations

2. **`pages/api/parent/activities/index.js`**
   - All imports use `../../../../lib/...` (four levels up from `pages/api/parent/activities/`)

3. **`pages/api/parent/students/[studentId]/report-data.js`**
   - Included as an actual file in this ZIP
   - Passes `{ includeParentActivities: true }` to `aggregateParentReportPayload`

4. **`tests/parent-server/parent-assigned-activities.test.mjs`**
   - Includes dynamic import test: `parent activities API route imports resolve`
   - Includes static depth test: `parent activities API uses correct relative lib import depth`

## Files in this package

| Path | Status |
|------|--------|
| `supabase/migrations/051_parent_assigned_activities.sql` | New |
| `lib/parent-server/parent-activity.server.js` | New |
| `lib/parent-server/report-data-aggregate.server.js` | Edited |
| `lib/teacher-server/teacher-activities.server.js` | Edited |
| `pages/api/parent/activities/index.js` | New |
| `pages/api/parent/students/[studentId]/report-data.js` | Edited |
| `components/parent/AssignActivityModal.js` | New |
| `pages/parent/dashboard.js` | Edited |
| `tests/parent-server/parent-assigned-activities.test.mjs` | New |

## Architectural rule

- Parent-assigned answers live only in `parent_activity_attempts`
- Never written to shared `answers` table
- Only parent report API passes `{ includeParentActivities: true }`
- Teacher/school paths unchanged

## SQL — manual apply required

Apply `supabase/migrations/051_parent_assigned_activities.sql` manually in Supabase.

Rollback:
```sql
DROP TABLE public.parent_activity_attempts CASCADE;
DROP TABLE public.parent_activity_status CASCADE;
DROP TABLE public.parent_assigned_activities CASCADE;
```

## Verification commands and results

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs
npm run build
```

Results at package generation time:

```
node --test tests/parent-server/parent-assigned-activities.test.mjs
# tests 12
# pass 12
# fail 0

npm run build
# exit code 0
# route present: /api/parent/activities
```

## Manual QA checklist

1. Parent dashboard → "שלח פעילות" button per child
2. Modal opens with locked grade and correct child name
3. Subject/topic selection and preview work
4. Send activity succeeds
5. Student sees activity in list and can complete it
6. Parent report includes answered questions
7. Teacher report does NOT include parent-assigned activity data
8. 403 for unlinked child; 404 for cross-student access

## Remaining items

- SQL not run by Cursor
- No commit, push, or deploy
- UI V1 exposes `guided_practice` only (server also accepts `homework`)

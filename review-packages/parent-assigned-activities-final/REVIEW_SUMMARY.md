# Parent Assigned Activities — Final Review Package

Generated from the current working tree on **2026-05-30** after migration `051_parent_assigned_activities.sql` was **applied manually in Supabase (LEO-KID / `ajxwmlwbzxwffrtlfuoe`)**.

## Status

| Gate | Result |
|------|--------|
| SQL migration | Applied manually by owner |
| Unit/integration tests | **12/12 pass** |
| Production build | **exit 0** |
| DB schema smoke check | **pass** (tables, indexes, triggers, RLS, read queries) |
| Browser manual QA | **Pending owner** (steps below) |

## Files in this package

| Path | Status |
|------|--------|
| `supabase/migrations/051_parent_assigned_activities.sql` | New (applied) |
| `lib/parent-server/parent-activity.server.js` | New |
| `lib/parent-server/report-data-aggregate.server.js` | Edited |
| `lib/teacher-server/teacher-activities.server.js` | Edited |
| `pages/api/parent/activities/index.js` | New |
| `pages/api/parent/students/[studentId]/report-data.js` | Edited |
| `components/parent/AssignActivityModal.js` | New |
| `pages/parent/dashboard.js` | Edited |
| `tests/parent-server/parent-assigned-activities.test.mjs` | New |

## Architectural rule

- Parent-assigned answers live **only** in `parent_activity_attempts`
- **Never** written to shared `answers` table
- Only `pages/api/parent/students/[studentId]/report-data.js` passes `{ includeParentActivities: true }`
- Teacher/school report paths call `aggregateParentReportPayload` **without** the flag

---

## Verification commands and results

### 1. Tests

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs
```

**Result (2026-05-30):**

```
# tests 12
# pass 12
# fail 0
# duration_ms ~272
```

Tests cover: body validation, report aggregation opt-in, no `answers` table writes, teacher/school isolation, parent report flag, API import resolution, and correct `../../../../lib/` import depth.

### 2. Build

```bash
npm run build
```

**Result (2026-05-30):**

- Exit code: **0**
- Route present: `/api/parent/activities`
- Pre-existing warnings only (unrelated `question-metadata-scanner` critical dependency)

---

## DB / schema smoke check (post-SQL)

Project: **LEO-KID** (`ajxwmlwbzxwffrtlfuoe`)

### Tables exist

| Table | `to_regclass` |
|-------|---------------|
| `parent_assigned_activities` | present |
| `parent_activity_status` | present |
| `parent_activity_attempts` | present |

### Indexes present

- `parent_assigned_activities`: `parent_idx`, `student_idx`, `id_student_uq`, PK
- `parent_activity_status`: `activity_idx`, unique `(activity_id, student_id)`, PK
- `parent_activity_attempts`: `activity_idx`, **`parent_activity_attempts_student_answered_idx`**, unique `(activity_id, student_id, question_index)`, PK

### Triggers present

- `trg_parent_assigned_activities_set_updated_at` on `parent_assigned_activities`
- `trg_parent_activity_status_set_updated_at` on `parent_activity_status`

### RLS enabled

All three tables: `rls_enabled = true` (service-role APIs only; no client policies added).

### Read-query smoke (server-shaped)

Representative SELECTs used by server code executed successfully (empty result sets — no parent activities created yet):

- List/join: `parent_assigned_activities` LEFT JOIN `parent_activity_status`
- Report join: `parent_activity_attempts` INNER JOIN `parent_assigned_activities` on `(activity_id, student_id)` with `answered_at` filter
- Count queries on all three tables return `0` rows

No schema-missing or column-missing errors observed.

---

## Manual QA checklist

**Code-verified (static):** UI wiring, validation messages, API routes, and isolation flags are in place. **Runtime browser steps require owner confirmation.**

| # | Scenario | Expected | Code / static | Runtime |
|---|----------|----------|---------------|---------|
| 1 | Parent dashboard — one `שלח פעילות` button per linked child | Button inside each child card | Verified in `pages/parent/dashboard.js` | Pending |
| 2 | Click button → modal opens for selected child | Title: `שליחת פעילות ל{child_name}`; grade locked | Verified in `AssignActivityModal.js` | Pending |
| 3 | Activity name required | Error: `יש להזין כותרת לפעילות` if empty | Verified client + server | Pending |
| 4 | Preview then send activity | POST `/api/parent/activities`; success toast `הפעילות נשלחה בהצלחה!` | Verified | Pending |
| 5 | Student sees parent activity | Appears in student activities list (`scope: parent` in `teacher-activities.server.js`) | Verified server path | Pending |
| 6 | Student start → answer → submit | Uses parent tables only; status progresses `not_started` → `in_progress` → `submitted` | Verified server path | Pending |
| 7 | Parent report includes completed activity | `GET /api/parent/students/[studentId]/report-data` with `{ includeParentActivities: true }` | Verified API + aggregation | Pending |
| 8 | Teacher/school reports exclude parent data | No `includeParentActivities` in teacher/school report callers | Verified by tests 8–9 | Pending |
| 9 | Unlinked child → 403 | `לא ניתן לשלוח פעילות לילד זה` | Verified client handling | Pending |

### Suggested manual QA flow

1. Log in as parent with at least one linked child.
2. Open `/parent/dashboard` → confirm one green `שלח פעילות` button per child.
3. Open modal → enter title, pick subject/topic, click preview, then send.
4. Log in as that student → confirm new activity appears and complete full flow.
5. Open parent report for that child → confirm answered questions appear in date range.
6. Log in as teacher (if same student is also in a class) → confirm teacher report does **not** show parent-assigned activity data.

---

## Remaining risks / open items

1. **Browser E2E not run by Cursor** — owner should complete manual QA checklist above.
2. **No production data yet** — DB tables exist but row counts are 0; first real create/submit will be the first live write test.
3. **UI V1 = `guided_practice` only** — server accepts `homework` but modal hardcodes `PARENT_MODES = ["guided_practice"]`; homework UI deferred.
4. **Migration not in `supabase_migrations.schema_migrations`** — applied manually outside CLI tracking; acceptable for owner workflow but local `supabase db pull`/migration history may not reflect 051.
5. **No commit, push, or deploy** — code changes remain in working tree only.
6. **RLS with no policies** — intentional (service-role only); do not expose these tables via anon/authenticated PostgREST without policies.

## Rollback (if ever needed)

```sql
DROP TABLE public.parent_activity_attempts CASCADE;
DROP TABLE public.parent_activity_status CASCADE;
DROP TABLE public.parent_assigned_activities CASCADE;
```

---

## Hebrew copy (approved)

| Context | Text |
|---------|------|
| Dashboard button | שלח פעילות |
| Modal title | שליחת פעילות ל{child_name} |
| Title required | יש להזין כותרת לפעילות |
| Preview required | נא לייצר שאלות תחילה |
| Success | הפעילות נשלחה בהצלחה! |
| Unlinked child | לא ניתן לשלוח פעילות לילד זה |

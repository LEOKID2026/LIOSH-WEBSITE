# Migration 027 — Manual Apply Instructions

**File:** `supabase/migrations/027_school_managed_portal.sql`  
**Depends on:** migrations 001–026 applied (especially `025_teacher_quotas_admin.sql`)

**Revision note (pre-apply):** Subject allowlist, partial unique indexes on `school_teacher_subjects`, composite FK to `school_teacher_memberships`, and audit CHECK comments were updated before owner execution. Do not apply an older draft of this file.

## Apply in Supabase

1. Open Supabase Dashboard → SQL Editor (or connect via `psql` to the project).
2. Paste the full contents of `027_school_managed_portal.sql` (current revision).
3. Run once. Confirm `COMMIT` succeeds with no errors.

### If a draft 027 failed partway

If `school_teacher_subjects` was created with the old `UNIQUE (school_id, teacher_id, subject, grade_level)` constraint, either:

- Drop the table and re-run the full migration (only if empty), or
- Run the migration as written — it includes `DROP CONSTRAINT IF EXISTS school_teacher_subjects_school_id_teacher_id_subject_grade_level_key` before creating partial indexes.

## SQL summary

| Change | Description |
|--------|-------------|
| `school_accounts` | Adds `contact_email`, `city`, `max_teachers` |
| `school_teacher_memberships` | Adds `subjects_locked` |
| `school_teacher_subjects` | New table; subject allowlist; partial UNIQUE indexes; FK `(school_id, teacher_id)` → `school_teacher_memberships` |
| `school_student_enrollments` | New table — school manager student visibility; nullable `enrolled_by` |
| `teacher_classes` | Adds nullable `school_id` + backfill from `teacher_profiles.school_id` |
| `classroom_activities` | Adds nullable `school_id` + backfill |
| `student_activities` | Adds nullable `school_id` + backfill |
| `admin_audit_log` | `target_type` CHECK: `teacher` (existing) + `school` (new) |
| `teacher_access_audit` | `action` CHECK: full 024 list + school manager actions |

## `granted_by` / `enrolled_by` and owner admin

| Column | Table | Design |
|--------|-------|--------|
| `granted_by` | `school_teacher_subjects` | NOT NULL → `teacher_profiles(id)`. Written by **school manager** APIs (`role = school_admin`). Owner admin never inserts this row; admin school actions go to `admin_audit_log`. |
| `enrolled_by` | `school_student_enrollments` | NULLable → `teacher_profiles(id)`. Written by **school manager** enroll API. Owner admin does not enroll via this table. |

School managers are always teachers with a `teacher_profiles` row, so these FKs are safe for the school portal. Owner admin without a teacher profile is unaffected.

## Verification queries (run after apply)

```sql
-- Subject allowlist constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.school_teacher_subjects'::regclass
  AND contype = 'c';

-- Partial unique indexes (expect 2)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'school_teacher_subjects'
  AND indexname LIKE '%_uq';

-- Membership composite FK
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.school_teacher_subjects'::regclass
  AND conname = 'school_teacher_subjects_membership_fk';

-- Cannot grant subject without membership (should fail)
-- INSERT INTO school_teacher_subjects (school_id, teacher_id, subject, granted_by)
-- VALUES ('<school>', '<teacher-not-in-school>', 'math', '<any-teacher-profile>');

-- Backfill sanity
SELECT COUNT(*) AS classes_with_school FROM teacher_classes WHERE school_id IS NOT NULL;
SELECT COUNT(*) AS profiles_with_school FROM teacher_profiles WHERE school_id IS NOT NULL;

-- New tables empty (expected on fresh apply)
SELECT COUNT(*) FROM school_teacher_subjects;
SELECT COUNT(*) FROM school_student_enrollments;

-- admin_audit_log: only teacher + school allowed (no orphan rows)
SELECT COUNT(*) FROM admin_audit_log WHERE target_type NOT IN ('teacher', 'school');

-- teacher_access_audit: no rows with disallowed action (should be 0)
-- (Run only if you have a list of actions in use; spot-check recent rows)
SELECT DISTINCT action FROM teacher_access_audit ORDER BY 1;
```

## Rollback (manual, if needed)

Reverse in dependency order: drop new tables, drop new columns, restore old CHECK constraints from migrations 024–025 backups. **Not automated** — owner must script rollback manually if required.

## After confirmation

Tell the implementing agent: **"SQL applied"** so application code can be tested against the live schema.

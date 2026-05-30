# SQL Review Package — Migration 048 (School Staff Code/PIN Login)

**Prepared by:** Cursor (implementation)  
**Date:** 2026-05-30  
**Cursor did NOT execute any SQL, commit, push, or deploy.**

## Purpose

Add school staff code/PIN credential storage, staff session rows, dedicated audit log, and teacher/operator sequence columns — foundation for `/school/staff/login` and manager provisioning without exposing internal `auth.users` emails.

## File path

`supabase/migrations/048_school_staff_code_pin_login.sql`

## Pre-flight checks (run on target DB **before** applying 048)

```sql
-- 1. Required helper from migration 001 (must NOT be null)
SELECT to_regprocedure('public.set_updated_at()');
-- Expected: one row (function exists). If NULL, apply 001 first or run:
--   SELECT prosrc FROM pg_proc WHERE proname = 'set_updated_at';

-- 2. Parent tables must exist
SELECT to_regclass('public.school_accounts');
SELECT to_regclass('public.school_credential_sequences');
-- Expected: both non-null

-- 3. Baseline row counts (informational)
SELECT count(*) AS school_accounts FROM public.school_accounts;
SELECT count(*) AS credential_sequences FROM public.school_credential_sequences;

-- 4. Confirm 047 applied (prior migration in chain)
SELECT to_regclass('public.parent_copilot_usage_log');
-- Expected: non-null if 047 was applied
```

### `set_updated_at()` dependency

Migration 048 creates trigger `trg_school_staff_access_codes_set_updated_at` calling `public.set_updated_at()`.

That function is **defined in** `supabase/migrations/001_learning_core_foundation.sql` and reused by migrations 019, 024, 040, 041, 044, etc. **No duplicate function block is added to 048** — if the preflight query returns `NULL`, do **not** run 048 until 001 (or equivalent) is applied.

## Forward SQL summary

| Object | Action |
|--------|--------|
| `public.school_staff_access_codes` | **CREATE** — staff code + PIN hash, lockout columns, `must_change_pin DEFAULT true` |
| `public.school_staff_sessions` | **CREATE** — hashed session tokens linked to access row |
| `public.school_staff_audit_log` | **CREATE** — dedicated staff credential audit |
| `public.school_credential_sequences` | **ALTER** — add `next_teacher_seq`, `next_operator_seq` (default 1) |
| RLS | **ENABLE** on all three new tables; **no** `authenticated` policies (service-role + server guards only) |
| Trigger | `trg_school_staff_access_codes_set_updated_at` on `school_staff_access_codes` |

## Expected affected rows

| Table | Rows changed on apply |
|-------|----------------------:|
| `school_staff_access_codes` | 0 (new empty table) |
| `school_staff_sessions` | 0 |
| `school_staff_audit_log` | 0 |
| `school_credential_sequences` | one row per existing school (columns added with default 1; no data loss) |

Existing schools keep current parent/student sequences unchanged.

## Verification queries (run **after** 048)

```sql
-- Tables exist
SELECT to_regclass('public.school_staff_access_codes');
SELECT to_regclass('public.school_staff_sessions');
SELECT to_regclass('public.school_staff_audit_log');

-- must_change_pin default matches plan (true)
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'school_staff_access_codes'
  AND column_name = 'must_change_pin';
-- Expected: column_default = 'true'

-- Sequence columns on school_credential_sequences
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'school_credential_sequences'
  AND column_name IN ('next_teacher_seq', 'next_operator_seq');
-- Expected: 2 rows

-- RLS enabled, no authenticated policies (service-role path)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('school_staff_access_codes', 'school_staff_sessions', 'school_staff_audit_log');
-- Expected: 0 rows (RLS on, no policies for authenticated role)

SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('school_staff_access_codes', 'school_staff_sessions', 'school_staff_audit_log');
-- Expected: relrowsecurity = true for all three

-- Trigger present
SELECT tgname FROM pg_trigger
WHERE tgname = 'trg_school_staff_access_codes_set_updated_at';
```

## Rollback notes

048 is **additive**. Rollback (manual, owner-only):

1. Drop trigger `trg_school_staff_access_codes_set_updated_at`
2. `DROP TABLE IF EXISTS public.school_staff_sessions CASCADE;`
3. `DROP TABLE IF EXISTS public.school_staff_audit_log CASCADE;`
4. `DROP TABLE IF EXISTS public.school_staff_access_codes CASCADE;`
5. `ALTER TABLE public.school_credential_sequences DROP COLUMN IF EXISTS next_teacher_seq, DROP COLUMN IF EXISTS next_operator_seq;`

**Do not rollback** if production staff codes/sessions exist unless intentional credential wipe is approved.

## Data-loss risk assessment

| Risk | Level | Notes |
|------|-------|-------|
| Existing school/parent/student data | **None** | No ALTER on existing credential tables |
| `school_credential_sequences` | **Low** | ADD COLUMN only; defaults preserve existing seq values |
| Accidental re-run | **Low** | Uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` |
| RLS misconfiguration | **Medium (pre-mitigation)** | No authenticated policies by design; app must use service-role for staff tables |
| Orphan auth.users after failed provision | **Operational** | Handled in app code (`deleteUser` on Step B failure) — not SQL 048 |

## Application code dependency

Application code for staff login/provisioning is implemented but **requires 048 applied** before:

- `POST /api/school/staff/login`
- Staff provisioning POST `/api/school/teachers` / `/api/school/operators` (code/PIN path)
- Staff management routes (pin-reset, suspend, etc.)

Until 048 is applied, those APIs return `503 db_schema_not_ready` when tables are missing.

## Owner checklist before running 048

- [ ] Preflight `to_regprocedure('public.set_updated_at()')` returns non-null
- [ ] Migrations 001–047 already applied on target project
- [ ] `LEARNING_STUDENT_ACCESS_SECRET` set in app env (PIN hashing — not part of SQL)
- [ ] Review `must_change_pin DEFAULT true` (fixed in migration file)
- [ ] Run verification queries after apply

## Related artifacts

- Route audit: `docs/auth/SCHOOL_STAFF_ROUTE_AUDIT.md`
- Plan (do not edit): `.cursor/plans/school_staff_code_pin_login_plan.plan.md`

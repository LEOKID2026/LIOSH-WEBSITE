# SQL Review Package — Role Boundary Foundation Migrations

**Prepared by:** Cursor (implementation)  
**Date:** 2026-05-30 (updated: admin entitlement backfill + ZIP correction pass)  
**Cursor did NOT execute any SQL.**

## Migration Files (run in order)

| # | File | Purpose |
|---|------|---------|
| 040 | `supabase/migrations/040_account_persona_entitlements.sql` | Central entitlement table |
| 041 | `supabase/migrations/041_parent_account_settings.sql` | Parent plan/limits table |
| 042 | `supabase/migrations/042_backfill_entitlements_dev.sql` | Dev backfill entitlements + settings + **admin entitlements** |
| 043 | `supabase/migrations/043_school_accounts_separate_quotas.sql` | Separate school quota columns |
| 044 | `supabase/migrations/044_school_operator_grants.sql` | Operator permission flags |
| 045 | `supabase/migrations/045_school_operator_audit_log.sql` | Operator audit log |
| 046 | `supabase/migrations/046_school_teacher_memberships_school_operator_role.sql` | Add school_operator role |
| 047 | `supabase/migrations/047_parent_copilot_usage_log.sql` | Parent copilot monthly usage log (for monthly_ai_limit) |

## Pre-Migration Audit Queries

```sql
-- General inventory
SELECT count(*) AS parent_profiles FROM public.parent_profiles;
SELECT count(*) AS dual_role FROM public.parent_profiles pp
  JOIN public.teacher_profiles tp ON tp.id = pp.id;
SELECT count(*) AS teacher_profiles FROM public.teacher_profiles;
SELECT count(*) AS school_memberships FROM public.school_teacher_memberships;
SELECT count(*) AS schools FROM public.school_accounts;
SELECT count(DISTINCT parent_id) AS parents_with_students FROM public.students;

-- Admin accounts (must receive admin entitlement in 042 Step 7)
SELECT u.id, u.email, u.raw_app_meta_data->>'role' AS app_role
FROM auth.users u
WHERE lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'admin'
ORDER BY u.email;
```

## Admin Entitlement — Before Running 042

Admin APIs now require **both**:
1. `auth.users.raw_app_meta_data->>'role' = 'admin'` (existing check), **and**
2. An active row in `account_persona_entitlements` with `persona = 'admin'` and `status = 'active'`.

**042 Step 7** inserts admin entitlements automatically for every auth user whose `app_metadata.role` is `admin`. No manual UUID editing is required.

### Pre-042: confirm which accounts will receive admin entitlement

```sql
SELECT u.id, u.email, u.raw_app_meta_data->>'role' AS app_role
FROM auth.users u
WHERE lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'admin';
```

Expected: at least one row (your platform admin). If zero rows, admin APIs will remain unreachable until you set `app_metadata.role = 'admin'` on the intended account **or** run the fallback insert below.

### Fallback: single admin by email (only if Step 7 finds zero rows)

Run **after** 040 and **after** identifying the admin account, if the pre-042 query above returns no rows:

```sql
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT u.id, 'admin', 'active', 'seed', now()
FROM auth.users u
WHERE lower(u.email) = 'admin@admin.com'  -- replace with your admin email
ON CONFLICT (user_id, persona) DO NOTHING;
```

### Post-042: verify admin entitlement (required before using admin APIs)

```sql
SELECT u.id, u.email, ape.persona, ape.status, ape.approval_source, ape.approved_at
FROM auth.users u
JOIN public.account_persona_entitlements ape ON ape.user_id = u.id
WHERE lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'admin'
  AND ape.persona = 'admin'
ORDER BY u.email;
```

Expected: one row per admin auth user, `status = 'active'`.

### Confirmation: platform admin admin-API access after 042

After migrations 040, 041, and 042 complete successfully:

- `requireAdminApiContext` checks `app_metadata.role = 'admin'` **then** active `admin` entitlement.
- 042 Step 7 backfills `admin` entitlements for all users matching `app_metadata.role = 'admin'`.
- Therefore, any account that already has `app_metadata.role = 'admin'` **will retain admin API access** once 042 finishes, provided the pre-042 audit query shows that account.

If your platform admin uses a different email than `admin@admin.com`, Step 7 still applies as long as `app_metadata.role = 'admin'` is set on that user.

## Verification Queries (after each migration)

**After 040:**
```sql
SELECT count(*) FROM public.account_persona_entitlements;
```

**After 041:**
```sql
SELECT count(*) FROM public.parent_account_settings;
```

**After 042:**
```sql
SELECT persona, status, count(*) FROM public.account_persona_entitlements GROUP BY 1, 2 ORDER BY 1;
SELECT count(*) FROM public.parent_account_settings;
SELECT pas.max_children, u.email FROM public.parent_account_settings pas
  JOIN auth.users u ON u.id = pas.parent_user_id WHERE lower(u.email) = 'admin@admin.com';

-- Admin entitlement verification (see Admin Entitlement section above)
SELECT u.id, u.email, ape.persona, ape.status
FROM auth.users u
JOIN public.account_persona_entitlements ape ON ape.user_id = u.id
WHERE ape.persona = 'admin';
```

**After 043:**
```sql
SELECT id, name, max_teachers, max_school_teachers, max_school_managers,
       max_school_students, max_school_operators FROM public.school_accounts;
```

**After 044-047:**
```sql
SELECT count(*) FROM public.school_operator_grants;
SELECT count(*) FROM public.school_operator_audit_log;
SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid = 'public.school_teacher_memberships'::regclass
    AND conname = 'school_teacher_memberships_role_check';
SELECT count(*) FROM public.parent_copilot_usage_log;
```

## Data-Loss Risk

- **040-041, 044-045, 046-047:** No data loss — new tables/constraints only.
- **042:** Inserts only; rollback deletes migration-sourced rows.
- **043:** Adds columns with defaults; backfill UPDATE is non-destructive. Legacy `max_teachers` retained.

## Rollback Notes

See header comments in each migration file for targeted rollback SQL.

042 rollback also removes admin entitlements inserted by migration:

```sql
DELETE FROM public.account_persona_entitlements WHERE approval_source = 'migration';
DELETE FROM public.parent_account_settings WHERE plan_code = 'free' AND max_children IN (3, 50);
```

## Expected Affected Rows (dev environment — approximate)

Depends on existing data. Run pre-migration audit queries to estimate:
- 042 parent entitlements ≈ parent_profiles minus dual-role count
- 042 private_teacher ≈ teacher_profiles without school membership
- 042 school_teacher/school_manager ≈ school_teacher_memberships by role
- 042 admin entitlements ≈ count of auth.users with `app_metadata.role = 'admin'`

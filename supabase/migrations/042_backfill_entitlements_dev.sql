-- 042_backfill_entitlements_dev.sql
-- Purpose: Backfill active entitlements and default parent_account_settings for dev environment.
-- Safety: INSERT only with ON CONFLICT DO NOTHING. Review audit queries before running.
-- Expected rows: depends on existing parent_profiles, teacher_profiles, school_teacher_memberships counts.
-- Apply: manual by owner only AFTER 040 and 041.
--
-- Pre-migration audit:
--   SELECT count(*) FROM public.parent_profiles;
--   SELECT count(*) FROM public.parent_profiles pp JOIN public.teacher_profiles tp ON tp.id = pp.id;
--   SELECT count(*) FROM public.teacher_profiles;
--   SELECT count(*) FROM public.school_teacher_memberships;
--
-- Verification:
--   SELECT persona, status, count(*) FROM public.account_persona_entitlements GROUP BY 1, 2;
--   SELECT count(*) FROM public.parent_account_settings;
--
-- Rollback:
--   DELETE FROM public.account_persona_entitlements WHERE approval_source = 'migration';
--   DELETE FROM public.parent_account_settings WHERE plan_code = 'free' AND max_children IN (3, 50);

BEGIN;

-- Step 1: Active parent entitlements for parent_profiles without teacher_profiles
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT pp.id, 'parent', 'active', 'migration', now()
FROM public.parent_profiles pp
LEFT JOIN public.teacher_profiles tp ON tp.id = pp.id
WHERE tp.id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 2: Active private_teacher entitlements for teachers without school membership
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT tp.id, 'private_teacher', 'active', 'migration', now()
FROM public.teacher_profiles tp
LEFT JOIN public.school_teacher_memberships stm ON stm.teacher_id = tp.id
WHERE stm.teacher_id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 3: Active school_teacher entitlements
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_teacher', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'teacher'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 4: Active school_manager entitlements
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_manager', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'school_admin'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 5: Default parent_account_settings for users with active parent entitlement
INSERT INTO public.parent_account_settings (parent_user_id, plan_code, max_children, reports_enabled, copilot_enabled)
SELECT ape.user_id, 'free', 3, true, false
FROM public.account_persona_entitlements ape
WHERE ape.persona = 'parent' AND ape.status = 'active'
ON CONFLICT (parent_user_id) DO NOTHING;

-- Step 6: QA simulation parent elevated limit (admin@admin.com)
UPDATE public.parent_account_settings pas
SET max_children = 50, updated_at = now()
FROM auth.users u
WHERE pas.parent_user_id = u.id
  AND lower(u.email) = 'admin@admin.com';

-- Step 7: Active admin entitlements for auth users with app_metadata.role = 'admin'
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT u.id, 'admin', 'active', 'migration', now()
FROM auth.users u
WHERE lower(coalesce(u.raw_app_meta_data->>'role', '')) = 'admin'
ON CONFLICT (user_id, persona) DO NOTHING;

COMMIT;

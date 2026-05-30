-- 046_school_teacher_memberships_school_operator_role.sql
-- Purpose: Extend school_teacher_memberships role check to include school_operator (Option A).
-- Safety: Drops and recreates role check constraint only.
-- Apply: manual by owner only AFTER 040-045.
--
-- Verification:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.school_teacher_memberships'::regclass AND contype = 'c';
-- Rollback:
--   ALTER TABLE public.school_teacher_memberships DROP CONSTRAINT IF EXISTS school_teacher_memberships_role_check;
--   ALTER TABLE public.school_teacher_memberships ADD CONSTRAINT school_teacher_memberships_role_check
--     CHECK (role IN ('teacher', 'school_admin'));

BEGIN;

ALTER TABLE public.school_teacher_memberships
  DROP CONSTRAINT IF EXISTS school_teacher_memberships_role_check;

ALTER TABLE public.school_teacher_memberships
  ADD CONSTRAINT school_teacher_memberships_role_check
  CHECK (role IN ('teacher', 'school_admin', 'school_operator'));

COMMIT;

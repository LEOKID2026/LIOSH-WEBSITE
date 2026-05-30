-- 043_school_accounts_separate_quotas.sql
-- Purpose: Add separate school quota columns; backfill max_school_teachers from legacy max_teachers.
-- Safety: ADD COLUMN only + UPDATE backfill. Legacy max_teachers retained for backward compatibility.
-- Defaults: max_school_teachers=20, max_school_managers=1, max_school_students=500, max_school_operators=5
-- Apply: manual by owner only.
--
-- Verification:
--   SELECT id, max_teachers, max_school_teachers, max_school_managers, max_school_students, max_school_operators
--   FROM public.school_accounts LIMIT 20;
-- Rollback:
--   ALTER TABLE public.school_accounts
--     DROP COLUMN IF EXISTS max_school_teachers,
--     DROP COLUMN IF EXISTS max_school_managers,
--     DROP COLUMN IF EXISTS max_school_students,
--     DROP COLUMN IF EXISTS max_school_operators;

BEGIN;

ALTER TABLE public.school_accounts
  ADD COLUMN IF NOT EXISTS max_school_teachers  integer NOT NULL DEFAULT 20 CHECK (max_school_teachers >= 0),
  ADD COLUMN IF NOT EXISTS max_school_managers  integer NOT NULL DEFAULT 1 CHECK (max_school_managers >= 0),
  ADD COLUMN IF NOT EXISTS max_school_students  integer NOT NULL DEFAULT 500 CHECK (max_school_students >= 0),
  ADD COLUMN IF NOT EXISTS max_school_operators integer NOT NULL DEFAULT 5 CHECK (max_school_operators >= 0);

UPDATE public.school_accounts
SET max_school_teachers = COALESCE(max_teachers, 20)
WHERE max_school_teachers = 20 AND max_teachers IS NOT NULL;

COMMIT;

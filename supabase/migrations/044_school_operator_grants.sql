-- 044_school_operator_grants.sql
-- Purpose: Current-state modular permission flags for school operators.
-- Safety: New table only.
-- Apply: manual by owner only.
--
-- Verification:
--   SELECT count(*) FROM public.school_operator_grants;
-- Rollback:
--   DROP TABLE IF EXISTS public.school_operator_grants CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_operator_grants (
  school_id             uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  operator_user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_access_admin  boolean     NOT NULL DEFAULT false,
  student_data_viewer   boolean     NOT NULL DEFAULT false,
  updated_by            uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, operator_user_id)
);

CREATE INDEX IF NOT EXISTS sog_operator_idx
  ON public.school_operator_grants (operator_user_id);

ALTER TABLE public.school_operator_grants ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_school_operator_grants_set_updated_at
  ON public.school_operator_grants;

CREATE TRIGGER trg_school_operator_grants_set_updated_at
BEFORE UPDATE ON public.school_operator_grants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;

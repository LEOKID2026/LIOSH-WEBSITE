-- 045_school_operator_audit_log.sql
-- Purpose: Immutable append-only audit log for operator grants and operational actions.
-- Safety: New table only.
-- Apply: manual by owner only.
--
-- Verification:
--   SELECT count(*) FROM public.school_operator_audit_log;
-- Rollback:
--   DROP TABLE IF EXISTS public.school_operator_audit_log CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_operator_audit_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  actor_user_id     uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id    uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_student_id uuid        NULL,
  action_type       text        NOT NULL CHECK (action_type IN (
                                  'grant_student_access_admin',
                                  'revoke_student_access_admin',
                                  'grant_student_data_viewer',
                                  'revoke_student_data_viewer',
                                  'credential_create',
                                  'credential_reset',
                                  'credential_revoke',
                                  'guardian_credential_create',
                                  'guardian_credential_reset',
                                  'guardian_credential_revoke',
                                  'student_enroll',
                                  'student_update',
                                  'report_view'
                                )),
  metadata          jsonb       NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soal_school_idx
  ON public.school_operator_audit_log (school_id);

CREATE INDEX IF NOT EXISTS soal_actor_idx
  ON public.school_operator_audit_log (actor_user_id);

CREATE INDEX IF NOT EXISTS soal_action_idx
  ON public.school_operator_audit_log (action_type);

ALTER TABLE public.school_operator_audit_log ENABLE ROW LEVEL SECURITY;

COMMIT;

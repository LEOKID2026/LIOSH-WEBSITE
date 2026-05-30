-- Phase 6: structured phone + password-setup email tracking on registration requests.
-- Rollback:
--   ALTER TABLE public.teacher_registration_requests
--     DROP COLUMN IF EXISTS phone,
--     DROP COLUMN IF EXISTS request_intent,
--     DROP COLUMN IF EXISTS password_setup_sent_at,
--     DROP COLUMN IF EXISTS password_setup_last_error;
--   ALTER TABLE public.school_registration_requests
--     DROP COLUMN IF EXISTS contact_phone,
--     DROP COLUMN IF EXISTS password_setup_sent_at,
--     DROP COLUMN IF EXISTS password_setup_last_error;

ALTER TABLE public.teacher_registration_requests
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS request_intent text,
  ADD COLUMN IF NOT EXISTS password_setup_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_setup_last_error text;

ALTER TABLE public.school_registration_requests
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS password_setup_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_setup_last_error text;

CREATE INDEX IF NOT EXISTS trr_password_setup_sent_idx
  ON public.teacher_registration_requests (password_setup_sent_at);

CREATE INDEX IF NOT EXISTS srr_password_setup_sent_idx
  ON public.school_registration_requests (password_setup_sent_at);

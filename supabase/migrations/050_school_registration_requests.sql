-- Purpose: Store metadata submitted with school registration requests.
-- Safety: New table only. No existing data modified.
-- Rollback: DROP TABLE IF EXISTS public.school_registration_requests CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_registration_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           uuid        NULL REFERENCES public.school_accounts(id) ON DELETE SET NULL,
  contact_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name        text        NOT NULL,
  contact_email       text        NOT NULL,
  approx_teachers     integer     NULL,
  approx_students     integer     NULL,
  message             text        NULL CHECK (message IS NULL OR char_length(message) <= 1000),
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS srr_status_idx ON public.school_registration_requests (status);
CREATE INDEX IF NOT EXISTS srr_school_id_idx ON public.school_registration_requests (school_id);

ALTER TABLE public.school_registration_requests ENABLE ROW LEVEL SECURITY;

COMMIT;

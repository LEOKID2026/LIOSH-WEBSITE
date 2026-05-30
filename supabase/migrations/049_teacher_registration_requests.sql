-- Purpose: Store metadata submitted with private teacher registration requests.
-- Safety: New table only. No existing data modified.
-- Rollback: DROP TABLE IF EXISTS public.teacher_registration_requests CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.teacher_registration_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_subjects  text[]      NULL,
  description         text        NULL CHECK (description IS NULL OR char_length(description) <= 1000),
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS trr_user_id_idx ON public.teacher_registration_requests (user_id);
CREATE INDEX IF NOT EXISTS trr_status_idx  ON public.teacher_registration_requests (status);

ALTER TABLE public.teacher_registration_requests ENABLE ROW LEVEL SECURITY;

COMMIT;

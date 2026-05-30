-- 048_school_staff_code_pin_login.sql
-- School staff code/PIN credentials, sessions, audit log, credential sequences.
-- Apply: manual by owner only.
--
-- Preflight (run before apply):
--   SELECT to_regprocedure('public.set_updated_at()');
-- Must return non-null (defined in 001_learning_core_foundation.sql).

BEGIN;

-- ============================================================
-- school_staff_access_codes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_staff_access_codes (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_role              text        NOT NULL CHECK (staff_role IN ('school_teacher', 'school_operator')),
  code_display            text        NOT NULL CHECK (char_length(code_display) BETWEEN 6 AND 24),
  code_display_normalized text        NOT NULL CHECK (code_display_normalized = lower(btrim(code_display))),
  pin_hash                text        NOT NULL CHECK (char_length(pin_hash) BETWEEN 16 AND 200),
  is_active               boolean     NOT NULL DEFAULT true,
  must_change_pin         boolean     NOT NULL DEFAULT true,
  failed_attempts         integer     NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until            timestamptz NULL,
  last_login_at           timestamptz NULL,
  revoked_at              timestamptz NULL,
  revoked_by              uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_staff_access_codes_active_code_uq
  ON public.school_staff_access_codes (school_id, code_display_normalized)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_staff_access_codes_active_user_uq
  ON public.school_staff_access_codes (school_id, user_id)
  WHERE revoked_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS school_staff_access_codes_user_idx
  ON public.school_staff_access_codes (user_id);

CREATE INDEX IF NOT EXISTS school_staff_access_codes_school_idx
  ON public.school_staff_access_codes (school_id)
  WHERE is_active = true AND revoked_at IS NULL;

ALTER TABLE public.school_staff_access_codes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_school_staff_access_codes_set_updated_at
  ON public.school_staff_access_codes;

CREATE TRIGGER trg_school_staff_access_codes_set_updated_at
BEFORE UPDATE ON public.school_staff_access_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- school_staff_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_staff_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_access_id     uuid        NOT NULL REFERENCES public.school_staff_access_codes(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id           uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  staff_role          text        NOT NULL CHECK (staff_role IN ('school_teacher', 'school_operator')),
  session_token_hash  text        NOT NULL CHECK (char_length(session_token_hash) BETWEEN 16 AND 200),
  user_agent          text        NULL CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  ip_hash             text        NULL CHECK (ip_hash IS NULL OR char_length(ip_hash) BETWEEN 16 AND 200),
  created_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  last_seen_at        timestamptz NULL,
  revoked_at          timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS school_staff_sessions_token_active_uq
  ON public.school_staff_sessions (session_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS school_staff_sessions_access_idx
  ON public.school_staff_sessions (staff_access_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS school_staff_sessions_user_idx
  ON public.school_staff_sessions (user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS school_staff_sessions_expires_idx
  ON public.school_staff_sessions (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.school_staff_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- school_staff_audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_staff_audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  actor_user_id   uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id  uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text        NOT NULL CHECK (char_length(action) BETWEEN 3 AND 64),
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ip_hash         text        NULL CHECK (ip_hash IS NULL OR char_length(ip_hash) BETWEEN 16 AND 200),
  user_agent      text        NULL CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_staff_audit_log_school_idx
  ON public.school_staff_audit_log (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS school_staff_audit_log_target_idx
  ON public.school_staff_audit_log (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS school_staff_audit_log_action_idx
  ON public.school_staff_audit_log (action, created_at DESC);

ALTER TABLE public.school_staff_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Extend school_credential_sequences
-- ============================================================

ALTER TABLE public.school_credential_sequences
  ADD COLUMN IF NOT EXISTS next_teacher_seq  integer NOT NULL DEFAULT 1 CHECK (next_teacher_seq >= 1),
  ADD COLUMN IF NOT EXISTS next_operator_seq integer NOT NULL DEFAULT 1 CHECK (next_operator_seq >= 1);

COMMIT;

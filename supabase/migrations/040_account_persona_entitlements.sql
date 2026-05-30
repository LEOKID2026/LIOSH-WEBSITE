-- 040_account_persona_entitlements.sql
-- Purpose: Central persona/entitlement authorization source of truth.
-- Safety: New table only. No existing data modified.
-- Apply: manual by owner only. DO NOT run via CI or automated tooling.
--
-- Verification:
--   SELECT count(*) FROM public.account_persona_entitlements;
-- Rollback:
--   DROP TABLE IF EXISTS public.account_persona_entitlements CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.account_persona_entitlements (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona           text        NOT NULL CHECK (persona IN (
                                  'parent', 'private_teacher', 'school_teacher',
                                  'school_manager', 'school_operator', 'admin'
                                )),
  status            text        NOT NULL DEFAULT 'pending' CHECK (status IN (
                                  'pending', 'active', 'suspended', 'rejected', 'revoked'
                                )),
  approval_source   text        NOT NULL CHECK (approval_source IN (
                                  'self_signup', 'admin', 'school_admin',
                                  'payment', 'migration', 'seed'
                                )),
  approved_by       uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       timestamptz NULL,
  rejected_by       uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at       timestamptz NULL,
  suspended_by      uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at      timestamptz NULL,
  revoked_by        uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at        timestamptz NULL,
  reason            text        NULL CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, persona)
);

CREATE INDEX IF NOT EXISTS ape_user_id_idx
  ON public.account_persona_entitlements (user_id);

CREATE INDEX IF NOT EXISTS ape_persona_status_idx
  ON public.account_persona_entitlements (persona, status);

ALTER TABLE public.account_persona_entitlements ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_account_persona_entitlements_set_updated_at
  ON public.account_persona_entitlements;

CREATE TRIGGER trg_account_persona_entitlements_set_updated_at
BEFORE UPDATE ON public.account_persona_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;

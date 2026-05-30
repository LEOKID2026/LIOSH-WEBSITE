-- 047_parent_copilot_usage_log.sql
-- Purpose: Monthly parent copilot usage counter for monthly_ai_limit enforcement.
-- Safety: New table only. No data loss risk on existing tables.
-- Apply: manual by owner only (after 041_parent_account_settings.sql).
--
-- Verification:
--   SELECT count(*) FROM public.parent_copilot_usage_log;
-- Rollback:
--   DROP TABLE IF EXISTS public.parent_copilot_usage_log CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_copilot_usage_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_copilot_usage_log_parent_month
  ON public.parent_copilot_usage_log (parent_user_id, created_at DESC);

ALTER TABLE public.parent_copilot_usage_log ENABLE ROW LEVEL SECURITY;

COMMIT;

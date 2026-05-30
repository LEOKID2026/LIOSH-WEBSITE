-- 041_parent_account_settings.sql
-- Purpose: Parent plan, limits, and subscription-ready settings.
-- Safety: New table only. Defaults: plan_code=free, max_children=3, reports_enabled=true, copilot_enabled=false.
-- Apply: manual by owner only.
--
-- Verification:
--   SELECT count(*) FROM public.parent_account_settings;
-- Rollback:
--   DROP TABLE IF EXISTS public.parent_account_settings CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_account_settings (
  parent_user_id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code                    text        NOT NULL DEFAULT 'free' CHECK (plan_code IN (
                                             'free', 'trial', 'basic', 'family', 'premium', 'school_linked'
                                           )),
  account_status               text        NOT NULL DEFAULT 'active' CHECK (account_status IN (
                                             'active', 'trial', 'suspended', 'cancelled'
                                           )),
  subscription_status          text        NULL CHECK (subscription_status IS NULL OR subscription_status IN (
                                             'active', 'trial', 'past_due', 'cancelled'
                                           )),
  max_children                 integer     NOT NULL DEFAULT 3 CHECK (max_children >= 0),
  reports_enabled              boolean     NOT NULL DEFAULT true,
  copilot_enabled              boolean     NOT NULL DEFAULT false,
  advanced_diagnostics_enabled boolean     NOT NULL DEFAULT false,
  export_enabled               boolean     NOT NULL DEFAULT false,
  monthly_ai_limit             integer     NULL CHECK (monthly_ai_limit IS NULL OR monthly_ai_limit >= 0),
  monthly_report_limit         integer     NULL CHECK (monthly_report_limit IS NULL OR monthly_report_limit >= 0),
  billing_provider             text        NULL,
  provider_customer_id         text        NULL,
  provider_subscription_id     text        NULL,
  trial_ends_at                timestamptz NULL,
  current_period_ends_at       timestamptz NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_account_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_parent_account_settings_set_updated_at
  ON public.parent_account_settings;

CREATE TRIGGER trg_parent_account_settings_set_updated_at
BEFORE UPDATE ON public.parent_account_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;

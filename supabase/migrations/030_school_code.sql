-- 030_school_code.sql
-- Add school_code (3-4 lowercase letters) to school_accounts.
-- Owner applies manually in Supabase SQL editor. Agent does not execute.

BEGIN;

ALTER TABLE public.school_accounts
  ADD COLUMN IF NOT EXISTS school_code text
    CHECK (
      school_code IS NULL
      OR (char_length(school_code) BETWEEN 3 AND 4
          AND school_code ~ '^[a-z]{3,4}$')
    );

CREATE UNIQUE INDEX IF NOT EXISTS school_accounts_school_code_uq
  ON public.school_accounts (school_code)
  WHERE school_code IS NOT NULL;

COMMENT ON COLUMN public.school_accounts.school_code IS
  'Stable 3-4 letter lowercase school code for username namespacing ({code}-p{seq}, {code}-s{seq}). Assigned once at school creation. Do not change after accounts exist.';

COMMIT;

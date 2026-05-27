-- 031_school_account_management.sql
-- School-issued credentials + mandatory first-login PIN change for parents.
-- Owner applies manually in Supabase SQL editor. Agent does not execute.

BEGIN;

ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS created_by_school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_guardian_access_school_idx
  ON public.student_guardian_access (created_by_school_id)
  WHERE created_by_school_id IS NOT NULL;

ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS must_change_pin boolean NOT NULL DEFAULT false;

ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS guardian_relation text NULL
    CHECK (
      guardian_relation IS NULL
      OR guardian_relation IN ('mother', 'father', 'guardian', 'other')
    );

ALTER TABLE public.student_guardian_access
  ADD COLUMN IF NOT EXISTS guardian_display_label text NULL
    CHECK (
      guardian_display_label IS NULL
      OR char_length(trim(guardian_display_label)) BETWEEN 1 AND 80
    );

COMMENT ON COLUMN public.student_guardian_access.must_change_pin IS
  'When true, parent must change PIN on first login. Set by school account management create/reset APIs.';

ALTER TABLE public.student_access_codes
  ADD COLUMN IF NOT EXISTS created_by_school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_access_codes_school_idx
  ON public.student_access_codes (created_by_school_id)
  WHERE created_by_school_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.school_credential_sequences (
  school_id   uuid PRIMARY KEY
                REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  next_parent_seq integer NOT NULL DEFAULT 1
    CHECK (next_parent_seq >= 1),
  next_student_seq integer NOT NULL DEFAULT 1
    CHECK (next_student_seq >= 1),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.school_credential_sequences IS
  'Monotonic sequence counters for school-issued credentials. Updated atomically via service role only.';

ALTER TABLE public.school_credential_sequences ENABLE ROW LEVEL SECURITY;

COMMIT;

-- 053_school_student_admin_profiles.sql
-- Purpose: Optional administrative profile per school student (parent contact, medical, etc.).
-- Safety: New table only.
-- Apply: manual by owner only — do NOT run from Cursor.
--
-- Verification:
--   SELECT count(*) FROM public.school_student_profiles;
-- Rollback:
--   DROP TABLE IF EXISTS public.school_student_profiles CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_student_profiles (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                 uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  student_id                uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- Parent / Guardian
  -- Note: parent1_national_id and parent2_national_id are withheld from teacher-portal API responses (server-side)
  parent1_name              text        CHECK (parent1_name IS NULL OR char_length(trim(parent1_name)) BETWEEN 1 AND 200),
  parent1_phone             text        CHECK (parent1_phone IS NULL OR char_length(trim(parent1_phone)) BETWEEN 1 AND 50),
  parent1_national_id       text        CHECK (parent1_national_id IS NULL OR char_length(trim(parent1_national_id)) BETWEEN 1 AND 30),
  parent2_name              text        CHECK (parent2_name IS NULL OR char_length(trim(parent2_name)) BETWEEN 1 AND 200),
  parent2_phone             text        CHECK (parent2_phone IS NULL OR char_length(trim(parent2_phone)) BETWEEN 1 AND 50),
  parent2_national_id       text        CHECK (parent2_national_id IS NULL OR char_length(trim(parent2_national_id)) BETWEEN 1 AND 30),
  parent_email              text        CHECK (
                                          parent_email IS NULL
                                          OR (char_length(trim(parent_email)) BETWEEN 5 AND 320
                                              AND parent_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                        ),

  -- Address
  address                   text        CHECK (address IS NULL OR char_length(trim(address)) BETWEEN 1 AND 500),

  -- Emergency contact
  emergency_contact_name    text        CHECK (emergency_contact_name IS NULL OR char_length(trim(emergency_contact_name)) BETWEEN 1 AND 200),
  emergency_contact_phone   text        CHECK (emergency_contact_phone IS NULL OR char_length(trim(emergency_contact_phone)) BETWEEN 1 AND 50),

  -- Administrative / logistic (visible to all authorized roles including teachers)
  transportation_notes      text        CHECK (transportation_notes IS NULL OR char_length(trim(transportation_notes)) <= 1000),
  internal_notes            text        CHECK (internal_notes IS NULL OR char_length(trim(internal_notes)) <= 2000),

  -- Date, age, and medical data (visible to all authorized roles including teachers)
  date_of_birth             date,
  -- child_age_years is a fallback for when only an approximate age is known without a full birth date.
  child_age_years           smallint    CHECK (child_age_years IS NULL OR (child_age_years >= 0 AND child_age_years <= 30)),
  medical_allergy_notes     text        CHECK (medical_allergy_notes IS NULL OR char_length(trim(medical_allergy_notes)) <= 2000),

  -- Audit
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  updated_by                uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS school_student_profiles_school_student_uidx
  ON public.school_student_profiles (school_id, student_id);

CREATE INDEX IF NOT EXISTS school_student_profiles_student_idx
  ON public.school_student_profiles (student_id);

ALTER TABLE public.school_student_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

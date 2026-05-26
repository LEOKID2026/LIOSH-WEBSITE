-- 027_school_managed_portal.sql
-- School Managed Portal — schema additions
-- Requires: 025_teacher_quotas_admin (school_accounts, school_teacher_memberships)
-- Apply: manual by owner only. DO NOT run via CI or automated tooling.

BEGIN;

-- Supported subject keys (must match lib/learning-supabase/learning-activity.js LEARNING_SUBJECT_ALLOWLIST)
-- math, geometry, hebrew, english, science, moledet_geography

-- ============================================================
-- SECTION 1: Extend school_accounts
-- ============================================================

ALTER TABLE public.school_accounts
  ADD COLUMN IF NOT EXISTS contact_email text
    CHECK (contact_email IS NULL OR contact_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  ADD COLUMN IF NOT EXISTS city text
    CHECK (city IS NULL OR char_length(trim(city)) BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS max_teachers integer
    CHECK (max_teachers IS NULL OR max_teachers >= 1);

-- ============================================================
-- SECTION 2: Extend school_teacher_memberships
-- ============================================================

ALTER TABLE public.school_teacher_memberships
  ADD COLUMN IF NOT EXISTS subjects_locked boolean NOT NULL DEFAULT false;

-- Composite (school_id, teacher_id) is UNIQUE in 025 — required for subject membership FK below.

-- ============================================================
-- SECTION 3: New table — school_teacher_subjects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_teacher_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL
    REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL
    REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  subject     text NOT NULL
    CHECK (subject IN (
      'math',
      'geometry',
      'hebrew',
      'english',
      'science',
      'moledet_geography'
    )),
  grade_level text
    CHECK (grade_level IS NULL OR char_length(trim(grade_level)) BETWEEN 1 AND 32),
  -- School managers (teachers with school_admin membership) grant subjects via API.
  -- Owner admin actions use admin_audit_log only — not this column.
  granted_by  uuid NOT NULL
    REFERENCES public.teacher_profiles(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Teacher must be a member of this school (025 UNIQUE on school_id + teacher_id).
ALTER TABLE public.school_teacher_subjects
  DROP CONSTRAINT IF EXISTS school_teacher_subjects_membership_fk;

ALTER TABLE public.school_teacher_subjects
  ADD CONSTRAINT school_teacher_subjects_membership_fk
    FOREIGN KEY (school_id, teacher_id)
    REFERENCES public.school_teacher_memberships (school_id, teacher_id)
    ON DELETE CASCADE;

-- Drop legacy table-level UNIQUE if a draft 027 was partially applied (NULL grade_level duplicates).
ALTER TABLE public.school_teacher_subjects
  DROP CONSTRAINT IF EXISTS school_teacher_subjects_school_id_teacher_id_subject_grade_level_key;

-- Partial unique indexes: PostgreSQL treats NULL grade_level as distinct in plain UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS school_teacher_subjects_all_grades_uq
  ON public.school_teacher_subjects (school_id, teacher_id, subject)
  WHERE grade_level IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_teacher_subjects_per_grade_uq
  ON public.school_teacher_subjects (school_id, teacher_id, subject, grade_level)
  WHERE grade_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS school_teacher_subjects_teacher_idx
  ON public.school_teacher_subjects (school_id, teacher_id);

ALTER TABLE public.school_teacher_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 4: New table — school_student_enrollments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_student_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL
    REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  -- School manager (teacher profile) who enrolled; NULL if unknown after profile delete.
  -- Owner admin does not insert here — admin uses admin_audit_log.
  enrolled_by  uuid
    REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  unenrolled_at timestamptz,
  notes        text
    CHECK (notes IS NULL OR char_length(trim(notes)) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS school_student_enrollments_active_uq
  ON public.school_student_enrollments (school_id, student_id)
  WHERE unenrolled_at IS NULL;

CREATE INDEX IF NOT EXISTS school_student_enrollments_school_idx
  ON public.school_student_enrollments (school_id)
  WHERE unenrolled_at IS NULL;

CREATE INDEX IF NOT EXISTS school_student_enrollments_student_idx
  ON public.school_student_enrollments (student_id)
  WHERE unenrolled_at IS NULL;

ALTER TABLE public.school_student_enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 5: Add school_id FK to teacher_classes
-- ============================================================

ALTER TABLE public.teacher_classes
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS teacher_classes_school_id_idx
  ON public.teacher_classes (school_id)
  WHERE school_id IS NOT NULL;

UPDATE public.teacher_classes tc
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE tc.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND tc.school_id IS NULL;

-- ============================================================
-- SECTION 6: Add school_id FK to classroom_activities
-- ============================================================

ALTER TABLE public.classroom_activities
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS classroom_activities_school_id_idx
  ON public.classroom_activities (school_id)
  WHERE school_id IS NOT NULL;

UPDATE public.classroom_activities ca
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE ca.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND ca.school_id IS NULL;

-- ============================================================
-- SECTION 7: Add school_id FK to student_activities
-- ============================================================

ALTER TABLE public.student_activities
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_activities_school_id_idx
  ON public.student_activities (school_id)
  WHERE school_id IS NOT NULL;

UPDATE public.student_activities sa
  SET school_id = tp.school_id
  FROM public.teacher_profiles tp
  WHERE sa.teacher_id = tp.id
    AND tp.school_id IS NOT NULL
    AND sa.school_id IS NULL;

-- ============================================================
-- SECTION 8: Extend admin_audit_log target_type for schools
-- ============================================================
-- 025 CHECK was only ('teacher'). No other target_type values exist in migrations.
-- This widens the allowlist: teacher (unchanged) + school (new).

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_target_type_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check
    CHECK (target_type IN ('teacher', 'school'));

-- ============================================================
-- SECTION 9: Extend teacher_access_audit action CHECK
-- ============================================================
-- Authoritative base: 024_classroom_activities.sql (all actions through activity_archived).
-- 027 adds school-manager actions only — does not remove any 024 value.

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_check,
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_chk;

ALTER TABLE public.teacher_access_audit
  ADD CONSTRAINT teacher_access_audit_action_chk CHECK (action IN (
    'grant_created',
    'grant_revoked',
    'grant_expired',
    'pin_rotated',
    'username_rotated',
    'magic_link_sent',
    'magic_link_consumed',
    'magic_link_expired',
    'guardian_login_success',
    'guardian_login_failed',
    'guardian_logout',
    'teacher_link_created',
    'teacher_link_archived',
    'teacher_onboarded',
    'class_created',
    'class_archived',
    'class_updated',
    'class_member_added',
    'class_member_removed',
    'viewed_student_report',
    'viewed_class_report',
    'link_created',
    'link_archived',
    'link_consent_failed',
    'link_limit_reached',
    'consent_issued',
    'consent_revoked',
    'magic_link_issued',
    'student_created_by_teacher',
    'student_name_updated',
    'activity_created',
    'activity_activated',
    'activity_paused',
    'activity_closed',
    'activity_archived',
    'school_subject_granted',
    'school_subject_revoked',
    'school_student_enrolled',
    'school_student_unenrolled',
    'school_class_viewed',
    'school_student_report_viewed'
  ));

COMMIT;

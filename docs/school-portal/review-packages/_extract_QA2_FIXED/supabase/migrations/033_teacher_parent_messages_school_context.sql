-- 033_teacher_parent_messages_school_context.sql
-- CORRECTED 2026-05-27: backfill uses (ARRAY_AGG(DISTINCT school_id))[1], NOT MIN(school_id) (uuid has no MIN).
-- Extend teacher_parent_messages with school_id for school-context filtering.
-- Owner applies manually in Supabase SQL editor. Agent does not execute.
--
-- Backfill rules (no teacher_profiles.school_id):
--   school_id is set only when teacher + student share exactly ONE active school
--   via school_teacher_memberships + school_student_enrollments (unenrolled_at IS NULL).
--   If zero or multiple schools match, school_id stays NULL.

BEGIN;

ALTER TABLE public.teacher_parent_messages
  ADD COLUMN IF NOT EXISTS school_id uuid
    REFERENCES public.school_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS teacher_parent_messages_school_student_idx
  ON public.teacher_parent_messages (school_id, student_id, created_at DESC)
  WHERE is_hidden = false AND school_id IS NOT NULL;

-- Unambiguous school match: one row per message in the join below.
WITH message_school_candidates AS (
  SELECT
    tpm.id AS message_id,
    stm.school_id
  FROM public.teacher_parent_messages tpm
  INNER JOIN public.school_teacher_memberships stm
    ON stm.teacher_id = tpm.teacher_id
  INNER JOIN public.school_student_enrollments sse
    ON sse.student_id = tpm.student_id
    AND sse.school_id = stm.school_id
    AND sse.unenrolled_at IS NULL
  WHERE tpm.school_id IS NULL
),
unambiguous_school AS (
  SELECT
    message_id,
    (ARRAY_AGG(DISTINCT school_id))[1] AS school_id
  FROM message_school_candidates
  GROUP BY message_id
  HAVING COUNT(DISTINCT school_id) = 1
)
UPDATE public.teacher_parent_messages tpm
SET school_id = us.school_id
FROM unambiguous_school us
WHERE tpm.id = us.message_id;

-- Owner precheck after apply (optional): rows still NULL or ambiguous matches
-- SELECT COUNT(*) FROM teacher_parent_messages WHERE school_id IS NULL;
-- SELECT tpm.id, COUNT(DISTINCT stm.school_id) AS schools
-- FROM teacher_parent_messages tpm
-- JOIN school_teacher_memberships stm ON stm.teacher_id = tpm.teacher_id
-- JOIN school_student_enrollments sse ON sse.student_id = tpm.student_id
--   AND sse.school_id = stm.school_id AND sse.unenrolled_at IS NULL
-- WHERE tpm.school_id IS NULL
-- GROUP BY tpm.id HAVING COUNT(DISTINCT stm.school_id) > 1;

COMMIT;

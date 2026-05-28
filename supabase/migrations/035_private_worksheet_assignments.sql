-- Owner applies this manually in Supabase. Cursor must NOT run this file.

BEGIN;

-- 1. Make class_id nullable (additive change; existing rows keep their class_id value)
ALTER TABLE public.worksheet_activities
  ALTER COLUMN class_id DROP NOT NULL;

-- 2. Add assignment_scope discriminator
ALTER TABLE public.worksheet_activities
  ADD COLUMN IF NOT EXISTS assignment_scope text NOT NULL DEFAULT 'class'
    CHECK (assignment_scope IN ('class', 'selected_students'));

-- 3. Add check constraints for scope consistency
ALTER TABLE public.worksheet_activities
  ADD CONSTRAINT worksheet_scope_class_requires_class_id
    CHECK (
      assignment_scope <> 'class' OR class_id IS NOT NULL
    );

ALTER TABLE public.worksheet_activities
  ADD CONSTRAINT worksheet_scope_selected_students_no_class_id
    CHECK (
      assignment_scope <> 'selected_students' OR class_id IS NULL
    );

-- 4. New assignment table for selected-student scope
CREATE TABLE public.worksheet_student_assignments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_activity_id uuid        NOT NULL
                                    REFERENCES public.worksheet_activities(id) ON DELETE CASCADE,
  student_id            uuid        NOT NULL
                                    REFERENCES public.students(id) ON DELETE CASCADE,
  assigned_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worksheet_activity_id, student_id)
);

CREATE INDEX worksheet_student_assignments_ws_idx
  ON public.worksheet_student_assignments (worksheet_activity_id);

CREATE INDEX worksheet_student_assignments_student_idx
  ON public.worksheet_student_assignments (student_id);

-- 5. Enable RLS on the new table (service-role API pattern; no broad client policies)
ALTER TABLE public.worksheet_student_assignments ENABLE ROW LEVEL SECURITY;

COMMIT;

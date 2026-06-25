-- Production hotfix: speed up parent child deletion.
-- Manual Supabase SQL Editor run.
-- Do not wrap in BEGIN/COMMIT.
-- Run this file as-is.

create index concurrently if not exists classroom_activity_attempts_student_id_idx
  on public.classroom_activity_attempts (student_id);

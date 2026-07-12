-- P0 report / analytics query indexes (production performance).
-- Owner run only — do NOT wrap in BEGIN/COMMIT when using CONCURRENTLY.
-- Safe to re-run: IF NOT EXISTS on all statements.

create index concurrently if not exists answers_student_id_answered_at_idx
  on public.answers (student_id, answered_at desc);

create index concurrently if not exists answers_answered_at_idx
  on public.answers (answered_at desc);

create index concurrently if not exists learning_sessions_student_id_started_at_idx
  on public.learning_sessions (student_id, started_at desc);

create index concurrently if not exists learning_sessions_started_at_idx
  on public.learning_sessions (started_at desc);

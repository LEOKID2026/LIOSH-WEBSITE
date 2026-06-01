-- Assigned activity question snapshot formalization.
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Adds snapshot_status / snapshot_frozen_at to activity tables,
-- question_key to attempt tables, and question_snapshot to worksheet_student_answers.

begin;

-- ---------------------------------------------------------------------------
-- 1. Activity tables — snapshot metadata
-- ---------------------------------------------------------------------------

alter table public.classroom_activities
  add column if not exists snapshot_status    text        not null default 'legacy_missing'
                                              check (snapshot_status in ('frozen', 'legacy_missing')),
  add column if not exists snapshot_frozen_at timestamptz null;

comment on column public.classroom_activities.snapshot_status is
  'frozen = question_set normalized and locked at create; legacy_missing = pre-migration or empty set.';

alter table public.student_activities
  add column if not exists snapshot_status    text        not null default 'legacy_missing'
                                              check (snapshot_status in ('frozen', 'legacy_missing')),
  add column if not exists snapshot_frozen_at timestamptz null;

comment on column public.student_activities.snapshot_status is
  'frozen = question_set normalized and locked at create; legacy_missing = pre-migration or empty set.';

alter table public.parent_assigned_activities
  add column if not exists snapshot_status    text        not null default 'legacy_missing'
                                              check (snapshot_status in ('frozen', 'legacy_missing')),
  add column if not exists snapshot_frozen_at timestamptz null;

comment on column public.parent_assigned_activities.snapshot_status is
  'frozen = question_set normalized and locked at create; legacy_missing = pre-migration or empty set.';

-- ---------------------------------------------------------------------------
-- 2. Attempt tables — stable question key reference
-- ---------------------------------------------------------------------------

alter table public.classroom_activity_attempts
  add column if not exists question_key text null;

comment on column public.classroom_activity_attempts.question_key is
  'Stable qk copied from question_set item at scoring time; null for legacy attempts.';

alter table public.student_activity_attempts
  add column if not exists question_key text null;

comment on column public.student_activity_attempts.question_key is
  'Stable qk copied from question_set item at scoring time; null for legacy attempts.';

alter table public.parent_activity_attempts
  add column if not exists question_key text null;

comment on column public.parent_activity_attempts.question_key is
  'Stable qk copied from question_set item at scoring time; null for legacy attempts.';

-- ---------------------------------------------------------------------------
-- 3. Worksheet answers — per-submit question snapshot
-- ---------------------------------------------------------------------------

alter table public.worksheet_student_answers
  add column if not exists question_snapshot jsonb not null default '{}'::jsonb;

comment on column public.worksheet_student_answers.question_snapshot is
  'Server-written copy of worksheet_questions row at submit time; mirrors classroom_activity_attempts.question_snapshot.';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

create index if not exists classroom_activities_snapshot_status_idx
  on public.classroom_activities (snapshot_status, created_at desc);

create index if not exists student_activities_snapshot_status_idx
  on public.student_activities (snapshot_status, created_at desc);

create index if not exists parent_assigned_activities_snapshot_status_idx
  on public.parent_assigned_activities (snapshot_status, created_at desc);

create index if not exists classroom_activity_attempts_question_key_idx
  on public.classroom_activity_attempts (question_key)
  where question_key is not null;

create index if not exists student_activity_attempts_question_key_idx
  on public.student_activity_attempts (question_key)
  where question_key is not null;

create index if not exists parent_activity_attempts_question_key_idx
  on public.parent_activity_attempts (question_key)
  where question_key is not null;

commit;

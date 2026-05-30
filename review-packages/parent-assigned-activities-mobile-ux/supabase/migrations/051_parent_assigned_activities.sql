-- Parent-assigned learning activities (parent portal → linked child).
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Requires 001_learning_core_foundation.sql applied first.
-- Mirrors student_activities pattern with parent_id instead of teacher_id.
-- Answers live in parent_activity_attempts only — never in public.answers.

begin;

-- ---------------------------------------------------------------------------
-- 1. parent_assigned_activities
-- ---------------------------------------------------------------------------

create table if not exists public.parent_assigned_activities (
  id                    uuid        primary key default gen_random_uuid(),
  parent_id             uuid        not null
                                    references public.parent_profiles (id) on delete cascade,
  student_id            uuid        not null
                                    references public.students (id) on delete cascade,
  title                 text        not null
                                    check (char_length(title) between 1 and 120),
  subject               text        not null
                                    check (char_length(subject) between 1 and 64),
  topic                 text        not null
                                    check (char_length(topic) between 1 and 120),
  subtopic              text        null
                                    check (subtopic is null or char_length(subtopic) <= 120),
  skill_key             text        null
                                    check (skill_key is null or char_length(skill_key) <= 120),
  difficulty_level      text        null
                                    check (
                                      difficulty_level is null
                                      or difficulty_level in ('easy', 'medium', 'hard', 'mixed')
                                    ),
  question_count        integer     not null
                                    check (question_count between 1 and 30),
  mode                  text        not null
                                    check (mode in ('guided_practice', 'homework')),
  question_set          jsonb       not null default '[]'::jsonb,
  due_at                timestamptz null,
  status                text        not null default 'active'
                                    check (status in ('active', 'closed', 'archived')),
  activated_at          timestamptz not null default now(),
  closed_at             timestamptz null,
  archived_at           timestamptz null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint parent_assigned_activities_id_student_uq unique (id, student_id)
);

comment on table public.parent_assigned_activities is
  'Parent-assigned learning activities for a linked child. Service-role APIs only.';

create index if not exists parent_assigned_activities_parent_idx
  on public.parent_assigned_activities (parent_id, created_at desc);

create index if not exists parent_assigned_activities_student_idx
  on public.parent_assigned_activities (student_id, status);

-- ---------------------------------------------------------------------------
-- 2. parent_activity_status
-- ---------------------------------------------------------------------------

create table if not exists public.parent_activity_status (
  id                uuid          primary key default gen_random_uuid(),
  activity_id       uuid          not null,
  student_id        uuid          not null
                                  references public.students (id) on delete cascade,
  status            text          not null default 'not_started'
                                  check (status in ('not_started', 'in_progress', 'submitted')),
  started_at        timestamptz   null,
  submitted_at      timestamptz   null,
  last_seen_at      timestamptz   null,
  answers_count     integer       not null default 0
                                  check (answers_count >= 0),
  correct_count     integer       not null default 0
                                  check (correct_count >= 0),
  score_pct         numeric(5, 2) null
                                  check (score_pct is null or (score_pct >= 0 and score_pct <= 100)),
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  constraint parent_activity_status_unique unique (activity_id, student_id),
  constraint parent_activity_status_fk
    foreign key (activity_id, student_id)
    references public.parent_assigned_activities (id, student_id)
    on delete cascade
);

create index if not exists parent_activity_status_activity_idx
  on public.parent_activity_status (activity_id, status);

-- ---------------------------------------------------------------------------
-- 3. parent_activity_attempts
-- ---------------------------------------------------------------------------

create table if not exists public.parent_activity_attempts (
  id                   uuid          primary key default gen_random_uuid(),
  activity_id          uuid          not null,
  student_id           uuid          not null
                                     references public.students (id) on delete cascade,
  question_index       integer       not null
                                     check (question_index >= 0),
  skill_key            text          null,
  question_snapshot    jsonb         not null default '{}'::jsonb,
  selected_answer      text          null,
  correct_answer       text          null,
  is_correct           boolean       null,
  time_spent_ms        integer       null,
  hints_used           integer       not null default 0,
  explanation_viewed   boolean       not null default false,
  answered_at          timestamptz   null,
  created_at           timestamptz   not null default now(),
  constraint parent_activity_attempts_unique unique (activity_id, student_id, question_index),
  constraint parent_activity_attempts_fk
    foreign key (activity_id, student_id)
    references public.parent_assigned_activities (id, student_id)
    on delete cascade
);

create index if not exists parent_activity_attempts_activity_idx
  on public.parent_activity_attempts (activity_id, student_id, question_index);

create index if not exists parent_activity_attempts_student_answered_idx
  on public.parent_activity_attempts (student_id, answered_at desc);

-- ---------------------------------------------------------------------------
-- Triggers + RLS
-- ---------------------------------------------------------------------------

drop trigger if exists trg_parent_assigned_activities_set_updated_at
  on public.parent_assigned_activities;

drop trigger if exists trg_parent_activity_status_set_updated_at
  on public.parent_activity_status;

create trigger trg_parent_assigned_activities_set_updated_at
  before update on public.parent_assigned_activities
  for each row execute function public.set_updated_at();

create trigger trg_parent_activity_status_set_updated_at
  before update on public.parent_activity_status
  for each row execute function public.set_updated_at();

alter table public.parent_assigned_activities enable row level security;
alter table public.parent_activity_status enable row level security;
alter table public.parent_activity_attempts enable row level security;

commit;

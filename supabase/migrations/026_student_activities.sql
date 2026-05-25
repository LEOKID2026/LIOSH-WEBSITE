-- Individual (student-scoped) teacher activities.
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Requires 019_teacher_portal_foundation.sql and 024_classroom_activities.sql applied first.
-- Mirrors classroom_activities pattern: metadata + per-student status + per-question attempts.
-- status/attempt rows are tied to student_activities(id, student_id) so student_id cannot drift.

begin;

-- ---------------------------------------------------------------------------
-- 1. student_activities
-- ---------------------------------------------------------------------------

create table if not exists public.student_activities (
  id                    uuid        primary key default gen_random_uuid(),
  teacher_id            uuid        not null
                                    references public.teacher_profiles (id) on delete cascade,
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
                                    check (question_count between 1 and 50),
  mode                  text        not null
                                    check (mode in (
                                      'guided_practice',
                                      'quiz',
                                      'homework'
                                    )),
  question_selection    text        not null default 'same_exact'
                                    check (question_selection in ('same_exact', 'controlled_variants')),
  time_limit_seconds    integer     null
                                    check (time_limit_seconds is null or time_limit_seconds > 0),
  due_at                timestamptz null,
  status                text        not null default 'draft'
                                    check (status in (
                                      'draft',
                                      'active',
                                      'closed',
                                      'archived'
                                    )),
  question_set          jsonb       not null default '[]'::jsonb,
  activated_at          timestamptz null,
  closed_at             timestamptz null,
  archived_at           timestamptz null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint student_activities_id_student_uq unique (id, student_id)
);

comment on table public.student_activities is
  'Teacher-assigned activities for one student (private tutor / targeted assignment). Service-role APIs only.';

comment on constraint student_activities_id_student_uq on public.student_activities is
  'Composite key for child tables: status/attempt rows must use the same student_id as the activity.';

create index if not exists student_activities_teacher_idx
  on public.student_activities (teacher_id, created_at desc);

create index if not exists student_activities_student_idx
  on public.student_activities (student_id, status);

-- ---------------------------------------------------------------------------
-- 2. student_activity_status
-- ---------------------------------------------------------------------------

create table if not exists public.student_activity_status (
  id                uuid          primary key default gen_random_uuid(),
  activity_id       uuid          not null,
  student_id        uuid          not null
                                  references public.students (id) on delete cascade,
  status            text          not null default 'not_started'
                                  check (status in (
                                    'not_started',
                                    'in_progress',
                                    'submitted',
                                    'timed_out'
                                  )),
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
  constraint student_activity_status_unique unique (activity_id, student_id),
  constraint student_activity_status_activity_student_fk
    foreign key (activity_id, student_id)
    references public.student_activities (id, student_id)
    on delete cascade
);

create index if not exists student_activity_status_activity_idx
  on public.student_activity_status (activity_id, status);

-- ---------------------------------------------------------------------------
-- 3. student_activity_attempts
-- ---------------------------------------------------------------------------

create table if not exists public.student_activity_attempts (
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
  constraint student_activity_attempts_unique unique (activity_id, student_id, question_index),
  constraint student_activity_attempts_activity_student_fk
    foreign key (activity_id, student_id)
    references public.student_activities (id, student_id)
    on delete cascade
);

create index if not exists student_activity_attempts_activity_idx
  on public.student_activity_attempts (activity_id, student_id);

-- ---------------------------------------------------------------------------
-- RLS: enabled, no authenticated policies (service-role only)
-- ---------------------------------------------------------------------------

alter table public.student_activities enable row level security;
alter table public.student_activity_status enable row level security;
alter table public.student_activity_attempts enable row level security;

commit;

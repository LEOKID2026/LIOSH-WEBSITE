-- Classroom Activities (teacher-controlled assignments).
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Requires 019_teacher_portal_foundation.sql applied first.
-- Phase A: same_exact scoring only; controlled_variants reserved (API rejects).
--
-- Section 6 audit CHECK (verify before apply):
--   DROP both: teacher_access_audit_action_check AND teacher_access_audit_action_chk
--   Recreate with app-used actions: magic_link_issued, student_created_by_teacher,
--   student_name_updated, plus activity_created / activity_activated / activity_paused /
--   activity_closed / activity_archived (full list in section 6 below).

begin;

-- ---------------------------------------------------------------------------
-- 1. classroom_activities
-- ---------------------------------------------------------------------------

create table if not exists public.classroom_activities (
  id                    uuid        primary key default gen_random_uuid(),
  teacher_id            uuid        not null
                                    references public.teacher_profiles (id) on delete cascade,
  class_id              uuid        not null
                                    references public.teacher_classes (id) on delete cascade,
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
                                      'live_lesson',
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
                                      'paused',
                                      'closed',
                                      'archived'
                                    )),
  question_set          jsonb       not null default '[]'::jsonb,
  current_question_idx  integer     null
                                    check (current_question_idx is null or current_question_idx >= 0),
  activated_at          timestamptz null,
  paused_at             timestamptz null,
  closed_at             timestamptz null,
  archived_at           timestamptz null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.classroom_activities is
  'Teacher-controlled classroom activities. Mutations via service-role /api/teacher/* and /api/student/* only.';

comment on column public.classroom_activities.question_set is
  'same_exact: frozen question objects with correct_answer (teacher-authored at create). controlled_variants: reserved params (Phase A API rejects).';

create index if not exists classroom_activities_class_status_idx
  on public.classroom_activities (class_id, status);

create index if not exists classroom_activities_teacher_idx
  on public.classroom_activities (teacher_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. classroom_activity_student_status
-- ---------------------------------------------------------------------------

create table if not exists public.classroom_activity_student_status (
  id                uuid        primary key default gen_random_uuid(),
  activity_id       uuid        not null
                                references public.classroom_activities (id) on delete cascade,
  student_id        uuid        not null
                                references public.students (id) on delete cascade,
  status            text        not null default 'not_started'
                                check (status in (
                                  'not_started',
                                  'in_progress',
                                  'submitted',
                                  'timed_out'
                                )),
  started_at        timestamptz null,
  submitted_at      timestamptz null,
  last_seen_at      timestamptz null,
  answers_count     integer     not null default 0
                                check (answers_count >= 0),
  correct_count     integer     not null default 0
                                check (correct_count >= 0),
  score_pct         numeric(5, 2) null
                                check (score_pct is null or (score_pct >= 0 and score_pct <= 100)),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint classroom_activity_student_status_unique unique (activity_id, student_id)
);

create index if not exists cass_student_status_activity_idx
  on public.classroom_activity_student_status (activity_id, status);

create index if not exists cass_student_status_student_idx
  on public.classroom_activity_student_status (student_id);

-- ---------------------------------------------------------------------------
-- 3. classroom_activity_attempts
-- ---------------------------------------------------------------------------

create table if not exists public.classroom_activity_attempts (
  id                  uuid        primary key default gen_random_uuid(),
  activity_id         uuid        not null
                                  references public.classroom_activities (id) on delete cascade,
  student_id          uuid        not null
                                  references public.students (id) on delete cascade,
  question_index      integer     not null
                                  check (question_index >= 0),
  skill_key           text        null
                                  check (skill_key is null or char_length(skill_key) <= 120),
  question_snapshot   jsonb       not null default '{}'::jsonb,
  selected_answer     text        null,
  correct_answer      text        null,
  is_correct          boolean     null,
  time_spent_ms       integer     null
                                  check (time_spent_ms is null or time_spent_ms >= 0),
  hints_used          integer     not null default 0
                                  check (hints_used >= 0),
  explanation_viewed  boolean     not null default false,
  answered_at         timestamptz null,
  created_at          timestamptz not null default now(),
  constraint classroom_activity_attempts_unique
    unique (activity_id, student_id, question_index)
);

comment on column public.classroom_activity_attempts.question_snapshot is
  'Server-written copy of question_set[index] at scoring time; never trusted from student.';

comment on column public.classroom_activity_attempts.correct_answer is
  'Server-derived from question_set; never from student body.';

create index if not exists caa_activity_student_idx
  on public.classroom_activity_attempts (activity_id, student_id, question_index);

create index if not exists caa_activity_question_idx
  on public.classroom_activity_attempts (activity_id, question_index);

-- ---------------------------------------------------------------------------
-- 4. updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_classroom_activities_set_updated_at on public.classroom_activities;
create trigger trg_classroom_activities_set_updated_at
before update on public.classroom_activities
for each row
execute function public.set_updated_at();

drop trigger if exists trg_classroom_activity_student_status_set_updated_at on public.classroom_activity_student_status;
create trigger trg_classroom_activity_student_status_set_updated_at
before update on public.classroom_activity_student_status
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS (server-only; no authenticated policies)
-- ---------------------------------------------------------------------------

alter table public.classroom_activities enable row level security;
alter table public.classroom_activity_student_status enable row level security;
alter table public.classroom_activity_attempts enable row level security;

comment on table public.classroom_activities is
  'RLS enabled; no client policies. All access via service role (/api/teacher/*, /api/student/*).';

comment on table public.classroom_activity_student_status is
  'RLS enabled; no client policies. All access via service role.';

comment on table public.classroom_activity_attempts is
  'RLS enabled; no client policies. All access via service role.';

-- ---------------------------------------------------------------------------
-- 6. Extend teacher_access_audit.action CHECK
-- ---------------------------------------------------------------------------
-- 019 created an inline column CHECK (default name teacher_access_audit_action_check).
-- 021 added teacher_access_audit_action_chk but may not drop the 019 inline name.
-- Drop both before recreating a single authoritative list.

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_check;

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_chk;

alter table public.teacher_access_audit
  add constraint teacher_access_audit_action_chk
  check (action in (
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
    -- Written by live teacher APIs but absent from 021 CHECK (include before apply)
    'magic_link_issued',
    'student_created_by_teacher',
    'student_name_updated',
    'activity_created',
    'activity_activated',
    'activity_paused',
    'activity_closed',
    'activity_archived'
  ));

commit;

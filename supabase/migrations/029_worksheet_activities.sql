-- 029_worksheet_activities.sql
-- Worksheet PDF Activities feature.
-- Owner must apply manually in Supabase SQL editor.
-- Do NOT run via agent or CI.
-- Requires migrations 001-028 applied first (especially 019, 024, 027).

begin;

-- ---------------------------------------------------------------------------
-- 1. worksheet_activities
-- ---------------------------------------------------------------------------
create table if not exists public.worksheet_activities (
  id                    uuid        primary key default gen_random_uuid(),
  teacher_id            uuid        not null
                                    references public.teacher_profiles (id) on delete cascade,
  class_id              uuid        not null
                                    references public.teacher_classes (id) on delete cascade,
  school_id             uuid        null
                                    references public.school_accounts (id) on delete set null,
  title                 text        not null
                                    check (char_length(title) between 1 and 120),
  subject               text        not null
                                    check (char_length(subject) between 1 and 64),
  instructions          text        null
                                    check (instructions is null or char_length(instructions) <= 1000),
  worksheet_mode        text        not null default 'pdf_only'
                                    check (worksheet_mode in (
                                      'pdf_only',
                                      'digital_answers',
                                      'manual_grading'
                                    )),
  question_count        integer     null
                                    check (question_count is null or (question_count between 1 and 100)),
  physical_due_at       timestamptz null,
  status                text        not null default 'draft'
                                    check (status in ('draft', 'active', 'closed', 'archived')),
  has_answer_key        boolean     not null default false,
  activated_at          timestamptz null,
  closed_at             timestamptz null,
  archived_at           timestamptz null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.worksheet_activities is
  'Standalone worksheet/PDF activities. Separate from classroom_activities.';

create index if not exists worksheet_activities_teacher_idx
  on public.worksheet_activities (teacher_id, created_at desc);

create index if not exists worksheet_activities_class_idx
  on public.worksheet_activities (class_id, status);

create index if not exists worksheet_activities_school_idx
  on public.worksheet_activities (school_id, status)
  where school_id is not null;

alter table public.worksheet_activities enable row level security;

-- ---------------------------------------------------------------------------
-- 2. worksheet_files
-- ---------------------------------------------------------------------------
create table if not exists public.worksheet_files (
  id                    uuid        primary key default gen_random_uuid(),
  worksheet_activity_id uuid        not null
                                    references public.worksheet_activities (id) on delete cascade,
  teacher_id            uuid        not null
                                    references public.teacher_profiles (id) on delete cascade,
  storage_path          text        not null
                                    check (char_length(storage_path) between 1 and 500),
  original_filename     text        not null
                                    check (char_length(original_filename) between 1 and 255),
  file_size_bytes       bigint      not null
                                    check (file_size_bytes > 0 and file_size_bytes <= 20971520),
  content_type          text        not null default 'application/pdf'
                                    check (content_type = 'application/pdf'),
  file_role             text        not null default 'worksheet'
                                    check (file_role in ('worksheet', 'answer_key')),
  is_deleted            boolean     not null default false,
  deleted_at            timestamptz null,
  created_at            timestamptz not null default now()
);

create index if not exists worksheet_files_activity_idx
  on public.worksheet_files (worksheet_activity_id, file_role, is_deleted);

alter table public.worksheet_files enable row level security;

-- ---------------------------------------------------------------------------
-- 3. worksheet_questions
-- ---------------------------------------------------------------------------
create table if not exists public.worksheet_questions (
  id                    uuid          primary key default gen_random_uuid(),
  worksheet_activity_id uuid          not null
                                      references public.worksheet_activities (id) on delete cascade,
  question_index        integer       not null check (question_index >= 1),
  question_type         text          not null
                                      check (question_type in (
                                        'multiple_choice', 'true_false', 'numeric',
                                        'short_answer', 'free_text'
                                      )),
  points                numeric(6,2)  null check (points is null or points > 0),
  choices               jsonb         null,
  correct_answer        jsonb         null,
  is_auto_gradable      boolean       not null default false,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  unique (worksheet_activity_id, question_index)
);

create index if not exists worksheet_questions_activity_idx
  on public.worksheet_questions (worksheet_activity_id, question_index);

alter table public.worksheet_questions enable row level security;

-- ---------------------------------------------------------------------------
-- 4. worksheet_student_status
-- ---------------------------------------------------------------------------
create table if not exists public.worksheet_student_status (
  id                    uuid          primary key default gen_random_uuid(),
  worksheet_activity_id uuid          not null
                                      references public.worksheet_activities (id) on delete cascade,
  student_id            uuid          not null
                                      references public.students (id) on delete cascade,
  pdf_first_opened_at   timestamptz   null,
  pdf_last_opened_at    timestamptz   null,
  pdf_open_count        integer       not null default 0 check (pdf_open_count >= 0),
  marked_completed_at   timestamptz   null,
  digital_submitted_at  timestamptz   null,
  grading_status        text          not null default 'not_submitted'
                                      check (grading_status in (
                                        'not_submitted', 'submitted', 'pending_review',
                                        'partially_checked', 'checked', 'published'
                                      )),
  auto_score_pct        numeric(5,2)  null
                                      check (auto_score_pct is null or (auto_score_pct between 0 and 100)),
  final_score_pct       numeric(5,2)  null
                                      check (final_score_pct is null or (final_score_pct between 0 and 100)),
  teacher_checked_at    timestamptz   null,
  teacher_published_at  timestamptz   null,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  unique (worksheet_activity_id, student_id)
);

create index if not exists worksheet_student_status_activity_idx
  on public.worksheet_student_status (worksheet_activity_id, grading_status);

create index if not exists worksheet_student_status_student_idx
  on public.worksheet_student_status (student_id, grading_status);

alter table public.worksheet_student_status enable row level security;

-- ---------------------------------------------------------------------------
-- 5. worksheet_student_answers
-- ---------------------------------------------------------------------------
create table if not exists public.worksheet_student_answers (
  id                    uuid          primary key default gen_random_uuid(),
  worksheet_activity_id uuid          not null
                                      references public.worksheet_activities (id) on delete cascade,
  student_id            uuid          not null
                                      references public.students (id) on delete cascade,
  question_index        integer       not null check (question_index >= 1),
  answer_value          jsonb         null,
  submitted_at          timestamptz   null,
  auto_is_correct       boolean       null,
  auto_score            numeric(6,2)  null,
  teacher_score         numeric(6,2)  null,
  teacher_comment       text          null
                                      check (teacher_comment is null or char_length(teacher_comment) <= 500),
  teacher_override      boolean       not null default false,
  teacher_graded_at     timestamptz   null,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  unique (worksheet_activity_id, student_id, question_index)
);

create index if not exists worksheet_student_answers_activity_idx
  on public.worksheet_student_answers (worksheet_activity_id, student_id);

alter table public.worksheet_student_answers enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Extend teacher_access_audit action CHECK
-- ---------------------------------------------------------------------------
alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_check;

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_chk;

alter table public.teacher_access_audit
  add constraint teacher_access_audit_action_chk check (action in (
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
    'school_student_report_viewed',
    'school_student_class_transferred',
    'school_class_teacher_reassigned',
    'school_class_archived',
    'worksheet_activity_created',
    'worksheet_activity_activated',
    'worksheet_activity_closed',
    'worksheet_activity_archived',
    'worksheet_pdf_uploaded',
    'worksheet_result_published'
  ));

-- ---------------------------------------------------------------------------
-- 7. Supabase Storage bucket for worksheet PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worksheet-pdfs',
  'worksheet-pdfs',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;

commit;

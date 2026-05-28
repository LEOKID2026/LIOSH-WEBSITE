-- 037_discussion_activity_mode.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Extends mode CHECK constraints to allow 'discussion' mode on both activity tables.
-- This is additive: all existing rows and behavior are unchanged.
--
-- Before running, verify constraint names:
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'public.classroom_activities'::regclass AND conname LIKE '%mode%';
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'public.student_activities'::regclass AND conname LIKE '%mode%';

begin;

alter table public.classroom_activities
  drop constraint if exists classroom_activities_mode_check;

alter table public.classroom_activities
  add constraint classroom_activities_mode_check
  check (mode in ('live_lesson','guided_practice','quiz','homework','discussion'));

alter table public.student_activities
  drop constraint if exists student_activities_mode_check;

alter table public.student_activities
  add constraint student_activities_mode_check
  check (mode in ('guided_practice','quiz','homework','discussion'));

-- Discussion recipient targeting (school class activities).
-- whole_class = all active class members get status rows on activate.
-- selected_students = only assigned_student_ids (must be non-empty when scope is selected).
alter table public.classroom_activities
  add column if not exists recipient_scope text null
    check (recipient_scope is null or recipient_scope in ('whole_class', 'selected_students'));

alter table public.classroom_activities
  add column if not exists assigned_student_ids uuid[] null;

comment on column public.classroom_activities.recipient_scope is
  'Recipient targeting: whole_class or selected_students. NULL means whole-class implicit (legacy / non-discussion activities today).
   Future normal activities (homework, quiz etc.) may also use this field for selected-student targeting.';

comment on column public.classroom_activities.assigned_student_ids is
  'When recipient_scope = selected_students, non-empty array of class member UUIDs assigned to this activity. NULL for whole_class.';

-- Drop old name in case a previous version of this migration was applied.
alter table public.classroom_activities
  drop constraint if exists classroom_activities_discussion_recipients_check;

alter table public.classroom_activities
  drop constraint if exists classroom_activities_recipient_fields_check;

alter table public.classroom_activities
  add constraint classroom_activities_recipient_fields_check
  check (
    (
      recipient_scope is null
      and assigned_student_ids is null
    )
    or (
      recipient_scope = 'whole_class'
      and (
        assigned_student_ids is null
        or cardinality(assigned_student_ids) = 0
      )
    )
    or (
      recipient_scope = 'selected_students'
      and assigned_student_ids is not null
      and cardinality(assigned_student_ids) > 0
    )
  );

comment on column public.classroom_activities.mode is
  'Activity delivery mode.
   live_lesson = teacher-broadcast, guided_practice / quiz / homework = student self-paced.
   discussion = single-question teacher discussion exercise.
   discussion mode is excluded from all diagnostic rollups.';

comment on column public.student_activities.mode is
  'Activity delivery mode.
   guided_practice / quiz / homework = student self-paced.
   discussion = single-question private teacher discussion exercise.
   discussion mode is excluded from all diagnostic rollups.';

-- Private teacher multi-student batch support.
-- When a private teacher sends the same activity to multiple private students,
-- all resulting student_activities rows share a batch_id so they can be monitored together.
-- Nullable: all existing 1:1 rows and all future single-student rows keep batch_id = NULL.
alter table public.student_activities
  add column if not exists batch_id uuid null;

create index if not exists student_activities_batch_idx
  on public.student_activities (batch_id)
  where batch_id is not null;

comment on column public.student_activities.batch_id is
  'When non-null, this row belongs to a multi-student batch created in one teacher action.
   All rows in the same batch share an identical question_set, title, subject, and topic.
   NULL for single-student (1:1) activities; those are still valid and fully supported.';

commit;

-- 038_discussion_multi_question.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Adds answer_required column to classroom_activities.
-- Multi-question support requires no DB change beyond this:
--   question_set is already JSONB (array-safe).
--   question_count has no DB CHECK constraint — only server validation changes.

begin;

alter table public.classroom_activities
  add column if not exists answer_required boolean not null default true;

comment on column public.classroom_activities.answer_required is
  'When false, discussion is display/explanation only.
   Students see all prompts/questions but are not required to submit an answer to complete.
   Defaults to true for all existing and new activities.
   Only meaningful for mode = discussion; ignored for all other modes.';

comment on column public.classroom_activities.mode is
  'Activity delivery mode.
   live_lesson = teacher-broadcast.
   guided_practice / quiz / homework = student self-paced.
   discussion = teacher discussion exercise (1–5 questions).
     Multi-question and explanation-only (answer_required=false) supported.
   discussion mode is excluded from all diagnostic rollups.';

commit;

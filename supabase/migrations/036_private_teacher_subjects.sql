-- 036_private_teacher_subjects.sql
-- OWNER MUST RUN MANUALLY. Agent must NOT execute.
-- Subject-only permissions for private (non-school) teachers.
-- Private teachers are not scoped by school class or grade; student grade is used only for question content.
-- Requires 019_teacher_portal_foundation.sql applied first.

begin;

create table if not exists public.private_teacher_subjects (
  id          uuid        primary key default gen_random_uuid(),
  teacher_id  uuid        not null
                          references public.teacher_profiles(id) on delete cascade,
  subject     text        not null
                          check (subject in (
                            'math','geometry','hebrew','english',
                            'science','moledet_geography'
                          )),
  granted_by  uuid        not null
                          references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (teacher_id, subject)
);

comment on table public.private_teacher_subjects is
  'Subject-only discussion permissions for private teachers (platform admin grants).
   Does not include grade or class scope. Student grade_level is used only for question generation.
   Mutations via service-role admin APIs only. RLS ON, no authenticated policies.';

create index private_teacher_subjects_teacher_idx
  on public.private_teacher_subjects (teacher_id);

alter table public.private_teacher_subjects enable row level security;

commit;

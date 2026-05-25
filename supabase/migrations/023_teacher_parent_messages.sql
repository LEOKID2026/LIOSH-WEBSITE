-- Teacher-to-parent messages (product-ready, service-role API only).
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Invariants:
--   - Append-only history (hide via is_hidden, never overwrite message text).
--   - No changes to students, parent_id, or existing teacher portal tables.

begin;

create table if not exists public.teacher_parent_messages (
  id          uuid        primary key default gen_random_uuid(),
  teacher_id  uuid        not null
                          references public.teacher_profiles (id) on delete cascade,
  student_id  uuid        not null
                          references public.students (id) on delete cascade,
  message     text        not null
                          check (char_length(trim(message)) between 1 and 2000),
  is_hidden   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.teacher_parent_messages is
  'Teacher-authored messages shown in parent-facing reports. Mutations via service-role /api/teacher/* only.';

create index if not exists teacher_parent_messages_student_visible_idx
  on public.teacher_parent_messages (student_id, created_at desc)
  where is_hidden = false;

create index if not exists teacher_parent_messages_teacher_student_idx
  on public.teacher_parent_messages (teacher_id, student_id, created_at desc);

alter table public.teacher_parent_messages enable row level security;

-- No authenticated policies: all access through service-role teacher/guardian/parent APIs.

commit;

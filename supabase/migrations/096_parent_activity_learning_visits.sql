-- Parent-assigned activity — per-visit learning time (not answer rows).
-- Owner must apply manually. Agent must NOT run this migration.
--
-- מקור אמת לזמן למידה בפעילות מהורה: כל ביקור = שורה נפרדת.
-- idempotency: (student_id, client_visit_token) — לא לפי question_index.

begin;

create table if not exists public.parent_activity_learning_visits (
  id                  uuid        primary key default gen_random_uuid(),
  activity_id         uuid        not null,
  student_id          uuid        not null
                                  references public.students (id) on delete cascade,
  question_index      integer     not null
                                  check (question_index >= 0),
  client_visit_token  text        not null
                                  check (char_length(client_visit_token) between 8 and 120),
  raw_dwell_ms        integer     not null default 0
                                  check (raw_dwell_ms >= 0),
  credited_dwell_ms   integer     not null default 0
                                  check (credited_dwell_ms >= 0 and credited_dwell_ms <= 600000),
  visit_kind          text        not null default 'learning'
                                  check (visit_kind in ('learning', 'answer')),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint parent_activity_learning_visits_token_uq
    unique (student_id, client_visit_token),
  constraint parent_activity_learning_visits_fk
    foreign key (activity_id, student_id)
    references public.parent_assigned_activities (id, student_id)
    on delete cascade
);

comment on table public.parent_activity_learning_visits is
  'Learning-time visits for parent-assigned activities. One row per continuous visit; answers stay in parent_activity_attempts.';

create index if not exists parent_activity_learning_visits_student_ended_idx
  on public.parent_activity_learning_visits (student_id, ended_at desc);

create index if not exists parent_activity_learning_visits_activity_question_idx
  on public.parent_activity_learning_visits (activity_id, student_id, question_index);

alter table public.parent_activity_learning_visits enable row level security;

-- Backfill: one synthetic visit per existing attempt with credited time (idempotent).
insert into public.parent_activity_learning_visits (
  activity_id,
  student_id,
  question_index,
  client_visit_token,
  raw_dwell_ms,
  credited_dwell_ms,
  visit_kind,
  started_at,
  ended_at
)
select
  a.activity_id,
  a.student_id,
  a.question_index,
  'legacy_backfill:' || a.id::text,
  coalesce(
    nullif((a.question_snapshot->>'rawTimeSpentMs')::integer, 0),
    a.time_spent_ms,
    0
  ),
  least(
    600000,
    greatest(
      0,
      coalesce(
        nullif((a.question_snapshot->>'creditedTimeMs')::integer, 0),
        nullif((a.question_snapshot->>'rawTimeSpentMs')::integer, 0),
        a.time_spent_ms,
        0
      )
    )
  ),
  'answer',
  coalesce(a.answered_at, a.created_at),
  coalesce(a.answered_at, a.created_at)
from public.parent_activity_attempts a
where a.is_correct is not null
  and greatest(
    0,
    coalesce(
      nullif((a.question_snapshot->>'creditedTimeMs')::integer, 0),
      nullif((a.question_snapshot->>'rawTimeSpentMs')::integer, 0),
      a.time_spent_ms,
      0
    )
  ) > 0
  and not exists (
    select 1
    from public.parent_activity_learning_visits v
    where v.activity_id = a.activity_id
      and v.student_id = a.student_id
      and v.question_index = a.question_index
  )
on conflict (student_id, client_visit_token) do nothing;

commit;

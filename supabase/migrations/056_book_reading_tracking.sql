-- Phase 5: Learning book reading tracking
-- student_id uses public.students(id) — NOT auth.users(id)
-- Owner applies this migration manually; do not auto-run in CI/agent.

begin;

create table if not exists public.book_reading_sessions (
  id                       uuid        primary key default gen_random_uuid(),
  student_id               uuid        not null references public.students(id) on delete cascade,
  subject                  text        not null,
  grade                    text        not null,
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  total_raw_dwell_ms       integer     check (total_raw_dwell_ms is null or total_raw_dwell_ms >= 0),
  total_credited_dwell_ms  integer     check (total_credited_dwell_ms is null or total_credited_dwell_ms >= 0),
  total_hidden_tab_ms      integer     not null default 0 check (total_hidden_tab_ms >= 0),
  pages_read_count         integer     not null default 0,
  pages_skipped_count      integer     not null default 0,
  triggered_cta            boolean     not null default false,
  cta_page_id              text,
  client_session_token     text        not null,
  metadata                 jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint book_reading_sessions_student_token_unique unique (student_id, client_session_token)
);

create table if not exists public.book_page_visits (
  id                       uuid        primary key default gen_random_uuid(),
  book_reading_session_id  uuid        not null references public.book_reading_sessions(id) on delete cascade,
  student_id               uuid        not null references public.students(id) on delete cascade,
  subject                  text        not null,
  grade                    text        not null,
  page_id                  text        not null,
  batch_id                 text,
  sequence_index           integer,
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  raw_dwell_ms             integer     check (raw_dwell_ms is null or raw_dwell_ms >= 0),
  credited_dwell_ms        integer     check (credited_dwell_ms is null or credited_dwell_ms >= 0),
  hidden_tab_ms            integer     not null default 0 check (hidden_tab_ms >= 0),
  sections_viewed          integer[]   not null default '{}',
  sections_skipped         integer[]   not null default '{}',
  page_read                boolean     not null default false,
  triggered_cta            boolean     not null default false,
  client_visit_token       text        not null,
  metadata                 jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  constraint book_page_visits_session_token_unique unique (book_reading_session_id, client_visit_token)
);

create index if not exists book_reading_sessions_student_started_idx
  on public.book_reading_sessions (student_id, started_at desc);

create index if not exists book_page_visits_student_started_idx
  on public.book_page_visits (student_id, started_at desc);

create index if not exists book_page_visits_session_idx
  on public.book_page_visits (book_reading_session_id);

create index if not exists book_page_visits_subject_grade_idx
  on public.book_page_visits (subject, grade);

alter table public.book_reading_sessions enable row level security;
alter table public.book_page_visits enable row level security;

drop trigger if exists trg_book_reading_sessions_set_updated_at on public.book_reading_sessions;
create trigger trg_book_reading_sessions_set_updated_at
before update on public.book_reading_sessions
for each row execute function public.set_updated_at();

commit;

-- Guest child mode (v2 — simple).
-- Approved for manual run after System Guest Parent exists (see docs/guest-child-mode/SQL_RUN_INSTRUCTIONS.md).
-- Do not auto-run from CI or scripts.
--
-- Prerequisites:
--   1. Create System Guest Parent in Supabase Auth (see docs/guest-child-mode/MASTER_PLAN.md)
--   2. Set GUEST_SYSTEM_PARENT_EMAIL env or use default guest-system@liosh.invalid
--
-- Rollback (manual, destructive — revert guest mode entirely):
--   drop table if exists public.guest_link_events;
--   drop table if exists public.guest_learning_access;
--   drop table if exists public.guest_game_access;
--   drop table if exists public.guest_device_bindings;
--   drop table if exists public.guest_mode_settings;
--   alter table public.student_sessions drop constraint if exists student_sessions_session_kind_chk;
--   alter table public.student_sessions drop column if exists session_kind;
--   drop index if exists public.students_guest_list_idx;
--   drop index if exists public.students_leo_number_uidx;
--   alter table public.students drop constraint if exists students_guest_account_status_chk;
--   alter table public.students drop constraint if exists students_guest_status_chk;
--   alter table public.students drop constraint if exists students_leo_number_format_chk;
--   alter table public.students drop constraint if exists students_account_kind_chk;
--   alter table public.students drop column if exists guest_last_seen_at;
--   alter table public.students drop column if exists guest_linked_to_student_id;
--   alter table public.students drop column if exists guest_linked_at;
--   alter table public.students drop column if exists guest_status;
--   alter table public.students drop column if exists leo_number;
--   alter table public.students drop column if exists account_kind;

begin;

alter table public.students
  add column if not exists account_kind text not null default 'registered';

alter table public.students
  drop constraint if exists students_account_kind_chk;

alter table public.students
  add constraint students_account_kind_chk
  check (account_kind in ('registered', 'guest'));

alter table public.students
  add column if not exists leo_number text null;

alter table public.students
  drop constraint if exists students_leo_number_format_chk;

alter table public.students
  add constraint students_leo_number_format_chk
  check (leo_number is null or leo_number ~ '^[0-9]{6}$');

alter table public.students
  add column if not exists guest_status text null;

alter table public.students
  drop constraint if exists students_guest_status_chk;

alter table public.students
  add constraint students_guest_status_chk
  check (
    guest_status is null
    or guest_status in ('active', 'linked')
  );

alter table public.students
  drop constraint if exists students_guest_account_status_chk;

alter table public.students
  add constraint students_guest_account_status_chk
  check (
    (account_kind = 'registered' and guest_status is null)
    or (account_kind = 'guest' and guest_status in ('active', 'linked'))
  );

comment on column public.students.guest_status is
  'Null for registered children. Set only for account_kind=guest: active until parent link, then linked.';

alter table public.students
  add column if not exists guest_linked_at timestamptz null;

alter table public.students
  add column if not exists guest_linked_to_student_id uuid null
    references public.students (id) on delete set null;

alter table public.students
  add column if not exists guest_last_seen_at timestamptz null;

comment on column public.students.account_kind is
  'registered = normal child; guest = trial under system guest parent until linked.';

comment on column public.students.leo_number is
  'Public 6-digit Leo number for guest children (parent linking).';

create unique index if not exists students_leo_number_uidx
  on public.students (leo_number)
  where leo_number is not null;

create index if not exists students_guest_list_idx
  on public.students (guest_status, guest_last_seen_at desc nulls last)
  where account_kind = 'guest';

create table if not exists public.guest_device_bindings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  resume_token_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create unique index if not exists guest_device_bindings_token_active_uidx
  on public.guest_device_bindings (resume_token_hash)
  where revoked_at is null;

create index if not exists guest_device_bindings_student_idx
  on public.guest_device_bindings (student_id)
  where revoked_at is null;

-- Guest sessions use access_code_id = NULL.
-- Verified in 001_learning_core_foundation.sql: access_code_id is nullable;
-- no later migration adds NOT NULL on student_sessions.access_code_id.

alter table public.student_sessions
  add column if not exists session_kind text not null default 'registered';

alter table public.student_sessions
  drop constraint if exists student_sessions_session_kind_chk;

alter table public.student_sessions
  add constraint student_sessions_session_kind_chk
  check (session_kind in ('registered', 'guest'));

create table if not exists public.guest_mode_settings (
  setting_key text primary key,
  setting_value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint guest_mode_settings_value_json_chk
    check (jsonb_typeof(setting_value_json) in ('object', 'array', 'boolean', 'number'))
);

create table if not exists public.guest_game_access (
  game_key text primary key references public.site_game_catalog (game_key) on delete cascade,
  guest_playable boolean not null default false,
  sort_priority integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_learning_access (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 80),
  topic text not null check (char_length(topic) between 1 and 160),
  guest_playable boolean not null default false,
  sort_priority integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint guest_learning_access_subject_topic_uidx unique (subject, topic)
);

create table if not exists public.guest_link_events (
  id uuid primary key default gen_random_uuid(),
  guest_student_id uuid not null references public.students (id) on delete restrict,
  target_student_id uuid not null references public.students (id) on delete restrict,
  parent_id uuid not null references public.parent_profiles (id) on delete restrict,
  leo_number text not null,
  coins_transferred integer not null default 0 check (coins_transferred >= 0),
  cards_transferred integer not null default 0 check (cards_transferred >= 0),
  created_at timestamptz not null default now()
);

insert into public.guest_mode_settings (setting_key, setting_value_json) values
  ('guest_mode_enabled', '{"enabled": false}'::jsonb),
  ('guest_defaults', '{"games_per_category": 2, "topics_per_subject": 2}'::jsonb),
  ('guest_economy', '{"shop_enabled": true, "cards_enabled": true}'::jsonb),
  ('surprise_box_guest_settings', '{"max_pending_boxes": 1, "cards_per_open": 1, "coin_prizes_per_open": 1, "box_interval_minutes": 180, "first_box_immediate": true, "prevent_duplicate_in_box": true}'::jsonb)
on conflict (setting_key) do nothing;

alter table public.guest_device_bindings enable row level security;
alter table public.guest_mode_settings enable row level security;
alter table public.guest_game_access enable row level security;
alter table public.guest_learning_access enable row level security;
alter table public.guest_link_events enable row level security;

commit;

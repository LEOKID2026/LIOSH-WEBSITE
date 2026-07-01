-- Security: DB-backed rate limiting for guest link attempts (parent linking a guest by leo_number).
-- Prevents brute-force enumeration of 6-digit leo_numbers.
--
-- Requires migration 086 (guest_child_mode).
--
-- Rollback (manual):
--   drop table if exists public.guest_link_attempts;

begin;

create table if not exists public.guest_link_attempts (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null    default now(),
  blocked_until    timestamptz null,
  parent_user_id   uuid        not null,
  ip_hash          text        null,
  leo_number_hash  text        null,
  outcome          text        not null,
  action           text        not null    default 'guest_link'
);

comment on table public.guest_link_attempts is
  'Audit + rate-limit log for parent guest-link attempts. '
  'blocked_until is set when a rate-limit threshold is exceeded (1 hour block). '
  'All access is via service-role API only.';

create index if not exists guest_link_attempts_parent_created_idx
  on public.guest_link_attempts (parent_user_id, created_at desc);

create index if not exists guest_link_attempts_parent_blocked_idx
  on public.guest_link_attempts (parent_user_id, blocked_until)
  where blocked_until is not null;

create index if not exists guest_link_attempts_ip_created_idx
  on public.guest_link_attempts (ip_hash, created_at desc)
  where ip_hash is not null;

create index if not exists guest_link_attempts_leo_hash_created_idx
  on public.guest_link_attempts (leo_number_hash, created_at desc)
  where leo_number_hash is not null;

alter table public.guest_link_attempts enable row level security;

-- No client-facing RLS policies.
-- All reads and writes go through the service-role API (pages/api/parent/guest/link.js).

commit;

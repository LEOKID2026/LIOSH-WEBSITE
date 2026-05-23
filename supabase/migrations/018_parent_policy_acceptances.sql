-- Append-only Terms + Privacy acceptance history for parent accounts (Phase D).
-- Writes via service-role API only; no broad client RLS policies.

begin;

create table if not exists public.parent_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references public.parent_profiles (id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  locale text not null default 'he',
  source text not null default 'parent_login',
  created_at timestamptz not null default now(),
  constraint parent_policy_acceptances_terms_version_len check (char_length(terms_version) between 1 and 64),
  constraint parent_policy_acceptances_privacy_version_len check (char_length(privacy_version) between 1 and 64),
  constraint parent_policy_acceptances_source_len check (char_length(source) between 1 and 64),
  constraint parent_policy_acceptances_locale_len check (char_length(locale) between 2 and 16)
);

create index if not exists parent_policy_acceptances_parent_user_id_accepted_at_idx
  on public.parent_policy_acceptances (parent_user_id, accepted_at desc);

comment on table public.parent_policy_acceptances is
  'Append-only audit log of parent Terms + Privacy acceptance. Current acceptance = latest row matching required versions.';

alter table public.parent_policy_acceptances enable row level security;

-- Intentionally no policies for anon/authenticated: browser must not read/write directly.
-- Next.js parent APIs validate session then use service_role (same posture as student_learning_state).

commit;

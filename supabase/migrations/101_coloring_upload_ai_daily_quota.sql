-- Daily AI usage quota for coloring upload (HF line-art requests only).
-- Resets at Israel local midnight (enforced in application layer via usage_date).
--
-- Rollback (manual):
--   drop table if exists public.coloring_upload_ai_usage;

begin;

create table if not exists public.coloring_upload_ai_usage (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),
  usage_date   date        not null,
  subject_key  text        not null
);

comment on table public.coloring_upload_ai_usage is
  'One row per successful Hugging Face line-art generation. '
  'subject_key is user:<uuid> or anon:<hash>. Service-role API only.';

create index if not exists coloring_upload_ai_usage_date_subject_idx
  on public.coloring_upload_ai_usage (usage_date, subject_key);

create index if not exists coloring_upload_ai_usage_date_idx
  on public.coloring_upload_ai_usage (usage_date);

alter table public.coloring_upload_ai_usage enable row level security;

commit;

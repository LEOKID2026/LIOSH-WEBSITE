-- Admin analytics event stream.
-- Owner applies manually in Supabase SQL editor. Agent must NOT run this migration.
-- This table stores product/learning interaction facts only; do not store child free text,
-- answer text, passwords/tokens, report contents, exact addresses, or other sensitive data.

begin;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_version integer not null default 1 check (event_version > 0),
  actor_type text not null check (actor_type in ('parent', 'student', 'teacher', 'admin', 'system')),
  actor_id uuid null,
  parent_id uuid null references public.parent_profiles(id) on delete set null,
  student_id uuid null references public.students(id) on delete set null,
  session_id uuid null,
  event_name text not null check (char_length(event_name) between 1 and 120),
  event_family text null check (
    event_family is null
    or event_family in ('auth', 'navigation', 'learning', 'report', 'activity', 'book', 'audio', 'worksheet', 'reward', 'admin', 'system')
  ),
  feature_key text null check (feature_key is null or char_length(feature_key) <= 120),
  object_type text null check (object_type is null or char_length(object_type) <= 80),
  object_id text null check (object_id is null or char_length(object_id) <= 160),
  page_path text null check (page_path is null or char_length(page_path) <= 500),
  subject text null check (subject is null or char_length(subject) <= 80),
  topic text null check (topic is null or char_length(topic) <= 160),
  grade text null check (grade is null or char_length(grade) <= 80),
  device_type text null check (device_type is null or device_type in ('mobile', 'desktop', 'tablet')),
  app_surface text null check (app_surface is null or char_length(app_surface) <= 80),
  idempotency_key text null check (idempotency_key is null or char_length(idempotency_key) <= 240),
  metadata jsonb not null default '{}'::jsonb,
  constraint analytics_events_metadata_object_chk
    check (jsonb_typeof(metadata) = 'object'),
  constraint analytics_events_metadata_sensitive_keys_chk
    check (not (
      metadata ?| array[
        'answer',
        'answerText',
        'userAnswer',
        'expectedAnswer',
        'prompt',
        'question',
        'questionText',
        'freeText',
        'report',
        'reportPayload',
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'address',
        'nationalId',
        'medicalData'
      ]
    ))
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);
create index if not exists analytics_events_actor_type_idx
  on public.analytics_events (actor_type);
create index if not exists analytics_events_event_family_idx
  on public.analytics_events (event_family);
create index if not exists analytics_events_feature_key_idx
  on public.analytics_events (feature_key);
create index if not exists analytics_events_parent_id_idx
  on public.analytics_events (parent_id);
create index if not exists analytics_events_student_id_idx
  on public.analytics_events (student_id);
create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);
create index if not exists analytics_events_subject_idx
  on public.analytics_events (subject);
create index if not exists analytics_events_topic_idx
  on public.analytics_events (topic);
create index if not exists analytics_events_grade_idx
  on public.analytics_events (grade);
create index if not exists analytics_events_created_event_idx
  on public.analytics_events (created_at desc, event_name);
create index if not exists analytics_events_created_student_idx
  on public.analytics_events (created_at desc, student_id);
create index if not exists analytics_events_created_parent_idx
  on public.analytics_events (created_at desc, parent_id);
create index if not exists analytics_events_created_family_idx
  on public.analytics_events (created_at desc, event_family);
create index if not exists analytics_events_created_feature_idx
  on public.analytics_events (created_at desc, feature_key);
create unique index if not exists analytics_events_idempotency_key_uq
  on public.analytics_events (idempotency_key)
  where idempotency_key is not null;

alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'Server-ingested analytics facts for admin-only product analytics. No broad user read policy.';
comment on column public.analytics_events.metadata is
  'Small non-sensitive metadata only; never store free text, answer text, raw reports, tokens, or private child content.';

commit;

-- Teacher Portal Phase 5B: consent tokens + audit action CHECK extension.
-- Requires 019_teacher_portal_foundation.sql and 020_teacher_portal_rls.sql applied first.
--
-- Scope:
--   - teacher_student_consent_tokens (server-only RLS)
--   - Extend teacher_access_audit.action CHECK (add class_updated; keep existing codes)
-- Does NOT modify students.parent_id or parent/student RLS.

begin;

-- ---------------------------------------------------------------------------
-- 1. teacher_student_consent_tokens (server-only)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_student_consent_tokens (
  id                    uuid        primary key default gen_random_uuid(),
  token_hash            text        not null
                                    check (char_length(token_hash) between 32 and 128),
  teacher_id            uuid        not null
                                    references public.teacher_profiles (id) on delete cascade,
  student_id            uuid        not null
                                    references public.students (id) on delete cascade,
  issued_by_parent_id   uuid        not null
                                    references public.parent_profiles (id) on delete cascade,
  purpose               text        not null default 'teacher_student_link'
                                    check (purpose = 'teacher_student_link'),
  issued_at             timestamptz not null default now(),
  expires_at            timestamptz not null,
  consumed_at           timestamptz null,
  created_at            timestamptz not null default now(),
  constraint teacher_student_consent_tokens_expires_after_issued_chk
    check (expires_at > issued_at)
);

create unique index if not exists teacher_student_consent_tokens_token_hash_idx
  on public.teacher_student_consent_tokens (token_hash);

create index if not exists teacher_student_consent_tokens_active_scope_idx
  on public.teacher_student_consent_tokens (teacher_id, student_id)
  where consumed_at is null;

create index if not exists teacher_student_consent_tokens_expires_idx
  on public.teacher_student_consent_tokens (expires_at)
  where consumed_at is null;

create index if not exists teacher_student_consent_tokens_parent_student_idx
  on public.teacher_student_consent_tokens (issued_by_parent_id, student_id);

comment on table public.teacher_student_consent_tokens is
  'One-time parent-issued consent for teacher_student_link. RLS enabled; no client policies. Plaintext token shown once at issue; only token_hash stored.';

alter table public.teacher_student_consent_tokens enable row level security;

-- No policies for authenticated or anon (service-role only).

-- ---------------------------------------------------------------------------
-- 2. Extend teacher_access_audit.action CHECK (class_updated + alias codes)
-- ---------------------------------------------------------------------------

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_chk;

alter table public.teacher_access_audit
  add constraint teacher_access_audit_action_chk
  check (action in (
    'grant_created',
    'grant_revoked',
    'grant_expired',
    'pin_rotated',
    'username_rotated',
    'magic_link_sent',
    'magic_link_consumed',
    'magic_link_expired',
    'guardian_login_success',
    'guardian_login_failed',
    'guardian_logout',
    'teacher_link_created',
    'teacher_link_archived',
    'teacher_onboarded',
    'class_created',
    'class_archived',
    'class_updated',
    'class_member_added',
    'class_member_removed',
    'viewed_student_report',
    'viewed_class_report',
    'link_created',
    'link_archived',
    'link_consent_failed',
    'link_limit_reached',
    'consent_issued',
    'consent_revoked'
  ));

commit;

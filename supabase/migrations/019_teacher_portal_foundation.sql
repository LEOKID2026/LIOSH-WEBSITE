-- Teacher Portal foundation schema (Phase 3.5).
-- Converted from docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md
-- RLS policies are in 020_teacher_portal_rls.sql (apply after this file).
--
-- Invariants:
--   - students.parent_id is NOT modified.
--   - No teacher-side student creation schema.
--   - No changes to parent/student/copilot existing tables (FK refs to students + auth.users only).
--   - teacher_limits rows are created by POST /api/teacher/onboard (not seeded per teacher).
--   - student_guardian_access.expires_at defaults to NULL; 30-day default is API-layer (Phase 8).

begin;

-- ---------------------------------------------------------------------------
-- 1. teacher_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_profiles (
  id                  uuid        primary key
                                  references auth.users (id) on delete cascade,
  display_name        text        null
                                  check (display_name is null
                                         or char_length(display_name) <= 80),
  preferred_language  text        null
                                  check (preferred_language is null
                                         or char_length(preferred_language) <= 16),
  school_id           uuid        null,
  is_active           boolean     not null default true,
  archived_at         timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.teacher_profiles.school_id is
  'Reserved for future school accounts (Phase 10+). No FK until school_orgs exists.';

create index if not exists teacher_profiles_active_idx
  on public.teacher_profiles (id)
  where is_active is true and archived_at is null;

-- ---------------------------------------------------------------------------
-- 2. teacher_students (non-owning link; does not replace students.parent_id)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_students (
  id            uuid        primary key default gen_random_uuid(),
  teacher_id    uuid        not null
                            references public.teacher_profiles (id) on delete cascade,
  student_id    uuid        not null
                            references public.students (id) on delete cascade,
  relationship  text        not null default 'primary_teacher'
                            check (relationship in (
                              'primary_teacher',
                              'subject_teacher',
                              'tutor',
                              'observer'
                            )),
  notes         text        null
                            check (notes is null or char_length(notes) <= 500),
  archived_at   timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists teacher_students_active_unique_idx
  on public.teacher_students (teacher_id, student_id)
  where archived_at is null;

create index if not exists teacher_students_teacher_id_idx
  on public.teacher_students (teacher_id)
  where archived_at is null;

create index if not exists teacher_students_student_id_idx
  on public.teacher_students (student_id)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- 3. teacher_classes
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_classes (
  id              uuid        primary key default gen_random_uuid(),
  teacher_id      uuid        not null
                              references public.teacher_profiles (id) on delete cascade,
  name            text        not null
                              check (char_length(name) between 1 and 80),
  grade_level     text        null
                              check (grade_level is null
                                     or char_length(grade_level) <= 32),
  subject_focus   text        null
                              check (subject_focus is null
                                     or char_length(subject_focus) <= 64),
  color_hint      text        null
                              check (color_hint is null
                                     or char_length(color_hint) <= 16),
  is_archived     boolean     not null default false,
  archived_at     timestamptz null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists teacher_classes_teacher_id_active_idx
  on public.teacher_classes (teacher_id)
  where is_archived is false and archived_at is null;

-- ---------------------------------------------------------------------------
-- 4. teacher_class_students
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_class_students (
  id          uuid        primary key default gen_random_uuid(),
  class_id    uuid        not null
                          references public.teacher_classes (id) on delete cascade,
  student_id  uuid        not null
                          references public.students (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  removed_at  timestamptz null
);

create unique index if not exists teacher_class_students_active_unique_idx
  on public.teacher_class_students (class_id, student_id)
  where removed_at is null;

create index if not exists teacher_class_students_class_id_idx
  on public.teacher_class_students (class_id)
  where removed_at is null;

create index if not exists teacher_class_students_student_id_idx
  on public.teacher_class_students (student_id)
  where removed_at is null;

-- ---------------------------------------------------------------------------
-- 5. teacher_plans (catalogue; class_limit = 0 is valid per owner decision)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_plans (
  code           text        primary key
                             check (char_length(code) between 3 and 64),
  display_name   text        not null
                             check (char_length(display_name) between 1 and 120),
  student_limit  integer     null
                             check (student_limit is null or student_limit >= 0),
  class_limit    integer     null
                             check (class_limit is null or class_limit >= 0),
  description    text        null
                             check (description is null
                                    or char_length(description) <= 500),
  is_active      boolean     not null default true,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

insert into public.teacher_plans
  (code, display_name, student_limit, class_limit, description, is_active, sort_order)
values
  (
    'teacher_basic_20',
    'Teacher Basic (20 students)',
    20,
    5,
    'Default plan for new teachers. Up to 20 students and 5 classes.',
    true,
    10
  ),
  (
    'teacher_pro_50',
    'Teacher Pro (50 students)',
    50,
    15,
    'Expanded plan for power users. Up to 50 students and 15 classes.',
    true,
    20
  ),
  (
    'teacher_school_unlimited',
    'School (unlimited)',
    null,
    null,
    'Placeholder for future school-tier accounts. NULL means unlimited. Not assignable until school onboarding is approved.',
    true,
    90
  )
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 6. teacher_limits (per-teacher; row inserted by /api/teacher/onboard only)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_limits (
  teacher_id              uuid        primary key
                                      references public.teacher_profiles (id) on delete cascade,
  plan_code               text        not null
                                      references public.teacher_plans (code),
  student_limit_override  integer     null
                                      check (student_limit_override is null
                                             or student_limit_override >= 0),
  class_limit_override    integer     null
                                      check (class_limit_override is null
                                             or class_limit_override >= 0),
  effective_until         timestamptz null,
  notes                   text        null
                                      check (notes is null
                                             or char_length(notes) <= 500),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists teacher_limits_plan_code_idx
  on public.teacher_limits (plan_code);

-- ---------------------------------------------------------------------------
-- 7. student_guardian_access (teacher-issued; ON DELETE RESTRICT on teacher)
-- ---------------------------------------------------------------------------

create table if not exists public.student_guardian_access (
  id                        uuid        primary key default gen_random_uuid(),
  student_id                uuid        not null
                                        references public.students (id) on delete cascade,
  created_by_teacher_id       uuid        not null
                                        references public.teacher_profiles (id) on delete restrict,
  login_username            text        not null
                                        check (char_length(login_username) between 3 and 24),
  login_username_normalized text        not null
                                        check (char_length(login_username_normalized) between 3 and 24),
  code_hash                 text        not null
                                        check (char_length(code_hash) between 16 and 200),
  pin_hash                  text        not null
                                        check (char_length(pin_hash) between 16 and 200),
  delivery_channel          text        not null default 'code'
                                        check (delivery_channel in (
                                          'code',
                                          'magic_link',
                                          'email_invite'
                                        )),
  is_active                 boolean     not null default true,
  expires_at                timestamptz null,
  revoked_at                timestamptz null,
  revoked_by_teacher_id     uuid        null
                                        references public.teacher_profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint student_guardian_access_username_normalized_lower_chk
    check (login_username_normalized = lower(btrim(login_username)))
);

comment on column public.student_guardian_access.expires_at is
  'NULL = until revoked. Default 30-day expiry is set by API on create (not a DB default).';

create unique index if not exists student_guardian_access_active_username_idx
  on public.student_guardian_access (login_username_normalized)
  where is_active is true and revoked_at is null;

create index if not exists student_guardian_access_student_id_idx
  on public.student_guardian_access (student_id)
  where is_active is true and revoked_at is null;

create index if not exists student_guardian_access_teacher_id_idx
  on public.student_guardian_access (created_by_teacher_id);

-- ---------------------------------------------------------------------------
-- 8. student_guardian_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.student_guardian_sessions (
  id                  uuid        primary key default gen_random_uuid(),
  guardian_access_id  uuid        not null
                                  references public.student_guardian_access (id) on delete cascade,
  session_token_hash  text        not null
                                  check (char_length(session_token_hash) between 16 and 200),
  user_agent          text        null
                                  check (user_agent is null
                                         or char_length(user_agent) <= 500),
  ip_hash             text        null
                                  check (ip_hash is null
                                         or char_length(ip_hash) between 16 and 200),
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  last_seen_at        timestamptz null,
  revoked_at          timestamptz null
);

create index if not exists student_guardian_sessions_access_idx
  on public.student_guardian_sessions (guardian_access_id)
  where revoked_at is null;

create unique index if not exists student_guardian_sessions_token_active_idx
  on public.student_guardian_sessions (session_token_hash)
  where revoked_at is null;

create index if not exists student_guardian_sessions_expires_idx
  on public.student_guardian_sessions (expires_at)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- 9. teacher_access_audit (append-only; polymorphic actor_id)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_access_audit (
  id                  uuid        primary key default gen_random_uuid(),
  teacher_id          uuid        null
                                  references public.teacher_profiles (id) on delete set null,
  student_id          uuid        null
                                  references public.students (id) on delete set null,
  guardian_access_id  uuid        null
                                  references public.student_guardian_access (id) on delete set null,
  action              text        not null
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
                                    'class_created',
                                    'class_archived',
                                    'class_member_added',
                                    'class_member_removed',
                                    'viewed_student_report',
                                    'viewed_class_report',
                                    'link_created',
                                    'link_archived',
                                    'link_consent_failed',
                                    'link_limit_reached',
                                    'teacher_onboarded'
                                  )),
  actor_role          text        not null
                                  check (actor_role in ('teacher', 'guardian', 'system')),
  actor_id            uuid        null,
  metadata            jsonb       not null default '{}'::jsonb,
  ip_hash             text        null
                                  check (ip_hash is null
                                         or char_length(ip_hash) between 16 and 200),
  user_agent          text        null
                                  check (user_agent is null
                                         or char_length(user_agent) <= 500),
  created_at          timestamptz not null default now(),
  constraint teacher_access_audit_actor_role_actor_id_chk
    check (
      (actor_role = 'system' and actor_id is null)
      or (actor_role = 'teacher' and actor_id is not null)
      or (actor_role = 'guardian' and actor_id is not null)
    )
);

comment on column public.teacher_access_audit.metadata is
  'Structured context only. Application deny-list must reject: pin, pin_plain, token, token_plain, magic_link, password, email, parent_email, full_name, ip, ip_address. Optional: ip_hash, user_agent, delivery_channel, username (guardian login name, not parent email).';

comment on table public.teacher_access_audit is
  'Append-only. No authenticated INSERT/UPDATE/DELETE policies (see 020). actor_id row existence validated in app layer; optional AFTER INSERT trigger may be added later.';

create index if not exists teacher_access_audit_teacher_idx
  on public.teacher_access_audit (teacher_id, created_at desc);

create index if not exists teacher_access_audit_student_idx
  on public.teacher_access_audit (student_id, created_at desc);

create index if not exists teacher_access_audit_guardian_access_idx
  on public.teacher_access_audit (guardian_access_id, created_at desc);

create index if not exists teacher_access_audit_action_idx
  on public.teacher_access_audit (action, created_at desc);

create index if not exists teacher_access_audit_created_at_idx
  on public.teacher_access_audit (created_at desc);

-- ---------------------------------------------------------------------------
-- 10. teacher_access_invitations (optional magic-link bootstrap)
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_access_invitations (
  id                          uuid        primary key default gen_random_uuid(),
  student_id                  uuid        not null
                                            references public.students (id) on delete cascade,
  teacher_id                  uuid        not null
                                            references public.teacher_profiles (id) on delete cascade,
  token_hash                  text        not null
                                            check (char_length(token_hash) between 16 and 200),
  delivery_email_hint         text        null
                                            check (delivery_email_hint is null
                                                   or char_length(delivery_email_hint) <= 200),
  expires_at                  timestamptz not null,
  consumed_at                 timestamptz null,
  consumed_guardian_access_id uuid        null
                                            references public.student_guardian_access (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index if not exists teacher_access_invitations_token_idx
  on public.teacher_access_invitations (token_hash);

create index if not exists teacher_access_invitations_student_idx
  on public.teacher_access_invitations (student_id, created_at desc);

create index if not exists teacher_access_invitations_teacher_idx
  on public.teacher_access_invitations (teacher_id, created_at desc);

create index if not exists teacher_access_invitations_unconsumed_idx
  on public.teacher_access_invitations (consumed_at)
  where consumed_at is null;

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at from 001)
-- ---------------------------------------------------------------------------

drop trigger if exists trg_teacher_profiles_set_updated_at on public.teacher_profiles;
create trigger trg_teacher_profiles_set_updated_at
before update on public.teacher_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teacher_students_set_updated_at on public.teacher_students;
create trigger trg_teacher_students_set_updated_at
before update on public.teacher_students
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teacher_classes_set_updated_at on public.teacher_classes;
create trigger trg_teacher_classes_set_updated_at
before update on public.teacher_classes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teacher_plans_set_updated_at on public.teacher_plans;
create trigger trg_teacher_plans_set_updated_at
before update on public.teacher_plans
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teacher_limits_set_updated_at on public.teacher_limits;
create trigger trg_teacher_limits_set_updated_at
before update on public.teacher_limits
for each row
execute function public.set_updated_at();

drop trigger if exists trg_student_guardian_access_set_updated_at on public.student_guardian_access;
create trigger trg_student_guardian_access_set_updated_at
before update on public.student_guardian_access
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teacher_access_invitations_set_updated_at on public.teacher_access_invitations;
create trigger trg_teacher_access_invitations_set_updated_at
before update on public.teacher_access_invitations
for each row
execute function public.set_updated_at();

commit;

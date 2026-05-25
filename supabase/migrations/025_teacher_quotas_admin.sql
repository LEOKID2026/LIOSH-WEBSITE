-- Teacher quotas, admin audit, and future school manager stubs (Phase Q1–Q5).
-- OWNER MUST APPLY MANUALLY — do not run via agent/CI against production.
--
-- Active business rules after apply:
--   max_students_per_class = 40 for all plans (only hard limit in this phase)
--   student_limit = NULL, class_limit = NULL (unlimited total students and classes)

begin;

-- ---------------------------------------------------------------------------
-- 1. teacher_plans: per-class cap + disable legacy total limits
-- ---------------------------------------------------------------------------

alter table public.teacher_plans
  add column if not exists max_students_per_class integer null
    check (max_students_per_class is null or max_students_per_class >= 1);

update public.teacher_plans
set max_students_per_class = 40;

update public.teacher_plans
set student_limit = null,
    class_limit = null;

-- ---------------------------------------------------------------------------
-- 2. teacher_limits: overrides, feature flags, account active flag
-- ---------------------------------------------------------------------------

-- NULL max_students_per_class_override = no override; app resolves via teacher_plans (40).
-- It does NOT mean unlimited per class. Explicit unlimited requires a future dedicated field.
alter table public.teacher_limits
  add column if not exists max_students_per_class_override integer null
    check (max_students_per_class_override is null or max_students_per_class_override >= 1),
  add column if not exists feature_flags jsonb not null default '{}',
  add column if not exists is_account_active boolean not null default true;

-- ---------------------------------------------------------------------------
-- 3. admin_audit_log (service-role only; RLS on, no authenticated policies)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  admin_user_id uuid        not null,
  target_type   text        not null
                            check (target_type in ('teacher')),
  target_id     uuid        not null,
  action        text        not null,
  before_state  jsonb       null,
  after_state   jsonb       null,
  notes         text        null,
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);

create index if not exists admin_audit_log_admin_idx
  on public.admin_audit_log (admin_user_id);

alter table public.admin_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Future school manager stubs (empty; no business logic in this phase)
-- ---------------------------------------------------------------------------

create table if not exists public.school_accounts (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  country_code text        null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.school_teacher_memberships (
  id          uuid        primary key default gen_random_uuid(),
  school_id   uuid        not null
                          references public.school_accounts (id) on delete cascade,
  teacher_id  uuid        not null
                          references public.teacher_profiles (id) on delete cascade,
  role        text        not null default 'teacher'
                          check (role in ('teacher', 'school_admin')),
  joined_at   timestamptz not null default now(),
  unique (school_id, teacher_id)
);

-- Future-use tables: RLS on, no authenticated policies (service-role only, same as admin_audit_log).
alter table public.school_accounts enable row level security;
alter table public.school_teacher_memberships enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_profiles_school_id_fk'
      and conrelid = 'public.teacher_profiles'::regclass
  ) then
    alter table public.teacher_profiles
      add constraint teacher_profiles_school_id_fk
      foreign key (school_id) references public.school_accounts (id) on delete set null;
  end if;
end $$;

commit;

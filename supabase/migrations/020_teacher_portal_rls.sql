-- Teacher Portal RLS (Phase 3.5).
-- Converted from docs/teacher-portal/RLS_SECURITY_PROPOSAL.md
-- Requires 019_teacher_portal_foundation.sql applied first.
--
-- Security posture (owner correction, apply-ready):
--   Client/browser (authenticated) may SELECT own-scoped rows where needed for UI.
--   All mutations on teacher_students, teacher_classes, and teacher_class_students
--   are service-role-only via /api/teacher/* (consent, limits, audit, cascades).
--   teacher_profiles: SELECT only from client; INSERT/UPDATE via service role
--   (/api/teacher/onboard and future profile API).
--
-- Does NOT add or change RLS on: students, parent_profiles, learning_sessions,
-- answers, student_access_codes, student_sessions, or any other existing table.

begin;

-- ---------------------------------------------------------------------------
-- Category A: client read-only + service-role mutations
-- (teacher JWT, auth.uid() = teacher_profiles.id)
-- ---------------------------------------------------------------------------

alter table public.teacher_profiles enable row level security;

drop policy if exists teacher_profiles_select_own on public.teacher_profiles;
create policy teacher_profiles_select_own
  on public.teacher_profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Removed: teacher_profiles_update_own (client UPDATE bypasses onboarding/audit gates).
drop policy if exists teacher_profiles_update_own on public.teacher_profiles;

-- No INSERT / UPDATE / DELETE for authenticated.
-- INSERT + profile fields: service role (/api/teacher/onboard).

alter table public.teacher_students enable row level security;

drop policy if exists teacher_students_select_own on public.teacher_students;
create policy teacher_students_select_own
  on public.teacher_students
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- Removed: client mutations would bypass consent, limits, audit, guardian cascade.
drop policy if exists teacher_students_update_own on public.teacher_students;
drop policy if exists teacher_students_delete_own on public.teacher_students;

-- No INSERT / UPDATE / DELETE for authenticated.
-- Link:   service role /api/teacher/students/link (consent token required).
-- Unlink: service role /api/teacher/students/unlink (archive + side effects).

alter table public.teacher_classes enable row level security;

drop policy if exists teacher_classes_full_own on public.teacher_classes;
drop policy if exists teacher_classes_select_own on public.teacher_classes;
create policy teacher_classes_select_own
  on public.teacher_classes
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- No INSERT / UPDATE / DELETE for authenticated.
-- Create / update / archive: service role /api/teacher/classes/* (class_limit, audit).

alter table public.teacher_class_students enable row level security;

drop policy if exists teacher_class_students_select_via_owned_class on public.teacher_class_students;
create policy teacher_class_students_select_via_owned_class
  on public.teacher_class_students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.teacher_classes c
      where c.id = teacher_class_students.class_id
        and c.teacher_id = auth.uid()
    )
  );

-- Removed: client mutations would bypass teacher_students link check, audit, API gates.
drop policy if exists teacher_class_students_insert_via_owned_class_and_link on public.teacher_class_students;
drop policy if exists teacher_class_students_update_via_owned_class on public.teacher_class_students;
drop policy if exists teacher_class_students_delete_via_owned_class on public.teacher_class_students;

-- No INSERT / UPDATE / DELETE for authenticated.
-- Add / remove membership: service role /api/teacher/classes/[classId]/members/*.

alter table public.teacher_plans enable row level security;

drop policy if exists teacher_plans_select_active on public.teacher_plans;
create policy teacher_plans_select_active
  on public.teacher_plans
  for select
  to authenticated
  using (is_active is true);

-- No INSERT / UPDATE / DELETE for authenticated.

alter table public.teacher_limits enable row level security;

drop policy if exists teacher_limits_select_own on public.teacher_limits;
create policy teacher_limits_select_own
  on public.teacher_limits
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- No INSERT / UPDATE / DELETE for authenticated (onboard + admin via service role).

-- ---------------------------------------------------------------------------
-- Category B: server-only tables (RLS on, no policies for anon/authenticated)
-- Same posture as parent_policy_acceptances (018) and student_learning_state (017).
-- ---------------------------------------------------------------------------

alter table public.student_guardian_access enable row level security;

alter table public.student_guardian_sessions enable row level security;

alter table public.teacher_access_audit enable row level security;

alter table public.teacher_access_invitations enable row level security;

comment on table public.student_guardian_access is
  'RLS enabled; no client policies. All access via service role (/api/teacher/student-access/*, /api/guardian/login).';

comment on table public.student_guardian_sessions is
  'RLS enabled; no client policies. Guardian session via service role only.';

comment on table public.teacher_access_audit is
  'RLS enabled; no client policies. Append-only via service role. No authenticated INSERT/UPDATE/DELETE.';

comment on table public.teacher_access_invitations is
  'RLS enabled; no client policies. Magic-link tokens via service role only.';

commit;

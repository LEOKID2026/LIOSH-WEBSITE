# 019 Teacher Portal Foundation — Phase 1 SQL Proposal (markdown)

> **Phase 1 deliverable. Proposal-only artifact. Not an executable migration file.**
>
> This document contains the proposed forward schema for the Teacher Portal as fenced ```sql blocks for review. It is a planning artifact placed under `docs/teacher-portal/sql-proposals/` so that no Supabase tooling will ever discover it as a migration. It is **not** a SQL file. It is **not** placed under `supabase/migrations/`. No SQL has been or will be run against any environment as part of Phase 1.
>
> See [`docs/teacher-portal/TEACHER_PORTAL_MASTER_PLAN.md`](../TEACHER_PORTAL_MASTER_PLAN.md) for the master plan that approved this phase.

## Hard boundaries (in force right now)

- Do **not** create or move a `.sql` file out of this proposal — this document is markdown.
- Do **not** copy the SQL blocks into `supabase/migrations/`.
- Do **not** execute any of these blocks against any environment (local, staging, production).
- Do **not** change RLS policies in this phase. RLS is Phase 2. This document lists *intent and assumptions* only.
- Do **not** change `students.parent_id` in this phase. The deferred section at the bottom enumerates the options without choosing one.
- Do **not** add product code, routes, APIs, middleware, or UI strings.
- Do **not** modify Hebrew text, RTL layout, design, or content.
- **No commit, no push.** Created/updated locally only. The owner commits manually.

## Approval rule (still gated)

- Approval of Phase 1 (this document) does **not** approve Phase 2 (RLS), Phase 3 (API contracts), or any implementation phase.
- Owner must give specific written approval per phase. Phases run strictly in order.

## Design notes — high level

- All identifiers in English; schema is `public` to match existing tables.
- `students.parent_id` is **left unchanged**. Teacher-side student management in Phase 5 is **link-only** to existing students that already have a parent owner. Teacher-side student *creation* is deferred to a future phase that requires its own approval and a full impact audit (see "Deferred section: `students.parent_id`").
- Soft-delete pattern: `archived_at timestamptz` on entity tables, `removed_at timestamptz` on membership tables. Hard `DELETE` is reserved for cascade from `auth.users` (teacher account purge) or `students` (parent-driven RPC).
- Hash columns use HMAC-SHA256 with `LEARNING_STUDENT_ACCESS_SECRET` to mirror the existing `student_access_codes` pattern. No plaintext credentials are ever stored.
- Timestamps are `timestamptz`, default `now()`. `updated_at` maintenance via Phase 2 trigger (matching the parent-side trigger pattern in `001_learning_core_foundation.sql`).
- Every new table will have RLS enabled in Phase 2. This document does **not** include `CREATE POLICY` statements.
- `pgcrypto` is assumed already enabled (existing migrations use `gen_random_uuid()`).
- Migration filename is reserved as `019_teacher_portal_foundation.sql` for a future Phase-1.5 (under separate approval) when this proposal is converted into a real migration. **That conversion is not part of Phase 1.**

## Naming conventions

- Tables: `snake_case`, plural nouns (e.g. `teacher_profiles`).
- Foreign keys: `<entity>_id` (e.g. `teacher_id`).
- Boolean flags: `is_<state>` (e.g. `is_active`).
- Soft-delete columns: `archived_at` (entity tables) or `removed_at` (membership tables).
- Hash columns: `<thing>_hash` (e.g. `code_hash`).
- Indexes: `<table>_<columns>_idx`.

---

## 1. `teacher_profiles`

App-side profile row for each teacher Supabase Auth user. Mirrors `parent_profiles` from [`001_learning_core_foundation.sql`](../../../supabase/migrations/001_learning_core_foundation.sql).

- **Identity**: reuses Supabase Auth (`auth.users`). The presence of a row in this table is what makes a Supabase Auth user "a teacher" in this app.
- **Provisioning**: explicit server-side `INSERT` from `POST /api/teacher/onboard` (Phase 4). **Not** via an `auth.users` trigger, to keep the existing parent-profile trigger untouched.
- **Ownership**: 1:1 with `auth.users`.
- **Soft-delete**: `archived_at`. Hard delete only via cascade from `auth.users`.

```sql
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
  -- ^ Reserved for Phase 10+ (school accounts).
  --   No FK yet; school_orgs table does not exist.
  is_active           boolean     not null default true,
  archived_at         timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists teacher_profiles_active_idx
  on public.teacher_profiles (id)
  where is_active is true and archived_at is null;
```

**RLS intent (Phase 2):**

- `SELECT` / `UPDATE` own row: `id = auth.uid()`.
- No `INSERT` policy for clients; insert via service role from `/api/teacher/onboard`.
- No `DELETE` policy for clients; archive via `UPDATE archived_at = now()`.

**Future expansion notes:**

- Add real FK on `school_id` once `school_orgs` table exists.
- Add `phone_e164 text null` if the owner approves teacher OTP/MFA.
- Add `default_class_id uuid null` if the owner wants a "current class" pin.

---

## 2. `teacher_students`

Many-to-many link between teachers and students. **Non-owning** relation. Does **not** replace `students.parent_id`.

- A student remains owned by their parent (`students.parent_id`). A teacher row here grants the teacher **read access** to that student's reports and **management access** to teacher-side metadata (class membership, guardian access, audit), nothing more.
- Soft-delete via `archived_at`. Re-link is permitted (a teacher who unlinks and re-links sees a fresh `archived_at = null` row inserted; the prior row stays for audit).

```sql
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

-- Active link uniqueness: a given (teacher, student) pair has at most ONE active row.
create unique index if not exists teacher_students_active_unique_idx
  on public.teacher_students (teacher_id, student_id)
  where archived_at is null;

create index if not exists teacher_students_teacher_id_idx
  on public.teacher_students (teacher_id)
  where archived_at is null;

create index if not exists teacher_students_student_id_idx
  on public.teacher_students (student_id)
  where archived_at is null;
```

**RLS intent (Phase 2):**

- Teacher SELECT/INSERT/UPDATE/DELETE own rows: `teacher_id = auth.uid()`.
- No parent or student visibility into this table via RLS — teacher rosters are private to the teacher.
- API gate: an `INSERT` requires the student to already exist (Phase 1 = link-only, no teacher-side student creation).

**Future expansion notes:**

- Add `linked_via text` (`teacher_invite`, `parent_consent`, `school_roster`) when consent flow is designed.
- Add `parent_consent_state text` if the owner decides parent must opt-in (open question — see master plan).

---

## 3. `teacher_classes`

A teacher's logical class or group. Independent from any school structure.

```sql
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
  -- ^ Reserved UI badge color hint; rendering is a Phase 5+ decision.
  is_archived     boolean     not null default false,
  archived_at     timestamptz null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists teacher_classes_teacher_id_active_idx
  on public.teacher_classes (teacher_id)
  where is_archived is false and archived_at is null;
```

**RLS intent (Phase 2):**

- Full CRUD where `teacher_id = auth.uid()`.
- No cross-teacher visibility.

**Future expansion notes:**

- Add `school_id uuid null` when school accounts arrive (Phase 10+).
- Add `term_start_at` / `term_end_at` if the owner wants term-bounded classes.

---

## 4. `teacher_class_students`

Membership of a student in a teacher's class. A student can be a member of zero, one, or multiple classes (within the same teacher) and across multiple teachers' classes.

```sql
create table if not exists public.teacher_class_students (
  id          uuid        primary key default gen_random_uuid(),
  class_id    uuid        not null
                          references public.teacher_classes (id) on delete cascade,
  student_id  uuid        not null
                          references public.students (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  removed_at  timestamptz null
);

-- Active membership uniqueness.
create unique index if not exists teacher_class_students_active_unique_idx
  on public.teacher_class_students (class_id, student_id)
  where removed_at is null;

create index if not exists teacher_class_students_class_id_idx
  on public.teacher_class_students (class_id)
  where removed_at is null;

create index if not exists teacher_class_students_student_id_idx
  on public.teacher_class_students (student_id)
  where removed_at is null;
```

**RLS intent (Phase 2):**

- Teacher full CRUD where the parent class belongs to them (join via `teacher_classes.teacher_id = auth.uid()`).
- API-layer invariant: a student may only be added if a corresponding active `teacher_students` link exists for the same teacher (enforced in API in Phase 3, optionally hardened by a check trigger in Phase 2).

---

## 5. `teacher_plans`

Plan catalogue. Static-ish, owner-managed. Used by `teacher_limits` to compute the effective student / class cap for a teacher.

- **NULL semantics**: `student_limit IS NULL` means "no limit" (used for the school-tier placeholder). `class_limit` follows the same rule. Application code resolves `null → unlimited`; never writes a sentinel like `-1` or `999999`.

```sql
create table if not exists public.teacher_plans (
  code           text        primary key
                             check (char_length(code) between 3 and 64),
  display_name   text        not null
                             check (char_length(display_name) between 1 and 120),
  -- ^ Internal admin-facing label. NOT a Hebrew UI string.
  --   All user-visible Hebrew copy stays out of the DB until owner-approved
  --   and is supplied by the app layer in a future phase.
  student_limit  integer     null
                             check (student_limit is null
                                    or student_limit >= 0),
  class_limit    integer     null
                             check (class_limit is null
                                    or class_limit >= 0),
  description    text        null
                             check (description is null
                                    or char_length(description) <= 500),
  is_active      boolean     not null default true,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

**Seed data proposal** (admin-facing English labels only — UI Hebrew copy is out of scope for Phase 1):

```sql
insert into public.teacher_plans
  (code, display_name, student_limit, class_limit, description, is_active, sort_order)
values
  ('teacher_basic_20',
   'Teacher Basic (20 students)',
   20,
   5,
   'Default plan for new teachers. Up to 20 students and 5 classes.',
   true,
   10),
  ('teacher_pro_50',
   'Teacher Pro (50 students)',
   50,
   15,
   'Expanded plan for power users. Up to 50 students and 15 classes.',
   true,
   20),
  ('teacher_school_unlimited',
   'School (unlimited)',
   null,
   null,
   'Placeholder for future school-tier accounts. NULL means unlimited. Not assignable until school onboarding is approved (Phase 10+).',
   true,
   90)
on conflict (code) do nothing;
```

**RLS intent (Phase 2):**

- `SELECT` allowed to any authenticated teacher.
- No `INSERT` / `UPDATE` / `DELETE` for clients; admin-only via service role.

**Future expansion notes:**

- Add `pricing_cents int null` and `billing_period text null` if/when paid plans arrive.
- Add `feature_flags jsonb` if plan-gated features are introduced.

---

## 6. `teacher_limits`

Per-teacher overrides on top of `teacher_plans`. Optional row; absence means "use plan defaults".

- **Resolution helper** (Phase 3, planned in `lib/teacher-server/teacher-limits.server.js`): `resolveTeacherStudentLimit(teacherId)` returns:
  1. `teacher_limits.student_limit_override` if not null and the override is still effective (`effective_until is null or effective_until > now()`),
  2. otherwise `teacher_plans.student_limit` for the assigned `plan_code`,
  3. otherwise the system default `20` (constant in code, not in DB).
- Mirrors the parent helper [`resolveParentStudentLimit`](../../../lib/parent-server/parent-student-limit.server.js).

```sql
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
```

**RLS intent (Phase 2):**

- Teacher `SELECT` own row by `teacher_id = auth.uid()`.
- No client `INSERT` / `UPDATE` / `DELETE`; written via service role only (admin or onboarding default-row creation).

**Future expansion notes:**

- Add `granted_by_admin_user_id uuid null` once an admin persona is built.
- Add `reason text null` for audit clarity on overrides.

---

## 7. `student_guardian_access`

Teacher-issued, **child-scoped** guardian credential. Every row grants exactly one parent/guardian human read-only access to **exactly one** student's report.

- This is **not** a `parent_profiles` row. The guardian who logs in via this credential is **not** in `auth.users`. They authenticate via a separate cookie session (`student_guardian_sessions`) and can only call `/api/guardian/*` endpoints.
- **Hard invariant**: exactly one `student_id` per row. There is no array column, no join table. A multi-child guardian view is out of scope and would require a separate, owner-approved phase.
- Hash columns mirror [`student_access_codes`](../../../supabase/migrations/001_learning_core_foundation.sql) (HMAC-SHA256 with `LEARNING_STUDENT_ACCESS_SECRET`). Plaintext PIN/username is shown to the teacher exactly once at creation/rotation and never persisted.

```sql
create table if not exists public.student_guardian_access (
  id                       uuid        primary key default gen_random_uuid(),
  student_id               uuid        not null
                                       references public.students (id) on delete cascade,
  created_by_teacher_id    uuid        not null
                                       references public.teacher_profiles (id) on delete restrict,
  -- ^ ON DELETE RESTRICT: a teacher cannot be hard-deleted while they have
  --   active guardian-access rows. Use archive (teacher_profiles.archived_at)
  --   plus a service-role cleanup pass that revokes the access rows first.
  --   This protects the audit trail from dangling references.

  login_username           text        not null
                                       check (char_length(login_username) between 3 and 24),
  login_username_normalized text       not null
                                       check (login_username_normalized = lower(login_username_normalized)
                                              and char_length(login_username_normalized) between 3 and 24),
  -- ^ Lowercased copy used for global uniqueness checks among ACTIVE rows.
  --   Verification at login still goes through code_hash; this column exists
  --   solely to enforce the uniqueness constraint via a partial unique index.

  code_hash                text        not null
                                       check (char_length(code_hash) between 16 and 200),
  -- ^ HMAC-SHA256(login_username_normalized, secret).
  pin_hash                 text        not null
                                       check (char_length(pin_hash) between 16 and 200),
  -- ^ HMAC-SHA256(pin, secret). PIN is digits-only, length 4 (Phase 3 will
  --   document exact normalization rule, mirroring student PIN handling).

  delivery_channel         text        not null default 'code'
                                       check (delivery_channel in (
                                         'code',         -- handed to parent out-of-band
                                         'magic_link',   -- bootstrapped via teacher_access_invitations
                                         'email_invite'  -- future, requires email-of-record
                                       )),

  is_active                boolean     not null default true,
  expires_at               timestamptz null,
  -- ^ NULL = "until revoked". Phase 8 may default to a 30-day expiry from
  --   the API layer without touching the schema.

  revoked_at               timestamptz null,
  revoked_by_teacher_id    uuid        null
                                       references public.teacher_profiles (id) on delete set null,
  -- ^ Captures who revoked. ON DELETE SET NULL preserves history if the
  --   acting teacher is later archived/removed.

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Active-username uniqueness (global). Two rows may share a username only
-- if at least one of them is inactive or revoked.
create unique index if not exists student_guardian_access_active_username_idx
  on public.student_guardian_access (login_username_normalized)
  where is_active is true and revoked_at is null;

create index if not exists student_guardian_access_student_id_idx
  on public.student_guardian_access (student_id)
  where is_active is true and revoked_at is null;

create index if not exists student_guardian_access_teacher_id_idx
  on public.student_guardian_access (created_by_teacher_id);
```

**RLS intent (Phase 2):**

- RLS enabled, **no client policies** — server-only via service role. Mirrors the closed posture of [`017_student_learning_state.sql`](../../../supabase/migrations/017_student_learning_state.sql) and [`018_parent_policy_acceptances.sql`](../../../supabase/migrations/018_parent_policy_acceptances.sql).
- All reads/writes go through `/api/teacher/student-access/*` (teacher-side) and `/api/guardian/login` (login verification only).
- Neither the parent nor the guardian themselves can `SELECT` this table directly.

**Future expansion notes:**

- Add `last_login_at timestamptz null` once the owner approves a "last seen" indicator for the teacher dashboard (purely informational; not a security mechanism).
- Add `display_label text null` for the teacher to label the access (e.g. "Mom", "Dad") — avoid storing PII like real names; Hebrew copy is out of scope for Phase 1.

---

## 8. `student_guardian_sessions`

Runtime session for a guardian who logged in via `student_guardian_access`. Mirrors `student_sessions` from `001_learning_core_foundation.sql`.

```sql
create table if not exists public.student_guardian_sessions (
  id                  uuid        primary key default gen_random_uuid(),
  guardian_access_id  uuid        not null
                                  references public.student_guardian_access (id) on delete cascade,
  session_token_hash  text        not null
                                  check (char_length(session_token_hash) between 16 and 200),
  -- ^ HMAC-SHA256(session_token, secret). Raw token only ever lives in the
  --   liosh_guardian_session HttpOnly cookie on the guardian's browser.

  user_agent          text        null
                                  check (user_agent is null
                                         or char_length(user_agent) <= 500),
  ip_hash             text        null
                                  check (ip_hash is null
                                         or char_length(ip_hash) between 16 and 200),
  -- ^ Hashed IP for abuse detection without retaining raw IP. Optional;
  --   policy decision in Phase 2.

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
```

**RLS intent (Phase 2):**

- RLS enabled, no client policies. Server-only via service role.
- Revocation cascade: a Phase 2 trigger (or app code) will set `revoked_at = now()` on every row whose parent `student_guardian_access` is revoked or expires.

**Future expansion notes:**

- Add `device_id_hash text null` if the owner approves a "trusted device" feature.
- Consider partitioning by month if session-row volume becomes significant (deferred until measured).

---

## 9. `teacher_access_audit`

Append-only audit trail for every teacher-side action that touches a student or a guardian credential, plus every guardian-side login event.

- **Append-only**: no application path issues `UPDATE` or `DELETE`. Phase 2 will encode this in RLS by enabling the table and granting no `UPDATE` / `DELETE` policy at all (service-role-only writes via `INSERT`).
- All foreign keys use `ON DELETE SET NULL` so audit history survives downstream archival / deletion of the referenced entities.

```sql
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
                                    'viewed_class_report'
                                  )),

  actor_role          text        not null
                                  check (actor_role in ('teacher', 'guardian', 'system')),
  actor_id            uuid        null,
  -- ^ teacher_profiles.id when actor_role='teacher',
  --   student_guardian_access.id when actor_role='guardian',
  --   null when actor_role='system'.
  --   No FK because the column is polymorphic; Phase 2 may add a CHECK
  --   that gates actor_id presence by actor_role.

  metadata            jsonb       not null default '{}'::jsonb,
  -- ^ Free-form structured context. Forbidden to store: raw PINs, raw
  --   tokens, raw IPs, parent emails, full names. Use hashes/labels.

  ip_hash             text        null
                                  check (ip_hash is null
                                         or char_length(ip_hash) between 16 and 200),
  user_agent          text        null
                                  check (user_agent is null
                                         or char_length(user_agent) <= 500),

  created_at          timestamptz not null default now()
);

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
```

**RLS intent (Phase 2):**

- RLS enabled, **no policies** for `authenticated` or `anon` — table is service-role-only.
- Read access for teachers will be exposed through a narrow API (`GET /api/teacher/audit`) that filters by `teacher_id = auth.uid()` server-side.

**Future expansion notes:**

- Consider quarterly partitioning when row volume justifies it.
- Add a retention policy doc in `docs/legal/` once L10 is approved.

---

## 10. `teacher_access_invitations` (optional)

Short-lived magic-link tokens that bootstrap a `student_guardian_access` row. Optional in Phase 1 — the system works without it (teacher hands the parent a username + PIN out-of-band). Including it in Phase 1 lets Phase 8 ship magic-link UX without another schema iteration.

```sql
create table if not exists public.teacher_access_invitations (
  id                            uuid        primary key default gen_random_uuid(),
  student_id                    uuid        not null
                                            references public.students (id) on delete cascade,
  teacher_id                    uuid        not null
                                            references public.teacher_profiles (id) on delete cascade,
  token_hash                    text        not null
                                            check (char_length(token_hash) between 16 and 200),
  -- ^ HMAC-SHA256(token, secret). Raw token is delivered exactly once
  --   in the magic-link URL; never stored.

  delivery_email_hint           text        null
                                            check (delivery_email_hint is null
                                                   or char_length(delivery_email_hint) <= 200),
  -- ^ Obfuscated hint such as "p***@e***.com" for UI display only.
  --   Real parent email is NEVER stored here; the email delivery is
  --   parameterized at send time and not persisted.

  expires_at                    timestamptz not null,
  consumed_at                   timestamptz null,
  consumed_guardian_access_id   uuid        null
                                            references public.student_guardian_access (id) on delete set null,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create unique index if not exists teacher_access_invitations_token_idx
  on public.teacher_access_invitations (token_hash);

create index if not exists teacher_access_invitations_student_idx
  on public.teacher_access_invitations (student_id, created_at desc);

create index if not exists teacher_access_invitations_teacher_idx
  on public.teacher_access_invitations (teacher_id, created_at desc);

-- Active (un-consumed, un-expired) lookup helper. Note: this index alone
-- cannot enforce time-based "active" uniqueness because expires_at is not
-- immutable in a partial-index predicate; freshness is enforced in app code.
create index if not exists teacher_access_invitations_unconsumed_idx
  on public.teacher_access_invitations (consumed_at)
  where consumed_at is null;
```

**RLS intent (Phase 2):**

- RLS enabled, server-only via service role. Same posture as `student_guardian_access`.

**Future expansion notes:**

- Add a per-token rate-limit table (or in-memory store) to throttle abusive consumption attempts.
- Add `delivered_at timestamptz null` to distinguish "generated" from "actually sent" once email/SMS delivery is wired.

---

## Deferred section: `students.parent_id` (no decision in Phase 1)

The Teacher Portal will eventually need to support a teacher who wants to onboard a student that has **no parent account** on the site (classroom student, tutoring student whose parent never signed up, etc.). The existing schema has `students.parent_id NOT NULL`, which makes that case impossible without a schema change.

**Phase 1 explicitly does NOT change this column.** Phases 4–8 are **link-only**: a teacher may only link to students that already exist with a real parent owner. The schema decision below is deferred to a separate, named follow-up phase with its own approval gate.

The three options are restated here so a future phase can be planned without re-litigating the trade-offs:

- **Option A — Virtual parent (short-term compatibility bridge).**
  - On teacher onboarding, the system provisions a hidden `parent_profiles` + `auth.users` row owned by the system. Teacher-created students are owned by that virtual parent.
  - **Pro**: zero schema change to `students`, zero risk to existing parent flows.
  - **Con**: `parent_id` no longer reliably means "the human guardian"; QA and analytics can confuse virtual and real parents; `parent_profiles` becomes polluted with non-human rows.

- **Option B — Nullable `parent_id` + `origin_teacher_id` (preferred long-term, requires audit).**
  - `alter table public.students alter column parent_id drop not null;`
  - `alter table public.students add column origin_teacher_id uuid null references public.teacher_profiles (id);`
  - Update RLS to add a parallel `students_teacher_owned` policy that allows access via `teacher_students`/`teacher_class_students` joins when `parent_id is null`.
  - **Pro**: cleanest data model.
  - **Con**: every consumer of `parent_id` must be re-audited. Known consumers (non-exhaustive):
    - RLS policies in [`001_learning_core_foundation.sql`](../../../supabase/migrations/001_learning_core_foundation.sql).
    - [`pages/api/parent/list-students.js`](../../../pages/api/parent/list-students.js).
    - [`pages/api/parent/create-student.js`](../../../pages/api/parent/create-student.js) (3-children cap relies on counting by `parent_id`).
    - [`pages/api/parent/students/[studentId]/report-data.js`](../../../pages/api/parent/students/[studentId]/report-data.js) (ownership gate).
    - [`016_parent_delete_owned_student_rpc.sql`](../../../supabase/migrations/016_parent_delete_owned_student_rpc.sql) (`auth.uid()` ownership check inside the RPC).
    - Arcade auth in `lib/arcade/server/arcade-auth.js`.
    - Student auth in `lib/learning-supabase/student-auth.js`.
    - Learning APIs (`/api/learning/*`) that join via `student_id`.
    - The legal-copy constant `NORMAL_PARENT_CHILD_LIMIT` in `data/legal/sitePolicies.he.js`.

- **Option C — Separate `teacher_only_students` table (last resort).**
  - Duplicate the entire student schema for teacher-created students.
  - **Pro**: zero risk to existing tables.
  - **Con**: enormous duplication. Every downstream system (`learning_sessions`, `answers`, `student_learning_state`, `student_access_codes`, arcade FKs, gamification) needs union views. **Effectively forbidden** unless A and B are both ruled out.

**Decision rule for Phase 1**: do not add any `ALTER TABLE` against `students` in this proposal. The `students` schema is unchanged in this document and in any phase that follows from this approval.

---

## Security notes (Phase 1 — assumptions and risks only; RLS is Phase 2)

This section lists the security posture **assumed** by this schema. **No `CREATE POLICY` statements appear in Phase 1.** Phase 2 will write the actual policies in `docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`.

### Assumed posture per table

- `teacher_profiles` — RLS enabled. Teacher reads/updates own row by `id = auth.uid()`. No client `INSERT` / `DELETE`.
- `teacher_students` — RLS enabled. Teacher full CRUD where `teacher_id = auth.uid()`. API-layer invariant: linking requires the student row to already exist with `parent_id IS NOT NULL` (link-only rule).
- `teacher_classes` — RLS enabled. Teacher full CRUD where `teacher_id = auth.uid()`.
- `teacher_class_students` — RLS enabled. Teacher full CRUD via join to owned class. API-layer invariant: membership requires an active `teacher_students` link for the same teacher.
- `teacher_plans` — RLS enabled. `SELECT` allowed to any authenticated user; no client mutations.
- `teacher_limits` — RLS enabled. Teacher `SELECT` own row; no client mutations.
- `student_guardian_access` — RLS enabled, **no client policies**. Service-role-only writes. Mirrors `parent_policy_acceptances` posture.
- `student_guardian_sessions` — RLS enabled, **no client policies**. Service-role-only.
- `teacher_access_audit` — RLS enabled, **no client policies**. Append-only via service role; teacher reads happen through a narrow filtered API.
- `teacher_access_invitations` — RLS enabled, **no client policies**. Service-role-only.

### Risks acknowledged (to be hardened in Phase 2)

- **Parent ↔ teacher data leak via student-level joins.** Phase 2 must verify that adding teacher-side select paths to `learning_sessions` / `answers` does **not** open a side-channel by which a teacher can read a student that is not in their `teacher_students` set. The current parent-side policies (`learning_sessions_parent_read_owned` etc.) must remain unchanged; a separate `*_teacher_read_via_link` policy is the planned approach, but Phase 2 must prove that the union of policies cannot be misused for IDOR.
- **Cross-teacher leakage via classes.** Two teachers must never see each other's classes. Single-tenant predicate `teacher_id = auth.uid()` covers this; Phase 2 includes an explicit unit test.
- **Guardian-session privilege escalation.** A guardian session must be unable to call any endpoint other than `/api/guardian/*` with `studentId === guardian_access.student_id`. Phase 3 / Phase 8 enforce this at the API layer; Phase 2 ensures the DB cannot be reached directly via Supabase JS (RLS deny-by-default + no client policies).
- **Audit-write trust.** All audit `INSERT`s come from the service role only. Phase 2 must avoid writing any policy that allows `authenticated` to `INSERT` into `teacher_access_audit`.
- **Soft-delete bypass.** A revoked `student_guardian_access` row must invalidate every dependent `student_guardian_sessions` row. Phase 2 will add a trigger or a service-role cleanup pass; Phase 1 only documents the requirement.
- **Username collision DoS.** The `student_guardian_access_active_username_idx` partial unique index prevents two active rows from sharing a username. Phase 3 must surface a clean conflict error rather than leaking which usernames are taken.
- **Migration filename collision.** Reserving `019_teacher_portal_foundation.sql` as a future filename means no other team member should add a `019_*.sql` to `supabase/migrations/` between now and the converted-migration phase. Track this with a small note in `docs/teacher-portal/`.

### What Phase 1 does NOT touch (security-critical)

- `parent_profiles`, `students`, `student_access_codes`, `student_sessions`, `learning_sessions`, `answers`, `student_learning_state`, `parent_policy_acceptances`, `arcade_*`, `coin_*`, `shop_items`, `student_inventory`. **Zero** schema modifications, **zero** RLS modifications.

---

## Open questions / risks before Phase 2

These are not blockers for Phase 1 approval, but Phase 2 must answer them in writing before any RLS policy is drafted.

1. **Parent consent for teacher linking.** When a teacher attempts to link a student that already has a parent account, must the parent be notified or asked to consent? Owner has flagged this as an open product question. Phase 2 RLS should not assume either answer.
2. **`teacher_limits` default row creation.** Should `teacher_limits` get an automatic row pinned to `teacher_basic_20` on teacher onboarding (cleaner querying) or stay implicit (fewer rows)? Both are workable; choose before Phase 4.
3. **`actor_id` polymorphism in `teacher_access_audit`.** Phase 2 may add a CHECK constraint that gates the column by `actor_role`, or leave it untyped. Owner choice.
4. **Magic-link rate-limit storage.** In-memory only (consistent with current copilot rate limiter) or DB-backed? Affects whether a small `teacher_access_invitation_attempts` table is needed in a future phase.
5. **IP / user-agent logging policy.** Phase 1 columns are nullable. Phase 2 should make the legal/privacy decision about what is actually written.
6. **Teacher hard-delete cascade.** `student_guardian_access.created_by_teacher_id` is `ON DELETE RESTRICT`. Confirm this is acceptable: a teacher row cannot be hard-deleted without a service-role pass that revokes their guardian-access rows first. Alternative is `ON DELETE SET NULL` with a follow-up backfill from the audit table.
7. **Archived link reactivation semantics.** When a teacher unlinks (`teacher_students.archived_at = now()`) and then re-links the same student, Phase 1 inserts a new row. Should the new row inherit `notes`, `relationship` from the archived row, or start blank? UX/owner question.
8. **Class limit semantics.** Is `class_limit = 0` allowed (a plan that disables classes)? The CHECK constraint allows it; product confirmation requested.

---

## No-execution confirmation

- This document is **markdown only**. It is **not** a SQL file.
- It lives at `docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md`.
- Nothing under `supabase/migrations/` was created or modified.
- No SQL was executed against any environment (local, staging, or production).
- No database object was created, altered, or dropped.
- No RLS policy was created, altered, or dropped.
- No product code (`pages/`, `pages/api/`, `lib/`, `components/`, `utils/`) was created or modified.
- No parent / student / copilot / report / auth flow was modified.
- No Hebrew text, RTL layout, design, copy, label, or visible UI string was created or modified.
- No `git commit` and no `git push` were performed. The owner commits manually.
- Phase 2 (RLS / security proposal) is **not** approved by Phase 1 approval. It requires a separate, explicit owner approval before any further work begins.

# RLS / Security Proposal — Teacher Portal (Phase 2)

> **Phase 2 deliverable, synced with Phase 3.5 migration posture (2026-05-24).** Documentation only. No SQL run, no DB change applied to any environment.
>
> **Authoritative applied migration (local files, not yet run on any DB):**
> - [`supabase/migrations/019_teacher_portal_foundation.sql`](../../supabase/migrations/019_teacher_portal_foundation.sql) — schema
> - [`supabase/migrations/020_teacher_portal_rls.sql`](../../supabase/migrations/020_teacher_portal_rls.sql) — RLS (read-only client + service-role mutations)
>
> This document defines the row-level-security and authorization posture for the new tables introduced in [Phase 1](./sql-proposals/019_teacher_portal_foundation.md). SQL examples below match `020_teacher_portal_rls.sql`.
>
> See the master plan at [`docs/teacher-portal/TEACHER_PORTAL_MASTER_PLAN.md`](./TEACHER_PORTAL_MASTER_PLAN.md) for the phase gates and approval rules.

## Hard boundaries (in force right now)

- **This doc-sync pass:** documentation only. No SQL executed. No RLS applied on any environment.
- Migration files [`019_teacher_portal_foundation.sql`](../../supabase/migrations/019_teacher_portal_foundation.sql) and [`020_teacher_portal_rls.sql`](../../supabase/migrations/020_teacher_portal_rls.sql) exist locally for owner-approved apply later; they are **not** applied until explicit approval.
- SQL examples below mirror `020`; do not run them until apply is approved.
- No product code in `pages/`, `pages/api/`, `lib/`, `components/`, or `utils/` is created or modified in this pass.
- No route is added under `pages/teacher/*`, `pages/guardian/*`, `pages/parent/*`, `pages/api/teacher/*`, or `pages/api/guardian/*`.
- No parent / student / copilot / report / auth flow is modified.
- No Hebrew text, RTL layout, design, copy, label, or visible UI string is modified.
- **No commit, no push.** Created/updated locally only. The owner commits manually.

## Approval rule (still gated)

- Approval of Phase 2 (this document and the parallel updates to [`docs/security/SECURITY_RISK_REGISTER.md`](../security/SECURITY_RISK_REGISTER.md) and [`docs/security/AUTHORIZATION_AUDIT_PLAN.md`](../security/AUTHORIZATION_AUDIT_PLAN.md)) does **not** approve Phase 3 (API contracts), Phase 4–9, or any implementation phase.
- Phase 3 starts only on explicit, named owner approval.

## Owner-approved Phase 2 assumptions (recap)

These owner decisions from the Phase 2 approval message govern every recommendation in this document:

1. **Parent consent.** A teacher must not be able to link an existing parent-owned student merely by knowing or guessing the student's UUID. Default posture: teacher↔student linking requires an explicit consent mechanism (parent approval, invitation token, secure code, admin action, or another approved channel). The consent UI/flow is **not** built in Phase 2.
2. **`teacher_limits` default row.** On teacher onboarding, a `teacher_limits` row is created with `plan_code = 'teacher_basic_20'`. Fallback resolution (no row → plan default → system default 20) is documented for safety.
3. **`teacher_access_audit.actor_id`.** Use a strong CHECK constraint that gates `actor_id` presence by `actor_role` (Phase 1 left this open; Phase 2 picks the CHECK). Audit rows must never contain raw PINs, raw tokens, raw IPs, parent emails, or full names.
4. **Magic-link rate limit.** Start with **server-side / in-memory** rate limiting (consistent with the existing copilot rate limiter). DB-backed throttling is a deferred future proposal, not a Phase 2 implementation.
5. **IP / user-agent.** Never store raw IP. If retention is needed, store only `ip_hash`. `user_agent` may be retained for security/audit if justified. This document marks every IP/UA column as "optional / privacy-conditional".
6. **Teacher hard-delete.** Keep `ON DELETE RESTRICT` from `student_guardian_access.created_by_teacher_id` to `teacher_profiles.id`. A teacher with active guardian access cannot be hard-deleted until access rows are revoked through a service-role process.
7. **Archived link reactivation.** Re-linking a previously unlinked student starts a fresh active row with blank `notes` and default `relationship`. No automatic inheritance from the archived row.
8. **`class_limit = 0`.** Allowed as a valid plan setting that disables classes for teachers on that plan.
9. **Migration numbering.** Teacher Portal schema/RLS live in `019_teacher_portal_foundation.sql` and `020_teacher_portal_rls.sql` (local files; apply gated). The next unrelated migration should use **`021_*` or higher**. See "Operational notes".

## Three categories of access

Every Phase 1 table fits exactly one of these three categories:

- **(A) Client read-only RLS.** RLS enabled; `authenticated` teachers (`auth.uid() = teacher_profiles.id`) may **`SELECT`** only their own scoped rows. **No client `INSERT` / `UPDATE` / `DELETE`** on mutation-controlled tables (`teacher_profiles`, `teacher_students`, `teacher_classes`, `teacher_class_students`). Read-only catalogue tables: `teacher_plans`, `teacher_limits` (`SELECT` only). The browser may list rosters and plan caps; it must not mutate teacher-portal data directly.
- **(A-mutation) Service-role writes via `/api/teacher/*`.** All inserts, updates, archives, and deletes on `teacher_profiles`, `teacher_students`, `teacher_classes`, and `teacher_class_students` run through Next.js API routes using the **service-role** client. Those routes enforce consent tokens, student/class limits, audit rows, guardian-access cascades, and ownership gates. **Phase 4+ must not use Supabase JS `.insert()` / `.update()` / `.delete()` on these tables from the browser.**
- **(B) Server-only / service-role tables.** RLS enabled, **no `authenticated` or `anon` policies**. Reachable only via service-role APIs. Examples: `student_guardian_access`, `student_guardian_sessions`, `teacher_access_audit`, `teacher_access_invitations`. Mirrors [`parent_policy_acceptances`](../../supabase/migrations/018_parent_policy_acceptances.sql) and [`student_learning_state`](../../supabase/migrations/017_student_learning_state.sql).
- **(C) Manual API ownership gates on existing tables.** Parent/student tables (`students`, `learning_sessions`, `answers`, etc.) are **not** modified. Teacher report access uses service role + `teacher_students` / `teacher_class_students` joins. **No new RLS on existing parent/student tables.**

This split has two important consequences:

- Existing parent/student RLS is **completely unchanged**.
- Direct browser writes cannot bypass consent, limits, audit, or side effects — even for rows the teacher legitimately owns.

---

## Per-table RLS proposal

> Each block below shows the RLS posture and example SQL aligned with [`020_teacher_portal_rls.sql`](../../supabase/migrations/020_teacher_portal_rls.sql). **Do not run SQL until the owner approves apply on a target environment.**

### 1. `teacher_profiles` — category (A) client read-only

- **Why client read.** A logged-in teacher must read their own profile from the browser (dashboard shell, `/api/teacher/me` complement).
- **Why no client write in first implementation.** Client `UPDATE` could change fields outside onboarding/audit control. Profile **insert** and **update** go through service role (`/api/teacher/onboard`; future profile API).
- **What this prevents.** Cross-teacher reads; no self-service profile row creation from the browser.

```sql
-- Matches 020_teacher_portal_rls.sql (do not run until owner-approved apply)
alter table public.teacher_profiles enable row level security;

create policy teacher_profiles_select_own
  on public.teacher_profiles
  for select
  to authenticated
  using (id = auth.uid());

-- No teacher_profiles_update_own in first implementation.
-- No INSERT / UPDATE / DELETE for authenticated.
```

### 2. `teacher_students` — category (A) client read-only; mutations service-role only

- **Client read.** Teacher lists their own links (`SELECT` where `teacher_id = auth.uid()`).
- **No client INSERT / UPDATE / DELETE.** Direct `UPDATE` could change `student_id` and bypass consent; direct `DELETE` or archive via client could skip audit and guardian-access cascade on unlink.
- **Service-role mutations only:**
  - `POST /api/teacher/students/link` — insert after consent verification (owner decision 1).
  - `POST /api/teacher/students/unlink` — archive link + side effects.

```sql
-- Matches 020_teacher_portal_rls.sql
alter table public.teacher_students enable row level security;

create policy teacher_students_select_own
  on public.teacher_students
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- INTENTIONALLY NO INSERT / UPDATE / DELETE for authenticated.
```

### 3. `teacher_classes` — category (A) client read-only; mutations service-role only

- **Client read.** Teacher lists own classes (`SELECT` where `teacher_id = auth.uid()`).
- **No client INSERT / UPDATE / DELETE.** Direct insert could bypass `class_limit`; direct update/delete could skip audit and business rules.
- **Service-role mutations only:** `/api/teacher/classes/*` (create, update, archive).

```sql
-- Matches 020_teacher_portal_rls.sql
alter table public.teacher_classes enable row level security;

create policy teacher_classes_select_own
  on public.teacher_classes
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- INTENTIONALLY NO INSERT / UPDATE / DELETE for authenticated.
```

### 4. `teacher_class_students` — category (A) client read-only; mutations service-role only

- **Client read.** Roster membership visible when the parent class is owned by the teacher (`SELECT` via `EXISTS` on `teacher_classes`).
- **No client INSERT / UPDATE / DELETE.** Previously considered RLS-guarded client inserts; **removed** so membership changes cannot bypass API audit and invariants (active `teacher_students` link enforced in API, not only in RLS).
- **Service-role mutations only:** `/api/teacher/classes/[classId]/members/*` (add/remove).

```sql
-- Matches 020_teacher_portal_rls.sql
alter table public.teacher_class_students enable row level security;

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

-- INTENTIONALLY NO INSERT / UPDATE / DELETE for authenticated.
```

### 5. `teacher_plans` — category (A) read-only client-visible

- **Why client-visible read.** The teacher dashboard needs to display plan metadata (name, limits, description) without round-tripping through an API.
- **What this prevents.** Tampering — clients cannot modify plan rows; only the service role can.

```sql
-- Matches 020_teacher_portal_rls.sql
alter table public.teacher_plans enable row level security;

create policy teacher_plans_select_active
  on public.teacher_plans
  for select
  to authenticated
  using (is_active is true);

-- INTENTIONALLY NO INSERT/UPDATE/DELETE POLICY for `authenticated`.
-- Plan rows are managed by service role only (admin tooling out of scope).
```

- **Owner decision (8) honored.** `class_limit = 0` is a valid plan setting; the policy does not filter by limits.

### 6. `teacher_limits` — category (A) read-only client-visible

- **Read posture.** A teacher reads their own limit row from the browser to render dashboard caps.
- **Write posture.** Service role only. A default row pinned to `plan_code = 'teacher_basic_20'` is created on onboarding (owner decision 2).

```sql
-- Matches 020_teacher_portal_rls.sql
alter table public.teacher_limits enable row level security;

create policy teacher_limits_select_own
  on public.teacher_limits
  for select
  to authenticated
  using (teacher_id = auth.uid());

-- INTENTIONALLY NO INSERT/UPDATE/DELETE POLICY for `authenticated`.
-- Onboarding default row is inserted by service role from /api/teacher/onboard.
-- Overrides are managed by service role (admin tooling, future phase).
```

- **Resolution helper invariant.** The Phase 3 helper `resolveTeacherStudentLimit(teacherId)` follows the precedence: `teacher_limits.student_limit_override` (if effective) → `teacher_plans.student_limit` for the assigned plan_code → system default 20. Even if the limits row is missing or the override is expired, the helper never throws and never silently returns an unbounded limit; it always falls back to the configured plan or the system default.

### 7. `student_guardian_access` — category (B) server-only

- **Why server-only.** Guardian-access rows hold credential hashes that authenticate a non-`auth.users` identity. Direct browser access would be a privilege-escalation hazard. Mirrors `student_access_codes` posture (no client `SELECT` policy after migration `015`).
- **What this prevents.** A teacher cannot list other teachers' guardian-access rows. A parent cannot enumerate guardian-access for their own student via Supabase JS. A guardian cannot read their own row directly. **All reads/writes go through the service role inside `/api/teacher/student-access/*` (teacher-side) and `/api/guardian/login` (login verification only).**

```sql
-- Matches 020_teacher_portal_rls.sql (enable only; no policies)
alter table public.student_guardian_access enable row level security;

-- INTENTIONALLY NO POLICIES for `authenticated` or `anon`.
-- Service role bypasses RLS; all paths go through Next.js API routes.
```

- **Phase 3 invariant.** `/api/teacher/student-access/list` filters by `created_by_teacher_id = teacherIdFromSession`. `/api/teacher/student-access/create` validates the teacher↔student link from `teacher_students` before insert. `/api/teacher/student-access/revoke` validates ownership before flipping `is_active = false` and `revoked_at`.

### 8. `student_guardian_sessions` — category (B) server-only

- **Why server-only.** Holds session-token hashes for guardian cookies. A leak would let an attacker correlate or forge sessions.
- **What this prevents.** Any direct read of session rows from any client identity. Token verification happens only inside the guardian-session helper on the server.

```sql
-- Matches 020_teacher_portal_rls.sql (enable only; no policies)
alter table public.student_guardian_sessions enable row level security;

-- INTENTIONALLY NO POLICIES for `authenticated` or `anon`.
-- All reads/writes via service role inside guardian-session helper.
```

- **Cascade-revoke invariant.** When a `student_guardian_access` row flips to `is_active = false` or has its `revoked_at` set, every session row referencing it must be revoked too. Phase 2 specifies this as a service-role pass inside the revoke API. A Phase 4 trigger may harden this further; do not introduce the trigger in Phase 2.

### 9. `teacher_access_audit` — category (B) server-only, append-only

- **Why server-only.** Audit trail is the only durable witness of guardian-access lifecycle and teacher actions. It must be unforgeable from the client and untouchable by any non-service path.
- **Hard rule.** **No `INSERT` policy for `authenticated`.** Only the service role writes audit rows. **No `UPDATE` and no `DELETE` policy for any role.** The table is append-only at the policy level.

```sql
-- Matches 020_teacher_portal_rls.sql (enable only; no policies)
alter table public.teacher_access_audit enable row level security;

-- INTENTIONALLY NO POLICIES for `authenticated` or `anon`.
-- INTENTIONALLY NO POLICY allowing UPDATE or DELETE for any role.
-- Audit is service-role-INSERT-only and read via narrow API.
```

- **`actor_id` hardening (owner decision 3).** Phase 2 picks the strong CHECK constraint variant. The goal: when `actor_role = 'teacher'`, `actor_id` must point to a `teacher_profiles` row; when `actor_role = 'guardian'`, `actor_id` must point to a `student_guardian_access` row; when `actor_role = 'system'`, `actor_id` must be NULL. Because `actor_id` is polymorphic, a single FK is not appropriate. The recommendation is a **CHECK constraint** plus an **`AFTER INSERT` trigger** (in Phase 4 service-role write path; not Phase 2) that resolves and validates the existence of the referenced row. Phase 2 documents the CHECK only:

```sql
-- (proposal — do not run)
alter table public.teacher_access_audit
  add constraint teacher_access_audit_actor_role_actor_id_chk
  check (
    (actor_role = 'system'  and actor_id is null) or
    (actor_role = 'teacher' and actor_id is not null) or
    (actor_role = 'guardian' and actor_id is not null)
  );
```

- **Forbidden audit content (owner decision 3).** Audit rows must never contain raw PINs, raw tokens, raw IPs, parent emails, or full names. Phase 4 enforcement: the audit-write helper rejects any `metadata` payload that fails a deny-list check (recommended deny-list: `pin`, `pin_plain`, `token`, `token_plain`, `magic_link`, `email`, `email_plain`, `full_name`, `parent_email`, `ip`, `ip_address`). `ip_hash` may be retained (owner decision 5); `user_agent` may be retained for security/audit if justified.

### 10. `teacher_access_invitations` — category (B) server-only

- **Why server-only.** Holds short-lived magic-link token hashes. Direct browser access would defeat the magic-link security model.
- **Rate limit (owner decision 4).** Verification attempts on magic-link tokens are gated by an in-memory IP + per-token rate limiter at the API layer (consistent with the existing copilot rate limiter). A DB-backed `teacher_access_invitation_attempts` table is **explicitly deferred** as a future proposal, not a Phase 2 implementation.

```sql
-- Matches 020_teacher_portal_rls.sql (enable only; no policies)
alter table public.teacher_access_invitations enable row level security;

-- INTENTIONALLY NO POLICIES for `authenticated` or `anon`.
-- All reads/writes via service role inside teacher-access invitation API.
```

- **Privacy invariant (owner decision 5).** No raw email is stored. The optional `delivery_email_hint` column may hold an obfuscated label only (e.g. `"p***@e***.com"`) for UI display.

---

## Threat model — `TEACHER` persona

Identity: a Supabase Auth user (`auth.users.id`) that has a row in `teacher_profiles`. Authenticates via the planned `/teacher/login` page using `supabase.auth.signInWithPassword`. Session lives as an `Authorization: Bearer <access_token>` header on API requests.

| ID | Threat | Defense | Evidence in this doc |
|----|--------|---------|----------------------|
| **T-TCH-1** | Teacher links a student they have no consent for, by guessing or scraping `student_id`. | No client `INSERT`/`UPDATE`/`DELETE` on `teacher_students`. `/api/teacher/students/link` (service role) is the only writer; requires parent-consent token. | Section 2 |
| **T-TCH-2** | Teacher reads another teacher's classes, roster, or audit. | Client `SELECT` scoped to `teacher_id = auth.uid()`. Server-only audit; teacher audit reads via service-role API. | Sections 3, 4, 9 |
| **T-TCH-3** | Teacher reads `learning_sessions` / `answers` / `student_learning_state` for a student not in their `teacher_students`. | Existing parent RLS unchanged. Teacher-side report API uses service role + manual join through `teacher_students` (category C). No new policy on existing tables. | "Three categories of access" |
| **T-TCH-4** | Teacher escalates to admin / parent surfaces (calls `/api/parent/*`, `/api/admin/*`, `/api/learning-simulator/*`). | Each existing API still requires its own credential: parent bearer for `/api/parent/*`, admin token for `/api/learning-simulator/*` and `/api/admin/*`. A teacher JWT does not satisfy `parent_id = auth.uid()` for parents that are not also that teacher. | Cross-tenant matrix below |
| **T-TCH-5** | Teacher reads `student_guardian_access` rows for another teacher's students. | Server-only table; service-role API filters by `created_by_teacher_id = teacher.id`. No client policy. | Section 7 |
| **T-TCH-6** | Teacher inserts forged audit rows (e.g. to fabricate consent or hide revocations). | No `INSERT` policy for `authenticated` on `teacher_access_audit`. Service-role only. CHECK constraint guards `actor_id` polymorphism. | Section 9 |
| **T-TCH-7** | Teacher updates or deletes existing audit rows. | No `UPDATE` and no `DELETE` policy for any role on `teacher_access_audit`. Append-only at the policy level. | Section 9 |
| **T-TCH-8** | Teacher uses Supabase JS to mutate `teacher_students`, `teacher_classes`, or `teacher_class_students` directly, bypassing consent, limits, audit, or guardian cascade. | No client `INSERT`/`UPDATE`/`DELETE` on those tables (020). All mutations via service-role `/api/teacher/*`. | Sections 2–4 |
| **T-TCH-8b** | Teacher adds class roster row for a student not in `teacher_students`. | No client insert on `teacher_class_students`; API enforces active link before membership write. | Section 4 |
| **T-TCH-9** | Teacher exhausts magic-link verification attempts to enumerate or brute-force tokens. | In-memory IP + per-token rate limit on `/api/guardian/login` and the magic-link verify endpoint. Audit row on each failure. | Section 10 |
| **T-TCH-10** | Teacher exfiltrates parent emails or PII via audit `metadata`. | Audit deny-list on `metadata` keys: `email`, `pin`, `token`, `ip`, `full_name`, etc. Phase 4 enforcement; Phase 2 documents the requirement. | Section 9 |
| **T-TCH-11** | Teacher tries to hard-delete their own `teacher_profiles` row to orphan audit / guardian-access. | Hard delete only via cascade from `auth.users`. `teacher_profiles` has no client `DELETE` policy. `student_guardian_access.created_by_teacher_id` is `ON DELETE RESTRICT`. | Section 1 + owner decision 6 |
| **T-TCH-12** | Teacher attempts to write to `teacher_plans` to widen their own student/class limit. | No client `INSERT` / `UPDATE` / `DELETE` policy on `teacher_plans`. Service-role only. Even if a plan row were modified, `teacher_limits` overrides are also service-role only. | Section 5, 6 |

## Threat model — `GUARDIAN_VIEW` persona

Identity: a non-`auth.users` identity authenticated by a teacher-issued credential (`student_guardian_access` row). Authenticates via the planned `/guardian/login` route. Session is a server-side HMAC cookie (`liosh_guardian_session`) backed by `student_guardian_sessions`. The guardian is **never** a `parent_profiles` row, **never** a `students` row, and **never** an `auth.users` row.

| ID | Threat | Defense | Evidence in this doc |
|----|--------|---------|----------------------|
| **T-GRD-1** | Guardian session calls `/api/parent/*` (e.g. `/api/parent/list-students`, `/api/parent/copilot-turn`). | Each existing parent route validates `Authorization: Bearer <Supabase JWT>` via `getLearningSupabaseServerUserClient(...).auth.getUser()`. A guardian cookie does not satisfy this and yields 401. **No parent route is modified to accept guardian sessions.** | "What must remain unchanged" below |
| **T-GRD-2** | Guardian session calls `/api/teacher/*`. | Each teacher route validates the teacher Supabase JWT. Guardian cookie does not satisfy this and yields 401. | "What must remain unchanged" |
| **T-GRD-3** | Guardian session calls `/api/student/*` (login, learning APIs). | Each student route validates `liosh_student_session` (HMAC cookie). A guardian session uses a different cookie name (`liosh_guardian_session`) and a different session table; it cannot be confused server-side. | Cookie name separation |
| **T-GRD-4** | Guardian session passes a different `studentId` to the guardian report endpoint to read another student. | Phase 3 guardian-report endpoint enforces `requestedStudentId === guardian_access.student_id` before any DB read. Mismatch returns 403, not 404 (existence check forbidden). | Cross-tenant matrix below |
| **T-GRD-5** | Guardian session attempts any write (update student, create access codes, edit profile, write copilot, write learning data). | All guardian endpoints are read-only. The guardian-session helper rejects any `POST` / `PATCH` / `DELETE` route except `/api/guardian/logout`. | "Disallowed direct-client access" |
| **T-GRD-6** | Guardian session attempts to call Parent Copilot. | `/api/parent/copilot-turn` does not accept the guardian session cookie. Existing copilot validator hard-rejects `audience !== "parent"` and the guardian session is never typed as `audience: "parent"`. | "What must remain unchanged" |
| **T-GRD-7** | Stolen guardian credential — attacker brute-forces the 4-digit PIN. | Rate limit on `/api/guardian/login` keyed by IP and by `login_username_normalized`. Lockout / backoff parallel to the existing `lib/security/login-rate-limit.js` student pattern. Failed attempts written to `teacher_access_audit` with `action='guardian_login_failed'`. | Section 10 + owner decision 4 |
| **T-GRD-8** | Stolen guardian credential — attacker reuses an old, revoked credential. | Login lookup filters by `is_active = true and revoked_at is null and (expires_at is null or expires_at > now())`. The partial unique index `student_guardian_access_active_username_idx` ensures only one active row per username. | Phase 1 sec. 7 |
| **T-GRD-9** | Guardian queries Supabase JS directly with a leaked anon key from the browser bundle. | Anon role has **no policy** on any new table (server-only category B for guardian tables; no policy for `anon` on category A tables either). Anon cannot read existing parent/student tables — that posture is unchanged. | All sections |
| **T-GRD-10** | Guardian session persists after the teacher revokes access. | Revoke API flips `is_active = false`, sets `revoked_at`, and writes `revoked_by_teacher_id`. The same service-role pass also revokes every `student_guardian_sessions` row referencing that access (sets `revoked_at = now()`). The guardian-session helper rejects sessions whose row has `revoked_at not null`. | Section 8 |
| **T-GRD-11** | Guardian-session cookie reused on a different device after the access expires. | `student_guardian_access.expires_at` and `student_guardian_sessions.expires_at` are both checked on each request. Once expired, the helper rejects the cookie and returns 401. Failed attempts may be audited per `action='guardian_login_failed'` if the cookie is treated as a re-login attempt. | Section 8 |
| **T-GRD-12** | Guardian session sees other students' data via class report or aggregate endpoints. | Class report and aggregate endpoints are gated by **teacher** session, not guardian. Guardian APIs are scoped to a single student. | "RLS must NOT open" |

---

## Cross-tenant / IDOR risk matrix (planning input for Phase 9)

The following pairs must be exercised by Phase 9 cross-tenant tests. Each row produces a single recorded fixture under `reports/security/teacher-portal-authz-matrix/<date>/`. **No tests are run in Phase 2.**

| # | Caller | Target | Expected | Threat ID(s) |
|---|--------|--------|----------|--------------|
| **CT-TCH-1** | Teacher A bearer | Teacher B's `teacher_classes` row (any read or write) | 403 / 404 (no existence leak) | T-TCH-2 |
| **CT-TCH-2** | Teacher A bearer | Teacher B's `teacher_students` row | 403 / 404 | T-TCH-2 |
| **CT-TCH-3** | Teacher A bearer | Teacher B's `student_guardian_access` row (read or revoke) | 403 | T-TCH-5 |
| **CT-TCH-4** | Teacher A bearer | Teacher B's `teacher_access_audit` row | 403 | T-TCH-2 |
| **CT-TCH-5** | Teacher A bearer | Student linked only to Teacher B (report-data API) | 403 | T-TCH-3 |
| **CT-TCH-6** | Teacher A bearer | `/api/teacher/students/link` with `student_id` of any student, no consent token | 400 / 403 | T-TCH-1 |
| **CT-TCH-7** | Teacher A bearer | Supabase JS INSERT into `teacher_students` | RLS reject (no policy) | T-TCH-1, T-TCH-8 |
| **CT-TCH-7b** | Teacher A bearer | Supabase JS UPDATE `teacher_students` (e.g. change `student_id`) | RLS reject | T-TCH-8 |
| **CT-TCH-7c** | Teacher A bearer | Supabase JS DELETE on `teacher_students` | RLS reject | T-TCH-8 |
| **CT-TCH-7d** | Teacher A bearer | Supabase JS INSERT/UPDATE/DELETE on `teacher_classes` | RLS reject | T-TCH-8 |
| **CT-TCH-7e** | Teacher A bearer | Supabase JS INSERT into `teacher_class_students` | RLS reject | T-TCH-8, T-TCH-8b |
| **CT-TCH-8** | Teacher A bearer | Insert into `teacher_access_audit` (via Supabase JS) | RLS reject | T-TCH-6 |
| **CT-TCH-9** | Teacher A bearer | Update or delete `teacher_access_audit` (via Supabase JS) | RLS reject | T-TCH-7 |
| **CT-TCH-10** | Teacher A bearer | `/api/parent/list-students` | 401 (parent bearer required) | T-TCH-4 |
| **CT-TCH-11** | Teacher A bearer | `/api/admin/monthly-persistence-award` | 401 / 403 (admin token required) | T-TCH-4 |
| **CT-TCH-12** | Teacher A bearer | `/api/learning-simulator/*` | 401 / 403 (admin token required) | T-TCH-4 |
| **CT-TCH-13** | Teacher A bearer | `/api/student/login`, `/api/student/me` | 401 (student session cookie required) | T-TCH-4 |
| **CT-GRD-1** | Guardian session for student S1 | `/api/guardian/student/{S2}/report-data` (different student) | 403 | T-GRD-4 |
| **CT-GRD-2** | Guardian session | `/api/parent/list-students` | 401 | T-GRD-1 |
| **CT-GRD-3** | Guardian session | `/api/parent/students/{anyId}/report-data` | 401 | T-GRD-1 |
| **CT-GRD-4** | Guardian session | `/api/parent/copilot-turn` | 401 | T-GRD-6 |
| **CT-GRD-5** | Guardian session | `/api/teacher/*` (any teacher route) | 401 | T-GRD-2 |
| **CT-GRD-6** | Guardian session | `/api/student/me`, `/api/student/dev-add-coins` | 401 / 404 | T-GRD-3 |
| **CT-GRD-7** | Revoked guardian session | `/api/guardian/student/{S1}/report-data` (own student) | 401 (revoked) | T-GRD-10 |
| **CT-GRD-8** | Expired guardian session | `/api/guardian/student/{S1}/report-data` | 401 (expired) | T-GRD-11 |
| **CT-GRD-9** | Anonymous (no session) | Any `/api/teacher/*` | 401 | baseline |
| **CT-GRD-10** | Anonymous (no session) | Any `/api/guardian/*` | 401 | baseline |
| **CT-GRD-11** | Anonymous (no session, Supabase JS anon) | Any new Phase-1 table | RLS reject (no anon policy) | T-GRD-9 |
| **CT-PAR-1** | Parent A bearer | Any `/api/teacher/*` | 401 | T-TCH-4 mirror |
| **CT-PAR-2** | Parent A bearer | Existing parent-side surfaces | unchanged behavior | regression baseline |
| **CT-STU-1** | Student A session | Any `/api/teacher/*` | 401 | T-TCH-4 mirror |
| **CT-STU-2** | Student A session | Existing student-side surfaces | unchanged behavior | regression baseline |

A single failure in CT-* is a launch blocker. The fixtures plug into the existing `docs/security/AUTHORIZATION_AUDIT_PLAN.md` matrix; Phase 2 also extends that doc with the rows above (see appended section in that file).

---

## What must remain unchanged in parent / student flows

The Teacher Portal **does not modify** any of the following. Phase 9 regression tests verify these stay intact.

- `pages/parent/login.js` — UI, layout, route, behavior. **No mode toggle, no banner, no link** to guardian sign-in is added. A future Phase 10 may merge guardian sign-in into `/parent/login`, but Phase 2 explicitly forbids it.
- `pages/parent/dashboard.js`, `pages/parent/rewards.js`.
- `pages/api/parent/*` — every existing route's input contract, output shape, and auth gate.
- `lib/parent-server/*` (including `policy-acceptance.server.js`, `parent-student-limit.server.js`, `report-data-aggregate.server.js`, `parent-report-account-attachment.server.js`, `db-input-to-detailed-report.server.js`).
- `lib/learning-supabase/student-auth.js` — the `liosh_student_session` cookie, HMAC scheme, and student-session lookup.
- `pages/student/login.js`, `pages/api/student/*` — full surface unchanged.
- `pages/api/learning/*`, `pages/api/arcade/*` — full surfaces unchanged.
- `utils/parent-copilot/*` — including the audience guardrail in `guardrail-validator.js` that rejects `audience !== "parent"`.
- All RLS policies on `parent_profiles`, `students`, `student_access_codes`, `student_sessions`, `learning_sessions`, `answers`, `parent_reports`, `student_coin_balances`, `coin_transactions`, `student_inventory`, `student_learning_state`, `parent_policy_acceptances`, `coin_reward_rules`, `coin_spend_rules`, `shop_items`, `arcade_*`. **Zero modifications.**
- All Hebrew copy under `data/legal/sitePolicies.he.js`, `utils/parent-report-language/*`, and any `.he.js` content file.
- Parent 3-child cap and the QA `admin@admin.com` 50-child override.

## Disallowed direct-client access

### Server-only tables (no `authenticated` / `anon` policies)

- `student_guardian_access`, `student_guardian_sessions`, `teacher_access_audit`, `teacher_access_invitations` — no client `SELECT`/`INSERT`/`UPDATE`/`DELETE`.

### Mutation-controlled tables (client `SELECT` only; writes via `/api/teacher/*` service role)

- `teacher_profiles` — no client `INSERT`/`UPDATE`/`DELETE` in first implementation.
- `teacher_students` — no client `INSERT`/`UPDATE`/`DELETE`.
- `teacher_classes` — no client `INSERT`/`UPDATE`/`DELETE`.
- `teacher_class_students` — no client `INSERT`/`UPDATE`/`DELETE`.

### Read-only catalogue (client `SELECT` only)

- `teacher_plans`, `teacher_limits` — no client mutations.

## RLS must NOT open

The following statements are invariants that any future Phase 2-revision or Phase 4 trigger work must preserve. Each is a condition that, if violated, fails the Phase 9 gate.

1. RLS must not let a teacher read a `students` row that is not in their active `teacher_students` set or in a class they own (`teacher_class_students` joined to `teacher_classes` they own). The only way teacher access reaches `students` is through service-role API code that joins `teacher_students` / `teacher_class_students`. **No new policy is added to the `students` table.**
2. RLS must not let a teacher read another teacher's `teacher_classes`, `teacher_students`, `teacher_class_students`, `teacher_limits`, `teacher_access_audit`, `student_guardian_access`, `student_guardian_sessions`, or `teacher_access_invitations` rows.
3. RLS must not let a guardian-session identity (which is **not** an `auth.users` row) reach any policy at all. Anon and authenticated policies on the new tables either filter by `auth.uid()` or are absent; the guardian session never reaches `auth.uid()`-based policies because there is no Supabase JWT for guardians.
4. RLS must not make `parent_profiles` visible to teachers. Teachers do not need parent emails, names, or IDs — and the Phase 3 contracts must not surface any of those fields.
5. RLS must not let any client `INSERT`, `UPDATE`, or `DELETE` rows in `teacher_access_audit`. Audit is service-role-write-only and read via narrow API.
6. RLS must not let `authenticated` perform `INSERT`, `UPDATE`, or `DELETE` on `teacher_students`, `teacher_classes`, or `teacher_class_students`, or `UPDATE` on `teacher_profiles` in the first implementation. Mutations use service-role `/api/teacher/*` only.
7. RLS must not weaken the existing parent / student posture in any way. If a Phase 4 implementation diff touches RLS on an existing table, the diff must be rejected by the Phase 9 gate until a separate, owner-approved schema phase covers it.

---

## Operational notes

### Migration files (Phase 3.5 — local only, not applied)

- [`supabase/migrations/019_teacher_portal_foundation.sql`](../../supabase/migrations/019_teacher_portal_foundation.sql) — schema + seeds + triggers.
- [`supabase/migrations/020_teacher_portal_rls.sql`](../../supabase/migrations/020_teacher_portal_rls.sql) — RLS (read-only client posture above).
- Apply order: **019 then 020**. Owner approval required before running on local/staging/production.
- The Phase 1 markdown proposal remains at [`sql-proposals/019_teacher_portal_foundation.md`](./sql-proposals/019_teacher_portal_foundation.md) for historical reference.
- The next non–teacher-portal migration should use **`021_*` or higher** to avoid renumbering.

### Default `teacher_limits` row on onboarding (owner decision 2)

`/api/teacher/onboard` (Phase 4, not implemented in Phase 2) inserts both rows in a single service-role transaction:

1. `INSERT INTO public.teacher_profiles (id) VALUES (auth.uid()) ...`
2. `INSERT INTO public.teacher_limits (teacher_id, plan_code) VALUES (auth.uid(), 'teacher_basic_20') ON CONFLICT DO NOTHING`

Resolution helper precedence is unchanged: override → plan default → system default `20`. Even if step 2 is skipped (legacy or partial onboarding), the helper falls back gracefully.

### Audit `metadata` deny-list (owner decision 3, 5)

The recommended deny-list of forbidden keys at the audit-write helper layer (Phase 4):

- `pin`, `pin_plain`
- `token`, `token_plain`, `magic_link`, `magic_link_plain`
- `password`
- `email`, `email_plain`, `parent_email`, `guardian_email`
- `full_name`, `parent_name`, `student_full_name`
- `ip`, `ip_address`

Allowed: `ip_hash`, `user_agent`, `delivery_channel`, `username` (the username chosen by the teacher for the guardian; not the parent's email), `relationship`, `class_id`, `student_id`, `teacher_id`.

---

## Remaining open questions before Phase 3

These do not block Phase 2 approval, but Phase 3 (API contracts) must answer them in writing before any contract is finalized.

1. **Consent artifact format.** What does a parent-consent token look like? Recommended: a one-time signed token issued by an existing parent-side action (`/api/parent/teacher-consent/issue`, future). Phase 3 must define the issuer, the expiry, and the verification flow.
2. **Admin / school-roster bypass.** Owner decision (1) lists "admin action" as an allowed consent path. Phase 3 must define who counts as an admin (separate from `ENGINE_REVIEW_ADMIN_TOKEN`) and how that path is audited.
3. **Default `expires_at` for `student_guardian_access`.** `NULL` (until revoked) versus a 30-day rolling window. Owner decision pending.
4. **Magic-link delivery channels.** Email only? Email + SMS? Or owner-selected per invitation? Affects whether `delivery_channel` accepts `email_invite` in Phase 8.
5. **Teacher email PII boundary.** Whether the teacher dashboard ever displays the parent's email obfuscated label (e.g. `delivery_email_hint`) or no parent identifying information at all.
6. **Class-roster CSV import.** If owner approves CSV import in a future phase, is the import per-class (no teacher-level student creation) or does it imply teacher-side student creation? The latter requires the deferred `students.parent_id` schema decision first.
7. **`actor_id` AFTER-INSERT existence check.** Whether to ship the existence-validation trigger in Phase 4 or rely solely on the CHECK + service-role discipline. Phase 3 picks.
8. **Guardian-session lifetime.** Default cookie lifetime (e.g. 24h) vs. parity with student session (7 days). Owner decision pending.

---

## Doc sync confirmation (Phase 3.5 documentation pass)

- This document was **updated to match** [`020_teacher_portal_rls.sql`](../../supabase/migrations/020_teacher_portal_rls.sql) (read-only client RLS + service-role mutations).
- **No SQL was executed** and **no RLS was applied** on any environment during this doc sync.
- No product code was modified in this pass.
- No commit, no push.




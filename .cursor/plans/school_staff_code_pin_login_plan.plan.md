# School Staff Code/PIN Login Plan

**Status:** PLAN ONLY — no code changed, no SQL created, no migration created, no UI changed, no Hebrew changed, no commit, no push, no deploy.

**Plan file:** `.cursor/plans/school_staff_code_pin_login_plan.plan.md`

**This plan is separate from** the current role/persona/entitlement foundation work (migration 040–047). Do not touch current WIP files.

---

## 1. Background

The platform currently supports two distinct auth patterns:

| Persona | Login method | Session type |
|---|---|---|
| Platform Admin | Supabase email + password | Supabase JWT |
| School Manager | Supabase email + password | Supabase JWT |
| Private Teacher | Supabase email + password | Supabase JWT |
| School Teacher | Supabase email + password (current) | Supabase JWT |
| School Operator | Supabase email + password (current) | Supabase JWT |
| School Student | School-issued code + PIN | Custom cookie `liosh_guardian_session` via `student_access_codes` + `student_guardian_sessions` |
| School Guardian/Parent | School-issued username + PIN | Custom cookie `liosh_guardian_session` via `student_guardian_access` + `student_guardian_sessions` |

The product decision is that School Teachers and School Operators should **not** use email/password in the long term. They should use a school-issued code (e.g., `leok-T0005`) and a PIN, similar to the existing student/guardian credential model. This plan designs that future system.

---

## 2. Product Decision (as specified by owner)

| Persona | Login method | Created by | Quota |
|---|---|---|---|
| Platform Admin | email + password | Manual/seed | N/A |
| School Manager | email + password | Platform Admin | `max_school_managers = 1` |
| Private Teacher | email + password | Platform Admin approval | Platform-level `teacher_limits` |
| **School Teacher** | **school code + PIN** | School Manager | `max_school_teachers` |
| **School Operator/Secretary** | **school code + PIN** | School Manager | `max_school_operators` |
| School Student | school code + PIN | School Manager | `max_school_students` |
| School Guardian | school code + PIN | School Manager | (per-student, N/A) |

---

## 3. Current Architecture Audit

**Files inspected (read-only):**

- `supabase/migrations/019_teacher_portal_foundation.sql` — defines `teacher_profiles`, `student_guardian_access`, `student_guardian_sessions`
- `supabase/migrations/022_teacher_access_prefix.sql` — `teacher_profiles.access_prefix`
- `supabase/migrations/025_teacher_quotas_admin.sql` — defines `school_accounts`, `school_teacher_memberships`
- `supabase/migrations/027_school_managed_portal.sql` — extends school portal schema
- `supabase/migrations/030_school_code.sql` — adds `school_accounts.school_code` (3–4 lowercase letters)
- `supabase/migrations/031_school_account_management.sql` — adds `school_credential_sequences` (with `next_parent_seq`, `next_student_seq`)
- `supabase/migrations/040_account_persona_entitlements.sql` — defines persona entitlement table
- `supabase/migrations/043_school_accounts_separate_quotas.sql` — adds `max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`
- `supabase/migrations/044_school_operator_grants.sql` — `school_operator_grants(school_id, operator_user_id FK auth.users)`
- `supabase/migrations/046_school_teacher_memberships_school_operator_role.sql` — adds `school_operator` to role constraint
- `pages/teacher/login.js` — Supabase email/password login page
- `pages/api/guardian/login.js` — guardian code/PIN login API
- `lib/guardian-server/guardian-login.server.js` — guardian login logic
- `lib/guardian-server/guardian-crypto.server.js` — HMAC-SHA256 with `LEARNING_STUDENT_ACCESS_SECRET`
- `lib/guardian-server/guardian-session.server.js` — cookie issuance (`liosh_guardian_session`)
- `lib/guardian-server/guardian-rate-limit.server.js` — per-credential rate limiting
- `lib/security/login-rate-limit.js` — generic progressive lockout helper
- `lib/school-server/school-request.server.js` — `requireSchoolManagerApiContext`, `requireSchoolPortalMeContext`
- `pages/api/school/me.js` — school portal identity endpoint
- `pages/api/school/teachers/index.js` — school manager teacher management
- `pages/api/teacher/me.js` — teacher identity endpoint
- `docs/auth/SCHOOL_STAFF_LOGIN_MODEL_PROPOSAL.md` — prior internal audit

### 3.1 Answered Architecture Questions

**Q1. Does a school teacher/operator currently need an `auth.users` row?**

Yes, mandatory. `teacher_profiles.id` is a **primary key that foreign-keys to `auth.users(id) ON DELETE CASCADE`**. `school_teacher_memberships.teacher_id` references `teacher_profiles.id`. `school_operator_grants.operator_user_id` references `auth.users(id)` directly. `account_persona_entitlements.user_id` references `auth.users(id)`. Every layer in the authorization chain is anchored to an `auth.users` row.

**Q2. Does a school teacher/operator currently need a `teacher_profiles` row?**

Yes for school teachers (their membership uses `teacher_id` which must match `teacher_profiles.id`). School operators also follow the same path through `school_teacher_memberships.teacher_id` (which links to `teacher_profiles.id`). All school portal APIs call `resolveAuthenticatedTeacherUserId` and then `loadTeacherProfileRow`.

**Q3. Does `school_teacher_memberships.teacher_id` require `teacher_profiles.id = auth.users.id`?**

Yes, confirmed by schema chain:
```
school_teacher_memberships.teacher_id
  → teacher_profiles.id (PK)
    → auth.users.id (FK ON DELETE CASCADE)
```

**Q4. Can staff code/PIN login create a custom signed server session that maps to an existing user_id?**

Yes. This is the hybrid model (Option 3 below). The session would store `user_id` internally; the auth resolver in `resolveAuthenticatedTeacherUserId` would be extended to also accept a custom staff session cookie and resolve the matching `user_id`, which then flows through all existing downstream FK lookups unchanged.

**Q5. Should school staff keep an internal user UUID but not use email/password?**

Yes — this is the recommended path. Staff have an internal `auth.users` row (with a system-generated, never-disclosed email and a random password). Staff never interact with that email. Login is exclusively via code/PIN through the staff login endpoint.

**Q6. Should school staff auth be a separate table, or reuse existing teacher identity tables?**

Separate credential table (`school_staff_access_codes`) for the code/PIN credentials and a separate session table (`school_staff_sessions`), similar to how `student_guardian_access` and `student_guardian_sessions` are separate from the main parent auth tables. The identity tables (`teacher_profiles`, `school_teacher_memberships`, `account_persona_entitlements`) are reused unchanged — the staff member still has a row there.

**Q7. Which school APIs must be updated to accept staff-code sessions?**

The single entry point is `resolveAuthenticatedTeacherUserId` in `lib/teacher-server/teacher-session.server.js`. All school staff APIs funnel through this function. Only this resolver needs to be extended to also accept a custom `liosh_staff_session` cookie. Downstream logic (membership checks, entitlement checks, school scoping) does not need to change because `user_id` is resolved correctly.

Affected APIs (via the resolver):
- `GET /api/teacher/me`
- `GET /api/school/me`
- `GET/POST /api/school/teachers`
- `GET/POST /api/school/operators`
- `GET/POST /api/school/students`
- `GET /api/school/classes/[classId]/report-data`
- `GET /api/school/students/[studentId]/report-data`
- All other `/api/school/**` routes
- All other `/api/teacher/**` routes

**Q8. Which APIs must remain Supabase-email-session only?**

- School Manager login (email/password via Supabase)
- Private Teacher login (email/password via Supabase)
- Platform Admin portal (Supabase JWT required)
- Parent email/password login flow (if applicable)

---

## 4. Current Login Flows (as-inspected)

### 4.1 School Manager / Private Teacher (current)

```
pages/teacher/login.js
  → supabase.auth.signInWithPassword({ email, password })
  → GET /api/teacher/me (Bearer JWT)
    → resolveAuthenticatedTeacherUserId(authHeader)
      → supabase.auth.getUser(jwt)  → user_id
    → loadTeacherProfileRow(user_id)
    → loadTeacherSchoolMembership(user_id)  [for school roles]
    → assertActivePersonaEntitlement(user_id, persona)
  → redirect to /school/dashboard, /school/operator/dashboard, or /teacher/dashboard
```

### 4.2 School Guardian/Parent (current — code/PIN)

```
pages/guardian/login.js or pages/parent/login.js
  → POST /api/guardian/login { loginUsername, pin }
    → normalizeStudentUsername(loginUsername)
    → consumeGuardianLoginRateLimit({ ip, usernameNormalized })
    → guardianLogin({ loginUsername, pin, ... })
      → verifyGuardianCredentials(serviceRole, username, pin)
        → SELECT FROM student_guardian_access WHERE login_username_normalized = ? AND is_active = true
        → hashStudentSecret(pin)  ← HMAC-SHA256 with LEARNING_STUDENT_ACCESS_SECRET
        → compare pin_hash
      → issueGuardianSession(serviceRole, accessRow.id, ...)
        → INSERT INTO student_guardian_sessions (session_token_hash, expires_at, ...)
      → setGuardianSessionCookie(res, token, maxAgeSec)  → cookie: liosh_guardian_session
```

### 4.3 HMAC hashing (current guardian-crypto.server.js)

```js
// lib/guardian-server/guardian-crypto.server.js
export function hashStudentSecret(value) {
  const secret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}
```

This function is used to hash both the guardian code (`code_hash`) and PIN (`pin_hash`). The same pattern is used for `student_access_codes.code_hash`.

### 4.4 School credential sequences (current)

`school_credential_sequences` table currently tracks:
- `next_parent_seq` — for guardian/parent usernames (`{code}-P{seq}`)
- `next_student_seq` — for student usernames (`{code}-S{seq}`)

The table must be extended with `next_teacher_seq` and `next_operator_seq` in the future migration.

### 4.5 Rate limiting (current login-rate-limit.js)

Progressive lockout with in-memory buckets per IP and per credential:
- 5 fails → 30s lockout
- 10 fails → 5min lockout
- 20 fails → 1hr lockout
- 50 fails → 24hr lockout

This pattern can be reused directly for staff code/PIN login.

---

## 5. Target Login Model

### 5.1 Staff code/PIN flow (proposed future)

```
/school/staff/login  (future route)
  → POST /api/school/staff/login { staffCode, pin }
    → normalizeStaffCode(staffCode)  ← lowercase, trim
    → checkStaffLoginRateLimit({ ip, codeNormalized })  ← reuse existing helper
    → verifyStaffCredentials(serviceRole, codeNormalized, pin)
      → SELECT FROM school_staff_access_codes
          WHERE code_display_normalized = ?
            AND is_active = true
            AND revoked_at IS NULL
      → hashStaffSecret(pin)  ← same HMAC-SHA256 (reuse LEARNING_STUDENT_ACCESS_SECRET)
      → compare pin_hash
      → check is_active, revoked_at, locked_until
    → issueStaffSession(serviceRole, staffAccessId, userId, schoolId, staffRole)
      → INSERT INTO school_staff_sessions (user_id, school_id, staff_role, session_token_hash, expires_at)
    → setStaffSessionCookie(res, token, maxAgeSec)  → cookie: liosh_staff_session
```

### 5.2 Staff session resolution (proposed update to resolver)

```js
// lib/teacher-server/teacher-session.server.js
export async function resolveAuthenticatedTeacherUserId(authHeader, req) {
  // 1. Try Supabase JWT (existing path — unchanged)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(jwt);
    if (data?.user?.id) return { ok: true, teacherUserId: data.user.id };
  }

  // 2. Try custom staff session cookie (new path)
  const staffToken = getStaffSessionCookie(req);
  if (staffToken) {
    const session = await resolveStaffSession(serviceRole, staffToken);
    if (session.ok) return { ok: true, teacherUserId: session.userId };
  }

  return { ok: false, status: 401, code: "unauthorized" };
}
```

This single change means all downstream API logic works unchanged. The `user_id` resolved from a staff session cookie is the same UUID that exists in `auth.users`, `teacher_profiles`, and all FK-linked tables.

---

## 6. Staff Code/PIN Format

### 6.1 Code format

| Persona | Format | Example |
|---|---|---|
| School Student | `{school_code}-S{seq:04d}` | `leok-S0002` |
| School Guardian/Parent | `{school_code}-P{seq:04d}` | `leok-P0002` |
| School Teacher | `{school_code}-T{seq:04d}` | `leok-T0005` |
| School Operator | `{school_code}-O{seq:04d}` | `leok-O0005` |

- `school_code` is the value from `school_accounts.school_code` (3–4 lowercase letters, unique, stable after creation).
- Sequence is per-school (not global), starting at 1, zero-padded to 4 digits.
- New sequences `next_teacher_seq` and `next_operator_seq` are added to `school_credential_sequences`.
- Sequences are incremented atomically by the service role API (same pattern as current parent/student sequences).
- Codes are case-insensitive at lookup time: normalize to lowercase before hashing or querying.

### 6.2 Uniqueness rules

- `code_display_normalized = lower(trim(code_display))` stored alongside `code_display`.
- Unique index on `(school_id, code_display_normalized)` where `revoked_at IS NULL`.
- If a code is revoked, the sequence number is **not** reused; a new sequence increment is used.
- A revoked code cannot be used to log in even if the index is non-unique; the `revoked_at IS NOT NULL` check in the login query prevents it.

### 6.3 PIN rules

- 4–6 numeric digits only (same as current guardian PIN).
- Stored as HMAC-SHA256 using the same `LEARNING_STUDENT_ACCESS_SECRET` environment variable.
- Helper: `hashStaffSecret(value)` — reuse the same `hashStudentSecret` implementation (or alias it).
- Plain PIN is never stored.
- Default PIN is generated by School Manager at staff account creation (system-generated random 4-digit PIN).
- Staff may be required to change PIN on first login (`must_change_pin` flag, same pattern as guardian `must_change_pin`).

### 6.4 Display formatting

- Display code is stored as-issued: `leok-T0005` (lowercase, includes dash).
- On creation, School Manager UI shows the code once alongside the initial PIN (cleared after acknowledgement).
- Code is visible in the School Manager staff list at any time.
- PIN is **never shown again** after initial display.

### 6.5 Reset / regenerate behavior

- School Manager can reset PIN (generates a new PIN, sets `must_change_pin = true`).
- School Manager can regenerate the code (new sequence number, new code, old code is immediately invalidated).
- Code regeneration creates a new row with a new sequence; the old row has `revoked_at` set.
- On regenerate, any active `school_staff_sessions` for that staff member are revoked.

### 6.6 Revoked code behavior

- Revoked codes: `revoked_at IS NOT NULL`. These rows are kept for audit.
- Login query filters `revoked_at IS NULL AND is_active = true`.
- Revoked codes cannot be reused for login.
- The sequence counter does not roll back; the next staff creation gets the next sequence.

---

## 7. Proposed Data Model

### 7.1 New table: `school_staff_access_codes`

```sql
-- Purpose: stores school-issued code/PIN credentials for school teachers and operators.
-- Staff identity (auth.users, teacher_profiles, school_teacher_memberships) is separate.

CREATE TABLE public.school_staff_access_codes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_role            text        NOT NULL CHECK (staff_role IN ('school_teacher', 'school_operator')),
  code_display          text        NOT NULL CHECK (char_length(code_display) BETWEEN 6 AND 20),
  code_display_normalized text      NOT NULL CHECK (code_display_normalized = lower(btrim(code_display))),
  pin_hash              text        NOT NULL CHECK (char_length(pin_hash) BETWEEN 16 AND 200),
  is_active             boolean     NOT NULL DEFAULT true,
  must_change_pin       boolean     NOT NULL DEFAULT false,
  failed_attempts       integer     NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until          timestamptz NULL,
  last_login_at         timestamptz NULL,
  revoked_at            timestamptz NULL,
  revoked_by            uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Active code must be unique per school
CREATE UNIQUE INDEX school_staff_access_codes_active_code_uq
  ON public.school_staff_access_codes (school_id, code_display_normalized)
  WHERE revoked_at IS NULL;

-- One active code per user per school
CREATE UNIQUE INDEX school_staff_access_codes_active_user_uq
  ON public.school_staff_access_codes (school_id, user_id)
  WHERE revoked_at IS NULL AND is_active = true;

CREATE INDEX school_staff_access_codes_user_idx
  ON public.school_staff_access_codes (user_id);

CREATE INDEX school_staff_access_codes_school_idx
  ON public.school_staff_access_codes (school_id)
  WHERE is_active = true AND revoked_at IS NULL;

ALTER TABLE public.school_staff_access_codes ENABLE ROW LEVEL SECURITY;
```

### 7.2 New table: `school_staff_sessions`

```sql
-- Purpose: custom session tokens for staff code/PIN login (no Supabase JWT involved).

CREATE TABLE public.school_staff_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_access_id       uuid        NOT NULL REFERENCES public.school_staff_access_codes(id) ON DELETE CASCADE,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id             uuid        NOT NULL REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  staff_role            text        NOT NULL CHECK (staff_role IN ('school_teacher', 'school_operator')),
  session_token_hash    text        NOT NULL CHECK (char_length(session_token_hash) BETWEEN 16 AND 200),
  user_agent            text        NULL CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  ip_hash               text        NULL CHECK (ip_hash IS NULL OR char_length(ip_hash) BETWEEN 16 AND 200),
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  last_seen_at          timestamptz NULL,
  revoked_at            timestamptz NULL
);

CREATE UNIQUE INDEX school_staff_sessions_token_active_uq
  ON public.school_staff_sessions (session_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX school_staff_sessions_access_idx
  ON public.school_staff_sessions (staff_access_id)
  WHERE revoked_at IS NULL;

CREATE INDEX school_staff_sessions_user_idx
  ON public.school_staff_sessions (user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX school_staff_sessions_expires_idx
  ON public.school_staff_sessions (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.school_staff_sessions ENABLE ROW LEVEL SECURITY;
```

### 7.3 Extension to `school_credential_sequences`

```sql
ALTER TABLE public.school_credential_sequences
  ADD COLUMN IF NOT EXISTS next_teacher_seq  integer NOT NULL DEFAULT 1 CHECK (next_teacher_seq >= 1),
  ADD COLUMN IF NOT EXISTS next_operator_seq integer NOT NULL DEFAULT 1 CHECK (next_operator_seq >= 1);
```

### 7.4 Existing table changes required

None to existing table structures at implementation time. However, the current `inviteSchoolTeacherByManager` function (`lib/school-server/school-teachers.server.js`) requires a `teacherUserId` that maps to an existing `auth.users` row. In the new model:

- School Manager creates a staff account (no prior auth.users entry).
- The server calls the **Supabase Admin Auth API** (`supabase.auth.admin.createUser`) to create an `auth.users` row with a UUID-based system-generated email (`staff-{uuid}@staff.noreply.liosh`) and a random password.
- The server then inserts `teacher_profiles`, `school_teacher_memberships`, `account_persona_entitlements`, and `school_staff_access_codes` rows **within a single Postgres transaction** using the service-role client.
- The generated email and random password are never exposed; they serve only as identity anchors. The internal email is **not** derived from the staff code or sequence counter.

**Important:** `supabase.auth.admin.createUser` is a Supabase Auth REST call and is **not part of the Postgres transaction** that inserts the profile/membership/entitlement/access-code rows. These are two separate operations. See section 9.3 for the required failure-recovery strategy.

### 7.5 Evaluating generalization of student/guardian access code tables

The existing `student_guardian_access` and `student_guardian_sessions` tables should **not** be generalized into a shared table. Reasons:
- Guardian access is per-student (links to `students.id`) while staff access is per-school (links to `school_accounts.id`).
- Guardian sessions have `guardian_access_id` FK while staff sessions have `staff_access_id` FK.
- The audit trails, rate limits, and RLS policies are different.
- Generalization would add complexity without clear benefit.
- Keep them separate for clarity and independent evolution.

---

## 8. Recommended Architecture

The recommended option is **Option 3 — Hybrid internal identity with custom session cookie**.

### Option comparison

| | Option 1: Pure custom session | Option 2: Supabase session via admin API | Option 3: Hybrid (Recommended) |
|---|---|---|---|
| auth.users row needed | No | Yes (system-generated) | Yes (system-generated) |
| FK integrity | Broken — all FKs fail | Works | Works |
| Changes to existing school APIs | All /api/school/** and /api/teacher/** must be rewritten | None | Only resolver function |
| Supabase Admin API usage | None | signInWithPassword server-side | createUser only |
| Session type | Custom cookie only | Supabase JWT | Custom cookie + user_id mapping |
| RLS compatibility | Broken (no auth.uid()) | Works — Supabase JWT sets auth.uid() | Not applicable for staff cookie sessions — auth.uid() is null; server-API guards via service-role are the authority (see section 8A) |
| Breakage risk | High | Low | Low |
| Security | Medium (no RLS) | Good | Good — server-side guard chain replaces RLS for staff; RLS still protects tables from accidental direct access |
| Maintainability | Poor | Medium | Good |

**Recommendation: Option 3.**

- Staff have an internal `auth.users` row (never exposed, system email, random password).
- Login is only via code/PIN through `/api/school/staff/login`.
- A custom `liosh_staff_session` cookie is issued containing a session token that maps to the `user_id`.
- `resolveAuthenticatedTeacherUserId` is extended to also accept the `liosh_staff_session` cookie.
- All downstream school API logic (membership checks, entitlement checks, quota checks) works unchanged.

### Architecture diagram

```
Staff Login Flow (future)
─────────────────────────
Client                     API                       DB
  │                         │                         │
  │  POST /api/school/      │                         │
  │  staff/login            │                         │
  │  { staffCode, pin }     │                         │
  │─────────────────────────▶                         │
  │                         │ checkStaffRateLimit      │
  │                         │─────────────────────────▶
  │                         │ SELECT school_staff_      │
  │                         │ access_codes WHERE        │
  │                         │ code_normalized = ?       │
  │                         │─────────────────────────▶
  │                         │◀─────────────────────────│
  │                         │ verify HMAC(pin)          │
  │                         │ INSERT school_staff_      │
  │                         │ sessions                  │
  │                         │─────────────────────────▶
  │◀─────────────────────────│                         │
  │  Set-Cookie:             │                         │
  │  liosh_staff_session=X   │                         │

Staff API Call (future)
────────────────────────
Client                     API                       DB
  │  GET /api/school/me     │                         │
  │  Cookie: liosh_staff_   │                         │
  │  session=X              │                         │
  │─────────────────────────▶                         │
  │                         │ resolveAuthenticatedTeacherUserId(header, req)
  │                         │  1. No JWT in header     │
  │                         │  2. Read liosh_staff_session cookie
  │                         │  3. SELECT school_staff_sessions WHERE token_hash = ?
  │                         │─────────────────────────▶
  │                         │◀─────────────────────────│
  │                         │  → user_id (same UUID as auth.users)
  │                         │ loadTeacherSchoolMembership(user_id)  [unchanged]
  │                         │ assertActivePersonaEntitlement(user_id, persona)  [unchanged]
  │◀─────────────────────────│                         │
  │  200 { data: { ... } }  │                         │
```

---

## 8A. RLS and Custom Cookie Behavior — Critical Constraints

This section states constraints that must be enforced throughout all implementation work. These are not optional.

### 8A.1 The `liosh_staff_session` cookie does not create a Supabase `auth.uid()` context

When a staff member authenticates via code/PIN and receives a `liosh_staff_session` cookie, **no Supabase session is created**. This means:

- `auth.uid()` is `null` in any Postgres RLS policy evaluation triggered by a Supabase client call during the staff request.
- Any RLS policy that relies on `auth.uid() = user_id` (e.g., `teacher_profiles_select_own`) will **not** grant access to the staff user via this cookie.
- The Supabase JS browser client has no knowledge of this session; it cannot call `supabase.from(...)` on the client side and expect RLS to allow access.

**This is by design.** The staff session is a server-only mechanism.

### 8A.2 All staff API calls must go through server-side route handlers

- Staff clients (browser) send requests to Next.js API routes (`/api/school/**`, `/api/teacher/**`) with the `liosh_staff_session` cookie.
- The API route reads the cookie server-side, resolves the `user_id` from `school_staff_sessions`, and then makes all DB queries using the **service-role client** (which bypasses RLS).
- The service-role client is the authority; it enforces access by checking `school_teacher_memberships`, `account_persona_entitlements`, `school_operator_grants`, and `school_id` scoping in application code — not via RLS policies.
- Staff must never be given a Supabase `anon` or `authenticated` client key and told to call the DB directly.

### 8A.3 Server-side guards are the sole authority for staff sessions

The authorization chain for a staff cookie request is:

```
liosh_staff_session cookie
  → resolveAuthenticatedTeacherUserId(header, req)
      reads school_staff_sessions (service role)
      verifies: not expired, not revoked
      returns: user_id
  → loadTeacherSchoolMembership(user_id)
      service role query on school_teacher_memberships
      verifies: school_id, role
  → assertActivePersonaEntitlement(user_id, persona)
      service role query on account_persona_entitlements
      verifies: persona, status = active
  → route-specific scope check
      (operator grants, school active, etc.)
```

Every layer of this chain runs server-side with the service-role client. There is no RLS step for staff sessions. If any guard in this chain is missing or bypassed, the staff member gains unauthorized access.

### 8A.4 Do not add direct Supabase client RLS policies for staff

- Do not add RLS policies on `school_staff_access_codes` or `school_staff_sessions` for the `authenticated` role keyed to `auth.uid()`. These tables are service-role-only.
- Do not add RLS policies on `teacher_profiles`, `school_teacher_memberships`, or `account_persona_entitlements` that attempt to allow access based on a staff cookie. There is no mechanism to convey cookie identity into a Postgres RLS context.
- RLS is enabled on these tables as a defense-in-depth measure (no accidental public access), but the `authenticated` role policies must only serve Supabase-JWT sessions (school managers, private teachers).

### 8A.5 Service-role access must always be wrapped by guards

Any code path that uses the service-role client inside a school API must validate:
1. The resolved `user_id` belongs to an active `school_teacher_memberships` row in the correct `school_id`.
2. The resolved `user_id` has an `account_persona_entitlements` row with the expected persona and `status = 'active'`.
3. For operators: the resolved `user_id` has a `school_operator_grants` row for the correct `school_id`.
4. The `school_accounts.is_active` flag is `true`.

Skipping any of these checks and relying only on "the session token is valid" is not sufficient.

---

## 9. Staff Account Creation Flow (School Manager)

### 9.1 Create School Teacher

1. School Manager opens teacher management page (future).
2. Manager enters: display name (required), contact email (optional, not login identity).
3. System checks quota: `COUNT active school_teacher_memberships WHERE school_id = ? AND role = 'teacher'` must be less than `school_accounts.max_school_teachers`.
4. If quota full: return error (`teacher_quota_full`); display quota in UI.
5. **Step A — Supabase Auth (outside Postgres transaction):** Server calls `supabase.auth.admin.createUser`:
   - email: `staff-{uuid}@staff.noreply.liosh` where `{uuid}` is a freshly generated UUID, unrelated to the staff code sequence (never disclosed; not a real email; never used for login)
   - password: `crypto.randomBytes(32).toString('base64url')` (never disclosed)
   - email_confirm: `true` (skip email confirmation)
   - This email is only an identity anchor for `auth.users` FK compatibility. It has no relation to the staff login code.
   - If this call fails, abort immediately and return error to manager. No DB rows created.
6. **Step B — Postgres provisioning (single DB transaction):** Using service-role client, within one transaction:
   - Increment `school_credential_sequences.next_teacher_seq` with `SELECT ... FOR UPDATE` to prevent race conditions; derive the visible staff code `{school_code}-T{seq:04d}`
   - `teacher_profiles` row (`id = user_id, display_name, school_id`)
   - `teacher_limits` row (plan: `teacher_school_unlimited` or a new school staff plan)
   - `school_teacher_memberships` row (`school_id, teacher_id = user_id, role = 'teacher'`)
   - `account_persona_entitlements` row (`user_id, persona = 'school_teacher', status = 'active', approval_source = 'school_admin'`)
   - `school_staff_access_codes` row with generated `code_display`, hashed initial PIN
   - If this transaction fails (Step B error), proceed to orphan cleanup (see section 9.3).
7. Return to manager: `{ staffCode: 'leok-T0005', initialPin: '####', userId: '...' }`.
8. UI shows code and PIN once. Manager communicates to teacher. Initial PIN is not stored in plaintext after display.
9. `must_change_pin = true` by default.

### 9.2 Create School Operator

Same flow, with:
- Role: `school_operator` in `school_teacher_memberships`
- Persona: `school_operator` in `account_persona_entitlements`
- Code: `{school_code}-O{seq:04d}`
- Sequence: `next_operator_seq`
- Quota check: `max_school_operators`
- Initial grants: `school_operator_grants` row with `student_access_admin = false, student_data_viewer = false` (manager grants permissions separately)

### 9.3 Failure-Recovery, Orphan Cleanup, and Sequence Behavior

#### Internal auth email and staff code are decoupled

The internal `auth.users` email (`staff-{uuid}@staff.noreply.liosh`) is UUID-based and has no relationship to the staff login code or the sequence counter. This means:

- A failed provisioning attempt does not consume or corrupt a staff code sequence number (the sequence is only incremented inside the Step B Postgres transaction, which rolls back on failure).
- If Step A is retried, a fresh UUID is generated for the new attempt — there is no risk of a duplicate-email conflict from a prior failed attempt.
- The orphan cleanup path does not need to reason about email-based deduplication.

#### Sequence behavior and gap tolerance

- The staff code sequence counter (`next_teacher_seq`, `next_operator_seq`) is incremented **inside** the Step B Postgres transaction.
- If Step B fails and rolls back, the sequence counter also rolls back — the number is not consumed.
- If a Postgres sequence (`CREATE SEQUENCE`) is used instead of a counter column, sequence numbers may be skipped after transaction rollbacks. This is acceptable.
- **Contiguous staff code numbers are not guaranteed.** Gaps in the sequence are acceptable after failed or retried provisioning. What matters is uniqueness and auditability, not contiguity.
- Never use the sequence to derive uniqueness for the internal auth email (use UUID instead, as specified above).

#### Scenario: Step A succeeds, Step B fails (most dangerous case)

The `auth.users` row exists but the staff member has no profile, no membership, no entitlement, and no access code. This user cannot log in (no code/PIN, no JWT), but the row is an orphan.

**Required cleanup strategy:**

1. On Step B transaction rollback, immediately call `supabase.auth.admin.deleteUser(userId)` to remove the orphan `auth.users` row.
2. If the cleanup call also fails (e.g., network error): log a structured error entry (`staff_provision_orphan`) with `user_id`, `school_id`, and timestamp. This log must be surfaced to Platform Admin for manual cleanup.
3. Return error `provision_failed` to the School Manager; no partial account is visible in the UI.

**Idempotency requirements:**

- The provisioning API uses `INSERT ... ON CONFLICT DO NOTHING` for `teacher_profiles`, `school_teacher_memberships`, `account_persona_entitlements`, and `school_staff_access_codes` so that a retry of Step B with the same `user_id` does not create duplicates.
- Sequence increment inside the Step B transaction is safe: if the transaction rolls back, the increment also rolls back.
- On retry, a fresh `user_id` (from a fresh Step A) means a fresh code slot — there is no ambiguity.

**Orphan detection (future ops tooling — not in current scope):**

- Platform Admin can query: `SELECT au.id FROM auth.users au LEFT JOIN teacher_profiles tp ON tp.id = au.id WHERE au.email LIKE 'staff-%@staff.noreply.liosh' AND tp.id IS NULL` to find orphan auth users.
- A scheduled cleanup job (future, out of scope for this plan) can delete stale orphan rows older than N hours.

#### Scenario: Step A is called twice on retry (should not happen with UUID emails, but documented for completeness)

Because the internal email is UUID-based, each Step A call generates a distinct email. A retry after Step A failure simply generates a new UUID email and calls `createUser` again. There is no duplicate-email risk from retries. If, through a bug, the same UUID were reused across retries (which must not happen), a duplicate-email error from the Admin API would be caught and treated as a hard error requiring investigation.

---

## 10. Login Route Decision

**Recommended: New route `/school/staff/login`.**

Rationale:
- `/teacher/login` is a Supabase email/password form that calls `supabase.auth.signInWithPassword` on the client. Adding a code/PIN mode inside it creates a confusing dual-mode page and risks entangling two fundamentally different auth paths.
- A dedicated `/school/staff/login` makes the auth separation explicit, is easier to test in isolation, and avoids accidental private-teacher access (separate page, no email/password fields shown).
- `/school/staff/login` would have two fields: staff code and PIN. No email, no password.
- Future: If the product wants a single school portal entry point, it can be a selector page that routes to `/school/manager/login` (email/password) or `/school/staff/login` (code/PIN).
- Do not remove or modify `/teacher/login` in this plan.

**New API endpoint:** `POST /api/school/staff/login`

---

## 10A. Pre-Implementation Route Audit (Required Before Any Code Touches Begin)

**This section is a mandatory blocker.** Implementation of the staff session resolver must not begin until this audit is complete and its findings are reviewed.

### 10A.1 What the audit must produce

Before any code changes, a developer must audit every file under `pages/api/school/` and `pages/api/teacher/` (approximately 60 + 138 route files based on current codebase size) and produce a checklist confirming the following for each route:

| Question | Why it matters |
|---|---|
| Does the route call `resolveAuthenticatedTeacherUserId`? | This is the single extension point for staff cookie auth. Routes that don't call it will not work for staff sessions without additional changes. |
| Does the route pass `req` (the request object) to the resolver or to any auth helper? | The resolver needs `req` to read the `liosh_staff_session` cookie. If only `req.headers.authorization` is passed (not `req`), the cookie cannot be read. |
| Does the route pass only the Authorization header string and not `req`? | These routes must be updated to also pass `req`, or a cookie-extraction wrapper must be added. |
| Does the route call any other auth check that bypasses the resolver entirely? | Any such route must be listed explicitly and either fixed or documented as Supabase-JWT-only. |

### 10A.2 Known resolver signature today

The current signature in `lib/teacher-server/teacher-session.server.js` is:

```js
resolveAuthenticatedTeacherUserId(authHeader)
// authHeader = req.headers.authorization || ""
```

The proposed new signature is:

```js
resolveAuthenticatedTeacherUserId(authHeader, req)
// req is the full Next.js IncomingMessage — needed to read cookies
```

Every call site that passes only `authHeader` (without `req`) must be updated. The audit must find all of them.

### 10A.3 Routes confirmed to need `req` passed through (partial list — audit must confirm full list)

From code inspected during planning:

| Route | Current call | Needs update? |
|---|---|---|
| `pages/api/teacher/me.js` | `resolveAuthenticatedTeacherUserId(req.headers.authorization \|\| "")` | Yes — must also pass `req` |
| `pages/api/school/me.js` (via `requireSchoolPortalMeContext`) | `resolveAuthenticatedTeacherUserId(authHeader)` — `authHeader` is `req.headers.authorization` | Yes |
| `pages/api/school/teachers/index.js` (via `requireSchoolManagerApiContext`) | Same pattern | Yes |
| `pages/api/school/operators/index.js` | Same pattern | Yes |
| All other `requireSchoolManagerApiContext` callers | Same pattern | Yes |
| All other `requireSchoolPortalMeContext` callers | Same pattern | Yes |
| All other `requireSchoolCredentialAdminApiContext` callers | Same pattern | Yes |
| All other `requireSchoolDataViewerContext` callers | Same pattern | Yes |

**The audit must enumerate all ~60 school routes and ~60 relevant teacher routes, not just this partial list.**

### 10A.4 Routes that must remain Supabase-JWT-only (do not add cookie path)

| Route group | Reason |
|---|---|
| `pages/api/admin/**` | Admin portal; uses `resolveAuthenticatedAdminUserId` which checks `app_metadata.role = 'admin'`; must not accept staff cookies |
| `pages/api/teacher/onboard.js` | Private teacher provisioning; called only after Supabase signup |
| Any route with `isAdminAppMetadataUser` check | Admin-only guard |

These routes must be explicitly listed in the audit output as "JWT-only, no staff cookie".

### 10A.5 Audit output format

The audit should produce a table:

```
Route file | Calls resolver | Passes req | Needs update | JWT-only | Notes
```

This table must be reviewed by the owner before implementation begins.

### 10A.6 Implementation blocker status

The following items are **hard blockers** — implementation must not begin until each is resolved:

| Blocker | Description | Resolution required |
|---|---|---|
| **B1** | Pre-implementation route audit (section 10A) not yet done | Complete audit; owner reviews table |
| **B2** | Supabase Admin API `createUser` behavior with system-generated email format not tested | Test that `@staff.internal` or `@staff.noreply.liosh` style emails are accepted by Supabase Admin API in the target project |
| **B3** | Failure-recovery for orphan `auth.users` rows not prototyped | Define and test the orphan cleanup path (`supabase.auth.admin.deleteUser`) before provisioning code ships |
| **B4** | RLS behavior of `school_staff_sessions` and `school_staff_access_codes` not confirmed | Confirm these tables are not accessible by `authenticated` role (Supabase JWT user); test with a regular teacher JWT |
| **B5** | Owner approval gates from section 22 not yet answered | All items in section 22 must be answered before implementation |
| **B6** | Hebrew copy for staff login page and manager UI not yet written or approved | All visible text must be approved before any UI work |

---

## 11. API Changes Required

### 11.1 New API endpoints (future migration)

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/school/staff/login` | None (public) | Staff code/PIN login |
| POST | `/api/school/staff/logout` | Staff session cookie | Staff logout |
| POST | `/api/school/teachers` (extend) | School Manager JWT | Create new staff account (provisioning) |
| PUT | `/api/school/teachers/[teacherId]/pin-reset` | School Manager JWT | Reset staff PIN |
| PUT | `/api/school/teachers/[teacherId]/suspend` | School Manager JWT | Suspend staff access |
| PUT | `/api/school/teachers/[teacherId]/reactivate` | School Manager JWT | Reactivate suspended staff |
| POST | `/api/school/teachers/[teacherId]/code-regenerate` | School Manager JWT | Regenerate staff code |
| POST | `/api/school/operators` (extend) | School Manager JWT | Create operator account |
| PUT | `/api/school/operators/[operatorId]/pin-reset` | School Manager JWT | Reset operator PIN |
| PUT | `/api/school/operators/[operatorId]/suspend` | School Manager JWT | Suspend operator |
| PUT | `/api/school/operators/[operatorId]/reactivate` | School Manager JWT | Reactivate operator |

### 11.2 Existing API changes (minimal)

| File | Change |
|---|---|
| `lib/teacher-server/teacher-session.server.js` | `resolveAuthenticatedTeacherUserId` extended to accept `liosh_staff_session` cookie as fallback to Supabase JWT |
| `pages/api/school/teachers/index.js` POST handler | Add new provisioning path (create staff from scratch) alongside existing invite path |
| No changes to other `/api/school/**` routes | Session resolution change is transparent |

### 11.3 APIs that must remain Supabase-email-session only

- `/api/teacher/onboard` — provisions new private teacher; only called after Supabase signup
- `/admin/**` routes — Platform Admin must remain on Supabase JWT
- Any endpoint that checks `isAdminAppMetadataUser` — Admin portal guard

---

## 12. UI Changes Required (Proposed, Not Implemented)

### 12.1 School Manager — Teachers page

- List of teachers with: display name, staff code (`leok-T0005`), status (active/suspended/revoked), assigned subjects
- Actions per teacher: Reset PIN, Suspend/Reactivate, Regenerate Code, Assign Subjects
- "Add Teacher" button → modal: display name (required), contact email (optional) → shows generated code + initial PIN once
- Quota counter: "X / Y teachers" where Y = `max_school_teachers`
- All visible text: Hebrew only, approved before implementation

### 12.2 School Manager — Operators page

- List of operators with: display name, staff code (`leok-O0005`), status, permissions (`student_access_admin`, `student_data_viewer`)
- Actions per operator: Reset PIN, Suspend/Reactivate, Regenerate Code, Grant/Revoke permissions
- "Add Operator" button → modal: display name (required), contact email (optional) → shows code + PIN once
- Quota counter: "X / Y operators" where Y = `max_school_operators`
- Permissions toggle: show/hide per operator
- All visible text: Hebrew only, approved before implementation

### 12.3 Staff login page (`/school/staff/login`)

- Staff code field (type text, autocomplete off)
- PIN field (type password / numeric, 4–6 digits)
- Login button
- Error states (Hebrew approved copy): invalid code/PIN, account locked, account suspended
- No email field, no "forgot password" link
- No redirect to private teacher portal
- No redirect to parent portal
- On success: redirect to `/teacher/dashboard` (for school teachers) or `/school/operator/dashboard` (for operators) based on `staff_role` returned in session
- All visible text: Hebrew only, approved before implementation

---

## 13. Role and Permission Model (Preserved)

As specified by owner; confirmed compatible with the proposed architecture:

| Persona | Access |
|---|---|
| School Manager | Email/password; creates/manages school teachers and operators; creates/resets/revokes codes; assigns subjects; grants operator permissions; works within quotas |
| School Teacher | Staff code/PIN; school-scoped only; assigned subjects and classes; no private students/classes; no parent portal; no admin; cannot manage credentials |
| School Operator | Staff code/PIN; no subjects/classes; explicit grants only (`student_access_admin`, `student_data_viewer`); no admin; no cross-school access; no private teacher path |
| Private Teacher | Email/password; Platform Admin controlled; no school staff code |

---

## 14. Quota Model

### 14.1 Quota enforcement rules

- `max_school_teachers` (`school_accounts` column) set by Platform Admin.
- Quota check: `COUNT(school_teacher_memberships WHERE school_id = ? AND role = 'teacher' AND is_active = true [or similar])` must be < quota before creating.
- Suspended staff: **still count against quota** (suspended = temporarily blocked, not removed from school). Rationale: slots should not be double-booked during suspension.
- Revoked staff: **do not count against quota** once revoked. Revocation = permanent removal from school; the slot is freed.
- Same rule for operators.

### 14.2 When quota is full

- Manager UI shows quota status visibly (e.g., "5 / 5 teachers — quota full").
- "Add Teacher" button is disabled or shows an inline error when quota is full.
- API returns `teacher_quota_full` (HTTP 403) if manager somehow bypasses UI guard.
- Quota increase requires Platform Admin to update `school_accounts.max_school_teachers`.

### 14.3 Quota display in UI

- Quota counters shown on Teachers page and Operators page.
- Dashboard `GET /api/school/me` response includes `stats.teacherCount` and `stats.operatorCount` vs. quota.

---

## 15. Security Requirements

| Requirement | Implementation |
|---|---|
| No plaintext PIN | HMAC-SHA256 with `LEARNING_STUDENT_ACCESS_SECRET`; never store raw PIN |
| Rate limiting | Reuse `lib/security/login-rate-limit.js`; per-IP and per-code buckets; same lockout steps (5f→30s, 10f→5m, 20f→1hr, 50f→24hr) |
| DB-level failed attempt tracking | `school_staff_access_codes.failed_attempts` + `locked_until` columns for persistent lockout even across server restarts |
| Session expiration | `school_staff_sessions.expires_at`; recommended: 8–12 hours for teachers, 4–8 hours for operators; configurable via env |
| Cookie flags | `HttpOnly`, `Secure` (in production), `SameSite=Strict`; no JS access to session token |
| School-scoped access | `school_id` validated on every API call; `requireSchoolPortalMeContext` already enforces this via membership check |
| Revoked/suspended staff | `is_active = false` or `revoked_at IS NOT NULL` blocks login; active sessions revoked immediately on suspension/revocation |
| Code not reused after revoke | Unique index on `(school_id, code_display_normalized) WHERE revoked_at IS NULL`; revoked codes can reappear in DB but never pass the login query |
| No cross-school access | Staff session stores `school_id`; resolver validates membership scope matches session `school_id` |
| Staff cannot access private teacher APIs | Entitlement check: `account_persona_entitlements.persona` for staff is `school_teacher` or `school_operator`, not `private_teacher`; private teacher APIs check `private_teacher` persona |
| Staff cannot access parent portal | Different session cookie (`liosh_staff_session` vs `liosh_guardian_session`); different session tables |
| Audit logging | See section 16 |
| Secret rotation | `LEARNING_STUDENT_ACCESS_SECRET` rotation plan: all existing hashes invalidated; staff must re-set PIN; this is a breaking operation requiring coordinated deployment |

---

## 16. Audit Logging

All of the following events should be recorded in the audit log (extend `teacher_access_audit` table or create a dedicated `school_staff_audit_log` table):

| Event | When | Actor |
|---|---|---|
| `staff_code_created` | School Manager creates staff account | School Manager (user_id) |
| `staff_pin_reset` | School Manager resets PIN | School Manager |
| `staff_login_success` | Staff successfully logs in | System (staff user_id) |
| `staff_login_failed` | Invalid code/PIN attempt | System (ip_hash, code_normalized) |
| `staff_login_lockout` | Account locked after failed attempts | System |
| `staff_suspended` | School Manager suspends staff | School Manager |
| `staff_reactivated` | School Manager reactivates staff | School Manager |
| `staff_code_regenerated` | School Manager regenerates code | School Manager |
| `staff_revoked` | School Manager permanently revokes staff access | School Manager |
| `staff_operator_grant_updated` | School Manager changes operator permissions | School Manager |
| `staff_logout` | Staff explicitly logs out | Staff |

**Deny-list for audit metadata (same as guardian audit):** `pin`, `pin_plain`, `pin_hash`, `token`, `token_plain`, `password`, `email`, `full_name`, `ip`, `ip_address`. Allowed: `ip_hash`, `user_agent`, `staff_code_normalized`.

---

## 17. Migration / Transition Approach

### 17.1 Current state

All school teachers and operators currently use Supabase email/password via `/teacher/login`. They have real email addresses registered in `auth.users` and real passwords. This cannot be broken.

### 17.2 Evaluated options

**Option A — Keep email/password, add code/PIN as future alternative**
- Safest; zero breakage.
- Staff can continue to use email/password; new staff created via school portal use code/PIN.
- Both login methods coexist for a transition period.
- Eventually disable email/password for staff (Phase 2).

**Option B — Migrate all existing school staff to code/PIN immediately**
- High risk; existing teachers lose their login method.
- Requires coordination with every school to distribute new credentials.
- Not recommended for initial rollout.

**Option C — Support both for a transition period, then disable email/password for school staff**
- Owner preference.
- Recommended approach.

### 17.3 Recommended transition plan (Option C)

**Phase 1 (New system, no migration):**
- New school staff accounts created by School Manager are code/PIN only.
- Existing staff accounts (email/password) continue to work unchanged.
- The `/teacher/login` page is unchanged.
- The new `/school/staff/login` page is deployed but only new accounts are directed there.

**Phase 2 (Parallel access):**
- Existing staff who want to switch voluntarily can ask School Manager to create a code/PIN credential.
- Both credentials coexist; staff can log in either way.
- School Manager UI shows which staff have code/PIN credentials vs. email-only.

**Phase 3 (Deprecate email for school staff):**
- Platform Admin sets a flag on `school_accounts` or globally to disable email/password login for school-role users.
- The flag is checked in `/teacher/login` — if user's membership role is `teacher` or `school_operator`, redirect to `/school/staff/login`.
- This is a breaking change; must be announced and coordinated.
- Private Teacher email/password login is NOT affected (different entitlement check).
- School Manager email/password login is NOT affected.

**Invariants throughout all phases:**
- School Manager email/password login is never touched.
- Private Teacher email/password login is never touched.
- Parent/guardian/student login is never touched.
- Platform Admin login is never touched.

---

## 18. Testing Plan

### 18.1 Unit tests (future)

- `hashStaffSecret`: same input produces same output; different secrets produce different output.
- `generateStaffCode`: format matches `{school_code}-{type}{seq:04d}`; incrementing sequence.
- `normalizeStaffCode`: lowercase, trim, expected output.
- `verifyStaffCredentials`: correct PIN accepted; wrong PIN rejected; revoked code rejected; suspended code rejected; locked account rejected.
- `issueStaffSession`: session row created; token hash stored; expires_at set correctly.
- `resolveAuthenticatedTeacherUserId`: JWT path unchanged; staff cookie path resolves correct user_id; both missing → 401.
- Quota check: at limit returns `teacher_quota_full`; below limit succeeds; suspended staff counted; revoked staff not counted.
- Rate limit: after 5 failures, lockout applied; after success, counter reset.

### 18.2 Integration tests (future)

- Full login flow: create staff account → login with code/PIN → call `/api/school/me` → correct role returned.
- PIN reset: reset → old PIN rejected → new PIN accepted.
- Code regenerate: old code rejected → new code accepted.
- Suspension: active → suspended → login rejected → reactivated → login accepted.
- Revocation: active → revoked → login rejected; session revoked.
- Operator grant: grant `student_data_viewer` → operator API access granted → revoke → denied.
- Quota enforcement: fill quota → next create returns `teacher_quota_full`.
- Rate limiting: 10+ failed PINs → lockout → retry after period.

### 18.3 E2E tests (future)

- School Manager creates teacher → navigates to `/school/staff/login` → logs in → sees teacher dashboard.
- School Manager creates operator → logs in → sees operator dashboard → student data visible (if granted).
- Wrong code → error displayed.
- Locked account → lock message displayed.

---

## 19. Manual QA Checklist (future)

- [ ] School Manager can create teacher; code and initial PIN shown once in UI.
- [ ] Teacher can log in at `/school/staff/login` with generated code and PIN.
- [ ] Teacher must change PIN on first login (if `must_change_pin = true`).
- [ ] Teacher cannot access `/teacher/dashboard` private teacher features (quota, private students).
- [ ] Teacher cannot access `/school/dashboard` school manager features.
- [ ] School Manager can reset teacher PIN; old PIN is immediately rejected.
- [ ] School Manager can suspend teacher; suspended teacher cannot log in.
- [ ] School Manager can reactivate teacher; reactivated teacher can log in.
- [ ] School Manager can revoke teacher; revoked teacher cannot log in; old code cannot be reused.
- [ ] School Manager can create operator; code and initial PIN shown once.
- [ ] Operator can log in at `/school/staff/login`.
- [ ] Operator without `student_data_viewer` grant cannot see student data.
- [ ] Operator with `student_data_viewer` grant can see student data.
- [ ] Operator cannot access teacher activity creation or subject assignment pages.
- [ ] Quota full: "Add Teacher" button shows error; API returns `teacher_quota_full`.
- [ ] 10+ wrong PINs: account locked; retry message shown.
- [ ] After lockout expires: login succeeds.
- [ ] `/teacher/login` (email/password) continues to work for School Manager and Private Teacher.
- [ ] Parent/guardian login unaffected.
- [ ] Student login unaffected.
- [ ] Platform Admin login unaffected.
- [ ] All UI visible text is Hebrew (no English or raw DB keys shown to users).

---

## 20. Out of Scope

- Password recovery / account recovery for staff (staff have no email to receive recovery; recovery is handled by School Manager resetting PIN).
- Multi-factor authentication for school staff.
- Staff-to-parent direct messaging (separate feature; messaging system already exists for teachers).
- Student creation by school teachers (not part of this plan; teachers work with pre-enrolled students).
- Private Teacher conversion to/from school teacher (entitlement system handles this as a separate concern).
- SSO or SAML integration for school staff.
- Mobile app integration (web-only for now).
- Email notification delivery of initial PIN (security risk; delivery method is at owner's discretion — in-person, printed, etc.).

---

## 21. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `LEARNING_STUDENT_ACCESS_SECRET` rotation invalidates all staff PINs | High | Document rotation process; include in ops runbook; alert before rotation |
| System-generated internal email (`@staff.internal`) rejected by Supabase | Medium | Test Supabase Admin API `createUser` with custom email format; use UUID-based email if needed (`{uuid}@staff.noreply`) |
| Revoked `auth.users` cascade-deletes `teacher_profiles` and all associated data | High | Use `ON DELETE SET NULL` or `ON DELETE RESTRICT` on sensitive FK chains; archive records before deleting auth.users |
| In-memory rate limit resets on server restart | Medium | `school_staff_access_codes.failed_attempts + locked_until` as persistent fallback; in-memory for speed, DB for durability |
| Code/PIN interception in transit | Medium | HTTPS only; `Secure` cookie flag enforced in production |
| Quota not enforced atomically (race condition) | Medium | Use DB transaction with `SELECT FOR UPDATE` on `school_credential_sequences` |
| Staff session duration too long → stale access after suspension | Medium | On suspension/revocation, revoke all active `school_staff_sessions` immediately |
| School code (`school_accounts.school_code`) changed after staff codes are issued | High | Add app-layer guard: `school_code` is immutable after staff codes exist; UI should warn manager |
| Private teacher accidentally assigned `school_teacher` membership | Medium | `assertActivePersonaEntitlement` check in APIs; private teacher persona is separate from school_teacher |
| `supabase.auth.admin.createUser` succeeds but DB transaction fails — orphan `auth.users` row | High | Follow orphan cleanup strategy in section 9.3; log `staff_provision_orphan` events; surface to Platform Admin |
| API route passes only `authHeader` (not `req`) to resolver — staff cookie not readable | High | Pre-implementation route audit (section 10A) must enumerate all call sites; any missed route silently rejects staff cookie sessions |
| Staff member uses browser Supabase client directly (bypassing server route) — `auth.uid()` is null, all RLS denies | Medium | Document clearly: staff must only call `/api/**` routes; no direct `supabase.from()` client calls for staff sessions |

---

## 22. Owner Approval Gates

The following decisions require explicit owner approval before implementation:

1. **Confirm code format:** `{school_code}-T{seq:04d}` and `{school_code}-O{seq:04d}` (4-digit zero-padded).
2. **Confirm session duration:** e.g., 8 hours for school teachers, 6 hours for school operators, or a different policy.
3. **Confirm system-generated email format** for internal `auth.users` rows (recommended: `staff-{uuid}@staff.noreply.liosh`).
4. **Confirm must_change_pin default:** Is a forced first-login PIN change required, or is the initial PIN permanent until manager resets?
5. **Confirm transition Phase 3 timing:** When is email/password disabled for school staff? Is there a deadline?
6. **Confirm audit log placement:** Extend `teacher_access_audit` or new `school_staff_audit_log` table?
7. **Hebrew copy for all staff UI pages** must be written and approved before any UI implementation.
8. **Confirm PIN length:** 4-digit only (like current students/guardians), or allow 4–6 digits.
9. **Confirm whether suspended staff count against quota** (current plan: yes; if no, update quota enforcement logic).
10. **Confirm delivery mechanism** for initial PIN (in-person, SMS, printed slip — never email without secure channel).

### 22A. Recommended Owner Defaults

The following defaults are recommended by the plan and should be treated as approved unless the owner explicitly overrides them in writing. They are included so implementation can proceed without waiting for every individual question to be re-answered.

| Decision | Recommended default | Rationale |
|---|---|---|
| Staff code format | `{school_code}-T0001` for teachers, `{school_code}-O0001` for operators (4-digit zero-padded sequence) | Consistent with existing student `S` and guardian `P` format; clear role indicator in the code |
| PIN length | 4 digits | Matches current student and guardian PIN pattern; change requires explicit owner decision |
| `must_change_pin` on creation | `true` — forced first-login PIN change | Prevents initial PIN from remaining in use indefinitely after delivery |
| Staff session duration (teacher) | 8 hours | Covers a school day; short enough to limit exposure |
| Staff session duration (operator) | 6 hours | Operators have broader data access (`student_data_viewer`); shorter default is prudent |
| Internal auth email format | `staff-{uuid}@staff.noreply.liosh` | UUID-based; never disclosed; no coupling to staff code sequence; eliminates duplicate-email risk on retry |
| Suspended staff count against quota | Yes — suspended staff occupy a slot | Prevents quota double-booking during temporary suspension; only revocation frees the slot |
| Revoked staff count against quota | No — revoked staff free their slot | Revocation is permanent; slot must be reclaimable |
| Audit log placement | Dedicated `school_staff_audit_log` table | Keeps school staff audit events separate from the teacher/guardian `teacher_access_audit` table; cleaner schema evolution |
| Initial PIN delivery method | Shown once to School Manager in the UI; no email or SMS in this implementation | Avoids adding an email/SMS delivery dependency; manager is responsible for communicating credentials in-person or by secure means |
| Staff code sequence gaps | Acceptable — gaps after failed provisioning are not a problem | Uniqueness and auditability matter; contiguous numbers are not required |

---

## 23. Explicit Confirmations

- No code changed.
- No SQL created or modified.
- No migration created.
- No UI changed.
- No Hebrew copy changed.
- No commit made.
- No push made.
- No deploy triggered.

---

## 24. Files / Routes Inspected (Read-Only)

### Migration files
- `supabase/migrations/015_student_access_codes_login_username.sql`
- `supabase/migrations/019_teacher_portal_foundation.sql`
- `supabase/migrations/022_teacher_access_prefix.sql`
- `supabase/migrations/025_teacher_quotas_admin.sql`
- `supabase/migrations/027_school_managed_portal.sql`
- `supabase/migrations/030_school_code.sql`
- `supabase/migrations/031_school_account_management.sql`
- `supabase/migrations/040_account_persona_entitlements.sql`
- `supabase/migrations/043_school_accounts_separate_quotas.sql`
- `supabase/migrations/044_school_operator_grants.sql`
- `supabase/migrations/046_school_teacher_memberships_school_operator_role.sql`

### Auth / login
- `pages/teacher/login.js`
- `pages/api/guardian/login.js`
- `lib/guardian-server/guardian-login.server.js`
- `lib/guardian-server/guardian-crypto.server.js`
- `lib/guardian-server/guardian-session.server.js`
- `lib/guardian-server/guardian-rate-limit.server.js`
- `lib/security/login-rate-limit.js`

### School server
- `lib/school-server/school-request.server.js`
- `lib/school-server/school-teachers.server.js`

### School APIs
- `pages/api/school/me.js`
- `pages/api/school/teachers/index.js`
- `pages/api/teacher/me.js`

### Existing internal documentation
- `docs/auth/SCHOOL_STAFF_LOGIN_MODEL_PROPOSAL.md`

---

## 25. Summary of Recommendation

| Decision | Recommendation |
|---|---|
| Staff session type | Option 3 (Hybrid): internal `auth.users` row + custom `liosh_staff_session` cookie |
| auth.users row required | Yes — kept for FK integrity; system-generated email/password, never exposed |
| teacher_profiles row required | Yes — unchanged; still needed for school membership and activity ownership |
| Login route | New `/school/staff/login` page (separate from `/teacher/login`) |
| Code/PIN hashing | Reuse `hashStudentSecret` (HMAC-SHA256 with `LEARNING_STUDENT_ACCESS_SECRET`) |
| New tables | `school_staff_access_codes`, `school_staff_sessions`; extend `school_credential_sequences` |
| Existing table changes | None to schema; resolver extended — all call sites must pass `req` (see route audit blocker B1) |
| School Manager creation flow | `supabase.auth.admin.createUser` with UUID-based internal email (Step A) + separate Postgres transaction generating staff code (Step B); orphan cleanup if Step B fails (section 9.3) |
| Internal auth email format | `staff-{uuid}@staff.noreply.liosh` — UUID-based, never disclosed, decoupled from staff code sequence |
| RLS for staff sessions | Not applicable — `auth.uid()` is null for cookie sessions; server-side service-role guard chain is the sole authority (section 8A) |
| Pre-implementation blocker | Route audit (section 10A) and all B1–B6 blockers must be resolved before any code changes |
| Generalize student/guardian tables | No — keep separate |
| Transition plan | Option C: new staff use code/PIN; existing staff retain email/password; Phase 3 disables email for school staff roles |
| Biggest risks | `LEARNING_STUDENT_ACCESS_SECRET` rotation; orphan `auth.users` after failed DB provisioning; Supabase Admin API email format compatibility; incomplete route audit leaving routes without cookie path |

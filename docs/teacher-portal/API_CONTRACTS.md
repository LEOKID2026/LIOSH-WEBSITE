# API Contracts — Teacher Portal (Phase 3)

> **Phase 3 deliverable. Documentation only. No API files, no routes, no code, no SQL run, no DB/RLS change, no migration created, no Hebrew/UI string written.**
>
> This document defines the **endpoint contracts** for the Teacher Portal (`/api/teacher/*`) and the teacher-issued guardian flow (`/api/guardian/*`). It does **not** create any route under `pages/api/`, does **not** create any helper under `lib/teacher-server/` or `lib/guardian-server/`, and does **not** modify any existing `pages/api/parent/*`, `pages/api/student/*`, or `pages/api/learning/*` route. All implementation is deferred to Phase 4 and beyond, each behind its own owner approval gate.
>
> Cross-references:
> - Master plan: [`docs/teacher-portal/TEACHER_PORTAL_MASTER_PLAN.md`](./TEACHER_PORTAL_MASTER_PLAN.md)
> - Phase 1 schema: [`docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md`](./sql-proposals/019_teacher_portal_foundation.md)
> - Phase 2 RLS / security: [`docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`](./RLS_SECURITY_PROPOSAL.md)
> - Authorization matrix: [`docs/security/AUTHORIZATION_AUDIT_PLAN.md`](../security/AUTHORIZATION_AUDIT_PLAN.md)
> - Risk register: [`docs/security/SECURITY_RISK_REGISTER.md`](../security/SECURITY_RISK_REGISTER.md)

## Hard boundaries (in force right now)

- **Documentation only.** No file is created under `pages/api/`, `lib/teacher-server/`, `lib/guardian-server/`, `pages/teacher/`, or `pages/guardian/`.
- No file is added or modified under `supabase/migrations/`. The migration filename `019_teacher_portal_foundation.sql` remains reserved (Phase 2 operational note).
- No SQL is executed against any environment.
- No RLS policy is created, altered, or dropped. The SQL examples in Phase 1 and Phase 2 stay as proposals.
- No existing `pages/api/parent/*`, `pages/api/student/*`, `pages/api/learning/*`, `pages/api/arcade/*`, `pages/api/admin/*`, `pages/api/learning-simulator/*` route is modified.
- No existing helper under `lib/parent-server/*`, `lib/learning-supabase/*`, `utils/parent-copilot/*` is modified.
- No Hebrew text, RTL layout, design, copy, label, or visible UI string is created or modified.
- **No commit, no push.** Created/updated locally only. The owner commits manually.
- `/parent/login` is **not** modified. Guardian sign-in is reachable only at `/guardian/login` (Phase 8). No banner, no toggle, no link is added to `/parent/login` in Phase 3 or in any later phase before an explicit, named Phase 10 approval.

## Approval rule (still gated)

- Approval of Phase 3 (this document) does **not** approve Phase 4 (Teacher login implementation), Phase 5–9, or any code change.
- Phase 4 starts only on a separate, explicit, named owner approval.
- Each individual endpoint contract below is implementable only inside its parent phase: `/api/teacher/onboard` and `/api/teacher/me` are implementable in Phase 4; `/api/teacher/students*`, `/api/teacher/classes/*`, `/api/teacher/audit` in Phase 5; the report-data endpoint in Phase 6; class report-data in Phase 7; `/api/teacher/student-access/*` and all `/api/guardian/*` in Phase 8.

## Owner-approved Phase 3 assumptions (recap)

These owner decisions govern every contract below:

1. **Consent artifact format.** A teacher cannot link an existing parent-owned student without an explicit consent artifact. The artifact is a **one-time signed token** scoped to `teacher_id + student_id + purpose = "teacher_student_link"`, single-use, with a **7-day expiry**. This document defines the issuer, verification flow, expiry, and failure handling. **Issuer implementation is deferred** — the parent-side action that issues these tokens is a separate, owner-approved follow-up phase. If the verification flow requires a future DB table (recommended, see Section "Consent token model"), it is marked **"requires future schema approval"** and is **not** implemented in Phase 4.
2. **Admin / school-roster bypass.** **Do not** reuse `ENGINE_REVIEW_ADMIN_TOKEN`. Any admin bypass is a **future owner-approved admin/school action** with explicit audit; it is documented here as future-only and **not** implemented in any current phase.
3. **Default `expires_at` for `student_guardian_access`.** **30 days**. Teacher/admin can renew or reissue access. **Permanent / until-revoked is not the default** and requires a later owner/legal approval.
4. **Magic-link delivery channels.** **Email-only** as the future digital delivery channel. **SMS is out of scope.** The simple first path remains **username + 4-digit PIN delivered out-of-band**. No email sending is implemented in Phase 4 or Phase 5.
5. **Teacher-side parent PII boundary.** Teacher dashboard and teacher APIs **must not** display parent email, parent name, or obfuscated email. Only access state (`active` / `revoked` / `expired`) is exposed. **Hebrew labels are not written in Phase 3.**
6. **Class-roster CSV import.** **Out of scope.** Marked future-only. CSV import must not imply teacher-side student creation until `students.parent_id` is audited and owner-approved.
7. **`actor_id` AFTER-INSERT existence check.** Documented as a requirement for the future converted migration / implementation: a server-side validation (preferred: `AFTER INSERT` trigger; alternative: helper-side validation before insert) ensures `actor_id` resolves to a real `teacher_profiles.id` or `student_guardian_access.id` row depending on `actor_role`. **Not implemented in Phase 3.**
8. **Guardian-session lifetime.** **24 hours.** No 7-day persistent guardian session in the first implementation. Any "remember this device" feature requires separate owner approval.

## Cross-cutting conventions

### Authentication types referenced below

- **`auth: teacher`** — Supabase Auth JWT for a user whose `auth.users.id` has a row in `teacher_profiles`. Sent as `Authorization: Bearer <access_token>`. Verified server-side via a future helper `lib/teacher-server/teacher-session.server.js → resolveAuthenticatedTeacherUserId(req)` (parallels [`lib/parent-server/policy-acceptance.server.js`](../../lib/parent-server/policy-acceptance.server.js) pattern). **Helper does not exist yet.**
- **`auth: guardian`** — server-issued HMAC cookie `liosh_guardian_session` backed by `student_guardian_sessions`. Verified server-side via a future helper `lib/guardian-server/guardian-session.server.js → resolveAuthenticatedGuardianAccessId(req)` (parallels [`lib/learning-supabase/student-auth.js`](../../lib/learning-supabase/student-auth.js)). **Helper does not exist yet.**
- **`auth: service-role`** — endpoints that run with the service-role Supabase client and never accept any client identity directly. Reachable only via internal calls or admin tooling. Marked explicitly when used.
- **`auth: none (rate-limited)`** — for login routes that issue a session, the request is unauthenticated but the route enforces rate-limiting and audit on every attempt.
- **What is rejected on every endpoint.** Anonymous, parent JWT, student session cookie, guardian cookie on a teacher route, teacher JWT on a guardian/parent/student route, expired/revoked sessions, mismatched cookie/JWT types. Rejection returns `401` with a generic, non-leaky body.

### Authorization layers (ordered)

Every endpoint applies, in order:

1. **HTTP method allowlist.** Mismatch → `405`. The route returns `Allow:` header listing the supported methods.
2. **Origin / Referer guard** for cookie-mutating routes (mirrors `lib/security/origin-guard.js` pattern). Mismatch → `403`.
3. **Rate-limit (where applicable).** Excess → `429` with `Retry-After`.
4. **Auth resolution.** Missing/invalid → `401`.
5. **Role check.** Wrong identity type for the route → `401`.
6. **Resource ownership check.** Wrong resource for this identity → `403` (or `404` where leaking existence is itself a risk; explicit per endpoint).
7. **Input validation.** Bad shape, length cap exceeded, unknown enum → `400`.
8. **Business invariants.** Limit hit, conflict, archive state → `409` or `422` per the endpoint.

### Standard error envelope

```json
{ "error": { "code": "string", "message": "english_developer_string" } }
```

- `error.code` is a stable machine token (e.g. `not_authenticated`, `not_authorized`, `consent_required`, `consent_invalid`, `student_not_linked`, `link_limit_reached`, `class_limit_reached`, `class_not_found`, `guardian_access_revoked`, `rate_limited`, `validation_failed`).
- `error.message` is **English-only developer text** for logs and devtools. **No Hebrew copy is shipped in Phase 3 or Phase 4.** All UI-facing Hebrew text is generated at the page layer in a later phase, behind a feature flag, after explicit Hebrew copy approval (master plan L11).
- Error responses **never** contain raw PINs, raw tokens, raw IPs, parent emails, full names, or PII.

### Standard success envelope (where the response is a payload)

```json
{ "data": { /* endpoint-specific shape */ } }
```

Endpoints that legitimately return no body use `204 No Content`.

### Audit conventions

- All audit rows are written by the service role inside the route handler (the `authenticated` role has no `INSERT` policy on `teacher_access_audit` — see [Phase 2 §9](./RLS_SECURITY_PROPOSAL.md)).
- Allowed `metadata` keys: `class_id`, `student_id`, `teacher_id`, `guardian_access_id`, `relationship`, `delivery_channel`, `outcome`, `error_code`, `username`, `user_agent` (optional), `ip_hash` (optional).
- **Forbidden `metadata` keys** (audit-write helper deny-list): `pin`, `pin_plain`, `token`, `token_plain`, `magic_link`, `magic_link_plain`, `password`, `email`, `email_plain`, `parent_email`, `guardian_email`, `full_name`, `parent_name`, `student_full_name`, `ip`, `ip_address`.
- `actor_id` is set per owner decision 7. The future trigger validates that `actor_id` resolves to the appropriate row class for the `actor_role`.

### Rate-limit conventions (in-memory, owner decision 4 / Phase 2)

- Pattern mirrors existing `lib/security/login-rate-limit.js` and copilot rate limiters: in-memory, per-process, lost on cold start (acceptable for first implementation).
- Buckets are explicit per endpoint below. Where a bucket is not listed, no rate limit is required beyond what the platform / Vercel already provides.
- Excess returns `429` with a `Retry-After` header in seconds and `error.code = "rate_limited"`.

### What is **not** in Phase 3 (deferred or future-only)

- `/api/parent/teacher-consent/*` — the parent-side issuer for the consent token. Future phase, separate approval. Without it, the teacher-side link API has no real input source; **Phase 5 will gate `/api/teacher/students/link` behind a feature flag** until the issuer ships.
- Admin / school bypass routes for linking. Future-only.
- CSV roster import. Future-only.
- Teacher-side student creation. Deferred (master plan §J).
- Teacher Copilot. Deferred (master plan §H, Phase 12+).
- Parent merge of guardian flow into `/parent/login`. Phase 10, separate approval.
- Email sending for magic links. Future-only; transport not chosen.
- DB-backed rate-limit table. Future-only (owner decision 4).

### Common type sketches (English, developer-only — not UI text)

```ts
type StudentRef = {
  studentId: string;
  studentFullNameMasked: string;
  gradeLevel: string | null;
  linkedAt: string;
  relationship: "primary_teacher" | "subject_teacher" | "tutor";
};

type ClassRef = {
  classId: string;
  name: string;
  gradeLevel: string | null;
  subjectFocus: string | null;
  studentCount: number;
  isArchived: boolean;
};

type GuardianAccessRef = {
  accessId: string;
  studentId: string;
  state: "active" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  deliveryChannel: "code" | "magic_link" | "email_invite";
};

type TeacherLimits = {
  planCode: string;
  studentLimit: number;
  classLimit: number;
};
```

- `studentFullNameMasked` is a deliberate masked variant (e.g. first name + last initial) to honor owner decision 5: teachers see student names because they teach those students, but the API surface never exposes parent identifying information. Phase 6 picks the exact masking rule; Phase 3 declares only that no parent PII is exposed.
- `studentId`, `classId`, `accessId` are UUIDs (validated `v4`).
- All timestamps are ISO 8601 strings (UTC).

### Consent token model (owner decision 1 — design only)

The teacher↔student link consent token is a **one-time signed string** with the following abstract shape:

- **Shape (transport).** Opaque string carried by the teacher in `POST /api/teacher/students/link` body field `consentToken`.
- **Scope.** Bound to `teacher_id`, `student_id`, and `purpose = "teacher_student_link"`. A token issued for `(teacher A, student S)` is **invalid** if presented for `(teacher A, student S2)`, `(teacher B, student S)`, or any other purpose.
- **Lifetime.** 7 days from issuance. After expiry, verification fails with `consent_invalid`.
- **Single-use.** Verification consumes the token. A second verification attempt fails with `consent_invalid`.
- **Issuer (future).** A parent-side action `POST /api/parent/teacher-consent/issue` (separate phase, separate owner approval). The parent picks a teacher (e.g. by a public teacher-handle field — design TBD) and a child; the issuer creates the artifact and returns it for out-of-band delivery (e.g. paper, encrypted message). Phase 3 does **not** implement the issuer.
- **Verification.** The teacher-link route validates: scope match (teacher_id == requester, student_id == request body), expiry, single-use, and consumes the token in the same transaction as the `teacher_students` insert.
- **Storage.** **Recommendation: a future `teacher_student_consent_tokens` table** (`token_hash`, `teacher_id`, `student_id`, `purpose`, `issued_by_parent_id`, `issued_at`, `expires_at`, `consumed_at`). **Marked "requires future schema approval"** — not part of Phase 1; not added to `019_teacher_portal_foundation.sql`. A separate, owner-approved schema phase introduces this table before Phase 5 implementation can ship the link route.
- **Failure handling.** Any verification failure returns `403` with `error.code = "consent_invalid"`. The route writes `teacher_access_audit` with `action = "link_consent_failed"` and `metadata = { student_id, error_code: "consent_invalid" }`. The route does **not** disclose whether the token expired, was already consumed, or was issued for a different teacher — all collapse to `consent_invalid`.
- **Admin bypass.** Owner decision 2: not via `ENGINE_REVIEW_ADMIN_TOKEN`. A future admin path may inject a server-side equivalent; documented as future-only here.

---

## Teacher APIs

> **Audience tag** for every endpoint below: `teacher-only`. None of these accept a parent JWT, a student session cookie, a guardian session cookie, or anonymous traffic. Implementation phase tags: `Phase 4` (login + me + onboard), `Phase 5` (students + classes + audit), `Phase 6` (single-student report), `Phase 7` (class report), `Phase 8` (student-access).
>
> **No Hebrew UI copy / no visible UI text in this phase.** Every contract below specifies only English developer error codes, English log strings, and machine-readable JSON shapes. Hebrew page copy is master plan gate L11 and is forbidden in any contract or code shipped before that gate.

### `POST /api/teacher/onboard` *(Phase 4)*

- **Method.** `POST`. Other methods → `405`.
- **Purpose.** Provisions a `teacher_profiles` row and a default `teacher_limits` row for the calling Supabase Auth user, exactly once. Mirrors the parent-side onboarding semantics but is opt-in: a parent signup never accidentally creates a teacher profile because nothing on the parent path calls this route.
- **Audience.** teacher-only.
- **Auth.** `auth: teacher` — the caller already holds a Supabase Auth session created by `supabase.auth.signUp(...)` or `supabase.auth.signInWithPassword(...)` from `/teacher/login`. The route additionally verifies that the user has been pre-tagged for the teacher path (e.g. `auth.users.app_metadata.role === "teacher"` set by the signup flow); if not tagged, the route refuses to provision and returns `403`. Phase 4 picks the exact tagging mechanism.
- **Origin guard.** Required (cookie-mutating-equivalent: this route writes profile rows tied to the calling user).
- **Rate-limit.** Per-IP **1/min, 5/hour** to deter abuse during signup floods.
- **Request body.**

```json
{
  "displayName": "string (max 80, trimmed)",
  "preferredLanguage": "string (max 16, trimmed, default null)"
}
```

- **Response (201, first call).**

```json
{
  "data": {
    "teacherId": "uuid",
    "displayName": "string|null",
    "preferredLanguage": "string|null",
    "isActive": true,
    "createdAt": "iso-8601",
    "limits": { "planCode": "teacher_basic_20", "studentLimit": 20, "classLimit": <int> }
  }
}
```

- **Response (200, idempotent re-call by same user).** Same shape as 201, returned without re-inserting.
- **Error statuses.**
  - `400 validation_failed` — `displayName` exceeds 80 chars or invalid type.
  - `401 not_authenticated` — no/invalid Supabase JWT.
  - `403 not_a_teacher` — user is not tagged for the teacher path.
  - `409 already_provisioned` — *not used*; the contract is idempotent. Documented for completeness.
  - `429 rate_limited` — bucket exhausted.
  - `500 internal_error` — DB/service-role failure.
- **Ownership checks.** `teacherId === auth.uid()` is the only valid value; the route never accepts a `teacherId` from the body. The `teacher_profiles.id` is set to `auth.uid()` by the route itself.
- **Privacy constraints.** No parent identifiers. No email of any kind in the response (the `auth.users.email` lives only in Supabase Auth).
- **Audit events written.** `action = "teacher_onboarded"`, `actor_role = "teacher"`, `actor_id = teacher_profiles.id`, `metadata = { plan_code: "teacher_basic_20", outcome: "created" | "idempotent" }`.
- **Service-role responsibilities.** This is the only route allowed to insert into `teacher_profiles`. It also performs the default `teacher_limits` insert (`plan_code = "teacher_basic_20"`) per owner decision 2 of Phase 2.
- **Class-limit handling.** The default plan's `class_limit` is read from `teacher_plans` and passed through. **`class_limit = 0` is a valid response** (owner decision 8 of Phase 2); the dashboard hides the classes tab if `classLimit === 0`. No code path in Phase 3 contracts assumes `classLimit > 0`.
- **No UI text.** Response is JSON-only. Phase 4 does not add Hebrew copy; pages render flag-disabled.

### `GET /api/teacher/me` *(Phase 4)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Returns the authenticated teacher's profile, current plan, current limits, and live counters (active student-link count, active class count). Used by the teacher dashboard shell, role-aware redirect guards, and any other route that needs cheap "who am I and what can I do" info.
- **Audience.** teacher-only.
- **Auth.** `auth: teacher`.
- **Origin guard.** Not strictly required (read-only), but the route uses Origin/Referer assertion to keep parity with other teacher-only routes; mismatch → `403`.
- **Rate-limit.** Per-teacher **60/min** (legitimate dashboard reloads, no realistic burst).
- **Request body.** None. Query params: none accepted; unknown query params → `400`.
- **Response (200).**

```json
{
  "data": {
    "teacher": {
      "teacherId": "uuid",
      "displayName": "string|null",
      "preferredLanguage": "string|null",
      "isActive": true,
      "createdAt": "iso-8601"
    },
    "limits": { "planCode": "string", "studentLimit": <int>, "classLimit": <int> },
    "counters": { "activeStudentLinks": <int>, "activeClasses": <int> },
    "flags": { "uiCopyEnabled": false }
  }
}
```

- **`flags.uiCopyEnabled`** is a read-only mirror of the feature-flag state that gates Hebrew UI rendering. **Always `false` until master plan L11 (Hebrew copy approval).** Phase 4 ships with this flag hardcoded `false`.
- **Error statuses.**
  - `400 unknown_query_param`.
  - `401 not_authenticated`.
  - `403 not_a_teacher` — Supabase user lacks the teacher role tag.
  - `404 teacher_profile_missing` — Supabase user is tagged but `/api/teacher/onboard` was never called. Client should redirect to onboarding.
  - `429 rate_limited`.
- **Ownership checks.** Always returns the calling teacher's own profile. Never accepts a `teacherId` from query/body.
- **Privacy constraints.** No `auth.users.email`, no parent identifiers, no other teachers' data, no per-student data.
- **Audit events.** None on the success path. Per-teacher dashboard reloads must not pollute audit. On `404 teacher_profile_missing`, no audit row.
- **Counter precision.** Counters are best-effort and may lag in-flight writes by a single request. They are not used for limit enforcement; the limit check is re-run server-side inside the link / create-class routes (see below).

### `GET /api/teacher/students` *(Phase 5)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Lists the active `teacher_students` set for the calling teacher, with enough fields for the dashboard roster card. Returns `archived_at IS NULL` rows only by default.
- **Audience.** teacher-only.
- **Auth.** `auth: teacher`.
- **Origin guard.** Required.
- **Rate-limit.** Per-teacher **60/min**.
- **Query params.**
  - `includeArchived` — `boolean`, default `false`. When `true`, returns archived links too with `archivedAt` set.
  - Unknown params → `400 unknown_query_param`.
- **Response (200).**

```json
{
  "data": {
    "students": [
      {
        "linkId": "uuid",
        "studentId": "uuid",
        "studentFullNameMasked": "string",
        "gradeLevel": "string|null",
        "relationship": "primary_teacher | subject_teacher | tutor",
        "linkedAt": "iso-8601",
        "archivedAt": "iso-8601|null",
        "guardianAccessSummary": {
          "active": <int>,
          "revoked": <int>,
          "expired": <int>
        }
      }
    ],
    "limits": { "planCode": "string", "studentLimit": <int>, "currentActive": <int> }
  }
}
```

- **Error statuses.** `400 unknown_query_param`, `401 not_authenticated`, `403 not_a_teacher`, `429 rate_limited`.
- **Ownership checks.** Service-role query joins `teacher_students` filtered on `teacher_id = teacherIdFromSession`. No client `teacherId` accepted.
- **Privacy constraints.**
  - `studentFullNameMasked` only — never the full name to start; the exact mask shape is owner-approved in Phase 6.
  - No `parent_id`, no parent email, no parent name (owner decision 5).
  - `guardianAccessSummary` shows counts only — not usernames, never PINs/tokens (owner decision 5 + Phase 2 audit deny-list).
- **Audit events.** None on the success path (read-only listing). A `503` or repeated unauthorized attempts may be logged via existing safe-log; not via `teacher_access_audit`.
- **Performance.** Page size soft-cap: 200 active links. The plan default is 20 students/teacher, so this is purely a defensive cap. No pagination contract in Phase 5; if a teacher's plan grows past 200, a `cursor` query param is added in a future minor (out of scope here).

### `POST /api/teacher/students/link` *(Phase 5 — gated by feature flag until consent issuer ships)*

- **Method.** `POST`. Other methods → `405`.
- **Purpose.** Creates a new active `teacher_students` row linking the calling teacher to an existing parent-owned student, **if and only if** a valid one-time signed consent token is presented. Owner decision 1 of Phase 3 governs the token. Owner decision 2 forbids reusing `ENGINE_REVIEW_ADMIN_TOKEN`; admin-issued bypass is future-only and **not** accepted by the Phase 5 implementation.
- **Audience.** teacher-only.
- **Auth.** `auth: teacher`.
- **Origin guard.** Required.
- **Rate-limit.** Per-teacher **10/min, 30/hour** (consent-token brute-force defense; the bucket also catches mass-link attempts).
- **Feature flag.** Implementation is gated behind `TEACHER_PORTAL_LINK_ENABLED` (server-side env, default `false`). Until the parent-side consent issuer is shipped (separate phase, separate approval), this route returns `503 link_unavailable` even for valid-looking input.
- **Request body.**

```json
{
  "studentId": "uuid",
  "consentToken": "opaque-string",
  "relationship": "primary_teacher | subject_teacher | tutor",
  "notes": "string (max 500, optional)"
}
```

- **Response (201).**

```json
{
  "data": {
    "linkId": "uuid",
    "studentId": "uuid",
    "relationship": "primary_teacher | subject_teacher | tutor",
    "linkedAt": "iso-8601"
  }
}
```

- **Error statuses.**
  - `400 validation_failed` — bad UUID, unknown enum, length cap exceeded, missing fields.
  - `401 not_authenticated`.
  - `403 not_a_teacher`.
  - `403 consent_required` — body missing `consentToken`.
  - `403 consent_invalid` — token expired, consumed, mismatched scope, or otherwise non-verifiable. **Single error code** to avoid scope-leak side channels.
  - `404 student_not_found` — `studentId` does not exist. Returned only **after** consent-token verification fails on scope, so existence cannot be enumerated by guessing student UUIDs without a token.
  - `409 already_linked` — an active `teacher_students` row exists for `(teacher_id, student_id)`.
  - `409 link_limit_reached` — calling teacher's `currentActive` already equals `studentLimit`. The error message includes the resolved `studentLimit` (server-derived, not a hardcoded constant — avoids the existing parent quirk where the message always says "3" even for QA's 50; see [`pages/api/parent/create-student.js`](../../pages/api/parent/create-student.js)).
  - `429 rate_limited`.
  - `503 link_unavailable` — feature flag off (default until consent issuer ships).
- **Ownership checks.**
  - The route never trusts a body-supplied `teacherId`. The teacher is `teacherIdFromSession`.
  - Consent token must verify with `purpose === "teacher_student_link"`, `teacher_id === teacherIdFromSession`, `student_id === body.studentId`, not expired, not consumed.
  - Limit re-checked atomically inside the same service-role transaction that performs the insert. Two concurrent links cannot both succeed past the limit.
  - **Archived link reactivation (owner decision 7 of Phase 2).** If a previously archived link exists for `(teacher_id, student_id)`, the route does **not** flip the old row back to active. It either inserts a fresh row with default `relationship` and blank `notes`, or — if Phase 1's unique constraint on `(teacher_id, student_id)` collides with the archived row — first sets the archived row's `id` to a soft-deleted form by toggling `archived_at` to NULL is **forbidden**; the chosen path is to keep `archived_at` set on the old row and require Phase 1's unique index to be `WHERE archived_at IS NULL`. The Phase 1 schema [proposal](./sql-proposals/019_teacher_portal_foundation.md) already specifies a partial unique index on active rows, so a fresh row is always insertable.
- **Privacy constraints.** No parent email/name in any branch. Error responses never reveal the student's full name or parent identity.
- **Audit events written.**
  - On success: `action = "link_created"`, `actor_role = "teacher"`, `actor_id = teacher_id`, `metadata = { student_id, relationship }`.
  - On `consent_invalid`: `action = "link_consent_failed"`, `metadata = { student_id, error_code: "consent_invalid" }`.
  - On `link_limit_reached`: `action = "link_limit_reached"`, `metadata = { student_id, plan_code, student_limit }`.
  - On `403 not_a_teacher` and `401 not_authenticated`: no audit row (these are noise; rely on existing `lib/security/safe-log.js`).

### `POST /api/teacher/students/unlink` *(Phase 5)*

- **Method.** `POST`. Other methods → `405`. (Choosing `POST` over `DELETE` for Origin-guard parity with other state-changing teacher routes.)
- **Purpose.** Soft-archives an active `teacher_students` row by setting `archived_at = now()`. Does **not** hard-delete and does **not** affect the student's parent ownership, learning data, or any other relationship. If the teacher had active class memberships for the student, those memberships are also soft-archived in the same service-role transaction.
- **Audience.** teacher-only.
- **Auth.** `auth: teacher`.
- **Origin guard.** Required.
- **Rate-limit.** Per-teacher **10/min**.
- **Request body.**

```json
{ "linkId": "uuid", "reason": "string (max 200, optional)" }
```

- **Response (200).**

```json
{
  "data": {
    "linkId": "uuid",
    "archivedAt": "iso-8601",
    "archivedClassMemberships": <int>,
    "guardianAccessRevoked": <int>
  }
}
```

- **Error statuses.** `400 validation_failed`, `401 not_authenticated`, `403 not_a_teacher`, `404 link_not_found` (already archived or never existed for this teacher), `429 rate_limited`.
- **Ownership checks.** `teacher_students.teacher_id === teacherIdFromSession` AND `teacher_students.archived_at IS NULL`. Otherwise → `404`.
- **Privacy constraints.** `reason` text is stored on the archived row but never exposed to anyone except the teacher who wrote it (and admin auditors). Audit row references the link by id only.
- **Audit events written.** `action = "link_archived"`, `metadata = { student_id, archived_class_memberships, guardian_access_revoked }`.
- **Side effects on guardian access.** Every active `student_guardian_access` row created by this teacher for this student is also revoked in the same service-role transaction (sets `revoked_at = now()`, `is_active = false`, cascade-revokes `student_guardian_sessions`). This is reflected in `guardianAccessRevoked` in the response. Each cascaded revoke writes its own `grant_revoked` audit row with `metadata.cascaded_from = "link_archived"`.

### `GET /api/teacher/students/[studentId]/report-data` *(Phase 6)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Returns the diagnostic / report payload for a single student that the calling teacher is linked to. Reuses the existing parent-side aggregator under a different ownership gate. **No parent route is modified.**
- **Audience.** teacher-only.
- **Auth.** `auth: teacher`.
- **Origin guard.** Required.
- **Rate-limit.** Per-teacher **30/min**.
- **Path param.** `studentId: uuid`.
- **Query params.**
  - `windowDays` — `int`, optional, default per existing parent-report aggregator (parity with [`pages/api/parent/students/[studentId]/report-data.js`](../../pages/api/parent/students/[studentId]/report-data.js)).
  - Unknown params → `400 unknown_query_param`.
- **Response (200).** Matches the existing parent report-data envelope shape, with the following adjustments per owner decision 5:
  - `report.parent` — **stripped**: never includes parent email, parent display name, or parent UUID. The teacher response either omits the `parent` block entirely or replaces it with a minimal `{ "linkOrigin": "parent_owned" }` flag.
  - `report.copilotLastResponse` and any copilot-related fields — **omitted** (teacher does not see Parent Copilot output; owner decision 6 of Phase 2 + master plan §H).
  - `report.guardianAccessSummary` — **added**: counts only (`active`, `revoked`, `expired`), no usernames, no PIN/token bytes.
  - All other report blocks (diagnostic units, weakness map, mastery distribution, attention list, time-on-task, etc.) match the parent shape so the same renderer components can consume both. The exact mapping is locked in Phase 6 implementation.
- **Error statuses.**
  - `400 validation_failed` — bad UUID.
  - `400 unknown_query_param`.
  - `401 not_authenticated`.
  - `403 not_a_teacher`.
  - `403 student_not_linked` — `studentId` is not in the calling teacher's active `teacher_students` set **and** not a member of any class the teacher owns. Used instead of `404` so an admin replay can distinguish "wrong owner" from "no such student"; teacher clients **must** treat both `403` and `404` as "you cannot view this".
  - `404 student_not_found` — `studentId` does not exist anywhere. Returned only after the ownership check passes (i.e. the row exists but the teacher's link was archived between dashboard load and report click). In practice clients see `403` more often.
  - `429 rate_limited`.
- **Ownership checks.** Service-role query joins `teacher_students` (active) UNION joins `teacher_class_students` (active) → `teacher_classes` (owned). If neither set yields the `studentId`, → `403 student_not_linked`. **No new RLS policy is added to `students`, `learning_sessions`, `answers`, `student_learning_state`** — the existing parent-scoped policies remain the only RLS gate; teacher access is mediated via service role + the manual join (Phase 2 category C).
- **Privacy constraints.** Owner decision 5 strict-honored: no parent email, no parent name, no parent UUID. Student name is allowed (the teacher legitimately needs it) but Phase 6 picks the masking rule.
- **Audit events written.** `action = "viewed_report"`, `actor_role = "teacher"`, `actor_id = teacher_id`, `metadata = { student_id, source: "single_student" }`. Written **at most once per (teacher, student, calendar day)** to keep audit volume bounded; the day-bucketing helper is part of Phase 6, not Phase 3.
- **Cross-doc reference.** The report aggregator is the existing [`aggregateParentReportPayload`](../../lib/parent-server/report-data-aggregate.server.js) and the diagnostic stack `utils/diagnostic-engine-v2/*`. Phase 6 wraps that aggregator with a teacher-side adapter `lib/teacher-server/teacher-report.server.js` that re-uses the same DB-input logic but enforces the teacher ownership gate. **No file in `lib/parent-server/*` is modified.**

### `GET /api/teacher/classes` *(Phase 5)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Lists the teacher's classes (active and optionally archived).
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Origin guard.** Required. **Rate-limit.** Per-teacher **60/min**.
- **Query params.** `includeArchived: boolean` (default `false`). Unknown → `400`.
- **Response (200).**

```json
{
  "data": {
    "classes": [
      {
        "classId": "uuid",
        "name": "string",
        "gradeLevel": "string|null",
        "subjectFocus": "string|null",
        "studentCount": <int>,
        "isArchived": <bool>,
        "createdAt": "iso-8601"
      }
    ],
    "limits": { "planCode": "string", "classLimit": <int>, "currentActive": <int> }
  }
}
```

- **Error statuses.** `400 unknown_query_param`, `401 not_authenticated`, `403 not_a_teacher`, `429 rate_limited`.
- **Ownership checks.** `teacher_classes.teacher_id === teacherIdFromSession`.
- **Privacy constraints.** Class metadata only; no student names exposed in this list (the dashboard fetches per-class roster separately).
- **`classLimit = 0` handling.** Owner decision 8 of Phase 2: if the resolved `classLimit` is `0`, the response still returns `200` with `classes: []` and `limits.classLimit: 0`. The dashboard hides the classes tab for `classLimit === 0`.
- **Audit events.** None.

### `POST /api/teacher/classes` *(Phase 5)*

- **Method.** `POST`. Other methods → `405`.
- **Purpose.** Creates a new active class for the calling teacher.
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Origin guard.** Required. **Rate-limit.** Per-teacher **10/min**.
- **Request body.**

```json
{
  "name": "string (max 80, trimmed, required)",
  "gradeLevel": "string (max 32, optional)",
  "subjectFocus": "string (max 80, optional)"
}
```

- **Response (201).**

```json
{ "data": { "classId": "uuid", "createdAt": "iso-8601" } }
```

- **Error statuses.**
  - `400 validation_failed`.
  - `401 not_authenticated`, `403 not_a_teacher`.
  - `409 class_limit_reached` — `currentActive === classLimit`. Error message includes the server-resolved `classLimit`.
  - `409 class_limit_zero` — for clarity if `classLimit === 0`, this is returned instead of `class_limit_reached`. Client suppresses the classes UI entirely.
  - `429 rate_limited`.
- **Ownership checks.** `teacher_id` set to `teacherIdFromSession`. Limit checked atomically.
- **Privacy.** No PII. **Audit events.** `action = "class_created"`, `metadata = { class_id }`.

### `GET /api/teacher/classes/[classId]` *(Phase 5/7)*

- **Method.** `GET`.
- **Purpose.** Returns class metadata + member roster (masked student names) + class-level summary placeholder for Phase 7.
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Path param.** `classId: uuid`.
- **Response (200).**

```json
{
  "data": {
    "class": {
      "classId": "uuid",
      "name": "string",
      "gradeLevel": "string|null",
      "subjectFocus": "string|null",
      "isArchived": <bool>,
      "createdAt": "iso-8601"
    },
    "members": [
      {
        "membershipId": "uuid",
        "studentId": "uuid",
        "studentFullNameMasked": "string",
        "joinedAt": "iso-8601"
      }
    ]
  }
}
```

- **Phase 7 extension.** When Phase 7 ships, this response gains a `summary` block with class accuracy, weakness heatmap, attention list, and instructional next-step recommendations. Phase 7 is a separate approval gate; Phase 5 ships only the metadata + roster.
- **Error statuses.** `400`, `401`, `403 not_a_teacher`, `404 class_not_found` (also when class is owned by another teacher — same code, no existence leak), `429`.
- **Ownership checks.** `teacher_classes.teacher_id === teacherIdFromSession` AND not archived (or archived returned only when caller passes `?includeArchived=true`).
- **Privacy.** No parent identifying info; masked student names only.
- **Audit events.** None on read.

### `PATCH /api/teacher/classes/[classId]` *(Phase 5)*

- **Method.** `PATCH`. **Origin guard.** Required. **Rate-limit.** Per-teacher **20/min**.
- **Purpose.** Renames a class or updates `gradeLevel` / `subjectFocus`. Cannot change `teacher_id`.
- **Request body.** Any subset of `{ name, gradeLevel, subjectFocus }`. Field constraints same as create.
- **Response (200).** `{ "data": { "classId": "uuid", "updatedAt": "iso-8601" } }`.
- **Error statuses.** `400`, `401`, `403`, `404 class_not_found`, `409 class_archived` (cannot rename archived classes), `429`.
- **Audit events.** `action = "class_updated"`, `metadata = { class_id, fields_changed: [string] }`.

### `POST /api/teacher/classes/[classId]/archive` *(Phase 5)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **10/min**.
- **Purpose.** Soft-archives a class (sets `is_archived = true` and stamps `archived_at`). Does not remove members; the membership rows are also soft-archived (`removed_at = now()`) in the same service-role transaction.
- **Response (200).** `{ "data": { "classId": "uuid", "archivedAt": "iso-8601", "memberRowsArchived": <int> } }`.
- **Error statuses.** `401`, `403`, `404`, `409 already_archived`, `429`.
- **Audit events.** `action = "class_archived"`, `metadata = { class_id, member_rows_archived }`.

### `POST /api/teacher/classes/[classId]/members` *(Phase 5)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **30/min**.
- **Purpose.** Adds a student to a class. The student must already be in the calling teacher's active `teacher_students` set (Phase 2 RLS `teacher_class_students_insert_via_owned_class_and_link`).
- **Request body.** `{ "studentId": "uuid" }`.
- **Response (201).** `{ "data": { "membershipId": "uuid", "joinedAt": "iso-8601" } }`.
- **Error statuses.**
  - `400 validation_failed`.
  - `401`, `403 not_a_teacher`, `403 student_not_linked` (student is not in `teacher_students` for this teacher).
  - `404 class_not_found`.
  - `409 class_archived`.
  - `409 already_member`.
  - `429`.
- **Ownership checks.** Class owned by teacher AND student linked to teacher (Phase 2 §4 cross-table guard).
- **Privacy.** No parent identifying info.
- **Audit events.** `action = "class_member_added"`, `metadata = { class_id, student_id }`.

### `DELETE /api/teacher/classes/[classId]/members/[membershipId]` *(Phase 5)*

- **Method.** `DELETE`. **Origin guard.** Required. **Rate-limit.** Per-teacher **30/min**.
- **Purpose.** Soft-removes a class membership (`removed_at = now()`). Does not affect the student's `teacher_students` link.
- **Response (200).** `{ "data": { "membershipId": "uuid", "removedAt": "iso-8601" } }`.
- **Error statuses.** `401`, `403`, `404 membership_not_found`, `429`.
- **Audit events.** `action = "class_member_removed"`, `metadata = { class_id, student_id }`.

### `GET /api/teacher/student-access` *(Phase 8)*

- **Method.** `GET`.
- **Purpose.** Lists guardian-access rows the calling teacher created, optionally filtered by `studentId`.
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Origin guard.** Required. **Rate-limit.** Per-teacher **60/min**.
- **Query params.** `studentId: uuid` (optional, filters), `state: "active" | "revoked" | "expired" | "all"` (optional, default `"active"`). Unknown → `400`.
- **Response (200).**

```json
{
  "data": {
    "accesses": [
      {
        "accessId": "uuid",
        "studentId": "uuid",
        "state": "active | revoked | expired",
        "createdAt": "iso-8601",
        "expiresAt": "iso-8601|null",
        "revokedAt": "iso-8601|null",
        "deliveryChannel": "code | magic_link | email_invite",
        "loginUsername": "string",
        "lastLoginSucceededAt": "iso-8601|null"
      }
    ]
  }
}
```

- **Error statuses.** `400`, `401`, `403 not_a_teacher`, `429`.
- **Ownership checks.** `created_by_teacher_id === teacherIdFromSession`. If `studentId` is supplied, also checked that the calling teacher has an active `teacher_students` link OR an active class membership for that student. Otherwise `403 student_not_linked`.
- **Privacy constraints.** **`loginUsername` is exposed** — it is the username the **teacher** chose for the guardian credential (not a parent email, not a parent name). It is **not** parent PII (owner decision 5). The list **never** returns `code_hash`, `pin_hash`, raw PINs, raw tokens, magic-link strings, parent emails, or parent names.
- **Audit events.** None on the success path.

### `POST /api/teacher/student-access/create` *(Phase 8)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **5/min, 30/hour**.
- **Purpose.** Mints a new `student_guardian_access` row + plaintext PIN for out-of-band delivery. PIN is **shown once** and never persisted in plaintext (mirrors [`pages/api/parent/create-student-access-code.js`](../../pages/api/parent/create-student-access-code.js)).
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Request body.**

```json
{
  "studentId": "uuid",
  "expiresInDays": <int, optional, default 30, owner-decision 3>,
  "deliveryChannel": "code | magic_link | email_invite",
  "notes": "string (max 500, optional)"
}
```

- `expiresInDays` defaults to **30** per owner decision 3. Maximum allowed value in Phase 8: **90**. Permanent access (`null` / `0`) is **not** accepted in this phase; explicit owner / legal approval is required to enable it.
- `deliveryChannel = "email_invite"` is **forbidden in Phase 8** (returns `400 delivery_channel_not_implemented`) because owner decision 4 says no email sending in this phase. `magic_link` is allowed only in the sense that the route can mint a magic-link token in `teacher_access_invitations`, but actual email transport is not built — the teacher receives the magic-link URL in the response and is responsible for out-of-band delivery.
- **Response (201).**

```json
{
  "data": {
    "accessId": "uuid",
    "studentId": "uuid",
    "loginUsername": "string",
    "loginPinPlaintext": "1234",
    "expiresAt": "iso-8601",
    "magicLink": "https://.../guardian/login?invite=opaque-token (only when deliveryChannel='magic_link')",
    "shownOnceWarning": "Plaintext PIN/magic-link will not be retrievable after this response. Store securely."
  }
}
```

- **`loginPinPlaintext` and `magicLink` are returned exactly once.** They are not stored in plaintext anywhere on the server (only `pin_hash` and `token_hash`). They never appear in `teacher_access_audit.metadata` (audit deny-list).
- **Error statuses.**
  - `400 validation_failed`.
  - `400 delivery_channel_not_implemented` — for `deliveryChannel = "email_invite"` in Phase 8.
  - `400 expiry_out_of_range` — `expiresInDays > 90` or non-positive.
  - `401`, `403 not_a_teacher`, `403 student_not_linked` — student not in calling teacher's active links.
  - `409 active_access_exists` — there is already an active access row for `(student_id, created_by_teacher_id)`. Teacher must revoke or rotate the existing one. **Multiple guardians for the same student** are supported by separate teachers, but a single teacher gets one active row per student to keep the audit story simple; rotating creates a new row only after revoking the old one.
  - `429`.
- **Ownership checks.** `teacher_students` (active) OR `teacher_class_students` (active, owned class) ownership of `studentId`. The route never trusts a body-supplied `teacher_id`.
- **Privacy.** Response contains the plaintext PIN exactly once; this is the only place plaintext leaves the server. **Audit row contains only `metadata = { student_id, access_id, delivery_channel, expires_at }` — no PIN, no token, no PII.**
- **Audit events written.** `action = "grant_created"`, `actor_role = "teacher"`, `actor_id = teacher_id`. Plus, if `deliveryChannel = "magic_link"`, a separate `action = "magic_link_issued"` row with `metadata = { student_id, access_id, expires_at }`.
- **`loginUsername` generation.** Server-side, collision-free, opaque (e.g. `g_<6-base32>` plus a unique-active-username partial index from Phase 1). Teachers may rotate the username later (see below).

### `POST /api/teacher/student-access/[accessId]/revoke` *(Phase 8)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **20/min**.
- **Purpose.** Revokes a guardian-access row. Sets `is_active = false`, `revoked_at = now()`, and **revokes every dependent `student_guardian_sessions` row** in the same service-role transaction.
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Request body.** `{ "reason": "string (max 200, optional)" }`.
- **Response (200).** `{ "data": { "accessId": "uuid", "revokedAt": "iso-8601", "sessionsRevoked": <int> } }`.
- **Error statuses.** `400`, `401`, `403 not_a_teacher`, `404 access_not_found` (covers also "owned by another teacher"), `409 already_revoked`, `429`.
- **Ownership checks.** `created_by_teacher_id === teacherIdFromSession`.
- **Privacy.** `reason` retained server-side; not exposed to guardians.
- **Audit events written.** `action = "grant_revoked"`, `metadata = { student_id, access_id, sessions_revoked }`.

### `POST /api/teacher/student-access/[accessId]/rotate-pin` *(Phase 8)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **5/min, 30/hour**.
- **Purpose.** Generates a new 4-digit PIN for an active guardian access. **All existing guardian sessions for the access are revoked** in the same transaction so the old PIN cannot continue an in-flight session.
- **Response (200).**

```json
{ "data": { "accessId": "uuid", "loginPinPlaintext": "5678", "rotatedAt": "iso-8601", "sessionsRevoked": <int> } }
```

- **Error statuses.** `401`, `403`, `404 access_not_found`, `409 access_not_active` (covers revoked/expired), `429`.
- **Privacy.** Plaintext PIN returned **once**; never stored in plaintext; never logged in audit `metadata` (deny-list).
- **Audit events.** `action = "pin_rotated"`, `metadata = { student_id, access_id, sessions_revoked }`.

### `POST /api/teacher/student-access/[accessId]/rotate-username` *(Phase 8)*

- **Method.** `POST`. **Origin guard.** Required. **Rate-limit.** Per-teacher **5/min**.
- **Purpose.** Rotates `login_username` to a new collision-free value. Existing guardian sessions are revoked in the same transaction.
- **Response (200).** `{ "data": { "accessId": "uuid", "loginUsername": "string", "rotatedAt": "iso-8601", "sessionsRevoked": <int> } }`.
- **Error statuses.** `401`, `403`, `404 access_not_found`, `409 access_not_active`, `429`.
- **Privacy.** New username is opaque, server-generated; never derived from parent identity.
- **Audit events.** `action = "username_rotated"`, `metadata = { student_id, access_id, sessions_revoked }`.

### `GET /api/teacher/audit` *(Phase 5, extended in Phase 8)*

- **Method.** `GET`. **Origin guard.** Required. **Rate-limit.** Per-teacher **30/min** (defense against log scraping).
- **Purpose.** Returns a paginated read-only view of the calling teacher's own `teacher_access_audit` rows. **Read-only, never accepts writes.**
- **Auth.** `auth: teacher`. **Audience.** teacher-only.
- **Query params.**
  - `studentId: uuid` (optional filter).
  - `classId: uuid` (optional filter).
  - `action: string` (optional filter; one of the canonical action codes).
  - `limit: int` (default 50, max 200).
  - `cursor: opaque-string` (server-generated, used for pagination).
  - Unknown → `400`.
- **Response (200).**

```json
{
  "data": {
    "rows": [
      {
        "id": "uuid",
        "createdAt": "iso-8601",
        "action": "string",
        "actorRole": "teacher | guardian | system",
        "studentId": "uuid|null",
        "classId": "uuid|null",
        "guardianAccessId": "uuid|null",
        "metadata": { "...": "...redacted via deny-list..." }
      }
    ],
    "nextCursor": "opaque|null"
  }
}
```

- **Error statuses.** `400`, `401`, `403 not_a_teacher`, `429`.
- **Ownership checks.** `teacher_id = teacherIdFromSession`. Cross-teacher rows are never returned.
- **Privacy constraints.** `metadata` is filtered through the audit deny-list at read-time as well as at write-time, so even if a forbidden key ever slipped past the writer, the API still strips it before responding. No parent email/name/IP. `ip_hash`, `user_agent`, and `delivery_channel` may appear if present.
- **Audit events written.** None (reading audit does not write audit).
- **What this endpoint is not.** It is **not** an admin / cross-teacher audit query. A future admin-only audit endpoint is out of scope for Phase 3.

---

## Guardian APIs

> **Audience tag** for every endpoint below: `guardian-only`. None of these accept a parent JWT, a teacher JWT, a student session cookie, or anonymous traffic except where explicitly stated for the login route. Implementation phase: **Phase 8**.
>
> **Hard separation from existing routes.** Every existing `/api/parent/*`, `/api/student/*`, `/api/teacher/*` route remains untouched. The guardian cookie name is `liosh_guardian_session` and is **distinct from** `liosh_student_session`. A handler that resolves student sessions never reads the guardian cookie, and vice versa.
>
> **No Hebrew UI copy / no visible UI text in this phase.** Guardian shell ships behind a feature flag that is **disabled by default** until master plan L11 (Hebrew copy approval).

### `POST /api/guardian/login` *(Phase 8)*

- **Method.** `POST`. Other methods → `405`.
- **Purpose.** Authenticates a guardian via `(login_username, pin_plaintext)` against `student_guardian_access`, and on success issues an HMAC cookie `liosh_guardian_session` backed by a fresh `student_guardian_sessions` row.
- **Audience.** guardian-only **plus** anonymous (the request itself is unauthenticated, but the route is the only ingress for guardian sessions).
- **Auth.** `auth: none (rate-limited)`.
- **Origin guard.** Required.
- **Rate-limit.** **In-memory** (owner decision 4 of Phase 2).
  - Per-IP **5 attempts / minute**, **20 / hour**, with progressive backoff on consecutive failures.
  - Per-`login_username_normalized` **5 attempts / minute**, **15 / hour**.
  - Excess → `429 rate_limited` with `Retry-After`.
- **Magic-link fast path.** If a query param `?invite=<opaque-token>` is present, the route validates the token against `teacher_access_invitations`, materializes a session against the linked `student_guardian_access`, and consumes the invitation (`consumed_at = now()`). Magic-link tokens are single-use and expire 7 days from issuance (parity with consent token lifetime). **Email transport is not built in Phase 8** — invitations exist as opaque URLs the teacher delivers out-of-band (owner decision 4).
- **Request body.**

```json
{ "loginUsername": "string", "pin": "1234" }
```

  Or, when the magic-link fast path is used, the body may be empty and the token is read from the query string only.

- **Response (200).** Sets `Set-Cookie: liosh_guardian_session=...; HttpOnly; Secure; SameSite=Lax; Path=/`. Cookie lifetime **24 hours** (owner decision 8). Body:

```json
{
  "data": {
    "studentId": "uuid",
    "studentFullNameMasked": "string",
    "expiresAt": "iso-8601",
    "flags": { "uiCopyEnabled": false }
  }
}
```

- **Error statuses.**
  - `400 validation_failed` — empty username or pin.
  - `401 invalid_credentials` — username unknown, PIN mismatch, access revoked, access expired. **Single error code** to avoid enumeration; the client cannot distinguish "wrong PIN" from "no such user".
  - `403 invitation_invalid` — magic-link path with bad/expired/consumed token.
  - `429 rate_limited`.
- **Cookie behavior.** No persistent / "remember me" cookie. Maximum cookie lifetime is bound by `student_guardian_access.expires_at`. If access expires before 24 hours, the session row's `expires_at` is the access expiry. Each successful login revokes any prior live session for the same `student_guardian_access` (one active session per access at a time).
- **Privacy constraints.** Response never returns `loginUsername`, never returns parent email/name (none stored), never returns the access UUID (use `/api/guardian/me` for that). Failed-login response body never includes the `studentId`.
- **Audit events written.**
  - On success: `action = "guardian_login_success"`, `actor_role = "guardian"`, `actor_id = guardian_access.id` (subject to the future Phase-2 `actor_id` existence-check trigger), `metadata = { student_id, ip_hash?, user_agent? }`.
  - On `invalid_credentials`: `action = "guardian_login_failed"`, `actor_role = "system"`, `actor_id = NULL` (the failing username may be unknown), `metadata = { ip_hash?, error_code: "invalid_credentials" }`.
  - On `invitation_invalid`: `action = "guardian_login_failed"`, `metadata = { ip_hash?, error_code: "invitation_invalid" }`.
  - On `rate_limited`: not audited (would amplify log volume under attack); rely on `lib/security/safe-log.js`.

### `POST /api/guardian/logout` *(Phase 8)*

- **Method.** `POST`. Other methods → `405`.
- **Purpose.** Revokes the current `student_guardian_sessions` row and clears the cookie.
- **Audience.** guardian-only.
- **Auth.** `auth: guardian`.
- **Origin guard.** Required.
- **Rate-limit.** Per-session **20/min**.
- **Request body.** None.
- **Response (200).** Sets `Set-Cookie: liosh_guardian_session=; Max-Age=0; ...`. Body:

```json
{ "data": { "loggedOut": true } }
```

- **Error statuses.** `401 not_authenticated` (no cookie or already revoked), `429`.
- **Privacy.** No PII. **Audit events.** None (logout is benign and frequent; not worth audit volume).

### `GET /api/guardian/me` *(Phase 8)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Returns the guardian's session-scoped identity — strictly the bound `studentId`, masked student name, access state, and expiry. Used by the guardian shell `/guardian/view` to render its single-student frame.
- **Audience.** guardian-only.
- **Auth.** `auth: guardian`.
- **Origin guard.** Required.
- **Rate-limit.** Per-session **60/min**.
- **Request body.** None. Query params: none.
- **Response (200).**

```json
{
  "data": {
    "studentId": "uuid",
    "studentFullNameMasked": "string",
    "accessState": "active",
    "accessCreatedAt": "iso-8601",
    "accessExpiresAt": "iso-8601|null",
    "sessionExpiresAt": "iso-8601",
    "flags": { "uiCopyEnabled": false }
  }
}
```

- **Error statuses.**
  - `401 not_authenticated` — no/invalid cookie.
  - `401 session_expired` — cookie present but `student_guardian_sessions.expires_at < now()`.
  - `401 session_revoked` — `student_guardian_sessions.revoked_at IS NOT NULL` (e.g. teacher revoked the parent access, which cascade-revoked sessions).
  - `429 rate_limited`.
- **Ownership checks.** `studentId` returned is **strictly** `student_guardian_access.student_id` for the access bound to the cookie. The route never accepts a `studentId` from query/body.
- **Privacy constraints.** No `loginUsername` (the guardian already typed it), no PIN/token bytes, no parent email/name, no other students.
- **Audit events.** None (read-only, frequent).

### `GET /api/guardian/student/[studentId]/report-data` *(Phase 8)*

- **Method.** `GET`. Other methods → `405`.
- **Purpose.** Returns the read-only report payload for the **single** student bound to the guardian session. Reuses the same diagnostic stack as the parent and teacher report routes, behind a separate auth gate. **No new RLS policy on `students`, `learning_sessions`, `answers`, `student_learning_state`.**
- **Audience.** guardian-only.
- **Auth.** `auth: guardian`.
- **Origin guard.** Required.
- **Rate-limit.** Per-session **60/min** (legitimate page reloads only; shell renders once on landing, then user idles).
- **Path param.** `studentId: uuid`.
- **Hard scope check.** `studentId === guardian_access.student_id` from the cookie. Mismatch → `403 student_scope_violation`. **Not** `404` — Phase 2 §F invariant: a guardian must always know that the system enforces the single-student boundary; existence-leakage is irrelevant because the guardian already knows their bound student exists.
- **Query params.**
  - `windowDays` — `int`, optional, parity with the teacher and parent report routes.
  - Unknown → `400 unknown_query_param`.
- **Response (200).** Same envelope as `/api/teacher/students/[studentId]/report-data`, with these differences honoring Phase 2 §F:
  - `report.parent` — **omitted entirely**. The guardian never sees parent identifying info, even at field level.
  - `report.copilotLastResponse` and any copilot fields — **omitted** (no Parent Copilot exposure to guardians).
  - `report.guardianAccessSummary` — **omitted** (a guardian has no business knowing how many other guardians the parent's child has).
  - `report.teacher` — **omitted** (a guardian does not see the teacher chain).
  - `report.gamification` and any coin/inventory fields — **omitted** in the guardian shape (guardians cannot mutate, but for clarity we don't expose either).
  - All learning-progress blocks (mastery, weakness map, recent activity, attention items, time-on-task) match the parent shape so the same renderer components can be reused.
- **Error statuses.**
  - `400 validation_failed` — bad UUID.
  - `400 unknown_query_param`.
  - `401 not_authenticated`, `401 session_expired`, `401 session_revoked`.
  - `403 student_scope_violation` — `studentId !== guardian_access.student_id`.
  - `429 rate_limited`.
- **Ownership checks.** Single-student scope is the entire ownership story. There is no class concept, no multi-student listing, no "list my children" surface.
- **Privacy constraints.** No parent email, no parent name, no other student data, no copilot output, no teacher identity. Owner decision 5 enforced strictly.
- **Audit events written.** `action = "viewed_report"`, `actor_role = "guardian"`, `actor_id = guardian_access.id`, `metadata = { student_id, source: "guardian_view" }`. Day-bucketed: at most one row per `(guardian_access_id, calendar_day)` to keep audit volume bounded for normal usage.
- **What this endpoint cannot do.** It cannot mutate state, cannot create access codes, cannot edit student profile, cannot reach Parent Copilot, cannot read any other student, cannot list classes, cannot reach any `/api/parent/*` or `/api/teacher/*` route. The guardian session never satisfies those routes' auth checks.

---

## Future-only / out-of-scope endpoints (named for clarity, not implemented)

- `POST /api/parent/teacher-consent/issue` — parent-side issuer for the teacher↔student link consent token. Separate phase, separate owner approval. **Phase 5 link route is feature-flag-gated until this exists.**
- `POST /api/parent/teacher-consent/revoke` — parent revokes a previously issued consent token before it is consumed. Future-only.
- `GET /api/parent/teacher-links` — parent dashboard view of teachers currently linked to each child. Future-only; no parent-side surface modified in Phases 0–9.
- `POST /api/admin/teacher/admin-link` — admin / school-roster bypass for linking. **Future-only**, subject to owner decision 2; **must not** reuse `ENGINE_REVIEW_ADMIN_TOKEN`.
- `POST /api/teacher/classes/import-csv` — class-roster CSV import. Future-only, owner decision 6. Must not imply teacher-side student creation.
- `POST /api/guardian/login (with email magic-link via SMTP)` — actual email transport for magic-link delivery. Future-only, owner decision 4.
- `POST /api/teacher/copilot-turn` — teacher-side copilot. Deferred (master plan §H, Phase 12+).

Each of the above is named here so future-phase plans can reference them by stable path. **None is created in Phase 4–9.**

## Helpers that Phase 4 will introduce (named for design only)

These helpers are **not** created in Phase 3. They are documented as the implementation surface that Phase 4 will materialize, paralleling existing parent/student helpers without modifying any of them.

- `lib/teacher-server/teacher-session.server.js`
  - `resolveAuthenticatedTeacherUserId(req): { teacherId } | { error }` — parallels [`resolveAuthenticatedParentUserId`](../../lib/parent-server/policy-acceptance.server.js).
  - `resolveAuthenticatedTeacherProfile(req): { teacherId, profile, limits } | { error }`.
  - Verifies Supabase JWT, joins `teacher_profiles`, refuses non-teacher roles.
- `lib/teacher-server/teacher-student-link.server.js`
  - `assertTeacherOwnsStudent(teacherId, studentId): boolean` — joins `teacher_students` (active) and `teacher_class_students` × `teacher_classes` (owned).
  - `resolveTeacherStudentLimit(teacherId): { planCode, studentLimit, classLimit }` — precedence override → plan → default 20 (mirrors `resolveParentStudentLimit`).
- `lib/teacher-server/teacher-audit.server.js`
  - `writeAuditRow({ teacherId, action, actor_id, actor_role, metadata })` — applies the metadata deny-list before insert (Phase 2 §9).
- `lib/teacher-server/consent-token.server.js`
  - `verifyConsentToken({ token, teacherId, studentId, purpose }): { ok: true } | { ok: false, code: "consent_invalid" }` — depends on the future `teacher_student_consent_tokens` table; **gated until that schema phase ships**.
- `lib/guardian-server/guardian-session.server.js`
  - `resolveAuthenticatedGuardianAccessId(req): { guardianAccessId, studentId, sessionExpiresAt } | { error }` — parallels [`lib/learning-supabase/student-auth.js`](../../lib/learning-supabase/student-auth.js); reads `liosh_guardian_session`, joins `student_guardian_sessions` and `student_guardian_access`, rejects expired/revoked.
  - `issueGuardianSessionCookie({ guardianAccessId, expiresAt }): { setCookie, sessionRow }`.
  - `revokeGuardianSession({ sessionId })`.
- `lib/guardian-server/guardian-rate-limit.server.js`
  - In-memory bucket implementation parallel to `lib/security/login-rate-limit.js`.

**No file in `lib/parent-server/`, `lib/learning-supabase/student-auth.js`, `utils/parent-copilot/`, or `utils/parent-report-language/` is modified in any phase.**

## What must remain unchanged (regression baselines)

The Phase 3 contracts are designed so that nothing in the parent / student / copilot / arcade / learning surfaces is altered. The Phase 9 regression sweep verifies these stay intact.

- `pages/parent/login.js` — UI, layout, route, behavior. **No mode toggle, no banner, no link** to guardian login. A future Phase 10 may merge guardian sign-in into `/parent/login`; Phase 3 explicitly forbids it.
- All routes under `pages/api/parent/*` — input contract, output shape, auth gate, response codes — unchanged.
- All routes under `pages/api/student/*` — unchanged.
- All routes under `pages/api/learning/*`, `pages/api/arcade/*`, `pages/api/admin/*`, `pages/api/learning-simulator/*` — unchanged.
- `lib/parent-server/*`, `lib/learning-supabase/student-auth.js`, `utils/parent-copilot/*`, `utils/parent-report-language/*` — untouched.
- All RLS policies on `parent_profiles`, `students`, `student_access_codes`, `student_sessions`, `learning_sessions`, `answers`, `parent_reports`, `student_coin_balances`, `coin_transactions`, `student_inventory`, `student_learning_state`, `parent_policy_acceptances`, `coin_*`, `shop_items`, `arcade_*` — **zero modifications**.
- All Hebrew copy under `data/legal/sitePolicies.he.js` and any `.he.js` content file — untouched.

## Privacy posture summary (owner decision 5 reaffirmed)

Across **every** teacher and guardian endpoint above, the response surface **never** contains:

- parent email, parent display name, parent obfuscated email, parent UUID;
- student full name (only masked variants per Phase 6);
- raw PINs, raw tokens, raw magic-link strings, raw IP addresses;
- copilot output of any kind;
- any other student's data outside the linked / single-student scope.

`ip_hash` and `user_agent` may appear in audit responses if Phase 2 §10 chose to retain them; both are subject to deny-list filtering at the audit-read layer.

## Open questions remaining before Phase 4

These do not block Phase 3 approval, but Phase 4 (Teacher login/session implementation) requires explicit answers in writing before any code is written.

1. **Teacher-role tagging mechanism.** How is a Supabase Auth user marked as a teacher candidate before `/api/teacher/onboard` can run? Three options: (a) `auth.users.app_metadata.role = "teacher"` set by signup flow; (b) a server-side post-signup webhook that flips the flag based on a signup-form choice; (c) an admin-issued invitation code that the user presents during signup. **Phase 4 picks one.**
2. **Teacher signup UX shell.** Whether `/teacher/login` shows signup + login or only login (with admin-issued invitation for signup). Phase 4 needs this before drafting the page. **No Hebrew copy in either case until L11.**
3. **Origin allowlist.** The `Origin` guard helper currently lives at `lib/security/origin-guard.js` (parent / arcade pattern). Phase 4 confirms whether `/api/teacher/*` and `/api/guardian/*` add new entries or reuse the existing list as-is.
4. **Server cold-start expectation for in-memory rate limits.** The teacher portal will spread load across more endpoints than the parent surface. Phase 4 confirms acceptable burst tolerance per route given Vercel's serverless model.
5. **`shownOnceWarning` text language.** The plaintext warning string in `/api/teacher/student-access/create` is English developer text in this contract. The teacher dashboard may render Hebrew copy for the user-facing warning, but only after L11. Phase 8 implementation must keep the API string English-only and let the page layer translate.
6. **`studentFullNameMasked` exact rule.** First name + last initial? Phase 6 picks. The contract above does not assume.
7. **Concurrent-link race policy.** Two teachers attempting to consume the same parent-issued consent token at the same instant: the database must guarantee single-use. Phase 4 confirms the SQL pattern (e.g. `UPDATE ... WHERE consumed_at IS NULL RETURNING ...`) before the consent-token verification helper ships.
8. **`teacher_access_audit.actor_id` AFTER-INSERT trigger** (owner decision 7). Phase 4 picks: ship the trigger in the future converted migration, or rely solely on helper-side validation. Either choice must be reflected in the schema phase that converts `019_teacher_portal_foundation.md` into a real `.sql` migration.

## No-execution confirmation

- This document is **markdown only** and lives at `docs/teacher-portal/API_CONTRACTS.md`.
- No file under `pages/api/`, `pages/teacher/`, `pages/guardian/`, `lib/teacher-server/`, `lib/guardian-server/` was created or modified.
- No SQL was run against any environment.
- No DB object was created, altered, or dropped.
- No RLS policy was created, altered, or dropped.
- No file under `supabase/migrations/` was created or modified. The filename `019_teacher_portal_foundation.sql` remains reserved per Phase 2 operational notes.
- No existing parent / student / copilot / report / auth / arcade / learning route or helper was modified.
- No Hebrew text, RTL layout, design, copy, label, or visible UI string was created or modified.
- `/parent/login` is unchanged; no banner, no toggle, no link added.
- No `git commit` and no `git push` were performed. The owner commits manually.
- Phase 4 (Teacher login/session implementation) is **not** approved by Phase 3 approval. It requires a separate, explicit owner approval before any further work begins.

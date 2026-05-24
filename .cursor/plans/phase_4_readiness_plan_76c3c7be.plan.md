---
name: Phase 4 Readiness Plan
overview: A no-code readiness analysis for Phase 4 (Teacher login + session + onboarding), answering all 10 owner questions and identifying the exact gates, files, flags, and blockers before any implementation begins.
todos:
  - id: phase35-schema-gate
    content: "Phase 3.5 gate: owner approves converting the SQL proposal into supabase/migrations/019_teacher_portal_foundation.sql + RLS + teacher_plans seed. DB-only, no product code."
    status: pending
  - id: phase4-impl
    content: "Phase 4 implementation (after separate owner approval): create pages/teacher/login.js, pages/teacher/dashboard.js, pages/api/teacher/onboard.js, pages/api/teacher/me.js, lib/teacher-server/teacher-session.server.js, lib/teacher-server/teacher-audit.server.js — all behind TEACHER_PORTAL_ENABLED=false."
    status: pending
isProject: false
---

# Phase 4 Implementation Readiness Plan

> **No code, no DB, no SQL, no migration, no route, no API, no Hebrew/UI, no commit, no push.**
> This plan answers the 10 owner questions. Implementation starts only on a separate, named Phase 4 approval after this plan is reviewed.

## Current state (what exists today)

- `teacher_profiles`, `teacher_limits`, `teacher_plans` tables: **proposal-only** — in [`docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md`](docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md). No migration has been run.
- RLS policies for teacher tables: **proposal-only** — in [`docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`](docs/teacher-portal/RLS_SECURITY_PROPOSAL.md). None applied.
- API contracts: **proposal-only** — in [`docs/teacher-portal/API_CONTRACTS.md`](docs/teacher-portal/API_CONTRACTS.md). No routes exist.
- Supabase infrastructure reused: `getLearningSupabaseBrowserClient()` ([`lib/learning-supabase/client.js`](lib/learning-supabase/client.js)), `getLearningSupabaseServiceRoleClient()` + `getLearningSupabaseServerUserClient()` ([`lib/learning-supabase/server.js`](lib/learning-supabase/server.js)).
- Security infrastructure reused: [`lib/security/same-origin.js`](lib/security/same-origin.js) (`rejectIfCrossOriginCookieMutation`), [`lib/security/login-rate-limit.js`](lib/security/login-rate-limit.js) (in-memory IP + credential buckets).

---

## Q1 — What Phase 4 can safely implement now

Phase 4 can be coded and kept fully non-functional (feature-flag-off) **without waiting for migration or RLS**:

- `pages/teacher/login.js` — login-only page, flag-gated so it renders a `404`-equivalent in production until the flag is enabled. No signup form. The page calls `supabase.auth.signInWithPassword` (same browser client already used by parents) and redirects to `/teacher/dashboard` on success.
- `pages/teacher/dashboard.js` — bare shell page with a role guard that redirects to `/teacher/login` if no teacher session exists. Renders no visible content (flag-off → `null` render / redirect to home).
- `pages/api/teacher/onboard.js` — POST route that provisions `teacher_profiles` + `teacher_limits`. **Cannot succeed until the migration is applied**, but the file can be coded with an explicit DB-table-missing safety path (see Q8).
- `pages/api/teacher/me.js` — GET route that resolves teacher session and reads `teacher_profiles`. Same DB-missing safety path.
- `lib/teacher-server/teacher-session.server.js` — `resolveAuthenticatedTeacherUserId(authHeader)` helper (parallels [`lib/parent-server/policy-acceptance.server.js`](lib/parent-server/policy-acceptance.server.js) `resolveAuthenticatedParentUserId`).
- `lib/security/in-memory-rate-limit.js` already exists. Phase 4 adds a **dedicated teacher-onboard rate-limit bucket** inside `api/teacher/onboard.js` (1/min, 5/hour per IP) reusing the same in-memory pattern.

---

## Q2 — What Phase 4 cannot implement until migration + RLS are applied

These pieces require `teacher_profiles`, `teacher_limits`, and `teacher_plans` to exist and RLS to be live:

- The success path of `POST /api/teacher/onboard` (insert into `teacher_profiles`, insert into `teacher_limits`).
- The success path of `GET /api/teacher/me` (select from `teacher_profiles`, join `teacher_limits`).
- **Live invite-code verification** for the teacher-signup path (requires the invite table, which is not yet in the Phase 1 proposal and would need a separate schema patch — see Q3).
- Any student-facing routes (Phase 5+) — all blocked on migration + teacher-student link consent schema.

---

## Q3 — Phase 3.5 / converted migration gate

**Yes, a Phase 3.5 gate is required before Phase 4 code ships to any non-local environment.**

The gate is named **"Phase 3.5 — Schema + RLS conversion"** and produces:

- `supabase/migrations/019_teacher_portal_foundation.sql` — the actual migration file (converted from the proposal in `docs/teacher-portal/sql-proposals/019_teacher_portal_foundation.md`).
- `supabase/migrations/019_teacher_portal_foundation_rls.sql` (or combined) — the RLS policies from `docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`.
- A seed snippet for `teacher_plans` (`teacher_basic_20`, `teacher_pro_50`, `teacher_school_unlimited`).
- **Owner must approve Phase 3.5 in writing** before the migration runs on staging, and again before it runs on production. This is a separate gate from Phase 4.

**Practical path:** Phase 4 code can be written and tested locally with a manually-applied schema (developer applies the proposal SQL to a local Supabase instance). The code ships to production only after Phase 3.5 is formally approved and the migration is run on the production DB.

---

## Q4 — Exact files Phase 4 would create or modify

### New files (created by Phase 4 — none exist today)

- `pages/teacher/login.js` — teacher login page (login-only mode; invite-gated signup stub).
- `pages/teacher/dashboard.js` — minimal shell with role guard.
- `pages/api/teacher/onboard.js` — POST; provisions `teacher_profiles` + `teacher_limits`.
- `pages/api/teacher/me.js` — GET; returns profile, limits, counters, flags.
- `lib/teacher-server/teacher-session.server.js` — `resolveAuthenticatedTeacherUserId`, `resolveAuthenticatedTeacherProfile`.
- `lib/teacher-server/teacher-audit.server.js` — `writeAuditRow` with metadata deny-list enforcement.

### Existing files **not modified** in Phase 4

- `pages/parent/login.js` — untouched.
- `lib/learning-supabase/client.js`, `lib/learning-supabase/server.js` — reused as-is, no changes.
- `lib/security/same-origin.js`, `lib/security/login-rate-limit.js` — reused as-is, no changes.
- `lib/parent-server/*`, `pages/api/parent/*`, `pages/api/student/*`, `utils/parent-copilot/*` — all untouched.
- Any existing Supabase migration file.

### Possible minor extension (not a modification of existing logic)

- `lib/security/api-guards.js` may receive a new exported helper `assertTeacherSession` mirroring any parent-session guard already there — only if the file already has a general pattern. If not, the guard lives inside `lib/teacher-server/teacher-session.server.js` only.

---

## Q5 — Feature flags needed

All flags are **server-side environment variables** (not `NEXT_PUBLIC_*`) to avoid leaking enablement state — consistent with the Phase 2 risk register entry R-AUTH-02.

| Flag | Default | Purpose |
|---|---|---|
| `TEACHER_PORTAL_ENABLED` | `false` | Master on/off. All `/teacher/*` pages + `/api/teacher/*` routes check this first. If `false`, pages redirect to `/` and API routes return `503 {"error":{"code":"feature_disabled"}}`. |
| `TEACHER_PORTAL_INVITE_ONLY` | `true` | When `true`, no `/teacher/login` signup form is shown at all (login-only mode). When `false` in a future phase, opens the signup path. Overridden by `TEACHER_PORTAL_ENABLED=false`. |
| `TEACHER_PORTAL_UI_COPY_ENABLED` | `false` | Guards all visible UI strings. If `false`, teacher pages render no visible text labels — pure redirect shells. Stays `false` until master plan L11 (Hebrew copy approval). |

These flags are read server-side in `getServerSideProps` (for pages) and in each API handler before any logic runs. **No `NEXT_PUBLIC_` prefix** on any of them.

---

## Q6 — Auth approach for teacher-role tagging (owner preference: invite-only)

**Recommended: admin-issued invite code verified at login, no open public signup.**

### Mechanism

1. An admin (owner) creates a Supabase Auth user manually in the Supabase dashboard, sets `app_metadata: { role: "teacher", invite_consumed: true }` on that user before handing off credentials (email + temporary password).
2. The teacher visits `/teacher/login`, enters email + password. The page calls `supabase.auth.signInWithPassword` (same browser client as parents — no new auth infrastructure).
3. On success, the client-side guard calls `GET /api/teacher/me`. The server reads `auth.users.app_metadata.role` (via `supabase.auth.getUser()` using the user's JWT). If `role !== "teacher"`, returns `403 not_a_teacher` and the client redirects to `/`.
4. If the user has no `teacher_profiles` row yet (first login after admin setup), `GET /api/teacher/me` returns `404 teacher_profile_missing` and the client automatically calls `POST /api/teacher/onboard` once to provision the row.

### Why this approach

- Reuses the existing Supabase Auth infrastructure — no new auth tables, no invite-code table needed in Phase 4.
- Zero changes to the parent signup / parent login path.
- The "invite" is the admin manually pre-creating the `auth.users` row. This matches the owner preference: no open self-signup.
- `app_metadata` is set server-side by the Supabase admin UI or by a future admin CLI script; it is not writable by the user's own JWT.
- If the admin later approves an invite-code system (e.g. a one-time token that lets a teacher create their own `auth.users` row without admin UI intervention), that is a separate owner-approved future path. Phase 4 does not build it.

### What this means for `/teacher/login` UX

- The page shows **only a login form** (email + password). No "create account" button, no signup tab, no self-registration.
- If login succeeds but role is wrong → silent redirect to `/` (no error message that leaks "this is a teacher portal").
- `TEACHER_PORTAL_INVITE_ONLY=true` enforces this at the page level too — the signup mode is compile-excluded in Phase 4.

---

## Q7 — Proposed `/teacher/login` behavior

| Aspect | Decision |
|---|---|
| Modes | **Login only.** No signup tab, no "create account" button. |
| Role check | After `signInWithPassword` succeeds, immediately call `GET /api/teacher/me`; if `403 not_a_teacher` → sign out and silently redirect to `/`. |
| Onboarding auto-trigger | If `GET /api/teacher/me` returns `404 teacher_profile_missing` → automatically POST `/api/teacher/onboard` with no `displayName` (null is valid); then redirect to `/teacher/dashboard`. |
| Feature-flag guard | If `TEACHER_PORTAL_ENABLED=false` → `getServerSideProps` returns `{ redirect: { destination: '/', permanent: false } }`. The page is never rendered. |
| UI copy | All text strings are behind `TEACHER_PORTAL_UI_COPY_ENABLED`. When `false`, the page may still render the form (so the admin can test locally) but a `data-testid` attribute on the wrapper confirms the flag state. **No English visible text in production** while the flag is off. |
| `/parent/login` | Not touched. Not linked. No mention of teachers. |

---

## Q8 — How `/api/teacher/onboard` behaves if `teacher_profiles` does not exist

The route must **fail gracefully and explicitly** rather than expose a Postgres error string:

1. The service-role insert is wrapped in a try/catch.
2. If the Supabase error code is `42P01` ("undefined_table") or `PGRST106` ("The schema must be one of the following"), the route returns:
   - `503` with `{ "error": { "code": "db_schema_not_ready", "message": "teacher_portal schema not yet applied" } }`.
3. The client (dashboard auto-onboard flow) treats `503 db_schema_not_ready` as "not yet configured, please wait" and does **not** retry automatically — it redirects the teacher to a flag-off holding page.
4. This path is **production-safe**: a teacher who somehow logs in before Phase 3.5 (migration) is applied will see the feature-disabled experience, not an unhandled 500.

The same guard applies to `GET /api/teacher/me`: if `teacher_profiles` select returns a `42P01`-equivalent, the route returns `503 db_schema_not_ready`.

---

## Q9 — Tests / smoke checks after Phase 4 implementation

These run locally (no live DB required for most; the DB-path tests require Phase 3.5 migration to be applied first on a local Supabase instance):

### Flag-off guards (no DB needed)

- `TEACHER_PORTAL_ENABLED=false` → `GET /teacher/login` returns redirect to `/`. Must return HTTP 307/302, not 200.
- `TEACHER_PORTAL_ENABLED=false` → `POST /api/teacher/onboard` returns `503 feature_disabled`.
- `TEACHER_PORTAL_ENABLED=false` → `GET /api/teacher/me` returns `503 feature_disabled`.

### Role isolation (live Supabase + migration applied)

- A valid parent bearer token → `GET /api/teacher/me` returns `403 not_a_teacher`.
- A valid student session cookie → `GET /api/teacher/me` returns `401 not_authenticated`.
- Anonymous (no header) → `GET /api/teacher/me` returns `401 not_authenticated`.
- A teacher JWT (role = "teacher") with no `teacher_profiles` row → `404 teacher_profile_missing`.
- A teacher JWT (role = "teacher") after `POST /api/teacher/onboard` → `200` with correct shape.

### Onboarding idempotency

- `POST /api/teacher/onboard` called twice by the same teacher → second call returns `200` (not `201`, not `409`).

### DB-missing safety

- `POST /api/teacher/onboard` before migration → `503 db_schema_not_ready` (testable locally by pointing at a Supabase instance without the migration).

### Parent / student regression baseline

- `GET /parent/login` still renders unchanged (no DOM changes, no new attributes, no new links).
- `POST /api/parent/create-student` still works (no disruption from new routes).
- `POST /api/student/login` still works.

These map directly to the Phase 9 regression matrix rows `PARENT-REG-1`, `STUDENT-REG-1`, and `PARENT-LOGIN-1` from [`docs/security/AUTHORIZATION_AUDIT_PLAN.md`](docs/security/AUTHORIZATION_AUDIT_PLAN.md).

---

## Q10 — Blockers before Phase 4 can be implemented

### Hard blockers (Phase 4 code cannot ship to production without these)

1. **Phase 3.5 — Schema + RLS conversion must be approved by the owner in writing** before the migration runs on staging or production. Phase 4 code can be *written* locally before 3.5 is approved but cannot go live.
2. **Owner answers the Phase 3 open question #1** (teacher-role tagging mechanism) — answered by this plan: admin pre-creates the `auth.users` row with `app_metadata.role = "teacher"`. Phase 4 uses this approach; no additional decision needed unless the owner wants something else.

### Soft pre-conditions (should be decided before implementation starts, but do not block writing the code)

3. **`displayName` requirement at onboarding.** The current contract requires `displayName` in the body. If the admin-invite flow provides no display name, the route must accept `null`. This plan recommends `null` as the default; owner confirms or overrides.
4. **Exact local Supabase setup for Phase 4 testing.** The developer (owner) needs to manually apply the Phase 1 SQL proposal to their local Supabase instance before the success paths are testable. This is a developer-environment task, not a code blocker.
5. **`TEACHER_PORTAL_ENABLED` environment variable.** Needs to be added to `.env.local` (never committed) with value `false`. It must not appear in `.env.example` with a real value (R-ENV-02 posture).

### Not blockers

- The parent-side consent-token issuer — Phase 4 never calls it. Phase 4 is strictly login + session + profile provisioning. The link route (`/api/teacher/students/link`) is Phase 5 and is feature-flag-gated (`TEACHER_PORTAL_LINK_ENABLED=false`) until the consent issuer ships.
- Hebrew copy approval — Phase 4 ships with `TEACHER_PORTAL_UI_COPY_ENABLED=false`; no Hebrew strings are needed.

---

## Phase 3.5 gate recommendation

Before Phase 4 implementation work begins, the following should be approved in writing:

- [ ] **Phase 3.5 approved by owner:** convert `019_teacher_portal_foundation.md` SQL proposal into real migration file `supabase/migrations/019_teacher_portal_foundation.sql`, apply RLS from `RLS_SECURITY_PROPOSAL.md`, seed `teacher_plans`. No product code changed in Phase 3.5. This is DB-only.
- [ ] **Phase 4 approved by owner:** implement the 6 files listed in Q4, with all 3 feature flags defaulting to `false`.

Both approvals can be issued at the same time or sequentially; Phase 4 code can be written in parallel with Phase 3.5 review but cannot be enabled until Phase 3.5 is run.

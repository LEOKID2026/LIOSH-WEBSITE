# Role / Persona / Entitlement / Subscription-Ready Access Foundation Plan

> **SUPERSEDED — NOT THE AUTHORITATIVE IMPLEMENTATION PLAN**
>
> This file is a reference copy only. It is no longer the authoritative plan.
>
> The authoritative implementation plan — the one the owner approves in Cursor before pressing the build/implementation button — is:
>
> **`.cursor/plans/role_boundary_fix_plan_631834d8.plan.md`**
>
> If any conflict exists between this file and the `.cursor/plans` file, the `.cursor/plans` file wins.
> This file is kept as a reference only and must not be acted on directly.

**Status:** SUPERSEDED — reference copy only
**Created:** 2026-05-29
**Last updated:** 2026-05-30 (superseded by .cursor/plans file)
**Authors:** Cursor AI (audit and planning only)

---

## EXECUTION RULES — READ BEFORE ANYTHING ELSE

1. **No code is changed until the owner explicitly approves the plan and authorizes implementation.**
2. **SQL is prepared as migration files only. The owner runs SQL manually. Cursor must not execute SQL against Supabase.**
3. **Hebrew copy must not be changed. Any Hebrew text needed for new UI states must be listed as a placeholder and approved by the owner first.**
4. **No commit, push, or deploy unless explicitly instructed.**
5. **When implementation is complete and approved, Cursor must prepare a ZIP of all changed/added files (see Section 12).**
6. **This document is the authoritative specification. All implementation must match it exactly. Ambiguities must be resolved by the owner before implementation begins.**
7. **Existing login page visual design must be preserved. No broad redesign of parent or teacher login pages. Changes are additive and minimal only.**
8. **OAuth/social login buttons, teacher registration tab, and any new login UI element must not be added unless the owner explicitly approves each addition separately.**

---

## Background — Why This Is Not an Emergency / Hotfix

The previous fix plan used language like "Emergency server gates" and "lowest risk fastest." That framing was incorrect for this project.

This site is **in active development with no real users yet.** There is no production emergency to patch. There is instead an opportunity to build the access control foundation correctly from the start, without technical debt.

The correct frame is:

> We are implementing the **permanent, production-grade access control architecture** that the product requires for launch and beyond — including multi-persona identity, explicit entitlements, subscription-ready plan limits, and admin-controlled approval workflows.

All phases in this plan are designed for correctness, clarity, and forward compatibility — not for speed.

---

## 1. Root Causes (from Audit)

| ID | Root Cause | Location |
|----|-----------|----------|
| RC-1 | Universal parent trigger creates `parent_profiles` for every auth user including teachers, admins, and school staff — profile existence is not permission | `supabase/migrations/001_learning_core_foundation.sql` |
| RC-2 | All `/api/parent/**` routes call only `supabase.auth.getUser()` and treat any authenticated `user.id` as an authorized parent | `pages/api/parent/*.js` |
| RC-3 | No explicit parent entitlement, plan, account-status, or approval field exists in any table | Schema gap |
| RC-4 | `POST /api/teacher/students/create` and `link` use only `requireTeacherApiContext` which does not check school membership — school teachers can create private students | `pages/api/teacher/students/create.js`, `link.js` |
| RC-5 | `pages/api/teacher/worksheet-activities/index.js` calls `assertSchoolTeacherSubjectAllowed` which allows non-school teachers without checking `private_teacher_subjects` — inconsistent with other activity routes | `pages/api/teacher/worksheet-activities/index.js` |
| RC-6 | `pages/parent/login.js` redirects any valid Supabase session to `/parent/dashboard` without checking persona — teacher and admin credentials pass through | `pages/parent/login.js` |
| RC-7 | No persona entitlement system exists — the only runtime differentiation is `app_metadata.role` (teacher/admin) and the presence of profile rows, which are not the same as approved active entitlements | Architectural gap |
| RC-8 | No parent plan or account-status model exists — no basis for future subscription gates, feature limits, or account suspension | Architectural gap |

---

## 2. Product Rules — Non-Negotiable

These rules define the permanent product behavior. All implementation must conform to them.

### A — Parent is not equal to any authenticated Supabase user

A user may access the parent dashboard, add children, use parent reports, or use Parent Copilot **only if** they have an explicit **active parent entitlement** in the entitlement system.

A Supabase session alone is not sufficient.

### B — Teacher is not parent by default

A private teacher, school teacher, school manager, or platform admin must not automatically receive parent capabilities just because they can authenticate. This is true regardless of whether a `parent_profiles` row exists for them.

### C — Parent signup may be auto-approved now, but architecture must support future approval modes

The system must support these parent signup modes (configurable, not hardcoded):

- `auto_active` — signup immediately grants active parent entitlement (current development default)
- `email_verified_only` — active entitlement granted only after email verification
- `pending_admin_approval` — signup creates pending entitlement; admin approves
- `payment_required` — entitlement activated only after subscription payment
- `suspended` — account temporarily deactivated by admin
- `cancelled` — account permanently deactivated

The architecture must not assume `auto_active` is permanent. The entitlement record must store the approval source.

### D — School teacher is not private teacher by default

A school teacher account must not be allowed to create or manage private students, private classes, or private student links unless a future explicit dual-role design is approved by the platform owner and implemented deliberately.

### E — School email stays school-scoped by default

A school teacher using a school-assigned account should not accumulate private students. The platform should not facilitate mixing school-context and personal-context under one account without explicit design approval.

### F — Private and school teacher permissions must be separated server-side

UI hiding is not security. All sensitive APIs must enforce persona/entitlement rules on the server. A user who navigates to an endpoint directly via API call must be blocked with the same rules as a user navigating via the UI.

### G — Admin and school manager are separate scopes

A school manager may manage teachers, subjects, students, and credentials **within their school only.**

A platform admin manages global platform permissions, plans, schools, role approvals, and has access to all data across all schools.

A school manager must not access admin APIs or global data. A platform admin is not automatically a school manager.

### H — Future subscriptions must be supported by the account model now

The parent account model must support plan-based limits from the start, even if payment is not yet integrated. Fields must exist so that plan-based access checks can be added without schema migration later.

Parent plans must eventually support:

- `max_children`
- `reports_enabled`
- `copilot_enabled`
- `advanced_diagnostics_enabled`
- `export_enabled`
- `monthly_ai_limit`
- `monthly_report_limit`
- Plan codes: `free`, `trial`, `basic`, `family`, `premium`, `school_linked`
- Subscription status: `active`, `trial`, `past_due`, `cancelled`
- Optional billing provider fields (nullable): `billing_provider`, `provider_customer_id`, `provider_subscription_id`
- Trial and period dates: `trial_ends_at`, `current_period_ends_at`

### I — SQL is prepared only; owner runs manually

Cursor prepares SQL migration files. The owner reviews and runs them manually. Cursor must not execute any SQL against Supabase at any time.

### J — Hebrew copy requires owner approval

If any feature needs new Hebrew user-facing text, the plan must list the placeholder in English. Exact Hebrew copy must be approved by the owner before implementation.

### K — Commit, push, and deploy are manual only

Cursor must not commit, push, or deploy unless the owner explicitly instructs it with specific scope.

### L — ZIP deliverable at implementation completion

When implementation is approved and completed, Cursor must prepare a ZIP containing all changed or added files (see Section 12 for exact requirements).

### M — Existing login page design must be preserved

The current parent login page has login/register tabs, manual email/password/code fields, and an existing dark visual style. The current teacher login page has a login form with a similar dark visual style.

Implementation must not redesign these pages. All changes to login pages must be:

- Additive only (adding missing functionality, not replacing existing structure)
- Minimal in layout impact
- Scoped to the specific task (e.g. adding a cross-persona redirect, not reworking the entire form)
- Not changing Hebrew copy without owner approval

Specifically prohibited without owner approval:

- Restructuring the form layout
- Changing the page color scheme or visual design language
- Replacing existing form fields with a different component pattern
- Adding OAuth buttons (see Rule N and Section 8a)
- Adding a teacher registration tab (see Rule N and Section 6)

### N — Parent signup and teacher signup are distinct processes with different default behaviors

These are not the same and must not be treated as such.

**Parent signup:**
- May use `auto_active` mode in development
- Creates a parent entitlement immediately (if mode is `auto_active`)
- May later switch to `payment_required` or `pending_admin_approval`
- The parent does the signup themselves via the parent portal

**Teacher signup/request:**
- Must always start as `pending` by default — never `auto_active`
- Teacher self-registration creates a request, not an active account
- Admin must review and explicitly approve before a teacher entitlement becomes `active`
- Admin also grants: subject permissions, teacher limits, and role (private vs school)
- Teacher must not receive any active teacher entitlement from self-registration alone

**School teacher / school manager:**
- Must never be self-activated
- Must be created or approved through an admin or school admin process only
- School manager is assigned to a school by the platform admin; they cannot self-assign

---

## 3. Target Architecture

### 3.1 Overview

```
auth.users (Supabase)
    |
    +---> account_persona_entitlements   <- AUTHORIZATION SOURCE OF TRUTH
    |         user_id + persona + status
    |
    +---> parent_profiles               <- profile/data only (not permission)
    |         + parent_account_settings <- plan, limits, subscription status
    |
    +---> teacher_profiles              <- teacher identity (existing)
    |         + teacher_limits          <- quotas/features (existing)
    |
    +---> school_teacher_memberships    <- school assignment (existing)
    |
    +---> private_teacher_subjects      <- private subject grants (existing)
    +---> school_teacher_subjects       <- school subject grants (existing)
```

The central principle: **`account_persona_entitlements` is the authorization source of truth. Profile tables are data. Existing tables are not replaced.**

### 3.2 New Table — `account_persona_entitlements`

**Purpose:** Single authoritative record of which personas each auth user has been explicitly granted, along with their current status and approval provenance.

```sql
-- PLAN ONLY — SQL prepared but not executed
-- Migration: 040_account_persona_entitlements.sql

create table if not exists public.account_persona_entitlements (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  persona           text        not null check (persona in (
                                  'parent',
                                  'private_teacher',
                                  'school_teacher',
                                  'school_manager',
                                  'admin'
                                )),
  status            text        not null default 'pending' check (status in (
                                  'pending',
                                  'active',
                                  'suspended',
                                  'rejected',
                                  'revoked'
                                )),
  approval_source   text        not null check (approval_source in (
                                  'self_signup',
                                  'admin',
                                  'school_admin',
                                  'payment',
                                  'migration',
                                  'seed'
                                )),
  approved_by       uuid        null references auth.users(id) on delete set null,
  approved_at       timestamptz null,
  rejected_by       uuid        null references auth.users(id) on delete set null,
  rejected_at       timestamptz null,
  suspended_by      uuid        null references auth.users(id) on delete set null,
  suspended_at      timestamptz null,
  revoked_by        uuid        null references auth.users(id) on delete set null,
  revoked_at        timestamptz null,
  reason            text        null check (reason is null or char_length(reason) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, persona)
);

create index if not exists ape_user_id_idx on public.account_persona_entitlements (user_id);
create index if not exists ape_persona_status_idx on public.account_persona_entitlements (persona, status);

alter table public.account_persona_entitlements enable row level security;
-- RLS: service-role only for writes; authenticated user may read own rows
```

**Constraints:**

- A user may have at most one entitlement record per persona (unique on `user_id + persona`).
- Only `status = 'active'` grants API access for that persona.
- `rejected`, `revoked`, and `suspended` statuses all deny access.
- `pending` denies access until explicitly approved.

### 3.3 New Table — `parent_account_settings`

**Purpose:** Parent-facing plan, subscription, and feature-limit settings. Subscription-ready from the start; no payment integration required now.

```sql
-- PLAN ONLY — SQL prepared but not executed
-- Migration: 041_parent_account_settings.sql

create table if not exists public.parent_account_settings (
  parent_user_id            uuid        primary key references auth.users(id) on delete cascade,
  plan_code                 text        not null default 'free' check (plan_code in (
                                          'free', 'trial', 'basic', 'family', 'premium', 'school_linked'
                                        )),
  account_status            text        not null default 'active' check (account_status in (
                                          'active', 'trial', 'suspended', 'cancelled'
                                        )),
  subscription_status       text        null check (subscription_status is null or subscription_status in (
                                          'active', 'trial', 'past_due', 'cancelled'
                                        )),
  max_children              integer     not null default 3 check (max_children >= 0),
  reports_enabled           boolean     not null default true,
  copilot_enabled           boolean     not null default false,
  advanced_diagnostics_enabled boolean  not null default false,
  export_enabled            boolean     not null default false,
  monthly_ai_limit          integer     null check (monthly_ai_limit is null or monthly_ai_limit >= 0),
  monthly_report_limit      integer     null check (monthly_report_limit is null or monthly_report_limit >= 0),
  billing_provider          text        null check (billing_provider is null or char_length(billing_provider) <= 64),
  provider_customer_id      text        null check (provider_customer_id is null or char_length(provider_customer_id) <= 256),
  provider_subscription_id  text        null check (provider_subscription_id is null or char_length(provider_subscription_id) <= 256),
  trial_ends_at             timestamptz null,
  current_period_ends_at    timestamptz null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.parent_account_settings enable row level security;
-- RLS: authenticated user reads own row; service-role writes
```

**Key design decisions:**

- `max_children` in this table **replaces** the hardcoded constant `MAX_CHILDREN_DEFAULT = 3` in `pages/parent/dashboard.js` and the allowlist-based `resolveParentStudentLimit` in `lib/parent-server/parent-student-limit.server.js` — but only after this table is live.
- `copilot_enabled` starts as `false` on the free plan. Enabling it requires plan upgrade or explicit admin grant.
- Payment fields are nullable and unused now. They exist so no schema migration is needed when payment is added.
- `account_status` on this table is separate from `status` on `account_persona_entitlements`. Both must be `active` for full parent access.

### 3.4 Existing Tables — Not Replaced, Roles Redefined

| Table | Role in new architecture |
|-------|--------------------------|
| `parent_profiles` | Profile data and display preferences only. **Not authorization.** Row existence does not grant any permission. |
| `teacher_profiles` | Teacher identity and basic settings. **Not authorization by itself.** Must be combined with active `private_teacher` or `school_teacher` entitlement. |
| `teacher_limits` | Quota and feature flags for teacher persona. Remains authoritative for teacher-side limits. |
| `school_teacher_memberships` | School assignment and role within school. Works alongside `school_teacher` entitlement. |
| `private_teacher_subjects` | Subject grants for private teachers. Remains authoritative for subject-scoped teacher APIs. |
| `school_teacher_subjects` | Subject grants for school teachers. Remains authoritative. |
| `school_accounts` | School tenant record. Unchanged. |

### 3.5 Parent Profile Trigger — Redefined Role

The trigger `on_auth_user_created_parent_profile` in `001_learning_core_foundation.sql` currently creates a `parent_profiles` row for every auth user.

**Immediate decision — choose one option before implementation:**

**Option A — Keep trigger, make it harmless (recommended for Phase 1)**
The trigger continues creating `parent_profiles` rows for all auth users. Because `account_persona_entitlements` becomes the authorization source of truth, the row being present is harmless — it has no security meaning. The Phase 2 guards check entitlements, not profile row existence.

Advantage: No trigger change needed. No risk of breaking row creation for real parents.

Disadvantage: `parent_profiles` rows exist for teacher/admin accounts, which is semantically misleading.

**Option B — Update trigger to be conditional**
Modify the trigger so it only creates `parent_profiles` when the new auth user has no `role` in `app_metadata` (i.e., is not a teacher or admin). Teacher accounts created via Supabase Admin API with `app_metadata: { role: 'teacher' }` would not get `parent_profiles`.

Advantage: Cleaner data model.

Disadvantage: Requires trigger migration. Any account creation path that forgets to set `app_metadata` would still get a `parent_profiles` row (which is acceptable).

**The owner must select Option A or Option B before Phase 1 SQL is prepared.**

This plan documents both options. The recommended default is **Option A** (keep trigger, make it harmless) because authorization is enforced at the entitlement layer, not the profile layer.

---

## 4. Server Guard Architecture

### 4.1 Central Guard File (new)

File: `lib/auth/persona-guard.server.js` (new file)

This file is the single source of truth for all persona access checks. Every API route that requires a persona calls a function from this file.

```
// PLAN ONLY — pseudocode structure

export async function requirePersonaApiContext(res, authHeader, requiredPersona, options = {}) {
  // 1. Verify bearer token -> get Supabase user
  // 2. Query account_persona_entitlements where user_id = user.id and persona = requiredPersona
  // 3. If no row -> 403 not_a_persona
  // 4. If status != 'active' -> 403 with specific code (pending/suspended/rejected/revoked)
  // 5. For parent: additionally check parent_account_settings
  //    - account_status must be 'active'
  //    - if options.requireFeature: check that feature flag is true on the settings row
  // 6. Return context object with user, entitlement, and settings
}

export async function requireParentApiContext(res, authHeader, options = {}) {
  return requirePersonaApiContext(res, authHeader, 'parent', options);
}

export async function requirePrivateTeacherApiContext(res, authHeader) {
  // Uses existing resolveAuthenticatedTeacherUserId for compatibility
  // Adds: check account_persona_entitlements for 'private_teacher' status='active'
  // Adds: block if school_teacher or school_manager entitlement is also active (no implicit dual)
}

export async function requireSchoolTeacherApiContext(res, authHeader) {
  // Checks 'school_teacher' entitlement active
  // Checks school_teacher_memberships exists and active
}

// requireSchoolManagerApiContext already exists in lib/school-server/school-request.server.js
// Update it to also check 'school_manager' entitlement

// requireAdminApiContext already exists in lib/admin-server/admin-request.server.js
// Update it to also check 'admin' entitlement
```

### 4.2 Parent API Guards

All routes under `pages/api/parent/**` must call `requireParentApiContext`. Feature-specific routes additionally pass options:

| Route | Guard call |
|-------|-----------|
| `GET /api/parent/list-students` | `requireParentApiContext(res, authHeader)` |
| `POST /api/parent/create-student` | `requireParentApiContext(res, authHeader)` — additionally checks `max_children` from `parent_account_settings` |
| `POST /api/parent/update-student` | `requireParentApiContext(res, authHeader)` |
| `POST /api/parent/delete-student` | `requireParentApiContext(res, authHeader)` |
| `POST /api/parent/create-student-access-code` | `requireParentApiContext(res, authHeader)` |
| `GET /api/parent/students/[studentId]/report-data` | `requireParentApiContext(res, authHeader, { requireFeature: 'reports_enabled' })` |
| `POST /api/parent/copilot-turn` | `requireParentApiContext(res, authHeader, { requireFeature: 'copilot_enabled' })` |
| `GET /api/parent/mini-report` | `requireParentApiContext(res, authHeader, { requireFeature: 'reports_enabled' })` |
| `POST /api/parent/teacher-consent/issue` | `requireParentApiContext(res, authHeader)` |
| `POST /api/parent/teacher-consent/revoke` | `requireParentApiContext(res, authHeader)` |
| `POST /api/parent/policy-acceptance/accept` | Allowed during signup flow — needs careful handling (see Section 5) |
| `GET /api/parent/policy-acceptance/status` | Allowed during signup flow — needs careful handling (see Section 5) |

### 4.3 Private Teacher API Guards

Routes that must block school teachers and school managers:

| Route | Guard |
|-------|-------|
| `POST /api/teacher/students/create` | `requirePrivateTeacherApiContext` (or explicit `rejectIfSchoolTeacher` short of full refactor) |
| `POST /api/teacher/students/link` | Same |
| `POST /api/teacher/classes` (POST) | Same |
| `POST /api/teacher/classes/[classId]/members` (POST) | Same |

Additionally: fix `POST /api/teacher/worksheet-activities` to call `assertActivitySubjectAllowed` (which correctly branches by school vs private context) instead of `assertSchoolTeacherSubjectAllowed`.

### 4.4 School Teacher / Manager / Admin Guards

These guards already exist in a basic form. They must be updated to also check `account_persona_entitlements`:

| Existing helper | File | Update required |
|-----------------|------|-----------------|
| `requireSchoolManagerApiContext` | `lib/school-server/school-request.server.js` | Add entitlement check for `school_manager` |
| `requireAdminApiContext` | `lib/admin-server/admin-request.server.js` | Add entitlement check for `admin` |
| `resolveAuthenticatedTeacherUserId` | `lib/teacher-server/teacher-session.server.js` | Add entitlement check for `private_teacher` or `school_teacher` |

### 4.5 Dual-Role Policy — Explicit Rules

| Combination | Default policy | Future override |
|-------------|----------------|-----------------|
| `parent` + `private_teacher` | Blocked — must not be automatic | Allowed only with explicit admin approval stored in entitlements |
| `parent` + `school_teacher` | Blocked — school and personal emails should be separate | Not supported without explicit design decision |
| `school_teacher` + `private_teacher` | **Blocked — enforced server-side** | Not supported |
| `school_manager` + `private_teacher` | **Blocked — enforced server-side** | Not supported |
| `admin` + `parent` | Blocked unless QA/test entitlement exists | Test accounts may have explicit seed entitlement |
| `admin` + `private_teacher` | Blocked | Not supported |

Any future dual-role allowance must be:

1. Explicitly defined in this plan document by the owner.
2. Stored as a separate entitlement row with `approval_source = 'admin'` and logged.
3. Tested with specific test cases.
4. Never automatic.

---

## 5. Parent Signup and Entitlement Provisioning

### 5.1 Current Flow (to be preserved as auth, redefined as entitlement)

Current: user signs up via `pages/parent/login.js` → `supabase.auth.signUp` → DB trigger creates `parent_profiles` → redirect to `/parent/dashboard`.

New interpretation:
- Authentication (Supabase signUp) creates the auth identity.
- Entitlement provisioning happens as a separate step.
- Plan/settings provisioning happens alongside entitlement provisioning.
- The `parent_profiles` row is data, not permission.

### 5.2 Parent Signup Mode Configuration

A server-side constant (not an environment variable in the first iteration) controls the signup mode:

```
// lib/parent-server/parent-signup-mode.server.js (new file, plan only)
// PARENT_SIGNUP_MODE options:
//   'auto_active'             - entitlement created active immediately on signup
//   'email_verified_only'     - entitlement active only after email verification
//   'pending_admin_approval'  - entitlement starts as pending; admin approves
//   'payment_required'        - entitlement active after payment
```

Development default: `auto_active`.

The `POST /api/parent/policy-acceptance/accept` route currently stores policy acceptance. In the new model, this route should also trigger entitlement and settings provisioning if they do not yet exist for the user.

Alternatively, a new `POST /api/parent/provision` route may be added specifically for entitlement setup, called once during or after signup. The exact trigger point for entitlement provisioning must be confirmed before Phase 2 implementation.

**Owner must confirm:** Should entitlement provisioning happen at signup (`signUp` callback or trigger), at policy acceptance, or at first dashboard load?

### 5.3 Backfill for Development Environment

Because there are no real users, the backfill is straightforward:

```sql
-- PLAN ONLY — backfill for development, not production
-- Step 1: Insert active parent entitlements for all existing parent_profiles
--         that do not already have a teacher_profiles row.
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT pp.id, 'parent', 'active', 'migration', now()
FROM public.parent_profiles pp
LEFT JOIN public.teacher_profiles tp ON tp.id = pp.id
WHERE tp.id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 2: Insert active private_teacher entitlements for teachers with no school membership.
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT tp.id, 'private_teacher', 'active', 'migration', now()
FROM public.teacher_profiles tp
LEFT JOIN public.school_teacher_memberships stm ON stm.teacher_id = tp.id
WHERE stm.teacher_id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 3: Insert active school_teacher entitlements for school members (non-admin role).
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_teacher', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'teacher'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 4: Insert active school_manager entitlements for school admins.
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_manager', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'school_admin'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 5: Insert active admin entitlements.
-- This requires identifying admin auth users by app_metadata.role = 'admin'.
-- Cursor cannot list auth.users; owner must run the following manually or
-- identify admin UUIDs and insert manually:
-- INSERT INTO public.account_persona_entitlements (user_id, persona, status, approval_source, approved_at)
-- VALUES ('<admin-uuid>', 'admin', 'active', 'seed', now());
```

**Pre-migration audit queries (owner runs before backfill):**

```sql
-- How many parent_profiles exist?
SELECT count(*) FROM public.parent_profiles;

-- How many parent_profiles also have teacher_profiles (potential dual-role)?
SELECT count(*) FROM public.parent_profiles pp
JOIN public.teacher_profiles tp ON tp.id = pp.id;

-- How many parent_profiles have parent-owned students?
SELECT count(DISTINCT parent_id) FROM public.students;

-- List all school memberships by role:
SELECT role, count(*) FROM public.school_teacher_memberships GROUP BY role;
```

These queries confirm what will be backfilled before any migration runs.

---

## 6. Teacher Registration — Future Architecture (Not Implemented Now)

The private teacher registration workflow is not implemented. This section documents the target design so the entitlement model supports it without future schema changes.

### Critical rule — teacher registration is always pending by default

Unlike parent signup (which may be `auto_active` in development), teacher registration must **never** auto-create an active teacher entitlement. Every teacher registration path — whether via future self-registration form or admin invite — must create a `status = 'pending'` entitlement and wait for explicit admin approval.

This rule applies to all teacher types:
- `private_teacher` — pending until admin approves, grants subjects, sets limits
- `school_teacher` — pending until admin or school admin assigns to a school
- `school_manager` — pending until platform admin approves school assignment

There is no `TEACHER_SIGNUP_MODE` equivalent to `PARENT_SIGNUP_MODE`. The teacher approval requirement is not configurable.

### Desired registration UI (future — not implemented until explicitly approved)

When eventually approved, teacher self-registration should be added as a new tab on the existing teacher login page, matching the same dark visual design language and tab structure as the parent login/register tabs. The tab must not be added before the backend approval flow is implemented. The registration tab must not be added to the login page in Phase 3.

### Desired flow (future):

1. Teacher visits teacher login page and clicks the registration/request tab (future addition only).
2. Teacher submits: name, email, subjects requested, brief description.
3. System creates auth user (or links existing) + inserts `account_persona_entitlements` row with `status = 'pending'`, `persona = 'private_teacher'`, `approval_source = 'self_signup'`.
4. Platform admin receives notification and reviews.
5. Admin approves: sets `status = 'active'`, grants `private_teacher_subjects`, sets `teacher_limits`.
6. Admin rejects: sets `status = 'rejected'`, stores reason.
7. Teacher receives confirmation (email or in-app message — Hebrew copy requires owner approval).

The entitlement table already supports this flow.

**Implementation:** Not approved yet. Will be defined in a separate registration plan document when the owner is ready. Phase 6 in the implementation roadmap covers this.

---

## 7. School Registration — Future Architecture (Not Implemented Now)

### Desired flow (future):

1. School administrator submits a school registration request.
2. System creates a pending `school_accounts` record and a pending `school_manager` entitlement.
3. Platform admin reviews and approves.
4. Admin configures school limits: `max_teachers`, subjects allowed, credentials scope.
5. School manager account is activated.
6. School manager can then manage teachers within configured limits.

The `school_accounts.max_teachers` field already exists but is not enforced at assign time. Enforcement must be added when this flow is implemented.

**Implementation:** Not approved yet. Separate plan required.

---

## 8. Password Reset — Deferred

Password reset is not implemented for any Supabase email persona (parent, teacher, school manager, admin). This is a confirmed gap.

### Future requirements (not implemented now):

- Forgot-password link on `/parent/login`
- Forgot-password link on `/teacher/login`
- Client call to `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- Reset callback page at `/auth/reset-password` or equivalent
- Handler reads Supabase recovery token from URL hash → calls `supabase.auth.updateUser({ password })`
- Persona-aware post-reset redirect (parent → `/parent/dashboard`, teacher → `/teacher/dashboard`)
- Supabase email templates configured in Supabase dashboard (Site URL and redirect allowlist)
- Hebrew copy for all UI states must be approved by owner before implementation

**Implementation:** Separate plan. Not part of this plan's scope.

---

## 8a. Unified Auth Entry / OAuth Login UX — Future Optional Layer (Not Implemented Now)

The owner wants the platform to support social/OAuth login in the future as a convenience layer on top of the existing auth system. This section defines the architecture and constraints for that future layer.

### Critical rule — OAuth is authentication only. It is never authorization.

After any OAuth login (Google, Microsoft, or other provider), the server must still check all of the following before granting access:

- Active entitlement for the requested persona (`parent`, `private_teacher`, `school_teacher`, `school_manager`, `admin`)
- `account_persona_entitlements.status = 'active'`
- `parent_account_settings.account_status = 'active'` (for parent flows)
- Plan/feature flags (`copilot_enabled`, `reports_enabled`, etc.) where applicable
- Teacher/school subject permissions where applicable

OAuth login does not bypass the entitlement system. It cannot. A teacher who signs in with Google is still checked against `account_persona_entitlements` for their teacher persona. A parent who signs in with Google is still checked for their parent entitlement.

### Desired future OAuth providers

- Google (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- Microsoft (`supabase.auth.signInWithOAuth({ provider: 'azure' })`)
- Apple (possible later, requires Apple developer enrollment)
- Facebook: not required
- Manual email/password login and manual email signup must be kept alongside OAuth — OAuth is additive, not a replacement

### UI approach (when eventually approved)

OAuth buttons should be added to the existing parent and teacher login pages without restructuring the page layout:

- Buttons added below or above the existing email/password form, maintaining the existing dark visual design language
- No new page, no layout change to the tab structure
- "Continue with Google" and "Continue with Microsoft" buttons
- Separator between OAuth and manual email sections
- Hebrew labels for OAuth buttons require owner approval before implementation

### Supabase configuration required (when approved)

- Google OAuth app credentials in Supabase dashboard
- Microsoft Azure app credentials in Supabase dashboard
- Authorized redirect URIs configured for each provider
- `signInWithOAuth` callback must route to the correct persona portal after entitlement check

### Post-OAuth redirect and entitlement check flow (when implemented)

```
OAuth login callback
  -> supabase session established
  -> server checks account_persona_entitlements for parent or teacher persona
  -> if active parent entitlement: redirect to /parent/dashboard
  -> if active teacher entitlement: redirect to /teacher/dashboard
  -> if no active entitlement: show "access pending" or "register" state
  -> if teacher entitlement is pending: show "your request is under review"
```

Hebrew copy for all post-OAuth states requires owner approval.

**Implementation:** Not approved. Not part of this plan's current implementation scope. Will require a separate owner decision and a separate implementation plan that covers provider credentials, callback pages, and Hebrew UX copy approval.

---

## 9. SQL Migration Policy

Every migration file prepared as part of this plan must include:

1. **Purpose** — one-sentence description of what the migration does.
2. **Forward SQL** — the actual SQL statements.
3. **Safety notes** — any conditions that must be true before applying.
4. **Backfill explanation** — what existing data is affected and how.
5. **Expected affected rows** — how many rows are expected to be inserted/updated.
6. **Verification query** — SQL the owner runs after applying to confirm success.
7. **Rollback notes** — how to revert if something is wrong.
8. **Staging/local test instructions** — if applicable.

Migration files will be placed in `supabase/migrations/` with sequential numbering (040+).

**Migration execution rule:** Cursor prepares the file. Owner reviews it. Owner runs it manually against Supabase. Cursor confirms nothing was executed automatically.

---

## 10. Implementation Phases

### Phase 0 — Discovery and Inventory Confirmation

**Goal:** Confirm all current state before any code is written.

**Tasks:**
- List all routes under `pages/api/parent/`, `pages/api/teacher/`, `pages/api/school/`, `pages/api/admin/`.
- Confirm all parent API routes and their current auth pattern.
- Confirm current behavior of `parent_profiles` trigger.
- Identify QA/test accounts that may need special handling (admin, QA parent with 50-child allowlist, etc.).
- Run pre-migration audit queries above and review results with owner.
- Confirm parent signup mode decision.
- Confirm trigger Option A vs Option B decision.
- Confirm entitlement provisioning trigger point for parent signup.
- **Inspect and document the parent registration policy modal repeat behavior** — when a regular parent clicks register, the policy/terms modal appears; after the parent clicks continue, the modal appears again. Determine whether this is:
  - (a) caused by an issue in the policy acceptance/entitlement provisioning flow (in which case the fix belongs in Phase 2 of this plan), or
  - (b) a separate, standalone UI/state bug unrelated to the entitlement model (in which case it is deferred to a separate small bugfix)
  - **No fix is applied until the cause is confirmed. No policy modal behavior changes until the relationship to the auth/entitlement flow is understood.**

**No code changes. No SQL. Owner review required before Phase 1.**

---

### Phase 1 — Foundational Entitlement Schema and Account Model

**Goal:** Prepare SQL migrations for the new tables. Do not run them.

**Tasks:**
- Prepare `040_account_persona_entitlements.sql` — table, indexes, RLS.
- Prepare `041_parent_account_settings.sql` — table, indexes, RLS.
- Prepare backfill SQL for development environment (Section 5.3 above).
- Prepare `042_backfill_entitlements_dev.sql` — backfill script.
- Write migration header docs (purpose, safety notes, verification queries, rollback).
- Confirm the trigger decision (Option A or B) and prepare trigger migration only if Option B is selected.
- **Owner reviews all SQL. Owner runs SQL manually. Owner confirms success using verification queries.**

**No application code changes. SQL prepared only.**

---

### Phase 2 — Server-Side Persona Guards

**Goal:** Add `lib/auth/persona-guard.server.js` and update all affected API routes.

**Dependencies:** Phase 1 SQL must be applied before Phase 2 is deployed.

**Tasks:**

#### 2a. New shared guard file
- Create `lib/auth/persona-guard.server.js` with `requirePersonaApiContext`, `requireParentApiContext`, `requirePrivateTeacherApiContext`.

#### 2b. Update all parent API routes
Update these files to call `requireParentApiContext` (replacing bare `auth.getUser`):

- `pages/api/parent/create-student.js`
- `pages/api/parent/list-students.js`
- `pages/api/parent/update-student.js`
- `pages/api/parent/delete-student.js`
- `pages/api/parent/create-student-access-code.js`
- `pages/api/parent/students/[studentId]/report-data.js`
- `pages/api/parent/copilot-turn.js`
- `pages/api/parent/mini-report.js`
- `pages/api/parent/teacher-consent/issue.js`
- `pages/api/parent/teacher-consent/revoke.js`

Note on policy acceptance routes:
- `pages/api/parent/policy-acceptance/accept.js` — must be callable during the parent signup flow before entitlement is fully active. This route should check either (a) an active parent entitlement, or (b) a valid auth session with a valid pending entitlement for `parent`. The exact handling must be decided and documented before Phase 2 implementation. **Owner must confirm.**
- `pages/api/parent/policy-acceptance/status.js` — same decision required.

#### 2c. Add `rejectIfSchoolTeacher` to private teacher routes
Add a helper in `lib/teacher-server/private-teacher-guard.server.js` that calls `loadTeacherSchoolMembership` and returns 403 with code `school_teacher_no_private_access` if a school membership exists.

Apply to:
- `pages/api/teacher/students/create.js`
- `pages/api/teacher/students/link.js`
- `pages/api/teacher/classes/index.js` (POST handler only)
- `pages/api/teacher/classes/[classId]/members.js` (POST handler only)

#### 2d. Fix worksheet subject gate
Change `pages/api/teacher/worksheet-activities/index.js` to call `assertActivitySubjectAllowed` (from `lib/school-server/school-subjects.server.js`) instead of `assertSchoolTeacherSubjectAllowed`. This aligns worksheets with the same gate logic as individual and classroom activities.

#### 2e. Update existing teacher/school/admin guards
- `lib/teacher-server/teacher-session.server.js` → `resolveAuthenticatedTeacherUserId` must also query `account_persona_entitlements` and confirm `status = 'active'` for `private_teacher` or `school_teacher`.
- `lib/school-server/school-request.server.js` → `requireSchoolManagerApiContext` must also check `school_manager` entitlement.
- `lib/admin-server/admin-request.server.js` → `requireAdminApiContext` must also check `admin` entitlement.

#### 2f. Update `parent_account_settings` max_children usage
Replace the hardcoded limit in `pages/api/parent/create-student.js` and `pages/api/parent/list-students.js` with a lookup from `parent_account_settings.max_children`. The existing `resolveParentStudentLimit` in `lib/parent-server/parent-student-limit.server.js` should be updated to read from the new table, falling back to the current default only if no settings row exists.

---

### Phase 3 — UI Routing and Session Boundary Cleanup

**Goal:** Parent login and teacher login pages should not silently cross-persona redirect. No Hebrew copy changes without owner approval.

**Dependencies:** Phase 2 must be complete. Phase 3 is UI-only — security is already enforced by API guards. Phase 3 improves user experience only.

#### UI Design Constraints — Mandatory for Phase 3

These constraints apply to every task in Phase 3. No exception without explicit owner approval:

- **Preserve the existing parent login page design** — login/register tabs, dark visual style, manual email/password/code fields, existing layout structure. Do not restructure the page.
- **Preserve the existing teacher login page design** — login form, dark visual style, existing layout. Do not restructure the page.
- **No OAuth buttons in Phase 3** — OAuth/social login is a future optional layer (Section 8a). It is not added here.
- **No teacher registration tab in Phase 3** — teacher registration is a future phase (Section 6). It is not added here.
- **Keep manual email/password flow exactly as-is** — do not replace or move any existing form field.
- **No broad visual redesign** — any change must be a minimal, additive, scoped modification.
- **No Hebrew copy changes** — new messages use placeholder English text pending owner approval of exact Hebrew.
- **All new Hebrew text required for new states must be listed in English in this plan and individually approved by the owner before implementation.**

#### Phase 3 Tasks

- `pages/parent/login.js` — after `getSession()`, if `app_metadata.role === 'teacher'` or `'admin'`, do not redirect to `/parent/dashboard`. Instead: redirect to `/teacher/login` or show an informational message. Preserve all existing page elements. **Hebrew copy for message requires owner approval before implementation.**
- `pages/parent/dashboard.js` — on `onAuthStateChange`, if `GET /api/parent/list-students` returns 403, redirect back to `/parent/login`. No additional role check needed — the API guard handles it.
- `pages/teacher/login.js` — already correctly signs out non-teachers. No change needed. Confirm this behavior is unaffected after Phase 2.
- `/parent/school-inbox.js` — already redirects to `/parent/login` on 401. Verify this continues to work after Phase 2.
- **Policy modal fix (if Phase 0 determined it is auth/entitlement-related):** Apply the scoped fix here. If Phase 0 determined it is an unrelated UI bug, defer it separately and document the deferral.

**No Hebrew copy changed. Informational messages use existing error state patterns with placeholder text in English, pending owner Hebrew approval.**

---

### Phase 4 — Admin Management Surfaces for Entitlements

**Goal:** Admin can view and manage persona entitlements and parent account settings.

**Dependencies:** Phase 1 (schema) and Phase 2 (guards) must be complete.

**Tasks:**
- New admin API routes for managing `account_persona_entitlements`:
  - `GET /api/admin/entitlements?userId=` — list entitlements for a user
  - `PATCH /api/admin/entitlements/[id]` — update status (activate/suspend/revoke)
- New admin API routes for managing `parent_account_settings`:
  - `GET /api/admin/parents/[userId]/settings`
  - `PATCH /api/admin/parents/[userId]/settings`
- Admin UI additions on `pages/admin/teachers/[teacherId].js` — show persona entitlements
- Admin UI additions on a new `pages/admin/parents/[userId].js` — show/edit parent settings

**Scope of admin UI must be confirmed by owner before Phase 4 implementation begins.**

---

### Phase 5 — Subscription-Ready Limits (Internal Only, No Payment)

**Goal:** `parent_account_settings` is actively used for plan-based feature gating. No real payment integration.

**Dependencies:** Phase 2 must be complete (guards read settings).

**Tasks:**
- Define plan code presets (free, trial, basic, family, premium).
- Admin can set parent plan codes from Phase 4 admin surfaces.
- Report and Copilot feature flags enforced via `requireParentApiContext({ requireFeature })`.
- `monthly_ai_limit` enforcement: if non-null, count calls per parent per month via a query or a counter table (design TBD with owner).

**Payment provider integration is not implemented. All billing fields remain null.**

---

### Phase 6 — Registration Workflows (Not Implemented Until Explicitly Approved)

- Private teacher public request form
- School public registration request form
- Admin review/approve/reject workflow
- School manager teacher invite (within school limits)
- Student creation by school managers (not just enrollment)

**These are separate plan documents. Not part of this plan's implementation scope.**

---

### Phase 7 — Password Reset (Separate Plan, Deferred)

See Section 8. Not implemented in this plan.

---

### Phase 8 — QA, Verification, and ZIP Delivery

**Goal:** Confirm all implementation is correct, all tests pass, and the owner can review the full change set.

**Tasks:**
- Run full automated test suite (including tests written in phases above).
- Run production build (`npm run build`) and confirm no errors.
- Run manual QA checklist (Section 11.2).
- Prepare final implementation report documenting:
  - All changed files
  - All new files
  - All migration files prepared (but not run by Cursor)
  - Test results
  - Confirmation that no SQL was executed by Cursor
  - Confirmation that no commit/push/deploy was performed
- Prepare ZIP (see Section 12).

---

## 11. Testing Requirements

### 11.1 Automated Test Matrix

#### A — Parent APIs

| Scenario | Expected result |
|----------|----------------|
| Active parent entitlement, valid session | 200/201 on list/create/report/copilot |
| No `account_persona_entitlements` row for parent | 403 `not_a_parent` |
| `account_persona_entitlements.status = 'pending'` | 403 `entitlement_pending` |
| `account_persona_entitlements.status = 'suspended'` | 403 `entitlement_suspended` |
| `account_persona_entitlements.status = 'revoked'` | 403 `entitlement_revoked` |
| Bearer is `app_metadata.role = 'teacher'` (private teacher) | 403 `not_a_parent` |
| Bearer is school teacher | 403 `not_a_parent` |
| Bearer is school manager | 403 `not_a_parent` |
| Bearer is admin | 403 `not_a_parent` |
| Active parent, `reports_enabled = false` | 403 on report-data API |
| Active parent, `copilot_enabled = false` | 403 on copilot-turn API |
| Active parent, `max_children = 1`, 1 child exists | 400 on create-student |
| Active parent, `max_children = 3`, 2 children exist | 201 on create-student |

#### B — Private Teacher APIs

| Scenario | Expected result |
|----------|----------------|
| Active `private_teacher` entitlement, no school membership | 201 on create student/class |
| Active `school_teacher` entitlement, school membership exists | 403 `school_teacher_no_private_access` on create student/class |
| Active `school_manager` entitlement | 403 on private student/class create |
| Private teacher, no `private_teacher_subjects` grant | 403 `subject_not_permitted` on subject-scoped activity |
| Private teacher, with `private_teacher_subjects` grant | 200/201 on subject-scoped activity |
| Private teacher → worksheet activity → same subject gate as individual activity | 403 if no grant, 200 if grant exists |

#### C — School Teacher APIs

| Scenario | Expected result |
|----------|----------------|
| School teacher, with `school_teacher_subjects` grant | 200/201 on school activity |
| School teacher, without subject grant | 403 `subject_not_permitted` |
| Private teacher → school APIs (`/api/school/**`) | 403 `not_a_school_manager` |
| Parent bearer → school APIs | 403 |

#### D — Admin APIs

| Scenario | Expected result |
|----------|----------------|
| Active `admin` entitlement | 200 on admin APIs |
| School manager → admin APIs | 403 |
| Teacher → admin APIs | 403 |
| Parent → admin APIs | 403 |

#### E — Cross-session and direct navigation (API level)

| Scenario | Expected result |
|----------|----------------|
| Teacher session bearer → POST /api/parent/create-student | 403 |
| Parent session bearer → POST /api/teacher/students/create | 403 `not_a_teacher` |
| School teacher → POST /api/teacher/students/create (direct API call) | 403 `school_teacher_no_private_access` |

#### F — Regression

| Scenario | Expected result |
|----------|----------------|
| Student login (username + PIN) | Unaffected |
| Guardian PIN login | Unaffected |
| School-issued guardian credentials | Unaffected |
| Existing teacher dashboard load | 200 |
| School manager subject assignment | 201 |
| Existing parent-owned students (backfilled entitlement) | Visible in list-students |

### 11.2 Manual QA Checklist

- [ ] Parent can sign up and immediately reach dashboard (auto_active mode)
- [ ] Parent can add a child (within max_children limit)
- [ ] Parent can view child report (if `reports_enabled = true`)
- [ ] Parent copilot behaves correctly based on `copilot_enabled` flag
- [ ] Parent cannot access `/teacher/dashboard`
- [ ] Teacher (private) can log in and access teacher dashboard
- [ ] Teacher (private) can create a student (own private student)
- [ ] Teacher (private) with subject grant can create subject activity
- [ ] Teacher (private) without subject grant receives appropriate error on activity creation
- [ ] School teacher can log in and access school portal
- [ ] School teacher cannot create a private class via the teacher portal
- [ ] School teacher cannot create a private student via the teacher portal
- [ ] School teacher can be assigned subjects by school manager
- [ ] School manager can access school management pages
- [ ] School manager cannot access platform admin pages (`/admin/**`)
- [ ] Admin can access teacher and school management pages
- [ ] Navigating directly to `/parent/dashboard` with a teacher session is blocked
- [ ] Navigating directly to `/teacher/dashboard` with a parent-only session is blocked
- [ ] Guardian PIN flow is unaffected
- [ ] Hebrew text on all existing screens is unchanged
- [ ] No new Hebrew text introduced without owner approval

---

## 12. ZIP Deliverable Requirements

When implementation is eventually approved and completed, Cursor must prepare a ZIP file for owner review before any deploy.

### Included in ZIP:

- All changed `.js`, `.jsx`, `.ts`, `.tsx` source files (relative paths from workspace root)
- All new server helper files
- All new or updated test files
- All new or updated documentation files
- All prepared migration files (not run)
- A `CHANGES.md` file listing every changed file with a one-line description of what changed

### Excluded from ZIP:

- `.env`, `.env.local`, or any file with `SECRET`, `KEY`, or `PASSWORD` in the name
- `node_modules/`
- `.next/`
- All build outputs
- `.git/` internals
- Files not related to this plan's scope
- Reports or logs containing private user data

### Alongside the ZIP, provide:

- Output of `git status --short`
- Output of `git diff --stat`
- Exact list of files in the ZIP
- All commands run during implementation (no hidden steps)
- Test result summary
- Confirmation: no SQL executed by Cursor
- Confirmation: no commit, push, or deploy performed
- Migration files listed separately with names and purposes

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backfill misidentifies dual-role QA accounts | Low (dev env only) | Medium | Run pre-migration audit queries; review before applying |
| Policy acceptance flow blocked during signup | Medium | High | Phase 2c decision point on policy-acceptance routes; test explicitly |
| Worksheet gate fix breaks existing worksheet workflows | Low | Medium | Regression tests; staged rollout |
| Admin accounts need explicit test entitlements | Medium | Medium | Seed admin entitlements during Phase 1 backfill |
| `parent_account_settings` row not created for existing parents | Low (dev env) | Medium | Backfill includes settings row creation with defaults |
| School teacher with existing private classes/students before Phase 2 | Low (dev env) | Low | No retroactive deletion; teacher retains existing data; create is blocked going forward |

---

## 14. Backward Compatibility

| Concern | Handled by |
|---------|-----------|
| Existing real parent accounts | Backfill creates `active` entitlement and default `parent_account_settings`; no disruption |
| Existing school teachers and their dashboards | Read-only teacher dashboard and school portal unaffected; only private student/class **creation** is blocked |
| Existing teacher-managed students (sim parent) | Not affected; these are owned by sim parent, not by teacher auth user |
| Guardian PIN login | Completely separate auth system; no change |
| Student login | Completely separate auth system; no change |
| QA admin account with 50-child parent allowlist | Must be identified in Phase 0; given explicit `parent` entitlement + elevated `max_children` in `parent_account_settings` |
| `resolveParentStudentLimit` email-based allowlist | Replaced by `parent_account_settings.max_children`; QA emails given elevated limits via settings row |

---

## 15. Out of Scope

The following are **explicitly out of scope** for this plan:

- Password reset for any persona (deferred, Section 8)
- Private teacher public registration flow (deferred, Section 6)
- School public registration flow (deferred, Section 7)
- OAuth / social login (deferred, Section 8a — future optional layer, requires separate approval)
- Teacher registration tab on teacher login page (deferred — not added until backend approval flow is complete)
- Real payment provider integration (Section 3.3 — fields present but unused)
- New Hebrew copy (requires owner approval; none introduced in this plan)
- Student learning content or question system changes
- Arcade or game system changes
- Parent report UI/UX redesign
- Login page visual redesign (any login page change must be minimal and additive only)
- Supabase email template configuration
- Any change to student or guardian login systems
- Policy modal behavior change (deferred until Phase 0 determines whether it is part of the auth/entitlement flow or a separate UI bug)

---

## 16. Final Owner Approval Gate

The following decisions must be made by the owner **before implementation of each phase begins:**

### Before Phase 1 (SQL preparation):
- [ ] Confirm: trigger Option A (keep, harmless) or Option B (conditional)?
- [ ] Confirm: entitlement provisioning trigger point during parent signup?
- [ ] Confirm: initial `PARENT_SIGNUP_MODE` = `auto_active`?
- [ ] Confirm: policy-acceptance API handling during signup flow (pre-entitlement)?
- [ ] Review and confirm: pre-migration audit query results?

### Before Phase 2 (code implementation):
- [ ] Phase 1 SQL applied and verified by owner?
- [ ] Confirm: exact policy-acceptance route handling?
- [ ] Confirm: worksheet gate fix does not break any existing approved workflow?

### Before Phase 3 (UI routing):
- [ ] Confirm Hebrew placeholder text for "wrong portal" messages (Phase 3 may be deferred until Hebrew approved)?
- [ ] Confirm: policy modal repeat behavior is auth/entitlement-related or a separate UI bug (from Phase 0 finding)?
- [ ] Confirm: no OAuth buttons, no teacher registration tab, no login page redesign is intended for Phase 3?
- [ ] Confirm: exact scope of changes to `pages/parent/login.js` and `pages/parent/dashboard.js` (additive only)?

### Before Phase 4 (admin surfaces):
- [ ] Confirm exact scope of admin entitlement management UI?

### Before Phase 8 (ZIP and verification):
- [ ] All prior phases approved and tested?
- [ ] Owner ready to receive ZIP and review?

---

## 17. Confirmation

No code was changed as part of creating or updating this plan.  
No SQL was executed as part of creating or updating this plan.  
No migrations were run.  
No UI was modified.  
No CSS was modified.  
No Hebrew text was changed.  
No commit was made.  
No push was made.  
No deploy was made.

This document is the planning artifact only. All additions in this revision are documentation updates only.

**Updates made in revision 2026-05-30:**
- Added Execution Rules 7 and 8 (login page design preservation; OAuth and teacher registration tab require explicit owner approval)
- Added Product Rule M (login page design constraints)
- Added Product Rule N (parent signup vs teacher signup — explicit distinction and behavioral rules)
- Updated Section 6 (teacher registration) to make pending-by-default mandatory and non-configurable; documented the future registration tab approach
- Added Section 8a (OAuth / social login — future optional layer, not implemented now)
- Updated Phase 0 to include policy modal inspection as a required discovery task, with explicit constraint that no modal behavior changes until the cause is confirmed
- Updated Phase 3 to add mandatory UI design constraints block before task list
- Updated Section 15 (Out of Scope) with OAuth, login redesign, teacher registration tab, and policy modal deferral
- Updated Section 16 (Owner Approval Gate) with Phase 3 pre-condition checks

---

*End of plan — awaiting owner review and phase-by-phase approval.*

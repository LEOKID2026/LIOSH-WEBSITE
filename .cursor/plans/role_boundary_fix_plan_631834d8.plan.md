---
name: Role / Persona / Entitlement / Subscription-Ready Access Foundation
overview: Foundational, production-grade access control architecture for multi-persona identity, explicit entitlements, subscription-ready plan limits, school credential authority rules, modular school operator grants, and admin-controlled approval workflows. Executes end-to-end after owner final approval; pauses only for manual SQL, uncovered blockers, Hebrew copy, or scope changes.
todos:
  - id: phase0-discovery
    content: "Phase 0: Inventory all routes under pages/api/parent/, pages/api/teacher/, pages/api/school/, pages/api/admin/. Confirm parent trigger behavior. Identify QA/test accounts. Inspect school_teacher_memberships for school_operator extension viability. Run pre-migration audit queries."
    status: completed
  - id: phase0-policy-modal
    content: "Phase 0: Inspect parent registration policy modal repeat behavior. Determine if auth/entitlement-flow-related (fix in Phase 2) or standalone UI bug (defer separately). No modal changes until cause confirmed."
    status: completed
  - id: phase1-schema-entitlements
    content: "Phase 1 (SQL prep — owner runs manually): Prepare 040_account_persona_entitlements.sql including school_operator in persona check constraint. Purpose, safety notes, expected rows, verification query, rollback notes."
    status: completed
  - id: phase1-schema-parent-settings
    content: "Phase 1 (SQL prep — owner runs manually): Prepare 041_parent_account_settings.sql. Plan/limit/subscription-ready fields. Default: plan_code=free, max_children=3, reports_enabled=true, copilot_enabled=false."
    status: completed
  - id: phase1-schema-school-quotas
    content: "Phase 1 (SQL prep — owner runs manually): Prepare 043_school_accounts_separate_quotas.sql — add max_school_teachers(20), max_school_managers(1), max_school_students(500), max_school_operators(5). Backfill max_school_teachers from max_teachers. Document max_teachers drop/retain decision."
    status: completed
  - id: phase1-schema-operator-grants
    content: "Phase 1 (SQL prep — owner runs manually): Prepare 044_school_operator_grants.sql — current-state grants table (school_id, operator_user_id, student_access_admin, student_data_viewer, updated_by, updated_at). Prepare 045_school_operator_audit_log.sql — audit log table."
    status: completed
  - id: phase1-schema-membership
    content: "Phase 1 (SQL prep — owner runs manually): Based on Phase 0 inspection, either extend school_teacher_memberships to add school_operator role value, or prepare 046_school_staff_memberships.sql for a new table. Document choice."
    status: completed
  - id: phase1-backfill
    content: "Phase 1 (SQL prep — owner runs manually): Prepare 042_backfill_entitlements_dev.sql — backfill active entitlements for parent/private_teacher/school_teacher/school_manager/admin. Prepare SQL review package for owner before any SQL is run."
    status: completed
  - id: phase1-sql-review-package
    content: "Phase 1: Produce SQL review package — list of all migration files, purpose, file paths, expected affected rows, pre-migration audit queries, verification queries, rollback notes, data-loss risk assessment. Owner reviews and runs SQL manually. Cursor waits for owner confirmation before proceeding."
    status: completed
  - id: phase2-guard-file
    content: "Phase 2: Create lib/auth/persona-guard.server.js with requirePersonaApiContext, requireParentApiContext, requirePrivateTeacherApiContext, requireSchoolOperatorApiContext (with requireGrant option for student_access_admin and student_data_viewer)."
    status: completed
  - id: phase2-parent-apis
    content: "Phase 2: Update all pages/api/parent/* routes to call requireParentApiContext. Feature routes pass requireFeature option. Replace hardcoded max_children with parent_account_settings lookup via resolveParentStudentLimit."
    status: completed
  - id: phase2-private-teacher-guard
    content: "Phase 2: Create lib/teacher-server/private-teacher-guard.server.js with rejectIfSchoolTeacher. Apply to pages/api/teacher/students/create.js, link.js, pages/api/teacher/classes/index.js (POST), pages/api/teacher/classes/[classId]/members.js (POST)."
    status: completed
  - id: phase2-worksheet-gate
    content: "Phase 2: Fix pages/api/teacher/worksheet-activities/index.js to call assertActivitySubjectAllowed instead of assertSchoolTeacherSubjectAllowed."
    status: completed
  - id: phase2-update-existing-guards
    content: "Phase 2: Update resolveAuthenticatedTeacherUserId, requireSchoolManagerApiContext, requireAdminApiContext to also check account_persona_entitlements status=active."
    status: completed
  - id: phase2-school-operator-apis
    content: "Phase 2: Add school operator invite/create API under school manager scope. Enforce max_school_operators quota. Create school_operator_grants row on invite (student_access_admin=false, student_data_viewer=false by default). Add grant/revoke APIs for School Manager."
    status: completed
  - id: phase2-quota-enforcement
    content: "Phase 2: Enforce max_school_teachers on teacher invite, max_school_managers on manager assign (enforce =1), max_school_students on student enroll, max_school_operators on operator invite. School Manager cannot exceed any quota."
    status: completed
  - id: phase2-operator-credential-apis
    content: "Phase 2: Credential management APIs check school_operator_grants.student_access_admin. Student detail/report APIs check school_operator_grants.student_data_viewer. All operator actions logged to school_operator_audit_log."
    status: completed
  - id: phase3-login-routing
    content: "Phase 3 (UI only — design preserved): pages/parent/login.js cross-persona redirect block. pages/parent/dashboard.js 403 redirect. Verify school-inbox. Apply policy modal fix if Phase 0 confirmed entitlement-related. No Hebrew copy changes, no OAuth, no teacher-registration tab, no redesign."
    status: completed
  - id: phase4-admin-surfaces
    content: "Phase 4: Admin API routes for entitlement management (GET/PATCH account_persona_entitlements), school quota management (PATCH school_accounts separate fields), parent settings (GET/PATCH parent_account_settings), private teacher quota/subject/feature management."
    status: completed
  - id: phase5-subscription-limits
    content: "Phase 5: Internal plan-based feature gating using parent_account_settings. No real payment integration. Plan code presets. Monthly limit enforcement if non-null."
    status: completed
  - id: phase6-registration
    content: "Phase 6 (DEFERRED — separate plan required): Private teacher public request/approval form. School public registration/approval form. NOT implemented until explicitly approved. school_operator is already in scope and implemented in Phases 1-2."
    status: cancelled
  - id: phase7-password-reset
    content: "Phase 7 (DEFERRED — separate plan required): Forgot-password and reset-password for parent and teacher personas. Supabase resetPasswordForEmail, callback page, persona-aware redirect, Hebrew copy owner approval."
    status: cancelled
  - id: phase8-qa-zip
    content: "Phase 8: Run automated test suite (all groups A-J). Run npm run build. Run manual QA checklist. Produce final self-audit against plan (every rule A-U, every matrix entry, every guard, every quota, every operator permission, every portal entry rule, every out-of-scope item). Prepare ZIP + CHANGES.md + git status/diff + command log + test summary + build result. Confirm no SQL/commit/push/deploy by Cursor."
    status: completed
isProject: false
---

# Role / Persona / Entitlement / Subscription-Ready Access Foundation Plan

**Status:** PLAN READY — awaiting owner final approval for end-to-end implementation
**Created:** 2026-05-29
**Last updated:** 2026-05-30 (pass 5 — final hardening: end-to-end execution model, all owner decisions resolved, school_operator schema finalized, out-of-scope corrected, test groups reordered, SQL review package and self-audit requirements added)
**Authoritative plan file:** `.cursor/plans/role_boundary_fix_plan_631834d8.plan.md` (this file)
**Reference doc (not authoritative):** `docs/auth/ROLE_PERSONA_ENTITLEMENT_SUBSCRIPTION_FOUNDATION_PLAN.md` — marked superseded; this `.cursor/plans` file is the single source of truth.

---

## EXECUTION MODEL

After the owner gives final approval of this plan, Cursor executes the approved implementation scope **end-to-end** without asking for repeated phase-by-phase approval.

Cursor stops only for:
1. **SQL execution** — Cursor prepares SQL migration files and a SQL review package, then waits. Owner reviews the package, runs SQL manually, confirms it succeeded, and Cursor continues.
2. **Newly discovered blocker or ambiguity** not covered by this plan — Cursor stops, reports the issue, and waits for owner decision before continuing.
3. **Any Hebrew copy** not already explicitly approved in this plan — Cursor stops and presents the placeholder text for owner approval.
4. **Any scope change** outside the approved plan — Cursor stops and waits for owner direction.

There is no commit, push, or deploy at any point during implementation.

---

## EXECUTION RULES — READ BEFORE ANYTHING ELSE

1. **No code is changed until the owner explicitly approves this plan by pressing the implementation button in Cursor. After approval, Cursor runs end-to-end per the Execution Model above.**
2. **SQL is prepared as migration files only. The owner runs SQL manually. Cursor must not execute SQL against Supabase.**
3. **Hebrew copy must not be changed. Any new Hebrew text required for new UI states must be listed as a placeholder in English and approved by the owner before implementation.**
4. **No commit, push, or deploy unless explicitly instructed by the owner.**
5. **When implementation is complete and approved, Cursor must prepare a ZIP of all changed/added files (see ZIP Deliverable section).**
6. **This `.cursor/plans` file is the authoritative implementation plan. The `docs/auth/` file is a superseded reference copy. If any conflict exists between the two, this file wins.**
7. **Existing login page visual design must be preserved. No broad redesign of parent or teacher login pages. All login page changes are additive and minimal only.**
8. **OAuth/social login buttons, teacher registration tab, and any other new login UI element must not be added unless the owner explicitly approves each addition separately.**

---

## Background — Why This Is Not an Emergency / Hotfix

The previous version of this plan used language like "Emergency server gates" and "lowest risk fastest." That framing was incorrect.

This site is **in active development with no real users yet.** There is no production emergency to patch. There is instead an opportunity to build the access control foundation correctly from the start, without technical debt.

The correct frame is:

> We are implementing the **permanent, production-grade access control architecture** that the product requires for launch and beyond — including multi-persona identity, explicit entitlements, subscription-ready plan limits, school credential authority rules, and admin-controlled approval workflows.

All phases are designed for correctness, clarity, and forward compatibility — not for speed.

---

## 1. Root Causes (from Audit)

| ID | Root Cause | Location |
|----|-----------|----------|
| RC-1 | Universal parent trigger creates `parent_profiles` for every auth user including teachers, admins, and school staff — profile row existence is not permission | `supabase/migrations/001_learning_core_foundation.sql` |
| RC-2 | All `/api/parent/**` routes call only `supabase.auth.getUser()` and treat any authenticated `user.id` as an authorized parent | `pages/api/parent/*.js` |
| RC-3 | No explicit parent entitlement, plan, account-status, or approval field exists in any table | Schema gap |
| RC-4 | `POST /api/teacher/students/create` and `link` check only `requireTeacherApiContext` which does not check school membership — school teachers can create private students | `pages/api/teacher/students/create.js`, `link.js` |
| RC-5 | `pages/api/teacher/worksheet-activities/index.js` calls `assertSchoolTeacherSubjectAllowed` which allows non-school teachers without checking `private_teacher_subjects` — inconsistent with other activity routes | `pages/api/teacher/worksheet-activities/index.js` |
| RC-6 | `pages/parent/login.js` redirects any valid Supabase session to `/parent/dashboard` without checking persona | `pages/parent/login.js` |
| RC-7 | No persona entitlement system exists — only `app_metadata.role` and profile row presence, neither of which is the same as an approved active entitlement | Architectural gap |
| RC-8 | No parent plan or account-status model exists — no basis for subscription gates, feature limits, or account suspension | Architectural gap |
| RC-9 | No explicit rule defines which persona may create, reset, or revoke school student login credentials and school guardian/parent access credentials | Policy gap |

---

## 2. Product Rules — Non-Negotiable

### A — Parent is not equal to any authenticated Supabase user

A user may access the parent dashboard, add children, use parent reports, or use Parent Copilot **only if** they have an explicit **active parent entitlement**. A Supabase session alone is not sufficient.

### B — Teacher is not parent by default

A private teacher, school teacher, school manager, or platform admin must not automatically receive parent capabilities. This is true regardless of whether a `parent_profiles` row exists for them.

### C — Current parent signup behavior and future-ready architecture

**Current owner decision (active now):**

Parent signup must remain similar to the current product experience:

- Parent signs up through the parent portal
- Parent completes the current policy/verification flow
- Parent receives active parent access automatically
- Default child limit is 3 children
- This is represented by:
  - `PARENT_SIGNUP_MODE = auto_active`
  - `account_persona_entitlements.persona = 'parent'`, `status = 'active'`
  - `parent_account_settings.max_children = 3`
  - `parent_account_settings.plan_code = 'free'`
  - `parent_account_settings.copilot_enabled = false` (free plan default)
  - `parent_account_settings.reports_enabled = true` (free plan default)

This keeps the current parent experience unchanged while preparing the infrastructure for future paid subscriptions, manual approval, suspensions, and plan-based limits.

**Future modes (not active now — architecture must support them):**

- `auto_active` — current default; signup immediately grants active parent entitlement
- `email_verified_only` — active entitlement only after email verification
- `pending_admin_approval` — signup creates pending entitlement; admin approves
- `payment_required` — entitlement activated only after subscription payment
- `suspended` — account temporarily deactivated by admin
- `cancelled` — account permanently deactivated

The owner may switch to `payment_required` or `pending_admin_approval` later without schema migration.

### D — School teacher is not private teacher by default

A school teacher must not create or manage private students, private classes, or private student links unless a future explicit dual-role design is approved and implemented deliberately.

### E — School email stays school-scoped by default

A school teacher using a school-assigned account should not accumulate private students.

### F — All persona permissions must be enforced server-side

UI hiding is not security. Any user who calls an API endpoint directly must be blocked with the same rules as one navigating via UI.

### G — Admin and school manager are separate scopes

A school manager may manage **within their school only.** A platform admin manages global platform permissions, plans, schools, role approvals, and all data. A school manager must not access admin APIs or global data.

### H — Future subscriptions must be supported by the account model now

The parent account model must support plan-based limits from the start. Fields must exist so plan-based access checks can be added without schema migration when payment is added.

### I — SQL is prepared only; owner runs manually

Cursor prepares SQL migration files. The owner reviews and runs them. Cursor must not execute any SQL against Supabase.

### J — Hebrew copy requires owner approval

Any new Hebrew user-facing text must be listed in English as a placeholder first. Exact Hebrew copy requires owner approval before implementation.

### K — Commit, push, and deploy are manual only

Cursor must not commit, push, or deploy unless the owner explicitly instructs it.

### L — ZIP deliverable at implementation completion

When implementation is approved and completed, Cursor must prepare a ZIP of all changed/added files (see ZIP Deliverable section).

### M — Existing login page design must be preserved

The current parent login page has login/register tabs, manual email/password/code fields, and a dark visual style. The current teacher login page has a login form with a similar dark visual style.

All login page changes must be additive only. Prohibited without explicit owner approval:
- Restructuring form layout
- Changing color scheme or visual design language
- Replacing existing form fields
- Adding OAuth buttons (see Rule N and Section 8a)
- Adding a teacher registration tab (see Rule N and Section 6)

### N — Parent signup and teacher signup are distinct processes with different default behaviors

**Parent signup:**
- May use `auto_active` in development
- Creates a parent entitlement immediately (if mode is `auto_active`)
- May later switch to `payment_required` or `pending_admin_approval`

**Teacher signup/request:**
- Must always start as `pending` — never `auto_active`
- Teacher self-registration creates a request, not an active account
- Admin must review and explicitly approve before any teacher entitlement becomes `active`
- Admin also grants: subject permissions, teacher limits, and role classification (private vs school)

**School teacher / school manager:**
- Must never be self-activated
- Must be created or approved through an admin or school admin process only

### O — School Manager is the sole authority for school student and school guardian credentials

For school context:

- **Only the School Manager** may create, reset, revoke, or manage school student login credentials and school guardian/parent access credentials.
- **Regular school teachers must not** be allowed to create, reset, revoke, or manage school student credentials or school guardian/parent access credentials.
- A regular school teacher may only access the students, classes, reports, and activities permitted by their school assignment and subject grants.

**Delegation to school_operator (implemented in this plan, after owner approval):**
The School Manager may delegate credential management to a `school_operator` / school secretary. This delegation is explicit (via `school_operator_grants`), stored, school-scoped, revocable, and audited (`school_operator_audit_log`). See Section 4.4b, Role/Permission Matrix, and Rule U for the full design.

### P — Platform Admin is the sole authority for private teacher quotas and subjects

Only the Platform Admin may:

- Approve a private teacher and activate their entitlement
- Set or change the private teacher's maximum number of private students
- Set or change the private teacher's maximum number of private classes/groups (if applicable)
- Grant or revoke enabled subjects for a private teacher (via `private_teacher_subjects`)
- Enable or disable teacher features/tools for a private teacher
- Suspend or reactivate a private teacher account

A private teacher must not be able to:
- Increase their own quota
- Add subjects to themselves
- Activate themselves
- Approve other teachers

School Managers must not manage private teacher quotas or subjects. Private teacher limits are a Platform Admin responsibility only.

### Q — Platform Admin is the sole authority for school-level quotas and school tools

Only the Platform Admin may:

- Approve and activate a school account
- Set the maximum number of school teachers (`max_school_teachers`) — does NOT include the School Manager
- Set the maximum number of school managers (`max_school_managers`) — currently always 1 per school
- Set the maximum number of school students (`max_school_students`)
- Set the maximum number of school operators/secretaries (`max_school_operators`)
- Enable or disable school tools, features, and modules for a school
- Set the school active/suspended status
- Assign the school's plan/package if applicable in the future

**Owner decision on school quotas — separate per role type:**
School quotas are **separate per role type**. The School Manager is NOT counted inside the teacher quota. Each role type has its own limit:

- `max_school_teachers` — teachers only (not including manager or operators)
- `max_school_managers` — currently 1 per school; Platform Admin controls this
- `max_school_students` — total school students
- `max_school_operators` — school operators/secretaries; separate from teachers

**Proposed schema change for `school_accounts`:**
The existing `max_teachers` field is ambiguous and must be replaced. Proposed migration adds:

```sql
-- PLAN ONLY — schema proposal, same as 043_school_accounts_separate_quotas.sql
alter table public.school_accounts
  add column if not exists max_school_teachers  integer not null default 20,
  add column if not exists max_school_managers  integer not null default 1,
  add column if not exists max_school_students  integer not null default 500,
  add column if not exists max_school_operators integer not null default 5;
-- Backfill: update public.school_accounts set max_school_teachers = coalesce(max_teachers, 20);
-- max_teachers is retained for backward compatibility; new code must not read it.
```

Default values are decided (see Section 4.4 and Section 17). `max_teachers` is retained for backward compatibility; all new code uses the separate quota fields only.

### R — Platform Admin → School Manager → School Staff is the normal management workflow

The Platform Admin sets the school's package and limits, and appoints the School Manager. After that, day-to-day school management is handled by the School Manager — not by the Platform Admin.

Normal workflow:

1. Platform Admin approves school, sets separate quotas (`max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`), enables tools/features, appoints School Manager
2. School Manager adds/invites school teachers within teacher quota; adds/invites school operators/secretaries within operator quota
3. School Manager assigns subjects to school teachers, connects teachers to classes/students, manages school student credentials and guardian/parent access
4. School Teachers teach and access data within their assigned scope
5. School Operators perform operational credential tasks within their granted scope

The Platform Admin retains global override/audit capability but does not need to individually manage every school teacher's subjects in the normal workflow.

School teacher subject assignment is owned by the School Manager in the school portal — not by the Platform Admin in the admin portal, except when directly overriding.

### S — School Manager may also function as a School Teacher in the same school

A School Manager who is assigned teaching subjects/classes within their own school may also function as a School Teacher. This is **explicitly allowed** and must not be broken by the entitlement system.

- This is not a forbidden dual role.
- The School Manager holds both `school_manager` and `school_teacher` entitlement for the same school.
- The school_teacher role within the same school grants teaching permissions (activities, classes, reports within assigned scope).
- The school_manager role grants credential management and school configuration permissions.
- These combine naturally within the same school scope.

**Still blocked by default:**
- `school_manager` + `private_teacher` — blocked; not the same as teaching in their own school
- `school_teacher` + `private_teacher` — blocked
- School staff account becoming a parent account automatically — blocked; parent entitlement requires separate explicit provisioning

### T — School Operator / Secretary is a defined planned persona (see updated full definition below in product rules)

The `school_operator` persona is now part of the planned architecture. It is not a vague future idea. Implementation happens after plan approval, but the design is defined here.

**Definition:**
School Operator (also called School Secretary) is a school-scoped operational staff role. Its primary purpose is to handle student registration, login credential management, and guardian/parent access management on behalf of the school — without receiving teaching or platform admin permissions.

**Planned persona name in `account_persona_entitlements`:** `school_operator`

**Key rules:**
- Created/invited by the School Manager within the `max_school_operators` quota set by Platform Admin
- Logs in through the teacher/staff login page (same entry as teachers and school manager — permissions are determined by entitlement and grants, not by which login page was used)
- School-scoped only — cannot access other schools
- Cannot self-activate or self-assign
- All actions must be audited
- Not implemented yet; implementation requires final plan approval

**Important — `school_operator` entitlement is role membership only:**
Having a `school_operator` entitlement row with `status = 'active'` means only: "This user is a staff/operator member of this school." It does not automatically grant any operational capability.

Actual capabilities come from explicit `school_operator_grants` records (see Section 4 — new table). A school operator with no grants cannot perform any operational action beyond logging in.

**Modular operator permission groups:**

The School Manager may grant any combination of these permission groups per operator:

- `student_access_admin` — operational student access/registration tasks:
  - Create/reset/revoke school student login credentials
  - Create/reset/revoke school guardian/parent access credentials
  - Update allowed student registration/profile fields (enrollment, class, grade, school assignment)
  - Create/enroll new school students within school policy

- `student_data_viewer` — view student information and reports:
  - View full student profile/details (name, class, grade, enrollment status, linked guardian status)
  - View guardian/parent access status and contact details (if part of school portal student profile data)
  - View school student reports within the school scope
  - View classroom/report data that the School Manager is authorized to see within this school

**Grants are modular — School Manager chooses per operator:**
- Secretary A: `student_access_admin = true`, `student_data_viewer = false` — manages credentials but cannot view reports
- Coordinator B: `student_access_admin = false`, `student_data_viewer = true` — views details/reports but cannot edit credentials
- Senior Secretary C: `student_access_admin = true`, `student_data_viewer = true` — full operational access

**What School Operator may NOT do regardless of grants:**
- Teach or create learning activities
- Receive subject permissions
- Assign subjects to teachers
- Access Platform Admin APIs
- Manage school quotas or school tools
- Approve teachers or manage private teacher accounts
- Change school plan/package or enabled tools/modules
- Access other schools

### U — School Manager may delegate school-scoped operator permissions as explicit modular grants

The School Manager controls day-to-day school operations within their school. As part of this, the School Manager may grant or revoke operational capability to school operators/secretaries.

**Delegation must be:**
- Explicit — no automatic capabilities from entitlement alone
- Per operator — each operator has their own grant record
- Per permission group — `student_access_admin` and `student_data_viewer` are separate grants
- School-scoped — grants apply only to the School Manager's own school
- Revocable — School Manager may revoke any granted permission at any time
- Audited — all grant and revoke actions are written to `school_operator_audit_log` with `actor_user_id`, `action_type`, and `created_at`; current state is stored in `school_operator_grants.updated_by` and `school_operator_grants.updated_at`

**What School Manager may delegate:**
- `student_access_admin` — operational credential/registration tasks (see Rule T)
- `student_data_viewer` — student information and report viewing (see Rule T)
- Either one permission alone, or both together

**What School Manager may NOT delegate to operators:**
- Platform Admin access
- Access to other schools
- Ability to change school quotas
- Ability to change school plan/package
- Ability to enable/disable school tools/modules granted by Platform Admin
- Ability to approve private teachers
- Ability to manage private teacher quotas or subjects
- Teaching or activity creation permissions
- Subject permissions
- Ability to assign subjects to teachers (unless a future separate permission is explicitly designed and owner-approved)

The School Manager's delegation authority is limited to school-scoped operational capabilities that belong to the School Manager's own school context. School Manager cannot delegate anything that Platform Admin has not already enabled for the school.

---

## 3. Role / Permission Matrix

This matrix is the authoritative reference for what each persona may and may not do.

### Platform Admin

| Capability | Allowed |
|-----------|---------|
| Create account | Created via Supabase Admin API with `app_metadata.role = 'admin'` + explicit admin entitlement |
| Approve own access | Self (seed/migration entitlement) |
| Suspend/revoke others | Yes — all personas |
| Approve private teachers | Yes — sole authority |
| Set private teacher quotas (max students, max classes) | Yes — sole authority (see Rule P) |
| Grant/revoke private teacher subjects | Yes — sole authority via `private_teacher_subjects` |
| Enable/disable private teacher features/tools | Yes — sole authority |
| Approve schools | Yes — sole authority |
| Set `max_school_teachers` (teachers only, not manager) | Yes — sole authority (see Rule Q) |
| Set `max_school_managers` (currently 1 per school) | Yes — sole authority (see Rule Q) |
| Set `max_school_students` | Yes — sole authority |
| Set `max_school_operators` (school operators/secretaries) | Yes — sole authority |
| Enable/disable school tools/features/modules | Yes — sole authority |
| Assign school managers | Yes — sole authority |
| Assign subjects to school teachers (normal workflow) | No — this is School Manager's responsibility. Admin retains override capability but does not do this in normal day-to-day workflow. |
| Manage parent plan/status | Yes — if needed |
| View/audit all reports | Yes — global |
| Create students | No (does not manage students directly) |
| Create/manage student login credentials | No (delegates to School Manager for school students) |
| Create/manage guardian/parent access credentials | No (delegates to School Manager for school students) |
| Admin UI focus areas | Schools, school manager assignment, school quotas, school tools/features, private teacher approvals/quotas/subjects, parent plan/status management, global audit/override |
| Access all portals | Admin portal only; cannot accidentally access parent/teacher portal without explicit separate entitlement |
| Explicitly blocked | Automatic parent/teacher capabilities without explicit entitlement; individual school teacher subject management in normal workflow (School Manager handles this) |

### Parent

| Capability | Allowed |
|-----------|---------|
| Create account | Self-signup via parent portal |
| Approve own access | Depends on `PARENT_SIGNUP_MODE` (see Section 5) |
| Suspend/revoke own account | No (admin only) |
| Assign subjects | No |
| Create students | Yes — own children only, within `max_children` limit |
| Create/manage student login credentials | Yes — own children only (private parent-managed students) |
| Create/manage school guardian credentials | No |
| View reports | Yes — own children only, if `reports_enabled` |
| Use Parent Copilot | Only if `copilot_enabled` |
| Manage plans/subscription | No (admin manages) |
| Access teacher/school/admin portals | No |
| Grant teacher/school permissions | No |

### Private Teacher

| Capability | Allowed |
|-----------|---------|
| Create account | Request form (future) or admin-created; always `pending` by default |
| Approve own access | No — Platform Admin must approve |
| Activate own entitlement | No — Platform Admin only |
| Increase own quota (max students/classes) | No — Platform Admin only |
| Add subjects to self | No — Platform Admin grants via `private_teacher_subjects` |
| Assign subjects to others | No |
| Approve other teachers | No |
| Suspend/revoke others | No |
| Create private students | Yes — if `private_teacher` entitlement is active and within `teacher_limits.max_students` |
| Create/manage private student login credentials | Yes — own private students only |
| Create private classes | Yes — within `teacher_limits.max_classes` if applicable |
| Create/manage school student credentials | No |
| Create/manage school guardian/parent credentials | No |
| View reports | Yes — own private students only |
| Access school management | No |
| Manage parent plans | No |
| Create school classes | No |
| Explicitly blocked | School student/class creation; school credential management; school management portal; self-quota changes; self-subject grants; approving other teachers |

### School Teacher

| Capability | Allowed |
|-----------|---------|
| Create account | Admin or school admin process; always `pending` by default |
| Approve own access | No — admin/school admin must approve |
| Suspend/revoke others | No |
| Assign subjects to self | No — school manager assigns via `school_teacher_subjects` |
| Assign subjects to others | No |
| Create private students | No |
| Create/manage private student login credentials | No |
| Create/manage school student login credentials | No — School Manager only |
| Create/manage school guardian/parent access credentials | No — School Manager only |
| Create/manage school students (enrollment) | No (can view/teach assigned students; school manager enrolls) |
| View reports | Yes — within assigned school scope only |
| Access school management portal | View only — within assigned scope |
| Access private teacher APIs | No |
| Access platform admin | No |
| Explicitly blocked | Private student/class creation; credential management of any student; school management actions; subject self-assignment |

### School Manager

| Capability | Allowed |
|-----------|---------|
| Create account | Platform Admin assigns; always `pending` until Platform Admin activates |
| Approve own access | No — Platform Admin only |
| Act as school teacher in same school | Yes — if assigned teaching subjects/classes within own school (see Rule S) |
| Manage school teachers day-to-day | Yes — within own school (this is the normal workflow per Rule R) |
| Add/invite school teachers | Yes — within `max_school_teachers` quota set by Platform Admin |
| Add/invite school operators/secretaries | Yes — within `max_school_operators` quota set by Platform Admin |
| Suspend/revoke school teachers | Within own school only |
| Assign subjects to school teachers | Yes — within own school |
| Connect teachers to school classes/students | Yes — within own school model |
| Create/enroll school students | Yes — within Platform Admin-set student quota for the school |
| Create/manage school student login credentials | Yes — own school students only |
| Create/manage school guardian/parent access credentials | Yes — own school students only |
| Grant operator `student_access_admin` permission | Yes — within own school; stored in `school_operator_grants` |
| Grant operator `student_data_viewer` permission | Yes — within own school; stored in `school_operator_grants` |
| Revoke operator permissions | Yes — any granted permission, at any time |
| Grant/revoke actions are audited | Yes — all grant/revoke logged with who did it and when |
| View reports | Yes — within own school |
| Manage school settings | Yes — within limits set by Platform Admin |
| Set `max_school_teachers` | No — Platform Admin only |
| Set `max_school_managers` | No — Platform Admin only |
| Set `max_school_students` | No — Platform Admin only |
| Set `max_school_operators` | No — Platform Admin only |
| Enable/disable school tools/features | No — Platform Admin enables; School Manager uses what is enabled |
| Access platform admin APIs | No — unless separately granted admin entitlement |
| Manage other schools | No |
| Approve private teachers globally | No |
| Manage private teacher quotas/subjects | No |
| Manage global parent subscription plans | No |
| Explicitly blocked | Platform admin APIs; cross-school access; global approvals; private teacher grants; school quota changes; enabling school tools not already granted by Platform Admin |

### School Operator / School Secretary (planned — implemented after plan approval)

Persona name in `account_persona_entitlements`: `school_operator`

**Critical design rule: `school_operator` entitlement = school membership only. All capabilities come from explicit `school_operator_grants` records (see Section 4 — new table). An operator with no grants can log in but cannot perform any operational action.**

| Capability | Condition |
|-----------|-----------|
| Create account | Invited by School Manager within `max_school_operators` quota set by Platform Admin |
| Approve own access | No — School Manager creates/activates |
| Login entry point | Teacher/staff login page (entitlement determines capabilities, not login page) |
| Scope | Own school only |
| Any operational capability without grants | No — entitlement alone grants nothing |
| Create/reset/revoke school student login credentials | Only if `student_access_admin = true` in `school_operator_grants` |
| Create/reset/revoke school guardian/parent access credentials | Only if `student_access_admin = true` in `school_operator_grants` |
| Update student registration/profile fields (enrollment, class, grade, school assignment) | Only if `student_access_admin = true` |
| Create/enroll school students | Only if `student_access_admin = true` |
| View full student profile/class/grade/enrollment/guardian status | Only if `student_data_viewer = true` in `school_operator_grants` |
| View school student reports | Only if `student_data_viewer = true` in `school_operator_grants` |
| View guardian/parent contact details (if part of school portal data) | Only if `student_data_viewer = true` |
| Teach or create activities | No — regardless of any grant |
| Receive subject permissions | No — regardless of any grant |
| Assign subjects to teachers | No — regardless of any grant |
| Access Platform Admin APIs | No — regardless of any grant |
| Manage school quotas or tools | No — regardless of any grant |
| Change school plan/package or enabled modules | No — regardless of any grant |
| Approve teachers or private teacher accounts | No — regardless of any grant |
| Access other schools | No — regardless of any grant |
| All actions audited | Yes — all credential, enrollment, and data-view actions must be logged |
| Self-assign or self-activate | No |
| Implementation status | Planned — implemented as part of this plan after owner approval |

### Student

| Capability | Allowed |
|-----------|---------|
| Authentication | Separate username/PIN flow — no Supabase auth |
| Access parent/teacher/admin portals | No |
| Manage permissions | No |
| Impact of this plan | None — student login system is completely separate and unaffected |

### Guardian / School Parent Access

| Capability | Allowed |
|-----------|---------|
| Account creation | Created/managed by School Manager only (currently) |
| Scope | Access only to the specific school student(s) assigned by School Manager |
| Parent dashboard features | Does not automatically grant parent subscription features (reports, copilot, etc.) |
| Relationship to private parent entitlement | None — school guardian access and full parent subscription are separate systems |
| Future upgrade path | If a school guardian also wants full private parent dashboard access, they must create a separate parent account with a parent entitlement |
| Impact of this plan | Guardian login flow is separate and unaffected |

---

## 4. Target Architecture

### 4.1 Overview

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
    +---> school_accounts               <- school tenant (existing)
```

Central principle: **`account_persona_entitlements` is the authorization source of truth. Profile tables are data. Existing tables are not replaced.**

### 4.2 New Table — `account_persona_entitlements`

```sql
-- PLAN ONLY — SQL prepared but not executed by Cursor
-- Migration: 040_account_persona_entitlements.sql

create table if not exists public.account_persona_entitlements (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  persona           text        not null check (persona in (
                                  'parent', 'private_teacher', 'school_teacher',
                                  'school_manager', 'school_operator', 'admin'
                                )),
  status            text        not null default 'pending' check (status in (
                                  'pending', 'active', 'suspended', 'rejected', 'revoked'
                                )),
  approval_source   text        not null check (approval_source in (
                                  'self_signup', 'admin', 'school_admin',
                                  'payment', 'migration', 'seed'
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
- At most one entitlement record per persona per user (unique on `user_id + persona`)
- Only `status = 'active'` grants API access for that persona
- `rejected`, `revoked`, and `suspended` all deny access
- `pending` denies access until explicitly approved

### 4.3 New Table — `parent_account_settings`

```sql
-- PLAN ONLY — SQL prepared but not executed by Cursor
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
  billing_provider          text        null,
  provider_customer_id      text        null,
  provider_subscription_id  text        null,
  trial_ends_at             timestamptz null,
  current_period_ends_at    timestamptz null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.parent_account_settings enable row level security;
-- RLS: authenticated user reads own row; service-role writes
```

**Key design decisions:**
- `max_children` replaces hardcoded constant in `pages/parent/dashboard.js` and `resolveParentStudentLimit` in `lib/parent-server/parent-student-limit.server.js` — after this table is live
- `copilot_enabled` starts `false` on free plan; requires upgrade or admin grant
- Payment fields are nullable and unused now; exist so no schema migration is needed when payment is added
- `account_status` on this table and `status` on `account_persona_entitlements` are both checked — both must be `active`

### 4.4 Existing Tables — Roles Redefined, Not Replaced

| Table | Role in new architecture |
|-------|--------------------------|
| `parent_profiles` | Profile data and display preferences only. Not authorization. Row existence does not grant permission. |
| `teacher_profiles` | Teacher identity. Not authorization by itself. Must be combined with active entitlement. |
| `teacher_limits` | Quota and feature flags for teacher persona. Remains authoritative for teacher-side limits. |
| `school_teacher_memberships` | School assignment and role within school. Works alongside `school_teacher` entitlement. |
| `private_teacher_subjects` | Subject grants for private teachers. Remains authoritative. |
| `school_teacher_subjects` | Subject grants for school teachers. Remains authoritative. |
| `school_accounts` | School tenant record. Existing `max_teachers` field is replaced by separate quota columns per role type — see schema proposal below. |

**School quota schema — planned migration (043_school_accounts_separate_quotas.sql):**

The existing `max_teachers` field is ambiguous and insufficient. It does not distinguish manager, teacher, student, and operator quotas. The planned schema replaces it with four separate quota columns.

**Decided defaults (no further confirmation required):**
- `max_school_teachers = 20`
- `max_school_managers = 1`
- `max_school_students = 500`
- `max_school_operators = 5`

**Decided migration approach (no further confirmation required):**
- `max_teachers` is backfilled into `max_school_teachers` during migration
- `max_teachers` is retained temporarily for backward compatibility only
- All new code uses only `max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`
- `max_teachers` may be dropped in a future cleanup migration once all references are confirmed removed; dropping it is not part of this plan's immediate scope

Migration adds these columns to `school_accounts`:

```sql
-- PLAN ONLY — part of migration 043_school_accounts_separate_quotas.sql
alter table public.school_accounts
  add column if not exists max_school_teachers  integer not null default 20,
  add column if not exists max_school_managers  integer not null default 1,
  add column if not exists max_school_students  integer not null default 500,
  add column if not exists max_school_operators integer not null default 5;
-- Backfill: update public.school_accounts set max_school_teachers = coalesce(max_teachers, 20);
-- max_teachers is retained for backward compatibility; new code must not read it
```

### 4.4b New Tables — `school_operator_grants` and `school_operator_audit_log`

**Design principle:** Two separate tables.

- `school_operator_grants` — current-state only (one row per operator per school; boolean flags for each permission)
- `school_operator_audit_log` — immutable append-only history of every grant, revoke, and operational action

This avoids the `revoked_at` confusion where partial permission revokes would leave the row in an ambiguous state.

#### Table 1 — `school_operator_grants` (current permission state)

```sql
-- PLAN ONLY — SQL prepared but not executed by Cursor
-- Migration: 044_school_operator_grants.sql

create table if not exists public.school_operator_grants (
  school_id             uuid        not null references public.school_accounts(id) on delete cascade,
  operator_user_id      uuid        not null references auth.users(id) on delete cascade,
  student_access_admin  boolean     not null default false,
  student_data_viewer   boolean     not null default false,
  updated_by            uuid        null references auth.users(id) on delete set null,
  updated_at            timestamptz not null default now(),
  primary key (school_id, operator_user_id)
);

create index if not exists sog_operator_idx on public.school_operator_grants (operator_user_id);
alter table public.school_operator_grants enable row level security;
-- RLS: service-role only for writes; school manager reads own school; operator reads own row
```

**Design rules:**
- One row per operator per school (composite primary key — no ambiguous revoked_at)
- `student_access_admin = false` and `student_data_viewer = false` by default on creation
- School Manager updates the boolean flags: `true` to grant, `false` to revoke
- `updated_by` stores the School Manager's user_id for the most recent change
- `updated_at` records when the most recent change happened
- Full audit history is in `school_operator_audit_log`, not in this table

#### Table 2 — `school_operator_audit_log` (immutable action history)

```sql
-- PLAN ONLY — SQL prepared but not executed by Cursor
-- Migration: 045_school_operator_audit_log.sql

create table if not exists public.school_operator_audit_log (
  id              uuid        primary key default gen_random_uuid(),
  school_id       uuid        not null references public.school_accounts(id) on delete cascade,
  actor_user_id   uuid        null references auth.users(id) on delete set null,
  target_user_id  uuid        null references auth.users(id) on delete set null,
  target_student_id uuid      null,
  action_type     text        not null check (action_type in (
                                'grant_student_access_admin',
                                'revoke_student_access_admin',
                                'grant_student_data_viewer',
                                'revoke_student_data_viewer',
                                'credential_create',
                                'credential_reset',
                                'credential_revoke',
                                'guardian_credential_create',
                                'guardian_credential_reset',
                                'guardian_credential_revoke',
                                'student_enroll',
                                'student_update',
                                'report_view'
                              )),
  metadata        jsonb       null,
  created_at      timestamptz not null default now()
);

create index if not exists soal_school_idx on public.school_operator_audit_log (school_id);
create index if not exists soal_actor_idx  on public.school_operator_audit_log (actor_user_id);
create index if not exists soal_action_idx on public.school_operator_audit_log (action_type);
alter table public.school_operator_audit_log enable row level security;
-- RLS: service-role inserts; school manager reads own school; no deletes
```

**Audit log rules:**
- Every grant/revoke action by School Manager inserts a row with `action_type` = `grant_*` or `revoke_*`
- Every credential/enrollment/report action by a school operator inserts a row
- `actor_user_id` = who performed the action (manager or operator)
- `target_user_id` = who was affected (operator being granted, or school user whose credential was changed)
- `target_student_id` = student affected (for credential/enrollment/report actions)
- `metadata` = JSON for any additional context (e.g. which field was changed)
- Rows are never deleted — append-only

**How the three authorization layers work together for school operators:**

```
1. auth.users                         ← who is the user? (authentication)
2. account_persona_entitlements       ← are they a school_operator in this school? (role membership)
3. school_operator_grants             ← what can they currently do? (current permission state)
4. school_operator_audit_log          ← full history of all changes and actions (audit trail)
```

Layers 1–3 must all pass for an operator to perform any operational action. Layer 4 is written to on every action.

### 4.4c School Operator Membership Storage

The `requireSchoolOperatorApiContext` guard must confirm that a school operator belongs to the specific school being accessed. A storage record defining school membership is required.

**Phase 0 investigation required:**
Inspect the current `school_teacher_memberships` table schema and determine whether it can cleanly accommodate a `school_operator` role value.

**Option A (extend existing table — preferred if schema is clean):**
Add `school_operator` as an allowed `role` value in `school_teacher_memberships`. This table would then serve as the general school staff membership table for all non-admin school users:

```sql
-- PLAN ONLY — extend existing check constraint if Option A is chosen
-- alter table public.school_teacher_memberships
--   drop constraint school_teacher_memberships_role_check;
-- alter table public.school_teacher_memberships
--   add constraint school_teacher_memberships_role_check
--   check (role in ('teacher', 'school_admin', 'school_operator'));
```

Rename consideration: if `school_teacher_memberships` is extended, its name becomes misleading. Owner may choose to rename it to `school_staff_memberships` or leave as-is with documentation.

**Option B (new table — if Option A is not clean):**
Create a new `school_staff_memberships` table:

```sql
-- PLAN ONLY — only if Option B is chosen
create table if not exists public.school_staff_memberships (
  school_id   uuid not null references public.school_accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  staff_role  text not null check (staff_role in ('school_teacher', 'school_manager', 'school_operator')),
  status      text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  created_by  uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (school_id, user_id, staff_role)
);
```

**Decision timeline:**
Phase 0 inspects the existing schema and recommends Option A or Option B. The plan body must be updated with the confirmed choice before Phase 1 SQL is written. The guard `requireSchoolOperatorApiContext` queries whichever table is chosen.

### 4.5 Parent Profile Trigger — Redefined Role

The trigger `on_auth_user_created_parent_profile` currently creates a `parent_profiles` row for every auth user.

**Final decision: Option A is selected.**

The trigger continues creating `parent_profiles` rows for all auth users. Because `account_persona_entitlements` is the sole authorization source of truth, the row being present for a non-parent user is harmless — it has no security meaning. Guards check entitlements, not profile row existence.

No trigger migration is required. The trigger file `supabase/migrations/001_learning_core_foundation.sql` is not modified by this plan.

If Phase 0 discovers a real blocker with this approach (e.g. the `parent_profiles` row being used elsewhere for authorization in a way that cannot be overridden by guards), Cursor stops and reports the issue before proceeding.

### 4.6 Dual-Role Policy

| Combination | Default policy | Notes |
|-------------|----------------|-------|
| `school_manager` + `school_teacher` (same school) | **ALLOWED — explicitly permitted** | School Manager may be assigned teaching subjects/classes within the same school. See Rule S. |
| `school_manager` + `school_operator` (same school) | **ALLOWED — explicitly permitted** | School Manager may also hold school_operator entitlement in the same school for operational tasks. Does not grant extra cross-school capabilities. |
| `parent` + `private_teacher` | Blocked | Allowed only with explicit admin approval stored in entitlements |
| `parent` + `school_teacher` | Blocked | Not supported without explicit design decision |
| `parent` + `school_manager` | Blocked | School staff accounts must not automatically become parent accounts |
| `parent` + `school_operator` | Blocked | School staff accounts must not automatically become parent accounts |
| `school_teacher` + `private_teacher` | Blocked — server-side enforced | Not supported |
| `school_teacher` + `school_operator` | Blocked by default | School teacher cannot also be an operator unless explicitly designed and approved |
| `school_operator` + `private_teacher` | Blocked | Not supported |
| `school_manager` + `private_teacher` | Blocked — server-side enforced | Private teacher is a separate persona |
| `admin` + `parent` | Blocked unless QA/test seed entitlement exists | Test accounts may have explicit seed entitlement |
| `admin` + `private_teacher` | Blocked | Not supported |

**Important distinction for school_manager + school_teacher:**
This is allowed because both personas operate within the same school scope. The School Manager does not gain any cross-school or private teacher capabilities by also being a school teacher. The `requireSchoolTeacherApiContext` guard must correctly recognize School Manager users who also hold a `school_teacher` entitlement for their school.

Any other dual-role allowance must be explicitly defined, stored as a separate entitlement row with `approval_source = 'admin'`, and tested with specific test cases. Never automatic.

---

## 5. Server Guard Architecture

### 5.1 Central Guard File (new)

File: `lib/auth/persona-guard.server.js`

```
// PLAN ONLY — pseudocode structure

export async function requirePersonaApiContext(res, authHeader, requiredPersona, options = {}) {
  // 1. Verify bearer token -> get Supabase user
  // 2. Query account_persona_entitlements where user_id = user.id and persona = requiredPersona
  // 3. If no row -> 403 not_a_<persona>
  // 4. If status != 'active' -> 403 with specific code (pending/suspended/rejected/revoked)
  // 5. For parent: additionally check parent_account_settings
  //    - account_status must be 'active'
  //    - if options.requireFeature: check that feature flag is true on settings row
  // 6. Return context object with user, entitlement, and settings
}

export async function requireParentApiContext(res, authHeader, options = {}) {
  return requirePersonaApiContext(res, authHeader, 'parent', options);
}

export async function requirePrivateTeacherApiContext(res, authHeader) {
  // Check 'private_teacher' entitlement status='active'
  // Block if school_teacher or school_manager entitlement is also active (no implicit dual)
}

export async function requireSchoolTeacherApiContext(res, authHeader) {
  // Check 'school_teacher' entitlement status='active'
  // Check school_teacher_memberships exists and active
}

export async function requireSchoolOperatorApiContext(res, authHeader, schoolId, options = {}) {
  // 1. Verify bearer token -> get Supabase user
  // 2. Check account_persona_entitlements: persona='school_operator', status='active'
  //    -> if no active entitlement: 403 not_a_school_operator
  // 3. Check school membership: operator must belong to schoolId
  //    (query school_teacher_memberships or school_staff_memberships per Phase 0 decision)
  //    -> if not member of this school: 403 wrong_school
  // 4. Query school_operator_grants where school_id = schoolId AND operator_user_id = user.id
  //    -> if no row: 403 operator_no_grants
  // 5. If options.requireGrant = 'student_access_admin':
  //    check grants.student_access_admin = true; else 403 operator_grant_required
  // 6. If options.requireGrant = 'student_data_viewer':
  //    check grants.student_data_viewer = true; else 403 operator_grant_required
  // 7. Return context object with { user, entitlement, grants }
  // Note: grant/revoke history is in school_operator_audit_log only; no revoked_at on grants row
}

// Usage examples (plan only):
// Credential APIs:
//   requireSchoolOperatorApiContext(res, authHeader, schoolId, { requireGrant: 'student_access_admin' })
// Student detail/report APIs:
//   requireSchoolOperatorApiContext(res, authHeader, schoolId, { requireGrant: 'student_data_viewer' })
// A School Manager calling these same APIs uses requireSchoolManagerApiContext instead
// and does not need operator grants — School Manager already has full school-management scope.

// requireSchoolManagerApiContext: update existing in lib/school-server/school-request.server.js
// requireAdminApiContext: update existing in lib/admin-server/admin-request.server.js
```

### 5.2 Parent API Route Guard Map

| Route | Guard |
|-------|-------|
| `GET /api/parent/list-students` | `requireParentApiContext` |
| `POST /api/parent/create-student` | `requireParentApiContext` + `max_children` check from `parent_account_settings` |
| `POST /api/parent/update-student` | `requireParentApiContext` |
| `POST /api/parent/delete-student` | `requireParentApiContext` |
| `POST /api/parent/create-student-access-code` | `requireParentApiContext` |
| `GET /api/parent/students/[studentId]/report-data` | `requireParentApiContext({ requireFeature: 'reports_enabled' })` |
| `POST /api/parent/copilot-turn` | `requireParentApiContext({ requireFeature: 'copilot_enabled' })` |
| `GET /api/parent/mini-report` | `requireParentApiContext({ requireFeature: 'reports_enabled' })` |
| `POST /api/parent/teacher-consent/issue` | `requireParentApiContext` |
| `POST /api/parent/teacher-consent/revoke` | `requireParentApiContext` |
| `POST /api/parent/policy-acceptance/accept` | Callable during signup — see Section 6 for decision |
| `GET /api/parent/policy-acceptance/status` | Same — see Section 6 |

### 5.3 Private Teacher Routes That Must Block School Teachers

New helper: `lib/teacher-server/private-teacher-guard.server.js`

```
// PLAN ONLY
export async function rejectIfSchoolTeacher(res, serviceRole, teacherId) {
  const membership = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (membership.ok && membership.membership) {
    res.status(403).json({ code: 'school_teacher_no_private_access' });
    return true;
  }
  return false;
}
```

Apply to: `POST /api/teacher/students/create`, `POST /api/teacher/students/link`,
`POST /api/teacher/classes` (POST handler), `POST /api/teacher/classes/[classId]/members` (POST handler).

Also fix: `POST /api/teacher/worksheet-activities` — call `assertActivitySubjectAllowed` instead of `assertSchoolTeacherSubjectAllowed`.

### 5.4 Existing Guards — Updates Required

| Existing helper | File | Update |
|-----------------|------|--------|
| `resolveAuthenticatedTeacherUserId` | `lib/teacher-server/teacher-session.server.js` | Add entitlement check for `private_teacher` or `school_teacher` |
| `requireSchoolManagerApiContext` | `lib/school-server/school-request.server.js` | Add entitlement check for `school_manager` |
| `requireAdminApiContext` | `lib/admin-server/admin-request.server.js` | Add entitlement check for `admin` |

---

## 6. Parent Signup, Entitlement Provisioning, and Policy Modal

### 6.1 Current Flow (preserved as auth, redefined as entitlement)

Current: user signs up via `pages/parent/login.js` → `supabase.auth.signUp` → DB trigger creates `parent_profiles` → redirect to `/parent/dashboard`.

New interpretation:
- Authentication (Supabase signUp) creates the auth identity
- Entitlement provisioning happens as a separate step
- `parent_profiles` row is data, not permission

### 6.2 Parent Signup Mode — Final Owner Decisions

**Decided. No further confirmation required:**

- `PARENT_SIGNUP_MODE = auto_active` — parent receives active parent entitlement immediately on signup/policy acceptance
- `parent_account_settings.plan_code = 'free'` (default)
- `parent_account_settings.max_children = 3` (default)
- `parent_account_settings.reports_enabled = true` (default)
- `parent_account_settings.copilot_enabled = false` (default; requires plan upgrade or admin grant)

**Entitlement provisioning trigger point (decided):**
Parent entitlement and `parent_account_settings` are provisioned after successful signup + policy acceptance. The `POST /api/parent/policy-acceptance/accept` route triggers entitlement provisioning if no active parent entitlement exists yet for the user.

This is the recommended implementation-safe flow:
1. `supabase.auth.signUp` → creates auth user
2. DB trigger creates `parent_profiles` row (Option A — kept as-is, harmless)
3. Parent completes policy acceptance flow → `POST /api/parent/policy-acceptance/accept`
4. This route inserts `account_persona_entitlements (persona=parent, status=active, approval_source=self_signup)` if not exists
5. This route inserts `parent_account_settings` with plan defaults if not exists
6. Parent redirected to dashboard

If the policy modal repeat bug is caused by this provisioning flow (confirmed in Phase 0), the fix is applied in Phase 2 as part of this plan. If it is an unrelated UI bug, it is deferred and documented separately.

### 6.3 Policy Modal Repeat Behavior — Phase 0 Discovery Item

Observed: when a regular parent clicks register, the policy/terms modal opens. After clicking continue, the modal appears again.

**Rule:** No policy modal behavior changes until Phase 0 confirms whether this is:
- (a) caused by an issue in the policy acceptance/entitlement provisioning flow → fix belongs in Phase 2
- (b) a standalone UI/state bug → deferred to a separate bugfix

The `POST /api/parent/policy-acceptance/accept` route should trigger entitlement and settings provisioning if they do not yet exist for the user — but the exact trigger point and the modal bug relationship must be confirmed first.

### 6.4 Development Backfill SQL

```sql
-- PLAN ONLY — backfill for development; owner runs manually after reviewing

-- Step 1: Active parent entitlements for all parent_profiles without teacher_profiles
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT pp.id, 'parent', 'active', 'migration', now()
FROM public.parent_profiles pp
LEFT JOIN public.teacher_profiles tp ON tp.id = pp.id
WHERE tp.id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 2: Active private_teacher entitlements for teachers without school membership
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT tp.id, 'private_teacher', 'active', 'migration', now()
FROM public.teacher_profiles tp
LEFT JOIN public.school_teacher_memberships stm ON stm.teacher_id = tp.id
WHERE stm.teacher_id IS NULL
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 3: Active school_teacher entitlements
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_teacher', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'teacher'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 4: Active school_manager entitlements
INSERT INTO public.account_persona_entitlements
  (user_id, persona, status, approval_source, approved_at)
SELECT stm.teacher_id, 'school_manager', 'active', 'migration', now()
FROM public.school_teacher_memberships stm
WHERE stm.role = 'school_admin'
ON CONFLICT (user_id, persona) DO NOTHING;

-- Step 5: Admin entitlements — owner must identify admin UUIDs manually:
-- INSERT INTO public.account_persona_entitlements
--   (user_id, persona, status, approval_source, approved_at)
-- VALUES ('<admin-uuid>', 'admin', 'active', 'seed', now());
```

**Pre-migration audit queries (owner runs before backfill):**

```sql
-- How many parent_profiles exist?
SELECT count(*) FROM public.parent_profiles;

-- parent_profiles that also have teacher_profiles (dual-role)?
SELECT count(*) FROM public.parent_profiles pp
JOIN public.teacher_profiles tp ON tp.id = pp.id;

-- parent_profiles with parent-owned students?
SELECT count(DISTINCT parent_id) FROM public.students;

-- School memberships by role:
SELECT role, count(*) FROM public.school_teacher_memberships GROUP BY role;
```

---

## 7. Teacher Registration — Future Architecture (Not Implemented Now)

### Critical rule — teacher registration is always pending by default

Unlike parent signup (which may be `auto_active`), teacher registration must **never** auto-create an active teacher entitlement. There is no `TEACHER_SIGNUP_MODE`. The teacher approval requirement is not configurable.

All teacher types start as `pending`:
- `private_teacher` — pending until admin approves, grants subjects, sets limits
- `school_teacher` — pending until admin or school admin assigns to a school
- `school_manager` — pending until platform admin approves school assignment

### Desired future UI

When approved, teacher self-registration should be added as a new tab on the existing teacher login page, matching the same dark visual design language and tab structure as the parent login/register tabs. The tab must not be added before the backend approval flow is implemented. Not added in Phase 3.

### Desired flow (future — not approved yet):

1. Teacher visits teacher login page, clicks registration/request tab
2. Submits: name, email, subjects requested, brief description
3. System inserts `account_persona_entitlements` row: `status = 'pending'`, `persona = 'private_teacher'`, `approval_source = 'self_signup'`
4. Platform admin reviews
5. Admin approves: `status = 'active'`, grants `private_teacher_subjects`, sets `teacher_limits`
6. Admin rejects: `status = 'rejected'`, stores reason
7. Teacher receives confirmation (Hebrew copy requires owner approval)

**Implementation:** Not approved. Separate plan document required. Covered in Phase 6.

---

## 8. School Registration — Future Architecture (Not Implemented Now)

### Desired flow (future — not approved yet):

1. School administrator submits a registration request
2. System creates pending `school_accounts` record and pending `school_manager` entitlement
3. Platform admin reviews and approves
4. Admin configures school limits using the new separate quota fields: `max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`; enables tools/features/modules
5. School manager account activated
6. School manager manages school staff and students within the Platform Admin-set quotas

**School quota model for this approved plan:**
The quota fields used in this plan's implementation are `max_school_teachers`, `max_school_managers`, `max_school_students`, and `max_school_operators` — introduced by migration `043_school_accounts_separate_quotas.sql`. The legacy `max_teachers` field is retained for backward compatibility only and must not be used by any new code in this plan.

**Implementation of public school registration:** Not approved. Separate plan required.

---

## 8a. OAuth / Social Login — Future Optional Layer (Not Implemented Now)

### Critical rule — OAuth is authentication only, never authorization

After any OAuth login (Google, Microsoft, or other provider), the server must still check:
- Active entitlement for the requested persona
- `account_persona_entitlements.status = 'active'`
- `parent_account_settings.account_status = 'active'` (parent flows)
- Plan/feature flags where applicable
- Teacher/school subject permissions where applicable

OAuth does not bypass the entitlement system.

### Desired future providers

- Google (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- Microsoft (`supabase.auth.signInWithOAuth({ provider: 'azure' })`)
- Apple (possible later — requires Apple developer enrollment)
- Facebook: not required
- Manual email/password login must be kept alongside OAuth — OAuth is additive, not a replacement

### UI approach (when eventually approved)

OAuth buttons added below/above existing email/password form, maintaining the existing dark visual design language. No new page, no layout change to tab structure. Hebrew labels for OAuth buttons require owner approval.

### Post-OAuth entitlement check flow (when implemented)

```
OAuth callback -> Supabase session established
  -> check account_persona_entitlements for persona
  -> if active parent entitlement: redirect to /parent/dashboard
  -> if active teacher entitlement: redirect to /teacher/dashboard
  -> if no active entitlement: show access-pending or register state
  -> if teacher entitlement is pending: show "your request is under review"
```

**Implementation:** Not approved. Not part of this plan's implementation scope. Requires separate owner decision and separate implementation plan covering provider credentials, callback pages, and Hebrew UX copy approval.

---

## 8b. Portal Entry Rules

This section defines which personas enter through which login page. Entering through the same page does not grant the same permissions — permissions are determined entirely by server-side entitlement checks.

### Teacher / Staff Entry (existing teacher login page)

The following personas log in through the existing teacher/staff login page (`/teacher/login` or equivalent):

- Private Teacher
- School Teacher
- School Manager
- School Operator / Secretary

**Rule:** The login page is shared for operational convenience. A user who logs in through the teacher page receives only the capabilities granted by their active `account_persona_entitlements` record. A School Operator who logs in through the teacher page does not receive teacher or manager capabilities — they receive only `school_operator` capabilities.

### Parent / Guardian Entry (existing parent login page)

The following contexts log in through the parent login page (`/parent/login` or equivalent):

- Private Parent account (full parent subscription)
- School Guardian / School Parent access (created by School Manager)
- Private-teacher Guardian / Parent access, if such flow exists in the future

**Rule:** These are not automatically the same entitlement. Entering through the parent login page does not grant a full parent subscription. A school guardian enters through the parent page but has only the access allowed by their school guardian record — they do not receive `parent` entitlement features (reports, copilot, max children) unless a separate active `parent` entitlement and `parent_account_settings` row exist.

### Student Entry (student login page)

The following enter through the student login page / student entry flow:

- Student created by a private parent
- Student under a private teacher
- Student under a school

**Rule:** Student login is a completely separate username/PIN flow. Students do not use Supabase email/password auth. The student login system is unaffected by this plan. Entering through the student page grants only student-level access to their own learning session.

### Summary Table

| Persona | Entry point | Notes |
|---------|------------|-------|
| Private Teacher | Teacher/staff login page | Permissions from `private_teacher` entitlement |
| School Teacher | Teacher/staff login page | Permissions from `school_teacher` entitlement + school membership |
| School Manager | Teacher/staff login page | Permissions from `school_manager` entitlement + school membership |
| School Operator | Teacher/staff login page | Permissions from `school_operator` entitlement + school membership |
| Private Parent | Parent login page | Permissions from `parent` entitlement + `parent_account_settings` |
| School Guardian | Parent login page | Permissions from school guardian record only — not full parent entitlement |
| Student (any context) | Student login | Separate PIN flow — no Supabase auth |

---

## 9. Password Reset — Deferred

Password reset is not implemented for any Supabase email persona.

### Future requirements (separate plan, not implemented now):

- Forgot-password link on `/parent/login`
- Forgot-password link on `/teacher/login`
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- Reset callback page at `/auth/reset-password` or equivalent
- Handler reads recovery token → calls `supabase.auth.updateUser({ password })`
- Persona-aware post-reset redirect
- Supabase email templates and redirect allowlist configured in Supabase dashboard
- Hebrew copy for all UI states requires owner approval

---

## 10. SQL Migration Policy

Every migration file prepared as part of this plan must include:

1. **Purpose** — one-sentence description
2. **Forward SQL** — the actual SQL statements
3. **Safety notes** — conditions that must be true before applying
4. **Backfill explanation** — what existing data is affected
5. **Expected affected rows** — how many rows are expected
6. **Verification query** — SQL the owner runs after applying to confirm success
7. **Rollback notes** — how to revert if something is wrong
8. **Staging/local test instructions** — if applicable

Migration files in `supabase/migrations/` with sequential numbering (040+).

**Execution rule:** Cursor prepares the file. Owner reviews it. Owner runs it manually against Supabase. Cursor confirms nothing was executed automatically.

---

## 11. Implementation Phases

### Phase 0 — Discovery and Inventory Confirmation

**Goal:** Confirm all current state before any code is written.

**Tasks:**
- List all routes under `pages/api/parent/`, `pages/api/teacher/`, `pages/api/school/`, `pages/api/admin/`
- Confirm all parent API routes and their current auth pattern
- Confirm current behavior of `parent_profiles` trigger
- Identify QA/test accounts (admin, QA parent with elevated child allowlist, etc.)
- Run pre-migration audit queries (Section 6.4) and document results
- Inspect `school_teacher_memberships` schema and decide: Option A (add `school_operator` role value) or Option B (new `school_staff_memberships` table). Update Section 4.4c with the chosen option before Phase 1 SQL is written.
- **Inspect and document the parent registration policy modal repeat behavior** — determine if it is (a) auth/entitlement-flow-related or (b) a standalone UI bug. No modal changes until cause is confirmed.

**Decided in advance (no confirmation needed in Phase 0):**
- `PARENT_SIGNUP_MODE = auto_active`
- Trigger: Option A selected — keep trigger, make harmless (see Section 4.5)
- Entitlement provisioning: after policy acceptance (`POST /api/parent/policy-acceptance/accept`)

**No code changes. No SQL. Report findings before Phase 1 SQL is written.**

---

### Phase 1 — Foundational Entitlement Schema and Account Model

**Goal:** Prepare all SQL migration files. Do not run any of them. Provide SQL review package before any SQL is executed.

**All migration files to prepare (in order):**

- **`040_account_persona_entitlements.sql`** — `account_persona_entitlements` table including `school_operator` in persona check constraint; indexes; RLS
- **`041_parent_account_settings.sql`** — `parent_account_settings` table; indexes; RLS; defaults: `plan_code='free'`, `max_children=3`, `reports_enabled=true`, `copilot_enabled=false`
- **`042_backfill_entitlements_dev.sql`** — backfill active entitlements for existing `parent`, `private_teacher`, `school_teacher`, `school_manager`, `admin` accounts; create default `parent_account_settings` rows for existing parents
- **`043_school_accounts_separate_quotas.sql`** — add `max_school_teachers(20)`, `max_school_managers(1)`, `max_school_students(500)`, `max_school_operators(5)` to `school_accounts`; backfill `max_school_teachers = coalesce(max_teachers, 20)`; retain `max_teachers` for backward compatibility
- **`044_school_operator_grants.sql`** — `school_operator_grants` current-state table with composite primary key `(school_id, operator_user_id)`; boolean flags `student_access_admin=false`, `student_data_viewer=false`; `updated_by`, `updated_at`; indexes; RLS
- **`045_school_operator_audit_log.sql`** — `school_operator_audit_log` append-only table; indexes; RLS (no deletes)
- **`046_school_staff_memberships.sql`** — **only if Phase 0 chose Option B** (new `school_staff_memberships` table). If Phase 0 chose Option A, prepare a constraint migration for `school_teacher_memberships` instead to add `school_operator` as a valid role value.

**Each migration file must include:**
Purpose, forward SQL, safety notes, backfill explanation, expected affected rows, verification query, rollback notes.

**Before owner runs any SQL:**
Cursor produces the SQL review package (Section 13.1) — list of all files, purpose, file paths, expected affected rows, pre-migration audit queries, verification queries, rollback notes, data-loss risk assessment. Owner reviews the package, runs each migration manually, confirms success. Cursor continues after owner confirmation.

**No application code changes in Phase 1. SQL files prepared only.**

---

### Phase 2 — Server-Side Persona Guards

**Goal:** Add `lib/auth/persona-guard.server.js` and update all affected API routes.

**Dependencies:** Phase 1 SQL must be applied before Phase 2 is deployed.

**Tasks:**

**2a. New shared guard file**
Create `lib/auth/persona-guard.server.js` with `requirePersonaApiContext`, `requireParentApiContext`, `requirePrivateTeacherApiContext`.

**2b. Update all parent API routes**
Update all `pages/api/parent/*` routes to call `requireParentApiContext`. See Section 5.2 for full route map and feature options.

Note on policy acceptance routes: `accept.js` and `status.js` must be callable during the parent signup flow before the entitlement row exists. These routes are exempt from `requireParentApiContext` — they are the provisioning point for the entitlement. If Phase 0 determined the policy modal repeat bug is entitlement-related, the fix is scoped and applied here.

**2c. Add `rejectIfSchoolTeacher` helper**
Create `lib/teacher-server/private-teacher-guard.server.js`. Apply to student/class creation routes (Section 5.3).

**2d. Fix worksheet subject gate**
Change `pages/api/teacher/worksheet-activities/index.js` to call `assertActivitySubjectAllowed` instead of `assertSchoolTeacherSubjectAllowed`.

**2e. Update existing guards**
Update `resolveAuthenticatedTeacherUserId`, `requireSchoolManagerApiContext`, `requireAdminApiContext` to also check `account_persona_entitlements` (Section 5.4).

**2f. Update `max_children` usage**
Replace hardcoded limit in create-student and list-students with a lookup from `parent_account_settings.max_children`. Update `resolveParentStudentLimit` in `lib/parent-server/parent-student-limit.server.js`.

**2g. Add `requireSchoolOperatorApiContext` guard**
Add to `lib/auth/persona-guard.server.js`. Checks: active `school_operator` entitlement → correct school membership (per Phase 0 storage decision) → `school_operator_grants` row exists → required boolean grant is `true`. No `revoked_at` check — only current boolean state. See Section 5.1 pseudocode.

**2h. School operator invite/create API**
New API endpoint under School Manager scope (e.g. `POST /api/school/[schoolId]/operators/invite`). Enforces `max_school_operators` quota. On successful invite: creates `account_persona_entitlements` row (`persona=school_operator, status=active`), creates school membership record (per Phase 0 storage decision), creates `school_operator_grants` row with `student_access_admin=false, student_data_viewer=false`.

**2i. School operator grant/revoke APIs**
New School Manager APIs:
- `PATCH /api/school/[schoolId]/operators/[operatorId]/grants` — School Manager sets `student_access_admin` and/or `student_data_viewer` boolean flags; updates `school_operator_grants.updated_by` and `updated_at`; writes action rows to `school_operator_audit_log`

**2j. Credential APIs: check `student_access_admin`**
All school credential management APIs (create/reset/revoke school student login credentials, create/reset/revoke school guardian/parent access credentials) must check `school_operator_grants.student_access_admin = true` when called by a `school_operator` bearer. Every action writes to `school_operator_audit_log`.

**2k. Student detail/report APIs: check `student_data_viewer`**
All school student detail and report APIs (view student profile, class/grade, guardian status, school reports) must check `school_operator_grants.student_data_viewer = true` when called by a `school_operator` bearer. Every access writes to `school_operator_audit_log`.

**2l. School quota enforcement**
All school staff-invite and student-enroll APIs must enforce the separate quota fields:
- `max_school_teachers` — checked on teacher invite; returns `400 school_teacher_quota_exceeded` if full
- `max_school_managers = 1` — checked on manager assign; returns `400 school_manager_quota_exceeded` if already has a manager
- `max_school_students` — checked on student enroll; returns `400 school_student_quota_exceeded` if full
- `max_school_operators` — checked on operator invite; returns `400 school_operator_quota_exceeded` if full
- All quota checks read from the new separate fields (`max_school_teachers`, not legacy `max_teachers`)
- School Manager cannot exceed any quota; returns appropriate 400 errors

---

### Phase 3 — UI Routing and Session Boundary Cleanup

**Goal:** Parent login and teacher login pages should not silently cross-persona redirect.

**Dependencies:** Phase 2 must be complete. Phase 3 is UI-only — security is enforced by API guards. Phase 3 improves user experience only.

#### UI Design Constraints — Mandatory for Phase 3

- **Preserve the existing parent login page design** — login/register tabs, dark visual style, manual email/password/code fields, existing layout. Do not restructure.
- **Preserve the existing teacher login page design** — login form, dark visual style, existing layout. Do not restructure.
- **No OAuth buttons in Phase 3** — OAuth is a future optional layer (Section 8a). Not added here.
- **No teacher registration tab in Phase 3** — teacher registration is Phase 6. Not added here.
- **Keep manual email/password flow exactly as-is** — do not replace or move any existing form field.
- **No broad visual redesign** — any change must be minimal and additive.
- **No Hebrew copy changes** — new messages use English placeholder text pending owner approval of exact Hebrew.
- **All new Hebrew text must be listed in English in this plan and individually approved by the owner before implementation.**

#### Phase 3 Tasks

- `pages/parent/login.js` — after `getSession()`, if `app_metadata.role === 'teacher'` or `'admin'`, do not redirect to `/parent/dashboard`. Preserve all existing page elements. Hebrew copy for message requires owner approval.
- `pages/parent/dashboard.js` — on `onAuthStateChange`, if `GET /api/parent/list-students` returns 403, redirect back to `/parent/login`.
- `pages/teacher/login.js` — already correctly signs out non-teachers. Confirm behavior is unaffected after Phase 2.
- `/parent/school-inbox.js` — already redirects to `/parent/login` on 401. Verify this continues to work after Phase 2.
- **Policy modal fix (if Phase 0 determined it is auth/entitlement-related):** Apply scoped fix here. If Phase 0 determined it is an unrelated UI bug, defer it separately.

---

### Phase 4 — Admin Management Surfaces for Entitlements

**Goal:** Platform Admin can manage the global scope of permissions, quotas, and approvals. School Manager subject assignment is NOT in the Platform Admin UI — that is in the school portal.

**Dependencies:** Phase 1 (schema) and Phase 2 (guards) must be complete.

**Platform Admin UI scope (these are in scope for Phase 4):**

- Schools management:
  - `GET /api/admin/schools` — list schools
  - `POST /api/admin/schools` — create/approve school
  - `PATCH /api/admin/schools/[schoolId]` — update separate quotas (`max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`), enabled tools/features, active/suspended status
  - `POST /api/admin/schools/[schoolId]/assign-manager` — assign School Manager
- Private teacher management:
  - `GET /api/admin/teachers` — list private teachers
  - `PATCH /api/admin/teachers/[teacherId]/status` — approve/suspend/revoke
  - `PATCH /api/admin/teachers/[teacherId]/quotas` — set max_students, max_classes
  - `PATCH /api/admin/teachers/[teacherId]/subjects` — grant/revoke subjects
  - `PATCH /api/admin/teachers/[teacherId]/features` — enable/disable teacher tools
- Persona entitlement management:
  - `GET /api/admin/entitlements?userId=` — list entitlements for a user
  - `PATCH /api/admin/entitlements/[id]` — activate/suspend/revoke
- Parent account management (if needed):
  - `GET /api/admin/parents/[userId]/settings`
  - `PATCH /api/admin/parents/[userId]/settings`
- Global audit/override capability

**Not in Platform Admin UI (these are School Manager responsibilities):**
- Individual school teacher subject assignment (School Manager does this in school portal)
- Individual school teacher class/student connections (School Manager does this)
- School student login credential management (School Manager does this)
- School guardian/parent credential management (School Manager does this)

**Implementation rule:** Cursor implements only the admin surfaces explicitly listed above. No new admin UI beyond this list. If an ambiguity or new Hebrew/UI/scope requirement arises during Phase 4 that is not covered by this plan, Cursor stops and reports it before proceeding. No extra owner approval gate — Phase 4 proceeds automatically under the single end-to-end approval.

---

### Phase 5 — Subscription-Ready Limits (Internal Only, No Payment)

**Goal:** `parent_account_settings` is actively used for plan-based feature gating. No real payment integration.

**Dependencies:** Phase 2 must be complete.

**Tasks:**
- Define plan code presets (free, trial, basic, family, premium)
- Admin can set parent plan codes via Phase 4 admin surfaces
- Report and Copilot feature flags enforced via `requireParentApiContext({ requireFeature })`
- `monthly_ai_limit` enforcement: if the field is non-null in `parent_account_settings`, enforce it on copilot API calls; if null, no monthly limit applies (null = unlimited)

**Payment provider integration not implemented. All billing fields remain null.**

---

### Phase 6 — Public Registration Workflows (Deferred — Separate Plan Required)

The following are **not** part of this plan's implementation scope. They require a separate plan document and explicit owner approval before implementation:

- Private teacher public request/registration form and admin approval flow
- School public registration request form and admin approval flow
- Admin review/approve/reject notification workflow for public registrations

**Note:** School operator / secretary (invite within school by School Manager) is **already in scope** and implemented in Phases 1–2 of this plan. It is not deferred. Only the public self-registration forms for teachers and schools are deferred.

---

### Phase 7 — Password Reset (Separate Plan, Deferred)

See Section 9. Not implemented in this plan.

---

### Phase 8 — QA, Verification, Final Self-Audit, and Delivery Package

**Goal:** Confirm all implementation is correct, all tests pass, and owner receives a complete, auditable delivery package before any deploy or review.

**Tasks:**

**8a. Run automated test suite**
Run all test groups A through J (see Section 12.1). Record all results. Any failure must be fixed before proceeding.

**8b. Run production build**
Run `npm run build`. Confirm zero build errors.

**8c. Run manual QA checklist**
Complete all items in Section 12.2. Document any blocked items with explanation.

**8d. Produce SQL review package** (if not already done in Phase 1)
For each migration file: purpose, file path, expected affected rows, pre-migration audit queries, verification queries, rollback notes, data-loss risk. Confirm Cursor did not run any SQL.

**8e. Final self-audit against the plan**
Cursor must verify that every item in the plan was implemented as specified:

- Every product rule A–U — checked
- Every role/permission matrix entry — checked
- Every server guard (`requirePersonaApiContext`, `requireParentApiContext`, `requirePrivateTeacherApiContext`, `requireSchoolTeacherApiContext`, `requireSchoolManagerApiContext`, `requireSchoolOperatorApiContext`, `requireAdminApiContext`) — verified
- Every quota enforcement (`max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`, `max_children`, `teacher_limits.max_students`) — verified
- Every operator permission check (`student_access_admin`, `student_data_viewer`) and audit log write — verified
- Every portal entry rule (teacher login, parent login, student login) — verified
- Every out-of-scope item — confirmed untouched

Report any discrepancy. Do not deliver until all discrepancies are resolved.

**8f. Prepare delivery package**
See Section 13 (ZIP Deliverable Requirements) for full specification.

---

## 12. Testing Requirements

### 12.1 Automated Test Matrix

#### A — Parent APIs

| Scenario | Expected |
|----------|----------|
| Active parent entitlement, valid session | 200/201 on list/create/report/copilot |
| No entitlement row for parent | 403 `not_a_parent` |
| Entitlement `status = 'pending'` | 403 `entitlement_pending` |
| Entitlement `status = 'suspended'` | 403 `entitlement_suspended` |
| Entitlement `status = 'revoked'` | 403 `entitlement_revoked` |
| Bearer is private teacher | 403 `not_a_parent` |
| Bearer is school teacher | 403 `not_a_parent` |
| Bearer is school manager | 403 `not_a_parent` |
| Bearer is admin | 403 `not_a_parent` |
| Active parent, `reports_enabled = false` | 403 on report-data API |
| Active parent, `copilot_enabled = false` | 403 on copilot-turn API |
| Active parent, `max_children = 1`, 1 child exists | 400 on create-student |
| Active parent, `max_children = 3`, 2 children exist | 201 on create-student |

#### B — Private Teacher APIs

| Scenario | Expected |
|----------|----------|
| Active `private_teacher`, no school membership | 201 on create student/class |
| Active `school_teacher`, school membership exists | 403 `school_teacher_no_private_access` |
| Active `school_manager` | 403 on private student/class create |
| Private teacher, no `private_teacher_subjects` grant | 403 `subject_not_permitted` |
| Private teacher, with subject grant | 200/201 on subject activity |
| Worksheet activity — same gate as individual activity | 403 if no grant, 200 if grant |

#### C — School Teacher APIs

| Scenario | Expected |
|----------|----------|
| School teacher, with subject grant | 200/201 on school activity |
| School teacher, without subject grant | 403 `subject_not_permitted` |
| Private teacher → school APIs | 403 |
| Parent → school APIs | 403 |

#### D — School Manager Credential APIs

| Scenario | Expected |
|----------|----------|
| School manager → create student login credential | 201 |
| School teacher → create student login credential | 403 |
| Private teacher → create student login credential | 403 |
| Parent → create student login credential (school) | 403 |
| School manager → create guardian/parent access credential | 201 |
| School teacher → create guardian/parent access credential | 403 |

#### E — Admin APIs

| Scenario | Expected |
|----------|----------|
| Active `admin` entitlement | 200 on admin APIs |
| School manager → admin APIs | 403 |
| Teacher → admin APIs | 403 |
| Parent → admin APIs | 403 |

#### F — Cross-Session and Direct Navigation (API level)

| Scenario | Expected |
|----------|----------|
| Teacher bearer → POST /api/parent/create-student | 403 |
| Parent bearer → POST /api/teacher/students/create | 403 |
| School teacher → POST /api/teacher/students/create (direct API call) | 403 `school_teacher_no_private_access` |

#### G — Regression

| Scenario | Expected |
|----------|----------|
| Student login (username + PIN) | Unaffected |
| Guardian PIN login | Unaffected |
| School-issued guardian credentials | Unaffected |
| Existing teacher dashboard load | 200 |
| School manager subject assignment | 201 |
| Existing parent-owned students (backfilled entitlement) | Visible in list-students |

#### H — Quota Enforcement

**Private teacher quotas (Platform Admin authority):**

| Scenario | Expected |
|----------|----------|
| Platform Admin sets private teacher `max_students = 10` via admin API | 200; `teacher_limits` updated |
| Private teacher creates student when below `max_students` limit | 201 |
| Private teacher creates student when at `max_students` limit | 400 `quota_exceeded` |
| Private teacher attempts to change own `max_students` via any API | 403 `not_authorized` |
| School Manager attempts to change private teacher `max_students` | 403 `not_authorized` |
| Platform Admin grants subject to private teacher | 201; subject appears in `private_teacher_subjects` |
| Private teacher attempts to add subject to themselves | 403 `not_authorized` |
| School Manager attempts to add private teacher subject | 403 `not_authorized` |
| Platform Admin activates private teacher entitlement | 200; entitlement `status = 'active'` |
| Private teacher attempts to activate their own entitlement | 403 `not_authorized` |

**School separate quotas (Platform Admin authority — `max_teachers` is legacy; new code uses `max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators` only):**

| Scenario | Expected |
|----------|----------|
| Platform Admin sets `max_school_teachers = 10` | 200; school updated |
| School Manager invites 10th teacher when `max_school_teachers = 10` | 201 |
| School Manager invites teacher when `max_school_teachers` is full | 400 `school_teacher_quota_exceeded` |
| Platform Admin sets `max_school_managers = 1` (default) | 200; school updated |
| Platform Admin attempts to assign 2nd manager when `max_school_managers = 1` | 400 `school_manager_quota_exceeded` |
| Platform Admin sets `max_school_students = 100` | 200; school updated |
| School Manager enrolls student when below `max_school_students` | 201 |
| School Manager enrolls student when `max_school_students` is full | 400 `school_student_quota_exceeded` |
| Platform Admin sets `max_school_operators = 3` | 200; school updated |
| School Manager invites 3rd operator when `max_school_operators = 3` | 201 |
| School Manager invites operator when `max_school_operators` is full | 400 `school_operator_quota_exceeded` |
| School Manager attempts to change `max_school_teachers` | 403 `not_authorized` |
| School Manager attempts to change `max_school_managers` | 403 `not_authorized` |
| School Manager attempts to change `max_school_students` | 403 `not_authorized` |
| School Manager attempts to change `max_school_operators` | 403 `not_authorized` |

**School Manager as school teacher:**

| Scenario | Expected |
|----------|----------|
| School Manager with `school_teacher` entitlement for same school → create activity | 200/201 |
| School Manager with subject grant in same school → access subject-scoped API | 200 |
| School Manager using school_teacher API context → reports for assigned students | 200 |
| School Manager attempting private student creation | 403 `school_teacher_no_private_access` |
| School Manager attempting private class creation | 403 `school_teacher_no_private_access` |

#### I — School Operator Grant Management

| Scenario | Expected |
|----------|----------|
| School Manager invites operator within `max_school_operators` | 201; `school_operator` entitlement `status=active`, no grants by default |
| School Manager invites operator when quota is full | 400 `school_operator_quota_exceeded` |
| Operator with no grants → any operational API | 403 `operator_no_grants` |
| School Manager grants `student_access_admin = true` | 200; `school_operator_grants.student_access_admin = true`; grant action audited in audit log |
| School Manager grants `student_data_viewer = true` | 200; `school_operator_grants.student_data_viewer = true`; grant action audited in audit log |
| School Manager grants both permissions | 200; both flags true; audit log records both |
| School Manager revokes `student_access_admin` | 200; flag set to false; `updated_by` and `updated_at` updated; revoke action audited |
| School Manager revokes `student_data_viewer` | 200; flag set to false; revoke action audited |
| Grant created by School Manager | `school_operator_grants.updated_by` stores manager's user_id; audit log row created |
| Revoke logged with who revoked and when | Audit log row with `action_type=revoke_student_access_admin` or `revoke_student_data_viewer`, `actor_user_id`, `created_at` |

#### I2 — School Operator: `student_access_admin` Permission

| Scenario | Expected |
|----------|----------|
| Operator with `student_access_admin = true` → create student login credential | 201 |
| Operator with `student_access_admin = false` → create student login credential | 403 `operator_grant_required` |
| Operator with `student_access_admin = true` → reset student login credential | 200 |
| Operator with `student_access_admin = false` → reset student login credential | 403 `operator_grant_required` |
| Operator with `student_access_admin = true` → create guardian/parent access credential | 201 |
| Operator with `student_access_admin = false` → create guardian/parent access credential | 403 `operator_grant_required` |
| Operator with `student_access_admin = true` → update student registration fields | 200 (within approved scope) |
| Operator with `student_access_admin = false` → update student registration fields | 403 `operator_grant_required` |
| Credential action by operator → audit log entry created | `school_operator_audit_log` row with operator user_id, action type, timestamp |
| School Teacher → create/reset school student login credential | 403 `not_authorized` |
| School Teacher → create/reset school guardian/parent credential | 403 `not_authorized` |

#### I3 — School Operator: `student_data_viewer` Permission

| Scenario | Expected |
|----------|----------|
| Operator with `student_data_viewer = true` → view student profile/class/grade | 200; full student detail |
| Operator with `student_data_viewer = false` → view student profile/class/grade | 403 `operator_grant_required` |
| Operator with `student_data_viewer = true` → view school student report | 200 |
| Operator with `student_data_viewer = false` → view school student report | 403 `operator_grant_required` |
| Operator with `student_data_viewer = true` → access student from another school | 403 `wrong_school` |

#### I4 — School Operator: Combined and Security Tests

| Scenario | Expected |
|----------|----------|
| Operator with both permissions → credential action + view report | Both 200 |
| Operator with only `student_access_admin` → view student report | 403 `operator_grant_required` |
| Operator with only `student_data_viewer` → create credential | 403 `operator_grant_required` |
| Operator → create teaching activity | 403 `not_a_teacher` |
| Operator → assign subject to teacher | 403 `not_authorized` |
| Operator → access admin API | 403 `not_admin` |
| Operator → access another school's credential API | 403 `wrong_school` |
| Operator → change school `max_school_teachers` | 403 `not_authorized` |
| Operator → access private teacher management | 403 `not_authorized` |

#### J — Portal Entry Routing (API level)

| Scenario | Expected |
|----------|----------|
| Private teacher session bearer → POST /api/parent/create-student | 403 `not_a_parent` |
| School teacher session bearer → POST /api/parent/create-student | 403 `not_a_parent` |
| School manager session bearer → POST /api/parent/create-student | 403 `not_a_parent` |
| School operator session bearer → POST /api/parent/create-student | 403 `not_a_parent` |
| Parent session bearer → POST /api/teacher/students/create | 403 `not_a_teacher` |
| School guardian access → POST /api/parent/copilot-turn | 403 (no active parent entitlement) |
| School guardian access → GET /api/parent/students/[id]/report-data | 403 (no active parent entitlement) |
| Student login token → any parent/teacher/admin API | 403 (wrong auth system) |
| School operator → POST /api/teacher/classes (POST) | 403 `not_a_teacher` |
| Same login page does not grant different persona's capabilities | Verified by all above |

### 12.2 Manual QA Checklist

- [ ] Parent can sign up and immediately reach dashboard (auto_active mode)
- [ ] Parent can add a child (within max_children limit)
- [ ] Parent can view child report (if `reports_enabled = true`)
- [ ] Parent copilot behaves correctly based on `copilot_enabled` flag
- [ ] Parent cannot access `/teacher/dashboard`
- [ ] Teacher (private) can log in and access teacher dashboard
- [ ] Teacher (private) can create a student (own private student)
- [ ] Teacher (private) with subject grant can create subject activity
- [ ] Teacher (private) without subject grant receives appropriate error
- [ ] School teacher can log in and access school portal
- [ ] School teacher cannot create a private class
- [ ] School teacher cannot create a private student
- [ ] School teacher cannot create/reset school student login credentials
- [ ] School teacher cannot create/reset school guardian/parent access credentials
- [ ] School manager can create/reset school student login credentials
- [ ] School manager can create/reset school guardian/parent access credentials
- [ ] School teacher can be assigned subjects by school manager (not by platform admin in normal workflow)
- [ ] School manager can access school management pages
- [ ] School manager cannot access platform admin pages (`/admin/**`)
- [ ] School manager who also has teaching assignment can access school teacher functions
- [ ] School manager who also has teaching assignment cannot create private students or private classes
- [ ] School manager cannot change school's own staff quota or student quota
- [ ] Private teacher cannot change their own max_students or add subjects to themselves
- [ ] Platform Admin can set private teacher quotas and subjects via admin APIs
- [ ] Platform Admin can set school staff quota and student quota via admin APIs
- [ ] Admin can access teacher and school management pages
- [ ] Navigating directly to `/parent/dashboard` with a teacher session is blocked
- [ ] Navigating directly to `/teacher/dashboard` with a parent-only session is blocked
- [ ] Guardian PIN flow is unaffected
- [ ] Student login is unaffected
- [ ] Hebrew text on all existing screens is unchanged
- [ ] No new Hebrew text introduced without owner approval
- [ ] School operator can log in through teacher/staff login page
- [ ] School operator with no grants cannot perform any operational action
- [ ] School manager can grant `student_access_admin` to an operator
- [ ] School manager can grant `student_data_viewer` to an operator
- [ ] School manager can grant both permissions to an operator
- [ ] School manager can revoke each permission from an operator
- [ ] Operator with `student_access_admin` can create/reset school student login credentials
- [ ] Operator without `student_access_admin` is blocked from credential actions
- [ ] Operator with `student_data_viewer` can view student details and reports within school
- [ ] Operator without `student_data_viewer` is blocked from viewing student reports
- [ ] School operator cannot create activities or receive subject permissions
- [ ] School operator cannot access admin pages or other school data
- [ ] All school operator credential and grant/revoke actions produce an audit log entry
- [ ] Private teacher entering through teacher login page gets private teacher capabilities only
- [ ] School manager entering through teacher login page gets school manager capabilities (not private teacher)
- [ ] School guardian entering through parent login page does NOT receive full parent subscription features
- [ ] School guardian entering through parent login page has only school-guardian-scoped access
- [ ] Student login is unaffected and uses a separate PIN flow
- [ ] Existing parent login page design is unchanged (tab structure, dark style, form fields)
- [ ] Existing teacher login page design is unchanged (form structure, dark style)

---

## 13. ZIP Deliverable Requirements

### 13.1 SQL Review Package (before owner runs any SQL)

Before the owner runs any SQL migration, Cursor must provide the SQL review package containing:

1. List of all migration files (040 through 046) with file paths
2. Purpose of each migration in plain language
3. Expected number of affected rows for each migration
4. Pre-migration audit queries (run before SQL to understand current state)
5. Verification queries (run after SQL to confirm correct result)
6. Rollback notes for each migration (what to run to undo)
7. Any data-loss risk (explicit: "this migration does not drop data" or "this drops column X — confirm first")
8. Explicit confirmation: Cursor did not execute any SQL

Owner reviews the package, runs each migration manually, executes verification queries, and confirms to Cursor before proceeding.

### 13.2 Final Delivery Package (ZIP + companion deliverables)

When implementation is approved and completed, Cursor must prepare the full delivery package.

**Included in ZIP:**
- All changed `.js`, `.jsx`, `.ts`, `.tsx` source files
- All new server helper files
- All new or updated test files
- All new or updated documentation files
- All prepared migration files (not run by Cursor)
- `CHANGES.md` listing every changed file with a one-line description

**Excluded from ZIP:**
- `.env`, `.env.local`, or any file with `SECRET`, `KEY`, or `PASSWORD` in the name
- `node_modules/`
- `.next/`
- All build outputs
- `.git/` internals
- Files not related to this plan's scope
- Reports or logs containing private user data

**Alongside the ZIP, provide all of the following:**
1. Output of `git status --short`
2. Output of `git diff --stat`
3. Exact list of files included in the ZIP
4. Exact list of files changed but not included in the ZIP, if any
5. Exact commands run during implementation
6. Full test result summary (all groups A–J)
7. Build result (`npm run build` output)
8. Manual QA checklist completion status (Section 12.2)
9. Confirmation: no SQL executed by Cursor
10. Confirmation: no commit, push, or deploy performed
11. Confirmation: no `.env`, secrets, `node_modules`, `.next`, build outputs, private reports, or unrelated files in ZIP
12. Final self-audit results (Section 8e) — every rule/matrix/guard/quota/operator permission/portal entry/out-of-scope item checked and confirmed

---

## 14. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backfill misidentifies dual-role QA accounts | Low (dev env only) | Medium | Run pre-migration audit queries; review before applying |
| Policy acceptance flow blocked during signup | Medium | High | Phase 0 modal investigation; Phase 2 decision point on acceptance routes |
| Worksheet gate fix breaks existing workflows | Low | Medium | Regression tests |
| Admin accounts need explicit test entitlements | Medium | Medium | Seed admin entitlements during Phase 1 backfill |
| `parent_account_settings` row not created for existing parents | Low (dev env) | Medium | Backfill includes settings row creation with defaults |
| School teacher with existing private classes/students before Phase 2 | Low (dev env) | Low | No retroactive deletion; create is blocked going forward |
| School teacher attempts to reset student credentials after Phase 2 | Low | High | Credential management APIs must check `school_manager` entitlement; school teachers receive 403 |

---

## 15. Backward Compatibility

| Concern | Handled by |
|---------|-----------|
| Existing real parent accounts | Backfill creates `active` entitlement and default `parent_account_settings`; no disruption |
| Existing school teachers and their dashboards | Read-only teacher dashboard and school portal unaffected; only private student/class creation is blocked |
| Existing teacher-managed students (sim parent) | Not affected; owned by sim parent, not by teacher auth user |
| Guardian PIN login | Completely separate auth system; no change |
| Student login | Completely separate auth system; no change |
| QA admin account with elevated child allowlist | Must be identified in Phase 0; given explicit `parent` entitlement + elevated `max_children` in `parent_account_settings` |
| `resolveParentStudentLimit` email-based allowlist | Replaced by `parent_account_settings.max_children`; QA emails given elevated limits via settings row |

---

## 16. Out of Scope

The following are explicitly **not** part of this plan's implementation:

- Password reset for any persona (Phase 7 — deferred, requires separate plan)
- Private teacher public registration form and approval flow (Phase 6 — deferred, requires separate plan)
- School public registration form and approval flow (Phase 6 — deferred, requires separate plan)
- OAuth / social login (deferred — future optional authentication layer; requires separate approval)
- Teacher registration tab on teacher login page (deferred — not added until backend approval flow is complete and separately approved)
- Real payment provider integration (fields present in schema but payment processing is not implemented)
- New Hebrew copy (none introduced in this plan; any new Hebrew text requires owner approval before implementation)
- Student learning content, question system, or curriculum changes
- Arcade or game system changes
- Parent report UI/UX redesign (unless an entitlement-related access block requires a minimal UI adjustment)
- Broad login page visual redesign (any login page change must be minimal and additive only — design preserved)
- Supabase email template configuration
- Any change to student login systems (username/PIN — completely separate auth system)
- Any change to guardian PIN login (completely separate auth system)
- Policy modal behavior change (only changed if Phase 0 confirms it is caused by the entitlement provisioning flow; otherwise deferred separately)

**Explicitly IN scope (not deferred):**
- `school_operator` persona, entitlement, quota, grants, guards, and tests
- `school_operator_grants` table and `school_operator_audit_log` table
- Modular operator permissions (`student_access_admin`, `student_data_viewer`)
- School operator invite/create APIs under School Manager scope
- Quota enforcement for `max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`
- `requireSchoolOperatorApiContext` guard

---

## 17. Final Owner Approval Gate

### Resolved decisions — no further confirmation required

The following items were previously listed as "owner must confirm" and have been resolved:

| Decision | Resolution |
|---|---|
| `PARENT_SIGNUP_MODE` | `auto_active` |
| `parent_account_settings.plan_code` default | `'free'` |
| `parent_account_settings.max_children` default | `3` |
| `parent_account_settings.reports_enabled` default | `true` |
| `parent_account_settings.copilot_enabled` default | `false` |
| Entitlement provisioning point | After policy acceptance (`POST /api/parent/policy-acceptance/accept`) |
| `max_school_managers` default | `1` |
| `max_school_teachers` default | `20` (unless Phase 0 audit shows existing data requires a higher value) |
| `max_school_students` default | `500` (unless Phase 0 audit shows existing data requires a higher value) |
| `max_school_operators` default | `5` |
| `max_teachers` migration | Backfill `max_teachers` → `max_school_teachers`; retain `max_teachers` temporarily for backward compatibility; new code uses `max_school_teachers` only |
| Operator permission names | `student_access_admin` and `student_data_viewer` — confirmed |
| Operator defaults on creation | `student_access_admin = false`, `student_data_viewer = false` — no capabilities by default |
| `student_access_admin` scope | Create/enroll students; update registration/profile/assignment fields; create/reset/revoke student login credentials; create/reset/revoke guardian/parent access credentials; manage guardian/parent access records |
| `student_data_viewer` scope | Full student profile/details; class/grade/enrollment status; guardian/parent access status and contact details (if part of school portal); school student reports; classroom/report data that School Manager may see |
| Operator audit log format | Dedicated `school_operator_audit_log` table (see Section 4.4b) |
| `school_operator_grants` schema | Two-table design: current-state grants + separate audit log (see Section 4.4b) |
| Trigger option | Option A (keep trigger, make harmless — entitlement is the authority, not the profile row) unless Phase 0 finds a specific reason to change |
| `school_operator` in scope | Confirmed in scope — not deferred |

### Remaining single open item from Phase 0 inspection:
- [ ] School operator membership storage: Option A (extend `school_teacher_memberships`) or Option B (new `school_staff_memberships` table)? — **Decided in Phase 0 after schema inspection. Update Section 4.4c with the chosen option before writing Phase 1 SQL.**

### Single final approval gate

The owner approves the full plan by pressing the implementation button in Cursor. After that:
- Cursor executes end-to-end per the Execution Model section
- Cursor stops only for: manual SQL execution, uncovered blockers, Hebrew copy approval, or scope changes
- No phase-by-phase approval prompts
- No commit, push, or deploy until explicitly instructed

**Hebrew copy gate:** If any new Hebrew-language UI string is required during Phase 3 or any other phase that was not explicitly approved in this plan, Cursor presents the English placeholder and the proposed Hebrew text to the owner before inserting it. No new Hebrew text is introduced without owner approval.

---

## 18. Confirmation

No code was changed as part of creating or updating this plan.
No SQL was executed.
No migrations were run.
No UI was modified.
No CSS was modified.
No Hebrew text was changed.
No commit was made.
No push was made.
No deploy was made.

This file (`.cursor/plans/role_boundary_fix_plan_631834d8.plan.md`) is the **sole authoritative implementation plan**.

The file `docs/auth/ROLE_PERSONA_ENTITLEMENT_SUBSCRIPTION_FOUNDATION_PLAN.md` is a superseded reference copy. It is not the authoritative plan. If any conflict exists between the two files, this file wins. The docs/auth file has not been deleted (it is not harmful to leave it as a reference), but it is no longer the plan the owner acts on.

**Revision history (chronological):**

- **2026-05-29 (pass 0 — initial):** First full plan — root causes, entitlement schema, server guards, phases 0–8, testing, ZIP requirements
- **2026-05-30 (pass 1 — UI preservation and teacher registration):** Added login design preservation rules, teacher pending-by-default, OAuth future layer, policy modal discovery item, parent vs teacher signup distinction; authoritative plan moved to `.cursor/plans` file; `docs/auth` file marked superseded
- **2026-05-30 (pass 2 — owner clarifications: quotas, manager authority):** Current parent signup defaults documented (auto_active, 3 children, free plan); Rule P added (Platform Admin sole authority for private teacher quotas/subjects); Rule Q added (Platform Admin sole authority for school-level quotas/tools; max_school_staff field naming decision); Rule R added (Platform Admin → School Manager → Teachers normal workflow; Platform Admin does not manage individual school teacher subjects); Rule S added (School Manager may also be school teacher in same school — allowed); Role/Permission Matrix updated for Platform Admin (quota authority, UI focus), Private Teacher (cannot change own quota), School Manager (can teach in same school, cannot change school quotas); Dual-role policy updated (school_manager + school_teacher same school = ALLOWED); Phase 4 admin surfaces scope rewritten to match owner intent; Test group H (quota enforcement) added with private teacher, school staff, and school-manager-as-teacher tests; Manual QA checklist expanded; Owner approval gate expanded
- **2026-05-30 (pass 3 — school operator persona, separate quotas, portal entry rules):** Rule Q replaced — school quotas are now separate per role type (`max_school_teachers` excludes manager; `max_school_managers = 1` separately; `max_school_students`; `max_school_operators`); Rule R updated to include School Operator in normal workflow; Rule T added — School Operator is a defined planned persona (`school_operator`) — not merely a future note; Role/Permission Matrix: School Operator section promoted from "future design only" to "planned — implemented after approval"; Platform Admin matrix updated for separate quota fields; School Manager matrix updated with separate operator/teacher quota rows; Section 4.2 DDL updated to include `school_operator` in persona check constraint; Section 4.4 schema proposal replaced with definitive planned migration for four separate quota columns; Dual-role policy expanded with school_operator rows; `requireSchoolOperatorApiContext` added to server guard pseudocode; New Section 8b (Portal Entry Rules) added; Phase 4 admin surfaces updated for separate quota fields; Test groups I (School Operator APIs) and J (Portal Entry Routing) added; Manual QA checklist expanded with school operator and portal routing items
- **2026-05-30 (pass 4 — school operator modular permissions and grant design):** Rule T expanded — `school_operator` entitlement is role membership only; actual capabilities come from `school_operator_grants` table; two modular permission groups defined (`student_access_admin` = credential/registration operations, `student_data_viewer` = view student details/reports). Rule U added — School Manager delegation rule: explicit, per-operator, per-permission-group, school-scoped, revocable, audited; explicit list of what School Manager may NOT delegate. Section 4.4b added — `school_operator_grants` table DDL with all fields, indexes, RLS, and explanation of three-layer authorization model. `requireSchoolOperatorApiContext` updated to accept `requireGrant` option. Testing: Group I split into I, I2, I3, I4 covering grant management, access-admin, data-viewer, and combined security tests. Manual QA checklist expanded. Owner Approval Gate expanded with six operator permission questions
- **2026-05-30 (pass 5 — final hardening: end-to-end execution model, resolved owner decisions, schema cleanup):** Execution model updated from repeated phase-by-phase approval to single end-to-end run after owner approval; `school_operator` removed from all "future/deferred" language — now confirmed in scope; YAML todos updated to match full plan scope including 043–045 migrations, operator grants, quota enforcement, membership storage, audit log, requireSchoolOperatorApiContext; all "owner must confirm" items resolved with definitive values; `school_operator_grants` schema redesigned as two-table approach (current-state grants + `school_operator_audit_log` append-only audit); Section 4.4c added — school operator membership storage definition (Option A vs Option B with Phase 0 inspection gate); Out of Scope rewritten — school_operator and all related items explicitly listed as IN scope; Section 17 Owner Approval Gate collapsed — all resolved decisions listed in table, single remaining open item (membership storage option from Phase 0); Section 13 (ZIP) split into 13.1 SQL review package and 13.2 delivery package with full 12-point companion checklist; Phase 8 expanded with self-audit requirement (Phase 8e); test group order fixed to A–J chronological; `student_access_admin` and `student_data_viewer` scopes fully defined; `school_operator_audit_log` DDL added; Revision history put in strict chronological order

---

*End of plan — ready for owner final approval and end-to-end implementation.*

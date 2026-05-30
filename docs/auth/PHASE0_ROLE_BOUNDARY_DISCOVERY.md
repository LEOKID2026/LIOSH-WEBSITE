# Phase 0 — Role Boundary Discovery Inventory

**Date:** 2026-05-30  
**Plan:** Role / Persona / Entitlement / Subscription-Ready Access Foundation

## API Route Inventory

### Parent APIs (`pages/api/parent/`)
| Route | Methods | Current auth |
|-------|---------|--------------|
| `list-students.js` | GET | `auth.getUser()` only |
| `create-student.js` | POST | `auth.getUser()` only |
| `update-student.js` | POST | `auth.getUser()` only |
| `delete-student.js` | POST | `auth.getUser()` only |
| `create-student-access-code.js` | POST | `auth.getUser()` only |
| `copilot-turn.js` | POST | `auth.getUser()` only |
| `mini-report.js` | GET | `auth.getUser()` only |
| `students/[studentId]/report-data.js` | GET | `auth.getUser()` only |
| `teacher-consent/issue.js` | POST | `auth.getUser()` only |
| `teacher-consent/revoke.js` | POST | `auth.getUser()` only |
| `policy-acceptance/accept.js` | POST | `resolveAuthenticatedParentUserId` — exempt from parent entitlement (provisioning point) |
| `policy-acceptance/status.js` | GET | `resolveAuthenticatedParentUserId` — exempt from parent entitlement |

### Teacher APIs (`pages/api/teacher/`)
80 route files — all use `requireTeacherApiContext` or `resolveAuthenticatedTeacherUserId` with `app_metadata.role === 'teacher'`.

Private student/class routes requiring `rejectIfSchoolTeacher`:
- `students/create.js`, `students/link.js`
- `classes/index.js` (POST), `classes/[classId]/members.js` (POST)

Worksheet gate fix: `worksheet-activities/index.js` uses `assertSchoolTeacherSubjectAllowed` — should use `assertActivitySubjectAllowed`.

### School APIs (`pages/api/school/`)
~40 routes under school manager scope via `requireSchoolManagerApiContext` (membership role `school_admin`).

Credential routes (manager-only today):
- `students/[studentId]/accounts/student/*`
- `students/[studentId]/accounts/parent/*`

### Admin APIs (`pages/api/admin/`)
15 routes — `requireAdminApiContext` checks `app_metadata.role === 'admin'` only.

## Parent Profile Trigger

**Decision: Option A (confirmed)**  
Trigger `on_auth_user_created_parent_profile` in `001_learning_core_foundation.sql` creates `parent_profiles` for all auth users. Harmless — authorization moves to `account_persona_entitlements`.

## School Operator Membership Storage

**Decision: Option A — extend `school_teacher_memberships`**

Current schema (025):
```sql
role text not null default 'teacher' check (role in ('teacher', 'school_admin'))
```

Migration 046 adds `'school_operator'` to the role check.  
`teacher_id` references `teacher_profiles.id` (= `auth.users.id`). Operators require a `teacher_profiles` row for membership FK.

## QA / Test Accounts

| Account | Notes |
|---------|-------|
| `admin@admin.com` | QA simulation parent — elevated `max_children = 50` via `parent_account_settings` after backfill |
| Admin users | `app_metadata.role = 'admin'` — need explicit `admin` entitlement in backfill |

## Policy Modal Repeat Bug (Phase 0 finding)

**Classification: entitlement-flow-related (partially)**

Signup flow (`pages/parent/login.js`):
1. User selects signup → `FullPolicyAcceptancePanel` with `persistToApi=false`
2. On accept → `preSignupPolicyCompleted=true` → signup form shown
3. On signup success → `storeSignupPolicyAcceptance` called → redirect dashboard
4. Dashboard may re-prompt policy if entitlement not provisioned

**Fix (Phase 2):** Provision `account_persona_entitlements` + `parent_account_settings` in `policy-acceptance/accept.js` after successful policy acceptance. This aligns signup policy accept with entitlement creation.

## Pre-Migration Audit Queries

See `docs/auth/SQL_REVIEW_PACKAGE.md` for full audit, verification, and rollback queries.

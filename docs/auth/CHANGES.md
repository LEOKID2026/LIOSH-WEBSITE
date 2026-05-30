# CHANGES — Role / Persona / Entitlement / Subscription-Ready Access Foundation

**Date:** 2026-05-30  
**Plan:** `.cursor/plans/role_boundary_fix_plan_631834d8.plan.md`  
**SQL executed by Cursor:** None (migrations prepared only)  
**Commit/push/deploy:** None

---

## New migrations (owner runs manually, in order)

| File | Description |
|------|-------------|
| `supabase/migrations/040_account_persona_entitlements.sql` | Central `account_persona_entitlements` table |
| `supabase/migrations/041_parent_account_settings.sql` | Parent plan/limits/subscription-ready settings |
| `supabase/migrations/042_backfill_entitlements_dev.sql` | Dev backfill for entitlements + parent settings |
| `supabase/migrations/043_school_accounts_separate_quotas.sql` | Separate school quota columns |
| `supabase/migrations/044_school_operator_grants.sql` | Operator permission flags table |
| `supabase/migrations/045_school_operator_audit_log.sql` | Append-only operator audit log |
| `supabase/migrations/046_school_teacher_memberships_school_operator_role.sql` | Add `school_operator` membership role |
| `supabase/migrations/047_parent_copilot_usage_log.sql` | Copilot usage log for `monthly_ai_limit` enforcement |

## New documentation

| File | Description |
|------|-------------|
| `docs/auth/PHASE0_ROLE_BOUNDARY_DISCOVERY.md` | Phase 0 route inventory and decisions |
| `docs/auth/SQL_REVIEW_PACKAGE.md` | Owner SQL review package (040–047) |
| `docs/auth/PHASE8_SELF_AUDIT.md` | Final self-audit against plan rules A–U |
| `docs/auth/CHANGES.md` | This delivery changelog |
| `docs/auth/POST_SQL_VERIFICATION_REPORT.md` | Post-SQL verification report (owner SQL applied) |
| `docs/auth/POST_SQL_INTEGRATION_RESULTS.json` | Machine-readable integration matrix results |
| `docs/auth/POST_SQL_OPERATOR_RESULTS.json` | Operator grant + quota-at-limit probe results |

## New server libraries

| File | Description |
|------|-------------|
| `lib/auth/persona-entitlement.server.js` | Load/upsert entitlements and parent settings |
| `lib/auth/persona-guard.server.js` | Persona guards (`requireParentApiContext`, operator grants, etc.) |
| `lib/parent-server/parent-signup-mode.server.js` | `PARENT_SIGNUP_MODE = auto_active` |
| `lib/parent-server/parent-entitlement-provision.server.js` | Provision parent entitlement on policy accept |
| `lib/parent-server/parent-copilot-limit.server.js` | Monthly copilot limit assert/record |
| `lib/teacher-server/private-teacher-guard.server.js` | `rejectIfSchoolTeacher` for private teacher APIs |
| `lib/school-server/school-quota.server.js` | School quota load/count/assert helpers |
| `lib/school-server/school-operator.server.js` | Operator invite, grants, audit log |
| `lib/admin-server/admin-entitlements.server.js` | Admin entitlement list/patch |
| `lib/admin-server/admin-parent-settings.server.js` | Admin parent settings get/patch |

## New API routes

| File | Description |
|------|-------------|
| `pages/api/admin/entitlements/index.js` | GET list entitlements |
| `pages/api/admin/entitlements/[entitlementId].js` | PATCH entitlement status |
| `pages/api/admin/parents/[userId]/settings.js` | GET/PATCH parent account settings |
| `pages/api/school/operators/index.js` | GET/POST school operators |
| `pages/api/school/operators/[operatorId]/grants.js` | PATCH operator grants |

## Modified server libraries

| File | Description |
|------|-------------|
| `lib/admin-server/admin-request.server.js` | Admin APIs require active `admin` entitlement |
| `lib/admin-server/admin-schools.server.js` | Separate quota fields; quota on teacher/manager assign; entitlement upserts |
| `lib/school-server/school-membership.server.js` | Select new quota columns from `school_accounts` |
| `lib/school-server/school-request.server.js` | Credential admin + data viewer contexts; credential admin API wrapper |
| `lib/school-server/school-students.server.js` | Enforce `max_school_students` on enroll |
| `lib/teacher-server/teacher-session.server.js` | Teacher session checks active teacher persona entitlements |

## Modified parent APIs

| File | Description |
|------|-------------|
| `pages/api/parent/create-student.js` | `requireParentApiContext` + dynamic max children |
| `pages/api/parent/list-students.js` | `requireParentApiContext` + settings-based limit |
| `pages/api/parent/update-student.js` | `requireParentApiContext` |
| `pages/api/parent/delete-student.js` | `requireParentApiContext` |
| `pages/api/parent/create-student-access-code.js` | `requireParentApiContext` |
| `pages/api/parent/students/[studentId]/report-data.js` | `requireFeature: reports_enabled` |
| `pages/api/parent/copilot-turn.js` | `requireFeature: copilot_enabled` + monthly AI limit |
| `pages/api/parent/policy-acceptance/accept.js` | Provisions parent entitlement on accept |
| `pages/api/parent/teacher-consent/issue.js` | `requireParentApiContext` |
| `pages/api/parent/teacher-consent/revoke.js` | `requireParentApiContext` |

## Modified private teacher APIs

| File | Description |
|------|-------------|
| `pages/api/teacher/students/create.js` | `rejectIfSchoolTeacher` |
| `pages/api/teacher/students/link.js` | `rejectIfSchoolTeacher` |
| `pages/api/teacher/classes/index.js` | `rejectIfSchoolTeacher` on POST |
| `pages/api/teacher/classes/[classId]/members.js` | `rejectIfSchoolTeacher` on POST |
| `pages/api/teacher/worksheet-activities/index.js` | `assertActivitySubjectAllowed` |

## Modified school APIs

| File | Description |
|------|-------------|
| `pages/api/school/students/[studentId]/report-data.js` | `requireSchoolDataViewerContext` |
| `pages/api/school/students/[studentId]/accounts/index.js` | Credential admin context |
| `pages/api/school/students/[studentId]/accounts/student/create.js` | Credential admin + operator audit |
| `pages/api/school/students/[studentId]/accounts/student/*.js` | Credential admin + operator audit (reset/block/revoke/unblock) |
| `pages/api/school/students/[studentId]/accounts/parent/*.js` | Credential admin + operator audit |

## Modified UI (minimal, design preserved)

| File | Description |
|------|-------------|
| `pages/parent/login.js` | Block cross-persona redirect for teacher/admin metadata |
| `pages/parent/dashboard.js` | Redirect on 403 `not_a_parent` from list-students |

## New tests

| File | Description |
|------|-------------|
| `tests/auth/persona-entitlement-foundation.test.mjs` | Unit tests for entitlement codes, quotas, copilot month window |
| `tests/auth/role-boundary-integration-matrix.mjs` | Post-SQL HTTP integration matrix (A–J + operator I–I4 + quota-at-limit) |
| `tests/auth/role-boundary-operator-verification.mjs` | School operator grant matrix; seeds QA operator; quota-at-limit probes |

## Deferred (not implemented)

- Phase 6: Public teacher/school registration forms
- Phase 7: Password reset flow

## Commands run

```
node --test tests/auth/persona-entitlement-foundation.test.mjs
npm run build
git status --short
git diff --stat
```

## Test summary

| Check | Status | Notes |
|-------|--------|-------|
| Unit tests (foundation helpers) | **4/4 pass** | Entitlement error codes, quota defaults, UTC month window |
| Production build (`npm run build`) | **Pass** | Pre-existing metadata-scanner warnings only |
| Full integration matrix (A–J + operator) | **62/63 pass, 1 skip** | See `docs/auth/POST_SQL_VERIFICATION_REPORT.md` |
| Operator verification (standalone) | **26/26 pass** | `qa-school-operator@leo-k.com`; grants + quota-at-limit |
| Quota at-limit enforcement | **4/4 pass** | All `*_quota_exceeded` codes verified via admin PATCH + restore |

## Build result

`npm run build` — **success** (warnings only, pre-existing metadata scanner dependency warnings)

## Delivery ZIP

- **Path:** `review-packages/role-boundary-foundation-delivery.zip`
- **Structure:** Full workspace-relative paths preserved (e.g. `lib/auth/persona-guard.server.js`, not flat `index.js` basenames)
- **Source files:** 71 (matches `CHANGES.md` tables)
- **ZIP file entries:** 71 (70 source files + `docs/auth/DELIVERY_ZIP_MANIFEST.txt` regenerated in staging)
- **Manifest:** `docs/auth/DELIVERY_ZIP_MANIFEST.txt`

### Why the previous ZIP showed ~46 entries

The first ZIP used PowerShell `Compress-Archive -Path @($file1, $file2, …)`, which **flattens** all inputs into the archive root by basename. That collapsed distinct paths such as five separate `index.js` files into one entry, and similarly merged duplicate basenames (`create.js`, `revoke.js`, etc.). The corrected ZIP uses `tar` with a staged directory tree so every path is preserved.

## Confirmations

- SQL executed by Cursor: **None**
- Commit / push / deploy: **None**

# Platform Admin Lifecycle Controls — Report

Date: 2026-05-30

## Root cause

Entitlement lifecycle **APIs existed** (`PATCH /api/admin/entitlements/[id]`, parent settings PATCH, teacher status PATCH, school `is_active`) but there was **no orchestrated admin UI** to suspend/reactivate/revoke users safely. Platform Admin could change settings but not clearly freeze access from detail pages.

## Behavior implemented

### Safe lifecycle model (no hard delete)

| Target | Suspend | Reactivate | Revoke |
|--------|---------|------------|--------|
| **Parent** | `entitlement.status=suspended` + `account_status=suspended` | both `active` | `entitlement=revoked`, `account_status=cancelled` |
| **Private teacher** | `private_teacher` suspended + `teacher_limits.is_account_active=false` | both active | entitlement revoked + account inactive |
| **School staff** | persona entitlement suspended | entitlement active | entitlement revoked |
| **School** | `school_accounts.is_active=false` | `is_active=true` | N/A (use school suspend) |

### API enforcement (existing + verified)

- **Parent:** `requirePersonaApiContext` → `entitlement_suspended`; `requireParentApiContext` → `parent_account_inactive`
- **Private teacher:** `resolveAuthenticatedTeacherUserId` / `requireTeacherApiContext` → `entitlement_suspended` or `account_deactivated`
- **School staff:** school portal guards use `assertActivePersonaEntitlement`
- **School:** `school_inactive` when `is_active=false` (no migration needed)

### New admin API

- `GET/POST /api/admin/users/[userId]/lifecycle` — orchestrated suspend/reactivate/revoke by persona

### UI (interim English — Hebrew pending approval)

- `/admin/parents/[userId]` — lifecycle panel + settings (all feature flags)
- `/admin/teachers/[teacherId]` — lifecycle panel for **private teachers only**
- `/admin/schools/[schoolId]` — school suspend/reactivate + per-staff compact controls

## School freeze

Uses existing `school_accounts.is_active`. Suspended schools block school portal APIs with `school_inactive` (403). **No SQL migration required.**

## Hebrew

Proposed labels in `docs/auth/PENDING_ADMIN_LIFECYCLE_HEBREW.md` — **not inserted** per owner rule.

Prior pass Hebrew listed in same doc + `PENDING_OPERATOR_UI_HEBREW.md`.

## No SQL / commit / push / deploy

Confirmed.

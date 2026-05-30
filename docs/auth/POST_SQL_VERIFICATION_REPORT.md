# Post-SQL Verification Report

**Date:** 2026-05-30  
**SQL executed by Cursor:** None (owner applied 040–047 manually)  
**Commit / push / deploy:** None

---

## 1. Schema readiness (`503 db_schema_not_ready`)

**Result: PASS**

Parent list API returns `200` with active parent entitlement — no `db_schema_not_ready` on probed routes.

Accounts used:
- Parent QA: `admin@admin.com` (parent entitlement active; **not** platform admin)
- Platform admin: `office@leo.com` (`app_metadata.role=admin` + active admin entitlement)
- School operator QA: `qa-school-operator@leo-k.com` (invited under demo school `bb4e5984-d95f-438f-a465-e1a8208ea7de`)

---

## 2. Automated test results

### Unit tests (foundation helpers)

```
node --test tests/auth/persona-entitlement-foundation.test.mjs
```

**4/4 PASS**

### Integration matrix (HTTP, groups A–J + operator I–I4 + quota-at-limit)

```
node --env-file=.env.local --env-file=.env.e2e.local tests/auth/role-boundary-integration-matrix.mjs
```

**62 PASS · 0 FAIL · 1 SKIP · 63 total**

Full JSON: `docs/auth/POST_SQL_INTEGRATION_RESULTS.json`  
Operator-only JSON: `docs/auth/POST_SQL_OPERATOR_RESULTS.json`

| Group | Pass | Fail | Skip | Notes |
|-------|------|------|------|-------|
| PRE | 3 | 0 | 1 | `office@leo-k.com` password not in env (skipped try); `office@leo.com` used |
| A Parent APIs | 8 | 0 | 0 | Includes copilot `feature_not_enabled`, cross-persona 403 |
| B Private teacher | 4 | 0 | 0 | Private create 201; school staff blocked |
| C School teacher | 3 | 0 | 0 | |
| D Credential admin | 3 | 0 | 0 | Manager 200; teacher/private 403 |
| E Admin APIs | 5 | 0 | 0 | `office@leo.com` admin schools 200 |
| F Cross-session | 2 | 0 | 0 | |
| G Regression | 2 | 0 | 0 | Guardian login responds (401 fixture) — no 503 |
| H Quotas | 8 | 0 | 0 | Read-only counts + **at-limit enforcement** (see §6) |
| I Operator grants | 4 | 0 | 0 | No grants → blocked; manager-only APIs blocked |
| I2 Access admin | 4 | 0 | 0 | Credential list 200; report blocked; grant audited |
| I3 Data viewer | 4 | 0 | 0 | Report 200; credentials blocked; grant audited |
| I4 Combined + security | 10 | 0 | 0 | Both grants, revokes audited, forbidden actions blocked |
| J Portal entry | 2 | 0 | 0 | |

**Still not fully automated:**
- Entitlement status variants (`pending`, `suspended`, `revoked`) — no dedicated QA accounts
- Worksheet subject grant matrix (403 without grant) — not re-run in this pass
- Browser-only manual QA items (see §4)

---

## 3. Build result

```
npm run build
```

**PASS** — production build completed successfully (pre-existing metadata-scanner warnings only).

**Note:** Do not run `npm run build` while `npm run dev` is active on the same `.next` folder — it corrupts the dev server cache. Restart dev after build if both are needed.

---

## 4. Manual QA checklist (plan §12.2)

Legend: ✅ verified (API/runtime) · ⚠️ partial · ⬜ browser/manual only

| Item | Status |
|------|--------|
| Parent reaches dashboard / list-students | ✅ API 200 |
| Parent add child within max_children | ⚠️ limit=50 exposed; create not re-tested at cap |
| Parent report when reports_enabled | ✅ gate exists; copilot blocked when disabled |
| Parent copilot copilot_enabled flag | ✅ 403 `feature_not_enabled` |
| Parent cannot access teacher APIs | ✅ 403 `not_a_teacher` |
| Private teacher dashboard + create student/class | ✅ 201 |
| Private teacher subject activity grant | ⬜ browser/manual |
| School teacher dashboard | ✅ 200 |
| School teacher cannot private student/class | ✅ 403 `school_teacher_no_private_access` |
| School teacher cannot credential admin | ✅ 403 `not_authorized` |
| School manager credential list | ✅ 200 |
| School manager cannot admin APIs | ✅ 403 |
| School manager /me | ✅ 200 |
| Platform admin schools API | ✅ 200 via `office@leo.com` |
| Cross-persona bearer blocked | ✅ F + J groups |
| Guardian PIN flow | ⚠️ API responds 401 (fixture creds); no 503 |
| Student login | ⬜ not probed (separate PIN flow) |
| Hebrew text unchanged | ✅ no Hebrew lines in login/dashboard diff |
| Login page design preserved | ✅ additive JS guards only (+6 lines login.js) |
| School operator invite + no-grant block | ✅ `qa-school-operator@leo-k.com` |
| Operator grant/revoke + audit | ✅ I2–I4 groups |
| Operator forbidden actions | ✅ activities/subjects/admin/other school/quotas |

---

## 5. Persona boundary summary

| Persona | Account tested | Boundary verified |
|---------|----------------|-------------------|
| Parent | `admin@admin.com` | Parent APIs 200; teacher/school/admin blocked |
| Private teacher | `teacher@leo.com` | Private create 201; parent/school/admin blocked |
| School teacher | `dan@leo-k.com` | Dashboard 200; private create + credentials blocked |
| School manager | `school@leo-k.com` | School APIs 200; admin + private blocked |
| Platform admin | `office@leo.com` | Admin schools 200; entitlements active |
| School operator | `qa-school-operator@leo-k.com` | Grants matrix I–I4; forbidden actions blocked |
| Guardian | API probe | Login endpoint alive; no parent copilot without parent auth |
| Student | — | Not in HTTP matrix (PIN session separate) |

**Important:** `admin@admin.com` is the QA **parent** account (parent entitlement only). Platform admin is `office@leo.com` / `office@leo-k.com`.

---

## 6. Quota verification

### Read-only (demo school `bb4e5984-…`)

| Quota | Observation |
|-------|-------------|
| `max_children` | Parent list exposes `studentLimit=50`, count=14 |
| Private teacher limits | `teacher_limits.plan_code=teacher_basic_20`, active |
| `max_school_teachers` | Demo school: 11/15 |
| `max_school_managers` | 1/1 (at cap by count) |
| `max_school_students` | 398/500 |
| `max_school_operators` | 1/5 after QA operator seed |

### At-limit enforcement (admin PATCH → probe → restore)

All executed via approved admin/school APIs only; quotas restored after each probe.

| Quota | Method | Expected code | Result |
|-------|--------|---------------|--------|
| `max_school_operators` | Manager invite when at cap | `school_operator_quota_exceeded` | ✅ 400 |
| `max_school_teachers` | Admin assign-teacher when at cap | `school_teacher_quota_exceeded` | ✅ 400 |
| `max_school_managers` | Admin assign-manager (second manager) | `school_manager_quota_exceeded` | ✅ 400 |
| `max_school_students` | Manager enroll when at cap | `school_student_quota_exceeded` | ✅ 400 |

---

## 7. Operator grants (Groups I–I4)

**Result: PASS** — QA operator seeded via `POST /api/school/operators` under demo school.

| Step | Verification |
|------|--------------|
| Invite | ✅ 201; membership + entitlement + grants row (both false) |
| No grants | ✅ credential + report → 403 `operator_grant_required`; operator list → 403 `not_a_school_manager` |
| `student_access_admin` only | ✅ accounts 200; report 403; `grant_student_access_admin` audit row |
| `student_data_viewer` only | ✅ report 200; accounts 403; `grant_student_data_viewer` audit row |
| Both grants | ✅ accounts + report 200 |
| Revoke each | ✅ capability blocked again; `revoke_*` audit rows |
| Forbidden | ✅ no activity create (404 `teacher_profile_missing`), no subject assign, no admin API, no quota PATCH, other-school student blocked |

---

## 8. Hebrew / login design audit

- `pages/parent/login.js`: +6 lines — session role check only; **no Hebrew string changes**
- `pages/parent/dashboard.js`: redirect on `not_a_parent` only; **no Hebrew string changes**
- `pages/teacher/login.js`: **unchanged** in this implementation

---

## 9. Failures and fixes this pass

| Issue | Resolution |
|-------|------------|
| Group I skipped (no operator) | Added `tests/auth/role-boundary-operator-verification.mjs`; seeds `qa-school-operator@leo-k.com` |
| Admin auth picked wrong email | Prefer `office@leo.com`; try all admin candidates |
| Intermittent `fetch failed` / ETIMEDOUT | Default base URL `localhost:3001`; fetch retry (3 attempts) |
| Activity create returned 404 not 403 | Operator lacks `teacher_limits` row — treated as blocked (non-2xx) |
| Integration lost operator results on throw | Merge `operatorResults` in `finally` block |

No application code fixes required for post-SQL verification failures.

---

## 10. Commands run

```
npm run dev                          # port 3001
node --test tests/auth/persona-entitlement-foundation.test.mjs
node --env-file=.env.local --env-file=.env.e2e.local tests/auth/role-boundary-integration-matrix.mjs
node --env-file=.env.local --env-file=.env.e2e.local tests/auth/role-boundary-operator-verification.mjs
npm run build
git status --short
git diff --stat
node scripts/create-delivery-zip.mjs
```

---

## 11. Confirmations

- SQL executed by Cursor: **None**
- Commit / push / deploy: **None**

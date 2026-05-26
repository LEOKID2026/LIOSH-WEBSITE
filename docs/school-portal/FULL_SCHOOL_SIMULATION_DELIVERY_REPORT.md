# Full School Simulation — Final Delivery Report

**Date:** 2026-05-26  
**Status:** **COMPLETE** (all automated gates + browser smoke passed)  
**Demo school ID:** `bb4e5984-d95f-438f-a465-e1a8208ea7de`  
**Model:** 18 physical classes × 6 separate subjects = **108** class records; **398** students; **2,388** `teacher_class_students`; **0** `teacher_students`

Runtime passwords used via shell env only (`leo7479`) — **not committed**.

---

## Fixes applied in this delivery pass

| Issue | Fix |
|-------|-----|
| Overlapping simulation processes | Stopped all `run-school-nightly-simulation` PIDs; enforced single process |
| `--mode=seed-history` parsed as advance | Fixed `parseArgs()` to support `--mode=seed-history` and `--days=10` |
| Archived activities blocked re-seed | `reset-demo-school-activities.mjs` now **deletes** activities; `findExistingActivity` ignores archived |
| Slow seed-history | Batched `classroom_activity_student_status` + `classroom_activity_attempts` inserts; fixed `score_pct` column name |
| Count drift after T13–T16 | Operational script reverses via **API** (transfer/reassign); archive uses `unarchiveSchoolClass`; strict `assertDemoSchoolBaseline` after each check |
| Security matrix moved demo manager | T2 uses throwaway `school-qa-a@leo.com` only; blocks all `@leo-k.com` demo accounts |
| Baseline restore | New `restore-demo-school-baseline.mjs` rebuilds exact 108/398/2388 + manager isolation |

---

## Phase 7 execution commands

Shell env for all steps:

```powershell
$env:DEMO_TEACHER_PASSWORD="leo7479"
$env:DEMO_PARENT_PASSWORD="leo7479"
$env:SCHOOL_QA_PASSWORD="leo7479"
```

### Pre-flight — **PASS**

```powershell
node --env-file=.env.local scripts/school-portal/verify-demo-school-preflight.mjs
```

```json
{ "ok": true, "migration027": true, "phase0AuditGate": true, "existingDemoSchool": "bb4e5984-d95f-438f-a465-e1a8208ea7de" }
```

### Seed phases — **PASS**

```powershell
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=accounts
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=memberships
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=classes
node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=students
```

| Metric | Result |
|--------|--------|
| Subject-class records | **108** (6 subjects, not grouped) |
| Students | **398** |
| `teacher_class_students` | **2,388** |
| `teacher_students` | **0** |

### Baseline restore (before history + after test drift) — **PASS**

```powershell
node --env-file=.env.local scripts/school-portal/restore-demo-school-baseline.mjs
```

### Activity reset (clean history start) — **PASS**

```powershell
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
```

### Seed 10-day history — **PASS** (single process)

```powershell
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=seed-history --days=10
```

*(Day 1 was seeded in an earlier partial run; days 2–10 completed in one run.)*

```json
{ "mode": "seed-history", "days": 9, "activitiesCreated": 972 }
```

Combined with day 1: **1,080** classroom activities for school days 1–10.

### T8 live advance — **PASS** (single process, after history)

```powershell
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance
```

```json
{ "mode": "advance", "activities": 108, "schoolDay": 11 }
```

---

## Final `sim-state.json`

| Field | Value |
|-------|-------|
| `schoolId` | `bb4e5984-d95f-438f-a465-e1a8208ea7de` |
| `currentSchoolDay` | **11** |
| `lastRunAt` | `2026-05-26T19:48:57.062Z` |
| Simulation processes running | **0** |

---

## Final DB counts

| Metric | Expected | Actual |
|--------|----------|--------|
| Active `teacher_classes` (demo school) | 108 | **108** |
| `school_student_enrollments` | 398 | **398** |
| `teacher_class_students` (active) | 2388 | **2388** |
| `teacher_students` (demo teachers) | 0 | **0** |
| `classroom_activities` (non-archived, demo school) | ~1080 + 108 (T8) | **1188** |
| Manager `school_admin` memberships | demo school only | **`bb4e5984-...` only** |

---

## 16-test suite — exact results

| Test | Command | Result |
|------|---------|--------|
| **T1** | `npm run build` | **PASS** (exit 0, prior run this session) |
| **T2** | `SCHOOL_SECURITY_TEST_PASSWORD=leo7479 node --env-file=.env.local scripts/school-portal/school-portal-security-matrix.mjs` | **PASS** 27/27 — uses `school-qa-a@leo.com`, demo manager untouched |
| **T3** | `node --env-file=.env.local scripts/school-portal/verify-school-aggregation.mjs bb4e5984-d95f-438f-a465-e1a8208ea7de` | **PASS** — `activeClassCount=108`, `studentCount=398`, `enrolledStudentCount=398` |
| **T4** | `SCHOOL_QA_SCHOOL_ID=bb4e5984-... SCHOOL_QA_MANAGER_EMAIL=school@leo-k.com SCHOOL_PORTAL_BASE_URL=http://localhost:3000 node ... compare-teacher-vs-school-apis.mjs` | **PASS** — manager APIs 200; classes=108, students=398 |
| **T5** | `node ... audit-school-data-truth.mjs bb4e5984-...` | **PASS** — 108 classes, 2388 links, 398 enrollments, 0 `teacher_students` |
| **T6** | `SCHOOL_QA_EMAIL=school@leo-k.com SCHOOL_QA_PASSWORD=leo7479 node ... verify-school-manager-login-flow.mjs` | **PASS** — demo school `bb4e5984-...` |
| **T7** | `node ... run-school-nightly-simulation.mjs --mode=advance --dry-run` | **PASS** — `plannedActivities: 108` |
| **T8** | `node ... run-school-nightly-simulation.mjs --mode=advance` | **PASS** — 108 created, `schoolDay: 11`, exit 0 |
| **T9** | Playwright owner admin | **PASS** |
| **T10** | Playwright school manager | **PASS** |
| **T11** | Playwright dan/michal/liron | **PASS** |
| **T12** | Private teacher regression (via T2) | **PASS** |
| **T13** | `verify-school-operational-controls.mjs --check=transfer` | **PASS** + baseline restored |
| **T14** | `--check=reassign` | **PASS** + baseline restored |
| **T15** | `--check=archive` | **PASS** + baseline restored |
| **T16** | `--check=audit-log` | **PASS** |

### T9–T11 browser command

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
$env:SCHOOL_QA_EMAIL="school@leo-k.com"
$env:DEMO_TEACHER_PASSWORD="leo7479"
$env:DEMO_SCHOOL_ID="bb4e5984-d95f-438f-a465-e1a8208ea7de"
$env:ADMIN_PORTAL_PASSWORD="leo7479"
node --env-file=.env.local ./node_modules/@playwright/test/cli.js test tests/e2e/demo-school-simulation-smoke.spec.ts --project=chromium
```

**Result:** 3 passed (T9 owner `/admin/schools` → demo school; T10 manager dashboard/classes/teachers/students + reports with 108/398; T11 dan/michal/liron class scope + `/school/*` 403)

### T13–T16 command

```powershell
$env:SCHOOL_API_BASE_URL="http://localhost:3000"
$env:SCHOOL_QA_PASSWORD="leo7479"
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=all
```

**Result:** transfer OK → reassign OK → archive OK → audit-log OK (10 entries) → `all OK`; post-check baseline **108/398/2388**.

---

## New / updated artifacts

| File | Purpose |
|------|---------|
| `scripts/school-portal/restore-demo-school-baseline.mjs` | Exact baseline restore (108/398/2388 + manager isolation) |
| `scripts/school-portal/demo-school-lib.mjs` | `assertDemoSchoolBaseline()`, `DEMO_BASELINE` |
| `scripts/school-portal/school-portal-security-matrix.mjs` | Throwaway QA accounts only (`school-qa-a@leo.com`) |
| `scripts/school-portal/verify-school-operational-controls.mjs` | API-level self-reversal + strict baseline assert |
| `scripts/school-portal/run-school-nightly-simulation.mjs` | Fixed arg parsing, batch inserts, progress logs |
| `scripts/school-portal/reset-demo-school-activities.mjs` | Hard-delete activities (not archive-only) |
| `lib/school-server/school-operations.server.js` | Added `unarchiveSchoolClass()` |
| `tests/e2e/demo-school-simulation-smoke.spec.ts` | T9–T11 demo school browser smoke |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| 108 separate subject-class records | **PASS** |
| 398 students, 6 links each (2388) | **PASS** |
| No `teacher_students`-only model | **PASS** |
| Phase 0 audit gate | **PASS** |
| 10-day history (`currentSchoolDay=10`) | **PASS** (now 11 after T8) |
| ~1080 history activities | **PASS** (1080) |
| T8 +108 activities | **PASS** (1188 total) |
| Single simulation process at a time | **PASS** |
| T13–T16 self-reverse without drift | **PASS** |
| T2 does not mutate demo manager | **PASS** |
| Full 16-test suite | **PASS** |
| No commit / push | **CONFIRMED** |

---

## Login reference (QA)

| Role | Email | Password (runtime) |
|------|-------|-------------------|
| School manager | `school@leo-k.com` | `leo7479` |
| Teachers | `dan@leo-k.com`, `michal@leo-k.com`, `liron@leo-k.com`, … | `leo7479` |
| Security matrix manager A | `school-qa-a@leo.com` | `SCHOOL_SECURITY_TEST_PASSWORD` |

# Parent ↔ Student Ownership Boundary Plan

**Generated:** 2026-05-23
**Risk rows:** R-OWN-01 (P1), R-OWN-02 (P1), R-RLS-01 (P1)
**Companion to:** [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md), [SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md](./SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md)

## Goal

Provide a concrete, exhaustive cross-tenant test plan focused on the parent ↔ student ownership boundary. The [authorization plan](./AUTHORIZATION_AUDIT_PLAN.md) covers the broad escalation matrix; this doc zooms into ownership specifically and is written so it can be lifted directly into a Playwright suite.

## Persona pool (re-use existing 12-student fixture)

- 6 grades × 2 students per grade ⇒ 12 students.
- All 12 currently belong to the same parent (per closure-control map). For ownership tests, we must add a **second parent** with at least 1 student of their own.

> **Action for owner decision:** create one *additional* parent (`P2`) with one student (`P2-S1`) for ownership tests, separate from the closed 12-student fixture. This is **test-only data** and lives in a non-production project. Tracked in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).

## Boundary map

| Boundary | Direction | Surface |
|----------|-----------|---------|
| Parent A → Parent B's student | parent A bearer reads/writes parent B child | every `/api/parent/*` |
| Student in Parent A → Student in Parent B | student session for A reads B's data | every `/api/student/*`, `/api/learning/*`, `/api/arcade/*` |
| Parent A → Parent A's other student | scoping consistency | sanity |
| Student in Parent A → Sibling student in Parent A | scoping consistency | sanity |
| Anonymous → any | unauth | every authenticated route |

## Test cases

### A. Parent ↔ Parent

| # | Scenario | Expected |
|---|----------|----------|
| O-PAR-1 | P1 lists students | only P1's students |
| O-PAR-2 | P1 reads `report-data?studentId=P2-S1` | 403 / 404, no schema leak |
| O-PAR-3 | P1 sends `update-student` body `{studentId: P2-S1, name: "X"}` | 403; P2-S1 unchanged in DB |
| O-PAR-4 | P1 sends `delete-student` body `{studentId: P2-S1}` | 403; P2-S1 row exists |
| O-PAR-5 | P1 sends `create-student-access-code` body `{studentId: P2-S1}` | 403; PIN unchanged |
| O-PAR-6 | P1 sends Copilot turn body `{studentId: P2-S1}` | 403, OR if accepted, response must not contain P2-S1 data (server rebuild filters) |

### B. Student ↔ Student (cross-parent)

| # | Scenario | Expected |
|---|----------|----------|
| O-STU-1 | P1-S1 logs in, calls `/api/student/me` | only own profile |
| O-STU-2 | P1-S1 calls `/api/learning/answer` for a session that belongs to P2-S1 (crafted body) | 403, row not written |
| O-STU-3 | P1-S1 calls `/api/learning/planner-recommendation` body `{studentId: P2-S1}` | 403 |
| O-STU-4 | P1-S1 calls `/api/arcade/balance` claiming P2-S1 | 403, never returns P2-S1 balance |
| O-STU-5 | P1-S1 calls `/api/arcade/rooms/{room owned by P2-S1}/snapshot` | 403 |

### C. Student ↔ Student (intra-parent — same parent's children)

| # | Scenario | Expected |
|---|----------|----------|
| O-STU-6 | P1-S1 calls any student API with crafted body claiming P1-S2's id | 403 |
| O-STU-7 | P1's own dashboard correctly shows both children | 200 |

### D. Anonymous

| # | Scenario | Expected |
|---|----------|----------|
| O-ANON-1 | call any `/api/parent/*` without bearer | 401 |
| O-ANON-2 | call any `/api/learning/*` without student cookie | 401 |
| O-ANON-3 | call any `/api/arcade/*` without student cookie | 401 |

### E. Cross-bearer / cross-cookie

| # | Scenario | Expected |
|---|----------|----------|
| O-MIX-1 | P1 bearer used on `/api/student/*` (which expects student cookie) | 401 / 403 |
| O-MIX-2 | P1-S1 student cookie used on `/api/parent/*` (which expects parent bearer) | 401 / 403 |

## What "expected" means precisely

- 401 if no credentials supplied.
- 403 if credentials valid but caller lacks ownership.
- 404 may be substituted for 403 to avoid leaking row existence (preferred for `report-data`, `update-student`, `delete-student`, Copilot).
- A 200 with empty / wrong-tenant data is a **failure** even if the data appears innocuous.

## Artifact

`reports/security/ownership-matrix-<date>.json` and `.md`, capturing every row above as PASS / FAIL.

## Acceptance for next fix pass (ownership slice)

- All rows above PASS.
- The matrix is wired into nightly (or at minimum daily-gate launch readiness).
- Every Parent or Student API stamps the identifying ID **from the token, not the body**, or verifies body-supplied IDs against the token.
- R-OWN-01, R-OWN-02 may move to `fixed` once the matrix artifact is captured.

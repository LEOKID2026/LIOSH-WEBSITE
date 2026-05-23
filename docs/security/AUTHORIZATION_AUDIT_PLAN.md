# Authorization Audit Plan (IDOR / vertical / horizontal escalation)

**Generated:** 2026-05-23
**Companion to:** [API_ROUTE_SECURITY_INVENTORY_PLAN.md](./API_ROUTE_SECURITY_INVENTORY_PLAN.md), [PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md](./PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md)
**Risk rows:** R-OWN-01, R-OWN-02, R-RLS-01, R-AUTH-02, R-DEV-01, R-DEV-02, R-COPILOT-02

## Goal

Define the **authorization test matrix** that the next fix pass must run before public launch. **Plan only — no tests run here.**

## Threat shapes

- **Horizontal escalation (parent ↔ parent).** Parent A reads/modifies parent B's children, reports, copilot output.
- **Horizontal escalation (student ↔ student under same parent).** Student A reads/modifies student B's data.
- **Horizontal escalation (student ↔ student across parents).** Student A in parent X reads/modifies student in parent Y.
- **Vertical escalation (student → admin).** Student session reaches admin/dev surfaces.
- **Vertical escalation (parent → admin).** Parent bearer reaches admin/dev surfaces.
- **Identity confusion via body.** Caller supplies `studentId` / `parentId` in the body; server uses it without verifying ownership.

## Test matrix (target: all green before public)

| # | Surface | Caller | Target | Expected | Rationale |
|---|---------|--------|--------|----------|-----------|
| H-PAR-1 | `/api/parent/list-students` | parent A bearer | (server returns) | only parent A's students | R-OWN-01 |
| H-PAR-2 | `/api/parent/students/{B's studentId}/report-data` | parent A bearer | parent B's child | 403 / 404 (no leakage of existence) | R-OWN-01 |
| H-PAR-3 | `/api/parent/update-student` body `{studentId: B}` | parent A bearer | parent B's child | 403 / 404 | R-OWN-01 |
| H-PAR-4 | `/api/parent/delete-student` body `{studentId: B}` | parent A bearer | parent B's child | 403 / 404 | R-OWN-01 |
| H-PAR-5 | `/api/parent/copilot-turn` body `{studentId: B}` | parent A bearer | parent B's child | 403; if accepted, response must not contain B's data | R-COPILOT-02 |
| H-STU-1 | `/api/learning/answer` | student A | crafted to write into student B's session | 403; row not written under B's id | R-OWN-02, R-RLS-01 |
| H-STU-2 | `/api/arcade/rooms/{room belonging to others}/snapshot` | student A | observe room they did not join | 403 | R-OWN-02 |
| H-STU-3 | `/api/student/me` | student A | (server returns) | only A's profile | R-OWN-02 |
| H-STU-4 | `/api/learning/planner-recommendation` body `{studentId: B}` | student A | another student | 403 | R-OWN-02 |
| H-STU-X | cross-parent: student A logs in, hits any route addressing parent Y's child | student A session | parent Y's data | 403 / 404 | R-OWN-02 |
| V-STU-1 | `/api/parent/list-students` | student A session (no parent bearer) | parent surface | 401 | vertical |
| V-STU-2 | `/api/student/dev-add-coins` | any student session in production | top-up | 404 (route disabled in prod) | R-DEV-01 |
| V-STU-3 | `/api/dev-student-simulator/login` in production | any caller | dev login | 404 | R-DEV-02 |
| V-STU-4 | `/api/learning-simulator/engine-review-pack-status` without admin token | any caller | admin pack | 401 / 403 | R-AUTH-02/03 |
| V-PAR-1 | `/api/learning-simulator/*` with parent bearer (no admin token) | parent | admin pack | 401 / 403 | R-AUTH-02 |
| V-OPS-1 | `/api/admin/monthly-persistence-award` without admin token | any caller | admin op | 401 / 403 | R-AUTH-03 |
| ID-1 | every `studentId`-bearing API | authenticated valid caller | own studentId | 200 | sanity |
| ID-2 | every `studentId`-bearing API | authenticated caller | non-existent studentId | 404 (no info disclosure) | IDOR baseline |

## How tests should be expressed

- Implement as Playwright fixtures + direct `fetch()` against the dev server on `localhost:3001` using the existing two-students-per-grade persona pool.
- Persist a JSON artifact under `reports/security/authz-matrix/<date>/`.
- Each row produces `{caller, target, status, body_excerpt, expected_match: bool}`.
- A single failure = launch blocker.

## Evidence required for "fixed"

A row in the [register](./SECURITY_RISK_REGISTER.md) may move to `fixed` only when:
1. The corresponding matrix row produced `expected_match: true` in a recorded artifact.
2. The fix is committed.
3. The matrix is wired into a CI gate (or at minimum the daily nightly track).

## Notes / planning-only constraints

- **Do not run** these tests in this pass.
- **Do not** implement the fixtures yet.
- This doc is the *definition of done* for the next fix pass on authorization.

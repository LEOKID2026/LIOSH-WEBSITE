# Ownership boundary HTTP matrix — scaffold

**Status:** contract + unit selftests only. Full cross-parent HTTP tests require owner decision **D-OWNERSHIP-1** (second test parent fixture).

## Covered by existing handler logic (code review + selftests)

| Case | Surface | Expected | Implementation |
|------|---------|----------|----------------|
| Parent student cap | `/api/parent/create-student` | normal parent max 3; `admin@admin.com` max 50 | `lib/parent-server/parent-student-limit.server.js` |
| Student session + foreign `studentId` in Copilot body | `/api/parent/copilot-turn` | 403 | `authorizeRequest` in `pages/api/parent/copilot-turn.js` |
| Parent bearer + foreign `studentId` | `/api/parent/copilot-turn` | 404 | parentClient ownership query |
| Student answer for foreign session | `/api/learning/answer` | 403 | `verifyLearningSessionOwnership` |
| Parent report for foreign student | `/api/parent/students/[studentId]/report-data` | 403/404 | parent bearer + parent_id filter |

## Pending HTTP fixture (do not run against production)

| Case | Blocker |
|------|---------|
| Parent A reads Parent B report | needs second parent account (D-OWNERSHIP-1) |
| Student A writes as Student B | needs two students under different parents in test env |

Run `node scripts/security/wave1-security-selftest.mjs` for module-level checks.

## Wave 2A HTTP matrix scaffold

`scripts/security/ownership-boundary-http-matrix.mjs` lists cross-tenant cases for D-OWNERSHIP-1. Does not run HTTP without owner fixtures. QA parent cap cases preserve `admin@admin.com` → 50 rule.

## Wave 2B HTTP matrix

Same script now reports `MATRIX_STATUS: PENDING | READY | PASS | FAIL | PARTIAL`. Live HTTP only with `--execute` and shell-exported fixtures (not `.env` files). Student learning-profile cross-tenant case covered by static audit (session-only identity).

## Wave 2H HTTP matrix + static closure

`ownership-boundary-http-matrix.mjs` includes **8 static ownership cases** (run on `--dry-run` / `--static-audit`). `wave2h-ownership-boundary-selftest.mjs` verifies cap rules + critical route patterns.

| Layer | Status |
|-------|--------|
| Static audit (8 cases) | **PASS** |
| Live HTTP `--execute` | **PENDING** — `OWNERSHIP_TEST_PARENT_A_BEARER`, `OWNERSHIP_TEST_PARENT_B_BEARER`, `OWNERSHIP_TEST_STUDENT_A_ID`, `OWNERSHIP_TEST_STUDENT_B_ID` (+ cookie/session B for student case) |

Evidence: [wave-2h-ownership-rls-boundary-closure.md](../../reports/security/wave-2h-ownership-rls-boundary-closure.md)

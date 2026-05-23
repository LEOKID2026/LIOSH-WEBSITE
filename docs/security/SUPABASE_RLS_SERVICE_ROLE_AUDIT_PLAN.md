# Supabase RLS + Service-Role Audit Plan

**Generated:** 2026-05-23
**Companion to:** [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) (R-RLS-01, R-RLS-02, R-OWN-01..02, R-ENV-01)
**Constraint:** read-only audit. **No live writes. No RLS migrations.**

## Goal

Reach a state where every Supabase table involved in child data has:

1. RLS **enabled** at the table level.
2. Policies that enforce parent/student scoping **at the row level** (defense-in-depth, even if the API filter is correct).
3. Service-role usage minimized to only operations that genuinely require it.
4. A documented inventory of which API code paths use service-role.

## Read-only inventory (next fix pass produces these artifacts)

| Artifact | Source | Purpose |
|----------|--------|---------|
| `reports/security/rls-table-policy-snapshot-<date>.json` | Supabase MCP / SQL `select * from pg_policies` | snapshot of enabled tables + policy bodies |
| `reports/security/service-role-usage-<date>.md` | grep `service_role`, `supabaseAdmin`, `LEARNING_SUPABASE_SERVICE_ROLE_KEY` references | every server file using service role |
| `reports/security/rls-audit-summary-<date>.md` | derived | mapping of `<table>` → `<API routes>` → `<policy verdict>` |

## Tables expected to be in scope (working list — verify in next pass)

- Parent ↔ student linkage tables (parent_id FK).
- Learning sessions / answers / mastery.
- Arcade balances / rooms.
- Any access-code / login-attempt table (if implemented).

> **Note:** the exact table names live in `lib/learning-supabase/*` and are not enumerated in this planning pass to avoid duplicating implementation detail.

## Audit method (read-only, per table)

For each table T:

1. **RLS enabled?** Check `rls_enabled` flag.
2. **Default-deny?** Confirm there is no overly broad policy (`USING (true)`).
3. **Parent path:** policy expression must require `auth.uid() = parent_id` (or join through a verified linkage view) for SELECT/UPDATE/DELETE.
4. **Student path:** if the table is read by a student session, document how the student identity is mapped to a Supabase identity (or whether all student calls go through service-role with app-layer filter, in which case **R-RLS-01** applies and the API filter must be exhaustively tested).
5. **INSERT path:** confirm `parent_id` / `student_id` cannot be set to a foreign value via crafted body.
6. **Service-role bypass:** if the API uses service-role, the API path must enforce ownership in code AND there must be a future migration plan to use anon-with-RLS where possible.

## Service-role usage classification

| Class | Definition | Action |
|-------|-----------|--------|
| **Necessary** | Cross-row aggregations the parent does not have RLS access to (e.g. internal stats not exposed to parent). | Keep, document. |
| **Substitutable** | A user-scoped client with proper RLS could do the job. | Migrate in next fix pass; lower R-RLS-01 severity once done. |
| **Anti-pattern** | Service-role on a per-request user action (login, answer) without exhaustive ownership tests. | Add tests now (per [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md)); migrate when feasible. |

Initial mapping (from [auth-security-readonly-audit.md §7](../auth-security-readonly-audit.md)):

| API path | Current usage | Class (initial guess; confirm) |
|----------|---------------|-------------------------------|
| `/api/student/login` | service-role to verify PIN + issue session | Necessary (cross-table during login) |
| `/api/learning/session/start`, `/answer`, `/finish` | service-role for session writes | Substitutable / Anti-pattern (depends on RLS policy state) |
| `/api/parent/students/[studentId]/report-data` | service-role for read | Substitutable (parent client could read with RLS) |
| `/api/arcade/*` | service-role for state | Substitutable |
| `lib/arcade/server/arcade-auth.js` | service-role for arcade-auth | Substitutable |

## Service-role key handling

- `LEARNING_SUPABASE_SERVICE_ROLE_KEY` must be **server-only**, never `NEXT_PUBLIC_*`.
- Confirm via grep that no client bundle imports a module that references it.
- Rotation policy: see [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) and [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) "credential leak" runbook.

## Acceptance for next fix pass (RLS slice)

- All tables holding child data have RLS enabled with policies inspected and recorded in the snapshot artifact.
- Service-role usage downgraded to **Necessary** wherever feasible.
- The remaining service-role calls have an automated cross-tenant test in [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md) that returns `expected_match: true` for every row.
- A single migration plan published under `docs/security/` (next pass), not in this planning pass.

## Existing complementary scripts

- [`npm run verify:learning-rls`](../../package.json) — already exists; treat as smoke-only baseline.
- [`npm run verify:learning-supabase-env`](../../package.json) — already exists; verifies env presence.

These do not replace the policy snapshot above; they only confirm the env+RLS basics are not regressed.

# Security Master Plan

**Generated:** 2026-05-23
**Status:** documentation/planning only — **no code changes in this pass**.
**Scope override:** does not reopen any area marked `CLOSED` or `CLOSED-WATCH` in [docs/FINAL_PRODUCT_CLOSURE_MAP.md](../FINAL_PRODUCT_CLOSURE_MAP.md). The "K. Security / Privacy" area there is `CLOSED-WATCH + partial OPEN`; this plan operationalizes the partial-OPEN portion.

## Goal

Produce a complete, actionable security planning package that gives a clear next step for security hardening, **without reopening any closed product area** (curriculum, question banks, diagnostic engine, parent report engine, deterministic Copilot, 12 QA accounts, parent linkage, Hebrew UI/content, in-progress nightly).

## Owner-deferred ENV decision (2026-05-23)

**ENV / secrets / Vercel-env work is intentionally postponed to a dedicated final pre-launch phase.** Specifically, the owner has decided:

- No `.env`, `.env.local`, `.env.example`, or other `.env*` file may be edited as part of any current security fix wave.
- No Vercel environment variable may be added, renamed, removed, or rotated as part of any current security fix wave.
- No env flag's name, value, semantics, or product-behavior effect may be changed now.
- No secret or token rotation now.
- No production / preview env settings changes now.

This decision **does not** mean the ENV-side risk is accepted or waivered. It means execution is **sequenced** to a later phase named **Final Pre-Launch ENV Review / Rotation / Vercel Verification**. Until that phase opens:

1. The ENV-side risks (R-ENV-01, R-COPILOT-01 verification, R-COPILOT-03 verification, R-AUTH-02 flag-authority semantics, R-VERCEL-01 env-side checks) are tagged in [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) with execution status **`DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION`**.
2. Public launch is **blocked** until the Final ENV phase resolves them.
3. A controlled pilot may proceed only with an **explicit owner waiver** for these specific deferred items, captured in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).

Current security hardening work continues in parallel **without** any ENV modifications. The non-ENV portion is scheduled as **Wave 1 — Non-ENV Pilot Security Hardening** in [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md).

## Working principles

1. **Single source of risks.** [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) is the only place where severity, pilot impact, public impact, state, and owner-decision flag are recorded. Other docs reference `R-*` IDs.
2. **Banded gating.**
   - **Pilot launch** (closed tester pool ≤ 50, monitored) — different bar than public.
   - **Public launch** — strict bar; all P0 must be fixed and verified.
   - **Defer with owner waiver** — explicitly listed where applicable.
3. **Evidence or no claim.** "suspected" means the risk is not yet confirmed; the plan tells *how* to confirm read-only without product changes.
4. **No heavy QA in planning.** No live Supabase writes, no production probes from this pass. Confirmation steps are read-only and bounded.
5. **Practical, not duplicated.** Each sub-doc covers one slice; no row text duplicated across docs.

## Pilot vs public, in one table

| Item | Pilot (closed, ≤50) | Public launch |
|------|---------------------|---------------|
| All **P0** in [register](./SECURITY_RISK_REGISTER.md) | accept-risk-with-mitigation only with mitigation evidence (e.g. dev routes 404 in production env, copilot client-payload flag verified off) | **block** — every P0 must be `fixed` |
| **P1** (rate-limit, RLS service-role, ownership tests, headers, CSRF/CORS, child-data privacy, deps, Vercel) | accept-risk-with-mitigation; explicit owner waiver per row | fix-before |
| **P2** | accept | accept; track in next-fix-pass backlog |
| **P3** | accept | accept |

## Document map (25 + 1 summary)

| # | Doc | Slice |
|---|-----|-------|
| 1 | [SECURITY_MASTER_PLAN.md](./SECURITY_MASTER_PLAN.md) | this index |
| 2 | [SECURITY_DATA_INVENTORY.md](./SECURITY_DATA_INVENTORY.md) | data classes, sensitivity, retention |
| 3 | [THREAT_MODEL.md](./THREAT_MODEL.md) | actors + STRIDE-lite per surface |
| 4 | [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) | **authoritative ranked risks** |
| 5 | [API_ROUTE_SECURITY_INVENTORY_PLAN.md](./API_ROUTE_SECURITY_INVENTORY_PLAN.md) | every API route + required auth |
| 6 | [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md) | IDOR / vertical / horizontal escalation |
| 7 | [SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md](./SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md) | RLS + service-role inventory |
| 8 | [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md) | dev/admin/simulator lockdown |
| 9 | [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md) | per-route caps + brute-force |
| 10 | [COOKIE_SESSION_CSRF_AUDIT_PLAN.md](./COOKIE_SESSION_CSRF_AUDIT_PLAN.md) | cookie flags + session + CSRF |
| 11 | [XSS_INPUT_OUTPUT_AUDIT_PLAN.md](./XSS_INPUT_OUTPUT_AUDIT_PLAN.md) | dangerouslySetInnerHTML + Hebrew render |
| 12 | [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md) | CSP + headers |
| 13 | [CORS_ORIGIN_AUDIT_PLAN.md](./CORS_ORIGIN_AUDIT_PLAN.md) | origin allowlist |
| 14 | [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) | env flag classification + rotation |
| 15 | [PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md](./PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md) | cross-tenant matrix |
| 16 | [PARENT_REPORT_PRIVACY_AUDIT_PLAN.md](./PARENT_REPORT_PRIVACY_AUDIT_PLAN.md) | raw-key + narrative + screenshot privacy |
| 17 | [PARENT_COPILOT_SECURITY_PLAN.md](./PARENT_COPILOT_SECURITY_PLAN.md) | 422 invariant + scope-leak + short-report off |
| 18 | [LOGGING_ARTIFACT_PRIVACY_PLAN.md](./LOGGING_ARTIFACT_PRIVACY_PLAN.md) | reports/ retention + PII in logs |
| 19 | [PUBLIC_SURFACE_SECURITY_PLAN.md](./PUBLIC_SURFACE_SECURITY_PLAN.md) | `/`, `/contact`, gallery, game hubs |
| 20 | [DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md](./DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md) | npm audit + lockfile + transitive |
| 21 | [VERCEL_DEPLOYMENT_SECURITY_PLAN.md](./VERCEL_DEPLOYMENT_SECURITY_PLAN.md) | env separation + preview policy |
| 22 | [PRIVACY_COOKIES_CHILD_DATA_PLAN.md](./PRIVACY_COOKIES_CHILD_DATA_PLAN.md) | child data + parental consent + cookie banner |
| 23 | [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) | leak / abuse / CVE / rollback playbooks |
| 24 | [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md) | pilot + public signoff gates |
| 25 | [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md) | 5-section executive summary |

## Out of scope for this planning pass

- Changes to product code, Hebrew UI/content, diagnostic engine, parent report engine, question banks, Copilot logic.
- Changes to the in-progress nightly 12-student simulation.
- Live Supabase writes or RLS changes.
- Heavy QA reruns or live security scans.
- Reopening curriculum, child-world MVP, or any `CLOSED` area.

## Hand-off after this pass

The summary report ([reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md)) ranks a **next fix pass** by risk, and identifies the **owner decisions** that must precede that fix pass.

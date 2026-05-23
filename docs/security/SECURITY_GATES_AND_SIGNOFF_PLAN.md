# Security Gates + Signoff Plan

**Generated:** 2026-05-23
**Companion to:** every other doc under `docs/security/`. **Authoritative source of risks** stays [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md).

## Goal

Define the gates that must pass before:

1. **Closed pilot** (≤ 50 parents, monitored).
2. **Public launch** (open registration).

Plus the re-audit triggers and the owner-decision log.

## Pilot gate (closed pilot, ≤ 50 testers)

A pilot may proceed when **all** of the following are true:

| # | Gate | Source |
|---|------|--------|
| G-PILOT-1 | All P0 risk rows have an explicit mitigation accepted by the owner (e.g. dev routes hard-disabled at runtime via existing `NODE_ENV` check). | [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) |
| G-PILOT-2 | Brute-force rate-limit on `/api/student/login` (B-LOGIN). | [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md) |
| G-PILOT-3 | Cookie + CSRF posture per [COOKIE_SESSION_CSRF_AUDIT_PLAN.md](./COOKIE_SESSION_CSRF_AUDIT_PLAN.md) (Origin check on cookie-authenticated mutating routes; documented session cookie flags). | doc 10 |
| G-PILOT-4 | Generic login error behavior (no username-existence leak). | [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md) |
| G-PILOT-5 | Privacy notice published; parental consent recorded for every pilot account. | [PRIVACY_COOKIES_CHILD_DATA_PLAN.md](./PRIVACY_COOKIES_CHILD_DATA_PLAN.md) |
| G-PILOT-6 | IR-1, IR-2 runbooks rehearsed (table-top read-through is enough). | [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) — **table-top completed 2026-05-23** ([wave-3d-ir-tabletop-and-pending-evidence-pack.md](../../reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md)) |
| G-PILOT-7 | Owner has signed the pilot waiver listing every accepted P1 **and** every `DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV` row. | "owner-decision log" + "Pilot waiver" templates below |
| G-PILOT-8 | Pilot signoff acknowledges that the **Final Pre-Launch ENV Review / Rotation / Vercel Verification** phase has not yet run. The pilot proceeds **only** with this acknowledgment. | this doc |

P1 rows may stay `known` for the pilot if the waiver records why and what monitoring is in place.

### ENV review explicitly NOT required for the pilot gate

Per the owner's 2026-05-23 deferral:

- ENV-side actions (rotating `ENGINE_REVIEW_ADMIN_TOKEN`, removing the placeholder from `.env.example`, pre-deploy env preflight script, env-flag-authority changes such as moving `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` to a server-only flag, verification of `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` / `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` production state) are **owner-waiver-eligible** for the controlled pilot only.
- This is **not** a public-launch waiver. Public launch requires the Final ENV phase to complete first.

## Public-launch gate (open registration)

| # | Gate | Source |
|---|------|--------|
| G-PUB-1 | All P0 rows are `fixed` with recorded evidence. | [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) |
| G-PUB-2 | All P1 rows are `fixed` OR explicitly waivered with mitigation evidence. | register |
| G-PUB-3 | Authorization matrix ([AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md)) — every row PASS, recorded. | matrix artifact |
| G-PUB-4 | Ownership matrix ([PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md](./PARENT_STUDENT_OWNERSHIP_BOUNDARY_PLAN.md)) — every row PASS. | matrix artifact |
| G-PUB-5 | RLS audit — every child-data table has RLS enabled with reviewed policies. | [SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md](./SUPABASE_RLS_SERVICE_ROLE_AUDIT_PLAN.md) |
| G-PUB-6 | Headers + CSP enforcing in production; Mozilla Observatory ≥ B. | [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md) |
| G-PUB-7 | All Class A dev routes 404 in production (verified). | [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md) |
| G-PUB-8 | All Class B admin routes require server-only token + timing-safe compare. | same |
| G-PUB-9 | Rate-limit buckets active for B-LOGIN, B-HEBREW, B-COPILOT. | [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md) |
| G-PUB-10 | `npm audit` clean (or each High/Critical waivered with plan). | [DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md](./DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md) |
| G-PUB-11 | Privacy: full legal review for chosen jurisdiction. Privacy notice published. Parental consent enforced. Deletion path verified. | [PRIVACY_COOKIES_CHILD_DATA_PLAN.md](./PRIVACY_COOKIES_CHILD_DATA_PLAN.md) |
| G-PUB-12 | Monitoring: minimum alerts (5xx, login fail spike, Copilot cost) wired. | [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) |
| G-PUB-13 | Vercel preview deploys protected (auth required) until public launch + post-launch policy decided. | [VERCEL_DEPLOYMENT_SECURITY_PLAN.md](./VERCEL_DEPLOYMENT_SECURITY_PLAN.md) |
| G-PUB-14 | Copilot security invariants C-INV-1..9 verified. | [PARENT_COPILOT_SECURITY_PLAN.md](./PARENT_COPILOT_SECURITY_PLAN.md) |
| **G-PUB-ENV** | **Final Pre-Launch ENV Review / Rotation / Vercel Verification phase complete.** This includes: `ENGINE_REVIEW_ADMIN_TOKEN` rotated and `.env.example` placeholder replaced; pre-deploy env preflight active and passing; production env confirmed for `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION`, `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD`, `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT`, `ARCADE_ALLOW_FOUNDATION_ACTIONS`, `NEXT_PUBLIC_ARCADE_DEBUG`, `NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY`; `NEXT_PUBLIC_*` flags downgraded to UI-hint-only with server-only authority for privileged controls; git history scanned for historical secret leakage. | [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md), [VERCEL_DEPLOYMENT_SECURITY_PLAN.md](./VERCEL_DEPLOYMENT_SECURITY_PLAN.md), and "Final Pre-Launch ENV Review" in [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md) |

> **G-PUB-ENV is mandatory.** It cannot be waivered for public launch. Pilot-time waivers do not transfer.

## Re-audit triggers

A new security pass is mandatory if any of the following happens:

- A new authentication mechanism is added (e.g. magic-link login).
- A new third-party integration is added (analytics, support tool, additional LLM).
- A new dev/admin surface is added.
- A privacy regulation in the chosen jurisdiction changes.
- A SEV-1 incident occurs.
- A High/Critical advisory affects a runtime dependency.
- The 12-student fixture model changes (e.g. multi-parent fixture goes to production).
- The Copilot trust contract changes (server-rebuild snapshot ships, short-report flips on, etc.).

## Owner-decision log (template — fill during next fix pass)

| ID | Decision | Source doc | Decision (TBD until owner signs) | Date | Notes |
|----|----------|------------|----------------------------------|------|-------|
| D-PRIV-1 | starting jurisdiction | doc 22 |  |  |  |
| D-PRIV-2 | LLM provider in production | doc 22 |  |  |  |
| D-PRIV-3 | retention period after deletion | doc 22 |  |  |  |
| D-PRIV-4 | parental consent UX | doc 22 |  |  |  |
| D-PRIV-5 | cookie banner needed | doc 22 |  |  |  |
| D-PRIV-6 | DPO / privacy contact | doc 22 |  |  |  |
| D-COPILOT-1 | flip `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` to `true` | doc 17 |  |  | requires server-side rebuild + C-INV-1..9 evidence |
| D-COPILOT-2 | LLM cost daily budget | doc 17, doc 9 |  |  |  |
| D-VERCEL-1 | preview deploys protection policy | doc 21 |  |  |  |
| D-PILOT-1 | pilot tester pool size + composition | doc 24 (this) |  |  | suggested ≤ 50 |
| D-OWNERSHIP-1 | second test parent (P2) creation for ownership matrix | doc 15 |  |  | non-production data |
| D-MON-1 | external monitoring (Sentry / Datadog / none) | doc 18, doc 23 |  |  |  |
| D-RATE-1 | rate-limit infra (Upstash / KV / in-memory) | doc 9 |  |  |  |

## Pilot waiver (template — fill at pilot launch)

```
Pilot waiver — <date> — owner: <name>

A. ENV-deferred items (DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION):
   The owner explicitly waives these for the controlled pilot only. They remain
   blocking for public launch. Mitigation for each is "no ENV change in pilot
   phase; deferred to Final ENV phase before public launch":
   - R-ENV-01 (.env.example placeholder ENGINE_REVIEW_ADMIN_TOKEN=7479)
   - R-COPILOT-01 (production env-state verification of
     PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION)
   - R-COPILOT-03 (production env-state verification of
     NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT)
   - R-AUTH-02 (NEXT_PUBLIC_* flags as authority — env-flag-semantics change)
   - R-VERCEL-01 (env-side preflight + preview-protection toggle)
   - any other row tagged DEFERRED-BY-OWNER in
     docs/security/SECURITY_RISK_REGISTER.md

B. Accepted P1 risks for the pilot (non-ENV):
   - R-AUTH-03 (timingSafeEqual) — mitigation: <Wave 1 lands code-side fix>
   - R-RLS-01 (service-role usage broad) — mitigation: nightly cross-student bleed=0;
     ownership matrix added in Wave 1
   - R-OWN-01 (no automated cross-tenant tests in CI) — mitigation: 12-student
     fixture is single-parent; matrix added in Wave 1
   - ... (each accepted P1)

C. Not accepted (must remain blocking even for the pilot):
   - <list any P0 the owner does NOT waive>
   - any P1 not in section B

D. Acknowledgments:
   - The Final Pre-Launch ENV Review / Rotation / Vercel Verification phase
     has not yet been executed. The pilot proceeds with this knowledge.
   - This waiver covers the pilot only. Public launch requires G-PUB-ENV.

Re-audit trigger: pilot ends, or any incident, or any of the events listed in
docs/security/SECURITY_GATES_AND_SIGNOFF_PLAN.md.

Signed: <owner>
```

## Wave 3D gate status (2026-05-23)

IR table-top rehearsal + final pending evidence pack: [wave-3d-ir-tabletop-and-pending-evidence-pack.md](../../reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md).

| Item | Status |
|------|--------|
| G-PILOT-6 (IR table-top) | **Satisfied** (2026-05-23 documentation walk-through) |
| Full non-ENV closure | **Not passed** — live ownership, RLS, CSP soak, privacy pages, ENV phase remain |
| Public launch | **Blocked** |

## Wave 3B gate status (2026-05-23)

Final non-ENV security closure gate recorded in [wave-3b-final-non-env-security-closure-gate.md](../../reports/security/wave-3b-final-non-env-security-closure-gate.md).

| Gate slice | Status |
|------------|--------|
| Non-ENV implementation waves (1–3A) | **Complete** |
| Wave 3B verification | build + selftests + CSP smoke **PASS**; PDF QA **FAIL** → **recovered Wave 3C**; RLS anon **PENDING**; ownership live **PENDING** |
| G-PILOT-* (closed pilot) | **Not auto-satisfied** — waiver + privacy notice + IR rehearsal still required |
| G-PUB-* (public launch) | **Blocked** — includes mandatory **G-PUB-ENV** |
| Next authorized phase | **Final Pre-Launch ENV Review** (owner-opened) or live-evidence passes (D-OWNERSHIP-1, RLS) — not Wave 3B |

## Acceptance for next fix pass (gates slice)

- Owner-decision log filled.
- Pilot waiver signed (if pilot is launched).
- Public-launch gate G-PUB-1..14 each have a recorded evidence path.

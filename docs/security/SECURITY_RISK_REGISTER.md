# Security Risk Register

**Generated:** 2026-05-23
**Authoritative source.** Every other doc under `docs/security/` links here; do not duplicate risk rows elsewhere.

## Severity definitions

| Severity | Meaning |
|----------|---------|
| **P0** | Exploitable → leaks child data or auth, or trivially abusable. **Blocks public launch unconditionally.** |
| **P1** | Significant hardening gap. Fix before public; may be accepted for closed pilot only with explicit owner waiver + mitigation. |
| **P2** | Defense-in-depth. Track but not blocking. |
| **P3** | Cosmetic / nice-to-have. |

## Bands

- **Pilot impact:** `block` / `accept-risk-with-mitigation` / `n.a.`
- **Public launch impact:** `block` / `fix-before` / `accept-risk-with-mitigation` / `n.a.`

## State

- **known** — confirmed by an existing audit doc.
- **suspected** — flagged by patterns / file names; needs read-only follow-up to confirm.
- **fixed** — verified resolved (this register currently has 0 fixed; this pass introduces no fixes).

## Reopen condition

Per [docs/DO_NOT_REOPEN_WITHOUT_REGRESSION.md](../DO_NOT_REOPEN_WITHOUT_REGRESSION.md): *recording* a row here is **not** a reopen of the security area. The security area in [docs/FINAL_PRODUCT_CLOSURE_MAP.md](../FINAL_PRODUCT_CLOSURE_MAP.md) is `CLOSED-WATCH + partial OPEN`; this register concretizes the "partial OPEN" portion.

---

## P0 — public-launch blockers

| ID | Area | Title | State | Pilot impact | Public impact | Owner decision? | Evidence |
|----|------|-------|-------|--------------|---------------|-----------------|----------|
| **R-DEV-01** | dev routes | Hardcoded `DEV_TOPUP_SECRET_CODE` in [pages/api/student/dev-add-coins.js](../../pages/api/student/dev-add-coins.js); mutates balance via elevated path. | known | accept-risk-with-mitigation (route disabled in production env) | **block** — must be hard-gated by `NODE_ENV` and secret removed from source | yes — disable vs strictly token-protect | [auth-security-readonly-audit.md §1](../auth-security-readonly-audit.md) |
| **R-AUTH-01** | student auth | 4-digit student PIN brute-forceable; no visible API rate-limit / lockout. | known | accept-risk-with-mitigation (closed tester pool, monitored) | **block** — per-IP + per-account rate-limit + progressive backoff required | yes — rate-limit infra (Vercel KV / Upstash / in-memory) | [auth-security-readonly-audit.md §2](../auth-security-readonly-audit.md) |
| **R-ENV-01** | env / secrets | `[.env.example](../../.env.example)` ships a real-shaped `ENGINE_REVIEW_ADMIN_TOKEN=7479` placeholder. If copied as-is into production, admin pack is trivially accessible. | known | block (until rotated/removed in any deployed env) | **block** — placeholder must be non-guessable; rotate any deployed value | yes — rotate token; treat as a **suspected secret leak** (see IR plan) | `.env.example` line 76 |
| **R-COPILOT-01** | Copilot trust | `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION=true` re-trusts client-crafted blobs in production; emergency-only flag. | known | block if accidentally on | **block** — invariant: must be unset/false in public production | yes — confirm production env state | [parent-ai/copilot-turn-production.md](../parent-ai/copilot-turn-production.md) |
| **R-DEV-02** | dev routes | `/api/dev-student-simulator/*` + `/learning/dev-student-simulator` + `/learning/dev/engine-review` + `/learning/dev-db-report-preview` accessible if production flag misconfigured. | known | accept-risk-with-mitigation (must verify production env) | **block** — must 404 or token-gate in production | yes — pipeline policy check | [auth-security-readonly-audit.md §10](../auth-security-readonly-audit.md), [site-map-and-protection-audit.md](../site-map-and-protection-audit.md) |

## P1 — fix before public, pilot-waivable

| ID | Area | Title | State | Pilot impact | Public impact | Owner decision? | Evidence |
|----|------|-------|-------|--------------|---------------|-----------------|----------|
| **R-AUTH-02** | dev/admin gating | Privileged controls behind `NEXT_PUBLIC_*` flags (e.g. `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN`) — leaks enablement state and uses public flags as authority. | known | accept-risk-with-mitigation | fix-before — replace with server-only env for authorization; keep `NEXT_PUBLIC_*` for UI hints only | no | [auth-security-readonly-audit.md §4](../auth-security-readonly-audit.md) |
| **R-AUTH-03** | engine-review admin | `engine-review-pack-status` weakly gated; admin token compare not timing-safe. | known | accept-risk-with-mitigation | fix-before — `timingSafeEqual` + server-only token | no | [auth-security-readonly-audit.md §3, §8](../auth-security-readonly-audit.md) |
| **R-RLS-01** | service-role | Multiple APIs use service-role queries (`/api/student/login`, `/api/learning/session/*`, `/api/parent/students/[studentId]/report-data`). One missing filter = cross-tenant leak. | known | accept-risk-with-mitigation (active monitoring via nightly cross-student bleed=0) | fix-before — automated ownership tests + minimize service-role reads | no | [auth-security-readonly-audit.md §7](../auth-security-readonly-audit.md) |
| **R-OWN-01** | parent boundary | No automated negative test that parent A cannot read parent B's student/report. | known | accept-risk-with-mitigation (nightly currently runs single-parent, bleed=0) | fix-before — explicit cross-tenant test matrix | no | [auth-security-readonly-audit.md §"Parent auth and report ownership"](../auth-security-readonly-audit.md) |
| **R-OWN-02** | student boundary | No automated negative test that student A cannot read student B's data via crafted requests. | known | accept-risk-with-mitigation | fix-before — student-to-student cross-tenant tests | no | [auth-security-readonly-audit.md §"Student-to-parent data boundary"](../auth-security-readonly-audit.md) |
| **R-RATE-01** | rate-limit | Hebrew utility endpoints (`/api/hebrew-nakdan`, `/api/hebrew-audio-*`) unauthenticated, no quotas. Cost / abuse risk. | known | accept-risk-with-mitigation | fix-before — auth or rate-limit + caps | no | [auth-security-readonly-audit.md §6](../auth-security-readonly-audit.md) |
| **R-COPILOT-02** | Copilot defense-in-depth | Copilot route trusts `studentId` from body; needs server-side ownership check before payload rebuild. | known | accept-risk-with-mitigation | fix-before — defense-in-depth ownership check | no | [auth-security-readonly-audit.md §5](../auth-security-readonly-audit.md), [parent-ai/copilot-turn-production.md](../parent-ai/copilot-turn-production.md) |
| **R-COPILOT-03** | Copilot short-report flag | `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` must stay `false` in public production until server snapshot ships. | known | accept-risk-with-mitigation | fix-before — verify production env + smoke | yes — confirm pre-launch | [parent-ai/final-status.md](../parent-ai/final-status.md) |
| **R-HEAD-01** | headers | No documented CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy posture. | suspected | accept-risk-with-mitigation | fix-before — define + enforce headers via `next.config.js` or `vercel.json` | yes — CSP draft owner approval | (to be confirmed by audit per doc 12) |
| **R-CORS-01** | CORS | No documented allowlist for `/api/*`; default Next behavior may need explicit Origin checks for state-changing routes. | suspected | accept-risk-with-mitigation | fix-before — origin allowlist for `/api/parent/*`, `/api/student/login`, Copilot turn | no | (to be confirmed by audit per doc 13) |
| **R-CSRF-01** | CSRF | State-changing endpoints (parent updates, dev-add-coins, copilot-turn) — CSRF posture not documented. | suspected | accept-risk-with-mitigation | fix-before — verify SameSite cookies + Origin checks | no | (to be confirmed by audit per doc 10) |
| **R-COOKIE-01** | cookies | Session cookie flags (`HttpOnly`, `Secure`, `SameSite`) not documented per audit. | suspected | accept-risk-with-mitigation | fix-before — confirm flags on student session cookie + parent bearer storage | no | (to be confirmed by audit per doc 10) |
| **R-PRIV-01** | child data | Israel privacy law + EU/COPPA-style child-data posture not documented. Parental consent model unclear. | suspected | accept-risk-with-mitigation (closed pilot ≤ 50 testers + signed waiver) | fix-before — legal review + privacy notice + cookie banner if needed | **yes** — jurisdiction + pilot-vs-public decision | (to be defined in doc 22) |
| **R-LOG-01** | logs / artifacts | `reports/` is gitignored but contains screenshots of student progress + state files; retention + access control undefined. | suspected | accept-risk-with-mitigation (artifacts stay local) | fix-before — retention policy + access control if any artifact ships | no | (to be defined in doc 18) |
| **R-PUB-01** | public surface | `/contact` form abuse (spam, PII overshare) and `/api/gallery` rate-limit not documented. | suspected | accept-risk-with-mitigation | fix-before — captcha or rate-limit + sanitization | no | (to be defined in doc 19) |
| **R-DEP-01** | supply chain | `npm audit` posture, lockfile policy, transitive deps not periodically reviewed. `html2pdf.js`, `jspdf`, `node-edge-tts`, `recharts` are runtime dependencies. | suspected | accept-risk-with-mitigation | fix-before — `npm audit` clean + lockfile policy + Dependabot/Renovate | no | (to be defined in doc 20) |
| **R-VERCEL-01** | deployment | Preview deploy access policy + env separation (preview vs production) + `vercel.json` headers config not documented. | suspected | accept-risk-with-mitigation (preview behind Vercel auth) | fix-before — preview-deploy access policy + production env audit | no | (to be defined in doc 21) |

## P2 — defense-in-depth, non-blocking

| ID | Area | Title | State | Public impact | Evidence |
|----|------|-------|-------|---------------|----------|
| **R-RLS-02** | RLS | RLS policies not externally documented in this repo; verify in Supabase that `learning_*` tables enforce parent/student scoping at the row level (in addition to API filters). | suspected | accept-risk-with-mitigation | (read-only Supabase introspection per doc 7) |
| **R-XSS-01** | XSS | `dangerouslySetInnerHTML` usages not enumerated; Hebrew rendering paths not scanned for injection. | suspected | accept-risk-with-mitigation | (to be enumerated in doc 11) |
| **R-INPUT-01** | input validation | Parent-controlled text fields (student name, etc.) — sanitization + length-cap policy not documented. | suspected | accept-risk-with-mitigation | (to be defined in doc 11) |
| **R-LOG-02** | telemetry | Server-side logs may inadvertently include PII (student names, login_username, error stacks with body). Log policy not documented. | suspected | accept-risk-with-mitigation | (to be defined in doc 18) |
| **R-IR-01** | incident response | No documented IR runbooks (credential leak, data leak, abuse traffic, dependency CVE, rollback). | known-gap | accept-risk-with-mitigation | (to be defined in doc 23) |
| **R-MON-01** | monitoring | No documented alerting on auth failures, rate-limit hits, 5xx spikes, or anomalous Copilot traffic. | suspected | accept-risk-with-mitigation | (related to doc 23) |
| **R-AUTH-04** | session | Session expiry / revocation behavior not documented; long-lived student session may persist across device handoff. | suspected | accept-risk-with-mitigation | (to be confirmed per doc 10) |
| **R-DBG-01** | debug surfaces | `/api/learning-supabase/health` may expose internal details if not secured. | known-gap | accept-risk-with-mitigation | [site-map-and-protection-audit.md](../site-map-and-protection-audit.md) |

## P3 — cosmetic / track only

| ID | Area | Title | State | Evidence |
|----|------|-------|-------|----------|
| **R-ENV-02** | env hygiene | `.env.example` weak placeholder values may be copied as-is. | known | [auth-security-readonly-audit.md §9](../auth-security-readonly-audit.md) |
| **R-DOC-01** | documentation | Multiple `.env.*` files exist (`.env`, `.env.local`, `.env.example`, `.env.development`, `.env.production`, `.env.vercel.local`, `.env.e2e.local`). Sourcing precedence not documented. | suspected | (per doc 14) |

---

## Cross-reference index

Every other doc under `docs/security/` cites the relevant `R-*` IDs above; no doc duplicates the row content.

- API/auth: R-AUTH-01..04, R-DEV-01..02, R-COPILOT-01..03, R-RATE-01, R-CSRF-01, R-COOKIE-01
- Data: R-RLS-01..02, R-OWN-01..02, R-LOG-01..02
- Surface: R-XSS-01, R-INPUT-01, R-PUB-01, R-HEAD-01, R-CORS-01, R-DBG-01
- Privacy: R-PRIV-01, R-LOG-01..02
- Deployment: R-VERCEL-01, R-DEP-01, R-ENV-01..02
- Ops: R-IR-01, R-MON-01

## How to add a new risk row

1. Choose the next free `R-<AREA>-NN` ID, where `<AREA>` matches an existing prefix above (or propose a new one in the index).
2. Fill all columns. State must be `suspected`, `known`, or `fixed`.
3. Cite a file path or doc section as evidence.
4. State pilot vs public bands explicitly.
5. If owner decision is required, mark `yes` and capture the decision in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).
6. **Do not silently fix.** A row stays `suspected` or `known` until a fix pass produces evidence.

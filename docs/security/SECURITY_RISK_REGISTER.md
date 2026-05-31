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
- **fixed** — verified resolved.
- **partially-fixed** — Wave 1 (or later) landed mitigation; full closure pending (often Final ENV phase).

## Wave 1 implementation log (2026-05-23, non-ENV)

Evidence: [reports/security/wave-1-non-env-security-fix-summary.md](../../reports/security/wave-1-non-env-security-fix-summary.md). **No ENV files or Vercel env values were modified.**

| ID | Wave 1 result |
|----|---------------|
| R-DEV-01 | **partially-fixed** — production `NODE_ENV` hard-404 on `/api/student/dev-add-coins`; hardcoded secret remains in source until Final ENV / code cleanup |
| R-DEV-02 | **partially-fixed** — production `NODE_ENV` hard-404/404 pages on all Class A dev surfaces |
| R-AUTH-01 | **partially-fixed** — in-memory B-LOGIN rate limit + generic 401 on `/api/student/login` |
| R-ENV-01 | unchanged — **DEFERRED-BY-OWNER** |
| R-COPILOT-01 | unchanged — **DEFERRED-BY-OWNER** (verification); production dev_local path blocked in code |
| R-OWN-01/02 | **partially-fixed** — ownership contract doc + selftests; full HTTP matrix pending D-OWNERSHIP-1 |
| R-COPILOT-02 | **partially-fixed** — defense-in-depth ownership + production dev_local rejection |
| R-COOKIE-01 | **partially-fixed** — verified existing flags; logout/login hardened |
| R-CSRF-01 | **partially-fixed** — Origin/Referer guard on cookie-mutating routes + arcade |
| R-CORS-01 | **partially-fixed** — same-origin enforcement via Origin helper |
| R-HEAD-01 | **partially-fixed** — CSP Report-Only + headers in `next.config.js` |
| R-LOG-01 | **partially-fixed** — dry-run retention script |
| R-LOG-02 | **partially-fixed** — `safe-log.js` + login/access-code log redaction |
| R-PUB-01 | documented — `/contact` has no server mutation API (mailto only) |
| R-RATE-01 | **partially-fixed** — B-LOGIN only (in-memory); B-HEBREW deferred Wave 2 |
| R-DEP-01 | **partially-fixed** — Dependabot + audit waves 2D–2G; **0 critical/0 high** in audit; PostCSS/`next` moderate residue only |

**Follow-up pass (same day):** parent/student cap hardcoded in `lib/parent-server/parent-student-limit.server.js` (`admin@admin.com` → 50, others → 3); `safe-log.js` normalized key redaction; origin guard on `/api/student/learning-profile` PATCH/POST; extended selftests PASS. Owner constraints: no git push, no Vercel deploy, no ENV touched.

## Wave 2A implementation log (2026-05-23, non-ENV)

Evidence: [reports/security/wave-2a-security-fix-summary.md](../../reports/security/wave-2a-security-fix-summary.md). **No ENV, no Hebrew/copy/design, no Supabase writes.**

| ID | Wave 2A result |
|----|----------------|
| R-RATE-01 | **partially-fixed** — in-memory B-HEBREW + B-COPILOT + gallery rate limits (prod only) |
| R-HEAD-01 | **partially-fixed** — CSP enforce readiness doc; still Report-Only |
| R-OWN-01/02 | **partially-fixed** — service-role audit + HTTP matrix scaffold; D-OWNERSHIP-1 pending |
| R-DEV-01 | **partially-fixed** — timing-safe dev code compare |
| R-PUB-01 | **partially-fixed** — gallery rate limit; health host masked in prod |
| R-ENV-01 / R-COPILOT-01 | unchanged — DEFERRED-BY-OWNER |

## Wave 2B implementation log (2026-05-23, non-ENV)

Evidence: [reports/security/wave-2b-security-fix-summary.md](../../reports/security/wave-2b-security-fix-summary.md).

| ID | Wave 2B result |
|----|----------------|
| R-COPILOT-02 | **partially-fixed** — `verifyStudentForCopilotRebuild` before SR aggregation |
| R-OWN-01/02 | **partially-fixed** — HTTP matrix `--execute` path; D-OWNERSHIP-1 PENDING |
| R-HEAD-01 | **partially-fixed** — CSP report sink + collection doc; still Report-Only |
| R-PUB-01 | **partially-fixed** — health errorCode masked; engine-review status masked in prod |
| R-AUTH-03 | **partially-fixed** — timing-safe token + prod token on pack-status (Wave 2A/2B) |
| R-DEP-01 | **partially-fixed** — triage doc; no package upgrades |

## Wave 2C implementation log (2026-05-23, prep only)

Evidence: [reports/security/wave-2c-nextjs-upgrade-prep.md](../../reports/security/wave-2c-nextjs-upgrade-prep.md). **No package.json / lockfile changes. No upgrade executed.**

| ID | Wave 2C result |
|----|----------------|
| R-DEP-01 | **partially-fixed** (still open) — Next.js upgrade prep; **Track A target `15.5.18`** (Pages Router + React 18); original `14.2.35` superseded; **no upgrade executed** |

**Revision (same day):** Per current Vercel/Next.js advisory review, 13.x/14.x lines remain affected; fixed targets are `15.5.18` or `16.2.6`. Do **not** execute `14.2.35`. Track B (`16.2.6` / React 19) deferred unless separate migration plan approved.

## Wave 2D implementation log (2026-05-23, Track A executed)

Evidence: [reports/security/wave-2d-nextjs-15-upgrade-execution.md](../../reports/security/wave-2d-nextjs-15-upgrade-execution.md). **Next-only upgrade; React 18.2.0 unchanged; no ENV, no push, no deploy.**

| ID | Wave 2D result |
|----|---------------|
| R-DEP-01 | **partially-fixed** (improved) — `next@15.5.18` installed; build PASS; wave1/2a/2b selftests PASS; Next **critical** advisory closed; moderate `postcss` transitive + PDF stack + tooling advisories remain |

## Wave 2E implementation log (2026-05-23, planning only)

Evidence: [reports/security/wave-2e-remaining-audit-remediation-plan.md](../../reports/security/wave-2e-remaining-audit-remediation-plan.md). **No package remediation executed. `npm audit fix --dry-run` only.**

| ID | Wave 2E result |
|----|---------------|
| R-DEP-01 | **partially-fixed** (still open) — 11 advisories remain (2 critical PDF, 3 high, 6 moderate); Next critical stays closed via Wave 2D; Wave 2F (non-force tooling/ws) + Wave 2G (PDF major) planned |

## Wave 2F implementation log (2026-05-23, non-force executed)

Evidence: [reports/security/wave-2f-npm-audit-nonforce-execution.md](../../reports/security/wave-2f-npm-audit-nonforce-execution.md). **`npm audit fix` only; no `--force`; lockfile-only remediation.**

| ID | Wave 2F result |
|----|---------------|
| R-DEP-01 | **partially-fixed** (improved) — audit **11 → 4**; tooling/ws/dompurify patches applied; PDF **critical** (`jspdf`, `html2pdf.js`) + PostCSS/`next` residue remain; Wave 2G required for PDF critical closure |

## Wave 2G implementation log (2026-05-23, PDF stack executed)

Evidence: [reports/security/wave-2g-pdf-stack-upgrade-execution.md](../../reports/security/wave-2g-pdf-stack-upgrade-execution.md). **`jspdf@4.2.1`, `html2pdf.js@0.14.0`, `jspdf-autotable@5.0.8`; no `--force`; no PDF code changes required.**

| ID | Wave 2G result |
|----|---------------|
| R-DEP-01 | **partially-fixed** (significantly improved) — audit **4 → 2**; **0 critical / 0 high**; PDF critical closed; PostCSS/`next` moderate residue only; build + PDF QA PASS |

## Wave 2H implementation log (2026-05-23, ownership / RLS boundary)

Evidence: [reports/security/wave-2h-ownership-rls-boundary-closure.md](../../reports/security/wave-2h-ownership-rls-boundary-closure.md), [reports/security/wave-2h-rls-boundary-closure.md](../../reports/security/wave-2h-rls-boundary-closure.md). **Static closure only; no Supabase writes; no API handler patches.**

| ID | Wave 2H result |
|----|---------------|
| R-OWN-01 | **partially-fixed** — static audit PASS (8/8); live HTTP **PENDING** (D-OWNERSHIP-1 fixtures) |
| R-OWN-02 | **partially-fixed** — static audit PASS; live HTTP **PENDING** |
| R-RLS-01 | **partially-fixed** — service-role route table PASS; live HTTP + staging RLS script deferred |
| R-RLS-02 | **suspected** — RLS policy SQL not in repo; manual Supabase verify documented |
| R-COPILOT-02 | **partially-fixed** — rebuild gate verified static; not marked fixed (no live HTTP) |

## Wave 2I implementation log (2026-05-23, XSS / input / PII)

Evidence: [reports/security/wave-2i-xss-input-hardening.md](../../reports/security/wave-2i-xss-input-hardening.md), [reports/security/wave-2i-security-fix-summary.md](../../reports/security/wave-2i-security-fix-summary.md).

| ID | Wave 2I result |
|----|---------------|
| R-XSS-01 | **partially-fixed** — full static inventory; 1 dev-only `dangerouslySetInnerHTML` accepted |
| R-INPUT-01 | **partially-fixed** — UUID + length caps on parent routes; grade enum allowlist pending |
| R-LOG-02 | **partially-fixed** — safe-log hash/username redaction; copilot 500 message leak closed |

## Wave 2I correction (2026-05-23, owner-approved)

**Issue:** `clampTrimmedString` silently truncated persisted fields (`fullName`, `gradeLevel`, Nakdan `entry.id`).  
**Fix:** `parseBoundedTrimmedString` returns **400** on over-limit; copilot `utterance` unchanged (explicit length error). Hebrew max-children message preserved.

| ID | Correction result |
|----|-------------------|
| R-INPUT-01 | **partially-fixed** (improved) — reject-over-limit on persisted fields; wave2i selftest updated |

## Wave 2J implementation log (2026-05-23, reconciliation / docs only)

Evidence: [reports/security/wave-2j-non-env-security-closure-map.md](../../reports/security/wave-2j-non-env-security-closure-map.md). **No application code, no ENV, no package changes.**

| Outcome | Detail |
|---------|--------|
| Closure map | All waves 1–2I reconciled against master plan |
| Stale docs patched | DEPENDENCY plan, planning summary, wave-2b triage banner |
| Next non-ENV wave | **Wave 2K — CSP enforce** (proposed) |
| ENV | Remains **DEFERRED-BY-OWNER** — not current scope |

## Wave 2K implementation log (2026-05-23, CSP enforcement)

Evidence: [reports/security/wave-2k-csp-enforcement-execution.md](../../reports/security/wave-2k-csp-enforcement-execution.md). **CSP enforcing; report-uri wired; no ENV, no packages, no Hebrew/UI changes.**

| ID | Wave 2K result |
|----|----------------|
| R-HEAD-01 | **partially-fixed** (improved) — enforcing CSP + all baseline headers; Report-Only removed; build + smoke + PDF QA PASS; **connect-src tightened** (OpenAI/Gemini removed — server-only LLM); **production 48h soak pending** before `fixed` |

## Wave 2L implementation log (2026-05-23, privacy / site policy readiness — docs only)

Evidence: [reports/security/wave-2l-privacy-site-policy-readiness.md](../../reports/security/wave-2l-privacy-site-policy-readiness.md). **No site pages, routes, Hebrew copy, design, or consent UX implemented.**

| ID | Wave 2L result |
|----|----------------|
| R-PRIV-01 | **partially-fixed** (readiness prepared) — policy requirements matrix, owner approval checklist, data map, draft outline blocks (NOT IMPLEMENTED); **implementation pending** D-PRIV-* owner decisions + legal review + separate copy pass |

## Wave 2M implementation log (2026-05-23, ownership / RLS live verification readiness)

Evidence: [reports/security/wave-2m-ownership-rls-live-verification.md](../../reports/security/wave-2m-ownership-rls-live-verification.md). **No Supabase writes, no account create/delete, no ENV files read, no `--execute` HTTP (fixtures missing).**

| ID | Wave 2M result |
|----|----------------|
| R-OWN-01 | **partially-fixed** — static audit PASS; live HTTP **pending-live-verification** (D-OWNERSHIP-1 fixtures) |
| R-OWN-02 | **partially-fixed** — static audit PASS; live HTTP **pending-live-verification** |
| R-RLS-01 | **partially-fixed** — `verify-learning-rls.mjs` **not run** (reads `.env*`; auto-setup mutates); staging anon verify deferred |
| R-RLS-02 | **suspected** — manual Supabase policy export still pending |

## Wave 3A implementation log (2026-05-23, security ops / runbooks / cookie-CSRF-session)

Evidence: [reports/security/wave-3a-security-ops-closure.md](../../reports/security/wave-3a-security-ops-closure.md). **Docs + safe RLS script flags; no ENV, no deploy, no Supabase live run.**

| ID | Wave 3A result |
|----|----------------|
| R-IR-01 | **partially-fixed (improved)** — operational runbooks RB-1..RB-8; **table-top rehearsed Wave 3D** |
| R-MON-01 | **partially-fixed** — monitoring/alerting plan documented; providers/alerts not provisioned |
| R-COOKIE-01 | **partially-fixed** — formal posture doc; live Set-Cookie capture pending |
| R-CSRF-01 | **partially-fixed** — origin guard + SameSite documented per route |
| R-AUTH-04 | **partially-fixed** — session lifetime/revocation documented; remote student revoke UX gap |
| R-RLS-02 | **partially-fixed** — `--no-dotenv --anon-only` safe path; live anon run pending owner shell export |

## Wave 3B implementation log (2026-05-23, final non-ENV closure gate)

Evidence: [reports/security/wave-3b-final-non-env-security-closure-gate.md](../../reports/security/wave-3b-final-non-env-security-closure-gate.md). **Verification + docs only; no ENV, no deploy, no packages, no code patches in this pass.**

| Check | Wave 3B result |
|-------|----------------|
| `npm run build` | **PASS** |
| wave1 / 2a / 2b / 2h / 2i selftests | **PASS** |
| ownership matrix `--dry-run` | static **PASS**; live HTTP **PENDING** (D-OWNERSHIP-1) |
| `wave2k-csp-smoke.mjs` | **PASS** (enforcing CSP) |
| `npm run qa:parent-pdf-export` | **FAIL** (Wave 3B) → **PASS** (Wave 3C recovery) — was dev-server/timing flake; see [wave-3c-parent-pdf-export-gate-recovery.md](../../reports/security/wave-3c-parent-pdf-export-gate-recovery.md) |
| `npm audit` | **2 moderate**, **0 critical / 0 high** |
| `verify-learning-rls.mjs --no-dotenv --anon-only` | **PENDING** — fail-closed (shell env missing) |
| `git diff .env*` | **empty** |

| Outcome | Detail |
|---------|--------|
| Non-ENV program | Waves 1–3A implementation **complete**; live evidence gaps documented |
| PDF export gate | **Recovered Wave 3C** — test-only hardening; not a product regression |
| Public launch | **Blocked** — G-PUB-* + G-PUB-ENV incomplete |
| Closed pilot | Owner waiver may cover ENV-deferred + pending live items only |
| **Full non-ENV closure** | **Still not passed** — live ownership/RLS/CSP soak/privacy remain; IR table-top **closed Wave 3D** |

## Wave 3C implementation log (2026-05-23, PDF export gate recovery)

Evidence: [reports/security/wave-3c-parent-pdf-export-gate-recovery.md](../../reports/security/wave-3c-parent-pdf-export-gate-recovery.md). **Test script only; no product/ENV/package changes.**

| Check | Wave 3C result |
|-------|----------------|
| Root cause | Dev-server readiness / Next dev compile–navigation race — **not** product regression |
| `npm run qa:parent-pdf-export` | **PASS** (×3 on clean dev `:3005`) |
| Build + security selftests + CSP smoke | **PASS** |

## Wave 3D implementation log (2026-05-23, IR table-top + pending evidence pack)

Evidence: [reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md](../../reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md). **Docs-only; no ENV, deploy, product, or Supabase changes.**

| ID | Wave 3D result |
|----|----------------|
| R-IR-01 | **partially-fixed (improved)** — table-top walked for RB-1..RB-8 + PDF regression scenario; G-PILOT-6 satisfied; live alerting cadence still open |
| R-MON-01 | unchanged — plan documented; provider/alerts not provisioned |
| Pending evidence | Consolidated pack for ownership, RLS, CSP soak, privacy, monitoring, ENV-deferred |

## Execution status (orthogonal to severity)

A risk row may be **severe** *and* **not allowed to be fixed in the current wave**. Track separately:

- **WAVE-1** — eligible for the immediate non-ENV pilot security hardening pass.
- **WAVE-2** — eligible for the pre-public hardening pass.
- **WAVE-3** — defense-in-depth, post-pilot.
- **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION** — the risk is real and may block public launch, but the owner has explicitly postponed any ENV / secret / Vercel-env work to a dedicated final pre-launch phase. Touching ENV now is **forbidden** — see [SECURITY_MASTER_PLAN.md](./SECURITY_MASTER_PLAN.md) "Owner-deferred ENV decision".

## Reopen condition

Per [docs/DO_NOT_REOPEN_WITHOUT_REGRESSION.md](../DO_NOT_REOPEN_WITHOUT_REGRESSION.md): *recording* a row here is **not** a reopen of the security area. The security area in [docs/FINAL_PRODUCT_CLOSURE_MAP.md](../FINAL_PRODUCT_CLOSURE_MAP.md) is `CLOSED-WATCH + partial OPEN`; this register concretizes the "partial OPEN" portion.

---

## P0 — public-launch blockers

| ID | Area | Title | State | Execution | Pilot impact | Public impact | Owner decision? | Evidence |
|----|------|-------|-------|-----------|--------------|---------------|-----------------|----------|
| **R-DEV-01** | dev routes | Hardcoded `DEV_TOPUP_SECRET_CODE` in [pages/api/student/dev-add-coins.js](../../pages/api/student/dev-add-coins.js); mutates balance via elevated path. | known | **WAVE-1** (runtime hard-disable via existing `NODE_ENV`; no ENV changes) | accept-risk-with-mitigation (route disabled in production env) | **block** — must be hard-gated by `NODE_ENV` and secret removed from source | yes — disable vs strictly token-protect | [auth-security-readonly-audit.md §1](../auth-security-readonly-audit.md) |
| **R-AUTH-01** | student auth | 4-digit student PIN brute-forceable; no visible API rate-limit / lockout. | known | **WAVE-1** (rate-limit + lockout) | accept-risk-with-mitigation (closed tester pool, monitored) | **block** — per-IP + per-account rate-limit + progressive backoff required | yes — rate-limit infra (Vercel KV / Upstash / in-memory) | [auth-security-readonly-audit.md §2](../auth-security-readonly-audit.md) |
| **R-ENV-01** | env / secrets | `[.env.example](../../.env.example)` ships a real-shaped `ENGINE_REVIEW_ADMIN_TOKEN=7479` placeholder. If copied as-is into production, admin pack is trivially accessible. | known | **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION** — not part of Wave 1; not allowed to touch now; must be resolved before public launch; controlled pilot requires explicit owner waiver while unresolved. See [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) banner. | block (until rotated/removed in any deployed env) — pilot may proceed only with explicit owner waiver | **block** — placeholder must be non-guessable; rotate any deployed value | yes — rotate token; treat as a **suspected secret leak** (see IR plan) — owner has postponed action to Final ENV phase | `.env.example` line 76 |
| **R-COPILOT-01** | Copilot trust | `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION=true` re-trusts client-crafted blobs in production; emergency-only flag. | known | **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION** — invariant verification depends on reading deployed ENV; deferred together with R-ENV-01. Runtime handler behavior may be hardened in Wave 1 (e.g. defense-in-depth check independent of the flag) without changing ENV. | block if accidentally on; pilot may proceed only with owner waiver (verify by reading current env state, not by changing) | **block** — invariant: must be unset/false in public production | yes — confirm production env state — owner has postponed verification to Final ENV phase | [parent-ai/copilot-turn-production.md](../parent-ai/copilot-turn-production.md) |
| **R-DEV-02** | dev routes | `/api/dev-student-simulator/*` + `/learning/dev-student-simulator` + `/learning/dev/engine-review` + `/learning/dev-db-report-preview` accessible if production flag misconfigured. | known | **WAVE-1** for the runtime hard-disable using existing `NODE_ENV` checks (no ENV changes). The pipeline pre-deploy ENV preflight is **DEFERRED-BY-OWNER — Final ENV phase**. | accept-risk-with-mitigation (must verify production env) | **block** — must 404 or token-gate in production | yes — pipeline policy check (Final ENV phase) | [auth-security-readonly-audit.md §10](../auth-security-readonly-audit.md), [site-map-and-protection-audit.md](../site-map-and-protection-audit.md) |

## P1 — fix before public, pilot-waivable

| ID | Area | Title | State | Execution | Pilot impact | Public impact | Owner decision? | Evidence |
|----|------|-------|-------|-----------|--------------|---------------|-----------------|----------|
| **R-AUTH-02** | dev/admin gating | Privileged controls behind `NEXT_PUBLIC_*` flags (e.g. `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN`) — leaks enablement state and uses public flags as authority. | known | **DEFERRED-BY-OWNER — Final ENV phase** (touches env-flag semantics; deferred together with R-ENV-01) | accept-risk-with-mitigation | fix-before — replace with server-only env for authorization; keep `NEXT_PUBLIC_*` for UI hints only | no | [auth-security-readonly-audit.md §4](../auth-security-readonly-audit.md) |
| **R-AUTH-03** | engine-review admin | `engine-review-pack-status` weakly gated; admin token compare not timing-safe. | known | **WAVE-2** for `timingSafeEqual` (code-only); the underlying token rotation is **DEFERRED-BY-OWNER — Final ENV phase** | accept-risk-with-mitigation | fix-before — `timingSafeEqual` + server-only token | no | [auth-security-readonly-audit.md §3, §8](../auth-security-readonly-audit.md) |
| **R-RLS-01** | service-role | Multiple APIs use service-role queries (`/api/student/login`, `/api/learning/session/*`, `/api/parent/students/[studentId]/report-data`). One missing filter = cross-tenant leak. | partially-fixed | **WAVE-2** | accept-risk-with-mitigation (active monitoring via nightly cross-student bleed=0) | fix-before — automated ownership tests + minimize service-role reads | no | [wave-2m-ownership-rls-live-verification.md](../../reports/security/wave-2m-ownership-rls-live-verification.md); staging RLS verify not run |
| **R-OWN-01** | parent boundary | No automated negative test that parent A cannot read parent B's student/report. | partially-fixed | **WAVE-1** (test matrix can be added without ENV changes) | accept-risk-with-mitigation (nightly currently runs single-parent, bleed=0) | fix-before — explicit cross-tenant test matrix | no | [wave-2m-ownership-rls-live-verification.md](../../reports/security/wave-2m-ownership-rls-live-verification.md); live HTTP **pending-live-verification** |
| **R-OWN-02** | student boundary | No automated negative test that student A cannot read student B's data via crafted requests. | partially-fixed | **WAVE-1** | accept-risk-with-mitigation | fix-before — student-to-student cross-tenant tests | no | [wave-2m-ownership-rls-live-verification.md](../../reports/security/wave-2m-ownership-rls-live-verification.md); live HTTP **pending-live-verification** |
| **R-RATE-01** | rate-limit | Hebrew utility endpoints (`/api/hebrew-nakdan`, `/api/hebrew-audio-*`) unauthenticated, no quotas. Cost / abuse risk. | known | **WAVE-1** for in-memory caps (no ENV); upstream Upstash/KV provisioning is **DEFERRED-BY-OWNER — Final ENV phase** if it requires new env values | accept-risk-with-mitigation | fix-before — auth or rate-limit + caps | no | [auth-security-readonly-audit.md §6](../auth-security-readonly-audit.md) |
| **R-COPILOT-02** | Copilot defense-in-depth | Copilot route trusts `studentId` from body; needs server-side ownership check before payload rebuild. | known | **WAVE-1** (defense-in-depth ownership check is independent of ENV) | accept-risk-with-mitigation | fix-before — defense-in-depth ownership check | no | [auth-security-readonly-audit.md §5](../auth-security-readonly-audit.md), [parent-ai/copilot-turn-production.md](../parent-ai/copilot-turn-production.md) |
| **R-COPILOT-03** | Copilot short-report flag | `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` must stay `false` in public production until server snapshot ships. | known | **DEFERRED-BY-OWNER — Final ENV phase** (verification reads production env state) | accept-risk-with-mitigation | fix-before — verify production env + smoke | yes — confirm pre-launch (Final ENV phase) | [parent-ai/final-status.md](../parent-ai/final-status.md) |
| **R-HEAD-01** | headers | No documented CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy posture. | partially-fixed | **WAVE-2** (enforcing active Wave 2K) | accept-risk-with-mitigation | fix-before — 48h prod soak then signoff | yes — CSP enforce owner approval (executed Wave 2K) | [wave-2k-csp-enforcement-execution.md](../../reports/security/wave-2k-csp-enforcement-execution.md) |
| **R-CORS-01** | CORS | No documented allowlist for `/api/*`; default Next behavior may need explicit Origin checks for state-changing routes. | suspected | **WAVE-1** (Origin/Referer assertion in code; allowlist is a constant or non-secret env) | accept-risk-with-mitigation | fix-before — origin allowlist for `/api/parent/*`, `/api/student/login`, Copilot turn | no | (to be confirmed by audit per doc 13) |
| **R-CSRF-01** | CSRF | State-changing endpoints (parent updates, dev-add-coins, copilot-turn) — CSRF posture not documented. | partially-fixed | **WAVE-1** | accept-risk-with-mitigation | fix-before — verify SameSite cookies + Origin checks | no | [COOKIE_CSRF_SESSION_POSTURE.md](./COOKIE_CSRF_SESSION_POSTURE.md) |
| **R-COOKIE-01** | cookies | Session cookie flags (`HttpOnly`, `Secure`, `SameSite`) not documented per audit. | partially-fixed | **WAVE-1** (cookie flags are emitted by handler code, not by env) | accept-risk-with-mitigation | fix-before — confirm flags on student session cookie + parent bearer storage | no | [COOKIE_CSRF_SESSION_POSTURE.md](./COOKIE_CSRF_SESSION_POSTURE.md) |
| **R-PRIV-01** | child data | Israel privacy law + EU/COPPA-style child-data posture not documented. Parental consent model unclear. | partially-fixed | **WAVE-2** (readiness prepared Wave 2L; site implementation pending owner copy) | accept-risk-with-mitigation (closed pilot ≤ 50 testers + signed waiver) | fix-before — legal review + privacy notice + cookie banner if needed | **yes** — jurisdiction + pilot-vs-public decision | [wave-2l-privacy-site-policy-readiness.md](../../reports/security/wave-2l-privacy-site-policy-readiness.md); [PRIVACY_COOKIES_CHILD_DATA_PLAN.md](./PRIVACY_COOKIES_CHILD_DATA_PLAN.md) |
| **R-LOG-01** | logs / artifacts | `reports/` is gitignored but contains screenshots of student progress + state files; retention + access control undefined. | suspected | **WAVE-1** (retention script + redaction helper) | accept-risk-with-mitigation (artifacts stay local) | fix-before — retention policy + access control if any artifact ships | no | (to be defined in doc 18) |
| **R-PUB-01** | public surface | `/contact` form abuse (spam, PII overshare) and `/api/gallery` rate-limit not documented. | suspected | **WAVE-1** (server validation + in-memory rate-limit; captcha provider keys would be Final ENV) | accept-risk-with-mitigation | fix-before — captcha or rate-limit + sanitization | no | (to be defined in doc 19) |
| **R-DEP-01** | supply chain | `npm audit` posture, lockfile policy, transitive deps not periodically reviewed. `html2pdf.js`, `jspdf`, `node-edge-tts`, `recharts` are runtime dependencies. | partially-fixed | **WAVE-1** (`npm audit`, lockfile review, Dependabot config; no env writes) | accept-risk-with-mitigation | fix-before — `npm audit` clean + lockfile policy + Dependabot/Renovate | no | Waves 2D–2G: **0 critical/0 high**, 2 moderate PostCSS residue; [wave-2j-non-env-security-closure-map.md](../../reports/security/wave-2j-non-env-security-closure-map.md) |
| **R-VERCEL-01** | deployment | Preview deploy access policy + env separation (preview vs production) + `vercel.json` headers config not documented. | suspected | **WAVE-1** for `vercel.json` headers (no env writes) / **DEFERRED-BY-OWNER — Final ENV phase** for env preflight + preview-protection toggle | accept-risk-with-mitigation (preview behind Vercel auth) | fix-before — preview-deploy access policy + production env audit | no | (to be defined in doc 21) |

## P2 — defense-in-depth, non-blocking

| ID | Area | Title | State | Public impact | Evidence |
|----|------|-------|-------|---------------|----------|
| **R-RLS-02** | RLS | RLS policies not externally documented in this repo; verify in Supabase that `learning_*` tables enforce parent/student scoping at the row level (in addition to API filters). | partially-fixed | accept-risk-with-mitigation | [wave-3a-security-ops-closure.md](../../reports/security/wave-3a-security-ops-closure.md); `verify-learning-rls.mjs --no-dotenv --anon-only` safe path; live run pending |
| **R-XSS-01** | XSS | `dangerouslySetInnerHTML` usages not enumerated; Hebrew rendering paths not scanned for injection. | partially-fixed | accept-risk-with-mitigation | [wave-2i-xss-input-hardening.md](../../reports/security/wave-2i-xss-input-hardening.md) — 1 dev-only sink (prod blocked) |
| **R-INPUT-01** | input validation | Parent-controlled text fields (student name, etc.) — sanitization + length-cap policy not documented. | partially-fixed | accept-risk-with-mitigation | [wave-2i-security-fix-summary.md](../../reports/security/wave-2i-security-fix-summary.md); grade enum pending |
| **R-LOG-02** | telemetry | Server-side logs may inadvertently include PII (student names, login_username, error stacks with body). Log policy not documented. | partially-fixed | accept-risk-with-mitigation | `lib/security/safe-log.js` + wave-2i; formal policy doc pending |
| **R-IR-01** | incident response | No documented IR runbooks (credential leak, data leak, abuse traffic, dependency CVE, rollback). | partially-fixed | accept-risk-with-mitigation | [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md); **table-top rehearsed 2026-05-23** ([wave-3d](../../reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md)); live alerting cadence pending |
| **R-MON-01** | monitoring | No documented alerting on auth failures, rate-limit hits, 5xx spikes, or anomalous Copilot traffic. | partially-fixed | accept-risk-with-mitigation | [MONITORING_AND_ALERTING_PLAN.md](./MONITORING_AND_ALERTING_PLAN.md); live alerts deferred (D-MON-1 / Final ENV) |
| **R-AUTH-04** | session | Session expiry / revocation behavior not documented; long-lived student session may persist across device handoff. | partially-fixed | accept-risk-with-mitigation | [COOKIE_CSRF_SESSION_POSTURE.md](./COOKIE_CSRF_SESSION_POSTURE.md) — remote revoke UX gap |
| **R-DBG-01** | debug surfaces | ~~`/api/learning-supabase/health`~~ **removed** (2026-05) — no DB readiness probe route; uptime via `GET /` only. | closed | fixed | [site-map-and-protection-audit.md](../site-map-and-protection-audit.md) |

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

---

## Teacher Portal — Phase 2 (planning-only)

> **Planning-only addition.** No code, no DB change, no RLS change has been applied for any of these rows. They are tracked here so Phase 9 (cross-tenant tests) and any future implementation pass can refer to them. See [`docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`](../teacher-portal/RLS_SECURITY_PROPOSAL.md) for the full Phase 2 RLS / security proposal and threat model.

### Personas added

- **`TEACHER`** — a Supabase Auth user (`auth.users.id`) with a `teacher_profiles` row. Authenticates via the planned `/teacher/login`. Session is `Authorization: Bearer <Supabase access_token>`.
- **`GUARDIAN_VIEW`** — a non-`auth.users` identity authenticated by a teacher-issued credential (`student_guardian_access` row). Authenticates via the planned `/guardian/login`. Session is the HMAC cookie `liosh_guardian_session` backed by `student_guardian_sessions`. Read-only, scoped to a single student.

### Teacher Portal P1 — fix before any teacher-portal phase ships to public

| ID | Area | Title | State | Execution | Pilot impact | Public impact | Owner decision? | Evidence |
|----|------|-------|-------|-----------|--------------|---------------|-----------------|----------|
| **R-TCH-01** | teacher consent | A teacher could link an existing parent-owned student merely by knowing/guessing the `student_id` UUID, bypassing parent consent. | known (planning-only) | **PHASE-2 PLAN** — closed in design via "no client `INSERT` on `teacher_students`" + consent-gated `/api/teacher/students/link` (Phase 3 contract, Phase 4 implementation). | n.a. (portal not built) | block — must be implemented and tested before any teacher-portal traffic | yes — exact consent artifact format (see Phase 3 open questions) | [RLS_SECURITY_PROPOSAL.md §2 + threat T-TCH-1](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-02** | cross-teacher RLS | Teacher A reads Teacher B's classes, links, audit, or guardian-access rows (client `SELECT` or API). | suspected (planning-only) | **PHASE-2/3.5 PLAN** — client `SELECT` scoped by `teacher_id = auth.uid()`; server-only tables have no client policies; cross-teacher writes only via service-role APIs that must reject. | n.a. | block — Phase 9 cross-tenant matrix must produce zero leaks | no | [RLS_SECURITY_PROPOSAL.md threats T-TCH-2/3/5](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-08** | client mutation bypass | Teacher uses Supabase JS to `INSERT`/`UPDATE`/`DELETE` on `teacher_students`, `teacher_classes`, or `teacher_class_students`, or `UPDATE` on `teacher_profiles`, bypassing consent, student/class limits, audit, and guardian-access cascade on unlink. | known (planning-only) | **PHASE-3.5 PLAN** — closed in design: no client mutation policies on those tables (`020`); all writes via service-role `/api/teacher/*` (Phase 4 implementation). | n.a. | block — H-TCH-8..8f must RLS-reject before portal traffic | no | [RLS_SECURITY_PROPOSAL.md §2–4 + threat T-TCH-8](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-03** | service-role + manual gate on existing tables | Teacher report API uses service role to read `learning_sessions` / `answers` / `student_learning_state` for a student, joining `teacher_students`. A missing or buggy join is a cross-parent leak. | suspected (planning-only) | **PHASE-2 PLAN** — category (C) manual API ownership gate; same risk shape as `R-RLS-01` but scoped to teacher routes. Phase 9 ownership matrix extended (see [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md)). | n.a. | block — covered by CT-TCH-5 in Phase 9 | no | [RLS_SECURITY_PROPOSAL.md threat T-TCH-3](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-04** | audit immutability | A teacher could forge or delete `teacher_access_audit` rows, hiding consent or revocation history. | known (planning-only) | **PHASE-2 PLAN** — server-only table, no `INSERT`/`UPDATE`/`DELETE` policy for `authenticated`. CHECK constraint on `actor_role`/`actor_id`. | n.a. | block | no | [RLS_SECURITY_PROPOSAL.md §9 + threats T-TCH-6/7](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-01** | guardian boundary — single-student scope | A guardian session reads a student other than the one bound to its `student_guardian_access` row. | known (planning-only) | **PHASE-2 PLAN** — `/api/guardian/student/[studentId]/report-data` enforces `studentId === guardian_access.student_id`; mismatch returns 403. | n.a. | block — covered by CT-GRD-1 | no | [RLS_SECURITY_PROPOSAL.md threat T-GRD-4](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-02** | guardian → parent / teacher / student route escalation | A guardian session calls `/api/parent/*`, `/api/teacher/*`, or `/api/student/*` and is wrongly accepted because of a shared cookie name or shared session check. | known (planning-only) | **PHASE-2 PLAN** — separate cookie name (`liosh_guardian_session`) and separate session table; existing parent/student/teacher routes do not accept the guardian cookie. | n.a. | block — covered by CT-GRD-2/3/4/5/6 | no | [RLS_SECURITY_PROPOSAL.md threats T-GRD-1/2/3/6](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-03** | guardian credential brute force | The 4-digit guardian PIN is brute-forced via repeated calls to `/api/guardian/login`. | known (planning-only) | **PHASE-2 PLAN** — IP + per-username in-memory rate limit; failed attempts audited. DB-backed throttle deferred. | n.a. | block — Phase 4/8 must implement the rate-limit before any owner-approved enable. | no | [RLS_SECURITY_PROPOSAL.md threat T-GRD-7](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-04** | revocation cascade | A revoked or expired `student_guardian_access` row leaves live `student_guardian_sessions` rows that still authenticate. | known (planning-only) | **PHASE-2 PLAN** — revoke API revokes all dependent session rows in the same service-role pass. Optional Phase 4 trigger to harden. | n.a. | block — covered by CT-GRD-7/8 | no | [RLS_SECURITY_PROPOSAL.md §8 + threats T-GRD-10/11](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |

### Teacher Portal P2 — defense-in-depth (planning-only)

| ID | Area | Title | State | Public impact | Evidence |
|----|------|-------|-------|---------------|----------|
| **R-TCH-05** | audit content | Audit `metadata` jsonb could inadvertently capture raw PINs, tokens, IPs, parent emails, or full names. | known (planning-only) | accept-risk-with-mitigation — Phase 4 must enforce a deny-list of forbidden keys at the audit-write helper. Owner decision (3) and (5) make the requirement explicit. | [RLS_SECURITY_PROPOSAL.md §9 + Operational notes](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-06** | hard delete cascade | Hard-deleting a teacher (`auth.users` row) while they hold active guardian access could orphan or strand audit references. | known (planning-only) | accept-risk-with-mitigation — `student_guardian_access.created_by_teacher_id` is `ON DELETE RESTRICT`; deletion requires a service-role pass that revokes guardian access first (owner decision 6). | [RLS_SECURITY_PROPOSAL.md threat T-TCH-11](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-TCH-07** | migration ordering | A separate migration reuses `019`/`020` or ships out of order, causing schema/RLS drift or apply failures. | known (planning-only) | accept-risk-with-mitigation — Teacher Portal uses `019` (foundation) then `020` (RLS); next unrelated migration must be **`021_*` or higher**. Apply only after owner approval. | [RLS_SECURITY_PROPOSAL.md Operational notes](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-05** | privacy — IP retention | If `ip_hash` / `user_agent` is logged on guardian sessions, a privacy review is required before any retention. | known (planning-only) | accept-risk-with-mitigation — owner decision (5): never store raw IP; only hashed IP; `user_agent` only if justified. Phase 4 implementation must respect the boundary. | [RLS_SECURITY_PROPOSAL.md §8 + Owner decisions recap](../teacher-portal/RLS_SECURITY_PROPOSAL.md) |
| **R-GRD-06** | identity confusion | A guardian credential is misperceived as a "parent account", leading to product UX or legal confusion. | known (planning-only) | accept-risk-with-mitigation — separate route (`/guardian/login`), separate cookie, separate shell, no merge into `/parent/login` until owner-approved Phase 10. | [TEACHER_PORTAL_MASTER_PLAN.md §F + RLS_SECURITY_PROPOSAL.md "What must remain unchanged"](../teacher-portal/TEACHER_PORTAL_MASTER_PLAN.md) |

### Cross-reference index update

- **Teacher Portal**: R-TCH-01..08, R-GRD-01..06 — see [`docs/teacher-portal/RLS_SECURITY_PROPOSAL.md`](../teacher-portal/RLS_SECURITY_PROPOSAL.md) and the appended Teacher Portal section in [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md).

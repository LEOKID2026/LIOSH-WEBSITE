# Vercel Deployment Security Plan

**Generated:** 2026-05-23
**Risk rows:** R-VERCEL-01 (P1), R-ENV-01 (P0), R-DEV-01..02 (P0), R-COPILOT-01 (P0)

## Wave allocation (post-2026-05-23 owner ENV deferral)

- **Allowed in Wave 1 (code-only, no env writes):** publish a `vercel.json` (or `next.config.js` `headers()`) producing the security headers from [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md). This does not change any env value.
- **DEFERRED-BY-OWNER — Final ENV phase:** every action in this doc that *reads, writes, adds, removes, renames, rotates, or toggles* a Vercel environment variable, or toggles a Vercel project setting that depends on env state (e.g. preview-deploy protection if it is configured via env). Owner has explicitly postponed all of these to the final pre-launch phase.

## Goal

Confirm the deployment environment (Vercel) does not introduce additional risk and that environment separation, preview-deploy access, and headers are correctly configured.

## Environment separation

| Vercel env | Allowed values | Notes |
|------------|----------------|-------|
| Production | real Supabase project (`ajxwmlwbzxwffrtlfuoe`); no dev flags | every `NEXT_PUBLIC_*` flag carefully reviewed |
| Preview | same Supabase or a staging one (owner decision) | preview deploys are publicly reachable unless gated |
| Development | local | n/a |

> **Owner decision required:** is production using the same Supabase project as the closed pilot fixture? If yes, document risk: a preview deploy environment variable mistake could write into production data. Mitigation: separate preview Supabase, OR ensure preview is **strictly read-only** by env policy.

## Preview-deploy access policy

Preview deploys (`https://*.vercel.app`) inherit production code but with preview env. Unless protected, a preview URL is **public** — anyone with the URL can probe.

Required:

- Vercel "Protection" enabled on Preview deployments (Vercel Authentication or Password) until public launch.
- After public launch, preview can stay protected; production stays open.

## Production env checklist (pre-deploy)

> **DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION.** Implementation of the preflight script is forbidden in current waves; it will land in the Final ENV phase together with rotation work.

A `scripts/security/preflight-prod-env.mjs` (planned, not implemented now) reads the production env and **fails the deploy** if any of:

| Variable | Required state |
|----------|----------------|
| `NODE_ENV` | `production` |
| `LEARNING_SUPABASE_SERVICE_ROLE_KEY` | non-empty |
| `LEARNING_STUDENT_ACCESS_SECRET` | non-empty |
| `NEXT_PUBLIC_LEARNING_SUPABASE_URL` | matches expected production URL |
| `NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY` | non-empty |
| `ENGINE_REVIEW_ADMIN_TOKEN` | non-empty AND not equal to `7479` (the placeholder; see [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md)) |
| `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` | unset or `false` |
| `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD` | unset or `false` |
| `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` | `false` |
| `ARCADE_ALLOW_FOUNDATION_ACTIONS` | unset or `false` |
| `NEXT_PUBLIC_ARCADE_DEBUG` | unset or `false` |
| `NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY` | unset or `false` |
| `PARENT_COPILOT_LLM_API_KEY` or `GEMINI_API_KEY` | present if LLM mode is enabled |

## `vercel.json` / `next.config.js` headers

Deploy headers via either mechanism. The header policy lives in [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md). Verify post-deploy with `curl -I` and Mozilla Observatory.

## Build security

- No build-time secrets baked into the client bundle (verify by grepping the production build output for known secrets — done as part of next fix pass).
- `next build` runs in Vercel's isolated builder; do not add custom unsigned scripts.

## Region / data residency

- Owner decision: confirm Supabase project region (Israel / EU / US) matches the privacy posture chosen in [PRIVACY_COOKIES_CHILD_DATA_PLAN.md](./PRIVACY_COOKIES_CHILD_DATA_PLAN.md).
- Vercel function region: defaults to `iad1` (US-east) unless configured. Owner decision: leave or move closer to user base for latency + privacy alignment.

## Domain + TLS

- Production domain uses Vercel-managed TLS (HSTS via header — see doc 12).
- Confirm DNS provider has DNSSEC enabled (owner decision; nice-to-have).

## Acceptance — Wave 1 (allowed now, no ENV writes)

- `vercel.json` (or `next.config.js` `headers()`) emits the required security headers (per [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md)). Verified via `curl -I` on a preview deploy.
- HSTS header active.
- Partial closure for R-VERCEL-01 is captured here.

## Acceptance — Final ENV phase (DEFERRED-BY-OWNER)

- Preview-deploy protection enabled (if it requires changing a Vercel project setting that the owner reserves for the Final ENV phase).
- Pre-deploy env preflight script active.
- Production env audit passed.
- Full closure for R-VERCEL-01.

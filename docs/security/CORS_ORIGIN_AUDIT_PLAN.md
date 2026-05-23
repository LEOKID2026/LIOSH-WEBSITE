# CORS / Origin Audit Plan

**Generated:** 2026-05-23
**Risk rows:** R-CORS-01 (P1), R-CSRF-01 (P1)

## Goal

Define an explicit origin allowlist for `/api/*` and confirm no route accepts cross-origin requests from an attacker-controlled domain that can read responses or perform state-changing requests with cookies.

## Default behavior

Next.js by default does not emit `Access-Control-Allow-Origin` for API routes. That means cross-origin **read** is blocked by the browser, but cross-origin **POST** with `Content-Type: application/json` (which is a "non-simple" request and triggers preflight) will fail unless we explicitly allow it.

This is the safe baseline. We must keep it.

## Required policy

| Allowlist origin | Allowed for | Why |
|------------------|-------------|-----|
| `https://<production-domain>` | every `/api/*` | the product itself |
| `https://*.vercel.app` (preview) | every `/api/*` **only on preview deploys** | preview workflow; production must NOT allowlist preview |
| (development) `http://localhost:3001`, `http://localhost:3002` | every `/api/*` **only when `NODE_ENV !== 'production'`** | local dev |

No third-party origin is allowed.

## State-changing route policy

Even with cookies, modern browsers treat state-changing POSTs cross-origin the same way; but defense-in-depth requires:

- An explicit `Origin` header check that returns 403 if the header is missing or not in the allowlist (for cookie-authenticated routes).
- Bearer-authenticated routes are inherently safer (CSRF requires reading the bearer first), but the same Origin check is still recommended.

See [COOKIE_SESSION_CSRF_AUDIT_PLAN.md](./COOKIE_SESSION_CSRF_AUDIT_PLAN.md) for the cookie-side complement.

## What to confirm in the audit

| Question | Method |
|----------|--------|
| Does any handler set `Access-Control-Allow-Origin: *`? | grep `Access-Control-Allow-Origin` |
| Does any handler set `Access-Control-Allow-Credentials: true` with a wildcard origin? | grep `Allow-Credentials` (must never coexist with `*`) |
| Is `next.config.js` adding any `headers()` entries with CORS? | read `next.config.js` |
| Is there a global middleware setting CORS? | search for `pages/_middleware*` or `middleware.ts` (not present in this repo per audit) |

## What to add (target — next fix pass, not now)

- A small helper `assertSameOrigin(req)` used by every cookie-authenticated mutating route.
- A small helper `assertAllowedOrigin(req)` used by all parent-bearer mutating routes (defense-in-depth).
- Public routes (`/api/gallery`, `/api/hebrew-*`) keep current behavior; no CORS additions.

## CORS for embedded contexts

The product is **not** intended to be embedded. CSP `frame-ancestors 'none'` + `X-Frame-Options: DENY` (see [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md)) cover this.

If an embedding requirement appears in the future (e.g. a partner school portal), add an explicit allowlist there + revisit cookie `SameSite`.

## Acceptance for next fix pass (CORS slice)

- No handler emits `Access-Control-Allow-Origin: *` in production.
- Cookie-authenticated mutating routes call `assertSameOrigin(req)`.
- Allowlist documented in a single config (env var or constant) and reviewed quarterly.
- R-CORS-01 may move toward `fixed` with these checks captured in `reports/security/cors/<date>/`.

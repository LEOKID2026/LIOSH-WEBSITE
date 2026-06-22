# Security Headers + CSP Plan

**Generated:** 2026-05-23
**Risk rows:** R-HEAD-01 (P1)
**Companion to:** [XSS_INPUT_OUTPUT_AUDIT_PLAN.md](./XSS_INPUT_OUTPUT_AUDIT_PLAN.md), [CORS_ORIGIN_AUDIT_PLAN.md](./CORS_ORIGIN_AUDIT_PLAN.md)

## Goal

Define the production header policy and a draft CSP. **Plan only.** Implementation goes into `next.config.js` `headers()` (or `vercel.json`) in the next fix pass.

## Required headers

| Header | Value (target) | Why |
|--------|----------------|-----|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | force HTTPS; pre-load eligibility |
| `X-Content-Type-Options` | `nosniff` | block content-type confusion |
| `X-Frame-Options` | `DENY` | clickjacking; CSP `frame-ancestors` is the modern way (below) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | minimize referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | disable surfaces we do not use |
| `Cross-Origin-Opener-Policy` | `same-origin` | isolation hardening |
| `Cross-Origin-Resource-Policy` | `same-origin` | resource isolation |
| `X-DNS-Prefetch-Control` | `off` | minor exfiltration vector |

## Content-Security-Policy (draft v0)

This is a **starting point**. Tighten in next pass after auditing scripts/styles/imports actually used.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline'; /* TODO: remove 'unsafe-inline' once inline scripts are nonced */
  style-src 'self' 'unsafe-inline';  /* TODO: tighten with nonces or hashed inline */
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self' data:;
  media-src 'self' blob: data:;
  connect-src 'self' https://*.supabase.co
              https://generativelanguage.googleapis.com
              https://api.openai.com;
  worker-src 'self' blob:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests
```

### Decisions to make

| Item | Owner choice |
|------|--------------|
| Allow Google Fonts? | not currently used (verify); remove from `font-src` if so |
| Allow analytics? | none currently; if added, allowlist explicitly |
| Inline scripts in `_document.js` / `next/script` | confirm whether `'unsafe-inline'` is required or if Next can emit nonce-based CSP |
| Wildcard `*.supabase.co` | acceptable for `connect-src` and `img-src` (single Supabase project) |
| Hebrew TTS (edge-tts) endpoints | runs server-side in Node; no client `connect-src` impact |
| LLM endpoints (`api.openai.com`, `generativelanguage.googleapis.com`) | server-side only; no client-side CSP impact unless a future client-side call is added |

## Report-only first

Roll out as `Content-Security-Policy-Report-Only` for ≥ 7 days, capture violations into a logging endpoint or service, then promote to enforcing.

## Frame protection

- `X-Frame-Options: DENY` AND CSP `frame-ancestors 'none'` (defense in depth).
- Public solo game routes (`/student/solo-games/*`) — confirm none must be embeddable; if any must, switch to `frame-ancestors` allowlist for those routes only.

## Method

| Step | Action |
|------|--------|
| 1 | Inventory every external origin used by browser code (scripts, styles, images, XHR, fonts, media). |
| 2 | Build CSP from inventory; `unsafe-inline` is a temporary allowance for non-critical paths and must be removed. |
| 3 | Configure headers via `next.config.js` `headers()` hook. |
| 4 | Verify with Mozilla Observatory or `curl -I` against deployed preview. |
| 5 | Promote from `Report-Only` to enforcing once 0 violations for ≥ 48h. |

## Acceptance for next fix pass (headers slice)

- All required headers present on every response from production domain.
- CSP enforcing (not Report-Only) in production with 0 violations for ≥ 48h.
- Mozilla Observatory grade ≥ B (target A on follow-up).
- R-HEAD-01 may move toward `fixed` with the above evidence captured under `reports/security/headers/<date>/`.

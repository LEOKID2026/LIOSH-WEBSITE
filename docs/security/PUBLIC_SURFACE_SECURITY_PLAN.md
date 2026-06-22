# Public Surface Security Plan

**Generated:** 2026-05-23
**Risk rows:** R-PUB-01 (P1), R-RATE-01 (P1), R-XSS-01 (P2)

## Scope

Pages reachable without authentication:

- `/` (home), `/about`, `/contact`, `/gallery`, `/game`, `/games`
- `/offline`, `/offline/memory-match`, `/offline/rock-paper-scissors`, `/offline/tap-battle`, `/offline/tic-tac-toe`
- `/api/gallery`

## Risks per page

| Page / API | Risk | Mitigation (target) |
|------------|------|---------------------|
| `/` | reflected XSS via query params | strict React text rendering; CSP (doc 12) |
| `/about` | static content; low risk | none extra |
| `/contact` | spam, PII overshare, phishing-by-impersonation | rate-limit B-CONTACT, captcha optional, server-side validation, no auto-reply that echoes input verbatim |
| `/gallery` | static images; low risk | confirm assets are repo-controlled |
| `/api/gallery` | abuse, scraping | rate-limit B-PUB; static cache; no body input |
| `/game` | client-only game hub; low risk | none extra |
| `/offline/*` (4 mini-games) | client-only games; low risk | same |

## `/contact` form — required posture

1. **Validation:** server validates each field (name ≤ 80, email pattern, message ≤ 4000) — even if a client validates first.
2. **Rate-limit:** B-CONTACT bucket (per [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md)) — 5/hour per IP, 20/day per IP.
3. **Captcha (optional):** owner decision; reCAPTCHA v3 / Cloudflare Turnstile if traffic warrants.
4. **Sink:** where do submissions go? — confirm in next pass (email? Supabase table? logs?). The sink must:
   - Not be world-readable.
   - Strip HTML on display.
   - Have a retention policy (e.g. 90 days; doc 18).
5. **Replies:** never echo user input verbatim back to the user without escaping; never auto-CC the user.
6. **Anti-phishing:** the form does not prompt for parent passwords / PINs; clear "do not enter login info here" hint.

## Public game routes — defense-in-depth

- Confirm none of `/offline/*` or solo game shells make outbound HTTP requests beyond same-origin static assets.
- CSP `connect-src 'self'` blocks accidental external calls.
- Confirm none read or write `localStorage` keys that overlap with student/parent state.

## Marketing-page surface

- No tracking pixels currently (verify in next pass).
- Any future analytics integration goes through a fresh review and adds an entry in [docs/security/SECURITY_DATA_INVENTORY.md](./SECURITY_DATA_INVENTORY.md) and a new register row.

## Acceptance for next fix pass (public surface slice)

- `/contact` posture implemented (validation, rate-limit, sink documented).
- `/api/gallery` rate-limited.
- Public game pages confirmed to make no third-party network calls.
- CSP enforces same-origin connect for public pages.
- R-PUB-01 may move toward `fixed` once these checks pass.

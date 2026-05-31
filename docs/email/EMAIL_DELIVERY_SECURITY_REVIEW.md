# Email Delivery Security Review

**Date:** 2026-05-31  
**Project:** Hebrew learning site — External Email Delivery (Resend via Supabase Custom SMTP)  
**Mode:** Read-only security review — no code, SQL, dashboard, or env changes

---

## Executive Summary

| Area | Verdict |
|------|---------|
| Secrets in repository | **Clean** — no Resend/SMTP credentials in tracked code or docs |
| App env exposure | **Clean** — no SMTP keys in `.env.example` or app env pattern |
| Email transport attack surface | **Low** — all delivery delegated to Supabase Auth; no custom mailer |
| Redirect URL handling | **Review required (owner)** — allowlist must match production origins |
| New risks from Resend migration | **None from code changes** — configuration-only change |
| SQL / migrations required | **None** |

**Overall:** Safe to proceed with owner-only Dashboard configuration. No application code changes required.

---

## 1. SMTP Credential Handling

### Requirement

Resend API key (used as SMTP password) must exist **only** in:

- Resend Dashboard (API key management)
- Supabase Dashboard (Custom SMTP password field)
- Owner's secure password manager

### Verification

| Check | Result |
|-------|--------|
| `RESEND_*` keys in `.env.example` | **Not present** |
| `SMTP_*` keys in `.env.example` | **Not present** |
| Resend/nodemailer/sendgrid in production JS | **Not present** (repo grep) |
| API key values in documentation | **Not present** — placeholders only (`re_xxxxxxxxxxxx`) |
| SMTP password in `auth-password-setup.server.js` | **Not present** — uses anon key for recover POST only |

### Resend SMTP model

| Field | Value | Secret? |
|-------|-------|---------|
| Host | `smtp.resend.com` | No — public |
| Port | `465` / `587` | No — public |
| Username | `resend` | No — public |
| Password | Resend API key | **Yes — owner only** |

---

## 2. Supabase Keys in Application

| Key | Exposure | Risk for email work |
|-----|----------|---------------------|
| `NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY` | Browser + server recover POST | Expected — anon key is public by design; recover endpoint is rate-limited by Supabase |
| `LEARNING_SUPABASE_SERVICE_ROLE_KEY` | Server-only | Not used for email send; used for `auth.admin.*` — must never be in client bundle (verified: server-only imports) |

**Note:** The recover flow (`POST /auth/v1/recover`) intentionally uses the anon key. This is standard Supabase Auth behavior and does not expose the service role key.

---

## 3. Redirect URL Validation

### How redirect URLs are constructed

**Server-side (admin password-setup):**

```text
{NEXT_PUBLIC_SITE_URL | NEXT_PUBLIC_APP_URL | https://VERCEL_URL | https://liosh-website.vercel.app}
  + /auth/reset-password?portal={teacher|parent}
```

**Client-side (forgot-password):**

```text
{window.location.origin}/auth/reset-password?portal={teacher|parent}
```

### Security consideration

Supabase Auth validates `redirect_to` against the project's **Redirect URL allowlist**. If allowlist is misconfigured:

- Recovery links may fail to establish session
- Open redirect risk is mitigated by Supabase allowlist enforcement

### Owner action required

- [ ] **[OWNER ACTION REQUIRED]** Verify Supabase Auth redirect URL allowlist includes all production and preview origins
- [ ] **[OWNER ACTION REQUIRED]** Avoid wildcard patterns that are overly permissive unless intentional

See [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md) for URL checklist.

---

## 4. Rate Limiting

### Supabase Auth

Supabase enforces per-email rate limits on recovery and signup emails (e.g. "Email rate limit exceeded"). App maps this to Hebrew in `lib/parent-client/parent-auth-errors.he.js`.

### Application-level

Additional in-memory rate limits exist on login and registration API routes (`lib/security/in-memory-rate-limit.js`). These complement but do not replace Supabase Auth email limits.

### Owner action required

- [ ] **[OWNER ACTION REQUIRED]** Review Supabase Auth rate limit settings after enabling Custom SMTP
- [ ] **[OWNER ACTION REQUIRED]** Monitor Resend Dashboard for bounce/complaint rates on free tier

---

## 5. Enumeration Safety

Forgot-password flow always shows the same success message regardless of whether the email exists:

> *"אם קיים חשבון עם כתובת זו, ישלח קישור לאיפוס הסיסמה."*

Verified by `password-reset-matrix.mjs` (`forgot_password_enumeration_safe` — PASS).

---

## 6. Logging and Error Handling

### Password-setup recover failures

`auth-password-setup.server.js` logs via `safeApiLog()` with status and message string only — no email content, no API keys.

### Reset-password page

Uses `sanitizeAuthErrorForLog()` before console output — avoids leaking sensitive auth details.

### Documentation rule

No secrets in logs, test output, terminal output, screenshots, or QA reports. This review confirms no secrets were printed during static test runs.

---

## 7. Internal Staff Addresses

| Item | Detail |
|------|--------|
| Pattern | `staff-{uuid}@staff.noreply.liosh` |
| Purpose | Synthetic auth identity for school staff code+PIN login |
| Email delivery | **Never** — no inbox, no SMTP send |
| Security benefit | Staff auth decoupled from real email addresses |

**Verdict:** Correct design — no delivery risk for internal addresses.

---

## 8. Flows That Do Not Send Email (Confirmed)

| Flow | Security note |
|------|---------------|
| School staff invite by email | Resolves user ID only — no invitation email reduces phishing surface |
| PIN/code login portals | No email dependency |
| Teacher registration `createUser` with `email_confirm: true` | Admin-controlled provisioning — no unsolicited signup email |

---

## 9. Email Templates

- Templates live in Supabase Dashboard — not in repo
- Changing templates does not require code deploy
- Hebrew/RTL template changes are owner-controlled — no copy was modified in this work
- Template bodies must not contain secrets or embedded API keys

---

## 10. SQL / Database

| Check | Result |
|-------|--------|
| SQL required for SMTP migration | **No** |
| Migrations created | **No** |
| Schema changes | **None** |

Password-setup status columns (`password_setup_sent_at`, `password_setup_last_error`) already exist in migration 052 — no new SQL needed.

---

## 11. Out-of-Scope Security Items (Not Changed)

The following were not modified and remain governed by existing security posture:

- Parent session in browser storage (XSS risk — see pre-launch audit)
- In-memory rate limits on serverless (distributed abuse — see pre-launch audit)
- RLS policies
- Auth RLS / persona entitlement logic

---

## 12. Hard Rules Compliance (This Work)

| Rule | Compliant |
|------|-----------|
| No secrets in repo/docs/logs | Yes |
| No SQL created or run | Yes |
| No app code changes | Yes |
| No UI/Hebrew copy changes | Yes |
| No commit/push/deploy | Yes |
| Dashboard config owner-only | Yes — documented with `[OWNER ACTION REQUIRED]` |

---

## Recommendations for Owner (Post-Config)

1. Rotate Resend API key if it was ever exposed outside Dashboard/password manager
2. Use a dedicated subdomain for transactional mail (e.g. `mail.yourdomain.com`)
3. Enable DKIM + SPF verification before production traffic
4. Run live smoke tests per [`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md) after SMTP config
5. Monitor Resend Dashboard for delivery failures and bounces

---

## Related Documents

- [`EMAIL_DELIVERY_AUDIT.md`](./EMAIL_DELIVERY_AUDIT.md)
- [`RESEND_SETUP_CHECKLIST.md`](./RESEND_SETUP_CHECKLIST.md)
- [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md)
- [`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md)

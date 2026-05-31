# Email Delivery QA Report

**Date:** 2026-05-31 (updated — owner-guided pre-domain phase)  
**Project:** Hebrew learning site — External Email Delivery (Resend via Supabase Custom SMTP)  
**Mode:** Static/code verification complete; live delivery blocked until custom domain + Resend DNS + Supabase SMTP

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **PASS** | Static/code/documentation check completed successfully |
| **PENDING_OWNER_SMTP_CONFIG** | Requires Resend domain verification + Supabase Custom SMTP setup before live test |
| **BLOCKED** | Real blocker — cannot proceed until blocker is resolved |

---

## Implementation Phase Status (Owner-Guided)

| Component | Status | Notes |
|-----------|--------|-------|
| Resend account | **Pending owner** | Owner confirmed: account not yet created. Safe to create now (Phase 0). |
| Sending domain | **Blocked — no custom domain** | Site on Vercel free domain; custom domain purchase pending. Recommended: `mail.<future-domain>` or `auth.<future-domain>`. |
| DNS verification | **Blocked — no custom domain** | Deferred until domain purchased and DNS records can be added. |
| Supabase Custom SMTP | **Blocked — no verified domain** | Owner confirmed: do not configure until Resend domain verified. |
| Supabase Dashboard access | **Ready** | Owner confirmed access available. |
| Live email tests | **Blocked** | Depends on verified domain + SMTP config. |

**Current phase:** Phase 0 — pre-domain preparation. See [`RESEND_SETUP_CHECKLIST.md`](./RESEND_SETUP_CHECKLIST.md) Phase 0 section.

---

## Summary

| Category | Count |
|----------|-------|
| PASS | 17 |
| PENDING_OWNER_SMTP_CONFIG | 0 |
| BLOCKED | 8 |

**Overall:** Code paths and documentation are ready. Live email delivery is **blocked** until owner purchases a custom domain, verifies it in Resend, and configures Supabase Custom SMTP.

---

## Static / Code Path Tests

| ID | Test | Method | Result | Notes |
|----|------|--------|--------|-------|
| S-01 | `sendPasswordSetupRecoveryEmail` calls Supabase recover endpoint | Source review + `registration-password-setup-matrix.mjs` | **PASS** | `POST /auth/v1/recover` confirmed in `lib/auth/auth-password-setup.server.js` |
| S-02 | Server redirect URL includes `/auth/reset-password?portal=` | Source review + matrix test | **PASS** | Uses `getPublicSiteOrigin()` + portal param |
| S-03 | Forgot-password uses `resetPasswordForEmail` | Source review + `password-reset-matrix.mjs` | **PASS** | `pages/auth/forgot-password.js` |
| S-04 | Reset-password page uses recovery session + `updateUser` | Source review + matrix test | **PASS** | `establishRecoverySession` + password update |
| S-05 | No custom SMTP or third-party mailer in app | Repo grep (`resend`, `nodemailer`, `sendgrid`, `smtp`) | **PASS** | No production matches |
| S-06 | Internal `@staff.noreply.liosh` addresses never reach email transport | Source review | **PASS** | Synthetic addresses in `school-staff-crypto.server.js`; no send call |
| S-07 | Staff email invite does not send email | Source review | **PASS** | `school-staff-invite.server.js` — lookup only |
| S-08 | Teacher/school registration uses `email_confirm: true` (no signup email) | Source review | **PASS** | `auth-registration-request.server.js`, `school-staff-provision.server.js` |
| S-09 | Password reset matrix (33 checks) | `node tests/auth/password-reset-matrix.mjs` | **PASS** | 33/33 pass (2026-05-31) |
| S-10 | Registration password-setup matrix (7 checks) | `node tests/auth/registration-password-setup-matrix.mjs` | **PASS** | 7/7 pass (2026-05-31) |
| S-11 | Forgot-password page renders | HTTP check in matrix test | **PASS** | status=200 |
| S-12 | Reset-password page renders | HTTP check in matrix test | **PASS** | status=200 |
| S-13 | Enumeration-safe forgot-password message | Source review + matrix test | **PASS** | Same success message regardless of account existence |
| S-14 | Hebrew UI constants on auth reset pages | `auth-reset.he.js` + matrix Hebrew guard | **PASS** | No forbidden English strings on forgot/reset pages |
| S-15 | Parent auth error mapping for email confirmation | Source review | **PASS** | `Email not confirmed` → Hebrew in `parent-auth-errors.he.js` |
| S-16 | No email templates in repository | File inventory | **PASS** | Templates in Supabase Dashboard only |
| S-17 | No Supabase Edge Functions for email | Directory check | **PASS** | `supabase/functions/` does not exist |

---

## Live Delivery Tests

**Blocker:** No custom sending domain yet. All live tests remain **BLOCKED** until: (1) custom domain purchased, (2) Resend domain verified, (3) Supabase Custom SMTP configured.

| ID | Test | Portal / Flow | Result | Blocker / next action |
|----|------|---------------|--------|------------------------|
| L-01 | Password reset email arrives | Parent — `/auth/forgot-password?portal=parent` | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-02 | Password reset email arrives | Teacher — `/auth/forgot-password?portal=teacher` | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-03 | Admin password-setup email | Teacher reactivate from pending | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-04 | Admin password-setup email | School registration approve | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-05 | Parent signup confirmation email | Parent signup (if email confirm enabled) | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-06 | Reset link redirects correctly | Click email link | **BLOCKED** | Requires L-01/L-02 email delivery first |
| L-07 | Email sent from Resend verified domain | Any recovery email | **BLOCKED** | Requires verified domain + Supabase SMTP |
| L-08 | Email template Hebrew/RTL rendering | Supabase Dashboard templates | **BLOCKED** | Can review in Dashboard anytime; live send test blocked until SMTP |

---

## Flows Not Requiring Live Email Test (By Design)

| Flow | Reason |
|------|--------|
| School staff invite by email | Lookup only — no email sent |
| Staff / guardian / student PIN login | No Supabase Auth email |
| Internal `@staff.noreply.liosh` provisioning | Synthetic address — no delivery |
| Guardian magic link (teacher portal) | Marked future-only in docs; not SMTP-triggered today |
| Email change | Not used in app code |

---

## Hebrew / RTL Verification

### App UI (verified — PASS)

| Page | RTL | Hebrew copy source |
|------|-----|-------------------|
| `/auth/forgot-password` | `dir="rtl" lang="he"` | `lib/auth/auth-reset.he.js` |
| `/auth/reset-password` | `dir="rtl" lang="he"` | `lib/auth/auth-reset.he.js` |

Static matrix confirms no forbidden English UI strings on these pages.

### Email templates (blocked for live send — BLOCKED)

- Email body HTML is in **Supabase Dashboard → Authentication → Email Templates**
- Default templates are English; RTL/Hebrew customization is an **owner Dashboard action**
- Live template rendering test blocked until SMTP configured; optional Dashboard-only review can happen earlier
- No email copy was changed as part of this work

---

## Tests Run (2026-05-31)

```text
node tests/auth/password-reset-matrix.mjs
  → Password reset matrix: 33/33 pass

node tests/auth/registration-password-setup-matrix.mjs
  → Registration password-setup matrix: 7/7 pass
```

No live SMTP connection, Supabase Dashboard access, or real email addresses were used during this report.

---

## Owner Resume Checklist (When Custom Domain Is Ready)

When you have purchased and can manage DNS on your custom domain, tell the agent and resume:

1. [ ] Resend account created (Phase 1)
2. [ ] Add `mail.<yourdomain>` or `auth.<yourdomain>` in Resend Domains
3. [ ] Add DNS records at registrar; verify domain in Resend
4. [ ] Generate Resend API key (password manager only — never paste in chat)
5. [ ] Configure Supabase Custom SMTP (see [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md))
6. [ ] Verify Supabase redirect URL allowlist
7. [ ] Run live tests L-01 through L-08; update this report to **PASS** or **BLOCKED**

---

## Related Documents

- [`EMAIL_DELIVERY_AUDIT.md`](./EMAIL_DELIVERY_AUDIT.md)
- [`RESEND_SETUP_CHECKLIST.md`](./RESEND_SETUP_CHECKLIST.md)
- [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md)
- [`EMAIL_DELIVERY_SECURITY_REVIEW.md`](./EMAIL_DELIVERY_SECURITY_REVIEW.md)

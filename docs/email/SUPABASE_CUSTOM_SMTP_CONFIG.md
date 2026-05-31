# Supabase Custom SMTP Configuration

**Project:** Hebrew learning site — External Email Delivery  
**Providers:** Brevo Free (temporary launch) · Resend (long-term, after custom domain)  
**Audience:** Owner only — all configuration steps require Supabase Dashboard access

---

## Temporary Launch Path — Brevo Free

Use this path **now** for launch while no custom domain exists. Brevo Free allows transactional SMTP without purchasing a domain first.

### Why Brevo temporarily

- Supabase default SMTP: ~**2 emails/hour** — too low for launch
- Brevo Free: **300 emails/day**
- No app code changes — Supabase Auth still triggers all emails
- SMTP2GO was not usable (Gmail signup blocked; private-domain email required)

Full setup guide: [`BREVO_TEMPORARY_SMTP_SETUP.md`](./BREVO_TEMPORARY_SMTP_SETUP.md)

### Brevo SMTP fields (Supabase Dashboard)

**Path:** Supabase Dashboard → Authentication → Emails → SMTP Settings / Custom SMTP

| Field | Value | Notes |
|-------|-------|-------|
| **Enable Custom SMTP** | On | Replaces Supabase default sender |
| **Host** | `smtp-relay.brevo.com` | Brevo SMTP relay |
| **Port** | `587` | STARTTLS |
| **Username** | `ad17b3001@smtp-brevo.com` | Brevo-assigned SMTP login |
| **Password** | `[OWNER ENTERS BREVO SMTP KEY HERE — NOT IN DOCS]` | Brevo SMTP key — enter only in Dashboard |
| **Sender name** | `Leo Kid` or `ליאו קיד` | Owner choice |
| **Sender email** | Owner-selected / Brevo-verified sender | Must match Brevo sender configuration |

### Owner checklist — Brevo SMTP

- [ ] **[OWNER ACTION REQUIRED]** Enable Custom SMTP in Supabase Dashboard
- [ ] **[OWNER ACTION REQUIRED]** Enter Brevo host, port, username, and SMTP key (password)
- [ ] **[OWNER ACTION REQUIRED]** Set sender name and sender email
- [ ] **[OWNER ACTION REQUIRED]** Save settings
- [ ] **[OWNER ACTION REQUIRED]** Run smoke tests in [`BREVO_TEMPORARY_SMTP_SETUP.md`](./BREVO_TEMPORARY_SMTP_SETUP.md)

**Clarifications:**

- No application code changes are needed.
- This is a **temporary launch setup**.
- Resend remains the preferred **long-term** setup after a custom domain is purchased (see below).

---

## Long-Term Path — Resend (After Custom Domain)

### Prerequisites

Complete [`RESEND_SETUP_CHECKLIST.md`](./RESEND_SETUP_CHECKLIST.md) first:

- Resend account created
- Sending domain verified
- Resend API key generated and stored securely (not in this repo)

---

## Configuration Path

**Supabase Dashboard → Project (learning site) → Authentication → Emails → SMTP Settings**

(Exact menu labels may vary slightly by Supabase Dashboard version. Look for **Custom SMTP** or **SMTP Settings** under Authentication → Emails.)

---

## Resend Custom SMTP Fields

Enable **Custom SMTP** and enter the following values when migrating from Brevo to Resend.

| Field | Value | Notes |
|-------|-------|-------|
| **Enable Custom SMTP** | On | Disables Supabase default sender for Auth emails |
| **Host** | `smtp.resend.com` | Resend SMTP endpoint |
| **Port** | `465` | Recommended (SSL). Alternative: `587` (STARTTLS) |
| **Username** | `resend` | Fixed value per Resend docs |
| **Password** | `[OWNER ENTERS RESEND API KEY HERE — NOT IN DOCS]` | Resend API key with sending access — enter only in Dashboard |
| **Sender name** | Owner decides | e.g. `Liosh Learning` / `ליאוש לימוד` |
| **Sender email** | Owner decides | Must use verified Resend domain, e.g. `noreply@mail.yourdomain.com` |

### Owner checklist — Resend SMTP

- [ ] **[OWNER ACTION REQUIRED]** Enable Custom SMTP in Supabase Dashboard
- [ ] **[OWNER ACTION REQUIRED]** Enter host: `smtp.resend.com`
- [ ] **[OWNER ACTION REQUIRED]** Enter port: `465` (or `587` if preferred)
- [ ] **[OWNER ACTION REQUIRED]** Enter username: `resend`
- [ ] **[OWNER ACTION REQUIRED]** Enter password: Resend API key (from password manager — never paste into repo)
- [ ] **[OWNER ACTION REQUIRED]** Set sender name and sender email (verified domain)
- [ ] **[OWNER ACTION REQUIRED]** Save settings

---

## Redirect URL Allowlist

Supabase Auth validates `redirect_to` on recovery and confirmation links. If the URL is not allowlisted, links in emails may fail or redirect incorrectly.

**Configuration path:** Supabase Dashboard → Authentication → URL Configuration

### Required redirect URLs

Add all URLs that may appear in `redirect_to`:

| URL pattern | Used by |
|-------------|---------|
| `https://liosh-website.vercel.app/auth/reset-password` | Production password reset (hardcoded fallback origin) |
| `https://liosh-website.vercel.app/auth/reset-password?portal=parent` | Production parent portal reset |
| `https://liosh-website.vercel.app/auth/reset-password?portal=teacher` | Production teacher portal reset |
| `https://<your-production-domain>/auth/reset-password*` | If `NEXT_PUBLIC_SITE_URL` points to a custom domain |
| `http://localhost:3000/auth/reset-password*` | Local development (optional) |
| `http://localhost:3001/auth/reset-password*` | Local dev alternate port (optional) |
| Vercel preview URLs | If testing on preview deploys — add pattern or specific preview URLs |

### Redirect origin priority (app code)

Server-side password-setup emails resolve origin via:

1. `NEXT_PUBLIC_SITE_URL`
2. `NEXT_PUBLIC_APP_URL`
3. `https://${VERCEL_URL}` (Vercel-injected)
4. Fallback: `https://liosh-website.vercel.app`

Browser forgot-password uses `window.location.origin` at request time.

### Owner checklist — URLs

- [ ] **[OWNER ACTION REQUIRED]** Open Authentication → URL Configuration
- [ ] **[OWNER ACTION REQUIRED]** Add production site URL(s) to **Redirect URLs** allowlist
- [ ] **[OWNER ACTION REQUIRED]** Add query-parameter variants if Supabase requires exact match (`?portal=parent`, `?portal=teacher`)
- [ ] **[OWNER ACTION REQUIRED]** Add localhost URLs if local email testing is needed
- [ ] **[OWNER ACTION REQUIRED]** Confirm **Site URL** matches primary production origin

---

## Email Rate Limits

Supabase Auth applies rate limits on email sends (e.g. recovery requests per address per hour). These limits apply regardless of SMTP provider.

**Configuration path:** Supabase Dashboard → Authentication → Rate Limits (or Auth settings)

### Owner checklist — rate limits

- [ ] **[OWNER ACTION REQUIRED]** Review Auth email rate limit settings
- [ ] **[OWNER ACTION REQUIRED]** Confirm limits are appropriate for launch (avoid overly permissive settings)
- [ ] **[OWNER ACTION REQUIRED]** Note: Brevo Free tier allows **300 emails/day**; Resend free tier has its own limits — monitor in provider Dashboard

---

## Email Templates

Auth email bodies (recovery, confirmation, invite, magic link) are managed in Supabase Dashboard, **not in this repository**.

**Configuration path:** Supabase Dashboard → Authentication → Email Templates

### Templates relevant to this site

| Template | Used by flow |
|----------|--------------|
| **Reset Password** / Recovery | Flow 1 (forgot password), Flow 2 (admin password-setup) |
| **Confirm signup** | Flow 3 (parent signup) — if email confirmation enabled |
| **Change email address** | Not actively used in app code today — review if enabled in project settings |
| **Magic Link** | Not actively used in app code today |

### Hebrew / RTL note

- App UI pages (`/auth/forgot-password`, `/auth/reset-password`) use Hebrew RTL (`dir="rtl"`, `lang="he"`).
- Email templates in Supabase Dashboard are **English by default**.
- Optional owner review: add `dir="rtl"` and Hebrew body text in Dashboard templates — **requires owner approval before changing copy**.

### Owner checklist — templates

- [ ] **[OWNER ACTION REQUIRED]** Review Reset Password / Recovery template
- [ ] **[OWNER ACTION REQUIRED]** Review Confirm signup template (if email confirmation is enabled)
- [ ] **[OWNER ACTION REQUIRED]** Optionally adjust template for Hebrew/RTL — owner-approved copy only
- [ ] **[OWNER ACTION REQUIRED]** Do not paste secrets into template bodies

---

## Auth Settings to Verify (No Change Expected)

| Setting | Expected for this site |
|---------|------------------------|
| Email confirmation on signup | Project-dependent — parent signup handles unconfirmed state in UI |
| Teacher/school registration | Uses `auth.admin.createUser` with `email_confirm: true` — no signup email |
| Magic link sign-in | Not used in app code |
| Email change flow | Not used in app code |

---

## Post-Configuration Smoke Test

After Brevo (temporary) or Resend (long-term) SMTP and URL allowlist are configured:

- [ ] **[OWNER ACTION REQUIRED]** Go to `/auth/forgot-password?portal=parent` on production
- [ ] **[OWNER ACTION REQUIRED]** Enter a test email address you control
- [ ] **[OWNER ACTION REQUIRED]** Confirm email arrives from your Brevo or Resend configured sender (not Supabase default)
- [ ] **[OWNER ACTION REQUIRED]** Click the link — confirm redirect to `/auth/reset-password?portal=parent`
- [ ] **[OWNER ACTION REQUIRED]** Complete password reset
- [ ] **[OWNER ACTION REQUIRED]** Repeat for `portal=teacher` if applicable
- [ ] **[OWNER ACTION REQUIRED]** Record results in [`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md)

See [`BREVO_TEMPORARY_SMTP_SETUP.md`](./BREVO_TEMPORARY_SMTP_SETUP.md) for full Brevo smoke test list (L-BREVO-01 through L-BREVO-08).

---

## What This Configuration Does NOT Change

- Supabase Auth remains the Auth trigger and session manager
- No app env variables are added or modified
- No RLS policies or database schema changes
- No application code deployment required for SMTP switch

---

## Related Documents

- [`BREVO_TEMPORARY_SMTP_SETUP.md`](./BREVO_TEMPORARY_SMTP_SETUP.md) — temporary launch path (current)
- [`RESEND_SETUP_CHECKLIST.md`](./RESEND_SETUP_CHECKLIST.md) — long-term Resend setup after custom domain
- [`EMAIL_DELIVERY_AUDIT.md`](./EMAIL_DELIVERY_AUDIT.md) — flow inventory
- [`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md) — test matrix
- [`EMAIL_DELIVERY_SECURITY_REVIEW.md`](./EMAIL_DELIVERY_SECURITY_REVIEW.md) — security posture

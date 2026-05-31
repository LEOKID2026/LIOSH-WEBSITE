# Resend Setup Checklist

**Project:** Hebrew learning site — External Email Delivery  
**Provider:** Resend (free tier) via Supabase Custom SMTP  
**Audience:** Owner only — all steps below require owner action in external dashboards

---

## Before You Start

- You need access to the **domain registrar** or DNS host for the sending domain.
- You need access to the **Supabase project Dashboard** for the learning site.
- Do **not** paste Resend API keys, SMTP passwords, or any secrets into this repository, docs, chat logs, or `.env` files.
- After Resend setup, continue with [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md).

---

## Phase 0 — Pre-Domain Preparation (Current Phase)

**Owner status (2026-05-31):** No custom domain yet. Site runs on Vercel free domain (`liosh-website.vercel.app`). DNS verification and Supabase SMTP activation are **deferred** until a custom domain is purchased and connected.

### What you can do now (safe, no domain required)

- [ ] **[OWNER ACTION REQUIRED]** Create a Resend account at [https://resend.com](https://resend.com)
- [ ] **[OWNER ACTION REQUIRED]** Create a Resend project (e.g. "Liosh Learning")
- [ ] **[OWNER ACTION REQUIRED]** Confirm free tier is active
- [ ] **[OWNER ACTION REQUIRED]** Do **not** add a sending domain yet — wait until custom domain is ready
- [ ] **[OWNER ACTION REQUIRED]** Do **not** generate or enter SMTP credentials into Supabase yet

### What to defer until custom domain exists

| Step | Why deferred |
|------|--------------|
| Add sending domain in Resend | Requires DNS control on a domain you own |
| DNS TXT / DKIM / SPF records | Requires domain registrar or DNS host access |
| Resend domain verification | Depends on DNS records |
| Supabase Custom SMTP activation | Requires verified sending domain + From address |
| Live email delivery tests | Depends on SMTP + verified domain |

### Recommended sending domain (when ready)

Use a **dedicated transactional subdomain** on your future custom domain — **not** the Vercel hostname:

| Option | Example From address | Notes |
|--------|---------------------|-------|
| **Recommended** | `noreply@mail.yourdomain.com` | Add `mail.yourdomain.com` in Resend; keeps email DNS separate from website |
| Alternative | `noreply@auth.yourdomain.com` | Same pattern with `auth` subdomain |

**Do not use** `*.vercel.app` as the email sending domain. Vercel hostnames are for the website; they are not suitable for SPF/DKIM email authentication.

**Website vs email domain:** The site may stay on Vercel (or move to `yourdomain.com`) for browsing. Auth email **From** address uses the verified subdomain (`mail.yourdomain.com`). Recovery links in emails still redirect to the site URL (e.g. `https://liosh-website.vercel.app/auth/reset-password` or your future custom site URL).

### When custom domain is ready — resume at Phase 2

1. Purchase/connect custom domain to Vercel (optional for site; required for email DNS)
2. In Resend → **Domains** → **Add Domain** → enter `mail.yourdomain.com` (or `auth.yourdomain.com`)
3. Add DNS records at your domain registrar (Phase 3 below)
4. Verify domain in Resend (Phase 3)
5. Generate API key (Phase 4) — store in password manager only
6. Configure Supabase Custom SMTP ([`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md))
7. Run live tests ([`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md))

---

## Checklist

### Phase 1 — Resend Account

- [ ] **[OWNER ACTION REQUIRED]** Create a Resend account at [https://resend.com](https://resend.com)
- [ ] **[OWNER ACTION REQUIRED]** Create a Resend project for the Hebrew learning site (e.g. "Liosh Learning")
- [ ] **[OWNER ACTION REQUIRED]** Confirm you are on the free tier (sufficient for Auth email volume at launch)

### Phase 2 — Sending Domain

- [ ] **[OWNER ACTION REQUIRED]** In Resend Dashboard → **Domains**, click **Add Domain**
- [ ] **[OWNER ACTION REQUIRED]** Enter the production sending domain (e.g. `yourdomain.com` or a subdomain such as `mail.yourdomain.com`)
- [ ] **[OWNER ACTION REQUIRED]** Note the DNS records Resend provides. Typical record types:
  - **TXT** — domain verification (placeholder example: `resend-verification=xxxxxxxxxxxx`)
  - **DKIM** — one or more CNAME/TXT records (placeholder examples only — use values from your Resend dashboard)
  - **SPF** — TXT record (placeholder example: `v=spf1 include:amazonses.com ~all` — use Resend-provided value)
  - **Return-Path / MX** — if Resend requests them for the sending subdomain

> **Important:** Record values are unique per account. Copy them from the Resend Dashboard only. Do not commit real DNS values to git.

### Phase 3 — DNS Configuration

- [ ] **[OWNER ACTION REQUIRED — Domain Registrar / DNS Host]** Add all DNS records provided by Resend
- [ ] **[OWNER ACTION REQUIRED]** Wait for DNS propagation (may take minutes to 48 hours)
- [ ] **[OWNER ACTION REQUIRED]** In Resend Dashboard, click **Verify** on the domain
- [ ] **[OWNER ACTION REQUIRED]** Confirm domain status shows **Verified**

### Phase 4 — SMTP Credentials

Resend uses the API key as the SMTP password.

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `465` (SSL) or `587` (STARTTLS) |
| SMTP Username | `resend` |
| SMTP Password | Your Resend API key — **[OWNER ACTION REQUIRED]** generate in Resend Dashboard → **API Keys** |

Steps:

- [ ] **[OWNER ACTION REQUIRED]** In Resend Dashboard → **API Keys**, create a new API key with **Sending access**
- [ ] **[OWNER ACTION REQUIRED]** Copy the API key once (Resend shows it only at creation time)
- [ ] **[OWNER ACTION REQUIRED]** Store the key in a secure password manager — **not** in this repo
- [ ] **[OWNER ACTION REQUIRED]** Decide the **From** address (must use the verified domain), e.g.:
  - `noreply@your-verified-domain.com`
  - `auth@your-verified-domain.com`

### Phase 5 — Pre-Supabase Verification

- [ ] **[OWNER ACTION REQUIRED]** Confirm the chosen **From** address uses the verified Resend domain
- [ ] **[OWNER ACTION REQUIRED]** Confirm the API key has not been pasted into any repo file, `.env.example`, or documentation
- [ ] **[OWNER ACTION REQUIRED]** Proceed to [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md) to enter SMTP settings in Supabase Dashboard

---

## What NOT to Do

| Do not | Reason |
|--------|--------|
| Commit API keys to git | Security — keys must stay in Dashboard/password manager only |
| Add `RESEND_*` or `SMTP_*` to `.env.example` | App does not send email directly; Supabase handles SMTP |
| Use Resend's HTTP API from app code | Out of scope — Supabase Auth triggers delivery via Custom SMTP |
| Send marketing or newsletter email from this setup | Out of scope — Auth transactional email only |

---

## Troubleshooting (Owner)

| Issue | Check |
|-------|-------|
| Domain not verifying | DNS TTL, correct host/name, no typos in TXT/CNAME values |
| Emails go to spam | DKIM + SPF verified; use a subdomain dedicated to transactional mail |
| SMTP auth fails in Supabase | Username must be `resend`; password is the full API key (not a separate SMTP password) |
| "From" address rejected | From domain must match verified Resend domain exactly |

---

## Related Documents

- [`EMAIL_DELIVERY_AUDIT.md`](./EMAIL_DELIVERY_AUDIT.md) — flow inventory
- [`SUPABASE_CUSTOM_SMTP_CONFIG.md`](./SUPABASE_CUSTOM_SMTP_CONFIG.md) — next step after this checklist
- [`EMAIL_DELIVERY_QA_REPORT.md`](./EMAIL_DELIVERY_QA_REPORT.md) — post-config testing

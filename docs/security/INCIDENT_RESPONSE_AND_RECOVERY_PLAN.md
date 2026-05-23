# Incident Response + Recovery Plan

**Generated:** 2026-05-23  
**Updated:** 2026-05-23 (Wave 3A — operational runbooks moved to [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md))  
**Risk rows:** R-IR-01 (P2), R-MON-01 (P2), R-ENV-01 (P0)

## Goal

Provide named runbooks the owner can follow when an incident is suspected, even before any monitoring infrastructure is in place. Each runbook has a clear **trigger**, **immediate action**, **investigation**, **containment**, **recovery**, **post-mortem** structure.

## Severity tiers

| Tier | Meaning | Response time |
|------|---------|---------------|
| **SEV-1** | Active data leak / account takeover / cross-tenant exposure | within 1h |
| **SEV-2** | Suspected leak / abuse traffic / paid-cost runaway | within 4h |
| **SEV-3** | Known fix backlog (already in register) | next sprint |

## Roles (single-operator project — owner fills both)

- **Incident commander.** Drives the runbook.
- **Communicator.** Updates affected users (parents).
- **Recorder.** Captures timeline + decisions.

For solo operation, all three roles default to the owner; this plan flags moments where that overload is risky.

---

## Runbook IR-1: Credential leak (env / token / service-role key)

**Trigger.** Any of:

- Owner observes a secret in a public location (commit, gist, screenshot, vendor portal).
- Vercel logs show unexpected admin token use.
- A key shows up in a public Pastebin / GitHub search.

**Immediate (≤ 30min).**

1. Rotate the leaked credential at its source:
   - Supabase service-role key → Supabase Dashboard → Settings → API → reset.
   - `LEARNING_STUDENT_ACCESS_SECRET` → generate new value, update Vercel env.
   - `ENGINE_REVIEW_ADMIN_TOKEN` → generate new value, update Vercel env. (Special note: this is the value already flagged as **R-ENV-01 (P0)** — `7479` placeholder in `.env.example`.)
   - LLM provider key → revoke at provider console; issue new key.
2. Redeploy to apply the new env.
3. Audit recent activity for the leaked credential's lifetime — see investigation step.

**Investigation.**

- Vercel function logs for the affected admin route over the leak window.
- Supabase audit log (if available) for service-role queries during the window.
- Determine: was the credential used by an unauthorized party?

**Containment.**

- If used: treat as data leak — escalate to **IR-2**.
- If not used: rotation alone closes the incident.

**Recovery.**

- Confirm the new credential works in production.
- Confirm `.env.example` does not ship the placeholder anymore (per [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md)).
- Open a register row noting the rotation evidence.

**Post-mortem.** 1-page write-up under `reports/security/incidents/<date>-IR-1.md`.

---

## Runbook IR-2: Data leak (cross-tenant / unauthorized read)

**Trigger.** Any of:

- A parent reports seeing another family's data.
- The nightly cross-student bleed metric goes non-zero.
- An ownership matrix test fails in production.

**Immediate (≤ 1h, SEV-1).**

1. Identify the affected route (from logs).
2. Decide: hot-fix via Vercel rollback, OR hot-patch with an `if (!owns(...)) return 403`.
3. If unsure of scope, **disable the route** via a feature flag or 503 response while investigating.

**Investigation.**

- Vercel logs of the route over the suspected window.
- Supabase query log (if available).
- Determine: how many rows could have been read? By whom?

**Containment.**

- Notify affected parents (Communicator). Template message in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).
- Consider session revocation for the affected tenants.

**Recovery.**

- Land the fix; add a regression test in [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md).
- Re-enable the route.

**Post-mortem.** Required. SEV-1 incidents always produce a write-up.

---

## Runbook IR-3: Abuse traffic / cost spike

**Trigger.** Any of:

- LLM provider bill spike alert.
- Hebrew TTS provider rate of calls > expected baseline.
- Unusual login-fail rate from a small set of IPs.

**Immediate (≤ 4h, SEV-2).**

1. If LLM cost: temporarily disable LLM mode by setting `PARENT_COPILOT_FORCE_DETERMINISTIC=true` and redeploy.
2. If TTS abuse: temporarily lower B-HEBREW caps (per [RATE_LIMITING_PLAN.md](./RATE_LIMITING_PLAN.md)) or block at the edge.
3. If login abuse: consider IP block at Vercel WAF / Cloudflare layer.

**Investigation.**

- Quantify cost or call count.
- Identify caller pattern (single IP, IP range, geographic).

**Containment.**

- Apply a tighter rate-limit until the source is understood.

**Recovery.**

- Re-enable normal limits when traffic returns to baseline.

**Post-mortem.** Optional unless the spike caused a SEV-1.

---

## Runbook IR-4: Dependency CVE

**Trigger.** Any of:

- `npm audit` reports High / Critical.
- GitHub advisory affects a top-level dep (Next, React, Supabase JS, etc.).
- Vendor security alert.

**Immediate (≤ 4h for Critical, ≤ 24h for High).**

1. Confirm the advisory affects our usage (not all advisories apply).
2. If it does, plan a patch: `npm install <pkg>@<patched>`.
3. Test locally + via Playwright (`test:e2e`) + Copilot smoke.
4. Deploy.

**Investigation.**

- If a known exploit is observed in our logs, treat as IR-2.

**Containment.**

- Until patched: feature-flag off the affected code path if possible.

**Recovery.**

- After patch, run dep audit again.
- Add a register row noting the resolution.

---

## Runbook IR-5: Production rollback

**Trigger.** A deploy ships a regression that breaks auth, ownership, or rate-limit.

**Immediate.**

1. Vercel → Deployments → previous good deploy → Promote to Production.
2. Verify production smoke (login, parent dashboard, copilot returns 422 in default state).
3. Open an incident write-up.

---

## Communication template (parent notification, IR-2 / SEV-1)

```
Subject: עדכון אבטחה / Security update

שלום,

זיהינו תקלה זמנית במערכת שגרמה לחשיפה לא מתוכננת של פרטים. נקטנו בפעולות מיידיות כדי לסגור את התקלה ולהבטיח שזה לא יחזור.
פירוט מה נחשף, מתי, ומה ההמשך:
- ...

[English version below]
```

(Full Hebrew + English template lives in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md), to be drafted in next fix pass.)

## Monitoring (target — next fix pass)

Even baseline monitoring is currently absent (R-MON-01). Minimum to add before public launch:

- **Vercel function alerts** on 5xx rate.
- **Custom counter** on `auth.login.fail` per username — alert if > 10/min.
- **Custom counter** on `copilot.turn` cost — alert at daily budget threshold.
- **Sentry** (or equivalent) for unhandled errors, with PII filter (per [LOGGING_ARTIFACT_PRIVACY_PLAN.md](./LOGGING_ARTIFACT_PRIVACY_PLAN.md)).

## Acceptance for next fix pass (IR slice)

- IR-1..IR-5 runbooks reviewed and dated.
- Communication templates finalized.
- Minimum monitoring active.
- R-IR-01 + R-MON-01 may move toward `fixed` once those are recorded.

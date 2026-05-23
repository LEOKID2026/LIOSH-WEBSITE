# Incident Response Runbook

**Status:** operational runbooks for owner use  
**Generated:** 2026-05-23 (Wave 3A)  
**Companion:** [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) (planning index)  
**Risk rows:** R-IR-01 (P2), R-MON-01 (P2), R-ENV-01 (P0 when secrets involved)

> **Not legal advice.** When child data may have been exposed, involve legal/privacy counsel per jurisdiction (see escalation notes in each runbook).

## Severity quick reference

| Tier | Meaning | Target response |
|------|---------|-----------------|
| **SEV-1** | Active or confirmed child-data exposure, cross-tenant leak, account takeover | ≤ 1 hour |
| **SEV-2** | Suspected leak, abuse/cost spike, dependency critical with exploit in the wild | ≤ 4 hours |
| **SEV-3** | Known backlog item, no active exploitation | next security wave |

## Roles (solo operator)

- **Incident commander** — runs the runbook  
- **Communicator** — parent/user notice if needed  
- **Recorder** — timeline under `reports/security/incidents/<date>-<id>.md`

---

## RB-1: Suspected secret leak

**Trigger**

- Secret appears in git history, screenshot, chat, public gist, or vendor audit alert  
- Unexpected use of admin/engine-review token  
- Service-role key or LLM API key reported exposed  

**Immediate containment (≤ 30 min)**

1. **Do not** paste the secret into tickets, chat logs, or this repo.  
2. **Do not** commit “fix” files that embed the real value.  
3. Identify **which** credential class: Supabase service-role, student access secret, admin token, LLM key, Vercel token.  
4. **Owner decision:** open **Final ENV phase** rotation for that credential (R-ENV-01) — rotation is **ENV-deferred** until that phase unless emergency owner waiver.  
5. If leak is **active exploitation**: disable affected route or revoke key at provider **before** full root-cause (see RB-2 if child data involved).

**Evidence to collect**

- Time window of exposure  
- Where discovered (commit hash, file path — not secret value)  
- Vercel/Supabase access logs for affected credential (if available)  
- Whether production or preview was affected  

**What not to do**

- Do not rotate in Wave docs-only passes  
- Do not print secret values in incident write-ups  
- Do not deploy untested “hotfix” that changes auth semantics without owner sign-off  

**Owner decision points**

- Emergency rotation now vs wait for Final ENV phase  
- Whether to force redeploy after rotation  
- Whether to treat as SEV-1 data incident (RB-2)  

**Escalation / legal**

- If logs show unauthorized API use against child tables → **RB-2** + legal review  

**Post-incident**

- Write-up: `reports/security/incidents/<date>-RB-1.md`  
- Update [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) evidence  
- Schedule git history scan (Final ENV phase)  

---

## RB-2: Child-data exposure / unauthorized parent–student access

**Trigger**

- Parent reports seeing another child’s report or name  
- Ownership HTTP matrix **FAIL** in staging/production  
- Nightly cross-student bleed metric ≠ 0  
- Supabase audit suggests cross-tenant SELECT  

**Immediate containment (≤ 1 h, SEV-1)**

1. Identify route (`/api/parent/students/.../report-data`, `/api/parent/copilot-turn`, `/api/learning/answer`, etc.).  
2. **Owner decision:** Vercel rollback to last known-good deploy **or** temporary 503 on affected route.  
3. **Do not** run broad simulations or create test users during active incident.  
4. Preserve logs (export redacted Vercel function logs for window).  

**Evidence to collect**

- Route, method, approximate time range  
- Number of tenants potentially affected (estimate from logs)  
- Whether read-only or write occurred  
- Ownership matrix / static audit status from latest wave report  

**What not to do**

- Do not delete Supabase rows to “clean up” before investigation  
- Do not notify parents with speculative details  
- Do not disable all auth without a rollback plan  

**Owner decision points**

- Rollback vs targeted hotfix  
- Session revocation scope (affected students/parents)  
- Parent notification required (yes for confirmed exposure)  

**Escalation / legal**

- **Mandatory** legal/privacy review if minor’s PII or learning records exposed  
- Document under D-PRIV jurisdiction decisions ([SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md))  
- Consider regulatory notification timelines (Israel / EU / US — owner chooses)  

**Post-incident**

- Add regression: ownership matrix `--execute` in CI/staging  
- Update [AUTHORIZATION_AUDIT_PLAN.md](./AUTHORIZATION_AUDIT_PLAN.md) evidence  
- Table-top review of RB-2 within 7 days  

---

## RB-3: Unauthorized parent/student data access (single-account)

**Trigger**

- Compromised parent password or stolen bearer session  
- Student PIN guessed/brute-forced (login rate-limit spikes)  
- Shared device session not logged out  

**Immediate containment**

1. Guide parent to change Supabase password (parent account).  
2. Rotate student access PIN via parent dashboard (`create-student-access-code`).  
3. Student logout: `POST /api/student/logout` (clears cookie + revokes server session row).  
4. If brute-force: confirm [login-rate-limit.js](../../lib/security/login-rate-limit.js) active in production.  

**Evidence**

- Login failure counts per IP/username (when monitoring exists)  
- Session `revoked_at` / `ended_at` on affected student_sessions rows (Supabase dashboard — read-only)  

**What not to do**

- Do not publish generic student usernames in incident notes  

**Owner decision points**

- Force PIN rotation for all children under account  
- Temporary account lock (manual Supabase admin — owner only)  

**Escalation / legal**

- If attacker accessed **other** families’ data → escalate to **RB-2**  

**Post-incident**

- Review R-AUTH-01 mitigation; consider durable rate limits (Final ENV if KV credentials needed)  

---

## RB-4: Dependency CVE / critical npm advisory

**Trigger**

- `npm audit` critical/high on runtime dependency  
- GitHub Dependabot alert on `next`, `react`, `@supabase/supabase-js`, PDF stack, etc.  
- Vendor security bulletin  

**Immediate containment**

1. Confirm advisory applies to **our** usage (not dev-only transitive).  
2. Check [wave-2j-non-env-security-closure-map.md](../../reports/security/wave-2j-non-env-security-closure-map.md) / latest wave dep report.  
3. **Do not** run `npm audit fix --force` without owner approval (may downgrade Next).  
4. If active exploitation in logs → treat as SEV-2; consider rollback (**RB-8**).  

**Evidence**

- Advisory ID, affected version range, installed version (from `package-lock.json`)  
- Whether exploit requires specific route/feature we expose  

**What not to do**

- Do not bump packages during active incident without build + targeted smoke  
- Do not deploy Friday night without rollback owner available  

**Owner decision points**

- Patch wave (like 2D–2G) vs accept residual moderate  
- Feature-flag off affected surface until patched  

**Post-incident**

- Record in risk register (R-DEP-01)  
- Re-run build + security selftests  

---

## RB-5: Abuse traffic / rate-limit spikes

**Trigger**

- Sustained **429** on B-LOGIN, B-HEBREW, B-COPILOT, gallery  
- LLM/TTS cost anomaly  
- Single IP hammering `/api/hebrew-nakdan` or `/api/student/login`  

**Immediate containment**

1. Identify namespace (`login`, `hebrew-nakdan`, `copilot`, `gallery`, `csp-report`).  
2. In-memory limits already active in production ([public-api-rate-limit.js](../../lib/security/public-api-rate-limit.js), [login-rate-limit.js](../../lib/security/login-rate-limit.js)).  
3. **Owner decision:** edge/WAF block at Vercel (Final ENV/deployment config) for persistent IPs.  
4. Copilot cost: set deterministic-only mode via env (**Final ENV phase** — do not change env in docs waves).  

**Evidence**

- 429 rate by route and IP (when logging/monitoring exists)  
- Copilot turn count / cost estimate  

**What not to do**

- Do not disable login for all users without communication plan  

**Post-incident**

- Tune caps in code wave if false positives  
- Durable rate limits → D-RATE-1 (Final ENV if new credentials)  

---

## RB-6: Copilot / AI privacy incident

**Trigger**

- Copilot response mentions another student or foreign parent data  
- Parent reports AI disclosed unexpected PII  
- LLM provider breach notification  
- Client payload trusted in production (`PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION`) — **R-COPILOT-01**  

**Immediate containment**

1. Verify production env flags (**Final ENV verification** — not in Wave 3A).  
2. Disable Copilot UI path if cross-tenant suspected (owner: feature flag / deploy rollback).  
3. Preserve redacted request/response metadata (no utterance text in public tickets).  

**Evidence**

- `X-LIOSH-Parent-Copilot-*` headers (no secrets)  
- studentId in request vs authenticated parent  
- [PARENT_COPILOT_SECURITY_PLAN.md](./PARENT_COPILOT_SECURITY_PLAN.md) invariant checklist  

**What not to do**

- Do not send full child report blobs to third-party support  

**Escalation / legal**

- LLM subprocessors + child data → legal review ([wave-2l-privacy-site-policy-readiness.md](../../reports/security/wave-2l-privacy-site-policy-readiness.md))  

**Post-incident**

- Re-run copilot ownership static tests + live matrix when fixtures exist  

---

## RB-7: Accidental public exposure of reports / QA artifacts

**Trigger**

- `reports/` or `qa-visual-output/` committed or uploaded publicly  
- Screenshot with child name in public channel  
- PDF export left on shared device  

**Immediate containment**

1. Remove public copy (unpublish commit, delete attachment).  
2. **Do not** commit artifacts to git — confirm `.gitignore` covers `reports/`.  
3. Run [reports-retention.mjs](../../scripts/security/reports-retention.mjs) dry-run locally if needed.  

**Evidence**

- What artifact type (PDF, PNG, JSON)  
- Whether real child names vs simulator fixtures  
- Exposure duration and audience  

**What not to do**

- Do not re-share artifacts to “prove” the incident  

**Escalation / legal**

- Real minor PII in public artifact → **RB-2** severity + legal  

**Post-incident**

- Retention policy sign-off (R-LOG-01)  
- Train: QA outputs stay local/gitignored  

---

## RB-8: Rollback after bad security deploy

**Trigger**

- CSP enforce breaks critical flows  
- Origin guard blocks legitimate traffic  
- Auth/session regression post-deploy  
- Ownership check too aggressive (mass 403/404)  

**Immediate containment**

1. **Owner decision:** Vercel → Promote previous deployment (no ENV change in agent pass).  
2. Verify smoke: student login, parent dashboard, learning session start, PDF export QA script.  
3. If CSP-related: compare `next.config.js` headers vs [wave-2k-csp-enforcement-execution.md](../../reports/security/wave-2k-csp-enforcement-execution.md).  

**Evidence**

- Deploy ID, time, diff summary (no secrets)  
- CSP console violations or 403 `cross_origin` spike  

**What not to do**

- Do not rollback by disabling RLS or removing ownership checks without replacement  

**Post-incident**

- Fix forward in new wave with targeted smoke  
- Update R-HEAD-01 soak notes  

---

## Incident write-up template

Save as `reports/security/incidents/YYYY-MM-DD-<RB-id>.md`:

```markdown
# Incident — <RB-id> — <short title>

- **Detected:** <UTC time>
- **Severity:** SEV-1 | SEV-2 | SEV-3
- **Status:** open | contained | closed
- **Child data involved:** yes | no | unknown

## Timeline
- ...

## Containment actions
- ...

## Evidence (no secrets)
- ...

## Owner decisions
- ...

## Follow-up
- [ ] ...
```

---

## Table-top rehearsal

**Completed 2026-05-23 (Wave 3D)** — documentation walk-through for RB-1..RB-8 plus PDF export regression scenario. Evidence: [wave-3d-ir-tabletop-and-pending-evidence-pack.md](../../reports/security/wave-3d-ir-tabletop-and-pending-evidence-pack.md). Recorded in [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md) G-PILOT-6.

Before public launch, consider a **live** post-incident drill cadence (optional). Wave 3D closes the required table-top read-through for closed pilot.

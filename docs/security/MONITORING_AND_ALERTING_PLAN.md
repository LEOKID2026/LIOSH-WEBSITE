# Monitoring and Alerting Plan

**Generated:** 2026-05-23 (Wave 3A)  
**Risk row:** R-MON-01 (P2)  
**Status:** plan documented — **no monitoring provider provisioned in Wave 3A**

> Provider setup (Sentry DSN, Datadog API key, Vercel KV for counters) is **Final ENV / deployment phase only** (D-MON-1). Do not add ENV variables in non-ENV waves.

---

## Goals

1. Detect auth abuse, availability regressions, and cost anomalies early.  
2. Support incident runbooks ([INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md)).  
3. Avoid PII in alerts — aggregate counts and route names only.

---

## Monitoring layers

| Layer | Now (Wave 3A) | Public launch target | ENV required? |
|-------|---------------|----------------------|---------------|
| Vercel function logs | Manual review | Alerts on 5xx rate | No (Vercel UI) |
| In-memory rate limits | Active in code | Log 429 counts | No |
| CSP report endpoint | `POST /api/security/csp-report` → 204 | Aggregate violation counts | No |
| Site uptime | Synthetic `GET /` (home page) | HTTP 2xx/3xx | No |
| External APM (Sentry/Datadog) | **Not configured** | Error tracking + PII scrub | **Yes — DSN** |
| Durable rate-limit counters | In-memory only | KV/Upstash | **Yes — D-RATE-1** |

---

## Recommended signals

### Auth / login

| Signal | Source | Alert threshold (starting point) | Runbook |
|--------|--------|----------------------------------|---------|
| Login failures per IP | Vercel logs / future counter | > 30 failures / 10 min / IP | RB-3, RB-5 |
| Login rate-limit 429 | `B-LOGIN` namespace | Sustained spike vs baseline | RB-5 |
| Generic 401 on `/api/student/login` | Log pattern | N/A (expected under abuse) | RB-3 |

**Implementation note:** [login-rate-limit.js](../../lib/security/login-rate-limit.js) already enforces limits; **alerting** needs log aggregation or custom counter (Final ENV if exported to vendor).

### Public API rate limits

| Route family | Namespace | Alert |
|--------------|-----------|-------|
| Hebrew nakdan/audio | `hebrew-nakdan`, etc. | 429 rate > baseline × 3 | RB-5 |
| Gallery | `gallery` | Same | RB-5 |
| Copilot | `copilot` | Same + cost | RB-5, RB-6 |
| CSP report sink | `csp-report` | > 120/10min/IP (already capped) | RB-8 |

### Availability

| Signal | Source | Alert |
|--------|--------|-------|
| 5xx rate all routes | Vercel | > 1% over 5 min | RB-8 |
| 5xx on `/api/learning/*` | Vercel | Any sustained | RB-8 |
| Site unreachable | Synthetic `GET /` | 2 consecutive failures (non-2xx/3xx) | RB-8 |
| Build/deploy failure | CI | Any on main | RB-4 |

### Copilot / AI

| Signal | Alert | Runbook |
|--------|-------|---------|
| Copilot turn rate | Anomaly vs 7-day baseline | RB-5, RB-6 |
| Daily LLM cost | Owner budget (D-COPILOT-2) | RB-5 |
| Copilot 404/403 spike | Ownership denials ↑ | RB-2 |

**Cost monitoring** requires provider dashboard or env-configured billing alerts — **Final ENV**.

### CSP

| Signal | Source | Alert |
|--------|--------|-------|
| CSP violations | Browser reports → `/api/security/csp-report` (dev log only today) | Production: aggregate count; spike after deploy | RB-8 |
| Enforcing CSP regressions | Playwright smoke (`wave2k-csp-smoke.mjs`) | CI failure on header change | RB-8 |

**Production CSP report persistence** is intentionally none (204 discard). For counts, add log aggregation or metrics export in a future wave **without storing report bodies**.

### Dependency advisories

| Cadence | Action |
|---------|--------|
| Weekly | Dependabot + owner review |
| On Critical | Same day triage ([RB-4](./INCIDENT_RESPONSE_RUNBOOK.md)) |
| Post-upgrade | `npm audit` + build + wave selftests |

Record state in [DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md](./DEPENDENCY_SUPPLY_CHAIN_AUDIT_PLAN.md).

### Ownership boundary

| Signal | When |
|--------|------|
| `ownership-boundary-http-matrix.mjs --execute` FAIL | Staging CI when D-OWNERSHIP-1 fixtures present |
| Static audit FAIL | Any `--dry-run` in security selftest gate |

Live matrix remains **PENDING** until fixtures exported ([wave-2m-ownership-rls-live-verification.md](../../reports/security/wave-2m-ownership-rls-live-verification.md)).

### Report / PDF export

| Signal | Source | Alert |
|--------|--------|-------|
| `qa:parent-pdf-export` CI failure | Script exit ≠ 0 | Release blocker |
| Client-side PDF errors | Optional Sentry (Future ENV) | Spike after CSP/deploy |

---

## Alert routing (owner-defined)

| Severity | Channel (examples) |
|----------|-------------------|
| SEV-1 | Phone + email — owner |
| SEV-2 | Email / Slack — owner |
| SEV-3 | Weekly security review backlog |

No channels configured in Wave 3A.

---

## PII-safe logging rules

Align with [LOGGING_ARTIFACT_PRIVACY_PLAN.md](./LOGGING_ARTIFACT_PRIVACY_PLAN.md) and [safe-log.js](../../lib/security/safe-log.js):

- Never alert with bearer tokens, cookies, PINs, or full utterances  
- Use route + status + hashed IP bucket if needed  

---

## Acceptance criteria (R-MON-01 closure)

| Milestone | Closes |
|-----------|--------|
| This plan documented | Partial (Wave 3A) |
| Vercel 5xx alert configured | Partial |
| Login-fail counter + threshold | Partial / Final ENV if vendor |
| Copilot cost budget alert | Owner decision D-COPILOT-2 + ENV |
| Sentry (optional) with PII scrub | Final ENV D-MON-1 |

**R-MON-01** remains **partially-fixed** after Wave 3A — not `fixed` until at least baseline Vercel alerts + one custom counter are active.

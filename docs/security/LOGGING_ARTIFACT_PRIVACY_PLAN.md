# Logging + Artifact Privacy Plan

**Generated:** 2026-05-23
**Risk rows:** R-LOG-01 (P1), R-LOG-02 (P2), R-MON-01 (P2)

## Goal

Define what may and may not appear in:

1. Server logs (Vercel function logs).
2. Local QA artifacts under `reports/`.
3. Telemetry payloads sent to any monitoring service.

## Server logs

### Allowed

- Route, method, status, latency, request id.
- Caller class (`student_session` / `parent_bearer` / `dev_local_unverified`) without raw token.
- Outcome of auth check (success / fail), without the secret material.
- Rate-limit decisions (bucket, key class, allowed/denied).
- Application-level error class.

### Disallowed (PII / sensitive)

- Raw `Authorization` header / cookies.
- Raw request body for POSTs that contain credentials, PIN, PINs in any form.
- Student `display_name`, `username`, `studentId` in error stacks unless the error specifically requires it for triage — and even then, prefer a truncated id (e.g. last 4 chars).
- Parent email or any free-form parent text.
- Hebrew text submitted to `/api/hebrew-*` (treat as user content).
- Any LLM prompt content from `/api/parent/copilot-turn`.

### Implementation pattern (target — next fix pass)

```js
function safeLog(req, res, extra = {}) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  console.log(JSON.stringify({
    reqId,
    method: req.method,
    path: req.url?.split('?')[0],
    status: res.statusCode,
    authClass: extra.authClass || 'unknown',
    bucket: extra.bucket,
    decision: extra.decision,
  }));
}
```

> Code shown for planning only. The point is that **no body, no token, no PII** ever reaches a log line.

### Existing log paths to audit

The next fix pass should grep `console.log`, `console.error`, `console.warn` in `pages/api/**` and `lib/**` and verify each one against the rules above. Track the result in `reports/security/log-redaction-<date>.md`.

## Local QA artifacts

`reports/` is gitignored (per closure-control evidence; verify in next pass).

| Sub-tree | Sensitivity | Retention (target) |
|----------|-------------|--------------------|
| `reports/launch-readiness/<date>/` | S2 (contains aggregated child data + screenshots) | 90 days local; cleanup script |
| `reports/virtual-student-daily/<date>/` | S2 | 30 days local; cleanup script |
| `reports/virtual-student-daily/<date>/screenshots/` | S2 (Hebrew UI with child names) | 14 days local |
| `reports/virtual-student-daily/<date>/parent-report-snapshots/` | S2 | 30 days local |
| `reports/security/<slice>/<date>/` | S4 | 90 days local |

### Sharing artifacts externally

Default: do not share. If sharing is needed (owner approval):

1. Redact student `username` and `display_name` to `STU<grade>-<index>`.
2. Strip any path that includes a real Supabase project URL.
3. Strip any header dump that includes tokens.

A small `scripts/security/redact-artifact.mjs` is **planned** (not implemented in this pass).

## Telemetry / monitoring

- No third-party monitoring is currently configured (verify in next pass).
- If added (Sentry / Datadog / Logtail), the integration must:
  - Strip headers with `Authorization`, `Cookie`, `X-LIOSH-Parent-Copilot-*` before send.
  - Strip request body by default; sample-only on opt-in.
  - Mask common PII patterns (email, phone, child names).

## Audit checklist

| # | Item |
|---|------|
| L-1 | every `console.*` call audited; raw bodies / tokens removed |
| L-2 | `reports/` confirmed in `.gitignore` |
| L-3 | retention script exists and runs (cron / `package.json` script) |
| L-4 | external monitoring (if added) configured with PII filter |
| L-5 | per-route log policy documented for `/api/student/login` and `/api/parent/copilot-turn` (highest sensitivity) |

## Acceptance for next fix pass (logging slice)

- L-1..L-5 satisfied.
- Register rows R-LOG-01, R-LOG-02 may move toward `fixed`.
- Owner decision (out of scope for security planning, but flagged): is any external monitoring service to be added pre-public-launch? — see [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md).

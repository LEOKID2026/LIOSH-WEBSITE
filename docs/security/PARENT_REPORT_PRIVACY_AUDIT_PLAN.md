# Parent Report Privacy Audit Plan

**Generated:** 2026-05-23
**Risk rows:** R-OWN-01 (P1), R-XSS-01 (P2), R-LOG-01 (P1), R-LOG-02 (P2)
**Closed-area note:** the Parent Report engine is `CLOSED-WATCH`. This plan is **privacy-only**, does not reopen content quality / engine logic.

## Goal

Audit privacy properties of:

1. The parent-report API response (`/api/parent/students/[studentId]/report-data`).
2. The rendered report pages (`/learning/parent-report`, `/learning/parent-report-detailed`, `/learning/parent-report-detailed.renderable`).
3. PDF export (client-side via `html2pdf.js` / `jspdf`).
4. Nightly snapshot artifacts under `reports/virtual-student-daily/<date>/parent-report-snapshots/`.

## Privacy properties to verify

### Data exposure

- Response contains data only for the requested `studentId` after parent ownership check (R-OWN-01).
- No cross-student bleed (already monitored by nightly; this is privacy-side complement).
- No internal raw keys leak into UI (already monitored by [reports/launch-readiness/.../parent-report-truth-audit.md](../../reports/launch-readiness/2026-05-23/parent-report-truth-audit.md)).

### Sensitive data minimization

- Student `username`, `display_name`, `grade`, mastery summaries, weakness/strength labels are necessary.
- Internal scoring weights, raw model parameters, debug fields **must not** appear in the response.

### Hebrew narrative safety

- The narrative ("סיכום חכם להורה") must:
  - Never repeat the child's PIN or login credentials.
  - Never include another child's data.
  - Never include URLs to internal admin surfaces.
- Already covered by `test:parent-report-narrative-safety*` scripts; this audit treats the existing tests as canonical and adds a **privacy-focused** secondary check.

### XSS

- Report rendering must use React text rendering only; see [XSS_INPUT_OUTPUT_AUDIT_PLAN.md](./XSS_INPUT_OUTPUT_AUDIT_PLAN.md). No `dangerouslySetInnerHTML` in report components.

## PDF export privacy

`html2pdf.js` + `jspdf` run **in the browser**. The PDF contains:

- Student display name, grade, mastery details.
- Possibly the parent name (if rendered on the page).
- Date.

Risks:

- The PDF stays on the parent's device; no server upload — confirm by reading the export code.
- If the export hits a server endpoint (e.g. for chart rendering), document the route and ensure parent ownership check (already covered by R-OWN-01).
- PDF metadata (`Author`, `Title`) — confirm not auto-populated with non-public data (e.g. service-role identifier).

## Nightly snapshot privacy

`reports/virtual-student-daily/<date>/parent-report-snapshots/AAA*-baseline.{json,md}` etc. contain real personas' learning data.

| Concern | Action |
|---------|--------|
| Snapshots committed to git? | confirm `.gitignore` excludes `reports/` (per closure-control evidence; verify in next pass) |
| Long retention? | see [LOGGING_ARTIFACT_PRIVACY_PLAN.md](./LOGGING_ARTIFACT_PRIVACY_PLAN.md) — set retention (e.g. 30 days local) |
| Shared externally? | only with explicit owner approval; redact before sharing if so |

## Audit checklist

| # | Item | Method |
|---|------|--------|
| PR-1 | response shape contains no internal scoring keys | inspect a sample response (read-only) |
| PR-2 | response shape contains no user-controlled field that could carry HTML | reason from response shape; pair with [XSS_INPUT_OUTPUT_AUDIT_PLAN.md](./XSS_INPUT_OUTPUT_AUDIT_PLAN.md) |
| PR-3 | every render component renders text via `{value}`, never via `dangerouslySetInnerHTML` | grep `pages/learning/parent-report*.js` and corresponding components |
| PR-4 | PDF export does not call any external network beyond what is already documented | grep `pages/learning/parent-report*.js` for `fetch` / `XMLHttpRequest` |
| PR-5 | nightly screenshots redact only when configured, but are otherwise treated as S2 | confirm retention policy applies |
| PR-6 | parent name + child name displayed are intentional (no other PII) | manual review of report page header/footer |
| PR-7 | response cache headers do not allow shared caching | confirm `Cache-Control: private, no-store` (or no caching) on parent-report responses |

## Acceptance for next fix pass (report privacy slice)

- Items PR-1..PR-7 documented and confirmed.
- Cache headers on parent-report endpoints reviewed.
- Snapshots retention policy decided and applied.
- No `dangerouslySetInnerHTML` in report rendering.
- Register rows R-OWN-01 (privacy aspect) and R-XSS-01 (report scope) advance toward `fixed` with the artifacts above.

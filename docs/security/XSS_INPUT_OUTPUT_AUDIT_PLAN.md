# XSS / Input / Output Audit Plan

**Generated:** 2026-05-23
**Risk rows:** R-XSS-01 (P2), R-INPUT-01 (P2), R-COPILOT-02

## Goal

Catalog every place where user-controlled or LLM-generated content reaches the DOM, plus every place where text is accepted from a parent/student. Confirm that React's default escaping is the only path; flag every `dangerouslySetInnerHTML`. **Read-only enumeration.**

## Inventory plan (next pass produces these artifacts)

| Artifact | Source command | Purpose |
|----------|----------------|---------|
| `reports/security/xss-sinks-<date>.md` | `rg -n "dangerouslySetInnerHTML" pages lib components utils` | every sink |
| `reports/security/innerhtml-eval-<date>.md` | `rg -n "innerHTML\|outerHTML\|document.write\|new Function\|eval\(" pages lib components utils` | DOM-write sinks + eval |
| `reports/security/href-target-<date>.md` | `rg -n "javascript:\|data:text/html" pages lib components utils` | dangerous URL schemes |
| `reports/security/text-input-fields-<date>.md` | grep `<input` / `<textarea` in `pages/` | every text input |
| `reports/security/markdown-render-<date>.md` | grep `react-markdown` / `marked` / `remark` | markdown sinks if any |

## Areas of expected attention

### Hebrew rendering

- Hebrew niqqud + HTML markers may be inserted as styled text. Confirm whether any path uses `dangerouslySetInnerHTML` for niqqud styling.
- TTS / nakdan output is server-cached and re-served as text — confirm output sanitization.

### Parent report (short + detailed)

- Parent report templates: **must** rely on React text rendering, not `dangerouslySetInnerHTML`.
- Per [auth-security-readonly-audit.md](../auth-security-readonly-audit.md) and [PARENT_REPORT.md](../PARENT_REPORT.md), the rendering pipeline is a known closure area; XSS scan is defense-in-depth, not a reopen.

### Parent Copilot output

- Copilot reply (LLM mode) must be rendered as plain text. **Never** as HTML. Confirm in `components/parent-copilot/*` (or wherever the chat is rendered).
- Even deterministic Copilot must avoid HTML rendering.

### Public site forms

- `/contact` and any feedback path — every textarea must be displayed back to administrators with proper escaping.

## Input validation policy (target)

| Field | Source | Cap | Charset | Notes |
|-------|--------|-----|---------|-------|
| Student `display_name` | parent | 40 chars | Unicode (Hebrew/Latin) — strip control chars | reject zero-width / RTL override chars |
| Student `username` | parent | 16 chars | `[A-Za-z0-9_-]` | enforce uniqueness |
| Student PIN | parent | 4 digits today (suspected) | digits only | future: 6 digits optional |
| Grade | parent | enum 1..6 | digit | reject anything outside 1–6 |
| Parent name | Supabase auth | as Supabase | as Supabase | n/a |
| Contact form fields | visitor | per-field caps | UTF-8 | strip HTML; per-IP rate-limit (B-CONTACT) |
| Copilot prompt | parent | hard cap (e.g. 1500 chars) | UTF-8 | reject if > cap |
| Hebrew nakdan input | client | per-call cap | UTF-8 | redact in logs |

## Output sanitization policy

- Default: React rendering (`{value}`); do not bypass.
- Allowed exceptions: none in current product. Any future exception requires:
  - DOMPurify (or an equivalent) with a strict allowlist.
  - Code review + entry in this doc + register row.

## Headers as defense-in-depth

CSP (see [SECURITY_HEADERS_CSP_PLAN.md](./SECURITY_HEADERS_CSP_PLAN.md)) is the post-XSS containment. It does not replace input validation; it limits exfil if validation fails.

## Acceptance for next fix pass (XSS slice)

- Every `dangerouslySetInnerHTML` instance is either eliminated or wrapped in a sanitizer + recorded here.
- Every text input has documented caps + charset rules; server enforces caps even if client does.
- Copilot output rendered as plain text in all modes.
- A periodic grep (CI step) fails on a *new* `dangerouslySetInnerHTML` not previously approved.
- R-XSS-01 + R-INPUT-01 may move toward `fixed` once these artifacts exist.

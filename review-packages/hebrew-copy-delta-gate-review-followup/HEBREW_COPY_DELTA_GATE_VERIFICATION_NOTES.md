# Hebrew Copy Delta Gate — Follow-up Verification Notes

**Fix:** `suggested_classification` now uses `domain/governance_status` (not visibility).  
**Added columns:** `suggested_domain`, `suggested_status` in delta review workbook.  
**Package prepared:** 2026-05-29

---

## Fix summary

| Before | After |
|--------|-------|
| `parent_report/student_visible` | `parent_report/pending_owner_review` |
| `site_decision_ai/student_visible` | `site_decision_ai/pending_owner_review` |
| `learning_content/student_visible` | `learning_content/pending_expert_review` |
| `site_general/internal_only` (visibility) | `internal_only/internal_only` or `site_general/looks_ok_pending` |

Governance status rules:
- `pending_owner_review` — normal visible parent/report/AI/site copy
- `pending_expert_review` — learning content (default for `learning_content` domain)
- `looks_ok_pending` — neutral low-risk UI labels on `site_general`
- `internal_only` — comments/internal/log strings

Sample check: **0** delta rows contain `visible` in `suggested_classification`.

---

## Commands run (post-fix)

| # | Command | Result |
|---|---------|--------|
| 1 | `npm run hebrew:delta:smoke` | **PASS** — 13/13 |
| 2 | `npm run hebrew:delta:dry` | **PASS** — delta_count 352, gate_pass true |
| 3 | `node scripts/hebrew-copy-delta-gate.mjs --warn-only` | **PASS** — summary JSON/MD updated |
| 4 | `npm run hebrew:delta:review` | **PASS** — 352 review rows |
| 5 | `node scripts/parent-report-hebrew-copy-guard.mjs` | **PASS** — OK |

---

## Changed implementation files

- `scripts/lib/hebrew-copy-scan-lib.mjs` — `suggestGovernanceStatus()`, delta row fields
- `scripts/hebrew-copy-delta-review-pack-build.mjs` — new columns in workbook
- `scripts/tests/hebrew-copy-delta-gate-smoke.mjs` — classification tests
- `docs/hebrew-copy/HEBREW_COPY_DELTA_GATE_USAGE.md` — column documentation

---

## `git status --short` (implementation-relevant)

```
 M package.json
?? data/hebrew-copy-baseline/
?? docs/hebrew-copy/
?? scripts/hebrew-copy-baseline-build.mjs
?? scripts/hebrew-copy-delta-gate.mjs
?? scripts/hebrew-copy-delta-review-pack-build.mjs
?? scripts/lib/hebrew-copy-scan-lib.mjs
?? scripts/tests/hebrew-copy-delta-gate-smoke.mjs
```

**Exclude from commit:** unrelated owner-review xlsx, `.tmp/next-start.log`

---

## `git diff --stat` (this fix only)

```
 docs/hebrew-copy/HEBREW_COPY_DELTA_GATE_USAGE.md   |  2 +
 scripts/hebrew-copy-delta-review-pack-build.mjs    |  2 +
 scripts/lib/hebrew-copy-scan-lib.mjs                | 68 ++++++++++++++++++++--
 scripts/tests/hebrew-copy-delta-gate-smoke.mjs      | 58 +++++++++++++++++++
```

(Full implementation also includes untracked baseline/scripts from v1; see prior package.)

---

## Confirmations

| Check | Status |
|-------|--------|
| No product Hebrew copy changed | **Confirmed** |
| No product logic/reports/DB/API/routes/auth/scoring changed | **Confirmed** |
| No CI / pre-commit hooks added | **Confirmed** |
| No commit / push / deploy | **Confirmed** |
| Manual / dry-run / warn-only only | **Confirmed** |

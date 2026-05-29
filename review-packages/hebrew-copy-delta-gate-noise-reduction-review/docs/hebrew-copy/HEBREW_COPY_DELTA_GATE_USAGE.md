# Hebrew Copy Delta Gate — Usage

Planning reference: [`HEBREW_COPY_GOVERNANCE_AND_DELTA_GATE_PLAN.md`](./HEBREW_COPY_GOVERNANCE_AND_DELTA_GATE_PLAN.md)

## What the baseline is

The baseline (`data/hebrew-copy-baseline/v1.0.1/`) is a **known-current-state snapshot** of Hebrew copy already inventoried across five domains:

- Parent reports
- Teacher/school reports
- Site decision / AI copy
- Site general UI
- Learning content

It stores normalized text hashes, source file/line metadata, domain, and governance **status**.

## What the baseline is not

- **Not an approval ledger** — presence in baseline does not mean copy is approved.
- **Not permission to reuse** — copying baseline strings elsewhere still requires delta review.
- **Not a substitute for owner/expert review** — most v1 rows default to `pending_owner_review` or `pending_expert_review`.

Only rows explicitly marked `approved` in owner review (or inventory `status=approved`) are treated as approved.

---

## Prerequisites

Build the five inventory workbooks first (if missing):

```bash
node scripts/parent-report-hebrew-copy-inventory-build.mjs
node scripts/teacher-school-report-hebrew-copy-inventory-build.mjs
node scripts/site-decision-hebrew-copy-inventory-build.mjs
node scripts/site-general-hebrew-copy-inventory-build.mjs
node scripts/learning-content-hebrew-inventory-build.mjs
```

---

## Build baseline

```bash
npm run hebrew:baseline
# or
node scripts/hebrew-copy-baseline-build.mjs --from-reports --version v1.0.1
```

Dry-run (no files written):

```bash
node scripts/hebrew-copy-baseline-build.mjs --dry-run
```

Outputs:

- `data/hebrew-copy-baseline/v1.0.1/baseline.jsonl`
- `data/hebrew-copy-baseline/v1.0.1/baseline-index.json`
- `data/hebrew-copy-baseline/v1.0.1/file-index.json`
- `data/hebrew-copy-baseline/v1.0.1/domain-summary.json`
- `data/hebrew-copy-baseline/v1.0.1/MANIFEST.json`

---

## Run delta gate

Compare current source scan to baseline (does **not** rebuild full Excel inventories):

```bash
npm run hebrew:delta:dry    # safe dry-run — no report writes, exit 0
npm run hebrew:delta        # writes summary JSON/MD; fails on unreviewed critical
```

Options:

```bash
node scripts/hebrew-copy-delta-gate.mjs --warn-only
node scripts/hebrew-copy-delta-gate.mjs --strict
node scripts/hebrew-copy-delta-gate.mjs --domain learning_content
node scripts/hebrew-copy-delta-gate.mjs --baseline-version v1.0.1
```

The default scan mode is **hybrid**:

- **Baseline file-index files** — scanned with inventory-noise suppressions (moved-only, internal orphans, lexicon/replace-rule noise).
- **New files under domain scan roots** (`pages/`, `components/`, `utils/`, `lib/`, `data/` where configured) — discovered automatically and scanned without inventory-noise suppression, so new Hebrew is reported as `new` without a baseline rebuild.
- **Documented safe excludes** — paths excluded from inventories (help-center parent-report copy, student worksheet path, docs, review-packages) are not scanned.

Override scan mode:

```bash
node scripts/hebrew-copy-delta-gate.mjs --scan-mode hybrid      # default
node scripts/hebrew-copy-delta-gate.mjs --scan-mode baseline-only # baseline index only (debug)
node scripts/hebrew-copy-delta-gate.mjs --scan-mode broad         # full roots (noisy; debug only)
```

Outputs:

- `reports/hebrew-copy-delta-summary.json`
- `reports/hebrew-copy-delta-summary.md`

---

## Generate owner review workbook

After a non-dry delta run:

```bash
npm run hebrew:delta:review
# or
node scripts/hebrew-copy-delta-review-pack-build.mjs
```

Output: `reports/hebrew-copy-delta-review.xlsx`

Review columns include `suggested_domain`, `suggested_status`, and `suggested_classification` (format: `domain/governance_status`, e.g. `parent_report/pending_owner_review` — not visibility).

Sheets:

- **Delta Review** — new/changed/moved items for owner
- **Deprecated Removed** — removed strings (if any)
- **Owner Status Legend**

Owner statuses: `approved` | `change` | `not_sure` | `internal_only` | `block`

---

## Cursor end-of-task Hebrew delta summary

Every task touching Hebrew-bearing files should end with:

```
## Hebrew delta summary
- Hebrew delta count: N
- New: X | Changed: Y | Removed: Z | Moved: W
- Risk: critical A | medium B | low C
- reports/hebrew-copy-delta-review.xlsx: yes / no / not applicable — zero delta
- Unreviewed critical Hebrew introduced: no — or list items pending review
```

If no Hebrew files were modified: `Hebrew delta summary: not applicable — no Hebrew-bearing files modified`.

---

## Example console output (baseline build)

```json
{
  "version": "v1.0.0",
  "total_records": 62000,
  "by_domain": {
    "learning_content": 45000,
    "parent_report": 800,
    "site_decision_ai": 1200
  },
  "by_status": {
    "pending_owner_review": 58000,
    "pending_expert_review": 3500,
    "looks_ok_pending": 200,
    "internal_only": 300
  }
}
```

## Example delta summary

```json
{
  "delta_count": 3,
  "by_change_type": { "new": 2, "changed": 1 },
  "by_risk_level": { "critical": 1, "medium": 1, "low": 1 },
  "gate_pass": false,
  "unreviewed_critical_introduced": true
}
```

---

## Smoke test

```bash
npm run hebrew:delta:smoke
node scripts/tests/hebrew-copy-delta-gate-probe.mjs
node scripts/tests/hebrew-copy-delta-gate-e2e.mjs
```

## Noise analysis

After tuning scanner alignment, compare legacy vs aligned delta counts:

```bash
node scripts/hebrew-copy-delta-noise-analysis.mjs
```

Outputs: `reports/hebrew-copy-delta-noise-analysis.md` and `.json`

---

## Reminder

> **Baseline is not approval.** Default statuses remain pending until owner/expert sign-off.

---

## Known limitations (v1.0.1)

1. **New files outside scan roots** — Hebrew in paths not covered by `DOMAIN_SCAN_ROOTS` is not auto-discovered until inventories/baseline are updated.
2. **`pages/student/worksheet/`** — excluded from delta scan (matches site-general inventory exclude).
3. **Inventory noise rules on baseline-known files** — classifier lexicon / rewrite-rule strings on existing files are suppressed at delta time; changes there need manual review or `--scan-mode broad`.
4. **Learning bank rows without source_line** — removed detection skips empty-line inventory rows.
5. **No CI/hooks** — Manual/dry-run/warn-only workflow only; no blocking enforcement in repo hooks.

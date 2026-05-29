# Hebrew Copy Governance and Delta-Gate Plan

**Status:** Planning only — not implemented  
**Created:** 2026-05-29  
**Purpose:** Define a sustainable governance system so future Hebrew copy changes are detected, classified, and routed to owner review without remapping the entire site.

---

## Executive summary

Five domain inventories now exist (~60k+ learning strings alone, plus parent/teacher/site layers). Remapping everything on each change is not sustainable. This plan proposes:

1. **One canonical baseline** — normalized hashes + source metadata derived from the five inventories. **Baseline records known-current state only; it is not an approval ledger.**
2. **A delta gate** — scan current source on demand, diff against baseline, classify by domain and risk.
3. **Small review packs** — Excel/CSV deltas only for new/changed/moved strings, not full inventories.
4. **Graduated enforcement** — critical copy blocks; medium warns; low queues; internal must be explicit.

### Approved clarifications (planning direction)

These three points are part of the approved plan and must guide future implementation:

1. **Baseline does not mean approval** — v1 baseline is a known-current-state reference only.
2. **Known-current ≠ approved-for-future** — presence in baseline does not permit reuse, duplication, or unreviewed editing.
3. **Cursor end-of-task delta summary** — every Hebrew-touching task reports a structured delta summary (see §7.2).

Existing building blocks to reuse:

| Domain | Inventory script | ID prefix | Report output |
|--------|------------------|-----------|---------------|
| Parent report | `scripts/parent-report-hebrew-copy-inventory-build.mjs` | `PR-HE-*` | `reports/parent-report-hebrew-copy-inventory.xlsx` |
| Teacher/school report | `scripts/teacher-school-report-hebrew-copy-inventory-build.mjs` | `TS-HE-*` | `reports/teacher-school-report-hebrew-copy-inventory.xlsx` |
| Site decision / AI | `scripts/site-decision-hebrew-copy-inventory-build.mjs` | `SD-HE-*` | `reports/site-decision-hebrew-copy-inventory.xlsx` |
| Site general UI | `scripts/site-general-hebrew-copy-inventory-build.mjs` | `SG-HE-*` | `reports/site-general-hebrew-copy-inventory.xlsx` |
| Learning content | `scripts/learning-content-hebrew-inventory-build.mjs` | `LC-HE-*` | `reports/learning-content-hebrew-inventory.xlsx` |

Partial precedent: `scripts/parent-report-hebrew-copy-guard.mjs` already fails on forbidden parent-facing jargon — but it is domain-specific and does not track additions or a baseline.

---

## 1. Baseline snapshot

### 1.1 Initial baseline source

Use the **current inventory workbooks** (and their context-map CSVs where available) as the **v1 baseline**. Do not rescan with different rules at baseline-build time unless consolidating scanners first.

Baseline build steps (future `scripts/hebrew-copy-baseline-build.mjs`):

1. Run all five inventory builders (or read cached reports if fresh enough).
2. Merge rows from each domain's primary string sheet into one normalized store.
3. Assign stable **baseline keys** and persist metadata.

Recommended primary sheets per domain:

| Domain | Primary sheet(s) to ingest |
|--------|---------------------------|
| parent_report | `Parent Visible Strings`, `Dynamic Templates`, `Rendered Scenario Samples` |
| teacher_school_report | Main visible strings sheet + dynamic templates |
| site_decision_ai | Main visible strings + AI/copilot sheets |
| site_general | Main visible strings sheet |
| learning_content | `Learning Content Strings` |

Context maps (`reports/*-context-map.csv`) enrich `before_in_context` but are **not** required for hash identity.

### 1.2 Normalized record schema

Each baseline entry should store:

```json
{
  "baseline_key": "sha256:…",
  "domain": "learning_content",
  "inventory_id": "LC-HE-00421",
  "normalized_text": "…",
  "raw_text": "…",
  "text_hash": "sha256(normalized_text)",
  "source_file": "utils/math-explanations.js",
  "source_line": 42,
  "source_function": "getHint",
  "content_type": "hint",
  "visibility": "student_visible",
  "is_template": false,
  "template_variables": [],
  "status": "pending_owner_review",
  "risk_at_baseline": "medium",
  "first_seen_at": "2026-05-29T…",
  "baseline_version": "v1.0.0"
}
```

### 1.3 Normalization rules (for hashing)

Apply consistently so minor formatting does not false-positive as "changed":

- Unicode NFC normalization.
- Collapse internal whitespace to single spaces.
- Trim leading/trailing whitespace.
- For templates: normalize `${var}` → `${*}` placeholder token before hash (track `is_template` separately).
- Strip zero-width and bidi control chars except intentional LRI/PDI math wrappers (record `has_bidi_markers`).
- Do **not** strip niqqud or punctuation — content changes must be detected.
- Comments/JSDoc lines → `internal_only` domain override regardless of text.

### 1.4 Baseline storage layout

```
data/hebrew-copy-baseline/
  v1.0.0/
    baseline.jsonl          # one record per string (canonical)
    baseline-index.json     # text_hash → [baseline_keys]
    file-index.json         # source_file → [baseline_keys]
    domain-summary.json     # counts by domain/status
    MANIFEST.json           # version, built_at, inventory_sources, row_counts
```

- `baseline.jsonl` is the source of truth.
- Excel inventories remain human-readable archives; baseline is machine diff input.
- Baseline files are **committed** (unlike `reports/`, which is gitignored) so CI and developers share one reference.

### 1.5 Domain / category assignment

Every record gets exactly one **domain** (primary) and optional **tags**:

| Domain value | Meaning | Typical sources |
|--------------|---------|-----------------|
| `parent_report` | Parent-facing report copy | `pages/learning/parent-report*`, `utils/parent-report-*`, `utils/detailed-report-parent-letter-he.js` |
| `teacher_school_report` | Teacher/school report & export copy | `lib/teacher-server/*report*`, teacher/school report modals |
| `site_decision_ai` | Copilot, diagnostics, recommendations, progression | `utils/parent-copilot`, `utils/parent-report-ai`, `utils/topic-next-step-*`, `utils/fast-diagnostic-engine` |
| `site_general` | Neutral site UI not covered above | help center, auth labels, navigation, settings |
| `learning_content` | Questions, hints, explanations, curriculum labels | generators, banks, `*-master.js` feedback, `data/*-questions*` |
| `looks_ok` | Pre-approved low-risk neutral label (owner-bucket) | buttons like "סגור", "חזור" after explicit approval |
| `internal_only` | Never user-visible | comments, logs, guard infra, engine trace, test fixtures |

**Overlap resolution:** When a string appears in multiple scan roots, assign the **highest-risk domain** (parent_report > site_decision_ai > teacher_school_report > learning_content > site_general).

### 1.6 Initial status import

Map inventory `status` / `visibility` columns into baseline status (see §2).

**Baseline does not mean approval.** The v1 baseline is only a **known-current-state reference** — a snapshot of what Hebrew exists today and where it lives. It must **not** be interpreted as sign-off that copy is correct, final, or safe to reuse.

Status rules at baseline build:

| Rule | Requirement |
|------|-------------|
| Default | **`pending_owner_review`** for all user-visible copy not explicitly signed off |
| Expert queue | **`pending_expert_review`** for learning stems, curriculum labels, science/geography terms where expert review is indicated by domain |
| Low-risk neutral UI | **`looks_ok_pending`** only when inventory or owner chunk explicitly bucketed it as presumptively neutral — still not `approved` |
| Explicit approval only | **`approved`** only when owner review workbook or expert sign-off already records `approved` / `owner_status=approved` for that string |
| Internal | **`internal_only`** when visibility rules confirm non-rendered use |
| Never auto-approve | Do **not** bulk-promote baseline rows to `approved` because they appear in production |

If an inventory row has `status: pending_owner_review` (as most do today), baseline preserves that — **not** `approved`.

### 1.7 Known-current vs approved-for-future

Baseline membership and approval status are **orthogonal**:

| Concept | Meaning |
|---------|---------|
| **Known in baseline** | String was inventoried; hash + source location recorded for delta detection |
| **Approved for future** | Owner/expert explicitly signed off; may ship and may be edited only with re-review |

Implications:

- A string **known in baseline** may still be wrong, awkward, or pending review — that is expected for v1.
- **Reuse or duplication** of baseline copy (copy-paste into new surfaces, new templates, new domains) is **not** permitted without delta review, even if the source string is baseline-known.
- **Any change to an `approved` string** — especially critical — triggers delta review and gate failure until owner re-approves.
- **Any change to a `pending_*` string** remains pending after edit; the delta gate **must surface it** as `changed` (not silently absorb). Pending status does not exempt edits from visibility in `reports/hebrew-copy-delta-review.xlsx`.
- **Unchanged pending strings** do not appear in delta output — only new, changed, removed, or moved strings since last baseline comparison.

---

## 2. Copy statuses

Statuses describe **governance state**, not render behavior.

| Status | Meaning | Delta gate behavior |
|--------|---------|---------------------|
| `approved` | Owner/expert **explicitly** signed off; safe to ship | Changes require re-review; gate **blocks** unapproved edits |
| `pending_owner_review` | Visible copy not yet approved (default for v1 baseline) | Edits surface as `changed` in delta; gate **warns** or blocks by risk |
| `pending_expert_review` | Needs curriculum/content expert (learning stems, science terms) | Edits surface as `changed`; flagged for expert queue |
| `looks_ok_pending` | Presumed low-risk neutral UI; bulk-approvable later — **not approved yet** | Gate **warns** only unless text matches decision/diagnostic patterns |
| `internal_only` | Not user-visible | Never blocks product work; must not leak to UI |
| `temporary_qa_only` | Placeholder for QA/dev | Gate **blocks** merge to main unless removed or reclassified |
| `blocked` | Must not ship (forbidden jargon, policy violation) | Gate **always fails** |
| `deprecated` | Removed from UI but kept in baseline for history | Removed strings detected as deprecation, not surprise deletion |

**Status transitions (owner-driven):**

```
pending_owner_review → approved | blocked | internal_only
pending_expert_review → approved | blocked
looks_ok_pending → approved (bulk) | pending_owner_review (if risky pattern detected)
temporary_qa_only → approved | deprecated | blocked
approved → pending_owner_review (on any text change)
deprecated → (removed from active baseline index)
```

---

## 3. Delta detection

### 3.1 Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│ 5 domain scanners   │     │ data/hebrew-copy-baseline│
│ (shared extract lib)│────▶│ v1.0.0/baseline.jsonl    │
└─────────┬───────────┘     └────────────┬─────────────┘
          │                              │
          ▼                              │
┌─────────────────────┐                  │
│ hebrew-copy-delta-  │◀─────────────────┘
│ gate.mjs            │
└─────────┬───────────┘
          │
          ├──▶ reports/hebrew-copy-delta-review.xlsx
          ├──▶ reports/hebrew-copy-delta-summary.json
          └──▶ exit code (0 pass / 1 fail / 2 warn-only)
```

Extract logic should live in **`scripts/lib/hebrew-copy-scan-lib.mjs`** — refactor shared code from the five inventory builders rather than duplicating regex/visibility rules.

### 3.2 Planned scripts

#### `scripts/hebrew-copy-baseline-build.mjs`

- Runs or ingests five inventories.
- Writes `data/hebrew-copy-baseline/vX.Y.Z/`.
- Options: `--from-reports`, `--bump-version`, `--dry-run`.
- Emits manifest with row counts per domain.

#### `scripts/hebrew-copy-delta-gate.mjs`

- Scans current workspace (same roots as inventories, unified exclude list).
- Builds **current snapshot** in memory (no full Excel).
- Diffs against committed baseline:

| Change type | Detection rule |
|-------------|----------------|
| `new` | `text_hash` not in baseline |
| `changed` | Same `source_file` + `source_line` (±N lines tolerance) or same `inventory_id` anchor, different `text_hash` — **includes edits to `pending_*` strings** (status stays pending; delta still reported) |
| `removed` | Baseline entry in scanned files no longer extracted (and not `deprecated`) |
| `moved` | Same `text_hash`, different `source_file` or line offset > tolerance |
| `new_template` | New string with `is_template=true` or new `${}` variables |
| `new_api_message` | Hebrew in `pages/api/**` response bodies / error messages not in baseline |

- Options: `--dry-run`, `--warn-only`, `--domain=learning_content`, `--since-baseline=v1.0.0`, `--fail-on=critical`.

#### `scripts/hebrew-copy-delta-review-pack-build.mjs`

- Reads delta gate JSON output.
- Produces **`reports/hebrew-copy-delta-review.xlsx`** (small, typically tens–hundreds of rows, not 60k).
- Optionally splits by domain into `reports/hebrew-copy-delta-review-{domain}.xlsx`.

### 3.3 Matching strategy

Use a **two-tier match** to reduce false "new" on line shifts:

1. **Primary:** `text_hash` exact match → unchanged (possibly `moved`).
2. **Secondary:** fuzzy anchor — same file + enclosing function + normalized text similarity ≥ 0.92 → `changed` not `new`.
3. **Tertiary:** new `baseline_key` assigned; link to `previous_baseline_key` if secondary match.

### 3.4 API and dynamic output

Extend scanner to capture:

- Hebrew strings in `NextResponse.json({ message: "…" })`, `res.status(…).json`, thrown `Error("…")` in API routes under `pages/api/`.
- Template literals that compose user-visible errors in server modules (`lib/*-server/`).
- Mark `surface: api_response` for classification.

Learning generators: treat **new template patterns** separately from static strings — hash the template skeleton, not every generated instance.

---

## 4. Risk classification

### 4.1 Risk levels

| Level | Definition | Examples |
|-------|------------|----------|
| **critical** | Influences parent/teacher/student decisions, diagnosis, recommendations, progression | Parent report narrative, copilot answers, "מומלץ לקדם", diagnostic labels, activity permission copy |
| **medium** | Teacher/school UI, permissions, validation errors, help/onboarding | "אין הרשאה", form validation, teacher portal labels |
| **low** | Neutral UI chrome | "סגור", "טוען…", "חזור", empty-state neutral text |
| **internal** | Non-visible | Comments, `console.log`, test descriptions, guard denylist definitions |

### 4.2 Classification rules (deterministic)

Apply in order:

1. **Path rules** — e.g. `utils/parent-report-*` → critical; `pages/api/teacher` → medium.
2. **Keyword rules** — progression/diagnosis lexicon (reuse `forbidden-terms.js` patterns inversely for critical detection): `מומלץ`, `קידום`, `רמה`, `אבחון`, `העברה`, `RI\d`, `cannotConclude`.
3. **Content-type rules** — learning `question_stem`, `explanation`, `feedback_wrong` → medium–critical by subject.
4. **Visibility rules** — `internal_only` → internal regardless of text.
5. **Default** — `site_general` → low; `learning_content` → medium.

Output: `risk_level` + `suggested_classification` (domain) + `why_flagged`.

### 4.3 Reclassification on change

| Prior status | Edit behavior |
|--------------|---------------|
| `approved` (any risk) | Delta row `changed`; gate **blocks** until owner re-approves; critical always fails |
| `approved` + critical | Delta row `changed`; gate **fail** until owner updates status |
| `pending_owner_review` / `pending_expert_review` / `looks_ok_pending` | Delta row `changed`; status **remains pending**; must appear in review workbook |
| `internal_only` | Delta row only if misclassified as visible; otherwise info-level |
| `new` string | Delta row `new`; status unset until owner classifies |

Edits to pending strings are **not** exempt from delta reporting — known-current baseline makes them detectable, not approved.

---

## 5. Gate behavior

### 5.1 Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Dry run | `--dry-run` | Report only; exit 0 |
| Warn only | `--warn-only` | Print warnings; exit 0 unless `--strict` |
| Standard | (default) | Fail on critical unclassified new/changed |
| Strict | `--strict` | Fail on medium unclassified too |
| CI | `--ci` | No prompts; JSON summary artifact |

### 5.2 Block vs warn matrix

| Situation | Standard | Strict |
|-----------|----------|--------|
| New critical visible copy, status unset | **FAIL** | **FAIL** |
| Changed approved critical copy | **FAIL** | **FAIL** |
| Changed pending critical/medium copy | WARN (surface in delta) | WARN / **FAIL** by config |
| New medium copy, unset | WARN | **FAIL** |
| New low copy, unset | WARN (queue) | WARN |
| New `temporary_qa_only` on main branch | **FAIL** | **FAIL** |
| New/changed `internal_only` properly marked | PASS | PASS |
| Removed deprecated string | PASS | PASS |
| Moved only (hash unchanged) | PASS (info) | PASS |
| Blocked status in baseline | **FAIL** if still present | **FAIL** |

### 5.3 Explicit classification escape hatch

Developers may add a **sidecar manifest entry** (future: `data/hebrew-copy-baseline/overrides.json`) for pre-approved additions:

```json
{
  "text_hash": "abc…",
  "status": "looks_ok_pending",
  "reason": "Neutral button label; bulk-approved batch 2026-06",
  "expires": null
}
```

Overrides require owner PR approval — not self-service for critical domain.

---

## 6. Owner review output

### 6.1 Delta review workbook

**Path:** `reports/hebrew-copy-delta-review.xlsx`

| Column | Description |
|--------|-------------|
| `id` | New delta ID `DL-HE-NNNNN` (stable for review round) |
| `domain` | §1.5 domain |
| `audience` | parent / teacher / student / school / mixed |
| `surface` | page, api, generator, report_builder, … |
| `source_file` | Relative path |
| `source_line` | Line number |
| `old_text_if_changed` | Baseline text (empty if new) |
| `new_text` | Current text |
| `detected_change_type` | new / changed / removed / moved / new_template / new_api_message |
| `risk_level` | critical / medium / low / internal |
| `suggested_classification` | Proposed domain + status |
| `why_flagged` | Rule that triggered |
| `suggested_replacement` | Empty by default; owner fills |
| `owner_status` | See below |
| `owner_replacement` | Approved Hebrew if `change` |
| `notes` | Free text |

**Owner statuses:** `approved` | `change` | `not_sure` | `internal_only` | `block`

### 6.2 Review workflow

1. Developer runs delta gate after Hebrew-touching task.
2. If delta non-empty → run `hebrew-copy-delta-review-pack-build.mjs`.
3. Owner reviews **only delta workbook** (typically small).
4. Owner fills `owner_status` / `owner_replacement`.
5. Baseline bump script ingests approved rows → new baseline patch version (`v1.0.1`).

No full-site remap required.

### 6.3 Removed strings

Removed rows go to a **`Deprecated`** sheet — owner confirms intentional removal vs accidental deletion.

---

## 7. Developer / Cursor rules

Document these for `.cursor/rules/` or `AGENTS.md` (future):

1. **Do not add user-visible Hebrew** without it appearing in the next delta report — run the gate before marking work complete.
2. **Do not rewrite approved Hebrew** without owner approval — treat `approved` baseline entries as locked.
3. **Do not invent Hebrew** for reports, AI explainer, diagnostics, or recommendations — use existing language layers or leave TODO flagged `temporary_qa_only`.
4. **Temporary QA copy** must use `temporary_qa_only` classification in override manifest or a clearly named constant block; remove before release.
5. **Internal logs/comments** — ensure scanner classifies as `internal_only`; never copy internal trace strings into UI.
6. **Learning content** — new question stems/explanations go through `learning_content` domain; expert review for science/geography/Hebrew curriculum terms.
7. **End-of-task checklist:** run `node scripts/hebrew-copy-delta-gate.mjs` (and review pack if non-zero delta); include the **Hebrew delta summary** (§7.2) in the task/PR response.
8. **Prefer editing English keys / language layer files** over scattering Hebrew in components when architecture supports it.

### 7.2 Cursor end-of-task Hebrew delta summary (required)

Every future Cursor task that touches files likely to contain Hebrew (`pages/`, `components/`, `utils/`, `lib/`, `data/`, API routes, language layers, question banks, generators) must end with a **Hebrew delta summary** in the task response — even when the delta gate scripts are not yet implemented (use `N/A — gate not implemented` until then).

Required fields:

| Field | Description |
|-------|-------------|
| **Hebrew delta count** | Total new + changed + removed + moved strings detected |
| **New Hebrew strings** | Count (and brief note if non-zero) |
| **Changed Hebrew strings** | Count (includes edits to pending baseline strings) |
| **Removed/moved Hebrew strings** | Count each or combined with breakdown |
| **Critical / medium / low counts** | Risk breakdown of delta rows |
| **Delta review workbook** | Whether `reports/hebrew-copy-delta-review.xlsx` was generated (`yes` / `no` / `not applicable — zero delta`) |
| **Critical introduction check** | Explicit confirmation: **no unreviewed critical Hebrew was introduced** — or list items that need owner review |

Example (future, when gate exists):

```
## Hebrew delta summary
- Hebrew delta count: 3
- New: 2 | Changed: 1 | Removed: 0 | Moved: 0
- Risk: critical 1 | medium 1 | low 1
- reports/hebrew-copy-delta-review.xlsx: yes
- Unreviewed critical Hebrew introduced: yes — 1 new copilot recommendation string pending owner review
```

If the task did **not** touch Hebrew-bearing files, state: `Hebrew delta summary: not applicable — no Hebrew-bearing files modified`.

---

## 8. Integration points

### 8.1 Manual (owner / Cursor) — Phase 1

```bash
node scripts/hebrew-copy-delta-gate.mjs --dry-run
node scripts/hebrew-copy-delta-review-pack-build.mjs
```

Primary workflow until baseline is stable.

### 8.2 Pre-commit hook — Phase 2

- Optional hook runs delta gate on staged files only (`--staged`).
- Fast path: hash extracted strings from staged diff, compare to baseline index.
- Critical failures block commit; medium/low warn.

### 8.3 CI — Phase 3 (optional)

- Job: `hebrew-copy-delta-gate --ci --strict` on PRs touching `pages/`, `components/`, `utils/`, `lib/`, `data/`.
- Upload `reports/hebrew-copy-delta-summary.json` as artifact.
- Do **not** fail CI on `pending_owner_review` backlog from baseline v1 — only on **new unclassified deltas** since baseline.

### 8.4 Pre-release QA — Phase 3

- Part of release checklist alongside existing `parent-report-hebrew-copy-guard.mjs` and `qa-hebrew-runtime-gate.mjs`.
- Owner sign-off on delta workbook for the release branch.
- Baseline version tag matches release tag.

### 8.5 Relationship to existing guards

| Tool | Role after governance |
|------|----------------------|
| `parent-report-hebrew-copy-guard.mjs` | Deep parent jargon check — keep; runs in CI for parent domain |
| `qa-hebrew-runtime-gate.mjs` | Runtime learning quality — complementary, not replaced |
| Five inventory builders | Periodic full refresh (quarterly or after major content drop), not per PR |

---

## 9. Non-goals

This plan explicitly **does not**:

- Implement code changes, scripts, hooks, or CI jobs.
- Change any Hebrew text in the product.
- Approve or reject current copy — baseline v1 is **known-current-state only**; statuses default to `pending_owner_review` / `pending_expert_review` / `looks_ok_pending`, never bulk `approved`.
- Replace owner review or curriculum expert review.
- Auto-generate replacement Hebrew.
- Block all Hebrew edits indiscriminately — only unclassified high-risk deltas.
- Merge the five inventories into one monolithic scan on every run.

---

## 10. Acceptance criteria (future implementation)

Implementation is **ready** when all of the following pass:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Baseline builds from current five inventories | `hebrew-copy-baseline-build.mjs` produces `baseline.jsonl` with ≥95% row coverage vs inventory totals |
| 2 | Detect newly added Hebrew string | Insert test string in fixture file → delta shows `detected_change_type=new` |
| 3 | Detect changed Hebrew string | Edit one character in approved entry → `changed` with `old_text_if_changed`; edit to pending entry → `changed`, status remains pending |
| 4 | Detect removed / moved | Delete or move string → correct change type |
| 5 | Classify by domain/risk | Critical parent string → `risk_level=critical`, `domain=parent_report` |
| 6 | Small review workbook | Delta run produces `<500` rows for typical single-feature PR (not 60k) |
| 7 | No full remap required | Delta gate completes in <60s on dev machine (incremental scan) |
| 8 | Safe dry-run mode | `--dry-run` never writes baseline or product files |
| 9 | No false product edits | Scripts only write `data/hebrew-copy-baseline/` and `reports/` |
| 10 | Template detection | New `${}` template flagged as `new_template` |
| 11 | API message detection | Hebrew in test API route flagged |
| 12 | Gate modes work | Critical unclassified fails; internal_only passes |

---

## Appendix A — Proposed implementation phases

| Phase | Scope | Effort |
|-------|-------|--------|
| **P0** | Extract `hebrew-copy-scan-lib.mjs` from inventory builders; unify exclude lists | 2–3 days |
| **P1** | `hebrew-copy-baseline-build.mjs` + commit v1.0.0 baseline | 1–2 days |
| **P2** | `hebrew-copy-delta-gate.mjs` + JSON summary | 2–3 days |
| **P3** | `hebrew-copy-delta-review-pack-build.mjs` + owner workflow doc | 1 day |
| **P4** | Pre-commit hook (optional) | 0.5 day |
| **P5** | CI job + strict mode tuning | 1–2 days |

---

## Appendix B — Baseline v1 seed metrics (2026-05-29 inventories)

Reference counts when baseline is first built:

| Domain | Approx. strings | Notes |
|--------|----------------:|-------|
| learning_content | 60,174 | Includes banks + generators |
| parent_report | (see parent inventory summary) | |
| teacher_school_report | (see TS inventory summary) | |
| site_decision_ai | (see SD inventory summary) | |
| site_general | (see SG inventory summary) | |

Exact totals recorded in `MANIFEST.json` at baseline build time.

---

## Appendix C — ID namespace

| Prefix | Owner |
|--------|-------|
| `PR-HE-*` | Parent report inventory |
| `TS-HE-*` | Teacher/school report |
| `SD-HE-*` | Site decision / AI |
| `SG-HE-*` | Site general |
| `LC-HE-*` | Learning content |
| `DL-HE-*` | Delta review (new) |
| `BL-HE-*` | Baseline key alias (optional) |

Delta IDs are ephemeral per review round; baseline keys are stable via `text_hash` + primary source anchor.

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-29 | Initial plan — post full-site inventory completion |
| 2026-05-29 | Approved clarifications: baseline ≠ approval; known-current vs approved-for-future; Cursor end-of-task delta summary (§1.6–1.7, §7.2) |

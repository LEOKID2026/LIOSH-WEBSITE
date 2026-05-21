# Learning simulator QA

> **Launch certification:** Full orchestrator PASS and **critical-deep** / **profile-stress** closure are recorded in **[FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md)** (2026-05-21).

This document describes the **unified learning-simulator quality gates**: what they validate, how to run them, where artifacts land, and what they **do not** prove.

## What the simulator does (high level)

The learning simulator generates **aggregate storage-shaped snapshots** (similar to product localStorage for learning activity), optionally builds **parent reports** from that storage in Node, and runs **integrity / behavior / report-contract checks**. It is designed to validate pipelines and fixtures **without** driving the full browser student UI for every scenario.

## QA command tiers (daily strategy)

Three tiers share **one** orchestrator (`scripts/learning-simulator/run-orchestrator.mjs`); modes are `quick` and `full`. The **release** npm script is an explicit name for the same **full** run (see table).

| Tier | Command | Use when |
| ---- | -------- | -------- |
| **Quick** | `npm run qa:learning-simulator:quick` | Frequent feedback while editing fixtures, report contracts, or simulator code. **No** browser render gate, **no** PDF download gate, **no** deep longitudinal suite. |
| **Full** | `npm run qa:learning-simulator` (or `…:full`) | Before push, after substantial matrix/content changes, or when you need the **complete** gate (smoke, coverage, content gaps, critical deep, render, PDF, deep, build, release summary). |
| **Release** | `npm run qa:learning-simulator:release` | **Same execution as full** — use the name you prefer before a production release or tag; documents intent without a second code path. |

Orchestrator summaries:

- `reports/learning-simulator/orchestrator/run-summary.json`
- `reports/learning-simulator/orchestrator/run-summary.md`

Stopping behavior: by default the orchestrator **stops on the first failing step**. Set `LS_CONTINUE_ON_FAIL=1` to run all steps anyway (still exits non-zero if any step failed).

## Which command should I run?

| Situation | Recommended command |
| --------- | ------------------- |
| **Normal development** (tweaks to helpers, small fixture edits, iterating on one gate) | `npm run qa:learning-simulator:quick`, then re-run **single** sub-scripts as needed (e.g. `qa:learning-simulator:behavior`). |
| **After changing question banks / curriculum data** | `npm run qa:learning-simulator` (full) — includes Phase 4 integrity, matrix smoke, coverage catalog, and content gap/backlog artifacts. |
| **After changing parent-report / report builders** | Full gate — especially **`qa:learning-simulator:reports`**, **`qa:learning-simulator:behavior`**, **`qa:learning-simulator:render`**, and **`test:parent-report-narrative-safety-artifacts`** (included in full via orchestrator). |
| **After changing simulator logic** (adapters, orchestration, matrix runners) | Full gate; add targeted scripts while iterating, then full before push. |
| **Before push / PR** | `npm run qa:learning-simulator` **and** `npm run build` if your workflow does not rely on the build step inside full (full already runs `npm run build`). |
| **Before production release** | `npm run qa:learning-simulator:release` (same as full): matrix → … → render → PDF export → deep → build → selftests → **`qa:learning-simulator:release-summary`**. Optionally run `npm run build` again locally if you ship outside CI. |

**Note:** `qa:learning-simulator:release` does **not** add extra steps beyond **full** — it is the same `full` orchestrator for naming clarity in docs and CI.

## Orchestrator commands (reference)

| Command | Meaning |
| -------- | ------- |
| `npm run qa:learning-simulator` | **Full** gate — primary entry point. |
| `npm run qa:learning-simulator:quick` | **Quick** gate only (see below). |
| `npm run qa:learning-simulator:full` | Same as **`qa:learning-simulator`**. |
| `npm run qa:learning-simulator:release` | Same as **`qa:learning-simulator`** (full). |

## What **quick** runs

In order:

1. **`qa:learning-simulator:matrix`** — Builds/refreshes `coverage-matrix.json` from curriculum/subject sources.
2. **`qa:learning-simulator:schema`** — Validates profiles + scenario fixtures (quick + deep definitions) against the matrix.
3. **`qa:learning-simulator:aggregate`** — Simulates **quick** scenarios into per-student storage + meta under `aggregate/per-student/`.
4. **`qa:learning-simulator:reports`** — Builds slim parent-report payloads and runs **Phase 3** report assertions (`scenario.expected`).
5. **`qa:learning-simulator:behavior`** — Runs **Phase 5** behavior assertions on storage + slim report facets (`behavior-oracle` / `behavior-assertion-engine`).
6. **`qa:learning-simulator:questions`** — **Phase 4** generator/bank question integrity over matrix cells (samples per cell).

## What **full** adds on top of quick

After the quick chain (same order as `run-orchestrator.mjs`), including **engine framework** and **professionalization** inserts:

- **`qa:question-metadata`** — Static bank metadata gate (blocking policy); writes `reports/question-metadata-qa/summary.json`.
- Then continues with matrix smoke, coverage catalog, and the gates below.

7. **`qa:learning-simulator:matrix-smoke`** — Aggregate smoke for matrix cells; writes `matrix-smoke.json` / `.md`.
8. **`qa:learning-simulator:coverage`** — Full **819-cell** coverage catalog.
9. **`qa:learning-simulator:unsupported`** — Unsupported / gap classification (`unsupported-cells.json`). Fails on **uncovered** or **unknown_needs_review**.
10. **`qa:learning-simulator:content-gaps`** — Content gap audit (informational).
11. **`qa:learning-simulator:content-backlog`** — Content gap backlog (documentation).
12. **`qa:learning-simulator:scenario-coverage`** — Scenario → matrix mapping (first pass).
13. **`qa:learning-simulator:critical-deep`** — Critical subset deep assertions (`critical-matrix-deep.json`).
14. **`qa:learning-simulator:profile-stress`** — Synthetic profile stress scenarios.
15. **`qa:learning-simulator:scenario-coverage`** (again) — Regenerates scenario map including critical-deep + profile-stress.
16. **`qa:learning-simulator:render`** — Browser/SSR render release gate (learning + parent-report surfaces).
17. **`qa:learning-simulator:pdf-export`** — Parent-report PDF download gate (`?qa_pdf=file`).
18. **`qa:learning-simulator:deep`** — Longitudinal deep scenarios; outputs under `reports/learning-simulator/deep/`.
19. **`npm run build`** — Next.js production build.
20. **`npm run test:parent-report-phase1`** — Parent report Phase 1 selftest.
21. **`npm run test:parent-report-narrative-safety-artifacts`** — **Parent narrative safety (artifact JSON)** — deterministic guard on parent-visible Hebrew strings in saved report / simulator JSON (see section below).
22. **`npm run test:intelligence-layer-v1-usage`** — Intelligence layer usage contract selftest.
23. **`qa:learning-simulator:release-summary`** — Master release readiness JSON/MD.

Standalone (e.g. CI snippets): individual `npm run qa:learning-simulator:<stage>` scripts listed in `package.json`.

**Not included by default:** Playwright E2E (`npm run test:e2e`). Add explicitly when you need browser automation.

**Not in quick:** The **parent narrative safety artifact** step runs only in **full** / **release** (same orchestrator). Quick stays fast and does not require the large JSON corpora under `reports/`.

## Parent Narrative Safety artifact gate

Part of the **full** orchestrator (after `test:parent-report-phase1`, before intelligence usage selftest).

- **What it checks:** Reads generated JSON under configured paths (persona corpus, parent-report review-pack, per-student simulator reports), extracts parent-visible Hebrew narrative fields, and runs the deterministic `validateParentNarrativeSafety` guard (no LLM, no live pages).
- **What fails release / full QA:** **`blockCount > 0`** (unsafe parent-facing wording per guard rules), **missing `summary.json` after the step**, or **`no_artifacts_found`** (no JSON matched — nothing was validated; treat as not-ready until artifacts exist).
- **What passes without failing:** **`warnings_only`** — thin-data / ambiguous phrasing warnings are visible in the human report but do **not** fail the orchestrator at this stage.
- **Info / caution rows:** Safe explicit thin-data framing is tagged for visibility; not a product failure.
- **Where to read output:** `reports/parent-report-narrative-safety-artifacts/summary.md` and `summary.json`. The orchestrator run summary (`reports/learning-simulator/orchestrator/run-summary.md`) duplicates key counts when the step runs.

## Question Metadata QA (repo-wide banks)

**Full / release orchestrator** runs **`npm run qa:question-metadata`** as the first step of the engine professionalization block (after engine-completion framework steps, before matrix-sampled **question-skill-metadata**). **Quick** does **not** include this script.

- **Command:** `npm run qa:question-metadata` — **blocking** for structural/taxonomy failures per **`utils/question-metadata-qa/question-metadata-gate-policy.js`**; English skill/subskill gaps remain **exempt/advisory** until curriculum tagging.
- **Optional proposals:** `npm run qa:question-metadata:suggestions` — science-only enrichment JSON/MD (does not edit banks).
- **What it scans:** Static question JS under `data/*`, `utils/hebrew-rich-question-bank.js`, English pools, geography grades, science bank, geometry conceptual templates (see `docs/question-metadata-qa.md`). Procedural generators are listed but not expanded.
- **What it reports:** `gate.gateDecision`, blocking vs advisory counts, subject rollups, skill buckets, duplicate declared IDs — outputs under `reports/question-metadata-qa/`.
- **Release readiness:** `qa:learning-simulator:release-summary` reads `summary.json` and **fails** if `gateDecision` is **`fail_blocking_metadata`**, **`blockingIssueCount > 0`**, **`scanOutcome !== ok`**, or the file is missing after a full run.

Full detail: **`docs/question-metadata-qa.md`**.

## What **deep** runs (when invoked via full or standalone)

`npm run qa:learning-simulator:deep` executes the **deep scenario suite** only (see `tests/fixtures/learning-simulator/scenarios/deep-scenarios.mjs`): larger horizons, more sessions, same report + assertion stack as aggregate but heavier. Artifacts: `reports/learning-simulator/deep/`.

## What this does **not** prove

- **Full student UX:** Aggregate/deep simulation is **storage-level** (session payloads written into snapshot shape). It does not replay every click in Chrome.
- **Every answer path in UI:** Question integrity checks generated/bank questions structurally; it does **not** assert every cell through the math/hebrew/etc. pages interactively.
- **Production Supabase / auth:** Gates are largely offline/fixture-driven unless a script explicitly hits APIs.
- **Complete curriculum coverage:** Unsupported matrix cells remain flagged separately (`unsupportedCells` in question integrity output).
- **Full Cartesian matrix expansion:** Running every grade × subject × topic × level combination as separate student timelines is **not** implemented in the orchestrator yet.

## How to inspect failures

1. Read **`reports/learning-simulator/orchestrator/run-summary.md`** for which step failed and suggested next steps.
2. Open the **stage-specific** summary JSON under `reports/learning-simulator/<stage>/`:
   - **questions:** `questions/failures.json`
   - **behavior:** `behavior/failures.json`
   - **reports:** `reports/run-summary.json` + `per-student/*.assertions.json`
   - **deep:** `deep/failures.json`
3. Re-run a **single** npm script (e.g. `npm run qa:learning-simulator:behavior`) to iterate faster.

## Artifact locations (repo-relative)

| Gate | Main outputs |
| ----- | ------------- |
| Matrix | `reports/learning-simulator/coverage-matrix.json`, `.md` |
| Schema | `reports/learning-simulator/schema-validation.json`, `.md` |
| Aggregate | `reports/learning-simulator/aggregate/run-summary.json`, `per-student/*.storage.json`, `*.meta.json` |
| Reports | `reports/learning-simulator/reports/run-summary.json`, `per-student/*.report.json`, `*.assertions.json` |
| Behavior | `reports/learning-simulator/behavior/run-summary.json`, `failures.json`, `per-student/*.behavior.json` |
| Questions | `reports/learning-simulator/questions/run-summary.json`, `failures.json` |
| Matrix smoke | `reports/learning-simulator/matrix-smoke.json`, `matrix-smoke.md` |
| Coverage catalog | `reports/learning-simulator/coverage-catalog.json`, `coverage-catalog.md` |
| Unsupported cells | `reports/learning-simulator/unsupported-cells.json`, `unsupported-cells.md` |
| Scenario coverage | `reports/learning-simulator/scenario-coverage.json`, `scenario-coverage.md` |
| Critical matrix deep | `reports/learning-simulator/critical-matrix-deep.json`, `critical-matrix-deep.md` |
| Deep | `reports/learning-simulator/deep/run-summary.json`, `failures.json`, `per-student/*` |
| Orchestrator | `reports/learning-simulator/orchestrator/run-summary.json`, `.md` |
| Parent narrative safety (artifacts) | `reports/parent-report-narrative-safety-artifacts/summary.json`, `summary.md` |
| Question metadata QA | `reports/question-metadata-qa/summary.json`, `summary.md`, `skill-coverage.json`, optional `enrichment-suggestions.{json,md}` |

## When to run quick vs full vs release

- **`quick`:** Fast loop — no render/PDF/deep/build in the orchestrator path.
- **`full`** (`qa:learning-simulator` or `qa:learning-simulator:full`): Complete gate including browser smoke, PDF export, deep suite, production build, and **`release-summary`**.
- **`release`:** Same binary as **full** — optional alias for documentation and CI job naming (`qa:learning-simulator:release`).

## Targeted subcommands

Run individual gates without the orchestrator, e.g.:

```bash
npm run qa:learning-simulator:matrix
npm run qa:learning-simulator:schema
npm run qa:learning-simulator:aggregate
npm run qa:learning-simulator:reports
npm run qa:learning-simulator:behavior
npm run qa:learning-simulator:questions
npm run qa:learning-simulator:deep
npm run test:adaptive-planner
```

`npm run test:adaptive-planner` exercises the **Adaptive Learning Planner** foundation (deterministic; see `docs/adaptive-learning-planner.md`).

## Known limits (current)

1. **Simulation fidelity:** Sessions are synthesized into storage-compatible structures; not a full browser playback.
2. **Question integrity:** Validates generator/bank outputs per sampled cells; **unsupported** cells are reported separately and are not forced green.
3. **Matrix expansion:** Orchestrator does not run “every possible longitudinal combination”; deep v1 is a **manageable** scenario set.
4. **E2E:** Not part of the default full gate; add `npm run test:e2e` manually when appropriate.

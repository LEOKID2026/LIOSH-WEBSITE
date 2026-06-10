---
name: Phase 6A Baseline
overview: Create the Phase 6A English G3–G6 baseline artifact at docs/qa/_artifacts/english-g3-g6-expansion/PHASE_6A_BASELINE.md using inventory data gathered from registry, pool files, and expansion plan docs. No code changes.
todos:
  - id: create-artifact-dir-and-file
    content: Create docs/qa/_artifacts/english-g3-g6-expansion/PHASE_6A_BASELINE.md with full inventory baseline
    status: pending
isProject: false
---

# Phase 6A — English G3–G6 Baseline

## What this creates

A single new markdown artifact:

`docs/qa/_artifacts/english-g3-g6-expansion/PHASE_6A_BASELINE.md`

The directory does not yet exist. No other files change.

## Data sources used

- [`data/launch-readiness/topic-launch-registry.json`](data/launch-readiness/topic-launch-registry.json) — authoritative topicTotal, launchLevel, inventoryStatus, assign flags
- [`data/english-questions/grammar-pools.js`](data/english-questions/grammar-pools.js) + [`grammar-pools-phase-b.js`](data/english-questions/grammar-pools-phase-b.js) — 617 + 62 items; difficulty breakdown
- [`data/english-questions/sentence-pools.js`](data/english-questions/sentence-pools.js) + [`sentence-pools-phase-b.js`](data/english-questions/sentence-pools-phase-b.js) — 229 + 40 items
- [`data/english-questions/translation-pools.js`](data/english-questions/translation-pools.js) + [`translation-pools-phase-b.js`](data/english-questions/translation-pools-phase-b.js) — 172 + 64 items; MCQ shape missing from legacy pools
- [`data/english-questions/word-lists.js`](data/english-questions/word-lists.js) + [`utils/grade-gating.js`](utils/grade-gating.js) — vocab list keys per grade
- [`utils/english-question-generator.js`](utils/english-question-generator.js) — GRADE_PROFILES pool assignments
- [`scripts/lib/qa-inventory-professional.mjs`](scripts/lib/qa-inventory-professional.mjs) — PRO_LEVEL_MIN: easy 50 / medium 40 / hard 30
- [`docs/qa/LAUNCH_CORRECTION_MASTER_PLAN.md`](docs/qa/LAUNCH_CORRECTION_MASTER_PLAN.md) §8 — English G3–G6 targets
- [`docs/qa/ENGLISH_SCIENCE_ASSIGNED_ACTIVITY_CONTENT_EXPANSION_PLAN.md`](docs/qa/ENGLISH_SCIENCE_ASSIGNED_ACTIVITY_CONTENT_EXPANSION_PLAN.md) — assigned-activity gap matrix
- [`lib/classroom-activities/assigned-activity-topic-options.js`](lib/classroom-activities/assigned-activity-topic-options.js) — assign surface gates

## Artifact contents (outline)

- Baseline date + scope declaration
- Inventory table: 4 grades × 5 topics (topicTotal, launchLevel, inventoryStatus, assign available)
- Difficulty counts table: easy/medium/hard vs 50/40/30 per grade/topic
- Gap-to-target table: delta per cell
- PROFESSIONAL_READY vs THIN cell summary
- Translation deep-dive: why topicTotal=1 despite 236 raw rows (MCQ shape missing)
- Assigned-activity availability: which cells pass/fail the min-5 gate
- Writing PRACTICE_ONLY confirmation
- Out-of-scope guard list
- Files expected to change in implementation
- Tests that will be needed
- Risks
- Recommended implementation order
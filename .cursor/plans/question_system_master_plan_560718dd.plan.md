---
name: Question System Master Plan
overview: Create the full set of planning artifacts for bringing the question system from NOT_READY_INVENTORY_INSUFFICIENT to READY_FOR_LAUNCH. All documents are planning-only; no content, generators, or UI are changed until Phase 2B is owner-approved.
todos:
  - id: md-files-done
    content: 4 markdown planning files written (MASTER_CLOSURE_PLAN.md, SUBJECT_ROADMAP.md, ENGINE_REPORT_INTEGRATION_PLAN.md, FINAL_DEFINITION_OF_DONE.md)
    status: pending
  - id: json-csv-generate
    content: Generate QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json and .csv via new script scripts/build-master-closure-plan.mjs
    status: pending
  - id: cell-workplan-csv
    content: Regenerate QUESTION_CELL_WORKPLAN.csv from enhanced build-question-authoring-plan.mjs with additional columns (launchImpact, workType, reportMappingRisk, engineMappingRisk, plannedPhase, ownerReviewRequired)
    status: pending
  - id: owner-decisions
    content: Owner resolves all 8 open decisions in Section 14 of QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md
    status: pending
  - id: selector-gate
    content: "Add qa:question-selector-consistency gate script (Phase 2A, if owner approves decision #8)"
    status: pending
isProject: false
---

# Question System Master Closure Plan — Planning Artifacts

## Files created (markdown — done)

- [`reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md`](reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md) — 13-section master plan covering: launch objective, full inventory truth, cell workplan spec, subject roadmap summary, subtopic/skill coverage, engine/report integration summary, authoring standards, all 6 execution phases, first batch recommendation, hide/keep decisions, final gates, Definition of Done, and 8 open owner decisions
- [`reports/question-audit/QUESTION_SUBJECT_ROADMAP.md`](reports/question-audit/QUESTION_SUBJECT_ROADMAP.md) — Per-subject deep dives: Math (fractions fix, generator risks), Geometry (classification topic root cause + strategy), Hebrew (per-grade cell counts, passage rules, report mapping), English (pool structure, grade-scoped counts, level tagging gap), Science (g1–g2 near-empty state, g3 body partial fill, g4+ scope), Moledet (generator variety analysis, owner decision needed for g5–g6)
- [`reports/question-audit/QUESTION_ENGINE_REPORT_INTEGRATION_PLAN.md`](reports/question-audit/QUESTION_ENGINE_REPORT_INTEGRATION_PLAN.md) — Full field requirements per question type; anti-repeat fingerprint risks; diagnostic taxonomy alignment check; parent report topic accumulator; metadata leak prevention; pre-merge integration checklist
- [`reports/question-audit/QUESTION_FINAL_DEFINITION_OF_DONE.md`](reports/question-audit/QUESTION_FINAL_DEFINITION_OF_DONE.md) — 10-condition DoD; owner approval table; post-launch backlog; freeze note template

## Files to generate during Phase 2A execution (require script/code)

- `QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json` — machine-readable version of the plan phases, cells, and counts (generate via new script `scripts/build-master-closure-plan.mjs`)
- `QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv` — one row per phase/batch, columns: phase, batch, subject, cells, items, status
- `QUESTION_CELL_WORKPLAN.csv` — enhanced QUESTION_AUTHORING_PLAN.csv with additional columns: launchImpact, workType, estimatedGeneratorVariantsNeeded, reportMappingRisk, engineMappingRisk, plannedPhase, ownerReviewRequired (regenerate from `scripts/build-question-authoring-plan.mjs` with new column set)

## Execution phases (do not start until owner approves)

- **Phase 2A** — This plan + resolve 8 open owner decisions (no content changes)
- **Phase 2B** — Core authored content: Hebrew g1–g3 reading/comprehension/grammar + Science g1–g4 body/animals + English g1–g2 sentences/vocabulary (~1,380 new items)
- **Phase 2C** — Core generator improvements: Math g4 fractions + Moledet g3 homeland + Moledet g4 community (~505 new generator variants)
- **Phase 2D** — Remaining core cells (~550 items, scope depends on owner Phase 2A decisions)
- **Phase 2E** — Non-core hide/thin/author decisions (owner sign-off, no content)
- **Phase 2F** — Full QA closure (all 10 gates pass, owner review packs approved, READY_FOR_LAUNCH)

## Total missing work (minimum launch)

- Hebrew: ~730 new items (g1–g3 core only)
- Science: ~640 new items (g1–g4 core only)
- English: ~180 new pool items (g1–g2 core only)
- Math: ~75 new generator variants (fractions g4)
- Moledet: ~130 new generator variants (g3–g4 core only)
- Minimum total: ~2,030 items/variants to clear all 56 core NEEDS cells
- Full professional (all 412 cells): ~7,000+ items

## 8 open decisions requiring owner approval before Phase 2B

1. Hebrew speaking — hide all grades or author MCQ?
2. Hebrew g4–g6 — in launch scope or post-launch?
3. Moledet g5–g6 — approve thin or improve generator?
4. Science g4–g6 non-core — author or hide before launch?
5. English translation — hide or author 50 items/grade?
6. Hebrew writing g3–g6 — author or hide?
7. Geometry classification cells — approve thin or add depth variants?
8. Add `qa:question-selector-consistency` gate in Phase 2A?

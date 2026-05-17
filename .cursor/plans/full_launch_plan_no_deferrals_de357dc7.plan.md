---
name: Full Launch Plan No Deferrals
overview: Rebuild the master launch plan under the rule that every active selectable cell must reach PROFESSIONAL_READY before launch. No hiding, no thin approvals, no post-launch deferrals. All 8 previously open owner decisions are resolved as INCLUDE_AND_COMPLETE. Phase 2E is redefined as remaining non-core authored completion.
todos:
  - id: update-build-script
    content: "Update scripts/build-master-closure-plan.mjs: set THIN_AS_BLOCKING=true, remove POST_LAUNCH_BACKLOG launchImpact, update getPlannedPhase to assign Phase 2D/2E to all previously-deferred cells"
    status: completed
  - id: regen-artifacts
    content: Run npm run qa:master-closure-plan to regenerate QUESTION_CELL_WORKPLAN.csv, QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json, QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv with new rule
    status: completed
  - id: update-master-plan-md
    content: "Update QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md: remove Section 14 owner decisions, rewrite Phase 2E as remaining completion, update all counts, update DoD rule"
    status: completed
  - id: update-dod-md
    content: "Update QUESTION_FINAL_DEFINITION_OF_DONE.md: require 771/771 PROFESSIONAL_READY, 0 THIN, no open decisions"
    status: completed
  - id: verify-output
    content: Re-run qa:question-selector-consistency and confirm counts match plan, verify workplan CSV launchImpact has no POST_LAUNCH_BACKLOG
    status: completed
isProject: false
---

# Question System Full Launch Plan — All Cells PROFESSIONAL_READY

**Rule:** Every active selectable cell must reach `PROFESSIONAL_READY` before launch.
**No hiding. No thin approvals. No post-launch deferrals. No open owner decisions.**
**Only exception:** If a topic/level is curriculum-invalid for a grade, mark `NOT_APPLICABLE` and remove from selector with explanation. Currently 0 such cells exist in the matrix.

---

## 1. Global inventory — current state (source: QUESTION_INVENTORY_MATRIX.json)

| Metric | Count |
|--------|-------|
| Total active selectable cells | 771 |
| PROFESSIONAL_READY | 301 |
| LAUNCH_ACCEPTABLE_THIN (now launch-blocking under new rule) | 58 |
| NEEDS_AUTHORING_BEFORE_LAUNCH | 412 |
| CRITICAL_BLOCKING | 0 |
| **Total cells requiring work** | **470** |
| Current total question variants in system | 171,083 |

---

## 2. Work totals required for full launch

| Work type | Cells | Shortage |
|-----------|-------|---------|
| Authored bank cells to fix | 287 | **8,673 new items** |
| Generator cells to improve | 183 | **13,623 new variants** |
| **Total** | **470** | **22,296 items/variants** |

---

## 3. Roadmap by subject

### Math
- Total cells: 234 | Ready: 222 | Needing work: 12
- All non-ready cells are **generated** (fractions g2–g4, powers g4)
- Authored shortage: 0 | Generator shortage: **415 variants**
- g1, g5, g6: fully PROFESSIONAL_READY — no work needed
- g2 fractions: 3 cells, 84 variants needed
- g3 fractions: 3 cells, 118 variants needed
- g4 fractions: 3 cells, 75 variants needed
- g4 powers: 3 cells, 138 variants needed

### Geometry
- Total cells: 123 | Ready: 60 | Needing work: 63
- All non-ready cells are **generated** (classification/structural topics)
- Authored shortage: 0 | Generator shortage: **5,847 variants**
- g1 transformations: 3 cells, 290 variants
- g2 shapes_basic/solids/transformations: 9 cells, 854 variants
- g3 shapes_basic/parallel_perpendicular/quadrilaterals/rotation/triangles: 15 cells, 1,438 variants
- g4 shapes_basic/parallel_perpendicular/quadrilaterals/symmetry/triangles: 15 cells, 1,437 variants
- g5 parallel_perpendicular/quadrilaterals/solids/tiling: 12 cells, 1,139 variants
- g6 circles/pythagoras/solids: 9 cells, 689 variants

### Hebrew
- Total cells: 108 | Ready: 1 | Needing work: 107
- All non-ready cells are **authored bank**
- Authored shortage: **3,396 items** | Generator shortage: 0
- Topics: reading, comprehension, grammar, speaking, vocabulary, writing
- g1: 17 cells (reading easy is READY), shortage ~404 items
- g2: 18 cells, shortage ~556 items
- g3: 18 cells, shortage ~582 items
- g4: 18 cells, shortage ~624 items
- g5: 18 cells, shortage ~616 items
- g6: 18 cells, shortage ~614 items

### English
- Total cells: 84 | Ready: 18 | Needing work: 66
- All non-ready cells are **authored bank_grade_scoped** (38 currently THIN, 28 NEEDS)
- Authored shortage: **1,674 items** | Generator shortage: 0
- Topics: vocabulary, sentences, writing, translation (g2–g6 only)
- g1: 6 cells, shortage 174 items (sentences/vocabulary easy/medium — hard cells are THIN, now must reach 30)
- g2: 12 cells, shortage 399 items (vocabulary/sentences/translation/writing)
- g3: 12 cells, shortage 255 items (all 4 topics — many currently THIN)
- g4: 12 cells, shortage 291 items
- g5: 12 cells, shortage 246 items
- g6: 12 cells, shortage 309 items

### Science
- Total cells: 114 | Ready: 0 | Needing work: 114
- All non-ready cells are **authored bank**
- Authored shortage: **3,603 items** | Generator shortage: 0
- Topics: body, animals, earth_space, environment, materials, plants, experiments
- (g1 has 6 topics; g2+ has 7 topics including experiments)
- g1: 18 cells, shortage 641 items
- g2: 21 cells, shortage 719 items
- g3: 21 cells, shortage 619 items (some cells have count ≥ min but topic total below threshold)
- g4: 18 cells, shortage 557 items
- g5: 18 cells, shortage 548 items
- g6: 18 cells, shortage 519 items

### Moledet / Geography
- Total cells: 108 | Ready: 0 | Needing work: 108
- All non-ready cells are **generated**
- Authored shortage: 0 | Generator shortage: **7,361 variants**
- Topics: homeland, community, geography, citizenship, maps, values (6 topics × 6 grades × 3 levels)
- g1: 18 cells, shortage 1,191 variants
- g2: 18 cells, shortage 1,174 variants
- g3: 18 cells, shortage 1,190 variants
- g4: 18 cells, shortage 1,257 variants
- g5: 18 cells, shortage 1,277 variants
- g6: 18 cells, shortage 1,272 variants

---

## 4. Roadmap by grade

| Grade | Cells | Ready | Authored cells to fix | Authored shortage | Generator cells to fix | Generator shortage |
|-------|-------|-------|-----------------------|------------------|------------------------|-------------------|
| g1 | 87 | 25 | 41 | 1,219 | 21 | 1,481 |
| g2 | 108 | 27 | 51 | 1,674 | 30 | 2,112 |
| g3 | 135 | 48 | 51 | 1,456 | 36 | 2,746 |
| g4 | 153 | 66 | 48 | 1,472 | 39 | 2,907 |
| g5 | 147 | 69 | 48 | 1,410 | 30 | 2,416 |
| g6 | 141 | 66 | 48 | 1,442 | 27 | 1,961 |

---

## 5. Per subject → grade → topic → level detail (complete non-READY list)

**Math non-READY (all generated, target 100 unique variants):**
- g2 fractions easy 72→100 (+28), medium 72→100 (+28), hard 72→100 (+28)
- g3 fractions easy 33→100 (+67), medium 75→100 (+25), hard 74→100 (+26)
- g4 fractions easy 75→100 (+25), medium 75→100 (+25), hard 75→100 (+25)
- g4 powers easy 36→100 (+64), medium 54→100 (+46), hard 72→100 (+28)

**Geometry non-READY (all generated, target 100):**
- g1: transformations easy 4→100 (+96), medium 4→100 (+96), hard 2→100 (+98)
- g2: shapes_basic e/m/h 5/5/4→100 (+95/95/96); solids e/m/h 8/8/6→100 (+92/92/94); transformations e/m/h 4/4/2→100 (+96/96/98)
- g3: parallel_perp e/m/h 4/4/2→100; quadrilaterals 5/6/5→100; rotation 4/4/3→100; shapes_basic 5/5/4→100; triangles 4/4/3→100
- g4: parallel_perp 4/4/2→100; quadrilaterals 5/6/5→100; shapes_basic 5/5/4→100; symmetry 4/4/4→100; triangles 4/4/3→100
- g5: parallel_perp 4/4/2→100; quadrilaterals 5/6/6→100; solids 8/8/6→100; tiling 4/4/4→100
- g6: circles 11/22/52→100; pythagoras 34/35/35→100; solids 8/8/6→100

**Hebrew non-READY (all bank, targets: easy 50, medium 40, hard 30):**
See subject roadmap above. All 107 cells across 6 topics × 6 grades (minus g1 reading easy).

**English non-READY (all bank_grade_scoped, same targets):**
All 66 cells including 38 currently THIN (were accepted, now must reach PROFESSIONAL_READY).

**Science non-READY (all bank, same targets):**
All 114 cells across 6–7 topics × 6 grades. Note: g3 body easy (58 items) and g6 environment hard (33 items) have level count ≥ min but remain NEEDS due to topic-total threshold — still require attention.

**Moledet non-READY (all generated, target 100):**
All 108 cells. Current unique variants per cell range from 27 to 52. All 6 topics × 6 grades × 3 levels require structural generator improvement.

---

## 6. Previously open owner decisions — all resolved as INCLUDE_AND_COMPLETE

| Old decision | Old options | Resolution |
|-------------|-------------|------------|
| 1. Hebrew speaking: hide or author? | Hide / Author g1–g3 | **INCLUDE_AND_COMPLETE** — all 18 speaking cells (g1–g6) must reach PROFESSIONAL_READY. Phase 2D. |
| 2. Hebrew g4–g6: launch scope? | g1–g3 only / g1–g4 / all | **INCLUDE_AND_COMPLETE** — all 54 g4–g6 Hebrew cells in scope. Phase 2D. |
| 3. Moledet g5–g6: thin or improve? | Approve thin / Improve | **INCLUDE_AND_COMPLETE** — all 36 g5–g6 moledet cells must reach 100 variants. Phase 2E. |
| 4. Science g4–g6 non-core: author or hide? | Author / Hide | **INCLUDE_AND_COMPLETE** — all 93 non-core science cells must reach PROFESSIONAL_READY. Phase 2D. |
| 5. English translation: hide or author? | Hide / Author | **INCLUDE_AND_COMPLETE** — all 15 translation cells (g2–g6) must reach PROFESSIONAL_READY. Phase 2D. |
| 6. Hebrew writing g3–g6: hide or author? | Hide / Author g3 only | **INCLUDE_AND_COMPLETE** — all 18 writing cells (g3–g6) must reach PROFESSIONAL_READY. Phase 2D. |
| 7. Geometry classification: thin or improve? | Thin approval / Improve 2 | **INCLUDE_AND_COMPLETE** — all 63 geometry cells must reach 100 variants. Phase 2E. |
| 8. Selector gate in pipeline? | Optional / Add | **CONFIRMED** — `qa:question-selector-consistency` is part of the release gate. |

---

## 7. Execution phases

### Phase 2A — Planning (current, no content changes)
- Goal: Master plan finalized and approved
- Cells: 0 content changes
- Files changed: planning artifacts only
- QA: N/A
- Acceptance: Owner approves this plan document

---

### Phase 2B — Core authored content
- Goal: Eliminate all core launch-blocking authored cells (originally the 56-cell BLOCKS_LAUNCH group minus generator cells)
- **Cells: 47** authored cells across Hebrew and Science
- **Items needed: ~1,321**

**Hebrew (26 cells, ~675 items):**
- g1: reading medium/hard, comprehension easy/medium/hard, grammar easy/medium/hard (8 cells)
- g2: reading easy/medium/hard, comprehension easy/medium/hard, grammar easy/medium/hard (9 cells)
- g3: reading easy/medium/hard, comprehension easy/medium/hard, grammar easy/medium/hard (9 cells)

**Science (21 cells, ~646 items):**
- g1: body easy/medium/hard, animals easy/medium/hard (6 cells)
- g2: body easy/medium/hard, animals easy/medium/hard (6 cells)
- g3: body easy/medium/hard, animals easy/medium/hard (6 cells)
- g4: body easy/medium/hard (3 cells)

**Files expected to change:** Hebrew question bank files, Science question bank files
**QA after Phase 2B:**
```
npm run qa:question-quality
npm run qa:question-inventory-matrix
npm run qa:question-selector-consistency
```
**Acceptance:** All 47 cells show PROFESSIONAL_READY in matrix. Selector gate: 0 ERRORS for these cells. Owner review pack for Phase 2B approved.

---

### Phase 2C — Core generator improvement
- Goal: Bring highest-priority generator cells to 100 unique variants
- **Cells: 48** generator cells (Math + Moledet g3–g4)
- **Variants needed: ~2,862**

**Math (12 cells, ~415 variants):**
- fractions g2/g3/g4 (9 cells, ~277 variants)
- powers g4 (3 cells, ~138 variants)

**Moledet g3–g4 (36 cells, ~2,447 variants):**
- g3: homeland/community/geography/citizenship/maps/values (18 cells, ~1,190 variants)
- g4: homeland/community/geography/citizenship/maps/values (18 cells, ~1,257 variants)

**Files expected to change:** Math question generator, Moledet question generator
**QA after Phase 2C:**
```
npm run qa:session-question-variety
npm run qa:question-inventory-matrix
npm run qa:question-selector-consistency
```
**Acceptance:** All 48 generator cells reach ≥100 unique variants. Selector gate: 0 ERRORS for these cells.

---

### Phase 2D — All remaining authored content
- Goal: Bring every remaining authored/bank cell to PROFESSIONAL_READY — no deferrals
- **Cells: 240** authored cells
- **Items needed: ~7,352**

**Hebrew remaining (81 cells, ~2,721 items):**
- g1–g3: speaking, vocabulary, writing (27 cells, ~881 items)
- g4: all 6 topics easy/medium/hard (18 cells, ~624 items)
- g5: all 6 topics easy/medium/hard (18 cells, ~616 items)
- g6: all 6 topics easy/medium/hard (18 cells, ~614 items)

**English all non-ready (66 cells, ~1,674 items):**
- g1: sentences easy/medium + hard (THIN→PROFESSIONAL_READY), vocabulary easy/medium + hard (THIN→PROFESSIONAL_READY)
- g2–g6: vocabulary, sentences, writing, translation for each grade
- Note: 38 cells were THIN and now must be fully completed; 28 cells are NEEDS

**Science remaining (93 cells, ~2,957 items):**
- g1–g4: earth_space, environment, materials, plants (g1–g3), experiments (g2–g4) — non-core topics
- g4: animals (3 cells)
- g5: all 6 topics (18 cells)
- g6: all 6 topics (18 cells)

**Files expected to change:** Hebrew question bank files, English question bank files, Science question bank files
**QA after Phase 2D:**
```
npm run qa:question-quality
npm run qa:question-inventory-matrix
npm run qa:question-selector-consistency
npm run qa:session-question-variety
```
**Acceptance:** All 287 authored cells PROFESSIONAL_READY. Selector gate: 0 ERRORS for authored subjects. Owner review pack for Phase 2D approved.

---

### Phase 2E — All remaining generator improvement
- Goal: Bring every remaining generator cell to 100 unique variants — no deferrals
- **Cells: 135** generator cells
- **Variants needed: ~10,761**

**Geometry all non-ready (63 cells, ~5,847 variants):**
- g1: transformations (3 cells)
- g2: shapes_basic, solids, transformations (9 cells)
- g3: 5 topics × 3 levels (15 cells)
- g4: 5 topics × 3 levels (15 cells)
- g5: 4 topics × 3 levels (12 cells)
- g6: 3 topics × 3 levels (9 cells)

**Moledet g1–g2 + g5–g6 (72 cells, ~4,914 variants):**
- g1: 6 topics × 3 levels (18 cells, ~1,191 variants)
- g2: 6 topics × 3 levels (18 cells, ~1,174 variants)
- g5: 6 topics × 3 levels (18 cells, ~1,277 variants)
- g6: 6 topics × 3 levels (18 cells, ~1,272 variants)

**Files expected to change:** Geometry question generator(s), Moledet question generator
**QA after Phase 2E:**
```
npm run qa:session-question-variety
npm run qa:question-inventory-matrix
npm run qa:question-selector-consistency
npm run test:e2e:question-display
```
**Acceptance:** All 183 generator cells reach ≥100 unique variants. Total non-PROFESSIONAL_READY = 0. Selector gate: 0 ERRORS and 0 WARNINGS.

---

### Phase 2F — Final QA closure
- Goal: All gates pass, all cells confirmed PROFESSIONAL_READY, READY_FOR_LAUNCH confirmed
- Cells: 0 content changes (verification only)

**Final gate sequence:**
```
npm run qa:question-inventory-matrix          # all 771 cells PROFESSIONAL_READY
npm run qa:question-selector-consistency --strict  # 0 errors, 0 warnings
npm run qa:question-quality                   # all items meet MCQ standards
npm run qa:session-question-variety           # all generated topics pass variety check
npm run test:e2e:question-display             # no broken renders
npm run qa:student-question-stem-metadata     # all stems have required fields
npm run qa:parent-report-grade-aware          # all topics map to report correctly
npm run qa:questions:release                  # final gate → READY_FOR_LAUNCH
npm run build                                 # production build clean
```
**Files changed:** None (QA only). `QUESTION_RELEASE_READINESS.json` updated by qa:questions:release.
**Acceptance:** `QUESTION_RELEASE_READINESS.json` → `decision: "READY_FOR_LAUNCH"`.

---

## 8. Phase summary table

| Phase | Work type | Cells | Items / Variants | Cumulative ready |
|-------|-----------|-------|-----------------|-----------------|
| 2A | Planning | 0 | 0 | 301/771 |
| 2B | Core authored | 47 | ~1,321 authored | 348/771 |
| 2C | Core generator | 48 | ~2,862 variants | 396/771 |
| 2D | All remaining authored | 240 | ~7,352 authored | 636/771 |
| 2E | All remaining generator | 135 | ~10,761 variants | 771/771 |
| 2F | Final QA | 0 | 0 | **771/771 = READY** |

---

## 9. Recommended first execution batch (Phase 2B start)

Priority order within Phase 2B based on launch impact and user-facing frequency:

1. **Hebrew g2 reading/comprehension/grammar** — g2 is highest-use grade, all 9 cells at critical shortage (270 items). Start here.
2. **Science g1 body + animals** — g1 is first subject exposure, both core topics at near-zero (102+102 = ~204 items). Parallel with Hebrew.
3. **Hebrew g1 reading/comprehension/grammar** — completes g1 Hebrew core (8 cells, 138 items).
4. **Hebrew g3 reading/comprehension/grammar** — completes g1–g3 core band (9 cells, 267 items).
5. **Science g2 body + animals** — (6 cells, 196 items).
6. **Science g3–g4 body + animals** — (9 cells, 247 items).

**Review pack per batch:** For every 50 authored items, generate a review pack: 10 easy, 20 medium, 20 hard samples per topic. Owner spot-check for: correct answer certainty, distractor plausibility, grade-appropriate Hebrew, no duplicate stems.

**QA after each batch of 50 items:** `npm run qa:question-quality` on the modified bank file.

---

## 10. Definition of Done — updated

READY_FOR_LAUNCH is achieved when **all** of the following hold simultaneously:

- `QUESTION_RELEASE_READINESS.json` → `decision: "READY_FOR_LAUNCH"`
- `statusCounts.CRITICAL_BLOCKING === 0`
- `statusCounts.NEEDS_AUTHORING_BEFORE_LAUNCH === 0`
- `statusCounts.LAUNCH_ACCEPTABLE_THIN === 0` ← new requirement
- `statusCounts.PROFESSIONAL_READY === 771` (all active cells)
- `npm run qa:question-selector-consistency --strict` exits 0 (0 errors, 0 warnings)
- `npm run qa:question-quality` exits 0
- `npm run qa:session-question-variety` exits 0
- `npm run qa:questions:release` exits 0
- `npm run build` exits 0
- Owner review packs for Phases 2B and 2D signed in `QUESTION_FINAL_DEFINITION_OF_DONE.md`

There are **no open owner decisions**. All active content ships complete.

---

## 11. What changes in the artifact files

The following planning files need to be regenerated/updated:

- [`reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md`](reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md) — remove Section 14 (owner decisions), update Phase 2E definition, update all counts, update Definition of Done rule
- [`scripts/build-master-closure-plan.mjs`](scripts/build-master-closure-plan.mjs) — update `getPlannedPhase` to assign Phase 2E to all previously-deferred cells; remove `launchImpact: POST_LAUNCH_BACKLOG`; set `THIN_AS_BLOCKING = true` so THIN cells become launch-blocking; recalculate `estimatedGeneratorVariantsNeeded` using `GENERATED_MIN = 100` for all
- Regenerate: `QUESTION_CELL_WORKPLAN.csv`, `QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json`, `QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv`
- [`reports/question-audit/QUESTION_FINAL_DEFINITION_OF_DONE.md`](reports/question-audit/QUESTION_FINAL_DEFINITION_OF_DONE.md) — update DoD to require 771/771 PROFESSIONAL_READY and 0 THIN

---

## 12. Confirmation: no content changes made yet

- No question bank files were modified
- No generator files were modified
- No UI/navigation/scoring/game logic was changed
- All counts above come from reading `QUESTION_INVENTORY_MATRIX.json` in read-only mode
- Current state: 301 PROFESSIONAL_READY, 58 THIN, 412 NEEDS, 0 CRITICAL
- This plan describes future work only

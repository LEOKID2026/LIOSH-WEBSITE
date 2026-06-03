---
name: Phase B Content Expansion
overview: "Complete implementation-ready plan for Phase B: English + Science assigned-activity content expansion. Covers grammar/sentences/translation (g2–g6) and materials/earth_space/environment (g1–g6), with exact item counts, fix details, testing, QA, and open owner decisions."
todos:
  - id: plan-written
    content: Plan written to docs/qa/ENGLISH_SCIENCE_ASSIGNED_ACTIVITY_CONTENT_EXPANSION_PLAN.md — awaiting owner approval before implementation
    status: pending
  - id: owner-decisions
    content: Owner decisions needed on 7 open items (hard difficulty threshold, g1–g2 hard gating, g6 translation fix approach, bank depth minimum, authorship)
    status: pending
isProject: false
---

# Phase B — English & Science Assigned-Activity Content Expansion Plan

## What was written

The complete plan has been written to:

**[`docs/qa/ENGLISH_SCIENCE_ASSIGNED_ACTIVITY_CONTENT_EXPANSION_PLAN.md`](docs/qa/ENGLISH_SCIENCE_ASSIGNED_ACTIVITY_CONTENT_EXPANSION_PLAN.md)**

All 13 required sections are present. No product code was changed.

---

## Missing content summary

### English — 159 new MCQ items + 1 generator/pool-wiring fix

Breakdown by topic (reconciled — all rows cross-check to 159):

- `grammar` g3 hard: +5 items
- `grammar` g4 medium+hard: +10 items
- `grammar` g5 medium+hard: **+20 items** (4 pool keys × ≥2 per key × 2 difficulties)
- `grammar` g6 medium+hard: **+20 items** (4 pool keys × same)
- Grammar subtotal: 5+10+20+20 = **55**
- `sentences` g3 medium+hard: +10 items
- `sentences` g4 medium+hard: +10 items
- `sentences` g5 medium+hard: +10 items
- `sentences` g6 medium+hard: +10 items
- Sentences subtotal: 10+10+10+10 = **40**
- `translation` g2 hard only: +4 items
- `translation` g3 easy+medium+hard (dedup fix): +15 items
- `translation` g4 easy+medium+hard (dedup fix): +15 items
- `translation` g5 easy+medium+hard (thin+dedup fix): +15 items
- `translation` g6 easy+medium+hard (mapping bug + new g6-only pool): +15 items + pool wiring fix
- Translation subtotal: 4+15+15+15+15 = **64**
- **English total: 55 + 40 + 64 = 159**
- **By difficulty:** easy 20 + medium 65 + hard 74 = 159

### Science — 75 new bank rows, no generator change

Breakdown by grade (reconciled — all rows cross-check to 75):

- g1 materials/earth_space/environment medium+hard: +24 items (critical gap, 4 medium + 4 hard per topic × 3 topics)
- g2 materials hard: +4; earth_space medium+hard: +6; environment medium+hard: +5 → subtotal +15
- g3 each topic easy+hard: +2 easy +2 hard per topic × 3 topics → subtotal +12
- g4 each topic easy only: +2 easy per topic × 3 topics → subtotal +6
- g5 materials easy+medium: +3+2=5; earth_space easy: +2; environment easy: +2 → subtotal +9
- g6 materials easy+medium: +3+2=5; earth_space easy: +2; environment easy: +2 → subtotal +9
- **Science total: 24+15+12+6+9+9 = 75**
- **By topic:** materials 28 + earth_space 24 + environment 23 = 75
- **By difficulty:** easy 26 + medium 19 + hard 30 = 75

---

## Implementation phases

- **B1** — Audit/count baseline (no file changes)
- **B2** — English content expansion (grammar pools, sentence pools, translation pools, g6 fix)
- **B3** — Science content expansion (new `data/science-questions-phase-b.js` batch file)
- **B4** — End-to-end validation (parent/teacher/child flows)
- **B5** — Final QA, audit re-run, build, report

---

## Key files that will be changed

- [`data/english-questions/grammar-pools.js`](data/english-questions/grammar-pools.js) — new MCQ items
- [`data/english-questions/sentence-pools.js`](data/english-questions/sentence-pools.js) — new MCQ items
- [`data/english-questions/translation-pools.js`](data/english-questions/translation-pools.js) — new pairs + g6 pool
- [`utils/english-question-generator.js`](utils/english-question-generator.js) — g6 translation pool wiring (B2.4)
- [`utils/grade-gating.js`](utils/grade-gating.js) — register g6-exclusive translation pool range (B2.4)
- `data/science-questions-phase-b.js` — new file with ~75 science MCQs
- [`data/science-questions.js`](data/science-questions.js) — import new batch

---

## Biggest risks

- g6 translation pool-wiring fix (only English change touching generator logic)
- Translation dedup — new pairs must have distinct `en` stems after normalization
- g1 science content must be factually correct and age-appropriate (the hardest authoring constraint)
- count=5 vs count=3 mismatch in manual QA (all tests and checks explicitly use count=5)

---

## Owner decisions needed before implementation (all 7)

All 7 decisions are detailed in section 13 of the plan file.  Summary:

1. **Hard difficulty go-live threshold:** Require easy+medium+hard all pass before launch, or accept easy+medium as initial threshold with hard deferred?
2. **g1–g2 hard gating:** Hide hard difficulty from assigned selector for g1–g2 science temporarily (requires a UI code change), or expand the bank first (follow Phase B3)?
3. **Temporary "easy+medium only" label:** Add a visible badge on grade/topics that only support easy+medium until hard bank is ready — or don't show selector until all three difficulties are ready?
4. **Bank depth minimum:** Keep ≥5 items per cell as the passing bar, or raise to ≥8 or ≥10 to give dedup headroom (would add ~20–30 extra items)?
5. **g6 translation fix approach:** (A) Add new `global_advanced` pool key with `minGrade: 6, maxGrade: 6` items (safer, adds a pool key); or (B) fix `englishPoolItemAllowedWithClassSplit()` in `grade-gating.js` to guarantee g6 gets enough items from existing `global` pool (fixes root cause, touches gating logic)?
6. **English `mixed` topic:** Keep as-is, relabel to "תרגול מעורב", or hide from assigned activities for English g3–g6?
7. **Content authorship:** Who authors the 234 new items — content team, AI-draft + human review, or third party? (This determines the Phase B2/B3 timeline.)

---

## Confirmation

No product code changed. Plan file written, uncommitted.
# Pre-Launch Curriculum Compliance Closure Plan

**Document date:** 2026-06-02  
**Phase:** Final pre-launch closure — planning/reporting only  
**Upstream oracle:** [`data/curriculum-oracle/v1/ministry-matrix.draft.json`](../data/curriculum-oracle/v1/ministry-matrix.draft.json)  
**Build plan reference:** [`docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md`](CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md)  
**Product layers:** Unchanged in this phase (read-only diff)

---

## 0. Repository state check

### Raw `git status --short`

Command run at closure document creation:

```bash
git status --short
```

Output:

```
 M .cursor/plans/ministry_oracle_build_plan_63c007bf.plan.md
?? .cursor/plans/pre-launch_closure_plan_43743ed6.plan.md
?? data/curriculum-oracle/
?? docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md
?? scripts/build-ministry-oracle-assemble.mjs
?? scripts/build-ministry-oracle-english.mjs
?? scripts/build-ministry-oracle-hebrew.mjs
?? scripts/build-ministry-oracle-math-geometry.mjs
?? scripts/build-ministry-oracle-moledet-geography.mjs
?? scripts/build-ministry-oracle-science.mjs
?? scripts/lib/ministry-oracle-shared.mjs
```

### Interpretation

| Finding | Status |
|---------|--------|
| Oracle data files (`data/curriculum-oracle/`) | New, untracked — **expected** |
| Standalone build scripts (`scripts/build-ministry-oracle-*.mjs`) | New, untracked — **expected** |
| Oracle build plan doc | New, untracked — **expected** |
| Plan files (`.cursor/plans/`) | Modified/new — **expected** |
| `skills.json`, generators, books, reports, diagnostics, UI, SQL, `package.json` | **Not present** — **clean** |

**Verdict for this phase:** Repository changes are limited to oracle artifacts, standalone scripts, and planning docs. No product/runtime file was modified. This closure document adds one more doc file only.

---

## 1. Launch verdict

### Overall verdict: **RED**

The product **cannot launch with a public claim of full Ministry-of-Education alignment across grades 1–6**.

### Rationale (evidence-based)

| Evidence | Source |
|----------|--------|
| **0** oracle rows at `confidence: high` | `ministry-matrix.draft.json` — no primary grade PDF parsed |
| **38** blocker/pending rows (28 `required_pending_pdf_parse`, 6 `pending_parse`, 3 `source_blocker`, 1 `not_in_grade`) | Oracle header `blocker_count: 38` |
| **0** official Science oracle rows | Science excluded from matrix; 38 rows in `internal-scaffold.science.json` only |
| Triangle area formula exposed from **G3** via generator | `utils/geometry-constants.js` `TOPIC_SHAPES.area.g3` includes `"triangle"` |
| No `geometry:kind:triangle_area` in spine | `data/curriculum-spine/v1/skills.json` (38 geometry skills, none named triangle_area) |
| G5 book teaches `heights_triangle` with no prior `triangle_area` page | `lib/learning-book/geometry-g5-registry.js` batch D |
| Diagnostic/report label `geo_area_triangle_formula` exists without teach path | `lib/classroom-activities/classroom-skill-labels-he.js`, `utils/geometry-diagnostic-metadata-bridge.js` |
| Moledet G1 runs full product content; oracle = `not_in_grade` | `moledet.g1.official_status` row; `data/moledet-geography-curriculum.js` G1 topics |
| English G4–6 oracle rows = `source_blocker` only | 3 blocker rows in matrix for grades 4–6 |

### Oracle snapshot

| Metric | Value |
|--------|-------|
| Total oracle rows | 124 |
| Blocker/pending rows | 38 |
| `required` rows | 86 |
| `required_pending_pdf_parse` | 28 |
| Science official rows | **0** |
| Science scaffold rows | 38 |
| Moledet/geography scaffold rows | 36 |
| Spine skills (downstream) | 423 |

---

## 2. Blockers by subject and grade (1–6)

Classification key:

| Classification | Meaning |
|----------------|---------|
| `launch_safe` | Oracle supports Ministry claim at this grade with no known product mismatch |
| `launch_safe_with_limitation` | Usable with explicit limitations; no full Ministry claim |
| `blocked` | Known product/oracle mismatch blocks Ministry claim |
| `enrichment_only` | Product may run; must not be presented as Ministry-aligned |
| `source_not_verified` | Source missing or unvalidated; no curriculum truth available |

### Master table

| Subject | G1 | G2 | G3 | G4 | G5 | G6 | Overall |
|---------|----|----|----|----|----|----|---------|
| **Math** | `launch_safe_with_limitation` | same | same | same | same | same | Medium-confidence rows; kita PDFs unparsed |
| **Geometry / הנדסה** | `launch_safe_with_limitation` | same | same | same | **`blocked`** | **`blocked`** | G5–6: triangle area chain broken |
| **Hebrew** | `launch_safe_with_limitation` | same | same | same | same | same | Derived alignment; single PDF |
| **English** | `launch_safe_with_limitation` | same | same | **`source_not_verified`** | same | same | G4–6 TXT unverified |
| **Science** | **`blocked`** | same | same | same | same | same | Zero official oracle rows |
| **Moledet** | **`enrichment_only`** | `launch_safe_with_limitation` | same | same | N/A | N/A | G1 not in official scope |
| **Geography** | **`enrichment_only`** | N/A | N/A | N/A | `launch_safe_with_limitation` | same | G1 maps in product; oracle G5–6 only |

### Per-subject notes

**Math (1–6):** Oracle rows exist at `confidence: medium` from `mavo1.txt` + supplements. All math strand rows for grades with geometry overlap are `required_pending_pdf_parse`. No `high`-confidence rows until per-grade `kita{n}.pdf` is parsed.

**Geometry (1–4):** Provisional medium-confidence oracle rows only; primary grade PDFs not parsed. **Must fix area-formula overexposure (G3–G4) before any Ministry-alignment claim.** Shape/angle/perimeter topics are less contested but still provisional.

**Geometry (5–6):** **Blocked.** Triangle area is `required_pending_pdf_parse` at G5 but product exposes formula from G3, lacks spine skill and book page, teaches heights before area, and G6 prism volume depends on untaught formula.

**Hebrew (1–6):** 41 oracle rows from `derived_alignment` matrix. Confidence capped at `medium`. No per-grade TXT splits for grades 2–6 in repo.

**English (1–3):** Validated TXT extracts; 43 oracle rows at `required` / `medium`.

**English (4–6):** **`source_not_verified`.** Oracle contains `source_blocker` rows only. TXT files present but catalog marks `unknown_unverified`.

**Science (1–6):** **`blocked`** for Ministry alignment. Zero rows in oracle. Product has 7 coarse spine skills and 38 scaffold topic rows with no official backing.

**Moledet (1):** **`enrichment_only`.** Oracle row `moledet.g1.official_status`: `not_in_grade`, `no_verified_source`. Product teaches full G1 moledet/geography curriculum.

**Moledet (2–4) / Geography (5–6):** Scope-level oracle rows only (`confidence: medium`); official PDFs not parsed to subsection granularity. Product has 36 scaffold topics vs 5 official scope rows.

---

## 3. Exact product remediation map

Each row includes: issue id, subject, grade, flag, layer, current behavior, required behavior, files, source verification required, allowed after owner approval, launch risk if unfixed.

### 3.1 Geometry / triangle area

| ID | Subject | Grade | Flag | Layer | Current behavior | Required behavior | Files likely to change | Source verify first? | Allowed after owner approval? | Risk if not fixed |
|----|---------|-------|------|-------|------------------|-------------------|------------------------|----------------------|------------------------------|-------------------|
| **GEO-01** | geometry | 3–4 | `OVERTEACHING` | Generator gates | `TOPIC_SHAPES.area.g3` and `.g4` include `"triangle"`; generator emits `triangle_area` questions from G3 | Remove `"triangle"` from area shape lists for G3 and G4; formula exposure G5+ only | `utils/geometry-constants.js`, `scripts/curriculum-spine-grade-bindings.mjs` | No — oracle already indicates G3 = comparison/arbitrary units | **Yes — Track A** | Students practice triangle area formula 2 grades early; false Ministry compliance |
| **GEO-02** | geometry | 5+ | `MISSING_REQUIRED_TOPIC` | Spine | No `geometry:kind:triangle_area` skill in `skills.json` | Add spine skill at G5+ only, mapped to oracle row | `data/curriculum-spine/v1/skills.json`, spine build scripts | **Yes** — row is `required_pending_pdf_parse` until `kita5.pdf` parsed, OR owner accepts medium-confidence | **Track B only** | Teacher assignment and reports cannot anchor to teachable skill |
| **GEO-03** | geometry | 5 | `MISSING_REQUIRED_TOPIC` | Learning book | No `triangle_area.md` page in G5 registry | Add teach page before `heights_triangle` batch | `lib/learning-book/geometry-g5-registry.js`, `docs/learning-book/geometry/g5/drafts/triangle_area.md` (new) | **Yes** — same as GEO-02 | **Track B only** | Students reach heights/inverse problems without formula introduction |
| **GEO-04** | geometry | 5 | `OUT_OF_SEQUENCE` | Learning book TOC | Batch D (`heights_triangle`) precedes any triangle area formula page | `triangle_area` page must appear before batch D | `lib/learning-book/geometry-g5-registry.js` | No for gating existing pages; **Yes** for adding new page | Track A can hide/gate; Track B for reorder | Pedagogical sequence violated; hidden prerequisite |
| **GEO-05** | geometry | 6 | `HIDDEN_PREREQUISITE` | Learning book G6 | `prism_volume_triangle.md` assumes triangle area formula known | Page must declare prerequisite on G5 `triangle_area`; block nav until prerequisite complete | `docs/learning-book/geometry/g6/drafts/prism_volume_triangle.md`, G6 registry | **Yes** — depends on GEO-03 | **Track B only** | G6 volume teaching fails silently for students who skipped untaught formula |
| **GEO-06** | geometry | 1–4 | `UNSUPPORTED_REPORT_LABEL` | Teacher/school labels | `geo_area_triangle_formula: "שטח משולש"` in classroom labels with no grade gate | Suppress label below G5 in all assignment/report surfaces | `lib/classroom-activities/classroom-skill-labels-he.js` | No | **Yes — Track A** | Teachers/schools see weakness labels for untaught topic |
| **GEO-07** | geometry | 1–4 | `UNSUPPORTED_TEACHER_ASSIGNMENT` | Teacher/private-teacher activity creation | Triangle area assignable via generator `triangle_area` kind below G5 | Block assignment below G5 | Activity creation UI + `utils/geometry-question-generator.js` kind routing, classroom activity filters | No | **Yes — Track A** | Teachers assign Ministry-unofficial content |
| **GEO-08** | geometry | 1–4 | `UNSUPPORTED_REPORT_LABEL` | Diagnostic engine | `triangle_area` in G08 taxonomy indicators; diagnostics can surface formula weakness below G5 | Gate diagnostic candidates to G5+ or suppress when no teach path | `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`, `utils/geometry-diagnostic-metadata-bridge.js` | No | **Yes — Track A** | Parent/teacher reports claim weakness in untaught skill |
| **GEO-09** | geometry | 1–4 | `UNSUPPORTED_REPORT_LABEL` | Parent report copy | Parent diagnostic text for triangle area exists (`parent-diagnostic-explanations-he.js`) | Do not surface triangle area explanation below G5 | `utils/parent-report-language/parent-diagnostic-explanations-he.js`, `utils/parent-report-language/grade-aware-recommendation-templates.js` | No | **Yes — Track A** | Parents receive guidance for content child was not taught |
| **GEO-10** | geometry | 5 | `NEEDS_OWNER_DECISION` | Oracle row status | `math.g5.measurement.area_formulas.triangle_area` is `required_pending_pdf_parse`, confidence `medium` | Owner must decide: parse `kita5.pdf` before Track B, or accept medium-confidence for spine/book work | Oracle + source inventory | **Yes** — `kita5.pdf` | Decision required before Track B | Premature content addition if promoted without source |

### 3.2 Science

| ID | Subject | Grade | Flag | Layer | Current behavior | Required behavior | Files likely to change | Source verify first? | Allowed after owner approval? | Risk if not fixed |
|----|---------|-------|------|-------|------------------|-------------------|------------------------|----------------------|------------------------------|-------------------|
| **SCI-01** | science | 1–6 | `SOURCE_BLOCKER` | Oracle / marketing | Zero official oracle rows; product presents science as curriculum subject | Remove Ministry-alignment claim for Science; mark enrichment/unverified | Marketing copy, subject landing pages, any alignment badges (owner locates) | **Yes** — `science Curriculum2016.docx` parse | **Yes — Track A** (claim removal only) | False Ministry compliance across entire subject |
| **SCI-02** | science | 1–6 | `WRONG_GRADE_SCOPE` | Spine | 7 coarse topic skills span all grades without per-grade official grid | Cannot validate grade scope until DOCX parsed | `data/curriculum-spine/v1/skills.json`, `data/science-curriculum.js` | **Yes** | Track B after DOCX parse | Reports/assignments use wrong grade bands |
| **SCI-03** | science | 1–6 | `MISSING_REQUIRED_TOPIC` | All surfaces | 38 scaffold topics in product; 0 oracle required rows | Cannot classify missing vs overteaching until official grid exists | Oracle build scripts, diff tooling | **Yes** | Track B only | Unknown compliance gap magnitude |

### 3.3 Moledet / Geography

| ID | Subject | Grade | Flag | Layer | Current behavior | Required behavior | Files likely to change | Source verify first? | Allowed after owner approval? | Risk if not fixed |
|----|---------|-------|------|-------|------------------|-------------------|------------------------|----------------------|------------------------------|-------------------|
| **MOL-01** | moledet | 1 | `OVERTEACHING` | Student learning / spine | Full G1 moledet/geography curriculum active; oracle = `not_in_grade` | Mark G1 as enrichment-only; remove from Ministry-aligned paths | `data/moledet-geography-curriculum.js` consumers, `utils/moledet-geography-grade-topic-policy.js`, subject pages | No — oracle status definitive | **Yes — Track A** | Product claims Ministry curriculum where none exists |
| **MOL-02** | moledet/geography | 1–6 | `WRONG_GRADE_SCOPE` | Spine / product | 71 geography spine rows G1–6; oracle = moledet G2–4 + geography G5–6 | Scope product claims to official bands; G1 enrichment only | `data/curriculum-spine/v1/skills.json`, moledet runtime policy | Partial — G1 definitive; G2–6 need PDF subsection parse for full diff | Track A for G1; Track B for granularity | Misaligned grade bands in reports and topic pickers |
| **MOL-03** | moledet | 2–4 | `SOURCE_BLOCKER` | Oracle | Scope rows only; `homeland-curriculum.pdf` not parsed to subsections | Cannot assert topic-level compliance until PDF parsed | Oracle moledet script | **Yes** | Track B | Topic-level over/under-teaching unknown |
| **MOL-04** | geography | 5–6 | `SOURCE_BLOCKER` | Oracle | Scope rows only; `tohnit-geography-5-6.pdf` not parsed | Same as MOL-03 | Oracle moledet script | **Yes** | Track B | Same |

### 3.4 English

| ID | Subject | Grade | Flag | Layer | Current behavior | Required behavior | Files likely to change | Source verify first? | Allowed after owner approval? | Risk if not fixed |
|----|---------|-------|------|-------|------------------|-------------------|------------------------|----------------------|------------------------------|-------------------|
| **ENG-01** | english | 4–6 | `SOURCE_BLOCKER` | Oracle | 3 `source_blocker` rows; TXT marked `unknown_unverified` | Validate TXT against `english Curriculum2020.pdf` OR mark G4–6 unverified in alignment claims | `data/curriculum-oracle/v1/source-inventory.json`, oracle english script | **Yes** — owner TXT validation | Track A for claim suppression; Track B for promotion | Ministry claim on unverified curriculum |
| **ENG-02** | english | 4–6 | `NEEDS_OWNER_DECISION` | Product visibility | G4–6 English content visible and teachable | Owner decides: remain visible with "alignment unverified" label vs block from alignment surfaces | English subject pages, marketing | Depends on ENG-01 | After owner Q4 answered | User confusion or false compliance |

### 3.5 Sequence / ordering (cross-subject)

| ID | Subject | Grade | Flag | Layer | Current behavior | Required behavior | Files likely to change | Source verify first? | Allowed after owner approval? | Risk if not fixed |
|----|---------|-------|------|-------|------------------|-------------------|------------------------|----------------------|------------------------------|-------------------|
| **SEQ-01** | all | 1–6 | `OUT_OF_SEQUENCE` | Student topic cards / practice picker | Order follows generator/registry/file order, not oracle `sequence_index` | Sort by oracle sequence where available | Topic card renderers, practice picker components | No for gating; partial oracle sequence available | Track A for suppression; Track B for full sequence UI | Students encounter advanced topics before foundations |
| **SEQ-02** | geometry | 5 | `OUT_OF_SEQUENCE` | Learning book | Batches C/D order: parallelogram/trapezoid area before heights; no triangle area page | Reorder per oracle: rectangle area → triangle area → heights → parallelogram/trapezoid area | `lib/learning-book/geometry-g5-registry.js` | **Yes** for adding pages — Track B | Track B (after GEO-03) | Broken prerequisite chain in book navigation |
| **SEQ-03** | math | 1–6 | `OUT_OF_SEQUENCE` | Teacher reinforcement suggestions | No oracle-backed sequence in teacher report topic ordering | Reinforcement lists must respect `prerequisite_row_ids` | Teacher report components | No | Track A gate + Track B full fix | Wrong remediation order suggested |

---

## 4. Mandatory launch blocker summary

These issues **must** be addressed (at minimum via Track A) before any Ministry-alignment claim:

| Priority | IDs | Subject | Issue |
|----------|-----|---------|-------|
| P0 | GEO-01, GEO-06, GEO-07, GEO-08, GEO-09 | Geometry | Triangle area exposed and reported below G5 |
| P0 | SCI-01 | Science | Zero oracle rows; Ministry claim invalid |
| P0 | MOL-01 | Moledet | G1 presented as curriculum without official source |
| P0 | ENG-01 | English | G4–6 unverified; blocker rows only |
| P1 | GEO-04, GEO-05, SEQ-02 | Geometry | Book prerequisite chain broken at G5–G6 |
| P1 | SEQ-01, SEQ-03 | All | Topic ordering ignores oracle sequence |
| P2 | GEO-02, GEO-03 | Geometry | Missing teachable unit (Track B — needs source/owner decision) |

---

## 5. Fix order — Track A and Track B

### Track A — Immediate launch safety fixes (after owner approval)

**Purpose:** Reduce unsupported exposure and false Ministry-alignment claims. **Does not add curriculum content.**

**Prerequisite:** Owner selects launch posture (Section 8) before Track A begins.

| Step | Issue IDs | Action |
|------|-----------|--------|
| A1 | GEO-01 | Remove `"triangle"` from `TOPIC_SHAPES.area.g3` and `.g4` |
| A2 | GEO-06, GEO-08, GEO-09 | Gate `geo_area_triangle_formula` and diagnostic/parent copy below G5 |
| A3 | GEO-07 | Block teacher/school triangle area assignment below G5 |
| A4 | SCI-01 | Remove Ministry-alignment claim for Science; mark enrichment/unverified |
| A5 | MOL-01 | Remove Ministry-alignment claim for Moledet G1; mark enrichment-only |
| A6 | ENG-01 | Mark English G4–6 as `source_not_verified` in alignment claim context |
| A7 | PR-01/PR-02 (GEO-08, GEO-09) | Verify parent/diagnostic flows do not surface triangle area below G5 |

**Track A explicitly excludes:** adding `triangle_area` spine skill, adding G5 book page, reordering G5 book around new page, promoting oracle rows to `required`/`high`.

### Track B — Curriculum additions (require source confirmation or explicit owner decision)

**Prerequisite:** Track A complete. Applicable condition met per row.

| Item | Condition to proceed | Requires |
|------|---------------------|----------|
| Promote `triangle_area` oracle row to `required` | `kita5.pdf` parsed and anchored | Source parse |
| Add `geometry:kind:triangle_area` spine skill | Row promotion OR owner accepts `required_pending_pdf_parse` | Source parse OR owner decision (Q6) |
| Add G5 `triangle_area.md` book page | Spine skill + oracle row approved | Track B above |
| Reorder G5 book batches | Triangle area page exists | GEO-03 complete |
| Update G6 `prism_volume_triangle` chain | G5 page exists | GEO-03 complete |
| Promote all math/geometry to `confidence: high` | Each `kita{n}.pdf` parsed | Source parse per grade |
| Create official Science oracle rows | `science Curriculum2016.docx` parsed | Source parse |
| Validate English G4–6 | Owner validates TXT vs PDF | Owner verification |
| Full sequence UI (SEQ-01, SEQ-02, SEQ-03) | Oracle sequence complete for subject | Track B oracle work |

---

## 6. What can be fixed immediately vs requires source parsing

### Can fix after owner approval using existing oracle (Track A)

- Block triangle-area formula generator exposure below G5 (GEO-01)
- Suppress/gate `geo_area_triangle_formula` below G5 (GEO-06, GEO-08, GEO-09)
- Block teacher/school assignment below G5 (GEO-07)
- Stop Ministry-aligned claim for Science (SCI-01)
- Stop Ministry-aligned claim for Moledet G1 (MOL-01)
- Stop Ministry-aligned claim for English G4–6 until validated (ENG-01)
- Prevent reports/diagnostics from presenting unsupported topics below official grade

### Requires source parsing or explicit owner decision (Track B)

| Action | Blocker |
|--------|---------|
| Promote `triangle_area` to `required` / `high` | `kita5.pdf` not parsed |
| Add spine skill + book page for triangle area | Owner Q6 if proceeding on medium-confidence |
| Official Science alignment | `science Curriculum2016.docx` not parsed |
| English G4–6 promotion from `source_blocker` | TXT not validated against PDF |
| Math/geometry `high` confidence rows | All `kita1–6.pdf` unparsed |
| Moledet/geography topic-level compliance | Official PDFs not parsed to subsections |

---

## 7. QA gates required before launch

Each gate must be implemented as a standalone verify script (not wired to runtime until owner approves). Fail = launch blocker for Ministry-alignment claim.

| Gate ID | Name | Check | Fail condition |
|---------|------|-------|----------------|
| QA-01 | Oracle integrity | `ministry-matrix.draft.json` schema valid | Any row missing required fields |
| QA-02 | No internal scaffold in oracle | Scan matrix rows | Any `source_class: internal_scaffold` |
| QA-03 | No unsupported topic gate | Generator output vs oracle grade bands | Topic emitted below oracle minimum grade |
| QA-04 | Generator grade-band gate | `TOPIC_SHAPES` vs oracle | Shape/kind available below official grade (e.g. triangle area G3–4) |
| QA-05 | Book sequence gate | Registry page order vs `sequence_index` + `prerequisite_row_ids` | Prerequisite page appears after dependent page |
| QA-06 | Topic-picker sequence gate | UI sort key vs oracle | Alphabetical/file order when oracle sequence exists |
| QA-07 | Report-label oracle backing gate | Each diagnostic label maps to oracle row at student grade | Label surfaced without backing row |
| QA-08 | Teacher assignment oracle backing gate | Assignable topics vs oracle | Teacher can assign topic not in oracle for grade |
| QA-09 | Science blocker gate | Science Ministry claim surfaces | Any UI/copy claims Ministry alignment for Science |
| QA-10 | Moledet G1 Ministry-claim gate | G1 moledet alignment surfaces | Any claim of Ministry alignment for G1 moledet/geography |

---

## 8. Public launch claim rule

> **The site must not publicly claim "fully Ministry-aligned across grades 1–6" while the overall verdict is RED.**

### Permitted launch postures (owner must select one before Track A)

| Posture | Description | Ministry claim allowed? |
|---------|-------------|----------------------|
| **1. Launch without Ministry-alignment claim** | Product runs; no alignment badge or statement anywhere | **No** |
| **2. Launch with explicit subject/grade limitations** | Scoped claim only where oracle has `required` / medium+ rows AND Track A complete. **Must exclude:** Science, Moledet G1, English G4–6 | **Partial — scoped only** |
| **3. Delay launch** | Parse sources, complete Track B, re-run oracle, re-evaluate verdict | **No — until re-evaluated** |

No other posture is permitted.

---

## 9. Owner decision questions (required before implementation)

| # | Question | Blocks |
|---|----------|--------|
| Q1 | Which launch posture? (No claim / scoped claim / delay) | All Track A and Track B work |
| Q2 | May Science remain visible as enrichment before DOCX parse, or must it be hidden? | SCI-01 implementation detail |
| Q3 | May Moledet G1 remain as enrichment with visible disclaimer, or removed from alignment paths? | MOL-01 implementation detail |
| Q4 | May English G4–6 remain visible with "alignment unverified" label, or blocked from alignment surfaces? | ENG-02 |
| Q5 | Is `kita5.pdf` parse feasible before launch? | Unlocks Track B for triangle area |
| Q6 | Does owner accept `required_pending_pdf_parse` / medium-confidence as sufficient to add spine skill + book page before `kita5.pdf` parse? | GEO-02, GEO-03 without source parse |

---

## 10. Final no-change guarantee (this task)

This closure plan is **planning/reporting only**.

**Created/updated in this task:**

| File | Action |
|------|--------|
| `docs/curriculum/PRE_LAUNCH_CURRICULUM_COMPLIANCE_CLOSURE_PLAN.md` | **Created** |

**Not modified:**

- `data/curriculum-spine/v1/skills.json`
- Generators (`utils/geometry-constants.js`, `utils/geometry-question-generator.js`, etc.)
- Learning books and registries
- Reports and diagnostics
- UI and Hebrew product copy
- SQL
- QA/CI/npm scripts / `package.json`
- Oracle artifacts (read-only inputs)

No commit. No push. No deploy.

---

## 11. Related artifacts

| Artifact | Path |
|----------|------|
| Oracle matrix | `data/curriculum-oracle/v1/ministry-matrix.draft.json` |
| Source inventory | `data/curriculum-oracle/v1/source-inventory.json` |
| Science scaffold (NOT oracle) | `data/curriculum-oracle/v1/internal-scaffold.science.json` |
| Moledet scaffold (NOT oracle) | `data/curriculum-oracle/v1/internal-scaffold.moledet-geography.json` |
| Oracle build plan | `docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md` |
| Prior compliance audit | `docs/curriculum/CURRICULUM_COMPLIANCE_AUDIT_GRADES_1_6.md` |

---

*End of pre-launch curriculum compliance closure plan.*

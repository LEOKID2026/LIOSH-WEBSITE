---
name: Pre-Launch Closure Plan
overview: Create docs/curriculum/PRE_LAUNCH_CURRICULUM_COMPLIANCE_CLOSURE_PLAN.md — a comprehensive launch-readiness closure document with a definitive launch verdict, per-subject blocker classification, exact remediation map, fix ordering, and QA gate definitions. No product file is modified.
todos:
  - id: closure-doc
    content: Write docs/curriculum/PRE_LAUNCH_CURRICULUM_COMPLIANCE_CLOSURE_PLAN.md with launch verdict RED, per-subject classification, full remediation map, fix order, QA gates, and owner decision questions
    status: completed
isProject: false
---

# Pre-Launch Curriculum Compliance Closure Plan

## What will be created

One new file: [`docs/curriculum/PRE_LAUNCH_CURRICULUM_COMPLIANCE_CLOSURE_PLAN.md`](docs/curriculum/PRE_LAUNCH_CURRICULUM_COMPLIANCE_CLOSURE_PLAN.md)

No existing files modified. No runtime, spine, generator, book, report, SQL, or QA file touched.

## Git status

The closure document will include the exact raw output of `git status --short`, as a fenced code block:

```
 M .cursor/plans/ministry_oracle_build_plan_63c007bf.plan.md
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

**Interpretation:** All changes are untracked oracle data files, standalone build scripts, new docs, and a plan file modification. No runtime file, no `skills.json`, no generator, no book, no report, no QA script, no `package.json` appears. This phase is **clean** — no product code was touched.

## Launch verdict the document will state

**RED** — cannot launch with a Ministry-alignment claim across all subjects and grades.

Rationale:
- 0 oracle rows have `confidence: high` (no primary PDF parsed)
- Science has 0 official oracle rows
- Triangle area is taught from G3 with no spine skill, no book page, and diagnostics surfacing the label without a teach path
- Moledet G1 is not Ministry-backed but runs as full product content
- English G4–6 is unverified

## Per-subject classification the document will include

| Subject | Grades | Classification | Reason |
|---------|--------|----------------|--------|
| Math | 1–6 | `launch_safe_with_limitation` | `medium` confidence; kita PDFs unparsed; no `high` rows yet |
| Geometry | 1–4 | `launch_safe_with_limitation` | Provisional medium-confidence oracle rows only; primary grade PDFs not parsed. Must fix area-formula overexposure before any Ministry-alignment claim. |
| Geometry | 5–6 | `blocked` | Triangle area overteaching, missing spine/book path, prerequisite chain broken |
| Hebrew | 1–6 | `launch_safe_with_limitation` | `derived_alignment` source; no per-grade TXT splits |
| English | 1–3 | `launch_safe_with_limitation` | Validated TXT; medium confidence |
| English | 4–6 | `source_not_verified` | `source_blocker` rows; unverified TXT |
| Science | 1–6 | `blocked` | 0 official oracle rows; DOCX not parsed |
| Moledet | 1 | `enrichment_only` | `not_in_grade` / `no_verified_source`; must not claim Ministry-aligned |
| Moledet | 2–4 | `launch_safe_with_limitation` | Scope rows only; PDF not parsed to subsections |
| Geography | 5–6 | `launch_safe_with_limitation` | Scope rows only; PDF not parsed |

## Remediation map — issues the document will enumerate

**Geometry / Triangle area (launch blockers):**

| Issue ID | Flag | Current | Required | Files |
|----------|------|---------|----------|-------|
| GEO-01 | `OVERTEACHING` | `TOPIC_SHAPES.area.g3/g4` includes `"triangle"` | Remove triangle from area shapes for G3, G4 | `utils/geometry-constants.js` |
| GEO-02 | `MISSING_REQUIRED_TOPIC` | No spine skill `geometry:kind:triangle_area` | Add skill at G5+ only | `data/curriculum-spine/v1/skills.json` |
| GEO-03 | `MISSING_REQUIRED_TOPIC` | No G5 book page `triangle_area.md` | Add page before `heights_triangle` batch | `lib/learning-book/geometry-g5-registry.js` |
| GEO-04 | `OUT_OF_SEQUENCE` | `heights_triangle` in batch D with no prior triangle area page | Must follow triangle area page | `lib/learning-book/geometry-g5-registry.js` |
| GEO-05 | `HIDDEN_PREREQUISITE` | G6 `prism_volume_triangle.md` assumes formula known | Needs G5 triangle area page as prerequisite | `docs/learning-book/geometry/g6/drafts/prism_volume_triangle.md` |
| GEO-06 | `UNSUPPORTED_REPORT_LABEL` | `geo_area_triangle_formula` in classroom labels | Gate to G5+ only; suppress below G5 | `lib/classroom-activities/classroom-skill-labels-he.js` |
| GEO-07 | `UNSUPPORTED_TEACHER_ASSIGNMENT` | Teachers can assign triangle area at G3–4 | Block assignment below G5 | classroom activity creation flow |
| GEO-08 | `UNSUPPORTED_REPORT_LABEL` | `triangle_area` in diagnostic taxonomy candidate order | Gate to G5+ or suppress below official grade | `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js` |

**Science:**

| Issue ID | Flag | Current | Required |
|----------|------|---------|----------|
| SCI-01 | `SOURCE_BLOCKER` | 0 oracle rows | Cannot claim Ministry-aligned; mark as enrichment or unverified |
| SCI-02 | `WRONG_GRADE_SCOPE` | 7 coarse spine rows span all grades | Cannot be validated until DOCX parsed |

**Moledet / Geography:**

| Issue ID | Flag | Current | Required |
|----------|------|---------|----------|
| MOL-01 | `OVERTEACHING` | G1 runs full moledet content | Must label enrichment-only; disable Ministry-aligned claim |
| MOL-02 | `WRONG_GRADE_SCOPE` | Product spans G1–6; oracle = G2–4 moledet + G5–6 geography | Scope must match official bands |

**English:**

| Issue ID | Flag | Current | Required |
|----------|------|---------|----------|
| ENG-01 | `SOURCE_BLOCKER` | G4–6 TXT unverified | Validate TXT or mark G4–6 as `source_not_verified` in UI |

**Sequence / ordering:**

| Issue ID | Flag | Current | Required |
|----------|------|---------|----------|
| SEQ-01 | `OUT_OF_SEQUENCE` | Topic pickers / cards use generator/file order | Must use oracle `sequence_index` |
| SEQ-02 | `OUT_OF_SEQUENCE` | G5 book batch ordering violates area→heights→volume chain | Reorder batches per oracle |

## Fix order and tracks

The document will organize all fixes into two distinct tracks with a strict ordering within each.

### Track A — Immediate launch safety fixes (after owner approval, no source parse required)

These reduce unsupported exposure and false Ministry-alignment claims. They do not add curriculum content — they only remove or gate incorrect exposure. Each can proceed as soon as owner approves, using the existing oracle evidence.

Ordered within Track A (do not reorder — later steps depend on earlier ones):

1. **GEO-01** — Remove `"triangle"` from `TOPIC_SHAPES.area.g3` and `TOPIC_SHAPES.area.g4` in `utils/geometry-constants.js`. This stops generator-driven triangle area formula exposure below G5.
2. **GEO-06 / GEO-08** — Gate `geo_area_triangle_formula` label and `triangle_area` diagnostic taxonomy entry to G5+ only. Suppress below G5 in `lib/classroom-activities/classroom-skill-labels-he.js` and `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`.
3. **GEO-07** — Block teacher/school assignment of triangle area below G5 in the classroom activity creation flow.
4. **SCI-01** — Remove or suppress the Ministry-aligned claim for Science across all grades. Mark Science content as enrichment or unverified until DOCX is parsed.
5. **MOL-01** — Remove the Ministry-aligned claim for Moledet grade 1. Mark G1 Moledet/geography content as enrichment-only.
6. **ENG-01 (partial)** — Mark English G4–6 as `source_not_verified` in any Ministry-alignment claim context until TXT is validated. Content may remain visible with an appropriate label (owner decision required — see owner questions).
7. **PR-01 / PR-02** — Ensure parent reports and diagnostic flows do not surface triangle area labels below G5 without a confirmed teach path.

Track A does **not** include: adding the `triangle_area` book page, adding a spine skill, or reordering the G5 book around a page that does not exist yet. Those are Track B.

### Track B — Curriculum additions and content changes (require source confirmation or explicit owner decision)

These add curriculum content or restructure the learning path. Each item in Track B requires either a source parse to promote the oracle row, or explicit owner acceptance of medium-confidence evidence.

| Item | Requires | Condition to proceed |
|------|----------|---------------------|
| Add `geometry:kind:triangle_area` spine skill at G5+ | Oracle row promotion | `kita5.pdf` parsed, or owner explicitly accepts `required_pending_pdf_parse` |
| Add G5 `triangle_area.md` learning-book page | Spine skill + oracle row | Track B item above approved first |
| Reorder G5 book batches around the new triangle area page | New page exists | Triangle area page added first |
| Update G6 `prism_volume_triangle` prerequisite chain | G5 page exists | G5 triangle area page added first |
| Promote `triangle_area` oracle row from `required_pending_pdf_parse` to `required` | `kita5.pdf` parse | Source parse required |
| Promote all math/geometry rows to `confidence: high` | Per-grade kita PDF parse | Each grade PDF must be parsed separately |
| Create official Science oracle rows | `science Curriculum2016.docx` parse | Source parse required |
| Validate English G4–6 and promote from `source_blocker` | TXT validation against PDF | Owner TXT verification required |

Track B items must not be started until the applicable condition is met. Track A must be completed before Track B begins.

## QA gates the document will define

10 gates enumerated with exact oracle/file check for each:
1. Oracle integrity gate
2. No internal scaffold in oracle gate
3. No unsupported topic gate
4. Generator grade-band gate (TOPIC_SHAPES vs oracle grade)
5. Book sequence gate (registry order vs sequence_index)
6. Topic-picker sequence gate
7. Report-label oracle backing gate
8. Teacher assignment oracle backing gate
9. Science blocker gate
10. Moledet G1 Ministry-claim gate

## Public launch claim rule

The closure document will state this as a hard rule, not a recommendation:

> **The site must not publicly claim "fully Ministry-aligned across grades 1–6" while the overall verdict is RED.**

Three permitted launch postures (owner must choose one):

1. **Launch without a Ministry-alignment claim** — product runs as-is; no alignment badge or statement is displayed anywhere.
2. **Launch with explicit subject/grade limitations** — alignment claim is scoped to specific subjects and grades where the oracle has at minimum `required` / confidence `medium` rows and Track A safety fixes are complete. Science, Moledet G1, and English G4–6 must be excluded from any alignment claim in this scenario.
3. **Delay launch until blockers are resolved** — parse remaining sources, complete Track B, re-run oracle, and re-evaluate verdict before any public alignment claim.

No other posture is permitted. The closure document will require owner to select one of these three before implementation of any Track A or Track B item begins.

## Owner decision questions the document will enumerate

1. Which launch posture does the owner select? (No claim / scoped claim / delay)
2. May Science be shown as enrichment before DOCX parse, or must it be hidden entirely?
3. May Moledet G1 remain as enrichment with a visible disclaimer, or must it be removed from Ministry-aligned paths?
4. May English G4–6 remain visible with an explicit "alignment unverified" label, or must it be blocked from Ministry-aligned claim surfaces?
5. Is the `kita5.pdf` parse feasible before launch? If yes, it unlocks Track B GEO-02 and GEO-03. If no, triangle area remains at `required_pending_pdf_parse` and must stay gated to G5+ via Track A only.
6. Does the owner accept `required_pending_pdf_parse` / medium-confidence as sufficient evidence to proceed with Track B (add spine skill, book page) before `kita5.pdf` is parsed?

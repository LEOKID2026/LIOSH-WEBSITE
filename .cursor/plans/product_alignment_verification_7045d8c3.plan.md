---
name: Product Alignment Verification
overview: Create two standalone verification scripts that inspect all product surfaces against the oracle and write product-alignment-findings.json and PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md. No product files are modified.
todos:
  - id: verify-script
    content: Write scripts/verify-product-alignment.mjs — read oracle + all product surfaces, emit data/curriculum-oracle/v1/product-alignment-findings.json
    status: completed
  - id: report-script
    content: Write scripts/generate-product-alignment-report.mjs — read findings JSON, write docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md with all 9 required sections
    status: completed
  - id: run-verify
    content: Run both scripts and confirm both output files are written correctly
    status: completed
isProject: false
---

# Product Alignment Verification

## What will be created

Two new files only:
- [`data/curriculum-oracle/v1/product-alignment-findings.json`](data/curriculum-oracle/v1/product-alignment-findings.json)
- [`docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md`](docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md)

Two standalone scripts (write-once, not wired to npm/CI):
- `scripts/verify-product-alignment.mjs` — generates the JSON findings
- `scripts/generate-product-alignment-report.mjs` — reads the JSON, writes the MD

No product files are modified. No SQL, no commit, no push.

## Verified facts from codebase exploration

### Geometry / Math (confirmed)

- `TOPIC_SHAPES.area.g3 = ["square","rectangle","triangle"]` and `.g4 = [...,"triangle"]` — generator grade binding: `triangle_area` spans **G3–G6** (`scripts/curriculum-spine-grade-bindings.mjs` switch case `"triangle_area"`).
- Oracle: `math.g5.measurement.area_formulas.triangle_area` is `required_pending_pdf_parse` at **G5 only**.
- **`geometry:kind:triangle_area` absent from `skills.json`** (38 geometry skills confirmed, none named `triangle_area`).
- G5 book batches confirmed: batch C = `parallelogram_area`, `trapezoid_area`; batch D = `heights_triangle`, `heights_parallelogram`, `heights_trapezoid` — **no `triangle_area` page at all**.
- G6 book includes `prism_volume_triangle` (depends on untaught formula).
- `rectangle_area` is in `geometry-diagnostic-metadata-bridge.js` → `geo_rect_area_plan`, but has **no spine skill and no grade binding** (`null` grade span in bindings).
- `symmetry` spine grade is 4–4, but `GRADES.g6.topics` includes `symmetry` → **inconsistency**.
- Diagnostic taxonomy G-08 indicator string `"triangle_area"` → routes any grade's area/triangle wrong answers to G-08 bucket, which triggers parent recommendations regardless of student grade.

### Science (confirmed)

- Oracle: **0 rows**. Spine: **7 skills** spanning G1–6 (or G1–3 for plants).
- Parent report taxonomy covers S-01–S-08 (all 8 approved); grade-aware recommendations template **missing S-05, S-06, S-08**.
- Teacher/school report topic→taxonomy bridge maps 7 topics; no buckets for units/graphs/evidence (S-05/06/08).

### Moledet / Geography (confirmed)

- Spine: **71 skills, subject `"geography"`**, all grades 1–6 including 11 G1 skills.
- Oracle G1: single `not_in_grade` row, `no_verified_source`.
- `data/moledet-geography-curriculum.js` `MOLEDET_GEOGRAPHY_GRADES.g1.topics` = same 6 topics as all grades — full product content running with no official source.
- No learning-book registries in `lib/learning-book/` for moledet — only draft pages in `docs/`.
- `curriculum-spine-grade-bindings.mjs`: **no moledet bindings** (math/geo only).
- Subject ID inconsistency: parent report templates use `"moledet-geography"` (hyphen); teacher/school UI uses `"moledet_geography"` (underscore).

### English (confirmed)

- G1 topics: `["vocabulary"]` only; G2: 3 topics; G3–G6: 6 topics.
- Oracle G1–3: `required`/`medium`. G4–6: 3 `source_blocker` rows.
- 81 spine skills — no grade-blocking in product for G4–6 content.

### Hebrew (confirmed)

- 135 spine skills. Only G1 has a learning-book registry.
- Oracle: `derived_alignment`, all 41 rows at `medium` confidence.

## Script design

### `scripts/verify-product-alignment.mjs`

Reads (read-only):
- `data/curriculum-oracle/v1/ministry-matrix.draft.json`
- `data/curriculum-oracle/v1/source-inventory.json`
- `data/curriculum-oracle/v1/internal-scaffold.science.json`
- `data/curriculum-oracle/v1/internal-scaffold.moledet-geography.json`
- `data/curriculum-spine/v1/skills.json`
- `utils/geometry-constants.js` (via dynamic import for `TOPIC_SHAPES`, `GRADES`)
- `scripts/curriculum-spine-grade-bindings.mjs` (via dynamic import for `geometryKindGradeSpan`)
- `lib/learning-book/geometry-g5-registry.js` and `geometry-g6-registry.js`
- `lib/classroom-activities/classroom-skill-labels-he.js`
- `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`
- `utils/geometry-diagnostic-metadata-bridge.js`
- `data/moledet-geography-curriculum.js`

Checks executed (with finding IDs):

**GEO-01:** For each grade G1–G6, check if `TOPIC_SHAPES.area[gk]` includes `"triangle"`. Compare to oracle: triangle area `required` grade = 5 only. Emit `OVERTEACHING` for G3, G4 (and G2 if present).

**GEO-02:** Check `skills.json` for any entry matching `triangle_area`. Not found → `MISSING_REQUIRED_TOPIC` at G5.

**GEO-03:** Check `geometry-g5-registry.js` `GEOMETRY_G5_BOOK_BATCHES` for page `triangle_area`. Absent → `MISSING_REQUIRED_TOPIC`.

**GEO-04:** Check `heights_triangle` page position vs any area formula page position in G5 registry. Heights before area → `OUT_OF_SEQUENCE`.

**GEO-05:** Check `geometry-g6-registry.js` for `prism_volume_triangle`. Present without G5 `triangle_area` page → `HIDDEN_PREREQUISITE`.

**GEO-06:** Check `classroom-skill-labels-he.js` for `geo_area_triangle_formula` key. Present with no grade gate in the file → `UNSUPPORTED_REPORT_LABEL`.

**GEO-07:** Check diagnostic bridge `BY_KIND.triangle_area` → confirms `diagnosticSkillId: geo_area_triangle_formula` without grade gate → `UNSUPPORTED_TEACHER_ASSIGNMENT` / `UNSUPPORTED_REPORT_LABEL`.

**GEO-08:** Check `geometry-taxonomy-candidate-order.js` G08 indicators for `"triangle_area"` string → routes all grades to area taxonomy regardless of grade → `UNSUPPORTED_REPORT_LABEL`.

**GEO-09:** `rectangle_area` in diagnostic bridge (`geo_rect_area_plan`) but absent from spine and grade bindings → `MISSING_REQUIRED_TOPIC` / `NEEDS_OWNER_DECISION`.

**GEO-10:** `symmetry` spine G4–4 but `GRADES.g6.topics` includes `symmetry` → `WRONG_GRADE_SCOPE`.

**SCI-01:** Oracle science row count = 0. Spine science row count = 7. → `SOURCE_BLOCKER` for all G1–6.

**SCI-02:** Science spine `plants` maxGrade = 3 but `SCIENCE_GRADES.g3.topics` doesn't include plants while g1/g2 do — verify grade span against scaffold → `WRONG_GRADE_SCOPE`.

**SCI-03:** Grade-aware recommendation template missing S-05, S-06, S-08 entries → `UNSUPPORTED_REPORT_LABEL` for those taxonomy IDs in science.

**MOL-01:** `skills.json` has 11 G1 geography skills. Oracle G1 = `not_in_grade`. → `OVERTEACHING`.

**MOL-02:** Product `MOLEDET_GEOGRAPHY_GRADES.g1.topics` = 6 topics. Oracle has only one `not_in_grade` status row for G1 → `WRONG_GRADE_SCOPE`.

**MOL-03:** Spine uses `subject: "geography"` for all grades including moledet-aligned G2–4; oracle uses `subject: "moledet"` for G2–4 and `subject: "geography"` for G5–6 → `NEEDS_OWNER_DECISION` (subject taxonomy mismatch).

**MOL-04:** `"moledet-geography"` vs `"moledet_geography"` subject ID inconsistency across reporting surfaces → `NEEDS_OWNER_DECISION`.

**ENG-01:** For G4–6, oracle status = `source_blocker`. Spine has English skills including G4–6. No product-side gate → `SOURCE_BLOCKER`.

**HEB-01:** Only G1 has a learning-book registry. Oracle has Hebrew rows for G2–6. → `MISSING_REQUIRED_TOPIC` (book pages for G2–6 absent; INFO severity since subject has derived alignment).

**SEQ-01:** G5 book page order: `parallelogram_area` → `trapezoid_area` (batch C) before `heights_triangle` (batch D). Oracle sequence requires heights before area of parallelogram/trapezoid. → `OUT_OF_SEQUENCE`.

**SEQ-02:** Overall check — no book registries use oracle `sequence_index` field. → `OUT_OF_SEQUENCE` (INFO-level for all subjects without sequence enforcement).

Each finding object includes all required fields from the plan: `finding_id`, `subject`, `grade`, `topic`, `product_surface`, `file_path`, `current_behavior`, `oracle_status`, `evidence_from_code`, `evidence_from_oracle`, `classification`, `severity`, `recommended_action`, `can_implement_immediately`, `source_verification_required`.

Output: `data/curriculum-oracle/v1/product-alignment-findings.json`

### `scripts/generate-product-alignment-report.mjs`

Reads `product-alignment-findings.json` and writes `docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md` with:
1. Executive summary + oracle snapshot stats
2. Subject × grade safety table
3. Findings by severity (P0/P1/P2/INFO)
4. Findings by product surface
5. Findings by subject
6. Immediate safety fixes (Track A)
7. Fixes requiring source verification (Track B)
8. Owner decision questions
9. Files likely needing changes

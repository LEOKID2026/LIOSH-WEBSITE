# Product Alignment Findings — Grades 1–6

**Generated:** 2026-06-02T18:55:55.759Z  
**Generator:** `scripts/verify-product-alignment.mjs`  
**Findings source:** `data/curriculum-oracle/v1/product-alignment-findings.json`

---

## 1. Executive summary

This report compares live product surfaces against `data/curriculum-oracle/v1/ministry-matrix.draft.json` (124 official oracle rows; **0** at `confidence: high`). No product files were modified.

| Metric | Value |
|--------|-------|
| Total findings | 30 |
| P0 | 16 |
| P1 | 8 |
| P2 | 4 |
| INFO | 2 |
| Oracle row count | 124 |
| Oracle blockers | 38 |
| Science oracle rows | 0 |
| Hebrew oracle rows | 41 |
| English oracle rows | 43 |
| Geometry oracle rows | 16 |
| Moledet oracle rows | 4 |
| Geography oracle rows | 2 |

**Launch verdict:** **RED** — P0 findings in geometry (overteaching, unsupported diagnostics), science (zero oracle rows), moledet G1 (overteaching), and English G4–6 (`source_blocker`) block a claim of full Ministry alignment across grades 1–6.

**Highest-risk clusters:**
1. **Triangle area** — generator overteaches G3–G4; G5 book page and spine skill missing; diagnostics/labels ungated.
2. **Science** — product runs 7 spine skills with no official oracle; parent templates missing S-05/S-06/S-08.
3. **Moledet G1** — 11 geography spine skills and 6 product topics vs oracle `not_in_grade`.
4. **English G4–6** — oracle `source_blocker` only; 81 spine skills with no grade gate.

---

## 2. Subject × grade safety table

Legend: **RED** = P0 finding for grade; **YELLOW** = P1 only; **GREEN** = no P0/P1 for grade.

| Subject | G1 | G2 | G3 | G4 | G5 | G6 | Row |
|---------|----|----|----|----|----|----|-----|
| geometry | RED | RED | RED | RED | RED | RED | RED |
| science | RED | RED | RED | RED | RED | RED | RED |
| moledet-geography | RED | GREEN | GREEN | GREEN | GREEN | GREEN | RED |
| english | GREEN | GREEN | GREEN | RED | RED | RED | RED |
| hebrew | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |

---

## 3. Findings by severity

### P0 (16)

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-01-G3 | geometry | 3 | OVERTEACHING | P0 | question_generator |
| GEO-01-G4 | geometry | 4 | OVERTEACHING | P0 | question_generator |
| GEO-06 | geometry | — | UNSUPPORTED_REPORT_LABEL | P0 | teacher_classroom_labels |
| GEO-07 | geometry | — | UNSUPPORTED_TEACHER_ASSIGNMENT | P0 | diagnostic_metadata_bridge |
| GEO-08 | geometry | — | UNSUPPORTED_REPORT_LABEL | P0 | diagnostic_taxonomy_routing |
| SCI-01-G1 | science | 1 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G2 | science | 2 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G3 | science | 3 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G4 | science | 4 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G5 | science | 5 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G6 | science | 6 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| MOL-01 | moledet-geography | 1 | OVERTEACHING | P0 | curriculum_spine |
| MOL-02 | moledet-geography | 1 | WRONG_GRADE_SCOPE | P0 | student_topic_selection |
| ENG-01-G4 | english | 4 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| ENG-01-G5 | english | 5 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| ENG-01-G6 | english | 6 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |


### P1 (8)

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-02 | geometry | 5 | MISSING_REQUIRED_TOPIC | P1 | curriculum_spine |
| GEO-03 | geometry | 5 | MISSING_REQUIRED_TOPIC | P1 | learning_book |
| GEO-04 | geometry | 5 | OUT_OF_SEQUENCE | P1 | learning_book |
| GEO-05 | geometry | 6 | HIDDEN_PREREQUISITE | P1 | learning_book |
| SCI-03-S-05 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |
| SCI-03-S-06 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |
| SCI-03-S-08 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |
| SEQ-01 | geometry | 5 | OUT_OF_SEQUENCE | P1 | learning_book |


### P2 (4)

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-09 | geometry | — | NEEDS_OWNER_DECISION | P2 | diagnostic_metadata_bridge |
| GEO-10 | geometry | 6 | WRONG_GRADE_SCOPE | P2 | question_generator |
| MOL-03 | moledet-geography | — | NEEDS_OWNER_DECISION | P2 | curriculum_spine |
| MOL-04 | moledet-geography | — | NEEDS_OWNER_DECISION | P2 | reporting_and_runtime |


### INFO (2)

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| HEB-01 | hebrew | — | MISSING_REQUIRED_TOPIC | INFO | learning_book |
| SEQ-02 | all | — | OUT_OF_SEQUENCE | INFO | learning_book |


---

## 4. Findings by product surface

### curriculum_spine

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| MOL-01 | moledet-geography | 1 | OVERTEACHING | P0 | curriculum_spine |
| GEO-02 | geometry | 5 | MISSING_REQUIRED_TOPIC | P1 | curriculum_spine |
| MOL-03 | moledet-geography | — | NEEDS_OWNER_DECISION | P2 | curriculum_spine |

### curriculum_spine_and_runtime

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| SCI-01-G1 | science | 1 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G2 | science | 2 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G3 | science | 3 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G4 | science | 4 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G5 | science | 5 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| SCI-01-G6 | science | 6 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| ENG-01-G4 | english | 4 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| ENG-01-G5 | english | 5 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |
| ENG-01-G6 | english | 6 | SOURCE_BLOCKER | P0 | curriculum_spine_and_runtime |

### diagnostic_metadata_bridge

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-07 | geometry | — | UNSUPPORTED_TEACHER_ASSIGNMENT | P0 | diagnostic_metadata_bridge |
| GEO-09 | geometry | — | NEEDS_OWNER_DECISION | P2 | diagnostic_metadata_bridge |

### diagnostic_taxonomy_routing

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-08 | geometry | — | UNSUPPORTED_REPORT_LABEL | P0 | diagnostic_taxonomy_routing |

### learning_book

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-03 | geometry | 5 | MISSING_REQUIRED_TOPIC | P1 | learning_book |
| GEO-04 | geometry | 5 | OUT_OF_SEQUENCE | P1 | learning_book |
| GEO-05 | geometry | 6 | HIDDEN_PREREQUISITE | P1 | learning_book |
| SEQ-01 | geometry | 5 | OUT_OF_SEQUENCE | P1 | learning_book |
| HEB-01 | hebrew | — | MISSING_REQUIRED_TOPIC | INFO | learning_book |
| SEQ-02 | all | — | OUT_OF_SEQUENCE | INFO | learning_book |

### parent_report_grade_aware_templates

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| SCI-03-S-05 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |
| SCI-03-S-06 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |
| SCI-03-S-08 | science | — | UNSUPPORTED_REPORT_LABEL | P1 | parent_report_grade_aware_templates |

### question_generator

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-01-G3 | geometry | 3 | OVERTEACHING | P0 | question_generator |
| GEO-01-G4 | geometry | 4 | OVERTEACHING | P0 | question_generator |
| GEO-10 | geometry | 6 | WRONG_GRADE_SCOPE | P2 | question_generator |

### reporting_and_runtime

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| MOL-04 | moledet-geography | — | NEEDS_OWNER_DECISION | P2 | reporting_and_runtime |

### student_topic_selection

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| MOL-02 | moledet-geography | 1 | WRONG_GRADE_SCOPE | P0 | student_topic_selection |

### teacher_classroom_labels

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| GEO-06 | geometry | — | UNSUPPORTED_REPORT_LABEL | P0 | teacher_classroom_labels |


---

## 5. Findings by subject

### geometry (12)

#### GEO-01-G3 — OVERTEACHING (P0)

- **Subject / grade / topic:** geometry / 3 / triangle_area
- **Surface:** question_generator
- **File:** `utils/geometry-constants.js`
- **Current behavior:** TOPIC_SHAPES.area.g3 includes "triangle"; geometryKindGradeSpan("triangle_area")={"minGrade":3,"maxGrade":6} enables triangle area questions from grade 3.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** TOPIC_SHAPES.area.g3=["square","rectangle","triangle"]; scripts/curriculum-spine-grade-bindings.mjs triangle_area span {"minGrade":3,"maxGrade":6}
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area grade=5 status=required_pending_pdf_parse
- **Recommended action:** Gate triangle area generator and practice to grade 5+ until oracle confirms earlier grades.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-01-G4 — OVERTEACHING (P0)

- **Subject / grade / topic:** geometry / 4 / triangle_area
- **Surface:** question_generator
- **File:** `utils/geometry-constants.js`
- **Current behavior:** TOPIC_SHAPES.area.g4 includes "triangle"; geometryKindGradeSpan("triangle_area")={"minGrade":3,"maxGrade":6} enables triangle area questions from grade 4.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** TOPIC_SHAPES.area.g4=["square","rectangle","triangle"]; scripts/curriculum-spine-grade-bindings.mjs triangle_area span {"minGrade":3,"maxGrade":6}
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area grade=5 status=required_pending_pdf_parse
- **Recommended action:** Gate triangle area generator and practice to grade 5+ until oracle confirms earlier grades.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-02 — MISSING_REQUIRED_TOPIC (P1)

- **Subject / grade / topic:** geometry / 5 / triangle_area
- **Surface:** curriculum_spine
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** No geometry:kind:triangle_area row among geometry spine skills.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** grep geometry:kind:triangle_area in skills.json → 0 matches
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area
- **Recommended action:** Add verified spine skill after oracle PDF parse confirms formula scope.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### GEO-03 — MISSING_REQUIRED_TOPIC (P1)

- **Subject / grade / topic:** geometry / 5 / triangle_area
- **Surface:** learning_book
- **File:** `lib/learning-book/geometry-g5-registry.js`
- **Current behavior:** GEOMETRY_G5_PAGE_ORDER=["parallel_perpendicular","quadrilaterals","triangle_angles","square_perimeter","triangle_perimeter","square_area","parallelogram_area","trapezoid_area","heights_triangle","heights_parallelogram","heights_trapezoid","diagonal_square","diagonal_rectangle","diagonal_parallelogram","solids","rectangular_prism_volume","tiling"] — no triangle_area page.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** GEOMETRY_G5_BOOK_BATCHES batch b has square_area only; no triangle_area batch entry
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area sequence_index=2
- **Recommended action:** Add G5 learning-book page triangle_area after source verification.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### GEO-04 — OUT_OF_SEQUENCE (P1)

- **Subject / grade / topic:** geometry / 5 / heights_triangle
- **Surface:** learning_book
- **File:** `lib/learning-book/geometry-g5-registry.js`
- **Current behavior:** heights_triangle at book index 8 but triangle_area page absent; oracle requires triangle_area before heights (prerequisite_row_ids on math.g5.geometry.heights).
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** heights_triangle index=8; triangle_area index=-1
- **Oracle evidence:** math.g5.geometry.heights prerequisite_row_ids includes math.g5.measurement.area_formulas.triangle_area
- **Recommended action:** Add triangle_area page before heights_triangle batch or reorder after page is authored.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### GEO-05 — HIDDEN_PREREQUISITE (P1)

- **Subject / grade / topic:** geometry / 6 / prism_volume_triangle
- **Surface:** learning_book
- **File:** `lib/learning-book/geometry-g6-registry.js`
- **Current behavior:** G6 book includes prism_volume_triangle; G5 book lacks triangle_area prerequisite page.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** geometry-g6-registry batch e pages include prism_volume_triangle; G5 has no triangle_area
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area
- **Recommended action:** Gate G6 prism_volume_triangle until G5 triangle area is taught and registered.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-06 — UNSUPPORTED_REPORT_LABEL (P0)

- **Subject / grade / topic:** geometry / all / triangle_area
- **Surface:** teacher_classroom_labels
- **File:** `lib/classroom-activities/classroom-skill-labels-he.js`
- **Current behavior:** geo_area_triangle_formula label present with no grade gate in file.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** geo_area_triangle_formula: "שטח משולש"
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area grade=5
- **Recommended action:** Suppress or grade-gate geo_area_triangle_formula for grades below G5.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-07 — UNSUPPORTED_TEACHER_ASSIGNMENT (P0)

- **Subject / grade / topic:** geometry / all / triangle_area
- **Surface:** diagnostic_metadata_bridge
- **File:** `utils/geometry-diagnostic-metadata-bridge.js`
- **Current behavior:** BY_KIND.triangle_area maps to diagnosticSkillId geo_area_triangle_formula without grade gate.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** BY_KIND.triangle_area.diagnosticSkillId = geo_area_triangle_formula
- **Oracle evidence:** math.g5.measurement.area_formulas.triangle_area
- **Recommended action:** Add grade-aware guard in diagnostic bridge for triangle_area kinds below G5.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-08 — UNSUPPORTED_REPORT_LABEL (P0)

- **Subject / grade / topic:** geometry / all / triangle_area
- **Surface:** diagnostic_taxonomy_routing
- **File:** `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`
- **Current behavior:** G08_INDICATORS includes "triangle_area"; routes area/triangle wrong answers to G-08 bucket regardless of student grade.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** G08_INDICATORS=["advanced_area","triangle_area","area_formula"]
- **Oracle evidence:** G-08 advanced area taxonomy; triangle_area oracle grade 5
- **Recommended action:** Grade-gate G-08 triangle_area indicator routing to G5+ only.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### GEO-09 — NEEDS_OWNER_DECISION (P2)

- **Subject / grade / topic:** geometry / all / rectangle_area
- **Surface:** diagnostic_metadata_bridge
- **File:** `utils/geometry-diagnostic-metadata-bridge.js`
- **Current behavior:** rectangle_area in BY_KIND → geo_rect_area_plan; no matching spine skill; geometryKindGradeSpan returns null.
- **Oracle status:** derived_from_product
- **Code evidence:** BY_KIND.rectangle_area; no geometry:kind:rectangle_area in skills.json; grade span null
- **Oracle evidence:** Rectangle area covered under multiple oracle rows; spine mirror incomplete
- **Recommended action:** Owner decision: register rectangle_area spine skill or remove diagnostic bridge entry.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### GEO-10 — WRONG_GRADE_SCOPE (P2)

- **Subject / grade / topic:** geometry / 6 / symmetry
- **Surface:** question_generator
- **File:** `utils/geometry-constants.js`
- **Current behavior:** Spine symmetry skill grades 4–4; GRADES.g6.topics includes "symmetry".
- **Oracle status:** check_oracle_symmetry_g6
- **Code evidence:** skills.json geometry:kind:symmetry minGrade=4 maxGrade=4; GRADES.g6.topics includes symmetry
- **Oracle evidence:** Verify symmetry oracle row grade span
- **Recommended action:** Align G6 symmetry generator availability with verified oracle grade span.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### SEQ-01 — OUT_OF_SEQUENCE (P1)

- **Subject / grade / topic:** geometry / 5 / parallelogram_trapezoid_area
- **Surface:** learning_book
- **File:** `lib/learning-book/geometry-g5-registry.js`
- **Current behavior:** Book order: parallelogram_area@6, trapezoid_area@7, heights_parallelogram@9. Oracle requires heights before parallelogram/trapezoid area formulas.
- **Oracle status:** required_pending_pdf_parse
- **Code evidence:** GEOMETRY_G5_PAGE_ORDER batch c before batch d
- **Oracle evidence:** math.g5.measurement.area_formulas.parallelogram_trapezoid prerequisite_row_ids includes math.g5.geometry.heights
- **Recommended action:** Reorder G5 book: heights batch before parallelogram/trapezoid area batch.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

### science (9)

#### SCI-01-G1 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 1 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g1.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-01-G2 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 2 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g2.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-01-G3 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 3 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g3.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-01-G4 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 4 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g4.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-01-G5 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 5 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g5.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-01-G6 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** science / 6 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 7 science spine skills active; no official oracle rows.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science spine skill count=7; SCIENCE_GRADES.g6.topics active in product
- **Oracle evidence:** ministry-matrix.draft.json science row count=0
- **Recommended action:** Remove Ministry alignment claims for science; gate content until official oracle rows exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### SCI-03-S-05 — UNSUPPORTED_REPORT_LABEL (P1)

- **Subject / grade / topic:** science / all / S-05
- **Surface:** parent_report_grade_aware_templates
- **File:** `utils/parent-report-language/grade-aware-recommendation-templates.js`
- **Current behavior:** S-05 approved in taxonomy-science.js but absent from GRADE_AWARE_RECOMMENDATION_TEMPLATES.science.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science template keys: S-01, S-02, S-03, S-04, S-07
- **Oracle evidence:** Science oracle empty; templates incomplete for S-05/S-06/S-08
- **Recommended action:** Add approved grade-aware copy for S-05 or suppress taxonomy routing until templates exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### SCI-03-S-06 — UNSUPPORTED_REPORT_LABEL (P1)

- **Subject / grade / topic:** science / all / S-06
- **Surface:** parent_report_grade_aware_templates
- **File:** `utils/parent-report-language/grade-aware-recommendation-templates.js`
- **Current behavior:** S-06 approved in taxonomy-science.js but absent from GRADE_AWARE_RECOMMENDATION_TEMPLATES.science.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science template keys: S-01, S-02, S-03, S-04, S-07
- **Oracle evidence:** Science oracle empty; templates incomplete for S-05/S-06/S-08
- **Recommended action:** Add approved grade-aware copy for S-06 or suppress taxonomy routing until templates exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

#### SCI-03-S-08 — UNSUPPORTED_REPORT_LABEL (P1)

- **Subject / grade / topic:** science / all / S-08
- **Surface:** parent_report_grade_aware_templates
- **File:** `utils/parent-report-language/grade-aware-recommendation-templates.js`
- **Current behavior:** S-08 approved in taxonomy-science.js but absent from GRADE_AWARE_RECOMMENDATION_TEMPLATES.science.
- **Oracle status:** no_oracle_rows
- **Code evidence:** science template keys: S-01, S-02, S-03, S-04, S-07
- **Oracle evidence:** Science oracle empty; templates incomplete for S-05/S-06/S-08
- **Recommended action:** Add approved grade-aware copy for S-08 or suppress taxonomy routing until templates exist.
- **Immediate fix (Track A):** Yes
- **Source verification required:** No

### moledet-geography (4)

#### MOL-01 — OVERTEACHING (P0)

- **Subject / grade / topic:** moledet-geography / 1 / all
- **Surface:** curriculum_spine
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 10 geography spine skills include grade 1; product serves full moledet content at G1.
- **Oracle status:** not_in_grade
- **Code evidence:** geography G1 spine skill count=10
- **Oracle evidence:** moledet.g1.official_status status=not_in_grade confidence=low
- **Recommended action:** Gate moledet/geography G1 content; oracle marks G1 as not_in_grade / no_verified_source.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### MOL-02 — WRONG_GRADE_SCOPE (P0)

- **Subject / grade / topic:** moledet-geography / 1 / all
- **Surface:** student_topic_selection
- **File:** `data/moledet-geography-curriculum.js`
- **Current behavior:** MOLEDET_GEOGRAPHY_GRADES.g1.topics=["homeland","community","citizenship","geography","values","maps"] (6 topics) active despite oracle G1 not_in_grade.
- **Oracle status:** not_in_grade
- **Code evidence:** MOLEDET_GEOGRAPHY_GRADES.g1.topics length=6
- **Oracle evidence:** moledet.g1.official_status
- **Recommended action:** Disable G1 moledet topic menu until official G1 source verified.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### MOL-03 — NEEDS_OWNER_DECISION (P2)

- **Subject / grade / topic:** moledet-geography / all / subject_taxonomy
- **Surface:** curriculum_spine
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** All 71 moledet-aligned skills use subject "geography"; oracle uses "moledet" G2–4 and "geography" G5–6.
- **Oracle status:** split_subject_model
- **Code evidence:** skills.json subject="geography" for moledet content
- **Oracle evidence:** moledet oracle rows G2-4=3; geography oracle G5-6=2
- **Recommended action:** Owner decision: unify subject id (geography vs moledet) across spine, oracle, and reports.
- **Immediate fix (Track A):** No
- **Source verification required:** Yes

#### MOL-04 — NEEDS_OWNER_DECISION (P2)

- **Subject / grade / topic:** moledet-geography / all / subject_id
- **Surface:** reporting_and_runtime
- **File:** `pages/learning/parent-report.js`
- **Current behavior:** Parent/report surfaces use "moledet-geography" (10 refs); master/teacher flows use "moledet_geography" (25 refs).
- **Oracle status:** moledet-geography partial uses hyphen
- **Code evidence:** parent-report.js moledet-geography vs moledet-geography-master.js moledet_geography
- **Oracle evidence:** partial_sources partial=moledet-geography
- **Recommended action:** Pick canonical subject id and alias across parent, teacher, school, and spine layers.
- **Immediate fix (Track A):** No
- **Source verification required:** No

### english (3)

#### ENG-01-G4 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** english / 4 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 27 english spine skills cover grade 4; no product grade gate for source_blocker.
- **Oracle status:** source_blocker
- **Code evidence:** english skills spanning g4: 27
- **Oracle evidence:** english.g4.source_blocker
- **Recommended action:** Gate English G4 content and remove Ministry alignment claims until verified oracle rows replace source_blocker.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### ENG-01-G5 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** english / 5 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 29 english spine skills cover grade 5; no product grade gate for source_blocker.
- **Oracle status:** source_blocker
- **Code evidence:** english skills spanning g5: 29
- **Oracle evidence:** english.g5.source_blocker
- **Recommended action:** Gate English G5 content and remove Ministry alignment claims until verified oracle rows replace source_blocker.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

#### ENG-01-G6 — SOURCE_BLOCKER (P0)

- **Subject / grade / topic:** english / 6 / all
- **Surface:** curriculum_spine_and_runtime
- **File:** `data/curriculum-spine/v1/skills.json`
- **Current behavior:** 25 english spine skills cover grade 6; no product grade gate for source_blocker.
- **Oracle status:** source_blocker
- **Code evidence:** english skills spanning g6: 25
- **Oracle evidence:** english.g6.source_blocker
- **Recommended action:** Gate English G6 content and remove Ministry alignment claims until verified oracle rows replace source_blocker.
- **Immediate fix (Track A):** Yes
- **Source verification required:** Yes

### hebrew (1)

#### HEB-01 — MISSING_REQUIRED_TOPIC (INFO)

- **Subject / grade / topic:** hebrew / all / learning_book
- **Surface:** learning_book
- **File:** `lib/learning-book/`
- **Current behavior:** Hebrew learning-book registries: hebrew-g1-registry.js; missing G2, G3, G4, G5, G6 registries.
- **Oracle status:** derived_alignment
- **Code evidence:** hebrew registries=["hebrew-g1-registry.js"]
- **Oracle evidence:** 16 hebrew oracle rows for grades 2–6
- **Recommended action:** Add Hebrew G2–6 learning-book registries when editorial pipeline ready; subject has derived_alignment not blocking launch gates.
- **Immediate fix (Track A):** No
- **Source verification required:** No

### all (1)

#### SEQ-02 — OUT_OF_SEQUENCE (INFO)

- **Subject / grade / topic:** all / all / pedagogical_sequence
- **Surface:** learning_book
- **File:** `lib/learning-book/*-registry.js`
- **Current behavior:** 21 learning-book registries; none reference oracle sequence_index (114 oracle rows have sequence_index).
- **Oracle status:** sequence_fields_populated
- **Code evidence:** grep sequence_index in lib/learning-book/*-registry.js → 0 matches
- **Oracle evidence:** 114 rows with non-null sequence_index in ministry-matrix.draft.json
- **Recommended action:** Long-term: derive book page order and topic menus from oracle sequence fields.
- **Immediate fix (Track A):** No
- **Source verification required:** No


---

## 6. Immediate safety fixes (Track A)

Fixes that can be gated/suppressed without waiting for Ministry PDF parse:

- **GEO-01-G3:** Gate triangle area generator and practice to grade 5+ until oracle confirms earlier grades. (`utils/geometry-constants.js`)
- **GEO-01-G4:** Gate triangle area generator and practice to grade 5+ until oracle confirms earlier grades. (`utils/geometry-constants.js`)
- **GEO-05:** Gate G6 prism_volume_triangle until G5 triangle area is taught and registered. (`lib/learning-book/geometry-g6-registry.js`)
- **GEO-06:** Suppress or grade-gate geo_area_triangle_formula for grades below G5. (`lib/classroom-activities/classroom-skill-labels-he.js`)
- **GEO-07:** Add grade-aware guard in diagnostic bridge for triangle_area kinds below G5. (`utils/geometry-diagnostic-metadata-bridge.js`)
- **GEO-08:** Grade-gate G-08 triangle_area indicator routing to G5+ only. (`utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`)
- **SCI-03-S-05:** Add approved grade-aware copy for S-05 or suppress taxonomy routing until templates exist. (`utils/parent-report-language/grade-aware-recommendation-templates.js`)
- **SCI-03-S-06:** Add approved grade-aware copy for S-06 or suppress taxonomy routing until templates exist. (`utils/parent-report-language/grade-aware-recommendation-templates.js`)
- **SCI-03-S-08:** Add approved grade-aware copy for S-08 or suppress taxonomy routing until templates exist. (`utils/parent-report-language/grade-aware-recommendation-templates.js`)
- **SEQ-01:** Reorder G5 book: heights batch before parallelogram/trapezoid area batch. (`lib/learning-book/geometry-g5-registry.js`)

---

## 7. Fixes requiring source verification (Track B)

- **GEO-02:** Add verified spine skill after oracle PDF parse confirms formula scope. (`data/curriculum-spine/v1/skills.json`)
- **GEO-03:** Add G5 learning-book page triangle_area after source verification. (`lib/learning-book/geometry-g5-registry.js`)
- **GEO-04:** Add triangle_area page before heights_triangle batch or reorder after page is authored. (`lib/learning-book/geometry-g5-registry.js`)
- **GEO-09:** Owner decision: register rectangle_area spine skill or remove diagnostic bridge entry. (`utils/geometry-diagnostic-metadata-bridge.js`)
- **GEO-10:** Align G6 symmetry generator availability with verified oracle grade span. (`utils/geometry-constants.js`)
- **SCI-01-G1:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **SCI-01-G2:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **SCI-01-G3:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **SCI-01-G4:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **SCI-01-G5:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **SCI-01-G6:** Remove Ministry alignment claims for science; gate content until official oracle rows exist. (`data/curriculum-spine/v1/skills.json`)
- **MOL-01:** Gate moledet/geography G1 content; oracle marks G1 as not_in_grade / no_verified_source. (`data/curriculum-spine/v1/skills.json`)
- **MOL-02:** Disable G1 moledet topic menu until official G1 source verified. (`data/moledet-geography-curriculum.js`)
- **MOL-03:** Owner decision: unify subject id (geography vs moledet) across spine, oracle, and reports. (`data/curriculum-spine/v1/skills.json`)
- **ENG-01-G4:** Gate English G4 content and remove Ministry alignment claims until verified oracle rows replace source_blocker. (`data/curriculum-spine/v1/skills.json`)
- **ENG-01-G5:** Gate English G5 content and remove Ministry alignment claims until verified oracle rows replace source_blocker. (`data/curriculum-spine/v1/skills.json`)
- **ENG-01-G6:** Gate English G6 content and remove Ministry alignment claims until verified oracle rows replace source_blocker. (`data/curriculum-spine/v1/skills.json`)

---

## 8. Owner decision questions

1. **GEO-09** (rectangle_area): Owner decision: register rectangle_area spine skill or remove diagnostic bridge entry.
1. **MOL-03** (subject_taxonomy): Owner decision: unify subject id (geography vs moledet) across spine, oracle, and reports.
1. **MOL-04** (subject_id): Pick canonical subject id and alias across parent, teacher, school, and spine layers.

Additional open questions:
- Should symmetry remain available at G6 when spine binds it to G4 only (GEO-10)?
- When science oracle is populated, should S-05/S-06/S-08 templates precede taxonomy routing?

---

## 9. Files likely needing changes

When fixes are approved, these files appear most frequently in findings:

- `data/curriculum-spine/v1/skills.json`
- `data/moledet-geography-curriculum.js`
- `lib/classroom-activities/classroom-skill-labels-he.js`
- `lib/learning-book/`
- `lib/learning-book/*-registry.js`
- `lib/learning-book/geometry-g5-registry.js`
- `lib/learning-book/geometry-g6-registry.js`
- `pages/learning/parent-report.js`
- `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js`
- `utils/geometry-constants.js`
- `utils/geometry-diagnostic-metadata-bridge.js`
- `utils/parent-report-language/grade-aware-recommendation-templates.js`

---

## Appendix — check IDs executed

| Check | Description |
|-------|-------------|
| GEO-01 | Triangle in TOPIC_SHAPES.area before oracle grade 5 |
| GEO-02 | Missing geometry:kind:triangle_area spine skill |
| GEO-03 | Missing G5 book triangle_area page |
| GEO-04 | heights_triangle before triangle_area page |
| GEO-05 | G6 prism_volume_triangle without G5 triangle_area |
| GEO-06 | Ungated geo_area_triangle_formula classroom label |
| GEO-07 | Ungated triangle_area diagnostic bridge |
| GEO-08 | G08 indicator routes triangle_area all grades |
| GEO-09 | rectangle_area bridge without spine/binding |
| GEO-10 | symmetry spine G4 vs G6 topics |
| SCI-01 | Zero science oracle rows vs active spine |
| SCI-02 | plants grade span vs SCIENCE_GRADES |
| SCI-03 | Missing S-05/S-06/S-08 parent templates |
| MOL-01 | G1 geography spine vs oracle not_in_grade |
| MOL-02 | G1 product topics vs oracle |
| MOL-03 | geography vs moledet subject taxonomy |
| MOL-04 | moledet-geography vs moledet_geography IDs |
| ENG-01 | English G4–6 source_blocker vs spine |
| HEB-01 | Missing Hebrew G2–6 learning-book registries |
| SEQ-01 | G5 area before heights vs oracle |
| SEQ-02 | Book registries ignore oracle sequence_index |

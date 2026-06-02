# Product Alignment Findings — Grades 1–6

**Generated:** 2026-06-02T21:36:51.271Z  
**Generator:** `scripts/verify-product-alignment.mjs`  
**Findings source:** `data/curriculum-oracle/v1/product-alignment-findings.json`

---

## 1. Executive summary

This report compares live product surfaces against `data/curriculum-oracle/v1/ministry-matrix.draft.json` (124 official oracle rows; **0** at `confidence: high`). No product files were modified.

| Metric | Value |
|--------|-------|
| Total findings | 2 |
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| INFO | 2 |
| Oracle row count | 638 |
| Oracle blockers | 35 |
| Science oracle rows | 473 |
| Hebrew oracle rows | 41 |
| English oracle rows | 84 |
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
| geometry | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| science | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| moledet-geography | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| english | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| hebrew | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |

---

## 3. Findings by severity

### P0 (0)

_None._


### P1 (0)

_None._


### P2 (0)

_None._


### INFO (2)

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| HEB-01 | hebrew | — | MISSING_REQUIRED_TOPIC | INFO | learning_book |
| SEQ-02 | all | — | OUT_OF_SEQUENCE | INFO | learning_book |


---

## 4. Findings by product surface

### learning_book

| ID | Subject | Grade | Classification | Severity | Surface |
|----|---------|-------|----------------|----------|---------|
| HEB-01 | hebrew | — | MISSING_REQUIRED_TOPIC | INFO | learning_book |
| SEQ-02 | all | — | OUT_OF_SEQUENCE | INFO | learning_book |


---

## 5. Findings by subject

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
- **Current behavior:** 21 learning-book registries; none reference oracle sequence_index (631 oracle rows have sequence_index).
- **Oracle status:** sequence_fields_populated
- **Code evidence:** grep sequence_index in lib/learning-book/*-registry.js → 0 matches
- **Oracle evidence:** 631 rows with non-null sequence_index in ministry-matrix.draft.json
- **Recommended action:** Long-term: derive book page order and topic menus from oracle sequence fields.
- **Immediate fix (Track A):** No
- **Source verification required:** No


---

## 6. Immediate safety fixes (Track A)

Fixes that can be gated/suppressed without waiting for Ministry PDF parse:

_None identified._

---

## 7. Fixes requiring source verification (Track B)

_None identified._

---

## 8. Owner decision questions

_No NEEDS_OWNER_DECISION findings._

Additional open questions:
- Should symmetry remain available at G6 when spine binds it to G4 only (GEO-10)?
- When science oracle is populated, should S-05/S-06/S-08 templates precede taxonomy routing?

---

## 9. Files likely needing changes

When fixes are approved, these files appear most frequently in findings:

- `lib/learning-book/`
- `lib/learning-book/*-registry.js`

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

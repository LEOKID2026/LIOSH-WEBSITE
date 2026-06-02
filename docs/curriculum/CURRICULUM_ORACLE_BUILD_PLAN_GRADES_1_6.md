# Ministry Curriculum Oracle — Build Plan (Grades 1–6)

**Generated:** 2026-06-02  
**Phase:** Planning + oracle artifact generation only  
**Status:** Draft oracle assembled; product layers unchanged (read-only diff)

---

## 1. Policy declaration

The official Ministry of Education curriculum (PDF/TXT/DOCX and validated extracts) is the **upstream source of truth**.

| Layer | Role |
|-------|------|
| `data/curriculum-oracle/v1/ministry-matrix.draft.json` | Draft Ministry oracle (this build) |
| `data/curriculum-oracle/v1/source-inventory.json` | Source catalog with `source_class` taxonomy |
| `data/curriculum-spine/v1/skills.json` | **Downstream derived mirror** — must not be treated as ultimate truth |
| Product generators, books, reports, diagnostics | Diff targets only in this phase |

**Build scripts** under `scripts/build-ministry-oracle-*.mjs` are standalone report-generation tools. They are **not** wired to `package.json`, CI, runtime imports, or QA gates.

### Artifacts produced

| File | Purpose |
|------|---------|
| `data/curriculum-oracle/v1/source-inventory.json` | Source catalog |
| `data/curriculum-oracle/v1/ministry-matrix.draft.json` | Draft oracle matrix (124 rows, 38 blockers/pending) |
| `data/curriculum-oracle/v1/internal-scaffold.science.json` | Science product-state (38 rows) — **NOT oracle** |
| `data/curriculum-oracle/v1/internal-scaffold.moledet-geography.json` | Moledet/geography product-state (36 rows) — **NOT oracle** |

### Regeneration order

```text
node scripts/build-ministry-oracle-math-geometry.mjs
node scripts/build-ministry-oracle-hebrew.mjs
node scripts/build-ministry-oracle-english.mjs
node scripts/build-ministry-oracle-science.mjs
node scripts/build-ministry-oracle-moledet-geography.mjs
node scripts/build-ministry-oracle-assemble.mjs
```

---

## 2. Source strictness rules

### Source class taxonomy

| `source_class` | Max confidence | Oracle use |
|----------------|----------------|------------|
| `official_primary` | `high` (when parsed) | Curriculum rows |
| `official_supplement` | `medium` | Corroborating rows |
| `derived_alignment` | `medium` | Hebrew matrix rows |
| `unverified` | `low` | `source_blocker` only |
| `no_verified_source` | `low` | Status/blocker rows only (e.g. G1 Moledet) |
| `internal_scaffold` | **blocked** | Never in oracle; separate scaffold files |

### Formal status taxonomy

| Status | Curriculum truth? | Product work allowed? |
|--------|--------------------|-----------------------|
| `required` | Yes | Yes (after oracle approval) |
| `optional` | Yes (enrichment) | Yes (marked enrichment) |
| `not_in_grade` | No | No Ministry claim |
| `unclear` | Provisional | Blocked pending owner |
| `source_blocker` | No | Blocked until source resolved |
| `pending_parse` | No | Blocked until PDF parsed |
| `required_pending_pdf_parse` | Provisional | Blocked until primary PDF anchored |

### Consolidated hard rules

1. No `source_class: internal_scaffold` in `ministry-matrix.draft.json`.
2. No row from `data/moledet-geography-curriculum.js` in the oracle.
3. No row from `data/science-curriculum.js` in the oracle.
4. Internal scaffold rows must never raise confidence for any oracle row.
5. Grade-1 Moledet/geography: at most one `no_verified_source` status row.
6. Triangle area confidence capped at `medium` until `kita5.pdf` parsed.
7. Scripts write only to `data/curriculum-oracle/v1/` and `docs/curriculum/`.
8. All product layers read-only in this phase.
9. Oracle includes learning sequence metadata; product must not sort topics arbitrarily when sequence is available.

---

## 3. Source inventory

Full catalog: [`data/curriculum-oracle/v1/source-inventory.json`](../data/curriculum-oracle/v1/source-inventory.json)

### Active blockers

| Blocker | Subject | Grades | Resolution |
|---------|---------|--------|------------|
| `kita1–6.pdf` not parsed | math, geometry | 1–6 | Parse per-grade PDFs to TXT; anchor rows |
| `science Curriculum2016.docx` not parsed | science | 1–6 | Parse DOCX to grade×domain×outcome rows |
| English `כיתה ד–ו.txt` unverified | english | 4–6 | Owner validates TXT against `english Curriculum2020.pdf` |
| No verified MoE source | moledet/geography | 1 | Confirm official scope or mark enrichment |
| PDFs not auto-parsed | moledet, geography | 2–6 | Manual/PDF parse pass for subsection rows |

---

## 4. Per-subject matrix build procedure

### Math / Geometry (34 oracle rows)

- **Sources:** `mavo1.txt` (grade×strand table), `resource_100673815.txt` (per-grade sections)
- **Confidence:** `medium` (`required_pending_pdf_parse`) until `kita{n}.pdf` parsed
- **Script:** `scripts/build-ministry-oracle-math-geometry.mjs`
- **Sequence groups:** `measurement_area`, `area_formulas`, `geometry_properties`, `heights`, `volume`, `circles`

### Hebrew (41 oracle rows)

- **Source:** `data/hebrew-official-alignment-matrix.json` (`derived_alignment`)
- **Confidence:** `medium` (single `hebrew-1-6.pdf`; no per-grade TXT for 2–6)
- **Script:** `scripts/build-ministry-oracle-hebrew.mjs`

### English (43 oracle rows)

- **Grades 1–3:** validated TXT extracts → `required`, confidence `medium`
- **Grades 4–6:** `source_blocker` rows (`unverified` TXT)
- **Script:** `scripts/build-ministry-oracle-english.mjs`

### Science (0 oracle rows; 38 scaffold rows)

> **Science cannot be marked Ministry-aligned until `science Curriculum2016.docx` is parsed into grade×domain×outcome rows.**

- **Scaffold only:** `data/curriculum-oracle/v1/internal-scaffold.science.json`
- **Script:** `scripts/build-ministry-oracle-science.mjs`

### Moledet / Geography (6 oracle rows; 36 scaffold rows)

- **Grade 1:** single `moledet.g1.official_status` row (`not_in_grade`, `no_verified_source`)
- **Grades 2–4:** moledet rows from `homeland-curriculum.pdf` scope
- **Grades 5–6:** geography rows from `tohnit-geography-5-6.pdf` scope
- **Product-state:** `internal-scaffold.moledet-geography.json` only
- **Script:** `scripts/build-ministry-oracle-moledet-geography.mjs`

---

## 5. Triangle area investigation (reporting only)

| Field | Value |
|-------|-------|
| Oracle row | `math.g5.measurement.area_formulas.triangle_area` |
| Official grade | **5** (strong indication) |
| Status | `required_pending_pdf_parse` |
| Confidence | **medium** (capped until `kita5.pdf` parsed) |
| Sources | `resource_100673815.txt` § ה. מדידות שטחים pp. 114–115; `mavo1.txt` grade-5: נוסחאות השטח + ריצוף, גבהים |
| Standalone vs unit | Part of מדידות שטחים — not a standalone TOC heading |
| Prerequisites (sequence) | Rectangle area (G4); triangle properties (G3–G4) — row IDs pending full G3–G4 oracle pass |

### Product findings (no implementation in this phase)

| Finding | Flag | Evidence |
|---------|------|----------|
| No `triangle_area` spine skill | `MISSING_REQUIRED_TOPIC` | `skills.json` has no `triangle_area` entry |
| Generator emits triangle area from G3 | `OVERTEACHING` | `utils/geometry-constants.js` `TOPIC_SHAPES.area.g3` includes `"triangle"` |
| G5 book has `heights_triangle` without prior `triangle_area` page | `OUT_OF_SEQUENCE` / `HIDDEN_PREREQUISITE` | `lib/learning-book/geometry-g5-registry.js` batch D before any triangle area page |
| G6 `prism_volume_triangle` depends on untaught formula | `HIDDEN_PREREQUISITE` | `docs/learning-book/geometry/g6/drafts/prism_volume_triangle.md` |
| Diagnostic label exists without spine skill | `UNSUPPORTED_REPORT_LABEL` | `geo_area_triangle_formula` in `classroom-skill-labels-he.js` |
| Teacher cannot assign consistent skill | `UNSUPPORTED_TEACHER_ASSIGNMENT` | No `geometry:kind:triangle_area` in spine |

### Remediation order (future — requires oracle approval)

1. Confirm oracle row at G5 (`kita5.pdf` parse)
2. Add spine skill (G5+)
3. Fix generator grade gate (remove G3–G4 formula emission)
4. Add G5 book page `triangle_area.md` before `heights_triangle`
5. Map practice CTA / report / diagnostic grade gates
6. Add QA oracle gates

---

## 6. Diff report — oracle vs product layers

**Mode:** Report-only. No compared file was modified.

**Oracle snapshot:** 124 rows | **Spine snapshot:** 423 skills

### Summary by flag

| Flag | Count (representative) | Severity |
|------|------------------------|----------|
| `MISSING_REQUIRED_TOPIC` | High | RED |
| `OVERTEACHING` | Medium | RED/YELLOW |
| `WRONG_GRADE_SCOPE` | Medium | RED |
| `HIDDEN_PREREQUISITE` | High (geometry) | RED |
| `OUT_OF_SEQUENCE` | High (geometry books) | RED |
| `UNSUPPORTED_REPORT_LABEL` | Medium | YELLOW |
| `UNSUPPORTED_TEACHER_ASSIGNMENT` | Medium | YELLOW |
| `SOURCE_BLOCKER` | 38 oracle rows | BLOCKER |
| `NEEDS_OWNER_DECISION` | Low | YELLOW |

---

### 6.1 Spine (`data/curriculum-spine/v1/skills.json`)

| Subject | Spine rows | Oracle rows | Gap |
|---------|------------|-------------|-----|
| hebrew | 135 | 41 | Spine is content-map derived; oracle is alignment-matrix derived — granularity mismatch |
| math | 91 | ~20 math | Spine follows generators; oracle follows MoE strands |
| geometry | 38 | ~14 geometry | Missing `triangle_area`; extra generator-derived kinds |
| english | 81 | 43 | Oracle incomplete for G4–6 (blockers) |
| science | 7 | 0 | **RED** — spine has 7 coarse rows; oracle has zero Ministry rows |
| geography | 71 | 6 | Product geography spans G1–6; oracle moledet G2–4 + geo G5–6 only |

**Classified mismatches:**

| ID | Flag | Detail |
|----|------|--------|
| SP-01 | `MISSING_REQUIRED_TOPIC` | Oracle `math.g5.measurement.area_formulas.triangle_area` — no matching spine skill |
| SP-02 | `OVERTEACHING` | Spine/geography includes G1 moledet topics; oracle G1 = `not_in_grade` |
| SP-03 | `WRONG_GRADE_SCOPE` | Science spine: 7 topic rows span all grades; oracle blocked until DOCX parse |
| SP-04 | `SOURCE_BLOCKER` | Cannot fully diff science until DOCX ingested |

---

### 6.2 Geometry generator gates (`utils/geometry-constants.js`)

| ID | Flag | Detail |
|----|------|--------|
| GG-01 | `OVERTEACHING` | `TOPIC_SHAPES.area.g3` includes `"triangle"` — oracle G3 area = comparison/arbitrary units only |
| GG-02 | `OVERTEACHING` | `TOPIC_SHAPES.area.g4` includes `"triangle"` — oracle G4 = rectangle formulas only |
| GG-03 | `WRONG_GRADE_SCOPE` | Triangle area formula effectively available G3–G6 via generator; oracle = G5 |

---

### 6.3 Learning books (`lib/learning-book/*-registry.js`)

#### Geometry G5 page order vs oracle sequence

Oracle required order (G5 area/heights):
1. `math.g5.measurement.area_formulas.rectangle_area`
2. `math.g5.measurement.area_formulas.triangle_area`
3. `math.g5.geometry.heights`
4. `math.g5.measurement.area_formulas.parallelogram_trapezoid`

Observed G5 book order (`geometry-g5-registry.js`):
1. `parallel_perpendicular`, `quadrilaterals`, `triangle_angles`
2. `square_perimeter`, `triangle_perimeter`, `square_area`
3. `parallelogram_area`, `trapezoid_area`
4. **`heights_triangle`**, `heights_parallelogram`, `heights_trapezoid`

| ID | Flag | Detail |
|----|------|--------|
| LB-01 | `MISSING_REQUIRED_TOPIC` | No `triangle_area` page in G5 registry |
| LB-02 | `OUT_OF_SEQUENCE` | `heights_triangle` (batch D) appears before any triangle area formula page |
| LB-03 | `OUT_OF_SEQUENCE` | `parallelogram_area`, `trapezoid_area` (batch C) before `heights_triangle` but oracle lists heights before parallelogram/trapezoid area formulas |
| LB-04 | `HIDDEN_PREREQUISITE` | G6 `prism_volume_triangle.md` assumes triangle area formula without G5 teach page |

---

### 6.4 Student learning surfaces

| ID | Flag | Surface | Detail |
|----|------|---------|--------|
| ST-01 | `OVERTEACHING` | Practice topic picker | Triangle area practice available from G3 via generator gates |
| ST-02 | `OUT_OF_SEQUENCE` | Topic cards | Order follows registry/generator, not oracle `sequence_index` |

---

### 6.5 Teacher / private-teacher surfaces

| ID | Flag | Surface | Detail |
|----|------|---------|--------|
| TC-01 | `UNSUPPORTED_TEACHER_ASSIGNMENT` | Activity creation | `geo_area_triangle_formula` label exists; no spine skill for consistent assignment |
| TC-02 | `OVERTEACHING` | Suggested topics | Triangle area may surface below G5 |

---

### 6.6 School surfaces

| ID | Flag | Surface | Detail |
|----|------|---------|--------|
| SC-01 | `UNSUPPORTED_TEACHER_ASSIGNMENT` | School activity creation | Same as TC-01 |
| SC-02 | `OVERTEACHING` | Class reports | Moledet G1 content reportable without oracle backing |

---

### 6.7 Parent / reporting / diagnostic surfaces

| ID | Flag | Surface | Detail |
|----|------|---------|--------|
| PR-01 | `UNSUPPORTED_REPORT_LABEL` | Parent diagnostic | `geo_area_triangle_formula` in `parent-diagnostic-explanations-he.js` without G5 oracle-confirmed teach path |
| PR-02 | `OUT_OF_SEQUENCE` | Diagnostic taxonomy | `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js` — triangle area candidates may appear before foundational area measurement in diagnostic flow |

---

### 6.8 Moledet / geography product vs oracle

| ID | Flag | Detail |
|----|------|--------|
| MG-01 | `OVERTEACHING` | Product `MOLEDET_GEOGRAPHY_GRADES.g1` teaches full topic set; oracle = `not_in_grade` |
| MG-02 | `WRONG_GRADE_SCOPE` | Scaffold shows 36 product topics G1–6; oracle has 5 official rows + 1 blocker |
| MG-03 | `SOURCE_BLOCKER` | Official PDFs not parsed to subsection granularity |

---

### 6.9 Science product vs oracle

| ID | Flag | Detail |
|----|------|--------|
| SCI-01 | `SOURCE_BLOCKER` | Zero science rows in oracle; DOCX not parsed |
| SCI-02 | `WRONG_GRADE_SCOPE` | Spine 7 rows vs scaffold 38 topic rows vs unknown official grid |
| SCI-03 | `MISSING_REQUIRED_TOPIC` | Cannot classify until DOCX parse — all product science alignment provisional |

---

### 6.10 English grades 4–6

| ID | Flag | Detail |
|----|------|--------|
| EN-01 | `SOURCE_BLOCKER` | Oracle rows for G4–6 are blockers only (`unverified` TXT) |
| EN-02 | `NEEDS_OWNER_DECISION` | TXT files may match Curriculum 2020 but catalog flags `unknown_unverified` |

---

### Sequence check matrix (surfaces × oracle sequence fields)

| Surface | Checks `sequence_index` | Checks `prerequisite_row_ids` | Status |
|---------|-------------------------|-------------------------------|--------|
| Learning book TOC | Yes | Yes | **FAIL** (G5 geometry) |
| Book page prev/next | Yes | Yes | **FAIL** (heights before area) |
| Student topic cards | Partial | No | **FAIL** |
| Practice picker | No | No | **FAIL** |
| Teacher activity list | No | No | **FAIL** |
| School reports | No | No | **FAIL** |
| Parent/diagnostic | Partial | No | **FAIL** |

---

## 7. QA gates required (future work)

No existing QA scripts were modified in this phase. Required future gates:

1. **Oracle integrity gate** — fail if any row has `source_class: internal_scaffold` in `ministry-matrix.draft.json`
2. **Spine diff gate** — fail on `MISSING_REQUIRED_TOPIC` for rows with `status: required` and confidence ≥ medium
3. **Generator overteaching gate** — compare `TOPIC_SHAPES` / math kind branches to oracle grade bands
4. **Book sequence gate** — compare registry page order to oracle `sequence_index` + `prerequisite_row_ids`
5. **Report label gate** — every diagnostic label must map to an oracle row at the student's grade
6. **Science blocker gate** — fail Ministry-alignment claims until DOCX parse completes
7. **Moledet G1 gate** — fail Ministry-alignment for G1 moledet until official source found or marked enrichment

---

## 8. Next steps (owner approval required)

1. Review draft oracle (`ministry-matrix.draft.json`) and source inventory
2. Parse `kita5.pdf` to confirm triangle area row → promote to `required` / confidence `high`
3. Parse `science Curriculum2016.docx` → populate official science oracle rows
4. Validate English G4–6 TXT against PDF
5. Approve remediation sequence for triangle area and book reorder
6. Only then: derive updated `skills.json` from approved oracle (separate phase)

---

*This document was generated as part of the Ministry Curriculum Oracle build phase. Product code, UI, Hebrew copy, SQL, and spine were not modified.*

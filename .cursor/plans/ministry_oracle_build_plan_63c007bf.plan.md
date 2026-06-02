---
name: Ministry Oracle Build Plan
overview: Create oracle artifact files and a companion build plan document that establish the Ministry of Education curriculum as the upstream source of truth, replacing the generator-derived skills.json. No runtime changes, no commits.
todos:
  - id: source-inventory
    content: "Write data/curriculum-oracle/v1/source-inventory.json — catalog every in-repo and remote MoE source with source_class (official_primary / official_supplement / internal_scaffold / derived_alignment / unverified), validated_status, and grade coverage. Update homeland_curriculum_pdf grade_coverage to exclude grade 1."
    status: pending
  - id: oracle-math-geo
    content: "Write standalone script scripts/build-ministry-oracle-math-geometry.mjs (no runtime imports, not wired to npm/CI) — extract grade×strand rows from mavo1.txt table (lines 603–659) and resource_100673815.txt per-grade sections into ministry-matrix.draft.json. Triangle area row: status=required, confidence=medium, blocker_reason='Primary grade-5 kita5.pdf not yet parsed'."
    status: pending
  - id: oracle-hebrew
    content: "Write standalone script scripts/build-ministry-oracle-hebrew.mjs — re-map data/hebrew-official-alignment-matrix.json rows to oracle schema. Grade 1 rows may reach confidence: medium (POP grade-1 page anchor). Grades 2–6: confidence: medium, notes: single-PDF source, no per-grade TXT split."
    status: pending
  - id: oracle-english
    content: "Write standalone script scripts/build-ministry-oracle-english.mjs — extract rows from validated כיתה א–ג.txt (source_class: official_primary); emit confidence: low + status: source_blocker rows for grades 4–6 (source_class: unverified) until owner confirms TXT against english Curriculum2020.pdf."
    status: pending
  - id: oracle-science-scaffold
    content: "Write standalone script scripts/build-ministry-oracle-science.mjs — write science scaffold rows to data/curriculum-oracle/v1/internal-scaffold.science.json ONLY. Do NOT include any science rows in ministry-matrix.draft.json. All rows: source_class=internal_scaffold, ministry_source_type=internal_js_scaffold, status=source_blocker, confidence=low, blocker_reason='Science Curriculum2016.docx not parsed; this is NOT an official oracle row'."
    status: pending
  - id: oracle-moledet
    content: "Write standalone script scripts/build-ministry-oracle-moledet-geography.mjs — grades 2–4 from homeland-curriculum.pdf (source_class: official_primary), grades 5–6 from tohnit-geography-5-6.pdf. Grade 1: emit rows with status=not_in_grade, confidence=low, blocker_reason='No verified official MoE source for grade-1 Moledet found'."
    status: pending
  - id: oracle-assemble
    content: "Assemble all official-source subject outputs (math, geometry, hebrew, english, moledet/geography) into data/curriculum-oracle/v1/ministry-matrix.draft.json. Science rows go ONLY to internal-scaffold.science.json. Include a header block with assembly timestamp, blocker count, and a WARNING that internal_scaffold rows must never be merged here."
    status: pending
  - id: diff-report
    content: "Write diff section inside docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md — compare oracle to spine/generators/books/reports/diagnostics using the 8 flag types. Diff is report-only: no changes to any compared file."
    status: pending
  - id: build-plan-doc
    content: "Write docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md — full plan: policy declaration, source strictness rules, per-subject strategy, triangle area investigation, diff structure, QA gate requirements."
    status: pending
isProject: false
---

# Ministry Curriculum Oracle — Build Plan (revised)

## Scope and hard constraints

**Planning + oracle artifact generation only.** New scripts, if created, are standalone report-generation tools only and are not connected to runtime, CI, QA, build, or product code.

Allowed:
- Standalone `scripts/build-ministry-oracle-*.mjs` that write only to `data/curriculum-oracle/v1/` and `docs/curriculum/`.
- Read-only access to existing source TXT/JSON/JS files.

Not allowed:
- Any script imported by runtime pages, QA gates, or `npm run` pipelines.
- Any modification to `skills.json`, generators, books, UI, copy, SQL, registries, reports, or QA scripts.
- Automatic regeneration of `skills.json` from oracle output.
- Any commit, push, or deploy.

Outputs:
- `data/curriculum-oracle/v1/source-inventory.json`
- `data/curriculum-oracle/v1/ministry-matrix.draft.json`
- `data/curriculum-oracle/v1/internal-scaffold.science.json` (science only — NOT part of oracle)
- `docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md`

---

## Architecture of the oracle

```mermaid
flowchart TD
    subgraph official_primary [Official Primary Sources]
        MAVO["mavo1.txt (math overview)"]
        KITA["kita1–6.pdf (pending parse)"]
        HEB["hebrew-1-6.pdf"]
        ENG13["כיתה א–ג.txt (English 2020 validated)"]
        HOMELAND["homeland-curriculum.pdf (grades 2–4)"]
        GEO56["tohnit-geography-5-6.pdf"]
    end

    subgraph official_supplement [Official Supplements]
        RESOURCE["resource_100673815.txt (special-ed math)"]
        MISMACH["mismach_hatamot.txt"]
        VAV["tochnit-vav.pdf"]
    end

    subgraph derived_alignment [Derived Alignment — not primary]
        HEB_MATRIX["hebrew-official-alignment-matrix.json"]
    end

    subgraph unverified [Unverified Sources]
        ENG46["כיתה ד–ו.txt (status: unknown)"]
    end

    subgraph internal_scaffold [Internal Scaffold — NOT Ministry]
        SCI_JS["data/science-curriculum.js"]
        MOL_JS["data/moledet-geography-curriculum.js"]
    end

    subgraph oracle_outputs [Oracle Artifacts]
        Inventory["source-inventory.json"]
        Matrix["ministry-matrix.draft.json"]
        SciScaffold["internal-scaffold.science.json (NOT oracle)"]
    end

    subgraph existing_derived [Existing Downstream — diff targets only]
        Spine["skills.json"]
        Generators["math/geometry generators"]
        Books["learning-book registries"]
        Reports["parent reports / diagnostics"]
    end

    official_primary --> Inventory
    official_supplement --> Inventory
    derived_alignment --> Inventory
    unverified --> Inventory

    official_primary --> Matrix
    official_supplement -->|"support only — no high-conf alone"| Matrix
    derived_alignment -->|"medium-conf rows"| Matrix
    unverified -->|"source_blocker rows only"| Matrix
    internal_scaffold -->|"BLOCKED from matrix"| SciScaffold

    Matrix -->|"future: diff only, no edits"| Spine
    Matrix -->|"future: diff only, no edits"| Generators
    Matrix -->|"future: diff only, no edits"| Books
    Matrix -->|"future: diff only, no edits"| Reports
```

---

## File 1 — `data/curriculum-oracle/v1/source-inventory.json`

### Source class taxonomy

Every entry must carry a `source_class` that controls what confidence level its rows may reach in the oracle:

| `source_class` | Max row confidence | Description |
|----------------|--------------------|-------------|
| `official_primary` | `high` | Published by MoE as a grade-programme document, directly ingested or bound in repo |
| `official_supplement` | `medium` | Official MoE document but not the primary grade programme (special-ed adaptation, pedagogy guide) |
| `derived_alignment` | `medium` | Derived from an official primary source via a prior manual alignment pass (e.g. `hebrew-official-alignment-matrix.json`) |
| `unverified` | `low` — must be `source_blocker` | File present but content not validated against the expected official document |
| `internal_scaffold` | **blocked** — never enters `ministry-matrix.draft.json` | Generated from internal product JS; not an MoE document |

### Schema per entry

```json
{
  "source_id": "math_mavo1_txt",
  "file_path": "תוכנית משרד החינוך קובצי TXT/mavo1.txt",
  "remote_url": "https://meyda.education.gov.il/files/Tochniyot_Limudim/Math/Yesodi/mavo1.pdf",
  "subject_coverage": ["math", "geometry"],
  "grade_coverage": [1, 2, 3, 4, 5, 6],
  "source_type": "txt",
  "source_class": "official_primary",
  "validated_status": "validated",
  "parse_status": "partially_extracted",
  "in_repo": true,
  "notes": "Contains grade×strand summary table (cols: מצולעים | גופים | טרנספורמציות | מדידות). Supports medium-confidence rows; high-confidence only when corroborated by kita{n}.pdf."
}
```

### Entries to generate

| `source_id` | path | subjects | grades | `source_class` | `validated_status` |
|-------------|------|---------|--------|-----------------|-------------------|
| `math_mavo1_txt` | `...קובצי TXT/mavo1.txt` | math, geometry | 1–6 | `official_primary` | `validated` |
| `math_resource_special_ed_txt` | `...קובצי TXT/resource_100673815.txt` | math, geometry | 1–6 | `official_supplement` | `validated` |
| `math_mismach_hatamot_txt` | `...קובצי TXT/mismach_hatamot.txt` | math | 1–6 | `official_supplement` | `validated` |
| `math_kita1_pdf` … `math_kita6_pdf` | `תוכנית משרד החינוך/כיתה א–ו.pdf` | math, geometry | per grade | `official_primary` | **`pending_parse`** |
| `hebrew_1_6_pdf` | `תוכנית משרד החינוך/hebrew-1-6.pdf` | hebrew | 1–6 | `official_primary` | `validated_bound` |
| `english_curriculum_2020_pdf` | `.../english Curriculum2020.pdf` | english | 1–6 | `official_primary` | `validated` |
| `english_g1_txt` … `english_g3_txt` | `...קובצי TXT/כיתה א–ג.txt` | english | 1–3 | `official_primary` | `validated` |
| `english_g4_txt` … `english_g6_txt` | `...קובצי TXT/כיתה ד–ו.txt` | english | 4–6 | **`unverified`** | **`unknown_unverified`** |
| `science_curriculum_2016_docx` | `.../science Curriculum2016.docx` | science | 1–6 | `official_primary` | **`validated_unread`** (file present, content not parsed) |
| `homeland_curriculum_pdf` | `.../homeland-curriculum.pdf` | moledet | **2–4** | `official_primary` | `validated` |
| `geography_5_6_pdf` | `.../tohnit-geography-5-6.pdf` | geography | 5–6 | `official_primary` | `validated` |
| `tochnit_vav_pdf` | `.../tochnit-vav.pdf` | moledet, geography | 6 | `official_supplement` | `validated` |
| `hebrew_official_matrix_json` | `data/hebrew-official-alignment-matrix.json` | hebrew | 1–6 | `derived_alignment` | `validated` |
| `science_curriculum_js` | `data/science-curriculum.js` | science | 1–6 | **`internal_scaffold`** | `internal` — **BLOCKED from oracle** |
| `moledet_geography_curriculum_js` | `data/moledet-geography-curriculum.js` | moledet, geography | 1–6 | **`internal_scaffold`** | `internal` — **BLOCKED from oracle** |

**Note:** `homeland_curriculum_pdf` grade coverage is **2–4 only**. Grade 1 has no MoE מולדת primary source confirmed in-repo — it must not appear as a grade in any official_primary source entry.

---

## File 2 — `data/curriculum-oracle/v1/ministry-matrix.draft.json`

### Row schema

```json
{
  "row_id": "math.g5.measurement.area_formulas.triangle_area",
  "subject": "math",
  "grade": 5,
  "official_domain": "מדידות",
  "official_topic": "מדידות שטחים",
  "official_subtopic": "נוסחת שטח המשולש (בסיס × גובה ÷ 2)",
  "ministry_source_file": "תוכנית משרד החינוך קובצי TXT/resource_100673815.txt",
  "ministry_source_type": "txt",
  "source_class": "official_supplement",
  "source_anchor": "כיתה ה׳ § ה. מדידות שטחים עמ׳ 114–115",
  "corroborating_source": "mavo1.txt grade-5 column: 'נוסחאות השטח + ריצוף, גבהים'",
  "status": "required",
  "confidence": "medium",
  "geometry_strand": true,
  "internal_candidate_skill_id": null,
  "notes": "Strongly indicated by mavo1.txt + resource_100673815.txt but NOT final until kita5.pdf is parsed and anchored. Part of מדידות שטחים unit; not a standalone TOC heading. Prerequisite: גבהים §4 p.113 must precede or co-teach.",
  "blocker_reason": "Primary grade-5 Ministry PDF (kita5.pdf) not yet parsed or anchored; confidence capped at medium until that is done."
}
```

### Rule: confidence ceiling per source class

A row's `confidence` is capped by its `source_class`:
- `official_primary` + parsed → `high` allowed
- `official_primary` + `pending_parse` → `medium` maximum
- `official_supplement` alone → `medium` maximum
- `official_supplement` corroborating `official_primary` → may raise to `medium`; `high` only when primary is parsed
- `derived_alignment` → `medium` maximum
- `unverified` → `low`, `status` must be `source_blocker`
- `internal_scaffold` → **never enters this file**

### Confidence ceiling summary table

| `source_class` present | Primary parsed? | Max `confidence` |
|------------------------|-----------------|------------------|
| `official_primary` | yes | `high` |
| `official_primary` | no (`pending_parse`) | `medium` |
| `official_supplement` only | — | `medium` |
| `derived_alignment` | — | `medium` |
| `unverified` | — | `low` (+ `source_blocker`) |

### Population strategy per subject

#### Math / Geometry (highest priority)

**Sources:**
- `mavo1.txt` (source_class: `official_primary`, parse_status: `partially_extracted`) — grade×strand summary table, lines 603–659, 4 columns × 6 grade rows.
- `resource_100673815.txt` (source_class: `official_supplement`) — per-grade topic sections with page refs to the תכ"ל document; confirms G5 מדידות שטחים pp. 114–115 and גבהים §4 p.113.
- `כיתה א–ו.pdf` (source_class: `official_primary`, parse_status: `pending_parse`) — not yet parsed to TXT; generates placeholder rows only.

**Extraction approach (standalone script `scripts/build-ministry-oracle-math-geometry.mjs`):**
1. Read `mavo1.txt` lines 603–659; parse grade×strand columns → emit rows tagged `source_anchor: "mavo1.txt lines 603–659, grade-N <strand column>"`, `source_class: official_primary`, `confidence: medium` (primary but not per-grade PDF verified).
2. Read `resource_100673815.txt`; detect per-grade section headers (`כתה א׳` … `כתה ו׳`), numbered topic items with page refs → emit corroborating rows as `source_class: official_supplement`.
3. For each per-grade PDF `כיתה N.pdf`: emit one placeholder row per grade: `status: pending_parse, confidence: low, blocker_reason: "kita{N}.pdf not yet parsed"`.
4. For every topic supported by both `mavo1.txt` and `resource_100673815.txt`, set `confidence: medium`; record both in `corroborating_source`.

**Triangle area — specific row treatment:**

| Field | Value |
|-------|-------|
| `subject` | `math` (geometry strand) |
| `grade` | `5` |
| `official_domain` | `מדידות` |
| `official_topic` | `מדידות שטחים` |
| `official_subtopic` | `שטח משולש (בסיס × גובה ÷ 2)` |
| `ministry_source_file` | `resource_100673815.txt` |
| `source_class` | `official_supplement` |
| `corroborating_source` | `mavo1.txt grade-5: נוסחאות השטח + ריצוף, גבהים` |
| `source_anchor` | `כיתה ה׳ § ה. מדידות שטחים עמ׳ 114–115` |
| `status` | `required` |
| `confidence` | **`medium`** |
| `blocker_reason` | `"Primary grade-5 Ministry PDF (kita5.pdf) not yet parsed; confidence capped at medium until parsed and anchored"` |
| `notes` | `"Not a standalone TOC heading. Part of מדידות שטחים. Prerequisite: גבהים §4 p.113 must precede or co-teach. G3–G4 use 'שטח ביחידות שרירותיות' (comparison only) — formula not in those grades."` |

**Other critical geometry strand rows (confidence caps apply):**

| grade | official_domain | official_topic | official_subtopic | status | confidence |
|-------|-----------------|----------------|-------------------|--------|------------|
| 3 | גאומטריה | מצולעים | זוויות, מאונכות, מקבילות, משולשים, מרובעים | required | medium |
| 3 | מדידות | שטח | השוואה; יחידות שרירותיות (no formula) | required | medium |
| 4 | גאומטריה | ריבוע ומלבן | הגדרות, תכונות; תכונות צלעות וזוויות במשולש | required | medium |
| 4 | מדידות | נוסחאות שטח והיקף | שטח מלבן + היקף מלבן | required | medium |
| 4 | מדידות | נפח | נפח תיבה, שטח פנים | required | medium |
| 5 | מצולעים | גבהים | גובה לשטח (משולש, מקבילית, טרפז) | required | medium |
| 5 | מדידות | מדידות שטחים | שטח משולש / מקבילית / טרפז | required | **medium** |
| 6 | גאומטריה | גופים | נפחים; פריסות; גופים משוכללים | required | medium |
| 6 | מדידות | מעגל ועיגול | היקף + שטח מעגל | required | medium |

All rows above remain `medium` until `kita{N}.pdf` files are parsed and individual anchors confirmed.

#### Hebrew

**Source primary:** `data/hebrew-official-alignment-matrix.json` (source_class: `derived_alignment` — already mapped from `hebrew-1-6.pdf` with char anchors).  
**Approach:** Re-map matrix rows to oracle schema. Grade 1 rows inherit `confidence: medium` (POP grade-1 page provides some direct anchor; single PDF limits per-grade certainty for higher grades).  
**Rule:** No Hebrew row may exceed `confidence: medium` until per-grade TXT splits are available for grades 2–6.  
**Script:** standalone `scripts/build-ministry-oracle-hebrew.mjs`; reads `data/hebrew-official-alignment-matrix.json` only; writes to `ministry-matrix.draft.json` section; no imports from runtime.

#### English

**Grades 1–3:** `כיתה א–ג.txt` (source_class: `official_primary`, validated) → rows `confidence: medium` (per-grade, well-structured, but no PDF section anchor yet).  
**Grades 4–6:** `כיתה ד–ו.txt` (source_class: `unverified`) → rows with `status: source_blocker, confidence: low, blocker_reason: "TXT file content not validated against english Curriculum2020.pdf; must be verified by owner before any rows can be promoted"`. These rows enter the matrix as blockers only, not as curriculum truth.  
**Fallback for grades 4–6 scaffolding:** `english Curriculum2020.pdf` (source_class: `official_primary`, `validated`) may be used to emit `confidence: low, status: required_pending_pdf_parse` placeholder rows for the PDF-covered grades if a TXT extract is produced.  
**Script:** standalone `scripts/build-ministry-oracle-english.mjs`.

#### Science — separate scaffold file only

**Science cannot be marked Ministry-aligned until `science Curriculum2016.docx` is parsed into grade×domain×outcome rows.**

Science rows derived from `data/science-curriculum.js` are internal product data, not MoE documents. They must **not** enter `ministry-matrix.draft.json`.

Instead:
- `scripts/build-ministry-oracle-science.mjs` writes to `data/curriculum-oracle/v1/internal-scaffold.science.json` only.
- Every row carries: `source_class: internal_scaffold`, `ministry_source_type: internal_js_scaffold`, `status: source_blocker`, `confidence: low`, `blocker_reason: "Science Curriculum2016.docx not parsed; this is NOT an official oracle row. Do not merge into ministry-matrix.draft.json."`.
- The file header includes: `"WARNING": "This file is NOT part of the Ministry oracle. It is a scaffold for reference until the DOCX is parsed."`.
- `ministry-matrix.draft.json` includes zero science rows until DOCX parsing is complete.

#### Moledet / Geography

**Grade 1:** No MoE מולדת primary source confirmed. Emit rows with `status: not_in_grade, confidence: low, blocker_reason: "No verified official MoE source for grade-1 Moledet found. Product may teach this as enrichment but must not present it as Ministry-aligned."`. These rows come from `moledet_geography_curriculum_js` (source_class: `internal_scaffold`) — they document the product state, not the oracle state.  
**Grades 2–4:** `homeland-curriculum.pdf` (source_class: `official_primary`, grades 2–4 only) → rows `confidence: medium`.  
**Grades 5–6:** `tohnit-geography-5-6.pdf` (source_class: `official_primary`) → geography rows `confidence: medium`. `tochnit-vav.pdf` (source_class: `official_supplement`) supports grade 6.  
**Subject split:** `subject: moledet` for civic/homeland strand; `subject: geography` for maps/geographic content.  
**Script:** standalone `scripts/build-ministry-oracle-moledet-geography.mjs`.

---

## File 3 — `docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md`

The plan document covers:

1. **Policy declaration** — `skills.json` is downstream; oracle is upstream. Scripts are standalone artifact-generation tools only, not connected to runtime, CI, QA, or product code.
2. **Source strictness rules** — the five `source_class` values, confidence ceiling table, and rule that internal_scaffold rows are blocked from the oracle.
3. **Source inventory** — links to `source-inventory.json`; complete blockers table.
4. **Per-subject matrix build procedure** — as specified above.
5. **Science science section** — explicit statement: "Science cannot be marked Ministry-aligned until `science Curriculum2016.docx` is parsed into grade×domain×outcome rows."
6. **Triangle area investigation (reporting only, no implementation):**
   - Official grade: strongly indicated as **5** (מדידות שטחים pp. 114–115 and גבהים §4 p.113 in `resource_100673815.txt`; `mavo1.txt` grade-5: "נוסחאות השטח + ריצוף, גבהים"). Confidence: **medium** until `kita5.pdf` parsed.
   - Standalone vs unit: Part of מדידות שטחים — not a standalone TOC heading.
   - G3–G4 overteaching: `TOPIC_SHAPES.area.g3 = [..., "triangle"]` in `utils/geometry-constants.js` causes generator to emit triangle area from G3. Official tables show G3 measurements as "שטח ביחידות שרירותיות" (comparison/arbitrary units), no formula. This is `OVERTEACHING` pending oracle verification.
   - G5 `heights_triangle` hidden prerequisite: Yes — `lib/learning-book/geometry-g5-registry.js` contains `heights_triangle` page with no prior `triangle_area` page. Formula assumed known.
   - G6 `prism_volume_triangle` chain: `docs/learning-book/geometry/g6/drafts/prism_volume_triangle.md` depends on triangle area formula → depends on heights context → both lack an anchoring book page.
   - Remediation order (not yet implemented — oracle approval required first): oracle row → spine skill (G5+) → generator grade gate → G5 book page `triangle_area.md` (before `heights_triangle`) → practice CTA mapping → report/diagnostic grade gate → QA oracle gates.
7. **Diff report section** — oracle vs each product layer.
8. **QA gates required** — listed as future work; no changes to existing scripts in this phase.

---

## Diff report structure (inside plan doc)

The diff is **report-only**. No compared file is modified.

For each product layer, classify every mismatch with one of:

| Flag | Description | Examples |
|------|-------------|---------|
| `MISSING_REQUIRED_TOPIC` | Oracle requires; product has no skill/page/label | `triangle_area` G5 book page absent from `geometry-g5-registry.js` |
| `OVERTEACHING` | Product teaches at grade where oracle has no required row | `triangle_area` generator from G3 via `TOPIC_SHAPES.area.g3`; moledet G1 |
| `WRONG_GRADE_SCOPE` | Product grade span differs from oracle grade band | `science.plants` maxGrade 3 vs curriculum presence in G4–6 |
| `HIDDEN_PREREQUISITE` | Page/skill depends on unregistered prior skill | `heights_triangle` needs `triangle_area`; `prism_volume_triangle` needs both |
| `UNSUPPORTED_REPORT_LABEL` | Diagnostic/parent label exists without oracle row for that grade | `geo_area_triangle_formula` surfaced below G5 |
| `UNSUPPORTED_TEACHER_ASSIGNMENT` | Teacher can assign topic not in oracle for grade | Triangle area activity assignable at G3–4 |
| `SOURCE_BLOCKER` | Cannot classify match/mismatch without owner providing verified source | Science DOCX unread; English ד–ו TXT unverified; math kita PDFs unparsed |
| `NEEDS_OWNER_DECISION` | Evidence is available but classification requires pedagogy judgment | Triangle area G4 (properties only vs formula introduction) |

Layers compared (read-only):

| Layer | File(s) |
|-------|---------|
| Spine | `data/curriculum-spine/v1/skills.json` |
| Geometry generator gates | `utils/geometry-constants.js` (`TOPIC_SHAPES`, `GRADES`) |
| Math generator gates | `utils/math-constants.js` + math-question-generator.js kind branches |
| Hebrew content maps | `data/hebrew-g1-content-map.js` … `data/hebrew-g6-content-map.js` |
| English curriculum | `data/english-curriculum.js` + `data/english-questions/` |
| Science curriculum | `data/science-curriculum.js` + `data/science-questions.js` |
| Moledet/geography | `data/moledet-geography-curriculum.js` + `data/geography-questions/` |
| Book registries | `lib/learning-book/*-registry.js` (21 files) |
| Teacher/school labels | `lib/classroom-activities/classroom-skill-labels-he.js` |
| Parent report copy | `utils/parent-report-language/parent-diagnostic-explanations-he.js` |
| Diagnostic taxonomy | `utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js` |
| QA scripts (read to classify missing gates) | `scripts/verify-*.mjs`, `qa:*:closure-gate` npm scripts |

---

## What changes and what does not

| Item | Changed? |
|------|----------|
| `data/curriculum-oracle/v1/source-inventory.json` | **Created** (new file, no existing file modified) |
| `data/curriculum-oracle/v1/ministry-matrix.draft.json` | **Created** (new file) |
| `data/curriculum-oracle/v1/internal-scaffold.science.json` | **Created** (new file; NOT oracle) |
| `docs/curriculum/CURRICULUM_ORACLE_BUILD_PLAN_GRADES_1_6.md` | **Created** (new file) |
| `scripts/build-ministry-oracle-*.mjs` | **Created** (standalone tools, not wired to runtime or npm) |
| `data/curriculum-spine/v1/skills.json` | **No change** |
| Any generator, book registry, report, QA script, page, UI, copy, SQL | **No change** |

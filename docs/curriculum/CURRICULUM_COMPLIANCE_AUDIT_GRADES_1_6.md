# Curriculum Compliance Audit — Grades 1–6

**Audit date:** 2026-06-02  
**Mode:** Audit only — no code, SQL, UI, Hebrew product copy, commit, push, or deploy.  
**Policy:** Official Ministry of Education (MoE) PDF/TXT/DOCX and POP anchors are the **canonical oracle**. `data/curriculum-spine/v1/skills.json` is a **derived mirror** and must not be treated as ultimate truth until re-derived from verified official matrices.

---

## 1. Executive verdict

| Field | Value |
|-------|--------|
| **Overall status** | **RED** |
| **Launch blocker** | **Yes** — for any claim of “full Ministry alignment” across grades 1–6 |
| **Primary failure mode** | Internal spine and product surfaces are built from generators, content maps, and planning catalogs that are only **partially** anchored to per-grade official documents; several subjects lack grade×topic TXT/PDF in-repo; spine `gaps.json` / `conflicts.json` are empty and do not reflect real drift |

### Per-subject risk level

| Subject | Risk | Rationale (summary) |
|---------|------|---------------------|
| **Math** | **YELLOW** | Strong per-grade anchors (`kita1–6.pdf` URLs + `mavo1.txt`); subsection catalogs exist but are manually encoded; spine follows generator branches, not PDF subsections |
| **Geometry / גאומטריה** | **RED** | Same official thread as math PDFs; product teaches `triangle_area` from G3 without spine skill or learning-book page; G6 `prism_volume_triangle` depends on untaught formula page |
| **Hebrew** | **YELLOW** | `hebrew-1-6.pdf` + `hebrew-official-alignment-matrix.json` are strong; POP lacks per-grade pages for ב׳–ו׳; spine = content maps (derived) |
| **English** | **YELLOW** | `english Curriculum2020.pdf` + TXT grades א–ג; grades ד–ו TXT files unverified/mislabeled in catalog |
| **Science** | **RED** | DOCX + POP only; spine has **7 coarse topic rows** (grades 1–6 spans), not official per-grade outcome grid |
| **Moledet / geography** | **RED** | Official POP scope is **grades 2–4** for מולדת; product runs **G1 + G5–G6** geography; registry marks internal gaps |

---

## 2. Official source inventory (Phase 0)

### 2.1 Repo folders

| Location | Role |
|----------|------|
| `תוכנית משרד החינוך/` | Owner workspace copies: PDF/DOCX per subject |
| `תוכנית משרד החינוך קובצי TXT/` | Text extracts for search/audit (not all verified) |
| `data/hebrew-official-*.json`, `data/hebrew-ministry-source-catalog.json` | Hebrew official alignment artifacts |
| `utils/curriculum-audit/*-official-subsection-catalog.js` | Planning catalogs (manual, not auto-parsed from MoE) |
| `utils/curriculum-audit/official-curriculum-source-registry.js` | URL/PDF registry |
| `docs/curriculum-audit.md` | Advisory audit phase history (reports often not committed under `reports/curriculum-audit/`) |

### 2.2 Source file × subject × grade

| Subject | Grade | Official source file(s) in repo | Remote / POP anchor | Status |
|---------|-------|--------------------------------|---------------------|--------|
| **Math** | 1–6 | `תוכנית משרד החינוך קובצי TXT/mavo1.txt`; `mavo1.pdf`; per-grade `כיתה *.pdf` (א–ו) in PDF folder | `kita{n}.pdf` under `meyda.education.gov.il/.../tochnyotlemud/` | **OK** (grade PDFs not duplicated as TXT in repo) |
| **Math** | 1–6 | `resource_100673815.txt/.pdf` | Special-ed outline (supplement, not primary) | **Supplement** |
| **Geometry** (MoE strand) | 1–6 | **Same as math** `kita{n}.pdf` + `mavo1.txt` geometry progression table | POP geometry strand page | **OK** (strand inside math programme) |
| **Hebrew** | 1–6 | `תוכנית משרד החינוך/hebrew-1-6.pdf` | `meyda.education.gov.il/files/Curriculum/hebrew-1-6.pdf` | **OK** |
| **Hebrew** | 1 | POP grade-1 page (registry) | POP only | **Partial** |
| **Hebrew** | 2–6 | No dedicated per-grade Hebrew TXT in repo | POP general curriculum page | **BLOCKER** for automated grade×subsection oracle |
| **English** | 1–3 | `תוכנית משרד החינוך קובצי TXT/כיתה א–ג.txt` (English Curriculum 2020) | `english Curriculum2020.pdf` | **OK** |
| **English** | 4–6 | `כיתה ד/ה/ו.txt` — **unverified** in `hebrew-ministry-source-catalog.json` | POP elementary English | **BLOCKER** |
| **Science** | 1–6 | `תוכנית משרד החינוך/science Curriculum2016.docx` | POP science pedagogy | **Partial** (no per-grade TXT grid in repo) |
| **Moledet** | 2–4 | `homeland-curriculum.pdf`; POP grade 3 spec | POP elementary מולדת | **OK** for ב׳–ד׳ band |
| **Geography** | 5–6 | `tohnit-geography-5-6.pdf`; `tochnit-vav.pdf` (G6 aid) | POP (partial) | **Partial** |
| **Moledet/geography** | 1 | No MoE מולדת programme equivalent in registry | — | **BLOCKER** if product teaches full מולדת track |
| **Moledet/geography** | 5–6 | Geography PDFs; Moledet POP **not** grades 5–6 | Registry `internal_gap` | **BLOCKER** for מולדת claims |

### 2.3 Missing or stale sources

- **BLOCKER:** No machine-readable per-grade **math** `kita{n}.txt` extracts in repo (only PDFs + `mavo1.txt` overview).
- **BLOCKER:** Hebrew **ב׳–ו׳** lack per-grade official TXT/PDF splits in repo (single `hebrew-1-6.pdf` only).
- **BLOCKER:** English **ד׳–ו׳** TXT files not validated (`detected_subject: unknown_unverified` in `data/hebrew-ministry-source-catalog.json`).
- **BLOCKER:** Science has no parsed grade×domain outcome table in repo (DOCX not ingested to oracle rows).
- **STALE/UNCLEAR:** `skills.json` `generatedAt` 2026-04-25; official matrices in `utils/curriculum-audit/*.js` checkedAt 2026-05-09 — no automated re-sync pipeline to spine.
- **STALE/UNCLEAR:** `data/curriculum-spine/v1/gaps.json` and `conflicts.json` both report **count: 0** while runtime clearly contains skills absent from spine (see triangle area).

---

## 3. Ministry oracle matrix (Phase 1) — report-only

**Legend — `status`:** `required` | `optional` | `not-in-grade` | `unclear`  
**Note:** Rows below are the audit oracle skeleton. Full row expansion requires owner-approved PDF subsection pass per grade (Phase 4B math/geometry pattern). Subtopics are MoE wording where quoted from in-repo TXT; otherwise `unclear` until PDF line verification.

### 3.1 Mathematics & geometry strand (representative rows)

| subject | grade | official strand/domain | official topic | official subtopic / skill | official source file | anchor | status | notes |
|---------|-------|------------------------|----------------|----------------------------|----------------------|--------|--------|-------|
| math | 1 | מספרים | מנייה, חיבור וחיסור | עד 20 | `mavo1.txt` | כיתה א׳ column | required | |
| math | 1 | גאומטריה | צורות במישור | ריבוע, מלבן | `mavo1.txt` | כיתה א׳ | required | |
| math | 2 | מדידות | שטח | השוואה, יחידות שרירותיות | `mavo1.txt` | כיתה ב׳ | required | Not rectangle formula yet |
| math | 3 | גאומטריה | משולשים, מרובעים | תכונות צלעות וזוויות | `mavo1.txt` | כיתה ג׳ | required | |
| math | 3 | מדידות | שטח | ביחידות מידה (השוואה) | `mavo1.txt` | כיתה ג׳ | required | |
| math | 4 | מדידות | שטח והיקף | **נוסחאות שטח והיקף המלבן** | `mavo1.txt` | כיתה ד׳ | required | |
| math | 4 | גאומטריה | משולש | תכונות צלעות וזוויות במשולש | `resource_100673815.txt` | כיתה ד׳ §ו 69–91 | required | |
| math | 4 | מדידות | נפח | נפח תיבה | `mavo1.txt` / TOC | כיתה ד׳ | required | |
| math | 5 | מצולעים | מרובעים | מיון, קשרי הכלה | `resource_100673815.txt` | עמ׳ 110–113 | required | |
| math | 5 | מדידות | **מדידות שטחים** | שטח (מצולעים) | `resource_100673815.txt` | עמ׳ 114–115 | required | |
| math | 5 | מצולעים | **גבהים** | גובה לשטח | `resource_100673815.txt` | §4 עמ׳ 113 | required | Implies triangle/parallelogram/trapezoid area formulas |
| math | 5 | מדידות | שטח משולש | (בסיס×גובה)÷2 | `mavo1.txt` + TOC | כיתה ה׳ | **unclear** | Not named as standalone heading; bundled under שטחים + גבהים |
| math | 6 | גאומטריה | מעגל, גופים | נפחים, שטח מעגל | `mavo1.txt` | כיתה ו׳ | required | |
| math | 6 | גאומטריה | נפח | מנסרה / גופים משוכללים | `mavo1.txt` | כיתה ו׳ | required | Prism volume may include triangle base |
| geometry | 5 | מדידות | שטח מקבילית/טרפז | נוסחאות עם גובה | `kita5.pdf` (remote) | מדידות שטחים | required | Product has pages; see §5 |
| geometry | 5 | מדידות | שטח משולש | נוסחת משולש | `kita5.pdf` (remote) | מדידות שטחים | **unclear** | Pedagogically required before heights inverse |
| geometry | 6 | נפח | מנסרה בסיס משולש | שטח משולש × גובה | `kita6.pdf` (remote) | נפח | required | Depends on triangle area |

### 3.2 Hebrew (representative — full matrix in `data/hebrew-official-alignment-matrix.json`)

| subject | grade | official strand | official topic | official subtopic | official source | anchor | status | notes |
|---------|-------|-----------------|----------------|-------------------|-----------------|--------|--------|-------|
| hebrew | 1 | ראשית קריאה | מודעות פונולוגית | `g1.phoneme_awareness` | `hebrew-1-6.pdf` | excerpt-linked | required | Matrix row `coverage_status: partial` |
| hebrew | 1–6 | *(all domains)* | content-map subtopics | 135 spine rows | `hebrew-1-6.pdf` | char anchors | required | Derived spine; not auto-proof per stem |

### 3.3 English (representative)

| subject | grade | strand | topic | subtopic | source | status | notes |
|---------|-------|--------|-------|----------|--------|--------|-------|
| english | 1 | Exposure | listening/speaking | exposure bands | `כיתה א.txt` | required | |
| english | 3 | Literacy | reading/writing | beginning literacy | `כיתה ג.txt` | required | |
| english | 5 | Extended literacy | grammar | past simple, modals | `כיתה ה.txt` if valid | **unclear** | File content in repo matches English 2020 when opened; catalog flags unknown |

### 3.4 Science (representative)

| subject | grade | strand | topic | subtopic | source | status | notes |
|---------|-------|--------|-------|----------|--------|--------|-------|
| science | 1 | life | body, animals, plants | inquiry exposure | `science Curriculum2016.docx` | required | Spine: 1 topic row spans G1–6 |
| science | 4–6 | energy/earth | earth_space, environment | official grid | DOCX | **unclear** | Not parsed to oracle rows in repo |

### 3.5 Moledet / geography (representative)

| subject | grade | strand | topic | subtopic | source | status | notes |
|---------|-------|--------|-------|----------|--------|--------|-------|
| moledet | 2–4 | מולדת | homeland, citizenship | POP scope | `homeland-curriculum.pdf` | required | |
| moledet | 1 | — | community/maps | product topics | — | **not-in-grade** | Registry gap; product has `g1` |
| geography | 5–6 | geography | maps, Israel | `tohnit-geography-5-6.pdf` | required | Separate from מולדת ב׳–ד׳ |

---

## 4. Internal spine audit (Phase 2)

### 4.1 Spine snapshot

| Metric | Value |
|--------|-------|
| Total `skill_id` rows | **423** |
| `gaps.json` entries | **0** |
| `conflicts.json` entries | **0** |
| Build script | `scripts/build-curriculum-spine-v1.mjs` (from content maps + `declared-branches.json` + grade bindings) |
| **Policy violation** | Spine is **generator-derived**; empty gaps/conflicts give false confidence |

| subject | spine rows | grades covered |
|---------|------------|----------------|
| hebrew | 135 | 1–6 |
| math | 91 | 1–6 |
| english | 81 | 1–6 |
| geography (moledet product) | 71 | 1–6 |
| geometry | 38 | 1–6 |
| science | **7** | coarse topics only |

### 4.2 Cross-check summary (official required → product)

| Flag | Count (estimate) | Examples |
|------|------------------|----------|
| **MISSING_REQUIRED_TOPIC** | High (science, moledet G1, triangle area book) | No `geometry:kind:triangle_area` in spine; no G5/G6 triangle area learning-book page |
| **OVERTEACHING** | Medium | `triangle_area` questions from **G3** via `TOPIC_SHAPES.area.g3` includes `triangle`; moledet **G1**; science topics spanning all grades in one spine row |
| **WRONG_GRADE_SCOPE** | Medium | Science `plants` spine maxGrade 3 vs curriculum topics in G4–6; diagnostic labels exist without spine alignment |
| **HIDDEN_PREREQUISITE** | High (geometry) | `heights_triangle`, `prism_volume_triangle`, `trapezoid_area` without prior `triangle_area` teach page |

### 4.3 Geometry / triangle area — spine vs runtime

| Check | Result |
|-------|--------|
| Standalone `triangle_area` in `skills.json`? | **No** |
| `triangle_area` in `utils/geometry-question-generator.js`? | **Yes** (`area` topic, shape `triangle`) |
| Grade span (`curriculum-spine-grade-bindings.mjs`) | **G3–G6** (via `TOPIC_SHAPES.area`) |
| Diagnostic label `geo_area_triangle_formula` | **Yes** (`lib/classroom-activities/classroom-skill-labels-he.js`) |
| Parent report copy for triangle area | **Yes** |
| Learning-book draft `triangle_area.md` | **No** (G5 plan batch B teaches square area only; heights_triangle assumes area known) |

### 4.4 Subject notes

**Math:** `utils/curriculum-audit/math-official-subsection-catalog.js` encodes strands per grade; alignment to `skills.json` is via normalized keys, not 1:1 MoE subsection IDs.  
**Geometry:** Catalog does not list `triangle_area` as its own subsection; maps to broad `geometry.area`.  
**Hebrew:** Strongest official binding via `data/hebrew-official-alignment-matrix.json` (excerpt anchors).  
**English:** Spine from `data/english-curriculum.js` + pools; official catalog in `english-official-subsection-catalog.js`.  
**Science:** Spine **7 rows** vs rich `SCIENCE_GRADES` curriculum object — compliance granularity insufficient for reporting.  
**Moledet/geography:** Product subject `geography` in spine (71 rows) includes grades outside MoE מולדת POP band.

---

## 5. Surface coverage audit (Phase 3)

For each **flagged** topic, surfaces affected:

### 5.1 `triangle_area` / שטח משולש (canonical case)

| Surface | Coverage | Issue |
|---------|----------|-------|
| **A. Student learning** | `geometry-master.js`, `math-master.js` UI blocks; generator | Practice exists G3+; **no** dedicated topic gate separate from generic `area` |
| **B. Learning books** | G5 `heights_triangle.md`; G6 `prism_volume_triangle.md` | **Missing** `triangle_area.md`; prerequisite **hidden** in heights/volume pages |
| **C. Teacher / private teacher** | Activity topic lists follow spine/skills | **No** `geometry:kind:triangle_area` skill → cannot assign consistently |
| **D. School reports** | Labels via `geo_area_triangle_formula` | Reports can show weakness **without** matching teachable spine skill |
| **E. Parent / diagnostic** | `parent-diagnostic-explanations-he.js`, grade-aware templates | Can **invent** triangle-area narrative from diagnostics when book path skipped |
| **F. QA** | `qa:geometry:closure-gate`, book verifiers | **No** ministry-grade oracle gate; spine/book mismatch not failing |

### 5.2 Science coarse spine (grades 1–6)

| Surface | Issue |
|---------|-------|
| Learning books | Per-grade books exist; spine does not enumerate official outcomes |
| Teacher/school filters | Topic = 7 buckets → cannot map to MoE grade-specific objectives |
| Parent report | Thin-data may collapse to topic label, not official strand |
| QA | `verify-science-books.mjs` checks runtime vs spine, **not** vs MoE grid |

### 5.3 Moledet grade 1

| Surface | Issue |
|---------|-------|
| Student learning | `moledet-geography-curriculum.js` G1 active |
| Official | POP מולדת יסודי **2–4** |
| School/parent | Reports may show G1 מולדת skills as if curriculum-backed |

### 5.4 QA / verifiers inventory (existing vs required)

| Verifier | Exists | Ministry oracle |
|----------|--------|-----------------|
| `build:curriculum-spine` | Yes | **No** — builds from internal maps |
| `verify-*-learning-book-master-scope.mjs` | Per subject | Spine only |
| `audit:curriculum:*` (math/geometry/hebrew/english/science/moledet) | Yes | Planning reports; outputs often absent from `reports/curriculum-audit/` |
| `qa:*:closure-gate` | Per subject | Runtime + catalog, not MoE PDF rows |
| **Required (missing)** | — | `no-unsupported-topic` gate vs ministry matrix; `spine-must-match-official-oracle` gate |

---

## 6. Triangle area case study (Phase 4)

### 6.1 Is שטח משולש officially required?

**Yes**, as a **measurement competency** in upper elementary — not always as an isolated chapter title.

Evidence in-repo:

- `mavo1.txt` progression: כיתה **ה׳** — `נוסחאות השטח` with `ריצוף, גבהים`; כיתה **ד׳** — rectangle area/perimeter formulas; triangle **properties** (not full area formula row) in ד׳.
- `resource_100673815.txt` כיתה **ה׳**: `ה. מדידות שטחים` (pp. 114–115); `4. גבהים` (p. 113).
- `mismach_hatamot.txt`: rectangle area via multiplication (כיתה ג׳ context); supports area as measurement, not standalone triangle chapter name.

**Verdict:** Required skill bundled under **מדידות שטחים** + **גבהים**, likely **grade 5** for formula and **grade 6** for volume applications.

### 6.2 First official grade

| Interpretation | Grade |
|----------------|-------|
| Triangle **recognition** / properties | **ג׳–ד׳** |
| Rectangle area **formula** | **ד׳** |
| Triangle area **formula** (base×height÷2) | **ה׳** (unclear as standalone TOC line; strong pedagogical placement) |
| Triangle-base **prism volume** | **ו׳** |

### 6.3 Independent topic vs part of another unit?

**Part of** מדידות שטחים / גאומטריה מצולעים — not a separate MoE TOC entry named `שטח משולש` in extracted TXT.

### 6.4 Current product state

| Layer | State |
|-------|--------|
| Spine | **Missing** `geometry:kind:triangle_area` |
| Generator | **Active** G3–G6 under `area` + shape `triangle` |
| Books | **Missing** dedicated page; `heights_triangle` (G5) and `prism_volume_triangle` (G6) reference formula in prose |
| Diagnostics/reports | **Present** (`geo_area_triangle_formula`, parent copy) |
| Master UI | **Present** (שטח משולש sections in geometry/math master) |

### 6.5 Root cause

1. **Spine build** sources `declared-branches.json` kind literals — `triangle_area` omitted while still emitted by generator switch on shape.  
2. **Learning-book planning** used `skills.json` as truth — omitted page because skill row absent.  
3. **Grade bindings** allow G3 triangle in `area` — earlier than MoE formula progression (possible **OVERTEACHING** or exposure-only without label discipline).  
4. **No ministry oracle gate** in CI — `gaps.json` stays empty.

### 6.6 Recommended correction (no implementation)

1. Add ministry-oracle row: `geometry | 5 | מדידות | שטח משולש | (ב×ג)÷2 | kita5.pdf | required`.  
2. Re-derive spine: add `geometry:kind:triangle_area` with `minGrade: 5`, `maxGrade: 6` (or 5 only if exposure G3–4 is reclassified).  
3. Add learning-book `geometry:g5:triangle_area` **before** `heights_triangle` and G6 volume pages.  
4. Gate generator: restrict `triangle_area` kind to official grades; keep G3–4 triangle **properties** only under `triangles` / `triangle_perimeter`.  
5. Block teacher assignment and parent diagnostic labels until spine + book exist (thin-data: suppress `geo_area_triangle_formula` below G5).  
6. **Do not** patch only `prism_volume_triangle` — fix ordering at oracle level first.

---

## 7. Remediation plan (Phase 5 — planning only)

### 7.1 Governance

1. Freeze `skills.json` as **downstream artifact** — publish `data/curriculum-oracle/v1/ministry-matrix.json` (from PDF/TXT passes) as upstream.  
2. Regenerate spine only from oracle + explicit owner-approved deltas.  
3. Populate `gaps.json` / `conflicts.json` from oracle diff, not empty placeholders.

### 7.2 What to add

- Per-grade TXT or parsed tables for **math** `kita1–6`, **science** DOCX, **English** ד–ו verification.  
- `geometry:kind:triangle_area` skill + G5 learning-book page + practice CTA mapping.  
- Science spine rows per official grade×domain (not 7 global topics).  
- Moledet: document G1 as enrichment or add official source.  
- CI: `ministry-oracle-vs-spine`, `ministry-oracle-vs-generator`, `ministry-oracle-vs-book-registry`.

### 7.3 What to remove / disable

- Moledet **G1** from teacher/school default curriculum pickers until sourced.  
- `triangle_area` generator below official formula grade (likely G3–4) or mark as `exposure_only` without diagnostics.  
- Parent/teacher labels for skills not in oracle for that grade.

### 7.4 What to move between grades

- Audit all `TOPIC_SHAPES` vs `mavo1.txt` columns (parallelogram/trapezoid G5, circle G6, etc.).  
- Science topic items tagged G4–6 inside `plants` spine row — split spans.

### 7.5 What to rename

- Internal docs: stop citing `skills.json` as “Sources of Truth” in learning-book plans — cite ministry matrix + spine mirror.  
- Diagnostic keys: align `geo_area_triangle_formula` to `geometry:kind:triangle_area` once spine exists.

### 7.6 QA gates to add (never again)

| Gate | Rule |
|------|------|
| `oracle-spine-diff` | Every required oracle row → `skill_id` or explicit gap with owner waiver |
| `oracle-runtime-diff` | Every generator `kind` → oracle row or `unsupported` flag |
| `oracle-book-diff` | Every book `skill_id` → oracle row; prerequisite graph acyclic vs oracle order |
| `oracle-report-diff` | No diagnostic label without oracle backing for grade |
| `no-unsupported-topic` | Teacher/school activity creation rejects off-oracle topics |

---

## 8. Appendix — internal file map for implementers

| Purpose | Path |
|---------|------|
| Derived spine | `data/curriculum-spine/v1/skills.json` |
| Spine build | `scripts/build-curriculum-spine-v1.mjs`, `scripts/curriculum-spine-grade-bindings.mjs` |
| Math curriculum | `utils/math-constants.js`, `utils/math-question-generator.js` |
| Geometry curriculum | `utils/geometry-constants.js`, `utils/geometry-question-generator.js` |
| Hebrew maps | `data/hebrew-g*-content-map.js`, `data/hebrew-official-alignment-matrix.json` |
| English | `data/english-curriculum.js`, `data/english-questions/` |
| Science | `data/science-curriculum.js`, `data/science-questions.js` |
| Moledet/geography | `data/moledet-geography-curriculum.js`, `data/geography-questions/` |
| Audit catalogs | `utils/curriculum-audit/*-official-subsection-catalog.js` |
| Registry | `utils/curriculum-audit/official-curriculum-source-registry.js` |
| Advisory docs | `docs/curriculum-audit.md` |

---

## 9. Sign-off criteria (for GREEN)

1. All cells in §2.2 **BLOCKER** resolved with verified files.  
2. Ministry matrix exported and versioned; spine regenerated with non-zero gap reporting where intentional.  
3. Triangle area (and any similar findings from full matrix pass) resolved: oracle grade, spine, book order, generator gate, report labels.  
4. Science and moledet spine granularity matches official grade bands.  
5. All `qa:*:closure-gate` scripts extended to fail on oracle drift.

**End of audit report.**

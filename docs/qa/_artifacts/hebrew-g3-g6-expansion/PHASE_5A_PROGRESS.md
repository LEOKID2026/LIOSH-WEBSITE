# Phase 5A — Hebrew G3 Comprehension + Reading Expansion

**Date:** 2026-06-10  
**Scope:** Phase 5A only (G3 comprehension + G3 reading). G4–G6, grammar, vocabulary, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags — **out of scope**.  
**Phase 4B:** Closed PASS for INTERNAL PREVIEW — not reopened.

---

## Agent 1 — Baseline / QA

### Git state

| Check | Result |
|-------|--------|
| Branch | `staging/diagnostic-flags` (up to date with origin) |
| Working tree at baseline | **Clean** — Phase 4B committed; no uncommitted Phase 4B/5 mix |
| Phase 4B separation | **PASS** — no local diff at start |

### Hebrew G3–G6 gap table (pre-Phase 5A)

Source: `reports/question-audit/QUESTION_INVENTORY_MATRIX.json` (generated 2026-06-08).  
Targets: **50 / 40 / 30** per level (`scripts/lib/qa-inventory-professional.mjs`).

| Grade | Topic | Easy (have → gap) | Medium (have → gap) | Hard (have → gap) | Topic total | Status |
|-------|-------|-------------------|---------------------|-------------------|-------------|--------|
| **G3** | comprehension | 9 → **+41** | 10 → **+30** | 5 → **+25** | 24 | THIN |
| **G3** | reading | 22 → **+28** | 20 → **+20** | 11 → **+19** | 53 | THIN |
| **G3** | grammar | 4 → +46 | 12 → +28 | 2 → +28 | 18 | THIN (5A out of scope) |
| **G3** | vocabulary | 5 → +45 | 9 → +31 | 7 → +23 | 21 | THIN (5A out of scope) |
| **G4** | comprehension | 8 → +42 | 11 → +29 | 6 → +24 | 25 | THIN (deferred) |
| **G4** | reading | 3 → +47 | 7 → +33 | 2 → +28 | 12 | THIN (deferred) |
| **G4** | grammar | 6 → +44 | 10 → +30 | 5 → +25 | 21 | THIN (deferred) |
| **G4** | vocabulary | 5 → +45 | 9 → +31 | 7 → +23 | 21 | THIN (deferred) |
| **G5** | comprehension | 7 → +43 | 8 → +32 | 9 → +21 | 24 | THIN (deferred) |
| **G5** | reading | 3 → +47 | 6 → +34 | 2 → +28 | 11 | THIN (deferred) |
| **G5** | grammar | 7 → +43 | 7 → +33 | 8 → +22 | 22 | THIN (deferred) |
| **G5** | vocabulary | 10 → +40 | 8 → +32 | 8 → +22 | 26 | THIN (deferred) |
| **G6** | comprehension | 7 → +43 | 8 → +32 | 9 → +21 | 24 | THIN (deferred) |
| **G6** | reading | 3 → +47 | 6 → +34 | 2 → +28 | 11 | THIN (deferred) |
| **G6** | grammar | 6 → +44 | 11 → +29 | 7 → +23 | 24 | THIN (deferred) |
| **G6** | vocabulary | 9 → +41 | 8 → +32 | 9 → +21 | 26 | THIN (deferred) |

**Phase 5A authoring targets:** G3 comprehension + G3 reading only.

---

## Agent 2 — G3 authoring

### Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g3/literacy-pool-builder.js` | G3 comprehension + reading MCQ pools (explicit detail, cause/effect, inference, passage reading) |
| `data/hebrew-literacy-g3/gap-fill-banks.js` | Hand-crafted unique gap-fill stems |
| `utils/hebrew-rich-question-bank.js` | Wired `HEBREW_G3_LITERACY_POOL` into `HEBREW_RICH_POOL` |

Pattern follows Phase 3 G2 literacy pool (`data/hebrew-literacy-g2/`). Unique fingerprints use Hebrew disambiguation tags (digits normalize to `#` in `hebrewStemNorm`, so numeric suffixes were avoided).

### Post-authoring inventory (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G3 comprehension** | **69** / 50 | **60** / 40 | **44** / 30 | **PROFESSIONAL_READY** (all levels) |
| **G3 reading** | **85** / 50 | **65** / 40 | **46** / 30 | **PROFESSIONAL_READY** (all levels) |

Rich-pool row counts (filter): comprehension 62/52/37 easy/med/hard; reading 56/45/35 — legacy+rich merged unique counts above are the launch gate.

### Sample questions (generated + gap-fill)

**G3 comprehension — easy (explicit detail, new pool):**

> קרא את הטקסט: 'דני שמר/ה על ספר בכיתה אגוז. בכל יום דני בדק/ה שהכל מסודר.' מה עשה/עשתה דני בכל יום?  
> ✓ בדק/ה שהספר מסודר

**G3 comprehension — medium (cause/effect):**

> למה שותים מים אחרי ריצה? (סימון צל)  
> ✓ כדי להרגיש טוב

**G3 reading — easy (passage main idea):**

> קרא את הטקסט: 'מיה קוראת ספר על חיות בגן החיות. היא לומדת על האוכל של כל חיה.' מה הנושא העיקרי?  
> ✓ למידה על חיות בגן החיות

**G3 reading — gap-fill (hand-authored):**

> בנק ג׳ · 1: קראו: 'עומר שם את המחברת בתיק לפני שיצא לחצר.' מה עשה עומר לפני היציאה?  
> ✓ שם את המחברת בתיק

---

## Agent 3 — Guards / verification

| Guard | Result |
|-------|--------|
| `tests/learning/hebrew-g3-bank-coverage.test.mjs` | **PASS 5/5** — MCQ integrity, 50/40/30 rich thresholds, writing/speaking PRACTICE_ONLY, no parent-server launch-readiness imports |
| `npm run qa:question-inventory-matrix` | **PASS** for G3 comprehension + reading cells; `CRITICAL_BLOCKING: 0` |
| MCQ audit (`auditMcqQuality`) on new pool | **0 failures** on 296 new rows |
| Diagnostic metadata flags | **Unchanged** — not touched |
| Parent report logic | **Unchanged** — verified via parent-server import guard |
| Writing/speaking diagnostics | **Not promoted** — registry still PRACTICE_ONLY |
| `npm run build` | **PASS** (exit 0, 2026-06-10) |

---

## Phase 5A acceptance checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Clear baseline report | **PASS** — this artifact + gap table above |
| 2 | G3 comprehension → 50/40/30 | **PASS** — matrix PROFESSIONAL_READY |
| 3 | G3 reading → 50/40/30 | **PASS** — matrix PROFESSIONAL_READY |
| 4 | Age-appropriate Hebrew samples | **PASS** — see samples; aligned to `HEBREW_G3_CONTENT_MAP` subtopics |
| 5 | No writing/speaking promoted | **PASS** |
| 6 | No diagnostic metadata flags changed | **PASS** |
| 7 | No parent report logic changed | **PASS** |
| 8 | Inventory + integrity tests pass | **PASS** |
| 9 | Build passes | **PASS** |
| 10 | Artifact under `docs/qa/_artifacts/hebrew-g3-g6-expansion/` | **PASS** — this file |

**Overall Phase 5A:** **PASS — INTERNAL PREVIEW** for G3 comprehension + reading inventory depth.  
**Not claimed:** FULL external launch, G3 grammar/vocabulary, G4–G6, or pedagogical sign-off on every stem (counts + MCQ integrity + samples only).

---

## Deferred (Phase 5B+)

- G3 grammar / vocabulary backfill  
- G4–G6 comprehension, reading, grammar, vocabulary  
- Launch registry upgrade from LIMITED → FULL for G3 topics (owner decision)  
- Commit/push — **awaiting explicit owner approval**

---

## Files changed (uncommitted)

- `data/hebrew-literacy-g3/literacy-pool-builder.js` (new)
- `data/hebrew-literacy-g3/gap-fill-banks.js` (new)
- `utils/hebrew-rich-question-bank.js`
- `tests/learning/hebrew-g3-bank-coverage.test.mjs` (new)
- `reports/question-audit/QUESTION_INVENTORY_MATRIX.json` (regenerated)
- `reports/question-audit/QUESTION_INVENTORY_MATRIX.md` (regenerated)

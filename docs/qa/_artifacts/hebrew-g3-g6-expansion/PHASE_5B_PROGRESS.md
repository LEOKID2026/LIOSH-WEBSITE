# Phase 5B — Hebrew G3 Grammar + Vocabulary Expansion

**Date:** 2026-06-10  
**Scope:** G3 grammar + G3 vocabulary only → **50/40/30** MCQ coverage. G4–G6, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Phase 5A:** G3 comprehension + reading remain PASS; shared text-quality guard fixes applied to `literacy-pool-builder.js` only (no content reopening beyond fingerprint-safe passage templates).

---

## Baseline table (pre-Phase 5B)

Source: `QUESTION_INVENTORY_MATRIX.json` (Phase 5A artifact, 2026-06-08) + rich-pool filter counts at 5B start.

| Topic | Easy (have → gap) | Medium (have → gap) | Hard (have → gap) | Status |
|-------|-------------------|---------------------|-------------------|--------|
| **G3 grammar** | 4 → +46 | 12 → +28 | 2 → +28 | THIN |
| **G3 vocabulary** | 5 → +45 | 9 → +31 | 7 → +23 | THIN |
| G3 comprehension | 69 / 50 | 60 / 40 | 44 / 30 | PASS (5A — not reopened) |
| G3 reading | 85 / 50 | 65 / 40 | 46 / 30 | PASS (5A — not reopened) |

Rich-pool row counts at 5B start: grammar **2/3/2**; vocabulary **1/4/2** (legacy + grade-gated rich rows).

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G3 grammar** | **66** / 50 | **54** / 40 | **34** / 30 | **PROFESSIONAL_READY** |
| **G3 vocabulary** | **57** / 50 | **68** / 40 | **39** / 30 | **PROFESSIONAL_READY** |
| G3 comprehension | 69 / 50 | 55 / 40 | 42 / 30 | PROFESSIONAL_READY (unchanged PASS) |
| G3 reading | 85 / 50 | 65 / 40 | 46 / 30 | PROFESSIONAL_READY (unchanged PASS) |

Rich-pool filter counts (merged legacy + rich): grammar **64/45/34**; vocabulary **53/63/34**.

**Matrix gate:** `CRITICAL_BLOCKING: 0`

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g3/grammar-vocabulary-banks.js` | **New** — 136 grammar + 143 vocabulary G3 MCQs (tense, POS, connectors, punctuation, agreement, roots/binyan, meaning, synonyms, families, context, antonyms, cloze, compare) |
| `data/hebrew-literacy-g3/literacy-pool-builder.js` | Wired grammar/vocab pools; shared quality guard (gender-specific Hebrew, no `סימון`, diversified passage templates) |
| `tests/learning/hebrew-g3-bank-coverage.test.mjs` | Extended: grammar + vocabulary 50/40/30 assertions |
| `tests/learning/hebrew-g3-text-quality.mjs` | **New** — blocker pattern scan (gender-slash, סימון, numbered stems, latin tokens) |

Subtopics: `g3.tense_system_intro`, `g3.connectors`, `g3.binyan_light`, `g3.word_families`, `g3.context_meaning`.

---

## Sample questions

### G3 grammar

**Easy (tense):**  
> באיזה זמן הפועל 'אוכל'?  
> ✓ הווה

**Medium (connectors):**  
> איזו מילה מתאימה: 'למדתי היטב, ___ קיבלתי ציון טוב'?  
> ✓ ולכן

**Hard (tense comparison):**  
> מה ההבדל: 'כתב' לעומת 'יכתוב'?  
> ✓ עבר לעומת עתיד

### G3 vocabulary

**Easy (meaning):**  
> מה פירוש 'עייף'?  
> ✓ רוצה לנוח

**Medium (context cloze):**  
> אחרי הריצה הרגשתי ___.  
> ✓ עייף

**Hard (word compare):**  
> מה ההבדל: 'ללמוד' לעומת 'לשנן'?  
> ✓ לשנן — לזכור בעל פה

---

## Failed / rejected examples (cleaned)

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Gender-slash forms | `שמר/ה`, `בדק/ה`, `מה עשה/עשתה` | Gender-specific verbs via `g3GenderForms()` |
| סימון tags | `למה שותים מים? (סימון צל)` | Removed; 20 distinct cause stems + natural place suffixes in `expandPool` overflow |
| Generator numbered stems | `שאלה 3: מה שורש...` | Deleted broken generator; static hand-crafted banks |
| Latin verb forms | `yaruts`, `yochal` in distractors | Removed with generator rewrite |
| Conjugation-only distractors | `יושבת` vs `יושב`/`יושבים` (MCQ audit near-duplicate) | Converted to **בחרו משפט נכון** full-sentence items |
| Antonym-paraphrase leak | `'קצר'` → `'לא ארוך'` with distractor `'ארוך'` | Descriptive definitions: `'יש לו מעט אורך'` |
| Odd root notation | `'י.ר.ה'` for מורה | Changed to `'י-ר-ה'` on `'מלמד'` |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g3-bank-coverage.test.mjs` | **PASS 7/7** |
| `node --test tests/learning/hebrew-g3-text-quality.mjs` | **PASS 2/2** |
| MCQ audit on full `HEBREW_G3_LITERACY_POOL` | **0 failures** |
| Text-quality scan (gender-slash, סימון) | **0 blockers** |
| `npm run qa:question-inventory-matrix` | G3 grammar + vocabulary **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G3 writing / speaking | **PRACTICE_ONLY** (unchanged) |

---

## Final verdict

**Phase 5B: PASS** for INTERNAL PREVIEW scope.

- G3 grammar: **66 / 54 / 34** unique usable (targets 50 / 40 / 30) ✓  
- G3 vocabulary: **57 / 68 / 39** unique usable (targets 50 / 40 / 30) ✓  
- MCQ integrity: **0 failures** ✓  
- Text-quality scan: **clean** ✓  
- Inventory matrix: grammar + vocabulary **PROFESSIONAL_READY** ✓  
- Build: **PASS** ✓  
- Out-of-scope surfaces untouched ✓  

**Deferred:** G4–G6 grammar/vocabulary (Phase 5C+).

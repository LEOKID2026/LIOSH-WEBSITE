# Phase 5D — Hebrew G4 Grammar + Vocabulary Expansion

**Date:** 2026-06-10  
**Scope:** G4 grammar + G4 vocabulary only → **50/40/30** MCQ coverage. G5–G6, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Prior phases:** G3 all six literacy topics PROFESSIONAL_READY (5A/5B); G4 comprehension + reading PROFESSIONAL_READY (5C).

---

## G4 grammar / vocabulary baseline (pre-Phase 5D)

Source: matrix + rich-pool filter at 5D start.

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G4 grammar** | 6 → 50 | 10 → 40 | 5 → 30 | THIN |
| **G4 vocabulary** | 5 → 50 | 9 → 40 | 7 → 30 | THIN |

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G4 grammar** | **60** / 50 | **56** / 40 | **41** / 30 | **PROFESSIONAL_READY** |
| **G4 vocabulary** | **57** / 50 | **51** / 40 | **39** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts: grammar **56/49/38**; vocabulary **53/46/34**.  
G4 literacy pool total: **546** rows (284 comp/reading + 136 grammar + 126 vocabulary).

**Matrix gate:** `CRITICAL_BLOCKING: 0`

### G3 + G4 comprehension/reading guard (unchanged)

| Topic | Easy | Medium | Hard | Status |
|-------|------|--------|------|--------|
| G3 comprehension | 69 / 50 | 55 / 40 | 42 / 30 | PROFESSIONAL_READY |
| G3 reading | 85 / 50 | 65 / 40 | 46 / 30 | PROFESSIONAL_READY |
| G3 grammar | 66 / 50 | 54 / 40 | 34 / 30 | PROFESSIONAL_READY |
| G3 vocabulary | 57 / 50 | 68 / 40 | 39 / 30 | PROFESSIONAL_READY |
| G4 comprehension | 63 / 50 | 56 / 40 | 43 / 30 | PROFESSIONAL_READY |
| G4 reading | 58 / 50 | 52 / 40 | 39 / 30 | PROFESSIONAL_READY |

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g4/grammar-vocabulary-banks.js` | **New** — 136 grammar + 126 vocabulary G4 MCQs |
| `data/hebrew-literacy-g4/literacy-pool-builder.js` | Wired grammar/vocab pools into `HEBREW_G4_LITERACY_POOL` |
| `tests/learning/hebrew-g4-bank-coverage.test.mjs` | Extended: grammar + vocabulary 50/40/30; G3/G4 comp-reading guard |

Subtopics: `g4.dictation_spot_error`, `g4.root_pattern_intro`, `g4.literary_lexicon_light`, `g4.idiom_light`.

---

## Sample questions

### G4 grammar

**Easy (agreement / spot error):**  
> בחרו משפט נכון:  
> ✓ הילדה הקטנה יושבת על הספסל בגינה

**Medium (connectors / tense):**  
> בחרו משפט נכון עם מילת קישור:  
> ✓ למדתי היטב, ולכן קיבלתי ציון גבוה

**Hard (sentence structure):**  
> בחרו משפט שבו סדר המילים נכון:  
> ✓ אתמול תכננו את הפרויקט, ומחר נציג אותו בכיתה

### G4 vocabulary

**Easy (literary meaning):**  
> בקטע הסיפורי, ה___ מתאר את האירועים מההתחלה ועד הסוף.  
> ✓ עלילה

**Medium (synonym / precise choice):**  
> מה נרדף ל'מרגש' בתיאור סיפור?  
> ✓ מרתק ומעורר התרגשות

**Hard (compare / idiom):**  
> מה ההבדל: 'דימוי' לעומת 'מטפורה'?  
> ✓ דימוי — עם 'כמו', מטפורה — בלי

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Antonym-paraphrase leak | `'קצר'` → `'לא ארוך'` with distractor `'ארוך'` | Descriptive definitions: `'יש לו מעט אורך'` |
| Short stem-keyword answers | `'עבר'`, `'שורש כ.ת.ב'` alone | Full phrases: `'הפועל במשפט נמצא בזמן עבר'`, `'שורש כ.ת.ב'` with `'שורש'` prefix in question only |
| Conjugation-only distractors | `יושב` / `יושבים` / `יושבת` without sentence | Converted to **בחרו משפט נכון** full-sentence items |
| Gender-slash forms | `שמר/ה`, `עשה/עשתה` | Gender-specific verbs in separate sentence variants |
| Negated stem in distractor | `'לא שמח'` as definition with `'שמח'` option | `'מרגיש טוב'` / `'עצוב ומדוכא'` style definitions |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g4-bank-coverage.test.mjs` | **PASS 10/10** |
| MCQ audit on full `HEBREW_G4_LITERACY_POOL` (546 rows) after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G4 pool) | **0 blockers** |
| `npm run qa:question-inventory-matrix` | G4 grammar + vocabulary **PROFESSIONAL_READY**; all G3 + G4 comp/reading **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G4 writing / speaking | **PRACTICE_ONLY** (unchanged) |

---

## Final verdict

**Phase 5D: PASS** for INTERNAL PREVIEW scope.

- G4 grammar: **60 / 56 / 41** unique usable (targets 50 / 40 / 30) ✓  
- G4 vocabulary: **57 / 51 / 39** unique usable (targets 50 / 40 / 30) ✓  
- All completed G3/G4 literacy topics remain **PROFESSIONAL_READY** ✓  
- MCQ integrity: **0 failures** ✓  
- Text-quality scan: **clean** ✓  
- Inventory matrix: **pass** for scoped cells ✓  
- Build: **pass** ✓  

**Out of scope (unchanged):** G5–G6, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI redesign.

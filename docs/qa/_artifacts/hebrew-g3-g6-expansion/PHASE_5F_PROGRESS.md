# Phase 5F — Hebrew G5 Grammar + Vocabulary Expansion

**Date:** 2026-06-10  
**Scope:** G5 grammar + G5 vocabulary only → **50/40/30** MCQ coverage. G6, G5 comprehension/reading (reopen only on shared guard), English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Prior phases:** G3 all six literacy topics PROFESSIONAL_READY (5A/5B); G4 all four literacy topics PROFESSIONAL_READY (5C/5D); G5 comprehension + reading PROFESSIONAL_READY (5E).

---

## G5 grammar / vocabulary baseline (pre-Phase 5F)

Source: matrix + rich-pool filter at 5F start.

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G5 grammar** | 7 → 50 | 7 → 40 | 8 → 30 | THIN |
| **G5 vocabulary** | 10 → 50 | 8 → 40 | 8 → 30 | THIN |

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G5 grammar** | **72** / 50 | **57** / 40 | **44** / 30 | **PROFESSIONAL_READY** |
| **G5 vocabulary** | **80** / 50 | **53** / 40 | **44** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts: grammar **69/53/42**; vocabulary **73/47/39**.  
G5 literacy pool total: **586** rows (284 comp/reading + 151 grammar + 151 vocabulary).

**Matrix gate:** `CRITICAL_BLOCKING: 0`

### G3 + G4 + G5 guard (all completed topics remain PROFESSIONAL_READY)

| Topic | Easy | Medium | Hard | Status |
|-------|------|--------|------|--------|
| G3 comprehension | 69 / 50 | 55 / 40 | 42 / 30 | PROFESSIONAL_READY |
| G3 reading | 85 / 50 | 65 / 40 | 46 / 30 | PROFESSIONAL_READY |
| G3 grammar | 66 / 50 | 54 / 40 | 34 / 30 | PROFESSIONAL_READY |
| G3 vocabulary | 57 / 50 | 68 / 40 | 39 / 30 | PROFESSIONAL_READY |
| G4 comprehension | 63 / 50 | 56 / 40 | 43 / 30 | PROFESSIONAL_READY |
| G4 reading | 58 / 50 | 52 / 40 | 39 / 30 | PROFESSIONAL_READY |
| G4 grammar | 60 / 50 | 56 / 40 | 41 / 30 | PROFESSIONAL_READY |
| G4 vocabulary | 57 / 50 | 51 / 40 | 39 / 30 | PROFESSIONAL_READY |
| G5 comprehension | 54 / 50 | 53 / 40 | 46 / 30 | PROFESSIONAL_READY |
| G5 reading | 53 / 50 | 51 / 40 | 39 / 30 | PROFESSIONAL_READY |

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g5/grammar-vocabulary-banks.js` | **New** — 151 grammar + 151 vocabulary G5 MCQs |
| `data/hebrew-literacy-g5/literacy-pool-builder.js` | Wired grammar/vocab pools into `HEBREW_G5_LITERACY_POOL` |
| `tests/learning/hebrew-g5-bank-coverage.test.mjs` | Extended: grammar + vocabulary 50/40/30; G3/G4/G5 comp-reading guard |

Subtopics: `g5.syntax_agreement`, `g5.verb_patterns`, `g5.semantic_fields`, `g5.academic_starter_words`.

Grammar coverage: tense/verb usage, parts of speech, connectors, punctuation, agreement, sentence structure, roots/word families, subject/predicate, light active/passive.  
Vocabulary coverage: semantic fields, academic starters, meaning in context, synonyms/antonyms, word families, precise choice, cloze, close-meaning comparison, light idioms.

---

## Sample questions

### G5 grammar

**Easy (agreement / tense):**  
> בחרו משפט נכון:  
> ✓ התלמידה החרוצה מסיימת את המשימה בזמן

**Medium (connectors / tense compare):**  
> בחרו משפט נכון עם מילת קישור:  
> ✓ קראנו את המקורות, ולכן כתבנו סיכום מדויק

**Hard (complex structure / connectors):**  
> בחרו משפט נכון עם 'אף על פי':  
> ✓ אף על פי שהיה קשה, סיימנו את הפרויקט

### G5 vocabulary

**Easy (semantic field):**  
> אילו מילים שייכות לשדה המילים של בית הספר?  
> ✓ מחברת, מורה, שיעור וכיתה

**Medium (synonym / academic starter):**  
> במשפט: 'לפיכך, החלטנו לשנות את התוכנית' — מה עושה 'לפיכך'?  
> ✓ מסיקה מסקנה מהרעיון שקדם

**Hard (compare close meanings):**  
> מה ההבדל: 'נושא' לעומת 'מסר'?  
> ✓ נושא — על מה, מסר — מה ללמוד

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Near-duplicate passive distractors | `השער נפתח…שומר` vs `…שומרים` triggered multiple_correct | Replaced with distinct passive item: `התוצאות הוצגו…` vs active/wrong-voice distractors |
| סימון tag false positive | `'נפל לי האסימון'` matched quality scan | Rephrased idiom stem: `'פתאום עלה לי הרעיון הנכון'` |
| Short stem-keyword answers | `'עבר'`, `'שורש כ.ת.ב'` alone | Full phrases: `'הפועל במשפט נמצא בזמן עבר'`, descriptive root answers |
| Antonym-paraphrase leak | `'לא ארוך'` with distractor `'ארוך'` | Descriptive definitions only |
| Conjugation-only distractors | isolated verb forms without sentence | Converted to **בחרו משפט נכון** full-sentence items |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g5-bank-coverage.test.mjs` | **PASS 11/11** |
| MCQ audit on full `HEBREW_G5_LITERACY_POOL` (586 rows) after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G5 pool) | **0 blockers** |
| G3/G4 regression tests | **PASS 17/17** |
| `npm run qa:question-inventory-matrix` | G5 grammar + vocabulary **PROFESSIONAL_READY**; all G3/G4/G5 comp/reading **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0; isolated retry after prior Windows ENOENT flakes) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G5 writing / speaking | **PRACTICE_ONLY** (unchanged) |

---

## Final verdict

**Phase 5F: PASS** for INTERNAL PREVIEW scope.

- G5 grammar: **72 / 57 / 44** unique usable (targets 50 / 40 / 30) ✓  
- G5 vocabulary: **80 / 53 / 44** unique usable (targets 50 / 40 / 30) ✓  
- All completed G3/G4/G5 literacy topics remain **PROFESSIONAL_READY** ✓  
- MCQ audit **0 failures**; text-quality **0 blockers**; matrix **CRITICAL_BLOCKING: 0** ✓  
- `npm run build`: **PASS** (exit 0) ✓  
- No parent report, diagnostic metadata, SQL, or UI changes ✓  

**G5 literacy status:** All four MCQ topics (comprehension, reading, grammar, vocabulary) are now **PROFESSIONAL_READY**. Writing/speaking remain **PRACTICE_ONLY**.

**Next:** Phase 5G (or equivalent) — G6 literacy expansion.

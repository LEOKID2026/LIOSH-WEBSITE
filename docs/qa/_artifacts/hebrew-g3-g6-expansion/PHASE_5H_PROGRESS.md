# Phase 5H — Hebrew G6 Grammar + Vocabulary Expansion

**Date:** 2026-06-10  
**Scope:** G6 grammar + G6 vocabulary only → **50/40/30** MCQ coverage. English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Prior phases:** G3–G5 all four literacy topics PROFESSIONAL_READY (5A–5F); G6 comprehension + reading PROFESSIONAL_READY (5G).

---

## G6 grammar / vocabulary baseline (pre-Phase 5H)

Source: matrix + rich-pool filter at 5H start.

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G6 grammar** | 6 → 50 | 11 → 40 | 7 → 30 | THIN |
| **G6 vocabulary** | 9 → 50 | 8 → 40 | 9 → 30 | THIN |

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G6 grammar** | **71** / 50 | **61** / 40 | **43** / 30 | **PROFESSIONAL_READY** |
| **G6 vocabulary** | **79** / 50 | **53** / 40 | **45** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts: grammar **69/53/42**; vocabulary **73/47/39**.  
G6 literacy pool total: **586** rows (284 comp/reading + 151 grammar + 151 vocabulary).

**Matrix gate:** `CRITICAL_BLOCKING: 0`

### G3 + G4 + G5 + G6 guard (all completed MCQ topics remain PROFESSIONAL_READY)

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
| G5 grammar | 72 / 50 | 57 / 40 | 44 / 30 | PROFESSIONAL_READY |
| G5 vocabulary | 80 / 50 | 53 / 40 | 44 / 30 | PROFESSIONAL_READY |
| G6 comprehension | 54 / 50 | 53 / 40 | 46 / 30 | PROFESSIONAL_READY |
| G6 reading | 54 / 50 | 51 / 40 | 39 / 30 | PROFESSIONAL_READY |

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g6/grammar-vocabulary-banks.js` | **New** — 151 grammar + 151 vocabulary G6 MCQs |
| `data/hebrew-literacy-g6/literacy-pool-builder.js` | Wired grammar/vocab pools into `HEBREW_G6_LITERACY_POOL` |
| `tests/learning/hebrew-g6-bank-coverage.test.mjs` | Extended: grammar + vocabulary 50/40/30; G3–G5 + G6 comp/reading guard |

Subtopics: `g6.possession_prep`, `g6.subject_verb_advanced`, `g6.complex_syntax_spot`, `g6.academic_vocab`, `g6.discipline_words_light`.

Grammar coverage: tense/verb usage, parts of speech, connectors, punctuation, agreement, sentence structure, roots/word families, subject/predicate, light active/passive, sentence correction, paragraph-level grammar.  
Vocabulary coverage: semantic fields, academic starters, meaning in context, synonyms/antonyms, word families, precise choice, cloze, close-meaning comparison, light idioms.

---

## Sample questions

### G6 grammar

**Easy (tense / verb usage):**  
> בחרו את המשפט שמתאר פעולה שכבר הסתיימה בפרויקט המחקר:  
> ✓ בשבוע שעבר סיימנו לאסוף את כל המקורות מהספרייה

**Medium (connectors / agreement):**  
> בחרו משפט נכון עם מילת קישור:  
> ✓ למרות שהיה קשה, סיימנו את עבודת התחקיר

**Hard (complex syntax / connectors):**  
> בחרו משפט נכון עם 'אף על פי':  
> ✓ אף על פי שהיה קשה, סיימנו את התחקיר

### G6 vocabulary

**Easy (semantic field):**  
> אילו מילים שייכות לשדה המילים של תחקיר ומחקר?  
> ✓ נתונים, מקור, מסקנה וחקירה

**Medium (synonym / academic starter):**  
> מה נרדף ל'לפיכך' בטקסט?  
> ✓ בהתאם לכך — מסקנה מהקודם

**Hard (compare close meanings):**  
> מה ההבדל: 'טיעון' לעומת 'ראיה'?  
> ✓ טיעון — עמדה, ראיה — הוכחה לטיעון

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Near-duplicate distractors | `pos_easy_8`: correct vs wrong differed only by adjective presence | Replaced wrong pool with distinct full-sentence distractors |
| Near-duplicate options (audit) | `'המאמר נמצא על שולחן המחקר'` vs `'…בלבד'` | Removed paraphrase-only variants; used unrelated wrong sentences |
| Gender-slash forms | `שמר/ה`, `כתב/ה` in stems | Gender-specific verb forms in full sentences |
| Short stem-keyword answers | isolated `'עבר'`, `'שורש כ.ת.ב'` | Full phrases: `'הפועל במשפט נמצא בזמן עבר'`, descriptive root answers |
| Antonym-paraphrase leak | `'לא ארוך'` with distractor `'ארוך'` | Descriptive definitions only |
| סימון tag false positive | noun `סימון` + space in worksheet sense | Avoided; verb `סימנו` in research context only where scan-safe |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g6-bank-coverage.test.mjs` | **PASS 12/12** |
| Full G3–G6 regression (g3 + g4 + g5 + g6 tests) | **PASS 40/40** |
| MCQ audit on full `HEBREW_G6_LITERACY_POOL` (586 rows) after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G6 pool) | **0 blockers** |
| `npm run qa:question-inventory-matrix` | G6 grammar + vocabulary **PROFESSIONAL_READY**; all G3–G6 MCQ literacy topics **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0; preemptive `.next` clean via `ensure-clean-next-build.mjs`) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G6 writing / speaking | **PRACTICE_ONLY** (unchanged) |

---

## Final verdict

**Phase 5H: PASS** for INTERNAL PREVIEW scope.

- G6 grammar: **71 / 61 / 43** unique usable (targets 50 / 40 / 30) ✓  
- G6 vocabulary: **79 / 53 / 45** unique usable (targets 50 / 40 / 30) ✓  
- All completed Hebrew G3–G6 MCQ literacy topics remain **PROFESSIONAL_READY** ✓  
- MCQ audit **0 failures**; text-quality **0 blockers**; matrix **CRITICAL_BLOCKING: 0** ✓  
- `npm run build`: **PASS** (exit 0) ✓  
- No parent report, diagnostic metadata, SQL, or UI changes ✓  

**G6 literacy status:** All four MCQ topics (comprehension, reading, grammar, vocabulary) are now **PROFESSIONAL_READY**. Writing/speaking remain **PRACTICE_ONLY**.

**Phase 5 complete:** See `PHASE_5_FINAL_CLOSURE.md` for full G3–G6 closure summary.

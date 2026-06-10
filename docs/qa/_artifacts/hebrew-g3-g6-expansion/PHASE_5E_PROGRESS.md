# Phase 5E — Hebrew G5 Comprehension + Reading Expansion

**Date:** 2026-06-10  
**Scope:** G5 comprehension + G5 reading only → **50/40/30** MCQ coverage. G6, G5 grammar/vocabulary, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Prior phases:** G3 all six literacy topics PROFESSIONAL_READY (5A/5B); G4 all four literacy topics PROFESSIONAL_READY (5C/5D).

---

## G5 comprehension / reading baseline (pre-Phase 5E)

Source: matrix + rich-pool filter at 5E start.

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G5 comprehension** | 7 → 50 | 8 → 40 | 9 → 30 | THIN |
| **G5 reading** | 3 → 50 | 6 → 40 | 2 → 30 | THIN |

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G5 comprehension** | **54** / 50 | **53** / 40 | **46** / 30 | **PROFESSIONAL_READY** |
| **G5 reading** | **53** / 50 | **51** / 40 | **39** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts: comprehension **61/49/42**; reading **61/46/38**.  
G5 literacy pool total: **284** rows (comprehension + reading only).

**Matrix gate:** `CRITICAL_BLOCKING: 0`

### G3 + G4 guard (unchanged — all remain PROFESSIONAL_READY)

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

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g5/comprehension-banks.js` | **New** — hand-crafted G5 comprehension MCQs (explicit detail, main idea, inference, cause/effect, sequence, purpose, comparison, author intent, perspective) |
| `data/hebrew-literacy-g5/reading-banks.js` | **New** — hand-crafted G5 reading MCQs (passage reading, context meaning, structure, careful reading, argument, fact/opinion) |
| `data/hebrew-literacy-g5/literacy-pool-builder.js` | Pool builder: expand + generated passage variants → `HEBREW_G5_LITERACY_POOL` |
| `utils/hebrew-rich-question-bank.js` | Wired `...HEBREW_G5_LITERACY_POOL` |
| `tests/learning/hebrew-g5-bank-coverage.test.mjs` | MCQ integrity, 50/40/30, text-quality, G3/G4 guard, writing/speaking PRACTICE_ONLY |

Subtopics: `g5.inference`, `g5.multiple_perspectives_light`, `g5.multi_layer_read`, `g5.position_in_text`.

Skill coverage (comprehension): explicit detail, main idea, inference, cause/effect, sequence, text purpose, comparison between ideas, author intent / perspective.  
Skill coverage (reading): passage reading, context meaning, sentence understanding, paragraph structure, careful reading, argument structure, fact vs opinion (age-appropriate).

---

## Sample questions

### G5 comprehension

**Easy (explicit detail):**  
> דני וחבריו הכינו תערוכה על מים בישראל. הם הציגו מפה של אגמים, טבלה על צריכת מים בבית…  
> איזה חומר הוצג בטבלה בתערוכה?  
> ✓ נתונים על צריכת מים במשק הבית

**Medium (inference / cause-effect):**  
> יואב הגיע לבית הספר עם מעיל מלא מים ונעליים מלוכלכות. בחוץ ירד גשם חזק…  
> מה סביר שקרה ליואב בדרך?  
> ✓ הוא התרטב בגשם ובמי השלוליות

**Hard (author intent / perspective):**  
> בטקסט על בניית גינה: המנהל כתב שהגינה תשפר את הנראות. מורה כתבה שהילדים ילמדו אחריות. תלמיד כתב שיהיה מקום נעים לשבת.  
> מה ההבדל בין נקודות המבט?  
> ✓ כל אחד מדגיש יתרון שונה: נראות, למידה, מקום לבילוי

### G5 reading

**Easy (passage reading):**  
> עומר הגיע מוקדם לבית הספר בירושלים כדי להכין את דלתות התערוכה…  
> למה עומר הגיע מוקדם?  
> ✓ כדי להכין את תערוכת הכיתה

**Medium (paragraph structure / fact vs opinion):**  
> במאמר דעה בכיתה: המחבר פותח בשאלה, מביא שלוש סיבות בגוף, ומסיים בקריאה לפעולה.  
> מה מאפיין מאמר דעה?  
> ✓ יש בו עמדה ונימוקים שתומכים בה

**Hard (argument structure):**  
> במאמר דעה: 'יש להאריך את שעות הספרייה.' בגוף: 'יותר שעות יאפשרו לתלמידים לסיים שיעורי בית.' בסוף: 'לכן אני מבקש מהוועדה לאשר את ההארכה.'  
> מה תפקיד המשפט האחרון?  
> ✓ לסכם את הטענה ולקרוא לפעולה

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Latin tokens in Hebrew names | `אבigail`, `אלma`, `לiron` in `G5_NAMES` | Replaced with `אביגיל`, `אלמה`, `ליאון` |
| Short correct answers (stem-keyword repair) | `'גשם'`, `'שלוש'` alone as answers | Full phrases: `'כי הרוח הייתה חזקה בחוץ'`, `'שלוש מילים חדשות מהפרק'` |
| Gender-slash forms | `שמר/ה`, `כתב/ה` in stems | Gender-specific verb forms via `g5GenderForms()` in pool builder |
| Shallow template repetition | Same passage shell with only name swap | Varied settings (school, library, community, science fair, neighborhood) and distinct prompts |
| Negated paraphrase leak | `'לא ארוך'` with distractor `'ארוך'` | Descriptive full-sentence definitions |
| Generator-like placeholders | `אפשרות1` fallback in `fourOptions` | Only used when wrong pool exhausted; hand banks supply ≥3 distinct distractors |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g5-bank-coverage.test.mjs` | **PASS 8/8** |
| MCQ audit on full `HEBREW_G5_LITERACY_POOL` (284 rows) after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G5 pool) | **0 blockers** |
| G3/G4 regression: `hebrew-g3-bank-coverage.test.mjs` + `hebrew-g4-bank-coverage.test.mjs` | **PASS 17/17** |
| `npm run qa:question-inventory-matrix` | G5 comprehension + reading **PROFESSIONAL_READY**; all G3 + G4 literacy topics **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G5 writing / speaking | **PRACTICE_ONLY** (unchanged) |
| G5 grammar / vocabulary | **Not authored** (out of scope for 5E) |

---

## Final verdict

**Phase 5E: PASS** for INTERNAL PREVIEW scope.

- G5 comprehension: **54 / 53 / 46** unique usable (targets 50 / 40 / 30) ✓  
- G5 reading: **53 / 51 / 39** unique usable (targets 50 / 40 / 30) ✓  
- All completed G3/G4 literacy topics remain **PROFESSIONAL_READY** ✓  
- MCQ audit **0 failures**; text-quality **0 blockers**; matrix **CRITICAL_BLOCKING: 0**; build **PASS** ✓  
- No parent report, diagnostic metadata, SQL, or UI changes ✓  

**Next:** Phase 5F (or equivalent) — G5 grammar + vocabulary to 50/40/30; G6 literacy expansion remains separate.

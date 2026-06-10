# Phase 5G — Hebrew G6 Comprehension + Reading Expansion

**Date:** 2026-06-10  
**Scope:** G6 comprehension + G6 reading only → **50/40/30** MCQ coverage. G6 grammar/vocabulary, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Prior phases:** G3 all six literacy topics PROFESSIONAL_READY (5A/5B); G4 all four literacy topics PROFESSIONAL_READY (5C/5D); G5 all four literacy topics PROFESSIONAL_READY (5E/5F).

---

## G6 comprehension / reading baseline (pre-Phase 5G)

Source: matrix + rich-pool filter at 5G start.

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G6 comprehension** | 7 → 50 | 8 → 40 | 9 → 30 | THIN |
| **G6 reading** | 3 → 50 | 6 → 40 | 2 → 30 | THIN |

---

## Post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G6 comprehension** | **54** / 50 | **53** / 40 | **46** / 30 | **PROFESSIONAL_READY** |
| **G6 reading** | **54** / 50 | **51** / 40 | **39** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts: comprehension **61/49/42**; reading **61/46/38**.  
G6 literacy pool total: **284** rows (142 comprehension + 142 reading only).

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
| G5 grammar | 72 / 50 | 57 / 40 | 44 / 30 | PROFESSIONAL_READY |
| G5 vocabulary | 80 / 50 | 53 / 40 | 44 / 30 | PROFESSIONAL_READY |

G6 grammar, vocabulary, writing, speaking remain **NEEDS_AUTHORING_BEFORE_LAUNCH** (out of scope for 5G).

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g6/comprehension-banks.js` | **New** — 114 hand-crafted G6 comprehension MCQs (explicit detail, main idea, inference, cause/effect, sequence, purpose, comparison, author intent, perspective, argument/evidence) |
| `data/hebrew-literacy-g6/reading-banks.js` | **New** — 92 hand-crafted G6 reading MCQs (passage reading, context meaning, structure, careful reading, argument, fact/opinion, genre comparison) |
| `data/hebrew-literacy-g6/literacy-pool-builder.js` | Pool builder: expand + generated passage variants → `HEBREW_G6_LITERACY_POOL` |
| `utils/hebrew-rich-question-bank.js` | Wired `...HEBREW_G6_LITERACY_POOL` |
| `tests/learning/hebrew-g6-bank-coverage.test.mjs` | MCQ integrity, 50/40/30, text-quality, G3/G4/G5 guard, writing/speaking PRACTICE_ONLY |

Subtopics: `g6.evidence_from_text`, `g6.critical_evaluation_light`, `g6.complex_text_analysis`, `g6.compare_genres`.

Skill coverage (comprehension): explicit detail, main idea, inference, cause/effect, sequence, text purpose, comparison between ideas, author intent / perspective, argument/evidence (age-appropriate).  
Skill coverage (reading): passage reading, context meaning, sentence understanding, paragraph structure, careful reading, argument structure, fact vs opinion, claim/evidence, text comparison (age-appropriate).

---

## Sample questions

### G6 comprehension

**Easy (explicit detail / evidence from text):**  
> הכיתה קראה כתבה על מיחזור בבית הספר. בפסקה הראשונה מופיעים נתונים על כמות הפסולת שנאספה בשבוע…  
> מה מופיע בפסקה הראשונה של הכתבה?  
> ✓ נתונים על כמות הפסולת שנאספה בשבוע

**Medium (comparison between ideas):**  
> מה ההבדל העיקרי בין 'טענה' ל'ראיה' בטקסט?  
> ✓ טענה היא מה שרוצים להוכיח; ראיה תומכת בטענה

**Hard (inference / evaluating evidence):**  
> בטקסט: 'לפי סקר, שבעים אחוז תמכו.' לא כתוב מי ביצע את הסקר.  
> מה חסר להערכת הראיה?  
> ✓ מידע על מי ביצע את הסקר ואיך

### G6 reading

**Easy (passage reading):**  
> עידו הגיע מוקדם לבית הספר בירושלים כדי להכין את דוכן הפרויקט על מחקר מים…  
> למה עידו הגיע מוקדם?  
> ✓ כדי להכין את דוכן הפרויקט על מחקר מים

**Medium (fact vs opinion):**  
> בכתבה: 'בחצר יש עשרים עצים.' בהמשך: 'לדעתי זו החצר היפה ביותר.'  
> איזה משפט עובדה?  
> ✓ בחצר יש עשרים עצים

**Hard (argument / author intent):**  
> במכתב לעיתון: 'אין צל בצהריים.' עורך פרסם עם כותרת על צורך במקומות מוצלים.  
> מה המחבר מנסה?  
> ✓ לשכנע לשפר צל בחצר

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| סימון tag (quality scan) | `'…סימון טענה, בדיקת ראיות…'` in comprehension sequence item | Replaced with **זיהוי טענה** in stem, answer, and distractors |
| Latin token in distractor | `'צבע גraf'` (typo) in evidence-hard item | Fixed to `'צבע של הגרף'` |
| Short correct answers (stem-keyword repair) | Isolated tokens like `'גשם'`, `'שלוש'` | Full phrases throughout banks (e.g. `'כי הרוח בחוץ הפריעה להקלטה'`) |
| Gender-slash forms | `שמר/ה`, `כתב/ה` in stems | Gender-specific verb forms via `g6GenderForms()` in pool builder |
| Shallow template repetition | Same passage shell with only name swap | Varied settings (school project, library research, community letter, science museum, neighborhood debate) and distinct prompts |
| Generator-like placeholders | `אפשרות1` fallback in `fourOptions` | Only used when wrong pool exhausted; hand banks supply ≥3 distinct distractors |

Note: verb forms **סימנה** (marked in text while reading) are acceptable; the scan blocks the noun **סימון** followed by space (worksheet-tag sense).

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g6-bank-coverage.test.mjs` | **PASS 9/9** |
| MCQ audit on full `HEBREW_G6_LITERACY_POOL` (284 rows) after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G6 pool) | **0 blockers** |
| G3/G4/G5 regression: `hebrew-g3-bank-coverage.test.mjs` + `hebrew-g4-bank-coverage.test.mjs` + `hebrew-g5-bank-coverage.test.mjs` | **PASS 28/28** |
| `npm run qa:question-inventory-matrix` | G6 comprehension + reading **PROFESSIONAL_READY**; all G3/G4/G5 literacy topics **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G6 writing / speaking | **PRACTICE_ONLY** (unchanged) |
| G6 grammar / vocabulary | **Not authored** (out of scope for 5G) |

### Windows `.next` ENOENT note

Build used `scripts/ensure-clean-next-build.mjs` (preemptive `.next` clean). **No ENOENT unlink error** on this run; **final isolated build passed** (exit 0, ~282s). Same mitigation pattern as Phase 5F remains available if flakes recur.

---

## Final verdict

**Phase 5G: PASS** for INTERNAL PREVIEW scope.

- G6 comprehension: **54 / 53 / 46** unique usable (targets 50 / 40 / 30) ✓  
- G6 reading: **54 / 51 / 39** unique usable (targets 50 / 40 / 30) ✓  
- All completed G3/G4/G5 literacy topics remain **PROFESSIONAL_READY** ✓  
- MCQ audit **0 failures**; text-quality **0 blockers**; matrix **CRITICAL_BLOCKING: 0** ✓  
- `npm run build`: **PASS** (exit 0) ✓  
- No parent report, diagnostic metadata, SQL, or UI changes ✓  

**G6 literacy status:** Comprehension + reading are now **PROFESSIONAL_READY**. Grammar, vocabulary, writing, and speaking remain **NEEDS_AUTHORING_BEFORE_LAUNCH** / **PRACTICE_ONLY** (out of scope for 5G).

**Next:** Phase 5H (or equivalent) — G6 grammar + vocabulary expansion.

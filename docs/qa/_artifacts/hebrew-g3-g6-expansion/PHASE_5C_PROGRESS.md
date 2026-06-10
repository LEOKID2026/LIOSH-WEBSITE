# Phase 5C — Hebrew G4 Comprehension + Reading Expansion

**Date:** 2026-06-10  
**Scope:** G4 comprehension + G4 reading only → **50/40/30** MCQ coverage. G5–G6, English, Geometry, Science, Moledet, parent report logic, diagnostic metadata flags, SQL, UI — **out of scope**.  
**Dependency:** G3 literacy pools (Phase 5A/5B) restored from `staging/diagnostic-flags` commit `735a43ca` and wired alongside G4 in `utils/hebrew-rich-question-bank.js`.

---

## G4 baseline table (pre-Phase 5C)

Source: rich-pool filter counts + legacy snapshot at 5C start (matrix-aligned).

| Topic | Easy (have → target) | Medium (have → target) | Hard (have → target) | Status |
|-------|----------------------|------------------------|----------------------|--------|
| **G4 comprehension** | 8 → 50 | 11 → 40 | 6 → 30 | THIN |
| **G4 reading** | 3 → 50 | 7 → 40 | 2 → 30 | THIN |

Legacy-only rows: comprehension **6/7/5** per level pool; reading **2/6/1**.

---

## G4 post-authoring table (matrix rerun 2026-06-10)

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| **G4 comprehension** | **63** / 50 | **56** / 40 | **43** / 30 | **PROFESSIONAL_READY** |
| **G4 reading** | **58** / 50 | **52** / 40 | **39** / 30 | **PROFESSIONAL_READY** |

Rich-pool filter counts (merged legacy + rich): comprehension **62/50/38**; reading **61/46/38**.  
G4 literacy pool rows authored: **284** (`HEBREW_G4_LITERACY_POOL`).

**Matrix gate:** `CRITICAL_BLOCKING: 0`

---

## G3 remains PROFESSIONAL_READY (Phase 5C guard)

After wiring G3 + G4 literacy pools into `HEBREW_RICH_POOL`, all six G3 literacy MCQ topics unchanged at or above targets:

| Topic | Easy | Medium | Hard | Matrix status |
|-------|------|--------|------|---------------|
| G3 comprehension | 69 / 50 | 55 / 40 | 42 / 30 | PROFESSIONAL_READY |
| G3 reading | 85 / 50 | 65 / 40 | 46 / 30 | PROFESSIONAL_READY |
| G3 grammar | 66 / 50 | 54 / 40 | 34 / 30 | PROFESSIONAL_READY |
| G3 vocabulary | 57 / 50 | 68 / 40 | 39 / 30 | PROFESSIONAL_READY |

G3 content was **not reopened** in Phase 5C; only shared bank wiring (`hebrew-rich-question-bank.js` spreads G3 + G4 pools).

---

## Implementation

| File | Role |
|------|------|
| `data/hebrew-literacy-g4/comprehension-banks.js` | Hand-crafted G4 comprehension MCQs (explicit detail, main idea, inference, cause/effect, sequence, text purpose) |
| `data/hebrew-literacy-g4/reading-banks.js` | Hand-crafted G4 reading MCQs (passage reading, context meaning, sentence understanding, paragraph structure, careful reading) |
| `data/hebrew-literacy-g4/literacy-pool-builder.js` | Pool assembly, gender-specific Hebrew, diversified passage generators |
| `utils/hebrew-rich-question-bank.js` | Wired `HEBREW_G3_LITERACY_POOL` + `HEBREW_G4_LITERACY_POOL` |
| `tests/learning/hebrew-g4-bank-coverage.test.mjs` | 50/40/30, MCQ integrity, text quality, G3 guard, writing/speaking PRACTICE_ONLY |
| `tests/learning/hebrew-literacy-text-quality.mjs` | Shared blocker scan (gender-slash, סימון, numbered stems, Latin tokens) |

Subtopics: `g4.summary_intro`, `g4.text_structure`, `g4.genre_mix`, `g4.info_lit_intro`.

---

## Sample questions

### G4 comprehension

**Easy (explicit detail):**  
> קרא את הטקסט: 'תמר הכינה מראש את התיק לטיול. היא שמה בו בקבוק מים, כובע ומחברת לרישום.' מה שמה תמר בתיק?  
> ✓ בקבוק מים, כובע ומחברת

**Medium (inference):**  
> קרא את הטקסט: 'יואב הגיע לבית הספר עם מעיל מלא מים ונעליים מלוכלכות. בחוץ ירד גשם חזק עד לפני רגע.' מה סביר שקרה ליואב בדרך?  
> ✓ הוא התרטב בגשם

**Hard (inference / text purpose):**  
> קראתם טקסט על מחזור. בסוף שואלים: 'למה המחבר הדגיש פחיות נפרדות?'  
> ✓ כי הפרדה נכונה משפרת מיחזור

### G4 reading

**Easy (passage / context):**  
> קרא את הטקסט: 'בעקבות גשם כבד נוצרו שלוליות בחצר. הילדים ראו שהמים שקפים ומשקפים את השמיים.' מה נוצר בחצר אחרי הגשם?  
> ✓ הצטברו גומות מים רדודות בחצר

**Medium (careful reading):**  
> קרא את הטקסט: 'בכתבה על טיול כיתתי כתוב שהמורה ביקשה לא לקחת חפצים מטבע…' מה מלמד מעשהו של הילד?  
> ✓ כיבוד כללים חשוב גם כשקשה

**Hard (structure / genre mix):**  
> קרא את הטקסט: 'סיפור: ליאור ראה ענן כהה… טקסט מידע: ענני גשם כהים…' מה תפקיד הפתיחה בשני הטקסטים?  
> ✓ להציג את הרקע לפני הפעולה

---

## Rejected / cleaned examples

| Pattern | Example rejected | Fix applied |
|---------|------------------|-------------|
| Short correct answer + stem keyword | Correct `מפרחים` → distractors mutated to `ממקרר — לא מפרחים` by `repairMcqObviousAnswerContent` | Answer → `מגבעולי הצמחים הפורחים בטבע`; longer unrelated distractors |
| Stem-token injection | `בידיים`, `לסבתא`, `ברכה`, `שלוליות` triggered `(בלי …)` / `— לא …` suffixes | Full-sentence answers without bare stem tokens |
| Gender-slash templates | `קרא/ה`, `שמר/ה` in generator templates | `g4GenderForms()` with named female set |
| Typo / Latin leak | `חדר מusic`, template tags with Latin fragments | Hebrew place names only; cleaned tag list |
| Numbered passage shells | `מספר 5000` collapsing fingerprints | Hebrew unique tags (אגוז, בלון, …) per generated passage |

---

## Test results

| Check | Result |
|-------|--------|
| `node --test tests/learning/hebrew-g4-bank-coverage.test.mjs` | **PASS 7/7** |
| `node --test tests/learning/hebrew-g3-bank-coverage.test.mjs` | **PASS 7/7** (regression guard) |
| MCQ audit on full `HEBREW_G4_LITERACY_POOL` after `finalizeHebrewMcq` | **0 failures** |
| Text-quality scan (G4 pool) | **0 blockers** |
| `npm run qa:question-inventory-matrix` | G4 comprehension + reading **PROFESSIONAL_READY**; G3 all six literacy topics **PROFESSIONAL_READY**; `CRITICAL_BLOCKING: 0` |
| `npm run build` | **PASS** (exit 0) |
| Parent report / diagnostic flags / SQL / UI | **No changes** |
| G4 writing / speaking | **PRACTICE_ONLY** (unchanged) |

---

## Final verdict

**Phase 5C: PASS** for INTERNAL PREVIEW scope.

- G4 comprehension: **63 / 56 / 43** unique usable (targets 50 / 40 / 30) ✓  
- G4 reading: **58 / 52 / 39** unique usable (targets 50 / 40 / 30) ✓  
- G3 literacy (comp/reading/grammar/vocab): **unchanged PROFESSIONAL_READY** ✓  
- MCQ integrity: **0 failures** ✓  
- Text-quality scan: **clean** ✓  
- Inventory matrix: **pass** for scoped cells ✓  
- Build: **pass** ✓  

**Out of scope (unchanged):** G5–G6, English, Geometry, Science, Moledet, G4 grammar/vocabulary authoring, parent report logic, diagnostic metadata flags, SQL, UI redesign.

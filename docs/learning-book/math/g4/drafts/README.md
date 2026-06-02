# Grade 4 Math Learning Book — Drafts

**Status:** All batches authored — **37 / 37** draft pages complete (Batches A–G). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/math/g4/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MATH_GRADE_4_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **37 / 37** (Batches A–G) |
| Review pack | ✅ `docs/learning-book/MATH_GRADE_4_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-math-g4-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/math-g4-draft-manifest.mjs` |
| Runtime registry / routes | ❌ Not in scope — content-only task |
| Practice CTA resolver (G4) | ❌ Not created — no fake mappings |

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | All 37 Grade 4 Math `skill_id` entries in scope |
| `docs/learning-book/MATH_GRADE_4_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section B (Grades 3–4) seven-section template |
| `docs/learning-book/math/g1/drafts/`, `g2/drafts/`, `g3/drafts/` | Style reference only — **not modified** |
| `utils/math-constants.js` | Grade 4 operations context only |

---

## Batch A — ערך מקום, השוואה, סדרות ועיגול (8)

| File | Draft title |
|------|-------------|
| `ns_place_hundreds.md` | ערך המקום — אלפים ועד 10,000 |
| `ns_neighbors.md` | שכנים — מספרים גדולים |
| `ns_complement100.md` | השלמה ל-100 |
| `ns_complement10.md` | זוגות ל-10 — חזרה |
| `ns_even_odd.md` | זוגי/אי-זוגי — מספרים גדולים |
| `cmp.md` | השוואת מספרים גדולים |
| `sequence.md` | סדרות — קפיצות גדולות |
| `round.md` | עיגול לעשרות/מאות/אלפים |

---

## Batch B — תכונות 0 ו-1 (4)

| File | Draft title |
|------|-------------|
| `zero_add.md` | חיבור עם 0 |
| `zero_sub.md` | חיסור 0 |
| `zero_mul.md` | כפל ב-0 |
| `one_mul.md` | כפל ב-1 |

---

## Batch C — חיבור, חיסור וכפל (5)

| File | Draft title |
|------|-------------|
| `add_two.md` | חיבור שני מספרים — עד 10,000 |
| `sub_two.md` | חיסור שני מספרים — עד 10,000 |
| `add_three.md` | חיבור שלושה מספרים |
| `mul.md` | כפל — לוח הכפל ואסטרטגיות |
| `mul_vertical.md` | כפל במאונך |

---

## Batch D — חילוק, התחלקות, ראשוניים, גורמים וכפולים (8)

| File | Draft title |
|------|-------------|
| `div.md` | חילוק — חלוקה שווה |
| `div_with_remainder.md` | חילוק עם שארית |
| `div_long.md` | חילוק ארוך |
| `divisibility.md` | התחלקות — 2, 3, 5, 6, 9, 10 |
| `prime_composite.md` | מספרים ראשוניים ופריקים |
| `fm_factor.md` | גורמים של מספר |
| `fm_multiple.md` | כפולות של מספר |
| `fm_gcd.md` | מ.א.ח |

---

## Batch E — עשרוניים, משוואות ואומדן (7)

| File | Draft title |
|------|-------------|
| `dec_add.md` | חיבור עשרוניים — שתי ספרות |
| `dec_sub.md` | חיסור עשרוניים — שתי ספרות |
| `eq_add.md` | משוואת חיבור — מספר חסר |
| `eq_sub.md` | משוואת חיסור — מספר חסר |
| `est_add.md` | הערכת תוצאה — חיבור |
| `est_mul.md` | הערכת תוצאה — כפל |
| `est_quantity.md` | הערכת כמות |

---

## Batch F — חזקות (2)

| File | Draft title |
|------|-------------|
| `power_base.md` | חזקה — בסיס ומעריך |
| `power_calc.md` | חזקה — חישוב |

---

## Batch G — שאלות מילוליות (3)

| File | Draft title |
|------|-------------|
| `wp_comparison_more.md` | שאלה מילולית — כמה יותר? |
| `wp_leftover.md` | שאלה מילולית — מה נשאר? |
| `wp_time_sum.md` | שאלה מילולית — סכום זמנים |

---

## Notes

- `book_placeholder.md` — infrastructure placeholder; **not** part of the 37-page book.
- All pages: `age_band: grades_3_4`, `approval_status: draft`, `grade: g4`.
- Section 7: draft invitation text only — **no practice routing**.
- Child-facing copy uses **חשבון**, not **מתמטיקה**.
- Grouped thousands (`1,000`, `10,000`) appear in many pages — renderer must isolate LTR (see G3 Bidi fix).

---

## Regenerate review pack

```bash
node scripts/build-math-g4-hebrew-review-pack.mjs
node scripts/verify-math-g4-book-content.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Documentation and draft markdown only

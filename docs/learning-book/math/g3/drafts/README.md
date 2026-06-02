# Grade 3 Math Learning Book — Drafts

**Status:** All batches authored — **26 / 26** draft pages complete (Batches A + B + C + D). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/math/g3/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MATH_GRADE_3_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **26 / 26** (Batches A + B + C + D) |
| Review pack | ✅ `docs/learning-book/MATH_GRADE_3_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-math-g3-book-content.mjs` |
| Runtime registry / routes | ❌ Not in scope — content-only task |
| Practice CTA resolver (G3) | ❌ Not created — no fake mappings |

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | All 26 Grade 3 Math `skill_id` entries in scope |
| `docs/learning-book/MATH_GRADE_3_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section B (Grades 3–4) seven-section template |
| `docs/learning-book/math/g1/drafts/`, `math/g2/drafts/` | Style reference only — **not modified** |
| `utils/math-constants.js` | Grade 3 operations context |

---

## Batch A — יסודות מספרים, השוואה וסדרות (7)

| File | Draft title |
|------|-------------|
| `ns_place_hundreds.md` | מאות, עשרות ואחדות — עד 1,000 |
| `ns_neighbors.md` | שכנים של מספר — עד 1,000 |
| `ns_complement10.md` | זוגות שמרכיבים 10 — חזרה |
| `ns_complement100.md` | זוגות שמרכיבים 100 |
| `ns_even_odd.md` | זוגי ואי-זוגי — מספרים גדולים |
| `cmp.md` | השוואת מספרים עד 1,000 |
| `sequence.md` | סדרות מספרים |

---

## Batch B — חיבור, חיסור, כפל וחילוק (9)

| File | Draft title |
|------|-------------|
| `add_two.md` | חיבור שני מספרים — עד 1,000 |
| `sub_two.md` | חיסור שני מספרים — עד 1,000 |
| `add_three.md` | חיבור שלושה מספרים |
| `mul.md` | כפל — לוח הכפל |
| `mul_tens.md` | כפל בעשרות |
| `mul_hundreds.md` | כפל במאות |
| `div.md` | חילוק — חלוקה שווה |
| `div_with_remainder.md` | חילוק עם שארית |
| `divisibility.md` | התחלקות ב-2, ב-5 וב-10 |

---

## Batch C — משוואות, עשרוניים וסדר פעולות (7)

| File | Draft title |
|------|-------------|
| `eq_add.md` | משוואת חיבור — מספר חסר |
| `eq_sub.md` | משוואת חיסור — מספר חסר |
| `dec_add.md` | חיבור עשרוניים |
| `dec_sub.md` | חיסור עשרוניים |
| `order_add_mul.md` | סדר פעולות — חיבור וכפל |
| `order_mul_sub.md` | סדר פעולות — כפל וחיסור |
| `order_parentheses.md` | סוגריים בחישוב |

---

## Batch D — שאלות מילוליות (3)

| File | Draft title |
|------|-------------|
| `wp_comparison_more.md` | שאלה מילולית — כמה יותר? |
| `wp_leftover.md` | שאלה מילולית — מה נשאר? |
| `wp_time_sum.md` | שאלה מילולית — סכום זמנים |

---

## Notes

- `book_placeholder.md` — infrastructure placeholder from structure expansion; **not** part of the 26-page book.
- All pages: `age_band: grades_3_4`, `approval_status: draft`.
- Section 7: draft invitation text only — **no practice routing**.
- Child-facing copy uses **חשבון**, not **מתמטיקה**.

---

## Regenerate review pack

```bash
node scripts/build-math-g3-hebrew-review-pack.mjs
node scripts/verify-math-g3-book-content.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Documentation and draft markdown only

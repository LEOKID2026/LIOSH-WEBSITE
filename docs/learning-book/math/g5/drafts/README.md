# Grade 5 Math Learning Book — Drafts

**Status:** All batches authored — **40 / 40** draft pages complete (Batches A–H). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/math/g5/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MATH_GRADE_5_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **40 / 40** (Batches A–H) |
| Review pack | ✅ `docs/learning-book/MATH_GRADE_5_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-math-g5-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/math-g5-draft-manifest.mjs` |
| Draft content source (scripts only) | ✅ `scripts/lib/math-g5-draft-content.mjs` |
| Draft generator (optional regen) | ✅ `scripts/gen-math-g5-drafts.mjs` |
| Runtime registry / routes | ❌ Not in scope — content-only task |
| Practice CTA resolver (G5) | ❌ Not created — no fake mappings |

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | All 40 Grade 5 Math `skill_id` entries in scope |
| `docs/learning-book/MATH_GRADE_5_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section template (Grades 5–6 age band) |
| `docs/learning-book/math/g1/drafts/` … `g4/drafts/` | Style reference only — **not modified** |
| `utils/math-constants.js` | Grade 5 operations context only |

---

## Batch A — ערך מקום, השוואה, סדרות ועיגול (6)

| File | Draft title |
|------|-------------|
| `ns_place_hundreds.md` | ערך המקום — עד 100,000 |
| `ns_neighbors.md` | שכנים — עד 100,000 |
| `ns_complement100.md` | השלמה ל-100 |
| `cmp.md` | השוואת מספרים — עד 100,000 |
| `sequence.md` | סדרות — קפיצות גדולות |
| `round.md` | עיגול — עשרות אלפים |

---

## Batch B — חיבור, חיסור וכפל (4)

| File | Draft title |
|------|-------------|
| `add_two.md` | חיבור — עד 100,000 |
| `sub_two.md` | חיסור — עד 100,000 |
| `add_three.md` | חיבור שלושה מספרים |
| `mul.md` | כפל — אסטרטגיות |

---

## Batch C — חילוק (3)

| File | Draft title |
|------|-------------|
| `div.md` | חילוק — חלוקה שווה |
| `div_with_remainder.md` | חילוק עם שארית |
| `div_two_digit.md` | חילוק במחלק דו-ספרתי |

---

## Batch D — שברים (5)

| File | Draft title |
|------|-------------|
| `frac_reduce.md` | צמצום שבר |
| `frac_expand.md` | הרחבת שבר |
| `frac_add_sub.md` | חיבור וחיסור שברים |
| `mixed_to_frac.md` | מספר מעורב לשבר |
| `frac_to_mixed.md` | שבר למספר מעורב |

---

## Batch E — עשרוניים ומשוואות (6)

| File | Draft title |
|------|-------------|
| `dec_add.md` | חיבור עשרוניים |
| `dec_sub.md` | חיסור עשרוניים |
| `eq_add.md` | משוואת חיבור |
| `eq_sub.md` | משוואת חיסור |
| `eq_mul.md` | משוואת כפל |
| `eq_div.md` | משוואת חילוק |

---

## Batch F — גורמים, כפולות, מ.א.ח ואומדן (6)

| File | Draft title |
|------|-------------|
| `fm_factor.md` | גורמים |
| `fm_multiple.md` | כפולות |
| `fm_gcd.md` | המחלק המשותף הגדול ביותר (מ.א.ח) |
| `est_add.md` | אומדן חיבור |
| `est_mul.md` | אומדן כפל |
| `est_quantity.md` | אומדן כמות |

---

## Batch G — אחוזים (2)

| File | Draft title |
|------|-------------|
| `perc_part_of.md` | אחוז מכמות |
| `perc_discount.md` | הנחה באחוזים |

---

## Batch H — שאלות מילוליות (8)

| File | Draft title |
|------|-------------|
| `wp_comparison_more.md` | כמה יותר? |
| `wp_leftover.md` | מה נשאר? |
| `wp_time_sum.md` | סכום זמנים |
| `wp_multi_step.md` | שאלה מרובת שלבים |
| `wp_distance_time.md` | מרחק, זמן, מהירות |
| `wp_shop_discount.md` | קניות והנחה |
| `wp_unit_cm_to_m.md` | ס״מ ↔ מטר |
| `wp_unit_g_to_kg.md` | גרם ↔ ק״ג |

---

## Notes

- `book_placeholder.md` — infrastructure placeholder; **not** part of the 40-page book.
- All pages: `age_band: grades_5_6`, `approval_status: draft`, `grade: g5`.
- Section 7: draft invitation text only — **no practice routing**.
- Child-facing copy uses **חשבון**, not **מתמטיקה**.
- Grouped thousands (`1,000`, `10,000`, `48,726`) appear in many pages — renderer must isolate LTR.

---

## Regenerate drafts / review pack

```bash
node scripts/gen-math-g5-drafts.mjs
node scripts/build-math-g5-hebrew-review-pack.mjs
node scripts/verify-math-g5-book-content.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Documentation and draft markdown only

# Grade 6 Math Learning Book — Drafts

**Status:** All batches authored — **44 / 44** draft pages complete (Batches A–I). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/math/g6/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MATH_GRADE_6_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **44 / 44** (Batches A–I) |
| Review pack | ✅ `docs/learning-book/MATH_GRADE_6_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-math-g6-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/math-g6-draft-manifest.mjs` |
| Runtime registry / routes | ❌ Not in scope — content-only task |
| Practice CTA resolver (G6) | ❌ Not created — no fake mappings |

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | All 44 Grade 6 Math `skill_id` entries in scope |
| `docs/learning-book/MATH_GRADE_6_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section C (Grades 5–6) seven-section template |
| `docs/learning-book/math/g1–g4/drafts/` | Style reference only — **not modified** |
| `utils/math-constants.js` | Grade 6 operations context only |

---

## Batch A — ערך מקום, השוואה, סדרות ועיגול (6)

| File | Draft title |
|------|-------------|
| `ns_place_hundreds.md` | ערך המקום — עד 200,000 |
| `ns_neighbors.md` | שכנים — מספרים גדולים |
| `ns_complement100.md` | השלמה ל-100 |
| `cmp.md` | השוואת מספרים גדולים |
| `sequence.md` | סדרות — קפיצות גדולות |
| `round.md` | עיגול — עשרות, מאות, אלפים |

---

## Batch B — חיבור, חיסור, כפל וחילוק (6)

| File | Draft title |
|------|-------------|
| `add_two.md` | חיבור שני מספרים — עד 200,000 |
| `sub_two.md` | חיסור שני מספרים — עד 200,000 |
| `add_three.md` | חיבור שלושה מספרים |
| `mul.md` | כפל — אסטרטגיות ומספרים גדולים |
| `div.md` | חילוק — חלוקה שווה |
| `div_with_remainder.md` | חילוק עם שארית |

---

## Batch C — גורמים, כפולות ומ.א.ח (3)

| File | Draft title |
|------|-------------|
| `fm_factor.md` | גורמים של מספר |
| `fm_multiple.md` | כפולות של מספר |
| `fm_gcd.md` | המחלק המשותף הגדול ביותר (מ.א.ח) |

---

## Batch D — משוואות (4)

| File | Draft title |
|------|-------------|
| `eq_add.md` | משוואת חיבור — מספר חסר |
| `eq_sub.md` | משוואת חיסור — מספר חסר |
| `eq_mul.md` | משוואת כפל — מספר חסר |
| `eq_div.md` | משוואת חילוק — מספר חסר |

---

## Batch E — מספרים עשרוניים (7)

| File | Draft title |
|------|-------------|
| `dec_add.md` | חיבור מספרים עשרוניים |
| `dec_sub.md` | חיסור מספרים עשרוניים |
| `dec_multiply.md` | כפל מספרים עשרוניים |
| `dec_multiply_10_100.md` | כפל עשרוני ב-10 או ב-100 |
| `dec_divide.md` | חילוק מספרים עשרוניים |
| `dec_divide_10_100.md` | חילוק עשרוני ב-10 או ב-100 |
| `dec_repeating.md` | עשרוניים מחזוריים |

---

## Batch F — שברים (3)

| File | Draft title |
|------|-------------|
| `frac_as_division.md` | שבר כחילוק |
| `frac_multiply.md` | כפל שברים |
| `frac_divide.md` | חילוק שברים |

---

## Batch G — יחס וקנה מידה (6)

| File | Draft title |
|------|-------------|
| `ratio_first.md` | יחס — מה זה אומר? |
| `ratio_second.md` | יחס בין שתי כמויות |
| `ratio_find.md` | מציאת כמות חסרה ביחס |
| `scale_find.md` | קנה מידה — מציאת מרחק |
| `scale_map_to_real.md` | ממפה למציאות |
| `scale_real_to_map.md` | ממציאות למפה |

---

## Batch H — אחוזים (2)

| File | Draft title |
|------|-------------|
| `perc_part_of.md` | אחוז מכמות |
| `perc_discount.md` | הנחה באחוזים |

---

## Batch I — שאלות מילוליות (7)

| File | Draft title |
|------|-------------|
| `wp_comparison_more.md` | שאלה מילולית — כמה יותר? |
| `wp_leftover.md` | שאלה מילולית — מה נשאר? |
| `wp_time_sum.md` | שאלה מילולית — סכום זמנים |
| `wp_distance_time.md` | מרחק, זמן ומהירות |
| `wp_shop_discount.md` | שאלה מילולית — מבצע בחנות |
| `wp_unit_cm_to_m.md` | המרת יחידות — ס״מ ומטר |
| `wp_unit_g_to_kg.md` | המרת יחידות — גרם וקילוגרם |

---

## Notes

- All pages: `age_band: grades_5_6`, `approval_status: draft`, `grade: g6`.
- Section 7: draft invitation text only — **no practice routing**.
- Child-facing copy uses **חשבון**, not **מתמטיקה**.
- Grouped thousands (`1,000`, `10,000`, `100,000`, `200,000`) appear in many pages — renderer must isolate LTR.
- Grade 5 fraction/percent skills (`frac_add_sub`, `frac_reduce`, etc.) are **not** in G6 spine scope — assumed covered in G5 book.

---

## Regenerate review pack

```bash
node scripts/build-math-g6-hebrew-review-pack.mjs
node scripts/verify-math-g6-book-content.mjs
```

To regenerate draft pages from generator (if edited):

```bash
node scripts/generate-math-g6-drafts.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Documentation and draft markdown only

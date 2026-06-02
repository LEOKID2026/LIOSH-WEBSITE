# Grade 2 Math Learning Book — Implementation Summary

**Date:** June 2026  
**Status:** Dev preview wired — draft content, not owner-approved for production.

---

## Routes

| Route | File |
|-------|------|
| `/learning/book/math/g2` | `pages/learning/book/math/g2/index.js` |
| `/learning/book/math/g2/[pageId]` | `pages/learning/book/math/g2/[pageId].js` |

**Book title (child-facing):** `ספר חשבון — כיתה ב׳`

---

## Files created

| File | Role |
|------|------|
| `lib/learning-book/math-g2-registry.js` | 22-page order, 4 batches, neighbors |
| `lib/learning-book/load-math-g2-pages.js` | SSG loader from `docs/learning-book/math/g2/drafts/` |
| `lib/learning-book/math-g2-book-nav.js` | Return query, learning snapshot, practice preset |
| `lib/learning-book/resolve-math-g2-book-page.js` | Math Master → book pageId |
| `lib/learning-book/resolve-math-g2-practice-target.js` | Book Section 7 → Math Master preset |
| `components/learning-book/MathG2BookShell.js` | Reader shell (same UX as G1) |
| `pages/learning/book/math/g2/index.js` | TOC index |
| `pages/learning/book/math/g2/[pageId].js` | Topic reader |
| `scripts/verify-math-g2-book.mjs` | Content + registry verification |

## Files changed

| File | Change |
|------|--------|
| `components/learning-book/LearningPageBody.js` | `bookGrade` prop (`g1` \| `g2`) for practice CTA |
| `components/learning-book/BookTocModal.js` | Optional `routeBase` prop |
| `pages/learning/math-master.js` | G2 book tile, topic + in-learning buttons, shared preset/snapshot |
| `utils/math-question-generator.js` | G2 `forceKind` branches (vertical add/sub, div, divisibility, wp_*) |
| `docs/learning-book/math/g2/drafts/README.md` | Implementation section |

---

## Page order (22)

**Batch A:** `ns_place_tens_units`, `ns_neighbors`, `ns_complement10`, `ns_even_odd`, `cmp`  
**Batch B:** `add_two`, `sub_two`, `add_vertical`, `sub_vertical`, `mul`, `div`  
**Batch C:** `divisibility`, `frac_half`, `frac_half_reverse`, `frac_quarter`, `frac_quarter_reverse`  
**Batch D:** `wp_coins`, `wp_coins_spent`, `wp_time_date`, `wp_time_days`, `wp_groups_g2`, `wp_division_simple`

---

## Math Master wiring

| Entry | When visible | Action |
|-------|--------------|--------|
| 📖 ספר חשבון / כיתה ב׳ | `grade === "g2"`, pre-game | `/learning/book/math/g2` |
| 📖 הסבר בספר | Confident operation→page (g2) | Direct book page |
| 📖 הסבר | `grade === "g2"`, `mode === "learning"`, resolvable kind | Snapshot + `?returnTo=learning` |
| Section 7 CTA | All 22 pages with practice mapping | Preset + `/learning/math-master?fromBook=1` |

**Return from book:** `סגור` when `?returnTo=learning` — restores learning session via sessionStorage.

---

## Practice mapping (all 22 pages)

| pageId | operation | forceKind |
|--------|-----------|-----------|
| `ns_place_tens_units` | `number_sense` | `ns_place_tens_units` |
| `ns_neighbors` | `number_sense` | `ns_neighbors` |
| `ns_complement10` | `number_sense` | `ns_complement10` |
| `ns_even_odd` | `number_sense` | `ns_even_odd` |
| `cmp` | `compare` | `cmp` |
| `add_two` | `addition` | `add_two` |
| `sub_two` | `subtraction` | `sub_two` |
| `add_vertical` | `addition` | `add_vertical` |
| `sub_vertical` | `subtraction` | `sub_vertical` |
| `mul` | `multiplication` | `mul` |
| `div` | `division` | `div` |
| `divisibility` | `number_sense` | `divisibility` |
| `frac_half` | `fractions` | `frac_half` |
| `frac_half_reverse` | `fractions` | `frac_half_reverse` |
| `frac_quarter` | `fractions` | `frac_quarter` |
| `frac_quarter_reverse` | `fractions` | `frac_quarter_reverse` |
| `wp_coins` | `word_problems` | `wp_coins` |
| `wp_coins_spent` | `word_problems` | `wp_coins_spent` |
| `wp_time_date` | `word_problems` | `wp_time_date` |
| `wp_time_days` | `word_problems` | `wp_time_days` |
| `wp_groups_g2` | `word_problems` | `wp_groups_g2` |
| `wp_division_simple` | `word_problems` | `wp_division_simple` |

**Pages with hidden setup `הסבר בספר`:** `number_sense`, `word_problems`, `fractions`, `mixed` (no single default page).

**Note:** Forced `wp_time_date` practice may use calendar-date word problems in the generator; the book teaches weekday-only jumps — content alignment TBD at owner review.

---

---

## Grade-based color themes

Book reader colors are **grade-based**, not subject-based. Config: `lib/learning-book/book-grade-themes.js`.

| Grade | Theme | Notes |
|-------|--------|--------|
| **g1** | Purple/violet + emerald accents | Unchanged from original reader |
| **g2** | Deep navy → blue/cyan/teal | Applied via `BookGradeThemeProvider` in `MathG2BookShell` |
| **g3+** | TBD | Add a new entry in `BOOK_GRADE_THEMES` when cloning infrastructure |

Future books (גאומטריה, etc.) should reuse the same grade key — e.g. `g2` geometry book gets the G2 blue/cyan theme, not a one-off palette.

---

## Verification

```bash
node scripts/verify-math-g2-book.mjs   # OK: 22 pages
node scripts/verify-math-g1-book.mjs    # OK: 19 pages (regression)
npm run build
```

---

## Manual QA checklist

- [ ] `/learning/book/math/g2` — TOC, batches, clean titles
- [ ] Sample pages: `ns_place_tens_units`, `add_two`, `add_vertical`, `div`, `frac_half`, `wp_coins`, `wp_division_simple`
- [ ] No `[DRAFT — not owner-approved]` in UI
- [ ] TOC modal, section prev/next, topic prev/next
- [ ] Section 7 CTA → Math Master learning mode with correct topic
- [ ] Math Master g2: book tile, `הסבר בספר`, in-learning `📖 הסבר` (learning only)
- [ ] `סגור` returns to active learning session
- [ ] Grade 1 book + buttons unchanged (still purple/violet)
- [ ] Grade 2 book uses blue/cyan/teal theme (same layout as G1)

---

## Not done

- SQL · commit · push · deploy · owner content sign-off

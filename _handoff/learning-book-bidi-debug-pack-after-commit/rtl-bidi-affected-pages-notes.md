# RTL/BiDi — affected pages (route mapping)

## Routes

| Content / screenshot context | pageId | Route |
|---|---|---|
| **58 + 37** (addition, tens/units decomposition) | `add_two` | `/learning/book/math/g2/add_two` |
| **236** (place-value question) | `ns_place_tens_units` | `/learning/book/math/g2/ns_place_tens_units` |
| **טבלת ערך מקום — 124** | `ns_place_tens_units` | `/learning/book/math/g2/ns_place_tens_units` |
| **מאות, עשרות ואחדות — עד 1,000** (G2 spine) | `ns_place_tens_units` | `/learning/book/math/g2/ns_place_tens_units` |
| **מאות, עשרות ואחדות — עד 1,000** (G3 spine) | `ns_place_hundreds` | `/learning/book/math/g3/ns_place_hundreds` |

### Related pages in mobile QA (same BiDi pass)

| pageId | Route | QA section |
|---|---|---|
| `sub_two` | `/learning/book/math/g2/sub_two` | §4 (68 − 24) |
| `cmp` | `/learning/book/math/g2/cmp` | §3 (612 vs 628 pipe table) |
| `ns_complement10` | `/learning/book/math/g2/ns_complement10` | §2 |
| `shapes_basic_properties_angles` | `/learning/book/geometry/g4/shapes_basic_properties_angles` | §3 |
| `parallel_perpendicular` | `/learning/book/geometry/g4/parallel_perpendicular` | §2 |

## Source markdown (drafts)

- `docs/learning-book/math/g2/drafts/add_two.md` — 58 + 37
- `docs/learning-book/math/g2/drafts/ns_place_tens_units.md` — 124, 236, 405, place-value table
- `docs/learning-book/math/g2/drafts/sub_two.md` — 68 − 24
- `docs/learning-book/math/g2/drafts/cmp.md` — 612 / 628 comparison table
- `docs/learning-book/math/g3/drafts/ns_place_hundreds.md` — G3 variant of hundreds/tens/units topic

## Where tested

- **Environment:** local **dev** server (`http://127.0.0.1:3001`), not production
- **Viewport:** 360px mobile QA script
- **BiDi renderer commit:** `c07b21df` — *Auto update - 03/06/2026 20:09:35.96* (contains MixedHebrewMathText, book-bidi-render, mobile QA artifacts)
- **Current HEAD at pack time:** `86e57d9dce8c524b45abb8f6e0351511643d5901` — *expand english and science assigned activity banks* (post-BiDi; no renderer revert)

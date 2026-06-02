# Learning Book RTL Content Audit

Generated: 2026-06-02

## Summary

| Metric | Count |
|--------|------:|
| Files scanned | 274 |
| Total lines scanned | 25793 |
| Risky lines (before) | 7 |
| Files with auto-fixes | 0 |
| Auto-fix operations | 0 |
| Risky lines (after dry-run) | 7 |

Mode: **dry-run only**

## Risk pattern definitions

- `remainder_without_vav` — remainder without ו (e.g. 155 שארית 7)
- `verbal_formula_label` — verbal formula after נוסחה:
- `meaning_comma_hebrew` — comma after thousands/equation result before Hebrew (e.g. 1,240, ונשאר)
- `hebrew_word_formula` — Hebrew words inside formula with operators/parens
- `chained_comma_equation` — chained equation after comma (522, + 1 =)
- `geometry_verbal_formula` — geometry verbal formula line

## Auto-fix examples (before → after)

_No auto-fixes matched._

## Files auto-fixed

_None._

## Remaining risky lines (manual review)

- `docs/learning-book/math/g4/drafts/divisibility.md:64` [chained_comma_equation] — **תשובה:** ÷2, ÷3, ÷6, ÷9 — **כולם כן**.
- `docs/learning-book/math/g4/drafts/mul_vertical.md:38` [chained_comma_equation] — 3. **עשרות:** 2 × 4 = 8, + 1 נשיאה = **9**
- `docs/learning-book/math/g4/drafts/mul_vertical.md:43` [chained_comma_equation] — - עשרות: 3 × 5 = 15, + 2 = 17
- `docs/learning-book/math/g4/drafts/mul_vertical.md:57` [chained_comma_equation] — - עשרות: 4 × 3 = 12, + 1 = **13**
- `docs/learning-book/math/g4/drafts/mul_vertical.md:69` [chained_comma_equation] — **שלב 2:** עשרות: 5 × 2 = 10, + 1 = 11.
- `docs/learning-book/math/g6/drafts/perc_part_of.md:65` [chained_comma_equation] — *(רמז: ×40, ÷100.)*
- `docs/learning-book/geometry/g5/drafts/heights_trapezoid.md:68` [chained_comma_equation] — *(רמז: חברו בסיסים, ×2, ÷.)*

## Content rules applied

1. Remainder phrasing: `155 ושארית 7` (not `155 שארית 7`)
2. No child-facing verbal formulas like `מחולק = (מחלק × מנה) + שארית`
3. Split comma-after-equation Hebrew (`, ונשאר`) into separate lines
4. Split chained comma equations (`522, + 1 =`) into separate math lines
5. Replace geometry verbal `נוסחה:` lines with numeric examples where matched


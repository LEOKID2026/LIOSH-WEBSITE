# RTL Renderer Unification — DOM Repair Report

Generated: 2026-06-15T22:12:29.106Z

## Root cause (fixed)

`MixedHebrewMathText` used **three incompatible paths** on the same page:

1. `splitFormulaTokens` — split operators/symbols/Hebrew terms into separate spans
2. `splitHebrewMathRuns` + `DigitSpan` — isolated bare digits inside RTL prose
3. `splitTextAndMathRuns` — partial equation detection

Lines caught by one path rendered as LTR islands; lines missed by detection stayed RTL/plaintext and **reversed visually**.

## Fix

All book + learning surfaces now delegate to `splitMixedHebrewMathRuns` (`lib/bidi/mixed-hebrew-math-runs.js`):

- Full equation → **one** `<span dir="ltr" style="unicode-bidi:isolate">`
- Hebrew label + equation → label RTL + equation LTR
- No `book-digit-isolate`, no `formula-op` token spans

## Per-line DOM contract (post-fix)

### `100 + 20 + 4 = 124`

**Runs:** `[{"type":"math","value":"100 + 20 + 4 = 124"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">100 + 20 + 4 = 124</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"100 + 20 + 4 = 124","role":"math"}]`

### `1 מאה + 2 עשרות + 4 אחדות = 124`

**Runs:** `[{"type":"math","value":"1 מאה + 2 עשרות + 4 אחדות = 124"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">1 מאה + 2 עשרות + 4 אחדות = 124</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"1 מאה + 2 עשרות + 4 אחדות = 124","role":"math"}]`

### `58 + 37 = 95`

**Runs:** `[{"type":"math","value":"58 + 37 = 95"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">58 + 37 = 95</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"58 + 37 = 95","role":"math"}]`

### `8 + 7 = 15 → 5, נשיאה 1`

**Runs:** `[{"type":"math","value":"8 + 7 = 15 → 5"},{"type":"prose","value":", נשיאה 1"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">8 + 7 = 15 → 5</span>` (dir=ltr, unicode-bidi=isolate)
- `<span dir="rtl" style="direction:rtl;unicode-bidi:isolate;display:inline-block">, נשיאה 1</span>` (dir=rtl, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"8 + 7 = 15 → 5","role":"math"},{"dir":"rtl","value":", נשיאה 1","role":"prose"}]`

### `עשרות: 30 + 20 = 50`

**Runs:** `[{"type":"prose","value":"עשרות:"},{"type":"math","value":"30 + 20 = 50"}]`

**DOM nodes:**
- `<span dir="rtl" style="direction:rtl;unicode-bidi:isolate;display:inline-block">עשרות:</span>` (dir=rtl, unicode-bidi=isolate)
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">30 + 20 = 50</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"rtl","value":"עשרות:","role":"label"},{"dir":"ltr","value":"30 + 20 = 50","role":"math"}]`

### `אחדות: 8 + 7 = 15`

**Runs:** `[{"type":"prose","value":"אחדות:"},{"type":"math","value":"8 + 7 = 15"}]`

**DOM nodes:**
- `<span dir="rtl" style="direction:rtl;unicode-bidi:isolate;display:inline-block">אחדות:</span>` (dir=rtl, unicode-bidi=isolate)
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">8 + 7 = 15</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"rtl","value":"אחדות:","role":"label"},{"dir":"ltr","value":"8 + 7 = 15","role":"math"}]`

### `סה״כ: 50 + 9 = 59`

**Runs:** `[{"type":"prose","value":"סה״כ:"},{"type":"math","value":"50 + 9 = 59"}]`

**DOM nodes:**
- `<span dir="rtl" style="direction:rtl;unicode-bidi:isolate;display:inline-block">סה״כ:</span>` (dir=rtl, unicode-bidi=isolate)
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">50 + 9 = 59</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"rtl","value":"סה״כ:","role":"label"},{"dir":"ltr","value":"50 + 9 = 59","role":"math"}]`

### `7 + 8 = 15`

**Runs:** `[{"type":"math","value":"7 + 8 = 15"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">7 + 8 = 15</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"7 + 8 = 15","role":"math"}]`

### `47 + 28 = 75`

**Runs:** `[{"type":"math","value":"47 + 28 = 75"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">47 + 28 = 75</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"47 + 28 = 75","role":"math"}]`

### `π ≈ 3.14`

**Runs:** `[{"type":"math","value":"π ≈ 3.14"}]`

**DOM nodes:**
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">π ≈ 3.14</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"ltr","value":"π ≈ 3.14","role":"math"}]`

### `- 1 מאה + 2 עשרות + 4 אחדות = 124`

**Runs:** `[{"type":"prose","value":"- "},{"type":"math","value":"1 מאה + 2 עשרות + 4 אחדות = 124"}]`

**DOM nodes:**
- `<span dir="rtl" style="direction:rtl;unicode-bidi:isolate;display:inline-block">-</span>` (dir=rtl, unicode-bidi=isolate)
- `<span dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block">1 מאה + 2 עשרות + 4 אחדות = 124</span>` (dir=ltr, unicode-bidi=isolate)

**Structure analysis:** `[{"dir":"rtl","value":"-","role":"prose"},{"dir":"ltr","value":"1 מאה + 2 עשרות + 4 אחדות = 124","role":"math"}]`


## Tests

```bash
node --test tests/bidi/mixed-hebrew-math-policy.test.mjs
node --test tests/bidi/unified-renderer-dom-contract.test.mjs
node scripts/tests/verify-learning-book-bidi-regression.mjs
```

## Verdict

Automated DOM contract (dir + isolate): **PASS** for listed lines.

## Place-value pedagogical order (2026-06-15 follow-up)

**Problem:** `dir=ltr` alone showed stable but wrong order: `124 = 100 + 20 + 4` instead of `100 + 20 + 4 = 124`.

**Root cause (dual):**
1. **Source** — drafts used total-first decomposition (`124 = 100 + 20 + 4`).
2. **Renderer** — `BookPlaceValueEquation` intentionally rendered `{total} = {terms}`; classifier missed 3-digit lines.

**Fix:**
- `lib/learning-book/place-value-equation-order.js` — canonicalize numeric decompositions (≥3 terms summing to total).
- `mathRun()` in `mixed-hebrew-math-runs.js` applies canonicalization on every math island.
- `BookPlaceValueEquation` renders `{terms.join(" + ")} = {total}`.
- Drafts corrected: `ns_place_tens_units.md`, `ns_place_hundreds.md`, `g3/add_two.md`.

**Diagnostic:** `node scripts/repair/diagnose-place-value-order.mjs [--screenshot]` → `docs/repair/place-value-order-diagnostic.json`

**Regression (string order, not dir-only):**
```bash
node --test tests/bidi/place-value-equation-order.test.mjs
```

Visual owner sign-off: run diagnostic with `--screenshot` after `npm run build && npm run start`.

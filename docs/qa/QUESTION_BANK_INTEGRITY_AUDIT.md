# Question Bank Integrity Audit

**Generated:** 2026-06-27T20:29:00.480Z
**Verdict:** PASS_WITH_WARNINGS

## Scope

- Total questions scanned: **11618**
- Static bank rows: **8216**
- Generated samples: **3402** (6 per matrix cell for math/geometry/hebrew/moledet)
- Subjects: math, geometry, hebrew, english, science, moledet_geography

## Command

```powershell
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
```

## Per-subject totals

| Subject | Total | Structural pass | Structural fail | Leak risk | Missing metadata | Duplicate options | Broken answer |
|---------|------:|----------------:|----------------:|----------:|-----------------:|------------------:|--------------:|
| english | 953 | 953 | 0 | 0 | 0 | 0 | 0 |
| geometry | 792 | 792 | 0 | 10 | 0 | 0 | 0 |
| hebrew | 4005 | 4005 | 0 | 2 | 0 | 0 | 0 |
| math | 1422 | 1422 | 0 | 5 | 0 | 0 | 0 |
| moledet_geography | 3429 | 3429 | 0 | 0 | 0 | 0 | 0 |
| science | 1017 | 1017 | 0 | 0 | 0 | 0 | 0 |

## Top 20 examples

### LEAK — hebrew  grammar
- **Source:** hebrew_rich_pool (utils/hebrew-rich-question-bank.js)
- **ID:** rich:1427
- **Stem:** 'הוא רץ' ו'הוא רץ מחר' — באיזה משפט הפועל בעתיד?
- **Options:** שניהם הווה | הוא רץ | הוא רץ מחר | שניהם עבר
- **Correct:** הוא רץ מחר
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — hebrew  vocabulary
- **Source:** hebrew_rich_pool (utils/hebrew-rich-question-bank.js)
- **ID:** rich:2107
- **Stem:** בקטע: 'נועם והכלב יצאו ליער' — מי הדמויות?
- **Options:** המורה והלוח | המחבר והמדפסת | נועם והכלב | הקורא והספרן
- **Correct:** נועם והכלב
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — math g6 fractions
- **Source:** generator:math:g6:fractions:medium:sample1 (utils/math-question-generator.js)
- **ID:** n/a
- **Stem:** בחרו את השבר הגדול מבין 1/6 ו-3/6: __
- **Options:** 2/6 | 6/3 | 3/6 | 4/6
- **Correct:** 3/6
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — math g6 ratio
- **Source:** generator:math:g6:ratio:easy:sample2 (utils/math-question-generator.js)
- **ID:** n/a
- **Stem:** היחס בין מספר למספר 9 הוא 11:9.
- **Options:** 15 | 7 | 10 | 11
- **Correct:** 11
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — math g6 ratio
- **Source:** generator:math:g6:ratio:medium:sample5 (utils/math-question-generator.js)
- **ID:** n/a
- **Stem:** היחס בין מספר 1 למספר הוא 1:16.
- **Options:** 16 | 12 | 20 | 14
- **Correct:** 16
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — math g6 ratio
- **Source:** generator:math:g6:ratio:hard:sample2 (utils/math-question-generator.js)
- **ID:** n/a
- **Stem:** אתגר יחסים — היחס בין מספר למספר 10 הוא 17:10.
- **Options:** 23 | 17 | 18 | 21
- **Correct:** 17
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — math g6 ratio
- **Source:** generator:math:g6:ratio:hard:sample5 (utils/math-question-generator.js)
- **ID:** n/a
- **Stem:** אתגר יחסים — היחס בין מספר 13 למספר הוא 13:17.
- **Options:** 19 | 17 | 9 | 15
- **Correct:** 17
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g1 shapes_basic
- **Source:** generator:geometry:g1:shapes_basic:easy:sample0 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** שאלת זיהוי קצרה — מלבן: אורך 4 , רוחב 10.
- **Options:** מלבן | ריבוע
- **Correct:** מלבן
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g1 shapes_basic
- **Source:** generator:geometry:g1:shapes_basic:easy:sample3 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** שאלת זיהוי קצרה — מלבן: אורך 10 , רוחב 9.
- **Options:** מלבן | ריבוע
- **Correct:** מלבן
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g1 shapes_basic
- **Source:** generator:geometry:g1:shapes_basic:medium:sample2 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** ארבע צלעות באורך 3 — האם זה תיאור של ריבוע?
- **Options:** ריבוע | מלבן
- **Correct:** ריבוע
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g1 shapes_basic
- **Source:** generator:geometry:g1:shapes_basic:hard:sample2 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** הוכחה מילולית קצרה: מדוע זה ריבוע ולא מלבן כללי?
- **Options:** מלבן | ריבוע
- **Correct:** ריבוע
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g1 shapes_basic
- **Source:** generator:geometry:g1:shapes_basic:hard:sample5 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** הסבר מילולי: למה זה מלבן ולא ריבוע?
- **Options:** מלבן | ריבוע
- **Correct:** מלבן
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g2 shapes_basic
- **Source:** generator:geometry:g2:shapes_basic:hard:sample2 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** הוכחה: למה 37 ו-25 יוצרים מלבן?
- **Options:** ריבוע | מלבן
- **Correct:** מלבן
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g2 solids
- **Source:** generator:geometry:g2:solids:hard:sample4 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** נראה כמו פירמידה במצרים.
- **Options:** תיבה | קובייה | גליל | פירמידה
- **Correct:** פירמידה
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g3 solids
- **Source:** generator:geometry:g3:solids:hard:sample1 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** גוף תלת ממדי עם נראה כמו פירמידה במצרים.
- **Options:** קובייה | גליל | פירמידה | תיבה
- **Correct:** פירמידה
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g4 solids
- **Source:** generator:geometry:g4:solids:easy:sample0 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** גליל נייר נראה כמו — איזה גוף?
- **Options:** קובייה | גליל | תיבה | פירמידה
- **Correct:** גליל
- **Issue:** answer_leak — Correct answer appears in stem

### LEAK — geometry g5 heights
- **Source:** generator:geometry:g5:heights:medium:sample2 (utils/geometry-question-generator.js)
- **ID:** n/a
- **Stem:** נתון מקבילית: בסיס 1 , שטח 37.
- **Options:** 75 | 37 | 38 | 34
- **Correct:** 37
- **Issue:** answer_leak — Correct answer appears in stem

## Notes

- Generator subjects are sampled, not exhaustively enumerated.
- Static banks (science, english, moledet, hebrew rich) are scanned in full where loaded.
- Metadata validation uses Q2-D `validateCanonicalMetadataBlock` (100% coverage expected per Q2-D validator).
- No product files modified by this audit.
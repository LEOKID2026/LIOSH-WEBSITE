# Language Games — Content Audit Summary

Generated: 2026-07-01

**Status: תוכן לא מאושר ל-production.** עיצוב/HUD/layout מאושרים — רק תוכן משימות דורש תיקון.

## קבצי מיפוי

| קובץ | משימות |
|------|--------|
| `docs/qa/language-games-train-mapping.csv` | 90 |
| `docs/qa/language-games-detective-mapping.csv` | 90 |

## סיכום סטטוס

### רכבת המילים (90)
| סטטוס | כמות |
|-------|------|
| מאושר | 90 |
| לתיקון | 0 |
| למחיקה | 0 |
| canCopy=yes | 0 |

### בלש המילים (90)
| סטטוס | כמות |
|-------|------|
| מאושר | 90 |
| לתיקון | 0 |
| למחיקה | 0 |
| canCopy=yes | 0 |

## בדיקות עליון (10 שאלות)

| # | שאלה | תוצאה |
|---|------|--------|
| 1 | אנגלית קל — רק אותיות / אות אחת? | ✅ כן (סוגים) |
| 2 | אין העתקה ישירה מהשאלה? | ✅ |
| 3 | התאמה לכיתות א׳–ו׳? | ✅ |
| 4 | בקרת חזרתיות בסשן? | planner: max 2 same type; phases 5+10+5 — ראה session notes |
| 5 | 30+ משימות לרמה? | ✅ train 30/30/30, detective 30/30/30 |
| 6 | duplicate ids? | ✅ (selftest) |
| 7 | correctAnswer בקלפים? | ✅ (selftest) |

## משימות שנפסלו (למחיקה) — 0

—

## משימות לתיקון — 0




## משימות מאושרות — 180

- `wt-e-u2l-1` (upper_to_lower, easy)
- `wt-e-u2l-2` (upper_to_lower, easy)
- `wt-e-u2l-3` (upper_to_lower, easy)
- `wt-e-u2l-4` (upper_to_lower, easy)
- `wt-e-u2l-5` (upper_to_lower, easy)
- `wt-e-u2l-6` (upper_to_lower, easy)
- `wt-e-u2l-7` (upper_to_lower, easy)
- `wt-e-u2l-8` (upper_to_lower, easy)
- `wt-e-l2u-1` (lower_to_upper, easy)
- `wt-e-l2u-2` (lower_to_upper, easy)
- `wt-e-l2u-3` (lower_to_upper, easy)
- `wt-e-l2u-4` (lower_to_upper, easy)
- `wt-e-l2u-5` (lower_to_upper, easy)
- `wt-e-l2u-6` (lower_to_upper, easy)
- `wt-e-l2u-7` (lower_to_upper, easy)

… ועוד 165 (ראה CSV)


## בעיות מרכזיות (דוגמאות)

### רכבת — medium build_word (8/8 לתיקון)
כל משימות `wt-m-bw-*`: prompt «בנו את המילה milk/green/school…» — המילה באנגלית מופיעה בשאלה והילד מעתיק לקלפים.

### רכבת — medium dual_phrase (7/7 לתיקון)
`wt-m-dp-*`: «העמיסו שני קרונות: red + hat» — שתי התשובות ב-prompt.

### רכbת — hard word_order (8/8 לתיקון)
`wt-h-wo-*`: «סדרו מילים — I / like / pizza» — המשפט באנגלית ב-prompt.

### רכבת — easy first_letter
חלק מהמילים (red, big, bus…) — אוצר/צבע, לא רק פוניקה.

## בקרת חזרתיות (session planner)

- leo-word-train easy session sample: phase1 types=upper_to_lower+lower_to_upper | phase2=3 types | phase3=2 types
- leo-word-train medium session sample: phase1 types=build_word+fill_gaps | phase2=3 types | phase3=2 types
- leo-word-train hard session sample: phase1 types=word_order+sentence_gap | phase2=2 types | phase3=2 types
- leo-word-detective easy session sample: phase1 types=letter_drop+fill_gap | phase2=3 types | phase3=2 types
- leo-word-detective medium session sample: phase1 types=fill_sentence+sort_plural | phase2=3 types | phase3=2 types
- leo-word-detective hard session sample: phase1 types=event_order+title_stamp | phase2=2 types | phase3=2 types

## Selftest — כללים שצריך להוסיף (לא הורצו כתיקון)

- אנגלית קל: להכשיל build_word, dual_phrase, sentence*, correctAnswer מילה מלאה, prompt עם תשובה מלאה
- אנגלית בינוני/קשה: להכשיל prompt עם answer באנגלית / copy pattern
- עברית קל: להכשיל passage, word_family, משפט ארוך
- עברית קשה: passage > 3 משפטים
- כללי: canCopy heuristic, duplicate id, pool < 30

## המלצה לפני קוד

1. **לכבות** ב-`site_game_catalog` עד אישור תוכן (`is_enabled = false`).
2. **לש rewrite** medium train: build_word → רמז עברית/תמונה בלבד; dual_phrase → רמז עברית.
3. **לש rewrite** hard train: word_order → רמז עברית בלבד, בלי slash-English ב-prompt.
4. **לבדוק** easy first_letter — להחליף מילות צבע/אוצר למילים CVC פשוטות.
5. **לבלש** — word_family ב-medium לתיקון; hard passages OK (≤3 משפטים).

לא deploy. לא SQL. לא שינוי עיצוב.

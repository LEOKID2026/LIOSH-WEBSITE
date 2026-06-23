# Parent Report Launch QA — AAA1–AAA12

**Generated:** 2026-06-23T19:23:38
**Parent:** admin@admin.com
**Flags:** all OFF (production launch setting)
**June week seed:** no
**Overall:** **FAIL** (39/48 PASS)

## Summary

| Metric | Value |
| ------ | ----- |
| API+UI matrix | 39 PASS · 0 WARN · 9 FAIL / 48 |
| PDF exports | skipped (skipped by flag) |
| Launch readiness | **NOT_READY** |

## Matrix (child × range)

| child | range | diag | sessions | sufficiency | visible | verdict |
| ----- | ----- | ---: | -------: | ----------- | ------- | ------- |
| AAA1 | one_day | 22 | 2 | preliminary_signal | ok | FAIL |
| AAA2 | one_day | 9 | 1 | preliminary_signal | ok | PASS |
| AAA3 | one_day | 22 | 2 | preliminary_signal | ok | PASS |
| AAA4 | one_day | 16 | 1 | preliminary_signal | ok | PASS |
| AAA5 | one_day | 20 | 2 | preliminary_signal | ok | PASS |
| AAA6 | one_day | 16 | 1 | preliminary_signal | ok | PASS |
| AAA7 | one_day | 22 | 2 | preliminary_signal | ok | PASS |
| AAA8 | one_day | 16 | 1 | preliminary_signal | ok | PASS |
| AAA9 | one_day | 20 | 2 | preliminary_signal | ok | PASS |
| AAA10 | one_day | 16 | 1 | preliminary_signal | ok | PASS |
| AAA11 | one_day | 22 | 2 | preliminary_signal | ok | PASS |
| AAA12 | one_day | 0 | 0 | no_data | ok | FAIL |
| AAA1 | one_week | 110 | 10 | supported_diagnosis | ok | FAIL |
| AAA2 | one_week | 45 | 5 | supported_diagnosis | ok | PASS |
| AAA3 | one_week | 134 | 12 | supported_diagnosis | ok | PASS |
| AAA4 | one_week | 75 | 6 | supported_diagnosis | ok | PASS |
| AAA5 | one_week | 115 | 10 | supported_diagnosis | ok | PASS |
| AAA6 | one_week | 121 | 9 | supported_diagnosis | ok | PASS |
| AAA7 | one_week | 114 | 9 | supported_diagnosis | ok | PASS |
| AAA8 | one_week | 42 | 3 | supported_diagnosis | ok | PASS |
| AAA9 | one_week | 120 | 11 | supported_diagnosis | ok | PASS |
| AAA10 | one_week | 54 | 4 | supported_diagnosis | ok | PASS |
| AAA11 | one_week | 129 | 11 | supported_diagnosis | ok | PASS |
| AAA12 | one_week | 42 | 5 | supported_diagnosis | ok | PASS |
| AAA1 | may_month | 468 | 35 | supported_diagnosis | ok | FAIL |
| AAA2 | may_month | 165 | 24 | supported_diagnosis | ok | FAIL |
| AAA3 | may_month | 448 | 34 | supported_diagnosis | ok | PASS |
| AAA4 | may_month | 316 | 28 | supported_diagnosis | ok | PASS |
| AAA5 | may_month | 439 | 32 | supported_diagnosis | ok | PASS |
| AAA6 | may_month | 407 | 33 | supported_diagnosis | ok | PASS |
| AAA7 | may_month | 533 | 42 | supported_diagnosis | ok | FAIL |
| AAA8 | may_month | 149 | 18 | supported_diagnosis | ok | PASS |
| AAA9 | may_month | 525 | 47 | supported_diagnosis | ok | PASS |
| AAA10 | may_month | 427 | 33 | supported_diagnosis | ok | PASS |
| AAA11 | may_month | 556 | 45 | supported_diagnosis | ok | PASS |
| AAA12 | may_month | 168 | 17 | supported_diagnosis | ok | PASS |
| AAA1 | full | 593 | 46 | supported_diagnosis | ok | FAIL |
| AAA2 | full | 225 | 30 | supported_diagnosis | ok | FAIL |
| AAA3 | full | 582 | 46 | supported_diagnosis | ok | PASS |
| AAA4 | full | 391 | 34 | supported_diagnosis | ok | PASS |
| AAA5 | full | 570 | 43 | supported_diagnosis | ok | PASS |
| AAA6 | full | 550 | 44 | supported_diagnosis | ok | PASS |
| AAA7 | full | 663 | 52 | supported_diagnosis | ok | FAIL |
| AAA8 | full | 204 | 23 | supported_diagnosis | ok | PASS |
| AAA9 | full | 645 | 58 | supported_diagnosis | ok | PASS |
| AAA10 | full | 497 | 38 | supported_diagnosis | ok | PASS |
| AAA11 | full | 705 | 58 | supported_diagnosis | ok | PASS |
| AAA12 | full | 219 | 23 | supported_diagnosis | ok | PASS |

## Scenario highlights

| Check | Result |
| ----- | ------ |
| AAA1 no-data (full) | FAIL |
| AAA2 insufficient (may_month) | FAIL |
| AAA5 supported (full) | PASS |
| AAA6 parent activity (full) | PASS |
| AAA7 book/learning (full) | FAIL |
| AAA12 parent+science (full) | PASS |
| one_week June activity (AAA3) | PASS |

## Failures

- **AAA1 / one_day:** diagnostic_zero(22)
- **AAA12 / one_day:** parent_activity_reflected({"pa":0,"paAlt":0,"answers":0})
- **AAA1 / one_week:** diagnostic_zero(110)
- **AAA1 / may_month:** diagnostic_zero(468); no_data_sufficiency("supported_diagnosis"); no_strong_diagnosis_language(["יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי.","יש התקדמות יחסית בעברית — כדאי לשמר את הרצף."])
- **AAA2 / may_month:** diagnostic_max(165); insufficient_or_less("supported_diagnosis"); no_strong_diagnosis_language(["נראה שיש קושי בעברית, בעיקר לפי התרגולים האחרונים.","כדאי לשים לב לקריאה — זה נושא שחוזר בתרגולים."])
- **AAA7 / may_month:** diagnostic_zero(533)
- **AAA1 / full:** diagnostic_zero(593); no_data_sufficiency("supported_diagnosis"); no_strong_diagnosis_language(["יש טעויות חוזרות במדעים — שווה לחזור עליהן בקצב איטי.","יש התקדמות יחסית בעברית — כדאי לשמר את הרצף."])
- **AAA2 / full:** diagnostic_max(225); insufficient_or_less("supported_diagnosis"); no_strong_diagnosis_language(["נראה שיש קושי בעברית, בעיקר לפי התרגולים האחרונים.","הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף.","כדאי לשים לב לקריאה — זה נושא שחוזר בתרגולים."])
- **AAA7 / full:** diagnostic_zero(663)

## Launch readiness recommendation

**Not launch-ready** — fix FAIL rows before release. Re-run with `--seed-june-week` for June one_day/one_week QA.

Artifacts: `C:\Users\ERAN YOSEF\Desktop\final projects\FINAL-WEB\LIOSH-WEB-TRY\docs\qa\_artifacts\parent-report-launch-qa`
# Phase 4 — Evidence Thresholds / Parent Wording / Recommendation Safety

תאריך: 2026-06-15

## 1. ספים שנמצאו לפני האיחוד

| סף | מקור | שימוש |
|----|------|--------|
| **0** | `subject-evidence-policy`, `evidence-quality` | אין נתונים / לא תורגל |
| **1–4** | `evidence-quality` (`INSUFFICIENT`) | מעט מידע, לא מסיקים |
| **5** | `positive-evidence` (`TOPIC_DIAGNOSTIC_MIN`), `evidence-quality` (`PRELIMINARY_MIN`) | תחילת סימן ראשוני |
| **5–7** | `evidence-polarity` (`THIN_MAX=7`) | מקצוע «דק» / copilot thin |
| **8** | `subject-evidence-policy` (`SUBJECT_VALID_MIN`), `parent-report-topic-evidence` (`minQuestionsTopicConclusion`), `positive-evidence` (`SUBJECT_DIAGNOSTIC_MIN`), `parent-report-row-diagnostics`, `diagnostic-restraint` | תובנה מקצוע/נושא, מסקנת שורה |
| **12** | `evidence-quality` (`SUPPORTED_MIN`), `topic-evidence` (`minQuestionsModerate`), `decision-gates`, `confidence-policy`, `diagnostic-restraint` (kgSupport) | מסקנה חזקה / שערי החלטה |
| **15** | `parent-facing-report-authority` (`THIN_DATA_MAX_ANSWERS`), `topic-next-step-config` (`maxTopicRecommendationsPerSubject`) | דוח דק ברמת תלמיד (סה״כ) / cap UI |
| **40** | `topic-evidence` (`minQuestionsHighVolume`) | נפח גבוה — לא «אסוף עוד» |
| **7 / 10 / 14 / 18 / 22** | `topic-next-step-config` | שינוי רמה/כיתה אגרסיבי (מנוע next-step, לא ניסוח הורה) |

**בעיה:** אותו מספר שאלות קיבל משמעות שונה בין שכבות (למשל 8 = «תקף» במקצוע אבל `allowsStrongParentDiagnosis` אפשר PRELIMINARY; «כיוון ברור» ב-confidence בלי סף חוזק).

## 2. המדיניות החדשה (מטריצה אחידה)

מקור: `utils/parent-report-language/parent-evidence-matrix.js`

| Tier | שאלות | ניסוח הורה |
|------|--------|------------|
| `none` | 0 | לא תורגל / אין נתונים — אין המלצה מקצועית |
| `insufficient` | 1–4 | מעט מידע — לא מסיקים |
| `preliminary` | 5–7 | כיוון ראשוני בלבד |
| `insight` | 8–11 | תובנה זהירה (hedged) — «קושי יחסי», «כדאי לשים לב» |
| `strong` | 12–39 | המלצה/מסקנה חזקה (עם recurrence ל-SUPPORTED ב-evidence-quality) |
| `high_volume` | 40+ | נפח גבוה — לא מבקשים «אסוף עוד» רק בגלל volume |

**15** = `STUDENT_REPORT_THIN_MAX` — סף **סה״כ תשובות בדוח** (thin copy + suppress client diagnostics), לא סף נושא.

**Recurrence** (2+ טעויות ב-2+ ימים) נדרש ל-`supported_diagnosis` ב-12+ — לא השתנה.

## 3. קבצים ששונו

| קובץ | שינוי |
|------|--------|
| `utils/parent-report-language/parent-evidence-matrix.js` | **חדש** — owner מרכזי |
| `utils/parent-report-language/subject-evidence-policy.js` | ייבוא `INSIGHT_MIN` (8) מהמטריצה |
| `utils/parent-report-topic-evidence.js` | ספים 4/8/12/40; `thinMax` = 4 |
| `lib/learning/evidence-quality.js` | ספים ממטריצה; `allowsStrong*` = SUPPORTED בלבד; `allowsHedged*` ל-8+ |
| `utils/parent-report-diagnostic-restraint.js` | 4/8/12/40 מהמטריצה |
| `utils/parent-report-decision-gates.js` | `weak` אם `q < 12` מהמטריצה |
| `lib/parent-server/parent-facing-report-authority.js` | thin = 15 מהמטריצה |
| `lib/parent-server/parent-report-parent-facing.server.js` | strong vs hedged insights; מינימום 8 לנושא/מקצוע |
| `utils/parent-report-language/confidence-parent-he.js` | «כיוון עקבי» רק מ-12+; «כיוון ראשוני» מתחת |
| `utils/parent-copilot/evidence-polarity.js` | thin=7, valid=8 מהמטריצה |
| `utils/topic-next-step-config.js` | `minQuestionsLowConfidence` = 7 מהמטריצה |
| `tests/learning/evidence-quality-layer.test.mjs` | בדיקות Phase 4 + hedged/strong |
| `tests/learning/question-metadata-consumption.test.mjs` | עדכון ציפיות 8q = hedged לא strong |

## 4. איך נמנעה סתירה בין 5 / 8 / 12 / 15

- **5** = תחילת preliminary (לא insufficient) — אותו מקור ל-positive-evidence topic min ו-evidence-quality preliminary.
- **8** = תחילת insight (מקצוע תקף, מסקנת נושא, hedged copy) — `INSIGHT_MIN`.
- **12** = תחילת strong (`STRONG_MIN`) + `supported_diagnosis` עם recurrence.
- **15** = רק `STUDENT_REPORT_THIN_MAX` (סה״כ דוח) — לא מתערבב עם ספי נושא.

כל השכבות מייבאות מאותו קובץ או מ-re-export שלו; אין יותר «8 = valid» במקום אחד ו«strong diagnosis» ב-PRELIMINARY באחר.

## 5. יישור short / detailed / PDF

- **Short (parent-facing server):** `buildParentInsightsHe` — strong רק ב-SUPPORTED; hedged ב-8–11; מינימום 8 לדירוג חולשות נושא.
- **Detailed (`detailed-parent-report.js`):** משתמש ב-`TOPIC_EVIDENCE_THRESHOLDS` שמקושר למטריצה (8/12/40).
- **PDF:** אותו מסלול טקסט דרך parent-facing / detailed — לא שינוי עיצוב.
- **Confidence strip:** `confidenceLevelParentSummaryHe(level, questionCount)` מונע «כיוון ברור/עקבי» חזק מתחת ל-12.

## 6. פעילות הורה — נפח כללי בלי label נפרד

לא נוסף section חדש. ב-`report-data-aggregate.server.js` (ללא שינוי ב-Phase 4) פעילות הורה:

- נספרת ב-`parent_activity_attempts` ל-`diagnosticAnswers` / topic agg.
- `bumpEvidenceSourceCount(..., PARENT_ASSIGNED)` — מקור פנימי, לא label UI.
- מוצגת בנפח כרטיס מקצוע/נושא כמו תרגול עצמי — לא כקטגוריה «פעילות הורה» בדוח.

## 7. בדיקות שנוספו

ב-`tests/learning/evidence-quality-layer.test.mjs`:

- `Phase 4 — tier classification aligns 5 / 8 / 12 / 15 roles`
- `confidence high wording hedged below strong threshold`
- `insight tier (8–11) allows hedged Hebrew only`
- `supported tier allows strong Hebrew weakness lines`

עדכון ב-`question-metadata-consumption.test.mjs` לציפיית hedged ב-8 שאלות.

## 8. בדיקות שהורצו ותוצאות

| בדיקה | תוצאה |
|--------|--------|
| `node --test tests/learning/evidence-quality-layer.test.mjs` | **17/17 pass** |
| `npx tsx scripts/parent-report-zero-evidence-policy.mjs` | **OK** |
| `npx tsx scripts/parent-report-diagnostic-evidence.mjs` | **OK** |
| `node --test tests/learning/question-metadata-consumption.test.mjs` | **88/88 pass** |

## 9. סיכונים פתוחים

1. **מנוע next-step** — ספים 10/14/18/22 נשארו ב-`topic-next-step-config` (שינוי רמה/כיתה); לא מיושרים ל-8/12 — מכוון: מנוע פדגוגי פנימי, לא ניסוח הורה ישיר.
2. **positive-evidence.js** — עדיין מגדיר `TOPIC_DIAGNOSTIC_MIN: 5` מקומית; עקבי עם preliminary במטריצה אך לא מייבא מהמטריצה (סיכון drift עתידי קטן).
3. **«כיוון ברור» בטקסטים סטטיים** — קיימים ב-narrative contracts / topic-next-step-phase2 / v2-parent-copy; לא כולם עברו סריקה; confidence-parent-he ו-strong gating מכסים המסלול הדינמי המרכזי.
4. **Metadata promotion** — `allowsStrongParentTopicInsight` עדיין מאפשר override מ-promotion בלי volume SUPPORTED; מכוון לניסוי פנימי עם flag.
5. **בדיקות E2E / PDF signoff** — לא הרצה מלאה של `test:parent-report-phase6` בחלוף זה; מומלץ לפני release.

## Definition of Done — סטטוס

| קריטריון | סטטוס |
|----------|--------|
| constants/מדיניות evidence אחידה | ✅ `parent-evidence-matrix.js` |
| אין סתירה בין surfaces (server insights) | ✅ |
| אין המלצה חזקה בלי מספיק נתונים | ✅ SUPPORTED + hedged tier |
| אין המלצה למקצוע/נושא ללא שאלות | ✅ subject-evidence-policy (unchanged) |
| בדיקות עוברים | ✅ ראו §8 |

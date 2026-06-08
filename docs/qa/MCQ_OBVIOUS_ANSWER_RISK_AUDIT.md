# MCQ Obvious Answer Risk Audit

**Generated:** 2026-06-08T04:34:14.924Z
**Verdict:** PASS_WITH_WARNINGS

## Command

```powershell
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
```

## Summary

| Metric | Count |
|--------|------:|
| MCQ scanned | 8932 |
| Flagged questions | 549 |
| BLOCKER | 0 |
| FAIL | 0 |
| WARN | 549 |

## Per-subject

| Subject | MCQ total | Flagged | FAIL | WARN |
|---------|----------:|--------:|-----:|-----:|
| english | 953 | 10 | 0 | 10 |
| geometry | 792 | 65 | 0 | 67 |
| hebrew | 702 | 118 | 0 | 123 |
| math | 1422 | 44 | 0 | 46 |
| moledet_geography | 4046 | 198 | 0 | 198 |
| science | 1017 | 114 | 0 | 116 |

## Top flagged examples (first 30)

### WARN — science g3 body
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה תפקידה העיקרי של מערכת הנשימה?
- **Options:** להוביל דם לרקמות עם חמצן ומזון | להחליף חמצן ופחמן דו־חמצני מול האוויר | לפרק מזון לחומרים קטנים במעיים | לתת שלד, להגין על איברים ולסייע בתנועה
- **Correct:** להחליף חמצן ופחמן דו־חמצני מול האוויר
- **B_format_outlier** (WARN): Only correct option has Hebrew niqqud
  - Fix direction: Apply consistent Hebrew niqqud treatment to distractors or remove from correct-only cue

### WARN — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהי פוטוסינתזה?
- **Options:** תהליך שבו הצמח מפרק סוכר לקבלת אנרגיה מחמצן | תהליך שבו הצמח מייצר מזון מאור, מים ופחמן דו־חמצני | תהליך שבו הצמח מאבד מים דרך פיוניות ביום בהיר | תהליך שבו רוב הפוטוסינתזה מתבצעת בגזע מתחת לאדמה
- **Correct:** תהליך שבו הצמח מייצר מזון מאור, מים ופחמן דו־חמצני
- **B_format_outlier** (WARN): Only correct option has Hebrew niqqud
  - Fix direction: Apply consistent Hebrew niqqud treatment to distractors or remove from correct-only cue

### WARN — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** הצמח נושם רק ביום, כאשר יש אור שמש.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה תפקיד פיוניות בעלה?
- **Options:** הובלת מים ומינרלים מהשורש אל קצה העלה | סגירה מוחלטת של פני העלה מכל מגע עם האוויר בכל שעות היממה | ויסות כניסת פחמן דו־חמצני ויציאת גזים ואדים | אגירת עמילן לטווח ארוך בעיקר בפקעות השורש
- **Correct:** ויסות כניסת פחמן דו־חמצני ויציאת גזים ואדים
- **B_format_outlier** (WARN): Only correct option has Hebrew niqqud
  - Fix direction: Apply consistent Hebrew niqqud treatment to distractors or remove from correct-only cue

### WARN — science g3 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו מצב הצבירה של קרח?
- **Options:** מוצק | נוזל | גז | תערובת
- **Correct:** מוצק
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 earth_space
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה נכון לגבי מסלול כדור הארץ?
- **Options:** כדור הארץ מקיף את הירח פעם בשנה | כדור הארץ מקיף את השמש פעם בשנה (מסלול השנה) | מסלול השנה הוא סיבוב כדור הארץ סביב צירו אחת לשנה | מסלול השנה נמשך כמו יום־לילה אחד — כ־24 שעות
- **Correct:** כדור הארץ מקיף את השמש פעם בשנה (מסלול השנה)
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g5 earth_space
- **Source:** science_bank (data/science-questions.js)
- **Stem:** הירח הוא כוכב שמאיר מעצמו.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 environment
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהי מערכת אקולוגית (מערכת סביבתית)?
- **Options:** אוסף מבנים בני אדם בלבד בלי טבע פתוח באופן שונה | יצורים חיים יחד עם סביבתם והקשרים ביניהם (מזון, מחיה וכו') | רק אוסף דגימות במוזיאון ללא סביבה חיה באופן שונה | תרשים בניינים בעיר בלי תיאור של צמחים, בעלי חיים ומזון
- **Correct:** יצורים חיים יחד עם סביבתם והקשרים ביניהם (מזון, מחיה וכו')
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g5 experiments
- **Source:** science_bank (data/science-questions.js)
- **Stem:** בכל ניסוי אפשרי חייבים תמיד להחליף כמה משתנים בו־זמנית.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 body
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה תפקיד הריאות?
- **Options:** לפרק מזון לחומרים קטנים שנספגים במעי | לנשום – להכניס חמצן ולהוציא פחמן דו־חמצני | להניע דם בגוף כמו משאבה מרכזית | לסנן פסולת ולשמור על איזון מים ומלחים בדם
- **Correct:** לנשום – להכניס חמצן ולהוציא פחמן דו־חמצני
- **B_format_outlier** (WARN): Only correct option has Hebrew niqqud
  - Fix direction: Apply consistent Hebrew niqqud treatment to distractors or remove from correct-only cue

### WARN — science g1 animals
- **Source:** science_bank (data/science-questions.js)
- **Stem:** כל בעלי החיים אוכלים את אותו סוג מזון.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה נמצא למטה בצמח?
- **Options:** עלים | שורשים | פרחים | פירות
- **Correct:** שורשים
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה קורה לצמח אם אין לו מים?
- **Options:** הוא ממשיך לגדול זמן רב אם יש לו הרבה אור | הוא נובל ונחלש | העלים נשארים זקופים וירוקים גם בלי מים זמן רב | הצמח מפסיק נשימה עד שמגיעים מים מחדש
- **Correct:** הוא נובל ונחלש
- **A_length_outlier** (WARN): Correct option much shorter than distractors (14 vs avg 40.3)
  - Fix direction: Make distractors similarly concise

### WARN — science g1 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** צמח יכול לגדול גם בלי אור שמש.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g1 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו מצב הצבירה של מים בברז?
- **Options:** מוצק | נוזל | גז | מוצק, רק כשהמים קפואים בצינור בחורף קר מאוד
- **Correct:** נוזל
- **A_length_outlier** (WARN): Correct option much shorter than distractors (4 vs avg 16.3)
  - Fix direction: Make distractors similarly concise

### WARN — science g1 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** איזה חומר הוא קשה וחזק?
- **Options:** ספוג יבש | שעווה רכה | אבן | גומי רך
- **Correct:** אבן
- **A_length_outlier** (WARN): Correct option much shorter than distractors (3 vs avg 8.0)
  - Fix direction: Make distractors similarly concise

### WARN — science g1 earth_space
- **Source:** science_bank (data/science-questions.js)
- **Stem:** איך מזג האוויר משתנה?
- **Options:** נשאר זהה לאורך כל השנה (בלי משתנה) | משתנה: חם, קר, גשום או שמשי | חם קבוע בכל אזור באותו יום (בלי משתנה) | קר קבוע בלי ימים חמים
- **Correct:** משתנה: חם, קר, גשום או שמשי
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g1 earth_space
- **Source:** science_bank (data/science-questions.js)
- **Stem:** השמש מאירה רק בחלק מהימים.
- **Options:** נכון | לא נכון
- **Correct:** לא נכון
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה קורה למים כאשר הם מתחממים מאוד?
- **Options:** הם הופכים לקרח באופן שונה | הם הופכים לאדי מים (גז) | הם נשארים נוזל באופן שונה | הם נעלמים באופן שונה
- **Correct:** הם הופכים לאדי מים (גז)
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g3 environment
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו זיהום?
- **Options:** סביבה נקייה מכל מזהם באופן שונה | הוספת חומרים מזיקים לסביבה שגורמים נזק | גשם שמדלל תמיד כל מזהם באוויר | אור שמש שמונע לחלוטין כניסת גזים לאטמוספרה
- **Correct:** הוספת חומרים מזיקים לסביבה שגורמים נזק
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g5 body
- **Source:** science_bank (data/science-questions.js)
- **Stem:** איך עובדת מערכת העיכול?
- **Options:** עיכול בפה בלבד בלי המשך בקיבה או במעיים | מזון עובר פה, קיבה ומעיים; פירוק וספיגה לדם | פירוק בקיבה בלי המשך של מעיים | ספיגה במעיים בלי שלב בפה ובקיבה
- **Correct:** מזון עובר פה, קיבה ומעיים; פירוק וספיגה לדם
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו פוטוסינתזה?
- **Options:** פירוק סוכר בחמצן כדי להפיק אנרגיה באופן שונה | שימוש באור, מים ופחמן דו־חמצני לייצור סוכר ושחרור חמצן | משיכת מים מהקרקע בלי קשירת אור באופן שונה | הארכת הגבעול בלילה בלי כלורופיל באופן שונה
- **Correct:** שימוש באור, מים ופחמן דו־חמצני לייצור סוכר ושחרור חמצן
- **B_format_outlier** (WARN): Only correct option has Hebrew niqqud
  - Fix direction: Apply consistent Hebrew niqqud treatment to distractors or remove from correct-only cue

### WARN — science g5 earth_space
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה גורם לליקוי חמה?
- **Options:** הירח עובר בין השמש לכדור הארץ ומסתיר חלק או את כל השמש | כדור הארץ עובר בין השמש לירח — גרסה של ליקוי ירח | כשהירח מלא והאור שלו חוסם את השמש מהארץ | כשעננים עבים מכסים את השמש לשעות ארוכות
- **Correct:** הירח עובר בין השמש לכדור הארץ ומסתיר חלק או את כל השמש
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g5 body
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה תפקיד הלבלב?
- **Options:** הזרמת דם מזין כמו הלב באופן שונה | לייצר אינסולין (הורמון) ומיצי עיכול | נשימה תאית כמו בריאות באופן שונה | ייצוב שלד ללא הורמונים באופן שונה
- **Correct:** לייצר אינסולין (הורמון) ומיצי עיכול
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g3 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו דיות (טרנספירציה)?
- **Options:** קליטת מים בשורש בלי אובדן מהעלה | תהליך שבו צמחים מאבדים מים דרך העלים (אדי מים) | ייצור סוכר בעזרת אור בלי אידוי | הארכת הגבעול בלי יציאת אדים באופן שונה
- **Correct:** תהליך שבו צמחים מאבדים מים דרך העלים (אדי מים)
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g1 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו מצב הצבירה של מים?
- **Options:** תמיד מוצק בטמפרטורת החדר | תמיד נוזל בלי יוצא מן הכלל | רק גז בטבע בכל עונה | מוצק, נוזל או גז לפי טמפרטורה
- **Correct:** מוצק, נוזל או גז לפי טמפרטורה
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

### WARN — science g1 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מה קורה לקרח כשהוא מתחמם?
- **Options:** נשאר קרח אם לא מחממים מעל נקודת ההקפאה | הופך למים (נוזל) | הופך ישירות לאדים בלי שלב נוזל | מתרכב חזק יותר ונשאר מוצק
- **Correct:** הופך למים (נוזל)
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g3 materials
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו חומר אי-אורגני?
- **Options:** חומר שמקורו ביצורים חיים באופן שונה | חומר שמקורו בדומם (סלעים, מתכות, מינרלים) | פולימר סינתטי בלי גרעין מינרלי | עץ מעובד שמכיל תאים צמחיים באופן שונה
- **Correct:** חומר שמקורו בדומם (סלעים, מתכות, מינרלים)
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g2 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** מהו קומפוסט?
- **Options:** אדמה שאינה עברה פירוק חומרים באופן שונה במקרה אחר | דשן טבעי שנוצר מפירוק של פסולת אורגנית (שאריות מזון, עלים וכו') | שקע מים עומד בלי חומר צמחי באופן שונה במקרה אחר | שברי סלע קלים שאינם מתפרקים באופן שונה במקרה אחר
- **Correct:** דשן טבעי שנוצר מפירוק של פסולת אורגנית (שאריות מזון, עלים וכו')
- **B_format_outlier** (WARN): Only correct option has parentheses
  - Fix direction: Apply consistent parentheses treatment to distractors or remove from correct-only cue

### WARN — science g2 plants
- **Source:** science_bank (data/science-questions.js)
- **Stem:** למה צמחים חשובים?
- **Options:** קישוט נוף בלי תרומה לאקולוגיה באופן שונה | מייצרים חמצן שאנחנו נושמים, מספקים מזון ומספקים בית לבעלי חיים | גדילה לגובה בלי פוטוסינתזה באופן שונה במקרה אחר | תפיסת שטח קרקע בלי יצירת מזון באופן שונה
- **Correct:** מייצרים חמצן שאנחנו נושמים, מספקים מזון ומספקים בית לבעלי חיים
- **B_format_outlier** (WARN): Only correct option has Hebrew prefix
  - Fix direction: Apply consistent Hebrew prefix treatment to distractors or remove from correct-only cue

---

## Diagnostic handling recommendation

### Current state

- **No runtime field** marks MCQ obvious-answer risk today. Phase 8 `questionEngine` exposes `answerLeakageRisk` (`stem_leak`, `explanation_shown`, etc.) but not obviousness/trivial-guess quality.
- **`questionQuality`** appears in the diagnostic master plan as a 0–1 engine-metadata confidence score, not MCQ distractor quality.
- **Canonical metadata contract** (`QUESTION_METADATA_CONTRACT.md`) has no `mcqObviousnessRisk` field yet; Q2-D validator enforces skill/topic/answerFormat only.
- **Frozen snapshots** preserve `params.canonicalMetadata` and Phase 8 `questionEngine`; a new internal-only field could be added additively without changing public parent API.
- **Evidence quality (Q1/Q2-E)** counts diagnostic answers and recurrence; it does **not** downweight by question quality.
- **Flags** `DIAGNOSTIC_METADATA_*` default OFF; no consumption path exists for quality-based exclusion.

### Recommended future design (no active change in this pass)

```json
{
  "questionQuality": {
    "mcqObviousnessRisk": "none | warn | fail | blocker",
    "mcqObviousnessCategories": ["A_length_outlier", "..."],
    "auditedAt": "ISO-8601",
    "auditVersion": "mcq-obvious-v1"
  }
}
```

| Property | Recommendation |
|----------|----------------|
| Storage | `params.canonicalMetadata.questionQuality` or sibling internal block |
| Preservation | Copy into frozen activity snapshot at assign/freeze time |
| Public API | Strip in `stripInternalReportPayloadFields` — never in parent `meta.evidenceQuality` |
| Diagnostic use | Optional downweight/exclude behind **new default-OFF** flag e.g. `DIAGNOSTIC_MCQ_QUALITY_DOWNWEIGHT_ENABLED` |
| Scope | Parent-context only at first; no school/teacher parity until approved |
| Behavior | Audit populates severity; engine ignores until flag ON |

### Risks

- False positives from heuristic audit could suppress valid evidence if flag enabled prematurely.
- Generator-only sampling may miss per-session shuffle bugs; pool-level index skew (category G) needs runtime telemetry.
- Adding consumption before bank fixes could hide real weaknesses instead of improving items.

### Confirmation

**No active diagnostic behavior was changed in this audit pass.**
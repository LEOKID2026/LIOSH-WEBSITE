# Production Fix QA Report

**Status:** NOT_APPROVED — ready for owner re-test only
**Range:** 2026-05-26 – 2026-06-24
**214q report found:** YES
**Matched:** בדיקה-ב2 (38e2dbcf-a927-419f-a2ed-b26c7100e656)

```json
{
  "totalQuestions": 214,
  "overallAccuracy": 52.8,
  "totalMinutes": 372,
  "subjectBreakdown": {
    "math": {
      "questions": 102,
      "accuracy": 33.33
    },
    "geometry": {
      "questions": 25,
      "accuracy": 72
    },
    "english": {
      "questions": 18,
      "accuracy": 66.67
    },
    "hebrew": {
      "questions": 25,
      "accuracy": 64
    },
    "science": {
      "questions": 44,
      "accuracy": 75
    },
    "moledet_geography": {
      "questions": 0,
      "accuracy": 0
    }
  }
}
```

## Production HTTP (10 questions)

| שאלה | status | ambiguous | NO_DATA | intent | תשובה (קצר) |
| ---- | ------ | --------- | ------- | ------ | ----------- |
| מה הכי חשוב כרגע? | 200 | לא | לא | what_is_most_important | הדבר הכי חשוב כרגע הוא לבחור נושא אחד לחיזוק ולא לפזר את התרגול. לפי הדוח, המקום |
| איפה רואים התקדמות? | 200 | לא | לא | explain_report | בדוח הנוכחי לא מופיעה השוואה מספיקה שמוכיחה שינוי מהשבוע הקודם. כן אפשר לראות אי |
| מה כדאי להימנע ממנו עכשיו? | 429 | לא | לא | - |  |
| מה לעשות בבית היום? | 429 | לא | לא | - |  |
| איפה הוא צריך עזרה? | 429 | לא | לא | - |  |
| למה כתוב שיש פער במתמטיקה? | 429 | לא | לא | - |  |
| האם הבעיה היא נשיאה? | 429 | לא | לא | - |  |
| האם זה בגלל לחץ זמן? | 429 | לא | לא | - |  |
| האם הפעילות שנתתי לו השפיעה? | 429 | לא | לא | - |  |
| תסביר לי את הדוח במילים פשוטות. | 429 | לא | לא | - |  |
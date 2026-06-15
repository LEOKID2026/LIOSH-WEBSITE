# תוצאות תרחישים — דוחות הורים בעברית

תאריך בדיקה: 2026-06-15  
תחום: Parent dashboard, Parent report short, Parent report detailed, PDF/export, API/payload, composers, AI/fallback.  
הגבלה: לא בוצעו תיקוני קוד ולא שונו קבצי מוצר. הבדיקה מבוססת על קריאת קוד ומיפוי לוגיקת runtime, לא על הרצת browser מלאה.

## מסקנה קצרה

דוחות ההורים אינם מוכנים להשקה. קיימים חוסמי השקה סביב: מסקנות/המלצות במידע דל, ניסוח אבחוני, המלצות ללא ראיות מספיקות, AI/fallback שנכנס למסמך ההורה, ו־PDF שנוצר מ־DOM בזמן אמת ללא snapshot מובטח.

## 1. הורה עם אפס נתונים

### נתונים/fixture

```json
{
  "summary": {
    "totalAnswers": 0,
    "totalQuestions": 0,
    "totalSessions": 0,
    "totalTimeMinutes": 0
  },
  "subjects": [],
  "recentMistakes": [],
  "source": "parent"
}
```

### מה הדוח הציג בפועל

- Short report מציג: "אין עדיין מספיק פעילות בתקופה שנבחרה. אחרי קצת תרגול יופיע כאן סיכום."
- API/composer יכול להחזיר insight: "לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה."
- home recommendations יכולות להחזיר: "להתחיל מתרגול קצר של 5–10 דקות, פעם ביום, כדי לבנות הרגל נעים."
- AI deterministic fallback מציג: "בתקופה זו לא נאסף תרגול במערכת. כדאי להמשיך לעקוב לאחר תרגול נוסף לפני הסקת מסקנות."
- Detailed report מציג שאין מקצועות עם מספיק נתונים להצגה.

### האם זה תקין

תקין ברובו.

### מה לא תקין

אין BLOCKER ספציפי לאפס נתונים, כל עוד לא מופיעים diagnostic cards, topic recommendations או "המלצת המערכת להמשך התרגול" מתוך AI. הסיכון הוא רוחבי: אותו רכיב AI יכול להיכנס ל־PDF אם קיים snapshot אחר שמכיל text.

### האם BLOCKER

לא בתרחיש האפס כשלעצמו. כן קיים BLOCKER רוחבי ל־AI/PDF.

## 2. מקצוע בלי שאלות בכלל

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "math", "questions": 0, "accuracy": null }
  ],
  "overallSnapshot": {
    "lowExposureSubjectsHe": ["מתמטיקה"]
  }
}
```

### מה הדוח הציג בפועל

- Detailed report מציג: "מקצועות שלא תורגלו בתקופה".
- Data health יכול להציג "מצב הנתונים בדוח".
- כאשר אין `visibleSubjectProfiles`, הדוח מציג: "אין מקצועות עם מספיק נתונים להצגה בתקופה שנבחרה."

### האם זה תקין

תקין אם נשמרת ההפרדה בין "לא תורגל" לבין המלצה מקצועית.

### מה לא תקין

נדרש לוודא ש־home recommendations כלליות לא מוצגות כאילו הן המלצה למקצוע שלא תורגל. אם subject עם אפס שאלות מקבל diagnostic recommendation דרך payload אחר, זה BLOCKER לפי קריטריון המשתמש.

### האם BLOCKER

לא נמצא משפט ודאי שממליץ למקצוע עם אפס שאלות, אבל הסיכון נותר HIGH עד בדיקת fixture runtime מלאה.

## 3. מקצוע עם 1–3 שאלות

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "math", "questions": 3, "accuracy": 33 }
  ],
  "summary": {
    "totalAnswers": 3,
    "totalQuestions": 3
  }
}
```

### מה הדוח הציג בפועל

- Short report מציג הודעת thin evidence: "מעט שאלות בתקופה שנבחרה".
- Short report מסביר שאין משמעות ברורה לגרפים/טבלאות.
- API/composer מציג: "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
- AI explainer fallback יכול לנסח: "לגבי {subject}: מהתרגול המועט שנאסף אפשר לקבל כיוון ראשוני בלבד."
- AI explainer יכול עדיין להציג "המלצת המערכת להמשך התרגול: {recommendedNextStep}".

### האם זה תקין

לא.

### מה לא תקין

ה־UI עצמו מתנהג בזהירות, אבל AI/fallback עלול לתת "כיוון ראשוני" ו"המלצת מערכת" גם כשיש רק 1–3 שאלות. זה סותר את הצורך לא להסיק מסקנות במידע דל.

### האם BLOCKER

כן. AI/המלצה על 1–3 שאלות היא BLOCKER.

## 4. מקצוע עם 4–8 שאלות

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "hebrew", "questions": 6, "accuracy": 50 }
  ],
  "summary": {
    "totalAnswers": 6,
    "totalQuestions": 6
  }
}
```

### מה הדוח הציג בפועל

- Short report עשוי להציג: "יש נתוני תרגול בתקופה שנבחרה, אך עדיין אין מספיק בסיס ברור..."
- Detailed topic narrative יכול להציג: "ב{topic} התמונה עדיין בראשית דרך: היו {q} שאלות, עם דיוק של כ {acc}%."
- AI explainer יכול לנסח: "מהתרגול שנאסף אפשר לראות תחום שכדאי לחזק בבית" אם confidence/accuracyBand מאפשרים.

### האם זה תקין

חלקית.

### מה לא תקין

הנרטיב המפורט זהיר וטוב. הסיכון הוא AI/fallback שמייצר "תחום שכדאי לחזק בבית" על כמות ביניים בלי להציג מספיק ראיות להורה.

### האם BLOCKER

לא תמיד. הופך ל־BLOCKER אם מוצגת המלצה קונקרטית או מסקנה ודאית ללא gate כמותי.

## 5. מקצוע עם 9–12 שאלות

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "english", "questions": 10, "accuracy": 58 }
  ],
  "summary": {
    "totalAnswers": 10,
    "overallAccuracy": 58
  }
}
```

### מה הדוח הציג בפועל

- API/composer יכול להציג: "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף."
- Detailed narrative יכול להציג: "בשלב הזה לא קובעים סופית לגבי {topic}..."
- Topic insight יכול להציג: "כדאי לשים לב ל{topicLine} — זה נושא שחוזר בתרגולים."

### האם זה תקין

חלקית.

### מה לא תקין

"הביצועים הכלליים... מצביעים על צורך בחיזוק נוסף" נשמע מסקנתי מדי לכמות גבולית. לעומת זאת, "לא קובעים סופית" הוא ניסוח טוב. יש חוסר עקביות בין composers.

### האם BLOCKER

לא תמיד. HIGH, ועלול להפוך ל־BLOCKER אם מוצג כקושי ודאי או ללא כמות שאלות לידו.

## 6. מקצוע עם 13–24 שאלות

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "math", "questions": 18, "accuracy": 74 }
  ],
  "summary": {
    "totalAnswers": 18,
    "overallAccuracy": 74
  }
}
```

### מה הדוח הציג בפועל

- Strength composer יכול להציג: "ב{subject} התוצאות נראות די עקביות בתקופה הזו ({acc}% דיוק, {nq} שאלות) — יש עדיין נושאים שכדאי לחזק."
- Short report מציג אזור "איפה נראו תוצאות טובות לפי התרגול שנאסף בתקופה שנבחרה".
- Detailed report יכול להציג subject-level summary ו־topic recommendations.

### האם זה תקין

תקין ברובו.

### מה לא תקין

כאשר topic recommendations מופיעות עם "נושאים שדורשים ליווי", המילה "דורשים" חזקה מדי, גם אם כמות השאלות כבר סבירה.

### האם BLOCKER

לא. HIGH לניסוח "דורשים", לא BLOCKER בתרחיש זה אם קיימות ראיות מספקות.

## 7. מקצוע עם הרבה שאלות ודיוק נמוך

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "math", "questions": 30, "accuracy": 42 }
  ],
  "recentMistakes": [
    { "subject": "math", "topic": "שברים" }
  ]
}
```

### מה הדוח הציג בפועל

- API/composer יכול להציג: "נראה שיש קושי ב{subject}, בעיקר לפי התרגולים האחרונים."
- Topic recommendation narrative יכול להציג: "ב{topic} כרגע עדיף לעצור לחיזוק ממוקד..."
- Short report עשוי להציג: "דורש תשומת לב כעת..."
- Detailed report מציג "נושאים שדורשים ליווי בתקופה שנבחרה".

### האם זה תקין

חלקית.

### מה לא תקין

יש מספיק מידע כדי להמליץ על חיזוק, אבל לא כדי למסגר כ"אבחון" או "קושי" באופן חד בלי הסבר מספרי קרוב. "דורש תשומת לב" ו"אבחון מבוסס נתונים" מגבירים סיכון הורי.

### האם BLOCKER

כן עבור "אבחון מבוסס נתונים" ו־diagnostic framing. יתר המשפטים HIGH אם מוצגים עם ראיות מספיקות; BLOCKER אם מוצגים ללא evidence לידם.

## 8. מקצוע עם הרבה שאלות ודיוק גבוה

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "english", "questions": 28, "accuracy": 90 }
  ]
}
```

### מה הדוח הציג בפועל

- Strength composer מציג: "{subject} נראה כמו מקצוע שהילד מצליח בו יותר כרגע: דיוק גבוה ({acc}%) לאורך {nq} שאלות בתקופה."
- Short report מציג: "תוצאות טובות יחסית — כדאי לשמר..."
- AI/fallback עשוי לייצר summary חיובי בהתאם ל־accuracyBand.

### האם זה תקין

תקין ברובו.

### מה לא תקין

נדרש לוודא שהטקסט נשאר יחסי ולא מבטיח יכולת כללית מחוץ לתקופת הדוח. המשפט הקיים טוב יחסית כי הוא כולל "כרגע" ו"כמות שאלות".

### האם BLOCKER

לא.

## 9. פעילות אישית בלבד

### נתונים/fixture

```json
{
  "activityBreakdown": {
    "personal": 12,
    "book": 0,
    "selfPractice": 0
  },
  "subjects": [
    { "subject": "math", "questions": 12, "accuracy": 67 }
  ]
}
```

### מה הדוח הציג בפועל

- הדוח מציג שאלות/דיוק/מקצוע, אבל לא נמצא הסבר גלוי עקבי שמבדיל להורה שאלה/פעילות אישית לעומת ספר או תרגול עצמי.
- Parent dashboard מציג גישה לדוח, לא מקור פעילות.

### האם זה תקין

לא מספיק.

### מה לא תקין

אם פעילות אישית נספרת לתוך הדוח, ההורה צריך לדעת שזה מקור הנתונים. אחרת הוא עלול לחשוב שהדוח משקף תרגול מערכת מלא/רגיל.

### האם BLOCKER

HIGH. הופך ל־BLOCKER אם המלצות מקצועיות נבנות רק מפעילות אישית בלי disclosure.

## 10. פעילות ספר בלבד

### נתונים/fixture

```json
{
  "activityBreakdown": {
    "personal": 0,
    "book": 20,
    "selfPractice": 0
  },
  "subjects": [
    { "subject": "hebrew", "questions": 20, "accuracy": 62 }
  ]
}
```

### מה הדוח הציג בפועל

- נמצאו summary/recommendation לפי מקצוע וכמות שאלות.
- לא נמצא disclosure גלוי עקבי שמבהיר שהנתונים הגיעו מפעילות ספר בלבד.

### האם זה תקין

לא מספיק.

### מה לא תקין

מקור פעילות משפיע על פרשנות ההורה. פעילות ספר בלבד אינה בהכרח זהה לתרגול אדפטיבי/אישי, ולכן המלצה צריכה להסביר את המקור.

### האם BLOCKER

HIGH. BLOCKER אם ניתנת מסקנה אבחונית/קושי ודאי מתוך פעילות ספר בלבד ללא disclosure.

## 11. תרגול עצמי בלבד

### נתונים/fixture

```json
{
  "activityBreakdown": {
    "personal": 0,
    "book": 0,
    "selfPractice": 18
  },
  "subjects": [
    { "subject": "english", "questions": 18, "accuracy": 55 }
  ]
}
```

### מה הדוח הציג בפועל

- הדוח יכול להציג דיוק, שאלות, נקודות לשיפור והמלצות.
- לא נמצא text gate שמבדיל להורה שהתמונה מבוססת על תרגול עצמי בלבד.

### האם זה תקין

לא מספיק.

### מה לא תקין

הורה עלול להבין שהמסקנות משקפות תהליך למידה מלא, ולא רק תרגול עצמי. זה קריטי במיוחד כאשר accuracy נמוך.

### האם BLOCKER

HIGH. BLOCKER אם מופיע "קושי", "אבחון", או "המלצת המערכת" בלי disclosure.

## 12. כמה מקצועות, אחד חזק ואחד חלש

### נתונים/fixture

```json
{
  "subjects": [
    { "subject": "math", "questions": 24, "accuracy": 91 },
    { "subject": "hebrew", "questions": 24, "accuracy": 45 }
  ]
}
```

### מה הדוח הציג בפועל

- Short report יכול להציג גם חוזק: "תוצאות טובות יחסית — כדאי לשמר..."
- Short/API יכול להציג מוקד: "דורש תשומת לב כעת..." או "נראה שיש קושי ב{subject}..."
- Detailed report מציג פרופילים לפי מקצוע ונושאי חיזוק.

### האם זה תקין

חלקית.

### מה לא תקין

נדרש איזון הורי: לא להפוך מקצוע חלש לכותרת מפחידה כאשר יש גם חוזק ברור. השפה צריכה להבדיל בין "כרגע כדאי לחזק" לבין "יש קושי".

### האם BLOCKER

לא תמיד. BLOCKER אם "אבחון מבוסס נתונים" או "קושי" מוצגים ללא ראיות/איזון.

## 13. דוח קצר מול דוח מפורט

### נתונים/fixture

```json
{
  "studentId": "student-1",
  "range": "month",
  "subjects": [
    { "subject": "math", "questions": 18, "accuracy": 57 }
  ],
  "routes": [
    "/learning/parent-report?source=parent",
    "/learning/parent-report-detailed?source=parent"
  ]
}
```

### מה הדוח הציג בפועל

- Short report משתמש ב־`utils/parent-report-v2.js`, `lib/parent-server/parent-report-parent-facing.server.js`, ו־diagnostic overview.
- Detailed report משתמש גם ב־`utils/detailed-parent-report.js` ו־`utils/detailed-report-parent-letter-he.js`.
- אותו מצב נתונים יכול להופיע כ"דרוש תשומת לב", "נושא שחוזר", "עדיף לעצור לחיזוק ממוקד", או "לא קובעים סופית" בהתאם למסך/רכיב.

### האם זה תקין

לא.

### מה לא תקין

אין מקור טקסט אחד שמבטיח parity סמנטי בין short לבין detailed. עבור הורה, דוח קצר ודוח מפורט על אותו payload צריכים לספר את אותו סיפור בעוצמת ניסוח עקבית.

### האם BLOCKER

כן אם ההבדל משנה מסקנה או חומרה. כרגע זה חוסם launch readiness עד בדיקת parity מלאה או איחוד thresholds.

## 14. UI מול PDF

### נתונים/fixture

```json
{
  "route": "/learning/parent-report-detailed?studentId=student-1&source=parent",
  "action": "click print full or print summary",
  "periodsToCompare": ["week", "month", "day", "schoolYear", "custom"],
  "ai": {
    "loadsAsync": true
  }
}
```

### מה הדוח הציג בפועל

- PDF/export מבוצע דרך `window.print()`.
- `printWithMode` משנה state ואז מפעיל הדפסה.
- AI/insight נטען אסינכרונית ויכול להופיע או לא להופיע לפי timing.
- אין קובץ PDF server-side או snapshot immutable שמבטיח זהות בין UI לבין PDF.
- בדוח המפורט, `day`/`schoolYear`/custom חסר יכולים ליפול ל־`week`, ולכן PDF מפורט עלול להציג טווח וספירות שונים מהדוח הקצר.
- בדוח המפורט, `<details>` נפתחים בכפייה ב־print CSS, ולכן PDF יכול לכלול פירוט שהיה סגור במסך.

### האם זה תקין

לא.

### מה לא תקין

PDF אינו מובטח להיות תואם UI. עבור launch, PDF שמקבל הורה חייב להיות אותו נוסח שנבדק, עם אותם disclaimers, AI state, visibility, period/date window ו־summary/full mode.

### האם BLOCKER

כן. UI/PDF parity לא מובטח הוא BLOCKER, ובפרט preset/date mismatch בדוח המפורט הוא BLOCKER כאשר הוא משנה ספירות או טווח תאריכים.

## סיכום תרחישים לפי חומרה

- BLOCKER: תרחיש 3, תרחיש 7, תרחיש 13, תרחיש 14.
- BLOCKER מותנה אך מסוכן: תרחיש 4, 9, 10, 11, 12 כאשר מופיעים AI/diagnostic/recommendation ללא ראיות או disclosure.
- HIGH: תרחיש 5, 6, 9, 10, 11.
- תקין יחסית: תרחיש 1, 2, 8, בכפוף להסתרת AI/recommendation לא מבוקרים.

## מסקנת השקה לתרחישים

לא מוכנים להשקה. גם כאשר חלק מהמסכים כוללים caveats טובים, יש חוסר עקביות בין short/detailed/API/AI/PDF. לפני השקה חייבים לאחד thresholds, להחליף framing אבחוני, לחסום המלצות במידע דל, ולהבטיח PDF snapshot זהה ל־UI.

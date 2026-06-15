# D — שאלות ותרגילים (עברית + RTL + משוב + רמזים) — Audit 1:1

## תקציר מנהלים
- בוצעה בדיקה 1:1 על **22 שאלות/תרחישים אמיתיים** שהילד רואה בפועל, כולל: generated/static banks, self practice, assigned activity, book practice, parent-assigned flow.
- נמצאו **6 BLOCKERS**, **6 HIGH**, **3 MEDIUM**, **7 LOW**.
- החוסמים המרכזיים: דליפת תשובה במשוב, רמז שמגלה תשובה, משוב באנגלית במקצועות ליבה, ושאלות שניסוחן חושף את התשובה.

## מסקנת השקה: PASS / NOT PASS
**NOT PASS**

הסיבה: קיימים BLOCKERS פעילים בזרימות ליבה של למידה (מתמטיקה/גאומטריה/אנגלית), כולל answer leak/hint leak ו-feedback באנגלית.

## מקורות שאלות שנבדקו
- `utils/math-question-generator.js` (generated math)
- `utils/geometry-question-generator.js` (generated geometry)
- `utils/hebrew-question-generator.js` (generated+legacy wiring Hebrew)
- `data/science-questions-p0-g123-fill.js` (static science)
- `data/hebrew-questions/g3.js` (static Hebrew)
- `data/english-questions/translation-pools.js` (static English)
- `pages/learning/math-master.js`, `pages/learning/geometry-master.js`, `pages/learning/english-master.js` (runtime feedback)
- `pages/student/activity/[activityId].js` (assigned flow: hint/feedback/explanation/no-answer)
- `lib/learning/activity-classification.js`, `lib/learning-supabase/evidence-source.js` (self/assigned/book provenance)
- `utils/student-question-display.js` (RTL/equation handling)

## כמה שאלות/תרחישים נבדקו לפי מקצוע
- מתמטיקה: 5
- גאומטריה: 5
- עברית: 2
- אנגלית: 2
- מדע: 1
- זרימות חוצות מקצוע/פעילות: 7
- סה"כ: 22

## חוסמי השקה
1. **HQ-001 (BLOCKER)** — השוואות `<`/`>` רגישות RTL; סיכון לשינוי משמעות.
2. **HQ-005 (BLOCKER)** — גאומטריה: feedback שגוי חושף תשובה + אנגלית + נוסחה רגישה RTL.
3. **HQ-008 (BLOCKER)** — תשובה מופיעה בגוף השאלה ("שווה צלעות"), בודק ניסוח ולא ידע.
4. **HQ-013 (BLOCKER)** — hint במתמטיקה נותן תשובה סופית.
5. **HQ-017 (BLOCKER)** — English self-practice: feedback באנגלית + חשיפת correct answer.
6. **HQ-018 (BLOCKER)** — Geometry self-practice: feedback באנגלית + חשיפת correct answer.

## בעיות לפי מקצוע
- **מתמטיקה:** רמזים חושפי תשובה; RTL סביב סימני השוואה; שאלות יחידות/סימונים מעורבים דורשות בידוד טוב יותר.
- **גאומטריה:** נוסחי MCQ עם אינדקסים מבלבלים; שאלה טריוויאלית (answer in stem); feedback באנגלית עם answer leak.
- **עברית:** איכות טובה יחסית; יש דליפת תשובה לאחר שגיאה בחלק מתרחישי הקלדה.
- **אנגלית:** בנק השאלות סביר, אך שכבת feedback מרכזית נשארת באנגלית ומדליפה תשובה.
- **מדע:** שאלה עם טבלה שנבדקה תקינה וברורה.

## בעיות לפי סוג פעילות
- **self practice:** רוב הממצאים החמורים (feedback leak, hint leak, RTL).
- **assigned activity:** תצוגת hint/explanation קיימת; דורש policy שמונעת דליפת answer מוקדמת.
- **parent assigned:** מיפוי מקור קיים, אך חייבים לשמור הפרדה בדיווח.
- **book practice:** הסיווג כ-learning_book קיים; חייבים לוודא שלא מתערבב עם evidence אבחוני.

## בעיות answer leak
- HQ-005, HQ-006, HQ-008, HQ-011, HQ-012, HQ-016, HQ-017, HQ-018.
- דפוס חוזר: `feedback_incorrect` מציג "התשובה הנכונה" מיד.

## בעיות hints
- HQ-013 הוא החמור ביותר: רמז מציג את הערך הסופי.
- HQ-014: במסלול assigned אין חסימה מערכתית נגד hint חושף-תשובה (תלוי תוכן מקור).

## בעיות feedback
- אנגלית במשוב במסכי ליבה: `geometry-master`, `english-master`.
- חוסר מדיניות עקבית מתי לחשוף correct answer.

## בעיות RTL
- השוואות `<`/`>` (HQ-001) מסומנות כחסם.
- ערבוב עברית+מספר+יחידות במחרוזת אחת ללא בידוד טוקנים (HQ-004/HQ-005) ברמת HIGH.

## החלטות בעלים נדרשות
1. האם לחשוף correct answer מיד אחרי טעות ב-self practice/assigned?
2. האם מחייבים feedback עברי מלא גם באנגלית לכיתות נמוכות?
3. האם לחסום השקה עד תיקון RTL מלא להשוואות `<`/`>`?
4. האם לבטל סופית פורמט "1=...,2=..." ב-MCQ גאומטריה?
5. האם לשמור hint כתהליך בלבד (ללא תשובה סופית) כמדיניות מוצר רוחבית?

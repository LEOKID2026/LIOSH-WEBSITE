# Audit חשבון/גאומטריה RTL — עברית + מספרים + סימנים

## תקציר מנהלים
- בוצע Audit read-only ממוקד RTL לרכיבי חשבון/גאומטריה במאסטרים, step-by-step, שדות תשובה, פעילויות מוקצות, ו-Book Practice.
- נמצאו **2 בעיות BLOCKER**: כפיית `LTR` לטקסטים ב-SVG דיאגרמות גאומטריה, וזיהוי חסר של ביטויי השוואה (`<`, `>`) כשאלה מתמטית בתצוגת תלמיד.
- נמצאו בעיות נוספות (HIGH/MEDIUM) בשכבות פיצול/איזולציה של טקסט מעורב (עברית+נוסחאות), בעיקר בזוויות/יחידות/שברים/ביטויים שאינם "מספריים טהורים".
- קיימת תשתית טובה בחלק מהרכיבים (`StudentQuestionDisplay`, `LearningMixedHebrewMathText`, `MixedHebrewMathText` בספרים), אך קיימים "חורים" ספציפיים שמאפשרים היפוך/ערבוב סימנים במקרי קצה לימודיים.

## רכיבים/קבצים שנבדקו
- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `components/learning/StudentQuestionDisplay.jsx`
- `utils/student-question-display.js`
- `components/learning/LearningMixedHebrewMathText.jsx`
- `utils/learning-mixed-hebrew-math-render.js`
- `components/learning/StepExpressionExerciseView.jsx`
- `components/learning/StepFractionExerciseView.jsx`
- `components/learning/StepVerticalExerciseView.jsx`
- `components/learning/StepWordProblemExerciseView.jsx`
- `components/learning/StepExerciseViewRouter.jsx`
- `components/learning/StudentNumericAnswerField.jsx`
- `components/learning/VirtualAnswerKeyboard.jsx`
- `lib/learning/virtual-answer-keyboard-layouts.js`
- `components/learning/geometry/GeometryExplanationDiagram.jsx`
- `components/learning/geometry/solids/IsometricSolidView.jsx`
- `components/learning/geometry/GeometryStepLine.jsx`
- `components/learning/geometry/StepGeometryTextHighlights.jsx`
- `utils/learning-step-geometry-text.js`
- `utils/learning-step-fraction-exercise.js`
- `components/student/StudentActivityQuestionSurface.jsx`
- `lib/classroom-activities/student-activity-question-ui.client.js`
- `components/learning-book/BookDiagram.js`
- `components/learning-book/MixedHebrewMathText.js`
- `components/learning-book/BookVerticalArithmetic.js`
- `components/learning-book/BookPlaceValueEquation.js`
- `components/learning-book/LearningPageBody.js`

## סוגי ביטויים רגישים שנמצאו
- תרגילי השוואה עם סימנים: `3 < 5`, `7 > 2`.
- ביטויי זוויות: `120°`, `זווית A = 40°`.
- נוסחאות גאומטריה משולבות עברית+מספר+יחידה: `בסיס 5 ס"מ`.
- שברים: `3/4`, `12/5`, שברי שלבים בהסבר.
- ביטויי צעד-אחר-צעד מסוג "נציב/נחשב" עם שילוב טקסט ונוסחה.
- תצוגת דיאגרמות SVG עם תוויות/טקסט פנימי.
- תצוגת בחירה/משוב בפעילויות מוקצות.
- תצוגת מקלדת/קלט מספרי במובייל.

## בעיות RTL חוסמות
1. **BLOCKER — כפיית `LTR` לכל טקסט SVG בדיאגרמות גאומטריה**
   - ב-`GeometryExplanationDiagram` פונקציית `SvgText` מגדירה `direction: "ltr"` לכל טקסט, כולל טקסט עברי עם מספרים/יחידות.
   - סיכון: הופעת תוויות/הסברים בסדר לא טבעי (עברית+מספר+יחידה), במיוחד בזוויות ומידות.
2. **BLOCKER — זיהוי חסר של `<`/`>` כשאלה מתמטית בתצוגת תלמיד**
   - ב-`utils/student-question-display.js` הזיהוי (`isEquationLikeText`) לא כולל `<`/`>` ולכן ביטויי השוואה עלולים לא לקבל LTR isolate מלא בתצוגה.
   - סיכון: סימני השוואה זזים/מתהפכים בהקשר RTL ומייצרים הבנה שגויה של גדול/קטן.

## בעיות RTL לא חוסמות
- `GeometryStepLine` מבודד נוסחה רק בתבנית "נציב/נחשב", אך שורות מעורבות אחרות נשארות `rtl/plaintext` ללא בידוד רכיב מתמטי.
- `StepGeometryTextHighlights` מציג טקסט מעורב כ-`dir="rtl"` עם `span/mark` ללא `bdi`/`dir` ברמת הטוקן המספרי/יחידה.
- `learning-step-geometry-text` מזהה מספרים רק ב-regex צר יחסית (ללא פסיק עשרוני, אחוזים, מעלות, שברים), ולכן אזורים רגישים לא תמיד מופרדים.
- `learning-step-fraction-exercise` מטפל בעיקר ב-`\d+/\d+`; שברים בפורמטים נוספים עלולים לא להיות מודגשים/מבודדים נכון.
- `learning-mixed-hebrew-math-render` נשען על regex מספרי-קשיח; ביטויים עם משתנים/סימנים מורחבים עלולים לא להתפצל ל-run מתמטי.
- במקלדת מספרית קומפקטית מובייל חסרים מקשים רגישים (כגון מינוס/פסיק), מה שמגדיל תלות בהקלדה מערכתית לא אחידה בהקשר RTL.

## בעיות בתרגילים מאונכים
- ב-master וב-assigned activity, תצוגת מאונך עצמה מבודדת היטב (`dir="ltr"` + `unicodeBidi: isolate`) — לא זוהתה בעיית היפוך ישירה בתצוגה המאונכת עצמה.
- סיכון נלווה: המעבר בין כותרת עברית לתרגיל מאונך תלוי בזיהוי סוג הביטוי; במקרים מעורבים לא סטנדרטיים ייתכן ערבוב.

## בעיות בשברים/סימנים
- שברים בשלב-אחר-שלב מטופלים בפורמט מצומצם; פורמטים חלופיים אינם מזוהים באופן מלא.
- סימני השוואה `<`/`>` לא מכוסים באופן עקבי במסלול זיהוי "equation-like" של תצוגת השאלה.
- ביטויי אחוזים/זוויות/יחידות בתוך טקסט עברי לא תמיד מקבלים בידוד מתמטי מפורש.

## בעיות בגאומטריה
- טקסטי SVG בדיאגרמות (כולל תוויות צלע/בסיס/גובה, הערות חינוכיות) מוכתבים ל-`LTR` גורף.
- גם `IsometricSolidView` מכיל תוויות SVG ב-`LTR` קבוע, מה שעלול לשבור תוויות עבריות אם יוזנו.
- היילייטים טקסטואליים בגאומטריה אינם מבצעים `isolate` פרטני למקטעי מספר/יחידה.

## בעיות במובייל
- פריסת מקלדת קומפקטית אינה כוללת את כל סימני הקלט הנדרשים (לדוגמה `-`, `,`) ולכן התנהגות הקלט תלויה בנתיב אלטרנטיבי.
- במכשירים קטנים, תרחישים של שאלה עברית + ביטוי מתמטי מעורב דורשים בדיקה ויזואלית מלאה כדי לוודא שלא נוצר reorder בסוף שורה/שבירת שורה.

## המלצות תיקון עתידיות לפי אזור
- **Geometry diagrams (SVG)**: לא לכפות `LTR` גלובלי לכל `text`; לקבוע כיווניות לפי סוג הטוקן (עברית/מתמטיקה), או לעטוף טוקנים רגישים בנפרד.
- **Student question display**: להרחיב זיהוי equation-like ל-`<`, `>`, `≤`, `≥`, `°`, `%`, ושילובי יחידות.
- **Step geometry text**: להוסיף token-level isolation (`bdi`/`dir`) למספרים, יחידות, זוויות וסימנים בתוך שורה עברית.
- **Fraction step parser**: להרחיב תמיכה בפורמטי שבר נוספים (רווחים, שליליים, עשרוניים, וריאציות יוניקוד).
- **Mixed Hebrew+Math renderers**: לא להסתמך רק על regex מספרי קשיח; להוסיף מסלול parser לביטויים מעורבים (כולל משתנים/אותיות).
- **Mobile numeric input/keypad**: ליישר יכולות קלט בין desktop/mobile ולהבטיח שהסימנים הרלוונטיים זמינים ובידוד הכיווניות נשמר.

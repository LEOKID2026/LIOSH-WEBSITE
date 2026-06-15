# דוחות הורים בעברית — מיפוי 1:1 לפני השקה

תאריך בדיקה: 2026-06-15  
תחום: דשבורד הורים, דוח הורים קצר, דוח הורים מקיף, תקציר להדפסה, הדפסה/PDF, API/payload, Parent AI/Copilot.  
מגבלה מכוונת: לא נבדקו משחקים, flyer, bingo או טקסטים צדדיים.

## תקציר מנהלים

מסקנת הבדיקה: **NOT PASS**.

המערכת כוללת שכבות הגנה טובות יחסית: דוח רשמי נטען רק דרך `source=parent|teacher` ו־`studentId`; מקצועות עם 0 שאלות מסוננים מהדוח המקיף; קיימים טקסטי “אין מספיק מידע”; ויש disclaimer ברור שמונע הצגה כאבחון מקצועי.

עם זאת, לפני השקה יש חוסמי השקה אמיתיים:

- `ParentReportInsight` יכול להציג טקסט AI/דטרמיניסטי שמסיק “כיוון ראשוני” גם כאשר יש 1 שאלה בלבד או נתון דק מאוד. זה בדיוק אזור שהורה עלול לקרוא כהכוונה מערכתית.
- PDF/הדפסה אינו artifact נפרד אלא print של ה־DOM. בדוח מקיף יש baseline דטרמיניסטי מידי ואז enrich אסינכרוני; אם הורה מדפיס לפני/אחרי enrich, ה־PDF עשוי לא להתאים למה שנראה במסך באותו רגע.
- בדוח הקצר, `ParentReportInsight` מתעדכן אסינכרונית עם AI/LLM אם קיים key, אך אותה תובנה כן נכנסת ל־PDF. אין נעילה או סימון גרסה בין UI/PDF.
- יש ניסוחים אבחוניים מדי באזורים מרכזיים: “אבחון מבוסס נתונים”, “קושי שחוזר על עצמו”, “תחום שכדאי לחזק בבית”, “המלצת המערכת”. גם כשיש hedge, הכותרת והמסגור חזקים מדי להורה.
- ב־dashboard קיימים fallback/errors באנגלית שנראים להורה במצבי כשל: `Failed to load students`, `Student created.`, `Student updated.`, `Network error while loading students`.

## מסקנת השקה: NOT PASS

לא מוכן להשקה לדוחות הורים בעברית.

הסיבה אינה מחסור כולל במנגנוני guardrails, אלא שילוב של:

- משפטים משמעותיים מדי על מעט מידע.
- אזור AI/תובנה שנכנס ל־PDF ואינו מובטח להיות זהה ל־UI.
- ניסוחים אבחוניים מדי באזור המלצות/אבחון.
- חוסר ודאות parity בין דוח קצר לדוח מקיף באותו payload.

## חוסמי השקה

1. **BLOCKER — Parent AI על מעט נתונים**  
   `utils/parent-report-ai/parent-report-ai-explainer.js:84-95` יוצר “כיוון ראשוני” ו“תחום שכדאי לחזק בבית” גם ב־`thin`/`low`. זה מופיע דרך `components/ParentReportInsight.jsx` במסך וגם בהדפסה.

2. **BLOCKER — PDF לא מובטח זהה ל־UI**  
   `pages/learning/parent-report-detailed.js:445-455` מציג תחילה fallback דטרמיניסטי ואז מחליף ל־AI אם enrich מצליח. `window.print()` ב־`pages/learning/parent-report-detailed.js:480-488` מדפיס את ה־DOM הנוכחי, לכן התוצר תלוי timing.

3. **BLOCKER — דוח קצר מול דוח מקיף לא אותו טקסט**  
   הדוח הקצר מציג `summary.diagnosticOverviewHe`, `parentFacing`, `patternDiagnostics` ו־AI על snapshot V2; הדוח המקיף בונה payload חדש דרך `buildDetailedParentReportFromBaseReport` ומנסח מחדש דרך `detailed-report-parent-letter-he.js`. אין מקור טקסט אחד לכל המשפטים.

4. **BLOCKER — מסגור אבחוני להורה**  
   `pages/learning/parent-report.js:3066-3105` מציג “אבחון מבוסס נתונים”, label, evidence, confidence ו“המלצה”. גם אם הנתונים מוגנים, המסגור נשמע אבחוני ולא רק לימודי.

5. **BLOCKER — פעילות ספר/אישית/תרגול עצמי לא מקבלת מיפוי ניסוח נפרד להורה**  
   ב־payload יש `includeParentActivities: true`, evidence source counts ו־activity attachment, אבל בשכבות ה־UI ההוריות שנבדקו אין משפט גלוי שמבדיל להורה בין פעילות ספר בלבד, פעילות אישית בלבד ותרגול עצמי בלבד. ההורה רואה “שאלות/דיוק/זמן” או המלצות כלליות בלי הקשר מקור פעילות מספיק.

6. **BLOCKER — preset/date parity בדוח מפורט מול קצר**  
   הדוח הקצר תומך ב־period presets רחבים יותר, בעוד שבדוח המפורט `day`/ערכים לא מוכרים/טווח custom חסר נופלים ל־`week` לפני הדפסה. הורה שעובר מקצר למפורט/PDF עלול לקבל טווח תאריכים וספירות שאינם תואמים את הדוח שממנו יצא.

## תרחישים שנבדקו

1. הורה עם אפס נתונים.
2. מקצוע בלי שאלות בכלל.
3. מקצוע עם 1-3 שאלות.
4. מקצוע עם 4-8 שאלות.
5. מקצוע עם 9-12 שאלות.
6. מקצוע עם 13-24 שאלות.
7. מקצוע עם הרבה שאלות ודיוק נמוך.
8. מקצוע עם הרבה שאלות ודיוק גבוה.
9. פעילות אישית בלבד.
10. פעילות ספר בלבד.
11. תרגול עצמי בלבד.
12. כמה מקצועות, אחד חזק ואחד חלש.
13. דוח קצר מול דוח מפורט.
14. UI מול PDF.

פירוט מלא לכל תרחיש נמצא ב־`A-parent-report-scenario-results.md`.

## מיפוי לפי מסך/דוח

### Parent Dashboard

- `דשבורד הורים` — `pages/parent/dashboard.js:701`; static; מוצג ב־UI בלבד; תקין.
- `דוח הורים` — `pages/parent/dashboard.js:732,751`; static route CTA אל `/learning/parent-report?studentId=...&source=parent`; תקין.
- `עדיין לא נוספו ילדים` — `pages/parent/dashboard.js:725-727`; static empty state; תקין.
- הודעות כשל באנגלית — `pages/parent/dashboard.js:105,121,181,187,219`; static/fallback; לא תקין להורה בעברית; severity HIGH.

### Parent Report Short

- `אין עדיין מספיק פעילות בתקופה שנבחרה. אחרי קצת תרגול יופיע כאן סיכום.` — `pages/learning/parent-report.js:1348-1361`; תנאי `totalQuestions===0 && totalTimeMinutes===0`; תקין.
- `מה הכי בולט עכשיו (לפי התרגול שנאסף בתקופה שנבחרה)` — `pages/learning/parent-report.js:1894-1897`; static section; תקין.
- `דורש תשומת לב כעת:` — `pages/learning/parent-report.js:1902-1906`; generated `mainFocusAreaLineHe`; תקין רק כש יש בסיס מספיק, אחרת BLOCKER אם מקור הטקסט הגיע מ־AI/diagnostic thin.
- `אין עדיין תחום שזוהה כדורש תשומת לב מיידית בתקופה שנבחרה.` — `pages/learning/parent-report.js:1907-1913`; fallback; תקין.
- `תוצאות טובות יחסית — כדאי לשמר:` — `pages/learning/parent-report.js:1915-1919`; generated; תקין אם `strongestAreaLineHe` נבנה מ־valid evidence.
- `איפה נראו תוצאות טובות לפי התרגול שנאסף בתקופה שנבחרה` — `pages/learning/parent-report.js:1938-1947`; raw metric strengths; תקין כי threshold הוא 10 שאלות ו־82%/72%.
- `💡 המלצות` — `pages/learning/parent-report.js:2924-2933`; static; תקין.
- `אבחון מבוסס נתונים` — `pages/learning/parent-report.js:3066-3070`; static label; לא תקין לשפה הורית; HIGH/BLOCKER בהתאם לכמות נתונים.
- `אמון: ...` ו־`המלצה: ...` — `pages/learning/parent-report.js:3095-3104`; generated diagnostic card; ניסוח חזק מדי סביב confidence/recommendation; HIGH.
- `מעט שאלות בתקופה שנבחרה` + טקסט הסבר — `pages/learning/parent-report.js:3458-3466`; תנאי thin evidence charts; תקין.

### Parent Report Detailed

- `דוח מקיף לתקופה` — `pages/learning/parent-report-detailed.js:1538-1546`; static; תקין.
- `תקציר להדפסה` / `דוח מלא` — `pages/learning/parent-report-detailed.js:493-520,1542-1544`; display mode; תקין.
- `day`/`schoolYear`/custom חסר בדוח המפורט — `pages/learning/parent-report-detailed.js:330-336`; route state generated; לא תקין אם המעבר מהדוח הקצר משנה את חלון הזמן ל־`week`; severity BLOCKER כאשר הספירות ב־PDF משתנות.
- `מה עשינו בתקופה הזאת` — `pages/learning/parent-report-detailed.js:1558-1621`; UI/PDF; תקין.
- `מקצועות שלא תורגלו בתקופה` — `pages/learning/parent-report-detailed.js:1603-1612`; generated from `lowExposureSubjectsHe`; תקין.
- `מצב הנתונים בדוח` — `components/parent/ParentReportDataHealthNote.jsx:28-49`; generated; תקין.
- `מה חשוב לדעת` — `pages/learning/parent-report-detailed.js:1630-1636`; generated; תקין רק אם `parentFacing`/crossSubject bullets לא מכילים מסקנה דקה.
- `מה מומלץ לעשות בבית` — `pages/learning/parent-report-detailed.js:1657-1663`; generated; HIGH אם homeRecommendations מגיעים בלי evidence context.
- `מקוצר: מילה לכל מקצוע` — `pages/learning/parent-report-detailed.js:1666-1701`; static; LOW ניסוח לא טבעי.
- `אין מקצועות עם מספיק נתונים להצגה בתקופה שנבחרה.` — `pages/learning/parent-report-detailed.js:1697-1699,1847-1849`; תנאי no visible subjects; תקין.
- `נושאים שדורשים ליווי בתקופה שנבחרה` — `pages/learning/parent-report-detailed.js:1786-1843`; generated topic recommendations; HIGH כי “דורשים” חזק מדי.
- `פירוט נוסף למי שרוצה להעמיק` — `pages/learning/parent-report-detailed.js:1854-1882`; static; תקין.
- `הבהרה חשובה` disclaimer — `components/ParentReportImportantDisclaimer.js:12-26`; static; תקין ומופיע גם PDF.

### PDF / Export

- דוח קצר: `#parent-report-pdf` מודפס דרך CSS print ב־`pages/learning/parent-report.js:1389-1477`; אין render PDF נפרד.
- דוח מקיף: `window.print()` ב־`pages/learning/parent-report-detailed.js:480-488`; אין payload PDF נפרד.
- Copilot עצמו מסומן `no-pdf` ואינו נכנס להדפסה: `pages/learning/parent-report-detailed.js:1522-1524`, `pages/learning/parent-report.js:2052-2058`.
- `ParentReportInsight` כן נכנס להדפסה בשני הדוחות: `pages/learning/parent-report.js:2050`, `pages/learning/parent-report-detailed.js:1556`; זה חוסם parity אם AI מתעדכן אסינכרונית.

## בעיות ניסוח להורה

- “אבחון מבוסס נתונים” נשמע כמו אבחון ולא דוח לימודי.
- “קושי שחוזר על עצמו” ו“קושי חוזר” עלולים להיתפס כקביעה על הילד ולא על תרגול.
- “דורשים ליווי” נשמע מחייב מדי, בעיקר כשנתוני הנושא דקים.
- “המלצת המערכת” ב־AI נשמע authority חזק מדי להורה.
- “מקוצר: מילה לכל מקצוע” לא טבעי ולא ברור.
- “תחום שכדאי לחזק בבית” ב־AI יכול להיות מוצג ללא מספיק הקשר לנתונים.

## בעיות המלצה בלי ראיות

- `buildHomeRecommendationsHe` מוסיף `לחזור יחד על טעויות אחרונות...` לכל `totalAnswers > 0`, גם אם אין `recentMistakes` או evidence detail גלוי.
- `getDeterministicParentReportExplanation` מוסיף `המלצת המערכת להמשך התרגול: ...` גם ב־thin/low.
- `buildDeterministicFallbackNarrative` מוסיף home tips כלליים גם עם 0 נתונים; זה עדין יחסית, אבל עדיין נכנס תחת “סיכום חכם”.
- פעילות ספר/אישית/תרגול עצמי אינה מוסברת להורה כ־evidence source; אם מקור הנתונים מוגבל לסוג פעילות אחד, ההורה לא מקבל הקשר.

## בעיות UI מול PDF

- אין PDF server-side קפוא; ה־PDF הוא מצב הדפסה של DOM.
- AI/LLM יכול להחליף fallback אחרי first paint; הדפסה לפני/אחרי ההחלפה עשויה להפיק טקסט שונה.
- בדוח המקיף `details > summary` מוסתר ב־print וה־details נפתחים ב־CSS, כך שהורה ב־PDF יכול לראות פירוט שלא היה פתוח ב־UI.
- Copilot לא מודפס, אבל ה־AI insight כן מודפס; לכן “AI משפיע” על PDF אף שה־Copilot עצמו לא.
- כיסוי truth-gates חי חזק יותר לדוח הקצר; דוח מפורט full/summary נשען יותר על scripts ייעודיים, ולכן parity מפורט עדיין לא מכוסה באותה רמת ודאות.

## החלטות בעלים נדרשות

- האם מותר להשתמש במילה “אבחון” בדוח הורים, או להחליף ל“תובנות מהתרגול”.
- האם `ParentReportInsight` צריך להיכנס ל־PDF, ואם כן האם לנעול deterministic בלבד לפני השקה.
- האם פעילות ספר/אישית/תרגול עצמי חייבת לקבל badge/הסבר גלוי בדוח.
- מה threshold מינימלי להצגת “המלצה” לעומת “כיוון לתרגול”.
- האם דוח קצר ומקיף חייבים להשתמש באותו copy authority לכל שורה מרכזית.
- האם `day`/`schoolYear` חייבים להיות נתמכים בדוח המפורט, או להיחסם עם הודעה גלויה במקום fallback שקט ל־`week`.

## מה חייב תיקון לפני השקה

1. לנטרל או לרכך `ParentReportInsight` עבור `thin/low`, במיוחד “כיוון ראשוני”, “תחום לחיזוק” ו“המלצת המערכת”.
2. להבטיח parity: snapshot טקסט קפוא ל־UI ול־PDF, או להוציא AI insight מה־PDF.
3. להחליף “אבחון מבוסס נתונים” ב“תובנות מהתרגול”.
4. להחליף “המלצה” ב“כיוון לתרגול” כאשר evidence אינו `sufficient`.
5. להוסיף הסבר מקור פעילות: ספר / פעילות אישית / תרגול עצמי, או לחסום המלצות כשמקור evidence חד־ערוצי ולא מוסבר.
6. לתרגם fallbacks באנגלית בדשבורד הורים.
7. לאחד source-of-truth לטקסטים המרכזיים בין דוח קצר למקיף.
8. לתקן period normalization בדוח המפורט כך שלא יהיה fallback שקט ל־`week` כאשר הדוח הקצר מציג תקופה אחרת.
8. להוסיף gate שמונע הצגת focus/recommendation עבור 1-3 שאלות.
9. לבדוק שכל שורת “מקצוע לא תורגל” אינה מייצרת בהמשך המלצה או focus.
10. להוסיף בדיקת parity אוטומטית UI/PDF על אותו payload.

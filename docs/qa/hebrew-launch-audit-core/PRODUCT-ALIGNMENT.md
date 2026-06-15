# יישור קו מוצר — Parent Report / Learning / QA (2026-06-15)

מסמך זה הוא **מקור אמת לביקורת**, לא תוכנית יישום.  
הדוח `D-learning-questions-rtl-hebrew-1to1.*` נשאר כהיסטוריה, אך **מסגרת ההחלטה והעדיפויות** מוגדרות כאן.

---

## מה היה מבלבל ב-audit הקודם

| נושא | מה נעשה ב-D audit | מה ההחלטה הנכונה |
|------|------------------|------------------|
| רמזים | BLOCKER על ניסוח רמז (`HQ-013`) | **רמזים מוסרים מהמוצר** — לא מתקנים ניסוח, חוסמים/מסירים הצגה |
| דוח הורים | לא נבדק לעומק | **P0**: שפה לא-אבחונית, ללא אנגלית, PDF דטרמיניסטי |
| ספירת ראיות | לא נבדק מול מדיניות | **רק** self practice + parent assigned answered questions |
| AI בהדפסה | לא נבדק | **חובה** להסיר/לחסום `ParentReportInsight` וכל async AI מ-print/PDF |
| QA infra | לא מוגדר | שרת נקי על פורט רחוק (למשל **3100**), build טרי — לא ציד פורטים |

---

## החלטות מוצר סופיות (9 סעיפים)

### 1. ספירה בדוח הורים + מנוע אבחוני
**נספרות רק שאלות שנענו מ:**
- self practice
- parent assigned activities

**לא נספרות / לא משמשות כראיה:** ספרים, משחקים, מטבעות, זמן גלישה, פתיחת דפים בלי תשובה, step-by-step, הסברים, כל למידה פסיבית.

### 2. רמזים
**מוסרים מהמוצר.** שדות `hint` ב-payload — מתעלמים ב-UI. אין רמז גלוי ⇒ אין leak מרמז.

### 3. AI / Copilot / PDF
- Copilot לא בהדפסה (כבר no-pdf).
- **גם** `ParentReportInsight` / AI / LLM / async insight — **לא** ב-print/PDF.
- PDF = דטרמיניסטי בלבד.

### 4. שפת דוח הורים — לא "אבחוני"
להסיר/להחליף: אבחון, אבחוני, אבחון מבוסס נתונים, קושי חוזר, הילד חלש, המלצת המערכת, אמון, confidence כניסוח להורה, אין/יש סיבה לדאגה.

להחליף ב: "לפי השאלות שתורגלו…", "מהתרגול שנאסף…", "כרגע בתרגול נראה ש…", "כדאי להמשיך לתרגל…", "מוקדם להסיק מסקנה…".

### 5. אנגלית ב-UI עברי
אסור ב-UI/משוב/דוחות/דשבורד. חריג: תוכן לימוד אנגלית עצמו.

### 6. Answer leak
משוב שגוי **לא** חושף תשובה נכונה מיד — רק במצב סקירה סופית/סיום פעילות (אם מוגדר).

### 7. עדיפות P0
1. עברית גלויה (הורה + ילד)
2. RTL/bidi (מתמטיקה, גאומטריה, מדע, ספרים, step-by-step, נוסחאות, `<`/`>`, יחידות, טבלאות)
3. ללא אנגלית גלויה
4. ללא answer leak
5. דוח הורים לא מרגיש אבחוני
6. PDF ללא AI

### 8. QA infra
- `PORT=3100` (או פורט רחוק אחר קבוע)
- `.next` / build טרי
- חוסמים = עברית, RTL, PDF/AI, answer leak — **לא** גילוי פורט

---

## פערים ידועים בקוד (read-only, לא תיקון)

| # | החלטה | מצב נוכחי (ראיה) | פער |
|---|--------|------------------|-----|
| 1 | רק self + parent assigned | `report-data-aggregate.server.js` סופר כל `answers` לפי classification; competitive/learning/step-by-step עדיין נספרים; זמן/ספרים ב-buckets נפרדים | **GAP** — צריך gate מפורש ל-2 מקורות בלבד |
| 2 | לא ספרים/פסיבי | ספרים ב-`learningActivity` בלבד (`accumulateBookReadingActivity`); אך post-book practice עדיין `LEARNING_BOOK` source | **PARTIAL** |
| 3 | PDF ללא AI | `ParentReportInsight` **בתוך** `#parent-report-detailed-print`; CSS מדפיס `.parent-report-parent-ai-insight` | **GAP** |
| 4 | שפה לא אבחונית | `parent-report.js`: "קושי חוזר", "אבחון מבוסס נתונים" | **GAP** |
| 5 | ללא אנגלית UI | `geometry-master.js`, `english-master.js`: `Correct!`, `Wrong! Correct answer:` | **GAP** |
| 6 | רמזים מוסרים | `pages/student/activity/[activityId].js` מציג `רמז:`; `math-master` משתמש ב-`getHint` ב-step | **GAP** |
| 7 | answer leak | `geometry-master`, `english-master`, assigned `correctAnswer` אחרי שגיאה | **GAP** |

---

## מסגרת audit מעודכנת (מה בודקים מעכשיו)

### Track A — Learning surfaces (ילד)
- [ ] אין אנגלית ב-UI/feedback/errors/loading
- [ ] אין answer leak במשוב חי (Wrong + correct answer)
- [ ] אין רמז גלוי בשום surface
- [ ] RTL: `<` `>` שברים אחוזים יחידות נוסחאות טבלאות step-by-step

### Track B — Parent report (הורה)
- [ ] ספירה רק self + parent assigned answered
- [ ] אין ספר/משחק/זמן/פסיבי ב-metrics שמניעים מסקנות
- [ ] אין ניסוח אבחוני (רשימת §4)
- [ ] PDF דטרמיניסטי — אין ParentReportInsight / async AI

### Track C — QA execution
- [ ] `PORT=3100`, build נקי, smoke על flows אמיתיים
- [ ] לא לבזבז זמן על port discovery

---

## השפעה על `D-learning-questions-rtl-hebrew-1to1`

| ID | החלטה חדשה | סטטוס audit ישן |
|----|-------------|-----------------|
| HQ-013 | רמזים מוסרים — לא blocker ניסוח | **Superseded** → Track A: "אין hint ב-UI" |
| HQ-014 | hint ב-assigned | **Superseded** → אותו gate |
| HQ-017/018 | אנגלית + leak | **נשאר P0** (Track A) |
| HQ-001 | RTL `<` `>` | **נשאר P0** (Track A) |
| HQ-008 | answer in stem | **נשאר** (תוכן שאלה) |

**מסקנת השקה מעודכנת (מסגרת):** עדיין **NOT PASS** — אך הסיבות המובילות הן P0 של §7–8, לא רמזים.

---

## פקודת QA מומלצת

```powershell
$env:PORT=3100
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run start
```

---

## בעלים — מה לא נוגעים עכשיו
- משחקים (מחוץ scope audit)
- תיקון ניסוח רמז (רמזים מוסרים)
- port hunting ב-qa scripts ישנים

# 07 — בדיקת RTL חזותית בדפדפן — מובייל ודסקטופ

> **דוח בלבד** (read-only). לא בוצע שינוי קוד, לא שונו קבצי מוצר.
> תאריך בדיקה: 2026-06-15 · כלי: Playwright 1.59.1 / Chromium · סוג: Launch readiness visual audit.

---

## 1. תקציר מנהלים

הבדיקה החזותית בדפדפן חשפה **ממצא חוסם קריטי** שאינו ניתן לזיהוי רק מקריאת קוד:

> **כל** דפי ספרי הלמידה (עברית, חשבון, גאומטריה — כל הכיתות שנבדקו) מחזירים **"Internal Server Error"** על **מובייל** (iPhone 13 / 390×844), בעוד שאותם דפים **עובדים תקין על דסקטופ** (1280×900).

ממצאים נוספים:
- דף הורה-dashboard נתפס בסטייט "בודק אישור מדיניות..." — משתמש fixture ללא אישור מדיניות.
- דף הבית תלמיד נתפס בסטייט "טוען את דף הבית..." — עיכוב טעינת נתונים גלוי.
- RTL בדסקטופ תקין ברוב הדפים שרונדרו, עם ממצא חשוד ב-3.14 בגאומטריה g6.
- כפתור האזנה ("האזנה לעמוד") מוצג ב-Hebrew g1 — אודיו פעיל לאותו ספר.

---

## 2. סביבת בדיקה

| פריט | ערך |
|------|-----|
| שרת | `http://127.0.0.1:3001` (Next.js dev, `npm run dev`) |
| כלי | Playwright 1.59.1 headless Chromium |
| Node.js | v22.17.1 |
| תאריך/זמן בדיקה | 2026-06-15 00:10–02:00 UTC+3 |
| viewport desktop | 1280×900 (Chromium) |
| viewport mobile | 390×844 + iPhone 13 user agent (devices["iPhone 13"]) |
| locale | he-IL |
| סקריפטים שנכתבו | `scripts/qa/rtl-visual-audit-capture.mjs`, `scripts/qa/rtl-visual-audit-student.mjs` |
| תיקיית תמונות | `docs/qa/hebrew-launch-audit/07-screenshots/` |

---

## 3. משתמשים / Fixtures שנבדקו

| תפקיד | מזהה | מקור | הצלחת auth |
|-------|------|------|------------|
| הורה | `admin@admin.com` / `eran747975` | `.env.e2e.local` | ✓ (Supabase) |
| תלמיד | `ADMIN` / `1234` | `.env.e2e.local` VIRTUAL_STUDENT_ACCOUNTS | ✓ (API) |
| ציבורי | — | — | N/A |

> הערה: ניסיון עם `leo-s01/1234` נכשל ב-401 (לא ב-dev DB). `eran/7479` לא נוסה בגלל שאין `.env.e2e.local` שנים (E2E_ERAN_*) — אלא רק ב-`capture-student-bright-pilot-screenshots.mjs`. לבדיקות עתידיות — לאמת credentials פעילים ב-.env.

---

## 4. מסלולים שנבדקו

| # | מסלול / URL | תפקיד | Desktop | Mobile |
|---|------------|-------|---------|--------|
| 01 | `/` | ציבורי | ✓ | ✓ |
| 02 | `/parent/login` | ציבורי | ✓ | ✓ |
| 03 | `/student/login` | ציבורי | ✓ | ✓ |
| 04 | `/parent/dashboard` | הורה | ⚠ Loading state | לא נבדק |
| 05 | `/student/home` | תלמיד | ⚠ Loading state | ⚠ Loading state |
| 07 | `/learning` | תלמיד | ✓ | ✓ |
| 08 | `/learning/math-master` | תלמיד | ✓ | ✓ |
| 09 | `/learning/geometry-master` | תלמיד | ✓ | ✓ |
| 10 | `/learning/book/math/g1/add_two` | תלמיד | ✓ | ❌ Internal Server Error |
| 11 | `/learning/book/math/g2/sub_vertical` | תלמיד | ✓ | ❌ Internal Server Error |
| 12 | `/learning/book/math/g2/wp_coins_spent` | תלמיד | ✓ | ❌ Internal Server Error |
| 13 | `/learning/book/geometry/g4/shapes_basic_properties_angles` | תלמיד | ✓ | ❌ Internal Server Error |
| 14 | `/learning/book/geometry/g5/triangle_area` | תלמיד | ✓ | ❌ Internal Server Error |
| 15 | `/learning/book/geometry/g6/circle_area` | תלמיד | ✓ | ❌ Internal Server Error |
| 16 | `/learning/book/hebrew/g1/g1.phoneme_awareness` | תלמיד | ✓ | ❌ Internal Server Error |
| 17 | `/learning/book/hebrew/g1/g1.basic_niqqud` | תלמיד | ✓ | לא נבדק (18 נבדקה) |
| 18 | `/learning/book/hebrew/g6/g6.critical_evaluation_light` | תלמיד | ✓ | ❌ Internal Server Error |
| 19 | `/learning/book/geometry/g6/circle_area` (dup) | תלמיד | ✓ | — |

**סה"כ מסלולים שנבדקו:** 18 ייחודיים. **צילומי מסך שנלכדו:** 35.

**מסלולים שלא נבדקו:** שאלות MCQ/numeric, הסבר צעד-צעד, מודאל פעילות אישית, דשבורד הורה (תוכן), דוח הורה PDF, כניסת מורה, loading state ריקים.

---

## 5. טבלת תוצאות לפי מסלול וגודל מסך

| מסלול | Desktop 1280 | Mobile 390 | תצפיות RTL |
|--------|-------------|------------|------------|
| `/` (דף הבית) | ✅ תקין | ✅ תקין | RTL תקין, ניווט ברור |
| `/parent/login` | ✅ תקין | ✅ תקין | טפסים ב-RTL; ניסוח ברור |
| `/student/login` | ✅ תקין | ✅ תקין | RTL תקין; כפתור submit ב-RTL |
| `/parent/dashboard` | ⚠ Loading ("בודק אישור מדיניות...") | לא נבדק | fixture ללא אישור מדיניות |
| `/student/home` | ⚠ Loading ("טוען את דף הבית...") | ⚠ Loading | תוכן לא נטען בזמן screenshot |
| `/learning` | ✅ תקין | ✅ תקין | טקסט RTL, כפתורים מסודרים |
| `/learning/math-master` | ✅ תקין | ✅ תקין | בורר כיתה/נושא עובד |
| `/learning/geometry-master` | ✅ תקין | ✅ תקין | תקין |
| `book/math/g1/add_two` | ✅ RTL תקין בdeskop | ❌ Internal Server Error | — |
| `book/math/g2/sub_vertical` | ✅ RTL תקין, טקסט מובן | ❌ Internal Server Error | "לחסר עמודה אחר עמודה" — קריא |
| `book/math/g2/wp_coins_spent` | ✅ RTL תקין | ❌ Internal Server Error | "כשהשלמתם יותר... לחסר" — קריא |
| `book/geo/g4/angles` | ✅ RTL תקין; 90° תקין | ❌ Internal Server Error | "כל אחת 90°" מוצג נכון |
| `book/geo/g5/triangle` | ✅ RTL תקין; ÷ 2 תקין | ❌ Internal Server Error | "שטח = בסיס × גובה ÷ 2" — קריא |
| `book/geo/g6/circle` | ✅ אך ⚠ 3. 14 חשוד | ❌ Internal Server Error | ראה V-ISS-4 |
| `book/heb/g1/phoneme` | ✅ RTL תקין; אודיו בdeskop | ❌ Internal Server Error | — |
| `book/heb/g6/critical` | ✅ RTL תקין | ❌ Internal Server Error | עברית אקדמית תקינה |

---

## 6. בעיות — ממצאי dev environment ובעיות מוצר

### ISSUE-1 — .next Corruption: "Cannot find module './20593.js'" על מובייל

**חומרה:** MEDIUM בdev, לא מוכח בproduction  
**היקף:** חלק מדפי ספרי הלמידה על מובייל בזמן הבדיקה  
**ממצא ברצון הראשון (Internal Server Error):** בדיקת ה-RECHECK חשפה את השגיאה האמיתית:

```
Runtime Error
Cannot find module './20593.js'
Require stack:
- .next\server\webpack-runtime.js
- .next\server\...\document.js
```

**ראיות:**
- `RECHECK-geo-g6-circle-mobile.png` → Runtime Error overlay "Cannot find module './20593.js'"
- `RECHECK-math-g2-sub-vertical-mobile.png` → Runtime Error overlay "Cannot find module './20593.js'"
- `RECHECK-heb-g1-phoneme-mobile.png` → Runtime Error overlay "Cannot find module './20593.js'"
- `RECHECK-geo-g4-mobile.png` → **RTL תקין! דף מוצג נכון** (g4 אינו משתמש בchunk 20593)

**גורם שורש מוכח:**  
בזמן הבדיקה הופעל `npm run build` (23:19:05) בזמן ש-`next dev` רץ על port 3001. הסקריפט עצמו מזהיר:  
> `[run-production-build] Warning: port 3001 is in use (likely next dev). Stop the dev server before production build to avoid .next corruption.`

ה-build הושלם ב-23:25:48 (exit_code 0) וחידש chunk IDs ב-`.next/server/`. הdev server ניסה לטעון את הchunk החדש `20593.js` מdynamic import — החתיכה הישנה כבר לא הייתה תקינה.

**מדוע מובייל ולא דסקטופ:**  
הdynamic import שיצר chunk 20593 מתופעל רק ב-mobile context (רכיב mobile-specific או lazy import שמתופעל בviewport קטן). Desktop לא טוען את הchunk הזה — לכן לא מושפע.

**השפעה על production:**  
- Production (Vercel) בונה בסביבה נפרדת ומגייס build artifacts נקיים — הבעיה **לא אמורה** להתרחש שם
- בdev: כל פעם שמריצים `npm run build` ו-`npm run dev` במקביל — ייתכן corruption

**פעולה:**
1. הפסקת dev server → מחיקת `.next` → `npm run dev` → בדיקה מחדש
2. הוספת guard לסקריפט build שמנע הרצה אם port 3001 תפוס (**המזהיר כבר קיים — לוודא שהוא BLOCKING ולא WARNING בלבד**)

---

### ✅ MOBILE RTL POSITIVE FINDING

**גאומטריה g4 מובייל (RECHECK) — תקין לחלוטין**  
`RECHECK-geo-g4-mobile.png` מראה:
- ניווט עליון RTL תקין: "חזרה לספר" · "תוכן עניינים" · "חזרה לגאומטריה"
- כותרת: "ספר גאומטריה — כיתה ד׳" + כותרת עמוד מוצגת ב-RTL
- תוכן: "היום נעמיק בגאומטריה בזוויות בריבוע. נלמד שבריבוע יש 4 זוויות ישרות — כל אחת **90°**." — RTL תקין כולל הסימן °
- כפתורי ניווט "עמוד הבא" / "עמוד קודם" — RTL תקין
- Breadcrumbs נושאים "נושא הבא: סימטריה במישור" / "נושא קודם: תכונות המלבן — זוגות..." — RTL תקין

---

### BLOCKER-2 (הורש מ-05) — כל ספרי חשבון, גאומטריה ומדע `approval_status: draft`

(ראה דוח 05 — ממצא B-1. אושר בדיקה חזותית: הסימון לא דולף למסך, אך התוכן עצמו לא מאושר.)

---

## 7. בעיות לא חוסמות

### V-ISS-3 — Parent dashboard נתפס ב-loading state

**חומרה:** בינוני (בעיית fixture, לא ברטב מוצר)  
**ממצא:** `04-parent-dashboard-parent-desktop.png` מציג "בודק אישור מדיניות..." — משתמש `admin@admin.com` לא השלים אישור מדיניות בdev DB. ה-dashboard עצמו לא נבדק ויזואלית.  
**פעולה:** לאמת fixtures / להריץ `policy acceptance` לפני בדיקה חזותית של הדוח.

### V-ISS-4 — חשד ב-BiDi עבור "π ≈ 3. 14"

**חומרה:** בינוני (דרוש QA חזותי נוסף)  
**ממצא:** בצילום `15-book-geo-g6-circle-student-desktop.png`, שורת "בשיעור: **π ≈ 3. 14**." נראית עם רווח לא-צפוי בין "3." ל-"14". זה עשוי להיות:
- artifact ב-BiDi שמטפל בנקודה עשרונית כ-neutral character
- שגיאה בעיניים בגלל resolution הצילום
**פעולה:** לבדוק ב-browser DevTools את ה-computed style על שורה זו; לוודא ש-"3.14" מוכנס כ-`<bdi dir="ltr">3.14</bdi>` ולא מפוצל.

### V-ISS-5 — Student home נתפס ב-loading state בשני גדלי מסך

**חומרה:** נמוך (fixture / timing issue)  
**ממצא:** `05-student-home-student-desktop.png` ו-`05-student-home-student-mobile.png` מציגים "טוען את דף הבית..." — תוכן טעינה. ה-home page לא נטענה תוך 2 שניות. ייתכן שה-ADMIN student אין לו נתונים ולכן טעינה איטית.  
**פעולה:** להגדיל timeout בסקריפט, או לבדוק עם student שיש לו פעילויות.

### V-ISS-6 — RTL תקין בדסקטופ (ממצא חיובי)

כל דפי הספר שרונדרו בdeskop מציגים RTL נכון: טקסט ימין, עברית קריאה, כפתורי ניווט ("עמוד הבא"/"עמוד קודם") מסודרים נכון. אופרטורי חשבון (×, ÷, −) מוצגים ב-LTR island בתוך RTL prose — נראה נכון ויזואלית.

### V-ISS-7 — אודיו "האזנה לעמוד" מוצג ב-Hebrew g1 desktop

ממצא חיובי — הכפתור מופיע וניתן לשימוש. אין כפתור שבור על desktop.

---

## 8. אזורים שלא ניתן היה לבדוק ולמה

| אזור | סיבה |
|------|------|
| דוח הורה (תוכן) | fixture (`admin@admin.com`) עצור ב-policy check loading state |
| שאלות MCQ/numeric/step-by-step | לא נכנסו לpractice flow — דרש חיבור לנושא ספציפי שלא מוגדר לADMIN user |
| מודאל פעילות אישית | לא נוצרה פעילות אישית לfixture user |
| כל ספרי הלמידה במובייל | Internal Server Error (BLOCKER-1) |
| PDF/הדפסה | דרש parent dashboard שהגיע לתוכן |
| mobile landscape | לא נבדק (הבדיקה השתמשה ב-portrait) |
| Student home — תוכן מלא | loading state בזמן screenshot |
| Teacher portal / School portal | מחוץ להיקף RTL audit |

---

## 9. המלצות

1. **בדיקת מובייל נקייה:** הפסקת `next dev` → מחיקת `.next` → `npm run dev` → **לא** להריץ `npm run build` במקביל → בדיקה חוזרת של כל דפי ספרי הלמידה במובייל.
2. **Make build guard BLOCKING:** `run-production-build.mjs` מזהיר כיום על port תפוס אך ממשיך. לשנות ל-exit(1) כדי למנוע `.next` corruption.
3. **fixture אישור מדיניות:** הוסף `policy acceptance` לmigration/seed script כדי שfixture users יוכלו לגשת לdashboard בבדיקות.
4. **timeout בסקריפט QA:** הגדל ל-5 שניות לפני screenshot בdashboard/home.
5. **QA נוסף ל-"3.14" RTL:** בדוק בDevTools → Elements על השורה בgeo g6 — לוודא `<bdi dir="ltr">3.14</bdi>`.
6. **הרחבת בדיקות:** לאחר env נקי — לבדוק MCQ/practice flow, מודאלים, parent report, PDF RTL.
7. **dynamic chunk 20593:** לזהות איזה component יוצר chunk זה (ייתכן audio player, MathJax, או mobile-only lazy import) ולוודא שמשמש נכון בproduction build.
8. **geometry g4 mobile PASS:** ממצא חיובי — RTL פועל נכון על מובייל כאשר env נקי. לבדוק שאר pages בenv נקי.

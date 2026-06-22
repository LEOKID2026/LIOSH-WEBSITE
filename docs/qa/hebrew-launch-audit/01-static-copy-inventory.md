# Hebrew Launch Audit — Static Copy Inventory

## תקציר מנהלים
- בוצעה סריקה רחבה של מלל עברי קבוע בכלל שכבות האתר (UI, טקסטי מערכת, תוויות, placeholders, aria, empty/loading/error states).
- נמצאו פערים משמעותיים של ערבוב עברית/אנגלית במסכים פרודקשניים (כולל `aria-label` ועותק גלוי), ושגיאות ניסוח/כתיב במספר נקודות.
- נמצאו גם פערי עקביות טרמינולוגיים בין "ילד/ה", "תלמיד/ה", "שחקן/ית" בין אזורים שונים.
- זוהו חוסמי השקה לשחרור "עברית מלאה" (ראו סעיף חוסמים).
- לא בוצעו תיקונים בקוד. זהו דוח בלבד.

## מספר קבצים שנסרקו
- נסרקו: `1615` קבצים בתחום שהוגדר (`pages/`, `components/`, `lib/`, `utils/`, `data/`, `public/`, `styles/`).
- קבצים עם עברית: `753`.
- לא קיימת תיקיית `app/` בריפו (לא נסרק).
- `scripts/`: נסרקה אינדיקציה בלבד (1095 קבצים, 623 עם עברית), וסוננו ממנה בעיקר קבצי QA/ייצור תוכן לא־פרודקשן.

## מספר מופעי עברית שנמצאו
- שורות עם עברית בכלל התחום: `111,057`.
- התאמות תווי עברית בכלל התחום: `1,960,015`.
- הערה: ספירה זו כוללת גם מאגרי תוכן לימוד (`data/`, `utils/`) ולא רק shell UI.

## חלוקה לפי אזור באתר
- דף בית/שיווק: `pages/index.js`, `pages/about.js`, `pages/contact.js` (legacy `mleo-flyer` archived — see `archive/deprecated-mleo-games/`).
- כניסת הורה: `pages/parent/login.js`.
- פורטל הורה: `pages/parent/dashboard.js`, `pages/learning/parent-report.js`, `pages/learning/parent-report-detailed.js`, `components/parent/*`.
- כניסת ילד: `pages/student/login.js`.
- אזור ילד: `pages/student/home.js`, `pages/student/activity/*`, `pages/student/games/*`, `pages/learning/*-master.js`, `components/student/*`, `components/learning/*`, `components/arcade/*`.
- פורטל מורים/בית ספר: `pages/teacher/**`, `pages/school/**`, `components/teacher-portal/*`, `components/school-portal/*`.
- מנהל מערכת: `pages/admin/**`, `components/admin/*`, `lib/admin-portal/*`.
- הודעות מערכת/שגיאות: API messages ב־`pages/api/**`, ו־UI states ב־`pages/*` + `components/*`.
- מובייל בלבד (זוהה): רכיבי HUD/inputs עם מחלקות responsive (`max-[420px]`, `sm:`) במיוחד ב־`pages/learning/*-master.js` ו־`components/learning/*`.

## ממצאים חוסמי השקה
1. **BLOCKER** — ערבוב אנגלית גלויה במסך פתיחה משחקי:
   - `archive/deprecated-mleo-games/pages/mleo-flyer.js:431-432,436` (ארכיון — לא באתר פעיל).
2. **BLOCKER** — שגיאת כתיב גלויה בדף About:
   - `pages/about.js:95` (`האתר מותאם לילד/הי כיתות א׳–ו׳`).
3. **BLOCKER** — רכיב נגישות מרכזי עם `aria-label` אנגלי בהיקף רחב:
   - `components/math-scratchpad/MathScratchpadWorkspace.jsx` (לדוגמה `aria-label="exercise"`, `carry col`, `fraction numerator`).
4. **BLOCKER** — מסך Arcade Bingo בפרודקשן עם מונחי UI באנגלית:
   - `components/arcade/bingo/ArcadeBingoScreen.js:357,379,385,400,403,407,411,422`.

## ממצאים לא חוסמים
- **HIGH**: הודעות שגיאה באנגלית בפורטל הורה:
  - `pages/parent/dashboard.js:105,121` (`Failed to load students`, `Network error while loading students`).
- **MEDIUM**: שגיאת ניסוח/דקדוק:
  - `components/arcade/snakes-ladders/SnakesLaddersScreen.js:112` (`מזריק קוביה` במקום "זורק").
  - `components/arcade/snakes-ladders/SnakesLaddersScreen.js:115` (`באותו משבצת`).
- **MEDIUM**: טרמינולוגיה לא עקבית "דשבורד":
  - `pages/parent/login.js:130,135`.
- **LOW**: וריאציות לא עקביות של טעינה (`טוען...`, `טוען דוח...`, `טוען דוח מקיף...`) במספר אזורים.

## טקסטים שדורשים החלטת בעלים
- עקביות פרסונה: האם לאחד ל־"ילד/ה" או לשמור הבחנה בין "ילד/ה" (הורה), "תלמיד/ה" (מורה), "שחקן/ית" (משחק)?
- האם מותרים מונחי מותג/משחק באנגלית במסכים חיצוניים (כמו `mleo-flyer`) תחת דרישת "עברית מלאה"?
- האם `aria-label` חייב להיות עברי בכל רכיב, או שמותר אנגלית ברכיבי כלי פנימיים/קנבס?

## טקסטים כפולים/לא עקביים
- אותו מושג בגרסאות שונות:
  - "ילד/ה" מול "תלמיד/ה" מול "שחקן/ית" (רוחבי).
  - "טוען…" מול "טוען..." מול "טוען דוח…".
  - "דשבורד" מול "דוח"/"לוח בקרה".

## טקסטים עם הקשר לא ברור
- הודעות API שמוחזרות באנגלית וחלקן מוצגות כמו־שהן ב־UI (תלוי זרימה) — לדוגמה `pages/parent/dashboard.js`.
- שדות `aria-label` באנגלית ברכיבי למידה מורכבים עלולים לפגוע בחוויית קורא מסך בעברית.
- קבצי `data/` ו־`utils/` מכילים הרבה מלל לימודי בעברית (לא רק chrome UI), ולכן נדרש גבול מוצרי ברור בין "תוכן לימודי" ל־"עותק ממשק".

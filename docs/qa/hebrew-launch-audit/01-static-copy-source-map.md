# Hebrew Launch Audit — Static Copy Source Map

מיפוי לפי אזורי מוצר (runtime-facing), עם דגימות שורות ראיה.

## דף בית
- `pages/index.js` — כותרות שיווק, CTA, טעינה (`טוען...`).
- `pages/about.js` — תוכן ערכי (נמצאה שגיאת כתיב בשורה 95).
- `pages/contact.js` — FAQ ותוכן פנייה.
- `pages/mleo-flyer.js` — מסך פתיחה עם טקסטים באנגלית (`431-436`).

## כניסת הורה
- `pages/parent/login.js` — הודעות הרשמה/כניסה, תנאים ומדיניות (`130`, `135`).
- `components/parent/ParentPolicyAcceptanceGate.jsx`
- `components/parent/FullPolicyAcceptancePanel.jsx`
- `components/parent/PolicyAcceptanceDeclinedBlock.jsx`

## פורטל הורה
- `pages/parent/dashboard.js` — טפסים, placeholder, הודעות שגיאה (כולל אנגלית ב־`105`, `121`).
- `pages/learning/parent-report.js` — דוח קצר, empty/loading, המלצות.
- `pages/learning/parent-report-detailed.js` — דוח מפורט, section titles, מצבי טעינה.
- `components/parent/*` — מודלים, פעילויות, ניווט יציאה.
- `components/parent-copilot/parent-copilot-panel.jsx` — placeholder ושיח הורה.

## כניסת ילד
- `pages/student/login.js` — כותרות, labels, placeholders, busy states.
- `components/auth/PortalLoginHeading.jsx`
- `components/student/StudentAccessGate.js`

## אזור ילד
- `pages/student/home.js` — כרטיסים, המלצות, לוח בקרה.
- `pages/student/activity/[activityId].js` — משטח פעילות, תשובות, מצבי שגיאה.
- `pages/learning/*-master.js` — ממשקי מקצוע (Math/Geometry/English/Hebrew/Science/Moledet), כולל title/aria/placeholder/feedback.
- `components/learning/*` — שדות קלט, מקלדת וירטואלית, HUD.
- `components/math-scratchpad/MathScratchpadWorkspace.jsx` — כמות גבוהה של `aria-label` באנגלית.
- `components/arcade/*` — מסכי משחקים ומודלי "איך משחקים"; ב־Bingo זוהו תוויות אנגליות.

## פורטל מורים / בית ספר
- `pages/teacher/**` — דוחות, פעילויות, טפסי יצירה, צגי מעקב.
- `pages/school/**` — כיתות, תלמידים, monitor.
- `components/teacher-portal/*` — מודלים, שגיאות, מצב ריק/טעינה.
- `components/school-portal/*` — טפסים, שיוך תלמידים, inbox/report.
- `lib/teacher-portal/*.he.js`, `lib/school-portal/*.he.js` — אוספי copy מרכזיים.

## מנהל מערכת
- `pages/admin/**` — ניהול בתי ספר/חשבונות/מורים.
- `components/admin/*` — טבלאות, הרשאות, lifecycle messages.
- `lib/admin-portal/admin-ui.he.js` — copy מערכת ניהול.

## הודעות מערכת
- `pages/api/**` — error strings מוחזרים ללקוח (חלקם אנגלית, חלקם עברית).
- `lib/parent-client/*`, `lib/auth/*` — mapper הודעות משתמש.
- `utils/parent-report-language/*` — copy לדוחות, restraint, confidence labels.

## שגיאות
- runtime UI:
  - `pages/parent/dashboard.js:105,121` (אנגלית).
  - `components/*` רבים עם `"שגיאה ..."` עברי.
- game runtime:
  - `components/arcade/*` מכיל גם אנגלית וגם עברית.

## טפסים
- `pages/parent/dashboard.js` — יצירת ילד/ה, מחיקה, PIN.
- `pages/student/login.js` — username/PIN.
- `components/school-portal/*Form.jsx` — יצירה/הזמנה/שיוך.
- `components/teacher-portal/*` — יצירת פעילות, בחירת תלמידים.

## מודלים
- `components/parent/ParentDashboardModal.jsx`
- `components/student/StudentHomeModal.jsx`
- `components/teacher-portal/TeacherActivityStudentAnswersModal.jsx`
- `components/teacher-portal/TeacherClassReportModal.jsx`
- `components/school-portal/SchoolReportModal.jsx`
- `components/learning-book/BookTocModal.js`

## מובייל בלבד (אם זוהה)
- זוהו התאמות explicit למובייל:
  - `components/learning/StudentNumericAnswerField.jsx` (`max-[420px]` classes).
  - `pages/learning/*-master.js` — mobile HUD/controls.
  - `components/arcade/*` — condensed layouts ו־overflow strips.
- לא נמצאו קבצי copy נפרדים למובייל בלבד; אותו copy מוצג בפריסות שונות.

## הערות scope
- `app/` לא קיים בריפו.
- `styles/` קיים אך לא זוהו בו טקסטים עבריים.
- `public/` מכיל מעט copy (למשל `sw.js`).
- `scripts/` כולל בעיקר QA/build/content tooling; לא מופה כמקור UI פרודקשני ראשי.

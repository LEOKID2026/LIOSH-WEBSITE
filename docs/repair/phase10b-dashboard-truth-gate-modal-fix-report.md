# Phase 10B — Dashboard Truth Gate Modal Fix Report

תאריך: 2026-06-15  
Scope: תיקון בדיקה בלבד ל-`DASHBOARD_TRUTH_PASS`.

## 1. מה שונה

שונה רק gate/helper:

- `scripts/truth-gates/lib/live-parent-activity-flow.mjs`

לא שונה מוצר:

- לא שונה `pages/student/home.js`.
- לא שונה UI.
- לא נוסף total questions למסך הראשי.
- לא שונה view model.
- לא הוחזר localStorage כמקור אמת.

## 2. שרת ו-preflight

- Port נקי: `3013`.
- Server: `npx next start -p 3013`.
- `3002` לא היה בשימוש.
- `GET /parent/login`: `200`.
- login testid: `parent-login-identifier` נמצא.
- `GET /learning/parent-report?...`: `200`, לא `404`.
- `POST /api/student/login` עם username `eran` ו-PIN masked: `200`, cookie הוגדר.

## 3. מודאלים שנפתחו

ה-gate עודכן לפתוח את המודאלים הבאים ב-`/student/home`:

- `הנתונים שלי`
- `ההתקדמות שלי`
- `המשימות שלי`
- `פעילויות אישיות`

הנתון `questionsAnswered` לא נדרש על המסך הראשי. הוא נמצא במודאל `הנתונים שלי`, שבו `StatsSection` מציג `שאלות שנענו`.

בתיקון, `DASHBOARD_TRUTH_PASS` בודק את `questionsAnswered` בתוך מודאל `הנתונים שלי`, וממשיך לבדוק שגם אחרי localStorage poison הערך מגיע מהשרת ולא מ-localStorage.

## 4. תוצאות

| Command | Result | Notes |
|---------|--------|-------|
| `npm run gate:dashboard-truth` | PASS | פתח מודאלים; `expectedQuestions=345`; `baselineAnswers=343`; `afterAnswers=345`; `baselineMinutes=140.32`; `afterMinutes=144.32`. |
| `npm run test:truth-gates` | FAIL | Summary: `pass=13`, `fail=1`, `skip=0`. Artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781504669143.json`. |
| `npm run test:truth-gates:launch` | NOT RUN | נעצרתי כי `test:truth-gates` נכשל. |
| `npm run test:truth-gates:offline` | NOT RUN | נעצרתי כי `test:truth-gates` נכשל. |
| `npm run test:production-script-guards` | NOT RUN | נעצרתי כי `test:truth-gates` נכשל. |
| `git diff --check` | NOT RUN | נעצרתי כי `test:truth-gates` נכשל. |

## 5. Root Cause נוכחי

הכשל המקורי של `DASHBOARD_TRUTH_PASS` לא היה באג מוצר. ה-gate בדק את המסך הראשי, אבל הנתון נמצא במודאל.

אחרי התיקון:

- `DASHBOARD_TRUTH_PASS` עובר.
- `test:truth-gates` עדיין נכשל, אבל לא על dashboard.
- הכשל הנוכחי הוא ב-`PARENT_ACTIVITY_PASS` בתוך full suite:

```text
PARENT_ACTIVITY_PASS: FAIL — fetch failed
```

ה-artifact לא מספק פירוט מעבר ל-`fetch failed`. לפי הוראת owner, לא המשכתי ל-`launch/offline/guards/diff` אחרי הכשל.

## 6. פקודות להרצה חוזרת

```powershell
$env:E2E_PARENT_EMAIL='18eran@gmail.com'
$env:E2E_PARENT_PASSWORD='********'
$env:E2E_STUDENT_USERNAME='eran'
$env:E2E_STUDENT_PIN='****'
$env:TRUTH_GATES_BASE_URL='http://127.0.0.1:3013'
Remove-Item Env:\TRUTH_GATES_STUDENT_ID -ErrorAction SilentlyContinue

npm run gate:dashboard-truth
npm run test:truth-gates
```

לא להריץ launch עד ש-`test:truth-gates` עובר ללא FAIL.

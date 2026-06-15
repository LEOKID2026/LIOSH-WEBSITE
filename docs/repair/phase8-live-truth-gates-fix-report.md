# Phase 8 — Live Truth Gates Fix Report

תאריך: 2026-06-15  
Scope: Fix live `UI_PASS`, `PDF_PASS`, `E2E_TRUTH_PASS` only.

## 1. Login Timeout Root Cause

Root cause ראשון: `TRUTH_GATES_BASE_URL` ברירת המחדל (`http://127.0.0.1:3002`) הצביע על listener שלא היה שרת המוצר התקין. הוא החזיר `404` ל-`/parent/login`, ולכן Playwright חיכה ל-placeholder של login שלא היה קיים בדף בפועל.

אימות:

- `http://127.0.0.1:3002/parent/login` החזיר `404`.
- שרת נקי על `3003` החזיר `200` ל-`/parent/login` וה-placeholder היה קיים.
- לאחר מעבר לשרת production נקי (`next start`) login עבר וה-gate התקדם לדוח.

Root cause סביבתי נוסף: `next dev` על `3003` נתקע בקומפילציה ראשונה של `/learning/parent-report`; לכן live gates הורצו מול build production מקומי (`next start`) ולא מול dev compile תקוע.

## 2. מה שונה

- נוסף `data-testid="parent-login-identifier"` לשדה identifier ב-`pages/parent/login.js`.
- `UI_PASS` ו-`PDF_PASS` משתמשים עכשיו ב-`getByTestId("parent-login-identifier")` ו-`getByTestId("parent-login-secret")` במקום placeholder text. זה עדיין login אמיתי, לא mock ולא bypass.
- `UI_PASS` עוטף timeout של `report-data` ב-error ברור במקום unhandled promise.
- `bridge-report-provenance.js` מסנכרן עכשיו `report.summary.totalQuestions`, `totalCorrect`, `totalWrong`, `overallAccuracy`, ו-counts לפי מקצוע מתוך `report-data` server payload.
- `PDF_PASS` משתמש באותו browser `report-data` response כמו ה-UI, כדי למנוע drift בין live API snapshot שנלקח לפני טעינת הדף לבין הנתונים שהדף עצמו קיבל.
- `parent-report-server-truth-phase1-selftest` עודכן לבדוק ש-`totalAnswers` מהשרת לא נשאר `0` בדוח.

## 3. API TotalAnswers מול UI Questions

כן, ה-blocker מ-Phase 5 היה רלוונטי: ה-bridge תיקן זמן מהשרת, אבל לא הכריח את `report.summary.totalQuestions` להתאים ל-`summary.totalAnswers` מה-API.

תיקון:

- אחרי יצירת הדוח ב-bridge, summary counts נלקחים מה-server API payload.
- לא הוחזר localStorage כמקור אמת.
- לא הומצאו totals; הנתונים מגיעים מ-`report-data`.

אימות live:

- `UI_PASS` עבר עם `apiSnap.totalQuestions=204` ו-`uiSnap.totalQuestions=204` בהרצה ידנית.
- בהרצת launch סופית, `UI_PASS` עבר מול live API/UI.

## 4. תוצאות

### Live Gates

| Gate | Result | Notes |
|------|--------|-------|
| `UI_PASS` | PASS | Live parent login + browser `report-data` + UI summary parity. |
| `PDF_PASS` | PASS | Real `page.pdf()` bytes, `pdf-parse`, PDF totals/range matched browser API snapshot. |
| `E2E_TRUTH_PASS` | PASS | `DB_PASS → API_PASS → UI_PASS → PDF_PASS` all passed. |

### Full Gates

| Command | Result | Artifact |
|---------|--------|----------|
| `npm run test:truth-gates` | PASS, 11/11 | `docs/repair/_artifacts/truth-gates/truth-gates-run-1781482068941.json` |
| `npm run test:truth-gates:launch` | PASS, 11/11 | `docs/repair/_artifacts/truth-gates/truth-gates-run-1781482160230.json` |

Important classification:

- `UI_PASS`, `PDF_PASS`, `E2E_TRUTH_PASS`, `API_PASS`, `DB_PASS`, `NO_LOCALSTORAGE_REPORT_PASS`, `PRODUCTION_GUARD_PASS` are not mock.
- `PARENT_ACTIVITY_PASS`, `REWARD_PASS`, `DASHBOARD_TRUTH_PASS`, `EVIDENCE_THRESHOLD_PASS` still rely on unit/source/in-process contracts where their gate payload says `usesMock: true`; they are not live parent-activity/reward/dashboard/evidence UI gates.

### Build / Regression

| Check | Result |
|-------|--------|
| `npm run build` | PASS after cleaning generated `.next`; warnings only for existing dynamic dependency in `utils/question-metadata-qa/question-metadata-scanner.js`. |
| `npm run test:truth-gates:offline` | PASS command exit 0; includes MOCK-layer contracts. |
| `npm run test:production-script-guards` | PASS, 11/11. |
| `git diff --check` | PASS; only CRLF warnings from Git on Windows. |
| `npx tsx scripts/parent-report-server-truth-phase1-selftest.mjs` | PASS. |
| `npm run gate:no-localstorage-report` | PASS. |

## 5. קבצים ששונו

- `pages/parent/login.js`
- `lib/learning-supabase/bridge-report-provenance.js`
- `scripts/parent-report-server-truth-phase1-selftest.mjs`
- `scripts/truth-gates/gates/ui-pass.mjs`
- `scripts/truth-gates/gates/pdf-pass.mjs`
- `docs/repair/phase8-live-truth-gates-fix-report.md`

Fresh artifacts generated:

- `qa-visual-output/truth-gates/PDF_PASS-fd3901da-66ce-46c7-a24c-b33df2141c04-2026-06-08-2026-06-14.pdf`
- `docs/repair/_artifacts/truth-gates/truth-gates-run-1781482068941.json`
- `docs/repair/_artifacts/truth-gates/truth-gates-run-1781482160230.json`

## 6. Blockers שנותרו

אין blocker ל-`UI_PASS`, `PDF_PASS`, או `E2E_TRUTH_PASS`.

נותרו gaps שאינם חלק מ-Phase 8:

- `PARENT_ACTIVITY_PASS` אינו live create→student-submit→report flow.
- `REWARD_PASS` אינו live coin persistence E2E.
- `DASHBOARD_TRUTH_PASS` אינו live dashboard vs DB.
- `EVIDENCE_THRESHOLD_PASS` אינו live UI/PDF rehearsal.
- סביבת `3002` עדיין לא אמינה כברירת מחדל אם listener זר תופס את הפורט; בהרצות Phase 8 נעשה שימוש ב-`TRUTH_GATES_BASE_URL=http://127.0.0.1:3004/3005` מול `next start`.

## 7. האם אפשר לעבור לשלב live parent activity/reward/dashboard gates

כן. Phase 8 סגר את live parent report UI/PDF/E2E blockers. אפשר לעבור לשלב הבא שמקדם את `PARENT_ACTIVITY_PASS`, `REWARD_PASS`, ו-`DASHBOARD_TRUTH_PASS` מ-unit/source MOCK contracts ל-live gates אמיתיים.

## 8. פקודות שחזור

```bash
# Clean generated build output if .next was corrupted by concurrent dev/build
Remove-Item -Recurse -Force .next
npm run build

# Start local production server
npx next start -p 3005

# Live truth gates
$env:TRUTH_GATES_BASE_URL='http://127.0.0.1:3005'
npm run gate:ui-pass
npm run gate:pdf-pass
npm run gate:e2e-truth
npm run test:truth-gates
npm run test:truth-gates:launch

# Regressions
npm run test:truth-gates:offline
npm run test:production-script-guards
git diff --check
```

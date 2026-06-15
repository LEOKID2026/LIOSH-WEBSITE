# Final Server Truth Repair Summary

תאריך: 2026-06-15  
Phase: 7 — איחוד, קונפליקטים, gates, ודוח אמת סופי  
Artifact אמת טרי שנוצר בהרצה זו: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781479127027.json`

## 1. Executive Summary

אין PASS כללי.

מצב אמת:

- שכבות DB ו-API לדוח הורים עברו מול Supabase/API חי.
- דפי דוח הורים רשמיים חסומים מ-localStorage truth.
- פעילות הורה מחוברת למנוע/זמן/פרסים ברמת unit/source contract, אבל לא אומתה ב-live create→submit→report E2E.
- Dashboard תלמיד נקי מ-defaults מטעים ברמת unit/source contract, אבל לא אומת live מול DB.
- Evidence thresholds מיושרים ברמת unit/source contract.
- Production script guards עברו selftest והוכנסו תחת `PRODUCTION_GUARD_PASS`.
- `UI_PASS`, `PDF_PASS`, ו-`E2E_TRUTH_PASS` נכשלים כרגע. ה-root cause בהרצה זו: gate ה-UI/PDF לא הצליח להתחבר דרך `/parent/login`; Playwright לא מצא את placeholder ההתחברות הצפוי תוך 30 שניות.
- `npm run build` הסתיים בהצלחה לאחר שהועבר לרקע; היו compile warnings קיימות על dynamic dependency ב-`utils/question-metadata-qa/question-metadata-scanner.js`.

המלצת המשך: חייבים לתקן blockers לפני מעבר לשלב הבא שמסתמך על launch truth מלא. אפשר להמשיך רק לשלב תיקון ממוקד של UI/PDF gate או auth selector, לא לשלב release/launch.

## 2. קבצים ששונו לפי סוכן

### סוכן 1 — Server Truth Parent Report

- `pages/learning/parent-report.js`
- `pages/learning/parent-report-detailed.js`
- `lib/parent-report-server-truth.js`
- `lib/learning-supabase/bridge-report-provenance.js`
- `lib/learning-supabase/parent-report-local-dev.js`
- `lib/learning-supabase/report-data-adapter.js`
- `lib/learning-supabase/seed-db-report-local-storage.js`
- `lib/learning-supabase/parent-report-from-api-payload.js`
- `scripts/parent-report-server-truth-phase1-selftest.mjs`
- `package.json`

### סוכן 2 — Parent Activity / Time / Rewards

- `lib/learning/activity-classification.js`
- `lib/learning-supabase/parent-activity-learning-credit.server.js`
- `lib/learning-supabase/parent-activity-completion-reward.server.js`
- `lib/parent-server/parent-activity.server.js`
- `lib/parent-server/report-data-aggregate.server.js`
- `lib/learning-supabase/student-learning-profile.server.js`
- `lib/learning-supabase/monthly-persistence-reward.server.js`
- `utils/parent-report-language/grade-insight-he.js`
- `utils/answer-compare.js`
- `tests/parent-server/parent-assigned-activities.test.mjs`
- `tests/learning/parent-activity-learning-credit.test.mjs`
- `tests/learning/activity-classification.test.mjs`
- `tests/learning/phase4-aggregate-filter.test.mjs`
- `tests/learning/phase9-single-truth-progress.test.mjs`

### סוכן 3 — Student Dashboard Truth

- `lib/learning-shared/student-display-truth.js`
- `lib/learning-client/studentHomeDashboardClient.js`
- `lib/learning-shared/student-subject-dashboard-view.js`
- `lib/learning-shared/student-account-state-view.js`
- `lib/learning-supabase/student-learning-profile.server.js`
- `pages/api/student/home-profile.js`
- `pages/api/student/learning-profile.js`
- `pages/student/home.js`
- `components/student/StudentMonthlyPersistencePanel.js`
- `pages/learning/*-master.js`
- `scripts/verify-student-dashboard-view.mjs`
- `tests/learning/phase9-single-truth-progress.test.mjs`

### סוכן 4 — Evidence Thresholds / Parent Wording

- `utils/parent-report-language/parent-evidence-matrix.js`
- `utils/parent-report-language/subject-evidence-policy.js`
- `utils/parent-report-topic-evidence.js`
- `lib/learning/evidence-quality.js`
- `utils/parent-report-diagnostic-restraint.js`
- `utils/parent-report-decision-gates.js`
- `lib/parent-server/parent-facing-report-authority.js`
- `lib/parent-server/parent-report-parent-facing.server.js`
- `utils/parent-report-language/confidence-parent-he.js`
- `utils/parent-copilot/evidence-polarity.js`
- `utils/topic-next-step-config.js`
- `tests/learning/evidence-quality-layer.test.mjs`
- `tests/learning/question-metadata-consumption.test.mjs`

### סוכן 5 — Truth Gates

- `scripts/truth-gates/**`
- `tests/truth-gates/parent-activity-truth-contract.test.mjs`
- `tests/truth-gates/reward-truth-contract.test.mjs`
- `docs/repair/truth-gates-and-pass-contract.md`
- `tests/e2e/parent-report-real-ui-load.spec.ts`
- `scripts/parent-report-real-ui-load.mjs`
- `package.json`

### סוכן 6 — Production Script Guards

- `scripts/lib/production-script-guard.mjs`
- `scripts/qa/lib/db-write-guard.mjs`
- `scripts/school-portal/lib/school-db-write-guard.mjs`
- `scripts/teacher-portal/lib/teacher-db-write-guard.mjs`
- DB-writing seed/backfill/simulation scripts documented in `docs/repair/production-script-guards-report.md`
- `scripts/tests/production-script-guard-selftest.mjs`
- `package.json`

### Phase 7 — איחוד ותיקון קונפליקט

- `scripts/truth-gates/gates/production-guard-pass.mjs`
- `scripts/truth-gates/gate-registry.mjs`
- `docs/repair/truth-gates-and-pass-contract.md`
- `docs/repair/final-server-truth-repair-summary.md`

## 3. קבצים ששונו ע"י כמה סוכנים

- `package.json` — סוכנים 1, 5, 6 הוסיפו scripts.
- `lib/learning-supabase/student-learning-profile.server.js` — סוכן 2 הוסיף parent activity minutes/answers; סוכן 3 יישר accuracy/null dashboard truth.
- `tests/learning/phase9-single-truth-progress.test.mjs` — סוכנים 2 ו-3, ומשמש גם gates של סוכן 5.
- `tests/parent-server/parent-assigned-activities.test.mjs` — סוכן 2, ומשמש `API_PASS`/`PARENT_ACTIVITY_PASS`.
- `tests/learning/phase4-aggregate-filter.test.mjs` — סוכן 2 מול שכבת evidence/diagnostic של סוכן 4.
- `docs/repair/truth-gates-and-pass-contract.md` — סוכן 5 ו-Phase 7.
- `scripts/truth-gates/gates/production-guard-pass.mjs` ו-`scripts/truth-gates/gate-registry.mjs` — סוכן 5 ו-Phase 7.

## 4. קונפליקטים שנמצאו

1. `PRODUCTION_GUARD_PASS` היה מוגדר כ-source guard לדפי דוח בלבד, למרות ש-Phase 6 דורש production guards לסקריפטים מסוכנים.
2. אין עדות שסוכן 1 חסם צורך של סוכן 2: parent activity מוזנת ל-aggregate server-side ולא דרך localStorage report truth.
3. אין עדות שסוכן 2 הוסיף label נפרד לדוח: source/unit tests בודקים שאין heading/label נפרד, ו-`stripInternalReportPayloadFields` מסיר provenance פנימי.
4. אין עדות שסוכן 3 החזיר localStorage כ-truth בדשבורד: tests מאשרים server-derived minutes ומצב missing vs zero.
5. אין סתירה חדשה בספי evidence: 5/8/12/15 מיושרים דרך matrix ו-tests עוברים.
6. סוכן 5 עדיין מסמן חלק מה-gates כ-PASS בתהליך עצמו אף שהם `usesMock: true`; בדוח זה הם מסומנים `MOCK`, לא PASS.
7. סוכן 6 לא שבר local/staging לפי selftest: staging write בלי triple confirm עובר; production write נחסם בלי אישור משולש.

## 5. קונפליקטים שתוקנו

- `PRODUCTION_GUARD_PASS` עודכן להריץ גם `scripts/tests/production-script-guard-selftest.mjs`.
- `gate-registry.mjs` עודכן כך שה-layer הוא `source-and-script-guard`.
- `truth-gates-and-pass-contract.md` עודכן כך ש-`PRODUCTION_GUARD_PASS` כולל גם dry-run/production hard-stop guards לסקריפטי Phase 6.

## 6. החלטות מוצר שיושמו

- דוח הורים רשמי = server/API/DB only.
- localStorage אינו מקור אמת לדוח רשמי.
- פעילות הורה נספרת במנוע, זמן ופרסים ברמת contracts.
- פעילות הורה לא מוצגת בדוח כפעילות נפרדת.
- dashboard תלמיד לא מציג default/fallback כאמת ברמת contracts.
- PDF אמור לשקף UI state מהשרת, אבל gate ה-PDF נכשל לפני parity.
- PASS מחולק לפי שכבות ולא הוכרז PASS כללי.
- scripts מסוכנים מוגנים מ-production לפי selftest.

## 7. Gates ותוצאות

| Gate | Result | Reality |
|------|--------|---------|
| `NO_LOCALSTORAGE_REPORT_PASS` | PASS | Source guard אמיתי; דפי מוצר חסומים מ-`mleo_*` localStorage report truth. |
| `API_PASS` | PASS | Live API עבר; `report-data` החזיר 200 ו-`totalAnswers=188` עבור student חי. |
| `UI_PASS` | FAIL | Playwright נכשל לפני parity: `locator.fill` timeout על placeholder login. |
| `PDF_PASS` | FAIL | נכשל באותו login selector לפני בדיקת UI/PDF parity; לא PDF PASS. |
| `E2E_TRUTH_PASS` | FAIL | chain נעצר כי `UI_PASS` נכשל. |
| `PARENT_ACTIVITY_PASS` | MOCK | Unit/source/in-memory contracts עברו; לא live create→submit→report. |
| `REWARD_PASS` | MOCK | Unit/source contracts עברו; לא live coin persistence E2E. |
| `DASHBOARD_TRUTH_PASS` | MOCK | Unit/source contracts עברו; לא live dashboard vs DB. |
| `EVIDENCE_THRESHOLD_PASS` | MOCK | In-process/fixture policy suites עברו; לא live UI/PDF rehearsal. |
| `PRODUCTION_GUARD_PASS` | PASS | Source guard + production script guard selftest עברו. |

Additional gate:

| Gate | Result | Reality |
|------|--------|---------|
| `DB_PASS` | PASS | Live Supabase + API agree; `totalAnswers=447` for 30-day range. |

## 8. האם דוח הורים עכשיו server-only

כן ברמת source/product pages:

- `parent-report.js` ו-`parent-report-detailed.js` לא קוראים `localStorage.getItem("mleo_*")`.
- ללא `source` + `studentId` תקינים מוצג portal gate.
- API failure לא חוזר ל-localStorage.

לא הוכרז E2E מלא כי `UI_PASS` נכשל בשכבת login.

## 9. האם פעילות הורה נכנסת למנוע/זמן/פרסים

כן ברמת contracts:

- מנוע: parent attempts נכנסים ל-aggregate ו-`guided_practice` מהורה מסווג `diagnostic_guided`.
- זמן: credited time נכנס לדוח/dashboard/monthly persistence.
- פרסים: submit ראשון מחבר completion rewards עם idempotency.

סטטוס gate: `PARENT_ACTIVITY_PASS` ו-`REWARD_PASS` הם `MOCK`, לא real live E2E.

## 10. האם פעילות הורה לא מוצגת בנפרד בדוח

כן ברמת source/unit:

- לא נוסף section חדש.
- provenance פנימי מוסר מה-public payload.
- phrase נפרד לפעילות הורה לא מופיע בדפי report לפי tests.

לא אומת ב-live UI/PDF בגלל `UI_PASS`/`PDF_PASS` failure.

## 11. האם dashboard נקי מ-defaults מטעים

כן ברמת unit/source:

- missing accuracy אינו 0%.
- monthly minutes לא מפוברק מ-localStorage.
- unavailable/noData/estimated מסומנים.

סטטוס gate: `DASHBOARD_TRUTH_PASS` הוא `MOCK` כי לא בוצע live dashboard vs DB.

## 12. האם PDF נבדק מול UI

לא. `PDF_PASS` רץ ונכשל לפני parity:

- root cause: login selector timeout ב-`/parent/login`.
- לא נוצר PDF PASS.
- אין להשתמש ב-`qa:parent-pdf-export` כ-PDF truth כי הוא fixture/localStorage path.

## 13. האם evidence thresholds אחידים

כן ברמת source/unit:

- 5 = preliminary start.
- 8 = insight/hedged parent wording.
- 12 = strong/supported start.
- 15 = thin whole-report threshold בלבד.

סטטוס gate: `EVIDENCE_THRESHOLD_PASS` הוא `MOCK` כי הוא in-process/fixture ולא live UI/PDF.

## 14. האם scripts מוגנים מ-production

כן עבור Phase 6 scope:

- default dry-run.
- production hard-stop בלי `ALLOW_PRODUCTION_WRITE=true`, `CONFIRM_PROJECT_REF`, `CONFIRM_OPERATION`.
- staging/local write לא דורשים triple confirm.
- `PRODUCTION_GUARD_PASS` מריץ עכשיו גם את selftest הזה.

נותרו scripts מחוץ ל-scope Phase 6b כפי שתועד בדוח Phase 6.

## 15. Build/Test Results

עברו:

- `npx tsx scripts/parent-report-server-truth-phase1-selftest.mjs` — PASS.
- `npx tsx scripts/parent-report-activity-time-selftest.mjs` — PASS.
- `npx tsx scripts/parent-report-bridge-load-selftest.mjs` — PASS.
- `npx tsx scripts/parent-report-pages-ssr.mjs` — PASS.
- `node --test tests/parent-server/parent-assigned-activities.test.mjs tests/learning/parent-activity-learning-credit.test.mjs tests/learning/activity-classification.test.mjs tests/learning/phase4-aggregate-filter.test.mjs` — 84/84 pass.
- `node --test tests/learning/phase9-single-truth-progress.test.mjs` — 19/19 pass.
- `node --test tests/learning/evidence-quality-layer.test.mjs` — 17/17 pass.
- `npx tsx scripts/parent-report-zero-evidence-policy.mjs` — PASS.
- `npx tsx scripts/parent-report-diagnostic-evidence.mjs` — PASS.
- `node --test tests/learning/question-metadata-consumption.test.mjs` — 88/88 pass.
- `npm run test:production-script-guards` — 11/11 pass.
- `npm run test:truth-gates:offline` — command exit 0; gates include several MOCK-layer contracts.
- `git diff --check` — PASS, only CRLF warnings.
- unresolved merge conflicts — none.
- IDE lints on Phase 7 edited files — no errors.
- `npm run build` — PASS, exit code 0. Warning: port 3001 was in use, and Next compiled with warnings for dynamic dependency in `utils/question-metadata-qa/question-metadata-scanner.js`.

נכשל:

- `npm run test:truth-gates` — FAIL with summary `pass=8`, `fail=3`, `skip=0`.
- Failed gates: `UI_PASS`, `PDF_PASS`, `E2E_TRUTH_PASS`.

לא הורץ בנפרד:

- `npm run test:truth-gates:launch` — לא הורץ בנפרד; `npm run test:truth-gates` כבר הריץ את אותם launch gates ללא `MOCK_UI_PASS` ונכשל.
- `npm run gate:e2e-truth` — לא הורץ בנפרד; הוא רץ כחלק מ-`npm run test:truth-gates` ונכשל בגלל `UI_PASS`.
- `npm run gate:mock-ui` — לא הורץ; גם אם יעבור, הוא `MOCK_UI_PASS` בלבד ולא truth.

## 16. Blockers שנותרו

1. `UI_PASS` נכשל ב-login selector timeout:
   - expected placeholder: `הקלידו אימייל או שם משתמש שקיבלתם מהמורה`.
   - הקוד הנוכחי ב-`pages/parent/login.js` כן מכיל את ה-placeholder.
   - ייתכן שה-dev server משרת state/route שונה, או שה-login page לא מגיע למצב rendered form בזמן gate.
2. `PDF_PASS` חסום על אותו login failure; לא בוצעה parity מול UI/API.
3. `E2E_TRUTH_PASS` חסום על `UI_PASS`.
4. live parent activity create→student submit→report/reward E2E לא קיים ב-default truth gates.
5. live dashboard vs DB gate לא קיים.

## 17. המלצת המשך

חייבים לתקן blockers לפני שלב release/launch:

- לתקן או לייצב את UI/PDF auth flow ב-truth gates.
- להריץ שוב `npm run test:truth-gates`.
- build כבר עבר; אם מתקנים UI/PDF gates, להריץ build שוב רק אם הקוד השתנה.
- אם נדרש launch truth אמיתי, להוסיף live parent activity/reward/dashboard gates או לתעד אותם כ-MOCK בלבד.

## 18. פקודות מדויקות להרצה חוזרת

```bash
npx tsx scripts/parent-report-server-truth-phase1-selftest.mjs
npx tsx scripts/parent-report-activity-time-selftest.mjs
npx tsx scripts/parent-report-bridge-load-selftest.mjs
npx tsx scripts/parent-report-pages-ssr.mjs
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/learning/parent-activity-learning-credit.test.mjs tests/learning/activity-classification.test.mjs tests/learning/phase4-aggregate-filter.test.mjs
node --test tests/learning/phase9-single-truth-progress.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
npx tsx scripts/parent-report-zero-evidence-policy.mjs
npx tsx scripts/parent-report-diagnostic-evidence.mjs
node --test tests/learning/question-metadata-consumption.test.mjs
npm run test:production-script-guards
npm run test:truth-gates:offline
npm run test:truth-gates
npm run test:truth-gates:launch
npm run gate:e2e-truth
npm run build
git diff --check
git diff --name-only --diff-filter=U
```

For full live E2E truth:

```bash
npm run dev:run-button
npm run gate:e2e-truth
```

Required env for live gates:

```bash
NEXT_PUBLIC_LEARNING_SUPABASE_URL=...
NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY=...
LEARNING_SUPABASE_SERVICE_ROLE_KEY=...
E2E_PARENT_EMAIL=...
E2E_PARENT_PASSWORD=...
TRUTH_GATES_STUDENT_ID=...
TRUTH_GATES_BASE_URL=http://127.0.0.1:3002
```

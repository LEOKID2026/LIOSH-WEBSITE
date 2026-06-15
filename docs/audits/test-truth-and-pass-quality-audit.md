# Audit: איכות הבדיקות ומשמעות PASS במערכת

תאריך: 2026-06-15  
סוג עבודה: Audit read-only בלבד  
סטטוס: לא בוצע שינוי בקוד מוצר, לא נוצרו בדיקות חדשות, לא בוצע commit/push.

## 1. Scope — מה נבדק

נבדקו קבצי בדיקות, סקריפטי QA, fixtures, ומודולים שהבדיקות מפעילות סביב השאלות הבאות:

- האם PASS בבדיקות דוח הורים מוכיח שהורה אמיתי רואה נתונים נכונים.
- האם PASS בבדיקות PDF מוכיח PDF אמיתי, ZIP אמיתי, ותוכן זהה או עקבי ל־UI.
- האם פעילות אישית מהורה, פעילות עצמאית של תלמיד, זמן למידה, פרסים/progress, אבחון והרשאות נבדקים מול מוצר אמיתי או רק מול mock/fixture.
- האם תאריכים, כיתה אחרת, חוזקות, מצב אין מספיק נתונים, ומצב אין שאלות במקצוע מקבלים כיסוי אמיתי.

לא הורצו בדיקות. ה־Audit מבוסס על קריאת קבצי בדיקות וסקריפטים קיימים. לכן "PASS" במסמך זה מתייחס למשמעות PASS כפי שעולה מהקוד הקיים, לא להרצה חדשה.

## 2. קבצים/מודולים שנבדקו

קבצי תצורה וסקריפטים:

- `package.json`
- `scripts/parent-report-product-contract-audit.mjs`
- `scripts/parent-report-product-ui-binding-audit.mjs`
- `scripts/parent-report-rendered-product-snapshots.mjs`
- `scripts/parent-report-release-gate.mjs`
- `scripts/parent-report-limited-test-gate.mjs`
- `scripts/parent-report-output-integrity.mjs`
- `scripts/parent-report-zero-evidence-policy.mjs`
- `scripts/parent-report-diagnostic-evidence.mjs`
- `scripts/parent-report-v2-custom-range-calendar-selftest.mjs`
- `scripts/parent-report-browser-qa.mjs`
- `scripts/parent-report-real-ui-load.mjs`
- `scripts/parent-report-real-output-signoff.mjs`
- `scripts/parent-report-final-product-verify.mjs`
- `scripts/parent-report-grade-e2e-verify.mjs`
- `scripts/qa-parent-pdf-export.mjs`
- `scripts/qa/parent-report-visible-truth-audit.mjs`
- `scripts/qa/parent-report-numeric-sanity-audit.mjs`
- `scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs`
- `scripts/qa/parent-report-q2e-monthly-data-verify.mjs`
- `scripts/qa/parent-report-q2e-monthly-realistic-data-verify.mjs`
- `scripts/qa/parent-report-q2e-monthly-realistic-pdf-content-verify.mjs`
- `scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs`
- `scripts/qa/parent-report-q2e-monthly-realistic-zip-independent-verify.mjs`
- `scripts/school-portal/run-school-sim-nightly.mjs`
- `scripts/school-portal/sim/run-selftest.mjs`
- `scripts/backfill-activity-classification.mjs`
- `scripts/learning-simulator/run-orchestrator.mjs`
- `scripts/parent-report-learning-simulation-audit.mjs`
- `scripts/verify-learning-time-credit.mjs`
- `scripts/qa/staging-e2e-learning-time-fairness.mjs`

קבצי בדיקות:

- `tests/e2e/parent-report-real-ui-load.spec.ts`
- `tests/e2e/parent-dashboard-modal-mobile.spec.ts`
- `tests/e2e/student-home-personal-activities.spec.ts`
- `tests/e2e/demo-school-simulation-smoke.spec.ts`
- `tests/reports/diagnostic-truth-consumer-verification.test.mjs`
- `tests/parent-server/parent-assigned-activities.test.mjs`
- `tests/learning/learning-time-credit.test.mjs`
- `tests/learning/phase9-single-truth-progress.test.mjs`
- `tests/learning/hebrew-g1-literacy-progress.test.mjs`
- `tests/classroom-activities/assigned-activity-play-metadata.test.mjs`
- `tests/classroom-activities/student-activity-resume.test.mjs`
- `tests/classroom-activities/student-activity-result-labels.test.mjs`
- `tests/teacher-activity-authorization.test.mjs`
- בדיקות יצירת שאלות פעילות ב־`tests/classroom-activities/generate-*.test.mjs`
- בדיקות הרשאות תחת `tests/auth`
- בדיקות דיון והרשאות פעילות תחת `tests/discussion-*.test.mjs`

Fixtures ומודולי עזר:

- `tests/fixtures/parent-report-api-body-e2e.mjs`
- `tests/fixtures/parent-report-product-scenarios.mjs`
- `tests/fixtures/parent-report-learning-simulations.mjs`
- `utils/parent-report-output-integrity/zero-evidence-policy-tests.js`
- `scripts/lib/parent-report-pdf-output-verify.mjs`

לא נבדקו כל 225+ קבצי הבדיקה במאגר. נבדקו הקבצים הרלוונטיים ישירות לנושאים שב־Scope.

## 3. סקירת test suites קיימים

מערכת הבדיקות אינה סוויטה אחת ברורה אלא שילוב של:

- `node:test` unit/contract tests על פונקציות ו־fixtures.
- סקריפטי QA שמייצרים artifacts, JSON/Markdown, PDFs ו־ZIPs.
- Playwright E2E חלקי מול UI אמיתי, לעיתים עם API mocked או localStorage seeded.
- סקריפטים מול Supabase אמיתי ב־staging/local לפי env.
- סריקות source code שמוודאות import, regex, היעדר מחרוזות או מבנה קוד.
- סימולציות nightly/backfill/learning-simulator שמייצרות נתונים או artifacts, אבל לא תמיד מוכיחות מוצר end-to-end.

המשמעות: PASS אינו אחיד. בחלק מהקבצים PASS חזק ומוכיח קובץ PDF/ZIP אמיתי. בחלק אחר PASS מוכיח רק שה־fixture עבר דרך פונקציה, שה־SSR markup מכיל טקסט, או שהקוד עדיין כולל/לא כולל regex מסוים.

## 4. טבלת Audit מלאה

| Test file | מה הוא טוען שהוא מוכיח | מה הוא באמת מוכיח | מוצר אמיתי / mock / fixture | UI / API / DB / PDF | האם אפשר לקבל PASS למרות באג אמיתי | רמת אמינות | בדיקות חסרות שחובה להוסיף |
|---|---|---|---|---|---|---|---|
| `tests/e2e/parent-report-real-ui-load.spec.ts` | דוח הורים נטען ב־desktop/mobile | דף UI נטען ללא מסך שגיאה כשה־API מוחלף ב־fixture | מוצר UI אמיתי + `route.fulfill` mock API | UI + API mock | כן. DB, auth, parent/student אמיתיים, ותוכן נכון לא נבדקים; empty-state גם נחשב הצלחה | בינונית-נמוכה | E2E עם הורה אמיתי, תלמיד אמיתי, DB אמיתי, בדיקת תוכן גלוי ולא רק shell |
| `tests/fixtures/parent-report-api-body-e2e.mjs` | גוף API לדוח הורים | fixture סטטי עם תלמיד ונתוני מתמטיקה בלבד | fixture | API shape בלבד | כן. לא מוכיח נתונים אמיתיים או כיסוי מקצועות | נמוכה | fixture מגוון עם אפס נתונים, חוזקות, חולשות, כמה מקצועות, כיתה אחרת |
| `scripts/parent-report-real-ui-load.mjs` | gate UI אמיתי | מריץ bridge selftest ואז Playwright עם API mock | dev server + mock | UI + selftest | כן. לא מוכיח DB/API production | בינונית-נמוכה | להריץ מול `/api/parent/.../report-data` אמיתי עם auth |
| `scripts/parent-report-product-contract-audit.mjs` | חוזה מוצר לדוח הורים | בונה דוחות מתוך scenarios ו־localStorage mocked, בודק שדות, wording ו־evidence thresholds | fixtures + mocked localStorage | contract/API in-process | כן. UI אמיתי, DB, PDF לא מוכחים | בינונית | בדיקת route אמיתי והשוואה לטקסט שהורה רואה |
| `scripts/parent-report-product-ui-binding-audit.mjs` | binding של contract ל־UI | SSR `renderToStaticMarkup` של קומפוננטים מול scenarios | fixtures + SSR | UI SSR בלבד | כן. CSS, hydration, browser behavior ונתוני API לא מוכחים | בינונית-נמוכה | Playwright מול מסכים אמיתיים + selectors גלויים |
| `scripts/parent-report-rendered-product-snapshots.mjs` | snapshots parent-visible | יוצר HTML/TXT מלאכותי מתוך detailed report ו־scenarios | fixtures | snapshot text/HTML | כן. לא דף מוצר אמיתי ולא PDF | נמוכה-בינונית | snapshot מתוך browser DOM אמיתי ומול PDF |
| `scripts/parent-report-release-gate.mjs` | release gate | קורא artifacts קיימים ומחשב PASS/FAIL | artifacts קיימים | metadata בלבד | כן. אם artifacts לא נוצרו מהרצה אמיתית או אינם עדכניים, PASS מטעה | נמוכה | gate שמריץ את הבדיקות ולא רק קורא קבצים |
| `scripts/parent-report-limited-test-gate.mjs` | מוכנות limited test | קורא JSON קיימים ודורש browser QA PASS | artifacts קיימים | metadata בלבד | כן. תלוי בקבצים קיימים; לא מוכיח מוצר בזמן אמת | נמוכה | rerun מלא או checksum/run metadata חובה |
| `scripts/parent-report-output-integrity.mjs` | row identity, חוזקות/חולשות, grade split, zero evidence, PDF/print integrity | בדיקות חזקות יחסית על pipeline in-process, fixtures, trace rows, print bundle; PDF אמיתי רק אם קבצים קיימים | fixtures + real regression fixture + optional PDF files | API/model + print text + optional PDF | כן. אם PDF חסר הבדיקה נכשל, אבל כשהוא קיים נבדקים רק invariants מסוימים; UI/DB לא מלאים | בינונית-גבוהה | UI/PDF equivalence מלאה, DB אמיתי, parent/student אמיתי |
| `scripts/lib/parent-report-pdf-output-verify.mjs` | PDF או print output תקין | אם יש PDF bytes, מנסה `pdf-parse`; אם לא, יכול להשתמש ב־print DOM fallback | PDF buffer או fallback text | PDF/print | כן כאשר fallback מותר: PASS יכול להיות בלי PDF אמיתי | בינונית | במקומות קריטיים לדרוש `requirePdfBytes: true` |
| `scripts/qa-parent-pdf-export.mjs` | PDF export אמיתי מכיל תובנה ולא מכיל Copilot placeholder | Playwright מייצר PDF אמיתי מדפים, מפענח עם `PDFParse` ובודק fingerprints | dev server + localStorage fixture | UI + PDF אמיתי | כן. נתונים מ־localStorage fixture, לא DB/API/auth; לא משווה PDF ל־UI מלא | גבוהה לתקינות PDF בסיסית, בינונית לאמת מוצר | DB-backed parent report PDF, השוואת DOM text מול PDF text |
| `scripts/parent-report-real-output-signoff.mjs` | sign-off קשה של output אמיתי | trace חזק על fixture, optional Playwright PDF export, בדיקות grade split ו־print | real regression fixture + optional browser | model + optional PDF | כן. "real" הוא fixture; לא בהכרח משתמש במשתמש/DB אמיתי | בינונית-גבוהה | תרחיש staging עם משתמשים אמיתיים |
| `scripts/qa/parent-report-q2e-monthly-realistic-pdf-content-verify.mjs` | 36 PDFs חודשיים תקינים | פותח PDFs קיימים מתיקיית export, `pdf-parse`, בודק תאריכים, דקות, שאלות, absence של inactivity | artifacts קיימים | PDF אמיתי | כן. לא מוכיח מקור ה־PDF או UI זהה; regex minutes/questions עלול להיות חלש | גבוהה ל־PDF artifact, בינונית ל־end-to-end | לקשור ל־run id, לפתוח גם UI, להשוות API/PDF/DOM |
| `scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs` | ZIP מכיל PDFs ריאליים | פותח ZIP אמיתי עם `Expand-Archive`, סופר 36 PDFs, בודק short reports | ZIP artifact אמיתי | ZIP + PDF | כן. בודק בעיקר short reports לתוכן ריאלי; detailed/summary פחות נבדקים | גבוהה ל־ZIP existence/content, בינונית לשלמות | לבדוק כל 36 PDFs באותה עומק ולהשוות ל־UI/API |
| `scripts/qa/parent-report-q2e-monthly-realistic-zip-independent-verify.mjs` | verification עצמאי מ־ZIP בלבד | קורא רק ZIP, מחלץ PDFs, מפענח page-1 summary headers | ZIP בלבד | ZIP + PDF | כן. אינו מוכיח DB או UI; בודק header בלבד | גבוהה ל־independent ZIP header | בדיקת גוף מלא, detailed PDFs, UI equivalence |
| `scripts/qa/parent-report-q2e-monthly-realistic-data-verify.mjs` | נתוני April 2026 ריאליים ב־DB | משתמש Supabase service role, בודק AAA1-AAA12, parent id, תשובות, דקות, ימים, מקצועות | DB אמיתי לפי env | DB + API aggregation | כן. לא בודק UI/PDF; תלוי seed ידוע | גבוהה ל־DB aggregate אם env נכון | לחבר להרצת UI/PDF באותו run |
| `scripts/qa/parent-report-q2e-monthly-data-verify.mjs` | aggregate data ו־date labels | DB אמיתי + סימולציית תאריכים מקומית | DB אמיתי + סימולציה | DB/API | כן. סימולציית date labels אינה UI אמיתי | בינונית-גבוהה | בדיקת date picker UI ו־PDF באותו flow |
| `scripts/parent-report-v2-custom-range-calendar-selftest.mjs` | custom range לא זז יום אחורה | פונקציה `resolveCustomReportCalendarRange` מחזירה calendar dates נכונים ב־Asia/Jerusalem | in-process | date logic | כן. לא בודק day/week/month/year UI, רק custom range | בינונית | Playwright date picker לכל יום/שבוע/חודש/שנה/בחירה |
| `scripts/qa/parent-report-visible-truth-audit.mjs` | כל טקסט גלוי בדוח תואם ספירת שאלות | בונה payload מ־DB עבור AAA/fixtures, אוסף שורות parent-facing וסורק PDF txt artifacts אם קיימים | DB + artifacts | API + partial PDF text | כן. אינו קורא DOM UI מלא; PDF scan תלוי artifacts ומחפש patterns מסוימים | בינונית-גבוהה | DOM/PDF מלא, השוואת source field לטקסט גלוי |
| `scripts/qa/parent-report-numeric-sanity-audit.mjs` | מספרים וזמן בדוח סבירים | DB Supabase, בודק duration sanity, sufficiency labels | DB אמיתי לפי env | DB/API | כן. לא בודק מה ההורה רואה בפועל | בינונית-גבוהה | cross-check UI/PDF עם אותם מספרים |
| `scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs` | diagnostic flags משפיעים על parent-facing output | DB Supabase, flag modes A-D, בודק differences/counts | DB אמיתי לפי env | DB/API | כן. יש באג לוגי אפשרי: `noPracticeFocusConflictB` מצפה length 0 בעוד `practiceFocusB` מצפה length > 0; לא ברור אם נדרש `every`/fail gate | בינונית | assertions סופיים, UI/PDF impact גלוי, negative cases |
| `tests/reports/diagnostic-truth-consumer-verification.test.mjs` | כל consumers חולקים diagnostic truth | בונה payloads in-process, בודק stripping, teacher/guardian/school report logic, וקצת source regex | fixtures + source reads | API/model | כן. לא UI/DB/PDF אמיתי | בינונית | E2E דרך routes אמיתיים עם auth ו־DB |
| `scripts/parent-report-diagnostic-evidence.mjs` | אבחון, volume, thin data, grade split | יחידות in-process על v2 units ו־base reports | synthetic fixtures | model | כן. לא מוכיח תצוגה גלויה | בינונית | בדיקת UI/PDF לאבחון והיעדר over-diagnosis |
| `scripts/parent-report-zero-evidence-policy.mjs` | מדיניות אפס נתונים | fixture math-only, copilot in-process, no-data wording | fixtures | model/copilot | כן. לא מוכיח UI/PDF בפועל | בינונית | E2E עם מקצוע 0 שאלות בדוח UI/PDF |
| `utils/parent-report-output-integrity/zero-evidence-policy-tests.js` | helper לאפס נתונים | פונקציות assertion בלבד | helper | model | כן. תלוי בשימוש נכון | בינונית | לכסות UI/PDF |
| `tests/parent-server/parent-assigned-activities.test.mjs` | פעילות אישית מהורה, הרשאות, aggregate inclusion | בודק parser, aggregation with parent attempts, mock Supabase, source regex, deny cases | mock DB + source reads | API/model | כן. אין parent/student אמיתי, אין UI מלא, אין DB אמיתי | בינונית | E2E: הורה יוצר פעילות, תלמיד פותר, דוח הורה כולל אותה |
| `tests/e2e/student-home-personal-activities.spec.ts` | תלמיד רואה פעילויות אישיות | login student אמיתי לפי env, GET `/api/student/activities`, tile/modal count | UI + API אמיתי לפי env | UI/API | כן. `test.skip(parentCount < 1)` מאפשר דילוג אם אין נתונים; לא פותר פעילות | בינונית | seed deterministic, פתיחת activity, answer flow, parent report impact |
| `tests/classroom-activities/assigned-activity-play-metadata.test.mjs` | metadata של פעילות משויכת | פונקציות enrich/prepare מסירות correctAnswer ומחזירות grade | fixtures | model | כן. לא UI/DB | בינונית-נמוכה | E2E start activity מהורה/מורה |
| `tests/classroom-activities/student-activity-resume.test.mjs` | resume attempts | פונקציות חישוב + source regex בדף | fixtures + source reads | model/source | כן. לא browser/DB אמיתי | נמוכה-בינונית | E2E: לענות, לרענן, לוודא read-only/resume |
| `tests/classroom-activities/student-activity-result-labels.test.mjs` | completion UI wording | פונקציות טקסט + סריקת source block | source + unit | UI source only | כן. לא מוכיח מסך גלוי | נמוכה | Playwright completion screen |
| `tests/teacher-activity-authorization.test.mjs` | grade authorization ו־validation | parser ו־normalization בלבד | unit fixture | model | כן. לא בודק הרשאות route אמיתיות | בינונית-נמוכה | API auth negative cases עם teacher/class אמיתיים |
| `tests/auth/*` | הרשאות וגבולות תפקידים | חלקן DB/service role, חלקן fixtures/mocks/source | מעורב | DB/API/model | כן, תלוי קובץ; לא בהכרח משפיע על דוח הורים | בינונית | מיפוי הרשאות שמשפיעות על נתוני דוח הורים |
| `tests/discussion-activity-permissions.test.mjs` ושאר discussion | הרשאות פעילות דיון | mock service role / unit flows | mock | API/model | כן. לא מוכיח UI או DB חי | בינונית-נמוכה | E2E עם תלמידים/מורה אמיתיים |
| `tests/learning/learning-time-credit.test.mjs` | זמן למידה מחושב לפי fairness policy | unit tests על tier, caps, visible/hidden, ledger | unit | model | כן. לא מוכיח browser visibility אמיתי או DB persistence | בינונית | E2E browser עם visibility + DB session rows |
| `scripts/verify-learning-time-credit.mjs` | foundation files ו־wiring | unit checks + source scans + מריץ node:test | unit/source | model/source | כן. source regex יכול לעבור בלי התנהגות runtime נכונה | בינונית-נמוכה | Playwright actual timing + DB |
| `scripts/qa/staging-e2e-learning-time-fairness.mjs` | E2E זמן למידה staging/local | login student, service role, browser, parent report fetch | מוצר אמיתי לפי env | UI/API/DB | כן. תלוי env ונתונים; צריך לבדוק assertions מלאים בזמן ריצה | גבוהה אם רץ במלואו | להפוך לחלק מגייט קבוע עם seed |
| `tests/learning/phase9-single-truth-progress.test.mjs` | progress/coins source of truth | unit/source reads על storage, coin formula, monthly minutes | unit + source | model/source | כן. coin formula נבדקת ב־regex, לא DB transactions | בינונית-נמוכה | E2E awarding, monthly persistence, parent visibility |
| `tests/learning/hebrew-g1-literacy-progress.test.mjs` | progress ספר עברית כיתה א | unit functions בלבד | unit | model | כן. לא UI/DB | בינונית-נמוכה | UI progress + persistence |
| `tests/classroom-activities/generate-*.test.mjs` | יצירת שאלות פעילות ומצב אין מספיק שאלות | adapters/validators מחזירים שגיאת "אין מספיק שאלות" במקצועות | unit/source | model | כן. לא בדקתי UI גלוי למצב אין שאלות; לא מוכיח parent modal | בינונית | E2E modal when subject has no available questions |
| `tests/e2e/demo-school-simulation-smoke.spec.ts` | demo school simulation UI smoke | Playwright עם login, API requests, school/teacher pages | מוצר אמיתי לפי env | UI/API | כן. תלוי סיסמאות/seed; skip אם חסר password; מתמקד בית ספר ולא הורה | בינונית-גבוהה | לקשור לדוח הורה ולכיתה אחרת |
| `scripts/school-portal/run-school-sim-nightly.mjs` | סימולציה יומית מלאה | preflight, DB sim, UI sample, report validation, artifacts | DB/UI לפי env | DB/UI/API | כן. יכול להיות `partial`; skip modes/reuse artifacts; לא נבדק אם UI/PDF parent equivalence | בינונית | hard fail על partial קריטי, parent report PDF checks |
| `scripts/school-portal/sim/run-selftest.mjs` | selftest לסימולציית בית ספר | חלק מהשלבים deferred; T7-T10 מסומנים deferred בלי הרצה | dry-run/artifacts | orchestration | כן. PASS חלקי/FAIL deferred לא מוכיח מוצר | נמוכה | selftest מלא עם credentials ו־UI |
| `scripts/backfill-activity-classification.mjs` | backfill classification | סקריפט production/staging; אין בדיקה ייעודית שקראה תוצאות DB אחרי הרצה | DB live אם מופעל | DB write script | כן. dry-run יכול לעבור בלי update אמיתי; לא נבדקו rollback/idempotency לעומק | נמוכה-בינונית | בדיקת dry-run + staging write + post-verify לפני deploy |
| `scripts/learning-simulator/run-orchestrator.mjs` | QA orchestrator רחב | מריץ הרבה npm scripts ומסכם artifacts | מעורב | מעורב | כן. איכות PASS תלויה בכל script; חלק הם mock/contracts/artifacts | בינונית | לסמן בכל step מה אמיתי ומה synthetic |
| `scripts/parent-report-learning-simulation-audit.mjs` | סימולציות דוח הורים עם PDFs | קורא `site-rendered-results.json`, בודק bodyText, expected behavior, links ל־PDF | artifacts existing | UI text artifact + PDF path presence | כן. `missing_pdf` בודק קיום path ב־result, לא בהכרח פותח PDF; לא DB אמיתי | בינונית | לפתוח PDF בפועל ולהשוות DOM |
| `tests/e2e/parent-dashboard-modal-mobile.spec.ts` | יציבות modal mobile להורה | login parent אמיתי אם env קיים, focus/value | UI אמיתי לפי env | UI | כן. לא קשור לאיכות דוח/נתונים | בינונית לנושא הספציפי | לא רלוונטי ל־PASS data |

## 5. רשימת false PASS risks

1. **PASS עם API mock במקום DB/API אמיתי** — `parent-report-real-ui-load.spec.ts` מיירט את report-data route ומחזיר fixture. זה מוכיח render shell, לא אמת נתונים.
2. **PASS עם empty-state** — באותה בדיקה `hasTable || hasEmptyState` נחשב תקין. דוח יכול לעבור גם אם אין נתונים מוצגים.
3. **PASS עם localStorage seeded במקום מוצר אמיתי** — `parent-report-browser-qa.mjs`, `qa-parent-pdf-export.mjs` וחלק מסקריפטי parent report מסתמכים על snapshots.
4. **PASS שמבוסס על source regex** — בדיקות רבות בודקות שהקוד מכיל import/regex/מחרוזת. שינוי התנהגות runtime יכול לשבור מוצר בלי לשבור בדיקה.
5. **PASS מתוך artifacts קיימים** — release/limited gates קוראים JSON/Markdown קיימים. לא מוכח שה־artifacts שייכים לקוד הנוכחי.
6. **PDF fallback** — helper `verifyPdfOrPrintOutput` יכול לעבור על print DOM fallback אם PDF parsing נכשל ואינו נדרש במפורש.
7. **PDF text regex חלש** — בדיקות דקות/שאלות ב־PDF משתמשות regex על טקסט מפוענח. אפשר לתפוס מספר לא נכון אם layout משתנה.
8. **ZIP verification חלקי** — ZIP נפתח באמת, אבל עומק הבדיקה אינו שווה בכל 36 הקבצים; short reports מקבלים יותר תשומת לב.
9. **DB staging אינו מוצר מלא** — סקריפטים מול Supabase service role מוכיחים aggregate, אבל לא auth/UI/PDF.
10. **skip בתנאי שאין נתונים** — `student-home-personal-activities.spec.ts` מדלג אם אין פעילות אישית. זה יכול להסתיר חוסר seed.
11. **simulation selftest עם deferred** — selftest של school sim מסמן שלבים מרכזיים deferred, ולכן אינו מוכיח UI/report מלא.
12. **לא מוכחת זהות UI/PDF** — קיימות בדיקות UI וקיימות בדיקות PDF, אך לא נמצאה בדיקה מלאה שמשווה אותו payload/אותו תלמיד/אותו טווח בין DOM visible text לבין PDF extracted text.
13. **לא מוכחת זרימת הורה-תלמיד מלאה** — לא נמצאה בדיקה שמתחילה בהורה יוצר פעילות, ממשיכה בתלמיד פותר, מסתיימת בדוח הורה/PDF שמציג את ההשפעה.
14. **כיתה אחרת נבדקת בעיקר כ־grade split fixture** — יש כיסוי טוב יחסית ל־contentGrade higher/lower בתוך report pipeline, אבל לא הוכחה מלאה של עבודה בכיתה אחרת דרך UI/DB אמיתי.
15. **מצב אין שאלות במקצוע נבדק בעיקר ברמת generator** — לא נבדק UI גלוי שבו הורה/מורה מנסה ליצור פעילות במקצוע בלי שאלות זמינות.
16. **`pdfExportChecked` אינו הוכחת PDF כשלעצמו** — ב־`scripts/parent-report-product-ui-binding-audit.mjs` השדה מסומן מתוך audit של SSR/static markup, ולכן gate שקורא אותו עלול לתת ביטחון מופרז לגבי PDF.
17. **nightly/simulation יכולים לדווח pass ללא הרצה מלאה** — קיימים idempotent skip, reuse artifacts, partial status וספי כשל שאינם שקולים ל־E2E hard fail.
18. **פעילות אישית יכולה לקבל ירוק בלי פעילות קיימת** — `tests/e2e/student-home-personal-activities.spec.ts` מדלג אם אין פעילות אישית קיימת, ולכן לא מוכיח יצירת פעילות הורה או פתרון תלמיד.
19. **פעילות עצמאית של תלמיד לא מוכחת עד DB/report** — חלק מבדיקות learning flows בודקות התקדמות UI עם session mocked, לא כתיבת `answers`/`learning_sessions` ולא השפעה בדוח.

## 6. בדיקות אמינות באמת

הבדיקות הבאות אמינות יחסית בתוך גבולותיהן:

- `scripts/qa/parent-report-q2e-monthly-realistic-zip-independent-verify.mjs` — פותח ZIP אמיתי וקורא PDFs מתוך ה־ZIP בלבד. אמין להוכחת קיום ותוכן header בסיסי של ZIP/PDF.
- `scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs` — פותח ZIP אמיתי, סופר PDFs, מפענח PDF text. אמין יחסית להוכחת artifact.
- `scripts/qa/parent-report-q2e-monthly-realistic-pdf-content-verify.mjs` — מפענח PDFs קיימים ובודק תוכן. אמין לתוכן PDF, לא ל־UI/DB.
- `scripts/qa-parent-pdf-export.mjs` — מייצר PDF אמיתי דרך Playwright ובודק טקסט מפוענח. אמין ל־PDF export flow עם fixture.
- `scripts/qa/parent-report-q2e-monthly-realistic-data-verify.mjs` — משתמש DB אמיתי לפי env ובודק parent/student/aggregate thresholds. אמין ל־DB aggregate.
- `scripts/parent-report-output-integrity.mjs` — חזק יחסית ל־row identity, חוזקות/חולשות, grade split, אפס נתונים, בתנאי שמבינים שזה fixture/in-process.
- `scripts/parent-report-zero-evidence-policy.mjs` — טוב למדיניות אפס נתונים במודל וב־Copilot in-process.
- `scripts/qa/staging-e2e-learning-time-fairness.mjs` — אם רץ עם env מלא, זו בדיקה חזקה יותר לזמן למידה כי היא משלבת browser, login, DB ו־parent report fetch.

## 7. בדיקות חלשות

- `tests/e2e/parent-report-real-ui-load.spec.ts` — שם "real UI" מטעה חלקית: API mocked, empty state עובר.
- `scripts/parent-report-release-gate.mjs` ו־`scripts/parent-report-limited-test-gate.mjs` — קוראים artifacts קיימים; לא מריצים הוכחה.
- `scripts/parent-report-product-ui-binding-audit.mjs` — SSR static markup בלבד; לא browser אמיתי.
- `scripts/parent-report-product-ui-binding-audit.mjs` — מסמן `pdfExportChecked: true` בלי להריץ export PDF אמיתי.
- `scripts/parent-report-rendered-product-snapshots.mjs` — snapshots מלאכותיים, לא מוצר.
- `tests/learning/phase9-single-truth-progress.test.mjs` — הרבה source regex; לא מוכיח awarding/persistence אמיתיים.
- `tests/e2e/active-diagnosis/learning-flows.spec.ts` — מוכיח UI progression מול session mocked, לא DB answers ולא השפעה אבחונית בדוח.
- `tests/classroom-activities/student-activity-result-labels.test.mjs` — סריקת source במקום UI גלוי.
- `tests/classroom-activities/student-activity-resume.test.mjs` — source regex + unit; לא מוכיח refresh/resume בדפדפן.
- `scripts/school-portal/sim/run-selftest.mjs` — שלבים מרכזיים deferred.
- `scripts/parent-report-learning-simulation-audit.mjs` — מסתמך על `site-rendered-results.json` ועל קישורי PDF, לא פותח PDFs בעצמו.

## 8. ממצאים לפי חומרה

### CRITICAL

1. **לא נמצאה הוכחה מלאה ש־UI הורה, API, DB ו־PDF מציגים אותו truth עבור אותו תלמיד/טווח.**  
   יש בדיקות לכל שכבה בנפרד, אבל לא בדיקת end-to-end אחת שמחברת parent login → DB report-data → UI visible text → PDF export → extracted PDF text.

2. **PASS של דוח הורים יכול להיות חלש או מטעה בגלל mocks/fixtures.**  
   הבדיקה בשם `parent-report-real-ui-load` משתמשת ב־mock API ומקבלת empty-state כהצלחה. זה לא מוכיח שהמוצר עובד להורה אמיתי.

3. **לא נמצאה בדיקה מלאה של פעילות שהורה שלח עד השפעה בדוח הורה/PDF.**  
   קיימות בדיקות server/unit ו־student tile, אך לא flow מלא: parent creates activity → student answers → parent report includes activity → PDF reflects it.

4. **חלק מגייטים שמדווחים על PDF אינם מריצים PDF אמיתי.**  
   `pdfExportChecked` יכול להגיע מ־audit SSR/static, ולכן אין להתייחס אליו כאל הוכחת PDF ללא `page.pdf()` ו־PDF text extraction בפועל.

### HIGH

1. **לא מוכחת זהות PDF מול UI.**  
   יש PDF parsing ויש DOM checks, אבל לא השוואה מלאה בין מה שהורה רואה במסך לבין מה שמופיע ב־PDF.

2. **Artifacts יכולים לייצר PASS בלי rerun אמיתי.**  
   release/limited gates קוראים JSON קיימים. ללא run id/checksum against current commit, PASS לא מוכיח מצב נוכחי.

3. **חלק מבדיקות PDF מאפשרות fallback או regex חלש.**  
   במקומות קריטיים צריך לדרוש PDF bytes ולהגדיר assertions עם מקור נתונים מפורש, לא רק טקסט כללי.

4. **מצב אין מספיק נתונים מכוסה במודל, אך לא מוכח מספיק ב־UI/PDF אמיתי.**  
   יש `zero-evidence` ו־thin data fixtures; הוכחת screen/PDF עבור הורה אמיתי לא נמצאה.

5. **כיתה אחרת מכוסה ב־pipeline fixtures, לא כזרימת מוצר מלאה.**  
   grade split/higher/lower נבדק היטב יחסית במודל, אך לא בהכרח דרך פעילות אמיתית של תלמיד ב־UI.

6. **הוכחת פעילות עצמאית של תלמיד חלשה ברמת DB/report.**  
   קיימות בדיקות UI progression ו־aggregate in-memory, אך לא נמצאה הוכחה קבועה שתרגול עצמאי בדפדפן יוצר `answers`/`learning_sessions` נכונים ומשפיע על דוח הורה/PDF.

### MEDIUM

1. **בדיקות progress/rewards מסתמכות על source regex/unit.**  
   לא מוכח ש־coins/monthly progress באמת נשמרים ומוצגים אחרי session אמיתי.

2. **בדיקות הרשאות קיימות, אך לא ממופות ישירות להשפעתן על נתוני דוח הורים.**  
   יש auth matrices ו־negative cases, אבל לא הוכחה שכל boundary מונע דליפת נתוני report.

3. **בדיקות אין שאלות במקצוע קיימות ב־generators, לא במסכי מוצר.**  
   לא נבדק שהורה/מורה רואה UI נכון כאשר אין שאלות זמינות במקצוע.

4. **סימולציות nightly/backfill לא מספיק מוכיחות PASS מוצרי.**  
   הן מועילות, אבל כוללות skip/reuse/deferred ודורשות פירוש זהיר.

### LOW

1. **בדיקות UI mobile modal קיימות אך לא קשורות לאיכות נתוני PASS.**
2. **חלק משמות הסקריפטים משתמשים במילים real/final/signoff למרות שהם fixture-based.**
3. **יש כפילות בין סקריפטים, review packages ו־staging copies שעלולה לטשטש מהו gate הרשמי.**

## 9. המלצות לשיפור בדיקות — ללא יישום

1. להוסיף gate אחד "truth E2E" שמריץ:
   parent login אמיתי → student אמיתי → DB seeded deterministic → `/api/parent/students/:id/report-data` → UI visible text → PDF export → PDF text extraction → השוואת שדות מרכזיים.

2. להפריד שמות PASS:
   - `MODEL_PASS`
   - `API_PASS`
   - `UI_PASS`
   - `PDF_PASS`
   - `DB_PASS`
   - `E2E_TRUTH_PASS`
   כך שלא יהיה PASS אחד שמרמז על יותר ממה שנבדק.

3. להפוך בדיקות artifact gates להרצה שמייצרת artifacts מחדש, או לפחות דורשת commit hash/run timestamp/checksum.

4. לדרוש `requirePdfBytes: true` בכל gate שמכריז על PDF.

5. להוסיף בדיקת UI/PDF equivalence:
   לא רק "PDF מכיל תובנה", אלא אותה רשימת מקצועות, שאלות, דקות, חוזקות, חולשות, no-data wording וטווח תאריכים.

6. להוסיף flow מלא לפעילות הורה:
   הורה יוצר פעילות → תלמיד רואה tile → תלמיד פותר → parent report כולל `includeParentActivities` → PDF כולל את התרומה או לא כולל אותה בהתאם לחוזה.

7. להוסיף בדיקות no-data/no-questions product-level:
   - אין מספיק נתונים בדוח.
   - אין שאלות במקצוע בעת יצירת פעילות.
   - מקצוע שלא תורגל בכלל.

8. להוסיף בדיקת תאריכים לכל המצבים:
   יום / שבוע / חודש / שנה / בחירה, גם API range וגם label ב־UI וגם label ב־PDF.

9. להוסיף תרחיש כיתה אחרת end-to-end:
   תלמיד רשום כיתה ד, עובד על חומר כיתה ג/ה, בודקים DB aggregate, UI, PDF, חוזקות/חולשות.

10. לחזק rewards/progress:
    בדיקת session אמיתי שמייצר coins/progress/monthly minutes, ואז אימות student home + parent report + DB transactions.

11. להוסיף gate עבור פעילות עצמאית של תלמיד:
    תלמיד מתחבר, פותר תרגול עצמאי, נבדקות שורות `learning_sessions` ו־`answers`, ואז נבדקים diagnostic output, rewards/progress ודוח הורה.

12. לסמן nightly/simulation כ־informational אם יש skip/reuse/partial:
    PASS מוצרי צריך לדרוש run מלא ללא `--skip-*`, ללא idempotent reuse, וללא partial status.

## 10. שאלות פתוחות לבעלים

1. מהו ה־gate הרשמי שמותר לקרוא לו "המוצר עובד"?
2. האם `parent-report-real-ui-load` אמור להיחשב E2E אמיתי למרות שה־API mocked?
3. האם `empty-state` בדוח הורים אמור להיחשב PASS ב־real UI load?
4. האם release/limited gates אמורים להריץ מחדש את הבדיקות או רק לקרוא artifacts קיימים?
5. האם דוח PDF חייב להיות זהה ל־UI או רק עקבי ברמת שדות מרכזיים?
6. מה ה־source of truth הרשמי לזמן למידה בדוח הורים: `learning_sessions.duration_seconds`, credited ledger, או derived profile?
7. האם פעילות שהורה שלח אמורה להשפיע על חוזקות/חולשות, או רק על summary counts?
8. האם עבודה בכיתה אחרת צריכה להופיע כחוזקה/אתגר/העשרה בדוח הורים, ומה wording התקין?
9. האם "אין שאלות במקצוע" הוא מצב UI שחייב להיחסם מראש או מצב runtime שמציג הודעה?
10. האם nightly/simulation PASS נחשב release signal או רק informational?

## סיכום

לא מוכח שה־PASS הנוכחי במערכת שווה "המוצר עובד end-to-end". קיימות בדיקות אמינות בחלקים מסוימים, במיוחד פתיחת ZIP/PDF אמיתי ו־DB aggregate בסקריפטים ייעודיים, אך אין הוכחה אחת שמחברת את כל השרשרת שהורה באמת חווה: נתוני DB אמיתיים, הרשאות, UI גלוי, PDF אמיתי, פעילות מהורה, תאריכים, no-data, חוזקות/חולשות וכיתה אחרת.

לכן המשמעות הנכונה של PASS כיום היא חלקית ותלויה בקובץ: בחלק מהמקומות PASS מוכיח artifact אמיתי, ובחלק מהמקומות PASS מוכיח רק fixture, mock, source regex או artifact ישן. אין להכריז PASS מוצרי מלא בלי הוכחת E2E נוספת.

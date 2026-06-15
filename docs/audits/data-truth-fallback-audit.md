# Data Truth / Fallback Audit

תאריך: 2026-06-15  
סוג: Audit read-only בלבד  
סטטוס: לא בוצעו תיקונים, לא נוצרו בדיקות, לא הורצו migrations, לא בוצע commit / push.

## 1. Scope — מה נבדק

נבדקו מסלולי מוצר שבהם הורה או תלמיד עלולים לראות נתון כאילו הוא נתון אמת, למרות שהוא מגיע מ-fallback, mock/demo/seed, localStorage, ערך default, חישוב חלקי או מצב חסר.

נבדקו בפועל:

- דוח הורים קצר ומפורט: `pages/learning/parent-report.js`, `pages/learning/parent-report-detailed.js`.
- מנוע דוח הורים ו-detailed report: `utils/parent-report-v2.js`, `utils/detailed-parent-report.js`, מודולי `utils/parent-report-*`.
- API דוח הורים: `pages/api/parent/students/[studentId]/report-data.js`.
- שכבת aggregation לדוח הורים: `lib/parent-server/report-data-aggregate.server.js`.
- bridge מ-API ל-engine מבוסס localStorage מבודד: `lib/learning-supabase/parent-report-from-api-payload.js`, `lib/learning-supabase/seed-db-report-local-storage.js`, `lib/learning-supabase/report-data-adapter.js`.
- student home dashboard: `pages/student/home.js`, `lib/learning-client/studentHomeDashboardClient.js`.
- student subject dashboard/progress model: `lib/learning-shared/student-subject-dashboard-view.js`, `lib/learning-client/student-dashboard-account-tiles.js`.
- APIs של תלמיד: `pages/api/student/home-profile.js`, `pages/api/student/learning-profile.js`.
- localStorage במסלולי למידה: `pages/learning/*-master.js`, `utils/progress-storage.js`, `lib/learning-student-local-sync.js`.
- PDF/print של דוחות הורים: print CSS ו-`window.print()` במסמכי דוח הורים.
- scripts שיכולים להשפיע על אמת נתונים: `scripts/backfill-activity-classification.mjs`, seed/demo/nightly/simulation scripts תחת `scripts/qa`, `scripts/school-portal`, `scripts/teacher-portal`.
- בדיקות קיימות לפי שמות וקבצים רלוונטיים תחת `tests/**` ו-`scripts/tests/**`.

לא נבדק לעומק:

- כל `review-packages/**`; זוהו כפול/סטייג'ינג ולא נחשב מקור runtime ראשי, אלא אם runtime מייבא ממנו. לא נמצא ייבוא runtime ראשי בבדיקה זו.
- כל UI component משני שמציג רק shell ללא metric. נבדק רק כאשר הוא חלק ממסלול נתונים.
- השוואת runtime אמיתית מול DB חי. לא הורצו בדיקות end-to-end או שאילתות DB.
- כל test file במלואו. זוהו בדיקות רלוונטיות לפי שמות, ייבוא, ותיאור, אך לא הורצו.

## 2. קבצים/מודולים שנבדקו

קבצי מוצר מרכזיים:

- `pages/learning/parent-report.js`
- `pages/learning/parent-report-detailed.js`
- `pages/student/home.js`
- `pages/api/parent/students/[studentId]/report-data.js`
- `pages/api/student/home-profile.js`
- `pages/api/student/learning-profile.js`
- `lib/parent-server/report-data-aggregate.server.js`
- `lib/parent-server/parent-facing-report-authority.js`
- `lib/parent-server/parent-report-parent-facing.server.js`
- `lib/parent-server/report-duration-sanity.js`
- `lib/learning-supabase/parent-report-from-api-payload.js`
- `lib/learning-supabase/seed-db-report-local-storage.js`
- `lib/learning-supabase/report-data-adapter.js`
- `lib/learning-supabase/student-learning-profile.server.js`
- `lib/learning-shared/student-account-state-view.js`
- `lib/learning-shared/student-subject-dashboard-view.js`
- `lib/learning-client/studentHomeDashboardClient.js`
- `lib/learning-client/dailyMissionsView.js`
- `lib/learning-client/student-dashboard-account-tiles.js`
- `lib/learning-client/studentLearningProfileClient.js`
- `lib/learning-student-local-sync.js`
- `utils/parent-report-v2.js`
- `utils/detailed-parent-report.js`
- `utils/parent-report-recommendation-consistency.js`
- `utils/parent-report-language/grade-aware-recommendation-templates.js`
- `utils/parent-copilot/truth-packet-v1.js`
- `utils/parent-copilot/fallback-templates.js`
- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `pages/learning/science-master.js`
- `pages/learning/english-master.js`
- `pages/learning/hebrew-master.js`
- `pages/learning/moledet-geography-master.js`

קבצי בדיקות/סקריפטים שזוהו כרלוונטיים:

- `tests/learning/phase9-single-truth-progress.test.mjs`
- `tests/learning/evidence-quality-layer.test.mjs`
- `tests/learning/phase4-aggregate-filter.test.mjs`
- `tests/learning/phase5-book-tracking.test.mjs`
- `tests/learning/phase7-positive-evidence.test.mjs`
- `tests/learning/phase8-mcq-engine-contract.test.mjs`
- `tests/parent-server/parent-assigned-activities.test.mjs`
- `tests/reports/diagnostic-truth-consumer-verification.test.mjs`
- `tests/e2e/parent-report-real-ui-load.spec.ts`
- `scripts/tests/report-synchronization-closure.mjs`
- `scripts/parent-report-activity-time-selftest.mjs`
- `scripts/parent-report-grade-aware-recommendation-selftest.mjs`
- `scripts/parent-report-grade-aware-phase6b-copilot-grounding-verify.mjs`
- `scripts/parent-report-grade-aware-phase6c-grounding-edge-audit.mjs`
- `scripts/verify-israel-monthly-display.mjs`
- `scripts/verify-phase2-missions.mjs`
- `scripts/verify-student-dashboard-view.mjs`
- `scripts/shadow-compare-report-data.mjs`
- `scripts/shadow-compare-real-browser-report-data.mjs`
- `scripts/backfill-activity-classification.mjs`
- `scripts/help-center/seed-demo-report-data.mjs`
- `scripts/school-portal/run-school-nightly-simulation.mjs`
- `scripts/school-portal/run-school-sim-nightly.mjs`

## 3. מפת זרימת נתונים כללית

### 3.1 דוח הורים — שני מסלולי אמת חיים

1. Parent dashboard / teacher source:
   - `pages/parent/dashboard.js` או teacher flow מפנים ל-`/learning/parent-report?studentId=...&source=parent|teacher`.
   - `pages/learning/parent-report.js` מזהה `source=parent|teacher`.
   - נשלחת בקשת API ל-`/api/parent/students/[studentId]/report-data` או teacher equivalent.
   - `aggregateParentReportPayload()` קורא Supabase: `learning_sessions`, `answers`, parent activity attempts, book tracking, ו-student profile.
   - payload מועשר ב-`accountSnapshot` וב-`parentFacing`.
   - `runParentReportGenerationFromApiBody()` בונה report דרך bridge.
   - bridge יוצר `Map` מבודד עם מפתחות `mleo_*` דרך `seedLocalStorageFromDbReportInput()`.
   - `generateParentReportV2()` ו-`generateDetailedParentReport()` קוראים את השימור הזה כאילו היה localStorage.
   - UI מציג את ה-report.

2. Local student report path:
   - כניסה ישירה ל-`/learning/parent-report` או `/learning/parent-report-detailed` בלי `source=parent|teacher`.
   - הדף קורא `localStorage.getItem("mleo_player_name")`.
   - אם יש שם, הדוח נבנה ישירות מ-`generateParentReportV2()` / detailed report על גבי `mleo_*` אמיתי בדפדפן.
   - אין קריאת Supabase במסלול זה.

מסקנה: יש שני מקורות אמת חיים לאותו מוצר דוח. מסלול localStorage הוא סיכון אמת נתונים גבוה/קריטי כי הוא תלוי במכשיר, זהות בדפדפן, ושאריות legacy.

### 3.2 Dashboard תלמיד

1. `pages/student/home.js` קורא `/api/student/me` ו-`/api/student/home-profile`.
2. `pages/api/student/home-profile.js`:
   - מאמת session תלמיד.
   - קורא `student_learning_state`.
   - מריץ `computeStudentLearningDerived()` על `answers` ו-`learning_sessions`.
   - בונה `accountSnapshot` מ-`student_learning_state`.
   - מנסה `ensureDailyMissionsInDb()`; כשל לא מפיל את הדף אלא משאיר challenges קיימים.
3. `buildStudentHomeView()` מחשב display model:
   - דיוק, שאלות וזמן מ-`derived`.
   - רמה/כוכבים/XP/score/streak מ-`accountSnapshot`/`student_learning_state`.
   - המלצות dashboard נבנות heuristic לפי subject עם הכי הרבה פעילות.
   - Daily missions נבנות מ-`challenges.daily`.

### 3.3 Dashboard מקצוע / התקדמות יומית-שבועית

1. מסכי `*-master.js` משתמשים ב-`/api/student/learning-profile`.
2. `pages/api/student/learning-profile.js` מחזיר:
   - `row.subjects`, `monthly`, `challenges`, `streaks`, `achievements`, `profile`.
   - `derived` מחושב מ-DB.
   - `monthlyPersistenceStatus`.
3. `buildStudentSubjectDashboardView()` בונה HUD/tiles:
   - HUD משתמש ב-current run אם משחק פעיל, אחרת lifetime/server-derived.
   - daily/weekly challenge ממוזגים מ-server profile + React live state.
   - קיימת reconciliation שמסיקה correct מתוך questions או accountAccuracy במצבים מסוימים.

### 3.4 PDF export

לא נמצא API export server-side לדוח הורים. PDF הוא למעשה print של אותו report שכבר נמצא ב-state:

- Short report: CSS תחת `#parent-report-pdf` ו-`@media print`.
- Detailed report: `window.print()` דרך `printWithMode()`.
- AI explanation מקבל baseline deterministic לפני enrich async. לכן PDF יכול להכיל גרסת baseline בזמן שהמסך כבר עשוי להתעדכן בהמשך.

### 3.5 סימולציות / nightly / backfill

- `scripts/backfill-activity-classification.mjs` יכול לשנות classification בתוך `answers.answer_payload`; אם מופעל מול production הוא משפיע על אמת diagnostic.
- seed/demo/nightly school scripts יוצרים פעילות demo. הסיכון תלוי אם הם רצים מול DB משותף/production. לא מוכח שהם חסומים בכל נתיב.
- QA parent-report seed scripts יכולים להכניס fixtures ל-DB. לא נבדק runtime מלא של guard סביב כל script.

## 4. טבלת מקורות/שדות/fallbacks

| Source | Field / metric | איפה הוא מחושב | איפה הוא מוצג | מקור אמת | fallback קיים? | האם fallback מסוכן? | האם יש בדיקה? | רמת סיכון | המלצה בלי ליישם |
|---|---|---|---|---|---|---|---|---|---|
| Parent report local path | כל נתוני דוח הורה: שאלות, הצלחה, זמן, חוזקות, חולשות, המלצות | `generateParentReportV2()` דרך `buildLocalParentReports()` | `pages/learning/parent-report.js`, `parent-report-detailed.js` | `localStorage` מפתחות `mleo_*` | כן, כל המסלול מבוסס localStorage אם אין `source=parent|teacher` | כן. נתוני מכשיר/ילד אחר/שאריות יכולים להיראות כאמת | אין בדיקה שמוכיחה parity מול DB. לא מוכח | CRITICAL | להגדיר ownership ברור למסלול local report או להציג provenance/חסימה; לא ליישם במסגרת audit |
| Parent report API path | שאלות/נכונות/אחוזי הצלחה לפי topic/subject | `aggregateParentReportPayload()` ואז bridge ל-V2 | short/detailed report | Supabase `answers`, `learning_sessions`, parent attempts | כן, bridge מייצר localStorage shim | בינוני-גבוה: הנתון המקורי DB אך עובר טרנספורמציה שנייה | יש בדיקות aggregation, לא מוכח parity UI מלא | HIGH | להוסיף parity gate בין API payload לבין render report |
| Parent report API bridge | זמן למידה / duration | `seedLocalStorageFromDbReportInput()` עם `estimatePracticeDurationSeconds()` ו-`sanitizeReportDurationSeconds()` | summary cards, charts, detailed snapshots | `durationSeconds` ב-DB או sessions | כן, אם חסר duration: הערכת זמן לפי מספר תשובות | כן. הורה עשוי לראות דקות משוערות כאמת | בדיקות duration חלקיות בלבד; לא מוכח דיוק | HIGH | לסמן estimated duration או למנוע הצגה כאמת |
| Parent report API bridge | activity timestamp / latest activity | `seedLocalStorageFromDbReportInput()` | trend/order/last activity layers | timestamps ב-DB | כן, `range.to` סוף יום אם timestamp חסר | כן, עלול לייצר סדר/טרנד פעילות לא אמיתי | יש `parent-report-activity-time-selftest`, לא מוכח UI parity | MEDIUM | להפריד latest real vs fallback timestamp |
| Parent report API bridge | level/mode | `seedLocalStorageFromDbReportInput()` | diagnostic context/row labels | `modeCounts`, `levelCounts`, metadata | כן, mode=`learning`, level=`medium` כשחסר | בינוני. עלול לשייך תרגול לרמה/מצב לא ידועים | חלקי בלבד | MEDIUM | להציג unknown במקום default כאשר חסר |
| Parent report API bridge | content grade/session grade | `seedLocalStorageFromDbReportInput()` | grade split notes, mixed-grade narratives | content grade / registered grade | כן, `registeredGrade` או `"unknown"` | כן אם עבודה בכיתה אחרת מתערבבת או מתויגת לפי רשום | יש grade selftests, לא מוכח לכל UI | HIGH | להקשיח provenance grade per row |
| Parent report API | parent-assigned activity attempts | `fetchParentActivityAttemptsInRange()` | מתמזג ל-topic totals/report | `parent_activity_attempts` | כן, schema missing/column missing מחזיר `[]` | כן. פעילות אישית מהורה יכולה להיעלם בלי error גלוי | `parent-assigned-activities.test.mjs`, לא מוכח UI provenance | HIGH | להחזיר warning/data health ולא silent empty |
| Parent report API | book reading / learning book minutes | `fetchBookPageVisitsInRange()`, `fetchBookReadingSessionsInRange()` | aggregate/report context, לא תמיד ב-diagnostic Q/time | book tracking tables | כן, feature off/table missing מחזיר `[]` | בינוני. תלמיד יכול לקרוא ספר ולא להיראות פעיל | `phase5-book-tracking.test.mjs`, לא מוכח UI מלא | MEDIUM | להציג "book data unavailable" או provenance |
| Parent report API | date range | `buildDefaultRange()` | report period | query `from/to` או default | כן, default 30 days ב-API; UI week/month/custom/day | נמוך-בינוני אם המשתמש לא מודע לטווח | לא מוכח בכל כניסה | LOW | להציג תמיד range מדויק |
| Parent report API | fallback date field | `fetchSessionsInRange()`, `fetchAnswersInRange()` | all report metrics | `started_at` / `answered_at` | כן, missing column fallback ל-`created_at`; `meta.fallbackUsed` | בינוני: set rows יכול להשתנות | phase4 חלקי, לא מוכח operational warning | MEDIUM | לחשוף `fallbackUsed` ב-data health פנימי/הורה |
| Parent report diagnostics | diagnostic overview/cards | `buildParentReportDiagnosticsView()`, V2/detailed | short report diagnostic area | engine diagnostics | כן, legacy `patternDiagnostics` fallback כאשר אין source | כן במסלול local/legacy; מסקנות יכולות להיראות אבחוניות | קיימות zero-evidence/evidence-quality בדיקות, לא לכל fallback | HIGH | להפריד legacy diagnostic display ולסמן confidence |
| Parent report parentFacing | מה לשים לב / המלצות בית | `enrichPayloadWithParentFacing()`, `buildParentInsightsHe()` | parent sections | server deterministic heuristics על aggregate | כן, generic lines כאשר חסר | בינוני. המלצה יכולה להיראות ספציפית מדי אם הנתונים דלים | `evidence-quality-layer.test.mjs`, לא מוכח לכל שילוב | MEDIUM | לחייב threshold/provenance לכל insight |
| Parent report grade-aware recommendations | action/recommendation text | `resolveGradeAwareParentRecommendationHe()`, templates | home plan/diagnostic cards | canonical state + taxonomy | כן, engine fallback כאשר template null | בינוני. fallback יכול לייצר המלצה בלי template מאושר | selftest קיים ומוכיח fallback path, לא בהכרח בטיחות מוצר | MEDIUM | להוסיף gating לפי evidence + approved copy |
| Parent report strengths | raw metric strengths | `utils/parent-report-v2.js` | short report strip/detailed | summary counts | כן, מחושב heuristic גם כשאין אבחון עמוק | בינוני. "חוזקה" יכולה להיות volume/accuracy בלבד | לא מוכח | MEDIUM | לסמן "מבוסס מדדים" ולא "אבחון" |
| Parent report weaknesses | focus areas / needs practice | V2/detailed report | report UI/PDF | wrong/correct counts + diagnostics | כן, fallbacks מ-summary/legacy | כן אם מעט שאלות הופכות למסקנה | zero-evidence מוכיח חלקית; לא מוכח מספיק | HIGH | לדרוש min questions/min diagnostic evidence |
| Parent report no data | totalQuestions/totalTime zero | UI empty-state | report summary | 0 מחישוב | כן, parse failures/local empty עלולים להפוך ל-0 | בינוני. חסר נתונים נראה "אין פעילות" ולא כשל טעינה | לא מוכח distinction | MEDIUM | להפריד "אין נתונים" מ-"כשל/חסר מקור" |
| PDF / print | כל metric בדוח מודפס | same report state + print CSS | PDF/print | אותו state במסך | כן, baseline deterministic AI לפני async enrich | בינוני. PDF יכול להיות שונה מהמסך אחרי enrich | לא מוכח parity PDF vs UI | MEDIUM | להוסיף בדיקת print snapshot/parity |
| Student home | שאלות, נכונות, דקות חודש, דקות מצטברות | `buildStudentHomeView()` | `StatsSection` | `/api/student/home-profile` derived מ-DB | כן, `n()` הופך missing ל-0 | בינוני אם payload חלקי; כשל API מלא מסתיר stats, וזה טוב | `phase9-single-truth-progress.test.mjs` חלקי | MEDIUM | לשמר null כאשר שדה חסר במקום 0 |
| Student home | overall accuracy | `buildStudentHomeView()` | Stats/subject cards | `answers` + accountSnapshot | כן, subject accuracy יכול להיות null/derived; home מציג label דרך accLabel | נמוך-בינוני, תלוי label | חלקי | MEDIUM | לבדוק שכל null מוצג כ"עדיין אין נתונים" |
| Student home | subject progress bar | `progressIndicatorPct` | subject cards | accuracy או answers count | כן, אם יש answers ואין accuracy מוצג 8% | כן. 8% הוא decorative, עלול להיראות progress אמיתי | אין | MEDIUM | להחליף ב-unknown/empty או לסמן decorative |
| Student home | recommendations | `buildStudentHomeView()` | recommendations panel | subject with max answers | כן, recommendation כללית גם כאשר topAnswers=0 | נמוך-בינוני. לא אבחוני, אך נראה כהמלצה | אין | LOW | להבדיל "המשך" מ"המלצה מבוססת נתונים" |
| Student home | daily missions | `buildDailyMissionsView()` | missions panel/tile | `student_learning_state.challenges.daily` | כן, mismatch date/empty => null; rewardCoins default 20 | בינוני. UI יכול להציג 0/0 או reward default | `verify-phase2-missions.mjs`, לא מוכח UI מלא | MEDIUM | להציג "לא נטען" במקום 0/0 |
| Student home | monthly persistence tiers | `buildStudentHomeView()` | monthly panels | `learning_sessions` monthly minutes | כן, tiers static; home לא מוכיח payout status | בינוני: completed by minutes לא בהכרח awarded | `verify-israel-monthly-display.mjs` חלקי | MEDIUM | להציג awarded/eligible בנפרד |
| Student home | coins | `/api/student/me`, session context | hero/stats | DB coin balance | כן, initial state 0 עד טעינה | בינוני אם 0 מוצג לפני resolved | לא מוכח | MEDIUM | לא להציג coin count עד resolved |
| Student home | avatar | profile + legacy localStorage fallback | hero/profile | server profile | כן, `mleo_player_avatar`/image fallback במסלולים מסוימים | בינוני: אווטר של ילד אחר/ישן | אין | MEDIUM | להסיר fallback או להגביל לפי studentId |
| Student home | worksheets count | `dashboardSubtitles` | dashboard tile | worksheet API panel | כן, subtitle hardcoded 0 לפי audit | כן, יכול להציג 0 גם כשיש דפי עבודה | אין | MEDIUM | לקשור subtitle ל-API או להציג "פתיחה" |
| Subject dashboard | daily questions/correct | `mergeChallengeBlobForDisplay()`, `reconcileDailyChallengeForDisplay()` | subject challenge modal/tiles | server profile + React live | כן, max(server, liveReact), implied correct לפי questions/accuracy | כן. מספר יומי יכול להיות inferred או pre-PATCH | לא נמצא unit test ספציפי | HIGH | להציג מקור/מצב pending ולא למזג כעובדה |
| Subject dashboard | weekly progress | `pickSubjectChallengeBlobs()` + merge | subject tiles/modal | `challenges.weekly` | כן, global fallback ו-target default 100 | כן, נתון ממקצוע אחר או יעד default | אין | HIGH | לא להשתמש global fallback ללא label |
| Subject dashboard | accuracy tile | `middleAccuracyPct` | subject middle tiles | accountAccuracyPct | כן, null => 0 | כן. unknown הופך ל-0% | אין | HIGH | להציג "אין נתונים" במקום 0% |
| Subject dashboard | HUD correct | `buildStudentSubjectDashboardView()` | learning HUD | current run או lifetime correct | כן, כאשר game לא פעיל מוצג lifetime correct | בינוני: label "נכון" לא בהכרח session | חלקי | MEDIUM | להפריד "נכון בסשן" מ"נכון סהכ" |
| Subject dashboard | best score/streak | `mapSubjectAccountView`, max across scoresStore | middle tiles/HUD | `student_learning_state.subjects.*.scoresStore` | כן, subject-wide across grade/level/topic; React floor | בינוני. עבודה בכיתה אחרת/רמה אחרת מתערבבת | `verify-student-dashboard-view.mjs` חלקי | MEDIUM | להציג scope או לסנן לפי grade/level |
| Subject dashboard | daily date key | `getTodayKey()` ב-`*-master.js` | reset daily challenge | browser local date | כן, local timezone ו-0-index month בקטעים שנבדקו | כן, mismatch מול Israel date ב-missions | לא מוכח | HIGH | להשתמש helper אחיד `getTodayIsraelDateString()` |
| Student learning-profile API | `row.subjects`, challenges, streaks, achievements | PATCH/POST deep merge | all subject dashboards/home | `student_learning_state` | כן, client-writable JSONB אחרי sanitize | בינוני-גבוה לגמיפיקציה ו-streak | phase9 חלקי | HIGH | להפריד derived truth מ-client state |
| Student learning-profile API | monthlyPersistenceStatus | `evaluateMonthlyPersistenceReward()` | subject monthly panels | server reward eval | כן, catch => null | בינוני. eligibility יכולה להיעלם בלי שגיאה | חלקי | MEDIUM | להחזיר data health status |
| Self-selected activities | grade/level/subject selection | `useResolvedStudentSession`, `*-master.js` | subject practice pages/HUD | student session + user choice | כן, grade hint localStorage בזמן טעינה; user יכול לבחור grade אחר | כן אם dashboard aggregates לא grade-scoped | `resolve-student-session-view` חלקי | HIGH | להציג "תרגול בכיתה X" ולפצל reports לפי contentGrade |
| Parent assigned activities | activity scope | classroom activity APIs + report aggregation | dashboard/report totals | DB assignment/attempts | כן, אם table missing empty; UI provenance לא תמיד מוצג | כן, פעילות מהורה נבלעת בכלל שאלות | `parent-assigned-activities.test.mjs`, לא UI | HIGH | להציג מקור פעילות בשורות report |
| localStorage legacy masters | scores/progress/mistakes/intel/leaderboard | `pages/learning/*-master.js` | leaderboard, mistakes practice, local report | browser localStorage | כן, keys `mleo_*` עדיין נקראים/נכתבים | כן במסלולי display מסוימים וב-local report | phase9 מוכיח חלק מסוים בלבד | HIGH | inventory + kill switch למסלולי display |
| localStorage progress cache | `LEO_MONTHLY_PROGRESS`, `LEO_PROGRESS_LOG` | `utils/progress-storage.js` | לא אמור להיות authoritative | server sync/cache | כן, legacy cache | נמוך אם לא מוצג ישירות | phase9 חלקי | LOW | לשמר כ-cache בלבד ולתעד |
| Copilot parent | answer grounding | `pages/api/parent/copilot-turn.js`, `truth-packet-v1.js` | parent copilot panel | server rebuild / detailed payload | כן, fallback templates on validation fail | בינוני אם fallback answer נראה grounded | grade-aware grounding selftests חלקיים | MEDIUM | להציג confidence/source in answer contract |
| Backfill | activity classification | `scripts/backfill-activity-classification.mjs` | משפיע על diagnostic report אחרי ריצה | `answers.answer_payload` | כן, dry-run תלוי הרצה; לא runtime UI | קריטי אם מופעל על prod בטעות | לא מוכח guard מלא | CRITICAL | להוסיף production hard stop/approval, לא במסגרת audit |
| Demo/seed/nightly | synthetic activity | seed/sim scripts | DB אם מכוון לסביבת אמת | demo fixtures | כן, scripts יוצרים נתונים | גבוה אם DB משותף/production | demo smoke חלקי | HIGH | לוודא tenant/demo isolation ו-prod block |

## 5. ממצאים לפי חומרה

### CRITICAL

1. דוח הורים במסלול localStorage עדיין חי.
   - הוכחה בקוד: `pages/learning/parent-report.js` קורא `localStorage.getItem("mleo_player_name")` ומריץ `buildLocalParentReports()` כאשר אין `source=parent|teacher`; `parent-report-detailed.js` עושה אותו דבר.
   - השפעה: הורה/תלמיד יכולים לראות דוח שנבנה מנתוני דפדפן ולא מ-DB. במכשיר משותף, session ישן, או sync חסר, נתונים יוצגו כאמת.
   - בדיקה מוכיחה: לא נמצאה. לא מוכח parity מול DB.

2. `scripts/backfill-activity-classification.mjs` יכול לשנות אמת diagnostic אם מורץ על DB אמיתי.
   - השפעה: classification בתוך `answers.answer_payload` משפיע על האם תשובה נחשבת diagnostic/competitive/unclassified.
   - בדיקה מוכיחה guard מלא על production: לא נמצאה. לא מוכח.

### HIGH

1. API parent report עובר דרך localStorage shim שמייצר timestamps, duration, mode, level, grade defaults.
   - הוכחה בקוד: `seedLocalStorageFromDbReportInput()` משתמש ב-`estimatePracticeDurationSeconds()`, default `learning`, default `medium`, `registeredGrade || "unknown"`, ו-`rangeEndMs` כ-timestamp fallback.
   - השפעה: DB הוא מקור, אבל UI עלול להציג נתונים מחושבים/מוערכים כאמת.

2. פעילות אישית מהורה יכולה להיעלם בשקט.
   - הוכחה בקוד: `fetchParentActivityAttemptsInRange()` מחזיר `rows: []` כאשר schema/table/column missing.
   - השפעה: דוח אמיתי עלול לא לכלול פעילויות שהורה שלח, בלי data health גלוי.

3. subject dashboard מציג daily/weekly progress אחרי merge/reconcile.
   - הוכחה בקוד: `mergeChallengeBlobForDisplay()` לוקח `Math.max(server, liveReact)`, ו-`reconcileDailyChallengeForDisplay()` יכול להסיק `correctToday`.
   - השפעה: daily progress יכול להיות inferred או pending ולא מדידת DB נקייה.

4. accuracy null הופך ל-0% במסלול subject dashboard.
   - הוכחה בקוד: `middleAccuracyPct = accountAccuracyPct != null ? accountAccuracyPct : 0`.
   - השפעה: אין נתונים יכול להיראות ככישלון אמיתי.

5. grade/level/subject mismatch לא מופרד מספיק ב-dashboard.
   - תלמיד יכול לבחור grade/level/subject שונים, אבל home/HUD totals הם בעיקר per subject/lifetime ולא תמיד grade scoped.
   - לא מוכח שכל UI מסמן contentGrade מול registeredGrade.

6. localStorage legacy עדיין משפיע על display במסלולי למידה.
   - דוגמאות: avatar, leaderboard, mistakes practice, local parent report.
   - בדיקות phase9 מוכיחות חלק מהסרת authoritative progress, לא מוכיחות שכל display נקי.

7. demo/seed scripts יכולים לזהם DB אם מופעלים מול סביבה לא נכונה.
   - לא מוכח guard מלא לכל script.

### MEDIUM

1. default 0 במספר שאלות/דקות/כוכבים/מטבעות במספר view models.
   - `n()` ב-`buildStudentHomeView()` מחזיר 0 לחסר.
   - `summaryLevel || 1`, `stars || 0`, `coinBalance` initial 0.
   - בחלק מהמקרים זה תקין כ-empty state, אך לא תמיד מובחן מחסר נתונים.

2. PDF אינו export עצמאי אלא print של state.
   - עלול לכלול deterministic AI baseline אם async enrich לא הסתיים.
   - לא מוכח parity בין PDF לבין UI לאחר enrich.

3. book reading יכול להיעלם כאשר feature/tables לא זמינים.
   - `fetchBookPageVisitsInRange()` ו-`fetchBookReadingSessionsInRange()` מחזירים empty rows במצבי schema/feature.

4. parentFacing server insights ו-client diagnostics הם שתי סמכויות שונות.
   - server authority מדכא חלק מהדיאגנוסטיקה במצבי thin data, אבל detailed/contract/legacy עדיין עשויים להציג משטחים אחרים.
   - לא מוכח שכל משטח UI מיושר.

5. recommendations בדשבורד תלמיד הן heuristic לפי פעילות ולא אבחון.
   - למשל "תרגול מומלץ" לפי המקצוע עם הכי הרבה פעילות.
   - לא בהכרח מסוכן, אבל צריך provenance.

6. daily missions rewardCoins default 20.
   - אם `rewardCoins` חסר, UI יקבל 20. זה default מוצג כערך מוצר.

7. worksheets tile subtitle hardcoded 0 לפי audit.
   - אם panel fetch מציג דפים אמיתיים, tile עלול להציג 0.

### LOW

1. API default range ל-30 יום כאשר אין `from/to`.
   - סיכון נמוך אם UI מציג range. לא מוכח בכל מקום.

2. `formatMode` / unavailable labels מסוג "לא זמין".
   - fallback יחסית בטוח כי הוא מסמן חסר.

3. `LEO_MONTHLY_PROGRESS` מוגדר cache/legacy ולא נמצא כמקור display ראשי.
   - עדיין צריך לוודא שלא חוזר למסלול מוצר בעתיד.

## 6. בדיקות קיימות שמוכיחות את זה באמת

הערה: הבדיקות לא הורצו במסגרת audit זה. הסעיף מתאר מה נראה שהבדיקות מוכיחות לפי קבצים/שמות/שימושים. תוצאה בפועל: לא מוכח עד הרצה.

- `tests/learning/phase9-single-truth-progress.test.mjs`
  - מוכיח חלקית ש-progress חודשי/home נשען על server-derived ולא על legacy progress cache.
  - מוכיח חלקית ש-LEO keys אינם authoritative במסלולים מסוימים.
  - לא מוכיח דוח הורים localStorage מול DB.

- `tests/learning/evidence-quality-layer.test.mjs`
  - מוכיח חלקית zero/thin evidence gating ו-server parentFacing authority.
  - לא מוכיח שכל UI surface בדוח הורים משתמש באותו authority.

- `tests/learning/phase4-aggregate-filter.test.mjs`
  - מוכיח חלקים מ-filter/aggregation לפי טווחים ושדות evidence.
  - לא מוכיח fallback `created_at` במצב missing column בכל UI.

- `tests/learning/phase5-book-tracking.test.mjs`
  - מוכיח חלקים ממעקב ספרים.
  - לא מוכיח איך חסר book tables מוצג להורה.

- `tests/parent-server/parent-assigned-activities.test.mjs`
  - מוכיח חלק מהתנהגות server לפעילויות מהורה.
  - לא מוכיח provenance/visibility בדוח UI.

- `tests/reports/diagnostic-truth-consumer-verification.test.mjs`
  - מוכיח חלק מה-consumer של diagnostic truth/report payload.
  - לא מוכיח parity מלא בין API payload ל-rendered report.

- `scripts/parent-report-activity-time-selftest.mjs`
  - מוכיח חלק מהעדפת timestamps.
  - לא מוכיח ש-fallback timestamp מוצג נכון/מסומן ב-UI.

- `scripts/parent-report-grade-aware-recommendation-selftest.mjs`
  - מוכיח ש-grade-aware resolver ו-fallback paths עובדים.
  - לא מוכיח שהfallback בטוח להורה או שיש מספיק evidence.

- `scripts/verify-israel-monthly-display.mjs`
  - מוכיח חלק מהצגת חודש ישראל.
  - לא מוכיח daily challenge date reset בכל masters.

- `scripts/verify-phase2-missions.mjs`
  - מוכיח חלק מיצירת/הצגת missions.
  - לא מוכיח empty/null UI כמו 0/0 או default rewardCoins.

## 7. בדיקות קיימות שלא מוכיחות מספיק

- `tests/e2e/parent-report-real-ui-load.spec.ts`
  - נראה כבדיקת טעינת UI, לא הוכחת אמת נתונים מול Supabase אמיתי.
  - לא מוכח parity API -> report -> PDF.

- `scripts/verify-student-dashboard-view.mjs`
  - בדיקת view/manual verification חלקית.
  - לא מוכיחה שאין inferred/reconciled daily progress שמוצג כאמת.

- `scripts/shadow-compare-report-data.mjs` ו-`scripts/shadow-compare-real-browser-report-data.mjs`
  - כלי השוואה חשובים, אבל לא מוכח שהם gate מחייב.

- grade-aware recommendation selftests
  - מוכיחים routing/fallback של template, לא מוכיחים sufficiency של evidence לפני המלצה.

- Hebrew/zero-evidence selftests
  - מוכיחים חלק ממקרי no evidence, לא מוכיחים שכל משטח UI, detailed, PDF ו-copilot מיושרים.

- phase9 single truth tests
  - חזקות למסלול student home/progress מסוים, אבל לא מוכיחות:
    - local parent report path חסום.
    - leaderboard אינו localStorage truth.
    - avatar localStorage fallback לא מוצג.
    - subject dashboard לא מציג 0% במקום unknown.

## 8. בדיקות חסרות

- E2E או integration test שמוכיח ש-parent dashboard report לא יכול ליפול למסלול `mleo_*` localStorage.
- Parity test בין `/api/parent/students/[studentId]/report-data` לבין `report.summary`/subject rows אחרי `runParentReportGenerationFromApiBody()`.
- בדיקת duration truth: כאשר `durationSeconds` חסר, UI לא מציג זמן משוער כאמת או מסמן אותו.
- בדיקת parent-assigned activity provenance: פעילות מהורה מוצגת ונבדלת מפעילות שהתלמיד בחר לבד.
- בדיקת no schema/table fallback: parent activity/book tracking missing לא הופך ל-empty report בלי warning.
- Unit tests ל-`mergeChallengeBlobForDisplay()` ו-`reconcileDailyChallengeForDisplay()` כולל מצב inferred correct.
- בדיקה ש-accuracy null לא מוצג כ-0% ב-subject dashboard.
- בדיקה ש-daily date keys משתמשים ב-Asia/Jerusalem ואינם 0-indexed.
- בדיקת self-selected grade/level: פעילות בכיתה אחרת מוצגת/נספרת עם provenance ולא נבלעת בכלל הסטטיסטיקה.
- PDF parity test: אותו payload, אותו range, אותה גרסת parentAiExplanation או סימון שונה.
- בדיקת localStorage legacy inventory: אילו `mleo_*` עדיין משפיעים על display אמיתי.
- Guard test ל-backfill/seed scripts מול production env.
- בדיקה שאין demo/QA seed data במסלול דוח אמיתי.
- Copilot grounding test שמשווה תשובת copilot לכל metric שמוצג במסך.

## 9. סיכוני השקה

- הורה יכול לראות דוח אמיתי לכאורה שמקורו ב-localStorage מקומי ולא ב-DB.
- זמן למידה בדוח הורים עלול להיות estimated כאשר חסר duration אמיתי.
- פעילות שהורה שלח עלולה להיעלם בשקט אם טבלת attempts/columns חסרות.
- תלמיד יכול לראות 0% או 0/0 כאשר המצב האמיתי הוא "לא נטען" או "אין נתונים".
- daily/weekly progress יכול להיות merged/inferred ולא DB-confirmed.
- עבודה בכיתה/רמה/מקצוע אחר יכולה להתערבב בסטטיסטיקה כללית בלי provenance ברור.
- PDF יכול להקפיא state שונה מהמסך.
- demo/backfill/nightly scripts יכולים להשפיע על אמת נתונים אם רצים על DB לא נכון.
- בדיקות קיימות מוכיחות חלקי מדיניות, אבל לא מוכיחות end-to-end data truth.

## 10. שאלות פתוחות לבעלים

- האם `/learning/parent-report` בלי `source=parent|teacher` הוא מוצר נתמך או legacy שצריך חסימה?
- האם מותר להציג זמן למידה משוער להורה, ואם כן האם חייב label "משוער"?
- האם parent-assigned activity צריכה להופיע בנפרד מפעילות שהתלמיד בחר לבד?
- האם dashboard תלמיד אמור להיות lifetime, monthly, או current grade scoped?
- האם עבודה בכיתה אחרת אמורה להשפיע על אחוזי הצלחה כלליים?
- האם `student_learning_state` נחשב מקור אמת לגמיפיקציה, או רק cache מלקוח?
- האם 0 בשדות UI מייצג "אין נתונים", "נכשל", או "ערך אמיתי 0"?
- האם PDF חייב להיות זהה למסך לאחר enrich async?
- האם copilot צריך לציין provenance לכל metric שהוא עונה עליו?
- האם seed/demo/nightly scripts מורשים אי פעם מול DB שאינו demo tenant?
- האם backfill classification עבר review/guard production מחייב?

## סיכום Audit

לא ניתן להכריז PASS. נמצאו כמה מסלולים שבהם fallback/default/localStorage/חישוב משוער יכולים להיראות כהאמת למשתמש:

- המסוכן ביותר: דוח הורים localStorage path.
- המסוכן ביותר מצד DB mutation: backfill classification.
- המסוכן ביותר ב-dashboard תלמיד: daily/weekly challenge merge/reconcile ו-null accuracy שהופך ל-0%.
- המסוכן ביותר בנתוני דוח הורים מרוחק: duration/timestamp/mode/grade defaults ב-bridge ופעילות הורה שנעלמת בשקט.

לא בוצע תיקון במסגרת מסמך זה.

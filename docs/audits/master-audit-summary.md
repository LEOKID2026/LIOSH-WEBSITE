# סיכום מאסטר לדוחות Audit

תאריך: 2026-06-15  
סוג: Audit summary בלבד  
סטטוס: לא בוצע שינוי קוד מוצר, refactor, UI, DB, migrations, טקסטים, בדיקות, commit או push.

## 1. Executive Summary

לא ניתן להכריז PASS להשקה. כל ששת דוחות ה-Audit מצביעים על מערכת עם מנוע אבחוני ומנגנוני gating משמעותיים, אך גם עם פערי אמון והשקה שאינם סגורים: שני מסלולי אמת לדוח הורים, בדיקות E2E לא מספקות, סיכוני PDF מול UI, פעילות הורה שלא תמיד משתקפת בדוח, זמן למידה ופרסים שמסתמכים על client-side duration, ופערים בין "PASS" של fixtures/artifacts לבין מוצר חי.

ההמלצה המאוחדת היא **No-Go להשקה מלאה** עד סגירת ה-blockers המפורטים להלן והרצת gate אמיתי שמחבר DB/API/UI/PDF עבור אותו תלמיד, אותו הורה ואותו טווח תאריכים. אפשר לשקול השקה מוגבלת רק אם מסמנים את מגבלות הדוח ומנטרלים/מגדירים במפורש את מסלול localStorage, פעילות הורה, זמן/פרסים ו-PDF.

## 2. מצב כללי של המערכת

המערכת אינה במצב "לא עובדת"; קיימים רכיבי אמת חזקים:

- מנוע Diagnostic V2 כולל gating, confidence, recurrence, positive evidence והפרדה בין diagnostic / learning / competitive. מקור: `parent-report-diagnostic-audit.md` — מוכח בקוד.
- קיימת הפרדת כיתת תוכן (`contentGrade`) מול כיתה רשומה, כולל `gradeRelation` ו-row keys. מקור: `parent-report-diagnostic-audit.md`, `personal-activities-and-self-practice-audit.md` — מוכח בקוד וב-selftests.
- קיימות בדיקות שמכסות zero-evidence, grade evidence, classification, resume וחלק ממדיניות זמן. מקור: `personal-activities-and-self-practice-audit.md`, `parent-trust-launch-risk-audit.md`, `test-truth-and-pass-quality-audit.md`.

אבל מצב ההשקה אינו מוכח:

- אין הוכחת אמת end-to-end אחת שמחברת parent login → DB report-data → UI visible text → PDF extracted text. מקור: `test-truth-and-pass-quality-audit.md` — CRITICAL.
- דוח הורים עדיין יכול להיבנות מ-localStorage במסלול מוצר. מקור: `data-truth-fallback-audit.md` — CRITICAL; מקור נוסף: `parent-report-diagnostic-audit.md` — HIGH.
- זמן ופרסים תלויים ב-`durationSeconds` שמגיע מה-client, ללא recompute server-side מוכח. מקור: `learning-time-rewards-audit.md` — HIGH.
- פעילות הורה מלאה מכוסה חלקית, אבל flow מלא עד דוח/PDF אינו מוכח. מקור: `personal-activities-and-self-practice-audit.md`, `test-truth-and-pass-quality-audit.md`.

## 3. Critical Blockers

| ממצא | מקור Audit | מוכח? | חומרה | השפעה | מה לבדוק/לתקן |
|---|---|---:|---|---|---|
| אין הוכחה מלאה ש-UI הורה, API, DB ו-PDF מציגים אותו truth עבור אותו תלמיד/טווח | `test-truth-and-pass-quality-audit.md` | מוכח כחוסר בדיקה | CRITICAL | הורה, דוח, PDF, השקה | להוסיף gate E2E truth מלא לפני תיקונים רחבים ולפני launch |
| PASS של דוח הורים יכול להיות מטעה בגלל mocks/fixtures/empty-state | `test-truth-and-pass-quality-audit.md` | מוכח מקריאת בדיקות | CRITICAL | השקה, אמון, QA | להפריד `MODEL_PASS`/`API_PASS`/`UI_PASS`/`PDF_PASS`/`E2E_TRUTH_PASS` |
| אין בדיקה מלאה של פעילות שהורה שלח עד השפעה בדוח הורה/PDF | `test-truth-and-pass-quality-audit.md` | מוכח כחוסר בדיקה | CRITICAL | הורה, פעילות אישית, דוח, PDF | להוסיף flow parent creates → student answers → report-data → UI/PDF |
| חלק מגייטים שמדווחים PDF אינם מריצים PDF אמיתי | `test-truth-and-pass-quality-audit.md` | מוכח | CRITICAL | PDF, PASS מטעה | לדרוש `requirePdfBytes: true` ו-PDF text extraction בגייטים קריטיים |
| דוח הורים localStorage path עדיין חי | `data-truth-fallback-audit.md`; סתירה בחומרה מול `parent-report-diagnostic-audit.md` | מוכח בקוד; השפעת runtime לא נבדקה | CRITICAL לפי data-truth, HIGH לפי diagnostic | הורה, תלמיד, דוח, השקה | החלטת בעלים: לחסום, לסמן כ-local בלבד, או לנתב תמיד ל-DB |
| `backfill-activity-classification.mjs` יכול לשנות אמת diagnostic אם רץ על DB אמיתי | `data-truth-fallback-audit.md` | סיכון מוכח בקיום script; guard production לא מוכח | CRITICAL | דוח, אבחון, השקה | production hard stop + dry-run/staging/post-verify לפני כל שימוש |

## 4. High Risks

| ממצא | מקור Audit | מוכח? | השפעה | המשך נדרש |
|---|---|---:|---|---|
| שני מקורות אמת לדוח: DB מרוחק מול localStorage מקומי | `parent-report-diagnostic-audit.md`, `data-truth-fallback-audit.md` | מוכח | הורה/דוח | להגדיר source of truth יחיד |
| API parent report עובר דרך shim שמייצר duration/timestamp/mode/level/grade defaults | `data-truth-fallback-audit.md` | מוכח | דוח, זמן, כיתה אחרת | לסמן estimated fields או לבטל default שמוצג כאמת |
| פעילות הורה יכולה להיעלם בשקט אם schema/table/column חסרים | `data-truth-fallback-audit.md` | מוכח בקוד fallback | פעילות אישית, דוח | data health warning ולא `[]` שקט |
| test suite ראשי לפעילות הורה נכשל בטעינה ואינו ב-CI | `personal-activities-and-self-practice-audit.md` | מוכח בהרצת audit שם | פעילות אישית, השקה | לתקן dependency ולהכניס ל-CI |
| parent activity לא הוכחה end-to-end עד report/PDF | `personal-activities-and-self-practice-audit.md`, `test-truth-and-pass-quality-audit.md` | לא מוכח | הורה, פעילות אישית | E2E מלא עם DB |
| `duration_seconds` client-supplied ומשמש לפרסים | `learning-time-rewards-audit.md` | מוכח בקוד | תלמיד, פרסים, dashboard | server-side validation/recompute מסכום credited answers |
| עבודה אמיתית ארוכה יכולה להיחתך לפי caps | `learning-time-rewards-audit.md`; גם audit קודם מצוטט ב-`personal-activities...` | מוכח בקוד; runtime לא מוכח | תלמיד, זמן, פרסים | להחליט policy ולבדוק E2E hard/long reading |
| פעילות מהורה/assigned אינה באותו reward path כמו free practice | `learning-time-rewards-audit.md`, `personal-activities-and-self-practice-audit.md` | מוכח חלקית/by design | הורה, תלמיד, פרסים | החלטת product אם לכלול בדקות/פרסים |
| דוח הורים עבור parent activity משתמש raw time ולא credited time | `learning-time-rewards-audit.md` | מוכח חלקית | דוח, זמן, אמון | להגדיר raw vs credited בדוח |
| subject dashboard מציג daily/weekly progress אחרי merge/reconcile | `data-truth-fallback-audit.md` | מוכח בקוד | תלמיד, progress | לא להציג inferred/pending כעובדה |
| accuracy null הופך ל-0% ב-subject dashboard | `data-truth-fallback-audit.md` | מוכח בקוד | תלמיד, הצלחה | להציג "אין נתונים" במקום 0% |
| grade/level/subject mismatch לא מופרד מספיק ב-dashboard | `data-truth-fallback-audit.md`, `personal-activities...` | חלקית מוכח; UI מלא לא מוכח | תלמיד, הורה, כיתה אחרת | להציג scope ו-breakdown |
| stars/achievements lifetime לצד מדדי תקופה | `parent-trust-launch-risk-audit.md` | מוכח בקוד | הורה, פרסים, אמון | label "מצטבר" או period scope |
| ספי "מספיק נתונים" סותרים 5/8/12/15 | `parent-trust-launch-risk-audit.md` | מוכח בקוד | הורה, חוזקות/חולשות | סף מוצרי יחיד + בדיקת cross-layer |
| תובנות שרת מ-5 שאלות | `parent-trust-launch-risk-audit.md` | מוכח בקוד; לא הוכח כשגוי סטטיסטית | דוח, חוזקות/חולשות | יישור ל-8+ או hedge מפורש |
| פעילות הורה שלא הושלמה לא בדוח | `parent-trust-launch-risk-audit.md` | מוכח בקוד | הורה, פעילות אישית | להוסיף אזכור "נשלחה וטרם הושלמה" |
| Launch QA 48 matrix לא אומת מחדש ויש סתירה מול visible truth PASS | `parent-trust-launch-risk-audit.md` | לא מוכח כרגע | השקה | re-run ופירוש הסתירה |

## 5. Medium Risks

- PDF מפורט יכול להיווצר לפני async AI enrich; מקור: `parent-trust-launch-risk-audit.md`, `data-truth-fallback-audit.md`; מוכח בקוד; השפעה: PDF מול UI.
- PDF קצר מבוסס אותו DOM, אך parity מלא לא הוכח; מקור: `parent-trust-launch-risk-audit.md`, `test-truth-and-pass-quality-audit.md`; לא מוכח מספיק.
- parentFacing server insights ו-client diagnostics הם שתי סמכויות שונות; מקור: `data-truth-fallback-audit.md`, `parent-trust-launch-risk-audit.md`; מוכח בקוד; השפעה: דוח הורה.
- ניסוח עברי עלול להישמע ודאי מדי בנפח נמוך; מקור: `parent-trust-launch-risk-audit.md`; מוכח בקוד, narrative safety מכסה חלקית.
- חוזק ב-overview בלי hedge ב-4–7 שאלות; מקור: `parent-trust-launch-risk-audit.md`; מוכח בקוד, לא נמצא test.
- subject totals מערבבים grades בעוד topic rows מופרדים; מקור: `personal-activities-and-self-practice-audit.md`; מוכח בקוד; השפעה: כיתה אחרת.
- `higher + needsSupport` phrasing קיים אך לא מכוסה מספיק; מקור: `personal-activities...`; קוד מוכח, test לא.
- no-data/default 0 במספר מקומות; מקור: `data-truth-fallback-audit.md`; מוכח בקוד; השפעה: תלמיד/דוח.
- mobile lifecycle/refresh/back לזמן למידה לא מוכחים; מקור: `learning-time-rewards-audit.md`; לא מוכח.
- dashboard שבועי לא נמצא/לא נבדק כמסך ייעודי; מקור: `learning-time-rewards-audit.md`; לא נבדק.
- artifacts קיימים יכולים לייצר PASS ללא rerun; מקור: `test-truth-and-pass-quality-audit.md`; מוכח.

## 6. Low Risks

- API default range ל-30 יום כאשר אין `from/to`; מקור: `data-truth-fallback-audit.md`; סיכון נמוך אם range מוצג.
- labels כמו "לא זמין" הם fallback בטוח יחסית; מקור: `data-truth-fallback-audit.md`.
- `LEO_MONTHLY_PROGRESS` נראה cache/legacy ולא display authority ראשי; מקור: `data-truth-fallback-audit.md`; עדיין דורש שמירה.
- migration timing columns על parent attempts לא בשימוש ב-write path; מקור: `personal-activities-and-self-practice-audit.md`; חומרה LOW.
- UI mobile modal tests קיימות אך לא מוכיחות איכות נתונים; מקור: `test-truth-and-pass-quality-audit.md`.
- mixed-grade note קיימת אך אולי קלה לפספוס; מקור: `parent-trust-launch-risk-audit.md`; LOW.

## 7. נושאים שמוכחים היטב

- Diagnostic V2 כולל gating אמיתי לפני אבחנה/התערבות. מקור: `parent-report-diagnostic-audit.md`; מוכח בקוד.
- קיימת הפרדת diagnostic/learning/competitive ו-parent `guided_practice` כ-learning bucket. מקור: `personal-activities-and-self-practice-audit.md`; בדיקות `activity-classification`, `phase4-aggregate-filter` עברו באותו audit.
- פעילות בכיתה אחרת נשמרת בפרוסות grade נפרדות ברמת topic rows. מקור: `parent-report-diagnostic-audit.md`, `personal-activities-and-self-practice-audit.md`; מוכח בקוד/selftests.
- המערכת מזהה חוזקות, לא רק חולשות: stable mastery, excellent rows, positiveAuthority, stableExcellence/topStrengths. מקור: `parent-report-diagnostic-audit.md`; מוכח בקוד.
- zero-evidence במקצוע 0 שאלות mitigated לפי visible truth/zero-evidence policy. מקור: `parent-trust-launch-risk-audit.md`; מוכח לפי artifacts/tests שהדוח מצטט.
- duration inflation קיצוני mitigated לפי numeric sanity/caps. מקור: `parent-trust-launch-risk-audit.md`; מוכח לפי artifacts שהדוח מצטט.
- parent activity completed נכנס ל-report דרך attempts ו-provenance. מקור: `personal-activities-and-self-practice-audit.md`; מוכח בקוד/selftest, לא E2E מלא.

## 8. נושאים שלא מוכחים מספיק

- UI/API/DB/PDF truth מלא עבור אותו תלמיד וטווח. מקור: `test-truth-and-pass-quality-audit.md`; לא מוכח.
- parent activity complete flow עד דוח/PDF. מקור: `test-truth...`, `personal-activities...`; לא מוכח E2E.
- parity בין API payload לבין rendered report לאחר bridge. מקור: `data-truth-fallback-audit.md`; לא מוכח.
- PDF מול UI מלא, כולל detailed AI async. מקור: `data-truth...`, `parent-trust...`, `test-truth...`; לא מוכח מספיק.
- localStorage path מול DB path עקביות. מקור: `parent-report-diagnostic-audit.md`, `data-truth...`; לא מוכח.
- timing/reward end-to-end browser→DB→coins→dashboard→report. מקור: `learning-time-rewards-audit.md`; לא מוכח.
- mobile lifecycle, refresh/back/unmount לזמן. מקור: `learning-time-rewards-audit.md`; לא מוכח.
- עבודה בכיתה אחרת דרך UI/DB אמיתי עד PDF. מקור: `test-truth...`, `personal-activities...`; לא מוכח מלא.
- חוזקות ב-volume נמוך עם hedge נכון בכל surface. מקור: `parent-trust...`, `data-truth...`; לא מוכח מספיק.
- scripts/backfill/seed/nightly חסומים מול production בכל נתיב. מקור: `data-truth...`, `test-truth...`; לא מוכח.

## 9. נושאים שלא נבדקו

- Production/staging live DB מלא ברוב הדוחות. מקור: כל הדוחות כמעט; מצוין במפורש ב-`parent-report-diagnostic-audit.md`, `learning-time-rewards-audit.md`, `parent-trust-launch-risk-audit.md`.
- RLS וסכמת DB בפועל מעבר לקריאת קוד/שאילתות. מקור: `parent-report-diagnostic-audit.md`; לא נבדק.
- כל 48 תרחישי Launch QA בהרצה מחדש. מקור: `parent-trust-launch-risk-audit.md`; לא נבדק מחדש.
- PDF export חי בכל המסלולים. מקור: `personal-activities...`, `learning-time...`, `parent-trust...`; לא נבדק במלואו.
- dashboard שבועי כמסך ייעודי. מקור: `learning-time-rewards-audit.md`; לא נמצא/לא נבדק.
- כל 6 master pages בריצה בדפדפן. מקור: `personal-activities...`; נבדקו דפוסים מייצגים.
- mobile device אמיתי. מקור: `learning-time-rewards-audit.md`; לא נבדק.
- teacher scope `student`, worksheets/PDF worksheets. מקור: `personal-activities...`; מחוץ ל-scope.

## 10. בדיקות שחייבים להוסיף לפני תיקונים

לפני תיקוני מוצר רחבים, צריך להוסיף בדיקות שמגדירות אמת ומונעות תיקון בכיוון שגוי:

1. Truth E2E gate: parent אמיתי + student אמיתי + DB deterministic + report-data + UI visible text + PDF text extraction. מקור: `test-truth-and-pass-quality-audit.md`.
2. Parent activity full flow: parent create → student complete/partial/not_started → report-data → UI/PDF. מקור: `test-truth...`, `personal-activities...`, `parent-trust...`.
3. API payload vs rendered report parity אחרי `runParentReportGenerationFromApiBody()`. מקור: `data-truth-fallback-audit.md`.
4. LocalStorage path guard/parity: להוכיח שמסלול local לא נגיש להורה אמיתי או שהוא מסומן. מקור: `data-truth...`, `parent-report-diagnostic...`.
5. Duration/reward E2E: hard/long question, scratchpad, explanation, hidden tab, refresh/back, mobile. מקור: `learning-time-rewards-audit.md`.
6. Server-side duration validation test: duration חיובי עם 0 answers, duration מנופח, mismatch מול credited answers. מקור: `learning-time...`.
7. PDF parity: short + detailed, before/after AI enrich, same payload/range. מקור: `test-truth...`, `parent-trust...`, `data-truth...`.
8. Grade-other E2E: registered g4 עובד g3/g5, בדיקת DB aggregate, UI, PDF, חוזקות/חולשות. מקור: `test-truth...`, `personal-activities...`.
9. No-data/no-questions product UI: מקצוע לא תורגל, אין שאלות במקצוע, מעט שאלות. מקור: `test-truth...`, `parent-trust...`.
10. Cross-layer evidence thresholds: 5/8/12/15 שאלות בכל surface. מקור: `parent-trust-launch-risk-audit.md`.
11. Parent-assigned tests לתוך CI אחרי תיקון dependency. מקור: `personal-activities...`.
12. Guard tests ל-backfill/seed/nightly מול production env. מקור: `data-truth...`, `test-truth...`.

## 11. תיקונים שחייבים לבצע לפני השקה

אין ליישם במסמך זה; אלו תיקונים שהדוחות מצביעים עליהם כ-pre-launch:

- להגדיר מקור אמת יחיד לדוח הורים או לסגור/לסמן את localStorage path. מקור: `data-truth...`, `parent-report-diagnostic...`.
- ליישר או לסמן estimated duration/timestamp/level/grade defaults ב-bridge. מקור: `data-truth...`.
- להקשיח server-side duration validation/recompute לפני שימוש בפרסים. מקור: `learning-time...`.
- להחליט ולהטמיע policy לפעילות הורה: האם נכנסת לדוח, לדקות, לפרסים, ומה מוצג אם לא התחילה. מקור: `personal-activities...`, `parent-trust...`, `learning-time...`.
- לאחד ספי "מספיק נתונים" או להציג hedge ברור לפי שכבה. מקור: `parent-trust...`.
- להפריד PASS לפי שכבות ולהחליף gates שמסתמכים על artifacts ישנים. מקור: `test-truth...`.
- לחזק PDF gates כך שדורשים PDF אמיתי ומשווים ל-UI. מקור: `test-truth...`.
- להגדיר stars/achievements כמצטבר או scoped לתקופה. מקור: `parent-trust...`.
- להוסיף data health כאשר parent activities/book tracking נעלמים בגלל schema/feature fallback. מקור: `data-truth...`.
- להוסיף production hard stop/backfill guards. מקור: `data-truth...`.

## 12. תיקונים שאפשר לדחות

אפשר לדחות רק לאחר סימון מפורש כ-debt, לא כ-PASS:

- שיפור prominence של mixed-grade note. מקור: `parent-trust...`; LOW.
- UI copy לגרפים שמוסתרים מתחת ל-15 שאלות. מקור: `parent-trust...`; LOW.
- איחוד naming raw/credited timing columns. מקור: `learning-time...`; LOW.
- endpoint לסגירת/ארכוב פעילות הורה, אם product מאשר שהיעדרו אינו launch blocker. מקור: `personal-activities...`; MEDIUM.
- הרחבת UI mode `homework` להורה, אם פעילות הורה לא אמורה להיות diagnostic כרגע. מקור: `personal-activities...`.
- dashboard שבועי, אם אינו surface מוצרי נדרש. מקור: `learning-time...`; לא נבדק/לא נמצא.

## 13. סיכונים ספציפיים לדוח הורים

- שני מסלולי אמת: DB מול localStorage. מקור: `data-truth...`, `parent-report-diagnostic...`; מוכח.
- bridge יוצר defaults שמוצגים בדוח. מקור: `data-truth...`; מוכח.
- ריבוי צינורות המלצה: V2, legacy, raw-metric, parentFacing. מקור: `parent-report-diagnostic...`, `data-truth...`; מוכח.
- ספי evidence סותרים. מקור: `parent-trust...`; מוכח.
- parent activity missing/unfinished לא תמיד משתקפת בדוח. מקור: `parent-trust...`, `data-truth...`; מוכח/חלקי.
- parentFacing server יכול להסתיר diagnostics עשירים. מקור: `parent-trust...`; מוכח.

## 14. סיכונים ספציפיים לפעילות אישית

- test suite מרכזי לפעילות הורה נכשל ואינו ב-CI. מקור: `personal-activities...`; מוכח.
- flow מלא עד דוח/PDF לא מוכח. מקור: `test-truth...`; לא מוכח.
- פעילות מהורה `guided_practice` לא diagnostic בפועל; הורה עלול לצפות ל"מבחן בית". מקור: `personal-activities...`; מוכח/by design.
- פעילות שלא הושלמה לא בדוח. מקור: `parent-trust...`; מוכח.
- פעילות הורה אינה ב-monthly rewards/minutes לפי הדוחות. מקור: `personal-activities...`, `learning-time...`; מוכח/by design חלקי.
- parent attempts table/schema fallback יכול להחזיר empty silently. מקור: `data-truth...`; מוכח.

## 15. סיכונים ספציפיים לפעילות עצמאית של תלמיד

- פעילות עצמאית מוכחת חלקית ב-DB/report אך לא end-to-end דרך UI אמיתי. מקור: `test-truth...`; לא מוכח מספיק.
- תלמיד יכול לבחור כיתה/רמה/מקצוע אחר; topic rows מופרדים אך summaries/dashboard לא תמיד. מקור: `personal-activities...`, `data-truth...`; מוכח חלקית.
- session duration מגיע מה-client ומשפיע על פרסים. מקור: `learning-time...`; מוכח.
- localStorage legacy עדיין משפיע על display מסוימים כמו leaderboard/avatar/local report. מקור: `data-truth...`; מוכח.
- refresh/back/unmount לא מוכחים כבטוחים לזמן. מקור: `learning-time...`; לא מוכח.

## 16. סיכונים ספציפיים לזמן ופרסים

- `durationSeconds` client-supplied; server לא הוכח כמחשב מחדש. מקור: `learning-time...`; HIGH.
- caps יכולים לגרום under-credit לעבודה עמוקה. מקור: `learning-time...`; HIGH.
- parent/class assigned activities לא באותו reward path. מקור: `learning-time...`; HIGH.
- assigned activity report עשוי להשתמש raw time למדדים, לא credited. מקור: `learning-time...`; HIGH.
- stars/achievements מצטברים לצד period metrics. מקור: `parent-trust...`; HIGH.
- dashboard monthly minutes ו-monthly persistence reward לא הוכחו עם אותו filter. מקור: `learning-time...`; MEDIUM.

## 17. סיכונים ספציפיים ל-PASS מטעה

- `parent-report-real-ui-load` משתמש mock API ו-empty-state יכול לעבור. מקור: `test-truth...`; CRITICAL.
- release/limited gates קוראים artifacts קיימים. מקור: `test-truth...`; HIGH.
- source regex tests יכולים לעבור בלי runtime correctness. מקור: `test-truth...`; מוכח.
- PDF flags יכולים להגיע מ-SSR/static ולא מ-PDF אמיתי. מקור: `test-truth...`; CRITICAL.
- E2E personal activities יכול skip אם אין נתונים. מקור: `test-truth...`; מוכח.
- nightly/simulation יכולים להיות partial/deferred/reuse artifacts. מקור: `test-truth...`; מוכח.

## 18. סיכונים ספציפיים ל-PDF מול UI

- אין בדיקה מלאה שמוודאת UI visible text == PDF extracted text. מקור: `test-truth...`; CRITICAL/HIGH.
- דוח מפורט יכול להדפיס לפני async AI enrich. מקור: `parent-trust...`, `data-truth...`; מוכח.
- דוח קצר משתמש אותו DOM, אך QA לא הורץ מחדש וה-parity לא מוכח מלא. מקור: `parent-trust...`; לא מוכח.
- חלק מגייטים מרשים fallback ל-print DOM במקום PDF bytes. מקור: `test-truth...`; מוכח.
- PDF של פעילות הורה + self practice + grades שונים חסר כבדיקה. מקור: `personal-activities...`, `test-truth...`; לא מוכח.

## 19. סיכונים ספציפיים לעבודה בכיתה אחרת

- האגרגציה מפרידה topic rows לפי grade; זה מוכח. מקור: `parent-report-diagnostic...`, `personal-activities...`.
- subject totals מערבבים grades; מקור: `personal-activities...`; MEDIUM.
- dashboard/HUD totals לא תמיד grade-scoped; מקור: `data-truth...`; HIGH.
- mixed-grade note קיימת אך עלולה להיות קלה לפספוס. מקור: `parent-trust...`; LOW.
- E2E מלא של תלמיד שעובד בכיתה אחרת עד UI/PDF לא מוכח. מקור: `test-truth...`; HIGH.
- `higher + weak` phrasing לא מכוסה מספיק. מקור: `personal-activities...`; MEDIUM.

## 20. סיכונים ספציפיים לזיהוי חוזקות של תלמיד

- המערכת כן מזהה חוזקות, וזה מוכח. מקור: `parent-report-diagnostic...`.
- אבל raw metric strengths יכולים להיראות כחוזקה אבחונית בלי engine עמוק. מקור: `data-truth...`; MEDIUM, לא מוכח מספיק.
- חוזק ב-overview יכול להופיע בלי hedge ב-4–7 שאלות. מקור: `parent-trust...`; MEDIUM.
- רשימת "מצוינים" דורשת ≥10 שאלות; הצלחה משמעותית ב-9 שאלות עלולה לא להופיע שם. מקור: `parent-trust...`; MEDIUM.
- פעילות חזקה בכיתה מעל מוכחת בחלק מה-selftests, אבל E2E UI/PDF מלא לא מוכח. מקור: `personal-activities...`, `test-truth...`.

## 21. המלצת Go / No-Go להשקה

**המלצה: No-Go להשקה מלאה.**

נימוק: למרות שקיימים רכיבי מנוע חזקים ובדיקות חלקיות, הדוחות אינם מוכיחים end-to-end truth להורה אמיתי. ה-blockers המרכזיים הם localStorage path, PASS מטעה, חוסר parity UI/API/DB/PDF, זמן ופרסים client-side, פעילות הורה לא מוכחת עד דוח/PDF, וספי evidence סותרים.

אפשרות מוגבלת: Go מוגבל בלבד לסביבת pilot/QA אם:

- localStorage report path חסום או מסומן כלא-סמכותי.
- PDF אינו מוצג כ-contract מלא עד gate PDF אמיתי.
- פרסים/זמן מוצגים עם מגבלות ברורות.
- פעילות הורה שלא הושלמה מוסברת מחוץ לדוח או בתוכו.
- PASS נקרא לפי שכבה ולא כ-PASS מוצרי.

## 22. תוכנית עבודה מוצעת לפי סדר עדיפויות — בלי ליישם

1. להוסיף `E2E_TRUTH_PASS` מינימלי: DB seed deterministic → parent login → report-data → UI → PDF text extraction.
2. לתקן ולהכניס ל-CI את `parent-assigned-activities.test.mjs` ואת grade-evidence selftests.
3. להכריע product-wise על localStorage parent report path: block / redirect / label.
4. להוסיף parity test API payload ↔ rendered report ↔ PDF.
5. להקשיח duration: server recompute/validation לפי credited answers, ובדיקות abuse/under-credit.
6. להגדיר contract לפעילות הורה: completed / partial / not_started, דוח, פרסים, דקות, provenance.
7. לאחד evidence thresholds או להציג hedge אחיד לכל 5/8/12/15.
8. לתקן semantics של stars/achievements lifetime vs period.
9. להוסיף tests לכיתה אחרת end-to-end כולל PDF.
10. להחליף release gates שקוראים artifacts קיימים בגייטים שמריצים מחדש או דורשים run id/checksum.
11. להקשיח backfill/seed/nightly scripts מול production.
12. אחרי כל אלה, להריץ מחדש Launch QA matrix ולתעד אם visible truth PASS מחליף את 0/48 ההיסטורי.

## 23. סתירות בין דוחות

- חומרת localStorage path: `data-truth-fallback-audit.md` מסמן CRITICAL; `parent-report-diagnostic-audit.md` מסמן HIGH וללא CRITICAL מוכח. אין לבחור צד בלי החלטת בעלים האם הורים אמיתיים נחשפים למסלול B.
- parent activity completed: `parent-trust-launch-risk-audit.md` מסמן completed → report כ-non-blocker עם selftest; `test-truth-and-pass-quality-audit.md` אומר שאין flow מלא עד דוח/PDF. אין סתירה פונקציונלית: קוד/selftest קיימים, E2E/PDF לא מוכח.
- PDF קצר: `parent-report-diagnostic-audit.md` אומר PDF הוא אותו DOM; `test-truth-and-pass-quality-audit.md` אומר parity מלא לא מוכח; `parent-trust-launch-risk-audit.md` מציין matrix מתועד אך לא הורץ מחדש. מסקנה: חישוב נפרד לא נמצא, אך הוכחת parity מוצרית חסרה.
- פעילות בכיתה אחרת: `parent-report-diagnostic-audit.md` מדגיש הפרדה מוכחת; `data-truth-fallback-audit.md` ו-`test-truth...` מדגישים ש-dashboard/UI/PDF מלא לא מוכח. מסקנה: האגרגציה מוכחת; product visibility לא מוכחת.
- duration inflation: `parent-trust...` מציין mitigated; `learning-time...` מדגיש under-credit/client-supplied. אלו סיכונים שונים: over-count קיצוני כנראה mitigated, under-credit ואמון ב-client לא מוכחים.

## 24. סיכום סופי

המערכת מתקדמת ויש בה מנגנוני אמת משמעותיים, אבל אינה מוכחת להשקה מלאה. אין להכריז PASS כללי. ה-priority הראשון אינו refactor אלא הוכחת אמת end-to-end והכרעות product/source-of-truth. רק לאחר מכן נכון לבצע תיקונים ולבדוק שוב.

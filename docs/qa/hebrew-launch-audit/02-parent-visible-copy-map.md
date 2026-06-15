# 02 — מיפוי עברית שהורה רואה בפועל

תאריך: 2026-06-15  
סוג: QA/Audit read-only  
סטטוס: לא בוצע שינוי בקוד מוצר. נוצרו רק קבצי דוח תחת `docs/qa/hebrew-launch-audit/`.

## תקציר מנהלים

העברית שהורה רואה אינה מגיעה ממקור אחד. יש שלוש שכבות עיקריות:

1. **טקסט UI סטטי** — כפתורים, כותרות, טפסים, empty states, שגיאות טעינה.
2. **טקסט שנוצר מנתונים** — דוח הורים, דוח מקיף, תובנות שרת, evidence tiers, המלצות, חוזקות/חולשות, פעילות הורה.
3. **טקסט AI/Copilot או fallback דטרמיניסטי** — `ParentReportInsight`, Copilot, narrative fallback.

לא ניתן לאשר שהעברית תקינה להשקה מלאה בלי הרצת UI/PDF אמיתית. ממצאי הקוד מראים שיש מנגנוני זהירות חשובים כמו "לא תורגל", "מעט מידע", confidence summaries ו-disclaimer. יחד עם זאת קיימים סיכונים: ניסוחים חזקים מדי בנפח נמוך, PDF שאינו כולל Copilot, PDF מפורט שיכול להיתפס לפני AI enrich, פעילות הורה שלא התחילה שלא מופיעה בדוח, וסטטוסים/שגיאות API שיכולים לעבור כטקסט לא מתורגם.

## מסלולי הורה שנבדקו

- Parent dashboard: `pages/parent/dashboard.js`, `components/parent/*`.
- יצירת פעילות אישית מהורה ותוצאות פעילות: `components/parent/AssignActivityModal.js`, `components/parent/ParentSentActivitiesPanel.jsx`.
- דוח הורים קצר: `pages/learning/parent-report.js`.
- דוח הורים מקיף: `pages/learning/parent-report-detailed.js`.
- רכיבי דוח משותפים: `ParentReportInsight`, `ParentReportDataHealthNote`, `ParentReportImportantDisclaimer`, `ParentReportParentSections`, `ParentReportExitNav`.
- מנועי copy ודאטה: `utils/parent-report-v2.js`, `utils/detailed-parent-report.js`, `utils/parent-report-language/**`, `lib/parent-server/parent-report-parent-facing.server.js`.
- Copilot/AI: `components/parent-copilot/parent-copilot-panel.jsx`, `utils/parent-copilot/**`, `utils/parent-report-ai/**`.
- PDF/export: print DOM תחת `#parent-report-pdf` ו-`#parent-report-detailed-print`; לא נמצא מנוע PDF נפרד לטקסט.

לא נבדק בפועל:

- דפדפן חי, PDF חי, או השוואת DOM מול PDF.
- DB חי / staging / production.
- כל וריאציה בקטלוג `grade-aware-recommendation-templates.js`; נבדק כקטלוג תבניות גדול עם מאות נוסחים.

## טבלת כל משפט שהורה רואה

הטבלה המלאה נמצאת גם ב-CSV: `02-parent-visible-copy-map.csv`. כאן מופיעה גרסת Markdown מקוצרת לפי משטחים. שורות שמייצגות קטלוגים גדולים מסומנות כ-"קטלוג תבניות".

| id | משפט / תבנית גלויה | מקור | משטח | סוג | תנאי הופעה | סיכון |
|---|---|---|---|---|---|---|
| P001 | בודק התחברות הורה... | `pages/parent/dashboard.js:682` | dashboard | static | בדיקת session | נמוך |
| P002 | דשבורד הורים | `pages/parent/dashboard.js:701` | dashboard | static | dashboard נטען | נמוך |
| P003 | הוספת ילד / יציאה | `pages/parent/dashboard.js:710,717` | dashboard | static | dashboard נטען | נמוך |
| P004 | עדיין לא נוספו ילדים | `pages/parent/dashboard.js:726` | dashboard | empty_state | אין ילדים | נמוך |
| P005 | דוח הורים / פעילות / פרטים | `pages/parent/dashboard.js:751,765,773` | child card | static | לכל ילד | נמוך |
| P006 | פרטים — {שם ילד} | `pages/parent/dashboard.js:794` | child details | template | פתיחת פרטי ילד | נמוך |
| P007 | הפעילות נשלחה בהצלחה! | `pages/parent/dashboard.js:809` | dashboard banner | static | שליחת פעילות הצליחה | נמוך |
| P008 | מחיקת ילד לצמיתות | `pages/parent/dashboard.js:824` | delete modal | warning | מחיקת ילד | נמוך, אך קריטי UX |
| P009 | מחיקה זו תמחק לצמיתות... | `pages/parent/dashboard.js:827` | delete modal | warning | מחיקת ילד | נמוך |
| P010 | הקלידו את שם הילד בדיוק | `pages/parent/dashboard.js:831` | delete modal | static | מחיקת ילד | נמוך |
| P011 | יש לבחור כיתה לפעילות לפני יצירת שאלות | `components/parent/AssignActivityModal.js:88` | assign activity | error_state | אין כיתה | נמוך |
| P012 | יש להזין מספר שאלות | `components/parent/AssignActivityModal.js:93,122` | assign activity | error_state | שדה ריק/לא חוקי | נמוך |
| P013 | לא ניתן ליצור שאלות — נסו נושא אחר | `components/parent/AssignActivityModal.js:109` | assign activity | error_state | preview נכשל | בינוני: לא ברור אם אין שאלות במקצוע או שגיאת מערכת |
| P014 | שליחת פעילות ל{שם/ילד} | `components/parent/AssignActivityModal.js:193` | assign activity | template | פתיחת modal | נמוך |
| P015 | כותרת / מקצוע / כיתה לפעילות / נושא / מספר שאלות / רמת קושי | `AssignActivityModal.js:213,224,240,259,290,314` | assign activity | static | טופס | נמוך |
| P016 | מספר השאלות מוגבל עד {MAX} | `AssignActivityModal.js:308` | assign activity | template | count גדול מדי | נמוך |
| P017 | קל / בינוני / קשה | `AssignActivityModal.js:329` | assign activity | static | רמת קושי | נמוך |
| P018 | תצוגה מקדימה / שלח פעילות | `AssignActivityModal.js:343,351` | assign activity | static | טופס | נמוך |
| P019 | שאלות ({N}) | `AssignActivityModal.js:362` | assign activity preview | template | preview קיים | נמוך |
| P020 | פעילויות שנשלחו | `lib/parent-server/parent-activity-labels.client.js:14` | sent activities | static | modal פעילויות | נמוך |
| P021 | ממתין להתחלה / בתהליך / הושלם | `parent-activity-labels.client.js:8-10` | activity status | generated_from_payload | `studentStatus` | בינוני: "ממתין" לא מופיע בדוח עצמו |
| P022 | צפה בתוצאות | `parent-activity-labels.client.js:18` | sent activities | static | פעילות ברשימה | נמוך |
| P023 | עדיין לא נשלחו פעילויות | `ParentSentActivitiesPanel.jsx:256` | sent activities | empty_state | אין פעילויות | נמוך |
| P024 | לא ניתן לטעון תוצאות / שגיאת רשת | `ParentSentActivitiesPanel.jsx:50,56` | activity results | error_state | fetch fail | בינוני: API error יכול לעבור כטקסט לא אחיד |
| P025 | תוצאות פעילות | `ParentSentActivitiesPanel.jsx:81` | activity results | fallback | אין כותרת פעילות | נמוך |
| P026 | מקצוע / נושא / סטטוס / תשובות / נכונות / ציון / התחלה / סיום | `ParentSentActivitiesPanel.jsx:98-109` | activity results | generated_from_payload | detail API | בינוני: raw result בלי הסבר האם משפיע על אבחון/פרסים |
| P027 | פירוט תשובות / שאלה N / נכון / לא נכון / תשובה / תשובה נכונה | `ParentSentActivitiesPanel.jsx:115-154` | activity results | generated_from_payload | קיימות תשובות | נמוך-בינוני: RTL/מספרים/תשובות mixed |
| P028 | חזרה לדוח מורה / לוח בקרה | `ParentReportExitNav.jsx:30,33` | report nav | static | מקור teacher | נמוך |
| P029 | חזור לדוח הורים / חזרה לפורטל הורים | `ParentReportExitNav.jsx:51,55` | report nav | static | מקור parent | נמוך |
| P030 | טוען דוח... | `pages/learning/parent-report.js:1326` | short report | static | loading | נמוך |
| P031 | נדרשת התחברות... / אין גישה... / לא ניתן לטעון... / שגיאת רשת | `parent-report.js:1102-1167,1339` | short report | error_state | auth/API fail | בינוני |
| P032 | דוח להורים | `parent-report.js:1383` | short report empty | static | אין report | נמוך |
| P033 | אין עדיין מספיק פעילות בתקופה שנבחרה. אחרי קצת תרגול יופיע כאן סיכום. | `parent-report.js:1385-1387` | short report | empty_state | 0 שאלות ו-0 זמן | בינוני: לא מבדיל כשל נתונים מול אין פעילות |
| P034 | בחר תקופה | `parent-report.js:1392` | short report | static | empty state | נמוך |
| P035 | יום / שבוע / חודש / שנה / תאריכים מותאמים / מתאריך / עד תאריך / הצג | `ReportDateRangeControl.jsx:67,77,86,96,106,113,126,146` | report range | static | range picker | נמוך |
| P036 | זמן כולל / שאלות / דיוק כללי / רמה | `parent-report.js` summary cards | static/generated | report summary | נדרש `summary` | בינוני אם time estimated |
| P037 | מצב הנתונים בדוח | `ParentReportDataHealthNote.jsx:35` | data health | static | יש data health | נמוך |
| P038 | נתונים מצומצמים במקצועות: {רשימה} | `ParentReportDataHealthNote.jsx:41` | data health | generated_from_payload | `thinEvidenceSubjectsHe` | נמוך-בינוני |
| P039 | {מקצוע}: לא תורגל בתקופה שנבחרה | `subject-evidence-policy.js:58-59` | data health / diagnostics | generated_from_payload | q=0 | נמוך, מגן מפני טעות |
| P040 | {מקצוע}: {N} שאלות... עדיין מעט מידע | `subject-evidence-policy.js:66-68` | data health / diagnostics | generated_from_payload | 1-7 שאלות | נמוך, מגן מפני overclaim |
| P041 | סיכום חכם להורה / תובנה להורה | `ParentReportInsight.jsx:143,155` | report AI insight | ai_generated / fallback | `explanation.ok` | בינוני: source label חשוב |
| P042 | מה הולך טוב / תחומים לחיזוק / טיפים לבית | `ParentReportInsight.jsx:88,99,110` | report AI insight | generated_from_payload | structured explanation | בינוני |
| P043 | סיכום נכתב על ידי מודל AI... ועבר אימות בטיחות | `ParentReportInsight.jsx:147` | report AI insight | ai_generated | structured AI | בינוני: עלול להיתפס כאישור איכות מלא |
| P044 | סיכום זה נבנה אוטומטית מנתוני הדוח... | `ParentReportInsight.jsx:148` | report AI insight | fallback | deterministic structured | נמוך-בינוני |
| P045 | הודעות מהמורה / מה חשוב לדעת / מה מומלץ לעשות בבית | `ParentReportParentSections.jsx:82,119,132` | parent sections | static + generated | parentFacing/teacher messages | בינוני: body מגיע משרת/מורה |
| P046 | הבהרה חשובה | `ParentReportImportantDisclaimer.js:13` | report/PDF | static | תמיד בדוח | נמוך |
| P047 | הדוח, ההמלצות והתובנות... כלי עזר לימודי... אינם מהווים אבחון... | `ParentReportImportantDisclaimer.js:17-25` | report/PDF | static | תמיד בדוח | נמוך, מגן משפטית |
| P048 | מידע מועט בנושא — כדאי להמשיך בתרגול... | `parent-report-v2.js:896-897` | diagnostics | fallback | אין evidence lines | בינוני: fallback מסתיר פירוט חסר |
| P049 | ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא. | `parent-report-v2.js:914-915` | strength | generated_from_payload | strength unit | בינוני: צריך מספיק ראיות |
| P050 | על סמך {N} שאלות... נראית שליטה יציבה עם דיוק {ACC}% | `parent-report-v2.js:928-929` | strength | generated_from_payload | volume + accuracy | בינוני אם N נמוך |
| P051 | עד כמה הנתונים מבוססים כרגע: מוגבלת/בינונית/טובה | `parent-report-v2.js:894,981` | evidence | generated_from_payload | evidence contract | נמוך |
| P052 | בנושא {שם}: עדיף עוד קצת תרגול לפני שקובעים כיוון סופי | `parent-report-v2.js:1546-1603` | diagnostic summary | fallback | no pattern/withhold/probe | נמוך-בינוני |
| P053 | חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה... | `parent-report-v2.js:2457-2458` | grade health | generated_from_payload | mixed grade | נמוך, אך יכול להיות לא בולט |
| P054 | כבר רואים כיוון ברור בנושא הזה | `confidence-parent-he.js:9-10` | confidence | generated_from_payload | confidence=high | בינוני: ניסוח בטוח |
| P055 | יש כיוון ראשוני... צריך עוד תרגולים | `confidence-parent-he.js:11-12` | confidence | generated_from_payload | confidence=moderate | נמוך |
| P056 | בתקופה שנבחרה עדיין מעט חומר לנושא... | `confidence-parent-he.js:17-18` | confidence | generated_from_payload | insufficient_data | נמוך |
| P057 | הילד הצליח גם מעל רמת הכיתה... אפשר לשקול להעלות קושי | `grade-insight-he.js:73-75` | grade insight | generated_from_payload | higher + strength | בינוני-גבוה אם מעט שאלות |
| P058 | התרגול בוצע מעל רמת הכיתה... לא בהכרח מעיד על פער | `grade-insight-he.js:77-78` | grade insight | generated_from_payload | higher + weak | נמוך, מגן |
| P059 | התרגול בוצע מתחת לכיתה הרשומה... צורך בחיזוק היסודות | `grade-insight-he.js:63-65` | grade insight | generated_from_payload | lower + needsSupport | בינוני |
| P060 | נראה שיש שליטה ב{נושא}; כדאי לשקול להפנות חלק מזמן התרגול... | `grade-insight-he.js:98-102` | copilot/reallocation | generated_from_payload | mastery path | בינוני-גבוה אם gate חלש |
| P061 | לא הייתה פעילות תרגול בתקופה האחרונה... | `parent-report-parent-facing.server.js:166-167` | parentFacing insight | generated_from_payload | 0 answers & sessions | נמוך |
| P062 | יש עדיין מעט נתוני תרגול... | `parent-report-parent-facing.server.js:170-171,214-215` | parentFacing insight | generated_from_payload | totalAnswers<15 / soften | נמוך |
| P063 | נראה שיש קושי ב{מקצוע}... | `parent-report-parent-facing.server.js:181` | parentFacing insight | generated_from_payload | weakest subject + gate | גבוה אם 5-7 שאלות בלבד |
| P064 | יש טעויות חוזרות ב{נושא}... | `parent-report-parent-facing.server.js:188-190` | parentFacing insight | generated_from_payload | weak topic | בינוני |
| P065 | יש התקדמות יחסית ב{מקצוע}... | `parent-report-parent-facing.server.js:207-208` | parentFacing insight | generated_from_payload | strongest subject | בינוני |
| P066 | להקדיש 10 דקות ביום... / לפתור כמה שאלות קלות... | `parent-report-parent-facing.server.js:270-302` | home recommendations | template | weakest/totalAnswers | בינוני |
| P067 | נושא לחיזוק: {topic} / מוקד לתרגול: {focus} | `parent-report-diagnostic-visible.server.js:181-183` | diagnostic visible | generated_from_payload | diagnostic metadata | בינוני |
| P068 | דוח מקיף לתקופה | `parent-report-detailed.js:1539` | detailed report | static | payload קיים | נמוך |
| P069 | תקציר להדפסה / דוח מלא | `parent-report-detailed.js:1542` | detailed report/PDF | static | displayMode | בינוני: PDF summary שונה מ-full |
| P070 | טווח תאריכים / מצב תקופה | `parent-report-detailed.js:1548-1551` | detailed report | generated_from_payload | periodInfo | נמוך |
| P071 | מה עשינו בתקופה הזאת / כיסוי לפי מקצוע | `parent-report-detailed.js:1558,1579` | detailed report | static | payload | נמוך |
| P072 | מקצועות שלא תורגלו בתקופה / מקצועות בולטים | `parent-report-detailed.js:1605,1613` | detailed report | generated_from_payload | coverage arrays | נמוך |
| P073 | מקוצר: מילה לכל מקצוע / פירוט מקצועי נוסף | `parent-report-detailed.js:1675,1683` | detailed summary/PDF | static | summary mode | בינוני: מסתיר עומק |
| P074 | אין מקצועות עם מספיק נתונים להצגה בתקופה שנבחרה | `parent-report-detailed.js:1697,1847` | detailed report | empty_state | no visibleSubjectProfiles | בינוני: מקצועות 0 שאלות נעלמים מה-section |
| P075 | מקצועות הלימוד / שאלות: {N} / דיוק: {ACC}% | `parent-report-detailed.js:1710,1719-1720` | detailed report | generated_from_payload | subject profile | נמוך |
| P076 | דוגמאות מהתרגול — לעיון ההורים... | `parent-report-detailed.js:1743-1744` | detailed report | static/generated | evidence examples | נמוך |
| P077 | תמונת מצב לפי נושאים | `parent-report-detailed.js:1761` | detailed report | static | topic rows | נמוך |
| P078 | נושאים שדורשים ליווי בתקופה שנבחרה | `parent-report-detailed.js:1787` | detailed report | static + generated | topicRecommendations | בינוני |
| P079 | פירוט נוסף למי שרוצה להעמיק | `parent-report-detailed.js:1855` | detailed report/PDF | static | details | בינוני: print CSS עשוי לפתוח details |
| P080 | הדפס מלא / הדפס תקציר / חזרה ללמידה | `parent-report-detailed.js:1892,1899,1905` | detailed report | static | no-pdf buttons | נמוך |
| P081 | שאלו על הדוח | `parent-copilot-panel.jsx:242` | Copilot | static | detailed report | בינוני: לא ב-PDF |
| P082 | מידע על שימוש ב-AI | `parent-copilot-panel.jsx:247` | Copilot | static | detailed report | נמוך |
| P083 | אפשר לשאול כאן בחופשיות... | `parent-copilot-panel.jsx:250-251` | Copilot | static | detailed report | נמוך |
| P084 | מעבד את הדוח… | `parent-copilot-panel.jsx:90` | Copilot | static | waiting | נמוך |
| P085 | מה לעשות היום בבית? / מה לעשות השבוע? / מה לא לעשות עכשיו? | `parent-copilot-panel.jsx:197-204` | Copilot quick actions | static | quick action | בינוני |
| P086 | לא ניתן לענות על השאלה כרגע... | `parent-copilot-panel.jsx:152-155` | Copilot error | error_state | exception | בינוני: סיבת כשל מוסתרת |
| P087 | קטלוג המלצות grade-aware: "כדאי לתרגל..." / "בשבוע הקרוב..." | `grade-aware-recommendation-templates.js:26-568+` | recommendations | template | taxonomy+grade+bucket | בינוני: צריך לוודא evidence gate |
| P088 | קטלוג executive/detailed: "להתמקד השבוע...", "הדוח חלקי...", "תמונה מעורבת..." | `detailed-parent-report.js:493-570,1466-1482` | executive summary | generated_from_payload | executive builder | בינוני |
| P089 | PDF/print משתמש באותו DOM ומסתיר `.no-pdf` | `parent-report.js:1416-1506`, `parent-report-detailed.js:1517-1519` | PDF | pdf_rendered | print | גבוה: Copilot לא נכנס ל-PDF |

## מיפוי משפט → מקור → תנאי הופעה

### אין נתונים / מעט נתונים / מספיק נתונים

- אין פעילות בדוח קצר: `אין עדיין מספיק פעילות...` מופיע כאשר `!report || !report.summary || totalQuestions===0 && totalTimeMinutes===0`. הוא לא מבדיל בין "אין פעילות אמיתית" לבין "כשל מקור נתונים". סיכון בינוני.
- אין תרגול במקצוע: `{מקצוע}: לא תורגל בתקופה שנבחרה` מופעל ב-`classifySubjectEvidenceTier(q) === none`. זה ניסוח זהיר שמונע אבחון על מקצוע שלא נבדק.
- מעט נתונים: `{מקצוע}: {N} שאלות... עדיין מעט מידע` מופעל ב-1 עד 7 שאלות. זה ניסוח מגן.
- "יש כיוון ברור": מופעל לפי `confidence=high`. לא נבדק ב-runtime האם בכל surface מוצג יחד עם N שאלות.

### פעילות אישית / ספר / תרגול / אבחון

- קיימות תבניות מקור ראיה ב-`grade-insight-he.js`: "בפעילות שנשלחה מההורה", "בתרגול עצמאי", "לאחר עבודה בספר", "בפעילות מהכיתה".
- לא הוכח שכל surface בדוח מציג את מקור הראיה ליד כל המלצה. במיוחד בדוח parentFacing והמלצות ביתיות, provenance לא תמיד גלוי.
- פעילות שהורה שלח מוצגת בדשבורד/תוצאות, אבל פעילות שלא התחילה לא מופיעה בדוח התקופה לפי audits קודמים.

### חוזקות / חולשות / המלצות

- חוזקות: "ביצועים גבוהים ועקביים", "נראית שליטה יציבה" נוצרות מה-engine/summary. הסיכון הוא הצגה חזקה מדי אם N נמוך או אם source הוא raw metric ולא אבחון.
- חולשות: "נראה שיש קושי ב..." מגיע מ-`parent-report-parent-facing.server.js` ויכול להופיע לפי weakest subject. סיכון גבוה אם הסף הוא 5–7 שאלות ולא מלווה hedge.
- המלצות: קטלוג `grade-aware-recommendation-templates.js` מכיל מאות נוסחי "כדאי לתרגל..." ו"בשבוע הקרוב...". לא נבדקה כל וריאציה בנפרד; הסיכון המרכזי הוא לא הטקסט עצמו אלא gating לפני הופעתו.

## ממצאים חוסמי השקה

1. **אין הוכחת PDF מול UI.** PDF משתמש ב-DOM אך `.no-pdf` מוסתר, Copilot לא נכנס ל-PDF, ו-summary mode מציג פחות מידע. צריך בדיקת DOM text מול PDF text.
2. **ניסוח "נראה שיש קושי ב..." יכול להישמע אבחוני מדי.** מקור: `parent-report-parent-facing.server.js:181`. צריך להוכיח שהסף וה-hedge מספיקים לפני השקה.
3. **מסלול Copilot/AI אינו חלק מה-PDF.** הורה יכול לקבל תשובה ב-Copilot שלא נשמרת בייצוא. צריך החלטת מוצר.
4. **פעילות הורה שלא התחילה לא מקבלת ייצוג בדוח.** הורה עשוי לחשוב שהדוח מתעלם מפעילות ששלח.
5. **שגיאות API יכולות לעבור כטקסט לא אחיד.** במספר מקומות מוצג `json.error`/`message` לפני fallback עברי.

## ממצאים מסוכנים/מטעים

- "הילד הצליח גם מעל רמת הכיתה... אפשר לשקול להעלות קושי" יכול להיות מסוכן אם מופיע בלי מספר שאלות או hedge.
- "נראה שיש שליטה..." ב-`masteryReallocationHe` יכול להוביל להעברת זמן מנושא מסוים אם לא ברור הסף.
- "סיכום נכתב על ידי מודל AI... עבר אימות בטיחות" עלול להיקרא כהבטחת נכונות, לא רק guardrails.
- `תוצאות פעילות` מציג תשובות/ציון, אך לא מסביר אם הפעילות השפיעה על דוח/אבחון/פרסים.
- `אין עדיין מספיק פעילות...` מסתיר אפשרות של כשל טעינת נתונים במסלול local/remote שאינו גלוי.

## בעיות RTL/תצוגה

- בתוצאות פעילות יש שילוב עברית, מספרים, אחוזים, תשובות ו-choices. הקוד משתמש ב-`AssignedActivityBidiText` לחלק מהשדות, וזה טוב, אך לא נבדק בדפדפן.
- תאריכים ב-`ReportDateRangeControl` הם `input type=date` עם `dir="ltr"` בתוך UI עברי. לא נבדק אם PDF/מסך מציגים טווחים תקין ב-RTL.
- טבלאות דוח הורים כוללות מספרים ואחוזים. יש print CSS רב לתיקון צבעים/טבלאות, אך לא נבדק PDF חי.
- כותרות נושא/מקצוע generated עלולות להכיל raw subject key אם formatter נכשל; לא נמצא מקרה מוכח בדוח הראשי, אך זוהה כסיכון ב-school-linked mini report.

## בעיות PDF אם קיימות

- Short report: PDF הוא print של `#parent-report-pdf`; לא מנוע נפרד. זה מפחית סיכון חישוב שונה אך לא מוכיח parity.
- Detailed report: `ParentCopilotShell` נמצא בתוך `no-pdf`, ולכן Copilot לא מודפס.
- Detailed report: `displayMode=summary` מציג פחות עומק מ-full, וזו בחירת משתמש; עדיין צריך label ברור ב-PDF.
- `ParentReportInsight` יכול להיות deterministic baseline בעת print ואז AI enriched במסך מאוחר יותר. לא מוכח בפועל, אבל מסלול הקוד מאפשר פער timing.
- `<details>` בדוח המפורט יכולים להיפתח ב-print גם אם לא נפתחו במסך. זה עלול לגרום PDF עשיר יותר מהמסך.

## המלצות להמשך בדיקה

1. להריץ בדיקת Playwright שמצלמת DOM visible text ו-PDF extracted text לאותו payload.
2. לבדוק תרחיש 0 שאלות, 1–7 שאלות, 8+ שאלות, 12+, 15+ ולוודא wording אחיד.
3. לבדוק parent activity: not_started / in_progress / submitted, ולהשוות dashboard מול report/PDF.
4. לבדוק higher/lower grade עם N נמוך ו-N גבוה כדי לוודא שהניסוח לא בטוח מדי.
5. לבדוק Copilot: האם תשובות חשובות צריכות להופיע ב-PDF או להישמר כנספח.
6. לבדוק שגיאות API אמיתיות ולוודא שכל הודעה שמגיעה להורה בעברית.
7. להריץ RTL visual audit לטבלאות, אחוזים, תאריכים ותשובות מעורבות עברית/אנגלית/מספרים.

## הערת ודאות

מסמך זה מבוסס קריאת קוד ותוצאות חיפוש בלבד. לא הורץ דפדפן, לא נוצר PDF חי, ולא נבדק DB אמיתי. כל "מוכח" הוא מוכח בקוד; כל parity מול UI/PDF הוא לא מוכח עד בדיקה חיה.

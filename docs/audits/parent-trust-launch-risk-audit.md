# Parent Trust Launch Risk Audit

**סוג:** Audit read-only — ללא שינוי קוד  
**תאריך:** 2026-06-15  
**מטרה:** לזהות סיכונים שעלולים לגרום להורה לאבד אמון במערכת (דוחות, המלצות, נתונים, חוזקות/חולשות, זמן, פעילות)  
**מצב הוכחה:** ממצאים מסומנים כ**מוכח** רק כשיש הפניה לקוד או לתוצאת בדיקה שהורצה ב-audit זה / מתועדת ב-artifacts. אחרת: **לא מוכח** או **לא נבדק**.

---

## 1. Scope — מה נבדק

| תחום | נבדק? | הערות |
|------|--------|--------|
| מנוע דוח הורה קצר (V2) | כן | קריאת קוד + QA מתועד |
| דוח מפורט + PDF | כן (קוד + QA מתועד; לא הורצה מחדש matrix מלא) | |
| `parentFacing` שרת (תובנות/המלצות בית) | כן | |
| Copilot הורה (חוזה intent + composers) | כן (קוד + selftest) | |
| מדיניות ראיות מקצוע/נושא (0 / דל / תקף) | כן | |
| זמן למידה + sanity caps | כן (קוד + QA מתועד) | |
| כוכבים / פרסים / achievements | כן (קוד) | |
| פעילויות שנשלחו מההורה | כן (קוד + selftest) | |
| תרגול בכיתה שונה (מעל/מתחת) | כן (קוד + selftest) | |
| טווחי תאריכים | כן (קוד) | |
| ניסוח עברית / הסתרת אי-ודאות | כן (קוד) | |
| UI מול PDF (דוח קצר) | חלקי | QA מתועד PASS; לא הורצה הדפסה חיה ב-audit זה |
| UI מול PDF (דוח מפורט + AI async) | כן (קוד) | |
| Production / staging חי | **לא נבדק** | |
| כל 48 תרחישי `PARENT_REPORT_LAUNCH_QA.md` | **לא נבדק מחדש** | מסמך היסטורי מ-2026-06-08 מראה 0/48 FAIL |

### תרחישי משתמש שנבדקו בקוד (לא בהכרח E2E חי)

- ילד עובד הרבה במקצוע חזק  
- ילד עובד בכיתה מעל/מתחת  
- הורה שולח פעילות — מסיים / לא מסיים  
- אין מספיק שאלות / אין שאלות במקצוע  
- זמן ארוך + מעט תשובות / תשובות בלי זמן  
- PDF מול UI  

---

## 2. קבצים / מודולים שנבדקו

### Pipeline דוח

| קובץ | תפקיד |
|------|--------|
| `utils/parent-report-v2.js` | מנוע דוח קצר: סינון תאריכים, overview, stars/achievements, `gradePracticeMeta` |
| `utils/detailed-parent-report.js` | דוח מפורט |
| `lib/parent-server/report-data-aggregate.server.js` | אגרגציה מ-DB (sessions, parent activities, duration, grade) |
| `lib/parent-server/parent-report-parent-facing.server.js` | תובנות/המלצות בית דטרמיניסטיות |
| `lib/parent-server/parent-facing-report-authority.js` | סמכות שרת; דיכוי diagnostics דקים |
| `lib/parent-server/report-duration-sanity.js` | תקרות duration |
| `lib/learning-supabase/parent-report-from-api-payload.js` | גשר API → דוח |
| `pages/learning/parent-report.js` | UI + print CSS דוח קצר |
| `pages/learning/parent-report-detailed.js` | UI + print דוח מפורט + enrich AI async |

### ראיות, שערים, שפה

| קובץ | תפקיד |
|------|--------|
| `utils/parent-report-language/subject-evidence-policy.js` | 0 / 1–7 / 8+ שאלות מקצוע |
| `utils/parent-report-topic-evidence.js` | סף נושא 8 / 12 / 40 |
| `utils/parent-report-decision-gates.js` | `weak` if `q < 12` |
| `utils/parent-report-diagnostic-restraint.js` | ריסון 4 / 8 שאלות |
| `lib/learning/evidence-quality.js` | 0 / 1–4 / 5–11 / 12+recurrence |
| `utils/parent-report-language/grade-insight-he.js` | פרשנות כיתה מעל/מתחת |
| `utils/parent-report-language/confidence-parent-he.js` | "כיוון ראשוני" / "כיוון ברור" |
| `utils/parent-report-language/subject-withhold-summary-he.js` | ניסוח זהיר ב-withhold |
| `utils/parent-report-recommendation-consistency.js` | המלצות + grade scope |

### Copilot + פעילויות הורה

| קובץ | תפקיד |
|------|--------|
| `utils/parent-copilot/intent-answer-contract.js` | חוזה תשובה + `zero_evidence` |
| `utils/parent-copilot/intent-answer-composers.js` | thresholds חוזק/חולשה |
| `components/parent/ParentSentActivitiesPanel.jsx` | פעילויות שנשלחו (דשבורד) |
| `lib/parent-server/parent-activity.server.js` | CRUD + סטטוסים |
| `lib/parent-server/parent-activity-labels.client.js` | "ממתין להתחלה" / "בתהליך" / "הושלם" |
| `components/parent/ParentReportDataHealthNote.jsx` | הערת מצב נתונים + mixed grade |

### תאריכים + PDF

| קובץ | תפקיד |
|------|--------|
| `lib/reporting/parent-report-date-range.js` | week/month/day/schoolYear/custom |
| `utils/math-report-generator.js` | `exportReportToPDF` → `window.print()` |

### QA / בדיקות (נקראו; חלק הורצו)

| artifact / script | תוצאה |
|-------------------|--------|
| `docs/qa/PARENT_REPORT_VISIBLE_TRUTH_AUDIT.md` | 212/212 PASS (לא הורץ מחדש) |
| `docs/qa/PARENT_REPORT_NUMERIC_SUFFICIENCY_SANITY_BLOCKER.md` | 115/115 PASS (לא הורץ מחדש) |
| `npm run test:parent-report-zero-evidence-policy` | **PASS** (הורץ ב-audit) |
| `node scripts/parent-activity-grade-evidence-selftest.mjs` | **61/61 PASS** (הורץ ב-audit) |
| `npm run test:parent-report-narrative-safety` | **17/17 PASS** (הורץ ב-audit) |
| `docs/qa/PARENT_REPORT_LAUNCH_QA.md` | 0/48 FAIL (היסטורי; לא הורץ מחדש) |

---

## 3. Top 20 Trust Risks

| # | סיכון | חומרה | מוכח? |
|---|--------|--------|--------|
| R01 | כוכבים/הישגים לכל החיים לצד מדדים לפי תקופה | HIGH | מוכח (קוד) |
| R02 | ספי "מספיק נתונים" סותרים (5 / 8 / 12 / 15) | HIGH | מוכח (קוד) |
| R03 | תובנות שרת "חזקות" מ-5 שאלות מקצוע | HIGH | מוכח (קוד) |
| R04 | פעילות הורה שלא הושלמה — לא מופיעה בדוח | HIGH | מוכח (קוד) |
| R05 | סמכות שרת מסתירה diagnostics עשירים מה-UI | MEDIUM | מוכח (קוד) |
| R06 | PDF דוח מפורט לפני enrich AI | MEDIUM | מוכח (קוד) |
| R07 | "כיוון ברור" / "כיוון ראשוני" בעברית vs נפח נמוך | MEDIUM | מוכח (קוד) |
| R08 | פרשנות כיתה מעל/מתחת נשמעת חדה בלי נפח באותה משפט | MEDIUM | מוכח (קוד) |
| R09 | חוזק ב-overview בלי hedge לנפח 4–7 שאלות | MEDIUM | מוכח (קוד) |
| R10 | רשימת "מצוינים" דורשת ≥10 שאלות לנושא | MEDIUM | מוכח (קוד) |
| R11 | שינוי preset תאריך משנה מסקנות בלי הסבר להורה | MEDIUM | מוכח (קוד) |
| R12 | Copilot: "נראה שיש שליטה" מ-Q≥24 בלבד | MEDIUM | מוכח (קוד) |
| R13 | הערת mixed-grade קלה לפספס | LOW | מוכח (קוד) |
| R14 | גrafים מוסתרים כש-`totalQuestions ≤ 14` | LOW | מוכח (קוד) |
| R15 | המלצות בית גנריות גם כשיש נתונים עשירים (thin server) | MEDIUM | מוכח (קוד) |
| R16 | זמן למידה — under-count ב-runtime | MEDIUM | **לא מוכח** (יש unit tests; לא E2E) |
| R17 | מקצוע בלי שאלות — תובנה שגויה | CRITICAL | **מ mitigated** — visible truth 212/212 PASS |
| R18 | duration מנופח (30k דק') | CRITICAL | **מ mitigated** — numeric sanity 115/115 PASS |
| R19 | PDF ≠ UI דוח קצר | LOW | **לא מוכח** ב-audit זה; QA matrix 20/20 PASS מתועד |
| R20 | Launch QA מלא (48 תאים) | HIGH | **לא נבדק מחדש** — doc היסטורי FAIL |

---

## 4. פירוט סיכונים (Top 20)

### R01 — כוכבים והישגים לא מסוננים לפי תקופת הדוח

| שדה | תוכן |
|-----|------|
| **תרחיש** | הורה בוחר "שבוע אחרון". רואה `0` שאלות / `5` דקות, אבל `⭐ 847 • 🏆 12`. |
| **איפה בקוד** | `utils/parent-report-v2.js` — `stars`/`achievements` מ-`loadProgress()` לכל המקצועות; `totalTimeMinutes`/`totalQuestions` מסוננים לטווח |
| **מה ההורה יראה** | בכותרת הדוח: זמן/שאלות לתקופה + כוכבים/הישגים מצטברים (`pages/learning/parent-report.js` ~1907) |
| **למה מסוכן** | נראה שהילד "הרוויח" בתקופה הריקה, או שהמערכת מערבבת היסטוריה עם ביצוע אחרון |
| **בדיקה** | **לא נמצאה** בדיקה שמאמת scope תאריכים ל-stars/achievements |
| **חומרה** | HIGH |
| **המלצה (ללא יישום)** | להציג stars/achievements רק עם תווית "מצטבר" / להסתיר בטווחים קצרים / לסנן לפי תקופה |

---

### R02 — מספר ספי "מספיק נתונים" שונים במקביל

| שדה | תוכן |
|-----|------|
| **תרחיש** | 7 שאלות במקצוע: כרטיס מציג "עדיין מעט מידע" (tier `thin`), בעוד שכבה אחרת מאפשרת מסקנה. |
| **איפה בקוד** | `subject-evidence-policy.js`: valid=**8**; `evidence-quality.js`: preliminary=**5+**; `parent-report-decision-gates.js`: weak if **q<12**; `parent-facing-report-authority.js`: thin if **<15** total; server `MIN_SUBJECT_ANSWERS=**5**` |
| **מה ההורה יראה** | הודעות סותרות: "מעט מידע" בכרטיס מול תובנה/המלצה ב"מה חשוב לדעת" |
| **למה מסוכן** | אין "קול יחיד" — ההורה לא יודע במה לסמוך |
| **בדיקה** | **לא נמצאה** בדיקת אינטגרציה שמאחדת את כל הספים |
| **חומרה** | HIGH |
| **המלצה** | מטריצת סף אחת מפורסמת ל-product + בדיקות cross-layer |

---

### R03 — תובנות שרת "חזקות" מ-5 שאלות מקצוע

| שדה | תוכן |
|-----|------|
| **תרחיש** | 5–7 תשובות diagnostic במקצוע אחד, דיוק נמוך → "נראה שיש קושי בחשבון…" |
| **איפה בקוד** | `parent-report-parent-facing.server.js`: `rankSubjectsByAccuracy(..., MIN_SUBJECT_ANSWERS=5)`; `allowsStrongParentDiagnosisAtStudent` מאפשר `PRELIMINARY` (5–11) ב-`evidence-quality.js` |
| **מה ההורה יראה** | insight עם "נראה שיש קושי" / "יש טעויות חוזרות" כשכרטיס המקצוע עדיין ב-tier `thin` |
| **למה מסוכן** | המלצה/מסקנה שנשמעת מבוססת לפני שיש 8+ שאלות (סף valid של כרטיס) |
| **בדיקה** | narrative-safety 17/17 — **לא מכסה** סף 5 vs 8 במפורש |
| **חומרה** | HIGH |
| **המלצה** | ליישר server insights ל-`SUBJECT_VALID_MIN_QUESTIONS=8` או לניסוח מפורש "סימן ראשוני בלבד" |

**מענה ל-checklist #1, #2:** כן — **מוכח בקוד** שתובנה עלולה להופיע עם מעט נתונים; לא מוכח E2E שהיא "לא נכונה" סטטיסטית.

---

### R04 — פעילות שנשלחה מההורה ולא הושלמה — לא בדוח

| שדה | תוכן |
|-----|------|
| **תרחיש** | הורה שולח פעילות; ילד לא פותח. בדשבורד: "ממתין להתחלה". בדוח התקופה: אין אזכור. |
| **איפה בקוד** | `parent-activity-labels.client.js`: "ממתין להתחלה"; `report-data-aggregate.server.js`: רק `parentActivityAttempts` (תשובות); `ParentSentActivitiesPanel.jsx` — רק דשבורד |
| **מה ההורה יראה** | בדוח: "לא הייתה פעילות" / תובנות כלליות; בדשבורד: פעילות ממתינה |
| **למה מסוכן** | ההורה שולח, בודק דוח, חושב שהמערכת "לא רואה" את מה ששלח |
| **בדיקה** | `parent-activity-grade-evidence-selftest.mjs` — **מכסה** aggregation של attempts, **לא** not_started |
| **חומרה** | HIGH |
| **המלצה** | שורת "פעילויות שנשלחו וטרם הושלמו" בדוח / קישור לדשבורד |

**מענה ל-checklist #5:** כן — **מוכח** שהורה עלול לא לראות פעילות שלא הושלמה בדוח.

---

### R05 — סמכות שרת מסתירה diagnostics מה-UI

| שדה | תוכן |
|-----|------|
| **תרחיש** | דוח נטען מ-API. ההורה רואה `parentFacing` גנרי; כרטיסי diagnostic V2 נעלמים. |
| **איפה בקוד** | `parent-facing-report-authority.js`; `parent-report.js` `buildParentReportDiagnosticsView` — mode `insufficient`, rows `[]` כש-`_parentFacingAuthority === "server"` |
| **מה ההורה יראה** | תובנות שרת בלבד; אין שורות diagnostic עשירות שהמנוע ייצר מקומית |
| **למה מסוכן** | "ריקון" של עומק הדוח בלי הסבר; ההורה לא יודע שמידע נדחה |
| **בדיקה** | **לא נמצאה** בדיקת UX שמסבירה דיכוי ל-parent |
| **חומרה** | MEDIUM |
| **המלצה** | הודעה "הדוח מבוסס על סיכום שרת" / הצגת diagnostics מסוננים |

---

### R06 — PDF דוח מפורט לפני סיום enrich AI

| שדה | תוכן |
|-----|------|
| **תרחיש** | הורה מדפיס מיד; AI summary עדיין נטען async. |
| **איפה בקוד** | `parent-report-detailed.js` ~469–473: `enrichDetailedParentReportWithParentAi` אחרי render |
| **מה ההורה יראה** | PDF בלי בלוק AI; UI מעודכן שניות אחרי |
| **למה מסוכן** | PDF ≠ UI לדוח מפורט |
| **בדיקה** | **לא נמצאה** בדיקה אוטומטית ל-async gap |
| **חומרה** | MEDIUM |
| **המלצה** | חסימת print עד baseline deterministic; סימון "טיוטה" ב-PDF |

**מענה ל-checklist #10:** חלקי — דוח **קצר** = אותו DOM (print); דוח **מפורט** = **מוכח** פער async.

---

### R07 — עברית שנשמעת ודאית מול נפח נמוך

| שדה | תוכן |
|-----|------|
| **תרחיש** | confidence `moderate` → "יש כיוון ראשוני…"; `high` → "כבר רואים כיוון ברור" |
| **איפה בקוד** | `confidence-parent-he.js`; `subject-withhold-summary-he.js` — "אפשר לראות תמונה עקבית" |
| **מה ההורה יראה** | משפטים שנשמעים כמו מסקנה סופית |
| **למה מסוכן** | מסתיר אי-ודאות (#12 checklist) |
| **בדיקה** | `test:parent-report-narrative-safety` **17/17 PASS** — כיסוי חלקי |
| **חומרה** | MEDIUM |
| **המלצה** | audit copy לכל surface; יישור עם `ZERO_EVIDENCE_FORBIDDEN_RE` |

---

### R08 — פרשנות כיתה מעל/מתחת — ניסוח חד

| שדה | תוכן |
|-----|------|
| **תרחיש** | 3 שאלות מעל הכיתה, 100% → "הילד הצליח גם מעל רמת הכיתה…" |
| **איפה בקוד** | `grade-insight-he.js` `gradeScopeMeaningHe` — `isStrength` + `higher` |
| **מה ההורה יראה** | המלצה להעלות קושי בלי mention נפח באותה משפט |
| **למה מסוכן** | over-interpretation (#4, #17) |
| **בדיקה** | `parent-activity-grade-evidence-selftest.mjs` — phrasing, **לא** volume gate |
| **חומרה** | MEDIUM |
| **המלצה** | append volume hedge כש-Q < 8 |

---

### R09 — חוזק ב-overview בלי hedge (4–7 שאלות)

| שדה | תוכן |
|-----|------|
| **תרחיש** | יחידת חוזק עם 6 שאלות → שורת "חוזק" ב-overview בלי "עדיין מוקדם לקבוע" |
| **איפה בקוד** | `unitRequiresShortThinOverviewHedge` — רק **1–3** שאלות + withhold; strength lines **לא** מקבלות hedge |
| **מה ההורה יראה** | "חשבון: חיבור: 6 שאלות, דיוק 92%" כ"אזור חזק" |
| **למה מסוכן** | חוזק מוצג חזק מדי (#13) |
| **בדיקה** | **לא נמצאה** |
| **חומרה** | MEDIUM |
| **המלצה** | hedge ל-strength עד 8 שאלות |

---

### R10 — הצלחה משמעותית לא ב"מצוינים"

| שדה | תוכן |
|-----|------|
| **תרחיש** | ילד עובד הרבה במקצוע חזק — 9 שאלות, דיוק גבוה — לא נכנס ל-`excellent` |
| **איפה בקוד** | `parent-report-v2.js` ~2133–2135: `d.excellent && d.questions >= 10` |
| **מה ההורה יראה** | overview strength אפשרי; רשימת "מצוינים" ריקה |
| **למה מסוכן** | הורה לא רואה הצלחה בולטת (#3) |
| **בדיקה** | **לא נמצאה** |
| **חומרה** | MEDIUM |
| **המלצה** | יישור סף excellent עם topic evidence |

---

### R11 — preset תאריך משנה מסקנות בלי הסבר

| שדה | תוכן |
|-----|------|
| **תרחיש** | "יום" vs "חודש" vs "שנת לימודים" — insights שונים לגמרי |
| **איפה בקוד** | `parent-report-date-range.js` — rolling 7/30 vs school year; `reportPeriodEndMs` ל-inactivity |
| **מה ההורה יראה** | אותו UI, מסקנות שונות; אין "למה השתנה" |
| **למה מסוכן** | (#11, #18) — אי-אמון ב"מד science" |
| **בדיקה** | `scripts/tests/report-date-range-*.mjs` — **לא הורץ** ב-audit |
| **חומרה** | MEDIUM |
| **המלצה** | שורת הקשר: "המסקנות מבוססות על X–Y" + אזהרה בשינוי preset |

---

### R12 — Copilot: reallocation מ-"נראה שיש שליטה"

| שדה | תוכן |
|-----|------|
| **תרחיש** | "האם כדאי להתמקד בנושא אחר?" — 24+ שאלות, accuracy≥75 → "נראה שיש שליטה…" |
| **איפה בקוד** | `intent-answer-composers.js`: `MASTERY_REALLOCATION_Q_MIN=24`, `masteryReallocationHe` |
| **מה ההורה יראה** | עצה להפחית תרגול בנושא שהילד "שולט" בו |
| **למה מסוכן** | נשמע כמו אבחון, gate רך (#15) |
| **בדיקה** | selftest grade-evidence — **61/61 PASS** (כולל progression) |
| **חומרה** | MEDIUM |
| **המלצה** | קשור ל-`conclusionStrength` / gates, לא רק Q |

---

### R13 — הערת תרגול mixed-grade קלה לפספס

| שדה | תוכן |
|-----|------|
| **תרחיש** | ילד מתרגל בכיתה אחרת; שורות מסומנות בנושא אבל ההערה הכללית קטנה |
| **איפה בקוד** | `gradePracticeMeta.mixedGradePracticeNoteHe`; `ParentReportDataHealthNote.jsx`; `parentFacingTopicRowLabelHe` |
| **מה ההורה יראה** | תווית בשורה + הערה amber קטנה "חלק מהתרגול בוצע בכיתה שונה…" |
| **למה מסוכן** | (#4, #17) — פרשנות שגויה אם לא שמו לב |
| **בדיקה** | selftest grade labels — **PASS** |
| **חומרה** | LOW |
| **המלצה** | prominence גבוה יותר ב-summary |

---

### R14 — גrafים מוסתרים בנפח גלובלי נמוך

| שדה | תוכן |
|-----|------|
| **תרחיש** | 14 שאלות סה"כ — אין charts; יש תובנות טקסט |
| **איפה בקוד** | `parent-report.js`: `PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX = 14` |
| **מה ההורה יראה** | דוח "שטוח" בלי ויזואליזציה |
| **למה מסוכן** | פחות שקיפות; לא סותר נתונים |
| **בדיקה** | **לא נמצאה** |
| **חומרה** | LOW |
| **המלצה** | הודעה "גרפים יופיעו אחרי 15+ שאלות" |

---

### R15 — thin server → המלצות גנריות בלבד

| שדה | תוכן |
|-----|------|
| **תרחיש** | <15 תשובות — diagnostics נמחקים; נשארות המלצות כלליות ("תרגול קצר וקבוע") |
| **איפה בקוד** | `parent-facing-report-authority.js` `THIN_DATA_MAX_ANSWERS=15` |
| **מה ההורה יראה** | דוח "ריק" מ professionally tailored advice |
| **למה מסוכן** | ההורה חושב שהמערכת לא מבינה את הילד |
| **בדיקה** | **לא נמצאה** E2E |
| **חומרה** | MEDIUM (בטיחותי אך מתסכל) |
| **המלצה** | copy: "עדיין מוקדם להמלצות ממוקדות — הנה מה שכן אפשר" |

---

### R16 — זמן למידה — under-count

| שדה | תוכן |
|-----|------|
| **תרחיש** | ילד ענה על שאלות אבל visibility clock / tier cap לא זיכה זמן |
| **איפה בקוד** | `utils/learning-time-credit/`; `hooks/useLearningVisibilityClock.js` |
| **מה ההורה יראה** | דקות נמוכות מול effort אמיתי |
| **למה מסוכן** | (#8, #9) |
| **בדיקה** | `tests/learning/learning-time-credit.test.mjs` — **לא הורץ** ב-audit |
| **חומרה** | MEDIUM — **לא מוכח** ב-runtime |
| **המלצה** | QA scenario: many answers + low credited time |

---

### R17 — מקצוע 0 שאלות + תובנה (mitigated)

| שדה | תוכן |
|-----|------|
| **תרחיש** | אנגלית 0 שאלות + "טעויות באנגלית" |
| **איפה בקוד** | `filterRecentMistakesForVisibleSubjects`, `filterInsightLinesForUnpracticedSubjects` |
| **מה ההורה יראה** | "לא תורגל בתקופה שנבחרה" — ללא תובנות סותרות |
| **למה היה מסוכן** | root cause AAA4 — **תוקן** |
| **בדיקה** | visible truth **212/212 PASS**; zero-evidence policy **PASS** |
| **חומרה** | CRITICAL → **mitigated** |
| **המלצה** | שמור gates ב-release |

**מענה #6, #7, #16:** mitigated / מוכח ב-policy.

---

### R18 — duration מנופח (mitigated)

| שדה | תוכן |
|-----|------|
| **תרחיש** | 30,602 דק' בדוח |
| **איפה בקוד** | `report-duration-sanity.js` — cap 180m/session, 10m/question, 300m/topic |
| **בדיקה** | numeric sanity **115/115 PASS** (artifact 2026-06-09) |
| **חומרה** | CRITICAL → **mitigated** |
| **המלצה** | monitor production seeds |

**מענה #8:** over-count **mitigated**; under-count — R16.

---

### R19 — PDF ≠ UI דוח קצר

| שדה | תוכן |
|-----|------|
| **תרחיש** | הדפסה שונה ממסך |
| **איפה בקוד** | `exportReportToPDF` = print DOM; `@media print` ב-`parent-report.js` |
| **בדיקה** | matrix 20/20 PASS **מתועד**; **לא הורץ** ב-audit זה |
| **חומרה** | LOW — **לא מוכח** כרגע |
| **המלצה** | re-run matrix לפני launch |

---

### R20 — Launch QA matrix 0/48

| שדה | תוכן |
|-----|------|
| **תרחיש** | כל AAA×range נכשל visible checks |
| **איפה** | `docs/qa/PARENT_REPORT_LAUNCH_QA.md` (2026-06-08) |
| **בדיקה** | **לא נבדק מחדש** — ייתכן seed/env; סותר visible truth PASS מאוחר יותר |
| **חומרה** | HIGH — **לא מוכח** כרגע |
| **המלצה** | owner: re-run `parent-report-launch-qa.mjs` ולפרש FAIL |

---

## 5. Blockers להשקה (מומלצים — לא PASS כללי)

| ID | Blocker | מוכח? | הערה |
|----|---------|--------|------|
| B1 | R01 — stars/achievements ללא scope תאריך | כן (קוד) | סיכון אמון ישיר |
| B2 | R02/R03 — ספים סותרים + תובנות מ-5 שאלות | כן (קוד) | המלצה "לא נכונה" **לא מוכח** סטטיסטית; סיכון פרשנות **מוכח** |
| B3 | R04 — פעילות הורה לא מושלמת לא בדוח | כן (קוד) | |
| B4 | R20 — Launch QA לא אומת מחדש | לא מוכח | doc סותר QA מאוחר |

**לא מוכרז PASS להשקה** — יש blockers מוכחים + בדיקות שלא הורצו.

---

## 6. Non-blockers

| ID | נושא | סיבה |
|----|------|------|
| NB1 | zero-evidence במקצוע 0 שאלות | 212/212 + policy PASS |
| NB2 | duration inflation קיצוני | 115/115 PASS + caps |
| NB3 | copilot zero_evidence ל-scope מקצוע | `intent-answer-contract.js` + selftest |
| NB4 | parent activity completed → report | selftest 61/61 |
| NB5 | grade relation phrasing קיים | `grade-insight-he.js` + tests |
| NB6 | narrative safety guard | 17/17 PASS |
| NB7 | מקצוע בלי שאלות — "לא תורגל" | visible truth |

---

## 7. ממצאים לפי חומרה

### CRITICAL (mitigated / historical)

| ממצא | סטטוס |
|------|--------|
| תובנה על מקצוע עם 0 שאלות | **Mitigated** — visible truth PASS |
| duration 30k+ דק' | **Mitigated** — sanity PASS |

### HIGH

| ממצא | ID |
|------|-----|
| stars/achievements lifetime vs period | R01 |
| ספי נתונים סותרים | R02 |
| תובנות שרת מ-5 שאלות | R03 |
| פעילות הורה לא מושלמת לא בדוח | R04 |
| Launch QA לא אומת | R20 |

### MEDIUM

R05, R06, R07, R08, R09, R10, R11, R12, R15, R16 (לא מוכח runtime)

### LOW

R13, R14, R19 (לא מוכח)

---

## 8. בדיקות קיימות שמוכיחות (או mitigating)

| בדיקה | מה מוכיח | הורץ ב-audit? |
|-------|-----------|---------------|
| `test:parent-report-zero-evidence-policy` | אין insight אסור ב-0 שאלות | **כן — PASS** |
| `scripts/parent-activity-grade-evidence-selftest.mjs` | parent activity + grade + copilot phrasing | **כן — 61/61** |
| `test:parent-report-narrative-safety` | overconfidence / thin data guard | **כן — 17/17** |
| `parent-report-visible-truth-audit.mjs` | visible text vs visible Q | לא — artifact **212/212** |
| `parent-report-numeric-sanity-audit.mjs` | duration caps | לא — artifact **115/115** |
| `parent-report-diagnostic-flags-pdf-comparison-matrix.mjs` | PDF cells + leak | לא — **20/20** מתועד |
| `tests/learning/learning-time-credit.test.mjs` | tier credit logic | **לא** |
| `tests/parent-server/parent-assigned-activities.test.mjs` | CRUD + aggregate | **לא** |
| `tests/e2e/parent-report-real-ui-load.spec.ts` | UI load | **לא** |

---

## 9. בדיקות חסרות (פערי אמון)

| פער | תרחיש |
|-----|--------|
| stars/achievements scope vs date range | שבוע vs full + assert counts |
| server insight at 5–7 Q vs subject card thin | fixture אחיד |
| parent activity `not_started` visibility in report | הורה שולח, ילד לא נוגע |
| PDF detailed pre/post AI enrich | print timing |
| date preset flip changes insights | week→month same child |
| long wall time + few answers (runtime) | visibility clock |
| many answers + low time on report | credit pipeline E2E |
| short vs detailed same payload | `audit:parent-report-short-consistency` — **לא הורץ** |
| Launch QA 48 matrix re-run | סתירה עם visible truth |

---

## 10. שאלות פתוחות לבעלים

1. **האם stars/achievements אמורים להיות מצטברים לכל החיים או scoped לתקופה?** (R01)
2. **מה סף מוצרי יחיד ל"מספיק נתונים"?** 5 / 8 / 12 / 15 — איזה layer wins? (R02)
3. **האם פעילות הורה שלא הושלמה חייבת להופיע בדוח?** (R04)
4. **האם Launch QA 0/48 עדיין רלוונטי או superseded by visible truth 212/212?** (R20)
5. **האם AI summary בדוח מפורט הוא חלק contract ל-PDF?** (R06)
6. **האם blockers B1–B4 חוסמים launch או מקובלים כ-debt?**
7. **האם re-run מלא של QA matrix + launch QA נדרש לפני prod?** — **לא בוצע ב-audit זה**

---

## Appendix A — מיפוי 18 שאלות החובה

| # | שאלה | ממצא | הוכחה |
|---|------|------|--------|
| 1 | המלצה לא נכונה | אפשרי בפרשנות מ-5–7 שאלות | קוד; לא E2E |
| 2 | המלצה בלי מספיק נתונים | כן — server PRELIMINARY מ-5 | קוד |
| 3 | לא רואים הצלחה משמעותית | אפשרי — excellent דורש ≥10 | קוד |
| 4 | לא רואים כיתה אחרת | partial — יש labels + note; קל לפספס | קוד |
| 5 | לא רואים פעילות שלא הושלמה | כן | קוד |
| 6 | נתון חסר כאילו אמיתי | mitigated ל-0Q; stars lifetime — R01 | mixed |
| 7 | מקצוע בלי שאלות | "לא תורגל" — mitigated | QA PASS |
| 8 | זמן לא נכון | over — mitigated; under — לא מוכח | QA + tests partial |
| 9 | פרסים ≠ עבודה | stars lifetime — R01 | קוד |
| 10 | PDF ≠ UI | מפורט async — כן; קצר — לא מוכח | mixed |
| 11 | טווח תאריכים מבלבל | כן — בלי הסבר | קוד |
| 12 | עברית מסתירה אי-ודאות | חלקי — "כיוון ברור" | קוד |
| 13 | חוזקות | partial — hedge חלקי | קוד |
| 14 | חולשות מפחידות | "נראה שיש קושי" — בינוני | קוד |
| 15 | נראה מדויק לא מוכח | accuracy % ב-Q נמוך | קוד |
| 16 | חושב שבדקו מקצוע שלא נלמד | mitigated בכרטיסים + copilot zero_evidence | QA |
| 17 | כיתה אחרת מוסברת | כן — grade-insight + note | קוד + selftest |
| 18 | daily/weekly/monthly שונים מדי | כן — בלי הסבר | קוד |

---

## Appendix B — תרחישי משתמש

| תרחיש | תוצאה צפויה בקוד | סיכון |
|--------|-------------------|--------|
| הרבה עבודה במקצוע חזק | overview strength אפשרי; excellent רק ≥10Q | R09, R10 |
| כיתה מעל | `gradeScopeMeaningHe` + row label | R08, R13 |
| כיתה מתחת | framing "בסיס יציב" / "חיזוק היסודות" | R08 |
| הורה שולח + ילד מסיים | ב-report via attempts; source phrase | selftest PASS |
| הורה שולח + לא מסיים | dashboard בלבד | **R04** |
| אין מספיק שאלות | thin cards + generic insights | R02, R03 |
| 0 שאלות במקצוע | "לא תורגל" | mitigated |
| זמן ארוך, מעט תשובות | caps per question | mitigated (QA) |
| תשובות, זמן לא נספר | **לא מוכח** | R16 |
| PDF vs UI | קצר: same DOM; מפורט: async | R06, R19 |

---

*סיום audit. לא בוצעו שינויי קוד, commit, או push.*

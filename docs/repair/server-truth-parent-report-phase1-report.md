# Phase 1: Server Truth — דוח הורים

תאריך: 2026-06-15  
Scope: דוח הורים קצר + מפורט בלבד (לא זמן/פרסים, לא פעילות הורה, לא מורים/בית ספר)

---

## 1. קבצים ששונו

| קובץ | שינוי |
|------|--------|
| `pages/learning/parent-report.js` | חסימת מסלול localStorage; שער פורטל הורה; הסרת `buildLocalParentReports` |
| `pages/learning/parent-report-detailed.js` | חסימת מסלול localStorage; שער פורטל הורה; הסרת קריאה ל-`generateParentReportV2` |
| `lib/parent-report-server-truth.js` | **חדש** — קבועי שער, `makeBridgeFieldProvenance`, זיהוי מסלול רשמי |
| `lib/learning-supabase/bridge-report-provenance.js` | **חדש** — provenance לשדות גשר + `applyBridgeProvenanceToGeneratedReport` |
| `lib/learning-supabase/parent-report-local-dev.js` | **חדש** — `buildLocalParentReportsForDevTest` (לא נגיש מדפי מוצר) |
| `lib/learning-supabase/report-data-adapter.js` | `_bridgeFieldProvenance` לכל topic |
| `lib/learning-supabase/seed-db-report-local-storage.js` | ביטול estimate/default במסלול seed; provenance פנימי לסשן |
| `lib/learning-supabase/parent-report-from-api-payload.js` | הפעלת `applyBridgeProvenanceToGeneratedReport` אחרי יצירת דוח |
| `scripts/parent-report-server-truth-phase1-selftest.mjs` | **חדש** — בדיקות Phase 1 |
| `package.json` | `test:parent-report-server-truth-phase1`; שרשור ל-`test:parent-report-phase6` |

**לא שונו (בכוונה):** `pages/api/parent/students/[studentId]/report-data.js`, `utils/parent-report-v2.js` (מנוע), UI עיצובי, מנוע אבחוני.

---

## 2. מה היה מסלול localStorage לפני

### דוח קצר (`parent-report.js`)

1. `/learning/parent-report` **ללא** `?source=parent|teacher&studentId=…`
2. קריאה ל-`localStorage.getItem("mleo_player_name")`
3. אם יש שם → `buildLocalParentReports()` → `generateParentReportV2` + `generateDetailedParentReport` ישירות על `mleo_*`
4. `useEffect` נוסף בניית מחדש בעת שינוי תקופה

### דוח מפורט (`parent-report-detailed.js`)

1. אותו תנאי — ללא remote source
2. `localStorage.getItem("mleo_player_name")` → `generateParentReportV2` → `buildDetailedParentReportFromBaseReport`
3. מסך "לא נמצא שם שחקן" כשאין `mleo_player_name`

### מסלול A (כבר קיים — נשאר)

`?source=parent|teacher&studentId=…` → API → `runParentReportGenerationFromApiBody` (shim מבודד, לא localStorage אמיתי של הדפדפן).

---

## 3. איך הוא נחסם עכשיו

| תנאי | התנהגות חדשה |
|------|----------------|
| אין `source` + `studentId` תקינים | **לא** נבנה דוח. מוצג `data-testid="parent-report-portal-gate"` / `parent-report-detailed-portal-gate` עם קישור לכניסת הורה ודשבורד |
| `source=parent` + `studentId` | רק `fetch` ל-`/api/parent/students/{id}/report-data` |
| `source=teacher` + `studentId` | רק `fetch` ל-`/api/teacher/students/{id}/parent-report-data` |
| API נכשל (401/403/404/רשת) | `setReport(null)` / `setPayload(null)` — **ללא** fallback ל-`mleo_*` |
| בניית דוח מ-body נכשלת | הודעת שגיאה — **ללא** דוח מקומי |

הוסרו מהדפים: `buildLocalParentReports`, `localStorage.getItem("mleo_player_name")`, `generateParentReportV2` ישיר.

---

## 4. מה נשאר legacy/dev/test בלבד

| מודול | שימוש |
|--------|--------|
| `lib/learning-supabase/parent-report-local-dev.js` | `buildLocalParentReportsForDevTest` — סקריפטים/QA |
| `scripts/lib/run-parent-report-from-local-storage.mjs` | Node snapshot מ-`mleo_*` |
| `utils/parent-report-v2.js` | `generateParentReportV2` — מנוע + `*ForTests` exports |
| Shim מבודד ב-`parent-report-from-api-payload.js` | רק בתוך מסלול API (לא localStorage דפדפן) |

דפי מוצר **אינם** מייבאים את `parent-report-local-dev.js`.

---

## 5. איך טופלו estimated/default values

### Adapter (`report-data-adapter.js`)

לכל topic: `_bridgeFieldProvenance` עם `source: db | estimated | unavailable`, `isEstimated`, `missingReason`.

### Seed (`seed-db-report-local-storage.js`)

| שדה | לפני | אחרי |
|-----|------|------|
| duration | `estimatePracticeDurationSeconds` / `max(30, total*30)` | רק אם `durationSeconds > 0` מה-DB; אחרת לא נכתב לסשן |
| mode | default `"learning"` | רק אם `dominantMode` קיים |
| level | default `"medium"` | רק אם `dominantLevel` ב-`easy/medium/hard` |
| grade | `registeredGrade \|\| "unknown"` | רק אם יש `contentGrade` או `registeredGrade` |
| timestamp | fallback ל-`rangeEndMs` | מסומן `source: estimated`, `missingReason: range_end_timestamp_fallback` |

### Post-process (`applyBridgeProvenanceToGeneratedReport`)

- `_reportDataAuthority: "server"`
- `_bridgeProvenance` עם `fieldFlags`
- `summary.totalTimeMinutes` מ-`apiPayload.summary.totalDurationSeconds` כשקיים
- אם duration חסר בגשר → `totalTimeMinutes = 0`, שורות `timeMinutes = 0`
- mode/level/grade חסרים → `null` / `modeStr: "לא זמין"` (לא מוצגים כאמת)

**הערה:** `sessionDurationSeconds` ב-`parent-report-v2.js` עדיין מעריך `total*30` כשאין `duration` בסשן — לכן post-process מאפס זמן שורה/סיכום כש-provenance מסמן unavailable. שינוי מנוע נדחה ל-scope אחר.

---

## 6. אילו בדיקות נוספו

`scripts/parent-report-server-truth-phase1-selftest.mjs`:

1. `/learning/parent-report` בלי remote — אין `buildLocalParentReports`, `mleo_player_name`, `generateParentReportV2`
2. `/learning/parent-report-detailed` — אותו דבר
3. `source=parent` + `studentId` → `parseParentReportRemoteSource.isRemote === true` + URL API נכון
4. `source=parent` בלי `studentId` → לא remote
5. `buildLocalParentReportsForDevTest` מבודד מדפי מוצר
6. seed לא ממציא duration/mode/level
7. `applyBridgeProvenanceToGeneratedReport` — זמן שרת, אפס estimate, mode/level לא זמינים
8. דפי מוצר ללא `mleo_*`
9. `parent-report-from-api-payload` מחבר provenance

---

## 7. אילו בדיקות הורצו ותוצאות

| פקודה | תוצאה |
|--------|--------|
| `npx tsx scripts/parent-report-server-truth-phase1-selftest.mjs` | **PASS** |
| `npx tsx scripts/parent-report-activity-time-selftest.mjs` | **PASS** |
| `npx tsx scripts/parent-report-bridge-load-selftest.mjs` | **PASS** |
| `npx tsx scripts/parent-report-pages-ssr.mjs` | **PASS** |

לא הורץ: `npm run build`, `test:parent-report-phase6` מלא, E2E דפדפן, בדיקות PDF end-to-end.

---

## 8. מה עדיין פתוח

| נושא | בעלים מוצרי / סוכן |
|------|---------------------|
| זמן מדויק ברמת שורה כש-DB חסר duration אבל יש `totalDurationSeconds` ברמת summary | סוכן זמן (מחוץ ל-Phase 1) |
| `sessionDurationSeconds` estimate `total*30` במנוע V2 | שינוי מנוע — מחוץ scope |
| פעילות הורה בסטטיסטיקה כללית | סוכן 2 |
| פרסים / gamification מ-localStorage ב-`gaps` של adapter | לא ב-scope |
| `parent-report-detailed.renderable.jsx` (קוד רדום) | לא נגיש ב-route — לא נגע |
| Teacher preview path — משתמש ב-API (תקין); לא נבדק E2E |
| הצגה ויזואלית מפורשת של "מוערך" להורה (רק provenance פנימי + אפס/לא זמין) | אולי Phase 2 UX |

---

## 9. סיכונים שלא טופלו

1. **Shim עדיין מריץ `generateParentReportV2`** — הנתונים מגיעים מ-DB אך המנוע זהה; סיכון לוגי נמוך אם provenance/post-process תקין.
2. **Timestamp fallback ל-`rangeEndMs`** — מסומן estimated; לא מוצג כ"פעילות אחרונה" ישירות בשכבה זו.
3. **קישורים ישנים** ל-`/learning/parent-report` ללא query — יראו שער פורטל (שינוי התנהגות מכוון).
4. **סקריפטי QA** שמניחים דוח מ-localStorage בדפדפן — עלולים לדרוש עדכון לנתיב dev או `?source=parent&studentId=`.
5. **PDF** — `exportReportToPDF(report, …)` משתמש ב-`report` state מאותו `useEffect` של API; לא נבדקה הרצת PDF בפועל בשלב זה.

---

## 10. האם יש צורך בתיאום עם סוכן אחר

| סוכן | תיאום נדרש |
|------|------------|
| **סוכן זמן/פרסים** | כן — `summary.totalDurationSeconds` מול זמן שורה; שיפור מנוע `sessionDurationSeconds` |
| **סוכן פעילות הורה** | כן — parent_activity_attempts כבר ב-API; סטטיסטיקה כללית בדוח |
| **סוכן QA/E2E** | מומלץ — עדכון תרחישים שפתחו `/learning/parent-report` בלי `studentId` |
| **סוכן מורים/בית ספר** | לא בשלב זה |

---

## Definition of Done — סטטוס

| קריטריון | סטטוס |
|----------|--------|
| דוח הורים רשמי לא נבנה מ-localStorage דפדפן | ✅ |
| אין fallback מקומי לדוח אמיתי | ✅ |
| API path הוא מקור האמת היחיד בדפי מוצר | ✅ |
| estimated/default לא מוצגים כאמת (אפס/לא זמין + provenance) | ✅ (שכבת גשר; לא מנוע מלא) |
| build/test רלוונטיים | ✅ (selftest + 3 regression) |

**לא הוכרז PASS כללי** — רק Phase 1 server-truth לדוחות הורים.

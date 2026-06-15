# מדריך הרצת סימולציות ו-QA (Runbook)

מסמך זה מיועד ל-owner ול-Cursor/agents.  
**מטרה:** שלא תהיה יותר בלבול בין dry-run לבין write, ושכל הרצה תדווח בבירור מה נכתב ל-DB.

> **כלל עליון:** אם ה-owner מבקש "תריץ סימולציה" — הכוונה להרצה **אמיתית שכותבת נתונים**, אלא אם נאמר במפורש **dry-run**.

---

## Dry-run מול Write

| מונח | משמעות |
|------|--------|
| **dry-run** | **לא כותב ל-DB.** מתכנן, בודק, מייצר artifacts מקומיים בלבד. |
| **write** | **כותב/משנה נתונים אמיתיים** ב-Supabase (sessions, answers, פעילויות, וכו'). |

### פקודות שברירת המחדל שלהן היא dry-run (בטוחות יותר)

> **שים לב — ברירת מחדל = dry-run, לא write**

- `npm run qa:school:daily` — **dry-run**
- `npm run help:seed-demo-report` — **dry-run**
- `npm run teacher:activity-sim` — **dry-run**
- רוב סקריפטי `scripts/qa/*-seed.mjs` ו-`parent-report-q*-simulation.mjs` — **dry-run** (אלא אם מוסיפים `--write`)

### פקודות write מפורשות

- `npm run qa:school:daily:write` — **write**
- כל סקריפט עם `--write` — **write** (אחרי guard)

---

## Production / Staging

### איך המערכת מזהה סביבה

הזיהוי **לא** מסתמך רק על `NODE_ENV`.

| סביבה | מתי |
|-------|-----|
| **local** | Supabase URL הוא `localhost` / `127.0.0.1` |
| **staging** | `SCRIPT_TARGET=staging` **או** project ref ב-`LEARNING_STAGING_PROJECT_REFS` **או** hostname מכיל `staging` |
| **production** | ref ב-`LEARNING_PRODUCTION_PROJECT_REFS`, host production, **או כל `*.supabase.co` שלא סווג כ-staging** |

> **אזהרה:** אם `.env.local` מצביע על Supabase remote ולא סימנת staging — הסקריפט עלול להיחשב **production** ולהיחסם בלי אישור.

### הגדרה מומלצת לסביבת בדיקות (staging)

ב-`.env.local` (לא נכנס ל-git):

```env
LEARNING_STAGING_PROJECT_REFS=<project-ref-של-staging>
# או:
SCRIPT_TARGET=staging
```

### כתיבה ל-production (רק באישור owner מפורש)

נדרשים **שלושה** משתנים **יחד** עם `--write`:

```env
ALLOW_PRODUCTION_WRITE=true
CONFIRM_PROJECT_REF=<exact-project-ref>
CONFIRM_OPERATION=<phrase-ספציפי-לסקריפט>
```

**אל תכניסו סיסמאות, PIN, או service role keys למסמכים.**

פירוט מלא: [production-script-guards-report.md](../repair/production-script-guards-report.md)  
סיכום owner: [script-guards-owner-impact-report.md](../repair/script-guards-owner-impact-report.md)

---

## כללים ל-Cursor / Agents

### לפני הרצה שכותבת נתונים — חובה לדווח ל-owner

1. **איזו פקודה** תרוץ (השם המלא)
2. **write או dry-run**
3. **לאיזה DB/סביבה** (local / staging / production לפי guard banner)
4. **מה צפוי להשתנות** (טבלאות, יום סימולציה, תלמידים)

### אחרי הרצה — חובה לדווח

1. כמה **sessions** נוספו (אם רלוונטי)
2. כמה **answers** נוספו (אם רלוונטי)
3. **תאריך/יום אחרון** שהושלם (`lastSimCalendarDate`, `currentSchoolDay`, `lastRunDate`)
4. **path ל-artifact/log**
5. האם היו **errors / timeouts**

### אסור

- להריץ dry-run ולהציג כאילו זו סימולציה אמיתית שכתבה DB
- לעצור סימולציה **שכבר רצה** במחשב מרוחק בלי אישור owner מפורש
- להסיק משינויי guards/פקודות מקומיים על process שרץ מרחוק **לפני** שהשינויים נכנסו לתוקף
- לחשוף secrets, סיסמאות, PIN, או tokens בדוחות

### אם ה-owner אמר "תריץ סימולציה"

→ השתמש בפקודת **write** המתאימה (למשל `qa:school:daily:write`), לא בברירת המחדל dry-run.

---

## סימולציה שרצה עכשיו

- סימולציה שכבר רצה במחשב מרוחק **לפני** שינויי guards **לא מושפעת** מהם באמצע.
- **לא עוצרים** אותה.
- אחרי סיום — בודקים לפי DB / logs / artifacts אם באמת נכתבו נתונים.
- שינויי `package.json` או guards **לא** משפיעים על process שכבר עלה.

---

## טבלה מרכזית — סימולציות ופקודות שכותבות DB

> עמודות מקוצרות: **ברירת מחדל** = dry-run / write.  
> לפרטים מלאים — ראו סעיפים למטה.

| # | שם / מטרה | פקודה | כותב DB? | ברירת מחדל | write | dry-run | סביבה מומלצת | env עיקרי | טבלאות | artifacts | איך יודעים שכתב | אסור | הערות agents |
|---|-----------|-------|----------|------------|-------|---------|--------------|-----------|--------|-----------|-----------------|------|--------------|
| 1 | School daily — יום בית ספר מלא (DB+UI+דוחות) | `npm run qa:school:daily` | רק ב-write | **dry-run** | `npm run qa:school:daily:write` | `npm run qa:school:daily` או `:dry-run` | staging | `.env.local`: Supabase URL+key, `DEMO_TEACHER_PASSWORD`, credentials תלמידים | `classroom_activities`, attempts, status, `learning_sessions` (דרך UI) | `reports/school-sim-daily/<date>/` | banner `[production-guard] mode=write`; `run-summary.json`; `lastSimCalendarDate` ב-`sim-state.json` | dry-run כ"סימולציה אמיתית"; production בלי triple confirm | owner מבקש "סימולציה" → `:write` |
| 2 | School daily preflight | `npm run qa:school:daily:preflight` | לא | read-only | — | אותה פקודה | staging/local | כמו #1 | — | preflight JSON ב-console | `preflight-only`, אין DB mutations | — | לפני write ראשון |
| 3 | School nightly DB-only (ימים/היסטוריה) | `run-school-nightly-simulation.mjs` | רק ב-write | **dry-run** | `... --mode=advance --write` | `... --mode=advance --dry-run` | staging | `.env.local`, `sim-state.json` | classroom activities + attempts | console JSON | `currentSchoolDay` עולה; `mode=write` ב-banner | seed-history בלי staging | `--mode=seed-history --days=N --write` לימים רבים |
| 4 | AAA virtual student D2 (12 תלמידים) | `node scripts/virtual-student-qa/run.mjs --phase d2` | **כן (ברירת מחדל!)** | **write** | אותה פקודה (בלי `--dry-run`) | `--phase d2 --dry-run` | staging/local + dev server | `PLAYWRIGHT_BASE_URL`, credentials AAA, Supabase אופציונלי | `learning_sessions`, `answers` דרך UI/API | `reports/virtual-student-daily/<date>/` | `state.json` ב-`%LOCALAPPDATA%\liosh-qa\`; timeline | לעצור באמצע; להריץ dry-run כאילו write | **אין production guard** — זהירות! |
| 5 | Parent report Q1 sim | `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs` | רק ב-write | **dry-run** (verify בלבד) | `... --write` | ברירת מחדל / `--verify-only` | staging | Supabase URL+key | `learning_sessions`, `answers`, parent activities | `docs/qa/_artifacts/parent-report-q1-sim/` | tagged sessions `parent-report-q1-sim-v1` | production; verify בלי seed קודם | `--verify-only` אחרי seed |
| 6 | Parent report Q2E monthly | `node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs` | רק ב-write | **dry-run** | `... --write` | ברירת מחדל | staging | כמו #5 | כמו #5 + book events | `docs/qa/_artifacts/parent-report-q2e-monthly/` | tag `parent-report-q2e-monthly-v1` | כמו #5 | `--clean-only` + `--write` למחיקה |
| 7 | QA seed scripts (May-June, launch, phonics…) | `node --env-file=.env.local scripts/qa/<seed>.mjs` | רק ב-write | **dry-run** | `... --write` | ברירת מחדל | staging | Supabase URL+key | לפי seed | `docs/qa/_artifacts/...` | `[production-guard] mode=write` | production | CONFIRM_OPERATION לכל seed |
| 8 | Backfill classification | `node scripts/backfill-activity-classification.mjs` | רק ב-write | **dry-run** | `... --write` | ברירת מחדל | **staging קודם** | `SUPABASE_URL`, service key | `answers`, `classroom_activity_attempts` | console summary | `affectedRows` ב-summary | **אסור production** בלי אישור | חד-פעמי לפני deploy |
| 9 | Help center demo report seed | `npm run help:seed-demo-report` | רק ב-write | **dry-run** | `npm run help:seed-demo-report -- --write` | ברירת מחדל | local/dev | `.env.local` | `learning_sessions`, `answers` | console | banner write | production | child demo admin |
| 10 | School demo seed | `node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=...` | רק ב-write | **dry-run** | `... --write` | ברירת מחדל | staging | passwords ב-env | schools, classes, students… | phase output | `seed-demo-school: <phase> OK` | production | הרצה לפי phases |
| 11 | School reset activities | `reset-demo-school-activities.mjs --write` | write | dry-run | `--write` | בלי flags | staging | `.env.local` | מוחק פעילויות demo | pre-reset counts | reset OK | production | נקרא גם מ-daily sim |
| 12 | School restore baseline | `restore-demo-school-baseline.mjs --write` | write | dry-run | `--write` | בלי flags | staging | `.env.local` | restore tables | console | restore OK | production | רק demo school |
| 13 | Teacher activity sim | `npm run teacher:activity-sim` | רק ב-write | **dry-run** | `... --write` | ברירת מחדל | local + `next dev` | `.env.e2e.local`, server על 3001 | classroom activities | console results | tests pass + DB rows | בלי dev server | HTTP sim |
| 14 | Truth gates (live) | `npm run test:truth-gates` | **כן — חלקית** | write (live gates) | אותן פקודות | `:offline` / contract gates | staging + server | `TRUTH_GATES_BASE_URL`, E2E creds | parent activities, attempts, coins | `docs/repair/_artifacts/truth-gates/` | gate PASS JSON | זה **לא** סימולציית QA רגילה | ראו סעיף Truth Gates |

---

## 1. School Daily Simulation

### מה זה

סימולציית יום לימודים מלא בבית ספר demo: DB sim → דגימת UI תלמידים → אימות דוחות.

### פקודות

| מטרה | פקודה |
|------|-------|
| **dry-run (ברירת מחדל)** | `npm run qa:school:daily` |
| dry-run מפורש | `npm run qa:school:daily:dry-run` |
| **write — כותב DB** | `npm run qa:school:daily:write` |
| בדיקות לפני write | `npm run qa:school:daily:preflight` |
| selftest (ללא DB) | `npm run qa:school:daily:selftest` |

סקריפט: `scripts/school-portal/run-school-sim-nightly.mjs`

### מה כותב ב-write

- פעילויות כיתה (`classroom_activities`, attempts, status)
- עדכון `scripts/school-portal/sim-state.json` — `lastSimCalendarDate`, `currentSchoolDay`
- בהרצה ראשונה: reset פעילויות (`reset-demo-school-activities.mjs`)
- UI sample: login תלמידים אמיתי, sessions/answers דרך המוצר
- אימות דוחות מורה/בית ספר/הורה

### dry-run

- מתכנן פעילויות, **לא** כותב DB
- **לא** מריץ UI sample / report validation
- **כן** יוצר artifacts תכנון תחת `reports/school-sim-daily/<date>/db-sim/`

### איך יודעים מה היום האחרון

- `scripts/school-portal/sim-state.json` → `lastSimCalendarDate`, `currentSchoolDay`
- `reports/school-sim-daily/<date>/run-summary.json`
- `scripts/school-portal/timeline-school-sim.md`

### המשך מאיפה שנעצר

- יום שכבר רץ: `--force` עם `:write`
- תאריך ספציפי: `--date YYYY-MM-DD` (ראו help בסקריפט)

### credentials

ראו [SCHOOL_SIM_CREDENTIALS.md](./SCHOOL_SIM_CREDENTIALS.md)

---

## 2. School Long / Range / Backfill (DB-only)

סקריפט: `scripts/school-portal/run-school-nightly-simulation.mjs`

| mode | תיאור | write example |
|------|--------|---------------|
| `advance` | יום sim אחד (DB בלבד, בלי Playwright) | `node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance --write` |
| `seed-history` | N ימים ברצף | `... --mode=seed-history --days=10 --write` |
| `reset` | reset פעילויות (קורא reset script) | דורש `--write` ב-reset |

**ברירת מחדל:** dry-run.

**מצב sim:** `sim-state.json` → `currentSchoolDay`.

> הסימולציה היומית המלאה (`qa:school:daily:write`) **החליפה** את AAA nightly לבית ספר מלא. ראו [OPERATOR_DISABLE_AAA_NIGHTLY.md](./OPERATOR_DISABLE_AAA_NIGHTLY.md).

---

## 3. AAA / Virtual Student Simulation

סקריפט: `scripts/virtual-student-qa/run.mjs`

### חשוב מאוד

- **Phase D2 בלי `--dry-run` = write כברירת מחדל** (sessions/answers אמיתיים דרך UI)
- **אין production guard** על סקריפט זה
- state נשמר **מחוץ ל-repo**: `%LOCALAPPDATA%\liosh-qa\virtual-student-state\`

### פקודות

| מטרה | פקודה |
|------|-------|
| **write (ברירת מחדל D2)** | `node scripts/virtual-student-qa/run.mjs --phase d2 --mode fast` |
| dry-run | `node scripts/virtual-student-qa/run.mjs --phase d2 --dry-run` |
| preflight | `node scripts/virtual-student-qa/run.mjs --phase d2 --preflight-only` |
| smoke תלמיד אחד | `node scripts/virtual-student-qa/run.mjs --phase d2 --students AAA1 --mode fast` |

### artifacts

- `reports/virtual-student-daily/YYYY-MM-DD/`
- state: `state.json`, `timeline.md` (מחוץ ל-repo)

### מה לא לעשות

- **לא לעצור** באמצע run מלא — state מתקדם רק אחרי כל השלבים
- לא להריץ `--dry-run` ולדווח "12 תלמידים למדו"

### איך יודעים שנכתבו sessions/answers

- artifacts בתיקיית התאריך
- `state.json` → `lastRunDate`, counters
- אופציונלי: row-count evidence אם Supabase env מוגדר

---

## 4. Parent Report QA Simulations

### Q1 Simulation

- סקריפט: `scripts/qa/parent-report-q1-simulation.mjs`
- תלמידים: AAA1–AAA12 תחת `admin@admin.com`
- **ברירת מחדל: dry-run** — מריץ verify על tagged data; **נכשל** אם אין seed קודם

| פקודה | משמעות |
|-------|--------|
| `--write` | seed + verify (כותב DB) |
| `--verify-only` | verify בלבד (ללא seed/clean) |
| `--clean-only` | מחיקת tagged rows (**דורש `--write`**) |

Artifacts: `docs/qa/_artifacts/parent-report-q1-sim/`

### Q2E Monthly Simulation

- סקריפט: `scripts/qa/parent-report-q2e-monthly-simulation.mjs`
- חלון: April 2026, flags A–D
- אותו מודל dry-run / `--write` / `--verify-only`

Artifacts: `docs/qa/_artifacts/parent-report-q2e-monthly/`

### QA Seed Scripts (נפרדים)

| סקריפט | CONFIRM_OPERATION |
|--------|-------------------|
| `parent-report-qa-may-june-seed.mjs` | `PARENT_REPORT_QA_MAY_JUNE_SEED` |
| `parent-report-launch-qa-june-week-seed.mjs` | `PARENT_REPORT_LAUNCH_JUNE_WEEK_SEED` |
| `parent-report-diagnostic-visible-impact-seed.mjs` | `PARENT_REPORT_DIAGNOSTIC_VISIBLE_IMPACT_SEED` |
| `english-phonics-parent-report-seed.mjs` | `ENGLISH_PHONICS_PARENT_REPORT_SEED` |
| `parent-report-q2e-monthly-realistic-seed.mjs` | `PARENT_REPORT_Q2E_MONTHLY_REALISTIC_SEED` |

כולם: **dry-run** בלי `--write`.

---

## 5. Truth Gates — לא סימולציית QA רגילה

Truth gates **בודקות אמת** (DB/API/UI/PDF/dashboard), לא "ממלאות" נתוני QA.

| פקודה | מה זה |
|-------|--------|
| `npm run test:truth-gates` | כל gates כולל live — **כותב** parent activities / attempts / coins במהלך live gates |
| `npm run test:truth-gates:launch` | subset launch |
| `npm run test:truth-gates:offline` | contracts בלבד — **לא** live DB |
| `npm run gate:parent-activity` | gate בודד |

**מתי להריץ:** אחרי תיקוני server-truth, לפני launch signoff.

**דרישות:** שרת (`next start`), `TRUTH_GATES_BASE_URL`, credentials E2E (masked בדוחות).

**לא להחליף** בסימולציית school daily או AAA.

Artifacts: `docs/repair/_artifacts/truth-gates/`

---

## 6. Backfill

`scripts/backfill-activity-classification.mjs`

- **מטרה:** תיוג retroactive ל-`answers` ו-`classroom_activity_attempts`
- **ברירת מחדל: dry-run**
- **write:** `--write` (+ triple confirm ב-production)
- **אסור** על production בלי הרצה ב-staging קודם ואישור owner

---

## 7. Seed / Demo Scripts

| סקריפט | npm / path | write |
|--------|------------|-------|
| Help center demo | `npm run help:seed-demo-report -- --write` | sessions+answers ל-demo child |
| School demo seed | `seed-demo-school.mjs --phase=... --write` | accounts/classes/students |
| School reset | `reset-demo-school-activities.mjs --write` | מוחק פעילויות demo |
| School restore | `restore-demo-school-baseline.mjs --write` | משחזר baseline |
| Teacher activity sim | `npm run teacher:activity-sim -- --write` | classroom API flow |
| Teacher parent messages seed | `seed-simulation-parent-messages.mjs --write` | messages |

---

## קישורים

- [SCHOOL_SIM_CREDENTIALS.md](./SCHOOL_SIM_CREDENTIALS.md) — credentials לבית ספר
- [OPERATOR_DISABLE_AAA_NIGHTLY.md](./OPERATOR_DISABLE_AAA_NIGHTLY.md) — AAA nightly vs school daily
- [production-script-guards-report.md](../repair/production-script-guards-report.md) — guards טכני
- [script-guards-owner-impact-report.md](../repair/script-guards-owner-impact-report.md) — סיכום owner
- [final-live-truth-gates-closure.md](../repair/final-live-truth-gates-closure.md) — truth gates closure

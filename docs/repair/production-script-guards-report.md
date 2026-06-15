# Production Script Guards — Phase 6 Report

> **Owner-facing runbook (עברית):** [SIMULATION_RUNBOOK.md](../qa/SIMULATION_RUNBOOK.md)  
> **סיכום קצר ל-owner:** [script-guards-owner-impact-report.md](./script-guards-owner-impact-report.md)

תאריך: 2026-06-15  
מטרה: למנוע מסקריפטי backfill / seed / demo / nightly / simulation / classification לשנות DB אמיתי או אמת אבחונית בפרודקשן בטעות.  
סטטוס: guards הוטמעו לסקריפטים מסוכנים במסגרת Phase 6. לא הורצו migrations. לא שונתה לוגיקת מוצר.

---

## 1. סקריפטים שנבדקו

### סקריפטי יעד מפורשים (Scope)

| סקריפט | סוג | כתיבה ל-DB |
|--------|-----|------------|
| `scripts/backfill-activity-classification.mjs` | backfill | כן |
| `scripts/help-center/seed-demo-report-data.mjs` | seed/demo | כן |
| `scripts/school-portal/run-school-nightly-simulation.mjs` | nightly/sim | כן |
| `scripts/school-portal/run-school-sim-nightly.mjs` | nightly/sim | כן (דרך `db-simulator`) |
| `scripts/school-portal/seed-demo-school.mjs` | seed | כן |
| `scripts/school-portal/reset-demo-school-activities.mjs` | reset | כן (delete) |
| `scripts/school-portal/restore-demo-school-baseline.mjs` | restore | כן |
| `scripts/qa/parent-report-q1-simulation.mjs` | simulation+seed | כן |
| `scripts/qa/parent-report-q2e-monthly-simulation.mjs` | simulation+seed | כן |
| `scripts/qa/parent-report-qa-may-june-seed.mjs` | seed | כן |
| `scripts/qa/parent-report-launch-qa-june-week-seed.mjs` | seed | כן |
| `scripts/qa/english-phonics-parent-report-seed.mjs` | seed | כן |
| `scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs` | seed | כן |
| `scripts/qa/parent-report-q2e-monthly-realistic-seed.mjs` | seed | כן |
| `scripts/teacher-portal/teacher-activity-sim.mjs` | simulation | כן (API+DB) |
| `scripts/teacher-portal/seed-simulation-parent-messages.mjs` | seed | כן |
| `scripts/learning-simulator/*` | QA artifacts | **לא** — אין `createClient` / insert/update |

### סקריפטים נוספים שזוהו ככותבי DB (מיפוי)

נמצאו ~45 קבצים תחת `scripts/**` עם `from(...).insert|update|upsert|delete`, כולל:

- `scripts/school-portal/sim/db-simulator.mjs` (נקרא רק מסקריפטים מוגנים)
- `scripts/school-portal/demo-school-lib.mjs` (ספריית seed — נקרא מסקריפטים מוגנים)
- `scripts/admin-portal/*` (account cleanup, promote admin)
- `scripts/teacher-portal/phase*-smoke.mjs`, `migrate-simulation-*.mjs`, `bootstrap.mjs`
- `scripts/help-center/provision-demo-account.mjs`
- `scripts/parent-video-pilot/preflight-*.mjs`
- `scripts/verify-phase*.mjs`, `scripts/tests/*-post-sql.mjs`
- `scripts/qa/staging-e2e-learning-time-fairness.mjs`
- `scripts/security/school-phase4-qa-staff-cookie-fixtures.mjs`

---

## 2. סקריפטים שכותבים ל-DB (טבלאות רגישות)

| טבלה / נתון | סקריפטים עיקריים |
|-------------|------------------|
| `answers`, `answer_payload` | backfill, QA parent seeds/sim, help-center seed |
| activity classification | `backfill-activity-classification.mjs` |
| `learning_sessions` | QA seeds, help-center seed, school sim |
| `parent_activity_attempts` | QA Q1/Q2E simulation |
| `student_learning_state` | (פוטנציאלי ב-verify scripts; seeds עקיפים דרך sessions/answers) |
| coins / missions | `verify-phase1-coin-awards.mjs`, `verify-phase2-missions.mjs` (**ללא guard עדיין**) |
| demo / school data | school-portal seed/reset/restore/nightly |
| report artifacts (gate) | school-sim nightly → `reports/school-sim-daily/` |

---

## 3. סקריפטים שקיבלו guard

כל הסקריפטים בטבלת Scope למעלה (למעט learning-simulator) קיבלו guard דרך:

- `scripts/lib/production-script-guard.mjs` — ליבה משותפת
- `scripts/qa/lib/db-write-guard.mjs` — bootstrap ל-QA parent-report
- `scripts/school-portal/lib/school-db-write-guard.mjs` — bootstrap לבית ספר
- `scripts/teacher-portal/lib/teacher-db-write-guard.mjs` — bootstrap למורה

**התנהגות:**

- **dry-run כברירת מחדל** (`--write` או `DRY_RUN=false` לכתיבה)
- **hard stop ב-production** ללא אישור משולש
- **הדפסת banner** בתחילה: target, mode, tables, environment
- **הדפסת summary** בסוף: affected/skipped/errors/artifact path
- **school-sim dry-run**: `verdictType: ARTIFACT_VERIFY` ב-`run-summary.json`

---

## 4. איך מזהים production

הזיהוי **לא** מסתמך על `NODE_ENV` בלבד.

סדר עדיפויות ב-`classifyScriptEnvironment()`:

1. **local** — host הוא `localhost` / `127.0.0.1` / `::1`
2. **staging** — אחד מאלה:
   - `SCRIPT_TARGET=staging` או `LEARNING_SCRIPT_TARGET=staging`
   - project ref ב-`LEARNING_STAGING_PROJECT_REFS` (רשימה מופרדת בפסיקים)
   - hostname מכיל `staging`
3. **production** — אחד מאלה:
   - `VERCEL_ENV=production`
   - project ref ב-`LEARNING_PRODUCTION_PROJECT_REFS`
   - host ב-blocklist: `leok.co.il`, `liosh.com`, `liosh-website.vercel.app`, וכו'
   - **ברירת מחדל לכל `*.supabase.co` שלא סווג כ-staging** → production

Project ref נגזר מ-URL: `https://<ref>.supabase.co`.

---

## 5. איך מאשרים write חריג (production בלבד)

נדרשים **שלושה** משתני סביבה יחד עם `--write`:

```bash
ALLOW_PRODUCTION_WRITE=true
CONFIRM_PROJECT_REF=<exact supabase project ref>
CONFIRM_OPERATION=<phrase specific to script>
```

| סקריפט | `CONFIRM_OPERATION` |
|--------|---------------------|
| backfill-activity-classification | `BACKFILL_ACTIVITY_CLASSIFICATION` |
| help-center/seed-demo-report-data | `SEED_HELP_CENTER_DEMO_REPORT` |
| school-portal/run-school-nightly-simulation | `RUN_SCHOOL_NIGHTLY_SIMULATION` |
| school-portal/run-school-sim-nightly | `RUN_SCHOOL_SIM_NIGHTLY` |
| school-portal/seed-demo-school | `SEED_DEMO_SCHOOL` |
| school-portal/reset-demo-school-activities | `RESET_DEMO_SCHOOL_ACTIVITIES` |
| school-portal/restore-demo-school-baseline | `RESTORE_DEMO_SCHOOL_BASELINE` |
| qa/parent-report-q1-simulation | `PARENT_REPORT_Q1_SIMULATION` |
| qa/parent-report-q2e-monthly-simulation | `PARENT_REPORT_Q2E_MONTHLY_SIMULATION` |
| qa/*-seed.mjs | ראה קובץ (למשל `PARENT_REPORT_QA_MAY_JUNE_SEED`) |
| teacher-portal/teacher-activity-sim | `TEACHER_ACTIVITY_SIM` |
| teacher-portal/seed-simulation-parent-messages | `SEED_SIMULATION_PARENT_MESSAGES` |

**staging/local:** מספיק `--write` (ללא triple confirm).

---

## 6. בדיקות שנוספו

`scripts/tests/production-script-guard-selftest.mjs` — 11 בדיקות יחידה:

1. resolve Supabase target + redaction
2. remote `*.supabase.co` → production
3. `LEARNING_STAGING_PROJECT_REFS` → staging
4. localhost → local
5. dry-run default / `--write` override
6. production write בלי אישור → `ProductionScriptGuardError`
7. `CONFIRM_PROJECT_REF` שגוי → נכשל
8. triple confirm תקין → עובר
9. dry-run על production → לא דורש confirm
10. staging write בלי triple confirm → עובר
11. `formatScriptVerdict({ artifactOnly })` → `ARTIFACT_VERIFY`

הרצה:

```bash
npm run test:production-script-guards
```

---

## 7. בדיקות שהורצו ותוצאות

| בדיקה | פקודה | תוצאה |
|-------|--------|--------|
| Unit tests | `node scripts/tests/production-script-guard-selftest.mjs` | **PASS** (11/11) |
| Backfill production block | `SUPABASE_URL=https://prodref.supabase.co` + `--write` | **BLOCKED** exit 1 לפני DB |
| QA seed dry-run | staging ref + ללא `--write` | **PASS** — 0 DB mutations |
| Help seed dry-run | production URL + ללא `--write` | guard עבר dry-run; נכשל אחר כך על env חסר (צפוי) |

לא הורצו writes מול production אמיתי (אסור לפי spec).

---

## 8. סקריפטים שנשארו בסיכון

לא קיבלו guard במסגרת Phase 6 (מומלץ Phase 6b):

| אזור | דוגמאות | סיכון |
|------|---------|-------|
| admin-portal | `promote-main-admin.mjs`, `account-cleanup.mjs` | כתיבה ל-auth/profiles |
| teacher-portal smokes | `phase5a-smoke.mjs` … `phase9-security-smoke.mjs` | insert/update ב-QA |
| teacher migrations | `migrate-simulation-*.mjs`, `rename-simulation-students.mjs` | שינוי credentials |
| help-center | `provision-demo-account.mjs` | יצירת חשבונות |
| parent-video-pilot | `preflight-add-students-*.mjs` | יצירת תלמידים |
| verify-phase* | coin/mission closure gates | כתיבת נתוני בדיקה |
| security QA | `school-phase4-qa-staff-cookie-fixtures.mjs` | mutate throwaway accounts |
| virtual-student-qa | `run.mjs` | סימולציה ארוכה עם DB |
| staging E2E | `staging-e2e-learning-time-fairness.mjs` | E2E + service role |

`scripts/learning-simulator/*` — **לא בסיכון DB** (artifacts בלבד).

---

## 9. פקודות בטוחות להרצה

```bash
# בדיקת guards (ללא DB)
npm run test:production-script-guards

# dry-run (ברירת מחדל) — לא כותב
node scripts/backfill-activity-classification.mjs
node --env-file=.env.local scripts/help-center/seed-demo-report-data.mjs
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs
npm run qa:school:daily:dry-run

# verify-only (קריאה בלבד, ללא seed)
node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --verify-only

# preflight בלבד (school sim)
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --preflight-only

# staging write (דורש staging ref ב-env)
# .env.local: LEARNING_STAGING_PROJECT_REFS=<your-staging-ref>
node --env-file=.env.local scripts/qa/parent-report-qa-may-june-seed.mjs --write
npm run qa:school:daily:write
```

---

## 10. פקודות שאסור להריץ בלי אישור

```bash
# ❌ production Supabase + write — ייחסם
node scripts/backfill-activity-classification.mjs --write
# (עם SUPABASE_URL=https://<prod-ref>.supabase.co)

# ❌ seed/demo על production
node --env-file=.env.production scripts/help-center/seed-demo-report-data.mjs --write

# ❌ nightly sim על production בלי triple confirm
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --write
```

אישור production (רק לאחר אישור מפורש של בעלים):

```bash
ALLOW_PRODUCTION_WRITE=true \
CONFIRM_PROJECT_REF=<prod-ref> \
CONFIRM_OPERATION=BACKFILL_ACTIVITY_CLASSIFICATION \
node scripts/backfill-activity-classification.mjs --write
```

---

## Helper משותף

```
scripts/lib/production-script-guard.mjs
```

API עיקרי:

- `createProductionScriptGuard({ scriptName, confirmOperation, affectedTables, defaultDryRun })`
- `resolveSupabaseTarget()` / `classifyScriptEnvironment()`
- `formatScriptVerdict({ artifactOnly: true })` → `ARTIFACT_VERIFY`

---

## שינויי package.json

| Script | שינוי |
|--------|-------|
| `test:production-script-guards` | **חדש** |
| `qa:school:daily` | עכשיו dry-run כברירת מחדל (בטוח יותר) |
| `qa:school:daily:write` | **חדש** — הרצה עם כתיבה ל-staging |

---

## Definition of Done — סטטוס

| קריטריון | סטטוס |
|----------|--------|
| כל script מסוכן במסגרת Scope מוגן | ✅ |
| dry-run ברור | ✅ |
| production hard stop | ✅ |
| דוח מיפוי | ✅ (מסמך זה) |
| tests/guards | ✅ `test:production-script-guards` |
| אין שינוי מוצר | ✅ guards בלבד |
| scripts מחוץ ל-Scope | ⚠️ מתועדים בסעיף 8 |

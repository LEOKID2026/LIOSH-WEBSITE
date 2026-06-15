# דוח תיעוד Simulation Runbook

תאריך: 2026-06-15  
סוג משימה: **תיעוד בלבד** — לא שונה קוד מוצר, לא שונו פקודות, לא הורצו סימולציות, לא נגעו ב-DB.

---

## 1. מסמכים שנוצרו / עודכנו

| מסמך | פעולה |
|------|--------|
| `docs/qa/SIMULATION_RUNBOOK.md` | **נוצר** — מדריך מרכזי owner-facing בעברית |
| `docs/repair/script-guards-owner-impact-report.md` | **נוצר** — סיכום guards ל-owner |
| `docs/qa/SCHOOL_SIM_CREDENTIALS.md` | **עודכן** — קישור ל-runbook + הבהרת dry-run/write |
| `docs/repair/final-live-truth-gates-closure.md` | **עודכן** — קישור ל-runbook |
| `docs/repair/simulation-runbook-documentation-report.md` | **נוצר** — דוח זה |

---

## 2. סימולציות שתועדו

1. School daily (`qa:school:daily`, `:write`, `:dry-run`, `:preflight`)
2. School nightly DB-only (`run-school-nightly-simulation.mjs` — advance, seed-history, reset)
3. AAA / virtual student (`run.mjs --phase d2`)
4. Parent report Q1 / Q2E simulations + QA seed scripts
5. Truth gates (live vs offline — לא סימולציית QA)
6. Backfill activity classification
7. Seed/demo: help-center, school seed/reset/restore, teacher activity sim

---

## 3. פקודות שעדיין לא ברור 100% dry-run / write

| פקודה | הערה |
|-------|------|
| `parent-report-q1-simulation.mjs` (בלי flags) | dry-run לכתיבה, אבל מנסה verify — **נכשל** בלי seed קודם. לא "סימולציה מלאה". |
| `parent-report-q1-simulation.mjs --verify-only` | read-only verify — לא seed |
| `virtual-student-qa/run.mjs --phase d2` | **write כברירת מחדל** (ללא `--dry-run`) — **חשוב!** |
| `run-school-nightly-simulation.mjs --mode=seed-history` | תמיד write פנימי (ללא dry-run loop) — דורש `--write` ב-guard |
| Truth gates live | כותבים parent activities/coins — זו **בדיקת אמת**, לא seed QA |

---

## 4. רשימת פקודות write חשובות

- `npm run qa:school:daily:write`
- `node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance --write`
- `node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=seed-history --days=N --write`
- `node scripts/virtual-student-qa/run.mjs --phase d2 --mode fast` (**ברירת מחדל write**)
- `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --write`
- `node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --write`
- כל `scripts/qa/*-seed.mjs --write`
- `node scripts/backfill-activity-classification.mjs --write`
- `npm run help:seed-demo-report -- --write`
- `node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=... --write`
- `npm run teacher:activity-sim -- --write`
- `npm run test:truth-gates` (live gates — כתיבה חלקית)

---

## 5. רשימת פקודות dry-run (ברירת מחדל או מפורש)

- `npm run qa:school:daily` / `:dry-run`
- `npm run qa:school:daily:preflight` (read-only)
- `node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance` (בלי `--write`)
- `node scripts/virtual-student-qa/run.mjs --phase d2 --dry-run`
- `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs` (dry-run writes; verify only)
- `node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs` (idem)
- כל QA seed scripts בלי `--write`
- `node scripts/backfill-activity-classification.mjs` (בלי `--write`)
- `npm run help:seed-demo-report` (בלי `--write`)
- `npm run teacher:activity-sim` (בלי `--write`)
- `npm run test:truth-gates:offline` (contracts — ללא live DB writes)

---

## 6. מה Cursor צריך לדעת בפעם הבאה שה-owner מבקש "תריץ סימולציה"

1. לזהות **איזו סימולציה** (school daily / AAA / parent report QA / אחר)
2. להשתמש בפקודת **write** — לא בברירת מchדל dry-run
3. לפני הרצה — לדווח: פקודה, write/dry-run, סביבת DB, מה ישתנה
4. לוודא `LEARNING_STAGING_PROJECT_REFS` אם remote
5. **לא** לעצור process שרץ מרחוק
6. אחרי הרצה — sessions/answers, יום אחרון, artifact path, errors

---

## 7. האם נגעת בקוד?

**לא.**  
רק קבצי תיעוד (`docs/qa/`, `docs/repair/`).  
לא שונה `package.json`, לא שונה קוד מוצר, לא הורצו סימולציות, לא נגעו ב-DB.

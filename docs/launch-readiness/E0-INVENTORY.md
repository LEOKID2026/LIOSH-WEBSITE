# E0 — Fast Inventory of QA Artifacts

> **תאריך:** 2026-05-23
> **מצב:** E0 closed. נוצר כחלק מ-E1 (Launch Gate MVP).
> **שפה:** עברית.
> **מטרה:** מיפוי גס של reports קיימים → 13 שכבות ה-Launch Readiness. **לא** תיעוד מקיף.

מסמך זה משקף את מצב ה-artifacts בדסקטופ ביום בנייה. הוא נצרך ע"י [scripts/launch-readiness/build-launch-readiness-daily.mjs](../../scripts/launch-readiness/build-launch-readiness-daily.mjs).

---

## טבלת מיפוי

| # | שכבה | source artifact קיים | MVP status | read-only | דורש Supabase | הערות / סיכון |
|---|------|---------------------|------------|------------|----------------|-----------------|
| 1 | `nightly` | [reports/virtual-student-daily/2026-05-23/run-summary.json](../../reports/virtual-student-daily/2026-05-23/run-summary.json) | **ready-to-aggregate** | yes | no | מקור עיקרי. נוצר ע"י [scripts/virtual-student-qa/run.mjs](../../scripts/virtual-student-qa/run.mjs). הלפטופ הלילי כותב אותו תחת `<date>` שונה |
| 2 | `coverage` | `reports/launch-readiness/<date>/coverage-summary.json` (לא קיים) | **needs-new-script** (E2) | yes | no | יבנה ב-E2 מ-`run-summary.json` בלבד. עד אז `not_run` |
| 3 | `parentReportTruth` | snapshots ב-`reports/virtual-student-daily/<date>/` + `parent-report-snapshot.{md,json}` (קיימים חלקית) | **needs-new-script** (E3) | yes | no | יקרא snapshots קיימים + יחפש raw keys. עד E3 — `not_run` |
| 4 | `dataIntegrity` | `run-summary.json` (suite.crossStudentMatrix, students[].tier1Counts) | **needs-new-script** (E4 MVP) | yes | no ב-MVP, yes ב-Full | MVP מבוסס run-summary בלבד; Full ידרוש read-only Supabase דרך MCP. עד E4 — `not_run` |
| 5 | `diagnosticGroundTruth` | אין artifact ייעודי עדיין | **needs-new-script** (E5) | yes | no | יקרא state.json + parent-report snapshots. `not_run` עד שבוע 2 |
| 6 | `similarQuestions` | reports קיימים: `reports/adaptive-followup/...` (אם קיים) | **needs-new-script** (E6) | yes | no | `not_run` עד שבוע 2 |
| 7 | `recommendation` | parent-report snapshots | **needs-new-script** (E7) | yes | no | `not_run` עד שבוע 2-3 |
| 8 | `copilotTruth` | reuse `parent-copilot-final-grounding-simulation.mjs` + תוצאות תחת `reports/parent-copilot/` | **needs-new-script** (E8) | yes | no (deterministic mode) | `not_run` עד שבוע 3 |
| 9 | `mobile` | אין | **needs-new-script** (E9) | yes | no | `not_run` עד שבוע 3-4 |
| 10 | `crossDevicePersistence` | אין | **needs-new-script** (E9) | yes | no | `not_run` עד שבוע 3-4 |
| 11 | `failureRecovery` | אין | **needs-new-script** (E9) | yes | no | `not_run` עד שבוע 3-4 |
| 12 | `pdfExport` | reuse `qa:parent-pdf-export` output ב-`qa-visual-output/` | **ready-to-aggregate** (אופציונלי) | yes | no | קיים אם הריץ ידנית; `not_run` ב-MVP |
| 13 | `questionQuality` | `reports/question-metadata-qa/summary.json` (אם נוצר ע"י `npm run qa:question-metadata`) | **ready-to-aggregate** (אופציונלי) | yes | no | קיים אם הריץ ידנית; `not_run` אחרת |

---

## סיכום מצב

- **ready-to-aggregate now (E1 קורא ישירות):** `nightly`, `pdfExport` (אופציונלי), `questionQuality` (אופציונלי)
- **needs-new-script — MVP layers (E2-E4):** `coverage`, `parentReportTruth`, `dataIntegrity`
- **needs-new-script — deep layers (E5-E9):** `diagnosticGroundTruth`, `similarQuestions`, `recommendation`, `copilotTruth`, `mobile`, `crossDevicePersistence`, `failureRecovery`

בריצה הראשונה (יום 0), הצפי: 1 שכבה `pass` (`nightly` אם הריצה הצליחה), ו-12 שכבות `not_run`. ה-verdict הצפוי: `PARTIAL` (לא BLOCKED, לא NOT READY, לא READY — כי 3 core layers עדיין לא מחוברים).

---

## נתיבי artifact קנוניים

| תיק | תוכן |
|-----|------|
| `reports/virtual-student-daily/<YYYY-MM-DD>/` | פלט nightly: `run-summary.{md,json}`, `plan.json`, `state-snapshot.json`, `failure-repro.md`, `screenshots/`, `logs/` |
| `reports/virtual-student-daily/<date>/screenshots/s##-AAA##-baseline-populated.png` | snapshot של דוח הורה לפני פעילות |
| `reports/virtual-student-daily/<date>/screenshots/s##-AAA##-after-populated.png` | snapshot של דוח הורה אחרי פעילות |
| `reports/question-metadata-qa/summary.json` | (אם רץ ידנית) `qa:question-metadata` |
| `reports/learning-simulator/orchestrator/run-summary.json` | (אם רץ ידנית) `qa:learning-simulator:release` |
| `reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.{md,json}` | פלט ה-Launch Gate (נוצר ב-E1) |
| `reports/launch-readiness/<date>/coverage-summary.{md,json}` | E2 (לא קיים עדיין) |
| `reports/launch-readiness/<date>/parent-report-truth-audit.{md,json}` | E3 (לא קיים עדיין) |
| `reports/launch-readiness/<date>/data-integrity-audit.{md,json}` | E4 (לא קיים עדיין) |

---

## הצעד הבא

**אחרי שהבעלים יאשר את הריצה הראשונה של ה-Launch Gate על תאריך 2026-05-23, המשך ל-E2 (Coverage MVP).**

לא להתחיל E2 לפני אישור.

# Teacher Guidance Engine Correction — Closure Report

**Date:** 2026-05-28  
**Status:** **PASS** (automated QA complete)  
**Plan reference:** `.cursor/plans/guidance_engine_correction_7b6f45e3.plan.md` (not modified during implementation except incidental todo metadata)

---

## Summary

Implemented engine-level corrections for Teacher Guidance V2:

- **Subject-level fallbacks** (student + class) when accuracy is weak but topics are `general` / `mixed` / unmapped
- **Canonical `guidanceSeverityTier`** with legacy `classHealthSignal` / `riskLevel` mapping
- **Misleading-state guards** so calm empty copy does not appear when accuracy is below thresholds
- **`classificationGapSummary`** on guidance payloads (QA/debug; not shown in teacher UI by default)
- **Owner-approved Hebrew** in `lib/teacher-portal/teacher-ui.he.js` only

Root causes from [TEACHER_GUIDANCE_ENGINE_DEEP_AUDIT.md](./TEACHER_GUIDANCE_ENGINE_DEEP_AUDIT.md) addressed without SQL or simulation changes.

---

## Tests run

| Command | Result |
|---------|--------|
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** (incl. S1–S6, C1–C3, T1) |
| `node scripts/tests/school-report-view-model-unit.mjs` | **PASS** (incl. H1–H2) |
| `npm run build` | **PASS** (exit 0) |

No dedicated teacher-guidance browser smoke script exists; owner browser verification is post-delivery (see below).

---

## Files changed

```
components/teacher-portal/TeacherDashboardClient.jsx
lib/school-portal/school-report-view-model.js
lib/teacher-portal/teacher-ui.he.js
lib/teacher-server/teacher-class-report.server.js
lib/teacher-server/teacher-dashboard.server.js
lib/teacher-server/teacher-guidance-v2.server.js
lib/teacher-server/teacher-recommendations.server.js
pages/teacher/class/[classId].js
pages/teacher/student/[studentId].js
scripts/tests/school-report-view-model-unit.mjs
scripts/tests/teacher-guidance-v2-unit.mjs
```

---

## Confirmations

| Item | Status |
|------|--------|
| SQL / migrations run | **No** |
| Simulation / `scripts/school-portal/**` touched | **No** |
| Secrets in tracked files | **No** |
| Commit | **No** |
| Push | **No** |

---

## Post-delivery owner verification (optional)

1. Student report with ~31% Hebrew and only `general` topics → subject-level headline + tier, not “המשך כרגיל” alone  
2. Class report ~61% cohort → class tier “דורשת חיזוק” / subject fallback, not “מתקדמת כסדרה”  
3. Report Hub class modal — same rules as class insight / focus empty states  

---

## Commit / push

Not performed. If approved later, use explicit pathspecs only (see plan §7.1); never `git add .` / `git add -A`.

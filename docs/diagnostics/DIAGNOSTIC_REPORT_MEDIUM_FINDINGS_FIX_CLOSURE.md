# Diagnostic Report MEDIUM Findings Fix — Closure (Finding #4 Only)

**Date:** 2026-05-29  
**Status:** IMPLEMENTED (scoped)  
**Source audit:** `DIAGNOSTIC_REPORT_MEDIUM_FINDINGS_AUDIT.md`

---

## Summary

Fixed **MEDIUM #4 only** — class/cohort guidance tiers no longer default to `class_monitor` when there is no valid cohort data. Reused existing `no_data` health signal and null tier behavior; no new Hebrew copy.

**Not changed:** #5 (date range), #6 (confidence policy), #7 (hardcoded thresholds).

---

## Files Changed

| File | Change |
|------|--------|
| `lib/teacher-server/teacher-recommendations.server.js` | `deriveClassGuidanceSeverityTier` accepts `{ hasData }`; returns `null` when no data or invalid accuracy; `mapClassHealthSignalFromTier(null)` → `"no_data"`; `buildClassTeacherGuidance` uses `hasCohortData` guard |
| `lib/teacher-server/teacher-guidance-v2.server.js` | `buildClassTeacherGuidanceV2` cohort tier uses `hasCohortData`; topic/fallback units pass `hasData` from answer counts |
| `lib/school-portal/school-report-view-model.js` | `parseClassReportViewModel` / `parsePhysicalClassReportViewModel` omit status chip when no cohort data |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | Class tier no-data guard tests |
| `scripts/tests/school-report-view-model-unit.mjs` | No-data class/physical view-model tests |

---

## Exact Edge Case Fixed

**Before:** Empty or null-accuracy cohorts could receive `class_monitor` / `"במעקב"` via `deriveClassGuidanceSeverityTier` defaulting non-finite accuracy to `class_monitor`, or V1/V2 fallbacks when `totalAnswers === 0`.

**After:**

- `deriveClassGuidanceSeverityTier(acc, { hasData: false })` → `null`
- `deriveClassGuidanceSeverityTier(null/NaN, { hasData: true })` → `null` (not `class_monitor`)
- `deriveClassGuidanceSeverityTier(70, { hasData: true })` → `class_monitor` (unchanged)
- Class health signal → existing `"no_data"` (`"אין מספיק נתונים"` via `classHealthHe`)
- School class header chips omit `"מצב כיתה"` when `totalAnswers === 0`

---

## Tests Run

| Test | Result |
|------|--------|
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** |
| `node scripts/tests/diagnostic-report-truth-fix-unit.mjs` | **PASS** |
| `node scripts/tests/school-report-view-model-unit.mjs` | **PASS** |
| `node --env-file=.env.local scripts/tests/student-report-flow-regression.mjs` | **PASS** |

### New test coverage

1. No-data tier: `totalAnswers = 0` / invalid accuracy → not `class_monitor`; `mapClassHealthSignalFromTier(null)` → `no_data`
2. Valid 70% with data → still `class_monitor`
3. School view-model: zero-data class/physical reports do not show `"במעקב"` status chip
4. Existing guidance V2 class tests still pass

---

## Out of Scope (Confirmed Unchanged)

| Finding | Status |
|---------|--------|
| #5 Date range logic | **Not changed** |
| #6 Confidence calculation | **Not changed** |
| #7 Attention score hardcoded thresholds | **Not changed** |
| Parent report aggregation | **Not changed** |
| Individual student tier/badge paths | **Not changed** (already guarded) |

---

## Confirmations

| Constraint | Status |
|------------|--------|
| No UI redesign | ✓ |
| No CSS changes | ✓ |
| No new Hebrew copy | ✓ (reused `no_data` / null chip omission) |
| No SQL migrations | ✓ |
| No commit | ✓ |
| No push | ✓ |

# Parent Report Q1 Simulation QA

**Date:** 2026-06-07  
**Scope:** Parent-context only — Phase Q1 evidence sufficiency, confidence, recurrence, gating, API sanitization  
**Status:** **PASS** (12/12 students)  
**Prerequisite:** Phase Q1 closed (evidence quality layer + parent-facing gating)

---

## Executive summary

Controlled parent-context activity was seeded for all 12 verified QA student accounts under `admin@admin.com`, then verified through the same server pipeline used by `GET /api/parent/students/[studentId]/report-data` (`aggregateParentReportPayload` → `enrichPayloadWithParentFacing` → `stripInternalReportPayloadFields`).

No school, classroom, private-teacher, or cross-context data was used or compared. No product code was changed.

| Area | Result |
|------|--------|
| Scenarios A–I | 12/12 PASS |
| Unit tests (`evidence-quality-layer`) | 38/38 PASS (14 suites) |
| Consumer tests (`diagnostic-truth-consumer-verification`) | included above |
| Cross-context leakage (public API shape) | PASS all 12 |
| Product code changes | None |

---

## QA account matrix

| Alias | Login | Display name | Grade | Parent |
|-------|-------|--------------|-------|--------|
| AAA1 | `aaa1` | בדיקה-א1 | 1 | admin@admin.com |
| AAA2 | `aaa2` | בדיקה-א2 | 1 | admin@admin.com |
| AAA3 | `aaa3` | בדיקה-ב1 | 2 | admin@admin.com |
| AAA4 | `aaa4` | בדיקה-ב2 | 2 | admin@admin.com |
| AAA5 | `aaa5` | בדיקה-ג1 | 3 | admin@admin.com |
| AAA6 | `aaa6` | בדיקה-ג2 | 3 | admin@admin.com |
| AAA7 | `aaa7` | בדיקה-ד1 | 4 | admin@admin.com |
| AAA8 | `aaa8` | בדיקה-ד2 | 4 | admin@admin.com |
| AAA9 | `aaa9` | בדיקה-ה1 | 5 | admin@admin.com |
| AAA10 | `aaa10` | בדיקה-ה2 | 5 | admin@admin.com |
| AAA11 | `aaa11` | בדיקה-ו1 | 6 | admin@admin.com |
| AAA12 | `aaa12` | בדיקה-ו2 | 6 | admin@admin.com |

Login usernames are lowercase in Supabase (`aaa1`..`aaa12`); reports use AAA1..AAA12 aliases per existing QA convention.

---

## Per-student scenario results

Seed tag: `parent-report-q1-sim-v1` (metadata on sessions / clientMeta on answers / title prefix on parent activities).

| Student | Grade | Scenario | Activity type | Subject / topic | Diag answers | Mistakes | Distinct days | Expected sufficiency | Actual sufficiency | Parent-facing result | Pass |
|---------|-------|----------|---------------|-----------------|-------------|----------|---------------|----------------------|--------------------|----------------------|------|
| AAA1 | 1 | A `no_data` | *(none in window)* | — | 0 | 0 | 0 | `no_data` | `no_data` | Generic encouragement only; no strong diagnosis | PASS |
| AAA2 | 1 | B `insufficient_data` | free_practice / practice | math / addition | 3 | 1 | 1 | `insufficient_data` | `insufficient_data` | Strong insights suppressed | PASS |
| AAA3 | 2 | C `preliminary_by_count` | free_practice / practice | math / addition | 8 | 3 | 2 | `preliminary_signal` | `preliminary_signal` | Existing allowed lines only; not `supported_diagnosis` | PASS |
| AAA4 | 2 | D `preliminary_no_recurrence` | free_practice / practice | math / addition | 14 | 4 | 1 | `preliminary_signal` | `preliminary_signal` | `confidenceReason=no_recurrence`; not supported | PASS |
| AAA5 | 3 | E `supported_diagnosis` | free_practice / practice | math / multiplication | 14 | 4 | 2 | `supported_diagnosis` | `supported_diagnosis` | Strong parent-facing lines allowed | PASS |
| AAA6 | 3 | F `parent_assigned` | assigned_parent / homework | math / multiplication | 6 | 2 | 2 | `preliminary_signal` | `preliminary_signal` | Parent-assigned counts as parent evidence | PASS |
| AAA7 | 4 | G `non_diagnostic_exclusion` | learning mode + book | math / multiplication | 0 | 0 | 0 | `no_data` | `no_data` | 8 learning answers; 0 diagnostic; no mastery diagnosis | PASS |
| AAA8 | 4 | I `date_range_1` | free_practice / practice | math / multiplication | 15 | 2 | 2 | `supported_diagnosis` | `supported_diagnosis` | Day=5, week=10, month=15 diag counts | PASS |
| AAA9 | 5 | I `date_range_2` | free_practice / practice | math / fractions | 12 | 2 | 2 | `supported_diagnosis` | `supported_diagnosis` | Apr-19=6, Apr-26=6 diag counts | PASS |
| AAA10 | 5 | H `api_sanitization` | free_practice / practice | math / fractions | 8 | 2 | 2 | `preliminary_signal` | `preliminary_signal` | Public API strip checks pass | PASS |
| AAA11 | 6 | E `supported_grade6` | free_practice / practice | math / fractions | 14 | 4 | 2 | `supported_diagnosis` | `supported_diagnosis` | Grade-6 supported path confirmed | PASS |
| AAA12 | 6 | F `parent_assigned_grade6` | assigned_parent / homework | math / fractions | 6 | 2 | 2 | `preliminary_signal` | `preliminary_signal` | Parent-assigned grade-6 confirmed | PASS |

Verify windows were narrow and aligned to seeded dates (AAA1 used empty future window `2027-01-01..2027-01-07`).

---

## Scenario notes

### A — no_data (AAA1)
- `meta.evidenceQuality.student.dataSufficiency = no_data`
- `confidenceReason = no_diagnostic_evidence`
- No strong Hebrew diagnosis phrases (`נראה שיש קושי`, `כדאי לשים לב ל`, etc.)

### B — insufficient_data (AAA2)
- 3 diagnostic practice answers → `insufficient_data`
- Strong insights suppressed; generic activity encouragement only

### C — preliminary by count (AAA3)
- 8 answers with mistakes → `preliminary_signal`, `confidenceLevel=low`
- Recurrence met at mistake level but count below 12 → stays preliminary (not supported)

### D — preliminary by missing recurrence (AAA4)
- 14 answers, all same day → `preliminary_signal`, `confidenceReason=no_recurrence`

### E — supported_diagnosis (AAA5, AAA11)
- 14 answers, 2+ wrongs across 2 days → `supported_diagnosis`, `confidenceLevel=moderate`
- Strong parent-facing insight lines present (existing Q1-allowed copy)

### F — parent-assigned (AAA6, AAA12)
- 6 homework parent-assigned attempts counted in parent report aggregate
- No teacher/school tables involved
- `preliminary_signal` at 6 answers (below supported threshold)

### G — non-diagnostic exclusion (AAA7)
- 8 `learning` mode answers + book session → `learningAnswers=8`, `diagnosticAnswers=0`
- Evidence quality remains `no_data`; no weakness/mastery diagnosis from guided activity

### H — public API sanitization (all students; AAA10 focal)
- Public payload has `meta.evidenceQuality` (sanitized)
- No `meta._evidenceQuality`, `supportingEvidenceIds`, or `sourceBreakdown` in public shape

### I — date-range behavior (AAA8, AAA9)

**AAA8**

| Range | Expected diag | Actual |
|-------|--------------|--------|
| 2026-04-18 (day) | 5 | 5 |
| 2026-04-18..2026-04-24 (week) | 10 | 10 |
| 2026-04-01..2026-04-30 (month) | ≥15 | 15 |

**AAA9**

| Range | Expected diag | Actual |
|-------|--------------|--------|
| 2026-04-19 (day) | 6 | 6 |
| 2026-04-26 (day) | 6 | 6 |

Counts reflect only parent-context seeded activity in each window.

---

## evidenceQuality snapshots (sanitized)

Representative snapshots from public API-shaped payloads. Internal evidence IDs omitted.

### AAA1 — no_data
```json
{
  "context": "parent",
  "student": {
    "dataSufficiency": "no_data",
    "confidenceLevel": "insufficient_data",
    "confidenceReason": "no_diagnostic_evidence",
    "evidenceCount": 0,
    "recurrenceMet": false
  },
  "bySubject": {},
  "byTopic": {}
}
```

### AAA2 — insufficient_data
```json
{
  "context": "parent",
  "student": {
    "dataSufficiency": "insufficient_data",
    "confidenceLevel": "insufficient_data",
    "confidenceReason": "too_few_questions",
    "evidenceCount": 3,
    "recurrenceMet": false
  },
  "bySubject": { "math": { "dataSufficiency": "insufficient_data", "confidenceLevel": "insufficient_data", "evidenceCount": 3, "recurrenceMet": false } },
  "byTopic": { "math::addition": { "dataSufficiency": "insufficient_data", "confidenceLevel": "insufficient_data", "evidenceCount": 3, "recurrenceMet": false } }
}
```

### AAA4 — preliminary, no recurrence
```json
{
  "student": {
    "dataSufficiency": "preliminary_signal",
    "confidenceLevel": "low",
    "confidenceReason": "no_recurrence",
    "evidenceCount": 14,
    "recurrenceMet": false
  }
}
```

### AAA5 — supported_diagnosis
```json
{
  "student": {
    "dataSufficiency": "supported_diagnosis",
    "confidenceLevel": "moderate",
    "confidenceReason": "supported",
    "evidenceCount": 14,
    "recurrenceMet": true
  },
  "byTopic": { "math::multiplication": { "dataSufficiency": "supported_diagnosis", "confidenceLevel": "moderate", "evidenceCount": 14, "recurrenceMet": true } }
}
```

### AAA6 — parent-assigned preliminary
```json
{
  "student": {
    "dataSufficiency": "preliminary_signal",
    "confidenceLevel": "low",
    "confidenceReason": "below_supported_threshold",
    "evidenceCount": 6,
    "recurrenceMet": true
  }
}
```

Full per-student snapshots: `docs/qa/_artifacts/parent-report-q1-sim/parent-report-q1-sim-results.json`

---

## Cross-context leakage checklist

Verified on all 12 public report payloads (deep key scan + explicit strip checks):

| Check | Result |
|-------|--------|
| No school/classroom data in parent report | PASS |
| No private-teacher data in parent report | PASS |
| No `sourceBreakdown` public leak | PASS |
| No `supportingEvidenceIds` public leak | PASS |
| No `_evidenceQuality` public leak | PASS |
| No classroom/school/private-teacher hint or presence signals | PASS |
| No cross-context report comparison performed | PASS (not in scope) |

---

## Commands run

```powershell
# Seed + verify (primary QA run)
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs

# Re-verify without re-seeding (after script fix: skips cleanup)
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only

# Clean tagged sim data only
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --clean-only

# Unit / consumer verification
node --test tests/learning/evidence-quality-layer.test.mjs tests/reports/diagnostic-truth-consumer-verification.test.mjs
```

**Artifacts created**

| Path | Description |
|------|-------------|
| `scripts/qa/parent-report-q1-simulation.mjs` | Seed + verify harness |
| `docs/qa/_artifacts/parent-report-q1-sim/parent-report-q1-sim-results.json` | Machine-readable results + snapshots |
| `docs/qa/PARENT_REPORT_Q1_SIMULATION_QA.md` | This report |

**Build:** Not run — no product code touched.

---

## Failures / fixes during QA

| Issue | Resolution |
|-------|------------|
| Access code lookup used uppercase `AAA1` | Fixed: production logins are lowercase `aaa1`..`aaa12` |
| Supported scenarios (AAA5/11) stayed `preliminary_signal` | Fixed seed schedule: wrong answers spread across 2+ days |
| `--verify-only` deleted seeded data | Fixed: cleanup skipped when `--verify-only` |
| Date-range students (AAA8/9) expected `preliminary_signal` | Updated expectation to `supported_diagnosis` (12+ answers + recurrence by design) |

No product bugs filed. No commits or pushes.

---

## Scope guard confirmation

- Parent report only — no teacher/school/private-teacher surfaces exercised
- No Q2 metadata, Q3 telemetry, UI/Hebrew rewrite, SQL migrations, auth, coins, or cross-context alignment
- Simulation tagged data isolated via `parent-report-q1-sim-v1`; cleanup is tag-scoped only

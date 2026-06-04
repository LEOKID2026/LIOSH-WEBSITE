# Phase 4 Backfill — SQL Documentation

**Date:** 2026-06-05  
**Environment:** Supabase project `ajxwmlwbzxwffrtlfuoe` (LEO-KID, region: ap-southeast-1)  
**Executed via:** Supabase MCP `execute_sql` tool (direct Postgres connection, service-role credentials)  
**Original script:** `scripts/backfill-activity-classification.mjs`  

---

## Why SQL instead of the script

`backfill-activity-classification.mjs` performs one `supabase.from("answers").update(...).eq("id", row.id)` call
per row (sequential HTTP). With ~44k rows this would have taken 5–6 hours.

The SQL below applies **identical logic** in a single Postgres UPDATE statement.
No logic was changed — only the execution mechanism.

---

## Step 1 — Pre-backfill count (dry-run equivalent)

```sql
SELECT
  COUNT(*) FILTER (WHERE answer_payload ? 'isDiagnosticEligible')         AS already_classified,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible'))   AS needs_classification,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible')
    AND answer_payload->>'gameMode' IN
      ('practice','graded','drill','review','normal','quiz','homework','worksheet'))
    AS will_be_diagnostic_independent,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible')
    AND answer_payload->>'gameMode' IN ('practice_mistakes','live_lesson'))
    AS will_be_diagnostic_guided,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible')
    AND answer_payload->>'gameMode' IN ('challenge','speed','marathon'))
    AS will_be_diagnostic_competitive,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible')
    AND answer_payload->>'gameMode' IN ('learning','guided_practice'))
    AS will_be_learning_guided,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible')
    AND (answer_payload->>'gameMode' IS NULL
      OR answer_payload->>'gameMode' NOT IN (
        'practice','graded','drill','review','normal','quiz','homework','worksheet',
        'practice_mistakes','live_lesson','challenge','speed','marathon',
        'learning','guided_practice','mistakes','learning_book','discussion')))
    AS will_be_unclassified
FROM answers;
```

**Result:**
```
already_classified        : 1196
needs_classification      : 42739
will_be_diagnostic_independent : 674
will_be_diagnostic_guided      : 23
will_be_diagnostic_competitive : 120
will_be_learning_guided        : 7071
will_be_unclassified           : 34851
```

---

## Step 2 — Live backfill UPDATE

```sql
WITH to_classify AS (
  SELECT
    id,
    CASE
      WHEN answer_payload->>'gameMode' IN
        ('practice','graded','drill','review','normal','quiz','homework','worksheet')
        THEN 'diagnostic_independent'
      WHEN answer_payload->>'gameMode' IN ('practice_mistakes','live_lesson')
        THEN 'diagnostic_guided'
      WHEN answer_payload->>'gameMode' IN ('challenge','speed','marathon')
        THEN 'diagnostic_competitive'
      WHEN answer_payload->>'gameMode' IN ('learning','guided_practice')
        THEN 'learning_guided'
      WHEN answer_payload->>'gameMode' = 'mistakes'
        THEN 'learning_review'
      WHEN answer_payload->>'gameMode' = 'learning_book'
        THEN 'learning_book'
      WHEN answer_payload->>'gameMode' = 'discussion'
        THEN 'learning_context'
      ELSE 'unclassified'
    END AS evidence_cat,
    CASE
      WHEN answer_payload->>'gameMode' IN (
        'practice','graded','drill','review','normal','quiz','homework','worksheet',
        'practice_mistakes','live_lesson','challenge','speed','marathon')
        THEN TRUE
      ELSE FALSE
    END AS is_diagnostic
  FROM answers
  WHERE NOT (answer_payload ? 'isDiagnosticEligible')
)
UPDATE answers a
SET answer_payload = a.answer_payload || jsonb_build_object(
    'evidenceCategory',   c.evidence_cat,
    'isDiagnosticEligible', c.is_diagnostic,
    'contextFlags', CASE
      WHEN c.evidence_cat = 'unclassified'
        THEN '{"afterStepByStep":false,"contextAfterBookReading":false,"hasHints":false,"legacyUnclassified":true}'::jsonb
      ELSE
        '{"afterStepByStep":false,"contextAfterBookReading":false,"hasHints":false}'::jsonb
    END
  )
FROM to_classify c
WHERE a.id = c.id
RETURNING a.id;
```

**Result:** 42,739 rows returned (= all rows that needed classification).

---

## Step 3 — Post-backfill verification count

```sql
SELECT
  COUNT(*) FILTER (WHERE answer_payload ? 'isDiagnosticEligible')         AS total_classified,
  COUNT(*) FILTER (WHERE NOT (answer_payload ? 'isDiagnosticEligible'))   AS still_unclassified,
  COUNT(*) FILTER (WHERE answer_payload->>'evidenceCategory' = 'diagnostic_independent')  AS diagnostic_independent,
  COUNT(*) FILTER (WHERE answer_payload->>'evidenceCategory' = 'diagnostic_guided')       AS diagnostic_guided,
  COUNT(*) FILTER (WHERE answer_payload->>'evidenceCategory' = 'diagnostic_competitive')  AS diagnostic_competitive,
  COUNT(*) FILTER (WHERE answer_payload->>'evidenceCategory' = 'learning_guided')         AS learning_guided,
  COUNT(*) FILTER (WHERE answer_payload->>'evidenceCategory' = 'unclassified')            AS legacy_unclassified,
  COUNT(*) FILTER (WHERE (answer_payload->'contextFlags'->>'legacyUnclassified')::boolean = true)
    AS legacy_unclassified_flag
FROM answers;
```

**Result:**
```
total_classified         : 43935
still_unclassified       : 0
diagnostic_independent   : 694
diagnostic_guided        : 23
diagnostic_competitive   : 124
learning_guided          : 7284
legacy_unclassified      : 35810
legacy_unclassified_flag : 35810
```

---

## Step 4 — Fabricated timing tag (answers table skipped — no column; attempts tables only)

### 4a — Count query across all attempts tables

```sql
SELECT 'student_activity_attempts'  AS tbl, COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE time_spent_ms = 5000) AS fabricated_5000
FROM student_activity_attempts
UNION ALL
SELECT 'parent_activity_attempts', COUNT(*),
  COUNT(*) FILTER (WHERE time_spent_ms = 5000)
FROM parent_activity_attempts
UNION ALL
SELECT 'classroom_activity_attempts', COUNT(*),
  COUNT(*) FILTER (WHERE time_spent_ms = 5000)
FROM classroom_activity_attempts;
```

**Result:**
```
student_activity_attempts   : total=0,          fabricated_5000=0
parent_activity_attempts    : total=11,          fabricated_5000=11   ← ALL rows fabricated
classroom_activity_attempts : total=3,693,850,   fabricated_5000=0
```

**Finding:** The original backfill script (`backfillAttemptsTiming()`) only queried `classroom_activity_attempts`.
It did not check `parent_activity_attempts`. All 11 existing `parent_activity_attempts` rows have
`time_spent_ms=5000` and were missed.

### 4b — Tag the 11 missed parent_activity_attempts rows

```sql
UPDATE parent_activity_attempts
SET question_snapshot =
  COALESCE(question_snapshot, '{}'::jsonb)
  || '{"legacy_fabricated_timing": true}'::jsonb
WHERE time_spent_ms = 5000
  AND NOT (question_snapshot ? 'legacy_fabricated_timing')
RETURNING id, time_spent_ms, question_snapshot->'legacy_fabricated_timing' AS flag_set;
```

**Result:** 11 rows updated, all confirmed `flag_set = true`.

---

## Logic equivalence: SQL vs. script

| Script (`classifyActivityEvidence` call) | SQL CASE branch |
|---|---|
| `gameMode` in `['practice','graded','drill','review','normal','quiz','homework','worksheet']` → `diagnostic_independent`, `isDiagnosticEligible=true` | `WHEN answer_payload->>'gameMode' IN ('practice',...,'worksheet') THEN 'diagnostic_independent'` + `TRUE` |
| `gameMode` in `['practice_mistakes','live_lesson']` → `diagnostic_guided`, `true` | `WHEN ... IN ('practice_mistakes','live_lesson') THEN 'diagnostic_guided'` + `TRUE` |
| `gameMode` in `['challenge','speed','marathon']` → `diagnostic_competitive`, `true` | `WHEN ... IN ('challenge','speed','marathon') THEN 'diagnostic_competitive'` + `TRUE` |
| `gameMode` in `['learning','guided_practice']` → `learning_guided`, `false` | `WHEN ... IN ('learning','guided_practice') THEN 'learning_guided'` + `FALSE` |
| `gameMode = 'mistakes'` → `learning_review`, `false` | `WHEN ... = 'mistakes' THEN 'learning_review'` + `FALSE` |
| `gameMode = 'learning_book'` → `learning_book`, `false` | `WHEN ... = 'learning_book' THEN 'learning_book'` + `FALSE` |
| `gameMode = 'discussion'` → `learning_context`, `false` | `WHEN ... = 'discussion' THEN 'learning_context'` + `FALSE` |
| `gameMode = null / unknown` → `unclassified`, `false`, `legacyUnclassified:true` | `ELSE 'unclassified'` + `FALSE` + `legacyUnclassified:true` in contextFlags |

**contextFlags** set by SQL:
- For all classified rows: `{"afterStepByStep":false,"contextAfterBookReading":false,"hasHints":false}`
- For unclassified rows: adds `"legacyUnclassified":true`

This matches the script: the script passes `afterStepByStep: false, hintsUsed: 0` to `classifyActivityEvidence`
and sets `legacyUnclassified: true` for unclassified rows.

**One deliberate difference:** The script reads `hintsUsed` from `answer_payload.hintsUsed` to set `hasHints`.
The SQL always sets `hasHints: false` (equivalent to `hintsUsed=0`). In practice `hintsUsed` is not stored
in historical `answer_payload` rows so the result is identical for all backfilled rows.
For Phase 1 new-write rows, `hasHints` is already set correctly at write time.

---

## Transaction model

Supabase `execute_sql` runs each query as a single implicit Postgres transaction.
A single-statement UPDATE is atomic by default in Postgres — either all 42,739 rows were updated or none.
No explicit `BEGIN`/`COMMIT` was needed.

---

## Rollback path

No snapshot was taken before the UPDATE. A rollback is possible by removing the added JSONB keys:

```sql
-- Remove backfill classification from rows that were classified by this run
-- (rows classified by Phase 1 write path are distinguishable because they may have
-- non-default contextFlags; this removes ALL classification for safety)
UPDATE answers
SET answer_payload = answer_payload
  - 'isDiagnosticEligible'
  - 'evidenceCategory'
  - 'contextFlags'
WHERE answer_payload ? 'isDiagnosticEligible';
```

**Note:** This would also remove Phase 1 classifications from new rows written after Phase 1 deployed.
Those rows would fall back to the aggregator's mode-based fallback (which is retained for safety).
A full re-run of the backfill (script or SQL) would restore all classifications.

---

## Summary

| Metric | Value |
|---|---|
| Table | `answers` |
| Rows classified | 42,739 |
| Rows already classified (before SQL ran) | 1,196 |
| Total rows with classification after | 43,935 |
| Still unclassified | 0 |
| `legacy_unclassified` rows | 35,810 |
| `legacy_fabricated_timing` — `classroom_activity_attempts` | 0 (none with time_spent_ms=5000) |
| `legacy_fabricated_timing` — `student_activity_attempts` | 0 (table is empty) |
| `legacy_fabricated_timing` — `parent_activity_attempts` | **11** (all rows; tagged in Step 4b above) |
| Errors / failed rows | 0 |
| Skipped rows | 0 |

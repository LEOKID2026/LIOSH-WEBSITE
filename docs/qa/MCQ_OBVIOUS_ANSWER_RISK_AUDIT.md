# MCQ Obvious Answer Risk Audit

**Generated:** 2026-06-08T21:01:00.369Z
**Verdict:** PASS

## Command

```powershell
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
```

## Summary

| Metric | Count |
|--------|------:|
| MCQ scanned | 9913 |
| Flagged questions | 0 |
| BLOCKER | 0 |
| FAIL | 0 |
| WARN | 0 |

## Per-subject

| Subject | MCQ total | Flagged | FAIL | WARN |
|---------|----------:|--------:|-----:|-----:|
| english | 953 | 0 | 0 | 0 |
| geometry | 792 | 0 | 0 | 0 |
| hebrew | 1683 | 0 | 0 | 0 |
| math | 1422 | 0 | 0 | 0 |
| moledet_geography | 4046 | 0 | 0 | 0 |
| science | 1017 | 0 | 0 | 0 |

## Top flagged examples (first 30)

---

## Diagnostic handling recommendation

### Current state

- **No runtime field** marks MCQ obvious-answer risk today. Phase 8 `questionEngine` exposes `answerLeakageRisk` (`stem_leak`, `explanation_shown`, etc.) but not obviousness/trivial-guess quality.
- **`questionQuality`** appears in the diagnostic master plan as a 0–1 engine-metadata confidence score, not MCQ distractor quality.
- **Canonical metadata contract** (`QUESTION_METADATA_CONTRACT.md`) has no `mcqObviousnessRisk` field yet; Q2-D validator enforces skill/topic/answerFormat only.
- **Frozen snapshots** preserve `params.canonicalMetadata` and Phase 8 `questionEngine`; a new internal-only field could be added additively without changing public parent API.
- **Evidence quality (Q1/Q2-E)** counts diagnostic answers and recurrence; it does **not** downweight by question quality.
- **Flags** `DIAGNOSTIC_METADATA_*` default OFF; no consumption path exists for quality-based exclusion.

### Recommended future design (no active change in this pass)

```json
{
  "questionQuality": {
    "mcqObviousnessRisk": "none | warn | fail | blocker",
    "mcqObviousnessCategories": ["A_length_outlier", "..."],
    "auditedAt": "ISO-8601",
    "auditVersion": "mcq-obvious-v1"
  }
}
```

| Property | Recommendation |
|----------|----------------|
| Storage | `params.canonicalMetadata.questionQuality` or sibling internal block |
| Preservation | Copy into frozen activity snapshot at assign/freeze time |
| Public API | Strip in `stripInternalReportPayloadFields` — never in parent `meta.evidenceQuality` |
| Diagnostic use | Optional downweight/exclude behind **new default-OFF** flag e.g. `DIAGNOSTIC_MCQ_QUALITY_DOWNWEIGHT_ENABLED` |
| Scope | Parent-context only at first; no school/teacher parity until approved |
| Behavior | Audit populates severity; engine ignores until flag ON |

### Risks

- False positives from heuristic audit could suppress valid evidence if flag enabled prematurely.
- Generator-only sampling may miss per-session shuffle bugs; pool-level index skew (category G) needs runtime telemetry.
- Adding consumption before bank fixes could hide real weaknesses instead of improving items.

### Confirmation

**No active diagnostic behavior was changed in this audit pass.**
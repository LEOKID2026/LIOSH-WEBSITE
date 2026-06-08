# MCQ Option Count Audit

**Generated:** 2026-06-08T17:31:50.699Z
**Verdict:** **PASS**

## Summary

| Metric | Count |
|--------|------:|
| Total MCQs scanned | 6212 |
| Exactly 4 options | 6212 |
| 2 options | 0 |
| 3 options | 0 |
| >4 options | 0 |
| Duplicate options | 0 |
| Correct missing from options | 0 |
| Fail rows | 0 |

## By subject

| Subject | Total | Fail | 2-opt | 3-opt | Not-4 (enforced) |
|---------|------:|-----:|------:|------:|-----------------:|
| english | 1664 | 0 | 0 | 0 | 0 |
| geometry | 5 | 0 | 0 | 0 | 0 |
| hebrew | 5 | 0 | 0 | 0 | 0 |
| math | 5 | 0 | 0 | 0 | 0 |
| moledet_geography | 3511 | 0 | 0 | 0 | 0 |
| science | 1022 | 0 | 0 | 0 | 0 |

## Commands

```powershell
npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs
```

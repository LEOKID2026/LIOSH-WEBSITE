# Question Bank Integrity Audit

**Generated:** 2026-06-08T21:01:03.308Z
**Verdict:** PASS

## Scope

- Total questions scanned: **9913**
- Static bank rows: **6511**
- Generated samples: **3402** (6 per matrix cell for math/geometry/hebrew/moledet)
- Subjects: math, geometry, hebrew, english, science, moledet_geography

## Command

```powershell
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
```

## Per-subject totals

| Subject | Total | Structural pass | Structural fail | Leak risk | Missing metadata | Duplicate options | Broken answer |
|---------|------:|----------------:|----------------:|----------:|-----------------:|------------------:|--------------:|
| english | 953 | 953 | 0 | 0 | 0 | 0 | 0 |
| geometry | 792 | 792 | 0 | 0 | 0 | 0 | 0 |
| hebrew | 1683 | 1683 | 0 | 0 | 0 | 0 | 0 |
| math | 1422 | 1422 | 0 | 0 | 0 | 0 | 0 |
| moledet_geography | 4046 | 4046 | 0 | 0 | 0 | 0 | 0 |
| science | 1017 | 1017 | 0 | 0 | 0 | 0 | 0 |

## Top 20 examples

## Notes

- Generator subjects are sampled, not exhaustively enumerated.
- Static banks (science, english, moledet, hebrew rich) are scanned in full where loaded.
- Metadata validation uses Q2-D `validateCanonicalMetadataBlock` (100% coverage expected per Q2-D validator).
- No product files modified by this audit.
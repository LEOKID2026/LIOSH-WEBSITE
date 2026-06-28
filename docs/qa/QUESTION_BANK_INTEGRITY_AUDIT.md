# Question Bank Integrity Audit

**Generated:** 2026-06-28T20:48:10.336Z
**Verdict:** NOT_PASS

## Scope

- Total questions scanned: **11618**
- Static bank rows: **8216**
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
| geometry | 792 | 792 | 0 | 10 | 0 | 0 | 0 |
| hebrew | 4005 | 4005 | 0 | 2 | 0 | 0 | 0 |
| math | 1422 | 1422 | 0 | 5 | 0 | 0 | 0 |
| moledet_geography | 3429 | 2889 | 540 | 0 | 540 | 0 | 540 |
| science | 1017 | 1017 | 0 | 0 | 0 | 0 | 0 |

## Top 20 examples

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample0 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample1 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample2 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample3 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample4 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:easy:sample5 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample0 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample1 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample2 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample3 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample4 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:medium:sample5 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample0 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample1 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample2 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample3 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample4 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 homeland
- **Source:** generator:moledet_geography:g2:homeland:hard:sample5 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 community
- **Source:** generator:moledet_geography:g2:community:easy:sample0 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

### STRUCTURAL — moledet_geography g2 community
- **Source:** generator:moledet_geography:g2:community:easy:sample1 (utils/moledet-geography-question-generator.js)
- **ID:** n/a
- **Stem:** 
- **Issue:** missing_stem — question stem/text missing or too short
- **Issue:** missing_answer — no correctAnswer and no MCQ answers array
- **Issue:** metadata — skillId required

## Notes

- Generator subjects are sampled, not exhaustively enumerated.
- Static banks (science, english, moledet, hebrew rich) are scanned in full where loaded.
- Metadata validation uses Q2-D `validateCanonicalMetadataBlock` (100% coverage expected per Q2-D validator).
- No product files modified by this audit.
# Grade 4 Science Learning Book — Plan

**Status:** Draft content package — documentation only. No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מדעים — כיתה ד׳ `[DRAFT — not owner-approved]`  
**Master scope:** `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Grade 4 Skills — 6 pages

| Order | learning_page_id | skill_id | File | Title [DRAFT] |
|------:|------------------|----------|------|---------------|
| 1 | `science:g4:body` | `science:topic:body` | `body.md` | גוף האדם — נשימה ועיכול |
| 2 | `science:g4:animals` | `science:topic:animals` | `animals.md` | בעלי חיים — יחסי גומלין |
| 3 | `science:g4:materials` | `science:topic:materials` | `materials.md` | חומרים — שינויים וחשמל (מושגי) |
| 4 | `science:g4:earth_space` | `science:topic:earth_space` | `earth_space.md` | כדור הארץ — סלעים, קרקע ועונות |
| 5 | `science:g4:environment` | `science:topic:environment` | `environment.md` | סביבה — שמירת משאבים |
| 6 | `science:g4:experiments` | `science:topic:experiments` | `experiments.md` | תכנון ניסוי |

**Age band:** `grades_3_4` | **Pages:** 6

### Excluded

| skill_id | Reason |
|----------|--------|
| `science:topic:plants` | Spine `maxGrade = 3` — no G4 plant page |

### G4 materials — electricity rule

May mention **מוליך / מבודד** conceptually only. **No circuit-building instructions.**

---

## Batches

| Batch | Pages | Focus |
|-------|-------|-------|
| A | body, animals | Life — systems & interactions |
| B | materials, earth_space, environment | Matter, Earth, resources |
| C | experiments | Full inquiry planning |

---

## Deliverables

| Item | Path |
|------|------|
| Plan | `SCIENCE_GRADE_4_LEARNING_BOOK_PLAN.md` |
| Drafts | `science/g4/drafts/*.md` (6) |
| Review pack | `SCIENCE_GRADE_4_HEBREW_REVIEW_PACK.md` (generated) |
| Builder | `scripts/build-science-g4-hebrew-review-pack.mjs` |
| Verifier | `scripts/verify-science-g4-book-content.mjs` |

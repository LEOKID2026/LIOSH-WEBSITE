# Grade 3 Science Learning Book — Plan

**Status:** Draft content package — documentation only. No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מדעים — כיתה ג׳ `[DRAFT — not owner-approved]`  
**Master scope:** `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Grade 3 Skills — 7 pages

| Order | learning_page_id | skill_id | File | Title [DRAFT] |
|------:|------------------|----------|------|---------------|
| 1 | `science:g3:body` | `science:topic:body` | `body.md` | גוף האדם — מערכות בסיסיות |
| 2 | `science:g3:animals` | `science:topic:animals` | `animals.md` | בעלי חיים — התאמה לסביבה |
| 3 | `science:g3:plants` | `science:topic:plants` | `plants.md` | צמחים — תנאי גידול (סיכום) |
| 4 | `science:g3:materials` | `science:topic:materials` | `materials.md` | חומרים — כוחות ותנועה |
| 5 | `science:g3:earth_space` | `science:topic:earth_space` | `earth_space.md` | כדור הארץ — מזג אוויר ומים |
| 6 | `science:g3:environment` | `science:topic:environment` | `environment.md` | סביבה — מערכות קטנות |
| 7 | `science:g3:experiments` | `science:topic:experiments` | `experiments.md` | ניסוי מדעי קצר |

**Age band:** `grades_3_4` | **Pages:** 7

### Plants — final spine page (G3 only)

`science:topic:plants` has `maxGrade = 3`. This page **consolidates** G1–G3 plant learning (parts, needs, light → food). **No G4 plant page.**

### Excluded

None within science spine for G3.

---

## Batches

| Batch | Pages | Focus |
|-------|-------|-------|
| A | body, animals, plants | Life systems |
| B | materials, earth_space, environment | Matter & Earth |
| C | experiments | Inquiry |

---

## Section 5 / 6 anchors

| Page | §5 | §6 |
|------|----|----|
| body | שלד, שרירים | same |
| animals | התאמה, סביבה | same |
| plants | אור, מזון | same |
| materials | דחיפה, משיכה | same |
| earth_space | מחזור, מים | same |
| environment | שרשרת, מזון | same |
| experiments | השערה, משתנה | same |

---

## Deliverables

| Item | Path |
|------|------|
| Plan | `SCIENCE_GRADE_3_LEARNING_BOOK_PLAN.md` |
| Drafts | `science/g3/drafts/*.md` (7) |
| Review pack | `SCIENCE_GRADE_3_HEBREW_REVIEW_PACK.md` (generated) |
| Builder | `scripts/build-science-g3-hebrew-review-pack.mjs` |
| Verifier | `scripts/verify-science-g3-book-content.mjs` |

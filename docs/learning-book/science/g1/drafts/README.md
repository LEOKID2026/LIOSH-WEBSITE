# Grade 1 Science Learning Book — Drafts

**Status:** Draft content — **6 / 6** pages. No runtime insertion.  
**Plan:** `docs/learning-book/SCIENCE_GRADE_1_LEARNING_BOOK_PLAN.md`  
**Master scope:** `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`  
**Date:** June 2026  
**Folder:** `docs/learning-book/science/g1/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/SCIENCE_GRADE_1_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **6 / 6** (Batches A–B) |
| Content verification | ✅ `scripts/verify-science-g1-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/science-g1-draft-manifest.mjs` |
| Runtime routes / registry | ❌ Not created |

---

## Naming

- Child-facing book content uses **מדעים**.
- Internal IDs remain `science:g1:{topic}` and `subject: science`.

---

## Batch A — עולם החיים (3)

| File | Draft title |
|------|-------------|
| `body.md` | גוף האדם — חושים ותנועה |
| `animals.md` | בעלי חיים — חי לעומת דומם |
| `plants.md` | צמחים — מה צמחים צריכים |

---

## Batch B — חומרים, כדור הארץ וסביבה (3)

| File | Draft title |
|------|-------------|
| `materials.md` | חומרים — תכונות יומיומיות |
| `earth_space.md` | כדור הארץ ומזג אוויר |
| `environment.md` | הסביבה שלנו |

---

## Notes

- All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g1`.
- Section 7: text-only — **no practice routing**.
- No unsafe experiments, chemicals, fire, or electricity instructions.
- `science:topic:experiments` excluded in G1 (spine minGrade 2).

---

## Verify

```bash
node scripts/verify-science-g1-book-content.mjs
node scripts/verify-science-learning-book-master-scope.mjs
```

---

## Explicit Stop Rule

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Hebrew drafts remain source for a future runtime task

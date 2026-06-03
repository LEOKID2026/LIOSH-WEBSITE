# Grade 1 Moledet / Geography Learning Book — Drafts

**Status:** Draft content — **6 / 6** pages. Not owner-approved. Runtime not wired.  
**Date:** June 2026  
**Folder:** `docs/learning-book/moledet-geography/g1/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_LEARNING_BOOK_PLAN.md` |
| Master scope | ✅ `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` |
| Draft markdown pages | ✅ **6 / 6** |
| Review pack | ✅ `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-moledet-geography-g1-book-content.mjs` |
| Draft manifest | ✅ `scripts/lib/moledet-geography-g1-draft-manifest.mjs` |
| Runtime routes / registry | ❌ Not created |

---

## Naming

- Child-facing book: **ספר מולדת וגאוגרפיה — כיתה א׳**
- Internal IDs: `geography:g1:{page_id}`, `subject: geography`

---

## Batch A — משפחה וקהילה (2)

| File | Draft title |
|------|-------------|
| `mg_g1_family.md` | המשפחה ותפקידיה |
| `mg_g1_close_community.md` | הקהילה הקרובה — כיתה ובית ספר |

## Batch B — מפות (3)

| File | Draft title |
|------|-------------|
| `mg_g1_class_map.md` | מפת הכיתה |
| `mg_g1_school_map.md` | מפת בית הספר |
| `mg_g1_directions.md` | כיוונים בסיסיים |

## Batch C — אזרחות (1)

| File | Draft title |
|------|-------------|
| `mg_g1_behavior_cooperation.md` | כללי התנהגות ושיתוף פעולה |

---

## Notes

- All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g1`.
- Section 7: draft invitation only — **no practice routing**.
- No national Israel map content in Grade 1.
- Map pages may need diagrams at runtime — see plan §4.

---

## Regenerate review pack

```bash
node scripts/build-moledet-geography-g1-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g1-book-content.mjs
```

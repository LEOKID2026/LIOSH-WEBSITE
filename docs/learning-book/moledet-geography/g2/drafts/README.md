# Grade 2 Moledet / Geography Learning Book — Drafts

**Status:** Draft content — **7 / 7** pages. Not owner-approved. Runtime not wired.  
**Date:** June 2026  
**Folder:** `docs/learning-book/moledet-geography/g2/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_2_LEARNING_BOOK_PLAN.md` |
| Grade 1 book | ✅ prior grade reference — not modified |
| Draft markdown pages | ✅ **7 / 7** |
| Review pack | ✅ `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_2_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-moledet-geography-g2-book-content.mjs` |
| Draft manifest | ✅ `scripts/lib/moledet-geography-g2-draft-manifest.mjs` |
| Runtime routes / registry | ❌ Not created |

---

## Naming

- Child-facing book: **ספר מולדת וגאוגרפיה — כיתה ב׳**
- Internal IDs: `geography:g2:{page_id}`, `subject: geography`

---

## Batch A — שכונה (3)

| File | Draft title |
|------|-------------|
| `mg_g2_neighborhood.md` | השכונה ומבניה |
| `mg_g2_neighborhood_map.md` | מפת השכונה |
| `mg_g2_community_services.md` | שירותים בקהילה |

## Batch B — ארץ ישראל (1)

| File | Draft title |
|------|-------------|
| `mg_g2_israel_basics.md` | ארץ ישראל — מושגים בסיסיים |

## Batch C — חברה ואזרחות (3)

| File | Draft title |
|------|-------------|
| `mg_g2_group_decisions.md` | קבלת החלטות בקבוצה |
| `mg_g2_society_responsibility.md` | חברה ואחריות |
| `mg_g2_community_participation.md` | השתתפות בקהילה |

---

## Notes

- All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g2`.
- `mg_g2_israel_basics`: vocabulary only — **no full country map**.
- Section 7: no practice routing.

---

## Regenerate review pack

```bash
node scripts/build-moledet-geography-g2-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g2-book-content.mjs
```

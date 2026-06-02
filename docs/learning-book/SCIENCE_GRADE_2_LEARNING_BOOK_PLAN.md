# Grade 2 Science Learning Book — Plan

**Status:** Draft content package — documentation only. No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מדעים — כיתה ב׳ `[DRAFT — not owner-approved]`  
**Master scope:** `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical skills |
| `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | G2 scope and depth |
| `docs/learning-book/SCIENCE_GRADE_1_LEARNING_BOOK_PLAN.md` | Prior grade progression |
| `scripts/lib/science-g2-draft-manifest.mjs` | Page order + anchors |

**Subject naming:** Child-facing copy uses **מדעים**. Internal IDs remain `science`.

---

## 1. Grade 2 Skills — 7 spine rows → 7 pages

| # | topic | skill_id | Draft title |
|---|-------|----------|-------------|
| 1 | body | `science:topic:body` | גוף האדם — בריאות והרגלים |
| 2 | animals | `science:topic:animals` | בעלי חיים — מחזור חיים |
| 3 | plants | `science:topic:plants` | צמחים — גדילה ומחזור |
| 4 | materials | `science:topic:materials` | חומרים — מצבי צבירה |
| 5 | earth_space | `science:topic:earth_space` | כדור הארץ — עונות ושמיים |
| 6 | environment | `science:topic:environment` | סביבה — שמירה על הטבע |
| 7 | experiments | `science:topic:experiments` | תצפית וחקירה |

**Page count:** 7 · **Age band:** `grades_1_2`

### New in Grade 2

- `science:topic:experiments` — first grade with scientific inquiry page

### Continuing from Grade 1 (depth shift)

| Topic | G1 | G2 shift |
|-------|-----|----------|
| body | senses, movement | health habits, hygiene |
| animals | living vs non-living | life cycles |
| plants | parts, needs | seed → plant, growth cycle |
| materials | touch properties | solid / liquid / gas |
| earth_space | daily weather | seasons, sun as light source |
| environment | litter awareness | protecting local nature |

---

## 2. Experiments Page (G2 first)

`experiments.md` rules:
- **Safe and conceptual only:** observation, comparison, fair-test intro (one variable)
- With teacher only; no chemicals, fire, sharp tools, electricity wiring
- No step-by-step dangerous procedures

---

## 3. Illustration Flags

| Page | Suggested asset |
|------|-----------------|
| animals | Life-cycle diagram (butterfly or frog) |
| plants | Seed → sprout stages |
| materials | Ice melting illustration |
| earth_space | Four seasons simple diagram |
| experiments | Two identical setups, one variable labeled |

---

## 4. Owner-Review Questions

1. Approve life-cycle examples (פרפר, צפרדע, כלב)?
2. Is "גז" at breathing-air level sufficient for Grade 2?
3. Seasons list (קיץ/חורף/אביב/סתיו) — match curriculum?
4. Fair-test ice-in-water example — acceptable classroom observation?
5. Identity overlap with Moledet environment pages — acceptable?

---

## 5. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/SCIENCE_GRADE_2_LEARNING_BOOK_PLAN.md` | ✅ |
| 7 drafts | `docs/learning-book/science/g2/drafts/` | ✅ |
| README | `docs/learning-book/science/g2/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/science-g2-draft-manifest.mjs` | ✅ |
| Review pack | `docs/learning-book/SCIENCE_GRADE_2_HEBREW_REVIEW_PACK.md` | generated |
| Build + verify | `scripts/build-science-g2-hebrew-review-pack.mjs`, `scripts/verify-science-g2-book-content.mjs` | ✅ |

```bash
node scripts/build-science-g2-hebrew-review-pack.mjs
node scripts/verify-science-g2-book-content.mjs
```

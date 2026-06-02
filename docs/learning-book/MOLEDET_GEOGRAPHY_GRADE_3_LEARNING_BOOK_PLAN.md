# Grade 3 Moledet / Geography Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מולדת וגאוגרפיה — כיתה ג׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list (`subject: geography`) |
| `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master scope |
| `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_LEARNING_BOOK_PLAN.md` | Prior grades — not reused |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 3–4 seven-section template |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Page + skill bindings |

---

## 1. Grade 3 Skills — 12 spine rows → 8 pages

| page_id | Hebrew title | Primary skill |
|---------|--------------|---------------|
| `mg_g3_israel_map` | מפת ישראל | `geography:g3:geography:geography_0_מפת_ישראל` |
| `mg_g3_regions_cities` | אזורים וערים גדולות | `geography:g3:geography:geography_1_אזורים_וערים` |
| `mg_g3_landscapes` | סוגי נופים | `geography:g3:geography:geography_2_סוגי_נופים` |
| `mg_g3_water_sources` | מקורות מים | `geography:g3:geography:geography_3_מקורות_מים` |
| `mg_g3_districts_borders` | מחוזות וגבולות | `geography:g3:skills:skills_3_הבנת_מחוזות_וגבולות` |
| `mg_g3_citizenship_basics` | כללי אזרחות בסיסיים | `geography:g3:citizenship:citizenship_0_כללי_אזרחות_בסיסיים` |
| `mg_g3_rights_duties` | זכויות וחובות | `geography:g3:citizenship:citizenship_2_זכויות_וחובות` |
| `mg_g3_social_participation` | השתתפות חברתית | `geography:g3:citizenship:citizenship_1_השתתפות_חברתית` |

**Page count:** 8 · **Age band:** `grades_3_4` · **Cognitive level (spine):** application

---

## 2. Place-Name Verification Notes [VERIFY]

| Page | Names / labels in child copy | Owner action |
|------|------------------------------|--------------|
| `mg_g3_israel_map` | General map labels (sea, land) | Approve map asset + labels |
| `mg_g3_regions_cities` | צפון, מרכז, דרום — no named cities in draft | **Approve city list** before adding names |
| `mg_g3_water_sources` | Generic ים, אגם, נחל | If specific bodies named on map — **VERIFY** |
| `mg_g3_districts_borders` | מחוז, גבול — concepts only | **VERIFY** district/border terminology |

Draft intentionally avoids specific city names until owner approves spellings and list.

---

## 3. Map / Diagram Needs

| Page | Asset |
|------|-------|
| `mg_g3_israel_map` | Simplified Israel outline map — **required at runtime** |
| `mg_g3_regions_cities` | Map with north/center/south zones — **VERIFY** colors/labels |
| `mg_g3_districts_borders` | Optional district lines — **VERIFY** before publish |

---

## 4. Owner-Review Questions

1. Approved **city list** for `mg_g3_regions_cities`?
2. Approved **district/border** wording for Grade 3 reading level?
3. Water bodies to name on `mg_g3_water_sources` (Kinneret, etc.) — yes/no?
4. Approve **8-page consolidation**?

---

## 5. Deliverables

| Deliverable | Status |
|-------------|--------|
| Plan | ✅ |
| 8 drafts | ✅ `docs/learning-book/moledet-geography/g3/drafts/` |
| Review pack | ✅ generated |
| `scripts/build-moledet-geography-g3-hebrew-review-pack.mjs` | ✅ |
| `scripts/verify-moledet-geography-g3-book-content.mjs` | ✅ |

```bash
node scripts/build-moledet-geography-g3-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g3-book-content.mjs
```

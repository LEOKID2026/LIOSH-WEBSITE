# Grade 1 Moledet / Geography Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מולדת וגאוגרפיה — כיתה א׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list (`subject: geography`) |
| `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master scope, page consolidation |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Page list + skill bindings |
| `docs/learning-book/geometry/g1/drafts/` | Structure reference only — **not modified** |

**Subject naming:** Child-facing copy uses **מולדת וגאוגרפיה**. Spine `subject` remains `geography`.

---

## 1. Grade 1 Skills (Complete List)

Filter: `subject: "geography"` and `minGrade ≤ 1` and `maxGrade ≥ 1`.

**Spine filter result: 10 rows** — all mapped to **6 learning pages** (consolidated).

| # | skill_id | topic | Learning page |
|---|----------|-------|---------------|
| 1 | `geography:g1:skills:skills_0_הכרת_המשפחה_ותפקידיה` | skills | `mg_g1_family` |
| 2 | `geography:g1:skills:skills_1_הבנת_הקהילה_הקרובה` | skills | `mg_g1_close_community` |
| 3 | `geography:g1:citizenship:citizenship_2_השתייכות_לקהילה` | citizenship | `mg_g1_close_community` (bound) |
| 4 | `geography:g1:geography:geography_0_מפת_כיתה` | geography | `mg_g1_class_map` |
| 5 | `geography:g1:skills:skills_2_היכרות_עם_מפות_בסיסיות` | skills | `mg_g1_class_map` (bound) |
| 6 | `geography:g1:geography:geography_1_מפת_בית_ספר` | geography | `mg_g1_school_map` |
| 7 | `geography:g1:geography:geography_2_כיוונים_בסיסיים` | geography | `mg_g1_directions` |
| 8 | `geography:g1:skills:skills_3_הבנת_כללי_התנהגות_ושיתוף_פעולה` | skills | `mg_g1_behavior_cooperation` |
| 9 | `geography:g1:citizenship:citizenship_0_כללי_התנהגות` | citizenship | `mg_g1_behavior_cooperation` (bound) |
| 10 | `geography:g1:citizenship:citizenship_1_שיתוף_פעולה` | citizenship | `mg_g1_behavior_cooperation` (bound) |

**Page count:** 6.

### 1A. New in Grade 1

All 10 spine skills — first Moledet/Geography book grade.

### 1B. Continuing from earlier grades

None.

### 1C. Excluded

| Item | Reason |
|------|--------|
| National / Israel map skills | `minGrade > 1` |
| Neighborhood map | G2+ |
| חגים ומועדים (curriculum focus) | No spine skill row |
| Grades 2–6 skills | Outside G1 filter |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/moledet-geography/g1/drafts/{page_id}.md`  
`learning_page_id`: `geography:g1:{page_id}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`.

| Batch | Order | page_id | Hebrew title |
|-------|-------|---------|--------------|
| A | 1 | `mg_g1_family` | המשפחה ותפקידיה |
| A | 2 | `mg_g1_close_community` | הקהילה הקרובה — כיתה ובית ספר |
| B | 3 | `mg_g1_class_map` | מפת הכיתה |
| B | 4 | `mg_g1_school_map` | מפת בית הספר |
| B | 5 | `mg_g1_directions` | כיוונים בסיסיים |
| C | 6 | `mg_g1_behavior_cooperation` | כללי התנהגות ושיתוף פעולה |

---

## 3. Content Scope Notes

| Page | In scope (G1) | Out of scope |
|------|---------------|--------------|
| `mg_g1_family` | תפקידי הורים וילדים בבית | משפחות מורכבות; דיון פוליטי |
| `mg_g1_close_community` | כיתה, בית ספר, השתייכות | שכונה, עיר |
| `mg_g1_class_map` | מפת חדר; סימון מקומות | קנה מידה |
| `mg_g1_school_map` | מבנה בית ספר; חצר, כיתות | מפת שכונה |
| `mg_g1_directions` | ימין, שמאל, קדימה, אחורה | כיווני שמיים |
| `mg_g1_behavior_cooperation` | כללים בכיתה; עזרה הדדית | חוקים לאומיים |

**Style:** Very concrete — home, class, school. Short sentences. No national-map complexity.

---

## 4. Map / Diagram Needs (Deferred)

| Page | Asset need | Owner decision |
|------|------------|----------------|
| `mg_g1_class_map` | Simple top-down class diagram | `[VERIFY]` optional illustration at runtime |
| `mg_g1_school_map` | Simple school floor plan | `[VERIFY]` optional illustration at runtime |
| `mg_g1_directions` | Optional arrow diagram | Text-only OK for draft |

---

## 5. Owner-Review Questions

1. Approve **6-page consolidation** (vs 10 pages)?
2. Family page: include single-parent / extended family examples, or keep nuclear-family only?
3. Are class/school map pages OK as text-only until diagrams are added?
4. Confirm **מולדת וגאוגרפיה** as book title on cover?

---

## 6. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_LEARNING_BOOK_PLAN.md` | ✅ |
| Draft pages | `docs/learning-book/moledet-geography/g1/drafts/*.md` | ✅ 6 pages |
| Draft README | `docs/learning-book/moledet-geography/g1/drafts/README.md` | ✅ |
| Review pack | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Review pack builder | `scripts/build-moledet-geography-g1-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-moledet-geography-g1-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/moledet-geography-g1-draft-manifest.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, practice CTA, SQL, commit, push.

---

## 7. Regenerate & Verify

```bash
node scripts/build-moledet-geography-g1-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g1-book-content.mjs
```

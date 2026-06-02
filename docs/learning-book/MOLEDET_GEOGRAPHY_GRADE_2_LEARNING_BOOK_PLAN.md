# Grade 2 Moledet / Geography Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מולדת וגאוגרפיה — כיתה ב׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list (`subject: geography`) |
| `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master scope |
| `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_1_LEARNING_BOOK_PLAN.md` | Prior grade; G1 pages not reused |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Page list + skill bindings |

**Subject naming:** Child-facing **מולדת וגאוגרפיה**. Spine `subject`: `geography`.

---

## 1. Grade 2 Skills (Complete List)

Filter: `subject: "geography"` and `minGrade ≤ 2` and `maxGrade ≥ 2`.

**Spine filter result: 11 rows** — mapped to **7 learning pages**.

| # | skill_id | Learning page |
|---|----------|---------------|
| 1–2 | `skills_0`, `geography_1` (מבנים) | `mg_g2_neighborhood` |
| 3–4 | `geography_0`, `skills_2` (מפת שכונה) | `mg_g2_neighborhood_map` |
| 5–6 | `geography_2`, `skills_1` (שירותים) | `mg_g2_community_services` |
| 7 | `skills_3` (ארץ ישראל בסיסי) | `mg_g2_israel_basics` |
| 8–9 | `citizenship_0`, `skills_4` (קבלת החלטות) | `mg_g2_group_decisions` |
| 10 | `citizenship_1` | `mg_g2_society_responsibility` |
| 11 | `citizenship_2` | `mg_g2_community_participation` |

**Page count:** 7.

### 2A. New in Grade 2

Neighborhood, neighborhood map, community services, Israel basic concepts, group decisions, society/responsibility, community participation.

### 2B. Continuing from Grade 1 (conceptual upgrade)

| G1 concept | G2 upgrade |
|------------|------------|
| Class/school community | Neighborhood community |
| Class/school maps | Neighborhood map |
| Behavior/cooperation | Group decisions + responsibility |

G1 draft pages are **not** reused as G2 content.

### 2C. Excluded

| Item | Reason |
|------|--------|
| Full Israel map reading | G3+ (`geography:g3:geography_0_מפת_ישראל`) |
| G1-only skills (`maxGrade = 1`) | Covered in G1 book |
| Grades 3–6 skills | Outside G2 filter |

---

## 2. Proposed Book Page List

| Batch | Order | page_id | Hebrew title |
|-------|-------|---------|--------------|
| A | 1 | `mg_g2_neighborhood` | השכונה ומבניה |
| A | 2 | `mg_g2_neighborhood_map` | מפת השכונה |
| A | 3 | `mg_g2_community_services` | שירותים בקהילה |
| B | 4 | `mg_g2_israel_basics` | ארץ ישראל — מושגים בסיסיים |
| C | 5 | `mg_g2_group_decisions` | קבלת החלטות בקבוצה |
| C | 6 | `mg_g2_society_responsibility` | חברה ואחריות |
| C | 7 | `mg_g2_community_participation` | השתתפות בקהילה |

---

## 3. Content Scope Notes

| Page | In scope (G2) | Out of scope |
|------|---------------|--------------|
| `mg_g2_neighborhood` | בתים, רחוב, גינה | תכנון עירוני |
| `mg_g2_neighborhood_map` | קריאת מפת שכונה | קנה מידה; מפת ארץ |
| `mg_g2_community_services` | ספרייה, מתנ״ס, תחבורה | מוסדות ממשל |
| `mg_g2_israel_basics` | ים, הר, מדבר — מילים | מפת ישראל; גבולות |
| `mg_g2_group_decisions` | הצבעה; הקשבה | דמוקרטיה לאומית |
| `mg_g2_society_responsibility` | ניקיון; עזרה לחבר | חוקים מורכבים |
| `mg_g2_community_participation` | חוגים; יום ניקיון | מעורבות פוליטית |

**Style:** Concrete neighborhood examples. Short sentences. No political framing.

---

## 4. Map / Diagram Needs (Deferred)

| Page | Asset need |
|------|------------|
| `mg_g2_neighborhood_map` | Simple neighborhood street map — `[VERIFY]` at runtime |
| `mg_g2_israel_basics` | Optional photo/icons for sea/mountain/desert — not a country map |

---

## 5. Owner-Review Questions

1. Israel basics: is **ים / הר / מדבר** vocabulary sufficient for G2?
2. Community services: confirm **מתנ״ס** spelling and examples?
3. Neighborhood map page: text-only OK until diagram asset?
4. Any local place names to include or deliberately avoid?

---

## 6. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_2_LEARNING_BOOK_PLAN.md` | ✅ |
| Draft pages | `docs/learning-book/moledet-geography/g2/drafts/*.md` | ✅ 7 pages |
| Draft README | `docs/learning-book/moledet-geography/g2/drafts/README.md` | ✅ |
| Review pack | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_2_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Review pack builder | `scripts/build-moledet-geography-g2-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-moledet-geography-g2-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/moledet-geography-g2-draft-manifest.mjs` | ✅ |

**Not in scope:** registry, routes, practice CTA, SQL, commit, push.

---

## 7. Regenerate & Verify

```bash
node scripts/build-moledet-geography-g2-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g2-book-content.mjs
```

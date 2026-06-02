# Grade 4 Moledet / Geography Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מולדת וגאוגרפיה — כיתה ד׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical skills |
| `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master scope |
| `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_3_LEARNING_BOOK_PLAN.md` | Prior grade |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Page bindings |

---

## 1. Grade 4 Skills — 11 spine rows → 7 pages

| page_id | Hebrew title |
|---------|--------------|
| `mg_g4_settlement_types` | סוגי יישובים |
| `mg_g4_settlement_development` | התפתחות היישובים בישראל |
| `mg_g4_map_scale_symbols` | מפות — קנה מידה וסימנים |
| `mg_g4_natural_resources` | משאבי טבע |
| `mg_g4_government_structure` | מבנה הממשל |
| `mg_g4_organizations` | ארגונים בקהילה |
| `mg_g4_government_institutions` | מוסדות שלטון |

**Page count:** 7 · **Age band:** `grades_3_4`

---

## 2. Settlement History [VERIFY]

`mg_g4_settlement_development` draft rules:
- Neutral overview only: יישובים נוספו עם הזמן
- **No specific dates** in child-facing copy (verifier enforced)
- **No invented historical narratives**
- Owner must **[VERIFY]** any expanded history before publish

---

## 3. Government / Institutions

| Page | Approach |
|------|----------|
| `mg_g4_government_structure` | Local (עירייה) vs central — role-based |
| `mg_g4_organizations` | Community NGOs / volunteers — non-political |
| `mg_g4_government_institutions` | Institution **roles** only — no current office-holders |

**Owner verification:** exact Hebrew institution names if added later — [VERIFY]

---

## 4. Map / Diagram Needs

| Page | Asset |
|------|-------|
| `mg_g4_map_scale_symbols` | Map with scale bar + legend — teaching asset |
| `mg_g4_settlement_types` | Optional photos/diagrams of city, moshav, kibbutz |

---

## 5. Owner-Review Questions

1. Is neutral settlement overview sufficient, or add owner-approved timeline later?
2. Approve institution **role** wording (חוק, ניהול, צדק) without naming bodies?
3. Map scale example (1 cm = 5 km) — acceptable for Grade 4?
4. Natural resources scope — overlap with Science acceptable?

---

## 6. Deliverables

| Deliverable | Status |
|-------------|--------|
| Plan | ✅ |
| 7 drafts | ✅ |
| Review pack | ✅ generated |
| Build + verify scripts | ✅ |

```bash
node scripts/build-moledet-geography-g4-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g4-book-content.mjs
```

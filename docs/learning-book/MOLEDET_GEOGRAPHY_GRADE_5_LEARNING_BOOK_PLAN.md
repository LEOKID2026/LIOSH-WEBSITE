# Grade 5 Moledet / Geography Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מולדת וגאוגרפיה — כיתה ה׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical skills |
| `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master scope |
| `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_4_LEARNING_BOOK_PLAN.md` | Prior grade |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Page bindings |
| `scripts/lib/moledet-geography-g5-draft-manifest.mjs` | G5 page order + anchors |

---

## 1. Grade 5 Skills — 13 spine rows → 7 pages

| # | page_id | Hebrew title | Primary skill topic |
|---|---------|--------------|---------------------|
| 1 | `mg_g5_coordinates` | קואורדינטות במפה | geography |
| 2 | `mg_g5_climate` | אקלים ישראל | geography |
| 3 | `mg_g5_natural_hazards` | סכנות טבע | geography |
| 4 | `mg_g5_resources` | משאבים וניהולם | geography |
| 5 | `mg_g5_government_institutions` | מוסדות שלטון | citizenship |
| 6 | `mg_g5_law_society` | חוק וכללי חברה | citizenship |
| 7 | `mg_g5_identity` | זהות אישית וקהילתית | citizenship |

**Page count:** 7 · **Age band:** `grades_5_6` · **Cognitive level (spine):** reasoning

---

## 2. Content Framing Rules

| Theme | G5 approach | Avoid |
|-------|-------------|-------|
| **Coordinates** | Grid on map; find point by (x, y) — like rows/columns | GPS technical detail |
| **Climate** | Regional patterns in Israel — desert, coast, mountains | Science mechanisms (greenhouse, pressure systems) |
| **Natural hazards** | Awareness + basic safety — calm tone | Alarmism, graphic disaster imagery |
| **Resources** | Water, land, energy — civic management + personal conservation | Chemistry/engineering (Science scope) |
| **Institutions** | Role-based: legislation, administration, justice | Current office-holders, political debate |
| **Law & society** | Formal law vs social norms; respect and equality | Controversial legal examples |
| **Identity** | Personal + community belonging; respect for diversity | Political or religious framing |

**Overlap with G4:** G4 introduced institution **structure**; G5 deepens **roles** + **law** + **identity**. Pages must not copy G4 wording.

**Overlap with Science:** Science owns climate/hazard **mechanisms**; Moledet owns **geographic patterns**, **civic safety**, and **stewardship**.

---

## 3. Sensitive Wording — Owner [VERIFY]

| Page | Flag |
|------|------|
| `mg_g5_climate` | Regional labels (מדבר, חוף, הרים) — [VERIFY] approved terminology |
| `mg_g5_natural_hazards` | Emergency guidance wording — [VERIFY] if expanded beyond classroom drill |
| `mg_g5_resources` | Claims about national water/energy policy — [VERIFY] factual accuracy |
| `mg_g5_government_institutions` | Named bodies (כנסת, ממשלה, בית משפט) if added — [VERIFY] |
| `mg_g5_law_society` | Law examples (traffic, theft) — [VERIFY] age-appropriate |
| `mg_g5_identity` | Diversity/respect wording — [VERIFY] owner-approved phrasing |

---

## 4. Map / Diagram Needs

| Page | Asset |
|------|-------|
| `mg_g5_coordinates` | Map with coordinate grid — teaching asset |
| `mg_g5_climate` | Simple Israel climate-zones diagram — [VERIFY] labels |
| `mg_g5_natural_hazards` | Optional safety poster style — no frightening imagery |
| `mg_g5_resources` | Optional infographic: water/energy conservation at home |

---

## 5. Owner-Review Questions

1. Approve coordinate grid teaching style (side/top numbers, ordered pairs)?
2. Which climate regions must appear on the Israel climate page?
3. Is classroom earthquake drill reference sufficient for hazards — or add national guidance?
4. Should institution page name כנסת / ממשלה / בית משפט explicitly, or stay role-only?
5. Are law examples (רמזור, גניבה) acceptable for Grade 5?
6. Identity page — sufficient at personal/community level, or link to G6 population diversity?
7. Confirm no overlap conflict with Science G5 climate/hazards pages.

---

## 6. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_5_LEARNING_BOOK_PLAN.md` | ✅ |
| 7 drafts | `docs/learning-book/moledet-geography/g5/drafts/` | ✅ |
| Drafts README | `docs/learning-book/moledet-geography/g5/drafts/README.md` | ✅ |
| Review pack | `docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_5_HEBREW_REVIEW_PACK.md` | generated |
| Build script | `scripts/build-moledet-geography-g5-hebrew-review-pack.mjs` | ✅ |
| Verify script | `scripts/verify-moledet-geography-g5-book-content.mjs` | ✅ |

```bash
node scripts/build-moledet-geography-g5-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g5-book-content.mjs
```

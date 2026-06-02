# Grade 5 Moledet / Geography Learning Book — Plan

**Status:** Documentation + draft content only. No runtime, SQL, commit, deploy.  
**Date:** June 2026  
**Book title:** ספר מולדת וגאוגרפיה — כיתה ה׳

---

## 1. Skills — 13 spine rows → 7 pages

| page_id | Title | Primary skill |
|---------|-------|---------------|
| `mg_g5_coordinates` | קואורדינטות במפה | `geography:g5:geography:geography_0_קואורדינטות` |
| `mg_g5_climate` | אקלים ישראל | `geography:g5:geography:geography_1_אקלים_ישראל` |
| `mg_g5_natural_hazards` | סכנות טבע | `geography:g5:geography:geography_2_סכנות_טבע` |
| `mg_g5_resources` | משאבים וניהולם | `geography:g5:geography:geography_3_משאבים` |
| `mg_g5_government_institutions` | מוסדות שלטון | `geography:g5:citizenship:citizenship_0_מוסדות_שלטון` |
| `mg_g5_law_society` | חוק וכללי חברה | `geography:g5:citizenship:citizenship_1_חוק_וכללי_חברה` |
| `mg_g5_identity` | זהות אישית וקהילתית | `geography:g5:citizenship:citizenship_2_זהות_אישית_וקהילתית` |

**Page count:** 7 · **Age band:** `grades_5_6` · **Spine cognitive level:** reasoning

---

## 2. Content boundaries

| Page | In scope | Out of scope / Science overlap |
|------|----------|--------------------------------|
| `mg_g5_coordinates` | Grid reading; (x,y) on map | GPS tech |
| `mg_g5_climate` | Desert / Mediterranean / mountains — geographic zones | Evaporation, pressure systems |
| `mg_g5_natural_hazards` | Awareness + basic safety; calm tone | Alarmist imagery; scientific causes |
| `mg_g5_resources` | Water/land/energy management; civic duty | Chemistry, engineering detail |
| `mg_g5_government_institutions` | Roles: legislation, executive, judiciary | Current office-holders |
| `mg_g5_law_society` | Law vs social norms; respect | Political debate |
| `mg_g5_identity` | Personal + community belonging; diversity respect | Political identity framing |

---

## 3. Institution names [VERIFY]

Draft uses **role-based** wording only (חקיקה, ניהול, שפיטה).

Before publish, owner should approve whether to add explicit names:
- כנסת · ממשלה · בית משפט · (others)

No current ministers, presidents, or MK names in child copy.

---

## 4. Sensitive wording notes

- **Hazards:** “מודעות + בטיחות — לא בהלה”; school drill example — not scary.
- **Climate/resources:** Geographic/civic framing only; verifier blocks Science mechanism terms.
- **Law/institutions:** Neutral, factual; no “מי המנהיג עכשיו”.
- **Identity:** Respect for diversity; no stereotyping.

---

## 5. Owner-review questions

1. Approve **7-page consolidation** (13 spine skills)?
2. Add named institutions (כנסת, ממשלה) in G5 — or keep roles-only until G6?
3. Hazard examples limited to earthquake + flood — sufficient?
4. Climate zones wording (מדבר / ים תיכון / הרים) — **[VERIFY]**?
5. Resource management examples — overlap with Science acceptable at this level?

---

## 6. Deliverables

| Item | Path | Status |
|------|------|--------|
| Plan | `MOLEDET_GEOGRAPHY_GRADE_5_LEARNING_BOOK_PLAN.md` | ✅ |
| Drafts | `moledet-geography/g5/drafts/*.md` | ✅ 7 |
| Review pack | generated | ✅ |
| Manifest | `scripts/lib/moledet-geography-g5-draft-manifest.mjs` | ✅ |
| Build / verify | `scripts/build-*-g5-*`, `scripts/verify-*-g5-*` | ✅ |

```bash
node scripts/build-moledet-geography-g5-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g5-book-content.mjs
```

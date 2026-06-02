# Grade 6 Moledet / Geography Learning Book — Plan

**Status:** Documentation + draft content only. No runtime, SQL, commit, deploy.  
**Date:** June 2026  
**Book title:** ספר מולדת וגאוגרפיה — כיתה ו׳

**Sensitivity:** Highest in the Moledet/Geography series — owner review required before publish.

---

## 1. Skills — 14 spine rows → 8 pages

| page_id | Title | Primary skill |
|---------|-------|---------------|
| `mg_g6_population` | מגוון האוכלוסייה בישראל | `geography:g6:geography:geography_0_אוכלוסיית_ישראל` |
| `mg_g6_natural_phenomena` | תופעות טבע | `geography:g6:geography:geography_1_תופעות_טבע` |
| `mg_g6_environment_quality` | איכות הסביבה | `geography:g6:geography:geography_2_איכות_הסביבה` |
| `mg_g6_human_environment` | יחסי אדם–סביבה | `geography:g6:geography:geography_3_יחסי_אדם_סביבה` |
| `mg_g6_democracy` | דמוקרטיה בישראל | `geography:g6:citizenship:citizenship_0_דמוקרטיה_בישראל` |
| `mg_g6_values` | ערכי המדינה | `geography:g6:citizenship:citizenship_1_ערכים` |
| `mg_g6_state_institutions` | מוסדות המדינה | `geography:g6:citizenship:citizenship_2_מוסדות_המדינה` |
| `mg_g6_social_involvement` | קבלת החלטות ומעורבות חברתית | `geography:g6:citizenship:citizenship_3_מעורבות_חברתית` |

**Page count:** 8 · **Age band:** `grades_5_6` · **Spine cognitive level:** reasoning

---

## 2. Content boundaries

| Page | In scope | Out of scope |
|------|----------|--------------|
| `mg_g6_population` | Diversity of languages, traditions, communities; respect | Named groups without owner approval; stereotypes; political identity |
| `mg_g6_natural_phenomena` | Observable natural phenomena in landscape | Deep Science mechanisms; alarmist tone |
| `mg_g6_environment_quality` | Cleanliness, civic responsibility, stewardship | Pollution chemistry, ecosystem science |
| `mg_g6_human_environment` | Use + protect balance; parks, farming examples | Engineering / ecology detail |
| `mg_g6_democracy` | Rules, participation, voting (adults), respect for opinions | Parties, campaigns, current events |
| `mg_g6_values` | שוויון, חירות, צדק, כבוד — civic framing | Ideological debate; exact list → **[VERIFY]** |
| `mg_g6_state_institutions` | Roles: legislation, executive, judiciary | Current office-holders; exact names → **[VERIFY]** |
| `mg_g6_social_involvement` | Class council, volunteering, group decisions | Political protests; current events |

---

## 3. Flagged for owner review [VERIFY]

| Area | Draft approach | Owner must confirm |
|------|----------------|-------------------|
| **Population diversity** | Generic “languages, traditions, communities” — no named ethnic/religious groups in child copy | Approved vocabulary for describing groups |
| **Values list** | שוויון, חירות, צדק, כבוד | Matches owner-approved civic framing |
| **Institution names** | Role-based (חקיקה, ניהול, שפיטה) — no כנסת/ממשלה in child body yet | Exact Hebrew names and roles |
| **Democracy concepts** | Participation, rules, respect — school parallel | Age-appropriate phrasing |
| **Social involvement** | Class council, volunteer day | Examples approved for G6 |

---

## 4. Sensitive wording notes

- **Population:** Respectful pluralism; no “all X are Y”; no ranking of communities.
- **Democracy / values / institutions:** Factual, neutral, role-based; no “who leads now”.
- **Environment:** Stewardship and civic duty — not Science duplication.
- **Natural phenomena:** Awareness — not fear; no “disaster” framing.
- **Verifier blocks:** political terms, current years/events, office-holder titles, stereotype patterns, Science mechanisms.

---

## 5. Owner-review questions

1. Approve **8-page consolidation** (14 spine skills)?
2. **Population page:** Which group/community terms (if any) may appear in child copy?
3. **Values page:** Confirm exact values list (שוויון, חירות, צדק, כבוד — add/remove)?
4. **Institutions page:** Add named bodies (כנסת, ממשלה, בית משפט) — or keep roles-only?
5. **Democracy page:** Is “מבוגרים בוחרים בבחירות” sufficient — or too simplified?
6. **Environment overlap:** Confirm boundary with Science for G6 environment pages?
7. **Social involvement:** Are class-council and volunteer-day examples approved?

---

## 6. Deliverables

| Item | Path | Status |
|------|------|--------|
| Plan | `MOLEDET_GEOGRAPHY_GRADE_6_LEARNING_BOOK_PLAN.md` | ✅ |
| Drafts | `moledet-geography/g6/drafts/*.md` | ✅ 8 |
| Review pack | generated | ✅ |
| Manifest | `scripts/lib/moledet-geography-g6-draft-manifest.mjs` | ✅ |
| Build / verify | `scripts/build-*-g6-*`, `scripts/verify-*-g6-*` | ✅ |

```bash
node scripts/build-moledet-geography-g6-hebrew-review-pack.mjs
node scripts/verify-moledet-geography-g6-book-content.mjs
```

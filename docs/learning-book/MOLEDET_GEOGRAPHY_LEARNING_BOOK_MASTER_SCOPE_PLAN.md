# Moledet / Geography Learning Book — Master Scope Plan

**Status:** Mapping / planning only. No page drafts. No runtime registry. No routes. No SQL. No commit.  
**Date:** June 2026  
**Scope:** מולדת וגאוגרפיה (Moledet / Geography), grades 1–6  
**Child-facing book title pattern:** `ספר מולדת וגאוגרפיה — כיתה X`  
**Verifier:** `node scripts/verify-moledet-geography-learning-book-master-scope.mjs`

---

## Table of Contents

1. [Sources Inspected](#1-sources-inspected)
2. [Subject Key](#2-subject-key)
3. [Full Spine Skill List](#3-full-spine-skill-list)
4. [Grade-by-Grade Mapping](#4-grade-by-grade-mapping)
5. [Cross-Grade Progression](#5-cross-grade-progression)
6. [Duplicate / Repetition Risk](#6-duplicate--repetition-risk)
7. [Sensitive Wording / Accuracy Rules](#7-sensitive-wording--accuracy-rules)
8. [Owner-Review Questions](#8-owner-review-questions)
9. [Risks Before Content Authoring](#9-risks-before-content-authoring)
10. [Proposed Next Step](#10-proposed-next-step)

---

## 1. Sources Inspected

| Source | Role in this plan |
|--------|-------------------|
| `data/curriculum-spine/v1/skills.json` | **Primary source of truth** — all 71 Moledet/Geography skill rows |
| `data/moledet-geography-curriculum.js` | Grade stages, focus summaries, curriculum alignment (secondary) |
| `utils/moledet-geography-constants.js` | UI topic umbrellas (`homeland`, `community`, `values`, `maps`) — scope hints only |
| `utils/moledet-geography-grade-topic-policy.js` | Topic-to-curriculum-map placement rules |
| `utils/moledet-geography-question-generator.js` | Question scope hints only — not authoritative |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules reference (grade scope, approved content, no fallback) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Future 7-section page structure (grades 1–2 / 3–4 / 5–6 bands) |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Per-grade plan structure reference |
| `scripts/lib/moledet-geography-master-scope-manifest.mjs` | Machine-readable page candidates + skill bindings for verifier |

**Not inspected for scope authority:** runtime pages (`pages/learning/moledet-geography-master.js`), diagnostic bridges, SQL, learning-book catalog/registry.

**Not modified:** Math, Geometry, Hebrew, English, Science masters, drafts, design, CSS, themes, reader shell, book tiles, routes, registry, practice mappings.

---

## 2. Subject Key

| Layer | Value |
|-------|-------|
| **Spine `subject` (authoritative)** | `geography` |
| **Internal product / file naming** | `moledet-geography`, `moledet_geography` (storage keys, audit scripts) |
| **Child-facing subject name** | **מולדת וגאוגרפיה** |

**Verification note:** `skills.json` contains **no** rows with `subject: "moledet_geography"`. All 71 Moledet/Geography skills use `subject: "geography"`. The skill_id prefix is also `geography:gN:…`.

**Grade membership rule (used throughout this plan):**  
A skill belongs to grade *G* when `subject === "geography"` and `minGrade ≤ G` and `maxGrade ≥ G`.

**Spine topic buckets (within geography subject):**

| topic | Meaning in spine |
|-------|------------------|
| `geography` | Concrete geographic / place content subtopics |
| `citizenship` | Society, democracy, rules, institutions |
| `skills` | Competency / synthesis rows — often parallel `geography` + `citizenship` entries |

**UI-only topic umbrellas** (in `moledet-geography-constants.js` but **no dedicated spine rows**): `homeland`, `community`, `values`, `maps`, `mixed`. Content for these is distributed across the three spine topic buckets above.

---

## 3. Full Spine Skill List

**Total: 71 skills** (`subject: "geography"`, grades 1–6 only, each row grade-locked `minGrade === maxGrade`).

### Grade 1 — 10 skills (`cognitive_level: recognition`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g1:geography:geography_0_מפת_כיתה` | geography | מפת כיתה |
| `geography:g1:geography:geography_1_מפת_בית_ספר` | geography | מפת בית ספר |
| `geography:g1:geography:geography_2_כיוונים_בסיסיים` | geography | כיוונים בסיסיים |
| `geography:g1:citizenship:citizenship_0_כללי_התנהגות` | citizenship | כללי התנהגות |
| `geography:g1:citizenship:citizenship_1_שיתוף_פעולה` | citizenship | שיתוף פעולה |
| `geography:g1:citizenship:citizenship_2_השתייכות_לקהילה` | citizenship | השתייכות לקהילה |
| `geography:g1:skills:skills_0_הכרת_המשפחה_ותפקידיה` | skills | הכרת המשפחה ותפקידיה |
| `geography:g1:skills:skills_1_הבנת_הקהילה_הקרובה` | skills | הבנת הקהילה הקרובה |
| `geography:g1:skills:skills_2_היכרות_עם_מפות_בסיסיות` | skills | היכרות עם מפות בסיסיות |
| `geography:g1:skills:skills_3_הבנת_כללי_התנהגות_ושיתוף_פעולה` | skills | הבנת כללי התנהגות ושיתוף פעולה |

### Grade 2 — 11 skills (`cognitive_level: recognition`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g2:geography:geography_0_מפת_שכונה` | geography | מפת שכונה |
| `geography:g2:geography:geography_1_מבנים_וסביבות` | geography | מבנים וסביבות |
| `geography:g2:geography:geography_2_שירותים_בקהילה` | geography | שירותים בקהילה |
| `geography:g2:citizenship:citizenship_0_קבלת_החלטות_בקבוצה` | citizenship | קבלת החלטות בקבוצה |
| `geography:g2:citizenship:citizenship_1_חברה_ואחריות` | citizenship | חברה ואחריות |
| `geography:g2:citizenship:citizenship_2_השתתפות_בקהילה` | citizenship | השתתפות בקהילה |
| `geography:g2:skills:skills_0_הכרת_השכונה_ומבניה` | skills | הכרת השכונה ומבניה |
| `geography:g2:skills:skills_1_הבנת_שירותים_בקהילה` | skills | הבנת שירותים בקהילה |
| `geography:g2:skills:skills_2_קריאת_מפת_שכונה` | skills | קריאת מפת שכונה |
| `geography:g2:skills:skills_3_הבנת_מושגים_בסיסיים_על_ארץ_ישראל` | skills | הבנת מושגים בסיסיים על ארץ ישראל |
| `geography:g2:skills:skills_4_הבנת_קבלת_החלטות_בקבוצה` | skills | הבנת קבלת החלטות בקבוצה |

### Grade 3 — 12 skills (`cognitive_level: application`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g3:geography:geography_0_מפת_ישראל` | geography | מפת ישראל |
| `geography:g3:geography:geography_1_אזורים_וערים` | geography | אזורים וערים |
| `geography:g3:geography:geography_2_סוגי_נופים` | geography | סוגי נופים |
| `geography:g3:geography:geography_3_מקורות_מים` | geography | מקורות מים |
| `geography:g3:citizenship:citizenship_0_כללי_אזרחות_בסיסיים` | citizenship | כללי אזרחות בסיסיים |
| `geography:g3:citizenship:citizenship_1_השתתפות_חברתית` | citizenship | השתתפות חברתית |
| `geography:g3:citizenship:citizenship_2_זכויות_וחובות` | citizenship | זכויות וחובות |
| `geography:g3:skills:skills_0_קריאת_מפת_ישראל` | skills | קריאת מפת ישראל |
| `geography:g3:skills:skills_1_זיהוי_אזורים_וערים_גדולות` | skills | זיהוי אזורים וערים גדולות |
| `geography:g3:skills:skills_2_הכרת_סוגי_נופים` | skills | הכרת סוגי נופים |
| `geography:g3:skills:skills_3_הבנת_מחוזות_וגבולות` | skills | הבנת מחוזות וגבולות |
| `geography:g3:skills:skills_4_הבנת_כללי_אזרחות_בסיסיים` | skills | הבנת כללי אזרחות בסיסיים |

### Grade 4 — 11 skills (`cognitive_level: application`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g4:geography:geography_0_סוגי_יישובים` | geography | סוגי יישובים |
| `geography:g4:geography:geography_1_מפות_קנה_מידה_סימנים` | geography | מפות: קנה מידה, סימנים |
| `geography:g4:geography:geography_2_משאבי_טבע` | geography | משאבי טבע |
| `geography:g4:citizenship:citizenship_0_מבנה_ממשל` | citizenship | מבנה ממשל |
| `geography:g4:citizenship:citizenship_1_ארגונים` | citizenship | ארגונים |
| `geography:g4:citizenship:citizenship_2_מוסדות_שלטון` | citizenship | מוסדות שלטון |
| `geography:g4:skills:skills_0_הכרת_סוגי_יישובים` | skills | הכרת סוגי יישובים |
| `geography:g4:skills:skills_1_הבנת_התפתחות_היישובים` | skills | הבנת התפתחות היישובים |
| `geography:g4:skills:skills_2_קריאת_מפות_מתקדמות` | skills | קריאת מפות מתקדמות |
| `geography:g4:skills:skills_3_הבנת_משאבי_טבע` | skills | הבנת משאבי טבע |
| `geography:g4:skills:skills_4_הבנת_מבנה_הממשל` | skills | הבנת מבנה הממשל |

### Grade 5 — 13 skills (`cognitive_level: reasoning`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g5:geography:geography_0_קואורדינטות` | geography | קואורדינטות |
| `geography:g5:geography:geography_1_אקלים_ישראל` | geography | אקלים ישראל |
| `geography:g5:geography:geography_2_סכנות_טבע` | geography | סכנות טבע |
| `geography:g5:geography:geography_3_משאבים` | geography | משאבים |
| `geography:g5:citizenship:citizenship_0_מוסדות_שלטון` | citizenship | מוסדות שלטון |
| `geography:g5:citizenship:citizenship_1_חוק_וכללי_חברה` | citizenship | חוק וכללי חברה |
| `geography:g5:citizenship:citizenship_2_זהות_אישית_וקהילתית` | citizenship | זהות אישית וקהילתית |
| `geography:g5:skills:skills_0_קריאת_מפות_עם_קואורדינטות` | skills | קריאת מפות עם קואורדינטות |
| `geography:g5:skills:skills_1_הבנת_אקלים_ישראל` | skills | הבנת אקלים ישראל |
| `geography:g5:skills:skills_2_הבנת_סכנות_טבע` | skills | הבנת סכנות טבע |
| `geography:g5:skills:skills_3_הבנת_משאבים_וניהולם` | skills | הבנת משאבים וניהולם |
| `geography:g5:skills:skills_4_הבנת_מוסדות_שלטון` | skills | הבנת מוסדות שלטון |
| `geography:g5:skills:skills_5_הבנת_חוק_וכללי_חברה` | skills | הבנת חוק וכללי חברה |

### Grade 6 — 14 skills (`cognitive_level: reasoning`)

| skill_id | topic | description |
|----------|-------|-------------|
| `geography:g6:geography:geography_0_אוכלוסיית_ישראל` | geography | אוכלוסיית ישראל |
| `geography:g6:geography:geography_1_תופעות_טבע` | geography | תופעות טבע |
| `geography:g6:geography:geography_2_איכות_הסביבה` | geography | איכות הסביבה |
| `geography:g6:geography:geography_3_יחסי_אדם_סביבה` | geography | יחסי אדם-סביבה |
| `geography:g6:citizenship:citizenship_0_דמוקרטיה_בישראל` | citizenship | דמוקרטיה בישראל |
| `geography:g6:citizenship:citizenship_1_ערכים` | citizenship | ערכים |
| `geography:g6:citizenship:citizenship_2_מוסדות_המדינה` | citizenship | מוסדות המדינה |
| `geography:g6:citizenship:citizenship_3_מעורבות_חברתית` | citizenship | מעורבות חברתית |
| `geography:g6:skills:skills_0_הבנת_מגוון_האוכלוסייה_בישראל` | skills | הבנת מגוון האוכלוסייה בישראל |
| `geography:g6:skills:skills_1_הבנת_תופעות_טבע_ואיכות_סביבה` | skills | הבנת תופעות טבע ואיכות סביבה |
| `geography:g6:skills:skills_2_הבנת_הדמוקרטיה_בישראל` | skills | הבנת הדמוקרטיה בישראל |
| `geography:g6:skills:skills_3_הבנת_ערכי_המדינה` | skills | הבנת ערכי המדינה |
| `geography:g6:skills:skills_4_הבנת_מוסדות_המדינה` | skills | הבנת מוסדות המדינה |
| `geography:g6:skills:skills_5_הבנת_קבלת_החלטות_ומעורבות_חברתית` | skills | הבנת קבלת החלטות ומעורבות חברתית |

> **Note:** Several `skills_*` rows duplicate nearby `geography_*` / `citizenship_*` descriptions. This is intentional in the spine (content vs competency). Page planning merges them — see §6.

---

## 4. Grade-by-Grade Mapping

**Page consolidation principle:** One learning page per teachable theme. Parallel `geography`, `citizenship`, and `skills` rows that cover the same theme bind to a **single page** with one `primary_skill_id` and optional `bound_skill_ids`. This avoids 71 near-duplicate pages while keeping every spine skill addressable at runtime later.

**Proposed page counts:** G1: 6 · G2: 7 · G3: 8 · G4: 7 · G5: 7 · G6: 8 · **Total: 43 pages**

Manifest source: `scripts/lib/moledet-geography-master-scope-manifest.mjs`

---

### Grade 1 — ספר מולדת וגאוגרפיה — כיתה א׳

**Stage (curriculum):** קהילה ומשפחה  
**Included skills:** 10 (all G1 spine rows)  
**Proposed pages:** 6  
**Expected depth:** Recognition — concrete, classroom-scale; short sentences; family/school examples; simple maps of familiar spaces; no national map yet.

| # | Proposed page (draft title) | Primary skill | Bound skills |
|---|----------------------------|---------------|--------------|
| 1 | המשפחה ותפקידיה | `skills_0_הכרת_המשפחה_ותפקידיה` | — |
| 2 | הקהילה הקרובה — כיתה ובית ספר | `skills_1_הבנת_הקהילה_הקרובה` | `citizenship_2_השתייכות_לקהילה` |
| 3 | מפת הכיתה | `geography_0_מפת_כיתה` | `skills_2_היכרות_עם_מפות_בסיסיות` |
| 4 | מפת בית הספר | `geography_1_מפת_בית_ספר` | — |
| 5 | כיוונים בסיסיים | `geography_2_כיוונים_בסיסיים` | — |
| 6 | כללי התנהגות ושיתוף פעולה | `skills_3_הבנת_כללי_התנהגות_ושיתוף_פעולה` | `citizenship_0`, `citizenship_1` |

**Continuing from earlier grades:** None — first book grade.

**New in Grade 1:** All 10 skills.

**Excluded (out of book scope):**

| Item | Why excluded |
|------|--------------|
| `homeland`, `values`, `maps` as standalone UI topics | No spine skill rows; content absorbed into pages above |
| חגים ומועדים (in curriculum focus text) | Mentioned in `moledet-geography-curriculum.js` focus but **no spine skill** — defer unless spine adds row |
| National / regional Israel geography | `minGrade > 1` for all Israel-map skills |
| Grades 2–6 skills | Outside G1 grade filter |

---

### Grade 2 — ספר מולדת וגאוגרפיה — כיתה ב׳

**Stage:** שכונה ועיר  
**Included skills:** 11  
**Proposed pages:** 7  
**Expected depth:** Recognition — neighborhood scale; named community services; first Israel concepts at label level only (no full country map reading).

| # | Proposed page | Primary skill | Bound skills |
|---|---------------|---------------|--------------|
| 1 | השכונה ומבניה | `skills_0_הכרת_השכונה_ומבניה` | `geography_1_מבנים_וסביבות` |
| 2 | מפת השכונה | `geography_0_מפת_שכונה` | `skills_2_קריאת_מפת_שכונה` |
| 3 | שירותים בקהילה | `geography_2_שירותים_בקהילה` | `skills_1_הבנת_שירותים_בקהילה` |
| 4 | ארץ ישראל — מושגים בסיסיים | `skills_3_הבנת_מושגים_בסיסיים_על_ארץ_ישראל` | — |
| 5 | קבלת החלטות בקבוצה | `citizenship_0_קבלת_החלטות_בקבוצה` | `skills_4_הבנת_קבלת_החלטות_בקבוצה` |
| 6 | חברה ואחריות | `citizenship_1_חברה_ואחריות` | — |
| 7 | השתתפות בקהילה | `citizenship_2_השתתפות_בקהילה` | — |

**Continuing skills (conceptual, not re-authored as G1 pages):** Maps (class/school → neighborhood); community belonging → neighborhood participation; cooperation/rules → group decisions.

**New in Grade 2:** Neighborhood map, buildings, community services, Israel basic concepts, group decision-making, society/responsibility.

**Excluded:** Full Israel map (`g3+`); settlement types (`g4+`); coordinates (`g5+`); democracy/state institutions (`g6` / late `g5`).

---

### Grade 3 — ספר מולדת וגאוגרפיה — כיתה ג׳

**Stage:** ארץ ישראל ומרחבים גיאוגרפיים  
**Included skills:** 12  
**Proposed pages:** 8  
**Expected depth:** Application — read simplified Israel map; name major regions/cities; classify landscapes; link water sources to map features; introductory rights/duties language.

| # | Proposed page | Primary skill | Bound skills |
|---|---------------|---------------|--------------|
| 1 | מפת ישראל | `geography_0_מפת_ישראל` | `skills_0_קריאת_מפת_ישראל` |
| 2 | אזורים וערים גדולות | `geography_1_אזורים_וערים` | `skills_1_זיהוי_אזורים_וערים_גדולות` |
| 3 | סוגי נופים | `geography_2_סוגי_נופים` | `skills_2_הכרת_סוגי_נופים` |
| 4 | מקורות מים | `geography_3_מקורות_מים` | — |
| 5 | מחוזות וגבולות | `skills_3_הבנת_מחוזות_וגבולות` | — |
| 6 | כללי אזרחות בסיסיים | `citizenship_0_כללי_אזרחות_בסיסיים` | `skills_4_הבנת_כללי_אזרחות_בסיסיים` |
| 7 | זכויות וחובות | `citizenship_2_זכויות_וחובות` | — |
| 8 | השתתפות חברתית | `citizenship_1_השתתפות_חברתית` | — |

**Continuing:** Maps (neighborhood → country); community/citizenship (participation deepens); Israel naming (G2 labels → G3 map literacy).

**New:** Country-scale geography, landscapes, districts/borders, formal citizenship vocabulary.

**Excluded:** Map scale/coordinates (`g4+`/`g5+`); settlement history (`g4+`); national government detail (`g4+`/`g6`).

**Verification flags:** Exact list of “ערים גדולות”, district names, and border terminology — owner must approve spellings before authoring.

---

### Grade 4 — ספר מולדת וגאוגרפיה — כיתה ד׳

**Stage:** יישובי הארץ וגאוגרפיה פיזית  
**Included skills:** 11  
**Proposed pages:** 7  
**Expected depth:** Application — compare settlement types; introductory map scale and symbols; natural resources at overview level; basic government structure (local/national intro).

| # | Proposed page | Primary skill | Bound skills |
|---|---------------|---------------|--------------|
| 1 | סוגי יישובים | `geography_0_סוגי_יישובים` | `skills_0_הכרת_סוגי_יישובים` |
| 2 | התפתחות היישובים בישראל | `skills_1_הבנת_התפתחות_היישובים` | — |
| 3 | מפות — קנה מידה וסימנים | `geography_1_מפות_קנה_מידה_סימנים` | `skills_2_קריאת_מפות_מתקדמות` |
| 4 | משאבי טבע | `geography_2_משאבי_טבע` | `skills_3_הבנת_משאבי_טבע` |
| 5 | מבנה הממשל | `citizenship_0_מבנה_ממשל` | `skills_4_הבנת_מבנה_הממשל` |
| 6 | ארגונים בקהילה | `citizenship_1_ארגונים` | — |
| 7 | מוסדות שלטון | `citizenship_2_מוסדות_שלטון` | — |

**Continuing:** Israel geography (regions → settlements); maps (read → scale/symbols); citizenship (rights → institutions).

**New:** Settlement typology and historical development overview; map scale; resource concepts; governance introduction.

**Excluded:** Coordinate grid (`g5`); climate systems detail (`g5`); democracy/values essay-level content (`g6`).

**Verification flags:** Settlement history claims and dates — factual review required; keep historical narrative neutral and age-appropriate.

---

### Grade 5 — ספר מולדת וגאוגרפיה — כיתה ה׳

**Stage:** מפות, אקלים ומשאבים  
**Included skills:** 13  
**Proposed pages:** 7  
**Expected depth:** Reasoning — coordinate grid on maps; climate zones in Israel; natural hazards awareness; resource management intro; law/society and identity at pre-teen level.

| # | Proposed page | Primary skill | Bound skills |
|---|---------------|---------------|--------------|
| 1 | קואורדינטות במפה | `geography_0_קואורדינטות` | `skills_0_קריאת_מפות_עם_קואורדינטות` |
| 2 | אקלים ישראל | `geography_1_אקלים_ישראל` | `skills_1_הבנת_אקלים_ישראל` |
| 3 | סכנות טבע | `geography_2_סכנות_טבע` | `skills_2_הבנת_סכנות_טבע` |
| 4 | משאבים וניהולם | `geography_3_משאבים` | `skills_3_הבנת_משאבים_וניהולם` |
| 5 | מוסדות שלטון | `citizenship_0_מוסדות_שלטון` | `skills_4_הבנת_מוסדות_שלטון` |
| 6 | חוק וכללי חברה | `citizenship_1_חוק_וכללי_חברה` | `skills_5_הבנת_חוק_וכללי_חברה` |
| 7 | זהות אישית וקהילתית | `citizenship_2_זהות_אישית_וקהילתית` | — |

**Continuing:** Maps (scale → coordinates); resources (natural → management); government (structure → institutions + law).

**New:** Climate, hazards, resource policy awareness, personal/community identity.

**Excluded:** Full democracy/values/state-institution synthesis (`g6`); population diversity page (`g6`).

**Overlap note:** Natural hazards and environment touch Science — keep Moledet pages civic/geographic framing, not scientific mechanism detail.

---

### Grade 6 — ספר מולדת וגאוגרפיה — כיתה ו׳

**Stage:** ישראל כחברה ומדינה  
**Included skills:** 14  
**Proposed pages:** 8  
**Expected depth:** Reasoning — respectful diversity overview; environment citizenship; democracy, values, and state institutions; social involvement; synthesis across prior grades.

| # | Proposed page | Primary skill | Bound skills |
|---|---------------|---------------|--------------|
| 1 | מגוון האוכלוסייה בישראל | `geography_0_אוכלוסיית_ישראל` | `skills_0_הבנת_מגוון_האוכלוסייה_בישראל` |
| 2 | תופעות טבע | `geography_1_תופעות_טבע` | — |
| 3 | איכות הסביבה | `geography_2_איכות_הסביבה` | — |
| 4 | יחסי אדם–סביבה | `geography_3_יחסי_אדם_סביבה` | `skills_1_הבנת_תופעות_טבע_ואיכות_סביבה` |
| 5 | דמוקרטיה בישראל | `citizenship_0_דמוקרטיה_בישראל` | `skills_2_הבנת_הדמוקרטיה_בישראל` |
| 6 | ערכי המדינה | `citizenship_1_ערכים` | `skills_3_הבנת_ערכי_המדינה` |
| 7 | מוסדות המדינה | `citizenship_2_מוסדות_המדינה` | `skills_4_הבנת_מוסדות_המדינה` |
| 8 | קבלת החלטות ומעורבות חברתית | `citizenship_3_מעורבות_חברתית` | `skills_5_הבנת_קבלת_החלטות_ומעורבות_חברתית` |

**Continuing:** Citizenship arc (G1 rules → G6 democracy); environment (G5 hazards → G6 stewardship); institutions (G4–G5 → G6 state level).

**New:** Population diversity, democratic values synthesis, named state institutions, social involvement expectations.

**Excluded:** Skills from other subjects; political debate topics not in spine; current-events-dependent claims.

**Highest sensitivity grade** — see §7 and §8.

---

## 5. Cross-Grade Progression

| Theme | G1 | G2 | G3 | G4 | G5 | G6 | Depth shift by grade |
|-------|----|----|----|----|----|----|----------------------|
| **Home / family / community** | משפחה; כיתה/בית ספר; השתייכות | שכונה; שירותים; השתתפות | השתתפות חברתית; זכויות/חובות | ארגונים בקהילה | זהות אישית וקהילתית | מגוון אוכלוסייה; מעורבות חברתית | Micro (family) → meso (neighborhood) → macro (society/state) |
| **School / neighborhood / city** | מפת כיתה/בית ספר | מפת שכונה; מבנים | ערים גדולות בארץ | סוגי יישובים | — | — | Familiar plan → neighborhood plan → national settlements |
| **Maps / directions / symbols** | כיוונים; מפות בסיסיות | קריאת מפת שכונה | מפת ישראל; מחוזות | קנה מידה; סימנים | קואורדינטות | — | Orientation → local map → country map → scale → grid |
| **Regions / landscapes** | — | מושגי ישראל (labels) | נופים; מקורות מים | משאבי טבע | אקלים; סכנות טבע | תופעות טבע; איכות סביבה | Named features → typed landscapes → resources/climate → stewardship |
| **Israel geography** | — | בסיסי | מפה/אזורים/גבולות | יישובים והתפתחות | אקלים/משאבים | אוכלוסייה | Country introduction scales with map literacy |
| **Environment / citizenship / community** | כללי התנהגות; שיתוף | קבלת החלטות; אחריות | אזרחות בסיסית | ממשל/מוסדות | חוק; מוסדות | דמוקרטיה; ערכים; מוסדות המדינה | Rules → participation → institutions → democratic citizenship |

**Cognitive level arc (spine):** G1–G2 `recognition` → G3–G4 `application` → G5–G6 `reasoning`.

---

## 6. Duplicate / Repetition Risk

### 6.1 Spine-level duplication (same grade)

Each grade has parallel rows:

- `geography:*` — **what** to know (content subtopic)
- `citizenship:*` — **social/civic** angle
- `skills:*` — **competency** phrasing (often mirrors the above)

**Risk:** Authoring one page per spine row → ~71 pages with heavy redundancy.

**Mitigation (approved for this plan):** Consolidate to **43 pages**; bind secondary `skill_id`s to primary pages (manifest). At runtime insertion (future task), a page may resolve multiple skill lookups — still grade-specific, no cross-grade fallback.

### 6.2 Cross-grade thematic repetition

| Theme | Grades | What must change so pages are not copied |
|-------|--------|------------------------------------------|
| Maps | G1–G5 | Scale of map, symbols taught, task complexity — never reuse G1 class map text for G3 Israel map |
| Community participation | G1–G2–G3–G6 | G1 belonging in class → G2 neighborhood → G3 social participation → G6 civic involvement |
| Israel introduction | G2–G3–G4 | G2 words only → G3 map reading → G4 settlement types/history |
| Government / institutions | G4–G5–G6 | G4 structure → G5 law/institutions → G6 democracy + named state bodies |
| Natural world | G3–G5–G6 | G3 water/landforms → G5 climate/hazards → G6 environment quality & human relations |
| Group decisions | G2–G6 | G2 classroom group → G6 societal decision-making |

### 6.3 G4 vs G5 institution overlap

Both grades include “מוסדות שלטון”. **G4** = introductory structure; **G5** = deeper institutional roles + law; **G6** = full state apparatus (כנסת, ממשלה, etc.). Pages must use distinct examples and vocabulary per grade.

---

## 7. Sensitive Wording / Accuracy Rules

| Rule | Application |
|------|-------------|
| Factual, age-appropriate Hebrew | Short sentences in G1–2; richer but neutral in G5–6 |
| No political framing beyond spine | Spine includes democracy, values, institutions — describe function factually; avoid campaign/controversy language |
| No unsupported claims | Do not invent statistics, dates, or historical narratives not verified |
| No outdated current-event claims | Avoid “today the president is…” — use role-based descriptions |
| Place names & map labels | Flag for owner verification: city lists, districts, borders, sea names |
| Population diversity (G6) | Respectful, factual, pluralistic tone; no stereotyping; exact group naming → **owner approval** |
| Democracy & values (G6) | Stick to spine terms (שוויון, חירות, צדק); avoid ideological debate |
| Environment vs Science | Moledet: stewardship, community responsibility; Science: processes/mechanisms — do not duplicate Science explanations |
| Historical settlement narrative (G4) | `[VERIFY]` historical simplifications before publish |
| Natural hazards (G5) | Safety awareness, not alarmism; `[VERIFY]` emergency guidance if included |

---

## 8. Owner-Review Questions

1. **Book naming:** Confirm child-facing **מולדת וגאוגרפיה** (vs splitting “מולדת” / “גאוגרפיה” on cover)?
2. **Page consolidation:** Approve **43 pages** (merged skills) vs **71 pages** (one per spine row)?
3. **חגים ומועדים:** Curriculum G1 focus mentions holidays — add spine skill + page, or stay out of scope?
4. **G3 city/region list:** Which cities and regions must appear on the Israel map page?
5. **G3 districts/borders:** Which administrative terms are approved for Grade 3 reading level?
6. **G4 settlement history:** How much historical narrative is allowed on the “התפתחות היישובים” page?
7. **G5–G6 institution names:** Confirm exact Hebrew names and roles (כנסת, ממשלה, נשיא, רשות מקומית)?
8. **G6 population diversity:** Approved vocabulary for describing groups/communities?
9. **G6 values page:** Confirm the values list matches owner-approved civic framing.
10. **Map assets:** Will authored pages require downloadable map diagrams (class/neighborhood/Israel/coordinate grid)?
11. **Overlap with Science:** Confirm boundary for climate, hazards, environment pages.
12. **Primary vs bound skill_id:** At runtime, should practice buttons match `primary_skill_id` only or any bound id?

---

## 9. Risks Before Content Authoring

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Science / environment overlap** | Duplicate or conflicting explanations (climate, hazards, ecosystems) | Cross-link guardrails in author brief; Science owns mechanisms |
| **Hebrew reading comprehension overlap** | Long civic texts feel like Hebrew lessons | Keep pages concise; visual anchors; Moledet vocabulary only |
| **Maps / diagrams required** | Many pages unusable without visuals | Plan asset pipeline before drafting G1 maps and G3 Israel map |
| **Hebrew spelling of places** | Wrong labels on maps | Owner-verified glossary before G3+ authoring |
| **Spine `skills` duplication** | Authors write same page twice | Use manifest bindings; one page per theme |
| **Sensitive G6 civic content** | Owner rejection or parent concern | Early review of diversity + democracy pages |
| **Curriculum vs spine gaps** | `homeland`/`values` UI topics without spine rows | Do not invent pages outside spine unless spine updated first |
| **Internal key leakage** | `geography:g3:…` shown to children | Authoring rules: Hebrew only in child-facing sections |

---

## 10. Proposed Next Step

After owner approval of this master scope plan:

1. Create **per-grade content packages** (plan + signoff + drafts), one grade at a time:
   - `MOLEDET_GEOGRAPHY_GRADE_N_LEARNING_BOOK_PLAN.md`
   - Draft markdown under `docs/learning-book/moledet-geography/gN/drafts/` (future — not started)
2. Follow **7-section template** band by grade (`MATH_LEARNING_PAGE_TEMPLATE.md` bands).
3. Run grade-level content verifiers (pattern from Geometry) after drafts exist.
4. **Separate later task:** runtime registry, routes, reader insertion, practice CTA mappings.

**This task deliverables:**

| Deliverable | Path | Status |
|-------------|------|--------|
| Master scope plan | `docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | ✅ |
| Scope manifest | `scripts/lib/moledet-geography-master-scope-manifest.mjs` | ✅ |
| Scope verifier | `scripts/verify-moledet-geography-learning-book-master-scope.mjs` | ✅ |

**Explicitly not created:** per-grade drafts, registry entries, routes, SQL, practice mappings, design/CSS changes.

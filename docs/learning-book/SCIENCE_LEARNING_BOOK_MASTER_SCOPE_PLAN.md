# Science / מדעים Learning Book — Master Scope Plan (Grades 1–6)

**Status:** Mapping / planning only. No page drafts. No runtime registry. No routes. No SQL. No commit.  
**Date:** June 2026  
**Scope:** Science subject (`מדעים`), grades 1–6  
**Child-facing language (future):** Hebrew only. All title examples below are `[DRAFT — not owner-approved]`.

---

## Table of Contents

1. [Sources Inspected](#1-sources-inspected)
2. [Science Subject Key](#2-science-subject-key)
3. [Full Science Skill Inventory (Spine)](#3-full-science-skill-inventory-spine)
4. [Grade-by-Grade Scope](#4-grade-by-grade-scope)
5. [Cross-Grade Progression](#5-cross-grade-progression)
6. [Duplicate / Repetition Risk](#6-duplicate--repetition-risk)
7. [Scientific Accuracy Rules (Future Authoring)](#7-scientific-accuracy-rules-future-authoring)
8. [Owner-Review Questions](#8-owner-review-questions)
9. [Risks Before Content Authoring](#9-risks-before-content-authoring)
10. [Proposed Next Step](#10-proposed-next-step)
11. [Appendix — Page Candidates by Grade](#11-appendix--page-candidates-by-grade)

---

## 1. Sources Inspected

| Source | Role in this plan |
|--------|-------------------|
| `data/curriculum-spine/v1/skills.json` | **Primary source of truth** — all `skill_id`, `subject`, `minGrade`, `maxGrade` |
| `data/curriculum-spine/v1/schema.json` | Spine row shape (context) |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules: grade-only pages, no fallback, approved content, spine-tied IDs |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section age-band template (grades 1–2 / 3–4 / 5–6) |
| `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Master-scope document structure |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Per-grade plan structure (included / new / continuing / excluded / page list) |
| `docs/learning-book/LEARNING_BOOK_FULL_STRUCTURE_EXPANSION.md` | Infrastructure conventions (not modified) |
| `data/science-curriculum.js` | Grade stage summaries, topic umbrellas, focus/skills/inquiry hints (**scope hints only**) |
| `data/science-questions.js` (+ phase fill banks) | Question volume and concept coverage per topic/grade (**scope hints only**) |
| `utils/science-grade-topic-policy.js` | Topic ↔ curriculum map placement (context) |
| `utils/curriculum-audit/science-official-subsection-catalog.js` | Ministry strand alignment notes (owner review context) |
| `scripts/lib/science-learning-book-master-scope-manifest.mjs` | Machine-readable mapping for verifier |

**Explicitly not used as source of truth:** practice CTA mappings, SQL, Math/Geometry/Hebrew/English/Moledet masters (read-only for structure), app routes, catalog, themes, reader shell, book tiles.

**Grade membership rule (applied throughout):**  
`subject === "science"` AND `minGrade <= grade` AND `maxGrade >= grade`.

**Important spine note:** Science rows in `skills.json` are **topic-level question-bank bindings** (`subtopic: question_bank`), not fine-grained subskills like Math or Hebrew. Each spine row represents one MCQ topic umbrella. Learning pages therefore map **1:1 to topic × grade**, with depth calibrated from curriculum hints and question-bank coverage — not from invented subtopics outside the spine.

---

## 2. Science Subject Key

All subjects in `skills.json`: `english`, `geography`, `geometry`, `hebrew`, `math`, `science`.

**Verified Science subject key:** `science`  
(7 rows; no alternate key such as `מדעים`, `sciences`, or `science_technology`.)

**Skill ID pattern:** `science:topic:{topic_key}` where `topic_key` ∈  
`animals | body | earth_space | environment | experiments | materials | plants`.

**Child-facing subject name (future UI):** מדעים (internal IDs remain `science`).

---

## 3. Full Science Skill Inventory (Spine)

**Total Science skills:** 7  
**No meta / `no_question` row** (unlike geometry).

| # | skill_id | topic | subtopic | minGrade | maxGrade | cognitive_level | Description (spine) |
|---|----------|-------|----------|:--------:|:--------:|-----------------|---------------------|
| 1 | `science:topic:animals` | animals | question_bank | 1 | 6 | reasoning | MCQ bank topic animals; grades 1–6 |
| 2 | `science:topic:body` | body | question_bank | 1 | 6 | reasoning | MCQ bank topic body; grades 1–6 |
| 3 | `science:topic:earth_space` | earth_space | question_bank | 1 | 6 | reasoning | MCQ bank topic earth_space; grades 1–6 |
| 4 | `science:topic:environment` | environment | question_bank | 1 | 6 | reasoning | MCQ bank topic environment; grades 1–6 |
| 5 | `science:topic:experiments` | experiments | question_bank | 2 | 6 | reasoning | MCQ bank topic experiments; grades 2–6 |
| 6 | `science:topic:materials` | materials | question_bank | 1 | 6 | reasoning | MCQ bank topic materials; grades 1–6 |
| 7 | `science:topic:plants` | plants | question_bank | 1 | 3 | application | MCQ bank topic plants; grades 1–3 only |

**By grade (in-scope skills per spine filter):**

| Grade | In-scope skills | Teachable pages | Excluded from book (same grade) |
|------:|----------------:|----------------:|-----------------------------------|
| 1 | 6 | 6 | `science:topic:experiments` (minGrade 2) |
| 2 | 7 | 7 | — |
| 3 | 7 | 7 | — |
| 4 | 6 | 6 | `science:topic:plants` (maxGrade 3) |
| 5 | 6 | 6 | `science:topic:plants` (maxGrade 3) |
| 6 | 6 | 6 | `science:topic:plants` (maxGrade 3) |
| **Sum of grade page instances** | — | **38** | — |

**Question-bank volume hints** (from `SCIENCE_QUESTIONS`, not spine — for authoring depth only):

| Grade | body | animals | plants | materials | earth_space | environment | experiments |
|------:|-----:|--------:|-------:|----------:|------------:|------------:|------------:|
| 1 | 45 | 43 | 38 | 13 | 12 | 11 | — |
| 2 | 46 | 46 | 42 | 19 | 10 | 15 | 36 |
| 3 | 82 | 42 | 42 | 29 | 26 | 25 | 36 |
| 4 | 38 | 42 | — | 30 | 29 | 28 | 40 |
| 5 | 36 | 36 | — | 12 | 32 | 37 | 50 |
| 6 | 38 | 39 | — | 18 | 38 | 43 | 52 |

**Product topic list alignment** (`SCIENCE_GRADES[gN].topics` in `data/science-curriculum.js`):

| Grade | Topics in product curriculum |
|-------|------------------------------|
| g1 | body, animals, plants, materials, earth_space, environment |
| g2–g3 | + experiments |
| g4–g6 | body, animals, materials, experiments, earth_space, environment (plants dropped) |

This matches spine grade spans for all seven topic keys.

---

## 4. Grade-by-Grade Scope

**Proposed `learning_page_id` pattern (documentation only):**  
`science:{gN}:{topic}` — e.g. `science:g1:body`, `science:g4:experiments`.  
**Future drafts path (not created now):** `docs/learning-book/science/{gN}/drafts/{topic}.md`

**Age bands:** G1–2 → `grades_1_2`; G3–4 → `grades_3_4`; G5–6 → `grades_5_6`.

**Book title pattern (draft):** ספר מדעים — כיתה {א׳|ב׳|…} `[DRAFT — not owner-approved]`

---

### Grade 1 — כיתה א׳

**Stage (from `science-curriculum.js`):** היכרות בסיסית עם העולם הטבעי.  
**In-scope skills:** 6  
**Proposed pages:** 6  
**New skills:** all 6 (`minGrade = 1`)  
**Continuing from earlier grades:** none  

| skill_id | Draft page title [DRAFT] | Expected depth |
|----------|--------------------------|----------------|
| `science:topic:body` | גוף האדם — חושים ותנועה | Five senses by name; heart location very simple; no organ systems |
| `science:topic:animals` | בעלי חיים — חי לעומת דומם | Living vs non-living; basic needs (food, water, air); simple habitats |
| `science:topic:plants` | צמחים — מה צמחים צריכים | Parts of a plant (root, stem, leaf); sun, water, soil; growth observation |
| `science:topic:materials` | חומרים — תכונות יומיומיות | Hard/soft, rough/smooth, hot/cold by touch; everyday objects |
| `science:topic:earth_space` | כדור הארץ ומזג אוויר | Daily weather words (sun, rain, wind, hot/cold); day/night awareness |
| `science:topic:environment` | הסביבה שלנו | Caring for nature; litter/recycling awareness at child level |

**Excluded (why):**

| skill_id | Reason |
|----------|--------|
| `science:topic:experiments` | Spine `minGrade = 2`; scientific inquiry vocabulary not yet in product scope for G1 |
| All non-`science` subjects | By definition |

**Out-of-scope content (not in spine — do not author as separate pages):** energy, technology, ecosystems, forces, electricity, chemistry.

---

### Grade 2 — כיתה ב׳

**Stage:** בסיס ללמידה מדעית.  
**In-scope skills:** 7  
**Proposed pages:** 7  
**New skills:** `science:topic:experiments`  
**Continuing:** body, animals, plants, materials, earth_space, environment  

| skill_id | Draft page title [DRAFT] | Expected depth shift vs G1 |
|----------|--------------------------|----------------------------|
| `science:topic:body` | גוף האדם — בריאות והרגלים | Healthy habits; hygiene; basic food/exercise link |
| `science:topic:animals` | בעלי חיים — מחזור חיים | Life cycles (egg → adult); offspring resemble parents |
| `science:topic:plants` | צמחים — גדילה ומחזור | Seed → plant stages; what happens without water |
| `science:topic:materials` | חומרים — מצבי צבירה | Solid / liquid / gas at everyday level; ice melts |
| `science:topic:earth_space` | כדור הארץ — עונות ושמיים | Seasons intro; sun as light/heat source |
| `science:topic:environment` | סביבה — שמירה על הטבע | Reduce waste; protect plants/animals locally |
| `science:topic:experiments` | תצפית וחקירה | Observe → describe → compare; fair test intro (one thing changes) |

**Excluded:** none within science spine for G2.

---

### Grade 3 — כיתה ג׳

**Stage:** הרחבת מושגים מדעיים.  
**In-scope skills:** 7  
**Proposed pages:** 7  
**New skills:** none (all continuing)  
**Continuing:** all seven topic skills  

| skill_id | Draft page title [DRAFT] | Expected depth shift vs G2 |
|----------|--------------------------|----------------------------|
| `science:topic:body` | גוף האדם — מערכות בסיסיות | Skeleton/muscles awareness; digestion as “food → energy” simply |
| `science:topic:animals` | בעלי חיים — התאמה לסביבה | Adaptations (camouflage, fur, fins); habitat ↔ needs |
| `science:topic:plants` | צמחים — תנאי גידול | Photosynthesis as “plants make food with light” (no chemical equation) |
| `science:topic:materials` | חומרים — כוחות ותנועה | Push/pull; friction at playground level; magnets intro |
| `science:topic:earth_space` | כדור הארץ — מזג אוויר ומים | Weather vs climate distinction (simple); water cycle story |
| `science:topic:environment` | סביבה — מערכות קטנות | Food chains (plant → herbivore → predator); local ecosystem |
| `science:topic:experiments` | ניסוי מדעי קצר | Hypothesis in child words; record in table; one variable |

**Excluded:** none within science spine for G3.  
**Note:** `plants` last grade in spine (`maxGrade = 3`) — G3 plant page should consolidate plant learning for the product.

---

### Grade 4 — כיתה ד׳

**Stage:** הבנה מדעית מעמיקה.  
**In-scope skills:** 6 (plants drops out)  
**Proposed pages:** 6  
**New skills:** none  
**Continuing:** body, animals, materials, experiments, earth_space, environment  

| skill_id | Draft page title [DRAFT] | Expected depth shift vs G3 |
|----------|--------------------------|----------------------------|
| `science:topic:body` | גוף האדם — נשימה ועיכול | Respiration O₂/CO₂ exchange (simple); digestive path overview |
| `science:topic:animals` | בעלי חיים — יחסי גומלין | Predator/prey; competition; classification groups (mammals, birds…) |
| `science:topic:materials` | חומרים — שינויים פיזיקליים | Physical vs chemical change (examples only); states of matter recap |
| `science:topic:earth_space` | כדור הארץ — סלעים, קרקע, עונות | Rock/soil types (simple); seasons and Earth tilt (conceptual) |
| `science:topic:environment` | סביבה — שמירת משאבים | Natural resources; human impact; conservation choices |
| `science:topic:experiments` | תכנון ניסוי | Question → prediction → method → results → conclusion |

**Excluded (why):**

| skill_id | Reason |
|----------|--------|
| `science:topic:plants` | Spine `maxGrade = 3`; plant MCQ bank not in G4+ product topics |

**Curriculum hint not in spine:** G4 curriculum mentions basic electricity (conductors/insulators). Cover **only inside** `materials` or `experiments` pages at conceptual level — **no wiring instructions** (see §7).

---

### Grade 5 — כיתה ה׳

**Stage:** הרחבה ויישום ידע.  
**In-scope skills:** 6  
**Proposed pages:** 6  
**New skills:** none  
**Continuing:** body, animals, materials, experiments, earth_space, environment  

| skill_id | Draft page title [DRAFT] | Expected depth shift vs G4 |
|----------|--------------------------|----------------------------|
| `science:topic:body` | גוף האדם — שלד, שרירים, חושים | Musculoskeletal coordination; nervous system as message network (simple) |
| `science:topic:animals` | בעלי חיים — רבייה והתאמות | Reproduction types (egg/live birth); inherited traits |
| `science:topic:materials` | חומרים — תערובות ואור | Mixtures/solutions (salt water); light: shadow, reflection, transparency |
| `science:topic:earth_space` | כדור הארץ — משאבים ותופעות | Earth layers (crust/mantle/core names); natural phenomena (earthquake/volcano awareness) |
| `science:topic:environment` | סביבה — משאבי טבע | Renewable vs non-renewable (child examples); pollution types |
| `science:topic:experiments` | חקר מלא — תיעוד | Full inquiry journal; graphs; evaluating a design |

**Excluded:** `science:topic:plants` (spine maxGrade 3).

---

### Grade 6 — כיתה ו׳

**Stage:** רמה מתקדמת לפני חטיבה.  
**In-scope skills:** 6  
**Proposed pages:** 6  
**New skills:** none  
**Continuing:** body, animals, materials, experiments, earth_space, environment  

| skill_id | Draft page title [DRAFT] | Expected depth shift vs G5 |
|----------|--------------------------|----------------------------|
| `science:topic:body` | גוף האדם — תיאום בין מערכות | How systems work together; exercise/nutrition/sleep science links |
| `science:topic:animals` | בעלי חיים — מערכות אקולוגיות | Complex food webs; human role in ecosystems; biodiversity |
| `science:topic:materials` | חומרים — כימיה בסיסית | Safe lab rules; reversible/irreversible changes; density intro (conceptual) |
| `science:topic:earth_space` | כדור הארץ — אקלים וחלל | Climate change causes/effects (age-appropriate); Earth in solar system |
| `science:topic:environment` | סביבה — שינויי אקלים ופעולה | Carbon footprint awareness; sustainable choices; no doom framing |
| `science:topic:experiments` | פרויקט מדעי | Research question, controlled comparison, peer presentation outline |

**Excluded:** `science:topic:plants` (spine maxGrade 3).

---

## 5. Cross-Grade Progression

| Theme | G1 | G2 | G3 | G4 | G5 | G6 |
|-------|----|----|----|----|----|-----|
| **Living things (general)** | חי / דומם | מחזור חיים | התאמה לסביבה | יחסי גומלין | רבייה / תכונות | מערכות אקולוגיות |
| **Plants** (`plants`, G1–G3 only) | חלקי צמח, צרכים | זרע → צמח | גדילה + אור | *(no page)* | *(no page)* | *(no page)* |
| **Animals** (`animals`) | צרכים, סביבה | מחזור חיים | התאמות | סיווג, גומלין | רבייה | שרשראות מזון / מגוון |
| **Humans / body** (`body`) | חושים, תנועה | בריאות | מערכות בסיסיות | נשימה, עיכול | שלד/שרירים | תיאום מערכות |
| **Materials** (`materials`) | תכונות חושיות | מצבי צבירה | כוחות, מגנטים | שינוי פיזיקלי/כימי | תערובות, אור | כימיה בסיסית, בטיחות |
| **Energy / forces** *(embedded, no spine skill)* | — | חום/קר בחומרים | דחיפה/משיכה | חשמל — **מושגי בלבד** | אור/צל, אנרגיה | אנרגיה במערכות |
| **Earth / space** (`earth_space`) | מזג יומי | עונות | מזג vs אקלים, מחזור מים | סלעים, קרקע | משאבים, תופעות | אקלים, מערכת שמש |
| **Environment** (`environment`) | שמירת טבע | פחות פסולת | שרשרת מזון | משאבים, השפעה | זיהום, מתחדש | שינויי אקלים, פעולה |
| **Scientific thinking** (`experiments`, G2+) | — | תצפית, השוואה | ניסוי, משתנה | תכנון ניסוי | חקר + גрафים | פרויקט מלא |
| **Technology / systems** *(no spine skill)* | כלים יומיומיים (enrichment in curriculum) | כלי בית/מגנט | מכונות פשוטות | תהליך הנדסי | שיפור דגם | אופטימיזציה — **mention only inside experiments/materials, not separate page** |

---

## 6. Duplicate / Repetition Risk

Science has **six topic skills spanning grades 1–6** and **one skill (`plants`) spanning grades 1–3**. Every continuing topic **must get a separate page per grade** — never reuse G2 copy in G5.

| Topic skill | Grades with pages | What must change each grade |
|-------------|-------------------|-----------------------------|
| `science:topic:body` | G1–G6 (6 pages) | G1 senses → G4 organ systems → G6 integration; vocabulary ladder |
| `science:topic:animals` | G1–G6 (6 pages) | G1 living/non-living → G6 food webs; examples rotate by grade |
| `science:topic:plants` | G1–G3 only (3 pages) | G1 parts/needs → G3 photosynthesis story; **stop after G3** |
| `science:topic:materials` | G1–G6 (6 pages) | G1 touch properties → G6 chemistry safety; no repeated examples |
| `science:topic:earth_space` | G1–G6 (6 pages) | G1 daily weather → G6 climate/space; diagrams increase with grade |
| `science:topic:environment` | G1–G6 (6 pages) | G1 litter → G6 climate action; avoid repeating “recycle” as sole content |
| `science:topic:experiments` | G2–G6 (5 pages) | G2 observe → G6 full project; procedure vocabulary scales up |

**Anti-patterns to avoid:**

- Copying the same “plant needs sun and water” paragraph in G1, G2, and G3 without new depth.
- Introducing electricity lab steps in G4 `materials` because curriculum mentions circuits.
- Creating standalone “energy” or “technology” pages — not in spine.
- Showing G6 climate content to G1 students via fallback (forbidden by master plan rules).

---

## 7. Scientific Accuracy Rules (Future Authoring)

These rules apply when per-grade drafts are authored **after owner approval** of this map.

### Language and claims

- Use **simple but correct** Hebrew scientific terms; introduce one new term per page where possible.
- **Do not overclaim** — e.g. avoid “plants breathe like humans”; prefer accurate child-level models (“plants take in carbon dioxide and release oxygen”).
- **No high-school formulas** (no chemical equations, no F=ma notation, no punnett squares).
- Distinguish **observation** vs **inference** explicitly on `experiments` pages from G2 upward.

### Age appropriateness

- G1–2: concrete, sensory, single cause-effect; drawings over abstract diagrams.
- G3–4: short chains of reasoning; labeled diagrams OK.
- G5–6: systems thinking and data tables; still no adult textbook tone.

### Safety (mandatory)

- **No instructions** for dangerous experiments, open flame, household chemicals, mains electricity, sharp tools unsupervised, or tasting unknown substances.
- **No step-by-step wiring** of electrical circuits — conceptual only (conductor vs insulator, open vs closed path).
- If suggesting classroom/home activities: **safe, supervised, age-appropriate** only (e.g. observe clouds, sort materials by property, measure temperature of tap water with adult help).
- G6 “hazardous materials” content = **recognition and safety rules**, not handling instructions.

### Scope discipline

- Do not invent facts or topics **outside the seven spine skills**.
- Do not expose internal keys (`science:topic:body`, `question_bank`) in child-facing UI.
- Do not add fake practice CTA mappings in Section 7 until practice reverse-map is approved separately.

### Overlap with other subjects

- **Geography / Moledet:** maps, settlements, citizenship, Israel regions → geography book, not science.
- **Science environment/earth_space:** natural processes, phenomena, stewardship — stay process-oriented, not map-reading oriented.
- When a concept appears in both (e.g. water sources, natural resources), science pages explain **how nature works**; geography pages explain **where and human use**.

---

## 8. Owner-Review Questions

1. **Topic-level pages only?** The spine has 7 coarse topic skills. Confirm one page per topic per grade (38 total instances) vs requesting finer spine split before authoring (e.g. separate `energy` skill).
2. **Plants stop at G3:** Spine and product curriculum agree. Confirm no G4+ plant refresh page is desired.
3. **Electricity in G4 materials:** Curriculum hints include conductors/insulators. Approve **conceptual-only** treatment (no hands-on circuit steps)?
4. **Climate change in G5–G6:** Approve tone guidelines ( factual, action-oriented, avoid anxiety-inducing framing)?
5. **Technology/engineering content:** Currently folded into `experiments` / `materials` enrichment. Separate spine skills needed later?
6. **Hebrew titles:** Review draft titles in §4 and Appendix — any ministry-preferred wording?
7. **Diagrams:** Many pages will need illustrations (body, water cycle, food web). Approve illustration backlog as separate art task?
8. **Grade page order:** Proposed order in Appendix — life sciences first (body → animals → plants), then materials, earth, environment, experiments — or ministry strand order?

---

## 9. Risks Before Content Authoring

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Topics too advanced for grade** | Curriculum.js G4–G6 mentions electricity, chemistry, climate | Strict age-band templates; owner signoff per grade pack |
| **Coarse spine granularity** | One page must cover wide MCQ bank per topic | Use question `conceptTag` clusters as subsection hints inside single page; flag gaps for owner |
| **Unclear Hebrew terms** | מצבי צבירה, התאמה, מוליך/מבודד | Glossary sidebar in drafts; niqqud optional for hard words |
| **Diagram dependency** | body, earth_space, environment, materials need visuals | Plan illustration list per page before writing §2–§3 |
| **Geography overlap** | environment vs natural resources; earth_space vs landforms/maps | Cross-link policy: science = process; geography = place (see §7) |
| **Scientific accuracy drift** | Simplified models may be misread as literal | “מה למדנו” section states model limits where needed |
| **Safety creep in activities** | Authors may add “fun experiments” | §7 safety rules in every grade authoring brief |
| **Plants G3 exit** | Students in G4+ may still encounter plant facts in mixed contexts | No plant **learning page** in G4+; practice may still reference prior knowledge only via diagnostics |

---

## 10. Proposed Next Step

**After owner approval of this master scope map:**

1. Create per-grade content packages (planning docs only first):
   - `docs/learning-book/SCIENCE_GRADE_1_LEARNING_BOOK_PLAN.md` … `SCIENCE_GRADE_6_LEARNING_BOOK_PLAN.md`
2. Each grade plan expands Appendix page candidates into batch order, section §5/§6 contexts, and concept boundaries from question-bank clusters.
3. Author Hebrew drafts under `docs/learning-book/science/{gN}/drafts/{topic}.md` — **not before grade plan signoff**.
4. Runtime registry, routes, tiles, and practice reverse-maps remain **out of scope** until content approval gate (same as Math/Geometry sequence).

**Verification:**  
`node scripts/verify-science-learning-book-master-scope.mjs`

---

## 11. Appendix — Page Candidates by Grade

| Grade | Order | learning_page_id | skill_id | Draft file | Draft title [DRAFT] |
|------:|------:|------------------|----------|------------|---------------------|
| G1 | 1 | `science:g1:body` | `science:topic:body` | `body.md` | גוף האדם — חושים ותנועה |
| G1 | 2 | `science:g1:animals` | `science:topic:animals` | `animals.md` | בעלי חיים — חי לעומת דומם |
| G1 | 3 | `science:g1:plants` | `science:topic:plants` | `plants.md` | צמחים — מה צמחים צריכים |
| G1 | 4 | `science:g1:materials` | `science:topic:materials` | `materials.md` | חומרים — תכונות יומיומיות |
| G1 | 5 | `science:g1:earth_space` | `science:topic:earth_space` | `earth_space.md` | כדור הארץ ומזג אוויר |
| G1 | 6 | `science:g1:environment` | `science:topic:environment` | `environment.md` | הסביבה שלנו |
| G2 | 1–6 | *(same topics as G1)* | *(continuing)* | *(same filenames)* | *(G2 depth titles in §4)* |
| G2 | 7 | `science:g2:experiments` | `science:topic:experiments` | `experiments.md` | תצפית וחקירה |
| G3 | 1–7 | *(all seven topics)* | *(all continuing)* | *(same filenames)* | *(G3 depth titles in §4)* |
| G4 | 1–6 | body, animals, materials, earth_space, environment, experiments | *(continuing)* | *(same filenames)* | *(G4 depth titles in §4)* |
| G5 | 1–6 | same six as G4 | *(continuing)* | *(same filenames)* | *(G5 depth titles in §4)* |
| G6 | 1–6 | same six as G4 | *(continuing)* | *(same filenames)* | *(G6 depth titles in §4)* |

**Total proposed pages:** 38 (unique draft files per grade folder: 6 + 7 + 7 + 6 + 6 + 6).

---

*End of master scope plan. No runtime, design, registry, routes, practice mappings, SQL, or other subject masters were modified.*

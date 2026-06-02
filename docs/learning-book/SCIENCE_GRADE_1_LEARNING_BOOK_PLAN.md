# Grade 1 Science Learning Book — Plan

**Status:** Draft content package — documentation only. No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר מדעים — כיתה א׳ `[DRAFT — not owner-approved]`  
**Master scope:** `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Approved G1 scope, depth, exclusions |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `data/science-curriculum.js` | G1 stage/focus hints (context only) |
| `data/science-questions.js` | G1 MCQ concept coverage hints (context only) |

**Subject naming:** Child-facing copy uses **מדעים**. Internal IDs remain `science`.

---

## 1. Grade 1 Science Skills (Complete List)

A skill is **in Grade 1 Science scope** when `subject: "science"` and `minGrade ≤ 1` and `maxGrade ≥ 1`.

**Spine filter result: 6 teachable rows**

| # | skill_id | topic | min | max | Learning page? |
|---|----------|-------|-----|-----|----------------|
| 1 | `science:topic:body` | body | 1 | 6 | **Yes** |
| 2 | `science:topic:animals` | animals | 1 | 6 | **Yes** |
| 3 | `science:topic:plants` | plants | 1 | 3 | **Yes** |
| 4 | `science:topic:materials` | materials | 1 | 6 | **Yes** |
| 5 | `science:topic:earth_space` | earth_space | 1 | 6 | **Yes** |
| 6 | `science:topic:environment` | environment | 1 | 6 | **Yes** |

**Total learning pages: 6** (one `science:g1:{topic}` page each).

### 1A. New in Grade 1 — all 6 skills

All six have `minGrade = 1`. Grade 1 is the first science book grade.

### 1B. Continuing from earlier grades

None.

### 1C. Excluded from Grade 1 book (with reason)

| skill_id | Reason |
|----------|--------|
| `science:topic:experiments` | Spine `minGrade = 2` |
| energy, technology, ecosystems | Not in spine — no separate pages |
| All non-`science` subjects | By definition |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/science/g1/drafts/{topic}.md`  
`learning_page_id`: `science:g1:{topic}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Learning goal (short) |
|-------|-------|------------------|----------|------------|--------------|------------------------|
| A | 1 | `science:g1:body` | `science:topic:body` | `body.md` | גוף האדם — חושים ותנועה | חמשת החושים; תנועה; הלב מזרים דם |
| A | 2 | `science:g1:animals` | `science:topic:animals` | `animals.md` | בעלי חיים — חי לעומת דומם | חי/דומם; צרכים בסיסיים |
| A | 3 | `science:g1:plants` | `science:topic:plants` | `plants.md` | צמחים — מה צמחים צריכים | חלקי צמח; שמש, מים, אדמה |
| B | 4 | `science:g1:materials` | `science:topic:materials` | `materials.md` | חומרים — תכונות יומיומיות | קשה/רך; חלק/מחוספס; חם/קר |
| B | 5 | `science:g1:earth_space` | `science:topic:earth_space` | `earth_space.md` | כדור הארץ ומזג אוויר | יום/לילה; שמש, גשם, רוח |
| B | 6 | `science:g1:environment` | `science:topic:environment` | `environment.md` | הסביבה שלנו | פסולת בפח; שמירה על הטבע |

**Page count:** 6.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | עולם החיים | 3 | body, animals, plants |
| **B** | חומרים, כדור הארץ וסביבה | 3 | materials, earth_space, environment |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | In scope (G1 draft) | Out of scope |
|------|---------------------|--------------|
| `body` | חושים (ראייה, שמיעה, ריח, טעם, מגע); תנועה; הלב בחזה | מערכות גוף; נשימה/עיכול מפורט |
| `animals` | חי לעומת דומם; מזון, מים, אוויר; דוגמאות יומיומיות | מחזור חיים; סיווג מפורט |
| `plants` | שורש, גבעול, עלה; שמש, מים, אדמה | ב photosynthesis; ניסויים |
| `materials` | תכונות במגע; חומרים מהבית | מצבי צבירה מלאים; חשמל |
| `earth_space` | שמש ביום; ירח/כוכבים בלילה; מזג יומי | עונות; מחזור מים |
| `environment` | פח אשפה; ניקיון; לא לזרוק בטבע | שרשראות מזון; אקלים |

---

## 5. Section 5 / Section 6 Alignment Plan

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `body` | עיניים — רואים | בלבול אוזניים/עיניים |
| `animals` | כלב — חי, צריך מים | בלבול אבן/צמח כ"חי" |
| `plants` | עציץ בחלון — שמש ומים | בלבול: צמח בלי מים |
| `materials` | ספוג — רך | בלבול קשה/רך |
| `earth_space` | יום שמש — שמש בשמיים | בלבול יום/לילה |
| `environment` | פח בכיתה — זורקים פנימה | בלבול: פסולת על הרצפה |

---

## 6. Content Safety (Grade 1)

- No unsafe experiments, chemicals, fire, sharp tools, or mains electricity
- No step-by-step lab procedures
- Section 7: text-only invitation — **no practice routing**
- No `[DRAFT]` inside section bodies
- Short sentences; one main idea per page
- Child-facing subject name: **מדעים**

---

## 7. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/SCIENCE_GRADE_1_LEARNING_BOOK_PLAN.md` | ✅ |
| Draft pages | `docs/learning-book/science/g1/drafts/*.md` | ✅ 6 pages |
| Draft README | `docs/learning-book/science/g1/drafts/README.md` | ✅ |
| Draft manifest | `scripts/lib/science-g1-draft-manifest.mjs` | ✅ |
| Content verifier | `scripts/verify-science-g1-book-content.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, Science Master practice mappings, SQL, commit, push.

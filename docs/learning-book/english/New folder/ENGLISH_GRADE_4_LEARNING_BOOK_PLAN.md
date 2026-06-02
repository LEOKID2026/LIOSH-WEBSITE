# Grade 4 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה ד׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## 1. Grade 4 Scope Summary

**Expected level:** שלב אוריינות מתפתחת — Present Simple vs Continuous, quantifiers/possessives/adverbs, narrative sentences, community translation.

**Spine teachable rows:** 21 → **19 pages** after merges.

### Merge decisions

| Rows merged | Into | Saved |
|-------------|------|-------|
| `english:grammar:line:present_simple_לעומת_present_continuous` + `english:pool:grammar:progressive` | `grammar_simple_continuous.md` | 1 |
| `english:grammar:line:some_any_much_many_…` + `english:pool:grammar:quantifiers` | `grammar_quantifiers.md` | 1 |

**Note:** `english:pool:grammar:present_simple` remains a **separate continuing page** (`grammar_present_simple.md`) for habit/fact reinforcement — distinct from the contrast page.

### Excluded

All `english:g4:topic:*` access rows. No writing standalone page.

---

## 2. Full Page List (19)

| Batch | pageId | Title | New / continuing |
|-------|--------|-------|------------------|
| A | vocab_animals | חיות — פעולה עכשיו | continuing |
| A | vocab_body | גוף — פעולות יומיומיות | continuing |
| A | vocab_emotions | רגשות — They feel… | continuing |
| A | vocab_family | משפחה — parents, work | continuing |
| A | vocab_food | מזון — healthy food | continuing |
| A | vocab_school | בית ספר — students, read | continuing |
| A | vocab_sports | ספורט — עכשיו במגרש | continuing |
| A | vocab_weather | מזג אוויר — היום | continuing |
| B | vocab_community | קהילה — park, town, library | **new** |
| B | vocab_environment | סביבה — trees, protect | **new** |
| B | vocab_travel | נסיעות — bus, travel | **new** |
| C | grammar_present_simple | Present Simple — חיזוק | continuing |
| C | grammar_simple_continuous | Present Simple לעומת Continuous | **new** (merged) |
| C | grammar_quantifiers | some/any, much/many, my, slowly | **new** (merged) |
| D | sentence_descriptive | תיאור — תאר + תואר פועל | continuing |
| D | sentence_routine | שגרה — every day | continuing |
| D | sentence_narrative | סיפור קצר — First… Then… | **new** |
| E | translation_hobbies | תחביבים — תרגום עם Continuous | continuing |
| E | translation_community | קהילה — תרגום | **new** |

---

## 3. G3 vs G4 differentiation

| Area | G3 | G4 |
|------|----|----|
| Grammar focus | Present Simple forms; articles; prepositions | Simple vs Continuous contrast; quantifiers; adverbs |
| Sentences | Descriptive (adjective + noun) | Narrative sequence (First/Then) |
| Vocab themes | body, sports, weather | community, environment, travel |
| Translation | Hobbies introduction | Community places + Continuous in hobbies recap |

Pages are **not** copied from G3 — G4 deepens grammar and sentence work.

---

## 4. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `ENGLISH_GRADE_4_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `ENGLISH_GRADE_4_HEBREW_REVIEW_PACK.md` | ✅ |
| Drafts | `english/g4/drafts/*.md` | ✅ 19 |
| README | `english/g4/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/english-g4-draft-manifest.mjs` | ✅ |
| Build / verify | `build-english-g4-*`, `verify-english-g4-*` | ✅ |

---

## 5. Owner-Review Topics

1. Separate `grammar_present_simple` continuing page vs folding into contrast page
2. Narrative page scope — First/Then only vs longer sequences
3. much/many depth for Grade 4
4. Mixed Hebrew-English rendering in longer sentences

---

## 6. Next Step

Owner Hebrew review → signoff → runtime insertion (separate task).

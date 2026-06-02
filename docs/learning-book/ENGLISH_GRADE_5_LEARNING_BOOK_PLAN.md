# Grade 5 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה ה׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## 1. Grade 5 Scope Summary

**Expected level:** שלב אוריינות מורחבת — Past Simple, Future (will / going to), modals, comparatives; longer sentences; technology and global topics.

**Spine teachable rows:** 23 → **21 pages** after merge/split decisions.

### Merge / split decisions

| Decision | Result |
|----------|--------|
| `past_simple` curriculum line + pool | **Merged** → `grammar_past_simple.md` |
| `future_forms`, `modals`, `comparatives` pools | **Separate pages** (3 pages) |
| Curriculum line `מודאליים_בסיסיים_future_will_going_to_והשוואתיים` | **Linked** on future, modals, comparatives — no standalone page |

### Excluded

All `english:g5:topic:*` access rows + mixed. No writing standalone page.

---

## 2. Full Page List (21)

| Batch | pageId | Title | New / continuing |
|-------|--------|-------|------------------|
| A | vocab_animals … vocab_travel (9) | Continuing vocab — Past/Future context | continuing |
| B | vocab_health, vocab_technology | בריאות / טכנולוגיה | **new** |
| C | grammar_past_simple | Past Simple — עבר פשוט | **new** (merged) |
| C | grammar_future_forms | Future — will / going to | **new** |
| C | grammar_modals | Modals — can, must, have to | **new** |
| C | grammar_comparatives | Comparatives | **new** |
| C | grammar_quantifiers | much/many — חיזוק | continuing |
| D | sentence_narrative | סיפור — Then we arrived | continuing |
| D | sentence_advanced | משפטים מורחבים | **new** |
| E | translation_community | קהילה — תרגום מורחב | continuing |
| E | translation_technology | טכנולוגיה — תרגום | **new** |
| E | translation_global | עולם — תרגום | **new** |

---

## 3. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `ENGLISH_GRADE_5_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `ENGLISH_GRADE_5_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Drafts | `english/g5/drafts/*.md` | ✅ 21 |
| README | `english/g5/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/english-g5-draft-manifest.mjs` | ✅ |
| Build / verify | `build-english-g5-*`, `verify-english-g5-*` | ✅ |

---

## 4. Owner-Review Topics

1. Past Simple irregular list depth (went, saw, had — confirm scope)
2. Three separate grammar pages vs bundled future/modals/comparatives intro
3. Nine continuing vocab pages — batch or keep separate
4. Global translation sentence length for Grade 5
5. Bidi/LTR on longer sentences (`People around the world speak many languages`)

---

## 5. Next Step

Owner Hebrew review → signoff → runtime insertion (separate task).

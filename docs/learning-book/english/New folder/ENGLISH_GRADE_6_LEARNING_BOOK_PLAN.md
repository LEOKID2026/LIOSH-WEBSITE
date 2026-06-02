# Grade 6 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה ו׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## 1. Grade 6 Scope Summary

**Expected level:** שלב מתקדם — complex tenses intro, conditionals 0/1, should/might/could; middle-school readiness.

**Spine teachable rows:** 19 → **17 pages** after merges.

### Merge decisions

| Merge | Into | Saved |
|-------|------|-------|
| `past_continuous…` curriculum line + `complex_tenses` pool | `grammar_complex_tenses.md` | 1 |
| `conditionals_type_0_1…` line + `conditionals` pool | `grammar_conditionals.md` | 1 |

**Modals:** separate continuing page — **should / might / could** only (not G5 can/must recap).

### Out of scope (confirmed)

- Present Perfect full mastery
- Conditionals type 2+
- Word lists with `maxGrade < 6`: family, school, food, sports, colors, numbers, actions, house, body, weather
- Phonics / alphabet / standalone reading / text types
- Writing access row (no standalone page)

---

## 2. Full Page List (17)

| Batch | pageId | Title | New / continuing |
|-------|--------|-------|------------------|
| A | vocab_animals … vocab_travel (7) | Continuing vocab — G6 grammar context | continuing |
| B | vocab_culture, vocab_global_issues, vocab_history | תרבות / סוגיות / היסטוריה | **new** |
| C | grammar_complex_tenses | Past Continuous + Simple + PP intro | **new** (merged) |
| C | grammar_conditionals | Conditionals type 0/1 | **new** (merged) |
| C | grammar_modals | should / might / could | continuing |
| C | grammar_comparatives | Superlatives | continuing |
| D | sentence_advanced | משפטים מורכבים | continuing |
| E | translation_technology, translation_global | תרגום מתקדם | continuing |

---

## 3. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `ENGLISH_GRADE_6_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `ENGLISH_GRADE_6_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Drafts | `english/g6/drafts/*.md` | ✅ 17 |
| README | `english/g6/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/english-g6-draft-manifest.mjs` | ✅ |
| Build / verify | `build-english-g6-*`, `verify-english-g6-*` | ✅ |

---

## 4. Owner-Review Topics

1. Present Perfect intro depth — `I have visited` only; confirm sufficient
2. Conditionals 0 vs 1 — two examples enough for Grade 6?
3. Modals page — confirm no overlap confusion with G5 can/must page
4. Global translation sentence length
5. Bidi/LTR on conditional clauses (`If we protect the oceans, future generations will benefit`)

---

## 5. Next Step

Owner Hebrew review → signoff → runtime insertion (separate task). English G1–G6 content packages then complete for documentation phase.

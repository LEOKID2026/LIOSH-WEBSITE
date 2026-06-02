# Grade 3 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה ג׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## 1. Grade 3 Scope Summary

**Expected level:** שלב ראשית אוריינות — Present Simple (±/?), a/an/the, in/on/under, descriptive sentences, hobbies translation.

**Spine teachable rows:** 20 → **19 pages** after merge.

### Merge decision

| Rows merged | Into | Saved |
|-------------|------|-------|
| `english:grammar:line:present_simple_בחיובי_שלילי_שאלה` + `english:pool:grammar:present_simple` | `grammar_present_simple.md` | 1 |

### Excluded

All `english:g3:topic:*` access rows + `english:g3:topic:mixed`. No writing standalone page. No phonics/reading/text-types.

---

## 2. Full Page List (19)

| Batch | pageId | Title | New / continuing |
|-------|--------|-------|------------------|
| A | vocab_actions | פעולות — Present Simple | continuing |
| A | vocab_animals | חיות — במשפט מלא | continuing |
| A | vocab_colors | צבעים — תיאור | continuing |
| A | vocab_emotions | רגשות — She feels… | continuing |
| A | vocab_family | משפחה — פעולות במשפחה | continuing |
| B | vocab_food | מזון — I eat… | continuing |
| B | vocab_house | בית — חפצים ומיקום | continuing |
| B | vocab_numbers | מספרים — There are… | continuing |
| B | vocab_school | בית ספר — We learn… | continuing |
| C | vocab_body | גוף האדם באנגלית | **new** |
| C | vocab_sports | ספורט באנגלית | **new** |
| C | vocab_weather | מזג אוויר באנגלית | **new** |
| D | grammar_present_simple | Present Simple — חיובי, שלילי ושאלה | **new** (merged) |
| D | grammar_articles_prepositions | a / an / the ו-in / on / under | **new** |
| D | grammar_question_frames | שאלות — חיזוק כיתה ג׳ | continuing |
| E | sentence_routine | שגרת יום — משפטים מלאים | continuing |
| E | sentence_descriptive | משפטים תיאוריים | **new** |
| E | translation_routines | שגרה — תרגום מורחב | continuing |
| E | translation_hobbies | תחביבים — תרגום | **new** |

---

## 3. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `ENGLISH_GRADE_3_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `ENGLISH_GRADE_3_HEBREW_REVIEW_PACK.md` | ✅ |
| Drafts | `english/g3/drafts/*.md` | ✅ 19 |
| README | `english/g3/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/english-g3-draft-manifest.mjs` | ✅ |
| Build / verify | `build-english-g3-*`, `verify-english-g3-*` | ✅ |

---

## 4. Owner-Review Topics

1. 9 continuing vocab pages — confirm depth vs batching
2. Present Simple Hebrew label — "זמן הווה פשוט" vs informal wording
3. question_frames recap page — keep or fold into present_simple
4. Bidi/LTR for multi-line English examples

---

## 5. Next Step

Owner Hebrew review → signoff → runtime insertion (separate task).

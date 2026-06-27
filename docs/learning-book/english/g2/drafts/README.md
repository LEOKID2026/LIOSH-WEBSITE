# Grade 2 English Learning Book — Drafts

**Status:** Draft content — **15 / 15** pages. Not owner-approved. No runtime wired.
**Date:** June 2026
**Folder:** `docs/learning-book/english/g2/drafts/`
**Book title:** ספר אנגלית — כיתה ב׳

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/ENGLISH_GRADE_2_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **15 / 15** |
| Review pack | ✅ `docs/learning-book/ENGLISH_GRADE_2_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-english-g2-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/english-g2-draft-manifest.mjs` |
| Runtime / registry / routes | ❌ Not created |

---

## Naming

- Child-facing subject: **אנגלית**
- Internal IDs: `english:g2:{pageId}`, `subject: english`

---

## Batch A — continuing vocab (7)

| File | Draft title |
|------|-------------|
| `vocab_colors.md` | צבעים — שימוש במשפט |
| `vocab_numbers.md` | מספרים — עד 20 |
| `vocab_family.md` | משפחה — מילים במשפט |
| `vocab_animals.md` | חיות — שמות ומשפטים |
| `vocab_emotions.md` | רגשות — במשפט |
| `vocab_actions.md` | פעולות — פועל במשפט |
| `vocab_school.md` | בית ספר — חפצים במשפט |

## Batch B — new vocab (2)

| File | Draft title |
|------|-------------|
| `vocab_food.md` | מזון באנגלית |
| `vocab_house.md` | בית — חדרים וחפצים |

## Batch C — grammar (2)

| File | Draft title | Merge note |
|------|-------------|------------|
| `grammar_be.md` | am / is / are — חיזוק | Merged חיזוק line ו-be_basic |
| `grammar_plural_questions.md` | ריבוי ושאלות פשוטות | Merged plural line ו-question_frames |

## Batch D — sentences ו-translation (4)

| File | Draft title |
|------|-------------|
| `sentence_base.md` | משפטים קצרים — כיתה ב׳ |
| `sentence_routine.md` | שגרת יום — משפטים |
| `translation_classroom.md` | ביטויי כיתה — משפטים |
| `translation_routines.md` | שגרת יום — תרגום |

---

## Content rules

- Continuing pages must differ from G1 — deeper sentences, not copy-paste
- No standalone writing page (writing access row excluded)
- Section 7 text-only — no practice routing

---

## Regenerate review pack

```bash
node scripts/build-english-g2-hebrew-review-pack.mjs
node scripts/verify-english-g2-book-content.mjs
```

---

## Explicit stop rule

- ❌ No registry, routes, practice CTA, SQL, commit, push, deploy
- ✅ Drafts remain source for future runtime task

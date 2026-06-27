# Grade 1 English Learning Book — Drafts

**Status:** Draft content — **10 / 10** pages. Not owner-approved. No runtime wired.
**Date:** June 2026
**Folder:** `docs/learning-book/english/g1/drafts/`
**Book title:** ספר אנגלית — כיתה א׳

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/ENGLISH_GRADE_1_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **10 / 10** |
| Review pack | ✅ `docs/learning-book/ENGLISH_GRADE_1_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-english-g1-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/english-g1-draft-manifest.mjs` |
| Runtime / registry / routes | ❌ Not created |

---

## Naming

- Child-facing subject: **אנגלית**
- Internal IDs: `english:g1:{pageId}`, `subject: english`

---

## Batch A — אוצר מילים (3)

| File | Draft title |
|------|-------------|
| `vocab_colors.md` | צבעים באנגלית |
| `vocab_numbers.md` | מספרים 0–10 באנגלית |
| `vocab_family.md` | משפחה באנגלית |

## Batch B — אוצר מילים (4)

| File | Draft title |
|------|-------------|
| `vocab_animals.md` | חיות באנגלית |
| `vocab_emotions.md` | רגשות באנגלית |
| `vocab_actions.md` | פעולות באנגלית |
| `vocab_school.md` | בית ספר באנגלית |

## Batch C — תבניות בסיסיות (3)

| File | Draft title | Merge note |
|------|-------------|------------|
| `grammar_be.md` | I am / You are — היכרות | Merged be line ו-be_basic pool |
| `sentence_base.md` | משפטים קצרים — בסיס | |
| `translation_classroom.md` | ביטויי כיתה | |

---

## Content rules

- Hebrew explanations; English examples on own lines
- 7 sections per page; no `[DRAFT]` in section bodies
- Section 7 text-only — no practice routing
- No alphabet/phonics pages (not in spine)

---

## Regenerate review pack

```bash
node scripts/build-english-g1-hebrew-review-pack.mjs
node scripts/verify-english-g1-book-content.mjs
```

---

## Explicit stop rule

- ❌ No registry, routes, practice CTA, SQL, commit, push, deploy
- ✅ Drafts remain source for future runtime task

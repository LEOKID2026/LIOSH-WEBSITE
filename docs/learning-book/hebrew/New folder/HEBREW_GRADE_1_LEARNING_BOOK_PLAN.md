# Grade 1 Hebrew Learning Book — Plan

**Status:** Draft content package (June 2026). All pages `approval_status: draft`. No UI, routes, registry, SQL, commit, push, or deploy.  
**Master scope:** `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`  
**Date:** June 2026  
**Book title (child-facing):** ספר עברית — כיתה א׳  
**Child-facing subject:** עברית  
**Internal subject key:** `hebrew`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list — **32** Grade 1 Hebrew rows |
| `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Approved master scope |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section age-band template (grades 1–2) |
| `data/hebrew-g1-content-map.js` | Subtopic weights/modes (context) |
| `data/hebrew-curriculum.js` | Grade 1 stage summary (context) |

**Out of scope:** Math, Geometry, other Hebrew grades, runtime, practice mappings.

---

## 1. Page Count Reconciliation

| Check | Result |
|-------|--------|
| Master plan stated G1 in-scope skills | **32** |
| `skills.json` filter (`subject: hebrew`, `minGrade ≤ 1`, `maxGrade ≥ 1`) | **32** |
| Draft `.md` files (excluding README) | **32** |
| Master plan pedagogical order table row count | 32 (one table once listed 35 rows by mistake — **not** an extra spine row) |

**Conclusion:** Author **32 pages only** — one per spine row. No extra pages.

### Duplicate subtopic disambiguation

Two spine rows share subtopic `g1.word_meaning_concrete` in different domains:

| skill_id | pageId (file) | learning_page_id |
|----------|---------------|------------------|
| `hebrew:g1:comprehension:g1.word_meaning_concrete` | `comprehension_g1.word_meaning_concrete.md` | `hebrew:g1:comprehension_g1.word_meaning_concrete` |
| `hebrew:g1:vocabulary:g1.word_meaning_concrete` | `vocabulary_g1.word_meaning_concrete.md` | `hebrew:g1:vocabulary_g1.word_meaning_concrete` |

---

## 2. Grade 1 Hebrew Skills — Full List (32)

| # | skill_id | Draft file | learning_page_id |
|---|----------|------------|------------------|
| 1 | `hebrew:g1:reading:g1.phoneme_awareness` | `g1.phoneme_awareness.md` | `hebrew:g1:g1.phoneme_awareness` |
| 2 | `hebrew:g1:reading:g1.open_close_syllable` | `g1.open_close_syllable.md` | `hebrew:g1:g1.open_close_syllable` |
| 3 | `hebrew:g1:reading:g1.rhyme` | `g1.rhyme.md` | `hebrew:g1:g1.rhyme` |
| 4 | `hebrew:g1:reading:g1.syllables` | `g1.syllables.md` | `hebrew:g1:g1.syllables` |
| 5 | `hebrew:g1:reading:g1.letters` | `g1.letters.md` | `hebrew:g1:g1.letters` |
| 6 | `hebrew:g1:reading:g1.final_letters` | `g1.final_letters.md` | `hebrew:g1:g1.final_letters` |
| 7 | `hebrew:g1:reading:g1.basic_niqqud` | `g1.basic_niqqud.md` | `hebrew:g1:g1.basic_niqqud` |
| 8 | `hebrew:g1:reading:g1.sound_letter_match` | `g1.sound_letter_match.md` | `hebrew:g1:g1.sound_letter_match` |
| 9 | `hebrew:g1:reading:g1.simple_words_read` | `g1.simple_words_read.md` | `hebrew:g1:g1.simple_words_read` |
| 10 | `hebrew:rich:reading:word_level_early_g1:spelling_meaning_then_choice` | `reading_word_level_early_g1_spelling_meaning_then_choice.md` | `hebrew:g1:reading_word_level_early_g1_spelling_meaning_then_choice` |
| 11 | `hebrew:g1:grammar:g1.grammar_pos_roles` | `g1.grammar_pos_roles.md` | `hebrew:g1:g1.grammar_pos_roles` |
| 12 | `hebrew:g1:grammar:g1.grammar_wellformed` | `g1.grammar_wellformed.md` | `hebrew:g1:g1.grammar_wellformed` |
| 13 | `hebrew:g1:grammar:g1.grammar_agreement_light` | `g1.grammar_agreement_light.md` | `hebrew:g1:g1.grammar_agreement_light` |
| 14 | `hebrew:g1:grammar:g1.grammar_cloze_deixis` | `g1.grammar_cloze_deixis.md` | `hebrew:g1:g1.grammar_cloze_deixis` |
| 15 | `hebrew:g1:grammar:g1.grammar_word_order` | `g1.grammar_word_order.md` | `hebrew:g1:g1.grammar_word_order` |
| 16 | `hebrew:g1:grammar:g1.grammar_odd_category` | `g1.grammar_odd_category.md` | `hebrew:g1:g1.grammar_odd_category` |
| 17 | `hebrew:g1:grammar:g1.grammar_punctuation` | `g1.grammar_punctuation.md` | `hebrew:g1:g1.grammar_punctuation` |
| 18 | `hebrew:g1:grammar:g1.grammar_connectors_time` | `g1.grammar_connectors_time.md` | `hebrew:g1:g1.grammar_connectors_time` |
| 19 | `hebrew:rich:grammar:gender_number_early_g1:agreement_girl_singular` | `grammar_gender_number_early_g1_agreement_girl_singular.md` | `hebrew:g1:grammar_gender_number_early_g1_agreement_girl_singular` |
| 20 | `hebrew:g1:comprehension:g1.word_meaning_concrete` | `comprehension_g1.word_meaning_concrete.md` | `hebrew:g1:comprehension_g1.word_meaning_concrete` |
| 21 | `hebrew:g1:comprehension:g1.one_sentence_who_what` | `g1.one_sentence_who_what.md` | `hebrew:g1:g1.one_sentence_who_what` |
| 22 | `hebrew:g1:comprehension:g1.simple_instruction` | `g1.simple_instruction.md` | `hebrew:g1:g1.simple_instruction` |
| 23 | `hebrew:rich:comprehension:binary_fact_early_g1:tf_science_simple` | `comprehension_binary_fact_early_g1_tf_science_simple.md` | `hebrew:g1:comprehension_binary_fact_early_g1_tf_science_simple` |
| 24 | `hebrew:g1:vocabulary:g1.word_meaning_concrete` | `vocabulary_g1.word_meaning_concrete.md` | `hebrew:g1:vocabulary_g1.word_meaning_concrete` |
| 25 | `hebrew:g1:vocabulary:g1.word_picture` | `g1.word_picture.md` | `hebrew:g1:g1.word_picture` |
| 26 | `hebrew:rich:vocabulary:word_context_early_g1:cloze_morning` | `vocabulary_word_context_early_g1_cloze_morning.md` | `hebrew:g1:vocabulary_word_context_early_g1_cloze_morning` |
| 27 | `hebrew:g1:writing:g1.copy_word` | `g1.copy_word.md` | `hebrew:g1:g1.copy_word` |
| 28 | `hebrew:g1:writing:g1.spell_word_choice` | `g1.spell_word_choice.md` | `hebrew:g1:g1.spell_word_choice` |
| 29 | `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | `writing_spell_word_early_ab_writing_object_riddle.md` | `hebrew:g1:writing_spell_word_early_ab_writing_object_riddle` |
| 30 | `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | `writing_spell_word_early_ab_writing_role_meaning.md` | `hebrew:g1:writing_spell_word_early_ab_writing_role_meaning` |
| 31 | `hebrew:g1:speaking:g1.phrase_appropriateness` | `g1.phrase_appropriateness.md` | `hebrew:g1:g1.phrase_appropriateness` |
| 32 | `hebrew:rich:speaking:social_reply_early_g1:bump_sorry` | `speaking_social_reply_early_g1_bump_sorry.md` | `hebrew:g1:speaking_social_reply_early_g1_bump_sorry` |

---

## 3. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|------:|-------|
| **A** | קריאה — צלילים, אותיות וניקוד | 10 | אותיות, צלילים, הברות, ניקוד, מילים פשוטות |
| **B** | שפה — משפטים ודקדוק קל | 9 | משפט תקין, סימני פיסוק, התאמה קלה |
| **C** | הבנה, אוצר מילים וכתיבה | 11 | משפט אחד, מילה ותמונה, העתקה ואיות |
| **D** | דיבור והבעה | 2 | ביטוי מתאים, סליחה חברתית |

---

## 4. Main Grade 1 Focus (Owner Themes)

| Theme | Covered in pages |
|-------|------------------|
| אותיות | `g1.letters`, `g1.final_letters`, `g1.sound_letter_match` |
| צלילים | `g1.phoneme_awareness`, `g1.rhyme` |
| הברות | `g1.syllables`, `g1.open_close_syllable` |
| ניקוד בסיסי | `g1.basic_niqqud` |
| מילים פשוטות | `g1.simple_words_read`, `reading_word_level_early_g1_*` |
| קריאת משפט קצר | `g1.grammar_wellformed`, `g1.one_sentence_who_what` |
| הבנת משפט אחד | `comprehension_g1.word_meaning_concrete`, `g1.simple_instruction` |
| מילה ותמונה | `g1.word_picture`, `vocabulary_g1.word_meaning_concrete` |
| העתקת מילה | `g1.copy_word` |
| בחירת איות | `g1.spell_word_choice`, spell_word rich pages |
| תגובה חברתית | `speaking_social_reply_early_g1_bump_sorry`, `g1.phrase_appropriateness` |

---

## 5. Excluded from Grade 1 Book

| Exclusion | Reason |
|-----------|--------|
| All Hebrew skills with `minGrade > 1` | Belong to G2+ books |
| Non-`hebrew` subjects | Different learning books |
| Meta / generator-only rows | None exist for Hebrew in spine |

---

## 6. Content Safety (Grade 1)

- Seven sections per page: מה לומדים? → בואו נתרגל!
- No `[DRAFT]` in section bodies (metadata title only)
- No internal `skill_id` / `hebrew:` strings in child-facing bodies
- No `**bold**`, code fences, or tables in section bodies
- Section 5 and Section 6 share the same example context
- Section 7: text-only — "בתרגול תמצאו…" — no practice URLs or CTAs
- Niqqud used in reading examples where needed

---

## 7. Topics Needing Owner Review

| Topic | Question |
|-------|----------|
| Niqqud density | Always show niqqud in G1 book vs gradual reduction? |
| Formal terms | Approve child-facing labels for שם / פועל / תיאור pages |
| `comprehension` vs `vocabulary` word meaning | Two pages — confirm distinct titles approved |
| `binary_fact_early_g1` | "Science simple" framing — approve example sentences |
| Social sorry page | Approve bump/sorry scenario for classroom |
| Book tile title | Confirm ספר עברית — כיתה א׳ |

---

## 8. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/HEBREW_GRADE_1_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/HEBREW_GRADE_1_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/hebrew/g1/drafts/*.md` | ✅ 32 pages |
| Draft README | `docs/learning-book/hebrew/g1/drafts/README.md` | ✅ |
| Manifest | `scripts/lib/hebrew-g1-draft-manifest.mjs` | ✅ |
| Page content | `scripts/lib/hebrew-g1-page-content.mjs` | ✅ |
| Review pack builder | `scripts/build-hebrew-g1-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-hebrew-g1-book-content.mjs` | ✅ |

**Verification:**

```bash
node scripts/verify-hebrew-g1-book-content.mjs
node scripts/build-hebrew-g1-hebrew-review-pack.mjs
```

---

## 9. Next Step (Not Started)

Per-grade owner signoff → runtime registry / reader wiring — **separate task**.

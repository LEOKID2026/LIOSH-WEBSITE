# Grade 3 Hebrew Learning Book — Plan

**Status:** Draft content package (June 2026). All pages `approval_status: draft`. No UI, routes, registry, SQL, commit, push, or deploy.  
**Master scope:** `docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`  
**Book title:** ספר עברית — כיתה ג׳  
**Child-facing subject:** עברית | **Internal key:** `hebrew`

---

## 1. Page Count Reconciliation

| Source | Count |
|--------|------:|
| Master scope plan | 31 |
| `skills.json` (`hebrew`, `minGrade ≤ 3`, `maxGrade ≥ 3`) | **31** |
| Draft files (excl. README) | **31** |

All G3 Hebrew spine rows are `minGrade === 3` and `maxGrade === 3` (no continuing 3–4 band rows at Grade 3 book — those appear in G4).

---

## 2. Map / Rich Overlap — Authoring Decisions

| Pair | Files | Keep separate because |
|------|-------|------------------------|
| **Cause–effect** | `g3.cause_effect.md` + `comprehension_cause_effect_because.md` | Map = concept (גשם → מטריה). Rich = locate כי/בגלל in text |
| **Explicit reading** | `g3.explicit_only.md` + `comprehension_passage_explicit_detail.md` | Map = rule (only written facts). Rich = find explicit detail (דני, שעון) |
| **Verb family** | `g3.binyan_light.md` + `grammar_morphology_binyan_fit.md` | Map = same root, different forms (כתב/מכתב). Rich = pick verb form (קורא) |
| **Inference vs explicit rule** | `g3.explicit_only` vs `comprehension_passage_inference_implied` | Explicit page forbids inventing facts; inference page allows careful clues |

---

## 3. Full Page List (31)

| # | pageId | skill_id | learning_page_id | Title [DRAFT] |
|---|--------|----------|------------------|---------------|
| 1 | `g3.multi_sentence` | `hebrew:g3:reading:g3.multi_sentence` | `hebrew:g3:g3.multi_sentence` | קריאה של כמה משפטים |
| 2 | `g3.genre_tag_info_vs_story` | `hebrew:g3:reading:g3.genre_tag_info_vs_story` | `hebrew:g3:g3.genre_tag_info_vs_story` | מידע או סיפור? |
| 3 | `reading_sentence_read_meaning` | `hebrew:rich:reading:sentence_read:meaning` | `hebrew:g3:reading_sentence_read_meaning` | משפט שלם — מה המשמעות? |
| 4 | `g3.explicit_only` | `hebrew:g3:comprehension:g3.explicit_only` | `hebrew:g3:g3.explicit_only` | רק מה שכתוב בטקסט |
| 5 | `comprehension_passage_explicit_detail` | `hebrew:rich:comprehension:passage_explicit:detail` | `hebrew:g3:comprehension_passage_explicit_detail` | פרטים בטקסט |
| 6 | `g3.cause_effect` | `hebrew:g3:comprehension:g3.cause_effect` | `hebrew:g3:g3.cause_effect` | סיבה ותוצאה — היכרות |
| 7 | `comprehension_cause_effect_because` | `hebrew:rich:comprehension:cause_effect:because` | `hebrew:g3:comprehension_cause_effect_because` | למה? — כי ובגלל |
| 8 | `g3.compare_light` | `hebrew:g3:comprehension:g3.compare_light` | `hebrew:g3:g3.compare_light` | השוואה קלה |
| 9 | `comprehension_passage_inference_implied` | `hebrew:rich:comprehension:passage_inference:implied` | `hebrew:g3:comprehension_passage_inference_implied` | מה משתמע מהטקסט? |
| 10 | `comprehension_completion_context_clue` | `hebrew:rich:comprehension:completion:context_clue` | `hebrew:g3:comprehension_completion_context_clue` | השלמת משפט לפי הקשר |
| 11 | `comprehension_analogy_reasoning_parallel` | `hebrew:rich:comprehension:analogy_reasoning:parallel` | `hebrew:g3:comprehension_analogy_reasoning_parallel` | דומה כמו... |
| 12 | `comprehension_binary_fact_mid_grammar_tf` | `hebrew:rich:comprehension:binary_fact_mid_grammar:tf` | `hebrew:g3:comprehension_binary_fact_mid_grammar_tf` | נכון לפי הטקסט? |
| 13 | `g3.tense_system_intro` | `hebrew:g3:grammar:g3.tense_system_intro` | `hebrew:g3:g3.tense_system_intro` | עבר, הווה ועתיד — היכרות |
| 14 | `g3.connectors` | `hebrew:g3:grammar:g3.connectors` | `hebrew:g3:g3.connectors` | מילות קישור |
| 15 | `g3.binyan_light` | `hebrew:g3:grammar:g3.binyan_light` | `hebrew:g3:g3.binyan_light` | משפחת פעלים — היכרות קלה |
| 16 | `grammar_morphology_binyan_fit` | `hebrew:rich:grammar:morphology:binyan_fit` | `hebrew:g3:grammar_morphology_binyan_fit` | איזו צורת פועל מתאימה? |
| 17 | `grammar_part_of_speech_verb_noun` | `hebrew:rich:grammar:part_of_speech:verb_noun` | `hebrew:g3:grammar_part_of_speech_verb_noun` | שם או פועל? |
| 18 | `grammar_gender_number_plural` | `hebrew:rich:grammar:gender_number:plural` | `hebrew:g3:grammar_gender_number_plural` | רבים ורבות |
| 19 | `grammar_prep_choice_collocation` | `hebrew:rich:grammar:prep_choice:collocation` | `hebrew:g3:grammar_prep_choice_collocation` | מילת יחס מתאימה |
| 20 | `g3.context_meaning` | `hebrew:g3:vocabulary:g3.context_meaning` | `hebrew:g3:g3.context_meaning` | משמעות לפי ההקשר |
| 21 | `g3.word_families` | `hebrew:g3:vocabulary:g3.word_families` | `hebrew:g3:g3.word_families` | משפחות מילים |
| 22 | `vocabulary_synonym_near_meaning` | `hebrew:rich:vocabulary:synonym:near_meaning` | `hebrew:g3:vocabulary_synonym_near_meaning` | מילים דומות במשמעות |
| 23 | `vocabulary_antonym_opposite` | `hebrew:rich:vocabulary:antonym:opposite` | `hebrew:g3:vocabulary_antonym_opposite` | מילים מנוגדות |
| 24 | `vocabulary_semantic_field_education_lexicon` | `hebrew:rich:vocabulary:semantic_field:education_lexicon` | `hebrew:g3:vocabulary_semantic_field_education_lexicon` | מילים מעולם הבית ספר |
| 25 | `vocabulary_precision_best_word` | `hebrew:rich:vocabulary:precision:best_word` | `hebrew:g3:vocabulary_precision_best_word` | המילה הכי מתאימה |
| 26 | `g3.two_three_sentences_structure` | `hebrew:g3:writing:g3.two_three_sentences_structure` | `hebrew:g3:g3.two_three_sentences_structure` | כותבים שני–שלושה משפטים |
| 27 | `g3.connector_use_choice` | `hebrew:g3:writing:g3.connector_use_choice` | `hebrew:g3:g3.connector_use_choice` | מחברים משפטים בכתיבה |
| 28 | `writing_logic_completion_conclusion` | `hebrew:rich:writing:logic_completion:conclusion` | `hebrew:g3:writing_logic_completion_conclusion` | סיום הגיוני |
| 29 | `writing_structured_completion_polite_phrase` | `hebrew:rich:writing:structured_completion:polite_phrase` | `hebrew:g3:writing_structured_completion_polite_phrase` | ביטוי מנומס בכתיבה |
| 30 | `g3.discussion_prompt_choice` | `hebrew:g3:speaking:g3.discussion_prompt_choice` | `hebrew:g3:g3.discussion_prompt_choice` | שיח בכיתה |
| 31 | `speaking_social_reply_mid_help_request` | `hebrew:rich:speaking:social_reply_mid_help:request` | `hebrew:g3:speaking_social_reply_mid_help_request` | בקשת עזרה בנימוס |

---

## 4. Batch Grouping

| Batch | Pages | Focus |
|-------|------:|-------|
| **A** קריאה | 3 | כמה משפטים, מידע/סיפור, משמעות משפט |
| **B** הבנת הנקרא | 9 | מפורש, סיבה, השוואה, הסקה, השלמה |
| **C** דקדוק | 7 | זמנים, קישור, משפחת פועל, יחסים |
| **D** אוצר מילים | 6 | הקשר, משפחות, נרדפות, ניגודיות |
| **E** כתיבה | 4 | 2–3 משפטים, מחברים, סיום |
| **F** שיח | 2 | דיון, בקשת עזרה |

---

## 5. Grade 3 Theme Coverage

| Owner theme | Pages |
|-------------|-------|
| קריאה של כמה משפטים | `g3.multi_sentence`, `reading_sentence_read_meaning` |
| מידע לעומת סיפור | `g3.genre_tag_info_vs_story` |
| סיבה ותוצאה | `g3.cause_effect`, `comprehension_cause_effect_because` |
| השוואה קלה | `g3.compare_light` |
| מפורש והסקה | `g3.explicit_only`, `comprehension_passage_explicit_detail`, `comprehension_passage_inference_implied` |
| מילות קישור | `g3.connectors`, `g3.connector_use_choice` |
| זמנים (היכרות) | `g3.tense_system_intro` |
| בניין/משפחת פועל (קל) | `g3.binyan_light`, `grammar_morphology_binyan_fit` |
| משפחות מילים | `g3.word_families` |
| נרדפות וניגודיות | `vocabulary_synonym_near_meaning`, `vocabulary_antonym_opposite` |
| כתיבת 2–3 משפטים | `g3.two_three_sentences_structure` |
| השלמת משפט | `comprehension_completion_context_clue`, `writing_logic_completion_conclusion` |
| שיח חברתי | `g3.discussion_prompt_choice`, `speaking_social_reply_mid_help_request` |

---

## 6. Topics Needing Owner Review

| Topic | Question |
|-------|----------|
| Overlap pairs (§2) | Approve distinct titles and no merge into single pages |
| `g3.binyan_light` | Approve avoiding heavy בניין terminology |
| `grammar_morphology_binyan_fit` | Approve verb-form examples (קורא/כותב) |
| Inference vs explicit | Approve that inference page allows clues while explicit forbids invention |
| School lexicon field | Approve `vocabulary_semantic_field_education_lexicon` word list |
| Discussion prompts | Approve classroom discussion framing |
| Niqqud in G3 | Reduce niqqud vs keep on hard words only |

---

## 7. Deliverables

| Deliverable | Status |
|-------------|--------|
| `HEBREW_GRADE_3_LEARNING_BOOK_PLAN.md` | ✅ |
| `HEBREW_GRADE_3_HEBREW_REVIEW_PACK.md` | ✅ generated |
| `hebrew/g3/drafts/*.md` (31) | ✅ |
| `hebrew/g3/drafts/README.md` | ✅ |
| `scripts/lib/hebrew-g3-draft-manifest.mjs` | ✅ |
| `scripts/lib/hebrew-g3-page-content.mjs` | ✅ |
| `scripts/build-hebrew-g3-hebrew-review-pack.mjs` | ✅ |
| `scripts/verify-hebrew-g3-book-content.mjs` | ✅ |

```bash
node scripts/verify-hebrew-g3-book-content.mjs
node scripts/build-hebrew-g3-hebrew-review-pack.mjs
```

---

## 8. Content Safety

- `age_band: grades_3_4`
- Seven Hebrew sections; no `[DRAFT]` in bodies
- No internal keys in child-facing text
- §5/§6 shared context per page
- §7 text-only — no practice URLs

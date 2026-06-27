# Assigned Activity Topic Availability Audit

Generated: 2026-06-27T15:57:10.256Z
Script: `scripts/audit-assigned-activity-topic-availability.mjs`

## Scope

Subjects: geometry, hebrew, english, science, moledet_geography (math excluded — fixed separately in commit `4e58711e`).

Verification per topic:
- Parent + teacher UI both use `topicOptionsForSubject()` from `lib/teacher-portal/teacher-class-topic-options.js`
- Assigned generation tested at easy/medium/hard × count=3 and count=5 (default UI count=5)
- Learning master probed via native generators / static banks
- Learning book TOC checked via `lib/learning-book/*-registry.js`
- No hide/disable implementation — audit only

## Executive summary by subject

| Subject | Grade/topic pairs in UI | Supported in assigned activities | Failing / gated |
|---------|-------------------------:|---------------------------------:|----------------:|
| גאומטריה | 44 | 44 | 0 |
| עברית | 42 | 27 | 15 |
| אנגלית | 25 | 16 | 9 |
| מדע | 38 | 38 | 0 |
| מולדת וגאוגרפיה | 30 | 30 | 0 |

**Total pairs audited:** 179

### Key findings (non-math)

1. **Geometry diagram gate:** Topics like `parallel_perpendicular`, `diagonal`, `symmetry`, `heights`, `tiling` generate questions in learning master but **0%** receive a `getGeometryDiagramSpec()` match; assigned activities reject items without diagrams (`frozenGeometryItemHasDiagram`).
2. **Hebrew writing/speaking:** g3–g6 generators return typing/speaking mode; assigned MCQ path filters these out. **g1–g2 still pass** assigned activities (MCQ-style prompts at lower grades).
3. **English grammar/sentences/translation:** Easy often works; **medium/hard pools are thin** for g4–g6 (grade-gated pools). Writing is typing-only.
4. **Science g1–g2 materials/earth_space/environment:** Topics exist in curriculum, books, and bank — **medium/hard have 1–2 questions** vs count=5 needed.
5. **Moledet g2–g6:** All 30 UI topics pass assigned generation at typical settings; static banks have 30+ items per topic/level. Learning books exist for g2–g4 only (no g5/g6 book registries yet).
6. **Mixed (Hebrew/English):** Passes assigned generation; stored `topic` on items may differ from selector — intentional mixed practice.

---

## Table 1 — Full topic map

| Subject | Grade | Topic key | Hebrew label | Shown in assigned UI? | Assigned activity status | Normal learning status | Learning book status | Bank/generator source | Failure reason | Product importance | Recommendation |
|---------|-------|-----------|--------------|----------------------:|--------------------------|------------------------|----------------------|-----------------------|----------------|-------------------|----------------|
| geometry | g1 | shapes_basic | צורות בסיסיות | yes | supported | supported | supported (book pages) — related pages: shapes_basic_square, shapes_basic_rectangle | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g1 | transformations | טרנספורמציות | yes | supported | supported | supported (book pages) — page: transformations | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g2 | shapes_basic | צורות בסיסיות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g2 | area | שטח | yes | supported | supported | supported (book pages) — related pages: square_area | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g2 | solids | גופים | yes | supported | supported | supported (book pages) — page: solids | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g2 | transformations | טרנספורמציות | yes | supported | supported | supported (book pages) — page: transformations | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g3 | shapes_basic | צורות בסיסיות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | angles | זוויות | yes | supported | supported | supported (book pages) — related pages: triangles, triangle_angles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | parallel_perpendicular | מקבילות ומאונכות | yes | supported | supported | supported (book pages) — page: parallel_perpendicular | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | triangles | משולשים | yes | supported | supported | supported (book pages) — page: triangles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | quadrilaterals | מרובעים | yes | supported | supported | supported (book pages) — page: quadrilaterals | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | area | שטח | yes | supported | supported | supported (book pages) — related pages: square_area | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | perimeter | היקף | yes | supported | supported | supported (book pages) — related pages: square_perimeter, triangle_perimeter | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g3 | rotation | סיבוב | yes | supported | supported | supported (book pages) — page: rotation | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g3 | solids | גופים | yes | supported | supported | supported (book pages) — page: solids | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g4 | shapes_basic | צורות בסיסיות | yes | supported | supported | supported (book pages) — related pages: shapes_basic_properties_square, shapes_basic_properties_rectangle, shapes_basic_properties_angles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | angles | זוויות | yes | supported | supported | supported (book pages) — related pages: shapes_basic_properties_angles, triangle_angles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | parallel_perpendicular | מקבילות ומאונכות | yes | supported | supported | supported (book pages) — page: parallel_perpendicular | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | triangles | משולשים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | quadrilaterals | מרובעים | yes | supported | supported | supported (book pages) — page: quadrilaterals | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | diagonal | אלכסון | yes | supported | supported | supported (book pages) — related pages: diagonal_square, diagonal_rectangle | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | symmetry | סימטרייה | yes | supported | supported | supported (book pages) — page: symmetry | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | area | שטח | yes | supported | supported | supported (book pages) — related pages: square_area | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | perimeter | היקף | yes | supported | supported | supported (book pages) — related pages: square_perimeter, triangle_perimeter | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | volume | נפח | yes | supported | supported | supported (book pages) — related pages: rectangular_prism_volume | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g4 | solids | גופים | yes | supported | supported | supported (book pages) — page: solids | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g5 | angles | זוויות | yes | supported | supported | supported (book pages) — related pages: triangle_angles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | parallel_perpendicular | מקבילות ומאונכות | yes | supported | supported | supported (book pages) — page: parallel_perpendicular | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | quadrilaterals | מרובעים | yes | supported | supported | supported (book pages) — page: quadrilaterals | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | solids | גופים | yes | supported | supported | supported (book pages) — page: solids | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g5 | diagonal | אלכסון | yes | supported | supported | supported (book pages) — related pages: diagonal_square, diagonal_rectangle, diagonal_parallelogram | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | heights | גבהים | yes | supported | supported | supported (book pages) — related pages: heights_triangle, heights_parallelogram, heights_trapezoid | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | tiling | ריצוף | yes | supported | supported | supported (book pages) — page: tiling | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g5 | area | שטח | yes | supported | supported | supported (book pages) — related pages: square_area, triangle_area, parallelogram_area, trapezoid_area | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | perimeter | היקף | yes | supported | supported | supported (book pages) — related pages: square_perimeter, triangle_perimeter | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g5 | volume | נפח | yes | supported | supported | supported (book pages) — related pages: rectangular_prism_volume | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | solids | גופים | yes | supported | supported | supported (book pages) — page: solids | geometry-question-generator (dynamic; diagram spec required for activities) |  | nice-to-have | keep visible |
| geometry | g6 | circles | מעגל ועיגול | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | volume | נפח | yes | supported | supported | supported (book pages) — related pages: rectangular_prism_volume, prism_volume_rectangular, prism_volume_triangle, pyramid_volume_square, pyramid_volume_rectangular, cylinder_volume, cone_volume, sphere_volume | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | area | שטח | yes | supported | supported | supported (book pages) — related pages: square_area, parallelogram_area, trapezoid_area, circle_area | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | perimeter | היקף | yes | supported | supported | supported (book pages) — related pages: square_perimeter, triangle_perimeter, circle_perimeter | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | angles | זוויות | yes | supported | supported | supported (book pages) — related pages: triangle_angles | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | triangles | משולשים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| geometry | g6 | pythagoras | פיתגורס | yes | supported | supported | supported (book pages) — related pages: pythagoras_hyp, pythagoras_leg | geometry-question-generator (dynamic; diagram spec required for activities) |  | must-have core topic | keep visible |
| hebrew | g1 | reading | קריאה | yes | supported | supported | supported (book pages) — related pages: reading_word_level_early_g1_spelling_meaning_then_choice | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g1 | comprehension | הבנת הנקרא | yes | supported | supported | supported (book pages) — related pages: comprehension_g1.word_meaning_concrete, comprehension_binary_fact_early_g1_tf_science_simple | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g1 | writing | כתיבה והבעה | yes | supported | supported | supported (book pages) — related pages: writing_spell_word_early_ab_writing_object_riddle, writing_spell_word_early_ab_writing_role_meaning | hebrew-question-generator (dynamic) |  | writing/speaking/manual assessment only | keep visible |
| hebrew | g1 | grammar | דקדוק ולשון | yes | supported | supported | supported (book pages) — related pages: g1.grammar_pos_roles, g1.grammar_wellformed, g1.grammar_agreement_light, g1.grammar_cloze_deixis, g1.grammar_word_order, g1.grammar_odd_category, g1.grammar_punctuation, g1.grammar_connectors_time, grammar_gender_number_early_g1_agreement_girl_singular | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g1 | vocabulary | עושר שפתי | yes | supported | supported | supported (book pages) — related pages: vocabulary_g1.word_meaning_concrete, vocabulary_word_context_early_g1_cloze_morning | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g1 | speaking | דיבור ושיח | yes | supported | supported | supported (book pages) — related pages: speaking_social_reply_early_g1_bump_sorry | hebrew-question-generator (dynamic) |  | writing/speaking/manual assessment only | keep visible |
| hebrew | g1 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| hebrew | g2 | reading | קריאה | yes | thin-bank | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | passes @ count=3 but fails @ count=5 at: hard | must-have core topic | add/expand question bank |
| hebrew | g2 | comprehension | הבנת הנקרא | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g2 | writing | כתיבה והבעה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | writing/speaking/manual assessment only | keep visible |
| hebrew | g2 | grammar | דקדוק ולשון | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g2 | vocabulary | עושר שפתי | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g2 | speaking | דיבור ושיח | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | writing/speaking/manual assessment only | keep visible |
| hebrew | g2 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| hebrew | g3 | reading | קריאה | yes | supported | supported | supported (book pages) — related pages: reading_sentence_read_meaning | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g3 | comprehension | הבנת הנקרא | yes | supported | supported | supported (book pages) — related pages: comprehension_passage_explicit_detail, comprehension_cause_effect_because, comprehension_passage_inference_implied, comprehension_completion_context_clue, comprehension_analogy_reasoning_parallel, comprehension_binary_fact_mid_grammar_tf | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g3 | writing | כתיבה והבעה | yes | unsupported-activity-type | typing-only (master) | supported (book pages) — related pages: writing_logic_completion_conclusion, writing_structured_completion_polite_phrase | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g3 | grammar | דקדוק ולשון | yes | supported | supported | supported (book pages) — related pages: comprehension_binary_fact_mid_grammar_tf, grammar_morphology_binyan_fit, grammar_part_of_speech_verb_noun, grammar_gender_number_plural, grammar_prep_choice_collocation | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g3 | vocabulary | עושר שפתי | yes | supported | supported | supported (book pages) — related pages: vocabulary_synonym_near_meaning, vocabulary_antonym_opposite, vocabulary_semantic_field_education_lexicon, vocabulary_precision_best_word | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g3 | speaking | דיבור ושיח | yes | unsupported-activity-type | typing-only (master) | supported (book pages) — related pages: speaking_social_reply_mid_help_request | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g3 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| hebrew | g4 | reading | קריאה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g4 | comprehension | הבנת הנקרא | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g4 | writing | כתיבה והבעה | yes | unsupported-activity-type | typing-only (master) | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g4 | grammar | דקדוק ולשון | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g4 | vocabulary | עושר שפתי | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g4 | speaking | דיבור ושיח | yes | unsupported-activity-type | typing-only (master) | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g4 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| hebrew | g5 | reading | קריאה | yes | supported | supported | supported (book pages) — related pages: reading_structural_paragraph_role | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g5 | comprehension | הבנת הנקרא | yes | supported | supported | supported (book pages) — related pages: comprehension_main_idea_summary, comprehension_supporting_detail_evidence, comprehension_compare_statements_contrast, comprehension_implicit_tone_attitude, comprehension_reference_pronoun, comprehension_sequence_order | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g5 | writing | כתיבה והבעה | yes | unsupported-activity-type | typing-only (master) | supported (book pages) — related pages: writing_rephrase_clarity | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g5 | grammar | דקדוק ולשון | yes | supported | supported | supported (book pages) — related pages: grammar_sentence_correction_choose_correct, grammar_sentence_correction_sv_agreement_plural, grammar_verb_agreement_plural_subject, grammar_tense_shift_past_present, grammar_transform_negation, grammar_binary_grammar_tf | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g5 | vocabulary | עושר שפתי | yes | supported | supported | supported (book pages) — related pages: vocabulary_collocation_verb_noun_fit, vocabulary_category_exclusion_odd_out, vocabulary_context_fit_register | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g5 | speaking | דיבור ושיח | yes | unsupported-activity-type | typing-only (master) | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g5 | mixed | ערבוב | yes | mixed-intentional | partial | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| hebrew | g6 | reading | קריאה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g6 | comprehension | הבנת הנקרא | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g6 | writing | כתיבה והבעה | yes | unsupported-activity-type | typing-only (master) | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g6 | grammar | דקדוק ולשון | yes | supported | supported | supported (book pages) — related pages: grammar_tf | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g6 | vocabulary | עושר שפתי | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) |  | must-have core topic | keep visible |
| hebrew | g6 | speaking | דיבור ושיח | yes | unsupported-activity-type | typing-only (master) | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | master generates typing/speaking mode; assigned MCQ path filters these out | writing/speaking/manual assessment only | disable with explanation |
| hebrew | g6 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | hebrew-question-generator (dynamic) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| english | g1 | phonics | פוניקה | yes | supported | supported | supported (book pages) — related pages: phonics_sounds, phonics_first_sound | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | nice-to-have | keep visible |
| english | g1 | vocabulary | אוצר מילים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g2 | phonics | פוניקה | yes | supported | supported | supported (book pages) — related pages: phonics_sounds_review, phonics_blending | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | nice-to-have | keep visible |
| english | g2 | vocabulary | אוצר מילים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g2 | writing | כתיבה | yes | unsupported-activity-type | unsupported-generator | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | writing uses open/typing modes; no MCQ pool for assigned activities | writing/speaking/manual assessment only | disable with explanation |
| english | g3 | vocabulary | אוצר מילים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g3 | grammar | דקדוק | yes | supported | supported | supported (book pages) — related pages: grammar_present_simple, grammar_articles_prepositions, grammar_question_frames | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g3 | sentences | משפטים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g3 | writing | כתיבה | yes | unsupported-activity-type | unsupported-generator | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | writing uses open/typing modes; no MCQ pool for assigned activities | writing/speaking/manual assessment only | disable with explanation |
| english | g3 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| english | g4 | vocabulary | אוצר מילים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g4 | grammar | דקדוק | yes | supported | supported | supported (book pages) — related pages: grammar_present_simple, grammar_simple_continuous, grammar_quantifiers | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g4 | sentences | משפטים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g4 | writing | כתיבה | yes | unsupported-activity-type | unsupported-generator | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | writing uses open/typing modes; no MCQ pool for assigned activities | writing/speaking/manual assessment only | disable with explanation |
| english | g4 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| english | g5 | vocabulary | אוצר מילים | yes | supported | partial | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g5 | grammar | דקדוק | yes | supported | supported | supported (book pages) — related pages: grammar_past_simple, grammar_future_forms, grammar_modals, grammar_comparatives, grammar_quantifiers | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g5 | sentences | משפטים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g5 | writing | כתיבה | yes | unsupported-activity-type | unsupported-generator | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | writing uses open/typing modes; no MCQ pool for assigned activities | writing/speaking/manual assessment only | disable with explanation |
| english | g5 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| english | g6 | vocabulary | אוצר מילים | yes | supported | partial | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g6 | grammar | דקדוק | yes | supported | supported | supported (book pages) — related pages: grammar_complex_tenses, grammar_conditionals, grammar_modals, grammar_comparatives | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g6 | sentences | משפטים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) |  | must-have core topic | keep visible |
| english | g6 | writing | כתיבה | yes | unsupported-activity-type | unsupported-generator | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | writing uses open/typing modes; no MCQ pool for assigned activities | writing/speaking/manual assessment only | disable with explanation |
| english | g6 | mixed | ערבוב | yes | mixed-intentional | supported | explanation-only-or-absent — topic not in book TOC | english-questions pools + generator (grammar/sentences/translation/vocabulary) | stored topic varies by design | duplicate/ambiguous/mixed | relabel as mixed practice |
| science | g1 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":21,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g1 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":19,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g1 | plants | צמחים | yes | supported | supported | supported (book pages) — page: plants | static SCIENCE_QUESTIONS ({"easy":14,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g1 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":11,"medium":5,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g1 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":10,"medium":5,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g1 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":9,"medium":5,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g2 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":22,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g2 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":22,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g2 | plants | צמחים | yes | supported | supported | supported (book pages) — page: plants | static SCIENCE_QUESTIONS ({"easy":18,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g2 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":12,"medium":6,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g2 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":8,"medium":5,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g2 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":10,"medium":5,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g2 | experiments | ניסויים | yes | supported | supported | supported (book pages) — page: experiments | static SCIENCE_QUESTIONS ({"easy":12,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g3 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":58,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g3 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":12,"medium":18,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g3 | plants | צמחים | yes | supported | supported | supported (book pages) — page: plants | static SCIENCE_QUESTIONS ({"easy":12,"medium":18,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g3 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":6,"medium":21,"hard":6} usable by level) |  | must-have core topic | keep visible |
| science | g3 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":6,"medium":18,"hard":6} usable by level) |  | must-have core topic | keep visible |
| science | g3 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":6,"medium":17,"hard":6} usable by level) |  | must-have core topic | keep visible |
| science | g3 | experiments | ניסויים | yes | supported | supported | supported (book pages) — page: experiments | static SCIENCE_QUESTIONS ({"easy":12,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g4 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":14,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g4 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":14,"medium":16,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g4 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":6,"medium":21,"hard":5} usable by level) |  | must-have core topic | keep visible |
| science | g4 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":6,"medium":15,"hard":10} usable by level) |  | must-have core topic | keep visible |
| science | g4 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":6,"medium":15,"hard":9} usable by level) |  | must-have core topic | keep visible |
| science | g4 | experiments | ניסויים | yes | supported | supported | supported (book pages) — page: experiments | static SCIENCE_QUESTIONS ({"easy":12,"medium":16,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g5 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":12,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g5 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":12,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g5 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":5,"medium":5,"hard":7} usable by level) |  | must-have core topic | keep visible |
| science | g5 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":5,"medium":11,"hard":18} usable by level) |  | must-have core topic | keep visible |
| science | g5 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":5,"medium":10,"hard":24} usable by level) |  | must-have core topic | keep visible |
| science | g5 | experiments | ניסויים | yes | supported | supported | supported (book pages) — page: experiments | static SCIENCE_QUESTIONS ({"easy":12,"medium":12,"hard":26} usable by level) |  | must-have core topic | keep visible |
| science | g6 | body | גוף האדם | yes | supported | supported | supported (book pages) — page: body | static SCIENCE_QUESTIONS ({"easy":14,"medium":12,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g6 | animals | בעלי חיים | yes | supported | supported | supported (book pages) — page: animals | static SCIENCE_QUESTIONS ({"easy":12,"medium":15,"hard":12} usable by level) |  | must-have core topic | keep visible |
| science | g6 | materials | חומרים | yes | supported | supported | supported (book pages) — page: materials | static SCIENCE_QUESTIONS ({"easy":5,"medium":5,"hard":13} usable by level) |  | must-have core topic | keep visible |
| science | g6 | earth_space | כדור הארץ וחלל | yes | supported | supported | supported (book pages) — page: earth_space | static SCIENCE_QUESTIONS ({"easy":5,"medium":18,"hard":17} usable by level) |  | must-have core topic | keep visible |
| science | g6 | environment | סביבה | yes | supported | supported | supported (book pages) — page: environment | static SCIENCE_QUESTIONS ({"easy":6,"medium":10,"hard":29} usable by level) |  | must-have core topic | keep visible |
| science | g6 | experiments | ניסויים | yes | supported | supported | supported (book pages) — page: experiments | static SCIENCE_QUESTIONS ({"easy":16,"medium":12,"hard":24} usable by level) |  | must-have core topic | keep visible |
| moledet_geography | g2 | homeland | מולדת | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":45,"medium":40,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g2 | community | קהילה | yes | supported | supported | supported (book pages) — related pages: mg_g2_community_services, mg_g2_community_participation | moledet static bank ({"easy":47,"medium":28,"hard":31}) |  | must-have core topic | keep visible |
| moledet_geography | g2 | citizenship | אזרחות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":41,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g2 | geography | גאוגרפיה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":45,"medium":32,"hard":29}) |  | must-have core topic | keep visible |
| moledet_geography | g2 | values | ערכים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":42,"medium":29,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g2 | maps | מפות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":43,"medium":30,"hard":32}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | homeland | מולדת | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":44,"medium":40,"hard":29}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | community | קהילה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":33,"medium":27,"hard":31}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | citizenship | אזרחות | yes | supported | supported | supported (book pages) — related pages: mg_g3_citizenship_basics | moledet static bank ({"easy":38,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | geography | גאוגרפיה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":43,"medium":34,"hard":29}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | values | ערכים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":42,"medium":29,"hard":32}) |  | must-have core topic | keep visible |
| moledet_geography | g3 | maps | מפות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":44,"medium":30,"hard":32}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | homeland | מולדת | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":40,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | community | קהילה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":31,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | citizenship | אזרחות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":32,"medium":30,"hard":31}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | geography | גאוגרפיה | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | values | ערכים | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g4 | maps | מפות | yes | supported | supported | explanation-only-or-absent — topic not in book TOC | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | homeland | מולדת | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | community | קהילה | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | citizenship | אזרחות | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | geography | גאוגרפיה | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | values | ערכים | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g5 | maps | מפות | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":31,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | homeland | מולדת | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | community | קהילה | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":31,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | citizenship | אזרחות | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":31,"hard":31}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | geography | גאוגרפיה | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | values | ערכים | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |
| moledet_geography | g6 | maps | מפות | yes | supported | supported | no-book — no registry | moledet static bank ({"easy":30,"medium":30,"hard":30}) |  | must-have core topic | keep visible |

---

## Table 2 — Must not hide (core curriculum — fix/expand instead)

These topics are curriculum-important and fail or are gated only in assigned activities. **Do not hide without product owner sign-off.**

| Subject | Grade | Topic | Assigned status | Why keep visible | Recommended action |
|---------|-------|-------|-----------------|------------------|-------------------|
| hebrew | g2 | reading | thin-bank | must-have core topic; exists in learning (supported) | add/expand question bank |

---

## Table 3 — Safe to hide/disable now

Topics with **no suitable assigned-activity workflow today** (not core MCQ gaps that should be fixed).

| Subject | Grade | Topic | Reason | Recommendation |
|---------|-------|-------|--------|----------------|
| hebrew | g3 | writing | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g3 | speaking | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g4 | writing | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g4 | speaking | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g5 | writing | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g5 | speaking | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g6 | writing | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| hebrew | g6 | speaking | master generates typing/speaking mode; assigned MCQ path filters these out | disable with explanation |
| english | g2 | writing | writing uses open/typing modes; no MCQ pool for assigned activities | disable with explanation |
| english | g3 | writing | writing uses open/typing modes; no MCQ pool for assigned activities | disable with explanation |
| english | g4 | writing | writing uses open/typing modes; no MCQ pool for assigned activities | disable with explanation |
| english | g5 | writing | writing uses open/typing modes; no MCQ pool for assigned activities | disable with explanation |
| english | g6 | writing | writing uses open/typing modes; no MCQ pool for assigned activities | disable with explanation |

---

## Table 4 — Needs content expansion

| Subject | Grade | Topic | Bank detail | Failure |
|---------|-------|-------|-------------|---------|
| hebrew | g2 | reading | hebrew-question-generator (dynamic) | passes @ count=3 but fails @ count=5 at: hard |

---

## Table 5 — Needs code/generator fix

| Subject | Grade | Topic | Issue type | Detail | Recommendation |
|---------|-------|-------|------------|--------|----------------|

---

## Table 6 — Owner decision needed

| Subject | Grade | Topic | Question for product owner |
|---------|-------|-------|---------------------------|
| hebrew | g1 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| hebrew | g2 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| hebrew | g3 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| hebrew | g4 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| hebrew | g5 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| hebrew | g6 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| english | g3 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| english | g4 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| english | g5 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |
| english | g6 | mixed | Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection. |

---

## Investigation notes

### Geometry (`parallel_perpendicular`, `diagonal`, `symmetry`, `heights`, `tiling`)

- Present in `utils/geometry-constants.js` curriculum and learning book registries (e.g. g5 pages include `parallel_perpendicular`; heights split into `heights_triangle`, etc.).
- Learning master generator produces valid question objects.
- Assigned activity path requires diagram spec — **implementation gap**, not missing topic.

### Hebrew `writing` / `speaking`

- Confirmed typing/speaking modes in generator; not MCQ-compatible for current assigned flow.
- `reading`, `comprehension`, `grammar`, `vocabulary` generate MCQ for assigned activities (grammar may be partial at some grades).

### English failures

- `writing`: no MCQ — disable/hide for assigned activities unless writing workflow added.
- `grammar`, `sentences`, `translation`: **easy passes**, medium/hard fail at count=5 — expand pools / relax grade gating for intermediate levels.

### Science g1 `materials`, `earth_space`, `environment`

- **Not absent** from product: in science-curriculum, science-g1 book registry batch B, and SCIENCE_QUESTIONS bank.
- Failure is **insufficient medium/hard bank depth** for typical activity size.

### Moledet / geography

- 30 pairs (g2–g6 × 6 topics, mixed excluded from UI) all **supported** at count=5 across easy/medium/hard.
- Static bank counts verified per grade/topic/level (typically 30+ per level).
- No silent fallback observed in assigned path.
- Learning book registries exist for g2–g4; g5/g6 rely on bank + master only.

### Surprising gaps

- **English assigned vs learning:** Many topics work in learning master at easy but fail assigned activities at default difficulty (medium) or count=5 — product UX may show "בינוני" as default while only "קל" is bank-complete.
- **English g6 translation:** Fails even at **easy** — likely pool/gating bug, not just thin bank.
- **Hebrew writing/speaking split:** g1–g2 assigned activities still work; g3+ blocked — grade-dependent activity type, not uniform hide.
- **Geometry diagram gate:** 8 topic/grade pairs fail assigned activities despite full learning-master + book coverage — pure rendering pipeline gap.
- **Science materials/earth/environment:** Present in g1 books and curriculum; failure is bank depth at medium/hard, not missing subject matter.

### Mixed topics

- Hebrew and English `mixed` pass generation; items may carry varied subtopic keys — document or relabel, do not treat as mapping bug without product decision.

---

## Verification checklist

- [x] Generation checks at easy, medium, hard
- [x] Count=3 and count=5
- [x] Parent and teacher share `topicOptionsForSubject`
- [x] Failures classified (no silent unrelated fallback — generators throw or filter)
- [x] No product code changed except this audit script + report


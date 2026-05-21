/**
 * P0 Hebrew rich-pool diagnostic metadata (non-spelling topics only).
 * Mutates pool rows in place — no stem/answer changes.
 */

/** @typedef {{ diagnosticSkillId: string, conceptTag: string, expectedErrorTags: string[], probePower?: string }} RichDiagContract */

/** @type {Record<string, RichDiagContract>} */
const BY_PATTERN = {
  passage_explicit: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "explicit_detail",
    expectedErrorTags: ["explicit_detail_error", "detail_recall_error"],
  },
  passage_inference: {
    diagnosticSkillId: "he_comp_inference_intro",
    conceptTag: "implied",
    expectedErrorTags: ["inference_error", "comprehension_gap"],
  },
  sequence: {
    diagnosticSkillId: "he_comp_sequence_events",
    conceptTag: "event_order",
    expectedErrorTags: ["sequence_error", "comprehension_gap"],
  },
  reference: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "pronoun_reference",
    expectedErrorTags: ["explicit_detail_error", "reference_resolution_error"],
  },
  main_idea: {
    diagnosticSkillId: "he_comp_main_idea",
    conceptTag: "gist_summary",
    expectedErrorTags: ["main_idea_error", "detail_vs_gist_error"],
  },
  cause_effect: {
    diagnosticSkillId: "he_comp_cause_effect",
    conceptTag: "because",
    expectedErrorTags: ["cause_effect_error", "reversed_cause_error"],
  },
  compare_statements: {
    diagnosticSkillId: "he_comp_inference_intro",
    conceptTag: "contrast_compare",
    expectedErrorTags: ["inference_error", "comparison_error"],
  },
  completion: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "context_clue",
    expectedErrorTags: ["completion_error", "context_fit_error"],
  },
  binary_fact_early_g1: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "explicit_fact_g1",
    expectedErrorTags: ["explicit_detail_error", "detail_recall_error"],
  },
  binary_fact_early_g2: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "where_from_sentence",
    expectedErrorTags: ["explicit_detail_error", "detail_recall_error"],
  },
  binary_fact_mid_grammar: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "grammar_fact_check",
    expectedErrorTags: ["explicit_detail_error", "grammar_error"],
  },
  implicit_tone: {
    diagnosticSkillId: "he_comp_inference_intro",
    conceptTag: "implied_tone",
    expectedErrorTags: ["inference_error", "tone_misread_error"],
  },
  supporting_detail: {
    diagnosticSkillId: "he_comp_explicit_detail",
    conceptTag: "supporting_fact",
    expectedErrorTags: ["explicit_detail_error", "detail_recall_error"],
  },
  analogy_reasoning: {
    diagnosticSkillId: "he_comp_inference_intro",
    conceptTag: "analogy",
    expectedErrorTags: ["inference_error", "analogy_mapping_error"],
  },
  gender_number_early_g1: {
    diagnosticSkillId: "he_gram_gender_number",
    conceptTag: "agreement_girl_singular",
    expectedErrorTags: ["gender_number_error", "agreement_error"],
  },
  gender_number_early_g2: {
    diagnosticSkillId: "he_gram_gender_number",
    conceptTag: "agreement_boy_plural",
    expectedErrorTags: ["gender_number_error", "agreement_error"],
  },
  gender_number: {
    diagnosticSkillId: "he_gram_gender_number",
    conceptTag: "plural_agreement",
    expectedErrorTags: ["gender_number_error", "agreement_error"],
  },
  tense_shift: {
    diagnosticSkillId: "he_gram_agreement",
    conceptTag: "past_present",
    expectedErrorTags: ["agreement_error", "tense_mismatch_error"],
  },
  sentence_correction: {
    diagnosticSkillId: "he_gram_sentence_fix",
    conceptTag: "choose_correct",
    expectedErrorTags: ["sentence_fix_error", "grammar_error"],
  },
  prep_choice: {
    diagnosticSkillId: "he_gram_word_order",
    conceptTag: "preposition",
    expectedErrorTags: ["word_order_error", "prep_choice_error"],
  },
  transform: {
    diagnosticSkillId: "he_gram_sentence_fix",
    conceptTag: "negation",
    expectedErrorTags: ["sentence_fix_error", "grammar_error"],
  },
  part_of_speech: {
    diagnosticSkillId: "he_gram_word_order",
    conceptTag: "pos_label",
    expectedErrorTags: ["grammar_error", "word_order_error"],
  },
  binary_grammar: {
    diagnosticSkillId: "he_gram_agreement",
    conceptTag: "plural_suffix",
    expectedErrorTags: ["agreement_error", "grammar_error"],
  },
  morphology: {
    diagnosticSkillId: "he_gram_agreement",
    conceptTag: "verb_form",
    expectedErrorTags: ["agreement_error", "grammar_error"],
  },
  verb_agreement: {
    diagnosticSkillId: "he_gram_agreement",
    conceptTag: "subject_verb",
    expectedErrorTags: ["agreement_error", "grammar_error"],
  },
  synonym: {
    diagnosticSkillId: "he_vocab_synonym",
    conceptTag: "near_synonym",
    expectedErrorTags: ["synonym_confusion", "vocabulary_confusion"],
  },
  antonym: {
    diagnosticSkillId: "he_vocab_antonym",
    conceptTag: "opposite",
    expectedErrorTags: ["antonym_confusion", "vocabulary_confusion"],
  },
  context_fit: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "formal_register",
    expectedErrorTags: ["context_fit_error", "vocabulary_confusion"],
  },
  category_exclusion: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "odd_category",
    expectedErrorTags: ["context_fit_error", "category_exclusion_error"],
  },
  word_context_early_g1: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "cloze_thirst",
    expectedErrorTags: ["context_fit_error", "vocabulary_confusion"],
  },
  word_context_early_g2: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "cloze_school_bag",
    expectedErrorTags: ["context_fit_error", "vocabulary_confusion"],
  },
  precision: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "precise_word",
    expectedErrorTags: ["context_fit_error", "vocabulary_confusion"],
  },
  collocation: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "natural_phrase",
    expectedErrorTags: ["context_fit_error", "collocation_error"],
  },
  semantic_field: {
    diagnosticSkillId: "he_vocab_context_fit",
    conceptTag: "school_domain",
    expectedErrorTags: ["context_fit_error", "semantic_field_error"],
  },
  word_level_early_g1: {
    diagnosticSkillId: "he_read_decoding",
    conceptTag: "spelling_choice_g1",
    expectedErrorTags: ["decoding_error", "careless_error"],
  },
  word_level_early_g2: {
    diagnosticSkillId: "he_read_decoding",
    conceptTag: "spelling_choice_g2",
    expectedErrorTags: ["decoding_error", "careless_error"],
  },
  sentence_read: {
    diagnosticSkillId: "he_read_sentence",
    conceptTag: "sentence_meaning",
    expectedErrorTags: ["decoding_error", "comprehension_gap"],
  },
  structural: {
    diagnosticSkillId: "he_read_fluency_basic",
    conceptTag: "paragraph_role",
    expectedErrorTags: ["main_idea_error", "structural_role_error"],
  },
  spell_word_early_ab_writing: {
    diagnosticSkillId: "he_spell_word_form",
    conceptTag: "orthography_choice",
    expectedErrorTags: ["spelling_pattern_error", "niqqud_error", "careless_error"],
  },
  structured_completion: {
    diagnosticSkillId: "he_spell_register_choice",
    conceptTag: "formal_register",
    expectedErrorTags: ["register_error", "completion_error", "careless_error"],
  },
  rephrase: {
    diagnosticSkillId: "he_spell_sentence_clarity",
    conceptTag: "clarity_rewrite",
    expectedErrorTags: ["word_order_error", "sentence_fix_error", "careless_error"],
  },
  logic_completion: {
    diagnosticSkillId: "he_spell_logic_completion",
    conceptTag: "conclusion_link",
    expectedErrorTags: ["completion_error", "inference_error", "careless_error"],
  },
};

const SKIP_TOPICS = new Set(["spelling", "speaking"]);

/** P1: extend `levels` only where missing cells match existing row semantics (no stem changes). */
const P1_LEVEL_EXTENSIONS = {
  binary_fact_early_g1: ["medium", "hard"],
  binary_fact_early_g2: ["hard"],
  gender_number_early_g1: ["medium", "hard"],
  gender_number_early_g2: ["hard"],
  word_context_early_g1: ["medium", "hard"],
  word_context_early_g2: ["hard"],
  word_level_early_g1: ["medium", "hard"],
  word_level_early_g2: ["hard"],
  sentence_read: ["easy", "hard"],
  tense_shift: ["easy"],
  verb_agreement: ["easy"],
  transform: ["easy"],
  context_fit: ["easy"],
  category_exclusion: ["easy"],
  structural: ["easy"],
  spell_word_early_ab_writing: ["hard"],
  structured_completion: ["hard"],
  logic_completion: ["easy", "hard"],
  rephrase: ["easy"],
};

/**
 * @param {Record<string, unknown>[]} pool
 */
export function applyHebrewRichPoolLevelEligibilityP1(pool) {
  for (const row of pool) {
    const pf = String(row.patternFamily || "");
    const extra = P1_LEVEL_EXTENSIONS[pf];
    if (!extra?.length || !Array.isArray(row.levels)) continue;
    const merged = [...new Set([...row.levels.map(String), ...extra])];
    row.levels = merged;
  }
}

/**
 * P1: widen grade eligibility for basic rows that apply across upper primary (no copy changes).
 * @param {Record<string, unknown>[]} pool
 */
export function applyHebrewRichPoolGradeEligibilityP1(pool) {
  for (const row of pool) {
    const pf = String(row.patternFamily || "");
    if (pf === "synonym" && row.gradeBand === "mid") {
      delete row.gradeBand;
      row.minGrade = 3;
      row.maxGrade = 6;
    }
    if (pf === "part_of_speech" && row.gradeBand === "mid") {
      delete row.gradeBand;
      row.minGrade = 3;
      row.maxGrade = 6;
    }
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function enrichHebrewRichPoolRow(row) {
  if (!row || typeof row !== "object") return;
  const topic = String(row.topic || "");
  if (SKIP_TOPICS.has(topic)) return;

  const pf = String(row.patternFamily || "");
  const contract = BY_PATTERN[pf];
  if (!contract) return;

  if (!row.diagnosticSkillId) row.diagnosticSkillId = contract.diagnosticSkillId;
  if (!row.conceptTag) row.conceptTag = contract.conceptTag;
  if (!row.expectedErrorTags?.length) {
    row.expectedErrorTags = [...contract.expectedErrorTags];
  }
  if (!row.probePower) row.probePower = "medium";

  const existingTypes = Array.isArray(row.expectedErrorTypes)
    ? row.expectedErrorTypes.map(String)
    : [];
  const merged = [...new Set([...existingTypes, ...(row.expectedErrorTags || []).map(String)])].filter(
    Boolean
  );
  row.expectedErrorTypes = merged.length ? merged : [...(row.expectedErrorTags || [])];
}

/**
 * @param {Record<string, unknown>[]} pool
 */
export function enrichHebrewRichPoolRows(pool) {
  applyHebrewRichPoolGradeEligibilityP1(pool);
  applyHebrewRichPoolLevelEligibilityP1(pool);
  for (const row of pool) enrichHebrewRichPoolRow(row);
}

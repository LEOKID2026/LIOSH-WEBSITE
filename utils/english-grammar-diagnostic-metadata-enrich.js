/**
 * P0 English grammar pool diagnostic metadata enricher.
 * Mutates GRAMMAR_POOLS rows in place — no stem/option/explanation changes.
 */

/** @typedef {{ diagnosticSkillId: string, conceptTagPrefix: string, expectedErrorTags: string[], probePower?: string }} PoolDiagContract */

/** @type {Record<string, PoolDiagContract>} */
export const ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL = {
  be_basic: {
    diagnosticSkillId: "en_grammar_be_present",
    conceptTagPrefix: "english_be_agreement",
    expectedErrorTags: ["grammar_pattern_error", "subject_verb_agreement_error"],
  },
  present_simple: {
    diagnosticSkillId: "en_grammar_present_simple",
    conceptTagPrefix: "english_present_simple",
    expectedErrorTags: ["present_simple_3rd_singular_error", "grammar_pattern_error"],
  },
  past_simple: {
    diagnosticSkillId: "en_grammar_past_simple",
    conceptTagPrefix: "english_past_simple",
    expectedErrorTags: ["past_tense_form_error", "irregular_past_error", "grammar_pattern_error"],
  },
  progressive: {
    diagnosticSkillId: "en_grammar_progressive",
    conceptTagPrefix: "english_progressive",
    expectedErrorTags: ["progressive_aspect_error", "verb_form_error", "grammar_pattern_error"],
  },
  question_frames: {
    diagnosticSkillId: "en_grammar_question_frames",
    conceptTagPrefix: "english_question_frames",
    expectedErrorTags: ["question_word_order_error", "auxiliary_error", "grammar_pattern_error"],
  },
  modals: {
    diagnosticSkillId: "en_grammar_modals",
    conceptTagPrefix: "english_modals",
    expectedErrorTags: ["modal_verb_error", "grammar_pattern_error"],
  },
  quantifiers: {
    diagnosticSkillId: "en_grammar_quantifiers",
    conceptTagPrefix: "english_quantifiers",
    expectedErrorTags: ["quantifier_choice_error", "countability_error", "grammar_pattern_error"],
  },
  comparatives: {
    diagnosticSkillId: "en_grammar_comparatives",
    conceptTagPrefix: "english_comparatives",
    expectedErrorTags: ["comparative_form_error", "irregular_comparative_error", "grammar_pattern_error"],
  },
  future_forms: {
    diagnosticSkillId: "en_grammar_future_forms",
    conceptTagPrefix: "english_future_forms",
    expectedErrorTags: ["future_form_error", "will_going_to_confusion", "grammar_pattern_error"],
  },
  complex_tenses: {
    diagnosticSkillId: "en_grammar_complex_tenses",
    conceptTagPrefix: "english_complex_tenses",
    expectedErrorTags: ["perfect_aspect_error", "tense_sequence_error", "grammar_pattern_error"],
  },
  conditionals: {
    diagnosticSkillId: "en_grammar_conditionals",
    conceptTagPrefix: "english_conditionals",
    expectedErrorTags: ["conditional_clause_error", "if_clause_form_error", "grammar_pattern_error"],
  },
  phase29_g2_standard: {
    diagnosticSkillId: "en_grammar_phase29_standard",
    conceptTagPrefix: "english_phase29_standard",
    expectedErrorTags: ["grammar_pattern_error", "sentence_structure_error"],
  },
  phase29_g3_advanced: {
    diagnosticSkillId: "en_grammar_phase29_advanced",
    conceptTagPrefix: "english_phase29_advanced",
    expectedErrorTags: ["advanced_grammar_error", "grammar_pattern_error"],
  },
  phase29_g4_advanced: {
    diagnosticSkillId: "en_grammar_phase29_advanced",
    conceptTagPrefix: "english_phase29_advanced",
    expectedErrorTags: ["advanced_grammar_error", "grammar_pattern_error"],
  },
  phase29_g5_standard: {
    diagnosticSkillId: "en_grammar_phase29_standard",
    conceptTagPrefix: "english_phase29_standard",
    expectedErrorTags: ["grammar_pattern_error", "sentence_structure_error"],
  },
  phase29_g5_advanced: {
    diagnosticSkillId: "en_grammar_phase29_advanced",
    conceptTagPrefix: "english_phase29_advanced",
    expectedErrorTags: ["advanced_grammar_error", "register_error", "grammar_pattern_error"],
  },
  phase29_g6_standard: {
    diagnosticSkillId: "en_grammar_phase29_standard",
    conceptTagPrefix: "english_phase29_standard",
    expectedErrorTags: ["grammar_pattern_error", "sentence_structure_error"],
  },
  phase29_g6_advanced: {
    diagnosticSkillId: "en_grammar_phase29_advanced",
    conceptTagPrefix: "english_phase29_advanced",
    expectedErrorTags: ["advanced_grammar_error", "register_error", "grammar_pattern_error"],
  },
};

/**
 * @param {Record<string, unknown>} row
 */
export function isEnglishGrammarRowFullyEnriched(row) {
  return !!(
    row.diagnosticSkillId &&
    row.conceptTag &&
    row.patternFamily &&
    (row.expectedErrorTags?.length || row.expectedErrorTypes?.length)
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} poolKey
 */
export function enrichEnglishGrammarPoolRow(row, poolKey) {
  if (!row || typeof row !== "object") return;
  if (isEnglishGrammarRowFullyEnriched(row)) return;

  const contract = ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL[poolKey];
  if (!contract) return;

  const subtype = String(row.subtype || poolKey).trim();
  if (!row.patternFamily) {
    const skillPart = String(row.skillId || subtype || "item").trim();
    row.patternFamily = `${poolKey}_${skillPart}`;
  }
  if (!row.diagnosticSkillId) row.diagnosticSkillId = contract.diagnosticSkillId;
  if (!row.conceptTag) {
    row.conceptTag = subtype && subtype !== poolKey ? `${contract.conceptTagPrefix}_${subtype}` : contract.conceptTagPrefix;
  }
  if (!row.expectedErrorTags?.length) {
    row.expectedErrorTags = [...contract.expectedErrorTags];
  }
  if (!row.probePower) row.probePower = contract.probePower || "medium";

  const existingTypes = Array.isArray(row.expectedErrorTypes) ? row.expectedErrorTypes.map(String) : [];
  const merged = [...new Set([...existingTypes, ...(row.expectedErrorTags || []).map(String)])].filter(Boolean);
  row.expectedErrorTypes = merged.length ? merged : [...(row.expectedErrorTags || [])];
}

/**
 * @param {Record<string, unknown[]>} grammarPools
 */
export function enrichEnglishGrammarPools(grammarPools) {
  for (const [poolKey, pool] of Object.entries(grammarPools)) {
    if (!Array.isArray(pool)) continue;
    for (const row of pool) {
      enrichEnglishGrammarPoolRow(/** @type {Record<string, unknown>} */ (row), poolKey);
    }
  }
}

/**
 * Primary runtime producer for each of 59 taxonomy rules.
 * A rule is implemented when primaryProducer.active === true and module emits tag at runtime.
 */
import { MATH_TOPIC_COVERAGE_PRIMARY_PRODUCERS } from "../../utils/diagnostic-engine-v2/taxonomy-math-topic-coverage.js";

/** @typedef {{ tag: string, module: string, generator: string, active: boolean, probeKind?: string|null }} RulePrimaryProducer */

/** @type {Record<string, RulePrimaryProducer>} */
export const RULE_PRIMARY_PRODUCER = Object.freeze({
  "M-01": { tag: "place_value_error", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "place_digit" },
  "M-02": { tag: "carry_error", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "add_vertical" },
  "M-03": { tag: "multiplication_fact_error", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "mul" },
  "M-04": { tag: "numerator_only_compare", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "frac_compare" },
  "M-05": { tag: "common_denominator_error", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "frac_add" },
  "M-06": { tag: "rounding_wrong_direction", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "dec_round" },
  "M-07": { tag: "unit_error", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "wp_unit" },
  "M-08": { tag: "omitted_addend", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "add_three" },
  "M-09": { tag: "add_instead_of_sub", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "sub_two" },
  "M-27": { tag: "sub_instead_of_add", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "add_two" },
  "M-10": { tag: "wrong_operation_wp", module: "math-numeric-classifier", generator: "lib/learning/classifiers/math-numeric-classifier.js", active: true, probeKind: "wp_" },
  "G-01": { tag: "shape_property_confusion", module: "mcq-option-evidence-tagging", generator: "lib/learning/mcq-option-evidence-tagging.js", active: true, probeKind: "geometry_mcq" },
  "G-02": { tag: "angle_range_error", module: "mcq-option-evidence-tagging", generator: "utils/geometry-question-generator.js", active: true, probeKind: "geometry_mcq" },
  "G-03": { tag: "area_formula_error", module: "mcq-option-evidence-tagging", generator: "utils/geometry-question-generator.js", active: true, probeKind: "geometry_mcq" },
  "G-04": { tag: "transformation_error", module: "mcq-option-evidence-tagging", generator: "utils/geometry-question-generator.js:transform_confusion", active: true, probeKind: "geometry_transform" },
  "G-05": { tag: "volume_formula_error", module: "mcq-option-evidence-tagging", generator: "utils/geometry-question-generator.js", active: true, probeKind: "geometry_mcq" },
  "G-06": { tag: "perimeter_area_confusion", module: "geometry-numeric-classifier", generator: "lib/learning/fuzzy-tolerance-geometry.js", active: true, probeKind: "rectangle_area" },
  "G-07": { tag: "symmetry_error", module: "mcq-option-evidence-tagging", generator: "utils/geometry-question-generator.js", active: true, probeKind: "geometry_mcq" },
  "G-08": { tag: "forgot_divide_by_2", module: "geometry-numeric-classifier", generator: "lib/learning/fuzzy-tolerance-geometry.js", active: true, probeKind: "triangle_area" },
  "G-09": { tag: "pythagorean_relation_error", module: "geometry-numeric-classifier", generator: "lib/learning/fuzzy-tolerance-geometry.js", active: true, probeKind: "pythagoras_hyp" },
  "H-01": { tag: "vocabulary_context_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-question-generator.js", active: true, probeKind: "hebrew_mcq" },
  "H-02": { tag: "grammar_agreement_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-question-generator.js", active: true, probeKind: "grammar_mcq" },
  "H-03": { tag: "spelling_pattern_error", module: "hebrew-typed-classifier", generator: "lib/learning/classifiers/hebrew-typed-classifier.js", active: true, probeKind: "spelling_typed" },
  "H-04": { tag: "reading_comprehension_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-rich-question-bank.js", active: true, probeKind: "hebrew_mcq" },
  "H-05": { tag: "homophone_confusion", module: "hebrew-typed-classifier", generator: "lib/learning/classifiers/hebrew-typed-classifier.js", active: true, probeKind: "spelling_typed" },
  "H-06": { tag: "verb_tense_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-question-generator.js", active: true, probeKind: "grammar_mcq" },
  "H-07": { tag: "punctuation_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-question-generator.js", active: true, probeKind: "hebrew_mcq" },
  "H-08": { tag: "speaking_expression_error", module: "mcq-option-evidence-tagging", generator: "utils/hebrew-question-generator.js", active: true, probeKind: "hebrew_mcq" },
  "E-01": { tag: "vocabulary_meaning_error", module: "mcq-option-evidence-tagging", generator: "utils/english-question-generator.js", active: true, probeKind: "vocabulary_mcq" },
  "E-02": { tag: "grammar_error", module: "mcq-option-evidence-tagging", generator: "utils/english-question-generator.js:grammar_forms", active: true, probeKind: "grammar_mcq" },
  "E-03": { tag: "translation_error", module: "mcq-option-evidence-tagging", generator: "data/english-questions/translation-pools.js", active: true, probeKind: "translation_mcq" },
  "E-04": { tag: "preposition_error", module: "mcq-option-evidence-tagging", generator: "utils/english-question-generator.js", active: true, probeKind: "grammar_mcq" },
  "E-05": { tag: "phrasal_verb_error", module: "mcq-option-evidence-tagging", generator: "utils/english-question-generator.js", active: true, probeKind: "grammar_mcq" },
  "E-06": { tag: "sentence_structure_error", module: "mcq-option-evidence-tagging", generator: "utils/english-question-generator.js:same_slot_forms", active: true, probeKind: "sentences_mcq" },
  "E-07": { tag: "spelling_error", module: "english-typed-classifier", generator: "lib/learning/classifiers/english-typed-classifier.js", active: true, probeKind: "spelling_typed" },
  "E-08": { tag: "phonics_minimal_pair_error", module: "english-question-generator", generator: "utils/english-question-generator.js:phonics-minimal-pair-evidence-v1", active: true, probeKind: "first_words_cvc" },
  "S-01": { tag: "concept_confusion", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-02": { tag: "variable_control_error", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-03": { tag: "body_system_confusion", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-04": { tag: "material_property_error", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-05": { tag: "physical_chemical_confusion", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-06": { tag: "planet_confusion", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-07": { tag: "ecosystem_confusion", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "S-08": { tag: "animal_classification_error", module: "mcq-option-evidence-tagging", generator: "data/science-questions.js:expectedErrorTags", active: true, probeKind: "science_mcq" },
  "MG-01": { tag: "map_reading_error", module: "mcq-option-evidence-tagging", generator: "data/geography-questions", active: true, probeKind: "geography_mcq" },
  "MG-02": { tag: "location_error", module: "mcq-option-evidence-tagging", generator: "data/geography-questions", active: true, probeKind: "geography_mcq" },
  "MG-03": { tag: "citizenship_error", module: "mcq-option-evidence-tagging", generator: "utils/moledet-geography-question-generator.js", active: true, probeKind: "geography_mcq" },
  "MG-04": { tag: "homeland_identity_error", module: "mcq-option-evidence-tagging", generator: "utils/moledet-geography-question-generator.js", active: true, probeKind: "moledet_mcq" },
  "MG-05": { tag: "landform_confusion", module: "mcq-option-evidence-tagging", generator: "data/geography-questions", active: true, probeKind: "geography_mcq" },
  "MG-06": { tag: "values_error", module: "mcq-option-evidence-tagging", generator: "utils/moledet-geography-question-generator.js", active: true, probeKind: "moledet_mcq" },
  "MG-07": { tag: "community_error", module: "mcq-option-evidence-tagging", generator: "utils/moledet-geography-question-generator.js", active: true, probeKind: "moledet_mcq" },
  "MG-08": { tag: "map_symbol_error", module: "mcq-option-evidence-tagging", generator: "data/geography-questions", active: true, probeKind: "geography_mcq" },
  "HI-01": { tag: "historical_concept_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-02": { tag: "timeline_sequence_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-03": { tag: "cause_effect_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-04": { tag: "comparison_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-05": { tag: "figure_role_confusion", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-06": { tag: "institution_confusion", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-07": { tag: "culture_heritage_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-08": { tag: "source_comprehension_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  "HI-09": { tag: "historical_connection_error", module: "mcq-option-evidence-tagging", generator: "data/history-questions/g6-generated.js", active: true, probeKind: "history_mcq" },
  ...MATH_TOPIC_COVERAGE_PRIMARY_PRODUCERS,
});

/**
 * @param {string|null|undefined} ruleId
 */
export function primaryProducerForRule(ruleId) {
  const id = String(ruleId || "").trim();
  return RULE_PRIMARY_PRODUCER[id] || null;
}

/**
 * @param {string|null|undefined} ruleId
 */
export function ruleHasPrimaryProducer(ruleId) {
  const p = primaryProducerForRule(ruleId);
  return !!(p && p.active);
}

/**
 * @returns {{ total: number, active: number }}
 */
export function summarizePrimaryProducers() {
  const entries = Object.values(RULE_PRIMARY_PRODUCER);
  return {
    total: entries.length,
    active: entries.filter((p) => p.active).length,
  };
}

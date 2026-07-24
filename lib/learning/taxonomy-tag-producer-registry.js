/**
 * Active evidence-tag producers — a rule is not implemented unless at least one
 * required tag has an active producer listed here.
 */

import { RULE_PRIMARY_PRODUCER } from "./taxonomy-rule-primary-producers.js";

/** @typedef {"math-numeric-classifier"|"math-mcq-infer"|"mcq-distractor-classifier"|"hebrew-typed-classifier"|"english-typed-classifier"|"geometry-numeric-classifier"|"question-bank-static"|"probe-params"} ProducerModule */

/**
 * @typedef {Object} TagProducer
 * @property {ProducerModule} module
 * @property {string} generator
 * @property {boolean} active
 * @property {string} [notes]
 */

/** @type {Record<string, TagProducer>} */
const DECLARED_TAG_PRODUCER_REGISTRY = Object.freeze({
  omitted_addend: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  omitted_step: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
    notes: "multi-step probe expectedErrorTags",
  },
  multi_step_failure: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  wrong_final_step: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  add_instead_of_sub: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  operand_reversal: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  reverse_direction: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
    notes: "alias of operand_reversal family",
  },
  mul_instead_of_add: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  sub_instead_of_add: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  add_instead_of_mul: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  wrong_operation_wp: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: true,
  },
  mul_instead_of_div: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
    notes: "operation_confusion probe tag",
  },
  inverse_operation_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  rounding_wrong_direction: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  place_value_error: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  number_sense_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  representation_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
    notes: "no deterministic numeric path yet",
  },
  carry_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
    notes: "probe tag only; no typed classifier",
  },
  regroup_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
  },
  column_carry_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
  },
  fact_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
    notes: "multiplication_fact_gap probe",
  },
  multiplication_fact_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  numerator_only_compare: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  denominator_only_compare: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  fraction_compare_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
    notes: "adds_denominators_directly / wrong_lcm",
  },
  mirror_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  common_denominator_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  fraction_operation_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: true,
  },
  decimal_place_error: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
    notes: "shares place_value_error path",
  },
  unit_error: {
    module: "math-numeric-classifier",
    generator: "utils/math-question-generator.js:inferMathDistractorFamily",
    active: false,
  },
  wrong_unit: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
  },
  unit_conversion_error: {
    module: "math-mcq-infer",
    generator: "utils/math-question-generator.js:probe-params",
    active: false,
  },
  forgot_divide_by_2: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  perimeter_area_confusion: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  volume_perimeter_confusion: {
    module: "geometry-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: false,
  },
  volume_formula_error: {
    module: "geometry-numeric-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  height_base_confusion: {
    module: "geometry-numeric-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  area_formula_error: {
    module: "geometry-numeric-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  parallelogram_area_error: {
    module: "geometry-numeric-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  formula_error: {
    module: "geometry-numeric-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  triangle_area_error: {
    module: "math-numeric-classifier",
    generator: "lib/learning/classifiers/math-numeric-classifier.js",
    active: true,
  },
  shape_property_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  quadrilateral_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  parallel_perpendicular_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  formula_selection_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:enrichGeometryProceduralParams",
    active: true,
  },
  rectangle_diagonal: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:diagonal_rectangle",
    active: true,
  },
  pythagorean_relation_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-topic-diagnostic-evidence.js",
    active: true,
  },
  square_perimeter_compute: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:square_perimeter",
    active: true,
  },
  circle_perimeter_compute: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:circle_perimeter",
    active: true,
  },
  angle_range_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  protractor_reading_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  transformation_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:transform_confusion",
    active: true,
  },
  rotation_direction_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js:transform_confusion",
    active: true,
  },
  symmetry_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  symmetry_axis_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/geometry-question-generator.js",
    active: false,
  },
  spelling_pattern_error: {
    module: "hebrew-typed-classifier",
    generator: "lib/learning/classifiers/hebrew-typed-classifier.js",
    active: true,
  },
  writing_pattern_error: {
    module: "hebrew-typed-classifier",
    generator: "lib/learning/classifiers/hebrew-typed-classifier.js",
    active: true,
  },
  spelling_error: {
    module: "english-typed-classifier",
    generator: "lib/learning/classifiers/english-typed-classifier.js",
    active: true,
  },
  writing_error: {
    module: "english-typed-classifier",
    generator: "lib/learning/classifiers/english-typed-classifier.js",
    active: true,
  },
  grammar_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js:grammar_forms",
    active: true,
  },
  tense_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js:same_slot_forms",
    active: true,
  },
  agreement_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js:grammar_forms",
    active: true,
  },
  vocabulary_meaning_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  collocation_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  word_choice_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  translation_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  word_order_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  preposition_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  article_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  preposition_phrase_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  phrasal_verb_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  sentence_structure_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/english-question-generator.js",
    active: false,
  },
  listening_comprehension_error: {
    module: "question-bank-static",
    generator: "data/english-questions",
    active: false,
  },
  phonics_minimal_pair_error: {
    module: "english-question-generator",
    generator: "utils/english-question-generator.js:phonics-minimal-pair-evidence-v1",
    active: true,
  },
  vocabulary_context_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  synonym_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  meaning_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  gender_number_agreement: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  grammar_agreement_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  reading_comprehension_error: {
    module: "question-bank-static",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  main_idea_error: {
    module: "question-bank-static",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  inference_error: {
    module: "question-bank-static",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  homophone_confusion: {
    module: "hebrew-typed-classifier",
    generator: "lib/learning/classifiers/hebrew-typed-classifier.js",
    active: false,
    notes: "requires homophone pair in params",
  },
  homograph_error: {
    module: "hebrew-typed-classifier",
    generator: "lib/learning/classifiers/hebrew-typed-classifier.js",
    active: false,
  },
  verb_tense_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  tense_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  punctuation_error: {
    module: "hebrew-typed-classifier",
    generator: "lib/learning/classifiers/hebrew-typed-classifier.js",
    active: false,
  },
  speaking_expression_error: {
    module: "question-bank-static",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  oral_comprehension_error: {
    module: "question-bank-static",
    generator: "utils/hebrew-question-generator.js",
    active: false,
  },
  concept_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  classification_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  classification_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  variable_control_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  experiment_design_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  body_system_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  organ_function_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  material_property_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  state_of_matter_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  material_change_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  physical_chemical_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  earth_space_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  planet_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  environment_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  ecosystem_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  animal_classification_error: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  habitat_confusion: {
    module: "mcq-distractor-classifier",
    generator: "data/science-questions.js",
    active: false,
  },
  map_reading_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  scale_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  direction_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  location_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  region_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  citizenship_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  rights_duties_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  homeland_identity_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  heritage_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  geography_feature_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  landform_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  values_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  community_values_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  community_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  social_structure_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  map_symbol_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  legend_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/moledet-geography-question-generator.js",
    active: false,
  },
  fact_recall_gap: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  historical_concept_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  timeline_sequence_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  chronology_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  cause_effect_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  historical_inference_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  comparison_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  partial_comparison_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  figure_role_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  character_role_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  institution_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  governance_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  culture_heritage_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  cultural_influence_confusion: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  source_comprehension_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  evidence_claim_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  past_present_link_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
  historical_connection_error: {
    module: "mcq-distractor-classifier",
    generator: "utils/history-question-banks",
    active: false,
  },
});

function buildAuthoritativeTagProducerRegistry() {
  const merged = { ...DECLARED_TAG_PRODUCER_REGISTRY };
  for (const producer of Object.values(RULE_PRIMARY_PRODUCER)) {
    if (!producer?.active || !producer.tag) continue;
    merged[producer.tag] = {
      ...(merged[producer.tag] || {}),
      module: producer.module,
      generator: producer.generator,
      active: true,
      authority: "rule_primary_producer",
    };
  }
  return Object.freeze(merged);
}

/**
 * Single runtime producer authority. Primary producer declarations are compiled
 * into this registry once; consumers never apply a second fallback authority.
 */
export const TAG_PRODUCER_REGISTRY =
  buildAuthoritativeTagProducerRegistry();

/**
 * @param {string|null|undefined} tag
 * @returns {TagProducer|null}
 */
export function getTagProducer(tag) {
  const t = String(tag || "").trim();
  if (!t) return null;
  return TAG_PRODUCER_REGISTRY[t] || null;
}

/**
 * @param {string|null|undefined} tag
 */
export function hasActiveTagProducer(tag) {
  const p = getTagProducer(tag);
  return !!(p && p.active);
}

/**
 * @param {string[]} requiredTags
 */
export function ruleHasActiveProducer(requiredTags) {
  if (!Array.isArray(requiredTags) || requiredTags.length === 0) return false;
  return requiredTags.some((t) => hasActiveTagProducer(t));
}

/**
 * @returns {{ activeTags: number, totalTags: number, activeProducers: number }}
 */
export function summarizeTagProducerRegistry() {
  const entries = Object.entries(TAG_PRODUCER_REGISTRY);
  return {
    totalTags: entries.length,
    activeTags: entries.filter(([, p]) => p.active).length,
    activeProducers: entries.filter(([, p]) => p.active).length,
  };
}

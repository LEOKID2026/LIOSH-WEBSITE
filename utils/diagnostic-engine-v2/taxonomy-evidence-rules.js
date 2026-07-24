/**
 * DE2 taxonomy evidence requirements — every active rule must declare evidence source.
 * topic + minWrong alone is NEVER sufficient for diagnosis.
 */
import {
  getTagProducer,
} from "../../lib/learning/taxonomy-tag-producer-registry.js";
import { MATH_TOPIC_COVERAGE_EVIDENCE_RULES } from "./taxonomy-math-topic-coverage.js";

/** @typedef {"misconception_tag"|"distractor_family"|"pattern_family"|"concept_tag"|"direct_numeric"} EvidenceSourceKind */

/**
 * @typedef {Object} TaxonomyEvidenceRule
 * @property {string} taxonomyId
 * @property {EvidenceSourceKind} evidenceSource
 * @property {string[]} requiredTags
 * @property {string[]} [questionKinds]
 * @property {number} [minTagMatches]
 * @property {number} [minRelevantQuestions]
 * @property {number} [minOccurrenceRatio]
 * @property {boolean} [requiresDistinctAnswers]
 * @property {string} [notesHe]
 */

/** @type {Record<string, TaxonomyEvidenceRule>} */
export const TAXONOMY_EVIDENCE_RULES = Object.freeze({
  "M-01": {
    taxonomyId: "M-01",
    evidenceSource: "misconception_tag",
    requiredTags: ["representation_error", "place_value_error", "number_sense_error"],
    questionKinds: ["ns_", "compare", "scale", "place"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "M-02": {
    taxonomyId: "M-02",
    evidenceSource: "misconception_tag",
    requiredTags: ["carry_error", "regroup_error", "column_carry_error"],
    questionKinds: ["add_two", "add_vertical", "add_three"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.5,
    requiresDistinctAnswers: true,
  },
  "M-03": {
    taxonomyId: "M-03",
    evidenceSource: "misconception_tag",
    requiredTags: ["fact_error", "multiplication_fact_error"],
    questionKinds: ["mul"],
    minTagMatches: 4,
    minRelevantQuestions: 4,
    minOccurrenceRatio: 0.5,
    requiresDistinctAnswers: true,
  },
  "M-04": {
    taxonomyId: "M-04",
    evidenceSource: "misconception_tag",
    requiredTags: ["numerator_only_compare", "denominator_only_compare", "fraction_compare_error"],
    questionKinds: ["frac_compare", "frac_"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "M-05": {
    taxonomyId: "M-05",
    evidenceSource: "misconception_tag",
    requiredTags: ["mirror_error", "common_denominator_error", "fraction_operation_error"],
    questionKinds: ["frac_add", "frac_sub"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "M-06": {
    taxonomyId: "M-06",
    evidenceSource: "misconception_tag",
    requiredTags: ["rounding_wrong_direction", "place_value_error", "decimal_place_error"],
    questionKinds: ["dec_", "round"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "M-07": {
    taxonomyId: "M-07",
    evidenceSource: "misconception_tag",
    requiredTags: ["unit_error", "wrong_unit", "unit_conversion_error"],
    questionKinds: ["wp_"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "M-08": {
    taxonomyId: "M-08",
    evidenceSource: "misconception_tag",
    requiredTags: ["omitted_addend", "omitted_step", "multi_step_failure", "wrong_final_step"],
    questionKinds: ["add_three", "wp_", "multi_step"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.67,
    requiresDistinctAnswers: true,
  },
  "M-09": {
    taxonomyId: "M-09",
    evidenceSource: "misconception_tag",
    requiredTags: ["add_instead_of_sub", "reverse_direction", "operand_reversal"],
    questionKinds: ["sub_two", "sub_vertical"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
    requiresDistinctAnswers: true,
  },
  "M-10": {
    taxonomyId: "M-10",
    evidenceSource: "misconception_tag",
    requiredTags: ["mul_instead_of_div", "add_instead_of_mul", "inverse_operation_error", "wrong_operation_wp"],
    questionKinds: ["div", "mul", "ratio"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-01": {
    taxonomyId: "G-01",
    evidenceSource: "distractor_family",
    requiredTags: [
      "shape_property_confusion",
      "quadrilateral_confusion",
      "parallel_perpendicular_confusion",
      "rectangle_diagonal",
    ],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-02": {
    taxonomyId: "G-02",
    evidenceSource: "distractor_family",
    requiredTags: ["angle_range_error", "protractor_reading_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-03": {
    taxonomyId: "G-03",
    evidenceSource: "misconception_tag",
    requiredTags: ["height_base_confusion", "area_formula_error", "parallelogram_area_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-04": {
    taxonomyId: "G-04",
    evidenceSource: "distractor_family",
    requiredTags: ["transformation_error", "rotation_direction_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-05": {
    taxonomyId: "G-05",
    evidenceSource: "misconception_tag",
    requiredTags: ["volume_perimeter_confusion", "volume_formula_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-06": {
    taxonomyId: "G-06",
    evidenceSource: "misconception_tag",
    requiredTags: [
      "perimeter_area_confusion",
      "unit_error",
      "perimeter_formula_error",
      "formula_selection_error",
      "square_perimeter_compute",
      "circle_perimeter_compute",
    ],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-07": {
    taxonomyId: "G-07",
    evidenceSource: "distractor_family",
    requiredTags: ["symmetry_error", "symmetry_axis_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-08": {
    taxonomyId: "G-08",
    evidenceSource: "misconception_tag",
    requiredTags: ["forgot_divide_by_2", "triangle_area_error", "formula_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "G-09": {
    taxonomyId: "G-09",
    evidenceSource: "distractor_family",
    requiredTags: ["pythagorean_relation_error"],
    questionKinds: ["pythagoras"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-01": {
    taxonomyId: "H-01",
    evidenceSource: "distractor_family",
    requiredTags: ["vocabulary_context_error", "synonym_confusion", "meaning_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-02": {
    taxonomyId: "H-02",
    evidenceSource: "distractor_family",
    requiredTags: ["gender_number_agreement", "grammar_agreement_error"],
    minTagMatches: 4,
    minRelevantQuestions: 4,
    minOccurrenceRatio: 0.6,
  },
  "H-03": {
    taxonomyId: "H-03",
    evidenceSource: "distractor_family",
    requiredTags: ["spelling_pattern_error", "writing_pattern_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-04": {
    taxonomyId: "H-04",
    evidenceSource: "distractor_family",
    requiredTags: ["reading_comprehension_error", "main_idea_error", "inference_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-05": {
    taxonomyId: "H-05",
    evidenceSource: "distractor_family",
    requiredTags: ["homophone_confusion", "homograph_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-06": {
    taxonomyId: "H-06",
    evidenceSource: "distractor_family",
    requiredTags: ["verb_tense_error", "tense_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-07": {
    taxonomyId: "H-07",
    evidenceSource: "distractor_family",
    requiredTags: ["punctuation_error", "sentence_structure_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "H-08": {
    taxonomyId: "H-08",
    evidenceSource: "distractor_family",
    requiredTags: ["speaking_expression_error", "oral_comprehension_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-01": {
    taxonomyId: "E-01",
    evidenceSource: "distractor_family",
    requiredTags: ["vocabulary_meaning_error", "collocation_error", "word_choice_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-02": {
    taxonomyId: "E-02",
    evidenceSource: "distractor_family",
    requiredTags: ["grammar_error", "tense_error", "agreement_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-03": {
    taxonomyId: "E-03",
    evidenceSource: "distractor_family",
    requiredTags: ["translation_error", "word_order_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-04": {
    taxonomyId: "E-04",
    evidenceSource: "distractor_family",
    requiredTags: ["preposition_error", "article_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-05": {
    taxonomyId: "E-05",
    evidenceSource: "distractor_family",
    requiredTags: ["preposition_phrase_error", "phrasal_verb_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-06": {
    taxonomyId: "E-06",
    evidenceSource: "distractor_family",
    requiredTags: ["sentence_structure_error", "word_order_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-07": {
    taxonomyId: "E-07",
    evidenceSource: "distractor_family",
    requiredTags: ["writing_error", "spelling_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "E-08": {
    taxonomyId: "E-08",
    evidenceSource: "distractor_family",
    requiredTags: ["phonics_minimal_pair_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-01": {
    taxonomyId: "S-01",
    evidenceSource: "distractor_family",
    requiredTags: ["classification_error", "classification_confusion", "concept_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-02": {
    taxonomyId: "S-02",
    evidenceSource: "distractor_family",
    requiredTags: ["variable_control_error", "experiment_design_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-03": {
    taxonomyId: "S-03",
    evidenceSource: "distractor_family",
    requiredTags: ["body_system_confusion", "organ_function_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-04": {
    taxonomyId: "S-04",
    evidenceSource: "distractor_family",
    requiredTags: ["material_property_error", "state_of_matter_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-05": {
    taxonomyId: "S-05",
    evidenceSource: "distractor_family",
    requiredTags: ["material_change_error", "physical_chemical_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-06": {
    taxonomyId: "S-06",
    evidenceSource: "distractor_family",
    requiredTags: ["earth_space_error", "planet_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-07": {
    taxonomyId: "S-07",
    evidenceSource: "distractor_family",
    requiredTags: ["environment_error", "ecosystem_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "S-08": {
    taxonomyId: "S-08",
    evidenceSource: "distractor_family",
    requiredTags: ["animal_classification_error", "habitat_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-01": {
    taxonomyId: "MG-01",
    evidenceSource: "distractor_family",
    requiredTags: ["map_reading_error", "scale_error", "direction_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-02": {
    taxonomyId: "MG-02",
    evidenceSource: "distractor_family",
    requiredTags: ["location_error", "region_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-03": {
    taxonomyId: "MG-03",
    evidenceSource: "distractor_family",
    requiredTags: ["citizenship_error", "rights_duties_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-04": {
    taxonomyId: "MG-04",
    evidenceSource: "distractor_family",
    requiredTags: ["homeland_identity_error", "heritage_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-05": {
    taxonomyId: "MG-05",
    evidenceSource: "distractor_family",
    requiredTags: ["geography_feature_error", "landform_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-06": {
    taxonomyId: "MG-06",
    evidenceSource: "distractor_family",
    requiredTags: ["values_error", "community_values_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-07": {
    taxonomyId: "MG-07",
    evidenceSource: "distractor_family",
    requiredTags: ["community_error", "social_structure_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "MG-08": {
    taxonomyId: "MG-08",
    evidenceSource: "distractor_family",
    requiredTags: ["map_symbol_error", "legend_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-01": {
    taxonomyId: "HI-01",
    evidenceSource: "distractor_family",
    requiredTags: ["concept_confusion", "fact_recall_gap", "historical_concept_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-02": {
    taxonomyId: "HI-02",
    evidenceSource: "distractor_family",
    requiredTags: ["timeline_sequence_error", "chronology_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-03": {
    taxonomyId: "HI-03",
    evidenceSource: "distractor_family",
    requiredTags: [
      "cause_effect_error",
      "historical_inference_error",
    ],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-04": {
    taxonomyId: "HI-04",
    evidenceSource: "distractor_family",
    requiredTags: ["comparison_error", "partial_comparison_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-05": {
    taxonomyId: "HI-05",
    evidenceSource: "distractor_family",
    requiredTags: ["figure_role_confusion", "character_role_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-06": {
    taxonomyId: "HI-06",
    evidenceSource: "distractor_family",
    requiredTags: ["institution_confusion", "governance_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-07": {
    taxonomyId: "HI-07",
    evidenceSource: "distractor_family",
    requiredTags: ["culture_heritage_error", "cultural_influence_confusion"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-08": {
    taxonomyId: "HI-08",
    evidenceSource: "distractor_family",
    requiredTags: ["source_comprehension_error", "evidence_claim_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  "HI-09": {
    taxonomyId: "HI-09",
    evidenceSource: "distractor_family",
    requiredTags: ["past_present_link_error", "historical_connection_error"],
    minTagMatches: 3,
    minRelevantQuestions: 3,
    minOccurrenceRatio: 0.6,
  },
  ...MATH_TOPIC_COVERAGE_EVIDENCE_RULES,
});

/**
 * @param {string|null|undefined} taxonomyId
 * @returns {TaxonomyEvidenceRule|null}
 */
export function evidenceRuleForTaxonomyId(taxonomyId) {
  const id = String(taxonomyId || "").trim();
  return TAXONOMY_EVIDENCE_RULES[id] || null;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 * @returns {string|null}
 */
export function extractMisconceptionTagFromEvent(ev) {
  if (!ev) return null;
  if (ev.misconceptionTag && String(ev.misconceptionTag).trim() && ev.misconceptionTag !== "unknown") {
    return String(ev.misconceptionTag).trim();
  }
  const meta = ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {};
  const fromMeta =
    meta.misconceptionTag ||
    meta.detectedMisconception ||
    meta.answerEvidence?.detectedMisconception;
  if (fromMeta && String(fromMeta).trim() && String(fromMeta) !== "unknown") {
    return String(fromMeta).trim();
  }
  if (ev.distractorFamily && ev.distractorFamily !== "unknown" && ev.distractorFamily !== "generic_proximity") {
    return ev.distractorFamily;
  }
  return null;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 * @param {TaxonomyEvidenceRule} rule
 */
export function eventMatchesEvidenceRule(ev, rule) {
  if (!ev || !rule || ev.isCorrect) return false;
  const activeRequiredTags = rule.requiredTags.filter(
    (requiredTag) => getTagProducer(requiredTag)?.active === true,
  );
  const tag = extractMisconceptionTagFromEvent(ev);
  if (!tag) return false;
  // Selected-answer evidence is authoritative. Question-level possible patterns
  // describe what could be diagnosed, not what this particular wrong answer proves.
  return activeRequiredTags.includes(tag);
}

/**
 * @param {string|null|undefined} taxonomyId
 * @returns {string[]}
 */
export function allTaxonomyIdsWithEvidenceRules() {
  return Object.keys(TAXONOMY_EVIDENCE_RULES);
}

/**
 * Normalize bank/generator distractor tags to canonical taxonomy tags.
 * Banks may use legacy aliases; classifiers and DE2 require taxonomy IDs.
 */

/** @type {Record<string, string>} bankOrLegacyTag → canonical taxonomy tag */
export const TAG_ALIASES_TO_CANONICAL = Object.freeze({
  variable_control_confusion: "variable_control_error",
  experiment_variable_control: "variable_control_error",
  material_property_confusion: "material_property_error",
  state_of_matter_confusion: "state_of_matter_error",
  physical_change_confusion: "physical_chemical_confusion",
  chemical_change_confusion: "physical_chemical_confusion",
  earth_space_confusion: "planet_confusion",
  classification_error: "animal_classification_error",
  environment_error: "ecosystem_confusion",
  geography_feature_error: "landform_confusion",
  transform_confusion: "transformation_error",
  fact_recall_gap: "historical_concept_error",
  chronology_error: "timeline_sequence_error",
  sequence_error: "timeline_sequence_error",
  cause_effect_confusion: "cause_effect_error",
  cause_effect_reversal: "cause_effect_error",
  past_present_confusion: "historical_connection_error",
  past_present_link_error: "historical_connection_error",
  cultural_influence_confusion: "culture_heritage_error",
  evidence_claim_error: "source_comprehension_error",
  past_present_link_error: "historical_connection_error",
  heritage_confusion: "homeland_identity_error",
  rights_duties_confusion: "citizenship_error",
  map_scale_error: "map_reading_error",
  symbol_confusion: "map_symbol_error",
  preposition_confusion: "preposition_error",
  article_confusion: "preposition_error",
  tense_confusion: "grammar_error",
  agreement_confusion: "grammar_agreement_error",
  vocabulary_context_confusion: "vocabulary_context_error",
  reading_comprehension_confusion: "reading_comprehension_error",
  listening_confusion: "listening_comprehension_error",
  phrasal_confusion: "phrasal_verb_error",
  sentence_order_error: "sentence_structure_error",
  shape_confusion: "shape_property_confusion",
  angle_confusion: "angle_range_error",
  area_confusion: "area_formula_error",
  volume_confusion: "volume_formula_error",
  symmetry_confusion: "symmetry_error",
  mul_fact_error: "multiplication_fact_error",
  regroup_error: "carry_error",
  column_carry_error: "carry_error",
  wrong_unit: "unit_error",
  unit_conversion_confusion: "unit_error",
  mirror_error: "common_denominator_error",
  fraction_operation_error: "common_denominator_error",
  homograph_error: "homophone_confusion",
  experiment_variable_control: "variable_control_error",
  timeline_error: "timeline_sequence_error",
  sequence_confusion: "timeline_sequence_error",
  place_identification_error: "location_error",
  detail_recall_error: "location_error",
  vocabulary_confusion: "vocabulary_context_error",
  ecosystem_relation_confusion: "ecosystem_confusion",
  earth_space_error: "planet_confusion",
  state_of_matter_error: "physical_chemical_confusion",
  procedure_order_confusion: "concept_confusion",
  reading_comprehension_error: "reading_comprehension_error",
  concept_confusion: "concept_confusion",
  direction_confusion: "map_symbol_error",
  visual_reasoning_error: "shape_property_confusion",
  square_properties: "shape_property_confusion",
  rectangle_properties: "shape_property_confusion",
  shape_angle_properties: "angle_range_error",
  triangle_angle_sum: "angle_range_error",
  translation_reflection: "transformation_error",
  rotation_transform: "transformation_error",
  reflection_symmetry: "symmetry_error",
  area_general: "area_formula_error",
  volume_general: "volume_formula_error",
  perimeter_general: "perimeter_area_confusion",
  comprehension_gap: "reading_comprehension_error",
  grammar_pattern_error: "grammar_error",
  mammal_classification: "animal_classification_error",
  properties_confusion: "material_property_error",
  matter_state_confusion: "physical_chemical_confusion",
  earth_space_planet_confusion: "planet_confusion",
  careless_error: "concept_confusion",
});

/**
 * @param {string|null|undefined} tag
 * @returns {string|null}
 */
export function normalizeToCanonicalTag(tag) {
  const t = String(tag || "").trim();
  if (!t || t === "unknown" || t === "generic_proximity") return t || null;
  return TAG_ALIASES_TO_CANONICAL[t] || t;
}

/**
 * Normalize an array of expected error tags from bank metadata.
 * @param {unknown[]} tags
 * @returns {string[]}
 */
export function normalizeExpectedErrorTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((x) => normalizeToCanonicalTag(String(x)))
    .filter((t) => t && t !== "unknown" && t !== "generic_proximity");
}

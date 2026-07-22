/**
 * Default expectedErrorTags by subject topic when bank rows lack explicit tags.
 * Used at MCQ enrichment time only — not topic-only diagnosis.
 */

/** @type {Record<string, Record<string, string[]>>} */
export const SUBJECT_TOPIC_DEFAULT_ERROR_TAGS = Object.freeze({
  hebrew: {
    grammar_agreement_light: ["grammar_agreement_error", "gender_number_agreement", "grammar_error"],
    g1_grammar_agreement_light: ["grammar_agreement_error", "grammar_error"],
    grammar: ["grammar_agreement_error", "verb_tense_error", "grammar_error"],
    spelling: ["spelling_pattern_error", "homophone_confusion", "writing_pattern_error"],
    homophones: ["homophone_confusion", "spelling_pattern_error"],
    reading: ["reading_comprehension_error", "vocabulary_context_error"],
    vocabulary: ["vocabulary_context_error", "reading_comprehension_error"],
    punctuation: ["punctuation_error", "grammar_agreement_error"],
    expression: ["speaking_expression_error", "grammar_agreement_error"],
  },
  english: {
    grammar: ["grammar_error", "tense_error", "agreement_error"],
    vocabulary: ["vocabulary_meaning_error", "translation_error"],
    translation: ["translation_error", "vocabulary_meaning_error"],
    prepositions: ["preposition_error", "grammar_error"],
    phrasal_verbs: ["phrasal_verb_error", "grammar_error"],
    sentences: ["sentence_structure_error", "grammar_error"],
    phonics: ["listening_comprehension_error", "spelling_error"],
    listening: ["listening_comprehension_error", "vocabulary_meaning_error"],
  },
  geometry: {
    shapes: ["shape_property_confusion", "angle_range_error"],
    shapes_basic: ["shape_property_confusion", "angle_range_error"],
    angles: ["angle_range_error", "shape_property_confusion"],
    area: ["area_formula_error", "perimeter_area_confusion"],
    volume: ["volume_formula_error", "area_formula_error"],
    symmetry: ["symmetry_error", "shape_property_confusion"],
    transform: ["transformation_error", "shape_property_confusion"],
    transformations: ["transformation_error", "shape_property_confusion"],
    rotation: ["transformation_error", "symmetry_error"],
    triangles: ["shape_property_confusion", "angle_range_error"],
    quadrilaterals: ["shape_property_confusion", "angle_range_error"],
    pythagoras: ["area_formula_error", "angle_range_error"],
  },
  science: {
    materials: ["material_property_error", "concept_confusion", "careless_error"],
    matter: ["physical_chemical_confusion", "concept_confusion", "careless_error"],
    states_of_matter: ["physical_chemical_confusion", "concept_confusion", "careless_error"],
    earth_space: ["planet_confusion", "concept_confusion", "careless_error"],
    body: ["body_system_confusion", "concept_confusion"],
    experiments: ["variable_control_error", "concept_confusion"],
    environment: ["ecosystem_confusion", "concept_confusion"],
    animals: ["animal_classification_error", "concept_confusion"],
    classification: ["animal_classification_error", "concept_confusion"],
  },
  history: {
    timeline: ["timeline_sequence_error", "historical_concept_error"],
    culture: ["culture_heritage_error", "historical_concept_error"],
    sources: ["source_comprehension_error", "historical_concept_error"],
  },
  geography: {
    maps: ["map_reading_error", "map_symbol_error", "location_error"],
    map: ["map_reading_error", "map_symbol_error", "location_error"],
    landforms: ["landform_confusion", "location_error", "map_reading_error"],
    location: ["location_error", "map_reading_error", "landform_confusion"],
    symbols: ["map_symbol_error", "map_reading_error", "location_error"],
    citizenship: ["citizenship_error", "concept_confusion", "values_error"],
    community: ["community_error", "citizenship_error", "values_error"],
    values: ["values_error", "citizenship_error", "community_error"],
    homeland: ["homeland_identity_error", "location_error", "concept_confusion"],
    geography: ["landform_confusion", "location_error", "map_reading_error"],
  },
  moledet_geography: {
    citizenship: ["citizenship_error", "rights_duties_confusion", "concept_confusion"],
    homeland: ["homeland_identity_error", "heritage_confusion", "concept_confusion"],
    values: ["values_error", "citizenship_error", "concept_confusion"],
    community: ["community_error", "citizenship_error", "concept_confusion"],
    maps: ["map_reading_error", "map_symbol_error", "location_error"],
    map: ["map_reading_error", "map_symbol_error", "location_error"],
    landforms: ["landform_confusion", "location_error", "map_reading_error"],
    location: ["location_error", "map_reading_error", "landform_confusion"],
  },
});

/**
 * @param {string|null|undefined} subjectId
 * @param {string|null|undefined} topicOrKind
 * @param {string|null|undefined} patternFamily
 * @returns {string[]}
 */
export function defaultErrorTagsForSubjectTopic(subjectId, topicOrKind, patternFamily) {
  const subject = String(subjectId || "")
    .trim()
    .replace(/-/g, "_");
  const map = SUBJECT_TOPIC_DEFAULT_ERROR_TAGS[subject] || SUBJECT_TOPIC_DEFAULT_ERROR_TAGS[subject.replace("_geography", "")];
  if (!map) return [];

  const keys = [
    String(topicOrKind || "").trim(),
    String(patternFamily || "").trim(),
  ].filter(Boolean);

  for (const k of keys) {
    if (map[k]) return [...map[k]];
    for (const [mk, tags] of Object.entries(map)) {
      if (k.includes(mk) || mk.includes(k)) return [...tags];
    }
  }
  return [];
}

/**
 * Controlled metadata taxonomy: canonical English ids for code fields.
 * User-facing copy stays Hebrew in banks; this module is for validation and enrichment planning only.
 */

import {
  ENGLISH_SKILL_IDS,
  ENGLISH_SUBSKILL_ALLOWLIST_BY_SKILL,
} from "./question-metadata-taxonomy-english.js";
import { isTaxonomyValidMathSkillId, isTaxonomyValidMathSubskillId } from "./question-metadata-taxonomy-math.js";
import {
  HEBREW_ARCHIVE_GRADE_SUBSKILL_IDS,
  HEBREW_ARCHIVE_SKILL_IDS,
  HEBREW_ARCHIVE_SUBSKILL_ALLOWLIST_BY_SKILL,
} from "./question-metadata-taxonomy-hebrew-archive.js";
import {
  MOLEDET_GEOGRAPHY_GRADE_SUBSKILL_IDS,
  MOLEDET_GEOGRAPHY_SKILL_IDS,
  MOLEDET_GEOGRAPHY_SUBSKILL_ALLOWLIST_BY_SKILL,
} from "./question-metadata-taxonomy-geography.js";
import {
  HISTORY_SKILL_IDS as HISTORY_CURRICULUM_SKILL_IDS,
  HISTORY_TOPIC_ORDER as HISTORY_CURRICULUM_TOPIC_ORDER,
} from "../../data/history-curriculum.js";
import { HISTORY_G6_SUBTOPIC_IDS as HISTORY_G6_CONTENT_MAP_SUBTOPIC_IDS } from "../../data/history-g6-content-map.js";
import { BANK_ENRICHED_EXPECTED_ERROR_TYPES } from "./bank-enriched-expected-error-types.js";

const HISTORY_SKILL_IDS = HISTORY_CURRICULUM_SKILL_IDS || [];
const HISTORY_TOPIC_ORDER = HISTORY_CURRICULUM_TOPIC_ORDER || [];
const HISTORY_G6_SUBTOPIC_IDS = HISTORY_G6_CONTENT_MAP_SUBTOPIC_IDS || [];

export { ENGLISH_SKILL_IDS, ENGLISH_SUBSKILL_ALLOWLIST_BY_SKILL };
export {
  HEBREW_ARCHIVE_GRADE_SUBSKILL_IDS,
  HEBREW_ARCHIVE_SKILL_IDS,
  HEBREW_ARCHIVE_SUBSKILL_ALLOWLIST_BY_SKILL,
} from "./question-metadata-taxonomy-hebrew-archive.js";
export {
  MOLEDET_GEOGRAPHY_GRADE_SUBSKILL_IDS,
  MOLEDET_GEOGRAPHY_SKILL_IDS,
  MOLEDET_GEOGRAPHY_SUBSKILL_ALLOWLIST_BY_SKILL,
} from "./question-metadata-taxonomy-geography.js";

export const TAXONOMY_VERSION = 1;

/** Ordered topic domains used in `data/science-questions.js` (topic + derived skillId). */
export const SCIENCE_TOPIC_ORDER = [
  "body",
  "animals",
  "plants",
  "materials",
  "earth_space",
  "environment",
  "experiments",
];

/**
 * Science skillIds observed in static bank (topic-as-skill + explicit diagnostic ids).
 * Keep in sync with scanner `effectiveSkillId` results for this file.
 */
export const SCIENCE_SKILL_IDS = new Set([
  ...SCIENCE_TOPIC_ORDER,
  "sci_body_fact_recall",
  "sci_respiration_concept",
]);

/**
 * Subskill allowlist by skillId. Empty set = only "missing" checks apply, not "unknown".
 * Includes template ids we suggest in enrichment and legacy patternFamily rows.
 */
function buildScienceSubskillAllowlist() {
  /** @type {Record<string, Set<string>>} */
  const m = {};
  for (const t of SCIENCE_TOPIC_ORDER) {
    m[t] = new Set([`sci_${t}_general`]);
  }
  m.sci_body_fact_recall = new Set(["science_body_heart_location", "science_body_sense_organs"]);
  m.sci_respiration_concept = new Set(["science_respiratory_gas_exchange", "sci_respiration_general"]);
  return m;
}

export const SCIENCE_SUBSKILL_ALLOWLIST_BY_SKILL = buildScienceSubskillAllowlist();

export { HISTORY_TOPIC_ORDER, HISTORY_SKILL_IDS };

/** @type {Set<string>} */
export const HISTORY_SKILL_ID_SET = new Set(HISTORY_SKILL_IDS);

function buildHistorySubskillAllowlist() {
  /** @type {Record<string, Set<string>>} */
  const m = {};
  for (const skill of HISTORY_SKILL_IDS) {
    m[skill] = new Set(HISTORY_G6_SUBTOPIC_IDS);
  }
  return m;
}

export const HISTORY_SUBSKILL_ALLOWLIST_BY_SKILL = buildHistorySubskillAllowlist();

/** Recommended base difficulty (extendable). */
export const CANONICAL_DIFFICULTY = new Set([
  "intro",
  "basic",
  "standard",
  "advanced",
  "challenge",
]);

/** Legacy / in-repo normalizations still accepted. */
export const LEGACY_DIFFICULTY = new Set([
  "easy",
  "medium",
  "hard",
  "low",
  "high",
  /** Science enrichment pass — between basic and advanced */
  "intermediate",
]);

/** Union used by scanner validation. */
export const ALL_VALID_DIFFICULTY = new Set([...CANONICAL_DIFFICULTY, ...LEGACY_DIFFICULTY]);

export const CANONICAL_COGNITIVE_LEVELS = new Set([
  "recall",
  "understanding",
  "application",
  "analysis",
]);

/** Legacy values still present in data / heuristics. */
export const LEGACY_COGNITIVE_LEVELS = new Set(["reasoning", "multi_step"]);

export const ALL_VALID_COGNITIVE_LEVELS = new Set([
  ...CANONICAL_COGNITIVE_LEVELS,
  ...LEGACY_COGNITIVE_LEVELS,
]);

/**
 * Core generic error families (diagnostic engine).
 * @type {string[]}
 */
export const GENERIC_EXPECTED_ERROR_TYPES = [
  "misconception",
  "calculation_error",
  "vocabulary_confusion",
  "reading_comprehension_error",
  "grammar_error",
  "concept_confusion",
  "prerequisite_gap",
  "careless_error",
  "strategy_error",
  "incomplete_answer",
];

/**
 * Bank-specific / existing tags in science pool (do not require human rename before taxonomy match).
 */
export const EXTENDED_EXPECTED_ERROR_TYPES = new Set([
  ...GENERIC_EXPECTED_ERROR_TYPES,
  ...BANK_ENRICHED_EXPECTED_ERROR_TYPES,
  "fact_recall_gap",
  "classification_error",
  "cause_effect_gap",
  "system_confusion",
  "terminology_mixup",
  "procedural_error",
  "data_reading_error",
  "model_misuse",
  "overgeneralization",
  "unit_or_scale_error",
  /** Hebrew rich pool / comprehension tagging */
  "comprehension_gap",
  "detail_recall_error",
  /** Geometry conceptual bank — measurement / visual diagnostic tags */
  "shape_property_confusion",
  "formula_selection_error",
  "measurement_error",
  "unit_confusion",
  "visual_reasoning_error",
  "geometry_calculation_slip",
  /** Hebrew rich pool — comprehension / discourse tagging */
  "inference_error",
  "sequence_error",
  /** English pools */
  "grammar_pattern_error",
  "translation_error",
  "sentence_order_error",
  /** Math procedural / probes */
  "operation_confusion",
  "place_value_error",
  "fraction_misconception",
  "denominator_confusion",
  "numerator_denominator_confusion",
  "decimal_place_error",
  "word_problem_comprehension_error",
  "wrong_lcm",
  "adds_denominators_directly",
  "multiplication_fact_gap",
  /** Moledet / geography static pools */
  "geography_concept_confusion",
  "map_reading_error",
  "place_identification_error",
  "direction_confusion",
]);

/**
 * Per-skill subskill allowlist for `utils/geometry-conceptual-bank.js` scan results (`effectiveSubskillId`).
 */
function buildGeometrySubskillAllowlist() {
  /** @type {Record<string, Set<string>>} */
  const m = {};
  m["360_at_vertex"] = new Set(["angles_around_point"]);
  m["apex"] = new Set(["compare"]);
  m["apex_late"] = new Set(["compare_late"]);
  m["compare_area"] = new Set(["same_perimeter"]);
  m["congruent_def"] = new Set(["same_size_shape"]);
  m["corresponding"] = new Set(["concept_only"]);
  m["cube_faces"] = new Set(["cube"]);
  m["cube_faces_late"] = new Set(["cube_faces_late"]);
  m["d_2r"] = new Set(["relation"]);
  m["diag_equal_rect"] = new Set(["property"]);
  m["diag_equal_rect_late"] = new Set(["property_late"]);
  m["equilateral"] = new Set(["equal_sides"]);
  m["equilateral_late"] = new Set(["equal_sides_review"]);
  m["geo_angle_right_identify"] = new Set(["classification", "classification_late"]);
  m["geo_pv_area_vs_perimeter"] = new Set(["choose_measure", "choose_measure_floor", "fence", "fence_perimeter_project"]);
  m["geo_rect_area_plan"] = new Set(["area_rectangle", "area_rectangle_site", "same_perimeter"]);
  m["geo_angle_measure"] = new Set(["inference_reasoning", "concept_only"]);
  m["geo_quad_properties"] = new Set(["parallelogram", "parallelogram_late"]);
  m["geo_quad_classification"] = new Set([
    "square_rectangle",
    "square_rectangle_late",
    "rhombus_rectangle",
    "rhombus_rectangle_late",
  ]);
  m["geo_symmetry_reflection"] = new Set(["meaning", "meaning_axis", "same_size_shape"]);
  m["geo_volume_unit_reasoning"] = new Set(["definition", "definition_capacity"]);
  m["geo_volume_prism_formula"] = new Set(["order_ops"]);
  m["geo_perimeter_formula"] = new Set(["interpret", "square_from_perimeter"]);
  m["geo_shape_classification"] = new Set(["square_count", "square_count_mid"]);
  m["geo_shape_properties"] = new Set(["rectangle_angles", "rectangle_angles_mid"]);
  m["geo_triangle_properties"] = new Set(["obtuse_count"]);
  m["hyp_opposite_right"] = new Set(["hypotenuse_side"]);
  m["mirror"] = new Set(["meaning"]);
  m["mirror_flip"] = new Set(["reflection"]);
  m["mirror_late"] = new Set(["meaning_axis"]);
  m["not_always_both"] = new Set(["rhombus_rectangle"]);
  m["not_always_both_late"] = new Set(["rhombus_rectangle_late"]);
  m["one_obtuse_max"] = new Set(["obtuse_count"]);
  m["para_parallel"] = new Set(["parallelogram"]);
  m["para_parallel_late"] = new Set(["parallelogram_late"]);
  m["parallel_never_meet"] = new Set(["parallel_def"]);
  m["parallel_never_meet_late"] = new Set(["parallel_def_late"]);
  m["parallel_symbol"] = new Set(["parallel_symbol"]);
  m["parallel_symbol_late"] = new Set(["parallel_symbol_late"]);
  m["parallel_vs_perp"] = new Set(["compare_relation"]);
  m["parallel_vs_perp_mid"] = new Set(["compare_relation_mid"]);
  m["perim_to_side"] = new Set(["square_from_perimeter"]);
  m["perp_angle_mid"] = new Set(["perp_angle_mid"]);
  m["perp_meeting"] = new Set(["definition"]);
  m["perp_meeting_late"] = new Set(["definition_late"]);
  m["perp_symbol"] = new Set(["symbol_recognition"]);
  m["perp_symbol_mid"] = new Set(["perp_symbol_mid"]);
  m["perp_def_late"] = new Set(["perp_def_late"]);
  m["perpendicular_to_base"] = new Set(["triangle"]);
  m["quarter_90"] = new Set(["degrees"]);
  m["rect_all_90"] = new Set(["rectangle_angles"]);
  m["rect_all_90_mid"] = new Set(["rectangle_angles_mid"]);
  m["slide"] = new Set(["translation"]);
  m["slide_only"] = new Set(["translation_hard"]);
  m["square_4_equal"] = new Set(["square_count"]);
  m["square_4_equal_mid"] = new Set(["square_count_mid"]);
  m["square_special"] = new Set(["square_rectangle"]);
  m["square_special_late"] = new Set(["square_rectangle_late"]);
  m["square_tile_90"] = new Set(["square_tile_angle"]);
  m["triangle_tile_60"] = new Set(["triangle_tile_angle"]);
  m["tri_sum_180"] = new Set(["inference"]);
  m["tri_sum_180_late"] = new Set(["inference_reasoning"]);
  m["turn"] = new Set(["rotation"]);
  m["turn_center"] = new Set(["rotation_hard"]);
  m["unit_squares"] = new Set(["square_units"]);
  m["vol_box"] = new Set(["order_ops"]);
  m["volume_3d"] = new Set(["definition"]);
  m["volume_3d_late"] = new Set(["definition_capacity"]);
  m["wheel_rotation"] = new Set(["interpret"]);
  m["when_pyth"] = new Set(["first_step"]);
  m["no_motion"] = new Set(["identity"]);
  m["mirror_axis"] = new Set(["reflection_hard"]);
  return m;
}

export const GEOMETRY_SUBSKILL_ALLOWLIST_BY_SKILL = buildGeometrySubskillAllowlist();

/** Skill ids observed on geometry conceptual scan (`effectiveSkillId`). */
export const GEOMETRY_SKILL_IDS = new Set(Object.keys(GEOMETRY_SUBSKILL_ALLOWLIST_BY_SKILL));

/**
 * Per-skill subskill allowlist for `utils/hebrew-rich-question-bank.js` (`HEBREW_RICH_POOL` scan).
 * Keys match scanner `effectiveSkillId` (diagnosticSkillId / patternFamily / topic precedence).
 */
function buildHebrewRichSubskillAllowlist() {
  /** @type {Record<string, Set<string>>} */
  const m = {};
  m["analogy_reasoning"] = new Set(["parallel"]);
  m["antonym"] = new Set(["opposite"]);
  m["binary_fact_early_g1"] = new Set(["tf_science_simple"]);
  m["binary_fact_early_g2"] = new Set(["where_from_sentence"]);
  m["binary_fact_mid_grammar"] = new Set(["tf"]);
  m["binary_grammar"] = new Set(["tf"]);
  m["category_exclusion"] = new Set(["odd_out"]);
  m["cause_effect"] = new Set(["because"]);
  m["collocation"] = new Set(["verb_noun_fit"]);
  m["compare_statements"] = new Set(["contrast"]);
  m["completion"] = new Set(["context_clue"]);
  m["context_fit"] = new Set(["register"]);
  m["gender_number"] = new Set(["plural"]);
  m["gender_number_early_g1"] = new Set(["agreement_girl_singular"]);
  m["gender_number_early_g2"] = new Set(["agreement_boy_plural"]);
  m["he_comp_explicit_detail"] = new Set(["detail"]);
  m["he_comp_inference_intro"] = new Set(["implied"]);
  m["he_comp_sequence_events"] = new Set(["order"]);
  m["implicit_tone"] = new Set(["attitude"]);
  m["logic_completion"] = new Set(["conclusion"]);
  m["main_idea"] = new Set(["summary"]);
  m["morphology"] = new Set(["binyan_fit"]);
  m["part_of_speech"] = new Set(["verb_noun"]);
  m["precision"] = new Set(["best_word"]);
  m["prep_choice"] = new Set(["collocation"]);
  m["reference"] = new Set(["pronoun"]);
  m["rephrase"] = new Set(["clarity"]);
  m["semantic_field"] = new Set(["education_lexicon"]);
  m["sentence_correction"] = new Set(["choose_correct", "sv_agreement_plural"]);
  m["sentence_read"] = new Set(["meaning"]);
  m["social_reply_early_g1"] = new Set(["bump_sorry"]);
  m["social_reply_early_g2"] = new Set(["thanks_response"]);
  m["social_reply_mid_help"] = new Set(["request"]);
  m["spell_word_early_ab_writing"] = new Set(["object_riddle", "role_meaning"]);
  m["structural"] = new Set(["paragraph_role"]);
  m["structured_completion"] = new Set(["polite_phrase"]);
  m["supporting_detail"] = new Set(["evidence"]);
  m["synonym"] = new Set(["near_meaning"]);
  m["tense_shift"] = new Set(["past_present"]);
  m["transform"] = new Set(["negation"]);
  m["verb_agreement"] = new Set(["plural_subject"]);
  m["word_context_early_g1"] = new Set(["cloze_morning"]);
  m["word_context_early_g2"] = new Set(["cloze_school"]);
  m["word_level_early_g1"] = new Set(["spelling_meaning_then_choice"]);
  m["word_level_early_g2"] = new Set(["spelling_choice_niqqud"]);
  return m;
}

export const HEBREW_RICH_SUBSKILL_ALLOWLIST_BY_SKILL = buildHebrewRichSubskillAllowlist();

/** Skill ids observed on Hebrew rich pool scan (`effectiveSkillId`). */
export const HEBREW_RICH_SKILL_IDS = new Set(Object.keys(HEBREW_RICH_SUBSKILL_ALLOWLIST_BY_SKILL));

export const TAXONOMY_ISSUE_CODES = {
  taxonomy_unknown_skillId: "taxonomy_unknown_skillId",
  taxonomy_unknown_subskillId: "taxonomy_unknown_subskillId",
  taxonomy_unknown_expected_error_type: "taxonomy_unknown_expected_error_type",
  taxonomy_unknown_prerequisite_skillId: "taxonomy_unknown_prerequisite_skillId",
};

/**
 * Readiness rubric metadata (documentation / reporting helpers — advisory).
 */
export const READINESS_RULES = {
  strong: "Skill ≥85% coverage, subskill ≥50%, avg completeness ≥0.65, high-risk share <8%.",
  medium: "Skill coverage usable but substantial gaps in cognitive/errors/prereqs.",
  weak: "Large missing skill or inconsistent tagging.",
  missing: "Skill id largely absent - diagnosis routing unreliable.",
};

/**
 * Map legacy difficulty to canonical suggestion labels (enrichment).
 * @param {string} d
 */
export function mapDifficultyToCanonical(d) {
  const x = String(d || "").toLowerCase();
  if (x === "easy" || x === "low" || x === "intro") return "basic";
  if (x === "medium" || x === "standard") return "standard";
  if (x === "hard" || x === "high") return "advanced";
  if (CANONICAL_DIFFICULTY.has(x)) return x;
  return "standard";
}

/**
 * Infer cognitive level for science rows from probePower / difficulty heuristics.
 * @param {Record<string, unknown>} params
 * @param {string} difficultyNormalized easy|medium|hard or canonical
 */
export function inferScienceCognitiveLevel(params, difficultyNormalized) {
  const pp = String(params.probePower || "").toLowerCase();
  if (pp === "high") return "application";
  if (pp === "medium") return "understanding";
  if (pp === "low") return "recall";
  const d = String(difficultyNormalized || "").toLowerCase();
  if (d === "easy" || d === "basic" || d === "intro") return "recall";
  if (d === "hard" || d === "advanced" || d === "challenge") return "analysis";
  return "understanding";
}

/**
 * Infer cognitive level for geometry conceptual rows (kind, pattern, optional probePower).
 * @param {Record<string, unknown>} raw
 * @param {string} difficultyNormalized
 */
export function inferGeometryCognitiveLevel(raw, difficultyNormalized) {
  const pp = String(raw.probePower || "").toLowerCase();
  if (pp === "high") return "analysis";
  if (pp === "medium") return "application";
  if (pp === "low") return "understanding";
  const kind = String(raw.kind || "");
  const pf = String(raw.patternFamily || "");
  if (kind.includes("compare") || pf.includes("shape_comparison")) return "analysis";
  if (kind.includes("multi_step")) return "application";
  if (kind.includes("reason")) return "understanding";
  if (pf.includes("triangle_angle_sum") || pf.includes("right_angle")) return "understanding";
  const d = String(difficultyNormalized || "").toLowerCase();
  if (d === "easy" || d === "basic" || d === "intro") return "recall";
  if (d === "hard" || d === "advanced" || d === "challenge") return "analysis";
  return "understanding";
}

/**
 * Infer cognitive level for Hebrew rich pool rows (probePower, patternFamily, topic).
 * @param {Record<string, unknown>} raw
 * @param {string} difficultyNormalized
 */
export function inferHebrewRichCognitiveLevel(raw, difficultyNormalized) {
  const pp = String(raw.probePower || "").toLowerCase();
  if (pp === "high") return "application";
  if (pp === "medium") return "understanding";
  if (pp === "low") return "recall";
  const pf = String(raw.patternFamily || "");
  const topic = String(raw.topic || "");
  if (pf.includes("word_level") || pf.includes("spell_word") || (topic === "reading" && pf.includes("early"))) {
    return "recall";
  }
  if (
    pf.includes("inference") ||
    pf.includes("implicit") ||
    pf === "reference" ||
    pf === "main_idea" ||
    pf === "supporting_detail" ||
    pf === "compare_statements"
  ) {
    return "analysis";
  }
  const d = String(difficultyNormalized || "").toLowerCase();
  if (d === "easy" || d === "basic" || d === "intro") return "recall";
  if (d === "hard" || d === "advanced" || d === "challenge") return "analysis";
  return "understanding";
}

/**
 * Infer cognitive level for English static pool rows (grammar / translation / sentence).
 * @param {Record<string, unknown>} raw
 * @param {string} difficultyNormalized
 * @param {string} sourceFileHint
 */
export function inferEnglishCognitiveLevel(raw, difficultyNormalized, sourceFileHint = "") {
  const pp = String(raw.probePower || "").toLowerCase();
  if (pp === "high") return "application";
  if (pp === "medium") return "understanding";
  if (pp === "low") return "recall";
  const pf = String(raw.patternFamily || "");
  const src = String(sourceFileHint || "");
  if (src.includes("translation-pools") || pf.includes("translation")) return "application";
  if (pf.includes("scramble") || pf.includes("order") || pf.includes("sequence")) return "analysis";
  const d = String(difficultyNormalized || "").toLowerCase();
  if (d === "easy" || d === "basic" || d === "intro") return "recall";
  if (d === "hard" || d === "advanced" || d === "challenge") return "analysis";
  return "understanding";
}

/**
 * Grade-band heuristic when `difficulty` is absent on English rows.
 * @param {Record<string, unknown>} raw
 */
export function inferEnglishDifficultyFromGrade(raw) {
  const g = Math.max(Number(raw.maxGrade) || 0, Number(raw.minGrade) || 0);
  if (g <= 2) return "basic";
  if (g >= 5) return "advanced";
  return "standard";
}

/**
 * @param {object} record — scan record from buildScanRecord
 * @returns {string[]} additional issue codes
 */
export function validateTaxonomyForRecord(record) {
  /** @type {string[]} */
  const issues = [];

  const subject = record.subject || "";
  if (!subject) return issues;

  const skillId = record.skillId || "";
  const subskillId = record.subskillId || "";

  if (subject === "hebrew") {
    if (skillId && !HEBREW_RICH_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = HEBREW_RICH_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "science") {
    if (skillId && !SCIENCE_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = SCIENCE_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "geometry") {
    if (skillId && !GEOMETRY_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = GEOMETRY_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "english") {
    if (skillId && !ENGLISH_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = ENGLISH_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "math") {
    if (skillId && !isTaxonomyValidMathSkillId(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (subskillId && !isTaxonomyValidMathSubskillId(subskillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
    }
  }

  if (subject === "hebrew-archive") {
    if (skillId && !HEBREW_ARCHIVE_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = HEBREW_ARCHIVE_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "moledet-geography") {
    if (skillId && !MOLEDET_GEOGRAPHY_SKILL_IDS.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = MOLEDET_GEOGRAPHY_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  if (subject === "history") {
    if (skillId && !HISTORY_SKILL_ID_SET.has(skillId)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_skillId);
    }
    if (skillId && subskillId) {
      const allow = HISTORY_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
      if (allow && !allow.has(subskillId)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_subskillId);
      }
    }
  }

  const errs = record.expectedErrorTypes || [];
  for (const e of errs) {
    const t = String(e).trim();
    if (t && !EXTENDED_EXPECTED_ERROR_TYPES.has(t)) {
      issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_expected_error_type);
      break;
    }
  }

  if (subject === "science" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!SCIENCE_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "geometry" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!GEOMETRY_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "hebrew" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!HEBREW_RICH_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "english" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!ENGLISH_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "math" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!isTaxonomyValidMathSkillId(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "hebrew-archive" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!HEBREW_ARCHIVE_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  if (subject === "moledet-geography" && Array.isArray(record.prerequisiteSkillIds)) {
    for (const p of record.prerequisiteSkillIds) {
      const id = String(p).trim();
      if (!id) continue;
      if (!MOLEDET_GEOGRAPHY_SKILL_IDS.has(id)) {
        issues.push(TAXONOMY_ISSUE_CODES.taxonomy_unknown_prerequisite_skillId);
        break;
      }
    }
  }

  return [...new Set(issues)];
}

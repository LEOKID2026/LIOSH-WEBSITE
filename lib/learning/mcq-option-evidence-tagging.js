/**
 * Runtime MCQ option evidence tagging — tags wrong options from question metadata.
 * No topic inference: uses explicit expectedErrorTags, distractorFamily, patternFamily maps.
 */

import { mcqCellValue, mcqCellLabel } from "../../utils/mcq-option-cell.js";
import { GENERIC_PROXIMITY } from "./question-engine-metadata.js";
import {
  normalizeExpectedErrorTags,
  normalizeToCanonicalTag,
} from "./taxonomy-tag-normalizer.js";
import { defaultErrorTagsForSubjectTopic } from "./mcq-subject-default-error-tags.js";

/** patternFamily / conceptTag → primary distractor tag for taxonomy producers */
export const PATTERN_FAMILY_TO_DISTRACTOR_TAG = Object.freeze({
  science_body_heart_location: "body_system_confusion",
  science_classification: "classification_error",
  science_experiment: "variable_control_error",
  science_materials: "material_property_error",
  science_earth: "earth_space_error",
  science_ecosystem: "environment_error",
  history_timeline: "timeline_sequence_error",
  history_cause_effect: "cause_effect_error",
  history_comparison: "comparison_error",
  history_figure: "figure_role_confusion",
  history_institution: "institution_confusion",
  history_culture: "culture_heritage_error",
  history_source: "source_comprehension_error",
  geography_map: "map_reading_error",
  geography_location: "location_error",
  geography_landform: "geography_feature_error",
  moledet_citizenship: "citizenship_error",
  moledet_heritage: "homeland_identity_error",
  moledet_values: "values_error",
  hebrew_spelling: "spelling_pattern_error",
  hebrew_grammar: "grammar_agreement_error",
  hebrew_reading: "reading_comprehension_error",
  english_grammar: "grammar_error",
  english_vocabulary: "vocabulary_meaning_error",
  english_translation: "translation_error",
  geometry_transform: "transformation_error",
  geometry_shape: "shape_property_confusion",
  geometry_angle: "angle_range_error",
  geometry_area: "area_formula_error",
  geometry_symmetry: "symmetry_error",
});

/**
 * Resolve distractor tag for one wrong option index.
 * @param {object} ctx
 * @param {number} ctx.optionIndex
 * @param {unknown} ctx.correctIndex
 * @param {string[]} ctx.expectedErrorTags
 * @param {string|null} ctx.questionDistractorFamily
 * @param {string|null} ctx.patternFamily
 * @param {string|null} ctx.conceptTag
 * @param {string|null} [ctx.diagnosticSkillId]
 * @param {number} ctx.wrongOptionOrdinal — 0-based among wrong options only
 */
export function resolveMcqOptionDistractorTag(ctx) {
  const {
    optionIndex,
    correctIndex,
    expectedErrorTags = [],
    questionDistractorFamily,
    patternFamily,
    conceptTag,
    diagnosticSkillId,
    wrongOptionOrdinal = 0,
  } = ctx;

  if (correctIndex != null && optionIndex === correctIndex) return null;

  if (questionDistractorFamily && questionDistractorFamily !== "unknown" && questionDistractorFamily !== "mixed") {
    return questionDistractorFamily;
  }

  if (Array.isArray(expectedErrorTags) && expectedErrorTags.length > 0) {
    const tag = normalizeToCanonicalTag(
      expectedErrorTags[wrongOptionOrdinal % expectedErrorTags.length]
    );
    if (tag && tag !== "unknown") {
      return tag;
    }
  }

  const pf = String(patternFamily || "").trim();
  if (pf && PATTERN_FAMILY_TO_DISTRACTOR_TAG[pf]) {
    return normalizeToCanonicalTag(PATTERN_FAMILY_TO_DISTRACTOR_TAG[pf]);
  }

  const skill = String(diagnosticSkillId || "").trim();
  if (skill.includes("timeline")) return "timeline_sequence_error";
  if (skill.includes("cause_effect")) return "cause_effect_error";
  if (skill.includes("past_present") || skill.includes("connection")) return "historical_connection_error";
  if (skill.includes("culture") || skill.includes("heritage")) return "culture_heritage_error";
  if (skill.includes("source") || skill.includes("evidence")) return "source_comprehension_error";
  if (skill.includes("figure") || skill.includes("role")) return "figure_role_confusion";
  if (skill.includes("institution")) return "institution_confusion";
  if (skill.includes("connection") || skill.includes("link")) return "historical_connection_error";
  if (skill.includes("variable_control")) return "variable_control_error";
  if (skill.includes("citizenship")) return "citizenship_error";
  if (skill.includes("map")) return "map_reading_error";

  const ct = String(conceptTag || "").trim();
  if (pf.includes("source") || ct.includes("source")) return "source_comprehension_error";
  if (ct.includes("grammar")) return "grammar_error";
  if (ct.includes("spell")) return "spelling_pattern_error";
  if (ct.includes("timeline") || ct.includes("chronology")) return "timeline_sequence_error";
  if (ct.includes("map") || ct.includes("scale")) return "map_reading_error";
  if (ct.includes("classif")) return "animal_classification_error";
  if (ct.includes("experiment") || ct.includes("variable")) return "variable_control_error";
  if (ct.includes("cause") && ct.includes("effect")) return "cause_effect_error";
  if (ct.includes("culture") || ct.includes("heritage")) return "culture_heritage_error";
  if (ct.includes("source") || ct.includes("evidence")) return "source_comprehension_error";
  if (ct.includes("citizenship") || ct.includes("rights")) return "citizenship_error";
  if (ct.includes("community")) return "community_error";
  if (ct.includes("values")) return "values_error";
  if (ct.includes("homeland") || ct.includes("identity")) return "homeland_identity_error";
  if (ct.includes("landform")) return "landform_confusion";
  if (ct.includes("symbol")) return "map_symbol_error";
  if (ct.includes("location")) return "location_error";

  return null;
}

/**
 * Enrich plain-string MCQ options with distractorFamily on wrong cells.
 * @param {unknown[]} choices
 * @param {Record<string, unknown>} [params]
 * @param {unknown} [correctAnswer]
 * @param {number|null} [correctIndex]
 */
export function enrichMcqChoicesWithEvidenceTags(choices, params = {}, correctAnswer = null, correctIndex = null, subjectId = null) {
  if (!Array.isArray(choices) || choices.length < 2) return choices;

  const p = params && typeof params === "object" ? params : {};
  let ci = correctIndex;
  if (ci == null && correctAnswer != null) {
    ci = choices.findIndex((c) => mcqCellValue(c) === mcqCellValue(correctAnswer));
    if (ci < 0) ci = null;
  }

  const questionDistractorFamily =
    p.distractorFamily != null ? String(p.distractorFamily).trim() : null;
  const patternFamily = p.patternFamily != null ? String(p.patternFamily) : null;
  const conceptTag = p.conceptTag != null ? String(p.conceptTag) : null;
  const diagnosticSkillId = p.diagnosticSkillId != null ? String(p.diagnosticSkillId) : null;

  let expectedErrorTags = normalizeExpectedErrorTags([
    ...defaultErrorTagsForSubjectTopic(
      subjectId || p.subjectId || p.subject,
      p.kind || p.topic || p.operation,
      patternFamily
    ),
    ...(Array.isArray(p.expectedErrorTags)
      ? p.expectedErrorTags
      : Array.isArray(p.expectedErrorTypes)
        ? p.expectedErrorTypes
        : []),
  ]);
  if (expectedErrorTags.length === 0) {
    expectedErrorTags = normalizeExpectedErrorTags(
      defaultErrorTagsForSubjectTopic(
        subjectId || p.subjectId || p.subject,
        p.kind || p.topic || p.operation,
        patternFamily
      )
    );
  }

  let wrongOrd = 0;
  return choices.map((cell, index) => {
    if (cell && typeof cell === "object" && !Array.isArray(cell)) {
      const existing = cell.distractorFamily || cell.misconceptionTag;
      if (existing && existing !== "unknown" && existing !== GENERIC_PROXIMITY) {
        if (ci == null || index !== ci) wrongOrd += 1;
        return cell;
      }
    }

    const isWrong = ci == null ? index !== 0 : index !== ci;
    if (!isWrong) return cell;

    const tag = resolveMcqOptionDistractorTag({
      optionIndex: index,
      correctIndex: ci,
      expectedErrorTags,
      questionDistractorFamily,
      patternFamily,
      conceptTag,
      diagnosticSkillId,
      wrongOptionOrdinal: wrongOrd,
    });
    wrongOrd += 1;

    const val = mcqCellValue(cell);
    if (!tag) {
      return typeof cell === "object" && cell != null
        ? { ...cell, distractorFamily: GENERIC_PROXIMITY }
        : { value: val, distractorFamily: GENERIC_PROXIMITY };
    }

    const canonical = normalizeToCanonicalTag(tag);
    return typeof cell === "object" && cell != null
      ? { ...cell, value: val ?? cell.value, distractorFamily: canonical, misconceptionTag: canonical }
      : { value: val, distractorFamily: canonical, misconceptionTag: canonical };
  });
}

/**
 * Apply enrichment to a question record in-place shape (returns new object).
 * @param {Record<string, unknown>|null|undefined} question
 */
export function applyMcqEvidenceTaggingToQuestion(question) {
  if (!question || typeof question !== "object") return question;
  const params =
    question.params && typeof question.params === "object" ? { ...question.params } : {};
  const choices =
    (Array.isArray(question.answers) && question.answers) ||
    (Array.isArray(question.options) && question.options) ||
    (Array.isArray(question.choices) && question.choices) ||
    null;
  if (!choices || choices.length < 2) return question;

  const correctIndex =
    question.correctIndex != null
      ? Number(question.correctIndex)
      : question.correct != null
        ? Number(question.correct)
        : null;
  const correctAnswer = question.correctAnswer ?? null;

  const enriched = enrichMcqChoicesWithEvidenceTags(
    choices,
    params,
    correctAnswer,
    Number.isFinite(correctIndex) ? correctIndex : null,
    question.subjectId || question.subject || params.subjectId || null
  );

  params.mcqOptionCells = enriched;

  const displayAnswers = enriched
    .map((cell) => {
      const v = mcqCellValue(cell);
      if (v == null || v === "") return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const label = mcqCellLabel(cell);
      return label || String(v).trim();
    })
    .filter((v) => v != null && v !== "");

  if (
    params.canonicalMetadata &&
    typeof params.canonicalMetadata === "object" &&
    !Array.isArray(params.canonicalMetadata)
  ) {
    const tagSources = normalizeExpectedErrorTags([
      ...(Array.isArray(params.expectedErrorTags) ? params.expectedErrorTags : []),
      ...(Array.isArray(params.expectedErrorTypes) ? params.expectedErrorTypes : []),
      ...enriched.flatMap((cell) => {
        if (!cell || typeof cell !== "object") return [];
        return [cell.distractorFamily, cell.misconceptionTag].filter(Boolean);
      }),
    ]);
    if (tagSources.length) {
      const existing = Array.isArray(params.canonicalMetadata.possibleErrorPatterns)
        ? params.canonicalMetadata.possibleErrorPatterns.map(String)
        : [];
      params.canonicalMetadata = {
        ...params.canonicalMetadata,
        possibleErrorPatterns: [...new Set([...existing, ...tagSources])],
      };
    }
  }

  const out = {
    ...question,
    params,
  };

  if (displayAnswers.length >= 2) {
    out.answers = displayAnswers;
    out.options = displayAnswers;
    out.choices = displayAnswers;
  }

  return out;
}

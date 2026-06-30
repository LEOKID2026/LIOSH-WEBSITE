/**
 * Diagnostic Engine V3 — conservative internal error-type classification.
 */

import { inferMisconceptionFromWrongAnswer } from "../learning-diagnostics/misconception-engine-v1.js";
import { V3_WAVE1_SUBJECT_IDS } from "./types.js";

export const ERROR_TYPE_V3 = Object.freeze({
  CONCEPTUAL: "conceptual_misunderstanding",
  PROCEDURAL: "procedural_error",
  PREREQUISITE: "prerequisite_gap",
  READING: "reading_comprehension_issue",
  VOCABULARY: "vocabulary_gap",
  PHONICS: "phonics_gap",
  INFERENCE: "inference_gap",
  SPEED: "speed_pressure",
  CARELESS: "careless_or_attention",
  GUESSING: "guessing_or_unstable",
  UNKNOWN: "unknown",
});

const FAST_WRONG_MS = 8000;
const SLOW_MS = 45000;

/** Map legacy / tagged error strings → V3 canonical */
const TAG_TO_V3 = Object.freeze({
  calculation_error: ERROR_TYPE_V3.PROCEDURAL,
  procedural_error: ERROR_TYPE_V3.PROCEDURAL,
  operation_selection_error: ERROR_TYPE_V3.CONCEPTUAL,
  place_value_error: ERROR_TYPE_V3.CONCEPTUAL,
  fraction_concept_error: ERROR_TYPE_V3.CONCEPTUAL,
  word_problem_reading: ERROR_TYPE_V3.READING,
  reading_comprehension: ERROR_TYPE_V3.READING,
  vocabulary_gap: ERROR_TYPE_V3.VOCABULARY,
  vocabulary_error: ERROR_TYPE_V3.VOCABULARY,
  grammar_error: ERROR_TYPE_V3.PROCEDURAL,
  inference_error: ERROR_TYPE_V3.INFERENCE,
  fast_guessing_pattern: ERROR_TYPE_V3.GUESSING,
  guessing_pattern: ERROR_TYPE_V3.GUESSING,
  careless_error: ERROR_TYPE_V3.CARELESS,
  prerequisite_gap: ERROR_TYPE_V3.PREREQUISITE,
  phonics_gap: ERROR_TYPE_V3.PHONICS,
});

/**
 * @param {string|null|undefined} tag
 * @returns {string}
 */
export function mapTagToErrorTypeV3(tag) {
  const t = String(tag || "").trim().toLowerCase();
  if (!t) return ERROR_TYPE_V3.UNKNOWN;
  return TAG_TO_V3[t] || ERROR_TYPE_V3.UNKNOWN;
}

/**
 * Classify a wrong-answer event conservatively.
 * @param {string} subjectId
 * @param {Record<string, unknown>} mistakeEvent — normalizeMistakeEvent shape
 * @returns {{ errorType: string, confidence: "very_low"|"low"|"medium", basedOn: string[] }}
 */
export function classifyErrorTypeV3(subjectId, mistakeEvent) {
  const ev = mistakeEvent && typeof mistakeEvent === "object" ? mistakeEvent : {};
  /** @type {string[]} */
  const basedOn = [];

  const tags = [
    ...(Array.isArray(ev.expectedErrorTags) ? ev.expectedErrorTags : []),
    ...(Array.isArray(ev.possibleErrorPatterns) ? ev.possibleErrorPatterns : []),
  ].map(String);

  for (const tag of tags) {
    const mapped = mapTagToErrorTypeV3(tag);
    if (mapped !== ERROR_TYPE_V3.UNKNOWN) {
      basedOn.push(`tag:${tag}`);
      return { errorType: mapped, confidence: "medium", basedOn };
    }
  }

  if (ev.distractorFamily) {
    basedOn.push("distractorFamily");
    return { errorType: ERROR_TYPE_V3.CONCEPTUAL, confidence: "low", basedOn };
  }

  if (ev.patternFamily) {
    basedOn.push(`patternFamily:${ev.patternFamily}`);
    const pf = String(ev.patternFamily).toLowerCase();
    if (pf.includes("read") || pf.includes("comprehension") || pf.includes("text")) {
      return { errorType: ERROR_TYPE_V3.READING, confidence: "low", basedOn };
    }
    if (pf.includes("vocab") || pf.includes("word_meaning")) {
      return { errorType: ERROR_TYPE_V3.VOCABULARY, confidence: "low", basedOn };
    }
    if (pf.includes("infer")) {
      return { errorType: ERROR_TYPE_V3.INFERENCE, confidence: "low", basedOn };
    }
    if (pf.includes("phonics") || pf.includes("spelling")) {
      return { errorType: ERROR_TYPE_V3.PHONICS, confidence: "low", basedOn };
    }
    return { errorType: ERROR_TYPE_V3.PROCEDURAL, confidence: "low", basedOn };
  }

  const respMs = Number(ev.responseMs);
  if (Number.isFinite(respMs) && respMs > 0) {
    basedOn.push(`responseMs:${respMs}`);
    if (respMs < FAST_WRONG_MS) {
      if (ev.hintUsed !== true && (ev.retryCount == null || Number(ev.retryCount) <= 1)) {
        return { errorType: ERROR_TYPE_V3.GUESSING, confidence: "low", basedOn };
      }
      return { errorType: ERROR_TYPE_V3.SPEED, confidence: "very_low", basedOn };
    }
    if (respMs > SLOW_MS && subjectId === "hebrew") {
      return { errorType: ERROR_TYPE_V3.READING, confidence: "very_low", basedOn };
    }
  }

  if (ev.hintUsed === true || (Number(ev.retryCount) || 0) >= 2) {
    basedOn.push("hint_or_retry");
    return { errorType: ERROR_TYPE_V3.PROCEDURAL, confidence: "very_low", basedOn };
  }

  if (V3_WAVE1_SUBJECT_IDS.includes(subjectId)) {
    const legacy = inferMisconceptionFromWrongAnswer({ subjectId, mistakeEvent: ev });
    const legacyType = String(legacy?.errorType || "");
    const mapped = mapTagToErrorTypeV3(legacyType);
    if (mapped !== ERROR_TYPE_V3.UNKNOWN && legacyType !== "insufficient_evidence") {
      basedOn.push(`legacy:${legacyType}`);
      const conf =
        legacy.confidence === "medium" ? "medium" : legacy.confidence === "low" ? "low" : "very_low";
      return { errorType: mapped, confidence: conf, basedOn };
    }
  }

  const topic = String(ev.topicOrOperation || ev.bucketKey || "").toLowerCase();
  if (subjectId === "english" && (topic.includes("vocabulary") || topic.includes("vocab"))) {
    basedOn.push("topic:vocabulary");
    return { errorType: ERROR_TYPE_V3.VOCABULARY, confidence: "very_low", basedOn };
  }
  if (
    (subjectId === "hebrew" || subjectId === "english") &&
    (topic.includes("comprehension") || topic.includes("reading"))
  ) {
    basedOn.push("topic:reading");
    return { errorType: ERROR_TYPE_V3.READING, confidence: "very_low", basedOn };
  }
  if (subjectId === "math" && (topic.includes("word") || topic.includes("problem"))) {
    basedOn.push("topic:word_problem");
    return { errorType: ERROR_TYPE_V3.READING, confidence: "very_low", basedOn };
  }

  return { errorType: ERROR_TYPE_V3.UNKNOWN, confidence: "very_low", basedOn };
}

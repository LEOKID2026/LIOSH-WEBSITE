/**
 * Q2-E.3 — Internal metadata confidence caps (parent context, flag-gated).
 * Caps internal grouping trust only; does not alter Q1 sufficiency thresholds.
 */

import { isFallbackOnlySkillId } from "./question-metadata-fallback.js";
import { normalizePossibleErrorPatterns } from "./question-metadata-error-patterns.js";
import { TOPIC_ROLLUP_TOKEN } from "./question-metadata-resolve-at-answer.js";

/** @type {Record<string, number>} */
const CAP_RANK = Object.freeze({ high: 3, medium: 2, low: 1 });

/**
 * @param {"high"|"medium"|"low"} a
 * @param {"high"|"medium"|"low"} b
 * @returns {"high"|"medium"|"low"}
 */
function minCap(a, b) {
  return CAP_RANK[a] <= CAP_RANK[b] ? a : b;
}

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {"high"|"medium"|"low"} cap
 * @returns {string}
 */
function effectiveLevelFromCap(cap) {
  if (cap === "low") return "insufficient_data";
  if (cap === "medium") return "low";
  return "moderate";
}

/**
 * @param {{
 *   metadataConfidence?: string|null,
 *   skillId?: string|null,
 *   subSkill?: string|null,
 *   possibleErrorPatterns?: string[]|null,
 *   groupingLevel?: "subSkill"|"topic"|string,
 *   groupKey?: string,
 *   questionType?: string|null,
 *   problemClass?: string|null,
 *   difficultyDepth?: string|null,
 * }} input
 * @returns {{
 *   metadataConfidenceCap: "high"|"medium"|"low",
 *   metadataConfidenceReason: string,
 *   effectiveConfidenceLevel: string,
 *   isMetadataWeak: boolean,
 * }}
 */
export function resolveMetadataConfidenceCap(input = {}) {
  let cap = /** @type {"high"|"medium"|"low"} */ ("high");
  /** @type {string[]} */
  const reasons = [];

  const conf = pickStr(input.metadataConfidence) || "low";
  const groupingLevel = pickStr(input.groupingLevel) || "topic";
  const groupKey = pickStr(input.groupKey);
  const isTopicRollup =
    groupingLevel === "topic" || groupKey.endsWith(`::${TOPIC_ROLLUP_TOKEN}`);
  const patterns = normalizePossibleErrorPatterns(input.possibleErrorPatterns);
  const hasSubSkill = Boolean(pickStr(input.subSkill));
  const fallbackSkill = isFallbackOnlySkillId(input.skillId);

  if (isTopicRollup) {
    cap = minCap(cap, "low");
    reasons.push("topic_level_rollup");
  }

  if (fallbackSkill) {
    cap = minCap(cap, "low");
    reasons.push("fallback_skill_id");
  }

  if (!hasSubSkill && groupingLevel === "subSkill") {
    cap = minCap(cap, "medium");
    reasons.push("missing_sub_skill");
  }

  if (conf === "low") {
    cap = minCap(cap, "low");
    reasons.push("metadata_confidence_low");
  } else if (conf === "medium") {
    cap = minCap(cap, "medium");
    reasons.push("metadata_confidence_medium");
  }

  if (patterns.length === 0 && conf !== "high") {
    cap = minCap(cap, "medium");
    reasons.push("missing_error_patterns");
  }

  const questionType = pickStr(input.questionType);
  if (
    Object.prototype.hasOwnProperty.call(input, "questionType") &&
    (!questionType || questionType === "unclassified" || questionType === "unknown")
  ) {
    cap = minCap(cap, "medium");
    reasons.push("missing_question_type");
  }

  const problemClass = pickStr(input.problemClass);
  if (
    Object.prototype.hasOwnProperty.call(input, "problemClass") &&
    (!problemClass || problemClass === "unclassified" || problemClass === "unknown")
  ) {
    cap = minCap(cap, "medium");
    reasons.push("missing_problem_class");
  }

  const difficultyDepth = pickStr(input.difficultyDepth);
  if (
    Object.prototype.hasOwnProperty.call(input, "difficultyDepth") &&
    (!difficultyDepth || difficultyDepth === "unclassified" || difficultyDepth === "unknown")
  ) {
    cap = minCap(cap, "medium");
    reasons.push("missing_difficulty_depth");
  }

  const isMetadataWeak =
    cap === "low" ||
    isTopicRollup ||
    fallbackSkill ||
    (Object.prototype.hasOwnProperty.call(input, "questionType") &&
      questionType === "unclassified") ||
    (Object.prototype.hasOwnProperty.call(input, "problemClass") &&
      problemClass === "unclassified") ||
    (Object.prototype.hasOwnProperty.call(input, "difficultyDepth") &&
      difficultyDepth === "unclassified");

  return {
    metadataConfidenceCap: cap,
    metadataConfidenceReason: reasons.length ? reasons.join("|") : "metadata_sufficient",
    effectiveConfidenceLevel: effectiveLevelFromCap(cap),
    isMetadataWeak,
  };
}

/**
 * @param {Record<string, unknown>} entry
 * @returns {Record<string, unknown>}
 */
function capFieldsForGroupEntry(entry) {
  const cap = resolveMetadataConfidenceCap({
    metadataConfidence: pickStr(entry.metadataConfidence) || null,
    skillId: pickStr(entry.skillId) || null,
    subSkill: pickStr(entry.subSkill) || null,
    possibleErrorPatterns: entry.possibleErrorPatterns,
    groupingLevel: pickStr(entry.groupingLevel) || "topic",
    groupKey: pickStr(entry.groupKey),
    questionType: pickStr(entry.questionType) || null,
  });
  return cap;
}

/**
 * Apply confidence caps to bySubSkill entries and nested errorPatterns.
 *
 * @param {Record<string, object>} bySubSkill
 * @returns {Record<string, object>}
 */
export function applyMetadataConfidenceCapsToBySubSkill(bySubSkill) {
  /** @type {Record<string, object>} */
  const out = {};

  for (const [groupKey, entry] of Object.entries(bySubSkill || {})) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ ({ ...entry, groupKey });
    const capFields = capFieldsForGroupEntry(row);

    /** @type {Record<string, object>} */
    let errorPatterns = row.errorPatterns && typeof row.errorPatterns === "object"
      ? /** @type {Record<string, object>} */ ({ ...row.errorPatterns })
      : undefined;

    if (errorPatterns) {
      for (const [patternKey, patternEntry] of Object.entries(errorPatterns)) {
        if (!patternEntry || typeof patternEntry !== "object") continue;
        errorPatterns[patternKey] = {
          ...patternEntry,
          ...capFields,
          patternConfidenceCapped: capFields.isMetadataWeak === true,
        };
      }
    }

    out[groupKey] = {
      ...row,
      ...capFields,
      ...(errorPatterns ? { errorPatterns } : {}),
    };
  }

  return out;
}

/**
 * Apply confidence caps to global error-pattern summaries.
 *
 * @param {Record<string, object>|undefined} errorPatterns
 * @param {Record<string, object>} bySubSkill
 * @returns {Record<string, object>|undefined}
 */
export function applyMetadataConfidenceCapsToErrorPatterns(errorPatterns, bySubSkill) {
  if (!errorPatterns || typeof errorPatterns !== "object") return errorPatterns;

  /** @type {Record<string, object>} */
  const out = {};

  for (const [key, entry] of Object.entries(errorPatterns)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    const groupKey = pickStr(row.subSkillGroupKey);
    const parentGroup = groupKey && bySubSkill[groupKey] ? bySubSkill[groupKey] : null;

    const capFields = parentGroup
      ? {
          metadataConfidenceCap: parentGroup.metadataConfidenceCap,
          metadataConfidenceReason: parentGroup.metadataConfidenceReason,
          effectiveConfidenceLevel: parentGroup.effectiveConfidenceLevel,
          isMetadataWeak: parentGroup.isMetadataWeak,
        }
      : resolveMetadataConfidenceCap({
          metadataConfidence: "low",
          skillId: null,
          subSkill: null,
          possibleErrorPatterns: [pickStr(row.pattern)],
          groupingLevel: "topic",
          groupKey,
        });

    out[key] = {
      ...row,
      ...capFields,
      patternConfidenceCapped: capFields.isMetadataWeak === true,
    };
  }

  return out;
}

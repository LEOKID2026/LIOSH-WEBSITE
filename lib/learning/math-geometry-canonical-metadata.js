/**
 * Q2-C1 — Attach canonical question metadata to math/geometry generator output.
 * Additive only; does not change classification, reports, or evidence quality.
 *
 * @see docs/diagnostics/QUESTION_METADATA_CONTRACT.md
 */

import {
  normalizeQuestionMetadata,
  normalizeDifficultyBand,
  QUESTION_METADATA_CONTRACT_VERSION,
} from "./question-metadata-normalizer.js";

/**
 * @param {unknown} v
 * @returns {string}
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function mapLegacyDifficultyToContract(raw) {
  const x = pickStr(raw).toLowerCase();
  if (x === "standard") return "medium";
  if (x === "advanced" || x === "challenge") return "hard";
  return normalizeDifficultyBand(raw);
}

/**
 * @param {Record<string, unknown>} params
 * @param {string} [selectedOp]
 * @returns {"conceptual"|"procedural"|"mixed"}
 */
export function inferMathProblemClass(params, selectedOp = "") {
  const kind = pickStr(params.kind);
  const op = pickStr(selectedOp);
  if (kind.includes("probe") || kind.startsWith("frac_probe") || kind.startsWith("dec_probe")) {
    return "conceptual";
  }
  if (pickStr(params.probePower)) return "conceptual";
  if (kind.startsWith("wp_") || op === "word_problems") return "mixed";
  return "procedural";
}

/**
 * @param {Record<string, unknown>} params
 * @returns {"conceptual"|"procedural"|"mixed"}
 */
export function inferGeometryProblemClass(params) {
  const kind = pickStr(params.kind);
  if (kind.startsWith("story_")) return "mixed";
  if (
    kind.includes("conceptual") ||
    kind.startsWith("shapes_basic") ||
    pickStr(params.conceptTag).includes("concept")
  ) {
    return "conceptual";
  }
  return "procedural";
}

/**
 * @param {Record<string, unknown>} canonical
 * @returns {"high"|"medium"|"low"}
 */
function computeGenerationMetadataConfidence(canonical) {
  const skillId = pickStr(canonical.skillId);
  const subSkill = pickStr(canonical.subSkill);
  const patterns = canonical.possibleErrorPatterns;
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0;
  if (skillId && subSkill && hasPatterns) return "high";
  if (skillId && subSkill) return "medium";
  return "low";
}

/**
 * @param {Record<string, unknown>} canonical
 * @param {Record<string, unknown>} params
 * @param {"math"|"geometry"} subject
 * @param {string} [selectedOp]
 */
function resolveProblemClass(canonical, params, subject, selectedOp) {
  if (canonical.problemClass) return canonical.problemClass;
  return subject === "geometry"
    ? inferGeometryProblemClass(params)
    : inferMathProblemClass(params, selectedOp);
}

/**
 * Attach `params.canonicalMetadata` and mirror key contract aliases on the question object.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{
 *   subject: "math"|"geometry",
 *   gradeKey?: string|null,
 *   levelKey?: string|null,
 *   topic?: string|null,
 *   selectedOp?: string|null,
 * }} ctx
 * @returns {Record<string, unknown>}
 */
export function attachCanonicalMetadataToMathGeometryQuestion(question, ctx) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return question || {};
  }

  const subject = ctx.subject === "geometry" ? "geometry" : "math";
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? { ...question.params }
      : {};

  const gradeKey = pickStr(ctx.gradeKey) || pickStr(question.grade) || pickStr(params.grade) || null;
  const topic =
    pickStr(question.topic) || pickStr(ctx.topic) || pickStr(params.topic) || null;
  const selectedOp = pickStr(ctx.selectedOp) || pickStr(question.operation) || "";

  const synthEngine = {
    questionType: "mcq",
    skillId:
      pickStr(params.diagnosticSkillId) ||
      pickStr(question.skillId) ||
      pickStr(question.skill_key) ||
      null,
    subtopic:
      pickStr(params.subtype) ||
      pickStr(question.subskillId) ||
      pickStr(question.subtopic) ||
      null,
  };

  const normalized = normalizeQuestionMetadata({
    ...question,
    subject,
    topic,
    grade: gradeKey,
    params,
    type: pickStr(question.type) || "mcq",
    questionEngine:
      question.questionEngine && typeof question.questionEngine === "object"
        ? question.questionEngine
        : synthEngine,
  });

  /** @type {Record<string, unknown>} */
  const resolvedSkillId =
    pickStr(normalized.skillId) ||
    pickStr(params.diagnosticSkillId) ||
    pickStr(question.skillId) ||
    (pickStr(params.kind) ? `${subject === "geometry" ? "geo" : "math"}_${pickStr(params.kind)}` : null) ||
    (subject === "geometry" ? "geo_general" : "math_general");

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: normalized.subject || subject,
    topic: normalized.topic || topic,
    grade: normalized.grade || gradeKey,
    skillId: resolvedSkillId,
    subSkill: normalized.subSkill || null,
    questionType: normalized.questionType || (subject === "geometry" ? "diagram" : "technical"),
    problemClass: resolveProblemClass(normalized, params, subject, selectedOp),
    difficulty:
      normalized.difficulty ||
      mapLegacyDifficultyToContract(question.difficulty) ||
      mapLegacyDifficultyToContract(params.difficulty) ||
      (ctx.levelKey ? mapLegacyDifficultyToContract(ctx.levelKey) : null),
    difficultyDepth: normalized.difficultyDepth || null,
    requiresVisual:
      normalized.requiresVisual === true ||
      (subject === "geometry" && (question.shape != null || pickStr(params.kind) !== "")),
    requiresAudio: normalized.requiresAudio === true,
    answerFormat: normalized.answerFormat || "mcq",
    metadataConfidence:
      normalized.metadataConfidence || computeGenerationMetadataConfidence(normalized),
    diagnosticEligibleByMetadata: normalized.diagnosticEligibleByMetadata === true,
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: normalized.notes || null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...question,
    subject,
    topic: topic || question.topic,
    grade: gradeKey || question.grade,
    skillId: canonicalMetadata.skillId || question.skillId,
    subSkill: canonicalMetadata.subSkill || question.subSkill || question.subskillId,
    params,
  };
}

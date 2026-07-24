/**
 * Question skill metadata V1 — normalized diagnostic tagging for generated/bank questions.
 * Pure resolution + optional merge; does not mutate generators unless callers opt in.
 *
 * @module utils/learning-diagnostics/question-skill-metadata-v1
 */

import {
  SKILL_PACK_BY_SUBJECT_ID,
  SKILL_RESOLVER_BY_SUBJECT_ID,
} from "./diagnostic-framework-v1.js";

export const QUESTION_SKILL_METADATA_V1 = "1.0.0";

/** @type {const} */
export const COGNITIVE_LEVELS = ["recall", "understanding", "application", "reasoning", "multi_step"];

/** @type {const} */
export const ANSWER_TYPES = [
  "mcq",
  "numeric",
  "text",
  "ordering",
  "matching",
  "true_false",
  "unknown",
];

/**
 * @typedef {object} QuestionSkillMetadataV1
 * @property {string} subjectId
 * @property {string} topicId
 * @property {string} skillId
 * @property {string} subskillId
 * @property {number} grade
 * @property {string} level
 * @property {string} difficulty
 * @property {string} cognitiveLevel
 * @property {string[]} expectedErrorTypes
 * @property {string[]} prerequisiteSkillIds
 * @property {string} answerType
 * @property {string} generatorId
 * @property {string} branchId
 * @property {string} version
 * @property {string[]} [missingFields] — reported when resolution used fallbacks
 * @property {string[]} [warnings]
 */

const DEFAULT_VERSION = QUESTION_SKILL_METADATA_V1;

function numGrade(gradeKey) {
  const n = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(6, Math.max(1, n));
}

function canonicalSubjectId(adapterSubject) {
  const s = String(adapterSubject || "").toLowerCase();
  if (s === "moledet_geography" || s === "moledet-geography") return "moledet-geography";
  return s;
}

/**
 * Pick first subskill for a skill from skill pack, or "general".
 * @param {string} subjectId
 * @param {string} skillId
 * @param {string} [hint] — e.g. params.subtype
 */
function defaultSubskillId(subjectId, skillId, hint) {
  const pack = SKILL_PACK_BY_SUBJECT_ID[subjectId]?.[skillId];
  const subskills = pack?.subskills;
  if (hint && subskills?.includes(hint)) return hint;
  if (subskills?.length) return subskills[0];
  return "general";
}

function inferCognitiveLevel(params, answerType) {
  const kind = String(params?.kind || "").toLowerCase();
  const probePower = String(params?.probePower || "");
  if (kind.includes("word_problem") || kind.includes("story") || answerType === "multi_step")
    return "multi_step";
  if (kind.includes("compare") || kind.includes("inference") || kind.includes("experiment")) return "reasoning";
  if (kind.includes("read") || kind.includes("comprehen")) return "understanding";
  if (params?.diagnosticSkillId && String(params.diagnosticSkillId).includes("recall")) return "recall";
  return "application";
}

function inferAnswerType(q) {
  if (q?.qType === "typing" || String(q?.params?.answerMode || "").toLowerCase() === "text") return "text";
  const answers = q?.answers ?? q?.options;
  if (Array.isArray(answers) && answers.length >= 2) {
    const tf =
      answers.length === 2 &&
      answers.every((a) => /^(true|false|כן|לא|נכון|שגוי)$/i.test(String(a).trim()));
    if (tf) return "true_false";
    return "mcq";
  }
  if (typeof q?.correctAnswer === "number" && (!answers || answers.length === 0)) return "numeric";
  return "unknown";
}

function inferDifficulty(params, levelKey) {
  const band = params?.difficultyBand || params?.difficulty;
  if (band === "low" || band === "easy") return "easy";
  if (band === "high" || band === "hard") return "hard";
  if (band === "medium") return "medium";
  const lv = String(levelKey || params?.levelKey || params?.uiLevel || "").toLowerCase();
  if (lv === "easy" || lv === "1") return "easy";
  if (lv === "hard" || lv === "2" || lv === "3") return "hard";
  if (lv === "medium") return "medium";
  return "medium";
}

/**
 * Map topic/operation to skillId using same heuristics as framework bucket resolvers.
 * @param {string} subjectId
 * @param {string} topicKey — operation, topic, or params.kind
 */
function topicToBucketKey(subjectId, topicKey) {
  return String(topicKey || "general");
}

/**
 * Build full metadata for a question object (generator or bank-normalized).
 *
 * @param {object} question — raw question from generator or bank
 * @param {object} context
 * @param {string} context.subjectCanonical — matrix adapter id (e.g. moledet_geography)
 * @param {string} [context.grade] — g1..g6
 * @param {string} [context.level] — easy|medium|hard
 * @param {string} [context.topic] — matrix topic
 */
export function buildQuestionSkillMetadataV1(question, context = {}) {
  const subjectId = canonicalSubjectId(context.subjectCanonical);
  const params = question?.params && typeof question.params === "object" ? question.params : {};
  const topicFromQ =
    question?.operation ?? question?.topic ?? params?.kind ?? context.topic ?? "unknown";
  const topicId = String(topicFromQ);

  const bucketKey = topicToBucketKey(subjectId, topicId);
  const resolver = SKILL_RESOLVER_BY_SUBJECT_ID[subjectId];
  const skillId = resolver ? resolver(bucketKey) : "general";

  const subHint =
    params?.subtype ||
    params?.diagnosticSkillId ||
    params?.patternFamily ||
    null;
  const subskillId = defaultSubskillId(
    subjectId,
    skillId,
    subHint && String(subHint).replace(/[^a-z0-9_]/gi, "_").toLowerCase()
  );

  const grade = numGrade(context.grade ?? params?.gradeKey ?? params?.grade);
  const level = String(context.level ?? params?.levelKey ?? params?.uiLevel ?? "medium").toLowerCase();
  const answerType = inferAnswerType(question);
  const cognitiveLevel = inferCognitiveLevel(params, answerType);
  const difficulty = inferDifficulty(params, level);

  const expectedFromParams = params?.expectedErrorTypes || params?.expectedErrorTags;
  const expectedErrorTypes = Array.isArray(expectedFromParams)
    ? expectedFromParams.map(String).filter(Boolean)
    : [];

  const prereq =
    params?.prerequisiteSkillIds ?? question?.prerequisiteSkillIds;
  const prerequisiteSkillIds = Array.isArray(prereq) ? prereq.map(String).filter(Boolean) : [];

  const generatorId =
    params?.sourceTrace?.generatorId ||
    params?.source ||
    (question?._scienceBankId
      ? "science-bank"
      : question?._englishBank
        ? "english-pools"
        : `${subjectId}-generator`);

  const branchId = String(params?.kind || params?.branchId || topicId);

  const missingFields = [];
  if (!context.grade && !params?.grade && !params?.gradeKey) missingFields.push("grade");
  if (!context.level && !params?.levelKey) missingFields.push("level");
  if (expectedErrorTypes.length === 0) missingFields.push("expectedErrorTypes");
  if (prerequisiteSkillIds.length === 0) missingFields.push("prerequisiteSkillIds");

  const warnings = [];
  if (subskillId === "general" && !subHint) {
    warnings.push("subskill_fallback_default");
  }
  if (answerType === "unknown") {
    warnings.push("answerType_unknown");
  }

  /** @type {QuestionSkillMetadataV1} */
  const out = {
    subjectId,
    topicId,
    skillId,
    subskillId,
    grade,
    level,
    difficulty,
    cognitiveLevel,
    expectedErrorTypes,
    prerequisiteSkillIds,
    answerType,
    generatorId,
    branchId,
    version: DEFAULT_VERSION,
  };

  if (missingFields.length) out.missingFields = missingFields;
  if (warnings.length) out.warnings = warnings;

  return out;
}

/**
 * Optional: merge metadata into question.params (additive keys with qsmV1 prefix to avoid collisions).
 * @param {object} question
 * @param {object} context
 * @returns {object} new question with merged params
 */
export function mergeQuestionSkillMetadataIntoParams(question, context) {
  if (!question || typeof question !== "object") return question;
  const meta = buildQuestionSkillMetadataV1(question, context);
  const base = question.params && typeof question.params === "object" ? { ...question.params } : {};
  return {
    ...question,
    params: {
      ...base,
      qsmV1: {
        subjectId: meta.subjectId,
        topicId: meta.topicId,
        skillId: meta.skillId,
        subskillId: meta.subskillId,
        grade: meta.grade,
        level: meta.level,
        difficulty: meta.difficulty,
        cognitiveLevel: meta.cognitiveLevel,
        expectedErrorTypes: meta.expectedErrorTypes,
        prerequisiteSkillIds: meta.prerequisiteSkillIds,
        answerType: meta.answerType,
        generatorId: meta.generatorId,
        branchId: meta.branchId,
        version: meta.version,
      },
    },
  };
}

export { SKILL_PACK_BY_SUBJECT_ID, SKILL_RESOLVER_BY_SUBJECT_ID };

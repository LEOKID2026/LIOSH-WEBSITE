/**
 * Q2-C5 — Attach canonical metadata to Moledet/Geography bank rows and generator output.
 * Additive only; no classification, report, or evidence-quality changes.
 *
 * @see docs/diagnostics/QUESTION_METADATA_CONTRACT.md
 */

import {
  normalizeQuestionMetadata,
  normalizeDifficultyBand,
  QUESTION_METADATA_CONTRACT_VERSION,
} from "./question-metadata-normalizer.js";
import { moledetDiagnosticContractFromBankRow } from "../../utils/moledet-geography-diagnostic-metadata-bridge.js";
import { mergeDiagnosticContractIntoParams } from "../../utils/diagnostic-question-contract.js";

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
 * @param {string} raw
 * @returns {string}
 */
function sanitizeIdSegment(raw) {
  const s = pickStr(raw);
  if (!s) return "";
  return s
    .replace(/\./g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [row]
 * @returns {boolean}
 */
export function isMoledetEmptyPool(params, row = null) {
  const r = row && typeof row === "object" ? row : {};
  if (r.emptyPool === true) return true;
  return pickStr(params.poolFallbackCode) === "empty_pool";
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveMoledetSkillId(topic, params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  const explicit =
    pickStr(params.diagnosticSkillId) ||
    pickStr(row.diagnosticSkillId) ||
    pickStr(row.skillId) ||
    pickStr(params.skillId);
  if (explicit) return explicit;

  const t = pickStr(topic).toLowerCase() || "homeland";
  const subtopicId = sanitizeIdSegment(
    pickStr(params.subtopicId) || pickStr(row.subtopicId)
  );
  const subtype = sanitizeIdSegment(pickStr(params.subtype) || pickStr(row.subtype));

  if (subtopicId) return `moledet_geo_${t}_${subtopicId}`;
  if (subtype) return `moledet_geo_${t}_${subtype}`;
  return `moledet_geo_${t}_general`;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveMoledetSubSkill(params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  return (
    pickStr(params.conceptTag) ||
    pickStr(row.conceptTag) ||
    pickStr(params.subtype) ||
    pickStr(row.subtype) ||
    pickStr(params.patternFamily) ||
    pickStr(row.patternFamily) ||
    pickStr(params.subtopicId) ||
    pickStr(row.subtopicId) ||
    null
  );
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function inferMoledetQuestionType(topic, params, sourceRow = null) {
  if (isMoledetEmptyPool(params, sourceRow)) return null;

  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  if (deriveMoledetRequiresVisual(params, row)) return "visual";

  const tagBlob = [
    ...(Array.isArray(params.expectedErrorTags) ? params.expectedErrorTags : []),
    ...(Array.isArray(params.expectedErrorTypes) ? params.expectedErrorTypes : []),
    ...(Array.isArray(row.expectedErrorTags) ? row.expectedErrorTags : []),
    ...(Array.isArray(row.expectedErrorTypes) ? row.expectedErrorTypes : []),
  ]
    .map((t) => String(t).toLowerCase())
    .join(" ");

  if (tagBlob.includes("vocabulary_confusion") || tagBlob.includes("vocabulary")) {
    return "vocabulary";
  }
  if (
    tagBlob.includes("reading_comprehension") ||
    tagBlob.includes("map_reading") ||
    tagBlob.includes("direction_confusion")
  ) {
    return "reading_comprehension";
  }

  const t = pickStr(topic).toLowerCase();
  const cog = pickStr(params.cognitiveLevel || row.cognitiveLevel).toLowerCase();

  if (t === "maps") return "reading_comprehension";
  if (cog === "recall") return "technical";
  if (cog === "understanding" || cog === "application") return "reading_comprehension";
  return null;
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {"conceptual"|"procedural"|"mixed"|null}
 */
export function inferMoledetProblemClass(topic, params, sourceRow = null) {
  if (isMoledetEmptyPool(params, sourceRow)) return null;

  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  const cog = pickStr(params.cognitiveLevel || row.cognitiveLevel).toLowerCase();
  const t = pickStr(topic).toLowerCase();

  if (cog === "application" || cog === "analysis") return "mixed";
  if (t === "maps" || t === "citizenship" || t === "values") return "mixed";
  if (cog === "recall" || cog === "understanding") return "conceptual";
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} sourceRow
 * @returns {boolean}
 */
export function deriveMoledetRequiresVisual(params, sourceRow) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  if (params.requiresVisual === true || row.requiresVisual === true) return true;
  if (row.imageUrl != null || row.diagram != null || row.mapUrl != null) return true;
  if (row.shape != null && pickStr(row.shape)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} question
 * @returns {"mcq"|"text"|null}
 */
export function mapMoledetAnswerFormat(question) {
  const mode =
    pickStr(question.answerMode) ||
    pickStr(
      question.params && typeof question.params === "object" ? question.params.answerMode : ""
    );
  if (mode === "typing" || mode === "text" || mode === "open") return "text";
  return "mcq";
}

/**
 * @param {Record<string, unknown>} canonical
 * @param {Record<string, unknown>} params
 * @returns {"high"|"medium"|"low"}
 */
function computeMoledetMetadataConfidence(canonical, params) {
  if (isMoledetEmptyPool(params)) return "low";

  const skillId = pickStr(canonical.skillId);
  const subSkill = pickStr(canonical.subSkill);
  const patterns = canonical.possibleErrorPatterns;
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0;
  const hasExplicitDiagnostic = Boolean(pickStr(params.diagnosticSkillId));
  const isTopicOnlySkill = /^moledet_geo_[a-z_]+$/.test(skillId) && !skillId.includes("_g");

  if (hasExplicitDiagnostic && subSkill && hasPatterns) return "high";
  if (hasExplicitDiagnostic && subSkill) return "medium";
  if (skillId && subSkill && hasPatterns) return "medium";
  if (skillId && subSkill) return "low";
  if (skillId) return "low";
  return "low";
}

/**
 * @param {string|null} skillId
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function computeMoledetDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  if (isMoledetEmptyPool(params)) return false;
  if (pickStr(params.kind) === "book_context") return false;
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ topic?: string, gradeKey?: string|null, levelKey?: string|null }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichMoledetBankRowWithCanonicalMetadata(row, ctx = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return /** @type {Record<string, unknown>} */ (row || {});
  }

  if (
    row.params &&
    typeof row.params === "object" &&
    !Array.isArray(row.params) &&
    row.params.canonicalMetadata &&
    typeof row.params.canonicalMetadata === "object"
  ) {
    return row;
  }

  const topic = pickStr(ctx.topic) || pickStr(row.topic) || "homeland";
  const diag = moledetDiagnosticContractFromBankRow(row, topic);

  /** @type {Record<string, unknown>} */
  const params = {
    kind: topic,
    patternFamily: diag.patternFamily,
    conceptTag: diag.conceptTag,
    diagnosticSkillId: diag.diagnosticSkillId,
    subtype: diag.subtype || row.subtype,
    cognitiveLevel: row.cognitiveLevel,
    difficulty: row.difficulty,
    expectedErrorTags: diag.expectedErrorTags,
    expectedErrorTypes: row.expectedErrorTypes,
    probePower: diag.probePower,
    subtopicId: row.subtopicId,
    bookPageId: row.bookPageId,
  };

  const skillId = resolveMoledetSkillId(topic, params, row);
  const subSkill = resolveMoledetSubSkill(params, row);
  if (!pickStr(params.diagnosticSkillId) && skillId) params.diagnosticSkillId = skillId;

  const questionType = inferMoledetQuestionType(topic, params, row);
  const normalized = normalizeQuestionMetadata({
    subject: "moledet_geography",
    topic,
    grade: pickStr(ctx.gradeKey),
    params,
    type: "mcq",
    questionEngine: {
      questionType: questionType || "mcq",
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferMoledetProblemClass(topic, params, row);

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: "moledet_geography",
    topic,
    grade: pickStr(ctx.gradeKey) || normalized.grade || null,
    skillId: normalized.skillId || skillId || null,
    subSkill: normalized.subSkill || subSkill || null,
    ...(questionType ? { questionType } : {}),
    ...(problemClass ? { problemClass } : {}),
    difficulty:
      normalized.difficulty ||
      mapLegacyDifficultyToContract(row.difficulty) ||
      mapLegacyDifficultyToContract(ctx.levelKey),
    difficultyDepth: normalized.difficultyDepth || null,
    requiresVisual: deriveMoledetRequiresVisual(params, row),
    requiresAudio: false,
    answerFormat: "mcq",
    metadataConfidence: computeMoledetMetadataConfidence(
      {
        skillId: normalized.skillId || skillId,
        subSkill: normalized.subSkill || subSkill,
        possibleErrorPatterns: normalized.possibleErrorPatterns,
      },
      params
    ),
    diagnosticEligibleByMetadata: computeMoledetDiagnosticEligibleByMetadataHint(
      normalized.skillId || skillId,
      params
    ),
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...row,
    params,
    skillId: canonicalMetadata.skillId,
    subSkill: canonicalMetadata.subSkill,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} pool
 * @returns {Record<string, unknown[]>}
 */
export function enrichMoledetGradeQuestionsPool(pool) {
  if (!pool || typeof pool !== "object" || Array.isArray(pool)) return {};
  /** @type {Record<string, unknown[]>} */
  const out = {};
  for (const [topicKey, rows] of Object.entries(pool)) {
    if (!Array.isArray(rows)) {
      out[topicKey] = rows;
      continue;
    }
    out[topicKey] = rows.map((row) =>
      enrichMoledetBankRowWithCanonicalMetadata(
        row && typeof row === "object" ? row : {},
        { topic: topicKey }
      )
    );
  }
  return out;
}

/**
 * Build full diagnostic `params` for assigned-activity freeze (Q2-C5 preservation fix).
 *
 * @param {Record<string, unknown>} row
 * @param {string} topicKey
 * @param {string} gradeKey
 * @param {string} levelKey
 * @returns {Record<string, unknown>}
 */
export function buildMoledetFrozenParamsFromBankRow(row, topicKey, gradeKey, levelKey) {
  const enriched = enrichMoledetBankRowWithCanonicalMetadata(row, {
    topic: topicKey,
    gradeKey,
    levelKey,
  });
  const diag = moledetDiagnosticContractFromBankRow(enriched, topicKey);
  const base =
    enriched.params && typeof enriched.params === "object" && !Array.isArray(enriched.params)
      ? { ...enriched.params }
      : {};

  return mergeDiagnosticContractIntoParams(
    {
      ...base,
      kind: topicKey,
      grade: gradeKey,
      gradeKey,
      levelKey,
      cognitiveLevel: enriched.cognitiveLevel ?? row.cognitiveLevel,
      difficulty: enriched.difficulty ?? row.difficulty,
    },
    diag
  );
}

/**
 * Attach `params.canonicalMetadata` to a Moledet generator question object.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{
 *   topic?: string,
 *   gradeKey?: string|null,
 *   levelKey?: string|null,
 *   sourceRow?: Record<string, unknown>|null,
 * }} ctx
 * @returns {Record<string, unknown>}
 */
export function attachCanonicalMetadataToMoledetQuestion(question, ctx = {}) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return question || {};
  }

  if (question.emptyPool === true) {
    const params =
      question.params && typeof question.params === "object" && !Array.isArray(question.params)
        ? { ...question.params, poolFallbackCode: "empty_pool" }
        : { poolFallbackCode: "empty_pool" };
    params.canonicalMetadata = {
      contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
      subject: "moledet_geography",
      topic: pickStr(ctx.topic) || null,
      grade: pickStr(ctx.gradeKey) || null,
      skillId: null,
      subSkill: null,
      difficulty: null,
      difficultyDepth: null,
      requiresVisual: false,
      requiresAudio: false,
      answerFormat: "mcq",
      metadataConfidence: "low",
      diagnosticEligibleByMetadata: false,
      possibleErrorPatterns: null,
      notes: null,
    };
    return { ...question, params };
  }

  if (
    question.params &&
    typeof question.params === "object" &&
    !Array.isArray(question.params) &&
    question.params.canonicalMetadata &&
    typeof question.params.canonicalMetadata === "object"
  ) {
    return question;
  }

  const topic = pickStr(question.topic) || pickStr(ctx.topic) || "homeland";
  const sourceRow = ctx.sourceRow && typeof ctx.sourceRow === "object" ? ctx.sourceRow : null;
  const enriched = enrichMoledetBankRowWithCanonicalMetadata(sourceRow || {}, {
    topic,
    gradeKey: ctx.gradeKey,
    levelKey: ctx.levelKey,
  });

  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? { ...question.params }
      : {};

  if (enriched.params?.canonicalMetadata) {
    params.canonicalMetadata = enriched.params.canonicalMetadata;
    if (!pickStr(params.diagnosticSkillId) && enriched.params.diagnosticSkillId) {
      params.diagnosticSkillId = enriched.params.diagnosticSkillId;
    }
  }

  const answerFormat = mapMoledetAnswerFormat(question);

  return {
    ...question,
    subject: "moledet_geography",
    topic,
    skillId: params.canonicalMetadata?.skillId,
    subSkill: params.canonicalMetadata?.subSkill,
    params,
  };
}

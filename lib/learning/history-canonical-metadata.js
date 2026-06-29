/**
 * Attach canonical metadata to History static bank rows.
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
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function inferHistoryQuestionType(row, params) {
  const explicit =
    pickStr(row.questionType) ||
    pickStr(row.suggestedQuestionType) ||
    pickStr(params.suggestedQuestionType);
  if (explicit && !["mcq", "unknown"].includes(explicit.toLowerCase())) {
    return explicit;
  }

  const tagBlob = [
    ...(Array.isArray(params.expectedErrorTags) ? params.expectedErrorTags : []),
    ...(Array.isArray(params.expectedErrorTypes) ? params.expectedErrorTypes : []),
    ...(Array.isArray(row.expectedErrorTags) ? row.expectedErrorTags : []),
  ]
    .map((t) => String(t).toLowerCase())
    .join(" ");

  if (tagBlob.includes("reading_comprehension") || tagBlob.includes("source_reading")) {
    return "reading_comprehension";
  }
  if (tagBlob.includes("timeline") || tagBlob.includes("sequence")) {
    return "technical";
  }

  if (
    row.passage != null ||
    row.passageText != null ||
    params.passageVisible === true ||
    params.sourceExcerpt != null
  ) {
    return "reading_comprehension";
  }

  return "technical";
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>} row
 * @returns {"conceptual"|"procedural"|"mixed"|null}
 */
export function inferHistoryProblemClass(params, row) {
  const skill = pickStr(params.diagnosticSkillId) || pickStr(row.skillId);
  if (skill.includes("comparison") || skill.includes("cause_effect")) return "mixed";

  const cog = pickStr(params.cognitiveLevel).toLowerCase();
  if (cog === "application" || cog === "analysis" || cog === "evaluation") return "mixed";
  if (cog === "recall" || cog === "understanding") return "conceptual";

  const probe = pickStr(params.probePower).toLowerCase();
  if (probe === "high") return "conceptual";

  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function deriveHistoryRequiresVisual(row, params) {
  if (row.requiresVisual === true || params.requiresVisual === true) return true;
  if (row.imageUrl != null || row.diagram != null || row.visualAsset != null) return true;
  if (pickStr(params.patternFamily).includes("map") || pickStr(params.patternFamily).includes("timeline")) {
    return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {boolean}
 */
export function deriveHistoryRequiresAudio(row) {
  const t = pickStr(row.type) || pickStr(row.questionType);
  return t.toLowerCase() === "audio";
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} params
 * @returns {string|null}
 */
function resolveHistorySkillId(row, params) {
  return (
    pickStr(params.diagnosticSkillId) ||
    pickStr(row.diagnosticSkillId) ||
    pickStr(row.skillId) ||
    pickStr(row.skillKey) ||
    (pickStr(row.topic) ? `hist_${pickStr(row.topic)}_general` : null)
  );
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>} row
 * @returns {string|null}
 */
function resolveHistorySubSkill(params, row) {
  return (
    pickStr(params.subskillId) ||
    pickStr(params.subtype) ||
    pickStr(params.subtopicKey) ||
    pickStr(row.subtopicKey) ||
    pickStr(params.conceptTag) ||
    pickStr(params.patternFamily) ||
    (pickStr(row.topic) ? `hist_${pickStr(row.topic)}_general` : null)
  );
}

/**
 * @param {Record<string, unknown>} canonical
 * @returns {"high"|"medium"|"low"}
 */
function computeHistoryMetadataConfidence(canonical) {
  const skillId = pickStr(canonical.skillId);
  const subSkill = pickStr(canonical.subSkill);
  const patterns = canonical.possibleErrorPatterns;
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0;
  if (skillId && subSkill && hasPatterns) return "high";
  if (skillId && subSkill) return "medium";
  return "low";
}

/**
 * @param {string|null} skillId
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function computeHistoryDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  if (pickStr(params.kind) === "book_context") return false;
  return true;
}

/**
 * @param {unknown} rowType
 * @returns {"mcq"|"numeric"|"text"|null}
 */
export function mapHistoryRowTypeToAnswerFormat(rowType) {
  const t = pickStr(rowType).toLowerCase();
  if (t === "mcq" || t === "multiple_choice") return "mcq";
  if (t === "numeric" || t === "number") return "numeric";
  if (t === "open" || t === "text") return "text";
  if (!t) return "mcq";
  return "mcq";
}

/**
 * Enrich a history bank row with `params.canonicalMetadata` (pure, idempotent).
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ gradeKey?: string|null, levelKey?: string|null }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichHistoryBankRowWithCanonicalMetadata(row, ctx = {}) {
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

  const params =
    row.params && typeof row.params === "object" && !Array.isArray(row.params)
      ? { ...row.params }
      : {};

  const skillId = resolveHistorySkillId(row, params);
  const subSkill = resolveHistorySubSkill(params, row);
  if (!pickStr(params.diagnosticSkillId) && skillId) params.diagnosticSkillId = skillId;
  if (!pickStr(params.subskillId) && subSkill) params.subskillId = subSkill;
  if (!pickStr(params.subtype) && subSkill) params.subtype = subSkill;

  const gradeKey =
    pickStr(ctx.gradeKey) || (Array.isArray(row.grades) ? pickStr(row.grades[0]) : null);
  const levelKey = pickStr(ctx.levelKey) || pickStr(row.minLevel) || pickStr(row.maxLevel) || null;

  const normalized = normalizeQuestionMetadata({
    ...row,
    subject: "history",
    topic: pickStr(row.topic),
    grade: gradeKey,
    type: pickStr(row.type) || "mcq",
    params,
    questionEngine: {
      questionType: mapHistoryRowTypeToAnswerFormat(row.type) || "mcq",
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferHistoryProblemClass(params, row);
  const questionType = inferHistoryQuestionType(row, params);

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: "history",
    topic: pickStr(row.topic) || normalized.topic || null,
    grade: gradeKey || normalized.grade || null,
    skillId: normalized.skillId || skillId || null,
    subSkill: normalized.subSkill || subSkill || null,
    questionType,
    ...(problemClass ? { problemClass } : {}),
    difficulty:
      normalized.difficulty ||
      mapLegacyDifficultyToContract(params.difficulty) ||
      mapLegacyDifficultyToContract(levelKey),
    difficultyDepth: normalized.difficultyDepth || null,
    requiresVisual: deriveHistoryRequiresVisual(row, params),
    requiresAudio: deriveHistoryRequiresAudio(row),
    answerFormat: mapHistoryRowTypeToAnswerFormat(row.type),
    metadataConfidence:
      normalized.metadataConfidence || computeHistoryMetadataConfidence(normalized),
    diagnosticEligibleByMetadata: computeHistoryDiagnosticEligibleByMetadataHint(
      normalized.skillId || skillId,
      params
    ),
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: pickStr(params.explanationHe) || pickStr(row.explanation) || null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...row,
    params,
    subSkill: canonicalMetadata.subSkill,
    skillId: canonicalMetadata.skillId,
  };
}

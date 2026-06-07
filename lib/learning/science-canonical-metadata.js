/**
 * Q2-C2 — Attach canonical metadata to Science static bank rows.
 * Additive only; no classification, report, or evidence-quality changes.
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
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function inferScienceQuestionType(row, params) {
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

  if (tagBlob.includes("reading_comprehension")) return "reading_comprehension";
  if (tagBlob.includes("vocabulary")) return "vocabulary";

  if (
    row.passage != null ||
    row.passageText != null ||
    params.passageVisible === true
  ) {
    return "reading_comprehension";
  }

  if (
    row.imageUrl != null ||
    row.diagram != null ||
    row.visualAsset != null ||
    params.requiresVisual === true ||
    pickStr(params.patternFamily).includes("diagram")
  ) {
    return "visual";
  }

  const topic = pickStr(row.topic);
  if (topic === "experiments" && pickStr(row.stem).length > 90) {
    return "reading_comprehension";
  }

  return "technical";
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>} row
 * @returns {"conceptual"|"procedural"|"mixed"|null}
 */
export function inferScienceProblemClass(params, row) {
  const topic = pickStr(row.topic);
  if (topic === "experiments") return "mixed";

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
export function deriveScienceRequiresVisual(row, params) {
  if (row.requiresVisual === true || params.requiresVisual === true) return true;
  if (row.imageUrl != null || row.diagram != null || row.visualAsset != null) return true;
  if (pickStr(params.patternFamily).includes("diagram")) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {boolean}
 */
export function deriveScienceRequiresAudio(row) {
  const t = pickStr(row.type) || pickStr(row.questionType);
  return t.toLowerCase() === "audio";
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} params
 * @returns {string|null}
 */
function resolveScienceSkillId(row, params) {
  return (
    pickStr(params.diagnosticSkillId) ||
    pickStr(row.diagnosticSkillId) ||
    pickStr(row.skillKey) ||
    (pickStr(row.topic) ? `sci_${pickStr(row.topic)}_general` : null)
  );
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>} row
 * @returns {string|null}
 */
function resolveScienceSubSkill(params, row) {
  return (
    pickStr(params.subtype) ||
    pickStr(params.conceptTag) ||
    pickStr(params.patternFamily) ||
    (pickStr(row.topic) ? `sci_${pickStr(row.topic)}_general` : null)
  );
}

/**
 * @param {Record<string, unknown>} canonical
 * @returns {"high"|"medium"|"low"}
 */
function computeScienceMetadataConfidence(canonical) {
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
export function computeScienceDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  if (pickStr(params.kind) === "book_context") return false;
  return true;
}

/**
 * @param {unknown} rowType
 * @returns {"mcq"|"numeric"|"text"|null}
 */
export function mapScienceRowTypeToAnswerFormat(rowType) {
  const t = pickStr(rowType).toLowerCase();
  if (t === "mcq" || t === "multiple_choice") return "mcq";
  if (t === "numeric" || t === "number") return "numeric";
  if (t === "open" || t === "text") return "text";
  if (!t) return "mcq";
  return "mcq";
}

/**
 * Enrich a science bank row with `params.canonicalMetadata` (pure, idempotent).
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ gradeKey?: string|null, levelKey?: string|null }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichScienceBankRowWithCanonicalMetadata(row, ctx = {}) {
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

  const skillId = resolveScienceSkillId(row, params);
  const subSkill = resolveScienceSubSkill(params, row);
  if (!pickStr(params.diagnosticSkillId) && skillId) params.diagnosticSkillId = skillId;
  if (!pickStr(params.subtype) && subSkill) params.subtype = subSkill;

  const gradeKey =
    pickStr(ctx.gradeKey) || (Array.isArray(row.grades) ? pickStr(row.grades[0]) : null);
  const levelKey = pickStr(ctx.levelKey) || pickStr(row.minLevel) || pickStr(row.maxLevel) || null;

  const normalized = normalizeQuestionMetadata({
    ...row,
    subject: "science",
    topic: pickStr(row.topic),
    grade: gradeKey,
    type: pickStr(row.type) || "mcq",
    params,
    questionEngine: {
      questionType: mapScienceRowTypeToAnswerFormat(row.type) || "mcq",
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferScienceProblemClass(params, row);
  const questionType = inferScienceQuestionType(row, params);

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: "science",
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
    requiresVisual: deriveScienceRequiresVisual(row, params),
    requiresAudio: deriveScienceRequiresAudio(row),
    answerFormat: mapScienceRowTypeToAnswerFormat(row.type),
    metadataConfidence:
      normalized.metadataConfidence || computeScienceMetadataConfidence(normalized),
    diagnosticEligibleByMetadata: computeScienceDiagnosticEligibleByMetadataHint(
      normalized.skillId || skillId,
      params
    ),
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: pickStr(params.explanationHe) || null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...row,
    params,
    subSkill: canonicalMetadata.subSkill,
    skillId: canonicalMetadata.skillId,
  };
}

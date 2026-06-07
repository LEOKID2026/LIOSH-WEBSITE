/**
 * Q2-C4 — Attach canonical metadata to Hebrew generator output and rich pool rows.
 * Additive only; no classification, report, or evidence-quality changes.
 *
 * @see docs/diagnostics/QUESTION_METADATA_CONTRACT.md
 */

import {
  normalizeQuestionMetadata,
  normalizeDifficultyBand,
  QUESTION_METADATA_CONTRACT_VERSION,
} from "./question-metadata-normalizer.js";

const EMPTY_POOL_PATTERN = "no_questions";

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
function sanitizeHebrewIdSegment(raw) {
  const s = pickStr(raw);
  if (!s) return "";
  return s
    .replace(/\./g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * @param {string|null|undefined} topic
 * @returns {string}
 */
function normalizeHebrewTopic(topic) {
  return pickStr(topic).toLowerCase();
}

/**
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function isHebrewEmptyPool(params) {
  return (
    pickStr(params.kind) === "empty_pool" ||
    pickStr(params.patternFamily) === EMPTY_POOL_PATTERN
  );
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveHebrewSkillId(topic, params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  const explicit =
    pickStr(params.diagnosticSkillId) ||
    pickStr(row.diagnosticSkillId) ||
    pickStr(row.skillId) ||
    pickStr(params.skillKey);
  if (explicit) return explicit;

  const t = normalizeHebrewTopic(topic);
  const subtopicId = sanitizeHebrewIdSegment(
    pickStr(params.subtopicId) || pickStr(row.subtopicId)
  );
  const subtype = sanitizeHebrewIdSegment(pickStr(params.subtype) || pickStr(row.subtype));

  if (t && subtopicId) return `heb_${t}_${subtopicId}`;
  if (t && subtype && subtype !== "general") return `heb_${t}_${subtype}`;
  if (t) return `heb_${t}_general`;
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveHebrewSubSkill(params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  return (
    pickStr(params.subtopicId) ||
    pickStr(row.subtopicId) ||
    pickStr(params.subtype) ||
    pickStr(row.subtype) ||
    pickStr(params.patternFamily) ||
    pickStr(row.patternFamily) ||
    null
  );
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @returns {string|null}
 */
export function inferHebrewQuestionType(topic, params) {
  if (isHebrewEmptyPool(params)) return null;

  const t = normalizeHebrewTopic(topic);
  const pf = pickStr(params.patternFamily).toLowerCase();
  const kind = pickStr(params.kind).toLowerCase();

  if (t === "comprehension" || t === "reading") return "reading_comprehension";
  if (
    pf.startsWith("passage_") ||
    pf.includes("main_idea") ||
    pf.includes("sequence") ||
    pf.includes("cause_effect") ||
    pf.includes("binary_fact")
  ) {
    return "reading_comprehension";
  }
  if (
    t === "vocabulary" ||
    pf === "synonym" ||
    pf === "antonym" ||
    pf.includes("context_fit") ||
    pf.includes("collocation") ||
    pf.includes("semantic_field")
  ) {
    return "vocabulary";
  }
  if (
    t === "grammar" ||
    pf.includes("gender_number") ||
    pf.includes("tense") ||
    pf.includes("verb_agreement") ||
    pf.includes("sentence_correction") ||
    pf.includes("prep_choice") ||
    pf.includes("binary_grammar")
  ) {
    return "grammar";
  }
  if (t === "spelling" || pf.includes("spell")) return "technical";
  if (t === "writing" && (pf.includes("rephrase") || pf.includes("structured_completion"))) {
    return "grammar";
  }
  if (kind === "empty_pool") return null;
  return null;
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @returns {"conceptual"|"procedural"|"mixed"|null}
 */
export function inferHebrewProblemClass(topic, params) {
  if (isHebrewEmptyPool(params)) return null;

  const t = normalizeHebrewTopic(topic);
  const cog = pickStr(params.cognitiveLevel).toLowerCase();
  const pf = pickStr(params.patternFamily).toLowerCase();

  if (pf.includes("inference") || cog === "analysis" || cog === "application") return "mixed";
  if (t === "comprehension" || t === "reading" || t === "writing") return "mixed";
  if (t === "grammar" || t === "vocabulary" || t === "spelling") return "conceptual";
  if (cog === "recall" || cog === "understanding") return "conceptual";
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} sourceRow
 * @returns {boolean}
 */
export function deriveHebrewRequiresVisual(params, sourceRow) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  if (params.requiresVisual === true || row.requiresVisual === true) return true;
  if (row.imageUrl != null || row.diagram != null) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} question
 * @returns {"mcq"|"text"|null}
 */
export function mapHebrewAnswerFormat(question) {
  const mode =
    pickStr(question.answerMode) ||
    pickStr(question.params && typeof question.params === "object" ? question.params.answerMode : "");
  if (mode === "typing" || mode === "text" || mode === "open") return "text";
  if (mode === "choice" || mode === "mcq" || !mode) return "mcq";
  return "mcq";
}

/**
 * @param {Record<string, unknown>} canonical
 * @param {Record<string, unknown>} params
 * @returns {"high"|"medium"|"low"}
 */
function computeHebrewMetadataConfidence(canonical, params) {
  if (isHebrewEmptyPool(params)) return "low";

  const skillId = pickStr(canonical.skillId);
  const subSkill = pickStr(canonical.subSkill);
  const patterns = canonical.possibleErrorPatterns;
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0;
  const hasExplicitDiagnostic = Boolean(pickStr(params.diagnosticSkillId));
  const isHebFallback = skillId.startsWith("heb_");

  if (hasExplicitDiagnostic && subSkill && hasPatterns && !isHebFallback) return "high";
  if (hasExplicitDiagnostic && subSkill) return "medium";
  if (skillId && subSkill && hasPatterns && !isHebFallback) return "medium";
  if (skillId && subSkill) return "low";
  if (skillId) return "low";
  return "low";
}

/**
 * @param {string|null} skillId
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function computeHebrewDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  if (isHebrewEmptyPool(params)) return false;
  if (pickStr(params.kind) === "book_context") return false;
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ topic?: string }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichHebrewPoolRowWithCanonicalMetadata(row, ctx = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return /** @type {Record<string, unknown>} */ (row || {});
  }
  if (row.canonicalMetadata && typeof row.canonicalMetadata === "object") {
    return row;
  }

  const topic = pickStr(ctx.topic) || pickStr(row.topic) || "reading";
  const params = {
    patternFamily: row.patternFamily,
    subtype: row.subtype,
    subtopicId: row.subtopicId,
    diagnosticSkillId: row.diagnosticSkillId,
    cognitiveLevel: row.cognitiveLevel,
    difficulty: row.difficulty,
    difficultyBand: row.difficultyBand,
    distractorFamily: row.distractorFamily,
    expectedErrorTags: row.expectedErrorTags,
    expectedErrorTypes: row.expectedErrorTypes,
    kind: row.topic,
  };

  const skillId = resolveHebrewSkillId(topic, params, row);
  const subSkill = resolveHebrewSubSkill(params, row);
  const questionType = inferHebrewQuestionType(topic, params);
  const normalized = normalizeQuestionMetadata({
    subject: "hebrew",
    topic,
    params: { ...params, diagnosticSkillId: skillId, subtype: subSkill },
    type: "mcq",
    questionEngine: {
      questionType: questionType || "mcq",
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferHebrewProblemClass(topic, params);

  return {
    ...row,
    canonicalMetadata: {
      contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
      subject: "hebrew",
      topic,
      skillId,
      subSkill,
      ...(questionType ? { questionType } : {}),
      ...(problemClass ? { problemClass } : {}),
      difficulty:
        mapLegacyDifficultyToContract(row.difficulty) ||
        mapLegacyDifficultyToContract(row.difficultyBand) ||
        normalized.difficulty,
      difficultyDepth: normalized.difficultyDepth || null,
      requiresVisual: deriveHebrewRequiresVisual(params, row),
      requiresAudio: false,
      answerFormat: "mcq",
      metadataConfidence: computeHebrewMetadataConfidence(
        {
          skillId,
          subSkill,
          possibleErrorPatterns: normalized.possibleErrorPatterns,
        },
        params
      ),
      diagnosticEligibleByMetadata: computeHebrewDiagnosticEligibleByMetadataHint(
        skillId,
        params
      ),
      possibleErrorPatterns: normalized.possibleErrorPatterns || null,
      notes: null,
    },
  };
}

/**
 * @param {unknown[]} pool
 */
export function enrichHebrewRichPoolWithCanonicalMetadata(pool) {
  if (!Array.isArray(pool)) return;
  for (let i = 0; i < pool.length; i++) {
    const row = pool[i];
    if (!row || typeof row !== "object") continue;
    pool[i] = enrichHebrewPoolRowWithCanonicalMetadata(row, {
      topic: pickStr(row.topic),
    });
  }
}

/**
 * Attach `params.canonicalMetadata` to a Hebrew generator question object.
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
export function attachCanonicalMetadataToHebrewQuestion(question, ctx = {}) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return question || {};
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

  const topic = pickStr(question.topic) || pickStr(ctx.topic) || "reading";
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? { ...question.params }
      : {};
  const sourceRow = ctx.sourceRow && typeof ctx.sourceRow === "object" ? ctx.sourceRow : null;

  const skillId = resolveHebrewSkillId(topic, params, sourceRow);
  const subSkill = resolveHebrewSubSkill(params, sourceRow);
  if (!pickStr(params.diagnosticSkillId) && skillId) params.diagnosticSkillId = skillId;

  const answerFormat = mapHebrewAnswerFormat(question);
  const questionType = inferHebrewQuestionType(topic, params);
  const normalized = normalizeQuestionMetadata({
    ...question,
    subject: "hebrew",
    topic,
    grade: pickStr(ctx.gradeKey) || pickStr(params.gradeKey),
    difficultyBand: pickStr(params.difficultyBand) || pickStr(ctx.levelKey),
    params,
    type: answerFormat === "text" ? "open" : "mcq",
    questionEngine: {
      questionType: questionType || (answerFormat === "text" ? "open" : "mcq"),
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferHebrewProblemClass(topic, params);

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: "hebrew",
    topic,
    grade: pickStr(ctx.gradeKey) || pickStr(params.gradeKey) || normalized.grade || null,
    skillId: normalized.skillId || skillId || null,
    subSkill: normalized.subSkill || subSkill || null,
    ...(questionType ? { questionType } : {}),
    ...(problemClass ? { problemClass } : {}),
    difficulty:
      normalized.difficulty ||
      mapLegacyDifficultyToContract(params.difficulty) ||
      mapLegacyDifficultyToContract(params.difficultyBand) ||
      mapLegacyDifficultyToContract(ctx.levelKey),
    difficultyDepth: normalized.difficultyDepth || null,
    requiresVisual: deriveHebrewRequiresVisual(params, sourceRow),
    requiresAudio: false,
    answerFormat,
    metadataConfidence: computeHebrewMetadataConfidence(
      {
        skillId: normalized.skillId || skillId,
        subSkill: normalized.subSkill || subSkill,
        possibleErrorPatterns: normalized.possibleErrorPatterns,
      },
      params
    ),
    diagnosticEligibleByMetadata: computeHebrewDiagnosticEligibleByMetadataHint(
      normalized.skillId || skillId,
      params
    ),
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...question,
    subject: "hebrew",
    topic,
    skillId: canonicalMetadata.skillId,
    subSkill: canonicalMetadata.subSkill,
    params,
  };
}

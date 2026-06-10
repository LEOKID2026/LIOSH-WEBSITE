/**
 * Q2-C3 — Attach canonical metadata to English generator output and pool rows.
 * Additive only; no classification, report, or evidence-quality changes.
 *
 * @see docs/diagnostics/QUESTION_METADATA_CONTRACT.md
 */

import {
  normalizeQuestionMetadata,
  normalizeDifficultyBand,
  QUESTION_METADATA_CONTRACT_VERSION,
} from "./question-metadata-normalizer.js";

const EMPTY_POOL_PATTERN = "english_empty_pool";

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
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
export function inferEnglishQuestionType(topic, params) {
  const t = pickStr(topic).toLowerCase();
  if (t === "phonics") {
    return pickStr(params.subtype) || pickStr(params.itemType) || "phonics";
  }
  if (t === "grammar") return "grammar";
  if (t === "vocabulary") return "vocabulary";
  if (t === "translation" || t === "writing") return "translation";
  if (t === "sentences") return "grammar";
  return "technical";
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @returns {"conceptual"|"procedural"|"mixed"|null}
 */
export function inferEnglishProblemClass(topic, params) {
  if (pickStr(params.patternFamily) === EMPTY_POOL_PATTERN) return null;

  const t = pickStr(topic).toLowerCase();
  const cog = pickStr(params.cognitiveLevel).toLowerCase();
  const direction = pickStr(params.direction);

  if (t === "translation" || t === "writing" || direction === "he_to_en") return "mixed";
  if (t === "phonics") return "conceptual";
  if (cog === "application" || cog === "analysis") return "mixed";
  if (cog === "recall" || cog === "understanding" || t === "grammar" || t === "vocabulary") {
    return "conceptual";
  }
  if (t === "sentences") return "conceptual";
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} sourceRow
 * @returns {boolean}
 */
export function deriveEnglishRequiresVisual(params, sourceRow) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  if (params.requiresVisual === true || row.requiresVisual === true) return true;
  if (row.imageUrl != null || row.diagram != null) return true;
  return false;
}

/**
 * @param {string} topic
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveEnglishSkillId(topic, params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  const explicit =
    pickStr(params.diagnosticSkillId) ||
    pickStr(row.diagnosticSkillId) ||
    pickStr(row.skillId);
  if (explicit) return explicit;

  const subtype = pickStr(params.subtype) || pickStr(row.subtype);
  const poolKey = pickStr(params.englishPoolKey);
  const listKey = pickStr(params.listKey);
  const t = pickStr(topic).toLowerCase();

  if (t === "grammar" && subtype) return `eng_grammar_${subtype}`;
  if (t === "phonics") {
    const ref = pickStr(params.bookPageRef) || pickStr(row.bookPageRef);
    if (ref) {
      const parts = ref.split(":");
      if (parts[0] === "english" && parts[1] === "phonics" && parts[2] && parts[3]) {
        return ref;
      }
      if (parts[0] === "english" && /^g[12]$/.test(parts[1]) && parts[2]) {
        return `english:phonics:${parts[1]}:${parts[2]}`;
      }
    }
    const pageId = pickStr(params.bookPageId);
    const gradePart = pickStr(params.englishPhonicsGrade);
    if (pageId && /^g[12]$/.test(gradePart)) {
      return `english:phonics:${gradePart}:${pageId}`;
    }
    return "eng_phonics_general";
  }
  if (t === "vocabulary" && listKey) return `eng_vocabulary_${listKey}`;
  if (t === "translation" && poolKey) return `eng_translation_${poolKey}`;
  if (t === "sentences" && subtype) return `eng_sentences_${subtype}`;
  if (t) return `eng_${t}_general`;
  return null;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null|undefined} [sourceRow]
 * @returns {string|null}
 */
export function resolveEnglishSubSkill(params, sourceRow = null) {
  const row = sourceRow && typeof sourceRow === "object" ? sourceRow : {};
  return (
    pickStr(params.subtype) ||
    pickStr(row.subtype) ||
    pickStr(params.patternFamily) ||
    pickStr(row.patternFamily) ||
    pickStr(params.listKey) ||
    pickStr(params.englishPoolKey) ||
    null
  );
}

/**
 * @param {unknown} qType
 * @param {Record<string, unknown>} params
 * @returns {"mcq"|"text"|null}
 */
export function mapEnglishAnswerFormat(qType, params) {
  const mode = pickStr(params.answerMode) || pickStr(qType);
  if (mode === "typing" || mode === "text" || mode === "open") return "text";
  if (mode === "choice" || mode === "mcq" || !mode) return "mcq";
  return "mcq";
}

/**
 * @param {Record<string, unknown>} canonical
 * @param {Record<string, unknown>} params
 * @returns {"high"|"medium"|"low"}
 */
function computeEnglishMetadataConfidence(canonical, params) {
  if (pickStr(params.patternFamily) === EMPTY_POOL_PATTERN) return "low";

  const skillId = pickStr(canonical.skillId);
  const subSkill = pickStr(canonical.subSkill);
  const patterns = canonical.possibleErrorPatterns;
  const hasPatterns = Array.isArray(patterns) && patterns.length > 0;
  const hasExplicitDiagnostic = Boolean(pickStr(params.diagnosticSkillId));

  if (skillId && subSkill && hasPatterns && hasExplicitDiagnostic) return "high";
  if (skillId && subSkill && (hasPatterns || hasExplicitDiagnostic)) return "medium";
  if (skillId) return "low";
  return "low";
}

/**
 * @param {string|null} skillId
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function computeEnglishDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  if (pickStr(params.patternFamily) === EMPTY_POOL_PATTERN) return false;
  if (pickStr(params.kind) === "book_context") return false;
  if (pickStr(params.topic) === "phonics") return false;
  if (String(skillId).startsWith("english:phonics:")) return false;
  if (params.promotionEligible === false) return false;
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ topic?: string, poolKey?: string }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichEnglishPoolRowWithCanonicalMetadata(row, ctx = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return /** @type {Record<string, unknown>} */ (row || {});
  }
  if (row.canonicalMetadata && typeof row.canonicalMetadata === "object") {
    return row;
  }

  const topic = pickStr(ctx.topic) || "grammar";
  const params = {
    patternFamily: row.patternFamily,
    subtype: row.subtype,
    diagnosticSkillId: row.diagnosticSkillId,
    skillId: row.skillId,
    cognitiveLevel: row.cognitiveLevel,
    difficulty: row.difficulty,
    distractorFamily: row.distractorFamily,
    expectedErrorTags: row.expectedErrorTags,
    expectedErrorTypes: row.expectedErrorTypes,
    englishPoolKey: ctx.poolKey,
  };

  const skillId = resolveEnglishSkillId(topic, params, row);
  const subSkill = resolveEnglishSubSkill(params, row);
  const normalized = normalizeQuestionMetadata({
    subject: "english",
    topic,
    params: { ...params, diagnosticSkillId: skillId, subtype: subSkill },
    type: "mcq",
    questionEngine: { questionType: "mcq", skillId, subtopic: subSkill },
  });

  const problemClass = inferEnglishProblemClass(topic, params);

  return {
    ...row,
    canonicalMetadata: {
      contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
      subject: "english",
      topic,
      skillId,
      subSkill,
      questionType: inferEnglishQuestionType(topic, params),
      ...(problemClass ? { problemClass } : {}),
      difficulty: mapLegacyDifficultyToContract(row.difficulty) || normalized.difficulty,
      difficultyDepth: normalized.difficultyDepth || null,
      requiresVisual: deriveEnglishRequiresVisual(params, row),
      requiresAudio: false,
      answerFormat: "mcq",
      metadataConfidence: computeEnglishMetadataConfidence(
        { skillId, subSkill, possibleErrorPatterns: normalized.possibleErrorPatterns },
        params
      ),
      diagnosticEligibleByMetadata: computeEnglishDiagnosticEligibleByMetadataHint(skillId, params),
      possibleErrorPatterns: normalized.possibleErrorPatterns || null,
      notes: null,
    },
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} pools
 * @param {string} topic
 * @returns {Record<string, unknown[]>}
 */
export function enrichEnglishPoolMapWithCanonicalMetadata(pools, topic) {
  if (!pools || typeof pools !== "object") return {};
  /** @type {Record<string, unknown[]>} */
  const out = {};
  for (const [poolKey, rows] of Object.entries(pools)) {
    if (!Array.isArray(rows)) continue;
    out[poolKey] = rows.map((row) =>
      enrichEnglishPoolRowWithCanonicalMetadata(
        row && typeof row === "object" ? row : {},
        { topic, poolKey }
      )
    );
  }
  return out;
}

/**
 * Attach `params.canonicalMetadata` to an English generator question object.
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
export function attachCanonicalMetadataToEnglishQuestion(question, ctx = {}) {
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

  const topic = pickStr(question.topic) || pickStr(ctx.topic) || "mixed";
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? { ...question.params }
      : {};
  const sourceRow = ctx.sourceRow && typeof ctx.sourceRow === "object" ? ctx.sourceRow : null;

  const skillId = resolveEnglishSkillId(topic, params, sourceRow);
  const subSkill = resolveEnglishSubSkill(params, sourceRow);
  if (!pickStr(params.diagnosticSkillId) && skillId) params.diagnosticSkillId = skillId;
  if (!pickStr(params.subtype) && subSkill) params.subtype = subSkill;

  const answerFormat = mapEnglishAnswerFormat(question.qType, params);
  const normalized = normalizeQuestionMetadata({
    ...question,
    subject: "english",
    topic,
    grade: pickStr(ctx.gradeKey),
    params,
    type: answerFormat === "text" ? "open" : "mcq",
    questionEngine: {
      questionType: answerFormat === "text" ? "open" : "mcq",
      skillId,
      subtopic: subSkill,
    },
  });

  const problemClass = inferEnglishProblemClass(topic, params);

  /** @type {Record<string, unknown>} */
  const canonicalMetadata = {
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject: "english",
    topic,
    grade: pickStr(ctx.gradeKey) || normalized.grade || null,
    skillId: normalized.skillId || skillId || null,
    subSkill: normalized.subSkill || subSkill || null,
    questionType: inferEnglishQuestionType(topic, params),
    ...(problemClass ? { problemClass } : {}),
    difficulty:
      normalized.difficulty ||
      mapLegacyDifficultyToContract(params.difficulty) ||
      mapLegacyDifficultyToContract(ctx.levelKey),
    difficultyDepth: normalized.difficultyDepth || null,
    requiresVisual: deriveEnglishRequiresVisual(params, sourceRow),
    requiresAudio: false,
    answerFormat,
    metadataConfidence: computeEnglishMetadataConfidence(
      {
        skillId: normalized.skillId || skillId,
        subSkill: normalized.subSkill || subSkill,
        possibleErrorPatterns: normalized.possibleErrorPatterns,
      },
      params
    ),
    diagnosticEligibleByMetadata: computeEnglishDiagnosticEligibleByMetadataHint(
      normalized.skillId || skillId,
      params
    ),
    possibleErrorPatterns: normalized.possibleErrorPatterns || null,
    notes: null,
  };

  params.canonicalMetadata = canonicalMetadata;

  return {
    ...question,
    subject: "english",
    topic,
    skillId: canonicalMetadata.skillId,
    subSkill: canonicalMetadata.subSkill,
    params,
  };
}

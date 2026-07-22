/**
 * Unified answer evidence contract (versioned).
 * Every answered question carries traceable evidence for diagnosis — never topic-only inference.
 */

export const ANSWER_EVIDENCE_VERSION = "answer-evidence-v2";

/** @typedef {"DIRECT_EVIDENCE"|"DISTRACTOR_EVIDENCE"|"REPEATED_PATTERN"|"PROBE_CONFIRMED"|"UNKNOWN"} EvidenceType */

export const EVIDENCE_TYPES = Object.freeze({
  DIRECT_EVIDENCE: "DIRECT_EVIDENCE",
  DISTRACTOR_EVIDENCE: "DISTRACTOR_EVIDENCE",
  REPEATED_PATTERN: "REPEATED_PATTERN",
  PROBE_CONFIRMED: "PROBE_CONFIRMED",
  UNKNOWN: "UNKNOWN",
});

/** @typedef {"suspected"|"recurring"|"confirmed"|"resolved"|"none"} PatternRecurrenceState */

export const PATTERN_RECURRENCE_STATES = Object.freeze({
  NONE: "none",
  SUSPECTED: "suspected",
  RECURRING: "recurring",
  CONFIRMED: "confirmed",
  RESOLVED: "resolved",
});

export const CLASSIFIER_VERSION = "misconception-classifier-v2";

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {unknown} n
 */
function finiteNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

/**
 * Build a versioned evidence record for one answer attempt.
 *
 * @param {object} ctx
 * @param {string} ctx.subject
 * @param {string|null|undefined} [ctx.topic]
 * @param {string|null|undefined} [ctx.subtopic]
 * @param {string|null|undefined} [ctx.skillId]
 * @param {string|null|undefined} [ctx.questionType]
 * @param {string|null|undefined} [ctx.questionGenerator]
 * @param {string|null|undefined} [ctx.questionVersion]
 * @param {Record<string, unknown>|null|undefined} [ctx.canonicalOperands]
 * @param {unknown} [ctx.expectedAnswer]
 * @param {unknown} [ctx.userAnswer]
 * @param {number|null|undefined} [ctx.selectedOptionIndex]
 * @param {boolean} [ctx.isCorrect]
 * @param {string|null|undefined} [ctx.difficulty]
 * @param {string[]} [ctx.misconceptionCandidates]
 * @param {string|null|undefined} [ctx.detectedMisconception]
 * @param {EvidenceType} [ctx.evidenceType]
 * @param {Record<string, unknown>|null|undefined} [ctx.evidenceDetails]
 * @param {number|null|undefined} [ctx.confidence]
 * @param {boolean} [ctx.probeRequired]
 * @param {string|null|undefined} [ctx.timestamp]
 * @param {string|null|undefined} [ctx.answerId]
 * @param {string|null|undefined} [ctx.classifierVersion]
 */
export function buildAnswerEvidence(ctx) {
  const evidenceType = /** @type {EvidenceType} */ (
    EVIDENCE_TYPES[ctx.evidenceType] ? ctx.evidenceType : EVIDENCE_TYPES.UNKNOWN
  );
  const detected = pickStr(ctx.detectedMisconception);
  const safeType =
    !detected || detected === "unknown" || detected === "generic_proximity"
      ? EVIDENCE_TYPES.UNKNOWN
      : evidenceType;

  return {
    version: ANSWER_EVIDENCE_VERSION,
    subject: pickStr(ctx.subject) || "unknown",
    topic: pickStr(ctx.topic),
    subtopic: pickStr(ctx.subtopic),
    skillId: pickStr(ctx.skillId),
    questionType: pickStr(ctx.questionType) || "unknown",
    questionGenerator: pickStr(ctx.questionGenerator),
    questionVersion: pickStr(ctx.questionVersion),
    canonicalOperands:
      ctx.canonicalOperands && typeof ctx.canonicalOperands === "object"
        ? ctx.canonicalOperands
        : null,
    expectedAnswer: ctx.expectedAnswer ?? null,
    userAnswer: ctx.userAnswer ?? null,
    selectedOptionIndex:
      ctx.selectedOptionIndex != null && Number.isFinite(Number(ctx.selectedOptionIndex))
        ? Number(ctx.selectedOptionIndex)
        : null,
    isCorrect: ctx.isCorrect === true,
    difficulty: pickStr(ctx.difficulty),
    misconceptionCandidates: Array.isArray(ctx.misconceptionCandidates)
      ? ctx.misconceptionCandidates.filter(Boolean)
      : [],
    detectedMisconception: detected,
    evidenceType: safeType,
    evidenceDetails:
      ctx.evidenceDetails && typeof ctx.evidenceDetails === "object" ? ctx.evidenceDetails : {},
    classifierVersion: pickStr(ctx.classifierVersion) || CLASSIFIER_VERSION,
    confidence:
      ctx.confidence != null && Number.isFinite(Number(ctx.confidence))
        ? Math.max(0, Math.min(1, Number(ctx.confidence)))
        : detected && safeType !== EVIDENCE_TYPES.UNKNOWN
          ? 0.85
          : 0,
    probeRequired: ctx.probeRequired === true,
    timestamp: pickStr(ctx.timestamp) || new Date().toISOString(),
    answerId: pickStr(ctx.answerId),
  };
}

/**
 * Normalize stored answerEvidence payload (read-time).
 * @param {unknown} raw
 */
export function normalizeAnswerEvidence(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = /** @type {Record<string, unknown>} */ (raw);
  return buildAnswerEvidence({
    subject: r.subject,
    topic: r.topic,
    subtopic: r.subtopic,
    skillId: r.skillId,
    questionType: r.questionType,
    questionGenerator: r.questionGenerator,
    questionVersion: r.questionVersion,
    canonicalOperands: r.canonicalOperands,
    expectedAnswer: r.expectedAnswer,
    userAnswer: r.userAnswer,
    selectedOptionIndex: r.selectedOptionIndex,
    isCorrect: r.isCorrect,
    difficulty: r.difficulty,
    misconceptionCandidates: r.misconceptionCandidates,
    detectedMisconception: r.detectedMisconception,
    evidenceType: r.evidenceType,
    evidenceDetails: r.evidenceDetails,
    confidence: r.confidence,
    probeRequired: r.probeRequired,
    timestamp: r.timestamp,
    answerId: r.answerId,
    classifierVersion: r.classifierVersion,
  });
}

/**
 * Whether a specific parent-facing diagnosis is allowed from this evidence alone.
 * UNKNOWN must never unlock specific copy.
 *
 * @param {ReturnType<typeof buildAnswerEvidence>|null|undefined} ev
 */
export function evidenceAllowsSpecificDiagnosis(ev) {
  if (!ev) return false;
  if (ev.evidenceType === EVIDENCE_TYPES.UNKNOWN) return false;
  if (!ev.detectedMisconception || ev.detectedMisconception === "unknown") return false;
  if (ev.confidence < 0.5) return false;
  return (
    ev.evidenceType === EVIDENCE_TYPES.DIRECT_EVIDENCE ||
    ev.evidenceType === EVIDENCE_TYPES.DISTRACTOR_EVIDENCE ||
    ev.evidenceType === EVIDENCE_TYPES.PROBE_CONFIRMED ||
    ev.evidenceType === EVIDENCE_TYPES.REPEATED_PATTERN
  );
}

/**
 * Extract numeric operands from question params for canonical storage.
 * @param {Record<string, unknown>|null|undefined} params
 * @param {string|null|undefined} kind
 */
export function extractCanonicalOperands(params, kind) {
  if (!params || typeof params !== "object") return null;
  const k = pickStr(kind) || pickStr(params.kind);
  /** @type {Record<string, unknown>} */
  const out = { kind: k };
  for (const key of ["a", "b", "c", "d", "tens", "hundreds", "multiplier", "oneDigit", "twoDigit"]) {
    const n = finiteNum(params[key]);
    if (n != null) out[key] = n;
  }
  return Object.keys(out).length > 1 ? out : null;
}

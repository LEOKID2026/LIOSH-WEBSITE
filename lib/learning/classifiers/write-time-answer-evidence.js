/**
 * Evidence-safe write-time classification for answer submit.
 * Tags only when deterministic rules prove them — never guess from topic.
 */

import {
  CLASSIFIER_VERSION,
  EVIDENCE_TYPES,
  normalizeAnswerEvidence,
} from "../answer-evidence-contract.js";
import { classifyAnswerEvidence } from "./classify-answer-evidence.js";
import {
  mergeClassifierParamsFromQuestionId,
  parseClassifierParamsFromQuestionId,
} from "../../../utils/diagnostic-evidence.js";
import { pickPersistableMathClassifierParams } from "../math-classifier-params.js";

export const UNCLASSIFIED_REASON = "unclassified_no_deterministic_rule";

/** @param {unknown} v */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Prefer structured params from submit / questionEngine; fill missing keys from questionId.
 * Never invent tags from topic. questionId parse is supplemental only.
 *
 * @param {object} p
 * @param {Record<string, unknown>|null|undefined} [p.bodyParams]
 * @param {Record<string, unknown>|null|undefined} [p.rawQuestionEngine]
 * @param {Record<string, unknown>|null|undefined} [p.normalizedQuestionEngine]
 * @param {string|null|undefined} [p.questionId]
 */
export function resolveStructuredAnswerParams(p) {
  const body =
    p?.bodyParams && typeof p.bodyParams === "object" && !Array.isArray(p.bodyParams)
      ? { ...p.bodyParams }
      : {};
  const fromRawEngine =
    p?.rawQuestionEngine?.params &&
    typeof p.rawQuestionEngine.params === "object" &&
    !Array.isArray(p.rawQuestionEngine.params)
      ? { ...p.rawQuestionEngine.params }
      : {};
  const fromNormEngine =
    p?.normalizedQuestionEngine?.params &&
    typeof p.normalizedQuestionEngine.params === "object" &&
    !Array.isArray(p.normalizedQuestionEngine.params)
      ? { ...p.normalizedQuestionEngine.params }
      : {};

  const structured = { ...fromRawEngine, ...fromNormEngine, ...body };
  const fromQid = parseClassifierParamsFromQuestionId(p?.questionId);

  /** @type {Record<string, unknown>} */
  const mergedRaw = { ...fromQid, ...structured };
  if (!pickStr(mergedRaw.kind)) {
    const gk =
      pickStr(p?.normalizedQuestionEngine?.generatorKind) ||
      pickStr(p?.rawQuestionEngine?.generatorKind) ||
      pickStr(fromQid.kind);
    if (gk) mergedRaw.kind = gk;
  }

  // W1: persist compact classifier operands (not bulky metadata)
  const merged = pickPersistableMathClassifierParams(mergedRaw);

  return {
    params: Object.keys(merged).length ? merged : {},
    source: {
      hadBodyParams: Object.keys(body).length > 0,
      hadEngineParams: Object.keys(fromRawEngine).length > 0 || Object.keys(fromNormEngine).length > 0,
      usedQuestionIdSupplement: Object.keys(fromQid).length > 0 && Object.keys(structured).length === 0,
    },
  };
}

/**
 * @param {ReturnType<typeof classifyAnswerEvidence>|null|undefined} evidence
 * @param {{ tag: string|null, ruleId: string|null, details: Record<string, unknown> }|null} [hitMeta]
 */
function evidenceAllowsPersistTag(evidence, hitMeta) {
  if (!evidence || evidence.isCorrect === true) return false;
  const tag = pickStr(evidence.detectedMisconception);
  if (!tag || tag === "unknown" || tag === "generic_proximity") return false;
  if (evidence.evidenceType === EVIDENCE_TYPES.UNKNOWN) return false;
  if (!(evidence.confidence >= 0.5)) return false;
  if (
    evidence.evidenceType !== EVIDENCE_TYPES.DIRECT_EVIDENCE &&
    evidence.evidenceType !== EVIDENCE_TYPES.DISTRACTOR_EVIDENCE &&
    evidence.evidenceType !== EVIDENCE_TYPES.PROBE_CONFIRMED
  ) {
    return false;
  }
  // Must have a rule id or distractor proof in details
  const ruleId = pickStr(hitMeta?.ruleId) || pickStr(evidence.evidenceDetails?.classifierRuleId);
  const hasOperands =
    evidence.canonicalOperands &&
    typeof evidence.canonicalOperands === "object" &&
    Object.keys(evidence.canonicalOperands).length > 1;
  const hasDistractorProof =
    evidence.evidenceType === EVIDENCE_TYPES.DISTRACTOR_EVIDENCE &&
    !!(evidence.evidenceDetails?.distractorFamily || evidence.evidenceDetails?.selectedValue != null);
  if (!ruleId && !hasDistractorProof && !hasOperands) return false;
  return true;
}

/**
 * Build payload fields for answer_payload (evidence-safe).
 *
 * @param {object} ctx
 */
export function buildWriteTimeAnswerEvidenceFields(ctx) {
  const isCorrect = ctx.isCorrect === true;
  const expectedAnswer = ctx.expectedAnswer ?? null;
  const userAnswer = ctx.userAnswer ?? null;
  const { params, source: paramsSource } = resolveStructuredAnswerParams({
    bodyParams: ctx.bodyParams,
    rawQuestionEngine: ctx.rawQuestionEngine,
    normalizedQuestionEngine: ctx.questionEngine,
    questionId: ctx.questionId,
  });
  const questionKind =
    pickStr(params.kind) ||
    pickStr(ctx.questionEngine?.generatorKind) ||
    pickStr(ctx.rawQuestionEngine?.generatorKind) ||
    null;

  if (isCorrect) {
    const evidence = classifyAnswerEvidence({
      subject: ctx.subject,
      topic: ctx.topic,
      userAnswer,
      expectedAnswer,
      isCorrect: true,
      params,
      questionEngine: ctx.questionEngine,
      selectedOptionIndex: ctx.selectedOptionIndex,
      questionGenerator: pickStr(ctx.questionEngine?.generatorSource),
      difficulty: pickStr(ctx.questionEngine?.difficulty),
    });
    return {
      params,
      answerEvidence: evidence,
      misconceptionTag: null,
      distractorFamily: null,
      patternFamily: null,
      classifierRuleId: null,
      classifierVersion: CLASSIFIER_VERSION,
      evidenceReason: "correct_answer_no_misconception",
      questionKind,
      expectedAnswer,
      userAnswer,
      paramsSource,
    };
  }

  const evidence = classifyAnswerEvidence({
    subject: ctx.subject,
    topic: ctx.topic,
    userAnswer,
    expectedAnswer,
    isCorrect: false,
    params,
    questionEngine: ctx.questionEngine,
    answerMode:
      pickStr(ctx.answerMode) ||
      pickStr(ctx.questionEngine?.answerMode) ||
      pickStr(params.answerMode),
    selectedOptionIndex:
      ctx.selectedOptionIndex ??
      (Number.isFinite(Number(ctx.questionEngine?.selectedAnswer?.index))
        ? Number(ctx.questionEngine.selectedAnswer.index)
        : null),
    questionGenerator: pickStr(ctx.questionEngine?.generatorSource),
    difficulty: pickStr(ctx.questionEngine?.difficulty),
    question: {
      params,
      kind: questionKind,
      // Only reconstruct MCQ choice lists when the engine says this was MCQ.
      ...(pickStr(ctx.questionEngine?.questionType) === "mcq"
        ? {
            answers: ctx.questionEngine?.allAnswerChoices || undefined,
            options: ctx.questionEngine?.allAnswerChoices || undefined,
          }
        : {}),
      type: pickStr(ctx.questionEngine?.questionType) || undefined,
      questionType: pickStr(ctx.questionEngine?.questionType) || undefined,
    },
  });

  const ruleId =
    pickStr(evidence?.evidenceDetails?.classifierRuleId) ||
    (evidence?.detectedMisconception
      ? `rule:${evidence.evidenceType}:${evidence.detectedMisconception}`
      : null);

  const hitMeta = {
    tag: pickStr(evidence?.detectedMisconception),
    ruleId,
    details: evidence?.evidenceDetails || {},
  };

  const allowTag = evidenceAllowsPersistTag(evidence, hitMeta);
  const tag = allowTag ? hitMeta.tag : null;
  const distractorFamily = allowTag
    ? pickStr(evidence?.evidenceDetails?.distractorFamily) ||
      (evidence?.evidenceType === EVIDENCE_TYPES.DISTRACTOR_EVIDENCE ? tag : null)
    : null;
  const patternFamily = allowTag
    ? pickStr(ctx.questionEngine?.patternFamily) || pickStr(params.patternFamily) || null
    : null;

  /** @type {Record<string, unknown>} */
  const enrichedDetails = {
    ...(evidence?.evidenceDetails && typeof evidence.evidenceDetails === "object"
      ? evidence.evidenceDetails
      : {}),
    ...(ruleId && allowTag ? { classifierRuleId: ruleId } : {}),
    questionKind,
  };

  const answerEvidence = normalizeAnswerEvidence({
    ...evidence,
    detectedMisconception: tag,
    evidenceType: tag ? evidence.evidenceType : EVIDENCE_TYPES.UNKNOWN,
    evidenceDetails: enrichedDetails,
    confidence: tag ? evidence.confidence : 0,
    classifierVersion: CLASSIFIER_VERSION,
  });

  return {
    params,
    answerEvidence,
    misconceptionTag: tag,
    distractorFamily,
    patternFamily,
    classifierRuleId: tag ? ruleId : null,
    classifierVersion: CLASSIFIER_VERSION,
    evidenceReason: tag ? `deterministic_rule:${ruleId}` : UNCLASSIFIED_REASON,
    questionKind,
    expectedAnswer,
    userAnswer,
    paramsSource,
  };
}

/**
 * Read-only historical classification — same rules as write-time; never topic-only.
 * @param {object} rowPayload answer_payload-like
 * @param {{ questionId?: string|null, subject?: string|null, isCorrect?: boolean }} [meta]
 */
export function classifyHistoricalAnswerPayloadReadOnly(rowPayload, meta = {}) {
  const payload = rowPayload && typeof rowPayload === "object" ? rowPayload : {};
  if (meta.isCorrect === true || payload.isCorrect === true) {
    return {
      canTagSafely: false,
      misconceptionTag: null,
      evidenceReason: "correct_or_skipped",
      fields: null,
    };
  }

  const fields = buildWriteTimeAnswerEvidenceFields({
    subject: meta.subject || payload.subject || "unknown",
    topic: payload.topic,
    isCorrect: false,
    userAnswer: payload.userAnswer,
    expectedAnswer: payload.expectedAnswer,
    bodyParams: payload.params,
    rawQuestionEngine: payload.questionEngine,
    questionEngine: payload.questionEngine,
    questionId: meta.questionId || payload.questionId || null,
  });

  const hasDeterministicInputs =
    !!pickStr(fields.questionKind) &&
    fields.expectedAnswer != null &&
    fields.userAnswer != null &&
    (Object.keys(fields.params || {}).length > 0 ||
      !!pickStr(meta.questionId) ||
      !!pickStr(payload.questionId));

  // Never tag from topic alone
  if (!hasDeterministicInputs) {
    return {
      canTagSafely: false,
      misconceptionTag: null,
      evidenceReason: "insufficient_deterministic_inputs",
      fields: { ...fields, misconceptionTag: null, evidenceReason: UNCLASSIFIED_REASON },
    };
  }

  return {
    canTagSafely: !!fields.misconceptionTag,
    misconceptionTag: fields.misconceptionTag,
    evidenceReason: fields.evidenceReason,
    fields,
  };
}

export { mergeClassifierParamsFromQuestionId };

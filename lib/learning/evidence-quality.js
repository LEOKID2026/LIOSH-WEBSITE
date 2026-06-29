/**
 * Evidence Quality Layer — sufficiency, confidence, traceability (Phase Q1).
 * Parent context only for product gating; no cross-context merge or hints.
 */

import { passesRecurrenceRules } from "../../utils/diagnostic-engine-v2/recurrence.js";
import {
  PARENT_EVIDENCE_VOLUME,
} from "../../utils/parent-report-language/parent-evidence-matrix.js";

const REPORT_AGG_SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "history", "moledet_geography"];
import { PARENT_CONTEXT_ALLOWED_SOURCES } from "./diagnostic-evidence-contract.js";
import {
  isActiveMetadataParentGatingEnabled,
  isActiveMetadataParentPromotionEnabled,
  isDiagnosticMetadataSubskillEnabled,
} from "./diagnostic-metadata-subskill-flag.js";
import { buildSubSkillGroupKey } from "./question-metadata-resolve-at-answer.js";
import { computeInternalErrorPatternSummaries } from "./question-metadata-error-patterns.js";
import {
  applyMetadataConfidenceCapsToBySubSkill,
  applyMetadataConfidenceCapsToErrorPatterns,
} from "./question-metadata-confidence-caps.js";
import {
  attachQuestionTypeBreakdownToBySubSkill,
  computeInternalQuestionTypes,
  computeQuestionTypeBreakdownByGroup,
} from "./question-metadata-question-types.js";
import {
  attachPedagogyBreakdownsToBySubSkill,
  computeDifficultyDepthBreakdownByGroup,
  computeInternalDifficultyDepths,
  computeInternalProblemClasses,
  computeProblemClassBreakdownByGroup,
} from "./question-metadata-problem-class-depth.js";
import { computeShadowParentGatingAnalysis } from "./question-metadata-shadow-parent-gating.js";
import {
  applyActiveParentGating,
  isTopicStrongDiagnosisSuppressedByGating,
} from "./question-metadata-active-parent-gating.js";
import { validateShadowPromotionCandidates } from "./question-metadata-promotion-validation.js";
import {
  applyActiveParentPromotion,
  hasErrorPatternPromotionDecision,
  hasTopicPromotionDecision,
} from "./question-metadata-active-parent-promotion.js";

export const DATA_SUFFICIENCY = Object.freeze({
  NO_DATA: "no_data",
  INSUFFICIENT: "insufficient_data",
  PRELIMINARY: "preliminary_signal",
  SUPPORTED: "supported_diagnosis",
});

const SUPPORTED_MIN_DIAGNOSTIC = PARENT_EVIDENCE_VOLUME.STRONG_MIN;
const PRELIMINARY_MIN_DIAGNOSTIC = PARENT_EVIDENCE_VOLUME.PRELIMINARY_MIN;
const INSUFFICIENT_MAX_DIAGNOSTIC = PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX;
const TRACE_ID_CAP = 50;

const RECURRENCE_RULES = Object.freeze({
  minWrong: 2,
  minDistinctDays: 2,
  minDistinctPatternFamilies: 0,
});

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Owner thresholds:
 * 0 = no_data, 1–4 = insufficient, 5–11 = preliminary, 12+ + recurrence = supported
 * @param {number} rawDiagnosticCount
 * @param {boolean} recurrenceMet
 * @returns {string}
 */
export function resolveDataSufficiency(rawDiagnosticCount, recurrenceMet) {
  const n = Math.max(0, Math.floor(safeNum(rawDiagnosticCount)));
  if (n === 0) return DATA_SUFFICIENCY.NO_DATA;
  if (n <= INSUFFICIENT_MAX_DIAGNOSTIC) return DATA_SUFFICIENCY.INSUFFICIENT;
  if (n < SUPPORTED_MIN_DIAGNOSTIC) return DATA_SUFFICIENCY.PRELIMINARY;
  if (n >= SUPPORTED_MIN_DIAGNOSTIC && recurrenceMet) return DATA_SUFFICIENCY.SUPPORTED;
  return DATA_SUFFICIENCY.PRELIMINARY;
}

/**
 * @param {string} dataSufficiency
 * @returns {string}
 */
export function confidenceLevelFromSufficiency(dataSufficiency) {
  switch (dataSufficiency) {
    case DATA_SUFFICIENCY.SUPPORTED:
      return "moderate";
    case DATA_SUFFICIENCY.PRELIMINARY:
      return "low";
    case DATA_SUFFICIENCY.INSUFFICIENT:
      return "insufficient_data";
    default:
      return "insufficient_data";
  }
}

/**
 * @param {string} dataSufficiency
 * @param {boolean} recurrenceMet
 * @returns {string}
 */
export function confidenceReasonFromSufficiency(dataSufficiency, recurrenceMet) {
  if (dataSufficiency === DATA_SUFFICIENCY.NO_DATA) return "no_diagnostic_evidence";
  if (dataSufficiency === DATA_SUFFICIENCY.INSUFFICIENT) return "too_few_questions";
  if (dataSufficiency === DATA_SUFFICIENCY.PRELIMINARY && !recurrenceMet) return "no_recurrence";
  if (dataSufficiency === DATA_SUFFICIENCY.PRELIMINARY) return "below_supported_threshold";
  if (dataSufficiency === DATA_SUFFICIENCY.SUPPORTED) return "supported";
  return "unknown";
}

/**
 * @param {Array<{ timestamp?: number, isCorrect?: boolean, answeredAt?: string }>} wrongRows
 * @returns {boolean}
 */
export function meetsDiagnosticRecurrence(wrongRows) {
  const wrongs = (wrongRows || []).filter((r) => r && r.isCorrect === false);
  if (wrongs.length < RECURRENCE_RULES.minWrong) return false;

  const events = wrongs.map((r) => {
    let ts = r.timestamp;
    if (!Number.isFinite(ts) && r.answeredAt) {
      ts = Date.parse(String(r.answeredAt));
    }
    return { timestamp: Number.isFinite(ts) ? ts : null, isCorrect: false };
  });

  return passesRecurrenceRules(events, RECURRENCE_RULES);
}

/**
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @param {string} [subject]
 * @param {string} [topic]
 * @returns {Array<Record<string, unknown>>}
 */
function filterMistakesForScope(recentMistakes, subject, topic) {
  if (!Array.isArray(recentMistakes)) return [];
  return recentMistakes.filter((m) => {
    if (!m || typeof m !== "object") return false;
    if (subject && String(m.subject || "") !== subject) return false;
    if (topic && String(m.topic || "") !== topic) return false;
    return true;
  });
}

/**
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @param {string} groupKey
 * @returns {Array<Record<string, unknown>>}
 */
function filterMistakesForSubSkillGroup(recentMistakes, groupKey) {
  if (!Array.isArray(recentMistakes)) return [];
  return recentMistakes.filter((m) => {
    if (!m || typeof m !== "object") return false;
    const cm = m._canonicalMeta;
    if (!cm || typeof cm !== "object") return false;
    const key = buildSubSkillGroupKey(
      /** @type {Record<string, unknown>} */ (cm),
      String(m.subject || ""),
      String(m.topic || "")
    );
    return key === groupKey;
  });
}

/**
 * Q2-E.1 — internal bySubSkill scopes (parent context, flag-gated).
 *
 * @param {Record<string, unknown>} payload
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @returns {Record<string, object>}
 */
function computeInternalBySubSkill(payload, recentMistakes) {
  const rollup = payload._diagnosticSubSkillRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, object>} */
  const bySubSkill = {};

  for (const [groupKey, entry] of Object.entries(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    const diagnosticAnswers = safeNum(row.diagnosticAnswers);
    if (diagnosticAnswers <= 0) continue;

    const scopeMistakes = filterMistakesForSubSkillGroup(recentMistakes, groupKey);
    const scopeIds = scopeMistakes
      .map((m) => {
        if (m?.id) return String(m.id);
        if (m?.answerId) return String(m.answerId);
        if (m?.questionId) return String(m.questionId);
        return null;
      })
      .filter(Boolean);

    const snapshot = buildScopeSnapshot(diagnosticAnswers, scopeMistakes, scopeIds, {
      free_practice: diagnosticAnswers,
    });

    bySubSkill[groupKey] = {
      subject: row.subject,
      topic: row.topic,
      skillId: row.skillId ?? null,
      subSkill: row.subSkill ?? null,
      questionType: row.questionType ?? null,
      metadataConfidence: row.metadataConfidence ?? null,
      possibleErrorPatterns: row.possibleErrorPatterns ?? null,
      groupingLevel: row.groupingLevel ?? "topic",
      evidenceCount: snapshot.evidenceCount,
      rawDiagnosticCount: snapshot.rawDiagnosticCount,
      recurrence: snapshot.recurrence,
      dataSufficiency: snapshot.dataSufficiency,
      confidenceLevel: snapshot.confidenceLevel,
      confidenceReason: snapshot.confidenceReason,
      supportingEvidenceIds: snapshot.supportingEvidenceIds,
    };
  }

  return bySubSkill;
}

/**
 * Q2-E.2 — attach per-group errorPatterns to bySubSkill entries.
 *
 * @param {Record<string, object>} bySubSkill
 * @param {Record<string, Record<string, object>>} bySubSkillGroupPatterns
 * @returns {Record<string, object>}
 */
function attachErrorPatternsToBySubSkill(bySubSkill, bySubSkillGroupPatterns) {
  /** @type {Record<string, object>} */
  const out = {};
  for (const [groupKey, entry] of Object.entries(bySubSkill)) {
    const patterns = bySubSkillGroupPatterns[groupKey];
    out[groupKey] = {
      ...entry,
      ...(patterns && Object.keys(patterns).length > 0 ? { errorPatterns: patterns } : {}),
    };
  }
  return out;
}

/**
 * @param {number} diagnosticAnswers
 * @param {Array<Record<string, unknown>>} scopeMistakes
 * @param {string[]} supportingEvidenceIds
 * @param {Record<string, number>} [sourceBreakdown]
 * @returns {object}
 */
function buildScopeSnapshot(diagnosticAnswers, scopeMistakes, supportingEvidenceIds, sourceBreakdown = {}) {
  const rawDiagnosticCount = Math.max(0, Math.floor(safeNum(diagnosticAnswers)));
  const wrongMistakes = scopeMistakes.map((m) => ({
    isCorrect: false,
    answeredAt: m.answeredAt || m.answered_at || m.timestamp,
    timestamp: m.timestampMs || (m.answeredAt ? Date.parse(String(m.answeredAt)) : null),
  }));
  const recurrenceMet = meetsDiagnosticRecurrence(wrongMistakes);
  const dataSufficiency = resolveDataSufficiency(rawDiagnosticCount, recurrenceMet);
  const confidenceLevel = confidenceLevelFromSufficiency(dataSufficiency);

  return {
    evidenceCount: rawDiagnosticCount,
    rawDiagnosticCount,
    sourceBreakdown: { ...sourceBreakdown },
    recurrence: {
      met: recurrenceMet,
      wrongCount: wrongMistakes.length,
    },
    dataSufficiency,
    confidenceLevel,
    confidenceReason: confidenceReasonFromSufficiency(dataSufficiency, recurrenceMet),
    supportingEvidenceIds: supportingEvidenceIds.slice(0, TRACE_ID_CAP),
  };
}

/**
 * Parent-context evidence quality from aggregated report payload.
 * @param {Record<string, unknown>} payload
 * @returns {{ public: object, internal: object }}
 */
export function computeParentContextEvidenceQuality(payload) {
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
  const subjects = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : {};
  const recentMistakes = Array.isArray(payload?.recentMistakes) ? payload.recentMistakes : [];

  const studentDiagnostic = safeNum(summary.diagnosticAnswers);
  const studentSourceBreakdown = {
    free_practice: studentDiagnostic,
  };

  const studentIds = [];
  for (const m of recentMistakes) {
    if (m?.id) studentIds.push(String(m.id));
    else if (m?.answerId) studentIds.push(String(m.answerId));
  }

  const student = buildScopeSnapshot(
    studentDiagnostic,
    recentMistakes,
    studentIds,
    studentSourceBreakdown
  );

  const byTopic = {};
  const bySubject = {};

  for (const subjectKey of REPORT_AGG_SUBJECTS) {
    const subj = subjects[subjectKey];
    if (!subj || typeof subj !== "object") continue;
    const subjDiag = safeNum(subj.diagnosticAnswers);
    if (subjDiag <= 0) continue;

    const subjMistakes = filterMistakesForScope(recentMistakes, subjectKey);
    const subjIds = subjMistakes
      .map((m) => (m?.id ? String(m.id) : m?.answerId ? String(m.answerId) : null))
      .filter(Boolean);

    bySubject[subjectKey] = buildScopeSnapshot(subjDiag, subjMistakes, subjIds, {
      free_practice: subjDiag,
    });

    for (const [topicKey, topic] of Object.entries(subj.topics || {})) {
      if (!topic || typeof topic !== "object") continue;
      const topicDiag = safeNum(topic.diagnosticAnswers);
      if (topicDiag <= 0) continue;
      const topicMistakes = filterMistakesForScope(recentMistakes, subjectKey, topicKey);
      const topicIds = topicMistakes
        .map((m) => (m?.id ? String(m.id) : m?.answerId ? String(m.answerId) : null))
        .filter(Boolean);
      byTopic[`${subjectKey}::${topicKey}`] = buildScopeSnapshot(topicDiag, topicMistakes, topicIds, {
        free_practice: topicDiag,
      });
    }
  }

  let internalBySubSkill;
  let internalErrorPatterns;
  let internalQuestionTypes;
  let internalProblemClasses;
  let internalDifficultyDepths;
  let shadowParentGating;
  let appliedParentGating;
  /** @type {Array<Record<string, unknown>>|undefined} */
  let gatingDecisions;
  let validatedPromotionCandidates;
  let rejectedPromotionCandidates;
  let promotionValidationReasons;
  let promotionValidation;
  let appliedParentPromotion;
  /** @type {Array<Record<string, unknown>>|undefined} */
  let promotionDecisions;
  if (isDiagnosticMetadataSubskillEnabled()) {
    const patternSummaries = computeInternalErrorPatternSummaries(recentMistakes);
    const bySubSkillBase = computeInternalBySubSkill(payload, recentMistakes);
    const withPatterns = attachErrorPatternsToBySubSkill(
      bySubSkillBase,
      patternSummaries.bySubSkillGroup
    );
    const cappedBySubSkill = applyMetadataConfidenceCapsToBySubSkill(withPatterns);
    const questionTypeBreakdown = computeQuestionTypeBreakdownByGroup(payload);
    const withQuestionTypes = attachQuestionTypeBreakdownToBySubSkill(
      cappedBySubSkill,
      questionTypeBreakdown
    );
    const problemClassBreakdown = computeProblemClassBreakdownByGroup(payload);
    const difficultyDepthBreakdown = computeDifficultyDepthBreakdownByGroup(payload);
    internalBySubSkill = attachPedagogyBreakdownsToBySubSkill(
      withQuestionTypes,
      problemClassBreakdown,
      difficultyDepthBreakdown
    );
    internalErrorPatterns = applyMetadataConfidenceCapsToErrorPatterns(
      Object.keys(patternSummaries.global).length > 0 ? patternSummaries.global : undefined,
      internalBySubSkill
    );
    const questionTypes = computeInternalQuestionTypes(payload);
    internalQuestionTypes =
      Object.keys(questionTypes).length > 0 ? questionTypes : undefined;
    const problemClasses = computeInternalProblemClasses(payload);
    internalProblemClasses =
      Object.keys(problemClasses).length > 0 ? problemClasses : undefined;
    const difficultyDepths = computeInternalDifficultyDepths(payload);
    internalDifficultyDepths =
      Object.keys(difficultyDepths).length > 0 ? difficultyDepths : undefined;
  }

  const publicView = {
    context: "parent",
    student: {
      evidenceCount: student.evidenceCount,
      rawDiagnosticCount: student.rawDiagnosticCount,
      dataSufficiency: student.dataSufficiency,
      confidenceLevel: student.confidenceLevel,
      confidenceReason: student.confidenceReason,
      recurrenceMet: student.recurrence.met,
    },
    bySubject: Object.fromEntries(
      Object.entries(bySubject).map(([k, v]) => [
        k,
        {
          dataSufficiency: v.dataSufficiency,
          confidenceLevel: v.confidenceLevel,
          evidenceCount: v.evidenceCount,
          recurrenceMet: v.recurrence.met,
        },
      ])
    ),
    byTopic: Object.fromEntries(
      Object.entries(byTopic).map(([k, v]) => [
        k,
        {
          dataSufficiency: v.dataSufficiency,
          confidenceLevel: v.confidenceLevel,
          evidenceCount: v.evidenceCount,
          recurrenceMet: v.recurrence.met,
        },
      ])
    ),
  };

  if (isDiagnosticMetadataSubskillEnabled()) {
    const internalForShadow = {
      byTopic,
      ...(internalBySubSkill ? { bySubSkill: internalBySubSkill } : {}),
      ...(internalErrorPatterns ? { errorPatterns: internalErrorPatterns } : {}),
      ...(internalQuestionTypes ? { questionTypes: internalQuestionTypes } : {}),
      ...(internalProblemClasses ? { problemClasses: internalProblemClasses } : {}),
      ...(internalDifficultyDepths ? { difficultyDepths: internalDifficultyDepths } : {}),
    };
    shadowParentGating = computeShadowParentGatingAnalysis({
      publicView,
      internal: internalForShadow,
    });

    if (shadowParentGating) {
      const promotionValidationResult = validateShadowPromotionCandidates({
        shadowParentGating,
        internal: internalForShadow,
        publicView,
      });
      const hasPromotionValidation =
        promotionValidationResult.validatedPromotionCandidates.length > 0 ||
        promotionValidationResult.rejectedPromotionCandidates.length > 0 ||
        promotionValidationResult.promotionValidationReasons.length > 0;
      if (hasPromotionValidation) {
        validatedPromotionCandidates = promotionValidationResult.validatedPromotionCandidates;
        rejectedPromotionCandidates = promotionValidationResult.rejectedPromotionCandidates;
        promotionValidationReasons = promotionValidationResult.promotionValidationReasons;
        promotionValidation = promotionValidationResult.promotionValidation;
      }

      if (
        isActiveMetadataParentPromotionEnabled() &&
        Array.isArray(validatedPromotionCandidates) &&
        validatedPromotionCandidates.length > 0
      ) {
        const applied = applyActiveParentPromotion({
          validatedPromotionCandidates,
          internal: internalForShadow,
          publicView,
        });
        if (applied.promotionDecisions.length > 0) {
          appliedParentPromotion = applied.appliedParentPromotion;
          promotionDecisions = applied.promotionDecisions;
        }
      }
    }

    if (isActiveMetadataParentGatingEnabled() && shadowParentGating) {
      const applied = applyActiveParentGating({
        shadowParentGating,
        internal: internalForShadow,
        publicView,
      });
      const hasGatingDecisions = applied.gatingDecisions.length > 0;
      const hasShadowActivity =
        (Array.isArray(shadowParentGating.shadowSuppressionCandidates) &&
          shadowParentGating.shadowSuppressionCandidates.length > 0) ||
        (Array.isArray(shadowParentGating.shadowPromotionCandidates) &&
          shadowParentGating.shadowPromotionCandidates.length > 0);
      if (hasGatingDecisions || hasShadowActivity) {
        appliedParentGating = applied.appliedParentGating;
        if (hasGatingDecisions) {
          gatingDecisions = applied.gatingDecisions;
        }
      }
    }
  }

  const internal = {
    context: "parent",
    student,
    bySubject,
    byTopic,
    ...(internalBySubSkill ? { bySubSkill: internalBySubSkill } : {}),
    ...(internalErrorPatterns ? { errorPatterns: internalErrorPatterns } : {}),
    ...(internalQuestionTypes ? { questionTypes: internalQuestionTypes } : {}),
    ...(internalProblemClasses ? { problemClasses: internalProblemClasses } : {}),
    ...(internalDifficultyDepths ? { difficultyDepths: internalDifficultyDepths } : {}),
    ...(shadowParentGating ? { shadowParentGating } : {}),
    ...(appliedParentGating ? { appliedParentGating } : {}),
    ...(gatingDecisions ? { gatingDecisions } : {}),
    ...(validatedPromotionCandidates ? { validatedPromotionCandidates } : {}),
    ...(rejectedPromotionCandidates ? { rejectedPromotionCandidates } : {}),
    ...(promotionValidationReasons ? { promotionValidationReasons } : {}),
    ...(promotionValidation ? { promotionValidation } : {}),
    ...(appliedParentPromotion ? { appliedParentPromotion } : {}),
    ...(promotionDecisions ? { promotionDecisions } : {}),
  };

  return { public: publicView, internal };
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {object|null}
 */
export function getParentEvidenceQuality(payload) {
  const eq = payload?.meta?.evidenceQuality;
  return eq && typeof eq === "object" ? eq : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {object|null}
 */
function getInternalParentEvidenceQuality(payload) {
  const eq = payload?.meta?._evidenceQuality;
  return eq && typeof eq === "object" ? eq : null;
}

/**
 * Strong parent-facing diagnosis allowed at student scope.
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function allowsStrongParentDiagnosisAtStudent(payload) {
  const suff = getParentEvidenceQuality(payload)?.student?.dataSufficiency;
  return suff === DATA_SUFFICIENCY.SUPPORTED;
}

/**
 * Hedged insight (8–11 questions or supported) — cautious wording, not strong diagnosis.
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function allowsHedgedParentInsightAtStudent(payload) {
  const student = getParentEvidenceQuality(payload)?.student;
  const q = Math.max(0, Math.floor(safeNum(student?.rawDiagnosticCount)));
  if (q < PARENT_EVIDENCE_VOLUME.INSIGHT_MIN) return false;
  const suff = student?.dataSufficiency;
  return suff === DATA_SUFFICIENCY.PRELIMINARY || suff === DATA_SUFFICIENCY.SUPPORTED;
}

/**
 * Preliminary signal only (5–7 questions) — no conclusions, early direction copy only.
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function allowsPreliminaryParentSignalAtStudent(payload) {
  const student = getParentEvidenceQuality(payload)?.student;
  const q = Math.max(0, Math.floor(safeNum(student?.rawDiagnosticCount)));
  return q >= PARENT_EVIDENCE_VOLUME.PRELIMINARY_MIN && q < PARENT_EVIDENCE_VOLUME.INSIGHT_MIN;
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {boolean}
 */
export function allowsStrongParentDiagnosisAtTopic(payload, subject, topicKey) {
  const map = getParentEvidenceQuality(payload)?.byTopic;
  const entry = map?.[`${subject}::${topicKey}`];
  const suff = entry?.dataSufficiency;
  if (suff !== DATA_SUFFICIENCY.SUPPORTED) return false;

  if (isActiveMetadataParentGatingEnabled()) {
    const decisions = getInternalParentEvidenceQuality(payload)?.gatingDecisions;
    if (isTopicStrongDiagnosisSuppressedByGating(decisions, subject, topicKey)) {
      return false;
    }
  }

  return true;
}

/**
 * Hedged topic insight (8+ questions at topic scope).
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {boolean}
 */
export function allowsHedgedParentTopicInsight(payload, subject, topicKey) {
  const map = getParentEvidenceQuality(payload)?.byTopic;
  const entry = map?.[`${subject}::${topicKey}`];
  const q = Math.max(0, Math.floor(safeNum(entry?.rawDiagnosticCount ?? entry?.evidenceCount)));
  if (q < PARENT_EVIDENCE_VOLUME.INSIGHT_MIN) return false;
  const suff = entry?.dataSufficiency;
  if (suff === DATA_SUFFICIENCY.NO_DATA || suff === DATA_SUFFICIENCY.INSUFFICIENT) return false;

  if (isActiveMetadataParentGatingEnabled()) {
    const decisions = getInternalParentEvidenceQuality(payload)?.gatingDecisions;
    if (isTopicStrongDiagnosisSuppressedByGating(decisions, subject, topicKey)) {
      return false;
    }
  }

  return true;
}

/**
 * Topic-level strong parent insight allowed (student gate or validated promotion).
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {boolean}
 */
export function allowsStrongParentTopicInsight(payload, subject, topicKey) {
  if (isActiveMetadataParentPromotionEnabled()) {
    const decisions = getInternalParentEvidenceQuality(payload)?.promotionDecisions;
    if (hasTopicPromotionDecision(decisions, subject, topicKey)) return true;
  }
  if (!allowsStrongParentDiagnosisAtTopic(payload, subject, topicKey)) return false;
  if (allowsStrongParentDiagnosisAtStudent(payload)) return true;
  return false;
}

/**
 * Topic-level hedged parent copy (8+ at topic; does not require student supported tier).
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {boolean}
 */
export function allowsHedgedParentTopicInsightForCopy(payload, subject, topicKey) {
  if (!allowsHedgedParentTopicInsight(payload, subject, topicKey)) return false;
  if (allowsHedgedParentInsightAtStudent(payload)) return true;
  if (allowsStrongParentDiagnosisAtStudent(payload)) return true;
  if (isActiveMetadataParentPromotionEnabled()) {
    const decisions = getInternalParentEvidenceQuality(payload)?.promotionDecisions;
    if (hasTopicPromotionDecision(decisions, subject, topicKey)) return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function shouldSuppressClientPatternDiagnostics(payload) {
  const suff = getParentEvidenceQuality(payload)?.student?.dataSufficiency;
  if (suff === DATA_SUFFICIENCY.NO_DATA || suff === DATA_SUFFICIENCY.INSUFFICIENT) {
    if (isActiveMetadataParentPromotionEnabled()) {
      const decisions = getInternalParentEvidenceQuality(payload)?.promotionDecisions;
      if (hasErrorPatternPromotionDecision(decisions)) return false;
    }
    return true;
  }

  if (isActiveMetadataParentGatingEnabled()) {
    const decisions = getInternalParentEvidenceQuality(payload)?.gatingDecisions;
    if (
      Array.isArray(decisions) &&
      decisions.some((d) => d?.action === "suppress_strong_diagnosis")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Attach parent-context evidence quality to payload meta (parent path only).
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function attachParentContextEvidenceQuality(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const { public: publicView, internal } = computeParentContextEvidenceQuality(payload);
  return {
    ...payload,
    meta: {
      ...(payload.meta && typeof payload.meta === "object" ? payload.meta : {}),
      evidenceQuality: publicView,
      _evidenceQuality: internal,
    },
  };
}

export { SUPPORTED_MIN_DIAGNOSTIC, PRELIMINARY_MIN_DIAGNOSTIC, PARENT_EVIDENCE_VOLUME };

/**
 * Shared server-only aggregation for parent learning report data (Supabase sessions + answers).
 * Extracted from `pages/api/parent/students/[studentId]/report-data.js` - same outputs, no behavior change.
 */

import {
  isMissingColumnError,
  normalizeLearningGameMode,
  LEARNING_GAME_MODE_ENUM,
} from "../learning-supabase/learning-activity.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  MODE_CLASSIFICATION_MAP,
  EVIDENCE_CATEGORIES,
} from "../learning/activity-classification.js";
import {
  buildGradeEvidenceFields,
  normalizePracticeGradeKey,
  resolveContentGradeFromAnswerPayload,
  resolveContentGradeFromSessionMetadata,
} from "../learning-supabase/practice-grade-resolution.js";
import {
  EVIDENCE_SOURCE,
  bumpEvidenceSourceCount,
  summarizeEvidenceSources,
} from "../learning-supabase/evidence-source.js";
import {
  bumpActivityFromLearningSession,
  bumpActivityTimestamp,
  createEmptyActivityTimestamps,
  mergeActivityTimestamps,
  parseActivityTimestampMs,
  reconcileLatestActivityToReportRange,
  reportRangeBoundsMs,
} from "../learning-supabase/parent-report-activity-time.js";
import { sanitizeReportDurationSeconds, applyReportDurationSanityToAggregateSubjects } from "./report-duration-sanity.js";
import { attachUnifiedCreditedLearningTimeToParentReportPayload } from "./attach-unified-learning-time.server.js";
import { deepStripInternalReportKeys, stripZeroEvidenceFromPublicReportPayload } from "./report-payload-public-sanitize.js";
import {
  computeBookReadingMinutes,
  isLearningBookTrackingEnabledServer,
} from "../learning/book-dwell-policy.js";
import { isBookTrackingTablesMissingError } from "../learning-supabase/book-events.server.js";
import {
  accumulateCompetitiveByModeEntry,
  buildCompetitiveContext,
  createCompetitiveByModeAccumulator,
  incrementCompetitiveSessionCount,
  shouldExcludeFromRecentMistakes,
} from "../learning/competitive-context.js";
import {
  accumulatePositiveEvidenceEntry,
  buildPositiveEvidence,
  createPositiveEvidenceAccumulator,
  incrementLearningSessionCount,
} from "../learning/positive-evidence.js";
import { extractRecentMistakeEngineFields } from "../learning/question-engine-metadata.js";
import { buildDiagnosticEvidenceRow } from "../../utils/diagnostic-evidence.js";
import {
  buildDiagnosticCanonicalMetadataFromCapture,
  exportEngineFieldsFromCanonical,
} from "../learning/diagnostic-canonical-metadata.js";
import { isDiagnosticMetadataSubskillEnabled } from "../learning/diagnostic-metadata-subskill-flag.js";
import {
  bumpDiagnosticSubSkillRollup,
  resolveCanonicalMetadataFromAnswerSnapshot,
} from "../learning/question-metadata-resolve-at-answer.js";
import {
  bumpDiagnosticQuestionTypeGroupRollup,
  bumpDiagnosticQuestionTypeRollup,
} from "../learning/question-metadata-question-types.js";
import {
  bumpDiagnosticDifficultyDepthGroupRollup,
  bumpDiagnosticDifficultyDepthRollup,
  bumpDiagnosticProblemClassGroupRollup,
  bumpDiagnosticProblemClassRollup,
} from "../learning/question-metadata-problem-class-depth.js";
import { classifyActivityEvidence } from "../learning/activity-classification.js";
import {
  isCountableSelfPracticeAnswer,
  isCountableSelfPracticeSessionMode,
  isParentReportPracticeAnswer,
} from "../learning/parent-report-evidence-gate.js";
import { resolveParentAttemptCreditedTimeMs } from "../learning-supabase/parent-activity-learning-credit.server.js";
import {
  bumpAnswerLevelRollups,
  dominantDisplayLevelFromCounts,
  finalizeDisplayLevelRollups,
  resolveAnswerLevelFromPayload,
} from "../learning/session-evidence-levels.js";

export const REPORT_AGG_SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "history", "moledet_geography"];

/**
 * Fluency thresholds used by the additive aggregation layer for downstream Insight Packet
 * derivation. They are emitted in `meta.fluencyThresholds` so the Insight Packet can stay in
 * sync without hard-coding constants in two places.
 */
export const REPORT_AGG_FLUENCY_THRESHOLDS = Object.freeze({
  slowMs: 60_000,
  fastMs: 6_000,
  manyHints: 3,
});

const TOPIC_ANSWER_EVENTS_CAP_PER_KEY = 500;
const REPORT_TOPIC_GRADE_SEP = "::grade:";

/**
 * @param {string} topic
 * @param {string|null|undefined} contentGradeKey
 */
function buildAdapterTopicRowKeyForTrend(topic, contentGradeKey) {
  const base = safeString(topic, 120) || "general";
  const grade = normalizePracticeGradeKey(contentGradeKey);
  if (grade && grade !== "unknown") {
    return `${base}${REPORT_TOPIC_GRADE_SEP}${grade}`;
  }
  return base;
}

/**
 * @param {Record<string, Record<string, Array<Record<string, unknown>>>>} store
 * @param {string} subject
 * @param {string} topicRowKey
 */
function ensureTopicAnswerEventsBucket(store, subject, topicRowKey) {
  if (!store[subject]) store[subject] = Object.create(null);
  if (!store[subject][topicRowKey]) store[subject][topicRowKey] = [];
  return store[subject][topicRowKey];
}

/**
 * @param {Record<string, Record<string, Array<Record<string, unknown>>>>} store
 * @param {string} subject
 * @param {string} topic
 * @param {string|null|undefined} contentGradeKey
 * @param {{ answeredAtMs: number, isCorrect: boolean, evidenceSource: string }} event
 */
function pushTopicAnswerEventForTrend(store, subject, topic, contentGradeKey, event) {
  const topicRowKey = buildAdapterTopicRowKeyForTrend(topic, contentGradeKey);
  const list = ensureTopicAnswerEventsBucket(store, subject, topicRowKey);
  if (list.length >= TOPIC_ANSWER_EVENTS_CAP_PER_KEY) return;
  list.push(event);
}

const ALLOWED_MODE_VALUES = LEARNING_GAME_MODE_ENUM;
const ALLOWED_LEVEL_VALUES = Object.freeze(["easy", "medium", "hard"]);
const GRADE_LEVEL_PATTERN = /^g[1-9]$/;
const PROBE_OUTCOME_STATUS_VALUES = Object.freeze(["supported", "weakened", "uncertain"]);

/**
 * Q2-E.1 — track diagnostic subSkill rollup when feature flag is enabled.
 *
 * @param {Record<string, object>} rollup
 * @param {Record<string, unknown>} source
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string }} classification
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 */
function trackDiagnosticSubSkillRollupIfEnabled(
  rollup,
  source,
  classification,
  subject,
  topic,
  isCorrect
) {
  if (!isDiagnosticMetadataSubskillEnabled()) return;
  if (classification.isDiagnosticEligible !== true) return;
  if (classification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) return;

  const meta = resolveCanonicalMetadataFromAnswerSnapshot(source, {
    subject,
    topic,
    isDiagnosticEligible: true,
  });
  if (!meta) return;
  bumpDiagnosticSubSkillRollup(rollup, meta, subject, topic, isCorrect);
}

/**
 * Q2-E.4 — track diagnostic questionType rollups when feature flag is enabled.
 *
 * @param {Record<string, object>} globalRollup
 * @param {Record<string, object>} groupRollup
 * @param {Record<string, unknown>} source
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string }} classification
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 */
function trackDiagnosticQuestionTypeRollupIfEnabled(
  globalRollup,
  groupRollup,
  source,
  classification,
  subject,
  topic,
  isCorrect
) {
  if (!isDiagnosticMetadataSubskillEnabled()) return;
  if (classification.isDiagnosticEligible !== true) return;
  if (classification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) return;

  const meta = resolveCanonicalMetadataFromAnswerSnapshot(source, {
    subject,
    topic,
    isDiagnosticEligible: true,
  });
  if (!meta) return;
  bumpDiagnosticQuestionTypeRollup(meta, subject, topic, isCorrect, globalRollup);
  bumpDiagnosticQuestionTypeGroupRollup(meta, subject, topic, isCorrect, groupRollup);
}

/**
 * Q2-E.6 — track diagnostic problemClass / difficultyDepth rollups when feature flag is enabled.
 *
 * @param {Record<string, object>} problemClassRollup
 * @param {Record<string, object>} problemClassByGroupRollup
 * @param {Record<string, object>} difficultyDepthRollup
 * @param {Record<string, object>} difficultyDepthByGroupRollup
 * @param {Record<string, unknown>} source
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string }} classification
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 */
function trackDiagnosticPedagogyRollupIfEnabled(
  problemClassRollup,
  problemClassByGroupRollup,
  difficultyDepthRollup,
  difficultyDepthByGroupRollup,
  source,
  classification,
  subject,
  topic,
  isCorrect
) {
  if (!isDiagnosticMetadataSubskillEnabled()) return;
  if (classification.isDiagnosticEligible !== true) return;
  if (classification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) return;

  const meta = resolveCanonicalMetadataFromAnswerSnapshot(source, {
    subject,
    topic,
    isDiagnosticEligible: true,
  });
  if (!meta) return;
  bumpDiagnosticProblemClassRollup(meta, subject, topic, isCorrect, problemClassRollup);
  bumpDiagnosticProblemClassGroupRollup(
    meta,
    subject,
    topic,
    isCorrect,
    problemClassByGroupRollup
  );
  bumpDiagnosticDifficultyDepthRollup(meta, subject, topic, isCorrect, difficultyDepthRollup);
  bumpDiagnosticDifficultyDepthGroupRollup(
    meta,
    subject,
    topic,
    isCorrect,
    difficultyDepthByGroupRollup
  );
}

/**
 * @param {Record<string, unknown>} source
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string }} classification
 * @param {string} subject
 * @param {string} topic
 * @returns {Record<string, unknown>|null}
 */
function resolveMistakeCanonicalMetaIfEnabled(source, classification, subject, topic) {
  if (!isDiagnosticMetadataSubskillEnabled()) return null;
  if (classification.isDiagnosticEligible !== true) return null;
  if (classification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) return null;
  return resolveCanonicalMetadataFromAnswerSnapshot(source, {
    subject,
    topic,
    isDiagnosticEligible: true,
  });
}

function pickEnumString(value, allowed) {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "unknown";
  return allowed.includes(normalized) ? normalized : "unknown";
}

function readModeLevelFromObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { mode: "unknown", level: "unknown" };
  const modeNorm =
    normalizeLearningGameMode(obj.gameMode) || normalizeLearningGameMode(obj.mode);
  return {
    mode: modeNorm || "unknown",
    level: pickEnumString(obj.level, ALLOWED_LEVEL_VALUES),
  };
}

function normalizeFiniteNonNegativeNumber(value, max) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return typeof max === "number" && num > max ? max : num;
}

function safeStringArray(value, maxItems = 8, maxLen = 80) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeString(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function normalizeDiagnosticProbeEvidenceFromClientMeta(clientMeta, context = {}) {
  const source =
    clientMeta && typeof clientMeta === "object" && !Array.isArray(clientMeta)
      ? clientMeta.diagnosticProbe
      : null;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  if (source.isDiagnosticProbeAttempt !== true) return null;
  const outcomeStatus = safeString(source.outcomeStatus, 40);
  if (!PROBE_OUTCOME_STATUS_VALUES.includes(outcomeStatus || "")) return null;
  return {
    isDiagnosticProbeAttempt: true,
    probeId: safeString(source.probeId, 180),
    subjectId: safeString(source.subjectId, 40) || safeString(context.subject, 40),
    topicId: safeString(source.topicId, 120) || safeString(context.topic, 120),
    diagnosticSkillId: safeString(source.diagnosticSkillId, 160),
    dominantTag: safeString(source.dominantTag, 120),
    expectedErrorTags: safeStringArray(source.expectedErrorTags),
    inferredTags: safeStringArray(source.inferredTags),
    outcomeStatus,
    lastOutcome: safeString(source.lastOutcome, 80),
    supportCount: normalizeFiniteNonNegativeNumber(source.supportCount, 1000) ?? 0,
    weakenCount: normalizeFiniteNonNegativeNumber(source.weakenCount, 1000) ?? 0,
    answeredAt: safeString(context.answeredAt, 80) || safeString(source.answeredAt, 80),
    learningSessionId:
      safeString(context.learningSessionId, 80) || safeString(source.learningSessionId, 80),
    questionId: safeString(context.questionId, 180),
  };
}

function emptyEnumCounts(allowed) {
  const out = { unknown: 0 };
  for (const key of allowed) out[key] = 0;
  return out;
}

function createTopicGradeSlice() {
  return {
    ...createEmptyActivityTimestamps(),
    answers: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    diagnosticAnswers: 0,
    diagnosticCorrect: 0,
    diagnosticWrong: 0,
    diagnosticAccuracy: 0,
    competitiveAnswers: 0,
    competitiveCorrect: 0,
    competitiveAccuracy: 0,
    learningAnswers: 0,
    stepByStepCount: 0,
    durationSeconds: 0,
    hintsSum: 0,
    hintsCount: 0,
    timeMsSum: 0,
    timeMsCount: 0,
    correctSlowAnswers: 0,
    correctManyHintsAnswers: 0,
    wrongFastAnswers: 0,
    avgHintsPerQuestion: null,
    avgTimePerQuestionSec: null,
    modeCounts: emptyEnumCounts(ALLOWED_MODE_VALUES),
    levelCounts: emptyEnumCounts(ALLOWED_LEVEL_VALUES),
    displayLevelCounts: { regular: 0, advanced: 0, unknown: 0 },
    contentGradeLevel: null,
    registeredGradeLevel: null,
    gradeRelation: "unknown",
    gradeDelta: null,
    // Phase C: provenance only — which activity origin produced this evidence.
    evidenceSourceCounts: {},
  };
}

/**
 * Modes where per-answer gameMode should drive classification (fixes session-sticky learning mode).
 */
const ANSWER_MODE_CLASSIFICATION_MODES = new Set([
  "practice",
  "normal",
  "graded",
  "drill",
  "review",
  "practice_mistakes",
  "homework",
  "quiz",
  "worksheet",
  "live_lesson",
]);

/**
 * Classify a single answer row for aggregation bucketing.
 * Uses stored classification (Phase 1+) if present; falls back to mode-based derivation.
 *
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string, contextFlags?: object }} classificationSource
 * @param {string} resolvedMode
 * @param {{ afterStepByStep?: boolean, contextAfterBookReading?: boolean, hintsUsed?: number }} [runtimeContext]
 * @returns {{ isDiagnosticEligible: boolean, evidenceCategory: string, afterStepByStep: boolean }}
 */
function classifyAnswerForAggregation(classificationSource, resolvedMode, runtimeContext = {}) {
  const normalizedMode =
    typeof resolvedMode === "string" ? resolvedMode.trim().toLowerCase() : "";
  const runtimeFlags = runtimeContext && typeof runtimeContext === "object" ? runtimeContext : {};

  if (normalizedMode && ANSWER_MODE_CLASSIFICATION_MODES.has(normalizedMode)) {
    const derived = classifyActivityEvidence(normalizedMode, "free_practice", {
      afterStepByStep: runtimeFlags.afterStepByStep === true,
      contextAfterBookReading: runtimeFlags.contextAfterBookReading === true,
      hintsUsed:
        typeof runtimeFlags.hintsUsed === "number" ? runtimeFlags.hintsUsed : 0,
    });
    return {
      isDiagnosticEligible: derived.isDiagnosticEligible,
      evidenceCategory: derived.evidenceCategory,
      afterStepByStep:
        derived.contextFlags?.afterStepByStep === true || runtimeFlags.afterStepByStep === true,
    };
  }

  const src = classificationSource || {};

  // Priority 1: use stored classification from Phase 1
  if (src.isDiagnosticEligible !== undefined) {
    const isDiag = src.isDiagnosticEligible === true;
    const cat =
      typeof src.evidenceCategory === "string"
        ? src.evidenceCategory
        : isDiag
        ? EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT
        : EVIDENCE_CATEGORIES.UNCLASSIFIED;
    const afterStepByStep = !!(src.contextFlags?.afterStepByStep);
    return { isDiagnosticEligible: isDiag, evidenceCategory: cat, afterStepByStep };
  }

  // Priority 2: derive from mode
  if (resolvedMode && resolvedMode !== "unknown") {
    const entry = MODE_CLASSIFICATION_MAP[resolvedMode];
    if (entry) {
      return {
        isDiagnosticEligible: entry.isDiagnosticEligible,
        evidenceCategory: entry.evidenceCategory,
        afterStepByStep: false,
      };
    }
  }

  // Fallback: unclassified — excluded from all diagnostic claims
  return {
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.UNCLASSIFIED,
    afterStepByStep: false,
  };
}

/**
 * Apply diagnostic/competitive/learning classification counts to a slice.
 */
function applyClassificationToSlice(slice, { isDiagnosticEligible, evidenceCategory, afterStepByStep, isCorrect }) {
  const isCompetitive = evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE;

  if (isDiagnosticEligible && !isCompetitive) {
    slice.diagnosticAnswers += 1;
    if (isCorrect) slice.diagnosticCorrect += 1;
    else slice.diagnosticWrong += 1;
  } else if (isCompetitive) {
    slice.competitiveAnswers += 1;
    if (isCorrect) slice.competitiveCorrect += 1;
  } else {
    slice.learningAnswers += 1;
    if (afterStepByStep) slice.stepByStepCount += 1;
  }
}

function createTopicAccumulator() {
  return {
    ...createTopicGradeSlice(),
    byContentGrade: {},
  };
}

function ensureTopicGradeSlice(topicAgg, contentGradeKey, registeredGradeKey) {
  const gradeKey = contentGradeKey || "unknown";
  if (!topicAgg.byContentGrade[gradeKey]) {
    const evidence = buildGradeEvidenceFields(
      registeredGradeKey,
      contentGradeKey === "unknown" ? null : contentGradeKey
    );
    topicAgg.byContentGrade[gradeKey] = {
      ...createTopicGradeSlice(),
      contentGradeLevel: evidence.contentGradeLevel,
      registeredGradeLevel: evidence.registeredGradeLevel,
      gradeRelation: evidence.gradeRelation,
      gradeDelta: evidence.gradeDelta,
    };
  }
  return topicAgg.byContentGrade[gradeKey];
}

function applyAnswerMetricsToSlice(slice, { hintsUsed, timeMs, resolvedMode, resolvedLevel, isCorrect, isSlow, isFast, isManyHints }) {
  slice.answers += 1;
  if (hintsUsed != null) {
    slice.hintsSum += hintsUsed;
    slice.hintsCount += 1;
  }
  if (timeMs != null) {
    slice.timeMsSum += timeMs;
    slice.timeMsCount += 1;
  }
  slice.modeCounts[resolvedMode] = (slice.modeCounts[resolvedMode] || 0) + 1;
  slice.levelCounts[resolvedLevel] = (slice.levelCounts[resolvedLevel] || 0) + 1;
  if (isCorrect) {
    slice.correct += 1;
    if (isSlow) slice.correctSlowAnswers += 1;
    if (isManyHints) slice.correctManyHintsAnswers += 1;
  } else {
    slice.wrong += 1;
    if (isFast) slice.wrongFastAnswers += 1;
  }
}

function finalizeTopicGradeSlice(slice) {
  slice.accuracy = slice.answers > 0 ? Number(((slice.correct / slice.answers) * 100).toFixed(2)) : 0;
  slice.diagnosticAccuracy =
    slice.diagnosticAnswers > 0
      ? Number(((slice.diagnosticCorrect / slice.diagnosticAnswers) * 100).toFixed(2))
      : 0;
  slice.competitiveAccuracy =
    slice.competitiveAnswers > 0
      ? Number(((slice.competitiveCorrect / slice.competitiveAnswers) * 100).toFixed(2))
      : 0;
  slice.diagnosticConfidence =
    slice.diagnosticAnswers >= 5 ? "sufficient" : "insufficient";
  slice.avgHintsPerQuestion =
    slice.hintsCount > 0 ? Number((slice.hintsSum / slice.hintsCount).toFixed(2)) : null;
  slice.avgTimePerQuestionSec =
    slice.timeMsCount > 0 ? Number((slice.timeMsSum / slice.timeMsCount / 1000).toFixed(2)) : null;
  finalizeDisplayLevelRollups(slice);
  const sourceSummary = summarizeEvidenceSources(slice.evidenceSourceCounts);
  slice.evidenceSourceCounts = sourceSummary.evidenceSourceCounts;
  slice.evidenceSources = sourceSummary.evidenceSources;
  slice.primaryEvidenceSource = sourceSummary.primaryEvidenceSource;
}

function rollupTopicActivityTimestamps(topic) {
  for (const gradeKey of Object.keys(topic.byContentGrade || {})) {
    mergeActivityTimestamps(topic, topic.byContentGrade[gradeKey]);
  }
}

function rollupSubjectActivityTimestamps(subject) {
  for (const topicKey of Object.keys(subject.topics || {})) {
    const topic = subject.topics[topicKey];
    rollupTopicActivityTimestamps(topic);
    mergeActivityTimestamps(subject, topic);
  }
}

function distributeDurationAcrossGradeSlices(topic, addedSeconds) {
  if (!topic || addedSeconds <= 0) return;
  const byGrade = topic.byContentGrade;
  if (!byGrade || typeof byGrade !== "object") return;

  const gradeEntries = Object.entries(byGrade).map(([gradeKey, slice]) => ({
    gradeKey,
    slice,
    answers: Math.max(0, Math.floor(Number(slice?.answers) || 0)),
  }));
  const answeredGrades = gradeEntries.filter((entry) => entry.answers > 0);
  if (!answeredGrades.length) return;

  const totalAnswers = answeredGrades.reduce((sum, entry) => sum + entry.answers, 0);
  let remaining = addedSeconds;
  answeredGrades.forEach((entry, idx) => {
    const share =
      idx === answeredGrades.length - 1
        ? remaining
        : Math.floor((addedSeconds * entry.answers) / totalAnswers);
    remaining -= share;
    entry.slice.durationSeconds =
      Math.max(0, Math.floor(Number(entry.slice.durationSeconds) || 0)) + share;
  });
}

/**
 * Session duration is keyed by session.topic; answers may use payload.topic.
 * Move duration from zero-answer topics onto answer-bearing topics in the same subject.
 * @param {Record<string, unknown>} subject
 */
export function reallocateOrphanTopicSessionDuration(subject) {
  if (!subject?.topics || typeof subject.topics !== "object") return;

  const entries = Object.entries(subject.topics).map(([key, topic]) => ({
    key,
    topic,
    answers: Math.max(0, Math.floor(Number(topic?.answers) || 0)),
    durationSeconds: Math.max(0, Math.floor(Number(topic?.durationSeconds) || 0)),
  }));

  const answered = entries.filter((entry) => entry.answers > 0);
  if (!answered.length) return;

  let orphanSeconds = 0;
  for (const entry of entries) {
    if (entry.answers <= 0 && entry.durationSeconds > 0) {
      orphanSeconds += entry.durationSeconds;
      entry.topic.durationSeconds = 0;
      for (const gradeKey of Object.keys(entry.topic.byContentGrade || {})) {
        const slice = entry.topic.byContentGrade[gradeKey];
        if (Math.max(0, Math.floor(Number(slice?.answers) || 0)) <= 0) {
          slice.durationSeconds = 0;
        }
      }
    }
  }

  if (orphanSeconds <= 0) return;

  const totalAnswers = answered.reduce((sum, entry) => sum + entry.answers, 0);
  let remaining = orphanSeconds;
  answered.forEach((entry, idx) => {
    const share =
      idx === answered.length - 1
        ? remaining
        : Math.floor((orphanSeconds * entry.answers) / totalAnswers);
    remaining -= share;
    entry.topic.durationSeconds =
      Math.max(0, Math.floor(Number(entry.topic.durationSeconds) || 0)) + share;
    distributeDurationAcrossGradeSlices(entry.topic, share);
  });
}

export function isoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDateParam(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (isoDateOnly(parsed) !== trimmed) return null;
  return parsed;
}

function createSubjectAccumulator() {
  const out = {};
  for (const subject of REPORT_AGG_SUBJECTS) {
    out[subject] = {
      ...createEmptyActivityTimestamps(),
      sessions: 0,
      answers: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
      diagnosticAnswers: 0,
      diagnosticCorrect: 0,
      diagnosticWrong: 0,
      diagnosticAccuracy: 0,
      competitiveAnswers: 0,
      competitiveCorrect: 0,
      competitiveAccuracy: 0,
      learningAnswers: 0,
      stepByStepCount: 0,
      durationSeconds: 0,
      hintsSum: 0,
      hintsCount: 0,
      timeMsSum: 0,
      timeMsCount: 0,
      correctSlowAnswers: 0,
      correctManyHintsAnswers: 0,
      wrongFastAnswers: 0,
      avgHintsPerQuestion: null,
      avgTimePerQuestionSec: null,
      modeCounts: emptyEnumCounts(ALLOWED_MODE_VALUES),
      levelCounts: emptyEnumCounts(ALLOWED_LEVEL_VALUES),
      displayLevelCounts: { regular: 0, advanced: 0, unknown: 0 },
      topics: {},
    };
  }
  return out;
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function safeString(value, maxLen = 2000) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return isoDateOnly(d);
}

async function fetchSessionsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  const selectCols =
    "id,student_id,subject,topic,started_at,created_at,ended_at,updated_at,duration_seconds,status,metadata";
  const byStartedAt = await supabase
    .from("learning_sessions")
    .select(selectCols)
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lt("started_at", toIsoExclusive)
    .order("started_at", { ascending: false });

  if (!byStartedAt.error) {
    return { rows: byStartedAt.data || [], filterField: "started_at" };
  }
  if (!isMissingColumnError(byStartedAt.error)) {
    throw byStartedAt.error;
  }

  const byCreatedAt = await supabase
    .from("learning_sessions")
    .select(selectCols)
    .eq("student_id", studentId)
    .gte("created_at", fromIso)
    .lt("created_at", toIsoExclusive)
    .order("created_at", { ascending: false });

  if (byCreatedAt.error) throw byCreatedAt.error;
  return { rows: byCreatedAt.data || [], filterField: "created_at" };
}

async function fetchAnswersInRange(supabase, studentId, fromIso, toIsoExclusive) {
  const selectCols =
    "id,student_id,learning_session_id,question_id,is_correct,answer_payload,answered_at,created_at";
  const byAnsweredAt = await supabase
    .from("answers")
    .select(selectCols)
    .eq("student_id", studentId)
    .gte("answered_at", fromIso)
    .lt("answered_at", toIsoExclusive)
    .order("answered_at", { ascending: false });

  if (!byAnsweredAt.error) {
    return { rows: byAnsweredAt.data || [], filterField: "answered_at" };
  }
  if (!isMissingColumnError(byAnsweredAt.error)) {
    throw byAnsweredAt.error;
  }

  const byCreatedAt = await supabase
    .from("answers")
    .select(selectCols)
    .eq("student_id", studentId)
    .gte("created_at", fromIso)
    .lt("created_at", toIsoExclusive)
    .order("created_at", { ascending: false });

  if (byCreatedAt.error) throw byCreatedAt.error;
  return { rows: byCreatedAt.data || [], filterField: "created_at" };
}

async function fetchParentActivityAttemptsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  const { data, error } = await supabase
    .from("parent_activity_attempts")
    .select(
      `
      id, student_id, activity_id, question_index, skill_key,
      is_correct, time_spent_ms, hints_used, answered_at,
      question_snapshot,
      parent_assigned_activities!inner(subject, topic, subtopic, mode, difficulty_level, title)
    `
    )
    .eq("student_id", studentId)
    .gte("answered_at", fromIso)
    .lt("answered_at", toIsoExclusive)
    .order("answered_at", { ascending: false });

  if (error) {
    if (isDbSchemaNotReadyError(error) || isMissingColumnError(error)) {
      return { rows: [], filterField: "answered_at", schemaUnavailable: true };
    }
    throw error;
  }

  return { rows: data || [], filterField: "answered_at", schemaUnavailable: false };
}

async function fetchPrivateTeacherActivityAttemptsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  const { data, error } = await supabase
    .from("student_activity_attempts")
    .select(
      `
      id, student_id, activity_id, question_index, skill_key,
      is_correct, time_spent_ms, hints_used, answered_at,
      selected_answer, correct_answer,
      question_snapshot,
      student_activities!inner(subject, topic, subtopic, mode, difficulty_level)
    `
    )
    .eq("student_id", studentId)
    .gte("answered_at", fromIso)
    .lt("answered_at", toIsoExclusive)
    .order("answered_at", { ascending: false });

  if (error) {
    if (isDbSchemaNotReadyError(error) || isMissingColumnError(error)) {
      return { rows: [], filterField: "answered_at", schemaUnavailable: true };
    }
    throw error;
  }

  return { rows: data || [], filterField: "answered_at", schemaUnavailable: false };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 */
export async function fetchBookPageVisitsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  if (!isLearningBookTrackingEnabledServer()) {
    return { rows: [] };
  }
  const { data, error } = await supabase
    .from("book_page_visits")
    .select(
      "id,student_id,subject,grade,page_id,credited_dwell_ms,raw_dwell_ms,page_read,triggered_cta,started_at,ended_at,hidden_tab_ms,sections_skipped,client_visit_token"
    )
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lt("started_at", toIsoExclusive);

  if (error) {
    if (isBookTrackingTablesMissingError(error) || isDbSchemaNotReadyError(error)) {
      return { rows: [] };
    }
    throw error;
  }
  return { rows: data || [] };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 */
export async function fetchBookReadingSessionsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  if (!isLearningBookTrackingEnabledServer()) {
    return { rows: [] };
  }
  const { data, error } = await supabase
    .from("book_reading_sessions")
    .select("id,student_id,subject,grade,started_at,ended_at,client_session_token")
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lt("started_at", toIsoExclusive);

  if (error) {
    if (isBookTrackingTablesMissingError(error) || isDbSchemaNotReadyError(error)) {
      return { rows: [] };
    }
    throw error;
  }
  return { rows: data || [] };
}

export function createEmptyLearningActivity() {
  return {
    bookReadingMinutes: 0,
    bookReadingBySubject: {},
    bookPagesRead: 0,
    bookSessionCount: 0,
    postBookPracticeCount: 0,
  };
}

function normalizeBookSubjectForReport(subject) {
  const s = String(subject || "").trim().toLowerCase();
  if (s === "moledet" || s === "geography") return "moledet_geography";
  return s;
}

/**
 * Phase 5 — book rows populate learningActivity only; never diagnostic buckets.
 * @param {ReturnType<typeof createEmptyLearningActivity>} learningActivity
 * @param {Array<Record<string, unknown>>} visits
 * @param {Array<Record<string, unknown>>} [sessions]
 */
export function accumulateBookReadingActivity(learningActivity, visits, sessions = []) {
  for (const visit of visits || []) {
    if (visit?.source === "book_page_visits" || visit?.source === "book_reading_sessions") {
      throw new Error("book rows must not enter answer aggregation");
    }
    const credited = Number(visit.credited_dwell_ms) || 0;
    const minutes = computeBookReadingMinutes(credited);
    learningActivity.bookReadingMinutes = Number(
      (learningActivity.bookReadingMinutes + minutes).toFixed(2)
    );
    const subjectKey = normalizeBookSubjectForReport(visit.subject);
    learningActivity.bookReadingBySubject[subjectKey] = Number(
      ((learningActivity.bookReadingBySubject[subjectKey] || 0) + minutes).toFixed(2)
    );
    if (visit.page_read === true) {
      learningActivity.bookPagesRead += 1;
    }
  }
  learningActivity.bookSessionCount = Array.isArray(sessions) ? sessions.length : 0;
  return learningActivity;
}

/**
 * @param {Array<Record<string, unknown>>} answers
 */
export function countPostBookPracticeFromAnswers(answers) {
  let count = 0;
  for (const answer of answers || []) {
    const payload = answer?.answer_payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
    if (payload.contextFlags?.contextAfterBookReading === true) {
      count += 1;
    }
  }
  return count;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {Array<Record<string, unknown>>} bookVisits
 * @param {Array<Record<string, unknown>>} bookSessions
 * @param {Array<Record<string, unknown>>} answers
 */
export function mergeLearningActivityBookData(payload, bookVisits, bookSessions, answers) {
  const learningActivity = createEmptyLearningActivity();
  accumulateBookReadingActivity(learningActivity, bookVisits, bookSessions);
  learningActivity.postBookPracticeCount = countPostBookPracticeFromAnswers(answers);
  const merged = { ...payload, learningActivity };
  const acc = payload._positiveEvidenceAcc;
  if (acc && merged.positiveEvidence) {
    merged.positiveEvidence = buildPositiveEvidence(
      merged.subjects,
      merged.summary,
      acc,
      merged.competitiveContext,
      learningActivity
    );
  }
  return merged;
}

const RECENT_MISTAKES_LIMIT = 20;
/** Soft cap for full diagnostic mistake stream (engine evidence; separate from recentMistakes UI sample). */
const DIAGNOSTIC_MISTAKES_SOFT_CAP = 8000;

/**
 * @param {{ isDiagnosticEligible?: boolean, evidenceCategory?: string }} classification
 * @param {string} resolvedMode
 */
function shouldCaptureDiagnosticMistake(classification, resolvedMode) {
  if (classification?.isDiagnosticEligible !== true) return false;
  return !shouldExcludeFromRecentMistakes({
    evidenceCategory: classification.evidenceCategory,
    resolvedMode,
  });
}

/**
 * @param {Array<Record<string, unknown>>} diagnosticMistakes
 * @param {Record<string, unknown>} row
 * @param {{ diagnosticMistakesTruncated?: boolean }} meta
 */
function pushDiagnosticMistakeRow(diagnosticMistakes, row, meta) {
  if (diagnosticMistakes.length >= DIAGNOSTIC_MISTAKES_SOFT_CAP) {
    meta.diagnosticMistakesTruncated = true;
    return;
  }
  diagnosticMistakes.push(row);
}

/**
 * @param {object} p
 */
function buildAggregateWrongAnswerCapture(p) {
  const prelim = {
    subject: p.subject,
    topic: p.topic,
    questionId: p.questionId,
    sessionId: p.sessionId,
    answerId: p.answerId,
    prompt: p.prompt,
    expectedAnswer: p.expectedAnswer,
    userAnswer: p.userAnswer,
    hintsUsed: p.hintsUsed,
    timeSpentMs: p.timeSpentMs,
    mode: p.mode,
    level: p.sourceDifficulty || p.level,
    displayLevel: p.displayLevel,
    sourceDifficulty: p.sourceDifficulty || p.level,
    registeredGradeLevel: p.registeredGradeLevel,
    contentGradeLevel: p.contentGradeLevel,
    gradeRelation: p.gradeRelation,
    answeredAt: p.answeredAt,
    evidenceSource: p.evidenceSource,
    evidenceCategory: p.evidenceCategory,
    isDiagnosticEligible: p.isDiagnosticEligible,
    studentId: p.studentId,
    questionEngine: p.questionEngine,
    diagnosticMetadata: p.diagnosticMetadata,
    params: p.params,
    patternFamily: p.patternFamily,
    _canonicalMeta: p.canonicalMeta,
  };

  const canonicalBundle = buildDiagnosticCanonicalMetadataFromCapture(prelim);
  const diagnosticMetadata = canonicalBundle.diagnosticMetadata;
  const engineFields = exportEngineFieldsFromCanonical(diagnosticMetadata || {});

  if (!engineFields.patternFamily && !engineFields.skillId) {
    const legacy = extractRecentMistakeEngineFields(p.questionEngine);
    Object.assign(engineFields, legacy);
  }

  return {
    ...prelim,
    questionEngine: canonicalBundle.enrichedQuestionEngine || p.questionEngine,
    diagnosticMetadata,
    metadataPresent: canonicalBundle.metadataPresent === true,
    reasonMissingMetadata: canonicalBundle.reasonMissingMetadata,
    engineFields,
    _canonicalMeta: diagnosticMetadata || p.canonicalMeta || null,
  };
}

/**
 * Build report payload from already-fetched session/answer rows (shared by single- and batch-roster paths).
 * @param {{ id: string, full_name?: string|null, grade_level?: string|null, is_active?: boolean }} student
 * @param {Array<Record<string, unknown>>} sessions
 * @param {Array<Record<string, unknown>>} answers
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {{ sessionsFilterField: string, answersFilterField: string }} fetchMeta
 * @param {Array<Record<string, unknown>>} [parentActivityAttempts]
 * @param {Array<Record<string, unknown>>} [privateTeacherActivityAttempts]
 */
function ensureDailyBySubjectRow(dailyBySubject, dayKey, subject) {
  if (!dayKey || !subject) return null;
  if (!dailyBySubject[dayKey]) dailyBySubject[dayKey] = {};
  if (!dailyBySubject[dayKey][subject]) {
    dailyBySubject[dayKey][subject] = {
      sessions: 0,
      answers: 0,
      correct: 0,
      wrong: 0,
      durationSeconds: 0,
      _topicKeys: Object.create(null),
    };
  } else if (!dailyBySubject[dayKey][subject]._topicKeys) {
    dailyBySubject[dayKey][subject]._topicKeys = Object.create(null);
  }
  return dailyBySubject[dayKey][subject];
}

function trackDailySubjectTopic(dailyBySubject, dayKey, subject, topic) {
  const row = ensureDailyBySubjectRow(dailyBySubject, dayKey, subject);
  if (!row) return;
  const topicKey = safeString(topic, 120) || "general";
  row._topicKeys[topicKey] = true;
}

function serializeDailyActivityBySubject(dailyBySubject) {
  if (!dailyBySubject || typeof dailyBySubject !== "object") return {};
  /** @type {Record<string, Record<string, object>>} */
  const out = {};
  for (const [dayKey, subjectMap] of Object.entries(dailyBySubject)) {
    if (!subjectMap || typeof subjectMap !== "object") continue;
    out[dayKey] = {};
    for (const [subject, row] of Object.entries(subjectMap)) {
      if (!row || typeof row !== "object") continue;
      const topicCount = row._topicKeys && typeof row._topicKeys === "object" ? Object.keys(row._topicKeys).length : 0;
      out[dayKey][subject] = {
        sessions: Math.max(0, Math.floor(safeNumber(row.sessions))),
        answers: Math.max(0, Math.floor(safeNumber(row.answers))),
        correct: Math.max(0, Math.floor(safeNumber(row.correct))),
        wrong: Math.max(0, Math.floor(safeNumber(row.wrong))),
        durationSeconds: Math.max(0, Math.floor(safeNumber(row.durationSeconds))),
        topicCount,
      };
    }
  }
  return out;
}

export function aggregateReportPayloadFromActivityRows(
  student,
  sessions,
  answers,
  fromDate,
  toDate,
  fetchMeta,
  parentActivityAttempts = [],
  privateTeacherActivityAttempts = []
) {
  const registeredGradeKey = normalizePracticeGradeKey(student.grade_level);

  const subjects = createSubjectAccumulator();
  const daily = {};
  const dailyBySubject = {};
  const sessionById = {};

  let totalDurationSeconds = 0;
  let completedSessions = 0;
  let countableSessions = 0;
  let overallHintsSum = 0;
  let overallHintsCount = 0;
  let overallTimeMsSum = 0;
  let overallTimeMsCount = 0;
  const overallModeCounts = emptyEnumCounts(ALLOWED_MODE_VALUES);
  const overallLevelCounts = emptyEnumCounts(ALLOWED_LEVEL_VALUES);
  const overallDisplayLevelCounts = { regular: 0, advanced: 0, unknown: 0 };
  const overallSourceDifficultyBreakdown = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  const overallLevelRollup = {
    displayLevelCounts: overallDisplayLevelCounts,
    _sourceDifficultyBreakdown: overallSourceDifficultyBreakdown,
  };
  const competitiveByModeAcc = createCompetitiveByModeAccumulator();
  const positiveEvidenceAcc = createPositiveEvidenceAccumulator();
  const reportRangeMs = reportRangeBoundsMs(fromDate, toDate);
  /** @type {Map<string, { activityId: string, title: string|null, subject: string, topic: string, contentGradeKey: string|null, questions: number, correct: number, timeMsSum: number, lastAnswerAtIso: string|null }>} */
  const parentAssignedActivityRollups = new Map();

  for (const session of sessions) {
    if (!REPORT_AGG_SUBJECTS.includes(session.subject)) continue;
    const sessionAnswerHint = Math.max(
      0,
      Math.floor(safeNumber(session.metadata?.summary?.totalQuestions))
    );
    const durationSeconds = sanitizeReportDurationSeconds(
      Math.max(0, Math.floor(safeNumber(session.duration_seconds))),
      { answerCount: sessionAnswerHint || 0 }
    ).seconds;
    const sessionMetaModeLevel = readModeLevelFromObject(session.metadata);
    const sessionModeBucket = sessionMetaModeLevel.mode;
    const countsSessionTowardReport = isCountableSelfPracticeSessionMode(sessionModeBucket);

    const subjectAgg = subjects[session.subject];
    if (countsSessionTowardReport) {
      countableSessions += 1;
      subjectAgg.sessions += 1;
      subjectAgg.durationSeconds += durationSeconds;
      totalDurationSeconds += durationSeconds;
      if (session.status === "completed" || session.ended_at) completedSessions += 1;
    }

    const topicKey = safeString(session.topic, 120) || "general";
    if (!subjectAgg.topics[topicKey]) {
      subjectAgg.topics[topicKey] = createTopicAccumulator();
    }
    if (countsSessionTowardReport) {
      subjectAgg.topics[topicKey].durationSeconds += durationSeconds;
    }
    const sessionContentGrade =
      resolveContentGradeFromSessionMetadata(session.metadata, registeredGradeKey) || null;
    if (sessionModeBucket && sessionModeBucket !== "unknown") {
      const topicAggForSession = subjectAgg.topics[topicKey];
      topicAggForSession.modeCounts[sessionModeBucket] =
        (topicAggForSession.modeCounts[sessionModeBucket] || 0) + 1;
      subjectAgg.modeCounts[sessionModeBucket] =
        (subjectAgg.modeCounts[sessionModeBucket] || 0) + 1;
      overallModeCounts[sessionModeBucket] =
        (overallModeCounts[sessionModeBucket] || 0) + 1;
      incrementCompetitiveSessionCount(competitiveByModeAcc, sessionModeBucket);
      if (sessionModeBucket === "learning") {
        incrementLearningSessionCount(positiveEvidenceAcc, session.subject);
      }
      const gradeBucketForSession = sessionContentGrade || "unknown";
      const gradeSliceForMode = ensureTopicGradeSlice(
        topicAggForSession,
        gradeBucketForSession,
        registeredGradeKey,
      );
      gradeSliceForMode.modeCounts[sessionModeBucket] =
        (gradeSliceForMode.modeCounts[sessionModeBucket] || 0) + 1;
    }
    bumpActivityFromLearningSession(subjectAgg, session, reportRangeMs);
    bumpActivityFromLearningSession(subjectAgg.topics[topicKey], session, reportRangeMs);
    if (sessionContentGrade) {
      const gradeSlice = ensureTopicGradeSlice(
        subjectAgg.topics[topicKey],
        sessionContentGrade,
        registeredGradeKey
      );
      bumpActivityFromLearningSession(gradeSlice, session, reportRangeMs);
    }
    sessionById[session.id] = {
      subject: session.subject,
      topic: topicKey,
      mode: sessionMetaModeLevel.mode,
      level: sessionMetaModeLevel.level,
      metadata:
        session.metadata && typeof session.metadata === "object" && !Array.isArray(session.metadata)
          ? session.metadata
          : {},
      contentGradeLevel: sessionContentGrade,
      registeredGradeLevel: registeredGradeKey,
    };

    const dayKey = toDateKey(
      session[fetchMeta.sessionsFilterField] || session.started_at || session.created_at
    );
    if (dayKey && countsSessionTowardReport) {
      if (!daily[dayKey]) {
        daily[dayKey] = { date: dayKey, sessions: 0, answers: 0, correct: 0, wrong: 0, durationSeconds: 0 };
      }
      daily[dayKey].sessions += 1;
      daily[dayKey].durationSeconds += durationSeconds;
      const sessionSubjectRow = ensureDailyBySubjectRow(dailyBySubject, dayKey, session.subject);
      if (sessionSubjectRow) {
        sessionSubjectRow.sessions += 1;
        sessionSubjectRow.durationSeconds += durationSeconds;
        trackDailySubjectTopic(dailyBySubject, dayKey, session.subject, topicKey);
      }
    }
  }

  let correctAnswers = 0;
  let wrongAnswers = 0;
  let overallDiagnosticAnswers = 0;
  let overallDiagnosticCorrect = 0;
  let overallCompetitiveAnswers = 0;
  let overallCompetitiveCorrect = 0;
  let overallLearningAnswers = 0;
  let overallStepByStepCount = 0;
  const recentMistakes = [];
  const diagnosticMistakes = [];
  /** @type {{ diagnosticMistakesTruncated?: boolean }} */
  const diagnosticMistakesMeta = {};
  /** @type {Record<string, Record<string, Array<Record<string, unknown>>>>} */
  const internalTopicAnswerEvents = Object.create(null);
  const probeEvidence = [];
  /** @type {Record<string, object>} */
  const diagnosticSubSkillRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticQuestionTypeRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticQuestionTypeByGroupRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticProblemClassRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticProblemClassByGroupRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticDifficultyDepthRollup = {};
  /** @type {Record<string, object>} */
  const diagnosticDifficultyDepthByGroupRollup = {};

  for (const answer of answers) {
    const payload =
      answer.answer_payload && typeof answer.answer_payload === "object" && !Array.isArray(answer.answer_payload)
        ? answer.answer_payload
        : {};
    const sessionRef = sessionById[answer.learning_session_id] || null;
    const subject = safeString(payload.subject, 40) || sessionRef?.subject || null;
    if (!subject || !REPORT_AGG_SUBJECTS.includes(subject)) continue;
    const topic = safeString(payload.topic, 120) || sessionRef?.topic || "general";

    const clientMetaObjEarly =
      payload.clientMeta && typeof payload.clientMeta === "object" && !Array.isArray(payload.clientMeta)
        ? payload.clientMeta
        : null;
    const payloadModeLevelEarly = readModeLevelFromObject(payload);
    const clientModeLevelEarly = readModeLevelFromObject(clientMetaObjEarly);
    const payloadModeNormEarly =
      normalizeLearningGameMode(payload.gameMode) || normalizeLearningGameMode(payload.mode);
    const clientModeNormEarly =
      normalizeLearningGameMode(clientMetaObjEarly?.gameMode) ||
      normalizeLearningGameMode(clientMetaObjEarly?.mode);
    const resolvedModeForEvidenceGate =
      payloadModeNormEarly || clientModeNormEarly || "unknown";
    const contextFlagsEarly =
      payload.contextFlags && typeof payload.contextFlags === "object" ? payload.contextFlags : {};
    const answerClassificationEarly = classifyAnswerForAggregation(
      {
        isDiagnosticEligible: payload.isDiagnosticEligible,
        evidenceCategory: payload.evidenceCategory,
        contextFlags: contextFlagsEarly,
      },
      resolvedModeForEvidenceGate,
      {
        afterStepByStep: contextFlagsEarly.afterStepByStep === true,
        contextAfterBookReading: contextFlagsEarly.contextAfterBookReading === true,
        hintsUsed: payload.hintsUsed,
      }
    );
    if (
      !isParentReportPracticeAnswer({
        evidenceCategory: answerClassificationEarly.evidenceCategory,
        isDiagnosticEligible: answerClassificationEarly.isDiagnosticEligible,
        contextFlags: contextFlagsEarly,
        resolvedMode: resolvedModeForEvidenceGate,
      })
    ) {
      continue;
    }

    const subjectAgg = subjects[subject];
    subjectAgg.answers += 1;

    if (!subjectAgg.topics[topic]) {
      subjectAgg.topics[topic] = createTopicAccumulator();
    }
    const topicAgg = subjectAgg.topics[topic];

    const contentGradeKey =
      resolveContentGradeFromAnswerPayload(payload, sessionRef?.metadata, registeredGradeKey) ||
      sessionRef?.contentGradeLevel ||
      null;
    const gradeBucketKey = contentGradeKey || "unknown";
    const gradeSlice = ensureTopicGradeSlice(topicAgg, gradeBucketKey, registeredGradeKey);

    const answerIso =
      answer[fetchMeta.answersFilterField] || answer.answered_at || answer.created_at || null;
    const answerSource =
      fetchMeta.answersFilterField === "answered_at" ? "answer.answered_at" : "answer.created_at";
    if (answerIso) {
      const answerPatch = { iso: answerIso, source: answerSource, kind: "answer" };
      bumpActivityTimestamp(subjectAgg, answerPatch);
      bumpActivityTimestamp(topicAgg, answerPatch);
      bumpActivityTimestamp(gradeSlice, answerPatch);
    }

    const hintsUsed = normalizeFiniteNonNegativeNumber(payload.hintsUsed, 1000);
    if (hintsUsed != null) {
      subjectAgg.hintsSum += hintsUsed;
      subjectAgg.hintsCount += 1;
      overallHintsSum += hintsUsed;
      overallHintsCount += 1;
    }

    const timeMs = normalizeFiniteNonNegativeNumber(
      payload.creditedTimeMs ?? payload.timeSpentMs,
      36_000_000
    );
    if (timeMs != null) {
      subjectAgg.timeMsSum += timeMs;
      subjectAgg.timeMsCount += 1;
      overallTimeMsSum += timeMs;
      overallTimeMsCount += 1;
      const creditedSeconds = Math.max(0, Math.floor(timeMs / 1000));
      if (creditedSeconds > 0) {
        gradeSlice.durationSeconds += creditedSeconds;
      }
    }

    const clientMetaObj = clientMetaObjEarly;
    const payloadModeLevel = payloadModeLevelEarly;
    const clientModeLevel = clientModeLevelEarly;
    const resolvedMode =
      payloadModeNormEarly ||
      clientModeNormEarly ||
      (sessionRef?.mode && sessionRef.mode !== "unknown" ? sessionRef.mode : null) ||
      "unknown";
    const levelEvidence = resolveAnswerLevelFromPayload(payload, sessionRef?.metadata, subject);
    const resolvedLevel =
      pickEnumString(levelEvidence.legacyLevel, ALLOWED_LEVEL_VALUES) !== "unknown"
        ? pickEnumString(levelEvidence.legacyLevel, ALLOWED_LEVEL_VALUES)
        : payloadModeLevelEarly.level !== "unknown"
        ? payloadModeLevelEarly.level
        : clientModeLevelEarly.level !== "unknown"
        ? clientModeLevelEarly.level
        : pickEnumString(sessionRef?.level, ALLOWED_LEVEL_VALUES) !== "unknown"
        ? pickEnumString(sessionRef?.level, ALLOWED_LEVEL_VALUES)
        : sessionRef?.level || "unknown";
    subjectAgg.modeCounts[resolvedMode] = (subjectAgg.modeCounts[resolvedMode] || 0) + 1;
    subjectAgg.levelCounts[resolvedLevel] = (subjectAgg.levelCounts[resolvedLevel] || 0) + 1;
    overallModeCounts[resolvedMode] = (overallModeCounts[resolvedMode] || 0) + 1;
    overallLevelCounts[resolvedLevel] = (overallLevelCounts[resolvedLevel] || 0) + 1;
    bumpAnswerLevelRollups(subjectAgg, levelEvidence);
    bumpAnswerLevelRollups(topicAgg, levelEvidence);
    bumpAnswerLevelRollups(gradeSlice, levelEvidence);
    bumpAnswerLevelRollups(overallLevelRollup, levelEvidence);

    const isCorrect = answer.is_correct === true;
    const normalizedProbeEvidence = normalizeDiagnosticProbeEvidenceFromClientMeta(clientMetaObj, {
      subject,
      topic,
      answeredAt: answerIso,
      learningSessionId: answer.learning_session_id,
      questionId: answer.question_id,
    });
    if (normalizedProbeEvidence) {
      probeEvidence.push(normalizedProbeEvidence);
    }
    const isSlow = timeMs != null && timeMs > REPORT_AGG_FLUENCY_THRESHOLDS.slowMs;
    const isFast = timeMs != null && timeMs < REPORT_AGG_FLUENCY_THRESHOLDS.fastMs;
    const isManyHints = hintsUsed != null && hintsUsed >= REPORT_AGG_FLUENCY_THRESHOLDS.manyHints;

    applyAnswerMetricsToSlice(topicAgg, {
      hintsUsed,
      timeMs,
      resolvedMode,
      resolvedLevel,
      isCorrect,
      isSlow,
      isFast,
      isManyHints,
    });
    applyAnswerMetricsToSlice(gradeSlice, {
      hintsUsed,
      timeMs,
      resolvedMode,
      resolvedLevel,
      isCorrect,
      isSlow,
      isFast,
      isManyHints,
    });

    // Phase 4: classify each answer and route to diagnostic/competitive/learning bucket
    const answerClassification = answerClassificationEarly;
    applyClassificationToSlice(subjectAgg, { ...answerClassification, isCorrect });
    applyClassificationToSlice(topicAgg, { ...answerClassification, isCorrect });
    applyClassificationToSlice(gradeSlice, { ...answerClassification, isCorrect });

    // Phase C: evidence provenance for self-practice answers (book practice vs free self-practice).
    const answerEvidenceSource =
      payload.contextFlags &&
      typeof payload.contextFlags === "object" &&
      payload.contextFlags.contextAfterBookReading === true
        ? EVIDENCE_SOURCE.LEARNING_BOOK
        : EVIDENCE_SOURCE.SELF_PRACTICE;
    bumpEvidenceSourceCount(topicAgg.evidenceSourceCounts, answerEvidenceSource);
    bumpEvidenceSourceCount(gradeSlice.evidenceSourceCounts, answerEvidenceSource);
    if (answerEvidenceSource === EVIDENCE_SOURCE.SELF_PRACTICE) {
      const answeredAtMs = parseActivityTimestampMs(answerIso);
      if (Number.isFinite(answeredAtMs)) {
        pushTopicAnswerEventForTrend(internalTopicAnswerEvents, subject, topic, contentGradeKey, {
          answeredAtMs,
          isCorrect,
          evidenceSource: EVIDENCE_SOURCE.SELF_PRACTICE,
        });
      }
    }

    const isCompetitiveAns = answerClassification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE;
    if (answerClassification.isDiagnosticEligible && !isCompetitiveAns) {
      overallDiagnosticAnswers += 1;
      if (isCorrect) overallDiagnosticCorrect += 1;
    } else if (isCompetitiveAns) {
      overallCompetitiveAnswers += 1;
      if (isCorrect) overallCompetitiveCorrect += 1;
      accumulateCompetitiveByModeEntry(competitiveByModeAcc, resolvedMode, {
        isCorrect,
        timeMs,
        isFast,
      });
    } else {
      overallLearningAnswers += 1;
      if (answerClassification.afterStepByStep) overallStepByStepCount += 1;
    }

    trackDiagnosticSubSkillRollupIfEnabled(
      diagnosticSubSkillRollup,
      payload,
      answerClassification,
      subject,
      topic,
      isCorrect
    );
    trackDiagnosticQuestionTypeRollupIfEnabled(
      diagnosticQuestionTypeRollup,
      diagnosticQuestionTypeByGroupRollup,
      payload,
      answerClassification,
      subject,
      topic,
      isCorrect
    );
    trackDiagnosticPedagogyRollupIfEnabled(
      diagnosticProblemClassRollup,
      diagnosticProblemClassByGroupRollup,
      diagnosticDifficultyDepthRollup,
      diagnosticDifficultyDepthByGroupRollup,
      payload,
      answerClassification,
      subject,
      topic,
      isCorrect
    );

    const contextFlags =
      payload.contextFlags && typeof payload.contextFlags === "object" ? payload.contextFlags : {};

    const dayKey = toDateKey(
      answer[fetchMeta.answersFilterField] || answer.answered_at || answer.created_at
    );

    accumulatePositiveEvidenceEntry(positiveEvidenceAcc, {
      subject,
      topic,
      dayKey,
      answerIso,
      isCorrect,
      resolvedMode,
      isDiagnosticEligible: answerClassification.isDiagnosticEligible,
      evidenceCategory: answerClassification.evidenceCategory,
      afterStepByStep: answerClassification.afterStepByStep,
      contextAfterBookReading: contextFlags.contextAfterBookReading === true,
      isManyHints,
    });

    if (isCorrect) {
      correctAnswers += 1;
      subjectAgg.correct += 1;
      if (isSlow) subjectAgg.correctSlowAnswers += 1;
      if (isManyHints) subjectAgg.correctManyHintsAnswers += 1;
    } else {
      wrongAnswers += 1;
      subjectAgg.wrong += 1;
      if (isFast) subjectAgg.wrongFastAnswers += 1;

      const mistakeEvidence = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);
      const excludeCompetitiveMistake = shouldExcludeFromRecentMistakes({
        evidenceCategory: answerClassification.evidenceCategory,
        resolvedMode,
      });
      if (!excludeCompetitiveMistake) {
        const capture = buildAggregateWrongAnswerCapture({
          subject,
          topic,
          questionId: safeString(answer.question_id, 180),
          sessionId: safeString(answer.learning_session_id, 180),
          answerId: safeString(answer.id, 180),
          prompt: safeString(payload.prompt, 500),
          expectedAnswer: safeString(payload.expectedAnswer, 300),
          userAnswer: safeString(payload.userAnswer, 300),
          hintsUsed: hintsUsed != null ? Math.round(hintsUsed) : null,
          timeSpentMs: timeMs != null ? Math.round(timeMs) : null,
          mode: resolvedMode,
          level: resolvedLevel,
          displayLevel: levelEvidence.displayLevel,
          sourceDifficulty: levelEvidence.sourceDifficulty,
          registeredGradeLevel: mistakeEvidence.registeredGradeLevel,
          contentGradeLevel: mistakeEvidence.contentGradeLevel,
          gradeRelation: mistakeEvidence.gradeRelation,
          answeredAt: answer[fetchMeta.answersFilterField] || answer.answered_at || answer.created_at || null,
          evidenceSource:
            answerEvidenceSource === EVIDENCE_SOURCE.PARENT_ASSIGNED
              ? "parent_assigned"
              : "self_practice",
          evidenceCategory: answerClassification.evidenceCategory,
          isDiagnosticEligible: answerClassification.isDiagnosticEligible,
          studentId: student.id,
          questionEngine: payload.questionEngine,
          diagnosticMetadata: payload.diagnosticMetadata,
          params:
            payload.params && typeof payload.params === "object" && !Array.isArray(payload.params)
              ? payload.params
              : undefined,
          patternFamily:
            payload.patternFamily ||
            payload.diagnosticMetadata?.patternFamily ||
            payload.questionEngine?.patternFamily,
        });
        if (recentMistakes.length < RECENT_MISTAKES_LIMIT) {
          recentMistakes.push(capture);
        }
        if (shouldCaptureDiagnosticMistake(answerClassification, resolvedMode)) {
          pushDiagnosticMistakeRow(
            diagnosticMistakes,
            buildDiagnosticEvidenceRow(capture),
            diagnosticMistakesMeta,
          );
        }
      }
    }

    if (dayKey) {
      if (!daily[dayKey]) {
        daily[dayKey] = { date: dayKey, sessions: 0, answers: 0, correct: 0, wrong: 0, durationSeconds: 0 };
      }
      daily[dayKey].answers += 1;
      if (isCorrect) daily[dayKey].correct += 1;
      else daily[dayKey].wrong += 1;
      const answerSubjectRow = ensureDailyBySubjectRow(dailyBySubject, dayKey, subject);
      if (answerSubjectRow) {
        answerSubjectRow.answers += 1;
        if (isCorrect) answerSubjectRow.correct += 1;
        else answerSubjectRow.wrong += 1;
        trackDailySubjectTopic(dailyBySubject, dayKey, subject, topic);
      }
    }
  }

  /** @type {Array<Record<string, unknown>>} */
  const allAssignedActivityAttempts = [
    ...(parentActivityAttempts || []).map((attempt) => ({
      ...attempt,
      _aggregateAssignedSource: "parent",
    })),
    ...(privateTeacherActivityAttempts || []).map((attempt) => {
      const studentActivityMeta =
        attempt.student_activities &&
        typeof attempt.student_activities === "object" &&
        !Array.isArray(attempt.student_activities)
          ? attempt.student_activities
          : {};
      return {
        ...attempt,
        _aggregateAssignedSource: "private_teacher",
        parent_assigned_activities: studentActivityMeta,
      };
    }),
  ];

  for (const attempt of allAssignedActivityAttempts) {
    const assignedSource =
      attempt._aggregateAssignedSource === "private_teacher" ? "private_teacher" : "parent";
    const activityMeta =
      attempt.parent_assigned_activities &&
      typeof attempt.parent_assigned_activities === "object" &&
      !Array.isArray(attempt.parent_assigned_activities)
        ? attempt.parent_assigned_activities
        : {};
    const subject = safeString(activityMeta.subject, 40);
    if (!subject || !REPORT_AGG_SUBJECTS.includes(subject)) continue;
    const topic = safeString(activityMeta.topic, 120) || "general";
    const subjectAgg = subjects[subject];
    subjectAgg.answers += 1;

    if (!subjectAgg.topics[topic]) {
      subjectAgg.topics[topic] = createTopicAccumulator();
    }
    const topicAgg = subjectAgg.topics[topic];

    // Phase A: read the actual content grade the parent activity was assigned at
    // (frozen per-question in question_snapshot.grade), falling back to the
    // registered profile grade when the snapshot lacks it. This routes parent
    // activities through the same grade-evidence pipeline as self-practice so the
    // report/diagnostic engine sees true gradeRelation (same/lower/higher).
    const attemptSnapshotForGrade =
      attempt.question_snapshot &&
      typeof attempt.question_snapshot === "object" &&
      !Array.isArray(attempt.question_snapshot)
        ? attempt.question_snapshot
        : {};
    const snapshotContentGradeKey = normalizePracticeGradeKey(attemptSnapshotForGrade.grade);
    const contentGradeKey = snapshotContentGradeKey || registeredGradeKey || null;
    const gradeBucketKey = contentGradeKey || "unknown";
    const gradeSlice = ensureTopicGradeSlice(topicAgg, gradeBucketKey, registeredGradeKey);

    const answerIso = attempt.answered_at || null;
    if (answerIso) {
      const answerPatch = { iso: answerIso, source: "parent_activity.answered_at", kind: "answer" };
      bumpActivityTimestamp(subjectAgg, answerPatch);
      bumpActivityTimestamp(topicAgg, answerPatch);
      bumpActivityTimestamp(gradeSlice, answerPatch);
    }

    const hintsUsed = normalizeFiniteNonNegativeNumber(attempt.hints_used, 1000);
    if (hintsUsed != null) {
      subjectAgg.hintsSum += hintsUsed;
      subjectAgg.hintsCount += 1;
      overallHintsSum += hintsUsed;
      overallHintsCount += 1;
    }

    const timeMs = normalizeFiniteNonNegativeNumber(
      resolveParentAttemptCreditedTimeMs(attempt),
      36_000_000
    );
    if (timeMs != null) {
      subjectAgg.timeMsSum += timeMs;
      subjectAgg.timeMsCount += 1;
      overallTimeMsSum += timeMs;
      overallTimeMsCount += 1;
      const creditedSeconds = Math.max(0, Math.floor(timeMs / 1000));
      if (creditedSeconds > 0) {
        subjectAgg.durationSeconds += creditedSeconds;
        topicAgg.durationSeconds += creditedSeconds;
        gradeSlice.durationSeconds += creditedSeconds;
        totalDurationSeconds += creditedSeconds;
      }
    }

    const resolvedMode = normalizeLearningGameMode(activityMeta.mode) || "unknown";
    const activityTitle = safeString(activityMeta.title, 120);
    if (activityTitle) {
      if (!gradeSlice.parentActivityTitle) gradeSlice.parentActivityTitle = activityTitle;
      if (!topicAgg.parentActivityTitle) topicAgg.parentActivityTitle = activityTitle;
    }
    const assignedLevelEvidence = resolveAnswerLevelFromPayload(
      attemptSnapshotForGrade,
      activityMeta,
      subject
    );
    const resolvedLevel =
      pickEnumString(assignedLevelEvidence.legacyLevel, ALLOWED_LEVEL_VALUES) !== "unknown"
        ? pickEnumString(assignedLevelEvidence.legacyLevel, ALLOWED_LEVEL_VALUES)
        : pickEnumString(activityMeta.difficulty_level, ALLOWED_LEVEL_VALUES);
    subjectAgg.modeCounts[resolvedMode] = (subjectAgg.modeCounts[resolvedMode] || 0) + 1;
    subjectAgg.levelCounts[resolvedLevel] = (subjectAgg.levelCounts[resolvedLevel] || 0) + 1;
    overallModeCounts[resolvedMode] = (overallModeCounts[resolvedMode] || 0) + 1;
    overallLevelCounts[resolvedLevel] = (overallLevelCounts[resolvedLevel] || 0) + 1;
    bumpAnswerLevelRollups(subjectAgg, assignedLevelEvidence);
    bumpAnswerLevelRollups(topicAgg, assignedLevelEvidence);
    bumpAnswerLevelRollups(gradeSlice, assignedLevelEvidence);
    bumpAnswerLevelRollups(overallLevelRollup, assignedLevelEvidence);

    const isCorrect = attempt.is_correct === true;
    const isSlow = timeMs != null && timeMs > REPORT_AGG_FLUENCY_THRESHOLDS.slowMs;
    const isFast = timeMs != null && timeMs < REPORT_AGG_FLUENCY_THRESHOLDS.fastMs;
    const isManyHints = hintsUsed != null && hintsUsed >= REPORT_AGG_FLUENCY_THRESHOLDS.manyHints;

    if (assignedSource === "parent") {
      const activityId = safeString(attempt.activity_id, 64);
      if (activityId) {
        let rollup = parentAssignedActivityRollups.get(activityId);
        if (!rollup) {
          rollup = {
            activityId,
            title: safeString(activityMeta.title, 120),
            subject,
            topic,
            contentGradeKey: contentGradeKey || null,
            questions: 0,
            correct: 0,
            timeMsSum: 0,
            lastAnswerAtIso: null,
          };
          parentAssignedActivityRollups.set(activityId, rollup);
        }
        rollup.questions += 1;
        if (isCorrect) rollup.correct += 1;
        if (timeMs != null) rollup.timeMsSum += Math.max(0, Math.round(timeMs));
        if (answerIso && (!rollup.lastAnswerAtIso || answerIso > rollup.lastAnswerAtIso)) {
          rollup.lastAnswerAtIso = answerIso;
        }
      }
    }

    applyAnswerMetricsToSlice(topicAgg, {
      hintsUsed,
      timeMs,
      resolvedMode,
      resolvedLevel,
      isCorrect,
      isSlow,
      isFast,
      isManyHints,
    });
    applyAnswerMetricsToSlice(gradeSlice, {
      hintsUsed,
      timeMs,
      resolvedMode,
      resolvedLevel,
      isCorrect,
      isSlow,
      isFast,
      isManyHints,
    });

    const snapshot =
      attempt.question_snapshot &&
      typeof attempt.question_snapshot === "object" &&
      !Array.isArray(attempt.question_snapshot)
        ? attempt.question_snapshot
        : {};

    const snapshotContextFlags =
      snapshot.contextFlags && typeof snapshot.contextFlags === "object"
        ? snapshot.contextFlags
        : {};

    const liveParentClassification = classifyActivityEvidence(
      activityMeta.mode,
      assignedSource === "private_teacher" ? "assigned_individual" : "assigned_parent",
      {
        afterStepByStep: snapshotContextFlags.afterStepByStep === true,
        hintsUsed: attempt.hints_used ?? 0,
      }
    );

    // Phase 4 + Phase 2: assigned attempts re-derived from source (parent or private teacher)
    const attemptClassification = classifyAnswerForAggregation(
      {
        isDiagnosticEligible: liveParentClassification.isDiagnosticEligible,
        evidenceCategory: liveParentClassification.evidenceCategory,
        contextFlags: liveParentClassification.contextFlags,
      },
      resolvedMode
    );
    applyClassificationToSlice(subjectAgg, { ...attemptClassification, isCorrect });
    applyClassificationToSlice(topicAgg, { ...attemptClassification, isCorrect });
    applyClassificationToSlice(gradeSlice, { ...attemptClassification, isCorrect });

    // Phase C: evidence provenance — parent-assigned or private-teacher-assigned activity.
    const assignedEvidenceSource =
      assignedSource === "private_teacher"
        ? EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED
        : EVIDENCE_SOURCE.PARENT_ASSIGNED;
    bumpEvidenceSourceCount(topicAgg.evidenceSourceCounts, assignedEvidenceSource);
    bumpEvidenceSourceCount(gradeSlice.evidenceSourceCounts, assignedEvidenceSource);
    if (assignedSource === "parent") {
      const answeredAtMs = parseActivityTimestampMs(answerIso);
      if (Number.isFinite(answeredAtMs)) {
        pushTopicAnswerEventForTrend(internalTopicAnswerEvents, subject, topic, contentGradeKey, {
          answeredAtMs,
          isCorrect,
          evidenceSource: EVIDENCE_SOURCE.PARENT_ASSIGNED,
        });
      }
    }

    const isCompetitivePar = attemptClassification.evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE;
    if (attemptClassification.isDiagnosticEligible && !isCompetitivePar) {
      overallDiagnosticAnswers += 1;
      if (isCorrect) overallDiagnosticCorrect += 1;
    } else if (isCompetitivePar) {
      overallCompetitiveAnswers += 1;
      if (isCorrect) overallCompetitiveCorrect += 1;
      accumulateCompetitiveByModeEntry(competitiveByModeAcc, resolvedMode, {
        isCorrect,
        timeMs,
        isFast,
      });
    } else {
      overallLearningAnswers += 1;
      if (attemptClassification.afterStepByStep) overallStepByStepCount += 1;
    }

    trackDiagnosticSubSkillRollupIfEnabled(
      diagnosticSubSkillRollup,
      snapshot,
      attemptClassification,
      subject,
      topic,
      isCorrect
    );
    trackDiagnosticQuestionTypeRollupIfEnabled(
      diagnosticQuestionTypeRollup,
      diagnosticQuestionTypeByGroupRollup,
      snapshot,
      attemptClassification,
      subject,
      topic,
      isCorrect
    );
    trackDiagnosticPedagogyRollupIfEnabled(
      diagnosticProblemClassRollup,
      diagnosticProblemClassByGroupRollup,
      diagnosticDifficultyDepthRollup,
      diagnosticDifficultyDepthByGroupRollup,
      snapshot,
      attemptClassification,
      subject,
      topic,
      isCorrect
    );

    const attemptContextFlags =
      snapshot.contextFlags && typeof snapshot.contextFlags === "object"
        ? snapshot.contextFlags
        : {};
    const attemptDayKey = toDateKey(answerIso);

    accumulatePositiveEvidenceEntry(positiveEvidenceAcc, {
      subject,
      topic,
      dayKey: attemptDayKey,
      answerIso,
      isCorrect,
      resolvedMode,
      isDiagnosticEligible: attemptClassification.isDiagnosticEligible,
      evidenceCategory: attemptClassification.evidenceCategory,
      afterStepByStep: attemptClassification.afterStepByStep,
      contextAfterBookReading: attemptContextFlags.contextAfterBookReading === true,
      isManyHints,
    });

    if (isCorrect) {
      correctAnswers += 1;
      subjectAgg.correct += 1;
      if (isSlow) subjectAgg.correctSlowAnswers += 1;
      if (isManyHints) subjectAgg.correctManyHintsAnswers += 1;
    } else {
      wrongAnswers += 1;
      subjectAgg.wrong += 1;
      if (isFast) subjectAgg.wrongFastAnswers += 1;

      const mistakeEvidence = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);
      const excludeCompetitiveMistake = shouldExcludeFromRecentMistakes({
        evidenceCategory: attemptClassification.evidenceCategory,
        resolvedMode,
      });
      if (!excludeCompetitiveMistake) {
        const capture = buildAggregateWrongAnswerCapture({
          subject,
          topic,
          questionId: safeString(
            `${assignedSource === "private_teacher" ? "pta" : "par"}_${attempt.activity_id}_q${attempt.question_index}`,
            180
          ),
          sessionId: safeString(attempt.activity_id, 180),
          answerId: safeString(attempt.id, 180),
          prompt: safeString(snapshot.question || snapshot.prompt, 500),
          expectedAnswer: safeString(attempt.correct_answer, 300),
          userAnswer: safeString(attempt.selected_answer, 300),
          hintsUsed: hintsUsed != null ? Math.round(hintsUsed) : null,
          timeSpentMs: timeMs != null ? Math.round(timeMs) : null,
          mode: resolvedMode,
          level: resolvedLevel,
          displayLevel: assignedLevelEvidence.displayLevel,
          sourceDifficulty: assignedLevelEvidence.sourceDifficulty,
          registeredGradeLevel: mistakeEvidence.registeredGradeLevel,
          contentGradeLevel: mistakeEvidence.contentGradeLevel,
          gradeRelation: mistakeEvidence.gradeRelation,
          answeredAt: answerIso,
          evidenceSource:
            assignedSource === "private_teacher" ? "private_teacher_assigned" : "parent_assigned",
          evidenceCategory: attemptClassification.evidenceCategory,
          isDiagnosticEligible: attemptClassification.isDiagnosticEligible,
          studentId: student.id,
          questionEngine: snapshot.questionEngine,
          diagnosticMetadata: snapshot.diagnosticMetadata,
          params:
            snapshot.params && typeof snapshot.params === "object" && !Array.isArray(snapshot.params)
              ? snapshot.params
              : undefined,
          patternFamily:
            snapshot.patternFamily ||
            snapshot.diagnosticMetadata?.patternFamily ||
            snapshot.questionEngine?.patternFamily,
        });
        if (recentMistakes.length < RECENT_MISTAKES_LIMIT) {
          recentMistakes.push(capture);
        }
        if (shouldCaptureDiagnosticMistake(attemptClassification, resolvedMode)) {
          pushDiagnosticMistakeRow(
            diagnosticMistakes,
            buildDiagnosticEvidenceRow(capture),
            diagnosticMistakesMeta,
          );
        }
      }
    }

    const dayKey = toDateKey(answerIso);
    if (dayKey) {
      if (!daily[dayKey]) {
        daily[dayKey] = { date: dayKey, sessions: 0, answers: 0, correct: 0, wrong: 0, durationSeconds: 0 };
      }
      daily[dayKey].answers += 1;
      if (isCorrect) daily[dayKey].correct += 1;
      else daily[dayKey].wrong += 1;
      if (timeMs != null && timeMs > 0) {
        daily[dayKey].durationSeconds += Math.max(0, Math.floor(timeMs / 1000));
      }
      const parentSubjectRow = ensureDailyBySubjectRow(dailyBySubject, dayKey, subject);
      if (parentSubjectRow) {
        parentSubjectRow.answers += 1;
        if (isCorrect) parentSubjectRow.correct += 1;
        else parentSubjectRow.wrong += 1;
        if (timeMs != null && timeMs > 0) {
          parentSubjectRow.durationSeconds += Math.max(0, Math.floor(timeMs / 1000));
        }
        trackDailySubjectTopic(dailyBySubject, dayKey, subject, topic);
      }
    }
  }

  for (const subject of REPORT_AGG_SUBJECTS) {
    const s = subjects[subject];
    reallocateOrphanTopicSessionDuration(s);
    s.accuracy = s.answers > 0 ? Number(((s.correct / s.answers) * 100).toFixed(2)) : 0;
    s.diagnosticAccuracy =
      s.diagnosticAnswers > 0
        ? Number(((s.diagnosticCorrect / s.diagnosticAnswers) * 100).toFixed(2))
        : 0;
    s.competitiveAccuracy =
      s.competitiveAnswers > 0
        ? Number(((s.competitiveCorrect / s.competitiveAnswers) * 100).toFixed(2))
        : 0;
    s.avgHintsPerQuestion =
      s.hintsCount > 0 ? Number((s.hintsSum / s.hintsCount).toFixed(2)) : null;
    s.avgTimePerQuestionSec =
      s.timeMsCount > 0 ? Number((s.timeMsSum / s.timeMsCount / 1000).toFixed(2)) : null;
    finalizeDisplayLevelRollups(s);
    for (const topicKey of Object.keys(s.topics)) {
      const topic = s.topics[topicKey];
      for (const gradeKey of Object.keys(topic.byContentGrade || {})) {
        reconcileLatestActivityToReportRange(topic.byContentGrade[gradeKey], reportRangeMs);
      }
      reconcileLatestActivityToReportRange(topic, reportRangeMs);
    }
    rollupSubjectActivityTimestamps(s);
    reconcileLatestActivityToReportRange(s, reportRangeMs);
    for (const topicKey of Object.keys(s.topics)) {
      const topic = s.topics[topicKey];
      finalizeTopicGradeSlice(topic);
      for (const gradeKey of Object.keys(topic.byContentGrade || {})) {
        finalizeTopicGradeSlice(topic.byContentGrade[gradeKey]);
      }
    }
  }

  const reportWindowDays = Math.max(
    1,
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
  totalDurationSeconds = applyReportDurationSanityToAggregateSubjects(subjects, {
    windowDays: reportWindowDays,
  });

  const totalAnswers = correctAnswers + wrongAnswers;
  const accuracy = totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : 0;
  const overallDiagnosticAccuracy =
    overallDiagnosticAnswers > 0
      ? Number(((overallDiagnosticCorrect / overallDiagnosticAnswers) * 100).toFixed(2))
      : 0;
  const overallCompetitiveAccuracy =
    overallCompetitiveAnswers > 0
      ? Number(((overallCompetitiveCorrect / overallCompetitiveAnswers) * 100).toFixed(2))
      : 0;
  const dailyActivity = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));

  const overallAvgHintsPerQuestion =
    overallHintsCount > 0 ? Number((overallHintsSum / overallHintsCount).toFixed(2)) : null;
  const overallAvgTimePerQuestionSec =
    overallTimeMsCount > 0
      ? Number((overallTimeMsSum / overallTimeMsCount / 1000).toFixed(2))
      : null;

  const rawGradeLevel =
    typeof student.grade_level === "string" ? student.grade_level.trim().toLowerCase() : "";
  const normalizedGradeLevel = GRADE_LEVEL_PATTERN.test(rawGradeLevel) ? rawGradeLevel : "unknown";

  const competitiveContext = buildCompetitiveContext(competitiveByModeAcc, {
    totalAnswers: overallCompetitiveAnswers,
    totalCorrect: overallCompetitiveCorrect,
    overallAccuracy: overallCompetitiveAccuracy,
  });

  const summaryForEvidence = {
    diagnosticAnswers: overallDiagnosticAnswers,
    diagnosticAccuracy: overallDiagnosticAccuracy,
  };
  const positiveEvidence = buildPositiveEvidence(
    subjects,
    summaryForEvidence,
    positiveEvidenceAcc,
    competitiveContext,
    null
  );

  const subSkillRollupPayload =
    isDiagnosticMetadataSubskillEnabled() && Object.keys(diagnosticSubSkillRollup).length > 0
      ? { _diagnosticSubSkillRollup: diagnosticSubSkillRollup }
      : {};
  const questionTypeRollupPayload =
    isDiagnosticMetadataSubskillEnabled() &&
    (Object.keys(diagnosticQuestionTypeRollup).length > 0 ||
      Object.keys(diagnosticQuestionTypeByGroupRollup).length > 0)
      ? {
          _diagnosticQuestionTypeRollup: diagnosticQuestionTypeRollup,
          _diagnosticQuestionTypeByGroupRollup: diagnosticQuestionTypeByGroupRollup,
        }
      : {};
  const pedagogyRollupPayload =
    isDiagnosticMetadataSubskillEnabled() &&
    (Object.keys(diagnosticProblemClassRollup).length > 0 ||
      Object.keys(diagnosticProblemClassByGroupRollup).length > 0 ||
      Object.keys(diagnosticDifficultyDepthRollup).length > 0 ||
      Object.keys(diagnosticDifficultyDepthByGroupRollup).length > 0)
      ? {
          _diagnosticProblemClassRollup: diagnosticProblemClassRollup,
          _diagnosticProblemClassByGroupRollup: diagnosticProblemClassByGroupRollup,
          _diagnosticDifficultyDepthRollup: diagnosticDifficultyDepthRollup,
          _diagnosticDifficultyDepthByGroupRollup: diagnosticDifficultyDepthByGroupRollup,
        }
      : {};

  return {
    ok: true,
    student: {
      id: student.id,
      full_name: student.full_name ?? null,
      grade_level: student.grade_level ?? null,
      is_active: student.is_active === true,
    },
    range: {
      from: isoDateOnly(fromDate),
      to: isoDateOnly(toDate),
    },
    summary: {
      totalSessions: countableSessions,
      completedSessions,
      totalAnswers,
      correctAnswers,
      wrongAnswers,
      accuracy,
      diagnosticAnswers: overallDiagnosticAnswers,
      diagnosticCorrect: overallDiagnosticCorrect,
      diagnosticWrong: overallDiagnosticAnswers - overallDiagnosticCorrect,
      diagnosticAccuracy: overallDiagnosticAccuracy,
      competitiveAnswers: overallCompetitiveAnswers,
      competitiveCorrect: overallCompetitiveCorrect,
      competitiveAccuracy: overallCompetitiveAccuracy,
      learningAnswers: overallLearningAnswers,
      stepByStepCount: overallStepByStepCount,
      totalDurationSeconds,
      avgHintsPerQuestion: overallAvgHintsPerQuestion,
      avgTimePerQuestionSec: overallAvgTimePerQuestionSec,
      modeCounts: overallModeCounts,
      levelCounts: overallLevelCounts,
      dominantDisplayLevel: dominantDisplayLevelFromCounts(overallDisplayLevelCounts),
      _sourceDifficultyBreakdown: overallSourceDifficultyBreakdown,
      normalizedGradeLevel,
      registeredGradeLevel: registeredGradeKey || "unknown",
    },
    subjects,
    dailyActivity,
    dailyActivityBySubject: serializeDailyActivityBySubject(dailyBySubject),
    _dailyBySubject: dailyBySubject,
    recentMistakes,
    diagnosticMistakes,
    competitiveContext,
    positiveEvidence,
    _positiveEvidenceAcc: positiveEvidenceAcc,
    probeEvidence,
    meta: {
      source: "supabase",
      version: "phase-8-mcq-engine-contract",
      insightsVersion: "2026.05-insights",
      fallbackUsed:
        fetchMeta.sessionsFilterField !== "started_at" ||
        fetchMeta.answersFilterField !== "answered_at",
      sessionDateField: fetchMeta.sessionsFilterField,
      answerDateField: fetchMeta.answersFilterField,
      fluencyThresholds: { ...REPORT_AGG_FLUENCY_THRESHOLDS },
      _rawActivityAccuracy: accuracy,
      diagnosticMistakesCount: diagnosticMistakes.length,
      diagnosticMistakesTruncated: diagnosticMistakesMeta.diagnosticMistakesTruncated === true,
    },
    ...subSkillRollupPayload,
    ...questionTypeRollupPayload,
    ...pedagogyRollupPayload,
    _parentAssignedActivityRollups: Object.fromEntries(parentAssignedActivityRollups),
    _internalTopicAnswerEvents: internalTopicAnswerEvents,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {string} studentId
 * @param {string[]} activityIds
 */
async function fetchParentActivityStatusMap(serviceClient, studentId, activityIds) {
  const ids = (Array.isArray(activityIds) ? activityIds : []).filter(Boolean);
  if (!ids.length) return {};
  try {
    const { data, error } = await serviceClient
      .from("parent_activity_status")
      .select("activity_id, status")
      .eq("student_id", studentId)
      .in("activity_id", ids);
    if (error) return {};
    /** @type {Record<string, string|null>} */
    const out = {};
    for (const row of data || []) {
      const id = row?.activity_id ? String(row.activity_id) : "";
      if (!id) continue;
      out[id] = row?.status ? String(row.status).trim() : null;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, unknown>|null|undefined} rollupsObj
 * @param {Record<string, string|null>|null|undefined} statusMap
 */
function serializeParentAssignedActivitiesInPeriod(rollupsObj, statusMap) {
  const rows = Object.values(rollupsObj && typeof rollupsObj === "object" ? rollupsObj : {});
  return rows
    .map((raw) => {
      const q = Number(raw?.questions) || 0;
      if (q <= 0) return null;
      const c = Number(raw?.correct) || 0;
      const activityId = String(raw?.activityId || "").trim();
      return {
        activityId: activityId || null,
        titleHe: raw?.title ? String(raw.title).trim() : null,
        subjectId: String(raw?.subject || "").trim(),
        topicKey: String(raw?.topic || "").trim(),
        contentGradeKey: raw?.contentGradeKey ? String(raw.contentGradeKey).trim() : null,
        questionCount: q,
        correctCount: c,
        accuracy: Math.round((c / q) * 100),
        timeMinutes: Math.round((Number(raw?.timeMsSum) || 0) / 60000),
        lastActivityAtIso: raw?.lastAnswerAtIso ? String(raw.lastAnswerAtIso) : null,
        status: activityId && statusMap ? statusMap[activityId] || null : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(b.lastActivityAtIso || "").localeCompare(String(a.lastActivityAtIso || ""))
    );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {{ id: string, full_name?: string|null, grade_level?: string|null, is_active?: boolean }} student
 * @param {Date} fromDate inclusive (calendar date in UTC terms per report-data API)
 * @param {Date} toDate inclusive
 * @param {{ includeParentActivities?: boolean, includePrivateTeacherActivities?: boolean }} [options]
 * @returns {Promise<object>} Same JSON shape as successful GET report-data response (`ok: true`, student, range, summary, …)
 */
export async function aggregateParentReportPayload(serviceClient, student, fromDate, toDate, options = {}) {
  if (student?.account_kind === "guest") {
    return {
      ok: false,
      error: "guest_not_eligible",
      message: "לא זמין לאורח",
    };
  }
  const fromIso = `${isoDateOnly(fromDate)}T00:00:00.000Z`;
  const toDateExclusive = new Date(toDate);
  toDateExclusive.setUTCDate(toDateExclusive.getUTCDate() + 1);
  const toIsoExclusive = `${isoDateOnly(toDateExclusive)}T00:00:00.000Z`;

  const [
    sessionsResult,
    answersResult,
    parentAttemptsResult,
    privateTeacherAttemptsResult,
    bookVisitsResult,
    bookSessionsResult,
  ] = await Promise.all([
    fetchSessionsInRange(serviceClient, student.id, fromIso, toIsoExclusive),
    fetchAnswersInRange(serviceClient, student.id, fromIso, toIsoExclusive),
    options.includeParentActivities === true
      ? fetchParentActivityAttemptsInRange(serviceClient, student.id, fromIso, toIsoExclusive)
      : Promise.resolve({ rows: [], schemaUnavailable: false }),
    options.includePrivateTeacherActivities === true
      ? fetchPrivateTeacherActivityAttemptsInRange(serviceClient, student.id, fromIso, toIsoExclusive)
      : Promise.resolve({ rows: [], schemaUnavailable: false }),
    fetchBookPageVisitsInRange(serviceClient, student.id, fromIso, toIsoExclusive),
    fetchBookReadingSessionsInRange(serviceClient, student.id, fromIso, toIsoExclusive),
  ]);

  const parentActivityAttempts = parentAttemptsResult.rows;
  const parentActivitySchemaUnavailable = parentAttemptsResult.schemaUnavailable === true;
  const privateTeacherActivityAttempts = privateTeacherAttemptsResult.rows;
  const privateTeacherActivitySchemaUnavailable =
    privateTeacherAttemptsResult.schemaUnavailable === true;

  const payload = aggregateReportPayloadFromActivityRows(
    student,
    sessionsResult.rows,
    answersResult.rows,
    fromDate,
    toDate,
    {
      sessionsFilterField: sessionsResult.filterField,
      answersFilterField: answersResult.filterField,
    },
    parentActivityAttempts,
    privateTeacherActivityAttempts
  );

  if (parentActivitySchemaUnavailable || privateTeacherActivitySchemaUnavailable) {
    payload.meta = {
      ...(payload.meta && typeof payload.meta === "object" ? payload.meta : {}),
      _dataHealth: {
        ...(payload.meta?._dataHealth && typeof payload.meta._dataHealth === "object"
          ? payload.meta._dataHealth
          : {}),
        ...(parentActivitySchemaUnavailable ? { parentActivityAttemptsUnavailable: true } : {}),
        ...(privateTeacherActivitySchemaUnavailable
          ? { privateTeacherActivityAttemptsUnavailable: true }
          : {}),
      },
    };
  }

  const rollupsRaw = payload._parentAssignedActivityRollups;
  if (
    rollupsRaw &&
    typeof rollupsRaw === "object" &&
    options.includeParentActivities === true
  ) {
    const activityIds = Object.keys(rollupsRaw);
    const statusMap = await fetchParentActivityStatusMap(serviceClient, student.id, activityIds);
    payload.parentAssignedActivitiesInPeriod = serializeParentAssignedActivitiesInPeriod(
      rollupsRaw,
      statusMap
    );
  }
  delete payload._parentAssignedActivityRollups;

  const withBooks = mergeLearningActivityBookData(
    payload,
    bookVisitsResult.rows,
    bookSessionsResult.rows,
    answersResult.rows
  );

  return attachUnifiedCreditedLearningTimeToParentReportPayload(
    serviceClient,
    student.id,
    withBooks
  );
}

/**
 * Remove server-only aggregation helpers before serializing report payloads to clients.
 * Strips:
 *  - raw `accuracy` from subjects, topics, byContentGrade, and summary
 *  - `meta._rawActivityAccuracy` - never exposed in API responses
 *  - `_dailyBySubject` - internal aggregation helper (includes `_topicKeys` during aggregation)
 * `dailyActivityBySubject` is parent-facing per-subject daily breakdown.
 * Only `diagnosticAccuracy` is human-facing.
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function stripInternalReportPayloadFields(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const out = { ...payload };
  delete out._parentAssignedActivityRollups;
  // נשמר לדוח הורים — seed של trendV1 בלקוח (API מאומת להורים).
  // delete out._internalTopicAnswerEvents;
  delete out._dailyBySubject;
  delete out._positiveEvidenceAcc;
  delete out._diagnosticSubSkillRollup;
  delete out._diagnosticQuestionTypeRollup;
  delete out._diagnosticQuestionTypeByGroupRollup;
  delete out._diagnosticProblemClassRollup;
  delete out._diagnosticProblemClassByGroupRollup;
  delete out._diagnosticDifficultyDepthRollup;
  delete out._diagnosticDifficultyDepthByGroupRollup;

  if (Array.isArray(out.recentMistakes)) {
    out.recentMistakes = out.recentMistakes.map((mistake) => {
      if (!mistake || typeof mistake !== "object") return mistake;
      const {
        _canonicalMeta: _strippedMeta,
        skillId: _skillId,
        subSkill: _subSkill,
        diagnosticSkillId: _diagnosticSkillId,
        metadataConfidence: _metadataConfidence,
        ...clean
      } = mistake;
      return clean;
    });
  }

  // Strip raw accuracy from summary (only diagnosticAccuracy is human-facing)
  if (out.summary && typeof out.summary === "object") {
    const { accuracy: _rawSummaryAccuracy, ...summaryClean } = out.summary;
    out.summary = summaryClean;
  }

  // Strip raw accuracy from each subject and its topics/grades
  if (out.subjects && typeof out.subjects === "object") {
    const cleanSubjects = {};
    for (const [key, subj] of Object.entries(out.subjects)) {
      if (!subj || typeof subj !== "object") {
        cleanSubjects[key] = subj;
        continue;
      }
      const { accuracy: _rawSubjAccuracy, ...subjClean } = subj;
      // Also strip raw accuracy from topics
      if (subjClean.topics && typeof subjClean.topics === "object") {
        const cleanTopics = {};
        for (const [tk, topic] of Object.entries(subjClean.topics)) {
          if (!topic || typeof topic !== "object") {
            cleanTopics[tk] = topic;
            continue;
          }
          const { accuracy: _rawTopicAccuracy, ...topicClean } = topic;
          delete topicClean.evidenceSourceCounts;
          delete topicClean.evidenceSources;
          delete topicClean.primaryEvidenceSource;
          if (topicClean.byContentGrade && typeof topicClean.byContentGrade === "object") {
            const cleanGrades = {};
            for (const [gk, grade] of Object.entries(topicClean.byContentGrade)) {
              if (!grade || typeof grade !== "object") { cleanGrades[gk] = grade; continue; }
              const { accuracy: _rawGradeAccuracy, ...gradeClean } = grade;
              cleanGrades[gk] = gradeClean;
            }
            topicClean.byContentGrade = cleanGrades;
          }
          cleanTopics[tk] = topicClean;
        }
        subjClean.topics = cleanTopics;
      }
      cleanSubjects[key] = subjClean;
    }
    out.subjects = cleanSubjects;
  }

  // Strip _rawActivityAccuracy and internal evidence quality from meta
  if (out.meta && typeof out.meta === "object") {
    const {
      _rawActivityAccuracy: _stripped,
      _evidenceQuality: _eqInternal,
      _dataHealth: _dataHealthInternal,
      ...metaClean
    } = out.meta;
    out.meta = metaClean;
  }

  if (out.learningActivity && typeof out.learningActivity === "object") {
    const {
      _bookReadingInternal: _internal,
      hiddenTabMs: _hiddenTabMs,
      sectionsSkipped: _sectionsSkipped,
      clientSessionToken: _clientSessionToken,
      clientVisitToken: _clientVisitToken,
      ...learningActivityClean
    } = out.learningActivity;
    out.learningActivity = learningActivityClean;
  }

  delete out._bookReadingInternal;

  return /** @type {typeof out} */ (stripZeroEvidenceFromPublicReportPayload(out));
}

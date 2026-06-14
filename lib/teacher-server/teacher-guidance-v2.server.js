/**
 * Teacher Guidance V2 — evidence-based recommendations (server-side).
 * Imports diagnostic sub-utilities only; does not run full runDiagnosticEngineV2.
 */

import { REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";
import {
  isTeacherRecommendableTopicKey,
  normalizeTopicKeyForLabel,
  resolveTopicLabelHe,
} from "../teacher-portal/teacher-ui.he.js";
import { mistakeTimestampMs } from "../../utils/mistake-event.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { passesRecurrenceRules } from "../../utils/diagnostic-engine-v2/recurrence.js";
import { resolveConfidenceLevel } from "../../utils/diagnostic-engine-v2/confidence-policy.js";
import { resolvePriority } from "../../utils/diagnostic-engine-v2/priority-policy.js";
import { buildInterventionPlan } from "../../utils/diagnostic-engine-v2/intervention-layer.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  buildStudentTeacherGuidance,
  buildClassTeacherGuidance,
  deriveStudentGuidanceSeverityTier,
  deriveClassGuidanceSeverityTier,
  mapClassHealthSignalFromTier,
  LOW_ACCURACY_THRESHOLD,
  MIN_ANSWERS_FOR_TOPIC_SIGNAL,
  MIN_ANSWERS_FOR_STUDENT_SIGNAL,
  MIN_CLASS_ANSWERS_FOR_GUIDANCE,
  ON_TRACK_MIN_ACCURACY,
} from "./teacher-recommendations.server.js";
import { teacherStudentDisplayName } from "./teacher-students.server.js";
import {
  subjectLabelHe,
  formatStudentSubjectFallbackHeadlineHe,
  formatStudentSubjectFallbackActionHe,
  formatClassSubjectFallbackHeadlineHe,
  formatClassSubjectFallbackActionHe,
} from "../teacher-portal/teacher-ui.he.js";

const STRENGTH_THRESHOLD = 80;
const PRIORITY_ORDER = { P4: 0, P3: 1, P2: 2, P1: 3 };
const STUDENT_SUBJECT_FALLBACK_ACTION = "diagnostic_practice";
const CLASS_SUBJECT_FALLBACK_ACTION = "class_diagnostic_review";

export { isTeacherRecommendableTopicKey, normalizeTopicKeyForLabel, resolveTopicLabelHe };

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {Array<Record<string, unknown>>} units
 */
function buildSupportSuggestionsV2FromUnits(units) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();
  for (const u of units) {
    const label = u.topicLabelHe || u.headlineHe;
    if (!label) continue;
    if (u.level === "topic" && !isTeacherRecommendableTopicKey(u.topic)) continue;
    const dedupeKey = `${u.recommendedActionType}::${u.subject}::${u.topic || "__subject__"}`;
    const existing = byKey.get(dedupeKey);
    if (!existing) {
      byKey.set(dedupeKey, u);
      continue;
    }
    const pa = PRIORITY_ORDER[u.severity] ?? 9;
    const pb = PRIORITY_ORDER[existing.severity] ?? 9;
    const accU = safeNum(u.evidenceSummary?.accuracyPct ?? u.cohortAccuracyPct);
    const accE = safeNum(existing.evidenceSummary?.accuracyPct ?? existing.cohortAccuracyPct);
    if (pa < pb || (pa === pb && accU < accE)) {
      byKey.set(dedupeKey, u);
    }
  }
  return [...byKey.values()].map((u) => ({
    code: u.recommendedActionType,
    subject: u.subject,
    topic: u.topic,
    topicLabelHe: u.topicLabelHe || u.headlineHe,
  }));
}

/**
 * @param {string} subjectId
 * @param {string} topicKey
 */
export function classifyDroppedTopicReason(subjectId, topicKey) {
  const base = normalizeTopicKeyForLabel(topicKey).toLowerCase();
  if (!base) return "general";
  if (base === "general") return "general";
  if (base === "mixed") return "mixed";
  if (!isTeacherRecommendableTopicKey(topicKey)) return "general";

  const sid = String(subjectId || "").trim().toLowerCase();
  const sidAlt = sid.replace(/_/g, "-");
  const sidAlt2 = sid.replace(/-/g, "_");
  if (base === sid || base === sidAlt || base === sidAlt2) {
    return "subject_name_topic";
  }

  if (resolveTopicLabelHe(subjectId, topicKey)) return null;

  for (const otherSubjectId of REPORT_AGG_SUBJECTS) {
    if (otherSubjectId === subjectId) continue;
    if (resolveTopicLabelHe(otherSubjectId, topicKey)) {
      return "cross_subject_topic";
    }
  }

  return "unmapped_topic";
}

/**
 * @param {{ droppedAnswerCount?: number }|null|undefined} classificationGapSummary
 * @param {number} totalAnswers
 */
export function detectFallbackDominance(classificationGapSummary, totalAnswers) {
  const dropped = Number(classificationGapSummary?.droppedAnswerCount) || 0;
  const total = Number(totalAnswers) || 0;
  const ratio = total > 0 ? dropped / total : 0;
  if (ratio > 0.8) {
    return { dominant: true, reason: "high_fallback_ratio", ratio };
  }
  return { dominant: false, reason: null, ratio };
}

/**
 * @param {Map<string, { reasons: Set<string>, droppedAnswerCount: number, totalAnswers: number }>} gapBySubject
 * @param {string} subjectId
 * @param {string} reason
 * @param {number} answers
 */
function recordDroppedTopic(gapBySubject, subjectId, reason, answers) {
  if (!gapBySubject.has(subjectId)) {
    gapBySubject.set(subjectId, {
      reasons: new Set(),
      droppedAnswerCount: 0,
      totalAnswers: 0,
    });
  }
  const row = gapBySubject.get(subjectId);
  row.reasons.add(reason);
  row.droppedAnswerCount += answers;
}

function buildClassificationGapSummary(gapBySubject, subjects) {
  const out = [];
  for (const [subject, row] of gapBySubject) {
    const subj = subjects?.[subject];
    out.push({
      subject,
      reasons: [...row.reasons],
      droppedAnswerCount: row.droppedAnswerCount,
      totalAnswers: safeNum(subj?.answers) || row.totalAnswers,
    });
  }
  return { subjects: out };
}

function tierToDiagnosticSeverity(tier) {
  if (tier === "critical" || tier === "critical_class" || tier === "class_needs_reinforcement") {
    return "P2";
  }
  return "P3";
}

function sortRecommendationUnits(units) {
  units.sort((a, b) => {
    const levelA = a.level === "subject" ? 1 : 0;
    const levelB = b.level === "subject" ? 1 : 0;
    if (levelA !== levelB) return levelA - levelB;
    const pa = PRIORITY_ORDER[a.severity] ?? 9;
    const pb = PRIORITY_ORDER[b.severity] ?? 9;
    if (pa !== pb) return pa - pb;
    const accA = safeNum(a.evidenceSummary?.accuracyPct ?? a.cohortAccuracyPct);
    const accB = safeNum(b.evidenceSummary?.accuracyPct ?? b.cohortAccuracyPct);
    return accA - accB;
  });
}

/**
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @param {string} subject
 * @param {string} topicKey
 */
function wrongEventsForTopic(recentMistakes, subject, topicKey) {
  if (!Array.isArray(recentMistakes)) return [];
  return recentMistakes
    .filter((m) => m?.subject === subject && m?.topic === topicKey)
    .map((m) => ({
      subject: m.subject,
      topicOrOperation: m.topic,
      bucketKey: m.topic,
      timestamp: mistakeTimestampMs({
        timestamp: m.answeredAt,
        date: m.answeredAt,
      }),
      exerciseText: m.prompt,
      userAnswer: m.userAnswer,
      correctAnswer: m.expectedAnswer,
      isCorrect: false,
      hintUsed: m.hintsUsed != null ? m.hintsUsed > 0 : null,
    }));
}

function distinctDatesFromWrongEvents(wrongEvents) {
  const days = new Set();
  for (const e of wrongEvents) {
    const t = e.timestamp;
    if (t == null || !Number.isFinite(t)) continue;
    const d = new Date(t);
    days.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  }
  return days.size;
}

/**
 * @param {string} subject
 * @param {string} topicKey
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongEvents
 */
function resolveTaxonomyId(subject, topicKey, wrongEvents) {
  const candidateIds = taxonomyIdsForReportBucket(subject, topicKey) || [];
  for (const id of candidateIds) {
    const row = TAXONOMY_BY_ID[id];
    if (!row) continue;
    if (passesRecurrenceRules(wrongEvents, row)) return id;
  }
  for (const id of candidateIds) {
    const row = TAXONOMY_BY_ID[id];
    if (!row) continue;
    if (wrongEvents.length >= row.minWrong) return id;
  }
  return null;
}

function recurrenceSignalFrom(wrongEvents, taxonomyId, subject, topicKey) {
  if (!wrongEvents.length) return { signal: "none", days: 0 };
  const days = distinctDatesFromWrongEvents(wrongEvents);
  if (taxonomyId) {
    const row = TAXONOMY_BY_ID[taxonomyId];
    if (row && passesRecurrenceRules(wrongEvents, row)) {
      return { signal: "full", days };
    }
  }
  if (days >= 2) return { signal: "partial", days };
  return { signal: "none", days };
}

function confidenceForAction(confidence) {
  if (confidence === "insufficient_data" || confidence === "early_signal_only") {
    return "very_low";
  }
  if (confidence === "moderate") return "medium";
  return confidence;
}

/**
 * @param {object} p
 */
function resolveStudentRecommendedActionType(p) {
  const {
    confidence,
    totalAnswers,
    classContext,
    classSize,
  } = p;

  if (confidenceForAction(confidence) === "very_low" || totalAnswers < 3) {
    return "collect_more_data";
  }

  const ctx = classContext || {};
  if (ctx.isAlsoClassWideWeakness) {
    const affected = safeNum(ctx.affectedStudentsInClass);
    const size = safeNum(classSize) || affected;
    if (size > 0 && affected / size >= 0.4) return "class_reteach";
    if (affected >= 2 && affected <= 5) return "small_group";
  }

  return "individual_practice";
}

/**
 * @param {number} affectedStudentCount
 * @param {number} affectedFraction
 */
function resolveClassRecommendedActionType(affectedStudentCount, affectedFraction) {
  if (affectedStudentCount === 0) return "collect_more_data";
  if (affectedFraction >= 0.4) return "class_reteach";
  if (affectedStudentCount >= 2 && affectedStudentCount <= 5 && affectedFraction < 0.4) {
    return "small_group";
  }
  if (affectedStudentCount === 1) return "individual_practice";
  return "collect_more_data";
}

function suggestedAssignmentType(recommendedActionType) {
  const map = {
    class_reteach: "classroom_activity",
    small_group: "worksheet_pdf",
    individual_practice: "worksheet_pdf",
    collect_more_data: "focused_practice",
    diagnostic_practice: "short_diagnostic",
    class_diagnostic_review: "class_diagnostic_or_review",
  };
  return map[recommendedActionType] || "focused_practice";
}

function isoDateFromMs(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function permittedSubjectList(permittedSubjects) {
  if (!permittedSubjects) return null;
  return [...permittedSubjects];
}

function subjectsToIterate(permittedSubjects) {
  if (!permittedSubjects) return [...REPORT_AGG_SUBJECTS];
  return REPORT_AGG_SUBJECTS.filter((s) => permittedSubjects.has(s));
}

function findClassWeakness(classWeaknessTopics, subject, topic) {
  if (!Array.isArray(classWeaknessTopics)) return null;
  return (
    classWeaknessTopics.find((w) => w?.subject === subject && w?.topic === topic) || null
  );
}

function buildClassContext(classWeakness, classSize) {
  if (!classWeakness) {
    return {
      isAlsoClassWideWeakness: false,
      affectedStudentsInClass: 0,
      classAccuracyPct: null,
    };
  }
  const affected = safeNum(classWeakness.studentCount);
  const answers = safeNum(classWeakness.answers);
  const wrong = safeNum(classWeakness.wrong);
  const classAccuracyPct =
    answers > 0 ? Number((((answers - wrong) / answers) * 100).toFixed(1)) : null;
  const threshold = classSize > 0 ? affected / classSize >= 0.3 : affected >= 2;
  return {
    isAlsoClassWideWeakness: threshold,
    affectedStudentsInClass: affected,
    classAccuracyPct,
  };
}

/**
 * @param {Record<string, unknown>} sanitizedPayload
 * @param {{ permittedSubjects?: Set<string>|null, classWeaknessTopics?: Array<Record<string, unknown>>|null, classSize?: number|null }} [opts]
 */
export function buildStudentTeacherGuidanceV2(sanitizedPayload, opts = {}) {
  const { permittedSubjects = null, classWeaknessTopics = null, classSize = null } = opts;
  const v1 = buildStudentTeacherGuidance(sanitizedPayload);
  const generatedAt = new Date().toISOString();
  const subjectFilter = permittedSubjectList(permittedSubjects);

  const base = {
    ...v1,
    version: "v2",
    generatedAt,
    subjectFilter,
    recommendationUnits: [],
    strengthUnits: [],
    supportSuggestionsV2: [],
  };

  if (v1.insufficientData) {
    return base;
  }

  const subjects = sanitizedPayload?.subjects || {};
  const recentMistakes = sanitizedPayload?.recentMistakes || [];
  const summary = sanitizedPayload?.summary || {};
  const dailyActivity = sanitizedPayload?.dailyActivity;

  const totalAnswers = safeNum(summary.totalAnswers);
  const correctAnswers = safeNum(summary.correctAnswers);
  const wrongAnswers = safeNum(summary.wrongAnswers);
  const totalSessions = safeNum(summary.totalSessions);
  const accuracyPct =
    totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(1)) : 0;

  if (totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL) {
    return {
      ...base,
      insufficientData: true,
      teacherGuidance: {
        ...(v1.teacherGuidance || {}),
        reason: "not_enough_activity",
      },
    };
  }

  let lastActivityDate = v1.teacherGuidance?.lastActivityDate || null;
  if (!lastActivityDate && Array.isArray(dailyActivity) && dailyActivity.length) {
    const sorted = [...dailyActivity].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
    lastActivityDate = sorted[0]?.date || null;
  }

  const inactiveDays = v1.teacherGuidance?.inactiveDays ?? null;
  base.overallStats = {
    totalAnswers,
    correctAnswers,
    wrongAnswers,
    accuracyPct,
    totalSessions,
    lastActivityDate,
    inactiveDays,
  };
  base.guidanceSeverityTier =
    v1.guidanceSeverityTier || deriveStudentGuidanceSeverityTier(accuracyPct);
  base.riskLevel = v1.teacherGuidance?.riskLevel || "low";

  const recommendationUnits = [];
  const strengthUnits = [];
  /** @type {Map<string, { reasons: Set<string>, droppedAnswerCount: number, totalAnswers: number }>} */
  const gapBySubject = new Map();

  for (const sid of subjectsToIterate(permittedSubjects)) {
    const subj = subjects[sid];
    if (!subj || typeof subj !== "object") continue;

    const topicUnitsForSubject = [];

    for (const [topicKey, topicData] of Object.entries(subj.topics || {})) {
      if (!topicData || typeof topicData !== "object") continue;
      const answers = safeNum(topicData.diagnosticAnswers ?? topicData.answers);
      const dropReason = classifyDroppedTopicReason(sid, topicKey);
      if (dropReason) {
        if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
          recordDroppedTopic(gapBySubject, sid, dropReason, answers);
        }
        continue;
      }
      const topicLabelHe = resolveTopicLabelHe(sid, topicKey);
      if (!topicLabelHe) {
        if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
          recordDroppedTopic(gapBySubject, sid, "unmapped_topic", answers);
        }
        continue;
      }
      const wrongCount = safeNum(topicData.diagnosticWrong ?? topicData.wrong);
      const correct = safeNum(topicData.diagnosticCorrect ?? topicData.correct);
      const accuracy =
        answers > 0 ? Number(((correct / answers) * 100).toFixed(1)) : 0;

      if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy < LOW_ACCURACY_THRESHOLD) {
        const wrongEvents = wrongEventsForTopic(recentMistakes, sid, topicKey);
        const taxonomyId = resolveTaxonomyId(sid, topicKey, wrongEvents);
        const { signal: recurrenceSignal, days: recurrenceDays } = recurrenceSignalFrom(
          wrongEvents,
          taxonomyId,
          sid,
          topicKey
        );
        const recurrenceFull = recurrenceSignal === "full";
        const taxonomyRow = taxonomyId ? TAXONOMY_BY_ID[taxonomyId] : null;
        const subtopic = taxonomyId || null;

        const confidenceRaw = resolveConfidenceLevel({
          events: wrongEvents,
          wrongs: wrongEvents,
          row: {
            questions: answers,
            correct,
            wrong: wrongCount,
            accuracy,
          },
          recurrenceFull,
          hintInvalidates: false,
        });
        const confidence = confidenceForAction(confidenceRaw);
        const severity = resolvePriority(confidenceRaw, "medium", {
          sharpDecline: false,
          crossSubjectContradiction: false,
        });

        const classWeakness = findClassWeakness(classWeaknessTopics, sid, topicKey);
        const classContext = buildClassContext(classWeakness, classSize);

        const recommendedActionType = resolveStudentRecommendedActionType({
          confidence,
          totalAnswers: answers,
          classContext,
          classSize,
        });

        const recentMistakeExamples = wrongEvents.slice(0, 3).map((e) => ({
          prompt: e.exerciseText ? String(e.exerciseText).slice(0, 500) : "",
          userAnswer: e.userAnswer != null ? String(e.userAnswer) : "",
          expectedAnswer: e.correctAnswer != null ? String(e.correctAnswer) : "",
          date: isoDateFromMs(e.timestamp),
        }));

        const lastSeenMs = wrongEvents.reduce(
          (max, e) => (e.timestamp != null && e.timestamp > max ? e.timestamp : max),
          0
        );

        const topicUnit = {
          unitId: `${sid}::${topicKey}`,
          scope: "individual",
          level: "topic",
          subject: sid,
          topic: topicKey,
          subtopic: subtopic || null,
          taxonomyId,
          topicLabelHe,
          subtopicLabelHe: taxonomyRow?.subskillHe || null,
          severity,
          confidence,
          evidenceSummary: {
            wrongCount,
            totalAnswers: answers,
            accuracyPct: accuracy,
            sessionCount: recurrenceDays || 1,
            recurrenceSignal,
            recurrenceDays,
            lastSeenDate: lastSeenMs ? isoDateFromMs(lastSeenMs) : null,
          },
          recentMistakeExamples,
          classContext,
          recommendedActionType,
          suggestedAssignmentType: suggestedAssignmentType(recommendedActionType),
          interventionPlan: taxonomyId ? buildInterventionPlan(taxonomyId) : null,
          sourceUnit: taxonomyId ? "aggregate_rollup_with_taxonomy" : "aggregate_rollup",
          guidanceSeverityTier: deriveStudentGuidanceSeverityTier(accuracy),
        };
        recommendationUnits.push(topicUnit);
        topicUnitsForSubject.push(topicUnit);
      }

      if (
        answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL &&
        accuracy >= STRENGTH_THRESHOLD &&
        topicLabelHe
      ) {
        strengthUnits.push({
          subject: sid,
          topic: topicKey,
          topicLabelHe,
          accuracyPct: accuracy,
          answers,
        });
      }
    }

    if (topicUnitsForSubject.length > 0) continue;

    const subjAnswers = safeNum(subj.diagnosticAnswers ?? subj.answers);
    const subjAcc = safeNum(subj.diagnosticAccuracy ?? subj.accuracy);
    if (subjAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL) continue;
    if (subjAcc >= ON_TRACK_MIN_ACCURACY) continue;
    if (subjAcc >= LOW_ACCURACY_THRESHOLD && !gapBySubject.has(sid)) continue;

    const gap = gapBySubject.get(sid);
    const hasGap =
      gap &&
      gap.droppedAnswerCount >= MIN_ANSWERS_FOR_TOPIC_SIGNAL;
    const weakWithNoTopics =
      subjAcc < LOW_ACCURACY_THRESHOLD &&
      Object.keys(subj.topics || {}).length === 0;
    if (!hasGap && !weakWithNoTopics && subjAcc >= LOW_ACCURACY_THRESHOLD) continue;

    const tier = deriveStudentGuidanceSeverityTier(subjAcc);
    const wrongCount = safeNum(subj.wrong);
    const subjLabel = subjectLabelHe(sid) || sid;
    recommendationUnits.push({
      unitId: `${sid}::__subject_fallback`,
      scope: "individual",
      level: "subject",
      subject: sid,
      subjectLabelHe: subjLabel,
      topic: null,
      topicLabelHe: null,
      subtopic: null,
      taxonomyId: null,
      subtopicLabelHe: null,
      reason: "low_subject_accuracy_no_mapped_topic",
      guidanceSeverityTier: tier,
      severity: tierToDiagnosticSeverity(tier),
      confidence: "moderate",
      classificationGap: true,
      classificationGapReasons: gap ? [...gap.reasons] : ["missing_topic"],
      evidenceSummary: {
        wrongCount,
        totalAnswers: subjAnswers,
        accuracyPct: subjAcc,
        sessionCount: safeNum(subj.sessions) || null,
        droppedTopicAnswerCount: gap?.droppedAnswerCount ?? 0,
      },
      recentMistakeExamples: [],
      classContext: null,
      recommendedActionType: STUDENT_SUBJECT_FALLBACK_ACTION,
      suggestedAssignmentType: "short_diagnostic",
      interventionPlan: null,
      sourceUnit: "subject_accuracy_fallback",
      headlineHe: formatStudentSubjectFallbackHeadlineHe(subjLabel),
      actionHe: formatStudentSubjectFallbackActionHe(),
    });
  }

  sortRecommendationUnits(recommendationUnits);

  strengthUnits.sort((a, b) => safeNum(b.accuracyPct) - safeNum(a.accuracyPct));
  base.recommendationUnits = recommendationUnits.slice(0, 5);
  base.strengthUnits = strengthUnits.slice(0, 5);
  base.supportSuggestionsV2 = buildSupportSuggestionsV2FromUnits(base.recommendationUnits);
  base.classificationGapSummary = buildClassificationGapSummary(gapBySubject, subjects);
  base.competitiveContext =
    sanitizedPayload?.competitiveContext &&
    typeof sanitizedPayload.competitiveContext === "object"
      ? sanitizedPayload.competitiveContext
      : null;
  base.positiveEvidence =
    sanitizedPayload?.positiveEvidence &&
    typeof sanitizedPayload.positiveEvidence === "object"
      ? sanitizedPayload.positiveEvidence
      : null;

  return base;
}

/**
 * @param {import('./teacher-recommendations.server.js').buildClassTeacherGuidance extends Function ? Parameters<typeof buildClassTeacherGuidance>[0] : never} classPayload
 * @param {{ subjectScope?: string|null, studentPayloads?: Array<Record<string, unknown>> }} [opts]
 */
export function buildClassTeacherGuidanceV2(classPayload, opts = {}) {
  const { subjectScope = null, studentPayloads = [] } = opts;
  const v1 = buildClassTeacherGuidance(classPayload);
  const generatedAt = new Date().toISOString();

  const roster = classPayload?.roster || {};
  const cohortSummary = classPayload?.cohortSummary || {};
  const activeMemberCount = safeNum(roster.activeMemberCount);
  const totalAnswers = safeNum(cohortSummary.diagnosticAnswers ?? cohortSummary.totalAnswers);
  const studentsWithActivity = safeNum(cohortSummary.studentsWithActivity);
  const cohortAccuracy = safeNum(cohortSummary.diagnosticAccuracy ?? cohortSummary.accuracy);
  const hasCohortData = totalAnswers > 0 && Number.isFinite(cohortAccuracy);

  const cohortTier =
    v1.guidanceSeverityTier ??
    (hasCohortData ? deriveClassGuidanceSeverityTier(cohortAccuracy, { hasData: true }) : null);

  const base = {
    ...v1,
    version: "v2",
    generatedAt,
    subjectScope: subjectScope || null,
    guidanceSeverityTier: v1.insufficientData ? null : cohortTier,
    classRecommendationUnits: [],
    smallGroupClusters: [],
    cohortStats: {
      totalStudents: activeMemberCount,
      studentsWithActivity,
      totalAnswers,
      accuracyPct: cohortAccuracy,
      classHealthSignal: v1.teacherSummary?.classHealthSignal || "no_data",
      guidanceSeverityTier: v1.insufficientData ? null : cohortTier,
    },
  };

  if (v1.insufficientData) {
    return base;
  }

  const classSubjects = classPayload?.subjects || {};
  const weaknessTopics = Array.isArray(classPayload?.weaknessTopics)
    ? classPayload.weaknessTopics
    : [];
  /** @type {Map<string, { reasons: Set<string>, droppedAnswerCount: number }>} */
  const classGapBySubject = new Map();

  const studentNameById = new Map();
  for (const entry of studentPayloads) {
    const id = entry?.studentId;
    if (!id) continue;
    studentNameById.set(
      id,
      entry.studentFullNameMasked ||
        teacherStudentDisplayName(entry.studentFullName || "") ||
        "ילד/ה"
    );
  }

  const classRecommendationUnits = [];

  for (const wt of weaknessTopics) {
    const subject = wt.subject;
    const topic = wt.topic;
    if (subjectScope && subject !== subjectScope) continue;
    const wtAnswers = safeNum(wt.answers);
    const dropReason = classifyDroppedTopicReason(subject, topic);
    if (dropReason) {
      if (wtAnswers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
        recordDroppedTopic(classGapBySubject, subject, dropReason, wtAnswers);
      }
      continue;
    }
    const topicLabelHe = resolveTopicLabelHe(subject, topic);
    if (!topicLabelHe) {
      if (wtAnswers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
        recordDroppedTopic(classGapBySubject, subject, "unmapped_topic", wtAnswers);
      }
      continue;
    }

    const answers = safeNum(wt.answers);
    const wrongCount = safeNum(wt.wrong);
    const affectedStudentCount = safeNum(wt.studentCount);
    const affectedFraction =
      activeMemberCount > 0 ? affectedStudentCount / activeMemberCount : 0;
    const cohortAccuracyPct =
      answers > 0 ? Number((((answers - wrongCount) / answers) * 100).toFixed(1)) : 0;

    const candidateIds = taxonomyIdsForReportBucket(subject, topic) || [];
    let taxonomyId = null;
    for (const id of candidateIds) {
      const row = TAXONOMY_BY_ID[id];
      if (row && wrongCount >= row.minWrong) {
        taxonomyId = id;
        break;
      }
    }
    const taxonomyRow = taxonomyId ? TAXONOMY_BY_ID[taxonomyId] : null;

    const recommendedActionType = resolveClassRecommendedActionType(
      affectedStudentCount,
      affectedFraction
    );

    const severity = resolvePriority("moderate", "medium", {
      sharpDecline: false,
      crossSubjectContradiction: false,
    });

    classRecommendationUnits.push({
      unitId: `${subject}::${topic}`,
      scope: affectedFraction >= 0.4 ? "class" : affectedStudentCount <= 5 ? "small_group" : "class",
      level: "topic",
      subject,
      topic,
      guidanceSeverityTier: deriveClassGuidanceSeverityTier(cohortAccuracyPct, {
        hasData: answers > 0,
      }),
      subtopic: taxonomyId || null,
      taxonomyId,
      topicLabelHe,
      subtopicLabelHe: taxonomyRow?.subskillHe || null,
      severity,
      affectedStudentCount,
      affectedStudentIds: Array.isArray(wt.studentIds) ? [...wt.studentIds] : [],
      affectedFraction: Number(affectedFraction.toFixed(2)),
      cohortWrongCount: wrongCount,
      cohortAnswers: answers,
      cohortAccuracyPct,
      recommendedActionType,
      suggestedAssignmentType: suggestedAssignmentType(recommendedActionType),
      interventionPlan: taxonomyId ? buildInterventionPlan(taxonomyId) : null,
    });
  }

  const subjectsToCheck = subjectScope
    ? [subjectScope]
    : REPORT_AGG_SUBJECTS.filter((s) => classSubjects[s]);

  for (const sid of subjectsToCheck) {
    const hasTopicUnit = classRecommendationUnits.some(
      (u) => u.subject === sid && u.level === "topic" && u.topic
    );
    if (hasTopicUnit) continue;

    const subj = classSubjects[sid];
    if (!subj || typeof subj !== "object") {
      if (subjectScope) {
        const acc = cohortAccuracy;
        if (
          acc < LOW_ACCURACY_THRESHOLD &&
          totalAnswers >= MIN_CLASS_ANSWERS_FOR_GUIDANCE &&
          studentsWithActivity > 0
        ) {
          addClassSubjectFallback(classRecommendationUnits, {
            subject: sid,
            cohortAccuracyPct: acc,
            cohortAnswers: totalAnswers,
            cohortWrongCount: Math.round(totalAnswers * (1 - acc / 100)),
            affectedStudentCount: studentsWithActivity,
            gapReasons: classGapBySubject.get(sid)?.reasons || ["missing_topic"],
          });
        }
      }
      continue;
    }

    const subjAnswers = safeNum(subj.diagnosticAnswers ?? subj.answers);
    const subjAcc = safeNum(subj.diagnosticAccuracy ?? subj.accuracy);
    if (subjAnswers < MIN_ANSWERS_FOR_TOPIC_SIGNAL) continue;
    if (subjAcc >= ON_TRACK_MIN_ACCURACY) continue;

    const gap = classGapBySubject.get(sid);
    const hasGap =
      gap && gap.droppedAnswerCount >= MIN_ANSWERS_FOR_TOPIC_SIGNAL;
    if (subjAcc >= LOW_ACCURACY_THRESHOLD && !hasGap) continue;

    addClassSubjectFallback(classRecommendationUnits, {
      subject: sid,
      cohortAccuracyPct: subjAcc,
      cohortAnswers: subjAnswers,
      cohortWrongCount: safeNum(subj.wrong),
      affectedStudentCount: studentsWithActivity,
      gapReasons: gap ? [...gap.reasons] : ["missing_topic"],
    });
  }

  if (
    classRecommendationUnits.length === 0 &&
    cohortAccuracy < LOW_ACCURACY_THRESHOLD &&
    totalAnswers >= MIN_CLASS_ANSWERS_FOR_GUIDANCE &&
    studentsWithActivity > 0
  ) {
    const scopeSubj = subjectScope || REPORT_AGG_SUBJECTS.find((s) => classSubjects[s]) || "math";
    addClassSubjectFallback(classRecommendationUnits, {
      subject: scopeSubj,
      cohortAccuracyPct: cohortAccuracy,
      cohortAnswers: totalAnswers,
      cohortWrongCount: Math.round(totalAnswers * (1 - cohortAccuracy / 100)),
      affectedStudentCount: studentsWithActivity,
      gapReasons: ["missing_topic"],
    });
  }

  classRecommendationUnits.sort(
    (a, b) => {
      const levelA = a.level === "subject" ? 1 : 0;
      const levelB = b.level === "subject" ? 1 : 0;
      if (levelA !== levelB) return levelA - levelB;
      return (
        b.cohortWrongCount - a.cohortWrongCount ||
        b.affectedStudentCount - a.affectedStudentCount
      );
    }
  );

  const smallGroupClusters = [];
  for (const unit of classRecommendationUnits) {
    if (unit.recommendedActionType !== "small_group" || !unit.topicLabelHe) continue;
    const ids = unit.affectedStudentIds || [];
    const accuracies = [];
    for (const sid of ids) {
      const entry = studentPayloads.find((e) => e.studentId === sid);
      const summary = entry?.payload?.summary;
      const ans = safeNum(summary?.diagnosticAnswers ?? summary?.totalAnswers);
      const acc = ans > 0 ? safeNum(summary?.diagnosticAccuracy ?? summary?.accuracy) : null;
      if (acc != null) accuracies.push(acc);
    }
    const avgAccuracyPct =
      accuracies.length > 0
        ? Number((accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(1))
        : null;

    smallGroupClusters.push({
      clusterReason: `${unit.topic}_struggling`,
      subject: unit.subject,
      topic: unit.topic,
      topicLabelHe: unit.topicLabelHe,
      studentIds: ids,
      studentNamesMasked: ids.map((id) => studentNameById.get(id) || "ילד/ה"),
      avgAccuracyPct,
      recommendedActionType: "small_group",
    });
  }

  base.classRecommendationUnits = classRecommendationUnits.slice(0, 10);
  base.smallGroupClusters = smallGroupClusters.slice(0, 5);
  base.classificationGapSummary = buildClassificationGapSummary(classGapBySubject, classSubjects);
  base.cohortStats.classHealthSignal = mapClassHealthSignalFromTier(cohortTier);
  base.cohortStats.guidanceSeverityTier = cohortTier;
  if (base.teacherSummary) {
    base.teacherSummary.classHealthSignal = base.cohortStats.classHealthSignal;
    base.teacherSummary.guidanceSeverityTier = cohortTier;
  }

  return base;
}

/**
 * @param {Array<Record<string, unknown>>} units
 * @param {object} p
 */
function addClassSubjectFallback(units, p) {
  const subjLabel = subjectLabelHe(p.subject) || p.subject;
  const tier = deriveClassGuidanceSeverityTier(p.cohortAccuracyPct, {
    hasData: Number(p.cohortAnswers) > 0,
  });
  units.push({
    unitId: `${p.subject}::__class_subject_fallback`,
    scope: "class",
    level: "subject",
    subject: p.subject,
    subjectLabelHe: subjLabel,
    topic: null,
    topicLabelHe: null,
    reason: "low_class_subject_accuracy_no_mapped_topic",
    guidanceSeverityTier: tier,
    severity: tierToDiagnosticSeverity(tier),
    affectedStudentCount: p.affectedStudentCount,
    affectedStudentIds: [],
    affectedFraction: null,
    cohortWrongCount: p.cohortWrongCount,
    cohortAnswers: p.cohortAnswers,
    cohortAccuracyPct: p.cohortAccuracyPct,
    classificationGap: true,
    classificationGapReasons: p.gapReasons,
    recommendedActionType: CLASS_SUBJECT_FALLBACK_ACTION,
    suggestedAssignmentType: suggestedAssignmentType(CLASS_SUBJECT_FALLBACK_ACTION),
    interventionPlan: null,
    headlineHe: formatClassSubjectFallbackHeadlineHe(subjLabel),
    actionHe: formatClassSubjectFallbackActionHe(),
  });
}

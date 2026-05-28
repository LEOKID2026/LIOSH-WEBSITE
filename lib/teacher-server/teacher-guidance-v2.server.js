/**
 * Teacher Guidance V2 — evidence-based recommendations (server-side).
 * Imports diagnostic sub-utilities only; does not run full runDiagnosticEngineV2.
 */

import { REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";
import { topicBucketLabelHe } from "../../utils/diagnostic-labels-he.js";
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
} from "./teacher-recommendations.server.js";
import { maskStudentFullName } from "./teacher-students.server.js";

const LOW_ACCURACY_THRESHOLD = 60;
const STRENGTH_THRESHOLD = 80;
const MIN_ANSWERS_FOR_TOPIC_SIGNAL = 3;
const MIN_ANSWERS_FOR_STUDENT_SIGNAL = 5;
const PRIORITY_ORDER = { P4: 0, P3: 1, P2: 2, P1: 3 };
const TOPIC_GRADE_SEP = "::grade:";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function subjectIdForLabels(subject) {
  if (subject === "moledet_geography") return "moledet-geography";
  return String(subject || "");
}

/**
 * @param {string|null|undefined} topicKey
 */
export function normalizeTopicKeyForLabel(topicKey) {
  if (topicKey == null) return "";
  const k = String(topicKey).trim();
  if (!k) return "";
  const i = k.indexOf(TOPIC_GRADE_SEP);
  return i === -1 ? k : k.slice(0, i);
}

/**
 * @param {string|null|undefined} topicKey
 */
export function isTeacherRecommendableTopicKey(topicKey) {
  const base = normalizeTopicKeyForLabel(topicKey);
  if (!base) return false;
  return base.toLowerCase() !== "general";
}

/**
 * @param {string} subject
 * @param {string|null|undefined} topicKey
 * @returns {string|null} Approved Hebrew label, or null when not teacher-displayable.
 */
export function resolveTopicLabelHe(subject, topicKey) {
  if (!isTeacherRecommendableTopicKey(topicKey)) return null;
  const baseKey = normalizeTopicKeyForLabel(topicKey);
  const sid = subjectIdForLabels(subject);
  let label = topicBucketLabelHe(sid, topicKey);
  if (!label || label === "נושא זה" || label === baseKey || label === String(topicKey)) {
    label = topicBucketLabelHe(sid, baseKey);
  }
  if (!label || label === "נושא זה" || label === baseKey) return null;
  return label;
}

/**
 * @param {Array<Record<string, unknown>>} units
 */
function buildSupportSuggestionsV2FromUnits(units) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();
  for (const u of units) {
    if (!u?.topicLabelHe || !isTeacherRecommendableTopicKey(u.topic)) continue;
    const dedupeKey = `${u.recommendedActionType}::${u.subject}::${u.topic}`;
    const existing = byKey.get(dedupeKey);
    if (!existing) {
      byKey.set(dedupeKey, u);
      continue;
    }
    const pa = PRIORITY_ORDER[u.severity] ?? 9;
    const pb = PRIORITY_ORDER[existing.severity] ?? 9;
    const accU = safeNum(u.evidenceSummary?.accuracyPct);
    const accE = safeNum(existing.evidenceSummary?.accuracyPct);
    if (pa < pb || (pa === pb && accU < accE)) {
      byKey.set(dedupeKey, u);
    }
  }
  return [...byKey.values()].map((u) => ({
    code: u.recommendedActionType,
    subject: u.subject,
    topic: u.topic,
    topicLabelHe: u.topicLabelHe,
  }));
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
  base.riskLevel = v1.teacherGuidance?.riskLevel || "low";

  const recommendationUnits = [];
  const strengthUnits = [];

  for (const sid of subjectsToIterate(permittedSubjects)) {
    const subj = subjects[sid];
    if (!subj || typeof subj !== "object") continue;

    for (const [topicKey, topicData] of Object.entries(subj.topics || {})) {
      if (!topicData || typeof topicData !== "object") continue;
      if (!isTeacherRecommendableTopicKey(topicKey)) continue;
      const topicLabelHe = resolveTopicLabelHe(sid, topicKey);
      if (!topicLabelHe) continue;
      const answers = safeNum(topicData.answers);
      const wrongCount = safeNum(topicData.wrong);
      const correct = safeNum(topicData.correct);
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

        recommendationUnits.push({
          unitId: `${sid}::${topicKey}`,
          scope: "individual",
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
        });
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
  }

  recommendationUnits.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.severity] ?? 9;
    const pb = PRIORITY_ORDER[b.severity] ?? 9;
    if (pa !== pb) return pa - pb;
    return (
      safeNum(a.evidenceSummary?.accuracyPct) - safeNum(b.evidenceSummary?.accuracyPct)
    );
  });

  strengthUnits.sort((a, b) => safeNum(b.accuracyPct) - safeNum(a.accuracyPct));
  base.recommendationUnits = recommendationUnits.slice(0, 5);
  base.strengthUnits = strengthUnits.slice(0, 5);
  base.supportSuggestionsV2 = buildSupportSuggestionsV2FromUnits(base.recommendationUnits);

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
  const totalAnswers = safeNum(cohortSummary.totalAnswers);
  const studentsWithActivity = safeNum(cohortSummary.studentsWithActivity);
  const cohortAccuracy = safeNum(cohortSummary.accuracy);

  const base = {
    ...v1,
    version: "v2",
    generatedAt,
    subjectScope: subjectScope || null,
    classRecommendationUnits: [],
    smallGroupClusters: [],
    cohortStats: {
      totalStudents: activeMemberCount,
      studentsWithActivity,
      totalAnswers,
      accuracyPct: cohortAccuracy,
      classHealthSignal: v1.teacherSummary?.classHealthSignal || "no_data",
    },
  };

  if (v1.insufficientData) {
    return base;
  }

  const weaknessTopics = Array.isArray(classPayload?.weaknessTopics)
    ? classPayload.weaknessTopics
    : [];

  const studentNameById = new Map();
  for (const entry of studentPayloads) {
    const id = entry?.studentId;
    if (!id) continue;
    studentNameById.set(
      id,
      entry.studentFullNameMasked ||
        maskStudentFullName(entry.studentFullName || "") ||
        "תלמיד"
    );
  }

  const classRecommendationUnits = [];

  for (const wt of weaknessTopics) {
    const subject = wt.subject;
    const topic = wt.topic;
    if (subjectScope && subject !== subjectScope) continue;
    if (!isTeacherRecommendableTopicKey(topic)) continue;
    const topicLabelHe = resolveTopicLabelHe(subject, topic);
    if (!topicLabelHe) continue;

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
      subject,
      topic,
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

  classRecommendationUnits.sort(
    (a, b) => b.cohortWrongCount - a.cohortWrongCount || b.affectedStudentCount - a.affectedStudentCount
  );

  const smallGroupClusters = [];
  for (const unit of classRecommendationUnits) {
    if (unit.recommendedActionType !== "small_group" || !unit.topicLabelHe) continue;
    const ids = unit.affectedStudentIds || [];
    const accuracies = [];
    for (const sid of ids) {
      const entry = studentPayloads.find((e) => e.studentId === sid);
      const summary = entry?.payload?.summary;
      const ans = safeNum(summary?.totalAnswers);
      const acc = ans > 0 ? safeNum(summary?.accuracy) : null;
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
      studentNamesMasked: ids.map((id) => studentNameById.get(id) || "תלמיד"),
      avgAccuracyPct,
      recommendedActionType: "small_group",
    });
  }

  base.classRecommendationUnits = classRecommendationUnits.slice(0, 10);
  base.smallGroupClusters = smallGroupClusters.slice(0, 5);

  return base;
}

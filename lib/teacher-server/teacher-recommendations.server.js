/**
 * Deterministic teacher recommendation / guidance layer.
 *
 * No LLM. No SQL. No external calls.
 * All logic is derived purely from the aggregated report data already
 * produced by Phase 6 (single-student) and Phase 7 (class) pipelines.
 *
 * English developer keys only. Hebrew copy deferred to a later UI phase.
 */

import { REPORT_AGG_SUBJECTS } from "../parent-server/report-data-aggregate.server.js";

// ── thresholds ────────────────────────────────────────────────────────────────

export const GUIDANCE_TIER_THRESHOLDS = {
  CRITICAL_MAX: 49,
  NEEDS_REINFORCEMENT_MAX: 64,
  MONITOR_MAX: 74,
};

export const LOW_ACCURACY_THRESHOLD = 65;
export const STRENGTH_THRESHOLD = 80;
export const ATTENTION_ACCURACY_THRESHOLD = 65;
export const ATTENTION_PRIORITY_BOOST_THRESHOLD = 50;
export const ON_TRACK_MIN_ACCURACY = 75;

export const MIN_ANSWERS_FOR_STUDENT_SIGNAL = 5;
export const MIN_ANSWERS_FOR_TOPIC_SIGNAL = 3;
export const MIN_CLASS_ANSWERS_FOR_GUIDANCE = 10;
const INACTIVITY_DAYS_THRESHOLD = 7;
const MIN_STUDENT_ANSWERS_FOR_GROUP = 3;
const MAX_PRIORITY_TOPICS = 5;
const MAX_GROUPS_PER_TIER = 10;
const MAX_RECENT_MISTAKES_SUBJECTS = 3;

/**
 * @param {number|null|undefined} accuracyPct
 * @returns {"critical"|"needs_reinforcement"|"monitor"|"on_track"}
 */
export function deriveStudentGuidanceSeverityTier(accuracyPct) {
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "monitor";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.CRITICAL_MAX) return "critical";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.NEEDS_REINFORCEMENT_MAX) return "needs_reinforcement";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.MONITOR_MAX) return "monitor";
  return "on_track";
}

/**
 * @param {number|null|undefined} accuracyPct
 * @param {{ hasData?: boolean }} [opts]
 * @returns {"critical_class"|"class_needs_reinforcement"|"class_monitor"|"class_on_track"|null}
 */
export function deriveClassGuidanceSeverityTier(accuracyPct, opts = {}) {
  const hasData = opts.hasData ?? true;
  if (!hasData) return null;
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return null;
  if (acc <= GUIDANCE_TIER_THRESHOLDS.CRITICAL_MAX) return "critical_class";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.NEEDS_REINFORCEMENT_MAX) return "class_needs_reinforcement";
  if (acc <= GUIDANCE_TIER_THRESHOLDS.MONITOR_MAX) return "class_monitor";
  return "class_on_track";
}

/**
 * @param {"critical_class"|"class_needs_reinforcement"|"class_monitor"|"class_on_track"|null|undefined} tier
 */
export function mapClassHealthSignalFromTier(tier) {
  if (tier == null) return "no_data";
  const map = {
    critical_class: "critical_class",
    class_needs_reinforcement: "needs_reinforcement",
    class_monitor: "monitor",
    class_on_track: "strong",
  };
  return map[tier] || "no_data";
}

/**
 * @param {"critical"|"needs_reinforcement"|"monitor"|"on_track"} tier
 * @returns {"high"|"moderate"|"low"}
 */
export function mapRiskLevelFromTier(tier) {
  if (tier === "critical") return "high";
  if (tier === "needs_reinforcement" || tier === "monitor") return "moderate";
  return "low";
}

// ── shared helpers ────────────────────────────────────────────────────────────

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function daysSince(isoDateString) {
  if (!isoDateString) return null;
  const diff = Date.now() - new Date(isoDateString).getTime();
  return Number.isFinite(diff) ? Math.floor(diff / 86_400_000) : null;
}

/**
 * Find the last activity date from a dailyActivity array.
 * @param {Array<{date:string}>} daily
 * @returns {string|null}
 */
function lastActivityDate(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return null;
  const sorted = [...daily].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0]?.date || null;
}

/**
 * Rank weak topics from a subjects map.
 * Returns topics sorted by (low accuracy + enough answers), most urgent first.
 * @param {Record<string, unknown>} subjects
 * @param {number} minAnswers
 * @returns {Array<{subject:string, topic:string, accuracy:number, wrong:number, answers:number}>}
 */
function rankWeakTopics(subjects, minAnswers = MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
  const weak = [];
  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (!subj || typeof subj !== "object") continue;
    for (const [topicKey, topicData] of Object.entries(subj.topics || {})) {
      if (!topicData || typeof topicData !== "object") continue;
      const answers = safeNum(topicData.diagnosticAnswers ?? topicData.answers);
      const accuracy = safeNum(topicData.diagnosticAccuracy ?? topicData.accuracy);
      if (answers >= minAnswers && accuracy < LOW_ACCURACY_THRESHOLD) {
        weak.push({
          subject,
          topic: topicKey,
          accuracy,
          wrong: safeNum(topicData.diagnosticWrong ?? topicData.wrong),
          answers,
        });
      }
    }
  }
  return weak.sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);
}

/**
 * Rank strong topics (student mastery areas).
 */
function rankStrongTopics(subjects, minAnswers = MIN_ANSWERS_FOR_TOPIC_SIGNAL) {
  const strong = [];
  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (!subj || typeof subj !== "object") continue;
    for (const [topicKey, topicData] of Object.entries(subj.topics || {})) {
      if (!topicData || typeof topicData !== "object") continue;
      const answers = safeNum(topicData.diagnosticAnswers ?? topicData.answers);
      const accuracy = safeNum(topicData.diagnosticAccuracy ?? topicData.accuracy);
      if (answers >= minAnswers && accuracy >= STRENGTH_THRESHOLD) {
        strong.push({ subject, topic: topicKey, accuracy, answers });
      }
    }
  }
  return strong.sort((a, b) => b.accuracy - a.accuracy || b.answers - a.answers);
}

/**
 * Extract top mistake subjects from recentMistakes array (already in sanitized payload).
 */
function topMistakeSubjects(recentMistakes) {
  if (!Array.isArray(recentMistakes) || recentMistakes.length === 0) return [];
  const counts = new Map();
  for (const m of recentMistakes) {
    const s = m?.subject;
    if (typeof s === "string" && s) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_RECENT_MISTAKES_SUBJECTS)
    .map(([subject, count]) => ({ subject, count }));
}

// ── SINGLE-STUDENT guidance ───────────────────────────────────────────────────

/**
 * Build teacher guidance for a single linked student.
 *
 * @param {Record<string, unknown>} sanitizedPayload — output of sanitizeReportPayloadForTeacher
 * @returns {{ insufficientData: boolean, nextPracticeFocus: object[], riskSignals: string[], strengthsForTeacher: object[], supportSuggestions: string[], teacherGuidance: object }}
 */
export function buildStudentTeacherGuidance(sanitizedPayload) {
  const summary = sanitizedPayload?.summary;
  const subjects = sanitizedPayload?.subjects;
  const dailyActivity = sanitizedPayload?.dailyActivity;
  const recentMistakes = sanitizedPayload?.recentMistakes;

  const totalAnswers = safeNum(summary?.diagnosticAnswers ?? summary?.totalAnswers);
  const totalSessions = safeNum(summary?.totalSessions);
  const accuracy = totalAnswers > 0 ? safeNum(summary?.diagnosticAccuracy ?? summary?.accuracy) : null;

  const insufficientData =
    totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL && totalSessions < 2;

  if (insufficientData) {
    return {
      insufficientData: true,
      teacherGuidance: { reason: "not_enough_activity" },
      nextPracticeFocus: [],
      riskSignals: totalSessions === 0 && totalAnswers === 0
        ? ["never_active_in_range"]
        : ["insufficient_answers"],
      strengthsForTeacher: [],
      supportSuggestions: [],
    };
  }

  // ── risk signals ──────────────────────────────────────────────────────────
  const riskSignals = [];

  const lastDate = lastActivityDate(dailyActivity);
  const inactiveDays = daysSince(lastDate);
  if (inactiveDays !== null && inactiveDays >= INACTIVITY_DAYS_THRESHOLD) {
    riskSignals.push("inactive_recent_days");
  } else if (totalSessions === 0) {
    riskSignals.push("no_sessions_in_range");
  }

  if (accuracy !== null && accuracy < LOW_ACCURACY_THRESHOLD && totalAnswers >= MIN_ANSWERS_FOR_STUDENT_SIGNAL) {
    riskSignals.push("low_overall_accuracy");
  }

  if (Array.isArray(recentMistakes) && recentMistakes.length >= 5) {
    riskSignals.push("many_recent_mistakes");
  }

  // ── weak topics → next practice focus ─────────────────────────────────────
  const weakTopics = rankWeakTopics(subjects);
  const nextPracticeFocus = weakTopics.slice(0, 5).map((t) => ({
    subject: t.subject,
    topic: t.topic,
    accuracy: t.accuracy,
    wrong: t.wrong,
    answers: t.answers,
    signal: "low_accuracy_topic",
  }));

  // Fallback: if no weak topics but subject-level accuracy is low
  if (nextPracticeFocus.length === 0 && accuracy !== null && accuracy < LOW_ACCURACY_THRESHOLD) {
    for (const subject of REPORT_AGG_SUBJECTS) {
      const subj = subjects?.[subject];
      if (!subj || typeof subj !== "object") continue;
      const subjAnswers = safeNum(subj.diagnosticAnswers ?? subj.answers);
      const subjAcc = safeNum(subj.diagnosticAccuracy ?? subj.accuracy);
      if (subjAnswers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && subjAcc < LOW_ACCURACY_THRESHOLD) {
        nextPracticeFocus.push({
          subject,
          topic: null,
          accuracy: subjAcc,
          wrong: safeNum(subj.diagnosticWrong ?? subj.wrong),
          answers: subjAnswers,
          signal: "low_accuracy_subject",
        });
      }
    }
  }

  // ── strengths ─────────────────────────────────────────────────────────────
  const strongTopics = rankStrongTopics(subjects);
  const strengthsForTeacher = strongTopics.slice(0, 5).map((t) => ({
    subject: t.subject,
    topic: t.topic,
    accuracy: t.accuracy,
    answers: t.answers,
    signal: "mastered_topic",
  }));

  // ── support suggestions (machine codes) ───────────────────────────────────
  const supportSuggestions = [];
  if (riskSignals.includes("low_overall_accuracy")) {
    supportSuggestions.push("review_fundamentals");
  }
  if (riskSignals.includes("many_recent_mistakes")) {
    const topSubjects = topMistakeSubjects(recentMistakes);
    for (const s of topSubjects.slice(0, 2)) {
      supportSuggestions.push(`targeted_review:${s.subject}`);
    }
  }
  if (riskSignals.includes("inactive_recent_days") || riskSignals.includes("no_sessions_in_range")) {
    supportSuggestions.push("encourage_session_start");
  }
  if (nextPracticeFocus.length > 0 && !supportSuggestions.includes("review_fundamentals")) {
    supportSuggestions.push(`focus_practice:${nextPracticeFocus[0].subject}`);
  }

  let guidanceSeverityTier = deriveStudentGuidanceSeverityTier(accuracy);
  if (
    guidanceSeverityTier === "monitor" &&
    riskSignals.includes("inactive_recent_days")
  ) {
    guidanceSeverityTier = "needs_reinforcement";
  }

  return {
    insufficientData: false,
    guidanceSeverityTier,
    teacherGuidance: {
      overallAccuracy: accuracy,
      totalAnswers,
      lastActivityDate: lastDate,
      inactiveDays,
      riskLevel: mapRiskLevelFromTier(guidanceSeverityTier),
    },
    nextPracticeFocus,
    riskSignals,
    strengthsForTeacher,
    supportSuggestions,
  };
}

// ── CLASS guidance ────────────────────────────────────────────────────────────

const EMPTY_CLASS_GUIDANCE = Object.freeze({
  insufficientData: true,
  teacherSummary: { reason: "no_active_members" },
  nextLessonFocus: [],
  suggestedGroups: { struggling: [], on_track: [], advanced: [] },
  priorityTopics: [],
  attentionStudents: [],
  reinforcementSuggestions: [],
  extensionSuggestions: [],
});

/**
 * Derive differentiation groups from per-student summaries.
 * @param {Array<{studentId:string, studentFullNameMasked:string, summary:Record<string,unknown>|null}>} students
 */
function buildSuggestedGroups(students) {
  const struggling = [];
  const on_track = [];
  const advanced = [];

  for (const s of students) {
    const summary = s.summary && typeof s.summary === "object" ? s.summary : null;
    const answers = safeNum(summary?.diagnosticAnswers ?? summary?.totalAnswers);
    const accuracy = answers > 0 ? safeNum(summary?.diagnosticAccuracy ?? summary?.accuracy) : null;

    const item = {
      studentId: s.studentId,
      studentFullNameMasked: s.studentFullNameMasked,
      accuracy,
      totalAnswers: answers,
    };

    if (accuracy === null || answers < MIN_STUDENT_ANSWERS_FOR_GROUP) {
      // not enough data to group — still worth showing in struggling if no activity
      if (answers === 0) {
        item.groupReason = "no_activity_in_range";
        struggling.push(item);
      }
      continue;
    }

    if (accuracy < LOW_ACCURACY_THRESHOLD) {
      item.groupReason = "low_accuracy";
      struggling.push(item);
    } else if (accuracy >= ON_TRACK_MIN_ACCURACY) {
      item.groupReason = "high_accuracy";
      advanced.push(item);
    } else {
      item.groupReason = "expected_progress";
      on_track.push(item);
    }
  }

  const sort = (arr) => arr.sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1));

  return {
    struggling: sort(struggling).slice(0, MAX_GROUPS_PER_TIER),
    on_track: on_track.slice(0, MAX_GROUPS_PER_TIER),
    advanced: advanced.slice(0, MAX_GROUPS_PER_TIER).reverse(),
  };
}

/**
 * Build teacher guidance for a class.
 *
 * @param {{
 *   cohortSummary: Record<string, unknown>,
 *   subjects: Record<string, unknown>,
 *   weaknessTopics: Array<{subject:string, topic:string, wrong:number, answers:number, studentCount:number}>,
 *   attentionList: Array<{studentId:string, studentFullNameMasked:string, attentionScore:number, reasons:string[], accuracy:number|null, totalAnswers:number}>,
 *   students: Array<{studentId:string, studentFullNameMasked:string, membershipId:string, summary:Record<string,unknown>|null, guardianAccessSummary:object|null}>,
 *   roster: { studentCount:number, activeMemberCount:number },
 * }} classPayload
 */
export function buildClassTeacherGuidance(classPayload) {
  const { cohortSummary, subjects, weaknessTopics, attentionList, students, roster } = classPayload;

  if (!roster?.activeMemberCount || roster.activeMemberCount === 0) {
    return { ...EMPTY_CLASS_GUIDANCE };
  }

  const totalAnswers = safeNum(cohortSummary?.diagnosticAnswers ?? cohortSummary?.totalAnswers);
  const studentsWithActivity = safeNum(cohortSummary?.studentsWithActivity);
  const cohortAccuracy = totalAnswers > 0 ? safeNum(cohortSummary?.diagnosticAccuracy ?? cohortSummary?.accuracy) : null;
  const totalStudents = safeNum(roster.activeMemberCount);
  const hasCohortData = totalAnswers > 0 && cohortAccuracy !== null;

  // Insufficient if very little class-wide data
  if (totalAnswers < MIN_CLASS_ANSWERS_FOR_GUIDANCE && studentsWithActivity === 0) {
    return {
      insufficientData: true,
      teacherSummary: { reason: "no_class_activity" },
      nextLessonFocus: [],
      suggestedGroups: { struggling: [], on_track: [], advanced: [] },
      priorityTopics: [],
      attentionStudents: attentionList.slice(0, 10),
      reinforcementSuggestions: [],
      extensionSuggestions: [],
    };
  }

  // ── teacherSummary ─────────────────────────────────────────────────────────
  const percentActive =
    totalStudents > 0 ? Number(((studentsWithActivity / totalStudents) * 100).toFixed(1)) : 0;

  const guidanceSeverityTier = hasCohortData
    ? deriveClassGuidanceSeverityTier(cohortAccuracy, { hasData: true })
    : null;
  const classHealthSignal = hasCohortData
    ? mapClassHealthSignalFromTier(guidanceSeverityTier)
    : "no_data";

  const teacherSummary = {
    cohortAccuracy,
    totalAnswers,
    totalStudents,
    studentsWithActivity,
    percentStudentsActive: percentActive,
    classHealthSignal,
    guidanceSeverityTier: cohortAccuracy === null ? null : guidanceSeverityTier,
  };

  // ── priorityTopics from weaknessTopics ─────────────────────────────────────
  const priorityTopics = (Array.isArray(weaknessTopics) ? weaknessTopics : [])
    .filter(
      (t) =>
        safeNum(t.answers) >= MIN_ANSWERS_FOR_TOPIC_SIGNAL &&
        safeNum(t.studentCount) >= 1
    )
    .slice(0, MAX_PRIORITY_TOPICS)
    .map((t) => ({
      subject: t.subject,
      topic: t.topic,
      wrong: safeNum(t.wrong),
      answers: safeNum(t.answers),
      studentCount: safeNum(t.studentCount),
      errorRate:
        safeNum(t.answers) > 0
          ? Number(((safeNum(t.wrong) / safeNum(t.answers)) * 100).toFixed(1))
          : 0,
    }));

  // ── nextLessonFocus: top 3 priority topics ─────────────────────────────────
  const nextLessonFocus = priorityTopics.slice(0, 3).map((t) => ({
    subject: t.subject,
    topic: t.topic,
    signal: "class_wide_weakness",
    affectedStudents: t.studentCount,
    errorRate: t.errorRate,
  }));

  // If no topic-level data, fall back to weakest subject
  if (nextLessonFocus.length === 0 && subjects) {
    for (const subject of REPORT_AGG_SUBJECTS) {
      const subj = subjects[subject];
      if (!subj || typeof subj !== "object") continue;
      const answers = safeNum(subj.diagnosticAnswers ?? subj.answers);
      const accuracy = safeNum(subj.diagnosticAccuracy ?? subj.accuracy);
      if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy < LOW_ACCURACY_THRESHOLD) {
        nextLessonFocus.push({
          subject,
          topic: null,
          signal: "weak_subject_no_topic_data",
          affectedStudents: null,
          errorRate: answers > 0
            ? Number(((safeNum(subj.diagnosticWrong ?? subj.wrong) / answers) * 100).toFixed(1))
            : 0,
        });
        if (nextLessonFocus.length >= 3) break;
      }
    }
  }

  // ── suggestedGroups ────────────────────────────────────────────────────────
  const suggestedGroups = buildSuggestedGroups(Array.isArray(students) ? students : []);

  // ── attentionStudents (top 10 from attentionList) ─────────────────────────
  const attentionStudents = (Array.isArray(attentionList) ? attentionList : []).slice(0, 10);

  // ── reinforcementSuggestions ───────────────────────────────────────────────
  // Topics where >= 30% of active students had wrong answers
  const reinforcementSuggestions = priorityTopics
    .filter(
      (t) =>
        totalStudents > 0 &&
        safeNum(t.studentCount) / totalStudents >= 0.3
    )
    .slice(0, 3)
    .map((t) => ({
      subject: t.subject,
      topic: t.topic,
      signal: "broad_class_gap",
      affectedFraction: Number((safeNum(t.studentCount) / totalStudents).toFixed(2)),
    }));

  // ── extensionSuggestions ───────────────────────────────────────────────────
  // Strong topic areas — subjects where cohort accuracy >= STRENGTH_THRESHOLD
  const extensionSuggestions = [];
  for (const subject of REPORT_AGG_SUBJECTS) {
    const subj = subjects?.[subject];
    if (!subj || typeof subj !== "object") continue;
    const answers = safeNum(subj.diagnosticAnswers ?? subj.answers);
    const accuracy = safeNum(subj.diagnosticAccuracy ?? subj.accuracy);
    if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy >= STRENGTH_THRESHOLD) {
      extensionSuggestions.push({
        subject,
        accuracy,
        signal: "strong_class_performance",
      });
    }
    if (extensionSuggestions.length >= 3) break;
  }

  return {
    insufficientData: false,
    guidanceSeverityTier: cohortAccuracy === null ? null : guidanceSeverityTier,
    teacherSummary,
    nextLessonFocus,
    suggestedGroups,
    priorityTopics,
    attentionStudents,
    reinforcementSuggestions,
    extensionSuggestions,
  };
}

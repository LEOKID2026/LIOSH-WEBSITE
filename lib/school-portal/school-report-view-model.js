/**
 * School manager report view models — compact Hebrew summaries from teacher report payloads.
 */

import {
  schoolActivityModeHe,
  schoolActivityStatusHe,
  schoolSubjectLabelHe,
  sanitizeActivityTitleHe,
} from "./school-ui.he.js";
import { SCHOOL_SUBJECT_ORDER } from "./school-drilldown.js";
import {
  actionTypeLabelHe,
  canShowClassCalmWeakTopicsMessage,
  canShowStudentCalmFocusMessage,
  classGuidanceSeverityTierHe,
  classHealthHe,
  CLASS_WEAK_TOPICS_FALLBACK_BANNER,
  HUB_CLASS_WEAK_TOPICS_CALM_MESSAGE,
  HUB_STUDENT_FOCUS_CALM_MESSAGE,
  dedupeTeacherRecommendationItems,
  formatStudentSubjectFallbackEvidenceHe,
  formatTopicLineHe,
  formatTopicRecommendationLineHe,
  groupTierHe,
  attentionReasonHe,
  guidanceSeverityTierHe,
  resolveTopicLabelHe,
  STUDENT_FOCUS_CALM_MESSAGE,
  STUDENT_FOCUS_FALLBACK_BANNER,
  supportSuggestionHe,
} from "../teacher-portal/teacher-ui.he.js";
import {
  classOrCohortLearningStatusLabelHe,
  deriveStudentLearningStatusLabelHe,
} from "../teacher-portal/student-learning-status.js";

export { classOrCohortLearningStatusLabelHe, deriveStudentLearningStatusLabelHe };

const SCHOOL_REPORT_SUBJECTS = [...SCHOOL_SUBJECT_ORDER];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(v) {
  if (v == null || !Number.isFinite(Number(v))) return "-";
  return `${Number(v).toFixed(0)}%`;
}

function formatDateHe(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

/** @param {{ title?: string|null, subject?: string|null }} a */
function classroomActivityTitleHe(a) {
  return sanitizeActivityTitleHe(a?.title, a?.subject);
}

/** @param {unknown} daily */
function lastDateFromDaily(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return null;
  const sorted = [...daily].sort((a, b) =>
    String(b?.date || "").localeCompare(String(a?.date || ""))
  );
  return sorted[0]?.date || null;
}

function studentRowFromPayload(s, extraDetail) {
  const sum = s.summary || {};
  const answers = safeNum(sum.totalAnswers);
  const acc = sum.accuracy != null ? formatPercent(sum.accuracy) : null;
  const tier =
    s.guidanceSeverityTier ||
    s.teacherGuidance?.guidanceSeverityTier ||
    null;
  const learningStatusBadge = deriveStudentLearningStatusLabelHe(sum, tier);
  return {
    id: s.studentId,
    studentId: s.studentId,
    name: s.studentFullNameMasked || s.studentFullName || "ילד/ה",
    detail:
      extraDetail ||
      (answers > 0 ? `${answers} תשובות${acc ? ` · דיוק ${acc}` : ""}` : null),
    learningStatusBadge,
  };
}

function studentRowFromGroupItem(s) {
  const answers = safeNum(s.totalAnswers);
  const acc = s.accuracy != null ? formatPercent(s.accuracy) : null;
  const learningStatusBadge = deriveStudentLearningStatusLabelHe({
    totalAnswers: s.totalAnswers,
    totalSessions: s.totalSessions,
    accuracy: s.accuracy,
  });

  return {
    id: s.studentId,
    studentId: s.studentId,
    name: s.studentFullNameMasked || s.studentFullName || "ילד/ה",
    detail: answers > 0 ? `${answers} תשובות${acc ? ` · דיוק ${acc}` : ""}` : "אין נתונים בתקופה",
    learningStatusBadge,
  };
}

/**
 * @param {Array<Record<string, unknown>>} weaknessSource
 * @param {{ version?: string }} guidance
 * @param {Map<string, Record<string, unknown>>} rosterById
 * @param {(subject: string) => string|null|undefined} subjectLabelFn
 */
function buildFocusAreasFromWeaknessSource(weaknessSource, guidance, rosterById, subjectLabelFn) {
  const isV2 = guidance?.version === "v2";
  const candidates = [];

  for (const t of weaknessSource || []) {
    const subject = String(t.subject || "");
    const topicLabelHe =
      t.topicLabelHe || t.headlineHe || resolveTopicLabelHe(subject, t.topic) || null;
    if (!topicLabelHe) continue;

    const subjectHe = subjectLabelFn(subject);
    const headline =
      t.level === "subject"
        ? topicLabelHe
        : t.subtopicLabelHe
          ? `${topicLabelHe} - ${t.subtopicLabelHe}`
          : topicLabelHe;
    const line = subjectHe && t.level !== "subject" ? `${subjectHe} - ${headline}` : headline;

    const err =
      t.cohortAccuracyPct != null
        ? formatPercent(100 - t.cohortAccuracyPct)
        : safeNum(t.answers) > 0
          ? formatPercent((safeNum(t.wrong) / safeNum(t.answers)) * 100)
          : null;

    const drilldownKey = `${subject}::${normalizeTopicKeyForDrilldown(t.topic)}`;
    const affectedIds = Array.isArray(t.affectedStudentIds)
      ? t.affectedStudentIds
      : Array.isArray(t.studentIds)
        ? t.studentIds
        : [];

    candidates.push({
      subject,
      topic: t.topic,
      topicLabelHe,
      recommendedActionType: t.recommendedActionType || "",
      label: line,
      err,
      drilldownKey,
      affectedIds,
      studentCount: safeNum(t.affectedStudentCount ?? t.studentCount),
      isV2,
    });
  }

  const deduped = dedupeTeacherRecommendationItems(candidates);
  const focusDrilldowns = {};
  const focusAreas = deduped.map((t) => {
    const affectedStudents = (t.affectedIds || [])
      .map((sid) => rosterById.get(sid))
      .filter(Boolean)
      .map((s) => studentRowFromPayload(s));
    focusDrilldowns[t.drilldownKey] = {
      title: t.label,
      subtitle: t.err
        ? `שיעור טעות ${t.err} · ${t.studentCount} ילדים`
        : null,
      items: affectedStudents,
    };
    return {
      label: t.label,
      detail: t.err ? `שיעור טעות ${t.err}` : null,
      count:
        affectedStudents.length > 0 ? affectedStudents.length : t.studentCount > 0 ? t.studentCount : null,
      drilldownKey: t.drilldownKey,
    };
  });

  return { focusAreas, focusDrilldowns };
}

/**
 * Merge reinforcement units from per-subject guidance blocks (physical class report).
 * Uses the same classRecommendationUnits source as subject-specific class reports.
 * @param {Array<{ subjectFocus?: string, classRecommendationUnits?: unknown[] }>} subjectGuidanceBlocks
 * @param {number} [maxTotal]
 */
export function mergeSubjectGuidanceReinforcementUnits(subjectGuidanceBlocks, maxTotal = 24) {
  const out = [];
  for (const block of subjectGuidanceBlocks || []) {
    const units = (block.classRecommendationUnits || []).filter(
      (u) => u && (u.topicLabelHe || u.headlineHe)
    );
    for (const u of units) {
      out.push({
        ...u,
        subject: u.subject || block.subjectFocus,
        topicLabelHe: u.topicLabelHe || u.headlineHe || null,
      });
      if (out.length >= maxTotal) return out;
    }
  }
  return out.slice(0, maxTotal);
}

/**
 * @param {Record<string, unknown>} guidance
 * @param {Record<string, unknown>} report
 * @param {number} focusItemCount
 */
function resolveClassFocusPreambleHe(guidance, report, focusItemCount) {
  if (focusItemCount === 0 || canShowClassCalmWeakTopicsMessage(guidance, report)) return null;
  const tier =
    guidance?.guidanceSeverityTier || guidance?.cohortStats?.guidanceSeverityTier;
  if (
    tier === "critical_class" ||
    tier === "class_needs_reinforcement" ||
    tier === "class_monitor"
  ) {
    return CLASS_WEAK_TOPICS_FALLBACK_BANNER;
  }
  const cohort = report?.cohortSummary || {};
  const acc = Number(cohort.accuracy);
  const totalAnswers = Number(cohort.totalAnswers);
  if (Number.isFinite(acc) && acc < 65 && totalAnswers >= 10) {
    return CLASS_WEAK_TOPICS_FALLBACK_BANNER;
  }
  return null;
}

function classFocusEmptyMessageHe(guidance, report) {
  if (canShowClassCalmWeakTopicsMessage(guidance, report)) {
    return HUB_CLASS_WEAK_TOPICS_CALM_MESSAGE;
  }
  return CLASS_WEAK_TOPICS_FALLBACK_BANNER;
}

function classFocusNavBadgeHe(focusItemCount, preamble) {
  if (focusItemCount > 0) return `${focusItemCount} נושאים`;
  if (preamble) return "מומלץ חיזוק";
  return "אין";
}

/**
 * @param {{ focusAreas: unknown[], guidance: Record<string, unknown>, report: Record<string, unknown> }} args
 */
function buildClassFocusSectionMeta({ focusAreas, guidance, report }) {
  const preamble = resolveClassFocusPreambleHe(guidance, report, focusAreas.length);
  return {
    title: "נושאים לחיזוק",
    preamble,
    empty: focusAreas.length > 0 ? null : classFocusEmptyMessageHe(guidance, report),
    items: focusAreas,
    navBadge: classFocusNavBadgeHe(focusAreas.length, preamble),
  };
}

function normalizeTopicKeyForDrilldown(topic) {
  const raw = String(topic || "general").trim() || "general";
  const i = raw.indexOf("::grade:");
  return i === -1 ? raw : raw.slice(0, i);
}

function studentRowFromAttention(s) {
  const reasons = Array.isArray(s.reasons)
    ? s.reasons.map((r) => attentionReasonHe(r)).filter(Boolean)
    : [];
  const reasonText = reasons.length ? reasons.join(" · ") : null;
  const answers = safeNum(s.totalAnswers);
  const learningStatusBadge = deriveStudentLearningStatusLabelHe({
    totalAnswers: s.totalAnswers,
    totalSessions: s.totalSessions,
    accuracy: s.accuracy,
  });
  return {
    id: s.studentId || s.studentFullNameMasked || s.studentFullName,
    studentId: s.studentId || null,
    name: s.studentFullNameMasked || s.studentFullName || "ילד/ה",
    detail:
      reasonText ||
      (answers > 0 ? `${answers} תשובות` : "דורש/ת תשומת לב"),
    learningStatusBadge,
  };
}

function classInsightText(body) {
  const guidance = body?.teacherGuidanceBlock || {};
  const cohort = body?.cohortSummary || {};
  const totalAnswers = safeNum(cohort.totalAnswers);
  const studentsWithActivity = safeNum(cohort.studentsWithActivity);
  const tier = guidance?.guidanceSeverityTier || guidance?.cohortStats?.guidanceSeverityTier;
  const signal = guidance?.teacherSummary?.classHealthSignal;

  if (guidance.insufficientData || (totalAnswers < 10 && studentsWithActivity === 0)) {
    return "אין עדיין מספיק תשובות לניתוח עומק. מומלץ לעקוב אחרי פעילויות כיתה והגשות ילדים.";
  }

  const base =
    (tier && classGuidanceSeverityTierHe(tier)) ||
    classHealthHe(signal) ||
    "יש נתוני תרגול אחרונים";

  if (guidance.version === "v2" && (guidance.classRecommendationUnits || []).length > 0) {
    const top = guidance.classRecommendationUnits[0];
    if (top.headlineHe) {
      return `${base}. ${top.headlineHe} (${top.affectedStudentCount ?? 0} ילדים · ${formatPercent(top.cohortAccuracyPct)} הצלחה).`;
    }
    if (top.topicLabelHe) {
      return `${base}. נושא עיקרי לחיזוק: ${top.topicLabelHe} (${top.affectedStudentCount} ילדים · ${formatPercent(top.cohortAccuracyPct)} הצלחה).`;
    }
  }

  if (
    tier === "critical_class" ||
    tier === "class_needs_reinforcement" ||
    tier === "class_monitor"
  ) {
    return `${base}. נדרש מעקב נוסף במקצוע זה וחיזוק ממוקד.`;
  }

  if (tier === "class_on_track" || signal === "strong") {
    return `${base}. הכיתה מציגה נתוני תרגול טובים בתקופה האחרונה.`;
  }

  if (totalAnswers > 0) {
    return "הכיתה פעילה ויש נתוני תרגול אחרונים.";
  }
  return "טרם נאספו מספיק נתונים - מומלץ לפתוח פעילויות כיתה.";
}

function studentInsightText(body) {
  const guidance = body?.teacherGuidanceBlock || {};
  const summary = body?.summary || {};
  const totalAnswers = safeNum(summary.totalAnswers);

  if (guidance.insufficientData || totalAnswers < 5) {
    return "אין עדיין מספיק נתונים לניתוח מעמיק. מומלץ לעודד תרגול ולעקוב אחרי פעילויות.";
  }

  if (guidance.version === "v2" && (guidance.recommendationUnits || []).length > 0) {
    const u = guidance.recommendationUnits[0];
    const ev = u.evidenceSummary || {};
    if (u.headlineHe) {
      const action = actionTypeLabelHe(u.recommendedActionType);
      const parts = [
        `${u.headlineHe} (${formatPercent(ev.accuracyPct)} הצלחה · ${ev.wrongCount ?? 0} טעויות)`,
      ];
      if (action) parts.push(action);
      return `${parts.join(" · ")}.`;
    }
    if (u.topicLabelHe) {
      const action = actionTypeLabelHe(u.recommendedActionType);
      const parts = [
        `מומלץ מעקב ב${u.topicLabelHe} (${formatPercent(ev.accuracyPct)} הצלחה · ${ev.wrongCount ?? 0} טעויות)`,
      ];
      if (action) parts.push(action);
      return `${parts.join(" · ")}.`;
    }
  }

  const tier = guidance?.guidanceSeverityTier;
  if (tier === "critical" || tier === "needs_reinforcement") {
    const tierHe = guidanceSeverityTierHe(tier);
    if (tierHe && summary.accuracy != null) {
      return `${tierHe}. דיוק כללי ${formatPercent(summary.accuracy)} בתקופה האחרונה.`;
    }
  }

  const strengths = guidance.strengthsForTeacher || [];
  const support = guidance.supportSuggestions || [];
  const parts = [];

  if (strengths.length) {
    const s = strengths[0];
    const subj = schoolSubjectLabelHe(s.subject);
    if (subj && s.accuracy != null) {
      parts.push(`חוזק יחסי ב${subj} (${formatPercent(s.accuracy)}).`);
    }
  }

  if (guidance.version !== "v2") {
    const weak = (guidance.nextPracticeFocus || [])[0];
    if (weak) {
      const line = formatTopicRecommendationLineHe(weak.subject, weak.topic);
      if (line) parts.push(`מומלץ מעקב ב${line}.`);
    } else if (support.length) {
      parts.push("מומלץ לתמוך בתרגול מודרך ולעקוב אחרי התקדמות.");
    }
  } else if (summary.accuracy != null) {
    parts.push(`דיוק כללי ${formatPercent(summary.accuracy)} בתקופה האחרונה.`);
  }

  return parts.length ? parts.join(" ") : "יש נתוני למידה - מומלץ להמשיך מעקב שוטף.";
}

/**
 * @param {unknown} body
 * @param {{ name?: string|null, gradeLevel?: string|null, subjectFocus?: string|null, teacherName?: string|null, memberCount?: number, activityCount?: number, classId?: string }} cls
 * @param {{ recentClassroomActivities?: unknown[], classroomActivityCount?: number }} [extras]
 */
export function parseClassReportViewModel(body, cls, extras = {}) {
  const cohort = body?.cohortSummary || {};
  const roster = body?.roster || {};
  const guidance = body?.teacherGuidanceBlock || {};
  const studentCount = safeNum(roster.activeMemberCount ?? roster.studentCount ?? cls.memberCount);
  const activityCount = safeNum(extras.classroomActivityCount ?? cls.activityCount);
  const totalAnswers = safeNum(cohort.totalAnswers);
  const lastDaily = lastDateFromDaily(body?.recentActivity?.daily);
  const hasCohortData =
    totalAnswers > 0 &&
    cohort.accuracy != null &&
    Number.isFinite(Number(cohort.accuracy));

  const classStatusLabel = classOrCohortLearningStatusLabelHe(
    hasCohortData
      ? guidance.guidanceSeverityTier || guidance.cohortStats?.guidanceSeverityTier
      : null,
    hasCohortData ? cohort.accuracy : null
  );

  const header = {
    title: cls.name || body?.class?.name || "דוח כיתה",
    subtitle: [
      schoolSubjectLabelHe(cls.subjectFocus || body?.class?.subjectFocus),
      cls.teacherName ? `מורה: ${cls.teacherName}` : null,
      cls.gradeLevel ? `שכבה ${cls.gradeLevel}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    chips: [
      { label: "ילדים", value: String(studentCount) },
      { label: "פעילויות", value: String(activityCount) },
      classStatusLabel ? { label: "מצב כיתה", value: classStatusLabel } : null,
    ].filter(Boolean),
  };

  const summaryCards = [
    { label: "ילדים בכיתה", value: String(studentCount) },
    { label: "תשובות / הגשות", value: String(totalAnswers) },
    { label: "דיוק ממוצע", value: formatPercent(cohort.accuracy) },
    { label: "ילדים עם פעילות", value: String(safeNum(cohort.studentsWithActivity)) },
    { label: "פעילויות כיתה", value: String(activityCount) },
    { label: "פעילות אחרונה", value: formatDateHe(lastDaily) },
  ];

  const classroomActs = (extras.recentClassroomActivities || []).map((a) => ({
    id: a.id,
    title: classroomActivityTitleHe(a),
    subject: schoolSubjectLabelHe(a.subject),
    mode: schoolActivityModeHe(a.mode),
    status: schoolActivityStatusHe(a.status),
    date: formatDateHe(a.activated_at || a.created_at),
    meta: schoolActivityModeHe(a.mode) || null,
  }));

  const dailyActs = (body?.recentActivity?.daily || [])
    .slice(-5)
    .reverse()
    .map((d, i) => ({
      id: `daily-${d.date || i}`,
      title: `תרגול יומי`,
      subject: schoolSubjectLabelHe(cls.subjectFocus),
      mode: "תרגול",
      status: safeNum(d.answers) > 0 ? "פעיל" : "ללא נתונים",
      date: formatDateHe(d.date),
      meta: `${safeNum(d.answers)} תשובות`,
    }));

  const activityItems = classroomActs.length ? classroomActs : dailyActs;

  const groups = guidance.suggestedGroups || {};
  const rosterStudentsRaw = body?.students || [];
  const rosterStudents = rosterStudentsRaw.map((s) => studentRowFromPayload(s));
  const activeStudents = rosterStudentsRaw
    .filter((s) => safeNum(s.summary?.totalAnswers) > 0)
    .map((s) => studentRowFromPayload(s));
  const inactiveStudents = rosterStudentsRaw
    .filter((s) => safeNum(s.summary?.totalAnswers) === 0)
    .map((s) => studentRowFromPayload(s, "אין נתונים בתקופה"));

  const distributionDrilldowns = {
    struggling: {
      title: groupTierHe("struggling") || "קבוצת תמיכה",
      items: (groups.struggling || []).map((s) => studentRowFromGroupItem(s)),
    },
    on_track: {
      title: groupTierHe("on_track") || "קבוצת חיזוק",
      items: (groups.on_track || []).map((s) => studentRowFromGroupItem(s)),
    },
    advanced: {
      title: groupTierHe("advanced") || "קבוצת התקדמות",
      items: (groups.advanced || []).map((s) => studentRowFromGroupItem(s)),
    },
    active: {
      title: "הגישו / פעילים",
      items: activeStudents,
    },
    inactive: {
      title: "ללא נתונים בתקופה",
      items: inactiveStudents,
    },
  };

  const weaknessSource =
    guidance.version === "v2"
      ? guidance.classRecommendationUnits || []
      : body?.weaknessTopics || guidance.priorityTopics || [];
  const rosterById = new Map(rosterStudentsRaw.map((s) => [s.studentId, s]));
  const { focusAreas, focusDrilldowns } = buildFocusAreasFromWeaknessSource(
    weaknessSource.slice(0, 8),
    guidance,
    rosterById,
    schoolSubjectLabelHe
  );
  const focusSection = buildClassFocusSectionMeta({ focusAreas, guidance, report: body });

  const distribution = [
    { tier: groupTierHe("struggling") || "קבוצת תמיכה", count: (groups.struggling || []).length, drilldownKey: "struggling" },
    { tier: groupTierHe("on_track") || "קבוצת חיזוק", count: (groups.on_track || []).length, drilldownKey: "on_track" },
    { tier: groupTierHe("advanced") || "קבוצת התקדמות", count: (groups.advanced || []).length, drilldownKey: "advanced" },
  ];

  const submitted = safeNum(cohort.studentsWithActivity);
  const notSubmitted = Math.max(0, studentCount - submitted);
  if (studentCount > 0) {
    distribution.unshift(
      { tier: "הגישו / פעילים", count: submitted, drilldownKey: "active" },
      { tier: "ללא נתונים בתקופה", count: notSubmitted, drilldownKey: "inactive" }
    );
  }

  const attentionStudents = (guidance.attentionStudents || body?.attentionList || [])
    .slice(0, 12)
    .map((s) => ({
      ...studentRowFromAttention(s),
      actions: s.studentId ? [studentReportActionMeta(s.studentId)] : [],
    }));

  const navigation = [
    {
      id: "activities",
      label: "פעילויות כיתה",
      badge: activityItems.length ? `${activityItems.length} פעילויות` : "אין פעילויות",
    },
    {
      id: "students",
      label: "ילדים בכיתה",
      badge: rosterStudents.length ? `${rosterStudents.length} ילדים` : "אין ילדים",
    },
    {
      id: "focus",
      label: "נושאים לחיזוק",
      badge: focusSection.navBadge,
    },
    {
      id: "attention",
      label: "ילדים שדורשים תשומת לב",
      badge: attentionStudents.length ? `${attentionStudents.length} ילדים` : "אין",
    },
    {
      id: "distribution",
      label: "התפלגות ילדים",
      badge: distribution.some((d) => d.count > 0) ? "פירוט" : "אין נתונים",
    },
  ];

  return {
    kind: "class",
    header,
    summaryCards,
    insight: classInsightText(body),
    navigation,
    sections: {
      activities: {
        title: "פעילויות כיתה",
        empty: "אין פעילויות כיתה להצגה בתקופה זו.",
        items: activityItems,
      },
      students: {
        title: "ילדים בכיתה",
        empty: "אין ילדים רשומים בכיתה זו.",
        items: rosterStudents.map((s) => ({
          ...s,
          actions: s.studentId ? [studentReportActionMeta(s.studentId)] : [],
        })),
      },
      distribution: {
        title: "התפלגות ילדים",
        empty: "אין מספיק נתונים להתפלגות.",
        items: distribution.filter((d) => d.count > 0),
      },
      focus: focusSection,
      attention: {
        title: "ילדים שדורשים תשומת לב",
        empty: "לא זוהו ילדים בולטים לתשומת לב.",
        items: attentionStudents,
      },
    },
    drilldowns: {
      distribution: distributionDrilldowns,
      focus: focusDrilldowns,
    },
    actions: [],
  };
}

/**
 * @param {unknown} body
 * @param {{ displayName?: string|null, physicalClassName?: string|null, gradeLevel?: string|null, studentId?: string }} student
 * @param {{ schoolName?: string|null, subjectFocus?: string|null }} [ctx]
 */
export function parseStudentReportViewModel(body, student, ctx = {}) {
  const summary = body?.summary || {};
  const guidance = body?.teacherGuidanceBlock || {};
  const totalAnswers = safeNum(summary.totalAnswers);
  const lastDate = lastDateFromDaily(body?.dailyActivity);

  const header = {
    title:
      student.displayName ||
      body?.student?.full_name ||
      body?.student?.fullName ||
      "ילד/ה",
    subtitle: [
      student.physicalClassName || null,
      student.gradeLevel ? `שכבה ${student.gradeLevel}` : null,
      ctx.schoolName || null,
      ctx.subjectFocus ? schoolSubjectLabelHe(ctx.subjectFocus) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    chips: [],
  };

  const summaryCards = [
    { label: "תשובות / הגשות", value: String(totalAnswers) },
    { label: "דיוק", value: formatPercent(summary.accuracy) },
    { label: "מפגשי תרגול", value: String(safeNum(summary.totalSessions)) },
    { label: "פעילות אחרונה", value: formatDateHe(lastDate) },
    {
      label: "סטטוס למידה",
      value:
        totalAnswers === 0 || safeNum(summary.accuracy) == null
          ? "אין מספיק נתונים"
          : safeNum(summary.accuracy) >= 90
            ? "חזק"
            : safeNum(summary.accuracy) >= 75
              ? "תקין"
              : safeNum(summary.accuracy) >= 65
                ? "במעקב"
                : safeNum(summary.accuracy) >= 50
                  ? "צריך חיזוק"
                  : "דורש התערבות",
    },
  ];

  const subjectsMap = body?.subjects && typeof body.subjects === "object" ? body.subjects : {};
  const subjectRows = SCHOOL_REPORT_SUBJECTS.map((sid) => {
    const subj = subjectsMap[sid];
    const answers = safeNum(subj?.answers);
    const sessions = safeNum(subj?.sessions);
    if (!answers && !sessions) {
      return { subject: schoolSubjectLabelHe(sid), status: "אין עדיין נתונים", detail: null };
    }
    return {
      subject: schoolSubjectLabelHe(sid),
      status: answers > 0 ? formatPercent(subj.accuracy) : `${sessions} מפגשים`,
      detail: `${answers} תשובות`,
    };
  });

  const recentFromDaily = (body?.dailyActivity || [])
    .slice(-6)
    .reverse()
    .map((d, i) => ({
      id: `d-${d.date || i}`,
      title: "יום תרגול",
      subject: "-",
      mode: "תרגול",
      status: safeNum(d.answers) > 0 ? "פעיל" : "ללא נתונים",
      date: formatDateHe(d.date),
      meta: `${safeNum(d.sessions)} מפגשים · ${safeNum(d.answers)} תשובות`,
    }));

  const recentFromMistakes = (body?.recentMistakes || []).slice(0, 5).map((m, i) => ({
    id: `m-${i}`,
    title: formatTopicRecommendationLineHe(m.subject, m.topic) || "טעות בתרגול",
    subject: schoolSubjectLabelHe(m.subject),
    mode: "תרגול",
    status: "טעות",
    date: formatDateHe(m.answeredAt || m.date),
    meta: m.topic ? null : null,
  }));

  const recentItems = recentFromDaily.length ? recentFromDaily : recentFromMistakes;

  const focusItems =
    guidance.version === "v2"
      ? dedupeTeacherRecommendationItems(guidance.recommendationUnits || [])
          .filter((u) => u.topicLabelHe || u.headlineHe)
          .slice(0, 6)
          .map((u) => {
            if (u.level === "subject" && u.headlineHe) {
              const ev = u.evidenceSummary || {};
              return {
                label: u.headlineHe,
                detail: formatStudentSubjectFallbackEvidenceHe(
                  ev.accuracyPct,
                  ev.totalAnswers
                ),
              };
            }
            const subj = schoolSubjectLabelHe(u.subject);
            const headline = u.subtopicLabelHe
              ? `${u.topicLabelHe} - ${u.subtopicLabelHe}`
              : u.topicLabelHe;
            const ev = u.evidenceSummary || {};
            return {
              label: subj ? `${subj} - ${headline}` : headline,
              detail: `${ev.wrongCount ?? 0} טעויות מ-${ev.totalAnswers ?? 0} · ${formatPercent(ev.accuracyPct)}`,
            };
          })
      : (guidance.nextPracticeFocus || [])
          .map((t) => {
            const label = formatTopicRecommendationLineHe(t.subject, t.topic);
            if (!label) return null;
            return {
              label,
              detail: t.accuracy != null ? `דיוק ${formatPercent(t.accuracy)}` : null,
            };
          })
          .filter(Boolean)
          .slice(0, 6);

  const recommendationItems =
    guidance.version === "v2"
      ? dedupeTeacherRecommendationItems(guidance.supportSuggestionsV2 || [])
          .filter((s) => s.topicLabelHe)
          .slice(0, 5)
          .map((s) => {
            const action = actionTypeLabelHe(s.code);
            return {
              label: action ? `${action} ב${s.topicLabelHe}` : s.topicLabelHe,
              detail: null,
            };
          })
      : (guidance.supportSuggestions || [])
          .slice(0, 5)
          .map((s, i) => {
            const code = typeof s === "string" ? s : s.label || s.code || "";
            const label =
              supportSuggestionHe(code) ||
              (typeof s === "object" ? s.label : null) ||
              `המלצה ${i + 1}`;
            if (!label || label === "המשיכו לעקוב אחר ההתקדמות") return null;
            return {
              label,
              detail: typeof s === "object" ? s.detail || null : null,
            };
          })
          .filter(Boolean);

  const navigation = [
    {
      id: "subjects",
      label: "פירוט לפי מקצוע",
      badge: subjectRows.some((r) => r.status !== "אין עדיין נתונים") ? "יש נתונים" : "אין נתונים",
    },
    {
      id: "activities",
      label: "פעילויות אחרונות",
      badge: recentItems.length ? `${recentItems.length} רשומות` : "אין פעילות",
    },
    {
      id: "focus",
      label: "נושאים לחיזוק",
      badge: focusItems.length ? `${focusItems.length} נושאים` : "אין",
    },
    {
      id: "recommendations",
      label: "המלצות למעקב",
      badge: recommendationItems.length ? `${recommendationItems.length} המלצות` : "אין",
    },
  ];

  return {
    kind: "student",
    meta: {
      studentId: student.studentId || body?.student?.id || null,
      displayName: student.displayName || body?.student?.full_name || null,
    },
    header,
    summaryCards,
    insight: studentInsightText(body),
    navigation,
    sections: {
      subjects: {
        title: "פירוט לפי מקצוע",
        empty: "אין נתונים לפי מקצוע.",
        items: subjectRows.map((r) => ({
          label: r.subject,
          status: r.status,
          detail: r.detail,
        })),
      },
      activities: {
        title: "פעילויות אחרונות",
        empty: "אין פעילות למידה בתקופה האחרונה.",
        items: recentItems,
      },
      focus: {
        title: "נושאים לחיזוק",
        empty: canShowStudentCalmFocusMessage(guidance, body)
          ? HUB_STUDENT_FOCUS_CALM_MESSAGE
          : STUDENT_FOCUS_FALLBACK_BANNER,
        items: focusItems,
      },
      recommendations: {
        title: "המלצות למעקב",
        empty: "אין המלצות נוספות כרגע.",
        items: recommendationItems,
      },
    },
    actions: [],
  };
}

function physicalClassInsightText(body) {
  const cohort = body?.cohortSummary || {};
  const totalAnswers = safeNum(cohort.totalAnswers);
  const studentsWithActivity = safeNum(cohort.studentsWithActivity);
  const studentCount = safeNum(body?.rosterSummary?.studentCount ?? body?.roster?.length);
  const tier = body?.physicalClassGuidanceSeverityTier;
  const blocks = Array.isArray(body?.subjectGuidanceBlocks) ? body.subjectGuidanceBlocks : [];

  if (totalAnswers < 10 && studentsWithActivity === 0) {
    return "אין עדיין מספיק נתונים לניתוח עומק בכל המקצועות. מומלץ לעקוב אחרי פעילויות כיתה והגשות ילדים.";
  }

  if (tier && blocks.length) {
    const tierHe = classGuidanceSeverityTierHe(tier);
    const worst = blocks[0];
    const worstUnit = worst?.classRecommendationUnits?.[0];
    const subjHe =
      worst?.subjectLabelHe || schoolSubjectLabelHe(worst?.subjectFocus || "");
    if (tierHe && worstUnit?.headlineHe) {
      return `${tierHe} · ${subjHe}: ${worstUnit.headlineHe}`;
    }
    if (tierHe) return tierHe;
  }

  if (totalAnswers > 0) {
    return `סיכום כללי לכיתה בכל המקצועות: ${studentsWithActivity} מתוך ${studentCount} ילדים עם פעילות, ${totalAnswers} תשובות/הגשות.`;
  }
  return "טרם נאספו מספיק נתונים - מומלץ לפתוח פעילויות כיתה.";
}

function subjectReportAction(classId) {
  return { id: "subject_report", label: "דוח מקצוע", classId };
}

function teacherCardAction(teacherId, teacherName) {
  return { id: "teacher_card", label: "כרטיס מורה", teacherId, teacherName };
}

function studentReportActionMeta(studentId) {
  return { id: "student_report", label: "דוח ילד/ה", studentId };
}

/**
 * @param {unknown} body
 * @param {{ schoolName?: string|null, gradeLevel?: string|null, physicalClassName?: string|null }} [ctx]
 */
export function parsePhysicalClassReportViewModel(body, ctx = {}) {
  const cohort = body?.cohortSummary || {};
  const rosterSummary = body?.rosterSummary || {};
  const studentCount = safeNum(rosterSummary.studentCount ?? body?.roster?.length);
  const subjectBreakdown = Array.isArray(body?.subjectBreakdown) ? body.subjectBreakdown : [];
  const totalAnswers = safeNum(cohort.totalAnswers);
  const lastDaily = lastDateFromDaily(body?.recentActivity?.daily);
  const physName = body?.physicalClass?.name || ctx.physicalClassName || "כיתה";
  const gradeLevel = body?.physicalClass?.gradeLevel || ctx.gradeLevel || "";
  const hasCohortData =
    totalAnswers > 0 &&
    cohort.accuracy != null &&
    Number.isFinite(Number(cohort.accuracy));

  const physicalStatusLabel = classOrCohortLearningStatusLabelHe(
    hasCohortData ? body?.physicalClassGuidanceSeverityTier : null,
    hasCohortData ? cohort.accuracy : null
  );

  const header = {
    title: physName,
    subtitle: "דוח כיתה כללי · כל המקצועות",
    chips: [
      ctx.schoolName ? { label: "בית ספר", value: ctx.schoolName } : null,
      gradeLevel ? { label: "שכבה", value: gradeLevel } : null,
      { label: "ילדים", value: String(studentCount) },
      { label: "מקצועות", value: String(subjectBreakdown.length) },
      physicalStatusLabel ? { label: "מצב כיתה", value: physicalStatusLabel } : null,
    ].filter(Boolean),
  };

  const summaryCards = [
    { label: "ילדים", value: String(studentCount) },
    { label: "תשובות", value: String(totalAnswers) },
    { label: "דיוק", value: formatPercent(cohort.accuracy) },
    { label: "פעילים", value: String(safeNum(cohort.studentsWithActivity)) },
    { label: "פעילות אחרונה", value: formatDateHe(lastDaily) },
  ];

  const subjectItems = subjectBreakdown.map((row) => {
    const acc = row.accuracy != null ? formatPercent(row.accuracy) : null;
    return {
      id: row.classId,
      classId: row.classId,
      teacherId: row.teacherId,
      label: row.subjectLabelHe || schoolSubjectLabelHe(row.subjectFocus),
      detail: [
        row.teacherName ? `מורה: ${row.teacherName}` : null,
        `${safeNum(row.memberCount)} ילדים`,
        `${safeNum(row.activityCount)} פעילויות`,
        row.totalAnswers ? `${safeNum(row.totalAnswers)} תשובות` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      status: acc,
      actions: [
        subjectReportAction(row.classId),
        row.teacherId ? teacherCardAction(row.teacherId, row.teacherName) : null,
      ].filter(Boolean),
    };
  });

  const recentActivities = Array.isArray(body?.recentActivities) ? body.recentActivities : [];
  const activityItems = recentActivities.map((a) => ({
    id: a.activityId,
    classId: a.classId,
    title: sanitizeActivityTitleHe(a.title, a.subjectFocus || a.subject),
    subject: a.subjectLabelHe || schoolSubjectLabelHe(a.subjectFocus || a.subject),
    teacherName: a.teacherName,
    mode: schoolActivityModeHe(a.mode),
    status: schoolActivityStatusHe(a.status),
    date: formatDateHe(a.activatedAt || a.createdAt),
    meta: [
      a.teacherName ? `מורה: ${a.teacherName}` : null,
      safeNum(a.submittedCount) > 0 ? `${safeNum(a.submittedCount)} הגישו` : null,
      a.accuracy != null ? `דיוק ${formatPercent(a.accuracy)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    actions: a.classId ? [subjectReportAction(a.classId)] : [],
  }));

  const rosterStudentsRaw = body?.students || [];
  const rosterStudents = rosterStudentsRaw.map((s) => studentRowFromPayload(s));

  const rosterById = new Map(rosterStudentsRaw.map((s) => [s.studentId, s]));
  const isPhysicalV2 =
    body?.reportMeta?.version === "v2" &&
    Array.isArray(body?.subjectGuidanceBlocks) &&
    body.subjectGuidanceBlocks.length > 0;
  const mergedSubjectUnits = isPhysicalV2
    ? mergeSubjectGuidanceReinforcementUnits(body.subjectGuidanceBlocks, 24)
    : [];
  const physicalGuidance = isPhysicalV2
    ? {
        version: "v2",
        guidanceSeverityTier: body.physicalClassGuidanceSeverityTier,
        classRecommendationUnits: mergedSubjectUnits,
      }
    : { version: "v1" };
  const physicalWeaknessSource =
    mergedSubjectUnits.length > 0
      ? mergedSubjectUnits
      : (body?.weaknessTopics || []).slice(0, 12);
  const { focusAreas, focusDrilldowns } = buildFocusAreasFromWeaknessSource(
    physicalWeaknessSource,
    physicalGuidance,
    rosterById,
    schoolSubjectLabelHe
  );
  const focusSection = buildClassFocusSectionMeta({
    focusAreas,
    guidance: physicalGuidance,
    report: body,
  });
  for (const key of Object.keys(focusDrilldowns)) {
    focusDrilldowns[key].items = (focusDrilldowns[key].items || []).map((s) => ({
      ...s,
      actions: s.studentId ? [studentReportActionMeta(s.studentId)] : [],
    }));
  }

  const attentionStudents = (body?.attentionList || []).slice(0, 15).map((s) => {
    const reasons = Array.isArray(s.reasons)
      ? s.reasons.map((r) => attentionReasonHe(r)).filter(Boolean)
      : [];
    const reasonText = reasons.length ? reasons.join(" · ") : null;
    const actions = [studentReportActionMeta(s.studentId)];

    const learningStatusBadge = deriveStudentLearningStatusLabelHe({
      totalAnswers: s.totalAnswers,
      totalSessions: s.totalSessions,
      accuracy: s.accuracy,
    });

    return {
      id: s.studentId,
      studentId: s.studentId,
      name: s.studentFullNameMasked || s.studentFullName || "ילד/ה",
      detail: reasonText || "דורש/ת תשומת לב",
      subjects: ["כל המקצועות"],
      learningStatusBadge,
      actions,
    };
  });

  const navigation = [
    {
      id: "subjects",
      label: "פירוט לפי מקצוע",
      badge: subjectItems.length ? `${subjectItems.length} מקצועות` : "אין",
    },
    {
      id: "activities",
      label: "פעילויות אחרונות",
      badge: activityItems.length ? `${activityItems.length} פעילויות` : "אין",
    },
    {
      id: "students",
      label: "ילדים בכיתה",
      badge: rosterStudents.length ? `${rosterStudents.length} ילדים` : "אין",
    },
    {
      id: "focus",
      label: "נושאים לחיזוק",
      badge: focusSection.navBadge,
    },
    {
      id: "attention",
      label: "ילדים שדורשים תשומת לב",
      badge: attentionStudents.length ? `${attentionStudents.length} ילדים` : "אין",
    },
  ];

  return {
    kind: "physical_class",
    header,
    summaryCards,
    insight: physicalClassInsightText(body),
    navigation,
    sections: {
      subjects: {
        title: "פירוט לפי מקצוע",
        empty: "אין מקצועות להצגה.",
        items: subjectItems,
      },
      activities: {
        title: "פעילויות אחרונות",
        empty: "אין פעילויות כיתה להצגה בתקופה זו.",
        items: activityItems,
      },
      students: {
        title: "ילדים בכיתה",
        empty: "אין ילדים רשומים בכיתה זו.",
        items: rosterStudents.map((s) => ({
          ...s,
          actions: s.studentId ? [studentReportActionMeta(s.studentId)] : [],
        })),
      },
      focus: focusSection,
      attention: {
        title: "ילדים שדורשים תשומת לב",
        empty: "לא זוהו ילדים בולטים לתשומת לב.",
        items: attentionStudents,
      },
    },
    drilldowns: {
      focus: focusDrilldowns,
    },
    actions: [],
  };
}

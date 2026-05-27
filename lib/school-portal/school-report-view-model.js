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
  classHealthHe,
  formatTopicLineHe,
  groupTierHe,
  attentionReasonHe,
  supportSuggestionHe,
} from "../teacher-portal/teacher-ui.he.js";

const SCHOOL_REPORT_SUBJECTS = [...SCHOOL_SUBJECT_ORDER];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `${Number(v).toFixed(0)}%`;
}

function formatDateHe(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
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
  return {
    id: s.studentId,
    studentId: s.studentId,
    name: s.studentFullNameMasked || s.studentFullName || "תלמיד/ה",
    detail:
      extraDetail ||
      (answers > 0 ? `${answers} תשובות${acc ? ` · דיוק ${acc}` : ""}` : null),
  };
}

function studentRowFromGroupItem(s) {
  const answers = safeNum(s.totalAnswers);
  const acc = s.accuracy != null ? formatPercent(s.accuracy) : null;
  return {
    id: s.studentId,
    studentId: s.studentId,
    name: s.studentFullNameMasked || s.studentFullName || "תלמיד/ה",
    detail: answers > 0 ? `${answers} תשובות${acc ? ` · דיוק ${acc}` : ""}` : "אין נתונים בתקופה",
  };
}

function studentRowFromAttention(s) {
  const reasons = Array.isArray(s.reasons)
    ? s.reasons.map((r) => attentionReasonHe(r)).filter(Boolean)
    : [];
  const reasonText = reasons.length ? reasons.join(" · ") : null;
  const answers = safeNum(s.totalAnswers);
  const acc = s.accuracy != null ? formatPercent(s.accuracy) : null;
  return {
    id: s.studentId || s.studentFullNameMasked || s.studentFullName,
    studentId: s.studentId || null,
    name: s.studentFullNameMasked || s.studentFullName || "תלמיד/ה",
    detail:
      reasonText ||
      (s.accuracy != null
        ? `דיוק ${formatPercent(s.accuracy)} · ${answers} תשובות`
        : `${answers} תשובות`),
  };
}

function classInsightText(body) {
  const guidance = body?.teacherGuidanceBlock || {};
  const cohort = body?.cohortSummary || {};
  const totalAnswers = safeNum(cohort.totalAnswers);
  const studentsWithActivity = safeNum(cohort.studentsWithActivity);
  const signal = guidance?.teacherSummary?.classHealthSignal;

  if (guidance.insufficientData || (totalAnswers < 10 && studentsWithActivity === 0)) {
    return "אין עדיין מספיק תשובות לניתוח עומק. מומלץ לעקוב אחרי פעילויות כיתה והגשות תלמידים.";
  }

  const health = classHealthHe(signal);
  if (health) {
    if (signal === "needs_support") {
      return `${health}. נדרש מעקב נוסף במקצוע זה וחיזוק נושאים חלשים.`;
    }
    if (signal === "strong") {
      return `${health}. הכיתה מציגה נתוני תרגול טובים בתקופה האחרונה.`;
    }
    return `${health}. יש נתוני תרגול אחרונים — מומלץ להמשיך מעקב שוטף.`;
  }

  if (totalAnswers > 0) {
    return "הכיתה פעילה ויש נתוני תרגול אחרונים.";
  }
  return "טרם נאספו מספיק נתונים — מומלץ לפתוח פעילויות כיתה.";
}

function studentInsightText(body) {
  const guidance = body?.teacherGuidanceBlock || {};
  const summary = body?.summary || {};
  const totalAnswers = safeNum(summary.totalAnswers);

  if (guidance.insufficientData || totalAnswers < 5) {
    return "אין עדיין מספיק נתונים לניתוח מעמיק. מומלץ לעודד תרגול ולעקוב אחרי פעילויות.";
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

  const weak = (guidance.nextPracticeFocus || [])[0];
  if (weak) {
    const line = formatTopicLineHe(weak.subject, weak.topic);
    parts.push(line ? `מומלץ מעקב ב${line}.` : "מומלץ מעקב בתחומים שדורשים חיזוק.");
  } else if (support.length) {
    parts.push("מומלץ לתמוך בתרגול מודרך ולעקוב אחרי התקדמות.");
  } else if (summary.accuracy != null) {
    parts.push(`דיוק כללי ${formatPercent(summary.accuracy)} בתקופה האחרונה.`);
  }

  return parts.length ? parts.join(" ") : "יש נתוני למידה — מומלץ להמשיך מעקב שוטף.";
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
      { label: "תלמידים", value: String(studentCount) },
      { label: "פעילויות", value: String(activityCount) },
    ],
  };

  const summaryCards = [
    { label: "תלמידים בכיתה", value: String(studentCount) },
    { label: "תשובות / הגשות", value: String(totalAnswers) },
    { label: "דיוק ממוצע", value: formatPercent(cohort.accuracy) },
    { label: "תלמידים עם פעילות", value: String(safeNum(cohort.studentsWithActivity)) },
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

  const weaknessSource = body?.weaknessTopics || guidance.priorityTopics || [];
  const rosterById = new Map(rosterStudentsRaw.map((s) => [s.studentId, s]));
  const focusDrilldowns = {};
  const focusAreas = weaknessSource.slice(0, 8).map((t) => {
    const line = formatTopicLineHe(t.subject, t.topic) || schoolSubjectLabelHe(t.subject);
    const err =
      safeNum(t.answers) > 0
        ? formatPercent((safeNum(t.wrong) / safeNum(t.answers)) * 100)
        : null;
    const drilldownKey = `${t.subject || "general"}::${t.topic || "general"}`;
    const affectedIds = Array.isArray(t.studentIds) ? t.studentIds : [];
    const affectedStudents = affectedIds
      .map((sid) => rosterById.get(sid))
      .filter(Boolean)
      .map((s) => studentRowFromPayload(s));
    focusDrilldowns[drilldownKey] = {
      title: line,
      subtitle: err ? `שיעור טעות ${err} · ${safeNum(t.studentCount)} תלמידים` : null,
      items: affectedStudents,
    };
    return {
      label: line,
      detail: err ? `שיעור טעות ${err} · ${safeNum(t.studentCount)} תלמידים` : null,
      drilldownKey,
    };
  });

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
    .map((s) => studentRowFromAttention(s));

  const navigation = [
    {
      id: "activities",
      label: "פעילויות כיתה",
      badge: activityItems.length ? `${activityItems.length} פעילויות` : "אין פעילויות",
    },
    {
      id: "students",
      label: "תלמידים בכיתה",
      badge: rosterStudents.length ? `${rosterStudents.length} תלמידים` : "אין תלמידים",
    },
    {
      id: "focus",
      label: "נושאים לחיזוק",
      badge: focusAreas.length ? `${focusAreas.length} נושאים` : "אין נושאים",
    },
    {
      id: "attention",
      label: "תלמידים שדורשים תשומת לב",
      badge: attentionStudents.length ? `${attentionStudents.length} תלמידים` : "אין",
    },
    {
      id: "distribution",
      label: "התפלגות תלמידים",
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
        title: "תלמידים בכיתה",
        empty: "אין תלמידים רשומים בכיתה זו.",
        items: rosterStudents.map((s) => {
          const sum = rosterStudentsRaw.find((r) => r.studentId === s.studentId)?.summary || {};
          const answers = safeNum(sum.totalAnswers);
          const acc = sum.accuracy != null ? formatPercent(sum.accuracy) : null;
          return {
            ...s,
            status: answers > 0 ? (acc != null ? `דיוק ${acc}` : `${answers} תשובות`) : "אין עדיין נתונים",
          };
        }),
      },
      distribution: {
        title: "התפלגות תלמידים",
        empty: "אין מספיק נתונים להתפלגות.",
        items: distribution.filter((d) => d.count > 0),
      },
      focus: {
        title: "נושאים לחיזוק",
        empty: "לא זוהו נושאים חלשים משמעותיים — המשיכו מעקב.",
        items: focusAreas,
      },
      attention: {
        title: "תלמידים שדורשים תשומת לב",
        empty: "לא זוהו תלמידים בולטים לתשומת לב.",
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
      "תלמיד/ה",
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
        totalAnswers === 0
          ? "אין עדיין נתונים"
          : safeNum(summary.accuracy) >= 75
            ? "מתקדם/ת יפה"
            : safeNum(summary.accuracy) >= 50
              ? "בתהליך"
              : "דורש/ת תמיכה",
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
      subject: "—",
      mode: "תרגול",
      status: safeNum(d.answers) > 0 ? "פעיל" : "ללא נתונים",
      date: formatDateHe(d.date),
      meta: `${safeNum(d.sessions)} מפגשים · ${safeNum(d.answers)} תשובות`,
    }));

  const recentFromMistakes = (body?.recentMistakes || []).slice(0, 5).map((m, i) => ({
    id: `m-${i}`,
    title: formatTopicLineHe(m.subject, m.topic) || "טעות בתרגול",
    subject: schoolSubjectLabelHe(m.subject),
    mode: "תרגול",
    status: "טעות",
    date: formatDateHe(m.answeredAt || m.date),
    meta: m.topic ? null : null,
  }));

  const recentItems = recentFromDaily.length ? recentFromDaily : recentFromMistakes;

  const focusItems = (guidance.nextPracticeFocus || []).slice(0, 6).map((t) => ({
    label: formatTopicLineHe(t.subject, t.topic) || schoolSubjectLabelHe(t.subject),
    detail: t.accuracy != null ? `דיוק ${formatPercent(t.accuracy)}` : null,
  }));

  const recommendationItems = (guidance.supportSuggestions || [])
    .slice(0, 5)
    .map((s, i) => {
      const code = typeof s === "string" ? s : s.label || s.code || "";
      const label = supportSuggestionHe(code) || (typeof s === "object" ? s.label : null) || `המלצה ${i + 1}`;
      return {
        label,
        detail: typeof s === "object" ? s.detail || null : null,
      };
    });

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
        empty: "אין נושאים ממוקדים — המשיכו מעקב.",
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

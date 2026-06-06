import {
  isoDateOnly,
  REPORT_AGG_SUBJECTS,
} from "../parent-server/report-data-aggregate.server.js";
import { writeTeacherAuditRow } from "./teacher-audit.server.js";
import { loadClassMembers, loadTeacherClassOwned } from "./teacher-classes.server.js";
import { buildClassTeacherGuidanceV2 } from "./teacher-guidance-v2.server.js";
import { isUuid } from "./teacher-request.server.js";
import { buildRosterStudentReportEntries } from "./roster-report-student-entries.server.js";
import {
  loadClassroomActivityRollupsForClassReport,
  mergeClassroomActivityRollupIntoReportPayload,
} from "./classroom-activity-class-report.server.js";

function emptySubjectRollup() {
  return {
    sessions: 0,
    answers: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    topics: {},
  };
}

function mergeTopicRollup(target, sourceTopic) {
  if (!sourceTopic || typeof sourceTopic !== "object") return;
  const key = String(sourceTopic.topic || sourceTopic.name || "general");
  if (!target.topics[key]) {
    target.topics[key] = { topic: key, answers: 0, correct: 0, wrong: 0, accuracy: 0 };
  }
  const t = target.topics[key];
  t.answers += Number(sourceTopic.answers) || 0;
  t.correct += Number(sourceTopic.correct) || 0;
  t.wrong += Number(sourceTopic.wrong) || 0;
}

function finalizeSubjectRollup(subject) {
  subject.accuracy =
    subject.answers > 0 ? Number(((subject.correct / subject.answers) * 100).toFixed(2)) : 0;
  for (const topic of Object.values(subject.topics)) {
    topic.accuracy =
      topic.answers > 0 ? Number(((topic.correct / topic.answers) * 100).toFixed(2)) : 0;
  }
}

/**
 * @param {Array<Record<string, unknown>>} studentPayloads
 * @param {{ scopeSubjects?: Set<string>|null }} [opts]
 */
export function aggregateClassReportFromStudentPayloads(studentPayloads, opts = {}) {
  const scopeSubjects = opts.scopeSubjects || null;
  const cohortSubjects = {};
  for (const subject of REPORT_AGG_SUBJECTS) {
    cohortSubjects[subject] = emptySubjectRollup();
  }

  let totalSessions = 0;
  let totalAnswers = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let studentsWithActivity = 0;
  const dailyMap = new Map();
  const weaknessMap = new Map();
  const attentionCandidates = [];

  for (const entry of studentPayloads) {
    const payload = entry.payload;
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const sessions = Number(summary.totalSessions) || 0;
    const answers = Number(summary.totalAnswers) || 0;
    const correct = Number(summary.correctAnswers) || 0;
    const wrong = Number(summary.wrongAnswers) || 0;

    totalSessions += sessions;
    totalAnswers += answers;
    correctAnswers += correct;
    wrongAnswers += wrong;
    if (sessions > 0 || answers > 0) {
      studentsWithActivity += 1;
    }

    const accuracy = answers > 0 ? (correct / answers) * 100 : null;
    const recentMistakes = Array.isArray(payload?.recentMistakes) ? payload.recentMistakes : [];
    let attentionScore = 0;
    const reasons = [];

    if (answers === 0 && sessions === 0) {
      attentionScore += 3;
      reasons.push("no_activity_in_range");
    } else if (accuracy != null && accuracy < 65 && answers >= 3) {
      attentionScore += accuracy < 50 ? 3 : 2;
      reasons.push("low_accuracy");
    }
    if (recentMistakes.length >= 5) {
      attentionScore += 2;
      reasons.push("many_recent_mistakes");
    } else if (recentMistakes.length >= 3) {
      attentionScore += 1;
      reasons.push("recent_mistakes");
    }

    if (attentionScore > 0) {
      attentionCandidates.push({
        studentId: entry.studentId,
        studentFullName: entry.studentFullName || null,
        studentFullNameMasked: entry.studentFullNameMasked,
        attentionScore,
        reasons,
        accuracy: accuracy != null ? Number(accuracy.toFixed(2)) : null,
        totalAnswers: answers,
        recentMistakeCount: recentMistakes.length,
      });
    }

    const subjects = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : {};
    for (const subjectKey of REPORT_AGG_SUBJECTS) {
      if (scopeSubjects && !scopeSubjects.has(subjectKey)) continue;
      const src = subjects[subjectKey];
      if (!src) continue;
      const agg = cohortSubjects[subjectKey];
      agg.sessions += Number(src.sessions) || 0;
      agg.answers += Number(src.answers) || 0;
      agg.correct += Number(src.correct) || 0;
      agg.wrong += Number(src.wrong) || 0;
      for (const topicKey of Object.keys(src.topics || {})) {
        mergeTopicRollup(agg, { ...src.topics[topicKey], topic: topicKey });
        const topic = src.topics[topicKey];
        const wrongCount = Number(topic?.diagnosticWrong ?? topic?.wrong) || 0;
        if (wrongCount > 0) {
          const mapKey = `${subjectKey}::${topicKey}`;
          const prev = weaknessMap.get(mapKey) || {
            subject: subjectKey,
            topic: topicKey,
            wrong: 0,
            answers: 0,
            studentIds: new Set(),
          };
          prev.wrong += wrongCount;
          prev.answers += Number(topic?.diagnosticAnswers ?? topic?.answers) || 0;
          prev.studentIds.add(entry.studentId);
          weaknessMap.set(mapKey, prev);
        }
      }
    }

    for (const day of payload?.dailyActivity || []) {
      if (!day?.date) continue;
      const prev = dailyMap.get(day.date) || {
        date: day.date,
        sessions: 0,
        answers: 0,
        correct: 0,
        wrong: 0,
        durationSeconds: 0,
      };
      prev.sessions += Number(day.sessions) || 0;
      prev.answers += Number(day.answers) || 0;
      prev.correct += Number(day.correct) || 0;
      prev.wrong += Number(day.wrong) || 0;
      prev.durationSeconds += Number(day.durationSeconds) || 0;
      dailyMap.set(day.date, prev);
    }
  }

  for (const subject of REPORT_AGG_SUBJECTS) {
    finalizeSubjectRollup(cohortSubjects[subject]);
  }

  const cohortAccuracy =
    totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : 0;

  const weaknessTopics = [...weaknessMap.values()]
    .map((row) => ({
      subject: row.subject,
      topic: row.topic,
      wrong: row.wrong,
      answers: row.answers,
      studentCount: row.studentIds.size,
      studentIds: [...row.studentIds],
    }))
    .sort((a, b) => b.wrong - a.wrong || b.studentCount - a.studentCount)
    .slice(0, 20);

  const attentionList = attentionCandidates
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 20);

  const recentActivity = {
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    totalSessions,
    totalAnswers,
  };

  return {
    cohortSummary: {
      totalSessions,
      totalAnswers,
      correctAnswers,
      wrongAnswers,
      accuracy: cohortAccuracy,
      studentsWithActivity,
    },
    subjects: cohortSubjects,
    weaknessTopics,
    attentionList,
    recentActivity,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} classId
 */
export async function writeTeacherViewClassReportAuditIfNeeded(serviceRole, teacherId, classId) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { data: recentAudits } = await serviceRole
    .from("teacher_access_audit")
    .select("id, metadata")
    .eq("teacher_id", teacherId)
    .eq("action", "viewed_class_report")
    .gte("created_at", dayStart.toISOString())
    .limit(100);

  const alreadyLogged = (recentAudits || []).some(
    (row) => row?.metadata && typeof row.metadata === "object" && row.metadata.class_id === classId
  );
  if (alreadyLogged) return;

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    action: "viewed_class_report",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: { class_id: classId, source: "class_report" },
  });
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   classId: string,
 *   fromDate: Date,
 *   toDate: Date,
 *   skipAudit?: boolean,
 * }} input
 */
export async function buildTeacherClassReportPayload(input) {
  const { serviceRole, teacherId, classId, fromDate, toDate, skipAudit = false } = input;

  const owned = await loadTeacherClassOwned(serviceRole, teacherId, classId);
  if (!owned.ok) return owned;

  const members = await loadClassMembers(serviceRole, classId);
  if (!members.ok) return members;

  const row = owned.row;
  const subjectFocus = row.subject_focus
    ? String(row.subject_focus).trim().toLowerCase()
    : null;
  const scopeSubjects = subjectFocus ? new Set([subjectFocus]) : null;

  const studentIds = members.members.map((m) => m.studentId);
  const classroomRollups = await loadClassroomActivityRollupsForClassReport({
    serviceRole,
    classId,
    studentIds,
    fromDate,
    toDate,
  });
  if (!classroomRollups.ok) return classroomRollups;

  const rosterBuilt = await buildRosterStudentReportEntries({
    serviceRole,
    members: members.members,
    fromDate,
    toDate,
    sessionSubjectFilter: subjectFocus,
  });
  if (!rosterBuilt.ok) return rosterBuilt;

  const studentPayloads = rosterBuilt.entries.map((entry) => {
    const rollup = classroomRollups.byStudentId.get(entry.studentId);
    if (rollup?.answers) {
      mergeClassroomActivityRollupIntoReportPayload(entry.payload, rollup);
    }
    return entry;
  });
  const studentSummaries = studentPayloads.map((entry) => ({
    studentId: entry.studentId,
    studentFullName: entry.studentFullName,
    studentFullNameMasked: entry.studentFullNameMasked,
    membershipId: entry.membershipId,
    summary: entry.payload.summary || null,
    guardianAccessSummary: null,
  }));

  const aggregated = aggregateClassReportFromStudentPayloads(studentPayloads, {
    scopeSubjects,
  });

  if (!skipAudit) {
    writeTeacherViewClassReportAuditIfNeeded(serviceRole, teacherId, classId).catch(() => {});
  }

  const roster = {
    studentCount: members.members.length,
    activeMemberCount: members.members.length,
  };

  const classPayloadForGuidance = {
    ...aggregated,
    students: studentSummaries,
    roster,
  };

  const teacherGuidanceBlock = buildClassTeacherGuidanceV2(classPayloadForGuidance, {
    subjectScope: subjectFocus,
    studentPayloads,
  });

  return {
    ok: true,
    payload: {
      ok: true,
      class: {
        classId: row.id,
        name: row.name,
        gradeLevel: row.grade_level,
        subjectFocus: row.subject_focus,
        isArchived: Boolean(row.is_archived || row.archived_at),
      },
      range: {
        from: isoDateOnly(fromDate),
        to: isoDateOnly(toDate),
      },
      roster,
      ...aggregated,
      students: studentSummaries,
      teacherGuidanceBlock,
      reportMeta: {
        audience: "teacher",
        source: "class_report",
        version: "phase-7b-v1",
      },
    },
  };
}

export function parseTeacherReportClassIdParam(raw) {
  if (!isUuid(raw)) {
    return { ok: false, code: "validation_failed", field: "classId" };
  }
  return { ok: true, classId: String(raw).trim() };
}

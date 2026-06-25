import { aggregateParentReportPayload } from "../../../../lib/parent-server/report-data-aggregate.server.js";
import { collectTopicEngineRowsFromReport } from "../../../../utils/parent-report-engine-insights-he.js";
import { extractDecisionsFromV2Report } from "./engine-decision-debug.mjs";
import { buildParentReportV2FromAggregate } from "./report-v2-bridge.mjs";
import { SEED_META_KEY } from "./constants.mjs";
import { createServiceClient } from "./supabase.mjs";

function parseReportDate(value) {
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  return new Date(value);
}

/**
 * Debug parent_assigned_only profile — evidence path into aggregate + V2.
 */
export async function buildParentAssignedDebug({ students, fromDate, toDate, runId }) {
  const supabase = createServiceClient();
  const sample =
    students.find((s) => s.profile === "parent_assigned_only") ||
    students.find((s) => s.profile === "parent_assigned_only");

  if (!sample) {
    return { error: "no parent_assigned_only student in manifest" };
  }

  const from = parseReportDate(fromDate);
  const to = parseReportDate(toDate);
  const fromIso = from.toISOString();
  const toIso = new Date(`${to.toISOString().slice(0, 10)}T23:59:59.999Z`).toISOString();

  const { data: row } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("id", sample.studentId)
    .maybeSingle();

  const [{ count: activityCount }, { count: attemptCount }, { data: activities }, { data: attempts }] =
    await Promise.all([
      supabase
        .from("parent_assigned_activities")
        .select("id", { count: "exact", head: true })
        .eq("student_id", sample.studentId),
      supabase
        .from("parent_activity_attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_id", sample.studentId),
      supabase
        .from("parent_assigned_activities")
        .select("id, subject, topic, question_count, status, title")
        .eq("student_id", sample.studentId)
        .limit(5),
      supabase
        .from("parent_activity_attempts")
        .select("id, is_correct, answered_at, time_spent_ms, question_snapshot, activity_id")
        .eq("student_id", sample.studentId)
        .gte("answered_at", fromIso)
        .lt("answered_at", toIso)
        .limit(5),
    ]);

  const { count: learningSessionCount } = await supabase
    .from("learning_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", sample.studentId);

  const raw = await aggregateParentReportPayload(supabase, row, from, to, {
    includeParentActivities: true,
  });
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: row.full_name,
    fromDate: from,
    toDate: to,
  });
  const v2Rows = collectTopicEngineRowsFromReport(v2);
  const { findings } = extractDecisionsFromV2Report(v2, row.grade_level);

  const subjectKeys = Object.keys(raw.subjects || {});
  const aggregateTopicCounts = {};
  for (const subj of subjectKeys) {
    const topics = raw.subjects[subj]?.topics || {};
    for (const [tk, tv] of Object.entries(topics)) {
      aggregateTopicCounts[`${subj}:${tk}`] = tv.answers ?? tv.diagnosticAnswers ?? 0;
    }
  }

  const parentInSummary = {
    totalAnswers: raw.summary?.totalAnswers,
    diagnosticAnswers: raw.summary?.diagnosticAnswers,
    modeCounts: raw.summary?.modeCounts,
  };

  const attemptSample = (attempts || []).map((a) => {
    const snap =
      a.question_snapshot && typeof a.question_snapshot === "object" ? a.question_snapshot : {};
    return {
      isCorrect: a.is_correct,
      answeredAt: a.answered_at,
      timeSpentMs: a.time_spent_ms,
      subject: snap.subject,
      topic: snap.topic,
      hasSeedMeta: snap.clientMeta?.[SEED_META_KEY] === runId,
      evidenceCategory: snap.evidenceCategory,
    };
  });

  let dropPoint = "ok";
  if (!activityCount) dropPoint = "no parent_assigned_activities rows";
  else if (!attemptCount) dropPoint = "no parent_activity_attempts rows";
  else if (raw.summary?.totalAnswers === 0) dropPoint = "aggregate summary totalAnswers=0";
  else if (v2Rows.length === 0) dropPoint = "V2 topic rows empty after localStorage bridge";
  else if (findings.length === 0) dropPoint = "V2 rows exist but no engineDiagnosticDecision";

  return {
    sampleStudent: {
      login: sample.login,
      studentId: sample.studentId,
      profile: sample.profile,
      grade: sample.grade,
      primarySubject: sample.primarySubject,
    },
    counts: {
      parentActivities: activityCount || 0,
      parentAttempts: attemptCount || 0,
      learningSessions: learningSessionCount || 0,
      attemptsInDateRange: attempts?.length || 0,
    },
    activities: activities || [],
    attemptSample,
    aggregate: {
      summary: parentInSummary,
      dataSufficiency: raw.meta?.evidenceQuality?.student?.dataSufficiency,
      topicAnswerCounts: aggregateTopicCounts,
    },
    v2: {
      topicRowCount: v2Rows.length,
      decisions: findings.map((f) => f.engineDecision),
      sampleRows: v2Rows.slice(0, 3).map((r) => ({
        subjectId: r.subjectId,
        topicKey: r.topicKey,
        questions: r.questions,
        accuracy: r.accuracy,
      })),
    },
    dropPoint,
    goal:
      "Parent-assigned activity should count as diagnostic evidence in aggregate/V2 — not as a separate parent-facing row.",
  };
}

export function buildParentAssignedDebugMarkdown(debug) {
  if (debug.error) return `# Parent Assigned Debug\n\n${debug.error}\n`;

  const s = debug.sampleStudent;
  const lines = [
    "# Parent Assigned Debug",
    "",
    `## Sample: ${s.login} (${s.profile}, grade ${s.grade})`,
    "",
    "### Counts",
    `- parent_assigned_activities: ${debug.counts.parentActivities}`,
    `- parent_activity_attempts (all): ${debug.counts.parentAttempts}`,
    `- parent attempts in date range: ${debug.counts.attemptsInDateRange}`,
    `- learning_sessions (self): ${debug.counts.learningSessions}`,
    "",
    "### Aggregate",
    `- totalAnswers: ${debug.aggregate.summary.totalAnswers}`,
    `- diagnosticAnswers: ${debug.aggregate.summary.diagnosticAnswers}`,
    `- dataSufficiency: ${debug.aggregate.dataSufficiency}`,
    `- topic counts: ${JSON.stringify(debug.aggregate.topicAnswerCounts)}`,
    "",
    "### V2 bridge",
    `- topic rows: ${debug.v2.topicRowCount}`,
    `- decisions: ${debug.v2.decisions.join(", ") || "—"}`,
    "",
    "### Drop point",
    debug.dropPoint,
    "",
    "### Goal",
    debug.goal,
  ];
  return `${lines.join("\n")}\n`;
}

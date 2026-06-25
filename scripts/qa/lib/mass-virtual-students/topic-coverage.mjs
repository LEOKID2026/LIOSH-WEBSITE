import { subjectLabelHe, topicLabelHe } from "../../../../lib/teacher-portal/teacher-ui.he.js";
import { SEED_META_KEY } from "./constants.mjs";
import { createServiceClient } from "./supabase.mjs";

const LOW_SAMPLE_ANSWERS = 5;
const COVERED_ANSWERS = 10;

function topicStatus(totalAnswers) {
  if (totalAnswers >= COVERED_ANSWERS) return "COVERED";
  if (totalAnswers > 0) return "LOW_SAMPLE";
  return "MISSING";
}

function missingMetadataCount(payload) {
  if (!payload || typeof payload !== "object") return 4;
  let missing = 0;
  if (!payload.questionEngine && !payload.diagnosticMetadata) missing += 1;
  if (!payload.params?.skillId && !payload.skillId) missing += 1;
  if (!payload.params?.subskillId && !payload.subSkill) missing += 1;
  if (!payload.patternFamily && !payload.diagnosticMetadata?.patternFamily) missing += 1;
  return missing;
}

/**
 * Build topic-level (+ optional subskill) coverage rows from DB + engine findings.
 */
export async function buildTopicCoverage({
  students,
  fromDate,
  toDate,
  runId,
  engineFindings = [],
}) {
  const supabase = createServiceClient();
  const fromIso = `${fromDate}T00:00:00.000Z`;
  const toIso = `${toDate}T23:59:59.999Z`;
  const studentIds = students.map((s) => s.studentId);

  const { data: answers } = await supabase
    .from("answers")
    .select("student_id, is_correct, answer_payload, learning_session_id")
    .in("student_id", studentIds)
    .gte("answered_at", fromIso)
    .lt("answered_at", toIso);

  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id, student_id, subject, topic")
    .in("student_id", studentIds)
    .gte("started_at", fromIso)
    .lt("started_at", toIso);

  const sessionTopic = new Map((sessions || []).map((s) => [s.id, { subject: s.subject, topic: s.topic }]));

  const cells = new Map();
  for (const ans of answers || []) {
    const payload = ans.answer_payload || {};
    if (payload.clientMeta?.[SEED_META_KEY] !== runId && !payload.params?.clientMeta?.[SEED_META_KEY]) {
      // include all answers for student in range (run-scoped students only)
    }
    const sess = sessionTopic.get(ans.learning_session_id);
    const subject = payload.subject || sess?.subject || "unknown";
    const topic = payload.topic || sess?.topic || "general";
    const student = students.find((s) => s.studentId === ans.student_id);
    const grade = student?.grade ?? "?";
    const key = `${subject}|${grade}|${topic}`;

    if (!cells.has(key)) {
      cells.set(key, {
        subject,
        grade,
        topicKey: topic,
        topicName: topicLabelHe(subject, topic) || topic,
        totalSessions: new Set(),
        totalAnswers: 0,
        correct: 0,
        students: new Set(),
        missingMetadataSum: 0,
        skillIds: new Set(),
        subskillIds: new Set(),
        safeSubskill: null,
        decisionsObserved: new Set(),
      });
    }
    const cell = cells.get(key);
    cell.totalAnswers += 1;
    if (ans.is_correct) cell.correct += 1;
    cell.students.add(ans.student_id);
    if (ans.learning_session_id) cell.totalSessions.add(ans.learning_session_id);
    cell.missingMetadataSum += missingMetadataCount(payload);
    const sk = payload.skillId || payload.params?.skillId || payload.questionEngine?.skillId;
    const sub = payload.subSkill || payload.params?.subskillId || payload.questionEngine?.subskillId;
    if (sk) cell.skillIds.add(sk);
    if (sub) cell.subskillIds.add(sub);
  }

  for (const f of engineFindings) {
    const topicKey = String(f.topicKey || "").split("::grade:")[0] || f.topicKey;
    const student = students.find((s) => s.studentId === f.studentId);
    if (!student) continue;
    const key = `${f.subjectId}|${student.grade}|${topicKey}`;
    const cell = cells.get(key);
    if (cell && f.engineDecision) cell.decisionsObserved.add(f.engineDecision);
  }

  const rows = [...cells.values()]
    .map((c) => ({
      subject: c.subject,
      grade: c.grade,
      topicKey: c.topicKey,
      topicName: c.topicName,
      totalSessions: c.totalSessions.size,
      totalAnswers: c.totalAnswers,
      studentsCovered: c.students.size,
      correctRate: c.totalAnswers ? Math.round((c.correct / c.totalAnswers) * 1000) / 10 : 0,
      decisionsObserved: [...c.decisionsObserved].sort().join("|") || "",
      missingMetadataCount: c.missingMetadataSum,
      skillId: [...c.skillIds].slice(0, 3).join("|") || "",
      subskillId: [...c.subskillIds].slice(0, 3).join("|") || "",
      safeSubskill: "",
      status: topicStatus(c.totalAnswers),
    }))
    .sort((a, b) =>
      `${a.subject}:${a.grade}:${a.topicKey}`.localeCompare(`${b.subject}:${b.grade}:${b.topicKey}`),
    );

  const subskillNote =
    rows.some((r) => r.skillId || r.subskillId)
      ? rows.every((r) => r.subskillId)
        ? "subskill ids present on seeded answers (partial catalog mapping not validated)"
        : "subskill coverage partial - catalog mapping missing on some topic cells"
      : "subskill coverage partial - catalog mapping missing";

  return { rows, subskillNote, subjectLabels: Object.fromEntries(
    [...new Set(rows.map((r) => r.subject))].map((s) => [s, subjectLabelHe(s) || s]),
  ) };
}

export function topicCoverageToCsv(rows) {
  const header =
    "subject,grade,topicKey,topicName,totalSessions,totalAnswers,studentsCovered,correctRate,decisionsObserved,missingMetadataCount,skillId,subskillId,safeSubskill,status";
  const body = rows
    .map((r) =>
      [
        r.subject,
        r.grade,
        r.topicKey,
        `"${String(r.topicName || "").replace(/"/g, '""')}"`,
        r.totalSessions,
        r.totalAnswers,
        r.studentsCovered,
        r.correctRate,
        `"${r.decisionsObserved}"`,
        r.missingMetadataCount,
        r.skillId,
        r.subskillId,
        r.safeSubskill,
        r.status,
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

export function buildTopicCoverageMarkdown({ rows, subskillNote }) {
  const covered = rows.filter((r) => r.status === "COVERED").length;
  const low = rows.filter((r) => r.status === "LOW_SAMPLE").length;
  const missing = rows.filter((r) => r.status === "MISSING").length;
  const lines = [
    "# Topic-Level Coverage",
    "",
    `Cells: ${rows.length} | COVERED: ${covered} | LOW_SAMPLE: ${low} | MISSING: ${missing}`,
    "",
    `**Subskill:** ${subskillNote}`,
    "",
    "| subject | grade | topic | answers | students | correct% | decisions | status |",
    "| ------- | ----- | ----- | ------- | -------- | -------- | --------- | ------ |",
  ];
  for (const r of rows.slice(0, 80)) {
    lines.push(
      `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${r.totalAnswers} | ${r.studentsCovered} | ${r.correctRate} | ${r.decisionsObserved || "—"} | ${r.status} |`,
    );
  }
  if (rows.length > 80) lines.push(`| … | | | +${rows.length - 80} more | | | | |`);
  return `${lines.join("\n")}\n`;
}

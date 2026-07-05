#!/usr/bin/env node
/**
 * Read-only answer-level time provenance for parent report topic+grade rows.
 *
 * Run: node scripts/parent-report-topic-time-answer-provenance.mjs
 * Output: docs/audits/parent-report-topic-time-answer-provenance.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-topic-time-answer-provenance.json");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

const PRIORITY_USERNAMES = ["omer", "aaa7"];
const MIN_EXTRA_STUDENTS = 5;
const DEFAULT_RANGE = { from: "2025-09-01", to: "2026-07-04" };
const HIGH_ANSWER_MS = 600_000;
const VERY_HIGH_ANSWER_MS = 3_600_000;

const SUBJECT_IDS = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
  "hebrew",
  "moledet_geography",
];

const REPORT_MAP_KEYS = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historyTopics",
  hebrew: "hebrewTopics",
  moledet_geography: "moledetGeographyTopics",
};

const FOCUS_ROWS = [
  { username: "omer", subject: "math", topic: "fractions", grade: "g5" },
  { username: "omer", subject: "math", topic: "fractions", grade: "g4" },
  { username: "omer", subject: "math", topic: "multiplication", grade: "g5" },
  { username: "omer", subject: "math", topic: "decimals", grade: "g5" },
  { username: "omer", subject: "hebrew", topic: "reading", grade: "g5" },
  { username: "omer", subject: "hebrew", topic: "comprehension", grade: "g5" },
];

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { buildTopicMapsFromDbInput, topicDurationSeconds } = await load(
  "lib/learning/report-visible-practice-sync.js",
);
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { buildRegularReportViewModel } = await load("lib/parent-ui/parent-report-regular-display.js");
const { resolveRegisteredGradeKeyFromReport } = await load("lib/parent-ui/parent-report-regular-display.js");
const { buildGradeFilteredTopicMapsForRegularReport } = await load(
  "lib/parent-ui/parent-report-regular-time.js",
);
const { resolveContentGradeFromAnswerPayload } = await load(
  "lib/learning-supabase/practice-grade-resolution.js",
);
const { normalizeGradeLevelToKey } = await load("lib/learning-student-defaults.js");
const { isParentReportPracticeAnswer } = await load("lib/learning/parent-report-evidence-gate.js");
const { normalizeLearningGameMode } = await load("lib/learning-supabase/learning-activity.js");
const { classifyActivityEvidence, EVIDENCE_CATEGORIES, MODE_CLASSIFICATION_MAP } = await load(
  "lib/learning/activity-classification.js",
);

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return null;
  return new Date(`${s}T00:00:00.000Z`);
}

function answerTimeMs(payload) {
  const v = payload?.creditedTimeMs ?? payload?.timeSpentMs;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function median(sorted) {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function statsFromTimesMs(timesMs) {
  const sorted = [...timesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((s, t) => s + t, 0);
  return {
    count: sorted.length,
    sumMs: sum,
    sumMinutes: Math.round(sum / 60000),
    sumSeconds: Math.round(sum / 1000),
    avgSeconds: sorted.length ? Number((sum / sorted.length / 1000).toFixed(2)) : null,
    medianSeconds: sorted.length ? Number((median(sorted) / 1000).toFixed(2)) : null,
    p90Seconds: sorted.length ? Number((percentile(sorted, 90) / 1000).toFixed(2)) : null,
    maxSeconds: sorted.length ? Number((sorted[sorted.length - 1] / 1000).toFixed(2)) : null,
    missingTimeCount: 0,
    highTimeCount: sorted.filter((t) => t >= HIGH_ANSWER_MS).length,
    veryHighTimeCount: sorted.filter((t) => t >= VERY_HIGH_ANSWER_MS).length,
  };
}

async function resolveStudentByUsername(supabase, username) {
  const un = String(username || "").trim().toLowerCase();
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username,is_active")
    .eq("login_username", un)
    .eq("is_active", true)
    .limit(1);
  if (!codes?.[0]?.student_id) return null;
  const { data: row } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,leo_number")
    .eq("id", codes[0].student_id)
    .maybeSingle();
  return row?.id ? { ...row, login_username: un } : null;
}

async function discoverStudents(supabase) {
  const picked = new Map();
  for (const un of PRIORITY_USERNAMES) {
    const s = await resolveStudentByUsername(supabase, un);
    if (s) picked.set(s.id, { ...s, pickReason: "priority" });
  }
  const { data: sessionRows } = await supabase
    .from("learning_sessions")
    .select("student_id, subject")
    .gte("started_at", `${DEFAULT_RANGE.from}T00:00:00.000Z`)
    .lte("started_at", `${DEFAULT_RANGE.to}T23:59:59.999Z`)
    .limit(5000);
  const activity = new Map();
  for (const r of sessionRows || []) {
    if (!r?.student_id) continue;
    const cur = activity.get(r.student_id) || { sessions: 0, subjects: new Set() };
    cur.sessions += 1;
    if (r.subject) cur.subjects.add(r.subject);
    activity.set(r.student_id, cur);
  }
  const ranked = [...activity.entries()]
    .map(([id, meta]) => ({ id, ...meta, subjectCount: meta.subjects.size }))
    .sort((a, b) => b.sessions - a.sessions);
  for (const entry of ranked) {
    if (picked.size >= PRIORITY_USERNAMES.length + MIN_EXTRA_STUDENTS + 3) break;
    if (picked.has(entry.id)) continue;
    picked.set(entry.id, {
      id: entry.id,
      pickReason: entry.sessions >= 100 ? "high_volume" : entry.sessions <= 5 ? "low_volume" : "multi_subject",
    });
  }
  const ids = [...picked.keys()];
  if (!ids.length) return [];
  const { data: students } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,leo_number")
    .in("id", ids);
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username")
    .in("student_id", ids);
  const userById = new Map((codes || []).map((c) => [c.student_id, c.login_username]));
  return (students || []).map((s) => ({
    ...s,
    login_username: userById.get(s.id) || null,
    pickReason: picked.get(s.id)?.pickReason || "discovered",
  }));
}

async function fetchAnswersAndSessions(supabase, studentId, range) {
  const fromIso = `${range.from}T00:00:00.000Z`;
  const toIsoExclusive = `${range.to}T23:59:59.999Z`;
  const { data: answers, error: aErr } = await supabase
    .from("answers")
    .select("id,student_id,learning_session_id,question_id,is_correct,answer_payload,answered_at,created_at")
    .eq("student_id", studentId)
    .gte("answered_at", fromIso)
    .lt("answered_at", toIsoExclusive);
  if (aErr) throw aErr;

  const sessionIds = [...new Set((answers || []).map((a) => a.learning_session_id).filter(Boolean))];
  let sessions = [];
  if (sessionIds.length) {
    const { data, error } = await supabase
      .from("learning_sessions")
      .select("id,subject,topic,duration_seconds,metadata,started_at,status")
      .in("id", sessionIds);
    if (error) throw error;
    sessions = data || [];
  }
  const sessionById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  return { answers: answers || [], sessionById };
}

const ANSWER_MODE_CLASSIFICATION_MODES = new Set([
  "practice",
  "quiz",
  "guided_practice",
  "homework",
  "learning",
  "mistakes",
  "challenge",
  "speed",
  "marathon",
  "learning_book",
  "discussion",
  "live_lesson",
]);

function classifyAnswerEvidence(payload, resolvedMode, contextFlags) {
  const normalizedMode = typeof resolvedMode === "string" ? resolvedMode.trim().toLowerCase() : "";
  if (normalizedMode && ANSWER_MODE_CLASSIFICATION_MODES.has(normalizedMode)) {
    const derived = classifyActivityEvidence(normalizedMode, "free_practice", {
      afterStepByStep: contextFlags.afterStepByStep === true,
      contextAfterBookReading: contextFlags.contextAfterBookReading === true,
      hintsUsed: typeof payload.hintsUsed === "number" ? payload.hintsUsed : 0,
    });
    return {
      isDiagnosticEligible: derived.isDiagnosticEligible,
      evidenceCategory: derived.evidenceCategory,
    };
  }
  if (payload.isDiagnosticEligible !== undefined) {
    const isDiag = payload.isDiagnosticEligible === true;
    return {
      isDiagnosticEligible: isDiag,
      evidenceCategory:
        typeof payload.evidenceCategory === "string"
          ? payload.evidenceCategory
          : isDiag
            ? EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT
            : EVIDENCE_CATEGORIES.UNCLASSIFIED,
    };
  }
  if (resolvedMode && resolvedMode !== "unknown") {
    const entry = MODE_CLASSIFICATION_MAP[resolvedMode];
    if (entry) {
      return {
        isDiagnosticEligible: entry.isDiagnosticEligible,
        evidenceCategory: entry.evidenceCategory,
      };
    }
  }
  return { isDiagnosticEligible: false, evidenceCategory: EVIDENCE_CATEGORIES.UNCLASSIFIED };
}

function classifyAnswerRowForReport(answer, sessionById, registeredGradeKey) {
  const payload =
    answer.answer_payload && typeof answer.answer_payload === "object" && !Array.isArray(answer.answer_payload)
      ? answer.answer_payload
      : {};
  const sessionRef = sessionById[answer.learning_session_id] || null;
  const subject = String(payload.subject || sessionRef?.subject || "").trim();
  const topic = String(payload.topic || sessionRef?.topic || "general").trim();
  const clientMetaObj =
    payload.clientMeta && typeof payload.clientMeta === "object" && !Array.isArray(payload.clientMeta)
      ? payload.clientMeta
      : null;
  const payloadModeNorm = normalizeLearningGameMode(payload.gameMode) || normalizeLearningGameMode(payload.mode);
  const clientModeNorm =
    normalizeLearningGameMode(clientMetaObj?.gameMode) || normalizeLearningGameMode(clientMetaObj?.mode);
  const resolvedMode = payloadModeNorm || clientModeNorm || "unknown";
  const contextFlags =
    payload.contextFlags && typeof payload.contextFlags === "object" ? payload.contextFlags : {};
  const answerClassification = classifyAnswerEvidence(payload, resolvedMode, contextFlags);
  if (
    !isParentReportPracticeAnswer({
      evidenceCategory: answerClassification.evidenceCategory,
      isDiagnosticEligible: answerClassification.isDiagnosticEligible,
      contextFlags,
      resolvedMode,
    })
  ) {
    return null;
  }
  const contentGradeKey =
    resolveContentGradeFromAnswerPayload(payload, sessionRef?.metadata, registeredGradeKey) ||
    sessionRef?.metadata?.contentGradeLevel ||
    "unknown";
  return {
    subject,
    topic,
    contentGradeKey,
    timeMs: answerTimeMs(payload),
    sessionId: answer.learning_session_id,
    sessionTopic: sessionRef?.topic || null,
    sessionSubject: sessionRef?.subject || null,
    sessionDurationSeconds: safeNum(sessionRef?.duration_seconds),
    sessionTopicMismatch: sessionRef && String(sessionRef.topic || "") !== topic,
    sessionSubjectMismatch: sessionRef && String(sessionRef.subject || "") !== subject,
    payloadTopic: payload.topic || null,
    payloadSubject: payload.subject || null,
  };
}

function bucketKey(subject, topic, grade) {
  return `${subject}::${topic}::${grade}`;
}

function buildAnswerBuckets(answers, sessionById, registeredGradeKey) {
  /** @type {Map<string, object[]>} */
  const buckets = new Map();
  for (const answer of answers) {
    const row = classifyAnswerRowForReport(answer, sessionById, registeredGradeKey);
    if (!row || !row.subject) continue;
    const key = bucketKey(row.subject, row.topic, row.contentGradeKey);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  return buckets;
}

function collectDbInputTopicGradeRows(dbInput) {
  const rows = [];
  const subjects = dbInput?.subjects || {};
  for (const subjectId of SUBJECT_IDS) {
    const sub = subjects[subjectId];
    if (!sub?.topics) continue;
    for (const [adapterKey, topic] of Object.entries(sub.topics)) {
      const q = Math.max(0, Math.floor(safeNum(topic?.total)));
      if (q <= 0) continue;
      const gradeMatch = adapterKey.match(/::grade:(.+)$/);
      const topicKey = gradeMatch ? adapterKey.slice(0, adapterKey.indexOf("::grade:")) : adapterKey;
      const grade = gradeMatch ? gradeMatch[1] : topic.contentGradeLevel || "unknown";
      rows.push({
        subject: subjectId,
        topic: topicKey,
        grade,
        adapterKey,
        questions: q,
        dbTopic: topic,
      });
    }
  }
  return rows;
}

function detectProvenanceIssues(row) {
  const issues = [];
  const q = row.questions;
  const disp = row.displayedMinutes;
  const ans = row.answerLevel;

  if (q > 0 && disp <= 0 && ans.sumSeconds > 0) issues.push("display_zero_but_answer_time_exists");
  if (q > 0 && ans.count !== q) issues.push("answer_count_mismatch");
  if (ans.missingTimeCount > 0) issues.push("answers_missing_time");
  if (ans.veryHighTimeCount > 0) issues.push("very_high_single_answer_times");
  if (ans.highTimeCount >= 3) issues.push("multiple_high_answer_times");
  if (row.topicLevelDurationSeconds > 0 && row.apiSliceDurationSeconds <= 0 && ans.sumMs <= 0) {
    issues.push("topic_session_time_without_answer_time");
  }
  if (row.sessionTopicMismatchCount > 0) issues.push("session_topic_mismatch");
  if (row.sessionSubjectMismatchCount > 0) issues.push("session_subject_mismatch");
  if (row.crossGradeLeakSuspected) issues.push("cross_grade_leak_suspected");
  if (
    ans.sumSeconds > 0 &&
    disp > 0 &&
    Math.abs(disp * 60 - row.pipelineSeconds) > Math.max(120, ans.sumSeconds * 0.15)
  ) {
    issues.push("displayed_not_matching_answer_sum");
  }
  if (ans.avgSeconds != null && (ans.avgSeconds > 300 || (ans.avgSeconds < 2 && q >= 10))) {
    issues.push("avg_seconds_per_answer_outlier");
  }
  return issues;
}

async function auditStudent(supabase, student, range) {
  const fromDate = parseIsoDate(range.from);
  const toDate = parseIsoDate(range.to);
  if (!fromDate || !toDate) throw new Error("bad_range");

  const registeredGradeKey = normalizeGradeLevelToKey(student.grade_level);
  const { answers, sessionById } = await fetchAnswersAndSessions(supabase, student.id, range);
  const answerBuckets = buildAnswerBuckets(answers, sessionById, registeredGradeKey);

  const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  if (!reportApiBody?.ok) {
    return { student, error: reportApiBody?.error || "aggregate_failed", rows: [] };
  }

  const dbInput = buildReportInputFromDbData(reportApiBody, { period: "custom", timezone: "UTC" });
  const baseReport = {
    summary: {},
    registeredGradeKey,
    ...Object.fromEntries(Object.values(REPORT_MAP_KEYS).map((k) => [k, {}])),
    _reportApiPayload: reportApiBody,
  };
  syncReportVisiblePracticeFromServer(baseReport, { apiPayload: reportApiBody, dbInput });
  const filteredMaps = buildGradeFilteredTopicMapsForRegularReport(baseReport, registeredGradeKey);
  buildRegularReportViewModel(baseReport);

  const dbRows = collectDbInputTopicGradeRows(dbInput);
  const audited = [];

  for (const dbRow of dbRows) {
    const topicIn = reportApiBody?.subjects?.[dbRow.subject]?.topics?.[dbRow.topic];
    const slice = topicIn?.byContentGrade?.[dbRow.grade] || {};
    const mapKey = REPORT_MAP_KEYS[dbRow.subject];
    const dbTopic = dbRow.dbTopic;
    const bucket = answerBuckets.get(bucketKey(dbRow.subject, dbRow.topic, dbRow.grade)) || [];
    const timesMs = bucket.map((b) => b.timeMs).filter((t) => t != null);
    const missingTimeCount = bucket.filter((b) => b.timeMs == null).length;
    const answerLevel = {
      ...statsFromTimesMs(timesMs),
      missingTimeCount,
    };

    const filteredRow =
      Object.entries(filteredMaps[mapKey] || {}).find(([k, r]) => {
        const gk = r?.contentGradeKey || r?.gradeKey;
        return String(gk) === String(dbRow.grade) && String(k).includes(String(dbRow.topic));
      })?.[1] || null;

    const displayedMinutes = safeNum(filteredRow?.timeMinutes);
    const pipelineSeconds = topicDurationSeconds(
      {
        durationSeconds: dbTopic?.durationSeconds ?? slice.durationSeconds,
        timeMsSum: dbTopic?.timeMsSum ?? slice.timeMsSum,
      },
      dbRow.questions,
    );

    const sessionTopicMismatchCount = bucket.filter((b) => b.sessionTopicMismatch).length;
    const sessionSubjectMismatchCount = bucket.filter((b) => b.sessionSubjectMismatch).length;

    const otherGradeSameTopic = [...answerBuckets.entries()]
      .filter(([k]) => k.startsWith(`${dbRow.subject}::${dbRow.topic}::`) && !k.endsWith(`::${dbRow.grade}`))
      .map(([k, rows]) => ({ key: k, count: rows.length, sumMs: rows.reduce((s, r) => s + (r.timeMs || 0), 0) }));

    const crossGradeLeakSuspected =
      answerLevel.sumMs > 0 &&
      safeNum(slice.timeMsSum) > 0 &&
      Math.abs(answerLevel.sumMs - safeNum(slice.timeMsSum)) > 1000 &&
      otherGradeSameTopic.some(
        (g) => g.sumMs > 0 && Math.abs(safeNum(slice.timeMsSum) - answerLevel.sumMs - g.sumMs) < 5000,
      );

    const timeSource =
      safeNum(dbTopic?.timeMsSum) > 0 || safeNum(slice.timeMsSum) > 0
        ? "answer_level_timeMsSum"
        : safeNum(dbTopic?.durationSeconds) > 0 || safeNum(slice.durationSeconds) > 0
          ? "grade_slice_durationSeconds"
          : safeNum(topicIn?.durationSeconds) > 0
            ? "topic_level_session_duration"
            : "none";

    const row = {
      studentId: student.id,
      username: student.login_username,
      registeredGrade: registeredGradeKey,
      subject: dbRow.subject,
      topic: dbRow.topic,
      grade: dbRow.grade,
      questions: dbRow.questions,
      displayedMinutes,
      pipelineSeconds,
      pipelineMinutes: Math.round(pipelineSeconds / 60),
      apiSliceDurationSeconds: safeNum(slice.durationSeconds),
      apiSliceTimeMsSum: safeNum(slice.timeMsSum),
      topicLevelDurationSeconds: safeNum(topicIn?.durationSeconds),
      dbInputDurationSeconds: safeNum(dbTopic?.durationSeconds),
      dbInputTimeMsSum: safeNum(dbTopic?.timeMsSum),
      timeSource,
      answerLevel,
      sessionTopicMismatchCount,
      sessionSubjectMismatchCount,
      otherGradeSameTopic,
      crossGradeLeakSuspected,
      answerOnlyMatchesSlice:
        answerLevel.sumMs > 0 && Math.abs(answerLevel.sumMs - safeNum(slice.timeMsSum)) <= 1000,
      displayMatchesAnswerSum:
        answerLevel.sumSeconds > 0 &&
        displayedMinutes > 0 &&
        Math.abs(displayedMinutes * 60 - answerLevel.sumSeconds) <= Math.max(60, answerLevel.sumSeconds * 0.05),
    };

    row.issues = detectProvenanceIssues(row);
    row.severity = row.issues.some((i) =>
      [
        "display_zero_but_answer_time_exists",
        "cross_grade_leak_suspected",
        "displayed_not_matching_answer_sum",
        "topic_session_time_without_answer_time",
      ].includes(i),
    )
      ? "critical"
      : row.issues.length
        ? "warning"
        : "ok";
    audited.push(row);
  }

  return {
    student: {
      studentId: student.id,
      username: student.login_username,
      registeredGrade: registeredGradeKey,
    },
    summary: {
      topicGradeRows: audited.length,
      issues: audited.filter((r) => r.issues.length).length,
      critical: audited.filter((r) => r.severity === "critical").length,
      ok: audited.filter((r) => r.severity === "ok").length,
    },
    rows: audited,
  };
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const students = await discoverStudents(supabase);
  console.log(`Discovered ${students.length} students`);

  const studentReports = [];
  const allRows = [];
  for (const student of students) {
    console.log(`Provenance audit ${student.login_username || student.id}...`);
    try {
      const rep = await auditStudent(supabase, student, DEFAULT_RANGE);
      studentReports.push(rep);
      allRows.push(...(rep.rows || []));
    } catch (err) {
      studentReports.push({
        student: { studentId: student.id, username: student.login_username },
        error: String(err?.message || err),
        rows: [],
      });
    }
  }

  const focusFindings = [];
  for (const focus of FOCUS_ROWS) {
    const row = allRows.find(
      (r) =>
        String(r.username).toLowerCase() === focus.username &&
        r.subject === focus.subject &&
        r.topic === focus.topic &&
        String(r.grade) === focus.grade,
    );
    focusFindings.push({ focus, row: row || null, found: Boolean(row) });
  }

  const issueRows = allRows.filter((r) => r.issues?.length);
  issueRows.sort(
    (a, b) =>
      (b.severity === "critical") - (a.severity === "critical") ||
      b.questions - a.questions,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    range: DEFAULT_RANGE,
    studentsAudited: students.length,
    topicGradeRowsAudited: allRows.length,
    issueRows: issueRows.length,
    criticalRows: issueRows.filter((r) => r.severity === "critical").length,
    focusFindings,
    topIssues: issueRows.slice(0, 15),
    students: studentReports,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(
    `Summary: ${report.studentsAudited} students, ${report.topicGradeRowsAudited} rows, ${report.issueRows} issues, ${report.criticalRows} critical`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

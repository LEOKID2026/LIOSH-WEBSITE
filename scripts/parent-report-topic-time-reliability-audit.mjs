#!/usr/bin/env node
/**
 * Read-only audit: parent report topic+grade time reliability across pipeline stages.
 *
 * Run: node scripts/parent-report-topic-time-reliability-audit.mjs
 * Output: docs/audits/parent-report-topic-time-reliability-audit.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-topic-time-reliability-audit.json");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

const PRIORITY_USERNAMES = ["omer", "aaa7"];
const MIN_EXTRA_STUDENTS = 5;
const DEFAULT_RANGE = { from: "2025-09-01", to: "2026-07-04" };

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
const { filterTopicMapForRegularReport, resolveRegisteredGradeKeyFromReport } = await load(
  "lib/parent-ui/parent-report-regular-display.js",
);
const { buildGradeFilteredTopicMapsForRegularReport, resolveTopicRowTimeMinutes } = await load(
  "lib/parent-ui/parent-report-regular-time.js",
);
const { normalizeGradeLevelToKey } = await load("lib/learning-student-defaults.js");

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return null;
  return new Date(`${s}T00:00:00.000Z`);
}

function effectiveAnswers(slice) {
  return Math.max(
    0,
    Math.floor(
      safeNum(slice?.answers ?? slice?.total ?? slice?.questions ?? slice?.diagnosticAnswers),
    ),
  );
}

function rawDurationFields(slice) {
  if (!slice || typeof slice !== "object") return {};
  return {
    durationSeconds: safeNum(slice.durationSeconds),
    timeMsSum: safeNum(slice.timeMsSum),
    timeMsCount: safeNum(slice.timeMsCount),
    timeMinutes: safeNum(slice.timeMinutes),
    avgTimePerQuestionSec: slice.avgTimePerQuestionSec ?? null,
  };
}

function secondsFromSlice(slice, questions) {
  const dur = safeNum(slice?.durationSeconds);
  if (dur > 0) return { seconds: dur, source: "durationSeconds" };
  const ms = safeNum(slice?.timeMsSum);
  if (ms > 0 && questions > 0) return { seconds: Math.round(ms / 1000), source: "timeMsSum" };
  return { seconds: 0, source: "none" };
}

function detectIssues(row) {
  const issues = [];
  const q = row.questions;
  const min = row.displayedMinutes;
  const sec = row.calculatedSeconds;
  const secPerQ = q > 0 && sec > 0 ? sec / q : null;

  if (q > 0 && min <= 0 && sec <= 0) issues.push("questions_without_time");
  if (q > 20 && min > 0 && min < 3) issues.push("many_questions_very_low_minutes");
  if (q > 100 && min > 0 && min < 10) issues.push("high_volume_very_low_minutes");
  if (q > 0 && row.apiDurationSource === "none" && row.apiTimeMsSum <= 0) {
    issues.push("api_no_duration_fields");
  }
  if (q > 0 && row.questionsSource !== row.timePrimarySource) {
    issues.push("questions_and_time_different_sources");
  }
  if (row.usedOrphanOrReconcile && row.calculatedSeconds > 0 && row.apiTimeMsSum <= 0 && row.apiDurationSeconds <= 0) {
    issues.push("display_time_from_reconcile_not_api");
  }
  if (Math.abs(row.beforeFilterMinutes - row.afterFilterMinutes) > 0 && row.beforeFilterMinutes > 0) {
    issues.push("grade_filter_changed_minutes");
  }
  if (row.roundingToOneMinute && q > 50) issues.push("heavy_rounding_to_one_minute");

  return { issues, secPerQ };
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
  /** @type {Map<string, object>} */
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

  /** @type {Map<string, { sessions: number, subjects: Set<string> }>} */
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

  const need = Math.max(0, MIN_EXTRA_STUDENTS + PRIORITY_USERNAMES.length - picked.size);
  for (const entry of ranked) {
    if (picked.size >= PRIORITY_USERNAMES.length + MIN_EXTRA_STUDENTS + 3) break;
    if (picked.has(entry.id)) continue;
    picked.set(entry.id, {
      id: entry.id,
      pickReason: entry.sessions >= 100 ? "high_volume" : entry.sessions <= 5 ? "low_volume" : "multi_subject",
      _sessionCount: entry.sessions,
      _subjectCount: entry.subjectCount,
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
    discoverySessions: picked.get(s.id)?._sessionCount ?? null,
  }));
}

function collectApiTopicGradeRows(apiPayload, studentMeta) {
  const rows = [];
  const subjects = apiPayload?.subjects || {};
  for (const subjectId of SUBJECT_IDS) {
    const sub = subjects[subjectId];
    if (!sub?.topics) continue;
    for (const [topicKey, topic] of Object.entries(sub.topics)) {
      const byGrade = topic?.byContentGrade;
      if (byGrade && typeof byGrade === "object" && Object.keys(byGrade).length) {
        for (const [gradeKey, slice] of Object.entries(byGrade)) {
          const q = effectiveAnswers(slice);
          if (q <= 0) continue;
          const dur = secondsFromSlice(slice, q);
          rows.push({
            subject: subjectId,
            topic: topicKey,
            grade: gradeKey,
            questions: q,
            correct: safeNum(slice.correct),
            wrong: safeNum(slice.wrong),
            apiDurationSeconds: dur.seconds,
            apiDurationSource: dur.source,
            apiTimeMsSum: safeNum(slice.timeMsSum),
            apiTimeMsCount: safeNum(slice.timeMsCount),
            apiAvgSecPerQ: slice.avgTimePerQuestionSec,
            topicLevelDurationSeconds: safeNum(topic.durationSeconds),
            rawFields: rawDurationFields(slice),
            studentMeta,
          });
        }
      } else {
        const q = effectiveAnswers(topic);
        if (q <= 0) continue;
        const dur = secondsFromSlice(topic, q);
        rows.push({
          subject: subjectId,
          topic: topicKey,
          grade: topic.contentGradeLevel || "unknown",
          questions: q,
          correct: safeNum(topic.correct),
          wrong: safeNum(topic.wrong),
          apiDurationSeconds: dur.seconds,
          apiDurationSource: dur.source,
          apiTimeMsSum: safeNum(topic.timeMsSum),
          apiTimeMsCount: safeNum(topic.timeMsCount),
          apiAvgSecPerQ: topic.avgTimePerQuestionSec,
          topicLevelDurationSeconds: safeNum(topic.durationSeconds),
          rawFields: rawDurationFields(topic),
          studentMeta,
        });
      }
    }
  }
  return rows;
}

async function auditStudent(supabase, student, range) {
  const fromDate = parseIsoDate(range.from);
  const toDate = parseIsoDate(range.to);
  if (!fromDate || !toDate) throw new Error("bad_range");

  const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  if (!reportApiBody?.ok) {
    return { student, error: reportApiBody?.error || "aggregate_failed", rows: [] };
  }

  const dbInput = buildReportInputFromDbData(reportApiBody, { period: "custom", timezone: "UTC" });
  const syncMaps = buildTopicMapsFromDbInput(dbInput);
  const registeredGradeKey =
    normalizeGradeLevelToKey(student.grade_level) ||
    normalizeGradeLevelToKey(reportApiBody?.student?.grade_level) ||
    resolveRegisteredGradeKeyFromReport({ ...syncMaps, registeredGradeKey: student.grade_level });

  const baseReport = {
    summary: {},
    registeredGradeKey,
    ...Object.fromEntries(Object.values(REPORT_MAP_KEYS).map((k) => [k, {}])),
    _reportApiPayload: reportApiBody,
  };
  syncReportVisiblePracticeFromServer(baseReport, { apiPayload: reportApiBody, dbInput });

  const beforeFilterMaps = {};
  for (const [sid, mapKey] of Object.entries(REPORT_MAP_KEYS)) {
    beforeFilterMaps[mapKey] = baseReport[mapKey] || {};
  }
  const afterFilterMaps = buildGradeFilteredTopicMapsForRegularReport(baseReport, registeredGradeKey);
  const viewModel = buildRegularReportViewModel(baseReport);

  const studentMeta = {
    studentId: student.id,
    username: student.login_username,
    name: student.full_name,
    registeredGrade: registeredGradeKey,
    range,
  };

  const apiRows = collectApiTopicGradeRows(reportApiBody, studentMeta);
  const audited = [];

  for (const apiRow of apiRows) {
    const mapKey = REPORT_MAP_KEYS[apiRow.subject];
    const adapterKey = `${apiRow.topic}::grade:${apiRow.grade}`;
    const dbTopic = dbInput?.subjects?.[apiRow.subject]?.topics?.[adapterKey] ||
      dbInput?.subjects?.[apiRow.subject]?.topics?.[apiRow.topic];

    const syncRow =
      Object.entries(beforeFilterMaps[mapKey] || {}).find(([k, r]) => {
        const gk = r?.contentGradeKey || r?.gradeKey;
        const bk = r?.bucketKey || r?.topicRowKey || k;
        return (
          String(gk) === String(apiRow.grade) &&
          (String(bk).includes(apiRow.topic) || String(k).includes(apiRow.topic))
        );
      })?.[1] || null;

    const filteredRow =
      Object.entries(afterFilterMaps[mapKey] || {}).find(([k, r]) => {
        const gk = r?.contentGradeKey || r?.gradeKey;
        return String(gk) === String(apiRow.grade) && String(k).includes(String(apiRow.topic));
      })?.[1] || null;

    const vmRow = filteredRow;
    const calculatedSeconds = vmRow
      ? Math.max(0, safeNum(vmRow.timeMinutes) * 60) || resolveTopicRowTimeMinutes(vmRow) * 60
      : syncRow
        ? topicDurationSeconds(
            {
              durationSeconds: dbTopic?.durationSeconds,
              timeMsSum: dbTopic?.timeMsSum,
              total: apiRow.questions,
            },
            apiRow.questions,
          )
        : apiRow.apiDurationSeconds;

    const beforeFilterMinutes = syncRow ? safeNum(syncRow.timeMinutes) : 0;
    const afterFilterMinutes = filteredRow ? safeNum(filteredRow.timeMinutes) : 0;
    const displayedMinutes = vmRow ? safeNum(vmRow.timeMinutes) : afterFilterMinutes;

    const questionsSource = "answers_table_aggregate";
    const timePrimarySource = apiRow.apiDurationSource;

    const row = {
      ...studentMeta,
      subject: apiRow.subject,
      topic: apiRow.topic,
      grade: apiRow.grade,
      questions: apiRow.questions,
      correct: apiRow.correct,
      wrong: apiRow.wrong,
      rawDurationFields: apiRow.rawFields,
      apiDurationSeconds: apiRow.apiDurationSeconds,
      apiTimeMsSum: apiRow.apiTimeMsSum,
      apiTimeMsCount: apiRow.apiTimeMsCount,
      topicLevelDurationSeconds: apiRow.topicLevelDurationSeconds,
      dbInputDurationSeconds: safeNum(dbTopic?.durationSeconds),
      dbInputTimeMsSum: safeNum(dbTopic?.timeMsSum),
      syncMapTimeMinutes: beforeFilterMinutes,
      filteredMapTimeMinutes: afterFilterMinutes,
      viewModelTimeMinutes: displayedMinutes,
      calculatedSeconds,
      displayedMinutes,
      questionsSource,
      timePrimarySource,
      usedOrphanOrReconcile:
        afterFilterMinutes > 0 &&
        apiRow.apiDurationSeconds <= 0 &&
        apiRow.apiTimeMsSum <= 0 &&
        beforeFilterMinutes <= 0,
      roundingToOneMinute: displayedMinutes === 1 && calculatedSeconds > 0 && calculatedSeconds < 90,
    };

    const { issues, secPerQ } = detectIssues(row);
    row.issues = issues;
    row.secondsPerQuestion = secPerQ;
    row.severity = issues.length
      ? issues.includes("questions_without_time") || issues.includes("high_volume_very_low_minutes")
        ? "critical"
        : "warning"
      : "ok";
    audited.push(row);
  }

  return {
    student: studentMeta,
    summary: {
      topicGradeRows: audited.length,
      issues: audited.filter((r) => r.issues.length).length,
      critical: audited.filter((r) => r.severity === "critical").length,
    },
    rows: audited,
  };
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env — cannot run live audit.");
    process.exit(1);
  }

  const students = await discoverStudents(supabase);
  console.log(`Discovered ${students.length} students for audit`);

  /** @type {object[]} */
  const studentReports = [];
  /** @type {object[]} */
  const allIssueRows = [];

  for (const student of students) {
    console.log(`Auditing ${student.login_username || student.id} (${student.pickReason})...`);
    try {
      const rep = await auditStudent(supabase, student, DEFAULT_RANGE);
      studentReports.push(rep);
      for (const row of rep.rows || []) {
        if (row.issues?.length) allIssueRows.push(row);
      }
    } catch (err) {
      studentReports.push({
        student: { studentId: student.id, username: student.login_username },
        error: String(err?.message || err),
        rows: [],
      });
    }
  }

  allIssueRows.sort((a, b) => {
    const score = (r) =>
      (r.issues.includes("high_volume_very_low_minutes") ? 1000 : 0) +
      (r.issues.includes("many_questions_very_low_minutes") ? 500 : 0) +
      r.questions;
    return score(b) - score(a);
  });

  const totalRows = studentReports.reduce((s, r) => s + (r.summary?.topicGradeRows || 0), 0);
  const totalIssues = allIssueRows.length;

  const report = {
    generatedAt: new Date().toISOString(),
    range: DEFAULT_RANGE,
    studentsAudited: students.length,
    topicGradeRowsAudited: totalRows,
    issueRows: totalIssues,
    rootCauseHypothesis: {
      primaryTimeSources: [
        "learning_sessions.duration_seconds → topic.durationSeconds (session.topic key)",
        "answers.answer_payload creditedTimeMs/timeSpentMs → slice.timeMsSum (per answer, per grade)",
        "parent_activity_attempts.time_spent_ms → topic.durationSeconds + timeMsSum",
      ],
      knownPipelineGaps: [
        "Self-practice: answer credited time goes to timeMsSum on grade slice, NOT to gradeSlice.durationSeconds",
        "Session duration added to topic.durationSeconds only; grade slices get duration only via distributeDurationAcrossGradeSlices during orphan reallocation",
        "report-data-adapter falls back from grade slice durationSeconds=0 to TOPIC-level durationSeconds (may mix grades)",
        "applyReportDurationSanityToAggregateSubjects caps using diagnosticAnswers not total answers",
        "UI layer parent-report-regular-time.js adds second orphan/reconcile pass (artificial distribution)",
      ],
    },
    top10Issues: allIssueRows.slice(0, 10).map((r) => ({
      student: r.username || r.studentId,
      subject: r.subject,
      topic: r.topic,
      grade: r.grade,
      questions: r.questions,
      displayedMinutes: r.displayedMinutes,
      apiDurationSeconds: r.apiDurationSeconds,
      apiTimeMsSum: r.apiTimeMsSum,
      syncMapTimeMinutes: r.syncMapTimeMinutes,
      filteredMapTimeMinutes: r.filteredMapTimeMinutes,
      issues: r.issues,
      timePrimarySource: r.timePrimarySource,
    })),
    recommendedFix: {
      scope: "General pipeline fix in report-data-aggregate + report-visible-practice-sync",
      notIn: ["parent-report-regular-time.js orphan distribution", "UI em-dash hiding", "OMER-specific hacks"],
      approach: [
        "Assign per-answer credited seconds to gradeSlice.durationSeconds during aggregateReportPayloadFromActivityRows (same as parent activities)",
        "After all answers, distribute topic session duration to grade slices proportionally by answers (always, not only orphan path)",
        "Build topic row timeMinutes from grade slice durationSeconds OR timeMsSum only — never cross-grade topic fallback",
        "Fix applyReportDurationSanityToAggregateSubjects to use total answers not diagnosticAnswers only",
        "Remove UI-layer reconcile/distribute in parent-report-regular-time.js",
      ],
      files: [
        "lib/parent-server/report-data-aggregate.server.js",
        "lib/learning-supabase/report-data-adapter.js",
        "lib/learning/report-visible-practice-sync.js",
        "lib/parent-server/report-duration-sanity.js",
        "lib/parent-ui/parent-report-regular-time.js (remove artificial reconcile)",
        "lib/parent-ui/parent-report-regular-display.js",
      ],
    },
    students: studentReports,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(
    `Summary: ${report.studentsAudited} students, ${report.topicGradeRowsAudited} rows, ${report.issueRows} with issues`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

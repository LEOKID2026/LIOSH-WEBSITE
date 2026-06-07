#!/usr/bin/env node
/**
 * Parent Report Q1 Simulation QA — 12 AAA students under admin@admin.com.
 * Seeds controlled parent-context activity, verifies evidenceQuality + gating + API sanitization.
 *
 * Run:
 *   node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only
 *   node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --clean-only
 */
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { classifyActivityEvidence } from "../../lib/learning/activity-classification.js";
import { DATA_SUFFICIENCY } from "../../lib/learning/evidence-quality.js";
import { processBookEventsRequest } from "../../lib/learning-supabase/book-events.server.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { applyServerParentFacingAuthorityToClientReport } from "../../lib/parent-server/parent-facing-report-authority.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-q1-sim");
const SEED_TAG = "parent-report-q1-sim-v1";
const QA_PARENT_EMAIL = "admin@admin.com";
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

const AAA_STUDENTS = [
  { label: "AAA1", grade: 1, scenario: "A_no_data" },
  { label: "AAA2", grade: 1, scenario: "B_insufficient_data" },
  { label: "AAA3", grade: 2, scenario: "C_preliminary_by_count" },
  { label: "AAA4", grade: 2, scenario: "D_preliminary_no_recurrence" },
  { label: "AAA5", grade: 3, scenario: "E_supported_diagnosis" },
  { label: "AAA6", grade: 3, scenario: "F_parent_assigned" },
  { label: "AAA7", grade: 4, scenario: "G_non_diagnostic_exclusion" },
  { label: "AAA8", grade: 4, scenario: "I_date_range_1" },
  { label: "AAA9", grade: 5, scenario: "I_date_range_2" },
  { label: "AAA10", grade: 5, scenario: "H_api_sanitization" },
  { label: "AAA11", grade: 6, scenario: "E_supported_grade6" },
  { label: "AAA12", grade: 6, scenario: "F_parent_assigned_grade6" },
];

const LEAKAGE_KEYS = [
  "classroom",
  "school",
  "privateTeacher",
  "private_teacher",
  "sourceBreakdown",
  "supportingEvidenceIds",
  "_evidenceQuality",
  "teacherReport",
  "classReport",
  "crossContext",
  "mergeHint",
  "presenceSignal",
];

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function parseIsoDate(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function gradeDbKey(gradeNum) {
  return `g${gradeNum}`;
}

function diagnosticAnswerPayload({ subject, topic, mode = "practice", grade, isCorrect }) {
  const classification = classifyActivityEvidence(mode, "free_practice", { hintsUsed: 0 });
  return {
    subject,
    topic,
    gameMode: mode,
    level: "medium",
    gradeLevel: grade,
    prompt: `Q1 sim ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: isCorrect ? "42" : "99",
    hintsUsed: 0,
    timeSpentMs: 5000,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { parentReportQ1Sim: SEED_TAG },
  };
}

function learningAnswerPayload({ subject, topic, grade }) {
  const classification = classifyActivityEvidence("learning", "free_practice", { hintsUsed: 0 });
  return {
    subject,
    topic,
    gameMode: "learning",
    level: "medium",
    gradeLevel: grade,
    prompt: `Q1 sim learning ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: "42",
    hintsUsed: 0,
    timeSpentMs: 8000,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { parentReportQ1Sim: SEED_TAG },
  };
}

async function resolveAaaStudents(supabase) {
  // Production QA accounts use lowercase login_username (aaa1..aaa12); labels stay AAA1..AAA12 in reports.
  const loginUsernames = AAA_STUDENTS.map((s) => s.label.toLowerCase());
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username, is_active, revoked_at")
    .in("login_username", loginUsernames)
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error(`access code lookup: ${error.message}`);

  const byUsername = new Map();
  for (const row of codes || []) {
    const u = String(row.login_username || "").trim().toLowerCase();
    if (u && row.student_id) byUsername.set(u, row.student_id);
  }

  const studentIds = [...new Set([...byUsername.values()])];
  const { data: students, error: stErr } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .in("id", studentIds);
  if (stErr) throw new Error(`students lookup: ${stErr.message}`);

  const byId = new Map((students || []).map((s) => [s.id, s]));
  const resolved = [];
  for (const entry of AAA_STUDENTS) {
    const studentId = byUsername.get(entry.label.toLowerCase());
    if (!studentId) throw new Error(`Missing access code for ${entry.label} (login ${entry.label.toLowerCase()})`);
    const row = byId.get(studentId);
    if (!row?.id) throw new Error(`Missing student row for ${entry.label}`);
    if (row.parent_id !== QA_PARENT_ID) {
      throw new Error(`${entry.label} parent_id mismatch (expected QA parent)`);
    }
    resolved.push({ ...entry, studentId: row.id, fullName: row.full_name, gradeLevel: row.grade_level });
  }
  return resolved;
}

async function cleanTaggedSeeds(supabase, studentIds) {
  const { data: sessions, error } = await supabase
    .from("learning_sessions")
    .select("id, student_id")
    .in("student_id", studentIds)
    .contains("metadata", { parentReportQ1Sim: SEED_TAG });
  if (error) throw new Error(`cleanup sessions lookup: ${error.message}`);

  const sessionIds = (sessions || []).map((s) => s.id).filter(Boolean);
  let removedAnswers = 0;
  if (sessionIds.length) {
    const { count } = await supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .in("learning_session_id", sessionIds);
    removedAnswers = count || 0;
    await supabase.from("answers").delete().in("learning_session_id", sessionIds);
    await supabase.from("learning_sessions").delete().in("id", sessionIds);
  }

  const { data: parentActs } = await supabase
    .from("parent_assigned_activities")
    .select("id, student_id")
    .in("student_id", studentIds)
    .like("title", `[${SEED_TAG}]%`);
  const actIds = (parentActs || []).map((a) => a.id);
  if (actIds.length) {
    await supabase.from("parent_activity_attempts").delete().in("activity_id", actIds);
    await supabase.from("parent_activity_status").delete().in("activity_id", actIds);
    await supabase.from("parent_assigned_activities").delete().in("id", actIds);
  }

  const { data: bookSessions } = await supabase
    .from("book_reading_sessions")
    .select("id, student_id")
    .in("student_id", studentIds)
    .like("client_session_token", `${SEED_TAG}_%`);
  const bookIds = (bookSessions || []).map((b) => b.id);
  if (bookIds.length) {
    await supabase.from("book_page_visits").delete().in("book_reading_session_id", bookIds);
    await supabase.from("book_reading_sessions").delete().in("id", bookIds);
  }

  return { removedSessions: sessionIds.length, removedAnswers, removedParentActivities: actIds.length, removedBookSessions: bookIds.length };
}

async function insertPracticeSession(supabase, studentId, { subject, topic, grade, mode, answers }) {
  if (!answers.length) return { sessionId: null, answerCount: 0 };
  const startedMs = Date.parse(answers[0].answeredAt);
  const endedMs = Date.parse(answers[answers.length - 1].answeredAt) + 60_000;
  const correct = answers.filter((a) => a.isCorrect).length;

  const { data: sessionRow, error: sessErr } = await supabase
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      subject,
      topic,
      started_at: new Date(startedMs).toISOString(),
      ended_at: new Date(endedMs).toISOString(),
      duration_seconds: Math.max(60, Math.floor((endedMs - startedMs) / 1000)),
      status: "completed",
      metadata: {
        mode: mode || "practice",
        gameMode: mode || "practice",
        gradeLevel: grade,
        parentReportQ1Sim: SEED_TAG,
        summary: { totalQuestions: answers.length, correctAnswers: correct, wrongAnswers: answers.length - correct },
      },
    })
    .select("id")
    .single();
  if (sessErr || !sessionRow?.id) throw new Error(`session insert: ${sessErr?.message}`);

  const rows = answers.map((a, i) => ({
    student_id: studentId,
    learning_session_id: sessionRow.id,
    question_id: `${SEED_TAG}:${sessionRow.id}:${i}`,
    is_correct: a.isCorrect,
    answered_at: a.answeredAt,
    answer_payload: a.isCorrect
      ? diagnosticAnswerPayload({ subject, topic, mode: mode || "practice", grade, isCorrect: true })
      : diagnosticAnswerPayload({ subject, topic, mode: mode || "practice", grade, isCorrect: false }),
  }));
  const { error: ansErr } = await supabase.from("answers").insert(rows);
  if (ansErr) throw new Error(`answers insert: ${ansErr.message}`);
  return { sessionId: sessionRow.id, answerCount: rows.length };
}

function buildAnswerSchedule(dayIsoList, countsPerDay, wrongPerDay) {
  const out = [];
  const wrongsByDay = Array.isArray(wrongPerDay)
    ? wrongPerDay
    : dayIsoList.map((_, idx) => (idx === 0 ? wrongPerDay : 0));
  for (let d = 0; d < dayIsoList.length; d += 1) {
    const count = countsPerDay[d] || 0;
    let wrongLeft = Math.min(count, wrongsByDay[d] || 0);
    for (let i = 0; i < count; i += 1) {
      const isWrong = wrongLeft > 0;
      if (isWrong) wrongLeft -= 1;
      const hour = 10 + (i % 5);
      out.push({
        isCorrect: !isWrong,
        answeredAt: `${dayIsoList[d]}T${String(hour).padStart(2, "0")}:15:00.000Z`,
      });
    }
  }
  return out;
}

async function seedParentAssignedActivity(supabase, parentId, studentId, { subject, topic, grade, count, wrongCount, dayIsoList }) {
  const classification = classifyActivityEvidence("homework", "assigned_parent", { hintsUsed: 0 });
  const activityId = crypto.randomUUID();
  const title = `[${SEED_TAG}] parent homework ${topic}`;

  const { error: actErr } = await supabase.from("parent_assigned_activities").insert({
    id: activityId,
    parent_id: parentId,
    student_id: studentId,
    title,
    subject,
    topic,
    question_count: count,
    mode: "homework",
    difficulty_level: "medium",
    question_set: [{ prompt: "1+1", correctAnswer: "2", type: "numeric" }],
    status: "active",
  });
  if (actErr) throw new Error(`parent activity insert: ${actErr.message}`);

  const { error: stErr } = await supabase.from("parent_activity_status").insert({
    activity_id: activityId,
    student_id: studentId,
    status: "in_progress",
    started_at: `${dayIsoList[0]}T09:00:00.000Z`,
    answers_count: count,
    correct_count: count - wrongCount,
  });
  if (stErr) throw new Error(`parent activity status: ${stErr.message}`);

  let wrongLeft = wrongCount;
  const attempts = [];
  for (let i = 0; i < count; i += 1) {
    const day = dayIsoList[i % dayIsoList.length];
    const isWrong = wrongLeft > 0 && i < wrongCount + 1;
    if (isWrong) wrongLeft -= 1;
    attempts.push({
      activity_id: activityId,
      student_id: studentId,
      question_index: i,
      selected_answer: isWrong ? "99" : "2",
      correct_answer: "2",
      is_correct: !isWrong,
      hints_used: 0,
      answered_at: `${day}T11:${String(10 + i).padStart(2, "0")}:00.000Z`,
      question_snapshot: {
        prompt: `Parent assigned Q${i + 1}`,
        isDiagnosticEligible: classification.isDiagnosticEligible,
        evidenceCategory: classification.evidenceCategory,
        contextFlags: classification.contextFlags || {},
      },
    });
  }
  const { error: attErr } = await supabase.from("parent_activity_attempts").insert(attempts);
  if (attErr) throw new Error(`parent attempts: ${attErr.message}`);
  return activityId;
}

async function seedBookReading(supabase, studentId, dayIso, grade) {
  const token = `${SEED_TAG}_${studentId.slice(0, 8)}_${dayIso}`;
  const start = await processBookEventsRequest(supabase, studentId, {
    event: "book_reading_session_start",
    clientSessionToken: token,
    subject: "math",
    grade,
    entryPageId: "add_two",
  });
  if (!start.ok) return { ok: false, error: start.error };
  const sessionId = start.bookReadingSessionId;
  const visit = await processBookEventsRequest(supabase, studentId, {
    event: "book_page_visit_start",
    clientSessionToken: token,
    clientVisitToken: `${token}_v1`,
    bookReadingSessionId: sessionId,
    pageId: "add_two",
    subject: "math",
    grade,
  });
  if (!visit.ok) return { ok: false, error: visit.error };
  await processBookEventsRequest(supabase, studentId, {
    event: "book_page_visit_end",
    clientSessionToken: token,
    clientVisitToken: `${token}_v1`,
    bookReadingSessionId: sessionId,
    pageId: "add_two",
    creditedDwellMs: 90_000,
    rawDwellMs: 120_000,
    pageRead: true,
  });
  return { ok: true, sessionId };
}

function scenarioPlan(entry) {
  const grade = gradeDbKey(entry.grade);
  const subject = "math";
  const topic = entry.grade <= 2 ? "addition" : entry.grade <= 4 ? "multiplication" : "fractions";

  switch (entry.scenario) {
    case "A_no_data":
      return { seed: null, verifyRange: { from: "2027-01-01", to: "2027-01-07" }, expected: DATA_SUFFICIENCY.NO_DATA };
    case "B_insufficient_data":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-03"], [3], [1]),
        },
        verifyRange: { from: "2026-04-03", to: "2026-04-03" },
        expected: DATA_SUFFICIENCY.INSUFFICIENT,
      };
    case "C_preliminary_by_count":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-05", "2026-04-06"], [4, 4], [2, 1]),
        },
        verifyRange: { from: "2026-04-05", to: "2026-04-06" },
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "D_preliminary_no_recurrence":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-08"], [14], [4]),
        },
        verifyRange: { from: "2026-04-08", to: "2026-04-08" },
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "E_supported_diagnosis":
    case "E_supported_grade6":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-10", "2026-04-12"], [7, 7], [2, 2]),
        },
        verifyRange: { from: "2026-04-10", to: "2026-04-12" },
        expected: DATA_SUFFICIENCY.SUPPORTED,
      };
    case "F_parent_assigned":
    case "F_parent_assigned_grade6":
      return {
        seed: {
          type: "parent_assigned",
          subject,
          topic,
          grade,
          count: 6,
          wrongCount: 2,
          days: ["2026-04-14", "2026-04-15"],
        },
        verifyRange: { from: "2026-04-14", to: "2026-04-15" },
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    case "G_non_diagnostic_exclusion":
      return {
        seed: {
          type: "mixed_learning",
          subject,
          topic,
          grade,
          learningAnswers: buildAnswerSchedule(["2026-04-16"], [8], 0),
          bookDay: "2026-04-16",
        },
        verifyRange: { from: "2026-04-16", to: "2026-04-16" },
        expected: DATA_SUFFICIENCY.NO_DATA,
      };
    case "I_date_range_1":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-18", "2026-04-22", "2026-04-25"], [5, 5, 5], [1, 1, 0]),
        },
        verifyRange: { from: "2026-04-18", to: "2026-04-25" },
        dateRangeChecks: [
          { label: "day", from: "2026-04-18", to: "2026-04-18", expectedDiag: 5 },
          { label: "week", from: "2026-04-18", to: "2026-04-24", expectedDiag: 10 },
          { label: "month", from: "2026-04-01", to: "2026-04-30", expectedDiagMin: 15 },
        ],
        expected: DATA_SUFFICIENCY.SUPPORTED,
      };
    case "I_date_range_2":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-19", "2026-04-26"], [6, 6], [1, 1]),
        },
        verifyRange: { from: "2026-04-19", to: "2026-04-26" },
        dateRangeChecks: [
          { label: "day_apr19", from: "2026-04-19", to: "2026-04-19", expectedDiag: 6 },
          { label: "day_apr26", from: "2026-04-26", to: "2026-04-26", expectedDiag: 6 },
        ],
        expected: DATA_SUFFICIENCY.SUPPORTED,
      };
    case "H_api_sanitization":
      return {
        seed: {
          type: "practice",
          subject,
          topic,
          grade,
          answers: buildAnswerSchedule(["2026-04-20", "2026-04-21"], [4, 4], [1, 1]),
        },
        verifyRange: { from: "2026-04-20", to: "2026-04-21" },
        expected: DATA_SUFFICIENCY.PRELIMINARY,
      };
    default:
      throw new Error(`Unknown scenario ${entry.scenario}`);
  }
}

async function seedScenario(supabase, parentId, entry, plan) {
  if (!plan.seed) return { seeded: false };
  const s = plan.seed;
  if (s.type === "practice") {
    await insertPracticeSession(supabase, entry.studentId, {
      subject: s.subject,
      topic: s.topic,
      grade: s.grade,
      mode: "practice",
      answers: s.answers,
    });
    return { seeded: true, type: "free_practice", count: s.answers.length };
  }
  if (s.type === "parent_assigned") {
    const actId = await seedParentAssignedActivity(supabase, parentId, entry.studentId, {
      subject: s.subject,
      topic: s.topic,
      grade: s.grade,
      count: s.count,
      wrongCount: s.wrongCount,
      dayIsoList: s.days,
    });
    return { seeded: true, type: "assigned_parent", activityId: actId, count: s.count };
  }
  if (s.type === "mixed_learning") {
    const startedMs = Date.parse(`${s.learningAnswers[0].answeredAt}`);
    const endedMs = Date.parse(`${s.learningAnswers[s.learningAnswers.length - 1].answeredAt}`) + 60_000;
    const { data: sessionRow, error: sessErr } = await supabase
      .from("learning_sessions")
      .insert({
        student_id: entry.studentId,
        subject: s.subject,
        topic: s.topic,
        started_at: new Date(startedMs).toISOString(),
        ended_at: new Date(endedMs).toISOString(),
        duration_seconds: 600,
        status: "completed",
        metadata: { mode: "learning", gameMode: "learning", gradeLevel: s.grade, parentReportQ1Sim: SEED_TAG },
      })
      .select("id")
      .single();
    if (sessErr) throw new Error(sessErr.message);
    const rows = s.learningAnswers.map((a, i) => ({
      student_id: entry.studentId,
      learning_session_id: sessionRow.id,
      question_id: `${SEED_TAG}:learn:${i}`,
      is_correct: true,
      answered_at: a.answeredAt,
      answer_payload: learningAnswerPayload({ subject: s.subject, topic: s.topic, grade: s.grade }),
    }));
    await supabase.from("answers").insert(rows);
    const book = await seedBookReading(supabase, entry.studentId, s.bookDay, s.grade);
    return { seeded: true, type: "learning+book", learningCount: rows.length, book };
  }
  return { seeded: false };
}

function countMetrics(payload, subject, topic) {
  const subj = payload?.subjects?.[subject];
  const topicRow = subj?.topics?.[topic];
  const mistakes = (payload?.recentMistakes || []).filter(
    (m) => m.subject === subject && m.topic === topic
  );
  const days = new Set(
    mistakes.map((m) => String(m.answeredAt || "").slice(0, 10)).filter(Boolean)
  );
  return {
    diagnosticAnswers: Number(topicRow?.diagnosticAnswers ?? subj?.diagnosticAnswers ?? payload?.summary?.diagnosticAnswers ?? 0),
    mistakes: mistakes.length,
    distinctDays: days.size,
    learningAnswers: Number(topicRow?.learningAnswers ?? subj?.learningAnswers ?? 0),
    bookMinutes: Number(payload?.learningActivity?.bookReadingMinutes ?? 0),
  };
}

function sanitizeEqSnapshot(payload) {
  const eq = payload?.meta?.evidenceQuality;
  if (!eq) return null;
  return {
    context: eq.context,
    student: {
      dataSufficiency: eq.student?.dataSufficiency,
      confidenceLevel: eq.student?.confidenceLevel,
      confidenceReason: eq.student?.confidenceReason,
      evidenceCount: eq.student?.evidenceCount,
      recurrenceMet: eq.student?.recurrenceMet,
    },
    bySubject: eq.bySubject || {},
    byTopic: eq.byTopic || {},
  };
}

function deepFindLeakKeys(obj, pathPrefix = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    const kl = k.toLowerCase();
    for (const leak of LEAKAGE_KEYS) {
      if (kl.includes(leak.toLowerCase())) hits.push(p);
    }
    if (v && typeof v === "object") hits.push(...deepFindLeakKeys(v, p));
  }
  return hits;
}

function hasStrongDiagnosisLanguage(insights) {
  const strong = ["נראה שיש קושי", "כדאי לשים לב ל", "יש טעויות חוזרות", "הביצועים הכלליים"];
  return (insights || []).some((line) => strong.some((s) => line.includes(s)));
}

async function fetchPublicParentReport(supabase, student, from, to) {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const raw = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
  });
  const enriched = await enrichPayloadWithParentFacing(supabase, raw, student.id);
  const internal = structuredClone(enriched);
  const pub = stripInternalReportPayloadFields(enriched);
  return { internal, public: pub };
}

async function verifyStudent(supabase, entry, plan) {
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || gradeDbKey(entry.grade),
    is_active: true,
  };
  const range = plan.verifyRange;
  const subject = plan.seed?.subject || "math";
  const topic =
    plan.seed?.topic ||
    (entry.grade <= 2 ? "addition" : entry.grade <= 4 ? "multiplication" : "fractions");

  const { internal, public: pub } = await fetchPublicParentReport(
    supabase,
    student,
    range.from,
    range.to
  );
  const actual = pub.meta?.evidenceQuality?.student?.dataSufficiency;
  const metrics = countMetrics(pub, subject, topic);
  const insights = pub.parentFacing?.insights || [];
  const strongLang = hasStrongDiagnosisLanguage(insights);

  const checks = [];
  checks.push({
    name: "dataSufficiency",
    pass: actual === plan.expected,
    expected: plan.expected,
    actual,
  });

  if (plan.expected === DATA_SUFFICIENCY.NO_DATA || plan.expected === DATA_SUFFICIENCY.INSUFFICIENT) {
    checks.push({
      name: "no_strong_diagnosis_language",
      pass: !strongLang,
      expected: false,
      actual: strongLang,
    });
  }

  if (plan.expected === DATA_SUFFICIENCY.PRELIMINARY && entry.scenario.startsWith("C_")) {
    checks.push({
      name: "no_supported_diagnosis",
      pass: actual !== DATA_SUFFICIENCY.SUPPORTED,
      expected: "not supported_diagnosis",
      actual,
    });
  }

  if (plan.expected === DATA_SUFFICIENCY.SUPPORTED) {
    checks.push({
      name: "confidence_supported",
      pass: pub.meta?.evidenceQuality?.student?.confidenceLevel === "moderate",
      expected: "moderate",
      actual: pub.meta?.evidenceQuality?.student?.confidenceLevel,
    });
    checks.push({
      name: "recurrence_met",
      pass: pub.meta?.evidenceQuality?.student?.recurrenceMet === true,
      expected: true,
      actual: pub.meta?.evidenceQuality?.student?.recurrenceMet,
    });
  }

  if (entry.scenario === "G_non_diagnostic_exclusion") {
    checks.push({
      name: "no_diagnostic_from_learning",
      pass: metrics.diagnosticAnswers === 0,
      expected: 0,
      actual: metrics.diagnosticAnswers,
    });
    checks.push({
      name: "learning_activity_present",
      pass: metrics.learningAnswers > 0 || metrics.bookMinutes > 0,
      expected: ">0 learning or book",
      actual: { learningAnswers: metrics.learningAnswers, bookMinutes: metrics.bookMinutes },
    });
  }

  const stripChecks = [];
  stripChecks.push({ name: "public_evidenceQuality", pass: !!pub.meta?.evidenceQuality });
  stripChecks.push({ name: "no__evidenceQuality", pass: pub.meta?._evidenceQuality === undefined });
  stripChecks.push({
    name: "no_supportingEvidenceIds",
    pass: pub.meta?.evidenceQuality?.student?.supportingEvidenceIds === undefined,
  });
  stripChecks.push({
    name: "no_sourceBreakdown",
    pass: pub.meta?.evidenceQuality?.student?.sourceBreakdown === undefined,
  });
  const leakHits = deepFindLeakKeys(pub).filter(
    (p) =>
      p.includes("classroom") ||
      p.includes("school") ||
      p.includes("privateTeacher") ||
      p.includes("sourceBreakdown") ||
      p.includes("supportingEvidenceIds") ||
      p.includes("_evidenceQuality")
  );
  stripChecks.push({ name: "no_cross_context_leak_keys", pass: leakHits.length === 0, actual: leakHits });

  const dateRangeResults = [];
  if (plan.dateRangeChecks) {
    for (const dr of plan.dateRangeChecks) {
      const { public: drPub } = await fetchPublicParentReport(supabase, student, dr.from, dr.to);
      const diag = Number(drPub.summary?.diagnosticAnswers ?? 0);
      let pass = true;
      if (dr.expectedDiag != null) pass = diag === dr.expectedDiag;
      if (dr.expectedDiagMin != null) pass = diag >= dr.expectedDiagMin;
      dateRangeResults.push({ ...dr, actualDiag: diag, pass });
      checks.push({ name: `date_range_${dr.label}`, pass, expected: dr.expectedDiag ?? dr.expectedDiagMin, actual: diag });
    }
  }

  const pass = checks.every((c) => c.pass) && stripChecks.every((c) => c.pass);

  return {
    label: entry.label,
    displayName: entry.fullName,
    grade: entry.grade,
    scenario: entry.scenario,
    studentId: entry.studentId,
    verifyRange: range,
    subject,
    topic,
    metrics,
    expectedSufficiency: plan.expected,
    actualSufficiency: actual,
    parentFacingInsights: insights,
    strongDiagnosisLanguage: strongLang,
    checks,
    stripChecks,
    dateRangeResults,
    evidenceQualitySnapshot: sanitizeEqSnapshot(pub),
    pass,
  };
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const cleanOnly = process.argv.includes("--clean-only");

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const students = await resolveAaaStudents(supabase);
  console.log(`Resolved ${students.length} AAA students under QA parent`);

  const studentIds = students.map((s) => s.studentId);
  let cleanup = { skipped: true };
  if (!verifyOnly) {
    cleanup = await cleanTaggedSeeds(supabase, studentIds);
    console.log("Cleanup prior Q1 sim tag:", cleanup);
  }

  if (cleanOnly) {
    console.log("--clean-only done");
    return;
  }

  if (!verifyOnly) {
    for (const entry of students) {
      const plan = scenarioPlan(entry);
      if (!plan.seed) {
        console.log(`  ${entry.label}: skip seed (${entry.scenario})`);
        continue;
      }
      const result = await seedScenario(supabase, QA_PARENT_ID, entry, plan);
      console.log(`  ${entry.label}: seeded`, result);
    }
  }

  const results = [];
  for (const entry of students) {
    const plan = scenarioPlan(entry);
    const row = await verifyStudent(supabase, entry, plan);
    results.push(row);
    console.log(row.pass ? "PASS" : "FAIL", entry.label, entry.scenario, row.actualSufficiency);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const artifact = {
    runAt: new Date().toISOString(),
    seedTag: SEED_TAG,
    qaParentEmail: QA_PARENT_EMAIL,
    cleanup,
    verifyOnly,
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
    },
  };
  const jsonPath = path.join(ARTIFACT_DIR, "parent-report-q1-sim-results.json");
  await writeFile(jsonPath, JSON.stringify(artifact, null, 2), "utf8");
  console.log(`Wrote ${jsonPath}`);

  if (artifact.summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL", e?.message || e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Realistic April 2026 parent-context seed for AAA1–AAA12 (full-month PDF package).
 * Tag: parent-report-q2e-monthly-realistic-v1
 *
 * Cleans competing QA April seeds (tag-scoped) so PDF minutes/answers match verification:
 *   - parent-report-q2e-monthly-realistic-v1 (this package)
 *   - parent-report-q2e-monthly-v1 (Q2E sufficiency — re-seed separately for edge-case QA)
 *   - parent-report-q1-sim-v1 (legacy Q1 sim)
 *
 * Run:
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-seed.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-seed.mjs --clean-only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { classifyActivityEvidence } from "../../lib/learning/activity-classification.js";
import { bootstrapQaDbWriteGuard } from "./lib/db-write-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic");
const SEED_TAG = "parent-report-q2e-monthly-realistic-v1";
const META_KEY = "parentReportQ2eMonthlyRealistic";
const Q2E_SUFFICIENCY_TAG = "parent-report-q2e-monthly-v1";
const Q2E_META_KEY = "parentReportQ2eMonthly";
const LEGACY_Q1_TAG = "parent-report-q1-sim-v1";
const LEGACY_Q1_META_KEY = "parentReportQ1Sim";
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
const MONTH_FROM = "2026-04-01";
const MONTH_TO = "2026-04-30";

const AAA_STUDENTS = [
  { label: "AAA1", grade: 1, offset: 0 },
  { label: "AAA2", grade: 1, offset: 1 },
  { label: "AAA3", grade: 2, offset: 2 },
  { label: "AAA4", grade: 2, offset: 3 },
  { label: "AAA5", grade: 3, offset: 4 },
  { label: "AAA6", grade: 3, offset: 5 },
  { label: "AAA7", grade: 4, offset: 6 },
  { label: "AAA8", grade: 4, offset: 7 },
  { label: "AAA9", grade: 5, offset: 8 },
  { label: "AAA10", grade: 5, offset: 9 },
  { label: "AAA11", grade: 6, offset: 10 },
  { label: "AAA12", grade: 6, offset: 11 },
];

/** Per-student monthly targets (PDF-visible volume). */
function monthlyTargets(grade, offset) {
  if (grade <= 2) {
    return {
      activeDays: 20,
      sessions: 24,
      answersPerSession: 10,
      durationSecondsPerSession: 780 + offset * 5,
      subjects: [
        { subject: "math", topic: "addition", sessionShare: 0.55 },
        { subject: "hebrew", topic: "vocabulary", sessionShare: 0.45 },
      ],
    };
  }
  if (grade <= 4) {
    return {
      activeDays: 20,
      sessions: 26,
      answersPerSession: 9,
      durationSecondsPerSession: 840 + offset * 5,
      subjects: [
        { subject: "math", topic: grade <= 3 ? "multiplication" : "multiplication", sessionShare: 0.38 },
        {
          subject: "english",
          topic: grade <= 3 ? "vocabulary" : "grammar",
          sessionShare: 0.32,
        },
        { subject: "science", topic: "body", sessionShare: 0.3 },
      ],
    };
  }
  if (grade <= 5) {
    return {
      activeDays: 21,
      sessions: 28,
      answersPerSession: 10,
      durationSecondsPerSession: 870 + offset * 5,
      subjects: [
        { subject: "math", topic: "fractions", sessionShare: 0.3 },
        { subject: "english", topic: "grammar", sessionShare: 0.25 },
        { subject: "hebrew", topic: "reading_comprehension", sessionShare: 0.25 },
        { subject: "science", topic: "body", sessionShare: 0.2 },
      ],
    };
  }
  return {
    activeDays: 21,
    sessions: 28,
    answersPerSession: 10,
    durationSecondsPerSession: 900 + offset * 5,
    subjects: [
      { subject: "math", topic: "fractions", sessionShare: 0.28 },
      { subject: "hebrew", topic: "reading_comprehension", sessionShare: 0.24 },
      { subject: "science", topic: "body", sessionShare: 0.24 },
      { subject: "moledet_geography", topic: "homeland", sessionShare: 0.24 },
    ],
  };
}

function gradeDbKey(gradeNum) {
  return `g${gradeNum}`;
}

function buildActiveDaySchedule(dayCount, offset) {
  const mustInclude = ["2026-04-28", "2026-04-29", "2026-04-30"];
  const pool = [];
  for (let d = 1; d <= 27; d += 1) {
    pool.push(`2026-04-${String(d).padStart(2, "0")}`);
  }
  const picked = new Set(mustInclude);
  let i = 0;
  while (picked.size < dayCount) {
    picked.add(pool[(i * 2 + offset) % pool.length]);
    i += 1;
  }
  return [...picked].sort();
}

function assignSessionDays(sessionCount, activeDays) {
  const days = [...activeDays];
  const assignments = [];
  for (let s = 0; s < sessionCount; s += 1) {
    assignments.push(days[Math.min(Math.floor((s * days.length) / sessionCount), days.length - 1)]);
  }
  if (sessionCount >= 3) {
    assignments[sessionCount - 3] = "2026-04-28";
    assignments[sessionCount - 2] = "2026-04-29";
    assignments[sessionCount - 1] = "2026-04-30";
  }
  return assignments;
}

function distributeSessionsAcrossSubjects(subjects, sessionCount) {
  const counts = subjects.map((s) => Math.max(1, Math.round(sessionCount * s.sessionShare)));
  let delta = sessionCount - counts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (delta !== 0) {
    const idx = i % counts.length;
    if (delta > 0) {
      counts[idx] += 1;
      delta -= 1;
    } else if (counts[idx] > 1) {
      counts[idx] -= 1;
      delta += 1;
    }
    i += 1;
  }
  const plan = [];
  subjects.forEach((subj, idx) => {
    for (let n = 0; n < counts[idx]; n += 1) {
      plan.push({ subject: subj.subject, topic: subj.topic });
    }
  });
  return plan;
}

function buildSessionAnswers(dayIso, count, sessionIndex) {
  const answers = [];
  let wrongLeft = Math.max(2, Math.floor(count * 0.18));
  for (let i = 0; i < count; i += 1) {
    const isWrong = wrongLeft > 0 && i % 4 === 0;
    if (isWrong) wrongLeft -= 1;
    const hour = 8 + ((sessionIndex + i) % 9);
    answers.push({
      isCorrect: !isWrong,
      answeredAt: `${dayIso}T${String(hour).padStart(2, "0")}:${String(12 + (i % 45)).padStart(2, "0")}:00.000Z`,
    });
  }
  return answers;
}

function diagnosticAnswerPayload({ subject, topic, grade, isCorrect }) {
  const classification = classifyActivityEvidence("practice", "free_practice", { hintsUsed: 0 });
  return {
    subject,
    topic,
    gameMode: "practice",
    level: "medium",
    gradeLevel: grade,
    prompt: `Realistic monthly ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: isCorrect ? "42" : "99",
    hintsUsed: 0,
    timeSpentMs: 8000,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { [META_KEY]: SEED_TAG },
  };
}

async function resolveAaaStudents(supabase) {
  const loginUsernames = AAA_STUDENTS.map((s) => s.label.toLowerCase());
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
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
    .select("id, full_name, grade_level, parent_id")
    .in("id", studentIds);
  if (stErr) throw new Error(`students lookup: ${stErr.message}`);

  const byId = new Map((students || []).map((s) => [s.id, s]));
  return AAA_STUDENTS.map((entry) => {
    const studentId = byUsername.get(entry.label.toLowerCase());
    if (!studentId) throw new Error(`Missing access code for ${entry.label}`);
    const row = byId.get(studentId);
    if (!row?.id) throw new Error(`Missing student row for ${entry.label}`);
    if (row.parent_id !== QA_PARENT_ID) throw new Error(`${entry.label} parent_id mismatch`);
    return { ...entry, studentId: row.id, fullName: row.full_name, gradeLevel: row.grade_level };
  });
}

async function cleanTaggedSeedsForTag(supabase, studentIds, tag, metaKey) {
  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id")
    .in("student_id", studentIds)
    .contains("metadata", { [metaKey]: tag });

  const sessionIds = (sessions || []).map((s) => s.id).filter(Boolean);
  if (sessionIds.length) {
    await supabase.from("answers").delete().in("learning_session_id", sessionIds);
    await supabase.from("learning_sessions").delete().in("id", sessionIds);
  }

  const { data: parentActs } = await supabase
    .from("parent_assigned_activities")
    .select("id")
    .in("student_id", studentIds)
    .like("title", `[${tag}]%`);
  const actIds = (parentActs || []).map((a) => a.id);
  if (actIds.length) {
    await supabase.from("parent_activity_attempts").delete().in("activity_id", actIds);
    await supabase.from("parent_activity_status").delete().in("activity_id", actIds);
    await supabase.from("parent_assigned_activities").delete().in("id", actIds);
  }

  const { data: bookSessions } = await supabase
    .from("book_reading_sessions")
    .select("id")
    .in("student_id", studentIds)
    .like("client_session_token", `${tag}_%`);
  const bookIds = (bookSessions || []).map((b) => b.id);
  if (bookIds.length) {
    await supabase.from("book_page_visits").delete().in("book_reading_session_id", bookIds);
    await supabase.from("book_reading_sessions").delete().in("id", bookIds);
  }

  return {
    tag,
    metaKey,
    removedSessions: sessionIds.length,
    removedParentActivities: actIds.length,
    removedBookSessions: bookIds.length,
  };
}

async function insertPracticeSession(
  supabase,
  studentId,
  { subject, topic, grade, answers, sessionIndex, durationSeconds }
) {
  if (!answers.length) return { sessionId: null, answerCount: 0, durationSeconds: 0 };
  const startedMs = Date.parse(answers[0].answeredAt);
  const endedMs = Date.parse(answers[answers.length - 1].answeredAt) + durationSeconds * 1000;
  const correct = answers.filter((a) => a.isCorrect).length;

  const { data: sessionRow, error: sessErr } = await supabase
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      subject,
      topic,
      started_at: new Date(startedMs).toISOString(),
      ended_at: new Date(endedMs).toISOString(),
      duration_seconds: durationSeconds,
      status: "completed",
      metadata: {
        mode: "practice",
        gameMode: "practice",
        gradeLevel: grade,
        [META_KEY]: SEED_TAG,
        summary: {
          totalQuestions: answers.length,
          correctAnswers: correct,
          wrongAnswers: answers.length - correct,
        },
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
    answer_payload: diagnosticAnswerPayload({
      subject,
      topic,
      grade,
      isCorrect: a.isCorrect,
    }),
  }));
  const { error: ansErr } = await supabase.from("answers").insert(rows);
  if (ansErr) throw new Error(`answers insert: ${ansErr.message}`);
  return { sessionId: sessionRow.id, answerCount: rows.length, durationSeconds };
}

async function seedStudent(supabase, entry) {
  const grade = gradeDbKey(entry.grade);
  const targets = monthlyTargets(entry.grade, entry.offset);
  const activeDays = buildActiveDaySchedule(targets.activeDays, entry.offset);
  const sessionDays = assignSessionDays(targets.sessions, activeDays);
  const sessionPlan = distributeSessionsAcrossSubjects(targets.subjects, targets.sessions);

  let totalAnswers = 0;
  let totalDuration = 0;
  const subjectStats = {};
  const daysUsed = new Set();

  for (let si = 0; si < sessionPlan.length; si += 1) {
    const subj = sessionPlan[si];
    const day = sessionDays[si];
    daysUsed.add(day);
    const answers = buildSessionAnswers(day, targets.answersPerSession, si + entry.offset);
    const durationSeconds = targets.durationSecondsPerSession + (si % 3) * 60;
    const res = await insertPracticeSession(supabase, entry.studentId, {
      subject: subj.subject,
      topic: subj.topic,
      grade,
      answers,
      sessionIndex: si,
      durationSeconds,
    });
    totalAnswers += res.answerCount;
    totalDuration += res.durationSeconds;
    const key = `${subj.subject}/${subj.topic}`;
    subjectStats[key] = subjectStats[key] || { subject: subj.subject, topic: subj.topic, sessions: 0, answers: 0 };
    subjectStats[key].sessions += 1;
    subjectStats[key].answers += res.answerCount;
  }

  return {
    label: entry.label,
    studentId: entry.studentId,
    totalSessions: sessionPlan.length,
    totalAnswers,
    totalDurationMinutes: Math.round(totalDuration / 60),
    activeDaysApprox: daysUsed.size,
    lastActivityDay: sessionDays[sessionDays.length - 1],
    subjects: Object.values(subjectStats),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapQaDbWriteGuard(
    "qa/parent-report-q2e-monthly-realistic-seed",
    "PARENT_REPORT_Q2E_MONTHLY_REALISTIC_SEED",
    argv
  );
  const cleanOnly = guard.mode.cleanOnly;
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary({ artifactPath: ARTIFACT_DIR });
    return;
  }

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const cleanOnly = guard.mode.cleanOnly;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const studentIds = students.map((s) => s.studentId);

  console.log(`\n=== Realistic full-month seed (${SEED_TAG}) ===`);
  console.log(`Window: ${MONTH_FROM} .. ${MONTH_TO}`);
  console.log("Cleanup (tag-scoped, exclusive April window for PDF package):");
  console.log(`  - ${SEED_TAG}`);
  console.log(`  - ${Q2E_SUFFICIENCY_TAG} (re-seed separately for edge-case QA)`);
  console.log(`  - ${LEGACY_Q1_TAG}\n`);

  const cleanupRealistic = await cleanTaggedSeedsForTag(supabase, studentIds, SEED_TAG, META_KEY);
  const cleanupQ2e = await cleanTaggedSeedsForTag(supabase, studentIds, Q2E_SUFFICIENCY_TAG, Q2E_META_KEY);
  const cleanupQ1 = await cleanTaggedSeedsForTag(supabase, studentIds, LEGACY_Q1_TAG, LEGACY_Q1_META_KEY);
  console.log("Cleaned sessions:", {
    realistic: cleanupRealistic.removedSessions,
    q2eSufficiency: cleanupQ2e.removedSessions,
    legacyQ1: cleanupQ1.removedSessions,
  });

  if (cleanOnly) {
    console.log("--clean-only: done");
    return;
  }

  const results = [];
  for (const entry of students) {
    console.log(`Seeding ${entry.label} (grade ${entry.grade})...`);
    const row = await seedStudent(supabase, entry);
    results.push(row);
    console.log(
      `  ${row.totalSessions} sessions, ${row.totalAnswers} answers, ${row.totalDurationMinutes} min, last=${row.lastActivityDay}, subjects: ${row.subjects.map((s) => s.subject).join(", ")}`
    );
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const outPath = path.join(ARTIFACT_DIR, "realistic-seed-results.json");
  await writeFile(
    outPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        seedTag: SEED_TAG,
        metaKey: META_KEY,
        monthWindow: { from: MONTH_FROM, to: MONTH_TO },
        cleanupNote:
          "Exclusive April window for realistic PDF package. Q2E sufficiency and Q1 sim tags removed (tag-scoped). Re-run parent-report-q2e-monthly-simulation.mjs to restore edge-case seed.",
        cleanup: { realistic: cleanupRealistic, q2e: cleanupQ2e, q1: cleanupQ1 },
        students: results,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nWrote ${outPath}`);
  console.log(`Seeded ${results.length} students`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

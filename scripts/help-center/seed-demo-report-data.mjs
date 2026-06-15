#!/usr/bin/env node
/**
 * Local/dev only: seed Supabase learning activity for Help Center demo child (ADMIN / ישראל ישראלי).
 * Writes to learning_sessions + answers (same tables as live learning + parent report API).
 *
 *   node --env-file=.env.local scripts/help-center/seed-demo-report-data.mjs
 *   node --env-file=.env.local scripts/help-center/seed-demo-report-data.mjs --clean-only
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CANONICAL_SUBJECT_BUCKETS } from "../../utils/dev-student-simulator/canonical-topic-keys.js";
import {
  aggregateParentReportPayload,
  REPORT_AGG_SUBJECTS,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import {
  createProductionScriptGuard,
  exitOnGuardError,
} from "../lib/production-script-guard.mjs";

const SUBJECT_BUCKETS = CANONICAL_SUBJECT_BUCKETS;
const DAY_MS = 24 * 60 * 60 * 1000;

const SEED_TAG = "help-center-demo-v1";
const DEMO_VISIBLE_NAME = "ישראל ישראלי";
const DEMO_LOGIN_USERNAME = "admin";
const DEMO_PIN = "1234";
const EXPECTED_PARENT_EMAIL = "admin@admin.com";

const SIM_TO_DB_SUBJECT = {
  math: "math",
  geometry: "geometry",
  english: "english",
  hebrew: "hebrew",
  science: "science",
  "moledet-geography": "moledet_geography",
};

const SUBJECT_PROFILES = {
  math: {
    label: "חשבון",
    accuracy: 48,
    topics: ["addition", "multiplication", "fractions", "word_problems"],
    questionsPerTopic: 7,
  },
  geometry: {
    label: "גיאומטריה",
    accuracy: 76,
    topics: ["area", "perimeter", "angles", "shapes_basic"],
    questionsPerTopic: 7,
  },
  hebrew: {
    label: "עברית",
    accuracy: 55,
    topics: ["reading", "comprehension", "grammar", "vocabulary"],
    questionsPerTopic: 7,
  },
  english: {
    label: "אנגלית",
    accuracy: 86,
    topics: ["vocabulary", "grammar", "translation", "sentences"],
    questionsPerTopic: 7,
  },
  science: {
    label: "מדעים",
    accuracy: 64,
    topics: ["body", "earth_space", "environment", "plants"],
    questionsPerTopic: 7,
  },
  "moledet-geography": {
    label: "מולדת וגיאוגרפיה",
    accuracy: 58,
    topics: ["homeland", "geography", "values", "citizenship"],
    questionsPerTopic: 7,
  },
};

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function hashStudentSecret(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function validateTopics(simSubject, topics) {
  const allowed = new Set(SUBJECT_BUCKETS[simSubject] || []);
  for (const t of topics) {
    if (!allowed.has(t)) {
      throw new Error(`Unknown topic "${t}" for ${simSubject}`);
    }
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maxSessionsForQuestions(q) {
  return Math.max(1, Math.min(50, Math.ceil(q / 22)));
}

function allocateTotals(targetSessions, targetQuestions, rng) {
  const out = [];
  let rem = targetQuestions;
  for (let i = 0; i < targetSessions - 1; i += 1) {
    const rest = targetSessions - i;
    const base = rem / rest;
    const jitter = 0.55 + rng() * 0.55;
    const n = Math.max(1, Math.min(42, Math.round(base * jitter)));
    out.push(n);
    rem -= n;
  }
  out.push(Math.max(1, rem));
  return out;
}

function buildDayIndices(spanDays, sessionCount, targetActiveDays, rng) {
  const span = Math.max(1, spanDays);
  const days = [];
  for (let i = 0; i < sessionCount; i += 1) {
    days.push(Math.floor(rng() * span));
  }
  const want = Math.max(1, Math.min(targetActiveDays, span));
  let guard = 0;
  while (guard++ < 8000) {
    if (new Set(days).size >= want) break;
    const idx = Math.floor(rng() * sessionCount);
    days[idx] = Math.floor(rng() * span);
  }
  return days;
}

/** Mirrors dev-student-simulator custom builder output shape (no browser storage). */
function buildHelpCenterSimulatorSessions(anchorEndMs = Date.now()) {
  const spanDays = 28;
  const activeDays = 16;
  const oldest = anchorEndMs - (spanDays - 1) * DAY_MS;
  const sessions = [];

  for (const simSubject of Object.keys(SUBJECT_PROFILES)) {
    const profile = SUBJECT_PROFILES[simSubject];
    validateTopics(simSubject, profile.topics);
    for (const topic of profile.topics) {
      const targetQ = profile.questionsPerTopic;
      const rng = mulberry32(
        [...`${DEMO_VISIBLE_NAME}:${simSubject}:${topic}:${anchorEndMs}`].reduce(
          (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619),
          2166136261
        )
      );
      const sc = maxSessionsForQuestions(targetQ);
      const totals = allocateTotals(sc, targetQ, rng);
      const dayIndices = buildDayIndices(spanDays, sc, activeDays, rng);
      const baseAcc = profile.accuracy / 100;
      for (let i = 0; i < sc; i += 1) {
        const dayIndex = dayIndices[i];
        const ts = oldest + dayIndex * DAY_MS + Math.floor(rng() * 0.75 * DAY_MS);
        const total = totals[i];
        const correct = Math.max(0, Math.min(total, Math.round(total * baseAcc)));
        sessions.push({
          subject: simSubject,
          bucket: topic,
          timestamp: ts,
          date: new Date(ts).toISOString().split("T")[0],
          total,
          correct,
          duration: 720,
          grade: "g4",
          level: profile.accuracy >= 80 ? "easy" : profile.accuracy <= 55 ? "hard" : "medium",
          mode: "learning",
        });
      }
    }
  }
  return sessions.sort((a, b) => a.timestamp - b.timestamp);
}

function toDbSubject(simSubject) {
  const db = SIM_TO_DB_SUBJECT[simSubject];
  if (!db) throw new Error(`No DB subject mapping for ${simSubject}`);
  return db;
}

async function resolveDemoStudent(supabase, accessSecret) {
  const codeHash = hashStudentSecret(DEMO_LOGIN_USERNAME, accessSecret);
  const { data: codes, error: codeErr } = await supabase
    .from("student_access_codes")
    .select("id, student_id, login_username, is_active, revoked_at")
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (codeErr) {
    throw new Error(`Access code lookup failed: ${codeErr.message}`);
  }
  const active = (codes || []).filter((c) => c.student_id);
  if (active.length !== 1) {
    throw new Error(
      `§14.1 blocker: expected exactly one active access code for login "${DEMO_LOGIN_USERNAME}", found ${active.length}. Run help:provision-demo first.`
    );
  }

  const studentId = active[0].student_id;
  const { data: student, error: stErr } = await supabase
    .from("students")
    .select("id, full_name, parent_id, grade_level")
    .eq("id", studentId)
    .maybeSingle();

  if (stErr || !student?.id) {
    throw new Error(`§14.1 blocker: student row missing for resolved id`);
  }
  if (student.full_name !== DEMO_VISIBLE_NAME) {
    throw new Error(
      `§14.1 blocker: resolved student display name "${student.full_name}" !== "${DEMO_VISIBLE_NAME}"`
    );
  }

  const parentLinked = Boolean(student.parent_id);
  if (!parentLinked) {
    throw new Error("§14.1 blocker: demo student has no parent_id — run help:provision-demo first.");
  }

  return {
    studentId: student.id,
    fullName: student.full_name,
    parentId: student.parent_id,
    parentLinked,
    expectedParentEmail: EXPECTED_PARENT_EMAIL,
    gradeLevel: student.grade_level || "grade_4",
  };
}

async function cleanPriorSeeds(supabase, studentId) {
  const { data: sessions, error } = await supabase
    .from("learning_sessions")
    .select("id")
    .eq("student_id", studentId)
    .contains("metadata", { helpCenterDemoSeed: SEED_TAG });

  if (error) {
    throw new Error(`Cleanup lookup failed: ${error.message}`);
  }
  const ids = (sessions || []).map((s) => s.id).filter(Boolean);
  if (ids.length === 0) {
    return { removedSessions: 0, removedAnswers: 0 };
  }

  const { count: answerCount, error: ansCountErr } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .in("learning_session_id", ids);
  if (ansCountErr) {
    throw new Error(`Cleanup answer count failed: ${ansCountErr.message}`);
  }

  const { error: delAnsErr } = await supabase.from("answers").delete().in("learning_session_id", ids);
  if (delAnsErr) {
    throw new Error(`Cleanup answers failed: ${delAnsErr.message}`);
  }
  const { error: delSessErr } = await supabase.from("learning_sessions").delete().in("id", ids);
  if (delSessErr) {
    throw new Error(`Cleanup sessions failed: ${delSessErr.message}`);
  }
  return { removedSessions: ids.length, removedAnswers: answerCount || 0 };
}

function spreadAnswerTimes(startMs, endMs, count) {
  if (count <= 1) return [startMs];
  const span = Math.max(1, endMs - startMs);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(startMs + Math.floor((span * i) / (count - 1)));
  }
  return out;
}

async function insertSimulatorSessions(supabase, studentId, simSessions) {
  const perSubject = {};
  for (const s of simSessions) {
    const dbSubject = toDbSubject(s.subject);
    if (!perSubject[dbSubject]) {
      perSubject[dbSubject] = { sessions: 0, answers: 0, correct: 0, wrong: 0 };
    }

    const startedMs = s.timestamp;
    const durationSec = Math.max(60, Math.floor(Number(s.duration) || 600));
    const endedMs = startedMs + durationSec * 1000;
    const startedAt = new Date(startedMs).toISOString();
    const endedAt = new Date(endedMs).toISOString();
    const wrong = Math.max(0, s.total - s.correct);
    const accuracy = s.total > 0 ? Number(((s.correct / s.total) * 100).toFixed(2)) : 0;

    const { data: sessionRow, error: sessErr } = await supabase
      .from("learning_sessions")
      .insert({
        student_id: studentId,
        subject: dbSubject,
        topic: s.bucket,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSec,
        status: "completed",
        metadata: {
          mode: s.mode || "learning",
          level: s.level || "medium",
          gameMode: s.mode || "learning",
          gradeLevel: s.grade || "g4",
          contentGradeLevel: s.grade || "g4",
          helpCenterDemoSeed: SEED_TAG,
          summary: {
            totalQuestions: s.total,
            correctAnswers: s.correct,
            wrongAnswers: wrong,
            accuracy,
          },
          clientMeta: {
            origin: "help-center-demo-seed",
            helpCenterDemoSeed: SEED_TAG,
          },
        },
      })
      .select("id")
      .single();

    if (sessErr || !sessionRow?.id) {
      throw new Error(`Session insert failed (${dbSubject}/${s.bucket}): ${sessErr?.message}`);
    }

    perSubject[dbSubject].sessions += 1;
    const answerTimes = spreadAnswerTimes(startedMs, endedMs, s.total);
    const answerRows = [];
    for (let i = 0; i < s.total; i += 1) {
      const isCorrect = i < s.correct;
      answerRows.push({
        student_id: studentId,
        learning_session_id: sessionRow.id,
        question_id: `${SEED_TAG}:${sessionRow.id}:${i}`,
        is_correct: isCorrect,
        answered_at: new Date(answerTimes[i]).toISOString(),
        answer_payload: {
          subject: dbSubject,
          topic: s.bucket,
          prompt: `Help Center demo ${dbSubject} ${s.bucket} #${i + 1}`,
          expectedAnswer: isCorrect ? "demo-ok" : "demo-expected",
          userAnswer: isCorrect ? "demo-ok" : "demo-wrong",
          hintsUsed: isCorrect ? 0 : i % 3 === 0 ? 1 : 0,
          timeSpentMs: 4000 + (i % 5) * 800,
          gradeLevel: s.grade || "g4",
          gameMode: s.mode || "learning",
          level: s.level || "medium",
          clientMeta: {
            origin: "help-center-demo-seed",
            helpCenterDemoSeed: SEED_TAG,
          },
        },
      });
      perSubject[dbSubject].answers += 1;
      if (isCorrect) perSubject[dbSubject].correct += 1;
      else perSubject[dbSubject].wrong += 1;
    }

    const CHUNK = 40;
    for (let off = 0; off < answerRows.length; off += CHUNK) {
      const chunk = answerRows.slice(off, off + CHUNK);
      const { error: ansErr } = await supabase.from("answers").insert(chunk);
      if (ansErr) {
        throw new Error(`Answer insert failed: ${ansErr.message}`);
      }
    }
  }
  return perSubject;
}

async function verifyReportAggregate(supabase, student) {
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const payload = await aggregateParentReportPayload(
    supabase,
    student,
    fromDate,
    toDate
  );
  const summary = {};
  for (const subject of REPORT_AGG_SUBJECTS) {
    const row = payload?.subjects?.[subject] || {};
    summary[subject] = {
      sessions: row.sessions || 0,
      answers: row.answers || 0,
      correct: row.correct || 0,
      topics: Object.keys(row.topics || {}).length,
    };
  }
  return summary;
}

async function main() {
  if (process.env.HELP_CENTER_BLOCK_DB_SEED === "1") {
    console.error("Refusing seed: HELP_CENTER_BLOCK_DB_SEED=1");
    process.exit(1);
  }

  const guard = createProductionScriptGuard({
    scriptName: "help-center/seed-demo-report-data",
    confirmOperation: "SEED_HELP_CENTER_DEMO_REPORT",
    affectedTables: ["learning_sessions", "answers", "answer_payload"],
    defaultDryRun: true,
  });
  guard.printStartBanner();
  try {
    guard.assertWriteAllowed();
  } catch (err) {
    exitOnGuardError(err);
  }

  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary();
    return;
  }

  const cleanOnly = guard.mode.cleanOnly;

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const accessSecret = requireEnv("LEARNING_STUDENT_ACCESS_SECRET");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const demo = await resolveDemoStudent(supabase, accessSecret);
  console.log("Resolved demo student:", demo.studentId);
  console.log("Display name:", demo.fullName);
  console.log("Parent linked:", demo.parentLinked, `(expected QA: ${demo.expectedParentEmail})`);

  const cleanup = await cleanPriorSeeds(supabase, demo.studentId);
  console.log(
    `Cleaned prior seed tag "${SEED_TAG}": ${cleanup.removedSessions} sessions, ${cleanup.removedAnswers} answers`
  );

  if (cleanOnly) {
    console.log("--clean-only: done");
    guard.printEndSummary({
      affectedRows: 0,
      skippedRows: cleanup.removedAnswers || 0,
    });
    return;
  }

  const simSessions = buildHelpCenterSimulatorSessions(Date.now());
  console.log(`Built ${simSessions.length} simulator sessions from custom spec`);

  const inserted = await insertSimulatorSessions(supabase, demo.studentId, simSessions);
  console.log("Inserted per DB subject:");
  for (const subject of REPORT_AGG_SUBJECTS) {
    const row = inserted[subject] || { sessions: 0, answers: 0, correct: 0, wrong: 0 };
    console.log(
      `  ${subject}: sessions=${row.sessions} answers=${row.answers} correct=${row.correct} wrong=${row.wrong}`
    );
  }

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, full_name, parent_id, grade_level, created_at")
    .eq("id", demo.studentId)
    .single();

  const reportSummary = await verifyReportAggregate(supabase, studentRow);
  console.log("Parent report aggregate (30d window):");
  let allSix = true;
  for (const subject of REPORT_AGG_SUBJECTS) {
    const row = reportSummary[subject];
    const ok = row.sessions >= 3 && row.answers >= 20;
    if (!ok) allSix = false;
    console.log(
      `  ${subject}: sessions=${row.sessions} answers=${row.answers} topics=${row.topics} ${ok ? "OK" : "LOW"}`
    );
  }
  if (!allSix) {
    console.warn("Warning: one or more subjects below target thresholds in aggregate window (may include pre-existing data mix).");
  } else {
    console.log("All six subjects meet minimum activity thresholds in report aggregate.");
  }

  guard.printEndSummary({
    affectedRows: Object.values(inserted || {}).reduce((n, row) => n + (row.answers || 0), 0),
    skippedRows: cleanup.removedAnswers || 0,
    artifactPath: "(inline console summary)",
  });
}

main().catch((err) => {
  if (err?.name === "ProductionScriptGuardError") {
    exitOnGuardError(err);
  }
  console.error(err?.message || err);
  process.exit(1);
});

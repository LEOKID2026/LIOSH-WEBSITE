/**
 * One-date practice-mode validation (simulation-only).
 * Student UI login + subject drivers + Supabase read-back.
 * Does NOT use D2 date guard or parent preflight.
 *
 * Usage:
 *   node scripts/virtual-student-qa/tools/practice-mode-validation-smoke.mjs
 *     --students AAA1,AAA3,AAA5
 *     --date 2026-06-15
 *     [--baseUrl https://liosh-website.vercel.app]
 */
import { createClient } from "@supabase/supabase-js";
import { launchBrowser, newStudentContext } from "../lib/browser.mjs";
import {
  loadAccounts,
  selectAccount,
  resolveBaseUrl,
  resolveStudentAuthMode,
  getRepoRoot,
} from "../lib/config.mjs";
import { authenticateStudent } from "../lib/student-auth.mjs";
import { runMathScenario } from "../lib/subject-drivers/math-master.mjs";
import { runGeometryScenario } from "../lib/subject-drivers/geometry-master.mjs";
import { runEnglishScenario } from "../lib/subject-drivers/english-master.mjs";
import { runHebrewScenario } from "../lib/subject-drivers/hebrew-master.mjs";
import { runScienceScenario } from "../lib/subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "../lib/subject-drivers/moledet-geography-master.mjs";
import { pickAnswerForArithmetic, makeRng } from "../lib/answer-profiles.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUBJECT_RUNNERS = {
  math: runMathScenario,
  geometry: runGeometryScenario,
  english: runEnglishScenario,
  hebrew: runHebrewScenario,
  science: runScienceScenario,
  "moledet-geography": runMoledetGeographyScenario,
};

const MINIMAL_SCENARIOS = {
  math: { grade: 1, operation: "addition", topic: "addition", questionCount: 3, profile: "strong", seed: 0xa1b201 },
  geometry: { grade: 4, topic: "area", questionCount: 3, profile: "average", seed: 0xa1b202 },
  english: { grade: 2, topic: "vocabulary", questionCount: 3, profile: "average", seed: 0xa1b203 },
  hebrew: { grade: 3, topic: "reading", questionCount: 3, profile: "average", seed: 0xa1b204 },
  science: { grade: 3, topic: "experiments", questionCount: 3, profile: "strong", seed: 0xa1b205 },
  "moledet-geography": { grade: 4, topic: "israel_map", questionCount: 3, profile: "average", seed: 0xa1b206 },
};

function parseArgs(argv) {
  const out = { students: "AAA1,AAA3,AAA5", date: "2026-06-15", baseUrl: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--students") out.students = String(argv[++i] || out.students);
    else if (a === "--date") out.date = String(argv[++i] || out.date);
    else if (a === "--baseUrl") out.baseUrl = String(argv[++i] || "");
  }
  return out;
}

function loadServiceSupabase() {
  const root = getRepoRoot();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^LEARNING_SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
      if (m && !process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY) {
        process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY = m[1].trim();
      }
      const u = line.match(/^NEXT_PUBLIC_LEARNING_SUPABASE_URL=(.+)$/);
      if (u && !process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL) {
        process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL = u[1].trim();
      }
    }
  }
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL/service role in .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildScenario(subject, studentLabel) {
  const base = MINIMAL_SCENARIOS[subject];
  const rng = makeRng(base.seed);
  return {
    id: `practice-smoke-${studentLabel}-${subject}`,
    studentLabel,
    subject,
    profile: base.profile,
    grade: base.grade,
    operation: base.operation,
    topic: base.topic,
    questionCount: base.questionCount,
    weaknessTopics: [],
    rng: () => rng,
    pickAnswer: ({ profile, computedAnswer, topicKey, weaknessTopics }) =>
      pickAnswerForArithmetic({ profile, computedAnswer, rng, topicKey, weaknessTopics }),
  };
}

async function resolveStudentId(supabase, label) {
  const login = label.toLowerCase();
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .eq("login_username", login)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1);
  if (error) throw new Error(`access code lookup ${label}: ${error.message}`);
  return codes?.[0]?.student_id || null;
}

async function queryDayEvidence(supabase, studentId, date) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, subject, started_at, metadata")
    .eq("student_id", studentId)
    .gte("started_at", dayStart)
    .lte("started_at", dayEnd)
    .order("started_at", { ascending: false });
  if (sErr) throw new Error(sErr.message);

  const sessionIds = (sessions || []).map((s) => s.id);
  let answers = [];
  if (sessionIds.length) {
    const { data: rows, error: aErr } = await supabase
      .from("answers")
      .select("id, learning_session_id, answer_payload, answered_at")
      .in("learning_session_id", sessionIds);
    if (aErr) throw new Error(aErr.message);
    answers = rows || [];
  }

  const sessionModes = [...new Set((sessions || []).map((s) => s.metadata?.mode || "(none)"))];
  const gameModes = [
    ...new Set(
      answers.map((a) => a.answer_payload?.gameMode || a.answer_payload?.mode || "(none)")
    ),
  ];
  const categories = [
    ...new Set(answers.map((a) => a.answer_payload?.evidenceCategory || "(none)")),
  ];
  const learningCreated = sessionModes.includes("learning") || gameModes.includes("learning");
  const flags = answers.some((a) => {
    const cf = a.answer_payload?.contextFlags || {};
    return cf.afterStepByStep === true || cf.contextAfterBookReading === true;
  });

  return {
    sessions: sessions?.length || 0,
    sessionModes,
    answers: answers.length,
    gameModes,
    evidenceCategories: categories,
    anyLearning: learningCreated,
    anyContextFlags: flags,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const studentLabels = args.students.split(",").map((s) => s.trim()).filter(Boolean);
  const baseUrl = resolveBaseUrl(args.baseUrl);
  const accounts = loadAccounts();
  const studentAuthMode = resolveStudentAuthMode();
  const supabase = loadServiceSupabase();
  const logLines = [];
  const log = (line) => {
    console.log(line);
    logLines.push(line);
  };

  const driverPracticeSelected = {};
  const subjectResults = {};
  const dbByStudent = {};
  let failures = [];

  log(`practice-mode-validation: baseUrl=${baseUrl} date=${args.date} students=${studentLabels.join(",")}`);

  const browser = await launchBrowser({ headed: false });
  try {
    for (const label of studentLabels) {
      const account = selectAccount(accounts, label);
      const context = await newStudentContext(browser);
      const page = await context.newPage();
      try {
        await authenticateStudent({ context, page, account, baseUrl, mode: studentAuthMode, log });
        for (const [subject, runner] of Object.entries(SUBJECT_RUNNERS)) {
          const key = `${label}/${subject}`;
          const captured = [];
          try {
            const scenario = buildScenario(subject, label);
            const wrapLog = (line) => {
              captured.push(line);
              log(line);
            };
            await runner({
              page,
              baseUrl,
              scenario,
              log: wrapLog,
              screenshotter: async () => {},
            });
            const selected = captured.some(
              (l) => l.includes("selected Practice tab") || l.includes("countable evidence ok")
            );
            driverPracticeSelected[key] = selected ? "yes" : "no";
            subjectResults[key] = "ok";
          } catch (err) {
            const selected = captured.some((l) => l.includes("selected Practice tab"));
            driverPracticeSelected[key] = selected ? "yes" : "no";
            subjectResults[key] = String(err?.message || err).slice(0, 200);
            failures.push(`${key}: ${subjectResults[key]}`);
          }
        }
      } finally {
        await context.close().catch(() => {});
      }

      const studentId = await resolveStudentId(supabase, label);
      if (studentId) {
        dbByStudent[label] = await queryDayEvidence(supabase, studentId, args.date);
      } else {
        dbByStudent[label] = { error: "student_id not found" };
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const report = {
    command:
      "node scripts/virtual-student-qa/tools/practice-mode-validation-smoke.mjs " +
      `--students ${args.students} --date ${args.date}`,
    completed: failures.length === 0,
    students: studentLabels,
    failures,
    driverPracticeSelected,
    subjectResults,
    dbByStudent,
    logExcerpt: logLines.filter(
      (l) =>
        l.includes("Practice tab") ||
        l.includes("countable evidence") ||
        l.includes("non-countable")
    ),
  };
  console.log("\n=== PRACTICE MODE VALIDATION JSON ===");
  console.log(JSON.stringify(report, null, 2));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error("practice-mode-validation: FAIL", e.message || e);
  process.exit(1);
});

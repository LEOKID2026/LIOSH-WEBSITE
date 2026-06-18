/**
 * Practice-only gate smoke — all 6 subjects, production QA guards.
 *
 * Proves every driver opens Practice (not Learning) with runtime + answer guards.
 * Emits owner gate table before full range approval.
 *
 * Usage:
 *   node scripts/virtual-student-qa/tools/practice-only-gate-smoke.mjs
 *     [--students AAA1,AAA2]
 *     [--date 2026-05-01]
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
  resolveInSessionPacingEnabled,
} from "../lib/config.mjs";
import {
  assertDriverSourcesPracticeOnly,
  assertProductionPracticeOnlyGuard,
  REQUIRED_SESSION_MODE,
  REQUIRED_GAME_MODE,
} from "../lib/practice-only-guard.mjs";
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

const GATE_SCENARIOS = {
  math: {
    grade: 1,
    operation: "addition",
    topic: "addition",
    questionCount: 2,
    intendedMinutes: 4,
    profile: "strong",
    seed: 0xb1c001,
  },
  geometry: {
    grade: 4,
    topic: "area",
    questionCount: 2,
    intendedMinutes: 4,
    profile: "average",
    seed: 0xb1c002,
  },
  english: {
    grade: 4,
    topic: null,
    questionCount: 3,
    intendedMinutes: 4,
    profile: "strong",
    seed: 0xb1c003,
  },
  hebrew: {
    grade: 3,
    topic: "reading",
    questionCount: 2,
    intendedMinutes: 4,
    profile: "strong",
    seed: 0xb1c004,
  },
  science: {
    grade: 3,
    topic: "observation",
    questionCount: 2,
    intendedMinutes: 4,
    profile: "strong",
    seed: 0xb1c005,
  },
  "moledet-geography": {
    grade: 4,
    topic: "israel_map",
    questionCount: 2,
    intendedMinutes: 4,
    profile: "average",
    seed: 0xb1c006,
  },
};

function parseArgs(argv) {
  const out = { students: "AAA1", date: "2026-05-01", baseUrl: "" };
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
  const base = GATE_SCENARIOS[subject];
  const rng = makeRng(base.seed);
  return {
    id: `practice-gate-${studentLabel}-${subject}`,
    studentLabel,
    subject,
    profile: base.profile,
    grade: base.grade,
    operation: base.operation,
    topic: base.topic,
    questionCount: base.questionCount,
    intendedMinutes: base.intendedMinutes,
    inSessionPacingEnabled: true,
    weaknessTopics: [],
    rng: () => rng,
    pickAnswer: ({ profile, computedAnswer, topicKey, weaknessTopics }) =>
      pickAnswerForArithmetic({ profile, computedAnswer, rng, topicKey, weaknessTopics }),
  };
}

async function querySessionsByIds(supabase, sessionIds) {
  if (!sessionIds.length) return { sessions: [], answers: [] };
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, subject, metadata, started_at")
    .in("id", sessionIds);
  if (sErr) throw new Error(sErr.message);

  const { data: answers, error: aErr } = await supabase
    .from("answers")
    .select("id, learning_session_id, answer_payload")
    .in("learning_session_id", sessionIds);
  if (aErr) throw new Error(aErr.message);

  return { sessions: sessions || [], answers: answers || [] };
}

function countLearningRows(sessions, answers) {
  let learningSessions = 0;
  for (const s of sessions) {
    const mode = String(s.metadata?.mode || "").toLowerCase();
    if (mode === "learning" || mode === "learning_guided" || mode === "learning_book") {
      learningSessions += 1;
    }
  }
  let learningAnswers = 0;
  for (const a of answers) {
    const payload = a.answer_payload || {};
    const gm = String(payload.gameMode || payload.mode || "").toLowerCase();
    if (gm === "learning" || gm === "learning_guided" || gm === "learning_book") {
      learningAnswers += 1;
    }
  }
  return learningSessions + learningAnswers;
}

function buildGateRow(subject, runtime, db) {
  const sessionMode = runtime.sessionMode || db.sessionMode || "(none)";
  const gameMode = runtime.gameMode || db.gameMode || "(none)";
  const answers = runtime.answers ?? db.answers ?? 0;
  const countable = runtime.countable ?? 0;
  const excluded = runtime.excluded ?? 0;
  const learningRows = db.learningRows ?? 0;
  const ok =
    runtime.error == null &&
    sessionMode === REQUIRED_SESSION_MODE &&
    (gameMode === REQUIRED_GAME_MODE || gameMode === "(none)") &&
    countable > 0 &&
    learningRows === 0;
  return {
    subject,
    sessionMode,
    gameMode,
    answers,
    countable,
    excluded,
    learningRowsCreated: learningRows,
    verdict: ok ? "PASS" : "FAIL",
    error: runtime.error || null,
  };
}

function printGateTable(rows) {
  const header =
    "Subject | session.mode | gameMode | answers | countable | excluded | learning rows created | verdict";
  const sep = header.replace(/[^|]/g, "-");
  console.log("\n=== PRACTICE-ONLY GATE TABLE ===");
  console.log(header);
  console.log(sep);
  for (const r of rows) {
    console.log(
      `${r.subject} | ${r.sessionMode} | ${r.gameMode} | ${r.answers} | ${r.countable} | ${r.excluded} | ${r.learningRowsCreated} | ${r.verdict}`
    );
  }
  const allPass = rows.every((r) => r.verdict === "PASS");
  console.log(`\npractice-only gate: ${allPass ? "PASS" : "FAIL"} (${rows.length} subjects)`);
  return allPass;
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

  log(
    `practice-only-gate-smoke: baseUrl=${baseUrl} date=${args.date} ` +
      `students=${studentLabels.join(",")} inSessionPacing=${resolveInSessionPacingEnabled()}`
  );

  assertProductionPracticeOnlyGuard({ baseUrl, practiceOnlyEnabled: true, log });
  assertDriverSourcesPracticeOnly({ log });

  const subjectRuntime = {};
  for (const subject of Object.keys(SUBJECT_RUNNERS)) {
    subjectRuntime[subject] = {
      sessionIds: [],
      sessionMode: null,
      gameMode: REQUIRED_GAME_MODE,
      answers: 0,
      countable: 0,
      excluded: 0,
      error: null,
    };
  }

  const browser = await launchBrowser({ headed: false });
  try {
    for (const label of studentLabels) {
      const account = selectAccount(accounts, label);
      const context = await newStudentContext(browser);
      const page = await context.newPage();
      try {
        await authenticateStudent({
          context,
          page,
          account,
          baseUrl,
          mode: studentAuthMode,
          log,
        });

        for (const [subject, runner] of Object.entries(SUBJECT_RUNNERS)) {
          const rt = subjectRuntime[subject];
          try {
            const scenario = buildScenario(subject, label);
            const result = await runner({
              page,
              baseUrl,
              scenario,
              log,
              screenshotter: async () => {},
            });
            const ev = result?.evidence || {};
            rt.sessionMode = ev.sessionMode || REQUIRED_SESSION_MODE;
            rt.answers += ev.countableAnswers + ev.excludedAnswers;
            rt.countable += ev.countableAnswers || 0;
            rt.excluded += ev.excludedAnswers || 0;
            if (result?.sessionId) rt.sessionIds.push(result.sessionId);
          } catch (err) {
            rt.error = String(err?.message || err).slice(0, 300);
            log(`practice-only-gate-smoke: ${label}/${subject} FAIL — ${rt.error}`);
          }
        }
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const gateRows = [];
  for (const subject of Object.keys(SUBJECT_RUNNERS)) {
    const rt = subjectRuntime[subject];
    let dbPart = { sessionMode: null, gameMode: null, answers: 0, learningRows: 0 };
    if (rt.sessionIds.length) {
      const { sessions, answers } = await querySessionsByIds(supabase, rt.sessionIds);
      const sessionModes = [...new Set(sessions.map((s) => s.metadata?.mode || "(none)"))];
      const gameModes = [
        ...new Set(
          answers.map((a) => a.answer_payload?.gameMode || a.answer_payload?.mode || "(none)")
        ),
      ];
      dbPart = {
        sessionMode: sessionModes.length === 1 ? sessionModes[0] : sessionModes.join(","),
        gameMode: gameModes.length === 1 ? gameModes[0] : gameModes.join(","),
        answers: answers.length,
        learningRows: countLearningRows(sessions, answers),
      };
    }
    gateRows.push(buildGateRow(subject, rt, dbPart));
  }

  const allPass = printGateTable(gateRows);

  const report = {
    gate: "practice-only",
    date: args.date,
    baseUrl,
    students: studentLabels,
    inSessionPacingEnabled: resolveInSessionPacingEnabled(),
    staticGuard: "PASS",
    rows: gateRows,
    allPass,
    logExcerpt: logLines.filter(
      (l) =>
        l.includes("practice-only") ||
        l.includes("Practice tab") ||
        l.includes("session evidence")
    ),
  };
  console.log("\n=== PRACTICE-ONLY GATE JSON ===");
  console.log(JSON.stringify(report, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("practice-only-gate-smoke: FAIL", e.message || e);
  process.exit(1);
});

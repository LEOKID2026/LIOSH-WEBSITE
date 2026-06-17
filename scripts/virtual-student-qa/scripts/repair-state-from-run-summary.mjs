/**
 * Repair local simulator state when a PASS day's state-advance write failed
 * (e.g. EPERM on atomic rename) but run-summary artifacts are complete.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/repair-state-from-run-summary.mjs \
 *     --date 2026-06-17 \
 *     --run-summary reports/virtual-student-daily/2026-06-17/run-summary.json
 */
import { copyFileSync, existsSync, readFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveStateDir } from "../lib/config.mjs";
import {
  applyDailyResults,
  loadState,
  saveStateAtomically,
  appendTimelineRow,
} from "../lib/longitudinal-state.mjs";

function parseArgs(argv) {
  const out = { date: null, runSummary: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") out.date = argv[++i];
    else if (a === "--run-summary") out.runSummary = argv[++i];
  }
  if (!out.date || !out.runSummary) {
    throw new Error(
      "usage: repair-state-from-run-summary.mjs --date YYYY-MM-DD --run-summary PATH"
    );
  }
  return out;
}

function mapSummaryStudentToRecord(student) {
  const sessions = Array.isArray(student.sessions) ? student.sessions : [];
  return {
    label: student.label,
    grade: student.grade,
    personaKind: student.personaKind,
    status: student.status,
    intendedMinutes: student.intendedMinutes,
    sessionResults: sessions.map((s) => ({
      subject: s.subject,
      profile: s.profile,
      topic: s.topic,
      intendedQuestionCount: s.intendedQuestionCount,
      answeredCount: s.answeredCount,
      completed: !!s.completed,
      earlyExitReason: s.earlyExitReason || null,
      error: s.error || null,
      tally: {
        intendedCorrect: s.correctIntended,
        observedCorrect: s.correctObserved,
      },
    })),
  };
}

const args = parseArgs(process.argv);
const summary = JSON.parse(readFileSync(args.runSummary, "utf8"));
if (summary.status !== "pass" && summary.suite?.summary?.verdict !== "pass") {
  throw new Error(
    `run-summary status is not pass (status=${summary.status}); refusing repair`
  );
}

const studentsArr = summary.suite?.students;
if (!Array.isArray(studentsArr)) {
  throw new Error("run-summary missing suite.students array");
}

const records = studentsArr
  .filter((s) => s.status === "pass")
  .map(mapSummaryStudentToRecord);
if (records.length === 0) {
  throw new Error("no pass student records found in run-summary");
}

const mode = summary.resolved?.mode || summary.args?.mode || "fast";
const stateDir = resolveStateDir();
const statePath = join(stateDir, "state.json");
if (!existsSync(statePath)) {
  throw new Error(`state.json not found at ${statePath}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const preRepairBackup = join(stateDir, `state.json.bak.pre-repair-${stamp}`);
copyFileSync(statePath, preRepairBackup);

for (const entry of readdirSync(stateDir)) {
  if (entry.startsWith("state.json.tmp")) {
    try {
      unlinkSync(join(stateDir, entry));
    } catch {
      // best-effort cleanup of stale tmp from failed advance
    }
  }
}

const { state } = loadState({ stateDir });
const beforeDate = state.lastRunDate;
const applied = applyDailyResults({
  state,
  date: args.date,
  mode,
  verdict: "pass",
  studentRecords: records,
});
const writeInfo = saveStateAtomically({ stateDir, state });

for (const row of applied.studentTimelineRows) {
  try {
    appendTimelineRow({ stateDir, row });
  } catch (error) {
    console.warn(
      `timeline append skipped for ${row.student}: ${error?.message || error}`
    );
  }
}

console.log(
  JSON.stringify(
    {
      repaired: true,
      date: args.date,
      mode,
      passStudents: records.map((r) => r.label),
      rowsAppended: applied.studentTimelineRows.length,
      beforeLastRunDate: beforeDate,
      lastRunDate: state.lastRunDate,
      lastRunStatus: state.lastRunStatus,
      preRepairBackup,
      stateFile: writeInfo.filePath,
      rotatedBackup: writeInfo.bakPath,
    },
    null,
    2
  )
);

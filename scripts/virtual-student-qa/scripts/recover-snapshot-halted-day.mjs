/**
 * Recover a halted simulation day when learning/DB work completed but
 * state-advance was blocked (typically after-snapshot timeout only).
 *
 * Does NOT re-run the day, clean DB rows, or use --force.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/recover-snapshot-halted-day.mjs \
 *     --date 2026-05-11 \
 *     --run-summary reports/virtual-student-daily/2026-05-11/run-summary.json
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveStateDir } from "../lib/config.mjs";
import { assertSimDateRecoverySanity } from "../lib/daily-db-sanity-guard.mjs";
import {
  applyDailyResults,
  loadState,
  saveStateAtomically,
  appendTimelineRow,
} from "../lib/longitudinal-state.mjs";

function parseArgs(argv) {
  const out = { date: null, runSummary: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") out.date = argv[++i];
    else if (a === "--run-summary") out.runSummary = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  if (!out.date || !out.runSummary) {
    throw new Error(
      "usage: recover-snapshot-halted-day.mjs --date YYYY-MM-DD --run-summary PATH [--dry-run]"
    );
  }
  out.runSummary = resolve(out.runSummary);
  return out;
}

function previousDayIso(isoDate) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function mapSummaryStudentToRecord(student) {
  const sessions = Array.isArray(student.sessions) ? student.sessions : [];
  const recordStatus =
    student.stepFailed === "after-snapshot" ? "partial" : student.status;
  return {
    label: student.label,
    grade: student.grade,
    personaKind: student.personaKind,
    status: recordStatus,
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

function studentEligibleForRecovery(student) {
  const sessions = student.sessions || [];
  if (sessions.length === 0) return false;
  if (sessions.some((s) => !s.completed)) return false;
  if (student.status === "fail" && student.stepFailed !== "after-snapshot") {
    return false;
  }
  if (student.tier1?.passed === false) return false;
  return true;
}

function logLine(msg) {
  console.log(msg);
}

const args = parseArgs(process.argv);
if (!existsSync(args.runSummary)) {
  throw new Error(`run-summary not found: ${args.runSummary}`);
}

const summary = JSON.parse(readFileSync(args.runSummary, "utf8"));
if (summary.resolved?.date && summary.resolved.date !== args.date) {
  throw new Error(
    `run-summary date ${summary.resolved.date} != --date ${args.date}`
  );
}

const expectedPrev = previousDayIso(args.date);
const stateDir = resolveStateDir();
const statePath = join(stateDir, "state.json");
if (!existsSync(statePath)) {
  throw new Error(`state.json not found at ${statePath}`);
}

const { state } = loadState({ stateDir });
if (state.lastRunDate !== expectedPrev) {
  throw new Error(
    `state.lastRunDate=${state.lastRunDate} expected ${expectedPrev} before recovering ${args.date}`
  );
}

const studentsArr = summary.suite?.students;
if (!Array.isArray(studentsArr)) {
  throw new Error("run-summary missing suite.students array");
}

const hardFails = studentsArr.filter(
  (s) => s.status === "fail" && s.stepFailed !== "after-snapshot"
);
if (hardFails.length) {
  throw new Error(
    `refusing recovery: non-snapshot failures: ${hardFails.map((s) => s.label).join(", ")}`
  );
}

const snapshotFails = studentsArr.filter(
  (s) => s.status === "fail" && s.stepFailed === "after-snapshot"
);
for (const s of snapshotFails) {
  if (!studentEligibleForRecovery(s)) {
    throw new Error(
      `refusing recovery: ${s.label} failed after-snapshot but core session gates incomplete`
    );
  }
}

const records = studentsArr
  .filter(studentEligibleForRecovery)
  .map(mapSummaryStudentToRecord);
const expectedSessionCount = summary.plan?.summary?.totalSessions ?? null;

logLine(`recover: date=${args.date} expectedPrev=${expectedPrev} records=${records.length}`);

const sanity = await assertSimDateRecoverySanity({
  simDate: args.date,
  runSummary: summary,
  expectedSessionCount,
  log: logLine,
});
if (!sanity.passed) {
  throw new Error(
    `recovery-sanity FAIL (${sanity.errors.length} issue(s)): ${sanity.errors.slice(0, 5).join("; ")}`
  );
}

if (args.dryRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        date: args.date,
        wouldAdvanceFrom: state.lastRunDate,
        wouldAdvanceTo: args.date,
        students: records.map((r) => r.label),
        sanity: sanity.metrics,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const preRepairBackup = join(stateDir, `state.json.bak.pre-recover-${stamp}`);
copyFileSync(statePath, preRepairBackup);
for (const entry of readdirSync(stateDir)) {
  if (entry.startsWith("state.json.tmp")) {
    try {
      unlinkSync(join(stateDir, entry));
    } catch {
      // best-effort
    }
  }
}

const mode = summary.resolved?.mode || summary.args?.mode || "realtime";
const beforeDate = state.lastRunDate;
const applied = applyDailyResults({
  state,
  date: args.date,
  mode,
  verdict: snapshotFails.length ? "partial" : "pass",
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
      recovered: true,
      date: args.date,
      mode,
      verdict: snapshotFails.length ? "partial" : "pass",
      snapshotWarnings: snapshotFails.map((s) => s.label),
      students: records.map((r) => r.label),
      rowsAppended: applied.studentTimelineRows.length,
      beforeLastRunDate: beforeDate,
      lastRunDate: state.lastRunDate,
      lastRunStatus: state.lastRunStatus,
      preRecoverBackup: preRepairBackup,
      stateFile: writeInfo.filePath,
      rotatedBackup: writeInfo.bakPath,
      sanity: sanity.metrics,
    },
    null,
    2
  )
);

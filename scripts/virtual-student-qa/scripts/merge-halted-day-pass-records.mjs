/**
 * Merge passed student records from a halted full-day run into state after
 * a targeted single-student rerun completes the failed case.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/merge-halted-day-pass-records.mjs \
 *     --date 2026-05-13 \
 *     --halted-summary "%LOCALAPPDATA%\\liosh-qa\\run-summary_2026-05-13_halted-full.json" \
 *     --students AAA3,AAA4,AAA5,AAA9,AAA11,AAA12
 */
import { readFileSync } from "node:fs";
import { resolveStateDir } from "../lib/config.mjs";
import {
  applyDailyResults,
  loadState,
  saveStateAtomically,
  appendTimelineRow,
} from "../lib/longitudinal-state.mjs";

function parseArgs(argv) {
  const out = {
    date: null,
    haltedSummary: null,
    students: [],
    mode: "fast",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") out.date = argv[++i];
    else if (a === "--halted-summary") out.haltedSummary = argv[++i];
    else if (a === "--students") {
      out.students = String(argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--mode") out.mode = argv[++i];
  }
  if (!out.date || !out.haltedSummary || out.students.length === 0) {
    throw new Error(
      "usage: merge-halted-day-pass-records.mjs --date YYYY-MM-DD " +
        "--halted-summary PATH --students AAA3,AAA4,..."
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
const summary = JSON.parse(readFileSync(args.haltedSummary, "utf8"));
const studentsArr = summary.suite?.students;
if (!Array.isArray(studentsArr)) {
  throw new Error("halted summary missing suite.students array");
}
const byLabel = new Map(studentsArr.map((s) => [s.label, s]));

const records = [];
for (const label of args.students) {
  const student = byLabel.get(label);
  if (!student) throw new Error(`student ${label} not found in halted summary`);
  if (student.status !== "pass") {
    throw new Error(`student ${label} status=${student.status}, expected pass`);
  }
  records.push(mapSummaryStudentToRecord(student));
}

const stateDir = resolveStateDir();
const { state } = loadState({ stateDir });
const applied = applyDailyResults({
  state,
  date: args.date,
  mode: args.mode,
  verdict: "pass",
  studentRecords: records,
});
const writeInfo = saveStateAtomically({ stateDir, state });
for (const row of applied.studentTimelineRows) {
  appendTimelineRow({ stateDir, row });
}

console.log(
  JSON.stringify(
    {
      mergedStudents: applied.updatedStudents,
      lastRunDate: state.lastRunDate,
      lastRunStatus: state.lastRunStatus,
      stateFile: writeInfo.path,
    },
    null,
    2
  )
);

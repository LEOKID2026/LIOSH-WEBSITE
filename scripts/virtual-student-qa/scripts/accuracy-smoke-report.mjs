#!/usr/bin/env node
/**
 * Print per-student/subject accuracy table from a Phase D2 run-summary.json.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/accuracy-smoke-report.mjs \
 *     --summary reports/virtual-student-daily/2026-05-01/run-summary.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const out = { summary: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--summary" && argv[i + 1]) {
      out.summary = argv[++i];
    }
  }
  return out;
}

function pct(correct, total) {
  if (!total) return "n/a";
  return `${Math.round((correct / total) * 100)}%`;
}

function verdict(profile, accuracyPct, total) {
  if (!total) return "SKIP";
  const ranges = {
    strong: [85, 95],
    average: [65, 85],
    weak: [45, 70],
    targeted: [25, 90],
  };
  const [lo, hi] = ranges[profile] || ranges.average;
  if (accuracyPct == null) return "NO-DATA";
  if (accuracyPct === 100 && profile !== "strong" && total >= 8) return "WARN-100%";
  if (accuracyPct < lo - 15 || accuracyPct > hi + 10) return "OUT-OF-RANGE";
  return "OK";
}

const args = parseArgs(process.argv);
if (!args.summary) {
  console.error("accuracy-smoke-report: --summary path required");
  process.exit(2);
}

const summary = JSON.parse(readFileSync(resolve(args.summary), "utf8"));
const students = summary.students || summary.suite?.students || [];

console.log(
  "Student | Subject | Questions | Correct | Accuracy | Expected Profile | Verdict"
);
console.log("-".repeat(88));

let all100 = true;
let hasWrong = false;
const studentAccuracies = new Set();

for (const student of students) {
  if (student.status !== "pass" && student.status !== "partial") continue;
  for (const session of student.sessions || []) {
    if (!session.completed) continue;
    const total = Number(session.answeredCount ?? session.tally?.total ?? 0);
    const correct = Number(
      session.correctObserved ??
        session.tally?.observedCorrect ??
        session.correctIntended ??
        session.tally?.intendedCorrect ??
        0
    );
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
    const profile = session.profile || student.defaultProfile || "average";
    if (accuracy != null && accuracy < 100) all100 = false;
    if (total > correct) hasWrong = true;
    if (accuracy != null) studentAccuracies.add(`${student.label}:${accuracy}`);
    console.log(
      `${student.label} | ${session.subject} | ${total} | ${correct} | ${pct(correct, total)} | ${profile} | ${verdict(profile, accuracy, total)}`
    );
  }
}

console.log("");
console.log(`studentsWithVariedAccuracy: ${studentAccuracies.size}`);
console.log(`allSubjects100: ${all100 ? "YES (FAIL)" : "NO (OK)"}`);
console.log(`hasRealMistakes: ${hasWrong ? "YES (OK)" : "NO (FAIL)"}`);

process.exit(all100 || !hasWrong ? 1 : 0);

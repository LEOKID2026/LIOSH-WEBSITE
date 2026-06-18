#!/usr/bin/env node
/**
 * Plan-only dry-run for one date — no DB, no UI.
 * Usage: node scripts/virtual-student-qa/tools/planner-day-dry-run.mjs --date 2026-05-08
 */
import { readFileSync } from "node:fs";
import { generateDailyPlan } from "../lib/daily-plan-generator.mjs";
import {
  resolveMaxStudentPlannedMinutesPerDay,
  resolveMaxSessionsPerStudentPerDay,
  resolveMaxParallelDayEstimateMinutes,
  computeParallelDayEstimateMinutes,
} from "../lib/planner-budget.mjs";
import { PERSONAS } from "../scenarios/student-personas.mjs";
import { resolveStateDir } from "../lib/config.mjs";

function parseArgs(argv) {
  let date = "2026-05-08";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--date") date = argv[++i];
  }
  return { date };
}

const { date } = parseArgs(process.argv);
const statePath = `${resolveStateDir()}/state.json`;
const state = JSON.parse(readFileSync(statePath, "utf8"));

process.env.VIRTUAL_STUDENT_MAX_PLANNED_MINUTES_PER_DAY =
  process.env.VIRTUAL_STUDENT_MAX_PLANNED_MINUTES_PER_DAY || "35";
process.env.VIRTUAL_STUDENT_MAX_SESSIONS_PER_STUDENT_PER_DAY =
  process.env.VIRTUAL_STUDENT_MAX_SESSIONS_PER_STUDENT_PER_DAY || "2";
process.env.VIRTUAL_STUDENT_MAX_PARALLEL_DAY_ESTIMATE_MIN =
  process.env.VIRTUAL_STUDENT_MAX_PARALLEL_DAY_ESTIMATE_MIN || "45";

const plan = generateDailyPlan({ state, date, mode: "realtime", personas: PERSONAS });
const est = computeParallelDayEstimateMinutes(plan, { mode: "realtime" });
const aaa11 = plan.students.AAA11 || {};

const maxSessionsCap = resolveMaxSessionsPerStudentPerDay();
const maxMinutesCap = resolveMaxStudentPlannedMinutesPerDay();
const maxParallelCap = resolveMaxParallelDayEstimateMinutes();

const pass =
  plan.summary.maxSessionsPerStudent <= maxSessionsCap &&
  plan.summary.maxStudentPlannedMinutes <= maxMinutesCap &&
  est.parallelDayEstimateMinutes <= maxParallelCap;

console.log("=== PLANNER DAY DRY-RUN ===");
console.log(`date=${date}`);
console.log(`students studied=${plan.summary.studied}`);
console.log(`sessions total=${plan.summary.totalSessions}`);
console.log(`max sessions per student=${plan.summary.maxSessionsPerStudent}`);
console.log(`maxStudentPlannedMinutes=${plan.summary.maxStudentPlannedMinutes}`);
console.log(`parallelDayEstimate=${est.parallelDayEstimateMinutes}`);
console.log(
  `AAA11 sessions=${aaa11.studied ? aaa11.sessions?.length ?? 0 : 0} ` +
    `plannedMinutes=${aaa11.studied ? aaa11.intendedMinutes ?? 0 : 0}`
);
if (aaa11.budgetNote) console.log(`AAA11 note: ${aaa11.budgetNote}`);
console.log(`verdict=${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);

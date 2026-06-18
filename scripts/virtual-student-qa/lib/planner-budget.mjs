/**
 * Daily planner budget — simulation only.
 *
 * Caps per-student planned minutes so parallel wall-clock stays realistic
 * (~30–45 min/day) without shortening in-session seconds/question pacing.
 */

import { makeDailyPacer } from "./realtime-pacer.mjs";

export const DEFAULT_MAX_STUDENT_PLANNED_MINUTES = 35;
export const DEFAULT_MAX_PARALLEL_DAY_ESTIMATE_MIN = 45;
export const DEFAULT_MAX_SESSIONS_PER_STUDENT_PER_DAY = 2;

export function resolveMaxStudentPlannedMinutesPerDay(explicit) {
  if (explicit != null && Number.isFinite(Number(explicit))) {
    return Math.max(5, Math.floor(Number(explicit)));
  }
  const raw = String(
    process.env.VIRTUAL_STUDENT_MAX_PLANNED_MINUTES_PER_DAY ||
      DEFAULT_MAX_STUDENT_PLANNED_MINUTES
  ).trim();
  const num = Number(raw);
  return Number.isFinite(num) && num > 0
    ? Math.floor(num)
    : DEFAULT_MAX_STUDENT_PLANNED_MINUTES;
}

export function resolveMaxSessionsPerStudentPerDay(explicit) {
  if (explicit != null && Number.isFinite(Number(explicit))) {
    return Math.max(1, Math.floor(Number(explicit)));
  }
  const raw = String(
    process.env.VIRTUAL_STUDENT_MAX_SESSIONS_PER_STUDENT_PER_DAY ||
      DEFAULT_MAX_SESSIONS_PER_STUDENT_PER_DAY
  ).trim();
  const num = Number(raw);
  return Number.isFinite(num) && num > 0
    ? Math.floor(num)
    : DEFAULT_MAX_SESSIONS_PER_STUDENT_PER_DAY;
}

export function resolveMaxParallelDayEstimateMinutes(explicit) {
  if (explicit != null && Number.isFinite(Number(explicit))) {
    return Math.max(10, Math.floor(Number(explicit)));
  }
  const raw = String(
    process.env.VIRTUAL_STUDENT_MAX_PARALLEL_DAY_ESTIMATE_MIN ||
      DEFAULT_MAX_PARALLEL_DAY_ESTIMATE_MIN
  ).trim();
  const num = Number(raw);
  return Number.isFinite(num) && num > 0
    ? Math.floor(num)
    : DEFAULT_MAX_PARALLEL_DAY_ESTIMATE_MIN;
}

/**
 * Compute parallel wall-clock estimate (minutes) for a plan.
 */
export function computeParallelDayEstimateMinutes(
  plan,
  { mode = "realtime", pacerScale = 1 } = {}
) {
  let maxStudentPlannedMinutes = 0;
  let maxStudentSessionCount = 1;
  for (const entry of Object.values(plan.students || {})) {
    if (!entry?.studied) continue;
    maxStudentPlannedMinutes = Math.max(
      maxStudentPlannedMinutes,
      Number(entry.intendedMinutes) || 0
    );
    maxStudentSessionCount = Math.max(
      maxStudentSessionCount,
      entry.sessions?.length || 0
    );
  }
  const pacer = makeDailyPacer({ mode, scale: pacerScale, inSessionPacingEnabled: true });
  const ms = pacer.estimateParallelDayBudgetMs({
    maxStudentPlannedMinutes,
    maxStudentSessionCount,
    inSessionPacingEnabled: true,
  });
  return {
    parallelDayEstimateMinutes: Math.round(ms / 60_000),
    maxStudentPlannedMinutes,
    maxStudentSessionCount,
  };
}

/**
 * Fail before UI if the daily plan exceeds owner parallel-day budget.
 */
export function assertPlannerBudgetGuard({
  plan,
  mode = "realtime",
  pacerScale = 1,
  dryRun = false,
  preflightOnly = false,
  log,
}) {
  if (dryRun || preflightOnly) return;

  const maxAllowedStudent = resolveMaxStudentPlannedMinutesPerDay();
  const maxAllowedParallel = resolveMaxParallelDayEstimateMinutes();
  const maxAllowedSessions = resolveMaxSessionsPerStudentPerDay();
  const { parallelDayEstimateMinutes, maxStudentPlannedMinutes, maxStudentSessionCount } =
    computeParallelDayEstimateMinutes(plan, { mode, pacerScale });

  const outliers = [];
  for (const [label, entry] of Object.entries(plan.students || {})) {
    if (!entry?.studied) continue;
    if ((Number(entry.intendedMinutes) || 0) > maxAllowedStudent) {
      outliers.push(`${label}=${entry.intendedMinutes}min`);
    }
    if ((entry.sessions?.length || 0) > maxAllowedSessions) {
      outliers.push(`${label}=${entry.sessions.length}sessions`);
    }
    if (entry.budgetNote) {
      log?.(entry.budgetNote);
    }
  }

  if (maxStudentSessionCount > maxAllowedSessions) {
    throw new Error(
      `planner-budget guard FAIL: max sessions per student=${maxStudentSessionCount} ` +
        `> ${maxAllowedSessions}. Outliers: ${outliers.join(", ") || "(none)"}.`
    );
  }

  if (maxStudentPlannedMinutes > maxAllowedStudent) {
    throw new Error(
      `planner-budget guard FAIL: maxStudentPlannedMinutes=${maxStudentPlannedMinutes} ` +
        `> ${maxAllowedStudent}. Outliers: ${outliers.join(", ") || "(none)"}. ` +
        `Refusing range/day run until planner budget is fixed.`
    );
  }

  if (parallelDayEstimateMinutes > maxAllowedParallel) {
    throw new Error(
      `planner-budget guard FAIL: parallelDayEstimate=${parallelDayEstimateMinutes}min ` +
        `> ${maxAllowedParallel}min (max student=${maxStudentPlannedMinutes}min). ` +
        `Refusing range/day run until planner budget is fixed.`
    );
  }

  log?.(
    `planner-budget guard OK: maxStudentPlannedMinutes=${maxStudentPlannedMinutes} ` +
      `maxSessionsPerStudent=${maxStudentSessionCount} ` +
      `parallelDayEstimate=${parallelDayEstimateMinutes}min`
  );
}

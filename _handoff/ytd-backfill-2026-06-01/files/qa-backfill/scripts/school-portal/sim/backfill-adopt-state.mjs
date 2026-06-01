/**
 * Adopt-state gating for backfill — only merge sim-state when backfill fully passes.
 */
import { calendarDateToSchoolDay } from "./backfill-date-engine.mjs";

export function shouldAdoptSimStateAfterBackfill({ adoptState, dryRun, blockers }) {
  if (!adoptState || dryRun) return false;
  return blockers.length === 0;
}

export function buildAdoptStatePatch({
  completedDates,
  toIso,
  improvingDayBoost,
  startDate,
}) {
  const lastCompleted = completedDates.at(-1) || toIso;
  return {
    currentSchoolDay: calendarDateToSchoolDay(lastCompleted, startDate),
    improvingDayBoost,
    lastSimCalendarDate: lastCompleted,
    lastRunAt: new Date().toISOString(),
  };
}

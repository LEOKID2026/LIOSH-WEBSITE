/**
 * Backfill checkpoint scheduler — UI + report validation triggers.
 */
import {
  buildHomePracticeSampleMarkdown,
  weekFolderName,
  writeJson,
  writeText,
} from "./backfill-artifacts.mjs";
import { isoDateString, monthKey, weekStartSunday } from "./backfill-date-engine.mjs";
import { runReportValidation } from "./report-validator.mjs";
import { runUiSample } from "./ui-sampler.mjs";
import {
  resolveScaffoldingParentPassword,
  resolveStaffPassword,
} from "./student-credentials.mjs";

export function parseCheckpointList(value, allowed) {
  if (!value || value === "none") return [];
  const parts = String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (!allowed.includes(p)) throw new Error(`Invalid checkpoint mode: ${p}`);
  }
  return parts;
}

export function buildHistoricalRanges({ fromIso, toIso, currentDateIso }) {
  const weekStart = weekStartSunday(currentDateIso);
  const weekEnd = currentDateIso;
  const monthStart = `${monthKey(currentDateIso)}-01`;
  const monthEnd = currentDateIso;
  const fullRange = { name: "full_range", from: fromIso, to: currentDateIso };
  const customSpot = { name: "custom_spot", from: fromIso, to: currentDateIso };
  const ranges = [
    { name: "current_week", from: weekStart, to: weekEnd },
    { name: "current_month", from: monthStart, to: monthEnd },
    fullRange,
  ];
  // custom_spot currently uses fromIso→currentDateIso (same as full_range). Skip duplicate
  // range to avoid a second full R1 pass that exhausts the parent session token.
  if (customSpot.from !== fullRange.from || customSpot.to !== fullRange.to) {
    ranges.push(customSpot);
  }
  return ranges;
}

export function shouldRunUiCheckpoint(modes, { isLastDayOfWeek, isLastDayOfMonth, isFinalDay, isDaily }) {
  if (!modes.length) return false;
  if (modes.includes("daily") && isDaily) return true;
  if (modes.includes("weekly") && isLastDayOfWeek) return true;
  if (modes.includes("monthly") && isLastDayOfMonth) return true;
  if (modes.includes("final") && isFinalDay) return true;
  return false;
}

export function shouldRunReportCheckpoint(modes, ctx) {
  return shouldRunUiCheckpoint(modes, ctx);
}

function checkpointLabel(ctx) {
  if (ctx.isFinalDay) return "final";
  if (ctx.isLastDayOfMonth) return `month-${monthKey(ctx.currentDateIso)}`;
  if (ctx.isLastDayOfWeek) return weekFolderName(ctx.currentDateIso);
  return `day-${ctx.currentDateIso}`;
}

export async function runBackfillCheckpoint({
  kind,
  state,
  artifactRoot,
  baseUrl,
  fromIso,
  toIso,
  currentDateIso,
  classSummary = {},
  homePracticeSample = null,
  uiSampleResults = [],
  log = console.log,
}) {
  const teacherPassword = resolveStaffPassword();
  const parentPassword = resolveScaffoldingParentPassword();
  const historicalRanges = buildHistoricalRanges({ fromIso, toIso, currentDateIso });
  const label = checkpointLabel({ currentDateIso, isFinalDay: kind === "final", isLastDayOfMonth: kind.startsWith("month"), isLastDayOfWeek: kind.startsWith("week") });

  let folder;
  if (kind === "final") folder = "final";
  else if (kind.startsWith("month")) folder = `months/${kind.replace("month-", "")}`;
  else if (kind.startsWith("week")) folder = `weeks/${kind}`;
  else folder = `weeks/${weekFolderName(currentDateIso)}`;

  const reportResult = await runReportValidation({
    state,
    uiSampleResults,
    classSummary,
    baseUrl,
    teacherPassword,
    parentPassword,
    artifactRoot: `${artifactRoot}/${folder}`,
    dateMode: "historical",
    historicalRanges,
    homePracticeSample,
    log,
  });

  writeJson(artifactRoot, `${folder}/report-checkpoint.json`, {
    kind,
    label,
    currentDateIso,
    historicalRanges,
    reportResult,
  });
  writeText(
    artifactRoot,
    `${folder}/report-checkpoint.md`,
    `# Report checkpoint — ${label}\n\nStatus: ${reportResult.status}\nHistorical checks: ${reportResult.historicalReportChecks?.failCount ?? 0} fail\nR1 by range:\n${(reportResult.historicalReportChecks?.r1ByRange || [])
      .map(
        (r) =>
          `- ${r.range} (${r.from} → ${r.to}): ${r.status} checked=${r.studentsChecked?.length ?? 0} skipped=${r.studentsSkippedNoSessions?.length ?? 0} pass=${r.r1PassCount} fail=${r.r1FailCount}`
      )
      .join("\n")}\n`
  );

  return {
    kind,
    folder,
    reportResult,
    passed: reportResult.status !== "fail",
  };
}

export async function runUiCheckpointIfNeeded({
  modes,
  ctx,
  state,
  artifactRoot,
  baseUrl,
  log,
}) {
  if (!shouldRunUiCheckpoint(modes, ctx)) return { ran: false, uiResult: null };

  const folder =
    ctx.isFinalDay ? "final" : ctx.isLastDayOfMonth
      ? `months/${monthKey(ctx.currentDateIso)}`
      : `weeks/${weekFolderName(ctx.currentDateIso)}`;

  log(`backfill: UI checkpoint → ${folder}`);
  const uiResult = await runUiSample(state, {
    baseUrl,
    artifactRoot: `${artifactRoot}/${folder}`,
    log,
  });
  writeJson(artifactRoot, `${folder}/ui-checkpoint.json`, uiResult);
  writeText(
    artifactRoot,
    `${folder}/ui-checkpoint.md`,
    `# UI checkpoint\n\nPass: ${uiResult.pass}/${uiResult.total}\n`
  );
  return { ran: true, uiResult, folder };
}

export function writeHomePracticeArtifacts(artifactRoot, manifest, scope) {
  const full = { scope, ...manifest };
  writeJson(artifactRoot, "home-practice/home-practice-sample.json", full);
  writeText(artifactRoot, "home-practice/home-practice-sample.md", buildHomePracticeSampleMarkdown(full));
}

export function analyzeDayContext(schoolDates, currentIndex) {
  const current = schoolDates[currentIndex];
  const currentDateIso = isoDateString(current);
  const next = schoolDates[currentIndex + 1];
  const isFinalDay = currentIndex === schoolDates.length - 1;
  const weekStart = weekStartSunday(current);
  const isLastDayOfWeek =
    isFinalDay || !next || weekStartSunday(next) !== weekStart;
  const month = monthKey(current);
  const isLastDayOfMonth = isFinalDay || !next || monthKey(next) !== month;
  return {
    currentDateIso,
    weekdayIndex: current.getUTCDay(),
    isFinalDay,
    isLastDayOfWeek,
    isLastDayOfMonth,
    isDaily: true,
  };
}

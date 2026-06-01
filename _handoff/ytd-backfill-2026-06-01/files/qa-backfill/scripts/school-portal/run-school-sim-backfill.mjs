#!/usr/bin/env node
/**
 * Full-school backfill simulation over a date range.
 *
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-backfill.mjs --from 2026-04-28 --to 2026-05-04
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-backfill.mjs --dry-run --from 2026-04-28 --days 7
 */
import readline from "node:readline";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServiceRole } from "./demo-school-lib.mjs";
import {
  analyzeDayContext,
  parseCheckpointList,
  runBackfillCheckpoint,
  runUiCheckpointIfNeeded,
  writeHomePracticeArtifacts,
} from "./sim/backfill-checkpoint.mjs";
import {
  backfillArtifactRoot,
  buildBackfillSummaryMarkdown,
  weekFolderName,
  writeJson,
  writeText,
} from "./sim/backfill-artifacts.mjs";
import {
  calendarDateToSchoolDay,
  expandDateRange,
  isoDateString,
  resolveToDate,
} from "./sim/backfill-date-engine.mjs";
import {
  buildAdoptStatePatch,
  shouldAdoptSimStateAfterBackfill,
} from "./sim/backfill-adopt-state.mjs";
import {
  acquireBackfillLock,
  loadBackfillState,
  mergeBackfillState,
  releaseBackfillLock,
  saveBackfillState,
} from "./sim/backfill-state.mjs";
import {
  countExistingActivitiesForDay,
  deleteActivitiesForDay,
  runDbSimulation,
} from "./sim/db-simulator.mjs";
import {
  enrichHomePracticeManifest,
  runHomePracticeSimulation,
} from "./sim/home-practice-simulator.mjs";
import { ensurePersonaMaps, loadSchoolSimState } from "./sim/longitudinal-state.mjs";
import { mergeImprovingBoost } from "./sim/persona-model.mjs";
import { runPreflight } from "./sim/preflight.mjs";
import { defaultBaseUrl, START_DATE } from "./sim/school-sim-config.mjs";
import { assertSchoolSimStateReady } from "./sim/sim-state-guards.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_DAYS_DEFAULT = 30;
const MAX_DAYS_LARGE = 365;

function parseArgs(argv) {
  const args = {
    from: null,
    to: null,
    days: null,
    resetFirst: false,
    dryRun: false,
    force: false,
    skipWeekends: true,
    uiCheckpoints: "weekly",
    reportCheckpoints: "weekly,monthly,final",
    stopOnFail: true,
    maxDays: MAX_DAYS_DEFAULT,
    allowLargeRange: false,
    baseUrl: null,
    adoptState: false,
    homePracticeScope: "sample",
    noConfirm: false,
    skipDbSim: false,
    preflightOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") args.from = argv[++i];
    else if (a?.startsWith("--from=")) args.from = a.slice("--from=".length);
    else if (a === "--to") args.to = argv[++i];
    else if (a?.startsWith("--to=")) args.to = a.slice("--to=".length);
    else if (a === "--days") args.days = Number(argv[++i]);
    else if (a?.startsWith("--days=")) args.days = Number(a.slice("--days=".length));
    else if (a === "--reset-first") args.resetFirst = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--skip-weekends=false") args.skipWeekends = false;
    else if (a === "--skip-weekends") args.skipWeekends = true;
    else if (a === "--ui-checkpoints") args.uiCheckpoints = argv[++i];
    else if (a?.startsWith("--ui-checkpoints=")) args.uiCheckpoints = a.slice("--ui-checkpoints=".length);
    else if (a === "--report-checkpoints") args.reportCheckpoints = argv[++i];
    else if (a?.startsWith("--report-checkpoints=")) args.reportCheckpoints = a.slice("--report-checkpoints=".length);
    else if (a === "--stop-on-fail") args.stopOnFail = true;
    else if (a === "--no-stop-on-fail") args.stopOnFail = false;
    else if (a === "--max-days") args.maxDays = Number(argv[++i]);
    else if (a?.startsWith("--max-days=")) args.maxDays = Number(a.slice("--max-days=".length));
    else if (a === "--allow-large-range") args.allowLargeRange = true;
    else if (a === "--base-url") args.baseUrl = argv[++i];
    else if (a?.startsWith("--base-url=")) args.baseUrl = a.slice("--base-url=".length);
    else if (a === "--adopt-state") args.adoptState = true;
    else if (a === "--home-practice-scope") args.homePracticeScope = argv[++i];
    else if (a?.startsWith("--home-practice-scope=")) args.homePracticeScope = a.slice("--home-practice-scope=".length);
    else if (a === "--no-confirm") args.noConfirm = true;
    else if (a === "--skip-db-sim") args.skipDbSim = true;
    else if (a === "--preflight-only") args.preflightOnly = true;
  }

  if (!args.from) throw new Error("--from YYYY-MM-DD is required");
  args.to = resolveToDate(args.from, { to: args.to, days: args.days });
  if (args.adoptState && !args.resetFirst) {
    throw new Error("--adopt-state requires --reset-first");
  }
  const allowedScopes = ["none", "sample", "weekly-all", "full"];
  if (!allowedScopes.includes(args.homePracticeScope)) {
    throw new Error(`--home-practice-scope must be one of: ${allowedScopes.join(", ")}`);
  }
  return args;
}

async function confirmForce(message) {
  if (process.env.CI || process.stdin.isTTY === false) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(`${message} Type YES to continue: `, resolve);
  });
  rl.close();
  return String(answer).trim().toUpperCase() === "YES";
}

async function runReset(preResetPath) {
  const resetScript = path.join(__dirname, "reset-demo-school-activities.mjs");
  const child = spawn(
    process.execPath,
    [resetScript, "--mode=activities", "--pre-reset-out", preResetPath],
    { stdio: "inherit", env: process.env, cwd: path.join(__dirname, "..") }
  );
  await new Promise((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`reset exited ${code}`))));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.baseUrl || defaultBaseUrl();
  const log = (line) => console.log(line);

  const fromIso = args.from;
  const toIso = args.to;
  const schoolDates = expandDateRange(fromIso, toIso, { skipWeekends: args.skipWeekends });
  const calendarDaysRequested =
    Math.floor(
      (new Date(`${toIso}T12:00:00Z`) - new Date(`${fromIso}T12:00:00Z`)) / 86400000
    ) + 1;
  const weekendSkipped = calendarDaysRequested - schoolDates.length;

  const cap = args.allowLargeRange ? MAX_DAYS_LARGE : args.maxDays;
  if (!args.dryRun && schoolDates.length > cap) {
    throw new Error(
      `Computed ${schoolDates.length} school days exceeds cap ${cap}. Use --allow-large-range or --max-days.`
    );
  }

  log(`school-sim-backfill: ${fromIso} → ${toIso} (${schoolDates.length} school days) dryRun=${args.dryRun}`);

  const preflight = await runPreflight({
    baseUrl,
    log,
    requireUiCreds: !args.dryRun && args.uiCheckpoints !== "none",
  });
  if (args.preflightOnly) {
    console.log(JSON.stringify({ status: preflight.passed ? "pass" : "fail", preflight }, null, 2));
    process.exit(preflight.passed ? 0 : 1);
  }

  if (args.force && !args.noConfirm && !args.dryRun) {
    const ok = await confirmForce("--force will overwrite existing simulated days.");
    if (!ok) throw new Error("Aborted: --force not confirmed");
  }

  acquireBackfillLock(fromIso, toIso);
  const artifactRoot = backfillArtifactRoot(fromIso, toIso);

  try {
  let backfillState = loadBackfillState(fromIso, toIso);
  let baseState = ensurePersonaMaps(loadSchoolSimState());
  assertSchoolSimStateReady(baseState, { phase: "backfill startup" });

  const serviceRole = createServiceRole();
  const uiModes = parseCheckpointList(args.uiCheckpoints, ["none", "daily", "weekly", "monthly", "final"]);
  const reportModes = parseCheckpointList(args.reportCheckpoints, ["weekly", "monthly", "final"]);

  if (args.resetFirst && !args.dryRun) {
    log("backfill: --reset-first → clearing demo activity data...");
    await runReset(path.join(artifactRoot, "pre-reset-counts.json"));
    backfillState = defaultBackfillStateAfterReset(fromIso, toIso);
    saveBackfillState(fromIso, toIso, backfillState);
    baseState = ensurePersonaMaps(loadSchoolSimState());
  }

  const blockers = [];
  const warnings = [];
  let uiCheckpointsRan = 0;
  let uiCheckpointsPassed = 0;
  let reportCheckpointsRan = 0;
  let reportCheckpointsPassed = 0;
  let lastUiResults = [];
  let lastClassSummary = {};
  const homePracticeManifest = { ...(backfillState.homePracticeByStudent || {}) };

    for (let i = 0; i < schoolDates.length; i++) {
      const simulatedDate = isoDateString(schoolDates[i]);
      const ctx = analyzeDayContext(schoolDates, i);
      const targetDay = calendarDateToSchoolDay(simulatedDate, START_DATE);

      if (backfillState.completedDates.includes(simulatedDate) && !args.force) {
        log(`backfill: skip ${simulatedDate} (already completed)`);
        backfillState.daysSkipped += 1;
        backfillState.skipReasons.alreadyExists += 1;
        continue;
      }

      if (!args.dryRun && !args.force) {
        const existing = await countExistingActivitiesForDay(serviceRole, baseState.schoolId, simulatedDate);
        if (existing > 0) {
          log(`backfill: skip ${simulatedDate} (${existing} activities exist)`);
          backfillState.daysSkipped += 1;
          backfillState.skipReasons.alreadyExists += 1;
          if (!backfillState.completedDates.includes(simulatedDate)) {
            backfillState.completedDates.push(simulatedDate);
          }
          continue;
        }
      }

      if (args.force && !args.dryRun) {
        await deleteActivitiesForDay(serviceRole, baseState.schoolId, simulatedDate);
      }

      const simState = {
        ...baseState,
        currentSchoolDay: targetDay - 1,
        improvingDayBoost: backfillState.improvingDayBoost || baseState.improvingDayBoost || {},
      };

      let dbResult = { activitiesCreated: 0, statusRowsCreated: 0, attemptRowsCreated: 0, classSummary: {}, plan: {} };
      if (!args.skipDbSim) {
        dbResult = await runDbSimulation(serviceRole, simState, {
          dryRun: args.dryRun,
          force: args.force,
          simulatedDate,
          targetDay,
          skipStateMerge: !args.adoptState,
          log,
        });
        if (dbResult.skipped) {
          warnings.push(`${simulatedDate}: weekend/planner skip`);
          continue;
        }
      }

      let hpResult = { sessionsCreated: 0, answersCreated: 0, daySummary: {} };
      if (args.homePracticeScope !== "none") {
        hpResult = await runHomePracticeSimulation(serviceRole, simState, {
          simulatedDate,
          targetDay,
          weekdayIndex: ctx.weekdayIndex,
          scope: args.homePracticeScope,
          dryRun: args.dryRun,
          force: args.force,
          improvingBoost: simState.improvingDayBoost,
          manifestAccumulator: homePracticeManifest,
          log,
        });
        Object.assign(homePracticeManifest, hpResult.manifestPatch || {});
      }

      if (!args.dryRun) {
        let nextBoost = { ...simState.improvingDayBoost };
        for (const id of Object.keys(simState.studentProfiles || {})) {
          if (simState.studentProfiles[id] === "improving") {
            nextBoost = mergeImprovingBoost(nextBoost, id, 1);
          }
        }
        backfillState.improvingDayBoost = nextBoost;
      }

      backfillState.schoolDaysSimulated += 1;
      backfillState.activitiesCreated += dbResult.activitiesCreated || 0;
      backfillState.statusRowsCreated += dbResult.statusRowsCreated || 0;
      backfillState.attemptRowsCreated += dbResult.attemptRowsCreated || 0;
      backfillState.homePracticeSessionsCreated += hpResult.sessionsCreated || 0;
      backfillState.homePracticeAnswersCreated += hpResult.answersCreated || 0;
      backfillState.completedDates.push(simulatedDate);
      backfillState.homePracticeByStudent = homePracticeManifest;
      saveBackfillState(fromIso, toIso, backfillState);

      writeJson(artifactRoot, `days/${simulatedDate}/db-sim-plan.json`, dbResult.plan || {});
      writeJson(artifactRoot, `days/${simulatedDate}/db-sim-summary.json`, {
        simulatedDate,
        targetDay,
        activitiesCreated: dbResult.activitiesCreated,
        statusRowsCreated: dbResult.statusRowsCreated,
        attemptRowsCreated: dbResult.attemptRowsCreated,
      });
      writeJson(artifactRoot, `days/${simulatedDate}/home-practice-summary.json`, hpResult.daySummary || {});

      lastClassSummary = dbResult.classSummary || lastClassSummary;

      if (uiModes.length && !args.dryRun) {
        const uiRun = await runUiCheckpointIfNeeded({
          modes: uiModes,
          ctx,
          state: baseState,
          artifactRoot,
          baseUrl,
          log,
        });
        if (uiRun.ran) {
          uiCheckpointsRan += 1;
          lastUiResults = uiRun.uiResult?.results || [];
          if ((uiRun.uiResult?.fail || 0) === 0) uiCheckpointsPassed += 1;
          else if (args.stopOnFail) blockers.push(`UI checkpoint failed on ${simulatedDate}`);
        }
      }

      if (reportModes.length && !args.dryRun) {
        const shouldReport =
          (reportModes.includes("weekly") && ctx.isLastDayOfWeek) ||
          (reportModes.includes("monthly") && ctx.isLastDayOfMonth) ||
          (reportModes.includes("final") && ctx.isFinalDay);
        if (shouldReport) {
          const sampleManifest = await enrichHomePracticeManifest(serviceRole, homePracticeManifest, {
            fromIso,
            toIso,
            baseUrl,
          });
          sampleManifest.scope = args.homePracticeScope;
          writeHomePracticeArtifacts(artifactRoot, sampleManifest, args.homePracticeScope);

          let kind = weekFolderName(simulatedDate);
          if (ctx.isFinalDay) kind = "final";
          else if (ctx.isLastDayOfMonth) kind = `month-${simulatedDate.slice(0, 7)}`;

          const cp = await runBackfillCheckpoint({
            kind,
            state: baseState,
            artifactRoot,
            baseUrl,
            fromIso,
            toIso,
            currentDateIso: simulatedDate,
            classSummary: lastClassSummary,
            homePracticeSample: sampleManifest,
            uiSampleResults: lastUiResults,
            log,
          });
          reportCheckpointsRan += 1;
          if (cp.passed) reportCheckpointsPassed += 1;
          else if (args.stopOnFail) blockers.push(`Report checkpoint failed on ${simulatedDate}`);
        }
      }

      if (blockers.length && args.stopOnFail) {
        writeJson(artifactRoot, "failure-repro.json", {
          simulatedDate,
          blockers,
          targetDay,
        });
        break;
      }

      log(
        `backfill: ${simulatedDate} day=${targetDay} activities=${dbResult.activitiesCreated} hpSessions=${hpResult.sessionsCreated}`
      );
    }

    backfillState.skipReasons.weekend = weekendSkipped;
    saveBackfillState(fromIso, toIso, backfillState);

    const sampleManifest = await enrichHomePracticeManifest(serviceRole, homePracticeManifest, {
      fromIso,
      toIso,
      baseUrl,
    });
    sampleManifest.scope = args.homePracticeScope;
    writeHomePracticeArtifacts(artifactRoot, sampleManifest, args.homePracticeScope);

    let overallStatus = "PASS";
    if (args.dryRun) overallStatus = "DRY_RUN";
    else if (blockers.length) overallStatus = "FAIL";
    else if (warnings.length) overallStatus = "WARN";

    if (
      shouldAdoptSimStateAfterBackfill({
        adoptState: args.adoptState,
        dryRun: args.dryRun,
        blockers,
      })
    ) {
      const { mergeSchoolSimState } = await import("./sim/longitudinal-state.mjs");
      mergeSchoolSimState(
        buildAdoptStatePatch({
          completedDates: backfillState.completedDates,
          toIso,
          improvingDayBoost: backfillState.improvingDayBoost,
          startDate: START_DATE,
        })
      );
      log("backfill: adopted state into sim-state.json");
    } else if (args.adoptState && !args.dryRun) {
      log(`backfill: adopt-state skipped — overallStatus=${overallStatus}`);
    }

    const summary = {
      fromDate: fromIso,
      toDate: toIso,
      calendarDaysRequested,
      schoolDaysSimulated: backfillState.schoolDaysSimulated,
      daysSkipped: backfillState.daysSkipped + weekendSkipped,
      skipReasons: backfillState.skipReasons,
      activitiesCreated: backfillState.activitiesCreated,
      statusRowsCreated: backfillState.statusRowsCreated,
      attemptRowsCreated: backfillState.attemptRowsCreated,
      homePracticeScope: args.homePracticeScope,
      homePracticeSessionsCreated: backfillState.homePracticeSessionsCreated,
      homePracticeAnswersCreated: backfillState.homePracticeAnswersCreated,
      homePracticeStudentsCovered: sampleManifest.totalStudents,
      uiCheckpointsRan,
      uiCheckpointsPassed,
      uiCheckpointsFailed: uiCheckpointsRan - uiCheckpointsPassed,
      reportCheckpointsRan,
      reportCheckpointsPassed,
      reportCheckpointsFailed: reportCheckpointsRan - reportCheckpointsPassed,
      resetPerformed: args.resetFirst,
      adoptState: args.adoptState,
      dryRun: args.dryRun,
      overallStatus,
      artifactRoot,
      blockers,
      warnings,
    };

    writeJson(artifactRoot, "backfill-summary.json", summary);
    writeText(artifactRoot, "backfill-summary.md", buildBackfillSummaryMarkdown(summary));

    console.log(JSON.stringify({ overallStatus, artifactRoot, summary }, null, 2));
    process.exit(overallStatus === "FAIL" ? 1 : 0);
  } finally {
    releaseBackfillLock(fromIso, toIso);
  }
}

function defaultBackfillStateAfterReset(fromIso, toIso) {
  return {
    fromDate: fromIso,
    toDate: toIso,
    completedDates: [],
    improvingDayBoost: {},
    homePracticeByStudent: {},
    statusRowsCreated: 0,
    attemptRowsCreated: 0,
    homePracticeSessionsCreated: 0,
    homePracticeAnswersCreated: 0,
    activitiesCreated: 0,
    schoolDaysSimulated: 0,
    daysSkipped: 0,
    skipReasons: { weekend: 0, alreadyExists: 0 },
  };
}

main().catch((e) => {
  console.error("school-sim-backfill: FAIL", e?.stack || e);
  process.exit(1);
});

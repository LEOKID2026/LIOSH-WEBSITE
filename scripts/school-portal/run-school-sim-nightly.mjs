#!/usr/bin/env node
/**
 * Full-school active daily simulation (hybrid).
 *
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --dry-run
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --preflight-only
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --skip-ui-sample
 *   node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --force
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServiceRole, requireEnv } from "./demo-school-lib.mjs";
import {
  buildGateCompatibleRunSummary,
  buildRunSummaryMarkdown,
  dailyArtifactRoot,
  writeJson,
  writeText,
} from "./sim/artifacts.mjs";
import { runDbSimulation } from "./sim/db-simulator.mjs";
import {
  ensurePersonaMaps,
  isDayAlreadyRun,
  loadSchoolSimState,
  mergeSchoolSimState,
  appendTimelineRow,
} from "./sim/longitudinal-state.mjs";
import { runPreflight } from "./sim/preflight.mjs";
import { runReportValidation } from "./sim/report-validator.mjs";
import { runUiSample } from "./sim/ui-sampler.mjs";
import { defaultBaseUrl } from "./sim/school-sim-config.mjs";
import {
  resolveScaffoldingParentPassword,
  resolveStaffPassword,
} from "./sim/student-credentials.mjs";
import { assertSchoolSimStateReady } from "./sim/sim-state-guards.mjs";
import { bootstrapSchoolDbWriteGuard } from "./lib/school-db-write-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    dryRun: true,
    preflightOnly: false,
    skipUiSample: false,
    skipReports: false,
    force: false,
    skipReset: false,
    skipDbSim: false,
    date: new Date().toISOString().slice(0, 10),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--write") args.dryRun = false;
    else if (a === "--preflight-only") args.preflightOnly = true;
    else if (a === "--skip-ui-sample") args.skipUiSample = true;
    else if (a === "--skip-reports") args.skipReports = true;
    else if (a === "--skip-db-sim") args.skipDbSim = true;
    else if (a === "--force") args.force = true;
    else if (a === "--skip-reset") args.skipReset = true;
    else if (a === "--date") args.date = argv[++i];
    else if (a?.startsWith("--date=")) args.date = a.slice("--date=".length);
  }
  return args;
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
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const guard = bootstrapSchoolDbWriteGuard(
    "school-portal/run-school-sim-nightly",
    "RUN_SCHOOL_SIM_NIGHTLY",
    argv
  );
  const baseUrl = defaultBaseUrl();
  const log = (line) => console.log(line);

  log(`school-sim-nightly: date=${args.date} baseUrl=${baseUrl}`);

  const preflight = await runPreflight({
    baseUrl,
    log,
    requireUiCreds:
      args.preflightOnly ||
      (!args.dryRun && !args.skipUiSample && !args.skipReports),
  });
  if (args.preflightOnly) {
    console.log(
      JSON.stringify(
        {
          status: preflight.passed ? "pass" : "fail",
          stage: "preflight-only",
          preflight,
        },
        null,
        2
      )
    );
    process.exit(preflight.passed ? 0 : 1);
  }

  let state = loadSchoolSimState();
  state = ensurePersonaMaps(state);

  const artifactRoot = dailyArtifactRoot(args.date);

  if (isDayAlreadyRun(state, args.date, { force: args.force }) && !args.dryRun) {
    log(`school-sim-nightly: already ran for ${args.date} (use --force)`);
    const summary = {
      date: args.date,
      status: "pass",
      skipped: true,
      reason: "idempotent-skip",
    };
    writeJson(artifactRoot, "run-summary.json", summary);
    writeText(artifactRoot, "run-summary.md", buildRunSummaryMarkdown(summary));
    process.exit(0);
  }

  const needsReset =
    !args.skipReset && !args.dryRun && (state.currentSchoolDay ?? 0) === 0 && !state.lastSimCalendarDate;

  if (needsReset) {
    log("school-sim-nightly: running clean reset (first run)...");
    const preResetPath = path.join(artifactRoot, "db-sim", "pre-reset-counts.json");
    await runReset(preResetPath);
    state = loadSchoolSimState();
    state = ensurePersonaMaps(state);
  }

  let dbResult;
  if (args.skipDbSim && !args.dryRun) {
    const fs = await import("node:fs");
    const planPath = path.join(artifactRoot, "db-sim/plan.json");
    const classPath = path.join(artifactRoot, "db-sim/class-summary.json");
    if (fs.existsSync(planPath)) {
      dbResult = {
        plan: JSON.parse(fs.readFileSync(planPath, "utf8")),
        gradeSummary: fs.existsSync(path.join(artifactRoot, "db-sim/grade-summary.json"))
          ? JSON.parse(fs.readFileSync(path.join(artifactRoot, "db-sim/grade-summary.json"), "utf8"))
          : {},
        classSummary: fs.existsSync(classPath)
          ? JSON.parse(fs.readFileSync(classPath, "utf8"))
          : {},
        activitiesCreated: 108,
        schoolDay: state.currentSchoolDay ?? 0,
        skipped: false,
      };
      log(`school-sim-nightly: skipped DB sim (reusing artifacts from ${args.date})`);
    } else {
      throw new Error("--skip-db-sim requires existing db-sim/plan.json for this date");
    }
  } else {
    dbResult = await runDbSimulation(createServiceRole(), state, {
      dryRun: args.dryRun,
      force: args.force,
      log,
    });
    if (args.dryRun) {
      log(
        `dry-run: plannedActivities=${dbResult.plan?.plannedActivities ?? 0} schoolDay=${dbResult.schoolDay}`
      );
    }
    writeJson(artifactRoot, "db-sim/plan.json", dbResult.plan);
    writeJson(artifactRoot, "db-sim/grade-summary.json", dbResult.gradeSummary);
    writeJson(artifactRoot, "db-sim/class-summary.json", dbResult.classSummary);
    writeJson(artifactRoot, "db-sim/student-exceptions.json", dbResult.studentExceptions || []);
  }

  let uiResult = { pass: 0, fail: 0, partial: 0, total: 0, results: [], manifest: [] };
  if (!args.dryRun && args.skipUiSample) {
    const fs = await import("node:fs");
    const resultsPath = path.join(artifactRoot, "ui-sample", "sample-results.json");
    const manifestPath = path.join(artifactRoot, "ui-sample", "sample-manifest.json");
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
      uiResult = {
        results,
        manifest: fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [],
        pass: results.filter((r) => r.status === "pass").length,
        partial: results.filter((r) => r.status === "partial").length,
        fail: results.filter((r) => r.status === "fail").length,
        total: results.length,
      };
      log(`school-sim-nightly: reusing UI sample artifacts (${uiResult.pass}/${uiResult.total} pass)`);
    }
  }
  if (!args.dryRun && !args.skipUiSample) {
    state = loadSchoolSimState();
    assertSchoolSimStateReady(state, { phase: "Phase 2 UI sample" });
    log(`school-sim-nightly: Phase 2 UI sample (${state.studentIds.length} students in state)...`);
    uiResult = await runUiSample(state, { baseUrl, artifactRoot, log });
    writeJson(artifactRoot, "ui-sample/sample-manifest.json", uiResult.manifest);
    writeJson(artifactRoot, "ui-sample/sample-results.json", uiResult.results);
  }

  let reportResult = { status: "not_run" };
  if (!args.dryRun && !args.skipReports) {
    state = loadSchoolSimState();
    assertSchoolSimStateReady(state, { phase: "Phase 3 report validation" });
    log(`school-sim-nightly: Phase 3 report validation (${state.studentIds.length} students in state)...`);
    const teacherPassword = resolveStaffPassword();
    const parentPassword = resolveScaffoldingParentPassword();
    reportResult = await runReportValidation({
      state,
      uiSampleResults: uiResult.results,
      classSummary: dbResult.classSummary,
      baseUrl,
      teacherPassword,
      parentPassword,
      artifactRoot,
      log,
    });
    writeJson(artifactRoot, "report-validation/teacher-reports.json", reportResult.teacherReports);
    writeJson(artifactRoot, "report-validation/school-reports.json", reportResult.schoolReports);
    writeJson(artifactRoot, "report-validation/r3-bridge-api.json", reportResult.r3BridgeApi);
    writeJson(artifactRoot, "report-validation/r3-bridge-browser.json", reportResult.r3BridgeBrowser);
    writeJson(artifactRoot, "report-validation/parent-route-r1.json", reportResult.parentRouteR1);
    writeJson(artifactRoot, "report-validation/isolation-checks.json", reportResult.isolationChecks);
    writeJson(artifactRoot, "report-validation/no-empty-reports.json", reportResult.noEmptyReports);
  }

  const blockers = [];
  const warnings = [];
  if (dbResult.skipped && !args.dryRun) warnings.push("weekend skip — no activities");
  if (uiResult.fail > 3) blockers.push(`UI sample: ${uiResult.fail} failures (>3)`);
  if (reportResult.status === "fail") blockers.push("report validation failed");
  if (reportResult.r3BridgeBrowser && reportResult.r3BridgeBrowser.failCount > 0) {
    blockers.push(`R3 browser: ${reportResult.r3BridgeBrowser.failCount} failures`);
  }

  let status = "pass";
  if (blockers.length) status = "fail";
  else if (warnings.length || uiResult.partial > 0 || reportResult.status === "partial") status = "partial";

  if (!args.dryRun) {
    mergeSchoolSimState({
      lastSimCalendarDate: args.date,
      lastSimStatus: status,
    });
    appendTimelineRow(`calendar=${args.date} status=${status} activities=${dbResult.activitiesCreated}`);
  }

  const gateSummary = buildGateCompatibleRunSummary({
    calendarDate: args.date,
    status,
    plan: dbResult.plan,
    dbResult,
    uiResult,
    reportResult,
    preflight,
  });
  if (args.dryRun) {
    gateSummary.verdictType = "ARTIFACT_VERIFY";
    gateSummary.guardNote = "dry-run: no DB writes; artifact reflects simulation plan only";
  }

  writeJson(artifactRoot, "run-summary.json", gateSummary);
  writeText(
    artifactRoot,
    "run-summary.md",
    buildRunSummaryMarkdown({
      date: args.date,
      status,
      schoolDay: dbResult.schoolDay,
      activitiesCreated: dbResult.activitiesCreated,
      uiSample: uiResult,
      reportValidation: reportResult,
      blockers,
      warnings,
    })
  );

  const { repoRoot } = await import("./sim/artifacts.mjs");
  const gateCopyRoot = path.join(repoRoot(), "reports", "virtual-student-daily", args.date);
  const fs = await import("node:fs");
  fs.mkdirSync(gateCopyRoot, { recursive: true });
  fs.writeFileSync(
    path.join(gateCopyRoot, "run-summary.json"),
    `${JSON.stringify(gateSummary, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify({ status, date: args.date, artifactRoot }, null, 2));
  guard.setArtifactPath(artifactRoot);
  guard.printEndSummary({
    affectedRows: dbResult.activitiesCreated || 0,
    skippedRows: gateSummary.skipped ? 1 : 0,
    errors: blockers,
    artifactPath: artifactRoot,
  });
  process.exit(status === "fail" ? 1 : 0);
}

main().catch((e) => {
  if (e?.name === "ProductionScriptGuardError") {
    console.error(`[production-guard] BLOCKED: ${e.message}`);
    process.exit(1);
  }
  console.error("school-sim-nightly: FAIL", e?.stack || e);
  process.exit(1);
});

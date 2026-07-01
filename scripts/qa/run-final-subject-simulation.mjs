#!/usr/bin/env node
/**
 * Final subject simulation — all 7 launch subjects incl. history.
 *
 * Starts isolated Next **production** server on PORT 3200–3210 (no HMR).
 * Uses NEXT_DIST_DIR=.next-final-subject-sim (separate from dev .next).
 *
 * Usage:
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs --skip-server --port=3200
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs --force-build
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getRepoRoot } from "../virtual-student-qa/lib/config.mjs";
import {
  buildRunId,
  buildSkippedSubjectResult,
  defaultOutputDir,
  FINAL_SIMULATION_SUBJECT_KEYS,
  FINAL_SIMULATION_SUBJECT_LABELS_HE,
} from "./lib/final-subject-simulation/constants.mjs";
import {
  probeServerHealthWithRetry,
  resolveSimulationPort,
  waitForServerReady,
} from "./lib/final-subject-simulation/port-resolver.mjs";
import { printConsoleSummary, writeSimulationReports, collectFailures } from "./lib/final-subject-simulation/reports.mjs";
import { runSubjectSimulation, smokeParentReport } from "./lib/final-subject-simulation/subject-runner.mjs";
import {
  ensureSimulationBuild,
  runSimulationBuild,
  startSimulationServer,
} from "./lib/final-subject-simulation/simulation-server.mjs";

const REPO_ROOT = getRepoRoot();
const DEV_HOST = "127.0.0.1";
const SUBJECT_COOLDOWN_MS = 1500;

function parseArgs(argv) {
  const out = {
    skipServer: false,
    resolvePortOnly: false,
    forceBuild: false,
    port: null,
    runId: null,
    outputDir: null,
  };
  for (const arg of argv) {
    if (arg === "--skip-server") out.skipServer = true;
    if (arg === "--resolve-port-only") out.resolvePortOnly = true;
    if (arg === "--force-build") out.forceBuild = true;
    if (arg.startsWith("--port=")) out.port = Number(arg.slice("--port=".length));
    if (arg.startsWith("--runId=")) out.runId = arg.slice("--runId=".length).trim();
    if (arg.startsWith("--outputDir=")) out.outputDir = arg.slice("--outputDir=".length).trim();
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Log to stdout only during run — raw-log.txt written once at end (avoids watch churn). */
function makeRunLog() {
  const chunks = [];
  return {
    write(text) {
      const s = String(text);
      chunks.push(s);
      process.stdout.write(s);
    },
    getText: () => chunks.join(""),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { port, autoSelected, busyPorts } = await resolveSimulationPort(args.port ?? undefined);

  if (args.resolvePortOnly) {
    console.log(JSON.stringify({ port, autoSelected, busyPorts }, null, 2));
    process.exit(0);
  }

  const runId = args.runId || buildRunId();
  const outputDir = join(REPO_ROOT, args.outputDir || defaultOutputDir(runId));
  await mkdir(outputDir, { recursive: true });
  const rawLogPath = join(outputDir, "raw-log.txt");
  const log = makeRunLog();

  log.write(`\n=== final-subject-simulation runId=${runId} ===\n`);
  log.write(`Port: ${port}${autoSelected ? " (auto-selected)" : ""}\n`);
  log.write(`Output: ${outputDir}\n`);
  log.write(`Server mode: production (next start, .next-final-subject-sim)\n\n`);

  const baseUrl = `http://${DEV_HOST}:${port}`;
  let serverMeta = null;

  if (!args.skipServer) {
    if (args.forceBuild) {
      await runSimulationBuild(REPO_ROOT, log.write.bind(log));
    } else {
      await ensureSimulationBuild(REPO_ROOT, log.write.bind(log));
    }
    serverMeta = await startSimulationServer({
      repoRoot: REPO_ROOT,
      port,
      logPath: rawLogPath,
      log: log.write.bind(log),
    });
    log.write(`Server pid=${serverMeta.pid}\n`);
  } else {
    log.write(`--skip-server: expecting server already at ${baseUrl}\n`);
  }

  log.write("Waiting for /student/login (production, no HMR) …\n");
  try {
    await waitForServerReady(baseUrl, {
      timeoutMs: 300_000,
      onRetry: (attempt, detail) => {
        if (attempt === 1 || attempt % 5 === 0) {
          log.write(`  … still waiting (${attempt * 2}s): ${detail}\n`);
        }
      },
    });
  } catch (error) {
    log.write(`ERROR: ${error?.message || error}\n`);
    await writeSimulationReports(outputDir, {
      runId,
      generatedAt: new Date().toISOString(),
      baseUrl,
      port,
      autoPort: autoSelected,
      allPass: false,
      subjects: {},
      globalChecks: {},
      failures: [{ step: "server_ready", error: error?.message || String(error), logFile: rawLogPath }],
      rawLog: log.getText(),
    });
    process.exit(2);
  }
  log.write("Server ready.\n\n");

  process.env.PLAYWRIGHT_BASE_URL = baseUrl;
  process.env.VIRTUAL_STUDENT_BASE_URL = baseUrl;
  process.env.PORT = String(port);

  const browser = await chromium.launch({ headless: true });
  const subjects = {};

  for (const subjectKey of FINAL_SIMULATION_SUBJECT_KEYS) {
    if (!(await probeServerHealthWithRetry(baseUrl))) {
      log.write(`\n[ABORT] Server unhealthy before ${subjectKey} — stopping remaining subjects.\n`);
      const startIdx = FINAL_SIMULATION_SUBJECT_KEYS.indexOf(subjectKey);
      for (const remaining of FINAL_SIMULATION_SUBJECT_KEYS.slice(startIdx)) {
        if (!subjects[remaining]) {
          subjects[remaining] = buildSkippedSubjectResult(remaining, "server_unhealthy_abort");
        }
      }
      break;
    }

    const label = FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey;
    log.write(`--- ${label} (${subjectKey}) ---\n`);
    const result = await runSubjectSimulation(browser, {
      baseUrl,
      subjectKey,
      logFile: rawLogPath,
    });
    subjects[subjectKey] = result;
    log.write(`${label}: ${result.pass ? "PASS" : "FAIL"}\n`);
    if (result.advancedAbsent?.options?.length) {
      log.write(`  level options: ${result.advancedAbsent.options.join(", ")}\n`);
    }
    await sleep(SUBJECT_COOLDOWN_MS);
    if (subjectKey === "history") {
      await sleep(4000);
    }
  }

  const parentReport = await (async () => {
    if (!(await probeServerHealthWithRetry(baseUrl))) {
      return { pass: false, detail: "server unhealthy — parent report skipped", notRun: true };
    }
    return smokeParentReport(browser, baseUrl);
  })();

  await browser.close();

  const failures = collectFailures(subjects, rawLogPath);
  const allPass =
    FINAL_SIMULATION_SUBJECT_KEYS.every((k) => subjects[k]?.pass) &&
    (parentReport.notRun || parentReport.pass);

  const payload = {
    runId,
    generatedAt: new Date().toISOString(),
    baseUrl,
    port,
    autoPort: autoSelected,
    serverMode: serverMeta?.mode || (args.skipServer ? "external" : "unknown"),
    allPass,
    subjects,
    globalChecks: { parent_report: parentReport },
    failures,
    rawLog: log.getText(),
  };

  await writeSimulationReports(outputDir, payload);

  printConsoleSummary({
    subjects,
    failures,
    allPass,
    port,
    autoPort: autoSelected,
    outputDir,
  });

  if (serverMeta?.pid) {
    console.log(`Production server still running (pid=${serverMeta.pid}) on ${baseUrl}`);
    console.log("Stop it manually when done reviewing results.");
  }

  process.exit(allPass ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err?.message || err);
  process.exit(1);
});

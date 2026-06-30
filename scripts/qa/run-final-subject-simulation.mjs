#!/usr/bin/env node
/**
 * Final subject simulation — all 7 launch subjects incl. history.
 *
 * Starts isolated Next dev on PORT 3200–3210 (default 3200), waits for readiness,
 * runs browser checks per subject, writes reports/simulations/final-subjects-<timestamp>/.
 *
 * Usage:
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs --skip-server --port=3200
 *   node --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs --resolve-port-only
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { getRepoRoot } from "../virtual-student-qa/lib/config.mjs";
import {
  buildRunId,
  defaultOutputDir,
  FINAL_SIMULATION_SUBJECT_KEYS,
  FINAL_SIMULATION_SUBJECT_LABELS_HE,
} from "./lib/final-subject-simulation/constants.mjs";
import {
  resolveSimulationPort,
  waitForServerReady,
} from "./lib/final-subject-simulation/port-resolver.mjs";
import { printConsoleSummary, writeSimulationReports } from "./lib/final-subject-simulation/reports.mjs";
import { runSubjectSimulation, smokeParentReport } from "./lib/final-subject-simulation/subject-runner.mjs";

const REPO_ROOT = getRepoRoot();
const DEV_HOST = "127.0.0.1";

function parseArgs(argv) {
  const out = {
    skipServer: false,
    resolvePortOnly: false,
    port: null,
    runId: null,
    outputDir: null,
  };
  for (const arg of argv) {
    if (arg === "--skip-server") out.skipServer = true;
    if (arg === "--resolve-port-only") out.resolvePortOnly = true;
    if (arg.startsWith("--port=")) out.port = Number(arg.slice("--port=".length));
    if (arg.startsWith("--runId=")) out.runId = arg.slice("--runId=".length).trim();
    if (arg.startsWith("--outputDir=")) out.outputDir = arg.slice("--outputDir=".length).trim();
  }
  return out;
}

function teeLog(logPath) {
  const chunks = [];
  const stream = createWriteStream(logPath, { flags: "a" });
  const write = (chunk) => {
    const text = String(chunk);
    chunks.push(text);
    stream.write(text);
    process.stdout.write(text);
  };
  const end = () =>
    new Promise((resolve) => {
      stream.end(resolve);
    });
  return { write, end, getText: () => chunks.join("") };
}

async function startDevServer(port, serverLogPath) {
  await mkdir(dirname(serverLogPath), { recursive: true });
  const logStream = createWriteStream(serverLogPath, { flags: "a" });
  logStream.write(`[${new Date().toISOString()}] starting npx next dev -p ${port} -H ${DEV_HOST}\n`);

  const child = spawn("npx", ["next", "dev", "-p", String(port), "-H", DEV_HOST], {
    cwd: REPO_ROOT,
    shell: true,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });

  child.stdout?.on("data", (d) => logStream.write(d));
  child.stderr?.on("data", (d) => logStream.write(d));

  return { pid: child.pid, logStream };
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
  const tee = teeLog(rawLogPath);

  tee.write(`\n=== final-subject-simulation runId=${runId} ===\n`);
  tee.write(`Port: ${port}${autoSelected ? " (auto-selected)" : ""}\n`);
  tee.write(`Output: ${outputDir}\n\n`);

  const baseUrl = `http://${DEV_HOST}:${port}`;
  let serverMeta = null;

  if (!args.skipServer) {
    tee.write(`Starting dev server on ${baseUrl} …\n`);
    serverMeta = await startDevServer(port, rawLogPath);
    tee.write(`Server pid=${serverMeta.pid}\n`);
  } else {
    tee.write(`--skip-server: expecting server already at ${baseUrl}\n`);
  }

  tee.write("Waiting for /student/login …\n");
  const ready = await waitForServerReady(baseUrl);
  if (!ready) {
    tee.write(`ERROR: server not ready at ${baseUrl}\n`);
    await tee.end();
    process.exit(2);
  }
  tee.write("Server ready.\n\n");

  process.env.PLAYWRIGHT_BASE_URL = baseUrl;
  process.env.VIRTUAL_STUDENT_BASE_URL = baseUrl;
  process.env.PORT = String(port);

  const browser = await chromium.launch({ headless: true });
  const subjects = {};
  const failures = [];

  for (const subjectKey of FINAL_SIMULATION_SUBJECT_KEYS) {
    const label = FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey;
    tee.write(`--- ${label} (${subjectKey}) ---\n`);
    const result = await runSubjectSimulation(browser, {
      baseUrl,
      subjectKey,
      logFile: rawLogPath,
    });
    subjects[subjectKey] = result;
    tee.write(`${label}: ${result.pass ? "PASS" : "FAIL"}\n`);
    if (!result.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: Object.entries(result.steps).find(([, v]) => !v.pass)?.[0] || "unknown",
        error: result.error || "check failed",
        logFile: rawLogPath,
      });
    }
  }

  const parentReport = await smokeParentReport(browser, baseUrl);
  await browser.close();

  const allPass =
    FINAL_SIMULATION_SUBJECT_KEYS.every((k) => subjects[k]?.pass) &&
    (parentReport.notRun || parentReport.pass);

  const payload = {
    runId,
    generatedAt: new Date().toISOString(),
    baseUrl,
    port,
    autoPort: autoSelected,
    allPass,
    subjects,
    globalChecks: { parent_report: parentReport },
    failures,
    rawLog: tee.getText(),
  };

  await writeSimulationReports(outputDir, payload);
  await tee.end();

  printConsoleSummary({
    subjects,
    failures,
    allPass,
    port,
    autoPort: autoSelected,
    outputDir,
  });

  if (serverMeta?.pid) {
    console.log(`Dev server still running (pid=${serverMeta.pid}) on ${baseUrl}`);
    console.log("Stop it manually when done reviewing results.");
  }

  process.exit(allPass ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err?.message || err);
  process.exit(1);
});

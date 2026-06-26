#!/usr/bin/env node
/**
 * Generate speed-pressure-bridge-debug artifacts for an existing run (no re-seed).
 *
 *   node --env-file=.env.local scripts/qa/run-speed-pressure-bridge-debug.mjs \
 *     --runId=mass-2026-06-26T00-59-21
 *
 * Compare pass vs fail:
 *   node --env-file=.env.local scripts/qa/run-speed-pressure-bridge-debug.mjs \
 *     --runId=mass-2026-06-26T00-59-21 \
 *     --compare-runId=mass-2026-06-25T16-09-42
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureReportDir, writeJson } from "./lib/mass-virtual-students/artifacts.mjs";
import { REPO_ROOT, parseMassSimulationCli } from "./lib/mass-virtual-students/config.mjs";
import {
  buildSpeedPressureBridgeCompareMarkdown,
  buildSpeedPressureBridgeDebug,
  buildSpeedPressureBridgeDebugMarkdown,
} from "./lib/mass-virtual-students/speed-pressure-bridge-debug.mjs";

function parseRunId(argv) {
  const hit = argv.find((a) => a.startsWith("--runId="));
  if (!hit) throw new Error("Missing --runId=<runId>");
  return hit.slice("--runId=".length);
}

function parseCompareRunId(argv) {
  const hit = argv.find((a) => a.startsWith("--compare-runId="));
  return hit ? hit.slice("--compare-runId=".length) : undefined;
}

async function loadRun(runId) {
  const reportDir = join(REPO_ROOT, "reports", "mass-simulation", runId);
  const manifest = JSON.parse(await readFile(join(reportDir, "manifest.json"), "utf8"));
  let dateRange;
  try {
    const summary = JSON.parse(await readFile(join(reportDir, "summary.json"), "utf8"));
    dateRange = summary.dateRange;
  } catch {
    throw new Error(`summary.json missing for runId=${runId}`);
  }
  return { reportDir, manifest, dateRange };
}

async function buildForRun(runId) {
  const { reportDir, manifest, dateRange } = await loadRun(runId);
  const debug = await buildSpeedPressureBridgeDebug({
    students: manifest.students,
    runId,
    fromDate: dateRange.from,
    toDate: dateRange.to,
  });
  await ensureReportDir(reportDir);
  await writeJson(reportDir, "speed-pressure-bridge-debug.json", debug);
  await writeFile(
    join(reportDir, "speed-pressure-bridge-debug.md"),
    buildSpeedPressureBridgeDebugMarkdown(debug),
    "utf8",
  );
  console.log(
    `[bridge-debug] runId=${runId} fast_errors=${debug.fastErrorsCount} triggered=${debug.speedPressureTriggeredCount} → ${reportDir}`,
  );
  console.log(`[bridge-debug] root cause: ${debug.analysis.rootCause}`);
  return debug;
}

async function main() {
  parseMassSimulationCli(process.argv.slice(2));
  const argv = process.argv.slice(2);
  const runId = parseRunId(argv);
  const compareRunId = parseCompareRunId(argv);

  const failDebug = await buildForRun(runId);

  if (compareRunId) {
    const passDebug = await buildForRun(compareRunId);
    const compare = { passRun: passDebug, failRun: failDebug };
    const reportDir = join(REPO_ROOT, "reports", "mass-simulation", runId);
    await writeJson(reportDir, "speed-pressure-bridge-compare.json", compare);
    await writeFile(
      join(reportDir, "speed-pressure-bridge-compare.md"),
      buildSpeedPressureBridgeCompareMarkdown(compare),
      "utf8",
    );
    console.log(`[bridge-debug] compare written → ${reportDir}/speed-pressure-bridge-compare.md`);
  }
}

main().catch((err) => {
  console.error("FATAL", err?.message || err);
  process.exit(1);
});

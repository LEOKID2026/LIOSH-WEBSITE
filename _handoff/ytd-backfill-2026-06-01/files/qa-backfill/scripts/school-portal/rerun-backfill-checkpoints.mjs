#!/usr/bin/env node
/**
 * Rerun report checkpoints only — reads existing backfill artifacts, no DB simulation.
 *
 *   node --env-file=.env.local scripts/school-portal/rerun-backfill-checkpoints.mjs --from 2026-04-28 --to 2026-05-04
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBackfillCheckpoint } from "./sim/backfill-checkpoint.mjs";
import { writeJson } from "./sim/backfill-artifacts.mjs";
import { ensurePersonaMaps, loadSchoolSimState } from "./sim/longitudinal-state.mjs";
import { defaultBaseUrl } from "./sim/school-sim-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let from = null;
  let to = null;
  let kinds = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") from = argv[++i];
    else if (a?.startsWith("--from=")) from = a.slice("--from=".length);
    else if (a === "--to") to = argv[++i];
    else if (a?.startsWith("--to=")) to = a.slice("--to=".length);
    else if (a === "--kinds") kinds = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a?.startsWith("--kinds=")) kinds = a.slice("--kinds=".length).split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!from || !to) throw new Error("--from and --to are required");
  return { from, to, kinds };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function classSummaryFromPlan(plan) {
  const out = {};
  for (const slot of plan?.slots || []) {
    if (!slot.classId) continue;
    if (!out[slot.classId]) {
      out[slot.classId] = {
        physicalName: slot.physicalName,
        grade: slot.grade,
        activities: 0,
      };
    }
    out[slot.classId].activities += 1;
  }
  return out;
}

function loadClassSummary(artifactRoot, currentDateIso) {
  const planPath = path.join(artifactRoot, "days", currentDateIso, "db-sim-plan.json");
  const plan = readJsonIfExists(planPath);
  return plan ? classSummaryFromPlan(plan) : {};
}

async function main() {
  const { from: fromIso, to: toIso, kinds } = parseArgs(process.argv.slice(2));
  const artifactRoot = path.join(__dirname, "..", "..", "reports", "school-sim-backfill", `${fromIso}__${toIso}`);
  const samplePath = path.join(artifactRoot, "home-practice/home-practice-sample.json");
  if (!fs.existsSync(samplePath)) throw new Error(`Missing ${samplePath}`);

  const homePracticeSample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const state = ensurePersonaMaps(loadSchoolSimState());
  const baseUrl = defaultBaseUrl();
  const log = (line) => console.log(line);

  const allCheckpoints = [
    {
      kind: `month-${fromIso.slice(0, 7)}`,
      currentDateIso: `${fromIso.slice(0, 7)}-30`,
      uiPath: path.join(artifactRoot, `months/${fromIso.slice(0, 7)}/ui-checkpoint.json`),
      reportPath: path.join(artifactRoot, `months/${fromIso.slice(0, 7)}/report-checkpoint.json`),
    },
    {
      kind: "final",
      currentDateIso: toIso,
      uiPath: path.join(artifactRoot, "final/ui-checkpoint.json"),
      reportPath: path.join(artifactRoot, "final/report-checkpoint.json"),
    },
  ];

  const weekDirs = fs.existsSync(path.join(artifactRoot, "weeks"))
    ? fs
        .readdirSync(path.join(artifactRoot, "weeks"))
        .filter((name) => name.startsWith("week-"))
        .map((name) => {
          const reportPath = path.join(artifactRoot, "weeks", name, "report-checkpoint.json");
          if (!fs.existsSync(reportPath)) return null;
          const report = readJsonIfExists(reportPath);
          return {
            kind: name,
            currentDateIso: report?.currentDateIso || toIso,
            uiPath: path.join(artifactRoot, "weeks", name, "ui-checkpoint.json"),
            reportPath,
          };
        })
        .filter(Boolean)
    : [];

  const monthDirs = fs.existsSync(path.join(artifactRoot, "months"))
    ? fs
        .readdirSync(path.join(artifactRoot, "months"))
        .filter((name) => /^\d{4}-\d{2}$/.test(name))
        .map((monthKey) => {
          const reportPath = path.join(artifactRoot, "months", monthKey, "report-checkpoint.json");
          if (!fs.existsSync(reportPath)) return null;
          const report = readJsonIfExists(reportPath);
          return {
            kind: `month-${monthKey}`,
            currentDateIso: report?.currentDateIso || `${monthKey}-28`,
            uiPath: path.join(artifactRoot, "months", monthKey, "ui-checkpoint.json"),
            reportPath,
          };
        })
        .filter(Boolean)
    : [];

  let checkpoints = [...weekDirs, ...monthDirs];
  const finalCp = allCheckpoints.find((cp) => cp.kind === "final");
  if (finalCp && fs.existsSync(finalCp.reportPath)) checkpoints.push(finalCp);
  if (kinds?.length) {
    checkpoints = checkpoints.filter((cp) => kinds.includes(cp.kind));
  }
  if (!checkpoints.length) throw new Error("No report checkpoints found to rerun");

  const results = [];
  for (const cp of checkpoints) {
    const ui = readJsonIfExists(cp.uiPath);
    const classSummary = loadClassSummary(artifactRoot, cp.currentDateIso);
    log(`rerun checkpoint: ${cp.kind} asOf=${cp.currentDateIso}`);
    const out = await runBackfillCheckpoint({
      kind: cp.kind,
      state,
      artifactRoot,
      baseUrl,
      fromIso,
      toIso,
      currentDateIso: cp.currentDateIso,
      classSummary,
      homePracticeSample,
      uiSampleResults: ui?.results || [],
      log,
    });
    results.push({ ...cp, ...out });
  }

  const summaryPath = path.join(artifactRoot, "backfill-summary.json");
  const summary = readJsonIfExists(summaryPath) || {};
  summary.reportCheckpointsRan = results.length;
  summary.reportCheckpointsPassed = results.filter((r) => r.passed).length;
  summary.reportCheckpointsFailed = results.length - summary.reportCheckpointsPassed;
  summary.blockers = results.filter((r) => !r.passed).map((r) => `Report checkpoint failed on ${r.currentDateIso}`);
  summary.overallStatus = summary.blockers.length ? "FAIL" : summary.warnings?.length ? "WARN" : "PASS";
  writeJson(artifactRoot, "backfill-summary.json", summary);

  console.log(
    JSON.stringify(
      {
        overallStatus: summary.overallStatus,
        artifactRoot,
        checkpoints: results.map((r) => ({
          kind: r.kind,
          passed: r.passed,
          status: r.reportResult.status,
          historicalFails: r.reportResult.historicalReportChecks?.failCount ?? 0,
          r1ByRange: r.reportResult.historicalReportChecks?.r1ByRange ?? [],
        })),
      },
      null,
      2
    )
  );
  process.exit(summary.overallStatus === "FAIL" ? 1 : 0);
}

main().catch((e) => {
  console.error("rerun-backfill-checkpoints: FAIL", e?.stack || e);
  process.exit(1);
});

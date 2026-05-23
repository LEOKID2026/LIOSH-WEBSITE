#!/usr/bin/env node
/**
 * Launch Readiness — Parent Copilot Truth MVP (E8).
 *
 * Deterministic Copilot turns against E5.1 parent-report snapshots.
 * No Supabase, no live LLM, no virtual-student runner.
 *
 * Usage:
 *   npm run qa:launch:parent-copilot-truth -- --date 2026-05-23
 *   node scripts/launch-readiness/run-copilot-truth-prompts.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildCopilotTruthAudit,
  buildCopilotTruthMarkdown,
} from "./lib/copilot-truth-audit.mjs";
import { loadParentReportSnapshots } from "./lib/parent-report-snapshot-loader.mjs";

function parseArgs(argv) {
  const args = { date: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" || a === "-d") {
      args.date = argv[++i];
    } else if (a?.startsWith("--date=")) {
      args.date = a.slice("--date=".length);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (!a?.startsWith("-") && /^\d{4}-\d{2}-\d{2}$/.test(a || "")) {
      if (!args.date) args.date = a;
    }
  }
  return args;
}

function isValidIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function repoRootFromHere() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

async function readJsonSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/run-copilot-truth-prompts.mjs --date YYYY-MM-DD"
    );
    process.exit(0);
  }

  if (!args.date) {
    console.error("ERROR: --date YYYY-MM-DD is required.");
    process.exit(1);
  }
  if (!isValidIsoDate(args.date)) {
    console.error(`ERROR: --date must be YYYY-MM-DD, got: ${args.date}`);
    process.exit(1);
  }

  const repoRoot = repoRootFromHere();
  const sourceDirAbs = path.join(
    repoRoot,
    "reports",
    "virtual-student-daily",
    args.date
  );
  const sourceDirRel = path
    .relative(repoRoot, sourceDirAbs)
    .split(path.sep)
    .join("/");

  const launchDir = path.join(repoRoot, "reports", "launch-readiness", args.date);

  console.log(
    `launch-readiness/parent-copilot-truth: date=${args.date} sourceDir=${sourceDirRel}`
  );

  const runSummary = await readJsonSafe(path.join(sourceDirAbs, "run-summary.json"));
  const parentReportTruth = await readJsonSafe(
    path.join(launchDir, "parent-report-truth-audit.json")
  );
  const diagnosticGroundTruth = await readJsonSafe(
    path.join(launchDir, "diagnostic-ground-truth-report.json")
  );
  const parentRecommendation = await readJsonSafe(
    path.join(launchDir, "parent-recommendation-audit.json")
  );

  const snapshotsByLabel = await loadParentReportSnapshots(sourceDirAbs);

  const report = await buildCopilotTruthAudit({
    date: args.date,
    sourceDir: sourceDirRel,
    repoRoot,
    runSummary,
    snapshotsByLabel,
    parentReportTruth,
    diagnosticGroundTruth,
    parentRecommendation,
  });

  await mkdir(launchDir, { recursive: true });

  const jsonPath = path.join(launchDir, "parent-copilot-truth-audit.json");
  const mdPath = path.join(launchDir, "parent-copilot-truth-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildCopilotTruthMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Parent Copilot Truth (E8 MVP) ===========");
  console.log(`overallStatus   : ${report.overallStatus}`);
  console.log(`runKind         : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(
    `students        : ${report.students.length} (${report.students.map((s) => s.label).join(", ") || "—"})`
  );
  console.log(`turns           : ${report.turns.length}`);
  console.log(`generatedAnswers: ${report.adapter?.generatedAnswers ?? 0}`);
  console.log(`blockers        : ${report.blockers.length}`);
  console.log(`warnings        : ${report.warnings.length}`);
  console.log(`md              : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json            : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("====================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/parent-copilot-truth FAILED:", err?.stack || err);
  process.exit(1);
});

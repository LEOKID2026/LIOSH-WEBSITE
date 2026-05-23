#!/usr/bin/env node
/**
 * Launch Readiness — Parent Recommendation Audit MVP (E7).
 *
 * Reads existing artifacts only. Never Supabase, Playwright, or runner.
 *
 * Usage:
 *   npm run qa:launch:parent-recommendation -- --date 2026-05-23
 *   node scripts/launch-readiness/build-parent-recommendation-audit.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildParentRecommendationAudit,
  buildParentRecommendationMarkdown,
} from "./lib/parent-recommendation-audit.mjs";
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
      "Usage: node scripts/launch-readiness/build-parent-recommendation-audit.mjs --date YYYY-MM-DD"
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

  const runSummaryPath = path.join(sourceDirAbs, "run-summary.json");
  const diagnosticPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    args.date,
    "diagnostic-ground-truth-report.json"
  );
  const parentTruthPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    args.date,
    "parent-report-truth-audit.json"
  );

  console.log(
    `launch-readiness/parent-recommendation: date=${args.date} sourceDir=${sourceDirRel}`
  );

  const [runSummary, diagnosticGroundTruth, parentReportTruth, parentReportSnapshots] =
    await Promise.all([
      readJsonSafe(runSummaryPath),
      readJsonSafe(diagnosticPath),
      readJsonSafe(parentTruthPath),
      loadParentReportSnapshots(sourceDirAbs),
    ]);

  const report = buildParentRecommendationAudit({
    date: args.date,
    sourceDir: sourceDirRel,
    runSummary,
    parentReportSnapshots,
    diagnosticGroundTruth,
    parentReportTruth,
  });

  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "parent-recommendation-audit.json");
  const mdPath = path.join(outDir, "parent-recommendation-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildParentRecommendationMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Parent Recommendation Audit (E7) ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(
    `students      : ${report.students.length} (${report.students.map((s) => `${s.label}:${s.recommendationAlignment}`).join(", ") || "—"})`
  );
  console.log(`recommendations: ${(report.recommendations || []).length} snippets`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("==========================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/parent-recommendation FAILED:", err?.stack || err);
  process.exit(1);
});

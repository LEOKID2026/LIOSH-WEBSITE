#!/usr/bin/env node
/**
 * Launch Readiness — Cross-device Persistence Evidence (E9B MVP).
 *
 * Reads existing docs/reports/scripts only. No live multi-device test.
 * No Supabase read/write.
 *
 * Usage:
 *   npm run qa:launch:cross-device -- --date 2026-05-23
 *   node scripts/launch-readiness/probe-cross-device-persistence.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildCrossDevicePersistenceAudit,
  buildCrossDevicePersistenceMarkdown,
} from "./lib/cross-device-persistence-audit.mjs";

function parseArgs(argv) {
  const args = { date: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" || a === "-d") args.date = argv[++i];
    else if (a?.startsWith("--date=")) args.date = a.slice("--date=".length);
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!a?.startsWith("-") && /^\d{4}-\d{2}-\d{2}$/.test(a || "")) {
      if (!args.date) args.date = a;
    }
  }
  return args;
}

function repoRootFromHere() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
      "Usage: node scripts/launch-readiness/probe-cross-device-persistence.mjs --date YYYY-MM-DD"
    );
    process.exit(0);
  }
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    console.error("ERROR: --date YYYY-MM-DD is required.");
    process.exit(1);
  }

  const repoRoot = repoRootFromHere();
  const launchDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  const dailyDir = path.join(repoRoot, "reports", "virtual-student-daily", args.date);

  console.log(`launch-readiness/cross-device: date=${args.date} evidence-only (no live test)`);

  const runSummary = await readJsonSafe(path.join(dailyDir, "run-summary.json"));
  const parentReportTruth = await readJsonSafe(path.join(launchDir, "parent-report-truth-audit.json"));
  const dataIntegrity = await readJsonSafe(path.join(launchDir, "data-integrity-audit.json"));

  const report = buildCrossDevicePersistenceAudit({
    date: args.date,
    repoRoot,
    runSummary,
    parentReportTruth,
    dataIntegrity,
  });

  await mkdir(launchDir, { recursive: true });

  const jsonPath = path.join(launchDir, "cross-device-persistence-audit.json");
  const mdPath = path.join(launchDir, "cross-device-persistence-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildCrossDevicePersistenceMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Cross-device Persistence (E9B MVP) ===========");
  console.log(`overallStatus              : ${report.overallStatus}`);
  console.log(`liveMultiDeviceTestPerformed: ${report.liveMultiDeviceTestPerformed}`);
  console.log(`evidenceItems              : ${report.evidenceItems.length}`);
  console.log(
    `claims                     : ${report.checkedClaims.map((c) => `${c.claimId}:${c.status}`).join(", ")}`
  );
  console.log(`blockers                   : ${report.blockers.length}`);
  console.log(`warnings                   : ${report.warnings.length}`);
  console.log(`md                         : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json                       : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("========================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/cross-device FAILED:", err?.stack || err);
  process.exit(1);
});

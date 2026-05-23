#!/usr/bin/env node
/**
 * Launch Readiness — Data Integrity Audit MVP (E4).
 *
 * Reads reports/virtual-student-daily/<date>/run-summary.json only.
 * Writes reports/launch-readiness/<date>/data-integrity-audit.json + .md
 *
 * Usage:
 *   npm run qa:launch:data-integrity -- --date 2026-05-23
 *   node scripts/launch-readiness/build-data-integrity-audit.mjs 2026-05-23
 *
 * Exit 0 when audit report is written (even if overallStatus is not_run/warn/fail).
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildDataIntegrityAudit,
  buildDataIntegrityMarkdown,
} from "./lib/data-integrity.mjs";

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

async function readRunSummary(filePath) {
  if (!existsSync(filePath)) return { exists: false, data: null, error: null };
  try {
    const raw = await readFile(filePath, "utf8");
    return { exists: true, data: JSON.parse(raw), error: null };
  } catch (err) {
    return {
      exists: true,
      data: null,
      error: String(err?.message || err).slice(0, 200),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/build-data-integrity-audit.mjs --date YYYY-MM-DD"
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
  const runSummaryPath = path.join(
    repoRoot,
    "reports",
    "virtual-student-daily",
    args.date,
    "run-summary.json"
  );
  const relSource = path
    .relative(repoRoot, runSummaryPath)
    .split(path.sep)
    .join("/");

  console.log(`launch-readiness/data-integrity: date=${args.date} source=${relSource}`);

  const nightlyRead = await readRunSummary(runSummaryPath);

  const report = buildDataIntegrityAudit({
    date: args.date,
    runSummary: nightlyRead.error ? null : nightlyRead.data,
    source: nightlyRead.exists ? relSource : null,
  });

  if (nightlyRead.error) {
    report.warnings.push({
      severity: "P1",
      detail: `run-summary.json קיים אך לא תקין: ${nightlyRead.error}`,
      source: relSource,
      action: "בדוק את הקובץ ידנית.",
    });
    report.overallStatus = "not_run";
  }

  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "data-integrity-audit.json");
  const mdPath = path.join(outDir, "data-integrity-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildDataIntegrityMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Data Integrity Audit (MVP) ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(`students      : ${report.students.length} (${report.students.map((s) => s.label).join(", ") || "—"})`);
  console.log(`sessions      : ${report.sessions.length}`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`crossStudent  : ${report.crossStudentSummary?.status ?? "—"}`);
  console.log(`stateAdvance  : ${report.stateAdvanceSummary?.status ?? "—"}`);
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("==================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/data-integrity FAILED:", err?.stack || err);
  process.exit(1);
});

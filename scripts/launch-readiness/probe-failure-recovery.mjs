#!/usr/bin/env node
/**
 * Launch Readiness — Failure Recovery (E9C MVP).
 *
 * Reads existing run artifacts/logs only. No failure injection, no runner, no Supabase.
 *
 * Usage:
 *   npm run qa:launch:failure-recovery -- --date 2026-05-23
 *   node scripts/launch-readiness/probe-failure-recovery.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildFailureRecoveryAudit,
  buildFailureRecoveryMarkdown,
} from "./lib/failure-recovery-audit.mjs";

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

async function readTextSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/probe-failure-recovery.mjs --date YYYY-MM-DD"
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

  console.log(`launch-readiness/failure-recovery: date=${args.date} artifacts-only (no injection)`);

  const runSummary = await readJsonSafe(path.join(dailyDir, "run-summary.json"));
  const dataIntegrity = await readJsonSafe(path.join(launchDir, "data-integrity-audit.json"));
  const coverageSummary = await readJsonSafe(path.join(launchDir, "coverage-summary.json"));
  const knownIssuesDoc = await readTextSafe(
    path.join(repoRoot, "scripts", "virtual-student-qa", "KNOWN-ISSUES.md")
  );

  const report = buildFailureRecoveryAudit({
    date: args.date,
    repoRoot,
    runSummary,
    dataIntegrity,
    coverageSummary,
    knownIssuesDoc,
  });

  await mkdir(launchDir, { recursive: true });

  const jsonPath = path.join(launchDir, "failure-recovery-audit.json");
  const mdPath = path.join(launchDir, "failure-recovery-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildFailureRecoveryMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Failure Recovery (E9C MVP) ===========");
  console.log(`overallStatus              : ${report.overallStatus}`);
  console.log(`failureInjectionPerformed  : ${report.failureInjectionPerformed}`);
  console.log(`events                     : ${report.events.length}`);
  console.log(`students partial           : ${report.students.filter((s) => s.status === "partial").map((s) => s.label).join(", ") || "—"}`);
  console.log(`AAA7                       : ${report.aaa7Classification?.classification || "—"}`);
  console.log(`stateAdvance               : ${report.stateAdvanceSummary?.status || "—"}`);
  console.log(`API fail total             : ${report.apiFailureSummary ? Object.values(report.apiFailureSummary).reduce((n, v) => n + (v.fail || 0), 0) : "—"}`);
  console.log(`blockers                   : ${report.blockers.length}`);
  console.log(`warnings                   : ${report.warnings.length}`);
  console.log(`md                         : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json                       : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("==================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/failure-recovery FAILED:", err?.stack || err);
  process.exit(1);
});

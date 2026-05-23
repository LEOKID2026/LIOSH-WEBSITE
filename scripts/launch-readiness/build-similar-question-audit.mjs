#!/usr/bin/env node
/**
 * Launch Readiness — Similar / Adaptive Follow-up Audit MVP (E6).
 *
 * Reads existing artifacts only. Never Supabase, Playwright, or runner.
 *
 * Usage:
 *   npm run qa:launch:similar-questions -- --date 2026-05-23
 *   node scripts/launch-readiness/build-similar-question-audit.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildSimilarQuestionAudit,
  buildSimilarQuestionMarkdown,
} from "./lib/similar-question-audit.mjs";

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

async function readTextSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function findDriverLog(baseDir, date) {
  const logsDir = path.join(baseDir, "logs");
  if (!existsSync(logsDir)) return null;
  const preferred = path.join(logsDir, `phase-d2-${date}.log`);
  if (existsSync(preferred)) return readTextSafe(preferred);
  const entries = await readdir(logsDir);
  const logFiles = entries.filter((f) => f.endsWith(".log"));
  if (logFiles.length === 0) return null;
  return readTextSafe(path.join(logsDir, logFiles[0]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/build-similar-question-audit.mjs --date YYYY-MM-DD"
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
  const stateSnapshotPath = path.join(sourceDirAbs, "state-snapshot.json");
  const coveragePath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    args.date,
    "coverage-summary.json"
  );
  const diagnosticPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    args.date,
    "diagnostic-ground-truth-report.json"
  );

  console.log(
    `launch-readiness/similar-questions: date=${args.date} sourceDir=${sourceDirRel}`
  );

  const [runSummary, stateSnapshot, coverageSummary, diagnosticGroundTruth, driverLogText] =
    await Promise.all([
      readJsonSafe(runSummaryPath),
      readJsonSafe(stateSnapshotPath),
      readJsonSafe(coveragePath),
      readJsonSafe(diagnosticPath),
      findDriverLog(sourceDirAbs, args.date),
    ]);

  const report = buildSimilarQuestionAudit({
    date: args.date,
    sourceDir: sourceDirRel,
    runSummary,
    stateSnapshot,
    coverageSummary,
    diagnosticGroundTruth,
    driverLogText,
  });

  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "similar-question-audit.json");
  const mdPath = path.join(outDir, "similar-question-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildSimilarQuestionMarkdown(report), "utf8");

  const totalEvents = (report.events || []).length;
  const totalWrong = (report.students || []).reduce(
    (n, s) => n + Number(s.wrongAnswersCount || 0),
    0
  );

  console.log("");
  console.log("=========== Similar Question Audit (E6) ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(
    `students      : ${report.students.length} (${report.students.map((s) => `${s.label}:${s.matchStatus}`).join(", ") || "—"})`
  );
  console.log(`wrong events  : ${totalWrong} wrong answers, ${totalEvents} follow-up events`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("===================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/similar-questions FAILED:", err?.stack || err);
  process.exit(1);
});

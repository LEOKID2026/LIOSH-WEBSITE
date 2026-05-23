#!/usr/bin/env node
/**
 * Launch Readiness — Diagnostic Ground Truth Report MVP (E5).
 *
 * Reads existing artifacts only. Never Supabase, never Playwright.
 *
 * Usage:
 *   npm run qa:launch:diagnostic-ground-truth -- --date 2026-05-23
 *   node scripts/launch-readiness/build-diagnostic-ground-truth-report.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildDiagnosticGroundTruthReport,
  buildDiagnosticGroundTruthMarkdown,
} from "./lib/diagnostic-ground-truth.mjs";

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

async function listFilesRecursive(baseDir, subDir = "") {
  const abs = path.join(baseDir, subDir);
  if (!existsSync(abs)) return [];
  const entries = await readdir(abs, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    const rel = subDir ? path.join(subDir, ent.name) : ent.name;
    if (ent.isDirectory()) {
      out.push(...(await listFilesRecursive(baseDir, rel)));
    } else if (ent.isFile()) {
      out.push(rel.split(path.sep).join("/"));
    }
  }
  return out;
}

async function loadDiagnosticTextFiles(baseDir, artifactFiles) {
  const out = [];
  const TEXT_EXT = /\.(json|md|txt|html)$/i;
  const SKIP = /run-summary|plan\.json|failure-repro/i;

  for (const rel of artifactFiles) {
    if (!TEXT_EXT.test(rel) || SKIP.test(rel)) continue;
    if (/parent-report-snapshots\/.*\.md$/i.test(rel)) continue;
    if (!/parent-report|report-snapshot|diagnostic|report-text|populated/i.test(rel)) {
      continue;
    }
    try {
      const text = await readFile(path.join(baseDir, rel), "utf8");
      out.push({ path: rel, text });
    } catch {
      // skip
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/build-diagnostic-ground-truth-report.mjs --date YYYY-MM-DD"
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
  const parentTruthPath = path.join(
    repoRoot,
    "reports",
    "launch-readiness",
    args.date,
    "parent-report-truth-audit.json"
  );

  console.log(
    `launch-readiness/diagnostic-ground-truth: date=${args.date} sourceDir=${sourceDirRel}`
  );

  const runSummary = await readJsonSafe(runSummaryPath);
  const stateSnapshot = await readJsonSafe(stateSnapshotPath);
  const parentReportTruth = await readJsonSafe(parentTruthPath);
  const artifactFiles = await listFilesRecursive(sourceDirAbs);
  const diagnosticTextFiles = await loadDiagnosticTextFiles(sourceDirAbs, artifactFiles);

  const report = buildDiagnosticGroundTruthReport({
    date: args.date,
    sourceDir: sourceDirRel,
    runSummary,
    stateSnapshot,
    parentReportTruth,
    diagnosticTextFiles,
  });

  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "diagnostic-ground-truth-report.json");
  const mdPath = path.join(outDir, "diagnostic-ground-truth-report.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildDiagnosticGroundTruthMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Diagnostic Ground Truth (MVP) ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(`students      : ${report.students.length} (${report.students.map((s) => `${s.label}:${s.matchStatus}`).join(", ") || "—"})`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("===================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/diagnostic-ground-truth FAILED:", err?.stack || err);
  process.exit(1);
});

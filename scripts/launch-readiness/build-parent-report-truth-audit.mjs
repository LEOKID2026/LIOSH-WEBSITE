#!/usr/bin/env node
/**
 * Launch Readiness — Parent Report Truth Audit MVP (E3).
 *
 * Reads existing artifacts under reports/virtual-student-daily/<date>/ only.
 * Never browses live site, never runs Playwright, never writes Supabase.
 *
 * Usage:
 *   npm run qa:launch:parent-report-truth -- --date 2026-05-23
 *   node scripts/launch-readiness/build-parent-report-truth-audit.mjs 2026-05-23
 *
 * Exit 0 when audit report is written (even if overallStatus is not_run/warn/fail).
 */

import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildParentReportTruthAudit,
  buildParentReportTruthMarkdown,
} from "./lib/parent-report-truth.mjs";
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

/** Recursively list all files under dir, returning paths relative to baseDir. */
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

async function loadTextSnapshots(baseDir, artifactFiles) {
  const textContents = new Map();
  const TEXT_EXT = /\.(json|md|txt|html)$/i;
  const SKIP = /run-summary|plan\.json|state-snapshot|failure-repro/i;

  for (const rel of artifactFiles) {
    if (!TEXT_EXT.test(rel) || SKIP.test(rel)) continue;
    if (!/parent-report|report-snapshot|report-text|populated|baseline|after/i.test(rel)) {
      continue;
    }
    try {
      const raw = await readFile(path.join(baseDir, rel), "utf8");
      textContents.set(rel, raw);
    } catch {
      // ignore unreadable files
    }
  }
  return textContents;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/build-parent-report-truth-audit.mjs --date YYYY-MM-DD"
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

  console.log(
    `launch-readiness/parent-report-truth: date=${args.date} sourceDir=${sourceDirRel}`
  );

  const nightlyRead = await readRunSummary(runSummaryPath);
  const artifactFiles = await listFilesRecursive(sourceDirAbs);
  const textContents = await loadTextSnapshots(sourceDirAbs, artifactFiles);
  const parentReportSnapshots = await loadParentReportSnapshots(sourceDirAbs);

  const report = buildParentReportTruthAudit({
    date: args.date,
    sourceDir: nightlyRead.exists ? sourceDirRel : sourceDirRel,
    runSummary: nightlyRead.error ? null : nightlyRead.data,
    artifactFiles,
    textContents,
    parentReportSnapshots,
  });

  if (nightlyRead.error) {
    report.warnings.push({
      severity: "P1",
      detail: `run-summary.json קיים אך לא תקין: ${nightlyRead.error}`,
      source: `${sourceDirRel}/run-summary.json`,
      action: "בדוק את הקובץ ידנית.",
    });
    report.overallStatus = "not_run";
  }

  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "parent-report-truth-audit.json");
  const mdPath = path.join(outDir, "parent-report-truth-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildParentReportTruthMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Parent Report Truth Audit ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  console.log(`students      : ${report.students.length} checked (${report.students.map((s) => s.label).join(", ") || "—"})`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("=================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/parent-report-truth FAILED:", err?.stack || err);
  process.exit(1);
});

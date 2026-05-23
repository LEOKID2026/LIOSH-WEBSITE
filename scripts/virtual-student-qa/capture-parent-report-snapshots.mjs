#!/usr/bin/env node
/**
 * E5.1 — Backfill parent-report text/diagnostic snapshot artifacts.
 *
 * QA-only: opens existing report URLs from run-summary.json (read-only replay).
 * Does NOT run learning simulation or mutate student data.
 *
 * Usage:
 *   node scripts/virtual-student-qa/capture-parent-report-snapshots.mjs 2026-05-23
 *   node scripts/virtual-student-qa/capture-parent-report-snapshots.mjs --date 2026-05-23 --students AAA7
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { makeDailyArtifacts } from "./lib/artifacts.mjs";
import {
  loadParentAccounts,
  resolveBaseUrl,
  resolveParentAuthMode,
  selectParentAccount,
  isHeaded,
} from "./lib/config.mjs";
import { authenticateParent } from "./lib/parent-auth.mjs";
import {
  extractParentReportEvidenceFromPage,
  buildParentReportEvidenceMarkdown,
} from "./lib/parent-report-evidence.mjs";

const HEADING_REGEX = /דוח להורים/u;
const LOADING_TEXT = "טוען דוח...";

function parseArgs(argv) {
  const args = { date: null, students: [], baseUrl: null, headed: isHeaded() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" || a === "-d") args.date = argv[++i];
    else if (a?.startsWith("--date=")) args.date = a.slice("--date=".length);
    else if (a === "--students" || a === "-s") {
      args.students = String(argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a?.startsWith("--students=")) {
      args.students = a
        .slice("--students=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--base-url") args.baseUrl = argv[++i];
    else if (a?.startsWith("--base-url=")) args.baseUrl = a.slice("--base-url=".length);
    else if (a === "--headed") args.headed = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!a?.startsWith("-") && /^\d{4}-\d{2}-\d{2}$/.test(a || "")) {
      if (!args.date) args.date = a;
    }
  }
  return args;
}

function repoRootFromHere() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

async function readRunSummary(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function waitForReportReady(page) {
  const heading = page.getByRole("heading", { name: HEADING_REGEX }).first();
  await heading.waitFor({ state: "visible", timeout: 60_000 });
  await page
    .waitForFunction(
      (loadingText) => {
        const all = Array.from(document.querySelectorAll("body *"));
        return !all.some((el) => (el.textContent || "").includes(loadingText));
      },
      LOADING_TEXT,
      { timeout: 30_000 }
    )
    .catch(() => {});
}

async function capturePhase({
  page,
  reportUrl,
  student,
  phase,
  artifacts,
  log,
}) {
  log(`capture: ${student.label} ${phase} → ${reportUrl}`);
  await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForReportReady(page);

  const evidence = await extractParentReportEvidenceFromPage(page, {
    studentLabel: student.label,
    phase,
    reportUrl,
    expectedStudentName: student.expectedDisplayName || null,
    numericSnapshot: null,
  });

  artifacts.writeParentReportEvidence(evidence);
  artifacts.writeParentReportEvidenceMarkdown(
    evidence,
    buildParentReportEvidenceMarkdown(evidence)
  );
  log(
    `capture: wrote parent-report-snapshots/${student.label}-${phase}.{json,md} ` +
      `(diag=${evidence.detectedDiagnosticSubjects.join(",") || "none"}, ` +
      `rawKeys=${evidence.detectedRawKeys.length})`
  );
  return evidence;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node scripts/virtual-student-qa/capture-parent-report-snapshots.mjs --date YYYY-MM-DD [--students AAA7]"
    );
    process.exit(0);
  }
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    console.error("ERROR: --date YYYY-MM-DD is required.");
    process.exit(1);
  }

  const repoRoot = repoRootFromHere();
  const dailyDir = path.join(repoRoot, "reports", "virtual-student-daily", args.date);
  const runSummaryPath = path.join(dailyDir, "run-summary.json");
  const runSummary = await readRunSummary(runSummaryPath);
  if (!runSummary) {
    console.error(`ERROR: missing ${runSummaryPath}`);
    process.exit(1);
  }

  const baseUrl = args.baseUrl || runSummary.resolved?.baseUrl || resolveBaseUrl();
  const suiteStudents = Array.isArray(runSummary.suite?.students)
    ? runSummary.suite.students
    : [];
  const filter = args.students.length ? new Set(args.students) : null;
  const targets = suiteStudents.filter((s) => !filter || filter.has(s.label));

  if (targets.length === 0) {
    console.error("ERROR: no matching students in run-summary.suite.students.");
    process.exit(1);
  }

  const artifacts = makeDailyArtifacts({ repoRoot, date: args.date });
  const parents = loadParentAccounts();
  const parentAuthMode = resolveParentAuthMode();
  const log = (msg) => console.log(`[capture-parent-report] ${msg}`);

  log(`date=${args.date} baseUrl=${baseUrl} students=${targets.map((s) => s.label).join(",")}`);

  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  try {
    const parentAccount = selectParentAccount(parents, null, targets[0].label);
    await authenticateParent({
      context,
      page,
      account: parentAccount,
      baseUrl,
      mode: parentAuthMode,
      log,
    });

    for (const student of targets) {
      const phases = [
        { phase: "baseline", url: student.reportUrlAtBaseline },
        { phase: "after", url: student.reportUrlAtAfter },
      ];
      for (const { phase, url } of phases) {
        if (!url) {
          log(`skip ${student.label} ${phase} — no reportUrl in run-summary`);
          continue;
        }
        await capturePhase({ page, reportUrl: url, student, phase, artifacts, log });
      }
    }
  } finally {
    await browser.close();
  }

  console.log("");
  console.log("=========== Parent Report Snapshot Capture ===========");
  console.log(`date     : ${args.date}`);
  console.log(`students : ${targets.map((s) => s.label).join(", ")}`);
  console.log(`output   : reports/virtual-student-daily/${args.date}/parent-report-snapshots/`);
  console.log("======================================================");
}

main().catch((err) => {
  console.error("capture-parent-report-snapshots FAILED:", err?.stack || err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Launch Readiness — Mobile + RTL probe (E9A MVP).
 *
 * Lightweight Playwright checks at iPhone 12 viewport. No learning sessions.
 *
 * Usage:
 *   npm run qa:launch:mobile -- --date 2026-05-23
 *   node scripts/launch-readiness/probe-mobile-rtl.mjs 2026-05-23
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

import {
  buildMobileRtlAudit,
  buildMobileRtlMarkdown,
  probePageMetrics,
  evaluatePageResult,
  DEFAULT_VIEWPORT,
} from "./lib/mobile-rtl-audit.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const args = { date: null, baseUrl: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" || a === "-d") args.date = argv[++i];
    else if (a?.startsWith("--date=")) args.date = a.slice("--date=".length);
    else if (a === "--base-url") args.baseUrl = argv[++i];
    else if (a?.startsWith("--base-url=")) args.baseUrl = a.slice("--base-url=".length);
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!a?.startsWith("-") && /^\d{4}-\d{2}-\d{2}$/.test(a || "")) {
      if (!args.date) args.date = a;
    }
  }
  return args;
}

async function readJsonSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveBaseUrlFromRunSummary(runSummary, explicit) {
  if (explicit) return explicit.replace(/\/$/, "");
  const fromRun = runSummary?.resolved?.baseUrl || runSummary?.args?.baseUrl;
  if (fromRun) return String(fromRun).replace(/\/$/, "");
  return "https://liosh-website.vercel.app";
}

function collectReportUrls(runSummary, parentTruth, snapshotsByLabel) {
  const urls = [];
  const seen = new Set();

  const suite = Array.isArray(runSummary?.suite?.students) ? runSummary.suite.students : [];
  for (const s of suite) {
    const u = s.reportUrlAtAfter || s.reportUrlAtBaseline;
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push({ label: s.label, url: u });
    }
  }

  if (Array.isArray(parentTruth?.students)) {
    for (const s of parentTruth.students) {
      const u = s.reportUrlAtAfter || s.reportUrlAtBaseline;
      if (u && !seen.has(u)) {
        seen.add(u);
        urls.push({ label: s.label, url: u });
      }
    }
  }

  if (snapshotsByLabel) {
    for (const [label, snaps] of snapshotsByLabel) {
      const u = snaps?.after?.reportUrl;
      if (u && !seen.has(u)) {
        seen.add(u);
        urls.push({ label, url: u });
      }
    }
  }

  return urls.slice(0, 2);
}

async function loadQaConfig() {
  return import(
    pathToFileURL(path.join(REPO_ROOT, "scripts", "virtual-student-qa", "lib", "config.mjs")).href
  );
}

async function tryParentAuth(page, context, baseUrl, log) {
  try {
    const config = await loadQaConfig();
    const parentAuth = await import(
      pathToFileURL(
        path.join(REPO_ROOT, "scripts", "virtual-student-qa", "lib", "parent-auth.mjs")
      ).href
    );
    const parents = config.loadParentAccounts();
    if (!parents?.length) return { ok: false, reason: "no parent accounts in env" };
    const parentAccount = config.selectParentAccount(parents, null, "AAA1");
    await parentAuth.authenticateParent({
      context,
      page,
      account: parentAccount,
      baseUrl,
      mode: config.resolveParentAuthMode(),
      log,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err).slice(0, 200) };
  }
}

async function tryStudentAuth(page, context, baseUrl, log) {
  try {
    const config = await loadQaConfig();
    const studentAuth = await import(
      pathToFileURL(
        path.join(REPO_ROOT, "scripts", "virtual-student-qa", "lib", "student-auth.mjs")
      ).href
    );
    const accounts = config.loadAccounts();
    if (!accounts?.length) return { ok: false, reason: "no student accounts in env" };
    const account = config.selectAccount(accounts, "AAA1");
    await studentAuth.authenticateStudent({
      context,
      page,
      account,
      baseUrl,
      mode: config.resolveStudentAuthMode(),
      log,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err).slice(0, 200) };
  }
}

async function probeNamedPage({
  page,
  name,
  url,
  screenshotDir,
  screenshotName,
  consoleErrors,
  authRequired = false,
}) {
  const screenshotPath = path.join(screenshotDir, `${screenshotName}.png`);
  let metrics = null;
  let loadFailed = false;

  if (!authRequired) {
    try {
      metrics = await probePageMetrics(page, url);
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch (err) {
      loadFailed = true;
      consoleErrors.push(String(err?.message || err).slice(0, 300));
    }
  }

  const evaluated = evaluatePageResult({
    name,
    metrics,
    consoleErrors,
    authRequired,
    loadFailed,
  });

  return {
    name,
    url,
    checked: !authRequired,
    status: evaluated.status,
    viewport: DEFAULT_VIEWPORT,
    httpStatus: metrics?.httpStatus ?? null,
    direction: evaluated.direction,
    overflow: evaluated.overflow,
    controls: evaluated.controls,
    consoleErrors,
    screenshotPath: authRequired ? null : path.relative(REPO_ROOT, screenshotPath).split(path.sep).join("/"),
    blockers: evaluated.blockers,
    warnings: evaluated.warnings,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/launch-readiness/probe-mobile-rtl.mjs --date YYYY-MM-DD [--base-url URL]");
    process.exit(0);
  }
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    console.error("ERROR: --date YYYY-MM-DD is required.");
    process.exit(1);
  }

  const dailyDir = path.join(REPO_ROOT, "reports", "virtual-student-daily", args.date);
  const launchDir = path.join(REPO_ROOT, "reports", "launch-readiness", args.date);
  const screenshotDir = path.join(launchDir, "mobile-rtl-screenshots");

  const runSummary = await readJsonSafe(path.join(dailyDir, "run-summary.json"));
  const parentTruth = await readJsonSafe(path.join(launchDir, "parent-report-truth-audit.json"));

  const { loadParentReportSnapshots } = await import("./lib/parent-report-snapshot-loader.mjs");
  const snapshotsByLabel = await loadParentReportSnapshots(dailyDir);

  const baseUrl = resolveBaseUrlFromRunSummary(runSummary, args.baseUrl);
  const reportUrls = collectReportUrls(runSummary, parentTruth, snapshotsByLabel);

  await mkdir(screenshotDir, { recursive: true });
  await mkdir(launchDir, { recursive: true });

  console.log(`launch-readiness/mobile-rtl: date=${args.date} baseUrl=${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: DEFAULT_VIEWPORT.width, height: DEFAULT_VIEWPORT.height },
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const authNotes = [];
  const pages = [];

  const attachConsole = () => {
    const errors = [];
    const handler = (msg) => {
      if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
    };
    page.on("console", handler);
    return { errors, detach: () => page.off("console", handler) };
  };

  const publicTargets = [
    { name: "home", path: "/" },
    { name: "student_login", path: "/student/login" },
    { name: "parent_login", path: "/parent/login" },
  ];

  for (const t of publicTargets) {
    const { errors, detach } = attachConsole();
    pages.push(
      await probeNamedPage({
        page,
        name: t.name,
        url: new URL(t.path, baseUrl).toString(),
        screenshotDir,
        screenshotName: t.name,
        consoleErrors: errors,
      })
    );
    detach();
  }

  const parentAuth = await tryParentAuth(page, context, baseUrl, (m) =>
    console.log(`[mobile-rtl] ${m}`)
  );

  if (!parentAuth.ok) {
    authNotes.push(`Parent auth unavailable: ${parentAuth.reason}`);
    if (reportUrls.length === 0) {
      authNotes.push("No parent report URLs in run-summary artifacts.");
    }
    for (const { label, url } of reportUrls) {
      pages.push({
        name: `parent_report_${label}`,
        url,
        checked: false,
        status: "not_checked",
        viewport: DEFAULT_VIEWPORT,
        httpStatus: null,
        direction: null,
        overflow: null,
        controls: null,
        consoleErrors: [],
        screenshotPath: null,
        blockers: [],
        warnings: [
          {
            severity: "P1",
            detail: `parent_report_${label}: auth_required — report URL not opened (${parentAuth.reason}).`,
            action: "הגדר parent credentials ב-.env.local והרץ שוב.",
          },
        ],
      });
    }
  } else {
    for (const { label, url } of reportUrls) {
      const { errors, detach } = attachConsole();
      const screenshotName = `parent_report_${label}`;
      let metrics = null;
      let loadFailed = false;
      try {
        metrics = await probePageMetrics(page, url, { waitForParentReport: true });
        await page.screenshot({
          path: path.join(screenshotDir, `${screenshotName}.png`),
          fullPage: false,
        });
      } catch (err) {
        loadFailed = true;
        errors.push(String(err?.message || err).slice(0, 300));
      }
      const evaluated = evaluatePageResult({
        name: "parent_report",
        metrics,
        consoleErrors: errors,
        authRequired: false,
        loadFailed,
      });
      pages.push({
        name: `parent_report_${label}`,
        url,
        checked: true,
        status: evaluated.status,
        viewport: DEFAULT_VIEWPORT,
        httpStatus: metrics?.httpStatus ?? null,
        direction: evaluated.direction,
        overflow: evaluated.overflow,
        controls: evaluated.controls,
        consoleErrors: errors,
        screenshotPath: path
          .relative(REPO_ROOT, path.join(screenshotDir, `${screenshotName}.png`))
          .split(path.sep)
          .join("/"),
        blockers: evaluated.blockers,
        warnings: evaluated.warnings,
      });
      detach();
    }
  }

  const studentAuth = await tryStudentAuth(page, context, baseUrl, (m) =>
    console.log(`[mobile-rtl] ${m}`)
  );

  if (!studentAuth.ok) {
    authNotes.push(`Student auth unavailable: ${studentAuth.reason}`);
    pages.push({
      name: "student_home",
      url: new URL("/student/home", baseUrl).toString(),
      checked: false,
      status: "not_checked",
      viewport: DEFAULT_VIEWPORT,
      httpStatus: null,
      direction: null,
      overflow: null,
      controls: null,
      consoleErrors: [],
      screenshotPath: null,
      blockers: [],
      warnings: [
        {
          severity: "P1",
          detail: `student_home: auth_required — not checked (${studentAuth.reason}).`,
          action: "הגדר student credentials ב-.env.local.",
        },
      ],
    });
  } else {
    const { errors, detach } = attachConsole();
    pages.push(
      await probeNamedPage({
        page,
        name: "student_home",
        url: new URL("/student/home", baseUrl).toString(),
        screenshotDir,
        screenshotName: "student_home",
        consoleErrors: errors,
      })
    );
    detach();
  }

  await browser.close();

  const report = buildMobileRtlAudit({
    date: args.date,
    baseUrl,
    viewport: DEFAULT_VIEWPORT,
    pages,
    authNotes,
  });

  const jsonPath = path.join(launchDir, "mobile-rtl-audit.json");
  const mdPath = path.join(launchDir, "mobile-rtl-audit.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMobileRtlMarkdown(report), "utf8");

  console.log("");
  console.log("=========== Mobile + RTL Audit (E9A MVP) ===========");
  console.log(`overallStatus : ${report.overallStatus}`);
  console.log(`baseUrl       : ${baseUrl}`);
  console.log(`pages         : ${report.pages.length}`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`screenshots   : reports/launch-readiness/${args.date}/mobile-rtl-screenshots/`);
  console.log(`md            : ${path.relative(REPO_ROOT, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(REPO_ROOT, jsonPath).split(path.sep).join("/")}`);
  console.log("====================================================");
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/mobile-rtl FAILED:", err?.stack || err);
  process.exit(1);
});

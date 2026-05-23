#!/usr/bin/env node
/**
 * Help Center screenshot capture — demo student ADMIN / PIN 1234 only.
 * localhost / 127.0.0.1 / *.vercel.app preview only.
 */
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import { loadParentAccounts, selectParentAccount } from "../virtual-student-qa/lib/config.mjs";
import { loadScreenshotJobs, routeForJob } from "./load-capture-jobs.mjs";

const DEMO_STUDENT = { label: "help-center-demo", username: "ADMIN", pin: "1234", code: "" };
const EXPECTED_CHILD_NAME = "ישראל ישראלי";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1366, height: 900 },
];

function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isVercelPreview = host.endsWith(".vercel.app");
  if (!isLocal && !isVercelPreview) {
    throw new Error(
      `Refusing capture: base URL must be localhost, 127.0.0.1, or *.vercel.app preview. Got: ${baseUrl}`
    );
  }
}

function auditPath(section, slug, viewport, region) {
  return join(
    repoRoot(),
    "qa-evidence-audit",
    "help-center",
    section,
    slug,
    viewport,
    `${region}.png`
  );
}

function resolvePath(route, baseUrl, studentId) {
  if (route.path === "__PARENT_REPORT__") {
    if (!studentId) throw new Error("parent report requires studentId");
    return `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  if (route.path === "__PARENT_REPORT_DETAILED__") {
    if (!studentId) throw new Error("parent report detailed requires studentId");
    return `/learning/parent-report-detailed?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  return route.path;
}

async function findStudentIdOnParentDashboard(page) {
  const link = page.locator(`a[href*="parent-report"][href*="studentId"]`).first();
  await link.waitFor({ state: "visible", timeout: 30_000 });
  const href = await link.getAttribute("href");
  if (!href) throw new Error("report link missing href on parent dashboard");
  const u = new URL(href, page.url());
  const id = u.searchParams.get("studentId");
  if (!id) throw new Error("studentId not found in report link");
  return id;
}

async function ensureStudentSession(page, context, baseUrl, log) {
  await page.goto(new URL("/student/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await authenticateStudent({
    context,
    page,
    account: DEMO_STUDENT,
    baseUrl,
    mode: "ui",
    log,
  });
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes(EXPECTED_CHILD_NAME)) {
    throw new Error(
      `Demo student login succeeded but expected display name "${EXPECTED_CHILD_NAME}" not visible on student home`
    );
  }
}

async function ensureParentSession(page, context, baseUrl, log) {
  const parents = loadParentAccounts();
  const parent = selectParentAccount(parents, null, null);
  await page.goto(new URL("/parent/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await authenticateParent({ context, page, account: parent, baseUrl, mode: "ui", log });
  await page.waitForURL((url) => url.pathname.includes("/parent/dashboard"), { timeout: 60_000 });
  return findStudentIdOnParentDashboard(page);
}

async function captureUrl(page, baseUrl, path, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const target = new URL(path, baseUrl).toString();
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1500);
  if (path.includes("parent-report")) {
    await page
      .getByRole("heading", { name: /דוח להורים/u })
      .first()
      .waitFor({ state: "visible", timeout: 90_000 })
      .catch(() => {});
    await page.waitForTimeout(1000);
  }
  return target;
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(args.find((a) => a.startsWith("--base-url="))?.slice(11));
  assertAllowedBaseUrl(baseUrl);

  const jobs = loadScreenshotJobs();
  const log = (line) => console.log(`[help-capture] ${line}`);

  const browser = await chromium.launch({ headless: !args.includes("--headed") });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  let studentReady = false;
  let parentReady = false;
  let studentId = null;
  const failures = [];

  /** @type {Map<string, string>} cacheKey -> temp capture path */
  const urlCache = new Map();

  for (const vp of VIEWPORTS) {
    studentReady = false;
    parentReady = false;
    studentId = null;

    for (const job of jobs) {
      const route = routeForJob(job);
      let path;
      try {
        if (route.auth === "student" && !studentReady) {
          await ensureStudentSession(page, context, baseUrl, log);
          studentReady = true;
        }
        if (route.auth === "parent" && !parentReady) {
          studentId = await ensureParentSession(page, context, baseUrl, log);
          parentReady = true;
        }
        path = resolvePath(route, baseUrl, studentId);
      } catch (err) {
        failures.push({ job, error: err.message });
        console.warn(`SKIP ${job.section}/${job.slug}/${job.region}: ${err.message}`);
        continue;
      }

      const cacheKey = `${vp.name}|${path}`;
      const out = auditPath(job.section, job.slug, vp.name, job.region);

      try {
        if (!urlCache.has(cacheKey)) {
          await captureUrl(page, baseUrl, path, vp);
          mkdirSync(join(repoRoot(), "qa-evidence-audit", "help-center", "_cache"), {
            recursive: true,
          });
          const cacheFile = join(
            repoRoot(),
            "qa-evidence-audit",
            "help-center",
            "_cache",
            `${vp.name}-${Buffer.from(path).toString("base64url").slice(0, 40)}.png`
          );
          await page.screenshot({ path: cacheFile, fullPage: true });
          urlCache.set(cacheKey, cacheFile);
        }
        mkdirSync(dirname(out), { recursive: true });
        copyFileSync(urlCache.get(cacheKey), out);
        console.log(`OK ${job.section}/${job.slug}/${vp.name}/${job.region}`);
      } catch (err) {
        failures.push({ job, error: err.message });
        console.warn(`FAIL ${job.section}/${job.slug}/${vp.name}/${job.region}: ${err.message}`);
      }
    }
  }

  await browser.close();

  if (failures.length) {
    console.warn(`\n${failures.length} capture job(s) failed or skipped.`);
  }
  console.log(`Capture complete. Raw files: qa-evidence-audit/help-center/`);
  if (failures.length === jobs.length * VIEWPORTS.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

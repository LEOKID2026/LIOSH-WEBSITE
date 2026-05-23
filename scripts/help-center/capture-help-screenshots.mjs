#!/usr/bin/env node
/**
 * Help Center screenshot capture — element/section shots only (no URL-level reuse).
 * Demo student ADMIN / PIN 1234 · child ישראל ישראלי only.
 */
import {
  mkdirSync,
  unlinkSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import { loadScreenshotJobs, routeForJob } from "./load-capture-jobs.mjs";
import {
  ensureParentPolicyAccepted,
  getParentAccessToken,
  selectHelpParentAccount,
} from "./parent-capture-session.mjs";
import { resolveCaptureTarget } from "./capture-targets.mjs";
import {
  evaluateScreenshotFile,
  MAX_MOBILE_ELEMENT_HEIGHT,
  MAX_TABLET_ELEMENT_HEIGHT,
} from "./capture-quality.mjs";

const DEMO_STUDENT = { label: "help-center-demo", username: "ADMIN", pin: "1234", code: "" };
const EXPECTED_CHILD_NAME = "ישראל ישראלי";
const STALL_MS = 10 * 60 * 1000;
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1366, height: 900 },
];

const HEALTH_ROUTES = [
  "/help",
  "/student/login",
  "/parent/login",
  "/help/parents/parent-dashboard-tour",
];

function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
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

async function devHealthGate(baseUrl, log) {
  const failures = [];
  for (const path of HEALTH_ROUTES) {
    const url = new URL(path, baseUrl).toString();
    let ok = false;
    let lastErr = "";
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
        if (res.status === 200) {
          log(`health OK ${path}`);
          ok = true;
          break;
        }
        lastErr = `status ${res.status}`;
      } catch (err) {
        lastErr = err.message;
      }
      if (attempt < 5) await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ok) {
      failures.push({ path, error: lastErr });
      log(`health FAIL ${path} → ${lastErr}`);
    }
  }
  if (failures.length) {
    const msg = failures.map((f) => `${f.path}:${f.status || f.error}`).join("; ");
    throw new Error(`Dev server health gate failed — capture aborted (${msg})`);
  }
}

async function findStudentIdOnParentDashboard(page, timeoutMs = 30_000) {
  const link = page.locator(`a[href*="parent-report"][href*="studentId"]`).first();
  await link.waitFor({ state: "visible", timeout: timeoutMs });
  const href = await link.getAttribute("href");
  if (!href) throw new Error("report link missing href on parent dashboard");
  const u = new URL(href, page.url());
  const id = u.searchParams.get("studentId");
  if (!id) throw new Error("studentId not found in report link");
  return id;
}

async function resolveDemoStudentIdForCapture({ page, baseUrl, parentAccount, log }) {
  const envId = String(process.env.HELP_DEMO_STUDENT_ID || "").trim();
  if (envId) {
    log("demo studentId from HELP_DEMO_STUDENT_ID");
    return envId;
  }
  try {
    return await findStudentIdOnParentDashboard(page, 8_000);
  } catch {
    log("dashboard report link not visible; resolving via /api/parent/list-students");
  }
  const supabaseUrl = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const anonKey = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("HELP_DEMO_STUDENT_ID unset and Supabase anon env missing for parent API fallback");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const node = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await node.auth.signInWithPassword({
    email: parentAccount.email,
    password: parentAccount.password,
  });
  if (error || !data?.session?.access_token) {
    throw new Error(`parent API fallback sign-in failed: ${error?.message || "no session"}`);
  }
  const res = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(`list-students failed (${res.status}): ${json?.error || "unknown"}`);
  }
  const students = Array.isArray(json.students) ? json.students : [];
  const match =
    students.find((s) => s?.full_name === EXPECTED_CHILD_NAME) ||
    students.find((s) => String(s?.full_name || "").includes("ישראל"));
  if (!match?.id) {
    throw new Error(
      `demo child "${EXPECTED_CHILD_NAME}" not found under parent account (${students.length} students)`
    );
  }
  log(`demo studentId via API: ${match.id}`);
  return match.id;
}

async function assertStudentLoginApiHealthy(baseUrl) {
  const res = await fetch(new URL("/api/student/login", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: DEMO_STUDENT.username, pin: DEMO_STUDENT.pin }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 200) {
    throw new Error(
      `/api/student/login returned ${res.status} — dev server unhealthy; stopping student captures`
    );
  }
}

async function ensureStudentSession(page, context, baseUrl, log) {
  const studentAuthMode =
    String(process.env.HELP_CAPTURE_STUDENT_AUTH || "api").toLowerCase() === "ui" ? "ui" : "api";

  if (studentAuthMode === "ui") {
    const loginRes = await fetch(new URL("/student/login", baseUrl).toString());
    if (loginRes.status !== 200) {
      throw new Error(
        `/student/login returned ${loginRes.status} — dev server unhealthy; stopping (no API fallback on bad server)`
      );
    }
  } else {
    await assertStudentLoginApiHealthy(baseUrl);
  }

  await authenticateStudent({
    context,
    page,
    account: DEMO_STUDENT,
    baseUrl,
    mode: studentAuthMode,
    log,
  });

  await page.goto(new URL("/student/home", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("ישראל")) {
    throw new Error(`Demo student session ok but child name "ישראל" not visible on student home`);
  }
}

async function ensureParentSession(page, context, baseUrl, log) {
  const parent = selectHelpParentAccount();
  const token = await getParentAccessToken(parent);
  await ensureParentPolicyAccepted(baseUrl, token, log);

  const parentAuthMode =
    String(process.env.HELP_CAPTURE_PARENT_AUTH || "token").toLowerCase() === "ui"
      ? "ui"
      : "token";
  await authenticateParent({
    context,
    page,
    account: parent,
    baseUrl,
    mode: parentAuthMode,
    log,
  });
  await page.waitForURL((url) => url.pathname.includes("/parent/dashboard"), { timeout: 60_000 });
  await page
    .locator("h2:has-text('הילדים שלי')")
    .first()
    .waitFor({ state: "visible", timeout: 90_000 })
    .catch(() => {});
  return resolveDemoStudentIdForCapture({ page, baseUrl, parentAccount: parent, log });
}

function sortJobsForCapture(jobs) {
  const authRank = (job) => {
    const auth = routeForJob(job).auth;
    if (auth === "none") return 0;
    if (auth === "parent") return 1;
    return 2;
  };
  const sectionRank = { parents: 0, "parent-report": 1, students: 2, subjects: 3 };
  return [...jobs].sort((a, b) => {
    const d = authRank(a) - authRank(b);
    if (d !== 0) return d;
    const sd = (sectionRank[a.section] ?? 9) - (sectionRank[b.section] ?? 9);
    if (sd !== 0) return sd;
    const ka = `${a.slug}/${a.region}`;
    const kb = `${b.slug}/${b.region}`;
    return ka.localeCompare(kb, "he");
  });
}

function resolveLocator(page, target) {
  let loc = page.locator(target.selector).first();
  const levels = target.ancestorLevels || 0;
  for (let i = 0; i < levels; i++) {
    loc = loc.locator("xpath=..");
  }
  return loc;
}

async function waitForLoadingGone(page, selectors) {
  for (const sel of selectors || []) {
    await page.locator(sel).first().waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  }
}

async function captureElementShot(page, target, viewport, outPath) {
  if (target.prepare) await target.prepare(page);
  const locator = resolveLocator(page, target);
  await locator.waitFor({ state: "visible", timeout: 90_000 });

  const text = (await locator.innerText().catch(() => "")).trim();
  if ((target.minTextLength || 0) > 0 && text.length < target.minTextLength) {
    throw new Error(`target text too short (${text.length} < ${target.minTextLength})`);
  }
  if (target.mustIncludeText && !text.includes(target.mustIncludeText)) {
    throw new Error(`target missing expected text "${target.mustIncludeText}"`);
  }

  const box = await locator.boundingBox();
  if (!box || box.height < 24 || box.width < 40) {
    throw new Error("target bounding box empty or too small");
  }

  await locator.scrollIntoViewIfNeeded();
  await waitForLoadingGone(page, target.hideLoading);
  await page.waitForTimeout(300);

  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) unlinkSync(outPath);

  const maxHeight =
    viewport.name === "mobile"
      ? MAX_MOBILE_ELEMENT_HEIGHT
      : viewport.name === "tablet"
        ? MAX_TABLET_ELEMENT_HEIGHT
        : Math.min(box.height, 12_000);
  const shotHeight = Math.min(box.height, maxHeight);
  if (shotHeight < box.height) {
    await page.screenshot({
      path: outPath,
      animations: "disabled",
      clip: { x: box.x, y: box.y, width: box.width, height: shotHeight },
    });
  } else {
    await locator.screenshot({ path: outPath, animations: "disabled" });
  }

  const quality = evaluateScreenshotFile({ filePath: outPath, viewport: viewport.name });
  if (!quality.ok) {
    unlinkSync(outPath);
    throw new Error(`quality gate: ${quality.reasons.join("; ")}`);
  }
  return quality;
}

function countRawPngs() {
  const root = join(repoRoot(), "qa-evidence-audit", "help-center");
  let n = 0;
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "_cache") continue;
        walk(p);
      } else if (ent.name.endsWith(".png")) {
        n++;
      }
    }
  }
  walk(root);
  return n;
}

function writeProgressReport(payload) {
  const out = join(repoRoot(), "docs", "help-center", "CAPTURE-PROGRESS-REPORT.json");
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[help-capture] progress report → ${out}`);
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(args.find((a) => a.startsWith("--base-url="))?.slice(11));
  assertAllowedBaseUrl(baseUrl);

  const log = (line) => console.log(`[help-capture] ${line}`);
  await devHealthGate(baseUrl, log);

  const resume = args.includes("--resume");
  const auditRoot = join(repoRoot(), "qa-evidence-audit", "help-center");
  if (!resume && existsSync(auditRoot)) {
    rmSync(auditRoot, { recursive: true, force: true });
    log("cleared prior raw screenshots in qa-evidence-audit/help-center");
  }
  mkdirSync(auditRoot, { recursive: true });
  if (resume) log("resume mode: keeping existing raw PNGs where present");

  const jobs = sortJobsForCapture(loadScreenshotJobs());
  const browser = await chromium.launch({ headless: !args.includes("--headed") });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  const stats = {
    ok: 0,
    skipped: [],
    rejected: [],
    startedAt: new Date().toISOString(),
  };

  let studentReady = false;
  let parentReady = false;
  let studentId = null;
  let lastRawCount = countRawPngs();
  let lastProgressAt = Date.now();
  const touchProgress = () => {
    lastProgressAt = Date.now();
    const now = countRawPngs();
    if (now > lastRawCount) lastRawCount = now;
  };

  const checkStall = () => {
    if (Date.now() - lastProgressAt >= STALL_MS) {
      writeProgressReport({
        ...stats,
        stalled: true,
        rawCount: now,
        expectedJobs: jobs.length * VIEWPORTS.length,
        message: "No new raw screenshots for 10 minutes — capture stopped",
        endedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  };

  for (const vp of VIEWPORTS) {
    studentReady = false;
    parentReady = false;
    studentId = null;
    await page.setViewportSize({ width: vp.width, height: vp.height });

    let currentNavKey = null;

    for (const job of jobs) {
      touchProgress();
      if (checkStall()) {
        await browser.close();
        process.exit(2);
      }

      const id = `${job.section}/${job.slug}/${vp.name}/${job.region}`;
      const out = auditPath(job.section, job.slug, vp.name, job.region);

      if (resume && existsSync(out)) {
        const existing = evaluateScreenshotFile({ filePath: out, viewport: vp.name });
        if (existing.ok) {
          stats.ok++;
          console.log(`SKIP-EXISTING ${id} (${existing.size} bytes)`);
          continue;
        }
        unlinkSync(out);
      }

      let jobTarget;
      try {
        jobTarget = resolveCaptureTarget(job, studentId);
      } catch (err) {
        stats.skipped.push({ job: id, reason: err.message });
        console.warn(`SKIP ${id}: ${err.message}`);
        continue;
      }

      const navKey = `${vp.name}|${jobTarget.auth}|${jobTarget.path}`;

      if (navKey !== currentNavKey) {
        try {
          if (jobTarget.auth === "student" && !studentReady) {
            try {
              await ensureStudentSession(page, context, baseUrl, log);
              studentReady = true;
            } catch (err) {
              log(`student session aborted: ${err.message}`);
              throw err;
            }
          }
          if (jobTarget.auth === "parent" && !parentReady) {
            studentId = await ensureParentSession(page, context, baseUrl, log);
            parentReady = true;
          }
          if (jobTarget.auth === "parent") {
            jobTarget = resolveCaptureTarget(job, studentId);
          }

          const url = new URL(jobTarget.path, baseUrl).toString();
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
          if (jobTarget.afterGoto) await jobTarget.afterGoto(page);
          await waitForLoadingGone(page, jobTarget.hideLoading);
          currentNavKey = `${vp.name}|${jobTarget.auth}|${jobTarget.path}`;
        } catch (err) {
          stats.skipped.push({ job: id, reason: `navigation/auth: ${err.message}` });
          console.warn(`SKIP ${id}: ${err.message}`);
          currentNavKey = null;
          continue;
        }
      }

      try {
        await captureElementShot(page, jobTarget, vp, out);
        stats.ok++;
        touchProgress();
        console.log(`OK ${id} (${statSync(out).size} bytes)`);
      } catch (err) {
        stats.rejected.push({ job: id, reason: err.message });
        touchProgress();
        console.warn(`FAIL ${id}: ${err.message}`);
      }
    }
  }

  await browser.close();

  const rawCount = countRawPngs();
  writeProgressReport({
    ...stats,
    rawCount,
    expectedJobs: jobs.length * VIEWPORTS.length,
    endedAt: new Date().toISOString(),
  });

  const expected = jobs.length * VIEWPORTS.length;
  console.log(
    `\nCapture finished. OK=${stats.ok}/${expected} skipped=${stats.skipped.length} rejected=${stats.rejected.length} rawPngs=${rawCount}`
  );

  if (stats.ok === 0 || stats.ok < expected) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

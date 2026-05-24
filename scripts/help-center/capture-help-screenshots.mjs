#!/usr/bin/env node
/**
 * Help Center staged screenshot capture — element shots only, batches A–D.
 */
import {
  mkdirSync,
  unlinkSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import {
  loadScreenshotJobs,
  routeForJob,
  filterJobsForBatch,
  parseJobId,
  jobMatchesParsed,
} from "./load-capture-jobs.mjs";
import {
  ensureParentPolicyAccepted,
  getParentAccessToken,
  selectHelpParentAccount,
} from "./parent-capture-session.mjs";
import { resolveCaptureTarget } from "./capture-targets.mjs";
import {
  evaluateScreenshotFile,
  MAX_MOBILE_ELEMENT_HEIGHT,
  MAX_DESKTOP_ELEMENT_HEIGHT,
  MAX_TABLET_ELEMENT_HEIGHT,
} from "./capture-quality.mjs";
import {
  jobKey,
  loadCaptureState,
  saveCaptureState,
  checkDuplicateHash,
  recordCapture,
} from "./capture-state.mjs";
import { RECAPTURE_JOB_KEYS } from "./recapture-visual-fix-jobs.mjs";

const DEMO_STUDENT = { label: "help-center-demo", username: "ADMIN", pin: "1234", code: "" };
const EXPECTED_CHILD_NAME = "ישראל ישראלי";
const STALL_MS = 10 * 60 * 1000;
const SELECTOR_TIMEOUT_MS = 60_000;
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

function manifestPath() {
  return join(repoRoot(), "data", "help-center", "screenshots-manifest.json");
}

function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture: disallowed base URL ${baseUrl}`);
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
    if (!ok) failures.push({ path, error: lastErr });
  }
  if (failures.length) {
    throw new Error(
      `Dev server health gate failed — ${failures.map((f) => `${f.path}:${f.error}`).join("; ")}`
    );
  }
}

async function verifyDemoStudentLoginPayload(baseUrl) {
  const res = await fetch(new URL("/api/student/login", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: DEMO_STUDENT.username, pin: DEMO_STUDENT.pin }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 200) {
    throw new Error(`/api/student/login returned ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  const name = String(json?.student?.full_name || json?.full_name || "");
  if (!name.includes("ישראל")) {
    throw new Error(
      `Demo student login ok but full_name missing "ישראל" (got: ${name || "(empty)"})`
    );
  }
  return json;
}

async function findStudentIdOnParentDashboard(page, timeoutMs = 30_000) {
  const link = page.locator(`a[href*="parent-report"][href*="studentId"]`).first();
  await link.waitFor({ state: "visible", timeout: timeoutMs });
  const href = await link.getAttribute("href");
  const u = new URL(href, page.url());
  const id = u.searchParams.get("studentId");
  if (!id) throw new Error("studentId not found in report link");
  return id;
}

async function resolveDemoStudentIdForCapture({ page, baseUrl, parentAccount, log }) {
  const envId = String(process.env.HELP_DEMO_STUDENT_ID || "").trim();
  if (envId) return envId;
  try {
    return await findStudentIdOnParentDashboard(page, 8_000);
  } catch {
    log("resolving demo child via /api/parent/list-students");
  }
  const token = await getParentAccessToken(parentAccount);
  const res = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(`list-students failed (${res.status})`);
  }
  const students = Array.isArray(json.students) ? json.students : [];
  const match =
    students.find((s) => s?.full_name === EXPECTED_CHILD_NAME) ||
    students.find((s) => String(s?.full_name || "").includes("ישראל"));
  if (!match?.id) throw new Error(`demo child not found (${students.length} students)`);
  log(`demo studentId: ${match.id}`);
  return match.id;
}

async function ensureStudentSession(context, baseUrl, log) {
  await verifyDemoStudentLoginPayload(baseUrl);
  const preferUi =
    String(process.env.HELP_CAPTURE_STUDENT_AUTH || "api").toLowerCase() === "ui";
  const page = await context.newPage();
  const authArgs = { context, page, account: DEMO_STUDENT, baseUrl, log };

  if (preferUi) {
    try {
      await authenticateStudent({ ...authArgs, mode: "ui" });
    } catch (err) {
      log(`student-auth(ui) failed (${err.message}), falling back to api`);
      await authenticateStudent({ ...authArgs, mode: "api" });
    }
  } else {
    await authenticateStudent({ ...authArgs, mode: "api" });
  }

  await page.goto(new URL("/student/home", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(800);
  await page.close();
}

async function ensureParentSession(page, context, baseUrl, log) {
  const parent = selectHelpParentAccount();
  const token = await getParentAccessToken(parent);
  await ensureParentPolicyAccepted(baseUrl, token, log);
  const parentAuthMode =
    String(process.env.HELP_CAPTURE_PARENT_AUTH || "token").toLowerCase() === "ui"
      ? "ui"
      : "token";
  await authenticateParent({ context, page, account: parent, baseUrl, mode: parentAuthMode, log });
  await page.waitForURL((url) => url.pathname.includes("/parent/dashboard"), { timeout: 60_000 });
  await page
    .locator("section:has(h2:has-text('הילדים שלי'))")
    .first()
    .waitFor({ state: "visible", timeout: SELECTOR_TIMEOUT_MS })
    .catch(() => {});
  return resolveDemoStudentIdForCapture({ page, baseUrl, parentAccount: parent, log });
}

function parentPathRank(path) {
  if (path === "/parent/dashboard") return 0;
  if (path === "/parent/rewards") return 1;
  if (path === "__PARENT_REPORT__") return 2;
  if (path === "__PARENT_REPORT_DETAILED__") return 3;
  return 4;
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
    const pr =
      parentPathRank(routeForJob(a).path) - parentPathRank(routeForJob(b).path);
    if (pr !== 0) return pr;
    return `${a.slug}/${a.region}`.localeCompare(`${b.slug}/${b.region}`, "he");
  });
}

function resolveLocator(page, target) {
  let loc = page.locator(target.selector).filter({ visible: true }).first();
  for (let i = 0; i < (target.ancestorLevels || 0); i++) {
    loc = loc.locator("xpath=..");
  }
  return loc;
}

async function waitForLoadingGone(page, selectors) {
  for (const sel of selectors || []) {
    await page.locator(sel).first().waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  }
}

function assertNotErrorPage(page) {
  const path = new URL(page.url()).pathname;
  if (path.includes("/login") && !path.includes("/student/login") && !path.includes("/parent/login")) {
    throw new Error(`unexpected login redirect: ${path}`);
  }
  if (path.includes("/error")) throw new Error(`landed on error page: ${path}`);
}

async function captureElementShot(page, target, viewport, outPath, captureState, stateKey, batch) {
  if (target.prepare) await target.prepare(page);
  const locator = resolveLocator(page, target);
  await locator.waitFor({ state: "attached", timeout: SELECTOR_TIMEOUT_MS });
  let visible = await locator.isVisible().catch(() => false);
  if (!visible) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    visible = await locator.isVisible().catch(() => false);
  }
  if (!visible && !target.allowAttachedOnly) {
    throw new Error("target selector attached but not visible");
  }

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
        : MAX_DESKTOP_ELEMENT_HEIGHT;
  let shotHeight = Math.min(box.height, maxHeight);
  if (viewport.name === "desktop" && target.capDesktopClipHeight) {
    shotHeight = Math.min(shotHeight, target.capDesktopClipHeight);
  }
  const expandClipTo =
    target.expandMobileClipTo || target.expandTabletClipTo || target.expandDesktopClipTo;
  if (expandClipTo && shotHeight < expandClipTo) {
    shotHeight = Math.min(expandClipTo, maxHeight);
  }
  const useClip =
    viewport.name === "mobile" ||
    viewport.name === "tablet" ||
    (viewport.name === "desktop" && box.height > shotHeight);

  const needsPageClip = useClip && box.height > shotHeight + 4;

  if (needsPageClip) {
    let clipX = Math.max(0, box.x);
    let clipW = Math.ceil(box.width);
    if (target.minDesktopClipWidth && viewport.name === "desktop" && clipW < target.minDesktopClipWidth) {
      clipW = target.minDesktopClipWidth;
      clipX = Math.max(0, box.x + box.width / 2 - clipW / 2);
    }
    await page.screenshot({
      path: outPath,
      animations: "disabled",
      clip: {
        x: clipX,
        y: Math.max(0, box.y),
        width: clipW,
        height: shotHeight,
      },
    });
  } else if (useClip) {
    await locator.screenshot({
      path: outPath,
      animations: "disabled",
      clip: {
        x: 0,
        y: 0,
        width: Math.max(40, box.width),
        height: shotHeight,
      },
    });
  } else {
    await locator.screenshot({ path: outPath, animations: "disabled" });
  }

  const quality = evaluateScreenshotFile({ filePath: outPath, viewport: viewport.name });
  if (!quality.ok) {
    unlinkSync(outPath);
    throw new Error(`quality gate: ${quality.reasons.join("; ")}`);
  }

  const dup = checkDuplicateHash(captureState, stateKey, quality.sha256);
  if (dup) {
    unlinkSync(outPath);
    throw new Error(`duplicate content hash (same as ${dup})`);
  }

  recordCapture(captureState, stateKey, { sha256: quality.sha256, batch, filePath: outPath });
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
        if (ent.name.startsWith("_")) continue;
        walk(p);
      } else if (ent.name.endsWith(".png")) n++;
    }
  }
  walk(root);
  return n;
}

function writeBatchProgress(batch, payload) {
  const out = join(repoRoot(), "docs", "help-center", `CAPTURE-PROGRESS-${batch}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[help-capture] batch ${batch} report → ${out}`);
}

function loadOnlyFailedJobs(batch) {
  const path = join(repoRoot(), "docs", "help-center", `CAPTURE-PROGRESS-${batch}.json`);
  if (!existsSync(path)) return null;
  const doc = JSON.parse(readFileSync(path, "utf8"));
  const ids = new Set();
  for (const e of [...(doc.skipped || []), ...(doc.rejected || [])]) {
    if (e.job) ids.add(e.job);
  }
  return ids;
}

function listManifestGaps() {
  const manifest = JSON.parse(readFileSync(manifestPath(), "utf8"));
  const missing = [];
  for (const rel of manifest.publicPaths || []) {
    const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
    const disk = join(repoRoot(), "qa-evidence-audit", "help-center", ...parts);
    if (!existsSync(disk)) {
      missing.push({ rel, reason: "missing raw file" });
      continue;
    }
    const vp = parts[parts.length - 2];
    const q = evaluateScreenshotFile({ filePath: disk, viewport: vp });
    if (!q.ok) missing.push({ rel, reason: q.reasons.join("; ") });
  }
  return { required: manifest.publicPaths.length, missing };
}

function writeBlockerReport(missing) {
  const out = join(repoRoot(), "docs", "help-center", "CAPTURE-BLOCKER-REPORT.json");
  const payload = {
    blockedAt: new Date().toISOString(),
    requiredCount: missing.required,
    missingCount: missing.missing.length,
    missing: missing.missing,
    message:
      "Automated capture incomplete. Do not publish. Manual evidence requires separate owner approval.",
  };
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[help-capture] blocker report → ${out}`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const recaptureVisualFix = args.includes("--recapture-visual-fix");
  const batchArg = args.find((a) => a.startsWith("--batch="));
  const batch = batchArg
    ? batchArg.slice(8).toUpperCase()
    : recaptureVisualFix
      ? "VISUAL-FIX"
      : null;
  if (!batch || (!recaptureVisualFix && !["A", "B", "C", "D"].includes(batch))) {
    throw new Error("Required: --batch=A|B|C|D or --recapture-visual-fix");
  }
  const onlyKeysArg = args.find((a) => a.startsWith("--only-keys="));
  const onlyKeys = onlyKeysArg
    ? new Set(
        onlyKeysArg
          .slice(12)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;
  return {
    batch,
    recaptureVisualFix,
    onlyKeys,
    baseUrl: resolveBaseUrl(args.find((a) => a.startsWith("--base-url="))?.slice(11)),
    reset: args.includes("--reset"),
    onlyFailed: args.includes("--only-failed"),
    headed: args.includes("--headed"),
  };
}

async function runBatch({ batch, baseUrl, reset, onlyFailed, headed, recaptureVisualFix, onlyKeys }) {
  const log = (line) => console.log(`[help-capture:${batch}] ${line}`);
  assertAllowedBaseUrl(baseUrl);
  await devHealthGate(baseUrl, log);

  const auditRoot = join(repoRoot(), "qa-evidence-audit", "help-center");
  if (reset && existsSync(auditRoot)) {
    rmSync(auditRoot, { recursive: true, force: true });
    log("reset: cleared qa-evidence-audit/help-center");
  }
  mkdirSync(auditRoot, { recursive: true });

  const recaptureKeys = new Set(RECAPTURE_JOB_KEYS);
  let jobs = recaptureVisualFix
    ? sortJobsForCapture(
        loadScreenshotJobs().filter((job) =>
          recaptureKeys.has(`${job.section}/${job.slug}/${job.region}`)
        )
      )
    : sortJobsForCapture(filterJobsForBatch(loadScreenshotJobs(), batch));

  if (recaptureVisualFix && onlyKeys?.size) {
    jobs = jobs.filter((job) => onlyKeys.has(`${job.section}/${job.slug}/${job.region}`));
  }

  if (recaptureVisualFix) {
    log(`recapture-visual-fix: ${jobs.length} logical job(s), ${jobs.length * VIEWPORTS.length} shots`);
  }

  if (onlyFailed) {
    const failedIds = loadOnlyFailedJobs(batch);
    if (!failedIds?.size) {
      log("no failed jobs in prior batch report — nothing to retry");
      return { ok: 0, expected: 0, exitCode: 0 };
    }
    const parsedList = [...failedIds].map(parseJobId).filter(Boolean);
    jobs = jobs.filter((job) =>
      parsedList.some((p) => jobMatchesParsed(job, p))
    );
    log(`only-failed: ${jobs.length} job(s) to retry`);
  }

  const expected = jobs.length * VIEWPORTS.length;
  if (expected === 0) {
    log("no jobs for this batch");
    return { ok: 0, expected: 0, exitCode: 0 };
  }

  const captureState = loadCaptureState();
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  const stats = {
    batch,
    ok: 0,
    skipped: [],
    rejected: [],
    startedAt: new Date().toISOString(),
    expectedJobs: expected,
  };

  let studentReady = false;
  let parentReady = false;
  let studentId = null;
  let lastProgressAt = Date.now();
  const touchProgress = () => {
    lastProgressAt = Date.now();
  };

  const checkStall = () => {
    if (Date.now() - lastProgressAt >= STALL_MS) {
      stats.stalled = true;
      stats.endedAt = new Date().toISOString();
      stats.rawCount = countRawPngs();
      writeBatchProgress(batch, stats);
      return true;
    }
    return false;
  };

  for (const vp of VIEWPORTS) {
    parentReady = false;
    studentReady = false;
    studentId = null;
    await page.setViewportSize({ width: vp.width, height: vp.height });
    let currentNavKey = null;

    for (const job of jobs) {
      touchProgress();
      if (checkStall()) {
        await browser.close();
        saveCaptureState(captureState);
        return { ok: stats.ok, expected, exitCode: 2 };
      }

      const id = `${job.section}/${job.slug}/${vp.name}/${job.region}`;
      const out = auditPath(job.section, job.slug, vp.name, job.region);
      const stateKey = jobKey({ ...job, viewport: vp.name });

      if (existsSync(out)) {
        const existing = evaluateScreenshotFile({ filePath: out, viewport: vp.name });
        if (existing.ok) {
          const dup = checkDuplicateHash(captureState, stateKey, existing.sha256);
          if (!dup) {
            recordCapture(captureState, stateKey, {
              sha256: existing.sha256,
              batch,
              filePath: out,
            });
            stats.ok++;
            console.log(`SKIP-EXISTING ${id} (${existing.size} bytes)`);
            continue;
          }
          unlinkSync(out);
        } else if (existsSync(out)) {
          unlinkSync(out);
        }
      }

      const route = routeForJob(job);
      try {
        if (route.auth === "student" && !studentReady) {
          await ensureStudentSession(context, baseUrl, log);
          studentReady = true;
        }
        if (route.auth === "parent" && !parentReady) {
          studentId = await ensureParentSession(page, context, baseUrl, log);
          parentReady = true;
        }
      } catch (err) {
        stats.skipped.push({ job: id, reason: `navigation/auth: ${err.message}` });
        touchProgress();
        console.warn(`SKIP ${id}: ${err.message}`);
        continue;
      }

      let jobTarget;
      try {
        jobTarget = resolveCaptureTarget(job, studentId, vp.name);
      } catch (err) {
        stats.skipped.push({ job: id, reason: err.message });
        touchProgress();
        console.warn(`SKIP ${id}: ${err.message}`);
        continue;
      }

      const navKey = `${vp.name}|${jobTarget.auth}|${jobTarget.path}`;

      if (navKey !== currentNavKey) {
        try {
          if (jobTarget.beforeGoto) await jobTarget.beforeGoto(page);
          const waitUntil =
            jobTarget.path === "/offline" ? "commit" : "domcontentloaded";
          await page.goto(new URL(jobTarget.path, baseUrl).toString(), {
            waitUntil,
            timeout: 90_000,
          });
          assertNotErrorPage(page);
          if (jobTarget.afterGoto) await jobTarget.afterGoto(page);
          await waitForLoadingGone(page, jobTarget.hideLoading);
          currentNavKey = navKey;
        } catch (err) {
          stats.skipped.push({ job: id, reason: `navigation/auth: ${err.message}` });
          touchProgress();
          console.warn(`SKIP ${id}: ${err.message}`);
          currentNavKey = null;
          continue;
        }
      }

      try {
        await captureElementShot(page, jobTarget, vp, out, captureState, stateKey, batch);
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
  saveCaptureState(captureState);

  stats.rawCount = countRawPngs();
  stats.endedAt = new Date().toISOString();
  writeBatchProgress(batch, stats);

  console.log(
    `\nBatch ${batch} finished. OK=${stats.ok}/${expected} skipped=${stats.skipped.length} rejected=${stats.rejected.length}`
  );

  const exitCode = stats.ok >= expected ? 0 : 1;
  return { ok: stats.ok, expected, exitCode };
}

async function main() {
  const opts = parseArgs(process.argv);
  const result = await runBatch(opts);
  if (result.exitCode !== 0) process.exit(result.exitCode);

  const gaps = listManifestGaps();
  if (gaps.missing.length > 0) {
    console.log(
      `[help-capture] manifest gaps: ${gaps.missing.length}/${gaps.required} (batch ${opts.batch} ok; run other batches or retry-failed)`
    );
  } else {
    console.log(`[help-capture] all ${gaps.required} manifest raws present and pass inline quality`);
  }
}

const isMain = process.argv.some(
  (a) => a.startsWith("--batch=") || a === "--recapture-visual-fix"
);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { runBatch, listManifestGaps, writeBlockerReport };

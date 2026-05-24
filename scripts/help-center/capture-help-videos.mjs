#!/usr/bin/env node
/**
 * Help Center tutorial video capture — ADMIN / 1234, dual viewport per article.
 * localhost / 127.0.0.1 / *.vercel.app only.
 */
import {
  mkdirSync,
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import {
  ensureParentPolicyAccepted,
  getParentAccessToken,
  selectHelpParentAccount,
} from "./parent-capture-session.mjs";
import { resolveVideoPath } from "./video-routes.mjs";
import {
  installCursorOverlay,
  moveCursor,
  clickAt,
} from "./lib/cursor-overlay.mjs";

const DEMO_STUDENT = { label: "help-center-demo", username: "ADMIN", pin: "1234", code: "" };
const EXPECTED_CHILD_NAME = "ישראל ישראלי";
const VIEWPORTS = {
  desktop: { width: 1366, height: 900, mobile: false },
  mobile: { width: 390, height: 844, mobile: true },
};
const MOBILE_UA = devices["iPhone 13"].userAgent;

function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function manifestPath() {
  return join(repoRoot(), "data", "help-center", "videos-manifest.json");
}

function auditDir(section, slug, viewport) {
  return join(
    repoRoot(),
    "qa-evidence-audit",
    "help-center",
    "videos",
    section,
    slug,
    viewport
  );
}

function auditWebmPath(section, slug, viewport) {
  return join(auditDir(section, slug, viewport), "main.webm");
}

function auditPosterPath(section, slug, viewport) {
  return join(auditDir(section, slug, viewport), "main.jpg");
}

function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture: disallowed base URL ${baseUrl}`);
  }
}

async function findStudentIdOnParentDashboard(page) {
  const link = page.locator(`a[href*="parent-report"][href*="studentId"]`).first();
  await link.waitFor({ state: "visible", timeout: 30_000 });
  const href = await link.getAttribute("href");
  const u = new URL(href, page.url());
  const id = u.searchParams.get("studentId");
  if (!id) throw new Error("studentId not found in report link");
  return id;
}

async function resolveDemoStudentId(page, baseUrl, parentAccount, log) {
  const envId = String(process.env.HELP_DEMO_STUDENT_ID || "").trim();
  if (envId) return envId;
  try {
    return await findStudentIdOnParentDashboard(page);
  } catch {
    log("resolving demo child via list-students API");
  }
  const token = await getParentAccessToken(parentAccount);
  const res = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  const students = Array.isArray(json.students) ? json.students : [];
  const match =
    students.find((s) => s?.full_name === EXPECTED_CHILD_NAME) ||
    students.find((s) => String(s?.full_name || "").includes("ישראל"));
  if (!match?.id) throw new Error("demo child not found");
  return match.id;
}

async function runSteps(page, steps, { mobile }) {
  for (const step of steps) {
    if (step.type === "pause") {
      await page.waitForTimeout(step.ms || 500);
      continue;
    }
    if (step.type === "scroll") {
      await page.evaluate((y) => window.scrollBy(0, y), step.y || 200);
      await page.waitForTimeout(400);
      continue;
    }
    if (step.type === "click" && step.selector) {
      const loc = page.locator(step.selector).first();
      const box = await loc.boundingBox().catch(() => null);
      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await clickAt(page, x, y, { mobile });
      } else {
        await loc.click({ timeout: 10_000 }).catch(() => {});
      }
      continue;
    }
    if (step.type === "highlight" && step.selector) {
      await page
        .locator(step.selector)
        .first()
        .evaluate((el) => {
          el.style.outline = "3px solid rgba(251, 191, 36, 0.9)";
        })
        .catch(() => {});
      await page.waitForTimeout(800);
    }
  }
}

async function captureOneViewport({
  browser,
  entry,
  viewportName,
  baseUrl,
  studentId,
  log,
  parentAccount,
  shared,
}) {
  const vp = VIEWPORTS[viewportName];
  const outWebm = auditWebmPath(entry.section, entry.slug, viewportName);
  const outPoster = auditPosterPath(entry.section, entry.slug, viewportName);
  mkdirSync(dirname(outWebm), { recursive: true });

  if (existsSync(outWebm) && statSync(outWebm).size > 4096) {
    log(`SKIP existing ${entry.id} ${viewportName}`);
    return { ok: true, skipped: true };
  }

  const recordDir = join(auditDir(entry.section, entry.slug, viewportName), "_record");
  mkdirSync(recordDir, { recursive: true });

  const contextOptions = {
    viewport: { width: vp.width, height: vp.height },
    recordVideo: { dir: recordDir, size: { width: vp.width, height: vp.height } },
    locale: "he-IL",
  };
  if (vp.mobile) {
    contextOptions.isMobile = true;
    contextOptions.hasTouch = true;
    contextOptions.userAgent = MOBILE_UA;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: vp.mobile });

  const path = resolveVideoPath(entry.route, studentId);
  const url = new URL(path, baseUrl).toString();

  try {
    if (entry.auth === "student") {
      if (!shared.studentReady) {
        await authenticateStudent({
          context,
          page,
          account: DEMO_STUDENT,
          baseUrl,
          mode: "api",
          log,
        });
        shared.studentReady = true;
      }
    } else if (entry.auth === "parent") {
      if (!shared.parentReady) {
        const token = await getParentAccessToken(parentAccount);
        await ensureParentPolicyAccepted(baseUrl, token, log);
        await authenticateParent({
          context,
          page,
          account: parentAccount,
          baseUrl,
          mode: "token",
          log,
        });
        shared.parentReady = true;
        shared.studentId = await resolveDemoStudentId(page, baseUrl, parentAccount, log);
        studentId = shared.studentId;
      }
    }

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1500);

    if (entry.auth === "student") {
      const body = await page.locator("body").innerText();
      if (!body.includes("ישראל") && entry.slug !== "student-login") {
        log(`warn: expected demo name not visible on ${entry.slug}`);
      }
    }

    const steps = entry.captureSteps[viewportName] || [];
    await runSteps(page, steps, { mobile: vp.mobile });

    await page.waitForTimeout(800);
    await page.screenshot({ path: outPoster, type: "jpeg", quality: 82 });
  } finally {
    await context.close();
  }

  const webms = readdirSync(recordDir).filter((f) => f.endsWith(".webm"));
  if (!webms.length) {
    throw new Error("no webm produced by Playwright recorder");
  }
  const latest = webms
    .map((f) => ({ f, m: statSync(join(recordDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0].f;
  const src = join(recordDir, latest.f);
  if (existsSync(outWebm)) unlinkSync(outWebm);
  copyFileSync(src, outWebm);

  return { ok: true, skipped: false };
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(args.find((a) => a.startsWith("--base-url="))?.slice(11));
  const headed = args.includes("--headed");
  const onlySlug = args.find((a) => a.startsWith("--slug="))?.slice(7);
  const log = (msg) => console.log(`[help-videos] ${msg}`);

  assertAllowedBaseUrl(baseUrl);
  const manifest = JSON.parse(readFileSync(manifestPath(), "utf8"));
  let entries = manifest.videos || [];
  if (onlySlug) {
    entries = entries.filter((e) => e.slug === onlySlug);
  }

  log(`baseUrl=${baseUrl} entries=${entries.length}`);
  const browser = await chromium.launch({ headless: !headed });
  const parentAccount = selectHelpParentAccount();
  const shared = { studentReady: false, parentReady: false, studentId: null };
  const stats = { ok: 0, fail: 0, skipped: 0 };

  for (const entry of entries) {
    let studentId = shared.studentId;
    for (const viewportName of ["desktop", "mobile"]) {
      const id = `${entry.id} ${viewportName}`;
      try {
        const result = await captureOneViewport({
          browser,
          entry,
          viewportName,
          baseUrl,
          studentId,
          log,
          parentAccount,
          shared,
        });
        if (result.skipped) stats.skipped++;
        else stats.ok++;
        log(`OK ${id}`);
      } catch (err) {
        stats.fail++;
        console.warn(`FAIL ${id}: ${err.message}`);
      }
    }
  }

  await browser.close();
  console.log(
    `\nCapture done. ok=${stats.ok} skipped=${stats.skipped} fail=${stats.fail} (target ${entries.length * 2} clips)`
  );
  if (stats.fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

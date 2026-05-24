#!/usr/bin/env node
/**
 * Parent workflow video pilot — «מדריך להורה — כניסה לדוח ושימוש ב-AI»
 * Requires successful preflight. Output: qa-evidence-audit/parent-video-pilot/.../main.webm
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  statSync,
  existsSync,
  unlinkSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { installCursorOverlay, moveCursor, clickAt } from "../help-center/lib/cursor-overlay.mjs";
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import {
  selectHelpParentAccount,
  getParentAccessToken,
  ensureParentPolicyAccepted,
} from "../help-center/parent-capture-session.mjs";
import {
  SCENES,
  DEMO_CHILD_NAME,
  DEMO_QUESTION,
  VIEWPORT,
  FPS,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  outWebm,
  outDir,
  framesDir,
  metaPath,
  OVERLAY_CSS,
} from "./shared.mjs";

const require = createRequire(import.meta.url);

let frameIndex = 0;
let demoStudentId = null;
let parentToken = null;

function resolveFfmpegSync() {
  try {
    const p = require("@ffmpeg-installer/ffmpeg").path;
    if (p && existsSync(p)) return p;
  } catch {
    /* optional */
  }
  const w = spawnSync("where", ["ffmpeg"], { encoding: "utf8", shell: true });
  if (w.status === 0 && w.stdout.trim()) return w.stdout.trim().split(/\r?\n/)[0];
  return null;
}

function encodeFramesToWebm(ffmpegPath, frameCount) {
  const pattern = join(framesDir, "frame_%05d.png").replace(/\\/g, "/");
  const out = outWebm.replace(/\\/g, "/");
  const args = [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-frames:v",
    String(frameCount),
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "1.4M",
    "-deadline",
    "realtime",
    "-auto-alt-ref",
    "0",
    out,
  ];
  const r = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr || r.stdout}`);
}

function ffprobeDuration(ffmpegPath, file) {
  let ffprobe;
  try {
    ffprobe = require("@ffprobe-installer/ffprobe").path;
  } catch {
    ffprobe = ffmpegPath.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  }
  if (!ffprobe || !existsSync(ffprobe)) return null;
  const r = spawnSync(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" }
  );
  return r.status === 0 ? parseFloat(r.stdout.trim()) : null;
}

function hashFile(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

async function installOverlays(page) {
  await page.evaluate((css) => {
    if (!document.getElementById("parent-pilot-style")) {
      const s = document.createElement("style");
      s.id = "parent-pilot-style";
      s.textContent = css;
      document.head.appendChild(s);
    }
    if (document.getElementById("parent-pilot-capture-root")) return;
    const el = document.createElement("div");
    el.id = "parent-pilot-capture-root";
    el.innerHTML =
      '<div id="parent-pilot-dim"></div><div id="parent-pilot-highlight"></div><div id="parent-pilot-caption"></div>';
    document.body.appendChild(el);
  }, OVERLAY_CSS);
}

async function setOverlay(page, { caption, highlightKey }) {
  await page.evaluate(
    ({ caption, highlightKey }) => {
      const cap = document.getElementById("parent-pilot-caption");
      const hl = document.getElementById("parent-pilot-highlight");
      const dim = document.getElementById("parent-pilot-dim");
      if (cap) cap.textContent = caption || "";
      const hide = () => {
        hl?.classList.remove("visible");
        dim?.classList.remove("active");
      };
      if (!highlightKey) {
        hide();
        return;
      }
      let el = null;
      switch (highlightKey) {
        case "login-form":
          el = document.querySelector("form");
          break;
        case "login-email":
          el = document.querySelector('input[type="email"]');
          break;
        case "login-submit":
          el = document.querySelector('form button[type="submit"]');
          break;
        case "children-section":
          el = document.querySelector("h2")?.closest("section") || document.querySelector("h2");
          break;
        case "demo-child":
          el = [...document.querySelectorAll("div.rounded.border")].find((d) =>
            d.innerText?.includes("ישראל ישראלי")
          );
          break;
        case "report-link":
          el = [...document.querySelectorAll("div.rounded.border")]
            .find((d) => d.innerText?.includes("ישראל ישראלי"))
            ?.querySelector('a[href*="parent-report"]');
          break;
        case "short-header":
          el = document.querySelector("h1, h2");
          break;
        case "short-summary":
          el =
            document.querySelector(".parent-report-print-summary-card")?.parentElement ||
            document.querySelector('[class*="grid"]');
          break;
        case "detailed-link":
          el = [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("דוח מקיף"));
          break;
        case "detailed-header":
          el = document.querySelector("h1, h2");
          break;
        case "detailed-section":
          el = [...document.querySelectorAll("h2")].find((h) =>
            h.textContent?.includes("סיכום לתקופה")
          )?.closest("section");
          break;
        case "copilot-panel":
          el = [...document.querySelectorAll("div")].find((d) =>
            d.innerText?.startsWith("שאלו על הדוח")
          );
          break;
        case "copilot-input":
          el = document.querySelector('input[placeholder*="שאלה על הדוח"]');
          break;
        case "copilot-answer":
          el = [...document.querySelectorAll("div")].find((d) =>
            d.innerText?.startsWith("שאלו על הדוח")
          );
          break;
        default:
          el = null;
      }
      if (!el || !hl) {
        hide();
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 6;
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.classList.add("visible");
      dim?.classList.add("active");
    },
    { caption, highlightKey }
  );
}

async function captureFrame(page) {
  const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
  frameIndex++;
  await page.screenshot({ path: join(framesDir, name), type: "png", animations: "disabled" });
}

async function holdScene(page, scene, cursor) {
  await setOverlay(page, { caption: scene.caption, highlightKey: scene.highlight });
  if (cursor) await moveCursor(page, cursor.x, cursor.y);
  const frameTarget = Math.max(1, Math.round((scene.holdMs / 1000) * FPS));
  for (let tick = 0; tick < frameTarget; tick++) {
    if (cursor && tick % 4 === 0) {
      await moveCursor(
        page,
        cursor.x + Math.sin(tick * 0.2) * 4,
        cursor.y + Math.cos(tick * 0.15) * 3
      );
    }
    await captureFrame(page);
    if (tick < frameTarget - 1) await page.waitForTimeout(40);
  }
}

async function centerOf(page, highlightKey) {
  return page.evaluate((key) => {
    const pick = (k) => {
      switch (k) {
        case "login-submit":
          return document.querySelector('form button[type="submit"]');
        case "report-link":
          return [...document.querySelectorAll("div.rounded.border")]
            .find((d) => d.innerText?.includes("ישראל ישראלי"))
            ?.querySelector('a[href*="parent-report"]');
        case "detailed-link":
          return [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("דוח מקיף"));
        case "copilot-input":
          return document.querySelector('input[placeholder*="שאלה על הדוח"]');
        default:
          return null;
      }
    };
    const el = pick(key);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, highlightKey);
}

async function waitShortReport(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("שאלות") && /\d+/.test(t) && !t.includes("טוען את הדוח");
    },
    undefined,
    { timeout: 90_000 }
  );
}

async function waitDetailedReport(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return (t.includes("סיכום") || t.includes("מקצוע")) && t.includes("שאלו על הדוח");
    },
    undefined,
    { timeout: 90_000 }
  );
}

async function runSceneAction(page, scene, parent, baseUrl) {
  switch (scene.action) {
    case "login": {
      await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
      const email = page.getByPlaceholder("אימייל הורה");
      await email.waitFor({ state: "visible", timeout: 20_000 });
      await email.fill(parent.email);
      await page.getByPlaceholder("סיסמה").fill(parent.password);
      const pos = await centerOf(page, "login-submit");
      if (pos) await clickAt(page, pos.x, pos.y);
      else await page.locator('form button[type="submit"]').click();
      await page.waitForURL("**/parent/dashboard**", { timeout: 60_000 });
      return { landed: "dashboard" };
    }
    case "open-short-report": {
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
      await card.scrollIntoViewIfNeeded();
      const link = card.locator('a:has-text("דוח הורים")');
      const href = await link.getAttribute("href");
      const url = new URL(href, baseUrl);
      url.searchParams.set("period", "week");
      url.searchParams.set("source", "parent");
      const pos = await centerOf(page, "report-link");
      if (pos) await clickAt(page, pos.x, pos.y);
      else await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/learning\/parent-report/, { timeout: 60_000 });
      await waitShortReport(page);
      break;
    }
    case "open-detailed": {
      const u = new URL(page.url());
      u.pathname = "/learning/parent-report-detailed";
      u.searchParams.set("period", "week");
      const pos = await centerOf(page, "detailed-link");
      if (pos) await clickAt(page, pos.x, pos.y);
      else await page.goto(u.toString(), { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/learning\/parent-report-detailed/, { timeout: 60_000 });
      await waitDetailedReport(page);
      break;
    }
    case "scroll-copilot": {
      const copilot = page.locator("text=שאלו על הדוח").first();
      await copilot.scrollIntoViewIfNeeded({ timeout: 30_000 });
      break;
    }
    case "ask-question": {
      const field = page.getByPlaceholder("שאלה על הדוח…");
      await field.fill(DEMO_QUESTION);
      const pos = await centerOf(page, "copilot-input");
      if (pos) await moveCursor(page, pos.x, pos.y);
      await page.getByRole("button", { name: "שלח" }).click();
      break;
    }
    case "wait-answer": {
      await page.waitForFunction(
        (q) => {
          const t = document.body?.innerText || "";
          const idx = t.indexOf(q);
          if (idx < 0) return false;
          const tail = t.slice(idx + q.length, idx + q.length + 400);
          return (
            !tail.includes("מעבד את הדוח") &&
            !tail.includes("אירעה שגיאה טכנית") &&
            tail.trim().length > 30
          );
        },
        DEMO_QUESTION,
        { timeout: 45_000 }
      );
      break;
    }
    default:
      break;
  }
}

async function runCapture(baseUrl, parent) {
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;

  parentToken = await getParentAccessToken(parent);
  await ensureParentPolicyAccepted(baseUrl, parentToken, () => {});

  const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  const listJson = await listRes.json();
  const demo = (listJson.students || []).find((s) => s.full_name === DEMO_CHILD_NAME);
  if (!demo?.id) throw new Error(`Demo child ${DEMO_CHILD_NAME} not found`);
  demoStudentId = demo.id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "he-IL" });
  await context.route("**/api/parent/copilot-turn", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${parentToken}` },
    });
  });

  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: false });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  await installOverlays(page);

  const pagesSeen = { login: false, dashboard: false, shortReport: false, detailedReport: false, copilotQ: false, copilotA: false };

  for (const scene of SCENES) {
    if (scene.action === "login") {
      /* scenes 1-2 on login before action */
    } else if (scene.page === "dashboard" && !pagesSeen.dashboard) {
      await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      await page.locator("h2:has-text('הילדים שלי')").waitFor({ timeout: 30_000 });
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME });
      await card.first().scrollIntoViewIfNeeded();
      pagesSeen.dashboard = true;
      await installOverlays(page);
    }

    let cursor = null;
    if (scene.highlight === "login-submit" || scene.highlight === "report-link" || scene.highlight === "detailed-link" || scene.highlight === "copilot-input") {
      cursor = await centerOf(page, scene.highlight).catch(() => null);
    }

    await holdScene(page, scene, cursor);

    if (scene.action) {
      const actionResult = await runSceneAction(page, scene, parent, baseUrl);
      if (actionResult?.landed === "dashboard") pagesSeen.dashboard = true;
      await page.waitForTimeout(600);
      await installOverlays(page);
    }

    const url = page.url();
    if (url.includes("/parent/login")) pagesSeen.login = true;
    if (url.includes("/parent/dashboard")) pagesSeen.dashboard = true;
    if (url.includes("/learning/parent-report") && !url.includes("detailed")) pagesSeen.shortReport = true;
    if (url.includes("parent-report-detailed")) pagesSeen.detailedReport = true;
  }

  const body = await page.locator("body").innerText();
  pagesSeen.copilotQ = body.includes(DEMO_QUESTION);
  const qIdx = body.indexOf(DEMO_QUESTION);
  pagesSeen.copilotA =
    qIdx >= 0 &&
    body.slice(qIdx + DEMO_QUESTION.length, qIdx + DEMO_QUESTION.length + 400).trim().length > 30 &&
    !body.includes("אירעה שגיאה טכנית");

  const endState = {
    finalUrl: page.url(),
    finalCaption: SCENES[SCENES.length - 1].caption,
    demoStudentId,
  };

  await browser.close();
  return { frameCount: frameIndex, pagesSeen, endState };
}

function analyzeFrames(frameCount) {
  const hashes = [];
  let whiteish = 0;
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (!existsSync(p)) continue;
    hashes.push(hashFile(p));
  }
  const unique = new Set(hashes).size;
  const early = hashes.slice(0, Math.max(3, Math.floor(frameCount * 0.08)));
  const mid = hashes.slice(Math.floor(frameCount * 0.35), Math.floor(frameCount * 0.55));
  const late = hashes.slice(Math.floor(frameCount * 0.75));
  return { hashes, unique, earlyChanged: new Set(early).size > 1, midChanged: new Set(mid).size > 1, lateChanged: new Set(late).size > 1 };
}

function verify({ frameCount, durationSec, unique, pagesSeen, earlyChanged }) {
  const errors = [];
  if (durationSec < 45 || durationSec > 75) errors.push(`duration ${durationSec}s outside 45–75s`);
  if (unique < Math.min(12, Math.floor(frameCount * 0.08))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!earlyChanged) errors.push("opening appears static/white");
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not captured");
  if (!pagesSeen.shortReport) errors.push("short report not captured");
  if (!pagesSeen.detailedReport) errors.push("detailed report not captured");
  if (!pagesSeen.copilotQ) errors.push("copilot question not visible");
  if (!pagesSeen.copilotA) errors.push("copilot answer not visible");
  return { ok: errors.length === 0, errors, uniqueFrameHashes: unique };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--skip-verify")) {
    console.error("BLOCKER: --skip-verify not allowed");
    process.exit(1);
  }
  if (argv.includes("--skip-preflight")) {
    console.warn("Warning: skipping preflight");
  } else {
    const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const baseArg = argv.find((a) => a.startsWith("--base-url=")) || "";
    const pf = spawnSync(
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-parent-workflow.mjs ${baseArg}`.trim(),
      { encoding: "utf8", cwd: rootDir, shell: true }
    );
    if (pf.status !== 0) {
      console.error("BLOCKER: preflight failed — fix environment before capture");
      console.error(pf.stdout || pf.stderr);
      process.exit(1);
    }
  }

  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);
  const ffmpegPath = resolveFfmpegSync();
  if (!ffmpegPath) {
    console.error("BLOCKER: ffmpeg not available");
    process.exit(1);
  }

  const parent = selectHelpParentAccount();
  if (existsSync(outWebm)) unlinkSync(outWebm);

  const startedAt = Date.now();
  const { frameCount, pagesSeen, endState } = await runCapture(baseUrl, parent);
  encodeFramesToWebm(ffmpegPath, frameCount);
  const durationSec = ffprobeDuration(ffmpegPath, outWebm);
  const { unique, earlyChanged, midChanged, lateChanged } = analyzeFrames(frameCount);
  const verification = verify({
    frameCount,
    durationSec,
    unique,
    pagesSeen,
    earlyChanged: earlyChanged && midChanged && lateChanged,
  });

  const meta = {
    title: "מדריך להורה — כניסה לדוח ושימוש ב-AI",
    pilot: "parent-workflow-v1",
    capturedAt: new Date().toISOString(),
    baseUrl,
    outputWebm: outWebm.replace(/\\/g, "/"),
    fileSizeBytes: statSync(outWebm).size,
    wallClockSec: (Date.now() - startedAt) / 1000,
    frameCount,
    fps: FPS,
    decodedDurationSec: durationSec,
    pagesSeen,
    endState,
    verification,
    captureOnlyOverlays: true,
    publishedToPublic: false,
    manifestTouched: false,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(JSON.stringify(meta, null, 2));

  if (!verification.ok || durationSec == null) {
    console.error("BLOCKER: verification failed");
    verification.errors?.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`\nPilot OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

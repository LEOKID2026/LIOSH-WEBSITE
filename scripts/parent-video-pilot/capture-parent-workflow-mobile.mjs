#!/usr/bin/env node
/**
 * Mobile capture — Video #1 «מדריך להורה — כניסה לדוח ושימוש ב-AI»
 * Output: qa-evidence-audit/parent-video-pilot/parent-report-ai/mobile/main.webm
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
import { installCursorOverlay, clickAt } from "../help-center/lib/cursor-overlay.mjs";
import {
  selectHelpParentAccount,
  getParentAccessToken,
  ensureParentPolicyAccepted,
} from "../help-center/parent-capture-session.mjs";
import {
  DEMO_CHILD_NAME,
  DEMO_QUESTION,
  MOBILE_VIEWPORT,
  MOBILE_SCENES,
  MOBILE_OVERLAY_CSS,
  FPS,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  outWebm,
  outDir,
  framesDir,
  metaPath,
  isCopilotAnswerUseful,
} from "./shared-mobile.mjs";

const require = createRequire(import.meta.url);
const MOBILE = true;

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
  const r = spawnSync(
    ffmpegPath,
    [
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
      "1.2M",
      "-deadline",
      "realtime",
      "-auto-alt-ref",
      "0",
      out,
    ],
    { encoding: "utf8" }
  );
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
  }, MOBILE_OVERLAY_CSS);
}

async function setOverlay(page, { caption, highlightKey }) {
  await page.evaluate(
    ({ caption, highlightKey, childName }) => {
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
          el = document.querySelector("form")?.closest("div") || document.querySelector("form");
          break;
        case "login-email":
          el = document.querySelector('input[type="email"]');
          break;
        case "login-submit":
          el = document.querySelector('form button[type="submit"]');
          break;
        case "children-section":
          el = document.querySelector("h2");
          break;
        case "demo-child":
          el = [...document.querySelectorAll("div.rounded.border")].find((d) =>
            d.innerText?.includes(childName)
          );
          break;
        case "report-link":
          el = [...document.querySelectorAll("div.rounded.border")]
            .find((d) => d.innerText?.includes(childName))
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
          if (!el) {
            el = [...document.querySelectorAll("h2")].find((h) =>
              h.textContent?.includes("מה עשינו")
            )?.closest("section");
          }
          break;
        case "copilot-panel":
        case "copilot-answer":
          el = [...document.querySelectorAll("div")].find((d) =>
            d.innerText?.startsWith("שאלו על הדוח")
          );
          break;
        case "copilot-input":
          el = document.querySelector('input[placeholder*="שאלה על הדוח"]');
          break;
        default:
          el = null;
      }
      if (!el || !hl) {
        hide();
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 5;
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.classList.add("visible");
      dim?.classList.add("active");
    },
    { caption, highlightKey, childName: DEMO_CHILD_NAME }
  );
}

async function captureFrame(page) {
  const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
  frameIndex++;
  await page.screenshot({ path: join(framesDir, name), type: "png", animations: "disabled" });
}

async function holdScene(page, scene) {
  await setOverlay(page, { caption: scene.caption, highlightKey: scene.highlight });
  const frameTarget = Math.max(1, Math.round((scene.holdMs / 1000) * FPS));
  for (let i = 0; i < frameTarget; i++) {
    await captureFrame(page);
    if (i < frameTarget - 1) await page.waitForTimeout(40);
  }
}

async function tapCenter(page, highlightKey) {
  const pos = await page.evaluate(
    ({ key, childName }) => {
      const pick = () => {
        switch (key) {
          case "login-submit":
            return document.querySelector('form button[type="submit"]');
          case "report-link":
            return [...document.querySelectorAll("div.rounded.border")]
              .find((d) => d.innerText?.includes(childName))
              ?.querySelector('a[href*="parent-report"]');
          case "detailed-link":
            return [...document.querySelectorAll("a")].find((a) =>
              a.textContent?.includes("דוח מקיף")
            );
          case "copilot-input": {
            const inp = document.querySelector('input[placeholder*="שאלה על הדוח"]');
            const btn = [...document.querySelectorAll("button")].find((b) =>
              b.textContent?.includes("שלח")
            );
            return btn || inp;
          }
          default:
            return null;
        }
      };
      const el = pick();
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { key: highlightKey, childName: DEMO_CHILD_NAME }
  );
  if (pos) await clickAt(page, pos.x, pos.y, { mobile: MOBILE });
}

async function waitShortReport(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("שאלות") && /\d+/.test(t) && !t.includes("לא ניתן לטעון");
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
      await page.getByPlaceholder("אימייל הורה").fill(parent.email);
      await page.getByPlaceholder("סיסמה").fill(parent.password);
      await tapCenter(page, "login-submit");
      await page.waitForURL("**/parent/dashboard**", { timeout: 60_000 });
      return;
    }
    case "scroll-children-intro": {
      await page.locator("h2:has-text('הילדים שלי')").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      return;
    }
    case "scroll-demo-child": {
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
      await card.scrollIntoViewIfNeeded({ timeout: 30_000 });
      await page.waitForTimeout(500);
      return;
    }
    case "open-short-report": {
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
      const link = card.locator('a:has-text("דוח הורים")');
      const href = await link.getAttribute("href");
      const url = new URL(href, baseUrl);
      url.searchParams.set("period", "week");
      url.searchParams.set("source", "parent");
      await tapCenter(page, "report-link");
      try {
        await page.waitForURL(/\/learning\/parent-report/, { timeout: 15_000 });
      } catch {
        await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      }
      await waitShortReport(page);
      return;
    }
    case "nudge-summary": {
      await page.evaluate(() => window.scrollBy(0, 80));
      await page.waitForTimeout(300);
      return;
    }
    case "open-detailed": {
      const link = page.getByRole("link", { name: "דוח מקיף לתקופה" });
      await link.scrollIntoViewIfNeeded();
      await tapCenter(page, "detailed-link");
      try {
        await page.waitForURL(/\/learning\/parent-report-detailed/, { timeout: 15_000 });
      } catch {
        const u = new URL(page.url());
        u.pathname = "/learning/parent-report-detailed";
        u.searchParams.set("period", "week");
        await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      }
      await waitDetailedReport(page);
      return;
    }
    case "scroll-detailed-section": {
      const section = page.locator("h2").filter({ hasText: /סיכום לתקופה|מה עשינו/ }).first();
      await section.scrollIntoViewIfNeeded({ timeout: 20_000 });
      await page.waitForTimeout(400);
      return;
    }
    case "scroll-copilot": {
      await page.locator("text=שאלו על הדוח").first().scrollIntoViewIfNeeded({ timeout: 30_000 });
      await page.waitForTimeout(500);
      return;
    }
    case "ask-question": {
      const field = page.getByPlaceholder("שאלה על הדוח…");
      await field.fill(DEMO_QUESTION);
      await tapCenter(page, "copilot-input");
      return;
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
      await page.evaluate(() => window.scrollBy(0, 40));
      await page.waitForTimeout(300);
      return;
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
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    locale: "he-IL",
    isMobile: true,
    hasTouch: true,
  });
  await context.route("**/api/parent/copilot-turn", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${parentToken}` },
    });
  });

  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: true });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector('input[type="email"]', { timeout: 20_000 });
  await installOverlays(page);

  const pagesSeen = {
    login: false,
    dashboard: false,
    shortReport: false,
    detailedReport: false,
    copilotQ: false,
    copilotA: false,
  };

  for (const scene of MOBILE_SCENES) {
    if (scene.page === "dashboard" && scene.id === "M4") {
      await page.waitForURL("**/parent/dashboard**", { timeout: 5_000 }).catch(() => {});
      if (!page.url().includes("/parent/dashboard")) {
        await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      }
      await installOverlays(page);
    }

    await holdScene(page, scene);

    if (scene.action) {
      await runSceneAction(page, scene, parent, baseUrl);
      await page.waitForTimeout(500);
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
  pagesSeen.copilotA = isCopilotAnswerUseful(body);

  const endState = {
    finalUrl: page.url(),
    finalCaption: MOBILE_SCENES[MOBILE_SCENES.length - 1].caption,
    demoStudentId,
    viewport: MOBILE_VIEWPORT,
  };

  await browser.close();
  return { frameCount: frameIndex, pagesSeen, endState };
}

function analyzeFrames(frameCount) {
  const hashes = [];
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (existsSync(p)) hashes.push(hashFile(p));
  }
  const unique = new Set(hashes).size;
  const early = hashes.slice(0, Math.max(3, Math.floor(frameCount * 0.08)));
  const mid = hashes.slice(Math.floor(frameCount * 0.35), Math.floor(frameCount * 0.55));
  const late = hashes.slice(Math.floor(frameCount * 0.75));
  return {
    hashes,
    unique,
    earlyChanged: new Set(early).size > 1,
    midChanged: new Set(mid).size > 1,
    lateChanged: new Set(late).size > 1,
  };
}

function verify({ frameCount, durationSec, unique, pagesSeen, motionOk }) {
  const errors = [];
  if (durationSec < 70 || durationSec > 90) {
    errors.push(`duration ${durationSec}s outside 70–90s mobile target`);
  }
  if (unique < Math.min(10, Math.floor(frameCount * 0.06))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!motionOk) errors.push("video appears static across segments");
  if (!pagesSeen.login) errors.push("login not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not captured");
  if (!pagesSeen.shortReport) errors.push("short report not captured");
  if (!pagesSeen.detailedReport) errors.push("detailed report not captured");
  if (!pagesSeen.copilotQ) errors.push("copilot question not visible");
  if (!pagesSeen.copilotA) errors.push("copilot answer not useful");
  return { ok: errors.length === 0, errors, uniqueFrameHashes: unique };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--skip-verify")) {
    console.error("BLOCKER: --skip-verify not allowed");
    process.exit(1);
  }

  const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const baseArg = argv.find((a) => a.startsWith("--base-url=")) || "";
  let preflightOk = false;
  if (existsSync(join(outDir, "preflight-report.json"))) {
    try {
      const recent = JSON.parse(readFileSync(join(outDir, "preflight-report.json"), "utf8"));
      const ageMs = Date.now() - new Date(recent.at || 0).getTime();
      if (recent.ok && ageMs < 15 * 60 * 1000) preflightOk = true;
    } catch {
      /* re-run */
    }
  }
  if (!preflightOk) {
    let lastOut = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const pf = spawnSync(
        `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-parent-workflow-mobile.mjs ${baseArg}`.trim(),
        { encoding: "utf8", cwd: rootDir, shell: true }
      );
      lastOut = pf.stdout || pf.stderr || "";
      if (pf.status === 0) {
        preflightOk = true;
        break;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
    }
    if (!preflightOk) {
      console.error("BLOCKER: mobile preflight failed after 3 attempts");
      console.error(lastOut);
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
  const motionOk = earlyChanged && midChanged && lateChanged;
  const verification = verify({
    frameCount,
    durationSec,
    unique,
    pagesSeen,
    motionOk,
  });

  const meta = {
    title: "מדריך להורה — כניסה לדוח ושימוש ב-AI",
    pilot: "parent-workflow-v1-mobile",
    viewport: MOBILE_VIEWPORT,
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
    console.error("BLOCKER: mobile verification failed");
    verification.errors?.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`\nMobile pilot OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

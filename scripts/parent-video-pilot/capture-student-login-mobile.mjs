#!/usr/bin/env node
/**
 * Video #4 mobile capture — student login with code + PIN (no gameplay).
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
import { chromium } from "playwright";
import { installCursorOverlay, clickAt } from "../help-center/lib/cursor-overlay.mjs";
import { resolveStudentDemoAccount, expectedDemoStudentName } from "./lib/student-demo-account.mjs";
import {
  resolveFfmpegSync,
  encodeFramesToWebm,
  ffprobeDuration,
  analyzeFrames,
} from "./lib/capture-kit.mjs";
import {
  MOBILE_SCENES,
  DEMO_STUDENT_NAME,
  MOBILE_VIEWPORT,
  FPS,
  TITLE,
  PILOT_ID,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  outWebm,
  outDir,
  framesDir,
  metaPath,
  preflightPath,
  MOBILE_OVERLAY_CSS,
} from "./shared-student-login-mobile.mjs";

const SCENES = MOBILE_SCENES;
const MOBILE = true;

let frameIndex = 0;
let studentAccount = null;

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
    ({ caption, highlightKey, studentName }) => {
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
        case "username-field":
          el = document.querySelector('input[placeholder="שם משתמש"]');
          break;
        case "pin-field":
          el = document.querySelector('input[placeholder="PIN"]');
          break;
        case "login-submit":
          el = document.querySelector('form button[type="submit"]');
          break;
        case "home-greeting": {
          const h1 = [...document.querySelectorAll("h1")].find((h) =>
            h.textContent?.includes(studentName)
          );
          el = h1 || document.querySelector("h1");
          break;
        }
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
    { caption, highlightKey, studentName: DEMO_STUDENT_NAME }
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
  const pos = await page.evaluate((key) => {
    const pick = (k) => {
      switch (k) {
        case "login-submit":
          return document.querySelector('form button[type="submit"]');
        default:
          return null;
      }
    };
    const el = pick(key);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, highlightKey);
  if (pos) await clickAt(page, pos.x, pos.y, { mobile: MOBILE });
}

async function runSceneAction(page, scene, baseUrl) {
  switch (scene.action) {
    case "fill-username":
      await page.getByPlaceholder("שם משתמש").fill(studentAccount.username);
      break;
    case "fill-pin":
      await page.getByPlaceholder("PIN").fill(studentAccount.pin);
      break;
    case "submit-login":
      await tapCenter(page, "login-submit");
      await page.waitForURL("**/student/home**", { timeout: 60_000 });
      await page.waitForFunction(
        (name) => document.body?.innerText?.includes(name),
        expectedDemoStudentName(),
        { timeout: 60_000 }
      );
      break;
    default:
      break;
  }
}

async function runCapture(baseUrl) {
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;
  studentAccount = resolveStudentDemoAccount();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: true });

  await page.goto(`${baseUrl}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const { waitStudentLoginReady } = await import("./lib/wait-student-login-ready.mjs");
  await waitStudentLoginReady(page, 60_000);
  await page.waitForTimeout(600);
  await installOverlays(page);

  const pagesSeen = { login: false, home: false, greeting: false };

  for (const scene of SCENES) {
    await holdScene(page, scene);

    if (scene.action) {
      await runSceneAction(page, scene, baseUrl);
      await page.waitForTimeout(500);
      await installOverlays(page);
    }

    const url = page.url();
    const body = await page.locator("body").innerText();
    if (url.includes("/student/login")) pagesSeen.login = true;
    if (url.includes("/student/home")) pagesSeen.home = true;
    if (body.includes("שלום") && body.includes(DEMO_STUDENT_NAME)) pagesSeen.greeting = true;
  }

  await browser.close();
  return {
    frameCount: frameIndex,
    pagesSeen,
    endState: { finalCaption: SCENES[SCENES.length - 1].caption },
  };
}

function verify({ frameCount, durationSec, unique, pagesSeen, earlyChanged, midChanged, lateChanged }) {
  const errors = [];
  if (durationSec == null || durationSec < 45 || durationSec > 80) {
    errors.push(`duration ${durationSec}s outside 45–80s`);
  }
  if (unique < Math.min(8, Math.floor(frameCount * 0.06))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if ((!earlyChanged || !midChanged || !lateChanged) && unique < 12) {
    errors.push("video appears static in early/mid/late segments");
  }
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.home) errors.push("student home not captured");
  if (!pagesSeen.greeting) errors.push(`greeting for ${DEMO_STUDENT_NAME} not seen`);
  return { ok: errors.length === 0, errors, uniqueFrameHashes: unique };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--skip-verify") || argv.includes("--skip-preflight")) {
    console.error("BLOCKER: --skip-verify / --skip-preflight not allowed");
    process.exit(1);
  }

  const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const baseArg = argv.find((a) => a.startsWith("--base-url=")) || "";
  let preflightOk = false;
  if (existsSync(preflightPath)) {
    try {
      const recent = JSON.parse(readFileSync(preflightPath, "utf8"));
      const ageMs = Date.now() - new Date(recent.at).getTime();
      if (recent.ok && ageMs < 15 * 60 * 1000) preflightOk = true;
    } catch {
      /* rerun */
    }
  }
  if (!preflightOk) {
    const pf = spawnSync(
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-student-login-mobile.mjs ${baseArg}`.trim(),
      { encoding: "utf8", cwd: rootDir, shell: true }
    );
    if (pf.status !== 0) {
      console.error("BLOCKER: preflight failed");
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

  if (existsSync(outWebm)) unlinkSync(outWebm);

  const startedAt = Date.now();
  const capture = await runCapture(baseUrl);
  encodeFramesToWebm(ffmpegPath, framesDir, outWebm, capture.frameCount, FPS, "1.2M");
  const durationSec = ffprobeDuration(ffmpegPath, outWebm);
  const { unique, whiteish, earlyChanged, midChanged, lateChanged } = analyzeFrames(
    framesDir,
    capture.frameCount
  );
  const verification = verify({
    frameCount: capture.frameCount,
    durationSec,
    unique,
    pagesSeen: capture.pagesSeen,
    earlyChanged,
    midChanged,
    lateChanged,
  });

  const meta = {
    title: TITLE,
    pilot: PILOT_ID,
    capturedAt: new Date().toISOString(),
    baseUrl,
    outputWebm: outWebm.replace(/\\/g, "/"),
    fileSizeBytes: statSync(outWebm).size,
    wallClockSec: (Date.now() - startedAt) / 1000,
    frameCount: capture.frameCount,
    fps: FPS,
    decodedDurationSec: durationSec,
    pagesSeen: capture.pagesSeen,
    endState: capture.endState,
    verification,
    captureOnlyOverlays: true,
    publishedToPublic: false,
    manifestTouched: false,
    badFrames: { whiteishFrameCount: whiteish },
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(JSON.stringify(meta, null, 2));

  if (!verification.ok) {
    console.error("BLOCKER: verification failed");
    verification.errors?.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`\nVideo #4 mobile OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Video #2 mobile capture — parent signup UI (disposable email, no admin createUser).
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
import {
  buildSignupRunId,
  buildSignupCaptureEmail,
  buildSignupCapturePassword,
} from "./lib/signup-capture-parent.mjs";
import { requireServiceRoleAdmin } from "./lib/isolated-capture-parent.mjs";
import { acceptSignupPolicy } from "./lib/video-capture-runtime.mjs";
import {
  resolveFfmpegSync,
  encodeFramesToWebm,
  ffprobeDuration,
  analyzeFrames,
} from "./lib/capture-kit.mjs";
import {
  MOBILE_SCENES,
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
} from "./shared-create-parent-account-mobile.mjs";

const SCENES = MOBILE_SCENES;
const MOBILE = true;

let frameIndex = 0;
let signupEmail = null;
let signupPassword = null;

async function deleteEphemeralSignupUser(email) {
  try {
    const admin = requireServiceRoleAdmin();
    for (let page = 1; page <= 5; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const match = (data?.users || []).find((u) => u.email === email);
      if (match?.id) {
        await admin.auth.admin.deleteUser(match.id);
        return true;
      }
      if ((data?.users || []).length < 200) break;
    }
  } catch {
    /* best effort */
  }
  return false;
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
        case "signup-tab":
          el = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "הרשמה");
          break;
        case "policy-panel":
          el =
            document.querySelector("[data-policy-acceptance-root]")?.closest("div") ||
            document.querySelector("main") ||
            document.body;
          break;
        case "signup-email":
          el = document.querySelector('input[type="email"]');
          break;
        case "signup-password":
          el = document.querySelector('input[type="password"]');
          break;
        case "signup-submit":
          el = [...document.querySelectorAll("button")].find((b) =>
            b.textContent?.includes("יצירת חשבון הורה")
          );
          break;
        case "dashboard-header":
          el = document.querySelector("h1");
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
    { caption, highlightKey }
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
        case "signup-tab":
          return [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "הרשמה");
        case "signup-submit":
          return [...document.querySelectorAll("button")].find((b) =>
            b.textContent?.includes("יצירת חשבון הורה")
          );
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
    case "switch-signup":
      await tapCenter(page, "signup-tab");
      await page.waitForTimeout(400);
      break;
    case "accept-policy":
      await acceptSignupPolicy(page);
      break;
    case "fill-signup":
      await page.getByPlaceholder("אימייל הורה").fill(signupEmail);
      await page.getByPlaceholder("סיסמה").fill(signupPassword);
      break;
    case "submit-signup":
      await tapCenter(page, "signup-submit");
      await page.waitForURL("**/parent/dashboard**", { timeout: 60_000 });
      await page.waitForSelector("h1:has-text('דשבורד הורים')", { timeout: 30_000 });
      break;
    default:
      break;
  }
}

async function runCapture(baseUrl) {
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;

  const runId = buildSignupRunId();
  signupEmail = buildSignupCaptureEmail(runId);
  signupPassword = buildSignupCapturePassword();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: true });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  await installOverlays(page);

  const pagesSeen = { login: false, signupForm: false, dashboard: false };

  try {
    for (const scene of SCENES) {
      if (scene.action === "accept-policy") {
        await page.getByRole("button", { name: "הרשמה" }).click();
        await page.waitForTimeout(300);
      }

      await holdScene(page, scene);

      if (scene.action) {
        await runSceneAction(page, scene, baseUrl);
        await page.waitForTimeout(600);
        await installOverlays(page);
      }

      const url = page.url();
      const body = await page.locator("body").innerText();
      if (url.includes("/parent/login")) pagesSeen.login = true;
      if (body.includes("אימייל הורה") || scene.page === "signup-form") pagesSeen.signupForm = true;
      if (url.includes("/parent/dashboard")) pagesSeen.dashboard = true;
    }
  } finally {
    await browser.close();
    await deleteEphemeralSignupUser(signupEmail);
  }

  return {
    frameCount: frameIndex,
    pagesSeen,
    endState: { finalCaption: SCENES[SCENES.length - 1].caption, signupEmailMasked: signupEmail.replace(/(.{4}).+(@.+)/, "$1…$2") },
  };
}

function verify({ frameCount, durationSec, unique, pagesSeen, earlyChanged, midChanged, lateChanged }) {
  const errors = [];
  if (durationSec == null || durationSec < 60 || durationSec > 95) {
    errors.push(`duration ${durationSec}s outside 60–95s`);
  }
  if (unique < Math.min(10, Math.floor(frameCount * 0.08))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!earlyChanged || !midChanged || !lateChanged) {
    errors.push("video appears static in early/mid/late segments");
  }
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.signupForm) errors.push("signup form not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not reached after signup");
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
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-create-parent-account-mobile.mjs ${baseArg}`.trim(),
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
  console.log(`\nVideo #2 mobile OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Video #3 mobile capture — add child + student credentials (isolated parent).
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
import { authenticateParent } from "../virtual-student-qa/lib/parent-auth.mjs";
import { getParentAccessToken, ensureParentPolicyAccepted } from "../help-center/parent-capture-session.mjs";
import {
  resolveIsolatedCaptureParent,
  cleanupIsolatedCaptureParent,
} from "./lib/isolated-capture-parent.mjs";
import {
  resolveFfmpegSync,
  encodeFramesToWebm,
  ffprobeDuration,
  analyzeFrames,
} from "./lib/capture-kit.mjs";
import {
  MOBILE_SCENES,
  DISPOSABLE_CHILD_NAME,
  DISPOSABLE_CHILD_GRADE,
  DISPOSABLE_USERNAME_PREFIX,
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
} from "./shared-add-students-mobile.mjs";

const SCENES = MOBILE_SCENES;
const MOBILE = true;

let frameIndex = 0;
let parentCtx = null;
let disposableUsername = null;
const disposablePin = "5678";

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
          el = document.querySelector("form");
          break;
        case "login-submit":
          el = document.querySelector('form button[type="submit"]');
          break;
        case "add-child-form":
          el = [...document.querySelectorAll("form")].find((f) =>
            f.innerText?.includes("הוספת ילד")
          );
          break;
        case "child-name":
          el = document.querySelector('input[placeholder="שם הילד"]');
          break;
        case "child-grade":
          el = [...document.querySelectorAll("form")].find((f) =>
            f.innerText?.includes("הוספת ילד")
          )?.querySelector("select");
          break;
        case "add-child-submit":
          el = [...document.querySelectorAll("form")].find((f) =>
            f.innerText?.includes("הוספת ילד")
          )?.querySelector("button");
          break;
        case "new-child-card":
          el = [...document.querySelectorAll("div.rounded.border")].find((d) =>
            d.innerText?.includes(childName)
          );
          break;
        case "credentials-section": {
          const card = [...document.querySelectorAll("div.rounded.border")].find((d) =>
            d.innerText?.includes(childName)
          );
          el =
            card?.querySelector('input[placeholder="לדוגמה: noam123"]')?.closest("div.rounded.border") ||
            card;
          break;
        }
        case "save-credentials":
          el = [...document.querySelectorAll("button")].find((b) =>
            b.textContent?.includes("קביעת שם משתמש ו-PIN")
          );
          break;
        case "credential-confirm":
          el = [...document.querySelectorAll("div")].find((d) =>
            d.innerText?.includes("חשוב לשמור את הפרטים")
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
      const pad = 5;
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.classList.add("visible");
      dim?.classList.add("active");
    },
    { caption, highlightKey, childName: DISPOSABLE_CHILD_NAME }
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
        case "add-child-submit":
          return [...document.querySelectorAll("form")].find((f) =>
            f.innerText?.includes("הוספת ילד")
          )?.querySelector("button");
        case "save-credentials":
          return [...document.querySelectorAll("button")].find((b) =>
            b.textContent?.includes("קביעת שם משתמש ו-PIN")
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

function addChildForm(page) {
  return page.locator('form:has(h2:has-text("הוספת ילד"))');
}

async function runSceneAction(page, scene, baseUrl, context) {
  switch (scene.action) {
    case "login": {
      await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("אימייל הורה").fill(parentCtx.email);
      await page.getByPlaceholder("סיסמה").fill(parentCtx.password);
      await tapCenter(page, "login-submit");
      try {
        await page.waitForURL("**/parent/dashboard**", { timeout: 60_000 });
      } catch {
        await authenticateParent({
          context,
          page,
          account: { email: parentCtx.email, password: parentCtx.password },
          baseUrl,
          mode: "ui",
          log: () => {},
        });
      }
      break;
    }
    case "scroll-add-form": {
      await page.locator('h2:has-text("הוספת ילד")').scrollIntoViewIfNeeded({ timeout: 30_000 });
      await page.waitForTimeout(400);
      break;
    }
    case "fill-name":
      await addChildForm(page).getByPlaceholder("שם הילד").fill(DISPOSABLE_CHILD_NAME);
      break;
    case "fill-grade":
      await addChildForm(page).locator("select").selectOption(DISPOSABLE_CHILD_GRADE);
      break;
    case "submit-add-child":
      await tapCenter(page, "add-child-submit");
      await page.waitForFunction(
        (name) => [...document.querySelectorAll("div.rounded.border")].some((d) => d.innerText?.includes(name)),
        DISPOSABLE_CHILD_NAME,
        { timeout: 30_000 }
      );
      break;
    case "scroll-new-child": {
      const card = page.locator("div.rounded.border").filter({ hasText: DISPOSABLE_CHILD_NAME }).first();
      await card.scrollIntoViewIfNeeded({ timeout: 30_000 });
      await page.waitForTimeout(400);
      break;
    }
    case "fill-credentials": {
      const card = page.locator("div.rounded.border").filter({ hasText: DISPOSABLE_CHILD_NAME }).first();
      disposableUsername = `${DISPOSABLE_USERNAME_PREFIX}${Date.now().toString(36)}`;
      await card.getByPlaceholder("לדוגמה: noam123").fill(disposableUsername);
      await card.getByPlaceholder("4 ספרות").fill(disposablePin);
      break;
    }
    case "save-credentials":
      await tapCenter(page, "save-credentials");
      await page.waitForFunction(
        () => document.body?.innerText?.includes("חשוב לשמור את הפרטים"),
        undefined,
        { timeout: 30_000 }
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

  parentCtx = await resolveIsolatedCaptureParent();
  const token = await getParentAccessToken({ email: parentCtx.email, password: parentCtx.password });
  await ensureParentPolicyAccepted(baseUrl, token, () => {});

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: true });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  await installOverlays(page);

  const pagesSeen = {
    login: false,
    dashboard: false,
    childCreated: false,
    credentialConfirm: false,
  };

  try {
    for (const scene of SCENES) {
      if (scene.page === "dashboard" && !pagesSeen.dashboard && scene.id >= "M3") {
        if (!page.url().includes("/parent/dashboard")) {
          await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
        }
        await page.waitForSelector('h2:has-text("הוספת ילד")', { timeout: 30_000 });
        pagesSeen.dashboard = true;
        await installOverlays(page);
      }

      if (scene.action?.startsWith("scroll-")) {
        await runSceneAction(page, scene, baseUrl, context);
        await page.waitForTimeout(400);
        await installOverlays(page);
      }

      await holdScene(page, scene);

      if (scene.action && !scene.action.startsWith("scroll-")) {
        await runSceneAction(page, scene, baseUrl, context);
        if (scene.action === "login") pagesSeen.dashboard = true;
        await page.waitForTimeout(600);
        await installOverlays(page);
      }

      const url = page.url();
      const body = await page.locator("body").innerText();
      if (url.includes("/parent/login")) pagesSeen.login = true;
      if (url.includes("/parent/dashboard")) pagesSeen.dashboard = true;
      if (body.includes(DISPOSABLE_CHILD_NAME)) pagesSeen.childCreated = true;
      if (body.includes("חשוב לשמור את הפרטים")) pagesSeen.credentialConfirm = true;
    }
  } finally {
    await browser.close();
    const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listJson = await listRes.json().catch(() => ({}));
    const child = (listJson.students || []).find((s) => s.full_name === DISPOSABLE_CHILD_NAME);
    if (child?.id) {
      parentCtx.createdStudentIds = [...(parentCtx.createdStudentIds || []), child.id];
    }
    await cleanupIsolatedCaptureParent(parentCtx);
  }

  return {
    frameCount: frameIndex,
    pagesSeen,
    endState: { finalCaption: SCENES[SCENES.length - 1].caption, disposableUsername },
  };
}

function verify({ frameCount, durationSec, unique, pagesSeen, earlyChanged, midChanged, lateChanged }) {
  const errors = [];
  if (durationSec == null || durationSec < 60 || durationSec > 95) {
    errors.push(`duration ${durationSec}s outside 60–95s`);
  }
  if (unique < Math.min(12, Math.floor(frameCount * 0.08))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!earlyChanged || !midChanged || !lateChanged) {
    errors.push("video appears static in early/mid/late segments");
  }
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not captured");
  if (!pagesSeen.childCreated) errors.push("disposable child not created");
  if (!pagesSeen.credentialConfirm) errors.push("credential confirmation not shown");
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
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-add-students-mobile.mjs ${baseArg}`.trim(),
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
  console.log(`\nVideo #3 mobile OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

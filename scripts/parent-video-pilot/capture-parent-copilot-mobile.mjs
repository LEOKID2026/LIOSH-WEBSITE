#!/usr/bin/env node
/**
 * Video #6 mobile capture — Copilot follow-up questions (Q1 + Q2).
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
import {
  selectHelpParentAccount,
  getParentAccessToken,
} from "../help-center/parent-capture-session.mjs";
import {
  resolveFfmpegSync,
  encodeFramesToWebm,
  ffprobeDuration,
  analyzeFrames,
  ensurePolicyWithRetry,
} from "./lib/capture-kit.mjs";
import {
  MOBILE_SCENES,
  DEMO_CHILD_NAME,
  COPILOT_Q1,
  COPILOT_Q2,
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
  isCopilotAnswerUseful,
} from "./shared-parent-copilot-mobile.mjs";

const SCENES = MOBILE_SCENES;
const MOBILE = true;

let frameIndex = 0;
let demoStudentId = null;
let parentToken = null;

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
        case "detailed-header":
          el = document.querySelector("h1, h2");
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
          case "copilot-input": {
            const btn = [...document.querySelectorAll("button")].find((b) =>
              b.textContent?.includes("שלח")
            );
            return btn || document.querySelector('input[placeholder*="שאלה על הדוח"]');
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

async function waitDetailedReport(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("שאלו על הדוח") && !t.includes("טוען דוח מקיף");
    },
    undefined,
    { timeout: 90_000 }
  );
}

async function waitCopilotAnswer(page, question) {
  await page.waitForFunction(
    (q) => {
      const t = document.body?.innerText || "";
      const idx = t.indexOf(q);
      if (idx < 0) return false;
      const tail = t.slice(idx + q.length, idx + q.length + 500);
      return !tail.includes("מעבד את הדוח") && !tail.includes("אירעה שגיאה טכנית") && tail.trim().length > 20;
    },
    question,
    { timeout: 45_000 }
  );
}

async function rescrollCopilot(page) {
  await page.locator("text=שאלו על הדוח").first().scrollIntoViewIfNeeded({ timeout: 30_000 }).catch(() => null);
  await page.evaluate(() => window.scrollBy(0, 40));
  await page.waitForTimeout(350);
}

async function runSceneAction(page, scene, parent, baseUrl, context) {
  switch (scene.action) {
    case "login": {
      await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("אימייל הורה").fill(parent.email);
      await page.getByPlaceholder("סיסמה").fill(parent.password);
      await tapCenter(page, "login-submit");
      try {
        await page.waitForURL("**/parent/dashboard**", { timeout: 60_000 });
      } catch {
        await authenticateParent({ context, page, account: parent, baseUrl, mode: "ui", log: () => {} });
      }
      break;
    }
    case "scroll-demo-child": {
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
      await card.scrollIntoViewIfNeeded({ timeout: 30_000 });
      await page.waitForTimeout(500);
      break;
    }
    case "open-detailed": {
      const u = new URL(`${baseUrl}/learning/parent-report-detailed`);
      u.searchParams.set("studentId", demoStudentId);
      u.searchParams.set("period", "week");
      u.searchParams.set("source", "parent");
      await tapCenter(page, "report-link");
      await page.waitForTimeout(400);
      if (!page.url().includes("parent-report-detailed")) {
        await page.goto(u.toString(), { waitUntil: "domcontentloaded" });
      }
      await waitDetailedReport(page);
      break;
    }
    case "scroll-copilot":
      await rescrollCopilot(page);
      break;
    case "ask-q1": {
      const field = page.getByPlaceholder("שאלה על הדוח…");
      await field.fill(COPILOT_Q1);
      await tapCenter(page, "copilot-input");
      break;
    }
    case "wait-q1-rescroll":
      await waitCopilotAnswer(page, COPILOT_Q1);
      await rescrollCopilot(page);
      break;
    case "ask-q2": {
      const field = page.getByPlaceholder("שאלה על הדוח…");
      await field.fill("");
      await field.fill(COPILOT_Q2);
      await tapCenter(page, "copilot-input");
      break;
    }
    case "wait-q2-rescroll":
      await waitCopilotAnswer(page, COPILOT_Q2);
      await rescrollCopilot(page);
      break;
    default:
      break;
  }
}

async function runCapture(baseUrl, parent) {
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;

  parentToken = await getParentAccessToken(parent);
  await ensurePolicyWithRetry(baseUrl, parentToken);

  const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  const listJson = await listRes.json();
  const demo = (listJson.students || []).find((s) => s.full_name === DEMO_CHILD_NAME);
  if (!demo?.id) throw new Error(`Demo child ${DEMO_CHILD_NAME} not found`);
  demoStudentId = demo.id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT, locale: "he-IL" });
  await context.route("**/api/parent/copilot-turn", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${parentToken}` },
    });
  });
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: true });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  await installOverlays(page);

  const pagesSeen = {
    login: false,
    dashboard: false,
    detailedReport: false,
    copilotQ1: false,
    copilotA1: false,
    copilotQ2: false,
    copilotA2: false,
  };

  for (const scene of SCENES) {
    if (scene.page === "dashboard" && !pagesSeen.dashboard && scene.id >= "M4") {
      await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      await page.locator("h2:has-text('הילדים שלי')").waitFor({ timeout: 30_000 });
      pagesSeen.dashboard = true;
      await installOverlays(page);
    }

    if (scene.action?.startsWith("scroll-")) {
      await runSceneAction(page, scene, parent, baseUrl, context);
      await page.waitForTimeout(400);
      await installOverlays(page);
    }

    await holdScene(page, scene);

    if (scene.action && !scene.action.startsWith("scroll-")) {
      await runSceneAction(page, scene, parent, baseUrl, context);
      if (scene.action === "login") pagesSeen.dashboard = true;
      await page.waitForTimeout(600);
      await installOverlays(page);
    }

    const url = page.url();
    const body = await page.locator("body").innerText();
    if (url.includes("/parent/login")) pagesSeen.login = true;
    if (url.includes("/parent/dashboard")) pagesSeen.dashboard = true;
    if (url.includes("parent-report-detailed")) pagesSeen.detailedReport = true;
    if (body.includes(COPILOT_Q1)) pagesSeen.copilotQ1 = true;
    if (body.includes(COPILOT_Q2)) pagesSeen.copilotQ2 = true;
    if (isCopilotAnswerUseful(body, COPILOT_Q1)) pagesSeen.copilotA1 = true;
    if (isCopilotAnswerUseful(body, COPILOT_Q2)) pagesSeen.copilotA2 = true;
  }

  await browser.close();
  return {
    frameCount: frameIndex,
    pagesSeen,
    endState: { demoStudentId, finalCaption: SCENES[SCENES.length - 1].caption },
  };
}

function verify({ frameCount, durationSec, unique, pagesSeen, earlyChanged, midChanged, lateChanged }) {
  const errors = [];
  if (durationSec == null || durationSec < 65 || durationSec > 95) {
    errors.push(`duration ${durationSec}s outside 65–95s`);
  }
  if (unique < Math.min(12, Math.floor(frameCount * 0.08))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!earlyChanged || !midChanged || !lateChanged) {
    errors.push("video appears static in early/mid/late segments");
  }
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not captured");
  if (!pagesSeen.detailedReport) errors.push("detailed report not captured");
  if (!pagesSeen.copilotQ1) errors.push("copilot Q1 not visible");
  if (!pagesSeen.copilotA1) errors.push("copilot Q1 answer not useful");
  if (!pagesSeen.copilotQ2) errors.push("copilot Q2 not visible");
  if (!pagesSeen.copilotA2) errors.push("copilot Q2 answer not useful");
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
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-parent-copilot-mobile.mjs ${baseArg}`.trim(),
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

  const parent = selectHelpParentAccount();
  if (existsSync(outWebm)) unlinkSync(outWebm);

  const startedAt = Date.now();
  const capture = await runCapture(baseUrl, parent);
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
  console.log(`\nVideo #6 mobile OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

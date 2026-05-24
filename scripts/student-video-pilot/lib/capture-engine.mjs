/**
 * Generic frame-capture engine for student-video-pilot workflows.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { installCursorOverlay, clickAt, moveCursor } from "../../help-center/lib/cursor-overlay.mjs";
import {
  analyzeFrames,
  encodeFramesToWebm,
  ffprobeDuration,
  resolveFfmpegSync,
} from "../../parent-video-pilot/lib/capture-kit.mjs";
import {
  FPS,
  OVERLAY_CSS,
  assertAllowedBaseUrl,
  isMobileViewport,
  viewportFor,
  workflowPaths,
} from "./common.mjs";
import { ensureStudentSession, expectedDemoStudentName, resolveStudentDemoAccount } from "./student-session.mjs";
import { runPreflight } from "./preflight-engine.mjs";

const BUILTIN_ACTIONS = {
  "student-login": async (ctx) => ensureStudentSession(ctx.page, ctx.baseUrl, ctx.account),
  "wait-home-ready": async (ctx) => {
    await ctx.page.waitForFunction(
      (name) => (document.body?.innerText || "").includes(name),
      ctx.demoName,
      { timeout: 60_000 }
    );
  },
};

export async function installCaptureOverlays(page) {
  await page.evaluate((css) => {
    if (!document.getElementById("student-pilot-style")) {
      const s = document.createElement("style");
      s.id = "student-pilot-style";
      s.textContent = css;
      document.head.appendChild(s);
    }
    if (document.getElementById("student-pilot-capture-root")) return;
    const el = document.createElement("div");
    el.id = "student-pilot-capture-root";
    el.innerHTML =
      '<div id="student-pilot-dim"></div><div id="student-pilot-highlight"></div><div id="student-pilot-caption"></div>';
    document.body.appendChild(el);
  }, OVERLAY_CSS);
}

export async function setSceneOverlay(page, { caption, highlightKey, pickHighlight, ctx }) {
  await page.evaluate(
    ({ caption, highlightKey, pickSource, studentName, pad }) => {
      const cap = document.getElementById("student-pilot-caption");
      const hl = document.getElementById("student-pilot-highlight");
      const dim = document.getElementById("student-pilot-dim");
      if (cap) cap.textContent = caption || "";
      const hide = () => {
        hl?.classList.remove("visible");
        dim?.classList.remove("active");
      };
      if (!highlightKey) {
        hide();
        return;
      }
      const pick = new Function("return (" + pickSource + ")")();
      const el = pick(highlightKey, studentName);
      if (!el || !hl) {
        hide();
        return;
      }
      const r = el.getBoundingClientRect();
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.classList.add("visible");
      dim?.classList.add("active");
    },
    {
      caption,
      highlightKey,
      pickSource: pickHighlight.toString(),
      studentName: ctx?.demoName || expectedDemoStudentName(),
      pad: ctx?.mobile ? 5 : 6,
    }
  );
}

async function tapHighlightCenter(page, highlightKey, pickHighlight, ctx) {
  const pos = await page.evaluate(
    ({ key, pickSource, studentName }) => {
      const pick = new Function("return (" + pickSource + ")")();
      const el = pick(key, studentName);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { key: highlightKey, pickSource: pickHighlight.toString(), studentName: ctx.demoName }
  );
  if (pos) await clickAt(page, pos.x, pos.y, { mobile: ctx.mobile });
}

function defaultVerify({ frameCount, durationSec, unique, earlyChanged, midChanged, lateChanged, rules, signals }) {
  const errors = [];
  const minDur = rules?.durationMin ?? 45;
  const maxDur = rules?.durationMax ?? 95;
  const minUnique = rules?.minUniqueFrames ?? Math.min(8, Math.floor(frameCount * 0.06));

  if (durationSec == null || durationSec < minDur || durationSec > maxDur) {
    errors.push(`duration ${durationSec}s outside ${minDur}–${maxDur}s`);
  }
  if (unique < minUnique) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if ((!earlyChanged || !midChanged || !lateChanged) && unique < (rules?.minUniqueIfStatic ?? 12)) {
    errors.push("video appears static in early/mid/late segments");
  }

  if (rules?.requiredSignals) {
    for (const [key, required] of Object.entries(rules.requiredSignals)) {
      if (required && !signals?.[key]) errors.push(`missing signal: ${key}`);
    }
  }

  return { ok: errors.length === 0, errors, uniqueFrameHashes: unique };
}

export async function runCapture(workflow, { slug, viewport, baseUrl }) {
  assertAllowedBaseUrl(baseUrl);
  const paths = workflowPaths(slug, viewport);
  const mobile = isMobileViewport(viewport);
  const pickHighlight = workflow.pickHighlight;
  const account = resolveStudentDemoAccount();
  const demoName = expectedDemoStudentName();

  if (existsSync(paths.framesDir)) rmSync(paths.framesDir, { recursive: true, force: true });
  mkdirSync(paths.framesDir, { recursive: true });

  let frameIndex = 0;
  const captureFrame = async (page) => {
    const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
    frameIndex++;
    await page.screenshot({ path: join(paths.framesDir, name), type: "png", animations: "disabled" });
  };

  const holdScene = async (page, scene, ctx) => {
    await setSceneOverlay(page, {
      caption: scene.caption,
      highlightKey: scene.highlight,
      pickHighlight,
      ctx,
    });
    if (scene.cursor && !mobile) {
      await moveCursor(page, scene.cursor.x, scene.cursor.y, { mobile });
    }
    const frameTarget = Math.max(1, Math.round((scene.holdMs / 1000) * FPS));
    for (let tick = 0; tick < frameTarget; tick++) {
      if (scene.cursor && !mobile && tick % 4 === 0) {
        await moveCursor(
          page,
          scene.cursor.x + Math.sin(tick * 0.2) * 4,
          scene.cursor.y + Math.cos(tick * 0.15) * 3,
          { mobile }
        );
      }
      await captureFrame(page);
      if (tick < frameTarget - 1) await page.waitForTimeout(40);
    }
  };

  const runAction = async (page, scene, ctx) => {
    const name = scene.action;
    if (!name) return;
    if (BUILTIN_ACTIONS[name]) {
      await BUILTIN_ACTIONS[name](ctx);
      return;
    }
    const custom = workflow.actions?.[name];
    if (custom) {
      await custom(ctx);
      return;
    }
    if (name === "tap-highlight" && scene.highlight) {
      await tapHighlightCenter(page, scene.highlight, pickHighlight, ctx);
    }
  };

  const signals = {};
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: viewportFor(viewport), locale: "he-IL" });
  const page = await context.newPage();

  const ctx = {
    page,
    baseUrl,
    viewport,
    mobile,
    account,
    demoName,
    signals,
    paths,
  };

  await installCursorOverlay(page, { mobile });
  if (typeof workflow.setup === "function") {
    await workflow.setup(ctx);
  } else {
    await ensureStudentSession(page, baseUrl, account);
  }
  await page.waitForTimeout(600);
  await installCaptureOverlays(page);

  for (const scene of workflow.scenes) {
    await holdScene(page, scene, ctx);
    if (scene.action) {
      await runAction(page, scene, ctx);
      await page.waitForTimeout(scene.postActionMs ?? 500);
      await installCaptureOverlays(page);
    }
    if (typeof workflow.trackScene === "function") {
      await workflow.trackScene(ctx, scene);
    }
  }

  await browser.close();

  return {
    frameCount: frameIndex,
    signals,
    endState: { finalCaption: workflow.scenes[workflow.scenes.length - 1]?.caption },
  };
}

export function isPreflightFresh(preflightPath, maxAgeMs = 15 * 60 * 1000) {
  if (!existsSync(preflightPath)) return false;
  try {
    const recent = JSON.parse(readFileSync(preflightPath, "utf8"));
    const ageMs = Date.now() - new Date(recent.at).getTime();
    return recent.ok && ageMs < maxAgeMs;
  } catch {
    return false;
  }
}

export async function runCaptureWithVerify(workflow, opts) {
  const { slug, viewport, baseUrl, skipPreflight = false } = opts;
  const paths = workflowPaths(slug, viewport);

  if (!skipPreflight && !isPreflightFresh(paths.preflightPath)) {
    const pf = await runPreflight(workflow, { slug, viewport, baseUrl });
    if (!pf.ok) {
      const err = new Error("Preflight failed");
      err.preflight = pf;
      throw err;
    }
  }

  const ffmpegPath = resolveFfmpegSync();
  if (!ffmpegPath) throw new Error("ffmpeg not available");

  if (existsSync(paths.outWebm)) unlinkSync(paths.outWebm);

  const startedAt = Date.now();
  const capture = await runCapture(workflow, { slug, viewport, baseUrl });
  encodeFramesToWebm(
    ffmpegPath,
    paths.framesDir,
    paths.outWebm,
    capture.frameCount,
    FPS,
    isMobileViewport(viewport) ? "1.2M" : "1.4M"
  );
  const durationSec = ffprobeDuration(ffmpegPath, paths.outWebm);
  const { unique, whiteish, earlyChanged, midChanged, lateChanged } = analyzeFrames(
    paths.framesDir,
    capture.frameCount
  );
  const verification = defaultVerify({
    frameCount: capture.frameCount,
    durationSec,
    unique,
    earlyChanged,
    midChanged,
    lateChanged,
    rules: workflow.verifyRules,
    signals: capture.signals,
  });

  const meta = {
    title: workflow.title,
    workflowId: workflow.id,
    slug,
    viewport,
    capturedAt: new Date().toISOString(),
    baseUrl,
    outputWebm: paths.outWebm.replace(/\\/g, "/"),
    fileSizeBytes: statSync(paths.outWebm).size,
    wallClockSec: (Date.now() - startedAt) / 1000,
    frameCount: capture.frameCount,
    fps: FPS,
    decodedDurationSec: durationSec,
    signals: capture.signals,
    endState: capture.endState,
    verification,
    captureOnlyOverlays: true,
    publishedToPublic: false,
    badFrames: { whiteishFrameCount: whiteish },
  };

  mkdirSync(paths.outDir, { recursive: true });
  writeFileSync(paths.metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  if (!verification.ok) {
    const err = new Error("Verification failed");
    err.meta = meta;
    throw err;
  }

  return meta;
}

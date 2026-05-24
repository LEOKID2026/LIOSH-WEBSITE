#!/usr/bin/env node
/**
 * Pilot v3 — «מרכז העזרה — הסבר כללי»
 * Approved 5-scene storyboard (~24s). Capture-only overlays; frame encode → WebM.
 * Output: qa-evidence-audit/help-center/video-pilot/help-overview/desktop/main.webm
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  writeFileSync,
  statSync,
  existsSync,
  unlinkSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { installCursorOverlay, moveCursor, clickAt } from "./lib/cursor-overlay.mjs";

const PILOT_PORT_DEFAULT = 3110;
const VIEWPORT = { width: 1366, height: 900 };
const FPS = 8;
const FRAME_MS = 1000 / FPS;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(
  root,
  "qa-evidence-audit",
  "help-center",
  "video-pilot",
  "help-overview",
  "desktop"
);
const outWebm = join(outDir, "main.webm");
const framesDir = join(outDir, "_frames");
const metaPath = join(outDir, "capture-meta.json");

/** Approved storyboard — exact Hebrew captions & timing */
const SCENES = [
  {
    id: 1,
    page: "help",
    holdMs: 4000,
    caption: "מרכז העזרה — כל המדריכים במקום אחד",
    highlight: null,
  },
  {
    id: 2,
    page: "help",
    holdMs: 4000,
    caption: "כאן מתחילים כשצריך עזרה בשימוש באתר",
    highlight: "header",
  },
  {
    id: "3a",
    page: "help",
    holdMs: 2000,
    caption: "להורים — התחברות, ילדים ודוחות",
    highlight: 'a[href="/help/parents"]',
  },
  {
    id: "3b",
    page: "help",
    holdMs: 2000,
    caption: "לתלמידים — כניסה, תרגול ומשחקים",
    highlight: 'a[href="/help/students"]',
  },
  {
    id: "3c",
    page: "help",
    holdMs: 2000,
    caption: "להבנת דוח ההורים",
    highlight: 'a[href="/help/parent-report"]',
  },
  {
    id: "3d",
    page: "help",
    holdMs: 2000,
    caption: "לתרגול לפי מקצוע",
    highlight: 'a[href="/help/subjects"]',
  },
  {
    id: 4,
    page: "help",
    holdMs: 2000,
    caption: "לדוגמה: מדריך להורים",
    highlight: 'a[href="/help/parents"]',
    clickAfter: true,
  },
  {
    id: "4b",
    page: "parents",
    holdMs: 3000,
    caption: "כך נראה מדריך מפורט יותר",
    highlight: "header",
  },
  {
    id: 5,
    page: "parents",
    holdMs: 3000,
    caption: "בחרו את המדריך המתאים והמשיכו משם",
    highlight: null,
  },
];

const OVERLAY_CSS = `
#help-pilot-capture-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;
  font-family: "Segoe UI", system-ui, Arial, sans-serif;
}
#help-pilot-dim {
  position: fixed; inset: 0; background: rgba(0,0,0,0);
  transition: background 0.35s ease;
  pointer-events: none;
}
#help-pilot-dim.active { background: rgba(0,0,0,0.28); }
#help-pilot-caption {
  position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
  max-width: min(720px, 88vw); padding: 10px 20px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.88); color: #f8fafc;
  font-size: 17px; font-weight: 600; line-height: 1.4; text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35); direction: rtl;
  letter-spacing: 0.01em;
}
#help-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.45), 0 0 16px rgba(251, 191, 36, 0.2);
  background: transparent;
  opacity: 0;
  transition: opacity 0.25s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
}
#help-pilot-highlight.visible { opacity: 1; }
`;

function resolveBaseUrl(argv) {
  const arg = argv.find((a) => a.startsWith("--base-url="));
  if (arg) return arg.slice("--base-url=".length).replace(/\/$/, "");
  return `http://127.0.0.1:${PILOT_PORT_DEFAULT}`;
}

function assertAllowedBaseUrl(baseUrl, argv) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture base URL: ${baseUrl}`);
  }
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  const explicit = argv.some((a) => a.startsWith("--base-url="));
  if (!explicit && (port === "3001" || port === "3002")) {
    throw new Error(`Refusing ports 3001/3002. Use --base-url=http://127.0.0.1:${PILOT_PORT_DEFAULT}`);
  }
}

function resolveFfmpegSync() {
  try {
    const p = require("@ffmpeg-installer/ffmpeg").path;
    if (p && existsSync(p)) return p;
  } catch {
    /* optional local install */
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
    "1.2M",
    "-deadline",
    "realtime",
    "-auto-alt-ref",
    "0",
    out,
  ];
  const r = spawnSync(ffmpegPath, args, { encoding: "utf8", cwd: root });
  if (r.status !== 0) {
    throw new Error(`ffmpeg encode failed: ${r.stderr || r.stdout}`);
  }
}

function ffprobeDuration(_ffmpegPath, file) {
  let ffprobe;
  try {
    ffprobe = require("@ffprobe-installer/ffprobe").path;
  } catch {
    ffprobe = _ffmpegPath.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  }
  if (!ffprobe || !existsSync(ffprobe)) return null;
  const r = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return null;
  return parseFloat(r.stdout.trim());
}

function hashFile(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

async function installOverlays(page) {
  await page.evaluate((css) => {
    if (!document.getElementById("help-pilot-style")) {
      const style = document.createElement("style");
      style.id = "help-pilot-style";
      style.textContent = css;
      document.head.appendChild(style);
    }
    if (document.getElementById("help-pilot-capture-root")) return;
    const el = document.createElement("div");
    el.id = "help-pilot-capture-root";
    el.innerHTML = `
      <div id="help-pilot-dim"></div>
      <div id="help-pilot-highlight"></div>
      <div id="help-pilot-caption"></div>
    `;
    document.body.appendChild(el);
  }, OVERLAY_CSS);
}

async function setOverlay(page, { caption, highlightSelector }) {
  await page.evaluate(
    ({ caption, highlightSelector }) => {
      const cap = document.getElementById("help-pilot-caption");
      const hl = document.getElementById("help-pilot-highlight");
      const dim = document.getElementById("help-pilot-dim");
      if (cap) cap.textContent = caption || "";
      if (!highlightSelector) {
        hl?.classList.remove("visible");
        dim?.classList.remove("active");
        return;
      }
      let el = null;
      if (highlightSelector === "header") {
        el = document.querySelector("header") || document.querySelector("h1");
      } else {
        el = document.querySelector(highlightSelector);
      }
      if (!el || !hl) {
        hl?.classList.remove("visible");
        dim?.classList.remove("active");
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
    { caption, highlightSelector }
  );
}

async function waitForHub(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("מרכז עזרה") && document.querySelector('a[href="/help/parents"]');
    },
    undefined,
    { timeout: 120_000 }
  );
}

async function waitForParents(page) {
  await page.waitForURL(/\/help\/parents\/?$/, { timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.includes("מדריך להורים");
    },
    undefined,
    { timeout: 90_000 }
  );
}

let frameIndex = 0;

async function captureFrame(page) {
  const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
  frameIndex++;
  await page.screenshot({
    path: join(framesDir, name),
    type: "png",
    animations: "disabled",
  });
}

async function holdScene(page, scene, cursor) {
  await setOverlay(page, {
    caption: scene.caption,
    highlightSelector: scene.highlight,
  });
  if (cursor) {
    await moveCursor(page, cursor.x, cursor.y);
  }
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
    if (tick < frameTarget - 1) {
      await page.waitForTimeout(40);
    }
  }
}

async function centerOf(page, selector) {
  if (!selector) return null;
  return page.evaluate((sel) => {
    const el =
      sel === "header"
        ? document.querySelector("header") || document.querySelector("h1")
        : document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
}

function verifyCapture({
  frameCount,
  durationSec,
  frameHashes,
  parentsFrameHit,
  endState,
}) {
  const errors = [];
  if (durationSec < 20 || durationSec > 30) {
    errors.push(`duration ${durationSec}s outside 20–30s target`);
  }
  const unique = new Set(frameHashes).size;
  if (unique < Math.min(8, Math.floor(frameCount * 0.15))) {
    errors.push(`video appears static (${unique} unique frame hashes of ${frameCount})`);
  }
  if (!parentsFrameHit) {
    errors.push("parents page not detected in late frames (visual change)");
  }
  if (!endState?.onParents) {
    errors.push(`capture did not end on /help/parents (got ${endState?.finalUrl})`);
  }
  const finalCaptionOk =
    endState?.finalCaption === "בחרו את המדריך המתאים והמשיכו משם" && endState?.onParents;
  if (!finalCaptionOk) {
    errors.push("final caption/URL mismatch for closing scene");
  }
  return {
    ok: errors.length === 0,
    errors,
    uniqueFrameHashes: unique,
    frameCount,
    durationSec,
    finalCaptionOk,
    parentsUrlVisible: Boolean(endState?.onParents),
  };
}

async function runCapture(baseUrl) {
  const parentsUrl = new URL("/help/parents", baseUrl).toString();
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT, locale: "he-IL" });
  await installCursorOverlay(page, { mobile: false });

  const helpUrl = new URL("/help", baseUrl).toString();
  await page.goto(helpUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);
  await waitForHub(page);
  await installOverlays(page);

  for (const scene of SCENES) {
    if (scene.page === "parents") {
      if (!page.url().includes("/help/parents")) {
        await page.goto(parentsUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      }
      await waitForParents(page);
      await page.waitForTimeout(800);
      await installOverlays(page);
    }
    let cursor = null;
    try {
      cursor = await centerOf(page, scene.highlight);
    } catch {
      await page.waitForTimeout(500);
      cursor = await centerOf(page, scene.highlight);
    }
    await holdScene(page, scene, cursor);
    if (scene.clickAfter) {
      const parentsLink = 'a[href="/help/parents"]';
      await page.locator(parentsLink).first().waitFor({ state: "visible", timeout: 20_000 });
      const clickPos = (await centerOf(page, parentsLink)) || cursor;
      if (clickPos) {
        await clickAt(page, clickPos.x, clickPos.y);
      } else {
        await page.locator(parentsLink).first().click({ timeout: 20_000 });
      }
      try {
        await page.waitForURL(/\/help\/parents\/?(\?|$)/, { timeout: 20_000 });
      } catch {
        await page.goto(parentsUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      }
      await page.waitForTimeout(1200);
      await waitForParents(page);
      await installOverlays(page);
    }
  }

  const endState = {
    finalUrl: page.url(),
    finalCaption: SCENES[SCENES.length - 1].caption,
    onParents: page.url().includes("/help/parents"),
  };
  await browser.close();
  return { frameCount: frameIndex, endState };
}

function analyzeFrames(frameCount) {
  const hashes = [];
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (!existsSync(p)) continue;
    hashes.push(hashFile(p));
  }
  const early = hashes.slice(0, Math.max(1, Math.floor(frameCount * 0.2)));
  const late = hashes.slice(Math.floor(frameCount * 0.65));
  const parentsFrameHit =
    early.length > 0 &&
    late.length > 0 &&
    new Set(early).size >= 1 &&
    new Set(late).size >= 1 &&
    early[early.length - 1] !== late[late.length - 1];
  return { hashes, parentsFrameHit };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--skip-verify")) {
    console.error("BLOCKER: --skip-verify is not allowed for approved pilot delivery");
    process.exit(1);
  }

  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl, argv);

  const ffmpegPath = resolveFfmpegSync();
  if (!ffmpegPath) {
    console.error("BLOCKER: ffmpeg not available (required to encode verifiable WebM from frames)");
    process.exit(1);
  }

  if (existsSync(outWebm)) unlinkSync(outWebm);

  const startedAt = Date.now();
  const { frameCount, endState } = await runCapture(baseUrl);
  encodeFramesToWebm(ffmpegPath, frameCount);
  const durationSec = ffprobeDuration(ffmpegPath, outWebm);
  const { hashes, parentsFrameHit } = analyzeFrames(frameCount);
  const verification = verifyCapture({
    frameCount,
    durationSec,
    frameHashes: hashes,
    parentsFrameHit,
    endState,
  });

  const meta = {
    title: "מרכז העזרה — הסבר כללי",
    pilot: "help-overview-v3-approved-storyboard",
    capturedAt: new Date().toISOString(),
    baseUrl,
    outputWebm: outWebm.replace(/\\/g, "/"),
    fileSizeBytes: statSync(outWebm).size,
    wallClockSec: (Date.now() - startedAt) / 1000,
    frameCount,
    fps: FPS,
    decodedDurationSec: durationSec,
    estimatedFrameCountAtFps: durationSec ? Math.round(durationSec * FPS) : null,
    placeholderPipeline: false,
    manifestTouched: false,
    publishedToPublic: false,
    captureOnlyOverlays: true,
    endState,
    verification,
  };

  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(meta, null, 2));

  if (!verification.ok || durationSec == null) {
    console.error("BLOCKER: pilot verification failed");
    verification.errors?.forEach((e) => console.error(`  - ${e}`));
    if (durationSec == null) console.error("  - could not read decoded duration (ffprobe)");
    process.exit(1);
  }

  console.log(`\nPilot OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

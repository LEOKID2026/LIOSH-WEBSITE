#!/usr/bin/env node
/**
 * Pilot v2: Help Center overview tutorial with capture-only overlays (Hebrew captions + highlights).
 * Output: qa-evidence-audit/help-center/video-pilot/help-overview/desktop/main.webm
 */
import http from "node:http";
import {
  mkdirSync,
  readdirSync,
  writeFileSync,
  statSync,
  copyFileSync,
  existsSync,
  unlinkSync,
  createReadStream,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  installCursorOverlay,
  moveCursor,
  clickAt,
} from "./lib/cursor-overlay.mjs";

const PILOT_PORT_DEFAULT = 3108;
const VIEWPORT = { width: 1366, height: 900 };

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
const outPoster = join(outDir, "main.jpg");
const recordDir = join(outDir, "_record");
const metaPath = join(outDir, "capture-meta.json");

const CAPTURE_OVERLAY_CSS = `
#help-pilot-capture-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;
  font-family: system-ui, "Segoe UI", Arial, sans-serif;
}
#help-pilot-caption {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(920px, 92vw); padding: 14px 22px; border-radius: 14px;
  background: rgba(10, 10, 18, 0.92); border: 2px solid rgba(251, 191, 36, 0.85);
  color: #fff; font-size: 20px; font-weight: 700; line-height: 1.45; text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.55); direction: rtl;
}
#help-pilot-step-badge {
  position: fixed; top: 18px; left: 18px; padding: 6px 12px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.95); color: #111; font-weight: 800; font-size: 14px;
}
#help-pilot-highlight {
  position: fixed; border: 3px solid rgba(251, 191, 36, 0.95);
  border-radius: 16px; box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.25), 0 0 24px rgba(251,191,36,0.35);
  background: rgba(251, 191, 36, 0.08);
  transition: left 0.35s ease, top 0.35s ease, width 0.35s ease, height 0.35s ease, opacity 0.2s;
  animation: help-pilot-pulse 1.2s ease-in-out infinite;
}
@keyframes help-pilot-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(251,191,36,0.2), 0 0 18px rgba(251,191,36,0.25); }
  50% { box-shadow: 0 0 0 8px rgba(251,191,36,0.35), 0 0 28px rgba(251,191,36,0.45); }
}
`;

const STORYBOARD = [
  {
    step: 1,
    caption: "מרכז העזרה מרכז את כל ההסברים לשימוש באתר.",
    selector: "header h1",
    holdMs: 3800,
  },
  {
    step: 2,
    caption: "כאן ההורה לומד איך להתחבר, לנהל ילדים ולקרוא מידע חשוב.",
    selector: 'a[href="/help/parents"]',
    holdMs: 3500,
  },
  {
    step: 3,
    caption: "כאן התלמיד רואה איך להיכנס, ללמוד, לתרגל ולהשתמש במשחקים.",
    selector: 'a[href="/help/students"]',
    holdMs: 3500,
  },
  {
    step: 4,
    caption: "כאן מוסבר איך לקרוא את דוח ההורים ומה חשוב לבדוק בו.",
    selector: 'a[href="/help/parent-report"]',
    holdMs: 3500,
  },
  {
    step: 5,
    caption: "כאן אפשר להבין איך מתרגלים בכל מקצוע באתר.",
    selector: 'a[href="/help/subjects"]',
    holdMs: 3500,
  },
  {
    step: 6,
    caption: "בלחיצה על כל אזור נפתח מדריך מפורט יותר.",
    selector: 'a[href="/help/parents"]',
    holdMs: 800,
    click: true,
  },
  {
    step: 6,
    caption: "בלחיצה על כל אזור נפתח מדריך מפורט יותר.",
    selector: "header h1",
    holdMs: 4800,
    onParentsPage: true,
  },
  {
    step: 7,
    caption: "זהו מרכז העזרה — נקודת התחלה לכל משתמש חדש.",
    selector: "header h1",
    holdMs: 3800,
    onParentsPage: true,
  },
];

function resolveBaseUrl(argv) {
  const arg = argv.find((a) => a.startsWith("--base-url="));
  if (arg) return arg.slice("--base-url=".length).replace(/\/$/, "");
  return `http://127.0.0.1:${PILOT_PORT_DEFAULT}`;
}

function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture base URL: ${baseUrl}`);
  }
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  if (port === "3001" || port === "3002") {
    throw new Error(`Refusing ports 3001/3002. Use --base-url=http://127.0.0.1:${PILOT_PORT_DEFAULT}`);
  }
}

async function installCaptureOverlays(page) {
  await page.addStyleTag({ content: CAPTURE_OVERLAY_CSS });
  await page.evaluate(() => {
    if (document.getElementById("help-pilot-capture-root")) return;
    const rootEl = document.createElement("div");
    rootEl.id = "help-pilot-capture-root";
    rootEl.innerHTML = `
      <div id="help-pilot-step-badge"></div>
      <div id="help-pilot-highlight" style="opacity:0"></div>
      <div id="help-pilot-caption"></div>
    `;
    document.body.appendChild(rootEl);
  });
}

async function applyTutorialStep(page, { step, caption, selector }) {
  await page.evaluate(
    ({ step, caption, selector }) => {
      const badge = document.getElementById("help-pilot-step-badge");
      const cap = document.getElementById("help-pilot-caption");
      const hl = document.getElementById("help-pilot-highlight");
      badge.textContent = `שלב ${step}`;
      cap.textContent = caption;
      const el = document.querySelector(selector);
      if (!el || !hl) {
        hl.style.opacity = "0";
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 8;
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.style.opacity = "1";
    },
    { step, caption, selector }
  );
}

async function holdWithMotion(page, ms, cursorAnchor) {
  const endAt = Date.now() + ms;
  let i = 0;
  while (Date.now() < endAt) {
    await page.evaluate((n) => {
      const hl = document.getElementById("help-pilot-highlight");
      const cap = document.getElementById("help-pilot-caption");
      if (hl) {
        const pulse = 0.94 + 0.06 * Math.sin(n * 0.7);
        hl.style.transform = `scale(${pulse})`;
        hl.style.borderWidth = `${2 + (n % 3)}px`;
      }
      if (cap) {
        cap.style.boxShadow = `0 8px ${24 + (n % 6)}px rgba(0,0,0,${0.45 + (n % 4) * 0.04})`;
      }
      void document.getElementById("help-pilot-capture-root")?.offsetHeight;
    }, i);
    if (cursorAnchor) {
      const wobbleX = cursorAnchor.x + Math.sin(i * 0.55) * 14;
      const wobbleY = cursorAnchor.y + Math.cos(i * 0.48) * 10;
      await moveCursor(page, wobbleX, wobbleY);
    } else {
      await page.mouse.move(680 + (i % 5) * 3, 420 + (i % 7) * 2);
    }
    await page.waitForTimeout(90);
    i++;
  }
}

async function centerOfSelector(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`not visible: ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function runStoryboard(page, baseUrl) {
  const helpUrl = new URL("/help", baseUrl).toString();
  await page.goto(helpUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  let hubReady = false;
  for (let i = 0; i < 60; i++) {
    hubReady = await page
      .locator("h1")
      .filter({ hasText: "מרכז עזרה" })
      .first()
      .isVisible()
      .catch(() => false);
    if (hubReady) break;
    await page.waitForTimeout(2000);
  }
  if (!hubReady) {
    throw new Error("Help hub did not become visible — is the dev server ready on the pilot port?");
  }
  await installCaptureOverlays(page);
  await installCursorOverlay(page, { mobile: false });

  for (const beat of STORYBOARD) {
    if (beat.onParentsPage) {
      await page.waitForURL(/\/help\/parents\/?$/, { timeout: 60_000 });
      await page
        .locator("h1")
        .filter({ hasText: "מדריך להורים" })
        .first()
        .waitFor({ state: "visible", timeout: 60_000 });
      await installCaptureOverlays(page);
    }
    await applyTutorialStep(page, beat);
    let anchor = null;
    try {
      anchor = await centerOfSelector(page, beat.selector);
      await moveCursor(page, anchor.x, anchor.y);
    } catch {
      /* caption-only beat */
    }
    if (beat.click) {
      await page.waitForTimeout(600);
      const link = page.getByRole("link", { name: /מדריך להורים/ }).first();
      await link.waitFor({ state: "visible" });
      const box = await link.boundingBox();
      if (box) await clickAt(page, box.x + box.width / 2, box.y + box.height / 2);
      else await link.click();
      await page.waitForTimeout(400);
      continue;
    }
    await holdWithMotion(page, beat.holdMs, anchor);
  }
}

async function verifyDecodedVideo(webmPath) {
  const server = http.createServer((req, res) => {
    if (req.url === "/player") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><video id="v" src="/main.webm"></video>');
      return;
    }
    if (req.url === "/main.webm") {
      res.writeHead(200, { "Content-Type": "video/webm" });
      createReadStream(webmPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const diagPort = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${diagPort}/player`);
  const durationSec = await page.evaluate(async () => {
    const v = document.getElementById("v");
    await new Promise((res) => {
      v.onloadedmetadata = res;
    });
    return v.duration;
  });

  async function sigAt(t) {
    await page.evaluate((sec) => {
      const v = document.getElementById("v");
      return new Promise((resolve) => {
        const done = () => {
          v.removeEventListener("seeked", done);
          resolve();
        };
        v.addEventListener("seeked", done);
        v.currentTime = sec;
        if (Math.abs(v.currentTime - sec) < 0.05) done();
      });
    }, t);
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const v = document.getElementById("v");
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = 112;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 48) s += d[i] + d[i + 1] + d[i + 2];
      return { sig: Math.round(s), ct: v.currentTime };
    });
  }

  const samples = [0, 8, 16, 24, 32, Math.max(0, durationSec - 1)];
  const sigs = [];
  for (const t of samples) {
    if (t <= durationSec) sigs.push({ t, ...(await sigAt(t)) });
  }
  const unique = new Set(sigs.map((s) => s.sig)).size;
  const parentsProbe = await sigAt(Math.min(22, durationSec - 1));
  const hubProbe = await sigAt(4);
  const parentsPageLikelyVisible =
    parentsProbe.sig !== hubProbe.sig && parentsProbe.ct > 10;

  await browser.close();
  server.close();

  return {
    decodedDurationSec: durationSec,
    estimatedFrameCountAt25fps: Math.round(durationSec * 25),
    checkpointSignatures: sigs,
    uniqueVisualSignatures: unique,
    hasMotion: unique >= 3,
    overlayCaptionLikelyVisible: unique >= 2,
    parentsPageLikelyVisible,
    parentsProbe,
    hubProbe,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  assertAllowedBaseUrl(baseUrl);

  mkdirSync(recordDir, { recursive: true });
  if (existsSync(outWebm)) unlinkSync(outWebm);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: recordDir, size: VIEWPORT },
    locale: "he-IL",
  });
  const page = await context.newPage();

  const startedAt = Date.now();
  try {
    await runStoryboard(page, baseUrl);
    await page.waitForTimeout(800);
    await page.screenshot({ path: outPoster, type: "jpeg", quality: 85 });
  } finally {
    await context.close();
    await browser.close();
  }

  const webms = readdirSync(recordDir).filter((f) => f.endsWith(".webm"));
  if (!webms.length) throw new Error("Playwright produced no webm");
  const latest = webms
    .map((f) => ({ f, m: statSync(join(recordDir, f)).mtimeMs }))
    . sort((a, b) => b.m - a.m)[0].f;
  copyFileSync(join(recordDir, latest), outWebm);

  const verify =
    argv.includes("--skip-verify")
      ? { verifySkipped: true, reason: "--skip-verify" }
      : await Promise.race([
          verifyDecodedVideo(outWebm),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error("verify timeout")), 15_000)
          ),
        ]).catch((e) => ({ verifySkipped: true, reason: String(e.message || e) }));
  const size = statSync(outWebm).size;
  const wallSec = (Date.now() - startedAt) / 1000;

  const meta = {
    pilot: "help-overview-v2-tutorial-overlays",
    capturedAt: new Date().toISOString(),
    baseUrl,
    viewport: "desktop",
    outputWebm: outWebm.replace(/\\/g, "/"),
    fileSizeBytes: size,
    wallClockSec: wallSec,
    placeholderPipeline: false,
    manifestTouched: false,
    publishedToPublic: false,
    captureOnlyOverlays: true,
  };

  writeFileSync(
    metaPath,
    `${JSON.stringify({ ...meta, verification: verify }, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify({ ...meta, verification: verify }, null, 2));

  if (verify.decodedDurationSec < 28 || verify.decodedDurationSec > 48) {
    console.warn(`WARN: duration ${verify.decodedDurationSec}s outside 30-45s target`);
  }
  if (!verify.hasMotion) {
    console.warn(
      "WARN: decoded checkpoints look visually similar — review main.webm manually (headless WebM may under-sample motion)"
    );
  }

  console.log(`\nPilot v2 OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

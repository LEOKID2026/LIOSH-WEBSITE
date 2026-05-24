#!/usr/bin/env node
/**
 * Video #5 desktop capture — short vs detailed parent report (no Copilot).
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
  VIEWPORT,
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
  OVERLAY_CSS,
} from "./shared-how-to-read-report-desktop.mjs";

const require = createRequire(import.meta.url);

let frameIndex = 0;
let demoStudentId = null;
let copilotScrolled = false;
let copilotFocusedDuringCapture = false;

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
        case "short-header": {
          const h1 = document.querySelector("h1");
          el = h1?.innerText?.includes("דוח") ? h1.closest("div") || h1 : document.querySelector("h1, h2");
          break;
        }
        case "short-kpi-cards": {
          const first = document.querySelector(".parent-report-print-summary-card");
          el = first?.closest(".grid") || first?.parentElement;
          break;
        }
        case "short-diagnostic":
          el = [...document.querySelectorAll("p")].find((p) =>
            p.textContent?.includes("מה הכי בולט עכשיו")
          )?.closest("div");
          break;
        case "short-subjects": {
          const cards = [...document.querySelectorAll(".parent-report-print-summary-card")];
          const subject = cards.find(
            (c) => c.innerText?.includes("חשבון") || c.innerText?.includes("🧮")
          );
          el = subject?.closest(".grid") || subject?.parentElement;
          break;
        }
        case "detailed-link":
          el = [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("דוח מקיף"));
          break;
        case "detailed-header":
          el = document.querySelector("h1") || document.querySelector("h2");
          break;
        case "detailed-period-summary":
          el = [...document.querySelectorAll("h2")]
            .find((h) => h.textContent?.includes("סיכום לתקופה"))
            ?.closest("section, .pr-detailed-section, div");
          break;
        case "detailed-activity":
          el = [...document.querySelectorAll("h2")]
            .find((h) => h.textContent?.includes("מה עשינו בתקופה"))
            ?.closest("section, .pr-detailed-section, div");
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

async function trackCopilotState(page) {
  const state = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="שאלה על הדוח"]');
    return {
      focused: !!(input && document.activeElement === input),
    };
  });
  if (state.focused) copilotFocusedDuringCapture = true;
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
    await trackCopilotState(page);
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
      return (
        !t.includes("טוען דוח מקיף") &&
        t.includes("סיכום לתקופה") &&
        t.includes("מה עשינו בתקופה")
      );
    },
    undefined,
    { timeout: 90_000 }
  );
}

async function scrollToSection(page, titlePart) {
  await page.evaluate((part) => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent?.includes(part));
    if (h) {
      h.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, titlePart);
  await page.waitForTimeout(350);
  const scrolledCopilot = await page.evaluate(() => {
    const copilot = [...document.querySelectorAll("div")].find((d) =>
      d.innerText?.trim().startsWith("שאלו על הדוח")
    );
    if (!copilot) return false;
    const r = copilot.getBoundingClientRect();
    return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.2;
  });
  if (scrolledCopilot) copilotScrolled = true;
}

async function runSceneAction(page, scene, parent, baseUrl, context) {
  switch (scene.action) {
    case "login": {
      await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded" });
      const email = page.getByPlaceholder("אימייל הורה");
      await email.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null);
      if (page.url().includes("/parent/dashboard")) {
        return { landed: "dashboard" };
      }
      await email.fill(parent.email);
      await page.getByPlaceholder("סיסמה").fill(parent.password);
      const submitButton = page.locator('form button[type="submit"]');
      const pos = await centerOf(page, "login-submit");
      try {
        await Promise.all([
          page.waitForURL("**/parent/dashboard**", { timeout: 60_000 }),
          pos ? clickAt(page, pos.x, pos.y) : submitButton.click(),
        ]);
      } catch {
        await authenticateParent({
          context,
          page,
          account: parent,
          baseUrl,
          mode: "ui",
          log: () => {},
        });
      }
      return { landed: "dashboard" };
    }
    case "open-short-report": {
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME }).first();
      await card.scrollIntoViewIfNeeded();
      const link = card.locator('a[href*="parent-report"]').first();
      const href = await link.getAttribute("href");
      const url = new URL(href, baseUrl);
      url.searchParams.set("period", "week");
      url.searchParams.set("source", "parent");
      const pos = await centerOf(page, "report-link");
      if (pos) await clickAt(page, pos.x, pos.y);
      else await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => {
          const p = window.location.pathname;
          return p.includes("/learning/parent-report") && !p.includes("detailed");
        },
        undefined,
        { timeout: 60_000 }
      );
      await waitShortReport(page);
      break;
    }
    case "scroll-short-diagnostic": {
      await page.evaluate(() => {
        const el = [...document.querySelectorAll("p")].find((p) =>
          p.textContent?.includes("מה הכי בולט עכשיו")
        );
        el?.closest("div")?.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await page.waitForTimeout(300);
      break;
    }
    case "open-detailed": {
      const u = new URL(page.url());
      u.pathname = "/learning/parent-report-detailed";
      u.searchParams.set("period", "week");
      const pos = await centerOf(page, "detailed-link");
      if (pos) await clickAt(page, pos.x, pos.y);
      await page.waitForTimeout(600);
      if (!page.url().includes("parent-report-detailed")) {
        await page.goto(u.toString(), { waitUntil: "domcontentloaded" });
      }
      await page.waitForFunction(
        () => window.location.pathname.includes("parent-report-detailed"),
        undefined,
        { timeout: 60_000 }
      );
      await waitDetailedReport(page);
      break;
    }
    case "scroll-detailed-summary":
      await scrollToSection(page, "סיכום לתקופה");
      break;
    case "scroll-detailed-activity":
      await scrollToSection(page, "מה עשינו בתקופה");
      break;
    default:
      break;
  }
}

async function runCapture(baseUrl, parent) {
  if (existsSync(framesDir)) rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  frameIndex = 0;
  copilotScrolled = false;
  copilotFocusedDuringCapture = false;

  const token = await getParentAccessToken(parent);
  let policyOk = false;
  for (let attempt = 0; attempt < 3 && !policyOk; attempt++) {
    try {
      await ensureParentPolicyAccepted(baseUrl, token, () => {});
      policyOk = true;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const listRes = await fetch(new URL("/api/parent/list-students", baseUrl).toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  const demo = (listJson.students || []).find((s) => s.full_name === DEMO_CHILD_NAME);
  if (!demo?.id) throw new Error(`Demo child ${DEMO_CHILD_NAME} not found`);
  demoStudentId = demo.id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: "he-IL" });
  const page = await context.newPage();
  await installCursorOverlay(page, { mobile: false });

  await page.goto(`${baseUrl}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  await installOverlays(page);

  const pagesSeen = {
    login: false,
    dashboard: false,
    shortReport: false,
    detailedReport: false,
  };
  const sectionsSeen = {
    shortHeader: false,
    shortKpi: false,
    shortDiagnostic: false,
    shortSubjects: false,
    detailedHeader: false,
    detailedPeriodSummary: false,
    detailedActivity: false,
  };
  const badFrames = { whiteish: 0, errorText: 0, loadingText: 0 };

  for (const scene of SCENES) {
    if (scene.page === "dashboard" && !pagesSeen.dashboard && scene.id >= 4) {
      await page.goto(`${baseUrl}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      await page.locator("h2:has-text('הילדים שלי')").waitFor({ timeout: 30_000 });
      const card = page.locator("div.rounded.border").filter({ hasText: DEMO_CHILD_NAME });
      await card.first().scrollIntoViewIfNeeded();
      pagesSeen.dashboard = true;
      await installOverlays(page);
    }

    if (scene.action?.startsWith("scroll-")) {
      await runSceneAction(page, scene, parent, baseUrl, context);
      await page.waitForTimeout(400);
      await installOverlays(page);
    }

    let cursor = null;
    if (
      scene.highlight === "login-submit" ||
      scene.highlight === "report-link" ||
      scene.highlight === "detailed-link"
    ) {
      cursor = await centerOf(page, scene.highlight).catch(() => null);
    }

    await holdScene(page, scene, cursor);

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
    if (url.includes("/learning/parent-report") && !url.includes("detailed")) {
      pagesSeen.shortReport = true;
      if (body.includes("דוח להורים") || body.includes("דוח")) sectionsSeen.shortHeader = true;
      if (body.includes("זמן כולל") && body.includes("שאלות")) sectionsSeen.shortKpi = true;
      if (body.includes("מה הכי בולט") || body.includes("תוצאות טובות"))
        sectionsSeen.shortDiagnostic = true;
      if (body.includes("חשבון") || body.includes("🧮")) sectionsSeen.shortSubjects = true;
    }
    if (url.includes("parent-report-detailed")) {
      pagesSeen.detailedReport = true;
      if (body.includes("דוח מקיף")) sectionsSeen.detailedHeader = true;
      if (body.includes("סיכום לתקופה")) sectionsSeen.detailedPeriodSummary = true;
      if (body.includes("מה עשינו בתקופה")) sectionsSeen.detailedActivity = true;
    }

    if (body.match(/אירעה שגיאה|Internal Server Error|500/)) badFrames.errorText++;
    if (body.includes("טוען דוח") || body.includes("טוען את הדוח")) badFrames.loadingText++;
  }

  await browser.close();
  return {
    frameCount: frameIndex,
    pagesSeen,
    sectionsSeen,
    badFrames,
    copilotScrolled,
    copilotFocusedDuringCapture,
    endState: { demoStudentId, finalCaption: SCENES[SCENES.length - 1].caption },
  };
}

function analyzeFrames(frameCount) {
  const hashes = [];
  let whiteish = 0;
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    hashes.push(createHash("sha256").update(buf).digest("hex"));
    if (buf.length < 12_000) whiteish++;
  }
  const unique = new Set(hashes).size;
  const early = hashes.slice(0, Math.max(3, Math.floor(frameCount * 0.08)));
  const mid = hashes.slice(Math.floor(frameCount * 0.35), Math.floor(frameCount * 0.55));
  const late = hashes.slice(Math.floor(frameCount * 0.75));
  return {
    unique,
    whiteish,
    earlyChanged: new Set(early).size > 1,
    midChanged: new Set(mid).size > 1,
    lateChanged: new Set(late).size > 1,
  };
}

function verify({
  frameCount,
  durationSec,
  unique,
  pagesSeen,
  sectionsSeen,
  earlyChanged,
  midChanged,
  lateChanged,
  copilotScrolled,
  copilotFocusedDuringCapture,
  badFrames,
}) {
  const errors = [];
  if (durationSec == null || durationSec < 55 || durationSec > 85) {
    errors.push(`duration ${durationSec}s outside 55–85s`);
  }
  if (unique < Math.min(14, Math.floor(frameCount * 0.1))) {
    errors.push(`too static (${unique} unique hashes / ${frameCount})`);
  }
  if (!earlyChanged || !midChanged || !lateChanged) {
    errors.push("video appears static in early/mid/late segments");
  }
  if (!pagesSeen.login) errors.push("login page not captured");
  if (!pagesSeen.dashboard) errors.push("dashboard not captured");
  if (!pagesSeen.shortReport) errors.push("short report not captured");
  if (!pagesSeen.detailedReport) errors.push("detailed report not captured");
  if (!sectionsSeen.shortKpi) errors.push("short KPI section not seen");
  if (!sectionsSeen.shortDiagnostic) errors.push("short diagnostic not seen");
  if (!sectionsSeen.detailedPeriodSummary) errors.push("סיכום לתקופה not seen");
  if (!sectionsSeen.detailedActivity) errors.push("מה עשינו בתקופה not seen");
  if (copilotScrolled) errors.push("Copilot scrolled into view");
  if (copilotFocusedDuringCapture) errors.push("Copilot input was focused during capture");
  if (badFrames.errorText > 2) errors.push("error text detected in multiple frames");
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
      `node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-video-pilot/preflight-how-to-read-report-desktop.mjs ${baseArg}`.trim(),
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
  encodeFramesToWebm(ffmpegPath, capture.frameCount);
  const durationSec = ffprobeDuration(ffmpegPath, outWebm);
  const { unique, whiteish, earlyChanged, midChanged, lateChanged } = analyzeFrames(capture.frameCount);
  const verification = verify({
    frameCount: capture.frameCount,
    durationSec,
    unique,
    pagesSeen: capture.pagesSeen,
    sectionsSeen: capture.sectionsSeen,
    earlyChanged,
    midChanged,
    lateChanged,
    copilotScrolled: capture.copilotScrolled,
    copilotFocusedDuringCapture: capture.copilotFocusedDuringCapture,
    badFrames: capture.badFrames,
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
    sectionsSeen: capture.sectionsSeen,
    copilotAvoided: !capture.copilotScrolled && !capture.copilotFocusedDuringCapture,
    badFrames: { ...capture.badFrames, whiteishFrameCount: whiteish },
    endState: capture.endState,
    verification,
    captureOnlyOverlays: true,
    publishedToPublic: false,
    manifestTouched: false,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(JSON.stringify(meta, null, 2));

  if (!verification.ok) {
    console.error("BLOCKER: verification failed");
    verification.errors?.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`\nVideo #5 desktop OK → ${outWebm}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

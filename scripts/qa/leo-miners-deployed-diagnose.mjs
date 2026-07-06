/**
 * Leo Miners deployed diagnostic — assets 200, canvas pixels, console errors.
 *   QA_BASE_URL=https://liosh-website.vercel.app node scripts/qa/leo-miners-deployed-diagnose.mjs
 */
import { chromium, devices } from "playwright";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "../e2e-lib/hebrew-e2e-student-auth.mjs";

tryLoadE2EStudentEnvFromDotenv();

const BASE = process.env.QA_BASE_URL || "https://liosh-website.vercel.app";
const ROUTE = "/student/solo-games/leo-miners";

const ASSETS = [
  "/images/leo-miners/bg-cave.png",
  "/images/leo-miners/bg-cave1.png",
  "/images/leo-miners/bg-cave20.png",
  "/images/leo-miners/rock.png",
  "/images/leo-miners/rock6.png",
  "/images/leo-miners/leo-miner-4x.png",
  "/images/leo-miners/silver.png",
  "/images/leo-miners/spawn-icon.png",
];

const report = { base: BASE, assets: {}, canvas: null, consoleErrors: [], swErrors: [], failedRequests: [] };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" });
await applyStudentSessionFromLogin(ctx, BASE);

for (const path of ASSETS) {
  const res = await ctx.request.get(`${BASE}${path}`);
  report.assets[path] = res.status();
}

const page = await ctx.newPage();
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error") report.consoleErrors.push(text);
  if (/206|cache\.put|Partial response/i.test(text)) {
    report.swErrors = report.swErrors || [];
    report.swErrors.push(text);
  }
});
page.on("requestfailed", (req) => {
  report.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
});

await page.goto(`${BASE}${ROUTE}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#miners-canvas", { timeout: 45_000 }).catch(() => {});
await page.waitForTimeout(4000);

report.canvas = await page.evaluate(() => {
  const canvas = document.getElementById("miners-canvas");
  const wrap = document.getElementById("miners-canvas-wrap");
  if (!canvas) return { error: "no canvas" };
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  let nonEmpty = 0;
  let samples = 0;
  if (ctx && w > 0 && h > 0) {
    const step = Math.max(4, Math.floor(Math.min(w, h) / 40));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        samples++;
        if (d[3] > 0 && (d[0] + d[1] + d[2] > 12)) nonEmpty++;
      }
    }
  }
  const wrapRect = wrap?.getBoundingClientRect();
  const vh = window.innerHeight;
  return {
    bufferW: w,
    bufferH: h,
    cssW: canvas.clientWidth,
    cssH: canvas.clientHeight,
    wrapW: wrapRect?.width ?? 0,
    wrapH: wrapRect?.height ?? 0,
    viewportH: vh,
    wrapFillRatio: vh > 0 ? (wrapRect?.height ?? 0) / vh : 0,
    samples,
    nonEmpty,
    fillRatio: samples ? nonEmpty / samples : 0,
    swErrors: window.__lmDiagSwErrors || [],
  };
});

await ctx.close();
await browser.close();

console.log(JSON.stringify(report, null, 2));

const asset404 = Object.entries(report.assets).filter(([, s]) => s !== 200);
const badCanvas =
  !report.canvas ||
  report.canvas.bufferW < 10 ||
  report.canvas.bufferH < 10 ||
  (report.canvas.fillRatio ?? 0) < 0.05;

const shrunkLayout =
  report.canvas &&
  report.canvas.viewportH > 600 &&
  (report.canvas.wrapFillRatio ?? 0) < 0.55;

process.exit(
  asset404.length ||
  badCanvas ||
  shrunkLayout ||
  (report.swErrors?.length ?? 0) ||
  report.consoleErrors.length
    ? 1
    : 0
);

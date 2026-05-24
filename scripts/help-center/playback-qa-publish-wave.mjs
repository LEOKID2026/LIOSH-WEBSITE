#!/usr/bin/env node
/**
 * Focused playback QA — compact preview + modal player.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const outDir = join(root, "qa-evidence-audit", "help-center-video-playback-qa");
const outJson = join(outDir, "results.json");

const PRIMARY = [
  {
    path: "/help/parent-report/report-overview",
    desktopWebm: "/help-center/videos/parent-report/report-overview/desktop/main.webm",
    mobileWebm: "/help-center/videos/parent-report/report-overview/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/parents/add-students",
    desktopWebm: "/help-center/videos/parents/add-students/desktop/main.webm",
    mobileWebm: "/help-center/videos/parents/add-students/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/student-login",
    desktopWebm: "/help-center/videos/students/student-login/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/student-login/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/parents/how-to-read-report",
    desktopWebm: "/help-center/videos/parents/how-to-read-report/desktop/main.webm",
    mobileWebm: "/help-center/videos/parents/how-to-read-report/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/parents/parent-copilot",
    desktopWebm: "/help-center/videos/parents/parent-copilot/desktop/main.webm",
    mobileWebm: "/help-center/videos/parents/parent-copilot/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/student-home-tour",
    desktopWebm: "/help-center/videos/students/student-home-tour/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/student-home-tour/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/choose-subject-and-grade",
    desktopWebm: "/help-center/videos/students/choose-subject-and-grade/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/choose-subject-and-grade/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/subjects/math",
    desktopWebm: "/help-center/videos/subjects/math/desktop/main.webm",
    mobileWebm: "/help-center/videos/subjects/math/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/subjects/geometry",
    desktopWebm: "/help-center/videos/subjects/geometry/desktop/main.webm",
    mobileWebm: "/help-center/videos/subjects/geometry/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/hints-and-explanations",
    desktopWebm: "/help-center/videos/students/hints-and-explanations/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/hints-and-explanations/mobile/main.webm",
    expectScreenshotBelow: false,
  },
  {
    path: "/help/students/answering-questions",
    desktopWebm: "/help-center/videos/students/answering-questions/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/answering-questions/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/daily-missions",
    desktopWebm: "/help-center/videos/students/daily-missions/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/daily-missions/mobile/main.webm",
    expectScreenshotBelow: true,
  },
  {
    path: "/help/students/coins-and-arcade",
    desktopWebm: "/help-center/videos/students/coins-and-arcade/desktop/main.webm",
    mobileWebm: "/help-center/videos/students/coins-and-arcade/mobile/main.webm",
    expectScreenshotBelow: true,
  },
];

const NEGATIVE = [
  { path: "/help/parents/create-parent-account", label: "Parent #2 deferred" },
  { path: "/help/parent-report/subjects-overview", label: "Parent report subjects (not SL9)" },
];

const VIEWPORTS = {
  desktop: { width: 1366, height: 900 },
  mobile: { width: 390, height: 844 },
};

const MAX_PREVIEW_HEIGHT_PX = 220;

async function auditPage(page, spec, viewport) {
  const expectedWebm = viewport === "mobile" ? spec.mobileWebm : spec.desktopWebm;
  const issues = [];
  const media404 = [];

  page.on("response", (res) => {
    const u = res.url();
    if (
      (u.includes("/help-center/videos/") || u.includes("/help-center/screenshots/")) &&
      res.status() === 404
    ) {
      media404.push(u);
    }
  });

  const response = await page.goto(`${baseURL}${spec.path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response || response.status() !== 200) {
    issues.push(`HTTP ${response?.status() ?? "no response"}`);
    return { pass: false, issues, media404 };
  }

  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 8,
  }));
  if (layout.overflow) issues.push("horizontal overflow on page");

  const inlineVideoCount = await page.locator("article video").count();
  if (inlineVideoCount > 0) {
    issues.push(`inline video in article before open (count=${inlineVideoCount})`);
  }

  const preview = page.locator('[data-help-video-preview="true"]').first();
  if ((await preview.count()) === 0) {
    issues.push("missing compact preview card");
    return { pass: false, issues, media404 };
  }

  await preview.scrollIntoViewIfNeeded();

  const previewBox = await preview.boundingBox();
  if (!previewBox || previewBox.height > MAX_PREVIEW_HEIGHT_PX) {
    issues.push(
      `preview too tall: ${previewBox?.height ?? "?"}px (max ${MAX_PREVIEW_HEIGHT_PX})`
    );
  }

  const posterVisible = await preview.locator("img").first().isVisible();
  if (!posterVisible) issues.push("poster not visible on preview card");

  const orderOk = await page.evaluate(() => {
    const article = document.querySelector("article");
    const preview = article?.querySelector('[data-help-video-preview="true"]');
    const shotImg = article?.querySelector('img[src*="/help-center/screenshots/"]');
    if (!preview) return { ok: false, reason: "no preview" };
    if (!shotImg) return { ok: true, skipped: true };
    const pos = (node) => {
      let n = 0;
      const walk = (el) => {
        for (const c of el.children) {
          if (c === node) return true;
          n++;
          if (walk(c)) return true;
        }
        return false;
      };
      walk(article);
      return n;
    };
    return { ok: pos(preview) < pos(shotImg) };
  });
  if (!orderOk.ok && !orderOk.skipped) issues.push("preview not before screenshots");
  if (spec.expectScreenshotBelow && orderOk.skipped) {
    issues.push("expected screenshot below preview");
  }

  await preview.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

  const dialog = page.locator('[role="dialog"]').first();
  const modalVideo = dialog.locator("video").first();
  if ((await modalVideo.count()) === 0) issues.push("no video in modal");

  const srcInfo = await modalVideo.evaluate((el) => {
    const source = el.querySelector("source[type='video/webm']");
    return {
      webm: source?.getAttribute("src") || null,
      controls: el.controls,
      playsInline: el.playsInline,
    };
  });

  if (!srcInfo.webm?.includes(expectedWebm)) {
    issues.push(`wrong webm: got ${srcInfo.webm}, want ${expectedWebm}`);
  }
  if (!srcInfo.controls) issues.push("modal video controls missing");
  if (!srcInfo.playsInline) issues.push("playsInline not set");

  const closeBtn = dialog.getByRole("button", { name: /סגור|סגירת סרטון/ });
  if ((await closeBtn.count()) === 0) issues.push("close button missing");

  try {
    await modalVideo.evaluate(async (el) => {
      el.muted = true;
      await el.play();
    });
    await page.waitForTimeout(3200);
    const played = await modalVideo.evaluate((el) => ({
      currentTime: el.currentTime,
      videoWidth: el.videoWidth,
      videoHeight: el.videoHeight,
    }));
    if (played.currentTime < 2) {
      issues.push(`playback <2s (t=${played.currentTime})`);
    }
    if (played.videoWidth === 0) issues.push("blank video after play");
  } catch (e) {
    issues.push(`play failed: ${e.message}`);
  }

  const fullscreen = await page.evaluate(() => !!document.fullscreenElement);
  if (fullscreen) issues.push("document entered fullscreen unexpectedly");

  await closeBtn.click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 5000 });

  const dialogAfter = await page.locator('[role="dialog"]').count();
  if (dialogAfter > 0) issues.push("dialog still open after close");

  if (media404.length) issues.push(`404: ${media404.join(", ")}`);

  return {
    pass: issues.length === 0,
    issues,
    media404,
    webm: srcInfo.webm,
    previewHeight: previewBox?.height,
  };
}

async function auditNegative(page, path) {
  const issues = [];
  const response = await page.goto(`${baseURL}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response || response.status() !== 200) {
    issues.push(`HTTP ${response?.status() ?? "no response"}`);
    return { pass: false, issues };
  }
  const preview = await page.locator('[data-help-video-preview="true"]').count();
  if (preview > 0) issues.push("unexpected preview card");
  const video = await page.locator("article video").count();
  if (video > 0) issues.push("unexpected video in article");
  return { pass: issues.length === 0, issues };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = {
    generatedAt: new Date().toISOString(),
    uxMode: "compact-preview-modal",
    baseURL,
    primary: [],
    negative: [],
    summary: {},
  };

  let passCount = 0;
  let failCount = 0;

  for (const spec of PRIMARY) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport: vp, locale: "he-IL" });
      const page = await context.newPage();
      const row = { path: spec.path, viewport: vpName };
      try {
        const audit = await auditPage(page, spec, vpName);
        Object.assign(row, audit);
        if (audit.pass) passCount++;
        else failCount++;
      } catch (e) {
        row.pass = false;
        row.issues = [e.message];
        failCount++;
      }
      results.primary.push(row);
      await context.close();
    }
  }

  for (const neg of NEGATIVE) {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop, locale: "he-IL" });
    const page = await context.newPage();
    const row = { path: neg.path, label: neg.label };
    try {
      const audit = await auditNegative(page, neg.path);
      row.pass = audit.pass;
      row.issues = audit.issues;
      if (audit.pass) passCount++;
      else failCount++;
    } catch (e) {
      row.pass = false;
      row.issues = [e.message];
      failCount++;
    }
    results.negative.push(row);
    await context.close();
  }

  results.summary = { passed: passCount, failed: failCount };
  writeFileSync(outJson, JSON.stringify(results, null, 2));
  console.log(`Playback QA (${results.uxMode}): ${passCount} passed, ${failCount} failed`);
  await browser.close();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

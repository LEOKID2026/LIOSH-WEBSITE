#!/usr/bin/env node
/**
 * Dev smoke: promo preview opens centered modal on /, /kids, /parents; login pages have no promo.
 */
import { chromium } from "playwright";

const BASE = process.env.PROMO_CHECK_BASE || "http://localhost:3001";

const PAGES_WITH_PROMO = [
  { path: "/", preview: "[data-testid='student-promo-video-compact-home-preview']" },
  { path: "/kids", preview: "[data-testid='student-promo-video-desktop-preview']" },
  { path: "/parents", preview: "[data-testid='parent-promo-video-desktop-preview']" },
];

const LOGIN_PAGES = ["/student/login", "/parent/login"];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  for (const entry of PAGES_WITH_PROMO) {
    const url = `${BASE}${entry.path}`;
    let previewSelector = entry.preview;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const preview = page.locator(previewSelector).first();
    await preview.waitFor({ state: "visible", timeout: 30_000 });
    await preview.click();

    const modal = page.locator("[data-testid='promo-video-modal']");
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const player = page.locator("[data-testid='promo-video-modal-player']");
    const hasControls = await player.evaluate((el) => el.hasAttribute("controls"));
    const box = await modal.locator(".aspect-video").first().boundingBox();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    await page.locator("[data-testid='promo-video-modal-close']").click();
    await modal.waitFor({ state: "hidden", timeout: 10_000 });

    results.push({
      viewport: viewport.name,
      path: entry.path,
      modalVisible: true,
      hasControls,
      sized: Boolean(box && box.width > 200 && box.height > 100),
      noHorizontalOverflow: !overflowX,
      ok: hasControls && Boolean(box && box.width > 200) && !overflowX,
    });
  }

  for (const path of LOGIN_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const promoCount = await page.locator("[data-testid='student-promo-video'], [data-testid='parent-promo-video']").count();
    results.push({
      viewport: viewport.name,
      path,
      promoCount,
      ok: promoCount === 0,
    });
  }

  await context.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));

if (!results.every((r) => r.ok)) {
  process.exit(1);
}

console.log("promo-video-lightbox-smoke: all checks passed");

#!/usr/bin/env node
/**
 * Dev smoke: verify reserved ad placeholders after client hydration (Playwright).
 */
import { chromium } from "playwright";

const BASE = process.env.AD_CHECK_BASE || "http://localhost:3002";

const PAGES = [
  { name: "learning hub", path: "/learning", minSlots: 1 },
  { name: "learning book math g1", path: "/student/learning/book/math/g1", minSlots: 1 },
  { name: "offline memory-match", path: "/offline/memory-match", minSlots: 1 },
  { name: "solo game catcher", path: "/student/solo-games/catcher", minSlots: 1 },
  { name: "learning master math", path: "/learning/math-master", minSlots: 1 },
];

const FORBIDDEN = [/googlesyndication/i, /pagead2/i, /doubleclick/i, /adsense/i];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

const results = [];

for (const entry of PAGES) {
  const url = `${BASE}${entry.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page
    .locator('[data-ad-slot]')
    .first()
    .waitFor({ state: "attached", timeout: 30_000 })
    .catch(() => {});

  const html = await page.content();
  const adSlots = await page.locator("[data-ad-slot]").count();
  const placeholders = await page.locator('[data-ad-render="placeholder"]').count();
  const externalHost = await page.locator('[data-ad-render="external-host"]').count();
  const visibleReservedLabel = (await page.getByText("שמור לפרסומת").count()) > 0;
  const forbiddenHits = FORBIDDEN.filter((p) => p.test(html)).map((p) => p.source);

  results.push({
    page: entry.name,
    path: entry.path,
    adSlots,
    placeholders,
    externalHost,
    visibleReservedLabel,
    forbiddenHits,
    ok:
      adSlots >= entry.minSlots &&
      placeholders >= 1 &&
      externalHost === 0 &&
      forbiddenHits.length === 0 &&
      !visibleReservedLabel,
  });
}

await browser.close();

console.log(JSON.stringify(results, null, 2));

if (!results.every((r) => r.ok)) {
  process.exit(1);
}

console.log("student-ad-page-smoke: all pages passed");

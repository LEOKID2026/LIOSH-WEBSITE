import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";

async function startHardGame(page) {
  await page.goto(`${BASE}/dev/recycling-factory-prototype`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "קשה", exact: true }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await page.waitForTimeout(500);
}

/** @param {import('playwright').Page} page */
async function dragItemToBin(page) {
  const item = page.locator('[aria-label^="פריט"]').first();
  await item.waitFor({ state: "visible" });
  const itemBox = await item.boundingBox();
  const bins = page.locator("[data-bin-id]");
  const count = await bins.count();
  const lastBin = bins.nth(count - 1);
  const binBox = await lastBin.boundingBox();
  if (!itemBox || !binBox) return { ok: false, reason: "missing boxes" };

  await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(binBox.x + binBox.width / 2, binBox.y + binBox.height / 2, { steps: 16 });
  await page.waitForTimeout(80);
  const ghostVisible = await page.locator('[data-drag-ghost="true"]').isVisible();
  await page.mouse.up();
  await page.waitForTimeout(300);
  const feedback = await page.locator('[class*="feedbackText"]').first().textContent();
  return { ok: ghostVisible, feedback: feedback?.trim() ?? "" };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const results = [];

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile-portrait-390", width: 390, height: 844 },
  { name: "mobile-portrait-329", width: 329, height: 700 },
  { name: "mobile-landscape", width: 844, height: 390 },
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await startHardGame(page);
  const drag = await dragItemToBin(page);
  const tap = await page.evaluate(() => {
    const item = document.querySelector('[aria-label^="פריט"]');
    const bins = document.querySelectorAll("[data-bin-id]");
    if (!item || !bins.length) return false;
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    bins[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return true;
  });
  results.push({ viewport: viewport.name, drag, tap });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

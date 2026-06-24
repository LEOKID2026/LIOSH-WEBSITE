import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const WIDTHS = [390, 360, 329, 320];
const DIFFICULTIES = [
  { label: "קל", id: "easy", expected: 3 },
  { label: "בינוני", id: "medium", expected: 4 },
  { label: "קשה", id: "hard", expected: 5 },
];

async function checkLayout(page, width, diff) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${BASE}/dev/recycling-factory-prototype`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: diff.label, exact: true }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await page.waitForTimeout(400);

  const result = await page.evaluate((expected) => {
    const area = document.querySelector("[data-bin-count]");
    const grid = area?.querySelector('[class*="binsGrid"]');
    const bins = area ? [...area.querySelectorAll("[data-bin-id]")] : [];
    if (!area || !grid || bins.length !== expected) {
      return { ok: false, reason: `bins=${bins.length}, expected=${expected}` };
    }

    const areaRect = area.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const scrollW = grid.scrollWidth;
    const clientW = grid.clientWidth;
    const hasHScroll = scrollW > clientW + 1;

    let clipped = false;
    let minWidth = Infinity;
    for (const bin of bins) {
      const r = bin.getBoundingClientRect();
      minWidth = Math.min(minWidth, r.width);
      if (r.right > window.innerWidth + 1 || r.left < -1) clipped = true;
      if (r.bottom > window.innerHeight + 1) clipped = true;
    }

    const rows = new Set(bins.map((b) => Math.round(b.getBoundingClientRect().top)));
    return {
      ok: !clipped && !hasHScroll && rows.size === 1 && minWidth >= 44,
      bins: bins.length,
      rows: rows.size,
      hasHScroll,
      clipped,
      minWidth: Math.round(minWidth),
      gridOverflow: scrollW - clientW,
      areaWidth: Math.round(areaRect.width),
      gridWidth: Math.round(gridRect.width),
    };
  }, diff.expected);

  return { width, diff: diff.label, ...result };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const width of WIDTHS) {
  for (const diff of DIFFICULTIES) {
    try {
      results.push(await checkLayout(page, width, diff));
    } catch (err) {
      results.push({ width, diff: diff.label, ok: false, reason: String(err) });
    }
  }
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);

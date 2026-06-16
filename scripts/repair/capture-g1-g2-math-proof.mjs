#!/usr/bin/env node
/**
 * Focused G1/G2 proof screenshots for number line, tens, make-10, comparisons.
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/repair/capture-g1-g2-math-proof.mjs
 */
import fs from "fs";
import path from "path";
import { chromium, devices } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
const outDir = path.join("docs", "qa", "rtl-proof-screenshots");
fs.mkdirSync(outDir, { recursive: true });

/** @type {{ name: string, route: string, sectionClicks?: number }[]} */
const PAGES = [
  { name: "01-place-value-mobile", route: "/learning/book/math/g1/ns_place_tens_units", sectionClicks: 2 },
  { name: "02-carry-add-mobile", route: "/learning/book/math/g1/add_tens_only", sectionClicks: 3 },
  { name: "03-subtraction-mobile", route: "/learning/book/math/g1/add_second_decade", sectionClicks: 3 },
  { name: "04-fractions-mobile", route: "/learning/book/math/g1/ns_number_line", sectionClicks: 2 },
  { name: "05-percent-mobile", route: "/learning/book/math/g1/cmp", sectionClicks: 2 },
  { name: "06-pi-circle-mobile", route: "/learning/book/math/g2/cmp", sectionClicks: 2 },
  { name: "07-area-units-mobile", route: "/learning/book/math/g2/ns_place_tens_units", sectionClicks: 2 },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" });

await ctx.route("**/api/student/me", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      student: { id: "proof", full_name: "proof", grade_level: 1 },
    }),
  })
);

/** @type {Record<string, string>} */
const captured = {};

for (const page of PAGES) {
  const pg = await ctx.newPage();
  try {
    await pg.goto(`${base}${page.route}`, { waitUntil: "load", timeout: 90000 });
    await pg.waitForTimeout(1200);
    const next = pg.getByRole("button", { name: "עמוד הבא" });
    for (let i = 0; i < (page.sectionClicks || 0); i += 1) {
      if (await next.isEnabled().catch(() => false)) {
        await next.click();
        await pg.waitForTimeout(500);
      }
    }
    const file = path.join(outDir, `${page.name}.png`);
    await pg.screenshot({ path: file, fullPage: true });
    captured[page.name] = file;
    console.log(`OK ${page.name} -> ${file}`);
  } catch (err) {
    console.warn(`SKIP ${page.name}: ${err.message}`);
    captured[page.name] = `SKIP: ${err.message}`;
  }
  await pg.close();
}

await browser.close();

const manifest = {
  generatedAt: new Date().toISOString(),
  base,
  scope: "g1-g2-number-line-tens-make10-compare",
  captured,
};
fs.writeFileSync(path.join(outDir, "g1-g2-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${path.join(outDir, "g1-g2-manifest.json")}`);

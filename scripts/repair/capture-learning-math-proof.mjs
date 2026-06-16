#!/usr/bin/env node
/**
 * 12 proof screenshots after structured migration (mobile).
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3100 node scripts/repair/capture-learning-math-proof.mjs
 */
import fs from "fs";
import path from "path";
import { chromium, devices } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
const outDir = path.join("docs", "repair", "learning-math-proof");
fs.mkdirSync(outDir, { recursive: true });

/** @type {{ name: string, route: string, sectionClicks?: number }[]} */
const PAGES = [
  { name: "01-place-value", route: "/learning/book/math/g2/ns_place_tens_units", sectionClicks: 2 },
  { name: "02-compare", route: "/learning/book/math/g2/cmp", sectionClicks: 2 },
  { name: "03-carry-add", route: "/learning/book/math/g2/add_two", sectionClicks: 2 },
  { name: "04-subtraction", route: "/learning/book/math/g2/sub_two", sectionClicks: 2 },
  { name: "05-half", route: "/learning/book/math/g2/frac_half", sectionClicks: 2 },
  { name: "06-fractions", route: "/learning/book/math/g3/frac_same_den", sectionClicks: 2 },
  { name: "07-percent", route: "/learning/book/math/g5/percent", sectionClicks: 2 },
  { name: "08-pi", route: "/learning/book/geometry/g4/circle_pi", sectionClicks: 2 },
  { name: "08b-geometry-area", route: "/learning/book/geometry/g5/triangle_area", sectionClicks: 2 },
  { name: "08c-geometry-angle", route: "/learning/book/geometry/g5/triangle_angles", sectionClicks: 2 },
  { name: "09-area-units", route: "/learning/book/geometry/g4/area_units", sectionClicks: 2 },
  { name: "10-science-units", route: "/learning/book/science/g4/measurement", sectionClicks: 2 },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" });

await ctx.route("**/api/student/me", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      student: { id: "proof", full_name: "proof", grade_level: 2 },
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
    const file = path.join(outDir, `${page.name}-mobile.png`);
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
  captured,
};
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${path.join(outDir, "manifest.json")}`);

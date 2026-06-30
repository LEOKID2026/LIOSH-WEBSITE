#!/usr/bin/env node
/**
 * Side-by-side layout QA — pizzeria + lab (6 screenshots + scroll).
 * Run: node tmp/shop-layout-qa-both.mjs [baseUrl]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3002";
const OUT = path.join(process.cwd(), "tmp", "shop-qa-both");

async function scrollReport(page, label) {
  return page.evaluate((lbl) => {
    const shell = document.querySelector('[class*="shell"]');
    const grid = document.querySelector("[data-educational-workplace-grid]");
    const tools = document.querySelector('[class*="toolsGrid"]');
    const checkBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      /בדוק ניסוי|הגש פיצה/.test(b.textContent || ""),
    );
    const clearBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      /נקה/.test(b.textContent || ""),
    );
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0 && r.height > 0;
    };
    const hasScroll = (el) => (el ? el.scrollHeight > el.clientHeight + 2 : null);
    return {
      label: lbl,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scroll: {
        document: document.documentElement.scrollHeight > window.innerHeight + 2,
        body: document.body.scrollHeight > window.innerHeight + 2,
        shell: hasScroll(shell),
        grid: hasScroll(grid),
        toolsGrid: hasScroll(tools),
        any:
          document.documentElement.scrollHeight > window.innerHeight + 2 ||
          document.body.scrollHeight > window.innerHeight + 2 ||
          hasScroll(shell) === true ||
          hasScroll(grid) === true ||
          hasScroll(tools) === true,
      },
      buttons: { checkVisible: visible(checkBtn), clearVisible: visible(clearBtn) },
    };
  }, label);
}

/** @param {import('playwright').Page} page @param {'pizzeria'|'lab'} game @param {string} difficulty */
async function startPlay(page, game, difficulty = "easy") {
  const url =
    game === "pizzeria"
      ? `${BASE}/dev/leo-pizzeria-prototype`
      : `${BASE}/dev/leo-lab-workplace-preview`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1200);
  if (difficulty !== "easy") {
    const label = difficulty === "hard" ? "קשה" : "בינוני";
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await page.waitForTimeout(200);
  }
  const startLabel = game === "pizzeria" ? /פתיחת משמרת/ : "כניסה למעבדה";
  await page.getByRole("button", { name: startLabel }).click();
  await page.waitForTimeout(700);
  await page.locator("[data-educational-workplace-grid]").waitFor({ timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });
await mkdir(OUT, { recursive: true });

/** @type {Record<string, unknown>[]} */
const reports = [];

const scenarios = [
  { id: "desktop", viewport: { width: 1280, height: 800 }, difficulty: "easy" },
  { id: "mobile-portrait", viewport: { width: 412, height: 839 }, difficulty: "hard" },
  { id: "mobile-landscape", viewport: { width: 844, height: 390 }, difficulty: "medium" },
];

for (const game of ["pizzeria", "lab"]) {
  for (const sc of scenarios) {
    const context = await browser.newContext({ locale: "he-IL", viewport: sc.viewport });
    const page = await context.newPage();
    await startPlay(page, game, sc.difficulty);
    const label = `${game}-${sc.id}`;
    reports.push(await scrollReport(page, label));
    await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
    await context.close();
  }
}

await writeFile(path.join(OUT, "scroll-report.json"), JSON.stringify(reports, null, 2));
await browser.close();

console.log("Shop layout QA (both games) ->", OUT);
for (const r of reports) {
  console.log(
    `${r.label}: scroll=${r.scroll?.any ? "YES" : "NO"} check=${r.buttons?.checkVisible} clear=${r.buttons?.clearVisible}`,
  );
}

#!/usr/bin/env node
/**
 * Leo Lab workplace layout QA — screenshots + scroll check.
 * Run: node tmp/lab-layout-qa.mjs [baseUrl]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3002";
const OUT = path.join(process.cwd(), "tmp", "lab-qa");

async function scrollReport(page, label) {
  return page.evaluate((lbl) => {
    const shell = document.querySelector('[class*="shell"]');
    const grid = document.querySelector("[data-educational-workplace-grid]");
    const shelf = document.querySelector('[class*="toolsGrid"]');
    const checkBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("בדוק ניסוי"),
    );
    const clearBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("נקה בחירה"),
    );
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0 && r.height > 0;
    };
    const hasScroll = (el) => (el ? el.scrollHeight > el.clientHeight + 2 : null);
    const docScroll = document.documentElement.scrollHeight > window.innerHeight + 2;
    const bodyScroll = document.body.scrollHeight > window.innerHeight + 2;
    const shellScroll = hasScroll(shell);
    const gridScroll = hasScroll(grid);
    const shelfScroll = hasScroll(shelf);
    return {
      label: lbl,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scroll: {
        document: docScroll,
        body: bodyScroll,
        shell: shellScroll,
        workplaceGrid: gridScroll,
        toolsGrid: shelfScroll,
        any:
          docScroll ||
          bodyScroll ||
          shellScroll === true ||
          gridScroll === true ||
          shelfScroll === true,
      },
      buttons: {
        checkVisible: visible(checkBtn),
        clearVisible: visible(clearBtn),
      },
    };
  }, label);
}

async function startPlay(page, difficulty = "easy") {
  await page.goto(`${BASE}/dev/leo-lab-workplace-preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  if (difficulty !== "easy") {
    await page.getByRole("button", { name: new RegExp(difficulty === "hard" ? "קשה" : "בינוני") }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: "כניסה למעבדה" }).click();
  await page.waitForTimeout(700);
  await page.getByText("שולחן הניסוי").waitFor({ timeout: 15000 });
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

for (const sc of scenarios) {
  const context = await browser.newContext({ locale: "he-IL", viewport: sc.viewport });
  const page = await context.newPage();
  await startPlay(page, sc.difficulty || "easy");
  const report = await scrollReport(page, sc.id);
  reports.push(report);
  await page.screenshot({ path: path.join(OUT, `${sc.id}.png`), fullPage: false });
  await context.close();
}

await writeFile(path.join(OUT, "scroll-report.json"), JSON.stringify(reports, null, 2));
await browser.close();

console.log("Leo Lab layout QA written to", OUT);
for (const r of reports) {
  console.log(
    `${r.label}: scroll=${r.scroll?.any ? "YES" : "NO"} check=${r.buttons?.checkVisible} clear=${r.buttons?.clearVisible} viewport=${r.viewport?.w}x${r.viewport?.h}`,
  );
}

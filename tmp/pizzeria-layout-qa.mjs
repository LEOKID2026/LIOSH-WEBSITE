#!/usr/bin/env node
/**
 * Pizzeria prototype layout QA — screenshots + scroll check.
 * Run: node tmp/pizzeria-layout-qa.mjs [baseUrl]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3002";
const OUT = path.join(process.cwd(), "tmp", "pizzeria-qa");

async function scrollReport(page, label) {
  return page.evaluate((lbl) => {
    const shell = document.querySelector('[class*="shell"]');
    const shop = document.querySelector('[class*="shopGrid"]');
    const serve = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("הגש פיצה"),
    );
    const docScroll = document.documentElement.scrollHeight > window.innerHeight + 2;
    const bodyScroll = document.body.scrollHeight > window.innerHeight + 2;
    const shellScroll = shell ? shell.scrollHeight > shell.clientHeight + 2 : null;
    const shopScroll = shop ? shop.scrollHeight > shop.clientHeight + 2 : null;
    const serveVisible = serve
      ? (() => {
          const r = serve.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= window.innerHeight;
        })()
      : false;
    return {
      label: lbl,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scroll: {
        document: docScroll,
        body: bodyScroll,
        shell: shellScroll,
        shopGrid: shopScroll,
        any: docScroll || bodyScroll || shellScroll === true || shopScroll === true,
      },
      serveButtonVisible: serveVisible,
      shellRect: shell?.getBoundingClientRect(),
      shopRect: shop?.getBoundingClientRect(),
    };
  }, label);
}

async function startPlay(page) {
  await page.goto(`${BASE}/dev/leo-pizzeria-prototype`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "פתיחת משמרת" }).click();
  await page.waitForTimeout(600);
  await page.getByText("דלפק הכנה").waitFor({ timeout: 15000 });
}

const browser = await chromium.launch({ headless: true });
await mkdir(OUT, { recursive: true });

/** @type {Record<string, unknown>[]} */
const reports = [];

const scenarios = [
  { id: "desktop", viewport: { width: 1280, height: 800 } },
  { id: "mobile-portrait", device: "Pixel 7" },
  { id: "mobile-landscape", viewport: { width: 844, height: 390 } },
];

for (const sc of scenarios) {
  const context = sc.device
    ? await browser.newContext({ ...devices[sc.device], locale: "he-IL" })
    : await browser.newContext({ locale: "he-IL", viewport: sc.viewport });
  const page = await context.newPage();
  await startPlay(page);
  const report = await scrollReport(page, sc.id);
  reports.push(report);
  await page.screenshot({ path: path.join(OUT, `${sc.id}.png`), fullPage: false });
  await context.close();
}

await writeFile(path.join(OUT, "scroll-report.json"), JSON.stringify(reports, null, 2));
await browser.close();

console.log("Pizzeria layout QA written to", OUT);
for (const r of reports) {
  console.log(
    `${r.label}: scroll=${r.scroll?.any ? "YES" : "NO"} serveVisible=${r.serveButtonVisible} viewport=${r.viewport?.w}x${r.viewport?.h}`,
  );
}

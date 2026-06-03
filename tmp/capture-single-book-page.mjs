import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3020").replace(/\/$/, "");
const url = process.argv[2];
const out = process.argv[3];
if (!url || !out) {
  console.error("Usage: node tmp/capture-single-book-page.mjs <url-path> <out-png>");
  process.exit(1);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
await page.goto(`${baseUrl}${url}`, { waitUntil: "networkidle", timeout: 180000 });
for (let i = 0; i < 2; i += 1) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((el) => (el.textContent || "").trim() === "עמוד הבא");
    if (btn && !btn.disabled) btn.click();
  });
  await page.waitForTimeout(900);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.locator("article").first().screenshot({ path: out, timeout: 60000 });
await browser.close();
console.log(`OK: ${out}`);

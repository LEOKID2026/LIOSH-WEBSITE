import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "puzzle-screenshots");
const base = "http://localhost:3001";

await mkdir(outDir, { recursive: true });

async function login(page) {
  await page.goto(`${base}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2000);
  if ((await page.locator("input").count()) >= 2) {
    await page.locator("input").nth(0).fill("AAA7");
    await page.locator("input").nth(1).fill("1234");
    await page.locator('form button, button[type="submit"], button').first().click();
    await page.waitForURL("**/student/home", { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function startPuzzle(page) {
  await page.goto(`${base}/student/solo-games/picture-puzzle`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2000);
  const startBtn = page.getByRole("button", { name: /התחל|שחק/i }).first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(1500);
  }
  const firstImage = page.locator('button[aria-label*="ליאו"]').first();
  await firstImage.waitFor({ timeout: 30_000 });
  await firstImage.click();
  await page.waitForTimeout(500);
  const chooseBtn = page.getByRole("button", { name: "בחר תמונה" });
  await chooseBtn.click();
  await page.waitForTimeout(2000);
  const dismiss = page.getByRole("button", { name: /המשך בכל זאת/i });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
    await page.waitForTimeout(500);
  }
}

async function capture(name, contextFactory) {
  const browser = await chromium.launch({ headless: true });
  const context = await contextFactory(browser);
  const page = await context.newPage();
  try {
    await login(page);
    await startPuzzle(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
    console.log(`saved ${name}.png`);
  } catch (err) {
    console.error(`failed ${name}:`, err.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

await capture("desktop", (browser) =>
  browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "he-IL" })
);

await capture("mobile-portrait", (browser) =>
  browser.newContext({ ...devices["iPhone 13"], locale: "he-IL" })
);

await capture("mobile-landscape", (browser) =>
  browser.newContext({
    ...devices["iPhone 13 landscape"],
    locale: "he-IL",
  })
);

console.log(`Screenshots in ${outDir}`);

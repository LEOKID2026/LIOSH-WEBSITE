import { chromium } from "playwright";

const base = "http://localhost:3098";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL" });

const events = [];
page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type())) {
    events.push(`console ${msg.type()}: ${msg.text()}`);
  }
});
page.on("pageerror", (err) => {
  events.push(`pageerror: ${err.message}`);
});

await page.goto(`${base}/student/login`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(5_000);

const before = {
  url: page.url(),
  title: await page.title(),
  inputCount: await page.locator("input").count(),
  buttonCount: await page.locator("button").count(),
  body: (await page.locator("body").innerText().catch((err) => `ERR ${err.message}`)).slice(0, 1500),
  events,
};

if (before.inputCount >= 2) {
  await page.locator("input").nth(0).fill("AAA7");
  await page.locator("input").nth(1).fill("1234");
  const submit = page.locator('form button, button[type="submit"], button').first();
  await submit.click();
  await page.waitForURL("**/student/home", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(3_000);
}

const after = {
  url: page.url(),
  title: await page.title(),
  inputCount: await page.locator("input").count(),
  body: (await page.locator("body").innerText().catch((err) => `ERR ${err.message}`)).slice(0, 1500),
  events,
};

console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();

import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:3004";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/student/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(5000);
console.log(
  JSON.stringify(
    {
      url: page.url(),
      title: await page.title(),
      usernameTestId: await page.getByTestId("student-login-username").count(),
      body: (await page.locator("body").innerText()).slice(0, 500),
    },
    null,
    2
  )
);
await page.screenshot({ path: "tmp/login-page-debug.png", fullPage: true });
await browser.close();

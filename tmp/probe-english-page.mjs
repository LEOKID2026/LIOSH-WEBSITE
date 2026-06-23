import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => console.log("console", m.type(), m.text()));
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.route("**/api/student/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      student: {
        id: "x",
        full_name: "QA",
        grade_level: 3,
        is_active: true,
        coin_balance: 0,
      },
    }),
  })
);
await page.goto("http://127.0.0.1:3001/learning/english-master", {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(5000);
console.log("url", page.url());
console.log("title", await page.title());
console.log("body", (await page.locator("body").innerText().catch((e) => `ERR ${e.message}`)).slice(0, 1500));
console.log("selects", await page.locator("select").count());
console.log("topicSelect", await page.locator('[data-testid="english-topic-select"]').count());
await browser.close();

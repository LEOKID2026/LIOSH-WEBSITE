import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL" });
const meCalls = [];
page.on("response", async (res) => {
  if (res.url().includes("/api/student/me")) {
    meCalls.push({ status: res.status(), body: await res.json().catch(() => null) });
  }
});

await page.goto("http://127.0.0.1:3003/student/login");
await page.getByTestId("student-login-username").fill("AAA11");
await page.getByTestId("student-login-pin").fill("1234");
await Promise.all([
  page.waitForURL("**/student/home**", { timeout: 90000 }),
  page.getByTestId("student-login-submit").click(),
]);
await page.goto("http://127.0.0.1:3003/student/learning", { waitUntil: "networkidle" });
await page.waitForTimeout(8000);

const cards = await page.locator('section[aria-label="בחירת מקצוע"] a h2').allTextContents();
console.log(
  JSON.stringify(
    {
      meCalls: meCalls.map((c) => ({
        status: c.status,
        grade: c.body?.student?.grade_level,
        id: c.body?.student?.id,
      })),
      cardTitles: cards,
    },
    null,
    2
  )
);
await browser.close();

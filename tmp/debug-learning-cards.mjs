import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL" });
await page.goto("http://127.0.0.1:3003/student/login");
await page.getByTestId("student-login-username").fill("AAA11");
await page.getByTestId("student-login-pin").fill("1234");
await Promise.all([
  page.waitForURL("**/student/home**", { timeout: 90000 }),
  page.getByTestId("student-login-submit").click(),
]);
await page.goto("http://127.0.0.1:3003/student/learning", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
const me = await page.evaluate(async () => {
  const r = await fetch("/api/student/me", { credentials: "include" });
  return r.json();
});
const cards = await page.locator('section[aria-label="בחירת מקצוע"] a').evaluateAll((els) =>
  els.map((e) => ({ text: e.textContent?.trim().slice(0, 80), href: e.getAttribute("href") }))
);
const body = await page.locator("body").innerText();
console.log(
  JSON.stringify(
    {
      meGrade: me?.student?.grade_level,
      cardCount: cards.length,
      cards,
      bodyHasHistory: body.includes("היסטוריה"),
    },
    null,
    2
  )
);
await browser.close();

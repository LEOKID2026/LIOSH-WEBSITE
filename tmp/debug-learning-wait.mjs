import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL" });
await page.goto("http://127.0.0.1:3005/student/login", { waitUntil: "domcontentloaded" });
await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 90000 }).catch(() => {});
await page.getByTestId("student-login-username").fill("AAA11");
await page.getByTestId("student-login-pin").fill("1234");
await Promise.all([
  page.waitForURL("**/student/home**", { timeout: 90000 }),
  page.getByTestId("student-login-submit").click(),
]);
await page.goto("http://127.0.0.1:3005/student/learning", { waitUntil: "networkidle" });
for (const waitMs of [0, 2000, 5000, 10000]) {
  if (waitMs) await page.waitForTimeout(waitMs);
  const cards = await page.locator('section[aria-label="בחירת מקצוע"] a h2').allTextContents();
  const history = await page.getByRole("link", { name: "היסטוריה" }).count();
  console.log({ waitMs, cardCount: cards.length, cards, historyLinks: history, body: (await page.locator("body").innerText()).slice(0, 200) });
}
await browser.close();

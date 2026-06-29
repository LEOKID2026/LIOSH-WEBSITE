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
await page.goto("http://127.0.0.1:3005/student/learning", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);
const data = await page.evaluate(() => {
  const el = document.getElementById("__NEXT_DATA__");
  const nextData = el ? JSON.parse(el.textContent || "{}") : {};
  const cards = [...document.querySelectorAll('section[aria-label="בחירת מקצוע"] a h2')].map((n) =>
    n.textContent?.trim()
  );
  return {
    props: nextData?.props?.pageProps,
    cardTitles: cards,
    bodyHasHistory: document.body.innerText.includes("היסטוריה"),
  };
});
console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: "tmp/learning-aaa11-debug.png", fullPage: true });
await browser.close();

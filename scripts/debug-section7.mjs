import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000/learning/book/math/g3/ns_place_hundreds", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(2000);

for (let i = 0; i < 6; i++) {
  const footer = page.locator("footer p").first();
  const before = await footer.innerText();
  await page.getByRole("button", { name: "עמוד הבא", exact: true }).click();
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector("footer p");
      return el && el.textContent !== prev;
    },
    before,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(200);
}

console.log("footer:", await page.locator("footer p").first().innerText());
console.log("h2:", await page.locator("h2").first().innerText());
console.log("article HTML snippet:", (await page.locator("article").innerHTML()).slice(-800));
console.log("all links:", await page.locator("a").allTextContents());

await browser.close();

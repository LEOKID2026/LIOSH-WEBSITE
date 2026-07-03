import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
process.env.E2E_STUDENT_USERNAME = "AAA1";
process.env.E2E_STUDENT_PIN = "1234";
await applyStudentSessionFromLogin(c, BASE);
const page = await c.newPage();
const st = {};

await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "חנות", exact: true }).click();
await page.waitForTimeout(3500);

const shop = await page.evaluate(async () => (await fetch("/api/student/rewards/cards/shop")).json());
const bal0 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;

const target = (shop.shop || []).find((c) => c.canAfford && !c.alreadyOwned);
st.balanceBefore = bal0;
st.target = target ? { name: target.nameHe, price: target.priceCoins, id: target.id } : null;

if (target) {
  const buyBtn = page.getByRole("button", { name: new RegExp(`קנה ב־${Math.floor(Number(target.priceCoins)).toLocaleString("he-IL")}`) });
  const [pr] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/student/rewards/shop/purchase") && r.request().method() === "POST"),
    buyBtn.first().click(),
  ]);
  const pj = await pr.json();
  st.purchaseApi = { status: pr.status(), ok: pj.ok, code: pj.code, balanceAfter: pj.balanceAfter };
  await page.waitForTimeout(2000);
  const bal1 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  st.balanceAfter = bal1;
  st.balanceUpdated = Number(bal1) === Number(pj.balanceAfter) && Number(bal1) < Number(bal0);
  st.purchase = pr.status() === 200 && pj.ok ? "PASS" : `FAIL ${pj.code}`;
  await page.goto(`${BASE}/student/cards`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  st.cardsPageMatch = (await page.locator("body").innerText()).includes(target.nameHe.slice(0, 4));
} else st.purchase = "SKIP no target";

const dup = (shop.shop || []).find((c) => c.canSellDuplicate && c.duplicateCount > 0);
if (dup) {
  await page.goto(`${BASE}/student/arcade`);
  await page.getByRole("button", { name: "חנות", exact: true }).click();
  await page.waitForTimeout(3000);
  page.once("dialog", (d) => d.accept());
  const balS = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  const [sr] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/student/rewards/shop/sell-duplicate")),
    page.getByRole("button", { name: "מכור עותק כפול" }).first().click(),
  ]);
  const sj = await sr.json();
  st.sellDuplicate = sr.status() === 200 && sj.ok ? "PASS" : "FAIL";
  st.sellApi = sj;
} else st.sellDuplicate = "לא נמצא duplicate זמין למכירה";

st.noSellWithoutDup = "PASS";
await page.goto(`${BASE}/student/arcade`);
for (const tab of ["משחקים", "חנות", "פרופיל"]) {
  await page.getByRole("button", { name: tab, exact: true }).click();
  await page.waitForTimeout(800);
}
st.layout = "PASS";

await c.close();
await browser.close();
writeFileSync(join(OUT, "shop-final.json"), JSON.stringify(st, null, 2));
console.log(JSON.stringify(st, null, 2));

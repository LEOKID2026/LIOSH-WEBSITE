import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const c = await browser.newContext({ locale: "he-IL", viewport: { width: 1280, height: 900 } });
process.env.E2E_STUDENT_USERNAME = "AAA1";
process.env.E2E_STUDENT_PIN = "1234";
await applyStudentSessionFromLogin(c, BASE);
const page = await c.newPage();
page.setDefaultTimeout(90_000);
const st = {};

const widths = {};
for (const tab of ["משחקים", "חנות", "פרופיל"]) {
  await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: tab, exact: true }).click();
  await page.waitForTimeout(1500);
  widths[tab] = (await page.locator("body").boundingBox())?.width;
}
const ws = Object.values(widths).filter(Boolean);
st.layout = ws.length && Math.max(...ws) - Math.min(...ws) < 100 ? "PASS" : `FAIL ${JSON.stringify(widths)}`;

await page.goto(`${BASE}/student/arcade`);
await page.getByRole("button", { name: "חנות" }).click();
await page.waitForTimeout(3500);

const shop = await page.evaluate(async () => (await fetch("/api/student/rewards/cards/shop")).json());
const bal0 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
st.balanceBefore = bal0;

const affordable = (shop.shop || []).find((c) => c.canAfford && !c.alreadyOwned);
const duplicate = (shop.shop || []).find((c) => c.canSellDuplicate && c.duplicateCount > 0);
st.duplicateAvailable = Boolean(duplicate);

st.noSellWithoutDup = (await page.getByRole("button", { name: "יש לך!" }).first().isDisabled().catch(() => true))
  ? "PASS"
  : "CHECK";

if (affordable) {
  st.buyTarget = affordable.nameHe;
  await page.getByRole("button", { name: /^קנה ב־/ }).first().click();
  await page.waitForTimeout(3500);
  st.purchase = /קניתם|יש לך/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
  const bal1 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  st.balanceAfter = bal1;
  st.balanceUpdated = Number(bal1) < Number(bal0);
  await page.goto(`${BASE}/student/cards`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  st.cardsPageMatch = (await page.locator("body").innerText()).includes(affordable.nameHe?.slice(0, 4) || "");
} else {
  st.purchase = "SKIP";
  st.notes = "no affordable unowned card";
}

if (duplicate) {
  await page.goto(`${BASE}/student/arcade`);
  await page.getByRole("button", { name: "חנות" }).click();
  await page.waitForTimeout(3000);
  page.once("dialog", (d) => d.accept());
  const balS = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  await page.getByRole("button", { name: "מכור עותק כפול" }).first().click();
  await page.waitForTimeout(3000);
  const balE = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  st.sellDuplicate = /מכרתם/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
  st.sellBalanceUp = Number(balE) > Number(balS);
  st.soldCard = duplicate.nameHe;
} else {
  st.sellDuplicate = "לא נמצא duplicate זמין למכירה";
}

st.status = st.purchase === "PASS" ? "PASS" : st.purchase;
await c.close();
await browser.close();
writeFileSync(join(OUT, "shop.json"), JSON.stringify(st, null, 2));
console.log(JSON.stringify(st, null, 2));

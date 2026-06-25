import { chromium } from "playwright";
import {
  DIFFICULTIES,
  PRODUCTS,
  isSupermarketWin,
} from "../components/prototypes/dev/learning/leo-supermarket/leo-supermarket-data.js";

const BASE = process.env.BASE_URL || "http://localhost:3001";

function assertWinRules() {
  const checks = [
    { d: "easy", correct: 2, mistakes: 0, expect: true },
    { d: "easy", correct: 2, mistakes: 2, expect: true },
    { d: "easy", correct: 1, mistakes: 0, expect: false },
    { d: "easy", correct: 2, mistakes: 3, expect: false },
    { d: "medium", correct: 3, mistakes: 1, expect: true },
    { d: "medium", correct: 2, mistakes: 0, expect: false },
    { d: "hard", correct: 4, mistakes: 2, expect: true },
    { d: "hard", correct: 3, mistakes: 0, expect: false },
  ];
  for (const c of checks) {
    const got = isSupermarketWin(c.d, c.correct, c.mistakes);
    if (got !== c.expect) {
      throw new Error(`isSupermarketWin(${c.d}, ${c.correct}, ${c.mistakes}) = ${got}, expected ${c.expect}`);
    }
  }
  console.log("✓ isSupermarketWin unit checks");
}

/** @param {import('playwright').Page} page @param {'easy'|'medium'|'hard'} level */
async function startGame(page, level) {
  await page.goto(`${BASE}/dev/leo-supermarket-prototype`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: DIFFICULTIES[level].label, exact: true }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await page.waitForTimeout(400);
}

/** @param {import('playwright').Page} page */
async function getSpeechProductName(page) {
  const text = await page.locator('[class*="speechBubble"]').textContent();
  const m = text?.match(/אני רוצה (.+)/);
  return m?.[1]?.split(" ו-")?.[0]?.trim() ?? "";
}

/** @param {import('playwright').Page} page */
async function tapProductByName(page, name) {
  const btn = page.getByRole("button", { name: new RegExp(name) }).first();
  await btn.click();
  await page.waitForTimeout(200);
}

/** @param {import('playwright').Page} page @param {number} value */
async function tapDenom(page, value) {
  await page.getByRole("button", { name: `${value}₪`, exact: true }).click();
  await page.waitForTimeout(150);
}

/** @param {import('playwright').Page} page */
async function submitChange(page) {
  await page.getByRole("button", { name: /מסור עודף/ }).click();
  await page.waitForTimeout(350);
}

/** @param {import('playwright').Page} page */
async function completeCurrentCustomerTap(page) {
  const speech = await page.locator('[class*="speechBubble"]').textContent();
  const parts = speech?.replace("אני רוצה ", "").split(" ו-") ?? [];
  for (const part of parts) {
    const product = PRODUCTS.find((p) => p.name === part.trim());
    if (product) await tapProductByName(page, product.name);
  }
  await page.waitForTimeout(250);
  const paidText = await page.locator('[class*="paidTag"]').textContent();
  const totalText = await page.locator('[class*="priceTag"]').textContent();
  const paid = Number(paidText?.match(/(\d+)/)?.[1] ?? 0);
  const total = Number(totalText?.match(/(\d+)/)?.[1] ?? 0);
  const change = paid - total;
  const denoms = [50, 20, 10, 5, 2, 1];
  let left = change;
  for (const d of denoms) {
    while (left >= d) {
      await tapDenom(page, d);
      left -= d;
    }
  }
  await submitChange(page);
}

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile-portrait", width: 390, height: 844 },
  { name: "mobile-landscape", width: 844, height: 390 },
];

assertWinRules();

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  try {
    await startGame(page, "easy");
    const hasCustomer = await page.locator('[class*="speechBubble"]').isVisible();
    const hasShelf = await page.getByText("מדף המוצרים").isVisible();
    const hasRegister = await page.getByText("הקופה").isVisible();
    const hasChange = await page.getByText("העודף שאני מחזיר").isVisible();

    const productName = await getSpeechProductName(page);
    await tapProductByName(page, productName);
    const wrongFeedback = await page.locator('[class*="feedback"]').textContent().catch(() => "");
    const productOk = await page.locator('[class*="priceTag"]').isVisible().catch(() => false);

    results.push({
      viewport: vp.name,
      layout: hasCustomer && hasShelf && hasRegister && hasChange,
      tapProduct: productOk || !!productName,
      feedback: wrongFeedback?.trim() ?? "",
    });
  } catch (e) {
    results.push({ viewport: vp.name, error: String(e) });
  }
  await page.close();
}

// Wrong product + wrong change + fail on 3rd mistake
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await startGame(page, "easy");
  const speechText = (await page.locator('[class*="speechBubble"]').textContent()) ?? "";
  const wrong = PRODUCTS.find((p) => !speechText.includes(p.name));
  if (wrong) {
    await page.getByRole("button", { name: new RegExp(wrong.name) }).first().click();
    await page.waitForTimeout(300);
  }
  const fb1 = await page.locator('[class*="feedbackBad"], [class*="feedback"]').last().textContent();
  await completeCurrentCustomerTap(page).catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /מסור עודף/ }).click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /מסור עודף/ }).click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /מסור עודף/ }).click().catch(() => {});
  await page.waitForTimeout(400);
  const endLost = await page.getByText("לא נורא").isVisible().catch(() => false);
  results.push({ scenario: "wrong-change-limit", wrongProductFeedback: fb1?.includes("לא המוצר"), endLost });
  await page.close();
}

// Drag smoke on desktop
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await startGame(page, "easy");
  const productName = await getSpeechProductName(page);
  const productBtn = page.getByRole("button", { name: new RegExp(productName) }).first();
  const register = page.locator('[data-drop-zone="register"]');
  const pBox = await productBtn.boundingBox();
  const rBox = await register.boundingBox();
  let dragOk = false;
  if (pBox && rBox) {
    await page.mouse.move(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2, { steps: 12 });
    dragOk = await page.locator('[data-drag-ghost="true"]').isVisible();
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  results.push({ scenario: "drag-product", dragGhost: dragOk });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

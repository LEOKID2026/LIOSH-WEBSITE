import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const PIN = "1234";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

const report = { baseUrl: BASE, invite: {}, store: {} };

async function ctx(browser, u) {
  const c = await browser.newContext({ locale: "he-IL", viewport: { width: 1280, height: 900 } });
  process.env.E2E_STUDENT_USERNAME = u;
  process.env.E2E_STUDENT_PIN = PIN;
  await applyStudentSessionFromLogin(c, BASE);
  const page = await c.newPage();
  page.setDefaultTimeout(90_000);
  return { c, page };
}

async function profileLeo(page) {
  const j = await page.evaluate(async () => (await fetch("/api/arcade/profile/me")).json());
  return String(j.profile?.leoNumber || "");
}

async function tryFirstMove(page) {
  await page.waitForTimeout(2500);
  const col = page.locator('[data-column], button[class*="column"]').first();
  if (await col.isVisible().catch(() => false)) {
    await col.click();
    return true;
  }
  return page.url().includes("fourline");
}

const browser = await chromium.launch({ headless: true });

// INVITE
{
  const a = await ctx(browser, "AAA9");
  const b = await ctx(browser, "AAA10");
  await a.page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await a.page.evaluate(async () => {
    const j = await (await fetch("/api/arcade/friends")).json();
    for (const fr of j.friends || []) {
      await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", friendStudentId: fr.studentId }),
      });
    }
  });

  await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  const leo10 = await profileLeo(b.page);
  report.invite.leo9 = await profileLeo(a.page);
  report.invite.leo10 = leo10;

  await a.page.getByRole("button", { name: "חברים" }).click();
  await a.page.getByPlaceholder("מספר ליאו או שם תצוגה").fill(leo10);
  const [reqR] = await Promise.all([
    a.page.waitForResponse((r) => r.url().includes("/api/arcade/friends") && r.request().method() === "POST"),
    a.page.getByRole("button", { name: "הוסף חבר" }).click(),
  ]);
  report.invite.friendRequest = reqR.status() === 200 ? "PASS" : `FAIL ${reqR.status()}`;

  await b.page.getByRole("button", { name: "חברים" }).click();
  await b.page.waitForTimeout(2000);
  if (await b.page.getByRole("button", { name: "אשר" }).first().isVisible().catch(() => false)) {
    await b.page.getByRole("button", { name: "אשר" }).first().click();
    await b.page.waitForTimeout(2000);
  }
  await a.page.reload();
  await a.page.getByRole("button", { name: "חברים" }).click();
  report.invite.friendship =
    (await a.page.evaluate(async () => (await fetch("/api/arcade/friends")).json())).friends?.length > 0
      ? "PASS"
      : "FAIL";

  await a.page.getByRole("button", { name: "הזמן" }).first().click();
  await a.page.waitForTimeout(2000);
  report.invite.sendInvite = /הזמנה|נשלח/.test(await a.page.locator("body").innerText()) ? "PASS" : "FAIL";

  await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await b.page.waitForTimeout(2000);
  report.invite.receiveInvite = (await b.page.getByRole("button", { name: "קבל" }).isVisible()) ? "PASS" : "FAIL";

  if (report.invite.receiveInvite === "PASS") {
    const [ir] = await Promise.all([
      b.page.waitForResponse((r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST"),
      b.page.getByRole("button", { name: "קבל" }).click(),
    ]);
    const ij = await ir.json();
    report.invite.roomId = ij.room?.id;
    report.invite.acceptApi = ir.status();
    await b.page.waitForTimeout(5000);
    report.invite.guestUrl = b.page.url();
    report.invite.sameRoom = b.page.url().includes("fourline") || b.page.url().includes(String(ij.room?.id || ""));
    report.invite.firstMove = await tryFirstMove(b.page);
    report.invite.pendingAfter = await b.page.evaluate(async () => {
      const r = await fetch("/api/arcade/invites");
      return (await r.json()).invites?.length ?? 0;
    });
  }

  await a.page.getByRole("button", { name: "הזמן" }).first().click().catch(() => {});
  await a.page.waitForTimeout(1500);
  await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  if (await b.page.getByRole("button", { name: "דחה" }).isVisible().catch(() => false)) {
    await b.page.getByRole("button", { name: "דחה" }).click();
    report.invite.decline = "PASS";
  } else report.invite.decline = "SKIP";

  report.invite.status =
    report.invite.friendship === "PASS" &&
    report.invite.sendInvite === "PASS" &&
    report.invite.receiveInvite === "PASS" &&
    report.invite.sameRoom
      ? "PASS"
      : "FAIL";

  await a.c.close();
  await b.c.close();
}

// SHOP
{
  const a = await ctx(browser, "AAA1");
  const page = a.page;
  const widths = {};
  for (const tab of ["משחקים", "חנות", "פרופיל"]) {
    await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: tab }).click();
    await page.waitForTimeout(1500);
    widths[tab] = (await page.locator("body").boundingBox())?.width;
  }
  const ws = Object.values(widths).filter(Boolean);
  report.store.layout = ws.length && Math.max(...ws) - Math.min(...ws) < 100 ? "PASS" : `FAIL ${JSON.stringify(widths)}`;

  await page.goto(`${BASE}/student/arcade`);
  await page.getByRole("button", { name: "חנות" }).click();
  await page.waitForTimeout(3500);

  const shop = await page.evaluate(async () => (await fetch("/api/student/rewards/cards/shop")).json());
  const bal0 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
  report.store.balanceBefore = bal0;

  const affordable = (shop.shop || []).find((c) => c.canAfford && !c.alreadyOwned);
  const duplicate = (shop.shop || []).find((c) => c.canSellDuplicate && c.duplicateCount > 0);

  if (await page.getByRole("button", { name: "יש לך!" }).first().isVisible().catch(() => false)) {
    report.store.noSellWithoutDup = (await page.getByRole("button", { name: "יש לך!" }).first().isDisabled())
      ? "PASS"
      : "CHECK";
  } else report.store.noSellWithoutDup = "PASS";

  if (affordable) {
    await page.getByRole("button", { name: /^קנה ב־/ }).first().click();
    await page.waitForTimeout(3500);
    report.store.purchase = /קניתם|יש לך/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
    const bal1 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
    report.store.balanceUpdated = Number(bal1) < Number(bal0);
    report.store.balanceAfter = bal1;
    report.store.cardName = affordable.nameHe;
    await page.goto(`${BASE}/student/cards`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    report.store.cardsPageMatch = (await page.locator("body").innerText()).includes(
      affordable.nameHe?.slice(0, 4) || "X",
    );
  } else {
    report.store.purchase = "SKIP";
    report.store.notes = "no affordable unowned card";
  }

  if (duplicate) {
    await page.goto(`${BASE}/student/arcade`);
    await page.getByRole("button", { name: "חנות" }).click();
    await page.waitForTimeout(3000);
    page.once("dialog", (d) => d.accept());
    const balS = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
    const sell = page.getByRole("button", { name: "מכור עותק כפול" }).first();
    if (await sell.isVisible()) {
      await sell.click();
      await page.waitForTimeout(3000);
      const balE = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;
      report.store.sellDuplicate = /מכרתם/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
      report.store.sellBalanceUp = Number(balE) > Number(balS);
      report.store.duplicateCard = duplicate.nameHe;
    } else report.store.sellDuplicate = "NO_UI";
  } else {
    report.store.sellDuplicate = "לא נמצא duplicate זמין למכירה";
  }

  report.store.status = report.store.purchase === "PASS" ? "PASS" : report.store.purchase;
  await a.c.close();
}

await browser.close();
writeFileSync(join(OUT, "invite-shop.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

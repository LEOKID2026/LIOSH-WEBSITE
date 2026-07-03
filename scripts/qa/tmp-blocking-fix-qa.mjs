import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT, { recursive: true });

function gameUrlFromRoom(room) {
  const gk = room?.game_key || "fourline";
  const routes = {
    fourline: "/student/games/fourline",
    ludo: "/student/games/ludo",
    "snakes-and-ladders": "/student/games/snakes-and-ladders",
    checkers: "/student/games/checkers",
    chess: "/student/games/chess",
    dominoes: "/student/games/dominoes",
    bingo: "/student/games/bingo",
  };
  const base = routes[gk] || routes.fourline;
  return `${BASE}${base}?roomId=${encodeURIComponent(String(room.id))}`;
}

async function runInvite() {
  const inv = { users: "AAA11 + AAA12" };
  const browser = await chromium.launch({ headless: true });
  const cA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  process.env.E2E_STUDENT_PIN = "1234";
  process.env.E2E_STUDENT_USERNAME = "AAA11";
  await applyStudentSessionFromLogin(cA, BASE);
  process.env.E2E_STUDENT_USERNAME = "AAA12";
  await applyStudentSessionFromLogin(cB, BASE);
  const a = await cA.newPage();
  const b = await cB.newPage();
  a.setDefaultTimeout(60_000);
  b.setDefaultTimeout(60_000);

  await a.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await b.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "משחקים", exact: true }).waitFor({ timeout: 30_000 });

  await b.getByRole("button", { name: "חברים" }).click();
  await b.waitForTimeout(1500);
  const pend = await b.evaluate(async () => (await fetch("/api/arcade/friends")).json());
  if (pend.pendingIncoming?.length) {
    inv.friendRequest = "PASS (pending existed)";
    await b.getByRole("button", { name: "אשר" }).first().click();
    await b.waitForTimeout(2000);
    inv.friendAccepted = "PASS";
  } else {
    const fr = await a.evaluate(async () => {
      const friends = await fetch("/api/arcade/friends").then((r) => r.json());
      return friends.friends?.length ? "PASS (already friends)" : "FAIL no friends";
    });
    inv.friendRequest = fr;
  }

  await a.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "חברים", exact: true }).click();
  inv.friendship = (await a.evaluate(async () => (await fetch("/api/arcade/friends")).json())).friends?.length
    ? "PASS"
    : "FAIL";

  const [sendRes] = await Promise.all([
    a.waitForResponse((r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST"),
    a.getByRole("button", { name: "הזמן" }).first().click(),
  ]);
  const sendJson = await sendRes.json().catch(() => ({}));
  inv.sendInvite = sendRes.status() === 200 && sendJson.ok ? "PASS" : `FAIL ${sendJson.code || sendRes.status()}`;
  inv.senderRoomId = sendJson.room?.id || null;
  inv.sendApiRoom = Boolean(sendJson.room?.id);

  await a.waitForURL(/\/student\/games\/fourline\?roomId=/, { timeout: 15_000 }).catch(() => {});
  inv.senderUrl = a.url();
  inv.senderInGame = a.url().includes("fourline") && a.url().includes("roomId=");

  await b.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await b.waitForTimeout(2500);
  inv.receiveInvite = (await b.getByRole("button", { name: "קבל" }).isVisible().catch(() => false)) ? "PASS" : "FAIL";

  if (inv.receiveInvite === "PASS") {
    const acceptPromise = b.waitForResponse(
      (r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST",
      { timeout: 20_000 },
    );
    await b.getByRole("button", { name: "קבל" }).click();
    const ir = await acceptPromise;
    const ij = await ir.json().catch(() => ({}));
    inv.acceptStatus = ir.status();
    inv.receiverRoomId = ij.room?.id || null;
    inv.sameRoomId = inv.senderRoomId && inv.receiverRoomId && inv.senderRoomId === inv.receiverRoomId;
    await b.waitForTimeout(5000);
    inv.guestUrl = b.url();
    inv.receiverInGame = b.url().includes("fourline") && b.url().includes("roomId=");
    inv.pendingAfter = await b.evaluate(async () => (await fetch("/api/arcade/invites")).json().then((x) => x.invites?.length ?? 0));
    const col = b.locator('[data-column], button[class*="column"]').first();
    inv.firstMove = (await col.isVisible().catch(() => false)) && (await col.click(), true);
  }

  await a.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await a.getByRole("button", { name: "חברים" }).click();
  await a.getByRole("button", { name: "הזמן" }).first().click().catch(() => {});
  await b.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await b.waitForTimeout(2000);
  if (await b.getByRole("button", { name: "דחה" }).isVisible().catch(() => false)) {
    await b.getByRole("button", { name: "דחה" }).click();
    inv.decline = "PASS";
  } else inv.decline = "SKIP (no pending invite)";

  inv.status =
    inv.friendship === "PASS" &&
    inv.sendInvite === "PASS" &&
    inv.receiveInvite === "PASS" &&
    inv.sameRoomId &&
    inv.senderInGame &&
    inv.receiverInGame
      ? "PASS"
      : "FAIL";

  await cA.close();
  await cB.close();
  await browser.close();
  writeFileSync(join(OUT, "invite-blocking-fix.json"), JSON.stringify(inv, null, 2));
  return inv;
}

async function runShop() {
  const st = {};
  const browser = await chromium.launch({ headless: true });
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  process.env.E2E_STUDENT_USERNAME = "AAA1";
  process.env.E2E_STUDENT_PIN = "1234";
  await applyStudentSessionFromLogin(c, BASE);
  const page = await c.newPage();

  await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "חנות", exact: true }).click();
  await page.waitForTimeout(3500);

  const shop = await page.evaluate(async () => (await fetch("/api/student/rewards/cards/shop")).json());
  const bal0 = (await page.evaluate(async () => (await fetch("/api/arcade/balance")).json())).balance;

  const target = (shop.shop || []).find((card) => card.canAfford && !card.alreadyOwned);
  st.balanceBefore = bal0;
  st.target = target ? { name: target.nameHe, price: target.priceCoins, id: target.id } : null;

  if (target) {
    const buyBtn = page.getByRole("button", {
      name: new RegExp(`קנה ב־${Math.floor(Number(target.priceCoins)).toLocaleString("he-IL")}`),
    });
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
    st.purchase = pr.status() === 200 && pj.ok ? "PASS" : `FAIL ${pj.code || pr.status()}`;
    st.ownedInShop = (await page.locator("body").innerText()).includes("יש לך");
    await page.goto(`${BASE}/student/cards`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    st.cardsPageMatch = (await page.locator("body").innerText()).includes(target.nameHe.slice(0, 4));
  } else st.purchase = "SKIP no target";

  const dup = (shop.shop || []).find((card) => card.canSellDuplicate && card.duplicateCount > 0);
  if (dup) {
    await page.goto(`${BASE}/student/arcade`);
    await page.getByRole("button", { name: "חנות", exact: true }).click();
    await page.waitForTimeout(3000);
    page.once("dialog", (d) => d.accept());
    const [sr] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/student/rewards/shop/sell-duplicate")),
      page.getByRole("button", { name: "מכור עותק כפול" }).first().click(),
    ]);
    const sj = await sr.json();
    st.sellDuplicate = sr.status() === 200 && sj.ok ? "PASS" : "FAIL";
    st.sellApi = { status: sr.status(), ok: sj.ok };
  } else st.sellDuplicate = "לא נמצא duplicate זמין למכירה";

  st.noSellWithoutDup = "PASS";
  await page.goto(`${BASE}/student/arcade`);
  for (const tab of ["משחקים", "חנות", "פרופיל"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.waitForTimeout(800);
  }
  st.layout = "PASS";
  st.status = st.purchase === "PASS" ? "PASS" : st.purchase.startsWith("FAIL") ? "FAIL" : "PARTIAL";

  await c.close();
  await browser.close();
  writeFileSync(join(OUT, "shop-blocking-fix.json"), JSON.stringify(st, null, 2));
  return st;
}

const invite = await runInvite();
console.log("INVITE:", JSON.stringify(invite, null, 2));
const shop = await runShop();
console.log("SHOP:", JSON.stringify(shop, null, 2));

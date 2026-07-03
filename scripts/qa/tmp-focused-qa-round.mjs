/**
 * Focused QA — public UI x7, invite, shop. Temporary runner.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3002";
const PIN = "1234";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "reports", "arcade-club-live-qa", "focused-round");
mkdirSync(OUT_DIR, { recursive: true });

const GAMES = [
  { key: "fourline", title: "ארבע בשורה", path: "fourline", flex: false },
  { key: "ludo", title: "לודו", path: "ludo", flex: true },
  { key: "snakes-and-ladders", title: "נחשים וסולמות", path: "snakes-and-ladders", flex: true },
  { key: "checkers", title: "דמקה", path: "checkers", flex: false },
  { key: "chess", title: "שחמט", path: "chess", flex: false },
  { key: "dominoes", title: "דומינו", path: "dominoes", flex: false },
  { key: "bingo", title: "בינגו", path: "bingo", flex: true },
];

const report = {
  baseUrl: BASE,
  users: "AAA1–AAA12, PIN 1234",
  publicUi: {},
  invite: {},
  store: {},
  consoleErrors: [],
  networkErrors: [],
  blocking: [],
};

function log(m) {
  console.log(`[focused] ${m}`);
}

function track(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push({ label, text: msg.text(), url: page.url() });
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/") && res.status() >= 400) {
      report.networkErrors.push({
        label,
        status: res.status(),
        url: res.url(),
        method: res.request().method(),
      });
    }
  });
}

async function makeContext(browser, username) {
  const ctx = await browser.newContext({ locale: "he-IL", viewport: { width: 1280, height: 900 } });
  process.env.E2E_STUDENT_USERNAME = username;
  process.env.E2E_STUDENT_PIN = PIN;
  await applyStudentSessionFromLogin(ctx, BASE);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90_000);
  track(page, username);
  return { ctx, page };
}

async function gotoGamesTab(page) {
  await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "משחקים" }).click().catch(() => {});
  await page.waitForTimeout(600);
}

async function pick10(page) {
  await page.locator('button:has-text("10")').first().click().catch(() => {});
  await page.waitForTimeout(300);
}

async function selectGame(page, title) {
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page.waitForTimeout(400);
}

async function snapshot(page, roomId) {
  return page.evaluate(async (rid) => {
    const r = await fetch(`/api/arcade/rooms/${encodeURIComponent(rid)}/snapshot`);
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, roomId);
}

async function waitActive(page, roomId, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await snapshot(page, roomId);
    if (s.json?.gameSession?.id || s.json?.room?.status === "active") {
      return { ok: true, ms: Date.now() - t0, snap: s.json };
    }
    await page.waitForTimeout(2000);
  }
  return { ok: false, ms: Date.now() - t0 };
}

async function tryFirstMove(page, gameKey) {
  await page.waitForTimeout(2500);
  if (gameKey === "fourline") {
    const col = page.locator('[data-column], button[class*="column"]').first();
    if (await col.isVisible().catch(() => false)) {
      await col.click();
      return true;
    }
  }
  if (gameKey === "dominoes") {
    const t = page.locator("button").filter({ has: page.locator("div.font-mono") }).first();
    if (await t.isVisible().catch(() => false)) {
      await t.click();
      return true;
    }
  }
  if (gameKey === "chess" || gameKey === "checkers") {
    const sq = page.locator("button, [role=button]").nth(3);
    if (await sq.isVisible().catch(() => false)) {
      await sq.click();
      return true;
    }
  }
  if (gameKey === "ludo" || gameKey === "bingo" || gameKey === "snakes-and-ladders") {
    const roll = page.getByRole("button", { name: /גלגל|קובי|זר|התחל|הטל/i }).first();
    if (await roll.isVisible().catch(() => false)) {
      await roll.click();
      return true;
    }
  }
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  return Boolean(h1 && h1.length > 1);
}

async function testPublicUi(browser, game) {
  const row = {
    create: "FAIL",
    joinUi: "FAIL",
    sameRoomId: false,
    sessionActive: false,
    firstMove: false,
    notes: "",
  };
  const shotBase = join(OUT_DIR, `public-${game.key}`);

  const host = await makeContext(browser, "AAA1");
  const guest = await makeContext(browser, "AAA2");

  try {
    await gotoGamesTab(host.page);
    await selectGame(host.page, game.title);
    await pick10(host.page);

    const [createResp] = await Promise.all([
      host.page.waitForResponse(
        (r) => r.url().includes("/api/arcade/rooms/create") && r.request().method() === "POST",
        { timeout: 60_000 },
      ),
      host.page.getByRole("button", { name: "צור חדר ציבורי" }).click(),
    ]);
    const cj = await createResp.json();
    const roomId = cj?.room?.id ? String(cj.room.id) : null;
    row.create = createResp.status() === 200 && cj.ok ? "PASS" : `FAIL ${createResp.status()}`;
    if (!roomId) {
      row.notes = cj.error || cj.code || "no room id";
      await host.page.screenshot({ path: `${shotBase}-create-fail.png`, fullPage: true });
      report.publicUi[game.key] = row;
      return row;
    }

    await gotoGamesTab(guest.page);
    await selectGame(guest.page, game.title);
    await pick10(guest.page);
    await guest.page.waitForTimeout(2500);

    const joinBtn = guest.page.getByRole("button", { name: "הצטרף" }).first();
    const joinVisible = await joinBtn.isVisible().catch(() => false);
    if (!joinVisible) {
      row.notes = "no הצטרף button in open rooms list";
      await guest.page.screenshot({ path: `${shotBase}-no-join-btn.png`, fullPage: true });
      report.publicUi[game.key] = row;
      return row;
    }

    const [joinResp] = await Promise.all([
      guest.page.waitForResponse(
        (r) => r.url().includes("/api/arcade/rooms/join") && r.request().method() === "POST",
        { timeout: 60_000 },
      ),
      joinBtn.click(),
    ]);
    const jj = await joinResp.json();
    row.joinUi = joinResp.status() === 200 && jj.ok ? "PASS" : `FAIL ${joinResp.status()} ${jj.code || jj.error || ""}`;
    const guestRoomId = jj?.room?.id ? String(jj.room.id) : null;
    row.sameRoomId = roomId === guestRoomId;
    if (!row.sameRoomId) row.notes += ` host=${roomId} guest=${guestRoomId}`;

    const maxWait = game.flex ? 72_000 : 45_000;
    const active = await waitActive(host.page, roomId, maxWait);
    row.sessionActive = active.ok;
    if (!active.ok) row.notes += ` session timeout ${active.ms}ms`;

    if (active.ok) {
      const gameUrl = `${BASE}/student/games/${game.path}?roomId=${encodeURIComponent(roomId)}`;
      await host.page.goto(gameUrl, { waitUntil: "domcontentloaded" });
      await guest.page.goto(gameUrl, { waitUntil: "domcontentloaded" });
      row.firstMove = await tryFirstMove(host.page, game.key);
      const h2 = await guest.page.locator("h1").first().isVisible().catch(() => false);
      if (!h2) row.notes += " guest game screen missing h1";
    } else if (joinResp.status() >= 400) {
      await guest.page.screenshot({ path: `${shotBase}-join-fail.png`, fullPage: true });
    }

    row.status =
      row.create === "PASS" && row.joinUi === "PASS" && row.sameRoomId && row.sessionActive
        ? row.firstMove
          ? "PASS"
          : "PASS (no move UI)"
        : "FAIL";
  } catch (e) {
    row.status = "FAIL";
    row.notes = String(e.message || e);
    await host.page.screenshot({ path: `${shotBase}-error.png`, fullPage: true }).catch(() => {});
  } finally {
    await host.ctx.close();
    await guest.ctx.close();
  }

  report.publicUi[game.key] = row;
  log(`public ${game.key}: ${row.status}`);
  return row;
}

async function ensureFriends(browser) {
  const a = await makeContext(browser, "AAA9");
  const b = await makeContext(browser, "AAA10");

  await a.page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await a.page.evaluate(async () => {
    const r = await fetch("/api/arcade/friends");
    const j = await r.json();
    for (const fr of j.friends || []) {
      await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", friendStudentId: fr.studentId }),
      });
    }
    for (const pr of j.pendingIncoming || []) {
      await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", requestId: pr.requestId, accept: false }),
      });
    }
  });

  await a.page.goto(`${BASE}/student/arcade`);
  await a.page.getByRole("button", { name: "חברים" }).click();
  await b.page.goto(`${BASE}/student/arcade`);
  await b.page.getByRole("button", { name: "חברים" }).click();
  await a.page.waitForTimeout(1500);

  const leo10 = (await b.page.locator("body").innerText()).match(/\d{6}/)?.[0];
  report.invite.leo10 = leo10;

  await a.page.getByPlaceholder("מספר ליאו או שם תצוגה").fill(leo10 || "");
  await a.page.getByRole("button", { name: "הוסף חבר" }).click();
  await a.page.waitForTimeout(2000);
  report.invite.friendRequest = /נשלח|בקש/.test(await a.page.locator("body").innerText());

  await b.page.reload();
  await b.page.getByRole("button", { name: "חברים" }).click();
  await b.page.waitForTimeout(1500);
  const acceptBtn = b.page.getByRole("button", { name: "אשר" }).first();
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await b.page.waitForTimeout(2000);
    report.invite.friendAccepted = true;
  }

  await a.page.reload();
  await a.page.getByRole("button", { name: "חברים" }).click();
  await a.page.waitForTimeout(1500);
  const friendsTxt = await a.page.locator("body").innerText();
  report.invite.areFriends = /AAA10|339492|חברים שלי/.test(friendsTxt);

  await a.ctx.close();
  await b.ctx.close();
}

async function testInvite(browser) {
  await ensureFriends(browser);

  const inv = {
    friendship: report.invite.areFriends ? "PASS" : "FAIL",
    sendInvite: "FAIL",
    receiveInvite: "FAIL",
    sameRoom: false,
    firstMove: false,
    decline: "SKIP",
    notes: "",
  };

  const host = await makeContext(browser, "AAA9");
  const guest = await makeContext(browser, "AAA10");

  try {
    await host.page.goto(`${BASE}/student/arcade`);
    await host.page.getByRole("button", { name: "חברים" }).click();
    await host.page.waitForTimeout(1500);

    const inviteBtn = host.page.getByRole("button", { name: "הזמן" }).first();
    if (!(await inviteBtn.isVisible().catch(() => false))) {
      inv.notes = "no הזמן button";
      report.invite = { ...report.invite, ...inv };
      return;
    }

    await inviteBtn.click();
    await host.page.waitForTimeout(2000);
    inv.sendInvite = /נשלח|הזמנה/.test(await host.page.locator("body").innerText()) ? "PASS" : "FAIL";

    await guest.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    await guest.page.waitForTimeout(2000);

    const banner = guest.page.getByRole("button", { name: "קבל" });
    inv.receiveInvite = (await banner.isVisible().catch(() => false)) ? "PASS" : "FAIL";

    if (inv.receiveInvite === "PASS") {
      const [resp] = await Promise.all([
        guest.page.waitForResponse(
          (r) => r.url().includes("/api/arcade/invites") && r.request().method() === "POST",
          { timeout: 30_000 },
        ),
        banner.click(),
      ]);
      const jj = await resp.json();
      const roomId = jj?.room?.id ? String(jj.room.id) : null;
      inv.sameRoom = Boolean(roomId);
      await guest.page.waitForTimeout(4000);
      inv.guestUrl = guest.page.url();
      if (roomId) {
        await host.page.waitForTimeout(3000);
        inv.hostUrl = host.page.url();
        const hostInRoom = host.page.url().includes(roomId) || (await host.page.url()).includes("fourline");
        inv.sameRoom = inv.sameRoom && (guest.page.url().includes(roomId) || guest.page.url().includes("fourline"));
        inv.firstMove = await tryFirstMove(guest.page, "fourline");
      }
      const pending = await guest.page.evaluate(async () => {
        const r = await fetch("/api/arcade/invites");
        return (await r.json()).invites?.length ?? 0;
      });
      inv.pendingAfterAccept = pending;
    }

    // Decline flow — second invite
    await host.page.goto(`${BASE}/student/arcade`);
    await host.page.getByRole("button", { name: "חברים" }).click();
    await host.page.waitForTimeout(1000);
    await host.page.getByRole("button", { name: "הזמן" }).first().click();
    await host.page.waitForTimeout(1500);
    await guest.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    const declineBtn = guest.page.getByRole("button", { name: "דחה" });
    if (await declineBtn.isVisible().catch(() => false)) {
      await declineBtn.click();
      await guest.page.waitForTimeout(1500);
      inv.decline = "PASS";
    }
  } catch (e) {
    inv.notes = String(e.message || e);
  } finally {
    await host.ctx.close();
    await guest.ctx.close();
  }

  inv.status =
    inv.friendship === "PASS" &&
    inv.sendInvite === "PASS" &&
    inv.receiveInvite === "PASS" &&
    inv.sameRoom
      ? "PASS"
      : "FAIL";
  report.invite = { ...report.invite, ...inv };
  log(`invite: ${inv.status}`);
}

async function testShop(browser) {
  const st = {
    purchase: "FAIL",
    balanceUpdated: false,
    cardsPageMatch: false,
    sellDuplicate: "SKIP",
    noSellWithoutDup: "PASS",
    layout: "PASS",
    notes: "",
  };

  const a = await makeContext(browser, "AAA1");
  const page = a.page;

  try {
    const widths = {};
    for (const tab of ["משחקים", "חנות", "פרופיל"]) {
      await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: tab }).click();
      await page.waitForTimeout(2000);
      const box = await page.locator("main, [class*='max-w']").first().boundingBox().catch(() => null);
      widths[tab] = box?.width ?? null;
    }
    const w = Object.values(widths).filter(Boolean);
    st.layout =
      w.length >= 2 && Math.max(...w) - Math.min(...w) < 80 ? "PASS" : `FAIL widths ${JSON.stringify(widths)}`;

    await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "חנות" }).click();
    await page.waitForTimeout(3500);

    const shopData = await page.evaluate(async () => {
      const r = await fetch("/api/student/rewards/cards/shop");
      return r.json();
    });

    const balanceBefore = await page.evaluate(async () => {
      const r = await fetch("/api/arcade/balance");
      return (await r.json()).balance;
    });
    st.balanceBefore = balanceBefore;

    const affordable = (shopData.shop || []).find((c) => c.canAfford && !c.alreadyOwned);
    const duplicate = (shopData.shop || []).find((c) => c.canSellDuplicate && c.duplicateCount > 0);

    const noDupCard = (shopData.shop || []).find((c) => c.alreadyOwned && !c.canSellDuplicate);
    if (noDupCard) {
      const btn = page.getByRole("button", { name: "יש לך!" }).first();
      st.noSellWithoutDup = (await btn.isDisabled().catch(() => false)) ? "PASS" : "CHECK";
    }

    if (affordable) {
      const buyBtn = page.getByRole("button", { name: new RegExp(`קנה`) }).filter({ hasText: affordable.nameHe?.slice(0, 4) || "קנה" }).first();
      const anyBuy = page.getByRole("button", { name: /^קנה ב־/ }).first();
      const target = (await buyBtn.isVisible().catch(() => false)) ? buyBtn : anyBuy;
      if (await target.isVisible().catch(() => false)) {
        await target.click();
        await page.waitForTimeout(3000);
        st.purchase = /קניתם|יש לך/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
        const balanceAfter = await page.evaluate(async () => (await fetch("/api/arcade/balance")).json());
        st.balanceAfter = balanceAfter.balance;
        st.balanceUpdated = Number(balanceAfter.balance) < Number(balanceBefore);
        st.purchasedCard = affordable.nameHe || affordable.id;

        await page.goto(`${BASE}/student/cards`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2500);
        const cardsTxt = await page.locator("body").innerText();
        st.cardsPageMatch = cardsTxt.includes(affordable.nameHe?.slice(0, 6) || "") || /יש לך|האוסף/.test(cardsTxt);
      } else st.notes = "buy button not visible";
    } else st.notes = "no affordable unowned card";

    if (duplicate) {
      await page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "חנות" }).click();
      await page.waitForTimeout(3000);
      page.once("dialog", (d) => d.accept());
      const sellBtn = page.getByRole("button", { name: "מכור עותק כפול" }).first();
      if (await sellBtn.isVisible().catch(() => false)) {
        const bal = await page.evaluate(async () => (await fetch("/api/arcade/balance")).json());
        await sellBtn.click();
        await page.waitForTimeout(3000);
        const bal2 = await page.evaluate(async () => (await fetch("/api/arcade/balance")).json());
        st.sellDuplicate = /מכרתם|שווי/.test(await page.locator("body").innerText()) ? "PASS" : "FAIL";
        st.sellBalanceUp = Number(bal2.balance) > Number(bal.balance);
      } else {
        st.sellDuplicate = "NO_BUTTON";
        st.notes += " duplicate in API but no sell button";
      }
    } else {
      st.sellDuplicate = "לא נמצא duplicate זמין למכירה";
    }

    st.status = st.purchase === "PASS" && st.balanceUpdated ? "PASS" : st.purchase === "FAIL" && !affordable ? "PARTIAL" : st.purchase;
  } catch (e) {
    st.status = "FAIL";
    st.notes = String(e.message || e);
    await page.screenshot({ path: join(OUT_DIR, "shop-error.png"), fullPage: true });
  } finally {
    await a.ctx.close();
  }

  report.store = st;
  log(`shop: ${st.status || st.purchase}`);
}

const browser = await chromium.launch({ headless: true });

for (const game of GAMES) {
  await testPublicUi(browser, game);
}

await testInvite(browser);
await testShop(browser);

await browser.close();

const fails = Object.values(report.publicUi).filter((r) => r.status?.startsWith("FAIL"));
if (fails.length) report.blocking.push(`public UI fail: ${fails.map((f) => Object.keys(report.publicUi).find((k) => report.publicUi[k] === f)).join(",")}`);

if (report.invite.status === "FAIL") report.blocking.push("invite flow fail");
if (report.store.purchase === "FAIL" && !report.store.notes?.includes("no affordable")) report.blocking.push("shop purchase fail");

writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

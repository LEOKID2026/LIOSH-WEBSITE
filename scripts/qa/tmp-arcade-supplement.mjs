import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = "http://127.0.0.1:3002";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "reports", "arcade-club-live-qa", "supplement.json");
const out = {};

async function auth(browser, username) {
  const ctx = await browser.newContext();
  process.env.E2E_STUDENT_USERNAME = username;
  process.env.E2E_STUDENT_PIN = "1234";
  await applyStudentSessionFromLogin(ctx, BASE);
  return { ctx, page: await ctx.newPage() };
}

async function pick10(page) {
  await page.locator('button:has-text("10")').first().click().catch(() => {});
}

const browser = await chromium.launch({ headless: true });

// public fourline UI join
{
  const a = await auth(browser, "AAA3");
  const b = await auth(browser, "AAA4");
  await a.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await a.page.getByRole("heading", { name: "ארבע בשורה", exact: true }).click();
  await pick10(a.page);
  const [cr] = await Promise.all([
    a.page.waitForResponse((r) => r.url().includes("/api/arcade/rooms/create") && r.request().method() === "POST"),
    a.page.getByRole("button", { name: "צור חדר ציבורי" }).click(),
  ]);
  const cj = await cr.json();
  out.publicFourline = { roomId: cj.room?.id, entry: cj.room?.entry_cost, max: cj.room?.max_players };

  await b.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
  await b.page.getByRole("heading", { name: "ארבע בשורה", exact: true }).click();
  await pick10(b.page);
  await b.page.waitForTimeout(3000);
  const joinBtn = b.page.getByRole("button", { name: "הצטרף" }).first();
  out.publicFourline.joinVisible = await joinBtn.isVisible().catch(() => false);
  if (out.publicFourline.joinVisible) {
    const [jr] = await Promise.all([
      b.page.waitForResponse((r) => r.url().includes("/api/arcade/rooms/join") && r.request().method() === "POST"),
      joinBtn.click(),
    ]);
    out.publicFourline.joinStatus = jr.status();
    out.publicFourline.joinJson = await jr.json();
    if (out.publicFourline.roomId) {
      const snap = await b.page.evaluate(async (rid) => {
        const r = await fetch(`/api/arcade/rooms/${rid}/snapshot`);
        return r.json();
      }, out.publicFourline.roomId);
      out.publicFourline.sessionStarted = Boolean(snap.gameSession?.id);
      out.publicFourline.players = snap.players?.length;
    }
  }
  await a.ctx.close();
  await b.ctx.close();
}

// friends
{
  const a = await auth(browser, "AAA9");
  const b = await auth(browser, "AAA10");
  await a.page.goto(`${BASE}/student/arcade`);
  await a.page.getByRole("button", { name: "חברים" }).click();
  await b.page.goto(`${BASE}/student/arcade`);
  await b.page.getByRole("button", { name: "חברים" }).click();
  await a.page.waitForTimeout(2000);
  const leo9 = (await a.page.locator("body").innerText()).match(/\d{6}/)?.[0];
  const leo10 = (await b.page.locator("body").innerText()).match(/\d{6}/)?.[0];
  out.friends = { leo9, leo10 };
  await a.page.getByPlaceholder("מספר ליאו או שם תצוגה").fill(leo10 || "");
  await a.page.getByRole("button", { name: "הוסף חבר" }).click();
  await a.page.waitForTimeout(2500);
  out.friends.requestMsg = await a.page.locator("body").innerText().then((t) => t.match(/נשלח|כבר|עצמך|שגיא/)?.[0]);
  await b.page.reload();
  await b.page.getByRole("button", { name: "חברים" }).click();
  await b.page.waitForTimeout(2000);
  out.friends.pendingCount = await b.page.getByRole("button", { name: "אשר" }).count();
  if (out.friends.pendingCount > 0) {
    await b.page.getByRole("button", { name: "אשר" }).first().click();
    await b.page.waitForTimeout(2000);
    out.friends.accepted = true;
  }
  await a.page.reload();
  await a.page.getByRole("button", { name: "חברים" }).click();
  await a.page.waitForTimeout(2000);
  const friendsTxt = await a.page.locator("body").innerText();
  out.friends.isFriendAfter = /AAA10|339492|חברים שלי/.test(friendsTxt);
  await a.ctx.close();
  await b.ctx.close();
}

// shop
{
  const a = await auth(browser, "AAA1");
  await a.page.goto(`${BASE}/student/arcade`);
  await a.page.getByRole("button", { name: "חנות" }).click();
  await a.page.waitForTimeout(3000);
  out.shop = {
    collectorLink: await a.page.getByRole("link", { name: "לאוסף שלי" }).isVisible(),
    collectorHref: await a.page.getByRole("link", { name: "לאוסף שלי" }).getAttribute("href"),
    hasCardUi: /קלף|קני|מטבע|יש לך/.test(await a.page.locator("body").innerText()),
  };
  out.shop.balance = await a.page.evaluate(async () => {
    const r = await fetch("/api/arcade/balance");
    return r.json();
  });
  await a.ctx.close();
}

// profile
{
  const a = await auth(browser, "AAA2");
  await a.page.goto(`${BASE}/student/arcade`);
  await a.page.getByRole("button", { name: "פרופיל" }).click();
  await a.page.waitForTimeout(2000);
  const t = await a.page.locator("body").innerText();
  out.profile = {
    hasLeo6: /\d{6}/.test(t),
    showsLoginUsernameAsLeo: /שם משתמש.*AAA2/i.test(t),
    xssSafe: !t.includes("<script>"),
  };
  await a.ctx.close();
}

// domino move + emote in room
{
  const a = await auth(browser, "AAA11");
  const b = await auth(browser, "AAA12");
  let roomId = null;
  for (const st of [a, b]) {
    await st.page.goto(`${BASE}/student/arcade`, { waitUntil: "networkidle" });
    await st.page.getByRole("heading", { name: "דומינו", exact: true }).click();
    const [resp] = await Promise.all([
      st.page.waitForResponse((r) => r.url().includes("/api/arcade/quick-game") && r.request().method() === "POST"),
      st.page.getByRole("button", { name: "משחק מהיר" }).click(),
    ]);
    const j = await resp.json();
    roomId = j.room?.id;
  }
  await a.page.waitForTimeout(4000);
  await a.page.goto(`${BASE}/student/games/dominoes?roomId=${roomId}`);
  await b.page.goto(`${BASE}/student/games/dominoes?roomId=${roomId}`);
  await a.page.waitForTimeout(5000);
  out.dominoMove = { roomId, h1: await a.page.locator("h1").first().textContent().catch(() => "") };
  await a.page.getByRole("button", { name: /הודעה/ }).click().catch(() => {});
  await a.page.waitForTimeout(500);
  const preset = a.page.locator('button:has-text("👍"), button:has-text("בהצלחה"), button:has-text("כל הכבוד")').first();
  if (await preset.isVisible().catch(() => false)) {
    await preset.click();
    out.dominoMove.emoteSent = true;
    await b.page.waitForTimeout(2500);
    out.dominoMove.emoteVisibleP2 = await b.page.locator("text=👍").isVisible().catch(() => false);
  }
  const playable = a.page.locator("button").filter({ has: a.page.locator("div.font-mono") });
  const n = await playable.count();
  if (n > 0) {
    await playable.first().click();
    out.dominoMove.tileClicked = true;
  }
  await a.ctx.close();
  await b.ctx.close();
}

await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

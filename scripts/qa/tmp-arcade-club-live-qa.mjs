/**
 * Live QA — arcade club + online games (temporary runner, not committed).
 * Usage: node scripts/qa/tmp-arcade-club-live-qa.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyStudentSessionFromLogin } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3002";
const PIN = "1234";
const OUT_DIR = join(REPO, "reports", "arcade-club-live-qa");
const OUT_JSON = join(OUT_DIR, `run-${Date.now()}.json`);

const GAMES = [
  { key: "fourline", title: "ארבע בשורה", path: "fourline", twoPlayer: true, flex: false },
  { key: "ludo", title: "לודו", path: "ludo", twoPlayer: false, flex: true },
  { key: "snakes-and-ladders", title: "נחשים וסולמות", path: "snakes-and-ladders", twoPlayer: false, flex: true },
  { key: "checkers", title: "דמקה", path: "checkers", twoPlayer: true, flex: false },
  { key: "chess", title: "שחמט", path: "chess", twoPlayer: true, flex: false },
  { key: "dominoes", title: "דומינו", path: "dominoes", twoPlayer: true, flex: false },
  { key: "bingo", title: "בינגו", path: "bingo", twoPlayer: false, flex: true },
];

/** @type {Record<string, unknown>} */
const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE,
  users: {},
  dominoes: {},
  games: {},
  quickStart: {},
  friends: {},
  shop: {},
  profile: {},
  emotes: {},
  forcedExit: {},
  consoleErrors: [],
  networkErrors: [],
  blocking: [],
  filesChanged: false,
};

function log(msg) {
  console.log(`[qa] ${msg}`);
}

function trackConsole(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push({ label, text: msg.text(), url: page.url() });
    }
  });
}

function trackNetwork(page, label) {
  page.on("response", (res) => {
    const url = res.url();
    if (!url.includes("/api/")) return;
    if (res.status() >= 400) {
      report.networkErrors.push({
        label,
        status: res.status(),
        url,
        method: res.request().method(),
      });
    }
  });
}

async function authContext(browser, username) {
  const context = await browser.newContext({ locale: "he-IL" });
  const prev = {
    u: process.env.E2E_STUDENT_USERNAME,
    p: process.env.E2E_STUDENT_PIN,
    c: process.env.E2E_STUDENT_CODE,
  };
  process.env.E2E_STUDENT_USERNAME = username;
  process.env.E2E_STUDENT_PIN = PIN;
  process.env.E2E_STUDENT_CODE = "";
  await applyStudentSessionFromLogin(context, BASE);
  process.env.E2E_STUDENT_USERNAME = prev.u;
  process.env.E2E_STUDENT_PIN = prev.p;
  process.env.E2E_STUDENT_CODE = prev.c;
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  trackConsole(page, username);
  trackNetwork(page, username);
  return { context, page };
}

async function gotoArcade(page) {
  await page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "משחקים" }).click({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function selectGame(page, title) {
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page.waitForTimeout(400);
}

async function pickEntryCost(page) {
  const btn = page.locator('button:has-text("10")').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function quickMatch(page) {
  await pickEntryCost(page);
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/arcade/quick-game") && r.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: "משחק מהיר" }).click(),
  ]);
  const json = await resp.json().catch(() => ({}));
  await page.waitForTimeout(1500);
  return json?.room?.id ? String(json.room.id) : null;
}

async function createPublicRoom(page) {
  await pickEntryCost(page);
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/arcade/rooms/create") && r.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: "צור חדר ציבורי" }).click(),
  ]);
  const json = await resp.json().catch(() => ({}));
  await page.waitForTimeout(1500);
  return { roomId: json?.room?.id ? String(json.room.id) : null, json };
}

async function createPrivateRoom(page) {
  await pickEntryCost(page);
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/arcade/rooms/create") && r.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.getByRole("button", { name: "צור חדר פרטי" }).click(),
  ]);
  const json = await resp.json().catch(() => ({}));
  await page.waitForTimeout(1500);
  const joinCode = json?.room?.join_code ? String(json.room.join_code) : await extractJoinCode(page);
  return { roomId: json?.room?.id ? String(json.room.id) : null, joinCode, json };
}

async function extractRoomId(page) {
  const link = page.getByRole("link", { name: "כניסה למשחק" });
  if (await link.isVisible().catch(() => false)) {
    const href = await link.getAttribute("href");
    const m = String(href || "").match(/roomId=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

async function extractJoinCode(page) {
  const codeEl = page.locator("p.font-mono, .font-mono").filter({ hasText: /^[A-Z0-9]{4,8}$/ });
  const text = await page.locator('[class*="roomReadyCodeValue"], p.font-mono').first().textContent().catch(() => "");
  const m = String(text || "").match(/\b([A-Z0-9]{4,8})\b/);
  if (m) return m[1];
  const panel = await page.locator("text=קוד חדר").locator("..").textContent().catch(() => "");
  const m2 = String(panel).match(/\b([A-Z0-9]{6})\b/);
  return m2 ? m2[1] : null;
}

async function snapshot(page, roomId) {
  return page.evaluate(async (rid) => {
    const r = await fetch(`/api/arcade/rooms/${encodeURIComponent(rid)}/snapshot`);
    return r.json();
  }, roomId);
}

async function waitSession(page, roomId, maxMs, expectStart) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < maxMs) {
    last = await snapshot(page, roomId);
    const active =
      last?.gameSession?.status === "active" ||
      last?.room?.status === "active" ||
      Boolean(last?.gameSession?.id);
    if (expectStart && active) {
      return { ok: true, elapsedMs: Date.now() - t0, snap: last };
    }
    if (!expectStart && active) {
      return { ok: false, early: true, elapsedMs: Date.now() - t0, snap: last };
    }
    await page.waitForTimeout(2000);
  }
  if (expectStart) return { ok: false, elapsedMs: Date.now() - t0, snap: last };
  return { ok: true, elapsedMs: Date.now() - t0, snap: last };
}

async function enterGame(page, gamePath, roomId) {
  const url = `${BASE}/student/games/${gamePath}?roomId=${encodeURIComponent(roomId)}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  return page.url();
}

async function joinByCodeWithRoom(page, code) {
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/arcade/rooms/join-by-code") && r.request().method() === "POST",
      { timeout: 60_000 },
    ),
    (async () => {
      await page.locator('input[placeholder="קוד החדר"]').fill(code);
      await page.getByRole("button", { name: "הצטרף לפי קוד" }).click();
    })(),
  ]);
  const json = await resp.json().catch(() => ({}));
  await page.waitForTimeout(1500);
  return { roomId: json?.room?.id ? String(json.room.id) : null, status: resp.status(), json };
}

async function joinPublicRoom(page, roomId) {
  const res = await page.evaluate(async (rid) => {
    const r = await fetch("/api/arcade/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: rid }),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, roomId);
  await page.waitForTimeout(1500);
  return res.json?.room?.id ? String(res.json.room.id) : null;
}

async function joinPublicFromList(page, roomId) {
  const item = page.locator(`li:has-text("${roomId.slice(0, 8)}")`).first();
  if (await item.isVisible().catch(() => false)) {
    await item.getByRole("button", { name: "הצטרף" }).click();
    await page.waitForTimeout(2500);
    return true;
  }
  const res = await page.evaluate(async (rid) => {
    const r = await fetch("/api/arcade/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: rid }),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, roomId);
  return res.status === 200 && res.json?.ok;
}

async function tryDominoMove(page) {
  const tile = page.locator('button[class*="domino"], button:has(div[class*="Domino"])').first();
  if (await tile.isVisible().catch(() => false)) {
    await tile.click();
    await page.waitForTimeout(1500);
    return true;
  }
  const anyPlay = page.locator("button").filter({ hasText: /^[0-6]-[0-6]$/ }).first();
  if (await anyPlay.isVisible().catch(() => false)) {
    await anyPlay.click();
    await page.waitForTimeout(1500);
    return true;
  }
  const handBtn = page.locator('[class*="hand"] button, button[aria-label*="domino"]').first();
  if (await handBtn.isVisible().catch(() => false)) {
    await handBtn.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function testDominoes(browser) {
  log("=== dominoes block ===");
  const d = { quick: {}, public: {}, private: {}, forcedExit: {} };

  const { context: c1, page: p1 } = await authContext(browser, "AAA1");
  const { context: c2, page: p2 } = await authContext(browser, "AAA2");

  // A quick
  await gotoArcade(p1);
  await selectGame(p1, "דומינו");
  const roomQuick1 = await quickMatch(p1);
  d.quick.hostRoomId = roomQuick1;

  await gotoArcade(p2);
  await selectGame(p2, "דומינו");
  const roomQuick2 = await quickMatch(p2);
  d.quick.guestRoomId = roomQuick2;
  d.quick.sameRoom = roomQuick1 && roomQuick2 && roomQuick1 === roomQuick2;

  if (!d.quick.sameRoom) {
    report.blocking.push("dominoes quick: players not in same room");
    d.quick.status = "FAIL";
  } else {
    const wait = await waitSession(p1, roomQuick1, 45_000, true);
    d.quick.startWaitMs = wait.elapsedMs;
    d.quick.started = wait.ok;
    d.quick.maxPlayers = wait.snap?.room?.max_players;
    d.quick.playerCount = wait.snap?.players?.length;
    if (!wait.ok) {
      report.blocking.push("dominoes quick: session did not start with 2 players");
      d.quick.status = "FAIL";
    } else {
      await enterGame(p1, "dominoes", roomQuick1);
      await enterGame(p2, "dominoes", roomQuick1);
      d.quick.moveP1 = await tryDominoMove(p1);
      d.quick.status = d.quick.moveP1 ? "PASS" : "PARTIAL(no move UI)";
    }
  }

  if (d.quick.status === "FAIL") {
    report.dominoes = d;
    await c1.close();
    await c2.close();
    return false;
  }

  await c1.close();
  await c2.close();

  // B public AAA3/AAA4
  const { context: c3, page: p3 } = await authContext(browser, "AAA3");
  const { context: c4, page: p4 } = await authContext(browser, "AAA4");
  await gotoArcade(p3);
  await selectGame(p3, "דומינו");
  const pubCreated = await createPublicRoom(p3);
  const pubRoom = pubCreated.roomId;
  d.public.roomId = pubRoom;
  await gotoArcade(p4);
  await selectGame(p4, "דומינו");
  if (pubRoom) await joinPublicFromList(p4, pubRoom);
  const pubRoom2 = pubRoom ? await joinPublicRoom(p4, pubRoom) : null;
  d.public.sameRoom = pubRoom === pubRoom2;
  if (pubRoom && d.public.sameRoom) {
    const w = await waitSession(p3, pubRoom, 45_000, true);
    d.public.started = w.ok;
    d.public.startWaitMs = w.elapsedMs;
    if (w.ok) {
      await enterGame(p3, "dominoes", pubRoom);
      await enterGame(p4, "dominoes", pubRoom);
      d.public.move = await tryDominoMove(p3);
    }
    d.public.status = w.ok ? "PASS" : "FAIL";
  } else d.public.status = "FAIL";
  await c3.close();
  await c4.close();

  // C private AAA5/AAA6
  const { context: c5, page: p5 } = await authContext(browser, "AAA5");
  const { context: c6, page: p6 } = await authContext(browser, "AAA6");
  await gotoArcade(p5);
  await selectGame(p5, "דומינו");
  const privCreated = await createPrivateRoom(p5);
  const privRoom = privCreated.roomId;
  const joinCode = privCreated.joinCode;
  d.private.roomId = privRoom;
  d.private.joinCode = joinCode;

  await gotoArcade(p6);
  await selectGame(p6, "דומינו");
  const badJoin = await joinByCodeWithRoom(p6, "WRONG1");
  d.private.badCodeFailed = badJoin.status >= 400 || badJoin.json?.ok === false;

  if (joinCode) {
    const goodJoin = await joinByCodeWithRoom(p6, joinCode);
    const priv2 = goodJoin.roomId;
    d.private.sameRoom = privRoom === priv2;
    if (privRoom && d.private.sameRoom) {
      const w = await waitSession(p5, privRoom, 45_000, true);
      d.private.started = w.ok;
      d.private.startWaitMs = w.elapsedMs;
      d.private.status = w.ok ? "PASS" : "FAIL";
    } else d.private.status = "FAIL";
  } else d.private.status = "FAIL";

  // D forced exit — new quick pair AAA7/AAA8
  await c5.close();
  await c6.close();
  const { context: c7, page: p7 } = await authContext(browser, "AAA7");
  const { context: c8, page: p8 } = await authContext(browser, "AAA8");
  await gotoArcade(p7);
  await selectGame(p7, "דומינו");
  const fxRoom = await quickMatch(p7);
  await gotoArcade(p8);
  await selectGame(p8, "דומינו");
  await quickMatch(p8);
  if (fxRoom) {
    const w = await waitSession(p7, fxRoom, 45_000, true);
    if (w.ok) {
      await enterGame(p7, "dominoes", fxRoom);
      await enterGame(p8, "dominoes", fxRoom);
      await tryDominoMove(p7);
      await c7.close();
      d.forcedExit.closedP7 = true;
      await p8.waitForTimeout(5000);
      const snap8 = await snapshot(p8, fxRoom);
      d.forcedExit.p8SnapStatus = snap8?.room?.status;
      d.forcedExit.p8HasError = await p8.locator("text=שגיאה").isVisible().catch(() => false);
      d.forcedExit.p8Url = p8.url();
      d.forcedExit.status = "OBSERVED";
    }
  }
  await c7.close().catch(() => {});
  await c8.close();

  report.dominoes = d;
  return d.quick.status !== "FAIL";
}

async function testQuickGame(browser, game, u1, u2, u3 = null) {
  const key = game.key;
  log(`quick: ${key} (${u1}+${u2})`);
  const row = { players: 2, startedImmediately: null, waitMs: null, thirdJoined: null, status: "FAIL" };

  const { context: c1, page: p1 } = await authContext(browser, u1);
  const { context: c2, page: p2 } = await authContext(browser, u2);

  await gotoArcade(p1);
  await selectGame(p1, game.title);
  const r1 = await quickMatch(p1);

  await gotoArcade(p2);
  await selectGame(p2, game.title);
  const r2 = await quickMatch(p2);

  row.sameRoom = r1 && r2 && r1 === r2;
  row.roomId = r1;

  if (!row.sameRoom) {
    row.status = "FAIL pairing";
    report.games[key] = { ...(report.games[key] || {}), quick: row };
    report.quickStart[key] = row;
    await c1.close();
    await c2.close();
    return row;
  }

  if (game.flex) {
    const early = await waitSession(p1, r1, 8000, true);
    row.startedImmediately = early.ok;
    if (early.ok) {
      row.status = "FAIL started before 60s";
      report.blocking.push(`${key} quick: started immediately with 2 players`);
    } else {
      if (u3) {
        const { context: c3, page: p3 } = await authContext(browser, u3);
        await gotoArcade(p3);
        await selectGame(p3, game.title);
        const r3 = await quickMatch(p3);
        row.thirdJoined = r3 === r1;
        await c3.close();
      }
      const full = await waitSession(p1, r1, 68_000, true);
      row.waitMs = full.elapsedMs;
      row.startedAfterWait = full.ok;
      row.status = full.ok ? "PASS" : "FAIL no start after 60s";
    }
  } else {
    const w = await waitSession(p1, r1, 45_000, true);
    row.waitMs = w.elapsedMs;
    row.startedImmediately = w.ok && w.elapsedMs < 15_000;
    row.status = w.ok ? "PASS" : "FAIL";
    if (w.ok) {
      await enterGame(p1, game.path, r1);
      await enterGame(p2, game.path, r1);
      row.loadedBoth = true;
    }
  }

  report.games[key] = { ...(report.games[key] || {}), quick: row };
  report.quickStart[key] = row;
  await c1.close();
  await c2.close();
  return row;
}

async function testRoomMode(browser, game, mode, u1, u2) {
  const key = game.key;
  log(`${mode}: ${key}`);
  const row = { status: "FAIL", roomId: null, sameRoom: false, started: false };

  const { context: c1, page: p1 } = await authContext(browser, u1);
  const { context: c2, page: p2 } = await authContext(browser, u2);

  await gotoArcade(p1);
  await selectGame(p1, game.title);
  let rowRoomId = null;
  if (mode === "public") {
    const created = await createPublicRoom(p1);
    rowRoomId = created.roomId;
  } else {
    const created = await createPrivateRoom(p1);
    row.roomId = created.roomId;
    row.joinCode = created.joinCode;
    rowRoomId = created.roomId;
  }
  row.roomId = rowRoomId;

  await gotoArcade(p2);
  await selectGame(p2, game.title);
  if (mode === "public" && rowRoomId) {
    await joinPublicFromList(p2, rowRoomId);
    row.sameRoom = (await joinPublicRoom(p2, rowRoomId)) === rowRoomId;
  } else if (row.joinCode) {
    const joined = await joinByCodeWithRoom(p2, row.joinCode);
    row.sameRoom = joined.roomId === rowRoomId;
  }

  if (row.sameRoom && row.roomId) {
    const maxWait = game.flex ? 68_000 : 45_000;
    const w = await waitSession(p1, row.roomId, maxWait, true);
    row.started = w.ok;
    row.waitMs = w.elapsedMs;
    if (w.ok) {
      await enterGame(p1, game.path, row.roomId);
      await enterGame(p2, game.path, row.roomId);
      row.status = "PASS";
    } else row.status = "FAIL no session";
  }

  report.games[key] = { ...(report.games[key] || {}), [mode]: row };
  await c1.close();
  await c2.close();
  return row;
}

async function testFriends(browser) {
  log("=== friends ===");
  const f = {};
  const { context: c9, page: p9 } = await authContext(browser, "AAA9");
  const { context: c10, page: p10 } = await authContext(browser, "AAA10");

  await p9.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await p9.getByRole("button", { name: "חברים" }).click();
  await p10.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await p10.getByRole("button", { name: "חברים" }).click();
  await p9.waitForTimeout(2000);
  await p10.waitForTimeout(2000);

  const leo9 = await p9.locator("text=/\\d{6}/").first().textContent().catch(() => "");
  const leo10 = await p10.locator("text=/\\d{6}/").first().textContent().catch(() => "");
  f.leo9 = (leo9 || "").match(/\d{6}/)?.[0] || null;
  f.leo10 = (leo10 || "").match(/\d{6}/)?.[0] || null;

  // remove existing friendship if any — delete via API
  await p9.evaluate(async () => {
    const r = await fetch("/api/arcade/friends");
    const j = await r.json();
    for (const fr of j.friends || []) {
      await fetch("/api/arcade/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", friendStudentId: fr.studentId }),
      });
    }
  });

  const selfRes = await p9.evaluate(async (ownLeo) => {
    const r = await fetch("/api/arcade/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", query: ownLeo || "000000" }),
    });
    return { status: r.status, json: await r.json() };
  }, f.leo9);
  f.selfRequestBlocked = selfRes.json?.code === "self" || /עצמך/.test(String(selfRes.json?.error || selfRes.json?.message || ""));

  if (f.leo10) {
    await p9.locator('input[placeholder*="ליאו"], input[type="text"]').first().fill(f.leo10);
    await p9.getByRole("button", { name: /שלח|בקשה|חבר/ }).first().click();
    await p9.waitForTimeout(2000);
  }

  const pending10 = await p10.evaluate(async () => {
    const r = await fetch("/api/arcade/friends");
    return (await r.json()).pendingIncoming?.length || 0;
  });
  f.pendingOn10 = pending10;

  await p10.getByRole("button", { name: /אשר|קבל/ }).first().click({ timeout: 10_000 }).catch(() => {});
  await p10.waitForTimeout(2000);

  const friendsBoth = await p9.evaluate(async () => {
    const r = await fetch("/api/arcade/friends");
    const j = await r.json();
    return (j.friends || []).length;
  });
  f.friendsAfterAccept = friendsBoth;

  // invite
  await p9.getByRole("button", { name: /הזמן|invite/i }).first().click({ timeout: 8000 }).catch(() => {});
  await p9.waitForTimeout(1500);

  const inv10 = await p10.evaluate(async () => {
    const r = await fetch("/api/arcade/invites");
    return (await r.json()).invites?.length || 0;
  });
  f.invitesOn10 = inv10;

  report.friends = f;
  await c9.close();
  await c10.close();
}

async function testEmotes403(browser) {
  log("=== emotes ===");
  const e = {};
  const { context: c1, page: p1 } = await authContext(browser, "AAA11");
  const { context: c2, page: p2 } = await authContext(browser, "AAA12");

  await gotoArcade(p1);
  await selectGame(p1, "דומינו");
  const room = await quickMatch(p1);
  await gotoArcade(p2);
  await selectGame(p2, "דומינו");
  await quickMatch(p2);
  if (room) await waitSession(p1, room, 45_000, true);

  if (room) {
    await enterGame(p1, "dominoes", room);
    await enterGame(p2, "dominoes", room);
    await p1.getByRole("button", { name: /הודעה/ }).click().catch(() => {});
    await p1.waitForTimeout(500);
    const preset = p1.locator('button:has-text("👍"), button:has-text("בהצלחה")').first();
    if (await preset.isVisible().catch(() => false)) {
      await preset.click();
      e.inRoomSent = true;
      await p2.waitForTimeout(2000);
      e.inRoomVisibleP2 = await p2.locator("text=👍").isVisible().catch(() => false);
    }

    const outsider = await p2.evaluate(async (otherRoom) => {
      const r = await fetch("/api/arcade/safe-messages");
      const j = await r.json();
      const mid = j.messages?.[0]?.id;
      if (!mid) return { skip: true };
      const res = await fetch(`/api/arcade/rooms/${otherRoom}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: mid }),
      });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    }, "00000000-0000-0000-0000-000000000001");
    e.outsider403 = outsider.status === 403 || outsider.json?.code === "not_room_member";
  }

  report.emotes = e;
  await c1.close();
  await c2.close();
}

async function testShop(browser) {
  log("=== shop ===");
  const s = {};
  const { context, page } = await authContext(browser, "AAA1");
  await page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "חנות" }).click();
  await page.waitForTimeout(3000);
  s.cardsVisible = await page.locator("text=קלף, text=קנ").first().isVisible().catch(() => false);
  const cardsLink = page.getByRole("link", { name: "לאוסף שלי" });
  s.hasCollectorLink = await cardsLink.isVisible().catch(() => false);
  if (s.hasCollectorLink) {
    const href = await cardsLink.getAttribute("href");
    s.collectorHref = href;
  }
  const balBefore = await page.evaluate(async () => {
    const r = await fetch("/api/student/home-summary");
    const j = await r.json();
    return j?.coinBalance ?? j?.balance ?? null;
  });
  s.balanceBefore = balBefore;
  report.shop = s;
  await context.close();
}

async function testProfile(browser) {
  log("=== profile ===");
  const pr = {};
  const { context, page } = await authContext(browser, "AAA2");
  await page.goto(`${BASE}/student/arcade`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "פרופיל" }).click();
  await page.waitForTimeout(2000);
  const body = await page.textContent("body");
  pr.hasLeo6 = /\d{6}/.test(body || "");
  pr.hasLoginUsername = /\bAAA2\b/.test(body || "") && !pr.hasLeo6;
  pr.xssBlocked = !(body || "").includes("<script>");
  report.profile = pr;
  await context.close();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  log(`BASE=${BASE}`);

  const probe = await fetch(`${BASE}/student/login`).catch(() => null);
  if (!probe?.ok) {
    report.blocking.push(`dev server not reachable at ${BASE}`);
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    console.error("Server not ready");
    process.exit(1);
  }

  report.users = {
    pin: PIN,
    used: ["AAA1", "AAA2", "AAA3", "AAA4", "AAA5", "AAA6", "AAA7", "AAA8", "AAA9", "AAA10", "AAA11", "AAA12"],
  };

  const browser = await chromium.launch({ headless: true });

  try {
    const domOk = await testDominoes(browser);
    if (!domOk) {
      log("STOP: dominoes failed");
    } else {
      // quick all games (skip dominoes — already tested)
      const pairs = [
        ["fourline", "AAA1", "AAA2"],
        ["ludo", "AAA3", "AAA4", "AAA5"],
        ["snakes-and-ladders", "AAA6", "AAA7", "AAA8"],
        ["checkers", "AAA9", "AAA10"],
        ["chess", "AAA11", "AAA12"],
        ["bingo", "AAA1", "AAA2", "AAA3"],
      ];
      for (const [key, u1, u2, u3] of pairs) {
        const game = GAMES.find((g) => g.key === key);
        if (game) await testQuickGame(browser, game, u1, u2, u3 || null);
      }

      // public/private — rotate students
      const modes = [
        ["fourline", "public", "AAA3", "AAA4"],
        ["fourline", "private", "AAA5", "AAA6"],
        ["ludo", "public", "AAA7", "AAA8"],
        ["ludo", "private", "AAA9", "AAA10"],
        ["snakes-and-ladders", "public", "AAA11", "AAA12"],
        ["snakes-and-ladders", "private", "AAA1", "AAA2"],
        ["checkers", "public", "AAA3", "AAA4"],
        ["checkers", "private", "AAA5", "AAA6"],
        ["chess", "public", "AAA7", "AAA8"],
        ["chess", "private", "AAA9", "AAA10"],
        ["dominoes", "public", "AAA11", "AAA12"],
        ["dominoes", "private", "AAA1", "AAA2"],
        ["bingo", "public", "AAA3", "AAA4"],
        ["bingo", "private", "AAA5", "AAA6"],
      ];
      for (const [key, mode, u1, u2] of modes) {
        const game = GAMES.find((g) => g.key === key);
        if (game) await testRoomMode(browser, game, mode, u1, u2);
      }

      await testFriends(browser);
      await testEmotes403(browser);
      await testShop(browser);
      await testProfile(browser);
    }
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  log(`Wrote ${OUT_JSON}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.fatal = String(err?.stack || err);
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  console.error(err);
  process.exit(1);
});

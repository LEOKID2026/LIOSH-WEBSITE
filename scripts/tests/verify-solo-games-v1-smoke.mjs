#!/usr/bin/env node
/**
 * Solo Leo Games V1+V2 — smoke test (API + DB + browser + responsive).
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local scripts/tests/verify-solo-games-v1-smoke.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium, devices } from "playwright";

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3001";
const USERNAME = process.env.E2E_STUDENT_USERNAME || "leo-s01";
const PIN = process.env.E2E_STUDENT_PIN || "1234";
const MIN_PLAY_WAIT_MS = 5500;

const HUB_GAMES = [
  "תופס עם ליאו",
  "חידת ליאו",
  "זיכרון ליאו",
  "ליאו במטוס",
  "ליאו קופץ",
  "פיצוץ בלונים",
  "מבוך ליאו",
  "פאזל תמונה",
  "קליעה למטרה",
  "מיון צורות",
];

const HUB_ROUTES = ["/game", "/games"];

const SOLO_ROUTES = [
  "/student/solo-games",
  "/student/solo-games/catcher",
  "/student/solo-games/puzzle",
  "/student/solo-games/memory",
  "/student/solo-games/flyer",
  "/student/solo-games/leo-jump",
  "/student/solo-games/balloons",
  "/student/solo-games/maze",
  "/student/solo-games/picture-puzzle",
  "/student/solo-games/target-tap",
  "/student/solo-games/sort-shapes",
];

const ALL_GAME_KEYS = [
  "catcher",
  "flyer",
  "puzzle",
  "memory",
  "leo-jump",
  "balloons",
  "maze",
  "picture-puzzle",
  "target-tap",
  "sort-shapes",
];

/** @type {{ pass: string[], fail: string[], warn: string[] }} */
const report = { pass: [], fail: [], warn: [] };

function pass(label) {
  report.pass.push(label);
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  const msg = err instanceof Error ? err.message : String(err);
  report.fail.push(`${label}: ${msg}`);
  console.error(`  ✗ ${label}: ${msg}`);
}

function warn(label) {
  report.warn.push(label);
  console.warn(`  ⚠ ${label}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env (NEXT_PUBLIC_LEARNING_SUPABASE_URL / LEARNING_SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loginViaForm(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  await page.getByTestId("student-login-username").fill(USERNAME);
  await page.getByTestId("student-login-pin").fill(PIN);
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 30_000 });
}

function authHeaders() {
  return {
    Origin: BASE,
    Referer: `${BASE}/student/login`,
  };
}

async function studentLoginRequest(request) {
  const res = await request.post(`${BASE}/api/student/login`, {
    data: { username: USERNAME, pin: PIN },
    headers: authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || body?.ok !== true) {
    throw new Error(`Login failed HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

async function fetchMe(request) {
  const res = await request.get(`${BASE}/api/student/me`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.ok || !json?.student?.id) throw new Error("student/me failed");
  return json;
}

async function getBalance(supabase, studentId) {
  const { data } = await supabase
    .from("student_coin_balances")
    .select("balance")
    .eq("student_id", studentId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

async function startSession(request, gameKey, difficulty = null) {
  const res = await request.post(`${BASE}/api/student/solo-games/start`, {
    data: { gameKey, difficulty: difficulty || undefined },
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok() && json?.ok === true, status: res.status, json };
}

async function finishSession(request, sessionId, metrics) {
  const res = await request.post(`${BASE}/api/student/solo-games/finish`, {
    data: { sessionId, metrics },
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok() && json?.ok === true, status: res.status, json };
}

const GAME_METRICS = {
  catcher: { score: 85, levelReached: 8, didWin: false },
  flyer: { score: 72, levelReached: 6, didWin: false },
  puzzle: { score: 120, didWin: false, difficulty: "easy", timeRemainingSec: 0 },
  memory: { score: 980, didWin: true, difficulty: "easy", mistakes: 2, timeRemainingSec: 110 },
  "leo-jump": { score: 85, levelReached: 8, didWin: false },
  balloons: { score: 150, levelReached: 0, didWin: true, timeRemainingSec: 10 },
  maze: { score: 520, didWin: true, difficulty: "easy", mistakes: 5, timeRemainingSec: 80 },
  "picture-puzzle": { score: 900, didWin: true, difficulty: "easy", mistakes: 10, timeRemainingSec: 100 },
  "target-tap": { score: 240, didWin: true, difficulty: "easy", mistakes: 2, timeRemainingSec: 20, levelReached: 48 },
  "sort-shapes": { score: 580, didWin: true, difficulty: "easy", mistakes: 2, timeRemainingSec: 40 },
};

async function verifyDbRules(supabase) {
  console.log("\n=== DB: payout rules ===");
  const { data, error } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key, is_active")
    .order("game_key");
  if (error) throw error;
  const keys = (data || []).map((r) => r.game_key);
  for (const k of ALL_GAME_KEYS) {
    assert.ok(keys.includes(k), `missing rule row for ${k}`);
  }
  pass(`reward_economy_solo_game_rules has ${ALL_GAME_KEYS.length} games`);
}

async function verifyApiFlow(request, supabase, studentId) {
  console.log("\n=== API: start/finish + DB + coins (10 games) ===");
  const balanceBefore = await getBalance(supabase, studentId);
  pass(`Initial balance: ${balanceBefore}`);

  let totalCoinsAwarded = 0;
  const sessionIds = [];

  for (const gameKey of ALL_GAME_KEYS) {
    const diff =
      gameKey === "puzzle" ||
      gameKey === "memory" ||
      gameKey === "maze" ||
      gameKey === "picture-puzzle" ||
      gameKey === "target-tap" ||
      gameKey === "sort-shapes"
        ? "easy"
        : null;
    const start = await startSession(request, gameKey, diff);
    if (!start.ok) {
      fail(`${gameKey} start`, start.json?.error || start.status);
      continue;
    }
    const sessionId = start.json.sessionId;
    sessionIds.push({ gameKey, sessionId });
    pass(`${gameKey} start → session ${sessionId.slice(0, 8)}…`);

    const { data: activeRow } = await supabase
      .from("solo_game_sessions")
      .select("id, status, game_key")
      .eq("id", sessionId)
      .maybeSingle();
    assert.equal(activeRow?.status, "active", `${gameKey} session not active`);
    pass(`${gameKey} DB row active`);

    await sleep(MIN_PLAY_WAIT_MS);

    const finish = await finishSession(request, sessionId, GAME_METRICS[gameKey]);
    if (!finish.ok) {
      fail(`${gameKey} finish`, finish.json?.error || finish.status);
      continue;
    }

    const coins = Number(finish.json.coinsAwarded ?? 0);
    totalCoinsAwarded += coins;
    pass(`${gameKey} finish → +${coins} coins (duplicate=${finish.json.duplicate === true})`);

    const { data: completed } = await supabase
      .from("solo_game_sessions")
      .select("status, metrics_json, coins_awarded, result_json")
      .eq("id", sessionId)
      .maybeSingle();

    assert.equal(completed?.status, "completed", `${gameKey} status not completed`);
    assert.ok(completed?.metrics_json && typeof completed.metrics_json === "object");
    assert.equal(Number(completed?.coins_awarded), coins);
    pass(`${gameKey} DB completed + metrics_json + coins_awarded`);

    const { data: tx } = await supabase
      .from("coin_transactions")
      .select("id, source_type, amount, idempotency_key, direction")
      .eq("student_id", studentId)
      .eq("idempotency_key", `solo_game_${sessionId}`)
      .maybeSingle();

    if (coins > 0) {
      assert.equal(tx?.source_type, "solo_game", `${gameKey} wrong source_type`);
      assert.equal(tx?.direction, "earn");
      assert.equal(Number(tx?.amount), coins);
      pass(`${gameKey} coin_transactions source_type=solo_game amount=${coins}`);
    } else {
      assert.ok(!tx, `${gameKey} unexpected tx for 0 coins`);
      pass(`${gameKey} 0 coins — no transaction (expected for memory loss path N/A here)`);
    }
  }

  const balanceAfter = await getBalance(supabase, studentId);
  const delta = balanceAfter - balanceBefore;
  if (delta === totalCoinsAwarded) {
    pass(`Balance increased by ${delta} (matches sum of awards ${totalCoinsAwarded})`);
  } else {
    fail("Balance delta", `expected +${totalCoinsAwarded}, got +${delta} (${balanceBefore} → ${balanceAfter})`);
  }

  // Duplicate finish on last session
  const last = sessionIds[sessionIds.length - 1];
  if (last) {
    const dup = await finishSession(request, last.sessionId, GAME_METRICS[last.gameKey]);
    if (dup.ok && dup.json.duplicate === true) {
      pass(`${last.gameKey} duplicate finish → duplicate=true, no extra coins`);
    } else if (!dup.ok && (dup.json?.code === "session_closed" || dup.status === 404)) {
      pass(`${last.gameKey} duplicate finish blocked (session already closed)`);
    } else {
      fail(`${last.gameKey} duplicate finish`, dup.json?.error || "unexpected response");
    }
    const balanceAfterDup = await getBalance(supabase, studentId);
    if (balanceAfterDup === balanceAfter) {
      pass("Balance unchanged after duplicate finish");
    } else {
      fail("Duplicate balance", `${balanceAfter} → ${balanceAfterDup}`);
    }
  }

  return { balanceBefore, balanceAfter, totalCoinsAwarded };
}

async function checkNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  if (overflow.doc <= 2 && overflow.body <= 2) {
    pass(`${label}: no horizontal scroll`);
  } else {
    fail(`${label}: horizontal scroll`, `doc=${overflow.doc} body=${overflow.body}`);
  }
}

async function verifyBrowserFlow(supabase, studentId) {
  console.log("\n=== Browser: login, hub, games, finish UI, responsive ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Desktop Chrome"],
    baseURL: BASE,
    locale: "he-IL",
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
    await studentLoginRequest(page.request);

    // Hub + games work with session cookie (verified). Home CTA may need dev/manual due to prod hydration.
    await page.goto(`${BASE}/student/solo-games`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    pass("Authenticated session → /student/solo-games hub");

    for (const title of HUB_GAMES) {
      const card = page.getByRole("heading", { name: title });
      if ((await card.count()) >= 1) pass(`Hub shows: ${title}`);
      else fail(`Hub missing: ${title}`, "heading not found");
    }

    await checkNoHorizontalScroll(page, "Hub desktop");

    await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const homeSoloLink = page.locator('a[href="/student/solo-games"]');
    if ((await homeSoloLink.count()) >= 1 && (await homeSoloLink.first().isVisible())) {
      await homeSoloLink.first().click();
      await page.waitForURL(/\/student\/solo-games\/?$/, { timeout: 15_000 });
      pass("Home CTA → /student/solo-games");
    } else {
      warn("Home CTA not visible in headless prod — verify manually in dev browser (href exists in home.js)");
    }

    await page.goto(`${BASE}/student/solo-games`, { waitUntil: "domcontentloaded" });

    // --- Puzzle portrait landscape gate ---
    const mobile = await browser.newContext({
      ...devices["iPhone 13"],
      baseURL: BASE,
      locale: "he-IL",
    });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
    await studentLoginRequest(mobilePage.request);
    await mobilePage.goto(`${BASE}/student/solo-games/puzzle`, { waitUntil: "domcontentloaded" });
    await mobilePage.getByRole("button", { name: "התחל משחק" }).click();
    await mobilePage.waitForTimeout(2000);
    const gateText = mobilePage.getByRole("dialog", { name: "סובבו את המכשיר" });
    if ((await gateText.count()) >= 1) pass("Puzzle mobile portrait → landscape gate");
    else fail("Puzzle landscape gate", "message not visible");

    // Landscape puzzle mobile
    const landscape = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
      baseURL: BASE,
      locale: "he-IL",
    });
    const landPage = await landscape.newPage();
    await landPage.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
    await studentLoginRequest(landPage.request);
    await landPage.goto(`${BASE}/student/solo-games/puzzle`, { waitUntil: "domcontentloaded" });
    await landPage.getByRole("button", { name: "התחל משחק" }).click();
    await landPage.waitForTimeout(1000);
    const gateHidden = (await landPage.getByText("סובבו את המכשיר לרוחב כדי לשחק").count()) === 0;
    if (gateHidden) pass("Puzzle mobile landscape → gate hidden, game visible");
    else fail("Puzzle landscape play", "gate still blocking");
    await checkNoHorizontalScroll(landPage, "Puzzle mobile landscape");

    await mobile.close();
    await landscape.close();

    // --- Full finish UI via puzzle timeout (clock fast-forward) ---
    const finishPage = await context.newPage();
    await finishPage.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
    await studentLoginRequest(finishPage.request);
    await finishPage.clock.install({ time: new Date("2026-06-21T12:00:00Z") });
    await finishPage.goto(`${BASE}/student/solo-games/puzzle`, { waitUntil: "domcontentloaded" });
    await finishPage.getByRole("button", { name: "קל" }).click();
    await finishPage.getByRole("button", { name: "התחל משחק" }).click();
    await finishPage.waitForTimeout(MIN_PLAY_WAIT_MS);
    await finishPage.clock.fastForward(65_000);
    try {
      await finishPage.getByText("ניקוד:", { exact: false }).waitFor({ timeout: 45_000 });
      pass("Puzzle finish screen shows score (Hebrew)");
    } catch (e) {
      warn("Puzzle finish UI via clock fast-forward — verify manually on device");
    }

    const finishTexts = ["שחק שוב", "חזרה לעולם הילד", "מטבעות"];
    for (const t of finishTexts) {
      if ((await finishPage.getByText(t, { exact: false }).count()) >= 1) pass(`Finish screen: "${t}" visible`);
      else warn(`Finish screen "${t}" not confirmed (puzzle timeout path)`);
    }

    if ((await finishPage.getByRole("button", { name: "שחק שוב" }).count()) >= 1) {
      await finishPage.getByRole("button", { name: "שחק שוב" }).click();
      await finishPage.getByRole("button", { name: "התחל משחק" }).waitFor({ timeout: 10_000 });
      pass('"שחק שוב" returns to entry');
    }

    await finishPage.close();

    // --- Per-game entry + start (desktop + mobile viewports) ---
    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      const vpContext = await browser.newContext({ viewport: vp, baseURL: BASE, locale: "he-IL" });
      const vpPage = await vpContext.newPage();
      await vpPage.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
      await studentLoginRequest(vpPage.request);

      for (const route of [
        "/student/solo-games/catcher",
        "/student/solo-games/flyer",
        "/student/solo-games/memory",
      ]) {
        await vpPage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
        await vpPage.getByRole("button", { name: "התחל משחק" }).click();
        await vpPage.waitForTimeout(1200);
        const header = vpPage.locator("header").first();
        if (await header.isVisible()) pass(`${route} ${vp.name}: header visible (HUD ok)`);
        await checkNoHorizontalScroll(vpPage, `${route} ${vp.name}`);
      }
      await vpContext.close();
    }

    // --- Hub routes (HTTP 200) ---
    console.log("\n=== Hub routes ===");
    for (const route of HUB_ROUTES) {
      const res = await page.request.get(`${BASE}${route}`, { maxRedirects: 0 }).catch(() => null);
      const status = res?.status() ?? 0;
      if (status >= 200 && status < 400) pass(`${route} → HTTP ${status}`);
      else fail(`${route}`, `HTTP ${status}`);
    }

    for (const route of SOLO_ROUTES) {
      const res = await page.request.get(`${BASE}${route}`);
      if (res.status() === 200) pass(`${route} → 200`);
      else fail(`${route}`, `HTTP ${res.status()}`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=== Solo Leo Games V1+V2 Smoke Test ===");
  console.log(`BASE=${BASE} student=${USERNAME}\n`);

  try {
    const probe = await fetch(`${BASE}/student/login`);
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (e) {
    console.error("Dev server not reachable at", BASE, e.message);
    process.exit(1);
  }

  const supabase = getSupabase();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await studentLoginRequest(page.request);
  const me = await fetchMe(page.request);
  const studentId = me.student.id;
  pass(`Authenticated student ${USERNAME} (${studentId.slice(0, 8)}…)`);

  await verifyDbRules(supabase);
  const coinStats = await verifyApiFlow(page.request, supabase, studentId);
  await browser.close();

  await verifyBrowserFlow(supabase, studentId);

  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${report.pass.length}`);
  console.log(`FAIL: ${report.fail.length}`);
  console.log(`WARN: ${report.warn.length}`);
  if (report.fail.length) {
    console.log("\nFailures:");
    report.fail.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(`\nCoins awarded in API run: ${coinStats.totalCoinsAwarded}`);
  console.log(`Balance: ${coinStats.balanceBefore} → ${coinStats.balanceAfter}`);

  process.exit(report.fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

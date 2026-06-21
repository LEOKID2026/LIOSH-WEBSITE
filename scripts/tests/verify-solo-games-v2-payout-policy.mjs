#!/usr/bin/env node
/**
 * Verify achievement-only solo game payout policy (post SQL 070).
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local scripts/tests/verify-solo-games-v2-payout-policy.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { SOLO_GAME_KEYS } from "../../lib/solo-games/solo-game-registry.js";
import { calculateSoloGameCoins } from "../../lib/solo-games/server/solo-game-payout.server.js";

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3001";
const USERNAME = process.env.E2E_STUDENT_USERNAME || "leo-s02";
const PIN = process.env.E2E_STUDENT_PIN || "1234";
const MIN_PLAY_WAIT_MS = 5500;

const ALL_GAME_KEYS = [...SOLO_GAME_KEYS];

/** @type {{ pass: string[], fail: string[] }} */
const report = { pass: [], fail: [] };

function pass(label) {
  report.pass.push(label);
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  const msg = err instanceof Error ? err.message : String(err);
  report.fail.push(`${label}: ${msg}`);
  console.error(`  ✗ ${label}: ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authHeaders() {
  return { Origin: BASE, Referer: `${BASE}/student/login` };
}

async function loginRequest(request) {
  const res = await request.post(`${BASE}/api/student/login`, {
    data: { username: USERNAME, pin: PIN },
    headers: authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || body?.ok !== true) {
    throw new Error(`Login failed: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
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
  return { ok: res.ok() && json?.ok === true, json };
}

async function finishSession(request, sessionId, metrics) {
  const res = await request.post(`${BASE}/api/student/solo-games/finish`, {
    data: { sessionId, metrics },
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok() && json?.ok === true, json };
}

async function verifyRegistryAndHub() {
  console.log("\n=== 1. Ten games in registry + hub ===");
  assert.equal(ALL_GAME_KEYS.length, 10, "registry should have 10 keys");
  pass(`Registry has ${ALL_GAME_KEYS.length} game keys`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await loginRequest(page.request);
  await page.goto(`${BASE}/student/solo-games`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const headings = await page.locator("h2").allTextContents();
  if (headings.length >= 10) {
    pass(`Hub shows ${headings.length} game cards (>= 10)`);
  } else {
    fail("Hub game count", `found ${headings.length} h2 headings, expected >= 10`);
  }

  for (const route of ALL_GAME_KEYS.map((k) => `/student/solo-games/${k}`)) {
    const res = await page.request.get(`${BASE}${route}`);
    if (res.status() === 200) pass(`${route} → 200`);
    else fail(route, `HTTP ${res.status()}`);
  }

  await browser.close();
}

async function verifyDbRules(supabase) {
  console.log("\n=== 7. DB rules table (10 rows, no participation) ===");
  const { data, error } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key, payout_rules_json, is_active")
    .order("game_key");
  if (error) throw error;

  assert.equal(data?.length, 10, `expected 10 rows, got ${data?.length}`);
  pass("reward_economy_solo_game_rules has 10 rows");

  for (const row of data || []) {
    const rules = row.payout_rules_json || {};
    const base = Number(rules.baseCoins ?? 0);
    const loss = Number(rules.lossCoins ?? 0);
    if (base > 0) fail(`${row.game_key} baseCoins`, `baseCoins=${base} (must be 0)`);
    if (loss > 0) fail(`${row.game_key} lossCoins`, `lossCoins=${loss} (must be 0)`);
  }
  if (!report.fail.some((f) => f.includes("baseCoins") || f.includes("lossCoins"))) {
    pass("All rows: baseCoins=0 and lossCoins=0 (or absent)");
  }

  for (const key of ALL_GAME_KEYS) {
    assert.ok(data?.some((r) => r.game_key === key), `missing DB rule for ${key}`);
  }
  pass("All 10 game_key values present in DB");
}

async function verifyPayoutLogicUnit() {
  console.log("\n=== 2–5. Payout formula unit checks ===");

  const zeroArcade = calculateSoloGameCoins("catcher", null, { score: 0, levelReached: 0, didWin: false }, {
    baseCoins: 0,
    perScoreUnit: 5,
    scoreUnitDivisor: 10,
    perLevelBonus: 20,
    maxCoins: 500,
  });
  assert.equal(zeroArcade.coins, 0);
  pass("catcher score=0 → 0 coins (unit)");

  const lossPuzzle = calculateSoloGameCoins("puzzle", "easy", { score: 100, didWin: false, difficulty: "easy" }, {
    lossCoins: 0,
    winBonus: { easy: 100, medium: 200, hard: 350 },
    scoreBonusDivisor: 50,
    maxCoins: 400,
  });
  assert.equal(lossPuzzle.coins, 0);
  pass("puzzle loss → 0 coins (unit)");

  const lossMaze = calculateSoloGameCoins("maze", "easy", { score: 200, didWin: false, difficulty: "easy", mistakes: 5 }, {
    lossCoins: 0,
    winBonus: { easy: 90, medium: 160, hard: 260 },
    scoreBonusDivisor: 40,
    maxCoins: 400,
  });
  assert.equal(lossMaze.coins, 0);
  pass("maze loss → 0 coins (unit)");

  const lossPic = calculateSoloGameCoins("picture-puzzle", "easy", { score: 300, didWin: false, difficulty: "easy", mistakes: 10 }, {
    lossCoins: 0,
    winBonus: { easy: 100, medium: 180, hard: 300 },
    scoreBonusDivisor: 50,
    maxCoins: 400,
  });
  assert.equal(lossPic.coins, 0);
  pass("picture-puzzle loss → 0 coins (unit)");

  const lossMemory = calculateSoloGameCoins("memory", "easy", { score: 500, didWin: false, difficulty: "easy", mistakes: 5, timeRemainingSec: 50 }, {
    winBonus: { easy: 80, medium: 150, hard: 250 },
    mistakePenalty: 5,
    timeBonusPerSec: 1,
    maxCoins: 400,
  });
  assert.equal(lossMemory.coins, 0);
  pass("memory loss → 0 coins (unit)");

  const lossSort = calculateSoloGameCoins("sort-shapes", "easy", { score: 400, didWin: false, difficulty: "easy", mistakes: 2, timeRemainingSec: 30 }, {
    winBonus: { easy: 80, medium: 140, hard: 220 },
    mistakePenalty: 5,
    timeBonusPerSec: 1,
    maxCoins: 400,
  });
  assert.equal(lossSort.coins, 0);
  pass("sort-shapes loss → 0 coins (unit)");

  const realCatcher = calculateSoloGameCoins("catcher", null, { score: 85, levelReached: 8, didWin: false }, {
    baseCoins: 0,
    perScoreUnit: 5,
    scoreUnitDivisor: 10,
    perLevelBonus: 20,
    maxCoins: 500,
  });
  assert.equal(realCatcher.coins, 40 + 160);
  pass(`catcher score=85 level=8 → ${realCatcher.coins} coins (unit, expected 200)`);
}

async function verifyApiPayouts(request, supabase, studentId) {
  console.log("\n=== 2–6. Live API + balance delta ===");
  const balanceStart = await getBalance(supabase, studentId);
  pass(`Starting balance: ${balanceStart}`);

  let expectedDelta = 0;

  // score=0 arcade
  {
    const start = await startSession(request, "balloons");
    assert.ok(start.ok, start.json?.error);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 0,
      didWin: false,
      levelReached: 0,
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok, finish.json?.error);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    expectedDelta += 0;
    pass("API balloons score=0 → coinsAwarded=0");
  }

  // puzzle loss
  {
    const start = await startSession(request, "puzzle", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 120,
      didWin: false,
      difficulty: "easy",
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    pass("API puzzle loss → coinsAwarded=0");
  }

  // maze loss
  {
    const start = await startSession(request, "maze", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 200,
      didWin: false,
      difficulty: "easy",
      mistakes: 10,
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    pass("API maze loss → coinsAwarded=0");
  }

  // picture-puzzle loss
  {
    const start = await startSession(request, "picture-puzzle", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 300,
      didWin: false,
      difficulty: "easy",
      mistakes: 15,
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    pass("API picture-puzzle loss → coinsAwarded=0");
  }

  // memory loss
  {
    const start = await startSession(request, "memory", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 500,
      didWin: false,
      difficulty: "easy",
      mistakes: 5,
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    pass("API memory loss → coinsAwarded=0");
  }

  // sort-shapes loss
  {
    const start = await startSession(request, "sort-shapes", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 400,
      didWin: false,
      difficulty: "easy",
      mistakes: 3,
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    assert.equal(Number(finish.json.coinsAwarded), 0);
    pass("API sort-shapes loss → coinsAwarded=0");
  }

  // real score win — catcher
  {
    const start = await startSession(request, "catcher");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 85,
      levelReached: 8,
      didWin: false,
    });
    assert.ok(finish.ok);
    const coins = Number(finish.json.coinsAwarded);
    assert.equal(coins, 200);
    expectedDelta += coins;
    pass(`API catcher score=85 → coinsAwarded=${coins} (expected 200)`);
  }

  // puzzle win with score
  {
    const start = await startSession(request, "puzzle", "easy");
    assert.ok(start.ok);
    await sleep(MIN_PLAY_WAIT_MS);
    const finish = await finishSession(request, start.json.sessionId, {
      score: 550,
      didWin: true,
      difficulty: "easy",
      timeRemainingSec: 0,
    });
    assert.ok(finish.ok);
    const coins = Number(finish.json.coinsAwarded);
    assert.equal(coins, 111); // 100 + floor(550/50)
    expectedDelta += coins;
    pass(`API puzzle win score=550 → coinsAwarded=${coins} (expected 111)`);
  }

  const balanceEnd = await getBalance(supabase, studentId);
  const delta = balanceEnd - balanceStart;
  if (delta === expectedDelta) {
    pass(`Balance delta +${delta} matches earned coins only (+${expectedDelta})`);
  } else {
    fail("Balance delta", `expected +${expectedDelta}, got +${delta} (${balanceStart} → ${balanceEnd})`);
  }
}

async function main() {
  console.log("=== Solo Games V2 Payout Policy Verification ===");
  console.log(`BASE=${BASE} student=${USERNAME}\n`);

  try {
    const probe = await fetch(`${BASE}/student/login`);
    if (!probe.ok) throw new Error(`server HTTP ${probe.status}`);
  } catch (e) {
    console.error("Server not reachable:", e.message);
    process.exit(1);
  }

  await verifyRegistryAndHub();
  await verifyPayoutLogicUnit();

  const supabase = getSupabase();
  await verifyDbRules(supabase);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await loginRequest(page.request);
  const me = await page.request.get(`${BASE}/api/student/me`);
  const meJson = await me.json();
  const studentId = meJson.student.id;

  await verifyApiPayouts(page.request, supabase, studentId);
  await browser.close();

  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${report.pass.length}`);
  console.log(`FAIL: ${report.fail.length}`);
  if (report.fail.length) {
    report.fail.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("\nAll payout policy checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

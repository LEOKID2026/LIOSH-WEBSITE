/**
 * Phase 1 Coin Award Verification Script
 *
 * Runs all required checks:
 *  1. Happy path: durationSeconds > 0, various accuracy tiers
 *  2. coin_transactions row fields (reason, source_type, idempotency_key, amount)
 *  3. student_coin_balances.balance + lifetime_earned increase
 *  4. Idempotency: double-call → only one transaction, balance unchanged
 *  5. Zero-duration: no transaction, no balance change
 *  6. Daily cap: partial award up to 300, over-cap skipped
 *  7. HTTP /api/learning/session/finish response shape = { ok: true }
 *  8. calculateSessionCoins pure-function correctness
 *
 * Usage: npx tsx scripts/verify-phase1-coin-awards.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load .env.local ────────────────────────────────────────────────────────
function loadEnvLocal() {
  const p = resolve(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

// ── Imports (must be after env load) ──────────────────────────────────────
const { createClient } = await import(
  pathToFileURL(resolve(ROOT, "node_modules/@supabase/supabase-js/dist/module/index.js")).href
).catch(() => import("@supabase/supabase-js"));

const { calculateSessionCoins, awardLearningSessionCoins } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/learning-coin-award.server.js")).href
);

// ── Supabase service-role client ───────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const SUPA_SERVICE_KEY = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_SERVICE_KEY) {
  console.error("FAIL: Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function pass(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗  ${label}`);
  if (detail) console.error(`       → ${detail}`);
  failed++;
  failures.push({ label, detail });
}

function assertEq(label, actual, expected) {
  if (actual === expected) return pass(label);
  fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function getBalance(studentId) {
  const { data } = await supabase
    .from("student_coin_balances")
    .select("balance, lifetime_earned")
    .eq("student_id", studentId)
    .maybeSingle();
  return data ?? { balance: 0, lifetime_earned: 0 };
}

async function getTransaction(idempotencyKey) {
  const { data } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ?? null;
}

async function countTransactions(idempotencyKey) {
  const { count } = await supabase
    .from("coin_transactions")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", idempotencyKey);
  return count ?? 0;
}

/** Find (or create) a test student — picks the first student_coin_balances row if any */
async function resolveTestStudent() {
  // Try students table first
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (students?.id) return students.id;

  // Fallback: look in student_coin_balances
  const { data: bal } = await supabase
    .from("student_coin_balances")
    .select("student_id")
    .limit(1)
    .maybeSingle();
  if (bal?.student_id) return bal.student_id;

  return null;
}

/** Create a fresh learning_sessions row owned by studentId */
async function createTestSession(studentId, subject = "math") {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("learning_sessions").insert({
    id,
    student_id: studentId,
    subject,
    status: "active",
    started_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to create test session: ${error.message}`);
  return id;
}

/** Update a learning_sessions row (simulate session/finish) */
async function finishTestSession(sessionId, durationSeconds) {
  await supabase
    .from("learning_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      status: "completed",
    })
    .eq("id", sessionId);
}

/** Clean up test coin transactions by idempotency_key prefix */
async function cleanupTransactions(keys) {
  for (const k of keys) {
    await supabase.from("coin_transactions").delete().eq("idempotency_key", k);
  }
}

/** Adjust student balance for daily-cap test (direct DB manipulation) */
async function insertFakeSessionEarnings(studentId, amount) {
  // Insert a coin_transactions row with source_type=learning_session and today's date
  // so getTodaySessionEarnings() sees todayEarned near the cap.
  const fakeKey = `__verify_fake_${crypto.randomUUID()}`;
  const { data, error } = await supabase.rpc("arcade_coin_apply", {
    p_student_id: studentId,
    p_direction: "earn",
    p_amount: amount,
    p_idempotency_key: fakeKey,
    p_source_type: "learning_session",
    p_source_id: null,
    p_metadata: { _test: true },
    p_reason: "learning_session",
  });
  if (error) throw new Error(`insertFakeSessionEarnings failed: ${error.message}`);
  return fakeKey;
}

// ══════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════════════");
console.log("  Phase 1 Coin Award Verification — " + new Date().toISOString());
console.log("══════════════════════════════════════════════════════\n");

// ── Section 0: Feature flag ──────────────────────────────────────────────
console.log("── Section 0: Feature flag ──");
assertEq("ENABLE_SESSION_COIN_AWARDS is 'true'", process.env.ENABLE_SESSION_COIN_AWARDS, "true");
console.log();

// ── Section 1: calculateSessionCoins pure function ───────────────────────
console.log("── Section 1: calculateSessionCoins (pure function) ──");
assertEq("duration=0 → 0 coins",          calculateSessionCoins(100, 0),   0);
assertEq("duration=-1 → 0 coins",         calculateSessionCoins(100, -1),  0);
assertEq("duration=null → 0 coins",       calculateSessionCoins(100, null), 0);
assertEq("accuracy=50 → 10 coins (base)", calculateSessionCoins(50, 60),   10);
assertEq("accuracy=80 → 15 coins",        calculateSessionCoins(80, 60),   15);
assertEq("accuracy=94 → 15 coins",        calculateSessionCoins(94, 60),   15);
assertEq("accuracy=95 → 20 coins",        calculateSessionCoins(95, 60),   20);
assertEq("accuracy=100 → 20 coins",       calculateSessionCoins(100, 60),  20);
assertEq("accuracy=null → 10 coins",      calculateSessionCoins(null, 60), 10);
console.log();

// ── Resolve test student ─────────────────────────────────────────────────
const studentId = await resolveTestStudent();
if (!studentId) {
  console.error("FAIL: No student found in DB. Cannot run live tests.");
  process.exit(1);
}
console.log(`Using student: ${studentId}\n`);

// ── Section 2: Happy path — accuracy tiers ───────────────────────────────
console.log("── Section 2: Happy path award (accuracy=82, duration=120) ──");

const sessionId_happy = await createTestSession(studentId, "math");
const ikey_happy = `coin_session_${sessionId_happy}`;

const balBefore = await getBalance(studentId);
console.log(`  balance before: ${balBefore.balance}  lifetime_earned: ${balBefore.lifetime_earned}`);

await finishTestSession(sessionId_happy, 120);
const result_happy = await awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId: sessionId_happy,
  durationSeconds: 120,
  accuracy: 82,
  subject: "math",
});

if (!result_happy.ok) {
  fail("awardLearningSessionCoins returned ok=true", `got: ${JSON.stringify(result_happy)}`);
} else {
  pass("awardLearningSessionCoins returned ok=true");
}
assertEq("coinsAwarded = 15 (accuracy 82 ≥ 80)", result_happy.coinsAwarded, 15);

const balAfter = await getBalance(studentId);
console.log(`  balance after:  ${balAfter.balance}  lifetime_earned: ${balAfter.lifetime_earned}`);

if (balAfter.balance >= balBefore.balance + 15) {
  pass("student_coin_balances.balance increased by 15");
} else {
  fail("student_coin_balances.balance increase", `before=${balBefore.balance}, after=${balAfter.balance}`);
}
if (balAfter.lifetime_earned >= balBefore.lifetime_earned + 15) {
  pass("student_coin_balances.lifetime_earned increased by 15");
} else {
  fail("student_coin_balances.lifetime_earned increase", `before=${balBefore.lifetime_earned}, after=${balAfter.lifetime_earned}`);
}

// ── Section 3: Transaction row inspection ───────────────────────────────
console.log("\n── Section 3: coin_transactions row ──");

const tx = await getTransaction(ikey_happy);
if (!tx) {
  fail("coin_transactions row exists", "row not found");
} else {
  pass("coin_transactions row exists");
  assertEq("reason = 'learning_session'",      tx.reason,         "learning_session");
  assertEq("source_type = 'learning_session'", tx.source_type,    "learning_session");
  assertEq("idempotency_key = coin_session_*", tx.idempotency_key, ikey_happy);
  assertEq("direction = 'earn'",               tx.direction,      "earn");
  assertEq("amount = 15",                      tx.amount,         15);
  assertEq("source_id = learningSessionId",    tx.source_id,      sessionId_happy);
  if (tx.balance_after != null) {
    pass(`balance_after column present (${tx.balance_after})`);
  } else {
    fail("balance_after column present", "null");
  }

  console.log("\n  ── Sample transaction row ──");
  console.log("  " + JSON.stringify(tx, null, 2).replace(/\n/g, "\n  "));
}
console.log();

// ── Section 4: Idempotency ───────────────────────────────────────────────
console.log("── Section 4: Idempotency (same learningSessionId called twice) ──");

const balBeforeIdem = await getBalance(studentId);
const result_idem = await awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId: sessionId_happy,   // same session
  durationSeconds: 120,
  accuracy: 82,
  subject: "math",
});

const countAfterIdem = await countTransactions(ikey_happy);
const balAfterIdem = await getBalance(studentId);

assertEq("second call returns ok=true", result_idem.ok, true);
assertEq("duplicate flag = true on second call", result_idem.duplicate, true);
assertEq("only 1 transaction row in DB (idempotent)", countAfterIdem, 1);
if (balAfterIdem.balance === balBeforeIdem.balance) {
  pass("balance unchanged after duplicate call");
} else {
  fail("balance unchanged after duplicate call",
    `before=${balBeforeIdem.balance}, after=${balAfterIdem.balance}`);
}
console.log();

// ── Section 5: Zero-duration session ────────────────────────────────────
console.log("── Section 5: Zero-duration session (no award) ──");

const sessionId_zero = await createTestSession(studentId, "science");
const ikey_zero = `coin_session_${sessionId_zero}`;

await finishTestSession(sessionId_zero, 0);
const balBeforeZero = await getBalance(studentId);
const result_zero = await awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId: sessionId_zero,
  durationSeconds: 0,
  accuracy: 100,
  subject: "science",
});
const txZero = await getTransaction(ikey_zero);
const balAfterZero = await getBalance(studentId);

assertEq("zero-duration returns ok=true", result_zero.ok, true);
assertEq("zero-duration skipped=true", result_zero.skipped, true);
assertEq("zero-duration reason='zero_coins_calculated'", result_zero.reason, "zero_coins_calculated");
if (!txZero) {
  pass("no coin_transactions row for zero-duration session");
} else {
  fail("no coin_transactions row for zero-duration session", "row found unexpectedly");
}
if (balAfterZero.balance === balBeforeZero.balance) {
  pass("balance unchanged for zero-duration session");
} else {
  fail("balance unchanged for zero-duration session",
    `before=${balBeforeZero.balance}, after=${balAfterZero.balance}`);
}
console.log();

// ── Section 6: Daily cap ─────────────────────────────────────────────────
console.log("── Section 6: Daily cap (300 coins/UTC-day) ──");

// Sub-test 6a: partial award near cap
// We need todayEarned to land at exactly 290 before the partial-award call.
// The happy path above already earned some coins today, so we insert only the delta.
const todayUtcStart = new Date();
todayUtcStart.setUTCHours(0, 0, 0, 0);
const { data: existingTxRows } = await supabase
  .from("coin_transactions")
  .select("amount")
  .eq("student_id", studentId)
  .eq("direction", "earn")
  .eq("source_type", "learning_session")
  .gte("created_at", todayUtcStart.toISOString());
const alreadyEarnedToday = (existingTxRows || []).reduce((s, r) => s + Number(r.amount), 0);
const toInsert290 = Math.max(0, 290 - alreadyEarnedToday);
console.log(`  todayEarned before cap-test: ${alreadyEarnedToday}  inserting fake: ${toInsert290}`);
const fakeKey_290 = toInsert290 > 0 ? await insertFakeSessionEarnings(studentId, toInsert290) : null;
const sessionId_partial = await createTestSession(studentId, "hebrew");
await finishTestSession(sessionId_partial, 60);

const balBeforeCap = await getBalance(studentId);
const result_partial = await awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId: sessionId_partial,
  durationSeconds: 60,
  accuracy: 100,   // 20 raw coins
  subject: "hebrew",
});
const balAfterCap = await getBalance(studentId);

assertEq("partial cap: ok=true", result_partial.ok, true);
assertEq("partial cap: coinsAwarded = 10 (300 - 290 = 10 remaining)", result_partial.coinsAwarded, 10);
if (balAfterCap.balance === balBeforeCap.balance + 10) {
  pass("partial cap: balance increased by exactly 10");
} else {
  fail("partial cap: balance increase", `expected +10, got before=${balBeforeCap.balance}, after=${balAfterCap.balance}`);
}

// Sub-test 6b: over-cap session is fully skipped
const sessionId_overcap = await createTestSession(studentId, "geometry");
await finishTestSession(sessionId_overcap, 60);
const balBeforeOvercap = await getBalance(studentId);
const result_overcap = await awardLearningSessionCoins(supabase, {
  studentId,
  learningSessionId: sessionId_overcap,
  durationSeconds: 60,
  accuracy: 100,
  subject: "geometry",
});
const balAfterOvercap = await getBalance(studentId);

assertEq("over-cap: ok=true (graceful skip)", result_overcap.ok, true);
assertEq("over-cap: skipped=true", result_overcap.skipped, true);
assertEq("over-cap: reason='daily_cap_reached'", result_overcap.reason, "daily_cap_reached");
const txOvercap = await getTransaction(`coin_session_${sessionId_overcap}`);
if (!txOvercap) {
  pass("over-cap: no transaction created");
} else {
  fail("over-cap: no transaction created", "row found unexpectedly");
}
if (balAfterOvercap.balance === balBeforeOvercap.balance) {
  pass("over-cap: balance unchanged");
} else {
  fail("over-cap: balance unchanged",
    `before=${balBeforeOvercap.balance}, after=${balAfterOvercap.balance}`);
}
console.log();

// ── Section 7: HTTP /api/learning/session/finish response shape ───────────────────────────────────
console.log("── Section 7: HTTP /api/learning/session/finish response shape ──");

// Load E2E student credentials from .env.e2e.local
const e2eEnvPath = resolve(ROOT, ".env.e2e.local");
if (existsSync(e2eEnvPath)) {
  for (const line of readFileSync(e2eEnvPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const E2E_USERNAME = process.env.E2E_STUDENT_USERNAME;
const E2E_PIN      = process.env.E2E_STUDENT_PIN;
const BASE_URL     = "http://127.0.0.1:3001";

if (!E2E_USERNAME || !E2E_PIN) {
  console.log("  SKIP HTTP shape test: E2E_STUDENT_USERNAME or E2E_STUDENT_PIN not set in .env.e2e.local");
} else {
  let authCookie = null;
  let httpStudentId = null;

  try {
    const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: E2E_USERNAME, pin: E2E_PIN }),
    });
    const setCookieHeader = loginRes.headers.get("set-cookie");
    const match = setCookieHeader?.match(/liosh_student_session=([^;]+)/);
    authCookie = match ? `liosh_student_session=${match[1]}` : null;

    if (!loginRes.ok || !authCookie) {
      console.log(`  SKIP HTTP test: login failed (status=${loginRes.status}, cookie=${authCookie ? "ok" : "missing"})`);
    } else {
      // Find student_id for this E2E username
      const { data: accessCodeRow } = await supabase
        .from("student_access_codes")
        .select("student_id")
        .eq("login_username", E2E_USERNAME.toLowerCase())
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      httpStudentId = accessCodeRow?.student_id || null;
    }
  } catch (e) {
    console.log(`  SKIP HTTP test: auth failed — ${e.message}`);
  }

  if (authCookie && httpStudentId) {
    const sessionId_http = await createTestSession(httpStudentId, "math");

    const finishRes = await fetch(`${BASE_URL}/api/learning/session/finish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cookie": authCookie,
      },
      body: JSON.stringify({
        learningSessionId: sessionId_http,
        durationSeconds: 90,
        totalQuestions: 10,
        correctAnswers: 9,
        wrongAnswers: 1,
        accuracy: 90,
        score: 450,
      }),
    });

    const body = await finishRes.json();
    assertEq("HTTP status 200",     finishRes.status, 200);
    assertEq("response.ok = true",  body.ok,          true);
    assertEq("response shape = { ok: true } only",
      Object.keys(body).join(","), "ok");
    console.log(`  Response body: ${JSON.stringify(body)}`);

    // Verify coin was awarded via HTTP path
    const txHttp = await getTransaction(`coin_session_${sessionId_http}`);
    if (txHttp) {
      pass("HTTP path: coin_transactions row created");
      assertEq("HTTP path: amount = 15 (accuracy 90 ≥ 80)", txHttp.amount, 15);
    } else {
      fail("HTTP path: coin_transactions row created", "not found — check ENABLE_SESSION_COIN_AWARDS on dev server");
    }
  } else if (authCookie && !httpStudentId) {
    console.log("  SKIP HTTP coin check: student_id not found for E2E username (access_code row missing?)");
  }
}
console.log();

// ── Section 8: File change safety ───────────────────────────────────────
console.log("── Section 8: Changed files (Phase 1 only) ──");
const { execSync } = await import("node:child_process");
let changedFiles = "";
try {
  changedFiles = execSync("git diff --name-only HEAD", { cwd: ROOT }).toString().trim();
} catch {
  changedFiles = "(git diff failed)";
}
const lines = changedFiles ? changedFiles.split("\n") : [];
const allowedPatterns = [
  /^lib\/learning-supabase\/learning-coin-award\.server\.js$/,
  /^pages\/api\/learning\/session\/finish\.js$/,
  /^\.env\.local$/,
  /^docs\//,
  /^scripts\/verify-phase1/,
  /^\.cursor\//,
];

const forbidden = lines.filter(f => f && !allowedPatterns.some(p => p.test(f)));
if (forbidden.length === 0) {
  pass("No forbidden files changed");
} else {
  fail("No forbidden files changed", `Unexpected changes: ${forbidden.join(", ")}`);
}
console.log("  Changed files:");
lines.forEach(l => console.log("    " + l));
console.log();

// ── Cleanup fake earnings ────────────────────────────────────────────────
if (fakeKey_290) await cleanupTransactions([fakeKey_290]);
// Note: We do NOT remove real test session transactions; they are legitimate test data.

// ── Summary ──────────────────────────────────────────────────────────────
console.log("══════════════════════════════════════════════════════");
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
if (failures.length > 0) {
  console.log("\n  Failures:");
  failures.forEach(f => console.log(`    ✗ ${f.label}${f.detail ? " → " + f.detail : ""}`));
}
console.log("══════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);

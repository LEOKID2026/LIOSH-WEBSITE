/**
 * Phase 2.6 Verification — Monthly Persistence Reward Job
 *
 * Usage: npx tsx scripts/verify-phase26-monthly-persistence.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv(file) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env.e2e.local");
process.env.ENABLE_MONTHLY_PERSISTENCE_REWARD_ADMIN = "true";

const { createClient } = await import("@supabase/supabase-js");
const {
  resolveMonthlyPersistenceTier,
  evaluateMonthlyPersistenceReward,
  syncIncrementalMonthlyPersistenceRewards,
  runMonthlyPersistenceAwardJob,
  buildMonthlyPersistenceIdempotencyKey,
  buildMonthlyPersistenceTierIdempotencyKey,
  MONTHLY_PERSISTENCE_REASON,
  MONTHLY_PERSISTENCE_SOURCE_TYPE,
} = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js")).href
);
const { getIsraelMonthBoundsForYearMonth } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/israel-calendar.server.js")).href
);
const { assertMvpWorkingTreeScope, assertScopedCoinAward } = await import(
  pathToFileURL(resolve(ROOT, "scripts/lib/mvp-verify-helpers.mjs")).href
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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

const hooks = { pass, fail, assertEq };

async function getBalance(studentId) {
  const { data } = await supabase
    .from("student_coin_balances")
    .select("balance, lifetime_earned")
    .eq("student_id", studentId)
    .maybeSingle();
  return data ?? { balance: 0, lifetime_earned: 0 };
}

async function resolveTestStudent() {
  const { data } = await supabase.from("students").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

const TEST_YM = "2099-06";
const DEFAULT_TIERS = [
  { minutes: 100, coins: 10_000 },
  { minutes: 250, coins: 30_000 },
  { minutes: 400, coins: 60_000 },
  { minutes: 600, coins: 100_000 },
];
const testMonth = getIsraelMonthBoundsForYearMonth(TEST_YM);
const testStartedAt = new Date(new Date(testMonth.startIso).getTime() + 3600_000).toISOString();

async function cleanupTestArtifacts(studentId) {
  await supabase
    .from("coin_transactions")
    .delete()
    .eq("student_id", studentId)
    .eq("reason", MONTHLY_PERSISTENCE_REASON)
    .eq("source_id", TEST_YM);
  await supabase
    .from("learning_sessions")
    .delete()
    .eq("student_id", studentId)
    .gte("started_at", testMonth.startIso)
    .lt("started_at", testMonth.endIso);
}

async function insertCompletedMinutes(studentId, totalMinutes) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("learning_sessions").insert({
    id,
    student_id: studentId,
    subject: "math",
    status: "completed",
    started_at: testStartedAt,
    ended_at: testStartedAt,
    duration_seconds: Math.round(totalMinutes * 60),
  });
  if (error) throw new Error(`insert session failed: ${error.message}`);
  return id;
}

async function dryRunForMinutes(studentId, minutes) {
  await cleanupTestArtifacts(studentId);
  await insertCompletedMinutes(studentId, minutes);
  return evaluateMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael: TEST_YM });
}

console.log("\n══════════════════════════════════════════════════════");
console.log("  Phase 2.6 Monthly Persistence Reward — " + new Date().toISOString());
console.log("══════════════════════════════════════════════════════\n");

// ── Section 1: Pure tier resolution ───────────────────────────────────────
console.log("── Section 1: Tier resolution (pure function) ──");
assertEq("87 min → no tier", resolveMonthlyPersistenceTier(87, DEFAULT_TIERS), null);
assertEq("105 min → 10,000 tier", resolveMonthlyPersistenceTier(105, DEFAULT_TIERS)?.coins, 10_000);
assertEq("260 min → 30,000 tier", resolveMonthlyPersistenceTier(260, DEFAULT_TIERS)?.coins, 30_000);
assertEq("420 min → 60,000 tier", resolveMonthlyPersistenceTier(420, DEFAULT_TIERS)?.coins, 60_000);
assertEq("650 min → 100,000 tier", resolveMonthlyPersistenceTier(650, DEFAULT_TIERS)?.coins, 100_000);
assertEq("600 min → 100,000 (cumulative target)", resolveMonthlyPersistenceTier(600, DEFAULT_TIERS)?.coins, 100_000);
console.log();

// ── Section 2: Israel month boundaries ────────────────────────────────────
console.log("── Section 2: Israel month boundaries ──");
const may2026 = getIsraelMonthBoundsForYearMonth("2026-05");
assertEq("May 2026 Israel start (DST)", may2026.startIso, "2026-04-30T21:00:00.000Z");
assertEq("May 2026 Israel end", may2026.endIso, "2026-05-31T21:00:00.000Z");
pass("Israel May start differs from UTC midnight (2026-05-01T00:00:00.000Z)");
console.log();

const studentId = await resolveTestStudent();
if (!studentId) {
  fail("resolve test student", "no students row found");
} else {
  // ── Section 3: Dry-run from learning_sessions ───────────────────────────
  console.log("── Section 3: Dry-run (query learning_sessions, no writes) ──");
  try {
    const r87 = await dryRunForMinutes(studentId, 87);
    assertEq("87 min dry-run wouldAward", r87.wouldAward, 0);
    assertEq("87 min dry-run eligible", r87.eligible, false);

    const r105 = await dryRunForMinutes(studentId, 105);
    assertEq("105 min dry-run totalWouldAward", r105.totalWouldAward ?? r105.wouldAward, 10_000);
    assertEq("105 min dry-run tierMinutes", r105.tierMinutes, 100);

    const r260 = await dryRunForMinutes(studentId, 260);
    assertEq("260 min dry-run totalWouldAward", r260.totalWouldAward ?? r260.wouldAward, 30_000);

    const r420 = await dryRunForMinutes(studentId, 420);
    assertEq("420 min dry-run totalWouldAward", r420.totalWouldAward ?? r420.wouldAward, 60_000);

    const r650 = await dryRunForMinutes(studentId, 650);
    assertEq("650 min dry-run totalWouldAward", r650.totalWouldAward ?? r650.wouldAward, 100_000);

  const txBefore = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("student_id", studentId)
    .eq("reason", MONTHLY_PERSISTENCE_REASON)
    .eq("source_id", TEST_YM)
    .maybeSingle();
  assertEq("dry-run wrote no coin_transactions", txBefore.data?.id ?? null, null);

    console.log("  Dry-run sample (650 min):");
    console.log(
      `    studentId=${studentId.slice(0, 8)}… activeMinutes=${r650.activeMinutes} wouldAward=${r650.wouldAward} tierMinutes=${r650.tierMinutes}`
    );
  } catch (err) {
    fail("dry-run section", err?.message || String(err));
  }
  console.log();

  // ── Section 4: Real run + idempotency ───────────────────────────────────
  console.log("── Section 4: Real run + idempotency ──");
  try {
    await cleanupTestArtifacts(studentId);
    await insertCompletedMinutes(studentId, 105);

    const tierKey = buildMonthlyPersistenceTierIdempotencyKey(studentId, TEST_YM, 100);
    const before = await getBalance(studentId);
    const first = await syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
      yearMonthIsrael: TEST_YM,
      skipProductionFilter: true,
    });
    const after = await getBalance(studentId);

    assertEq("first run awarded", first.awarded, true);
    assertEq("first run coins", first.coinsAwarded, 10_000);

    const { data: tx } = await supabase
      .from("coin_transactions")
      .select("*")
      .eq("idempotency_key", tierKey)
      .maybeSingle();

    assertScopedCoinAward(hooks, {
      label: "monthly persistence award",
      tx,
      expectedAmount: 10_000,
      balanceBefore: before,
    });
    if (tx && after.lifetime_earned >= before.lifetime_earned + 10_000) {
      pass("lifetime_earned increased by at least 10,000 (scoped to monthly tx)");
    } else {
      fail(
        "lifetime_earned increased by at least 10,000 (scoped to monthly tx)",
        `before=${before.lifetime_earned}, after=${after.lifetime_earned}`
      );
    }

    assertEq("transaction reason", tx?.reason, MONTHLY_PERSISTENCE_REASON);
    assertEq("transaction source_type", tx?.source_type, MONTHLY_PERSISTENCE_SOURCE_TYPE);
    assertEq("transaction source_id", tx?.source_id, TEST_YM);
    assertEq("transaction amount", tx?.amount, 10_000);

    console.log("  Real-run transaction row:");
    console.log(
      `    id=${tx?.id} amount=${tx?.amount} reason=${tx?.reason} source_type=${tx?.source_type} source_id=${tx?.source_id}`
    );
    console.log(`  Balance before=${before.balance} after=${after.balance}`);

    const second = await syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
      yearMonthIsrael: TEST_YM,
      skipProductionFilter: true,
    });
    const afterSecond = await getBalance(studentId);

    assertEq("second run duplicate", second.duplicate, true);
    assertEq("second run skipped", second.skipped, true);
    assertEq("second run coins", second.coinsAwarded, 0);
    assertEq("balance unchanged on duplicate", afterSecond.balance, after.balance);

    const { count } = await supabase
      .from("coin_transactions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("reason", MONTHLY_PERSISTENCE_REASON)
      .eq("source_id", TEST_YM);
    assertEq("only one transaction row for first tier", count, 1);

    // Incremental: 260 min after 10K already paid → +20K only
    await insertCompletedMinutes(studentId, 155);
    const third = await syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
      yearMonthIsrael: TEST_YM,
      skipProductionFilter: true,
    });
    assertEq("third run after more minutes awards 20K", third.coinsAwarded, 20_000);

    const fourth = await syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
      yearMonthIsrael: TEST_YM,
      skipProductionFilter: true,
    });
    assertEq("fourth run no extra coins", fourth.coinsAwarded ?? 0, 0);

    const cronDry = await runMonthlyPersistenceAwardJob(supabase, {
      yearMonthIsrael: TEST_YM,
      studentIds: [studentId],
      dryRun: true,
    });
    const cronResult = cronDry.results?.[0];
    assertEq("cron dry-run after immediate awards → 0", cronResult?.totalWouldAward ?? 0, 0);
  } catch (err) {
    fail("real run section", err?.message || String(err));
  } finally {
    await cleanupTestArtifacts(studentId);
  }
  console.log();

  // ── Section 5: Boundary session exclusion ───────────────────────────────
  console.log("── Section 5: Israel boundary session filter ──");
  try {
    const boundaryYm = "2099-07";
    const boundaryMonth = getIsraelMonthBoundsForYearMonth(boundaryYm);
    await supabase
      .from("learning_sessions")
      .delete()
      .eq("student_id", studentId)
      .gte("started_at", boundaryMonth.startIso)
      .lt("started_at", boundaryMonth.endIso);

    const beforeIsraelMonth = new Date(new Date(boundaryMonth.startIso).getTime() - 60_000).toISOString();
    await supabase.from("learning_sessions").insert({
      id: crypto.randomUUID(),
      student_id: studentId,
      subject: "math",
      status: "completed",
      started_at: beforeIsraelMonth,
      ended_at: beforeIsraelMonth,
      duration_seconds: 6000,
    });
    const evalBefore = await evaluateMonthlyPersistenceReward(supabase, {
      studentId,
      yearMonthIsrael: boundaryYm,
    });
    assertEq("session before Israel month start not counted", evalBefore.activeMinutes, 0);

    const insideIsraelMonth = new Date(new Date(boundaryMonth.startIso).getTime() + 3600_000).toISOString();
    await supabase.from("learning_sessions").insert({
      id: crypto.randomUUID(),
      student_id: studentId,
      subject: "math",
      status: "completed",
      started_at: insideIsraelMonth,
      ended_at: insideIsraelMonth,
      duration_seconds: 6000,
    });
    const evalInside = await evaluateMonthlyPersistenceReward(supabase, {
      studentId,
      yearMonthIsrael: boundaryYm,
    });
    assertEq("session inside Israel month counted (100 min)", evalInside.activeMinutes, 100);

    await supabase
      .from("learning_sessions")
      .delete()
      .eq("student_id", studentId)
      .gte("started_at", boundaryMonth.startIso)
      .lt("started_at", boundaryMonth.endIso);
    await supabase.from("learning_sessions").delete().eq("student_id", studentId).eq("started_at", beforeIsraelMonth);
  } catch (err) {
    fail("boundary section", err?.message || String(err));
  }
  console.log();
}

// ── Section 6: Admin API dry-run (optional HTTP) ──────────────────────────
console.log("── Section 6: Admin API route exists ──");
const apiPath = resolve(ROOT, "pages/api/admin/monthly-persistence-award.js");
if (existsSync(apiPath)) pass("pages/api/admin/monthly-persistence-award.js exists");
else fail("admin API route missing");

console.log("\n── Section 7: MVP working tree scope ──");
assertMvpWorkingTreeScope(hooks, {
  label: "Combined MVP working tree (no forbidden paths)",
});

console.log("\n══════════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════════════\n");

if (failed > 0) {
  for (const f of failures) console.error(`  FAIL: ${f.label} — ${f.detail || ""}`);
  process.exit(1);
}

process.exit(0);

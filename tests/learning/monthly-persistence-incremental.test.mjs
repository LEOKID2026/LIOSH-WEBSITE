/**
 * Unit tests — incremental monthly persistence tier deltas (pure, no DB).
 *
 * Usage: npx tsx --test tests/learning/monthly-persistence-incremental.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const {
  computeOutstandingTierDeltas,
  buildMonthlyPersistenceTierIdempotencyKey,
  buildMonthlyPersistenceTopupIdempotencyKey,
  buildMonthlyPersistenceTiersStatus,
  resolveMonthlyPersistenceTier,
} = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js")).href
);

const DEFAULT_TIERS = [
  { minutes: 100, coins: 10_000 },
  { minutes: 250, coins: 30_000 },
  { minutes: 400, coins: 60_000 },
  { minutes: 600, coins: 100_000 },
];

const STUDENT = "student-test-uuid";
const YM = "2099-06";

function deltas(ctx) {
  return computeOutstandingTierDeltas(ctx.minutes, DEFAULT_TIERS, ctx.alreadyPaid ?? 0, {
    studentId: STUDENT,
    yearMonthIsrael: YM,
    existingKeys: ctx.existingKeys ?? new Set(),
  });
}

test("0 minutes → no deltas", () => {
  assert.deepEqual(deltas({ minutes: 0 }), []);
});

test("100 minutes → single 10,000 delta with tier key", () => {
  const result = deltas({ minutes: 100 });
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 10_000);
  assert.equal(result[0].kind, "tier");
  assert.equal(
    result[0].idempotencyKey,
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 100)
  );
});

test("260 minutes from zero → 10K + 20K deltas (30K total)", () => {
  const result = deltas({ minutes: 260 });
  assert.equal(result.reduce((s, d) => s + d.amount, 0), 30_000);
  assert.equal(result.length, 2);
  assert.equal(result[0].amount, 10_000);
  assert.equal(result[1].amount, 20_000);
});

test("250 minutes with 10K already paid → only 20K delta", () => {
  const result = deltas({ minutes: 250, alreadyPaid: 10_000 });
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 20_000);
  assert.equal(result[0].tierMinutes, 250);
});

test("650 minutes → cumulative 100K total", () => {
  const result = deltas({ minutes: 650 });
  assert.equal(result.reduce((s, d) => s + d.amount, 0), 100_000);
  assert.equal(result.length, 4);
});

test("rerun with all keys present → no deltas", () => {
  const existingKeys = new Set([
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 100),
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 250),
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 400),
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 600),
  ]);
  const result = deltas({ minutes: 650, alreadyPaid: 100_000, existingKeys });
  assert.deepEqual(result, []);
});

test("admin tier raise → top-up key only", () => {
  const existingKeys = new Set([
    buildMonthlyPersistenceTierIdempotencyKey(STUDENT, YM, 100),
  ]);
  const raisedTiers = [{ minutes: 100, coins: 15_000 }, ...DEFAULT_TIERS.slice(1)];
  const result = computeOutstandingTierDeltas(100, raisedTiers, 10_000, {
    studentId: STUDENT,
    yearMonthIsrael: YM,
    existingKeys,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 5_000);
  assert.equal(result[0].kind, "topup");
  assert.equal(
    result[0].idempotencyKey,
    buildMonthlyPersistenceTopupIdempotencyKey(STUDENT, YM, 100, 15_000)
  );
});

test("admin tier lower → no negative delta / no clawback", () => {
  const loweredTiers = [{ minutes: 100, coins: 5_000 }, ...DEFAULT_TIERS.slice(1)];
  const result = computeOutstandingTierDeltas(100, loweredTiers, 10_000, {
    studentId: STUDENT,
    yearMonthIsrael: YM,
    existingKeys: new Set(),
  });
  assert.deepEqual(result, []);
});

test("legacy lump already paid counts toward tiers", () => {
  const result = deltas({ minutes: 260, alreadyPaid: 30_000 });
  assert.deepEqual(result, []);
});

test("tiersStatus reflects per-tier awarded", () => {
  const status = buildMonthlyPersistenceTiersStatus(260, DEFAULT_TIERS, 30_000);
  assert.equal(status[0].awarded, true);
  assert.equal(status[1].awarded, true);
  assert.equal(status[2].awarded, false);
  assert.equal(status[2].reached, false);
});

test("resolveMonthlyPersistenceTier unchanged semantics", () => {
  assert.equal(resolveMonthlyPersistenceTier(0, DEFAULT_TIERS), null);
  assert.equal(resolveMonthlyPersistenceTier(100, DEFAULT_TIERS)?.coins, 10_000);
  assert.equal(resolveMonthlyPersistenceTier(650, DEFAULT_TIERS)?.coins, 100_000);
});

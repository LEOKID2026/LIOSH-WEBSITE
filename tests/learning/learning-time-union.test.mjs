/**
 * Wall-clock union learning time — parallel tabs/activities must not stack.
 * Run: node --test tests/learning/learning-time-union.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  unionTimeIntervalsMs,
  creditWallClockUnionMs,
  reconstructDwellWindow,
  creditMergedIntervalsWithCap,
} from "../../lib/learning/learning-time-union.js";
import { LEARNING_UNIT_CREDIT_CAP_MS } from "../../lib/learning/learning-time-credit-policy.js";

describe("learning-time-union", () => {
  test("two activities open 10 minutes in parallel = 10 minutes, not 20", () => {
    const t0 = Date.parse("2026-07-12T10:00:00.000Z");
    const intervals = [
      [t0, t0 + 600_000],
      [t0 + 180_000, t0 + 780_000],
    ];
    const out = creditWallClockUnionMs(intervals);
    assert.equal(out.unionMs, 780_000);
    assert.equal(out.creditedMs, 780_000); // no streak cap
    assert.equal(out.minutes, 13);
    assert.ok(out.overlapMs > 0);
  });

  test("exact example: A 10:00-10:10 and B 10:03-10:13 => 13 union credited", () => {
    const t0 = Date.parse("2026-07-12T10:00:00.000Z");
    const intervals = [
      [t0, t0 + 10 * 60_000],
      [t0 + 3 * 60_000, t0 + 13 * 60_000],
    ];
    const u = unionTimeIntervalsMs(intervals);
    assert.equal(u.unionMs, 13 * 60_000);
    assert.equal(creditWallClockUnionMs(intervals).creditedMs, 13 * 60_000);
    // Forbidden streak helper still available for explicit opt-in only
    assert.equal(creditMergedIntervalsWithCap(u.merged, LEARNING_UNIT_CREDIT_CAP_MS), 10 * 60_000);
  });

  test("answers inside a visit window do not add above union", () => {
    const t0 = Date.parse("2026-07-12T11:00:00.000Z");
    const visit = [t0, t0 + 480_000];
    const answer = [t0 + 60_000, t0 + 180_000];
    const out = creditWallClockUnionMs([visit, answer]);
    assert.equal(out.unionMs, 480_000);
    assert.equal(out.creditedMs, 480_000);
  });

  test("orphan overlapping visit is absorbed by union", () => {
    const t0 = Date.parse("2026-07-12T12:00:00.000Z");
    const visit = [t0, t0 + 300_000];
    const orphan = [t0 + 240_000, t0 + 360_000];
    const out = creditWallClockUnionMs([visit, orphan]);
    assert.equal(out.unionMs, 360_000);
    assert.equal(out.creditedMs, 360_000);
  });

  test("true separate streak after gap credits full durations (no 10 streak cap)", () => {
    const t0 = Date.parse("2026-07-12T13:00:00.000Z");
    const a = [t0, t0 + 600_000];
    const b = [t0 + 20 * 60_000, t0 + 26 * 60_000];
    const out = creditWallClockUnionMs([a, b]);
    assert.equal(out.segmentCount, 2);
    assert.equal(out.creditedMs, 600_000 + 360_000);
    assert.equal(out.minutes, 16);
  });

  test("reconstruct dwell prefers started_at when valid", () => {
    const end = Date.parse("2026-07-12T14:10:00.000Z");
    const start = Date.parse("2026-07-12T14:00:00.000Z");
    const w = reconstructDwellWindow({
      startedAtMs: start,
      endedAtMs: end,
      rawMs: 999_999,
      creditedMs: 600_000,
    });
    assert.deepEqual(w, [start, end]);
  });

  test("reconstruct from raw when started_at == ended_at", () => {
    const end = Date.parse("2026-07-12T15:00:00.000Z");
    const w = reconstructDwellWindow({
      startedAtMs: end,
      endedAtMs: end,
      rawMs: 120_000,
      creditedMs: 120_000,
    });
    assert.deepEqual(w, [end - 120_000, end]);
  });

  test("sleep/wake style huge gap is not credited by union of tiny slices only", () => {
    const t0 = Date.parse("2026-07-12T16:00:00.000Z");
    const out = creditWallClockUnionMs([
      [t0, t0 + 60_000],
      [t0 + 3 * 3600_000, t0 + 3 * 3600_000 + 60_000],
    ]);
    assert.equal(out.creditedMs, 120_000);
  });
});

/**
 * Product learning-time rules — focused contract tests.
 * Run: node --test tests/learning/learning-time-product-rules.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  creditLearningUnitMs,
  sumQuestionCreditedMs,
  createLearningIdleController,
  LEARNING_IDLE_FREEZE_MS,
  LEARNING_UNIT_CREDIT_CAP_MS,
} from "../../lib/learning/learning-time-credit-policy.js";
import {
  creditWallClockUnionMs,
  unionTimeIntervalsMs,
} from "../../lib/learning/learning-time-union.js";
import {
  applyPageCreditCap,
  computePageCreditedDwellMs,
} from "../../lib/learning/book-dwell-policy.js";
import { computeAssignedActivityTiming, computeOpenLearningTiming } from "../../lib/learning/timing-policy.js";
import { coalesceParentActivityVisitCreditedMs } from "../../lib/learning-supabase/parent-activity-learning-visits.server.js";

describe("product learning-time rules", () => {
  test("1. questions 4+7+12 → 21 minutes", () => {
    const ms = sumQuestionCreditedMs([4 * 60_000, 7 * 60_000, 12 * 60_000]);
    assert.equal(ms, 21 * 60_000);
  });

  test("2. ten questions of 6 minutes → 60 minutes", () => {
    const list = Array.from({ length: 10 }, () => 6 * 60_000);
    assert.equal(sumQuestionCreditedMs(list), 60 * 60_000);
  });

  test("3. parent activity multiple questions = sum, not 10 for whole activity", () => {
    const q = [5, 8, 9, 12, 3].map((m) => computeAssignedActivityTiming(m * 60_000).creditedTimeMs);
    const sum = q.reduce((a, b) => a + b, 0);
    assert.equal(sum, (5 + 8 + 9 + 10 + 3) * 60_000);
    assert.ok(sum > LEARNING_UNIT_CREDIT_CAP_MS);
  });

  test("4. one question 25 minutes → 10 minutes", () => {
    assert.equal(creditLearningUnitMs(25 * 60_000), 10 * 60_000);
  });

  test("5. active book 35 minutes → 35 minutes (no page cap)", () => {
    assert.equal(applyPageCreditCap(35 * 60_000), 35 * 60_000);
    assert.equal(computePageCreditedDwellMs(35 * 60_000, 0), 35 * 60_000);
  });

  test("6. book idle 40 minutes → at most 10 since last activity then freeze", () => {
    const idle = createLearningIdleController({ now: 0 });
    idle.signalActivity(0);
    let credited = 0;
    // 40 one-minute ticks without new activity
    for (let t = 60_000; t <= 40 * 60_000; t += 60_000) {
      credited += idle.filterDelta(60_000, t);
    }
    assert.equal(credited, LEARNING_IDLE_FREEZE_MS);
    assert.equal(idle.isFrozen(), true);
  });

  test("7. resume after idle renews counting", () => {
    const idle = createLearningIdleController({ now: 0 });
    idle.signalActivity(0);
    let credited = 0;
    for (let t = 60_000; t <= 15 * 60_000; t += 60_000) {
      credited += idle.filterDelta(60_000, t);
    }
    assert.equal(credited, LEARNING_IDLE_FREEZE_MS);
    assert.equal(idle.isFrozen(), true);
    idle.signalActivity(20 * 60_000);
    credited += idle.filterDelta(60_000, 21 * 60_000);
    assert.equal(credited, LEARNING_IDLE_FREEZE_MS + 60_000);
    assert.equal(idle.isFrozen(), false);
  });

  test("8+9. navigation pages credit 0 (no learning windows)", () => {
    const out = creditWallClockUnionMs([]);
    assert.equal(out.creditedMs, 0);
    assert.equal(out.minutes, 0);
  });

  test("10. two activities parallel 20 minutes → at most 20 not 40", () => {
    const t0 = Date.parse("2026-07-12T10:00:00.000Z");
    const out = creditWallClockUnionMs([
      [t0, t0 + 20 * 60_000],
      [t0, t0 + 20 * 60_000],
    ]);
    assert.equal(out.unionMs, 20 * 60_000);
    assert.equal(out.creditedMs, 20 * 60_000);
  });

  test("11. activity + book parallel → union only", () => {
    const t0 = Date.parse("2026-07-12T11:00:00.000Z");
    const out = creditWallClockUnionMs([
      [t0, t0 + 15 * 60_000],
      [t0 + 5 * 60_000, t0 + 25 * 60_000],
    ]);
    assert.equal(out.unionMs, 25 * 60_000);
    assert.equal(out.creditedMs, 25 * 60_000);
  });

  test("12. question advance is not a new visit unit - visit open-learning uncapped by question cap", () => {
    const visit = computeOpenLearningTiming(45 * 60_000);
    assert.equal(visit.creditedTimeMs, 45 * 60_000);
    const q = computeAssignedActivityTiming(45 * 60_000);
    assert.equal(q.creditedTimeMs, 10 * 60_000);
  });

  test("13+14. remount/duplicate visit windows union without stacking", () => {
    const t0 = Date.parse("2026-07-12T12:00:00.000Z");
    const end = t0 + 8 * 60_000;
    const rows = [
      {
        activity_id: "a1",
        started_at: new Date(end).toISOString(),
        ended_at: new Date(end).toISOString(),
        raw_dwell_ms: 8 * 60_000,
        credited_dwell_ms: 8 * 60_000,
      },
      {
        activity_id: "a1",
        started_at: new Date(end + 1000).toISOString(),
        ended_at: new Date(end + 1000).toISOString(),
        raw_dwell_ms: 8 * 60_000,
        credited_dwell_ms: 8 * 60_000,
      },
    ];
    const coalesced = coalesceParentActivityVisitCreditedMs(rows);
    // Nearly identical reconstructed windows → union ≈ 8–9 min, not 16
    assert.ok(coalesced.ms < 16 * 60_000);
    assert.ok(coalesced.ms >= 8 * 60_000);
  });

  test("15. true separate windows after gap credit again", () => {
    const t0 = Date.parse("2026-07-12T13:00:00.000Z");
    const out = creditWallClockUnionMs([
      [t0, t0 + 8 * 60_000],
      [t0 + 30 * 60_000, t0 + 38 * 60_000],
    ]);
    assert.equal(out.creditedMs, 16 * 60_000);
  });

  test("16. no 10-minute streak/activity/day/month cap after union", () => {
    const t0 = Date.parse("2026-07-12T14:00:00.000Z");
    const out = creditWallClockUnionMs([[t0, t0 + 55 * 60_000]]);
    assert.equal(out.creditedMs, 55 * 60_000);
    assert.equal(out.minutes, 55);
    // Forbidden streak cap must be opt-in only
    const forbidden = creditWallClockUnionMs([[t0, t0 + 55 * 60_000]], {
      applyStreakCap: true,
      capMs: LEARNING_UNIT_CREDIT_CAP_MS,
    });
    assert.equal(forbidden.creditedMs, LEARNING_UNIT_CREDIT_CAP_MS);
  });

  test("17. parallel example A 10:00-10:10 B 10:03-10:13 → 13 union credited", () => {
    const t0 = Date.parse("2026-07-12T10:00:00.000Z");
    const u = unionTimeIntervalsMs([
      [t0, t0 + 10 * 60_000],
      [t0 + 3 * 60_000, t0 + 13 * 60_000],
    ]);
    assert.equal(u.unionMs, 13 * 60_000);
    const out = creditWallClockUnionMs([
      [t0, t0 + 10 * 60_000],
      [t0 + 3 * 60_000, t0 + 13 * 60_000],
    ]);
    assert.equal(out.creditedMs, 13 * 60_000);
  });
});

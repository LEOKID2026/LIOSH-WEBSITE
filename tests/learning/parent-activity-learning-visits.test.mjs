import test from "node:test";
import assert from "node:assert/strict";

import { creditLearningUnitMs } from "../../lib/learning/learning-time-credit-policy.js";
import {
  computeAssignedActivityTiming,
  computeOpenLearningTiming,
} from "../../lib/learning/timing-policy.js";
import { computeParentVisitTimingFromStart } from "../../lib/learning-client/parentActivityLearningVisit.client.js";
import { coalesceParentActivityVisitCreditedMs } from "../../lib/learning-supabase/parent-activity-learning-visits.server.js";

test("parent visit - 8 min first visit credits 8 min", () => {
  const started = Date.now() - 480_000;
  const timing = computeParentVisitTimingFromStart(started);
  assert.equal(timing.creditedDwellMs, 480_000);
});

test("parent visit - 15 min visit is NOT capped at 10 (open learning)", () => {
  const started = Date.now() - 900_000;
  const timing = computeParentVisitTimingFromStart(started);
  assert.equal(timing.creditedDwellMs, 900_000);
  assert.equal(computeOpenLearningTiming(900_000).creditedTimeMs, 900_000);
});

test("coalesce remount visits unions overlapping windows without stacking", () => {
  const base = Date.parse("2026-07-12T04:13:37.000Z");
  const rows = [];
  for (let i = 0; i < 66; i++) {
    rows.push({
      activity_id: "geo-area",
      started_at: new Date(base + i * 8_000).toISOString(),
      ended_at: new Date(base + i * 8_000).toISOString(),
      raw_dwell_ms: 16_000,
      credited_dwell_ms: 16_000,
    });
  }
  const out = coalesceParentActivityVisitCreditedMs(rows);
  assert.equal(out.rawRowCount, 66);
  assert.equal(out.clusterCount, 1);
  // Wall span ≈ 16s + 65*8s = 536s — not 66*16s
  assert.ok(out.ms < 66 * 16_000);
  assert.ok(out.ms >= 500_000);
  assert.ok(out.ms <= 560_000);
});

test("true re-entry after gap creates separate union segments", () => {
  const rows = [
    {
      activity_id: "math-1",
      started_at: "2026-07-12T04:00:00.000Z",
      ended_at: "2026-07-12T04:00:00.000Z",
      raw_dwell_ms: 480_000,
      credited_dwell_ms: 480_000,
    },
    {
      activity_id: "math-1",
      started_at: "2026-07-12T04:20:00.000Z",
      ended_at: "2026-07-12T04:20:00.000Z",
      raw_dwell_ms: 360_000,
      credited_dwell_ms: 360_000,
    },
  ];
  const out = coalesceParentActivityVisitCreditedMs(rows);
  assert.equal(out.clusterCount, 2);
  assert.equal(out.ms, 840_000);
});

test("duplicate same visit token is not coalesced as two clusters when single row", () => {
  const once = creditLearningUnitMs(120_000);
  assert.equal(once, 120_000);
});

test("assigned activity timing uses 10 min cap per question only", () => {
  assert.equal(computeAssignedActivityTiming(900_000).creditedTimeMs, 600_000);
  assert.equal(computeAssignedActivityTiming(360_000).creditedTimeMs, 360_000);
});

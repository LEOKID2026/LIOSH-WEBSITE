#!/usr/bin/env node
/**
 * Unit checks for reward card image storage paths (no live Storage required).
 * Run: node scripts/rewards-card-image-path-selftest.mjs
 */
import assert from "node:assert/strict";
import {
  buildRewardCardStoragePath,
  sanitizeRewardCardPathSegment,
} from "../lib/rewards/server/reward-card-image.server.js";

function testSanitize() {
  assert.equal(sanitizeRewardCardPathSegment("leo_musician"), "leo_musician");
  assert.equal(sanitizeRewardCardPathSegment("Israeli-Holidays"), "israeli-holidays");
  assert.equal(sanitizeRewardCardPathSegment("../../../etc"), "etc");
  assert.equal(sanitizeRewardCardPathSegment(""), null);
}

function testShopPath() {
  const r = buildRewardCardStoragePath({
    card_key: "leo_musician",
    card_type: "shop",
    reward_card_series: { slug: "professions" },
  });
  assert.equal(r.ok, true);
  assert.equal(r.storagePath, "shop/professions/leo_musician.webp");
}

function testAchievementPath() {
  const r = buildRewardCardStoragePath({
    card_key: "achievement_7_day_streak",
    card_type: "achievement",
    reward_card_series: { slug: "general" },
  });
  assert.equal(r.ok, true);
  assert.equal(r.storagePath, "achievements/general/achievement_7_day_streak.webp");
}

function testEventPath() {
  const r = buildRewardCardStoragePath({
    card_key: "event_lag_baomer",
    card_type: "event",
    reward_card_series: null,
  });
  assert.equal(r.ok, true);
  assert.equal(r.storagePath, "events/event_lag_baomer.webp");
}

function testMissingSeries() {
  const r = buildRewardCardStoragePath({
    card_key: "leo_x",
    card_type: "shop",
    reward_card_series: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "missing_series");
}

testSanitize();
testShopPath();
testAchievementPath();
testEventPath();
testMissingSeries();
console.log("rewards-card-image-path-selftest: OK");

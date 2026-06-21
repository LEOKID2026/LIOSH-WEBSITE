#!/usr/bin/env node
/**
 * Legacy 058 seed cards must never appear in student card world payloads.
 * Run: node scripts/tests/student-card-legacy-filter-selftest.mjs
 */
import assert from "node:assert/strict";
import {
  LEGACY_058_ACHIEVEMENT_CARD_KEYS,
  LEGACY_058_SHOP_CARD_KEYS,
} from "../../lib/rewards/legacy-seed-card-keys.js";
import {
  filterStudentWorldCards,
  getLegacySeedCardExclusionReason,
  isLegacySeedCardExcludedFromStudentWorld,
} from "../../lib/rewards/server/student-card-visibility.server.js";
import { mapRewardCardImageFields } from "../../lib/rewards/reward-card-image-urls.js";

const SAMPLE_LEGACY = [
  { card_key: "fox_clever", card_type: "shop", image_url: "/rewards/cards/shop/animals/fox_clever.svg" },
  { card_key: "silver_robot", card_type: "shop", reward_card_series: { slug: "robots" } },
  { card_key: "strong_start", card_type: "achievement" },
  { card_key: "question_master", card_type: "achievement" },
];

for (const card of SAMPLE_LEGACY) {
  assert.ok(isLegacySeedCardExcludedFromStudentWorld(card), `expected excluded: ${card.card_key}`);
}

const leoShop = {
  card_key: "leo_scientist",
  card_type: "shop",
  image_url: "/rewards/cards/shop/professions/leo_scientist.webp",
  reward_card_series: { slug: "professions" },
};
assert.equal(isLegacySeedCardExcludedFromStudentWorld(leoShop), false);

const leoAchievement = {
  card_key: "achievement_strong_start",
  card_type: "achievement",
  image_url: "/rewards/cards/achievements/general/achievement_strong_start.webp",
  reward_card_series: { slug: "general" },
};
assert.equal(isLegacySeedCardExcludedFromStudentWorld(leoAchievement), false);

const svgFallback = mapRewardCardImageFields({
  image_url: "/rewards/cards/shop/animals/fox_clever.svg",
});
assert.equal(
  svgFallback.imageThumbUrl,
  "/rewards/cards/placeholders/regular/default.svg",
  "legacy svg must not be exposed when variants missing"
);

const { visible, excluded } = filterStudentWorldCards(SAMPLE_LEGACY);
assert.equal(visible.length, 0);
assert.equal(excluded.length, SAMPLE_LEGACY.length);

console.log("=== Legacy seed cards filtered from student world ===\n");
console.log(`Shop keys (${LEGACY_058_SHOP_CARD_KEYS.length}): ${LEGACY_058_SHOP_CARD_KEYS.join(", ")}`);
console.log(
  `\nAchievement keys (${LEGACY_058_ACHIEVEMENT_CARD_KEYS.length}): ${LEGACY_058_ACHIEVEMENT_CARD_KEYS.join(", ")}`
);
console.log("\nExclusion reasons (sample):");
for (const card of SAMPLE_LEGACY) {
  console.log(`- ${card.card_key}: ${getLegacySeedCardExclusionReason(card)}`);
}

console.log("\nstudent-card-legacy-filter-selftest: ok");

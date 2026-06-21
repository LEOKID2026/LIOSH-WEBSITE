/**
 * Reward economy contract — no hardcoded runtime defaults (DB/admin single source).
 * Run: node --test tests/rewards/card-rules-no-hardcoded.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("card-rules-no-hardcoded", () => {
  test("card-acquisition-engine has no literal threshold defaults (30/80/7/10)", () => {
    const src = readFileSync(
      join(ROOT, "lib/rewards/server/card-acquisition-engine.server.js"),
      "utf8"
    );
    assert.doesNotMatch(src, /min_questions\s*[=:]\s*30\b/);
    assert.doesNotMatch(src, /min_accuracy\s*[=:]\s*80\b/);
    assert.doesNotMatch(src, /min_streak_days\s*[=:]\s*7\b/);
    assert.doesNotMatch(src, /threshold\s*=\s*10\b/);
  });

  test("achievement-evaluator delegates to acquisition engine", () => {
    const src = readFileSync(
      join(ROOT, "lib/rewards/server/achievement-evaluator.server.js"),
      "utf8"
    );
    assert.match(src, /card-acquisition-engine\.server\.js/);
    assert.doesNotMatch(src, /min_questions/);
  });

  test("leo-shop-cards-registry is shim re-export only (no card_key image map)", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/leo-shop-cards-registry.js"), "utf8");
    assert.match(src, /from\s+["']\.\/reward-card-image-urls\.js["']/);
    assert.match(src, /LEO_SHOP_CARD_IMAGES\s*=\s*\{\s*\}/);
    assert.doesNotMatch(src, /leo_scientist\s*:/);
    assert.doesNotMatch(src, /\/rewards\/cards\/shop\//);
  });

  test("reward-card-image-urls resolves from DB card fields (not card_key registry)", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/reward-card-image-urls.js"), "utf8");
    assert.match(src, /card\.image_url/);
    assert.match(src, /resolveRewardCardImageUrls/);
    assert.doesNotMatch(src, /LEO_SHOP_CARD_IMAGES/);
    assert.doesNotMatch(src, /leo_scientist\s*:/);
  });

  test("surprise-box reads admin settings via getCardSetting + parseSurpriseBoxGeneralSettings", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/surprise-box.server.js"), "utf8");
    assert.match(src, /getCardSetting/);
    assert.match(src, /parseSurpriseBoxGeneralSettings/);
    assert.match(src, /prevent_duplicate_in_box/);
    assert.doesNotMatch(src, /getDuplicateThreshold/);
    assert.doesNotMatch(src, /threshold\s*=\s*10\b/);
  });

  test("duplicate auto-conversion disabled; sellback is the active model", () => {
    const conversion = readFileSync(
      join(ROOT, "lib/rewards/server/duplicate-conversion.server.js"),
      "utf8"
    );
    assert.match(conversion, /feature_disabled/);
    assert.match(conversion, /מכור עותק כפול בחנות/);

    const shop = readFileSync(join(ROOT, "lib/rewards/server/reward-shop.server.js"), "utf8");
    assert.match(shop, /getDuplicateSellbackPercent/);
    assert.match(shop, /card_sellback/);
  });
});

/**
 * No hardcoded acquisition thresholds in evaluator runtime.
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

  test("leo-shop-cards-registry has empty runtime image map", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/leo-shop-cards-registry.js"), "utf8");
    assert.match(src, /LEO_SHOP_CARD_IMAGES\s*=\s*\{\s*\}/);
    assert.match(src, /image_url/);
  });

  test("surprise-box uses getDuplicateThreshold from settings", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/surprise-box.server.js"), "utf8");
    assert.match(src, /getDuplicateThreshold/);
    assert.doesNotMatch(src, /threshold\s*=\s*10\b/);
  });
});

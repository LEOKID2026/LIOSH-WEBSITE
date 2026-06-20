/**
 * Arcade entry costs from Admin/DB catalog.
 * Run: node --test tests/arcade/economy-entry-costs.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("arcade economy entry costs", () => {
  test("game-registry has no ARCADE_ENTRY_COSTS", () => {
    const src = readFileSync(join(ROOT, "lib/arcade/game-registry.js"), "utf8");
    assert.doesNotMatch(src, /ARCADE_ENTRY_COSTS/);
  });

  test("arcade-rooms validateEntryCost uses DB catalog", () => {
    const src = readFileSync(join(ROOT, "lib/arcade/server/arcade-rooms.js"), "utf8");
    assert.match(src, /getActiveEntryCostAmounts/);
    assert.match(src, /async function validateEntryCost/);
    assert.doesNotMatch(src, /ARCADE_ENTRY_COSTS/);
  });

  test("arcade games API loads entryCostOptions from economy-config", () => {
    const src = readFileSync(join(ROOT, "pages/api/arcade/games.js"), "utf8");
    assert.match(src, /getEntryCostOptions/);
    assert.match(src, /entryCostOptions/);
    assert.doesNotMatch(src, /allowedEntryCosts: \[10, 100, 1000, 10000\]/);
  });

  test("student arcade page has no hardcoded ENTRY_OPTIONS", () => {
    const src = readFileSync(join(ROOT, "pages/student/arcade.js"), "utf8");
    assert.doesNotMatch(src, /const ENTRY_OPTIONS/);
    assert.match(src, /entryOptions/);
    assert.match(src, /mapEntryCostOptionsForUi/);
  });
});

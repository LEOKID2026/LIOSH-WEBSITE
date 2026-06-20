/**
 * Card settings fail-closed — no runtime DEFAULT fallback.
 * Run: node --test tests/rewards/card-settings-required.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getCardSetting, invalidateSettingsCache } from "../../lib/rewards/server/reward-settings.server.js";
import { EconomyUnavailableError } from "../../lib/rewards/economy-errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function createMockSupabase(rows = []) {
  return {
    from(table) {
      if (table !== "reward_card_settings") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      return {
        select() {
          return Promise.resolve({ data: rows, error: null });
        },
      };
    },
  };
}

describe("card-settings fail-closed", () => {
  test("getCardSetting throws when key missing in DB", async () => {
    invalidateSettingsCache();
    const supabase = createMockSupabase([{ setting_key: "system_enabled", setting_value_json: true }]);
    await assert.rejects(
      () => getCardSetting(supabase, "shop_default_prices"),
      (err) => err instanceof EconomyUnavailableError
    );
  });

  test("getCardSetting returns DB value when present", async () => {
    invalidateSettingsCache();
    const supabase = createMockSupabase([
      { setting_key: "duplicate_threshold", setting_value_json: 10 },
    ]);
    const v = await getCardSetting(supabase, "duplicate_threshold");
    assert.equal(v, 10);
  });

  test("module exports SEED_CARD_SETTINGS only (no DEFAULT_CARD_SETTINGS)", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/reward-settings.server.js"), "utf8");
    assert.match(src, /SEED_CARD_SETTINGS/);
    assert.doesNotMatch(src, /DEFAULT_CARD_SETTINGS/);
  });
});

/**
 * Phase 0 — economy-config fail-closed contract tests.
 * Run: node --test tests/rewards/economy-config-required.test.mjs
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EconomyUnavailableError,
  ECONOMY_ERROR_CODES,
  economyUnavailableHttpResponse,
} from "../../lib/rewards/economy-errors.js";
import {
  assertEconomyEnabled,
  requireEconomyConfig,
  loadEconomySnapshotFromDb,
  isLegacyEconomyRuntimeAllowed,
} from "../../lib/rewards/server/economy-config.server.js";
import {
  isLegacyEconomyRuntimeAllowed as isLegacyFromFlags,
  isRewardEconomySettingsEnabled,
} from "../../lib/rewards/reward-feature-flags.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const FULL_DAILY = [
  { mission_key: "q10", grade_band: "g12", text_he: "10 שאלות", mission_type: "questions", target_value: 10, reward_coins: 20, display_order: 1 },
  { mission_key: "q15", grade_band: "g34", text_he: "15 שאלות", mission_type: "questions", target_value: 15, reward_coins: 20, display_order: 1 },
  { mission_key: "q20", grade_band: "g56", text_he: "20 שאלות", mission_type: "questions", target_value: 20, reward_coins: 20, display_order: 1 },
];

const FULL_MONTHLY = [
  { minutes_threshold: 100, reward_coins: 10000, label_he: "100 דקות", display_order: 1 },
  { minutes_threshold: 600, reward_coins: 100000, label_he: "600 דקות", display_order: 4 },
];

const FULL_GLOBAL = { monthly_minutes_cap: 600, monthly_coins_cap: 100000 };

/**
 * @param {{
 *   daily?: unknown[],
 *   monthly?: unknown[],
 *   global?: unknown|null,
 *   dailyError?: string|null,
 * }} cfg
 */
function createMockSupabase(cfg = {}) {
  function resultFor(table) {
    if (table === "reward_economy_daily_missions") {
      if (cfg.dailyError) return { data: null, error: { message: cfg.dailyError } };
      return { data: cfg.daily ?? [], error: null };
    }
    if (table === "reward_economy_monthly_tiers") {
      return { data: cfg.monthly ?? [], error: null };
    }
    if (table === "reward_economy_global_settings") {
      return { data: cfg.global ?? null, error: null };
    }
    return { data: [], error: null };
  }

  function query(table) {
    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      order() {
        return Promise.resolve(resultFor(table));
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        return Promise.resolve(resultFor(table));
      },
    };
    return builder;
  }

  return { from: query };
}

describe("economy-errors", () => {
  test("EconomyUnavailableError carries code and details", () => {
    const err = new EconomyUnavailableError("economy_config_missing", "חסר", {
      details: { missing: ["tiers"] },
    });
    assert.equal(err.code, "economy_config_missing");
    assert.deepEqual(err.details, { missing: ["tiers"] });
    const http = economyUnavailableHttpResponse(err);
    assert.equal(http.ok, false);
    assert.equal(http.unavailable, true);
    assert.equal(http.error, "economy_config_missing");
  });
});

describe("legacy policy", () => {
  test("isLegacyEconomyRuntimeAllowed is always false", () => {
    assert.equal(isLegacyEconomyRuntimeAllowed(), false);
    assert.equal(isLegacyFromFlags(), false);
  });

  test("economy-config.server.js has no legacy-economy import", () => {
    const src = readFileSync(
      join(ROOT, "lib/rewards/server/economy-config.server.js"),
      "utf8"
    );
    assert.doesNotMatch(src, /from\s+["'].*legacy-economy/);
    assert.doesNotMatch(src, /import\s*\{[^}]*LEGACY_/);
  });
});

describe("assertEconomyEnabled", () => {
  const prev = process.env.REWARD_ECONOMY_SETTINGS_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.REWARD_ECONOMY_SETTINGS_ENABLED;
    else process.env.REWARD_ECONOMY_SETTINGS_ENABLED = prev;
  });

  test("throws economy_disabled when flag is false", () => {
    process.env.REWARD_ECONOMY_SETTINGS_ENABLED = "false";
    assert.throws(
      () => assertEconomyEnabled(),
      (err) => {
        assert.ok(err instanceof EconomyUnavailableError);
        assert.equal(err.code, ECONOMY_ERROR_CODES.economy_disabled);
        return true;
      }
    );
  });

  test("passes when flag is true", () => {
    process.env.REWARD_ECONOMY_SETTINGS_ENABLED = "true";
    assert.doesNotThrow(() => assertEconomyEnabled());
    assert.equal(isRewardEconomySettingsEnabled(), true);
  });
});

describe("requireEconomyConfig", () => {
  const prev = process.env.REWARD_ECONOMY_SETTINGS_ENABLED;

  beforeEach(() => {
    process.env.REWARD_ECONOMY_SETTINGS_ENABLED = "true";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.REWARD_ECONOMY_SETTINGS_ENABLED;
    else process.env.REWARD_ECONOMY_SETTINGS_ENABLED = prev;
  });

  test("throws economy_config_missing when DB rows incomplete - not legacy", async () => {
    const supabase = createMockSupabase({ daily: [], monthly: [], global: null });
    await assert.rejects(
      () => requireEconomyConfig(supabase),
      (err) => {
        assert.ok(err instanceof EconomyUnavailableError);
        assert.equal(err.code, ECONOMY_ERROR_CODES.economy_config_missing);
        assert.ok(Array.isArray(err.details?.missing));
        assert.ok(err.details.missing.includes("reward_economy_monthly_tiers"));
        return true;
      }
    );
  });

  test("returns snapshot when DB has required rows", async () => {
    const supabase = createMockSupabase({
      daily: FULL_DAILY,
      monthly: FULL_MONTHLY,
      global: FULL_GLOBAL,
    });
    const snap = await requireEconomyConfig(supabase);
    assert.equal(snap.monthlyTiers.length, 2);
    assert.equal(snap.monthlyTiers[0].coins, 10000);
    assert.equal(snap.globalCaps.monthlyMinutesCap, 600);
    assert.equal(snap.dailyMissionsByBand.g12.length, 1);
    assert.equal(snap.dailyMissionsByBand.g34.length, 1);
    assert.equal(snap.dailyMissionsByBand.g56.length, 1);
  });

  test("throws economy_db_error on query failure", async () => {
    const supabase = createMockSupabase({ dailyError: "connection failed" });
    await assert.rejects(
      () => loadEconomySnapshotFromDb(supabase),
      (err) => {
        assert.equal(err.code, ECONOMY_ERROR_CODES.economy_db_error);
        return true;
      }
    );
  });

  test("throws economy_disabled when flag off before DB access", async () => {
    process.env.REWARD_ECONOMY_SETTINGS_ENABLED = "false";
    const supabase = createMockSupabase({
      daily: FULL_DAILY,
      monthly: FULL_MONTHLY,
      global: FULL_GLOBAL,
    });
    await assert.rejects(
      () => requireEconomyConfig(supabase),
      (err) => err.code === ECONOMY_ERROR_CODES.economy_disabled
    );
  });
});

describe("reward-feature-flags fail-closed helpers", () => {
  test("economyFeatureUnavailableResponse marks unavailable", async () => {
    const { economyFeatureUnavailableResponse } = await import(
      "../../lib/rewards/reward-feature-flags.js"
    );
    const body = economyFeatureUnavailableResponse("economy_disabled", "כבוי");
    assert.equal(body.ok, false);
    assert.equal(body.unavailable, true);
    assert.equal(body.error, "economy_disabled");
    assert.equal(body.messageHe, "כבוי");
  });
});

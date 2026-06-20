/**
 * Economy resolution chain — missing DB → error; complete DB → snapshot.
 * Run: node --test tests/rewards/economy-resolution-chain.test.mjs
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  requireEconomyConfig,
  requireSessionCoinSettings,
  getEntryCostOptions,
  requireArcadePayoutRules,
  calculateSessionCoinsFromSettings,
  invalidateEconomyCache,
} from "../../lib/rewards/server/economy-config.server.js";
import { EconomyUnavailableError } from "../../lib/rewards/economy-errors.js";

const FULL_DAILY = [
  { mission_key: "q10", grade_band: "g12", text_he: "10", mission_type: "questions", target_value: 10, reward_coins: 20, display_order: 1 },
  { mission_key: "q15", grade_band: "g34", text_he: "15", mission_type: "questions", target_value: 15, reward_coins: 20, display_order: 1 },
  { mission_key: "q20", grade_band: "g56", text_he: "20", mission_type: "questions", target_value: 20, reward_coins: 20, display_order: 1 },
];

const FULL_MONTHLY = [
  { minutes_threshold: 100, reward_coins: 10000, label_he: "100", display_order: 1 },
  { minutes_threshold: 600, reward_coins: 100000, label_he: "600", display_order: 4 },
];

const FULL_GLOBAL = { monthly_minutes_cap: 600, monthly_coins_cap: 100000 };

const SESSION_ROW = {
  base_coins: 10,
  bonus_80_coins: 5,
  bonus_95_coins: 10,
  daily_cap: 300,
};

const ENTRY_ROWS = [
  { amount: 10, label_he: "10", display_order: 1 },
  { amount: 100, label_he: "100", display_order: 2 },
];

const PAYOUT_ROW = {
  payout_rules_json: { winner_takes_pot: true, pot_multiplier: 2 },
  is_active: true,
};

/**
 * @param {Record<string, unknown>} tables
 */
function createMockSupabase(tables = {}) {
  function resultFor(table) {
    if (table === "reward_economy_daily_missions") {
      return { data: tables.daily ?? [], error: tables.dailyError ?? null };
    }
    if (table === "reward_economy_monthly_tiers") {
      return { data: tables.monthly ?? [], error: null };
    }
    if (table === "reward_economy_global_settings") {
      return { data: tables.global ?? null, error: null };
    }
    if (table === "reward_economy_session_coins") {
      return { data: tables.session ?? null, error: tables.sessionError ?? null };
    }
    if (table === "reward_economy_entry_cost_options") {
      return { data: tables.entry ?? [], error: tables.entryError ?? null };
    }
    if (table === "reward_economy_arcade_payout_rules") {
      return { data: tables.payout ?? null, error: tables.payoutError ?? null };
    }
    return { data: [], error: null };
  }

  function query(table) {
    const builder = {
      select() {
        return builder;
      },
      eq(_col, val) {
        if (table === "reward_economy_arcade_payout_rules" && val === "fourline") {
          builder._gameKey = val;
        }
        return builder;
      },
      order() {
        return Promise.resolve(resultFor(table));
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        if (table === "reward_economy_arcade_payout_rules") {
          return Promise.resolve({ data: tables.payout ?? null, error: tables.payoutError ?? null });
        }
        return Promise.resolve(resultFor(table));
      },
    };
    return builder;
  }

  return { from: query };
}

describe("economy resolution chain", () => {
  const prev = process.env.REWARD_ECONOMY_SETTINGS_ENABLED;

  beforeEach(() => {
    process.env.REWARD_ECONOMY_SETTINGS_ENABLED = "true";
    invalidateEconomyCache();
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.REWARD_ECONOMY_SETTINGS_ENABLED;
    else process.env.REWARD_ECONOMY_SETTINGS_ENABLED = prev;
  });

  test("missing monthly tiers → EconomyUnavailableError", async () => {
    const supabase = createMockSupabase({ daily: FULL_DAILY, monthly: [], global: FULL_GLOBAL });
    await assert.rejects(() => requireEconomyConfig(supabase), EconomyUnavailableError);
  });

  test("full economy snapshot resolves tiers and caps", async () => {
    const supabase = createMockSupabase({
      daily: FULL_DAILY,
      monthly: FULL_MONTHLY,
      global: FULL_GLOBAL,
    });
    const snap = await requireEconomyConfig(supabase);
    assert.equal(snap.monthlyTiers.find((t) => t.minutes === 600)?.coins, 100000);
    assert.equal(snap.globalCaps.monthlyMinutesCap, 600);
  });

  test("missing session coins row → error", async () => {
    const supabase = createMockSupabase({ session: null });
    await assert.rejects(() => requireSessionCoinSettings(supabase), EconomyUnavailableError);
  });

  test("session coins drive calculateSessionCoinsFromSettings", async () => {
    const supabase = createMockSupabase({ session: SESSION_ROW });
    const settings = await requireSessionCoinSettings(supabase);
    assert.equal(calculateSessionCoinsFromSettings(50, 60, settings), 10);
    assert.equal(calculateSessionCoinsFromSettings(80, 60, settings), 15);
    assert.equal(calculateSessionCoinsFromSettings(95, 60, settings), 20);
  });

  test("missing entry costs → error", async () => {
    const supabase = createMockSupabase({ entry: [] });
    await assert.rejects(() => getEntryCostOptions(supabase), EconomyUnavailableError);
  });

  test("entry costs catalog loads from DB", async () => {
    const supabase = createMockSupabase({ entry: ENTRY_ROWS });
    const opts = await getEntryCostOptions(supabase);
    assert.deepEqual(opts.map((o) => o.amount), [10, 100]);
  });

  test("missing arcade payout rules → error", async () => {
    const supabase = createMockSupabase({ payout: null });
    await assert.rejects(() => requireArcadePayoutRules(supabase, "fourline"), EconomyUnavailableError);
  });

  test("arcade payout rules load for game key", async () => {
    const supabase = createMockSupabase({ payout: PAYOUT_ROW });
    const rules = await requireArcadePayoutRules(supabase, "fourline");
    assert.equal(rules.winner_takes_pot, true);
  });
});

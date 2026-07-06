/** Canonical Leo Miners settings_json defaults — single source for migration seed + Admin reset. */

export const LEO_MINERS_DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  economy_enabled: false,
  accrue_enabled: false,
  claim_enabled: false,
  offline_enabled: true,
  gifts_enabled: true,
  diamond_chest_enabled: false,
  guest_play_enabled: true,
  guest_claim_enabled: true,
  guest_diamond_enabled: false,

  daily_points_cap: 2500,
  daily_coins_cap: 500,
  max_coins_per_claim: 500,
  min_points_to_claim: 1,
  points_to_coins_ratio: 1,
  coins_rounding: "floor",
  claim_cooldown_sec: 0,

  diamond_chest_cost: 3,
  diamond_chest_amount: 1,
  daily_diamond_cap: 1,
  max_diamonds_per_claim: 1,

  offline_cap_hours: 12,
  offline_factor: 0.35,
  offline_min_seconds: 60,
  offline_max_claims_per_day: 3,

  max_breaks_per_minute: 60,
  max_breaks_per_batch: 120,
  max_stage: 100000,
  max_offline_elapsed_sec: 43200,
  reject_impossible_stage_jump: true,

  guest_multiplier: 0.5,
  guest_daily_points_cap: 500,
  guest_daily_coins_cap: 100,
  guest_daily_diamond_cap: 0,

  base_dps: 2,
  level_dps_multiplier: 1.9,
  rock_base_hp: 60,
  rock_hp_multiplier: 1.4,
  gold_factor: 0.5,
  spawn_initial_cost: 50,
  spawn_cost_multiplier: 1.12,
  dps_upgrade_multiplier: 1.1,
  gold_upgrade_multiplier: 1.1,
  auto_dog_interval_sec: 600,
  auto_dog_bank_cap: 6,

  base_stage_v1: 0.2,
  softcut: Object.freeze([
    { upto: 0.55, factor: 1.0 },
    { upto: 0.75, factor: 0.55 },
    { upto: 0.9, factor: 0.3 },
    { upto: 1.0, factor: 0.15 },
    { upto: 9.99, factor: 0.06 },
  ]),
  stage_blocks: Object.freeze([
    { start: 1, end: 10, r: 1.32 },
    { start: 11, end: 20, r: 1.18 },
    { start: 21, end: 30, r: 1.11 },
    { start: 31, end: 40, r: 1.06 },
    { start: 41, end: 50, r: 1.025 },
    { start: 51, end: 1000, r: 1.0004 },
  ]),
});

/** @returns {Record<string, unknown>} Deep-cloned defaults safe for JSON serialization. */
export function cloneLeoMinersDefaultSettings() {
  return JSON.parse(JSON.stringify(LEO_MINERS_DEFAULT_SETTINGS));
}

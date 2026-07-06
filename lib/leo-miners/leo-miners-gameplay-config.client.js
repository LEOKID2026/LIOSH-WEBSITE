import { LEO_MINERS_DEFAULT_SETTINGS } from "./server/leo-miners-default-settings.js";

export const LEO_MINERS_GAMEPLAY_KEYS = Object.freeze([
  "base_dps",
  "level_dps_multiplier",
  "rock_base_hp",
  "rock_hp_multiplier",
  "gold_factor",
  "spawn_initial_cost",
  "spawn_cost_multiplier",
  "dps_upgrade_multiplier",
  "gold_upgrade_multiplier",
  "auto_dog_interval_sec",
  "auto_dog_bank_cap",
]);

function num(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 */
export function resolveGameplayTuning(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const key of LEO_MINERS_GAMEPLAY_KEYS) {
    out[key] = num(src[key], LEO_MINERS_DEFAULT_SETTINGS[key]);
  }
  return Object.freeze(out);
}

/** @type {Readonly<Record<string, number>>} */
let activeGameplay = resolveGameplayTuning();

/**
 * Apply gameplay tuning once at hydrate (page load). Not live-updated mid-session.
 * @param {Record<string, unknown>|null|undefined} raw
 */
export function activateLeoMinersGameplayConfig(raw) {
  activeGameplay = resolveGameplayTuning(raw);
}

/** @returns {Readonly<Record<string, number>>} */
export function getLeoMinersGameplayConfig() {
  return activeGameplay;
}

export function getDefaultGameplayTuning() {
  return resolveGameplayTuning();
}

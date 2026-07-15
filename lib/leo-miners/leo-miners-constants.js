/** Leo Miners game key and shared client/server constants. */

export const LEO_MINERS_GAME_KEY = "leo-miners";

/** UX-only board cache — not a source of truth for rewards. */
export const LEO_MINERS_LS_CACHE_KEY = "liosh_miners_cache_v1";

export const LEO_MINERS_CONFIG_ID = "00000000-0000-4000-8000-000000000095";

export const LEO_MINERS_ACTION_TYPES = Object.freeze({
  ROCK_BREAK: "rock_break",
  OFFLINE_BATCH: "offline_batch",
  GIFT: "gift",
});

export const LEO_MINERS_CLAIM_TYPES = Object.freeze({
  COINS: "coins",
  DIAMONDS_CHEST: "diamonds_chest",
});

export const LEO_MINERS_ACCRUE_STATUS = Object.freeze({
  APPLIED: "applied",
  REJECTED: "rejected",
  DUPLICATE: "duplicate",
});

export const LEO_MINERS_CLAIM_STATUS = Object.freeze({
  COMPLETED: "completed",
  REJECTED: "rejected",
  DUPLICATE: "duplicate",
});

export const LEO_MINERS_COIN_SOURCE_TYPE = "solo_game";
export const LEO_MINERS_DIAMOND_SOURCE_TYPE = "solo_game";

export const LEO_MINERS_ERROR_CODES = Object.freeze({
  miners_db_not_ready: "miners_db_not_ready",
  miners_disabled: "miners_disabled",
  economy_disabled: "economy_disabled",
  accrue_disabled: "accrue_disabled",
  claim_disabled: "claim_disabled",
  offline_disabled: "offline_disabled",
  gifts_disabled: "gifts_disabled",
  diamond_chest_disabled: "diamond_chest_disabled",
  guest_diamond_blocked: "guest_diamond_blocked",
  daily_coins_cap_reached: "daily_coins_cap_reached",
  claim_cooldown: "claim_cooldown",
  invalid_payload: "invalid_payload",
  invalid_idempotency_key: "invalid_idempotency_key",
  invalid_action_type: "invalid_action_type",
  invalid_claim_type: "invalid_claim_type",
  empty_stage_counts: "empty_stage_counts",
  batch_too_large: "batch_too_large",
  rate_limited: "rate_limited",
  daily_cap_reached: "daily_cap_reached",
  offline_elapsed_invalid: "offline_elapsed_invalid",
  no_pending_points: "no_pending_points",
  no_pending_diamonds: "no_pending_diamonds",
  guest_claim_blocked: "guest_claim_blocked",
  coin_failed: "coin_failed",
  diamond_failed: "diamond_failed",
  duplicate: "duplicate",
});

export const LEO_MINERS_DB_NOT_READY_MESSAGE_HE =
  "טבלאות Leo Miners עדיין לא הופעלו - יש להריץ migration 095_leo_miners_foundation.sql";

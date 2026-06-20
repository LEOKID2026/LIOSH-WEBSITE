import {
  computeArcadeWinnerPot,
  computeBingoRowPrizeAmount,
  requireArcadePayoutRules,
} from "../../rewards/server/economy-config.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 * @param {number} entryCost
 * @param {number} playerCount
 */
export async function resolveArcadeWinnerPot(supabase, gameKey, entryCost, playerCount) {
  const rules = await requireArcadePayoutRules(supabase, gameKey);
  return computeArcadeWinnerPot(entryCost, playerCount, rules);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number} potTotal
 */
export async function resolveBingoRowPrize(supabase, potTotal) {
  const rules = await requireArcadePayoutRules(supabase, "bingo");
  return computeBingoRowPrizeAmount(potTotal, rules);
}

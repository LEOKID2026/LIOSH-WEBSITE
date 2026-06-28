import { isGuestStudent } from "./guest-display.js";
import { loadGuestRuntimeConfig } from "./guest-settings.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ account_kind?: string, accountKind?: string }} student
 */
export async function assertGuestShopAllowed(supabase, student) {
  if (!isGuestStudent(student)) return { ok: true };
  const config = await loadGuestRuntimeConfig(supabase);
  if (!config.economy.shopEnabled) {
    return {
      ok: false,
      status: 403,
      code: "guest_shop_disabled",
      message: "החנות לא זמינה במצב אורח",
    };
  }
  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ account_kind?: string, accountKind?: string }} student
 */
export async function assertGuestCardsAllowed(supabase, student) {
  if (!isGuestStudent(student)) return { ok: true };
  const config = await loadGuestRuntimeConfig(supabase);
  if (!config.economy.cardsEnabled) {
    return {
      ok: false,
      status: 403,
      code: "guest_cards_disabled",
      message: "קלפים לא זמינים במצב אורח",
    };
  }
  return { ok: true };
}

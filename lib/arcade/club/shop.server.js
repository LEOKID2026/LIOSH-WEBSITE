import { assertGuestArcadeFeature } from "../../guest/guest-feature-permissions.server.js";
import { applyArcadeCoinMove } from "../server/arcade-coins.js";

const DEFAULT_COSMETICS = [
  { key: "frame_gold", name_he: "מסגרת זהב", category: "avatar_frame", price_coins: 500, rarity: "common" },
  { key: "board_blue", name_he: "לוח כחול", category: "board_theme", price_coins: 300, rarity: "common" },
  { key: "dice_rainbow", name_he: "קוביות צבעוניות", category: "dice_skin", price_coins: 400, rarity: "rare" },
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function ensureDefaultCosmetics(supabase) {
  const { count } = await supabase
    .from("arcade_cosmetic_items")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if ((count || 0) > 0) return;

  for (const item of DEFAULT_COSMETICS) {
    await supabase.from("arcade_cosmetic_items").insert({ ...item, active: true });
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listShopItems(supabase) {
  await ensureDefaultCosmetics(supabase);
  const { data } = await supabase.from("arcade_cosmetic_items").select("*").eq("active", true);
  return (data || []).map((i) => ({
    id: i.id,
    key: i.key,
    nameHe: i.name_he,
    category: i.category,
    priceCoins: i.price_coins,
    rarity: i.rarity,
    previewUrl: i.preview_url,
  }));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function listOwnedCosmetics(supabase, studentId) {
  const { data } = await supabase
    .from("arcade_player_cosmetics")
    .select("item_id, equipped, purchased_at, arcade_cosmetic_items(*)")
    .eq("student_id", studentId);

  return (data || []).map((row) => ({
    itemId: row.item_id,
    equipped: row.equipped === true,
    purchasedAt: row.purchased_at,
    item: row.arcade_cosmetic_items
      ? {
          id: row.arcade_cosmetic_items.id,
          key: row.arcade_cosmetic_items.key,
          nameHe: row.arcade_cosmetic_items.name_he,
          category: row.arcade_cosmetic_items.category,
        }
      : null,
  }));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} itemId
 */
export async function purchaseCosmetic(supabase, studentId, itemId) {
  const feature = await assertGuestArcadeFeature(supabase, studentId, "shop");
  if (!feature.ok) return feature;

  const { data: item } = await supabase
    .from("arcade_cosmetic_items")
    .select("*")
    .eq("id", itemId)
    .eq("active", true)
    .maybeSingle();

  if (!item?.id) return { ok: false, code: "not_found", message: "פריט לא נמצא" };

  const { data: owned } = await supabase
    .from("arcade_player_cosmetics")
    .select("item_id")
    .eq("student_id", studentId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (owned?.item_id) return { ok: false, code: "already_owned", message: "כבר בבעלותך" };

  const spend = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "spend",
    amount: item.price_coins,
    idempotencyKey: `cosmetic:${itemId}:${studentId}`,
    sourceType: "arcade_shop",
    sourceId: itemId,
    metadata: { itemKey: item.key },
    reason: "cosmetic_purchase",
  });

  if (!spend.ok) {
    return {
      ok: false,
      code: spend.code || "insufficient_funds",
      message: spend.code === "insufficient_funds" ? "אין מספיק מטבעות" : "רכישה נכשלה",
      status: spend.code === "insufficient_funds" ? 402 : 500,
    };
  }

  await supabase.from("arcade_player_cosmetics").insert({
    student_id: studentId,
    item_id: itemId,
    equipped: false,
  });

  return { ok: true, itemId };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} itemId
 */
export async function equipCosmetic(supabase, studentId, itemId) {
  const { data: owned } = await supabase
    .from("arcade_player_cosmetics")
    .select("item_id, arcade_cosmetic_items(category)")
    .eq("student_id", studentId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (!owned?.item_id) return { ok: false, code: "not_owned", message: "פריט לא בבעלותך" };

  const category = owned.arcade_cosmetic_items?.category;
  if (category) {
    const { data: sameCategory } = await supabase
      .from("arcade_player_cosmetics")
      .select("item_id, arcade_cosmetic_items(category)")
      .eq("student_id", studentId)
      .eq("equipped", true);

    for (const row of sameCategory || []) {
      if (row.arcade_cosmetic_items?.category === category) {
        await supabase
          .from("arcade_player_cosmetics")
          .update({ equipped: false })
          .eq("student_id", studentId)
          .eq("item_id", row.item_id);
      }
    }
  }

  await supabase
    .from("arcade_player_cosmetics")
    .update({ equipped: true })
    .eq("student_id", studentId)
    .eq("item_id", itemId);

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getEquippedCosmeticsMap(supabase, studentId) {
  const { data } = await supabase
    .from("arcade_player_cosmetics")
    .select("item_id, equipped, arcade_cosmetic_items(key, category, name_he)")
    .eq("student_id", studentId)
    .eq("equipped", true);

  const map = {};
  for (const row of data || []) {
    const cat = row.arcade_cosmetic_items?.category;
    if (cat) {
      map[cat] = {
        itemId: row.item_id,
        key: row.arcade_cosmetic_items.key,
        nameHe: row.arcade_cosmetic_items.name_he,
      };
    }
  }
  return map;
}

/**
 * Build reward card catalog from Supabase (source of truth) + SQL fallbacks.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv, ROOT } from "./load-env.mjs";
import { buildRewardCardStoragePath } from "../../lib/rewards/server/reward-card-image.server.js";

loadProjectEnv();

const OUT = path.join(ROOT, "data/coloring/reward-cards-source-catalog.json");

function requireSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env (NEXT_PUBLIC_LEARNING_SUPABASE_URL / LEARNING_SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRow(row) {
  const series = /** @type {{ slug?: string } | null} */ (row.reward_card_series);
  const cardKey = String(row.card_key || "");
  const cardType = String(row.card_type || "");
  const storage = buildRewardCardStoragePath({
    card_key: cardKey,
    card_type: cardType,
    reward_card_series: series,
  });
  const localPath = String(row.image_url || "").trim();
  return {
    cardKey,
    displayNameHe: String(row.name_he || ""),
    category: cardType,
    seriesSlug: series?.slug || null,
    imageUrl: localPath || null,
    storagePath: storage.ok ? storage.storagePath : null,
    imageDownloadUrl: String(row.image_download_url || "").trim() || null,
    imageDisplayUrl: String(row.image_display_url || "").trim() || null,
    imageThumbUrl: String(row.image_thumb_url || "").trim() || null,
    isActive: row.is_active !== false,
  };
}

async function main() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("reward_cards")
    .select(
      "card_key,name_he,card_type,image_url,image_download_url,image_display_url,image_thumb_url,is_active,reward_card_series(slug)"
    )
    .order("card_type")
    .order("card_key");

  if (error) throw new Error(error.message);

  const rows = (data || []).map(mapRow);
  const byKey = new Map(rows.map((r) => [r.cardKey, r]));
  const duplicates = rows.length - byKey.size;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: byKey.size,
        cards: [...byKey.values()].sort((a, b) => a.cardKey.localeCompare(b.cardKey)),
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        count: byKey.size,
        duplicates,
        byType: Object.fromEntries(
          [...byKey.values()].reduce((acc, c) => {
            acc.set(c.category, (acc.get(c.category) || 0) + 1);
            return acc;
          }, new Map())
        ),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

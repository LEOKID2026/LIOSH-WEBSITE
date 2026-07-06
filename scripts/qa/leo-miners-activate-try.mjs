/**
 * Full Leo Miners activation for TRY (one-shot).
 *   node --env-file=.env.local scripts/qa/leo-miners-activate-try.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_ID = "00000000-0000-4000-8000-000000000095";

function loadEnvFile(name) {
  const p = join(root, name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const key = s.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = s.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const ENABLE_FLAGS = {
  enabled: true,
  economy_enabled: true,
  accrue_enabled: true,
  claim_enabled: true,
  offline_enabled: true,
  gifts_enabled: true,
  diamond_chest_enabled: true,
  guest_play_enabled: true,
  guest_claim_enabled: true,
  guest_diamond_enabled: true,
};

async function main() {
  const { data: row, error: loadErr } = await supabase
    .from("leo_miners_config")
    .select("settings_json")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (loadErr) throw loadErr;

  const merged = { ...(row?.settings_json || {}), ...ENABLE_FLAGS };
  const now = new Date().toISOString();

  const { error: cfgErr } = await supabase
    .from("leo_miners_config")
    .update({ is_active: true, settings_json: merged, updated_at: now })
    .eq("id", CONFIG_ID);
  if (cfgErr) throw cfgErr;

  const { error: catErr } = await supabase
    .from("site_game_catalog")
    .update({ is_enabled: true, updated_at: now })
    .eq("game_key", "leo-miners");
  if (catErr) throw catErr;

  const { error: soloErr } = await supabase
    .from("reward_economy_solo_game_rules")
    .update({ is_active: true, updated_at: now })
    .eq("game_key", "leo-miners");
  if (soloErr) throw soloErr;

  const { data: cfg, error: v1 } = await supabase
    .from("leo_miners_config")
    .select("is_active, settings_json")
    .eq("id", CONFIG_ID)
    .maybeSingle();
  if (v1) throw v1;
  const s = cfg?.settings_json || {};

  const { data: cat, error: v2 } = await supabase
    .from("site_game_catalog")
    .select("game_key, is_enabled")
    .eq("game_key", "leo-miners")
    .maybeSingle();
  if (v2) throw v2;

  const { data: solo, error: v3 } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key, is_active")
    .eq("game_key", "leo-miners")
    .maybeSingle();
  if (v3) throw v3;

  const verify = {
    config: {
      is_active: cfg?.is_active === true,
      enabled: s.enabled === true,
      economy_enabled: s.economy_enabled === true,
      accrue_enabled: s.accrue_enabled === true,
      claim_enabled: s.claim_enabled === true,
      diamond_chest_enabled: s.diamond_chest_enabled === true,
    },
    catalog: { is_enabled: cat?.is_enabled === true },
    solo_rule: { is_active: solo?.is_active === true },
  };

  const allTrue =
    verify.config.is_active &&
    verify.config.enabled &&
    verify.config.economy_enabled &&
    verify.config.accrue_enabled &&
    verify.config.claim_enabled &&
    verify.config.diamond_chest_enabled &&
    verify.catalog.is_enabled &&
    verify.solo_rule.is_active;

  console.log(JSON.stringify({ ok: allTrue, verify }, null, 2));
  process.exit(allTrue ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

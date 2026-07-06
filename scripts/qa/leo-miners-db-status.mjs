/**
 * Read-only Leo Miners DB status (migration + flags).
 *   node --env-file=.env.local scripts/qa/leo-miners-db-status.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const out = { ok: true, checks: {} };

async function tableExists(tableName) {
  const { data, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")
    .eq("table_name", tableName)
    .maybeSingle();
  if (error) {
    const probe = await supabase.from(tableName).select("*").limit(1);
    return !probe.error;
  }
  return !!data;
}

try {
  const exists = await tableExists("leo_miners_config");
  out.checks.leo_miners_config_exists = exists;

  if (exists) {
    const { data: cfg, error: cfgErr } = await supabase
      .from("leo_miners_config")
      .select("is_active, settings_json")
      .limit(1)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    const s = cfg?.settings_json || {};
    out.checks.config = {
      is_active: cfg?.is_active === true,
      enabled: s.enabled === true,
      economy_enabled: s.economy_enabled === true,
      accrue_enabled: s.accrue_enabled === true,
      claim_enabled: s.claim_enabled === true,
    };
  }

  const { data: cat, error: catErr } = await supabase
    .from("site_game_catalog")
    .select("game_key, is_enabled, hub_route, route")
    .eq("game_key", "leo-miners")
    .maybeSingle();
  if (catErr) throw catErr;
  out.checks.catalog = cat
    ? {
        game_key: cat.game_key,
        is_enabled: cat.is_enabled === true,
        hub_route: cat.hub_route,
        route: cat.route,
      }
    : null;

  const { data: solo, error: soloErr } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key, is_active")
    .eq("game_key", "leo-miners")
    .maybeSingle();
  if (soloErr) throw soloErr;
  out.checks.solo_rule = solo
    ? { game_key: solo.game_key, is_active: solo.is_active === true }
    : null;
} catch (e) {
  out.ok = false;
  out.error = e?.message || String(e);
}

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

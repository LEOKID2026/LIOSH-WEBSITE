/**
 * One-off runner for monthly persistence awards (dry-run or live).
 *
 * Usage:
 *   node --env-file=.env.local scripts/run-monthly-persistence-award.mjs --ym 2026-06 --dry-run
 *   node --env-file=.env.local scripts/run-monthly-persistence-award.mjs --ym 2026-06
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv(file) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env.local");

const args = process.argv.slice(2);
const ymIdx = args.indexOf("--ym");
const yearMonthIsrael = ymIdx >= 0 ? args[ymIdx + 1] : null;
const dryRun = args.includes("--dry-run");

if (!yearMonthIsrael) {
  console.error("Usage: node scripts/run-monthly-persistence-award.mjs --ym YYYY-MM [--dry-run]");
  process.exit(1);
}

process.env.REWARD_ECONOMY_SETTINGS_ENABLED = process.env.REWARD_ECONOMY_SETTINGS_ENABLED || "true";

const { createClient } = await import("@supabase/supabase-js");
const { runMonthlyPersistenceAwardJob, MONTHLY_PERSISTENCE_REASON } = await import(
  pathToFileURL(resolve(ROOT, "lib/learning-supabase/monthly-persistence-reward.server.js")).href
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
  process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log(`\nMonthly persistence award — ym=${yearMonthIsrael} dryRun=${dryRun}\n`);

const result = await runMonthlyPersistenceAwardJob(supabase, {
  yearMonthIsrael,
  dryRun,
});

console.log(JSON.stringify({
  ok: result.ok,
  dryRun: result.dryRun,
  yearMonthIsrael: result.yearMonthIsrael,
  monthBounds: result.monthBounds,
  studentCount: result.studentCount,
  eligibleCount: result.eligibleCount,
  awardedCount: result.awardedCount,
  skippedCount: result.skippedCount,
  eligibleSample: (result.results || [])
    .filter((r) => r.eligible || r.awarded || (r.totalWouldAward ?? 0) > 0)
    .slice(0, 5)
    .map((r) => ({
      studentId: r.studentId,
      activeMinutes: r.activeMinutes,
      tierMinutes: r.tierMinutes,
      alreadyPaid: r.alreadyPaid,
      alreadyAwarded: r.alreadyAwarded,
      deltas: r.deltas,
      totalWouldAward: r.totalWouldAward ?? r.wouldAward ?? r.coinsAwarded,
      eligible: r.eligible,
      awarded: r.awarded,
      skippedReason: r.skippedReason ?? r.reason,
    })),
}, null, 2));

if (!dryRun && result.awardedCount > 0) {
  const { count } = await supabase
    .from("coin_transactions")
    .select("id", { count: "exact", head: true })
    .eq("reason", MONTHLY_PERSISTENCE_REASON)
    .eq("source_id", yearMonthIsrael);
  console.log(`\ncoin_transactions with reason=${MONTHLY_PERSISTENCE_REASON} source_id=${yearMonthIsrael}: ${count}`);
}

process.exit(0);

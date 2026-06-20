/**
 * Economy single source — no hardcoded runtime fallbacks.
 * Run: node --test tests/rewards/economy-no-hardcoded-contract.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const SCAN_ROOTS = [
  "lib",
  "components",
  "lib/learning-client",
  "pages/student",
  "pages/api/student",
  "pages/api/arcade",
  "pages/learning",
  "pages/api/admin/rewards/economy",
];

const ALLOW_LEGACY_ECONOMY = new Set(["lib/rewards/legacy-economy.js"]);

/** @param {string} dir */
function walkJsFiles(dir, out = []) {
  const abs = join(ROOT, dir);
  let entries;
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const name of entries) {
    const rel = join(dir, name).replace(/\\/g, "/");
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkJsFiles(rel, out);
    } else if (/\.(js|jsx|mjs)$/.test(name)) {
      out.push(rel);
    }
  }
  return out;
}

function allRuntimeFiles() {
  const set = new Set();
  for (const root of SCAN_ROOTS) {
    for (const f of walkJsFiles(root)) set.add(f);
  }
  return [...set].sort();
}

describe("economy-no-hardcoded contract", () => {
  test("no runtime import of legacy-economy.js under lib/components/pages", () => {
    const offenders = [];
    for (const rel of allRuntimeFiles()) {
      if (ALLOW_LEGACY_ECONOMY.has(rel)) continue;
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (/from\s+["'][^"']*legacy-economy/.test(src)) {
        offenders.push(rel);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("no hardcoded MONTHLY_PERSISTENCE_TIERS arrays in client/shared UI", () => {
    const offenders = [];
    const tierAssign = /(?:^|[^A-Z])MONTHLY_PERSISTENCE_TIERS\s*=\s*\[/;
    for (const rel of allRuntimeFiles()) {
      if (ALLOW_LEGACY_ECONOMY.has(rel)) continue;
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (tierAssign.test(src)) {
        offenders.push(rel);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("no MONTHLY_MINUTES_TARGET constant in runtime code", () => {
    const offenders = [];
    for (const rel of allRuntimeFiles()) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (/MONTHLY_MINUTES_TARGET/.test(src)) {
        offenders.push(rel);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("no ARCADE_ENTRY_COSTS hardcoded catalog", () => {
    const offenders = [];
    for (const rel of allRuntimeFiles()) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (/ARCADE_ENTRY_COSTS/.test(src)) {
        offenders.push(rel);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("no rewardCoins || 20 fallback in runtime", () => {
    const offenders = [];
    for (const rel of allRuntimeFiles()) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      if (/rewardCoins\s*\|\|\s*20/.test(src)) {
        offenders.push(rel);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("reward-settings has no runtime DEFAULT_CARD_SETTINGS fallback path", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/reward-settings.server.js"), "utf8");
    assert.doesNotMatch(src, /DEFAULT_CARD_SETTINGS/);
    assert.doesNotMatch(src, /defaultsForKey/);
    assert.match(src, /SEED_CARD_SETTINGS/);
    assert.match(src, /EconomyUnavailableError/);
  });

  test("reward-economy.server.js has no legacy getters", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/reward-economy.server.js"), "utf8");
    assert.doesNotMatch(src, /legacy-economy/);
    assert.doesNotMatch(src, /getLegacy/);
    assert.doesNotMatch(src, /LEGACY_/);
  });

  test("award paths use DB economy (no legacy)", () => {
    const checks = [
      { rel: "lib/learning-supabase/learning-coin-award.server.js", must: /economy-config\.server/ },
      { rel: "lib/learning-supabase/monthly-persistence-reward.server.js", must: /getMonthlyPersistenceTiersFromSettings/ },
      { rel: "lib/learning-supabase/mission-progress.server.js", must: /getDailyMissionsForGradeBand/ },
      { rel: "lib/arcade/server/arcade-rooms.js", must: /economy-config\.server/ },
      { rel: "lib/arcade/server/arcade-payout.server.js", must: /economy-config\.server/ },
    ];
    for (const { rel, must } of checks) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.doesNotMatch(src, /legacy-economy/, rel);
      assert.match(src, must, rel);
    }
  });
});

describe("migration seed exists for economy tables", () => {
  test("058 seeds monthly tiers; 063 seeds session coins and entry costs", () => {
    const m058 = readFileSync(join(ROOT, "supabase/migrations/058_card_rewards_system.sql"), "utf8");
    const m063 = readFileSync(join(ROOT, "supabase/migrations/063_economy_single_source.sql"), "utf8");
    assert.match(m058, /reward_economy_monthly_tiers/);
    assert.match(m058, /600/);
    assert.match(m058, /100000/);
    assert.match(m063, /reward_economy_session_coins/);
    assert.match(m063, /reward_economy_entry_cost_options/);
    assert.match(m063, /reward_economy_arcade_payout_rules/);
  });
});

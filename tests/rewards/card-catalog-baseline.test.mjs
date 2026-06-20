/**
 * Leo catalog baseline parity — 059+060 seed counts before admin control changes.
 * Run: node --test tests/rewards/card-catalog-baseline.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const SQL_059 = join(ROOT, "supabase/migrations/059_leo_cards_full_catalog.sql");
const SQL_060 = join(ROOT, "supabase/migrations/060_activate_event_cards_display_only.sql");
const SQL_064 = join(ROOT, "supabase/migrations/064_card_admin_full_control.sql");

/** @param {string} content @param {RegExp} blockRe @param {RegExp} rowRe */
function extractKeys(content, blockRe, rowRe) {
  const block = content.match(blockRe);
  if (!block) throw new Error(`Block not found: ${blockRe}`);
  const keys = new Set();
  let m;
  while ((m = rowRe.exec(block[1]))) {
    keys.add(m[1]);
  }
  return keys;
}

function parse059Catalog() {
  const sql = readFileSync(SQL_059, "utf8");

  const shopKeys = extractKeys(
    sql,
    /-- 4\. Shop[\s\S]*?from \(values([\s\S]*?)\) as v\(series_slug, card_key/m,
    /\('(?:[^']+)',\s*'(leo_[^']+)'/g
  );

  const achievementKeys = extractKeys(
    sql,
    /-- 5\. Achievement[\s\S]*?from \(values([\s\S]*?)\) as v\(series_slug, card_key/m,
    /\('(?:[^']+)',\s*'(achievement_[^']+)'/g
  );

  const eventKeys = extractKeys(
    sql,
    /-- 7\. Event[\s\S]*?from \(values([\s\S]*?)\) as v\(card_key, name_he/m,
    /\('(event_[^']+)'/g
  );

  const ruleRows = extractKeys(
    sql,
    /-- 6\. Achievement rules[\s\S]*?from \(values([\s\S]*?)\) as r\(card_key, rule_type/m,
    /\('(achievement_[^']+)',\s*'([^']+)'/g
  );

  const rulesByKey = new Map();
  const block = sql.match(/-- 6\. Achievement rules[\s\S]*?from \(values([\s\S]*?)\) as r\(card_key, rule_type/m);
  const ruleRe = /\('(achievement_[^']+)',\s*'([^']+)'/g;
  let m;
  while ((m = ruleRe.exec(block[1]))) {
    rulesByKey.set(m[1], m[2]);
  }

  return { shopKeys, achievementKeys, eventKeys, rulesByKey };
}

describe("card-catalog baseline (059+060)", () => {
  test("059 SQL contains expected Leo catalog counts", () => {
    const { shopKeys, achievementKeys, eventKeys, rulesByKey } = parse059Catalog();
    assert.equal(shopKeys.size, 40, "shop cards");
    assert.equal(achievementKeys.size, 24, "achievement cards");
    assert.equal(eventKeys.size, 12, "event cards");
    assert.equal(rulesByKey.size, 24, "achievement rules");
    assert.equal(shopKeys.size + achievementKeys.size + eventKeys.size, 76, "total catalog cards");
  });

  test("each achievement card has exactly one rule in 059 seed", () => {
    const { achievementKeys, rulesByKey } = parse059Catalog();
    for (const key of achievementKeys) {
      assert.ok(rulesByKey.has(key), `missing rule for ${key}`);
    }
    assert.equal(rulesByKey.size, achievementKeys.size);
  });

  test("060 activates all 12 event card keys", () => {
    const sql = readFileSync(SQL_060, "utf8");
    const { eventKeys } = parse059Catalog();
    for (const key of eventKeys) {
      assert.match(sql, new RegExp(`'${key}'`), `060 should reference ${key}`);
    }
  });

  test("064 migration file exists with required columns", () => {
    assert.ok(existsSync(SQL_064), "064 migration must exist");
    const sql = readFileSync(SQL_064, "utf8");
    assert.match(sql, /visibility_mode/);
    assert.match(sql, /params_json/);
    assert.match(sql, /grant_enabled/);
    assert.match(sql, /subject_improvement/);
  });
});

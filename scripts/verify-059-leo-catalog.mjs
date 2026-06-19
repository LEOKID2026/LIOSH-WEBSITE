#!/usr/bin/env node
/**
 * Verify 059_leo_cards_full_catalog.sql matches approved achievement/event rarities.
 * Run: node scripts/verify-059-leo-catalog.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_ACHIEVEMENT_RARITIES,
  APPROVED_EVENT_RARITIES,
} from "./leo-059-approved-rarities.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "059_leo_cards_full_catalog.sql");
const sql = readFileSync(sqlPath, "utf8");

function extractAchievementRarities(content) {
  const block = content.match(
    /-- 5\. Achievement[\s\S]*?from \(values([\s\S]*?)\) as v\(series_slug, card_key/m
  );
  if (!block) throw new Error("Achievement INSERT block not found");
  const rows = {};
  const re =
    /\('(?:general|math|language|subjects)',\s*'(achievement_[^']+)',\s*'(?:[^']|'')*',\s*'(?:[^']|'')*',\s*'\/rewards\/cards\/achievements\/[^']+\.webp',\s*'(regular|special|rare|gold)'/g;
  let m;
  while ((m = re.exec(block[1]))) {
    rows[m[1]] = m[2];
  }
  return rows;
}

function extractEventRarities(content) {
  const block = content.match(
    /-- 7\. Event[\s\S]*?from \(values([\s\S]*?)\) as v\(card_key, name_he/m
  );
  if (!block) throw new Error("Event INSERT block not found");
  const rows = {};
  const re =
    /\('(event_[^']+)',\s*'(?:[^']|'')*',\s*'(?:[^']|'')*',\s*'\/rewards\/cards\/events\/[^']+\.webp',\s*'(regular|special|rare|gold)'/g;
  let m;
  while ((m = re.exec(block[1]))) {
    rows[m[1]] = m[2];
  }
  return rows;
}

function compare(label, approved, found) {
  const mismatches = [];
  const missing = [];
  for (const [key, expected] of Object.entries(approved)) {
    if (!(key in found)) {
      missing.push({ key, expected, found: undefined });
      continue;
    }
    if (found[key] !== expected) {
      mismatches.push({ key, expected, found: found[key] });
    }
  }
  const extra = Object.keys(found).filter((k) => !(k in approved));
  return { label, mismatches, missing, extra };
}

const achFound = extractAchievementRarities(sql);
const evtFound = extractEventRarities(sql);
const achResult = compare("achievement", APPROVED_ACHIEVEMENT_RARITIES, achFound);
const evtResult = compare("event", APPROVED_EVENT_RARITIES, evtFound);

let failed = false;
for (const r of [achResult, evtResult]) {
  console.log(`\n=== ${r.label} (${Object.keys(r.label === "achievement" ? APPROVED_ACHIEVEMENT_RARITIES : APPROVED_EVENT_RARITIES).length} approved) ===`);
  if (r.missing.length) {
    failed = true;
    console.log("MISSING:");
    for (const x of r.missing) console.log(`  ${x.key}: expected ${x.expected}, not in SQL`);
  }
  if (r.mismatches.length) {
    failed = true;
    console.log("MISMATCH:");
    for (const x of r.mismatches) console.log(`  ${x.key}: expected ${x.expected}, found ${x.found}`);
  }
  if (r.extra.length) {
    failed = true;
    console.log("EXTRA (not in approved list):");
    for (const k of r.extra) console.log(`  ${k}: ${r.label === "achievement" ? achFound[k] : evtFound[k]}`);
  }
  if (!r.missing.length && !r.mismatches.length && !r.extra.length) {
    console.log("OK — all rarities match approved list");
  }
}

console.log(`\nParsed from: ${sqlPath}`);
console.log(`Achievement rows parsed: ${Object.keys(achFound).length}`);
console.log(`Event rows parsed: ${Object.keys(evtFound).length}`);

if (failed) {
  console.error("\nVERIFY FAILED");
  process.exit(1);
}
console.log("\nVERIFY PASSED — zero rarity mismatches");

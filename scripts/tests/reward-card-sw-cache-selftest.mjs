/**
 * Static checks for reward card Service Worker cache policy.
 * Run: node scripts/tests/reward-card-sw-cache-selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const swPath = path.join(ROOT, "public/sw.js");
const sw = fs.readFileSync(swPath, "utf8");

function ok(label) {
  console.log(`  ok  ${label}`);
}

assert.match(sw, /leo-k-v6/, "cache version bumped to v6");
ok("cache version is v6 (drops old v5 buckets on activate)");

assert.match(sw, /REWARD_CARD_PATH_PREFIX\s*=\s*['"]\/rewards\/cards\//, "reward card path prefix");
ok("reward card path prefix defined");

assert.match(sw, /function networkFirstRewardCardImage/, "network first handler");
ok("networkFirstRewardCardImage helper exists");

assert.match(sw, /function purgeRewardCardImageEntries/, "purge helper");
ok("purgeRewardCardImageEntries helper exists");

assert.match(sw, /purgeRewardCardImageEntries\(\)/, "activate calls purge");
ok("activate event purges stale reward card cache entries");

const fetchBlockStart = sw.indexOf("addEventListener('fetch'");
const fetchBlockEnd = sw.indexOf("// Background sync", fetchBlockStart);
const fetchBlock = sw.slice(fetchBlockStart, fetchBlockEnd);
const rewardInFetch = fetchBlock.indexOf("isRewardCardImageRequest(url, request)");
const cacheFirstInFetch = fetchBlock.indexOf("// Handle static assets (images, sounds, CSS) - Cache First");
assert.ok(rewardInFetch > 0 && rewardInFetch < cacheFirstInFetch, "reward handler before cache-first block");
ok("reward card branch runs before generic Cache First images");

assert.match(
  fetchBlock.slice(rewardInFetch, cacheFirstInFetch),
  /networkFirstRewardCardImage\(request\)/,
  "fetch handler delegates reward cards to network first"
);
ok("reward card fetch branch uses networkFirstRewardCardImage");

console.log("\nreward-card-sw-cache-selftest: all checks passed");

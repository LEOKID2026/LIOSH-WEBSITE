/**
 * Sellback coin calculation — floor to avoid coin inflation.
 * Run: node scripts/tests/card-sellback-selftest.mjs
 */
import assert from "node:assert/strict";
import { computeCardSellbackCoins } from "../../lib/rewards/server/reward-settings.server.js";

assert.equal(computeCardSellbackCoins(100, 25), 25);
assert.equal(computeCardSellbackCoins(30, 25), 7);
assert.equal(computeCardSellbackCoins(0, 25), 0);
assert.equal(computeCardSellbackCoins(100, 0), 0);
console.log("card-sellback-selftest: ok");

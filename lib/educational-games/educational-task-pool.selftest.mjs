/**
 * Task pool variety — bakery, gifts, number-path, supermarket, recycling.
 * Lab (ניסויים) is excluded by design.
 * Run: node lib/educational-games/educational-task-pool.selftest.mjs
 */
import { PRODUCTION_MIN_POOL } from "./educational-task-picker.js";
import { generateBakeryPool, bakeryTaskKey, buildBakerySessionRun } from "../../components/educational-games/leo-bakery/leo-bakery-data.js";
import { generateGiftsPool, giftsTaskKey, buildGiftsSessionRun } from "../../components/educational-games/leo-gifts/leo-gifts-data.js";
import {
  generatePathPool,
  pathTaskKey,
  buildOrderedSessionRun,
  TASKS_PER_SESSION,
} from "../../components/educational-games/leo-number-path/leo-number-path-data.js";
import {
  generateCustomers,
  supermarketCustomerKey,
  CUSTOMERS_PER_LEVEL,
} from "../../components/educational-games/leo-supermarket/leo-supermarket-data.js";
import {
  buildRecyclingSessionPlan,
  DIFFICULTIES as RECYCLING_DIFF,
  ITEMS_PER_SESSION,
} from "../../components/educational-games/recycling-factory/recycling-factory-data.js";
import { TASKS_PER_SESSION as SESSION_SIZE } from "./educational-session-standard.js";

let failed = 0;

function fail(msg) {
  failed += 1;
  console.error("FAIL:", msg);
}

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try {
    fn();
  } catch (err) {
    fail(`${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const DIFFS = ["easy", "medium", "hard"];

for (const difficulty of DIFFS) {
  test(`bakery ${difficulty} pool`, () => {
    const pool = generateBakeryPool(difficulty, { salt: 0 });
    const keys = pool.map(bakeryTaskKey);
    const unique = new Set(keys).size;
    // Easy build-only pool is smaller by design; session still fills to 20.
    const minPool = difficulty === "easy" ? 40 : PRODUCTION_MIN_POOL + 10;
    if (pool.length < minPool) {
      fail(`bakery ${difficulty} pool size ${pool.length}`);
    }
    if (unique < pool.length) {
      fail(`bakery ${difficulty} duplicate keys ${pool.length - unique}`);
    }
    const run = buildBakerySessionRun(difficulty);
    if (run.length !== SESSION_SIZE) fail(`bakery ${difficulty} session ${run.length}`);
  });

  test(`gifts ${difficulty} pool`, () => {
    const pool = generateGiftsPool(difficulty, { salt: 0 });
    const keys = pool.map(giftsTaskKey);
    const unique = new Set(keys).size;
    if (pool.length < PRODUCTION_MIN_POOL + 10) {
      fail(`gifts ${difficulty} pool size ${pool.length}`);
    }
    if (unique < pool.length) {
      fail(`gifts ${difficulty} duplicate keys ${pool.length - unique}`);
    }
    const run = buildGiftsSessionRun(difficulty);
    if (run.length !== SESSION_SIZE) fail(`gifts ${difficulty} session ${run.length}`);
  });

  test(`number-path ${difficulty} pool`, () => {
    const pool = generatePathPool(difficulty, { salt: 0 });
    const unique = new Set(pool.map(pathTaskKey)).size;
    if (pool.length < PRODUCTION_MIN_POOL + 10) {
      fail(`number-path ${difficulty} pool size ${pool.length}`);
    }
    if (unique < pool.length) {
      fail(`number-path ${difficulty} duplicate keys`);
    }
    const run = buildOrderedSessionRun(difficulty);
    if (run.length !== TASKS_PER_SESSION) {
      fail(`number-path ${difficulty} session length ${run.length}`);
    }
    if (new Set(run.map(pathTaskKey)).size !== run.length) {
      fail(`number-path ${difficulty} session has dupes`);
    }
  });

  test(`supermarket ${difficulty} session`, () => {
    const customers = generateCustomers(difficulty);
    if (customers.length !== CUSTOMERS_PER_LEVEL) {
      fail(`supermarket ${difficulty} count ${customers.length}`);
    }
    const keys = customers.map(supermarketCustomerKey);
    if (new Set(keys).size !== keys.length) {
      fail(`supermarket ${difficulty} duplicate customers in one session`);
    }
  });

  test(`recycling ${difficulty} session plan`, () => {
    const cfg = RECYCLING_DIFF[difficulty];
    const plan = buildRecyclingSessionPlan(cfg.bins);
    if (plan.length !== ITEMS_PER_SESSION) {
      fail(`recycling ${difficulty} plan length ${plan.length}`);
    }
    if (cfg.itemsTarget !== 20) {
      fail(`recycling ${difficulty} itemsTarget ${cfg.itemsTarget}`);
    }
  });
}

if (failed > 0) {
  console.error(`educational-task-pool selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("educational-task-pool selftest: OK (bakery, gifts, number-path, supermarket, recycling — lab excluded)");

/**
 * Task pool variety — bakery, gifts, number-path, supermarket, recycling.
 * Lab (ניסויים) is excluded by design.
 * Run: node lib/educational-games/educational-task-pool.selftest.mjs
 */
import { PRODUCTION_MIN_POOL, pickNextTask } from "./educational-task-picker.js";
import { generateBakeryPool, bakeryTaskKey } from "../../components/educational-games/leo-bakery/leo-bakery-data.js";
import { generateGiftsPool, giftsTaskKey } from "../../components/educational-games/leo-gifts/leo-gifts-data.js";
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
  buildRecyclingItemQueue,
  pickNextRecyclingItem,
  DIFFICULTIES as RECYCLING_DIFF,
} from "../../components/educational-games/recycling-factory/recycling-factory-data.js";

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
    const pool = generateBakeryPool(difficulty, { salt: 0, stage: 1 });
    const keys = pool.map(bakeryTaskKey);
    const unique = new Set(keys).size;
    if (pool.length < PRODUCTION_MIN_POOL + 10) {
      fail(`bakery ${difficulty} pool size ${pool.length}`);
    }
    if (unique < pool.length) {
      fail(`bakery ${difficulty} duplicate keys ${pool.length - unique}`);
    }
    if (difficulty === "easy" && unique < 100) {
      fail(`bakery easy unique keys ${unique} < 100`);
    }
    const used = new Set();
    let last = null;
    for (let i = 0; i < 50; i += 1) {
      const t = pickNextTask(generateBakeryPool, difficulty, { stage: 1 }, used, last, bakeryTaskKey);
      if (!t) break;
      const k = bakeryTaskKey(t);
      if (used.has(k)) fail(`bakery ${difficulty} pick repeat ${k}`);
      used.add(k);
      last = k;
    }
  });

  test(`gifts ${difficulty} pool`, () => {
    const pool = generateGiftsPool(difficulty, { salt: 0, stage: 1 });
    const keys = pool.map(giftsTaskKey);
    const unique = new Set(keys).size;
    if (pool.length < PRODUCTION_MIN_POOL + 10) {
      fail(`gifts ${difficulty} pool size ${pool.length}`);
    }
    if (unique < pool.length) {
      fail(`gifts ${difficulty} duplicate keys ${pool.length - unique}`);
    }
    if (difficulty === "easy" && unique < 100) {
      fail(`gifts easy unique keys ${unique} < 100`);
    }
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

  test(`recycling ${difficulty} session queue`, () => {
    const cfg = RECYCLING_DIFF[difficulty];
    const queue = buildRecyclingItemQueue(cfg.bins);
    const used = new Set();
    const picked = [];
    for (let i = 0; i < cfg.itemsTarget; i += 1) {
      let item = pickNextRecyclingItem(queue, used);
      if (!item) {
        used.clear();
        item = pickNextRecyclingItem(queue, used);
      }
      if (!item) {
        fail(`recycling ${difficulty} ran out of items at ${i}`);
        break;
      }
      picked.push(item.id);
    }
    const catalogSize = queue.length;
    const uniqueInFirstPass = new Set(picked.slice(0, catalogSize)).size;
    if (uniqueInFirstPass < Math.min(catalogSize, cfg.itemsTarget)) {
      fail(`recycling ${difficulty} first ${catalogSize} picks not unique enough`);
    }
  });
}

if (failed > 0) {
  console.error(`educational-task-pool selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("educational-task-pool selftest: OK (bakery, gifts, number-path, supermarket, recycling — lab excluded)");

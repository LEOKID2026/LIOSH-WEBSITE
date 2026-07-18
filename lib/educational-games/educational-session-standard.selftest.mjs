/**
 * Session standard + educational games progression selftests.
 * Run: node lib/educational-games/educational-session-standard.selftest.mjs
 */
import {
  MAX_MISTAKES_BY_DIFFICULTY,
  TASKS_PER_SESSION,
  sessionBandForIndex,
} from "./educational-session-standard.js";
import {
  pickCustomersForRun,
  getCustomerTimeLimit,
} from "../../components/educational-games/leo-pizzeria/leo-pizzeria-data.js";
import {
  buildOrderedSessionRun,
  findDistractorFalseNegatives,
  sessionRunIsAscending,
  TASKS_PER_SESSION as PATH_TASKS,
} from "../../components/educational-games/leo-number-path/leo-number-path-data.js";
import {
  buildGiftsSessionRun,
  giftsTaskDifficultyScore,
} from "../../components/educational-games/leo-gifts/leo-gifts-data.js";
import {
  buildBakerySessionRun,
  bakeryTaskDifficultyScore,
} from "../../components/educational-games/leo-bakery/leo-bakery-data.js";
import {
  generateCustomers,
  CUSTOMERS_PER_LEVEL,
} from "../../components/educational-games/leo-supermarket/leo-supermarket-data.js";
import {
  buildRecyclingSessionPlan,
  allowDualItemsAt,
  DIFFICULTIES as RECYCLING_DIFF,
  ITEMS_PER_SESSION,
} from "../../components/educational-games/recycling-factory/recycling-factory-data.js";
import { pickExperimentsForRun } from "../../components/educational-games/leo-lab/leo-lab-data.js";

let failed = 0;

function fail(msg) {
  failed += 1;
  console.error("FAIL:", msg);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

function test(name, fn) {
  try {
    fn();
  } catch (err) {
    fail(`${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const DIFFS = ["easy", "medium", "hard"];

assert(TASKS_PER_SESSION === 20, "TASKS_PER_SESSION must be 20");
assert(MAX_MISTAKES_BY_DIFFICULTY.easy === 5, "easy max mistakes");
assert(MAX_MISTAKES_BY_DIFFICULTY.medium === 4, "medium max mistakes");
assert(MAX_MISTAKES_BY_DIFFICULTY.hard === 3, "hard max mistakes");
assert(sessionBandForIndex(0) === 0 && sessionBandForIndex(4) === 0, "band opening");
assert(sessionBandForIndex(5) === 1 && sessionBandForIndex(14) === 1, "band mid");
assert(sessionBandForIndex(15) === 2 && sessionBandForIndex(19) === 2, "band final");

for (const diff of DIFFS) {
  test(`pizzeria ${diff}`, () => {
    const run = pickCustomersForRun(diff);
    assert(run.length === 20, `${diff} customers length`);
    assert(run.every((t) => t.skillId && t.variant), `${diff} schema fields`);
    assert(getCustomerTimeLimit(diff, 0) >= getCustomerTimeLimit(diff, 15), `${diff} timer bands`);
  });

  test(`number-path ${diff}`, () => {
    assert(PATH_TASKS === 20, "path tasks constant");
    const run = buildOrderedSessionRun(diff);
    assert(run.length === 20, `${diff} path run length`);
    assert(sessionRunIsAscending(run), `${diff} path ascending`);
    assert(findDistractorFalseNegatives(run).length === 0, `${diff} path distractors`);
    if (diff === "easy") {
      for (const task of run) {
        if (task.rule === "multiples") {
          assert([2, 5, 10].includes(task.multiple), "easy multiples 2/5/10");
        }
        if (task.rule === "skip") {
          assert([2, 5, 10].includes(task.step), "easy skip 2/5/10");
        }
      }
    }
  });

  test(`gifts ${diff}`, () => {
    const run = buildGiftsSessionRun(diff);
    assert(run.length === 20, `${diff} gifts run`);
    assert(run.every((t) => t.skillId && t.mode), `${diff} gifts schema`);
    for (const t of run) {
      const divisor = t.operands.divisor;
      assert(t.total % divisor === t.expectedAnswer.remainder, `${diff} rem math`);
      assert(t.expectedAnswer.remainder < divisor, `${diff} rem < divisor`);
    }
    if (diff === "easy") {
      assert(run.some((t) => t.mode === "share_equally"), "easy has share");
      assert(run.some((t) => t.mode === "make_groups"), "easy has groups");
      const remCount = run.filter((t) => t.expectedAnswer.remainder > 0).length;
      assert(remCount <= 4, "easy mostly no remainder");
    }
  });

  test(`bakery ${diff}`, () => {
    const run = buildBakerySessionRun(diff);
    assert(run.length === 20, `${diff} bakery run`);
    assert(run.every((t) => t.skillId && t.mode), `${diff} bakery schema`);
    if (diff === "easy") {
      assert(run.every((t) => t.mode === "build" || t.mode === "findTotal"), "easy modes");
    }
    if (diff === "medium" || diff === "hard") {
      assert(run.some((t) => t.mode === "findTotal" || t.mode === "findTrays" || t.mode === "findPerTray"), `${diff} has inverse/product`);
    }
    if (diff === "hard") {
      assert(run.some((t) => t.mode === "sameTotal"), "hard has sameTotal");
    }
  });

  test(`supermarket ${diff}`, () => {
    const customers = generateCustomers(diff);
    assert(customers.length === CUSTOMERS_PER_LEVEL, `${diff} supermarket count`);
    assert(CUSTOMERS_PER_LEVEL === 20, "supermarket 20");
  });

  test(`recycling ${diff}`, () => {
    const cfg = RECYCLING_DIFF[diff];
    assert(cfg.itemsTarget === 20, `${diff} recycling target`);
    const plan = buildRecyclingSessionPlan(cfg.bins);
    assert(plan.length === ITEMS_PER_SESSION, `${diff} recycling plan`);
    assert(!allowDualItemsAt(0, diff), `${diff} no dual at start`);
    if (diff === "hard") assert(allowDualItemsAt(15, diff), "dual allowed late hard");
  });

  test(`lab ${diff}`, () => {
    const run = pickExperimentsForRun(diff);
    assert(run.length === 20, `${diff} lab experiments`);
  });
}

if (failed > 0) {
  console.error(`educational-session-standard selftest: ${failed} failure(s)`);
  process.exit(1);
}

console.log("educational-session-standard selftest: OK (7 games, 20-task standard)");

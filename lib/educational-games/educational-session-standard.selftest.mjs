/**
 * Session standard + 7-game progression selftests.
 * Run: node lib/educational-games/educational-session-standard.selftest.mjs
 */
import {
  MAX_MISTAKES_BY_DIFFICULTY,
  TASKS_PER_SESSION,
  sessionBandForIndex,
} from "./educational-session-standard.js";
import {
  pickCustomersForRun,
  CUSTOMERS_BY_DIFFICULTY,
  getCustomerTimeLimit,
} from "../../components/educational-games/leo-pizzeria/leo-pizzeria-data.js";
import {
  buildOrderedSessionRun,
  findDistractorFalseNegatives,
  sessionRunIsAscending,
  TASKS_PER_SESSION as PATH_TASKS,
  taskDifficultyScore,
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
    assert(run[0].id === CUSTOMERS_BY_DIFFICULTY[diff][0].id, `${diff} ordered start`);
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
        if (task.rule === "multiples") assert(task.multiple === 2, "easy multiples only 2");
        if (task.rule === "skip") assert(task.step === 2 || task.step === 10, "easy skip simple");
      }
    }
  });

  test(`gifts ${diff}`, () => {
    const run = buildGiftsSessionRun(diff);
    assert(run.length === 20, `${diff} gifts run`);
    const openAvg = run.slice(0, 5).reduce((s, t) => s + giftsTaskDifficultyScore(t), 0) / 5;
    const finalAvg = run.slice(15).reduce((s, t) => s + giftsTaskDifficultyScore(t), 0) / 5;
    assert(openAvg <= finalAvg + 0.01, `${diff} gifts progression`);
    if (diff === "easy") {
      for (const t of run) assert(t.total % t.children === 0, "easy no remainder");
    }
    if (diff === "hard") {
      assert(run[0].children <= 6, "hard does not start with 12 children");
      assert(run[0].total <= 48, "hard opening total bounded");
    }
  });

  test(`bakery ${diff}`, () => {
    const run = buildBakerySessionRun(diff);
    assert(run.length === 20, `${diff} bakery run`);
    if (diff === "easy") assert(run.every((t) => t.mode === "build"), "easy build only");
    if (diff === "medium") assert(run.slice(0, 5).every((t) => t.mode === "build"), "medium opening build");
    if (diff === "hard") {
      assert(!run.slice(0, 15).some((t) => t.mode === "findTrays" || t.mode === "findPerTray"), "hard inverse late");
      assert(run[0].mode === "build", "hard starts build");
    }
    const openAvg = run.slice(0, 5).reduce((s, t) => s + bakeryTaskDifficultyScore(t), 0) / 5;
    const finalAvg = run.slice(15).reduce((s, t) => s + bakeryTaskDifficultyScore(t), 0) / 5;
    assert(openAvg <= finalAvg + 0.01, `${diff} bakery progression`);
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

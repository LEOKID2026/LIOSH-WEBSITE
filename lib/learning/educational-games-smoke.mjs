#!/usr/bin/env node
/**
 * Logical smoke: 5 sampled tasks per difficulty per game.
 * Run: node lib/learning/educational-games-smoke.mjs
 */
import { ITEMS, DIFFICULTIES, pickRandomItem } from "../../components/educational-games/recycling-factory/recycling-factory-data.js";
import {
  generateCustomers,
  DIFFICULTIES as SD,
  isChangeAmountCorrect,
} from "../../components/educational-games/leo-supermarket/leo-supermarket-data.js";
import {
  EXPERIMENTS_BY_DIFFICULTY,
  validateExperimentSelection,
} from "../../components/educational-games/leo-lab/leo-lab-data.js";
import {
  generateGiftsPool,
  validateGiftsDivision,
} from "../../components/educational-games/leo-gifts/leo-gifts-data.js";
import {
  generateBakeryPool,
  bakeryExpected,
  validateBakery,
} from "../../components/educational-games/leo-bakery/leo-bakery-data.js";
import {
  generatePathPool,
  findDistractorFalseNegatives,
  matchingNumbersOnBoard,
  buildOrderedSessionRun,
  sessionRunIsAscending,
  validatePath,
} from "../../components/educational-games/leo-number-path/leo-number-path-data.js";
import {
  pickCustomersForRun,
  CUSTOMERS_PER_LEVEL,
  getCustomerTimeLimit,
} from "../../components/educational-games/leo-pizzeria/leo-pizzeria-data.js";

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

for (const diff of ["easy", "medium", "hard"]) {
  const bins = DIFFICULTIES[diff].bins;
  for (let i = 0; i < 5; i += 1) {
    const item = pickRandomItem(bins);
    if (!bins.includes(item.bin)) fail(`recycling ${diff} item ${item.id} bin ${item.bin}`);
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const customers = generateCustomers(diff).slice(0, 5);
  for (const c of customers) {
    if (c.paid < c.total) fail(`supermarket ${diff} paid < total`);
    if (!isChangeAmountCorrect(c, [c.correctChange])) fail(`supermarket ${diff} change ${c.correctChange}`);
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const exps = EXPERIMENTS_BY_DIFFICULTY[diff].slice(0, 5);
  for (const exp of exps) {
    const sel = exp.exactMatch ? [...exp.validItems] : exp.validItems.slice(0, exp.pickCount);
    const r = validateExperimentSelection(sel, exp);
    if (!r.ok) fail(`lab ${exp.id} valid selection rejected: ${r.reason}`);
    if (!exp.exactMatch && exp.validItems.length > exp.pickCount) {
      const alt = exp.validItems.slice(0, exp.pickCount);
      const r2 = validateExperimentSelection(alt, exp);
      if (!r2.ok) fail(`lab ${exp.id} subset rejected`);
    }
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const pool = generateGiftsPool(diff, { stage: 1, salt: 0 }).slice(0, 5);
  for (const t of pool) {
    const per = Math.floor(t.total / t.children);
    const rem = t.total % t.children;
    if (!validateGiftsDivision(t, per, rem).ok) fail(`gifts ${diff} ${t.total}/${t.children}`);
    if (diff === "easy" && rem > 0) fail(`gifts easy has remainder`);
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const pool = generateBakeryPool(diff, { stage: 1, salt: 0 }).slice(0, 5);
  for (const t of pool) {
    const e = bakeryExpected(t);
    if (!validateBakery(t, e).ok) fail(`bakery ${diff} ${t.mode}`);
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const run = buildOrderedSessionRun(diff);
  if (run.length < 20) fail(`number-path ${diff} session length ${run.length}`);
  if (!sessionRunIsAscending(run)) fail(`number-path ${diff} session not ascending`);
  const issues = findDistractorFalseNegatives(run);
  if (issues.length) fail(`number-path ${diff} distractors: ${issues[0].number}`);
  for (const task of run) {
    const expected = matchingNumbersOnBoard(task);
    if (task.rule === "even" || task.rule === "odd" || task.rule === "multiples") {
      if (!validatePath(task, expected)) fail(`number-path ${task.id} self-answer rejected`);
    }
  }
}

for (const diff of ["easy", "medium", "hard"]) {
  const run = pickCustomersForRun(diff);
  if (run.length !== CUSTOMERS_PER_LEVEL) {
    fail(`pizzeria ${diff} session length ${run.length} (expected ${CUSTOMERS_PER_LEVEL})`);
  }
  if (getCustomerTimeLimit(diff, 0) < getCustomerTimeLimit(diff, 15)) {
    fail(`pizzeria ${diff} opening timer should be >= final-band timer`);
  }
  for (const customer of run.slice(0, 5)) {
    if (!customer.timeLimitSec || customer.sliceCount < 1) {
      fail(`pizzeria ${diff} customer ${customer.id} invalid`);
    }
  }
}

if (failures > 0) {
  console.error(`educational-games-smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("educational-games-smoke: OK — 7 games × 3 levels");

#!/usr/bin/env node
/**
 * Leo Lab per-experiment shelf integrity selftest.
 * Run: node lib/learning/leo-lab-shelf.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  EXPERIMENTS_BY_DIFFICULTY,
  LAB_ITEMS,
  shelfCountForDifficulty,
} from "../../components/educational-games/leo-lab/leo-lab-data.js";
import { COLOR_SHELF } from "../../components/educational-games/leo-lab/leo-lab-shelf-presets.js";

const PAINT_PREFIX = "paint_";
const ELECTRIC_IDS = new Set(["battery", "bulb", "wire", "switch"]);

/**
 * @param {string} id
 */
function isPaintId(id) {
  return id.startsWith(PAINT_PREFIX);
}

/**
 * @param {{ title?: string, prompt?: string, shelfItems?: string[], validItems?: string[], difficulty?: string }} exp
 */
function isColorExperiment(exp) {
  return exp.title === "ניסוי צבעים" || exp.shelfItems?.every((id) => isPaintId(id));
}

/**
 * @param {{ title?: string }} exp
 */
function isMagnetExperiment(exp) {
  return exp.title === "ניסוי משיכה";
}

/**
 * @param {{ title?: string }} exp
 */
function isElectricExperiment(exp) {
  return exp.title === "ניסוי חשמל" || exp.title === "ניסוי הולכה";
}

/**
 * @param {{ title?: string }} exp
 */
function isPlantExperiment(exp) {
  return (
    exp.title === "ניסוי צמח" ||
    exp.title === "ניסוי גינה" ||
    exp.title === "ניסוי אדמה" ||
    exp.title === "ניסוי טבע"
  );
}

/** @type {string[]} */
const issues = [];

for (const [difficulty, experiments] of Object.entries(EXPERIMENTS_BY_DIFFICULTY)) {
  const expectedCount = shelfCountForDifficulty(difficulty);

  for (const exp of experiments) {
    assert.ok(Array.isArray(exp.shelfItems), `${exp.id}: missing shelfItems`);
    assert.equal(
      exp.shelfItems.length,
      expectedCount,
      `${exp.id}: expected ${expectedCount} shelf items, got ${exp.shelfItems.length}`,
    );

    for (const itemId of exp.shelfItems) {
      assert.ok(LAB_ITEMS[itemId], `${exp.id}: unknown shelf item ${itemId}`);
    }

    const shelfSet = new Set(exp.shelfItems);
    for (const answerId of exp.validItems) {
      if (!shelfSet.has(answerId)) {
        issues.push(`${exp.id}: valid answer "${answerId}" missing from shelf`);
      }
    }

    if (isColorExperiment(exp)) {
      if (!exp.shelfItems.every((id) => isPaintId(id))) {
        issues.push(`${exp.id}: color experiment has non-color shelf items`);
      }
    }

    if (isMagnetExperiment(exp)) {
      if (exp.shelfItems.some((id) => isPaintId(id))) {
        issues.push(`${exp.id}: magnet experiment has colors on shelf`);
      }
    }

    if (isElectricExperiment(exp)) {
      if (exp.shelfItems.some((id) => isPaintId(id))) {
        issues.push(`${exp.id}: electric experiment has colors on shelf`);
      }
      if (exp.shelfItems.some((id) => id === "plant" || id === "sun")) {
        issues.push(`${exp.id}: electric experiment has plant/sun on shelf`);
      }
    }

    if (isPlantExperiment(exp)) {
      if (exp.shelfItems.some((id) => isPaintId(id))) {
        issues.push(`${exp.id}: plant experiment has colors on shelf`);
      }
      if (exp.shelfItems.some((id) => ELECTRIC_IDS.has(id))) {
        issues.push(`${exp.id}: plant experiment has electric items on shelf`);
      }
    }
  }
}

assert.equal(issues.length, 0, `shelf audit failed:\n${issues.join("\n")}`);

const colorExample = EXPERIMENTS_BY_DIFFICULTY.easy.find((e) => e.id === "easy-color-orange-clean");
const magnetExample = EXPERIMENTS_BY_DIFFICULTY.easy.find((e) => e.id === "easy-magnet-attracts-clean");
const plantExample = EXPERIMENTS_BY_DIFFICULTY.easy.find((e) => e.id === "easy-plant-grow-clean");
const electricExample = EXPERIMENTS_BY_DIFFICULTY.medium.find(
  (e) => e.id === "medium-circuit-basic-clean",
);

assert.deepEqual(colorExample?.shelfItems, COLOR_SHELF);

console.log("PASS: leo-lab-shelf.selftest.mjs");
console.log(`  per-level shelf sizes: easy=8, medium=10, hard=12`);
console.log(
  `  color shelf example (${colorExample?.id}): ${colorExample?.shelfItems.map((id) => LAB_ITEMS[id].name).join(", ")}`,
);
console.log(
  `  magnet shelf example (${magnetExample?.id}): ${magnetExample?.shelfItems.map((id) => LAB_ITEMS[id].name).join(", ")}`,
);
console.log(
  `  plant shelf example (${plantExample?.id}): ${plantExample?.shelfItems.map((id) => LAB_ITEMS[id].name).join(", ")}`,
);
console.log(
  `  electric shelf example (${electricExample?.id}): ${electricExample?.shelfItems.map((id) => LAB_ITEMS[id].name).join(", ")}`,
);

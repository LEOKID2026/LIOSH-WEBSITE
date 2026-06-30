#!/usr/bin/env node
/**
 * Leo Lab validItems integrity selftest.
 * Run: node lib/learning/leo-lab-validitems.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  EXPERIMENTS_BY_DIFFICULTY,
} from "../../components/educational-games/leo-lab/leo-lab-data.js";

/** @typedef {{ id: string, difficulty: string, pickCount: number, validItems: string[], shelfItems?: string[], exactMatch?: boolean, title?: string }} LabExperiment */

/**
 * Heuristic rules for known-bad item pairings in validItems pools.
 * Each rule applies only when optional prompt/title keywords match (when provided).
 * @type {{ id: string, items: string[], reason: string, titleIncludes?: string[], promptIncludes?: string[], skipExactMatch?: boolean }[]}
 */
export const KNOWN_BAD_PAIRINGS = [
  {
    id: "magnet-in-metals-only-pool",
    items: ["magnet", "nail", "metal_spoon"],
    reason: "magnet in pick-N-metals pool (magnet is not a pulled metal)",
    promptIncludes: ["מתכת"],
    skipExactMatch: true,
  },
  {
    id: "wood-as-transparent",
    items: ["wood", "water"],
    reason: "wood listed as transparent to light",
    promptIncludes: ["שקוף", "לאור לעבור"],
    skipExactMatch: true,
  },
  {
    id: "plant-as-transparent",
    items: ["plant", "water"],
    reason: "plant listed as transparent to light",
    promptIncludes: ["שקוף", "לאור לעבור"],
    skipExactMatch: true,
  },
  {
    id: "switch-circuit-no-bulb",
    items: ["switch", "battery"],
    reason: "switch+battery without bulb in circuit task",
    promptIncludes: ["מעגל"],
    skipExactMatch: false,
  },
  {
    id: "wire-bulb-no-battery-exact",
    items: ["wire", "bulb"],
    reason: "wire+bulb only pair without power source",
    skipExactMatch: false,
  },
  {
    id: "can-in-float-only-pool",
    items: ["can", "water"],
    reason: "can (sinks) in float-only pool",
    titleIncludes: ["צף"],
    skipExactMatch: true,
  },
];

/**
 * @param {LabExperiment} exp
 * @param {{ id: string, items: string[], reason: string, titleIncludes?: string[], promptIncludes?: string[], skipExactMatch?: boolean }} rule
 * @returns {boolean}
 */
function ruleMatchesExperiment(exp, rule) {
  if (rule.skipExactMatch && exp.exactMatch) return false;

  const title = exp.title ?? "";
  const prompt = exp.prompt ?? "";

  if (rule.titleIncludes?.length) {
    if (!rule.titleIncludes.some((kw) => title.includes(kw))) return false;
  }
  if (rule.promptIncludes?.length) {
    if (!rule.promptIncludes.some((kw) => prompt.includes(kw))) return false;
  }

  const validSet = new Set(exp.validItems);
  if (!rule.items.every((item) => validSet.has(item))) return false;

  if (rule.id === "wire-bulb-no-battery-exact") {
    return (
      exp.exactMatch &&
      exp.validItems.length === 2 &&
      exp.validItems.includes("wire") &&
      exp.validItems.includes("bulb") &&
      !exp.validItems.includes("battery")
    );
  }

  if (rule.id === "switch-circuit-no-bulb") {
    return !validSet.has("bulb");
  }

  if (rule.id === "magnet-in-metals-only-pool") {
    return !validSet.has("plant") && !validSet.has("stone");
  }

  return true;
}

/**
 * @param {LabExperiment} exp
 * @returns {string[]}
 */
function knownBadPairingViolations(exp) {
  /** @type {string[]} */
  const problems = [];
  for (const rule of KNOWN_BAD_PAIRINGS) {
    if (ruleMatchesExperiment(exp, rule)) {
      problems.push(`known-bad pairing (${rule.id}): ${rule.reason}`);
    }
  }
  return problems;
}

/**
 * @param {LabExperiment} exp
 * @param {string[]} shelf
 * @returns {string[]}
 */
function shelfViolations(exp, shelf) {
  const shelfSet = new Set(shelf);
  return exp.validItems.filter((id) => !shelfSet.has(id));
}

/**
 * @param {LabExperiment} exp
 * @returns {string[]}
 */
function exactMatchViolations(exp) {
  if (!exp.exactMatch) return [];
  if (exp.validItems.length !== exp.pickCount) {
    return [
      `exactMatch requires validItems.length (${exp.validItems.length}) === pickCount (${exp.pickCount})`,
    ];
  }
  return [];
}

/**
 * Audit experiments for shelf, exactMatch, and known-bad pairing heuristics.
 * @param {Record<string, LabExperiment[]>} [experimentsByDifficulty]
 * @returns {{ ok: boolean, issues: { id: string, difficulty: string, problems: string[] }[] }}
 */
export function auditLeoLabValidItems(experimentsByDifficulty = EXPERIMENTS_BY_DIFFICULTY) {
  /** @type {{ id: string, difficulty: string, problems: string[] }[]} */
  const issues = [];

  for (const [difficulty, experiments] of Object.entries(experimentsByDifficulty)) {
    for (const exp of experiments) {
      /** @type {string[]} */
      const problems = [];

      const shelf = exp.shelfItems ?? [];
      const offShelf = shelfViolations(exp, shelf);
      if (offShelf.length > 0) {
        problems.push(`validItems not on shelf: ${offShelf.join(", ")}`);
      }

      problems.push(...exactMatchViolations(exp));
      problems.push(...knownBadPairingViolations(exp));

      if (problems.length > 0) {
        issues.push({ id: exp.id, difficulty, problems });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

// --- structural assertions ---

for (const [difficulty, experiments] of Object.entries(EXPERIMENTS_BY_DIFFICULTY)) {
  for (const exp of experiments) {
    assert.ok(exp.id, `experiment missing id at ${difficulty}`);
    assert.ok(exp.validItems?.length > 0, `${exp.id}: validItems empty`);
    assert.ok(exp.shelfItems?.length > 0, `${exp.id}: shelfItems empty`);

    const shelfSet = new Set(exp.shelfItems);
    for (const itemId of exp.validItems) {
      assert.ok(
        shelfSet.has(itemId),
        `${exp.id}: validItem "${itemId}" not on experiment shelf`,
      );
    }

    if (exp.exactMatch) {
      assert.equal(
        exp.validItems.length,
        exp.pickCount,
        `${exp.id}: exactMatch validItems.length must equal pickCount`,
      );
    }
  }
}

const removedIds = [
  "hard-light-reflection",
  "hard-melt-exact",
  "hard-wire-bulb-pair-exact",
  "hard-bulb-switch-battery-exact",
  "hard-switch-wire-exact",
];

for (const removedId of removedIds) {
  for (const experiments of Object.values(EXPERIMENTS_BY_DIFFICULTY)) {
    assert.ok(
      !experiments.some((e) => e.id === removedId),
      `removed experiment still present: ${removedId}`,
    );
  }
}

const audit = auditLeoLabValidItems();
assert.equal(audit.ok, true, `audit failed:\n${JSON.stringify(audit.issues, null, 2)}`);

console.log("PASS: leo-lab-validitems.selftest.mjs");
console.log(
  `  experiments checked: ${Object.values(EXPERIMENTS_BY_DIFFICULTY).reduce((n, list) => n + list.length, 0)}`,
);
console.log(`  audit issues: ${audit.issues.length}`);

import {
  EXPERIMENTS_BY_DIFFICULTY,
  SHELF_BY_DIFFICULTY,
  pickExperimentsForRun,
  experimentPoolStats,
  EXPERIMENTS_PER_LEVEL,
} from "../components/educational-games/leo-lab/leo-lab-data.js";

function checkPool(diff, list) {
  const shelf = new Set(SHELF_BY_DIFFICULTY[diff]);
  const ids = list.map((e) => e.id);
  const titles = list.map((e) => e.title.trim());
  const prompts = list.map((e) => e.prompt.trim());

  const dup = (arr) => arr.length !== new Set(arr).size;

  for (const exp of list) {
    for (const itemId of exp.validItems) {
      if (!shelf.has(itemId)) {
        throw new Error(`${diff}/${exp.id}: validItem ${itemId} not on shelf`);
      }
    }

    if (diff === "easy") {
      if (exp.pickCount === 4) {
        throw new Error(`${diff}/${exp.id}: easy must not use pickCount 4`);
      }
      if (exp.pickCount === 2 && exp.validItems.length !== 4) {
        throw new Error(`${diff}/${exp.id}: easy pick2 must have exactly 4 validItems, has ${exp.validItems.length}`);
      }
    }

    if (diff === "medium") {
      if (exp.pickCount === 2 && exp.validItems.length !== 3) {
        throw new Error(`${diff}/${exp.id}: medium pick2 must have exactly 3 validItems, has ${exp.validItems.length}`);
      }
      if (exp.pickCount === 3 && (exp.validItems.length < 4 || exp.validItems.length > 5)) {
        throw new Error(`${diff}/${exp.id}: medium pick3 must have 4-5 validItems, has ${exp.validItems.length}`);
      }
    }

    if (diff === "hard" && exp.exactMatch && exp.validItems.length !== exp.pickCount) {
      throw new Error(`${diff}/${exp.id}: hard exact pickCount mismatch`);
    }
  }

  if (dup(ids)) throw new Error(`${diff}: duplicate ids`);
  if (dup(titles)) throw new Error(`${diff}: duplicate titles`);
  if (dup(prompts)) throw new Error(`${diff}: duplicate prompts`);
  if (list.length !== 40) throw new Error(`${diff}: expected 40 experiments, got ${list.length}`);

  for (let run = 0; run < 5; run += 1) {
    const picked = pickExperimentsForRun(diff);
    const pIds = picked.map((e) => e.id);
    const pTitles = picked.map((e) => e.title);
    const pPrompts = picked.map((e) => e.prompt);
    if (picked.length !== EXPERIMENTS_PER_LEVEL) {
      throw new Error(`${diff} run ${run}: expected ${EXPERIMENTS_PER_LEVEL}, got ${picked.length}`);
    }
    if (dup(pIds) || dup(pTitles) || dup(pPrompts)) {
      throw new Error(`${diff} run ${run}: duplicates in run`);
    }
    if (pIds.some((id) => id.includes("-pool"))) {
      throw new Error(`${diff} run ${run}: fake pool id`);
    }
  }

  return pickExperimentsForRun(diff).map((e) => e.id);
}

console.log("Pool stats:", JSON.stringify(experimentPoolStats(), null, 2));

const sampleEasy = checkPool("easy", EXPERIMENTS_BY_DIFFICULTY.easy);
const sampleMedium = checkPool("medium", EXPERIMENTS_BY_DIFFICULTY.medium);
const sampleHard = checkPool("hard", EXPERIMENTS_BY_DIFFICULTY.hard);

console.log("\nSample easy run:", sampleEasy.join(", "));
console.log("\nSample medium run:", sampleMedium.join(", "));
console.log("\nSample hard run:", sampleHard.join(", "));
console.log("\nAll validation passed.");

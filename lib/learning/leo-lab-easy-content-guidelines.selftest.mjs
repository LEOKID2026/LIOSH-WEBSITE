/**
 * Leo Lab — easy-level content guidelines audit.
 */
import assert from "node:assert/strict";
import {
  EASY_LEVEL_CONTENT_GUIDELINES,
  auditEasyLevelContent,
  EXPERIMENTS_BY_DIFFICULTY,
} from "../../components/educational-games/leo-lab/leo-lab-data.js";

const BANNED_EASY_PROMPT_RE =
  /חוסמ(?:ים|)\s*אור|עציר(?:ה|)\s*של\s*אור|מתאימ(?:ים|)\s*ליצירת\s*צל|מאפשר(?:ים|)\s*לאור\s*לעבור|שקוף\s*לאור|אור\s*וצל|ניסוי\s*אור/i;

const REMOVED_EASY_IDS = [
  "easy-block-light-clean",
  "easy-shadow-clean",
  "easy-no-soak-clean",
  "easy-natural-clean",
  "easy-metal-clean",
  "easy-color-blue-clean",
  "easy-color-red-clean",
  "easy-color-yellow-clean",
];

assert.equal(EXPERIMENTS_BY_DIFFICULTY.easy.length, 20, "easy pool should have 20 experiments");

for (const removedId of REMOVED_EASY_IDS) {
  assert.ok(
    !EXPERIMENTS_BY_DIFFICULTY.easy.some((exp) => exp.id === removedId),
    `removed easy experiment still present: ${removedId}`,
  );
}

for (const exp of EXPERIMENTS_BY_DIFFICULTY.easy) {
  const text = `${exp.title} ${exp.prompt}`;
  assert.ok(
    !BANNED_EASY_PROMPT_RE.test(text),
    `${exp.id}: banned abstract light/shadow prompt: ${exp.prompt}`,
  );
  assert.ok(exp.pickCount >= 2, `${exp.id}: easy must not use single-answer pickCount`);
}

const audit = auditEasyLevelContent();
assert.ok(audit.easyTotal === 20, "easy pool should have 20 experiments");
assert.ok(
  audit.colorExperimentCount >= EASY_LEVEL_CONTENT_GUIDELINES.minColorExperimentsInEasyPool,
  `easy needs >= ${EASY_LEVEL_CONTENT_GUIDELINES.minColorExperimentsInEasyPool} color experiments, got ${audit.colorExperimentCount}`,
);
assert.equal(audit.electricityOnEasyCount, 0, "easy should not include electricity experiments");
assert.equal(audit.abstractLightExperiments.length, 0, "easy should not include abstract light experiments");
assert.equal(audit.gaps.length, 0, `easy content gaps: ${audit.gaps.join("; ")}`);

console.log(
  `PASS leo-lab-easy-content-guidelines (color experiments: ${audit.colorExperimentCount}; easy total: ${audit.easyTotal})`,
);

/**
 * Card acquisition evaluator — params from DB only.
 * Run: node --test tests/rewards/card-acquisition-evaluator.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRuleParams } from "../../lib/rewards/card-rule-params.js";
import { isGrantableRuleType, CARD_RULE_TYPE_META } from "../../lib/rewards/card-rule-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("card-acquisition-evaluator", () => {
  test("normalizeRuleParams prefers params_json over legacy columns", () => {
    const p = normalizeRuleParams({
      min_questions: 10,
      params_json: { min_questions: 50 },
    });
    assert.equal(p.min_questions, 50);
  });

  test("all 059 rule types are registered in CARD_RULE_TYPE_META", () => {
    const expected = [
      "total_questions",
      "weekly_questions",
      "subject_questions",
      "subject_accuracy",
      "learning_streak_days",
      "parent_activity_complete",
      "subject_improvement",
    ];
    for (const rt of expected) {
      assert.ok(CARD_RULE_TYPE_META[rt], `missing meta for ${rt}`);
    }
  });

  test("subject_improvement is not grantable", () => {
    assert.equal(isGrantableRuleType("subject_improvement"), false);
    assert.equal(isGrantableRuleType("total_questions"), true);
  });

  test("engine reads thresholds from normalizeRuleParams only", () => {
    const src = readFileSync(
      join(ROOT, "lib/rewards/server/card-acquisition-engine.server.js"),
      "utf8"
    );
    assert.match(src, /normalizeRuleParams/);
    assert.match(src, /cardRulesAllMatch/);
    assert.match(src, /evaluateAndGrantAcquisitionCards/);
    assert.doesNotMatch(src, /DEFAULT_MIN_QUESTIONS/);
  });
});

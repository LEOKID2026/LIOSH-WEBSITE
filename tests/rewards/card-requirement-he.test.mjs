/**
 * Hebrew requirement text for card acquisition rules.
 * Run: node --test tests/rewards/card-requirement-he.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRuleRequirementHe,
  buildCardRequirementHe,
  formatProgressLineHe,
} from "../../lib/rewards/card-requirement-he.server.js";

describe("card-requirement-he", () => {
  test("total_questions builds Hebrew from params_json", () => {
    const text = buildRuleRequirementHe({
      rule_type: "total_questions",
      params_json: { min_questions: 100 },
    });
    assert.match(text, /100/);
    assert.match(text, /שאלות/);
  });

  test("subject_accuracy includes accuracy and subject", () => {
    const text = buildRuleRequirementHe({
      rule_type: "subject_accuracy",
      params_json: { min_questions: 30, min_accuracy: 80, subject: "math", topic: "addition" },
    });
    assert.match(text, /80%/);
    assert.match(text, /חיבור/);
  });

  test("learning_streak_days", () => {
    const text = buildRuleRequirementHe({
      rule_type: "learning_streak_days",
      min_streak_days: 7,
    });
    assert.match(text, /7/);
    assert.match(text, /ימים/);
  });

  test("requirement_text_he override wins", () => {
    const text = buildRuleRequirementHe({
      rule_type: "total_questions",
      requirement_text_he: "טקסט מותאם",
      params_json: { min_questions: 5 },
    });
    assert.equal(text, "טקסט מותאם");
  });

  test("buildCardRequirementHe uses card override", () => {
    const text = buildCardRequirementHe({ requirement_text_he: "דרישה גלובלית" }, []);
    assert.equal(text, "דרישה גלובלית");
  });

  test("formatProgressLineHe", () => {
    assert.equal(formatProgressLineHe({ current: 45, target: 100 }), "45 מתוך 100");
    assert.equal(formatProgressLineHe(null), null);
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { executeActionDecisionContractV2 } from "../../lib/learning/action-decision-executor.js";
import { runP3RawRuleScenario } from "../engine-decision-audit/p3-raw-evidence-harness.mjs";

const SUBJECT_RULES = [
  ["math", "M-02"],
  ["geometry", "G-01"],
  ["english", "E-01"],
  ["hebrew", "H-01"],
  ["science", "S-01"],
  ["history", "HI-01"],
  ["moledet-geography", "MG-01"],
];

for (const [subjectId, ruleId] of SUBJECT_RULES) {
  test(`P4 ${subjectId}: real evidence reaches ADC V2 and a bounded executor`, () => {
    const result = runP3RawRuleScenario(ruleId);
    assert.equal(result.subjectId, subjectId);
    assert.equal(result.actionDecisionContract?.version, "2.0.0");
    assert.equal(result.actionDecisionContract?.eligible, true);
    const directive = executeActionDecisionContractV2(
      result.actionDecisionContract,
      {
        subjectId,
        topicKey: result.topicKey,
        levelKey: "medium",
        activitiesSinceDecision: 0,
        nowMs: Date.parse(result.actionDecisionContract.createdAt) + 1_000,
      },
    );
    assert.equal(directive.active, true);
    assert.equal(directive.subject, subjectId);
    assert.equal(directive.topic, result.topicKey);
    assert.equal(directive.sessionPolicy.preserveLearningGoal, true);
  });
}

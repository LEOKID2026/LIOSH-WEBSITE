import test from "node:test";
import assert from "node:assert/strict";

import {
  taxonomyTopicCoverageInventory,
} from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  TAXONOMY_BY_ID,
} from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  REAL_RUNTIME_SCENARIOS,
} from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import {
  realTopicProofRule,
} from "../../lib/learning/p3b-real-topic-proof-registry.js";
import {
  getP3BTopicClosureProducer,
} from "../../lib/learning/p3b-topic-closure-producers.js";
import {
  runP3RawMissingMetadataScenario,
  runP3RawRuleScenario,
  runP3RawTopicProducerScenario,
} from "../engine-decision-audit/p3-raw-evidence-harness.mjs";

const ROWS = taxonomyTopicCoverageInventory();

test("P3 closure: all 72 regular topics have raw proof and seven mixed topics fail safely", () => {
  assert.equal(ROWS.length, 79);
  for (const row of ROWS) {
    if (row.topicKey === "mixed") {
      const result = runP3RawMissingMetadataScenario(
        row.subjectId,
        row.topicKey,
      );
      assert.equal(result.actionDecisionContract.target.subskill, null);
      assert.equal(result.actionDecisionContract.target.subskillId, null);
      continue;
    }
    const closureProducer = getP3BTopicClosureProducer(
      row.subjectId,
      row.topicKey,
    );
    if (closureProducer) {
      const result = runP3RawTopicProducerScenario(closureProducer);
      assert.equal(result.de2.taxonomyId, closureProducer.ruleId);
      assert.equal(result.de2.recurrence.full, true);
      assert.equal(
        result.actionDecisionContract.target.topic,
        closureProducer.canonicalTopic,
      );
      continue;
    }
    const ruleId = realTopicProofRule(row);
    assert.ok(ruleId, `${row.subjectId}:${row.topicKey}: missing real producer`);
    const result = runP3RawRuleScenario(ruleId, {
      topicKeyOverride: row.topicKey,
    });
    assert.equal(result.de2.taxonomyId, ruleId, `${row.subjectId}:${row.topicKey}`);
    assert.equal(result.de2.recurrence.full, true);
    assert.equal(
      result.actionDecisionContract.target.topic,
      row.topicKey,
    );
  }
});

test("P3B every topic rejects a real producer from a non-candidate rule", () => {
  for (const row of ROWS) {
    const scenario = REAL_RUNTIME_SCENARIOS.find(
      (candidate) =>
        TAXONOMY_BY_ID[candidate.ruleId]?.subjectId === row.subjectId &&
        !row.taxonomyIds.includes(candidate.ruleId),
    );
    assert.ok(scenario, `${row.subjectId}:${row.topicKey}:fixture`);
    const result = runP3RawRuleScenario(scenario.ruleId, {
      topicKeyOverride: row.topicKey,
    });
    assert.notEqual(
      result.de2.taxonomyId,
      scenario.ruleId,
      `${row.subjectId}:${row.topicKey}:leak`,
    );
  }
});

test("P3B producer selection and action are deterministic under permutation", () => {
  for (const row of ROWS) {
    const ruleId = realTopicProofRule(row);
    if (!ruleId || row.topicKey === "mixed") continue;
    const normal = runP3RawRuleScenario(ruleId, {
      topicKeyOverride: row.topicKey,
    });
    const reversed = runP3RawRuleScenario(ruleId, {
      topicKeyOverride: row.topicKey,
      reverseEvidence: true,
    });
    assert.equal(normal.de2.taxonomyId, reversed.de2.taxonomyId);
    assert.equal(
      normal.actionDecisionContract.action,
      reversed.actionDecisionContract.action,
    );
    assert.deepEqual(
      normal.actionDecisionContract.target,
      reversed.actionDecisionContract.target,
    );
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  RULE_PRIMARY_PRODUCER,
} from "../../lib/learning/taxonomy-rule-primary-producers.js";
import {
  TAG_PRODUCER_REGISTRY,
  getTagProducer,
} from "../../lib/learning/taxonomy-tag-producer-registry.js";
import {
  TAXONOMY_EVIDENCE_RULES,
  eventMatchesEvidenceRule,
} from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import {
  TAXONOMY_REQUIRED_TAG_STATUS,
} from "../../utils/diagnostic-engine-v2/taxonomy-required-tag-status.js";

test("P3B every active rule primary producer is compiled into one authoritative registry", () => {
  for (const [ruleId, primary] of Object.entries(RULE_PRIMARY_PRODUCER)) {
    assert.equal(primary.active, true, ruleId);
    assert.equal(
      TAG_PRODUCER_REGISTRY[primary.tag]?.active,
      true,
      `${ruleId}:${primary.tag}`,
    );
    assert.deepEqual(
      getTagProducer(primary.tag),
      TAG_PRODUCER_REGISTRY[primary.tag],
      `${ruleId}:single-authority`,
    );
  }
});

test("P3B every required tag is active or explicitly unsupported", () => {
  for (const [ruleId, rule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
    for (const tag of rule.requiredTags) {
      const status = TAXONOMY_REQUIRED_TAG_STATUS[tag];
      assert.ok(status, `${ruleId}:${tag}:missing-status`);
      assert.ok(
        status.status === "active" ||
          status.status === "unsupported_unproduced",
        `${ruleId}:${tag}:${status.status}`,
      );
    }
  }
});

test("P3B unsupported required tags cannot activate a taxonomy match", () => {
  // G-02 still lists protractor_reading_error as required but inactive/unproduced.
  const rule = TAXONOMY_EVIDENCE_RULES["G-02"];
  assert.equal(
    TAXONOMY_REQUIRED_TAG_STATUS.protractor_reading_error.status,
    "unsupported_unproduced",
  );
  assert.equal(
    eventMatchesEvidenceRule(
      {
        isCorrect: false,
        misconceptionTag: "protractor_reading_error",
      },
      rule,
    ),
    false,
  );
  assert.equal(
    eventMatchesEvidenceRule(
      {
        isCorrect: false,
        misconceptionTag: "angle_range_error",
      },
      rule,
    ),
    true,
  );
  // G-06 perimeter_formula_error is now actively produced by geometry TEPs.
  assert.equal(
    TAXONOMY_REQUIRED_TAG_STATUS.perimeter_formula_error.status,
    "active",
  );
  assert.equal(
    eventMatchesEvidenceRule(
      {
        isCorrect: false,
        misconceptionTag: "perimeter_formula_error",
        params: { kind: "rectangle_perimeter" },
      },
      TAXONOMY_EVIDENCE_RULES["G-06"],
    ),
    true,
  );
});

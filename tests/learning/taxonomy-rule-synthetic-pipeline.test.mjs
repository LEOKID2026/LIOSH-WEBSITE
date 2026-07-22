/**
 * SYNTHETIC_PIPELINE_TEST — validates recurrence/routing/parent plumbing with injected fixtures.
 * NOT counted as REAL_RUNTIME_E2E proof.
 * Run: node --test tests/learning/taxonomy-rule-synthetic-pipeline.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildTaxonomyRuleRuntimeMatrix,
  runRuleScenarioChecks,
  summarizeRuntimeMatrix,
} from "../../lib/learning/taxonomy-rule-runtime-matrix.js";
import { allTaxonomyIdsWithEvidenceRules } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { RULE_PRIMARY_PRODUCER } from "../../lib/learning/taxonomy-rule-primary-producers.js";

describe("SYNTHETIC_PIPELINE — matrix plumbing", () => {
  test("59 rules in synthetic matrix", () => {
    assert.equal(allTaxonomyIdsWithEvidenceRules().length, 59);
    assert.equal(buildTaxonomyRuleRuntimeMatrix().length, 59);
  });

  test("every rule has 10 synthetic fixture scenarios", () => {
    for (const row of buildTaxonomyRuleRuntimeMatrix()) {
      assert.equal(row.fixtures.length, 10, `${row.ruleId} fixture count`);
    }
  });

  test("synthetic positive+negative plumbing checks", () => {
    const summary = summarizeRuntimeMatrix();
    assert.equal(summary.totalRules, 59);
    assert.equal(Object.keys(RULE_PRIMARY_PRODUCER).length, 59);
  });
});

describe("SYNTHETIC_PIPELINE — per rule plumbing", () => {
  const matrix = buildTaxonomyRuleRuntimeMatrix();
  for (const row of matrix) {
    test(`${row.ruleId} synthetic producer + recurrence plumbing`, () => {
      const checks = runRuleScenarioChecks(row);
      assert.equal(checks.producer, true, `${row.ruleId} producer check`);
      if (row.positiveFixture?.events?.length >= 3) {
        assert.equal(checks.positiveRecurrence, true, `${row.ruleId} positive recurrence`);
        assert.equal(checks.falsificationBlocked, true, `${row.ruleId} falsification`);
      }
    });
  }
});

/**
 * 59-rule falsification matrix — delegates synthetic plumbing to taxonomy-rule-synthetic-pipeline.test.mjs
 * Real runtime proof: tests/learning/taxonomy-rule-real-runtime-e2e.test.mjs
 * Run: node --test tests/learning/taxonomy-rule-falsification-matrix.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildTaxonomyRuleRuntimeMatrix,
  runRuleScenarioChecks,
  summarizeRuntimeMatrix,
} from "../../lib/learning/taxonomy-rule-runtime-matrix.js";
import { allTaxonomyIdsWithEvidenceRules } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { classifyHebrewTypedAnswer } from "../../lib/learning/classifiers/hebrew-typed-classifier.js";
import { classifyEnglishTypedAnswer } from "../../lib/learning/classifiers/english-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/index.js";
import { RULE_PRIMARY_PRODUCER } from "../../lib/learning/taxonomy-rule-primary-producers.js";

describe("taxonomy runtime matrix completeness", () => {
  test("59 rules in matrix", () => {
    const ids = allTaxonomyIdsWithEvidenceRules();
    assert.equal(ids.length, 59);
    const matrix = buildTaxonomyRuleRuntimeMatrix();
    assert.equal(matrix.length, 59);
  });

  test("every rule has 10 fixture scenarios", () => {
    const matrix = buildTaxonomyRuleRuntimeMatrix();
    for (const row of matrix) {
      assert.equal(row.fixtures.length, 10, `${row.ruleId} fixture count`);
      const kinds = new Set(row.fixtures.map((f) => f.kind));
      assert.ok(kinds.has("positive"), row.ruleId);
      assert.ok(kinds.has("same_wrong_count_wrong_pattern"), row.ruleId);
      assert.ok(kinds.has("unknown"), row.ruleId);
      assert.ok(kinds.has("routing"), row.ruleId);
      assert.ok(kinds.has("parent_copy"), row.ruleId);
      assert.ok(kinds.has("recovery"), row.ruleId);
      assert.ok(kinds.has("probe_confirmed"), row.ruleId);
    }
  });

  test("59/59 active primary producers", () => {
    const summary = summarizeRuntimeMatrix();
    assert.equal(summary.totalRules, 59);
    assert.equal(summary.rulesWithActiveProducer, 59);
    assert.equal(summary.rulesWithPrimaryProducer, 59);
    assert.equal(Object.keys(RULE_PRIMARY_PRODUCER).length, 59);
  });

  test("59/59 positive+negative E2E", () => {
    const summary = summarizeRuntimeMatrix();
    assert.equal(summary.rulesWithPositiveFixture, 59);
    assert.equal(summary.rulesWithE2E, 59);
  });
});

describe("all 59 rules — E2E scenario checks", () => {
  const matrix = buildTaxonomyRuleRuntimeMatrix();

  for (const row of matrix) {
    test(`${row.ruleId} producer + positive + falsification`, () => {
      assert.equal(row.hasActiveProducer, true, `${row.ruleId} producer`);
      const checks = runRuleScenarioChecks(row);
      assert.equal(checks.producer, true, `${row.ruleId} producer check`);
      if (row.positiveFixture?.events?.length >= 3) {
        assert.equal(checks.positiveRecurrence, true, `${row.ruleId} positive recurrence`);
        assert.equal(checks.falsificationBlocked, true, `${row.ruleId} falsification`);
      }
    });
  }
});

describe("typed classifiers — deterministic only", () => {
  test("Hebrew spelling — one edit", () => {
    const hit = classifyHebrewTypedAnswer("בית", "בית", { patternFamily: "g1_spelling_meaning_home", answerMode: "typing" });
    assert.equal(hit, null);
    const wrong = classifyHebrewTypedAnswer("בית", "ביט", { patternFamily: "g1_spelling_meaning_home", answerMode: "typing" });
    assert.equal(wrong?.tag, "spelling_pattern_error");
  });

  test("English spelling — one edit", () => {
    const hit = classifyEnglishTypedAnswer("hello", "helo", {});
    assert.equal(hit?.tag, "spelling_error");
  });

  test("English without expected — UNKNOWN via classifier index", () => {
    const ev = classifyAnswerEvidence({
      subject: "english",
      userAnswer: "foo",
      expectedAnswer: null,
      isCorrect: false,
      question: { questionType: "open" },
    });
    assert.equal(ev.detectedMisconception, null);
    assert.equal(ev.evidenceType, "UNKNOWN");
  });

  test("no topic inference for Hebrew", () => {
    const hit = classifyHebrewTypedAnswer("שלום", "שalom", { topic: "grammar" });
    assert.equal(hit, null);
  });
});

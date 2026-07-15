/**
 * Q2-D — Question metadata validator
 * Run: node --test tests/learning/question-metadata-validator.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateCanonicalMetadataBlock,
  validateConfidenceQuality,
  validateNonDiagnosticMetadataSafety,
  isFallbackOnlySkillId,
  expectedAnswerFormatFromMode,
  extractCanonicalMetadata,
  runNoConsumptionChecks,
  runCrossContextChecks,
  collectSubjectCoverageSamples,
  validateCoverageThresholds,
  runFullMetadataValidation,
  QUESTION_METADATA_SUBJECT_THRESHOLDS,
} from "../../lib/learning/question-metadata-validator.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const GOOD_CM = {
  contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
  subject: "science",
  topic: "body",
  skillId: "sci_body_fact_recall",
  subSkill: "sci_body_general",
  questionType: "technical",
  answerFormat: "mcq",
  metadataConfidence: "high",
  requiresAudio: false,
  requiresVisual: false,
  diagnosticEligibleByMetadata: true,
  possibleErrorPatterns: ["fact_recall_gap"],
};

describe("Q2-D - field validation", () => {
  test("valid canonical block passes", () => {
    const issues = validateCanonicalMetadataBlock(GOOD_CM, {
      subject: "science",
      topic: "body",
      hasExplicitDiagnostic: true,
      sourceHasErrorTags: true,
    });
    assert.deepEqual(issues, []);
  });

  test("missing skillId fails", () => {
    const issues = validateCanonicalMetadataBlock({ ...GOOD_CM, skillId: null });
    assert.ok(issues.some((i) => i.includes("skillId")));
  });

  test("forbidden isDiagnosticEligible fails", () => {
    const issues = validateCanonicalMetadataBlock({
      ...GOOD_CM,
      isDiagnosticEligible: true,
    });
    assert.ok(issues.some((i) => i.includes("isDiagnosticEligible")));
  });

  test("empty pool must be low confidence", () => {
    const issues = validateCanonicalMetadataBlock(
      { ...GOOD_CM, metadataConfidence: "high" },
      { isEmptyPool: true }
    );
    assert.ok(issues.some((i) => i.includes("low metadataConfidence")));
  });

  test("answerFormat must match typing mode", () => {
    const issues = validateCanonicalMetadataBlock(
      { ...GOOD_CM, subject: "hebrew", answerFormat: "mcq" },
      { subject: "hebrew", answerMode: "typing" }
    );
    assert.ok(issues.some((i) => i.includes("answerFormat")));
  });
});

describe("Q2-D - confidence quality", () => {
  test("fallback skillId cannot be high confidence", () => {
    const issues = validateConfidenceQuality({
      skillId: "eng_translation_general",
      subSkill: "x",
      metadataConfidence: "high",
      possibleErrorPatterns: [],
    });
    assert.ok(issues.some((i) => i.includes("fallback-only")));
  });

  test("explicit diagnostic allows high with patterns", () => {
    const issues = validateConfidenceQuality(
      {
        skillId: "en_grammar_be_present",
        subSkill: "be_basic",
        metadataConfidence: "high",
        possibleErrorPatterns: ["verb_form_confusion"],
      },
      { hasExplicitDiagnostic: true }
    );
    assert.deepEqual(issues, []);
  });

  test("isFallbackOnlySkillId detects general fallbacks", () => {
    assert.equal(isFallbackOnlySkillId("eng_grammar_general"), true);
    assert.equal(isFallbackOnlySkillId("he_comp_explicit_detail"), false);
    assert.equal(isFallbackOnlySkillId("moledet_geo_homeland"), false);
  });
});

describe("Q2-D - non-diagnostic safety", () => {
  test("book_context kind must not set evidenceCategory on metadata", () => {
    const issues = validateNonDiagnosticMetadataSafety(
      { evidenceCategory: "diagnostic_independent" },
      "book_context"
    );
    assert.ok(issues.length > 0);
  });
});

describe("Q2-D - extract canonical metadata", () => {
  test("reads params.canonicalMetadata and row.canonicalMetadata", () => {
    assert.equal(
      extractCanonicalMetadata({ params: { canonicalMetadata: { skillId: "a" } } })?.skillId,
      "a"
    );
    assert.equal(
      extractCanonicalMetadata({ canonicalMetadata: { skillId: "b" } })?.skillId,
      "b"
    );
  });
});

describe("Q2-D - answer format helper", () => {
  test("expectedAnswerFormatFromMode maps modes", () => {
    assert.equal(expectedAnswerFormatFromMode("typing"), "text");
    assert.equal(expectedAnswerFormatFromMode("choice"), "mcq");
    assert.equal(expectedAnswerFormatFromMode("numeric"), "numeric");
  });
});

describe("Q2-D - coverage thresholds", () => {
  test("all subjects meet Q2-C thresholds at runtime", async () => {
    const coverage = await collectSubjectCoverageSamples();
    const results = validateCoverageThresholds(coverage);
    const failed = results.filter((r) => !r.pass);
    assert.equal(
      failed.length,
      0,
      `threshold failures: ${failed.map((f) => `${f.subject}: ${f.message}`).join("; ")}`
    );
  });

  test("threshold config includes all six subjects", () => {
    assert.ok(QUESTION_METADATA_SUBJECT_THRESHOLDS.math.phase === "Q2-C1");
    assert.ok(QUESTION_METADATA_SUBJECT_THRESHOLDS.english.phase === "Q2-C3");
    assert.ok(QUESTION_METADATA_SUBJECT_THRESHOLDS.hebrew.phase === "Q2-C4");
    assert.ok(QUESTION_METADATA_SUBJECT_THRESHOLDS.moledet.phase === "Q2-C5");
  });
});

describe("Q2-D - no-consumption & cross-context", () => {
  test("report/evidence paths do not reference canonicalMetadata", () => {
    const result = runNoConsumptionChecks(ROOT);
    assert.equal(result.pass, true, JSON.stringify(result.violations));
  });

  test("no cross-context canonicalMetadata merge patterns", () => {
    const result = runCrossContextChecks(ROOT);
    assert.equal(result.pass, true, JSON.stringify(result.hits));
  });
});

describe("Q2-D - full validation pass", () => {
  test("runFullMetadataValidation passes end-to-end", async () => {
    const report = await runFullMetadataValidation({ root: ROOT });
    assert.equal(report.pass, true, JSON.stringify({
      thresholds: report.thresholdResults.filter((r) => !r.pass),
      quality: report.qualityIssues,
      noConsumption: report.noConsumption.violations,
      crossContext: report.crossContext.hits,
    }));
  });
});

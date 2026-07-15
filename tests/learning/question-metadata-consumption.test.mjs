/**
 * Q2-E.1–E.6 — internal metadata consumption (parent context, flag-gated)
 * Run: node --test tests/learning/question-metadata-consumption.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  attachParentContextEvidenceQuality,
  computeParentContextEvidenceQuality,
  allowsStrongParentDiagnosisAtStudent,
  allowsStrongParentDiagnosisAtTopic,
  allowsHedgedParentInsightAtStudent,
  allowsHedgedParentTopicInsight,
  allowsStrongParentTopicInsight,
  shouldSuppressClientPatternDiagnostics,
} from "../../lib/learning/evidence-quality.js";
import { validateShadowPromotionCandidates } from "../../lib/learning/question-metadata-promotion-validation.js";
import { applyActiveParentPromotion } from "../../lib/learning/question-metadata-active-parent-promotion.js";
import {
  resolveCanonicalMetadataFromAnswerSnapshot,
  buildSubSkillGroupKey,
} from "../../lib/learning/question-metadata-resolve-at-answer.js";
import {
  isActiveMetadataParentGatingEnabled,
  isActiveMetadataParentPromotionEnabled,
  isDiagnosticMetadataParentGatingEnabled,
  isDiagnosticMetadataParentPromotionEnabled,
  isDiagnosticMetadataSubskillEnabled,
} from "../../lib/learning/diagnostic-metadata-subskill-flag.js";
import { applyServerParentFacingAuthorityToClientReport } from "../../lib/parent-server/parent-facing-report-authority.js";
import {
  computeInternalErrorPatternSummaries,
  normalizePossibleErrorPatterns,
} from "../../lib/learning/question-metadata-error-patterns.js";
import { resolveMetadataConfidenceCap } from "../../lib/learning/question-metadata-confidence-caps.js";
import { TOPIC_ROLLUP_TOKEN } from "../../lib/learning/question-metadata-resolve-at-answer.js";
import {
  normalizeQuestionType,
  questionTypeBucket,
} from "../../lib/learning/question-metadata-question-types.js";
import {
  normalizeProblemClass,
  normalizeDifficultyDepth,
  problemClassBucket,
  difficultyDepthBucket,
} from "../../lib/learning/question-metadata-problem-class-depth.js";
import { stripInternalReportPayloadFields } from "../../lib/parent-server/report-data-aggregate.server.js";
import {
  buildParentFacingBlocks,
} from "../../lib/parent-server/parent-report-parent-facing.server.js";

const FLAG_ENV = "DIAGNOSTIC_METADATA_SUBSKILL_ENABLED";
const GATING_FLAG_ENV = "DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED";
const PROMOTION_FLAG_ENV = "DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED";

/** @type {string|undefined} */
let priorFlag;
/** @type {string|undefined} */
let priorGatingFlag;
/** @type {string|undefined} */
let priorPromotionFlag;

beforeEach(() => {
  priorFlag = process.env[FLAG_ENV];
  priorGatingFlag = process.env[GATING_FLAG_ENV];
  priorPromotionFlag = process.env[PROMOTION_FLAG_ENV];
});

afterEach(() => {
  if (priorFlag === undefined) delete process.env[FLAG_ENV];
  else process.env[FLAG_ENV] = priorFlag;
  if (priorGatingFlag === undefined) delete process.env[GATING_FLAG_ENV];
  else process.env[GATING_FLAG_ENV] = priorGatingFlag;
  if (priorPromotionFlag === undefined) delete process.env[PROMOTION_FLAG_ENV];
  else process.env[PROMOTION_FLAG_ENV] = priorPromotionFlag;
});

function clearMetadataFlags() {
  delete process.env[FLAG_ENV];
  delete process.env[GATING_FLAG_ENV];
  delete process.env[PROMOTION_FLAG_ENV];
}

function setMetadataOnlyFlag() {
  process.env[FLAG_ENV] = "true";
  delete process.env[GATING_FLAG_ENV];
  delete process.env[PROMOTION_FLAG_ENV];
}

function setBothMetadataFlags() {
  process.env[FLAG_ENV] = "true";
  process.env[GATING_FLAG_ENV] = "true";
  delete process.env[PROMOTION_FLAG_ENV];
}

function setAllThreeMetadataFlags() {
  process.env[FLAG_ENV] = "true";
  process.env[GATING_FLAG_ENV] = "true";
  process.env[PROMOTION_FLAG_ENV] = "true";
}

/** Existing topic-insight template — promotion must not introduce new Hebrew copy. */
const EXISTING_TOPIC_INSIGHT_RE =
  /^כדאי לשים לב ל.+ - זה נושא שחוזר בתרגולים\.$/;

function assertStrippedPublicPromotionSanitized(stripped) {
  assert.equal(stripped.meta._evidenceQuality, undefined);
  assert.equal(stripped.meta.evidenceQuality.appliedParentPromotion, undefined);
  assert.equal(stripped.meta.evidenceQuality.promotionDecisions, undefined);
  assert.equal(stripped.meta.evidenceQuality.validatedPromotionCandidates, undefined);
  assert.equal(stripped.meta.evidenceQuality.student?.supportingEvidenceIds, undefined);
  assert.equal(stripped.meta.evidenceQuality.student?.sourceBreakdown, undefined);
}

function assertPromotionUsesExistingHebrewOnly(beforeInsights, afterInsights) {
  const beforeSet = new Set(beforeInsights);
  const added = afterInsights.filter((line) => !beforeSet.has(line));
  for (const line of added) {
    // No new Hebrew strings: promotion may only surface the existing topic-insight template.
    assert.match(line, EXISTING_TOPIC_INSIGHT_RE);
  }
}

function basePayload() {
  return {
    summary: {
      diagnosticAnswers: 8,
      totalSessions: 3,
      totalAnswers: 8,
    },
    subjects: {
      math: {
        diagnosticAnswers: 8,
        diagnosticAccuracy: 50,
        topics: {
          fractions: { diagnosticAnswers: 8, diagnosticWrong: 2, diagnosticAccuracy: 50 },
        },
      },
    },
    recentMistakes: [
      {
        id: "m1",
        subject: "math",
        topic: "fractions",
        questionId: "q1",
        answeredAt: "2026-01-10T10:00:00Z",
        _canonicalMeta: {
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_denominator"],
        },
      },
      {
        id: "m2",
        subject: "math",
        topic: "fractions",
        questionId: "q2",
        answeredAt: "2026-01-12T10:00:00Z",
        _canonicalMeta: {
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_denominator"],
        },
      },
    ],
    _diagnosticSubSkillRollup: {
      "math::fractions::frac_add_like": {
        subject: "math",
        topic: "fractions",
        skillId: "math_frac_add_like",
        subSkill: "frac_add_like",
        questionType: "technical",
        metadataConfidence: "high",
        possibleErrorPatterns: ["wrong_denominator"],
        groupingLevel: "subSkill",
        diagnosticAnswers: 8,
        diagnosticWrong: 2,
      },
    },
    meta: { version: "test" },
  };
}

function publicEvidenceQualityShape(eq) {
  return {
    context: eq.context,
    student: { ...eq.student },
    bySubject: JSON.parse(JSON.stringify(eq.bySubject || {})),
    byTopic: JSON.parse(JSON.stringify(eq.byTopic || {})),
  };
}

describe("Q2-E.1 - feature flag default", () => {
  test("default flag is OFF", () => {
    delete process.env[FLAG_ENV];
    assert.equal(isDiagnosticMetadataSubskillEnabled(), false);
  });
});

describe("Q2-E.1 - resolver safety", () => {
  test("returns null when not diagnostic-eligible", () => {
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            metadataConfidence: "high",
          },
        },
      },
      { subject: "math", topic: "fractions", isDiagnosticEligible: false }
    );
    assert.equal(meta, null);
  });

  test("resolves from params.canonicalMetadata when diagnostic-eligible", () => {
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            questionType: "technical",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_denominator"],
          },
        },
      },
      { subject: "math", topic: "fractions", isDiagnosticEligible: true }
    );
    assert.equal(meta?.skillId, "math_frac_add_like");
    assert.equal(meta?.subSkill, "frac_add_like");
    assert.deepEqual(meta?.possibleErrorPatterns, ["wrong_denominator"]);
  });

  test("fallback skillId rolls up to topic grouping key", () => {
    const key = buildSubSkillGroupKey(
      {
        skillId: "eng_translation_general",
        subSkill: "pool_a",
        metadataConfidence: "medium",
      },
      "english",
      "translation"
    );
    assert.equal(key, "english::translation::__topic__");
  });
});

describe("Q2-E.1 - flag OFF public payload unchanged", () => {
  test("public meta.evidenceQuality shape unchanged vs flag ON internal-only delta", () => {
    delete process.env[FLAG_ENV];
    const payload = basePayload();
    const offAttached = attachParentContextEvidenceQuality(payload);
    const offPublic = publicEvidenceQualityShape(offAttached.meta.evidenceQuality);
    assert.equal(offAttached.meta._evidenceQuality?.bySubSkill, undefined);

    process.env[FLAG_ENV] = "true";
    const onAttached = attachParentContextEvidenceQuality(payload);
    const onPublic = publicEvidenceQualityShape(onAttached.meta.evidenceQuality);

    assert.deepEqual(onPublic, offPublic);
    assert.ok(onAttached.meta._evidenceQuality?.bySubSkill);
    assert.ok(Object.keys(onAttached.meta._evidenceQuality.bySubSkill).length > 0);
  });

  test("strip removes internal bySubSkill, errorPatterns, and mistake canonical meta", () => {
    process.env[FLAG_ENV] = "true";
    const attached = attachParentContextEvidenceQuality(basePayload());
    const stripped = stripInternalReportPayloadFields(attached);

    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped._diagnosticSubSkillRollup, undefined);
    assert.equal(stripped.meta.evidenceQuality.bySubSkill, undefined);
    assert.equal(stripped.meta.evidenceQuality.errorPatterns, undefined);
    assert.equal(stripped.meta.evidenceQuality.questionTypes, undefined);
    assert.equal(stripped.meta.evidenceQuality.problemClasses, undefined);
    assert.equal(stripped.meta.evidenceQuality.difficultyDepths, undefined);
    assert.equal(stripped._diagnosticProblemClassRollup, undefined);
    assert.equal(stripped._diagnosticDifficultyDepthRollup, undefined);
    assert.equal(stripped.recentMistakes[0]._canonicalMeta, undefined);
    assert.equal(stripped.recentMistakes[0].skillId, undefined);
    assert.equal(stripped.recentMistakes[0].subSkill, undefined);
    assert.equal(stripped.recentMistakes[0].metadataConfidence, undefined);

    assert.deepEqual(
      Object.keys(stripped.meta.evidenceQuality.student).sort(),
      [
        "confidenceLevel",
        "confidenceReason",
        "dataSufficiency",
        "evidenceCount",
        "rawDiagnosticCount",
        "recurrenceMet",
      ]
    );
  });

  test("parent-facing blocks unchanged when flag ON", () => {
    delete process.env[FLAG_ENV];
    const offBlocks = buildParentFacingBlocks(basePayload());

    process.env[FLAG_ENV] = "true";
    const onBlocks = buildParentFacingBlocks(basePayload());

    assert.deepEqual(onBlocks, offBlocks);
  });
});

describe("Q2-E.1 - flag ON internal grouping", () => {
  test("internal bySubSkill entry shape", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const entry = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.ok(entry);
    assert.equal(entry.subject, "math");
    assert.equal(entry.topic, "fractions");
    assert.equal(entry.skillId, "math_frac_add_like");
    assert.equal(entry.subSkill, "frac_add_like");
    assert.equal(entry.groupingLevel, "subSkill");
    assert.equal(entry.rawDiagnosticCount, 8);
    assert.equal(entry.dataSufficiency, "preliminary_signal");
    assert.ok(Array.isArray(entry.supportingEvidenceIds));
    assert.equal(entry.sourceBreakdown, undefined);
    assert.equal(entry.metadataConfidenceCap, "high");
    assert.equal(entry.isMetadataWeak, false);
    assert.equal(entry.effectiveConfidenceLevel, "moderate");
  });

  test("non-diagnostic rich metadata does not create rollup evidence", () => {
    process.env[FLAG_ENV] = "true";
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            skillId: "book_reading",
            subSkill: "chapter_1",
            metadataConfidence: "high",
          },
        },
      },
      { subject: "hebrew", topic: "reading", isDiagnosticEligible: false }
    );
    assert.equal(meta, null);

    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 0 },
      subjects: {},
      recentMistakes: [],
      _diagnosticSubSkillRollup: {},
    });
    assert.deepEqual(internal.bySubSkill, {});
  });
});

describe("Q2-E.2 - error pattern recurrence", () => {
  test("normalizePossibleErrorPatterns dedupes and drops empty", () => {
    assert.deepEqual(
      normalizePossibleErrorPatterns(["wrong_denominator", "", "wrong_denominator", "  "]),
      ["wrong_denominator"]
    );
    assert.deepEqual(normalizePossibleErrorPatterns(null), []);
    assert.deepEqual(normalizePossibleErrorPatterns([]), []);
  });

  test("repeated pattern across distinct days yields recurrenceMet", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const global = internal.errorPatterns?.["math::fractions::wrong_denominator"];
    assert.ok(global);
    assert.equal(global.pattern, "wrong_denominator");
    assert.equal(global.wrongCount, 2);
    assert.equal(global.recurrenceMet, true);
    assert.deepEqual(global.supportingEvidenceIds, ["m1", "m2"]);

    const groupPatterns =
      internal.bySubSkill?.["math::fractions::frac_add_like"]?.errorPatterns;
    assert.ok(groupPatterns?.wrong_denominator);
    assert.equal(groupPatterns.wrong_denominator.recurrenceMet, true);
    assert.equal(groupPatterns.wrong_denominator.wrongCount, 2);
  });

  test("single-day duplicate pattern does not meet recurrence", () => {
    process.env[FLAG_ENV] = "true";
    const payload = basePayload();
    payload.recentMistakes = [
      {
        id: "m1",
        subject: "math",
        topic: "fractions",
        answeredAt: "2026-01-10T10:00:00Z",
        _canonicalMeta: {
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_numerator"],
        },
      },
      {
        id: "m2",
        subject: "math",
        topic: "fractions",
        answeredAt: "2026-01-10T11:00:00Z",
        _canonicalMeta: {
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_numerator"],
        },
      },
    ];
    const { internal } = computeParentContextEvidenceQuality(payload);
    const entry = internal.errorPatterns?.["math::fractions::wrong_numerator"];
    assert.ok(entry);
    assert.equal(entry.wrongCount, 2);
    assert.equal(entry.recurrenceMet, false);
  });

  test("rows without possibleErrorPatterns create no fake recurrence", () => {
    process.env[FLAG_ENV] = "true";
    const payload = basePayload();
    payload.recentMistakes = [
      {
        id: "m1",
        subject: "math",
        topic: "fractions",
        answeredAt: "2026-01-10T10:00:00Z",
        _canonicalMeta: {
          skillId: "eng_translation_general",
          subSkill: "pool_a",
          metadataConfidence: "low",
          possibleErrorPatterns: null,
        },
      },
      {
        id: "m2",
        subject: "math",
        topic: "fractions",
        answeredAt: "2026-01-12T10:00:00Z",
        _canonicalMeta: {
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
        },
      },
    ];
    const summaries = computeInternalErrorPatternSummaries(payload.recentMistakes);
    assert.equal(Object.keys(summaries.global).length, 0);
    assert.equal(Object.keys(summaries.bySubSkillGroup).length, 0);

    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.equal(internal.errorPatterns, undefined);
    const group = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.ok(group);
    assert.equal(group.errorPatterns, undefined);
  });

  test("public meta.evidenceQuality unchanged when errorPatterns internal only", () => {
    delete process.env[FLAG_ENV];
    const offPublic = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(basePayload()).meta.evidenceQuality
    );

    process.env[FLAG_ENV] = "true";
    const onAttached = attachParentContextEvidenceQuality(basePayload());
    const onPublic = publicEvidenceQualityShape(onAttached.meta.evidenceQuality);

    assert.deepEqual(onPublic, offPublic);
    assert.ok(onAttached.meta._evidenceQuality?.errorPatterns);
  });
});

describe("Q2-E.3 - metadata confidence caps", () => {
  test("high metadata keeps strong internal cap", () => {
    const cap = resolveMetadataConfidenceCap({
      metadataConfidence: "high",
      skillId: "math_frac_add_like",
      subSkill: "frac_add_like",
      possibleErrorPatterns: ["wrong_denominator"],
      groupingLevel: "subSkill",
      groupKey: "math::fractions::frac_add_like",
    });
    assert.equal(cap.metadataConfidenceCap, "high");
    assert.equal(cap.isMetadataWeak, false);
    assert.equal(cap.effectiveConfidenceLevel, "moderate");
    assert.equal(cap.metadataConfidenceReason, "metadata_sufficient");
  });

  test("medium metadata applies cap to low effective level", () => {
    const cap = resolveMetadataConfidenceCap({
      metadataConfidence: "medium",
      skillId: "sci_body_fact_recall",
      subSkill: "sci_body_general",
      possibleErrorPatterns: ["recall_gap"],
      groupingLevel: "subSkill",
      groupKey: "science::body::sci_body_general",
    });
    assert.equal(cap.metadataConfidenceCap, "medium");
    assert.equal(cap.isMetadataWeak, false);
    assert.equal(cap.effectiveConfidenceLevel, "low");
    assert.ok(cap.metadataConfidenceReason.includes("metadata_confidence_medium"));
  });

  test("low/fallback metadata is weak and topic rollup caps low", () => {
    const lowCap = resolveMetadataConfidenceCap({
      metadataConfidence: "low",
      skillId: "eng_translation_general",
      subSkill: "pool_a",
      possibleErrorPatterns: null,
      groupingLevel: "topic",
      groupKey: `english::translation::${TOPIC_ROLLUP_TOKEN}`,
    });
    assert.equal(lowCap.metadataConfidenceCap, "low");
    assert.equal(lowCap.isMetadataWeak, true);
    assert.equal(lowCap.effectiveConfidenceLevel, "insufficient_data");
    assert.ok(lowCap.metadataConfidenceReason.includes("topic_level_rollup"));
    assert.ok(lowCap.metadataConfidenceReason.includes("fallback_skill_id"));
  });

  test("flag ON bySubSkill and errorPatterns include cap fields", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const group = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.equal(group.metadataConfidenceCap, "high");
    assert.equal(group.errorPatterns.wrong_denominator.effectiveConfidenceLevel, "moderate");
    assert.equal(group.errorPatterns.wrong_denominator.patternConfidenceCapped, false);

    const global = internal.errorPatterns?.["math::fractions::wrong_denominator"];
    assert.equal(global.metadataConfidenceCap, "high");
    assert.equal(global.effectiveConfidenceLevel, "moderate");
  });

  test("weak metadata caps error-pattern recurrence confidence", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      ...basePayload(),
      recentMistakes: [
        {
          id: "m1",
          subject: "english",
          topic: "translation",
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "eng_translation_general",
            subSkill: "pool_a",
            metadataConfidence: "low",
            possibleErrorPatterns: ["literal_word_order"],
          },
        },
        {
          id: "m2",
          subject: "english",
          topic: "translation",
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "eng_translation_general",
            subSkill: "pool_a",
            metadataConfidence: "low",
            possibleErrorPatterns: ["literal_word_order"],
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        [`english::translation::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "english",
          topic: "translation",
          skillId: "eng_translation_general",
          subSkill: null,
          metadataConfidence: "low",
          possibleErrorPatterns: ["literal_word_order"],
          groupingLevel: "topic",
          diagnosticAnswers: 6,
          diagnosticWrong: 2,
        },
      },
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    const groupKey = `english::translation::${TOPIC_ROLLUP_TOKEN}`;
    const group = internal.bySubSkill?.[groupKey];
    assert.ok(group);
    assert.equal(group.isMetadataWeak, true);
    assert.equal(group.metadataConfidenceCap, "low");
    assert.equal(group.effectiveConfidenceLevel, "insufficient_data");

    const pattern = group.errorPatterns?.literal_word_order;
    assert.ok(pattern);
    assert.equal(pattern.recurrenceMet, true);
    assert.equal(pattern.effectiveConfidenceLevel, "insufficient_data");
    assert.equal(pattern.patternConfidenceCapped, true);
  });

  test("public payload unchanged and strip removes cap fields", () => {
    delete process.env[FLAG_ENV];
    const off = attachParentContextEvidenceQuality(basePayload());

    process.env[FLAG_ENV] = "true";
    const on = attachParentContextEvidenceQuality(basePayload());
    assert.deepEqual(
      publicEvidenceQualityShape(off.meta.evidenceQuality),
      publicEvidenceQualityShape(on.meta.evidenceQuality)
    );

    const stripped = stripInternalReportPayloadFields(on);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped.meta.evidenceQuality.metadataConfidenceCap, undefined);
    assert.equal(stripped.meta.evidenceQuality.questionTypes, undefined);
    assert.equal(stripped._diagnosticQuestionTypeRollup, undefined);
    assert.equal(stripped._diagnosticQuestionTypeByGroupRollup, undefined);
  });
});

describe("Q2-E.4 - questionType internal filters", () => {
  function mathMixedQuestionTypePayload() {
    return {
      summary: { diagnosticAnswers: 10, totalSessions: 2, totalAnswers: 10 },
      subjects: {
        math: {
          diagnosticAnswers: 10,
          topics: {
            fractions: { diagnosticAnswers: 10, diagnosticWrong: 2 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m-tech",
          subject: "math",
          topic: "fractions",
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            questionType: "technical",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_denominator"],
          },
        },
        {
          id: "m-wp",
          subject: "math",
          topic: "fractions",
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
            possibleErrorPatterns: ["operation_choice"],
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_denominator"],
          groupingLevel: "subSkill",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::frac_word_problem": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          questionType: "word_problem",
          metadataConfidence: "high",
          possibleErrorPatterns: ["operation_choice"],
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::technical": {
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          skillId: "math_frac_add_like",
          metadataConfidence: "high",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::word_problem": {
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          skillId: "math_frac_wp",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "math::fractions::frac_add_like::technical": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::frac_word_problem::word_problem": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
    };
  }

  test("normalizeQuestionType rejects unknown values", () => {
    assert.equal(normalizeQuestionType("technical"), "technical");
    assert.equal(normalizeQuestionType("word_problem"), "word_problem");
    assert.equal(normalizeQuestionType("unknown"), null);
    assert.equal(normalizeQuestionType(null), null);
    assert.equal(questionTypeBucket(null), "unclassified");
  });

  test("technical vs word_problem split internally", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(mathMixedQuestionTypePayload());
    assert.ok(internal.questionTypes?.["math::fractions::technical"]);
    assert.ok(internal.questionTypes?.["math::fractions::word_problem"]);
    assert.equal(internal.questionTypes["math::fractions::technical"].diagnosticAnswers, 6);
    assert.equal(internal.questionTypes["math::fractions::word_problem"].diagnosticAnswers, 4);
    assert.equal(internal.questionTypes["math::fractions::technical"].isUnclassified, false);

    const techGroup = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.equal(techGroup.questionTypeBreakdown?.technical?.questionType, "technical");
    assert.equal(techGroup.questionTypeBreakdown?.word_problem, undefined);

    const wpGroup = internal.bySubSkill?.["math::fractions::frac_word_problem"];
    assert.equal(wpGroup.questionTypeBreakdown?.word_problem?.questionType, "word_problem");
  });

  test("language questionTypes split grammar vs vocabulary", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 8 },
      subjects: {
        english: {
          diagnosticAnswers: 8,
          topics: { grammar: { diagnosticAnswers: 8 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "english::grammar::present_simple": {
          subject: "english",
          topic: "grammar",
          skillId: "en_grammar_present_simple",
          subSkill: "present_simple",
          questionType: "grammar",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "english::grammar::grammar": {
          subject: "english",
          topic: "grammar",
          questionType: "grammar",
          metadataConfidence: "high",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
        "english::grammar::vocabulary": {
          subject: "english",
          topic: "grammar",
          questionType: "vocabulary",
          metadataConfidence: "medium",
          diagnosticAnswers: 3,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "english::grammar::present_simple::grammar": {
          groupKey: "english::grammar::present_simple",
          subject: "english",
          topic: "grammar",
          questionType: "grammar",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
        "english::grammar::present_simple::vocabulary": {
          groupKey: "english::grammar::present_simple",
          subject: "english",
          topic: "grammar",
          questionType: "vocabulary",
          skillId: "en_grammar_present_simple",
          subSkill: "present_simple",
          metadataConfidence: "medium",
          possibleErrorPatterns: ["word_choice"],
          groupingLevel: "subSkill",
          diagnosticAnswers: 3,
          diagnosticWrong: 0,
        },
      },
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.ok(internal.questionTypes?.["english::grammar::grammar"]);
    assert.ok(internal.questionTypes?.["english::grammar::vocabulary"]);
    const breakdown =
      internal.bySubSkill?.["english::grammar::present_simple"]?.questionTypeBreakdown;
    assert.equal(breakdown?.grammar?.questionType, "grammar");
    assert.equal(breakdown?.vocabulary?.metadataConfidenceCap, "medium");
  });

  test("geometry visual questionType labeled internally", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 4 },
      subjects: { geometry: { diagnosticAnswers: 4, topics: { shapes: { diagnosticAnswers: 4 } } } },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "geometry::shapes::square_area": {
          subject: "geometry",
          topic: "shapes",
          skillId: "geo_area_square_formula",
          subSkill: "square_area",
          questionType: "visual",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "geometry::shapes::visual": {
          subject: "geometry",
          topic: "shapes",
          questionType: "visual",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "geometry::shapes::square_area::visual": {
          groupKey: "geometry::shapes::square_area",
          subject: "geometry",
          topic: "shapes",
          questionType: "visual",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.equal(internal.questionTypes?.["geometry::shapes::visual"]?.questionType, "visual");
  });

  test("missing questionType buckets as unclassified with weak cap", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 3 },
      subjects: { math: { diagnosticAnswers: 3, topics: { general: { diagnosticAnswers: 3 } } } },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "math::general::__topic__": {
          subject: "math",
          topic: "general",
          skillId: "math_general",
          subSkill: null,
          questionType: null,
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::general::unclassified": {
          subject: "math",
          topic: "general",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::general::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "general",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
    };
    const entry = computeParentContextEvidenceQuality(payload).internal.questionTypes?.[
      "math::general::unclassified"
    ];
    assert.ok(entry);
    assert.equal(entry.isUnclassified, true);
    assert.equal(entry.isMetadataWeak, true);
    assert.ok(entry.metadataConfidenceReason.includes("missing_question_type"));
  });

  test("public payload unchanged with questionTypes internal only", () => {
    delete process.env[FLAG_ENV];
    const off = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(mathMixedQuestionTypePayload()).meta.evidenceQuality
    );
    process.env[FLAG_ENV] = "true";
    const on = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(mathMixedQuestionTypePayload()).meta.evidenceQuality
    );
    assert.deepEqual(on, off);
  });

  test("non-diagnostic metadata does not create questionType summaries", () => {
    process.env[FLAG_ENV] = "true";
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            questionType: "grammar",
            skillId: "en_grammar",
            metadataConfidence: "high",
          },
        },
      },
      { isDiagnosticEligible: false }
    );
    assert.equal(meta, null);
  });
});

describe("Q2-E.5-A - shadow parent gating (internal only)", () => {
  function supportedTopicOnlyWeakMetadataPayload() {
    return {
      summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          topics: {
            fractions: { diagnosticAnswers: 12, diagnosticWrong: 4 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
        },
      ],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_general",
          subSkill: null,
          questionType: null,
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 4,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::unclassified": {
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 12,
          diagnosticWrong: 4,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 4,
        },
      },
    };
  }

  function wordProblemPromotionPayload() {
    return {
      summary: { diagnosticAnswers: 8, totalSessions: 2, totalAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          topics: {
            fractions: { diagnosticAnswers: 8, diagnosticWrong: 3 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m-wp1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
        {
          id: "m-wp2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_word_problem": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::word_problem": {
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::technical": {
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "math::fractions::frac_word_problem::word_problem": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like::technical": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
    };
  }

  test("shadow suppression candidate for supported topic with weak metadata only", () => {
    process.env[FLAG_ENV] = "true";
    const { public: pub, internal } = computeParentContextEvidenceQuality(
      supportedTopicOnlyWeakMetadataPayload()
    );
    assert.equal(pub.byTopic["math::fractions"].dataSufficiency, "supported_diagnosis");
    assert.ok(internal.shadowParentGating);
    const suppress = internal.shadowParentGating.shadowSuppressionCandidates;
    assert.ok(suppress.some((c) => c.topicKey === "math::fractions"));
    assert.ok(
      suppress.some((c) =>
        String(c.reason).includes("topic_only") ||
        String(c.reason).includes("low_confidence") ||
        String(c.reason).includes("weak_metadata")
      )
    );
  });

  test("shadow promotion candidate for preliminary topic with subSkill recurrence", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const promote = internal.shadowParentGating.shadowPromotionCandidates;
    assert.ok(
      promote.some(
        (c) =>
          c.topicKey === "math::fractions" &&
          c.reason === "preliminary_topic_with_high_confidence_subskill_recurrence"
      )
    );
  });

  test("shadow promotion candidate for word_problem weakness while technical stable", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(wordProblemPromotionPayload());
    const promote = internal.shadowParentGating.shadowPromotionCandidates;
    assert.ok(
      promote.some(
        (c) => c.reason === "word_problem_weakness_while_technical_stable"
      )
    );
  });

  test("shadow no-op when metadata signals missing", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 6 },
      subjects: {
        math: { diagnosticAnswers: 6, topics: { fractions: { diagnosticAnswers: 6 } } },
      },
      recentMistakes: [],
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.ok(internal.shadowParentGating);
    assert.ok(
      internal.shadowParentGating.noOpCases.some((c) => c.case === "metadata_signals_missing")
    );
    assert.equal(internal.shadowParentGating.shadowSuppressionCandidates.length, 0);
    assert.equal(internal.shadowParentGating.shadowPromotionCandidates.length, 0);
  });

  test("flag OFF has no shadowParentGating internal field", () => {
    delete process.env[FLAG_ENV];
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    assert.equal(internal.shadowParentGating, undefined);
  });

  test("public meta.evidenceQuality unchanged flag OFF vs ON with shadow", () => {
    delete process.env[FLAG_ENV];
    const off = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(supportedTopicOnlyWeakMetadataPayload()).meta
        .evidenceQuality
    );
    process.env[FLAG_ENV] = "true";
    const on = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(supportedTopicOnlyWeakMetadataPayload()).meta
        .evidenceQuality
    );
    assert.deepEqual(on, off);
  });

  test("parent-facing blocks deep-equal flag OFF vs ON with shadow", () => {
    delete process.env[FLAG_ENV];
    const offBlocks = buildParentFacingBlocks(supportedTopicOnlyWeakMetadataPayload());
    process.env[FLAG_ENV] = "true";
    const onBlocks = buildParentFacingBlocks(supportedTopicOnlyWeakMetadataPayload());
    assert.deepEqual(onBlocks, offBlocks);
  });

  test("strip removes shadowParentGating and all shadow fields", () => {
    process.env[FLAG_ENV] = "true";
    const attached = attachParentContextEvidenceQuality(supportedTopicOnlyWeakMetadataPayload());
    assert.ok(attached.meta._evidenceQuality?.shadowParentGating);
    const stripped = stripInternalReportPayloadFields(attached);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped.meta.evidenceQuality.shadowParentGating, undefined);
    assert.equal(stripped.meta.evidenceQuality.shadowSuppressionCandidates, undefined);
    assert.equal(stripped.meta.evidenceQuality.shadowPromotionCandidates, undefined);
    assert.equal(stripped.meta.evidenceQuality.shadowGatingReasons, undefined);
  });

  test("non-diagnostic rows excluded from shadow metadata signals", () => {
    process.env[FLAG_ENV] = "true";
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            metadataConfidence: "high",
          },
        },
      },
      { isDiagnosticEligible: false }
    );
    assert.equal(meta, null);
    const payload = {
      summary: { diagnosticAnswers: 6 },
      subjects: {
        math: { diagnosticAnswers: 6, topics: { fractions: { diagnosticAnswers: 6 } } },
      },
      recentMistakes: [],
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.ok(
      internal.shadowParentGating.noOpCases.some((c) => c.case === "metadata_signals_missing")
    );
  });
});

describe("Q2-E.5-B - active parent gating trial (flag-gated)", () => {
  function activeGatingSuppressPayload() {
    return {
      summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          diagnosticAccuracy: 42,
          topics: {
            fractions: {
              diagnosticAnswers: 12,
              diagnosticWrong: 7,
              diagnosticAccuracy: 42,
            },
          },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
        },
      ],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_general",
          subSkill: null,
          questionType: null,
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::unclassified": {
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
    };
  }

  test("both flags OFF - default unchanged", () => {
    clearMetadataFlags();
    assert.equal(isDiagnosticMetadataSubskillEnabled(), false);
    assert.equal(isDiagnosticMetadataParentGatingEnabled(), false);
    assert.equal(isActiveMetadataParentGatingEnabled(), false);
    const { internal } = computeParentContextEvidenceQuality(activeGatingSuppressPayload());
    assert.equal(internal.appliedParentGating, undefined);
    assert.equal(internal.gatingDecisions, undefined);
  });

  test("metadata ON / active OFF - shadow only, parent-facing unchanged", () => {
    clearMetadataFlags();
    const offBlocks = buildParentFacingBlocks(activeGatingSuppressPayload());
    setMetadataOnlyFlag();
    const onBlocks = buildParentFacingBlocks(activeGatingSuppressPayload());
    const { internal } = computeParentContextEvidenceQuality(activeGatingSuppressPayload());
    assert.ok(internal.shadowParentGating);
    assert.equal(internal.appliedParentGating, undefined);
    assert.equal(internal.gatingDecisions, undefined);
    assert.deepEqual(onBlocks, offBlocks);
  });

  test("both flags ON - suppresses weak supported topic strong diagnosis", () => {
    setMetadataOnlyFlag();
    const metadataOnlyPayload = attachParentContextEvidenceQuality(activeGatingSuppressPayload());
    const metadataOnlyBlocks = buildParentFacingBlocks(metadataOnlyPayload);

    setBothMetadataFlags();
    const activePayload = attachParentContextEvidenceQuality(activeGatingSuppressPayload());
    const activeBlocks = buildParentFacingBlocks(activePayload);

    assert.equal(
      allowsStrongParentDiagnosisAtTopic(metadataOnlyPayload, "math", "fractions"),
      true
    );
    assert.equal(allowsStrongParentDiagnosisAtTopic(activePayload, "math", "fractions"), false);
    assert.ok(metadataOnlyBlocks.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.ok(!activeBlocks.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.ok(activePayload.meta._evidenceQuality?.appliedParentGating);
    assert.ok(activePayload.meta._evidenceQuality?.gatingDecisions?.length > 0);
    assert.equal(
      activePayload.meta._evidenceQuality.appliedParentGating.promotionApplied,
      0
    );
  });

  test("both flags ON - does not suppress when high-confidence subSkill recurrence supports diagnosis", () => {
    setBothMetadataFlags();
    const payload = attachParentContextEvidenceQuality(basePayload());
    assert.equal(allowsStrongParentDiagnosisAtTopic(payload, "math", "fractions"), false);
    assert.equal(allowsHedgedParentTopicInsight(payload, "math", "fractions"), true);
    assert.equal(payload.meta._evidenceQuality?.gatingDecisions, undefined);
    const blocks = buildParentFacingBlocks(payload);
    setMetadataOnlyFlag();
    const metadataOnlyBlocks = buildParentFacingBlocks(
      attachParentContextEvidenceQuality(basePayload())
    );
    assert.deepEqual(blocks, metadataOnlyBlocks);
  });

  test("both flags ON - promotion candidates remain shadow-only", () => {
    setBothMetadataFlags();
    const payload = {
      summary: { diagnosticAnswers: 8, totalSessions: 2, totalAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          diagnosticAccuracy: 50,
          topics: {
            fractions: { diagnosticAnswers: 8, diagnosticWrong: 3, diagnosticAccuracy: 50 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m-wp1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
        {
          id: "m-wp2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_word_problem": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::word_problem": {
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::technical": {
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "math::fractions::frac_word_problem::word_problem": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like::technical": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
    };
    const attached = attachParentContextEvidenceQuality(payload);
    const promote =
      attached.meta._evidenceQuality?.shadowParentGating?.shadowPromotionCandidates || [];
    assert.ok(promote.length > 0);
    assert.equal(attached.meta._evidenceQuality?.appliedParentGating?.promotionApplied, 0);
    assert.ok(attached.meta._evidenceQuality?.appliedParentGating?.promotionRetainedShadowOnly > 0);
    assert.equal(attached.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency, "preliminary_signal");
    setMetadataOnlyFlag();
    const metadataOnlyBlocks = buildParentFacingBlocks(
      attachParentContextEvidenceQuality(payload)
    );
    setBothMetadataFlags();
    const activeBlocks = buildParentFacingBlocks(attached);
    assert.deepEqual(activeBlocks, metadataOnlyBlocks);
  });

  test("public API shape unchanged with both flags ON", () => {
    clearMetadataFlags();
    const off = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(activeGatingSuppressPayload()).meta.evidenceQuality
    );
    setBothMetadataFlags();
    const on = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(activeGatingSuppressPayload()).meta.evidenceQuality
    );
    assert.deepEqual(on, off);
  });

  test("strip removes appliedParentGating and gatingDecisions", () => {
    setBothMetadataFlags();
    const attached = attachParentContextEvidenceQuality(activeGatingSuppressPayload());
    assert.ok(attached.meta._evidenceQuality?.appliedParentGating);
    assert.ok(attached.meta._evidenceQuality?.gatingDecisions?.length > 0);
    const stripped = stripInternalReportPayloadFields(attached);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped.meta.evidenceQuality.appliedParentGating, undefined);
    assert.equal(stripped.meta.evidenceQuality.gatingDecisions, undefined);
  });

  test("patternDiagnostics suppressed when active gating applies topic suppression", () => {
    setBothMetadataFlags();
    const apiPayload = attachParentContextEvidenceQuality({
      ...activeGatingSuppressPayload(),
      parentFacing: { insights: [], homeRecommendations: [] },
    });
    assert.equal(shouldSuppressClientPatternDiagnostics(apiPayload), true);
    const client = {
      patternDiagnostics: { subjects: { math: { parentActionHe: "act" } } },
      analysis: { recommendations: [{ text: "rec" }] },
    };
    applyServerParentFacingAuthorityToClientReport(client, apiPayload);
    assert.equal(Object.keys(client.patternDiagnostics.subjects).length, 0);
  });

  test("non-diagnostic rows excluded from active gating", () => {
    setBothMetadataFlags();
    const payload = {
      summary: { diagnosticAnswers: 6 },
      subjects: {
        math: { diagnosticAnswers: 6, topics: { fractions: { diagnosticAnswers: 6 } } },
      },
      recentMistakes: [],
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.equal(internal.gatingDecisions, undefined);
    assert.equal(internal.appliedParentGating, undefined);
  });

  test("flag matrix - targeted parent gating simulation", () => {
    const raw = activeGatingSuppressPayload();
    clearMetadataFlags();
    const matrix = {
      bothOff: buildParentFacingBlocks(raw),
      metadataOnly: (() => {
        setMetadataOnlyFlag();
        return buildParentFacingBlocks(raw);
      })(),
      bothOn: (() => {
        setBothMetadataFlags();
        return buildParentFacingBlocks(attachParentContextEvidenceQuality(raw));
      })(),
    };
    assert.deepEqual(matrix.metadataOnly, matrix.bothOff);
    assert.notDeepEqual(matrix.bothOn.insights, matrix.bothOff.insights);
    assert.ok(matrix.bothOff.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.ok(!matrix.bothOn.insights.some((t) => t.includes("כדאי לשים לב")));
  });
});

describe("Q2-E.5-C1 - promotion candidate validation (shadow only)", () => {
  test("validates high-confidence subSkill recurrence candidate internally", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const validated = internal.validatedPromotionCandidates || [];
    assert.ok(
      validated.some(
        (c) => c.reason === "preliminary_topic_with_high_confidence_subskill_recurrence"
      )
    );
    assert.equal(internal.promotionValidation?.activePromotionApplied, false);
    assert.equal(internal.promotionValidation?.validatedCount >= 1, true);
  });

  test("validates high-confidence repeated errorPattern candidate internally", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(basePayload());
    const validated = internal.validatedPromotionCandidates || [];
    assert.ok(
      validated.some((c) => c.reason === "recurring_error_pattern_high_metadata_confidence")
    );
    const patternValidated = validated.find(
      (c) => c.reason === "recurring_error_pattern_high_metadata_confidence"
    );
    assert.equal(patternValidated?.validationOutcome, "validated");
    assert.equal(patternValidated?.validationReason, "high_confidence_error_pattern_recurrence");
  });

  test("rejects weak/fallback promotion candidate", () => {
    const result = validateShadowPromotionCandidates({
      shadowParentGating: {
        shadowPromotionCandidates: [
          {
            scope: "topic",
            topicKey: "math::fractions",
            subject: "math",
            topic: "fractions",
            reason: "preliminary_topic_with_high_confidence_subskill_recurrence",
            metadataSignals: { subSkillGroupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}` },
          },
        ],
      },
      internal: {
        bySubSkill: {
          [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
            subject: "math",
            topic: "fractions",
            groupingLevel: "topic",
            metadataConfidence: "low",
            metadataConfidenceCap: "low",
            effectiveConfidenceLevel: "insufficient_data",
            isMetadataWeak: true,
            recurrence: { met: true },
          },
        },
      },
      publicView: {
        byTopic: { "math::fractions": { dataSufficiency: "preliminary_signal" } },
      },
    });
    assert.equal(result.validatedPromotionCandidates.length, 0);
    assert.ok(result.rejectedPromotionCandidates.length > 0);
    assert.ok(
      result.rejectedPromotionCandidates.some((c) =>
        ["metadata_weak", "topic_only_metadata_rollup"].includes(c.validationReason)
      )
    );
  });

  test("rejects insufficient/no_data promotion candidate", () => {
    const result = validateShadowPromotionCandidates({
      shadowParentGating: {
        shadowPromotionCandidates: [
          {
            scope: "topic",
            topicKey: "math::fractions",
            reason: "preliminary_topic_with_high_confidence_subskill_recurrence",
            metadataSignals: { subSkillGroupKey: "math::fractions::frac_add_like" },
          },
        ],
      },
      internal: {
        bySubSkill: {
          "math::fractions::frac_add_like": {
            subject: "math",
            topic: "fractions",
            groupingLevel: "subSkill",
            metadataConfidenceCap: "high",
            effectiveConfidenceLevel: "moderate",
            isMetadataWeak: false,
            recurrence: { met: true },
          },
        },
      },
      publicView: {
        byTopic: { "math::fractions": { dataSufficiency: "insufficient_data" } },
      },
    });
    assert.equal(result.validatedPromotionCandidates.length, 0);
    assert.ok(
      result.rejectedPromotionCandidates.some(
        (c) => c.validationReason === "q1_topic_insufficient_or_no_data"
      )
    );
  });

  test("rejects unclassified questionType promotion candidate", () => {
    const result = validateShadowPromotionCandidates({
      shadowParentGating: {
        shadowPromotionCandidates: [
          {
            scope: "questionType",
            topicKey: "math::general",
            subject: "math",
            topic: "general",
            reason: "word_problem_weakness_while_technical_stable",
          },
        ],
      },
      internal: {
        questionTypes: {
          "math::general::unclassified": {
            subject: "math",
            topic: "general",
            questionType: "unclassified",
            isUnclassified: true,
            isMetadataWeak: true,
            metadataConfidenceCap: "low",
            effectiveConfidenceLevel: "insufficient_data",
            diagnosticWrong: 2,
          },
        },
        bySubSkill: {},
      },
      publicView: {
        byTopic: { "math::general": { dataSufficiency: "preliminary_signal" } },
      },
    });
    assert.equal(result.validatedPromotionCandidates.length, 0);
    assert.ok(
      result.rejectedPromotionCandidates.some((c) =>
        ["unclassified_question_type_dominant", "missing_question_type_contrast", "unclassified_question_type"].includes(
          c.validationReason
        )
      )
    );
  });

  test("public payload unchanged flag OFF vs ON with promotion validation", () => {
    clearMetadataFlags();
    const off = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(basePayload()).meta.evidenceQuality
    );
    process.env[FLAG_ENV] = "true";
    const on = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(basePayload()).meta.evidenceQuality
    );
    assert.deepEqual(on, off);
  });

  test("parent-facing blocks deep-equal with promotion validation internal only", () => {
    clearMetadataFlags();
    const offBlocks = buildParentFacingBlocks(basePayload());
    process.env[FLAG_ENV] = "true";
    const onBlocks = buildParentFacingBlocks(basePayload());
    assert.deepEqual(onBlocks, offBlocks);
  });

  test("no active promotion applied - gating and public sufficiency unchanged", () => {
    process.env[FLAG_ENV] = "true";
    const attached = attachParentContextEvidenceQuality(basePayload());
    assert.equal(attached.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency, "preliminary_signal");
    assert.equal(allowsStrongParentDiagnosisAtTopic(attached, "math", "fractions"), false);
    assert.equal(allowsStrongParentDiagnosisAtStudent(attached), false);
    assert.equal(allowsHedgedParentInsightAtStudent(attached), true);
    assert.equal(allowsHedgedParentTopicInsight(attached, "math", "fractions"), true);
    assert.equal(attached.meta._evidenceQuality?.promotionValidation?.activePromotionApplied, false);
    assert.equal(attached.meta._evidenceQuality?.gatingDecisions, undefined);
  });

  test("strip removes all promotion validation fields", () => {
    process.env[FLAG_ENV] = "true";
    const attached = attachParentContextEvidenceQuality(basePayload());
    assert.ok(attached.meta._evidenceQuality?.validatedPromotionCandidates?.length > 0);
    const stripped = stripInternalReportPayloadFields(attached);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped.meta.evidenceQuality.validatedPromotionCandidates, undefined);
    assert.equal(stripped.meta.evidenceQuality.rejectedPromotionCandidates, undefined);
    assert.equal(stripped.meta.evidenceQuality.promotionValidationReasons, undefined);
    assert.equal(stripped.meta.evidenceQuality.promotionValidation, undefined);
  });
});

describe("Q2-E.5-C2 - active parent promotion trial (flag-gated)", () => {
  function c2WordProblemContrastPayload() {
    return {
      summary: { diagnosticAnswers: 8, totalSessions: 2, totalAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          diagnosticAccuracy: 50,
          topics: {
            fractions: { diagnosticAnswers: 8, diagnosticWrong: 3, diagnosticAccuracy: 50 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m-wp1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
        {
          id: "m-wp2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_wp",
            subSkill: "frac_word_problem",
            questionType: "word_problem",
            metadataConfidence: "high",
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_word_problem": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::word_problem": {
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::technical": {
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        "math::fractions::frac_word_problem::word_problem": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 2,
        },
        "math::fractions::frac_add_like::technical": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
      },
    };
  }

  function insufficientStudentPromotablePayload() {
    return {
      summary: { diagnosticAnswers: 3, totalSessions: 2, totalAnswers: 3 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          diagnosticAccuracy: 50,
          topics: {
            fractions: {
              diagnosticAnswers: 8,
              diagnosticWrong: 4,
              diagnosticAccuracy: 50,
            },
          },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            questionType: "technical",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_denominator"],
          },
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            questionType: "technical",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_denominator"],
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_denominator"],
          groupingLevel: "subSkill",
          diagnosticAnswers: 8,
          diagnosticWrong: 2,
        },
      },
    };
  }

  function insufficientStudentErrorPatternPayload() {
    return {
      ...insufficientStudentPromotablePayload(),
      summary: { diagnosticAnswers: 3, totalSessions: 2, totalAnswers: 3 },
    };
  }

  describe("flag matrix", () => {
    test("all flags OFF - default unchanged", () => {
      clearMetadataFlags();
      assert.equal(isActiveMetadataParentPromotionEnabled(), false);
      const attached = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
      assert.equal(attached.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.equal(attached.meta._evidenceQuality?.appliedParentPromotion, undefined);
      assert.deepEqual(
        buildParentFacingBlocks(attached),
        buildParentFacingBlocks(insufficientStudentPromotablePayload())
      );
    });

    test("metadata flag ON only - internal only, no parent-facing promotion", () => {
      clearMetadataFlags();
      const offBlocks = buildParentFacingBlocks(insufficientStudentPromotablePayload());
      setMetadataOnlyFlag();
      const onBlocks = buildParentFacingBlocks(insufficientStudentPromotablePayload());
      const attached = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
      assert.deepEqual(onBlocks, offBlocks);
      assert.ok(attached.meta._evidenceQuality?.validatedPromotionCandidates?.length > 0);
      assert.equal(attached.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.equal(attached.meta._evidenceQuality?.appliedParentPromotion, undefined);
    });

    test("metadata + gating ON, promotion OFF - E.5-B suppression only, no promotion", () => {
      setBothMetadataFlags();
      const promotable = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
      assert.equal(promotable.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.equal(allowsStrongParentTopicInsight(promotable, "math", "fractions"), false);

      const suppress = attachParentContextEvidenceQuality({
        summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
        subjects: {
          math: {
            diagnosticAnswers: 12,
            diagnosticAccuracy: 42,
            topics: {
              fractions: { diagnosticAnswers: 12, diagnosticWrong: 7, diagnosticAccuracy: 42 },
            },
          },
        },
        recentMistakes: [
          {
            id: "m1",
            subject: "math",
            topic: "fractions",
            isCorrect: false,
            answeredAt: "2026-01-10T10:00:00Z",
          },
          {
            id: "m2",
            subject: "math",
            topic: "fractions",
            isCorrect: false,
            answeredAt: "2026-01-12T10:00:00Z",
          },
        ],
        _diagnosticSubSkillRollup: {
          [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
            subject: "math",
            topic: "fractions",
            metadataConfidence: "low",
            groupingLevel: "topic",
            diagnosticAnswers: 12,
            diagnosticWrong: 7,
          },
        },
        _diagnosticQuestionTypeRollup: {
          "math::fractions::unclassified": {
            subject: "math",
            topic: "fractions",
            questionType: "unclassified",
            metadataConfidence: "low",
            diagnosticAnswers: 12,
            diagnosticWrong: 7,
          },
        },
        _diagnosticQuestionTypeByGroupRollup: {
          [`math::fractions::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
            groupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}`,
            subject: "math",
            topic: "fractions",
            questionType: "unclassified",
            metadataConfidence: "low",
            groupingLevel: "topic",
            diagnosticAnswers: 12,
            diagnosticWrong: 7,
          },
        },
      });
      assert.equal(allowsStrongParentDiagnosisAtTopic(suppress, "math", "fractions"), false);
      assert.equal(suppress.meta._evidenceQuality?.promotionDecisions, undefined);
    });

    test("all three flags ON - promotion applies only to validated candidates", () => {
      const raw = insufficientStudentPromotablePayload();
      clearMetadataFlags();
      const allOff = attachParentContextEvidenceQuality(raw);
      setMetadataOnlyFlag();
      const metadataOnly = attachParentContextEvidenceQuality(raw);
      setBothMetadataFlags();
      const gatingOnly = attachParentContextEvidenceQuality(raw);
      setAllThreeMetadataFlags();
      const allOn = attachParentContextEvidenceQuality(raw);

      assert.equal(allOff.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.equal(metadataOnly.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.equal(gatingOnly.meta._evidenceQuality?.promotionDecisions, undefined);
      assert.ok(allOn.meta._evidenceQuality?.promotionDecisions?.length > 0);
      assert.ok(allOn.meta._evidenceQuality?.appliedParentPromotion?.promotionApplied > 0);

      const offBlocks = buildParentFacingBlocks(allOff);
      const onBlocks = buildParentFacingBlocks(allOn);
      assert.ok(!offBlocks.insights.some((t) => t.includes("כדאי לשים לב")));
      assert.ok(onBlocks.insights.some((t) => t.includes("כדאי לשים לב")));
      assertPromotionUsesExistingHebrewOnly(offBlocks.insights, onBlocks.insights);
    });
  });

  describe("active promotion positive cases", () => {
  test("validated subSkill recurrence enables allowsStrongParentTopicInsight", () => {
    setBothMetadataFlags();
    const withoutPromotion = buildParentFacingBlocks(
      attachParentContextEvidenceQuality(insufficientStudentPromotablePayload())
    );
    setAllThreeMetadataFlags();
    const attached = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
    const withPromotion = buildParentFacingBlocks(attached);

    assert.ok(attached.meta._evidenceQuality?.promotionDecisions?.length > 0);
    assert.ok(
      attached.meta._evidenceQuality.promotionDecisions.some(
        (d) => d.validationReason === "high_confidence_subskill_recurrence"
      )
    );
    assert.equal(allowsStrongParentTopicInsight(attached, "math", "fractions"), true);
    assert.ok(!withoutPromotion.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.ok(withPromotion.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.equal(
      attached.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency,
      "preliminary_signal"
    );
    assert.equal(attached.meta.evidenceQuality.student.dataSufficiency, "insufficient_data");
  });

  test("validated error-pattern recurrence retains pattern diagnostics", () => {
    setAllThreeMetadataFlags();
    const attached = attachParentContextEvidenceQuality({
      ...insufficientStudentErrorPatternPayload(),
      summary: { diagnosticAnswers: 3, totalSessions: 2, totalAnswers: 20 },
      parentFacing: { insights: [], homeRecommendations: [] },
    });
    assert.ok(
      attached.meta._evidenceQuality?.promotionDecisions?.some(
        (d) => d.validationReason === "high_confidence_error_pattern_recurrence"
      )
    );
    assert.equal(shouldSuppressClientPatternDiagnostics(attached), false);
    const client = {
      patternDiagnostics: { subjects: { math: { parentActionHe: "act" } } },
      analysis: { recommendations: [{ text: "rec" }] },
    };
    applyServerParentFacingAuthorityToClientReport(client, attached);
    assert.equal(Object.keys(client.patternDiagnostics.subjects).length, 1);
    assert.equal(attached.meta.evidenceQuality.student.dataSufficiency, "insufficient_data");
  });
  });

  describe("rejected promotion cases", () => {
  test("no_data never promotes", () => {
    setAllThreeMetadataFlags();
    const { internal, public: pub } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 0, totalSessions: 0, totalAnswers: 0 },
      subjects: {},
      recentMistakes: [],
    });
    assert.equal(pub.student.dataSufficiency, "no_data");
    assert.equal(internal.promotionDecisions, undefined);
    assert.equal(internal.appliedParentPromotion, undefined);
  });

  test("insufficient_data never promotes", () => {
    setAllThreeMetadataFlags();
    const payload = {
      summary: { diagnosticAnswers: 3 },
      subjects: {
        math: {
          diagnosticAnswers: 3,
          topics: { fractions: { diagnosticAnswers: 3, diagnosticWrong: 2, diagnosticAccuracy: 33 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 3,
          diagnosticWrong: 2,
        },
      },
    };
    const { internal, public: pub } = computeParentContextEvidenceQuality(payload);
    assert.equal(pub.byTopic["math::fractions"].dataSufficiency, "insufficient_data");
    assert.equal(internal.promotionDecisions, undefined);
  });

  test("weak metadata never promotes", () => {
    setAllThreeMetadataFlags();
    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          topics: { fractions: { diagnosticAnswers: 8, diagnosticWrong: 3, diagnosticAccuracy: 50 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 8,
          diagnosticWrong: 3,
        },
      },
    });
    assert.equal(internal.promotionDecisions, undefined);
  });

  test("fallback/topic-only metadata never promotes", () => {
    setAllThreeMetadataFlags();
    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          topics: { fractions: { diagnosticAnswers: 8, diagnosticWrong: 3, diagnosticAccuracy: 50 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          skillId: "eng_translation_general",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 8,
          diagnosticWrong: 3,
        },
      },
    });
    assert.equal(internal.promotionDecisions, undefined);
  });

  test("unclassified questionType never promotes in C2", () => {
    setAllThreeMetadataFlags();
    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          topics: { general: { diagnosticAnswers: 8, diagnosticWrong: 2 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "general",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 8,
          diagnosticWrong: 2,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::general::unclassified": {
          subject: "math",
          topic: "general",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 8,
          diagnosticWrong: 2,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::general::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "general",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 8,
          diagnosticWrong: 2,
        },
      },
    });
    assert.equal(internal.promotionDecisions, undefined);
  });

  test("single-day recurrence never promotes", () => {
    setAllThreeMetadataFlags();
    const payload = {
      summary: { diagnosticAnswers: 8, totalSessions: 1, totalAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          topics: { fractions: { diagnosticAnswers: 8, diagnosticWrong: 2, diagnosticAccuracy: 50 } },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_numerator"],
          },
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T11:00:00Z",
          _canonicalMeta: {
            skillId: "math_frac_add_like",
            subSkill: "frac_add_like",
            metadataConfidence: "high",
            possibleErrorPatterns: ["wrong_numerator"],
          },
        },
      ],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          metadataConfidence: "high",
          possibleErrorPatterns: ["wrong_numerator"],
          groupingLevel: "subSkill",
          diagnosticAnswers: 8,
          diagnosticWrong: 2,
        },
      },
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.equal(internal.promotionDecisions, undefined);
  });

  test("unknown validation reason never promotes", () => {
    const applied = applyActiveParentPromotion({
      validatedPromotionCandidates: [
        {
          scope: "topic",
          topicKey: "math::fractions",
          validationOutcome: "validated",
          validationReason: "bogus_unknown_reason",
          reason: "preliminary_topic_with_high_confidence_subskill_recurrence",
          metadataSignals: { subSkillGroupKey: "math::fractions::frac_add_like" },
        },
      ],
      internal: {
        bySubSkill: {
          "math::fractions::frac_add_like": {
            subject: "math",
            topic: "fractions",
            groupingLevel: "subSkill",
            metadataConfidenceCap: "high",
            effectiveConfidenceLevel: "moderate",
            isMetadataWeak: false,
            recurrence: { met: true },
          },
        },
      },
      publicView: {
        byTopic: { "math::fractions": { dataSufficiency: "preliminary_signal" } },
      },
    });
    assert.equal(applied.promotionDecisions.length, 0);
    assert.equal(applied.appliedParentPromotion.promotionApplied, 0);
  });

  test("word_problem_contrast_while_technical_stable does not promote in E.5-C2", () => {
    setAllThreeMetadataFlags();
    const { internal } = computeParentContextEvidenceQuality(c2WordProblemContrastPayload());
    const validated = internal.validatedPromotionCandidates || [];
    const wpShadow = validated.filter(
      (c) => c.validationReason === "word_problem_contrast_while_technical_stable"
    );
    if (wpShadow.length > 0) {
      assert.ok(wpShadow.every((c) => c.validationOutcome === "validated"));
    }
    const decisions = internal.promotionDecisions || [];
    assert.ok(
      !decisions.some(
        (d) =>
          d.validationReason === "word_problem_contrast_while_technical_stable" ||
          d.shadowReason === "word_problem_weakness_while_technical_stable"
      )
    );
  });
  });

  describe("public API and sanitization", () => {
  test("public meta.evidenceQuality shape unchanged with promotion ON", () => {
    clearMetadataFlags();
    const offEq = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(basePayload()).meta.evidenceQuality
    );
    setAllThreeMetadataFlags();
    const attached = attachParentContextEvidenceQuality(basePayload());
    const onEq = publicEvidenceQualityShape(attached.meta.evidenceQuality);
    assert.deepEqual(onEq, offEq);
    assert.equal(onEq.byTopic["math::fractions"].dataSufficiency, "preliminary_signal");
    assert.equal(onEq.student.dataSufficiency, "preliminary_signal");
  });

  test("strip removes internal promotion fields and forbidden public leaks", () => {
    setAllThreeMetadataFlags();
    const attached = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
    assert.ok(attached.meta._evidenceQuality?.appliedParentPromotion);
    assert.ok(attached.meta._evidenceQuality?.promotionDecisions?.length > 0);
    assertStrippedPublicPromotionSanitized(stripInternalReportPayloadFields(attached));
  });
  });

  describe("parent-facing behavior", () => {
  test("no new Hebrew copy - promotion reuses existing topic-insight template only", () => {
    clearMetadataFlags();
    const before = buildParentFacingBlocks(insufficientStudentPromotablePayload());
    setAllThreeMetadataFlags();
    const after = buildParentFacingBlocks(
      attachParentContextEvidenceQuality(insufficientStudentPromotablePayload())
    );
    assertPromotionUsesExistingHebrewOnly(before.insights, after.insights);
    const topicLines = after.insights.filter((t) => t.includes("כדאי לשים לב"));
    assert.equal(topicLines.length, 1);
    assert.match(topicLines[0], EXISTING_TOPIC_INSIGHT_RE);
  });

  test("parent-facing blocks change only in expected active-promotion case", () => {
    const raw = insufficientStudentPromotablePayload();
    clearMetadataFlags();
    const baseline = buildParentFacingBlocks(raw);
    setAllThreeMetadataFlags();
    const promoted = buildParentFacingBlocks(attachParentContextEvidenceQuality(raw));
    assert.notDeepEqual(promoted.insights, baseline.insights);
    assert.deepEqual(promoted.homeRecommendations, baseline.homeRecommendations);
  });
  });

  describe("regression", () => {
  test("E.5-B suppression still works when promotion flag OFF", () => {
    setBothMetadataFlags();
    const payload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          diagnosticAccuracy: 42,
          topics: {
            fractions: { diagnosticAnswers: 12, diagnosticWrong: 7, diagnosticAccuracy: 42 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
        },
      ],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::unclassified": {
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
    });
    assert.equal(allowsStrongParentDiagnosisAtTopic(payload, "math", "fractions"), false);
    assert.equal(payload.meta._evidenceQuality?.promotionDecisions, undefined);
  });

  test("E.5-B suppression wins over C2 on supported weak metadata when all flags ON", () => {
    setAllThreeMetadataFlags();
    const payload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          diagnosticAccuracy: 42,
          topics: {
            fractions: { diagnosticAnswers: 12, diagnosticWrong: 7, diagnosticAccuracy: 42 },
          },
        },
      },
      recentMistakes: [
        {
          id: "m1",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-10T10:00:00Z",
        },
        {
          id: "m2",
          subject: "math",
          topic: "fractions",
          isCorrect: false,
          answeredAt: "2026-01-12T10:00:00Z",
        },
      ],
      _diagnosticSubSkillRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "fractions",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeRollup: {
        "math::fractions::unclassified": {
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
      _diagnosticQuestionTypeByGroupRollup: {
        [`math::fractions::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::fractions::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "fractions",
          questionType: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 12,
          diagnosticWrong: 7,
        },
      },
    });
    assert.equal(payload.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency, "supported_diagnosis");
    assert.equal(allowsStrongParentDiagnosisAtTopic(payload, "math", "fractions"), false);
    assert.equal(payload.meta._evidenceQuality?.promotionDecisions, undefined);
  });

  test("public dataSufficiency unchanged - promotion does not override classification", () => {
    setAllThreeMetadataFlags();
    const attached = attachParentContextEvidenceQuality(insufficientStudentPromotablePayload());
    assert.equal(attached.meta.evidenceQuality.student.dataSufficiency, "insufficient_data");
    assert.equal(attached.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency, "preliminary_signal");
  });

  test("non-diagnostic rows excluded from active promotion", () => {
    setAllThreeMetadataFlags();
    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 6 },
      subjects: {
        math: { diagnosticAnswers: 6, topics: { fractions: { diagnosticAnswers: 6 } } },
      },
      recentMistakes: [],
    });
    assert.equal(internal.promotionDecisions, undefined);
  });
  });

  test("all-three-flags targeted promotion simulation", () => {
    const raw = insufficientStudentPromotablePayload();
    clearMetadataFlags();
    const sim = {
      allFlagsOff: {
        blocks: buildParentFacingBlocks(raw),
        attached: attachParentContextEvidenceQuality(raw),
      },
      metadataOnly: (() => {
        setMetadataOnlyFlag();
        return {
          blocks: buildParentFacingBlocks(raw),
          attached: attachParentContextEvidenceQuality(raw),
        };
      })(),
      gatingOnly: (() => {
        setBothMetadataFlags();
        return {
          blocks: buildParentFacingBlocks(attachParentContextEvidenceQuality(raw)),
          attached: attachParentContextEvidenceQuality(raw),
        };
      })(),
      allThreeOn: (() => {
        setAllThreeMetadataFlags();
        const attached = attachParentContextEvidenceQuality(raw);
        return { blocks: buildParentFacingBlocks(attached), attached };
      })(),
    };

    assert.equal(sim.allFlagsOff.attached.meta._evidenceQuality?.promotionDecisions, undefined);
    assert.equal(sim.metadataOnly.attached.meta._evidenceQuality?.promotionDecisions, undefined);
    assert.equal(sim.gatingOnly.attached.meta._evidenceQuality?.promotionDecisions, undefined);
    assert.ok(sim.allThreeOn.attached.meta._evidenceQuality?.promotionDecisions?.length > 0);

    assert.deepEqual(sim.metadataOnly.blocks, sim.allFlagsOff.blocks);
    assert.deepEqual(sim.gatingOnly.blocks.insights, sim.allFlagsOff.blocks.insights);
    assert.ok(!sim.allFlagsOff.blocks.insights.some((t) => t.includes("כדאי לשים לב")));
    assert.ok(sim.allThreeOn.blocks.insights.some((t) => t.includes("כדאי לשים לב")));
    assertPromotionUsesExistingHebrewOnly(
      sim.allFlagsOff.blocks.insights,
      sim.allThreeOn.blocks.insights
    );
    assert.equal(
      sim.allThreeOn.attached.meta.evidenceQuality.byTopic["math::fractions"].dataSufficiency,
      "preliminary_signal"
    );
    assertStrippedPublicPromotionSanitized(
      stripInternalReportPayloadFields(sim.allThreeOn.attached)
    );
  });
});

describe("Q2-E.6 - problemClass / difficultyDepth internal analysis (flag-gated)", () => {
  function mathMixedPedagogyPayload() {
    return {
      summary: { diagnosticAnswers: 10, totalSessions: 2, totalAnswers: 10 },
      subjects: {
        math: {
          diagnosticAnswers: 10,
          topics: { fractions: { diagnosticAnswers: 10, diagnosticWrong: 2 } },
        },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "math::fractions::frac_add_like": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_add_like",
          subSkill: "frac_add_like",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::frac_word_problem": {
          subject: "math",
          topic: "fractions",
          skillId: "math_frac_wp",
          subSkill: "frac_word_problem",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticProblemClassRollup: {
        "math::fractions::procedural": {
          subject: "math",
          topic: "fractions",
          problemClass: "procedural",
          questionType: "technical",
          metadataConfidence: "high",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::mixed": {
          subject: "math",
          topic: "fractions",
          problemClass: "mixed",
          questionType: "word_problem",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticDifficultyDepthRollup: {
        "math::fractions::recall": {
          subject: "math",
          topic: "fractions",
          difficultyDepth: "recall",
          questionType: "technical",
          metadataConfidence: "high",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::multi_step": {
          subject: "math",
          topic: "fractions",
          difficultyDepth: "multi_step",
          questionType: "word_problem",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticProblemClassByGroupRollup: {
        "math::fractions::frac_add_like::procedural": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          problemClass: "procedural",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::frac_word_problem::mixed": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          problemClass: "mixed",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
      _diagnosticDifficultyDepthByGroupRollup: {
        "math::fractions::frac_add_like::recall": {
          groupKey: "math::fractions::frac_add_like",
          subject: "math",
          topic: "fractions",
          difficultyDepth: "recall",
          questionType: "technical",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 6,
          diagnosticWrong: 1,
        },
        "math::fractions::frac_word_problem::multi_step": {
          groupKey: "math::fractions::frac_word_problem",
          subject: "math",
          topic: "fractions",
          difficultyDepth: "multi_step",
          questionType: "word_problem",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 1,
        },
      },
    };
  }

  test("normalizeProblemClass and normalizeDifficultyDepth reject unknown values", () => {
    assert.equal(normalizeProblemClass("procedural"), "procedural");
    assert.equal(normalizeProblemClass("conceptual"), "conceptual");
    assert.equal(normalizeProblemClass("mixed"), "mixed");
    assert.equal(normalizeProblemClass("unknown"), null);
    assert.equal(problemClassBucket(null), "unclassified");

    assert.equal(normalizeDifficultyDepth("recall"), "recall");
    assert.equal(normalizeDifficultyDepth("multi_step"), "multi_step");
    assert.equal(normalizeDifficultyDepth("inference"), "inference");
    assert.equal(normalizeDifficultyDepth(null), null);
    assert.equal(difficultyDepthBucket(undefined), "unclassified");
  });

  test("problemClass breakdown exists internally - procedural vs mixed", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(mathMixedPedagogyPayload());
    assert.ok(internal.problemClasses?.["math::fractions::procedural"]);
    assert.ok(internal.problemClasses?.["math::fractions::mixed"]);
    assert.equal(internal.problemClasses["math::fractions::procedural"].problemClass, "procedural");
    assert.equal(internal.problemClasses["math::fractions::mixed"].problemClass, "mixed");

    const techGroup = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.equal(techGroup.problemClassBreakdown?.procedural?.problemClass, "procedural");
    assert.equal(techGroup.problemClassBreakdown?.mixed, undefined);

    const wpGroup = internal.bySubSkill?.["math::fractions::frac_word_problem"];
    assert.equal(wpGroup.problemClassBreakdown?.mixed?.problemClass, "mixed");
  });

  test("difficultyDepth breakdown exists internally - recall vs multi_step", () => {
    process.env[FLAG_ENV] = "true";
    const { internal } = computeParentContextEvidenceQuality(mathMixedPedagogyPayload());
    assert.ok(internal.difficultyDepths?.["math::fractions::recall"]);
    assert.ok(internal.difficultyDepths?.["math::fractions::multi_step"]);
    assert.equal(internal.difficultyDepths["math::fractions::recall"].difficultyDepth, "recall");
    assert.equal(
      internal.difficultyDepths["math::fractions::multi_step"].difficultyDepth,
      "multi_step"
    );

    const techGroup = internal.bySubSkill?.["math::fractions::frac_add_like"];
    assert.equal(techGroup.difficultyDepthBreakdown?.recall?.difficultyDepth, "recall");

    const wpGroup = internal.bySubSkill?.["math::fractions::frac_word_problem"];
    assert.equal(wpGroup.difficultyDepthBreakdown?.multi_step?.difficultyDepth, "multi_step");
  });

  test("geometry procedural/visual and language reading/grammar separated internally", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 12 },
      subjects: {
        geometry: { diagnosticAnswers: 4, topics: { shapes: { diagnosticAnswers: 4 } } },
        english: { diagnosticAnswers: 8, topics: { reading: { diagnosticAnswers: 8 } } },
      },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        "geometry::shapes::square_area": {
          subject: "geometry",
          topic: "shapes",
          skillId: "geo_area_square_formula",
          subSkill: "square_area",
          questionType: "visual",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
        "english::reading::comp_main_idea": {
          subject: "english",
          topic: "reading",
          skillId: "en_reading_main_idea",
          subSkill: "comp_main_idea",
          questionType: "reading_comprehension",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
      },
      _diagnosticProblemClassRollup: {
        "geometry::shapes::procedural": {
          subject: "geometry",
          topic: "shapes",
          problemClass: "procedural",
          questionType: "visual",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
        "english::reading::conceptual": {
          subject: "english",
          topic: "reading",
          problemClass: "conceptual",
          questionType: "reading_comprehension",
          metadataConfidence: "high",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
        "english::reading::procedural": {
          subject: "english",
          topic: "reading",
          problemClass: "procedural",
          questionType: "grammar",
          metadataConfidence: "high",
          diagnosticAnswers: 3,
          diagnosticWrong: 0,
        },
      },
      _diagnosticDifficultyDepthRollup: {
        "geometry::shapes::recall": {
          subject: "geometry",
          topic: "shapes",
          difficultyDepth: "recall",
          questionType: "visual",
          metadataConfidence: "high",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
        "english::reading::inference": {
          subject: "english",
          topic: "reading",
          difficultyDepth: "inference",
          questionType: "reading_comprehension",
          metadataConfidence: "high",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
        "english::reading::simple_application": {
          subject: "english",
          topic: "reading",
          difficultyDepth: "simple_application",
          questionType: "grammar",
          metadataConfidence: "high",
          diagnosticAnswers: 3,
          diagnosticWrong: 0,
        },
      },
      _diagnosticProblemClassByGroupRollup: {
        "geometry::shapes::square_area::procedural": {
          groupKey: "geometry::shapes::square_area",
          subject: "geometry",
          topic: "shapes",
          problemClass: "procedural",
          questionType: "visual",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
        "english::reading::comp_main_idea::conceptual": {
          groupKey: "english::reading::comp_main_idea",
          subject: "english",
          topic: "reading",
          problemClass: "conceptual",
          questionType: "reading_comprehension",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
      },
      _diagnosticDifficultyDepthByGroupRollup: {
        "geometry::shapes::square_area::recall": {
          groupKey: "geometry::shapes::square_area",
          subject: "geometry",
          topic: "shapes",
          difficultyDepth: "recall",
          questionType: "visual",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 4,
          diagnosticWrong: 0,
        },
        "english::reading::comp_main_idea::inference": {
          groupKey: "english::reading::comp_main_idea",
          subject: "english",
          topic: "reading",
          difficultyDepth: "inference",
          questionType: "reading_comprehension",
          metadataConfidence: "high",
          groupingLevel: "subSkill",
          diagnosticAnswers: 5,
          diagnosticWrong: 1,
        },
      },
    };
    const { internal } = computeParentContextEvidenceQuality(payload);
    assert.equal(internal.problemClasses?.["geometry::shapes::procedural"]?.questionType, "visual");
    assert.equal(
      internal.problemClasses?.["english::reading::conceptual"]?.questionType,
      "reading_comprehension"
    );
    assert.equal(internal.difficultyDepths?.["english::reading::inference"]?.difficultyDepth, "inference");
    assert.equal(
      internal.bySubSkill?.["geometry::shapes::square_area"]?.problemClassBreakdown?.procedural
        ?.problemClass,
      "procedural"
    );
  });

  test("missing/unknown problemClass and difficultyDepth bucket unclassified with conservative cap", () => {
    process.env[FLAG_ENV] = "true";
    const payload = {
      summary: { diagnosticAnswers: 3 },
      subjects: { math: { diagnosticAnswers: 3, topics: { general: { diagnosticAnswers: 3 } } } },
      recentMistakes: [],
      _diagnosticSubSkillRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}`]: {
          subject: "math",
          topic: "general",
          skillId: "math_general",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticProblemClassRollup: {
        "math::general::unclassified": {
          subject: "math",
          topic: "general",
          problemClass: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticDifficultyDepthRollup: {
        "math::general::unclassified": {
          subject: "math",
          topic: "general",
          difficultyDepth: "unclassified",
          metadataConfidence: "low",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticProblemClassByGroupRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::general::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "general",
          problemClass: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
      _diagnosticDifficultyDepthByGroupRollup: {
        [`math::general::${TOPIC_ROLLUP_TOKEN}::unclassified`]: {
          groupKey: `math::general::${TOPIC_ROLLUP_TOKEN}`,
          subject: "math",
          topic: "general",
          difficultyDepth: "unclassified",
          metadataConfidence: "low",
          groupingLevel: "topic",
          diagnosticAnswers: 3,
          diagnosticWrong: 1,
        },
      },
    };
    const entry = computeParentContextEvidenceQuality(payload).internal.problemClasses?.[
      "math::general::unclassified"
    ];
    assert.ok(entry);
    assert.equal(entry.isUnclassified, true);
    assert.equal(entry.isMetadataWeak, true);
    assert.ok(entry.metadataConfidenceReason.includes("missing_problem_class"));

    const depthEntry =
      computeParentContextEvidenceQuality(payload).internal.difficultyDepths?.[
        "math::general::unclassified"
      ];
    assert.ok(depthEntry);
    assert.equal(depthEntry.isUnclassified, true);
    assert.ok(depthEntry.metadataConfidenceReason.includes("missing_difficulty_depth"));
  });

  test("public meta.evidenceQuality shape unchanged flag OFF vs ON with E.6 internal", () => {
    delete process.env[FLAG_ENV];
    const off = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(mathMixedPedagogyPayload()).meta.evidenceQuality
    );
    process.env[FLAG_ENV] = "true";
    const on = publicEvidenceQualityShape(
      attachParentContextEvidenceQuality(mathMixedPedagogyPayload()).meta.evidenceQuality
    );
    assert.deepEqual(on, off);
  });

  test("public dataSufficiency unchanged with E.6 internal only", () => {
    delete process.env[FLAG_ENV];
    const off = computeParentContextEvidenceQuality(mathMixedPedagogyPayload()).public;
    process.env[FLAG_ENV] = "true";
    const on = computeParentContextEvidenceQuality(mathMixedPedagogyPayload()).public;
    assert.deepEqual(on.student.dataSufficiency, off.student.dataSufficiency);
    assert.deepEqual(on.byTopic, off.byTopic);
  });

  test("parent-facing blocks unchanged when E.6 flag ON (no active C2 promotion)", () => {
    delete process.env[FLAG_ENV];
    const offBlocks = buildParentFacingBlocks(mathMixedPedagogyPayload());
    setMetadataOnlyFlag();
    const onBlocks = buildParentFacingBlocks(
      attachParentContextEvidenceQuality(mathMixedPedagogyPayload())
    );
    assert.deepEqual(onBlocks, offBlocks);
  });

  test("strip removes all E.6 internal fields and aggregation rollups", () => {
    process.env[FLAG_ENV] = "true";
    const attached = attachParentContextEvidenceQuality(mathMixedPedagogyPayload());
    assert.ok(attached.meta._evidenceQuality?.problemClasses);
    assert.ok(attached.meta._evidenceQuality?.difficultyDepths);
    assert.ok(
      attached.meta._evidenceQuality?.bySubSkill?.["math::fractions::frac_add_like"]
        ?.problemClassBreakdown
    );

    const stripped = stripInternalReportPayloadFields(attached);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.equal(stripped._diagnosticProblemClassRollup, undefined);
    assert.equal(stripped._diagnosticProblemClassByGroupRollup, undefined);
    assert.equal(stripped._diagnosticDifficultyDepthRollup, undefined);
    assert.equal(stripped._diagnosticDifficultyDepthByGroupRollup, undefined);
    assert.equal(stripped.meta.evidenceQuality.problemClasses, undefined);
    assert.equal(stripped.meta.evidenceQuality.difficultyDepths, undefined);
  });

  test("non-diagnostic rows excluded from E.6 summaries", () => {
    process.env[FLAG_ENV] = "true";
    const meta = resolveCanonicalMetadataFromAnswerSnapshot(
      {
        params: {
          canonicalMetadata: {
            problemClass: "conceptual",
            difficultyDepth: "inference",
            skillId: "en_reading",
            metadataConfidence: "high",
          },
        },
      },
      { isDiagnosticEligible: false }
    );
    assert.equal(meta, null);
    const { internal } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 0 },
      subjects: {},
      recentMistakes: [],
    });
    assert.equal(internal.problemClasses, undefined);
    assert.equal(internal.difficultyDepths, undefined);
  });
});

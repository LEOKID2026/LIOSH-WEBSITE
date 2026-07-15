/**
 * Phase Q1 — Evidence quality layer + parent-facing gating
 * Run: node --test tests/learning/evidence-quality-layer.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DATA_SUFFICIENCY,
  resolveDataSufficiency,
  meetsDiagnosticRecurrence,
  computeParentContextEvidenceQuality,
  attachParentContextEvidenceQuality,
  allowsStrongParentDiagnosisAtStudent,
  allowsHedgedParentInsightAtStudent,
  shouldSuppressClientPatternDiagnostics,
} from "../../lib/learning/evidence-quality.js";

import {
  classifyParentEvidenceTier,
  PARENT_EVIDENCE_TIER,
  PARENT_EVIDENCE_VOLUME,
} from "../../utils/parent-report-language/parent-evidence-matrix.js";

import { confidenceLevelParentSummaryHe } from "../../utils/parent-report-language/confidence-parent-he.js";

import {
  isSourceAllowedInContext,
  diagnosticWeightForCategory,
} from "../../lib/learning/diagnostic-evidence-contract.js";

import {
  buildParentInsightsHe,
  buildParentFacingBlocks,
} from "../../lib/parent-server/parent-report-parent-facing.server.js";

import {
  insightsContainThinDataContradiction,
  insightsContainCautiousTopicSignal,
  insightsContainStrongDiagnosisLeak,
  insightsContainTechnicalLeak,
} from "../../lib/learning/evidence-quality-insight-copy.js";

import {
  applyServerParentFacingAuthorityToClientReport,
} from "../../lib/parent-server/parent-facing-report-authority.js";

import { stripInternalReportPayloadFields } from "../../lib/parent-server/report-data-aggregate.server.js";

describe("Phase 4 - unified evidence matrix", () => {
  test("tier classification aligns 5 / 8 / 12 / 15 roles", () => {
    assert.equal(classifyParentEvidenceTier(0), PARENT_EVIDENCE_TIER.none);
    assert.equal(classifyParentEvidenceTier(4), PARENT_EVIDENCE_TIER.insufficient);
    assert.equal(classifyParentEvidenceTier(5), PARENT_EVIDENCE_TIER.preliminary);
    assert.equal(classifyParentEvidenceTier(7), PARENT_EVIDENCE_TIER.preliminary);
    assert.equal(classifyParentEvidenceTier(8), PARENT_EVIDENCE_TIER.insight);
    assert.equal(classifyParentEvidenceTier(11), PARENT_EVIDENCE_TIER.insight);
    assert.equal(classifyParentEvidenceTier(12), PARENT_EVIDENCE_TIER.strong);
    assert.equal(PARENT_EVIDENCE_VOLUME.STUDENT_REPORT_THIN_MAX, 15);
  });

  test("confidence high wording hedged below strong threshold", () => {
    const hedged = confidenceLevelParentSummaryHe("high", 8);
    assert.match(hedged, /כיוון ראשוני/u);
    assert.ok(!hedged.includes("כיוון עקבי"));
    const strong = confidenceLevelParentSummaryHe("high", 12);
    assert.match(strong, /כיוון עקבי/u);
  });
});

describe("Phase Q1 - sufficiency thresholds", () => {
  test("0 = no_data", () => {
    assert.equal(resolveDataSufficiency(0, false), DATA_SUFFICIENCY.NO_DATA);
  });

  test("1–4 = insufficient_data", () => {
    assert.equal(resolveDataSufficiency(1, false), DATA_SUFFICIENCY.INSUFFICIENT);
    assert.equal(resolveDataSufficiency(4, false), DATA_SUFFICIENCY.INSUFFICIENT);
  });

  test("5–11 = preliminary_signal", () => {
    assert.equal(resolveDataSufficiency(5, false), DATA_SUFFICIENCY.PRELIMINARY);
    assert.equal(resolveDataSufficiency(11, false), DATA_SUFFICIENCY.PRELIMINARY);
  });

  test("12+ without recurrence stays preliminary", () => {
    assert.equal(resolveDataSufficiency(12, false), DATA_SUFFICIENCY.PRELIMINARY);
    assert.equal(resolveDataSufficiency(20, false), DATA_SUFFICIENCY.PRELIMINARY);
  });

  test("12+ with recurrence = supported_diagnosis", () => {
    assert.equal(resolveDataSufficiency(12, true), DATA_SUFFICIENCY.SUPPORTED);
  });
});

describe("Phase Q1 - recurrence", () => {
  test("recurrence requires 2+ wrongs on 2+ distinct days", () => {
    const met = meetsDiagnosticRecurrence([
      { isCorrect: false, answeredAt: "2026-01-10T10:00:00Z" },
      { isCorrect: false, answeredAt: "2026-01-12T10:00:00Z" },
    ]);
    assert.equal(met, true);
  });

  test("single-day wrongs do not meet recurrence", () => {
    const met = meetsDiagnosticRecurrence([
      { isCorrect: false, answeredAt: "2026-01-10T10:00:00Z" },
      { isCorrect: false, answeredAt: "2026-01-10T11:00:00Z" },
    ]);
    assert.equal(met, false);
  });
});

describe("Phase Q1 - parent context policy", () => {
  test("parent context allows free_practice and assigned_parent only", () => {
    assert.equal(isSourceAllowedInContext("free_practice", "parent"), true);
    assert.equal(isSourceAllowedInContext("assigned_parent", "parent"), true);
    assert.equal(isSourceAllowedInContext("assigned_class", "parent"), false);
  });

  test("competitive category has reduced weight not zero", () => {
    assert.ok(diagnosticWeightForCategory("diagnostic_competitive") > 0);
    assert.equal(diagnosticWeightForCategory("learning_context"), 0);
  });
});

describe("Phase Q1 - traceability and strip", () => {
  test("internal trace ids present; public meta has no supportingEvidenceIds", () => {
    const payload = {
      summary: { diagnosticAnswers: 6, totalSessions: 2, totalAnswers: 6 },
      subjects: {
        math: {
          diagnosticAnswers: 6,
          topics: {
            fractions: { diagnosticAnswers: 6, diagnosticWrong: 2 },
          },
        },
      },
      recentMistakes: [
        { id: "m1", subject: "math", topic: "fractions", answeredAt: "2026-01-10T10:00:00Z" },
        { id: "m2", subject: "math", topic: "fractions", answeredAt: "2026-01-12T10:00:00Z" },
      ],
      meta: { version: "test" },
    };

    const attached = attachParentContextEvidenceQuality(payload);
    assert.ok(attached.meta._evidenceQuality.student.supportingEvidenceIds.length >= 2);
    assert.equal(attached.meta.evidenceQuality.context, "parent");
    assert.equal(attached.meta.evidenceQuality.student.dataSufficiency, DATA_SUFFICIENCY.PRELIMINARY);

    const stripped = stripInternalReportPayloadFields(attached);
    assert.equal(stripped.meta._evidenceQuality, undefined);
    assert.ok(stripped.meta.evidenceQuality);
    assert.equal(stripped.meta.evidenceQuality.student.supportingEvidenceIds, undefined);
    assert.equal(stripped.meta.evidenceQuality.student.sourceBreakdown, undefined);
    assert.equal(stripped.meta.evidenceQuality.context, "parent");
    assert.deepEqual(Object.keys(stripped.meta.evidenceQuality.student).sort(), [
      "confidenceLevel",
      "confidenceReason",
      "dataSufficiency",
      "evidenceCount",
      "rawDiagnosticCount",
      "recurrenceMet",
    ]);
  });
});

describe("Phase Q1 - parent-facing gating (suppression only)", () => {
  test("insufficient data suppresses strong Hebrew insights", () => {
    const payload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 3, totalSessions: 2, totalAnswers: 3 },
      subjects: {
        math: {
          diagnosticAnswers: 3,
          diagnosticAccuracy: 33,
          topics: {
            fractions: { diagnosticAnswers: 3, diagnosticAccuracy: 33 },
          },
        },
      },
      recentMistakes: [{ id: "m1", subject: "math", topic: "fractions" }],
      dailyActivity: [{ date: "2026-01-10", answers: 3, correct: 1 }],
    });

    const insights = buildParentInsightsHe(payload);
    assert.equal(allowsStrongParentDiagnosisAtStudent(payload), false);
    assert.ok(!insights.some((t) => t.includes("נראה שיש קושי")));
    assert.ok(!insights.some((t) => t.includes("כדאי לשים לב ל")));
    assert.ok(insights.length > 0);
  });

  test("insight tier (8–11) allows hedged Hebrew only", () => {
    const payload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 8, totalSessions: 3, totalAnswers: 8 },
      subjects: {
        math: {
          diagnosticAnswers: 8,
          diagnosticAccuracy: 50,
          topics: {
            fractions: { diagnosticAnswers: 8, diagnosticAccuracy: 50 },
          },
        },
      },
      recentMistakes: [
        { id: "m1", subject: "math", topic: "fractions", answeredAt: "2026-01-10T10:00:00Z" },
        { id: "m2", subject: "math", topic: "fractions", answeredAt: "2026-01-12T10:00:00Z" },
      ],
      dailyActivity: [{ date: "2026-01-10", answers: 8, correct: 4 }],
    });

    assert.equal(allowsStrongParentDiagnosisAtStudent(payload), false);
    assert.equal(allowsHedgedParentInsightAtStudent(payload), true);
    const insights = buildParentInsightsHe(payload);
    assert.ok(!insightsContainStrongDiagnosisLeak(insights));
    assert.ok(!insightsContainThinDataContradiction(insights));
    assert.ok(insightsContainCautiousTopicSignal(insights));
    assert.ok(!insightsContainTechnicalLeak(insights));
  });

  test("supported tier (12+ recurrence) avoids thin-data contradiction and gives cautious insight", () => {
    const mistakes = [];
    for (let i = 0; i < 12; i++) {
      mistakes.push({
        id: `m${i}`,
        subject: "math",
        topic: "fractions",
        answeredAt: i < 6 ? "2026-01-10T10:00:00Z" : "2026-01-15T10:00:00Z",
      });
    }
    const payload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          diagnosticAccuracy: 50,
          topics: {
            fractions: { diagnosticAnswers: 12, diagnosticAccuracy: 50 },
          },
        },
      },
      recentMistakes: mistakes,
      dailyActivity: [{ date: "2026-01-10", answers: 12, correct: 6 }],
    });

    assert.equal(allowsStrongParentDiagnosisAtStudent(payload), true);
    const insights = buildParentInsightsHe(payload);
    assert.ok(!insightsContainThinDataContradiction(insights));
    assert.ok(insights.some((t) => /דפוס שחוזר/u.test(t)));
    assert.ok(insightsContainCautiousTopicSignal(insights));
    assert.ok(!insightsContainTechnicalLeak(insights));
  });

  test("client pattern diagnostics suppressed when insufficient", () => {
    const apiPayload = attachParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 2, totalSessions: 1, totalAnswers: 2 },
      subjects: {},
      parentFacing: { insights: ["x"], homeRecommendations: [] },
    });

    assert.equal(shouldSuppressClientPatternDiagnostics(apiPayload), true);

    const client = {
      patternDiagnostics: { subjects: { math: { parentActionHe: "act" } } },
      analysis: { recommendations: [{ text: "rec" }] },
    };
    applyServerParentFacingAuthorityToClientReport(client, apiPayload);
    assert.equal(Object.keys(client.patternDiagnostics.subjects).length, 0);
    assert.equal(client.analysis.recommendations.length, 0);
  });
});

describe("Phase Q1 - compute quality snapshot", () => {
  test("supported requires 12+ and recurrence", () => {
    const mistakes = [];
    for (let i = 0; i < 12; i++) {
      mistakes.push({
        id: `m${i}`,
        subject: "math",
        topic: "fractions",
        answeredAt: i < 6 ? "2026-01-10T10:00:00Z" : "2026-01-15T10:00:00Z",
      });
    }
    const { public: pub } = computeParentContextEvidenceQuality({
      summary: { diagnosticAnswers: 12 },
      subjects: {
        math: {
          diagnosticAnswers: 12,
          topics: { fractions: { diagnosticAnswers: 12, diagnosticWrong: 6 } },
        },
      },
      recentMistakes: mistakes,
    });
    assert.equal(pub.student.dataSufficiency, DATA_SUFFICIENCY.SUPPORTED);
    assert.equal(pub.student.recurrenceMet, true);
  });
});

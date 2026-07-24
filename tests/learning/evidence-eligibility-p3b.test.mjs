import test from "node:test";
import assert from "node:assert/strict";

import {
  assessDiagnosticEvidenceEligibility,
} from "../../utils/diagnostic-evidence-eligibility.js";
import {
  filterMistakesForRow,
} from "../../utils/parent-report-row-trend.js";
import {
  partitionPatternEligibleMistakes,
} from "../../utils/learning-pattern-decision/resolve-excluded-evidence.js";
import {
  buildDiagnosticEvidenceContractV3,
} from "../../utils/diagnostic-engine-v3/evidence-contract-v3.js";

const NOW = Date.UTC(2026, 6, 23, 10, 0, 0);
const CASES = [
  { name: "practice", event: { mode: "practice" }, independent: true },
  { name: "quiz", event: { mode: "quiz" }, independent: true },
  { name: "homework", event: { mode: "homework" }, independent: true },
  {
    name: "hinted practice",
    event: { mode: "practice", hintUsed: true },
    independent: false,
  },
  {
    name: "step by step",
    event: { mode: "practice", afterStepByStep: true },
    independent: false,
  },
  { name: "learning", event: { mode: "learning" }, independent: false },
  {
    name: "guided retry",
    event: { mode: "practice_mistakes" },
    independent: false,
  },
  {
    name: "competitive speed",
    event: { mode: "speed" },
    independent: false,
    speed: true,
  },
  { name: "missing mode", event: {}, independent: false },
];

function rawEvent(extra) {
  return {
    subject: "math",
    topicOrOperation: "subtraction",
    bucketKey: "subtraction",
    timestamp: NOW,
    isCorrect: false,
    questionLabel: `eligibility-${extra.mode || "none"}`,
    userAnswer: "9",
    correctAnswer: "4",
    misconceptionTag: "add_instead_of_sub",
    patternFamily: "subtraction_operation_confusion",
    ...extra,
  };
}

test("P3B authoritative eligibility returns one result for every evidence source", () => {
  for (const scenario of CASES) {
    const result = assessDiagnosticEvidenceEligibility(
      rawEvent(scenario.event),
    );
    assert.equal(
      result.independentRecurrenceEligible,
      scenario.independent,
      scenario.name,
    );
    assert.equal(
      result.speedPressureEligible,
      scenario.speed === true,
      `${scenario.name}:speed`,
    );
  }
});

test("P3B DE2 and LPD consume the same independent recurrence decision", () => {
  for (const scenario of CASES) {
    const event = rawEvent(scenario.event);
    const de2 = filterMistakesForRow(
      "math",
      "subtraction",
      { bucketKey: "subtraction" },
      [event],
      NOW - 1000,
      NOW + 1000,
      { independentRecurrenceOnly: true },
    );
    const lpd = partitionPatternEligibleMistakes(
      [event],
      "math",
      "subtraction",
      NOW - 1000,
      NOW + 1000,
    );
    const expected = scenario.independent ? 1 : 0;
    assert.equal(de2.length, expected, `${scenario.name}:de2`);
    assert.equal(lpd.included.length, expected, `${scenario.name}:lpd`);
  }
});

test("P3B V3 exposes the same eligibility contract without inventing recurrence", () => {
  for (const scenario of CASES) {
    const event = rawEvent(scenario.event);
    const v3 = buildDiagnosticEvidenceContractV3({
      subjectId: "math",
      event,
      activityMode: event.mode,
      isCorrect: false,
    });
    assert.equal(
      v3.evidenceEligibility.independentRecurrenceEligible,
      scenario.independent,
      scenario.name,
    );
    if (!v3.evidenceEligibility.diagnosticEligible) {
      assert.equal(v3.diagnosticWeight, 0, `${scenario.name}:weight`);
    }
  }
});

/**
 * Reachability of engineDecision speed_pressure_pattern — no DB, no seed.
 * Run: node --test tests/learning/parent-report-speed-pressure-decision.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
} from "../../utils/parent-report-engine-v1-signals.js";
import { buildPhase2RiskFlags } from "../../utils/topic-next-step-phase2.js";

function decision(input) {
  return buildEngineDiagnosticDecision(input).engineDecision;
}

describe("speed_pressure_pattern - buildEngineDiagnosticDecision reachability", () => {
  test("happy path: needs_strengthening + modeKey=speed + speedOnlyRisk → speed_pressure_pattern", () => {
    const q = 28;
    const acc = 58;
    assert.equal(computeAccuracyBand(acc, q), "needs_strengthening");
    assert.equal(
      decision({
        q,
        acc,
        wrongRatio: (q - Math.round((acc / 100) * q)) / q,
        rootCause: "speed_pressure",
        behaviorType: "speed_pressure",
        modeKey: "speed",
        riskFlags: { speedOnlyRisk: true },
      }),
      "speed_pressure_pattern",
    );
  });

  test("focus-24 qp01s001 shape: partial_good + speed signals → partial_stable (NOT speed_pressure)", () => {
    const q = 28;
    const acc = 71;
    assert.equal(computeAccuracyBand(acc, q), "partial_good");
    assert.equal(
      decision({
        q,
        acc,
        wrongRatio: 8 / q,
        rootCause: "speed_pressure",
        behaviorType: "speed_pressure",
        modeKey: "speed",
        riskFlags: { speedOnlyRisk: true },
      }),
      "partial_stable",
    );
  });

  test("behaviorType + rootCause alone do NOT select speed_pressure_pattern", () => {
    assert.equal(
      decision({
        q: 28,
        acc: 58,
        wrongRatio: 0.4,
        rootCause: "speed_pressure",
        behaviorType: "speed_pressure",
        modeKey: "",
        riskFlags: {},
      }),
      "topic_needs_strengthening",
    );
  });

  test("clear_gap band blocks override even with modeKey=speed + speedOnlyRisk", () => {
    const q = 28;
    const acc = 42;
    assert.equal(computeAccuracyBand(acc, q), "clear_gap");
    assert.equal(
      decision({
        q,
        acc,
        wrongRatio: 0.58,
        rootCause: "speed_pressure",
        behaviorType: "speed_pressure",
        modeKey: "speed",
        riskFlags: { speedOnlyRisk: true },
      }),
      "clear_topic_gap",
    );
  });

  test("modeKey=speed without speedOnlyRisk → topic_needs_strengthening only", () => {
    assert.equal(
      decision({
        q: 28,
        acc: 58,
        wrongRatio: 0.42,
        rootCause: "knowledge_gap",
        behaviorType: "knowledge_gap",
        modeKey: "speed",
        riskFlags: { speedOnlyRisk: false },
      }),
      "topic_needs_strengthening",
    );
  });
});

describe("speed_pressure_pattern - speedOnlyRisk from behavior profile", () => {
  test("buildPhase2RiskFlags sets speedOnlyRisk when behavior dominantType is speed_pressure", () => {
    const flags = buildPhase2RiskFlags(
      { questions: 28, wrong: 12, accuracy: 58, modeKey: "practice", evidenceStrength: "medium", dataSufficiencyLevel: "strong" },
      null,
      { dominantType: "speed_pressure", signals: {} },
      { fragileProgressPattern: false, progressSupportsAdvance: false, unclearTrend: false, negativeTrendAfterRecentDifficultyIncrease: false, periodRegression: false, positiveAccuracy: false, independenceDeteriorating: false, fluencySupportWithoutAccuracyDrop: false },
    );
    assert.equal(flags.speedOnlyRisk, true);
    assert.equal(flags.behaviorType, "speed_pressure");
  });

  test("modeKey=speed + low wrongRatio can set speedOnlyRisk without behavior profile", () => {
    const flags = buildPhase2RiskFlags(
      { questions: 28, wrong: 6, accuracy: 78, modeKey: "speed", evidenceStrength: "medium", dataSufficiencyLevel: "strong" },
      null,
      { dominantType: "undetermined", signals: {} },
      { fragileProgressPattern: false, progressSupportsAdvance: false, unclearTrend: false, negativeTrendAfterRecentDifficultyIncrease: false, periodRegression: false, positiveAccuracy: false, independenceDeteriorating: false, fluencySupportWithoutAccuracyDrop: false },
    );
    assert.equal(flags.speedOnlyRisk, true);
  });
});

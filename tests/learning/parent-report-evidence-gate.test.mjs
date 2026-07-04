import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  isCountableSelfPracticeAnswer,
  isCountableSelfPracticeSessionMode,
  isParentReportPracticeAnswer,
} from "../../lib/learning/parent-report-evidence-gate.js";
import { EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";

describe("parent-report-evidence-gate", () => {
  test("counts independent self-practice", () => {
    assert.equal(
      isCountableSelfPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
        resolvedMode: "practice",
        contextFlags: {},
      }),
      true
    );
  });

  test("includes learning-mode attempts for parent totals", () => {
    assert.equal(
      isParentReportPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
        resolvedMode: "learning",
      }),
      true
    );
  });

  test("includes afterStepByStep retries in parent totals but not diagnostic gate", () => {
    const input = {
      evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
      resolvedMode: "practice",
      contextFlags: { afterStepByStep: true },
    };
    assert.equal(isParentReportPracticeAnswer(input), true);
    assert.equal(isCountableSelfPracticeAnswer(input), false);
  });

  test("excludes learning, games, step-by-step, book follow-up from diagnostic gate", () => {
    assert.equal(
      isCountableSelfPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
        resolvedMode: "learning",
      }),
      false
    );
    assert.equal(
      isCountableSelfPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE,
        resolvedMode: "challenge",
      }),
      false
    );
    assert.equal(
      isCountableSelfPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
        resolvedMode: "practice",
        contextFlags: { afterStepByStep: true },
      }),
      false
    );
    assert.equal(
      isCountableSelfPracticeAnswer({
        evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
        resolvedMode: "practice",
        contextFlags: { contextAfterBookReading: true },
      }),
      false
    );
  });

  test("session mode gate excludes passive/game modes", () => {
    assert.equal(isCountableSelfPracticeSessionMode("practice"), true);
    assert.equal(isCountableSelfPracticeSessionMode("learning"), false);
    assert.equal(isCountableSelfPracticeSessionMode("challenge"), false);
  });
});

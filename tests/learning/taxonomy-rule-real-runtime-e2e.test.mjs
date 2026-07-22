/**
 * REAL_RUNTIME_E2E — 59 rules via active generators/banks; NO injected misconceptionTag.
 * Run: node --test tests/learning/taxonomy-rule-real-runtime-e2e.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  REAL_RUNTIME_SCENARIOS,
  classifyRealRuntimeScenario,
} from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { passesEvidenceRecurrenceRules } from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  applyMisconceptionAdaptiveAnswer,
  resolveMisconceptionAdaptiveQuestionTarget,
} from "../../lib/learning/misconception-adaptive-routing.js";
import { buildParentEvidenceStatements } from "../../lib/learning/parent-report-evidence-pipeline.js";

describe("REAL_RUNTIME_E2E completeness", () => {
  test("59 real runtime scenarios defined", () => {
    assert.equal(REAL_RUNTIME_SCENARIOS.length, 59);
  });
});

describe("REAL_RUNTIME_E2E — per rule", () => {
  for (const scenario of REAL_RUNTIME_SCENARIOS) {
    test(`${scenario.ruleId} positive classifies ${scenario.expectedTag} without injection`, () => {
      const ev = classifyRealRuntimeScenario(scenario, true);
      assert.equal(
        ev.detectedMisconception,
        scenario.expectedTag,
        `${scenario.ruleId} positive tag`
      );
      assert.notEqual(ev.evidenceType, "UNKNOWN");
    });

    test(`${scenario.ruleId} negative does not emit target tag`, () => {
      const ev = classifyRealRuntimeScenario(scenario, false);
      assert.notEqual(ev.detectedMisconception, scenario.expectedTag);
    });

    test(`${scenario.ruleId} recurrence + routing + parent from classified events`, () => {
      const row = TAXONOMY_BY_ID[scenario.ruleId];
      const min = Math.max(row.minWrong || 3, 3);
      const positiveEv = classifyRealRuntimeScenario(scenario, true);
      const payload = scenario.loadPositive();
      const events = Array.from({ length: min }, (_, i) =>
        normalizeMistakeEvent(
          {
            topic: row.topicHe || row.subjectId,
            bucketKey: row.topicHe || row.subjectId,
            isCorrect: false,
            userAnswer: payload.userAnswer,
            correctAnswer: payload.expectedAnswer,
            params: payload.params || payload.question?.params || {},
            misconceptionTag: positiveEv.detectedMisconception,
            distractorFamily: positiveEv.detectedMisconception,
            evidenceType: positiveEv.evidenceType,
            timestamp: Date.now() - (min - i) * 1000,
            questionLabel: `real-${scenario.ruleId}-${i}`,
          },
          scenario.subject
        )
      );

      assert.ok(passesEvidenceRecurrenceRules(events, row), `${scenario.ruleId} recurrence`);

      let state = { patterns: {}, phase: "normal", activeTag: null, activeKind: null, recoveryStreak: 0 };
      for (const tag of events.map((e) => e.misconceptionTag)) {
        state = applyMisconceptionAdaptiveAnswer(state, tag, false);
      }
      assert.ok(["probe", "focus", "recovery"].includes(state.phase) || state.activeTag === scenario.expectedTag);

      if (scenario.probeKind) {
        const target = resolveMisconceptionAdaptiveQuestionTarget(state, { operation: row.topicHe });
        assert.ok(target.preferKind || target.topicHint || state.activeKind);
      }

      const parent = buildParentEvidenceStatements({
        questions: min,
        correct: 0,
        wrong: min,
        wrongEvents: events,
        taxonomyId: scenario.ruleId,
      });
      const observed = parent.statements.find((s) => s.kind === "OBSERVED_PATTERN");
      assert.ok(observed, `${scenario.ruleId} parent observed pattern`);
    });
  }
});

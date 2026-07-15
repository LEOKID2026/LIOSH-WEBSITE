import assert from "node:assert/strict";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import {
  buildParentReportEngineDecisionContract,
  mapEngineRecommendedAction,
  resolveEngineDecisionUncertaintyText,
} from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import { restoreLearningPatternDecisionsFromUnits } from "../../utils/learning-pattern-decision/restore-learning-pattern-on-topic-maps.js";
import { buildLpdSafeTopicExplainSectionsHe } from "../../utils/learning-pattern-decision/lpd-parent-facing-copy.js";

function mockUnit({ patternHe, actionState = "intervene", questions = 206, correct = 108, wrong = 98, accuracy = 52 }) {
  return {
    subjectId: "math",
    topicRowKey: "fractions::grade:g4",
    displayName: "שברים",
    taxonomy: { patternHe, id: "M-05", subskillHe: "השוואת שברים" },
    diagnosis: { allowed: true, lineHe: patternHe },
    canonicalState: { actionState },
    evidenceTrace: [{ type: "volume", value: { questions, correct, wrong, accuracy } }],
  };
}

function rowFromMetrics(q, c, w, acc) {
  return { questions: q, correct: c, wrong: w, accuracy: acc, displayName: "חיבור" };
}

// OMER שברים — DE2 pattern must propagate to parent finding
{
  const unit = mockUnit({ patternHe: "השוואה לפי מונה בלבד" });
  const row = rowFromMetrics(206, 108, 98, 52);
  row.displayName = "שברים";
  const lpd = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "fractions::grade:g4",
    row,
    unit,
    rawMistakes: [],
  });
  assert.match(lpd.parentVisibleFinding, /השוואה לפי מונה בלבד/);
  assert.doesNotMatch(lpd.parentVisibleFinding, /כמה טעויות/);
  assert.equal(lpd.engineDecisionContract.sourceEngine, "de2");
  assert.equal(lpd.engineDecisionContract.detectedPattern, "השוואה לפי מונה בלבד");
}

// OMER כפל — repeated pairs pattern
{
  const unit = mockUnit({
    patternHe: "אותם זוגות שגויים",
    questions: 32,
    correct: 22,
    wrong: 10,
    accuracy: 69,
    actionState: "intervene",
  });
  unit.displayName = "כפל";
  unit.topicRowKey = "multiplication::grade:g4";
  const row = rowFromMetrics(32, 22, 10, 69);
  row.displayName = "כפל";
  const lpd = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "multiplication::grade:g4",
    row,
    unit,
    rawMistakes: [],
  });
  assert.match(lpd.parentVisibleFinding, /אותם זוגות שגויים/);
  assert.equal(lpd.engineDecisionContract.recommendedAction, "remediate_same_level");
}

// Aaa7 חיבור — clear difficulty, not maintain
{
  const contract = buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey: "addition::grade:g1",
    topicName: "חיבור",
    row: rowFromMetrics(10, 2, 8, 20),
    unit: {
      canonicalState: { actionState: "probe_only" },
      evidenceTrace: [{ type: "volume", value: { questions: 10, correct: 2, wrong: 8, accuracy: 20 } }],
    },
  });
  assert.equal(contract.engineDecision, "clear_topic_gap");
  assert.equal(contract.recommendedAction, "remediate_same_level");
  assert.match(contract.parentSafeFinding, /קושי ברור|הרבה טעויות/);
  assert.doesNotMatch(contract.parentSafeFinding, /כמה טעויות/);
}

// narrative uncertainty suppressed on strong volume
{
  assert.equal(
    resolveEngineDecisionUncertaintyText(206, "strong", "topic_needs_strengthening"),
    null,
  );
  assert.equal(resolveEngineDecisionUncertaintyText(206, "strong", "clear_topic_gap"), null);
}

// mapRow LPD restored after sync wipe
{
  const lpd = { parentVisibleFinding: "engine finding", engineDecisionContract: { parentSafeFinding: "engine finding" } };
  const report = {
    diagnosticEngineV2: {
      units: [
        {
          subjectId: "math",
          topicRowKey: "fractions::grade:g4",
          learningPatternDecision: lpd,
          engineDecisionContract: lpd.engineDecisionContract,
        },
      ],
    },
    mathOperations: {
      "fractions::grade:g4": { questions: 206, correct: 108, wrong: 98, accuracy: 52 },
    },
  };
  restoreLearningPatternDecisionsFromUnits(report);
  const row = report.mathOperations["fractions::grade:g4"];
  assert.ok(row.learningPatternDecision);
  assert.equal(row.learningPatternDecision.parentVisibleFinding, "engine finding");
  assert.ok(row.engineDecisionContract);
}

// explain sections use engine contract
{
  const lpd = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "fractions::grade:g4",
    row: { ...rowFromMetrics(206, 108, 98, 52), displayName: "שברים" },
    unit: mockUnit({ patternHe: "השוואה לפי מונה בלבד" }),
    rawMistakes: [],
  });
  const sections = buildLpdSafeTopicExplainSectionsHe({
    label: "שברים",
    displayName: "שברים",
    questions: 206,
    correct: 108,
    wrong: 98,
    accuracy: 52,
    learningPatternDecision: lpd,
  });
  assert.ok(sections);
  assert.match(sections.identified, /השוואה לפי מונה בלבד/);
  assert.match(sections.pattern, /השוואה לפי מונה בלבד/);
}

// mapEngineRecommendedAction overrides probe_only on clear gap
assert.equal(
  mapEngineRecommendedAction("probe_only", "clear_topic_gap", { questions: 10, wrong: 8, accuracy: 20 }),
  "remediate_same_level",
);

console.log("parent-report-engine-decision-contract.test.mjs - all passed");

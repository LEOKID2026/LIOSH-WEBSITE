/**
 * BLOCKER 2 — parent-facing insights/explain paths must use LPD.
 */
import assert from "node:assert/strict";
import {
  buildLearningPatternDecision,
  buildLpdParentInsightLineHe,
  findForbiddenParentWords,
  guardParentFacingText,
  lpdParentVisibleFindingFromRow,
  resolveParentExplainRowCopy,
  rowNeedsPracticeFromLpd,
} from "../../utils/learning-pattern-decision/index.js";
import {
  buildParentInsightsFromTopicEngineHe,
  buildTopicEngineInsightLineHe,
} from "../../utils/parent-report-engine-insights-he.js";

const START = Date.UTC(2026, 3, 1);
const END = Date.UTC(2026, 4, 1);

function lpdRow({ q, c, w, acc, name, bucket = "addition", subjectId = "math", mistakes = [] }) {
  const lpd = buildLearningPatternDecision({
    subjectId,
    topicRowKey: bucket,
    row: { bucketKey: bucket, displayName: name, questions: q, correct: c, wrong: w, accuracy: acc },
    rawMistakes: mistakes,
    startMs: START,
    endMs: END,
  });
  return {
    rowKey: `math_${bucket}`,
    subjectId,
    subjectLabelHe: "מתמטיקה",
    label: name,
    questions: q,
    wrong: w,
    accuracy: acc,
    learningPatternDecision: lpd,
    topicEngineRowSignals: {
      diagnosticType: "knowledge_gap",
      recommendedNextStep: "remediate_same_level",
      doNowHe: "כדאי לחזק את הנושא בדחיפות",
    },
  };
}

/** A — insight line uses LPD, not raw engine */
{
  const row = lpdRow({ q: 2, c: 0, w: 2, acc: 0, name: "חיבור" });
  const line = buildTopicEngineInsightLineHe(row);
  const finding = lpdParentVisibleFindingFromRow(row);
  assert.ok(line.includes("חיבור"));
  assert.ok(line.includes(finding));
  assert.ok(!line.includes("כדאי לחזק"));
  assert.ok(!line.includes("בדחיפות"));
  assert.equal(findForbiddenParentWords(line).length, 0);
}

/** B — explain row copy guarded */
{
  const row = lpdRow({ q: 2, c: 0, w: 2, acc: 0, name: "חיבור" });
  const copy = resolveParentExplainRowCopy(row);
  assert.equal(copy.suppressEngineCopy, true);
  assert.ok(copy.primaryFinding.length > 0);
  assert.equal(findForbiddenParentWords(copy.primaryFinding).length, 0);
  assert.ok(!copy.primaryFinding.includes("דפוס חוזר"));
}

/** C — short insight ≡ LPD finding text (no engine contradiction) */
{
  const row = lpdRow({ q: 2, c: 0, w: 2, acc: 0, name: "חיבור" });
  const insight = buildLpdParentInsightLineHe(row);
  const finding = lpdParentVisibleFindingFromRow(row);
  assert.ok(insight.includes(finding));
  assert.ok(!insight.includes("remediate"));
}

/** D — q=1–2 initial: insight path must not say כדאי לחזק (engine bypass blocked) */
{
  const row = lpdRow({ q: 2, c: 0, w: 2, acc: 0, name: "חיבור" });
  const line = buildTopicEngineInsightLineHe(row);
  assert.equal(row.learningPatternDecision.findingType, "initial_topic_data");
  assert.ok(!line.includes("כדאי לחזק"), line);
  assert.ok(!line.includes("כדאי לשים דגש"), line);
}

/** E — q3_4 factual: no repeated wording in insights */
{
  const row = lpdRow({ q: 3, c: 1, w: 2, acc: 33, name: "חיבור" });
  row.learningPatternDecision = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "addition",
    row: { bucketKey: "addition", displayName: "חיבור", questions: 3, correct: 1, wrong: 2, accuracy: 33 },
    rawMistakes: [
      { bucketKey: "addition", mode: "practice", isCorrect: false, patternFamily: "pf:same", timestamp: START },
      { bucketKey: "addition", mode: "practice", isCorrect: false, patternFamily: "pf:same", timestamp: START + 1 },
    ],
    startMs: START,
    endMs: END,
  });
  const line = buildTopicEngineInsightLineHe(row);
  assert.ok(!line.includes("דפוס חוזר"), line);
  assert.ok(line.includes("דפוס מוקדם") || line.includes("נפתרו") || line.length > 0);
}

/** F — not_practiced: no insight for q=0 topic */
{
  const report = {
    mathOperations: {
      unused: {
        questions: 0,
        correct: 0,
        wrong: 0,
        accuracy: 0,
        displayName: "לא תורגל",
        learningPatternDecision: buildLearningPatternDecision({
          subjectId: "math",
          topicRowKey: "unused",
          row: { bucketKey: "unused", displayName: "לא תורגל", questions: 0, correct: 0, wrong: 0, accuracy: 0 },
          rawMistakes: [],
          startMs: START,
          endMs: END,
        }),
      },
    },
  };
  const insights = buildParentInsightsFromTopicEngineHe(report);
  assert.ok(!insights.some((l) => l.includes("לא תורגל")));
}

/** guardParentFacingText strips forbidden */
{
  assert.equal(guardParentFacingText("יש אבחון"), "");
  assert.ok(guardParentFacingText("בנושא חיבור נפתרו 2 שאלות.").length > 0);
}

/** rowNeedsPracticeFromLpd false at q=1–2 */
{
  const row = lpdRow({ q: 2, c: 0, w: 2, acc: 0, name: "חיבור" });
  assert.equal(rowNeedsPracticeFromLpd(row), false);
}

console.log("parent-report-insights-lpd.test.mjs — all passed");

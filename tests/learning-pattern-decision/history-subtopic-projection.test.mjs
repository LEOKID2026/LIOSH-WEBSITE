/**
 * History subtopic LPD projection + trace history coverage.
 */
import assert from "node:assert/strict";
import { applyLearningPatternDecisionToUnitsAndRows } from "../../utils/learning-pattern-decision/apply-learning-pattern-decision.js";
import { projectHistorySubtopicLearningPatternDecisions } from "../../utils/learning-pattern-decision/project-history-subtopic-lpd.js";
import { listTopicRowKeysFromBaseReport } from "../../utils/parent-report-output-integrity/trace-row-pipeline.js";

const historyTopics = {
  "ancient::grade:g4": {
    bucketKey: "ancient",
    displayName: "עתיקה",
    questions: 10,
    correct: 6,
    wrong: 4,
    accuracy: 60,
  },
};

const historySubtopics = {
  hist_sub_01: {
    parentTopicKey: "ancient",
    displayName: "תת-נושא א",
    questions: 4,
    correct: 2,
    accuracy: 50,
    subtopicReport: true,
  },
  hist_sub_unused: {
    parentTopicKey: "ancient",
    displayName: "לא תורגל",
    questions: 0,
    correct: 0,
    accuracy: 0,
    subtopicReport: true,
  },
};

const maps = {
  math: {},
  geometry: {},
  english: {},
  science: {},
  history: historyTopics,
  hebrew: {},
  "moledet-geography": {},
  historySubtopics,
};

applyLearningPatternDecisionToUnitsAndRows({
  diagnosticEngineV2: { units: [] },
  maps,
  diagnosticEngineV3: { unitEnrichments: [] },
  rawMistakesBySubject: { history: [] },
});

assert.ok(historyTopics["ancient::grade:g4"].learningPatternDecision);
const sub = historySubtopics.hist_sub_01;
assert.ok(sub.learningPatternDecision, "practiced subtopic must have LPD");
assert.equal(sub.learningPatternDecision.projectedFrom?.parentTopicKey, "ancient");
assert.equal(sub.learningPatternDecision.subtopicBreakdown, true);
assert.ok(sub.learningPatternDecision.trace.some((t) => t.includes("projected:history_subtopic")));

const unused = historySubtopics.hist_sub_unused;
assert.equal(unused.learningPatternDecision.topicStatus, "not_practiced");

const baseReport = { ...maps, historyTopics, historySubtopics };
const keys = listTopicRowKeysFromBaseReport(baseReport);
assert.ok(
  keys.some((k) => k.subjectId === "history" && k.topicRowKey === "ancient::grade:g4"),
  "historyTopics in trace list",
);
assert.ok(
  keys.some((k) => k.subjectId === "history" && k.topicRowKey === "hist_sub_01" && k.rowKind === "history_subtopic"),
  "practiced historySubtopics in trace list",
);
assert.ok(
  !keys.some((k) => k.topicRowKey === "hist_sub_unused"),
  "unpracticed subtopic excluded from trace list",
);

console.log("history-subtopic-projection.test.mjs - passed");

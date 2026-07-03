/**
 * Core grade filter + activity display labels for parent reports.
 * Run: npx tsx scripts/parent-report-core-grade-filter-selftest.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const u = (rel) => pathToFileURL(path.join(root, rel)).href;

const {
  isCoreParentReportRow,
  filterCoreV2Units,
} = await import(u("utils/parent-report-core-grade-filter.js"));
const { formatParentReportActivityDisplayLabelHe } = await import(
  u("utils/parent-report-language/parent-report-display-labels.he.js")
);
const { buildSixSubjectContextLabelingMatrixBaseReport, matrixRowKeysForSubject } = await import(
  u("scripts/fixtures/parent-report-context-labeling-matrix.mjs")
);
const { buildDetailedParentReportFromBaseReport } = await import(
  u("utils/detailed-parent-report.js")
);
const { buildInsightPacketFromV2Snapshot } = await import(
  u("utils/parent-report-insights/build-packet-from-v2-snapshot.js")
);
const { buildDeterministicFallbackNarrative } = await import(
  u("utils/parent-report-ai-narrative/deterministic-fallback.js")
);
const { buildParentInsightsFromTopicEngineHe } = await import(
  u("utils/parent-report-engine-insights-he.js")
);
const { buildParentSurfaceWhatToNoticeHe } = await import(
  u("utils/parent-report-surface/parent-surface-insights.js")
);
const { applyTopicEngineParentFacingInsights } = await import(
  u("utils/parent-report-engine-insights-he.js")
);

assert.equal(isCoreParentReportRow({ gradeRelation: "same", questions: 5 }, "g1"), true);
assert.equal(isCoreParentReportRow({ gradeRelation: "higher", questions: 10 }, "g1"), false);
assert.equal(isCoreParentReportRow({ gradeRelation: "lower", questions: 10 }, "g1"), false);
assert.equal(isCoreParentReportRow({ gradeRelation: "unknown", questions: 10 }, "g1"), false);

const higherUnit = {
  topicRowKey: "fractions::grade:g3",
  evidenceTrace: [{ type: "volume", value: { questions: 20, accuracy: 40 } }],
};
const higherMap = { "fractions::grade:g3": { gradeRelation: "higher", gradeKey: "g3", questions: 20 } };
assert.equal(filterCoreV2Units([higherUnit], higherMap, "g1").length, 0);

const sameUnit = {
  topicRowKey: "addition::grade:g1",
  evidenceTrace: [{ type: "volume", value: { questions: 15, accuracy: 55 } }],
};
const sameMap = { "addition::grade:g1": { gradeRelation: "same", gradeKey: "g1", questions: 15 } };
assert.equal(filterCoreV2Units([sameUnit], sameMap, "g1").length, 1);

assert.match(
  formatParentReportActivityDisplayLabelHe({
    primaryEvidenceSource: "parent_assigned_activity",
    displayName: "חיבור",
    parentActivityTitle: "תרגול בית",
  }),
  /פעילות|תרגול בית/
);
assert.equal(
  formatParentReportActivityDisplayLabelHe({
    primaryEvidenceSource: "self_practice",
    displayName: "חיבור",
  }),
  "תרגול"
);
assert.doesNotMatch(
  formatParentReportActivityDisplayLabelHe({
    primaryEvidenceSource: "self_practice",
    displayName: "חיבור",
  }),
  /תרגול —/
);

const baseReport = buildSixSubjectContextLabelingMatrixBaseReport();
baseReport.registeredGradeKey = "g4";
const detailed = buildDetailedParentReportFromBaseReport(baseReport);
for (const sp of detailed.subjectProfiles || []) {
  const keys = matrixRowKeysForSubject(sp.subject);
  const focusKeys = new Set((sp.topicRecommendations || []).map((r) => String(r.topicRowKey)));
  assert.ok(!focusKeys.has(keys.splitG5), `${sp.subject}: no g5 in focus`);
  for (const w of sp.topWeaknesses || []) {
    assert.notEqual(String(w.topicRowKey), keys.splitG5, `${sp.subject}: no g5 weakness`);
  }
  for (const tr of sp.topicRecommendations || []) {
    assert.notEqual(tr.gradeRelation, "higher", `${sp.subject}: no higher in recommendations`);
  }
}

const g1MixedReport = {
  registeredGradeKey: "g1",
  gradeFragment: "g1",
  playerName: "Test",
  summary: { gradeLevel: "g1", totalQuestions: 50, overallAccuracy: 85 },
  mathOperations: {
    "addition::grade:g1": { questions: 5, accuracy: 90, gradeRelation: "same", contentGradeKey: "g1", displayName: "חיבור" },
    "multiplication::grade:g2": { questions: 20, accuracy: 88, gradeRelation: "higher", contentGradeKey: "g2", displayName: "כפל" },
  },
  gradePracticeMeta: { mixedGradePractice: true },
};
const aiPacket = buildInsightPacketFromV2Snapshot(g1MixedReport);
const aiNarr = buildDeterministicFallbackNarrative(aiPacket);
const aiText = [
  aiNarr.summary,
  ...(aiNarr.strengths || []).map((s) => s.textHe),
  ...(aiNarr.focusAreas || []).map((f) => f.textHe),
  ...(aiNarr.homeTips || []),
].join("\n");
assert.doesNotMatch(aiText, /כיתה\s*ב/u, "AI insight must not mention grade ב for g1 student");
assert.doesNotMatch(aiText, /כפל.*כיתה/u, "AI insight must not cite higher-grade topic as strength");
for (const s of aiNarr.strengths || []) {
  assert.doesNotMatch(String(s.textHe || ""), /כפל/u, "higher-grade multiplication must not appear in strengths");
}

const mixedEngineReport = {
  registeredGradeKey: "g1",
  summary: { gradeLevel: "g1", totalQuestions: 55 },
  mathOperations: {
    "mult_g1::grade:g1": {
      questions: 10,
      accuracy: 92,
      gradeRelation: "same",
      contentGradeKey: "g1",
      displayName: "כפל",
      topicEngineRowSignals: { diagnosticType: "stable_mastery", recommendedNextStep: "maintain" },
    },
    "targil_g1::grade:g1": {
      questions: 8,
      accuracy: 48,
      gradeRelation: "same",
      contentGradeKey: "g1",
      displayName: "תרגול",
      topicEngineRowSignals: { diagnosticType: "knowledge_gap", recommendedNextStep: "remediate_same_level" },
    },
    "mult_g5::grade:g5": {
      questions: 25,
      accuracy: 95,
      gradeRelation: "higher",
      contentGradeKey: "g5",
      displayName: "כפל - כיתה ה׳",
      topicEngineRowSignals: { diagnosticType: "stable_mastery", recommendedNextStep: "maintain" },
    },
    "targil_g2::grade:g2": {
      questions: 20,
      accuracy: 42,
      gradeRelation: "higher",
      contentGradeKey: "g2",
      displayName: "תרגול - כיתה ב׳",
      topicEngineRowSignals: { diagnosticType: "knowledge_gap", recommendedNextStep: "remediate_same_level" },
    },
  },
};
applyTopicEngineParentFacingInsights(mixedEngineReport);
const engineInsights = buildParentInsightsFromTopicEngineHe(mixedEngineReport);
const insightText = [...engineInsights, ...(mixedEngineReport.parentFacing?.insights || [])].join("\n");
assert.doesNotMatch(insightText, /כיתה\s*ב/u, "what-to-know insights must not mention grade ב");
assert.doesNotMatch(insightText, /כיתה\s*ה/u, "what-to-know insights must not mention grade ה");
assert.doesNotMatch(insightText, /כפל - כיתה/u, "must not cite higher-grade multiplication label");
assert.doesNotMatch(insightText, /תרגול - כיתה/u, "must not cite higher-grade practice label");
assert.match(insightText, /תמונה מעורבת/u, "same-grade mixed insight may still appear");

const mixedDetailed = buildDetailedParentReportFromBaseReport(mixedEngineReport);
const whatToNotice = buildParentSurfaceWhatToNoticeHe({
  ...mixedDetailed,
  _parentReportUi: { parentFacing: mixedEngineReport.parentFacing },
});
const whatToNoticeText = whatToNotice.join("\n");
assert.doesNotMatch(whatToNoticeText, /כיתה\s*ב/u, "מה חשוב לדעת must not mention grade ב");
assert.doesNotMatch(whatToNoticeText, /כיתה\s*ה/u, "מה חשוב לדעת must not mention grade ה");
assert.ok(
  (mixedDetailed.outOfGradePracticeTransparency?.advancedPractice || []).length >= 2,
  "higher-grade rows appear in transparency section",
);

console.log("OK parent-report-core-grade-filter-selftest");

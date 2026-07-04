/**
 * P8 full — trace + exclusion audit CLI for learningPatternDecision.
 * Run: npm run test:learning-pattern-decision:audit
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildMultiSubjectMatrixBaseReport } from "./fixtures/parent-report-output-integrity-fixtures.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { traceRowThroughPipeline, listTopicRowKeysFromBaseReport } = await load(
  "utils/parent-report-output-integrity/trace-row-pipeline.js",
);
const { applyLearningPatternDecisionToUnitsAndRows } = await load(
  "utils/learning-pattern-decision/index.js",
);
const { compareShortDetailedLearningPatternFindings } = await load(
  "utils/learning-pattern-decision/compare-short-detailed-findings.js",
);
const { auditLearningPatternDecisionReport } = await load(
  "utils/learning-pattern-decision/audit-report.js",
);
const { traceRowConflictReport } = await load(
  "utils/learning-pattern-decision/trace-row-conflict-report.js",
);

const baseReport = buildMultiSubjectMatrixBaseReport();
const maps = {
  math: baseReport.mathOperations,
  geometry: baseReport.geometryTopics,
  english: baseReport.englishTopics,
  science: baseReport.scienceTopics,
  history: {
    "ancient::grade:g4": {
      bucketKey: "ancient",
      displayName: "עתיקה",
      questions: 12,
      correct: 8,
      wrong: 4,
      accuracy: 67,
    },
  },
  hebrew: baseReport.hebrewTopics,
  "moledet-geography": baseReport.moledetGeographyTopics,
  historySubtopics: {
    hist_sub_demo: {
      parentTopicKey: "ancient",
      displayName: "מקורות — דוגמה",
      questions: 4,
      correct: 2,
      accuracy: 50,
      subtopicReport: true,
    },
  },
};

applyLearningPatternDecisionToUnitsAndRows({
  diagnosticEngineV2: baseReport.diagnosticEngineV2,
  maps,
  diagnosticEngineV3: { unitEnrichments: [] },
  rawMistakesBySubject: { history: [] },
  startMs: 0,
  endMs: Date.now(),
});

const fullReport = {
  ...baseReport,
  mathOperations: maps.math,
  geometryTopics: maps.geometry,
  englishTopics: maps.english,
  scienceTopics: maps.science,
  historyTopics: maps.history,
  hebrewTopics: maps.hebrew,
  moledetGeographyTopics: maps["moledet-geography"],
  historySubtopics: maps.historySubtopics,
};

const historyKeys = listTopicRowKeysFromBaseReport(fullReport).filter((k) => k.subjectId === "history");
assert.ok(historyKeys.length > 0, "history rows present in trace list");
console.log(`[audit] history trace keys=${historyKeys.length}`);

const detailed = buildDetailedParentReportFromBaseReport(fullReport, { periodLabel: "month" });

const compare = compareShortDetailedLearningPatternFindings(fullReport, detailed);
console.log(`[audit] short≡detailed compared=${compare.compared} mismatches=${compare.mismatches.length}`);
assert.equal(compare.ok, true, `short/detailed LPD mismatch: ${JSON.stringify(compare.mismatches.slice(0, 2))}`);

const audit = auditLearningPatternDecisionReport(fullReport, {});
console.log(
  `[audit] rows=${audit.rowCount} conflicts=${audit.conflicts.length} forbidden=${audit.forbiddenHits.length} missingLpd=${audit.missingLpd.length} missingSubtopicLpd=${audit.missingSubtopicLpd?.length ?? 0}`,
);

assert.equal(audit.missingLpd.length, 0, "every practiced row must have learningPatternDecision");
assert.equal(audit.missingSubtopicLpd?.length ?? 0, 0, "every practiced history subtopic must have LPD");
assert.equal(audit.forbiddenHits.length, 0, "no forbidden parent words");
assert.equal(audit.conflicts.length, 0, "no trace conflicts");

const keys = listTopicRowKeysFromBaseReport(fullReport).slice(0, 12);
for (const { subjectId, topicRowKey } of keys) {
  const trace = traceRowThroughPipeline({
    baseReport: fullReport,
    detailedReport: detailed,
    subjectId,
    topicRowKey,
  });
  assert.ok(trace.stages?.learningPatternDecision || trace.stages?.mapRow?.learningPatternDecision);
}

console.log("learning-pattern-decision-audit.mjs — passed");

/**
 * Global zero-evidence policy — all six subjects.
 * Run: npm run test:parent-report-zero-evidence-policy
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildMathOnlyOtherSubjectsZeroBaseReport } from "./fixtures/parent-report-zero-evidence-fixture.mjs";
import { buildSixSubjectContextLabelingMatrixBaseReport } from "./fixtures/parent-report-context-labeling-matrix.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { buildDiagnosticOverviewHeV2ForTests } = await load("utils/parent-report-v2.js");
const { hardenBaseReportWithRowIdentity } = await load(
  "utils/parent-report-output-integrity/harden-report-rows.js",
);
const {
  buildSubjectEvidenceCoverageLines,
  practicedSubjectsSummaryLineHe,
  notPracticedSubjectsSummaryLineHe,
  filterInsightLinesForUnpracticedSubjects,
} = await load("utils/parent-report-language/subject-evidence-policy.js");
const parentCopilot = await load("utils/parent-copilot/index.js");
const { detailedReportToCopilotPayload } = await load(
  "utils/parent-report-output-integrity/trace-row-pipeline.js",
);
const zeroTestsMod = await import(
  pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "zero-evidence-policy-tests.js")).href
);
const {
  assertZeroEvidencePolicyOnReports,
  assertCopilotZeroEvidenceClarification,
  assertEvidenceTierClassification,
  subjectQuestionCountsFromBase,
  SUBJECT_LABEL_HE,
} = zeroTestsMod.default || zeroTestsMod;

const V2_SUBJECT_LABEL_HE = SUBJECT_LABEL_HE;

for (const msg of assertEvidenceTierClassification()) {
  assert.fail(msg);
}

function attachDiagnosticOverviewHe(baseReport) {
  hardenBaseReportWithRowIdentity(baseReport);
  const subjectQuestionCounts = subjectQuestionCountsFromBase(baseReport);
  const evidenceCoverage = buildSubjectEvidenceCoverageLines(subjectQuestionCounts, V2_SUBJECT_LABEL_HE);
  const practicedSubjectsSummaryHe = practicedSubjectsSummaryLineHe(
    subjectQuestionCounts,
    V2_SUBJECT_LABEL_HE,
  );
  const notPracticedSubjectsSummaryHe = notPracticedSubjectsSummaryLineHe(
    subjectQuestionCounts,
    V2_SUBJECT_LABEL_HE,
  );
  const diagnosticOverviewHe = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: baseReport.diagnosticEngineV2,
    patternDiagnostics: baseReport.patternDiagnostics,
    maps: {
      math: baseReport.mathOperations,
      geometry: baseReport.geometryTopics,
      english: baseReport.englishTopics,
      science: baseReport.scienceTopics,
      hebrew: baseReport.hebrewTopics,
      "moledet-geography": baseReport.moledetGeographyTopics,
    },
    subjectQuestionCounts,
    fallbackOverview: {
      strongestAreaLineHe: null,
      mainFocusAreaLineHe: null,
      readyForProgressPreviewHe: [],
      requiresAttentionPreviewHe: [],
    },
    insufficientDataSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    thinEvidenceSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    practicedSubjectsSummaryHe,
    notPracticedSubjectsSummaryHe,
  });
  baseReport.summary = {
    ...(baseReport.summary || {}),
    diagnosticOverviewHe,
  };
  return baseReport;
}

// ─── Math only, others 0 ─────────────────────────────────────────────────────
const mathOnlyBase = attachDiagnosticOverviewHe(buildMathOnlyOtherSubjectsZeroBaseReport());
const mathOnlyDetailed = buildDetailedParentReportFromBaseReport(mathOnlyBase, { period: "week" });

for (const msg of assertZeroEvidencePolicyOnReports(mathOnlyBase, mathOnlyDetailed)) {
  assert.fail(msg);
}

const ov = mathOnlyBase.summary.diagnosticOverviewHe;
assert.ok(String(ov.practicedSubjectsSummaryHe || "").includes("חשבון"), "practiced summary mentions math");
assert.ok(
  String(ov.notPracticedSubjectsSummaryHe || "").includes("גאומטריה"),
  "not-practiced summary lists inactive subjects",
);
assert.equal(
  (ov.insufficientDataSubjectsHe || []).filter((l) => /כיוון ראשוני|0 שאלות/u.test(l)).length,
  0,
  "no forbidden/zero-q lines in insufficientDataSubjectsHe",
);
assert.equal((ov.notPracticedSubjectsHe || []).length, 0, "no per-subject notPracticed lines in overview");

const insightText = [
  ov.mainFocusAreaLineHe,
  ov.strongestAreaLineHe,
  ...(ov.requiresAttentionPreviewHe || []),
].join("\n");
assert.ok(/חשבון/u.test(insightText), "insights mention practiced math");
assert.ok(!/גאומטריה:/u.test(insightText), "geometry not in insight lines");
assert.ok(!/אנגלית:/u.test(insightText), "english not in insight lines");

const copilotPayload = detailedReportToCopilotPayload(mathOnlyDetailed);
for (const sid of ["english", "geometry", "hebrew"]) {
  const res = parentCopilot.runParentCopilotTurn({
    audience: "parent",
    payload: copilotPayload,
    utterance: `איך הוא ב${SUBJECT_LABEL_HE[sid]}?`,
    sessionId: `zero-ev-${sid}`,
  });
  for (const msg of assertCopilotZeroEvidenceClarification(res, sid)) {
    assert.fail(msg);
  }
}

// ─── Full six-subject matrix still has per-subject practice ──────────────────
const matrixBase = buildSixSubjectContextLabelingMatrixBaseReport();
const matrixDetailed = buildDetailedParentReportFromBaseReport(matrixBase, { period: "week" });
for (const sp of matrixDetailed.subjectProfiles) {
  assert.ok((sp.topicOverviewRows?.length || 0) >= 1, `${sp.subject} has overview when practiced`);
}

process.stdout.write("OK parent-report-zero-evidence-policy\n");

/**
 * Client report bridge: API-shaped body → generateParentReportV2 → detailed (no browser).
 * Catches missing barrel exports that break real parent-report load.
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const lang = await load("utils/parent-report-language/index.js");
assert.equal(typeof lang.buildSubjectEvidenceCoverageLines, "function", "index must export buildSubjectEvidenceCoverageLines");
assert.equal(typeof lang.filterInsightLinesForUnpracticedSubjects, "function", "index must export filterInsightLinesForUnpracticedSubjects");

const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { buildDiagnosticOverviewHeV2ForTests } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { buildRealGradeSplitRegressionBaseReport } = await import(
  pathToFileURL(join(ROOT, "scripts/fixtures/parent-report-real-regression-payload.mjs")).href
);
const { buildMathOnlyOtherSubjectsZeroBaseReport } = await import(
  pathToFileURL(join(ROOT, "scripts/fixtures/parent-report-zero-evidence-fixture.mjs")).href
);

const reportBody = {
  ok: true,
  student: {
    id: "74c30e48-895b-4f4c-a65a-888f656f54f6",
    full_name: "BridgeQA",
    grade_level: "g4",
    is_active: true,
  },
  range: { from: "2026-04-11", to: "2026-05-18" },
  summary: {
    totalSessions: 12,
    completedSessions: 12,
    totalAnswers: 593,
    correctAnswers: 500,
    wrongAnswers: 93,
    accuracy: 84.32,
    totalDurationSeconds: 7200,
  },
  subjects: {
    math: {
      sessions: 12,
      answers: 593,
      correct: 500,
      wrong: 93,
      accuracy: 84.32,
      durationSeconds: 7200,
      topics: {
        fractions: { answers: 526, correct: 450, wrong: 76, accuracy: 85.55, durationSeconds: 6000 },
        subtraction: { answers: 67, correct: 50, wrong: 17, accuracy: 74.63, durationSeconds: 1200 },
      },
    },
    geometry: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
    english: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
    hebrew: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
    science: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
    moledet_geography: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
  },
  dailyActivity: [],
  recentMistakes: [],
  meta: { source: "bridge-selftest" },
};

const dbInput = buildReportInputFromDbData(reportBody, { period: "week", timezone: "UTC" });
assert.ok(dbInput?.student?.name, "adapter builds student");

const zeroBase = buildMathOnlyOtherSubjectsZeroBaseReport();
const subjectQuestionCounts = {
  math: Number(zeroBase.summary?.mathQuestions) || 0,
  geometry: 0,
  english: 0,
  science: 0,
  hebrew: 0,
  "moledet-geography": 0,
};
let overview;
try {
  overview = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: zeroBase.diagnosticEngineV2,
    patternDiagnostics: [],
    subjectQuestionCounts,
    excellent: [],
    needsPractice: [],
    legacyPatternDiagnostics: [],
  });
} catch (e) {
  assert.fail(`buildDiagnosticOverviewHeV2ForTests threw (barrel export bug): ${e?.stack || e}`);
}
assert.equal((overview?.notPracticedSubjectsHe || []).length, 0, "overview uses compact summary only");
const coverage = lang.buildSubjectEvidenceCoverageLines(subjectQuestionCounts, {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
});
assert.ok(coverage.notPracticedSubjectsHe.length >= 1, "coverage builder keeps per-subject lines for tooling");
assert.ok(String(coverage.notPracticedSubjectsSummaryHe || "").includes("גאומטריה"), "compact summary in coverage");

const regressionBase = buildRealGradeSplitRegressionBaseReport();

let detailed;
try {
  detailed = buildDetailedParentReportFromBaseReport(regressionBase, { playerName: "BridgeQA", period: "week" });
} catch (e) {
  assert.fail(`buildDetailedParentReportFromBaseReport threw: ${e?.stack || e}`);
}
assert.ok(Array.isArray(detailed?.subjectProfiles), "detailed subjectProfiles");

const mathProfile = (detailed.subjectProfiles || []).find((p) => p.subject === "math");
assert.ok((mathProfile?.topicOverviewRows?.length || 0) >= 1, "topicOverviewRows on math profile");

process.stdout.write("OK parent-report-bridge-load-selftest\n");

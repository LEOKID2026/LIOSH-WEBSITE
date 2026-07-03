/**
 * Global diagnostic evidence — all subjects, grade-scoped rows, volume vs thin-data.
 * Run: npm run test:parent-report-diagnostic-evidence
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, "..", rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const {
  classifyTopicEvidenceBand,
  hasTopicLevelEvidence,
  shouldThinEvidenceDowngradeRecommendation,
  resolveRowDataSufficiencyLevel,
  executiveRowDedupeKey,
  parentFacingTopicRowLabelHe,
  SUBSKILL_DETAIL_LIMITATION_HE,
} = await load("utils/parent-report-topic-evidence.js");
const { evaluateDataSufficiency } = await load("utils/parent-report-row-diagnostics.js");
const {
  buildTopicRecommendationFromV2UnitForPhaseTests,
  buildDetailedParentReportFromBaseReport,
} = await load("utils/detailed-parent-report.js");
const { buildNarrativeContractV1 } = await load("utils/contracts/narrative-contract-v1.js");
const { resolveHasSubskillMetadataFromRowSources } = await load("utils/parent-report-topic-evidence.js");
const { deriveTopicInsights, pickStrengths, pickFocusAreas } = await load(
  "utils/parent-report-insights/derive-topic-insights.js",
);

function v2Unit({ subjectId, topicRowKey, displayName, questions, accuracy, priority = "P2", action = "intervene" }) {
  const wrong = Math.max(0, Math.round(questions * (1 - accuracy / 100)));
  return {
    subjectId,
    topicRowKey,
    displayName,
    diagnosis: { allowed: action === "intervene" },
    priority: { level: priority },
    confidence: {
      level: questions >= 40 ? "high" : "moderate",
      rowSignals: {
        dataSufficiencyLevel: questions >= 40 ? "strong" : questions >= 12 ? "medium" : "low",
        isEarlySignalOnly: questions < 8,
      },
    },
    outputGating: { cannotConcludeYet: questions < 4 },
    intervention: action === "intervene" ? {} : null,
    evidenceTrace: [{ type: "volume", value: { questions, accuracy, wrong, correct: questions - wrong } }],
    recurrence: { totalQuestions: questions, wrongCountForRules: wrong },
    taxonomy: { patternHe: accuracy < 55 ? "דפוס טעויות חוזר" : "" },
    canonicalState: {
      actionState: action,
      assessment: {
        readiness: questions >= 40 ? "ready" : questions >= 12 ? "forming" : "insufficient",
        confidenceLevel: questions >= 40 ? "high" : "moderate",
        decisionTier: questions >= 40 ? 3 : 2,
      },
    },
  };
}

function mapRow(topicRowKey, displayName, questions, accuracy, gradeKey = "g4") {
  return {
    gradeKey,
    displayName,
    questions,
    accuracy,
    contractsV1: {
      evidence: { questionCount: questions, accuracyPct: accuracy },
    },
  };
}

function baseReportWithRow(u, gradeKey = "g4") {
  const mk = {
    math: "mathOperations",
    geometry: "geometryTopics",
    english: "englishTopics",
    science: "scienceTopics",
    hebrew: "hebrewTopics",
    "moledet-geography": "moledetGeographyTopics",
  };
  const key = mk[u.subjectId] || "mathOperations";
  const q = u.evidenceTrace[0].value.questions;
  const acc = u.evidenceTrace[0].value.accuracy;
  return {
    registeredGradeKey: "g4",
    [key]: {
      [u.topicRowKey]: mapRow(u.topicRowKey, u.displayName, q, acc, gradeKey),
    },
  };
}

function recFromUnit(u, gradeKey = "g4") {
  return buildTopicRecommendationFromV2UnitForPhaseTests(u, baseReportWithRow(u, gradeKey), u.subjectId);
}

// ─── A: Math strong volume ───────────────────────────────────────────────────
{
  const u = v2Unit({
    subjectId: "math",
    topicRowKey: "multiplication::grade:g4",
    displayName: "כפל",
    questions: 120,
    accuracy: 88,
    action: "maintain",
  });
  const rec = recFromUnit(u);
  assert.equal(rec.thinEvidenceDowngraded, false, "math strong: not thin downgraded");
  assert.equal(rec.dataSufficiencyLevel, "strong");
  assert.notEqual(
    rec.recommendedStepLabelHe,
    "לאסוף עוד מידע לפני החלטה",
    "high volume must not get collect-more-data label",
  );
}

// ─── B: Math weak volume ─────────────────────────────────────────────────────
{
  const u = v2Unit({
    subjectId: "math",
    topicRowKey: "division::grade:g4",
    displayName: "חילוק",
    questions: 95,
    accuracy: 41,
  });
  const rec = recFromUnit(u);
  assert.equal(rec.thinEvidenceDowngraded, false);
  assert.ok(rec.recommendedNextStep === "remediate_same_level" || !rec.thinEvidenceDowngraded);
}

// ─── C–F: Other subjects high volume ─────────────────────────────────────────
for (const [sid, key, name] of [
  ["hebrew", "reading::grade:g4", "הבנת הנקרא"],
  ["english", "grammar::grade:g5", "דקדוק"],
  ["science", "life::grade:g4", "מדעים כללי"],
  ["moledet-geography", "israel::grade:g4", "מולדת"],
]) {
  const u = v2Unit({ subjectId: sid, topicRowKey: key, displayName: name, questions: 80, accuracy: 72 });
  const rec = recFromUnit(u);
  assert.equal(rec.thinEvidenceDowngraded, false, `${sid} high volume not thin`);
  assert.equal(classifyTopicEvidenceBand(rec.questions), "strong", `${sid} evidence band`);
}

// ─── G: Same topic two grades — executive dedupe ───────────────────────────
{
  const rows = [
    {
      subjectId: "math",
      topicRowKey: "fractions::grade:g4",
      contentGradeKey: "g4",
      labelHe: parentFacingTopicRowLabelHe({
        displayName: "שברים",
        contentGradeKey: "g4",
        gradeRelation: "same",
        topicRowKey: "fractions::grade:g4",
      }),
      subjectLabelHe: "חשבון",
    },
    {
      subjectId: "math",
      topicRowKey: "fractions::grade:g5",
      contentGradeKey: "g5",
      labelHe: parentFacingTopicRowLabelHe({
        displayName: "שברים",
        contentGradeKey: "g5",
        gradeRelation: "higher",
        topicRowKey: "fractions::grade:g5",
      }),
      subjectLabelHe: "חשבון",
    },
  ];
  const k1 = executiveRowDedupeKey(rows[0]);
  const k2 = executiveRowDedupeKey(rows[1]);
  assert.notEqual(k1, k2, "grade-split rows must not dedupe together");
  assert.ok(rows[0].labelHe.includes("g4") || rows[0].labelHe.includes("כיתה"));
  assert.ok(rows[1].labelHe.includes("g5") || rows[1].labelHe.includes("מעל"));
}

// ─── H: Subskill limitation only when metadata truly absent ─────────────────
{
  const narMissing = buildNarrativeContractV1({
    topicKey: "geometry::grade:g4",
    subjectId: "geometry",
    displayName: "צורות",
    questions: 150,
    accuracy: 35,
    contractsV1: {
      readiness: { readiness: "ready" },
      confidence: { confidenceBand: "high" },
      decision: { decisionTier: 3, cannotConcludeYet: false },
      recommendation: { eligible: true, intensity: "RI2" },
    },
    hasSubskillMetadata: false,
  });
  const uncMissing = String(narMissing.textSlots?.uncertainty || "");
  assert.ok(
    uncMissing.includes(SUBSKILL_DETAIL_LIMITATION_HE.slice(0, 20)),
    "subskill limitation when pattern metadata absent",
  );
  assert.ok(!uncMissing.includes("עדיין מוקדם לקבוע"), "high volume must not use early generic thin hedge");

  const narPresent = buildNarrativeContractV1({
    topicKey: "fractions::grade:g5",
    subjectId: "math",
    displayName: "שברים",
    questions: 66,
    accuracy: 38,
    hasSubskillMetadata: true,
    contractsV1: {
      readiness: { readiness: "ready" },
      confidence: { confidenceBand: "high" },
      decision: { decisionTier: 3, cannotConcludeYet: false },
      recommendation: { eligible: true, intensity: "RI2" },
      evidence: { subskillBreakdownAvailable: true },
    },
  });
  const uncPresent = String(narPresent.textSlots?.uncertainty || "");
  assert.ok(
    !uncPresent.includes(SUBSKILL_DETAIL_LIMITATION_HE.slice(0, 20)),
    "must not show subskill limitation when pattern metadata exists",
  );
}

// ─── I: High-volume grade-split (delegates to output-integrity fixture) ──────
const { buildGradeSplitBaseReport } = await import(
  pathToFileURL(join(ROOT, "fixtures/parent-report-output-integrity-fixtures.mjs")).href
);

{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const mathP = detailed.subjectProfiles.find((s) => s.subject === "math");
  assert.ok(mathP, "grade-split math profile exists");
  const keys = Object.keys(base.mathOperations);
  assert.equal(keys.length, 2, "two grade-scoped map rows");
  const k5 = keys.find((k) => k.includes("g5"));
  assert.ok(k5, "g5 map row exists");

  const recs = mathP.topicRecommendations || [];
  assert.ok(
    !recs.some((t) => t.topicRowKey === k5),
    "higher-grade weak row excluded from core topicRecommendations",
  );

  const g5Unit = base.diagnosticEngineV2.units.find((u) => u.topicRowKey === k5);
  assert.ok(g5Unit, "g5 v2 unit exists");
  const weakRecDirect = recFromUnit(g5Unit, "g5");
  assert.equal(weakRecDirect.thinEvidenceDowngraded, false, "g5 weak: sufficient volume at unit level");
  assert.notEqual(
    weakRecDirect.recommendedStepLabelHe,
    "לאסוף עוד מידע לפני החלטה",
    "g5 weak: 66 Q must not get collect-more-data label at unit level",
  );
  assert.equal(classifyTopicEvidenceBand(weakRecDirect.questions), "strong", "g5 weak: 66 Q evidence band");
}

// ─── Insights: strong topic not flagged thin in focus metadata ───────────────
{
  const aggregate = {
    subjects: {
      math: {
        answers: 200,
        accuracy: 85,
        topics: {
          "multiplication::grade:g4": {
            answers: 100,
            accuracy: 90,
            contentGradeLevel: "g4",
            gradeRelation: "same",
          },
        },
      },
    },
  };
  const topics = deriveTopicInsights(aggregate);
  const strengths = pickStrengths(topics, []);
  const focus = pickFocusAreas(topics, []);
  assert.ok(topics.some((t) => t.isStrength), "high-accuracy topic flagged strength");
  assert.ok(!focus.some((f) => f.thinData && f.totalQuestions >= 40));
}

// ─── Row diagnostics: 367 questions → strong sufficiency ───────────────────
{
  const suff = evaluateDataSufficiency(367, "strong", 0.8);
  assert.equal(suff.level, "strong");
  assert.equal(suff.suppressAggressiveStep, false);
}

process.stdout.write("OK parent-report-diagnostic-evidence\n");

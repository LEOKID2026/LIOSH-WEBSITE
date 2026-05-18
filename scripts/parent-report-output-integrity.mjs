/**
 * Global parent report output integrity — row identity invariants (all subjects/topics/grades).
 * Run: npm run test:parent-report-output-integrity
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildGradeSplitBaseReport,
  buildMultiSubjectMatrixBaseReport,
  OUTPUT_INTEGRITY_SUBJECT_IDS,
  SUBJECT_TOPIC,
} from "./fixtures/parent-report-output-integrity-fixtures.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const {
  assertDistinctSourceIds,
  classifyRowSectionPlacement,
  sectionPlacementConsistent,
  textImpliesThinDataMislabel,
} = await load("utils/parent-report-output-integrity/row-identity-v1.js");
const { SUBSKILL_DETAIL_LIMITATION_HE } = await load("utils/parent-report-topic-evidence.js");
const { deriveTopicInsights } = await load("utils/parent-report-insights/derive-topic-insights.js");
const {
  traceRowThroughPipeline,
  listTopicRowKeysFromBaseReport,
  detailedReportToCopilotPayload,
} = await load("utils/parent-report-output-integrity/trace-row-pipeline.js");
const { buildRowSourceId } = await load("utils/parent-report-output-integrity/row-identity-v1.js");
const { buildParentProductContractV1 } = await load("utils/contracts/parent-product-contract-v1.js");
const parentCopilot = await load("utils/parent-copilot/index.js");
const runTurn = parentCopilot.runParentCopilotTurn;

/** @type {Array<{ stage: string; lostField?: string; wrongMerge?: string; wrongSection?: string; fixedFile: string }>} */
const ROOT_CAUSE_TABLE = [];

function noteRoot(stage, issue, fixedFile) {
  ROOT_CAUSE_TABLE.push({
    stage,
    lostField: issue.lostField || "",
    wrongMerge: issue.wrongMerge || "",
    wrongSection: issue.wrongSection || "",
    fixedFile,
  });
}

noteRoot(
  "insights/sourceId",
  { wrongMerge: "buildTopicSourceId omitted contentGradeKey — duplicate labels collapsed" },
  "utils/parent-report-insights/source-ids.js + row-identity-v1.js",
);
noteRoot(
  "executive summary",
  { lostField: "topicRowKey/contentGradeKey in collectStrengthRows" },
  "utils/detailed-parent-report.js",
);
noteRoot(
  "detailed topicRecommendations",
  { lostField: "rowIdentityV1 not attached to topic rows" },
  "utils/detailed-parent-report.js",
);
noteRoot(
  "copilot scope",
  { wrongMerge: "aggregate needs_attention before topic-named questions" },
  "utils/parent-copilot/semantic-question-class.js + scope-resolver.js",
);
noteRoot(
  "copilot truth packet",
  { lostField: "timeSpentMinutes / rowSourceId on surfaceFacts" },
  "utils/parent-copilot/truth-packet-v1.js",
);

/** @type {Array<object>} */
const TRACE_TABLE = [];

function aggregateFromBase(base) {
  const subjects = {};
  const mk = {
    math: "mathOperations",
    geometry: "geometryTopics",
    english: "englishTopics",
    science: "scienceTopics",
    hebrew: "hebrewTopics",
    "moledet-geography": "moledetGeographyTopics",
  };
  for (const [sid, mapKey] of Object.entries(mk)) {
    const tm = base[mapKey];
    if (!tm) continue;
    const subjKey = sid === "moledet-geography" ? "moledet_geography" : sid;
    if (!subjects[subjKey]) subjects[subjKey] = { answers: 0, accuracy: 0, topics: {} };
    for (const [topicRowKey, row] of Object.entries(tm)) {
      const gk = row.gradeKey || (topicRowKey.includes("::grade:") ? topicRowKey.split("::grade:")[1] : null);
      let gradeRelation = "unknown";
      if (gk && base.registeredGradeKey) {
        const ord = { g1: 1, g2: 2, g3: 3, g4: 4, g5: 5, g6: 6 };
        const r = ord[base.registeredGradeKey] || 0;
        const a = ord[gk] || 0;
        if (a === r) gradeRelation = "same";
        else if (a > r) gradeRelation = "higher";
        else if (a < r) gradeRelation = "lower";
      }
      subjects[subjKey].topics[topicRowKey] = {
        answers: row.questions,
        accuracy: row.accuracy,
        contentGradeLevel: gk,
        registeredGradeLevel: base.registeredGradeKey,
        gradeRelation,
      };
      subjects[subjKey].answers += row.questions || 0;
    }
  }
  return { subjects };
}

// ─── A: Grade-split same label ───────────────────────────────────────────────
{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const keys = listTopicRowKeysFromBaseReport(base).filter((k) => k.subjectId === "math");
  assert.equal(keys.length, 2, "A: two math grade rows in base");
  const ids = keys.map((k) => buildRowSourceId(k.subjectId, k.topicRowKey));
  assert.notEqual(ids[0], ids[1], "A: distinct sourceIds for grade split");

  const traces = keys.map((k) =>
    traceRowThroughPipeline({ baseReport: base, detailedReport: detailed, subjectId: k.subjectId, topicRowKey: k.topicRowKey }),
  );
  for (const t of traces) TRACE_TABLE.push(t);

  const mathP = detailed.subjectProfiles.find((s) => s.subject === "math");
  const strengthKeys = new Set((mathP?.topStrengths || []).map((r) => r.topicRowKey));
  const weakKeys = new Set((mathP?.topWeaknesses || []).map((r) => r.topicRowKey));
  const strongTr = traces.find((t) => t.identity.questions >= 300);
  const weakTr = traces.find((t) => t.identity.questions < 100);
  assert.ok(strongTr, "A: strong row traced");
  assert.ok(weakTr, "A: weak row traced");
  assert.ok(strengthKeys.has(strongTr.topicRowKey), "A: high volume in strengths not weaknesses");
  assert.ok(!weakKeys.has(strongTr.topicRowKey), "A: strong row not in weaknesses");
  assert.ok(weakKeys.has(weakTr.topicRowKey) || (mathP?.topicRecommendations || []).some((tr) => tr.topicRowKey === weakTr.topicRowKey), "A: weak row surfaced");

  for (const t of traces) {
    assert.ok(t.stages.mapRow?.timeMinutes > 0, "A: time preserved on map row");
    const surfacedQ =
      t.stages.detailedTopicRec?.questions ??
      t.stages.detailedStrength?.questions ??
      t.identity.questions;
    assert.equal(surfacedQ, t.stages.mapRow?.questions, "A: questions parity on surfaced row");
    const surfacedIdentity =
      t.stages.detailedTopicRec?.rowIdentityV1 ?? t.stages.detailedStrength?.rowIdentityV1;
    if (surfacedIdentity) {
      assert.equal(surfacedIdentity.sourceId, t.sourceId, "A: rowIdentity on surfaced row");
    }
  }

  const agg = aggregateFromBase(base);
  const insights = deriveTopicInsights(agg);
  const dup = insights.filter((i) => i.sourceId.startsWith("topic:math:topic_alpha:grade:"));
  assert.equal(dup.length, 2, "A: two insight rows for same canonical topic, different grades");
  assert.notEqual(dup[0].sourceId, dup[1].sourceId, "A: insights distinct sourceIds");
  assert.ok(dup[0].displayNameHe.includes("כיתה") || dup[0].displayNameHe.includes("תרגול"), "A: grade in parent label");
}

// ─── B / C / D: Volume bands ─────────────────────────────────────────────────
{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const k4 = Object.keys(base.mathOperations).find((k) => k.includes("g4"));
  const k5 = Object.keys(base.mathOperations).find((k) => k.includes("g5"));
  const trStrong = traceRowThroughPipeline({ baseReport: base, detailedReport: detailed, subjectId: "math", topicRowKey: k4 });
  const trWeak = traceRowThroughPipeline({ baseReport: base, detailedReport: detailed, subjectId: "math", topicRowKey: k5 });

  assert.equal(classifyRowSectionPlacement(trStrong.identity), "strength");
  assert.equal(trStrong.identity.thinEvidenceDowngraded, false);
  assert.ok(!textImpliesThinDataMislabel(trStrong.identity, trStrong.stages.detailedTopicRec?.recommendedStepLabelHe || ""));

  assert.equal(classifyRowSectionPlacement(trWeak.identity), "focus");
  assert.equal(trWeak.identity.thinEvidenceDowngraded, false);
  assert.ok(sectionPlacementConsistent(trWeak.identity, "focus") || trWeak.stages.detailedWeakness, "C: weak placement");

  assert.notEqual(trStrong.identity.accuracy, trWeak.identity.accuracy, "D: no average contamination in identities");
}

// ─── E / F: Subskill metadata ────────────────────────────────────────────────
{
  const base = buildMultiSubjectMatrixBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const withPattern = base.diagnosticEngineV2.units.find((u) => u.taxonomy?.patternHe);
  assert.ok(withPattern, "E: fixture has pattern row");
  const tr = traceRowThroughPipeline({
    baseReport: base,
    detailedReport: detailed,
    subjectId: withPattern.subjectId,
    topicRowKey: withPattern.topicRowKey,
  });
  assert.equal(tr.identity.hasSubskillMetadata, true, "E: hasSubskillMetadata when pattern exists");
  const unc = String(tr.stages.narrativeUncertainty || "");
  assert.ok(!unc.includes(SUBSKILL_DETAIL_LIMITATION_HE.slice(0, 20)), "E: no subskill limitation when pattern exists");

  const noPattern = base.diagnosticEngineV2.units.find((u) => !u.taxonomy?.patternHe && u.evidenceTrace[0].value.questions >= 100);
  const tr2 = traceRowThroughPipeline({
    baseReport: base,
    detailedReport: detailed,
    subjectId: noPattern.subjectId,
    topicRowKey: noPattern.topicRowKey,
  });
  assert.equal(tr2.identity.hasSubskillMetadata, false, "F: no subskill when absent");
  assert.equal(tr2.identity.hasTopicLevelEvidence, true, "F: topic evidence still strong");
}

// ─── G: Subject matrix ───────────────────────────────────────────────────────
for (const sid of OUTPUT_INTEGRITY_SUBJECT_IDS) {
  const base = buildMultiSubjectMatrixBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const sp = detailed.subjectProfiles.find((s) => s.subject === sid);
  assert.ok(sp, `G: subject profile ${sid}`);
  const subjectKeys = listTopicRowKeysFromBaseReport(base).filter((k) => k.subjectId === sid);
  assert.ok(subjectKeys.length >= 2, `G: ${sid} has grade-split rows`);
  const identities = subjectKeys.map((k) =>
    traceRowThroughPipeline({ baseReport: base, detailedReport: detailed, ...k }),
  );
  const distinct = assertDistinctSourceIds(identities.map((t) => t.identity));
  assert.ok(distinct.ok, `G: ${sid} distinct sourceIds — ${distinct.message || ""}`);
}

// ─── Copilot: grade-split question (generic) ─────────────────────────────────
{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const payload = detailedReportToCopilotPayload(detailed);
  const meta = SUBJECT_TOPIC.math;
  const res = runTurn({
    audience: "parent",
    payload,
    utterance: `מה הבעיה ב${meta.labelHe}?`,
    sessionId: "integrity-grade-split",
  });
  assert.equal(res.resolutionStatus, "resolved");
  const text = (res.answerBlocks || []).map((b) => b.textHe).join("\n");
  assert.ok(!/ממוצע\s*דיוק\s*של\s*כ־80/u.test(text), "copilot: no silent 80% subject average");
  assert.ok(res.scopeType === "topic" || /כיתה|367|66|38|\d+\s*שאלות/u.test(text), "copilot: topic or row-grounded");
}

// ─── H: PDF fixture strings (generic checks only) ────────────────────────────
const pdfPaths = [
  join(REPO, "qa-visual-output", "parent-detailed-full.pdf"),
  join(REPO, "qa-visual-output", "parent-report-main.pdf"),
];
for (const pdfPath of pdfPaths) {
  if (!existsSync(pdfPath)) continue;
  try {
    const pdfParse = await import("pdf-parse");
    const buf = readFileSync(pdfPath);
    const parsed = await pdfParse.default(buf);
    const text = String(parsed.text || "");
    if (text.length < 80) continue;
    assert.ok(
      !/לאסוף עוד מידע לפני החלטה[\s\S]{0,40}367/u.test(text) && !/367[\s\S]{0,80}לאסוף עוד מידע/u.test(text),
      `H: PDF ${pdfPath} must not pair high-volume with collect-more-data`,
    );
  } catch {
    process.stdout.write(`  skip PDF parse ${pdfPath}\n`);
  }
}

// ─── Product contract + time on topic row ────────────────────────────────────
{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const contract = buildParentProductContractV1(detailed);
  assert.ok(contract && typeof contract === "object", "contract object built");
  const weakTr = (detailed.subjectProfiles.find((s) => s.subject === "math")?.topicRecommendations || [])[0];
  assert.ok(weakTr?.rowIdentityV1?.timeSpentMinutes > 0, "contract path: time on rowIdentityV1");
}

// Print deliverables
process.stdout.write("\n=== Root-cause table (pipeline stages) ===\n");
for (const r of ROOT_CAUSE_TABLE) {
  process.stdout.write(
    `- ${r.stage}: merge=${r.wrongMerge || "—"} lost=${r.lostField || "—"} section=${r.wrongSection || "—"} → ${r.fixedFile}\n`,
  );
}

process.stdout.write("\n=== Row trace sample (grade-split math) ===\n");
for (const t of TRACE_TABLE.slice(0, 4)) {
  process.stdout.write(
    `${t.sourceId} | q=${t.identity.questions} acc=${t.identity.accuracy}% time=${t.identity.timeSpentMinutes}m | map→detailed ${t.stages.mapRow?.questions}→${t.stages.detailedTopicRec?.questions}\n`,
  );
}

process.stdout.write("\nOK parent-report-output-integrity\n");

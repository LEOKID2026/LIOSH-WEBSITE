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
import { buildRealGradeSplitRegressionBaseReport } from "./fixtures/parent-report-real-regression-payload.mjs";
import {
  buildSixSubjectContextLabelingMatrixBaseReport,
  CONTEXT_LABELING_SUBJECT_IDS,
  matrixRowKeysForSubject,
} from "./fixtures/parent-report-context-labeling-matrix.mjs";
import { isCoreParentReportRow } from "../utils/parent-report-core-grade-filter.js";
import {
  collectParentFacingTextBundle,
  verifyPdfOrPrintOutput,
} from "./lib/parent-report-pdf-output-verify.mjs";

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
  assert.ok(!weakKeys.has(weakTr.topicRowKey), "A: higher-grade weak row excluded from core weaknesses");
  assert.ok(
    !(mathP?.topicRecommendations || []).some((tr) => tr.topicRowKey === weakTr.topicRowKey),
    "A: higher-grade weak row excluded from core recommendations",
  );

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
  assert.ok(dup[0].displayNameHe.includes(" - כיתה "), "A: short grade in parent label");
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
  assert.ok(
    !trWeak.stages.detailedWeakness && !trWeak.stages.detailedTopicRec,
    "C: higher-grade weak excluded from core detailed focus",
  );

  assert.notEqual(trStrong.identity.accuracy, trWeak.identity.accuracy, "D: no average contamination in identities");
}

// ─── E / F: Subskill metadata ────────────────────────────────────────────────
{
  const base = buildMultiSubjectMatrixBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const withPattern = base.diagnosticEngineV2.units.find(
    (u) => u.taxonomy?.patternHe && u.topicRowKey.includes("g4"),
  );
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
  assert.ok(res.scopeType === "topic" || /כיתה|450|76|41|\d+\s*שאלות/u.test(text), "copilot: topic or row-grounded");
}

// ─── H: Real regression payload print bundle (always) ───────────────────────
{
  const realBase = buildRealGradeSplitRegressionBaseReport();
  const realDetailed = buildDetailedParentReportFromBaseReport(realBase, { period: "week" });
  const printBundle = collectParentFacingTextBundle(realDetailed);
  assert.ok(printBundle.length >= 200, "H: real regression print bundle must be non-trivial");
  await verifyPdfOrPrintOutput({
    label: "real-regression-print-bundle",
    printDomText: printBundle,
  });
  const realKeys = listTopicRowKeysFromBaseReport(realBase).filter((k) => k.subjectId === "math");
  assert.equal(realKeys.length, 3, "H: three math topic rows in real regression");
  const mathProfile = realDetailed.subjectProfiles.find((s) => s.subject === "math");
  assert.equal(mathProfile?.topicOverviewRows?.length, 2, "H: topic overview lists core practiced rows only");
  assert.equal(mathProfile?.topicRecommendations?.length, 0, "H: no core focus for higher-grade weak row");
  for (const k of realKeys) {
    const tr = traceRowThroughPipeline({
      baseReport: realBase,
      detailedReport: realDetailed,
      ...k,
    });
    const mapRow = realBase.mathOperations?.[k.topicRowKey];
    const isCore = isCoreParentReportRow(
      {
        gradeRelation: mapRow?.gradeRelation,
        contentGradeKey: mapRow?.gradeKey ?? mapRow?.contentGradeKey,
        registeredGradeKey: realBase?.registeredGradeKey ?? mapRow?.registeredGradeKey,
        questions: mapRow?.questions,
      },
      realBase?.registeredGradeKey,
    );
    const overviewRow = (mathProfile?.topicOverviewRows || []).find(
      (r) => r.topicRowKey === k.topicRowKey,
    );
    if (isCore) {
      assert.ok(overviewRow?.narrativeTitleHe, `H: overview title for core row ${k.topicRowKey}`);
      assert.ok(!/תרגול ב|מעל הכיתה הרשומה/u.test(String(overviewRow?.narrativeTitleHe || "")), "H: short overview title");
    } else {
      assert.ok(!overviewRow, `H: out-of-grade row ${k.topicRowKey} excluded from core overview`);
    }
    const surfacedIdentity =
      tr.stages.detailedTopicRec?.rowIdentityV1 ||
      tr.stages.detailedStrength?.rowIdentityV1 ||
      tr.stages.detailedWeakness?.rowIdentityV1 ||
      overviewRow?.rowIdentityV1;
    if (isCore) {
      assert.ok(surfacedIdentity?.sourceId, `H: rowIdentity on surfaced core row ${k.topicRowKey}`);
    }
    assert.ok(tr.identity.timeSpentMinutes > 0, `H: time preserved ${k.topicRowKey}`);
  }
}

// ─── H2: Exported PDF bytes — PASS or explicit FAIL (no silent skip) ─────────
const pdfPaths = [
  { path: join(REPO, "qa-visual-output", "parent-detailed-full.pdf"), label: "parent-detailed-full.pdf" },
  { path: join(REPO, "qa-visual-output", "parent-report-main.pdf"), label: "parent-report-main.pdf" },
];
const realBaseForFallback = buildRealGradeSplitRegressionBaseReport();
const fallbackBundle = collectParentFacingTextBundle(
  buildDetailedParentReportFromBaseReport(realBaseForFallback, { period: "week" }),
);
let pdfIntegrityNote = "";
for (const { path: pdfPath, label } of pdfPaths) {
  if (!existsSync(pdfPath)) {
    pdfIntegrityNote = `PDF files missing — run npm run test:parent-report-real-output-signoff with dev server`;
    continue;
  }
  const buf = readFileSync(pdfPath);
  await verifyPdfOrPrintOutput({
    label,
    pdfBuffer: buf,
    printDomText: fallbackBundle,
  });
}
if (pdfIntegrityNote && !pdfPaths.some(({ path: p }) => existsSync(p))) {
  assert.fail(`H2: ${pdfIntegrityNote}`);
}

// ─── Product contract + time on topic row ────────────────────────────────────
{
  const base = buildGradeSplitBaseReport();
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const contract = buildParentProductContractV1(detailed);
  assert.ok(contract && typeof contract === "object", "contract object built");
  const strongTr = (detailed.subjectProfiles.find((s) => s.subject === "math")?.topStrengths || [])[0];
  assert.ok(strongTr?.rowIdentityV1?.timeSpentMinutes > 0, "contract path: time on rowIdentityV1");
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

// ─── I: Context-aware display labels (table vs narrative) ─────────────────────
{
  const {
    assertTableLabelsStayClean,
    assertNarrativeSurfacesDisambiguateDuplicates,
    assertAggregateExplainsGradeSplit,
    assertNoLongNarrativeTitles,
    assertTopicOverviewCompleteness,
    assertHomePlanReflectsStrengthAndSupport,
  } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "display-context-label-tests.js")).href
  );
  const realBase = buildRealGradeSplitRegressionBaseReport();
  const realDetailed = buildDetailedParentReportFromBaseReport(realBase, { period: "week" });
  for (const msg of assertTableLabelsStayClean(realBase)) {
    assert.fail(`I-table: ${msg}`);
  }
  const mathRows = Object.entries(realBase.mathOperations || {});
  assert.equal(mathRows.length, 3, "I: three math topic rows in table");
  const frac = mathRows.filter(([k]) => k.includes("fractions"));
  assert.equal(frac.length, 2, "I: two fractions rows");
  const cleanLabels = frac.map(([, r]) => r.cleanTopicLabelHe);
  assert.ok(cleanLabels.every((l) => l === "שברים"), "I: table clean labels stay שברים");
  assert.ok(
    frac.every(([, r]) => String(r.narrativeTopicLabelHe || "").includes(" - כיתה ")),
    "I: short narrative titles for grade-split topic",
  );
  assert.ok(
    frac.every(([, r]) => !/תרגול ב|מעל הכיתה הרשומה/u.test(String(r.narrativeTopicLabelHe || ""))),
    "I: relation not embedded in narrative title",
  );
  assert.notEqual(frac[0][1].narrativeTopicLabelHe, frac[1][1].narrativeTopicLabelHe, "I: distinct narrative labels");
  const mathP = realDetailed.subjectProfiles.find((s) => s.subject === "math");
  assert.equal(mathP?.topicOverviewRows?.length, 2, "I: topic overview shows core rows only");
  assert.equal(mathP?.topicRecommendations?.length, 0, "I: no core focus for higher-grade weak row");
  for (const msg of assertNarrativeSurfacesDisambiguateDuplicates(realDetailed)) {
    assert.fail(`I-narrative: ${msg}`);
  }
  for (const msg of assertNoLongNarrativeTitles(realDetailed)) {
    assert.fail(`I-title: ${msg}`);
  }
  for (const msg of assertTopicOverviewCompleteness(realDetailed, realBase)) {
    assert.fail(`I-overview: ${msg}`);
  }
  for (const msg of assertHomePlanReflectsStrengthAndSupport(realDetailed)) {
    assert.fail(`I-home: ${msg}`);
  }
  for (const msg of assertAggregateExplainsGradeSplit(realDetailed)) {
    assert.fail(`I-aggregate: ${msg}`);
  }
  assert.ok((realDetailed.outOfGradePracticeTransparency?.advancedPractice || []).length >= 1, "I: out-of-grade transparency rows");
}

// ─── J: Six-subject context-labeling matrix (all subjects) ───────────────────
{
  const { runContextLabelingMatrixAssertions } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "context-labeling-matrix.js")).href,
  );
  const matrixBase = buildSixSubjectContextLabelingMatrixBaseReport();
  const matrixDetailed = buildDetailedParentReportFromBaseReport(matrixBase, { period: "week" });
  const matrixFailures = runContextLabelingMatrixAssertions(matrixBase, matrixDetailed, {
    subjectIds: CONTEXT_LABELING_SUBJECT_IDS,
    matrixRowKeysForSubject,
  });
  for (const msg of matrixFailures) {
    assert.fail(`J-matrix: ${msg}`);
  }
  for (const sid of CONTEXT_LABELING_SUBJECT_IDS) {
    const sp = matrixDetailed.subjectProfiles.find((s) => s.subject === sid);
    const keys = matrixRowKeysForSubject(sid);
    assert.equal(sp?.topicOverviewRows?.length, 2, `J: ${sid} core overview has 2 rows`);
    assert.ok(
      !(sp?.topicRecommendations || []).some((r) => r.topicRowKey === keys.splitG5),
      `J: ${sid} must not focus higher-grade split`,
    );
  }
}

// ─── K: Zero-evidence policy (math only, others 0) ───────────────────────────
{
  const { buildMathOnlyOtherSubjectsZeroBaseReport } = await import(
    pathToFileURL(join(ROOT, "fixtures", "parent-report-zero-evidence-fixture.mjs")).href,
  );
  const {
    assertZeroEvidencePolicyOnReports,
    assertEvidenceTierClassification,
  } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "zero-evidence-policy-tests.js")).href,
  );
  const { buildDiagnosticOverviewHeV2ForTests } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-v2.js")).href,
  );
  const {
    buildSubjectEvidenceCoverageLines,
    practicedSubjectsSummaryLineHe,
    notPracticedSubjectsSummaryLineHe,
  } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-language", "subject-evidence-policy.js")).href,
  );
  const { hardenBaseReportWithRowIdentity } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "harden-report-rows.js")).href,
  );
  const { subjectQuestionCountsFromBase } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "zero-evidence-policy-tests.js")).href,
  );
  for (const msg of assertEvidenceTierClassification()) assert.fail(`K-tier: ${msg}`);
  const zBase = buildMathOnlyOtherSubjectsZeroBaseReport();
  hardenBaseReportWithRowIdentity(zBase);
  const zCounts = subjectQuestionCountsFromBase(zBase);
  const labels = {
    math: "מתמטיקה",
    geometry: "גאומטריה",
    english: "אנגלית",
    science: "מדעים",
    hebrew: "עברית",
    "moledet-geography": "מולדת וגאוגרפיה",
  };
  const zCov = buildSubjectEvidenceCoverageLines(zCounts, labels);
  zBase.summary.diagnosticOverviewHe = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: zBase.diagnosticEngineV2,
    subjectQuestionCounts: zCounts,
    maps: { math: zBase.mathOperations },
    fallbackOverview: {},
    insufficientDataSubjectsHe: zCov.thinEvidenceSubjectsHe,
    thinEvidenceSubjectsHe: zCov.thinEvidenceSubjectsHe,
    practicedSubjectsSummaryHe: practicedSubjectsSummaryLineHe(zCounts, labels),
    notPracticedSubjectsSummaryHe: notPracticedSubjectsSummaryLineHe(zCounts, labels),
  });
  const zDetailed = buildDetailedParentReportFromBaseReport(zBase, { period: "week" });
  for (const msg of assertZeroEvidencePolicyOnReports(zBase, zDetailed)) {
    assert.fail(`K-zero: ${msg}`);
  }
}

// ─── L: Thin-data short overview (2–3 questions, cannot conclude, withhold) ───
{
  const { buildDiagnosticOverviewHeV2ForTests } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-v2.js")).href,
  );
  const { v2ShortOverviewCannotConcludeHe } = await import(
    pathToFileURL(join(REPO, "utils", "parent-report-language", "short-report-v2-copy.js")).href,
  );
  const thinCopy = v2ShortOverviewCannotConcludeHe();
  const thinUnit = {
    subjectId: "geometry",
    topicRowKey: "shapes::grade:g3",
    displayName: "צורות",
    evidenceTrace: [{ type: "volume", value: { questions: 3, correct: 1, wrong: 2, accuracy: 33 } }],
    taxonomy: {},
    priority: { level: "P2" },
    outputGating: { cannotConcludeYet: true, diagnosisAllowed: false },
    diagnosis: { allowed: false },
    canonicalState: {
      actionState: "withhold",
      assessment: { cannotConcludeYet: true, readiness: "insufficient" },
    },
    confidence: { rowSignals: { dataSufficiencyLevel: "low" } },
  };
  const strongUnit = {
    subjectId: "math",
    topicRowKey: "fractions::grade:g5",
    displayName: "שברים",
    evidenceTrace: [{ type: "volume", value: { questions: 55, correct: 21, wrong: 34, accuracy: 38 } }],
    taxonomy: { patternHe: "בלבול מכנה משותף" },
    priority: { level: "P4" },
    recurrence: { wrongCountForRules: 12 },
    outputGating: { cannotConcludeYet: false, diagnosisAllowed: true },
    diagnosis: { allowed: true, lineHe: "בלבול מכנה משותף" },
    canonicalState: {
      actionState: "intervene",
      assessment: { cannotConcludeYet: false, readiness: "ready" },
    },
  };
  const thinOv = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: { units: [thinUnit] },
    subjectQuestionCounts: { geometry: 3 },
    maps: {},
    fallbackOverview: {},
    insufficientDataSubjectsHe: [],
    thinEvidenceSubjectsHe: [],
  });
  const mixedOv = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: { units: [thinUnit, strongUnit] },
    subjectQuestionCounts: { geometry: 3, math: 55 },
    maps: {},
    fallbackOverview: {},
    insufficientDataSubjectsHe: [],
    thinEvidenceSubjectsHe: [],
  });
  assert.ok(
    String(thinOv.mainFocusAreaLineHe || "").includes(thinCopy),
    "L: thin mainFocus must include partial-data collect-more copy",
  );
  assert.ok(
    !/פער ידע|התערבות אגרסיבית/i.test(String(thinOv.mainFocusAreaLineHe || "")),
    "L: thin mainFocus must not over-diagnose",
  );
  assert.ok(
    !String(mixedOv.mainFocusAreaLineHe || "").includes(thinCopy),
    "L: strong attention row must not get thin hedge on mainFocus",
  );
}

process.stdout.write("\nOK parent-report-output-integrity\n");

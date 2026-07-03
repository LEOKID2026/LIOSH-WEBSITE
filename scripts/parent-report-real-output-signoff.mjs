/**
 * Hard real-output sign-off: real regression payload + optional Playwright PDF export.
 * Run: npm run test:parent-report-real-output-signoff
 * Requires dev server for PDF export (QA_BASE_URL, default http://127.0.0.1:3001).
 */

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const OUT_DIR = join(REPO, "qa-visual-output");
const REPORT_JSON = join(OUT_DIR, "real-output-signoff-report.json");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildRealGradeSplitRegressionBaseReport } = await import(
  pathToFileURL(join(ROOT, "fixtures", "parent-report-real-regression-payload.mjs")).href,
);
const {
  buildSixSubjectContextLabelingMatrixBaseReport,
  CONTEXT_LABELING_SUBJECT_IDS,
  matrixRowKeysForSubject,
} = await import(pathToFileURL(join(ROOT, "fixtures", "parent-report-context-labeling-matrix.mjs")).href);
const { buildDetailedParentReportFromBaseReport, buildTopicRecommendationFromV2UnitForPhaseTests } = await load(
  "utils/detailed-parent-report.js",
);
const {
  assertDistinctSourceIds,
  classifyRowSectionPlacement,
  sectionPlacementConsistent,
  textImpliesThinDataMislabel,
  parentLabelHasGradeContext,
} = await load("utils/parent-report-output-integrity/row-identity-v1.js");
const { SUBSKILL_DETAIL_LIMITATION_HE } = await load("utils/parent-report-topic-evidence.js");
const { deriveTopicInsights } = await load("utils/parent-report-insights/derive-topic-insights.js");
const {
  traceRowThroughPipeline,
  listTopicRowKeysFromBaseReport,
  detailedReportToCopilotPayload,
} = await load("utils/parent-report-output-integrity/trace-row-pipeline.js");
const {
  collectParentFacingTextBundle,
  verifyPdfOrPrintOutput,
} = await import(pathToFileURL(join(ROOT, "lib", "parent-report-pdf-output-verify.mjs")).href);
const { baseReportToLocalStorageSnapshot } = await import(
  pathToFileURL(join(ROOT, "lib", "base-report-to-local-storage.mjs")).href,
);
const parentCopilot = await load("utils/parent-copilot/index.js");
const runTurn = parentCopilot.runParentCopilotTurn;

/** @type {string[]} */
const FAILURES = [];
/** @type {object[]} */
const TRACE_ROWS = [];
/** @type {string[]} */
const PDF_CHECKS = [];
function fail(msg) {
  FAILURES.push(msg);
}

function parseFixtureArg() {
  const idx = process.argv.indexOf("--fixture");
  if (idx >= 0 && process.argv[idx + 1]) return resolve(process.cwd(), process.argv[idx + 1]);
  return null;
}

async function loadBaseReportFromFixture(fixturePath) {
  const mod = await import(pathToFileURL(fixturePath).href);
  if (typeof mod.buildRealGradeSplitRegressionBaseReport === "function") {
    return { base: mod.buildRealGradeSplitRegressionBaseReport(), source: fixturePath, kind: "baseReport" };
  }
  if (typeof mod.buildGradeSplitBaseReport === "function") {
    return { base: mod.buildGradeSplitBaseReport(), source: fixturePath, kind: "baseReport" };
  }
  const snap = mod.LOCAL_STORAGE_SNAPSHOT || mod.getLocalStorageSnapshot?.();
  if (snap && typeof snap === "object") {
    const { buildBaseReportFromLocalStorageSnapshot } = await import(
      pathToFileURL(join(ROOT, "lib", "run-parent-report-from-local-storage.mjs")).href,
    );
    const base = await buildBaseReportFromLocalStorageSnapshot(snap, { period: "week" });
    if (!base) throw new Error("localStorage snapshot did not produce base report");
    return { base, source: fixturePath, kind: "localStorage" };
  }
  if (typeof mod.default === "function") {
    const out = mod.default();
    if (out?.mathOperations || out?.diagnosticEngineV2) {
      return { base: out, source: fixturePath, kind: "baseReport" };
    }
  }
  throw new Error(`Fixture ${fixturePath} must export baseReport builder or LOCAL_STORAGE_SNAPSHOT`);
}

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

function sectionPlacement(trace) {
  if (trace.stages.detailedStrength) return "strength";
  if (trace.stages.detailedWeakness) return "weakness";
  const tr = trace.stages.detailedTopicRec;
  if (tr?.thinEvidenceDowngraded) return "thin";
  return classifyRowSectionPlacement(trace.identity);
}

function buildTraceRow(trace, detailed, insights, copilotTextByRow) {
  const id = trace.identity;
  const tr = trace.stages.detailedTopicRec;
  const insight = (insights || []).find((i) => i.sourceId === id.sourceId);
  const pdfSnippet = (copilotTextByRow.get(id.topicRowKey) || "").slice(0, 120);
  return {
    rowSourceId: id.sourceId,
    subject: id.subjectId,
    topic: id.canonicalTopicKey,
    contentGradeKey: id.contentGradeKey,
    registeredGradeKey: id.registeredGradeKey,
    gradeRelation: id.gradeRelation,
    questions: id.questions,
    correct: id.correct,
    accuracy: id.accuracy,
    timeSpentMinutes: id.timeSpentMinutes,
    latestActivityAt: id.latestActivityAt,
    status: tr?.recommendedStepLabelHe || classifyRowSectionPlacement(id),
    sectionPlacement: sectionPlacement(trace),
    recommendationLabel: tr?.recommendedStepLabelHe || null,
    patternSubskill: id.diagnosticPatternHe || tr?.hasSubskillMetadata ? "subskill-present" : null,
    summaryItem: insight?.displayNameHe || insight?.headlineHe || null,
    copilotTruthSnippet: trace.stages.copilotAnchored?.observation || null,
    pdfTextSnippet: pdfSnippet,
    hasRowIdentityV1: Boolean(
      tr?.rowIdentityV1?.sourceId ||
        trace.stages.detailedStrength?.rowIdentityV1?.sourceId ||
        trace.stages.detailedWeakness?.rowIdentityV1?.sourceId,
    ),
  };
}

function assertNoCollapsedGradeSplitNarrative(detailed, base) {
  const es = detailed?.executiveSummary || {};
  const bundle = [
    ...(es.topFocusAreasHe || []),
    ...(es.topStrengthsAcrossHe || []),
    ...(es.homeFocusHe ? [es.homeFocusHe] : []),
    ...(detailed?.homePlan?.itemsHe || []),
    ...(es.gradeSplitTopicNoticesHe || []),
  ].join("\n");
  const mathKeys = Object.keys(base?.mathOperations || {}).filter((k) => k.includes("::grade:"));
  if (mathKeys.length < 2) return;
  const hasFractionsDup = mathKeys.filter((k) => k.startsWith("fractions::")).length >= 2;
  if (!hasFractionsDup) return;
  const transparencyRows =
    (detailed?.outOfGradePracticeTransparency?.advancedPractice?.length || 0) +
    (detailed?.outOfGradePracticeTransparency?.foundationPractice?.length || 0);
  const hasSplitExplanation =
    (es.gradeSplitTopicNoticesHe || []).length > 0 || transparencyRows > 0;
  if (/שברים[^.\n]{0,30}דורש חיזוק/u.test(bundle) && !hasSplitExplanation) {
    fail("aggregate narrative collapses grade-split שברים into single weakness without split notice");
  }
  if (!hasSplitExplanation && !base?.registeredGradeKey) {
    fail("grade-split שברים rows present but no split explanation (notice or transparency)");
  }
}

function runHardChecks(traces, detailed, printBundle) {
  const byLabel = new Map();
  for (const t of traces) {
    const label = t.identity.displayName || t.topicRowKey;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(t);
  }
  for (const [label, group] of byLabel) {
    if (group.length >= 2 && !parentLabelHasGradeContext(label, group.map((g) => g.identity))) {
      const grades = group.map((g) => g.identity.contentGradeKey).join(",");
      const hasGradeInLabels = group.some(
        (g) =>
          /כיתה|מעל|תרגול/u.test(String(g.stages.detailedTopicRec?.recommendedStepLabelHe || "")) ||
          /כיתה|מעל|תרגול/u.test(String(g.stages.detailedStrength?.labelHe || "")),
      );
      if (!hasGradeInLabels) {
        fail(`duplicate label "${label}" without grade context (${grades})`);
      }
    }
  }

  for (const t of traces) {
    const id = t.identity;
    const tr = t.stages.detailedTopicRec;
    const placement = sectionPlacement(t);
    const recLabel = tr?.recommendedStepLabelHe || "";

    if (id.questions >= 40 && id.accuracy >= 78) {
      if (placement === "weakness" || /תמיכה|חולשה|דורש חיזוק/i.test(recLabel)) {
        fail(`${id.sourceId}: strong row in weakness/support without reason`);
      }
      if (textImpliesThinDataMislabel(id, recLabel) || textImpliesThinDataMislabel(id, t.stages.narrativeUncertainty || "")) {
        fail(`${id.sourceId}: generic thin-data on strong row`);
      }
    }
    if (id.questions >= 12 && id.accuracy < 55) {
      if (/שימור|הצלחה|מצוין|חזק מאוד/i.test(recLabel) && !/חיזוק|תרגול|מיקוד/i.test(recLabel)) {
        fail(`${id.sourceId}: low-accuracy row has success/maintenance wording`);
      }
    }
    const mapTime = t.stages.mapRow?.timeMinutes ?? 0;
    const idTime = id.timeSpentMinutes ?? 0;
    if (mapTime > 0 && idTime === 0) {
      fail(`${id.sourceId}: timeSpentMinutes lost (map ${mapTime} → identity 0)`);
    }
    if (id.hasSubskillMetadata === false && id.questions >= 100 && String(t.stages.narrativeUncertainty || "").includes(SUBSKILL_DETAIL_LIMITATION_HE.slice(0, 20))) {
      fail(`${id.sourceId}: subskill limitation on row without subskill gap`);
    }
    const surfacedId =
      tr?.rowIdentityV1?.sourceId ||
      t.stages.detailedStrength?.rowIdentityV1?.sourceId ||
      t.stages.detailedWeakness?.rowIdentityV1?.sourceId;
    if (!surfacedId && (tr || t.stages.detailedStrength || t.stages.detailedWeakness)) {
      fail(`${id.sourceId}: surfaced row missing rowIdentityV1`);
    }
  }

  const bundle = String(printBundle || "");
  if (/לאסוף עוד מידע[\s\S]{0,80}450/u.test(bundle)) {
    fail("print bundle pairs 450-Q row with collect-more-data");
  }
}

async function exportPdfsWithPlaywright(base) {
  const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3001";
  const snapshot = baseReportToLocalStorageSnapshot(base, "RealRegressionSignoff");
  mkdirSync(OUT_DIR, { recursive: true });

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (e) {
    throw new Error(`Playwright unavailable for PDF export: ${e.message}`);
  }

  const root = baseUrl.replace(/\/$/, "");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(`${root}/learning/parent-report`, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
  const page = await context.newPage();
  await page.goto(`${root}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate((data) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(data || {})) localStorage.setItem(k, String(v));
  }, snapshot);

  const pdfOpts = {
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    preferCSSPageSize: true,
  };

  const exports = [];

  async function captureRoute(path, outName, waitSel) {
    await page.goto(`${root}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (waitSel) {
      await page.waitForSelector(waitSel, { timeout: 90_000, state: "attached" }).catch(() => {});
    }
    await page.waitForTimeout(800);
    await page.emulateMedia({ media: "print" });
    const printDomText = await page.evaluate(() => document.body?.innerText || "");
    await page.emulateMedia({ media: "screen" });
    await page.emulateMedia({ media: "print" });
    const buf = await page.pdf({ ...pdfOpts });
    const outPath = join(OUT_DIR, outName);
    writeFileSync(outPath, buf);
    const check = await verifyPdfOrPrintOutput({
      label: outName,
      pdfBuffer: buf,
      printDomText,
      requirePdfBytes: true,
    });
    PDF_CHECKS.push(
      `${outName}: ${check.usedFallback ? "PASS (print-dom fallback)" : `PASS (pdf-bytes/${check.pdfMethod})`}`,
    );
    exports.push({ outPath, printDomText });
  }

  await captureRoute("/learning/parent-report", "parent-report-main.pdf", ".parent-report-parent-ai-insight");
  await captureRoute("/learning/parent-report-detailed", "parent-detailed-full.pdf", ".parent-report-parent-ai-insight");

  await browser.close();
  return exports;
}

// ─── Main sign-off ───────────────────────────────────────────────────────────
const fixturePath = parseFixtureArg();
const regressionLoaded = fixturePath
  ? await loadBaseReportFromFixture(fixturePath)
  : {
      base: buildRealGradeSplitRegressionBaseReport(),
      source: "scripts/fixtures/parent-report-real-regression-payload.mjs",
      kind: "baseReport",
    };

const { auditParentFacingSurfaces, PARENT_FACING_SURFACES } = await import(
  pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "surface-classification-audit.js")).href,
);

// ─── Six-subject matrix (all subjects) — always run before primary payload ───
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
  fail(`six-subject matrix: ${msg}`);
}
for (const sid of CONTEXT_LABELING_SUBJECT_IDS) {
  const sp = matrixDetailed.subjectProfiles.find((s) => s.subject === sid);
  const keys = matrixRowKeysForSubject(sid);
  if ((sp?.topicOverviewRows?.length || 0) !== 2) {
    fail(`${sid}: topicOverviewRows expected 2 core rows, got ${sp?.topicOverviewRows?.length || 0}`);
  }
  if ((sp?.topicRecommendations || []).some((r) => r.topicRowKey === keys.splitG5)) {
    fail(`${sid}: higher-grade split must not appear in core topicRecommendations`);
  }
}

const { buildMathOnlyOtherSubjectsZeroBaseReport } = await import(
  pathToFileURL(join(ROOT, "fixtures", "parent-report-zero-evidence-fixture.mjs")).href,
);
const { assertZeroEvidencePolicyOnReports, subjectQuestionCountsFromBase } = await import(
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
const zeroBase = buildMathOnlyOtherSubjectsZeroBaseReport();
hardenBaseReportWithRowIdentity(zeroBase);
const zLabels = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};
const zCounts = subjectQuestionCountsFromBase(zeroBase);
const zCov = buildSubjectEvidenceCoverageLines(zCounts, zLabels);
zeroBase.summary.diagnosticOverviewHe = buildDiagnosticOverviewHeV2ForTests({
  diagnosticEngineV2: zeroBase.diagnosticEngineV2,
  subjectQuestionCounts: zCounts,
  maps: { math: zeroBase.mathOperations },
  fallbackOverview: {},
  insufficientDataSubjectsHe: zCov.thinEvidenceSubjectsHe,
  thinEvidenceSubjectsHe: zCov.thinEvidenceSubjectsHe,
  practicedSubjectsSummaryHe: practicedSubjectsSummaryLineHe(zCounts, zLabels),
  notPracticedSubjectsSummaryHe: notPracticedSubjectsSummaryLineHe(zCounts, zLabels),
});
const zeroDetailed = buildDetailedParentReportFromBaseReport(zeroBase, { period: "week" });
for (const msg of assertZeroEvidencePolicyOnReports(zeroBase, zeroDetailed)) {
  fail(`zero-evidence: ${msg}`);
}

const base = regressionLoaded.base;
const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
const payload = detailedReportToCopilotPayload(detailed);
const insights = deriveTopicInsights(aggregateFromBase(base));
const printBundle = collectParentFacingTextBundle(detailed);

const surfaceAudit = auditParentFacingSurfaces(detailed, base);
if (!surfaceAudit.pass) {
  for (const b of surfaceAudit.blockingFailures) {
    fail(`surface audit [${b.surfaceId}]: ${b.reason}`);
  }
}

const rowKeys = listTopicRowKeysFromBaseReport(base);
const traces = rowKeys.map((k) =>
  traceRowThroughPipeline({ baseReport: base, detailedReport: detailed, copilotPayload: payload, ...k }),
);

assertNoCollapsedGradeSplitNarrative(detailed, base);
const {
  assertTableLabelsStayClean,
  assertNarrativeSurfacesDisambiguateDuplicates,
  assertAggregateExplainsGradeSplit,
  assertNoLongNarrativeTitles,
  assertTopicOverviewCompleteness,
  assertHomePlanReflectsStrengthAndSupport,
} = await import(
  pathToFileURL(join(REPO, "utils", "parent-report-output-integrity", "display-context-label-tests.js")).href,
);
for (const msg of [
  ...assertTableLabelsStayClean(base),
  ...assertNarrativeSurfacesDisambiguateDuplicates(detailed),
  ...assertAggregateExplainsGradeSplit(detailed),
  ...assertNoLongNarrativeTitles(detailed),
  ...assertTopicOverviewCompleteness(detailed, base),
  ...assertHomePlanReflectsStrengthAndSupport(detailed),
]) {
  fail(msg);
}
const mathSignoff = detailed.subjectProfiles.find((s) => s.subject === "math");
const kFrac5 = "fractions::grade:g5";
if ((mathSignoff?.topicOverviewRows?.length || 0) < 2) {
  fail("math topicOverviewRows must list core practiced topic rows (expected 2 same-grade rows)");
}
if ((mathSignoff?.topicRecommendations || []).some((r) => r.topicRowKey === kFrac5)) {
  fail("math topicRecommendations must not include higher-grade fractions g5 in core focus");
}
const g5Unit = base.diagnosticEngineV2?.units?.find((u) => u.topicRowKey === kFrac5);
if (g5Unit) {
  const g5Rec = buildTopicRecommendationFromV2UnitForPhaseTests(g5Unit, base, "math");
  if (g5Rec.thinEvidenceDowngraded) {
    fail("fractions g5 weak row must not be thin-downgraded at unit level (66 Q)");
  }
  if (g5Rec.recommendedStepLabelHe === "לאסוף עוד מידע לפני החלטה") {
    fail("fractions g5 weak row must not get collect-more-data label at unit level");
  }
}
runHardChecks(traces, detailed, printBundle);

const distinct = assertDistinctSourceIds(traces.map((t) => t.identity));
if (!distinct.ok) fail(distinct.message || "duplicate sourceIds");

const copilotTextByRow = new Map();
for (const k of rowKeys.filter((r) => r.subjectId === "math")) {
  const res = runTurn({
    audience: "parent",
    payload,
    utterance: `מה הבעיה ב${traces.find((t) => t.topicRowKey === k.topicRowKey)?.identity.displayName || "שברים"}?`,
    sessionId: `signoff-${k.topicRowKey}`,
  });
  const text = (res.answerBlocks || []).map((b) => b.textHe).join("\n");
  copilotTextByRow.set(k.topicRowKey, text);
  if (/ממוצע\s*דיוק\s*של\s*כ־80/u.test(text) && k.topicRowKey.includes("fractions")) {
    fail("Copilot averaged grade-split fractions rows (~80% subject average)");
  }
}

const splitRes = runTurn({
  audience: "parent",
  payload,
  utterance: "למה יש שתי כיתות באותו נושא בשברים?",
  sessionId: "signoff-split",
});
const splitText = (splitRes.answerBlocks || []).map((b) => b.textHe).join("\n");
if (!/כיתה|450|76|88|41|נפרד|שברים/i.test(splitText)) {
    fail("Copilot did not explain grade-split for שברים");
}

for (const t of traces) {
  TRACE_ROWS.push(buildTraceRow(t, detailed, insights, copilotTextByRow));
}

let pdfSkipped = false;
const skipExport = process.env.SIGNOFF_SKIP_PDF_EXPORT === "1";
if (!skipExport) {
  try {
    await exportPdfsWithPlaywright(base);
  } catch (e) {
    pdfSkipped = true;
    PDF_CHECKS.push(`FAIL: PDF export — ${e.message}`);
    fail(`PDF export/verify failed: ${e.message}`);
    for (const name of ["parent-report-main.pdf", "parent-detailed-full.pdf"]) {
      const p = join(OUT_DIR, name);
      if (existsSync(p)) {
        try {
          const buf = readFileSync(p);
          await verifyPdfOrPrintOutput({
            label: name,
            pdfBuffer: buf,
            printDomText: printBundle,
          });
          PDF_CHECKS.push(`${name}: PASS (stale file + print-bundle fallback)`);
        } catch (err) {
          PDF_CHECKS.push(`${name}: FAIL — ${err.message}`);
        }
      }
    }
  }
} else {
  pdfSkipped = true;
  try {
    await verifyPdfOrPrintOutput({
      label: "in-process-print-bundle",
      printDomText: printBundle,
    });
    PDF_CHECKS.push("PASS: in-process print bundle (SIGNOFF_SKIP_PDF_EXPORT=1)");
  } catch (e) {
    PDF_CHECKS.push(`FAIL: in-process print bundle — ${e.message}`);
    fail(e.message);
  }
}

const regressionVerdict = FAILURES.length === 0 && surfaceAudit.pass ? "PASS" : "FAIL";
const exactChildVerdict = fixturePath && regressionLoaded.kind === "localStorage" ? regressionVerdict : fixturePath ? regressionVerdict : "SKIPPED";
const surfaceAuditVerdict = surfaceAudit.pass ? "PASS" : "FAIL";

const report = {
  verdict: regressionVerdict,
  regressionPayload: { verdict: regressionVerdict, source: regressionLoaded.source, kind: regressionLoaded.kind },
  exactChildPayload: {
    verdict: exactChildVerdict,
    source: fixturePath || null,
    note: fixturePath ? null : "pass --fixture scripts/fixtures/snapshots/<child>.fixture.mjs for exact blob",
  },
  surfaceIdentityAudit: {
    verdict: surfaceAuditVerdict,
    classificationTable: PARENT_FACING_SURFACES,
    results: surfaceAudit.results,
    blockingFailures: surfaceAudit.blockingFailures,
  },
  generatedAt: new Date().toISOString(),
  rowCount: TRACE_ROWS.length,
  pdfChecks: PDF_CHECKS,
  pdfExportSkipped: pdfSkipped,
  failures: FAILURES,
  traceTable: TRACE_ROWS,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");

process.stdout.write("\n=== Real-output sign-off row trace ===\n");
for (const r of TRACE_ROWS) {
  process.stdout.write(
    [
      r.rowSourceId,
      r.subject,
      r.topic,
      `g=${r.contentGradeKey || "?"}`,
      `q=${r.questions}`,
      `acc=${r.accuracy}%`,
      `time=${r.timeSpentMinutes}m`,
      `section=${r.sectionPlacement}`,
      `rec=${(r.recommendationLabel || "").slice(0, 40)}`,
      `rowId=${r.hasRowIdentityV1}`,
    ].join(" | ") + "\n",
  );
}

process.stdout.write("\n=== PDF / output checks ===\n");
for (const line of PDF_CHECKS) process.stdout.write(`  ${line}\n`);
process.stdout.write(`\nPDF checks skipped (export): ${pdfSkipped ? "yes (see pdfChecks)" : "no"}\n`);

process.stdout.write("\n=== Surface classification audit ===\n");
for (const s of PARENT_FACING_SURFACES) {
  const r = surfaceAudit.results.find((x) => x.surfaceId === s.id);
  process.stdout.write(
    `  ${s.id} [${s.classification}]: ${r?.status || "n/a"} — ${r?.reason || s.implementation}\n`,
  );
}

process.stdout.write(`\n=== VERDICT ===\n`);
process.stdout.write(`  regression payload: ${regressionVerdict}\n`);
process.stdout.write(`  exact child payload: ${exactChildVerdict}\n`);
process.stdout.write(`  surface rowIdentity audit: ${surfaceAuditVerdict}\n`);
process.stdout.write(`  overall: ${regressionVerdict}\n`);
process.stdout.write(`Report: ${REPORT_JSON}\n`);

if (regressionVerdict === "FAIL") {
  for (const f of FAILURES) process.stderr.write(`FAIL: ${f}\n`);
  process.exit(1);
}

process.stdout.write("OK parent-report-real-output-signoff\n");

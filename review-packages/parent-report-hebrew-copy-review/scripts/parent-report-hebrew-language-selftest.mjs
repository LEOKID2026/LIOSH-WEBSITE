/**
 * Parent report Hebrew language layer — smoke + forbidden-term scan.
 * Run: npm run test:parent-report-hebrew-language
 *
 * Uses absolute file URLs for imports (same pattern as parent-report-phase6-suite.mjs)
 * so tsx on Windows resolves `utils/*.js` correctly.
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  findForbiddenSubstringsInString,
  findReadabilityLeakSubstringsInString,
  scanValueForForbidden,
} = await import(u("utils/parent-report-language/forbidden-terms.js"));
const { normalizePedagogyForParentReportHe } = await import(u("utils/parent-report-language/pedagogy-glossary-he.js"));
const { normalizeParentFacingHe } = await import(u("utils/parent-report-language/parent-facing-normalize-he.js"));
const { buildWhyThisRecommendationHe, interventionTypeLabelHe } = await import(u("utils/topic-next-step-phase2.js"));
const { confidenceLevelParentSummaryHe } = await import(u("utils/parent-report-language/confidence-parent-he.js"));
const { priorityLevelParentLabelHe } = await import(u("utils/parent-report-language/priority-parent-he.js"));
const { diagnosticPrimarySourceParentLabelHe } = await import(
  u("utils/parent-report-language/short-report-source-label-he.js")
);
const {
  executiveV2HomeFocusHe,
  executiveV2MajorTrendsLinesHe,
  executiveV2MixedSignalNoticeHe,
  executiveV2OverallConfidenceHe,
  executiveV2EvidenceBalanceHe,
  executiveV2CautionNoteHe,
  executiveV2ReportReadinessHe,
  homePlanV2EmptyFallbackHe,
  nextPeriodGoalsV2EmptyFallbackHe,
  crossSubjectV2BulletsHe,
  crossSubjectV2DataQualityNoteHe,
  subjectV2TrendNarrativeHighPriorityHe,
  subjectV2TrendNarrativeStableHe,
  subjectV2RecalibrationNeedYesHe,
  subjectV2RecalibrationNeedNoHe,
  topicRecommendationV2CautionGatedHe,
  subjectV2ConfidenceSummaryHe,
} = await import(u("utils/parent-report-language/v2-parent-copy.js"));

function assertNoForbidden(label, s) {
  const hits = findForbiddenSubstringsInString(s);
  assert.equal(
    hits.length,
    0,
    `${label}: forbidden fragment(s) [${hits.join(", ")}] in:\n${String(s).slice(0, 400)}`
  );
}

function assertNoReadabilityLeaks(label, s) {
  const hits = findReadabilityLeakSubstringsInString(s);
  assert.equal(
    hits.length,
    0,
    `${label}: readability leak(s) [${hits.join(", ")}] in:\n${String(s).slice(0, 400)}`
  );
}

const samples = [];

samples.push(["exec home empty", executiveV2HomeFocusHe([])]);
samples.push(["exec home with", executiveV2HomeFocusHe(["חשבון: חיסור", "עברית: דיקדוק"])]);
samples.push(["exec trends", executiveV2MajorTrendsLinesHe({ units: 10, diagnosed: 6, uncertain: 2, stable: 3 }).join("\n")]);
samples.push(["exec mixed", executiveV2MixedSignalNoticeHe(true)]);
samples.push(["exec mixed off", executiveV2MixedSignalNoticeHe(false)]);
samples.push(["exec overall", executiveV2OverallConfidenceHe(5, 10)]);
samples.push(["exec evidence", executiveV2EvidenceBalanceHe(3, 7)]);
samples.push(["exec caution p4", executiveV2CautionNoteHe({ p4Length: 2, uncertainLength: 0 })]);
samples.push(["exec caution u", executiveV2CautionNoteHe({ p4Length: 0, uncertainLength: 3 })]);
samples.push(["exec readiness hi", executiveV2ReportReadinessHe(12)]);
samples.push(["exec readiness lo", executiveV2ReportReadinessHe(3)]);
samples.push(["home empty", homePlanV2EmptyFallbackHe()]);
samples.push(["goals empty", nextPeriodGoalsV2EmptyFallbackHe()]);
samples.push(["cross bullets", crossSubjectV2BulletsHe({ unitsLength: 8, highPriorityCount: 2, contradictoryCount: 1 }).join("\n")]);
samples.push(["cross dq", crossSubjectV2DataQualityNoteHe(4) || ""]);
samples.push(["subj trend hi", subjectV2TrendNarrativeHighPriorityHe()]);
samples.push(["subj trend st", subjectV2TrendNarrativeStableHe()]);
samples.push(["subj rec y", subjectV2RecalibrationNeedYesHe()]);
samples.push(["subj rec n", subjectV2RecalibrationNeedNoHe()]);
samples.push(["topic caution", topicRecommendationV2CautionGatedHe()]);
samples.push(["subj conf", subjectV2ConfidenceSummaryHe("moderate")]);

for (const level of ["high", "moderate", "low", "early_signal_only", "insufficient_data", "contradictory", ""]) {
  samples.push([`conf.${level || "default"}`, confidenceLevelParentSummaryHe(level)]);
}

for (const pr of ["P1", "P2", "P3", "P4", ""]) {
  const v = priorityLevelParentLabelHe(pr);
  if (v) samples.push([`pri.${pr}`, v]);
}

for (const src of ["diagnosticEngineV2", "legacy_patternDiagnostics_fallback", "unknown"]) {
  samples.push([`src.${src}`, diagnosticPrimarySourceParentLabelHe(src)]);
}

const SURFACE_ROW_LABELS = {
  topicPatternCounts: "תמונת מצב בשאלות",
  majorRisks: "נקודות לתשומת לב",
};
for (const [k, v] of Object.entries(SURFACE_ROW_LABELS)) {
  samples.push([`rowlabel.${k}`, v]);
}

for (const [name, text] of samples) {
  assertNoForbidden(name, text);
  assertNoReadabilityLeaks(name, text);
}

const tree = {
  a: crossSubjectV2BulletsHe({ unitsLength: 3, highPriorityCount: 0, contradictoryCount: 0 }),
  b: { nested: executiveV2MajorTrendsLinesHe({ units: 1, diagnosed: 0, uncertain: 1, stable: 0 }) },
};
let treeHits = 0;
scanValueForForbidden(tree, () => {
  treeHits += 1;
});
assert.equal(treeHits, 0, "scanValueForForbidden should find no hits in sample tree");

// Pedagogy gloss — engine/taxonomy phrasing → parent Hebrew (display layer)
assert.equal(
  normalizePedagogyForParentReportHe("חיבור עם/בלי נשיאה"),
  "חיבור עם העברה עשרונית ובלי העברה"
);
assert.ok(
  normalizePedagogyForParentReportHe("נכון כשאין נשיאה").includes("העברה"),
  "expected העברה replacement"
);
assert.equal(normalizePedagogyForParentReportHe("נשיאה"), "העברה עשרונית (בחיבור)");

// שכבת ניסוח הורה מלאה — ללא מאסטרי/טקסונומיה במחרוזת
const glossed = normalizeParentFacingHe("שליטה יציבה בנשיאה · מאסטרי יציב · טקסונומיה M-02");
assert.ok(!glossed.includes("מאסטרי"), glossed);
assert.ok(!glossed.toLowerCase().includes("m-02"), glossed);

const whyHe = buildWhyThisRecommendationHe({
  displayName: "חיבור",
  finalStep: "maintain_and_strengthen",
  riskFlags: {
    falsePromotionRisk: false,
    falseRemediationRisk: false,
    speedOnlyRisk: false,
    hintDependenceRisk: true,
    insufficientEvidenceRisk: false,
    recentTransitionRisk: false,
  },
  trendDer: { unclearTrend: false, fragileProgressPattern: false, progressSupportsAdvance: false },
  behaviorType: "stable_mastery",
  legacyRuleId: "legacy_math_cap_v1",
});
assert.ok(!whyHe.includes("stable_mastery"), whyHe);
assertNoForbidden("why.phase2", whyHe);
assertNoReadabilityLeaks("why.phase2", whyHe);

const whyUnknownStep = buildWhyThisRecommendationHe({
  displayName: "חיבור",
  finalStep: "internal_unknown_step_token",
  riskFlags: {
    falsePromotionRisk: false,
    falseRemediationRisk: false,
    speedOnlyRisk: false,
    hintDependenceRisk: false,
    insufficientEvidenceRisk: false,
    recentTransitionRisk: false,
  },
  trendDer: { unclearTrend: false, fragileProgressPattern: false, progressSupportsAdvance: false },
  behaviorType: "undetermined",
  legacyRuleId: "",
});
assert.ok(!whyUnknownStep.includes("internal_unknown_step_token"), whyUnknownStep);
assertNoForbidden("why.phase2.unknown_step", whyUnknownStep);
assertNoReadabilityLeaks("why.phase2.unknown_step", whyUnknownStep);

const unknownInterventionLabel = interventionTypeLabelHe("internal_unknown_intervention_type");
assert.ok(!unknownInterventionLabel.includes("internal_unknown_intervention_type"), unknownInterventionLabel);
assertNoForbidden("phase2.unknown_intervention_label", unknownInterventionLabel);
assertNoReadabilityLeaks("phase2.unknown_intervention_label", unknownInterventionLabel);

console.log("parent-report-hebrew-language-selftest: OK", samples.length, "samples scanned");

const guard = spawnSync(process.execPath, [join(__dirname, "parent-report-hebrew-copy-guard.mjs")], {
  cwd: ROOT,
  encoding: "utf8",
});
if (guard.status !== 0) {
  console.error(guard.stdout || guard.stderr);
  process.exit(guard.status || 1);
}
console.log(String(guard.stdout || "").trim());

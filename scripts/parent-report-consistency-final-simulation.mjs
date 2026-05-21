#!/usr/bin/env node
/**
 * Cross-subject parent report consistency simulation (deterministic, no Copilot).
 * Run: node scripts/parent-report-consistency-final-simulation.mjs
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSixSubjectContextLabelingMatrixBaseReport } from "./fixtures/parent-report-context-labeling-matrix.mjs";
import { collectParentFacingTextBundle } from "./lib/parent-report-pdf-output-verify.mjs";
import { collectGlobalSafetyFailures } from "./lib/parent-ai-phase-f-assertions.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const OUT = join(REPO, "reports", "parent-report-consistency-final-simulation.json");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { buildDiagnosticOverviewHeV2ForTests, buildDiagnosticCardsForSubjectForTests } = await load(
  "utils/parent-report-v2.js",
);
const { buildSubjectEvidenceCoverageLines } = await load(
  "utils/parent-report-language/subject-evidence-policy.js",
);
const { v2ShortOverviewCannotConcludeHe } = await load("utils/parent-report-language/short-report-v2-copy.js");
const { hardenBaseReportWithRowIdentity } = await load(
  "utils/parent-report-output-integrity/harden-report-rows.js",
);
const { classifyParentRecommendationState } = await load("utils/parent-report-recommendation-consistency.js");
const { redactPayloadForCopilotGrounding } = await load(
  "utils/parent-copilot/redact-payload-for-copilot-grounding.js",
);

const MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

const SUBJECT_LABEL = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};

const LEAK_PATTERNS = [
  /\bdiagnosticSkillId\b/i,
  /\bexpectedErrorTags\b/i,
  /\bconceptTag\b/i,
  /\bpatternFamily\b/i,
  /\bprobe_only\b/i,
  /\bcannotConcludeYet\b/i,
  /\breading_comprehension\b/i,
  /\bphase29_g[0-9]/i,
  /::grade:/i,
  /\boutputGating\b/i,
  /\bcanonicalState\b/i,
  /\bcontractsV1\b/,
];

const INSUFFICIENT_HE = /אין מספיק|נתונים חלקיים|עדיין אין מספיק|בשלב זה אין מספיק|לאסוף עוד מידע/i;
const THIN_SHORT_OVERVIEW_HE = v2ShortOverviewCannotConcludeHe();
const WEAKNESS_HE = /פער|חיזוק|תרגול ממוקד|דורש תשומת לב|מיקוד/i;

function v2Unit(p) {
  const q = p.questions;
  const acc = p.accuracy;
  const correct = Math.round((q * acc) / 100);
  const wrong = q - correct;
  return {
    subjectId: p.subjectId,
    topicRowKey: p.topicRowKey,
    bucketKey: p.bucket || p.topicRowKey.split("::")[0],
    displayName: p.displayName,
    classification: { state: "classified", reasonCode: null, weakFallbackBlocked: false },
    evidenceTrace: [{ type: "volume", value: { questions: q, correct, wrong, accuracy: acc } }],
    taxonomy: p.patternHe ? { patternHe: p.patternHe, subskillHe: "תת־מיומנות" } : {},
    recurrence: { totalQuestions: q, wrongCountForRules: wrong },
    confidence: {
      level: q >= 40 ? "high" : "moderate",
      rowSignals: {
        dataSufficiencyLevel: p.sufficiency || (q >= 40 ? "strong" : q >= 12 ? "medium" : "low"),
        isEarlySignalOnly: q < 8,
      },
    },
    priority: { level: p.priority || (p.action === "intervene" ? "P4" : "P2") },
    outputGating: {
      cannotConcludeYet: p.cannotConclude ?? q < 4,
      diagnosisAllowed: !(p.cannotConclude ?? q < 4),
      interventionAllowed: true,
    },
    diagnosis: p.patternHe
      ? { allowed: true, lineHe: p.patternHe, taxonomyId: "sim_tax" }
      : { allowed: p.action === "intervene" },
    canonicalState: {
      actionState: p.action || "intervene",
      assessment: {
        cannotConcludeYet: p.cannotConclude ?? q < 4,
        readiness: q >= 40 ? "ready" : q >= 12 ? "forming" : "insufficient",
        confidenceLevel: q >= 40 ? "high" : "moderate",
        decisionTier: q >= 40 ? 3 : 2,
      },
      evidence: {
        positiveAuthorityLevel: acc >= 85 ? "very_good" : acc <= 45 ? "none" : "good",
      },
    },
    probe: p.probeObjective
      ? { objectiveHe: p.probeObjective, specificationHe: p.probeObjective }
      : undefined,
  };
}

function mapRow(p) {
  const q = p.questions;
  const acc = p.accuracy;
  const correct = Math.round((q * acc) / 100);
  return {
    displayName: p.displayName,
    questions: q,
    correct,
    wrong: q - correct,
    accuracy: acc,
    gradeKey: p.gradeKey,
    modeKey: "learning",
    timeMinutes: Math.max(1, Math.round(q / 8)),
    latestActivityAt: "2026-05-10T12:00:00.000Z",
  };
}

function buildBaseReport(scenario) {
  const base = {
    playerName: "Simulation",
    period: "week",
    registeredGradeKey: scenario.registeredGrade || "g4",
    summary: {
      mathQuestions: 0,
      geometryQuestions: 0,
      englishQuestions: 0,
      scienceQuestions: 0,
      hebrewQuestions: 0,
      moledetGeographyQuestions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      overallAccuracy: 0,
    },
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
    diagnosticEngineV2: { units: [] },
    mistakes: [],
    probeEvidence: scenario.probeEvidence || null,
  };

  for (const row of scenario.rows) {
    const mk = MAP_KEY[row.subjectId];
    const key = row.topicRowKey;
    base[mk][key] = mapRow(row);
    base.diagnosticEngineV2.units.push(v2Unit(row));
    const sk = row.subjectId === "moledet-geography" ? "moledetGeographyQuestions" : `${row.subjectId}Questions`;
    if (sk in base.summary) {
      base.summary[sk] += row.questions;
      base.summary.totalQuestions += row.questions;
      base.summary.totalCorrect += Math.round((row.questions * row.accuracy) / 100);
    }
  }
  if (base.summary.totalQuestions > 0) {
    base.summary.overallAccuracy = Math.round(
      (base.summary.totalCorrect / base.summary.totalQuestions) * 100,
    );
  }
  return base;
}

function parentFacingBundle(base, detailed) {
  const parts = [collectParentFacingTextBundle(detailed)];
  const ov = base.summary?.diagnosticOverviewHe || {};
  for (const k of [
    "mainFocusAreaLineHe",
    "strongestAreaLineHe",
    "practicedSubjectsSummaryHe",
    "notPracticedSubjectsSummaryHe",
  ]) {
    if (ov[k]) parts.push(String(ov[k]));
  }
  if (Array.isArray(ov.readyForProgressPreviewHe)) parts.push(ov.readyForProgressPreviewHe.join("\n"));
  if (Array.isArray(ov.requiresAttentionPreviewHe)) parts.push(ov.requiresAttentionPreviewHe.join("\n"));
  const top = detailed?.parentProductContractV1?.top;
  if (top) {
    parts.push(String(top.mainStatusHe || ""));
    parts.push(String(top.mainPriorityHe || ""));
    parts.push(String(top.doNowHe || ""));
    parts.push(String(top.evidenceSummaryHe || ""));
  }
  return parts.filter(Boolean).join("\n");
}

function scanLeaks(text) {
  const hits = [];
  for (const re of LEAK_PATTERNS) {
    if (re.test(text)) hits.push(re.source);
  }
  hits.push(...collectGlobalSafetyFailures(text));
  return [...new Set(hits)];
}

function subjectCounts(base) {
  return {
    math: base.summary.mathQuestions || 0,
    geometry: base.summary.geometryQuestions || 0,
    english: base.summary.englishQuestions || 0,
    science: base.summary.scienceQuestions || 0,
    hebrew: base.summary.hebrewQuestions || 0,
    "moledet-geography": base.summary.moledetGeographyQuestions || 0,
  };
}

function enrichOverview(base) {
  hardenBaseReportWithRowIdentity(base);
  const counts = subjectCounts(base);
  const coverage = buildSubjectEvidenceCoverageLines(counts, SUBJECT_LABEL);
  base.summary.diagnosticOverviewHe = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: base.diagnosticEngineV2,
    patternDiagnostics: base.patternDiagnostics,
    maps: {
      math: base.mathOperations,
      geometry: base.geometryTopics,
      english: base.englishTopics,
      science: base.scienceTopics,
      hebrew: base.hebrewTopics,
      "moledet-geography": base.moledetGeographyTopics,
    },
    subjectQuestionCounts: counts,
    fallbackOverview: {},
    insufficientDataSubjectsHe: coverage.thinEvidenceSubjectsHe,
    thinEvidenceSubjectsHe: coverage.thinEvidenceSubjectsHe,
  });
}

/** @type {Array<object>} */
const SCENARIOS = [
  {
    id: "math_strong_g2",
    subject: "math",
    grade: "g2",
    caseType: "strong",
    registeredGrade: "g2",
    rows: [
      {
        subjectId: "math",
        topicRowKey: "addition::grade:g2",
        displayName: "חיבור",
        gradeKey: "g2",
        questions: 80,
        accuracy: 92,
        action: "maintain",
      },
    ],
    expect: { thinHedge: false, weaknessMention: false, hasStrength: true },
  },
  {
    id: "math_weak_recurring_g5",
    subject: "math",
    grade: "g5",
    caseType: "recurring_weakness",
    registeredGrade: "g5",
    rows: [
      {
        subjectId: "math",
        topicRowKey: "fractions::grade:g5",
        displayName: "שברים",
        gradeKey: "g5",
        questions: 55,
        accuracy: 38,
        action: "intervene",
        patternHe: "בלבול מכנה משותף",
        priority: "P4",
      },
    ],
    expect: { thinHedge: false, weaknessMention: true },
  },
  {
    id: "geometry_thin_g3",
    subject: "geometry",
    grade: "g3",
    caseType: "thin_data",
    registeredGrade: "g3",
    rows: [
      {
        subjectId: "geometry",
        topicRowKey: "shapes::grade:g3",
        displayName: "צורות",
        gradeKey: "g3",
        questions: 3,
        accuracy: 33,
        action: "withhold",
        cannotConclude: true,
        sufficiency: "low",
      },
    ],
    expect: { thinData: true, weaknessMention: false },
  },
  {
    id: "hebrew_mixed_g4",
    subject: "hebrew",
    grade: "g4",
    caseType: "mixed",
    registeredGrade: "g4",
    rows: [
      {
        subjectId: "hebrew",
        topicRowKey: "reading::grade:g4",
        displayName: "הבנת הנקרא",
        gradeKey: "g4",
        questions: 40,
        accuracy: 88,
        action: "maintain",
      },
      {
        subjectId: "hebrew",
        topicRowKey: "spelling::grade:g4",
        displayName: "כתיב",
        gradeKey: "g4",
        questions: 35,
        accuracy: 42,
        action: "intervene",
        patternHe: "בלבול אותיות",
      },
    ],
    expect: { thinHedge: false, weaknessMention: true },
  },
  {
    id: "english_grammar_g5",
    subject: "english",
    grade: "g5",
    caseType: "grammar_weakness",
    registeredGrade: "g5",
    rows: [
      {
        subjectId: "english",
        topicRowKey: "grammar::grade:g5",
        displayName: "דקדוק",
        gradeKey: "g5",
        questions: 48,
        accuracy: 44,
        action: "intervene",
        patternHe: "הסכמה נושא-פועל",
        bucket: "grammar",
      },
    ],
    expect: { thinHedge: false, weaknessMention: true, noRawGrammarKey: true },
  },
  {
    id: "science_body_g6",
    subject: "science",
    grade: "g6",
    caseType: "volume_after_dedupe",
    registeredGrade: "g6",
    rows: [
      {
        subjectId: "science",
        topicRowKey: "body::grade:g6",
        displayName: "גוף האדם",
        gradeKey: "g6",
        questions: 50,
        accuracy: 46,
        action: "intervene",
        patternHe: "בלבול מערכות הגוף",
        bucket: "body",
      },
    ],
    expect: { thinHedge: false, weaknessMention: true, noRawScienceKey: true },
  },
  {
    id: "moledet_probe_g4",
    subject: "moledet-geography",
    grade: "g4",
    caseType: "probe_supported",
    registeredGrade: "g4",
    rows: [
      {
        subjectId: "moledet-geography",
        topicRowKey: "israel_regions::grade:g4",
        displayName: "אזורי ישראל",
        gradeKey: "g4",
        questions: 30,
        accuracy: 40,
        action: "intervene",
        patternHe: "בלבול אזורים",
        probeObjective: "בדיקת הבנה של מפת ישראל והאזורים",
      },
    ],
    probeEvidence: [
      {
        isDiagnosticProbeAttempt: true,
        subjectId: "moledet-geography",
        topicId: "israel_regions",
        probeId: "fd_probe_region_confusion",
        outcomeStatus: "supported",
        dominantTag: "region_confusion",
        expectedErrorTags: ["region_confusion"],
        inferredTags: ["region_confusion"],
        supportCount: 1,
        weakenCount: 0,
      },
    ],
    expect: { thinHedge: false, weaknessMention: true, probePreserved: true },
  },
  {
    id: "english_thin_g1",
    subject: "english",
    grade: "g1",
    caseType: "thin_data",
    registeredGrade: "g1",
    rows: [
      {
        subjectId: "english",
        topicRowKey: "vocabulary::grade:g1",
        displayName: "אוצר מילים",
        gradeKey: "g1",
        questions: 2,
        accuracy: 50,
        action: "withhold",
        cannotConclude: true,
      },
    ],
    expect: { thinData: true },
  },
];

/** @type {Array<object>} */
const results = [];
let failures = 0;

for (const sc of SCENARIOS) {
  const base = buildBaseReport(sc);
  enrichOverview(base);
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const text = parentFacingBundle(base, detailed);
  const leaks = scanLeaks(text);
  const sp = detailed.subjectProfiles.find((s) => s.subject === sc.subject);
  const focus = sp?.topicRecommendations?.[0];
  const recState = focus
    ? classifyParentRecommendationState({
        questions: focus.questions,
        accuracy: focus.accuracy,
        thinEvidenceDowngraded: focus.thinEvidenceDowngraded,
        recommendedStepLabelHe: focus.recommendedStepLabelHe,
        dataSufficiencyLevel: focus.dataSufficiencyLevel,
      })
    : null;

  const rowFailures = [];
  const shortFocus = base.summary?.diagnosticOverviewHe?.mainFocusAreaLineHe || "";
  if (leaks.length) rowFailures.push(`raw_key_leak:${leaks.join(",")}`);
  const thinSignals =
    INSUFFICIENT_HE.test(text) ||
    focus?.thinEvidenceDowngraded ||
    focus?.recommendedStepLabelHe?.includes("לאסוף עוד מידע") ||
    String(focus?.dataSufficiencyLevel || "") === "low";
  if (sc.expect.thinData) {
    const unit = base.diagnosticEngineV2.units.find((u) => u.subjectId === sc.subject);
    const cannotConclude =
      unit?.outputGating?.cannotConcludeYet === true ||
      unit?.canonicalState?.assessment?.cannotConcludeYet === true;
    const withhold =
      unit?.canonicalState?.actionState === "withhold" ||
      unit?.canonicalState?.actionState === "probe_only";
    if (!cannotConclude) rowFailures.push("thin_case_must_gate_cannot_conclude");
    if (!withhold) rowFailures.push("thin_case_must_withhold_action");
    if (/פער ידע|remediate|התערבות אגרסיבית/i.test(text) && cannotConclude) {
      rowFailures.push("thin_case_over_diagnosis");
    }
    if (!shortFocus.includes(THIN_SHORT_OVERVIEW_HE) && !text.includes(THIN_SHORT_OVERVIEW_HE)) {
      rowFailures.push("thin_short_overview_missing_partial_data_copy");
    }
    if (recState?.state === "intervene" || recState?.state === "remediate") {
      rowFailures.push("thin_case_must_not_recommend_intervene");
    }
  }
  if (sc.expect.thinHedge && !thinSignals) {
    rowFailures.push("expected_thin_hedge_missing");
  }
  if (sc.expect.thinHedge === false && focus?.thinEvidenceDowngraded) {
    rowFailures.push("unexpected_thin_downgrade");
  }
  if (sc.expect.weaknessMention && !WEAKNESS_HE.test(text) && !focus?.recommendedStepLabelHe) {
    rowFailures.push("expected_weakness_signal_missing");
  }
  if (sc.expect.noRawGrammarKey && /phase29|grammar::grade/i.test(text)) {
    rowFailures.push("english_raw_key_in_copy");
  }
  if (sc.expect.noRawScienceKey && /\bbody::grade\b/i.test(text)) {
    rowFailures.push("science_raw_key_in_copy");
  }
  if (sc.expect.probePreserved) {
    if (!Array.isArray(detailed.probeEvidence) || detailed.probeEvidence.length === 0) {
      rowFailures.push("probeEvidence_not_on_detailed");
    }
    const redacted = redactPayloadForCopilotGrounding({ probeEvidence: detailed.probeEvidence });
    const r0 = redacted?.probeEvidence?.[0];
    if (!r0?.probeId || r0.diagnosticSkillId) rowFailures.push("copilot_redaction_probe_shape");
  }
  const strengthSignals =
    /תוצאות טובות|חוזק|יציב|שימור|מוכנות להתקדמות/i.test(text) ||
    Boolean(detailed.executiveSummary?.strengthsSummaryHe) ||
    Boolean(base.summary?.diagnosticOverviewHe?.strongestAreaLineHe);
  if (sc.expect.hasStrength && !strengthSignals) {
    rowFailures.push("expected_strength_line");
  }

  const weakRow = sc.rows.find((r) => r.action === "intervene") || sc.rows[sc.rows.length - 1];
  const detailedFocus =
    focus?.displayName || focus?.narrativeTitleHe || detailed.executiveSummary?.focusSummaryHe || "";
  if (sc.expect.weaknessMention && weakRow && shortFocus && detailedFocus) {
    if (
      !shortFocus.includes(weakRow.displayName) &&
      !String(detailedFocus).includes(weakRow.displayName) &&
      !shortFocus.includes(SUBJECT_LABEL[sc.subject] || "")
    ) {
      rowFailures.push("short_detailed_topic_drift");
    }
  }

  const pass = rowFailures.length === 0;
  if (!pass) failures += 1;
  results.push({
    id: sc.id,
    subject: sc.subject,
    grade: sc.grade,
    caseType: sc.caseType,
    expected: sc.expect,
    actual: {
      leakCount: leaks.length,
      leaks,
      thinDowngraded: Boolean(focus?.thinEvidenceDowngraded),
      recState: recState?.state || null,
      shortFocusSnippet: shortFocus.slice(0, 80),
      detailedFocusSnippet: String(detailedFocus).slice(0, 80),
      probeEvidenceCount: Array.isArray(detailed.probeEvidence) ? detailed.probeEvidence.length : 0,
    },
    pass,
    failures: rowFailures,
  });
}

// Six-subject matrix regression (all grades in one report)
{
  const matrixBase = buildSixSubjectContextLabelingMatrixBaseReport();
  enrichOverview(matrixBase);
  const matrixDetailed = buildDetailedParentReportFromBaseReport(matrixBase, { period: "week" });
  const matrixText = parentFacingBundle(matrixBase, matrixDetailed);
  const matrixLeaks = scanLeaks(matrixText);
  const matrixPass = matrixLeaks.length === 0;
  if (!matrixPass) failures += 1;
  results.push({
    id: "six_subject_matrix",
    subject: "all",
    grade: "g4-g6",
    caseType: "mixed_matrix",
    expected: { allSubjectsLabeled: true },
    actual: { leakCount: matrixLeaks.length, leaks: matrixLeaks, subjectProfileCount: matrixDetailed.subjectProfiles.length },
    pass: matrixPass,
    failures: matrixLeaks.length ? [`raw_key_leak:${matrixLeaks.join(",")}`] : [],
  });
  assert.equal(matrixDetailed.subjectProfiles.length, 6, "six subject profiles");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ generatedAt: new Date().toISOString(), failures, results }, null, 2),
  "utf8",
);

if (failures > 0) {
  console.error(`FAIL parent-report-consistency-final-simulation (${failures} scenarios)`);
  for (const r of results.filter((x) => !x.pass)) {
    console.error(`  - ${r.id}: ${r.failures.join("; ")}`);
  }
  process.exit(1);
}

console.log(`PASS parent-report-consistency-final-simulation (${results.length} scenarios)`);
console.log(`Report: ${OUT}`);

/**
 * רינדור SSR לרכיבים שמוצגים בדפי הדוח (לא E2E מלא) — עמידות לפני שינויי payload.
 * הרצה: npm run test:parent-report-phase6 (שרשרת ב-package.json), או ישירות: npx tsx scripts/parent-report-pages-ssr.mjs
 * תיעוד: docs/PARENT_REPORT.md
 */
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function importFromRoot(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await importFromRoot("utils/detailed-parent-report.js");
const { normalizeExecutiveSummary } = await importFromRoot("utils/parent-report-payload-normalize.js");
const { PARENT_REPORT_SCENARIOS } = await import(pathToFileURL(join(ROOT, "tests/fixtures/parent-report-pipeline.mjs")).href);
const { PARENT_REPORT_PRODUCT_SCENARIOS } = await import(
  pathToFileURL(join(ROOT, "tests", "fixtures", "parent-report-product-scenarios.mjs")).href
);
const { FORBIDDEN_INTERNAL_PARENT_TERMS } = await importFromRoot("utils/contracts/parent-product-contract-v1.js");

const detailedMod = await import(pathToFileURL(join(ROOT, "components/parent-report-detailed-surface.jsx")).href);
const {
  ExecutiveSummarySection,
  SubjectPhase3Insights,
  SubjectSummaryBlock,
  TopicRecommendationExplainStrip,
  ParentAssignedActivitiesSection,
} = detailedMod;
const contractUiMod = await import(pathToFileURL(join(ROOT, "components/parent-report-contract-ui-blocks.jsx")).href);
const { ParentTopContractSummaryBlock, ParentSubjectContractSummaryBlock } = contractUiMod;
const shortContractUiMod = await import(
  pathToFileURL(join(ROOT, "components/parent-report-short-contract-preview.jsx")).href
);
const { ParentReportShortContractPreview } = shortContractUiMod;

const parentMod = await import(pathToFileURL(join(ROOT, "components/parent-report-topic-explain-row.jsx")).href);
const { ParentReportTopicExplainRow, ParentReportTopicExplainBlock } = parentMod;

const { ParentReportInsight } = await import(pathToFileURL(join(ROOT, "components/ParentReportInsight.jsx")).href);

function render(label, el) {
  let html;
  try {
    html = renderToStaticMarkup(el);
  } catch (e) {
    throw new Error(`${label}: ${e?.message || e}`);
  }
  assert.ok(typeof html === "string" && html.length > 0, `${label}: empty html`);
  return html;
}

function runDetailedPageChunks() {
  const longHe = "כותרת־ארוכה־".repeat(40);
  const longWhy = "למה ".repeat(120) + "knowledge_gap — הסבר ארוך ללא קריסה.";

  const sparse = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.all_sparse(), { period: "week" });
  assert.ok(sparse);

  render("exec:missing-executiveSummary", h(ExecutiveSummarySection, { es: normalizeExecutiveSummary({}), compact: false }));
  render("exec:sparse-normalized", h(ExecutiveSummarySection, { es: normalizeExecutiveSummary(sparse), compact: true }));
  render("exec:sparse-full", h(ExecutiveSummarySection, { es: normalizeExecutiveSummary(sparse), compact: false }));

  const partialPayload = { ...sparse, executiveSummary: undefined };
  render("exec:undefined-executiveSummary", h(ExecutiveSummarySection, { es: normalizeExecutiveSummary(partialPayload), compact: false }));

  const strong = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.strong_executive_case(), { period: "week" });
  render(
    "exec:phase8-ladder-normalized",
    h(ExecutiveSummarySection, { es: normalizeExecutiveSummary(strong), compact: false })
  );
  const esP9 = {
    ...normalizeExecutiveSummary(strong),
    dominantCrossSubjectMistakePatternLabelHe: "תערובת טעויות לא אחידה",
    crossSubjectLearningStageLabelHe: "ייצוב חלקי",
    crossSubjectRetentionRisk: "moderate",
    crossSubjectTransferReadiness: "limited",
    reviewBeforeAdvanceAreasHe: ["חשבון: לחזור על אותה רמה לפני קידום."],
    transferReadyAreasHe: [],
    crossSubjectResponseToIntervention: "early_positive_response",
    crossSubjectResponseToInterventionLabelHe: "סימנים ראשונים לשיפור — עדיין מוקדם לסגור",
    crossSubjectSupportAdjustmentNeed: "hold_course",
    crossSubjectSupportAdjustmentNeedHe: "להמשיך באותו כיוון זהירותית",
    crossSubjectConclusionFreshness: "medium",
    crossSubjectRecalibrationNeed: "light_review",
    crossSubjectRecalibrationNeedHe: "מספיק סקירה קלה לפני שינוי מהותי",
    majorRecheckAreasHe: ["עברית: לעשות סבב תצפית קצר לפני שינוי משמעותי."],
    areasWhereSupportCanBeReducedHe: [],
    areasNeedingStrategyChangeHe: [],
  };
  render("exec:phase9-compact", h(ExecutiveSummarySection, { es: esP9, compact: false }));
  const spMath = strong.subjectProfiles.find((s) => s.subject === "math") || strong.subjectProfiles[0];
  const spStress = {
    ...spMath,
    subjectLabelHe: longHe,
    dominantLearningRiskLabelHe: longHe,
    trendNarrativeHe: longHe,
    recommendedHomeMethodHe: longHe,
    whatNotToDoHe: longHe,
  };
  render("phase3:long-labels-compact", h(SubjectPhase3Insights, { sp: spStress, compact: true }));
  render("phase3:long-labels-full", h(SubjectPhase3Insights, { sp: spStress, compact: false }));

  const spPartial = {
    subject: "math",
    subjectLabelHe: "חשבון",
    topStrengths: [],
    topWeaknesses: [],
    topicRecommendations: [],
    dominantLearningRisk: "knowledge_gap",
    dominantSuccessPattern: null,
    dominantLearningRiskLabelHe: "פער ידע",
    dominantSuccessPatternLabelHe: null,
    dominantRootCause: "insufficient_evidence",
    dominantRootCauseLabelHe: "אין די נתון לשורש קושי ברור",
    secondaryRootCause: null,
    rootCauseDistribution: {},
    subjectDiagnosticRestraintHe: "עדיין אין די נתון לשורש קושי ברור — ממשיכים לאסוף תרגול.",
    subjectConclusionReadiness: "partial",
    subjectInterventionPriorityHe: "מעקב ותרגול מבוקר לפני החמרה",
    subjectPriorityReasonHe: "מקצוע עם נתון חלקי — מעקב לפני החמרה.",
    subjectDoNowHe: "מפגש קצר אחד לפי אותה רמה.",
    subjectAvoidNowHe: "לא לסגור מסקנה חזקה מהר מדי.",
    trendNarrativeHe: null,
    confidenceSummaryHe: null,
    recommendedHomeMethodHe: null,
    whatNotToDoHe: null,
    majorRiskFlagsAcrossRows: { recentTransitionRisk: true },
    dominantBehaviorProfileAcrossRows: null,
    fragileSuccessRowCount: 0,
    stableMasteryRowCount: 0,
    modeConcentrationNoteHe: null,
    subjectResponseToIntervention: "not_enough_evidence",
    subjectResponseToInterventionLabelHe: "אין עדיין די אות להעריך אם התמיכה עוזרת",
    subjectSupportFit: "unknown",
    subjectSupportAdjustmentNeed: "monitor_only",
    subjectSupportAdjustmentNeedHe: "לצפות ולאסוף עוד אות לפני החלטה",
    subjectConclusionFreshness: "medium",
    subjectRecalibrationNeed: "light_review",
    subjectRecalibrationNeedHe: "מספיק סקירה קלה לפני שינוי מהותי",
    subjectEffectivenessNarrativeHe: "בחשבון: אין עדיין די אות להעריך אם התמיכה עוזרת. מספיק סקירה קלה לפני שינוי מהותי",
  };
  render("phase3:partial-fields", h(SubjectPhase3Insights, { sp: spPartial, compact: true }));
  render("summary-block:sparse", h(SubjectSummaryBlock, { sp: sparse.subjectProfiles[0] }));

  const oneDom = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.one_dominant_subject(), { period: "week" });
  const tr = oneDom.subjectProfiles[0]?.topicRecommendations?.[0];
  assert.ok(tr, "topic rec for strip");
  assert.ok(
    String(tr.displayName || "").length > 0 && !String(tr.displayName || "").includes("כיתה"),
    `math topic displayName should be operation-only (grade/level in table columns; got ${tr.displayName})`
  );
  render("topic-strip:golden", h(TopicRecommendationExplainStrip, { tr }));

  const trTrendV1 = {
    ...tr,
    trendV1: {
      ok: true,
      direction: "improving",
      parentLineHe: "מגמה בתקופה: משתפר — בחלק המאוחר של התקופה הדיוק גבוה יותר מאשר בתחילתה.",
    },
  };
  const trendStripHtml = render("topic-strip:trend-v1", h(TopicRecommendationExplainStrip, { tr: trTrendV1 }));
  assert.match(trendStripHtml, /parent-report-topic-trend-v1/u);
  assert.match(trendStripHtml, /מגמה בתקופה: משתפר/u);

  const trSparseSignals = {
    ...tr,
    whyThisRecommendationHe: longWhy,
    topicEngineRowSignals: {
      riskFlags: { hintDependenceRisk: true },
      whyThisRecommendationHe: longWhy,
      diagnosticType: "knowledge_gap",
    },
  };
  render("topic-strip:long-why-partial-sig", h(TopicRecommendationExplainStrip, { tr: trSparseSignals }));

  const trPhase8 = {
    ...tr,
    interventionPlanHe: "תוכנית מיקרו קצרה לנושא — צעד אחד ברור.",
    doNowHe: "מפגש קצר עם משימה אחת.",
    avoidNowHe: "לא להעמיס יעדים גדולים כשהתמונה עדיין לא בשלה.",
    cautionLineHe: "עדיין אין די נתון למסקנה חזקה יותר.",
    recommendedSessionCount: 2,
    recommendedSessionLengthBand: "very_short",
    recommendedPracticeLoad: "minimal",
    interventionDurationBand: "very_short",
    interventionFormat: "observation_block",
    interventionIntensity: "light",
    interventionParentEffort: "low",
    topicEngineRowSignals: null,
  };
  render("topic-strip:phase8-compact", h(TopicRecommendationExplainStrip, { tr: trPhase8 }));

  const trPhase10 = {
    ...tr,
    topicEngineRowSignals: {
      ...(tr.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : {}),
      responseToInterventionLabelHe: "סימנים ראשונים לשיפור — עדיין מוקדם לסגור",
      freshnessStateLabelHe: "המידע מתחיל להתיישן",
      conclusionFreshnessLabelHe: "ביטחון במסקנה נמוך — כדאי לעדכן תצפית",
      nextSupportAdjustmentHe: "לעשות סבב תצפית/בדיקה לפני העלאת קושי או קידום",
    },
  };
  render("topic-strip:phase10-compact", h(TopicRecommendationExplainStrip, { tr: trPhase10 }));

  const esPhase11 = {
    ...normalizeExecutiveSummary(strong),
    crossSubjectSupportSequenceState: "continuing_sequence",
    crossSubjectSupportSequenceStateLabelHe: "ממשיכים ברצף תמיכה שנראה עקבי",
    crossSubjectNextBestSequenceStep: "continue_current_sequence",
    crossSubjectNextBestSequenceStepHe: "להמשיך באותו רצף בזהירות — בלי להגדיל עומס בלי צורך",
    subjectsReadyForReleaseHe: ["חשבון: נראה שאפשר להתחיל מעבר זהיר מתמיכה להצלחה עצמאית קצרה"],
    subjectsAtRiskOfSupportRepetitionHe: [],
    subjectsNeedingSupportResetHe: [],
  };
  render("exec:phase11-sequence-strip", h(ExecutiveSummarySection, { es: esPhase11, compact: false }));

  const trPhase11 = {
    ...tr,
    topicEngineRowSignals: {
      ...(tr.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : {}),
      supportSequenceNarrativeHe: "נראה שהתמיכה עוזרת — כדאי לעקוב אם לא חוזרים על אותו כלי יתר על המידה.",
      strategyRepetitionRiskHe: "סיכון בינוני לחזור על אותו כיוון בלי שינוי",
      strategyFatigueRiskHe: "סיכון נמוך לחזרה מיותרת על אותה שיטה",
      nextSupportSequenceActionHe: "להמשיך ברצף הנוכחי עם מטרה צרה יותר לפני שינוי מהותי",
    },
  };
  render("topic-strip:phase11-compact", h(TopicRecommendationExplainStrip, { tr: trPhase11 }));

  const esPhase12 = {
    ...normalizeExecutiveSummary(strong),
    crossSubjectRecommendationMemoryState: "light_memory",
    crossSubjectRecommendationMemoryStateLabelHe: "יש זיכרון חלש בלבד — בעיקר מהחלון הנוכחי",
    crossSubjectSupportHistoryDepth: "short_history",
    crossSubjectSupportHistoryDepthLabelHe: "עומק היסטוריה: שני חלונות השוואה",
    crossSubjectExpectedVsObservedMatch: "partly_aligned",
    crossSubjectExpectedVsObservedMatchHe: "יש חפיפה חלקית בין מה שציפינו למה שרואים",
    crossSubjectContinuationDecision: "continue_but_refine",
    crossSubjectContinuationDecisionHe: "להמשיך באותו כיוון, אך בצורה מעט מדויקת יותר",
    subjectsWithClearCarryoverHe: [],
    subjectsNeedingFreshEvidenceHe: ["חשבון: כדאי לאסוף עוד אות לפני שממשיכים אותו מסלול."],
    subjectsWherePriorPathSeemsMisalignedHe: [],
  };
  render("exec:phase12-memory-strip", h(ExecutiveSummarySection, { es: esPhase12, compact: false }));

  const trPhase12 = {
    ...tr,
    topicEngineRowSignals: {
      ...(tr.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : {}),
      recommendationMemoryNarrativeHe: "ב«חיבור»: יש זיכרון שימושי מספיק כדי להשוות המשך מול עבר קרוב.",
      outcomeTrackingNarrativeHe: "ב«חיבור»: ציפינו לייצוב דיוק · בפועל יש התקדמות חלקית · יש חפיפה חלקית.",
      recommendationContinuationDecisionHe: "להמשיך באותו כיוון, אך בצורה מעט מדויקת יותר",
      whatNeedsFreshEvidenceNowHe: "כדי לא לבנות המשך על ניחוש: שני מפגשים קצרים עם רישום קטן בסוף.",
      recommendationMemoryState: "light_memory",
      expectedVsObservedMatch: "not_enough_evidence",
    },
  };
  render("topic-strip:phase12-compact", h(TopicRecommendationExplainStrip, { tr: trPhase12 }));

  const esPhase13 = {
    ...normalizeExecutiveSummary(strong),
    crossSubjectGateState: "recheck_gate_visible",
    crossSubjectGateStateLabelHe: "יש סבב שבו כדאי לרענן תצפית לפני החלטה מהותית",
    crossSubjectNextCycleDecisionFocus: "refresh_baseline_before_decision",
    crossSubjectNextCycleDecisionFocusHe: "לעדכן בסיס תצפית לפני החלטה חדה",
    crossSubjectEvidenceTargetType: "fresh_data_needed",
    crossSubjectEvidenceTargetTypeLabelHe: "נדרש מידע/תצפית עדכנית יותר",
    crossSubjectTargetObservationWindow: "needs_fresh_baseline",
    crossSubjectTargetObservationWindowLabelHe: "צריך בסיס חדש לפני מסקנה",
    subjectsNearReleaseButNotThereHe: ["חשבון: קרובים לשחרור זהיר — עדיין חסר אות עצמאות קצר."],
    subjectsNeedingRecheckBeforeDecisionHe: ["גיאומטריה: כדאי סבב תצפית/נתון עדכני לפני החלטה מהותית."],
    subjectsWithVisiblePivotTriggerHe: [],
  };
  render("exec:phase13-gates-strip", h(ExecutiveSummarySection, { es: esPhase13, compact: false }));

  const trPhase13 = {
    ...tr,
    topicEngineRowSignals: {
      ...(tr.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : {}),
      gateNarrativeHe: "ב«חיבור»: שער רצף — עדיין לא סוגרים שחרור.",
      evidenceTargetNarrativeHe: "ב«חיבור»: אימות עצמאות קצר · סבב קצר הבא.",
      nextCycleDecisionFocusHe: "לבדוק עצמאות קצרה לפני שחרור תמיכה",
      releaseGate: "pending",
      whatWouldJustifyReleaseHe: "שני מפגשים קצרים עם הצלחה בסוף בלי הכוונה באמצע.",
      recheckGate: "off",
      pivotGate: "off",
    },
  };
  render("topic-strip:phase13-compact", h(TopicRecommendationExplainStrip, { tr: trPhase13 }));

  const esPhase14 = {
    ...normalizeExecutiveSummary(strong),
    crossSubjectDependencyState: "likely_local_issue",
    crossSubjectDependencyStateLabelHe: "נראה שהקושי נשאר מקומי יותר — אפשר לטפל בו במיקוד",
    crossSubjectLikelyFoundationalBlocker: "unknown",
    crossSubjectLikelyFoundationalBlockerLabelHe: "לא נקבע סוג בסיס ספציפי",
    crossSubjectFoundationFirstPriority: false,
    crossSubjectFoundationFirstPriorityHe: "רוב המקצועות נראים יותר מקומיים או עם ראיה חלקית — לא חייבים «בסיס גדול» בכל מקום.",
    subjectsLikelyShowingDownstreamSymptomsHe: [],
    subjectsNeedingFoundationFirstHe: [],
    subjectsSafeForLocalInterventionHe: ["חשבון: נראה מקומי יותר — אפשר טיפול ממוקד בלי סיפור רחב."],
  };
  render("exec:phase14-foundation-strip", h(ExecutiveSummarySection, { es: esPhase14, compact: false }));

  const trPhase14 = {
    ...tr,
    topicEngineRowSignals: {
      ...(tr.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : {}),
      foundationDependencyNarrativeHe: "ב«חיבור»: נראה שהקושי נשאר מקומי יותר — אפשר לטפל במיקוד.",
      interventionOrderingHe: "קודם תמיכה ממוקדת בנושא עצמו",
      foundationBeforeExpansion: false,
    },
  };
  render("topic-strip:phase14-compact", h(TopicRecommendationExplainStrip, { tr: trPhase14 }));

  const trPhase15 = {
    ...trPhase14,
    topicEngineRowSignals: {
      ...(trPhase14.topicEngineRowSignals && typeof trPhase14.topicEngineRowSignals === "object"
        ? trPhase14.topicEngineRowSignals
        : {}),
      freshnessStateLabelHe: "המידע מתחיל להתיישן",
      conclusionFreshnessLabelHe: "ביטחון במסקנה יורד",
      whatNeedsFreshEvidenceNowHe: "כדאי ראיה טרייה לפני החמרה",
      gateNarrativeHe: "שער: לאסוף ראיה לפני החלטה",
      evidenceTargetNarrativeHe: "יעד: דיוק קצר בלי לחץ",
      nextSupportAdjustmentHe: "להתאים עומס — צעד קדימה זהיר",
      nextSupportSequenceActionHe: "להתאים עומס — צעד קדימה זהיר",
      recommendationMemoryNarrativeHe: "זיכרון חלש מהחלון האחרון",
      outcomeTrackingNarrativeHe: "תוצאה לא תואמת ציפייה",
    },
  };
  render("topic-strip:phase15-unified-compact", h(TopicRecommendationExplainStrip, { tr: trPhase15 }));
}

function runContractBindingChunks() {
  const stable = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.stable_excellence(), {
    period: "week",
  });
  const top = stable?.parentProductContractV1?.top;
  assert.ok(top && typeof top === "object", "contract top should exist for stable scenario");
  const topHtml = render("contract-ui:top-stable", h(ParentTopContractSummaryBlock, { top }));
  for (const token of FORBIDDEN_INTERNAL_PARENT_TERMS) {
    assert.ok(!topHtml.toLowerCase().includes(String(token).toLowerCase()), `forbidden token leaked in top ui: ${token}`);
  }
  assert.ok(
    topHtml.includes("מה חשוב קודם") || topHtml.includes("מיקוד עיקרי"),
    "top contract priority label should render"
  );
  assert.ok(!topHtml.includes("פער ידע"), "stable mastery top area should avoid remediation wording");

  const trendScenario = PARENT_REPORT_PRODUCT_SCENARIOS.find((s) => s.id === "trend_insufficient");
  assert.ok(trendScenario && typeof trendScenario.buildBaseReport === "function", "trend_insufficient scenario missing");
  const trendReport = buildDetailedParentReportFromBaseReport(trendScenario.buildBaseReport(), { period: "week" });
  const trendTopHtml = render("contract-ui:top-trend-insufficient", h(ParentTopContractSummaryBlock, { top: trendReport?.parentProductContractV1?.top }));
  const strongTrendWords = ["משתפר", "בירידה", "מגמה חיובית", "מגמה שלילית", "שיפור מבוסס", "ירידה מבוססת"];
  for (const word of strongTrendWords) {
    assert.ok(!trendTopHtml.includes(word), `trend-insufficient top area contains strong trend wording: ${word}`);
  }

  const subjectContracts = stable?.parentProductContractV1?.subjects || {};
  const firstSubjectContract = Object.values(subjectContracts)[0];
  const subjectHtml = render(
    "contract-ui:subject-stable",
    h(ParentSubjectContractSummaryBlock, { contractRow: firstSubjectContract, compact: false })
  );
  assert.ok(subjectHtml.includes("סיכום להורה"), "subject contract block should render");

  const legacyFallbackHtml = renderToStaticMarkup(h(ParentTopContractSummaryBlock, { top: null }));
  assert.equal(legacyFallbackHtml, "", "missing top contract should render empty safely");

  const shortPreviewHtml = render(
    "contract-ui:short-preview",
    h(ParentReportShortContractPreview, { top })
  );
  assert.ok(shortPreviewHtml.includes("סיכום קצר להורה"), "short preview title should render");
  assert.ok(shortPreviewHtml.includes("מה עושים עכשיו"), "short preview should include do-now line");
  assert.ok(!shortPreviewHtml.includes("פער ידע"), "stable short preview should avoid remediation wording");
  const shortFallbackHtml = renderToStaticMarkup(h(ParentReportShortContractPreview, { top: null }));
  assert.equal(shortFallbackHtml, "", "missing short contract preview should render empty safely");
}

function runParentReportPageChunks() {
  const longLabel = "שם־נושא־ארוך־" + "א".repeat(200);
  const longWhy = "ב".repeat(500);
  const row = {
    rowKey: "k1",
    label: longLabel,
    questions: 12,
    topicEngineRowSignals: {
      whyThisRecommendationHe: longWhy,
      riskFlags: { falsePromotionRisk: true, recentTransitionRisk: true },
      diagnosticType: "fragile_success",
      confidenceBadge: "medium",
      sufficiencyBadge: "low",
    },
    trend: { version: 1, accuracyDirection: "down", independenceDirection: "up", fluencyDirection: "flat", confidence: 0.5, summaryHe: "מגמה קצרה." },
    behaviorProfile: { version: 1, dominantType: "instruction_friction", signals: {}, decisionTrace: [] },
    decisionTrace: [],
    recommendationDecisionTrace: [],
  };
  render("parent-report:explain-row-stress", h(ParentReportTopicExplainRow, { row }));
  render("parent-report:explain-block", h(ParentReportTopicExplainBlock, { rows: [row] }));

  const rowMinimal = {
    rowKey: "k2",
    label: "חיבור",
    questions: 8,
    topicEngineRowSignals: null,
    trend: null,
    behaviorProfile: null,
  };
  render("parent-report:explain-row-minimal", h(ParentReportTopicExplainRow, { row: rowMinimal }));

  const rowTrendV1 = {
    rowKey: "k2b",
    label: "חיבור",
    questions: 12,
    topicEngineRowSignals: null,
    trend: null,
    trendV1: {
      ok: true,
      direction: "stable",
      parentLineHe:
        "מגמה בתקופה: ללא שינוי משמעותי — עדיין כדאי לחזק את הנושא בתרגול קצר.",
    },
  };
  const trendRowHtml = renderToStaticMarkup(h(ParentReportTopicExplainRow, { row: rowTrendV1, compact: true }));
  assert.match(trendRowHtml, /parent-report-topic-trend-v1/u);
  assert.match(trendRowHtml, /מגמה בתקופה: ללא שינוי משמעותי/u);
  assert.match(trendRowHtml, /מה כדאי לעשות ביחד/u);
  render("parent-report:explain-row-trend-v1", h(ParentReportTopicExplainRow, { row: rowTrendV1, compact: true }));

  const rowChartLive = {
    rowKey: "geometry_area\u0001g4",
    label: "שטח - כיתה ד׳",
    questions: 12,
    accuracy: 45,
    wrong: 6,
    correct: 6,
  };
  const chartLiveHtml = renderToStaticMarkup(h(ParentReportTopicExplainRow, { row: rowChartLive }));
  assert.match(chartLiveHtml, /מה רואים/u, "chart live row should render מה רואים");
  assert.match(chartLiveHtml, /הנתונים/u, "chart live row should render הנתונים");
  assert.match(chartLiveHtml, /מה זה אומר/u, "chart live row should render מה זה אומר");
  assert.ok(
    /מה כדאי לעשות ביחד/u.test(chartLiveHtml) ||
      /כדאי להוסיף תרגול קצר/u.test(chartLiveHtml),
    "chart live row should render home action or practice_focus meaning-only explain",
  );
  assert.match(chartLiveHtml, /parent-report-topic-diagnostic-explain/u);
  render("parent-report:explain-row-chart-live", h(ParentReportTopicExplainRow, { row: rowChartLive }));

  const rowPhase8 = {
    rowKey: "p8-row",
    label: "חיבור",
    questions: 11,
    topicEngineRowSignals: {
      whyThisRecommendationHe: "המלצה מהמנוע לבדיקת SSR.",
      interventionPlanHe: "תוכנית מיקרו: חזרה קצרה באותה רמה.",
      doNowHe: "שלוש חזרות קצרות.",
      avoidNowHe: "לא להחמיר רמה לפני שני מפגשים עקביים.",
      cautionLineHe: "זהירות: ראיות חלקיות.",
      recommendedSessionCount: 2,
      recommendedSessionLengthBand: "short",
      recommendedPracticeLoad: "light",
      interventionDurationBand: "short",
      interventionFormat: "mixed",
      interventionIntensity: "focused",
      interventionParentEffort: "medium",
    },
    trend: null,
    behaviorProfile: null,
    decisionTrace: [],
    recommendationDecisionTrace: [],
  };
  render("parent-report:explain-row-phase8", h(ParentReportTopicExplainRow, { row: rowPhase8 }));

  const rowPhase10 = {
    ...rowPhase8,
    topicEngineRowSignals: {
      ...rowPhase8.topicEngineRowSignals,
      responseToInterventionLabelHe: "סימנים ראשונים לשיפור — עדיין מוקדם לסגור",
      freshnessStateLabelHe: "המידע מתחיל להתיישן",
      conclusionFreshnessLabelHe: "ביטחון במסקנה נמוך — כדאי לעדכן תצפית",
      nextSupportAdjustmentHe: "לעשות סבב תצפית/בדיקה לפני העלאת קושי או קידום",
    },
  };
  render("parent-report:explain-row-phase10", h(ParentReportTopicExplainRow, { row: rowPhase10 }));

  const rowPhase11 = {
    ...rowPhase10,
    topicEngineRowSignals: {
      ...rowPhase10.topicEngineRowSignals,
      supportSequenceStateLabelHe: "בתחילת רצף תמיכה — כדאי לעקוב בלי להעמיס",
      strategyRepetitionRiskHe: "סיכון בינוני לחזור על אותו כיוון בלי שינוי",
      nextSupportSequenceActionHe: "להתחיל שחרור הדרגתי קצר — לא לקפוץ לעצמאות מלאה",
    },
  };
  render("parent-report:explain-row-phase11", h(ParentReportTopicExplainRow, { row: rowPhase11 }));

  const rowPhase12 = {
    ...rowPhase11,
    topicEngineRowSignals: {
      ...rowPhase11.topicEngineRowSignals,
      recommendationMemoryStateLabelHe: "יש זיכרון חלש בלבד — בעיקר מהחלון הנוכחי",
      outcomeTrackingNarrativeHe: "ציפינו לייצוב דיוק — ובפועל עדיין לא רואים התייצבות מספקת.",
      recommendationContinuationDecisionHe: "עדיף לא לחזור שוב על אותו מסלול בלי ראיה חדשה",
    },
  };
  render("parent-report:explain-row-phase12", h(ParentReportTopicExplainRow, { row: rowPhase12 }));

  const rowPhase13 = {
    ...rowPhase12,
    topicEngineRowSignals: {
      ...rowPhase12.topicEngineRowSignals,
      gateNarrativeHe: "שער: להמשיך בכיוון הנוכחי עם תצפית קצרה.",
      evidenceTargetNarrativeHe: "יעד: לאשר דיוק ברוגע לפני לחץ.",
      releaseGate: "pending",
      whatWouldJustifyReleaseHe: "הצלחה קצרה בלי הכוונה באמצע לפני שחרור.",
      pivotGate: "off",
      recheckGate: "off",
    },
  };
  render("parent-report:explain-row-phase13", h(ParentReportTopicExplainRow, { row: rowPhase13 }));

  const rowPhase14 = {
    ...rowPhase13,
    topicEngineRowSignals: {
      ...rowPhase13.topicEngineRowSignals,
      foundationDependencyNarrativeHe: "ב«חיבור»: ייתכן קשר לבסיס — לא רק נקודה.",
      interventionOrderingHe: "קודם לייצב בסיס — ואז לחדד בנושא",
      foundationBeforeExpansion: true,
      foundationBeforeExpansionHe: "לפני שמרחיבים את הדרישה כאן — כדאי לייצב קודם את היסוד שעליו הנושא נשען.",
    },
  };
  render("parent-report:explain-row-phase14", h(ParentReportTopicExplainRow, { row: rowPhase14 }));

  const rowPhase15 = {
    ...rowPhase14,
    topicEngineRowSignals: {
      ...rowPhase14.topicEngineRowSignals,
      freshnessStateLabelHe: "המידע מתחיל להתיישן",
      conclusionFreshnessLabelHe: "ביטחון במסקנה יורד",
      whatNeedsFreshEvidenceNowHe: "כדאי ראיה טרייה לפני החמרה",
      nextSupportAdjustmentHe: "להתאים עומס — צעד קדימה זהיר",
      nextSupportSequenceActionHe: "להתאים עומס — צעד קדימה זהיר",
    },
  };
  render("parent-report:explain-row-phase15", h(ParentReportTopicExplainRow, { row: rowPhase15 }));
}

function runParentReportInsightChunk() {
  const html = render(
    "parent-report:parent-ai-insight",
    h(ParentReportInsight, {
      explanation: {
        ok: true,
        text: "טקסט בדיקה להורה — תובנה מבוססת דוח בטוחה לווידוא SSR והדפסה.".repeat(3),
      },
    })
  );
  assert.ok(html.includes("תובנה להורה"), "insight title should render");
  assert.ok(html.includes("טקסט בדיקה"), "insight body should render");
}

function runParentAssignedActivitiesSectionChunk() {
  const rows = [
    {
      activityLabelHe: "פעילות אישית מהורה — חיבור",
      subjectLabelHe: "מתמטיקה",
      topicLabelHe: "חיבור",
      gradeLabelHe: "א׳",
      lastActivityAtHe: "01/03/2026",
      questionCount: 10,
      accuracy: 80,
      timeMinutes: 5,
      statusLabelHe: "הושלם",
    },
  ];
  const html = render(
    "parent-assigned-activities:collapsed",
    h(ParentAssignedActivitiesSection, { rows }),
  );
  assert.ok(html.includes("<details"), "parent activities must use details");
  assert.ok(!/\bdetails[^>]*\sopen[\s=>]/i.test(html), "parent activities must be collapsed by default");
  assert.ok(html.includes("no-pdf"), "parent activities must be no-pdf");
  assert.ok(html.includes("no-print"), "parent activities must be no-print");
  assert.ok(html.includes("פעילויות אישיות מהורה (1)"), "parent activities summary shows count");

  const emptyHtml = renderToStaticMarkup(h(ParentAssignedActivitiesSection, { rows: [] }));
  assert.equal(emptyHtml, "", "empty parent activities render nothing");
}

function main() {
  runDetailedPageChunks();
  runContractBindingChunks();
  runParentReportPageChunks();
  runParentReportInsightChunk();
  runParentAssignedActivitiesSectionChunk();
  console.log("parent-report pages SSR smoke: OK");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Parent Report Full Visible Copy & Decision Map — read-only audit.
 * Maps: raw metrics → engine decision → contract → templateId → rendered Hebrew → parent surface.
 *
 * Run: node scripts/parent-report-full-visible-copy-decision-map.mjs
 * Outputs:
 *   docs/audits/parent-report-full-visible-copy-decision-map.json
 *   docs/audits/parent-report-full-visible-copy-decision-map.md
 *   docs/audits/parent-report-duplicate-copy-findings.md
 *
 * No product copy / logic / Hebrew changes. No commit.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-full-visible-copy-decision-map.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-full-visible-copy-decision-map.md");
const OUT_DUP_MD = join(ROOT, "docs", "audits", "parent-report-duplicate-copy-findings.md");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { runWithParentReportRebuildLock } = await load("lib/parent-server/db-input-to-detailed-report.server.js");
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");
const { applyParentReportGamificationOverlay } = await load("lib/learning-shared/student-account-state-view.js");
const { applyServerParentFacingAuthorityToClientReport } = await load("lib/parent-server/parent-facing-report-authority.js");
const {
  applyTopicEngineParentFacingInsights,
  collectTopicEngineRowsFromReport,
  buildTopicEngineInsightLineHe,
} = await load("utils/parent-report-engine-insights-he.js");
const { applyBridgeProvenanceToGeneratedReport } = await load("lib/learning-supabase/bridge-report-provenance.js");
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { generateParentReportV2, summarizeV2UnitsForSubjectForTests } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const {
  buildSubjectParentLetter,
  buildSubjectParentLetterCompact,
  buildTopicRecommendationNarrative,
} = await load("utils/detailed-report-parent-letter-he.js");
const {
  resolveParentExplainRowCopy,
  buildLpdSafeTopicExplainSectionsHe,
  getLpdFromRow,
} = await load("utils/learning-pattern-decision/index.js");
const {
  EDC_CONTRACT_KEY,
  SP_SUBJECT_ENGINE_CONTRACT,
  readSubjectEngineContract,
} = await load("utils/learning-pattern-decision/engine-decision-codes.js");
const { normalizeParentVisibleMetrics } = await load(
  "utils/learning-pattern-decision/normalize-parent-practice-metrics.js",
);
const { filterCoreV2Units } = await load("utils/parent-report-core-grade-filter.js");
const {
  isDuplicateParentReportText,
  normalizeParentReportTextForDedupe,
} = await load("utils/parent-report-text-dedupe.js");
const { parentReportOwnerCopyTemplatesHe } = await load(
  "utils/parent-report-language/parent-report-owner-copy-templates-he.js",
);
const { GRADE_AWARE_RECOMMENDATION_TEMPLATES } = await load(
  "utils/parent-report-language/grade-aware-recommendation-templates.js",
);
const { ALL_TAXONOMY_ROWS } = await load("utils/diagnostic-engine-v2/taxonomy-registry.js");

const SUBJECT_IDS = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
  "hebrew",
  "moledet-geography",
];

const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historySubtopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

const LIVE_CASES = [
  { student: "omer", username: "omer", from: "2025-09-01", to: "2026-07-04", label: "OMER math" },
  { student: "aaa7", username: "aaa7", from: "2026-07-04", to: "2026-07-04", label: "Aaa7 math" },
];

/** @type {Record<string, { roleHe: string, reportTypes: string[], contractSource: string }>} */
const SURFACE_META = {
  diagnosticOverview: {
    roleHe: "סקירה עליונה בדף דוח הורים — מיקוד, חוזק, תצוגה מקדימה",
    reportTypes: ["parentReportScreen", "shortReport"],
    contractSource: "utils/parent-report-v2.js → buildDiagnosticOverviewHeV2",
  },
  insights: {
    roleHe: "שורות תובנה ראשיות בדף דוח הורים (parentFacing.insights)",
    reportTypes: ["parentReportScreen", "shortReport"],
    contractSource: "utils/parent-report-engine-insights-he.js",
  },
  subjectSummary: {
    roleHe: "סיכום מקצוע בדוח מקוצר / בלוק מקצוע בדף דוח הורים",
    reportTypes: ["parentReportScreen", "shortReport"],
    contractSource: "subjectEngineDecisionContract / summarizeV2UnitsForSubject",
  },
  topicInsightLine: {
    roleHe: "שורת תובנה לנושא בדוח מקוצר",
    reportTypes: ["shortReport", "parentReportScreen"],
    contractSource: "engineDecisionContract → buildTopicEngineInsightLineHe",
  },
  topicExplain: {
    roleHe: "פס הסבר נושא (מה זוהה / נתונים / דפוס / משמעות / בית)",
    reportTypes: ["parentReportScreen", "shortReport"],
    contractSource: "lpd-parent-facing-copy.js",
  },
  recommendationCard: {
    roleHe: "כרטיס המלצה לנושא בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "detailed-parent-report.js → recommendationFromV2Unit",
  },
  subjectRollup: {
    roleHe: "סיכום מקצוע בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "subjectEngineDecisionContract",
  },
  parentLetter: {
    roleHe: "מכתב הורים למקצוע (פתיחה / אבחון / סיום)",
    reportTypes: ["detailedReport"],
    contractSource: "detailed-report-parent-letter-he.js",
  },
  homeAction: {
    roleHe: "פעולה ביתית מומלצת ברמת מקצוע",
    reportTypes: ["detailedReport"],
    contractSource: "subjectEngineDecisionContract → homeActionTemplateId",
  },
  detailedNarrative: {
    roleHe: "נרטיב נושא בדוח מפורט (snapshot / homeLine / caution)",
    reportTypes: ["detailedReport"],
    contractSource: "buildTopicRecommendationNarrative",
  },
  executiveSummary: {
    roleHe: "סיכום מנהלים בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "detailed-parent-report.js → buildExecutiveSummaryFromV2",
  },
  crossSubjectInsights: {
    roleHe: "תובנות חוצות מקצועות בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "v2-parent-copy.js / buildCrossSubjectInsightsFromV2",
  },
  homePlan: {
    roleHe: "תוכנית בית לשבוע בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "buildHomePlanFromV2",
  },
  nextPeriodGoals: {
    roleHe: "יעדים לתקופה הבאה בדוח מפורט",
    reportTypes: ["detailedReport"],
    contractSource: "buildNextPeriodGoalsFromV2",
  },
  staticTemplateCatalog: {
    roleHe: "קטלוג תבניות owner — לא live; מייצג טקסט אפשרי לפי templateId+slots",
    reportTypes: ["templateCatalog"],
    contractSource: "parent-report-owner-copy-templates-he.js",
  },
  gradeAwareTemplate: {
    roleHe: "תבנית grade-aware — לא live; מייצג action/goal לפי taxonomy+grade band",
    reportTypes: ["templateCatalog"],
    contractSource: "grade-aware-recommendation-templates.js",
  },
};

const SLOT_KEYS = [
  "topicName",
  "subjectName",
  "questions",
  "correct",
  "wrong",
  "accuracy",
  "detectedPattern",
  "affectedSubskill",
  "misconceptionLabel",
  "recommendedAction",
  "priorityTopics",
  "evidenceStrength",
];

let rowCounter = 0;

/** @param {object} reportApiBody */
async function buildReports(reportApiBody) {
  return runWithParentReportRebuildLock(async () => {
    const dbInput = buildReportInputFromDbData(reportApiBody, { period: "custom", timezone: "UTC" });
    const playerName = String(dbInput.student?.name || "").trim() || "Student";
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window = globalThis;
    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);
    const from = String(dbInput.range?.from || reportApiBody.fromDate || "").slice(0, 10);
    const to = String(dbInput.range?.to || reportApiBody.toDate || "").slice(0, 10);
    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base) return null;
    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, { apiPayload: reportApiBody, dbInput });
    const detailed = buildDetailedParentReportFromBaseReport(base, { playerName, period: "custom" });
    return { base, detailed, dbInput };
  });
}

async function resolveStudent(supabase, username) {
  const un = String(username || "").trim().toLowerCase();
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username,is_active")
    .eq("login_username", un)
    .eq("is_active", true)
    .limit(1);
  if (!codes?.[0]?.student_id) return null;
  const { data: row } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,leo_number")
    .eq("id", codes[0].student_id)
    .maybeSingle();
  return row?.id ? { ...row, login_username: un } : null;
}

function pickSlots(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of SLOT_KEYS) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") out[k] = obj[k];
  }
  return out;
}

function buildSlotsFromEdc(edc, lpd, mapRow, subjectLabelHe) {
  const metrics = normalizeParentVisibleMetrics(mapRow || {}, mapRow);
  return pickSlots({
    topicName: mapRow?.displayName || edc?.topicName,
    subjectName: subjectLabelHe,
    questions: edc?.questions ?? metrics.questions,
    correct: edc?.correct ?? metrics.correct,
    wrong: edc?.wrong ?? metrics.wrong,
    accuracy: edc?.accuracy ?? metrics.accuracy,
    detectedPattern: edc?.detectedPattern ?? null,
    affectedSubskill: edc?.affectedSubskill ?? null,
    misconceptionLabel: edc?.misconceptionLabel ?? null,
    recommendedAction: edc?.recommendedAction ?? lpd?.recommendedFocus ?? null,
    evidenceStrength: edc?.evidenceStrength ?? lpd?.evidenceStrength ?? null,
  });
}

function buildSlotsFromSubjectContract(subjectContract, subjectLabelHe) {
  const p0 = subjectContract?.priorityTopics?.[0];
  return pickSlots({
    subjectName: subjectLabelHe,
    questions: subjectContract?.totalQuestions,
    accuracy: subjectContract?.weightedAccuracy,
    recommendedAction: subjectContract?.recommendedSubjectAction,
    priorityTopics: (subjectContract?.priorityTopics || []).map((t) => t.topicKey),
    evidenceStrength: subjectContract?.evidenceStrength,
    detectedPattern: p0?.detectedPattern ?? null,
    topicName: p0?.topicLabelKey ?? null,
    affectedSubskill: p0?.affectedSubskill ?? null,
    misconceptionLabel: p0?.misconceptionLabel ?? null,
  });
}

function extractGradeFromTopicKey(topicKey) {
  const m = String(topicKey || "").match(/grade:(g\d+)/);
  return m ? m[1] : null;
}

/**
 * @param {object} p
 */
function makeRow(p) {
  rowCounter += 1;
  const surface = String(p.surface || "");
  const meta = SURFACE_META[surface] || {
    roleHe: "",
    reportTypes: [p.reportType || "unknown"],
    contractSource: p.contractSource || p.source || "unknown",
  };
  const text = String(p.exactParentVisibleHebrewText || p.currentRenderedText || "").trim();
  const templateId = p.templateId != null ? String(p.templateId) : null;

  return {
    rowId: p.rowId || `row_${rowCounter}`,
    dataSource: p.dataSource || "live",
    student: p.student || null,
    studentLabel: p.studentLabel || null,
    reportTypes: p.reportTypes || meta.reportTypes,
    surface,
    section: p.section || null,
    surfaceRoleHe: meta.roleHe,
    subject: p.subject || null,
    subjectLabelHe: p.subjectLabelHe || null,
    topicKey: p.topicKey || null,
    displayName: p.displayName || null,
    grade: p.grade || extractGradeFromTopicKey(p.topicKey) || null,
    level: p.level || null,
    questions: p.questions ?? p.slotsAvailable?.questions ?? null,
    correct: p.correct ?? p.slotsAvailable?.correct ?? null,
    wrong: p.wrong ?? p.slotsAvailable?.wrong ?? null,
    accuracy: p.accuracy ?? p.slotsAvailable?.accuracy ?? null,
    sourceEngine: p.sourceEngine || null,
    engineDecision: p.engineDecision || p.decisionCode || null,
    subjectDecision: p.subjectDecision || null,
    evidenceStrength: p.evidenceStrength ?? p.slotsAvailable?.evidenceStrength ?? null,
    severity: p.severity || null,
    detectedPattern: p.detectedPattern ?? p.slotsAvailable?.detectedPattern ?? null,
    misconceptionLabel: p.misconceptionLabel ?? p.slotsAvailable?.misconceptionLabel ?? null,
    affectedSubskill: p.affectedSubskill ?? p.slotsAvailable?.affectedSubskill ?? null,
    recommendedAction: p.recommendedAction ?? p.slotsAvailable?.recommendedAction ?? null,
    templateId: templateId || null,
    renderFunction: p.renderFunction || null,
    contractSource: p.contractSource || p.source || meta.contractSource,
    sourceField: p.sourceField || null,
    slotsAvailable: p.slotsAvailable || {},
    exactParentVisibleHebrewText: text || null,
    exactRecommendationText: p.exactRecommendationText ?? (surface === "recommendationCard" ? text : null),
    decisionChain: p.decisionChain || buildDecisionChain(p),
    appearsAlsoElsewhere: [],
    duplicateType: null,
    duplicateExplanation: null,
    duplicateGroupId: null,
    suggestedFutureAction: p.suggestedFutureAction || "keep",
    approvalNeeded: true,
  };
}

function buildDecisionChain(p) {
  const parts = [];
  if (p.questions != null || p.slotsAvailable?.questions != null) {
    parts.push(
      `metrics: q=${p.questions ?? p.slotsAvailable?.questions} c=${p.correct ?? p.slotsAvailable?.correct} w=${p.wrong ?? p.slotsAvailable?.wrong} acc=${p.accuracy ?? p.slotsAvailable?.accuracy}%`,
    );
  }
  if (p.sourceEngine) parts.push(`sourceEngine=${p.sourceEngine}`);
  if (p.engineDecision || p.decisionCode) parts.push(`engineDecision=${p.engineDecision || p.decisionCode}`);
  if (p.subjectDecision) parts.push(`subjectDecision=${p.subjectDecision}`);
  if (p.templateId) parts.push(`templateId=${p.templateId}`);
  if (p.surface) parts.push(`surface=${p.surface}/${p.section || ""}`);
  return parts.join(" → ");
}

function topicKeysFromMap(topicMap) {
  if (!topicMap || typeof topicMap !== "object") return [];
  return Object.keys(topicMap).filter((k) => Number(topicMap[k]?.questions) > 0);
}

function subjectQuestionCountKey(sid) {
  const keys = {
    math: "mathQuestions",
    geometry: "geometryQuestions",
    english: "englishQuestions",
    science: "scienceQuestions",
    history: "historyQuestions",
    hebrew: "hebrewQuestions",
    "moledet-geography": "moledetGeographyQuestions",
  };
  return keys[sid] || null;
}

function subjectAccuracyKey(sid) {
  const keys = {
    math: "mathAccuracy",
    geometry: "geometryAccuracy",
    english: "englishAccuracy",
    science: "scienceAccuracy",
    history: "historyAccuracy",
    hebrew: "hebrewAccuracy",
    "moledet-geography": "moledetGeographyAccuracy",
  };
  return keys[sid] || null;
}

/**
 * @param {object} ctx
 */
function collectLiveRowsForStudent(ctx) {
  const { student, label, base, detailed } = ctx;
  /** @type {object[]} */
  const rows = [];

  const subjectProfilesById = Object.fromEntries(
    (detailed.subjectProfiles || []).map((sp) => [String(sp.subject), sp]),
  );

  // --- Diagnostic overview (parent report screen) ---
  const dov = base.summary?.diagnosticOverviewHe;
  if (dov && typeof dov === "object") {
    const overviewFields = [
      "practicedSubjectsSummaryHe",
      "notPracticedSubjectsSummaryHe",
      "mainFocusAreaLineHe",
      "strongestAreaLineHe",
    ];
    for (const field of overviewFields) {
      const text = String(dov[field] || "").trim();
      if (!text) continue;
      rows.push(
        makeRow({
          rowId: `${student}:diagnosticOverview:${field}`,
          student,
          studentLabel: label,
          surface: "diagnosticOverview",
          section: field,
          subject: null,
          source: "utils/parent-report-v2.js",
          contractSource: "buildDiagnosticOverviewHeV2",
          sourceField: `report.summary.diagnosticOverviewHe.${field}`,
          renderFunction: "utils/parent-report-v2.js → buildDiagnosticOverviewHeV2",
          templateId: "diagnostic_overview_v2",
          exactParentVisibleHebrewText: text,
          dataSource: "live",
        }),
      );
    }
    for (const [arrField, prefix] of [
      ["readyForProgressPreviewHe", "ready"],
      ["requiresAttentionPreviewHe", "attention"],
      ["insufficientDataSubjectsHe", "insufficient"],
    ]) {
      const arr = Array.isArray(dov[arrField]) ? dov[arrField] : [];
      arr.forEach((text, i) => {
        const t = String(text || "").trim();
        if (!t) return;
        rows.push(
          makeRow({
            rowId: `${student}:diagnosticOverview:${arrField}:${i}`,
            student,
            studentLabel: label,
            surface: "diagnosticOverview",
            section: `${prefix}_${i}`,
            sourceField: `report.summary.diagnosticOverviewHe.${arrField}[${i}]`,
            renderFunction: "utils/parent-report-v2.js → buildDiagnosticOverviewHeV2",
            templateId: "diagnostic_overview_v2",
            exactParentVisibleHebrewText: t,
            dataSource: "live",
          }),
        );
      });
    }
  }

  // --- Insights ---
  const insights = base.parentFacing?.insights || [];
  insights.forEach((text, i) => {
    const t = String(text || "").trim();
    if (!t) return;
    rows.push(
      makeRow({
        rowId: `${student}:insights:${i}`,
        student,
        studentLabel: label,
        surface: "insights",
        section: `insight_${i}`,
        source: base._parentFacingInsightsSource || "topic_engine",
        contractSource: "utils/parent-report-engine-insights-he.js",
        sourceField: `report.parentFacing.insights[${i}]`,
        renderFunction: "applyTopicEngineParentFacingInsights → buildTopicEngineInsightLineHe",
        templateId: "lpd_parent_visible_finding",
        exactParentVisibleHebrewText: t,
        dataSource: "live",
      }),
    );
  });

  // --- Executive summary + cross subject + home plan (detailed) ---
  const es = detailed.executiveSummary;
  if (es && typeof es === "object") {
    const esScalars = [
      "homeFocusHe",
      "mainHomeRecommendationHe",
      "cautionNoteHe",
      "overallConfidenceHe",
      "dominantCrossSubjectRiskLabelHe",
      "dominantCrossSubjectSuccessPatternLabelHe",
    ];
    for (const field of esScalars) {
      const text = String(es[field] || "").trim();
      if (!text) continue;
      rows.push(
        makeRow({
          rowId: `${student}:executiveSummary:${field}`,
          student,
          studentLabel: label,
          surface: "executiveSummary",
          section: field,
          sourceField: `detailed.executiveSummary.${field}`,
          renderFunction: "utils/detailed-parent-report.js → buildExecutiveSummaryFromV2",
          templateId: "executive_summary_v2",
          exactParentVisibleHebrewText: text,
          dataSource: "live",
        }),
      );
    }
    for (const [arrField] of [
      ["topStrengthsAcrossHe"],
      ["topFocusAreasHe"],
      ["majorTrendsHe"],
      ["gradeSplitTopicNoticesHe"],
    ]) {
      const arr = Array.isArray(es[arrField]) ? es[arrField] : [];
      arr.forEach((text, i) => {
        const t = String(text || "").trim();
        if (!t) return;
        rows.push(
          makeRow({
            rowId: `${student}:executiveSummary:${arrField}:${i}`,
            student,
            studentLabel: label,
            surface: "executiveSummary",
            section: `${arrField}_${i}`,
            sourceField: `detailed.executiveSummary.${arrField}[${i}]`,
            renderFunction: "buildExecutiveSummaryFromV2",
            templateId: "executive_summary_v2",
            exactParentVisibleHebrewText: t,
            dataSource: "live",
          }),
        );
      });
    }
  }

  const csi = detailed.crossSubjectInsights;
  if (csi && typeof csi === "object") {
    for (const field of ["summaryHe", "dataQualityNoteHe"]) {
      const text = String(csi[field] || "").trim();
      if (!text) continue;
      rows.push(
        makeRow({
          rowId: `${student}:crossSubjectInsights:${field}`,
          student,
          studentLabel: label,
          surface: "crossSubjectInsights",
          section: field,
          sourceField: `detailed.crossSubjectInsights.${field}`,
          renderFunction: "buildCrossSubjectInsightsFromV2",
          templateId: "cross_subject_v2",
          exactParentVisibleHebrewText: text,
          dataSource: "live",
        }),
      );
    }
    const bullets = Array.isArray(csi.bulletsHe) ? csi.bulletsHe : [];
    bullets.forEach((text, i) => {
      const t = String(text || "").trim();
      if (!t) return;
      rows.push(
        makeRow({
          rowId: `${student}:crossSubjectInsights:bulletsHe:${i}`,
          student,
          studentLabel: label,
          surface: "crossSubjectInsights",
          section: `bulletsHe_${i}`,
          sourceField: `detailed.crossSubjectInsights.bulletsHe[${i}]`,
          renderFunction: "v2-parent-copy.js → crossSubjectV2BulletsHe",
          templateId: "cross_subject_v2",
          exactParentVisibleHebrewText: t,
          dataSource: "live",
        }),
      );
    });
  }

  const hp = detailed.homePlan;
  if (hp?.itemsHe) {
    (Array.isArray(hp.itemsHe) ? hp.itemsHe : [hp.itemsHe]).forEach((text, i) => {
      const t = String(text || "").trim();
      if (!t) return;
      rows.push(
        makeRow({
          rowId: `${student}:homePlan:itemsHe:${i}`,
          student,
          studentLabel: label,
          surface: "homePlan",
          section: `item_${i}`,
          sourceField: `detailed.homePlan.itemsHe[${i}]`,
          renderFunction: "buildHomePlanFromV2",
          templateId: "home_plan_v2",
          exactParentVisibleHebrewText: t,
          dataSource: "live",
        }),
      );
    });
  }

  const npg = detailed.nextPeriodGoals;
  if (npg?.itemsHe) {
    (Array.isArray(npg.itemsHe) ? npg.itemsHe : [npg.itemsHe]).forEach((text, i) => {
      const t = String(text || "").trim();
      if (!t) return;
      rows.push(
        makeRow({
          rowId: `${student}:nextPeriodGoals:itemsHe:${i}`,
          student,
          studentLabel: label,
          surface: "nextPeriodGoals",
          section: `goal_${i}`,
          sourceField: `detailed.nextPeriodGoals.itemsHe[${i}]`,
          renderFunction: "buildNextPeriodGoalsFromV2",
          templateId: "next_period_goals_v2",
          exactParentVisibleHebrewText: t,
          dataSource: "live",
        }),
      );
    });
  }

  // --- Per subject ---
  const allUnits = Array.isArray(base?.diagnosticEngineV2?.units) ? base.diagnosticEngineV2.units : [];

  for (const sid of SUBJECT_IDS) {
    const subjectLabelHe = SUBJECT_LABEL_HE[sid];
    const mapKey = REPORT_MAP_KEY[sid];
    const topicMap = mapKey ? base?.[mapKey] || {} : {};
    const sp = subjectProfilesById[sid] || null;
    const subjectContract =
      sp?.[SP_SUBJECT_ENGINE_CONTRACT] || readSubjectEngineContract(sp) || null;

    const qKey = subjectQuestionCountKey(sid);
    const accKey = subjectAccuracyKey(sid);
    const subjectReportQuestions = qKey ? Number(base?.summary?.[qKey]) || 0 : 0;
    if (subjectReportQuestions <= 0 && !sp?.summaryHe) continue;

    const subjectUnits = filterCoreV2Units(
      allUnits.filter((u) => String(u?.subjectId) === sid),
      topicMap,
      base?.registeredGradeKey,
    );

    const shortSubject =
      base.patternDiagnostics?.subjects?.[sid] ||
      (subjectUnits.length
        ? summarizeV2UnitsForSubjectForTests(subjectUnits, {
            subjectId: sid,
            subjectReportQuestions,
            subjectLabelHe,
            reportSubjectAccuracy:
              accKey && base?.summary?.[accKey] != null
                ? Math.round(Number(base.summary[accKey]))
                : null,
            reportTotalQuestions: Number(base?.summary?.totalQuestions) || 0,
            topicMap,
            registeredGradeKey: base?.registeredGradeKey,
          })
        : null);

    const shortSubjectContract =
      shortSubject?.[SP_SUBJECT_ENGINE_CONTRACT] ||
      readSubjectEngineContract(shortSubject) ||
      subjectContract;

    if (shortSubject?.summaryHe) {
      const usesSubjectContract =
        shortSubject.subjectSummaryRenderSource === "subjectEngineDecisionContract" ||
        shortSubjectContract?.blockedLegacySummary === true;
      rows.push(
        makeRow({
          rowId: `${student}:subjectSummary:${sid}`,
          student,
          studentLabel: label,
          surface: "subjectSummary",
          section: "summaryHe",
          subject: sid,
          subjectLabelHe,
          subjectDecision: shortSubjectContract?.subjectDecision || null,
          sourceEngine: "topic_aggregation",
          templateId: usesSubjectContract
            ? shortSubject.subjectSummaryTemplateId ||
              shortSubjectContract?.summarySlots?.openingTemplateId ||
              "SUBJECT_OPENING_PRIORITY_TOPIC_0"
            : "legacy_short_subject_summary",
          engineDecision: null,
          source: usesSubjectContract ? "subjectEngineDecisionContract" : "legacy",
          contractSource: "summarizeV2UnitsForSubject → resolveSubjectSummaryTextFromEngineContract",
          sourceField: `patternDiagnostics.subjects.${sid}.summaryHe`,
          renderFunction: "utils/parent-report-v2.js → summarizeV2UnitsForSubject",
          slotsAvailable: buildSlotsFromSubjectContract(shortSubjectContract || subjectContract, subjectLabelHe),
          exactParentVisibleHebrewText: shortSubject.summaryHe,
          dataSource: "live",
        }),
      );
    }

    const engineRows = collectTopicEngineRowsFromReport(base).filter(
      (r) => String(r.subjectId) === sid && Number(r.questions) > 0,
    );
    for (const row of engineRows) {
      const line = buildTopicEngineInsightLineHe(row);
      if (!line) continue;
      const topicRowKey = String(row.topicKey || row.topicRowKey || row.rowKey || "").trim();
      const mapRow = (topicRowKey && topicMap[topicRowKey]) || null;
      const lpd = getLpdFromRow(mapRow || row) || mapRow?.learningPatternDecision || null;
      const edc = mapRow?.[EDC_CONTRACT_KEY] || lpd?.[EDC_CONTRACT_KEY] || row?.[EDC_CONTRACT_KEY] || null;
      rows.push(
        makeRow({
          rowId: `${student}:topicInsightLine:${sid}:${topicRowKey || row.rowKey}`,
          student,
          studentLabel: label,
          surface: "topicInsightLine",
          section: "insightLine",
          subject: sid,
          subjectLabelHe,
          topicKey: topicRowKey || null,
          displayName: mapRow?.displayName || edc?.topicName || null,
          questions: edc?.questions ?? mapRow?.questions,
          correct: edc?.correct ?? mapRow?.correct,
          wrong: edc?.wrong ?? mapRow?.wrong,
          accuracy: edc?.accuracy ?? mapRow?.accuracy,
          sourceEngine: edc?.sourceEngine || null,
          engineDecision: edc?.engineDecision || null,
          severity: edc?.severity || null,
          detectedPattern: edc?.detectedPattern || null,
          templateId: lpd?.templateId || edc?.templateId || "lpd_parent_visible_finding",
          source: edc?.parentSafeFinding || lpd?.engineDecisionContract ? "engineDecisionContract" : "legacy",
          contractSource: "engineDecisionContract → buildTopicEngineInsightLineHe",
          sourceField: "parentFacing.insights / topicEngineRowSignals",
          renderFunction: "utils/parent-report-engine-insights-he.js → buildTopicEngineInsightLineHe",
          slotsAvailable: buildSlotsFromEdc(edc, lpd, mapRow || row, subjectLabelHe),
          exactParentVisibleHebrewText: line,
          dataSource: "live",
        }),
      );
    }

    const topicKeys = [
      ...new Set([
        ...topicKeysFromMap(topicMap),
        ...(sp?.topicRecommendations || []).map((t) => t.topicRowKey || t.topicKey),
      ]),
    ].filter(Boolean);

    for (const topicRowKey of topicKeys) {
      const mapRow = topicMap[topicRowKey] || null;
      if (!mapRow || Number(mapRow.questions) <= 0) continue;
      const lpd = getLpdFromRow(mapRow) || mapRow.learningPatternDecision || null;
      const edc = mapRow[EDC_CONTRACT_KEY] || lpd?.[EDC_CONTRACT_KEY] || null;
      const tr = (sp?.topicRecommendations || []).find(
        (t) => String(t?.topicRowKey || t?.topicKey) === topicRowKey,
      );

      const explainCopy = resolveParentExplainRowCopy({
        ...mapRow,
        label: mapRow.displayName,
        displayName: mapRow.displayName,
        mapRow,
      });
      const explainSections = buildLpdSafeTopicExplainSectionsHe({
        ...mapRow,
        label: mapRow.displayName,
        displayName: mapRow.displayName,
        mapRow,
      });

      const explainSectionMap = {
        identified: "TOPIC_EXPLAIN_IDENTIFIED",
        data: "TOPIC_EXPLAIN_DATA",
        pattern: "TOPIC_EXPLAIN_PATTERN",
        meaning: "TOPIC_EXPLAIN_MEANING",
        action: "TOPIC_EXPLAIN_HOME_ACTION",
      };

      const baseEdcFields = {
        subject: sid,
        subjectLabelHe,
        topicKey: topicRowKey,
        displayName: mapRow.displayName,
        questions: edc?.questions ?? mapRow.questions,
        correct: edc?.correct ?? mapRow.correct,
        wrong: edc?.wrong ?? mapRow.wrong,
        accuracy: edc?.accuracy ?? mapRow.accuracy,
        sourceEngine: edc?.sourceEngine || null,
        engineDecision: edc?.engineDecision || null,
        severity: edc?.severity || null,
        detectedPattern: edc?.detectedPattern || null,
        misconceptionLabel: edc?.misconceptionLabel || null,
        affectedSubskill: edc?.affectedSubskill || null,
        recommendedAction: edc?.recommendedAction || null,
        evidenceStrength: edc?.evidenceStrength || null,
        slotsAvailable: buildSlotsFromEdc(edc, lpd, mapRow, subjectLabelHe),
      };

      if (explainCopy?.primaryFinding) {
        rows.push(
          makeRow({
            ...baseEdcFields,
            rowId: `${student}:topicExplain:primaryFinding:${sid}:${topicRowKey}`,
            student,
            studentLabel: label,
            surface: "topicExplain",
            section: "primaryFinding",
            templateId: lpd?.templateId || "lpd_parent_visible_finding",
            source: edc?.parentSafeFinding ? "engineDecisionContract" : lpd ? "engineDecisionContract" : "fallback",
            contractSource: "lpd-parent-facing-copy.js → resolveParentExplainRowCopy",
            sourceField: "primaryFinding",
            renderFunction: "resolveParentExplainRowCopy",
            exactParentVisibleHebrewText: explainCopy.primaryFinding,
            dataSource: "live",
          }),
        );
      }

      if (explainSections) {
        for (const [sec, templateSuffix] of Object.entries(explainSectionMap)) {
          const text = String(explainSections[sec] || "").trim();
          if (!text) continue;
          const contractDriven = !!(edc?.parentSafeFinding && sec === "identified");
          rows.push(
            makeRow({
              ...baseEdcFields,
              rowId: `${student}:topicExplain:${sec}:${sid}:${topicRowKey}`,
              student,
              studentLabel: label,
              surface: "topicExplain",
              section: sec,
              templateId: contractDriven
                ? `${lpd?.templateId || "engine_contract"}:${templateSuffix}`
                : `${lpd?.templateId || "lpd_fallback"}:${templateSuffix}`,
              source: contractDriven ? "engineDecisionContract" : edc ? "engineDecisionContract" : "legacy",
              contractSource: "lpd-parent-facing-copy.js → buildLpdSafeTopicExplainSectionsHe",
              sourceField: `explainSections.${sec}`,
              renderFunction: "buildLpdSafeTopicExplainSectionsHe",
              exactParentVisibleHebrewText: text,
              dataSource: "live",
            }),
          );
        }
      }

      if (tr) {
        const recFields = [
          ["recommendedStepLabelHe", "RECOMMENDATION_STEP_LABEL"],
          ["parentVisibleFinding", "RECOMMENDATION_FINDING"],
          ["interventionPlanHe", "RECOMMENDATION_INTERVENTION_PLAN"],
          ["doNowHe", "RECOMMENDATION_DO_NOW"],
          ["cautionLineHe", "RECOMMENDATION_CAUTION"],
        ];
        const trEdc = tr[EDC_CONTRACT_KEY] || tr?.learningPatternDecision?.[EDC_CONTRACT_KEY] || edc;
        for (const [field, suffix] of recFields) {
          const text = String(tr[field] || "").trim();
          if (!text) continue;
          rows.push(
            makeRow({
              ...baseEdcFields,
              rowId: `${student}:recommendationCard:${field}:${sid}:${topicRowKey}`,
              student,
              studentLabel: label,
              surface: "recommendationCard",
              section: field,
              templateId: `${lpd?.templateId || trEdc?.templateId || "topic_recommendation_v2"}:${suffix}`,
              engineDecision: trEdc?.engineDecision || edc?.engineDecision || null,
              source: trEdc ? "engineDecisionContract" : "legacy",
              contractSource: "detailed-parent-report.js → recommendationFromV2Unit",
              sourceField: `topicRecommendations.${field}`,
              renderFunction: "recommendationFromV2Unit",
              exactParentVisibleHebrewText: text,
              exactRecommendationText: text,
              dataSource: "live",
            }),
          );
        }

        const narrative = buildTopicRecommendationNarrative(tr);
        if (narrative && typeof narrative === "object") {
          for (const [sec, text] of Object.entries(narrative)) {
            const t = String(text || "").trim();
            if (!t || sec === "contractsV1") continue;
            rows.push(
              makeRow({
                ...baseEdcFields,
                rowId: `${student}:detailedNarrative:${sec}:${sid}:${topicRowKey}`,
                student,
                studentLabel: label,
                surface: "detailedNarrative",
                section: sec,
                templateId: tr?.contractsV1?.narrative?.wordingEnvelope
                  ? `NARRATIVE_${tr.contractsV1.narrative.wordingEnvelope}_${sec}`
                  : `NARRATIVE_WE_UNKNOWN_${sec}`,
                source: tr?.contractsV1?.narrative ? "engineDecisionContract" : "legacy",
                contractSource: "detailed-report-parent-letter-he.js → buildTopicRecommendationNarrative",
                sourceField: `narrative.${sec}`,
                renderFunction: "buildTopicRecommendationNarrative",
                exactParentVisibleHebrewText: t,
                dataSource: "live",
              }),
            );
          }
        }
      }
    }

    if (sp?.summaryHe) {
      rows.push(
        makeRow({
          rowId: `${student}:subjectRollup:${sid}`,
          student,
          studentLabel: label,
          surface: "subjectRollup",
          section: "summaryHe",
          subject: sid,
          subjectLabelHe,
          subjectDecision: subjectContract?.subjectDecision || null,
          templateId: subjectContract?.summarySlots?.openingTemplateId || "SUBJECT_OPENING_PRIORITY_TOPIC_0",
          source: subjectContract?.blockedLegacySummary ? "subjectEngineDecisionContract" : "legacy",
          contractSource: "resolveSubjectSummaryTextFromEngineContract",
          sourceField: `subjectProfiles.${sid}.summaryHe`,
          renderFunction: "buildSubjectProfilesFromV2",
          slotsAvailable: buildSlotsFromSubjectContract(subjectContract, subjectLabelHe),
          exactParentVisibleHebrewText: sp.summaryHe,
          dataSource: "live",
        }),
      );
    }

    const letter = buildSubjectParentLetter(sp || { subject: sid, subjectLabelHe });
    const letterSections = [
      ["opening", subjectContract?.summarySlots?.openingTemplateId || "SUBJECT_OPENING_PRIORITY_TOPIC_0"],
      ["diagnosisHe", subjectContract?.summarySlots?.diagnosisTemplateId || "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1"],
      ["homeAction", subjectContract?.summarySlots?.homeActionTemplateId || "remediate_priority_topics_same_level"],
      ["closing", subjectContract?.summarySlots?.closingTemplateId || "SUBJECT_CLOSING_ENGINE_CONTRACT"],
    ];
    for (const [sec, slotTemplateId] of letterSections) {
      const text = String(letter[sec] || "").trim();
      if (!text) continue;
      const surface = sec === "homeAction" ? "homeAction" : "parentLetter";
      rows.push(
        makeRow({
          rowId: `${student}:${surface}:${sec}:${sid}`,
          student,
          studentLabel: label,
          surface,
          section: sec,
          subject: sid,
          subjectLabelHe,
          subjectDecision: subjectContract?.subjectDecision || null,
          templateId: slotTemplateId,
          source:
            letter.renderSource === "subjectEngineDecisionContract" || subjectContract?.blockedLegacySummary
              ? "subjectEngineDecisionContract"
              : "legacy",
          contractSource: "detailed-report-parent-letter-he.js → buildSubjectParentLetter",
          sourceField: `parentLetter.${sec}`,
          renderFunction: "buildSubjectParentLetter",
          slotsAvailable: buildSlotsFromSubjectContract(subjectContract, subjectLabelHe),
          exactParentVisibleHebrewText: text,
          exactRecommendationText: sec === "homeAction" ? text : null,
          dataSource: "live",
        }),
      );
    }

    const compactLetter = buildSubjectParentLetterCompact(sp || { subject: sid, subjectLabelHe });
    for (const [sec, text] of Object.entries(compactLetter || {})) {
      const t = String(text || "").trim();
      if (!t || sec === "renderSource") continue;
      rows.push(
        makeRow({
          rowId: `${student}:parentLetterCompact:${sec}:${sid}`,
          student,
          studentLabel: label,
          surface: "parentLetter",
          section: `compact_${sec}`,
          subject: sid,
          subjectLabelHe,
          subjectDecision: subjectContract?.subjectDecision || null,
          templateId: subjectContract?.summarySlots?.openingTemplateId || "SUBJECT_OPENING_PRIORITY_TOPIC_0",
          contractSource: "buildSubjectParentLetterCompact",
          sourceField: `parentLetterCompact.${sec}`,
          renderFunction: "buildSubjectParentLetterCompact",
          exactParentVisibleHebrewText: t,
          dataSource: "live",
        }),
      );
    }
  }

  return rows;
}

/** Static fixture slots for owner template catalog */
const STATIC_TOPIC_FIXTURES = [
  {
    fixtureId: "clear_topic_gap_pattern",
    decisionCode: "clear_topic_gap",
    baseTemplateId: "difficulty_observed",
    slots: {
      topicName: "חיבור",
      subjectName: "מתמטיקה",
      questions: 10,
      correct: 2,
      wrong: 8,
      accuracy: 20,
      detectedPattern: "שגיאה בעמודות העשרות",
      affectedSubskill: "עמודות העשרות",
      misconceptionLabel: null,
      recommendedAction: "remediate_same_level",
      evidenceStrength: "strong",
      decisionCode: "clear_topic_gap",
      baseTemplateId: "difficulty_observed",
      narrativeEnvelope: "WE0",
    },
  },
  {
    fixtureId: "topic_needs_strengthening_pattern",
    decisionCode: "topic_needs_strengthening",
    baseTemplateId: "difficulty_observed",
    slots: {
      topicName: "שברים",
      subjectName: "מתמטיקה",
      questions: 206,
      correct: 108,
      wrong: 98,
      accuracy: 52,
      detectedPattern: "השוואה לפי מונה בלבד",
      affectedSubskill: "חלק כלל",
      recommendedAction: "remediate_same_level",
      evidenceStrength: "strong",
      decisionCode: "topic_needs_strengthening",
      baseTemplateId: "difficulty_observed",
      narrativeEnvelope: "WE2",
    },
  },
  {
    fixtureId: "early_direction_positive",
    decisionCode: "early_direction_only",
    baseTemplateId: "positive_observed",
    slots: {
      topicName: "חיבור",
      subjectName: "מתמטיקה",
      questions: 8,
      correct: 6,
      wrong: 2,
      accuracy: 75,
      detectedPattern: null,
      recommendedAction: "maintain_and_strengthen",
      evidenceStrength: "supported",
      decisionCode: "early_direction_only",
      baseTemplateId: "positive_observed",
      narrativeEnvelope: "WE0",
    },
  },
  {
    fixtureId: "insufficient_data_initial",
    decisionCode: "insufficient_data",
    baseTemplateId: "initial_topic_data",
    slots: {
      topicName: "חילוק",
      subjectName: "מתמטיקה",
      questions: 2,
      correct: 0,
      wrong: 2,
      accuracy: 0,
      detectedPattern: null,
      recommendedAction: "watch",
      evidenceStrength: "preliminary",
      decisionCode: "insufficient_data",
      baseTemplateId: "initial_topic_data",
      narrativeEnvelope: null,
    },
  },
  {
    fixtureId: "partial_stable_mixed",
    decisionCode: "partial_stable",
    baseTemplateId: "mixed",
    slots: {
      topicName: "כפל",
      subjectName: "מתמטיקה",
      questions: 32,
      correct: 22,
      wrong: 10,
      accuracy: 69,
      detectedPattern: "אותם זוגות שגויים",
      affectedSubskill: "עובדת כפל",
      recommendedAction: "remediate_same_level",
      evidenceStrength: "strong",
      decisionCode: "partial_stable",
      baseTemplateId: "mixed",
      narrativeEnvelope: "WE1",
    },
  },
  {
    fixtureId: "insufficient_practice_focus",
    decisionCode: "insufficient_data",
    baseTemplateId: "practice_focus",
    slots: {
      topicName: "עשרוניים",
      subjectName: "מתמטיקה",
      questions: 5,
      correct: 3,
      wrong: 2,
      accuracy: 60,
      detectedPattern: null,
      recommendedAction: "watch",
      evidenceStrength: "preliminary",
      decisionCode: "insufficient_data",
      baseTemplateId: "practice_focus",
      narrativeEnvelope: null,
    },
  },
];

const STATIC_SUBJECT_FIXTURES = [
  {
    fixtureId: "multiple_topic_gaps",
    subjectDecision: "multiple_topic_gaps",
    subjectName: "מתמטיקה",
    recommendedSubjectAction: "remediate_priority_topics_same_level",
    priorityTopic0: {
      topicName: "שברים",
      questions: 206,
      correct: 108,
      wrong: 98,
      accuracy: 52,
      detectedPattern: "השוואה לפי מונה בלבד",
      affectedSubskill: "חלק כלל",
      evidenceStrength: "strong",
    },
    priorityTopic1: {
      topicName: "כפל",
      questions: 32,
      correct: 22,
      wrong: 10,
      accuracy: 69,
      detectedPattern: "אותם זוגות שגויים",
      affectedSubskill: "עובדת כפל",
      evidenceStrength: "strong",
    },
  },
  {
    fixtureId: "focused_strengthening",
    subjectDecision: "focused_strengthening_needed",
    subjectName: "מתמטיקה",
    recommendedSubjectAction: "remediate_priority_topics_same_level",
    priorityTopic0: {
      topicName: "חיבור",
      questions: 10,
      correct: 2,
      wrong: 8,
      accuracy: 20,
      detectedPattern: null,
      evidenceStrength: "strong",
    },
    priorityTopic1: null,
  },
];

function collectStaticOwnerTemplateRows() {
  /** @type {object[]} */
  const rows = [];

  for (const fixture of STATIC_TOPIC_FIXTURES) {
    for (const templateId of Object.keys(parentReportOwnerCopyTemplatesHe)) {
      if (templateId.startsWith("SUBJECT_") || templateId.startsWith("remediate_")) continue;
      const baseId = templateId.split(":")[0];
      if (baseId !== fixture.baseTemplateId && !templateId.startsWith(fixture.baseTemplateId)) continue;
      if (templateId.startsWith("NARRATIVE_") && fixture.slots.narrativeEnvelope) {
        const env = templateId.match(/^NARRATIVE_(WE\d)/)?.[1];
        if (env && env !== fixture.slots.narrativeEnvelope && !templateId.includes(fixture.slots.narrativeEnvelope)) {
          continue;
        }
      }
      const fn = parentReportOwnerCopyTemplatesHe[templateId];
      let text = "";
      try {
        text = String(fn(fixture.slots) || "").trim();
      } catch {
        text = "";
      }
      if (!text) continue;

      let surface = "staticTemplateCatalog";
      let section = templateId;
      if (templateId.includes("TOPIC_EXPLAIN")) {
        surface = "topicExplain";
        section = templateId.split(":")[1]?.toLowerCase().replace("topic_explain_", "") || templateId;
      } else if (templateId.includes("RECOMMENDATION")) {
        surface = "recommendationCard";
        section = templateId.split(":")[1] || templateId;
      } else if (templateId.startsWith("NARRATIVE_")) {
        surface = "detailedNarrative";
        section = templateId.replace(/^NARRATIVE_WE\d_/, "");
      } else if (!templateId.includes(":")) {
        surface = "topicExplain";
        section = "primaryFinding";
      }

      rows.push(
        makeRow({
          rowId: `static:topic:${fixture.fixtureId}:${templateId}`,
          dataSource: "static_template",
          student: null,
          studentLabel: `fixture:${fixture.fixtureId}`,
          surface,
          section,
          subject: "math",
          subjectLabelHe: fixture.slots.subjectName,
          topicKey: `fixture:${fixture.fixtureId}`,
          displayName: fixture.slots.topicName,
          questions: fixture.slots.questions,
          correct: fixture.slots.correct,
          wrong: fixture.slots.wrong,
          accuracy: fixture.slots.accuracy,
          sourceEngine: "fixture",
          engineDecision: fixture.decisionCode,
          detectedPattern: fixture.slots.detectedPattern,
          affectedSubskill: fixture.slots.affectedSubskill,
          recommendedAction: fixture.slots.recommendedAction,
          evidenceStrength: fixture.slots.evidenceStrength,
          templateId,
          contractSource: "parent-report-owner-topic-copy-templates-he.js",
          sourceField: `parentReportOwnerCopyTemplatesHe['${templateId}']`,
          renderFunction: "renderOwnerTopicCopyTemplateHe",
          slotsAvailable: pickSlots(fixture.slots),
          exactParentVisibleHebrewText: text,
          suggestedFutureAction: "keep",
        }),
      );
    }
  }

  const subjectTemplateIds = [
    "SUBJECT_OPENING_PRIORITY_TOPIC_0",
    "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_0",
    "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1",
    "SUBJECT_CLOSING_ENGINE_CONTRACT",
    "remediate_priority_topics_same_level",
  ];

  for (const fixture of STATIC_SUBJECT_FIXTURES) {
    const slots = {
      subjectName: fixture.subjectName,
      subjectDecision: fixture.subjectDecision,
      recommendedSubjectAction: fixture.recommendedSubjectAction,
      priorityTopic0: fixture.priorityTopic0,
      priorityTopic1: fixture.priorityTopic1,
    };
    for (const templateId of subjectTemplateIds) {
      const fn = parentReportOwnerCopyTemplatesHe[templateId];
      if (!fn) continue;
      let text = "";
      try {
        text = String(fn(slots) || "").trim();
      } catch {
        text = "";
      }
      if (!text) continue;
      const surface = templateId === "remediate_priority_topics_same_level" ? "homeAction" : "parentLetter";
      rows.push(
        makeRow({
          rowId: `static:subject:${fixture.fixtureId}:${templateId}`,
          dataSource: "static_template",
          studentLabel: `fixture:${fixture.fixtureId}`,
          surface,
          section: templateId,
          subject: "math",
          subjectLabelHe: fixture.subjectName,
          subjectDecision: fixture.subjectDecision,
          recommendedAction: fixture.recommendedSubjectAction,
          templateId,
          contractSource: "parent-report-owner-copy-templates-he.js",
          sourceField: `parentReportOwnerCopyTemplatesHe['${templateId}']`,
          renderFunction: "renderOwnerSubjectCopyTemplateHe",
          slotsAvailable: pickSlots({
            subjectName: fixture.subjectName,
            topicName: fixture.priorityTopic0?.topicName,
            questions: fixture.priorityTopic0?.questions,
            accuracy: fixture.priorityTopic0?.accuracy,
            detectedPattern: fixture.priorityTopic0?.detectedPattern,
          }),
          exactParentVisibleHebrewText: text,
          exactRecommendationText: surface === "homeAction" ? text : null,
          suggestedFutureAction: "keep",
        }),
      );
    }
  }

  return rows;
}

function collectGradeAwareTemplateRows() {
  /** @type {object[]} */
  const rows = [];
  const taxonomyBySubject = {};
  for (const row of ALL_TAXONOMY_ROWS || []) {
    const sid = String(row.subjectId || "");
    if (!taxonomyBySubject[sid]) taxonomyBySubject[sid] = [];
    taxonomyBySubject[sid].push(row);
  }

  for (const sid of SUBJECT_IDS) {
    const subjectTemplates = GRADE_AWARE_RECOMMENDATION_TEMPLATES[sid];
    if (!subjectTemplates) continue;
    const subjectLabelHe = SUBJECT_LABEL_HE[sid];

    for (const [taxonomyId, tpl] of Object.entries(subjectTemplates)) {
      const taxRow = (taxonomyBySubject[sid] || []).find((r) => r.taxonomyId === taxonomyId);
      const displayName = taxRow?.displayNameHe || taxonomyId;

      const bands = ["g1_g2", "g3_g4", "g5_g6"];
      const processBand = (bandKey, bandCopy, bucketKey = null) => {
        if (!bandCopy || typeof bandCopy !== "object") return;
        for (const field of ["actionTextHe", "goalTextHe"]) {
          const text = String(bandCopy[field] || "").trim();
          if (!text) continue;
          rows.push(
            makeRow({
              rowId: `static:gradeAware:${sid}:${taxonomyId}:${bucketKey || "default"}:${bandKey}:${field}`,
              dataSource: "static_template",
              studentLabel: "gradeAwareCatalog",
              surface: "gradeAwareTemplate",
              section: field,
              subject: sid,
              subjectLabelHe,
              topicKey: taxonomyId,
              displayName,
              grade: bandKey,
              templateId: `grade_aware:${sid}:${taxonomyId}${bucketKey ? `:${bucketKey}` : ""}:${bandKey}:${field}`,
              contractSource: "grade-aware-recommendation-templates.js",
              sourceField: `GRADE_AWARE_RECOMMENDATION_TEMPLATES.${sid}.${taxonomyId}`,
              renderFunction: "grade-aware recommendation resolver",
              exactParentVisibleHebrewText: text,
              exactRecommendationText: field === "actionTextHe" ? text : null,
              suggestedFutureAction: "keep",
            }),
          );
        }
      };

      if (tpl.defaultBands) {
        for (const bandKey of bands) {
          processBand(bandKey, tpl.defaultBands[bandKey]);
        }
        if (tpl.bucketOverrides) {
          for (const [bucketKey, bucketTpl] of Object.entries(tpl.bucketOverrides)) {
            for (const bandKey of bands) {
              processBand(bandKey, bucketTpl?.[bandKey], bucketKey);
            }
          }
        }
      } else {
        for (const bandKey of bands) {
          processBand(bandKey, tpl[bandKey]);
        }
      }
    }
  }
  return rows;
}

function tokenOverlapRatio(a, b) {
  const ta = new Set(normalizeParentReportTextForDedupe(a).split(/\s+/).filter((w) => w.length > 3));
  const tb = new Set(normalizeParentReportTextForDedupe(b).split(/\s+/).filter((w) => w.length > 3));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

function classifyDuplicate(a, b) {
  const na = normalizeParentReportTextForDedupe(a.exactParentVisibleHebrewText);
  const nb = normalizeParentReportTextForDedupe(b.exactParentVisibleHebrewText);
  if (!na || !nb) return null;
  if (na === nb) return "exact duplicate";
  if (isDuplicateParentReportText(a.exactParentVisibleHebrewText, b.exactParentVisibleHebrewText)) {
    return "near duplicate";
  }
  if (
    a.detectedPattern &&
    b.detectedPattern &&
    normalizeParentReportTextForDedupe(a.detectedPattern) === normalizeParentReportTextForDedupe(b.detectedPattern) &&
    a.topicKey &&
    b.topicKey &&
    a.topicKey === b.topicKey
  ) {
    return "same idea repeated";
  }
  if (tokenOverlapRatio(a.exactParentVisibleHebrewText, b.exactParentVisibleHebrewText) >= 0.55) {
    return "same idea repeated";
  }
  return null;
}

function isLegitimateRepeat(a, b, dupType) {
  if (dupType !== "same idea repeated" && dupType !== "near duplicate") return false;
  const dataSections = new Set(["data", "TOPIC_EXPLAIN_DATA", "primaryFinding"]);
  const patternSections = new Set(["pattern", "TOPIC_EXPLAIN_PATTERN", "identified", "TOPIC_EXPLAIN_IDENTIFIED"]);
  const aSec = String(a.section || "");
  const bSec = String(b.section || "");
  if (
    (dataSections.has(aSec) && patternSections.has(bSec)) ||
    (dataSections.has(bSec) && patternSections.has(aSec))
  ) {
    return true;
  }
  if (a.surface === "topicInsightLine" && b.surface === "insights" && a.student === b.student) {
    return true;
  }
  if (
    a.surface === "subjectSummary" &&
    b.surface === "subjectRollup" &&
    a.subject === b.subject &&
    a.student === b.student
  ) {
    return true;
  }
  return false;
}

function suggestFutureAction(a, b, dupType, legitimate) {
  if (legitimate) return "keep";
  if (dupType === "exact duplicate") {
    if (a.surface !== b.surface) return "merge later";
    return "remove later";
  }
  if (dupType === "near duplicate") return "shorten later";
  if (dupType === "same idea repeated") {
    if (a.surface !== b.surface) return "move to one surface later";
    return "shorten later";
  }
  return "keep";
}

function annotateDuplicates(allRows) {
  let groupSeq = 0;
  /** @type {Map<string, object[]>} */
  const groups = new Map();

  for (let i = 0; i < allRows.length; i++) {
    for (let j = i + 1; j < allRows.length; j++) {
      const a = allRows[i];
      const b = allRows[j];
      if (!a.exactParentVisibleHebrewText || !b.exactParentVisibleHebrewText) continue;
      if (a.dataSource === "static_template" && b.dataSource === "static_template") continue;

      // Live rows: compare within same student only (cross-student template similarity is not a product duplicate).
      if (
        a.dataSource === "live" &&
        b.dataSource === "live" &&
        a.student &&
        b.student &&
        a.student !== b.student
      ) {
        const na = normalizeParentReportTextForDedupe(a.exactParentVisibleHebrewText);
        const nb = normalizeParentReportTextForDedupe(b.exactParentVisibleHebrewText);
        if (na !== nb) continue;
      }

      const dupType = classifyDuplicate(a, b);
      if (!dupType) continue;

      const legitimate = isLegitimateRepeat(a, b, dupType);
      const effectiveType = legitimate ? "legitimate repeated context" : dupType;
      const scopeKey =
        a.student && b.student && a.student === b.student
          ? `${a.student}:${a.subject || ""}:${a.topicKey || ""}:${normalizeParentReportTextForDedupe(a.detectedPattern || "")}`
          : `global:${normalizeParentReportTextForDedupe(a.exactParentVisibleHebrewText).slice(0, 40)}`;

      const groupKey = `${effectiveType}::${scopeKey}`;
      if (!groups.has(groupKey)) {
        groupSeq += 1;
        groups.set(groupKey, []);
      }
      const grp = groups.get(groupKey);
      if (!grp.some((r) => r.rowId === a.rowId)) grp.push(a);
      if (!grp.some((r) => r.rowId === b.rowId)) grp.push(b);

      const groupId = `dup_${groupSeq}`;
      for (const r of [a, b]) {
        if (!r.duplicateGroupId) r.duplicateGroupId = groupId;
        r.duplicateType = effectiveType;
        r.duplicateExplanation = legitimate
          ? `Same topic/decision context intentionally repeated across ${a.surface} and ${b.surface} (metrics vs pattern vs action layering).`
          : `Repeated message across ${a.surface}/${a.section} and ${b.surface}/${b.section}${a.detectedPattern ? `; pattern «${a.detectedPattern}»` : ""}.`;
        r.suggestedFutureAction = suggestFutureAction(a, b, dupType, legitimate);
        r.approvalNeeded = true;
        const otherId = r.rowId === a.rowId ? b.rowId : a.rowId;
        if (!r.appearsAlsoElsewhere.includes(otherId)) r.appearsAlsoElsewhere.push(otherId);
      }
    }
  }

  /** @type {object[]} */
  const duplicateFindings = [];
  for (const [key, members] of groups.entries()) {
    if (members.length < 2) continue;
    const dupType = members[0].duplicateType || key.split("::")[0];
    if (dupType === "legitimate repeated context") continue;
    duplicateFindings.push({
      duplicateGroupId: members[0].duplicateGroupId,
      duplicateType: dupType,
      subject: members.find((m) => m.subject)?.subject || null,
      topic: members.find((m) => m.displayName)?.displayName || members.find((m) => m.topicKey)?.topicKey || null,
      engineDecision: members.find((m) => m.engineDecision)?.engineDecision || null,
      detectedPattern: members.find((m) => m.detectedPattern)?.detectedPattern || null,
      surfacesInvolved: [...new Set(members.map((m) => m.surface))],
      sectionsInvolved: [...new Set(members.map((m) => `${m.surface}/${m.section}`))],
      rowIds: members.map((m) => m.rowId),
      textsInvolved: members.map((m) => ({
        rowId: m.rowId,
        surface: m.surface,
        section: m.section,
        reportTypes: m.reportTypes,
        text: m.exactParentVisibleHebrewText,
      })),
      whyDuplicated: members[0].duplicateExplanation,
      proposedFutureTreatment: members[0].suggestedFutureAction,
      approvalNeeded: true,
    });
  }

  return duplicateFindings;
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildSummary(allRows, duplicateFindings) {
  const liveRows = allRows.filter((r) => r.dataSource === "live");
  const staticRows = allRows.filter((r) => r.dataSource === "static_template");
  const subjects = new Set(allRows.map((r) => r.subject).filter(Boolean));
  const topics = new Set(allRows.map((r) => r.topicKey || r.displayName).filter(Boolean));
  const templates = new Set(allRows.map((r) => r.templateId).filter(Boolean));

  const dupCounts = { exact: 0, near: 0, idea: 0, legitimate: 0 };
  for (const r of allRows) {
    if (r.duplicateType === "exact duplicate") dupCounts.exact++;
    else if (r.duplicateType === "near duplicate") dupCounts.near++;
    else if (r.duplicateType === "same idea repeated") dupCounts.idea++;
    else if (r.duplicateType === "legitimate repeated context") dupCounts.legitimate++;
  }

  const surfaceDup = {};
  for (const d of duplicateFindings) {
    for (const s of d.surfacesInvolved) {
      surfaceDup[s] = (surfaceDup[s] || 0) + 1;
    }
  }
  const surfacesWithMostDuplication = Object.entries(surfaceDup)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([surface, count]) => ({ surface, duplicateGroupCount: count }));

  return {
    totalVisibleTextEntries: allRows.length,
    liveEntries: liveRows.length,
    staticTemplateEntries: staticRows.length,
    totalSubjectsCovered: subjects.size,
    totalTopicsCovered: topics.size,
    totalTemplates: templates.size,
    totalDuplicatedIdeas: duplicateFindings.length,
    exactDuplicates: dupCounts.exact,
    nearDuplicates: dupCounts.near,
    repeatedIdeaDuplicates: dupCounts.idea,
    legitimateRepeatedContext: dupCounts.legitimate,
    surfacesWithMostDuplication,
  };
}

function buildEngineDecisionCoverage(allRows) {
  /** @type {Map<string, object>} */
  const byDecision = new Map();
  for (const r of allRows) {
    const ed = r.engineDecision || r.subjectDecision || "(none)";
    if (!byDecision.has(ed)) {
      byDecision.set(ed, {
        engineDecision: ed,
        count: 0,
        subjects: new Set(),
        surfaces: new Set(),
        templateIds: new Set(),
        examples: [],
      });
    }
    const g = byDecision.get(ed);
    g.count++;
    if (r.subject) g.subjects.add(r.subject);
    if (r.surface) g.surfaces.add(r.surface);
    if (r.templateId) g.templateIds.add(r.templateId);
    if (g.examples.length < 3 && r.exactParentVisibleHebrewText && r.dataSource === "live") {
      g.examples.push({ rowId: r.rowId, text: r.exactParentVisibleHebrewText.slice(0, 200) });
    }
  }
  return [...byDecision.values()].map((g) => ({
    engineDecision: g.engineDecision,
    count: g.count,
    subjects: [...g.subjects],
    surfaces: [...g.surfaces],
    templateIds: [...g.templateIds],
    examples: g.examples,
  }));
}

function buildSubjectCoverage(allRows) {
  /** @type {Map<string, object>} */
  const bySubject = new Map();
  for (const r of allRows) {
    const sid = r.subject || "(cross-subject)";
    if (!bySubject.has(sid)) {
      bySubject.set(sid, {
        subject: sid,
        subjectLabelHe: r.subjectLabelHe || SUBJECT_LABEL_HE[sid] || sid,
        entryCount: 0,
        topics: new Set(),
        engineDecisions: new Set(),
        templateIds: new Set(),
        duplicateGroupIds: new Set(),
      });
    }
    const g = bySubject.get(sid);
    g.entryCount++;
    if (r.topicKey || r.displayName) g.topics.add(r.topicKey || r.displayName);
    if (r.engineDecision) g.engineDecisions.add(r.engineDecision);
    if (r.subjectDecision) g.engineDecisions.add(`subject:${r.subjectDecision}`);
    if (r.templateId) g.templateIds.add(r.templateId);
    if (r.duplicateGroupId && r.duplicateType !== "legitimate repeated context") {
      g.duplicateGroupIds.add(r.duplicateGroupId);
    }
  }
  return [...bySubject.values()].map((g) => ({
    subject: g.subject,
    subjectLabelHe: g.subjectLabelHe,
    entryCount: g.entryCount,
    topics: [...g.topics],
    engineDecisions: [...g.engineDecisions],
    templateIds: [...g.templateIds],
    duplicateGroupCount: g.duplicateGroupIds.size,
  }));
}

function buildSurfaceMap(allRows) {
  /** @type {Map<string, object>} */
  const bySurface = new Map();
  for (const r of allRows) {
    if (!bySurface.has(r.surface)) {
      const meta = SURFACE_META[r.surface] || {};
      bySurface.set(r.surface, {
        surface: r.surface,
        roleHe: meta.roleHe || r.surfaceRoleHe || "",
        reportTypes: meta.reportTypes || [],
        contractSource: meta.contractSource || "",
        entryCount: 0,
        overlapsWith: new Set(),
      });
    }
    bySurface.get(r.surface).entryCount++;
  }

  for (const r of allRows) {
    if (!r.appearsAlsoElsewhere?.length) continue;
    const g = bySurface.get(r.surface);
    if (!g) continue;
    for (const otherId of r.appearsAlsoElsewhere) {
      const other = allRows.find((x) => x.rowId === otherId);
      if (other && other.surface !== r.surface) g.overlapsWith.add(other.surface);
    }
  }

  return [...bySurface.values()].map((g) => ({
    surface: g.surface,
    roleHe: g.roleHe,
    reportTypes: g.reportTypes,
    contractSource: g.contractSource,
    entryCount: g.entryCount,
    overlapsWithOtherSurfaces: [...g.overlapsWith],
  }));
}

function buildMarkdown(report) {
  const s = report.summary;
  const lines = [
    "# Parent Report Full Visible Copy & Decision Map",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Read-only audit. **No Hebrew copy, templates, or engine logic were modified.**",
    "Live rows: OMER + Aaa7 via Supabase. Static rows: owner template fixtures + grade-aware catalog.",
    "",
    "## Summary",
    "",
    `- **total visible text entries:** ${s.totalVisibleTextEntries} (live: ${s.liveEntries}, static/template: ${s.staticTemplateEntries})`,
    `- **total subjects covered:** ${s.totalSubjectsCovered}`,
    `- **total topics covered:** ${s.totalTopicsCovered}`,
    `- **total templates:** ${s.totalTemplates}`,
    `- **total duplicated ideas (groups):** ${s.totalDuplicatedIdeas}`,
    `- **exact duplicates (row flags):** ${s.exactDuplicates}`,
    `- **near duplicates (row flags):** ${s.nearDuplicates}`,
    `- **repeated idea duplicates (row flags):** ${s.repeatedIdeaDuplicates}`,
    `- **legitimate repeated context (row flags):** ${s.legitimateRepeatedContext}`,
    `- **surfaces with most duplication:** ${s.surfacesWithMostDuplication.map((x) => `${x.surface} (${x.duplicateGroupCount})`).join(", ") || "—"}`,
    "",
    "## Report Types Covered",
    "",
    "- **דוח הורים** (`parentReportScreen`) — דף `pages/learning/parent-report.js`: diagnosticOverview, insights, subjectSummary, topicExplain",
    "- **דוח מקוצר** (`shortReport`) — PDF/תצוגה מקוצרת: subjectSummary, topicInsightLine, topicExplain",
    "- **דוח מפורט** (`detailedReport`) — subjectRollup, parentLetter, homeAction, recommendationCard, detailedNarrative, executiveSummary, crossSubjectInsights, homePlan",
    "- **קטלוג תבניות** (`templateCatalog`) — static fixtures + grade-aware templates (לא live)",
    "",
    "## Engine Decision Coverage",
    "",
    "| engineDecision | count | subjects | surfaces | templateIds (sample) | example Hebrew (live) |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of report.engineDecisionCoverage.sort((a, b) => b.count - a.count)) {
    lines.push(
      `| ${mdEscape(row.engineDecision)} | ${row.count} | ${mdEscape(row.subjects.join(", "))} | ${mdEscape(row.surfaces.join(", "))} | ${mdEscape(row.templateIds.slice(0, 4).join(", "))} | ${mdEscape(row.examples[0]?.text || "—")} |`,
    );
  }

  lines.push("", "## Subject Coverage", "");
  for (const sub of report.subjectCoverage.sort((a, b) => b.entryCount - a.entryCount)) {
    lines.push(`### ${sub.subjectLabelHe} (\`${sub.subject}\`)`);
    lines.push("");
    lines.push(`- entries: ${sub.entryCount}`);
    lines.push(`- topics: ${sub.topics.length} (${sub.topics.slice(0, 8).join(", ")}${sub.topics.length > 8 ? "…" : ""})`);
    lines.push(`- engine/subject decisions: ${sub.engineDecisions.join(", ") || "—"}`);
    lines.push(`- templates: ${sub.templateIds.length}`);
    lines.push(`- duplicate groups: ${sub.duplicateGroupCount}`);
    lines.push("");
  }

  lines.push("## Surface Map", "");
  lines.push("| surface | role | report types | contract source | entries | overlaps |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const sm of report.surfaceMap) {
    lines.push(
      `| ${sm.surface} | ${mdEscape(sm.roleHe)} | ${sm.reportTypes.join(", ")} | ${mdEscape(sm.contractSource)} | ${sm.entryCount} | ${sm.overlapsWithOtherSurfaces.join(", ") || "—"} |`,
    );
  }

  lines.push("", "## Duplicate Findings", "");
  lines.push(`See also: [parent-report-duplicate-copy-findings.md](./parent-report-duplicate-copy-findings.md)`);
  lines.push("");
  for (const d of report.duplicateFindings.slice(0, 40)) {
    lines.push(`### ${d.duplicateGroupId} — ${d.duplicateType}`);
    lines.push("");
    lines.push(`- **subject:** ${d.subject || "—"} · **topic:** ${d.topic || "—"}`);
    lines.push(`- **engineDecision:** ${d.engineDecision || "—"} · **detectedPattern:** ${d.detectedPattern || "—"}`);
    lines.push(`- **surfaces:** ${d.surfacesInvolved.join(", ")}`);
    lines.push(`- **why:** ${d.whyDuplicated}`);
    lines.push(`- **proposed:** ${d.proposedFutureTreatment} · **approvalNeeded:** true`);
    lines.push("");
  }
  if (report.duplicateFindings.length > 40) {
    lines.push(`_…and ${report.duplicateFindings.length - 40} more groups in JSON._`);
    lines.push("");
  }

  lines.push("## Full Rows", "");
  lines.push(
    "| rowId | dataSource | student | reportTypes | surface | section | subject | topic | q/c/w/acc | engineDecision | pattern | templateId | Hebrew (truncated) | dupType |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of report.fullRows) {
    const metrics = [r.questions, r.correct, r.wrong, r.accuracy != null ? `${r.accuracy}%` : ""]
      .filter((x) => x != null && x !== "")
      .join("/");
    lines.push(
      `| ${mdEscape(r.rowId)} | ${r.dataSource} | ${mdEscape(r.student || r.studentLabel || "—")} | ${r.reportTypes.join("+")} | ${r.surface} | ${mdEscape(r.section)} | ${r.subject || "—"} | ${mdEscape(r.displayName || r.topicKey || "—")} | ${metrics || "—"} | ${mdEscape(r.engineDecision || r.subjectDecision || "—")} | ${mdEscape(r.detectedPattern || "—")} | ${mdEscape(r.templateId || "—")} | ${mdEscape((r.exactParentVisibleHebrewText || "").slice(0, 80))} | ${r.duplicateType || "—"} |`,
    );
  }

  return lines.join("\n");
}

function buildDuplicateFindingsMd(report) {
  const lines = [
    "# Parent Report — Duplicate Copy Findings",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Read-only duplicate analysis for owner review. **No copy was changed.** All proposed treatments require Eran approval.",
    "",
    "## Summary",
    "",
    `- duplicate groups: **${report.duplicateFindings.length}**`,
    `- exact duplicate row flags: ${report.summary.exactDuplicates}`,
    `- near duplicate row flags: ${report.summary.nearDuplicates}`,
    `- same-idea repeated row flags: ${report.summary.repeatedIdeaDuplicates}`,
    "",
  ];

  for (const d of report.duplicateFindings) {
    lines.push(`## ${d.duplicateGroupId}`);
    lines.push("");
    lines.push(`- **duplicateType:** ${d.duplicateType}`);
    lines.push(`- **subject:** ${d.subject || "—"}`);
    lines.push(`- **topic:** ${d.topic || "—"}`);
    lines.push(`- **engineDecision:** ${d.engineDecision || "—"}`);
    lines.push(`- **detectedPattern:** ${d.detectedPattern || "—"}`);
    lines.push(`- **surfaces involved:** ${d.surfacesInvolved.join(", ")}`);
    lines.push(`- **sections:** ${d.sectionsInvolved.join(" · ")}`);
    lines.push(`- **why this is duplicated:** ${d.whyDuplicated}`);
    lines.push(`- **proposed future treatment:** ${d.proposedFutureTreatment}`);
    lines.push(`- **approvalNeeded:** true`);
    lines.push("");
    lines.push("### Texts involved");
    lines.push("");
    for (const t of d.textsInvolved) {
      lines.push(`**${t.rowId}** (${t.surface}/${t.section}, ${t.reportTypes.join("+")})`);
      lines.push("");
      lines.push("```");
      lines.push(t.text);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env — will emit static catalog only");
  }

  /** @type {object[]} */
  let liveRows = [];

  if (supabase) {
    for (const liveCase of LIVE_CASES) {
      const student = await resolveStudent(supabase, liveCase.username);
      if (!student?.id) {
        console.warn(`Student not found: ${liveCase.username} — skipping live case`);
        continue;
      }
      const fromDate = new Date(`${liveCase.from}T00:00:00.000Z`);
      const toDate = new Date(`${liveCase.to}T00:00:00.000Z`);
      const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
        includeParentActivities: true,
        includePrivateTeacherActivities: true,
      });
      reportApiBody.fromDate = liveCase.from;
      reportApiBody.toDate = liveCase.to;
      const reports = await buildReports(reportApiBody);
      if (!reports?.detailed) {
        console.warn(`Failed to build report for ${liveCase.username}`);
        continue;
      }
      const rows = collectLiveRowsForStudent({
        student: liveCase.student,
        label: liveCase.label,
        range: { from: liveCase.from, to: liveCase.to },
        base: reports.base,
        detailed: reports.detailed,
      });
      liveRows.push(...rows);
      console.log(`Live: ${rows.length} rows for ${liveCase.label}`);
    }
  }

  const staticOwnerRows = collectStaticOwnerTemplateRows();
  const gradeAwareRows = collectGradeAwareTemplateRows();
  console.log(`Static owner templates: ${staticOwnerRows.length} rows`);
  console.log(`Grade-aware catalog: ${gradeAwareRows.length} rows`);

  const allRows = [...liveRows, ...staticOwnerRows, ...gradeAwareRows];
  const duplicateFindings = annotateDuplicates(allRows);
  const summary = buildSummary(allRows, duplicateFindings);

  const report = {
    generatedAt: new Date().toISOString(),
    purpose: "parent_report_full_visible_copy_decision_map",
    constraints: [
      "no_hebrew_copy_changes",
      "no_engine_decision_changes",
      "no_metrics_changes",
      "no_template_changes",
      "mapping_only",
      "approval_needed_for_future_hebrew_changes",
    ],
    dataSources: {
      live: {
        students: LIVE_CASES.map((c) => c.student),
        note: "OMER (2025-09-01→2026-07-04) and Aaa7 (2026-07-04) — math-heavy live data; other subjects included when present in report payload.",
      },
      static_template: {
        ownerFixtures: STATIC_TOPIC_FIXTURES.map((f) => f.fixtureId),
        subjectFixtures: STATIC_SUBJECT_FIXTURES.map((f) => f.fixtureId),
        gradeAwareCatalog: "All GRADE_AWARE_RECOMMENDATION_TEMPLATES × taxonomy registry",
      },
    },
    reportTypes: ["parentReportScreen", "shortReport", "detailedReport", "templateCatalog"],
    surfaces: Object.keys(SURFACE_META),
    summary,
    engineDecisionCoverage: buildEngineDecisionCoverage(allRows),
    subjectCoverage: buildSubjectCoverage(allRows),
    surfaceMap: buildSurfaceMap(allRows),
    duplicateFindings,
    fullRows: allRows,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, buildMarkdown(report), "utf8");
  writeFileSync(OUT_DUP_MD, buildDuplicateFindingsMd(report), "utf8");

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_DUP_MD}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

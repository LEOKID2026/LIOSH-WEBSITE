#!/usr/bin/env node
/**
 * Regular parent report UI window map — read-only audit.
 * Maps pages/learning/parent-report.js as rendered to parents (NOT short PDF, NOT detailed).
 *
 * Run: node scripts/parent-report-regular-current-ui-window-map.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-regular-current-ui-window-map.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-regular-current-ui-window-map.md");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" && !Array.isArray(m.default) ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { runWithParentReportRebuildLock } = await load("lib/parent-server/db-input-to-detailed-report.server.js");
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");
const { applyParentReportGamificationOverlay } = await load("lib/learning-shared/student-account-state-view.js");
const { applyServerParentFacingAuthorityToClientReport } = await load("lib/parent-server/parent-facing-report-authority.js");
const { applyTopicEngineParentFacingInsights } = await load("utils/parent-report-engine-insights-he.js");
const { applyBridgeProvenanceToGeneratedReport } = await load("lib/learning-supabase/bridge-report-provenance.js");
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { generateParentReportV2 } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const {
  splitMoledetGeographyReportForDisplay,
  enrichDailyActivityWithVisualStrands,
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  VISUAL_STRAND_LABEL_HE,
} = await load("lib/learning-shared/moledet-geography-display.js");
const { filterSubjectOverviewRowsWithEvidence } = await load("utils/parent-report-subject-visibility.js");
const { normalizeParentVisibleMetrics } = await load(
  "utils/learning-pattern-decision/normalize-parent-practice-metrics.js",
);
const { isDuplicateParentReportText, normalizeParentReportTextForDedupe } = await load(
  "utils/parent-report-text-dedupe.js",
);
const {
  resolveParentReportWeeklyHomeActionHe,
  mergeParentReportHomeActionHe,
} = await load("lib/parent-ui/parent-report-parent-copy.js");
const {
  deriveParentDataPresenceForDiagnosticsView,
  PARENT_THIN_DATA_EXPLAINER_HE,
} = await load("utils/parent-data-presence.js");
const { diagnosticPrimarySourceParentLabelHe } = await load("utils/parent-report-language/index.js");
const { formatParentReportGradeHe, formatParentReportSubjectHe } = await load(
  "utils/parent-report-language/parent-report-display-labels.he.js",
);
const { shortReportDiagnosticsParentVisibleHe: diagnosticParentVisibleTextHe } = await load(
  "utils/parent-report-ui-explain-he.js",
);
const { resolveParentExplainRowCopy } = await load("utils/learning-pattern-decision/index.js");
const sitePoliciesMod = await import(u("data/legal/sitePolicies.he.js"));
const PARENT_REPORT_DISCLAIMER_TITLE_HE = sitePoliciesMod.PARENT_REPORT_DISCLAIMER_TITLE_HE;
const PARENT_REPORT_DISCLAIMER_PARAGRAPHS_HE = sitePoliciesMod.PARENT_REPORT_DISCLAIMER_PARAGRAPHS_HE;

const LIVE_CASES = [
  { student: "omer", username: "omer", from: "2025-09-01", to: "2026-07-04", label: "OMER" },
  { student: "aaa7", username: "aaa7", from: "2026-07-04", to: "2026-07-04", label: "Aaa7" },
];

const PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX = 14;
const PATTERN_DIAGNOSTIC_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
  "hebrew",
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
];

const SUBJECT_CHART_COLORS = {
  math: "#3b82f6",
  geometry: "#10b981",
  english: "#a855f7",
  science: "#22c55e",
  history: "#f59e0b",
  hebrew: "#f97316",
  moledet: "#06b6d4",
  geography: "#14b8a6",
};

const TOPIC_BAR_SUBJECT_CARDS = [
  { title: "מתמטיקה — דיוק לפי נושא", mapKey: "mathOperations", prefix: "math_" },
  { title: "גאומטריה — דיוק לפי נושא", mapKey: "geometryTopics", prefix: "geometry_" },
  { title: "אנגלית — דיוק לפי נושא", mapKey: "englishTopics", prefix: "english_" },
  { title: "מדעים — דיוק לפי נושא", mapKey: "scienceTopics", prefix: "science_" },
  { title: "היסטוריה — דיוק לפי נושא", mapKey: "historyTopics", prefix: "history_" },
  { title: "עברית — דיוק לפי נושא", mapKey: "hebrewTopics", prefix: "hebrew_" },
  {
    title: `${VISUAL_STRAND_LABEL_HE.moledet} — דיוק לפי נושא`,
    mapKey: "_visualMoledetTopics",
    prefix: "moledet_geography_",
  },
  {
    title: `${VISUAL_STRAND_LABEL_HE.geography} — דיוק לפי נושא`,
    mapKey: "_visualGeographyTopics",
    prefix: "moledet_geography_",
  },
];

const PROGRESS_TABLE_CONFIG = [
  { key: "mathOperations", title: "🧮 התקדמות במתמטיקה", labelCol: "פעולה" },
  { key: "geometryTopics", title: "📐 התקדמות בגאומטריה", labelCol: "נושא" },
  { key: "englishTopics", title: "📘 התקדמות באנגלית", labelCol: "נושא" },
  { key: "scienceTopics", title: "🔬 התקדמות במדעים", labelCol: "נושא" },
  { key: "hebrewTopics", title: "📚 התקדמות בעברית", labelCol: "נושא" },
  { key: "_visualMoledetTopics", title: `🏠 התקדמות ב${VISUAL_STRAND_LABEL_HE.moledet}`, labelCol: "נושא" },
  { key: "_visualGeographyTopics", title: `🗺️ התקדמות ב${VISUAL_STRAND_LABEL_HE.geography}`, labelCol: "נושא" },
];

const SUBJECT_OVERVIEW_UI = {
  math: { emoji: "🧮", name: "מתמטיקה" },
  geometry: { emoji: "📐", name: "גאומטריה" },
  english: { emoji: "📘", name: "אנגלית" },
  science: { emoji: "🔬", name: "מדעים" },
  history: { emoji: "🏛️", name: "היסטוריה" },
  hebrew: { emoji: "📚", name: "עברית" },
  moledet: { emoji: "🏠", name: VISUAL_STRAND_LABEL_HE.moledet },
  geography: { emoji: "🗺️", name: VISUAL_STRAND_LABEL_HE.geography },
};

function sumTopicMapMinutes(map) {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((acc, d) => acc + (Number(d?.timeMinutes) || 0), 0);
}

function subjectPracticeSecondaryLineHe(questions, correct, accuracy, timeMinutes) {
  const metrics = normalizeParentVisibleMetrics({ questions, correct, accuracy });
  const q = metrics.questions;
  const tm = Number(timeMinutes) || 0;
  if (q > 0) return `${metrics.correct} נכון • ${metrics.accuracy}% דיוק`;
  if (tm > 0) return `${tm} דק׳ תרגול`;
  return null;
}

function buildSubjectOverviewRows(report) {
  if (!report?.summary) return [];
  const s = report.summary;
  const mgVisual = splitMoledetGeographyReportForDisplay(report);
  function subjectRow(key, name, minutes, q, correct, acc) {
    const metrics = normalizeParentVisibleMetrics({
      questions: Number(q) || 0,
      correct: correct != null ? Number(correct) : undefined,
      accuracy: Math.round(Number(acc) || 0),
    });
    return { key, name, minutes, questions: metrics.questions, correct: metrics.correct, accuracy: metrics.accuracy };
  }
  return [
    subjectRow("math", "מתמטיקה", sumTopicMapMinutes(report.mathOperations), s.mathQuestions, s.mathCorrect, s.mathAccuracy),
    subjectRow("geometry", "גאומטריה", sumTopicMapMinutes(report.geometryTopics), s.geometryQuestions, s.geometryCorrect, s.geometryAccuracy),
    subjectRow("english", "אנגלית", sumTopicMapMinutes(report.englishTopics), s.englishQuestions, s.englishCorrect, s.englishAccuracy),
    subjectRow("science", "מדעים", sumTopicMapMinutes(report.scienceTopics), s.scienceQuestions, s.scienceCorrect, s.scienceAccuracy),
    subjectRow("history", "היסטוריה", sumTopicMapMinutes(report.historyTopics), s.historyQuestions, s.historyCorrect, s.historyAccuracy),
    subjectRow("hebrew", "עברית", sumTopicMapMinutes(report.hebrewTopics), s.hebrewQuestions, s.hebrewCorrect, s.hebrewAccuracy),
    subjectRow("moledet", VISUAL_STRAND_LABEL_HE.moledet, mgVisual.moledetStats.minutes, mgVisual.moledetStats.questions, mgVisual.moledetStats.correct, mgVisual.moledetStats.accuracy),
    subjectRow("geography", VISUAL_STRAND_LABEL_HE.geography, mgVisual.geographyStats.minutes, mgVisual.geographyStats.questions, mgVisual.geographyStats.correct, mgVisual.geographyStats.accuracy),
  ];
}

function augmentReportWithVisualMgSplit(report) {
  const split = splitMoledetGeographyReportForDisplay(report);
  return { ...report, _visualMoledetTopics: split.moledetTopics, _visualGeographyTopics: split.geographyTopics };
}

function buildTopicRowsForChart(map, keyPrefix) {
  const rows = Object.entries(map || {}).map(([k, data]) => {
    const label = String(data?.narrativeTopicLabelHe || data?.displayName || k).trim();
    const metrics =
      data?.parentVisibleMetrics && typeof data.parentVisibleMetrics === "object"
        ? data.parentVisibleMetrics
        : normalizeParentVisibleMetrics(data || {});
    return {
      rowKey: `${keyPrefix}_${k}`,
      label,
      accuracy: metrics.accuracy,
      questions: metrics.questions,
      gradeKey: data?.gradeKey || data?.grade,
      topicEngineRowSignals: data?.topicEngineRowSignals,
      trend: data?.trend,
      learningPatternDecision: data?.learningPatternDecision,
    };
  });
  rows.sort((a, b) => b.questions - a.questions || String(a.label).localeCompare(String(b.label), "he"));
  return rows;
}

function buildParentReportDiagnosticsView(report) {
  if (report?._parentFacingAuthority === "server") {
    const legacyRecommendations = [];
    return {
      mode: "new",
      rows: [],
      legacyRecommendations,
      presence: deriveParentDataPresenceForDiagnosticsView(report, {
        mode: "new",
        rows: [],
        legacyRecommendations,
      }),
    };
  }
  const legacy = Array.isArray(report?.analysis?.recommendations) ? report.analysis.recommendations : [];
  const subjects = report?.patternDiagnostics?.subjects;
  const primarySource = String(report?.diagnosticPrimarySource || "");
  const allowLegacyFallback = primarySource === "legacy_patternDiagnostics_fallback" || !primarySource;
  const hasSubjects = subjects && typeof subjects === "object" && !Array.isArray(subjects);
  if (!hasSubjects) {
    const mode = allowLegacyFallback && legacy.length ? "legacy" : "insufficient";
    return {
      mode,
      rows: [],
      legacyRecommendations: allowLegacyFallback ? legacy : [],
      presence: deriveParentDataPresenceForDiagnosticsView(report, { mode, rows: [], legacyRecommendations: allowLegacyFallback ? legacy : [] }),
    };
  }
  const pdVersion = Number(report?.patternDiagnostics?.version) || 0;
  let hasGlobalSignal = false;
  const normalizedSubjects = {};
  for (const id of PATTERN_DIAGNOSTIC_SUBJECT_ORDER) {
    const raw = subjects[id];
    if (!raw) continue;
    const isV2OrHasWeaknesses = pdVersion >= 2 || Array.isArray(raw.weaknesses);
    if (!isV2OrHasWeaknesses) {
      normalizedSubjects[id] = { ...raw, hasAnySignal: false };
      continue;
    }
    normalizedSubjects[id] = raw;
    if (raw?.hasAnySignal) hasGlobalSignal = true;
  }
  if (!hasGlobalSignal) {
    const legacyRecommendations = allowLegacyFallback ? legacy : [];
    return {
      mode: "insufficient",
      rows: [],
      legacyRecommendations,
      presence: deriveParentDataPresenceForDiagnosticsView(report, { mode: "insufficient", rows: [], legacyRecommendations }),
    };
  }
  const rows = [];
  for (const id of PATTERN_DIAGNOSTIC_SUBJECT_ORDER) {
    const sub = normalizedSubjects[id];
    if (!sub || !sub.hasAnySignal) continue;
    rows.push({ subjectId: id, subjectLabelHe: formatParentReportSubjectHe(sub.subjectLabelHe || id), sub });
  }
  const legacyRecommendations = allowLegacyFallback ? legacy : [];
  return {
    mode: "new",
    rows,
    legacyRecommendations,
    presence: deriveParentDataPresenceForDiagnosticsView(report, { mode: "new", rows, legacyRecommendations }),
  };
}

function readAiStructured(explanation) {
  const s = explanation?.structured;
  if (!s || typeof s !== "object") return null;
  const summary = typeof s.summary === "string" ? s.summary.trim() : "";
  const cautionNote = typeof s.cautionNote === "string" ? s.cautionNote.trim() : "";
  const strengths = (Array.isArray(s.strengths) ? s.strengths : []).map((x) => (typeof x === "string" ? x : x?.textHe || "")).filter(Boolean);
  const focusAreas = (Array.isArray(s.focusAreas) ? s.focusAreas : []).map((x) => (typeof x === "string" ? x : x?.textHe || "")).filter(Boolean);
  const homeTips = (Array.isArray(s.homeTips) ? s.homeTips : []).map((x) => String(x || "").trim()).filter(Boolean);
  if (!summary && !strengths.length && !focusAreas.length && !homeTips.length && !cautionNote) return null;
  return { summary, strengths, focusAreas, homeTips, cautionNote };
}

function extractTopicExplainVisibleText(row) {
  const q = Number(row?.questions) || 0;
  if (q <= 0) return [];
  const lpdCopy = resolveParentExplainRowCopy(row);
  const lines = [`[נושא] ${row.label}`];
  if (lpdCopy.primaryFinding) lines.push(`מה ראינו: ${lpdCopy.primaryFinding}`);
  const sec = lpdCopy.explainSections;
  if (sec) {
    for (const part of [sec.identified, sec.data, sec.pattern, sec.meaning, sec.action]) {
      if (part) lines.push(part);
    }
  }
  const sig = row.topicEngineRowSignals;
  if (sig?.doNowHe) lines.push(`עכשיו: ${String(sig.doNowHe)}`);
  if (sig?.avoidNowHe) lines.push(`להימנע: ${String(sig.avoidNowHe)}`);
  if (sig?.cautionLineHe) lines.push(`זהירות: ${String(sig.cautionLineHe)}`);
  return lines;
}

function makeWindow(p) {
  return {
    windowOrder: p.windowOrder,
    windowId: p.windowId || null,
    parentVisibleTitle: p.parentVisibleTitle || null,
    parentVisibleSubtitles: p.parentVisibleSubtitles || [],
    exactVisibleText: p.exactVisibleText || [],
    component: p.component || null,
    sourceFile: p.sourceFile || null,
    sourceField: p.sourceField || null,
    dataSource: p.dataSource || "mixed",
    renderCondition: p.renderCondition || null,
    subjectLevelOrTopicLevel: p.subjectLevelOrTopicLevel || "general",
    gradeDisplayRule: p.gradeDisplayRule || null,
    sampleStudent: p.sampleStudent || null,
    rendered: p.rendered !== false,
    repeatedInsideRegularReport: p.repeatedInsideRegularReport || [],
    notes: p.notes || null,
  };
}

function collectDiagnosticsSubjectTexts(row, serverHomeRecs) {
  const s = row.sub;
  const texts = [];
  const subtitles = [];
  if (s.summaryHe) texts.push(diagnosticParentVisibleTextHe(s.summaryHe));
  if (Array.isArray(s.diagnosticCards)) {
    subtitles.push("ממה שתורגל:");
    for (const card of s.diagnosticCards) {
      if (card.labelHe) texts.push(diagnosticParentVisibleTextHe(card.labelHe));
      if (Array.isArray(card.evidence)) texts.push(...card.evidence.map((l) => diagnosticParentVisibleTextHe(l)));
      if (card.recommendationHe) texts.push(`מה לעשות: ${diagnosticParentVisibleTextHe(card.recommendationHe)}`);
    }
  }
  if (s.subjectDoNowHe) texts.push(`עכשיו: ${diagnosticParentVisibleTextHe(s.subjectDoNowHe)}`);
  if (s.subjectAvoidNowHe) texts.push(`להימנע: ${diagnosticParentVisibleTextHe(s.subjectAvoidNowHe)}`);
  const parentHomeActionHe = mergeParentReportHomeActionHe({ parentActionHe: s.parentActionHe, parImp: s.parentRecommendationsImprove });
  if (parentHomeActionHe && !serverHomeRecs.some((rec) => isDuplicateParentReportText(parentHomeActionHe, rec))) {
    subtitles.push("מה אפשר לעשות בבית");
    texts.push(parentHomeActionHe);
  }
  if (s.nextWeekGoalHe) {
    subtitles.push("יעדים לשבוע הקרוב");
    texts.push(diagnosticParentVisibleTextHe(s.nextWeekGoalHe));
  }
  for (const w of s.topWeaknesses || s.weaknesses || []) {
    if (w.labelHe) texts.push(diagnosticParentVisibleTextHe(w.labelHe));
  }
  for (const st of s.topStrengths || s.strengths || []) {
    if (st.labelHe) texts.push(`${diagnosticParentVisibleTextHe(st.labelHe)} — דיוק ${st.accuracy}%`);
  }
  return { texts, subtitles };
}

function mapRegularReportWindows(ctx) {
  const { report, shortContractTop, sampleStudent, range } = ctx;
  const windows = [];
  let order = 0;
  const nextOrder = () => {
    order += 1;
    return order;
  };

  const push = (p) => windows.push(makeWindow({ ...p, windowOrder: p.windowOrder ?? nextOrder(), sampleStudent }));

  const diagnosticsView = buildParentReportDiagnosticsView(report);
  const hasServerHomeRecommendations =
    Array.isArray(report?.parentFacing?.homeRecommendations) &&
    report.parentFacing.homeRecommendations.filter(Boolean).length > 0;
  const serverHomeRecommendationsListHe = hasServerHomeRecommendations
    ? report.parentFacing.homeRecommendations.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const weeklyHomeActionHe = resolveParentReportWeeklyHomeActionHe({ shortContractTop, report, diagnosticsView });
  const showWeeklyInShortContract = !hasServerHomeRecommendations;
  const firstServerHomeRecommendationHe = serverHomeRecommendationsListHe[0] || null;
  const weeklyHomeActionAlreadyShownElsewhere =
    weeklyHomeActionHe &&
    (!hasServerHomeRecommendations ||
      isDuplicateParentReportText(weeklyHomeActionHe, firstServerHomeRecommendationHe));
  const showWeeklyInDiagnosticOverview =
    Boolean(report?.summary?.diagnosticOverviewHe) && !weeklyHomeActionAlreadyShownElsewhere;
  const hasRawMetricStrengthsHe =
    (Array.isArray(report?.rawMetricStrengthsHe) && report.rawMetricStrengthsHe.filter(Boolean).length > 0) ||
    (Array.isArray(report?.summary?.rawMetricStrengthsHe) && report.summary.rawMetricStrengthsHe.filter(Boolean).length > 0);
  const suppressChartsForThinEvidenceWindow =
    Number(report?.summary?.totalQuestions) > 0 &&
    Number(report.summary.totalQuestions) <= PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX;
  const dailyActivityVisual = enrichDailyActivityWithVisualStrands(report.dailyActivity, report);
  const augmented = augmentReportWithVisualMgSplit(report);
  const insights = report?.parentFacing?.insights?.filter(Boolean) || [];
  const teacherMessages = (report?.parentFacing?.teacherMessages || []).filter((m) => !m.isHidden);
  const diag = report.summary?.diagnosticOverviewHe;

  // Header
  push({
    windowId: "page_header",
    parentVisibleTitle: "📊 דוח להורים",
    parentVisibleSubtitles: [report.playerName, `${range.from} - ${range.to}`],
    exactVisibleText: [`📊 דוח להורים`, report.playerName, `${report.startDate} - ${report.endDate}`],
    component: "ParentReport page header",
    sourceFile: "pages/learning/parent-report.js",
    sourceField: "report.playerName, report.startDate, report.endDate",
    dataSource: "child_report_metadata",
    renderCondition: "report loaded",
    subjectLevelOrTopicLevel: "general",
    gradeDisplayRule: "no grade in header",
    notes: "Period preset controls and 'דוח מקיף לתקופה' link are no-pdf UI chrome on site.",
  });

  // Summary stats
  const summaryCards = [
    { title: "זמן כולל", main: `${report.summary.totalTimeMinutes} דק'`, sub: `(${report.summary.totalTimeHours} שעות)` },
    { title: "שאלות", main: String(report.summary.totalQuestions), sub: `${report.summary.totalCorrect} נכון` },
    { title: "דיוק כללי", main: `${report.summary.overallAccuracy}%`, sub: null },
    { title: "רמה", main: `רמה ${report.summary.playerLevel}`, sub: `⭐ ${report.summary.stars} • 🏆 ${report.summary.achievements}` },
  ];
  for (const card of summaryCards) {
    push({
      windowId: `summary_stat_${card.title}`,
      parentVisibleTitle: card.title,
      exactVisibleText: [card.main, card.sub].filter(Boolean),
      component: "summary stats grid card",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: `report.summary.* (${card.title})`,
      dataSource: "child_aggregated_metrics",
      renderCondition: "always when report.summary exists",
      subjectLevelOrTopicLevel: "general",
      gradeDisplayRule: "no grade",
    });
  }

  // Data health
  const thinEvidence = Array.isArray(diag?.thinEvidenceSubjectsHe) ? diag.thinEvidenceSubjectsHe.filter(Boolean) : [];
  const dataQualityNoteHe = report.summary?.activityGapNoteHe || null;
  const mixedGradeNoteHe = report?.gradePracticeMeta?.mixedGradePracticeNoteHe || null;
  const hasDataHealth = thinEvidence.length > 0 || dataQualityNoteHe || mixedGradeNoteHe;
  if (hasDataHealth) {
    const texts = [];
    if (thinEvidence.length) texts.push(`נתונים מצומצמים במקצועות: ${thinEvidence.join(" · ")}`);
    if (dataQualityNoteHe) texts.push(dataQualityNoteHe);
    if (mixedGradeNoteHe) texts.push(mixedGradeNoteHe);
    push({
      windowId: "data_health_note",
      parentVisibleTitle: "מצב הנתונים בדוח",
      exactVisibleText: texts,
      component: "ParentReportDataHealthNote",
      sourceFile: "components/parent/ParentReportDataHealthNote.jsx",
      sourceField: "diagnosticOverviewHe.thinEvidenceSubjectsHe, summary.activityGapNoteHe, gradePracticeMeta.mixedGradePracticeNoteHe",
      dataSource: "child_report_payload",
      renderCondition: "thinEvidenceSubjectsHe.length > 0 || activityGapNoteHe || mixedGradePracticeNoteHe",
      subjectLevelOrTopicLevel: "subject-level list when thinEvidenceSubjectsHe present",
      gradeDisplayRule: "mixedGradePracticeNoteHe mentions mixed grades when applicable",
      notes: "notPracticedSubjectsSummaryHe exists in payload but is NOT rendered in this component.",
    });
  }

  // Short contract
  if (!hasServerHomeRecommendations) {
    const scTexts = [];
    const scSubs = [];
    if (showWeeklyInShortContract && weeklyHomeActionHe) {
      scSubs.push("מה לעשות השבוע:");
      scTexts.push(`מה לעשות השבוע: ${weeklyHomeActionHe}`);
    }
    if (shortContractTop?.mainStatusHe) scTexts.push(`מצב: ${shortContractTop.mainStatusHe}`);
    if (shortContractTop?.mainPriorityHe) scTexts.push(`מה חשוב קודם: ${shortContractTop.mainPriorityHe}`);
    if (shortContractTop?.doNowHe) scTexts.push(`מה עושים עכשיו: ${shortContractTop.doNowHe}`);
    const scRendered = scTexts.length > 0;
    if (scRendered) {
      push({
        windowId: "short_contract_preview",
        parentVisibleTitle: "סיכום קצר להורה",
        parentVisibleSubtitles: scSubs,
        exactVisibleText: scTexts,
        component: "ParentReportShortContractPreview / ParentReportWeeklyHomeActionLine",
        sourceFile: "components/parent-report-short-contract-preview.jsx",
        sourceField: "shortContractTop.*, resolveParentReportWeeklyHomeActionHe()",
        dataSource: "detailed.parentProductContractV1.top + report.parentFacing + diagnosticsView",
        renderCondition: "!hasServerHomeRecommendations && (weekly || shortContractTop fields)",
        subjectLevelOrTopicLevel: "general action line",
        gradeDisplayRule: "no grade",
        notes: "'מה לעשות השבוע:' is an inline label prefix inside this card, NOT a separate window.",
      });
    }
  }

  // Diagnostic overview — מה הכי בולט עכשיו
  if (diag) {
    const doTexts = [];
    const doSubs = [];
    if (showWeeklyInDiagnosticOverview && weeklyHomeActionHe) {
      doSubs.push("מה לעשות השבוע:");
      doTexts.push(`מה לעשות השבוע: ${weeklyHomeActionHe}`);
    }
    if (diag.practicedSubjectsSummaryHe) doTexts.push(diag.practicedSubjectsSummaryHe);
    if (!shortContractTop && diag.mainFocusAreaLineHe) {
      const prefix = diag.mainFocusAreaIsHighAccuracy ? "למעקב: " : "כדאי לשים לב עכשיו: ";
      doSubs.push(prefix.trim());
      doTexts.push(`${prefix}${diag.mainFocusAreaLineHe}`);
    } else if (!shortContractTop) {
      const fallback =
        Number(report.summary?.totalQuestions) > 0 && diagnosticsView?.presence?.state === "hasVolumeNoPattern"
          ? "יש נתוני תרגול בתקופה שנבחרה, אך עדיין אין מספיק בסיס ברור מהתרגולים כדי לראות לאיזה נושא כדאי להתמקד — כדאי להמשיך בתרגול ולעקוב שוב לאחר מכן."
          : "אין עדיין תחום שכדאי לשים לב עכשיו בתקופה שנבחרה.";
      doTexts.push(fallback);
    }
    if (diag.strongestAreaLineHe && !hasRawMetricStrengthsHe) {
      doTexts.push(`תוצאות טובות — כדאי להמשיך לחזק: ${diag.strongestAreaLineHe}`);
    }
    if (diag.readyForProgressPreviewHe?.length) {
      doTexts.push(`אפשר לחזק שלב נוסף: ${diag.readyForProgressPreviewHe.join(" · ")}`);
    }
    if (diag.requiresAttentionPreviewHe?.length) {
      doTexts.push(`עוד נושאים למעקב: ${diag.requiresAttentionPreviewHe.join(" · ")}`);
    }
    push({
      windowId: "diagnostic_overview",
      parentVisibleTitle: "מה הכי בולט עכשיו",
      parentVisibleSubtitles: doSubs,
      exactVisibleText: doTexts,
      component: "inline div in parent-report.js",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.summary.diagnosticOverviewHe.* + ParentReportWeeklyHomeActionLine when showWeeklyInDiagnosticOverview",
      dataSource: "buildDiagnosticOverviewHeV2 + resolveParentReportWeeklyHomeActionHe",
      renderCondition: "report.summary.diagnosticOverviewHe truthy",
      subjectLevelOrTopicLevel: "mixed — subject summaries and topic previews",
      gradeDisplayRule: "no explicit grade column; topic names may embed grade",
      notes: showWeeklyInDiagnosticOverview
        ? "'מה לעשות השבוע' appears HERE as inline label when not shown in short contract and not duplicate of home recs."
        : hasServerHomeRecommendations
          ? "Weekly line suppressed here when duplicate of first homeRecommendations item."
          : "Weekly line shown in short contract instead.",
    });
  }

  // Parent sections
  if (insights.length) {
    push({
      windowId: "parent_insights",
      parentVisibleTitle: "מה חשוב לדעת",
      exactVisibleText: insights,
      component: "ParentReportParentSections",
      sourceFile: "components/parent/ParentReportParentSections.jsx",
      sourceField: "report.parentFacing.insights",
      dataSource: "server_parent_facing",
      renderCondition: "parentFacing.insights.length > 0",
      subjectLevelOrTopicLevel: "general",
    });
  }
  if (teacherMessages.length) {
    push({
      windowId: "parent_teacher_messages",
      parentVisibleTitle: "הודעות מהמורה",
      exactVisibleText: teacherMessages.map((m) => m.message),
      component: "ParentReportParentSections",
      sourceFile: "components/parent/ParentReportParentSections.jsx",
      sourceField: "report.parentFacing.teacherMessages",
      dataSource: "teacher_messages",
      renderCondition: "active teacherMessages.length > 0",
      subjectLevelOrTopicLevel: "general",
    });
  }
  if (hasServerHomeRecommendations) {
    push({
      windowId: "parent_home_recommendations",
      parentVisibleTitle: "מה מומלץ לעשות בבית",
      exactVisibleText: serverHomeRecommendationsListHe,
      component: "ParentReportParentSections",
      sourceFile: "components/parent/ParentReportParentSections.jsx",
      sourceField: "report.parentFacing.homeRecommendations",
      dataSource: "server_parent_facing",
      renderCondition: "homeRecommendations.length > 0",
      subjectLevelOrTopicLevel: "general recommendations",
      notes: "When present, short contract preview is hidden entirely.",
    });
  }

  // Strengths
  const strengthLines = report.rawMetricStrengthsHe || report.summary?.rawMetricStrengthsHe || [];
  if (strengthLines.length) {
    push({
      windowId: "raw_metric_strengths",
      parentVisibleTitle: "חוזקות שבלטו בתרגול",
      exactVisibleText: strengthLines,
      component: "inline div",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.rawMetricStrengthsHe || report.summary.rawMetricStrengthsHe",
      dataSource: "child_metrics",
      renderCondition: "rawMetricStrengthsHe array non-empty",
      subjectLevelOrTopicLevel: "topic-level lines",
    });
  }

  // Subject overview cards
  const overviewRows = filterSubjectOverviewRowsWithEvidence(buildSubjectOverviewRows(report));
  for (const row of overviewRows) {
    const ui = SUBJECT_OVERVIEW_UI[row.key] || SUBJECT_OVERVIEW_UI.math;
    const secondary = subjectPracticeSecondaryLineHe(row.questions, row.correct, row.accuracy, row.minutes);
    const mainStat = row.questions > 0 ? `${row.questions} שאלות` : `${row.minutes} דק׳`;
    push({
      windowId: `subject_overview_${row.key}`,
      parentVisibleTitle: `${ui.emoji} ${row.name}`,
      exactVisibleText: [mainStat, secondary].filter(Boolean),
      component: "subject overview grid card",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "buildSubjectOverviewRows(report) filtered",
      dataSource: "child_subject_aggregates",
      renderCondition: "subject has evidence in selected period",
      subjectLevelOrTopicLevel: "subject-level",
      gradeDisplayRule: "no grade on card",
    });
  }

  // AI insight
  const aiExp = report.parentAiExplanation;
  if (aiExp?.ok) {
    const structured = readAiStructured(aiExp);
    const fallbackText = typeof aiExp.text === "string" ? aiExp.text.trim() : "";
    if (structured || fallbackText) {
      const heading = structured ? "סיכום חכם להורה" : "תובנה להורה";
      const aiTexts = [];
      const aiSubs = [];
      if (structured) {
        if (structured.summary) aiTexts.push(structured.summary);
        if (structured.strengths.length) {
          aiSubs.push("מה הולך טוב");
          aiTexts.push(...structured.strengths);
        }
        if (structured.focusAreas.length) {
          aiSubs.push("תחומים לחיזוק");
          aiTexts.push(...structured.focusAreas);
        }
        const filteredTips = structured.homeTips.filter(
          (tip) => !serverHomeRecommendationsListHe.some((rec) => isDuplicateParentReportText(tip, rec)),
        );
        if (filteredTips.length) {
          aiSubs.push("טיפים לבית");
          aiTexts.push(...filteredTips);
        }
        if (structured.cautionNote) aiTexts.push(structured.cautionNote);
      } else {
        aiTexts.push(fallbackText);
      }
      push({
        windowId: "parent_ai_insight",
        parentVisibleTitle: heading,
        parentVisibleSubtitles: aiSubs,
        exactVisibleText: aiTexts,
        component: "ParentReportInsight",
        sourceFile: "components/ParentReportInsight.jsx",
        sourceField: "report.parentAiExplanation",
        dataSource: "ai_or_deterministic_narrative",
        renderCondition: "parentAiExplanation.ok && has content after dedupe",
        subjectLevelOrTopicLevel: "general narrative",
      });
    }
  }

  // Progress tables
  const augForTables = augmentReportWithVisualMgSplit(report);
  for (const cfg of PROGRESS_TABLE_CONFIG) {
    const map = augForTables[cfg.key];
    if (!map || !Object.keys(map).length) continue;
    const rowSamples = Object.entries(map)
      .sort(([, a], [, b]) => (Number(b.questions) || 0) - (Number(a.questions) || 0))
      .slice(0, 8)
      .map(([k, data]) => {
        const label = String(data.displayName || data.narrativeTopicLabelHe || k).trim();
        const grade = formatParentReportGradeHe(data.gradeKey || data.grade);
        return `${label} | כיתה: ${grade} | ${data.questions} שאלות | ${data.accuracy}%`;
      });
    const gradesShown = [
      ...new Set(
        Object.values(map)
          .map((d) => formatParentReportGradeHe(d.gradeKey || d.grade))
          .filter(Boolean),
      ),
    ];
    push({
      windowId: `progress_table_${cfg.key}`,
      parentVisibleTitle: cfg.title,
      parentVisibleSubtitles: ["פעולה/נושא", "רמה", "כיתה", "מקור", "תאריך אחרון", "זמן", "שאלות", "נכון", "דיוק", "סטטוס"],
      exactVisibleText: rowSamples,
      component: "subject progress table",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: `report.${cfg.key}.*`,
      dataSource: "child_topic_rows",
      renderCondition: `Object.keys(report.${cfg.key}).length > 0`,
      subjectLevelOrTopicLevel: "topic-level rows within subject table",
      gradeDisplayRule: "per-row formatParentReportGradeHe(data.gradeKey || data.grade) — child's practice grade per topic",
      notes: `Grades in this table: ${gradesShown.join(", ") || "none"}. Rows can mix grades within same subject.`,
    });
  }

  // Recommendations block
  const recVisible =
    diagnosticsView &&
    (diagnosticsView.mode === "insufficient" ||
      diagnosticsView.mode === "new" ||
      (diagnosticsView.mode === "legacy" && diagnosticsView.legacyRecommendations.length > 0));
  if (recVisible) {
    const sourceLabel = diagnosticPrimarySourceParentLabelHe(String(report?.diagnosticPrimarySource || ""));
    if (diagnosticsView.mode === "legacy") {
      push({
        windowId: "recommendations_legacy",
        parentVisibleTitle: "💡 המלצות",
        parentVisibleSubtitles: [sourceLabel],
        exactVisibleText: diagnosticsView.legacyRecommendations.map((r) => `${r.operationName}: ${r.message}`),
        component: "recommendations legacy cards",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "report.analysis.recommendations",
        dataSource: "legacy_analysis",
        renderCondition: "diagnosticsView.mode === legacy",
        subjectLevelOrTopicLevel: "topic/operation level",
      });
    } else if (
      diagnosticsView.mode === "insufficient" ||
      (diagnosticsView.mode === "new" && diagnosticsView.rows.length === 0)
    ) {
      const explainer =
        diagnosticsView.presence?.recommendationsExplainerHe ||
        (Number(report.summary?.totalQuestions) > 0
          ? PARENT_THIN_DATA_EXPLAINER_HE
          : "עדיין אין מספיק נתונים לתמונה ברורה מהתרגולים");
      push({
        windowId: "recommendations_insufficient",
        parentVisibleTitle: "💡 המלצות",
        parentVisibleSubtitles: [sourceLabel],
        exactVisibleText: [explainer],
        component: "recommendations insufficient explainer",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "diagnosticsView.presence.recommendationsExplainerHe",
        dataSource: "presence_derived",
        renderCondition: "diagnostics mode insufficient OR new with empty rows (e.g. server authority)",
        subjectLevelOrTopicLevel: "general",
        notes: report._parentFacingAuthority === "server" ? "Server authority forces empty diagnostic rows." : null,
      });
    } else {
      push({
        windowId: "recommendations_header",
        parentVisibleTitle: "💡 המלצות",
        parentVisibleSubtitles: [sourceLabel],
        exactVisibleText: [],
        component: "recommendations section header",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "diagnosticPrimarySourceParentLabelHe",
        renderCondition: "diagnosticsView.mode === new && rows.length > 0",
        subjectLevelOrTopicLevel: "section header",
      });
      for (const row of diagnosticsView.rows) {
        const { texts, subtitles } = collectDiagnosticsSubjectTexts(row, serverHomeRecommendationsListHe);
        push({
          windowId: `recommendations_subject_${row.subjectId}`,
          parentVisibleTitle: row.subjectLabelHe,
          parentVisibleSubtitles: subtitles,
          exactVisibleText: texts,
          component: "parent-report-diagnostic-subject-block",
          sourceFile: "pages/learning/parent-report.js",
          sourceField: "patternDiagnostics.subjects[id].*",
          dataSource: "pattern_diagnostics_v2",
          renderCondition: "sub.hasAnySignal",
          subjectLevelOrTopicLevel: "subject block with topic-level items",
          gradeDisplayRule: "topic labels may include grade; no separate grade column",
          notes:
            row.subjectLabelHe === "לא ידוע"
              ? `Rendered title comes from formatParentReportSubjectHe(sub.subjectLabelHe || id); subjectId=${row.subjectId}. Parent sees literal "לא ידוע" when Hebrew subjectLabelHe is passed first.`
              : null,
        });
      }
    }
  }

  // Graphs
  if (suppressChartsForThinEvidenceWindow) {
    push({
      windowId: "graphs_thin_evidence",
      parentVisibleTitle: "מעט שאלות בתקופה שנבחרה",
      exactVisibleText: [
        "מספר השאלות בתקופה שנבחרה נמוך מדי כדי להציג כאן גרפים או טבלאות בעלי משמעות ברורה.",
        "מומלץ להסתמך על הסיכום וההסברים למעלה, ולהמשיך בתרגול כדי לצבור תמונה ברורה יותר.",
      ],
      component: "graph section thin-evidence card",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "static copy + suppressChartsForThinEvidenceWindow",
      dataSource: "static_template",
      renderCondition: `0 < totalQuestions <= ${PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX}`,
      subjectLevelOrTopicLevel: "general",
    });
  } else {
    if (dailyActivityVisual.length > 0) {
      push({
        windowId: "chart_daily_activity",
        parentVisibleTitle: "פעילות יומית",
        parentVisibleSubtitles: ["זמן תרגול ושאלות לפי יום בתקופה שנבחרה"],
        exactVisibleText: [`${dailyActivityVisual.length} ימים עם נתונים`, "צירים: זמן (דקות), שאלות"],
        component: "LineChart daily activity",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "report.dailyActivity via enrichDailyActivityWithVisualStrands",
        dataSource: "child_daily_activity",
        renderCondition: "dailyActivityVisual.length > 0 && !suppressCharts",
        subjectLevelOrTopicLevel: "general daily aggregate",
        gradeDisplayRule: "no grade on chart",
      });
      push({
        windowId: "chart_daily_by_subject",
        parentVisibleTitle: "פעילות לפי מקצועות (יומי)",
        parentVisibleSubtitles: ["מספר נושאים שונים שתורגלו בכל יום"],
        exactVisibleText: ["מקצועות: מתמטיקה, גאומטריה, אנגלית, מדעים, היסטוריה, עברית, מולדת, גאוגרפיה"],
        component: "LineChart daily by subject",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "dailyActivityVisual subject topic counts",
        dataSource: "child_daily_activity",
        renderCondition: "dailyActivityVisual.length > 0 && !suppressCharts",
        subjectLevelOrTopicLevel: "subject-level daily counts",
        gradeDisplayRule: "no grade",
      });
    }
    const overviewForChart = filterSubjectOverviewRowsWithEvidence(buildSubjectOverviewRows(report));
    if (overviewForChart.length > 0) {
      push({
        windowId: "chart_summary_six_subjects",
        parentVisibleTitle: "סיכום לפי שש המקצועות",
        parentVisibleSubtitles: ["זמן תרגול מצטבר לפי מקצוע"],
        exactVisibleText: overviewForChart.map((r) => `${r.name}: ${r.minutes} דק׳`),
        component: "BarChart summary",
        sourceFile: "pages/learning/parent-report.js",
        sourceField: "buildSubjectOverviewRows filtered",
        dataSource: "child_subject_minutes",
        renderCondition: "overview rows with evidence && !suppressCharts",
        subjectLevelOrTopicLevel: "subject-level",
        gradeDisplayRule: "aggregates all practiced grades per subject",
        notes: "Can mix practice from multiple grades into one subject bar.",
      });
    }
    for (const cfg of TOPIC_BAR_SUBJECT_CARDS) {
      const map = augmented[cfg.mapKey];
      if (!map || !Object.keys(map).length) continue;
      const rows = buildTopicRowsForChart(map, cfg.prefix).filter((r) => r.questions > 0);
      if (!rows.length) continue;
      const gradesInChart = [...new Set(rows.map((r) => formatParentReportGradeHe(r.gradeKey)).filter(Boolean))];
      push({
        windowId: `chart_topic_bars_${cfg.mapKey}`,
        parentVisibleTitle: cfg.title,
        parentVisibleSubtitles: ["מסילת תוויות ומסילת גרף משותפות לכל המקצועות", "דיוק %"],
        exactVisibleText: rows.slice(0, 12).map((r) => `${r.label}: ${r.accuracy}% (${r.questions} שאלות)`),
        component: "BarChart topic accuracy + ParentReportTopicExplainBlock",
        sourceFile: "pages/learning/parent-report.js + components/parent-report-topic-explain-row.jsx",
        sourceField: `report.${cfg.mapKey}`,
        dataSource: "child_topic_rows",
        renderCondition: "topic map has practiced rows && !suppressCharts",
        subjectLevelOrTopicLevel: "topic-level",
        gradeDisplayRule: `topic labels; grades in rows: ${gradesInChart.join(", ") || "none"}`,
        notes: "Each bar is one practiced topic; grades may differ across bars in same chart.",
      });
      const explainTexts = [];
      for (const row of rows) {
        explainTexts.push(...extractTopicExplainVisibleText(row));
      }
      if (explainTexts.length) {
        push({
          windowId: `topic_explain_${cfg.mapKey}`,
          parentVisibleTitle: "מה בולט בכל נושא",
          parentVisibleSubtitles: [`under chart: ${cfg.title}`],
          exactVisibleText: explainTexts,
          component: "ParentReportTopicExplainBlock",
          sourceFile: "components/parent-report-topic-explain-row.jsx",
          sourceField: "resolveParentExplainRowCopy(row) + topicEngineRowSignals",
          dataSource: "lpd + engine signals per topic row",
          renderCondition: "topic rows with questions > 0 under chart",
          subjectLevelOrTopicLevel: "topic-level",
          gradeDisplayRule: "topic label may include grade suffix",
        });
      }
    }
  }

  // Challenges
  push({
    windowId: "challenges",
    parentVisibleTitle: "🎯 אתגרים",
    parentVisibleSubtitles: ["אתגר יומי", "אתגר שבועי"],
    exactVisibleText: [
      `אתגר יומי: ${report.challenges.daily.correct} / ${report.challenges.daily.questions}`,
      `ניקוד שיא: ${report.challenges.daily.bestScore}`,
      `אתגר שבועי: ${report.challenges.weekly.current} / ${report.challenges.weekly.target}`,
      ...(report.challenges.weekly.completed ? ["🎉 הושלם!"] : []),
    ],
    component: "challenges grid",
    sourceFile: "pages/learning/parent-report.js",
    sourceField: "report.challenges",
    dataSource: "child_gamification",
    renderCondition: "always",
    subjectLevelOrTopicLevel: "general",
  });

  // Achievements
  if (report.achievements?.length) {
    push({
      windowId: "achievements",
      parentVisibleTitle: "🏆 הישגים",
      exactVisibleText: report.achievements.map((a) => a.name),
      component: "achievements list",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.achievements",
      dataSource: "child_gamification",
      renderCondition: "achievements.length > 0",
      subjectLevelOrTopicLevel: "general",
    });
  }

  // Disclaimer
  push({
    windowId: "disclaimer",
    parentVisibleTitle: PARENT_REPORT_DISCLAIMER_TITLE_HE,
    exactVisibleText: [...PARENT_REPORT_DISCLAIMER_PARAGRAPHS_HE],
    component: "ParentReportImportantDisclaimer",
    sourceFile: "components/ParentReportImportantDisclaimer.js",
    sourceField: "PARENT_REPORT_DISCLAIMER_* from data/legal/sitePolicies.he.js",
    dataSource: "static_legal_copy",
    renderCondition: "always at bottom",
    subjectLevelOrTopicLevel: "general",
  });

  annotateRepetitions(windows);
  return windows;
}

function annotateRepetitions(windows) {
  const textToWindows = new Map();
  for (const w of windows) {
    for (const t of w.exactVisibleText || []) {
      const norm = normalizeParentReportTextForDedupe(String(t));
      if (norm.length < 20) continue;
      if (!textToWindows.has(norm)) textToWindows.set(norm, []);
      textToWindows.get(norm).push(w.windowId);
    }
  }
  for (const w of windows) {
    const repeats = [];
    for (const t of w.exactVisibleText || []) {
      const norm = normalizeParentReportTextForDedupe(String(t));
      const ids = textToWindows.get(norm) || [];
      const others = ids.filter((id) => id !== w.windowId);
      if (others.length) repeats.push({ text: t, alsoInWindowIds: [...new Set(others)] });
    }
    w.repeatedInsideRegularReport = repeats;
  }
}

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
    return { base, detailed };
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

function buildSampleSummary(windows) {
  const rendered = windows.filter((w) => w.rendered !== false);
  const weeklyWindows = rendered.filter(
    (w) =>
      (w.parentVisibleSubtitles || []).some((s) => s.includes("מה לעשות השבוע")) ||
      (w.exactVisibleText || []).some((t) => t.startsWith("מה לעשות השבוע")),
  );
  const recommendationWindows = rendered.filter(
    (w) =>
      w.windowId?.includes("recommendation") ||
      w.windowId === "parent_home_recommendations" ||
      w.parentVisibleTitle === "💡 המלצות" ||
      (w.parentVisibleSubtitles || []).some((s) =>
        ["מה אפשר לעשות בבית", "יעדים לשבוע הקרוב", "מה לעשות:"].some((x) => s.includes(x)),
      ),
  );
  const subjectLevel = rendered.filter((w) => w.subjectLevelOrTopicLevel?.includes("subject"));
  const topicLevel = rendered.filter((w) => w.subjectLevelOrTopicLevel?.includes("topic"));
  const withRepeats = rendered.filter((w) => (w.repeatedInsideRegularReport || []).length > 0);
  const gradeMixing = rendered.filter((w) => w.notes?.includes("mix") || w.gradeDisplayRule?.includes("mix"));
  return {
    renderedWindowCount: rendered.length,
    windowOrderTitles: rendered.map((w) => w.parentVisibleTitle),
    weeklyActionLabel: {
      isSeparateWindow: false,
      appearsInWindowIds: weeklyWindows.map((w) => w.windowId),
      role: "inline label prefix (font-semibold) inside ParentReportWeeklyHomeActionLine — not its own card",
    },
    recommendationWindowIds: recommendationWindows.map((w) => w.windowId),
    subjectLevelWindowIds: subjectLevel.map((w) => w.windowId),
    topicLevelWindowIds: topicLevel.map((w) => w.windowId),
    intraReportRepetitions: withRepeats.map((w) => ({
      windowId: w.windowId,
      repeats: w.repeatedInsideRegularReport,
    })),
    gradeMixingNotes: gradeMixing.map((w) => ({ windowId: w.windowId, rule: w.gradeDisplayRule, notes: w.notes })),
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Parent Report — Regular UI Window Map (Current)");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("Read-only audit of `pages/learning/parent-report.js` — regular parent report screen only.");
  lines.push("No code, Hebrew, or structure changes.");
  lines.push("");
  for (const [key, sample] of Object.entries(report.samples)) {
    lines.push(`## Sample: ${sample.label} (${key})`);
    lines.push("");
    lines.push(`Range: ${sample.range.from} → ${sample.range.to}`);
    lines.push(`Rendered windows: **${sample.summary.renderedWindowCount}**`);
    lines.push("");
    lines.push("### Window order (titles)");
    sample.summary.windowOrderTitles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
    lines.push("### Where is \"מה לעשות השבוע\"?");
    lines.push(`- Separate window: **${sample.summary.weeklyActionLabel.isSeparateWindow ? "yes" : "no"}**`);
    lines.push(`- Appears in: ${sample.summary.weeklyActionLabel.appearsInWindowIds.join(", ") || "(not rendered)"}`);
    lines.push(`- Role: ${sample.summary.weeklyActionLabel.role}`);
    lines.push("");
    for (const w of sample.windows) {
      lines.push(`---`);
      lines.push(`### ${w.windowOrder}. ${w.parentVisibleTitle}`);
      lines.push("");
      if (w.parentVisibleSubtitles?.length) lines.push(`**Subtitles:** ${w.parentVisibleSubtitles.join(" | ")}`);
      lines.push(`**Component:** ${w.component}`);
      lines.push(`**Source:** \`${w.sourceFile}\` → \`${w.sourceField}\``);
      lines.push(`**Data:** ${w.dataSource}`);
      lines.push(`**Condition:** ${w.renderCondition}`);
      lines.push(`**Level:** ${w.subjectLevelOrTopicLevel}`);
      if (w.gradeDisplayRule) lines.push(`**Grade rule:** ${w.gradeDisplayRule}`);
      if (w.notes) lines.push(`**Notes:** ${w.notes}`);
      lines.push("");
      lines.push("**Exact visible text:**");
      for (const t of w.exactVisibleText || []) lines.push(`- ${t}`);
      if (w.repeatedInsideRegularReport?.length) {
        lines.push("");
        lines.push("**Repeats elsewhere in same report:**");
        for (const r of w.repeatedInsideRegularReport) {
          lines.push(`- "${r.text.slice(0, 80)}${r.text.length > 80 ? "…" : ""}" → also in ${r.alsoInWindowIds.join(", ")}`);
        }
      }
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("## Cross-sample executive summary");
  lines.push("");
  const s = report.executiveSummary;
  lines.push(`1. Window counts: OMER=${s.windowCounts.omer}, Aaa7=${s.windowCounts.aaa7}`);
  lines.push(`2. Weekly label: never a standalone window; inline in short contract and/or diagnostic overview`);
  lines.push(`3. Recommendation-bearing windows (union): ${s.recommendationWindowsUnion.join(", ")}`);
  lines.push(`4. Intra-report text repetitions detected: OMER=${s.repetitionCounts.omer}, Aaa7=${s.repetitionCounts.aaa7}`);
  return lines.join("\n");
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase — cannot build live window map");
    process.exit(1);
  }

  /** @type {Record<string, object>} */
  const samples = {};

  for (const liveCase of LIVE_CASES) {
    const student = await resolveStudent(supabase, liveCase.username);
    if (!student?.id) {
      console.warn(`Skip ${liveCase.username}: not found`);
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
    if (!reports?.base) {
      console.warn(`Failed report for ${liveCase.username}`);
      continue;
    }
    const shortContractTop = reports.detailed?.parentProductContractV1?.top || null;
    const windows = mapRegularReportWindows({
      report: reports.base,
      shortContractTop,
      sampleStudent: liveCase.student,
      range: { from: liveCase.from, to: liveCase.to },
    });
    const summary = buildSampleSummary(windows);
    samples[liveCase.student] = {
      label: liveCase.label,
      studentId: student.id,
      loginUsername: liveCase.username,
      range: { from: liveCase.from, to: liveCase.to },
      playerName: reports.base.playerName,
      totalQuestions: reports.base.summary?.totalQuestions,
      hasServerHomeRecommendations:
        Array.isArray(reports.base.parentFacing?.homeRecommendations) &&
        reports.base.parentFacing.homeRecommendations.filter(Boolean).length > 0,
      shortContractTopPresent: Boolean(shortContractTop),
      parentFacingAuthority: reports.base._parentFacingAuthority || null,
      windows,
      summary,
    };
    console.log(`${liveCase.label}: ${windows.length} windows mapped`);
  }

  const executiveSummary = {
    windowCounts: {
      omer: samples.omer?.summary.renderedWindowCount ?? 0,
      aaa7: samples.aaa7?.summary.renderedWindowCount ?? 0,
    },
    repetitionCounts: {
      omer: samples.omer?.summary.intraReportRepetitions?.length ?? 0,
      aaa7: samples.aaa7?.summary.intraReportRepetitions?.length ?? 0,
    },
    recommendationWindowsUnion: [
      ...new Set(
        Object.values(samples).flatMap((s) => s.summary.recommendationWindowIds || []),
      ),
    ],
    weeklyActionLabelRule:
      "Static prefix 'מה לעשות השבוע: ' in ParentReportWeeklyHomeActionLine — rendered inside short_contract_preview OR diagnostic_overview, never as standalone card.",
  };

  const report = {
    generatedAt: new Date().toISOString(),
    purpose: "parent_report_regular_current_ui_window_map",
    scope: "pages/learning/parent-report.js regular screen only — not short PDF, not detailed report",
    constraints: ["no_code_changes", "no_hebrew_changes", "no_structure_changes", "read_only_audit"],
    liveCases: LIVE_CASES,
    samples,
    executiveSummary,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, buildMarkdown(report), "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(JSON.stringify(executiveSummary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * דוח מקיף לתקופה — payload נפרד מהדוח הרגיל (V2).
 * מקור נתונים: generateParentReportV2 + diagnosticEngineV2 (מקור ראשי), עם fallback ל-patternDiagnostics.
 */

import { generateParentReportV2 } from "./parent-report-v2.js";
import { splitTopicRowKey } from "./parent-report-row-diagnostics.js";
import { isValidHybridRuntimePayload } from "./ai-hybrid-diagnostic/validate-hybrid-runtime.js";
import { buildParentProductContractV1 } from "./contracts/parent-product-contract-v1.js";
import { applyMathScopedParentDisplayNames } from "./math-topic-parent-display.js";
import { buildTopicRecommendationsForSubject } from "./topic-next-step-engine.js";
import { rewriteParentRecommendationForDetailedHe } from "./detailed-report-parent-letter-he.js";
import { buildParentAssignedActivitiesInPeriod } from "./parent-report-parent-assigned-activities.js";
import { buildOutOfGradePracticeTransparency } from "./parent-report-out-of-grade-transparency.js";
import {
  filterCoreV2Units,
  isCoreV2UnitForReport,
} from "./parent-report-core-grade-filter.js";
import {
  resolveGradeAwareRecommendationStepLabelHe,
  suppressRegisteredGradeStrengthenCopy,
} from "./parent-report-language/grade-context-parent-he.js";
import { PARENT_DIAGNOSTIC_TYPE_LABEL_HE } from "./parent-report-language/parent-report-hebrew-copy-spec.js";
import {
  EXPECTED_VS_OBSERVED_MATCH_LABEL_HE,
  LEARNING_STAGE_LABEL_HE,
  MISTAKE_PATTERN_LABEL_HE,
  NEXT_BEST_SEQUENCE_STEP_LABEL_HE,
  RECALIBRATION_NEED_LABEL_HE,
  RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE,
  RECOMMENDATION_MEMORY_STATE_LABEL_HE,
  RESPONSE_TO_INTERVENTION_LABEL_HE,
  ROOT_CAUSE_LABEL_HE,
  STRATEGY_REPETITION_RISK_LABEL_HE,
  SUPPORT_ADJUSTMENT_NEED_LABEL_HE,
  SUPPORT_HISTORY_DEPTH_LABEL_HE,
  SUPPORT_SEQUENCE_STATE_LABEL_HE,
  GATE_STATE_LABEL_HE,
  NEXT_CYCLE_DECISION_FOCUS_LABEL_HE,
  TARGET_EVIDENCE_TYPE_LABEL_HE,
  TARGET_OBSERVATION_WINDOW_LABEL_HE,
  DEPENDENCY_STATE_LABEL_HE,
  FOUNDATIONAL_BLOCKER_LABEL_HE,
} from "./parent-report-ui-explain-he.js";
import { pickRecommendedInterventionType } from "./topic-next-step-phase2.js";
import {
  crossSubjectV2BulletsHe,
  crossSubjectV2DataQualityNoteHe,
  executiveV2CautionNoteHe,
  executiveV2EvidenceBalanceHe,
  executiveV2HomeFocusHe,
  executiveV2MajorTrendsLinesHe,
  executiveV2MixedSignalNoticeHe,
  executiveV2OverallConfidenceHe,
  executiveV2ReportReadinessHe,
  homePlanV2EmptyFallbackHe,
  nextPeriodGoalsV2EmptyFallbackHe,
  priorityLevelParentLabelHe,
  subjectV2ConfidenceSummaryHe,
  subjectV2RecalibrationNeedNoHe,
  subjectV2RecalibrationNeedYesHe,
  subjectV2TrendNarrativeHighPriorityHe,
  subjectV2TrendNarrativeStableHe,
  topicRecommendationV2CautionGatedHe,
  normalizeParentFacingHe,
  tierStableStrengthHe,
  parentFacingPatternLabelHe,
  sanitizeDiagnosticEngineV2ForParentFacing,
  buildParentDiagnosticExplanationV1FromV2Unit,
} from "./parent-report-language/index.js";
import { withholdSummaryCopyHe, withholdConfidenceSummaryFallbackHe } from "./parent-report-language/subject-withhold-summary-he.js";
import {
  mergeCrossSubjectConclusionReadinessContract,
  applyGateToTextClampToTopicRecommendations,
  mergeSubjectConclusionReadinessContract,
  v2UnitsToContractRows,
} from "./minimal-safe-scope-enforcement.js";
import {
  NARRATIVE_CONTRACT_VERSION,
  applyNarrativeContractToRecord,
  buildNarrativeContractV1,
  validateNarrativeContractV1,
} from "./contracts/narrative-contract-v1.js";
import {
  isStrongPositiveUnitForParentGuidance,
  resolveUnitHomeMethodHe,
  resolveUnitNextGoalHe,
  resolveUnitParentActionHe,
} from "./parent-report-recommendation-consistency.js";
import { resolveGradeAwareParentRecommendationHe } from "./parent-report-language/grade-aware-recommendation-resolver.js";
import {
  deriveRawMetricStrengthLinesHe,
  mergeExecutiveStrengthLinesHe,
  subjectAccuracyFromReportSummary,
  subjectQuestionCountFromReportSummary,
} from "./parent-data-presence.js";
import { filterSubjectCoverageWithEvidence } from "./parent-report-subject-visibility.js";
import {
  executiveRowDedupeKey,
  parentFacingTopicRowLabelHe,
  resolveParentTopicConfidenceBand,
  resolveParentTopicReadiness,
  resolveRowDataSufficiencyLevel,
  resolveHasSubskillMetadataFromRowSources,
  shouldThinEvidenceDowngradeRecommendation,
  TOPIC_EVIDENCE_THRESHOLDS,
} from "./parent-report-topic-evidence.js";
import { buildRowIdentityV1 } from "./parent-report-output-integrity/row-identity-v1.js";
import {
  groupTopicRowsByParentTier,
  parentTopicTierFromUnit,
  parentTopicTierLabelHe,
  parentTopicTierPlacementKind,
  parentTopicTierShowsRecommendationCard,
  PARENT_TOPIC_TIER,
  resolveSubjectPrimaryParentActionHe,
  sanitizeParentSurfaceTextHe,
} from "./parent-report-surface/index.js";
import {
  detectGradeSplitContradictions,
  executiveLineFromV2Unit,
  hardenBaseReportWithRowIdentity,
  homePlanLineFromV2Unit,
  parentFacingDisplayLabelsForV2Unit,
  parentFacingLabelForV2Unit,
} from "./parent-report-output-integrity/harden-report-rows.js";
import { resolveNarrativeDisplayLabels } from "./parent-report-output-integrity/row-display-label-context.js";
import { parseCanonicalTopicFromRowKey } from "./parent-report-output-integrity/row-identity-v1.js";
import { buildGradeEvidenceFields } from "../lib/learning-supabase/practice-grade-resolution.js";
import {
  splitMoledetGeographyReportForDisplay,
  VISUAL_STRAND_LABEL_HE,
} from "../lib/learning-shared/moledet-geography-display.js";
import { normalizeParentVisibleMetrics } from "./learning-pattern-decision/normalize-parent-practice-metrics.js";
import { buildParentReportEngineDecisionContract } from "./learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import {
  buildSubjectEngineDecisionContract,
  resolveSubjectSummaryTextFromEngineContract,
} from "./learning-pattern-decision/build-subject-engine-decision-contract.js";
import {
  EDC_CONTRACT_KEY,
  EDC_DECISION_FIELD,
  ED_CLEAR_TOPIC_GAP,
  ED_TOPIC_NEEDS_STRENGTHENING,
  RA_REMEDIATE_SAME_LEVEL,
  RA_WATCH,
  RA_MAINTAIN_AND_STRENGTHEN,
  SP_SUBJECT_ENGINE_CONTRACT,
} from "./learning-pattern-decision/engine-decision-codes.js";
import { guardParentFacingText } from "./learning-pattern-decision/lpd-parent-facing-copy.js";
import { resolveTopicRecommendationOwnerCopyHe } from "./learning-pattern-decision/resolve-topic-owner-copy.js";

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

const TOPIC_REC_MIN_ACTIONABLE_QUESTIONS = 8;
const PRIORITY_SCORE_BY_LEVEL = { P4: 400, P3: 300, P2: 200, P1: 100 };

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historySubtopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/**
 * @param {Record<string, unknown>} baseReport
 * @param {unknown} unit
 * @returns {string|null}
 */
function gradeKeyForV2UnitFromReport(baseReport, unit) {
  const sid = String(unit?.subjectId || "");
  const trk = String(unit?.topicRowKey || "");
  if (!sid || !trk) return null;
  const mk = REPORT_MAP_KEY[sid];
  if (!mk) return null;
  const topicMap = baseReport?.[mk];
  if (!topicMap || typeof topicMap !== "object") return null;
  const row = topicMap[trk];
  if (row && typeof row === "object") {
    const g = row.gradeKey;
    if (g != null && String(g).trim() !== "") return String(g).trim();
  }
  const parsed = splitTopicRowKey(trk);
  const g2 = parsed?.gradeKey;
  return g2 != null && String(g2).trim() !== "" ? String(g2).trim() : null;
}

/**
 * Embedded `diagnosticEngineV2` is included for traceability; when Phase-1 grade-aware
 * templates apply, align `intervention.*He` on the snapshot with parent-facing resolver
 * output so JSON/Copilot-adjacent consumers do not see raw engine probe Hebrew.
 *
 * @param {Record<string, unknown>} baseReport
 * @param {unknown} diag
 */
function sanitizeDiagnosticEngineV2ForParentSnapshot(baseReport, diag) {
  if (!diag || typeof diag !== "object" || !Array.isArray(diag.units)) return diag;

  const units = diag.units.map((u) => {
    if (!u || typeof u !== "object") return u;
    const gk = gradeKeyForV2UnitFromReport(baseReport, u);
    const subjectId = String(u.subjectId || "").trim();
    const taxonomyId = String(
      u?.diagnosis?.taxonomyId || u?.intervention?.taxonomyId || u?.taxonomy?.id || ""
    ).trim();

    let next = { ...u };
    if (taxonomyId === "M-10") {
      next = sanitizeDiagnosticEngineV2ForParentFacing({ units: [next] }).units[0];
    }

    const hasTemplate =
      resolveGradeAwareParentRecommendationHe({
        subjectId,
        gradeKey: gk,
        taxonomyId,
        bucketKey: next?.bucketKey,
        slot: "action",
      }) != null;
    if (!hasTemplate) return next;

    const pa = resolveUnitParentActionHe(next, gk);
    const ng = resolveUnitNextGoalHe(next, gk);
    const intr = next?.intervention && typeof next.intervention === "object" ? { ...next.intervention } : {};
    if (pa) intr.immediateActionHe = pa;
    if (ng) intr.shortPracticeHe = ng;
    return { ...next, intervention: intr };
  });

  return { ...diag, units };
}

const SUMMARY_Q = {
  math: ["mathQuestions", "mathCorrect", "mathAccuracy"],
  geometry: ["geometryQuestions", "geometryCorrect", "geometryAccuracy"],
  english: ["englishQuestions", "englishCorrect", "englishAccuracy"],
  science: ["scienceQuestions", "scienceCorrect", "scienceAccuracy"],
  history: ["historyQuestions", "historyCorrect", "historyAccuracy"],
  hebrew: ["hebrewQuestions", "hebrewCorrect", "hebrewAccuracy"],
  "moledet-geography": [
    "moledetGeographyQuestions",
    "moledetGeographyCorrect",
    "moledetGeographyAccuracy",
  ],
};

function sumTopicMapMinutes(map) {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((s, row) => {
    const m = Number(row?.timeMinutes) || 0;
    return s + m;
  }, 0);
}

function formatDateLabelHe(isoDateStr) {
  if (!isoDateStr || typeof isoDateStr !== "string") return "";
  const p = isoDateStr.split("T")[0].split("-");
  if (p.length !== 3) return isoDateStr;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function collectStrengthRows(subjects) {
  const rows = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    const list = Array.isArray(s.topStrengths) ? s.topStrengths : [];
    for (const r of list) {
      rows.push({
        subjectId: sid,
        subjectLabelHe: SUBJECT_LABEL_HE[sid],
        topicRowKey: String(r.topicRowKey || "").trim() || null,
        contentGradeKey: r.contentGradeKey != null ? String(r.contentGradeKey).trim() : null,
        labelHe: String(r.labelHe || "").trim(),
        questions: Number(r.questions) || 0,
        accuracy: Number(r.accuracy) || 0,
        excellent: !!r.excellent,
      });
    }
  }
  rows.sort((a, b) => {
    if (Number(b.excellent) !== Number(a.excellent)) return Number(b.excellent) - Number(a.excellent);
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.questions - a.questions;
  });
  return rows;
}

function collectWeaknessRows(subjects) {
  const rows = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    const list = Array.isArray(s.topWeaknesses) ? s.topWeaknesses : [];
    for (const w of list) {
      rows.push({
        subjectId: sid,
        subjectLabelHe: SUBJECT_LABEL_HE[sid],
        topicRowKey: String(w.topicRowKey || "").trim() || null,
        contentGradeKey: w.contentGradeKey != null ? String(w.contentGradeKey).trim() : null,
        labelHe: String(w.labelHe || "").trim(),
        mistakeCount: Number(w.mistakeCount) || 0,
        questions: Number(w.questions) || 0,
        accuracy: Number(w.accuracy) || 0,
      });
    }
  }
  rows.sort((a, b) => b.mistakeCount - a.mistakeCount);
  return rows;
}

function uniqueTopLabels(rows, labelKey, max) {
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const lab = String(r[labelKey] || "").trim();
    if (!lab) continue;
    const dedupe = executiveRowDedupeKey({
      topicRowKey: r.topicRowKey,
      labelHe: lab,
      subjectId: r.subjectId,
      contentGradeKey: r.contentGradeKey,
    });
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(`${lab} (${r.subjectLabelHe})`);
    if (out.length >= max) break;
  }
  return out;
}

/** להסרת "בנושא " מתחילת תווית כדי לא לכפול ניסוח ("דגש על הנושא חיבור"). */
function stripLeadingBenosheaHe(s) {
  return String(s || "")
    .replace(/^בנושא\/ים\s+/u, "")
    .replace(/^בנושא\s+/u, "")
    .trim();
}

function collectMaintainRows(subjects) {
  const rows = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    const list = Array.isArray(s?.maintain) ? s.maintain : [];
    for (const r of list) {
      rows.push({
        labelHe: String(r.labelHe || "").trim(),
        accuracy: Number(r.accuracy) || 0,
        questions: Number(r.questions) || 0,
        subjectLabelHe: SUBJECT_LABEL_HE[sid],
      });
    }
  }
  rows.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.questions - a.questions;
  });
  return rows;
}

const CROSS_RISK_LABEL_HE = {
  ...PARENT_DIAGNOSTIC_TYPE_LABEL_HE,
  mixed: PARENT_DIAGNOSTIC_TYPE_LABEL_HE.mixed_signal,
  none_sparse: PARENT_DIAGNOSTIC_TYPE_LABEL_HE.none_sparse,
  none_observed: "לא נראה כרגע קושי דומיננטי",
};

function crossRiskLabelHe(riskId, subjects) {
  if (CROSS_RISK_LABEL_HE[riskId]) return CROSS_RISK_LABEL_HE[riskId];
  for (const sid of SUBJECT_IDS) {
    if (subjects?.[sid]?.dominantLearningRisk === riskId && subjects[sid].dominantLearningRiskLabelHe) {
      return String(subjects[sid].dominantLearningRiskLabelHe);
    }
  }
  return riskId;
}

function crossSuccessLabelHe(patId, subjects) {
  if (CROSS_SUCCESS_LABEL_HE[patId]) return CROSS_SUCCESS_LABEL_HE[patId];
  for (const sid of SUBJECT_IDS) {
    if (subjects?.[sid]?.dominantSuccessPattern === patId && subjects[sid].dominantSuccessPatternLabelHe) {
      return String(subjects[sid].dominantSuccessPatternLabelHe);
    }
  }
  return patId;
}

const CROSS_SUCCESS_LABEL_HE = {
  stable_mastery: "שליטה יציבה בחומר",
  fragile_success_cluster: "הצלחה שחוזרת אך עדיין שבירה",
  mixed: "כמה דפוסי הצלחה במקביל",
  none_sparse: "עדיין מעט נתונים",
};

function shortenHe(s, maxLen) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function aggregateCrossSubjectRisks(subjects) {
  const or = {
    falsePromotionRisk: false,
    falseRemediationRisk: false,
    speedOnlyRisk: false,
    hintDependenceRisk: false,
    insufficientEvidenceRisk: false,
    recentTransitionRisk: false,
  };
  for (const sid of SUBJECT_IDS) {
    const r = subjects?.[sid]?.majorRiskFlagsAcrossRows;
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(or)) {
      if (r[k]) or[k] = true;
    }
  }
  return or;
}

function dominantCrossSubjectField(subjects, field) {
  const counts = {};
  for (const sid of SUBJECT_IDS) {
    const v = String(subjects?.[sid]?.[field] || "").trim();
    if (!v || v === "none_sparse" || v === "undetermined") continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || "mixed";
}

function subjectQuestionTotal(subjects, sid, summary) {
  const s = subjects?.[sid];
  const [qk] = SUMMARY_Q[sid] || [];
  if (qk && summary && Number(summary[qk]) > 0) return Number(summary[qk]) || 0;
  let q = 0;
  const pools = [
    ...(Array.isArray(s?.topStrengths) ? s.topStrengths : []),
    ...(Array.isArray(s?.maintain) ? s.maintain : []),
    ...(Array.isArray(s?.improving) ? s.improving : []),
  ];
  for (const r of pools) q += Number(r?.questions) || 0;
  return q;
}

function dominantSubjectByVolume(subjectCoverage) {
  const arr = Array.isArray(subjectCoverage) ? [...subjectCoverage] : [];
  arr.sort((a, b) => (Number(b.questionCount) || 0) - (Number(a.questionCount) || 0));
  return arr[0] || null;
}

function buildMajorTrendsHe(subjects, subjectCoverage) {
  const scored = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    const cov = subjectCoverage?.find((c) => c.subject === sid);
    const w = (Number(cov?.questionCount) || 0) + 1;
    const tn = String(s.trendNarrativeHe || "").trim();
    if (tn.length > 24) {
      const parts = tn.split(/(?<=[.!?])\s+/).filter(Boolean);
      const head = parts[0] || shortenHe(tn, 130);
      scored.push({ text: shortenHe(head, 150), w, sid });
    }
    const ibs = String(s.improvingButSupportedHe || "").trim();
    if (ibs.length > 20) scored.push({ text: shortenHe(ibs, 150), w: w + 3, sid });
    const pos = String(s.strongestPositiveTrendRowHe || "").trim();
    const cau = String(s.strongestCautionTrendRowHe || "").trim();
    if (pos.length > 20) scored.push({ text: shortenHe(`חיזוק שחוזר בכמה מקצועות (${SUBJECT_LABEL_HE[sid]}): ${pos}`, 150), w: w - 1, sid });
    if (cau.length > 20) scored.push({ text: shortenHe(`זהירות (${SUBJECT_LABEL_HE[sid]}): ${cau}`, 150), w: w + 2, sid });
  }
  scored.sort((a, b) => b.w - a.w);
  const out = [];
  const seen = new Set();
  for (const x of scored) {
    const k = x.text.slice(0, 48);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x.text);
    if (out.length >= 2) break;
  }
  if (!out.length) {
    out.push("עדיין אין שתי מגמות חוצות מקצועות ברורות - התמונה תתבהר אחרי עוד תרגול בתקופה שנבחרה.");
  }
  if (out.length === 1) {
    out.push("מגמה שנייה תתבהר אחרי עוד תרגול במקצועות עם מעט שאלות.");
  }
  return out.slice(0, 2);
}

function pickMainHomeRecommendationHe(subjects, subjectCoverage, summary, topFocusAreasHe, topStrengthsAcrossHe) {
  let bestSid = null;
  let bestScore = -1;
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    const q = subjectQuestionTotal(subjects, sid, summary || {});
    const cov = subjectCoverage?.find((c) => c.subject === sid);
    const qc = Number(cov?.questionCount) || q;
    const hasW = Array.isArray(s.topWeaknesses) && s.topWeaknesses.length > 0;
    const risk = String(s.dominantLearningRisk || "");
    let score = qc;
    if (hasW) score += 40;
    if (risk === "knowledge_gap" || risk === "fragile_success") score += 25;
    if (s.recommendedHomeMethodHe) score += 15;
    if (score > bestScore) {
      bestScore = score;
      bestSid = sid;
    }
  }
  const pick = bestSid && subjects?.[bestSid] ? subjects[bestSid] : null;
  const home = pick?.recommendedHomeMethodHe && String(pick.recommendedHomeMethodHe).trim();
  if (home) return shortenHe(rewriteParentRecommendationForDetailedHe(home), 220);
  if (topFocusAreasHe[0]) {
    const core = stripLeadingBenosheaHe(topFocusAreasHe[0].replace(/\s*\([^)]*\)\s*$/u, "").trim());
    return shortenHe(
      `להתמקד השבוע ב${core} - שני מפגשים קצרים, קריאת משימה משותפת ותרגול ממוקד בלי קפיצת רמה.`,
      220
    );
  }
  if (topStrengthsAcrossHe[0]) {
    return shortenHe(
      `לשמור קצב רגוע סביב ${stripLeadingBenosheaHe(topStrengthsAcrossHe[0])} - תרגול קצר פעמיים בשבוע לשימור עקביות.`,
      220
    );
  }
  return "שני מפגשים קצרים בשבוע, דגש על קריאת המשימה לפני תשובה - עד שיתקבל עוד תרגול בתקופה שנבחרה.";
}

function buildCautionNoteHe(crossRisks, subjects, dominantRiskId) {
  const parts = [];
  if (crossRisks.hintDependenceRisk) parts.push("בכמה מקצועות הילד עדיין נשען על רמזים - לא כדאי להתקדם מהר מדי.");
  if (crossRisks.falsePromotionRisk) parts.push("סיכון לקידום שווא - לא לפרש הצלחה חלקית כמוכנות לעלייה מהירה מדי ברמה.");
  if (crossRisks.recentTransitionRisk) parts.push("מגמות אחרונות מצביעות על זהירות - לא לרדת מדרגה בכל המקצוע בבת אחת.");
  if (crossRisks.speedOnlyRisk) parts.push("מופיעה חולשה הקשורה למהירות - לא להכליל לכל סוגי התרגול.");
  if (parts.length) return shortenHe(parts.join(" "), 220);
  const wnts = SUBJECT_IDS.map((sid) => String(subjects?.[sid]?.whatNotToDoHe || "").trim()).filter(Boolean);
  if (wnts.length) return shortenHe(wnts.sort((a, b) => b.length - a.length)[0], 220);
  if (dominantRiskId === "none_sparse" || dominantRiskId === "none_observed") {
    return "עדיין מעט מידע - לא לקבוע שינוי דרמטי בבית לפני שיתקבל עוד תרגול.";
  }
  return "לעקוב אחרי הדפוסים בשורות לפני שינוי הגדרות חד.";
}

function buildOverallConfidenceHe(subjectCoverage, crossRisks) {
  const cov = Array.isArray(subjectCoverage) ? subjectCoverage : [];
  const low = cov.filter((c) => c.questionCount > 0 && c.questionCount < 12).length;
  const active = cov.filter((c) => c.questionCount > 0).length;
  const uneven =
    active >= 2 &&
    cov.reduce((m, c) => Math.max(m, c.questionCount || 0), 0) >
      2 * (cov.reduce((s, c) => s + (c.questionCount || 0), 0) / Math.max(active, 1));
  let t = `בתקופה שנבחרה: ${active} מקצועות עם פעילות; ${low} עם מעט שאלות יחסית - הביטחון בין המקצועות לא אחיד.`;
  if (crossRisks.insufficientEvidenceRisk) t += " חלק מהנתונים עם מה שרואים בהן רק חלקית.";
  if (uneven) t += " רוב הנתונים מגיעים ממקצוע אחד בולט - לא מניחים התפלגות שווה.";
  return shortenHe(t, 280);
}

function buildReportReadinessHe(dataIntegrityReport, summary) {
  const issues = dataIntegrityReport?.issues;
  const n = Array.isArray(issues) ? issues.length : 0;
  const q = Number(summary?.totalQuestions) || 0;
  if (n === 0 && q >= 24) return "בדוח יש מספיק מידע לקריאה הורית - נאספו מספיק שאלות ואין בעיות נתונים משמעותיות.";
  if (n > 0 && q >= 18) return `הדוח קריא, אך יש ${n} הערות שלמות נתונים - לקרוא מסקנות בעדינות.`;
  if (q < 18) return "הדוח חלקי - מומלץ להשלים עוד תרגול בתקופה שנבחרה לפני החלטות גדולות.";
  return "בדוח יש מידע חלקי - כדאי לשלב את מה שמופיע כאן עם מה שאתם רואים בבית.";
}

function buildEvidenceBalanceHe(subjects) {
  let frag = 0;
  let stab = 0;
  let str = 0;
  let weak = 0;
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    frag += Number(s.fragileSuccessRowCount) || 0;
    stab += Number(s.stableMasteryRowCount) || 0;
    str += (Array.isArray(s.topStrengths) ? s.topStrengths.length : 0) + (Array.isArray(s.stableExcellence) ? s.stableExcellence.length : 0);
    weak += Array.isArray(s.topWeaknesses) ? s.topWeaknesses.length : 0;
  }
  return shortenHe(
    `איזון הכוונה: כ ${stab} נתונים עם שליטה טובה ויציבה מול ${frag} שבירות; ${str} כיווני חוזק מובחרים מול ${weak} מוקדי חולשה מובחרים.`,
    220
  );
}

function buildMixedSignalNoticeHe(subjects, crossRisks, topStrengthsAcrossHe) {
  const anyIbs = SUBJECT_IDS.some((sid) => String(subjects?.[sid]?.improvingButSupportedHe || "").trim());
  const strong = topStrengthsAcrossHe.length >= 2;
  const risky = crossRisks.falsePromotionRisk || crossRisks.hintDependenceRisk;
  if (strong && risky) {
    return "תמונה מעורבת: יש תחומים עם תוצאות טובות יחסית, אך גם סימנים שכדאי לבדוק לפני קביעה שהכול כבר יציב בכל התחומים.";
  }
  if (anyIbs) {
    return "יש שיפור, אבל הילד עדיין נעזר בזמן הפתרון - ההתקדמות עדיין דורשת ליווי רגוע.";
  }
  const modeNotes = SUBJECT_IDS.map((sid) => subjects?.[sid]?.modeConcentrationNoteHe).filter(Boolean);
  if (modeNotes.length >= 2) {
    return "חולשות מרוכזות במצבי תרגול שונים - לא מכלילים אוטומטית לכל המקצוע.";
  }
  return null;
}

/**
 * מיקוד ביתי — משפט אחד לפי מצב (חיזוק / שימור / דל נתון), בלי שכבות מרובות.
 */
/**
 * סיכום שחוזר בכמה מקצועות לשלב 7 (מקור הקושי, מידת הבהירות, סדר עדיפויות הורה).
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase7Fields(subjects, subjectCoverage) {
  const dist = {};
  const cautionSet = new Set();
  let notReady = 0;
  let partial = 0;
  let countedSubjects = 0;

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    countedSubjects += 1;
    const rd = s.rootCauseDistribution;
    if (rd && typeof rd === "object") {
      for (const [k, v] of Object.entries(rd)) {
        const n = Number(v) || 0;
        if (!n) continue;
        dist[k] = (dist[k] || 0) + n;
      }
    }
    const cr = s.subjectConclusionReadiness;
    if (cr === "not_ready") notReady += 1;
    else if (cr === "partial") partial += 1;
    const sd = String(s.subjectDiagnosticRestraintHe || "").trim();
    if (sd) cautionSet.add(`${SUBJECT_LABEL_HE[sid]}: ${sd}`);
  }

  const entries = Object.entries(dist)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const nonIns = entries.filter(([k]) => k !== "insufficient_evidence");
  let dominantCrossSubjectRootCause = "insufficient_evidence";
  if (entries.length) {
    const top = entries[0];
    if (top[0] === "insufficient_evidence" && nonIns.length && nonIns[0][1] >= top[1]) {
      dominantCrossSubjectRootCause = nonIns[0][0];
    } else {
      dominantCrossSubjectRootCause = top[0];
    }
  }

  const dominantCrossSubjectRootCauseLabelHe =
    ROOT_CAUSE_LABEL_HE[dominantCrossSubjectRootCause] ||
    ROOT_CAUSE_LABEL_HE.insufficient_evidence;

  let crossSubjectConclusionReadiness = "ready";
  if (!countedSubjects) crossSubjectConclusionReadiness = "not_ready";
  else if (notReady >= 2 || notReady >= Math.ceil(countedSubjects * 0.5)) {
    crossSubjectConclusionReadiness = "not_ready";
  } else if (notReady >= 1 || partial >= 2 || partial >= Math.ceil(countedSubjects * 0.45)) {
    crossSubjectConclusionReadiness = "partial";
  }

  crossSubjectConclusionReadiness = mergeCrossSubjectConclusionReadinessContract(
    crossSubjectConclusionReadiness,
    subjectCoverage
  );

  const majorDiagnosticCautionsHe = [];
  if (crossSubjectConclusionReadiness !== "ready") {
    majorDiagnosticCautionsHe.push(
      "בחלק מהמקצועות יש רק סימנים ראשוניים או מעורבים - עדיין מוקדם לקבוע כיוון ברור לכל המקצועות."
    );
  }
  for (const c of cautionSet) {
    if (majorDiagnosticCautionsHe.length >= 6) break;
    majorDiagnosticCautionsHe.push(c);
  }

  const recommendedParentPriorityType = pickRecommendedInterventionType(
    dominantCrossSubjectRootCause,
    "maintain_and_strengthen"
  );

  return {
    dominantCrossSubjectRootCause,
    dominantCrossSubjectRootCauseLabelHe,
    crossSubjectConclusionReadiness,
    majorDiagnosticCautionsHe,
    recommendedParentPriorityType,
  };
}

const CROSS_STAGE_PRIORITY_P9 = [
  "regression_signal",
  "fragile_retention",
  "early_acquisition",
  "insufficient_longitudinal_evidence",
  "partial_stabilization",
  "transfer_emerging",
  "stable_control",
];

/**
 * Phase 9 — טעות חוזרת וזיכרון למידה בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase9Fields(subjects) {
  const mpVotes = {};
  const lsSubjectCounts = {};
  let maxRetRank = 0;
  const rrRank = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let minTrRank = 99;
  const trRank = { not_ready: 0, limited: 1, emerging: 2, ready: 3 };
  const reviewBeforeAdvanceAreasHe = [];
  const transferReadyAreasHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const mp = String(s.dominantMistakePattern || "").trim();
    if (mp) mpVotes[mp] = (mpVotes[mp] || 0) + 1;
    const sls = String(s.subjectLearningStage || "").trim();
    if (sls) lsSubjectCounts[sls] = (lsSubjectCounts[sls] || 0) + 1;
    const sr = String(s.subjectRetentionRisk || "");
    if (rrRank[sr] != null && rrRank[sr] > maxRetRank) maxRetRank = rrRank[sr];
    const tr = String(s.subjectTransferReadiness || "");
    const trv = trRank[tr];
    if (trv != null && trv < minTrRank) minTrRank = trv;
    const rba = String(s.subjectReviewBeforeAdvanceHe || "").trim();
    if (rba && reviewBeforeAdvanceAreasHe.length < 5) {
      reviewBeforeAdvanceAreasHe.push(`${SUBJECT_LABEL_HE[sid]}: ${shortenHe(rba, 110)}`);
    }
    if (tr === "ready" && sls === "stable_control" && transferReadyAreasHe.length < 4) {
      transferReadyAreasHe.push(`${SUBJECT_LABEL_HE[sid]}: מוכנות זהירה להרחבה קטנה בתוך הנושא בלבד.`);
    }
  }

  const mpEntries = Object.entries(mpVotes)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const nonInsMp = mpEntries.filter(([k]) => k !== "insufficient_mistake_evidence");
  let dominantCrossSubjectMistakePattern = "insufficient_mistake_evidence";
  if (mpEntries.length) {
    const top = mpEntries[0];
    if (top[0] === "insufficient_mistake_evidence" && nonInsMp.length && nonInsMp[0][1] >= top[1]) {
      dominantCrossSubjectMistakePattern = nonInsMp[0][0];
    } else {
      dominantCrossSubjectMistakePattern = top[0];
    }
  }

  let crossSubjectLearningStage = "insufficient_longitudinal_evidence";
  for (const st of CROSS_STAGE_PRIORITY_P9) {
    if ((lsSubjectCounts[st] || 0) > 0) {
      crossSubjectLearningStage = st;
      break;
    }
  }

  const crossSubjectRetentionRisk =
    maxRetRank >= 3 ? "high" : maxRetRank === 2 ? "moderate" : maxRetRank === 1 ? "low" : "unknown";

  let crossSubjectTransferReadiness = "not_ready";
  if (minTrRank === 99) crossSubjectTransferReadiness = "not_ready";
  else if (minTrRank === 3) crossSubjectTransferReadiness = "ready";
  else if (minTrRank === 2) crossSubjectTransferReadiness = "emerging";
  else if (minTrRank === 1) crossSubjectTransferReadiness = "limited";

  if (crossSubjectLearningStage === "fragile_retention" || crossSubjectLearningStage === "regression_signal") {
    if (crossSubjectTransferReadiness === "ready") crossSubjectTransferReadiness = "limited";
  }
  if (crossSubjectTransferReadiness === "ready" && maxRetRank >= 2) {
    crossSubjectTransferReadiness = "emerging";
  }

  return {
    dominantCrossSubjectMistakePattern,
    dominantCrossSubjectMistakePatternLabelHe:
      MISTAKE_PATTERN_LABEL_HE[dominantCrossSubjectMistakePattern] ||
      MISTAKE_PATTERN_LABEL_HE.insufficient_mistake_evidence,
    crossSubjectLearningStage,
    crossSubjectLearningStageLabelHe:
      LEARNING_STAGE_LABEL_HE[crossSubjectLearningStage] ||
      LEARNING_STAGE_LABEL_HE.insufficient_longitudinal_evidence,
    crossSubjectRetentionRisk,
    crossSubjectTransferReadiness,
    reviewBeforeAdvanceAreasHe,
    transferReadyAreasHe,
  };
}

const RTI_CROSS_WORST_FIRST = [
  "regression_under_support",
  "stalled_response",
  "mixed_response",
  "over_supported_progress",
  "not_enough_evidence",
  "early_positive_response",
  "independence_growing",
];

/**
 * Phase 10 — תגובה להתערבות וריענון מסקנות בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase10Fields(subjects) {
  const votes = {};
  const adjRank = {
    monitor_only: 0,
    hold_course: 1,
    reduce_support: 2,
    tighten_focus: 3,
    increase_structure: 4,
    change_strategy: 5,
  };
  const cfRank = { high: 0, medium: 1, low: 2, expired: 3 };
  const recRank = { none: 0, light_review: 1, structured_recheck: 2, do_not_rely_yet: 3 };
  let maxAdj = 0;
  let crossSubjectSupportAdjustmentNeed = "monitor_only";
  let maxCf = 0;
  let crossSubjectConclusionFreshness = "medium";
  let maxRec = 0;
  let crossSubjectRecalibrationNeed = "none";
  /** @type {string[]} */
  const majorRecheckAreasHe = [];
  /** @type {string[]} */
  const areasWhereSupportCanBeReducedHe = [];
  /** @type {string[]} */
  const areasNeedingStrategyChangeHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const rti = String(s.subjectResponseToIntervention || "").trim();
    if (rti) votes[rti] = (votes[rti] || 0) + 1;
    const sadj = String(s.subjectSupportAdjustmentNeed || "");
    if (adjRank[sadj] != null && adjRank[sadj] > maxAdj) {
      maxAdj = adjRank[sadj];
      crossSubjectSupportAdjustmentNeed = sadj;
    }
    const cf = String(s.subjectConclusionFreshness || "");
    if (cfRank[cf] != null && cfRank[cf] > maxCf) {
      maxCf = cfRank[cf];
      crossSubjectConclusionFreshness = cf;
    }
    const rec = String(s.subjectRecalibrationNeed || "");
    if (recRank[rec] != null && recRank[rec] > maxRec) {
      maxRec = recRank[rec];
      crossSubjectRecalibrationNeed = rec;
    }
    const lab = SUBJECT_LABEL_HE[sid];
    if (rec === "structured_recheck" || cf === "expired" || (cf === "low" && rec !== "none")) {
      if (majorRecheckAreasHe.length < 6) {
        const hint = String(s.subjectRecalibrationNeedHe || "").trim() || "לעשות סבב תצפית לפני שינוי משמעותי.";
        majorRecheckAreasHe.push(`${lab}: ${shortenHe(hint, 120)}`);
      }
    }
    if (rti === "independence_growing" || rti === "over_supported_progress") {
      if (areasWhereSupportCanBeReducedHe.length < 5) {
        areasWhereSupportCanBeReducedHe.push(
          `${lab}: ${RESPONSE_TO_INTERVENTION_LABEL_HE[rti] || RESPONSE_TO_INTERVENTION_LABEL_HE.not_enough_evidence}`
        );
      }
    }
    if (rti === "regression_under_support" || (rti === "stalled_response" && String(s.subjectSupportFit) === "poor_fit")) {
      if (areasNeedingStrategyChangeHe.length < 5) {
        areasNeedingStrategyChangeHe.push(`${lab}: כדאי לבחון שינוי אסטרטגיה זהיר, לא רק עוד אותה חזרה.`);
      }
    }
  }

  let crossSubjectResponseToIntervention = "not_enough_evidence";
  const rtiSum = Object.values(votes).reduce((a, b) => a + b, 0);
  if (rtiSum > 0) {
    for (const id of RTI_CROSS_WORST_FIRST) {
      if ((votes[id] || 0) > 0) {
        crossSubjectResponseToIntervention = id;
        break;
      }
    }
  }

  return {
    crossSubjectResponseToIntervention,
    crossSubjectResponseToInterventionLabelHe:
      RESPONSE_TO_INTERVENTION_LABEL_HE[crossSubjectResponseToIntervention] ||
      RESPONSE_TO_INTERVENTION_LABEL_HE.not_enough_evidence,
    crossSubjectSupportAdjustmentNeed,
    crossSubjectSupportAdjustmentNeedHe:
      SUPPORT_ADJUSTMENT_NEED_LABEL_HE[crossSubjectSupportAdjustmentNeed] ||
      SUPPORT_ADJUSTMENT_NEED_LABEL_HE.monitor_only,
    crossSubjectConclusionFreshness,
    crossSubjectRecalibrationNeed,
    crossSubjectRecalibrationNeedHe:
      RECALIBRATION_NEED_LABEL_HE[crossSubjectRecalibrationNeed] || RECALIBRATION_NEED_LABEL_HE.none,
    majorRecheckAreasHe,
    areasWhereSupportCanBeReducedHe,
    areasNeedingStrategyChangeHe,
  };
}

const SEQ_STATE_CROSS_WORST_FIRST = [
  "sequence_exhausted",
  "sequence_stalled",
  "insufficient_sequence_evidence",
  "continuing_sequence",
  "early_sequence",
  "new_support_cycle",
  "sequence_ready_for_release",
];

const NEXT_BEST_STEP_CROSS_WORST_FIRST = [
  "switch_support_type",
  "reset_with_short_review",
  "tighten_same_goal",
  "observe_before_next_cycle",
  "begin_release_step",
  "continue_current_sequence",
];

/**
 * Phase 11 — כיוון עזרה בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase11Fields(subjects) {
  const seqVotes = {};
  const repRank = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let maxRep = 0;
  let crossSubjectStrategyRepetitionRisk = "unknown";
  const fatRank = { unknown: 0, low: 1, moderate: 2, high: 3 };
  let maxFat = 0;
  let crossSubjectStrategyFatigueRisk = "unknown";
  const stepVotes = {};
  /** @type {string[]} */
  const subjectsReadyForReleaseHe = [];
  /** @type {string[]} */
  const subjectsAtRiskOfSupportRepetitionHe = [];
  /** @type {string[]} */
  const subjectsNeedingSupportResetHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const ss = String(s.subjectSupportSequenceState || "").trim();
    if (ss) seqVotes[ss] = (seqVotes[ss] || 0) + 1;
    const rep = String(s.subjectStrategyRepetitionRisk || "");
    if (repRank[rep] != null && repRank[rep] > maxRep) {
      maxRep = repRank[rep];
      crossSubjectStrategyRepetitionRisk = rep;
    }
    const fat = String(s.subjectStrategyFatigueRisk || "");
    if (fatRank[fat] != null && fatRank[fat] > maxFat) {
      maxFat = fatRank[fat];
      crossSubjectStrategyFatigueRisk = fat;
    }
    const stp = String(s.subjectNextBestSequenceStep || "").trim();
    if (stp) stepVotes[stp] = (stepVotes[stp] || 0) + 1;
    const lab = SUBJECT_LABEL_HE[sid];
    if (ss === "sequence_ready_for_release" && subjectsReadyForReleaseHe.length < 5) {
      subjectsReadyForReleaseHe.push(`${lab}: ${shortenHe(String(s.subjectSupportSequenceStateLabelHe || ""), 100)}`);
    }
    if (
      (rep === "high" || (rep === "moderate" && ss === "sequence_stalled")) &&
      subjectsAtRiskOfSupportRepetitionHe.length < 5
    ) {
      subjectsAtRiskOfSupportRepetitionHe.push(
        `${lab}: ${STRATEGY_REPETITION_RISK_LABEL_HE[rep] || STRATEGY_REPETITION_RISK_LABEL_HE.unknown}`
      );
    }
    const rot = String(s.subjectRecommendationRotationNeed || "");
    if (
      (ss === "sequence_exhausted" || rot === "meaningful_rotation") &&
      subjectsNeedingSupportResetHe.length < 5
    ) {
      subjectsNeedingSupportResetHe.push(`${lab}: כדאי לעצור חזרות ולחדש כיוון לפני עוד אותו סוג תרגול.`);
    }
  }

  let crossSubjectSupportSequenceState = "insufficient_sequence_evidence";
  const seqSum = Object.values(seqVotes).reduce((a, b) => a + b, 0);
  if (seqSum > 0) {
    for (const id of SEQ_STATE_CROSS_WORST_FIRST) {
      if ((seqVotes[id] || 0) > 0) {
        crossSubjectSupportSequenceState = id;
        break;
      }
    }
  }

  let crossSubjectNextBestSequenceStep = "observe_before_next_cycle";
  const stepSum = Object.values(stepVotes).reduce((a, b) => a + b, 0);
  if (stepSum > 0) {
    for (const id of NEXT_BEST_STEP_CROSS_WORST_FIRST) {
      if ((stepVotes[id] || 0) > 0) {
        crossSubjectNextBestSequenceStep = id;
        break;
      }
    }
  }

  return {
    crossSubjectSupportSequenceState,
    crossSubjectSupportSequenceStateLabelHe:
      SUPPORT_SEQUENCE_STATE_LABEL_HE[crossSubjectSupportSequenceState] ||
      SUPPORT_SEQUENCE_STATE_LABEL_HE.insufficient_sequence_evidence,
    crossSubjectStrategyRepetitionRisk,
    crossSubjectStrategyFatigueRisk,
    crossSubjectNextBestSequenceStep,
    crossSubjectNextBestSequenceStepHe:
      NEXT_BEST_SEQUENCE_STEP_LABEL_HE[crossSubjectNextBestSequenceStep] ||
      NEXT_BEST_SEQUENCE_STEP_LABEL_HE.observe_before_next_cycle,
    subjectsReadyForReleaseHe,
    subjectsAtRiskOfSupportRepetitionHe,
    subjectsNeedingSupportResetHe,
  };
}

const MEM_STATE_RANK_P12 = { no_memory: 0, light_memory: 1, usable_memory: 2, strong_memory: 3 };
const DEPTH_RANK_P12 = { unknown: 0, single_window: 1, short_history: 2, multi_window: 3 };
const MATCH_WORST_FIRST_P12 = ["misaligned", "not_enough_evidence", "partly_aligned", "aligned"];
const CONTINUATION_WORST_FIRST_P12 = [
  "reset_and_rebuild_signal",
  "pivot_from_prior_path",
  "do_not_repeat_without_new_evidence",
  "continue_but_refine",
  "begin_controlled_release",
  "continue_with_same_core",
];

/**
 * Phase 12 — מה נוסה לאחרונה ומעקב תוצאה בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase12Fields(subjects) {
  let minMemRank = 99;
  let minDepthRank = 99;
  const matchVotes = {};
  const contVotes = {};
  /** @type {string[]} */
  const subjectsWithClearCarryoverHe = [];
  /** @type {string[]} */
  const subjectsNeedingFreshEvidenceHe = [];
  /** @type {string[]} */
  const subjectsWherePriorPathSeemsMisalignedHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const m = String(s.subjectRecommendationMemoryState || "no_memory");
    if (MEM_STATE_RANK_P12[m] != null && MEM_STATE_RANK_P12[m] < minMemRank) minMemRank = MEM_STATE_RANK_P12[m];
    const d = String(s.subjectSupportHistoryDepth || "unknown");
    if (DEPTH_RANK_P12[d] != null && DEPTH_RANK_P12[d] < minDepthRank) minDepthRank = DEPTH_RANK_P12[d];
    const mat = String(s.subjectExpectedVsObservedMatch || "").trim();
    if (mat) matchVotes[mat] = (matchVotes[mat] || 0) + 1;
    const ctn = String(s.subjectContinuationDecision || "").trim();
    if (ctn) contVotes[ctn] = (contVotes[ctn] || 0) + 1;
    const lab = SUBJECT_LABEL_HE[sid];
    if (
      s.subjectRecommendationCarryover === "clearly_visible" &&
      mat === "aligned" &&
      subjectsWithClearCarryoverHe.length < 5
    ) {
      subjectsWithClearCarryoverHe.push(`${lab}: נראה שעקביות המסלול נשמרה והתוצאה מתאימה לציפייה.`);
    }
    if (
      (m === "no_memory" || m === "light_memory") &&
      (mat === "not_enough_evidence" || s.subjectFollowThroughSignal === "not_inferable") &&
      subjectsNeedingFreshEvidenceHe.length < 5
    ) {
      subjectsNeedingFreshEvidenceHe.push(`${lab}: כדאי לאסוף עוד מידע לפני שממשיכים באותו מסלול.`);
    }
    if (mat === "misaligned" && subjectsWherePriorPathSeemsMisalignedHe.length < 5) {
      subjectsWherePriorPathSeemsMisalignedHe.push(
        `${lab}: הציפייה מהמסלול הקודם לא נראית מתיישרת עם מה שרואים עכשיו.`
      );
    }
  }

  const memKeyFromRank = (r) => {
    if (r >= 99) return "no_memory";
    for (const [k, v] of Object.entries(MEM_STATE_RANK_P12)) if (v === r) return k;
    return "no_memory";
  };
  const depthKeyFromRank = (r) => {
    if (r >= 99) return "unknown";
    for (const [k, v] of Object.entries(DEPTH_RANK_P12)) if (v === r) return k;
    return "unknown";
  };

  const crossSubjectRecommendationMemoryState = memKeyFromRank(minMemRank);
  const crossSubjectSupportHistoryDepth = depthKeyFromRank(minDepthRank);

  let crossSubjectExpectedVsObservedMatch = "not_enough_evidence";
  const mSum = Object.values(matchVotes).reduce((a, b) => a + b, 0);
  if (mSum > 0) {
    for (const id of MATCH_WORST_FIRST_P12) {
      if ((matchVotes[id] || 0) > 0) {
        crossSubjectExpectedVsObservedMatch = id;
        break;
      }
    }
  }

  let crossSubjectContinuationDecision = "continue_but_refine";
  const cSum = Object.values(contVotes).reduce((a, b) => a + b, 0);
  if (cSum > 0) {
    for (const id of CONTINUATION_WORST_FIRST_P12) {
      if ((contVotes[id] || 0) > 0) {
        crossSubjectContinuationDecision = id;
        break;
      }
    }
  }

  return {
    crossSubjectRecommendationMemoryState,
    crossSubjectRecommendationMemoryStateLabelHe:
      RECOMMENDATION_MEMORY_STATE_LABEL_HE[crossSubjectRecommendationMemoryState] ||
      RECOMMENDATION_MEMORY_STATE_LABEL_HE.no_memory,
    crossSubjectSupportHistoryDepth,
    crossSubjectSupportHistoryDepthLabelHe:
      SUPPORT_HISTORY_DEPTH_LABEL_HE[crossSubjectSupportHistoryDepth] ||
      SUPPORT_HISTORY_DEPTH_LABEL_HE.unknown,
    crossSubjectExpectedVsObservedMatch,
    crossSubjectExpectedVsObservedMatchHe:
      EXPECTED_VS_OBSERVED_MATCH_LABEL_HE[crossSubjectExpectedVsObservedMatch] ||
      EXPECTED_VS_OBSERVED_MATCH_LABEL_HE.not_enough_evidence,
    crossSubjectContinuationDecision,
    crossSubjectContinuationDecisionHe:
      RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE[crossSubjectContinuationDecision] ||
      RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE.continue_but_refine,
    subjectsWithClearCarryoverHe,
    subjectsNeedingFreshEvidenceHe,
    subjectsWherePriorPathSeemsMisalignedHe,
  };
}

const GATE_CROSS_PRIORITY_P13 = [
  "pivot_gate_visible",
  "recheck_gate_visible",
  "gates_not_ready",
  "mixed_gate_state",
  "release_gate_forming",
  "advance_gate_forming",
  "continue_gate_active",
];
const FOCUS_CROSS_PRIORITY_P13 = [
  "refresh_baseline_before_decision",
  "test_if_path_is_working",
  "stabilize_before_advance",
  "check_independence_before_release",
  "prepare_for_controlled_release",
  "prove_current_direction",
];
const TARGET_TYPE_CROSS_P13 = [
  "fresh_data_needed",
  "mixed_target",
  "response_confirmation",
  "mistake_reduction_confirmation",
  "retention_confirmation",
  "independence_confirmation",
  "accuracy_confirmation",
];
const WINDOW_CROSS_P13 = ["needs_fresh_baseline", "next_two_cycles", "next_short_cycle", "unknown"];

/**
 * Phase 13 — מה צריך לבדוק בהמשך בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase13Fields(subjects) {
  const gateVotes = {};
  const focusVotes = {};
  const targetVotes = {};
  const windowVotes = {};
  /** @type {string[]} */
  const subjectsNearReleaseButNotThereHe = [];
  /** @type {string[]} */
  const subjectsNeedingRecheckBeforeDecisionHe = [];
  /** @type {string[]} */
  const subjectsWithVisiblePivotTriggerHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const gs = String(s.subjectGateState || "").trim();
    if (gs) gateVotes[gs] = (gateVotes[gs] || 0) + 1;
    const nf = String(s.subjectNextCycleDecisionFocus || "").trim();
    if (nf) focusVotes[nf] = (focusVotes[nf] || 0) + 1;
    const tt = String(s.subjectEvidenceTargetType || "").trim();
    if (tt) targetVotes[tt] = (targetVotes[tt] || 0) + 1;
    const tw = String(s.subjectTargetObservationWindow || "").trim();
    if (tw) windowVotes[tw] = (windowVotes[tw] || 0) + 1;
    const lab = SUBJECT_LABEL_HE[sid];
    if (
      gs === "release_gate_forming" &&
      s.subjectFollowThroughSignal !== "likely_followed" &&
      subjectsNearReleaseButNotThereHe.length < 5
    ) {
      subjectsNearReleaseButNotThereHe.push(
        `${lab}: יש סימנים טובים, אבל כדאי לראות עוד הצלחה קצרה בלי עזרה לפני שמפחיתים תמיכה.`
      );
    }
    if (
      (gs === "recheck_gate_visible" || nf === "refresh_baseline_before_decision") &&
      subjectsNeedingRecheckBeforeDecisionHe.length < 5
    ) {
      subjectsNeedingRecheckBeforeDecisionHe.push(`${lab}: כדאי סבב תצפית/נתון עדכני לפני החלטה מהותית.`);
    }
    if (gs === "pivot_gate_visible" && subjectsWithVisiblePivotTriggerHe.length < 5) {
      subjectsWithVisiblePivotTriggerHe.push(`${lab}: אם הסבב הבא חוזר על אותו דפוס בלי שיפור - כדאי לשקול שינוי כיוון זהיר.`);
    }
  }

  let crossSubjectGateState = "gates_not_ready";
  const gSum = Object.values(gateVotes).reduce((a, b) => a + b, 0);
  if (gSum > 0) {
    for (const id of GATE_CROSS_PRIORITY_P13) {
      if ((gateVotes[id] || 0) > 0) {
        crossSubjectGateState = id;
        break;
      }
    }
  }

  let crossSubjectNextCycleDecisionFocus = "prove_current_direction";
  const fSum = Object.values(focusVotes).reduce((a, b) => a + b, 0);
  if (fSum > 0) {
    for (const id of FOCUS_CROSS_PRIORITY_P13) {
      if ((focusVotes[id] || 0) > 0) {
        crossSubjectNextCycleDecisionFocus = id;
        break;
      }
    }
  }

  let crossSubjectEvidenceTargetType = "mixed_target";
  const tSum = Object.values(targetVotes).reduce((a, b) => a + b, 0);
  if (tSum > 0) {
    for (const id of TARGET_TYPE_CROSS_P13) {
      if ((targetVotes[id] || 0) > 0) {
        crossSubjectEvidenceTargetType = id;
        break;
      }
    }
  }

  let crossSubjectTargetObservationWindow = "unknown";
  const wSum = Object.values(windowVotes).reduce((a, b) => a + b, 0);
  if (wSum > 0) {
    for (const id of WINDOW_CROSS_P13) {
      if ((windowVotes[id] || 0) > 0) {
        crossSubjectTargetObservationWindow = id;
        break;
      }
    }
  }

  return {
    crossSubjectGateState,
    crossSubjectGateStateLabelHe: GATE_STATE_LABEL_HE[crossSubjectGateState] || GATE_STATE_LABEL_HE.gates_not_ready,
    crossSubjectNextCycleDecisionFocus,
    crossSubjectNextCycleDecisionFocusHe:
      NEXT_CYCLE_DECISION_FOCUS_LABEL_HE[crossSubjectNextCycleDecisionFocus] ||
      NEXT_CYCLE_DECISION_FOCUS_LABEL_HE.prove_current_direction,
    crossSubjectEvidenceTargetType,
    crossSubjectEvidenceTargetTypeLabelHe:
      TARGET_EVIDENCE_TYPE_LABEL_HE[crossSubjectEvidenceTargetType] || TARGET_EVIDENCE_TYPE_LABEL_HE.mixed_target,
    crossSubjectTargetObservationWindow,
    crossSubjectTargetObservationWindowLabelHe:
      TARGET_OBSERVATION_WINDOW_LABEL_HE[crossSubjectTargetObservationWindow] ||
      TARGET_OBSERVATION_WINDOW_LABEL_HE.unknown,
    subjectsNearReleaseButNotThereHe,
    subjectsNeedingRecheckBeforeDecisionHe,
    subjectsWithVisiblePivotTriggerHe,
  };
}

const DEP_CROSS_PRIORITY_P14 = [
  "likely_foundational_block",
  "mixed_dependency_signal",
  "insufficient_dependency_evidence",
  "likely_local_issue",
];
const BLOCKER_CROSS_PRIORITY_P14 = [
  "retention_instability",
  "independence_readiness_gap",
  "accuracy_foundation_gap",
  "instruction_language_load",
  "procedure_automaticity_gap",
  "unknown",
];

/**
 * Phase 14 — מאיפה מתחיל הקושי בכמה מקצועות.
 * @param {Record<string, unknown>} subjects
 */
function buildCrossSubjectPhase14Fields(subjects) {
  const depVotes = {};
  const blockerVotes = {};
  let downstreamHigh = 0;
  let downstreamMod = 0;
  let foundationFirstSubjects = 0;
  /** @type {string[]} */
  const subjectsLikelyShowingDownstreamSymptomsHe = [];
  /** @type {string[]} */
  const subjectsNeedingFoundationFirstHe = [];
  /** @type {string[]} */
  const subjectsSafeForLocalInterventionHe = [];

  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const ds = String(s.subjectDependencyState || "").trim();
    if (ds) depVotes[ds] = (depVotes[ds] || 0) + 1;
    const bk = String(s.subjectLikelyFoundationalBlocker || "").trim();
    if (bk) blockerVotes[bk] = (blockerVotes[bk] || 0) + 1;
    const dr = String(s.subjectDownstreamSymptomRisk || "").trim();
    if (dr === "high") downstreamHigh += 1;
    else if (dr === "moderate") downstreamMod += 1;
    if (s.subjectFoundationFirstPriority) foundationFirstSubjects += 1;
    const lab = SUBJECT_LABEL_HE[sid];
    if (
      (ds === "likely_foundational_block" || dr === "high") &&
      subjectsLikelyShowingDownstreamSymptomsHe.length < 5
    ) {
      subjectsLikelyShowingDownstreamSymptomsHe.push(
        `${lab}: ייתכן שהקושי הנראה קשור גם לבסיס - לא רק לנקודה אחת בנושא.`
      );
    }
    if (s.subjectFoundationFirstPriority && subjectsNeedingFoundationFirstHe.length < 5) {
      subjectsNeedingFoundationFirstHe.push(`${lab}: כדאי לפתוח קודם ייצוב בסיס קצר - ואז לחדד במקצוע.`);
    }
    if (ds === "likely_local_issue" && subjectsSafeForLocalInterventionHe.length < 5) {
      subjectsSafeForLocalInterventionHe.push(`${lab}: נראה שהקושי ממוקד בנושא הזה - אפשר לתרגל אותו בלי להרחיב יותר מדי.`);
    }
  }

  let crossSubjectDependencyState = "insufficient_dependency_evidence";
  const dSum = Object.values(depVotes).reduce((a, b) => a + b, 0);
  if (dSum > 0) {
    for (const id of DEP_CROSS_PRIORITY_P14) {
      if ((depVotes[id] || 0) > 0) {
        crossSubjectDependencyState = id;
        break;
      }
    }
  }

  let crossSubjectLikelyFoundationalBlocker = "unknown";
  const bSum = Object.values(blockerVotes).reduce((a, b) => a + b, 0);
  if (bSum > 0) {
    for (const id of BLOCKER_CROSS_PRIORITY_P14) {
      if ((blockerVotes[id] || 0) > 0) {
        crossSubjectLikelyFoundationalBlocker = id;
        break;
      }
    }
  }

  const crossSubjectFoundationFirstPriority = foundationFirstSubjects >= 2 || downstreamHigh >= 2;
  const crossSubjectFoundationFirstPriorityHe = crossSubjectFoundationFirstPriority
    ? "בכמה מקצועות כדאי לחזק קודם בסיס לפני הרחבה או ליטוש עמוק."
    : "ברוב המקצועות הקושי נראה ממוקד או שהמידע עדיין חלקי - לא צריך להסיק שיש קושי רחב בכל המקצועות.";

  return {
    crossSubjectDependencyState,
    crossSubjectDependencyStateLabelHe:
      DEPENDENCY_STATE_LABEL_HE[crossSubjectDependencyState] ||
      DEPENDENCY_STATE_LABEL_HE.insufficient_dependency_evidence,
    crossSubjectLikelyFoundationalBlocker,
    crossSubjectLikelyFoundationalBlockerLabelHe:
      FOUNDATIONAL_BLOCKER_LABEL_HE[crossSubjectLikelyFoundationalBlocker] ||
      FOUNDATIONAL_BLOCKER_LABEL_HE.unknown,
    crossSubjectFoundationFirstPriority,
    crossSubjectFoundationFirstPriorityHe,
    subjectsLikelyShowingDownstreamSymptomsHe,
    subjectsNeedingFoundationFirstHe,
    subjectsSafeForLocalInterventionHe,
  };
}

/**
 * Phase 8 — סולם עדיפויות הורי בכמה מקצועות (1–2 פעולות מיידיות מרכזיות).
 * @param {Record<string, unknown>} subjects
 * @param {Array<{ subject: string, questionCount?: number }>} subjectCoverage
 */
function buildParentPriorityLadderPhase8(subjects, subjectCoverage) {
  const ranked = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s || typeof s !== "object") continue;
    const cov = Array.isArray(subjectCoverage) ? subjectCoverage.find((c) => c.subject === sid) : null;
    const qc = Number(cov?.questionCount) || 0;
    let score = 0;
    if (s.subjectMonitoringOnly) score -= 42;
    const pl = String(s.subjectPriorityLevel || "");
    if (pl === "immediate") score += 55;
    else if (pl === "soon") score += 28;
    else if (pl === "maintain") score += 14;
    else if (pl === "monitor") score -= 8;
    if (s.subjectConclusionReadiness === "ready") score += 18;
    else if (s.subjectConclusionReadiness === "partial") score += 6;
    else score -= 22;
    if (s.dominantRootCause === "knowledge_gap") score += 20;
    if (s.dominantRootCause === "weak_independence" || s.dominantRootCause === "instruction_friction") score += 12;
    score += Math.min(18, Math.floor(qc / 5));
    ranked.push({ sid, subjectLabelHe: SUBJECT_LABEL_HE[sid], score, s });
  }
  ranked.sort((a, b) => b.score - a.score);

  const eligible = ranked.filter((r) => r.score >= 20 && !r.s.subjectMonitoringOnly);
  const top = eligible[0] || ranked[0] || null;
  let second = eligible[1] || ranked.find((r) => r.sid !== top?.sid && r.score >= 10) || null;
  if (second && top && second.sid === top.sid) second = null;

  let topImmediateParentActionHe = "";
  if (top) {
    topImmediateParentActionHe = shortenHe(
      String(top.s.subjectImmediateActionHe || top.s.recommendedHomeMethodHe || top.s.subjectPriorityReasonHe || "").trim(),
      240
    );
  }

  let secondPriorityActionHe = "";
  if (second && top && second.sid !== top.sid) {
    secondPriorityActionHe = shortenHe(
      String(second.s.subjectDeferredActionHe || second.s.subjectImmediateActionHe || "").trim(),
      220
    );
  }

  const monitoringOnlyAreasHe = [];
  const deferForNowAreasHe = [];
  for (const r of ranked) {
    if (r.s.subjectMonitoringOnly && monitoringOnlyAreasHe.length < 5) {
      monitoringOnlyAreasHe.push(
        `${r.subjectLabelHe}: ${shortenHe(String(r.s.subjectPriorityReasonHe || "שגרת תרגול קצרה בשלב זה."), 120)}`
      );
    } else if (
      r.s.subjectPriorityLevel === "soon" &&
      r.sid !== top?.sid &&
      r.sid !== second?.sid &&
      deferForNowAreasHe.length < 4
    ) {
      deferForNowAreasHe.push(
        `${r.subjectLabelHe}: ${shortenHe(String(r.s.subjectDeferredActionHe || "להמתין עם שינוי מהותי."), 110)}`
      );
    }
  }

  const parentPriorityLadder = {
    version: 1,
    rankedSubjects: ranked.map(({ sid, subjectLabelHe, score, s: sub }) => ({
      subject: sid,
      subjectLabelHe,
      score: Math.round(score),
      priorityLevel: String(sub.subjectPriorityLevel || ""),
      monitoringOnly: !!sub.subjectMonitoringOnly,
    })),
  };

  return {
    parentPriorityLadder,
    topImmediateParentActionHe,
    secondPriorityActionHe,
    monitoringOnlyAreasHe,
    deferForNowAreasHe,
  };
}

function buildHomeFocusHe(subjects, topStrengthsAcrossHe, topFocusAreasHe, summary) {
  const focusLabels = topFocusAreasHe.slice(0, 2).filter(Boolean);
  const maintainRows = collectMaintainRows(subjects);
  let preservePhrase = null;
  if (maintainRows.length && maintainRows[0].labelHe) {
    const m = maintainRows[0];
    preservePhrase = `${m.labelHe} ב${m.subjectLabelHe}`;
  } else if (topStrengthsAcrossHe.length) {
    preservePhrase =
      topStrengthsAcrossHe[0].replace(/\s*\([^)]*\)\s*$/u, "").trim() || topStrengthsAcrossHe[0];
  }

  const q = Number(summary?.totalQuestions) || 0;
  const acc = Math.round(Number(summary?.overallAccuracy) || 0);

  if (focusLabels.length) {
    const cleaned = focusLabels.map(stripLeadingBenosheaHe).filter(Boolean);
    const joined = cleaned.join(" · ");
    const noun = cleaned.length > 1 ? "הנושאים" : "הנושא";
    return `השבוע מומלץ לשים דגש על ${noun} ${joined} - ההמלצה שלנו: תרגול משותף עם הילד. אחרי טעות, לקרוא שוב את השאלה, להיכנס לחלון התרגיל הקודם ולהבין ביחד איפה הטעות.`;
  }
  if (preservePhrase) {
    return `כדאי לשמור גם על תרגול רגוע סביב ${preservePhrase} - שם כבר יש בסיס טוב.`;
  }
  if (q < 18) {
    return "בתקופה שנבחרה עדיין נאסף מעט תרגול - שני תרגולים קצרים בשבוע יעזרו להבין את הכיוון טוב יותר בפעם הבאה.";
  }
  if (acc >= 78 && q >= 35) {
    return "הקצב הנוכחי נראה מאוזן - אפשר להמשיך כך ולהעמיק רק בנושאים שמופיעים למעלה ברשימת המיקוד.";
  }
  if (acc < 62 && q >= 18) {
    return "כדאי לייצב לאט: משימה ברורה לפני פתרון, ושבח קטן אחרי הצלחה קטנה.";
  }
  return "להמשיך על שגרת תרגול קבועה ורגועה, ולעקוב איך הדיוק והביטחון מתפתחים.";
}

function buildExecutiveSummary(subjects, summary, subjectCoverage, dataIntegrityReport) {
  const strengths = collectStrengthRows(subjects);
  const weaknesses = collectWeaknessRows(subjects);
  const crossRisks = aggregateCrossSubjectRisks(subjects);
  const globalRiskHeavy =
    crossRisks.falsePromotionRisk ||
    crossRisks.hintDependenceRisk ||
    crossRisks.recentTransitionRisk;

  let topStrengthsAcrossHe = uniqueTopLabels(strengths, "labelHe", 3);
  if (globalRiskHeavy && topStrengthsAcrossHe.length > 1) {
    topStrengthsAcrossHe = topStrengthsAcrossHe.slice(0, 2);
  }
  const rawMetricHe = deriveRawMetricStrengthLinesHe(summary);
  topStrengthsAcrossHe = mergeExecutiveStrengthLinesHe(rawMetricHe, topStrengthsAcrossHe, 5);
  const topFocusAreasHe = uniqueTopLabels(weaknesses, "labelHe", 3);

  const homeFocusHe = buildHomeFocusHe(subjects, topStrengthsAcrossHe, topFocusAreasHe, summary);
  const majorTrendsHe = buildMajorTrendsHe(subjects, subjectCoverage);
  const dominantCrossSubjectRisk = dominantCrossSubjectField(subjects, "dominantLearningRisk");
  const dominantCrossSubjectSuccessPattern = dominantCrossSubjectField(subjects, "dominantSuccessPattern");
  const domVol = dominantSubjectByVolume(subjectCoverage);
  const supportingSignals = {
    crossRiskFlags: crossRisks,
    dominantSubjectId: domVol?.subject ?? null,
    dominantSubjectLabelHe: domVol?.subjectLabelHe ?? null,
    dominantSubjectQuestionCount: Number(domVol?.questionCount) || 0,
    fragileSuccessRowsTotal: SUBJECT_IDS.reduce((s, sid) => s + (Number(subjects?.[sid]?.fragileSuccessRowCount) || 0), 0),
    stableMasteryRowsTotal: SUBJECT_IDS.reduce((s, sid) => s + (Number(subjects?.[sid]?.stableMasteryRowCount) || 0), 0),
    subjectsWithModeConcentrationNote: SUBJECT_IDS.filter((sid) => subjects?.[sid]?.modeConcentrationNoteHe).length,
    dataIntegrityIssueCount: Array.isArray(dataIntegrityReport?.issues) ? dataIntegrityReport.issues.length : 0,
  };

  const mainHomeRecommendationHe = pickMainHomeRecommendationHe(
    subjects,
    subjectCoverage,
    summary,
    topFocusAreasHe,
    topStrengthsAcrossHe
  );
  const cautionNoteHe = buildCautionNoteHe(crossRisks, subjects, dominantCrossSubjectRisk);
  const overallConfidenceHe = buildOverallConfidenceHe(subjectCoverage, crossRisks);
  const reportReadinessHe = buildReportReadinessHe(dataIntegrityReport, summary);
  const evidenceBalanceHe = buildEvidenceBalanceHe(subjects);
  const mixedSignalNoticeHe = buildMixedSignalNoticeHe(subjects, crossRisks, topStrengthsAcrossHe);
  const phase7Exec = buildCrossSubjectPhase7Fields(subjects, subjectCoverage);
  const phase8Ladder = buildParentPriorityLadderPhase8(subjects, subjectCoverage);
  const phase9Cross = buildCrossSubjectPhase9Fields(subjects);
  const phase10Cross = buildCrossSubjectPhase10Fields(subjects);
  const phase11Cross = buildCrossSubjectPhase11Fields(subjects);
  const phase12Cross = buildCrossSubjectPhase12Fields(subjects);
  const phase13Cross = buildCrossSubjectPhase13Fields(subjects);
  const phase14Cross = buildCrossSubjectPhase14Fields(subjects);

  return {
    version: 2,
    windowTotalQuestions: Number(summary.totalQuestions) || 0,
    topStrengthsAcrossHe,
    topFocusAreasHe,
    homeFocusHe,
    majorTrendsHe,
    mainHomeRecommendationHe,
    cautionNoteHe,
    overallConfidenceHe,
    dominantCrossSubjectRisk,
    dominantCrossSubjectRiskLabelHe: crossRiskLabelHe(dominantCrossSubjectRisk, subjects),
    dominantCrossSubjectSuccessPattern,
    dominantCrossSubjectSuccessPatternLabelHe: crossSuccessLabelHe(dominantCrossSubjectSuccessPattern, subjects),
    supportingSignals,
    mixedSignalNoticeHe,
    reportReadinessHe,
    evidenceBalanceHe,
    ...phase7Exec,
    ...phase8Ladder,
    ...phase9Cross,
    ...phase10Cross,
    ...phase11Cross,
    ...phase12Cross,
    ...phase13Cross,
    ...phase14Cross,
  };
}

function buildVisualMoledetGeographyCoverageRows(baseReport) {
  const split = splitMoledetGeographyReportForDisplay(baseReport);
  return [
    {
      subject: "moledet-visual",
      subjectLabelHe: VISUAL_STRAND_LABEL_HE.moledet,
      questionCount: split.moledetStats.questions,
      correctCount: split.moledetStats.correct,
      accuracy: split.moledetStats.accuracy,
      timeMinutes: split.moledetStats.minutes,
    },
    {
      subject: "geography-visual",
      subjectLabelHe: VISUAL_STRAND_LABEL_HE.geography,
      questionCount: split.geographyStats.questions,
      correctCount: split.geographyStats.correct,
      accuracy: split.geographyStats.accuracy,
      timeMinutes: split.geographyStats.minutes,
    },
  ];
}

function buildSubjectCoverage(baseReport) {
  const sum = baseReport?.summary || {};
  /** @type {Array<{ subject: string; subjectLabelHe: string; questionCount: number; correctCount: number; accuracy: number; timeMinutes: number }>} */
  const rows = [];
  for (const sid of SUBJECT_IDS) {
    if (sid === "moledet-geography") {
      rows.push(...buildVisualMoledetGeographyCoverageRows(baseReport));
      continue;
    }
    const [qk, ck, ak] = SUMMARY_Q[sid];
    const questions = Number(sum[qk]) || 0;
    const correct = Number(sum[ck]) || 0;
    const accuracy = Number(sum[ak]) || 0;
    const mapKey = REPORT_MAP_KEY[sid];
    const timeMinutes = sumTopicMapMinutes(baseReport?.[mapKey]);
    rows.push({
      subject: sid,
      subjectLabelHe: SUBJECT_LABEL_HE[sid],
      questionCount: questions,
      correctCount: correct,
      accuracy,
      timeMinutes,
    });
  }
  return rows;
}

function buildOverallSnapshot(baseReport, subjectCoverage) {
  const sum = baseReport?.summary || {};
  const practicedCoverage = filterSubjectCoverageWithEvidence(subjectCoverage);
  const sparseSubjectsHe = [];
  const notableSubjectsHe = [];
  for (const row of practicedCoverage) {
    if (row.questionCount > 0 && row.questionCount < 15) {
      sparseSubjectsHe.push(
        `${row.subjectLabelHe} - מספר שאלות נמוך (${row.questionCount} שאלות)`
      );
    }
    const isHighVolumeStrong = row.questionCount >= 40 && row.accuracy >= 85;
    const isMediumVolumeStrong = row.questionCount >= 18 && row.accuracy >= 88;
    if (isHighVolumeStrong || isMediumVolumeStrong) {
      notableSubjectsHe.push(
        `${row.subjectLabelHe} - נאספו ${row.questionCount} שאלות עם דיוק טוב (${row.accuracy}%)`
      );
    }
  }
  if (!notableSubjectsHe.length) {
    notableSubjectsHe.push("אין עדיין מקצוע בולט לפי כמות השאלות והדיוק - המשך תרגול יעשה את ההבדל.");
  }
  return {
    /** סה״כ זמן למידה בדקות (כמו ב V2 summary.totalTimeMinutes) */
    totalTime: Number(sum.totalTimeMinutes) || 0,
    totalQuestions: Number(sum.totalQuestions) || 0,
    overallAccuracy: Number(sum.overallAccuracy) || 0,
    learningTimeExclusiveBreakdown:
      sum.learningTimeExclusiveBreakdown && typeof sum.learningTimeExclusiveBreakdown === "object"
        ? sum.learningTimeExclusiveBreakdown
        : null,
    subjectCoverage: practicedCoverage,
    /** @deprecated use unpracticedSubjectsHe / sparseSubjectsHe */
    lowExposureSubjectsHe: [...sparseSubjectsHe],
    unpracticedSubjectsHe: [],
    sparseSubjectsHe,
    notableSubjectsHe,
  };
}

function buildCrossSubjectInsights(baseReport, subjects) {
  const bulletsHe = [];
  const coverage = buildSubjectCoverage(baseReport);
  const sparse = coverage.filter((c) => c.questionCount > 0 && c.questionCount < 10);
  if (sparse.length) {
    bulletsHe.push(
      `ב${sparse.map((s) => s.subjectLabelHe).join(", ")} עדיין יש מעט מידע - התמונה תתבהר אחרי עוד תרגול.`
    );
  }
  const wRows = collectWeaknessRows(subjects);
  const instr = wRows.filter((w) => /הוראות|ניסוח|קריאה/i.test(w.labelHe));
  if (instr.length >= 2) {
    bulletsHe.push(
      "בכמה מקצועות חוזרת אותה תמונה: קריאה זהירה של ניסוח המשימה לפני כתיבת התשובה. מומלץ לקבע בבית רגע קצר קבוע לזה."
    );
  }
  if (!bulletsHe.length) {
    bulletsHe.push("כרגע לא נראה דפוס שחוזר בכמה מקצועות - כשיתווסף עוד תרגול, הסעיף הזה יתעדכן.");
  }
  return {
    bulletsHe,
    dataQualityNoteHe:
      (baseReport?.summary?.totalQuestions || 0) < 30
        ? "מספר השאלות בתקופה נמוך - יש לקרוא את המסקנות הכלליות בעדינות."
        : null,
  };
}

function buildHomePlan(subjects) {
  const itemsHe = [];
  for (const sid of SUBJECT_IDS) {
    const pa = subjects?.[sid]?.parentActionHe;
    if (pa && String(pa).trim()) {
      itemsHe.push(
        `ב${SUBJECT_LABEL_HE[sid]}: ${rewriteParentRecommendationForDetailedHe(String(pa).trim())}`
      );
    }
    if (itemsHe.length >= 6) break;
  }
  if (!itemsHe.length) {
    itemsHe.push("עדיין אין המלצות ממוקדות מהמערכת - מומלץ להמשיך על שגרת תרגול קבועה.");
  }
  return { itemsHe };
}

function buildNextPeriodGoals(subjects) {
  const itemsHe = [];
  for (const sid of SUBJECT_IDS) {
    const g = subjects?.[sid]?.nextWeekGoalHe;
    if (g && String(g).trim()) {
      itemsHe.push(
        `ב${SUBJECT_LABEL_HE[sid]}: ${rewriteParentRecommendationForDetailedHe(String(g).trim())}`
      );
    }
    if (itemsHe.length >= 6) break;
  }
  if (!itemsHe.length) {
    itemsHe.push("כשיתווסף עוד תרגול בתקופה שנבחרה, יופיע כאן כיוון ברור יותר - עד אז עדיף לא להעמיס יעדים מיותרים.");
  }
  return { itemsHe };
}

function buildSubjectProfiles(baseReport) {
  const subjects = baseReport?.patternDiagnostics?.subjects;
  const analysis = baseReport?.analysis || {};
  const periodEndMs = baseReport?.endDate
    ? new Date(`${baseReport.endDate}T23:59:59.999`).getTime()
    : Date.now();
  const out = [];
  for (const sid of SUBJECT_IDS) {
    const s = subjects?.[sid];
    if (!s) continue;
    const stable = Array.isArray(s.stableExcellence) ? s.stableExcellence : [];
    const topicMap = baseReport?.[REPORT_MAP_KEY[sid]] || {};
    if (sid === "math" && topicMap && typeof topicMap === "object") {
      applyMathScopedParentDisplayNames(topicMap);
    }
    const topicRecommendations = attachNarrativeContractsToTopicRecommendations(
      sid,
      applyGateToTextClampToTopicRecommendations(
        buildTopicRecommendationsForSubject(
          sid,
          topicMap,
          analysis,
          undefined,
          periodEndMs,
          {
            parentTopicToneByKey:
              s.parentTopicToneByKey && typeof s.parentTopicToneByKey === "object" ? s.parentTopicToneByKey : {},
            parentStrengthWithCautionLinesByKey:
              s.parentStrengthWithCautionLinesByKey && typeof s.parentStrengthWithCautionLinesByKey === "object"
                ? s.parentStrengthWithCautionLinesByKey
                : {},
          }
        )
      )
    );
    out.push({
      subject: sid,
      subjectLabelHe: SUBJECT_LABEL_HE[sid],
      summaryHe: s.summaryHe ?? null,
      topStrengths: Array.isArray(s.topStrengths) ? s.topStrengths : [],
      topWeaknesses: Array.isArray(s.topWeaknesses) ? s.topWeaknesses : [],
      parentTopicToneByKey:
        s.parentTopicToneByKey && typeof s.parentTopicToneByKey === "object" ? s.parentTopicToneByKey : {},
      parentStrengthWithCautionLinesByKey:
        s.parentStrengthWithCautionLinesByKey && typeof s.parentStrengthWithCautionLinesByKey === "object"
          ? s.parentStrengthWithCautionLinesByKey
          : {},
      maintain: Array.isArray(s.maintain) ? s.maintain : [],
      improving: Array.isArray(s.improving) ? s.improving : [],
      excellence: stable,
      diagnosticSectionsHe: s.diagnosticSectionsHe ?? null,
      subSkillInsightsHe: Array.isArray(s.subSkillInsightsHe) ? s.subSkillInsightsHe : [],
      parentActionHe: s.parentActionHe ?? null,
      nextWeekGoalHe: s.nextWeekGoalHe ?? null,
      evidenceExamples: Array.isArray(s.evidenceExamples) ? s.evidenceExamples : [],
      /** כשתהיה השוואת תקופות אמיתית — ימולא; לא שולחים placeholder אל UI */
      trendVsPreviousPeriod: null,
      /** המלצות צעד הבא ברמת נושא — מנוע נפרד, מבוסס שורות V2 + טעויות */
      topicRecommendations,
      dominantLearningRisk: s.dominantLearningRisk ?? null,
      dominantSuccessPattern: s.dominantSuccessPattern ?? null,
      trendNarrativeHe: s.trendNarrativeHe ?? null,
      confidenceSummaryHe: s.confidenceSummaryHe ?? null,
      recommendedHomeMethodHe: s.recommendedHomeMethodHe ?? null,
      whatNotToDoHe: s.whatNotToDoHe ?? null,
      majorRiskFlagsAcrossRows: s.majorRiskFlagsAcrossRows ?? null,
      dominantBehaviorProfileAcrossRows: s.dominantBehaviorProfileAcrossRows ?? null,
      strongestPositiveTrendRowHe: s.strongestPositiveTrendRowHe ?? null,
      strongestCautionTrendRowHe: s.strongestCautionTrendRowHe ?? null,
      fragileSuccessRowCount: s.fragileSuccessRowCount ?? 0,
      stableMasteryRowCount: s.stableMasteryRowCount ?? 0,
      modeConcentrationNoteHe: s.modeConcentrationNoteHe ?? null,
      dominantLearningRiskLabelHe: s.dominantLearningRiskLabelHe ?? null,
      dominantSuccessPatternLabelHe: s.dominantSuccessPatternLabelHe ?? null,
      improvingButSupportedHe: s.improvingButSupportedHe ?? null,
      dominantRootCause: s.dominantRootCause ?? null,
      dominantRootCauseLabelHe: s.dominantRootCauseLabelHe ?? null,
      secondaryRootCause: s.secondaryRootCause ?? null,
      rootCauseDistribution: s.rootCauseDistribution && typeof s.rootCauseDistribution === "object" ? s.rootCauseDistribution : {},
      subjectDiagnosticRestraintHe: s.subjectDiagnosticRestraintHe ?? null,
      subjectConclusionReadiness: s.subjectConclusionReadiness ?? null,
      subjectInterventionPriorityHe: s.subjectInterventionPriorityHe ?? null,
      subjectPriorityLevel: s.subjectPriorityLevel ?? null,
      subjectPriorityReasonHe: s.subjectPriorityReasonHe ?? null,
      subjectImmediateActionHe: s.subjectImmediateActionHe ?? null,
      subjectDeferredActionHe: s.subjectDeferredActionHe ?? null,
      subjectMonitoringOnly: s.subjectMonitoringOnly ?? false,
      subjectDoNowHe: s.subjectDoNowHe ?? null,
      subjectAvoidNowHe: s.subjectAvoidNowHe ?? null,
      dominantMistakePattern: s.dominantMistakePattern ?? null,
      dominantMistakePatternLabelHe: s.dominantMistakePatternLabelHe ?? null,
      mistakePatternDistribution: s.mistakePatternDistribution && typeof s.mistakePatternDistribution === "object" ? s.mistakePatternDistribution : {},
      subjectLearningStage: s.subjectLearningStage ?? null,
      subjectLearningStageLabelHe: s.subjectLearningStageLabelHe ?? null,
      subjectRetentionRisk: s.subjectRetentionRisk ?? null,
      subjectTransferReadiness: s.subjectTransferReadiness ?? null,
      subjectMemoryNarrativeHe: s.subjectMemoryNarrativeHe ?? null,
      subjectReviewBeforeAdvanceHe: s.subjectReviewBeforeAdvanceHe ?? null,
      subjectResponseToIntervention: s.subjectResponseToIntervention ?? null,
      subjectResponseToInterventionLabelHe: s.subjectResponseToInterventionLabelHe ?? null,
      subjectSupportFit: s.subjectSupportFit ?? null,
      subjectSupportAdjustmentNeed: s.subjectSupportAdjustmentNeed ?? null,
      subjectSupportAdjustmentNeedHe: s.subjectSupportAdjustmentNeedHe ?? null,
      subjectConclusionFreshness: s.subjectConclusionFreshness ?? null,
      subjectRecalibrationNeed: s.subjectRecalibrationNeed ?? null,
      subjectRecalibrationNeedHe: s.subjectRecalibrationNeedHe ?? null,
      subjectEffectivenessNarrativeHe: s.subjectEffectivenessNarrativeHe ?? null,
      subjectSupportSequenceState: s.subjectSupportSequenceState ?? null,
      subjectSupportSequenceStateLabelHe: s.subjectSupportSequenceStateLabelHe ?? null,
      subjectStrategyRepetitionRisk: s.subjectStrategyRepetitionRisk ?? null,
      subjectStrategyFatigueRisk: s.subjectStrategyFatigueRisk ?? null,
      subjectNextBestSequenceStep: s.subjectNextBestSequenceStep ?? null,
      subjectNextBestSequenceStepHe: s.subjectNextBestSequenceStepHe ?? null,
      subjectAdviceNovelty: s.subjectAdviceNovelty ?? null,
      subjectRecommendationRotationNeed: s.subjectRecommendationRotationNeed ?? null,
      subjectSequenceNarrativeHe: s.subjectSequenceNarrativeHe ?? null,
      subjectRecommendationMemoryState: s.subjectRecommendationMemoryState ?? null,
      subjectPriorRecommendationSignature: s.subjectPriorRecommendationSignature ?? null,
      subjectSupportHistoryDepth: s.subjectSupportHistoryDepth ?? null,
      subjectRecommendationCarryover: s.subjectRecommendationCarryover ?? null,
      subjectExpectedVsObservedMatch: s.subjectExpectedVsObservedMatch ?? null,
      subjectFollowThroughSignal: s.subjectFollowThroughSignal ?? null,
      subjectContinuationDecision: s.subjectContinuationDecision ?? null,
      subjectContinuationDecisionHe: s.subjectContinuationDecisionHe ?? null,
      subjectOutcomeNarrativeHe: s.subjectOutcomeNarrativeHe ?? null,
      subjectGateState: s.subjectGateState ?? null,
      subjectGateStateLabelHe: s.subjectGateStateLabelHe ?? null,
      subjectGateReadiness: s.subjectGateReadiness ?? null,
      subjectNextCycleDecisionFocus: s.subjectNextCycleDecisionFocus ?? null,
      subjectNextCycleDecisionFocusHe: s.subjectNextCycleDecisionFocusHe ?? null,
      subjectEvidenceTargetType: s.subjectEvidenceTargetType ?? null,
      subjectTargetObservationWindow: s.subjectTargetObservationWindow ?? null,
      subjectGateNarrativeHe: s.subjectGateNarrativeHe ?? null,
      subjectDependencyState: s.subjectDependencyState ?? null,
      subjectDependencyStateLabelHe: s.subjectDependencyStateLabelHe ?? null,
      subjectLikelyFoundationalBlocker: s.subjectLikelyFoundationalBlocker ?? null,
      subjectLikelyFoundationalBlockerLabelHe: s.subjectLikelyFoundationalBlockerLabelHe ?? null,
      subjectDownstreamSymptomRisk: s.subjectDownstreamSymptomRisk ?? null,
      subjectFoundationFirstPriority: s.subjectFoundationFirstPriority ?? false,
      subjectFoundationFirstPriorityHe: s.subjectFoundationFirstPriorityHe ?? null,
      subjectDependencyNarrativeHe: s.subjectDependencyNarrativeHe ?? null,
    });
  }
  return out;
}

function groupV2UnitsBySubject(diag) {
  const grouped = {};
  for (const sid of SUBJECT_IDS) grouped[sid] = [];
  const units = Array.isArray(diag?.units) ? diag.units : [];
  for (const u of units) {
    const sid = String(u?.subjectId || "");
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(u);
  }
  return grouped;
}

/**
 * @param {object} u — diagnosticEngineV2 unit
 * @param {object|null|undefined} mapRow — same-topic row from generateParentReportV2 maps (mathOperations / …Topics)
 */
function topicOverviewPlacementFromUnit(u, mapRow) {
  const tier = parentTopicTierFromUnit(u, mapRow);
  return {
    parentTier: tier,
    overviewStatusHe: parentTopicTierLabelHe(tier),
    placementKind: parentTopicTierPlacementKind(tier),
  };
}

/**
 * @param {unknown} baseReport
 * @param {string} sid
 * @param {object[]} units
 * @param {Record<string, object>} topicMapForSid
 */
function buildTopicOverviewRowsFromUnits(baseReport, sid, units, topicMapForSid) {
  return (units || [])
    .filter((u) => (Number(u?.evidenceTrace?.[0]?.value?.questions) || 0) > 0)
    .map((u) => {
      const trk = String(u?.topicRowKey || "");
      const gk = gradeKeyForV2UnitFromReport(baseReport, u);
      const ge = buildGradeEvidenceFields(baseReport?.registeredGradeKey, gk);
      const labels = parentFacingDisplayLabelsForV2Unit(baseReport, u);
      const mapR = topicMapForSid[trk];
      const place = topicOverviewPlacementFromUnit(u, mapR);
      const lpd = mapR?.learningPatternDecision || u?.learningPatternDecision || null;
      const metrics = normalizeParentVisibleMetrics(
        {
          questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
          accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
          correct: mapR?.correct,
          wrong: mapR?.wrong,
          parentVisibleMetrics: mapR?.parentVisibleMetrics,
        },
        mapR && typeof mapR === "object" ? mapR : null,
      );
      return {
        topicRowKey: trk,
        subjectId: sid,
        displayName: String(u?.displayName || "").trim(),
        narrativeTitleHe: labels.titleHe,
        gradeRelationSublineHe: labels.gradeRelationSublineHe,
        questions: metrics.questions,
        correct: metrics.correct,
        wrong: metrics.wrong,
        accuracy: metrics.accuracy,
        parentVisibleMetrics: metrics,
        timeMinutes: Number(mapR?.timeMinutes) || 0,
        parentTier: place.parentTier,
        overviewStatusHe: place.overviewStatusHe,
        placementKind: place.placementKind,
        learningPatternDecision: lpd,
        parentVisibleFinding: lpd?.parentVisibleFinding || "",
        rowIdentityV1: buildRowIdentityV1({
          subjectId: sid,
          topicRowKey: trk,
          displayName: String(u?.displayName || ""),
          contentGradeKey: gk,
          registeredGradeKey: baseReport?.registeredGradeKey,
          gradeRelation: ge.gradeRelation,
          questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
          accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
          timeSpentMinutes: Number(mapR?.timeMinutes) || 0,
        }),
      };
    })
    .sort((a, b) => (Number(b.questions) || 0) - (Number(a.questions) || 0));
}

/**
 * @param {Record<string, unknown>} rec
 * @param {string} subjectLabelHe
 */
function applyTopicOwnerCopyToRecommendation(rec, subjectLabelHe = "") {
  const row = {
    ...rec,
    subjectLabelHe,
    label: rec.displayName || rec.narrativeTitleHe,
  };
  const ownerFinding = resolveTopicRecommendationOwnerCopyHe(row, "finding");
  const ownerStep = resolveTopicRecommendationOwnerCopyHe(row, "stepLabel");
  const ownerPlan = resolveTopicRecommendationOwnerCopyHe(row, "interventionPlan");
  const ownerDoNow = resolveTopicRecommendationOwnerCopyHe(row, "doNow");
  const ownerCaution = resolveTopicRecommendationOwnerCopyHe(row, "caution");

  if (ownerFinding) rec.parentVisibleFinding = guardParentFacingText(ownerFinding);
  if (ownerStep) rec.recommendedStepLabelHe = guardParentFacingText(ownerStep);
  if (ownerPlan) rec.interventionPlanHe = guardParentFacingText(ownerPlan);
  if (ownerDoNow) rec.doNowHe = guardParentFacingText(ownerDoNow);
  // Owner RECOMMENDATION_CAUTION replaces legacy gated caution when caution is shown.
  if (ownerCaution && rec.cautionLineHe) {
    rec.cautionLineHe = guardParentFacingText(ownerCaution);
  }
  return rec;
}

function recommendationFromV2Unit(u, mapRow, reportMeta = {}) {
  const traces = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
  const volume = traces.find((t) => String(t?.type || "") === "volume")?.value || {};
  const recurrence = u?.recurrence && typeof u.recurrence === "object" ? u.recurrence : {};
  const questions =
    Number(volume?.questions)
    || Number(recurrence?.totalQuestions)
    || 0;
  const accuracy =
    Number(volume?.accuracy)
    || (questions > 0
      ? Math.round((Number(volume?.correct) || 0) * 100 / Math.max(questions, 1))
      : 0);
  const mistakeEventCount =
    Number(recurrence?.wrongCountForRules)
    || Number(volume?.wrong)
    || 0;
  const step = u?.intervention
    ? "remediate_same_level"
    : u?.probe
      ? "maintain_and_strengthen"
      : "maintain_and_strengthen";
  const label =
    step === "remediate_same_level"
      ? "לחזק לפני שמתקדמים"
      : "צריך עוד שאלות";
  const confLev = String(u?.confidence?.level || "");
  let evidenceStrength = "low";
  if (confLev === "moderate") evidenceStrength = "medium";
  if (confLev === "high") evidenceStrength = "strong";
  const gated = !!u?.outputGating?.cannotConcludeYet;
  const cautionAdditive = !!u?.outputGating?.additiveCautionAllowed && !gated;
  const topicKey = String(u?.topicRowKey || "");
  const subjectId = String(u?.subjectId || "__unknown_subject__");
  const gatingContracts =
    u?.outputGating?.contractsV1 && typeof u.outputGating.contractsV1 === "object"
      ? u.outputGating.contractsV1
      : null;
  const baseDecision =
    gatingContracts?.decision && typeof gatingContracts.decision === "object" ? gatingContracts.decision : {};
  const baseReadiness =
    gatingContracts?.readiness && typeof gatingContracts.readiness === "object" ? gatingContracts.readiness : {};
  const baseConfidence =
    gatingContracts?.confidence && typeof gatingContracts.confidence === "object" ? gatingContracts.confidence : {};
  const cs = u?.canonicalState;
  const canonicalReadiness = cs?.assessment?.readiness || String(baseReadiness?.readiness || "insufficient");
  const canonicalConfidenceBand = (() => {
    const cl = cs?.assessment?.confidenceLevel;
    if (cl === "high") return "high";
    if (cl === "moderate") return "medium";
    return "low";
  })();
  const canonicalDecisionTier = cs?.assessment?.decisionTier ?? (Number(baseDecision?.decisionTier) || 0);

  const mapCv = mapRow?.contractsV1 && typeof mapRow.contractsV1 === "object" ? mapRow.contractsV1 : null;
  const mapEvidence = mapCv?.evidence && typeof mapCv.evidence === "object" ? mapCv.evidence : null;
  const mapEvidenceValidation =
    mapCv?.evidenceValidation && typeof mapCv.evidenceValidation === "object" ? mapCv.evidenceValidation : null;

  let outQuestions = questions;
  let outAccuracy = accuracy;
  if (mapEvidence) {
    const qc = Number(mapEvidence.questionCount);
    const ap = Number(mapEvidence.accuracyPct);
    if (Number.isFinite(qc) && qc >= 0) outQuestions = Math.round(qc);
    if (Number.isFinite(ap)) outAccuracy = Math.max(0, Math.min(100, Math.round(ap)));
  }

  const gateReadiness =
    outQuestions >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate
      ? canonicalReadiness === "ready"
        ? "ready"
        : "moderate"
      : outQuestions >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion
        ? canonicalReadiness === "ready"
          ? "ready"
          : canonicalReadiness === "forming"
            ? "moderate"
            : "insufficient"
        : canonicalReadiness === "ready"
          ? "ready"
          : canonicalReadiness === "forming"
            ? "moderate"
            : "insufficient";
  const priorityLevel = String(u?.priority?.level || "");
  const priorityScore =
    Number(u?.priority?.score)
    || PRIORITY_SCORE_BY_LEVEL[priorityLevel]
    || 0;
  const rowSignalSuff = String(u?.confidence?.rowSignals?.dataSufficiencyLevel || "medium").toLowerCase();
  const dataSufficiencyLevel = resolveRowDataSufficiencyLevel(
    outQuestions,
    rowSignalSuff,
    evidenceStrength,
  );
  const effectiveReadiness = resolveParentTopicReadiness(outQuestions, gateReadiness);
  const effectiveConfidenceBand = resolveParentTopicConfidenceBand(
    outQuestions,
    outAccuracy,
    canonicalConfidenceBand,
  );
  const thinEvidenceDowngraded = shouldThinEvidenceDowngradeRecommendation({
    questionCount: outQuestions,
    dataSufficiencyLevel,
    gateReadiness: effectiveReadiness,
    evidenceStrength,
  });
  const hasSubskillMetadata = resolveHasSubskillMetadataFromRowSources(u, mapRow);
  const rowGkFromTopicKeyEarly = (() => {
    if (!topicKey) return null;
    const parsed = splitTopicRowKey(topicKey);
    const g = parsed?.gradeScope;
    if (g != null && String(g).trim() !== "" && String(g).trim() !== "unknown") {
      return String(g).trim();
    }
    const gradeSep = "::grade:";
    if (topicKey.includes(gradeSep)) return topicKey.split(gradeSep)[1] || null;
    return null;
  })();
  const rowGkForIdentity =
    mapRow && typeof mapRow === "object" && mapRow.gradeKey != null && String(mapRow.gradeKey).trim()
      ? String(mapRow.gradeKey).trim()
      : rowGkFromTopicKeyEarly;
  const geForIdentity = buildGradeEvidenceFields(reportMeta?.registeredGradeKey, rowGkForIdentity);
  const cannotConcludeYet =
    gated && !(outQuestions >= TOPIC_REC_MIN_ACTIONABLE_QUESTIONS && dataSufficiencyLevel === "strong");

  const contractsV1 = {
    ...(gatingContracts || {}),
    decision: {
      ...baseDecision,
      contractVersion: String(baseDecision?.contractVersion || "v1"),
      topicKey: topicKey || String(baseDecision?.topicKey || "__unknown_topic__"),
      subjectId,
      decisionTier: canonicalDecisionTier,
      cannotConcludeYet,
    },
    readiness: {
      ...baseReadiness,
      contractVersion: String(baseReadiness?.contractVersion || "v1"),
      topicKey: topicKey || String(baseReadiness?.topicKey || "__unknown_topic__"),
      subjectId,
      readiness: effectiveReadiness,
    },
    confidence: {
      ...baseConfidence,
      contractVersion: String(baseConfidence?.contractVersion || "v1"),
      topicKey: topicKey || String(baseConfidence?.topicKey || "__unknown_topic__"),
      subjectId,
      confidenceBand: effectiveConfidenceBand,
    },
  };
  if (mapEvidence) {
    contractsV1.evidence = {
      ...mapEvidence,
      skillBreakdownAvailable: hasSubskillMetadata,
    };
    if (mapEvidenceValidation) {
      contractsV1.evidenceValidation = {
        ok: !!mapEvidenceValidation.ok,
        errors: Array.isArray(mapEvidenceValidation.errors) ? [...mapEvidenceValidation.errors] : [],
      };
    }
  } else if (hasSubskillMetadata) {
    contractsV1.evidence = { skillBreakdownAvailable: true };
  }

  const lpd = mapRow?.learningPatternDecision || u?.learningPatternDecision || null;
  const parentVisibleMetrics = normalizeParentVisibleMetrics(
    {
      questions: outQuestions,
      accuracy: outAccuracy,
      correct: mapRow?.correct,
      wrong: mapRow?.wrong,
      parentVisibleMetrics: mapRow?.parentVisibleMetrics,
    },
    mapRow && typeof mapRow === "object" ? mapRow : null,
  );
  const topicEngineContract =
    lpd?.[EDC_CONTRACT_KEY] ||
    mapRow?.[EDC_CONTRACT_KEY] ||
    u?.[EDC_CONTRACT_KEY] ||
    buildParentReportEngineDecisionContract({
      subjectId,
      topicRowKey: topicKey,
      topicName: String(u?.displayName || mapRow?.displayName || ""),
      row: mapRow && typeof mapRow === "object" ? mapRow : {},
      unit: u,
    });
  const contractRequiresRemediate =
    topicEngineContract.recommendedAction === RA_REMEDIATE_SAME_LEVEL;
  const finalStep = contractRequiresRemediate
    ? RA_REMEDIATE_SAME_LEVEL
    : thinEvidenceDowngraded &&
        topicEngineContract[EDC_DECISION_FIELD] !== ED_CLEAR_TOPIC_GAP &&
        topicEngineContract[EDC_DECISION_FIELD] !== ED_TOPIC_NEEDS_STRENGTHENING
      ? RA_MAINTAIN_AND_STRENGTHEN
      : topicEngineContract.recommendedAction === RA_WATCH
        ? RA_MAINTAIN_AND_STRENGTHEN
        : step;
  const gradeRelation = geForIdentity.gradeRelation;
  let finalLabelRaw =
    finalStep === "remediate_same_level"
      ? "לחזק לפני שמתקדמים"
      : outQuestions >= TOPIC_REC_MIN_ACTIONABLE_QUESTIONS
        ? "לחזק לפי מה שחוזר"
        : "צריך עוד שאלות";
  if (suppressRegisteredGradeStrengthenCopy(gradeRelation)) {
    finalLabelRaw = resolveGradeAwareRecommendationStepLabelHe(gradeRelation, finalLabelRaw);
  }
  const finalLabel =
    sanitizeParentSurfaceTextHe(finalLabelRaw, { subjectId }) ||
    (suppressRegisteredGradeStrengthenCopy(gradeRelation)
      ? resolveGradeAwareRecommendationStepLabelHe(gradeRelation, "")
      : finalStep === "remediate_same_level"
        ? "לחזק לפני שמתקדמים"
        : "לחזק לפי מה שחוזר");
  const conclusionStrength = cannotConcludeYet
    ? "withheld"
    : canonicalDecisionTier >= 3
      ? "strong"
      : canonicalDecisionTier >= 2
        ? "moderate"
        : "tentative";
  const rowGkFromTopicKey = (() => {
    if (!topicKey) return null;
    const parsed = splitTopicRowKey(topicKey);
    const g = parsed?.gradeKey;
    return g != null && String(g).trim() !== "" ? String(g).trim() : null;
  })();
  const rowGkForRec =
    mapRow && typeof mapRow === "object" && mapRow.gradeKey != null && String(mapRow.gradeKey).trim()
      ? String(mapRow.gradeKey).trim()
      : rowGkFromTopicKey;
  const rec = {
    topicRowKey: topicKey,
    topicKey,
    subjectId,
    subjectLabelHe: SUBJECT_LABEL_HE[subjectId] || "",
    displayName: String(u?.displayName || "").trim(),
    learningPatternDecision: lpd,
    [EDC_CONTRACT_KEY]: topicEngineContract,
    parentVisibleFinding:
      topicEngineContract.parentSafeFinding || lpd?.parentVisibleFinding || "",
    parentWordingLevel: lpd?.parentWordingLevel || "no_parent_text",
    topicStatus: lpd?.topicStatus || null,
    findingType: lpd?.findingType || null,
    narrativeTitleHe: reportMeta?.baseReport
      ? parentFacingDisplayLabelsForV2Unit(reportMeta.baseReport, u).titleHe
      : String(u?.displayName || "").trim(),
    gradeRelationSublineHe: reportMeta?.baseReport
      ? parentFacingDisplayLabelsForV2Unit(reportMeta.baseReport, u).gradeRelationSublineHe
      : null,
    gradeRelation,
    topicStateId: cs?.topicStateId || null,
    stateHash: cs?.stateHash || null,
    recommendedNextStep: finalStep,
    recommendedStepLabelHe: finalLabel,
    questions: parentVisibleMetrics.questions,
    correct: parentVisibleMetrics.correct,
    wrong: parentVisibleMetrics.wrong,
    accuracy: parentVisibleMetrics.accuracy,
    parentVisibleMetrics,
    mapRow: mapRow && typeof mapRow === "object" ? mapRow : null,
    trendV1:
      mapRow && typeof mapRow === "object" && mapRow.trendV1 && typeof mapRow.trendV1 === "object"
        ? mapRow.trendV1
        : null,
    mistakeEventCount,
    dataSufficiencyLevel,
    isEarlySignalOnly: Boolean(u?.confidence?.rowSignals?.isEarlySignalOnly),
    evidenceStrength,
    confidenceLevel: confLev,
    gateReadiness,
    gateState: gated ? "gates_not_ready" : "continue_gate_active",
    conclusionStrength,
    suppressAggressiveStep: gated,
    whyThisRecommendationHe: null,
    interventionPlanHe:
      resolveUnitNextGoalHe(u, rowGkForRec, { omitRawDiagnosticFallback: true })
      ?? "",
    doNowHe:
      resolveUnitParentActionHe(u, rowGkForRec, { omitRawDiagnosticFallback: true })
      ?? "",
    avoidNowHe: null,
    cautionLineHe:
      u?.outputGating?.cannotConcludeYet || cautionAdditive
        ? topicRecommendationV2CautionGatedHe()
        : "",
    topicEngineRowSignals: {
      confidenceLevel: u?.confidence?.level || null,
      priorityLevel: u?.priority?.level || null,
      gating: (() => {
        const raw = u?.outputGating && typeof u.outputGating === "object" ? { ...u.outputGating } : null;
        if (!raw) return null;
        for (const k of Object.keys(raw)) {
          if (k.startsWith("_deprecated")) delete raw[k];
        }
        return raw;
      })(),
    },
    _priorityScore: priorityScore,
    _priorityLevel: priorityLevel || null,
    thinEvidenceDowngraded,
    hasSubskillMetadata,
    rowIdentityV1: buildRowIdentityV1({
      subjectId,
      topicRowKey: topicKey,
      displayName: String(u?.displayName || ""),
      contentGradeKey: rowGkForIdentity,
      registeredGradeKey: reportMeta?.registeredGradeKey ?? null,
      gradeRelation: geForIdentity.gradeRelation,
      questions: parentVisibleMetrics.questions,
      accuracy: parentVisibleMetrics.accuracy,
      correct: parentVisibleMetrics.correct,
      timeSpentMinutes: mapRow?.timeMinutes,
      latestActivityAt: mapRow?.latestActivityAt || mapRow?.lastAnswerAt || null,
      dataSufficiencyLevel,
      thinEvidenceDowngraded,
      hasSubskillMetadata,
      recommendedStepLabelHe: finalLabel,
      diagnosticPatternHe: parentFacingPatternLabelHe(u) || null,
      evidenceSources: Array.isArray(mapRow?.evidenceSources) ? mapRow.evidenceSources : null,
      primaryEvidenceSource:
        typeof mapRow?.primaryEvidenceSource === "string" ? mapRow.primaryEvidenceSource : null,
      evidenceSourceCounts:
        mapRow?.evidenceSourceCounts && typeof mapRow.evidenceSourceCounts === "object"
          ? mapRow.evidenceSourceCounts
          : null,
    }),
    threshold_policy_used: `topic_recommendation_questions>=${TOPIC_REC_MIN_ACTIONABLE_QUESTIONS}`,
    contractsV1,
  };
  return applyTopicOwnerCopyToRecommendation(rec, SUBJECT_LABEL_HE[subjectId] || "");
}

/**
 * Subject anchor aligned with short-report summarizeV2UnitsForSubject (weak chain → ranked strength → units[0]).
 * @param {object[]} units
 * @param {(u: object) => unknown} csOf
 */
function selectSubjectAnchorUnitForV2Profile(units, csOf) {
  const actionOf = (u) => csOf(u)?.actionState || "withhold";
  const diagnosed = units.filter((u) => !!u?.diagnosis?.allowed);
  const weakLikeShort =
    diagnosed.find((u) => String(u?.priority?.level || "") === "P4") ||
    diagnosed.find((u) => String(u?.priority?.level || "") === "P3") ||
    diagnosed[0] ||
    null;
  if (weakLikeShort) return weakLikeShort;
  const strengthUnits = units.filter((u) => actionOf(u) === "maintain" || actionOf(u) === "expand_cautiously");
  const POSITIVE_LEVEL_RANK_D = { excellent: 3, very_good: 2, good: 1, none: 0 };
  const rankPosD = (a, b) => {
    const la = csOf(a)?.evidence?.positiveAuthorityLevel || "none";
    const lb = csOf(b)?.evidence?.positiveAuthorityLevel || "none";
    return (POSITIVE_LEVEL_RANK_D[lb] || 0) - (POSITIVE_LEVEL_RANK_D[la] || 0);
  };
  const rankedPositiveD = [...strengthUnits].sort(rankPosD);
  if (rankedPositiveD[0]) return rankedPositiveD[0];
  return units[0] || null;
}

function attachNarrativeContractsToTopicRecommendations(subjectId, topicRecommendations) {
  const list = Array.isArray(topicRecommendations) ? topicRecommendations : [];
  return list.map((tr) => {
    const narrativeContract = buildNarrativeContractV1({
      ...tr,
      subjectId: tr?.subjectId || subjectId,
      topicKey: tr?.topicKey || tr?.topicRowKey,
      hasSubskillMetadata:
        tr?.hasSubskillMetadata === true ||
        tr?.contractsV1?.evidence?.skillBreakdownAvailable === true,
      contractsV1: tr?.contractsV1 && typeof tr.contractsV1 === "object" ? tr.contractsV1 : {},
      cannotConcludeYet:
        tr?.cannotConcludeYet === true ||
        tr?.suppressAggressiveStep === true ||
        String(tr?.conclusionStrength || "") === "withheld" ||
        String(tr?.conclusionStrength || "") === "tentative",
    });
    const validation = validateNarrativeContractV1(narrativeContract);
    return applyNarrativeContractToRecord(tr, narrativeContract, validation);
  });
}

function applyNarrativeConsistencyToExecutiveSummary(executiveSummary, subjectProfiles) {
  const es = executiveSummary && typeof executiveSummary === "object" ? executiveSummary : {};
  const profiles = Array.isArray(subjectProfiles) ? subjectProfiles : [];
  const topicRows = profiles.flatMap((sp) => (Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : []));
  const restrainedRows = topicRows.filter((tr) => {
    const envelope = String(tr?.contractsV1?.narrative?.wordingEnvelope || "");
    return envelope === "WE0" || envelope === "WE1";
  });
  if (restrainedRows.length === 0) return es;
  const totalSubjectQ = profiles.reduce((acc, sp) => acc + (Number(sp?.subjectQuestionCount) || 0), 0);
  const restrainedLine =
    totalSubjectQ >= 120
      ? "בחלק מהנושאים עדיין יש מה לחזק - נשארים בצעדים קטנים ובוחנים שוב אחרי תרגול נוסף."
      : totalSubjectQ >= 60
        ? "בחלק מהנושאים התמונה עדיין לא סגורה לגמרי - נשארים בצעדים קטנים עד שמתבהר מה נשמר."
        : "בחלק מהנושאים המידע עדיין מצומצם - נשארים בצעדים קטנים עד להתבססות נתון נוסף.";
  const existingMain = String(es.mainHomeRecommendationHe || "").trim();
  if (existingMain) return es;
  return {
    ...es,
    mainHomeRecommendationHe: restrainedLine,
    cautionNoteHe: String(es.cautionNoteHe || "").trim()
      ? `${String(es.cautionNoteHe).trim()} ${restrainedLine}`
      : restrainedLine,
  };
}

/** Minimum subject volume to compare cross-subject aggregates in parent-facing copy */
const CROSS_SUBJECT_WEAK_RANK_MIN_Q = 10;
/** Minimum accuracy gap (percentage points) vs the next subject to call out one weakest area */
const CROSS_SUBJECT_WEAK_MIN_GAP = 3;

function collectPerSubjectAggregateRowsFromSummary(summary, baseReport = null) {
  const s = summary && typeof summary === "object" ? summary : {};
  const rows = [
    { q: Number(s.mathQuestions) || 0, acc: Number(s.mathAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.math },
    { q: Number(s.geometryQuestions) || 0, acc: Number(s.geometryAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.geometry },
    { q: Number(s.englishQuestions) || 0, acc: Number(s.englishAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.english },
    { q: Number(s.scienceQuestions) || 0, acc: Number(s.scienceAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.science },
    { q: Number(s.historyQuestions) || 0, acc: Number(s.historyAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.history },
    { q: Number(s.hebrewQuestions) || 0, acc: Number(s.hebrewAccuracy) || 0, labelHe: SUBJECT_LABEL_HE.hebrew },
  ];
  if (baseReport) {
    const mg = buildVisualMoledetGeographyCoverageRows(baseReport);
    rows.push(
      { q: mg[0].questionCount, acc: mg[0].accuracy, labelHe: mg[0].subjectLabelHe },
      { q: mg[1].questionCount, acc: mg[1].accuracy, labelHe: mg[1].subjectLabelHe },
    );
  } else {
    rows.push({
      q: Number(s.moledetGeographyQuestions) || 0,
      acc: Number(s.moledetGeographyAccuracy) || 0,
      labelHe: SUBJECT_LABEL_HE["moledet-geography"],
    });
  }
  return rows;
}

function pickClearWeakestSubjectFromSummaryAggregates(summary, baseReport = null) {
  const ranked = collectPerSubjectAggregateRowsFromSummary(summary, baseReport)
    .filter((r) => r.q >= CROSS_SUBJECT_WEAK_RANK_MIN_Q)
    .sort((a, b) => a.acc - b.acc || b.q - a.q);
  if (ranked.length < 2) return null;
  const worst = ranked[0];
  const second = ranked[1];
  if (second.acc - worst.acc < CROSS_SUBJECT_WEAK_MIN_GAP) return null;
  return worst;
}

function crossSubjectWeakFocusLineHe(worst) {
  return `לפי סיכום התרגול בתקופה שנבחרה, הדיוק הנמוך ביותר (כ ${worst.acc}% על ${worst.q} תשובות) מופיע כרגע ב${worst.labelHe} - כדאי לתת שם דגש ממוקד השבוע.`;
}

/**
 * When topic-level diagnosis does not surface a clear מיקוד בית, still give parents a Hebrew subject label
 * from cross-subject accuracy aggregates (same numbers shown elsewhere in the report).
 */
function augmentExecutiveSummaryWithCrossSubjectAccuracyWeakSignal(executiveSummary, summary, baseReport = null) {
  const es = executiveSummary && typeof executiveSummary === "object" ? { ...executiveSummary } : {};
  const totalQ = Number(summary?.totalQuestions) || 0;
  /** Sparse windows (e.g. thin practice): rank-across-subjects headlines are misleading — keep topic/engine copy only */
  if (totalQ > 0 && totalQ < 120) return es;

  const worst = pickClearWeakestSubjectFromSummaryAggregates(summary, baseReport);
  if (!worst) return es;

  const line = crossSubjectWeakFocusLineHe(worst);
  const blob = [
    String(es.homeFocusHe || ""),
    ...(Array.isArray(es.majorTrendsHe) ? es.majorTrendsHe : []).map(String),
    String(es.cautionNoteHe || ""),
  ].join("\n");
  if (blob.includes(worst.labelHe)) return es;

  const prevHome = String(es.homeFocusHe || "");
  const genericHome = !prevHome.trim() || /עדיין אין מוקד ברור/.test(prevHome);

  if (genericHome) {
    es.homeFocusHe = line;
  } else {
    es.homeFocusHe = `${line} ${prevHome}`.trim();
  }

  return es;
}

/**
 * Align detailed subject trend copy with row-level `trend.summaryHe` when present (same maps as V2).
 * @param {object|null|undefined} mapRow
 * @param {number} highPriority
 */
function subjectTrendNarrativeHeFromMapRow(mapRow, highPriority) {
  const t = mapRow?.trend && typeof mapRow.trend === "object" ? mapRow.trend : null;
  const sh = t?.summaryHe != null && String(t.summaryHe).trim() ? String(t.summaryHe).trim() : "";
  if (sh) return sh;
  return highPriority > 0 ? subjectV2TrendNarrativeHighPriorityHe() : subjectV2TrendNarrativeStableHe();
}

function topicMapRowForV2Unit(baseReport, sid, u) {
  const mapKey = REPORT_MAP_KEY[sid];
  const topicMapForSid =
    mapKey && baseReport?.[mapKey] && typeof baseReport[mapKey] === "object" ? baseReport[mapKey] : {};
  const trk = String(u?.topicRowKey || "");
  return trk && topicMapForSid[trk] && typeof topicMapForSid[trk] === "object"
    ? topicMapForSid[trk]
    : null;
}

function filterCoreUnitsFromBaseReport(baseReport, units, sid) {
  const mapKey = REPORT_MAP_KEY[sid];
  const topicMapForSid =
    mapKey && baseReport?.[mapKey] && typeof baseReport[mapKey] === "object" ? baseReport[mapKey] : {};
  return filterCoreV2Units(units, topicMapForSid, baseReport?.registeredGradeKey);
}

function buildSubjectProfilesFromV2(baseReport) {
  const diag = baseReport?.diagnosticEngineV2;
  const grouped = groupV2UnitsBySubject(diag);
  const out = [];

  for (const sid of SUBJECT_IDS) {
    const units = grouped[sid] || [];
    if (units.length === 0) {
      const subjQ = subjectQuestionCountFromReportSummary(baseReport, sid);
      const summaryHeEmpty =
        subjQ > 0
          ? "יש פעילות בנושא בתקופה, אך עדיין אין תמונה מסודרת מהתרגולים על הנושא - כדאי להמשיך בתרגול."
          : "אין מספיק נתונים בתקופה הנבחנת.";
      out.push({
        subject: sid,
        subjectLabelHe: SUBJECT_LABEL_HE[sid],
        summaryHe: summaryHeEmpty,
        hasAnySignal: false,
        topStrengths: [],
        topWeaknesses: [],
        maintain: [],
        improving: [],
        excellence: [],
        topicOverviewRows: [],
        topicRecommendations: [],
        parentActionHe: null,
        nextWeekGoalHe: null,
        confidenceSummaryHe: "עדיין לא הצטבר מספיק מידע כדי לקבוע כיוון ברור.",
        recommendedHomeMethodHe: null,
        trendNarrativeHe: null,
        subjectMonitoringOnly: true,
      });
      continue;
    }
    const csOf = (u) => u?.canonicalState;
    const actionOf = (u) => csOf(u)?.actionState || "withhold";
    const coreUnits = filterCoreUnitsFromBaseReport(baseReport, units, sid);
    const highPriority = coreUnits.filter((u) => String(u?.priority?.level || "") === "P4").length;
    const strengthUnits = coreUnits.filter((u) => actionOf(u) === "maintain" || actionOf(u) === "expand_cautiously");
    const stable = strengthUnits.length;
    const fragile = coreUnits.filter((u) => Array.isArray(u?.strengthProfile?.tags) && u.strengthProfile.tags.includes("fragile_success")).length;
    const diagnosed = coreUnits.filter((u) => !!u?.diagnosis?.allowed);
    const diagnosticLeadSource =
      diagnosed.find((u) => String(u?.priority?.level || "") === "P4") ||
      diagnosed.find((u) => String(u?.priority?.level || "") === "P3") ||
      diagnosed[0] ||
      null;
    const subjectAnchorUnit = selectSubjectAnchorUnitForV2Profile(coreUnits, csOf);

    const mapKey = REPORT_MAP_KEY[sid];
    const topicMapForSid =
      baseReport?.[mapKey] && typeof baseReport[mapKey] === "object" ? baseReport[mapKey] : {};
    if (sid === "math") {
      applyMathScopedParentDisplayNames(topicMapForSid);
    }
    const anchorTrk = subjectAnchorUnit ? String(subjectAnchorUnit.topicRowKey || "") : "";
    const anchorMapRow =
      anchorTrk && topicMapForSid[anchorTrk] && typeof topicMapForSid[anchorTrk] === "object"
        ? topicMapForSid[anchorTrk]
        : null;
    const anchorGradeKey = subjectAnchorUnit
      ? gradeKeyForV2UnitFromReport(baseReport, subjectAnchorUnit)
      : null;

    const topicRecommendationsBase = attachNarrativeContractsToTopicRecommendations(
      sid,
      applyGateToTextClampToTopicRecommendations(
        coreUnits
          .filter((u) => {
            const trk = String(u?.topicRowKey || "");
            const mapR =
              trk && topicMapForSid[trk] && typeof topicMapForSid[trk] === "object"
                ? topicMapForSid[trk]
                : null;
            const tier = parentTopicTierFromUnit(u, mapR);
            return parentTopicTierShowsRecommendationCard(tier);
          })
          .map((u) =>
            recommendationFromV2Unit(u, topicMapForSid[String(u?.topicRowKey || "")] || null, {
              registeredGradeKey: baseReport?.registeredGradeKey,
              baseReport,
            }),
          )
          .slice(0, 8)
      )
    );
    const topicOverviewRows = buildTopicOverviewRowsFromUnits(baseReport, sid, coreUnits, topicMapForSid);
    const topicGroupsByTier = groupTopicRowsByParentTier(topicOverviewRows);

    const topicRecommendations = [...topicRecommendationsBase]
      .sort((a, b) => {
        const pa = Number(a?._priorityScore) || 0;
        const pb = Number(b?._priorityScore) || 0;
        if (pb !== pa) return pb - pa;
        const qa = Number(a?.questions) || 0;
        const qb = Number(b?.questions) || 0;
        return qb - qa;
      })
      .map((tr, idx) => ({
        ...tr,
        actionableRole: idx === 0 ? "primary" : "secondary",
        isMainActionable: idx === 0,
      }));

    const excellentList = strengthUnits.filter(
      (u) => csOf(u)?.evidence?.positiveAuthorityLevel === "excellent"
    );
    const veryGoodList = strengthUnits.filter(
      (u) => csOf(u)?.evidence?.positiveAuthorityLevel === "very_good"
    );
    const goodList = strengthUnits.filter((u) => csOf(u)?.evidence?.positiveAuthorityLevel === "good");

    const topStrengths = veryGoodList.slice(0, 3).map((u) => {
      const trk = String(u?.topicRowKey || "");
      const mapR = trk && topicMapForSid[trk] && typeof topicMapForSid[trk] === "object" ? topicMapForSid[trk] : null;
      const gk = gradeKeyForV2UnitFromReport(baseReport, u);
      const ge = buildGradeEvidenceFields(baseReport?.registeredGradeKey, gk);
      const labels = parentFacingDisplayLabelsForV2Unit(baseReport, u);
      return {
        topicRowKey: trk,
        subjectId: sid,
        contentGradeKey: gk,
        displayName: String(u?.displayName || "").trim(),
        narrativeTitleHe: labels.titleHe,
        gradeRelationSublineHe: labels.gradeRelationSublineHe,
        labelHe: labels.titleHe,
        questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
        accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
        timeMinutes: Number(mapR?.timeMinutes) || 0,
        excellent: false,
        rowIdentityV1: buildRowIdentityV1({
          subjectId: sid,
          topicRowKey: trk,
          displayName: String(u?.displayName || ""),
          contentGradeKey: gk,
          registeredGradeKey: baseReport?.registeredGradeKey,
          gradeRelation: ge.gradeRelation,
          questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
          accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
          timeSpentMinutes: Number(mapR?.timeMinutes) || 0,
        }),
      };
    });

    const maintain = goodList.slice(0, 5).map((u) => {
      const trk = String(u?.topicRowKey || "");
      const gk = gradeKeyForV2UnitFromReport(baseReport, u);
      const ge = buildGradeEvidenceFields(baseReport?.registeredGradeKey, gk);
      return {
        topicRowKey: trk,
        subjectId: sid,
        contentGradeKey: gk,
        labelHe: parentFacingLabelForV2Unit(baseReport, u),
        questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
        accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
      };
    });

    const topWeaknesses = diagnosed
      .filter((u) => parentFacingPatternLabelHe(u))
      .slice(0, 3)
      .map((u) => {
        const trk = String(u?.topicRowKey || "");
        const gk = gradeKeyForV2UnitFromReport(baseReport, u);
        const ge = buildGradeEvidenceFields(baseReport?.registeredGradeKey, gk);
        const topicLabel = parentFacingLabelForV2Unit(baseReport, u);
        const patternHe = parentFacingPatternLabelHe(u);
        return {
          topicRowKey: trk,
          subjectId: sid,
          contentGradeKey: gk,
          labelHe: patternHe ? `${topicLabel} - ${patternHe}` : topicLabel,
          mistakeCount: Number(u?.recurrence?.wrongCountForRules) || 0,
          questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
          accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
          timeMinutes: Number(topicMapForSid[trk]?.timeMinutes) || 0,
          taxonomyId: String(u?.taxonomy?.id || u?.diagnosis?.taxonomyId || "").trim() || null,
          parentDiagnosticExplanationV1: buildParentDiagnosticExplanationV1FromV2Unit(u),
          rowIdentityV1: buildRowIdentityV1({
            subjectId: sid,
            topicRowKey: trk,
            displayName: String(u?.displayName || ""),
            contentGradeKey: gk,
            registeredGradeKey: baseReport?.registeredGradeKey,
            gradeRelation: ge.gradeRelation,
            questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
            accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
            timeSpentMinutes: Number(topicMapForSid[trk]?.timeMinutes) || 0,
            hasSubskillMetadata: !!patternHe,
            diagnosticPatternHe: patternHe || null,
          }),
        };
      });

    const POSITIVE_LEVEL_RANK_D = { excellent: 3, very_good: 2, good: 1, none: 0 };
    const rankPosD = (a, b) => {
      const la = csOf(a)?.evidence?.positiveAuthorityLevel || "none";
      const lb = csOf(b)?.evidence?.positiveAuthorityLevel || "none";
      return (POSITIVE_LEVEL_RANK_D[lb] || 0) - (POSITIVE_LEVEL_RANK_D[la] || 0);
    };
    const rankedPositiveD = [...strengthUnits].sort(rankPosD);
    const leadPosD = rankedPositiveD[0] || null;
    const leadLevD = csOf(leadPosD)?.evidence?.positiveAuthorityLevel || "none";
    const isStrengthLeadD = actionOf(leadPosD) === "maintain" || actionOf(leadPosD) === "expand_cautiously";
    const strongPosD = isStrengthLeadD && (leadLevD === "excellent" || leadLevD === "very_good");
    const additiveLeadD = !!leadPosD?.outputGating?.additiveCautionAllowed;
    const p4UnitD = diagnosed.find((u) => String(u?.priority?.level || "") === "P4");

    const summaryHe = (() => {
      if (p4UnitD) {
        return `בנושא ${p4UnitD.displayName}: ${parentFacingPatternLabelHe(p4UnitD) || "צריך בירור נוסף"}`;
      }
      if (strongPosD && leadPosD) {
        const base = `בנושא ${leadPosD.displayName}: ${tierStableStrengthHe()}`;
        const pattern = parentFacingPatternLabelHe(diagnosticLeadSource);
        if (additiveLeadD && pattern) {
          return `${base} · ${pattern}`;
        }
        if (additiveLeadD && diagnosticLeadSource) {
          return `${base} ${topicRecommendationV2CautionGatedHe()}`;
        }
        return base;
      }
      if (isStrengthLeadD && leadPosD && leadLevD === "good") {
        return `בנושא ${leadPosD.displayName}: ${tierStableStrengthHe()}`;
      }
      if (diagnosticLeadSource) {
        return `בנושא ${diagnosticLeadSource.displayName}: ${parentFacingPatternLabelHe(diagnosticLeadSource) || "צריך בירור נוסף"}`;
      }
      const sumQ = units.reduce((acc, u) => acc + (Number(u?.evidenceTrace?.[0]?.value?.questions) || 0), 0);
      const reportQ = subjectQuestionCountFromReportSummary(baseReport, sid);
      const totalReportQ = Math.max(0, Number(baseReport?.summary?.totalQuestions) || 0);
      const w0 = topWeaknesses[0];
      const w0Label = w0
        ? String(w0.labelHe || "")
            .replace(/^[^-]+-\s*/, "")
            .trim()
        : "";
      return withholdSummaryCopyHe("subject", {
        subjectReportQuestions: reportQ,
        sumUnitQuestions: sumQ,
        strengthUnitCount: strengthUnits.length,
        diagnosedCount: diagnosed.length,
        weakPatternHe: parentFacingPatternLabelHe(diagnosticLeadSource),
        units,
        subjectLabelHe: SUBJECT_LABEL_HE[sid],
        reportSubjectAccuracy: subjectAccuracyFromReportSummary(baseReport, sid),
        reportTotalQuestions: totalReportQ,
        clearWeakTopicLabelHe: w0Label,
        clearWeakTopicQuestions: w0?.questions,
        clearWeakTopicAccuracy: w0?.accuracy,
      });
    })();

    const subjectEngineContract = buildSubjectEngineDecisionContract(sid, topicRecommendations, {
      subjectLabelKey: sid,
    });
    const summaryHeFromEngineContract = resolveSubjectSummaryTextFromEngineContract(
      subjectEngineContract,
      { subjectLabelHe: SUBJECT_LABEL_HE[sid] },
    );
    const finalSummaryHe = summaryHeFromEngineContract || summaryHe;
    const blockedSubjectLegacy = !!subjectEngineContract.blockedLegacySummary;

    out.push({
      subject: sid,
      subjectLabelHe: SUBJECT_LABEL_HE[sid],
      summaryHe: finalSummaryHe,
      topStrengths,
      topWeaknesses,
      maintain,
      improving: [],
      excellence: excellentList.slice(0, 5).map((u) => ({
        labelHe: parentFacingLabelForV2Unit(baseReport, u),
        questions: Number(u?.evidenceTrace?.[0]?.value?.questions) || 0,
        accuracy: Number(u?.evidenceTrace?.[0]?.value?.accuracy) || 0,
        excellent: true,
      })),
      diagnosticSectionsHe: null,
      subSkillInsightsHe: [],
      parentActionHe: resolveUnitParentActionHe(subjectAnchorUnit, anchorGradeKey),
      nextWeekGoalHe: resolveUnitNextGoalHe(subjectAnchorUnit, anchorGradeKey),
      evidenceExamples: [],
      trendVsPreviousPeriod: null,
      topicOverviewRows,
      topicGroupsByTier,
      topicRecommendations,
      [SP_SUBJECT_ENGINE_CONTRACT]: subjectEngineContract,
      dominantLearningRisk: subjectAnchorUnit?.competingHypotheses?.hypotheses?.[0]?.hypothesisId || null,
      dominantSuccessPattern: stable > 0 ? "stable_mastery" : null,
      trendNarrativeHe: subjectTrendNarrativeHeFromMapRow(anchorMapRow, highPriority),
        confidenceSummaryHe: blockedSubjectLegacy
          ? null
          : subjectAnchorUnit
        ? subjectV2ConfidenceSummaryHe(
            csOf(subjectAnchorUnit)?.assessment?.confidenceLevel || subjectAnchorUnit?.confidence?.level
          )
        : subjectQuestionCountFromReportSummary(baseReport, sid) > 0
          ? (() => {
              const sq = subjectQuestionCountFromReportSummary(baseReport, sid);
              const sumU = units.reduce(
                (acc, u) => acc + (Number(u?.evidenceTrace?.[0]?.value?.questions) || 0),
                0,
              );
              return withholdConfidenceSummaryFallbackHe({
                subjectReportQuestions: sq,
                sumUnitQuestions: sumU,
                strengthUnitCount: strengthUnits.length,
                diagnosedCount: diagnosed.length,
                reportSubjectAccuracy: subjectAccuracyFromReportSummary(baseReport, sid),
              });
            })()
          : "עדיין לא הצטבר מספיק מידע לתמונה רחבה מהתרגולים.",
      recommendedHomeMethodHe:
        resolveUnitNextGoalHe(subjectAnchorUnit, anchorGradeKey) || resolveUnitHomeMethodHe(subjectAnchorUnit, anchorGradeKey),
      whatNotToDoHe: subjectAnchorUnit?.intervention?.avoidHe || null,
      majorRiskFlagsAcrossRows: {
        insufficientEvidenceRisk: units.some((u) => u?.outputGating?.cannotConcludeYet),
        hintDependenceRisk: false,
      },
      dominantBehaviorProfileAcrossRows: subjectAnchorUnit?.strengthProfile?.dominantBehavior || null,
      strongestPositiveTrendRowHe: stable > 0 ? "נראים כיסי שליטה יציבה." : null,
      strongestCautionTrendRowHe: fragile > 0 ? "יש הצלחות שבירות שדורשות ייצוב." : null,
      fragileSuccessRowCount: fragile,
      stableMasteryRowCount: stable,
      modeConcentrationNoteHe: null,
      dominantLearningRiskLabelHe: parentFacingPatternLabelHe(subjectAnchorUnit) || null,
      dominantSuccessPatternLabelHe:
        stable > 0 ? normalizeParentFacingHe("התקדמות יציבה וטובה בחלק מהנושאים") : null,
      improvingButSupportedHe: null,
      dominantRootCause: subjectAnchorUnit?.taxonomy?.rootsHe?.[0] || null,
      dominantRootCauseLabelHe: subjectAnchorUnit?.taxonomy?.rootsHe?.[0] || null,
      secondaryRootCause: subjectAnchorUnit?.taxonomy?.competitorsHe?.[0] || null,
      rootCauseDistribution: {},
      subjectDiagnosticRestraintHe: blockedSubjectLegacy
        ? null
        : units.some((u) => csOf(u)?.assessment?.cannotConcludeYet ?? u?.outputGating?.cannotConcludeYet)
          ? "בחלק מהשורות מה שרואים עדיין לא מספיק כדי לסגור תמונה ברורה."
          : null,
      subjectConclusionReadiness: mergeSubjectConclusionReadinessContract({
        internalReadiness: units.some((u) => csOf(u)?.assessment?.cannotConcludeYet ?? u?.outputGating?.cannotConcludeYet) ? "partial" : "ready",
        rows: v2UnitsToContractRows(units),
        withheldStrengthRows: units.filter((u) => u?.outputGating?.cannotConcludeYet).length,
        tentativeStrengthRows: 0,
        rowCount: Math.max(1, units.length),
        hasCannotConcludeYet: units.some((u) => u?.outputGating?.cannotConcludeYet),
      }),
      subjectInterventionPriorityHe: priorityLevelParentLabelHe(subjectAnchorUnit?.priority?.level),
      subjectPriorityLevel: highPriority > 0 ? "immediate" : "soon",
      subjectPriorityReasonHe: parentFacingPatternLabelHe(subjectAnchorUnit) || null,
      subjectImmediateActionHe: resolveUnitParentActionHe(subjectAnchorUnit, anchorGradeKey),
      subjectDeferredActionHe:
        subjectAnchorUnit && isStrongPositiveUnitForParentGuidance(subjectAnchorUnit)
          ? "להמשיך באותה מורכבות ולבחון הרחבה זהירה רק אחרי עקביות נוספת."
          : null,
      subjectMonitoringOnly: units.length === 0,
      subjectDoNowHe: resolveUnitParentActionHe(subjectAnchorUnit, anchorGradeKey),
      subjectAvoidNowHe: sanitizeParentSurfaceTextHe(subjectAnchorUnit?.intervention?.avoidHe, {
        subjectId: sid,
      }),
      subjectReviewBeforeAdvanceHe: sanitizeParentSurfaceTextHe(
        subjectAnchorUnit?.probe?.objectiveHe,
        { subjectId: sid },
      ),
      subjectTransferReadiness: units.some((u) => u?.diagnosis?.allowed) ? "emerging" : "not_ready",
      subjectSupportAdjustmentNeedHe: highPriority > 0 ? "להדק תמיכה ולבחון מחדש." : "לשמור על מה שעובד ולבדוק שוב.",
      subjectRecalibrationNeedHe: units.some((u) => u?.outputGating?.cannotConcludeYet)
        ? subjectV2RecalibrationNeedYesHe()
        : subjectV2RecalibrationNeedNoHe(),
      subjectDependencyNarrativeHe: subjectAnchorUnit?.taxonomy?.competitorsHe?.[0]
        ? `יש לבדוק גם חלופה: ${subjectAnchorUnit.taxonomy.competitorsHe[0]}.`
        : null,
    });
  }
  return out;
}

function buildExecutiveSummaryFromV2(baseReport, subjectCoverage) {
  const diag = baseReport?.diagnosticEngineV2;
  const allUnits = Array.isArray(diag?.units) ? diag.units : [];
  const units = allUnits.filter((u) => {
    const sid = String(u?.subjectId || "");
    const mapR = topicMapRowForV2Unit(baseReport, sid, u);
    return isCoreV2UnitForReport(u, mapR, baseReport?.registeredGradeKey);
  });
  const gk = (u) => (u ? gradeKeyForV2UnitFromReport(baseReport, u) : null);
  const csOf = (u) => u?.canonicalState;
  const actionOf = (u) => csOf(u)?.actionState || "withhold";
  const diagnosed = units.filter((u) => u?.diagnosis?.allowed);
  const stable = units.filter((u) => actionOf(u) === "maintain" || actionOf(u) === "expand_cautiously");
  const uncertain = units.filter((u) => csOf(u)?.assessment?.cannotConcludeYet || u?.outputGating?.cannotConcludeYet);
  const p4 = units.filter((u) => String(u?.priority?.level || "") === "P4");

  const POSITIVE_LEVEL_RANK_X = { excellent: 3, very_good: 2, good: 1, none: 0 };
  const rankPosX = (a, b) => {
    const la = csOf(a)?.evidence?.positiveAuthorityLevel || "none";
    const lb = csOf(b)?.evidence?.positiveAuthorityLevel || "none";
    return (POSITIVE_LEVEL_RANK_X[lb] || 0) - (POSITIVE_LEVEL_RANK_X[la] || 0);
  };
  const stableRanked = [...stable].sort(rankPosX);
  const leadPosX = stableRanked[0] || null;

  let topStrengthsAcrossHe = stable.slice(0, 3).map((u) => executiveLineFromV2Unit(baseReport, u));
  const rawMetricHeV2 = deriveRawMetricStrengthLinesHe(baseReport.summary);
  topStrengthsAcrossHe = mergeExecutiveStrengthLinesHe(rawMetricHeV2, topStrengthsAcrossHe, 5);
  const topFocusAreasHe = diagnosed
    .filter((u) => parentFacingPatternLabelHe(u))
    .slice(0, 3)
    .map((u) => {
      const topicLabel = executiveLineFromV2Unit(baseReport, u);
      return `${parentFacingPatternLabelHe(u)} - ${topicLabel}`;
    });
  const registeredGradeKey =
    baseReport?.registeredGradeKey != null && String(baseReport.registeredGradeKey).trim()
      ? String(baseReport.registeredGradeKey).trim()
      : null;
  const gradeSplitTopicNoticesHe = registeredGradeKey
    ? []
    : detectGradeSplitContradictions(allUnits, baseReport);

  return {
    version: 2,
    windowTotalQuestions: Number(baseReport.summary?.totalQuestions) || 0,
    topStrengthsAcrossHe,
    topFocusAreasHe,
    gradeSplitTopicNoticesHe,
    homeFocusHe: executiveV2HomeFocusHe(topFocusAreasHe),
    majorTrendsHe: executiveV2MajorTrendsLinesHe({
      units: units.length,
      diagnosed: diagnosed.length,
      uncertain: uncertain.length,
      stable: stable.length,
    }),
    mainHomeRecommendationHe:
      resolveUnitParentActionHe(p4[0], gk(p4[0]))
      || resolveUnitParentActionHe(diagnosed[0], gk(diagnosed[0]))
      || resolveUnitParentActionHe(leadPosX, gk(leadPosX))
      || "כרגע אין המלצה ביתית אחת מרכזית, כי עדיין צריך עוד מידע.",
    cautionNoteHe: executiveV2CautionNoteHe({ p4Length: p4.length, uncertainLength: uncertain.length }),
    overallConfidenceHe: executiveV2OverallConfidenceHe(diagnosed.length, units.length, stable.length),
    dominantCrossSubjectRiskLabelHe: parentFacingPatternLabelHe(diagnosed[0]) || "",
    dominantCrossSubjectSuccessPatternLabelHe: (() => {
      const focusHe = stable[0]?.taxonomy?.["sub" + "skillHe"];
      if (focusHe) {
        return normalizeParentFacingHe(`התקדמות יציבה וטובה ב${focusHe}`);
      }
      if (stable[0]) {
        return normalizeParentFacingHe(`התקדמות יציבה וטובה ב${stable[0].displayName}`);
      }
      return "";
    })(),
    mixedSignalNoticeHe: executiveV2MixedSignalNoticeHe(uncertain.length > 0),
    reportReadinessHe: executiveV2ReportReadinessHe(units.length),
    evidenceBalanceHe: executiveV2EvidenceBalanceHe(stable.length, diagnosed.length),
    topImmediateParentActionHe: resolveUnitParentActionHe(diagnosed[0], gk(diagnosed[0])) || "",
    secondPriorityActionHe: diagnosed[1]
      ? resolveUnitParentActionHe(diagnosed[1], gk(diagnosed[1])) || ""
      : "",
    monitoringOnlyAreasHe: units
      .filter((u) => actionOf(u) === "withhold" || actionOf(u) === "probe_only")
      .slice(0, 4)
      .map((u) => executiveLineFromV2Unit(baseReport, u)),
    deferForNowAreasHe: [],
    reviewBeforeAdvanceAreasHe: diagnosed
      .filter((u) => u?.probe?.objectiveHe)
      .slice(0, 4)
      .map((u) => `${SUBJECT_LABEL_HE[u.subjectId] || u.subjectId}: ${u.probe.objectiveHe}`),
    transferReadyAreasHe: stable.slice(0, 3).map((u) => executiveLineFromV2Unit(baseReport, u)),
    anchoredTopicStateIds: stable.slice(0, 3).map((u) => csOf(u)?.topicStateId || null).filter(Boolean),
  };
}

function buildCrossSubjectInsightsFromV2(baseReport) {
  const allUnits = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];
  const units = allUnits.filter((u) => {
    const sid = String(u?.subjectId || "");
    const mapR = topicMapRowForV2Unit(baseReport, sid, u);
    return isCoreV2UnitForReport(u, mapR, baseReport?.registeredGradeKey);
  });
  const contradictory = units.filter((u) => String(u?.confidence?.level || "") === "contradictory").length;
  const p4 = units.filter((u) => String(u?.priority?.level || "") === "P4").length;
  const strengthenTopicCount = units.filter((u) => {
    const tier = parentTopicTierFromUnit(u, null);
    return (
      tier === PARENT_TOPIC_TIER.STRENGTHEN ||
      tier === PARENT_TOPIC_TIER.CLEAR_GAP ||
      tier === PARENT_TOPIC_TIER.NEEDS_GUIDANCE
    );
  }).length;
  const bulletsHe = crossSubjectV2BulletsHe({
    unitsLength: units.length,
    highPriorityCount: p4,
    strengthenTopicCount,
    contradictoryCount: contradictory,
  });
  return {
    bulletsHe,
    dataQualityNoteHe: crossSubjectV2DataQualityNoteHe(units.length),
  };
}

function buildHomePlanFromV2(baseReport) {
  const allUnits = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];
  const units = allUnits.filter((u) => {
    const sid = String(u?.subjectId || "");
    const mapR = topicMapRowForV2Unit(baseReport, sid, u);
    return isCoreV2UnitForReport(u, mapR, baseReport?.registeredGradeKey);
  });
  const actionOf = (u) => u?.canonicalState?.actionState || "withhold";
  const subjectHasPractice = (u) =>
    subjectQuestionCountFromReportSummary(baseReport, String(u?.subjectId || "")) > 0;
  const focusUnits = units.filter((u) => {
    const a = actionOf(u);
    return (a === "diagnose_only" || a === "intervene") && subjectHasPractice(u);
  });
  const maintainUnits = units.filter((u) => {
    const a = actionOf(u);
    return (
      (a === "maintain" || a === "expand_cautiously") &&
      subjectHasPractice(u) &&
      resolveUnitParentActionHe(u, gradeKeyForV2UnitFromReport(baseReport, u))
    );
  });
  const itemsHe = [];
  for (const u of focusUnits.slice(0, 4)) {
    const action = resolveUnitParentActionHe(u, gradeKeyForV2UnitFromReport(baseReport, u)) || "";
    itemsHe.push(
      homePlanLineFromV2Unit(baseReport, u, rewriteParentRecommendationForDetailedHe(String(action))),
    );
  }
  for (const u of maintainUnits.slice(0, 3)) {
    const action =
      resolveUnitParentActionHe(u, gradeKeyForV2UnitFromReport(baseReport, u)) ||
      "להמשיך באותו קצב תרגול - המצב נראה יציב בתקופה שנבחרה.";
    itemsHe.push(
      homePlanLineFromV2Unit(baseReport, u, rewriteParentRecommendationForDetailedHe(String(action))),
    );
  }
  return { itemsHe: itemsHe.length ? itemsHe : [homePlanV2EmptyFallbackHe()] };
}

function buildNextPeriodGoalsFromV2(baseReport) {
  const allUnits = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];
  const units = allUnits.filter((u) => {
    const sid = String(u?.subjectId || "");
    const mapR = topicMapRowForV2Unit(baseReport, sid, u);
    return isCoreV2UnitForReport(u, mapR, baseReport?.registeredGradeKey);
  });
  const itemsHe = units
    .filter((u) => resolveUnitNextGoalHe(u, gradeKeyForV2UnitFromReport(baseReport, u)))
    .slice(0, 6)
    .map((u) => {
      const goal = resolveUnitNextGoalHe(u, gradeKeyForV2UnitFromReport(baseReport, u)) || "";
      return `ב${SUBJECT_LABEL_HE[u.subjectId] || u.subjectId}: ${rewriteParentRecommendationForDetailedHe(String(goal))}`;
    });
  return { itemsHe: itemsHe.length ? itemsHe : [nextPeriodGoalsV2EmptyFallbackHe()] };
}

/**
 * Transparency window only — built from unfiltered base while central report uses filtered base.
 * @param {Record<string, unknown>|null|undefined} detailed
 * @param {Record<string, unknown>|null|undefined} rawBaseReport
 */
export function attachOutOfGradeTransparencyFromRawBase(detailed, rawBaseReport) {
  if (!detailed || typeof detailed !== "object") return detailed;
  return {
    ...detailed,
    outOfGradePracticeTransparency: buildOutOfGradePracticeTransparency(rawBaseReport),
  };
}

/**
 * בונה דוח מקיף מאובייקט דוח V2 קיים — לבדיקות ולכלי עזר (ללא טעינת שחקן).
 * @param {Record<string, unknown>} baseReport
 * @param {{ playerName?: string, period?: string }} [meta]
 */
export function buildDetailedParentReportFromBaseReport(baseReport, meta = {}) {
  if (!baseReport || typeof baseReport !== "object") return null;
  hardenBaseReportWithRowIdentity(baseReport);
  const playerName = meta.playerName ?? baseReport.playerName ?? "_fixture_";
  const period = meta.period ?? baseReport.period ?? "week";

  const subjectCoverage = buildSubjectCoverage(baseReport);
  const overallSnapshot = buildOverallSnapshot(baseReport, subjectCoverage);
  const hasV2Primary =
    Array.isArray(baseReport?.diagnosticEngineV2?.units) &&
    baseReport.diagnosticEngineV2.units.length > 0;

  const subjectsLegacy =
    baseReport.legacyPatternDiagnostics?.subjects ||
    baseReport.patternDiagnostics?.subjects ||
    {};
  let executiveSummary = hasV2Primary
    ? buildExecutiveSummaryFromV2(baseReport, subjectCoverage)
    : buildExecutiveSummary(
        subjectsLegacy,
        baseReport.summary || {},
        subjectCoverage,
        baseReport.dataIntegrityReport ?? null
      );
  const crossSubjectInsights = hasV2Primary
    ? buildCrossSubjectInsightsFromV2(baseReport)
    : buildCrossSubjectInsights(baseReport, subjectsLegacy);
  const homePlan = hasV2Primary ? buildHomePlanFromV2(baseReport) : buildHomePlan(subjectsLegacy);
  const nextPeriodGoals = hasV2Primary
    ? buildNextPeriodGoalsFromV2(baseReport)
    : buildNextPeriodGoals(subjectsLegacy);
  const rawSubjectProfiles = hasV2Primary
    ? buildSubjectProfilesFromV2(baseReport)
    : buildSubjectProfiles(baseReport);
  if (hasV2Primary) {
    const subjectsMap = Object.fromEntries(rawSubjectProfiles.map((sp) => [sp.subject, sp]));
    const subjMap = {};
    for (const sid of SUBJECT_IDS) {
      subjMap[sid] = subjectsMap[sid] || null;
    }
    executiveSummary = {
      ...executiveSummary,
      ...buildCrossSubjectPhase7Fields(subjMap, subjectCoverage),
    };
  }
  const subjectCoverageById = Object.fromEntries(
    subjectCoverage.map((row) => [String(row.subject), row])
  );
  const subjectProfiles = rawSubjectProfiles.map((sp) => {
    const cov = subjectCoverageById[String(sp?.subject)] || null;
    const enriched = {
      ...sp,
      subjectQuestionCount: Number(cov?.questionCount) || 0,
      subjectTimeMinutes: Number(cov?.timeMinutes) || 0,
      subjectAccuracy: Number(cov?.accuracy) || 0,
    };
    return {
      ...enriched,
      primaryParentActionHe: resolveSubjectPrimaryParentActionHe(enriched, baseReport),
    };
  });
  executiveSummary = applyNarrativeConsistencyToExecutiveSummary(executiveSummary, subjectProfiles);
  executiveSummary = augmentExecutiveSummaryWithCrossSubjectAccuracyWeakSignal(
    executiveSummary,
    baseReport.summary || {},
    baseReport,
  );
  const parentProductContractV1 = buildParentProductContractV1({
    executiveSummary,
    subjectProfiles,
    periodInfo: {
      period: baseReport.period === "custom" ? "custom" : period,
      startDate: baseReport.startDate,
      endDate: baseReport.endDate,
      playerName: baseReport.playerName || playerName,
    },
  });

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    diagnosticEngineV2: sanitizeDiagnosticEngineV2ForParentSnapshot(
      baseReport,
      baseReport.diagnosticEngineV2 ?? null,
    ),
    hybridRuntime: (() => {
      const h = baseReport?.hybridRuntime;
      if (h == null) return null;
      const n = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units.length : 0;
      return isValidHybridRuntimePayload(h, { expectedUnitCount: n }) ? h : null;
    })(),
    diagnosticPrimarySource: hasV2Primary ? "diagnosticEngineV2" : "legacy_patternDiagnostics_fallback",
    periodInfo: {
      period: baseReport.period === "custom" ? "custom" : period,
      startDate: baseReport.startDate,
      endDate: baseReport.endDate,
      startDateLabelHe: formatDateLabelHe(baseReport.startDate),
      endDateLabelHe: formatDateLabelHe(baseReport.endDate),
      playerName: baseReport.playerName || playerName,
    },
    executiveSummary,
    overallSnapshot,
    subjectProfiles,
    crossSubjectInsights,
    homePlan,
    nextPeriodGoals,
    parentProductContractV1,
    parentAssignedActivitiesInPeriod: buildParentAssignedActivitiesInPeriod(baseReport),
    outOfGradePracticeTransparency: buildOutOfGradePracticeTransparency(baseReport),
    dataIntegrityReport: baseReport.dataIntegrityReport ?? null,
    contractsV1: {
      ...(baseReport?.contractsV1 && typeof baseReport.contractsV1 === "object" ? baseReport.contractsV1 : {}),
      narrative: {
        version: NARRATIVE_CONTRACT_VERSION,
        scope: "gate-to-text",
        attached: true,
      },
    },
    registeredGradeKey: baseReport.registeredGradeKey ?? null,
    gradePracticeMeta:
      baseReport.gradePracticeMeta && typeof baseReport.gradePracticeMeta === "object"
        ? { ...baseReport.gradePracticeMeta }
        : null,
    probeEvidence: baseReport.probeEvidence ?? null,
    ...(baseReport.historySubtopics && typeof baseReport.historySubtopics === "object"
      ? { historySubtopics: baseReport.historySubtopics }
      : {}),
    ...(baseReport.summary && typeof baseReport.summary === "object" ? { summary: baseReport.summary } : {}),
  };
}

/**
 * בונה דוח מקיף לתקופה (מבנה נפרד מדוח V2).
 * @param {string} playerName
 * @param {string} period 'week'|'month'|'custom'
 * @param {string|null} customStartDate YYYY-MM-DD
 * @param {string|null} customEndDate YYYY-MM-DD
 * @returns {object|null}
 */
export function generateDetailedParentReport(
  playerName,
  period = "week",
  customStartDate = null,
  customEndDate = null
) {
  const base = generateParentReportV2(playerName, period, customStartDate, customEndDate);
  if (!base) return null;
  return buildDetailedParentReportFromBaseReport(base, { playerName, period });
}

/**
 * Test hook: one `topicRecommendations` row from a synthetic v2 unit + `baseReport` topic map (phase 6 evidence parity).
 * @param {object} unit
 * @param {Record<string, unknown>} baseReport
 * @param {string} subjectId
 */
export function buildTopicRecommendationFromV2UnitForPhaseTests(unit, baseReport, subjectId) {
  const sid = String(subjectId || "");
  const mk = REPORT_MAP_KEY[sid];
  const tm =
    mk && baseReport?.[mk] && typeof baseReport[mk] === "object"
      ? /** @type {Record<string, object>} */ (baseReport[mk])
      : {};
  const trk = String(unit?.topicRowKey || "");
  return recommendationFromV2Unit(unit, trk ? tm[trk] || null : null);
}

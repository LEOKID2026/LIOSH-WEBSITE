/**

 * Parent report insights + diagnostic copy derived from per-topic engine rows (V2).

 * Hebrew wording: parent_report_hebrew_copy_spec.md only (via parent-report-hebrew-copy-spec.js).

 */

import { subjectLabelHe } from "../lib/teacher-portal/teacher-ui.he.js";
import {
  filterCoreParentReportRows,
  resolveRegisteredGradeKeyFromReport,
} from "./parent-report-core-grade-filter.js";
import { parseCanonicalTopicFromRowKey } from "./parent-report-output-integrity/row-identity-v1.js";
import {
  buildEngineDecisionInsightLineHe,
} from "./parent-report-language/engine-decision-parent-copy-he.js";
import { buildTopicDiagnosticExplainSectionsHe } from "./parent-report-ui-explain-he.js";
import {
  buildLpdParentInsightLineHe,
  buildLpdSafeTopicInsightLineHe,
  getLpdFromRow,
  rowIsPositiveFromLpd,
} from "./learning-pattern-decision/index.js";
import { normalizeParentVisibleMetrics } from "./learning-pattern-decision/normalize-parent-practice-metrics.js";
import {

  activityGapNonDiagnosticOnlyHe,

  activityGapPartialDiagnosticHe,

  activityGapZeroDiagnosticHe,

  advanceGradeInsightHe,

  advanceLevelInsightHe,

  mixedSubjectStrongWeakHe,

  noUrgentTopicInsightHe,

  stableMasteryInsightHe,

  topicAttentionInsightHe,

} from "./parent-report-language/parent-report-hebrew-copy-spec.js";



const SUBJECT_TOPIC_MAPS = [

  { subjectId: "math", mapKey: "mathOperations", prefix: "math_" },

  { subjectId: "geometry", mapKey: "geometryTopics", prefix: "geometry_" },

  { subjectId: "english", mapKey: "englishTopics", prefix: "english_" },

  { subjectId: "science", mapKey: "scienceTopics", prefix: "science_" },

  { subjectId: "history", mapKey: "historySubtopics", prefix: "history_" },

  { subjectId: "hebrew", mapKey: "hebrewTopics", prefix: "hebrew_" },

  {

    subjectId: "moledet-geography",

    mapKey: "moledetGeographyTopics",

    prefix: "moledet_",

  },

];



const ATTENTION_BEHAVIOR_TYPES = new Set([

  "knowledge_gap",

  "fragile_success",

  "speed_pressure",

  "instruction_friction",

  "careless_pattern",

  "mixed",

  "mixed_low_signal",

]);



const REMEDIATE_STEPS = new Set([

  "remediate_same_level",

  "drop_one_level_topic_only",

  "drop_one_grade_topic_only",

]);



const ADVANCE_STEPS = new Set(["advance_level", "advance_grade_topic_only"]);



/**

 * @param {Record<string, unknown>} report

 */

export function collectTopicEngineRowsFromReport(report) {

  /** @type {Array<Record<string, unknown>>} */

  const rows = [];

  if (!report || typeof report !== "object") return rows;



  for (const { subjectId, mapKey, prefix } of SUBJECT_TOPIC_MAPS) {

    const map = report[mapKey];

    if (!map || typeof map !== "object") continue;

    for (const [topicKey, data] of Object.entries(map)) {

      if (!data || typeof data !== "object") continue;

      const q = Number(data.questions) || 0;

      if (q <= 0) continue;

      const sig =

        data.topicEngineRowSignals && typeof data.topicEngineRowSignals === "object"

          ? data.topicEngineRowSignals

          : null;

      const parsed = parseCanonicalTopicFromRowKey(topicKey);
      const contentGradeKey =
        data.contentGradeKey ??
        data.gradeKey ??
        parsed.contentGradeKey ??
        null;
      const label =

        String(data.narrativeTopicLabelHe || data.displayName || "").trim() ||

        String(topicKey).replace(/^[^_]+_/, "");

      const metrics =
        data.parentVisibleMetrics && typeof data.parentVisibleMetrics === "object"
          ? data.parentVisibleMetrics
          : normalizeParentVisibleMetrics(data);

      rows.push({

        rowKey: `${prefix}${topicKey}`,

        subjectId,

        subjectLabelHe: subjectLabelHe(subjectId) || subjectId,

        topicKey,

        label,

        questions: metrics.questions,

        correct: metrics.correct,

        wrong: metrics.wrong,

        parentVisibleMetrics: metrics,

        accuracy: metrics.accuracy,

        modeKey: typeof data.modeKey === "string" ? data.modeKey : null,

        topicEngineRowSignals: sig,

        excellent: !!data.excellent,

        gradeRelation: data.gradeRelation ?? data.rowIdentityV1?.gradeRelation ?? null,

        contentGradeKey,

        gradeKey: data.gradeKey ?? contentGradeKey,

        registeredGradeKey: data.registeredGradeKey ?? report.registeredGradeKey ?? null,

        rowIdentityV1: data.rowIdentityV1,

        learningPatternDecision:
          data.learningPatternDecision && typeof data.learningPatternDecision === "object"
            ? data.learningPatternDecision
            : null,

        trend: data.trend && typeof data.trend === "object" ? data.trend : null,

        trendV1: data.trendV1 && typeof data.trendV1 === "object" ? data.trendV1 : null,

      });

    }

  }

  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  if (registeredGradeKey) return filterCoreParentReportRows(rows, registeredGradeKey);
  return rows;

}



/**

 * @param {{ questions?: number, wrong?: number, accuracy?: number }} row

 */

export function topicWrongRatioPct(row) {

  const q = Number(row?.questions) || 0;

  if (q <= 0) return null;

  const wrong = Number(row?.wrong);

  if (Number.isFinite(wrong) && wrong >= 0) return Math.round((wrong / q) * 100);

  const acc = Number(row?.accuracy);

  if (Number.isFinite(acc)) return Math.max(0, Math.min(100, Math.round(100 - acc)));

  return null;

}



/**

 * @param {Record<string, unknown>} row

 */

function rowNeedsAttention(row) {

  const lpd = getLpdFromRow(row);

  if (lpd) {

    if (lpd.topicStatus === "not_practiced" || (lpd.practicedQuestions || 0) <= 0) return false;

    if (lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data") return false;

    if ((lpd.practicedQuestions || 0) <= 2) return false;

    const ft = String(lpd.findingType || "");

    const ts = String(lpd.topicStatus || "");

    return (

      ft === "difficulty_pattern" ||

      ft === "practice_focus" ||

      ft === "mixed_pattern" ||

      ts === "difficulty_observed" ||

      ts === "difficulty_repeated" ||

      ts === "practice_focus" ||

      ts === "mixed"

    );

  }

  const sig = row.topicEngineRowSignals;

  const acc = Number(row.accuracy) || 0;

  const q = Number(row.questions) || 0;

  if (q < 3) return false;

  const behavior = String(sig?.diagnosticType || "");

  const step = String(sig?.recommendedNextStep || row.diagnosticRecommendedNextStep || "");

  if (acc >= 78 && !REMEDIATE_STEPS.has(step)) return false;

  if (REMEDIATE_STEPS.has(step) && acc < 72) return true;

  if (ATTENTION_BEHAVIOR_TYPES.has(behavior) && acc < 70) return true;

  if (acc < 55) return true;

  return false;

}



/**

 * @param {Record<string, unknown>} row

 */

function rowIsStableStrength(row) {

  const lpd = getLpdFromRow(row);

  const acc = Number(row.accuracy) || 0;

  const q = Number(row.questions) || 0;

  if (lpd) {

    if ((lpd.practicedQuestions || 0) < 5) return false;

    return rowIsPositiveFromLpd(row) && q >= 5 && acc >= 80;

  }

  const sig = row.topicEngineRowSignals;

  if (q < 5 || acc < 80) return false;

  const behavior = String(sig?.diagnosticType || "");

  return behavior === "stable_mastery" || !!row.excellent;

}



/**

 * @param {Record<string, unknown>} row

 */

function engineActionFromRow(row) {

  const sig = row.topicEngineRowSignals;

  if (!sig || typeof sig !== "object") return "";

  return (

    String(sig.doNowHe || "").trim() ||

    String(sig.interventionPlanHe || "").trim() ||

    String(sig.recommendedParentActionHe || "").trim()

  );

}



/**

 * @param {Record<string, unknown>} row

 */

export function buildTopicEngineInsightLineHe(row) {

  const label = String(row.label || "").trim();

  const q = Number(row.questions) || 0;

  if (!label || q <= 0) return "";

  return buildLpdSafeTopicInsightLineHe(row);

}



/**

 * @param {Record<string, unknown>} apiPayload

 */

export function buildActivityGapParentInsightHe(apiPayload) {
  // Parent report uses unified practice totals — diagnostic-vs-raw mismatch is internal trace only.
  void apiPayload;
  return null;
}



/**

 * @param {string[]} insights

 * @param {string} line

 */

function pushUnique(insights, line) {

  const t = String(line || "").trim();

  if (!t || insights.includes(t)) return;

  insights.push(t);

}



/**

 * @param {Record<string, unknown>} report

 * @param {Record<string, unknown>|null|undefined} [apiPayload]

 * @returns {string[]}

 */

export function buildParentInsightsFromTopicEngineHe(report, apiPayload = null) {

  /** @type {string[]} */

  const insights = [];

  /** @type {string[]} */

  const attentionLines = [];

  /** @type {string[]} */

  const strengthLines = [];

  /** @type {string[]} */

  const dataLines = [];



  const activityGap = buildActivityGapParentInsightHe(apiPayload || report?._reportApiPayload);

  if (activityGap) dataLines.push(activityGap);



  const rows = collectTopicEngineRowsFromReport(report);

  const attentionRows = rows.filter(rowNeedsAttention);

  const stableRows = rows.filter(rowIsStableStrength);



  attentionRows.sort((a, b) => {

    const accDiff = (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0);

    if (accDiff !== 0) return accDiff;

    return (Number(b.questions) || 0) - (Number(a.questions) || 0);

  });



  stableRows.sort((a, b) => (Number(b.accuracy) || 0) - (Number(a.accuracy) || 0));



  /** @type {Map<string, { weak?: Record<string, unknown>, strong?: Record<string, unknown> }>} */

  const bySubject = new Map();

  for (const row of attentionRows) {

    const sid = String(row.subjectId || "");

    if (!bySubject.has(sid)) bySubject.set(sid, {});

    const slot = bySubject.get(sid);

    if (!slot.weak || (Number(row.accuracy) || 0) < (Number(slot.weak.accuracy) || 0)) {

      slot.weak = row;

    }

  }

  for (const row of stableRows) {

    const sid = String(row.subjectId || "");

    if (!bySubject.has(sid)) bySubject.set(sid, {});

    const slot = bySubject.get(sid);

    if (!slot.strong || (Number(row.accuracy) || 0) > (Number(slot.strong.accuracy) || 0)) {

      slot.strong = row;

    }

  }



  const usedMixedSubjects = new Set();



  for (const [, slot] of bySubject) {

    if (!slot.weak) continue;

    const strongLabel = String(slot.strong?.label || "").trim();

    const weakLabel = String(slot.weak.label || "").trim();

    if (

      slot.strong &&

      slot.strong.rowKey !== slot.weak.rowKey &&

      strongLabel &&

      weakLabel &&

      strongLabel !== weakLabel

    ) {

      const mixed = mixedSubjectStrongWeakHe(slot.weak.subjectLabelHe, strongLabel, weakLabel);

      if (mixed) {

        attentionLines.push(mixed);

        usedMixedSubjects.add(String(slot.weak.subjectId || ""));

        continue;

      }

    }

    if (attentionLines.length < 2) {

      const line = buildTopicEngineInsightLineHe(slot.weak);

      if (line) attentionLines.push(line);

    }

  }



  for (const row of stableRows) {

    if (strengthLines.length >= 1) break;

    const sid = String(row.subjectId || "");

    if (usedMixedSubjects.has(sid)) continue;

    const line = buildLpdSafeTopicInsightLineHe(row);

    if (line) strengthLines.push(line);

  }



  for (const line of dataLines) pushUnique(insights, line);

  for (const line of attentionLines.slice(0, 2)) pushUnique(insights, line);

  for (const line of strengthLines.slice(0, 1)) pushUnique(insights, line);



  if (!attentionLines.length && !strengthLines.length && rows.length) {

    const best = [...attentionRows].sort(

      (a, b) => (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0),

    )[0];

    if (best) {

      const line = buildTopicEngineInsightLineHe(best);

      if (line) pushUnique(insights, line);

    }

  }



  return insights.slice(0, 4);

}



/**

 * Spec §8.3 — if subject+topic already in insights, overview uses numbers-only wording.

 * @param {Record<string, unknown>} report

 * @param {string[]} insightLines

 */

function dedupeDiagnosticOverviewAgainstInsights(report, insightLines) {

  const ov = report?.summary?.diagnosticOverviewHe;

  if (!ov || typeof ov !== "object" || !Array.isArray(insightLines) || !insightLines.length) return;



  /** @type {Set<string>} */

  const insightTopics = new Set();

  for (const line of insightLines) {

    const matches = String(line || "").match(/«([^»]+)»/g) || [];

    for (const m of matches) {

      const topic = m.replace(/[«»]/g, "").trim();

      if (topic) insightTopics.add(topic);

    }

  }

  if (!insightTopics.size) return;



  const rows = collectTopicEngineRowsFromReport(report);

  const numbersOnlyLine = (line) => {

    const s = String(line || "").trim();

    if (!s) return line;

    for (const topic of insightTopics) {

      if (!s.includes(topic)) continue;

      const row = rows.find((r) => String(r.label || "").trim() === topic);

      if (!row) continue;

      const subj = subjectLabelHe(String(row.subjectId || "")) || String(row.subjectLabelHe || "");

      const q = Number(row.questions) || 0;

      const acc = Math.round(Number(row.accuracy) || 0);

      if (q > 0 && subj) {

        return `${subj}: ${topic}: כ-${q} שאלות, דיוק ${acc}%`;

      }

    }

    return line;

  };



  ov.mainFocusAreaLineHe = numbersOnlyLine(ov.mainFocusAreaLineHe);

  ov.strongestAreaLineHe = numbersOnlyLine(ov.strongestAreaLineHe);

  if (Array.isArray(ov.readyForProgressPreviewHe)) {

    ov.readyForProgressPreviewHe = ov.readyForProgressPreviewHe.map(numbersOnlyLine).filter(Boolean);

  }

  if (Array.isArray(ov.requiresAttentionPreviewHe)) {

    ov.requiresAttentionPreviewHe = ov.requiresAttentionPreviewHe.map(numbersOnlyLine).filter(Boolean);

  }

}



/**

 * @param {Record<string, unknown>} clientReport

 * @param {Record<string, unknown>|null|undefined} [apiPayload]

 */

export function applyTopicEngineParentFacingInsights(clientReport, apiPayload = null) {

  if (!clientReport || typeof clientReport !== "object") return clientReport;



  const payload = apiPayload || clientReport._reportApiPayload || null;

  const engineInsights = buildParentInsightsFromTopicEngineHe(clientReport, payload);

  const hasEngineRows = collectTopicEngineRowsFromReport(clientReport).some(

    (r) => r.topicEngineRowSignals,

  );



  if (!clientReport.parentFacing || typeof clientReport.parentFacing !== "object") {

    clientReport.parentFacing = {};

  }



  if (hasEngineRows) {

    const activityGap = buildActivityGapParentInsightHe(payload);

    clientReport.parentFacing.insights =

      engineInsights.length > 0

        ? engineInsights

        : activityGap

          ? [activityGap]

          : [noUrgentTopicInsightHe()];

    clientReport._parentFacingInsightsSource = "topic_engine";

    dedupeDiagnosticOverviewAgainstInsights(clientReport, engineInsights);

  } else if (engineInsights.length) {

    clientReport.parentFacing.insights = engineInsights;

    clientReport._parentFacingInsightsSource = "topic_engine";

    dedupeDiagnosticOverviewAgainstInsights(clientReport, engineInsights);

  }



  const activityGap = buildActivityGapParentInsightHe(payload);

  if (activityGap) {

    if (!clientReport.summary || typeof clientReport.summary !== "object") {

      clientReport.summary = {};

    }

    clientReport.summary.activityGapNoteHe = activityGap;

  }



  return clientReport;

}



export { buildTopicDiagnosticExplainSectionsHe };



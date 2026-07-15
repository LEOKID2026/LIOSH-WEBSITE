/**
 * Worksheet recommendations from learning data — not parent report UI.
 * @module lib/worksheets/worksheet-recommendation-engine.server
 */

import { aggregateParentReportPayload } from "../parent-server/report-data-aggregate.server.js";
import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import {
  classifySubjectEvidenceTier,
  subjectQuestionCountsFromPayload,
  SUBJECT_EVIDENCE_TIER,
  SUBJECT_LABEL_BY_ID,
} from "../../utils/parent-report-language/subject-evidence-policy.js";
import { WORKSHEET_SUBJECT_ALLOWLIST } from "./worksheet-print-allowlist.js";
import { worksheetPublicLevelLabelHe } from "./worksheet-level-display.js";
import {
  worksheetSubjectLabelHe,
  worksheetTopicLabelHe,
} from "./worksheet-meta-labels.server.js";
import { worksheetTopicOptionsForGrade } from "./worksheet-topic-options.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

export const WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE =
  "אחרי עוד קצת תרגול נוכל להציע דפי עבודה אישיים לילד.";

const CORE_SUBJECTS = /** @type {WorksheetSubjectId[]} */ (
  Object.keys(WORKSHEET_SUBJECT_ALLOWLIST)
);

const RECOMMENDATION_LOOKBACK_DAYS = 30;
const MAX_RECOMMENDATIONS = 6;
const DEFAULT_QUESTION_COUNT = 8;

/**
 * @typedef {Object} WorksheetRecommendation
 * @property {string} id
 * @property {WorksheetSubjectId} subjectId
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {string} subjectHe
 * @property {string} topicHe
 * @property {string} levelHe
 * @property {string} reasonHe
 * @property {number} practicedAnswers
 * @property {number} accuracyPct
 */

/**
 * @param {Record<string, unknown>} reportPayload
 * @param {string} gradeKey
 * @returns {WorksheetRecommendation[]}
 */
export function buildWorksheetRecommendationsFromReport(reportPayload, gradeKey) {
  const subjectCounts = subjectQuestionCountsFromPayload(reportPayload);
  /** @type {WorksheetRecommendation[]} */
  const candidates = [];

  for (const subjectId of CORE_SUBJECTS) {
    const subjectTier = classifySubjectEvidenceTier(subjectCounts[subjectId] || 0);
    if (subjectTier === SUBJECT_EVIDENCE_TIER.none) continue;

    const subjectBlock = reportPayload?.subjects?.[subjectId];
    if (!subjectBlock?.topics || typeof subjectBlock.topics !== "object") continue;

    const allowedTopics = new Set(
      worksheetTopicOptionsForGrade(subjectId, gradeKey).map((t) => t.key)
    );

    for (const [topicKey, topicAgg] of Object.entries(subjectBlock.topics)) {
      if (!allowedTopics.has(topicKey)) continue;
      const answers = Math.max(0, Math.floor(Number(topicAgg?.answers) || 0));
      if (answers <= 0) continue;

      const correct = Math.max(0, Math.floor(Number(topicAgg?.correct) || 0));
      const accuracyPct = answers > 0 ? Math.round((correct / answers) * 100) : 0;

      const levelKey = pickRecommendationLevel(accuracyPct);
      const topicHe = worksheetTopicLabelHe(subjectId, topicKey);
      const subjectHe = worksheetSubjectLabelHe(subjectId);
      const levelHe = worksheetPublicLevelLabelHe(levelKey);

      candidates.push({
        id: `${subjectId}:${topicKey}:${gradeKey}`,
        subjectId,
        gradeKey,
        topicKey,
        levelKey,
        count: DEFAULT_QUESTION_COUNT,
        subjectHe,
        topicHe,
        levelHe,
        reasonHe: buildReasonHe(subjectHe, topicHe, answers, accuracyPct),
        practicedAnswers: answers,
        accuracyPct,
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
    return b.practicedAnswers - a.practicedAnswers;
  });

  return candidates.slice(0, MAX_RECOMMENDATIONS);
}

/**
 * @param {number} accuracyPct
 * @returns {import("./worksheet-level-display.js").WorksheetPublicLevelKey}
 */
function pickRecommendationLevel(accuracyPct) {
  if (accuracyPct < 70) return "regular";
  return "advanced";
}

/**
 * @param {string} subjectHe
 * @param {string} topicHe
 * @param {number} answers
 * @param {number} accuracyPct
 */
function buildReasonHe(subjectHe, topicHe, answers, accuracyPct) {
  const label = SUBJECT_LABEL_BY_ID.math === subjectHe ? subjectHe : subjectHe;
  return `תורגל ${topicHe} ב${label} - ${answers} שאלות, דיוק ${accuracyPct}%`;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {{ id: string, grade_level?: string | null, full_name?: string | null }} student
 * @returns {Promise<
 *   | { ok: true, recommendations: WorksheetRecommendation[], hasEvidence: boolean }
 *   | { ok: false, status: number, code: string }
 * >}
 */
export async function fetchWorksheetRecommendationsForStudent(serviceRole, student) {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - RECOMMENDATION_LOOKBACK_DAYS);

  const report = await aggregateParentReportPayload(serviceRole, student, fromDate, toDate);
  if (!report?.ok) {
    return { ok: false, status: 422, code: report?.error || "report_unavailable" };
  }

  const gradeKey = normalizeGradeLevelToKey(student.grade_level) || "g3";
  const recommendations = buildWorksheetRecommendationsFromReport(report, gradeKey);

  return {
    ok: true,
    recommendations,
    hasEvidence: recommendations.length > 0,
  };
}

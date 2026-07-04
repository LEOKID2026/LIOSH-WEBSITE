/**
 * Project learningPatternDecision from history parent topics onto subtopic breakdown rows.
 * Subtopics are parent-facing in engine insights + detailed report map (not short-report table).
 */
import { emptyLearningPatternDecision } from "./schema.js";

/**
 * @param {Record<string, Record<string, unknown>>} historyTopics
 * @param {string} parentTopicKey
 */
function findParentTopicRow(historyTopics, parentTopicKey) {
  if (!historyTopics || typeof historyTopics !== "object") return null;
  const pk = String(parentTopicKey || "").trim();
  if (!pk) return null;

  for (const [key, row] of Object.entries(historyTopics)) {
    if (!row || typeof row !== "object") continue;
    const bk = String(row.bucketKey || key.split("\u0001")[0] || key);
    if (key === pk || bk === pk || key.startsWith(`${pk}::`) || key.startsWith(`${pk}\u0001`)) {
      return row;
    }
  }
  return null;
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape} parentLpd
 * @param {Record<string, unknown>} subRow
 * @param {string} subtopicKey
 * @param {string} parentTopicKey
 */
function projectSubtopicLpd(parentLpd, subRow, subtopicKey, parentTopicKey) {
  const q = Math.max(0, Number(subRow.questions) || 0);
  const c = Math.max(0, Number(subRow.correct) || 0);
  const w = Math.max(0, q - c);
  const acc = Number.isFinite(Number(subRow.accuracy)) ? Number(subRow.accuracy) : q > 0 ? (c / q) * 100 : 0;

  return {
    ...parentLpd,
    subjectId: "history",
    topicKey: subtopicKey,
    practicedQuestions: q,
    correctCount: c,
    wrongCount: w,
    accuracy: acc,
    parentVisibleFinding: String(parentLpd.parentVisibleFinding || ""),
    parentWordingLevel: parentLpd.parentWordingLevel || "no_parent_text",
    projectedFrom: {
      subjectId: "history",
      parentTopicKey,
      subtopicKey,
      projectionKind: "history_subtopic_breakdown",
    },
    subtopicBreakdown: true,
    sourceEngines: [...new Set([...(parentLpd.sourceEngines || []), "history_subtopic_projection"])],
    trace: [
      ...(Array.isArray(parentLpd.trace) ? parentLpd.trace : []),
      `projected:history_subtopic_from:${parentTopicKey}`,
    ],
  };
}

/**
 * @param {Record<string, Record<string, unknown>>|undefined|null} historyTopics
 * @param {Record<string, Record<string, unknown>>|undefined|null} historySubtopics
 */
export function projectHistorySubtopicLearningPatternDecisions(historyTopics, historySubtopics) {
  if (!historySubtopics || typeof historySubtopics !== "object") return { projected: 0, skipped: 0 };

  let projected = 0;
  let skipped = 0;

  for (const [subtopicKey, subRow] of Object.entries(historySubtopics)) {
    if (!subRow || typeof subRow !== "object") continue;
    const q = Number(subRow.questions) || 0;
    const parentTopicKey = String(subRow.parentTopicKey || "").trim();

    if (q <= 0) {
      subRow.learningPatternDecision = {
        ...emptyLearningPatternDecision("history", subtopicKey),
        topicStatus: "not_practiced",
        parentWordingLevel: "no_parent_text",
        subtopicBreakdown: true,
        trace: ["history_subtopic:not_practiced_q0"],
      };
      skipped += 1;
      continue;
    }

    const parentRow = findParentTopicRow(historyTopics, parentTopicKey);
    const parentLpd = parentRow?.learningPatternDecision;

    if (parentLpd && typeof parentLpd === "object") {
      subRow.learningPatternDecision = projectSubtopicLpd(parentLpd, subRow, subtopicKey, parentTopicKey);
      subRow.needsPractice =
        subRow.learningPatternDecision.findingType === "difficulty_pattern" ||
        String(subRow.learningPatternDecision.topicStatus || "").includes("difficulty");
      projected += 1;
      continue;
    }

    subRow.learningPatternDecision = {
      ...emptyLearningPatternDecision("history", subtopicKey),
      practicedQuestions: q,
      correctCount: Number(subRow.correct) || 0,
      wrongCount: Math.max(0, q - (Number(subRow.correct) || 0)),
      accuracy: Number(subRow.accuracy) || 0,
      topicStatus: "no_clear_pattern",
      parentWordingLevel: "no_parent_text",
      subtopicBreakdown: true,
      enrichmentMissing: ["parent_topic_lpd"],
      trace: [`history_subtopic:missing_parent_lpd:${parentTopicKey}`],
    };
    skipped += 1;
  }

  return { projected, skipped };
}

export default { projectHistorySubtopicLearningPatternDecisions };

/**
 * Resolve Copilot scope when utterance is locked to history (no cross-subject drift).
 */

import { subjectLabelHe } from "./contract-reader.js";
import { historySubtopicLabelHe as historyCurriculumSubtopicLabelHe } from "../../data/history-curriculum.js";
import {
  detectHistoryCopilotLock,
  findHistoryTopicRowKey,
  historyScopeLabelFromLock,
  historySubtopicQuestionsFromPayload,
  historySubjectQuestionsFromPayload,
  historyTopicQuestionsFromPayload,
} from "./history-scope-he.js";

const historySubtopicLabelHe = historyCurriculumSubtopicLabelHe || ((k) => String(k || ""));

/**
 * @param {object} params
 * @param {unknown} params.payload
 * @param {string} params.utterance
 * @param {ReturnType<typeof import("./stage-a-freeform-interpretation.js").interpretFreeformStageA>} params.stageA
 * @param {Function} params.attachScopeInterpretation
 * @param {Function} params.resolveSubjectScopeOrZeroEvidence
 * @returns {ReturnType<typeof import("./scope-resolver.js").resolveScope>|null}
 */
export function tryResolveHistoryLockedScope(params) {
  const historyLock = detectHistoryCopilotLock(params.utterance);
  if (!historyLock?.locked) return null;

  const payload = params.payload;
  const stageA = params.stageA;
  const attach = (scope, reason, confidence = 0.93) => ({
    resolutionStatus: "resolved",
    scope: params.attachScopeInterpretation({ ...scope, historyLock: true, subjectId: "history" }, stageA),
    scopeConfidence: confidence,
    scopeReason: reason,
    stageA,
  });

  if (historyLock.subtopicKey) {
    const subMap =
      payload?.historySubtopics?.[historyLock.subtopicKey] ||
      payload?.maps?.historySubtopics?.[historyLock.subtopicKey] ||
      null;
    const subQ = Math.max(0, Number(subMap?.questions) || historySubtopicQuestionsFromPayload(payload, historyLock.subtopicKey));
    const label = historySubtopicLabelHe(historyLock.subtopicKey);
    if (subQ === 0) {
      return attach(
        {
          scopeType: "topic",
          scopeId: historyLock.subtopicKey,
          scopeLabel: label,
          historyZeroData: true,
          historySubtopicKey: historyLock.subtopicKey,
          topicBaseKey: historyLock.topicBaseKey,
        },
        "history_lock_zero_data_subtopic",
        0.94,
      );
    }
    return attach(
      {
        scopeType: "topic",
        scopeId: historyLock.subtopicKey,
        scopeLabel: label,
        historySubtopicKey: historyLock.subtopicKey,
        topicBaseKey: historyLock.topicBaseKey,
      },
      "history_lock_subtopic_with_data",
      0.94,
    );
  }

  if (historyLock.topicBaseKey) {
    const topicQ = historyTopicQuestionsFromPayload(payload, historyLock.topicBaseKey);
    const label = historyScopeLabelFromLock(historyLock);
    const topicRowKey = findHistoryTopicRowKey(payload, historyLock.topicBaseKey);
    if (topicQ === 0) {
      return attach(
        {
          scopeType: "topic",
          scopeId: topicRowKey || historyLock.topicBaseKey,
          scopeLabel: label,
          historyZeroData: true,
          topicBaseKey: historyLock.topicBaseKey,
        },
        "history_lock_zero_data_topic",
        0.94,
      );
    }
    return attach(
      {
        scopeType: "topic",
        scopeId: topicRowKey,
        scopeLabel: label,
        topicBaseKey: historyLock.topicBaseKey,
      },
      "history_lock_topic_with_data",
      0.95,
    );
  }

  const histQ = historySubjectQuestionsFromPayload(payload);
  if (histQ === 0) {
    return attach(
      {
        scopeType: "subject",
        scopeId: "history",
        scopeLabel: subjectLabelHe("history"),
        historyZeroData: true,
      },
      "history_lock_zero_data_subject",
      0.92,
    );
  }

  return params.resolveSubjectScopeOrZeroEvidence(
    "history",
    payload,
    stageA,
    "history_subject_lock",
    0.94,
  );
}

export default { tryResolveHistoryLockedScope };

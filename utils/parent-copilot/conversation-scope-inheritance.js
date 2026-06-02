/**
 * Multi-turn scope inheritance for contextual follow-ups (no new topic anchor in utterance).
 */

import { foldUtteranceForHeMatch, normalizeFreeformParentUtteranceHe } from "./utterance-normalize-he.js";
import { resolveReportRowFromUtterance } from "./report-row-resolver.js";
import { findTopicRowByKey, subjectLabelHe } from "./contract-reader.js";
import { interpretFreeformStageA } from "./stage-a-freeform-interpretation.js";
import { isContextualFollowUpUtterance } from "./contextual-follow-up-he.js";

const NAMED_TOPIC_RE =
  /שברים|חיסור|חיבור|כפל|חילוק|שבר|אנגלית|עברית|גאומטריה|גיאומטריה|מדעים|מולדת|גאוגרפיה|חשבון/u;

export { isContextualFollowUpUtterance } from "./contextual-follow-up-he.js";

/**
 * @param {string} scopeToken e.g. topic:fractions::grade:g5
 */
function parsePriorScopeToken(scopeToken) {
  const raw = String(scopeToken || "").trim();
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts[0] === "topic" && parts[1]) {
    return { scopeType: "topic", scopeId: parts.slice(1).join(":") };
  }
  if (parts[0] === "subject" && parts[1]) {
    return { scopeType: "subject", scopeId: parts[1] };
  }
  return null;
}

/**
 * @param {object} conv
 */
export function lastResolvedScopeFromConversation(conv) {
  const scopes = Array.isArray(conv?.priorScopes) ? conv.priorScopes : [];
  for (let i = scopes.length - 1; i >= 0; i--) {
    const parsed = parsePriorScopeToken(scopes[i]);
    if (parsed) return parsed;
  }
  const label = String(conv?.lastScopeLabelHe || "").trim();
  if (label) return { scopeType: "topic", scopeId: "", scopeLabel: label, labelOnly: true };
  return null;
}

/**
 * @param {object} params
 * @param {string} params.utterance
 * @param {unknown} params.payload
 * @param {object} [params.conversationState]
 * @param {ReturnType<typeof interpretFreeformStageA>} [params.stageA]
 */
export function tryResolveInheritedScope(params) {
  const utterance = String(params?.utterance || "");
  const payload = params?.payload;
  const conv = params?.conversationState;
  if (!payload || !conv) return null;
  if (!isContextualFollowUpUtterance(utterance)) return null;

  const normalized = normalizeFreeformParentUtteranceHe(utterance);
  const folded = foldUtteranceForHeMatch(normalized);
  if (NAMED_TOPIC_RE.test(folded)) return null;

  const rowRes = resolveReportRowFromUtterance(normalized, payload);
  if (rowRes.best?.topicRowKey) return null;
  if (rowRes.subjectId && !rowRes.best) return null;

  let prior = lastResolvedScopeFromConversation(conv);
  if (!prior?.scopeId && String(conv?.lastResolvedTopic || "").trim()) {
    prior = { scopeType: "topic", scopeId: String(conv.lastResolvedTopic).trim() };
  } else if (!prior?.scopeId && String(conv?.lastResolvedSubject || "").trim()) {
    prior = { scopeType: "subject", scopeId: String(conv.lastResolvedSubject).trim() };
  }
  if (!prior) return null;

  const stageA = params.stageA || interpretFreeformStageA(utterance, payload);

  if (prior.scopeType === "topic" && prior.scopeId) {
    const hit = findTopicRowByKey(payload, prior.scopeId, "");
    const label =
      String(hit?.tr?.displayName || "").trim() ||
      String(conv?.lastScopeLabelHe || "").trim() ||
      "נושא";
    return {
      resolutionStatus: "resolved",
      scope: {
        scopeType: "topic",
        scopeId: prior.scopeId,
        scopeLabel: label,
        interpretationScope: /טעויות|טעיות|טעה|חוזר\s*בטעות/u.test(folded)
          ? "mistake_patterns"
          : stageA.scopeClass || "weaknesses",
        scopeClass: stageA.scopeClass || "weaknesses",
      },
      scopeConfidence: 0.92,
      scopeReason: "conversation_inherited_topic_scope",
      stageA,
    };
  }

  if (prior.scopeType === "subject" && prior.scopeId) {
    return {
      resolutionStatus: "resolved",
      scope: {
        scopeType: "subject",
        scopeId: prior.scopeId,
        scopeLabel: subjectLabelHe(prior.scopeId),
        interpretationScope: stageA.scopeClass || "weaknesses",
        scopeClass: stageA.scopeClass || "weaknesses",
      },
      scopeConfidence: 0.88,
      scopeReason: "conversation_inherited_subject_scope",
      stageA,
    };
  }

  return null;
}

export default {
  isContextualFollowUpUtterance,
  lastResolvedScopeFromConversation,
  tryResolveInheritedScope,
};

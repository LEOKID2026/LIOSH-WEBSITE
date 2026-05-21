import { buildHypothesisKey } from "./hypothesis-key.js";

function safeString(value, maxLen = 160) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function safeTags(value, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeString(item, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function buildDiagnosticProbeClientMeta({ probeMeta, ledger, inferredTags, answeredAt, learningSessionId }) {
  if (!probeMeta || typeof probeMeta !== "object") return null;
  const status = safeString(ledger?.status, 40);
  if (!["supported", "weakened", "uncertain"].includes(status || "")) return null;
  const probeKey = buildHypothesisKey(probeMeta) || safeString(probeMeta.sourceHypothesisId, 160);
  return {
    isDiagnosticProbeAttempt: true,
    probeId: probeKey,
    subjectId: safeString(probeMeta.subjectId, 40),
    topicId: safeString(probeMeta.topicId, 120),
    diagnosticSkillId: safeString(probeMeta.diagnosticSkillId, 160),
    dominantTag: safeString(probeMeta.dominantTag, 120),
    expectedErrorTags: safeTags(probeMeta.expectedErrorTags),
    inferredTags: safeTags(inferredTags),
    outcomeStatus: status,
    lastOutcome: safeString(ledger?.lastOutcome, 80),
    supportCount: Number.isFinite(Number(ledger?.supportCount)) ? Number(ledger.supportCount) : 0,
    weakenCount: Number.isFinite(Number(ledger?.weakenCount)) ? Number(ledger.weakenCount) : 0,
    answeredAt: Number.isFinite(Number(answeredAt)) ? Number(answeredAt) : Date.now(),
    learningSessionId: safeString(learningSessionId, 80),
  };
}

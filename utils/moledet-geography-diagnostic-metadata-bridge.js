import { normalizeExpectedErrorTags } from "../lib/learning/taxonomy-tag-normalizer.js";
import { defaultErrorTagsForSubjectTopic } from "../lib/learning/mcq-subject-default-error-tags.js";

/** @param {string} topic */
function topicSkillId(topic) {
  const t = String(topic || "homeland").trim() || "homeland";
  return `moledet_geo_${t}`;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} topic
 */
export function moledetDiagnosticContractFromBankRow(row, topic) {
  const r = row && typeof row === "object" ? row : {};
  const skill = String(r.skillId || topicSkillId(topic)).trim();
  const types = Array.isArray(r.expectedErrorTypes)
    ? r.expectedErrorTypes.map((x) => String(x).trim()).filter(Boolean)
    : [];
  let tags = Array.isArray(r.expectedErrorTags)
    ? r.expectedErrorTags.map((x) => String(x).trim()).filter(Boolean)
    : types.length
      ? types
      : [];
  tags = normalizeExpectedErrorTags([
    ...defaultErrorTagsForSubjectTopic("moledet_geography", topic, r.patternFamily),
    ...tags,
  ]);
  if (tags.length === 0) {
    tags = normalizeExpectedErrorTags(["concept_confusion", "fact_recall_gap"]);
  }
  return {
    diagnosticSkillId: String(r.diagnosticSkillId || skill),
    patternFamily: String(r.patternFamily || skill),
    conceptTag: String(r.conceptTag || `moledet_${topic}`),
    expectedErrorTags: tags,
    probePower: r.probePower != null ? String(r.probePower) : "medium",
    subtype: r.subtype != null ? String(r.subtype) : undefined,
    kind: r.kind != null ? String(r.kind) : String(topic),
  };
}

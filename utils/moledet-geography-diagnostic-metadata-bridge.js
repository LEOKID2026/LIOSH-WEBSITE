/**
 * Maps static geography bank rows → diagnostic contract fields on question.params.
 * No stem/option changes.
 */

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
  const tags = Array.isArray(r.expectedErrorTags)
    ? r.expectedErrorTags.map((x) => String(x).trim()).filter(Boolean)
    : types.length
      ? types
      : ["fact_recall_gap", "concept_confusion"];
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

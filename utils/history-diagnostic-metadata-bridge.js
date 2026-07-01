/**
 * Maps static history bank rows → diagnostic contract fields on question.params.
 */

import { HISTORY_G6_CONTENT_MAP as HISTORY_G6_CONTENT_MAP_SOURCE } from "../data/history-g6-content-map.js";
import { HISTORY_SKILL_LABEL_HE as HISTORY_CURRICULUM_SKILL_LABEL_HE } from "../data/history-curriculum.js";

const HISTORY_G6_CONTENT_MAP = HISTORY_G6_CONTENT_MAP_SOURCE || {};
const HISTORY_SKILL_LABEL_HE = HISTORY_CURRICULUM_SKILL_LABEL_HE || {};

/** @type {Record<string, string>} */
const HISTORY_TAXONOMY_TO_SKILL = {
  "H-01": "hist_concepts",
  "H-02": "hist_timeline_sequence",
  "H-03": "hist_cause_effect",
  "H-04": "hist_comparison",
  "H-05": "hist_figures_roles",
  "H-06": "hist_governance_institutions",
  "H-07": "hist_culture_heritage",
  "H-08": "hist_simple_source",
  "H-09": "hist_past_present_link",
};

/**
 * @param {string} topic
 * @returns {{ skillId: string, subskillId: string } | null}
 */
function defaultPairForTopic(topic) {
  const t = String(topic || "").trim();
  const cfg = HISTORY_G6_CONTENT_MAP[t];
  const first = cfg?.subtopics?.[0];
  if (!first) return null;
  return { skillId: String(first.skillId), subskillId: String(first.id) };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} topic
 */
export function historyDiagnosticContractFromBankRow(row, topic) {
  const r = row && typeof row === "object" ? row : {};
  const pair = defaultPairForTopic(topic);
  const skill =
    String(r.skillId || r.diagnosticSkillId || pair?.skillId || "hist_concepts").trim();
  const subskill =
    String(r.subskillId || r.subtopicKey || r.subtype || pair?.subskillId || skill).trim();
  const taxonomyId = String(r.taxonomyId || "").trim();
  const mappedSkill = HISTORY_TAXONOMY_TO_SKILL[taxonomyId];
  const diagnosticSkillId = String(r.diagnosticSkillId || mappedSkill || skill).trim();
  const types = Array.isArray(r.expectedErrorTypes)
    ? r.expectedErrorTypes.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const tags = Array.isArray(r.expectedErrorTags)
    ? r.expectedErrorTags.map((x) => String(x).trim()).filter(Boolean)
    : types.length
      ? types
      : ["concept_confusion", "fact_recall_gap"];
  const patternFamily =
    String(r.patternFamily || "").trim() ||
    (HISTORY_SKILL_LABEL_HE[diagnosticSkillId]
      ? `hist_${diagnosticSkillId.replace(/^hist_/, "")}`
      : `hist_${String(topic || "mixed")}`);
  return {
    diagnosticSkillId,
    patternFamily,
    conceptTag: String(r.conceptTag || subskill || `hist_${topic}`),
    expectedErrorTags: tags,
    probePower: r.probePower != null ? String(r.probePower) : "medium",
    subtype: subskill,
    subskillId: subskill,
    kind: r.kind != null ? String(r.kind) : String(topic),
  };
}

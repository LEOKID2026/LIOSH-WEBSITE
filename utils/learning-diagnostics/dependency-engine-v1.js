/**
 * Prerequisite / dependency reasoning between skills (educational heuristics).
 */

export const DEPENDENCY_ENGINE_V1 = "1.0.0";

/** Skill-level prerequisites (skillId → prerequisite skillIds). */
/** @type {Record<string, Record<string, string[]>>} */
export const PREREQUISITE_GRAPH_V1 = {
  math: {
    fractions: ["arithmetic_operations", "number_sense"],
    word_problems: ["arithmetic_operations", "fractions"],
    arithmetic_operations: [],
    number_sense: [],
  },
  hebrew: {
    reading_comprehension: ["language_grammar"],
    language_grammar: [],
  },
  science: {
    experiments: ["observation", "cause_and_effect"],
    scientific_reasoning: ["classification", "observation"],
    observation: [],
    cause_and_effect: [],
    classification: [],
  },
  geometry: {
    area: ["shapes", "spatial_reasoning"],
    shapes: [],
    spatial_reasoning: [],
    angles: ["shapes"],
  },
  "moledet-geography": {
    maps: ["directions"],
    directions: [],
    location_reasoning: ["maps"],
  },
  english: {
    reading_comprehension: ["vocabulary", "grammar"],
    grammar: ["vocabulary"],
    vocabulary: [],
    translation: ["vocabulary", "reading_comprehension"],
    sentence_understanding: ["vocabulary"],
  },
};

/**
 * @param {string} subjectId
 * @param {string} skillId
 */
export function getDependencyNode(subjectId, skillId) {
  const pre = PREREQUISITE_GRAPH_V1[subjectId]?.[skillId] ?? [];
  return {
    subjectId,
    skillId,
    subskillId: null,
    prerequisiteSkillIds: pre,
    blocks: pre,
    supports: [],
    diagnosticProbeIds: pre.map((p) => `probe_${p}`),
  };
}

/**
 * @param {object} params
 * @param {ReturnType<import('./mastery-engine-v1.js').computeMasteryRollupV1>} params.mastery
 * @param {string} params.subjectId
 * @param {string} params.skillId
 */
export function analyzePrerequisiteGap({ mastery, subjectId, skillId }) {
  const items = mastery?.items || [];
  const self = items.find((x) => x.subjectId === subjectId && x.skillId === skillId);
  const node = getDependencyNode(subjectId, skillId);
  const prereqStates = (node.prerequisiteSkillIds || []).map((pid) => ({
    id: pid,
    row: items.find((x) => x.subjectId === subjectId && x.skillId === pid),
  }));

  let suspectedPrerequisiteGap = false;
  let suspectedDirectSkillGap = false;
  const evidence = [];
  const weakSelf =
    self && (self.masteryBand === "emerging" || self.masteryBand === "developing" || Number(self.masteryScore) < 55);
  if (weakSelf && prereqStates.length > 0) {
    const prereqScores = prereqStates.map((p) => (p.row ? Number(p.row.masteryScore) : NaN));
    const allPrereqsStrong = prereqStates.every((p) => p.row && Number(p.row.masteryScore) >= 70);
    const anyPrereqWeakOrMissing = prereqStates.some((p) => !p.row || Number(p.row.masteryScore) < 55);

    if (allPrereqsStrong) {
      suspectedDirectSkillGap = true;
      evidence.push("Prerequisite skills look comparatively strong-focal skill gap is plausible.");
    } else if (anyPrereqWeakOrMissing) {
      suspectedPrerequisiteGap = true;
      for (const p of prereqStates) {
        if (!p.row || Number(p.row.masteryScore) < 50) {
          evidence.push(`Prerequisite ${p.id} appears weak or unmeasured.`);
        }
      }
    }
  } else if (weakSelf && prereqStates.length === 0) {
    suspectedDirectSkillGap = true;
    evidence.push("No prerequisite edges defined-treat as focal skill signal until mapped.");
  }

  return {
    skillId,
    blockedSkillId: skillId,
    suspectedPrerequisiteGap,
    suspectedDirectSkillGap,
    confidence: evidence.length ? "low" : "very_low",
    evidence,
    reasoning: [
      "Dependencies are educational hypotheses-verify with targeted probes.",
      "A weak advanced skill with weak prerequisites may indicate foundation gaps.",
    ],
    nextBestPrerequisiteToCheck:
      suspectedPrerequisiteGap && !suspectedDirectSkillGap ? node.prerequisiteSkillIds[0] || null : null,
    doNotConclude: [
      "Do not label subject-wide failure from a single dependency edge.",
      "No clinical or medical conclusions.",
    ],
  };
}

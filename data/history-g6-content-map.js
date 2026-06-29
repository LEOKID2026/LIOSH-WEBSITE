/**
 * History G6 content map — 16 subtopics with weights and skill mapping.
 * Source of truth for question generation and diagnostics alignment.
 */

const ALL_MODES = ["learning", "challenge", "speed", "marathon", "practice"];

export const HISTORY_G6_FLAGS_DEFAULT = {
  scoring: "none",
  visual: "off",
  source: "inherit",
};

/** @type {Record<string, { subtopics: Array<{ id: string, weight: number, order: number, skillId: string, modesAllowed: string[], flags: Record<string, string> }> }>} */
export const HISTORY_G6_CONTENT_MAP = {
  what_is_history: {
    subtopics: [
      {
        id: "hist_sub_intro_sources_timeline",
        weight: 10,
        order: 1,
        skillId: "hist_concepts",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
    ],
  },
  classical_greece: {
    subtopics: [
      {
        id: "hist_sub_athens_democracy",
        weight: 8,
        order: 1,
        skillId: "hist_governance_institutions",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_sparta",
        weight: 7,
        order: 2,
        skillId: "hist_governance_institutions",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_athens_sparta_compare",
        weight: 9,
        order: 3,
        skillId: "hist_comparison",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_greek_culture_legacy",
        weight: 8,
        order: 4,
        skillId: "hist_culture_heritage",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
    ],
  },
  hellenism_jews: {
    subtopics: [
      {
        id: "hist_sub_alexander_hellenism",
        weight: 9,
        order: 1,
        skillId: "hist_figures_roles",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_hellenism_meets_judaism",
        weight: 9,
        order: 2,
        skillId: "hist_cause_effect",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
    ],
  },
  hasmonaeans: {
    subtopics: [
      {
        id: "hist_sub_antiochus_maccabees",
        weight: 9,
        order: 1,
        skillId: "hist_cause_effect",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_hasmonaean_kingdom",
        weight: 8,
        order: 2,
        skillId: "hist_governance_institutions",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
    ],
  },
  rome_jews: {
    subtopics: [
      {
        id: "hist_sub_rise_of_rome",
        weight: 8,
        order: 1,
        skillId: "hist_timeline_sequence",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_roman_culture_law",
        weight: 7,
        order: 2,
        skillId: "hist_culture_heritage",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_hasmonaean_loss_roman_conquest",
        weight: 8,
        order: 3,
        skillId: "hist_cause_effect",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_herod_building",
        weight: 7,
        order: 4,
        skillId: "hist_figures_roles",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_judea_province",
        weight: 8,
        order: 5,
        skillId: "hist_governance_institutions",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_great_revolt_destruction",
        weight: 9,
        order: 6,
        skillId: "hist_timeline_sequence",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
      {
        id: "hist_sub_yavne_bar_kokhba_babylon",
        weight: 9,
        order: 7,
        skillId: "hist_past_present_link",
        modesAllowed: [...ALL_MODES],
        flags: { ...HISTORY_G6_FLAGS_DEFAULT },
      },
    ],
  },
};

/** Flat list of all G6 subtopic keys. */
export const HISTORY_G6_SUBTOPIC_IDS = Object.values(HISTORY_G6_CONTENT_MAP).flatMap((t) =>
  t.subtopics.map((s) => s.id)
);

/**
 * @param {string} subtopicKey
 * @returns {string|null}
 */
export function historyG6SkillIdForSubtopic(subtopicKey) {
  for (const topic of Object.values(HISTORY_G6_CONTENT_MAP)) {
    for (const st of topic.subtopics) {
      if (st.id === subtopicKey) return st.skillId;
    }
  }
  return null;
}

/**
 * @param {string} topicKey
 * @returns {string|null}
 */
export function historyG6TopicForSubtopic(subtopicKey) {
  for (const [topicKey, cfg] of Object.entries(HISTORY_G6_CONTENT_MAP)) {
    if (cfg.subtopics.some((s) => s.id === subtopicKey)) return topicKey;
  }
  return null;
}

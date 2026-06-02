/** Machine-readable Science Learning Book master scope (June 2026). */
export const SCIENCE_SUBJECT_KEY = "science";

export const SCIENCE_ALL_SKILL_IDS = [
  "science:topic:animals",
  "science:topic:body",
  "science:topic:earth_space",
  "science:topic:environment",
  "science:topic:experiments",
  "science:topic:materials",
  "science:topic:plants",
];

export const SCIENCE_MASTER_SCOPE = {
  subjectKey: SCIENCE_SUBJECT_KEY,
  totalScienceSkills: 7,
  allSkillIds: SCIENCE_ALL_SKILL_IDS,
  grades: {
    g1: {
      included: [
        "science:topic:animals",
        "science:topic:body",
        "science:topic:earth_space",
        "science:topic:environment",
        "science:topic:materials",
        "science:topic:plants",
      ],
      excluded: [
        {
          skill_id: "science:topic:experiments",
          reason: "spine_minGrade_2",
        },
      ],
      teachable: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:plants",
        "science:topic:materials",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
      new: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:plants",
        "science:topic:materials",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
      continuing: [],
    },
    g2: {
      included: SCIENCE_ALL_SKILL_IDS,
      excluded: [],
      teachable: SCIENCE_ALL_SKILL_IDS,
      new: ["science:topic:experiments"],
      continuing: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:plants",
        "science:topic:materials",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
    },
    g3: {
      included: SCIENCE_ALL_SKILL_IDS,
      excluded: [],
      teachable: SCIENCE_ALL_SKILL_IDS,
      new: [],
      continuing: SCIENCE_ALL_SKILL_IDS,
    },
    g4: {
      included: [
        "science:topic:animals",
        "science:topic:body",
        "science:topic:earth_space",
        "science:topic:environment",
        "science:topic:experiments",
        "science:topic:materials",
      ],
      excluded: [
        {
          skill_id: "science:topic:plants",
          reason: "spine_maxGrade_3",
        },
      ],
      teachable: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
      new: [],
      continuing: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
    },
    g5: {
      included: [
        "science:topic:animals",
        "science:topic:body",
        "science:topic:earth_space",
        "science:topic:environment",
        "science:topic:experiments",
        "science:topic:materials",
      ],
      excluded: [
        {
          skill_id: "science:topic:plants",
          reason: "spine_maxGrade_3",
        },
      ],
      teachable: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
      new: [],
      continuing: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
    },
    g6: {
      included: [
        "science:topic:animals",
        "science:topic:body",
        "science:topic:earth_space",
        "science:topic:environment",
        "science:topic:experiments",
        "science:topic:materials",
      ],
      excluded: [
        {
          skill_id: "science:topic:plants",
          reason: "spine_maxGrade_3",
        },
      ],
      teachable: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
      new: [],
      continuing: [
        "science:topic:body",
        "science:topic:animals",
        "science:topic:materials",
        "science:topic:experiments",
        "science:topic:earth_space",
        "science:topic:environment",
      ],
    },
  },
  proposedPageCounts: {
    g1: 6,
    g2: 7,
    g3: 7,
    g4: 6,
    g5: 6,
    g6: 6,
  },
  inScopeSkillCountsByGrade: {
    1: 6,
    2: 7,
    3: 7,
    4: 6,
    5: 6,
    6: 6,
  },
};

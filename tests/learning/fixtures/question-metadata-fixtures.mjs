/**
 * Q2-B — subject fixtures for normalizeQuestionMetadata (representative legacy shapes).
 */

/** @type {Record<string, Record<string, unknown>>} */
export const SUBJECT_FIXTURES = {
  math: {
    subject: "math",
    topic: "fractions",
    grade: "g4",
    skillId: "math_frac_add_like",
    subskillId: "like_denominators",
    cognitiveLevel: "understanding",
    difficulty: "medium",
    params: {
      kind: "frac_add_like",
      diagnosticSkillId: "math_frac_add_like",
      subtype: "like_denominators",
      patternFamily: "frac_add_like",
      expectedErrorTags: ["denominator_confusion", "calculation_error"],
      difficulty: "medium",
    },
    questionEngine: {
      version: "phase-8-mcq-contract-v1",
      questionType: "mcq",
      skillId: "math_frac_add_like",
      subtopic: "like_denominators",
      metadataConfidence: "full",
      distractorFamily: "denominator_confusion",
    },
  },

  geometry: {
    subject: "geometry",
    topic: "area",
    grade: "g5",
    shape: "square",
    params: {
      kind: "square_area",
      diagnosticSkillId: "geo_square_area",
      patternFamily: "geo_area_square",
      subtype: "square_side",
      expectedErrorTags: ["formula_swap", "unit_error"],
      cognitiveLevel: "application",
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "geo_square_area",
      subtopic: "square_side",
      metadataConfidence: "partial",
    },
  },

  science: {
    subject: "science",
    topic: "body",
    grade: "g3",
    params: {
      diagnosticSkillId: "sci_body_fact_recall",
      patternFamily: "science_body_heart_location",
      subtype: "sci_body_general",
      conceptTag: "body_heart_place",
      cognitiveLevel: "understanding",
      difficulty: "basic",
      probePower: "medium",
      expectedErrorTags: ["fact_recall_gap", "concept_confusion"],
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "sci_body_fact_recall",
      subtopic: "sci_body_general",
      metadataConfidence: "full",
    },
  },

  english: {
    subject: "english",
    topic: "grammar",
    grade: "g4",
    params: {
      patternFamily: "english_grammar_verb_tense",
      subtype: "past_simple",
      distractorFamily: "grammar_forms",
      difficulty: "medium",
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "eng_grammar_past_simple",
      subtopic: "past_simple",
      metadataConfidence: "partial",
    },
  },

  hebrew: {
    subject: "hebrew",
    topic: "phoneme_awareness",
    grade: "g1",
    subtopicId: "g1.phoneme_awareness",
    difficultyBand: "easy",
    params: {
      subtype: "initial_sound",
      patternFamily: "hebrew_phoneme_initial",
    },
    questionEngine: {
      questionType: "mcq",
      subtopic: "initial_sound",
      metadataConfidence: "minimal",
    },
  },

  moledet: {
    subject: "moledet_geography",
    topic: "homeland",
    grade: "g3",
    params: {
      kind: "homeland",
      diagnosticSkillId: "moledet_geo_homeland",
      subtype: "map_regions",
      conceptTag: "moledet_homeland",
      cognitiveLevel: "recall",
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "moledet_geo_homeland",
      subtopic: "map_regions",
      metadataConfidence: "partial",
    },
  },

  frozenAssigned: {
    subject: "math",
    topic: "addition",
    subtopic: "two_digit",
    grade: "g2",
    difficulty: "easy",
    skill_key: "math_add_two_digit",
    params: {
      kind: "add_two",
      diagnosticSkillId: "math_add_two",
      subtype: "carry",
    },
    choices: ["12", "13", "14", "15"],
    question: "7 + 6 = ?",
    correct_answer: "13",
  },

  mathWordProblem: {
    subject: "math",
    topic: "word_problems",
    params: {
      kind: "wp_single_step",
      diagnosticSkillId: "math_wp_single_step",
      cognitiveLevel: "application",
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "math_wp_single_step",
      metadataConfidence: "partial",
    },
  },

  stepByStepContext: {
    subject: "math",
    topic: "fractions",
    isDiagnosticEligible: false,
    evidenceCategory: "learning_guided",
    contextFlags: { afterStepByStep: true, stepByStepOverride: true },
    params: {
      kind: "frac_add_like",
      diagnosticSkillId: "math_frac_add_like",
    },
    questionEngine: {
      questionType: "mcq",
      skillId: "math_frac_add_like",
      answerLeakageRisk: "step_by_step_shown",
      metadataConfidence: "full",
    },
  },

  bookLearningContext: {
    subject: "hebrew",
    topic: "reading",
    evidenceCategory: "learning_book",
    isDiagnosticEligible: false,
    params: { kind: "book_context" },
  },
};

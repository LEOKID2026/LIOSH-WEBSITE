// Metadata enrichment (safe pass): difficulty, cognitiveLevel, expectedErrorTypes, skillId (when no diagnostic), subtype (pool bucket when taxonomy-valid), prerequisiteSkillIds (gated). See reports/question-metadata-qa/english-metadata-apply-report.json.
import { SENTENCE_POOLS_PHASE_B } from "./sentence-pools-phase-b.js";

export const SENTENCE_POOLS = {
  "base": [
    {
      "template": "I ___ a cat",
      "options": [
        "have",
        "has",
        "having"
      ],
      "correct": "have",
      "explanation": "I + have.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_have_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_have_g1",
      "subtype": "base"
    },
    {
      "template": "We ___ friends",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We/They → are.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_plural_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_plural_g1",
      "subtype": "base"
    },
    {
      "template": "It ___ cold today",
      "options": [
        "is",
        "are",
        "am"
      ],
      "correct": "is",
      "explanation": "It → is.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_it_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_g1",
      "subtype": "base"
    },
    {
      "template": "She ___ my sister",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_she_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_she_g1",
      "subtype": "base"
    },
    {
      "template": "They ___ a new puppy",
      "options": [
        "have",
        "has",
        "having"
      ],
      "correct": "have",
      "explanation": "They + have.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_have_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_have_g2",
      "subtype": "base"
    },
    {
      "template": "You and I ___ good friends",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "Compound subject → are.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_plural_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_plural_g2",
      "subtype": "base"
    },
    {
      "template": "The sky ___ blue now",
      "options": [
        "is",
        "are",
        "am"
      ],
      "correct": "is",
      "explanation": "The sky → is.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_it_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_g2",
      "subtype": "base"
    },
    {
      "template": "My mom ___ a doctor",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_she_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_she_g2",
      "subtype": "base"
    },
    {
      "template": "You ___ a student",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_you_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_you_g1",
      "subtype": "base"
    },
    {
      "template": "They ___ in the classroom",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_they_g1",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_they_g1",
      "subtype": "base"
    },
    {
      "template": "My toy ___ red",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "My toy (it) → is.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_toy_g1_p28",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_toy_g1_p28",
      "subtype": "base"
    },
    {
      "template": "The ducks ___ in the pond",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "Ducks (they) → are.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_ducks_g1_p28",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_ducks_g1_p28",
      "subtype": "base"
    },
    {
      "template": "Juice ___ cold in the fridge",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "Juice (it) → is.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_juice_g1_p28",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_juice_g1_p28",
      "subtype": "base"
    },
    {
      "template": "Mom and Dad ___ home now",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "Mom and Dad (they) → are.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_parents_g1_p28",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_parents_g1_p28",
      "subtype": "base"
    },
    {
      "template": "The baby ___ sleepy",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The baby (it) → is.",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "base_be_baby_g1_p28",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_baby_g1_p28",
      "subtype": "base"
    },
    {
      "template": "You ___ my partner in class",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_you_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_you_g2",
      "subtype": "base"
    },
    {
      "template": "They ___ at the playground",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "base_be_they_g2",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_they_g2",
      "subtype": "base"
    },
    {
      "template": "You ___ ready for the quiz",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_you_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_you_g3",
      "subtype": "base"
    },
    {
      "template": "They ___ on the school bus",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_they_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_they_g3",
      "subtype": "base"
    },
    {
      "template": "I ___ happy about the news",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_i_state_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_state_g3",
      "subtype": "base"
    },
    {
      "template": "The dog ___ brown",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The dog (it) → is.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_it_adj_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_adj_g3",
      "subtype": "base"
    },
    {
      "template": "My friends ___ nice to me",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "My friends (they) → are.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_they_adj_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_they_adj_g3",
      "subtype": "base"
    },
    {
      "template": "I ___ from Israel",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "base_be_i_from_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_from_g3",
      "subtype": "base"
    },
    {
      "template": "I ___ glad we won",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "base_be_i_state_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_state_g4",
      "subtype": "base"
    },
    {
      "template": "The puppy ___ soft and small",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The puppy (it) → is.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "base_be_it_adj_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_adj_g4",
      "subtype": "base"
    },
    {
      "template": "The students ___ helpful",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "The students (they) → are.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "base_be_they_adj_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_they_adj_g4",
      "subtype": "base"
    },
    {
      "template": "I ___ from Tel Aviv",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "base_be_i_from_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_from_g4",
      "subtype": "base"
    },
    {
      "template": "He ___ a science teacher",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "He → is.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "base_be_he_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_he_g5",
      "subtype": "base"
    },
    {
      "template": "We ___ in the same group",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "base_be_we_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_we_g5",
      "subtype": "base"
    },
    {
      "template": "The map ___ on the wall",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The map (it) → is.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "base_be_it_place_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_place_g5",
      "subtype": "base"
    },
    {
      "template": "I ___ eleven years old",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "base_be_i_age_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_age_g5",
      "subtype": "base"
    },
    {
      "template": "You and I ___ on the same team",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You and I = We → are.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "base_be_compound_subject_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_compound_subject_g5",
      "subtype": "base"
    },
    {
      "template": "He ___ our English teacher",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "He → is.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "base_be_he_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_he_g6",
      "subtype": "base"
    },
    {
      "template": "We ___ lab partners",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "base_be_we_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_we_g6",
      "subtype": "base"
    },
    {
      "template": "The laptop ___ on the desk",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The laptop (it) → is.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "base_be_it_place_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_it_place_g6",
      "subtype": "base"
    },
    {
      "template": "I ___ twelve years old",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "base_be_i_age_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_i_age_g6",
      "subtype": "base"
    },
    {
      "template": "You and I ___ ready to present",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You and I = We → are.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "base_be_compound_subject_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "base_be_compound_subject_g6",
      "subtype": "base"
    }
  ],
  "routine": [
    {
      "template": "She ___ her teeth every night",
      "options": [
        "brush",
        "brushes",
        "brushing"
      ],
      "correct": "brushes",
      "explanation": "She + ‎-es‎ בזמן הווה.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "routine_present_g2_brush",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g2_brush",
      "subtype": "routine"
    },
    {
      "template": "They ___ the bus to school",
      "options": [
        "take",
        "takes",
        "took"
      ],
      "correct": "take",
      "explanation": "They → take.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "routine_present_g2_bus",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g2_bus",
      "subtype": "routine"
    },
    {
      "template": "Do you ___ breakfast early?",
      "options": [
        "eat",
        "eats",
        "ate"
      ],
      "correct": "eat",
      "explanation": "Do + subject + base form.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "routine_present_g2_breakfast_q",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g2_breakfast_q",
      "subtype": "routine"
    },
    {
      "template": "I ___ up at seven every morning",
      "options": [
        "wake",
        "wakes",
        "waking"
      ],
      "correct": "wake",
      "explanation": "I → wake (base form).",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "routine_present_g2_wake",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g2_wake",
      "subtype": "routine"
    },
    {
      "template": "Tom ___ to school every day",
      "options": [
        "go",
        "goes",
        "going"
      ],
      "correct": "goes",
      "explanation": "Tom (he) → goes עם ‎-es.",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "routine_present_g2_go",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g2_go",
      "subtype": "routine"
    },
    {
      "template": "Anna ___ her hair before school",
      "options": [
        "brush",
        "brushes",
        "brushing"
      ],
      "correct": "brushes",
      "explanation": "She + ‎-es‎ בזמן הווה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_brush",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_brush",
      "subtype": "routine"
    },
    {
      "template": "We ___ the train on Tuesdays",
      "options": [
        "take",
        "takes",
        "took"
      ],
      "correct": "take",
      "explanation": "We → take.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_train",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_train",
      "subtype": "routine"
    },
    {
      "template": "Does your brother ___ lunch at noon?",
      "options": [
        "eat",
        "eats",
        "ate"
      ],
      "correct": "eat",
      "explanation": "Does + subject + base form.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_lunch_q",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_lunch_q",
      "subtype": "routine"
    },
    {
      "template": "I ___ up before school on weekdays",
      "options": [
        "wake",
        "wakes",
        "waking"
      ],
      "correct": "wake",
      "explanation": "I → wake (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_wake",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_wake",
      "subtype": "routine"
    },
    {
      "template": "My dad ___ to work by car",
      "options": [
        "go",
        "goes",
        "going"
      ],
      "correct": "goes",
      "explanation": "He → goes עם ‎-es.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_go",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_go",
      "subtype": "routine"
    },
    {
      "template": "We ___ our homework after school",
      "options": [
        "do",
        "does",
        "doing"
      ],
      "correct": "do",
      "explanation": "We → do.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_homework",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_homework",
      "subtype": "routine"
    },
    {
      "template": "She ___ lunch at one o'clock",
      "options": [
        "have",
        "has",
        "having"
      ],
      "correct": "has",
      "explanation": "She → has.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_lunch",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_lunch",
      "subtype": "routine"
    },
    {
      "template": "They ___ cartoons after dinner",
      "options": [
        "watch",
        "watches",
        "watching"
      ],
      "correct": "watch",
      "explanation": "They → watch.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_tv",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_tv",
      "subtype": "routine"
    },
    {
      "template": "I ___ math twice a week",
      "options": [
        "study",
        "studies",
        "studying"
      ],
      "correct": "study",
      "explanation": "I → study.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_study",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_study",
      "subtype": "routine"
    },
    {
      "template": "My father ___ pasta on Fridays",
      "options": [
        "cook",
        "cooks",
        "cooking"
      ],
      "correct": "cooks",
      "explanation": "My father (he) → cooks עם ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "routine_present_g3_cook",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g3_cook",
      "subtype": "routine"
    },
    {
      "template": "We ___ our projects after class",
      "options": [
        "do",
        "does",
        "doing"
      ],
      "correct": "do",
      "explanation": "We → do.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_homework",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_homework",
      "subtype": "routine"
    },
    {
      "template": "The class ___ a short break at noon",
      "options": [
        "have",
        "has",
        "having"
      ],
      "correct": "has",
      "explanation": "The class (it) → has.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_break",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_break",
      "subtype": "routine"
    },
    {
      "template": "They ___ a documentary on Fridays",
      "options": [
        "watch",
        "watches",
        "watching"
      ],
      "correct": "watch",
      "explanation": "They → watch.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_tv",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_tv",
      "subtype": "routine"
    },
    {
      "template": "I ___ science in Room 12",
      "options": [
        "study",
        "studies",
        "studying"
      ],
      "correct": "study",
      "explanation": "I → study.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_study",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_study",
      "subtype": "routine"
    },
    {
      "template": "My aunt ___ soup on Fridays",
      "options": [
        "cook",
        "cooks",
        "cooking"
      ],
      "correct": "cooks",
      "explanation": "My aunt (she) → cooks עם ‎-s.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_cook",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_cook",
      "subtype": "routine"
    },
    {
      "template": "Do you ___ to music every day?",
      "options": [
        "listen",
        "listens",
        "listening"
      ],
      "correct": "listen",
      "explanation": "Do you + base form.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_music",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_music",
      "subtype": "routine"
    },
    {
      "template": "We ___ the news after dinner",
      "options": [
        "read",
        "reads",
        "reading"
      ],
      "correct": "read",
      "explanation": "We → read.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_read",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_read",
      "subtype": "routine"
    },
    {
      "template": "He ___ his desk on Fridays",
      "options": [
        "clean",
        "cleans",
        "cleaning"
      ],
      "correct": "cleans",
      "explanation": "He → cleans עם ‎-s.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "routine_present_g4_clean",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g4_clean",
      "subtype": "routine"
    },
    {
      "template": "Do you ___ to podcasts in the car?",
      "options": [
        "listen",
        "listens",
        "listening"
      ],
      "correct": "listen",
      "explanation": "Do you + base form.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_music",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_music",
      "subtype": "routine"
    },
    {
      "template": "We ___ articles online before bed",
      "options": [
        "read",
        "reads",
        "reading"
      ],
      "correct": "read",
      "explanation": "We → read.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_read",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_read",
      "subtype": "routine"
    },
    {
      "template": "He ___ the kitchen on Sundays",
      "options": [
        "clean",
        "cleans",
        "cleaning"
      ],
      "correct": "cleans",
      "explanation": "He → cleans עם ‎-s.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_clean",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_clean",
      "subtype": "routine"
    },
    {
      "template": "They ___ basketball after school",
      "options": [
        "play",
        "plays",
        "playing"
      ],
      "correct": "play",
      "explanation": "They → play.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_sports",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_sports",
      "subtype": "routine"
    },
    {
      "template": "I ___ cereal before class",
      "question": "Choose: \"I ___ cereal before class\"",
      "options": [
        "eat",
        "eats",
        "eating"
      ],
      "correct": "eat",
      "explanation": "I → eat.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_breakfast",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_breakfast",
      "subtype": "routine"
    },
    {
      "template": "She ___ her scooter to the park",
      "options": [
        "ride",
        "rides",
        "riding"
      ],
      "correct": "rides",
      "explanation": "She → rides עם ‎-s.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "routine_present_g5_ride",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g5_ride",
      "subtype": "routine"
    },
    {
      "template": "They ___ volleyball on Tuesdays",
      "options": [
        "play",
        "plays",
        "playing"
      ],
      "correct": "play",
      "explanation": "They → play.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "routine_present_g6_sports",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g6_sports",
      "subtype": "routine"
    },
    {
      "template": "I ___ lunch at the cafeteria",
      "options": [
        "eat",
        "eats",
        "eating"
      ],
      "correct": "eat",
      "explanation": "I → eat.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "routine_present_g6_lunch",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g6_lunch",
      "subtype": "routine"
    },
    {
      "template": "She ___ to the pool by bus",
      "options": [
        "ride",
        "rides",
        "riding"
      ],
      "correct": "rides",
      "explanation": "She → rides עם ‎-s.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "routine_present_g6_ride",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "routine_present_g6_ride",
      "subtype": "routine"
    }
  ],
  "descriptive": [
    {
      "template": "The library is ___ the park",
      "options": [
        "next to",
        "under",
        "between"
      ],
      "correct": "next to",
      "explanation": "תיאור מיקום שכיח לכיתה ג'.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "descriptive_place_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g3",
      "subtype": "descriptive"
    },
    {
      "template": "This notebook is ___ than mine",
      "options": [
        "bigger",
        "biggest",
        "big"
      ],
      "correct": "bigger",
      "explanation": "השוואה → ‎-er‎.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "descriptive_compare_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g3",
      "subtype": "descriptive"
    },
    {
      "template": "The cake smells ___",
      "options": [
        "delicious",
        "deliciously",
        "delish"
      ],
      "correct": "delicious",
      "explanation": "תארים מתארים שמות עצם.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "descriptive_sense_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g3",
      "subtype": "descriptive"
    },
    {
      "template": "The school is ___ the river",
      "options": [
        "next to",
        "under",
        "between"
      ],
      "correct": "next to",
      "explanation": "תיאור מיקום.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_place_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g4",
      "subtype": "descriptive"
    },
    {
      "template": "This ruler is ___ than that one",
      "options": [
        "bigger",
        "biggest",
        "big"
      ],
      "correct": "bigger",
      "explanation": "השוואה → ‎-er‎.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_compare_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g4",
      "subtype": "descriptive"
    },
    {
      "template": "The soup smells ___",
      "options": [
        "delicious",
        "deliciously",
        "delish"
      ],
      "correct": "delicious",
      "explanation": "תארים מתארים שמות עצם.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_sense_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g4",
      "subtype": "descriptive"
    },
    {
      "template": "The cat is ___ the table",
      "options": [
        "under",
        "over",
        "next to"
      ],
      "correct": "under",
      "explanation": "תיאור מיקום → under.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_place_g4b",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g4b",
      "subtype": "descriptive"
    },
    {
      "template": "This bag is ___ than that one",
      "options": [
        "heavy",
        "heavier",
        "heaviest"
      ],
      "correct": "heavier",
      "explanation": "השוואה → heavier.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_compare_g4b",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g4b",
      "subtype": "descriptive"
    },
    {
      "template": "The flowers look ___",
      "options": [
        "beautiful",
        "beautifully",
        "beauty"
      ],
      "correct": "beautiful",
      "explanation": "תואר → beautiful.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "descriptive_sense_g4b",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g4b",
      "subtype": "descriptive"
    },
    {
      "template": "The shoes are ___ the bed",
      "options": [
        "under",
        "over",
        "next to"
      ],
      "correct": "under",
      "explanation": "תיאור מיקום → under.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_place_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g5",
      "subtype": "descriptive"
    },
    {
      "template": "This suitcase is ___ than mine",
      "options": [
        "heavy",
        "heavier",
        "heaviest"
      ],
      "correct": "heavier",
      "explanation": "השוואה → heavier.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_compare_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g5",
      "subtype": "descriptive"
    },
    {
      "template": "The paintings look ___",
      "options": [
        "beautiful",
        "beautifully",
        "beauty"
      ],
      "correct": "beautiful",
      "explanation": "תואר → beautiful.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_sense_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g5",
      "subtype": "descriptive"
    },
    {
      "template": "My room is ___ than yours",
      "options": [
        "big",
        "bigger",
        "biggest"
      ],
      "correct": "bigger",
      "explanation": "השוואה → bigger.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_compare_g5b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g5b",
      "subtype": "descriptive"
    },
    {
      "template": "The ball is ___ the box",
      "options": [
        "in",
        "on",
        "at"
      ],
      "correct": "in",
      "explanation": "תיאור מיקום → in.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_place_g5b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g5b",
      "subtype": "descriptive"
    },
    {
      "template": "This test is the ___ one",
      "options": [
        "hard",
        "harder",
        "hardest"
      ],
      "correct": "hardest",
      "explanation": "Superlative → hardest.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_superlative_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_superlative_g5",
      "subtype": "descriptive"
    },
    {
      "template": "The food tastes ___",
      "options": [
        "good",
        "well",
        "goodly"
      ],
      "correct": "good",
      "explanation": "תואר → good.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_sense_g5c",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g5c",
      "subtype": "descriptive"
    },
    {
      "template": "She is ___ than her brother",
      "options": [
        "tall",
        "taller",
        "tallest"
      ],
      "correct": "taller",
      "explanation": "השוואה → taller.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_compare_g5c",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g5c",
      "subtype": "descriptive"
    },
    {
      "template": "The book is ___ the shelf",
      "options": [
        "on",
        "in",
        "at"
      ],
      "correct": "on",
      "explanation": "תיאור מיקום → on.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_place_g5c",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g5c",
      "subtype": "descriptive"
    },
    {
      "template": "This is the ___ day",
      "options": [
        "nice",
        "nicer",
        "nicest"
      ],
      "correct": "nicest",
      "explanation": "Superlative → nicest.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_superlative_g5b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_superlative_g5b",
      "subtype": "descriptive"
    },
    {
      "template": "The music sounds ___",
      "options": [
        "loud",
        "loudly",
        "loudness"
      ],
      "correct": "loud",
      "explanation": "תואר → loud.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_sense_g5d",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g5d",
      "subtype": "descriptive"
    },
    {
      "template": "My pencil is ___ than yours",
      "options": [
        "short",
        "shorter",
        "shortest"
      ],
      "correct": "shorter",
      "explanation": "השוואה → shorter.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_compare_g5d",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g5d",
      "subtype": "descriptive"
    },
    {
      "template": "The bird is ___ the tree",
      "options": [
        "on",
        "in",
        "at"
      ],
      "correct": "in",
      "explanation": "תיאור מיקום → in.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "descriptive_place_g5d",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g5d",
      "subtype": "descriptive"
    },
    {
      "template": "Our classroom is ___ than last year",
      "options": [
        "big",
        "bigger",
        "biggest"
      ],
      "correct": "bigger",
      "explanation": "השוואה → bigger.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_compare_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g6",
      "subtype": "descriptive"
    },
    {
      "template": "The keys are ___ the bowl",
      "options": [
        "in",
        "on",
        "at"
      ],
      "correct": "in",
      "explanation": "תיאור מיקום → in.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_place_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g6",
      "subtype": "descriptive"
    },
    {
      "template": "This quiz was the ___ so far",
      "options": [
        "hard",
        "harder",
        "hardest"
      ],
      "correct": "hardest",
      "explanation": "Superlative → hardest.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_superlative_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_superlative_g6",
      "subtype": "descriptive"
    },
    {
      "template": "The soup tastes ___",
      "options": [
        "good",
        "well",
        "goodly"
      ],
      "correct": "good",
      "explanation": "תואר → good.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_sense_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g6",
      "subtype": "descriptive"
    },
    {
      "template": "He is ___ than his cousin",
      "options": [
        "tall",
        "taller",
        "tallest"
      ],
      "correct": "taller",
      "explanation": "השוואה → taller.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_compare_g6b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g6b",
      "subtype": "descriptive"
    },
    {
      "template": "The map is ___ the wall",
      "options": [
        "on",
        "in",
        "at"
      ],
      "correct": "on",
      "explanation": "תיאור מיקום → on.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_place_g6b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g6b",
      "subtype": "descriptive"
    },
    {
      "template": "This is the ___ week of camp",
      "options": [
        "nice",
        "nicer",
        "nicest"
      ],
      "correct": "nicest",
      "explanation": "Superlative → nicest.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_superlative_g6b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_superlative_g6b",
      "subtype": "descriptive"
    },
    {
      "template": "The concert sounds ___",
      "options": [
        "loud",
        "loudly",
        "loudness"
      ],
      "correct": "loud",
      "explanation": "תואר → loud.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_sense_g6b",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_sense_g6b",
      "subtype": "descriptive"
    },
    {
      "template": "My ruler is ___ than hers",
      "options": [
        "short",
        "shorter",
        "shortest"
      ],
      "correct": "shorter",
      "explanation": "השוואה → shorter.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_compare_g6c",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_compare_g6c",
      "subtype": "descriptive"
    },
    {
      "template": "The nest is ___ the branches",
      "options": [
        "on",
        "in",
        "at"
      ],
      "correct": "in",
      "explanation": "תיאור מיקום → in.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "descriptive_place_g6c",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "descriptive_place_g6c",
      "subtype": "descriptive"
    }
  ],
  "narrative": [
    {
      "template": "Yesterday we ___ to the science museum",
      "options": [
        "go",
        "went",
        "gone"
      ],
      "correct": "went",
      "explanation": "Past Simple של go.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "While I ___, my friend called",
      "options": [
        "study",
        "was studying",
        "studied"
      ],
      "correct": "was studying",
      "explanation": "פעולה נמשכת בעבר → was/were + verb-ing.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_continuous_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_continuous_g4",
      "subtype": "narrative"
    },
    {
      "template": "He ___ a robot for the fair",
      "options": [
        "built",
        "builds",
        "building"
      ],
      "correct": "built",
      "explanation": "עבר של build.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "Last week I ___ a new book",
      "options": [
        "read",
        "reads",
        "reading"
      ],
      "correct": "read",
      "explanation": "Past Simple של read.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "She ___ her homework yesterday",
      "options": [
        "finish",
        "finished",
        "finishing"
      ],
      "correct": "finished",
      "explanation": "Past Simple → finished.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "They ___ football in the park",
      "options": [
        "play",
        "played",
        "playing"
      ],
      "correct": "played",
      "explanation": "Past Simple → played.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "While she ___ dinner, the phone rang",
      "options": [
        "was cooking",
        "cooked",
        "cooks"
      ],
      "correct": "was cooking",
      "explanation": "Past Continuous → was cooking.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_continuous_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_continuous_g4",
      "subtype": "narrative"
    },
    {
      "template": "We ___ pizza for lunch",
      "options": [
        "eat",
        "ate",
        "eating"
      ],
      "correct": "ate",
      "explanation": "Past Simple של eat → ate.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "He ___ to school early this morning",
      "options": [
        "come",
        "came",
        "coming"
      ],
      "correct": "came",
      "explanation": "Past Simple של come → came.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "narrative_past_simple_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g4",
      "subtype": "narrative"
    },
    {
      "template": "I ___ my keys when I was leaving",
      "options": [
        "lost",
        "lose",
        "losing"
      ],
      "correct": "lost",
      "explanation": "Past Simple של lose → lost.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_simple_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g5",
      "subtype": "narrative"
    },
    {
      "template": "The children ___ playing when it started raining",
      "options": [
        "was",
        "were",
        "are"
      ],
      "correct": "were",
      "explanation": "Past Continuous → were playing.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_continuous_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_continuous_g5",
      "subtype": "narrative"
    },
    {
      "template": "She ___ a beautiful picture",
      "options": [
        "draw",
        "drew",
        "drawing"
      ],
      "correct": "drew",
      "explanation": "Past Simple של draw → drew.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_simple_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g5",
      "subtype": "narrative"
    },
    {
      "template": "We ___ at the library all afternoon",
      "options": [
        "study",
        "studied",
        "studying"
      ],
      "correct": "studied",
      "explanation": "Past Simple → studied.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_simple_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g5",
      "subtype": "narrative"
    },
    {
      "template": "While they ___ TV, the power went out",
      "options": [
        "watched",
        "were watching",
        "watch"
      ],
      "correct": "were watching",
      "explanation": "Past Continuous → were watching.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_continuous_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_continuous_g5",
      "subtype": "narrative"
    },
    {
      "template": "I ___ my friend at the park yesterday",
      "options": [
        "meet",
        "met",
        "meeting"
      ],
      "correct": "met",
      "explanation": "Past Simple של meet → met.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_simple_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g5",
      "subtype": "narrative"
    },
    {
      "template": "He ___ home late last night",
      "options": [
        "come",
        "came",
        "coming"
      ],
      "correct": "came",
      "explanation": "Past Simple של come → came.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "narrative_past_simple_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "narrative_past_simple_g5",
      "subtype": "narrative"
    }
  ],
  "advanced": [
    {
      "template": "If we ___ plastic, the beach stays clean",
      "options": [
        "recycle",
        "recycled",
        "are recycling"
      ],
      "correct": "recycle",
      "explanation": "Zero conditional.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_conditional_zero_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_conditional_zero_g5",
      "subtype": "advanced"
    },
    {
      "template": "She ___ a presentation by tomorrow",
      "options": [
        "will finish",
        "finished",
        "finishes"
      ],
      "correct": "will finish",
      "explanation": "פעולה תושלם בעתיד → will + base.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_future_will_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_future_will_g5",
      "subtype": "advanced"
    },
    {
      "template": "They have ___ studied renewable energy",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect עם already.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_present_perfect_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g5",
      "subtype": "advanced"
    },
    {
      "template": "If it rains, we ___ at home",
      "options": [
        "stay",
        "stayed",
        "will stay"
      ],
      "correct": "will stay",
      "explanation": "First conditional → will stay.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_first_conditional_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_g5",
      "subtype": "advanced"
    },
    {
      "template": "I have ___ finished my project",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect → already.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_present_perfect_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g5",
      "subtype": "advanced"
    },
    {
      "template": "If you study hard, you ___ the test",
      "options": [
        "pass",
        "passed",
        "will pass"
      ],
      "correct": "will pass",
      "explanation": "First conditional → will pass.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_first_conditional_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_g5",
      "subtype": "advanced"
    },
    {
      "template": "She has ___ been to London",
      "options": [
        "never",
        "ever",
        "already"
      ],
      "correct": "never",
      "explanation": "Present Perfect → never.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_present_perfect_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g5",
      "subtype": "advanced"
    },
    {
      "template": "If you heat water, it ___",
      "options": [
        "boils",
        "boiled",
        "will boil"
      ],
      "correct": "boils",
      "explanation": "Zero conditional → boils.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "advanced_conditional_zero_g5",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_conditional_zero_g5",
      "subtype": "advanced"
    },
    {
      "template": "We have ___ learned about space",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect → already.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_present_perfect_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g6",
      "subtype": "advanced"
    },
    {
      "template": "If I have time, I ___ help you",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "will help",
      "explanation": "First conditional → will help.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_first_conditional_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_g6",
      "subtype": "advanced"
    },
    {
      "template": "Have you ___ visited Paris?",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_present_perfect_q_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_q_g6",
      "subtype": "advanced"
    },
    {
      "template": "If we don't hurry, we ___ late",
      "options": [
        "are",
        "were",
        "will be"
      ],
      "correct": "will be",
      "explanation": "First conditional → will be.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_first_conditional_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_g6",
      "subtype": "advanced"
    },
    {
      "template": "I have ___ seen that movie",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect → already.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_present_perfect_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g6",
      "subtype": "advanced"
    },
    {
      "template": "If she comes early, we ___ start on time",
      "options": [
        "start",
        "started",
        "will start"
      ],
      "correct": "will start",
      "explanation": "First conditional → will start.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_first_conditional_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_g6",
      "subtype": "advanced"
    },
    {
      "template": "They have ___ finished their homework",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect → already.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_present_perfect_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_present_perfect_g6",
      "subtype": "advanced"
    },
    {
      "template": "If you don't study, you ___ pass",
      "options": [
        "don't",
        "didn't",
        "won't"
      ],
      "correct": "won't",
      "explanation": "First conditional שלילי → won't.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "advanced_first_conditional_neg_g6",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "grammar_error",
        "sentence_order_error",
        "careless_error"
      ],
      "skillId": "advanced_first_conditional_neg_g6",
      "subtype": "advanced"
    }
  ],
  "production_completion_sentence_bands": [
    {
      "template": "We ___ toast every morning",
      "options": ["eat", "eats", "eating"],
      "correct": "eat",
      "explanation": "We → eat.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_01",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "The rabbit ___ quickly across the field",
      "options": ["hop", "hops", "hopping"],
      "correct": "hops",
      "explanation": "The rabbit → hops.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_02",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ in the library after school",
      "options": ["read", "reads", "reading"],
      "correct": "read",
      "explanation": "They → read.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_03",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "It ___ freezing outside today",
      "options": ["feel", "feels", "feeling"],
      "correct": "feels",
      "explanation": "It → feels.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_04",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ her helmet before cycling",
      "options": ["wear", "wears", "wearing"],
      "correct": "wears",
      "explanation": "She → wears.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_05",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "Please ___ the plants after sunset",
      "options": ["water", "waters", "watering"],
      "correct": "water",
      "explanation": "Please + בסיס.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_06",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "My shoes ___ dirty after the hike",
      "options": ["is", "are", "am"],
      "correct": "are",
      "explanation": "My shoes → רבים → are.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_07",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ a colourful kite near the beach",
      "options": ["fly", "flies", "flying"],
      "correct": "fly",
      "explanation": "We → fly.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_08",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "The soup ___ too salty for me",
      "options": ["taste", "tastes", "tasting"],
      "correct": "tastes",
      "explanation": "The soup → tastes.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_09",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ quiet when the bell rings",
      "options": ["stay", "stays", "staying"],
      "correct": "stay",
      "explanation": "They → stay.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_10",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "He ___ his bicycle chain yesterday",
      "options": ["fix", "fixes", "fixed"],
      "correct": "fixed",
      "explanation": "Yesterday → past.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_11",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "The birds ___ north every autumn",
      "options": ["fly", "flies", "flew"],
      "correct": "fly",
      "explanation": "כללי הווה עם תדירות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_basic_12",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_basic_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ already watered the classroom plants",
      "options": ["has", "have", "had"],
      "correct": "has",
      "explanation": "Present Perfect עם already.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_01",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "If we mix blue and yellow, we ___ green",
      "options": ["get", "got", "getting"],
      "correct": "get",
      "explanation": "Zero conditional.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_02",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "Before lunch, we ___ our hands with soap",
      "options": ["wash", "washed", "washing"],
      "correct": "washed",
      "explanation": "רצף זמן בעבר.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_03",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "The seeds ___ grow faster in warm soil",
      "options": ["might", "must", "should"],
      "correct": "might",
      "explanation": "הסתברות זהירה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_04",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ building the bird feeder tomorrow",
      "options": ["finish", "will finish", "finished"],
      "correct": "will finish",
      "explanation": "Tomorrow → will.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_05",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "Because it hailed, we ___ the picnic indoors",
      "options": ["move", "moved", "moving"],
      "correct": "moved",
      "explanation": "Because + עבר.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_06",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ never tasted olives before today",
      "options": ["has", "have", "had"],
      "correct": "has",
      "explanation": "have never + participle.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_07",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ careful labels on each mineral sample",
      "options": ["write", "wrote", "written"],
      "correct": "wrote",
      "explanation": "פעולה שהסתיימה בעבר.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_08",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "While the paint dried, we ___ the brushes",
      "options": ["clean", "cleaned", "cleaning"],
      "correct": "cleaned",
      "explanation": "While + עבר מקביל.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_09",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "The storm ___ louder after midnight",
      "options": ["grow", "grew", "grown"],
      "correct": "grew",
      "explanation": "Past tense.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_10",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ record rainfall every morning this week",
      "options": ["will", "do", "did"],
      "correct": "will",
      "explanation": "תוכנית למשך השבוע.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_11",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "Our teacher ___ us plant herbs near the window",
      "options": ["help", "helps", "helped"],
      "correct": "helped",
      "explanation": "מספר סיפור בעבר.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_sent_g3_adv_12",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g3_adv_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ compost from fruit peels each Friday",
      "options": ["make", "makes", "making"],
      "correct": "make",
      "explanation": "We → make.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_01",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "The magnet ___ paper clips without glue",
      "options": ["attract", "attracts", "attracting"],
      "correct": "attracts",
      "explanation": "The magnet → attracts.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_02",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "Ice cubes ___ when we leave them in the sun",
      "options": ["melt", "melts", "melting"],
      "correct": "melt",
      "explanation": "Ice cubes רבים → melt.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_03",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "Please ___ the thermometer beside the tank",
      "options": ["place", "places", "placing"],
      "correct": "place",
      "explanation": "Please + בסיס.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_04",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ water samples from both ponds",
      "options": ["collect", "collects", "collecting"],
      "correct": "collect",
      "explanation": "They → collect.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_05",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "Bright markers ___ neat labels on our poster",
      "options": ["leave", "leaves", "leaving"],
      "correct": "leave",
      "explanation": "Bright markers → רבים → leave.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_06",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ our hypothesis before the fair",
      "options": ["test", "tests", "testing"],
      "correct": "test",
      "explanation": "We → test.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_07",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "Salt ___ differently from sugar in warm water",
      "options": ["dissolve", "dissolves", "dissolving"],
      "correct": "dissolves",
      "explanation": "Salt → יחיד דקדוקית.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_08",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "Our city ___ a new bike lane near school",
      "options": ["build", "builds", "building"],
      "correct": "builds",
      "explanation": "Our city → יחיד.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_09",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ the moon phases in her notebook",
      "options": ["draw", "draws", "drawing"],
      "correct": "draws",
      "explanation": "She → draws.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_10",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ gloves before touching dry ice",
      "options": ["wear", "wears", "wearing"],
      "correct": "wear",
      "explanation": "They → wear.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_11",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "Wind ___ the kite higher above the field",
      "options": ["push", "pushes", "pushing"],
      "correct": "pushes",
      "explanation": "Wind → pushes.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_basic_12",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_basic_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "Although the slope was steep, we ___ our sled safely",
      "options": ["guide", "guided", "guiding"],
      "correct": "guided",
      "explanation": "Although + עבר.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_01",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "Since noon, the clouds ___ darker over the bay",
      "options": ["grow", "have grown", "grew"],
      "correct": "have grown",
      "explanation": "Since + Present Perfect.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_02",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "If metal rusts, it ___ weaker over time",
      "options": ["grow", "grows", "grew"],
      "correct": "grows",
      "explanation": "Zero conditional.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_03",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ already recorded three temperature spikes",
      "options": ["have", "has", "had"],
      "correct": "have",
      "explanation": "We have recorded.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_04",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "Before the storm arrived, we ___ the windows shut",
      "options": ["bolt", "bolted", "bolting"],
      "correct": "bolted",
      "explanation": "Before + עבר.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_05",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ the microscope lens until the image sharpened",
      "options": ["adjust", "adjusted", "adjusting"],
      "correct": "adjusted",
      "explanation": "רצף פעולות בעבר.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_06",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ publish their poster next Thursday",
      "options": ["will", "do", "did"],
      "correct": "will",
      "explanation": "תוכנית עתידית.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_07",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "No one ___ the cracked mirror during the demo",
      "options": ["touch", "touched", "touches"],
      "correct": "touched",
      "explanation": "מאורע בעבר.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_08",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "Because fuel burned cleanly, the air ___ fresher",
      "options": ["feel", "felt", "feels"],
      "correct": "felt",
      "explanation": "Because + עבר.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_09",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ rather sketch birds than chase them",
      "options": ["would", "will", "can"],
      "correct": "would",
      "explanation": "would rather.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_10",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "The river ___ higher after three rainy days",
      "options": ["rose", "raises", "raised"],
      "correct": "rose",
      "explanation": "Past tense של rise.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_11",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "Our teacher ___ us revise the safety checklist twice",
      "options": ["ask", "asked", "asking"],
      "correct": "asked",
      "explanation": "פעולה שהסתיימה.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_sent_g4_adv_12",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g4_adv_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ our posters before the science fair opens",
      "options": ["tape", "taped", "taping"],
      "correct": "tape",
      "explanation": "תוכנית לפני אירוע.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_01",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "Please ___ the lab goggles over your glasses",
      "options": ["fit", "fits", "fitting"],
      "correct": "fit",
      "explanation": "Please + בסיס.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_02",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "The turbine ___ slowly when the breeze is weak",
      "options": ["turn", "turns", "turning"],
      "correct": "turns",
      "explanation": "The turbine → turns.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_03",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "Students ___ charts instead of guessing numbers",
      "options": ["plot", "plots", "plotting"],
      "correct": "plot",
      "explanation": "Students → plot.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_04",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "Humidity ___ the paper feel softer today",
      "options": ["make", "makes", "making"],
      "correct": "makes",
      "explanation": "Humidity → יחיד.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_05",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ reusable cups during the hike",
      "options": ["pack", "packs", "packing"],
      "correct": "pack",
      "explanation": "They → pack.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_06",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ local apples from the morning market",
      "options": ["buy", "buys", "buying"],
      "correct": "buy",
      "explanation": "We → buy.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_07",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "The coach ___ us stretch before we lift weights",
      "options": ["remind", "reminds", "reminded"],
      "correct": "reminded",
      "explanation": "מספר עבר.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_08",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "Rain ___ noise on the classroom roof",
      "options": ["make", "makes", "making"],
      "correct": "makes",
      "explanation": "Rain → makes.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_09",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ her bicycle chain after the muddy ride",
      "options": ["clean", "cleans", "cleaned"],
      "correct": "cleaned",
      "explanation": "אירוע שהסתיים.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_10",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ seeds that sprouted overnight",
      "options": ["notice", "notices", "noticed"],
      "correct": "noticed",
      "explanation": "ממצא בעבר.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_11",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "The tide ___ shells closer to our sampling line",
      "options": ["pull", "pulls", "pulled"],
      "correct": "pulls",
      "explanation": "The tide → pulls.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_basic_12",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_basic_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ debate battery brands using fresh data",
      "options": ["might", "must", "should"],
      "correct": "might",
      "explanation": "הסתברות זהירה.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_01",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "Although budgets shrank, the club ___ new sensors",
      "options": ["buy", "buys", "bought"],
      "correct": "bought",
      "explanation": "Although + עבר.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_02",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "Since winter began, volunteers ___ weekly trash surveys",
      "options": ["run", "ran", "have run"],
      "correct": "have run",
      "explanation": "Since + Present Perfect.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_03",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "If rainfall doubles, the creek ___ faster",
      "options": ["rise", "rises", "rose"],
      "correct": "rises",
      "explanation": "Zero conditional תוצאה בהווה.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_04",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ rather cycle than idle near idling buses",
      "options": ["would", "will", "could"],
      "correct": "would",
      "explanation": "would rather.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_05",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "Before sunrise, the crew ___ the balloon nets",
      "options": ["check", "checks", "checked"],
      "correct": "checked",
      "explanation": "Before sunrise → עבר.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_06",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ already exported the humidity graph",
      "options": ["has", "have", "had"],
      "correct": "has",
      "explanation": "has already exported.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_07",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ publish bilingual warnings before Friday",
      "options": ["will", "do", "did"],
      "correct": "will",
      "explanation": "תוכנית עתידית.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_08",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "Because algae bloomed, we ___ extra oxygen tests",
      "options": ["order", "ordered", "ordering"],
      "correct": "ordered",
      "explanation": "Because + עבר.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_09",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "No one ___ the cracked humidity sensor yesterday",
      "options": ["replace", "replaced", "replaces"],
      "correct": "replaced",
      "explanation": "מאורע אתמול.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_10",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ to interview the park ranger next Tuesday",
      "options": ["hope", "hopes", "hoped"],
      "correct": "hope",
      "explanation": "We hope to.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_11",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "The mayor ___ funding after seeing our flood maps",
      "options": ["pledge", "pledges", "pledged"],
      "correct": "pledged",
      "explanation": "מעשה שהושלם.",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_sent_g5_std_12",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g5_std_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ probe readings before posting results online",
      "options": ["double-check", "double-checks", "double-checked"],
      "correct": "double-check",
      "explanation": "We + בסיס.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_01",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "The drone ___ slowly above the coral transect",
      "options": ["hover", "hovers", "hovering"],
      "correct": "hovers",
      "explanation": "The drone → hovers.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_02",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "Field notes ___ easier to read with tidy headings",
      "options": ["become", "becomes", "became"],
      "correct": "become",
      "explanation": "Field notes רבים → become.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_03",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ satellite photos before hiking the ridge",
      "options": ["study", "studies", "studied"],
      "correct": "study",
      "explanation": "They → study.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_04",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "Please ___ the calibration sticker after each flight",
      "options": ["replace", "replaces", "replacing"],
      "correct": "replace",
      "explanation": "Please + בסיס.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_05",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "Night dew ___ the tent fabric feel damp",
      "options": ["make", "makes", "making"],
      "correct": "makes",
      "explanation": "Night dew → יחיד.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_06",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "Volunteers ___ litter along the boardwalk every month",
      "options": ["count", "counts", "counting"],
      "correct": "count",
      "explanation": "Volunteers → count.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_07",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ public transit data from three agencies",
      "options": ["merge", "merges", "merging"],
      "correct": "merge",
      "explanation": "We → merge.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_08",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "The tide gauge ___ every minute during the surge",
      "options": ["tick", "ticks", "ticking"],
      "correct": "ticks",
      "explanation": "The tide gauge → ticks.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_09",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ stray voltage near the fountain pump",
      "options": ["measure", "measures", "measured"],
      "correct": "measured",
      "explanation": "דיווח בעבר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_10",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ algae samples before filtering the water",
      "options": ["label", "labels", "labeled"],
      "correct": "label",
      "explanation": "They → label.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_11",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "Morning fog ___ visibility near the runway model",
      "options": ["reduce", "reduces", "reducing"],
      "correct": "reduces",
      "explanation": "Morning fog → reduces.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_basic_12",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_basic_12",
      "subtype": "production_band_fill"
    },
    {
      "template": "Although permits lagged, the crew ___ new barrier nets",
      "options": ["install", "installed", "installing"],
      "correct": "installed",
      "explanation": "Although + עבר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_01",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_01",
      "subtype": "production_band_fill"
    },
    {
      "template": "Since noon, humidity ___ above sixty percent downtown",
      "options": ["stay", "stayed", "has stayed"],
      "correct": "has stayed",
      "explanation": "Since + Present Perfect.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_02",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_02",
      "subtype": "production_band_fill"
    },
    {
      "template": "If tariffs rise, volunteers ___ tighten repair budgets",
      "options": ["must", "might", "could"],
      "correct": "might",
      "explanation": "תרחיש עתידי זהיר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_03",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_03",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ rather publish raw charts than hide outliers",
      "options": ["would", "will", "should"],
      "correct": "would",
      "explanation": "would rather.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_04",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_04",
      "subtype": "production_band_fill"
    },
    {
      "template": "Before the storm surge, sensors ___ steady salinity",
      "options": ["log", "logged", "logging"],
      "correct": "logged",
      "explanation": "Before + עבר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_05",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_05",
      "subtype": "production_band_fill"
    },
    {
      "template": "They ___ already simulated flood depths twice",
      "options": ["have", "has", "had"],
      "correct": "have",
      "explanation": "have already simulated.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_06",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_06",
      "subtype": "production_band_fill"
    },
    {
      "template": "She ___ defend peer-reviewed sources in tomorrow's panel",
      "options": ["will", "do", "did"],
      "correct": "will",
      "explanation": "תוכנית מחר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_07",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_07",
      "subtype": "production_band_fill"
    },
    {
      "template": "Because runoff spiked, ecologists ___ extra soil probes",
      "options": ["deploy", "deployed", "deploying"],
      "correct": "deployed",
      "explanation": "Because + עבר.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_08",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_08",
      "subtype": "production_band_fill"
    },
    {
      "template": "No interns ___ the faulty buoy cable yesterday",
      "options": ["replace", "replaced", "replaces"],
      "correct": "replaced",
      "explanation": "מאורע אתמול.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_09",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_09",
      "subtype": "production_band_fill"
    },
    {
      "template": "We ___ to stream reef footage live next Friday",
      "options": ["plan", "plans", "planned"],
      "correct": "plan",
      "explanation": "We plan to.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_10",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_10",
      "subtype": "production_band_fill"
    },
    {
      "template": "The harbour office ___ overtime pay after the drill",
      "options": ["approve", "approves", "approved"],
      "correct": "approved",
      "explanation": "מעשה שהושלם.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_11",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_11",
      "subtype": "production_band_fill"
    },
    {
      "template": "Citizens ___ bilingual alerts before the festival crowds arrive",
      "options": ["preview", "previews", "previewed"],
      "correct": "preview",
      "explanation": "Citizens → preview.",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_sent_g6_std_12",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "sentence_order_error", "careless_error"],
      "skillId": "pcb_sent_g6_std_12",
      "subtype": "production_band_fill"
    }
  ]
};

for (const [poolKey, rows] of Object.entries(SENTENCE_POOLS_PHASE_B)) {
  if (!SENTENCE_POOLS[poolKey]) SENTENCE_POOLS[poolKey] = [];
  SENTENCE_POOLS[poolKey].push(...rows);
}

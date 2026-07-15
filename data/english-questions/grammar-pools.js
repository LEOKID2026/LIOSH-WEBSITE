// Metadata enrichment (safe pass): difficulty, cognitiveLevel, expectedErrorTypes, skillId (when no diagnostic), subtype (pool bucket when taxonomy-valid), prerequisiteSkillIds (gated). See reports/question-metadata-qa/english-metadata-apply-report.json.
import { enrichEnglishGrammarPools } from "../../utils/english-grammar-diagnostic-metadata-enrich.js";
import { GRAMMAR_POOLS_PHASE_B } from "./grammar-pools-phase-b.js";

export const GRAMMAR_POOLS = {
  "be_basic": [
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_1",
      "conceptTag": "english_be_agreement",
      "diagnosticSkillId": "en_grammar_be_present",
      "probePower": "medium",
      "expectedErrorTags": [
        "grammar_pattern_error"
      ],
      "question": "Choose the correct word: \"I ___ ten years old\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "עם I משתמשים ב-am.",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_pattern_error",
        "grammar_error",
        "careless_error"
      ],
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_2",
      "conceptTag": "english_be_agreement",
      "diagnosticSkillId": "en_grammar_be_present",
      "probePower": "medium",
      "expectedErrorTags": [
        "grammar_pattern_error"
      ],
      "question": "Choose the correct word: \"He ___ my teacher\"",
      "options": [
        "are",
        "is",
        "am"
      ],
      "correct": "is",
      "explanation": "He/She/It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_pattern_error",
        "grammar_error",
        "careless_error"
      ],
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_3",
      "conceptTag": "english_be_agreement",
      "diagnosticSkillId": "en_grammar_be_present",
      "probePower": "medium",
      "expectedErrorTags": [
        "grammar_pattern_error"
      ],
      "question": "Complete the sentence: \"We ___ in class\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We/They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_pattern_error",
        "grammar_error",
        "careless_error"
      ],
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_4",
      "conceptTag": "english_be_agreement",
      "diagnosticSkillId": "en_grammar_be_present",
      "probePower": "medium",
      "expectedErrorTags": [
        "grammar_pattern_error"
      ],
      "question": "Choose the correct word: \"They ___ happy\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_pattern_error",
        "grammar_error",
        "careless_error"
      ],
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_5",
      "question": "Choose the correct word: \"She ___ a student\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_5",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_6",
      "question": "Complete: \"You ___ my friend\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_6",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_7",
      "question": "Choose: \"It ___ a book\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_7",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_8",
      "question": "Complete: \"Tom and I ___ friends\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "Tom and I = We → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_8",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_9",
      "question": "Choose: \"The cat ___ sleeping\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The cat = It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_9",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_10",
      "question": "Complete: \"My friends ___ nice\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "My friends = They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_10",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_11",
      "question": "Choose: \"I ___ from Israel\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_11",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_12",
      "question": "Complete: \"You and Sarah ___ in class\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You and Sarah = plural → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_12",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_13",
      "question": "Choose: \"The pencil ___ blue\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The pencil = It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_13",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_14",
      "question": "Complete: \"These books ___ new\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "These books = plural → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_14",
      "subtype": "be_basic"
    },
    {
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "be_basic_g1_15",
      "question": "Choose: \"My mother ___ a teacher\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "My mother = She → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g1_15",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_1",
      "question": "Complete: \"The children ___ playing\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "The children = They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_1",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_2",
      "question": "Choose: \"I ___ six years old\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_2",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_3",
      "question": "Complete: \"Sara and I ___ classmates\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "Sara and I = We → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_3",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_4",
      "question": "Choose: \"The dog ___ brown\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The dog = It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_4",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_5",
      "question": "Complete: \"My sister and brother ___ at home\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "My sister and brother = They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_5",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_6",
      "question": "Choose: \"I ___ a student\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_6",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_7",
      "question": "Choose: \"You ___ my best friend\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_7",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_8",
      "question": "Choose: \"He ___ very tall\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "He → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_8",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_9",
      "question": "Choose: \"She ___ a doctor\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_9",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_10",
      "question": "Choose: \"It ___ a beautiful day\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_10",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_11",
      "question": "Choose: \"We ___ classmates\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_11",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_12",
      "question": "Choose: \"They ___ good friends\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_12",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_13",
      "question": "Choose: \"My name ___ Tom\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "My name (it) → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_13",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_14",
      "question": "Choose: \"The books ___ on the table\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "The books (plural) → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_14",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_15",
      "question": "Choose: \"I ___ not tired\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am (also in negative).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_15",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_16",
      "question": "Choose: \"She ___ not here\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is (also in negative).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_16",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_17",
      "question": "Choose: \"We ___ not ready\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are (also in negative).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_17",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_18",
      "question": "Choose: \"The cat ___ sleeping\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The cat (it) → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_18",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_19",
      "question": "Choose: \"My parents ___ at work\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "My parents (they) → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_19",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_20",
      "question": "Choose: \"I ___ happy today\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_20",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_21",
      "question": "Choose: \"You ___ very kind\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_21",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_22",
      "question": "Choose: \"He ___ my brother\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "He → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_22",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_23",
      "question": "Choose: \"She ___ a teacher\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_23",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_24",
      "question": "Choose: \"It ___ cold outside\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_24",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_25",
      "question": "Choose: \"We ___ students\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_25",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_26",
      "question": "Choose: \"They ___ playing\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_26",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_27",
      "question": "Choose: \"The dog ___ brown\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "The dog (it) → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_27",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_28",
      "question": "Choose: \"My friends ___ nice\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "My friends (they) → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_28",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_29",
      "question": "Choose: \"I ___ from Tel Aviv\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "am",
      "explanation": "I → am.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_29",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_30",
      "question": "Choose: \"You ___ right\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "You → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_30",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_31",
      "question": "Choose: \"He ___ wrong\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "He → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_31",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_32",
      "question": "Choose: \"She ___ correct\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "She → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_32",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_33",
      "question": "Choose: \"It ___ important\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "is",
      "explanation": "It → is.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_33",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_34",
      "question": "Choose: \"We ___ here\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "We → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_34",
      "subtype": "be_basic"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "be_basic_g2_35",
      "question": "Choose: \"They ___ there\"",
      "options": [
        "am",
        "is",
        "are"
      ],
      "correct": "are",
      "explanation": "They → are.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "be_basic_g2_35",
      "subtype": "be_basic"
    }
  ],
  "question_frames": [
    {
      "question": "Choose the correct question word: \"___ is your name?\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על שם בעזרת What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct question word: \"___ do you live?\"",
      "options": [
        "Where",
        "Why",
        "Who"
      ],
      "correct": "Where",
      "explanation": "שאלה על מקום → Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct helper: \"___ you like pizza?\"",
      "options": [
        "Do",
        "Does",
        "Is"
      ],
      "correct": "Do",
      "explanation": "You → Do בשאלות.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct order: \"___ is this?\" (pointing at an object)",
      "options": [
        "Who",
        "What",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על חפץ עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ are you?\" - \"I'm fine\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על מצב/בריאות עם How.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your birthday?\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על זמן עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your favorite color?\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על בחירה/דעה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you go to school?\" - \"At eight o'clock\"",
      "options": [
        "When",
        "Where",
        "Why"
      ],
      "correct": "When",
      "explanation": "שואלים על שעה/זמן עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your teacher?\"",
      "options": [
        "Who",
        "What",
        "Where"
      ],
      "correct": "Who",
      "explanation": "שואלים על אדם עם Who.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you go to school?\" - \"By bus\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על דרך/אמצעי עם How.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ color is your bag?\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על תכונה עם What + noun.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ does she like ice cream?\" - \"Because it's sweet\"",
      "options": [
        "Why",
        "What",
        "Where"
      ],
      "correct": "Why",
      "explanation": "שואלים על סיבה עם Why.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ old are you?\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על גיל עם How old.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your best friend?\"",
      "options": [
        "Who",
        "What",
        "Where"
      ],
      "correct": "Who",
      "explanation": "שואלים על אדם עם Who.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ does the lesson start?\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על זמן התחלה עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your pencil?\" - \"In my bag\"",
      "options": [
        "Where",
        "What",
        "Who"
      ],
      "correct": "Where",
      "explanation": "שואלים על מיקום עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ does Tom play?\" - \"Football\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על פעילות עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ many books do you have?\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על כמות עם How many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is the library?\" - \"Next to the school\"",
      "options": [
        "Where",
        "What",
        "Who"
      ],
      "correct": "Where",
      "explanation": "שואלים על מיקום עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ does she study?\" - \"English and Math\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על נושא לימוד עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your favorite subject?\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על בחירה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you live?\" - \"In Jerusalem\"",
      "options": [
        "Where",
        "What",
        "When"
      ],
      "correct": "Where",
      "explanation": "שואלים על מקום עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your birthday?\" - \"In May\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על זמן עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your teacher?\" - \"Mrs. Cohen\"",
      "options": [
        "Who",
        "What",
        "Where"
      ],
      "correct": "Who",
      "explanation": "שואלים על אדם עם Who.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you go to school?\" - \"By bus\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על דרך עם How.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you like pizza?\" - \"Because it's delicious\"",
      "options": [
        "Why",
        "What",
        "Where"
      ],
      "correct": "Why",
      "explanation": "שואלים על סיבה עם Why.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ many books do you have?\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על כמות עם How many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ much water do you drink?\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על כמות עם How much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ old are you?\" - \"I'm ten\"",
      "options": [
        "How",
        "What",
        "Where"
      ],
      "correct": "How",
      "explanation": "שואלים על גיל עם How old.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your name?\" - \"My name is Tom\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על שם עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ are you from?\" - \"I'm from Israel\"",
      "options": [
        "Where",
        "What",
        "When"
      ],
      "correct": "Where",
      "explanation": "שואלים על מקום מוצא עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you wake up?\" - \"At 7 o'clock\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על שעה עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your best friend?\" - \"Sarah\"",
      "options": [
        "Who",
        "What",
        "Where"
      ],
      "correct": "Who",
      "explanation": "שואלים על אדם עם Who.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you like to do?\" - \"I like to read\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על פעילות עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is the library?\" - \"Next to the school\"",
      "options": [
        "Where",
        "What",
        "Who"
      ],
      "correct": "Where",
      "explanation": "שואלים על מיקום עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you study?\" - \"Every day\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על תדירות עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your favorite color?\" - \"Blue\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על בחירה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you play?\" - \"Football\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על ספורט עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ are you going?\" - \"To the park\"",
      "options": [
        "Where",
        "What",
        "When"
      ],
      "correct": "Where",
      "explanation": "שואלים על יעד עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is the test?\" - \"Next week\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על זמן עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you eat breakfast?\" - \"In the morning\"",
      "options": [
        "When",
        "Where",
        "Who"
      ],
      "correct": "When",
      "explanation": "שואלים על זמן עם When.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your phone?\" - \"In my bag\"",
      "options": [
        "Where",
        "What",
        "When"
      ],
      "correct": "Where",
      "explanation": "שואלים על מיקום עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you want?\" - \"A sandwich\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על דבר עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ can help me?\" - \"I can\"",
      "options": [
        "Who",
        "What",
        "Where"
      ],
      "correct": "Who",
      "explanation": "שואלים על אדם עם Who.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your favorite animal?\" - \"A dog\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על בחירה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you speak?\" - \"Hebrew and English\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על שפה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your address?\" - \"123 Main Street\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על כתובת עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ do you come from?\" - \"Israel\"",
      "options": [
        "Where",
        "What",
        "When"
      ],
      "correct": "Where",
      "explanation": "שואלים על מקום מוצא עם Where.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ is your favorite food?\" - \"Pizza\"",
      "options": [
        "What",
        "Where",
        "When"
      ],
      "correct": "What",
      "explanation": "שואלים על בחירה עם What.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "present_simple": [
    {
      "question": "Choose the correct form: \"She ___ basketball on Fridays\"",
      "options": [
        "play",
        "plays",
        "playing"
      ],
      "correct": "plays",
      "explanation": "He/She/It מקבלים ‎-s‎ בזמן הווה פשוט.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_third_s_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_third_s_g3",
      "subtype": "present_simple"
    },
    {
      "question": "Choose the correct form: \"We ___ breakfast at seven\"",
      "options": [
        "eat",
        "eats",
        "eating"
      ],
      "correct": "eat",
      "explanation": "We → צורת הבסיס ללא ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_plural_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_plural_g3",
      "subtype": "present_simple"
    },
    {
      "question": "Choose the correct negative: \"He ___ like carrots\"",
      "options": [
        "don't",
        "doesn't",
        "isn't"
      ],
      "correct": "doesn't",
      "explanation": "He/she/it → doesn't + verb base.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_neg_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_neg_g3",
      "subtype": "present_simple"
    },
    {
      "question": "Choose the question: \"___ they play music?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Do",
      "explanation": "They → Do בשאלות בהווה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_question_g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_question_g3",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"Tom ___ to school every day\"",
      "options": [
        "go",
        "goes",
        "going"
      ],
      "correct": "goes",
      "explanation": "Tom (he) → goes עם ‎-es‎.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_third_s_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_third_s_g4",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ my homework after school\"",
      "options": [
        "do",
        "does",
        "doing"
      ],
      "correct": "do",
      "explanation": "I → do (base form).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_first_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_first_g4",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"They ___ TV in the evening\"",
      "options": [
        "watch",
        "watches",
        "watching"
      ],
      "correct": "watch",
      "explanation": "They → watch (base form).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_plural_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_plural_g4",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"My sister ___ English well\"",
      "options": [
        "speak",
        "speaks",
        "speaking"
      ],
      "correct": "speaks",
      "explanation": "My sister (she) → speaks עם ‎-s.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_third_s_g4",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_third_s_g4",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"We ___ books from the library\"",
      "options": [
        "borrow",
        "borrows",
        "borrowing"
      ],
      "correct": "borrow",
      "explanation": "We → borrow (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_borrow",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_borrow",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"The cat ___ milk\"",
      "options": [
        "like",
        "likes",
        "liking"
      ],
      "correct": "likes",
      "explanation": "The cat (it) → likes עם ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_cat",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_cat",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ like broccoli\"",
      "options": [
        "don't",
        "doesn't",
        "isn't"
      ],
      "correct": "don't",
      "explanation": "I → don't בשלילה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_neg_i",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_neg_i",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"She ___ watch cartoons\"",
      "options": [
        "don't",
        "doesn't",
        "isn't"
      ],
      "correct": "doesn't",
      "explanation": "She → doesn't בשלילה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_neg_she",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_neg_she",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ you like apples?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "You → Do בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_you",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_you",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ he play football?\"",
      "options": [
        "Do",
        "Does",
        "Is"
      ],
      "correct": "Does",
      "explanation": "He → Does בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_he",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_he",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"My friends ___ study together\"",
      "options": [
        "don't",
        "doesn't",
        "isn't"
      ],
      "correct": "don't",
      "explanation": "My friends (they) → don't בשלילה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_neg_friends",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_neg_friends",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"The teacher ___ us new words\"",
      "options": [
        "teach",
        "teaches",
        "teaching"
      ],
      "correct": "teaches",
      "explanation": "The teacher (he/she) → teaches עם ‎-es‎.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_teach",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_teach",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"Children ___ to play games\"",
      "options": [
        "love",
        "loves",
        "loving"
      ],
      "correct": "love",
      "explanation": "Children (they) → love (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_love_games",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_love_games",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ they eat lunch at school?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "They → Do בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_they_lunch",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_they_lunch",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"The sun ___ in the east\"",
      "options": [
        "rise",
        "rises",
        "rising"
      ],
      "correct": "rises",
      "explanation": "The sun (it) → rises עם ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_sun",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_sun",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ understand this exercise\"",
      "options": [
        "don't",
        "doesn't",
        "am not"
      ],
      "correct": "don't",
      "explanation": "I → don't בשלילה.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_understand",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_understand",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ she help you with homework?\"",
      "options": [
        "Do",
        "Does",
        "Is"
      ],
      "correct": "Does",
      "explanation": "She → Does בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_she_help",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_she_help",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ English every day\"",
      "options": [
        "study",
        "studies",
        "studying"
      ],
      "correct": "study",
      "explanation": "I → study (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_study",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_study",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"She ___ to school by bus\"",
      "options": [
        "go",
        "goes",
        "going"
      ],
      "correct": "goes",
      "explanation": "She → goes עם ‎-es.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_bus",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_bus",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"We ___ lunch at 12 o'clock\"",
      "options": [
        "eat",
        "eats",
        "eating"
      ],
      "correct": "eat",
      "explanation": "We → eat (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_lunch",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_lunch",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"He ___ his room every Saturday\"",
      "options": [
        "clean",
        "cleans",
        "cleaning"
      ],
      "correct": "cleans",
      "explanation": "He → cleans עם ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_clean",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_clean",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"They ___ football on Sundays\"",
      "options": [
        "play",
        "plays",
        "playing"
      ],
      "correct": "play",
      "explanation": "They → play (base form).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_football",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_football",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ not like vegetables\"",
      "options": [
        "do",
        "does",
        "am"
      ],
      "correct": "do",
      "explanation": "I → do not (don't).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_do_not_i",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_do_not_i",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"She ___ not watch TV\"",
      "options": [
        "do",
        "does",
        "is"
      ],
      "correct": "does",
      "explanation": "She → does not (doesn't).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_do_not_she",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_do_not_she",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"We ___ not eat meat\"",
      "options": [
        "do",
        "does",
        "are"
      ],
      "correct": "do",
      "explanation": "We → do not (don't).",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_do_not_we",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_do_not_we",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ you like ice cream?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "You → Do בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_icecream",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_icecream",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ he play piano?\"",
      "options": [
        "Do",
        "Does",
        "Is"
      ],
      "correct": "Does",
      "explanation": "He → Does בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_piano",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_piano",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ they speak English?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "They → Do בשאלות.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_q_speak_en",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_q_speak_en",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"My father ___ work in a hospital\"",
      "options": [
        "work",
        "works",
        "working"
      ],
      "correct": "works",
      "explanation": "My father (he) → works עם ‎-s.",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "grammar_present_ps_g3_father_work",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g3_father_work",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"Birds ___ in the sky\"",
      "options": [
        "fly",
        "flies",
        "flying"
      ],
      "correct": "fly",
      "explanation": "Birds (they) → fly (base form).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_birds",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_birds",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ breakfast at 8 o'clock\"",
      "options": [
        "have",
        "has",
        "having"
      ],
      "correct": "have",
      "explanation": "I → have (base form).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_breakfast",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_breakfast",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"She ___ her homework after school\"",
      "options": [
        "do",
        "does",
        "doing"
      ],
      "correct": "does",
      "explanation": "She → does (base form of do).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_homework",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_homework",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"The teacher ___ us English\"",
      "options": [
        "teach",
        "teaches",
        "teaching"
      ],
      "correct": "teaches",
      "explanation": "The teacher (he/she) → teaches עם ‎-es.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_teacher_en",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_teacher_en",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"Children ___ to play\"",
      "options": [
        "love",
        "loves",
        "loving"
      ],
      "correct": "love",
      "explanation": "Children (they) → love (base form).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_children_love",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_children_love",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ understand this\"",
      "options": [
        "do",
        "does",
        "am"
      ],
      "correct": "do",
      "explanation": "I → do (auxiliary verb).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_aux_i",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_aux_i",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"She ___ not know the answer\"",
      "options": [
        "do",
        "does",
        "is"
      ],
      "correct": "does",
      "explanation": "She → does not (doesn't).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_not_know",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_not_know",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"We ___ not want to go\"",
      "options": [
        "do",
        "does",
        "are"
      ],
      "correct": "do",
      "explanation": "We → do not (don't).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_not_want",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_not_want",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ you have a pet?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "You → Do בשאלות.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_q_pet",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_q_pet",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ she live here?\"",
      "options": [
        "Do",
        "Does",
        "Is"
      ],
      "correct": "Does",
      "explanation": "She → Does בשאלות.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_q_live",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_q_live",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"___ they like music?\"",
      "options": [
        "Do",
        "Does",
        "Are"
      ],
      "correct": "Do",
      "explanation": "They → Do בשאלות.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_q_music",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_q_music",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"My cousin ___ French in class\"",
      "options": [
        "speak",
        "speaks",
        "speaking"
      ],
      "correct": "speaks",
      "explanation": "My cousin (she) → speaks עם ‎-s.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_third_s_g4_cousin",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_third_s_g4_cousin",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"The rabbit ___ carrots\"",
      "options": [
        "like",
        "likes",
        "liking"
      ],
      "correct": "likes",
      "explanation": "The rabbit (it) → likes עם ‎-s.",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_third_s_g4_rabbit",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_third_s_g4_rabbit",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"I ___ not want that\"",
      "options": [
        "do",
        "does",
        "am"
      ],
      "correct": "do",
      "explanation": "I → do not (don't).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_not_want_that",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_not_want_that",
      "subtype": "present_simple"
    },
    {
      "question": "Choose: \"He ___ not like coffee\"",
      "options": [
        "do",
        "does",
        "is"
      ],
      "correct": "does",
      "explanation": "He → does not (doesn't).",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "grammar_present_ps_g4_not_coffee",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ],
      "skillId": "grammar_present_ps_g4_not_coffee",
      "subtype": "present_simple"
    }
  ],
  "progressive": [
    {
      "question": "Choose the correct tense: \"Right now, they ___ English\"",
      "options": [
        "study",
        "studies",
        "are studying"
      ],
      "correct": "are studying",
      "explanation": "Right now → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct form: \"I ___ a movie\"",
      "options": [
        "watch",
        "am watching",
        "watched"
      ],
      "correct": "am watching",
      "explanation": "I + am + verb-ing בזמן הווה ממושך.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct sentence: \"She ___ dinner at the moment\"",
      "options": [
        "is cook",
        "is cooking",
        "cook"
      ],
      "correct": "is cooking",
      "explanation": "She + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Look! It ___ outside\"",
      "options": [
        "rain",
        "rains",
        "is raining"
      ],
      "correct": "is raining",
      "explanation": "Look! = עכשיו → is raining.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ for the bus now\"",
      "options": [
        "wait",
        "waits",
        "are waiting"
      ],
      "correct": "are waiting",
      "explanation": "We + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ his homework right now\"",
      "options": [
        "do",
        "does",
        "is doing"
      ],
      "correct": "is doing",
      "explanation": "He + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ a letter to my friend\"",
      "options": [
        "write",
        "am writing",
        "writes"
      ],
      "correct": "am writing",
      "explanation": "I + am + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The children ___ in the park\"",
      "options": [
        "play",
        "plays",
        "are playing"
      ],
      "correct": "are playing",
      "explanation": "The children (they) + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ to music now\"",
      "options": [
        "listen",
        "listens",
        "is listening"
      ],
      "correct": "is listening",
      "explanation": "She + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ a new game\"",
      "options": [
        "learn",
        "learns",
        "are learning"
      ],
      "correct": "are learning",
      "explanation": "They + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my room this morning\"",
      "options": [
        "clean",
        "am cleaning",
        "cleans"
      ],
      "correct": "am cleaning",
      "explanation": "I + am + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you ___?\" - \"I'm reading\"",
      "options": [
        "are / doing",
        "do / do",
        "is / doing"
      ],
      "correct": "are / doing",
      "explanation": "What are you doing? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Why ___ she ___?\" - \"Because she's tired\"",
      "options": [
        "does / cry",
        "is / crying",
        "do / cry"
      ],
      "correct": "is / crying",
      "explanation": "Why is she crying? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ not ___ TV right now\"",
      "options": [
        "are / watching",
        "do / watch",
        "is / watching"
      ],
      "correct": "are / watching",
      "explanation": "We are not watching = שלילה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The dog ___ in the garden\"",
      "options": [
        "run",
        "runs",
        "is running"
      ],
      "correct": "is running",
      "explanation": "The dog (it) + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ for my test tomorrow\"",
      "options": [
        "study",
        "am studying",
        "studies"
      ],
      "correct": "am studying",
      "explanation": "תכנית קרובה → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ her grandmother this weekend\"",
      "options": [
        "visits",
        "is visiting",
        "visit"
      ],
      "correct": "is visiting",
      "explanation": "תכנית עתידית → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ to the beach next week\"",
      "options": [
        "go",
        "are going",
        "goes"
      ],
      "correct": "are going",
      "explanation": "תכנית → are going.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ he ___ for lunch?\"",
      "options": [
        "does / eat",
        "is / eating",
        "do / eat"
      ],
      "correct": "is / eating",
      "explanation": "What is he eating? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The students ___ in class now\"",
      "options": [
        "sit",
        "sits",
        "are sitting"
      ],
      "correct": "are sitting",
      "explanation": "The students (they) + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my homework right now\"",
      "options": [
        "do",
        "am doing",
        "does"
      ],
      "correct": "am doing",
      "explanation": "I + am + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a book now\"",
      "options": [
        "read",
        "is reading",
        "reads"
      ],
      "correct": "is reading",
      "explanation": "She + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ TV at the moment\"",
      "options": [
        "watch",
        "are watching",
        "watches"
      ],
      "correct": "are watching",
      "explanation": "We + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ to music now\"",
      "options": [
        "listen",
        "are listening",
        "listens"
      ],
      "correct": "are listening",
      "explanation": "They + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ his room right now\"",
      "options": [
        "clean",
        "is cleaning",
        "cleans"
      ],
      "correct": "is cleaning",
      "explanation": "He + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ a letter now\"",
      "options": [
        "write",
        "am writing",
        "writes"
      ],
      "correct": "am writing",
      "explanation": "I + am + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ dinner now\"",
      "options": [
        "cook",
        "is cooking",
        "cooks"
      ],
      "correct": "is cooking",
      "explanation": "She + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ for the bus now\"",
      "options": [
        "wait",
        "are waiting",
        "waits"
      ],
      "correct": "are waiting",
      "explanation": "We + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ a game now\"",
      "options": [
        "play",
        "are playing",
        "plays"
      ],
      "correct": "are playing",
      "explanation": "They + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you ___?\" - \"I'm reading\"",
      "options": [
        "are / doing",
        "do / do",
        "is / doing"
      ],
      "correct": "are / doing",
      "explanation": "What are you doing? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ he ___?\" - \"He's playing\"",
      "options": [
        "is / doing",
        "does / do",
        "do / do"
      ],
      "correct": "is / doing",
      "explanation": "What is he doing? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Why ___ she ___?\" - \"Because she's happy\"",
      "options": [
        "is / smiling",
        "does / smile",
        "do / smile"
      ],
      "correct": "is / smiling",
      "explanation": "Why is she smiling? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Where ___ you ___?\" - \"To the park\"",
      "options": [
        "are / going",
        "do / go",
        "is / going"
      ],
      "correct": "are / going",
      "explanation": "Where are you going? = שאלה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not ___ TV right now\"",
      "options": [
        "am / watching",
        "do / watch",
        "is / watching"
      ],
      "correct": "am / watching",
      "explanation": "I am not watching = שלילה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ not ___ now\"",
      "options": [
        "is / sleeping",
        "does / sleep",
        "do / sleep"
      ],
      "correct": "is / sleeping",
      "explanation": "She is not sleeping = שלילה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ not ___ now\"",
      "options": [
        "are / studying",
        "do / study",
        "is / studying"
      ],
      "correct": "are / studying",
      "explanation": "We are not studying = שלילה ב-Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The dog ___ in the garden\"",
      "options": [
        "run",
        "runs",
        "is running"
      ],
      "correct": "is running",
      "explanation": "The dog (it) + is + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The birds ___ in the sky\"",
      "options": [
        "fly",
        "flies",
        "are flying"
      ],
      "correct": "are flying",
      "explanation": "The birds (they) + are + verb-ing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ for my test tomorrow\"",
      "options": [
        "study",
        "am studying",
        "studies"
      ],
      "correct": "am studying",
      "explanation": "תכנית קרובה → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ her grandmother this weekend\"",
      "options": [
        "visits",
        "is visiting",
        "visit"
      ],
      "correct": "is visiting",
      "explanation": "תכנית עתידית → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ to the beach next week\"",
      "options": [
        "go",
        "are going",
        "goes"
      ],
      "correct": "are going",
      "explanation": "תכנית → are going.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ a party next month\"",
      "options": [
        "have",
        "are having",
        "has"
      ],
      "correct": "are having",
      "explanation": "תכנית עתידית → are having.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my friend tomorrow\"",
      "options": [
        "meet",
        "am meeting",
        "meets"
      ],
      "correct": "am meeting",
      "explanation": "תכנית עתידית → am meeting.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a new school in September\"",
      "options": [
        "start",
        "is starting",
        "starts"
      ],
      "correct": "is starting",
      "explanation": "תכנית עתידית → is starting.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Look! It ___ outside\"",
      "options": [
        "rain",
        "rains",
        "is raining"
      ],
      "correct": "is raining",
      "explanation": "Look! = עכשיו → is raining.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Listen! The birds ___\"",
      "options": [
        "sing",
        "sings",
        "are singing"
      ],
      "correct": "are singing",
      "explanation": "Listen! = עכשיו → are singing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Watch! He ___\"",
      "options": [
        "jump",
        "jumps",
        "is jumping"
      ],
      "correct": "is jumping",
      "explanation": "Watch! = עכשיו → is jumping.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Right now, I ___ a book\"",
      "options": [
        "read",
        "am reading",
        "reads"
      ],
      "correct": "am reading",
      "explanation": "Right now → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"At the moment, she ___ dinner\"",
      "options": [
        "cook",
        "is cooking",
        "cooks"
      ],
      "correct": "is cooking",
      "explanation": "At the moment → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "quantifiers": [
    {
      "question": "Choose the correct word: \"There aren't ___ apples left\"",
      "options": [
        "some",
        "any",
        "much"
      ],
      "correct": "any",
      "explanation": "בשלילה משתמשים ב-any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct option: \"How ___ water do you drink?\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Water הוא לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct option: \"We have ___ homework today\"",
      "options": [
        "a few",
        "much",
        "many"
      ],
      "correct": "a few",
      "explanation": "Homework במובן של משימות נפרדות → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ books on the table\"",
      "options": [
        "some",
        "any",
        "much"
      ],
      "correct": "some",
      "explanation": "בחיוב עם שמות עצם רבים → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Do you have ___ pencils?\"",
      "options": [
        "some",
        "any",
        "much"
      ],
      "correct": "any",
      "explanation": "בשאלות עם שמות עצם רבים → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I need ___ milk for the cake\"",
      "options": [
        "a few",
        "many",
        "some"
      ],
      "correct": "some",
      "explanation": "Milk = לא ספיר, בחיוב → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ students are in your class?\"",
      "options": [
        "much",
        "many",
        "few"
      ],
      "correct": "many",
      "explanation": "Students = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There isn't ___ time left\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Time = לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ friends at school\"",
      "options": [
        "a lot of",
        "much",
        "a little"
      ],
      "correct": "a lot of",
      "explanation": "Friends = ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Can I have ___ water, please?\"",
      "options": [
        "a few",
        "some",
        "many"
      ],
      "correct": "some",
      "explanation": "בבקשה/הצעה עם לא ספיר → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ trees in the park\"",
      "options": [
        "a little",
        "many",
        "much"
      ],
      "correct": "many",
      "explanation": "Trees = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ homework to do\"",
      "options": [
        "a few",
        "a lot of",
        "many"
      ],
      "correct": "a lot of",
      "explanation": "Homework = לא ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There isn't ___ sugar in the coffee\"",
      "options": [
        "many",
        "any",
        "few"
      ],
      "correct": "any",
      "explanation": "בשלילה → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ money do you need?\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Money = לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ apples in the basket\"",
      "options": [
        "a few",
        "a little",
        "much"
      ],
      "correct": "a few",
      "explanation": "Apples = ספיר → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ snow on the ground\"",
      "options": [
        "many",
        "a lot of",
        "few"
      ],
      "correct": "a lot of",
      "explanation": "Snow = לא ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Do you want ___ ice cream?\"",
      "options": [
        "some",
        "any",
        "many"
      ],
      "correct": "some",
      "explanation": "בהצעה → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I don't have ___ friends in this city\"",
      "options": [
        "many",
        "much",
        "a little"
      ],
      "correct": "many",
      "explanation": "Friends = ספיר → many (גם בשלילה).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ milk in the fridge\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Milk = לא ספיר, כמות קטנה → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We need ___ more chairs\"",
      "options": [
        "a few",
        "a little",
        "much"
      ],
      "correct": "a few",
      "explanation": "Chairs = ספיר → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ students in the class\"",
      "options": [
        "many",
        "much",
        "a little"
      ],
      "correct": "many",
      "explanation": "Students = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I need ___ help\"",
      "options": [
        "some",
        "any",
        "many"
      ],
      "correct": "some",
      "explanation": "Help = לא ספיר, בחיוב → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Do you have ___ time?\"",
      "options": [
        "some",
        "any",
        "many"
      ],
      "correct": "any",
      "explanation": "בשאלות → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There isn't ___ milk left\"",
      "options": [
        "many",
        "any",
        "few"
      ],
      "correct": "any",
      "explanation": "בשלילה → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ apples do you want?\"",
      "options": [
        "much",
        "many",
        "few"
      ],
      "correct": "many",
      "explanation": "Apples = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ sugar do you need?\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Sugar = לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ friends\"",
      "options": [
        "a lot of",
        "much",
        "a little"
      ],
      "correct": "a lot of",
      "explanation": "Friends = ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ water in the bottle\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Water = לא ספיר, כמות קטנה → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ books\"",
      "options": [
        "a few",
        "a little",
        "much"
      ],
      "correct": "a few",
      "explanation": "Books = ספיר → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ people here\"",
      "options": [
        "many",
        "much",
        "a little"
      ],
      "correct": "many",
      "explanation": "People = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I don't have ___ money\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Money = לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Can I have ___ cookies?\"",
      "options": [
        "some",
        "any",
        "much"
      ],
      "correct": "some",
      "explanation": "בבקשה → some.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There aren't ___ cookies left\"",
      "options": [
        "some",
        "any",
        "much"
      ],
      "correct": "any",
      "explanation": "בשלילה → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We need ___ more time\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Time = לא ספיר → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ flowers in the garden\"",
      "options": [
        "a lot of",
        "much",
        "a little"
      ],
      "correct": "a lot of",
      "explanation": "Flowers = ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ homework\"",
      "options": [
        "a lot of",
        "many",
        "few"
      ],
      "correct": "a lot of",
      "explanation": "Homework = לא ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ juice in the fridge\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Juice = לא ספיר, כמות קטנה → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ toys\"",
      "options": [
        "a few",
        "a little",
        "much"
      ],
      "correct": "a few",
      "explanation": "Toys = ספיר → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There isn't ___ bread left\"",
      "options": [
        "many",
        "any",
        "few"
      ],
      "correct": "any",
      "explanation": "בשלילה → any.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ children are in your class?\"",
      "options": [
        "much",
        "many",
        "few"
      ],
      "correct": "many",
      "explanation": "Children = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"How ___ juice do you drink?\"",
      "options": [
        "many",
        "much",
        "few"
      ],
      "correct": "much",
      "explanation": "Juice = לא ספיר → much.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ pencils\"",
      "options": [
        "a few",
        "a little",
        "much"
      ],
      "correct": "a few",
      "explanation": "Pencils = ספיר → a few.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ coffee in the cup\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Coffee = לא ספיר, כמות קטנה → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We need ___ more paper\"",
      "options": [
        "a few",
        "a little",
        "many"
      ],
      "correct": "a little",
      "explanation": "Paper = לא ספיר → a little.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There are ___ cars on the road\"",
      "options": [
        "many",
        "much",
        "a little"
      ],
      "correct": "many",
      "explanation": "Cars = ספיר → many.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I don't have ___ friends\"",
      "options": [
        "many",
        "much",
        "a little"
      ],
      "correct": "many",
      "explanation": "Friends = ספיר → many (גם בשלילה).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"There is ___ snow outside\"",
      "options": [
        "many",
        "a lot of",
        "few"
      ],
      "correct": "a lot of",
      "explanation": "Snow = לא ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ work to do\"",
      "options": [
        "a few",
        "a lot of",
        "many"
      ],
      "correct": "a lot of",
      "explanation": "Work = לא ספיר, בחיוב → a lot of.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "past_simple": [
    {
      "question": "Choose the correct verb: \"Yesterday we ___ a science project\"",
      "options": [
        "finish",
        "finished",
        "finishing"
      ],
      "correct": "finished",
      "explanation": "Yesterday → Past Simple.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct form: \"He ___ to the museum last week\"",
      "options": [
        "go",
        "goes",
        "went"
      ],
      "correct": "went",
      "explanation": "Went היא צורת העבר של go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct negative: \"They ___ the film\"",
      "options": [
        "don't like",
        "didn't like",
        "weren't like"
      ],
      "correct": "didn't like",
      "explanation": "Past Simple שלילי: didn't + verb base.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ to school yesterday\"",
      "options": [
        "walk",
        "walked",
        "walking"
      ],
      "correct": "walked",
      "explanation": "Yesterday → Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a book last night\"",
      "options": [
        "read",
        "reads",
        "reading"
      ],
      "correct": "read",
      "explanation": "Read (קריאה) היא צורת העבר של read.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ pizza for dinner\"",
      "options": [
        "eat",
        "ate",
        "eating"
      ],
      "correct": "ate",
      "explanation": "Ate היא צורת העבר של eat.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ football in the park\"",
      "options": [
        "play",
        "played",
        "playing"
      ],
      "correct": "played",
      "explanation": "Played = Past Simple של play.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ his homework yesterday\"",
      "options": [
        "do",
        "did",
        "doing"
      ],
      "correct": "did",
      "explanation": "Did היא צורת העבר של do.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ see you at the library\"",
      "options": [
        "don't",
        "didn't",
        "wasn't"
      ],
      "correct": "didn't",
      "explanation": "Past Simple שלילי → didn't.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ like the movie\"",
      "options": [
        "doesn't",
        "didn't",
        "wasn't"
      ],
      "correct": "didn't",
      "explanation": "Past Simple שלילי → didn't.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ you go to the park?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you do yesterday?\"",
      "options": [
        "do",
        "does",
        "did"
      ],
      "correct": "did",
      "explanation": "Past Simple שאלה → did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My friend ___ me a present\"",
      "options": [
        "give",
        "gave",
        "giving"
      ],
      "correct": "gave",
      "explanation": "Gave היא צורת העבר של give.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ to the beach last summer\"",
      "options": [
        "go",
        "went",
        "going"
      ],
      "correct": "went",
      "explanation": "Went היא צורת העבר של go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The cat ___ on the chair\"",
      "options": [
        "sit",
        "sat",
        "sitting"
      ],
      "correct": "sat",
      "explanation": "Sat היא צורת העבר של sit.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ breakfast at 8 o'clock\"",
      "options": [
        "have",
        "had",
        "having"
      ],
      "correct": "had",
      "explanation": "Had היא צורת העבר של have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ a great time at the party\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "had",
      "explanation": "Had היא צורת העבר של have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ home early yesterday\"",
      "options": [
        "come",
        "came",
        "coming"
      ],
      "correct": "came",
      "explanation": "Came היא צורת העבר של come.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ he finish his project?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not understand the question\"",
      "options": [
        "do",
        "does",
        "did"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Yesterday I ___ to the store\"",
      "options": [
        "go",
        "went",
        "going"
      ],
      "correct": "went",
      "explanation": "Yesterday → Past Simple, went היא צורת העבר של go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Last week she ___ a new book\"",
      "options": [
        "buy",
        "bought",
        "buying"
      ],
      "correct": "bought",
      "explanation": "Last week → Past Simple, bought היא צורת העבר של buy.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ pizza yesterday\"",
      "options": [
        "eat",
        "ate",
        "eating"
      ],
      "correct": "ate",
      "explanation": "Yesterday → Past Simple, ate היא צורת העבר של eat.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ his homework last night\"",
      "options": [
        "finish",
        "finished",
        "finishing"
      ],
      "correct": "finished",
      "explanation": "Last night → Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ football yesterday\"",
      "options": [
        "play",
        "played",
        "playing"
      ],
      "correct": "played",
      "explanation": "Yesterday → Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not see you yesterday\"",
      "options": [
        "do",
        "did",
        "does"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ not like the movie\"",
      "options": [
        "does",
        "did",
        "do"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ not go to school yesterday\"",
      "options": [
        "do",
        "did",
        "does"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ you go to the park?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ she finish her homework?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ they play yesterday?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you do yesterday?\"",
      "options": [
        "do",
        "does",
        "did"
      ],
      "correct": "did",
      "explanation": "Past Simple שאלה → did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Where ___ you go?\"",
      "options": [
        "do",
        "does",
        "did"
      ],
      "correct": "did",
      "explanation": "Past Simple שאלה → did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"When ___ she arrive?\"",
      "options": [
        "do",
        "does",
        "did"
      ],
      "correct": "did",
      "explanation": "Past Simple שאלה → did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ a letter yesterday\"",
      "options": [
        "write",
        "wrote",
        "writing"
      ],
      "correct": "wrote",
      "explanation": "Yesterday → Past Simple, wrote היא צורת העבר של write.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a picture\"",
      "options": [
        "draw",
        "drew",
        "drawing"
      ],
      "correct": "drew",
      "explanation": "Past Simple, drew היא צורת העבר של draw.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ to the beach last summer\"",
      "options": [
        "go",
        "went",
        "going"
      ],
      "correct": "went",
      "explanation": "Last summer → Past Simple, went היא צורת העבר של go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ home early\"",
      "options": [
        "come",
        "came",
        "coming"
      ],
      "correct": "came",
      "explanation": "Past Simple, came היא צורת העבר של come.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ a great time\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "had",
      "explanation": "Past Simple, had היא צורת העבר של have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my keys\"",
      "options": [
        "lose",
        "lost",
        "losing"
      ],
      "correct": "lost",
      "explanation": "Past Simple, lost היא צורת העבר של lose.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ her room\"",
      "options": [
        "clean",
        "cleaned",
        "cleaning"
      ],
      "correct": "cleaned",
      "explanation": "Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ TV last night\"",
      "options": [
        "watch",
        "watched",
        "watching"
      ],
      "correct": "watched",
      "explanation": "Last night → Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ football\"",
      "options": [
        "play",
        "played",
        "playing"
      ],
      "correct": "played",
      "explanation": "Past Simple, פועל סדיר → +ed.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not go yesterday\"",
      "options": [
        "do",
        "did",
        "does"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ not come\"",
      "options": [
        "does",
        "did",
        "do"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ not see them\"",
      "options": [
        "do",
        "did",
        "does"
      ],
      "correct": "did",
      "explanation": "Past Simple שלילי → did not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ you eat breakfast?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ he finish?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ they arrive?\"",
      "options": [
        "Do",
        "Does",
        "Did"
      ],
      "correct": "Did",
      "explanation": "Past Simple שאלה → Did.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "modals": [
    {
      "question": "Choose the correct modal: \"You ___ wear a helmet when you ride\"",
      "options": [
        "should",
        "am",
        "was"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct modal: \"We ___ go to the new science fair\"",
      "options": [
        "might",
        "am",
        "is"
      ],
      "correct": "might",
      "explanation": "אפשרות עתידית → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct modal: \"Students ___ bring water to the trip\"",
      "options": [
        "must",
        "can",
        "am"
      ],
      "correct": "must",
      "explanation": "חובה → must.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ swim when I was five\"",
      "options": [
        "can",
        "could",
        "must"
      ],
      "correct": "could",
      "explanation": "יכולת בעבר → could.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ be careful with fire\"",
      "options": [
        "should",
        "can",
        "will"
      ],
      "correct": "should",
      "explanation": "עצה/המלצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ play outside if it rains\"",
      "options": [
        "can't",
        "can",
        "must"
      ],
      "correct": "can't",
      "explanation": "אי אפשר → can't.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ speak three languages\"",
      "options": [
        "can",
        "should",
        "must"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ do your homework before playing\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ come to the party tomorrow\"",
      "options": [
        "might",
        "must",
        "should"
      ],
      "correct": "might",
      "explanation": "אפשרות → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Students ___ not run in the hallway\"",
      "options": [
        "should",
        "can",
        "must"
      ],
      "correct": "must",
      "explanation": "חובה/איסור → must not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help you with that\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "הצעת עזרה → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ save water for the environment\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה/מוסר → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ be at school by 8 o'clock\"",
      "options": [
        "can",
        "must",
        "might"
      ],
      "correct": "must",
      "explanation": "חובה → must.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ not find his keys\"",
      "options": [
        "can",
        "could",
        "should"
      ],
      "correct": "could",
      "explanation": "אי יכולת בעבר → could not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ I borrow your pencil?\"",
      "options": [
        "Can",
        "Should",
        "Must"
      ],
      "correct": "Can",
      "explanation": "בקשה → Can I?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ visit the museum next week\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות עתידית → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ listen to your teacher\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה/חובה מוסרית → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ play the piano very well\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Children ___ not play near the road\"",
      "options": [
        "should",
        "can",
        "must"
      ],
      "correct": "must",
      "explanation": "חובה/איסור → must not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ finish my project by Friday\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה/המלצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ be careful\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ swim\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ come to school\"",
      "options": [
        "can",
        "must",
        "might"
      ],
      "correct": "must",
      "explanation": "חובה → must.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ go tomorrow\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ speak English\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ not run here\"",
      "options": [
        "should",
        "can",
        "must"
      ],
      "correct": "must",
      "explanation": "חובה/איסור → must not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help you\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "הצעת עזרה → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ save water\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה/מוסר → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ not find it\"",
      "options": [
        "can",
        "could",
        "should"
      ],
      "correct": "could",
      "explanation": "אי יכולת בעבר → could not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ I help you?\"",
      "options": [
        "Can",
        "Should",
        "Must"
      ],
      "correct": "Can",
      "explanation": "בקשה → Can I?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ listen\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ come\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not do that\"",
      "options": [
        "can",
        "could",
        "should"
      ],
      "correct": "can",
      "explanation": "אי יכולת → can not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ be on time\"",
      "options": [
        "can",
        "must",
        "might"
      ],
      "correct": "must",
      "explanation": "חובה → must.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ visit them\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות עתידית → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ play well\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Children ___ not play here\"",
      "options": [
        "should",
        "can",
        "must"
      ],
      "correct": "must",
      "explanation": "חובה/איסור → must not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "הצעת עזרה → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ study hard\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ not come\"",
      "options": [
        "can",
        "could",
        "should"
      ],
      "correct": "could",
      "explanation": "אי יכולת בעבר → could not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"___ I go?\"",
      "options": [
        "Can",
        "Should",
        "Must"
      ],
      "correct": "Can",
      "explanation": "בקשה → Can I?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ be careful\"",
      "options": [
        "should",
        "can",
        "might"
      ],
      "correct": "should",
      "explanation": "עצה → should.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ arrive late\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not see it\"",
      "options": [
        "can",
        "could",
        "should"
      ],
      "correct": "can",
      "explanation": "אי יכולת → can not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"You ___ be here at 8\"",
      "options": [
        "can",
        "must",
        "might"
      ],
      "correct": "must",
      "explanation": "חובה → must.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ come tomorrow\"",
      "options": [
        "might",
        "can",
        "must"
      ],
      "correct": "might",
      "explanation": "אפשרות עתידית → might.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ play together\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "יכולת → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Students ___ not cheat\"",
      "options": [
        "should",
        "can",
        "must"
      ],
      "correct": "must",
      "explanation": "חובה/איסור → must not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help you\"",
      "options": [
        "can",
        "must",
        "should"
      ],
      "correct": "can",
      "explanation": "הצעת עזרה → can.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "comparatives": [
    {
      "question": "Choose the correct form: \"This book is ___ than that one\"",
      "options": [
        "more interesting",
        "most interesting",
        "interesting"
      ],
      "correct": "more interesting",
      "explanation": "השוואה של תואר דו-הברתי → more + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct word: \"My bag is ___ than yours\"",
      "options": [
        "heavier",
        "heavy",
        "heaviest"
      ],
      "correct": "heavier",
      "explanation": "השוואה → adjective + er.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct form: \"This exercise is the ___ of the unit\"",
      "options": [
        "harder",
        "hardest",
        "hard"
      ],
      "correct": "hardest",
      "explanation": "Superlative → the + adjective + est.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Tom is ___ than his brother\"",
      "options": [
        "tall",
        "taller",
        "tallest"
      ],
      "correct": "taller",
      "explanation": "השוואה → taller (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ day of the week\"",
      "options": [
        "long",
        "longer",
        "longest"
      ],
      "correct": "longest",
      "explanation": "Superlative → longest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My room is ___ than yours\"",
      "options": [
        "big",
        "bigger",
        "biggest"
      ],
      "correct": "bigger",
      "explanation": "השוואה → bigger (כפילת האות האחרונה + er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This test was ___ than the last one\"",
      "options": [
        "easy",
        "easier",
        "easiest"
      ],
      "correct": "easier",
      "explanation": "השוואה → easier (y → ier).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is the ___ student in class\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "best",
      "explanation": "Superlative של good → best.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This movie is ___ than the book\"",
      "options": [
        "more exciting",
        "most exciting",
        "exciting"
      ],
      "correct": "more exciting",
      "explanation": "השוואה של תואר ארוך → more + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Today is ___ than yesterday\"",
      "options": [
        "cold",
        "colder",
        "coldest"
      ],
      "correct": "colder",
      "explanation": "השוואה → colder (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ cake I've ever eaten\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "best",
      "explanation": "Superlative של good → best.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My pencil is ___ than yours\"",
      "options": [
        "short",
        "shorter",
        "shortest"
      ],
      "correct": "shorter",
      "explanation": "השוואה → shorter (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This problem is ___ than the previous one\"",
      "options": [
        "difficult",
        "more difficult",
        "most difficult"
      ],
      "correct": "more difficult",
      "explanation": "השוואה של תואר ארוך → more + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"That is the ___ building in the city\"",
      "options": [
        "high",
        "higher",
        "highest"
      ],
      "correct": "highest",
      "explanation": "Superlative → highest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This route is ___ than the other\"",
      "options": [
        "long",
        "longer",
        "longest"
      ],
      "correct": "longer",
      "explanation": "השוואה → longer (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is ___ than her sister\"",
      "options": [
        "old",
        "older",
        "oldest"
      ],
      "correct": "older",
      "explanation": "השוואה → older (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ question in the test\"",
      "options": [
        "hard",
        "harder",
        "hardest"
      ],
      "correct": "hardest",
      "explanation": "Superlative → hardest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My homework is ___ than yours\"",
      "options": [
        "easy",
        "easier",
        "easiest"
      ],
      "correct": "easier",
      "explanation": "השוואה → easier (y → ier).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This book is the ___ one I've read\"",
      "options": [
        "interesting",
        "more interesting",
        "most interesting"
      ],
      "correct": "most interesting",
      "explanation": "Superlative של תואר ארוך → most + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The weather today is ___ than yesterday\"",
      "options": [
        "nice",
        "nicer",
        "nicest"
      ],
      "correct": "nicer",
      "explanation": "השוואה → nicer (e → er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is ___ than that\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "better",
      "explanation": "השוואה של good → better.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is ___ than me\"",
      "options": [
        "tall",
        "taller",
        "tallest"
      ],
      "correct": "taller",
      "explanation": "השוואה → taller (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ one\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "best",
      "explanation": "Superlative של good → best.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My bag is ___ than yours\"",
      "options": [
        "heavy",
        "heavier",
        "heaviest"
      ],
      "correct": "heavier",
      "explanation": "השוואה → heavier.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ day\"",
      "options": [
        "long",
        "longer",
        "longest"
      ],
      "correct": "longest",
      "explanation": "Superlative → longest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This room is ___ than that one\"",
      "options": [
        "big",
        "bigger",
        "biggest"
      ],
      "correct": "bigger",
      "explanation": "השוואה → bigger (כפילת האות האחרונה + er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This test is ___ than the last\"",
      "options": [
        "easy",
        "easier",
        "easiest"
      ],
      "correct": "easier",
      "explanation": "השוואה → easier (y → ier).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is the ___ student\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "best",
      "explanation": "Superlative של good → best.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This movie is ___ than the book\"",
      "options": [
        "more exciting",
        "most exciting",
        "exciting"
      ],
      "correct": "more exciting",
      "explanation": "השוואה של תואר ארוך → more + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Today is ___ than yesterday\"",
      "options": [
        "cold",
        "colder",
        "coldest"
      ],
      "correct": "colder",
      "explanation": "השוואה → colder (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ cake\"",
      "options": [
        "good",
        "better",
        "best"
      ],
      "correct": "best",
      "explanation": "Superlative של good → best.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My pencil is ___ than yours\"",
      "options": [
        "short",
        "shorter",
        "shortest"
      ],
      "correct": "shorter",
      "explanation": "השוואה → shorter (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This problem is ___ than the previous\"",
      "options": [
        "difficult",
        "more difficult",
        "most difficult"
      ],
      "correct": "more difficult",
      "explanation": "השוואה של תואר ארוך → more + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"That is the ___ building\"",
      "options": [
        "high",
        "higher",
        "highest"
      ],
      "correct": "highest",
      "explanation": "Superlative → highest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This route is ___ than the other\"",
      "options": [
        "long",
        "longer",
        "longest"
      ],
      "correct": "longer",
      "explanation": "השוואה → longer (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is ___ than her sister\"",
      "options": [
        "old",
        "older",
        "oldest"
      ],
      "correct": "older",
      "explanation": "השוואה → older (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ question\"",
      "options": [
        "hard",
        "harder",
        "hardest"
      ],
      "correct": "hardest",
      "explanation": "Superlative → hardest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"My homework is ___ than yours\"",
      "options": [
        "easy",
        "easier",
        "easiest"
      ],
      "correct": "easier",
      "explanation": "השוואה → easier (y → ier).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This book is the ___ one\"",
      "options": [
        "interesting",
        "more interesting",
        "most interesting"
      ],
      "correct": "most interesting",
      "explanation": "Superlative של תואר ארוך → most + adjective.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The weather is ___ than before\"",
      "options": [
        "nice",
        "nicer",
        "nicest"
      ],
      "correct": "nicer",
      "explanation": "השוואה → nicer (e → er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is ___ than that\"",
      "options": [
        "bad",
        "worse",
        "worst"
      ],
      "correct": "worse",
      "explanation": "השוואה של bad → worse.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ one\"",
      "options": [
        "bad",
        "worse",
        "worst"
      ],
      "correct": "worst",
      "explanation": "Superlative של bad → worst.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She is ___ than him\"",
      "options": [
        "young",
        "younger",
        "youngest"
      ],
      "correct": "younger",
      "explanation": "השוואה → younger (er).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ child\"",
      "options": [
        "young",
        "younger",
        "youngest"
      ],
      "correct": "youngest",
      "explanation": "Superlative → youngest (est).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is ___ than that\"",
      "options": [
        "far",
        "farther",
        "farthest"
      ],
      "correct": "farther",
      "explanation": "השוואה → farther.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ place\"",
      "options": [
        "far",
        "farther",
        "farthest"
      ],
      "correct": "farthest",
      "explanation": "Superlative → farthest.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is ___ than that\"",
      "options": [
        "little",
        "less",
        "least"
      ],
      "correct": "less",
      "explanation": "השוואה של little → less.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"This is the ___ one\"",
      "options": [
        "little",
        "less",
        "least"
      ],
      "correct": "least",
      "explanation": "Superlative של little → least.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "future_forms": [
    {
      "question": "Choose the correct future: \"Tomorrow we ___ a trip\"",
      "options": [
        "take",
        "will take",
        "took"
      ],
      "correct": "will take",
      "explanation": "Tomorrow → will + base form.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct plan: \"We ___ my cousins on Sunday\"",
      "options": [
        "are visiting",
        "visited",
        "visits"
      ],
      "correct": "are visiting",
      "explanation": "תכנית קרובה → Present Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct option: \"I'm sure it ___ fine\"",
      "options": [
        "is",
        "will be",
        "was"
      ],
      "correct": "will be",
      "explanation": "בטחון בעתיד → will + base.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Next week I ___ to the beach\"",
      "options": [
        "go",
        "will go",
        "went"
      ],
      "correct": "will go",
      "explanation": "עתיד → will go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a party next month\"",
      "options": [
        "has",
        "will have",
        "had"
      ],
      "correct": "will have",
      "explanation": "עתיד → will have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ pizza for dinner tonight\"",
      "options": [
        "are having",
        "have",
        "had"
      ],
      "correct": "are having",
      "explanation": "תכנית קרובה → are having.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ visit us tomorrow\"",
      "options": [
        "visit",
        "will visit",
        "visited"
      ],
      "correct": "will visit",
      "explanation": "עתיד → will visit.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ finish my homework soon\"",
      "options": [
        "finish",
        "will finish",
        "finished"
      ],
      "correct": "will finish",
      "explanation": "עתיד → will finish.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you do next summer?\"",
      "options": [
        "do",
        "will",
        "did"
      ],
      "correct": "will",
      "explanation": "שאלה בעתיד → What will you do?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not forget your birthday\"",
      "options": [
        "do",
        "will",
        "am"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to the park this afternoon\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ start her new school in September\"",
      "options": [
        "starts",
        "will start",
        "started"
      ],
      "correct": "will start",
      "explanation": "עתיד → will start.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ see you next week\"",
      "options": [
        "see",
        "will see",
        "saw"
      ],
      "correct": "will see",
      "explanation": "עתיד → will see.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ not come to school tomorrow\"",
      "options": [
        "do",
        "will",
        "are"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What time ___ the movie start?\"",
      "options": [
        "does",
        "will",
        "did"
      ],
      "correct": "will",
      "explanation": "שאלה בעתיד → will.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help you with that tomorrow\"",
      "options": [
        "help",
        "will help",
        "helped"
      ],
      "correct": "will help",
      "explanation": "עתיד → will help.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ have a test next Friday\"",
      "options": [
        "have",
        "will have",
        "had"
      ],
      "correct": "will have",
      "explanation": "עתיד → will have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ be ten years old next month\"",
      "options": [
        "is",
        "will be",
        "was"
      ],
      "correct": "will be",
      "explanation": "עתיד → will be.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I think it ___ rain tomorrow\"",
      "options": [
        "rains",
        "will rain",
        "rained"
      ],
      "correct": "will rain",
      "explanation": "תחזית/חיזוי → will rain.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to learn about space\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Tomorrow I ___ to school\"",
      "options": [
        "go",
        "will go",
        "went"
      ],
      "correct": "will go",
      "explanation": "Tomorrow → will go.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Next week she ___ a party\"",
      "options": [
        "has",
        "will have",
        "had"
      ],
      "correct": "will have",
      "explanation": "Next week → will have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ pizza tonight\"",
      "options": [
        "are having",
        "have",
        "had"
      ],
      "correct": "are having",
      "explanation": "תכנית קרובה → are having.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ visit us tomorrow\"",
      "options": [
        "visit",
        "will visit",
        "visited"
      ],
      "correct": "will visit",
      "explanation": "Tomorrow → will visit.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ finish soon\"",
      "options": [
        "finish",
        "will finish",
        "finished"
      ],
      "correct": "will finish",
      "explanation": "עתיד → will finish.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you do next summer?\"",
      "options": [
        "do",
        "will",
        "did"
      ],
      "correct": "will",
      "explanation": "שאלה בעתיד → What will you do?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not forget\"",
      "options": [
        "do",
        "will",
        "am"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to the park\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ start next month\"",
      "options": [
        "starts",
        "will start",
        "started"
      ],
      "correct": "will start",
      "explanation": "עתיד → will start.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ see you next week\"",
      "options": [
        "see",
        "will see",
        "saw"
      ],
      "correct": "will see",
      "explanation": "עתיד → will see.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ not come tomorrow\"",
      "options": [
        "do",
        "will",
        "are"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What time ___ it start?\"",
      "options": [
        "does",
        "will",
        "did"
      ],
      "correct": "will",
      "explanation": "שאלה בעתיד → will.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ help you tomorrow\"",
      "options": [
        "help",
        "will help",
        "helped"
      ],
      "correct": "will help",
      "explanation": "עתיד → will help.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ have a test next Friday\"",
      "options": [
        "have",
        "will have",
        "had"
      ],
      "correct": "will have",
      "explanation": "עתיד → will have.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ be ten next month\"",
      "options": [
        "is",
        "will be",
        "was"
      ],
      "correct": "will be",
      "explanation": "עתיד → will be.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I think it ___ rain\"",
      "options": [
        "rains",
        "will rain",
        "rained"
      ],
      "correct": "will rain",
      "explanation": "תחזית → will rain.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to learn\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Tomorrow we ___ a trip\"",
      "options": [
        "take",
        "will take",
        "took"
      ],
      "correct": "will take",
      "explanation": "Tomorrow → will take.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Next year I ___ twelve\"",
      "options": [
        "am",
        "will be",
        "was"
      ],
      "correct": "will be",
      "explanation": "Next year → will be.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to the beach\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ come next week\"",
      "options": [
        "come",
        "will come",
        "came"
      ],
      "correct": "will come",
      "explanation": "Next week → will come.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not be late\"",
      "options": [
        "do",
        "will",
        "am"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ arrive tomorrow\"",
      "options": [
        "arrive",
        "will arrive",
        "arrived"
      ],
      "correct": "will arrive",
      "explanation": "Tomorrow → will arrive.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to play\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Next month I ___ start\"",
      "options": [
        "start",
        "will start",
        "started"
      ],
      "correct": "will start",
      "explanation": "Next month → will start.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ not forget\"",
      "options": [
        "do",
        "will",
        "is"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ going to study\"",
      "options": [
        "are",
        "will",
        "was"
      ],
      "correct": "are",
      "explanation": "תכנית → are going to.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Tomorrow they ___ leave\"",
      "options": [
        "leave",
        "will leave",
        "left"
      ],
      "correct": "will leave",
      "explanation": "Tomorrow → will leave.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ not miss it\"",
      "options": [
        "do",
        "will",
        "am"
      ],
      "correct": "will",
      "explanation": "עתיד שלילי → will not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "complex_tenses": [
    {
      "question": "Choose the correct tense: \"They ___ when the phone rang\"",
      "options": [
        "played",
        "were playing",
        "are playing"
      ],
      "correct": "were playing",
      "explanation": "פעולה נמשכת בעבר → Past Continuous.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct form: \"I have ___ finished my project\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "Present Perfect אוהב already/just.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct option: \"She has ___ visited London\"",
      "options": [
        "never",
        "ever",
        "always"
      ],
      "correct": "never",
      "explanation": "ניסיון בעבר עד כה → never/ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my homework when you called\"",
      "options": [
        "was doing",
        "did",
        "do"
      ],
      "correct": "was doing",
      "explanation": "פעולה נמשכת בעבר → was doing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a book when the bell rang\"",
      "options": [
        "read",
        "was reading",
        "reads"
      ],
      "correct": "was reading",
      "explanation": "פעולה נמשכת בעבר → was reading.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ already eaten lunch\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "have",
      "explanation": "Present Perfect → have + past participle.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Have you ___ been to Paris?\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ studying when I arrived\"",
      "options": [
        "were",
        "was",
        "are"
      ],
      "correct": "were",
      "explanation": "Past Continuous → were studying.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ seen that movie\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ not finished his work yet\"",
      "options": [
        "has",
        "have",
        "had"
      ],
      "correct": "has",
      "explanation": "Present Perfect שלילי → has not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you doing at 5 o'clock?\"",
      "options": [
        "were",
        "was",
        "are"
      ],
      "correct": "were",
      "explanation": "שאלה ב-Past Continuous → were.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She has ___ lived here for five years\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "already",
      "explanation": "כבר/כל כך הרבה זמן → already (או ללא מילת זמן).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"While I ___ dinner, he was watching TV\"",
      "options": [
        "was eating",
        "ate",
        "eat"
      ],
      "correct": "was eating",
      "explanation": "פעולה נמשכת בעבר → was eating.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Have they ___ visited Israel?\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ just finished my breakfast\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "have",
      "explanation": "Present Perfect עם just → have just.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ crying when I saw her\"",
      "options": [
        "was",
        "were",
        "is"
      ],
      "correct": "was",
      "explanation": "Past Continuous → was crying.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ been to this place before\"",
      "options": [
        "never",
        "ever",
        "already"
      ],
      "correct": "never",
      "explanation": "מעולם לא → never.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The children ___ playing outside when it started raining\"",
      "options": [
        "was",
        "were",
        "are"
      ],
      "correct": "were",
      "explanation": "Past Continuous → were playing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Has she ___ done her homework?\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "שאלה עם already → כבר?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ sleeping when the alarm went off\"",
      "options": [
        "was",
        "were",
        "am"
      ],
      "correct": "was",
      "explanation": "Past Continuous → was sleeping.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ my homework when you called\"",
      "options": [
        "was doing",
        "did",
        "do"
      ],
      "correct": "was doing",
      "explanation": "פעולה נמשכת בעבר → was doing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ a book when the bell rang\"",
      "options": [
        "read",
        "was reading",
        "reads"
      ],
      "correct": "was reading",
      "explanation": "פעולה נמשכת בעבר → was reading.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ already eaten\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "have",
      "explanation": "Present Perfect → have + past participle.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Have you ___ been to Paris?\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ studying when I arrived\"",
      "options": [
        "were",
        "was",
        "are"
      ],
      "correct": "were",
      "explanation": "Past Continuous → were studying.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ seen that movie\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ not finished yet\"",
      "options": [
        "has",
        "have",
        "had"
      ],
      "correct": "has",
      "explanation": "Present Perfect שלילי → has not.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"What ___ you doing at 5?\"",
      "options": [
        "were",
        "was",
        "are"
      ],
      "correct": "were",
      "explanation": "שאלה ב-Past Continuous → were.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She has ___ lived here\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"While I ___ dinner, he watched TV\"",
      "options": [
        "was eating",
        "ate",
        "eat"
      ],
      "correct": "was eating",
      "explanation": "פעולה נמשכת בעבר → was eating.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Have they ___ visited?\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ just finished\"",
      "options": [
        "have",
        "has",
        "had"
      ],
      "correct": "have",
      "explanation": "Present Perfect עם just → have just.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ crying when I saw her\"",
      "options": [
        "was",
        "were",
        "is"
      ],
      "correct": "was",
      "explanation": "Past Continuous → was crying.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ been here\"",
      "options": [
        "never",
        "ever",
        "already"
      ],
      "correct": "never",
      "explanation": "מעולם לא → never.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"The children ___ playing when it rained\"",
      "options": [
        "was",
        "were",
        "are"
      ],
      "correct": "were",
      "explanation": "Past Continuous → were playing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Has she ___ done it?\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "שאלה עם already → כבר?",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ sleeping when it happened\"",
      "options": [
        "was",
        "were",
        "am"
      ],
      "correct": "was",
      "explanation": "Past Continuous → was sleeping.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ when I called\"",
      "options": [
        "were eating",
        "ate",
        "eat"
      ],
      "correct": "were eating",
      "explanation": "Past Continuous → were eating.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ finished\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She ___ when I saw her\"",
      "options": [
        "was running",
        "ran",
        "run"
      ],
      "correct": "was running",
      "explanation": "Past Continuous → was running.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We have ___ been there\"",
      "options": [
        "never",
        "ever",
        "already"
      ],
      "correct": "never",
      "explanation": "מעולם לא → never.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"He ___ when I arrived\"",
      "options": [
        "was sleeping",
        "slept",
        "sleep"
      ],
      "correct": "was sleeping",
      "explanation": "Past Continuous → was sleeping.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ seen it\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"They ___ when it started\"",
      "options": [
        "were playing",
        "played",
        "play"
      ],
      "correct": "were playing",
      "explanation": "Past Continuous → were playing.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"Have you ___ done this?\"",
      "options": [
        "ever",
        "never",
        "already"
      ],
      "correct": "ever",
      "explanation": "שאלה ב-Present Perfect → ever.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I ___ when you called\"",
      "options": [
        "was studying",
        "studied",
        "study"
      ],
      "correct": "was studying",
      "explanation": "Past Continuous → was studying.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"She has ___ finished\"",
      "options": [
        "already",
        "ever",
        "never"
      ],
      "correct": "already",
      "explanation": "כבר → already.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"We ___ when it happened\"",
      "options": [
        "were talking",
        "talked",
        "talk"
      ],
      "correct": "were talking",
      "explanation": "Past Continuous → were talking.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"I have ___ been there\"",
      "options": [
        "never",
        "ever",
        "already"
      ],
      "correct": "never",
      "explanation": "מעולם לא → never.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "conditionals": [
    {
      "question": "Choose the correct form: \"If we save water, we ___ the planet\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "help",
      "explanation": "Zero conditional: If + present, present.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct option: \"If it rains, we ___ at home\"",
      "options": [
        "stay",
        "stayed",
        "will stay"
      ],
      "correct": "will stay",
      "explanation": "First conditional: If + present, will + base.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose the correct sentence: \"If you study, you ___ the test\"",
      "options": [
        "pass",
        "passed",
        "passes"
      ],
      "correct": "pass",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you heat water, it ___\"",
      "options": [
        "boils",
        "boiled",
        "will boil"
      ],
      "correct": "boils",
      "explanation": "עובדה כללית → Zero conditional (present, present).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I have time, I ___ you\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "will help",
      "explanation": "תנאי אפשרי → First conditional (present, will).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it's sunny tomorrow, we ___ to the park\"",
      "options": [
        "go",
        "went",
        "will go"
      ],
      "correct": "will go",
      "explanation": "תנאי עתידי → First conditional (present, will).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't study, you ___ pass the test\"",
      "options": [
        "don't",
        "didn't",
        "won't"
      ],
      "correct": "won't",
      "explanation": "First conditional שלילי → won't.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If plants don't get water, they ___\"",
      "options": [
        "die",
        "died",
        "will die"
      ],
      "correct": "die",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If she comes early, we ___ start on time\"",
      "options": [
        "start",
        "started",
        "will start"
      ],
      "correct": "will start",
      "explanation": "First conditional → will start.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you touch fire, you ___ burned\"",
      "options": [
        "get",
        "got",
        "will get"
      ],
      "correct": "get",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I finish early, I ___ help you\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "will help",
      "explanation": "First conditional → will help.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it snows, school ___ closed\"",
      "options": [
        "closes",
        "closed",
        "will close"
      ],
      "correct": "will close",
      "explanation": "תנאי אפשרי → First conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you water plants, they ___\"",
      "options": [
        "grow",
        "grew",
        "will grow"
      ],
      "correct": "grow",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If we recycle, we ___ the environment\"",
      "options": [
        "protect",
        "protected",
        "will protect"
      ],
      "correct": "protect",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If he doesn't hurry, he ___ late\"",
      "options": [
        "is",
        "was",
        "will be"
      ],
      "correct": "will be",
      "explanation": "First conditional → will be.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you eat too much, you ___ sick\"",
      "options": [
        "feel",
        "felt",
        "will feel"
      ],
      "correct": "feel",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If she studies hard, she ___ good grades\"",
      "options": [
        "gets",
        "got",
        "will get"
      ],
      "correct": "will get",
      "explanation": "First conditional → will get.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If the sun shines, it ___ warm\"",
      "options": [
        "is",
        "was",
        "will be"
      ],
      "correct": "is",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If we don't hurry, we ___ miss the bus\"",
      "options": [
        "miss",
        "missed",
        "will miss"
      ],
      "correct": "will miss",
      "explanation": "First conditional → will miss.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you mix red and blue, you ___ purple\"",
      "options": [
        "get",
        "got",
        "will get"
      ],
      "correct": "get",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If we save water, we ___ the planet\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "help",
      "explanation": "Zero conditional: If + present, present.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it rains, we ___ at home\"",
      "options": [
        "stay",
        "stayed",
        "will stay"
      ],
      "correct": "will stay",
      "explanation": "First conditional: If + present, will + base.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you study, you ___ the test\"",
      "options": [
        "pass",
        "passed",
        "passes"
      ],
      "correct": "pass",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you heat water, it ___\"",
      "options": [
        "boils",
        "boiled",
        "will boil"
      ],
      "correct": "boils",
      "explanation": "עובדה כללית → Zero conditional (present, present).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I have time, I ___ you\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "will help",
      "explanation": "תנאי אפשרי → First conditional (present, will).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it's sunny, we ___ to the park\"",
      "options": [
        "go",
        "went",
        "will go"
      ],
      "correct": "will go",
      "explanation": "תנאי עתידי → First conditional (present, will).",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't study, you ___ pass\"",
      "options": [
        "don't",
        "didn't",
        "won't"
      ],
      "correct": "won't",
      "explanation": "First conditional שלילי → won't.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If plants don't get water, they ___\"",
      "options": [
        "die",
        "died",
        "will die"
      ],
      "correct": "die",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If she comes early, we ___ start\"",
      "options": [
        "start",
        "started",
        "will start"
      ],
      "correct": "will start",
      "explanation": "First conditional → will start.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you touch fire, you ___ burned\"",
      "options": [
        "get",
        "got",
        "will get"
      ],
      "correct": "get",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I finish early, I ___ help\"",
      "options": [
        "help",
        "helped",
        "will help"
      ],
      "correct": "will help",
      "explanation": "First conditional → will help.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it snows, school ___ closed\"",
      "options": [
        "closes",
        "closed",
        "will close"
      ],
      "correct": "will close",
      "explanation": "תנאי אפשרי → First conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you water plants, they ___\"",
      "options": [
        "grow",
        "grew",
        "will grow"
      ],
      "correct": "grow",
      "explanation": "עובדה כללית → Zero conditional.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If we recycle, we ___ the environment\"",
      "options": [
        "protect",
        "protected",
        "will protect"
      ],
      "correct": "protect",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If he doesn't hurry, he ___ late\"",
      "options": [
        "is",
        "was",
        "will be"
      ],
      "correct": "will be",
      "explanation": "First conditional → will be.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you eat too much, you ___ sick\"",
      "options": [
        "feel",
        "felt",
        "will feel"
      ],
      "correct": "feel",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If she studies hard, she ___ good grades\"",
      "options": [
        "gets",
        "got",
        "will get"
      ],
      "correct": "will get",
      "explanation": "First conditional → will get.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If the sun shines, it ___ warm\"",
      "options": [
        "is",
        "was",
        "will be"
      ],
      "correct": "is",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If we don't hurry, we ___ miss\"",
      "options": [
        "miss",
        "missed",
        "will miss"
      ],
      "correct": "will miss",
      "explanation": "First conditional → will miss.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't eat, you ___ hungry\"",
      "options": [
        "get",
        "got",
        "will get"
      ],
      "correct": "get",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I see him, I ___ tell him\"",
      "options": [
        "tell",
        "told",
        "will tell"
      ],
      "correct": "will tell",
      "explanation": "First conditional → will tell.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you practice, you ___ better\"",
      "options": [
        "get",
        "got",
        "will get"
      ],
      "correct": "get",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it's cold, I ___ a jacket\"",
      "options": [
        "wear",
        "wore",
        "will wear"
      ],
      "correct": "will wear",
      "explanation": "First conditional → will wear.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't sleep, you ___ tired\"",
      "options": [
        "feel",
        "felt",
        "will feel"
      ],
      "correct": "feel",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If she calls, I ___ answer\"",
      "options": [
        "answer",
        "answered",
        "will answer"
      ],
      "correct": "will answer",
      "explanation": "First conditional → will answer.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't study, you ___ fail\"",
      "options": [
        "fail",
        "failed",
        "will fail"
      ],
      "correct": "will fail",
      "explanation": "First conditional → will fail.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If it's hot, we ___ swim\"",
      "options": [
        "swim",
        "swam",
        "will swim"
      ],
      "correct": "will swim",
      "explanation": "First conditional → will swim.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If you don't brush, your teeth ___ hurt\"",
      "options": [
        "hurt",
        "hurted",
        "will hurt"
      ],
      "correct": "hurt",
      "explanation": "Zero conditional: עובדה כללית.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    },
    {
      "question": "Choose: \"If I have money, I ___ buy it\"",
      "options": [
        "buy",
        "bought",
        "will buy"
      ],
      "correct": "will buy",
      "explanation": "First conditional → will buy.",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "grammar_error",
        "grammar_pattern_error",
        "careless_error"
      ]
    }
  ],
  "phase29_g2_standard": [
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_01",
      "question": "Choose: \"The birds ___ in the tree\"",
      "options": ["sing", "sings", "singing"],
      "correct": "sing",
      "explanation": "The birds (they) → sing.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_01",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_02",
      "question": "Choose: \"My parents ___ me a story\"",
      "options": ["read", "reads", "reading"],
      "correct": "read",
      "explanation": "My parents (they) → read.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_02",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_03",
      "question": "Choose: \"___ you have a blue ruler?\"",
      "options": ["Do", "Does", "Is"],
      "correct": "Do",
      "explanation": "You → Do בשאלות בהווה פשוט.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_03",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_04",
      "question": "Choose: \"We ___ a thank-you card\"",
      "options": ["make", "makes", "making"],
      "correct": "make",
      "explanation": "We → make (צורת בסיס).",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_04",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_05",
      "question": "Choose: \"She ___ not play outside today\"",
      "options": ["don't", "doesn't", "isn't"],
      "correct": "doesn't",
      "explanation": "She → doesn't בשלילה.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_05",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_06",
      "question": "Choose: \"There ___ two apples on the table\"",
      "options": ["is", "are", "am"],
      "correct": "are",
      "explanation": "There are + רבים.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_06",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_07",
      "question": "Choose: \"I ___ a picture of a flower\"",
      "options": ["draw", "draws", "drawing"],
      "correct": "draw",
      "explanation": "I → draw.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_07",
      "subtype": "phase29_g2_standard"
    },
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "phase29_g2_std_08",
      "question": "Choose: \"He ___ a green pencil case\"",
      "options": ["have", "has", "having"],
      "correct": "has",
      "explanation": "He → has.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g2_std_08",
      "subtype": "phase29_g2_standard"
    }
  ],
  "phase29_g3_advanced": [
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_01",
      "question": "Choose: \"Last Sunday we ___ our grandparents\"",
      "options": ["visit", "visited", "visiting"],
      "correct": "visited",
      "explanation": "פעולה בעבר → Past simple.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_01",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_02",
      "question": "Choose: \"She ___ her umbrella at school\"",
      "options": ["forget", "forgot", "forgotten"],
      "correct": "forgot",
      "explanation": "עבר → forgot.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_02",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_03",
      "question": "Choose: \"___ they watch the show yesterday?\"",
      "options": ["Do", "Did", "Does"],
      "correct": "Did",
      "explanation": "Yesterday → Did בשאלות בעבר.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_03",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_04",
      "question": "Choose: \"Tomorrow we ___ visit the zoo\"",
      "options": ["will", "do", "are"],
      "correct": "will",
      "explanation": "Tomorrow → עתיד עם will.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_04",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_05",
      "question": "Choose: \"This road is ___ than that road\"",
      "options": ["narrow", "narrower", "narrowest"],
      "correct": "narrower",
      "explanation": "השוואה בין שניים → comparative.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_05",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_06",
      "question": "Choose: \"I have never ___ this song before\"",
      "options": ["hear", "heard", "hearing"],
      "correct": "heard",
      "explanation": "Present perfect → have + past participle (heard).",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_06",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_07",
      "question": "Choose: \"We ___ to the museum last Thursday\"",
      "options": ["go", "went", "going"],
      "correct": "went",
      "explanation": "Last Thursday → Past simple.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_07",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_08",
      "question": "Choose: \"There ___ enough chairs for everyone\"",
      "options": ["is", "are", "be"],
      "correct": "are",
      "explanation": "chairs רבים → are.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_08",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_09",
      "question": "Choose: \"She ___ her homework before dinner\"",
      "options": ["finish", "finished", "finishing"],
      "correct": "finished",
      "explanation": "סדר פעולות בעבר → finished.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_09",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_10",
      "question": "Choose: \"Whose backpack ___ on the floor?\"",
      "options": ["is", "are", "am"],
      "correct": "is",
      "explanation": "Whose backpack → יחיד.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_10",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_11",
      "question": "Choose: \"They ___ planning the poster all morning\"",
      "options": ["is", "are", "was"],
      "correct": "are",
      "explanation": "They + Present Continuous.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_11",
      "subtype": "phase29_g3_advanced"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "phase29_g3_adv_12",
      "question": "Choose: \"Nobody ___ the answer yet\"",
      "options": ["know", "knows", "knowing"],
      "correct": "knows",
      "explanation": "Nobody → נושא יחיד → knows.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g3_adv_12",
      "subtype": "phase29_g3_advanced"
    }
  ],
  "phase29_g4_advanced": [
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_01",
      "question": "Choose: \"She ___ already finished her lunch\"",
      "options": ["have", "has", "is"],
      "correct": "has",
      "explanation": "She → has ב-present perfect.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_01",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_02",
      "question": "Choose: \"We ___ this song many times\"",
      "options": ["hear", "have heard", "heard"],
      "correct": "have heard",
      "explanation": "חוויה שחוזרת עד עכשיו → have heard.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_02",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_03",
      "question": "Choose: \"This was the ___ day of the trip\"",
      "options": ["happy", "happier", "happiest"],
      "correct": "happiest",
      "explanation": "the + superlative.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_03",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_04",
      "question": "Choose: \"This puzzle is ___ than that puzzle\"",
      "options": ["hard", "harder", "hardest"],
      "correct": "harder",
      "explanation": "השוואה בין שניים → harder.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_04",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_05",
      "question": "Choose: \"They ___ living here since January\"",
      "options": ["are", "were", "have been"],
      "correct": "have been",
      "explanation": "since + נקודת זמן → have been.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_05",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_06",
      "question": "Choose: \"By noon, we ___ the whole poster\"",
      "options": ["finish", "finished", "had finished"],
      "correct": "had finished",
      "explanation": "אירוע לפני רגע בעבר (by noon) → Past perfect.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_06",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_07",
      "question": "Choose: \"We ___ the results twice before writing the chart\"",
      "options": ["check", "checked", "checking"],
      "correct": "checked",
      "explanation": "פעולה שהושלמה בעבר.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_07",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_08",
      "question": "Choose: \"Neither notebook ___ open on the desk\"",
      "options": ["was", "were", "are"],
      "correct": "was",
      "explanation": "Neither + יחיד → was.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_08",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_09",
      "question": "Choose: \"By Friday, we ___ the soil samples\"",
      "options": ["label", "labeled", "will label"],
      "correct": "will label",
      "explanation": "תוכנית עתידית לפני יום שישי.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_09",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_10",
      "question": "Choose: \"The graphs ___ clearer after we fixed the scale\"",
      "options": ["look", "looks", "looked"],
      "correct": "looked",
      "explanation": "אירוע בעבר.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_10",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_11",
      "question": "Choose: \"Each meter ___ checked before class ended\"",
      "options": ["was", "were", "are"],
      "correct": "was",
      "explanation": "Each meter → יחיד.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_11",
      "subtype": "phase29_g4_advanced"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "phase29_g4_adv_12",
      "question": "Choose: \"Neither of the answers ___ correct\"",
      "options": ["is", "are", "am"],
      "correct": "is",
      "explanation": "Neither of → נושא יחיד → is.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g4_adv_12",
      "subtype": "phase29_g4_advanced"
    }
  ],
  "phase29_g5_standard": [
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_01",
      "question": "Choose: \"Everyone ___ a quiet voice in the library\"",
      "options": ["need", "needs", "needing"],
      "correct": "needs",
      "explanation": "Everyone נחשב יחיד → needs.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_01",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_02",
      "question": "Choose: \"This question is ___ than the last one\"",
      "options": ["easy", "easier", "easiest"],
      "correct": "easier",
      "explanation": "השוואה בין שניים → easier.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_02",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_03",
      "question": "Choose: \"You ___ return these books on Friday\"",
      "options": ["must", "can", "may"],
      "correct": "must",
      "explanation": "חובה ברורה → must.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_03",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_04",
      "question": "Choose: \"She ___ in this choir since March\"",
      "options": ["is", "was", "has been"],
      "correct": "has been",
      "explanation": "since March → has been.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_04",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_05",
      "question": "Choose: \"Next week we ___ start our science lab\"",
      "options": ["will", "do", "are"],
      "correct": "will",
      "explanation": "תוכנית עתידית → will.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_05",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_06",
      "question": "Choose: \"Neither answer ___ correct\"",
      "options": ["is", "are", "am"],
      "correct": "is",
      "explanation": "Neither + יחיד → is.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_06",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_07",
      "question": "Choose: \"Each student ___ a worksheet\"",
      "options": ["have", "has", "having"],
      "correct": "has",
      "explanation": "Each student → יחיד → has.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_07",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_08",
      "question": "Choose: \"This river is the ___ in our area\"",
      "options": ["long", "longer", "longest"],
      "correct": "longest",
      "explanation": "the + superlative.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_08",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_09",
      "question": "Choose: \"The committee ___ a budget before the fair\"",
      "options": ["approve", "approves", "approved"],
      "correct": "approved",
      "explanation": "מאורע שהסתיים בעבר.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_09",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_10",
      "question": "Choose: \"Few students ___ the answer on the first try\"",
      "options": ["know", "knows", "knew"],
      "correct": "knew",
      "explanation": "מספר עבר - knew.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_10",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_11",
      "question": "Choose: \"Either the map or the charts ___ on the wall\"",
      "options": ["need", "needs", "needing"],
      "correct": "need",
      "explanation": "either...or - קרבה אל need.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_11",
      "subtype": "phase29_g5_standard"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_std_12",
      "question": "Choose: \"We ___ our draft after peer feedback\"",
      "options": ["rewrite", "rewrites", "rewrote"],
      "correct": "rewrote",
      "explanation": "אירוע בעבר.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_std_12",
      "subtype": "phase29_g5_standard"
    }
  ],
  "phase29_g5_advanced": [
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_01",
      "question": "Choose: \"If it rains, we ___ the picnic indoors\"",
      "options": ["move", "moved", "will move"],
      "correct": "will move",
      "explanation": "תנאי סוג 1 - תוצאה בעתיד עם will.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_01",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_02",
      "question": "Choose: \"She ___ never tried sushi before last month\"",
      "options": ["had", "has", "have"],
      "correct": "had",
      "explanation": "לפני נקודת זמן בעבר → Past Perfect עם had.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_02",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_03",
      "question": "Choose: \"The picture ___ by my cousin yesterday\"",
      "options": ["paints", "painted", "was painted"],
      "correct": "was painted",
      "explanation": "ציווי בעבר → was painted.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_03",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_04",
      "question": "Choose: \"Although it was cold, the team ___ finishing on time\"",
      "options": ["keep", "kept", "keeping"],
      "correct": "kept",
      "explanation": "Although + משפט בעבר → kept.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_04",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_05",
      "question": "Choose: \"By next June, we ___ our bridge model\"",
      "options": ["finish", "will have finished", "finished"],
      "correct": "will have finished",
      "explanation": "נקודת זמן עתידית מוחלטת → Future Perfect.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_05",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_06",
      "question": "Choose: \"The letters ___ before the bell rang\"",
      "options": ["send", "were sent", "sending"],
      "correct": "were sent",
      "explanation": "רבים בעבר של ציווי → were sent.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_06",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_07",
      "question": "Choose: \"He wishes he ___ more time to read\"",
      "options": ["has", "had", "will have"],
      "correct": "had",
      "explanation": "wish + העבר לרצון לא ריאלי → had.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_07",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_08",
      "question": "Choose: \"Neither the glue nor the scissors ___ on the shelf\"",
      "options": ["was", "were", "are"],
      "correct": "were",
      "explanation": "קרבת אל scissors (רבים) → were.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_08",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_09",
      "question": "Choose: \"The coach suggested that we ___ a shorter route\"",
      "options": ["take", "took", "taking"],
      "correct": "take",
      "explanation": "suggested that + בסיס (subjunctive style) → take.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_09",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_10",
      "question": "Choose: \"No sooner had we arrived ___ it started to hail\"",
      "options": ["when", "than", "then"],
      "correct": "than",
      "explanation": "No sooner ... than - חיבור קבוע.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_10",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_11",
      "question": "Choose: \"Scissors ___ useful for cutting cardboard\"",
      "options": ["is", "are", "was"],
      "correct": "are",
      "explanation": "Scissors תמיד ברבים → are.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_11",
      "subtype": "phase29_g5_advanced"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "phase29_g5_adv_12",
      "question": "Choose: \"This is the museum ___ we saw the dinosaur bones\"",
      "options": ["which", "where", "whose"],
      "correct": "where",
      "explanation": "מקום → where.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g5_adv_12",
      "subtype": "phase29_g5_advanced"
    }
  ],
  "phase29_g6_standard": [
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_01",
      "question": "Choose: \"The band ___ played at two school events this year\"",
      "options": ["have", "has", "is"],
      "correct": "has",
      "explanation": "The band כקבוצה יחידה → has.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_01",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_02",
      "question": "Choose: \"This essay is ___ than my first draft\"",
      "options": ["clear", "clearer", "clearest"],
      "correct": "clearer",
      "explanation": "השוואה בין שניים → clearer.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_02",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_03",
      "question": "Choose: \"By next June, I ___ English for seven years\"",
      "options": ["study", "will study", "will have studied"],
      "correct": "will have studied",
      "explanation": "משך עד נקודת עתיד → future perfect.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_03",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_04",
      "question": "Choose: \"Students ___ follow the lab safety rules\"",
      "options": ["must", "might", "could"],
      "correct": "must",
      "explanation": "כלל בטיחות חובה → must.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_04",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_05",
      "question": "Choose: \"These results ___ similar to last year's results\"",
      "options": ["is", "are", "was"],
      "correct": "are",
      "explanation": "These results (רבים) → are.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_05",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_06",
      "question": "Choose: \"Please ___ your phones on silent during the talk\"",
      "options": ["keep", "keeps", "keeping"],
      "correct": "keep",
      "explanation": "Please + צורת בסיס → keep.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_06",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_07",
      "question": "Choose: \"This was the ___ debate we have hosted\"",
      "options": ["large", "larger", "largest"],
      "correct": "largest",
      "explanation": "the + superlative.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_07",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_08",
      "question": "Choose: \"We ___ already presented our group project\"",
      "options": ["have", "has", "had"],
      "correct": "have",
      "explanation": "We → have ב-present perfect.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_08",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_09",
      "question": "Choose: \"The mentors ___ the prototypes overnight\"",
      "options": ["test", "tests", "tested"],
      "correct": "tested",
      "explanation": "פעולה שהושלמה במסגרת זמן עבר.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_09",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_10",
      "question": "Choose: \"Neither the students nor the teacher ___ pleased yesterday\"",
      "options": ["was", "were", "is"],
      "correct": "was",
      "explanation": "קרבה אל the teacher (יחיד) → was.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_10",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_11",
      "question": "Choose: \"Few districts ___ the flood maps yet\"",
      "options": ["publish", "publishes", "have published"],
      "correct": "have published",
      "explanation": "yet → Present Perfect מתאים במסע הנרטיב.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_11",
      "subtype": "phase29_g6_standard"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_std_12",
      "question": "Choose: \"Both sketches ___ on recycled paper\"",
      "options": ["is", "are", "was"],
      "correct": "are",
      "explanation": "Both sketches רבים → are.",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_std_12",
      "subtype": "phase29_g6_standard"
    }
  ],
  "phase29_g6_advanced": [
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_01",
      "question": "Choose: \"Had we left earlier, we ___ the storm\"",
      "options": ["miss", "would miss", "would have missed"],
      "correct": "would have missed",
      "explanation": "Inverted conditional בעבר → would have missed.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_01",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_02",
      "question": "Choose: \"The speech ___ to every class before Friday\"",
      "options": ["deliver", "was delivered", "delivers"],
      "correct": "was delivered",
      "explanation": "ציווי סביל בעבר → was delivered.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_02",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_03",
      "question": "Choose: \"She denied ___ the window open\"",
      "options": ["leave", "to leave", "leaving"],
      "correct": "leaving",
      "explanation": "deny + gerund.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_03",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_04",
      "question": "Choose: \"Not only ___ the guide arrive early, but she also mapped two exits\"",
      "options": ["did", "does", "has"],
      "correct": "did",
      "explanation": "היפוך אחרי Not only בעבר → did.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_04",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_05",
      "question": "Choose: \"He practises the cello as though it ___ second nature\"",
      "options": ["is", "were", "was"],
      "correct": "were",
      "explanation": "as though + were לדימוי לא ריאלי.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_05",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_06",
      "question": "Choose: \"Provided that the data ___ accurate, we publish the chart\"",
      "options": ["is", "are", "were"],
      "correct": "is",
      "explanation": "data כיחיד מקובל תקני → is.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_06",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_07",
      "question": "Choose: \"Little ___ they know that the lab had reopened\"",
      "options": ["did", "do", "does"],
      "correct": "did",
      "explanation": "היפוך אחרי Little בעבר → did.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_07",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_08",
      "question": "Choose: \"The mural, along with two sketches, ___ outside Room 4\"",
      "options": ["hang", "hangs", "hanging"],
      "correct": "hangs",
      "explanation": "along with לא משנה את יחידות הנושא → hangs.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_08",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_09",
      "question": "Choose: \"She would rather ___ quietly than argue online\"",
      "options": ["read", "to read", "reading"],
      "correct": "read",
      "explanation": "would rather + מושב בסיס.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_09",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_10",
      "question": "Choose: \"No sooner ___ the curtain risen than the hall applauded\"",
      "options": ["had", "has", "did"],
      "correct": "had",
      "explanation": "No sooner had ... than - Had auxiliary.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_10",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_11",
      "question": "Choose: \"It is essential that she ___ a helmet during the climb\"",
      "options": ["wear", "wears", "wore"],
      "correct": "wear",
      "explanation": "essential that + בסיס (סגנון סוביוונקטיבי).",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_11",
      "subtype": "phase29_g6_advanced"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "phase29_g6_adv_12",
      "question": "Choose: \"Seldom ___ a cleaner ocean seemed so urgent\"",
      "options": ["did", "does", "has"],
      "correct": "did",
      "explanation": "היפוך אחרי Seldom בעבר → did.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": ["grammar_error", "grammar_pattern_error", "careless_error"],
      "skillId": "phase29_g6_adv_12",
      "subtype": "phase29_g6_advanced"
    }
  ]
};

for (const [poolKey, rows] of Object.entries(GRAMMAR_POOLS_PHASE_B)) {
  if (!GRAMMAR_POOLS[poolKey]) GRAMMAR_POOLS[poolKey] = [];
  GRAMMAR_POOLS[poolKey].push(...rows);
}

enrichEnglishGrammarPools(GRAMMAR_POOLS);

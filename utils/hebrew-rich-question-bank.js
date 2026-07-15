import { itemAllowedForGrade, itemAllowedForLevel } from "./grade-gating.js";
import { enrichHebrewRichPoolRows } from "./hebrew-rich-diagnostic-metadata-enrich.js";
import { enrichHebrewRichPoolWithCanonicalMetadata } from "../lib/learning/hebrew-canonical-metadata.js";
import * as g1LiteracyMod from "../data/hebrew-literacy-g1/literacy-pool-builder.js";
import * as g2LiteracyMod from "../data/hebrew-literacy-g2/literacy-pool-builder.js";
import * as g3LiteracyMod from "../data/hebrew-literacy-g3/literacy-pool-builder.js";
import * as g4LiteracyMod from "../data/hebrew-literacy-g4/literacy-pool-builder.js";
import * as g5LiteracyMod from "../data/hebrew-literacy-g5/literacy-pool-builder.js";
import * as g6LiteracyMod from "../data/hebrew-literacy-g6/literacy-pool-builder.js";
import { resolveModuleExport } from "./resolve-module-export.js";

const HEBREW_G1_LITERACY_POOL = resolveModuleExport(g1LiteracyMod, "HEBREW_G1_LITERACY_POOL");
const HEBREW_G2_LITERACY_POOL = resolveModuleExport(g2LiteracyMod, "HEBREW_G2_LITERACY_POOL");
const HEBREW_G3_LITERACY_POOL = resolveModuleExport(g3LiteracyMod, "HEBREW_G3_LITERACY_POOL");
const HEBREW_G4_LITERACY_POOL = resolveModuleExport(g4LiteracyMod, "HEBREW_G4_LITERACY_POOL");
const HEBREW_G5_LITERACY_POOL = resolveModuleExport(g5LiteracyMod, "HEBREW_G5_LITERACY_POOL");
const HEBREW_G6_LITERACY_POOL = resolveModuleExport(g6LiteracyMod, "HEBREW_G6_LITERACY_POOL");

/**
 * בנק שאלות עברית מובנה — משלים את המאגר הקלאסי.
 * כל פריט: נושא, band כיתה (early/mid/late), רמות, משפחת תבנית.
 */

/** @type {Array<Record<string, unknown>>} */
// Metadata enrichment (safe pass): difficulty, cognitiveLevel, expectedErrorTypes, prerequisiteSkillIds (confidence/taxonomy-gated). See reports/question-metadata-qa/hebrew-rich-metadata-apply-report.json.
export const HEBREW_RICH_POOL = [
  {
    "topic": "comprehension",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "easy"
    ],
    "patternFamily": "passage_explicit",
    "subtype": "detail",
    "distractorFamily": "wrong_detail",
    "diagnosticSkillId": "he_comp_explicit_detail",
    "probePower": "medium",
    "expectedErrorTags": [
      "detail_recall_error",
      "comprehension_gap"
    ],
    "question": "כיתה ג׳ - קראו: 'דני שם את הספר בתיק לפני שיצא לבית הספר.' מה עשה דני לפני היציאה?",
    "answers": [
      "שם את הספר בתיק",
      "קנה ספר חדש",
      "שכח את התיק בבית",
      "קרא את הספר בדרך"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "detail_recall_error",
      "comprehension_gap",
      "reading_comprehension_error"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "easy"
    ],
    "patternFamily": "passage_explicit",
    "subtype": "detail",
    "distractorFamily": "wrong_detail",
    "diagnosticSkillId": "he_comp_explicit_detail",
    "probePower": "medium",
    "expectedErrorTags": [
      "detail_recall_error",
      "comprehension_gap"
    ],
    "question": "כיתה ד׳ - לפי המשפט: 'דני שם את הספר בתיק לפני שיצא לבית הספר.' מה עשה דני לפני היציאה?",
    "answers": [
      "שם את הספר בתיק",
      "קנה ספר חדש",
      "שכח את התיק בבית",
      "קרא את הספר בדרך"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "detail_recall_error",
      "comprehension_gap",
      "reading_comprehension_error"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "passage_inference",
    "subtype": "implied",
    "distractorFamily": "plausible_inference",
    "diagnosticSkillId": "he_comp_inference_intro",
    "probePower": "medium",
    "expectedErrorTags": [
      "inference_error",
      "comprehension_gap"
    ],
    "question": "כיתה ג׳ - קראו: 'מיכל חיפשה את המפתחות בכל הבית, ובסוף מצאה אותם בכיס המעיל.' מה ניתן להסיק?",
    "answers": [
      "המפתחות לא היו במקום שציפתה למצוא בהתחלה",
      "מיכל איבדה את המעיל",
      "המפתחות נשארו בבית הספר",
      "מיכל לא יצאה מהבית"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "inference_error",
      "comprehension_gap",
      "reading_comprehension_error"
    ],
    "prerequisiteSkillIds": [
      "he_comp_explicit_detail"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "passage_inference",
    "subtype": "implied",
    "distractorFamily": "plausible_inference",
    "diagnosticSkillId": "he_comp_inference_intro",
    "probePower": "medium",
    "expectedErrorTags": [
      "inference_error",
      "comprehension_gap"
    ],
    "question": "כיתה ד׳ - קראו: 'מיכל חיפשה את המפתחות בכל הבית, ובסוף מצאה אותם בכיס המעיל.' מה ההסקה הסבירה ביותר?",
    "answers": [
      "המפתחות לא היו במקום שציפתה למצוא בהתחלה",
      "מיכל איבדה את המעיל",
      "המפתחות נשארו בבית הספר",
      "מיכל לא יצאה מהבית"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "inference_error",
      "comprehension_gap",
      "reading_comprehension_error"
    ],
    "prerequisiteSkillIds": [
      "he_comp_explicit_detail"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "sequence",
    "subtype": "order",
    "distractorFamily": "order_confusion",
    "diagnosticSkillId": "he_comp_sequence_events",
    "probePower": "medium",
    "expectedErrorTags": [
      "sequence_error",
      "comprehension_gap"
    ],
    "question": "סדר האירועים: (א) שתינו מים (ב) רצו במסלול (ג) התחממו. מה הסדר ההגיוני לפני ריצה?",
    "answers": [
      "א → ג → ב",
      "ב → א → ג",
      "ג → ב → א",
      "ב → ג → א"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "sequence_error",
      "comprehension_gap",
      "reading_comprehension_error"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "reference",
    "subtype": "pronoun",
    "distractorFamily": "wrong_antecedent",
    "question": "קראו: 'רוני נתן לנועה את המחברת כי היא ביקשה.' למי שייכת המילה 'היא'?",
    "answers": [
      "לנועה",
      "לרוני",
      "למחברת",
      "למורה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "main_idea",
    "subtype": "summary",
    "distractorFamily": "detail_vs_gist",
    "question": "קראו: 'הצמחים בגינה זקוקים למים ולאור כדי לגדול; ללא טיפול הם מצהיבים.' מה רעיון מרכזי?",
    "answers": [
      "טיפול מתאים (מים ואור) חיוני לצמיחה",
      "כל הצמחים אדומים",
      "הגינה נמצאת רק בחורף",
      "אין צורך בהשקיה"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "medium"
    ],
    "patternFamily": "cause_effect",
    "subtype": "because",
    "distractorFamily": "reversed_cause",
    "question": "כיתה ג׳ - קראו: 'בגלל הגשם הכבד ביטלו את הטיול.' מה הסיבה לביטול?",
    "answers": [
      "גשם כבד",
      "חום גבוה",
      "חג בית הספר",
      "המורה חולה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "medium"
    ],
    "patternFamily": "cause_effect",
    "subtype": "because",
    "distractorFamily": "reversed_cause",
    "question": "כיתה ד׳ - בגלל מה בוטל הטיול לפי המשפט: 'בגלל הגשם הכבד ביטלו את הטיול'?",
    "answers": [
      "גשם כבד",
      "חום גבוה",
      "חג בית הספר",
      "המורה חולה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "compare_statements",
    "subtype": "contrast",
    "distractorFamily": "partial_truth",
    "question": "קראו: 'יונתן קורא הרבה; ניר משחק כדורסל מדי יום.' מה משפט נכון בהשוואה?",
    "answers": [
      "לניר יש פעילות גופנית יומיומית יותר בולטת מזו של יונתן בטקסט",
      "שניהם לא קוראים",
      "יונתן משחק כדורסל מדי יום",
      "ניר לא עושה ספורט"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "completion",
    "subtype": "context_clue",
    "distractorFamily": "semantic_near",
    "question": "כיתה ג׳ - השלמה: 'השמיים אפורים ויש רוח - כנראה ש___.' מה האפשרות ההגיונית ביותר?",
    "answers": [
      "עומד לרדת גשם",
      "נלך לבריכה",
      "נאכל גלידה",
      "נישן בחוץ"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "completion",
    "subtype": "context_clue",
    "distractorFamily": "semantic_near",
    "question": "כיתה ד׳ - המשפט: 'השמיים אפורים ויש רוח - כנראה ש___.' השלמה הטובה ביותר:",
    "answers": [
      "עומד לרדת גשם",
      "נלך לבריכה",
      "נאכל גלידה",
      "נישן בחוץ"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 1,
    "maxGrade": 1,
    "levels": [
      "easy"
    ],
    "patternFamily": "binary_fact_early_g1",
    "subtype": "tf_science_simple",
    "distractorFamily": "polar",
    "optionCount": 4,
    "binary": false,
    "question": "בלילה בהיר - מה נכון לגבי מה שרואים בשמיים?",
    "answers": [
      "רואים בעיקר את הירח ולא את השמש",
      "רואים בעיקר את השמש כמו ביום",
      "אי אפשר לראות כלום בלילה",
      "רואים רק כוכבים בלי ירח"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 2,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "binary_fact_early_g2",
    "subtype": "where_from_sentence",
    "distractorFamily": "wrong_place",
    "optionCount": 4,
    "binary": false,
    "question": "לפי המשפט ׳הילדים משחקים בחצר׳ - איפה מתרחשת הפעולה לפי הטקסט?",
    "answers": [
      "בחצר",
      "בכיתה",
      "בספרייה",
      "במקרר"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "medium"
    ],
    "patternFamily": "binary_fact_mid_grammar",
    "subtype": "tf",
    "distractorFamily": "polar",
    "optionCount": 2,
    "binary": true,
    "question": "כיתה ג׳ - האם המשפט נכון? 'הפועל מתאר פעולה או מצב.'",
    "answers": [
      "נכון",
      "לא נכון"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "medium"
    ],
    "patternFamily": "binary_fact_mid_grammar",
    "subtype": "tf",
    "distractorFamily": "polar",
    "optionCount": 2,
    "binary": true,
    "question": "כיתה ד׳ - האם נכון לומר: 'הפועל מתאר פעולה או מצב'?",
    "answers": [
      "נכון",
      "לא נכון"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 1,
    "maxGrade": 1,
    "levels": [
      "easy"
    ],
    "patternFamily": "gender_number_early_g1",
    "subtype": "agreement_girl_singular",
    "distractorFamily": "agreement_error",
    "question": "הילדה הקטנה ___ על הספסל ומחייכת.",
    "answers": [
      "יושבת",
      "יושבים",
      "יושב",
      "יושבות"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 2,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "gender_number_early_g2",
    "subtype": "agreement_boy_plural",
    "distractorFamily": "agreement_error",
    "question": "הילדים הגבוהים ___ סביב השולחן.",
    "answers": [
      "יושבים",
      "יושב",
      "יושבת",
      "יושבות"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "gender_number",
    "subtype": "plural",
    "distractorFamily": "agreement_error",
    "question": "כיתה ג׳ - איזו צורה נכונה? 'הספרים ___ על המדף.'",
    "answers": [
      "מונחים",
      "מונח",
      "מונחת",
      "מונחה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "gender_number",
    "subtype": "plural",
    "distractorFamily": "agreement_error",
    "question": "כיתה ד׳ - השלימו את הצורה הנכונה: 'הספרים ___ על המדף.'",
    "answers": [
      "מונחים",
      "מונח",
      "מונחת",
      "מונחה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "tense_shift",
    "subtype": "past_present",
    "distractorFamily": "tense_mismatch",
    "question": "בחרו את המשפט התקין דקדוקית: אתמול הם ___ לספרייה.",
    "answers": [
      "הלכו",
      "הולכים",
      "ילכו",
      "הולך"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "sentence_correction",
    "subtype": "choose_correct",
    "distractorFamily": "common_mistake",
    "question": "איזה משפט נכון?",
    "answers": [
      "אני לא יודע את התשובה",
      "אני לא יודעים את התשובה",
      "אני לא יודעת את התשובה הם",
      "אנחנו לא יודע את התשובה"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 3,
    "maxGrade": 3,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "prep_choice",
    "subtype": "collocation",
    "distractorFamily": "wrong_prep",
    "question": "כיתה ג׳ - השלימו: 'דיברנו ___ הפרויקט.'",
    "answers": [
      "על",
      "ב",
      "ל",
      "מ"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "minGrade": 4,
    "maxGrade": 4,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "prep_choice",
    "subtype": "collocation",
    "distractorFamily": "wrong_prep",
    "question": "כיתה ד׳ - בחרו מילת יחס מתאימה: 'דיברנו ___ הפרויקט.'",
    "answers": [
      "על",
      "ב",
      "ל",
      "מ"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "transform",
    "subtype": "negation",
    "distractorFamily": "negation_error",
    "question": "בחרו ניסוח נכון עם שלילה: 'הוא יכול להגיע.'",
    "answers": [
      "הוא לא יכול להגיע",
      "הוא יכול לא להגיע הוא",
      "לא הוא יכול להגיע",
      "הוא יכול להגיע לא"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "mid",
    "levels": [
      "easy"
    ],
    "patternFamily": "part_of_speech",
    "subtype": "verb_noun",
    "distractorFamily": "pos_confusion",
    "question": "מה חלק הדיבר של 'רצים' במשפט 'הילדים רצים'?",
    "answers": [
      "פועל",
      "שם עצם",
      "תואר",
      "שם תואר"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "binary_grammar",
    "subtype": "tf",
    "optionCount": 2,
    "binary": true,
    "distractorFamily": "polar",
    "question": "האם נכון? 'במילים כמו \"ילדים\" ו\"ספרים\" מופיעה לרוב סיומת רבים טיפוסית.'",
    "answers": [
      "נכון",
      "לא נכון"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "mid",
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "synonym",
    "subtype": "near_meaning",
    "distractorFamily": "semantic_near",
    "question": "מילה קרובה במשמעות ל'מהיר' (בהקשר של ריצה):",
    "answers": [
      "זריז",
      "איטי",
      "כבד",
      "רחב"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "mid",
    "levels": [
      "medium"
    ],
    "patternFamily": "antonym",
    "subtype": "opposite",
    "distractorFamily": "wrong_opposite",
    "question": "ההפך המתאים ל'מאושר' בהקשר רגשי:",
    "answers": [
      "מעצוב",
      "עייף",
      "רעב",
      "גבוה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "context_fit",
    "subtype": "register",
    "distractorFamily": "register_mismatch",
    "question": "בחרו מילה הכי מתאימה לטקסט פורמלי: 'הוועדה ___ את ההחלטה.'",
    "answers": [
      "אישרה",
      "סידרה",
      "צבעה",
      "קפצה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "category_exclusion",
    "subtype": "odd_out",
    "distractorFamily": "same_category_trap",
    "question": "איזו מילה לא שייכת לאותה קטגוריה?",
    "answers": [
      "כיסא",
      "שולחן",
      "ארון",
      "רעב"
    ],
    "correct": 3,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "minGrade": 1,
    "maxGrade": 1,
    "levels": [
      "easy"
    ],
    "patternFamily": "word_context_early_g1",
    "subtype": "cloze_morning",
    "distractorFamily": "wrong_collocation",
    "question": "אני שותה ___ כשאני צמא אחרי האוכל.",
    "answers": [
      "מים",
      "נעליים",
      "כיסא",
      "ענן"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "minGrade": 2,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "word_context_early_g2",
    "subtype": "cloze_school",
    "distractorFamily": "wrong_collocation",
    "question": "השלימו בהקשר בית ספר: 'לפני השיעור שמתי את ה___ בתוך התיק.'",
    "answers": [
      "מחברת",
      "כפפה",
      "כרית",
      "מטריה"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "mid",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "precision",
    "subtype": "best_word",
    "distractorFamily": "near_synonym",
    "question": "מילה מדויקת ל'סוף סכסוך בהסכמה':",
    "answers": [
      "פשרה",
      "מריבה",
      "הפסקה",
      "הפסקת פעילות"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "reading",
    "minGrade": 1,
    "maxGrade": 1,
    "levels": [
      "easy"
    ],
    "patternFamily": "word_level_early_g1",
    "subtype": "spelling_meaning_then_choice",
    "distractorFamily": "orthography",
    "question": "מקום לגור בו עם דלת וחלונות - בחרו איות:",
    "answers": [
      "בית",
      "באת",
      "ביאת",
      "ביתת"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "reading",
    "minGrade": 2,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "word_level_early_g2",
    "subtype": "spelling_choice_niqqud",
    "distractorFamily": "orthography",
    "question": "כלי שכותבים בו שיעורים בבית הספר - איזו מילה מנוקדת נכונה?",
    "answers": [
      "מַחְבֶּרֶת",
      "מחבארת",
      "מחברט",
      "מחבורת"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "writing",
    "minGrade": 1,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "spell_word_early_ab_writing",
    "subtype": "object_riddle",
    "distractorFamily": "orthography",
    "question": "יש בו עופרת וכותבים איתו על הדף - בחרו איות לשם החפץ:",
    "answers": [
      "עיפרון",
      "איפרון",
      "עיפרנון",
      "חיפרון"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "writing",
    "minGrade": 1,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "spell_word_early_ab_writing",
    "subtype": "role_meaning",
    "distractorFamily": "orthography",
    "question": "מי מסבירה ליד הלוח ועוזרת ללמוד? בחרו איות למילה שמתארת את התפקיד:",
    "answers": [
      "מורה",
      "מורא",
      "מוורה",
      "מורי"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "vocabulary_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "reading",
    "gradeBand": "mid",
    "levels": [
      "medium"
    ],
    "patternFamily": "sentence_read",
    "subtype": "meaning",
    "distractorFamily": "paraphrase_wrong",
    "question": "קראו: 'הרוח נושבת חזק.' מה המשמעות?",
    "answers": [
      "יש רוח חזקה",
      "אין רוח בכלל",
      "יורד גשם חזק בלבד",
      "השמש זורחת חזק"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "writing",
    "gradeBand": "mid",
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "structured_completion",
    "subtype": "polite_phrase",
    "distractorFamily": "register",
    "question": "בחרו פתיחה מתאימה למכתב רשמי לעירייה:",
    "answers": [
      "להנהלת העירייה, שלום רב,",
      "היי מה נשמע,",
      "יאללה תקשיבו,",
      "סתם רציתי לומר,"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "writing",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "rephrase",
    "subtype": "clarity",
    "distractorFamily": "awkward",
    "question": "איזו גרסה ברורה ונכונה יותר?",
    "answers": [
      "ביקשתי מידע על מועד אחרון להגשה",
      "ביקשתי מידע על מועד אחרון הוא הגשה",
      "ביקשתי מידע על מועד אחרון וגשה",
      "ביקשתי מידע על מועד אחרון שהגשה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "writing",
    "gradeBand": "mid",
    "levels": [
      "medium"
    ],
    "patternFamily": "logic_completion",
    "subtype": "conclusion",
    "distractorFamily": "non_sequitur",
    "question": "המשפטים: 'התכוננו לבחן. למדנו שבוע שלם.' השלמה לוגית:",
    "answers": [
      "לכן הרגשנו מוכנים יותר",
      "לכן ביטלנו את הבחן",
      "לכן לא נגענו בחומר",
      "לכן ישנתם במבחן"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "speaking",
    "minGrade": 1,
    "maxGrade": 1,
    "levels": [
      "easy"
    ],
    "patternFamily": "social_reply_early_g1",
    "subtype": "bump_sorry",
    "distractorFamily": "wrong_register",
    "question": "מישהו אומר 'סליחה' אחרי שנתקל בך בטעות. מה עונים בנימוס?",
    "answers": [
      "אין בעד מה",
      "סע מפה",
      "שתוק",
      "לא אכפת לי בכלל"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "speaking",
    "minGrade": 2,
    "maxGrade": 2,
    "levels": [
      "easy",
      "medium"
    ],
    "patternFamily": "social_reply_early_g2",
    "subtype": "thanks_response",
    "distractorFamily": "wrong_register",
    "question": "מישהו אומר לך 'תודה רבה' אחרי שעזרת לו לאסוף עיפרון. מה עונים בנימוס?",
    "answers": [
      "בשמחה",
      "למה לי",
      "לא מעניין",
      "תשלם לי"
    ],
    "correct": 0,
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "speaking",
    "gradeBand": "mid",
    "levels": [
      "medium"
    ],
    "patternFamily": "social_reply_mid_help",
    "subtype": "request",
    "distractorFamily": "rude_vs_polite",
    "question": "מישהו מבקש עזרה עם שקית כבדה. מה עונה בצורה מכבדת?",
    "answers": [
      "בשמחה, אני אעזור",
      "זה לא העסק שלי",
      "למה אני",
      "תסתדר לבד"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "implicit_tone",
    "subtype": "attitude",
    "distractorFamily": "tone_confusion",
    "question": "קראו: 'הוא אמר את הדברים בקול רגוע, אבל ידיו רעדו קלות.' מה מרמז על מצבו הרגשי?",
    "answers": [
      "מתח פנימי למרות חיצוניות רגועה",
      "הוא שמח לחלוטין",
      "אין שום קשר בין גוף לדיבור",
      "הוא בטוח בעצמו לחלוטין"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "supporting_detail",
    "subtype": "evidence",
    "distractorFamily": "main_vs_detail",
    "question": "קראו: 'הפרויקט הצליח כי החבורה חילקה משימות והקפידה על לוח זמנים.' מה פרט תומך במסקנה?",
    "answers": [
      "חלוקת משימות והקפדה על לוח זמנים",
      "המילה \"פרויקט\" לבדה",
      "שהצלחה היא תמיד מקרית",
      "שאין צורך בתכנון"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "comprehension",
    "gradeBand": "mid",
    "levels": [
      "medium"
    ],
    "patternFamily": "analogy_reasoning",
    "subtype": "parallel",
    "distractorFamily": "weak_analogy",
    "question": "כמו שמפתח פותח דלת, כך ___ .",
    "answers": [
      "מילה מתאימה יכולה לפתוח הבנה בין אנשים",
      "דלת תמיד עשויה ממתכת",
      "מפתח תמיד גדול מדלת",
      "אין דמיון בין שפה לדלת"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "comprehension_gap"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "sentence_correction",
    "subtype": "sv_agreement_plural",
    "distractorFamily": "agreement_error",
    "question": "איזה משפט תקין?",
    "answers": [
      "הילדים אכלו את הארוחה",
      "הילדים אכל את הארוחה",
      "הילדים אכלה את הארוחה",
      "הילד אכלו את הארוחה"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "mid",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "morphology",
    "subtype": "binyan_fit",
    "distractorFamily": "verb_pattern_confusion",
    "question": "בחרו צורה מתאימה: 'הם ___ את השיר ביחד.'",
    "answers": [
      "שרו",
      "שר",
      "שרה",
      "ישר"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "grammar",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "verb_agreement",
    "subtype": "plural_subject",
    "distractorFamily": "agreement_error",
    "question": "איזה משפט תקין?",
    "answers": [
      "הם הלכו הביתה",
      "הם הלך הביתה",
      "הם הלכה הביתה",
      "הוא הלכו הביתה"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "grammar_error",
      "concept_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "late",
    "levels": [
      "hard"
    ],
    "patternFamily": "collocation",
    "subtype": "verb_noun_fit",
    "distractorFamily": "wrong_collocation",
    "question": "בחרו צירוף טבעי: 'ל___ החלטה.'",
    "answers": [
      "קבל",
      "שבור",
      "צבע",
      "רחף"
    ],
    "correct": 0,
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "vocabulary",
    "gradeBand": "mid",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "semantic_field",
    "subtype": "education_lexicon",
    "distractorFamily": "domain_shift",
    "question": "מילה השייכת לתחום בית הספר:",
    "answers": [
      "מחברת",
      "מזלג",
      "כביש",
      "ענן"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "vocabulary_confusion"
    ]
  },
  {
    "topic": "reading",
    "gradeBand": "late",
    "levels": [
      "medium",
      "hard"
    ],
    "patternFamily": "structural",
    "subtype": "paragraph_role",
    "distractorFamily": "function_confusion",
    "question": "פסקה שבה מובאים עובדות ומספרים ללא הבעת דעה - מה תפקידה העיקרי?",
    "answers": [
      "להציג מידע",
      "לספר בדיחה",
      "לשכנע בסיסמה פרסומת",
      "לכתוב שיר"
    ],
    "correct": 0,
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "reading_comprehension_error",
      "concept_confusion",
      "careless_error"
    ]
  },
  ...HEBREW_G1_LITERACY_POOL,
  ...HEBREW_G2_LITERACY_POOL,
  ...HEBREW_G3_LITERACY_POOL,
  ...HEBREW_G4_LITERACY_POOL,
  ...HEBREW_G5_LITERACY_POOL,
  ...HEBREW_G6_LITERACY_POOL,
];

// P0/P1 diagnostic metadata + level/grade eligibility (no stem/answer changes).
enrichHebrewRichPoolRows(HEBREW_RICH_POOL);
enrichHebrewRichPoolWithCanonicalMetadata(HEBREW_RICH_POOL);

export function filterRichHebrewPool(gradeKey, levelKey, topic) {
  const l = String(levelKey || "easy").toLowerCase();
  return HEBREW_RICH_POOL.filter(
    (row) =>
      row.topic === topic &&
      itemAllowedForGrade(row, gradeKey) &&
      itemAllowedForLevel(row, levelKey) &&
      Array.isArray(row.levels) &&
      row.levels.includes(l)
  );
}

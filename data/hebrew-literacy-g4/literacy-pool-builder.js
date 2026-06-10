/**
 * Hebrew G4 supplemental MCQ banks — Phase 5C (comprehension + reading) + Phase 5D (grammar + vocabulary).
 */
import {
  G4_COMP_EXPLICIT_EASY,
  G4_COMP_MAIN_EASY,
  G4_COMP_CAUSE_MEDIUM,
  G4_COMP_SEQUENCE_MEDIUM,
  G4_COMP_INFERENCE_MEDIUM,
  G4_COMP_PURPOSE_HARD,
  G4_COMP_INFERENCE_HARD,
  G4_COMP_SEQUENCE_HARD,
} from "./comprehension-banks.js";
import {
  G4_READ_PASSAGES_EASY,
  G4_READ_CONTEXT_EASY,
  G4_READ_PASSAGES_MEDIUM,
  G4_READ_STRUCTURE_MEDIUM,
  G4_READ_PASSAGES_HARD,
  G4_READ_STRUCTURE_HARD,
} from "./reading-banks.js";
import {
  HEBREW_G4_GRAMMAR_POOL,
  HEBREW_G4_VOCABULARY_POOL,
} from "./grammar-vocabulary-banks.js";

/**
 * @param {string} correct
 * @param {string[]} wrongPool
 * @param {number} seed
 */
function fourOptions(correct, wrongPool, seed) {
  const distractors = [];
  for (let i = 0; i < wrongPool.length && distractors.length < 3; i += 1) {
    const w = wrongPool[(seed + i) % wrongPool.length];
    if (w !== correct && !distractors.includes(w)) distractors.push(w);
  }
  while (distractors.length < 3) {
    distractors.push(`אפשרות${distractors.length + 1}`);
  }
  const answers = [correct, distractors[0], distractors[1], distractors[2]];
  const shift = seed % 4;
  const ordered = [
    answers[shift % 4],
    answers[(shift + 1) % 4],
    answers[(shift + 2) % 4],
    answers[(shift + 3) % 4],
  ];
  return { answers: ordered, correct: ordered.indexOf(correct) };
}

const G4_FEMALE_NAMES = new Set(["מיה", "שרה", "הילה", "תמר", "נועה", "מיכל", "הדר", "שיר", "יעל", "רוני"]);

/** @param {string} name */
function g4GenderForms(name) {
  const f = G4_FEMALE_NAMES.has(name);
  return {
    kept: f ? "שמרה" : "שמר",
    checked: f ? "בדקה" : "בדק",
    wrote: f ? "כתבה" : "כתב",
    read: f ? "קראה" : "קרא",
    broke: f ? "שברה" : "שבר",
    forgot: f ? "שכחה" : "שכח",
    dailyPrompt: (n) => (f ? `מה עשתה ${n} בכל יום?` : `מה עשה ${n} בכל יום?`),
    checkObj: (obj) => (f ? `בדקה שה${obj} מסודר` : `בדק שה${obj} מסודר`),
  };
}

const G4_NAMES = [
  "דני", "מיה", "נועם", "שרה", "איתי", "הילה", "רועי", "תמר", "יואב", "נועה",
  "אביב", "ליאור", "עומר", "מיכל", "אלי", "גיל", "הדר", "יונתן", "שיר", "אור",
  "יעל", "רוני", "אדם", "מאיה", "עידו", "ליה", "אורי", "ניצן", "גיא", "שקד",
];
const G4_PLACES = [
  "כיתה", "חצר", "ספרייה", "גינה", "מוזיאון", "בית", "פארק", "מטבח", "חדר", "מסדרון",
  "אולם", "מעבדה", "חדר אמנות", "חדר מוזיקה", "חדר מחשבים",
];
const G4_OBJECTS = [
  "ספר", "מחברת", "עט", "תיק", "כדור", "מעיל", "צמח", "מפתח", "מכתב", "פרויקט",
  "מילון", "מפה", "מיקרוסקופ", "יומן", "תיקייה",
];
const G4_DAY_WORDS = [
  "יום שני", "יום שלישי", "בבוקר", "אחר הצהריים", "בערב", "לפני ההפסקה",
  "אחרי השיעור", "בסוף השבוע", "בתחילת השבוע", "לפני היציאה",
  "אחרי הגשם", "בזמן הטיול", "לפני המבחן", "אחרי ההצגה", "בזמן ההפסקה",
];

/**
 * @param {object[]} baseItems
 * @param {string} topic
 * @param {string} patternFamily
 * @param {string} subtype
 * @param {string} level
 * @param {number} targetCount
 * @param {string} [defaultSubtopicId]
 */
function expandPool(baseItems, topic, patternFamily, subtype, level, targetCount, defaultSubtopicId) {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (let i = 0; i < targetCount; i += 1) {
    const item = baseItems[i % baseItems.length];
    const seed = i + topic.length * 11 + level.length * 7 + patternFamily.length;
    let question;
    if (item.passage && item.prompt) {
      const detail = G4_DAY_WORDS[i % G4_DAY_WORDS.length];
      question = `קרא את הטקסט: '${item.passage} ${detail}.' ${item.prompt}`;
    } else if (item.question) {
      question = item.question;
      if (i >= baseItems.length) {
        const ctx = G4_PLACES[i % G4_PLACES.length];
        question = item.question.replace(/\?$/, ` ב${ctx}?`);
      }
    } else {
      question = `כיתה ד׳ — ${topic} · ${i + 1}`;
    }
    const answer = item.answer;
    const wrong = [...(item.wrong || [])];
    if (i >= baseItems.length && wrong.length > 1) {
      wrong.push(wrong.shift());
    }
    const { answers, correct } = fourOptions(answer, wrong, seed);
    out.push({
      topic,
      minGrade: 4,
      maxGrade: 4,
      levels: [level],
      patternFamily,
      subtype: `${subtype}_${i + 1}`,
      subtopicId: item.subtopicId || defaultSubtopicId,
      question,
      answers,
      correct,
    });
  }
  return out;
}

/**
 * @param {number} count
 * @param {"comprehension"|"reading"} topic
 * @param {string} level
 * @param {string} patternFamily
 * @param {string} subtype
 * @param {string} subtopicId
 */
function generateUniquePassageItems(count, topic, level, patternFamily, subtype, subtopicId) {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  const templates = [
    (name, obj, place, g, when) => ({
      passage: `${name} ${g.kept} על ${obj} ב${place}. ${when} ${name} ${g.checked} שהכל מסודר ומוכן לשימוש.`,
      prompt: g.dailyPrompt(name),
      answer: g.checkObj(obj),
      wrong: [`${g.broke} את ${obj}`, `${g.forgot} את ${obj}`, `החליף${G4_FEMALE_NAMES.has(name) ? "ה" : ""} את ${obj}`],
    }),
    (name, obj, place, g, when) => ({
      passage: `לפני השיעור ${name} ${g.read} ב${obj} ו${g.wrote} רשימת מילים חשובות. ${when} הרא${G4_FEMALE_NAMES.has(name) ? "תה" : "ה"} למורה את העבודה.`,
      prompt: `מה עש${G4_FEMALE_NAMES.has(name) ? "תה" : "ה"} ${name} לפני השיעור?`,
      answer: `קרא${G4_FEMALE_NAMES.has(name) ? "ה" : ""} ב${obj} וכתב${G4_FEMALE_NAMES.has(name) ? "ה" : ""} רשימה`,
      wrong: ["ישן בכיתה", "זרק את התיק", "שכח לבוא לשיעור"],
    }),
    (name, obj, place, g, when) => {
      const f = G4_FEMALE_NAMES.has(name);
      return {
        passage: `בקבוצת הלימוד ${name} ${f ? "הסבירה" : "הסביר"} לחברים איך לארגן את ${obj}. ${when} כולם סיימו את המשימה בזמן.`,
        prompt: f ? "מה תרמה לקבוצה?" : "מה תרם לקבוצה?",
        answer: f ? "הסבירה איך לארגן את החומר" : "הסביר איך לארגן את החומר",
        wrong: f
          ? ["גרמה לעיכוב", "סירבה לעזור", "מחקה את העבודה"]
          : ["גרם לעיכוב", "סירב לעזור", "מחק את העבודה"],
      };
    },
    (name, obj, place, g, when) => ({
      passage: `${name} ${G4_FEMALE_NAMES.has(name) ? "הכינה" : "הכין"} מצגת על ${obj} ב${place}. ${when} ${G4_FEMALE_NAMES.has(name) ? "הציגה" : "הציג"} בפני הכיתה בביטחון.`,
      prompt: "על מה הייתה המצגת?",
      answer: `על ${obj}`,
      wrong: ["על משחק מחשב", "על נעליים בלבד", "על שינה בכיתה"],
    }),
    (name, obj, place, g, when) => {
      const f = G4_FEMALE_NAMES.has(name);
      return {
        passage: `אחרי הטיול ${name} ${f ? "סיכמה" : "סיכם"} ב${obj} שלוש עובדות חשובות. ${when} ${f ? "שיתפה" : "שיתף"} אותן עם המורה.`,
        prompt: f ? `מה עשתה ${name} אחרי הטיול?` : `מה עשה ${name} אחרי הטיול?`,
        answer: f ? "סיכמה עובדות חשובות" : "סיכם עובדות חשובות",
        wrong: f ? ["שכחה הכל", "זרקה את המחברת", "לא השתתפה"] : ["שכח הכל", "זרק את המחברת", "לא השתתף"],
      };
    },
  ];
  for (let i = 0; i < count; i += 1) {
    const name = G4_NAMES[i % G4_NAMES.length];
    const place = G4_PLACES[(i * 2) % G4_PLACES.length];
    const obj = G4_OBJECTS[(i * 3) % G4_OBJECTS.length];
    const g = g4GenderForms(name);
    const when = G4_DAY_WORDS[i % G4_DAY_WORDS.length];
    const build = templates[i % templates.length];
    const built = build(name, obj, place, g, when);
    const seed = i + topic.length + name.length + obj.length + when.length;
    const { answers, correct } = fourOptions(built.answer, built.wrong, seed);
    out.push({
      topic,
      minGrade: 4,
      maxGrade: 4,
      levels: [level],
      patternFamily,
      subtype: `${subtype}_gen_${i + 1}`,
      subtopicId,
      question: `קרא את הטקסט: '${built.passage}' ${built.prompt}`,
      answers,
      correct,
    });
  }
  return out;
}

function buildG4ComprehensionPool() {
  const easyBases = [...G4_COMP_EXPLICIT_EASY, ...G4_COMP_MAIN_EASY];
  const mediumBases = [...G4_COMP_CAUSE_MEDIUM, ...G4_COMP_SEQUENCE_MEDIUM, ...G4_COMP_INFERENCE_MEDIUM];
  const hardBases = [...G4_COMP_PURPOSE_HARD, ...G4_COMP_INFERENCE_HARD, ...G4_COMP_SEQUENCE_HARD];

  const easy = [
    ...expandPool(easyBases, "comprehension", "g4_explicit_detail", "comp_easy", "easy", 35, "g4.summary_intro"),
    ...generateUniquePassageItems(25, "comprehension", "easy", "g4_explicit_gen", "comp_gen", "g4.summary_intro"),
  ];
  const medium = [
    ...expandPool(mediumBases, "comprehension", "g4_cause_sequence", "comp_med", "medium", 30, "g4.text_structure"),
    ...generateUniquePassageItems(15, "comprehension", "medium", "g4_infer_med", "comp_med_gen", "g4.summary_intro"),
  ];
  const hard = [
    ...expandPool(hardBases, "comprehension", "g4_purpose_infer", "comp_hard", "hard", 25, "g4.text_structure"),
    ...generateUniquePassageItems(12, "comprehension", "hard", "g4_infer_hard", "comp_hard_gen", "g4.summary_intro"),
  ];
  return [...easy, ...medium, ...hard];
}

function buildG4ReadingPool() {
  const easyBases = [...G4_READ_PASSAGES_EASY, ...G4_READ_CONTEXT_EASY];
  const mediumBases = [...G4_READ_PASSAGES_MEDIUM, ...G4_READ_STRUCTURE_MEDIUM];
  const hardBases = [...G4_READ_PASSAGES_HARD, ...G4_READ_STRUCTURE_HARD];

  const easy = [
    ...expandPool(easyBases, "reading", "g4_read_main", "read_easy", "easy", 35, "g4.genre_mix"),
    ...generateUniquePassageItems(25, "reading", "easy", "g4_read_gen", "read_gen", "g4.genre_mix"),
  ];
  const medium = [
    ...expandPool(mediumBases, "reading", "g4_read_medium", "read_med", "medium", 30, "g4.info_lit_intro"),
    ...generateUniquePassageItems(15, "reading", "medium", "g4_read_med_gen", "read_med_gen", "g4.genre_mix"),
  ];
  const hard = [
    ...expandPool(hardBases, "reading", "g4_read_hard", "read_hard", "hard", 25, "g4.info_lit_intro"),
    ...generateUniquePassageItems(12, "reading", "hard", "g4_read_hard_gen", "read_hard_gen", "g4.text_structure"),
  ];
  return [...easy, ...medium, ...hard];
}

export const HEBREW_G4_LITERACY_POOL = [
  ...buildG4ComprehensionPool(),
  ...buildG4ReadingPool(),
  ...HEBREW_G4_GRAMMAR_POOL,
  ...HEBREW_G4_VOCABULARY_POOL,
];

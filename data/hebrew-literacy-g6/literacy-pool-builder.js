/**
 * Hebrew G6 supplemental MCQ banks — Phase 5G (comprehension + reading) + 5H (grammar + vocabulary).
 */
import {
  G6_COMP_EXPLICIT_EASY,
  G6_COMP_MAIN_EASY,
  G6_COMP_CAUSE_MEDIUM,
  G6_COMP_SEQUENCE_MEDIUM,
  G6_COMP_INFERENCE_MEDIUM,
  G6_COMP_COMPARE_MEDIUM,
  G6_COMP_PURPOSE_HARD,
  G6_COMP_INFERENCE_HARD,
  G6_COMP_EVIDENCE_HARD,
  G6_COMP_PERSPECTIVE_HARD,
  G6_COMP_SEQUENCE_HARD,
} from "./comprehension-banks.js";
import {
  G6_READ_PASSAGES_EASY,
  G6_READ_CONTEXT_EASY,
  G6_READ_PASSAGES_MEDIUM,
  G6_READ_STRUCTURE_MEDIUM,
  G6_READ_FACT_OPINION_MEDIUM,
  G6_READ_PASSAGES_HARD,
  G6_READ_STRUCTURE_HARD,
  G6_READ_ARGUMENT_HARD,
  G6_READ_GENRE_COMPARE_HARD,
} from "./reading-banks.js";
import {
  HEBREW_G6_GRAMMAR_POOL,
  HEBREW_G6_VOCABULARY_POOL,
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

const G6_FEMALE_NAMES = new Set([
  "מיה", "שרה", "הילה", "תמר", "נועה", "מיכל", "הדר", "שיר", "יעל", "רוני",
  "מאיה", "ליה", "ניצן", "שקד", "עדן", "גל", "אלה", "אלמה",
]);

/** @param {string} name */
function g6GenderForms(name) {
  const f = G6_FEMALE_NAMES.has(name);
  return {
    kept: f ? "שמרה" : "שמר",
    checked: f ? "בדקה" : "בדק",
    wrote: f ? "כתבה" : "כתב",
    read: f ? "קראה" : "קרא",
    broke: f ? "שברה" : "שבר",
    forgot: f ? "שכחה" : "שכח",
    explained: f ? "הסבירה" : "הסביר",
    summarized: f ? "סיכמה" : "סיכם",
    dailyPrompt: (n) => (f ? `מה עשתה ${n} בכל יום?` : `מה עשה ${n} בכל יום?`),
    checkObj: (obj) => (f ? `בדקה שה${obj} מסודר` : `בדק שה${obj} מסודר`),
  };
}

const G6_NAMES = [
  "דני", "מיה", "נועם", "שרה", "איתי", "הילה", "רועי", "תמר", "יואב", "נועה",
  "אביב", "ליאור", "עומר", "מיכל", "אלי", "גיל", "הדר", "יונתן", "שיר", "אור",
  "יעל", "רוני", "אדם", "מאיה", "עידו", "ליה", "אורי", "ניצן", "גיא", "שקד",
  "עדן", "גל", "אלה", "נריה", "יובל", "אופק", "איתמר", "אלמה", "ליאון", "דנה",
];
const G6_PLACES = [
  "כיתה", "חצר", "ספרייה", "גינה", "מוזיאון", "בית", "פארק", "מטבח", "חדר", "מסדרון",
  "אולם", "מעבדה", "חדר אמנות", "חדר מחשבים", "קהילה", "שכונה", "עיר", "מרכז מדע", "ועדת דיון",
];
const G6_OBJECTS = [
  "ספר", "מחברת", "עט", "תיק", "כדור", "מעיל", "צמח", "מפתח", "מכתב", "פרויקט",
  "מילון", "מפה", "מיקרוסקופ", "יומן", "תיקייה", "עיתון", "מאמר", "מצגת", "כתבה", "ראיון",
];
const G6_DAY_WORDS = [
  "יום שני", "יום שלישי", "בבוקר", "אחר הצהריים", "בערב", "לפני ההפסקה",
  "אחרי השיעור", "בסוף השבוע", "בתחילת השבוע", "לפני היציאה",
  "אחרי הגשם", "בזמן הטיול", "לפני המבחן", "אחרי ההצגה", "בזמן ההפסקה",
  "במהלך הדיון", "לפני ההרצאה", "אחרי הפעילות", "בזמן העבודה", "בסוף היום",
];

/** @param {object[]} baseItems @param {string} topic @param {string} patternFamily @param {string} subtype @param {string} level @param {number} targetCount @param {string} [defaultSubtopicId] */
function expandPool(baseItems, topic, patternFamily, subtype, level, targetCount, defaultSubtopicId) {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (let i = 0; i < targetCount; i += 1) {
    const item = baseItems[i % baseItems.length];
    const seed = i + topic.length * 11 + level.length * 7 + patternFamily.length;
    let question;
    if (item.passage && item.prompt) {
      const detail = G6_DAY_WORDS[i % G6_DAY_WORDS.length];
      question = `קרא את הטקסט: '${item.passage} ${detail}.' ${item.prompt}`;
    } else if (item.question) {
      question = item.question;
      if (i >= baseItems.length) {
        const ctx = G6_PLACES[i % G6_PLACES.length];
        question = item.question.replace(/\?$/, ` ב${ctx}?`);
      }
    } else {
      question = `כיתה ו׳ — ${topic}`;
    }
    const answer = item.answer;
    const wrong = [...(item.wrong || [])];
    if (i >= baseItems.length && wrong.length > 1) {
      wrong.push(wrong.shift());
    }
    const { answers, correct } = fourOptions(answer, wrong, seed);
    out.push({
      topic,
      minGrade: 6,
      maxGrade: 6,
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
      wrong: [
        `${g.broke} את ${obj} בלי סיבה`,
        `${g.forgot} את ${obj} בבית`,
        `החליף${G6_FEMALE_NAMES.has(name) ? "ה" : ""} את ${obj} בלי לשאול`,
      ],
    }),
    (name, obj, place, g, when) => ({
      passage: `לפני השיעור ${name} ${g.read} ב${obj} ו${g.wrote} רשימת מילים חשובות. ${when} ${g.explained} למורה את העבודה.`,
      prompt: `מה עש${G6_FEMALE_NAMES.has(name) ? "תה" : "ה"} ${name} לפני השיעור?`,
      answer: `קרא${G6_FEMALE_NAMES.has(name) ? "ה" : ""} ב${obj} וכתב${G6_FEMALE_NAMES.has(name) ? "ה" : ""} רשימת מילים`,
      wrong: ["ישן בכיתה במקום ללמוד", "זרק את התיק לפח", "שכח לבוא לשיעור לגמרי"],
    }),
    (name, obj, place, g, when) => {
      const f = G6_FEMALE_NAMES.has(name);
      return {
        passage: `בקבוצת הלימוד ${name} ${f ? "הסבירה" : "הסביר"} לחברים איך לארגן את ${obj}. ${when} כולם סיימו את המשימה בזמן.`,
        prompt: f ? "מה תרמה לקבוצה?" : "מה תרם לקבוצה?",
        answer: f ? "הסבירה איך לארגן את החומר בצורה ברורה" : "הסביר איך לארגן את החומר בצורה ברורה",
        wrong: f
          ? ["גרמה לעיכוב של כל הקבוצה", "סירבה לעזור לחברים", "מחקה את העבודה של אחרים"]
          : ["גרם לעיכוב של כל הקבוצה", "סירב לעזור לחברים", "מחק את העבודה של אחרים"],
      };
    },
    (name, obj, place, g, when) => ({
      passage: `${name} ${G6_FEMALE_NAMES.has(name) ? "הכינה" : "הכין"} מצגת על ${obj} ב${place}. ${when} ${G6_FEMALE_NAMES.has(name) ? "הציגה" : "הציג"} בפני הכיתה בביטחון.`,
      prompt: "על מה הייתה המצגת?",
      answer: `על ${obj} ועל מה שלמדו ב${place}`,
      wrong: ["על משחק מחשב בלבד", "על נעליים ואופנה", "על שינה בכיתה בזמן השיעור"],
    }),
    (name, obj, place, g, when) => {
      const f = G6_FEMALE_NAMES.has(name);
      return {
        passage: `אחרי הטיול ${name} ${g.summarized} ב${obj} שלוש עובדות חשובות. ${when} ${f ? "שיתפה" : "שיתף"} אותן עם המורה.`,
        prompt: f ? `מה עשתה ${name} אחרי הטיול?` : `מה עשה ${name} אחרי הטיול?`,
        answer: f ? "סיכמה שלוש עובדות חשובות מהטיול" : "סיכם שלוש עובדות חשובות מהטיול",
        wrong: f ? ["שכחה את כל מה שראתה", "זרקה את המחברת לפח", "לא השתתפה בפעילות"] : ["שכח את כל מה שראה", "זרק את המחברת לפח", "לא השתתף בפעילות"],
      };
    },
  ];
  for (let i = 0; i < count; i += 1) {
    const name = G6_NAMES[i % G6_NAMES.length];
    const place = G6_PLACES[(i * 2) % G6_PLACES.length];
    const obj = G6_OBJECTS[(i * 3) % G6_OBJECTS.length];
    const g = g6GenderForms(name);
    const when = G6_DAY_WORDS[i % G6_DAY_WORDS.length];
    const build = templates[i % templates.length];
    const built = build(name, obj, place, g, when);
    const seed = i + topic.length + name.length + obj.length + when.length;
    const { answers, correct } = fourOptions(built.answer, built.wrong, seed);
    out.push({
      topic,
      minGrade: 6,
      maxGrade: 6,
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

function buildG6ComprehensionPool() {
  const easyBases = [...G6_COMP_EXPLICIT_EASY, ...G6_COMP_MAIN_EASY];
  const mediumBases = [
    ...G6_COMP_CAUSE_MEDIUM,
    ...G6_COMP_SEQUENCE_MEDIUM,
    ...G6_COMP_INFERENCE_MEDIUM,
    ...G6_COMP_COMPARE_MEDIUM,
  ];
  const hardBases = [
    ...G6_COMP_PURPOSE_HARD,
    ...G6_COMP_INFERENCE_HARD,
    ...G6_COMP_EVIDENCE_HARD,
    ...G6_COMP_PERSPECTIVE_HARD,
    ...G6_COMP_SEQUENCE_HARD,
  ];

  const easy = [
    ...expandPool(easyBases, "comprehension", "g6_explicit_detail", "comp_easy", "easy", 35, "g6.evidence_from_text"),
    ...generateUniquePassageItems(25, "comprehension", "easy", "g6_explicit_gen", "comp_gen", "g6.evidence_from_text"),
  ];
  const medium = [
    ...expandPool(mediumBases, "comprehension", "g6_cause_infer", "comp_med", "medium", 30, "g6.evidence_from_text"),
    ...generateUniquePassageItems(15, "comprehension", "medium", "g6_infer_med", "comp_med_gen", "g6.critical_evaluation_light"),
  ];
  const hard = [
    ...expandPool(hardBases, "comprehension", "g6_purpose_evidence", "comp_hard", "hard", 25, "g6.critical_evaluation_light"),
    ...generateUniquePassageItems(12, "comprehension", "hard", "g6_infer_hard", "comp_hard_gen", "g6.critical_evaluation_light"),
  ];
  return [...easy, ...medium, ...hard];
}

function buildG6ReadingPool() {
  const easyBases = [...G6_READ_PASSAGES_EASY, ...G6_READ_CONTEXT_EASY];
  const mediumBases = [
    ...G6_READ_PASSAGES_MEDIUM,
    ...G6_READ_STRUCTURE_MEDIUM,
    ...G6_READ_FACT_OPINION_MEDIUM,
  ];
  const hardBases = [
    ...G6_READ_PASSAGES_HARD,
    ...G6_READ_STRUCTURE_HARD,
    ...G6_READ_ARGUMENT_HARD,
    ...G6_READ_GENRE_COMPARE_HARD,
  ];

  const easy = [
    ...expandPool(easyBases, "reading", "g6_read_main", "read_easy", "easy", 35, "g6.complex_text_analysis"),
    ...generateUniquePassageItems(25, "reading", "easy", "g6_read_gen", "read_gen", "g6.complex_text_analysis"),
  ];
  const medium = [
    ...expandPool(mediumBases, "reading", "g6_read_medium", "read_med", "medium", 30, "g6.complex_text_analysis"),
    ...generateUniquePassageItems(15, "reading", "medium", "g6_read_med_gen", "read_med_gen", "g6.complex_text_analysis"),
  ];
  const hard = [
    ...expandPool(hardBases, "reading", "g6_read_hard", "read_hard", "hard", 25, "g6.compare_genres"),
    ...generateUniquePassageItems(12, "reading", "hard", "g6_read_hard_gen", "read_hard_gen", "g6.compare_genres"),
  ];
  return [...easy, ...medium, ...hard];
}

export const HEBREW_G6_LITERACY_POOL = [
  ...buildG6ComprehensionPool(),
  ...buildG6ReadingPool(),
  ...HEBREW_G6_GRAMMAR_POOL,
  ...HEBREW_G6_VOCABULARY_POOL,
];

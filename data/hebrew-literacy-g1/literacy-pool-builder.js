/**
 * Hebrew G1 supplemental literacy MCQ banks — aligned to book batch A sequence.
 */
import { HEBREW_G1_GAP_POOL } from "./gap-fill-banks.js";

/**
 * patternFamily: literacy_letters | literacy_sounds | literacy_syllables |
 * literacy_niqqud | literacy_sound_letter_match | literacy_simple_words
 */

const LETTER_POOL = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
];

/** @type {Array<{ word: string, first: string, last: string, repeat?: string, syllables: number, niqqud?: string, startSound?: string }>} */
const G1_WORDS = [
  { word: "בית", first: "ב", last: "ת", syllables: 1, niqqud: "בַּיִת", startSound: "ב" },
  { word: "כלב", first: "כ", last: "ב", syllables: 1, niqqud: "כֶּלֶב", startSound: "כ" },
  { word: "שמש", first: "ש", last: "ש", repeat: "ש", syllables: 1, niqqud: "שֶׁמֶשׁ", startSound: "ש" },
  { word: "אמא", first: "א", last: "א", repeat: "א", syllables: 2, niqqud: "אִמָּא", startSound: "א" },
  { word: "אבא", first: "א", last: "א", repeat: "א", syllables: 2, niqqud: "אַבָּא", startSound: "א" },
  { word: "ילד", first: "י", last: "ד", syllables: 1, niqqud: "יֶלֶד", startSound: "י" },
  { word: "ספר", first: "ס", last: "ר", syllables: 1, niqqud: "סֵפֶר", startSound: "ס" },
  { word: "תפוח", first: "ת", last: "ח", syllables: 2, niqqud: "תַּפּוּחַ", startSound: "ת" },
  { word: "כיסא", first: "כ", last: "א", syllables: 2, niqqud: "כִּסֵּא", startSound: "כ" },
  { word: "מים", first: "מ", last: "ם", repeat: "מ", syllables: 1, niqqud: "מַיִם", startSound: "מ" },
  { word: "שולחן", first: "ש", last: "ן", syllables: 2, niqqud: "שֻׁלְחָן", startSound: "ש" },
  { word: "עץ", first: "ע", last: "ץ", syllables: 1, niqqud: "עֵץ", startSound: "ע" },
  { word: "יונה", first: "י", last: "ה", syllables: 2, niqqud: "יוֹנָה", startSound: "י" },
  { word: "כתב", first: "כ", last: "ב", syllables: 1, niqqud: "כָּתַב", startSound: "כ" },
  { word: "גן", first: "ג", last: "ן", syllables: 1, niqqud: "גַּן", startSound: "ג" },
  { word: "דג", first: "ד", last: "ג", syllables: 1, niqqud: "דָּג", startSound: "ד" },
  { word: "ארנב", first: "א", last: "ב", syllables: 2, niqqud: "אַרְנָב", startSound: "א" },
  { word: "פרח", first: "פ", last: "ח", syllables: 1, niqqud: "פֶּרַח", startSound: "פ" },
  { word: "שלום", first: "ש", last: "ם", syllables: 2, niqqud: "שָׁלוֹם", startSound: "ש" },
  { word: "כדור", first: "כ", last: "ר", syllables: 2, niqqud: "כַּדּוּר", startSound: "כ" },
  { word: "ענן", first: "ע", last: "ן", syllables: 2, niqqud: "עָנָן", startSound: "ע" },
  { word: "חתול", first: "ח", last: "ל", syllables: 2, niqqud: "חָתוּל", startSound: "ח" },
  { word: "פרה", first: "פ", last: "ה", syllables: 1, niqqud: "פָּרָה", startSound: "פ" },
  { word: "עפר", first: "ע", last: "ר", syllables: 1, niqqud: "עָפָר", startSound: "ע" },
  { word: "נר", first: "נ", last: "ר", syllables: 1, niqqud: "נֵר", startSound: "נ" },
  { word: "יד", first: "י", last: "ד", syllables: 1, niqqud: "יָד", startSound: "י" },
  { word: "רגל", first: "ר", last: "ל", syllables: 1, niqqud: "רֶגֶל", startSound: "ר" },
  { word: "פה", first: "פ", last: "ה", syllables: 1, niqqud: "פֶּה", startSound: "פ" },
  { word: "אוזן", first: "א", last: "ן", syllables: 2, niqqud: "אֹזֶן", startSound: "א" },
  { word: "עין", first: "ע", last: "ן", syllables: 1, niqqud: "עַיִן", startSound: "ע" },
  { word: "סבא", first: "ס", last: "א", syllables: 2, niqqud: "סָבָא", startSound: "ס" },
  { word: "גמל", first: "ג", last: "ל", syllables: 1, niqqud: "גָּמָל", startSound: "ג" },
  { word: "טוב", first: "ט", last: "ב", syllables: 1, niqqud: "טוֹב", startSound: "ט" },
  { word: "לילה", first: "ל", last: "ה", syllables: 2, niqqud: "לַיְלָה", startSound: "ל" },
  { word: "שמיים", first: "ש", last: "ם", syllables: 2, niqqud: "שָׁמַיִם", startSound: "ש" },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G1_COMP_EASY = [
  { question: "בחר מילה להשלמה: דני שותה ___.", answer: "מים", wrong: ["חלב", "מיץ", "תה"] },
  { question: "בחר מילה להשלמה: הילדה ___ ספר.", answer: "קוראת", wrong: ["כותבת", "מציירת", "רצה"] },
  { question: "בחר מילה להשלמה: הכלב רץ ___.", answer: "בגינה", wrong: ["בבית", "ברחוב", "בכיתה"] },
  { question: "מי מכין אוכל בבית?", answer: "אמא", wrong: ["אבא", "ילד", "סבא"] },
  { question: "בחר מילה להשלמה: התלמיד שם את ה___.", answer: "תיק", wrong: ["ספר", "כובע", "עט"] },
  { question: "בחר מילה להשלמה: החתול ישן ___.", answer: "על המיטה", wrong: ["על הרצפה", "בחצר", "במטבח"] },
  { question: "בחר מילה להשלמה: הילד אוכל ___.", answer: "תפוח", wrong: ["לחם", "בננה", "עוגה"] },
  { question: "בחר מילה להשלמה: השמש זורחת ___.", answer: "בבוקר", wrong: ["בלילה", "בצהריים", "בערב"] },
  { question: "בחר מילה להשלמה: הדג שוחה ___.", answer: "במים", wrong: ["באוויר", "בחול", "בעץ"] },
  { question: "בחר מילה להשלמה: התינוק ___.", answer: "ישן", wrong: ["אוכל", "צוחק", "משחק"] },
  { question: "בחר מילה להשלמה: הפרח גדל ___.", answer: "בגינה", wrong: ["בבית", "בכיתה", "במטבח"] },
  { question: "בחר מילה להשלמה: האח ___.", answer: "שותק", wrong: ["צועק", "רץ", "שוחה"] },
  { question: "בחר מילה להשלמה: הספר נמצא ___.", answer: "על השולחן", wrong: ["בתיק", "במיטה", "בחצר"] },
  { question: "בחר מילה להשלמה: הילדה שותה ___.", answer: "חלב", wrong: ["מים", "מיץ", "שוקו"] },
  { question: "איזה צבע מתאים לענן?", answer: "לבן", wrong: ["שחור", "אדום", "כחול"] },
  { question: "איזו צורה מתאימה לכדור?", answer: "עגול", wrong: ["מרובע", "משולש", "ארוך"] },
  { question: "איזה צבע מתאים לתפוח?", answer: "אדום", wrong: ["כחול", "ירוק", "שחור"] },
  { question: "בחר מילה להשלמה: הילד הולך ___.", answer: "לבית הספר", wrong: ["לחנות", "לים", "לגן"] },
  { question: "בחר מילה: העץ בגן הוא ___ .", answer: "גבוה", wrong: ["נמוך", "קטן", "רך"] },
  { question: "איזה צבע מתאים לחתול?", answer: "שחור", wrong: ["לבן", "אדום", "צהוב"] },
  { question: "בחר מילה להשלמה: הילד משחק ___.", answer: "בחצר", wrong: ["בכיתה", "בים", "במטבח"] },
  { question: "מה מחפשים בחנות ספרים?", answer: "ספר", wrong: ["כדור", "עט", "תיק"] },
  { question: "בחר מילה להשלמה: האחות הקטנה ___.", answer: "ישנה", wrong: ["אוכלת", "קופצת", "צוחקת"] },
  { question: "בחר מילה: הכלב רץ ו___ .", answer: "שמח", wrong: ["עצוב", "עייף", "כועס"] },
  { question: "בחר מילה: הדלת בחדר ___ .", answer: "פתוחה", wrong: ["סגורה", "שבורה", "כבדה"] },
  { question: "בחר מילה להשלמה: המורה ___.", answer: "מדברת", wrong: ["ישנה", "רצה", "שוחה"] },
  { question: "בחר מילה להשלמה: התלמיד ___.", answer: "כותב", wrong: ["קורא", "מצייר", "שוחה"] },
  { question: "בחר מילה להשלמה: הפרפר ___.", answer: "עף", wrong: ["שוחה", "רץ", "ישן"] },
  { question: "בחר מילה להשלמה: הגשם ___.", answer: "יורד", wrong: ["עולה", "נעלם", "צוחק"] },
  { question: "בחר מילה להשלמה: האור ___.", answer: "כבה", wrong: ["נדלק", "גדל", "נשבר"] },
  { question: "בחר מילה להשלמה: התינוק ___.", answer: "בוכה", wrong: ["צוחק", "ישן", "משחק"] },
  { question: "איזה צבע מתאים לעלה?", answer: "ירוק", wrong: ["אדום", "שחור", "לבן"] },
  { question: "איזה צבע מתאים לשמיים?", answer: "כחולים", wrong: ["אדומים", "ירוקים", "שחורים"] },
  { question: "בחר מילה להשלמה: אבא קורא ___.", answer: "עיתון", wrong: ["ספר", "מחברת", "מפה"] },
  { question: "בחר מילה להשלמה: אמא שורהת ___.", answer: "פירות", wrong: ["בגדים", "ספרים", "כיסאות"] },
  { question: "בחר מילה להשלמה: הילד שותה ___.", answer: "חלב", wrong: ["מים", "מיץ", "שוקו"] },
  { question: "בחר מילה להשלמה: החתולה ___.", answer: "שותקת", wrong: ["נובחת", "צוחקת", "רצה"] },
  { question: "איך נראית כיתה מסודרת?", answer: "נקייה", wrong: ["מלוכלכת", "ריקה", "חשוכה"] },
  { question: "בחר מילה: השולחן בכיתה ___ .", answer: "גדול", wrong: ["קטן", "שבור", "רטוב"] },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G1_COMP_MEDIUM = [
  { question: "למה רון יצא מהבית?", answer: "אחרי שסידר את הספר", wrong: ["לפני שסידר את הספר", "בלי תיק", "בלי נעליים"] },
  { question: "מתי שוטפים ידיים לפני אוכל?", answer: "לפני האוכל", wrong: ["אחרי האוכל", "רק בערב", "רק בחגים"] },
  { question: "למה בוחרים כלב נאמן?", answer: "כי הוא נאמן", wrong: ["כי הוא גדול", "כי הוא שחור", "כי הוא רץ מהר"] },
  { question: "למה ילדה מחייכת אחרי מתנה?", answer: "כי שמחה", wrong: ["כי עייפה", "כי גשם ירד", "כי אבד ספר"] },
  { question: "למה סוגרים דלת כשקר?", answer: "כדי לשמור על חום", wrong: ["כדי לקרר", "כדי לשמוע מוזיקה", "כדי לפתוח חלון"] },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G1_COMP_HARD = [
  { question: "מה עושים כשלא מוצאים עט בכיתה?", answer: "שואלים את המורה", wrong: ["בוכים", "יוצאים החוצה", "זורקים תיק"] },
  { question: "למה תלמידים שותקים כשמורה מבקשת?", answer: "כי מקשיבים", wrong: ["כי יוצאים להפסקה", "כי יורד גשם", "כי נגמר היום"] },
  { question: "איך אוכלים דבש בצורה נכונה?", answer: "מעט בכל פעם", wrong: ["הרבה מאוד", "רק בלילה", "בלי לטעום"] },
];

/**
 * @param {string} correct
 * @param {string[]} pool
 * @param {number} seed
 * @returns {string[]}
 */
function fourLetterOptions(correct, pool, seed) {
  const distractors = [];
  for (let i = 0; i < pool.length && distractors.length < 3; i += 1) {
    const letter = pool[(seed + i * 3) % pool.length];
    if (letter !== correct && !distractors.includes(letter)) distractors.push(letter);
  }
  while (distractors.length < 3) {
    const letter = LETTER_POOL[(seed + distractors.length * 5) % LETTER_POOL.length];
    if (letter !== correct && !distractors.includes(letter)) distractors.push(letter);
  }
  const answers = [correct, distractors[0], distractors[1], distractors[2]];
  const shift = seed % 4;
  return [answers[shift % 4], answers[(shift + 1) % 4], answers[(shift + 2) % 4], answers[(shift + 3) % 4]];
}

/**
 * @param {string} correct
 * @param {string[]} wrongPool
 * @param {number} seed
 * @returns {{ answers: string[], correct: number }}
 */
function fourWordOptions(correct, wrongPool, seed) {
  const distractors = [];
  for (let i = 0; i < wrongPool.length && distractors.length < 3; i += 1) {
    const w = wrongPool[(seed + i) % wrongPool.length];
    if (w !== correct && !distractors.includes(w)) distractors.push(w);
  }
  while (distractors.length < 3) {
    distractors.push(`${correct}${distractors.length + 1}`);
  }
  const answers = [correct, distractors[0], distractors[1], distractors[2]];
  const correctIdx = seed % 4;
  const ordered = [
    answers[correctIdx % 4],
    answers[(correctIdx + 1) % 4],
    answers[(correctIdx + 2) % 4],
    answers[(correctIdx + 3) % 4],
  ];
  const correctPos = ordered.indexOf(correct);
  return { answers: ordered, correct: correctPos >= 0 ? correctPos : 0 };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
function row(rowDef) {
  return rowDef;
}

function buildG1ReadingPool() {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  let idx = 0;

  for (const item of G1_WORDS) {
    const seed = idx++;
    const firstOpts = fourLetterOptions(item.first, LETTER_POOL, seed);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: seed % 3 === 0 ? ["easy", "medium"] : ["easy"],
        patternFamily: "literacy_letters",
        subtype: "first_letter",
        question: `מה האות הראשונה במילה '${item.word}'?`,
        answers: firstOpts,
        correct: firstOpts.indexOf(item.first),
      })
    );

    const seed2 = idx++;
    const lastOpts = fourLetterOptions(item.last, LETTER_POOL, seed2);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: seed2 % 4 === 0 ? ["medium"] : ["easy"],
        patternFamily: "literacy_letters",
        subtype: "last_letter",
        question: `מה האות האחרונה במילה '${item.word}'?`,
        answers: lastOpts,
        correct: lastOpts.indexOf(item.last),
      })
    );
  }

  for (let i = 0; i < G1_WORDS.length; i += 1) {
    const item = G1_WORDS[i];
    if (!item.repeat) continue;
    const seed = idx++;
    const opts = fourLetterOptions(item.repeat, LETTER_POOL, seed);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy", "medium"],
        patternFamily: "literacy_sounds",
        subtype: "repeated_phoneme",
        question: `במילה '${item.word}' - איזה צליל חוזר פעמיים?`,
        answers: opts,
        correct: opts.indexOf(item.repeat),
      })
    );
  }

  const syllableItems = [
    { word: "אמא", count: "2" },
    { word: "אבא", count: "2" },
    { word: "כיתה", count: "2" },
    { word: "שולחן", count: "2" },
    { word: "בית", count: "1" },
    { word: "כלב", count: "1" },
    { word: "יונה", count: "2" },
    { word: "ארנב", count: "2" },
    { word: "תפוח", count: "2" },
    { word: "שלום", count: "2" },
    { word: "מים", count: "1" },
    { word: "דג", count: "1" },
    { word: "גן", count: "1" },
    { word: "עץ", count: "1" },
    { word: "כיסא", count: "2" },
  ];
  for (let i = 0; i < syllableItems.length; i += 1) {
    const { word, count } = syllableItems[i];
    const seed = idx++;
    const answers = ["1", "2", "3", "4"];
    const shift = seed % 4;
    const ordered = [answers[shift % 4], answers[(shift + 1) % 4], answers[(shift + 2) % 4], answers[(shift + 3) % 4]];
    const correctIdx = ordered.indexOf(count);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: i % 2 === 0 ? ["easy"] : ["easy", "medium"],
        patternFamily: "literacy_syllables",
        subtype: "count",
        question: `כמה הברות יש במילה '${word}'?`,
        answers: ordered,
        correct: correctIdx,
        correctAnswer: count,
      })
    );
  }

  for (let i = 0; i < G1_WORDS.length; i += 1) {
    const item = G1_WORDS[i];
    if (!item.niqqud) continue;
    const seed = idx++;
    const wrong = G1_WORDS.filter((w) => w.word !== item.word).map((w) => w.word);
    const { answers, correct } = fourWordOptions(item.word, wrong, seed);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy", "medium", "hard"],
        patternFamily: "literacy_niqqud",
        subtype: "read_niqqud",
        question: `קרא את המילה המנוקדת: '${item.niqqud}'`,
        answers,
        correct,
      })
    );
  }

  for (let i = 0; i < G1_WORDS.length; i += 1) {
    const item = G1_WORDS[i];
    if (!item.startSound) continue;
    const seed = idx++;
    const opts = fourLetterOptions(item.startSound, LETTER_POOL, seed);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: seed % 3 === 0 ? ["medium", "hard"] : ["easy"],
        patternFamily: "literacy_sound_letter_match",
        subtype: "word_start_sound",
        question: `במילה '${item.word}' - באיזה צליל המילה מתחילה?`,
        answers: opts,
        correct: opts.indexOf(item.startSound),
      })
    );
  }

  for (let i = 0; i < G1_WORDS.length; i += 1) {
    const item = G1_WORDS[i];
    const seed = idx++;
    const wrong = G1_WORDS.filter((w) => w.word !== item.word).map((w) => w.word);
    const { answers, correct } = fourWordOptions(item.word, wrong, seed);
    out.push(
      row({
        topic: "reading",
        minGrade: 1,
        maxGrade: 1,
        levels: i % 5 === 0 ? ["medium", "hard"] : ["easy"],
        patternFamily: "literacy_simple_words",
        subtype: "read_word",
        question: `קרא את המילה: '${item.word}'`,
        answers,
        correct,
      })
    );
  }

  return out;
}

function buildG1ComprehensionPool() {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  let idx = 0;

  for (const item of G1_COMP_EASY) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.answer, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy"],
        patternFamily: "literacy_simple_words",
        subtype: "one_sentence_who_what",
        question: item.question,
        answers,
        correct,
      })
    );
  }

  const compEasyMore = [
    { question: "בחר מילה להשלמה: הילד מחזיק ___.", answer: "כדור", wrong: ["ספר", "עט", "תיק"] },
    { question: "איזו חיה אוהבת לטפל בה בבית?", answer: "חתול", wrong: ["כלב", "דג", "סוס"] },
    { question: "בחר מילה להשלמה: הילדה אוהבת ___.", answer: "פרחים", wrong: ["אבנים", "מכוניות", "עפר"] },
    { question: "בחר מילה להשלמה: אבא נוהג ___.", answer: "למקום העבודה", wrong: ["לים", "לגן", "לחנות"] },
    { question: "איך יושבים בכיתה מסודרת?", answer: "בשורות", wrong: ["בים", "בשמיים", "מתחת לשולחן"] },
    { question: "בחר מילה להשלמה: הכלבה ___.", answer: "שותקת", wrong: ["נובחת", "רצה", "שוחה"] },
    { question: "מה יכול לכסות את השמש?", answer: "הענן", wrong: ["הירח", "הגשם", "הרוח"] },
    { question: "בחר מילה להשלמה: הילד ___.", answer: "מחייך", wrong: ["בוכה", "ישן", "כועס"] },
    { question: "בחר מילה להשלמה: האחות הקטנה ___.", answer: "משחקת", wrong: ["ישנה", "כותבת", "שוחה"] },
    { question: "בחר מילה להשלמה: הסוס ___.", answer: "רץ", wrong: ["עף", "שוחה", "ישן"] },
  ];
  for (const item of compEasyMore) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.answer, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: ["medium"],
        patternFamily: "literacy_simple_words",
        subtype: "one_sentence_detail",
        question: item.question,
        answers,
        correct,
      })
    );
  }

  for (const item of G1_COMP_MEDIUM) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.answer, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: ["medium"],
        patternFamily: "literacy_simple_words",
        subtype: "light_inference",
        question: item.question,
        answers,
        correct,
      })
    );
  }

  const compHardMore = [
    { question: "למה שמחים אחרי שמוצאים מחברת?", answer: "כי מצאו אותה", wrong: ["כי אבד ספר", "כי ירד גשם", "כי נגמר שיעור"] },
    { question: "מה עושים אחרי שטיפת ידיים?", answer: "יושבים לאכול", wrong: ["יוצאים לחצר", "קוראים ספר", "נכנסים לישון"] },
    { question: "למה שומרים סוד?", answer: "כי הבטיחו", wrong: ["כי שכחו", "כי רוצים לספר", "כי לא שמעו"] },
    { question: "למה צמח נובל?", answer: "כי לא השקו אותו", wrong: ["כי ירד גשם", "כי זרחה שמש", "כי היה קר"] },
    { question: "למה עוזרים לנקות כיתה?", answer: "כי אוהבים אותה", wrong: ["כי מבקשים מתנה", "כי יורד שלג", "כי נגמר בית ספר"] },
    { question: "האם כלב שלא אכל בבוקר רעב?", answer: "כן", wrong: ["לא", "אולי", "לא יודעים"] },
  ];
  for (const item of compHardMore) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.answer, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: ["hard"],
        patternFamily: "literacy_simple_words",
        subtype: "light_sequence",
        question: item.question,
        answers,
        correct,
      })
    );
  }

  for (const item of G1_COMP_HARD) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.answer, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: ["hard"],
        patternFamily: "literacy_simple_words",
        subtype: "sequence_light",
        question: item.question,
        answers,
        correct,
      })
    );
  }

  const tfItems = [
    { sentence: "השמש זורחת ביום.", statement: "השמש זורחת ביום.", truth: "נכון", wrong: ["לא נכון", "לא יודעים", "אולי"] },
    { sentence: "הדגים עפים בשמיים.", statement: "הדגים עפים בשמיים.", truth: "לא נכון", wrong: ["נכון", "לפעמים", "תמיד"] },
    { sentence: "הילד שותה מים.", statement: "הילד שותה מים.", truth: "נכון", wrong: ["לא נכון", "לא יודעים", "אולי"] },
    { sentence: "העץ גדל מתחת למים.", statement: "העץ גדל מתחת למים.", truth: "לא נכון", wrong: ["נכון", "לפעמים", "תמיד"] },
    { sentence: "החתול אוהב חלב.", statement: "החתול אוהב חלב.", truth: "נכון", wrong: ["לא נכון", "לא יודעים", "אולי"] },
    { sentence: "הכדור מרובע.", statement: "הכדור מרובע.", truth: "לא נכון", wrong: ["נכון", "לפעמים", "תמיד"] },
    { sentence: "התפוח הוא פרי.", statement: "התפוח הוא פרי.", truth: "נכון", wrong: ["לא נכון", "לא יודעים", "אולי"] },
    { sentence: "הירח זורח ביום.", statement: "הירח זורח ביום.", truth: "לא נכון", wrong: ["נכון", "לפעמים", "תמיד"] },
    { sentence: "הילדה קוראת ספר.", statement: "הילדה קוראת ספר.", truth: "נכון", wrong: ["לא נכון", "לא יודעים", "אולי"] },
    { sentence: "הדבש מלוח.", statement: "הדבש מלוח.", truth: "לא נכון", wrong: ["נכון", "לפעמים", "תמיד"] },
  ];
  for (let i = 0; i < tfItems.length; i += 1) {
    const item = tfItems[i];
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.truth, item.wrong, seed);
    out.push(
      row({
        topic: "comprehension",
        minGrade: 1,
        maxGrade: 1,
        levels: i % 2 === 0 ? ["easy"] : ["easy", "medium"],
        patternFamily: "literacy_simple_words",
        subtype: "binary_fact",
        question: `האם המשפט '${item.statement}' נכון?`,
        answers,
        correct,
      })
    );
  }

  return out;
}

function buildG1GrammarPool() {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  let idx = 0;

  const genderItems = [
    { q: "איזו מילה מציינת ילדה?", a: "הילדה", w: ["שמחה", "הילד", "הכלב"] },
    { q: "איזו מילה מציינת ילד?", a: "הילד", w: ["רץ", "הילדה", "הפרח"] },
    { q: "איזו מילה מציינת מורה נקבה?", a: "המורה", w: ["אמרה", "אמר", "התלמיד"] },
    { q: "איזו מילה מציינת תלמיד?", a: "התלמיד", w: ["כתב", "התלמידה", "הספר"] },
    { q: "איזו מילה מציינת סבתא?", a: "הסבתא", w: ["בישלה", "הסבא", "האוכל"] },
    { q: "איזו מילה מציינת אח?", a: "האח", w: ["גדול", "האחות", "הבית"] },
    { q: "איזו מילה מציינת פרה?", a: "הפרה", w: ["חולה", "השור", "השדה"] },
    { q: "איזו מילה מציינת שועל?", a: "השועל", w: ["חכם", "השועלת", "היער"] },
  ];
  for (const item of genderItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.a, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy"],
        patternFamily: "literacy_simple_words",
        subtype: "gender_light",
        question: item.q,
        answers,
        correct,
      })
    );
  }

  const pluralItems = [
    { q: "מה רבים של 'ילד'?", a: "ילדים", w: ["ילדות", "ילדה", "ילד"] },
    { q: "מה רבים של 'ספר'?", a: "ספרים", w: ["ספרות", "ספר", "ספרה"] },
    { q: "מה רבים של 'כיסא'?", a: "כיסאות", w: ["כיסא", "כיסאי", "כיסאה"] },
    { q: "מה רבים של 'פרח'?", a: "פרחים", w: ["פרחות", "פרח", "פרחה"] },
    { q: "מה רבים של 'כלב'?", a: "כלבים", w: ["כלבות", "כלב", "כלבה"] },
    { q: "מה רבים של 'תפוח'?", a: "תפוחים", w: ["תפוחות", "תפוח", "תפוחה"] },
  ];
  for (const item of pluralItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.a, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy", "medium"],
        patternFamily: "literacy_simple_words",
        subtype: "plural_light",
        question: item.q,
        answers,
        correct,
      })
    );
  }

  const orderItems = [
    { parts: ["אני", "אוכל", "תפוח"], correct: "אני אוכל תפוח", wrong: ["אוכל אני תפוח", "תפוח אני אוכל", "אוכל תפוח אני"] },
    { parts: ["הילד", "קורא", "ספר"], correct: "הילד קורא ספר", wrong: ["קורא הילד ספר", "ספר קורא הילד", "קורא ספר הילד"] },
    { parts: ["אמא", "מכינה", "אוכל"], correct: "אמא מכינה אוכל", wrong: ["מכינה אמא אוכל", "אוכל מכינה אמא", "מכינה אוכל אמא"] },
    { parts: ["החתול", "ישן", "בבית"], correct: "החתול ישן בבית", wrong: ["ישן החתול בבית", "בבית ישן החתול", "ישן בבית החתול"] },
    { parts: ["הילדה", "שותה", "מים"], correct: "הילדה שותה מים", wrong: ["שותה הילדה מים", "מים שותה הילדה", "שותה מים הילדה"] },
  ];
  for (const item of orderItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.correct, item.wrong, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["medium"],
        patternFamily: "literacy_simple_words",
        subtype: "word_order",
        question: `איזה משפט נכון מן המילים: ${item.parts.join(", ")}?`,
        answers,
        correct,
      })
    );
  }

  const punctItems = [
    { sentence: "מה בסוף משפט שאלה", a: "?", w: [".", "!", ","] },
    { sentence: "מה בסוף משפט רגיל", a: ".", w: ["?", "!", ","] },
    { sentence: "מה בסוף משפט התלהבות", a: "!", w: [".", "?", ","] },
    { sentence: "מה מפריד בין מילים ברשימה", a: ",", w: [".", "?", "!"] },
  ];
  for (const item of punctItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.a, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy", "hard"],
        patternFamily: "literacy_simple_words",
        subtype: "punctuation_light",
        question: item.sentence,
        answers,
        correct,
      })
    );
  }

  const articleItems = [
    { q: "איזו מילה היא 'שם'?", a: "בית", w: ["יפה", "רץ", "במהר"] },
    { q: "איזו מילה היא 'פועל'?", a: "הולך", w: ["ילד", "גדול", "בבית"] },
    { q: "איזו מילה היא 'שם תואר'?", a: "חכם", w: ["ספר", "כותב", "מחר"] },
    { q: "איזו מילה היא 'מילת קישור'?", a: "ו", w: ["בית", "רץ", "יפה"] },
    { q: "במשפט 'הילד הקטן' - מה תפקיד 'הקטן'?", a: "מתאר את הילד", w: ["שם הילד", "פועל", "מקום"] },
    { q: "במשפט 'אני אוכל' - מה תפקיד 'אוכל'?", a: "פועל", w: ["שם", "צבע", "מספר"] },
  ];
  for (const item of articleItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.a, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy"],
        patternFamily: "literacy_simple_words",
        subtype: "pos_light",
        question: item.q,
        answers,
        correct,
      })
    );
  }

  const clozeItems = [
    { q: "הילד ___ ספר.", a: "קורא", w: ["אוכל", "ישן", "שוחה"] },
    { q: "הילדה ___ מים.", a: "שותה", w: ["כותבת", "רצה", "צוחקת"] },
    { q: "הכלב ___ בגינה.", a: "רץ", w: ["קורא", "ישן", "שוחה"] },
    { q: "אמא ___ אוכל.", a: "מכינה", w: ["שותה", "רצה", "קופצת"] },
    { q: "התלמיד ___ במחברת.", a: "כותב", w: ["שוחה", "ישן", "שותה"] },
    { q: "החתול ___ על המיטה.", a: "ישן", w: ["רץ", "שוחה", "קופץ"] },
    { q: "השמש ___ בבוקר.", a: "זורחת", w: ["יורדת", "שוחה", "כותבת"] },
    { q: "הגשם ___ מהשמיים.", a: "יורד", w: ["עולה", "רץ", "צוחק"] },
    { q: "התינוק ___ בשקט.", a: "ישן", w: ["רץ", "כותב", "קופץ"] },
    { q: "האבא ___ עיתון.", a: "קורא", w: ["שוחה", "רץ", "ישן"] },
    { q: "בחר מילה להשלמה: בבית יש ___ גבוה.", a: "אח", w: ["גבוה", "אחות", "שולחן"] },
    { q: "בחר מילה להשלמה: בגינה יש ___ יפה.", a: "פרח", w: ["יפה", "גדול", "שמח"] },
    { q: "בחר מילה להשלמה: ה___ פתוחה.", a: "דלת", w: ["פתוחה", "סגורה", "כבדה"] },
    { q: "המורה ___ לתלמידים.", a: "מדברת", w: ["ישנה", "שוחה", "רצה"] },
    { q: "הילדים ___ בחצר.", a: "משחקים", w: ["ישנים", "שוחים", "כותבים"] },
    { q: "בחר מילה: העץ בגן ___ .", a: "גבוה", w: ["נמוך", "קטן", "רך"] },
    { q: "בחר מילה: מצאנו ספר ___ .", a: "על השולחן", w: ["בתיק", "בים", "בשמיים"] },
    { q: "בחר מילה: הפרי בסל ___ .", a: "אדום", w: ["כחול", "שחור", "ירוק"] },
  ];
  for (const item of clozeItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.a, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["easy"],
        patternFamily: "literacy_simple_words",
        subtype: "cloze_light",
        question: item.q,
        answers,
        correct,
      })
    );
  }

  const oddItems = [
    { q: "איזו מילה לא שייכת לקבוצת חיות?", odd: "פרח", w: ["כלב", "חתול", "דג"] },
    { q: "איזו מילה לא שייכת לקבוצת פירות וירקות?", odd: "גזר", w: ["תפוח", "בננה", "עגבנייה"] },
    { q: "איזו מילה לא שייכת לקבוצת צבעים?", odd: "שולחן", w: ["אדום", "כחול", "ירוק"] },
    { q: "איזו מילה לא שייכת לקבוצת פעולות?", odd: "ספר", w: ["רץ", "הולך", "קופץ"] },
    { q: "איזו מילה לא שייכת לקבוצת בני משפחה?", odd: "רץ", w: ["אמא", "אבא", "סבא"] },
    { q: "איזו מילה לא שייכת לקבוצת זמני יום?", odd: "שולחן", w: ["בוקר", "צהריים", "ערב"] },
  ];
  for (const item of oddItems) {
    const seed = idx++;
    const { answers, correct } = fourWordOptions(item.odd, item.w, seed);
    out.push(
      row({
        topic: "grammar",
        minGrade: 1,
        maxGrade: 1,
        levels: ["hard"],
        patternFamily: "literacy_simple_words",
        subtype: "odd_category",
        question: item.q,
        answers,
        correct,
      })
    );
  }

  return out;
}

export const HEBREW_G1_LITERACY_POOL = [
  ...buildG1ReadingPool(),
  ...buildG1ComprehensionPool(),
  ...buildG1GrammarPool(),
  ...HEBREW_G1_GAP_POOL,
];

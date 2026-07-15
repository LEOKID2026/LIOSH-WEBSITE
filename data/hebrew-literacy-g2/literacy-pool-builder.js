/**
 * Hebrew G2 supplemental MCQ banks — aligned to hebrew-g2-registry batches.
 */
import { HEBREW_G2_GAP_POOL } from "./gap-fill-banks.js";

/** @type {Array<{ sentence: string, answer: string, wrong: string[] }>} */
const G2_READING_EASY = [
  { sentence: "הילד קורא ספר בכיתה", answer: "הילד קורא ספר בכיתה", wrong: ["הילד קרא ספר בכיתה", "הילד קורא ספר בכתה", "הילד כורא ספר בכיתה"] },
  { sentence: "הילדה כותבת במחברת", answer: "הילדה כותבת במחברת", wrong: ["הילדה כתבה במחברת", "הילדה כותבת במחברת.", "הילד כותב במחברת"] },
  { sentence: "הכלב רץ בגינה", answer: "הכלב רץ בגינה", wrong: ["הכלב רץ בגינה.", "הכלבה רצה בגינה", "הכלב הולך בגינה"] },
  { sentence: "אמא מכינה אוכל טעים", answer: "אמא מכינה אוכל טעים", wrong: ["אמא מכינה אוכל טעים.", "אבא מכין אוכל טעים", "אמא אוכלת אוכל טעים"] },
  { sentence: "התלמידים יושבים בשקט", answer: "התלמידים יושבים בשקט", wrong: ["התלמידים יושב בשקט", "התלמיד יושבים בשקט", "התלמידים עומדים בשקט"] },
  { sentence: "השמש זורחת בבוקר", answer: "השמש זורחת בבוקר", wrong: ["השמש זורח בבוקר", "הירח זורחת בבוקר", "השמש זורחת בערב"] },
  { sentence: "החתול ישן על המיטה", answer: "החתול ישן על המיטה", wrong: ["החתול ישנה על המיטה", "הכלב ישן על המיטה", "החתול ער על המיטה"] },
  { sentence: "הדגים שוחים בים", answer: "הדגים שוחים בים", wrong: ["הדג שוחים בים", "הדגים שוחה בים", "הדגים עפים בים"] },
  { sentence: "המורה מסבירה שיעור חדש", answer: "המורה מסבירה שיעור חדש", wrong: ["המורה מסביר שיעור חדש", "התלמיד מסבירה שיעור חדש", "המורה מסבירה שיעור ישן"] },
  { sentence: "הילדים משחקים בחצר", answer: "הילדים משחקים בחצר", wrong: ["הילד משחקים בחצר", "הילדים משחק בחצר", "הילדים לומדים בחצר"] },
  { sentence: "העננים לבנים בשמיים", answer: "העננים לבנים בשמיים", wrong: ["הענן לבנים בשמיים", "העננים שחורים בשמיים", "העננים לבנים בים"] },
  { sentence: "הספרים על המדף", answer: "הספרים על המדף", wrong: ["הספר על המדף", "הספרים בתוך המדף", "המדפים על הספר"] },
  { sentence: "התפוחים אדומים וטעימים", answer: "התפוחים אדומים וטעימים", wrong: ["התפוח אדומים וטעימים", "התפוחים כחולים וטעימים", "התפוחים אדומים ומלוחים"] },
  { sentence: "האחות הקטנה מחייכת", answer: "האחות הקטנה מחייכת", wrong: ["האח הקטנה מחייכת", "האחות הגדולה מחייכת", "האחות הקטנה בוכה"] },
  { sentence: "הרוח נושבת בעלים", answer: "הרוח נושבת בעלים", wrong: ["הרוח נושב בעלים", "הגשם נושבת בעלים", "הרוח נושבת בים"] },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G2_COMP = [
  { question: "בחר מילה: נועם שם את העט ב___ לפני היציאה.", answer: "תיק", wrong: ["כיסא", "שולחן", "חלון"] },
  { question: "למה ילדה מחייכת אחרי מתנה?", answer: "כי שמחה", wrong: ["כי עייפה", "כי רעבה", "כי כועסת"] },
  { question: "למה תלמידים שותקים כשמורה מבקשת?", answer: "כי מקשיבים", wrong: ["כי יוצאים", "כי משחקים", "כי ישנים"] },
  { question: "למה בוחרים כלב למשפחה?", answer: "כי הוא נאמן", wrong: ["כי הוא גדול", "כי הוא שחור", "כי הוא עף"] },
  { question: "מה עושים כשלא מוצאים מחברת?", answer: "שואלים חבר", wrong: ["בוכים", "יוצאים", "זורקים תיק"] },
  { question: "למה פרחים נובלים?", answer: "כי לא השקו", wrong: ["כי ירד גשם", "כי חם", "כי יש רוח"] },
  { question: "למה אוספים פחיות בכיתה?", answer: "לעזור לסביבה", wrong: ["לקבל מתנה", "לשחק", "לישון"] },
  { question: "הילד קיבל ציון טוב. האם הוא שמח?", answer: "כן", wrong: ["לא", "אולי", "לא יודעים"] },
  { question: "איך אוכלים דבש בצורה נכונה?", answer: "מעט בכל פעם", wrong: ["הרבה מאוד", "רק בלילה", "בלי לטעום"] },
  { question: "מה קודם: שטיפת ידיים או אוכל?", answer: "שטיפת ידיים", wrong: ["אוכל", "שינה", "משחק"] },
  { question: "מה קורה אחרי שענן מכסה את השמש?", answer: "מתקרר", wrong: ["מתחמם", "יורד שלג", "בוער אש"] },
  { question: "למה שומרים סוד?", answer: "כי הבטיחו", wrong: ["כי שכחו", "כי רוצים לצעוק", "כי לא שמעו"] },
  { question: "למה סוגרים חלון בקור?", answer: "לשמור על חום", wrong: ["לקרר", "לשמוע מוזיקה", "לפתוח גינה"] },
  { question: "למה כותבים לאט?", answer: "לכתוב יפה", wrong: ["כי עייפים", "כי לא יודעים", "כי רצים"] },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G2_GRAMMAR = [
  { question: "איזו מילה היא שם עצם?", answer: "ספר", wrong: ["קורא", "יפה", "מהר"] },
  { question: "איזו מילה היא פועל?", answer: "רץ", wrong: ["ילד", "גדול", "בבית"] },
  { question: "איזו מילה היא שם תואר?", answer: "יפה", wrong: ["שולחן", "הולך", "מחר"] },
  { question: "איזו מילה מציינת ילדה?", answer: "הילדה", wrong: ["שמחה", "הילד", "הבית"] },
  { question: "איזו מילה היא פועל במשפט על כלב?", answer: "נובח", wrong: ["הכלב", "גדול", "שחור"] },
  { question: "מה רבים של 'ילד'?", answer: "ילדים", wrong: ["ילדות", "ילדה", "ילד"] },
  { question: "מה רבים של 'מורה'?", answer: "מורים", wrong: ["מורות", "מורה", "מורהים"] },
  { question: "בחר משפט נכון לילד:", answer: "הילד אוכל", wrong: ["הילד אוכלת", "הילדה אוכל", "הילדים אוכל"] },
  { question: "בחר משפט נכון לילדה:", answer: "הילדה קוראת", wrong: ["הילדה קורא", "הילד קוראת", "הילדים קוראת"] },
  { question: "איזה משפט נכון?", answer: "אני הולך לבית הספר", wrong: ["אני הולכת לבית הספר", "אני הולך לבית ספר", "אני הולך בית הספר"] },
  { question: "איזה משפט נכון?", answer: "היא שותה מים", wrong: ["היא שותה מים.", "הוא שותה מים", "היא שותה מים?"] },
  { question: "איזה סימן בסוף משפט שאלה?", answer: "?", wrong: [".", "!", ","] },
  { question: "איזה סימן מפריד בין משפטים?", answer: ".", wrong: ["?", "!", "-"] },
  { question: "איזו מילה מתחברת: 'ואני' או 'ואנחנו'?", answer: "ואני", wrong: ["ואנחנו", "ואתה", "והם"] },
  { question: "הלכנו לגן ביום שעבר. מתי זה היה?", answer: "אתמול", wrong: ["מחר", "עכשיו", "תמיד"] },
  { question: "נלך לים ביום הבא. מתי זה יהיה?", answer: "מחר", wrong: ["אתמול", "לפני שנה", "אתמול בלילה"] },
  { question: "איזו מילה לא שייכת לקבוצת פעולות?", answer: "שולחן", wrong: ["רץ", "הולך", "קופץ"] },
  { question: "איזו מילה לא שייכת לקבוצת פירות וירקות?", answer: "כחול", wrong: ["תפוח", "בננה", "גזר"] },
  { question: "בחר צירוף נכון עם המילה ילדים:", answer: "שלושה ילדים", wrong: ["שלוש ילדים", "שלושה ילד", "שלוש ילד"] },
  { question: "בחר צירוף נכון עם המילה בנות:", answer: "שתי בנות", wrong: ["שני בנות", "שתי בן", "שני בן"] },
];

/** @type {Array<{ question: string, answer: string, wrong: string[] }>} */
const G2_VOCAB = [
  { question: "מה משמעות 'שמח'?", answer: "מרגיש טוב", wrong: ["עצוב", "כועס", "עייף"] },
  { question: "מה משמעות 'עצוב'?", answer: "לא שמח", wrong: ["שמח", "רעב", "עייף"] },
  { question: "מה נרדף ל'יפה'?", answer: "נאה", wrong: ["מכוער", "קטן", "גדול"] },
  { question: "מה נרדף ל'גדול'?", answer: "ענק", wrong: ["קטן", "צר", "נמוך"] },
  { question: "מה נרדף ל'קטן'?", answer: "זעיר", wrong: ["גדול", "רחב", "גבוה"] },
  { question: "מה נרדף ל'מהיר'?", answer: "זריז", wrong: ["איטי", "כבד", "עייף"] },
  { question: "מה נרדף ל'איטי'?", answer: "מתון", wrong: ["מהיר", "חזק", "רעש"] },
  { question: "במשפט 'הילד אכל ארוחת בוקר' - מה פירוש 'ארוחת בוקר'?", answer: "האוכל שאוכלים בבוקר", wrong: ["ארוחת ערב", "חטיף בלילה", "ארוחת צהריים"] },
  { question: "במשפט 'היא לבשה מעיל' - מה פירוש 'מעיל'?", answer: "בגד חם לחורף", wrong: ["כובע קיץ", "נעליים", "כפפות בלבד"] },
  { question: "מה ההפך מ'חם'?", answer: "קר", wrong: ["חמים", "לוהט", "נעים"] },
  { question: "מה ההפך מ'יום'?", answer: "לילה", wrong: ["בוקר", "צהריים", "ערב"] },
  { question: "מה ההפך מ'פתוח'?", answer: "סגור", wrong: ["רחב", "גדול", "מלא"] },
  { question: "איזו מילה מתאימה: 'הילד ___ לבית הספר'?", answer: "הולך", wrong: ["אוכל", "ישן", "צוחק"] },
  { question: "איזו מילה מתאימה: 'החתול ___ על המיטה'?", answer: "ישן", wrong: ["שוחה", "טס", "רץ מהר בים"] },
  { question: "איזו מילה מתאימה: 'הסוס ___ בשדה'?", answer: "רץ", wrong: ["שוחה", "מטייל בים", "עף"] },
];

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
    distractors.push(`${correct} (${distractors.length + 1})`);
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

function buildG2ReadingPool() {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  let idx = 0;

  for (const item of G2_READING_EASY) {
    const seed = idx++;
    const { answers, correct } = fourOptions(item.answer, item.wrong, seed);
    out.push({
      topic: "reading",
      minGrade: 2,
      maxGrade: 2,
      levels: ["easy"],
      patternFamily: "g2_short_sentence",
      subtype: "read_sentence",
      question: `קרא את המשפט: '${item.sentence}'`,
      answers,
      correct,
    });
  }

  const mediumSentences = [
    { s: "בבוקר התלמידים נכנסו לכיתה בשקט", a: "בבוקר התלמידים נכנסו לכיתה בשקט", w: ["בערב התלמידים נכנסו לכיתה בשקט", "בבוקר התלמיד נכנסו לכיתה בשקט", "בבוקר התלמידים יצאו מהכיתה בשקט"] },
    { s: "אחרי ההפסקה שתינו מים והמשיכו ללמוד", a: "אחרי ההפסקה שתינו מים והמשיכו ללמוד", w: ["לפני ההפסקה שתינו מים והמשיכו ללמוד", "אחרי ההפסקה אכלו מים והמשיכו ללמוד", "אחרי ההפסקה שתינו מים והפסיקו ללמוד"] },
    { s: "הספרנית עזרה לנו למצוא ספר על חיות", a: "הספרנית עזרה לנו למצוא ספר על חיות", w: ["הספרן עזרה לנו למצוא ספר על חיות", "הספרנית עזר לנו למצוא ספר על חיות", "הספרנית עזרה לנו למצוא ספר על צמחים בלבד"] },
    { s: "בסוף היום אספנו את הכלים וניקינו את הכיתה", a: "בסוף היום אספנו את הכלים וניקינו את הכיתה", w: ["בתחילת היום אספנו את הכלים וניקינו את הכיתה", "בסוף היום פיזרנו את הכלים ולכלכנו את הכיתה", "בסוף היום אספנו את הספרים וניקינו את הגינה"] },
    { s: "הרופא בדק את הילד ואמר שהוא בריא", a: "הרופא בדק את הילד ואמר שהוא בריא", w: ["הרופאה בדק את הילד ואמר שהוא בריא", "הרופא בדק את הילדה ואמר שהוא בריא", "הרופא בדק את הילד ואמר שהוא חולה"] },
  ];
  for (const item of mediumSentences) {
    const seed = idx++;
    const { answers, correct } = fourOptions(item.a, item.w, seed);
    out.push({
      topic: "reading",
      minGrade: 2,
      maxGrade: 2,
      levels: ["medium"],
      patternFamily: "g2_short_sentence",
      subtype: "read_sentence_medium",
      question: `קרא את המשפט: '${item.s}'`,
      answers,
      correct,
    });
  }

  const hardSentences = [
    { s: "למרות הגשם, הגענו בזמן לאסיפת הורים", a: "למרות הגשם, הגענו בזמן לאסיפת הורים", w: ["בגלל הגשם, הגענו בזמן לאסיפת הורים", "למרות הגשם, איחרנו לאסיפת הורים", "למרות השמש, הגענו בזמן לאסיפת הורים"] },
    { s: "התלמידה תיקנה את השגיאה וכתבה מחדש בזהירות", a: "התלמידה תיקנה את השגיאה וכתבה מחדש בזהירות", w: ["התלמיד תיקנה את השגיאה וכתבה מחדש בזהירות", "התלמידה הוסיפה שגיאה וכתבה מחדש בזהירות", "התלמידה תיקנה את השגיאה ומחקה הכל"] },
    { s: "כששמענו את הצלצול, סידרנו את השולחנות במהירות", a: "כששמענו את הצלצול, סידרנו את השולחנות במהירות", w: ["לפני הצלצול, סידרנו את השולחנות במהירות", "כששמענו את הצלצול, בלגנו את השולחנות", "כששמענו את המוזיקה, סידרנו את השולחנות במהירות"] },
  ];
  for (const item of hardSentences) {
    const seed = idx++;
    const { answers, correct } = fourOptions(item.a, item.w, seed);
    out.push({
      topic: "reading",
      minGrade: 2,
      maxGrade: 2,
      levels: ["hard"],
      patternFamily: "g2_short_sentence",
      subtype: "read_sentence_hard",
      question: `קרא את המשפט: '${item.s}'`,
      answers,
      correct,
    });
  }

  const punct = [
    { s: "האם אתה מוכן", q: "איזה סימן מתאים בסוף?", a: "?", w: [".", "!", ","] },
    { s: "איזה יום יפה", q: "איזה סימן מתאים בסוף?", a: "!", w: [".", "?", ","] },
    { s: "הילד קרא ספר", q: "איזה סימן מתאים בסוף?", a: ".", w: ["?", "!", ","] },
    { s: "קנינו תפוחים, בננות ואגסים", q: "איזה סימן מפריד בין פריטים ברשימה?", a: ",", w: [".", "?", "!"] },
  ];
  for (const item of punct) {
    const seed = idx++;
    const { answers, correct } = fourOptions(item.a, item.w, seed);
    out.push({
      topic: "reading",
      minGrade: 2,
      maxGrade: 2,
      levels: ["easy", "medium"],
      patternFamily: "g2_simple_punctuation_read",
      subtype: "punctuation_pick",
      question: `במשפט '${item.s}' - ${item.q}`,
      answers,
      correct,
    });
  }

  return out;
}

function resolveExpandQuestion(item, topic, i, baseLen) {
  let base;
  if (topic === "reading" && item.sentence) {
    base = `קרא את המשפט: '${item.sentence}'`;
  } else if (item.question) {
    base = String(item.question);
  } else if (item.sentence && (item.q || item.question)) {
    base = `${item.sentence} ${item.q || item.question}`.trim();
  } else {
    base = `כיתה ב׳ - ${topic}`;
  }
  return i >= baseLen ? `${base} · משפט ${i + 1}` : base;
}

function expandPool(baseItems, topic, patternFamily, subtype, level, minGrade, maxGrade, targetCount) {
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (let i = 0; i < targetCount; i += 1) {
    const item = baseItems[i % baseItems.length];
    const seed = i + topic.length * 7 + level.length * 3;
    const question = resolveExpandQuestion(item, topic, i, baseItems.length);
    const answer = item.answer;
    const wrong = [...(item.wrong || [])];
    if (i >= baseItems.length && wrong.length > 0) {
      const rot = i % wrong.length;
      wrong.push(wrong.shift());
      wrong.unshift(wrong.pop());
      void rot;
    }
    const { answers, correct } = fourOptions(answer, wrong, seed);
    out.push({
      topic,
      minGrade,
      maxGrade,
      levels: [level],
      patternFamily,
      subtype: `${subtype}_${i + 1}`,
      question,
      answers,
      correct,
    });
  }
  return out;
}

function buildG2ComprehensionPool() {
  const easy = expandPool(G2_COMP.slice(0, 10), "comprehension", "g2_detail_main_idea", "detail", "easy", 2, 2, 52);
  const medium = expandPool(G2_COMP.slice(5, 14), "comprehension", "g2_light_inference", "inference", "medium", 2, 2, 40);
  const hard = expandPool(G2_COMP.slice(8), "comprehension", "g2_simple_sequence", "sequence", "hard", 2, 2, 30);
  return [...easy, ...medium, ...hard];
}

function buildG2GrammarPool() {
  const easy = expandPool(G2_GRAMMAR.slice(0, 12), "grammar", "g2_pos_basic", "pos", "easy", 2, 2, 52);
  const medium = expandPool(G2_GRAMMAR.slice(6, 18), "grammar", "g2_number_gender_light", "agreement", "medium", 2, 2, 40);
  const hard = expandPool(G2_GRAMMAR.slice(12), "grammar", "g2_simple_tense", "tense", "hard", 2, 2, 30);
  return [...easy, ...medium, ...hard];
}

function buildG2VocabularyPool() {
  const easy = expandPool(G2_VOCAB, "vocabulary", "g2_synonyms_basic", "synonym", "easy", 2, 2, 50);
  const medium = expandPool(G2_VOCAB, "vocabulary", "g2_context_clue_easy", "context", "medium", 2, 2, 40);
  const hard = expandPool(G2_VOCAB, "vocabulary", "g2_cloze_school", "cloze", "hard", 2, 2, 30);
  return [...easy, ...medium, ...hard];
}

function buildG2ReadingExpanded() {
  const base = buildG2ReadingPool();
  const easyMore = expandPool(
    G2_READING_EASY,
    "reading",
    "g2_fluent_words",
    "fluent",
    "easy",
    2,
    2,
    Math.max(0, 52 - base.filter((r) => r.levels?.includes("easy")).length)
  );
  const mediumMore = expandPool(
    G2_READING_EASY,
    "reading",
    "g2_short_sentence",
    "sentence_med",
    "medium",
    2,
    2,
    Math.max(0, 40 - base.filter((r) => r.levels?.includes("medium")).length)
  );
  const hardMore = expandPool(
    G2_READING_EASY,
    "reading",
    "g2_short_sentence",
    "sentence_hard",
    "hard",
    2,
    2,
    Math.max(0, 30 - base.filter((r) => r.levels?.includes("hard")).length)
  );
  return [...base, ...easyMore, ...mediumMore, ...hardMore];
}

export const HEBREW_G2_LITERACY_POOL = [
  ...buildG2ReadingExpanded(),
  ...buildG2ComprehensionPool(),
  ...buildG2GrammarPool(),
  ...buildG2VocabularyPool(),
  ...HEBREW_G2_GAP_POOL,
];

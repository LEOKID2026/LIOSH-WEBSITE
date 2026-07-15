/**
 * Hebrew G1 gap-fill MCQs — unique stems for inventory targets (Phase 3B).
 * patternFamily: literacy_simple_words
 */

/**
 * @param {string} correct
 * @param {string[]} wrongPool
 * @param {number} seed
 */
function fourWordOptions(correct, wrongPool, seed) {
  const distractors = [];
  for (let i = 0; i < wrongPool.length && distractors.length < 3; i += 1) {
    const w = wrongPool[(seed + i) % wrongPool.length];
    if (w !== correct && !distractors.includes(w)) distractors.push(w);
  }
  while (distractors.length < 3) {
    distractors.push(`אפשרות${distractors.length + 1}`);
  }
  const answers = [correct, distractors[0], distractors[1], distractors[2]];
  const correctIdx = seed % 4;
  const ordered = [
    answers[correctIdx % 4],
    answers[(correctIdx + 1) % 4],
    answers[(correctIdx + 2) % 4],
    answers[(correctIdx + 3) % 4],
  ];
  return { answers: ordered, correct: ordered.indexOf(correct) };
}

/**
 * @param {object} def
 * @param {number} serial
 */
function gapRow(def, serial) {
  const seed = serial * 17 + def.topic.length;
  const { answers, correct } = fourWordOptions(def.answer, def.wrong, seed);
  return {
    topic: def.topic,
    minGrade: 1,
    maxGrade: 1,
    levels: def.levels,
    patternFamily: "literacy_simple_words",
    subtype: def.subtype,
    question: `בנק א׳ · ${serial}: ${def.question}`,
    answers,
    correct,
  };
}

/** @type {Array<{ topic: string, levels: string[], subtype: string, question: string, answer: string, wrong: string[] }>} */
const G1_GAP_DEFS = [
  // comprehension easy (+5)
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "דני שם את הכובע ב___.", answer: "תיק", wrong: ["שולחן", "חלון", "רצפה"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "הילדה שמה את העט ב___.", answer: "קלמר", wrong: ["שמיים", "ים", "גג"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "הכלב שוחה ב___.", answer: "מים", wrong: ["אוויר", "חול", "עץ"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "התינוק ישן ב___.", answer: "עריסה", wrong: ["גינה", "רחוב", "מטבח"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "הפרח צמח ב___.", answer: "עציץ", wrong: ["ים", "שמיים", "כיס"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "הספר נמצא ב___.", answer: "מדף", wrong: ["ים", "רוח", "אש"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "הילד אוכל ___.", answer: "לחם", wrong: ["עט", "כיסא", "חלון"] },
  { topic: "comprehension", levels: ["easy"], subtype: "gap_cloze_easy", question: "החתול ישן על ___.", answer: "כרית", wrong: ["מים", "רוח", "אש"] },

  // comprehension medium (+20)
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "נועם שכח מעט. מה כדאי לו לעשות?", answer: "לבקש מחבר", wrong: ["לצעוק", "לרוץ החוצה", "לזרוק תיק"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "מיה ירד גשם. מה לוקחים לחצר?", answer: "מטריה", wrong: ["כדור", "ספר", "כובע קיץ"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני שינה שוטפים ___.", answer: "שיניים", wrong: ["רגליים", "שיער בלבד", "ידיים בלבד"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשקר לובשים ___.", answer: "מעיל", wrong: ["בגד ים", "כובע קיץ", "סנדלים"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "אחרי פעילות בחצר שותים ___.", answer: "מים", wrong: ["צבע", "דבק", "נייר"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמאחרים לבית הספר אומרים ___.", answer: "סליחה", wrong: ["ביי", "תודה", "שלום"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמקבלים מתנה אומרים ___.", answer: "תודה", wrong: ["ביי", "לא", "עזוב"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני ציור שמים ___.", answer: "סינר", wrong: ["כפפות חורף", "מגפיים", "מטריה"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשחבר נופל עוזרים לו ___.", answer: "לקום", wrong: ["לרוץ", "לצחוק", "לישון"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני שיעור שמים את ה___.", answer: "ספר", wrong: ["כדור", "בלון", "צעצוע רחוב"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשהחדר חשוך מדליקים ___.", answer: "אור", wrong: ["מים", "רוח", "אש"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני אוכל מנקים את ___.", answer: "השולחן", wrong: ["השמיים", "הרחוב", "הגג"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמוצאים ספר אבוד מחזירים אותו ל___.", answer: "מורה", wrong: ["רחוב", "גינה", "ים"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשחם שותים ___.", answer: "מים", wrong: ["שוקו חם", "מרק", "תה רותח"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני שינה קוראים ___.", answer: "סיפור", wrong: ["ריצה", "קפיצה", "שחייה"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמלכלכים את הכיתה ___.", answer: "מנקים", wrong: ["יוצאים", "ישנים", "צועקים"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני יציאה לחצר סוגרים ___.", answer: "מחברת", wrong: ["חלון", "דלת כניסה", "תיק בחוץ"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמישהו מצטער מגיבים ב___.", answer: "סליחה", wrong: ["ביי", "לא", "עזוב"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני משחק בכדור לובשים ___.", answer: "נעליים סגורות", wrong: ["כפכפים", "בגד ים", "כובע חורף"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשהשמש חזקה שמים ___.", answer: "כובע", wrong: ["מעיל", "מגפיים", "צעיף חורף"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני כתיבה מחדדים ___.", answer: "עפרון", wrong: ["מברג", "מפתח", "מספריים גדולות"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמסיימים ארוחה מרימים ___.", answer: "צלחת", wrong: ["שולחן", "רצפה", "תקרה"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני שיעור ספורט מתמתחים ___.", answer: "גוף", wrong: ["ספר", "עט", "מחברת"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "כשמישהו מחלה שולחים ___.", answer: "ביקור", wrong: ["כדור", "בלון", "צעצוע"] },
  { topic: "comprehension", levels: ["medium"], subtype: "gap_inference_med", question: "לפני ביקור אצל סבא מכינים ___.", answer: "מתנה קטנה", wrong: ["רעש גדול", "בלגן", "צעקה"] },

  // comprehension hard (+12)
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: ללבוש נעליים או לצאת לרחוב?", answer: "ללבוש נעליים", wrong: ["לצאת לרחוב", "לישון", "לאכול"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: לשטוף ידיים או לאכול?", answer: "לשטוף ידיים", wrong: ["לאכול", "לרוץ", "לישון"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: לפתוח ספר או לקרוא?", answer: "לפתוח ספר", wrong: ["לקרוא", "לסגור תיק", "לצעוק"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: לשים מעיל או לצאת לגשם?", answer: "לשים מעיל", wrong: ["לצאת לגשם", "לשחק בחול", "לישון"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: לבקש רשות או לקום מהכיסא?", answer: "לבקש רשות", wrong: ["לקום מהכיסא", "לצעוק", "לרוץ"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "מה קודם: לסדר שולחן או לאכול?", answer: "לסדר שולחן", wrong: ["לאכול", "לישון", "לשחק בכדור"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה שותקים בזמן שמורה מדברת?", answer: "כדי להקשיב", wrong: ["כדי לשחק", "כדי לצעוק", "כדי לישון"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מחזירים ספר לספרייה?", answer: "כדי שאחרים יקראו", wrong: ["כדי לזרוק", "כדי לקרוע", "כדי לאבד"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה שומרים על ניקיון בכיתה?", answer: "כדי ללמוד בנוחות", wrong: ["כדי להתלכלך", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מבקשים עזרה כשלא מבינים?", answer: "כדי להבין", wrong: ["כדי לבכות", "כדי לברוח", "כדי לישון"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מחכים בתור?", answer: "כדי לתת לכל אחד תור", wrong: ["כדי לדחוף", "כדי לצעוק", "כדי לברוח"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מכבים אור לפני שינה?", answer: "כדי לנוח", wrong: ["כדי לשחק", "כדי לרוץ", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מניחים כובע בשמש?", answer: "כדי להגן על הראש", wrong: ["כדי להתקרר", "כדי לישון", "כדי לשחות"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מחזירים כלי לפעילות?", answer: "כדי שיהיו מוכנים", wrong: ["כדי לאבד", "כדי לשבור", "כדי לזרוק"] },
  { topic: "comprehension", levels: ["hard"], subtype: "gap_sequence_hard", question: "למה מקשיבים להוראות בטיחות?", answer: "כדי להישאר בטוחים", wrong: ["כדי להתעלם", "כדי לרוץ", "כדי לצעוק"] },

  // grammar medium (+4)
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: הילד ___ בגינה.", answer: "משחק", wrong: ["ספר", "שולחן", "חלון"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: הילדה ___ מים.", answer: "שותה", wrong: ["כותב", "ישן", "צוחק"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: האמא ___ אוכל.", answer: "מכינה", wrong: ["רצה", "שוחה", "קופצת"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: התלמיד ___ במחברת.", answer: "כותב", wrong: ["אוכל", "ישן", "שוחה"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: החתול ___ על המיטה.", answer: "ישן", wrong: ["שוחה", "עף", "רץ בים"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר פועל: השמש ___ בבוקר.", answer: "זורחת", wrong: ["יורדת", "שוחה", "כותבת"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר שם: ___ יושב על הכיסא.", answer: "הילד", wrong: ["רץ", "יפה", "במהר"] },
  { topic: "grammar", levels: ["medium"], subtype: "gap_grammar_med", question: "בחר שם תואר: הפרח ___ .", answer: "יפה", wrong: ["רץ", "כותב", "שוחה"] },

  // grammar hard (+11)
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזו מילה לא שייכת לקבוצת כלי כתיבה?", answer: "כדור", wrong: ["עט", "עפרון", "מחק"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזו מילה לא שייכת לקבוצת חלקי גוף?", answer: "שולחן", wrong: ["יד", "רגל", "עין"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזו מילה לא שייכת לקבוצת מזון?", answer: "עט", wrong: ["לחם", "חלב", "תפוח"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזו מילה לא שייכת לקבוצת מקומות בבית?", answer: "רץ", wrong: ["מטבח", "חדר", "סלון"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזו מילה לא שייכת לקבוצת עונות?", answer: "ספר", wrong: ["חורף", "אביב", "קיץ"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "בחר משפט מסודר: מילים - אוכל, אני, תפוח.", answer: "אני אוכל תפוח", wrong: ["אוכל אני תפוח", "תפוח אני אוכל", "אוכל תפוח אני"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "בחר משפט מסודר: מילים - קורא, הילד, ספר.", answer: "הילד קורא ספר", wrong: ["קורא הילד ספר", "ספר קורא הילד", "קורא ספר הילד"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "בחר משפט מסודר: מילים - מים, שותה, הילדה.", answer: "הילדה שותה מים", wrong: ["שותה הילדה מים", "מים שותה הילדה", "שותה מים הילדה"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזה סימן בסוף משפט שאלה?", answer: "?", wrong: [".", "!", ","] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזה סימן בסוף משפט רגיל?", answer: ".", wrong: ["?", "!", ","] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "איזה סימן מפריד בין מילים ברשימה?", answer: ",", wrong: [".", "?", "!"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "בחר מילת קישור מתאימה: אני אוכל ___ שותה.", answer: "ו", wrong: ["או", "אם", "כי"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "מה רבים של 'כיס'?", answer: "כיסים", wrong: ["כיסות", "כיס", "כיסה"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "מה רבים של 'עיפרון'?", answer: "עפרונות", wrong: ["עפרון", "עפרוני", "עפרונה"] },
  { topic: "grammar", levels: ["hard"], subtype: "gap_grammar_hard", question: "בחר מילה נקבה: ___ קטנה.", answer: "החתולה", wrong: ["החתול", "הכלב", "הסוס"] },
];

export const HEBREW_G1_GAP_POOL = G1_GAP_DEFS.map((def, i) => gapRow(def, i + 1));

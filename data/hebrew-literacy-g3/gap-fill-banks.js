/**
 * Hebrew G3 gap-fill MCQs — unique stems for Phase 5A inventory targets.
 */

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

/**
 * @param {object} def
 * @param {number} serial
 */
function gapRow(def, serial) {
  const seed = serial * 29 + def.topic.length * 5;
  const { answers, correct } = fourOptions(def.answer, def.wrong, seed);
  return {
    topic: def.topic,
    minGrade: 3,
    maxGrade: 3,
    levels: def.levels,
    patternFamily: def.patternFamily,
    subtype: def.subtype,
    question: `בנק ג׳ · ${serial}: ${def.question}`,
    answers,
    correct,
  };
}

/** @type {Array<{ topic: string, levels: string[], patternFamily: string, subtype: string, question: string, answer: string, wrong: string[] }>} */
const G3_GAP_DEFS = [
  // comprehension easy — explicit detail
  {
    topic: "comprehension",
    levels: ["easy"],
    patternFamily: "g3_explicit_detail",
    subtype: "gap_explicit",
    question: "קראו: 'עומר שם את המחברת בתיק לפני שיצא לחצר.' מה עשה עומר לפני היציאה?",
    answer: "שם את המחברת בתיק",
    wrong: ["קנה מחברת חדשה", "שכח את התיק בבית", "כתב על הקיר"],
  },
  {
    topic: "comprehension",
    levels: ["easy"],
    patternFamily: "g3_explicit_detail",
    subtype: "gap_explicit",
    question: "קראו: 'המורה פתחה את החלון כי בכיתה היה חם.' למה פתחה את החלון?",
    answer: "כי בכיתה היה חם",
    wrong: ["כי ירד שלג", "כי התלמידים ישנים", "כי אין חלון בכיתה"],
  },
  {
    topic: "comprehension",
    levels: ["easy"],
    patternFamily: "g3_explicit_detail",
    subtype: "gap_explicit",
    question: "קראו: 'הילדים אספו עלים יבשים בגינת בית הספר.' איפה אספו עלים?",
    answer: "בגינת בית הספר",
    wrong: ["בים", "בחנות", "במטבח בבית"],
  },
  {
    topic: "comprehension",
    levels: ["easy"],
    patternFamily: "g3_explicit_detail",
    subtype: "gap_explicit",
    question: "קראו: 'נועה קראה סיפור על חברות לפני השינה.' מתי קראה נועה?",
    answer: "לפני השינה",
    wrong: ["בזמן ארוחת צהריים", "בזמן מבחן", "אחרי חופשה ארוכה"],
  },
  {
    topic: "comprehension",
    levels: ["easy"],
    patternFamily: "g3_explicit_detail",
    subtype: "gap_explicit",
    question: "קראו: 'הכלב של רועי שמר על הבית כשהמשפחה בטיול.' מה עשה הכלב?",
    answer: "שמר על הבית",
    wrong: ["נהג באוטובוס", "כתב מכתב", "שיחק כדורגל בים"],
  },

  // comprehension medium — cause/effect
  {
    topic: "comprehension",
    levels: ["medium"],
    patternFamily: "g3_cause_effect",
    subtype: "gap_cause",
    question: "למה התלמידים לבשו מעילים לפני היציאה לחצר ביום גשום?",
    answer: "כדי לא להתרטב",
    wrong: ["כדי להתחמם בקיץ", "כי אסור לצאת", "כי אין גשם"],
  },
  {
    topic: "comprehension",
    levels: ["medium"],
    patternFamily: "g3_cause_effect",
    subtype: "gap_cause",
    question: "למה שמרו על שקט בספרייה?",
    answer: "כדי לא להפריע לקוראים",
    wrong: ["כדי לצעוק", "כדי לרוץ", "כי אין ספרים"],
  },
  {
    topic: "comprehension",
    levels: ["medium"],
    patternFamily: "g3_cause_effect",
    subtype: "gap_cause",
    question: "למה הדליקו אור בחדר לפני קריאה?",
    answer: "כדי לראות את האותיות",
    wrong: ["כדי לישון", "כדי לכבות את הספר", "כי אין חשמל בכיתה"],
  },
  {
    topic: "comprehension",
    levels: ["medium"],
    patternFamily: "g3_compare_light",
    subtype: "gap_compare",
    question: "מה ההבדל העיקרי בין 'סיפור' ל'טקסט מידעי'?",
    answer: "בסיפור יש עלילה, במידע יש עובדות",
    wrong: ["אין הבדל", "שניהם רק שירים", "במידע חייבת להיות עלילה"],
  },
  {
    topic: "comprehension",
    levels: ["medium"],
    patternFamily: "g3_compare_light",
    subtype: "gap_compare",
    question: "השוו: 'תכנון טיול' לעומת 'סיפור על טיול'. מה שונה?",
    answer: "תכנון לפני, סיפור מתאר מה שקרה",
    wrong: ["אותו דבר תמיד", "שניהם רק מספרים", "אין מילים בשניהם"],
  },

  // comprehension hard
  {
    topic: "comprehension",
    levels: ["hard"],
    patternFamily: "g3_inference",
    subtype: "gap_inference",
    question: "קראו: 'אלי שכח מטריה וחזר הביתה עם חולצה רטובה.' מה כדאי לאלי לזכור לפעם הבאה?",
    answer: "לקחת מטריה ביום גשום",
    wrong: ["לא לצאת מהבית לעולם", "לשכוח את התיק", "לא ללמוד"],
  },
  {
    topic: "comprehension",
    levels: ["hard"],
    patternFamily: "g3_inference",
    subtype: "gap_inference",
    question: "קראו: 'הכיתה דנה אם הגיבור עשה נכון כשסיפר את האמת.' מה נושא הדיון?",
    answer: "האם כנות היא בחירה נכונה",
    wrong: ["כמה עולה עוגה", "איך לצבוע קיר", "מתי מתחיל חופש"],
  },
  {
    topic: "comprehension",
    levels: ["hard"],
    patternFamily: "g3_sequence",
    subtype: "gap_sequence",
    question: "מה קודם: לקרוא הוראות או להתחיל לבנות מודל?",
    answer: "לקרוא הוראות",
    wrong: ["להתחיל לבנות מיד", "לישון", "לצעוק"],
  },
  {
    topic: "comprehension",
    levels: ["hard"],
    patternFamily: "g3_sequence",
    subtype: "gap_sequence",
    question: "מה קודם: לשטוף ידיים או לאכול ארוחת בוקר?",
    answer: "לשטוף ידיים",
    wrong: ["לאכול ארוחת בוקר", "לצאת לרוץ", "לכתוב סיפור"],
  },

  // reading easy
  {
    topic: "reading",
    levels: ["easy"],
    patternFamily: "g3_read_main_idea",
    subtype: "gap_read_easy",
    question: "קרא את הטקסט: 'התלמידים שתלו עציץ בחלון הכיתה. הם השקו אותו בכל יום.' על מה מדבר הטקסט?",
    answer: "טיפול בצמח בכיתה",
    wrong: ["משחק כדורגל", "בישול עוגה", "טיול בחלל"],
  },
  {
    topic: "reading",
    levels: ["easy"],
    patternFamily: "g3_read_detail",
    subtype: "gap_read_easy",
    question: "קרא את הטקסט: 'מיכל מצאה סימניה בין עמודי הספר. למחרת המשיכה מאותו מקום.' למה השתמשה בסימניה?",
    answer: "כדי לזכור היכן הפסיקה",
    wrong: ["כדי למחוק את הספר", "כדי לצבוע דפים", "כדי לזרוק את הספר"],
  },
  {
    topic: "reading",
    levels: ["easy"],
    patternFamily: "g3_read_main_idea",
    subtype: "gap_read_easy",
    question: "קרא את הטקסט: 'בבוקר הכיתה יצאה לטיול בפארק. הם ראו פרחים וציפורים.' מה עשתה הכיתה?",
    answer: "יצאה לטיול בפארק",
    wrong: ["ישנה בכיתה", "כתבה מבחן", "בנתה בית מגולגל"],
  },

  // reading medium
  {
    topic: "reading",
    levels: ["medium"],
    patternFamily: "g3_read_medium_inference",
    subtype: "gap_read_med",
    question: "קרא את הטקסט: 'הילדה שיתפה צבעים עם חברה שלא הביאה. החברה חייכה והודתה.' מה למדנו על הילדה?",
    answer: "היא עזרה לחברה",
    wrong: ["היא לקחה את הצבעים", "היא בכתה", "היא יצאה מהכיתה"],
  },
  {
    topic: "reading",
    levels: ["medium"],
    patternFamily: "g3_read_medium_genre",
    subtype: "gap_read_med",
    question: "קרא את הטקסט: 'לדolphins יש ריאות. הם נושמים אוויר.' לעומת: 'הדולפין קפץ כמו חץ.' מה מאפיין את המשפט הראשון?",
    answer: "מידע עובדתי",
    wrong: ["דימוי בסיפור", "שיר בלבד", "רשימת קניות"],
  },

  // reading hard
  {
    topic: "reading",
    levels: ["hard"],
    patternFamily: "g3_read_hard_message",
    subtype: "gap_read_hard",
    question: "קרא את הטקסט: 'הגיבור החזיר ארנק שמצא. הבעלים הודה והזמין אותו לתה.' מה המסר?",
    answer: "יושר מוביל להערכה",
    wrong: ["אסור למצוא דברים", "כדאי לשמור הכל", "אין צורך להודות"],
  },
  {
    topic: "reading",
    levels: ["hard"],
    patternFamily: "g3_read_hard_inference",
    subtype: "gap_read_hard",
    question: "קרא את הטקסט: 'הילד חשב שחברו כועס, אבל החבר רק היה עייף.' מה הייתה הטעות?",
    answer: "בלבל בין כעס לעייפות",
    wrong: ["חשב שמדובר במבחן", "חשב שאין חברים", "חשב שזה ספר בישול"],
  },
];

/** @type {Record<string, unknown>[]} */
export const HEBREW_G3_GAP_POOL = G3_GAP_DEFS.map((def, i) => gapRow(def, i + 1));

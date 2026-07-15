/**
 * Hebrew G3 grammar + vocabulary MCQ banks — Phase 5B.
 * Self-contained; no imports.
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

function poolRow(def, topic, level, patternFamily, subtype, serial) {
  const seed = serial * 29 + topic.length * 5 + level.length * 7 + patternFamily.length;
  const { answers, correct } = fourOptions(def.answer, def.wrong, seed);
  return {
    topic,
    minGrade: 3,
    maxGrade: 3,
    levels: [level],
    patternFamily,
    subtype,
    subtopicId: def.subtopicId,
    question: def.question,
    answers,
    correct,
  };
}

function rowsFrom(defs, topic, level, patternFamily, subtype) {
  return defs.map((def, i) => poolRow(def, topic, level, patternFamily, `${subtype}_${i + 1}`, i));
}

const GRAMMAR_EASY_TENSE = [
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'אכל'?", answer: "עבר", wrong: ["הווה","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'אוכל'?", answer: "הווה", wrong: ["עבר","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'אלך'?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'דני כתב מכתב' - באיזה זמן הפועל?", answer: "עבר", wrong: ["הווה","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'מיה שותה מים' - באיזה זמן הפועל?", answer: "הווה", wrong: ["עבר","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'מחר נצא לטיול' - באיזה זמן הפועל?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'רץ'?", answer: "הווה", wrong: ["עבר","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'רץ' ב'אתמול רץ בחצר'?", answer: "עבר", wrong: ["הווה","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "באיזה זמן הפועל 'אשחק'?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'הילדים משחקים בכדור' - באיזה זמן?", answer: "הווה", wrong: ["עבר","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'אמא אפתה עוגה אתמול' - באיזה זמן?", answer: "עבר", wrong: ["הווה","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "במשפט 'בערב נקרא סיפור' - באיזה זמן?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "המילה 'שמר' ב'הוא שמר על הסוד' - באיזה זמן?", answer: "עבר", wrong: ["הווה","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "המילה 'שומר' ב'השומר שומר על הבניין' - באיזה זמן?", answer: "הווה", wrong: ["עבר","עתיד","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "המילה 'אשמור' ב'אשמור על המחברת' - באיזה זמן?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
];

const GRAMMAR_EASY_POS = [
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא שם עצם?", answer: "ספר", wrong: ["קורא","יפה","מהר"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא פועל?", answer: "כותב", wrong: ["מחברת","גדול","בכיתה"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא שם תואר?", answer: "חכם", wrong: ["תלמיד","קורא","מחר"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא מילת מקום?", answer: "בבית", wrong: ["ילד","רץ","יפה"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא מילת זמן?", answer: "היום", wrong: ["שולחן","רץ","גדול"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר פועל: הילד ___ ספר.", answer: "קורא", wrong: ["ספר","גדול","בכיתה"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר שם עצם: ___ על השולחן.", answer: "המחברת", wrong: ["יפה","כותב","מהר"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר שם תואר: הפרח ___ .", answer: "יפה", wrong: ["רץ","כותב","שוחה"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא מילת קישור?", answer: "ו", wrong: ["בית","רץ","גדול"] },
  { subtopicId: "g3.tense_system_intro", question: "איזו מילה היא שם פרטי?", answer: "דני", wrong: ["רץ","גדול","מחר"] },
];

const GRAMMAR_EASY_CONNECTORS = [
  { subtopicId: "g3.connectors", question: "איזו מילה מחברת בין 'אכלתי' ל'שתיתי'?", answer: "ו", wrong: ["או","אם","כי"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'למדתי ___ שמחתי'?", answer: "ולכן", wrong: ["או","אבל","למרות"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'רציתי לצאת ___ ירד גשם'?", answer: "אבל", wrong: ["ו","לכן","גם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ ירד גשם, נשארנו בבית'?", answer: "כי", wrong: ["או","למרות","אם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ תסיים, תצא לשחק'?", answer: "כש", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'אכלתי ___ שתיתי'?", answer: "וגם", wrong: ["או","אבל","למרות"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ לא תתאמן, לא תשתפר'?", answer: "אם", wrong: ["ו","לכן","גם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ היה קר, לבשנו מעיל'?", answer: "כי", wrong: ["או","למרות","אם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'קודם אכלנו, ___ יצאנו לחצר'?", answer: "ואחר כך", wrong: ["או","אבל","למרות"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ כל הכיתה, כולם שמחו'?", answer: "כש", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד המילה 'כי'?", answer: "מסבירה סיבה", wrong: ["שואלת שאלה","מציינת מקום","מציינת זמן בלבד"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד המילה 'אבל'?", answer: "מראה ניגוד", wrong: ["מחברת רשימה","מציינת מקום","מסיימת משפט"] },
];

const GRAMMAR_EASY_PUNCT = [
  { subtopicId: "g3.connectors", question: "איזה סימן בסוף משפט שאלה?", answer: "?", wrong: [".","!",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן בסוף משפט רגיל?", answer: ".", wrong: ["?","!",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן מתאים בסוף: 'מה שמך'", answer: "?", wrong: [".","!",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן מתאים בסוף: 'הילדים משחקים בחצר'", answer: ".", wrong: ["?","!",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן מפריד בין מילים ברשימה?", answer: ",", wrong: [".","?","!"] },
  { subtopicId: "g3.connectors", question: "איזה סימן מתאים בסוף: 'איזה יום יפה'", answer: "!", wrong: [".","?",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן מתאים בסוף: 'האם אתה מוכן'", answer: "?", wrong: [".","!",","] },
  { subtopicId: "g3.connectors", question: "איזה סימן מתאים בסוף: 'תודה רבה'", answer: ".", wrong: ["?",",","!"] },
];

const GRAMMAR_EASY_AGREE = [
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הילדה הקטנה יושבת על הספסל", wrong: ["הילדה הקטנה יושב על הספסל", "הילדים יושבת על הספסל", "הילדה הקטנה יושבים על הספסל"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הילדים הגבוהים יושבים סביב השולחן", wrong: ["הילד הגבוה יושבים סביב השולחן", "הילדים הגבוהים יושב סביב השולחן", "הילדה הגבוהה יושבים סביב השולחן"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הספר מונח על המדף", wrong: ["הספרים מונח על המדף", "הספר מונחים על המדף", "הספר מונחת על המדף"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הספרים מונחים על המדף", wrong: ["הספר מונחים על המדף", "הספרים מונח על המדף", "הספרים מונחת על המדף"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "המורה מלמדת את השיעור", wrong: ["המורה מלמד את השיעור", "המורים מלמדת את השיעור", "המורה מלמדים את השיעור"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "התלמידים לומדים בכיתה", wrong: ["התלמיד לומדים בכיתה", "התלמידים לומד בכיתה", "התלמידה לומדים בכיתה"] },
  { subtopicId: "g3.binyan_light", question: "הכלב הקטן ___ בחצר.", answer: "רץ", wrong: ["רצה","רצים","רצות"] },
  { subtopicId: "g3.binyan_light", question: "הכלבים ___ ביחד.", answer: "רצים", wrong: ["רץ","רצה","רצות"] },
  { subtopicId: "g3.binyan_light", question: "הפרח היפה ___ בגינה.", answer: "גדל", wrong: ["גדלה","גדלים","גדלות"] },
  { subtopicId: "g3.binyan_light", question: "הפרחים ___ בגינה.", answer: "גדלים", wrong: ["גדל","גדלה","גדלות"] },
];

const GRAMMAR_EASY_BINYAN = [
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'כתב'?", answer: "כ.ת.ב", wrong: ["ק.ר.א","ל.מ.ד","ש.מ.ר"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'למד'?", answer: "ל.מ.ד", wrong: ["כ.ת.ב","ר.ץ","ש.ח.ק"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'שחק'?", answer: "ש.ח.ק", wrong: ["כ.ת.ב","ל.מ.ד","א.כ.ל"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'כתיבה'?", answer: "כותב", wrong: ["רץ","יפה","מחר"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'לימוד'?", answer: "לומד", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.binyan_light", question: "בבניין פעל - הפועל מראה פעולה ___ .", answer: "פשוטה", wrong: ["מורכבת מאוד","שם עצם","מילת זמן"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'מורה' ב'המורה מלמדת' - איזה חלק דיבור?", answer: "שם עצם", wrong: ["פועל","מילת קישור","שם תואר"] },
];

const GRAMMAR_MED_TENSE = [
  { subtopicId: "g3.tense_system_intro", question: "מה ההבדל: 'אכל' לעומת 'אוכל'?", answer: "עבר לעומת הווה", wrong: ["הווה לעומת עתיד","שם עצם לעומת פועל","אין הבדל"] },
  { subtopicId: "g3.tense_system_intro", question: "מה ההבדל: 'כתב' לעומת 'יכתוב'?", answer: "עבר לעומת עתיד", wrong: ["הווה לעומת עבר","שם תואר לעומת פועל","אותו זמן"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר משפט בעתיד: ___", answer: "מחר נבקר בספרייה", wrong: ["אתמול ביקרנו בספרייה","עכשיו אנחנו בספרייה","הספרייה גדולה"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר משפט בעבר: ___", answer: "אתמול אכלנו פיצה בבית", wrong: ["מחר נאכל","עכשיו אוכלים","אני רעב"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר משפט בהווה: ___", answer: "הילדים משחקים עכשיו", wrong: ["מחר ישחקו","אתמול שיחקו","המשחק יפה"] },
  { subtopicId: "g3.tense_system_intro", question: "'הוא רץ' ו'הוא רץ מחר' - באיזה משפט הפועל בעתיד?", answer: "הוא רץ מחר", wrong: ["הוא רץ","שניהם עבר","שניהם הווה"] },
  { subtopicId: "g3.tense_system_intro", question: "איזה משפט מתאר עבר?", answer: "אתמול ירד גשם", wrong: ["מחר ירד גשם","עכשיו יורד גשם","הגשם קר"] },
  { subtopicId: "g3.tense_system_intro", question: "איזה משפט מתאר עתיד?", answer: "בסוף השבוע נטייל", wrong: ["אתמול טיילנו","אנחנו מטיילים","הטיול ארוך"] },
  { subtopicId: "g3.tense_system_intro", question: "הפועל 'שיחק' - באיזה זמן?", answer: "עבר", wrong: ["הווה","עתיד","שם עצם"] },
  { subtopicId: "g3.tense_system_intro", question: "הפועל 'ישחק' - באיזה זמן?", answer: "עתיד", wrong: ["עבר","הווה","שם תואר"] },
];

const GRAMMAR_MED_CONN = [
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ עייפתי, המשכתי ללמוד'?", answer: "למרות ש", wrong: ["ו","לכן","כי"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'למדתי היטב, ___ קיבלתי ציון טוב'?", answer: "ולכן", wrong: ["אבל","למרות","או"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ תסיים, תוכל לצאת'?", answer: "כש", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ לא תשמור, תאבד'?", answer: "אם", wrong: ["ו","לכן","גם"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד 'לכן'?", answer: "מסיק מסקנה", wrong: ["שואל שאלה","מציין מקום","מחליף שם"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד 'למרות'?", answer: "מראה ניגוד", wrong: ["מחבר רשימה","מסביר סיבה","מציין זמן"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'אכלנו, ___ שתינו, ___ יצאנו'?", answer: "ואחר כך", wrong: ["אבל","למרות","אם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ היה חם, פתחנו חלון'?", answer: "כי", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: 'רציתי לשחק, ___ הייתי חולה'?", answer: "אבל", wrong: ["ו","לכן","גם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ תביא מחברת, ___ תביא עט'?", answer: "גם", wrong: ["אבל","למרות","אם"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד 'גם'?", answer: "מוסיף דבר נוסף", wrong: ["שולל","שואל","מציין מקום"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ תתאמץ, תצליח'?", answer: "אם", wrong: ["או","למרות","אבל"] },
];

const GRAMMAR_MED_AGREE = [
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הילדה החכמה יודעת את התשובה", wrong: ["הילדה החכמה יודע את התשובה", "הילדים יודעת את התשובה", "הילדה החכמה יודעים את התשובה"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הילדים שומעים את השיר", wrong: ["הילד שומעים את השיר", "הילדים שומע את השיר", "הילדה שומעים את השיר"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "המורה מסבירה לתלמידים", wrong: ["המורה מסביר לתלמידים", "המורים מסבירה לתלמידים", "המורה מסבירים לתלמידים"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "התלמידות עובדות בשקט", wrong: ["התלמידות עובד בשקט", "התלמיד עובדות בשקט", "התלמידות עובדים בשקט"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "העץ הגבוה עומד בגינה", wrong: ["העץ הגבוה עומדים בגינה", "העצים עומד בגינה", "העץ הגבוה עומדת בגינה"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "העצים עומדים לאורך השביל", wrong: ["העץ עומדים לאורך השביל", "העצים עומד לאורך השביל", "העצים עומדת לאורך השביל"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "החתולה יושבת על הכיסא", wrong: ["החתול יושבת על הכיסא", "החתולה יושב על הכיסא", "החתולים יושבת על הכיסא"] },
  { subtopicId: "g3.binyan_light", question: "הסוסים ___ בשדה.", answer: "רצים", wrong: ["רץ","רצה","רצות"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "המחברת נמצאת בתיק", wrong: ["המחברת נמצא בתיק", "המחברות נמצאת בתיק", "המחברת נמצאים בתיק"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הספרים נמצאים על המדף", wrong: ["הספר נמצאים על המדף", "הספרים נמצא על המדף", "הספרים נמצאת על המדף"] },
];

const GRAMMAR_MED_BINYAN = [
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'מלמד'?", answer: "י-ר-ה", wrong: ["כ-ת-ב", "ר-ו-צ", "א-כ-ל"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'ספר' (סיפר)?", answer: "ס.פ.ר", wrong: ["כ.ת.ב","ל.מ.ד","ש.מ.ר"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'כתיבה'?", answer: "מכתב", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'לימוד'?", answer: "תלמיד", wrong: ["שולחן","אדום","מעל"] },
  { subtopicId: "g3.binyan_light", question: "בבניין פעל הפועל מתאר ___ .", answer: "פעולה", wrong: ["מקום","צבע","מספר"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'מספר' (מספר סיפור) - מאיזה שורש?", answer: "ס.פ.ר", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'שומר' ו'שמירה' - מה משותף?", answer: "אותו שורש", wrong: ["אותו בניין בלבד","אין קשר","הם נרדפות"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'לומד' ו'לימוד' - מה משותף?", answer: "אותו שורש", wrong: ["אותו זמן","אין קשר","הם הפכים"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'אכל'?", answer: "א.כ.ל", wrong: ["ש.ת.ה","י.ש.ן","ר.ץ"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'שתה'?", answer: "ש.ת.ה", wrong: ["א.כ.ל","כ.ת.ב","ל.מ.ד"] },
];

const GRAMMAR_HARD_TENSE = [
  { subtopicId: "g3.tense_system_intro", question: "איזה משפט משלב עבר והווה?", answer: "אתמול למדתי, ועכשיו אני חוזר על החומר", wrong: ["מחר אלמד","הלימוד קשה","המורה מלמדת"] },
  { subtopicId: "g3.tense_system_intro", question: "איזה משפט מתאר עתיד?", answer: "כשאגדל, ארצה לעזור לאנשים", wrong: ["כשהייתי קטן","עכשיו אני עוזר","העזרה חשובה"] },
  { subtopicId: "g3.tense_system_intro", question: "'הוא כתב' לעומת 'הוא כותב' - מה ההבדל?", answer: "עבר לעומת הווה", wrong: ["עתיד לעומת עבר","אין הבדל","שם עצם לעומת פועל"] },
  { subtopicId: "g3.tense_system_intro", question: "'היא תלמד' - באיזה זמן?", answer: "עתיד", wrong: ["עבר","הווה","ציווי"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר את המשפט שמתאר תכנית לעתיד:", answer: "מחר נכין פרויקט", wrong: ["אתמול הכנו","עכשיו מכינים","הפרויקט גדול"] },
  { subtopicId: "g3.tense_system_intro", question: "בחר משפט שמתאר מה שכבר קרה:", answer: "לפני שבוע ביקרנו במוזיאון", wrong: ["מחר נבקר","אנחנו במוזיאון","המוזיאון יפה"] },
  { subtopicId: "g3.tense_system_intro", question: "הפועל 'דיבר' - באיזה זמן?", answer: "עבר", wrong: ["הווה","עתיד","שם תואר"] },
  { subtopicId: "g3.tense_system_intro", question: "הפועל 'ידבר' - באיזה זמן?", answer: "עתיד", wrong: ["עבר","הווה","מילת מקום"] },
];

const GRAMMAR_HARD_CONN = [
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ למדתי, ___ שכחתי'?", answer: "לפעמים", wrong: ["תמיד","לכן","ו"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ היה קשה, ___ הצלחנו'?", answer: "למרות ש", wrong: ["ו","או","כי"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ תשאל, ___ תדע'?", answer: "אם", wrong: ["אבל","למרות","או"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד 'אף על פי'?", answer: "מראה ניגוד", wrong: ["מחבר רשימה","שואל שאלה","מציין מקום"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ סיימנו, ___ חגגנו'?", answer: "כש", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ לא תתאמן, ___ לא תשתפר'?", answer: "אם", wrong: ["ו","לכן","גם"] },
  { subtopicId: "g3.connectors", question: "מה תפקיד 'לפני ש'?", answer: "מציין סדר בזמן", wrong: ["מציין מקום","שואל שאלה","מחליף שם"] },
  { subtopicId: "g3.connectors", question: "איזו מילה מתאימה: '___ אכלנו, ___ ישנתנו'?", answer: "ואחר כך", wrong: ["אבל","למרות","או"] },
];

const GRAMMAR_HARD_BINYAN = [
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'הסבר'?", answer: "ס.ב.ר", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'הזמנה' (הזמין)?", answer: "ז.מ.ן", wrong: ["כ.ת.ב","ל.מ.ד","ש.ח.ק"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'כתיבה'?", answer: "כתב", wrong: ["רץ","גדול","מעל"] },
  { subtopicId: "g3.binyan_light", question: "איזו מילה מאותה משפחה כמו 'שמירה'?", answer: "שומר", wrong: ["אדום","שולחן","מחר"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'מספר' ו'סיפור' - מה משותף?", answer: "שורש ס.פ.ר", wrong: ["אין קשר","אותו זמן","הם הפכים"] },
  { subtopicId: "g3.binyan_light", question: "המילה 'לומד' ו'מלמד' - מה משותף?", answer: "שורש ל.מ.ד", wrong: ["אין קשר","אותו בניין","הם נרדפות"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'ריצה'?", answer: "ר.ו.ץ", wrong: ["כ.ת.ב","א.כ.ל","י.ש.ן"] },
  { subtopicId: "g3.binyan_light", question: "מה שורש המילה 'אכילה'?", answer: "א.כ.ל", wrong: ["ש.ת.ה","ל.מ.ד","כ.ת.ב"] },
];

const GRAMMAR_HARD_AGREE = [
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "הילדות הקטנות משחקות יחד", wrong: ["הילדות הקטנות משחק יחד", "הילדים משחקות יחד", "הילדה הקטנה משחקות יחד"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "המורים כותבים על הלוח", wrong: ["המורה כותבים על הלוח", "המורים כותב על הלוח", "המורים כותבת על הלוח"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "התלמידה עונה על השאלה", wrong: ["התלמיד עונה על השאלה", "התלמידה עונים על השאלה", "התלמידות עונה על השאלה"] },
  { subtopicId: "g3.binyan_light", question: "הסוס הגדול ___ בשדה.", answer: "רץ", wrong: ["רצה","רצים","רצות"] },
  { subtopicId: "g3.binyan_light", question: "הדגים ___ במים.", answer: "שוחים", wrong: ["שוחה","שוחות","שוח"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "העננים עוברים בשמיים", wrong: ["הענן עוברים בשמיים", "העננים עובר בשמיים", "העננים עוברת בשמיים"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "המורה מלמדת את התלמידים", wrong: ["המורה מלמד את התלמידים", "המורים מלמדת את התלמידים", "המורה מלמדים את התלמידים"] },
  { subtopicId: "g3.tense_system_intro", question: "בחרו משפט נכון:", answer: "התלמידים מקשיבים בשקט", wrong: ["התלמיד מקשיבים בשקט", "התלמידים מקשיב בשקט", "התלמידה מקשיבים בשקט"] },
];

const VOCAB_EASY_FAMILIES = [
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'כתיבה'?", answer: "כותב", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'לימוד'?", answer: "לומד", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שמירה'?", answer: "שומר", wrong: ["יפה","מעל","תחת"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'אכילה'?", answer: "אוכל", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שתייה'?", answer: "שותה", wrong: ["כותב","יפה","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'ריצה'?", answer: "רץ", wrong: ["כתב","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שיחה'?", answer: "מדבר", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שמיעה'?", answer: "שומע", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'ציור'?", answer: "מצייר", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'קריאה'?", answer: "קורא", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'בישול'?", answer: "מבשל", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'ניקוי'?", answer: "מנקה", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'כתיבה'?", answer: "כ.ת.ב", wrong: ["ר.ץ","א.כ.ל","ל.מ.ד"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'לימוד'?", answer: "ל.מ.ד", wrong: ["כ.ת.ב","ר.ץ","ש.מ.ר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'שמירה'?", answer: "ש.מ.ר", wrong: ["כ.ת.ב","א.כ.ל","ר.ץ"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'אכילה'?", answer: "א.כ.ל", wrong: ["ש.ת.ה","כ.ת.ב","ל.מ.ד"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'ריצה'?", answer: "ר.ו.ץ", wrong: ["כ.ת.ב","א.כ.ל","י.ש.ן"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'שיחה'?", answer: "ד.ב.ר", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'מחשבה'?", answer: "חושב", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הליכה'?", answer: "הולך", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שינה'?", answer: "ישן", wrong: ["כותב","יפה","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'שמחה'?", answer: "שמח", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'עזרה'?", answer: "עוזר", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'בנייה'?", answer: "בונה", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'פתיחה'?", answer: "פותח", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'סגירה'?", answer: "סוגר", wrong: ["רץ","גדול","מחר"] },
];

const VOCAB_EASY_MEANING = [
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'גדול'?", answer: "לא קטן", wrong: ["לא יפה","לא מהיר","לא חם"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'מהיר'?", answer: "רץ מהר", wrong: ["איטי","יפה","קטן"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'יפה'?", answer: "נעים לעין", wrong: ["מכוער","גדול","קטן"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'חכם'?", answer: "יודע הרבה", wrong: ["טיפש","עייף","רעב"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'עייף'?", answer: "רוצה לנוח", wrong: ["שמח","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'רעב'?", answer: "רוצה לאכול", wrong: ["עייף","שמח","צמא"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'צמא'?", answer: "רוצה לשתות", wrong: ["רעב","עייף","שמח"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'שמח'?", answer: "מרגיש טוב", wrong: ["עצוב","כועס","עייף"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'עצוב'?", answer: "לא שמח", wrong: ["כועס","רעב","עייף"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'כועס'?", answer: "לא מרוצה", wrong: ["שמח","עייף","רעב"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'חם'?", answer: "טמפרטורה גבוהה", wrong: ["קר","רטוב","יבש"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'קר'?", answer: "טמפרטורה נמוכה", wrong: ["חם","רטוב","יבש"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'רטוב'?", answer: "יש בו מים", wrong: ["יבש","חם","קר"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'יבש'?", answer: "אין בו מים", wrong: ["רטוב","חם","קר"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'נקי'?", answer: "אין בו לכלוך", wrong: ["מלוכלך","רטוב","יבש"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'מלוכלך'?", answer: "יש בו לכלוך", wrong: ["נקי","יבש","רטוב"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'חזק'?", answer: "עם כוח", wrong: ["חלש","קטן","איטי"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'חלש'?", answer: "בלי הרבה כוח", wrong: ["חזק","גדול","מהיר"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'קל'?", answer: "לא כבד", wrong: ["כבד","גדול","ארוך"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'כבד'?", answer: "לא קל", wrong: ["קל","קטן","קצר"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'ארוך'?", answer: "יש לו הרבה אורך", wrong: ["נמוך מאוד", "כבד", "צר"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'קצר'?", answer: "יש לו מעט אורך", wrong: ["גבוה", "כבד", "רחב"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'רחב'?", answer: "לא צר", wrong: ["צר","קצר","דק"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'צר'?", answer: "לא רחב", wrong: ["רחב","ארוך","גדול"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'עמוק'?", answer: "יש בו הרבה עומק", wrong: ["רחב", "גבוה", "קל"] },
  { subtopicId: "g3.context_meaning", question: "מה פירוש 'רדוד'?", answer: "יש בו מעט עומק", wrong: ["רחב", "ארוך", "כבד"] },
];

const VOCAB_MED_SYN = [
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'שמח'?", answer: "מאושר", wrong: ["עצוב","כועס","עייף"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'יפה'?", answer: "נאה", wrong: ["מכוער","גדול","קטן"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'גדול'?", answer: "ענק", wrong: ["קטן","דק","קצר"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'קטן'?", answer: "זעיר", wrong: ["גדול","ארוך","רחב"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'מהיר'?", answer: "זריז", wrong: ["איטי","עייף","חלש"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'חכם'?", answer: "נבון", wrong: ["טיפש","עייף","רעב"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'עייף'?", answer: "תשוש", wrong: ["שמח","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'נקי'?", answer: "מסודר", wrong: ["מלוכלך","רטוב","יבש"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'חזק'?", answer: "אמיץ", wrong: ["חלש","קטן","איטי"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'שקט'?", answer: "שקט ורגוע", wrong: ["רועש","כועס","מהיר"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'רועש'?", answer: "מרעיש", wrong: ["שקט","עייף","רעב"] },
  { subtopicId: "g3.context_meaning", question: "מה נרדף ל'חם'?", answer: "חמים", wrong: ["קר","רטוב","יבש"] },
];

const VOCAB_MED_ANT = [
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'גדול'?", answer: "קטן", wrong: ["יפה","מהיר","חם"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'שמח'?", answer: "עצוב", wrong: ["רעב","עייף","צמא"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'חם'?", answer: "קר", wrong: ["רטוב","יבש","נקי"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'מהיר'?", answer: "איטי", wrong: ["גדול","יפה","חזק"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'חזק'?", answer: "חלש", wrong: ["גדול","מהיר","יפה"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'נקי'?", answer: "מלוכלך", wrong: ["רטוב","יבש","חם"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'קל'?", answer: "כבד", wrong: ["קצר","צר","דק"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'ארוך'?", answer: "קצר", wrong: ["רחב","עמוק","גבוה"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'רחב'?", answer: "צר", wrong: ["ארוך","עמוק","גבוה"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'עמוק'?", answer: "רדוד", wrong: ["ארוך","רחב","גבוה"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'חכם'?", answer: "טיפש", wrong: ["עייף","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "מה ההפך מ'שקט'?", answer: "רועש", wrong: ["עייף","רעב","צמא"] },
];

const VOCAB_MED_FAMILIES = [
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הסבר'?", answer: "מסביר", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הזמנה'?", answer: "מזמין", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'בחירה'?", answer: "בוחר", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הגנה'?", answer: "מגן", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'הסבר'?", answer: "ס.ב.ר", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'בחירה'?", answer: "ב.ח.ר", wrong: ["כ.ת.ב","ל.מ.ד","ש.מ.ר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'הגנה'?", answer: "ג.נ.ן", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'תקווה'?", answer: "מקווה", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'אהבה'?", answer: "אוהב", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'פחד'?", answer: "פוחד", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'גילוי'?", answer: "גילה", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הקשבה'?", answer: "מקשיב", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'אהבה'?", answer: "א.ה.ב", wrong: ["כ.ת.ב","ר.ץ","ל.מ.ד"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'פחד'?", answer: "פ.ח.ד", wrong: ["כ.ת.ב","א.כ.ל","ש.מ.ר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'תקווה'?", answer: "ק.ו.ו", wrong: ["כ.ת.ב","ר.ץ","ל.מ.ד"] },
];

const VOCAB_MED_CLOZE = [
  { subtopicId: "g3.context_meaning", question: "הילדים ___ בחצר אחרי השיעור.", answer: "משחקים", wrong: ["ישנים","אוכלים","רחצים"] },
  { subtopicId: "g3.context_meaning", question: "המורה ___ את השיעור בבהירות.", answer: "מסבירה", wrong: ["רצה","ישנה","אוכלת"] },
  { subtopicId: "g3.context_meaning", question: "אחרי הריצה הרגשתי ___.", answer: "עייף", wrong: ["שמח","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "השמש ___ בבוקר.", answer: "זורחת", wrong: ["יורדת","ישנה","אוכלת"] },
  { subtopicId: "g3.context_meaning", question: "הגשם ___ על הגג.", answer: "יורד", wrong: ["עולה","רץ","כותב"] },
];

const VOCAB_HARD_COMPARE = [
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'בית' לעומת 'דירה'?", answer: "בית גדול יותר", wrong: ["אותו דבר","דירה גדולה יותר","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'נהר' לעומת 'נחל'?", answer: "נהר גדול יותר", wrong: ["נחל גדול יותר","אותו דבר","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'יער' לעומת 'חורש'?", answer: "יער גדול יותר", wrong: ["חורש גדול יותר","אותו דבר","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'שמח' לעומת 'מרוצה'?", answer: "שמח - רגש, מרוצה - מהתוצאה", wrong: ["אותו דבר","הפכים","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'ללמוד' לעומת 'לשנן'?", answer: "לשנן - לזכור בעל פה", wrong: ["אותו דבר","ללמוד - רק לקרוא","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'לשאול' לעומת 'לבקש'?", answer: "לשאול - שאלה, לבקש - בקשה", wrong: ["אותו דבר","הפכים","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'לעזור' לעומת 'להציל'?", answer: "להציל - במצב חירום", wrong: ["אותו דבר","לעזור - רק במשחק","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'לחשוב' לעומת 'לדמיין'?", answer: "לדמיין - בתוך הראש", wrong: ["אותו דבר","לחשוב - רק בכתב","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'רך' לעומת 'רך לעיסה'?", answer: "רך לעיסה - אוכל", wrong: ["אותו דבר","רך - רק בגד","אין קשר"] },
  { subtopicId: "g3.context_meaning", question: "מה ההבדל: 'כוכב' לעומת 'כוכב לכת'?", answer: "כוכב לכת - בחלל", wrong: ["אותו דבר","כוכב - רק בים","אין קשר"] },
];

const VOCAB_HARD_CLOZE = [
  { subtopicId: "g3.context_meaning", question: "למרות שהיה ___, המשיך ללמוד.", answer: "עייף", wrong: ["שמח","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "___ ירד גשם, יצאנו עם מטריות.", answer: "כש", wrong: ["או","למרות","אם לא"] },
  { subtopicId: "g3.context_meaning", question: "הספר ___ על המדף כבר שבוע.", answer: "נמצא", wrong: ["רץ","אוכל","ישן"] },
  { subtopicId: "g3.context_meaning", question: "הילדים ___ יחד על הפרויקט.", answer: "עבדו", wrong: ["ישנו","רחצו","אכלו"] },
  { subtopicId: "g3.context_meaning", question: "המורה ___ לנו לשאול שאלות.", answer: "עודדה", wrong: ["ישנה","רצה","אכלה"] },
  { subtopicId: "g3.context_meaning", question: "___ למדתי, קיבלתי ציון טוב.", answer: "לכן", wrong: ["או","למרות","אם"] },
  { subtopicId: "g3.context_meaning", question: "החתול ___ על הגדר וצפה בציפורים.", answer: "ישב", wrong: ["שחה","כתב","אכל"] },
  { subtopicId: "g3.context_meaning", question: "אחרי האימון הרגשתי ___ .", answer: "עייף", wrong: ["שמח","רעב","צמא"] },
  { subtopicId: "g3.context_meaning", question: "העננים ___ והשמש יצאה.", answer: "פיזרו", wrong: ["ישנו","אכלו","כתבו"] },
  { subtopicId: "g3.context_meaning", question: "___ לא תתאמץ, לא תשתפר.", answer: "אם", wrong: ["ו","לכן","גם"] },
];

const VOCAB_HARD_FAMILIES = [
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'הסבר' ו'מסביר'?", answer: "ס.ב.ר", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'בחירה' ו'בוחר'?", answer: "ב.ח.ר", wrong: ["כ.ת.ב","ל.מ.ד","ש.מ.ר"] },
  { subtopicId: "g3.word_families", question: "מה שורש המילה 'הגנה' ו'מגן'?", answer: "ג.נ.ן", wrong: ["כ.ת.ב","ר.ץ","א.כ.ל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'גילוי'?", answer: "גילה", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'הקשבה'?", answer: "מקשיב", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'תקווה'?", answer: "מקווה", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'אהבה'?", answer: "אוהב", wrong: ["אדום","שולחן","מעל"] },
  { subtopicId: "g3.word_families", question: "איזו מילה מאותה משפחה כמו 'פחד'?", answer: "פוחד", wrong: ["רץ","גדול","מחר"] },
  { subtopicId: "g3.word_families", question: "המילה 'כתב' ו'מכתב' - מה משותף?", answer: "שורש כ.ת.ב", wrong: ["אין קשר","אותו זמן","הם הפכים"] },
  { subtopicId: "g3.word_families", question: "המילה 'למד' ו'תלמיד' - מה משותף?", answer: "שורש ל.מ.ד", wrong: ["אין קשר","אותו בניין","הם נרדפות"] },
  { subtopicId: "g3.word_families", question: "המילה 'שמר' ו'שמירה' - מה משותף?", answer: "שורש ש.מ.ר", wrong: ["אין קשר","אותו זמן","הם הפכים"] },
  { subtopicId: "g3.word_families", question: "המילה 'אכל' ו'אוכל' - מה משותף?", answer: "שורש א.כ.ל", wrong: ["אין קשר","אותו בניין","הם נרדפות"] },
];

const VOCAB_CONTEXT_EXTRAS = [
  { subtopicId: "g3.context_meaning", question: "דני החזיק את המטריה כי ___ .", answer: "ירד גשם", wrong: ["היה חם","היה שמש","היה יבש"] },
  { subtopicId: "g3.context_meaning", question: "מיה חיפשה את המפתחות ___ .", answer: "בכל הבית", wrong: ["בים","בשמיים","בכיתה בלבד"] },
  { subtopicId: "g3.context_meaning", question: "הילדים שתו מים ___ .", answer: "אחרי הריצה", wrong: ["לפני השינה","בזמן מבחן","בלי לצאת"] },
  { subtopicId: "g3.context_meaning", question: "המורה כתבה על הלוח ___ .", answer: "מילות חדשות", wrong: ["מתכון לעוגה","מספר טלפון","שמות בלבד"] },
  { subtopicId: "g3.context_meaning", question: "החתול ישן ___ .", answer: "על הספה", wrong: ["בים","בגינה","על הלוח"] },
  { subtopicId: "g3.context_meaning", question: "נועה החזירה ספר ___ .", answer: "לספרייה", wrong: ["לים","לחנות","לגג"] },
  { subtopicId: "g3.context_meaning", question: "אביב אסף עלים ___ .", answer: "לפרויקט בכיתה", wrong: ["למכור","לזרוק","לצבוע קיר"] },
  { subtopicId: "g3.context_meaning", question: "הכיתה ביקרה ___ .", answer: "במוזיאון", wrong: ["בים","בחנות","בגג"] },
  { subtopicId: "g3.context_meaning", question: "הילדים הקשיבו ___ .", answer: "לסיפור של המורה", wrong: ["לרעש רחוב","לכדור","לבלון"] },
  { subtopicId: "g3.context_meaning", question: "תמר ציירה ___ .", answer: "נוף מהחלון", wrong: ["על הקיר","בים","ברחוב"] },
  { subtopicId: "g3.context_meaning", question: "עומר שם את המחברת ___ .", answer: "בתיק", wrong: ["בים","בגג","ברחוב"] },
  { subtopicId: "g3.context_meaning", question: "הילדים אכלו ___ .", answer: "ארוחת צהריים בחדר האוכל", wrong: ["בים","בכיתה בלי אוכל","ברחוב"] },
  { subtopicId: "g3.context_meaning", question: "המורה פתחה את החלון ___ .", answer: "כי היה חם", wrong: ["כי ירד שלג","כי התלמידים ישנים","כי אין חלון"] },
  { subtopicId: "g3.context_meaning", question: "הכלב רץ ___ .", answer: "אחרי הכדור", wrong: ["על הלוח","בספר","במחברת"] },
  { subtopicId: "g3.context_meaning", question: "הילדה חייכה ___ .", answer: "אחרי שקיבלה מחמאה", wrong: ["לפני שינה","בזמן מבחן","בלי סיבה"] },
];

function buildVocabContextExtras() {
  return rowsFrom(VOCAB_CONTEXT_EXTRAS, "vocabulary", "medium", "g3_context_sentence", "ctx_extra");
}

function buildG3GrammarPool() {
  return [
    ...rowsFrom(GRAMMAR_EASY_TENSE, "grammar", "easy", "g3_tense_id", "tense_easy"),
    ...rowsFrom(GRAMMAR_EASY_POS, "grammar", "easy", "g3_part_of_speech", "pos_easy"),
    ...rowsFrom(GRAMMAR_EASY_CONNECTORS, "grammar", "easy", "g3_connectors", "conn_easy"),
    ...rowsFrom(GRAMMAR_EASY_PUNCT, "grammar", "easy", "g3_punctuation", "punct_easy"),
    ...rowsFrom(GRAMMAR_EASY_AGREE, "grammar", "easy", "g3_agreement", "agree_easy"),
    ...rowsFrom(GRAMMAR_EASY_BINYAN, "grammar", "easy", "g3_binyan_intro", "binyan_easy"),
    ...rowsFrom(GRAMMAR_MED_TENSE, "grammar", "medium", "g3_tense_compare", "tense_med"),
    ...rowsFrom(GRAMMAR_MED_CONN, "grammar", "medium", "g3_connectors", "conn_med"),
    ...rowsFrom(GRAMMAR_MED_AGREE, "grammar", "medium", "g3_agreement", "agree_med"),
    ...rowsFrom(GRAMMAR_MED_BINYAN, "grammar", "medium", "g3_binyan_intro", "binyan_med"),
    ...rowsFrom(GRAMMAR_HARD_TENSE, "grammar", "hard", "g3_tense_compare", "tense_hard"),
    ...rowsFrom(GRAMMAR_HARD_CONN, "grammar", "hard", "g3_connectors", "conn_hard"),
    ...rowsFrom(GRAMMAR_HARD_BINYAN, "grammar", "hard", "g3_binyan_intro", "binyan_hard"),
    ...rowsFrom(GRAMMAR_HARD_AGREE, "grammar", "hard", "g3_agreement", "agree_hard"),
  ];
}

function buildG3VocabularyPool() {
  return [
    ...rowsFrom(VOCAB_EASY_FAMILIES, "vocabulary", "easy", "g3_word_family", "fam_easy"),
    ...rowsFrom(VOCAB_EASY_MEANING, "vocabulary", "easy", "g3_meaning", "mean_easy"),
    ...rowsFrom(VOCAB_MED_SYN, "vocabulary", "medium", "g3_synonym", "syn_med"),
    ...rowsFrom(VOCAB_MED_ANT, "vocabulary", "medium", "g3_antonym", "ant_med"),
    ...rowsFrom(VOCAB_MED_FAMILIES, "vocabulary", "medium", "g3_word_family", "fam_med"),
    ...rowsFrom(VOCAB_MED_CLOZE, "vocabulary", "medium", "g3_cloze", "cloze_med"),
    ...buildVocabContextExtras(),
    ...rowsFrom(VOCAB_HARD_COMPARE, "vocabulary", "hard", "g3_compare_words", "cmp_hard"),
    ...rowsFrom(VOCAB_HARD_CLOZE, "vocabulary", "hard", "g3_cloze", "cloze_hard"),
    ...rowsFrom(VOCAB_HARD_FAMILIES, "vocabulary", "hard", "g3_word_family", "fam_hard"),
  ];
}

export const HEBREW_G3_GRAMMAR_POOL = buildG3GrammarPool();
export const HEBREW_G3_VOCABULARY_POOL = buildG3VocabularyPool();

/**
 * Hebrew G2 gap-fill MCQs — unique stems for inventory targets (Phase 3B).
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
  const seed = serial * 23 + def.topic.length * 3;
  const { answers, correct } = fourOptions(def.answer, def.wrong, seed);
  return {
    topic: def.topic,
    minGrade: 2,
    maxGrade: 2,
    levels: def.levels,
    patternFamily: def.patternFamily,
    subtype: def.subtype,
    question: `בנק ב׳ · ${serial}: ${def.question}`,
    answers,
    correct,
  };
}

/** @type {Array<{ topic: string, levels: string[], patternFamily: string, subtype: string, question: string, answer: string, wrong: string[] }>} */
const G2_GAP_DEFS = [
  // comprehension easy (+16)
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "נועם שם את המחברת ב___.", answer: "תיק", wrong: ["שולחן", "חלון", "רצפה"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הילדה מחזירה ספר ל___.", answer: "ספרייה", wrong: ["ים", "רחוב", "גג"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "התלמידים יושבים בשורות ב___.", answer: "כיתה", wrong: ["ים", "שמיים", "יער"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "המורה כותבת על ___.", answer: "לוח", wrong: ["רוח", "מים", "אש"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הילדים שותים מים אחרי ___.", answer: "הפסקה", wrong: ["שינה", "חג", "חופשה ארוכה"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "החתול ישן על ___.", answer: "ספה", wrong: ["ים", "שמיים", "אש"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הספרנית עוזרת למצוא ___.", answer: "ספר", wrong: ["כדור", "בלון", "צעצוע"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "התלמיד מחדד ___.", answer: "עפרון", wrong: ["מברג", "מפתח", "כפכף"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הילדה מציירת עם ___.", answer: "צבעים", wrong: ["מים בלבד", "אבנים", "חול בלבד"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הכלב שוחה ב___.", answer: "בריכה", wrong: ["אוויר", "עץ", "נייר"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "השמש זורחת ב___.", answer: "בוקר", wrong: ["חצות", "לילה עמוק", "תחת מים"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הגשם יורד ב___.", answer: "חורף", wrong: ["תמיד בקיץ", "רק בים", "רק בכיתה"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "התלמידים מקשיבים ל___.", answer: "מורה", wrong: ["כדור", "בלון", "רעש רחוב"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "האחות הקטנה משחקת עם ___.", answer: "בובה", wrong: ["מברג", "פטיש", "מקדחה"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "האבא קורא ___.", answer: "עיתון", wrong: ["כדור", "בלון", "צעצוע"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "האמא אופה ___.", answer: "עוגה", wrong: ["נייר", "אבן", "חול"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "התלמיד מחזיר עט ל___.", answer: "קלמר", wrong: ["ים", "רחוב", "גג"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הילדים אוספים פחיות ל___.", answer: "מיחזור", wrong: ["זריקה", "שריפה", "איבוד"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הפרחים גדלים ב___.", answer: "גינה", wrong: ["ים", "שמיים", "כיתה סגורה"] },
  { topic: "comprehension", levels: ["easy"], patternFamily: "g2_detail_main_idea", subtype: "gap_detail_easy", question: "הדגים חיים ב___.", answer: "מים", wrong: ["אוויר", "חול", "עץ"] },

  // comprehension medium (+15)
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה תלמיד מחייך אחרי ציון טוב?", answer: "כי שמח", wrong: ["כי עייף", "כי כועס", "כי רעב"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה סוגרים חלון כשקר?", answer: "לשמור על חום", wrong: ["לקרר", "לשמוע רעש", "לפתוח גינה"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מחכים בתור בקופת החלב?", answer: "לתת לכל אחד תור", wrong: ["לדחוף", "לצעוק", "לברוח"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה שותפים לחבר בפרויקט?", answer: "כדי להצליח יחד", wrong: ["כדי לריב", "כדי לישון", "כדי לברוח"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מנקים את הכיתה בסוף יום?", answer: "כדי שיהיה נעים מחר", wrong: ["כדי ללכלך", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה שואלים לפני שמשאילים?", answer: "כי מכבדים", wrong: ["כי שוכחים", "כי כועסים", "כי רצים"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מחזירים ספר אחרי קריאה?", answer: "כדי שאחרים יקראו", wrong: ["כדי לקרוע", "כדי לאבד", "כדי לזרוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה לובשים סינר בציור?", answer: "כדי לא להתלכלך", wrong: ["כדי לישון", "כדי לרוץ", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מקשיבים להוראות בטיחות?", answer: "כדי להישאר בטוחים", wrong: ["כדי להתעלם", "כדי לרוץ", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה משתפים צעצוע בגן?", answer: "כדי לשחק יחד", wrong: ["כדי לריב", "כדי לישון", "כדי לברוח"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מבקשים עזרה כשלא מבינים?", answer: "כדי להבין", wrong: ["כדי לבכות", "כדי לברוח", "כדי לישון"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה שומרים על שקט בספרייה?", answer: "כדי לא להפריע", wrong: ["כדי לצעוק", "כדי לרוץ", "כדי לשחק כדור"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מכבים אור כשיוצאים מהחדר?", answer: "כדי לחסוך חשמל", wrong: ["כדי להחשיך לתמיד", "כדי לשבור נורה", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מחזירים כסף עודף?", answer: "כי זה נכון", wrong: ["כדי להתחבא", "כדי לצעוק", "כדי לישון"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מכינים רשימת קניות?", answer: "כדי לא לשכוח", wrong: ["כדי לישון", "כדי לרוץ", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מסדרים את התיק בערב?", answer: "כדי להיות מוכנים", wrong: ["כדי לאבד דברים", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מביאים מעיל לטיול בגשם?", answer: "כדי לא להתרטב", wrong: ["כדי להתחמם בקיץ", "כדי לשחות", "כדי לישון"] },
  { topic: "comprehension", levels: ["medium"], patternFamily: "g2_light_inference", subtype: "gap_inference_med", question: "למה מחמיאים לחבר על עבודה יפה?", answer: "כדי לעודד", wrong: ["כדי לצעוק", "כדי לריב", "כדי לישון"] },

  // comprehension hard (+12)
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "מה קודם: לשטוף ידיים או לאכול ארוחת בוקר?", answer: "לשטוף ידיים", wrong: ["לאכול ארוחת בוקר", "לישון", "לרוץ"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "מה קודם: לפתוח ספר או לקרוא עמוד?", answer: "לפתוח ספר", wrong: ["לקרוא עמוד", "לסגור תיק", "לצעוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "מה קודם: ללבוש נעליים או לצאת מהבית?", answer: "ללבוש נעליים", wrong: ["לצאת מהבית", "לישון", "לאכול"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "מה קודם: לבקש רשות או לקום מהמקום?", answer: "לבקש רשות", wrong: ["לקום מהמקום", "לצעוק", "לרוץ"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "מה קודם: לתכנן עבודה או לבצע אותה?", answer: "לתכנן עבודה", wrong: ["לבצע אותה", "לישון", "לצעוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה מחכים לתור אצל הרופא?", answer: "כדי לקבל טיפול", wrong: ["כדי לשחק", "כדי לצעוק", "כדי לברוח"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה בודקים שיש עט לפני מבחן?", answer: "כדי להיות מוכנים", wrong: ["כדי לאבד", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה מסכמים סיפור בסוף?", answer: "כדי לזכור את העיקר", wrong: ["כדי לשכוח", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה משתפים פעולה בניקיון?", answer: "כדי לסיים מהר יותר", wrong: ["כדי ללכלך", "כדי לישון", "כדי לצעוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה מחזירים ציוד לבית הספר?", answer: "כדי שיהיה לכולם", wrong: ["כדי לאבד", "כדי לשבור", "כדי לזרוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה קוראים הוראות לפני משחק חדש?", answer: "כדי לדעת את החוקים", wrong: ["כדי לישון", "כדי לצעוק", "כדי לברוח"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה מסמנים דף חשוב במחברת?", answer: "כדי למצוא אותו", wrong: ["כדי לקרוע", "כדי לאבד", "כדי לזרוק"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה מכינים שאלות לפני שיחה עם מורה?", answer: "כדי לשאול בבהירות", wrong: ["כדי לישון", "כדי לצעוק", "כדי לברוח"] },
  { topic: "comprehension", levels: ["hard"], patternFamily: "g2_simple_sequence", subtype: "gap_sequence_hard", question: "למה בודקים תאריך לפני מבחן?", answer: "כדי להתכונן", wrong: ["כדי לשכוח", "כדי לישון", "כדי לצעוק"] },

  // grammar easy (+17)
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה היא שם עצם?", answer: "בית", wrong: ["הולך", "יפה", "מהר"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה היא פועל?", answer: "כותב", wrong: ["מחברת", "גדול", "בכיתה"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה היא שם תואר?", answer: "חכם", wrong: ["תלמיד", "קורא", "מחר"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה היא מילת מקום?", answer: "בבית", wrong: ["ילד", "רץ", "יפה"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה היא מילת זמן?", answer: "היום", wrong: ["שולחן", "רץ", "גדול"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר פועל: הילד ___ ספר.", answer: "קורא", wrong: ["ספר", "גדול", "בכיתה"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר פועל: הילדה ___ מים.", answer: "שותה", wrong: ["כותב", "ישן", "צוחק"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר שם: ___ רץ בחצר.", answer: "הכלב", wrong: ["יפה", "במהר", "כי"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר שם תואר: הפרח ___ .", answer: "יפה", wrong: ["רץ", "כותב", "שוחה"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזה סימן בסוף משפט שאלה?", answer: "?", wrong: [".", "!", ","] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזה סימן בסוף משפט רגיל?", answer: ".", wrong: ["?", "!", ","] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "מה רבים של 'ספר'?", answer: "ספרים", wrong: ["ספרות", "ספר", "ספרה"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "מה רבים של 'ילד'?", answer: "ילדים", wrong: ["ילדות", "ילדה", "ילד"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה מציינת ילדה?", answer: "הילדה", wrong: ["הילד", "הכלב", "הספר"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה מציינת ילד?", answer: "הילד", wrong: ["הילדה", "הפרח", "השולחן"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר מילת קישור: אני אוכל ___ שותה.", answer: "ו", wrong: ["או", "אם", "כי"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר מילה נכונה: הכלב ___ בגינה.", answer: "רץ", wrong: ["רצה", "רצים", "רצה בים"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "בחר מילה נכונה: הילדה ___ ספר.", answer: "קוראת", wrong: ["קורא", "קוראים", "קרא"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה לא שייכת לקבוצת חיות?", answer: "שולחן", wrong: ["כלב", "חתול", "דג"] },
  { topic: "grammar", levels: ["easy"], patternFamily: "g2_pos_basic", subtype: "gap_pos_easy", question: "איזו מילה לא שייכת לקבוצת צבעים?", answer: "רץ", wrong: ["אדום", "כחול", "ירוק"] },

  // grammar medium (+27)
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון לילד:", answer: "הילד משחק בחצר", wrong: ["הילד משחקת בחצר", "הילדה משחק בחצר", "הילדים משחק בחצר"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון לילדה:", answer: "הילדה כותבת במחברת", wrong: ["הילדה כותב במחברת", "הילד כותבת במחברת", "הילדים כותבת במחברת"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון לרבים:", answer: "הילדים קוראים ספר", wrong: ["הילדים קורא ספר", "הילד קוראים ספר", "הילדה קוראים ספר"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר צירוף נכון עם המילה תפוחים:", answer: "שני תפוחים", wrong: ["שני תפוח", "שתי תפוחים", "שני תפוחה"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר צירוף נכון עם המילה ספרים:", answer: "שלושה ספרים", wrong: ["שלוש ספרים", "שלושה ספר", "שלוש ספר"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר צירוף נכון עם המילה בנות:", answer: "שתי בנות", wrong: ["שני בנות", "שתי בן", "שני בן"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר צירוף נכון עם המילה ילדים:", answer: "ארבעה ילדים", wrong: ["ארבע ילדים", "ארבעה ילד", "ארבע ילד"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון:", answer: "אני הולך לבית הספר", wrong: ["אני הולכת לבית הספר", "אני הולך לבית ספר", "אני הולך בית הספר"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון:", answer: "היא שותה מים", wrong: ["הוא שותה מים", "היא שותה מים?", "היא שותה מים."] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון:", answer: "הם משחקים בחצר", wrong: ["הם משחק בחצר", "הוא משחקים בחצר", "היא משחקים בחצר"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר פועל: התלמידים ___ בשקט.", answer: "יושבים", wrong: ["יושב", "יושבת", "יושבות"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר פועל: המורה ___ שיעור.", answer: "מלמדת", wrong: ["מלמד", "מלמדים", "לומדת"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר פועל: הילדים ___ מים.", answer: "שותים", wrong: ["שותה", "שותב", "שותות"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר פועל: החתולה ___ על הספה.", answer: "ישנה", wrong: ["ישן", "ישנים", "ישנות"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "איזו מילה לא שייכת לקבוצת פעולות?", answer: "שולחן", wrong: ["רץ", "הולך", "קופץ"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "איזו מילה לא שייכת לקבוצת מקצועות?", answer: "ירוק", wrong: ["רופא", "מורה", "שף"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "איזו מילה לא שייכת לקבוצת כלי תחבורה?", answer: "תפוח", wrong: ["אוטובוס", "רכבת", "אופניים"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט מסודר: מילים - קורא, הילד, ספר.", answer: "הילד קורא ספר", wrong: ["קורא הילד ספר", "ספר קורא הילד", "קורא ספר הילד"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט מסודר: מילים - מים, שותה, הילדה.", answer: "הילדה שותה מים", wrong: ["שותה הילדה מים", "מים שותה הילדה", "שותה מים הילדה"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט מסודר: מילים - אוכל, אמא, מכינה.", answer: "אמא מכינה אוכל", wrong: ["מכינה אמא אוכל", "אוכל מכינה אמא", "מכינה אוכל אמא"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט מסודר: מילים - בגינה, רץ, הכלב.", answer: "הכלב רץ בגינה", wrong: ["רץ הכלב בגינה", "בגינה רץ הכלב", "רץ בגינה הכלב"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "איזה סימן מפריד בין משפטים?", answer: ".", wrong: ["?", "!", "-"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "איזה סימן מפריד בין פריטים ברשימה?", answer: ",", wrong: [".", "?", "!"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר מילת יחס: הכדור ___ השולחן.", answer: "על", wrong: ["מאחורי", "ליד", "תחת"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר מילת יחס: הילד הולך ___ בית הספר.", answer: "ל", wrong: ["מ", "עם", "אל"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר מילת יחס: הספר נמצא ___ התיק.", answer: "ב", wrong: ["ל", "מ", "על"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "מה רבים של 'מורה'?", answer: "מורים", wrong: ["מורות", "מורה", "מורהים"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "מה רבים של 'כיסא'?", answer: "כיסאות", wrong: ["כיסא", "כיסאי", "כיסאה"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "מה רבים של 'פרח'?", answer: "פרחים", wrong: ["פרחות", "פרח", "פרחה"] },
  { topic: "grammar", levels: ["medium"], patternFamily: "g2_number_gender_light", subtype: "gap_agreement_med", question: "בחר משפט נכון לעבר:", answer: "אתמול הלכנו לגן", wrong: ["מחר הלכנו לגן", "עכשיו הלכנו לגן", "תמיד הלכנו לגן"] },

  // grammar hard (+20)
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "הלכנו לים ביום שעבר. מתי זה היה?", answer: "אתמול", wrong: ["מחר", "עכשיו", "תמיד"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "נלך לספרייה ביום הבא. מתי זה יהיה?", answer: "מחר", wrong: ["אתמול", "לפני שנה", "אתמול בלילה"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "אני ___ עכשיו במחברת.", answer: "כותב", wrong: ["כתבתי", "אכתוב", "כתב"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "אתמול ___ סיפור ארוך.", answer: "קראתי", wrong: ["קורא", "אקרא", "קרא"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "מחר ___ לבית הספר.", answer: "אלך", wrong: ["הלכתי", "הולך", "הלכת"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט בעבר:", answer: "אתמול שיחקנו בחצר", wrong: ["מחר נשחק בחצר", "עכשיו נשחק בחצר", "תמיד נשחק בחצר"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט בעתיד:", answer: "מחר נבקר את הסבא", wrong: ["אתמול ביקרנו את הסבא", "אתמול נבקר את הסבא", "עכשיו ביקרנו את הסבא"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט בהווה:", answer: "הילדים לומדים עכשיו", wrong: ["הילדים למדו אתמול", "הילדים ילמדו מחר", "הילדים למדו מחר"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "איזו מילה לא שייכת לקבוצת זמנים?", answer: "שולחן", wrong: ["אתמול", "היום", "מחר"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "איזו מילה לא שייכת לקבוצת פעולות בעבר?", answer: "ספר", wrong: ["הלכתי", "אכלתי", "קראתי"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר צירוף נכון עם המילה ילדות:", answer: "שתי ילדות", wrong: ["שני ילדות", "שתי ילד", "שני ילד"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר צירוף נכון עם המילה מורים:", answer: "חמישה מורים", wrong: ["חמש מורים", "חמישה מורה", "חמש מורה"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט נכון לנקבה:", answer: "היא אמרה תודה", wrong: ["הוא אמרה תודה", "היא אמר תודה", "הם אמרה תודה"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט נכון לזכר:", answer: "הוא שמר על הסוד", wrong: ["היא שמר על הסוד", "הוא שמרה על הסוד", "הם שמרה על הסוד"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט מסודר: מילים - אתמול, לגן, הלכנו.", answer: "אתמול הלכנו לגן", wrong: ["הלכנו אתמול לגן לגן", "לגן אתמול הלכנו הלכנו", "הלכנו לגן אתמול לגן"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט מסודר: מילים - מחר, נלך, לים.", answer: "מחר נלך לים", wrong: ["נלך מחר לים לים", "לים מחר נלך נלך", "נלך לים מחר לים"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "איזה סימן בסוף משפט התלהבות?", answer: "!", wrong: [".", "?", ","] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר מילת קישור מתאימה: רציתי לשחק ___ ירד גשם.", answer: "אבל", wrong: ["ו", "גם", "כי"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר מילת קישור מתאימה: למדנו ___ יצאנו להפסקה.", answer: "ואז", wrong: ["אבל", "אם", "למרות"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט נכון לרבים בעבר:", answer: "הילדים שיחקו אתמול", wrong: ["הילד שיחקו אתמול", "הילדים משחק אתמול", "הילדה שיחקו אתמול"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "בחר משפט נכון לרבים בעתיד:", answer: "התלמידים ילמדו מחר", wrong: ["התלמיד ילמדו מחר", "התלמידים למדו מחר", "התלמידה ילמדו מחר"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "מה רבים של 'תלמיד'?", answer: "תלמידים", wrong: ["תלמידות", "תלמיד", "תלמידה"] },
  { topic: "grammar", levels: ["hard"], patternFamily: "g2_simple_tense", subtype: "gap_tense_hard", question: "מה רבים של 'עיר'?", answer: "ערים", wrong: ["עירות", "עיר", "עריםות"] },
];

/**
 * @param {{ sentence: string, answer: string, wrong: string[] }} def
 * @param {number} serial
 */
function readingGapRow(def, serial) {
  const seed = serial * 31 + def.sentence.length;
  const { answers, correct } = fourOptions(def.answer, def.wrong, seed);
  return {
    topic: "reading",
    minGrade: 2,
    maxGrade: 2,
    levels: ["easy"],
    patternFamily: "g2_short_sentence",
    subtype: `gap_read_easy_${serial}`,
    question: `בנק ב׳ · קר${serial}: קרא את המשפט: '${def.sentence}'`,
    answers,
    correct,
  };
}

/** @type {Array<{ sentence: string, answer: string, wrong: string[] }>} */
const G2_READING_GAP_EASY = [
  { sentence: "הילד שם את התיק על הכיסא", answer: "הילד שם את התיק על הכיסא", wrong: ["הילדה שמה את התיק על הכיסא", "הילד שם את התיק בכיסא", "הילד לקח את התיק מהכיסא"] },
  { sentence: "התלמידה מציירת ציור יפה", answer: "התלמידה מציירת ציור יפה", wrong: ["התלמיד מציירת ציור יפה", "התלמידה מצייר ציור יפה", "התלמידה מוחקת ציור יפה"] },
  { sentence: "הסבא קורא עיתון בסלון", answer: "הסבא קורא עיתון בסלון", wrong: ["הסבתא קורא עיתון בסלון", "הסבא קורא ספר בסלון", "הסבא כותב עיתון בסלון"] },
  { sentence: "הילדים אוכלים ארוחת בוקר", answer: "הילדים אוכלים ארוחת בוקר", wrong: ["הילד אוכלים ארוחת בוקר", "הילדים אוכל ארוחת בוקר", "הילדים שותים ארוחת בוקר"] },
  { sentence: "האח הגדול עוזר לאחות", answer: "האח הגדול עוזר לאחות", wrong: ["האחות הגדולה עוזרת לאח", "האח הקטן עוזר לאחות", "האח הגדול עוזר לאבא"] },
  { sentence: "הגינה מלאה בפרחים צבעוניים", answer: "הגינה מלאה בפרחים צבעוניים", wrong: ["הגינה ריקה מפרחים צבעוניים", "הגינה מלאה בעצים צבעוניים", "החדר מלא בפרחים צבעוניים"] },
  { sentence: "התלמיד מחדד עפרון חדש", answer: "התלמיד מחדד עפרון חדש", wrong: ["התלמידה מחדדת עפרון חדש", "התלמיד מחדד מחק חדש", "התלמיד שובר עפרון חדש"] },
  { sentence: "הילדה שרה שיר שמח", answer: "הילדה שרה שיר שמח", wrong: ["הילד שרה שיר שמח", "הילדה שר שיר שמח", "הילדה שרה שיר עצוב"] },
  { sentence: "הדלת של הכיתה פתוחה", answer: "הדלת של הכיתה פתוחה", wrong: ["הדלת של הכיתה סגורה", "החלון של הכיתה פתוחה", "הדלת של הבית פתוחה"] },
  { sentence: "הרופא בדק את הילד", answer: "הרופא בדק את הילד", wrong: ["הרופאה בדקה את הילד", "הרופא בדק את הילדה", "המורה בדקה את הילד"] },
  { sentence: "השלג יורד בחורף הקר", answer: "השלג יורד בחורף הקר", wrong: ["הגשם יורד בחורף הקר", "השלג יורד בקיץ הקר", "השלג עולה בחורף הקר"] },
  { sentence: "הדבש מתוק מאוד", answer: "הדבש מתוק מאוד", wrong: ["הדבש מלוח מאוד", "החלב מתוק מאוד", "הדבש מר מאוד"] },
];

export const HEBREW_G2_GAP_POOL = [
  ...G2_GAP_DEFS.map((def, i) => gapRow(def, i + 1)),
  ...G2_READING_GAP_EASY.map((def, i) => readingGapRow(def, i + 1)),
];

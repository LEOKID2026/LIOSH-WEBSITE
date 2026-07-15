const G12 = new Set(["g1", "g2"]);

function gradeKey(question, gradeKeyArg) {
  const gk = gradeKeyArg || question?.params?.grade || question?.gradeLevel || "";
  return String(gk).toLowerCase();
}

function isG12(question, gradeKeyArg) {
  return G12.has(gradeKey(question, gradeKeyArg));
}

function subtype(question) {
  return String(
    question?.subtype ||
      question?.params?.subtype ||
      question?.patternFamily ||
      question?.params?.patternFamily ||
      ""
  ).toLowerCase();
}

// ─── reading ────────────────────────────────────────────────────────────────

function readingHint(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("niqqud") || st.includes("read_niqqud"))
      return "הִסְתַּכֵּל בַּנְּקֻדּוֹת מִתַּחַת לְאוֹתִיּוֹת - הֵן מְסַמְּנוֹת אֵיךְ לִקְרֹא.";
    if (st.includes("letter") || st.includes("first") || st.includes("last"))
      return "זַהֵה אֵת הָאוֹת הָרִאשׁוֹנָה אוֹ הָאַחֲרוֹנָה בַּמִּלָּה.";
    if (st.includes("sound") || st.includes("syllable"))
      return "הַקְשֵׁב לַצְּלִיל - כַּמָּה חֲלָקִים יֵשׁ בַּמִּלָּה?";
    return "קְרָא אֶת הַמִּלָּה לְאַט, אוֹת אַחַר אוֹת.";
  }
  if (st.includes("passage") || st.includes("text"))
    return "קרא את הקטע שוב. חפש את המידע שנשאל בטקסט עצמו.";
  if (st.includes("sentence"))
    return "קרא את המשפט בעיון. שים לב לסדר המילים ולמשמעות.";
  return "קרא את הטקסט בעיון. מה נאמר בו במפורש?";
}

function readingSteps(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("niqqud") || st.includes("read_niqqud"))
      return [
        "הִסְתַּכֵּל עַל הַנְּקֻדּוֹת בַּמִּלָּה.",
        "קְרָא כָּל אוֹת עִם הַנִּקּוּד שֶׁלָּהּ.",
        "בְּחַר אֶת הַמִּלָּה הַנְּכוֹנָה.",
      ];
    if (st.includes("letter") || st.includes("first_letter"))
      return [
        "הִסְתַּכֵּל עַל הַמִּלָּה.",
        "מְצָא אֶת הָאוֹת הָרִאשׁוֹנָה.",
        "בְּחַר אֶת הָאוֹת הַנְּכוֹנָה.",
      ];
    if (st.includes("last_letter"))
      return [
        "הִסְתַּכֵּל עַל הַמִּלָּה.",
        "מְצָא אֶת הָאוֹת הָאַחֲרוֹנָה.",
        "בְּחַר אֶת הָאוֹת הַנְּכוֹנָה.",
      ];
    if (st.includes("syllable") || st.includes("count"))
      return [
        "קְרָא אֶת הַמִּלָּה בְּקוֹל.",
        "סְפֹר כַּמָּה חֲלָקִים יֵשׁ.",
        "בְּחַר אֶת הַמִּסְפָּר הַנְּכוֹן.",
      ];
    if (st.includes("sound") || st.includes("start_sound"))
      return [
        "אֱמֹר אֶת הַמִּלָּה בְּקוֹל.",
        "הַקְשֵׁב לַצְּלִיל הָרִאשׁוֹן.",
        "בְּחַר אֶת הָאוֹת הַמַּתְאִימָה.",
      ];
    return [
      "הִסְתַּכֵּל עַל הַמִּלָּה.",
      "קְרָא אוֹת אַחַר אוֹת.",
      "בְּחַר אֶת הַתְּשׁוּבָה הַנְּכוֹנָה.",
    ];
  }
  // G3-G6
  if (st.includes("passage") || st.includes("explicit") || st.includes("detail"))
    return [
      "קרא את הקטע בעיון.",
      "מצא את המשפט שעונה על השאלה.",
      "בחר תשובה לפי מה שכתוב בקטע.",
    ];
  if (st.includes("inference") || st.includes("implied"))
    return [
      "קרא את הקטע.",
      "חפש רמזים בטקסט.",
      "הסק מסקנה לפי הרמזים.",
    ];
  return [
    "קרא את הטקסט בעיון.",
    "זהה את המידע הרלוונטי.",
    "בחר תשובה לפי הנאמר.",
  ];
}

// ─── comprehension ──────────────────────────────────────────────────────────

function comprehensionHint(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("cause") || st.includes("because"))
      return "מָה גָּרַם לַדָּבָר לִקְרוֹת? חַפֵּשׂ אֶת הַסִּבָּה.";
    if (st.includes("sequence") || st.includes("order"))
      return "בְּאֵיזֶה סֵדֶר קָרוּ הַדְּבָרִים?";
    return "קְרָא אֶת הַמִּשְׁפָּט בְּעִיּוּן. מְצָא אֶת הַתְּשׁוּבָה.";
  }
  if (st.includes("cause")) return "מה גרם לאירוע? חפש את הסיבה בטקסט.";
  if (st.includes("inference") || st.includes("implicit")) return "מה אפשר להבין גם אם לא נאמר במפורש?";
  if (st.includes("compare")) return "מה דומה ומה שונה בין הדברים הנזכרים?";
  if (st.includes("pronoun") || st.includes("reference")) return "למי מתייחסת המילה? חפש שם עצם לפניה.";
  return "קרא את הטקסט. מה מידע ישיר ניתן למצוא?";
}

function comprehensionSteps(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("cause") || st.includes("because"))
      return [
        "קְרָא אֶת הַמִּשְׁפָּט.",
        "חַפֵּשׂ: לָמָה זֶה קָרָה?",
        "בְּחַר אֶת הַסִּבָּה הַנְּכוֹנָה.",
      ];
    if (st.includes("completion") || st.includes("context_clue"))
      return [
        "קְרָא אֶת הַמִּשְׁפָּט עִם הַחֲסָרִים.",
        "אֵיזוֹ מִלָּה מַתְאִימָה לְהַשְׁלָמָה?",
        "בְּחַר אֶת הַמִּלָּה הַנְּכוֹנָה.",
      ];
    return [
      "קְרָא אֶת הַמִּשְׁפָּט אוֹ הַקֶּטַע.",
      "מְצָא אֶת הַמֵּידָע שֶׁנִּשְׁאַל.",
      "בְּחַר תְּשׁוּבָה לְפִי מַה שֶׁכָּתוּב.",
    ];
  }
  if (st.includes("cause") || st.includes("effect"))
    return [
      "קרא את הקטע.",
      "מצא את האירוע ואת מה שגרם לו.",
      "בחר: מה הסיבה? מה התוצאה?",
    ];
  if (st.includes("inference") || st.includes("implicit") || st.includes("tone"))
    return [
      "קרא את הקטע.",
      "חפש מילות רמז.",
      "הסק את המסקנה.",
    ];
  if (st.includes("pronoun") || st.includes("reference"))
    return [
      "מצא את המילה (הוא/היא/הם...).",
      "חפש: על מי מדובר לפניה?",
      "זהה את הגוף הנכון.",
    ];
  if (st.includes("compare") || st.includes("contrast"))
    return [
      "זהה את שני הצדדים.",
      "מה דומה בין השניים?",
      "מה שונה?",
    ];
  return [
    "קרא את הקטע בעיון.",
    "זהה את המידע הרלוונטי.",
    "בחר תשובה לפי הטקסט.",
  ];
}

// ─── grammar ────────────────────────────────────────────────────────────────

function grammarHint(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("gender") || st.includes("masculine") || st.includes("feminine"))
      return "הַאִם הַמִּלָּה זְכָר אוֹ נְקֵבָה? שִׂים לֵב לְסוֹף הַמִּלָּה.";
    if (st.includes("plural") || st.includes("number"))
      return "יָחִיד אוֹ רַבִּים? שִׂים לֵב לְסִיּוֹם הַמִּלָּה.";
    if (st.includes("verb") || st.includes("noun") || st.includes("pos"))
      return "הַאִם הַמִּלָּה פּוֹעֵל (פְּעוּלָה), שֵׁם עֶצֶם (דָּבָר), אוֹ תּוֹאַר?";
    return "חֲשֹׁב עַל חֶלְקֵי הַדִּבּוּר: שֵׁם עֶצֶם, פּוֹעֵל, תּוֹאַר.";
  }
  if (st.includes("gender") || st.includes("plural"))
    return "בדוק: זכר/נקבה, יחיד/רבים - שים לב לסיום המילה.";
  if (st.includes("verb") || st.includes("pos"))
    return "שים לב לחלק הדיבר: פועל, שם עצם, תואר.";
  if (st.includes("tense"))
    return "באיזו עת (עבר/הווה/עתיד) נאמר הדבר?";
  if (st.includes("binyan"))
    return "איזה בניין? שים לב לאותיות השורש.";
  if (st.includes("sentence_correction") || st.includes("agreement"))
    return "בדוק: האם הנושא והפועל מסכימים במגדר ובמספר?";
  return "חשוב על כללי הדקדוק: מגדר, מספר, זמן.";
}

function grammarSteps(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("gender") || st.includes("masculine") || st.includes("feminine"))
      return [
        "קְרָא אֶת הַמִּלָּה.",
        "הַאִם הִיא מְסַיֶּמֶת בְּ-ָה? → נְקֵבָה.",
        "הַאִם לֹא? → זָכָר.",
        "בְּחַר אֶת הַמִּסְגֶּרֶת הַנְּכוֹנָה.",
      ];
    if (st.includes("plural") || st.includes("number"))
      return [
        "קְרָא אֶת הַמִּלָּה.",
        "יָחִיד: מִלָּה רְגִילָה. רַבִּים: מְסַיֵּם בְּ-ִים אוֹ -וֹת.",
        "בְּחַר אֶת הַצּוּרָה הַנְּכוֹנָה.",
      ];
    if (st.includes("verb") || st.includes("pos") || st.includes("part_of_speech"))
      return [
        "קְרָא אֶת הַמִּלָּה.",
        "פּוֹעֵל = פְּעוּלָה. שֵׁם עֶצֶם = דָּבָר. תּוֹאַר = תֵּאוּר.",
        "בְּחַר אֶת הַחֵלֶק הַנָּכוֹן.",
      ];
    return [
      "קְרָא אֶת הַמִּשְׁפָּט.",
      "חֲשֹׁב עַל כְּלָלֵי הַדִּקְדּוּק.",
      "בְּחַר אֶת הַתְּשׁוּבָה הַנְּכוֹנָה.",
    ];
  }
  if (st.includes("sentence_correction") || st.includes("agreement") || st.includes("sv_agreement"))
    return [
      "מצא את הנושא.",
      "בדוק: רבים/יחיד, זכר/נקבה.",
      "תקן את הפועל לפי הנושא.",
    ];
  if (st.includes("binyan"))
    return [
      "מצא את שורש המילה.",
      "זהה את הבניין.",
      "בחר את הצורה המתאימה.",
    ];
  if (st.includes("tense"))
    return [
      "קרא את המשפט.",
      "מתי קרה הדבר - עבר/הווה/עתיד?",
      "בחר את זמן הפועל הנכון.",
    ];
  if (st.includes("negation") || st.includes("transform"))
    return [
      "קרא את המשפט המקורי.",
      "הפוך אותו לשלילה: הוסף 'לא' לפני הפועל.",
      "בדוק שהמשפט נכון.",
    ];
  return [
    "זהה את חלק הדיבר.",
    "בדוק מגדר ומספר.",
    "בחר את הצורה הנכונה.",
  ];
}

// ─── vocabulary ─────────────────────────────────────────────────────────────

function vocabularyHint(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("synonym") || st.includes("near"))
      return "מְצָא מִלָּה שֶׁמַּשְׁמָעוּתָהּ דּוֹמָה.";
    if (st.includes("antonym") || st.includes("opposite"))
      return "מְצָא מִלָּה שֶׁמַּשְׁמָעוּתָהּ הַפּוּכָה.";
    if (st.includes("meaning") || st.includes("context"))
      return "מָה פֵּרוּשׁ הַמִּלָּה? חֲשֹׁב עַל הֶקְשֵׁר הַמִּשְׁפָּט.";
    return "חֲשֹׁב עַל מַשְׁמָעוּת הַמִּלָּה.";
  }
  if (st.includes("synonym") || st.includes("near_meaning")) return "מצא מילה בעלת משמעות דומה.";
  if (st.includes("antonym") || st.includes("opposite")) return "מצא מילה שמשמעותה הפוכה.";
  if (st.includes("context") || st.includes("meaning")) return "מה משמעות המילה בהקשר המשפט?";
  if (st.includes("collocation") || st.includes("best_word")) return "איזו מילה מתאימה הכי טוב להקשר?";
  if (st.includes("exclusion") || st.includes("odd_out")) return "איזו מילה לא שייכת לאותה קבוצה?";
  if (st.includes("field") || st.includes("category")) return "לאיזה תחום שייכות המילים?";
  return "חשוב על משמעות המילה בהקשר.";
}

function vocabularySteps(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk)) {
    if (st.includes("synonym") || st.includes("near"))
      return [
        "קְרָא אֶת הַמִּלָּה.",
        "חֲשֹׁב: אֵיזוֹ מִלָּה אַחֶרֶת אוֹמֶרֶת אוֹתוֹ דָּבָר?",
        "בְּחַר אֶת הַמִּלָּה הַדּוֹמָה.",
      ];
    if (st.includes("antonym") || st.includes("opposite"))
      return [
        "קְרָא אֶת הַמִּלָּה.",
        "חֲשֹׁב: מָה הַהֵיפֶּךְ?",
        "בְּחַר אֶת הַמִּלָּה הַמְּנֻגֶּדֶת.",
      ];
    if (st.includes("meaning") || st.includes("context"))
      return [
        "קְרָא אֶת הַמִּשְׁפָּט.",
        "מָה מַשְׁמָעוּת הַמִּלָּה בְּהֶקְשֵׁר זֶה?",
        "בְּחַר אֶת הַפֵּרוּשׁ הַנְּכוֹן.",
      ];
    return [
      "קְרָא אֶת הַמִּלָּה.",
      "חֲשֹׁב עַל מַשְׁמָעוּתָהּ.",
      "בְּחַר אֶת הַתְּשׁוּבָה.",
    ];
  }
  if (st.includes("synonym") || st.includes("near_meaning"))
    return [
      "קרא את המילה.",
      "חשוב: מה המשמעות שלה?",
      "מצא מילה בעלת משמעות דומה.",
    ];
  if (st.includes("antonym") || st.includes("opposite"))
    return [
      "קרא את המילה.",
      "מהו ההפך שלה?",
      "בחר את המילה המנוגדת.",
    ];
  if (st.includes("context") || st.includes("meaning"))
    return [
      "קרא את המשפט.",
      "מה ההקשר סביב המילה?",
      "בחר את הפירוש המתאים.",
    ];
  if (st.includes("collocation") || st.includes("best_word"))
    return [
      "קרא את המשפט.",
      "איזו מילה מתאימה טוב יותר?",
      "בדוק: האם היא נשמעת טבעית?",
    ];
  if (st.includes("exclusion") || st.includes("odd_out"))
    return [
      "קרא את כל המילים.",
      "מצא: מה משותף לשלוש?",
      "הוצא את המילה שלא שייכת.",
    ];
  return [
    "הבן את משמעות המילה.",
    "חשוב על ההקשר.",
    "בחר את התשובה המתאימה.",
  ];
}

// ─── writing / speaking ─────────────────────────────────────────────────────

function writingHint(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk))
    return "חֲשֹׁב עַל מָה שֶׁרוֹצִים לִכְתֹּב. אֵיזֶה מִשְׁפָּט מַתְאִים?";
  if (st.includes("rephrase") || st.includes("clarity")) return "כיצד ניתן לנסח את המשפט בצורה ברורה יותר?";
  if (st.includes("structure") || st.includes("scaffold")) return "מהי מבנה הכתיבה הנכון: פתיחה, אמצע, סיכום?";
  if (st.includes("genre") || st.includes("variety")) return "לאיזו סוגה שייך הטקסט?";
  return "בדוק: האם הכתיבה ברורה, מסודרת ולפי הכללים?";
}

function writingSteps(question, gk) {
  const st = subtype(question);
  if (isG12(question, gk))
    return [
      "קְרָא אֶת הַשְּׁאֵלָה.",
      "חֲשֹׁב: מָה הַמִּשְׁפָּט הַנָּכוֹן?",
      "בְּחַר אֶת הַתְּשׁוּבָה.",
    ];
  if (st.includes("rephrase") || st.includes("clarity"))
    return [
      "קרא את המשפט המקורי.",
      "מצא: מה לא ברור?",
      "נסח מחדש בצורה פשוטה וברורה.",
    ];
  if (st.includes("structure") || st.includes("scaffold"))
    return [
      "זהה את מבנה הטקסט.",
      "פתיחה → גוף → סיכום.",
      "בחר את החלק החסר.",
    ];
  return [
    "בדוק כללי כתיבה.",
    "קרא את הטקסט.",
    "בחר את הניסוח הנכון.",
  ];
}

function speakingHint(question, gk) {
  if (isG12(question, gk))
    return "חֲשֹׁב אֵיךְ עוֹנִים בְּנִימּוּס. מָה אוֹמְרִים בְּמָצָב הַזֶּה?";
  return "חשוב: מה אומרים במצב כזה? השתמש בביטוי מתאים.";
}

function speakingSteps(question, gk) {
  if (isG12(question, gk))
    return [
      "קְרָא אֶת הַמָּצָב.",
      "מָה נָכוֹן לוֹמַר?",
      "בְּחַר אֶת הַתְּשׁוּבָה הַמְּנֻמֶּסֶת.",
    ];
  return [
    "קרא את המצב.",
    "חשוב: מה מתאים לומר?",
    "בחר את הביטוי המתאים.",
  ];
}

// ─── public API ─────────────────────────────────────────────────────────────

export function getHint(question, topic, gradeKeyArg) {
  if (!question) return "";
  const gk = gradeKeyArg;
  switch (String(topic || "").toLowerCase()) {
    case "reading":      return readingHint(question, gk);
    case "comprehension": return comprehensionHint(question, gk);
    case "grammar":      return grammarHint(question, gk);
    case "vocabulary":   return vocabularyHint(question, gk);
    case "writing":      return writingHint(question, gk);
    case "speaking":     return speakingHint(question, gk);
    default:
      return isG12(question, gk)
        ? "קְרָא אֶת הַשְּׁאֵלָה בְּעִיּוּן וּבְחַר אֶת הַתְּשׁוּבָה הַנְּכוֹנָה."
        : "קרא היטב את השאלה וחשוב על התשובה הנכונה.";
  }
}

export function getSolutionSteps(question, topic, gradeKeyArg) {
  if (!question) return [];
  const gk = gradeKeyArg;
  switch (String(topic || "").toLowerCase()) {
    case "reading":      return readingSteps(question, gk);
    case "comprehension": return comprehensionSteps(question, gk);
    case "grammar":      return grammarSteps(question, gk);
    case "vocabulary":   return vocabularySteps(question, gk);
    case "writing":      return writingSteps(question, gk);
    case "speaking":     return speakingSteps(question, gk);
    default:
      return isG12(question, gk)
        ? ["קְרָא אֶת הַשְּׁאֵלָה.", "חֲשֹׁב עַל הַתְּשׁוּבָה.", "בְּחַר אֶת הַתְּשׁוּבָה הַנְּכוֹנָה."]
        : ["קרא את השאלה.", "חשוב על התשובה.", "בחר את התשובה הנכונה."];
  }
}

export function getErrorExplanation(question, topic, wrongAnswer, gradeKeyArg, opts = {}) {
  if (!question) return "";
  const correctAnswer = question.correctAnswer;
  const learning = opts.mode === "learning";
  const correct = correctAnswer ? `"${correctAnswer}"` : "";
  const gk = gradeKeyArg;
  const g12 = isG12(question, gk);

  const prefix = learning && correct ? `הַתְּשׁוּבָה הַנְּכוֹנָה הִיא ${correct}. ` : "";

  switch (String(topic || "").toLowerCase()) {
    case "reading":
      return g12
        ? `${prefix}קְרָא אֶת הַמִּלָּה שׁוּב, אוֹת אַחַר אוֹת.`
        : learning
          ? `התשובה הנכונה היא ${correct}. קרא את הטקסט בעיון וזהה את המידע המפורש.`
          : "קרא את הטקסט שוב ומצא את המידע הרלוונטי.";
    case "comprehension":
      return g12
        ? `${prefix}קְרָא אֶת הַמִּשְׁפָּט שׁוּב וְחַפֵּשׂ אֶת הַתְּשׁוּבָה.`
        : learning
          ? `התשובה הנכונה היא ${correct}. חפש את הרמזים בטקסט.`
          : "קרא שוב את הטקסט. מה נאמר בו?";
    case "grammar":
      return g12
        ? `${prefix}חֲשֹׁב שׁוּב עַל הַכְּלָלִים.`
        : learning
          ? `התשובה הנכונה היא ${correct}. בדוק מגדר, מספר וחלק דיבר.`
          : "בדוק שוב: מגדר, מספר, וחלק הדיבר.";
    case "vocabulary":
      return g12
        ? `${prefix}חֲשֹׁב עַל מַשְׁמָעוּת הַמִּלָּה.`
        : learning
          ? `התשובה הנכונה היא ${correct}. הבן את משמעות המילה בהקשר.`
          : "חשוב שוב על משמעות המילה בהקשר המשפט.";
    case "writing":
      return g12
        ? `${prefix}קְרָא אֶת הַשְּׁאֵלָה שׁוּב.`
        : learning
          ? `התשובה הנכונה היא ${correct}. בדוק כללי כתיבה ודקדוק.`
          : "בדוק שוב את כללי הכתיב והדקדוק.";
    case "speaking":
      return g12
        ? `${prefix}חֲשֹׁב: מָה נָכוֹן לוֹמַר?`
        : learning
          ? `התשובה הנכונה היא ${correct}. זכור את כללי השיח.`
          : "חשוב שוב: מה מתאים לומר במצב זה?";
    default:
      return learning
        ? `התשובה הנכונה היא ${correct}.`
        : "קרא את השאלה שוב ובחר תשובה לפי מה שלמדנו.";
  }
}

export function buildStepExplanation(question) {
  if (!question) return null;

  const topic = question.topic || question.operation;
  const gk = question.params?.grade || question.gradeLevel;
  const steps = getSolutionSteps(question, topic, gk);

  return {
    exercise: question.question || question.exerciseText,
    steps: steps,
    vertical: null,
  };
}

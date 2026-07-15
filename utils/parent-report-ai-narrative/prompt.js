/**
 * Hebrew system prompt + facts JSON for the parent-report AI narrative writer.
 *
 * Hard rules embedded in the prompt:
 *  - Audience: הורה. Voice: חמה, מקצועית, פשוטה.
 *  - אין שפה רפואית/אבחנתית, אין ADHD/לקויות למידה/חרדה/דיכאון/חוסר ביטחון.
 *  - אין הנחות רגשיות.
 *  - חובה לציין מגבלת נתונים אם `thinDataWarnings` קיים.
 *  - לתת 2–3 טיפים פרקטיים לבית.
 *  - להתבסס רק על Hebrew display labels וההמלצות הדטרמיניסטיות.
 *  - אסור להמציא נושאים, מקצועות, מספרים או שמות מורים.
 *  - חייב להחזיר JSON בלבד, ללא Markdown.
 *  - sourceId חייב להילקח מהרשימות `availableStrengthSourceIds` / `availableFocusSourceIds`.
 */

const SYSTEM_LINES_HE = [
  "את/ה כותב/ת סיכום קצר ומקצועי בעברית להורה על תרגול הילד/ה במערכת לימודית.",
  "סגנון: חם, פשוט, מקצועי, ללא שיפוטיות וללא דרמטיזציה.",
  "אסור להשתמש בשפה רפואית או אבחנתית: ADHD, דיסלקציה, לקות למידה, חרדה, דיכאון, חוסר ביטחון, ASD, מאסטרי.",
  "אסור לקבוע מסקנות רגשיות על הילד/ה ('הוא לא בטוח בעצמו', 'היא חוששת').",
  // ---- Forbidden emotional/confidence framing in any visible text ----
  "אסור להשתמש בשום צורה במילה 'ביטחון' או 'בטחון' או 'confidence' בטקסט הגלוי - לא בחיוב ('לחזק את הביטחון') ולא בשלילה ('חוסר ביטחון'). זהו ניסוח רגשי שלא מתאים לסיכום מבוסס-תרגול להורה.",
  "במקום 'ביטחון' השתמש/י בניסוחים תרגוליים-תיאוריים כגון: 'שטף בתרגול', 'עצמאות בתרגול', 'ביסוס ההבנה', 'תרגול עקבי', 'יציבות בתרגול', או 'הצלחה חוזרת בתרגול'.",
  "אסור להמציא נושאים, מקצועות, שמות מורים, ציונים או מספרים שלא מופיעים בקלט.",
  "אסור להשתמש ב-Markdown, סימני * או #, או רשימות עם תווי כוכבית.",
  "אסור לכלול מפתחות באנגלית כמו `multiplication_table` או `reading_comprehension` בטקסט הגלוי. הטקסט חייב להיות בעברית בלבד.",
  // ---- Thin-data caution: deterministic, copy-verbatim contract ----
  "אם בקלט יש שדה `required_caution_note_he` והוא אינו null ואינו מחרוזת ריקה, חובה להעתיק את הטקסט שלו אות-באות לתוך השדה `cautionNote` שבפלט. אסור לשנות, לפרש, לקצר, להאריך, לחזק, לרכך, לתרגם, להוסיף הקדמה, או להחליף ניסוח. עותק מדויק בלבד.",
  "אם `required_caution_note_he` הוא null או ריק, וגם `thin_data_warnings` ריק - אפשר להותיר את `cautionNote` כמחרוזת ריקה.",
  "אם `required_caution_note_he` ריק/null אך `thin_data_warnings` אינו ריק (מצב נדיר), כתוב/י משפט קצר בעברית שמכיל את הצירוף 'כיוון ראשוני'.",
  "הפריטים לשדה JSON `strengths` (תוצאות טובות יחסית לפי המועמדים) ולשדה `focusAreas` מותרים אך ורק מתוך הרשימות הסגורות `available_strength_source_ids` ו-`available_focus_source_ids`. עבור כל פריט, החזר/י גם `sourceId` תואם.",
  "ה-`textHe` של כל פריט ב-`strengths` או ב-`focusAreas` חייב להיות מבוסס על ה-`display_name_he` המקביל בקלט (אפשר לנסח במשפט קצר בעברית ברורה להורה), ולא להמציא נושא חדש.",
  // ---- Hard count limits (must match output-schema.js / validate-narrative-output.js) ----
  "מגבלת כמות לשדה strengths: לכל היותר 3 פריטים. אסור לעבור 3, גם אם ברשימת המועמדים יש יותר. אם ברשימת `strengths_candidates` יש יותר מ-3, בחר/י את 3 המשמעותיים ביותר בלבד.",
  "מגבלת כמות לתחומי חיזוק: לכל היותר 3 פריטים בשדה focusAreas. אסור לעבור 3.",
  "מגבלת כמות לטיפים: בדיוק 2 עד 3 פריטים בשדה homeTips. לא פחות מ-2 ולא יותר מ-3.",
  "כתוב/י 2 עד 3 `homeTips` פרקטיים, קצרים, בני ביצוע בבית.",
  "פלט: JSON בלבד עם השדות summary (string), strengths (array של {textHe, sourceId} עד 3), focusAreas (array של {textHe, sourceId} עד 3), homeTips (array של strings, 2–3), cautionNote (string).",
];

const SYSTEM_RULES_EN = [
  "Output strictly valid JSON. No prose outside JSON. No Markdown.",
  "Field names use camelCase in the JSON: summary, strengths, focusAreas, homeTips, cautionNote.",
  "Bullet item fields use camelCase: textHe, sourceId.",
  "Hard caps: strengths.length <= 3, focusAreas.length <= 3, homeTips.length is 2 or 3. Never exceed these caps even if more candidates are available.",
  "All visible text fields are Hebrew (textHe, summary, homeTips, cautionNote).",
];

function buildFactsJson(input) {
  return {
    student_display_name: input.studentDisplayName || "",
    grade_level: input.gradeLevel || "unknown",
    range_label: input.rangeLabel || "",
    overall: {
      total_questions: input.overall?.totalQuestions || 0,
      accuracy_band: input.overall?.accuracyBand || "low",
      data_confidence: input.overall?.dataConfidence || "thin",
      avg_time_per_question_sec: input.overall?.avgTimePerQuestionSec ?? null,
      avg_hints_per_question: input.overall?.avgHintsPerQuestion ?? null,
      mode_counts: input.overall?.modeCounts || null,
      level_counts: input.overall?.levelCounts || null,
    },
    subjects: (input.subjects || []).map((s) => ({
      source_id: s.sourceId,
      display_name_he: s.displayNameHe,
      total_questions: s.totalQuestions,
      accuracy_band: s.accuracyBand,
      trend: s.trend,
      data_confidence: s.dataConfidence,
    })),
    strengths_candidates: (input.strengths || []).map((s) => ({
      source_id: s.sourceId,
      display_name_he: s.displayNameHe,
      evidence_he: s.evidenceHe,
    })),
    focus_areas_candidates: (input.focusAreas || []).map((f) => ({
      source_id: f.sourceId,
      display_name_he: f.displayNameHe,
      evidence_he: f.evidenceHe,
      thin_data: f.thinData === true,
    })),
    available_strength_source_ids: input.availableStrengthSourceIds || [],
    available_focus_source_ids: input.availableFocusSourceIds || [],
    fluency_signals: input.fluency || null,
    repeated_mistakes: input.repeatedMistakes || [],
    deterministic_recommendations_he: input.deterministicRecommendationsHe || [],
    thin_data_warnings: input.thinDataWarnings || [],
    required_caution_note_he:
      typeof input.requiredCautionNoteHe === "string" && input.requiredCautionNoteHe.trim()
        ? input.requiredCautionNoteHe.trim()
        : null,
  };
}

/**
 * Builds the prompt sent to the OpenAI Responses API.
 *
 * @param {object} aiNarrativeInput — strict, allowlisted projection of the Insight Packet
 * @returns {string} prompt
 */
export function buildNarrativePrompt(aiNarrativeInput) {
  const facts = buildFactsJson(aiNarrativeInput || {});
  const lines = [
    ...SYSTEM_LINES_HE,
    ...SYSTEM_RULES_EN,
    `FACTS_JSON: ${JSON.stringify(facts)}`,
  ];
  return lines.join("\n");
}

export function buildFactsJsonForTests(input) {
  return buildFactsJson(input || {});
}

/**
 * Deterministic fixtures for parent narrative safety selftest (Hebrew copy).
 */

/**
 * @typedef {object} ParentNarrativeFixture
 * @property {string} id
 * @property {string} description
 * @property {string} narrativeText
 * @property {Record<string, unknown>} engineOutput
 * @property {Record<string, unknown>} [reportContext]
 * @property {"he"} [locale]
 * @property {"pass"|"warning"|"block"} expectStatus
 * @property {boolean} expectOk
 */

/** @type {ParentNarrativeFixture[]} */
export const PARENT_NARRATIVE_SAFETY_FIXTURES = [
  {
    id: "safe_observational_he",
    description: "Safe Hebrew parent narrative with observational tone and adequate volume.",
    narrativeText:
      "נראה שההתקדמות בנושא עקבית. מהנתונים כאן אין עומס חריג - כדאי להמשיך בתרגול קצר פעמיים בשבוע לשמירה על שגרה.",
    engineOutput: {
      questionCount: 42,
      dataSufficiencyLevel: "strong",
      engineConfidence: "medium",
      recommendationTier: "advance_ok",
    },
    reportContext: { surface: "short" },
    locale: "he",
    expectStatus: "pass",
    expectOk: true,
  },
  {
    id: "thin_data_cautious_wording",
    description: "Thin evidence but explicit cautious hedging - should not block.",
    narrativeText:
      "עדיין מוקדם לקבוע כיוון סופי. ייתכן שכדאי חיזוק קל - כדאי לאסוף עוד מעט תרגול לפני שמחליטים על צעד הבא.",
    engineOutput: {
      thinData: true,
      questionCount: 4,
      dataSufficiencyLevel: "weak",
      engineConfidence: "low",
      recommendationTier: "maintain",
    },
    expectStatus: "pass",
    expectOk: true,
  },
  {
    id: "thin_data_overconfident",
    description: "Thin evidence with strong certainty and mastery claim - block.",
    narrativeText: "בוודאות הילד כבר שליטה מלאה בחומר ואין צורך בתרגול נוסף בכלל.",
    engineOutput: {
      thinData: true,
      questionCount: 3,
      dataSufficiencyLevel: "thin",
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "do_not_conclude_ignored",
    description: "Engine lists do-not-conclude barriers but text uses absolute certainty.",
    narrativeText:
      "ברור שחסרה הבנה יסודית לחלוטין, וחד משמעי שיש לטפל בזה מיד - אין ספק בכך.",
    engineOutput: {
      doNotConclude: ["אין להסיק לקות או אבחון לפי מבחן בית בלבד"],
      questionCount: 20,
      engineConfidence: "medium",
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "medical_diagnostic_unsafe",
    description: "Disability / clinical framing - block.",
    narrativeText: "ייתכן שמדובר בדיסלקציה; מומלץ אבחון קליני מיידי.",
    engineOutput: { questionCount: 30, engineConfidence: "low" },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "unsupported_recommendation_escalation",
    description: "Engine allows maintenance only; narrative forces level jump.",
    narrativeText: "יש להעלות את הרמה מיד ולבצע קפיצה לרמה גבוהה - חובה להתקדם בלי לחכות.",
    engineOutput: {
      recommendationTier: "maintain_only",
      recommendedNextStepHe: "תרגול קצר וממוקד פעמיים בשבוע על אותו נושא",
      questionCount: 18,
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "contradiction_engine_confidence_low",
    description: "Engine confidence low but parent text is fully certain.",
    narrativeText: "בוודאות הנושא נסגר לחלוטין והבנת הילד מושלמת בלי מקום לספק.",
    engineOutput: {
      engineConfidence: "low",
      questionCount: 12,
      dataSufficiencyLevel: "medium",
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "permanent_fixed_ability",
    description: "Permanent failure / never-succeed framing - block.",
    narrativeText: "הילד תמיד נכשל בחישוב ולעולם לא יצליח ליישב את זה - זו עמדה קבועה.",
    engineOutput: { questionCount: 25 },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "guessing_presented_as_mastery",
    description: "High guessing signal but narrative claims full mastery.",
    narrativeText: "יש שליטה מלאה בנושא והכל מושלם; אפשר לדלג על חזרות.",
    engineOutput: {
      guessingLikelihoodHigh: true,
      questionCount: 30,
      engineConfidence: "medium",
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "prerequisite_issue_overstated",
    description: "Only suspected prerequisite gap; narrative states proof-level gap.",
    narrativeText: "חוסר יסוד מוכח לחלוטין במבנה המספרים - אין ספק שזה חוסר קודם שלם.",
    engineOutput: {
      prerequisiteGapLevel: "suspected",
      questionCount: 15,
    },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "unsafe_must_not_say_token",
    description: "Internal taxonomy token leaked into parent copy - block.",
    narrativeText: "לפי mappings במערכת הטקסונומיה המומלצת, נבחר צעד הבא.",
    engineOutput: { questionCount: 22 },
    expectStatus: "block",
    expectOk: false,
  },
  {
    id: "safe_thin_statistical_dal_line",
    description: "Realistic thin-data statistical restraint line - pass (info: safe thin caution).",
    narrativeText: "נתון דל - לא מסכמים ביטחון סטטיסטי ברמת המקצוע.",
    engineOutput: {
      thinData: true,
      questionCount: 3,
      dataSufficiencyLevel: "thin",
      engineConfidence: "low",
    },
    expectStatus: "pass",
    expectOk: true,
  },
  {
    id: "safe_collect_more_examples_before_decision",
    description: "Explicit collect-more-examples framing - pass (info).",
    narrativeText: "כדאי להמשיך לאסוף עוד דוגמאות לפני החלטה משמעותית על צעד הבא.",
    engineOutput: { thinData: true, questionCount: 4 },
    expectStatus: "pass",
    expectOk: true,
  },
  {
    id: "unsafe_determine_weakness_from_two_questions",
    description: "Thin data but claims determinability / significant weakness - warning.",
    narrativeText: "על בסיס שתי שאלות ניתן לקבוע חולשה משמעותית בנושא.",
    engineOutput: { thinData: true, questionCount: 2 },
    expectStatus: "warning",
    expectOk: true,
  },
  {
    id: "unsafe_insufficient_but_clear_problem_assertion",
    description: "Acknowledges lack of data then asserts clear problem - warning.",
    narrativeText: "אין מספיק מידע, אבל יש בעיה ברורה בנושא שכדאי לטפל בה.",
    engineOutput: { thinData: true, questionCount: 3 },
    expectStatus: "warning",
    expectOk: true,
  },
  {
    id: "ambiguous_thin_no_explicit_anchor",
    description: "Thin row but vague narrative without explicit limited-data framing - warning.",
    narrativeText: "הביצועים משתנים מפעם לפעם; לפעמים טוב ולפעמים פחות, בלי דפוס ברור.",
    engineOutput: { thinData: true, questionCount: 4 },
    expectStatus: "warning",
    expectOk: true,
  },
  {
    id: "thin_despite_little_data_clear_child_struggles",
    description: "Despite little data, absolute clarity about struggle - overconfidence + thin → block.",
    narrativeText: "למרות שיש מעט נתונים, ברור שהילד מתקשה בחומר וצריך התערבות מיידית.",
    engineOutput: { thinData: true, questionCount: 3 },
    expectStatus: "block",
    expectOk: false,
  },
];

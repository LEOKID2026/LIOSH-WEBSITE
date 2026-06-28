/**
 * Grade 3 body — authored MCQs (no generic study-skills meta-stems).
 * Target: 50+ unique items for g3 easy body sessions.
 */

/** @type {Record<string, { diagnosticSkillId: string, expectedErrorTags: string[] }>} */
const G3_BODY_SKILL_FAMILIES = {
  senses_and_skin: {
    diagnosticSkillId: "sci_g3_body_senses_and_skin",
    expectedErrorTags: ["sense_organ_confusion", "fact_recall_gap"],
  },
  breathing_respiration: {
    diagnosticSkillId: "sci_g3_body_breathing_respiration",
    expectedErrorTags: ["respiration_system_confusion", "cause_effect_gap"],
  },
  skeleton_muscles: {
    diagnosticSkillId: "sci_g3_body_skeleton_muscles",
    expectedErrorTags: ["structure_function_confusion", "fact_recall_gap"],
  },
  nutrition_health: {
    diagnosticSkillId: "sci_g3_body_nutrition_health",
    expectedErrorTags: ["health_habit_confusion", "fact_recall_gap"],
  },
  heart_blood_circulation: {
    diagnosticSkillId: "sci_g3_body_heart_blood_circulation",
    expectedErrorTags: ["circulation_confusion", "cause_effect_gap"],
  },
  body_systems_basic: {
    diagnosticSkillId: "sci_g3_body_systems_basic",
    expectedErrorTags: ["organ_system_confusion", "fact_recall_gap"],
  },
  body_function_matching: {
    diagnosticSkillId: "sci_g3_body_function_matching",
    expectedErrorTags: ["system_role_confusion", "cause_effect_gap"],
  },
};

/** patternFamily → diagnostic family + conceptTag (+ optional probe-aligned skill) */
const G3_BODY_PATTERN_META = {
  sci_body_g3_hearing: { family: "senses_and_skin", conceptTag: "sense_hearing" },
  sci_body_g3_skin_role: { family: "senses_and_skin", conceptTag: "skin_protection_touch" },
  sci_body_g3_taste: { family: "senses_and_skin", conceptTag: "sense_taste" },
  sci_body_g3_smell: { family: "senses_and_skin", conceptTag: "sense_smell" },
  sci_body_g3_vision_path: { family: "senses_and_skin", conceptTag: "vision_signal_path" },
  sci_body_g3_brain_senses: { family: "senses_and_skin", conceptTag: "brain_interprets_senses" },
  sci_body_g3_eye_care: { family: "senses_and_skin", conceptTag: "eye_health_habits" },
  sci_body_g3_hearing_safety: { family: "senses_and_skin", conceptTag: "hearing_noise_safety" },
  sci_body_g3_eyelashes: { family: "senses_and_skin", conceptTag: "eye_protection" },
  sci_body_g3_touch_pair: { family: "senses_and_skin", conceptTag: "touch_skin_brain" },
  sci_body_g3_respiratory_organs: {
    family: "breathing_respiration",
    conceptTag: "respiratory_organs",
    diagnosticSkillId: "sci_respiration_concept",
    probePower: "high",
  },
  sci_body_g3_breathing_exercise: {
    family: "breathing_respiration",
    conceptTag: "breathing_after_exercise",
    diagnosticSkillId: "sci_respiration_concept",
    probePower: "high",
  },
  sci_body_g3_lung_gas: {
    family: "breathing_respiration",
    conceptTag: "lung_gas_exchange",
    diagnosticSkillId: "sci_respiration_concept",
    probePower: "high",
  },
  sci_body_g3_muscle_oxygen: {
    family: "breathing_respiration",
    conceptTag: "muscle_oxygen_demand",
    diagnosticSkillId: "sci_respiration_concept",
    probePower: "high",
  },
  sci_body_g3_muscles: { family: "skeleton_muscles", conceptTag: "muscle_movement" },
  sci_body_g3_skeleton: { family: "skeleton_muscles", conceptTag: "skeleton_support" },
  sci_body_g3_spine: { family: "skeleton_muscles", conceptTag: "spine_protection" },
  sci_body_g3_bone_muscle_team: { family: "skeleton_muscles", conceptTag: "bone_muscle_movement" },
  sci_body_g3_calcium: { family: "skeleton_muscles", conceptTag: "calcium_bone_strength" },
  sci_body_g3_posture: { family: "skeleton_muscles", conceptTag: "posture_spine" },
  sci_body_g3_dental_hygiene: { family: "nutrition_health", conceptTag: "dental_hygiene" },
  sci_body_g3_hydration: { family: "nutrition_health", conceptTag: "hydration" },
  sci_body_g3_healthy_habits: { family: "nutrition_health", conceptTag: "healthy_lifestyle" },
  sci_body_g3_hand_washing: { family: "nutrition_health", conceptTag: "hand_hygiene" },
  sci_body_g3_balanced_diet: { family: "nutrition_health", conceptTag: "balanced_diet" },
  sci_body_g3_fatigue_rest: { family: "nutrition_health", conceptTag: "rest_recovery" },
  sci_body_g3_breakfast: { family: "nutrition_health", conceptTag: "breakfast_energy" },
  sci_body_g3_sleep: { family: "nutrition_health", conceptTag: "sleep_growth" },
  sci_body_g3_kitchen_safety: { family: "nutrition_health", conceptTag: "kitchen_safety" },
  sci_body_g3_exercise: { family: "nutrition_health", conceptTag: "exercise_benefits" },
  sci_body_g3_fruits_veggies: { family: "nutrition_health", conceptTag: "fruits_vegetables" },
  sci_body_g3_wound_care: { family: "nutrition_health", conceptTag: "wound_bandage" },
  sci_body_g3_heat_hydration: { family: "nutrition_health", conceptTag: "heat_fluid_loss" },
  sci_body_g3_cold_care: { family: "nutrition_health", conceptTag: "cold_rest_hygiene" },
  sci_body_g3_safety_helmet: { family: "nutrition_health", conceptTag: "head_safety" },
  sci_body_g3_heart_pump: { family: "heart_blood_circulation", conceptTag: "heart_pumps_blood" },
  sci_body_g3_blood_role: { family: "heart_blood_circulation", conceptTag: "blood_transports" },
  sci_body_g3_pulse_observation: { family: "heart_blood_circulation", conceptTag: "pulse_after_activity" },
  sci_body_g3_pulse_jump: { family: "heart_blood_circulation", conceptTag: "pulse_jump_activity" },
  sci_body_g3_digestive_stomach: { family: "body_systems_basic", conceptTag: "digestive_stomach" },
  sci_body_g3_liver_role: { family: "body_systems_basic", conceptTag: "liver_processing" },
  sci_body_g3_mouth_digestion: { family: "body_systems_basic", conceptTag: "mouth_chewing" },
  sci_body_g3_kidneys: { family: "body_systems_basic", conceptTag: "kidney_filtration" },
  sci_body_g3_saliva: { family: "body_systems_basic", conceptTag: "saliva_digestion" },
  sci_body_g3_excretory: { family: "body_systems_basic", conceptTag: "excretory_kidney" },
  sci_body_g3_small_intestine: { family: "body_systems_basic", conceptTag: "small_intestine_absorption" },
  sci_body_g3_reflex: { family: "body_function_matching", conceptTag: "spinal_reflex" },
  sci_body_g3_nervous_system: { family: "body_function_matching", conceptTag: "nervous_messages" },
  sci_body_g3_cold_response: { family: "body_function_matching", conceptTag: "shivering_heat" },
  sci_body_g3_brain_learning: { family: "body_function_matching", conceptTag: "brain_learning" },
  sci_body_g3_sweat_cooling: { family: "body_function_matching", conceptTag: "sweat_cooling" },
  sci_body_g3_systems_together: { family: "body_function_matching", conceptTag: "body_systems_cooperation" },
};

function bodyMcq(id, stem, options, correctIndex, explanation, patternFamily, cog = "recall") {
  const rowMeta = G3_BODY_PATTERN_META[patternFamily] || {
    family: "body_systems_basic",
    conceptTag: patternFamily.replace(/^sci_body_g3_/, ""),
  };
  const familyMeta = G3_BODY_SKILL_FAMILIES[rowMeta.family];
  const diagnosticSkillId = rowMeta.diagnosticSkillId || familyMeta.diagnosticSkillId;
  const expectedErrorTags = [
    rowMeta.conceptTag,
    ...familyMeta.expectedErrorTags,
  ];
  return {
    id,
    topic: "body",
    grades: ["g3"],
    minLevel: "easy",
    maxLevel: "easy",
    type: "mcq",
    stem,
    options,
    correctIndex,
    explanation,
    theoryLines: [
      "שאלות גוף האדם בכיתה ג׳ מתמקדות בחושים, הרגלים בריאים ומערכות בסיסיות.",
    ],
    params: {
      patternFamily,
      subtype: "sci_body_g3_authored",
      conceptTag: rowMeta.conceptTag,
      diagnosticSkillId,
      probePower: rowMeta.probePower || "medium",
      expectedErrorTags,
      cognitiveLevel: cog,
      expectedErrorTypes: expectedErrorTags,
      difficulty: "basic",
    },
  };
}

export const SCIENCE_G3_BODY_BANK = [
  bodyMcq(
    "sci_g3_body_001",
    "באיזה איבר אנחנו משתמשים כדי לשמוע צלילים?",
    ["אוזניים", "עיניים", "אף", "לשון"],
    0,
    "האוזניים קולטות גלי קול ומעבירות אותם למוח.",
    "sci_body_g3_hearing"
  ),
  bodyMcq(
    "sci_g3_body_002",
    "מה תפקיד העור בגוף?",
    ["מגן על הגוף ועוזר לחוש מישוש", "מפרק מזון לחומרים קטנים", "מזרים דם לכל האיברים", "מאחסן אוויר לנשימה"],
    0,
    "העור הוא שכבת הגנה וגם איבר חוש.",
    "sci_body_g3_skin_role"
  ),
  bodyMcq(
    "sci_g3_body_003",
    "איזה חוש קשור בעיקר לטעם של מזון?",
    ["לשון", "אוזן", "עצם הירך", "ריאה"],
    0,
    "על הלשון יש קולטני טעם.",
    "sci_body_g3_taste"
  ),
  bodyMcq(
    "sci_g3_body_004",
    "מה עוזר לנו להריח ריחות?",
    ["אף", "ידיים", "ברכיים", "שיניים"],
    0,
    "קולטני הריח נמצאים באף.",
    "sci_body_g3_smell"
  ),
  bodyMcq(
    "sci_g3_body_005",
    "מה קורה כשאור נכנס לעין?",
    ["העין שולחת אותות למוח שרואים מהם תמונה", "האור נשאר בעין לנצח", "העין מייצרת אור חדש", "המוח מפסיק לעבוד"],
    0,
    "מערכת הראייה מעבירה מידע מהעין למוח.",
    "sci_body_g3_vision_path"
  ),
  bodyMcq(
    "sci_g3_body_006",
    "למה חשוב לשמור על שיניים נקיות?",
    ["כדי למנוע עששת ולשמור על בריאות הפה", "כדי שהשיער יגדל מהר", "כדי שהריאות יגדלו", "כדי שלא נצטרך לישון"],
    0,
    "היגיינת פה מונעת מחלות שיניים.",
    "sci_body_g3_dental_hygiene"
  ),
  bodyMcq(
    "sci_g3_body_007",
    "מה תפקיד השרירים בגוף?",
    ["מאפשרים תנועה ותמיכה בפעולות", "מסננים אוויר בלבד", "מייצרים אור", "שומרים על טמפרטורת הים"],
    0,
    "שרירים מכווצים ומרפים וכך מניעים את הגוף.",
    "sci_body_g3_muscles"
  ),
  bodyMcq(
    "sci_g3_body_008",
    "מה עושה שלד העצמות?",
    ["נותן מסגרת לגוף ומגן על איברים", "מעביר חמצן בדם", "מפרק מזון במעי", "מייצר קול בלבד"],
    0,
    "העצמות תומכות בגוף ומגנות על מוח ולב.",
    "sci_body_g3_skeleton"
  ),
  bodyMcq(
    "sci_g3_body_009",
    "איזה זוג איברים שייך למערכת הנשימה?",
    ["ריאות וקנה הנשימה", "לב וכבד", "עיניים ואוזניים", "שיניים ולשון"],
    0,
    "אוויר עובר בדרכי נשימה אל הריאות.",
    "sci_body_g3_respiratory_organs"
  ),
  bodyMcq(
    "sci_g3_body_010",
    "מה עושה הלב?",
    ["מניע דם בגוף", "מסנן פסולת בשתן", "מעכל לחם", "שומר על שיער"],
    0,
    "הלב הוא משאבה שמזרימה דם.",
    "sci_body_g3_heart_pump"
  ),
  bodyMcq(
    "sci_g3_body_011",
    "איך שתיית מים תורמת לבריאות הגוף?",
    ["כדי לשמור על לחות הגוף ועזרה לתפקוד תקין", "כדי שלא נצטרך לנשום", "כדי שהעצמות ייעלמו", "כדי שלא נרגיש כלום"],
    0,
    "מים חיוניים לתאים ולמערכות הגוף.",
    "sci_body_g3_hydration"
  ),
  bodyMcq(
    "sci_g3_body_012",
    "מהי דרך טובה לשמור על הגוף בריא?",
    ["שינה מספקת, תזונה מאוזנת ופעילות גופנית", "אכילת ממתקים בלבד", "הימנעות ממים", "ישיבה כל היום בלי תנועה"],
    0,
    "אורח חיים מאוזן תומך בבריאות.",
    "sci_body_g3_healthy_habits"
  ),
  bodyMcq(
    "sci_g3_body_013",
    "מה קורה כשאנחנו נושמים עמוק אחרי ריצה?",
    ["הגוף מקבל יותר חמצן לשרירים", "הגוף מפסיק לעבוד", "העצמות נעלמות", "העור הופך לזכוכית"],
    0,
    "אחרי מאמץ הגוף זקוק ליותר חמצן.",
    "sci_body_g3_breathing_exercise"
  ),
  bodyMcq(
    "sci_g3_body_014",
    "איזה איבר שייך למערכת העיכול?",
    ["קיבה", "ריאה", "מוח", "עצם הזרוע"],
    0,
    "הקיבה ממשיכה לעכל מזון.",
    "sci_body_g3_digestive_stomach"
  ),
  bodyMcq(
    "sci_g3_body_015",
    "מה תפקיד הדם בגוף?",
    ["מוביל חמצן וחומרי מזון לתאים", "מחזיק את העצמות יחד", "מייצר קול בגרון", "מחליף אור בתמונה"],
    0,
    "הדם מסיע חומרים חיוניים.",
    "sci_body_g3_blood_role"
  ),
  bodyMcq(
    "sci_g3_body_016",
    "למה שוטפים ידיים לפני אוכל?",
    ["כדי להסיר חיידקים שעלולים להיכנס לגוף", "כדי שהידיים ישנו צבע", "כדי שלא נצטרך לאכול", "כדי שהשיער יגדל"],
    0,
    "היגיינת ידיים מונעת הדבקות.",
    "sci_body_g3_hand_washing"
  ),
  bodyMcq(
    "sci_g3_body_017",
    "מה קשר בין מוח לחושים?",
    ["המוח מפרש מידע מהחושים", "החושים מחליפים את המוח", "אין קשר ביניהם", "המוח שולח ריחות החוצה"],
    0,
    "המוח מעבד אותות מהעיניים, האוזניים ועוד.",
    "sci_body_g3_brain_senses"
  ),
  bodyMcq(
    "sci_g3_body_018",
    "מה מאפיין תזונה מאוזנת?",
    ["מגוון מזונות בכמויות מתאימות", "אכילת סוכר בלבד", "הימנעות מירקות תמיד", "שתיית משקאות ממותקים בלבד"],
    0,
    "מאזן בין קבוצות המזון חשוב לגדילה.",
    "sci_body_g3_balanced_diet"
  ),
  bodyMcq(
    "sci_g3_body_019",
    "מה עושים הריאות כשאנחנו נושמים?",
    ["לוקחות חמצן ופולטות פחמן דוחמצני", "מייצרות דם מאפס", "מפרקות לחם", "מגינות על המוח מבחוץ"],
    0,
    "בריאות מתבצע חילוף גזים.",
    "sci_body_g3_lung_gas"
  ),
  bodyMcq(
    "sci_g3_body_020",
    "איזה איבר מחבר בין הראש לגוף ומעביר אותות?",
    ["עמוד השדרה בצוואר", "הטבור", "האצבע", "השיער"],
    0,
    "עמוד השדרה מגן על חוט השדרה.",
    "sci_body_g3_spine"
  ),
  bodyMcq(
    "sci_g3_body_021",
    "מהי תצפית נכונה על דופק אחרי פעילות?",
    ["הדופק מהיר יותר מבמנוחה", "הדופק נעצר לגמרי", "אין שינוי בדופק", "הדופק תמיד איטי אחרי ריצה"],
    0,
    "במאמץ הלב פועם מהר יותר.",
    "sci_body_g3_pulse_observation",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_022",
    "למה עוטים קסדה על אופניים?",
    ["כדי להגן על הראש במקרה נפילה", "כדי שלא נראה", "כדי שלא נצטרך לנשום", "כדי שהשרירים ייעלמו"],
    0,
    "הגנה על הראש מפחית פציעות.",
    "sci_body_g3_safety_helmet"
  ),
  bodyMcq(
    "sci_g3_body_023",
    "מה תפקיד הכבד בגוף?",
    ["עוזר לעבד חומרים ולנקות את הדם", "מאחסן אוויר לנשימה", "מזיז את הרגליים", "מייצר צלילים באוזן"],
    0,
    "הכבד תומך בעיכול וניקוי.",
    "sci_body_g3_liver_role"
  ),
  bodyMcq(
    "sci_g3_body_024",
    "מה קורה למזון בפה?",
    ["נלעס ומתערבב עם רוק לפני בליעה", "הופך מיד לאבן", "נעלם לחלוטין", "הופך לדם"],
    0,
    "הפה הוא תחילת מערכת העיכול.",
    "sci_body_g3_mouth_digestion"
  ),
  bodyMcq(
    "sci_g3_body_025",
    "איזה משפט נכון על עצמות ושרירים?",
    ["שרירים מושכים על עצמות ויוצרים תנועה", "עצמות מכווצות כמו שריר", "שרירים מחליפות את הריאות", "עצמות מייצרות חמצן"],
    0,
    "מפרקים ושרירים פועלים יחד.",
    "sci_body_g3_bone_muscle_team"
  ),
  bodyMcq(
    "sci_g3_body_026",
    "מהי סיבה אפשרית לעייפות אחרי יום ארוך?",
    ["הגוף זקוק למנוחה כדי להתאושש", "הגוף מפסיק לנשום", "העצמות גדלות פתאום", "העין מייצרת אור"],
    0,
    "שינה ומנוחה משקמות אנרגיה.",
    "sci_body_g3_fatigue_rest"
  ),
  bodyMcq(
    "sci_g3_body_027",
    "מה עוזר לשמור על עיניים בריאות?",
    ["הפסקות ממסכים ותאורה נכונה", "הסתכלות ישירה בשמש בלי הגנה", "אי שטיפת פנים", "אכילת ממתקים בלבד"],
    0,
    "מנוחה לעיניים מפחיתה עומס.",
    "sci_body_g3_eye_care"
  ),
  bodyMcq(
    "sci_g3_body_028",
    "מה תפקידן של הכליות בגוף?",
    ["מסננות פסולת מהדם ויוצרות שתן", "מניעות את הידיים", "שומעות צלילים", "מעכלות ירקות בלבד"],
    0,
    "כליות תורמות לניקוי הגוף.",
    "sci_body_g3_kidneys"
  ),
  bodyMcq(
    "sci_g3_body_029",
    "למה חשוב לאכול ארוחת בוקר?",
    ["נותנת אנרגיה להתחלת היום", "מבטלת צורך בשינה", "מחליפה פעילות גופנית", "גורמת לעצמות להיעלם"],
    0,
    "ארוחת בוקר תומכת בריכוז ובאנרגיה.",
    "sci_body_g3_breakfast"
  ),
  bodyMcq(
    "sci_g3_body_030",
    "מה קורה כשחוט שדרה שולח אות מסוכן?",
    ["הגוף יכול להגיב במהירות לפני חשיבה ארוכה", "הגוף מפסיק לנשום", "העצמות נשברות", "השיער נושר"],
    0,
    "תגובות מהירות מגינות על הגוף.",
    "sci_body_g3_reflex",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_031",
    "איזה מזון תורם לחיזוק העצמות?",
    ["מוצרי חלב עשירים בסידן", "ממתקים בלבד", "משקאות מוגזים", "צ'יפס בלבד"],
    0,
    "סידן תומך בחוזק העצמות.",
    "sci_body_g3_calcium"
  ),
  bodyMcq(
    "sci_g3_body_032",
    "מה נכון לגבי שינה בלילה?",
    ["מאפשרת לגוף לגדול ולהתאושש", "מונעת נשימה", "מחליפה אוכל לחלוטין", "גורמת לשרירים להיעלם"],
    0,
    "שינה חיונית להתפתחות ולריכוז.",
    "sci_body_g3_sleep"
  ),
  bodyMcq(
    "sci_g3_body_033",
    "מה תפקיד הרוק?",
    ["ללחלך מזון ולהתחיל עיכול", "להזרים דם", "להעביר אור", "להחזיק את הריאות"],
    0,
    "רוק מרטיב ומעכל חלקית.",
    "sci_body_g3_saliva"
  ),
  bodyMcq(
    "sci_g3_body_034",
    "מהי דרך בטוחה להשתמש בסכין במטבח?",
    ["בהדרכת מבוגר ובזהירות", "להעביר לחבר בלי להסתכל", "לרוץ עם סכין", "להחביא סכין בכיס"],
    0,
    "בטיחות במטבח מונעת פציעות.",
    "sci_body_g3_kitchen_safety"
  ),
  bodyMcq(
    "sci_g3_body_035",
    "מה קורה כשאנחנו מתקרבים מדי לרמקול חזק?",
    ["עלולות להיפגע שמיעתנו", "העיניים משתפרות", "העצמות מתחזקות", "השיניים מבריקות יותר"],
    0,
    "רעש חזק מזיק לאוזניים.",
    "sci_body_g3_hearing_safety"
  ),
  bodyMcq(
    "sci_g3_body_036",
    "מה מאפיין מערכת העצבים?",
    ["מעבירה הודעות בין מוח לשאר הגוף", "מייצרת חמצן בלבד", "מחזיקה את העצמות", "מחליפה את העור"],
    0,
    "עצבים מעבירים אותות.",
    "sci_body_g3_nervous_system"
  ),
  bodyMcq(
    "sci_g3_body_037",
    "למה חשוב להתעמל או ללכת?",
    ["מחזק שרירים ותומך בלב", "מבטל צורך באוויר", "מונע שינה", "מחליף שתייה"],
    0,
    "פעילות גופנית סדירה מועילה לבריאות.",
    "sci_body_g3_exercise"
  ),
  bodyMcq(
    "sci_g3_body_038",
    "מה עושים הריסים סביב העין?",
    ["מגינים על העין מגוף זר", "מייצרים קול", "מעכלים מזון", "מזרימים דם"],
    0,
    "ריסים עוזרים להגן על העין.",
    "sci_body_g3_eyelashes"
  ),
  bodyMcq(
    "sci_g3_body_039",
    "מה קורה כשאנחנו קרים?",
    ["לעיתים הגוץ רועד כדי לייצר חום", "הגוף מפסיק לעבוד", "העצמות נעלמות", "העין מפסיקה לראות לנצח"],
    0,
    "רעידה היא תגובה לקור.",
    "sci_body_g3_cold_response",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_040",
    "איזה איבר שייך למערכת ההפרשה?",
    ["כליה", "ריאה", "שריר הזרוע", "שקדה"],
    0,
    "כליות מסייעות בהוצאת פסולת.",
    "sci_body_g3_excretory"
  ),
  bodyMcq(
    "sci_g3_body_041",
    "מה נכון על שתיית מים בחום?",
    ["חשוב לשתות יותר כי הגוף מאבד נוזלים", "אסור לשתות בחום", "מים מזיקים בחום", "מים מחליפים אוויר"],
    0,
    "בחום יש להשלים נוזלים.",
    "sci_body_g3_heat_hydration"
  ),
  bodyMcq(
    "sci_g3_body_042",
    "מה תפקיד המעי הדק?",
    ["ספיגת חומרי מזון לדם", "אחסון אוויר", "הגנה על המוח", "שמיעת צלילים"],
    0,
    "ברוב הספיגה מתרחשת במעי הדק.",
    "sci_body_g3_small_intestine"
  ),
  bodyMcq(
    "sci_g3_body_043",
    "מהי דרך לשמור על אף בריא בימי הצטננות?",
    ["לנשום אוויר נקי ולנוח", "להכניס חפצים לאף", "לא לשטוף ידיים", "לרוץ בלי מעיל תמיד"],
    0,
    "מנוחה והיגיינה מקלות על הצטננות.",
    "sci_body_g3_cold_care"
  ),
  bodyMcq(
    "sci_g3_body_044",
    "מה קשר בין חמצן לשרירים בזמן ריצה?",
    ["שרירים זקוקים ליותר חמצן כשפועלים", "שרירים לא צריכים חמצן", "חמצן מחליף שרירים", "ריצה עוצרת נשימה"],
    0,
    "מאמץ מגדיל צורך בחמצן.",
    "sci_body_g3_muscle_oxygen"
  ),
  bodyMcq(
    "sci_g3_body_045",
    "מה עושה מוח הילד כשלומדים משהו חדש?",
    ["יוצר קשרים חדשים בין תאי עצב", "מפסיק לעבוד", "מחליף את הלב", "מייצר עצמות"],
    0,
    "למידה משנה את פעילות המוח.",
    "sci_body_g3_brain_learning",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_046",
    "למה חשוב לאכול ירקות ופירות?",
    ["מספקים ויטמינים וסיבים", "מונעים לחלוטין שינה", "מחליפים מים לנצח", "גורמים לעצמות להיעלם"],
    0,
    "ירקות ופירות חלק ממזון מאוזן.",
    "sci_body_g3_fruits_veggies"
  ),
  bodyMcq(
    "sci_g3_body_047",
    "מה תפקיד הטחול בפצע קטן?",
    ["מגן על הפצע מחיידקים", "מחליף את הלב", "מייצר קול", "מונע נשימה"],
    0,
    "טחול מפחית זיהום.",
    "sci_body_g3_wound_care"
  ),
  bodyMcq(
    "sci_g3_body_048",
    "מה נכון על מנגנון הזעה בחום?",
    ["עוזרת לקרר את הגוף", "מחממת את הגוף", "מפסיקה נשימה", "מחליפה שינה"],
    0,
    "התאדות מזיעה מקררת.",
    "sci_body_g3_sweat_cooling",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_049",
    "איזה זוג שייך לחוש המישוש?",
    ["עור ומוח", "ריאה ולב", "שן ולשון", "עצם ודם"],
    0,
    "עור שולח אותות מישוש למוח.",
    "sci_body_g3_touch_pair"
  ),
  bodyMcq(
    "sci_g3_body_050",
    "מה עושים כליות יחד עם הריאות והלב?",
    ["עובדות יחד לשמירה על גוף בריא", "אין ביניהן קשר", "מחליפות זו את זו", "יוצרות אור"],
    0,
    "מערכות הגוף פועלות במערכת.",
    "sci_body_g3_systems_together",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_051",
    "מהי תצפית נכונה על שינויי דופק לפני ואחרי קפיצה?",
    ["אחרי קפיצה הדופק עולה ואז יורד בהדרגה", "הדופק לא משתנה לעולם", "לפני קפיצה הדופק תמיד גבוה", "הדופק נעצר אחרי קפיצה"],
    0,
    "פעילות משפיעה על קצב הלב.",
    "sci_body_g3_pulse_jump",
    "understanding"
  ),
  bodyMcq(
    "sci_g3_body_052",
    "למה חשוב לשמור על גב ישר בישיבה?",
    ["מפחית עומס על עמוד השדרה", "מבטל צורך בעצמות", "מונע נשימה", "מחליף פעילות גופנית"],
    0,
    "ישיבה נכונה תומכת בגב.",
    "sci_body_g3_posture"
  ),
];

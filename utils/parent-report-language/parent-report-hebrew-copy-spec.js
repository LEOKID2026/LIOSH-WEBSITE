/**
 * Parent report Hebrew copy — literal templates from parent_report_hebrew_copy_spec.md only.
 * Do not invent wording here; add new strings only when the spec is updated.
 */

import {
  PARENT_TOPIC_HOME_ACTION_HEADING_HE,
  resolveParentFacingPatternLabelHe,
} from "../learning-pattern-decision/parent-facing-error-pattern-he.js";

/** @typedef {{ subject?: string, topic?: string, q?: number, acc?: number, wrongRatio?: number|null, pattern?: string, action?: string, rootCause?: string, strongTopic?: string, weakTopic?: string, totalAnswers?: number, diagnosticAnswers?: number }} CopyVars */

/** Spec §9 — forbidden verbatim phrases in parent-facing output */
export const SPEC_FORBIDDEN_PARENT_PHRASES = Object.freeze([
  "פער יסוד",
  "קושי בבסיס",
  "הצלחה שבירה",
  "נראה שיש קושי ב",
  "יש טעויות חוזרות ב",
  "שווה לחזור עליהן בקצב איטי",
  "כדאי לשים לב ל",
  "זה נושא שחוזר בתרגולים",
  "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף",
  "הדפוס הנראה בביצוע",
  "נשמרו גם שיקולי זהירות",
  "חלקים פשוטים יותר של הנושא",
  "לא נקבע",
  "רעש טבעי של למידה מוקדמת",
  "אין מספיק מידע",
  "אין עדיין מספיק מידע",
  "יש כמה סוגי טעויות",
  "אין עדיין דפוס אחד ברור",
  "בלבול מושגי",
  "נקודת ידע לא יציבה",
  "clear_topic_gap",
  "partial_stable",
  "mastery_stable",
  "topic_needs_strengthening",
  "early_direction_only",
  "insufficient_data",
  "engineDecision",
  "safeSubskill",
  "taxonomy",
  "metadata",
  "candidate",
  "fallback",
]);

const MEANING_BY_ROOT_CAUSE_INSIGHT = Object.freeze({
  knowledge_gap: "הנתונים מצביעים על נקודת חיזוק שעדיין לא יציבה.",
  speed_pressure: "חלק מהטעויות נראות קשורות למהירות - לא בהכרח לפער ידע מלא.",
  instruction_friction: "ייתכן שהקושי קשור להבנת ההוראה, ולא רק לידע בנושא.",
  careless_execution: "נראה שהחומר מוכר בחלקו, אבל יש טעויות ביצוע שחוזרות כשממהרים.",
  weak_independence: "הילד מצליח יותר כשיש ליווי, ועדיין כדאי לחזק פתרון עצמאי.",
  insufficient_evidence: "עדיין מעט תשובות - כדאי עוד תרגול קצר לפני מסקנה ברורה.",
  preliminary_direction: "יש כיוון ראשוני, אבל כדאי עוד קצת תרגול לפני מסקנה ברורה.",
  recurring_pattern:
    "כבר מופיע דפוס שחוזר בנושא הזה, ולכן כדאי להתייחס אליו ולחזק אותו. עדיין מומלץ להמשיך לתרגל כדי לוודא שהדפוס יציב לאורך זמן.",
  recurring_pattern_supported:
    "כבר מופיע דפוס שחוזר בנושא הזה בכמה מפגשים, ולכן כדאי להתייחס אליו ולחזק אותו. מומלץ להמשיך לתרגל כדי לוודא שהדפוס יציב לאורך זמן.",
  no_consistent_pattern: "יש כבר תרגול בנושא, אבל עדיין לא מופיע דפוס עקבי מספיק.",
  mixed_signal: "יש כמה כיוונים אפשריים - כדאי לבדוק שוב אחרי עוד תרגול קצר.",
  early_stage_instability: "עדיין מעט תשובות - כדאי עוד תרגול קצר לפני מסקנה ברורה.",
  mixed: "יש כמה כיוונים אפשריים - כדאי לבדוק שוב אחרי עוד תרגול קצר.",
});

const MEANING_BY_BEHAVIOR_EXPLAIN = Object.freeze({
  knowledge_gap:
    "יש נקודת חיזוק בנושא שעדיין לא יציבה. הדוח מסתמך על הדיוק ושיעור הטעויות.",
  fragile_success:
    "הילד מגיע לחלק מהתשובות הנכונות, אבל היציבות עדיין לא מלאה. חשוב לבדוק את דרך הפתרון ולא רק את התוצאה הסופית.",
  speed_pressure:
    "חלק מהטעויות נראות קשורות למהירות או ללחץ זמן, ולכן לא נכון להסיק מיד שהחומר כולו לא מובן.",
  instruction_friction:
    "ייתכן שהקושי קשור לקריאת ההוראה או להבנת מה שמבקשים בשאלה, ולא רק לידע בנושא.",
  careless_execution:
    "נראה שהילד מכיר חלק מהחומר, אבל יש טעויות ביצוע שחוזרות כשממהרים או מדלגים על שלב.",
  careless_pattern:
    "נראה שהילד מכיר חלק מהחומר, אבל יש טעויות ביצוע שחוזרות כשממהרים או מדלגים על שלב.",
  weak_independence:
    "הילד מצליח יותר כשיש ליווי או רמזים, ועדיין צריך לחזק פתרון עצמאי.",
  stable_mastery:
    "הנתונים מצביעים על שליטה טובה בנושא כרגע. חשוב לשמר את היכולת ולא למהר להסיק שכל המקצוע כבר יציב.",
  insufficient_evidence:
    "עדיין מעט תשובות - כדאי עוד תרגול קצר לפני מסקנה ברורה.",
  undetermined:
    "עדיין מעט תשובות - כדאי עוד תרגול קצר לפני מסקנה ברורה.",
  mixed_low_signal:
    "עדיין מעט תשובות - כדאי עוד תרגול קצר לפני מסקנה ברורה.",
  mixed_signal:
    "יש סימנים לכמה כיוונים שונים, ולכן הדוח ממליץ להתקדם בזהירות ולא לקבוע מסקנה אחת חזקה מדי.",
  mixed:
    "יש סימנים לכמה כיוונים שונים, ולכן הדוח ממליץ להתקדם בזהירות ולא לקבוע מסקנה אחת חזקה מדי.",
});

const ACTION_BY_ROOT_CAUSE = Object.freeze({
  knowledge_gap:
    "לחזור על שאלות דומות באותו נושא ובאותה רמת קושי, ולבקש מהילד להסביר בקול את שלבי הפתרון.",
  speed_pressure: "לפתור כמה שאלות בלי טיימר, לעצור לפני שליחה, ולבדוק אם התשובה מתאימה לשאלה.",
  instruction_friction:
    "לקרוא יחד את ההוראה, לסמן מה מבקשים למצוא, ורק אחר כך לפתור את השאלה.",
  careless_execution:
    "לפתור לאט ולבצע בדיקת סיום קצרה: האם עניתי על מה שנשאל, והאם דילגתי על שלב.",
  weak_independence:
    "לתת לילד ניסיון ראשון לבד, ורק אחר כך לבדוק יחד. המטרה היא לחזק פתרון עצמאי לפני קבלת עזרה.",
  fragile_success:
    "לפתור מספר קטן של שאלות דומות, להתעכב על הניסיון הראשון, ולבדוק למה התשובה הראשונה נבחרה.",
  stable_mastery:
    "לשמר את הנושא בתרגול קצר, ואפשר לשלב בהדרגה שאלות מעט מאתגרות יותר אם הדיוק נשמר.",
  insufficient_evidence:
    "עדיין מעט תשובות - כדאי עוד תרגול קצר באותו נושא, ואז לבדוק שוב את הדוח.",
  preliminary_direction: "לבצע עוד כמה שאלות באותו נושא, ואז לבדוק שוב את הדוח.",
  recurring_pattern:
    "לחזור על שאלות דומות באותו נושא, לחזק את הנקודה שחוזרת, ולבדוק שוב אחרי עוד תרגול.",
  recurring_pattern_supported:
    "להמשיך בתרגול ממוקד באותו נושא, לחזק את הנקודה שחוזרת, ולבדוק שהשיפור נשמר גם בהמשך.",
  no_consistent_pattern:
    "להמשיך בתרגול קצר באותו נושא כדי לראות אם יתגבש דפוס עקבי.",
  mixed_signal:
    "להמשיך בתרגול קצר באותו נושא - כדאי לבדוק שוב אחרי עוד כמה שאלות.",
  early_stage_instability:
    "לבצע עוד כמה שאלות באותו נושא, ואז לבדוק שוב את הדוח.",
});

/** Spec §3 — mistake pattern parent text by engine id */
export const MISTAKE_PATTERN_PARENT_HE = Object.freeze({
  insufficient_mistake_evidence: "",
  recurring_weakness: "חלק מהטעויות חוזרות באותו סוג פעילות.",
  insufficient_recurrence: "",
  early_signal: "",
  speed_driven_error: "חלק מהטעויות הופיעו בזמן עבודה מהיר.",
  instruction_misread: "חלק מהטעויות נראות קשורות להבנת ההוראה.",
  support_dependent_success: "הצלחה בעיקר כשיש ליווי או רמזים.",
  careless_flip: "טעויות ביצוע קטנות שחוזרות כשממהרים.",
  concept_confusion: "",
  procedure_break: "בלבול בסדר הפעולות או בשלבי הפתרון.",
  mixed_mistake_pattern: "",
  early_learning_noise: "",
});

/** Spec §4 — foundation dependency parent text by engine id */
export const DEPENDENCY_STATE_PARENT_HE = Object.freeze({
  insufficient_dependency_evidence:
    "אין עדיין מספיק מידע כדי לדעת אם הקושי נמצא בנושא עצמו או בבסיס שלו.",
  likely_local_issue: "הסימנים מצביעים בעיקר על קושי בתוך הנושא הזה עצמו.",
  likely_foundational_block:
    "יש סימן שהקושי אולי קשור לבסיס של הנושא, אבל אין עדיין מיפוי שמראה איזה חלק בסיסי בדיוק.",
  mixed_dependency_signal:
    "יש גם סימנים לקושי בנושא עצמו וגם סימנים שאולי הבסיס משפיע. לכן כדאי להמשיך בזהירות ולא לקבוע מסקנה אחת חזקה מדי.",
  accuracy_foundation_gap:
    "הדיוק הנמוך חוזר מספיק כדי לחשוד שהבסיס של הנושא עדיין לא יציב, אבל אין זיהוי מדויק של תת-נושא בסיסי.",
});

/** Spec §2.1 — allowed step labels for parent explain block */
const STEP_LABEL_BY_ENGINE_STEP = Object.freeze({
  maintain_and_strengthen: "לבסס באותה רמה",
  remediate_same_level: "חיזוק באותה רמה",
  advance_level: "העלאת רמת קושי בנושא זה בלבד",
  advance_grade_topic_only: "העלאת כיתה בנושא זה בלבד",
  drop_one_level_topic_only: "הורדת רמת קושי בנושא זה בלבד",
  drop_one_grade_topic_only: "הורדת רמת קושי בנושא זה בלבד",
});

const SUBJECT_ID_TO_LABEL = Object.freeze({
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
});

function clean(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectLabel(subject, subjectId) {
  const s = clean(subject);
  if (s) return s;
  return SUBJECT_ID_TO_LABEL[String(subjectId || "")] || "";
}

/**
 * @param {string} [recommendedNextStep]
 * @param {string} [recommendedStepLabelHe]
 */
export function parentStepLabelHe(recommendedNextStep, recommendedStepLabelHe) {
  const step = clean(recommendedNextStep);
  if (step && STEP_LABEL_BY_ENGINE_STEP[step]) return STEP_LABEL_BY_ENGINE_STEP[step];
  const lab = clean(recommendedStepLabelHe);
  for (const allowed of Object.values(STEP_LABEL_BY_ENGINE_STEP)) {
    if (lab === allowed) return allowed;
  }
  if (lab.includes("לבסס")) return STEP_LABEL_BY_ENGINE_STEP.maintain_and_strengthen;
  if (lab.includes("חיזוק")) return STEP_LABEL_BY_ENGINE_STEP.remediate_same_level;
  if (lab.includes("העלאת רמת")) return STEP_LABEL_BY_ENGINE_STEP.advance_level;
  if (lab.includes("העלאת כיתה")) return STEP_LABEL_BY_ENGINE_STEP.advance_grade_topic_only;
  if (lab.includes("הורדת")) return STEP_LABEL_BY_ENGINE_STEP.drop_one_level_topic_only;
  return "";
}

/**
 * @param {string} [dominantMistakePattern]
 * @param {string} [dominantMistakePatternLabelHe]
 */
export function patternTextFromEngineHe(dominantMistakePattern, dominantMistakePatternLabelHe) {
  const id = clean(dominantMistakePattern);
  if (id && MISTAKE_PATTERN_PARENT_HE[id]) return MISTAKE_PATTERN_PARENT_HE[id];
  void dominantMistakePatternLabelHe;
  return "";
}

/**
 * @param {string} [dependencyState]
 */
export function foundationTextFromEngineHe(dependencyState) {
  const dep = clean(dependencyState);
  if (dep && DEPENDENCY_STATE_PARENT_HE[dep]) return DEPENDENCY_STATE_PARENT_HE[dep];
  return "";
}

/**
 * @param {string} [rootCause]
 * @param {string} [diagnosticType]
 */
export function meaningInsightSentenceHe(rootCause, diagnosticType) {
  const rc = clean(rootCause);
  if (rc && MEANING_BY_ROOT_CAUSE_INSIGHT[rc]) return MEANING_BY_ROOT_CAUSE_INSIGHT[rc];
  const bt = clean(diagnosticType);
  if (bt === "knowledge_gap") return MEANING_BY_ROOT_CAUSE_INSIGHT.knowledge_gap;
  if (bt === "speed_pressure") return MEANING_BY_ROOT_CAUSE_INSIGHT.speed_pressure;
  if (bt === "instruction_friction") return MEANING_BY_ROOT_CAUSE_INSIGHT.instruction_friction;
  if (bt === "careless_pattern") return MEANING_BY_ROOT_CAUSE_INSIGHT.careless_execution;
  if (bt === "fragile_success") return MEANING_BY_ROOT_CAUSE_INSIGHT.weak_independence;
  return "הדוח מציג את הנושא למעקב, אך אין עדיין סיבה פנימית מדויקת יותר.";
}

/**
 * @param {string} [rootCause]
 * @param {string} [diagnosticType]
 */
export function meaningExplainSentenceHe(rootCause, diagnosticType) {
  const rc = clean(rootCause);
  if (rc && MEANING_BY_BEHAVIOR_EXPLAIN[rc]) return MEANING_BY_BEHAVIOR_EXPLAIN[rc];
  const bt = clean(diagnosticType);
  if (bt && MEANING_BY_BEHAVIOR_EXPLAIN[bt]) return MEANING_BY_BEHAVIOR_EXPLAIN[bt];
  return MEANING_BY_BEHAVIOR_EXPLAIN.undetermined;
}

/**
 * @param {string} [rootCause]
 * @param {string} [diagnosticType]
 * @param {string} [engineAction]
 */
export function actionTextHe(rootCause, diagnosticType, engineAction) {
  const rc = clean(rootCause);
  if (rc && ACTION_BY_ROOT_CAUSE[rc]) return ACTION_BY_ROOT_CAUSE[rc];
  const bt = clean(diagnosticType);
  if (bt === "fragile_success" && ACTION_BY_ROOT_CAUSE.fragile_success) return ACTION_BY_ROOT_CAUSE.fragile_success;
  if (bt === "stable_mastery" && ACTION_BY_ROOT_CAUSE.stable_mastery) return ACTION_BY_ROOT_CAUSE.stable_mastery;
  const eng = clean(engineAction);
  if (eng) return eng;
  return "להמשיך בתרגול קצר באותו נושא, בלי להסיק עדיין מסקנה מדויקת יותר.";
}

/** Spec §1.2 zero diagnostic */
export function activityGapZeroDiagnosticHe(totalAnswers) {
  return (
    `היו ${Math.round(Number(totalAnswers) || 0)} תשובות באתר, אבל 0 נספרו לדוח הלימודי. ` +
    "לכן הדוח עדיין לא מציג תמונה לימודית מלאה. כדי לקבל תמונה מדויקת יותר, כדאי לבצע גם תרגול שאלות רגיל במקצועות הליבה."
  );
}

/** Spec §1.2 partial diagnostic */
export function activityGapPartialDiagnosticHe(totalAnswers, diagnosticAnswers) {
  return (
    `היו ${Math.round(Number(totalAnswers) || 0)} תשובות באתר, אבל רק ${Math.round(Number(diagnosticAnswers) || 0)} נספרו לדוח הלימודי. ` +
    "לכן המסקנות עדיין חלקיות. כדי לקבל תמונה מדויקת יותר, כדאי לבצע עוד תרגול שאלות רגיל במקצועות הליבה."
  );
}

/** Spec §1.2 non-diagnostic only */
export function activityGapNonDiagnosticOnlyHe() {
  return (
    "היו פעילויות באתר בתקופה הזו, אבל רובן אינן מסוג שמאפשר לדוח להסיק מסקנה לימודית מדויקת. " +
    "כדאי להוסיף תרגול שאלות רגיל כדי שהדוח יוכל לזהות חוזקות ונקודות לחיזוק."
  );
}

/** Spec §1.3 */
export function noUrgentTopicInsightHe() {
  return (
    "בתקופה שנבחרה יש תרגול, אבל המערכת עדיין לא זיהתה נושא אחד בולט שצריך חיזוק מיוחד. " +
    "כדאי להמשיך בתרגול קצר וקבוע ולבדוק שהיציבות נשמרת גם בהמשך."
  );
}

/** Spec §1.4 */
export function mixedSubjectStrongWeakHe(subject, strongTopic, weakTopic) {
  const subj = clean(subject);
  const strong = clean(strongTopic);
  const weak = clean(weakTopic);
  if (!subj || !strong || !weak || strong === weak) return "";
  return (
    `ב${subj} יש תמונה מעורבת: בנושא ${strong} נראית נקודת חוזק, אבל בנושא ${weak} עדיין יש נקודה שכדאי לחזק. ` +
    "לכן הדוח מציג את המקצוע לפי נושאים ולא כמסקנה כללית אחת."
  );
}

/**
 * Post-processes insight/action text for low-data cases so the phrase matches actual q.
 * @param {string} text
 * @param {number} q
 */
function adjustInsufficientEvidenceByQHe(text, q) {
  const t = String(text || "");
  if (!t.includes("מעט תשובות")) return t;
  const n = Math.round(Number(q) || 0);
  if (n <= 5) return "עדיין מעט נתונים - עוד קצת תרגול יעזור לנו להבין טוב יותר.";
  if (n <= 15) return "יש כיוון ראשוני, אבל כדאי עוד קצת תרגול לפני מסקנה ברורה.";
  return "נראה שיש כאן נושא שכדאי לחזק בתרגול הקרוב.";
}

/**
 * Spec §1.1 topic attention insight
 * @param {CopyVars & { rootCause?: string, diagnosticType?: string, patternId?: string, engineAction?: string }} p
 */
export function topicAttentionInsightHe(p) {
  const subj = subjectLabel(p.subject, p.subjectId);
  const topic = clean(p.topic);
  const q = Math.round(Number(p.q) || 0);
  const acc = Math.round(Number(p.acc) || 0);
  let wr = p.wrongRatio;
  if (wr == null || !Number.isFinite(Number(wr))) wr = Math.max(0, Math.min(100, 100 - acc));
  else wr = Math.round(Number(wr));

  const patternText = patternTextFromEngineHe(p.patternId, p.pattern);
  const patternSentence = patternText
    ? patternText.endsWith(".")
      ? patternText
      : `${patternText}.`
    : "";

  const meaningSentence = adjustInsufficientEvidenceByQHe(
    meaningInsightSentenceHe(p.rootCause, p.diagnosticType),
    q
  );
  const action = adjustInsufficientEvidenceByQHe(
    actionTextHe(p.rootCause, p.diagnosticType, p.engineAction),
    q
  );

  const base =
    `ב${subj} - בנושא ${topic}: נפתרו ${q} שאלות, הדיוק היה ${acc}%, ושיעור הטעויות היה ${wr}%. ` +
    `${patternSentence ? `${patternSentence} ` : ""}${meaningSentence}`;

  return `${base} מה כדאי לעשות: ${action}`;
}

/** Spec §5.1 */
export function stableMasteryInsightHe(p) {
  const subj = subjectLabel(p.subject, p.subjectId);
  const topic = clean(p.topic);
  const q = Math.round(Number(p.q) || 0);
  const acc = Math.round(Number(p.acc) || 0);
  let wr = p.wrongRatio;
  if (wr == null || !Number.isFinite(Number(wr))) wr = Math.max(0, Math.min(100, 100 - acc));
  else wr = Math.round(Number(wr));
  return (
    `ב${subj} - בנושא ${topic}: נפתרו ${q} שאלות, והדיוק היה ${acc}%. ` +
    "נראית שליטה טובה בנושא. " +
    "מה כדאי לעשות: לשמר את הנושא בתרגול קצר מדי פעם, ולבדוק שהדיוק נשמר גם בשאלות חדשות."
  );
}

/** Spec §5.2 */
export function advanceLevelInsightHe(p) {
  const subj = subjectLabel(p.subject, p.subjectId);
  const topic = clean(p.topic);
  return (
    `ב${subj} - בנושא ${topic}: הנתונים מצביעים על שליטה טובה מספיק כדי לשקול עלייה ברמת הקושי בנושא הזה בלבד. ` +
    "מומלץ להתקדם בהדרגה ולבדוק שהדיוק נשמר גם בשאלות קשות יותר."
  );
}

/** Spec §5.3 */
export function advanceGradeInsightHe(p) {
  const subj = subjectLabel(p.subject, p.subjectId);
  const topic = clean(p.topic);
  return (
    `ב${subj} - בנושא ${topic}: הנתונים מצביעים על מוכנות להתקדמות בנושא הזה בלבד. ` +
    "העלייה לא אומרת שכל המקצוע מוכן לקפיצה, אלא רק שהנושא המסוים הזה נראה יציב יותר."
  );
}

/** Spec §5.4 */
export function strengthOverviewLineHe(p) {
  const subj = subjectLabel(p.subject, p.subjectId);
  const topic = clean(p.topic);
  const q = Math.round(Number(p.q) || 0);
  const acc = Math.round(Number(p.acc) || 0);
  return (
    `נקודת חוזק: ב${subj} - בנושא ${topic} נפתרו ${q} שאלות והדיוק היה ${acc}%. ` +
    "זה נושא שכדאי לשמר, ובמידה שהדיוק נשמר אפשר לשקול התקדמות הדרגתית."
  );
}

/** Spec §5.5 positive subject line */
export function rawMetricStrengthPositiveHe(subject, q, acc) {
  const subj = clean(subject);
  const nq = Math.round(Number(q) || 0);
  const nacc = Math.round(Number(acc) || 0);
  return (
    `ב${subj} נראית תמונה חיובית יחסית: ${nq} שאלות ודיוק ${nacc}%. ` +
    "כדי להבין אם זו שליטה יציבה, כדאי לבדוק גם את הפירוט לפי נושאים."
  );
}

/** Spec §5.5 caveat when weak topic in same subject */
export function rawMetricStrengthMixedSubjectHe(subject) {
  const subj = clean(subject);
  return (
    `ב${subj} יש גם נקודות טובות, אבל הדוח מצא נושא מסוים שכדאי לחזק. ` +
    "לכן חשוב להסתכל על הפירוט לפי נושאים ולא להסיק מסקנה כללית על כל המקצוע."
  );
}

/** Spec §5.6 */
export function dailyImprovementInsightHe() {
  return (
    "נראית מגמת שיפור בתקופה האחרונה, אבל צריך לבדוק אם היא נשמרת גם בהמשך. " +
    "מומלץ להמשיך באותה רמה עוד מעט לפני שמסיקים שהנושא כבר יציב."
  );
}

/** Spec §5.7 */
export function strengthNotStableEnoughHe() {
  return (
    "הדיוק נראה טוב, אבל יש סימני זהירות כמו רמזים, ניסיונות חוזרים או מגמה לא ברורה. " +
    "לכן כרגע עדיף לבסס את הנושא ולא לקפוץ רמה."
  );
}

/** Spec §6 insufficient_data (student level) */
export function insufficientDataInsightHe() {
  return (
    "יש עדיין מעט מדי נתוני תרגול כדי להציג תמונה לימודית אמינה. " +
    "כדאי להוסיף תרגול קצר כדי לקבל תמונה מדויקת יותר."
  );
}

/** Spec §6.1 — recent inactivity (not thin-data wording) */
export function recentInactivityInsightHe() {
  return "לא הייתה פעילות לאחרונה - מומלץ לחזור לתרגול קצר כדי לשמור על רצף למידה.";
}

/** Spec §2.1 */
export function explainIdentifiedHe(stepLabel, topic) {
  const step = clean(stepLabel);
  const t = clean(topic);
  if (step && t) return `מה רואים: ${step} בנושא ${t}.`;
  if (t) return `מה רואים: מיקוד בנושא ${t}.`;
  return "";
}

/** Spec §2.2 */
export function explainDataHe(q, acc, wrongRatio) {
  const nq = Math.round(Number(q) || 0);
  const nacc = Math.round(Number(acc) || 0);
  if (nq > 0 && nq < 5) {
    return `הנתונים: יש ${nq} שאלות בנושא - זו תמונה ראשונית בלבד.`;
  }
  const wr = wrongRatio != null && Number.isFinite(Number(wrongRatio)) ? Math.round(Number(wrongRatio)) : null;
  if (wr != null) return `הנתונים: ${nq} שאלות, דיוק ${nacc}%, ${wr}% טעויות.`;
  return `הנתונים: ${nq} שאלות, דיוק ${nacc}%.`;
}

/** Spec §2.3 */
export function explainPatternHe(patternText) {
  const mapped = resolveParentFacingPatternLabelHe(patternText);
  const p = clean(mapped || patternText);
  if (!p || /^[a-z][a-z0-9_]*$/i.test(p)) return "";
  if (p) return `הטעות שחוזרת: ${p.replace(/^הטעות שחוזרת:\s*/, "").replace(/^דפוס:\s*/, "").replace(/^דפוס הטעות הבולט:\s*/, "")}.`.replace(/\.\.$/, ".");
  return "";
}

/** Spec §2.4 */
export function explainMeaningHe(rootCause, diagnosticType, foundationLine) {
  const core = meaningExplainSentenceHe(rootCause, diagnosticType);
  const foundation = clean(foundationLine);
  if (foundation) return `מה זה אומר: ${core} ${foundation}`;
  return `מה זה אומר: ${core}`;
}

/** Spec §2.5 */
export function explainActionHe(rootCause, diagnosticType, engineAction) {
  const action = actionTextHe(rootCause, diagnosticType, engineAction);
  return `${PARENT_TOPIC_HOME_ACTION_HEADING_HE}: ${action}`;
}

/** Spec §7 home with engine action */
export function homeWithEngineActionHe(action) {
  const a = clean(action);
  if (!a) return "";
  return `בבית: ${a}`;
}

/** Spec §7 fallback */
export function homeFallbackHe() {
  return "בבית: מומלץ לבצע תרגול קצר וקבוע, ולבדוק בדוח הבא אם כבר נוצר דפוס ברור יותר.";
}

/** Spec §7 by subject when no action */
export function homeBySubjectHe(subjectId) {
  const sid = String(subjectId || "").trim();
  if (sid === "math" || sid === "geometry") {
    return "בבית: לפתור מעט שאלות באותו נושא, בקצב איטי, ולבקש מהילד להסביר את שלבי הפתרון.";
  }
  if (sid === "hebrew") {
    return "בבית: לקרוא טקסט קצר, לעצור אחרי כל קטע, ולבקש מהילד להסביר במילים שלו מה הבין.";
  }
  if (sid === "english") {
    return "בבית: לתרגל מעט מילים או משפטים קצרים, ולבדוק שהילד מבין את המשמעות ולא רק מזהה את התשובה.";
  }
  if (sid === "science" || sid === "moledet-geography") {
    return "בבית: לחזור על מושגים מרכזיים מהנושא, ולבקש מהילד להסביר דוגמה אחת במילים שלו.";
  }
  return homeFallbackHe();
}

/** Spec §2.4 / §6 — short parent labels for diagnostic type badges */
export const PARENT_DIAGNOSTIC_TYPE_LABEL_HE = Object.freeze({
  knowledge_gap: "יש נקודת ידע בנושא שעדיין לא יציבה.",
  speed_pressure: "חלק מהטעויות נראות קשורות למהירות או ללחץ זמן.",
  instruction_friction: "ייתכן שהקושי קשור לקריאת ההוראה או להבנת מה שמבקשים בשאלה.",
  careless_pattern: "נראה שהילד מכיר חלק מהחומר, אבל יש טעויות ביצוע שחוזרות כשממהרים או מדלגים על שלב.",
  careless_execution: "נראה שהילד מכיר חלק מהחומר, אבל יש טעויות ביצוע שחוזרות כשממהרים או מדלגים על שלב.",
  fragile_success: "הילד מגיע לחלק מהתשובות הנכונות, אבל היציבות עדיין לא מלאה.",
  stable_mastery: "הנתונים מצביעים על שליטה טובה בנושא כרגע.",
  undetermined: "עדיין לא נקבע דפוס ברור בנושא הזה.",
  insufficient_evidence: "עדיין מוקדם לקבוע בבירור מה צריך לחזק בנושא הזה.",
  mixed_low_signal: "עדיין מוקדם לקבוע בבירור מה צריך לחזק בנושא הזה.",
  mixed_signal: "יש סימנים לכמה כיוונים שונים, ולכן הדוח ממליץ להתקדם בזהירות.",
  mixed: "יש סימנים לכמה כיוונים שונים, ולכן הדוח ממליץ להתקדם בזהירות.",
  weak_independence: "הילד מצליח יותר כשיש ליווי או רמזים, ועדיין צריך לחזק פתרון עצמאי.",
  none_sparse: "יש מעט מדי שאלות בנושא הזה, ולכן לא מסיקים ממנו מסקנה ברורה.",
  none_observed: "אין עדיין מספיק חזרתיות כדי לומר שהטעות היא דפוס קבוע.",
});

/** Spec §1.1 meaningSentence — root cause labels for parent display */
export const ROOT_CAUSE_PARENT_HE = Object.freeze({
  knowledge_gap: MEANING_BY_ROOT_CAUSE_INSIGHT.knowledge_gap,
  speed_pressure: MEANING_BY_ROOT_CAUSE_INSIGHT.speed_pressure,
  instruction_friction: MEANING_BY_ROOT_CAUSE_INSIGHT.instruction_friction,
  careless_execution: MEANING_BY_ROOT_CAUSE_INSIGHT.careless_execution,
  weak_independence: MEANING_BY_ROOT_CAUSE_INSIGHT.weak_independence,
  insufficient_evidence: MEANING_BY_ROOT_CAUSE_INSIGHT.insufficient_evidence,
  preliminary_direction: MEANING_BY_ROOT_CAUSE_INSIGHT.preliminary_direction,
  recurring_pattern: MEANING_BY_ROOT_CAUSE_INSIGHT.recurring_pattern,
  recurring_pattern_supported: MEANING_BY_ROOT_CAUSE_INSIGHT.recurring_pattern_supported,
  no_consistent_pattern: MEANING_BY_ROOT_CAUSE_INSIGHT.no_consistent_pattern,
  mixed_signal: MEANING_BY_ROOT_CAUSE_INSIGHT.mixed_signal,
  early_stage_instability: MEANING_BY_ROOT_CAUSE_INSIGHT.insufficient_evidence,
  retention_fragility: MEANING_BY_ROOT_CAUSE_INSIGHT.insufficient_evidence,
  language_load: MEANING_BY_ROOT_CAUSE_INSIGHT.instruction_friction,
  transition_gap: MEANING_BY_ROOT_CAUSE_INSIGHT.insufficient_evidence,
});

/** Spec §6 preliminary_signal */
export function preliminarySignalHe() {
  return "יש סימן ראשוני, אבל עדיין אין מספיק חזרתיות כדי לקבוע מסקנה ברורה.";
}

/**
 * @param {string} [diagnosticType]
 */
export function parentDiagnosticTypeLabelHe(diagnosticType) {
  const k = clean(diagnosticType);
  if (k && PARENT_DIAGNOSTIC_TYPE_LABEL_HE[k]) return PARENT_DIAGNOSTIC_TYPE_LABEL_HE[k];
  return k ? "מה שנראה בתרגול" : "עדיין לא נקבע דפוס ברור בנושא הזה.";
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findSpecForbiddenPhrasesInString(text) {
  const t = String(text || "");
  const hits = [];
  for (const phrase of SPEC_FORBIDDEN_PARENT_PHRASES) {
    if (t.includes(phrase)) hits.push(phrase);
  }
  return hits;
}

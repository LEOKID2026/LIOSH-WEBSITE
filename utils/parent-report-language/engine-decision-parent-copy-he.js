/**
 * Parent-facing Hebrew copy from engineDiagnosticDecision only — no engine/threshold changes.
 * Templates per Stage Hebrew parent copy spec (engine decision × safeSubskill).
 */

import { subjectLabelHe } from "../../lib/teacher-portal/teacher-ui.he.js";
import { TAXONOMY_BY_ID } from "../diagnostic-engine-v2/taxonomy-registry.js";
import { resolveGradeAwareParentRecommendationHe } from "./grade-aware-recommendation-resolver.js";
import { splitTopicRowKey } from "../parent-report-row-diagnostics.js";
import { buildSpeedPressurePatternFindingHe } from "../learning-pattern-decision/normalize-parent-practice-metrics.js";

/** Home actions by taxonomy id — editorial parent copy, not engine logic. */
const HOME_ACTION_BY_TAXONOMY_ID = Object.freeze({
  "M-02":
    "לפתור תרגילים בטור, לסמן יחידות ועשרות, ולבקש מהילד להסביר מתי מעבירים עשרת לעמודה הבאה.",
  "M-09":
    "לפתור לאט תרגילי חיסור בטור, לסמן מאיפה לוקחים עשרת, ולבדוק כל שלב לפני התשובה.",
  "M-01":
    "לפרק מספרים לעשרות ואחדות או למאות, עשרות ואחדות, ואז לפתור.",
  "M-04":
    "לשאול בכל שבר \"כמה חלקים יש בסך הכול?\" ו\"כמה חלקים לקחנו?\", לפני שמחשבים.",
  "M-05":
    "לצייר שני שברים פשוטים, להשוות בציור, ורק אחר כך לעבור לחישוב.",
  "M-03":
    "לעבוד על קבוצות שוות, למשל \"3 קבוצות של 4\", ולבקש מהילד להסביר מה כל מספר מייצג.",
  "M-10":
    "לעבוד על קבוצות שוות, למשל \"3 קבוצות של 4\", ולבקש מהילד להסביר מה כל מספר מייצג.",
  "G-03":
    "להראות צורה ולשאול \"מה מודדים בתוך הצורה?\". לאחר מכן לחשב יחד לפי יחידות שטח.",
  "G-08":
    "להראות צורה ולשאול \"מה מודדים בתוך הצורה?\". לאחר מכן לחשב יחד לפי יחידות שטח.",
  "G-06":
    "להראות צורה ולשאול \"מה מודדים מסביב לצורה?\". לאחר מכן לחבר את אורכי הצלעות.",
  "G-04":
    "בכל צורה לשאול קודם \"האם מודדים בפנים או מסביב?\", ורק אחר כך לחשב.",
  "G-02":
    "לסמן את היחידות ליד כל מספר ולבדוק שהתשובה כתובה ביחידה הנכונה.",
  "G-01":
    "לבקש מהילד להצביע על הנתונים בציור לפני שהוא מתחיל לפתור.",
  "E-01":
    "לקרוא 5–8 מילים קצרות, לבקש מהילד לומר את המשמעות בעברית, ואז להשתמש במילה אחת במשפט קצר.",
  "E-02":
    "לתת מילה בעברית, לבקש מהילד לומר באנגלית, ואז לבדוק יחד את הכתיב והמשמעות.",
  "E-03":
    "לקרוא מילה באנגלית, לבקש מהילד להסביר בעברית, ולא רק לבחור תשובה.",
  "E-05":
    "להציג שתי מילים דומות, לקרוא אותן לאט, ולסמן מה שונה ביניהן.",
  "E-06":
    "לקרוא משפט קצר, לעצור, ולשאול \"מה המשפט אומר בעברית?\"",
  "H-04":
    "לקרוא משפט קצר בקול, לעצור, ולבקש מהילד להסביר מה קרא.",
  "H-02":
    "לקרוא את המשפט ולשאול מה התפקיד של המילה במשפט, בלי למהר לתשובה.",
  "H-06":
    "לקרוא את המשפט ולשאול מה התפקיד של המילה במשפט, בלי למהר לתשובה.",
  "H-01":
    "לבחור מילה אחת מהשאלה, לבקש מהילד להסביר אותה במילים שלו, ואז להשתמש בה במשפט.",
  "H-03":
    "לכתוב את המילה, לקרוא אותה בקול, ולסמן את החלק שבו הייתה הטעות.",
  "H-07":
    "לכתוב את המילה, לקרוא אותה בקול, ולסמן את החלק שבו הייתה הטעות.",
  "S-01":
    "לחזור על 3 עובדות קצרות, ואז לשאול שאלה אחת בלי להסתכל.",
  "S-02":
    "לחזור על 3 עובדות קצרות, ואז לשאול שאלה אחת בלי להסתכל.",
  "S-03":
    "לשים שני מושגים זה ליד זה, לשאול \"מה דומה?\" ו\"מה שונה?\", ואז לפתור שאלה אחת.",
  "S-04":
    "לשאול \"מה קרה קודם?\" ו\"מה קרה בגלל זה?\"",
  "S-05":
    "לשאול \"מה קרה קודם?\" ו\"מה קרה בגלל זה?\"",
  "S-06":
    "לסדר את שלבי התהליך לפי הסדר, ואז להסביר כל שלב במשפט קצר.",
  "S-07":
    "לבחור מושג אחד, לבקש מהילד להסביר אותו במילים שלו, ואז לתת דוגמה מהחיים.",
  "MG-01":
    "לתרגל קריאת קנה מידה במפה בעזרת סרגל או קו קנה מידה, ולבקש מהילד להסביר מה מייצג המרחק במפה.",
  "MG-02":
    "לתרגל כיוונים במפה בעזרת חץ צפון, ולבקש מהילד להסביר לאיזה כיוון צריך ללכת.",
  "MG-03":
    "לתרגל מצבים קצרים שבהם צריך להבחין בין זכות, חובה או כלל, ולבקש מהילד להסביר מה בטקסט תומך בתשובה.",
  "MG-04":
    "לתרגל סידור אירועים לפי סדר זמן, ולבקש מהילד להסביר איזה אירוע קרה קודם ומה הראיה לכך.",
  "MG-05":
    "לתרגל השוואת אזורים במפה בעזרת מקרא, צבעים וסימנים, ולבקש מהילד להראות באיזה נתון במפה השתמש.",
  "MG-06":
    "לתרגל שאלות של סיבה ותוצאה, ולבקש מהילד להפריד בין עובדה שמופיעה בטקסט לבין דעה.",
  "MG-07":
    "לתרגל התאמה בין מוסדות בקהילה לתפקיד שלהם, ולבקש מהילד להסביר מי נעזר במוסד ומה השירות שהוא נותן.",
  "MG-08":
    "לתרגל קריאת מקרא וסימנים במפה, ולבקש מהילד לזהות את הנתון המתאים לפני שעונה.",
});

/** Parent-facing subskill labels — taxonomy ids unchanged; editorial copy only. */
const PARENT_SUBSKILL_LABEL_HE = Object.freeze({
  "M-02": "נשיאה בחיבור",
  "H-04": "איתור מידע בטקסט",
  "S-03": "הבנת הקשר בין חלקי הגוף",
  "MG-01": "קריאת קנה מידה במפה",
  "MG-02": "כיוונים וצפון במפה",
  "MG-03": "זכות, חובה וכלל",
  "MG-04": "סדר אירועים בציר זמן",
  "MG-05": "קריאת מפת אקלים",
  "MG-06": "סיבה ותוצאה",
  "MG-07": "מוסדות בקהילה",
  "MG-08": "מקרא וסימנים במפה",
});

const TOPIC_ONLY_HOME = Object.freeze({
  strengthening:
    "לתרגל מספר קטן של שאלות באותו נושא, ולבקש מהילד להסביר בקול איך הגיע לתשובה. אם אותו סוג טעות חוזר, הדוח יוכל לדייק יותר בהמשך.",
  clear_gap:
    "לחזור לשאלות פשוטות יותר באותו נושא, לפתור יחד 3–5 דוגמאות, ואז לתת לילד להסביר את דרך הפתרון במילים שלו.",
  partial:
    "להמשיך באותה רמה עוד קצת, עם בדיקה קצרה אחרי כל תשובה.",
  mastery:
    "לשמר את הנושא בתרגול קצר מדי פעם, ולבדוק שהדיוק נשמר גם בשאלות חדשות.",
  early:
    "לתת עוד תרגול קצר באותו נושא לפני שמסיקים מסקנה ברורה.",
  insufficient:
    "לבצע עוד כמה שאלות באותו נושא, ואז לבדוק שוב את הדוח.",
});

function clean(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectLabel(subject, subjectId) {
  const s = clean(subject);
  if (s) return s;
  return subjectLabelHe(String(subjectId || "")) || "";
}

/**
 * @param {string|null|undefined} taxonomyId
 * @param {boolean} safe
 * @param {string} [topicLabel]
 */
function parentSubskillLabelHe(taxonomyId, safe, topicLabel = "") {
  if (!safe || !taxonomyId) return null;
  const id = String(taxonomyId).trim();
  const mapped = PARENT_SUBSKILL_LABEL_HE[id];
  if (mapped) return mapped;

  const row = TAXONOMY_BY_ID[id];
  const name = clean(row?.subskillHe);
  if (!name || /^[a-zA-Z][a-zA-Z0-9_/\-\s]*$/.test(name)) return null;

  if (id === "H-04" && name === "חיפוש") {
    const topic = clean(topicLabel);
    if (/הבנ(?:ת|ה)\s+(?:ה)?נקרא/i.test(topic)) return "הבנת מה שנקרא";
    return "איתור מידע בטקסט";
  }

  return name;
}

/**
 * @param {object} p
 */
function resolveHomeActionHe(p) {
  const { taxonomyId, safeSubskill, subjectId, gradeKey, bucketKey, engineDecision } = p;
  if (safeSubskill && taxonomyId) {
    const direct = HOME_ACTION_BY_TAXONOMY_ID[taxonomyId];
    if (direct) return direct;
    const fromTemplate = resolveGradeAwareParentRecommendationHe({
      subjectId,
      gradeKey,
      taxonomyId,
      bucketKey,
      slot: "action",
    });
    if (fromTemplate) return fromTemplate;
  }
  if (engineDecision === "clear_topic_gap") return TOPIC_ONLY_HOME.clear_gap;
  if (engineDecision === "topic_needs_strengthening") return TOPIC_ONLY_HOME.strengthening;
  if (engineDecision === "partial_stable") return TOPIC_ONLY_HOME.partial;
  if (engineDecision === "mastery_stable") return TOPIC_ONLY_HOME.mastery;
  if (engineDecision === "early_direction_only") return TOPIC_ONLY_HOME.early;
  return TOPIC_ONLY_HOME.insufficient;
}

/**
 * @param {Record<string, unknown>|null|undefined} sig
 */
function competitiveModeContextHe(sig) {
  if (!sig || typeof sig !== "object") return "";
  const ed = sig.engineDiagnosticDecision && typeof sig.engineDiagnosticDecision === "object"
    ? sig.engineDiagnosticDecision
    : null;
  const decision = clean(ed?.engineDecision);
  const diagType = clean(sig.diagnosticType);
  const speedRisk = sig.riskFlags?.speedOnlyRisk === true;

  if (decision === "speed_pressure_pattern" || diagType === "speed_pressure" || speedRisk) {
    return (
      "נראה שחלק מהטעויות קשורות לקצב פתרון מהיר מדי. כדאי לתרגל עצירה קצרה לפני שליחה: לקרוא שוב את השאלה, לבדוק את התשובה, ורק אז להמשיך."
    );
  }
  return "";
}

/**
 * Diagnostic body only — no home-action lines (those go to actionHe).
 * @param {object} p
 */
function buildDiagnosticBodyByDecision(p) {
  const subj = subjectLabel(p.subjectLabelHe, p.subjectId);
  const topic = clean(p.topic);
  const q = Math.round(Number(p.q) || 0);
  const acc = Math.round(Number(p.acc) || 0);
  const decision = clean(p.engineDecision);
  const subskill = p.subskillHe;

  if (decision === "mastery_stable") {
    let body =
      `ב${subj} בנושא ${topic} נראית שליטה טובה. הילד פתר ${q} שאלות בדיוק של ${acc}%.`;
    if (subskill) body += ` במיוחד נראית יציבות ב${subskill}.`;
    return body;
  }

  if (decision === "partial_stable") {
    let body =
      `ב${subj} בנושא ${topic} נראית הבנה חלקית וטובה, אבל עדיין לא שליטה מלאה. ` +
      `הילד פתר ${q} שאלות בדיוק של ${acc}%.`;
    if (subskill) body += ` נראה שכדאי לחזק במיוחד את ${subskill}.`;
    return body;
  }

  if (decision === "topic_needs_strengthening") {
    let body =
      `ב${subj} בנושא ${topic} יש נקודת חיזוק שכדאי לעבוד עליה. ` +
      `הילד פתר ${q} שאלות בדיוק של ${acc}%. ` +
      "הנתונים מראים שהנושא עדיין לא יציב, ולכן כדאי לתרגל אותו בצורה ממוקדת.";
    if (subskill) body += ` החיזוק המרכזי הוא ב${subskill}.`;
    return body;
  }

  if (decision === "clear_topic_gap") {
    let body =
      `ב${subj} בנושא ${topic} נראה שיש כאן נושא שכדאי לחזק. ` +
      `הילד פתר ${q} שאלות בדיוק של ${acc}%, ולכן כדאי לעצור ולחזק את הבסיס לפני שמתקדמים.`;
    if (subskill) body += ` הנקודה המרכזית לחיזוק היא ${subskill}.`;
    return body;
  }

  if (decision === "early_direction_only") {
    if (q <= 5) return `עדיין מעט נתונים בנושא ${topic} - עוד קצת תרגול יעזור לנו להבין טוב יותר.`;
    return `זו תמונה ראשונית בלבד בנושא ${topic}, אבל כדאי עוד קצת תרגול לפני מסקנה ברורה.`;
  }

  if (decision === "insufficient_data" || q < 5) {
    if (q <= 5) return `עדיין מעט נתונים בנושא ${topic} - עוד קצת תרגול יעזור לנו להבין טוב יותר.`;
    if (q <= 15) return `זו תמונה ראשונית בלבד בנושא ${topic}, אבל כדאי עוד קצת תרגול לפני מסקנה ברורה.`;
    return `נראה שיש בנושא ${topic} נושא שכדאי לחזק בתרגול הקרוב.`;
  }

  if (decision === "speed_pressure_pattern") {
    // Product-owner-approved wording — single source shared with
    // build-parent-report-engine-decision-contract.js (buildParentSafeFindingFromEngine).
    return buildSpeedPressurePatternFindingHe({ topicName: topic, wrong: p.wrong, questions: q, accuracy: acc });
  }

  return (
    `ב${subj} בנושא ${topic} יש נקודת חיזוק שכדאי לעקוב אחריה. ` +
    `הילד פתר ${q} שאלות בדיוק של ${acc}%.`
  );
}

/**
 * Single home action text (no prefix).
 * @param {object} p
 */
function buildHomeActionTextHe(p) {
  const decision = clean(p.engineDecision);
  const subskill = p.subskillHe;
  const home = p.homeAction;

  if (decision === "mastery_stable") {
    if (subskill) return "לתת כמה שאלות דומות ברמה מעט גבוהה יותר, בלי למהר.";
    return TOPIC_ONLY_HOME.mastery;
  }
  if (decision === "partial_stable") {
    return subskill ? home : TOPIC_ONLY_HOME.partial;
  }
  if (decision === "topic_needs_strengthening") {
    return subskill ? home : TOPIC_ONLY_HOME.strengthening;
  }
  if (decision === "clear_topic_gap") {
    return subskill ? home : TOPIC_ONLY_HOME.clear_gap;
  }
  if (decision === "early_direction_only") return TOPIC_ONLY_HOME.early;
  if (decision === "insufficient_data") return TOPIC_ONLY_HOME.insufficient;
  if (decision === "speed_pressure_pattern") return "";
  return subskill ? home : TOPIC_ONLY_HOME.strengthening;
}

/**
 * Build parent topic copy from engineDiagnosticDecision (screen + PDF + insights).
 * @param {object} p
 * @param {string} [p.subjectId]
 * @param {string} [p.subjectLabelHe]
 * @param {string} [p.topic]
 * @param {string} [p.topicKey]
 * @param {number} [p.q]
 * @param {number} [p.acc]
 * @param {number} [p.wrong]
 * @param {string|null} [p.gradeKey]
 * @param {Record<string, unknown>|null} [p.topicEngineRowSignals]
 */
export function buildEngineDecisionParentTopicCopyHe(p) {
  const sig = p.topicEngineRowSignals && typeof p.topicEngineRowSignals === "object" ? p.topicEngineRowSignals : null;
  const ed = sig?.engineDiagnosticDecision && typeof sig.engineDiagnosticDecision === "object"
    ? sig.engineDiagnosticDecision
    : null;

  const subjectId = String(p.subjectId || "").trim();
  const topic = clean(p.topic);
  const q = Math.round(Number(p.q) || 0);
  const acc = Math.round(Number(p.acc) || 0);

  if (!topic || q <= 0) return null;

  let engineDecision = clean(ed?.engineDecision);
  if (!engineDecision && q < 5) engineDecision = "insufficient_data";
  if (!engineDecision && acc >= 90 && q >= 10) engineDecision = "mastery_stable";
  if (!engineDecision) engineDecision = acc < 55 ? "clear_topic_gap" : acc < 72 ? "topic_needs_strengthening" : "partial_stable";

  if (engineDecision === "insufficient_data" && q >= 5) {
    engineDecision = acc < 55 ? "clear_topic_gap" : acc < 72 ? "topic_needs_strengthening" : "partial_stable";
  }

  const safeSubskill = ed?.safeSubskillToShow === true;
  const taxonomyId =
    safeSubskill && ed?.subskillCandidate?.taxonomyId
      ? String(ed.subskillCandidate.taxonomyId).trim()
      : safeSubskill && sig?.subskillCandidate?.taxonomyId
        ? String(sig.subskillCandidate.taxonomyId).trim()
        : safeSubskill && ed?.taxonomyMatchId
          ? String(ed.taxonomyMatchId).trim()
          : null;

  const subskillHe =
    engineDecision === "early_direction_only" || engineDecision === "insufficient_data"
      ? null
      : parentSubskillLabelHe(taxonomyId, safeSubskill, topic);

  const { bucketKey } = splitTopicRowKey(String(p.topicKey || ""));
  const homeAction = resolveHomeActionHe({
    taxonomyId,
    safeSubskill,
    subjectId,
    gradeKey: p.gradeKey,
    bucketKey,
    engineDecision,
  });

  const copyCtx = {
    subjectId,
    subjectLabelHe: p.subjectLabelHe,
    topic,
    q,
    acc,
    wrong: p.wrong,
    engineDecision,
    subskillHe,
    homeAction,
  };

  const diagnosticBody = buildDiagnosticBodyByDecision(copyCtx);
  const homeActionText = buildHomeActionTextHe(copyCtx);
  const actionHe = homeActionText ? `מה כדאי לעשות ביחד: ${homeActionText}` : "";

  // speed_pressure_pattern's diagnosticBody already IS the single canonical
  // sentence (incl. the untimed-practice check) — do not append a second,
  // duplicate speed remark for the same decision on the same surface.
  const modeContextHe = engineDecision === "speed_pressure_pattern" ? "" : competitiveModeContextHe(sig);
  const dataHe = `הילד פתר ${q} שאלות בדיוק של ${acc}%.`;

  let summaryHe = diagnosticBody;
  if (actionHe) summaryHe += ` ${actionHe}`;
  if (modeContextHe) summaryHe += ` ${modeContextHe}`;

  return {
    summaryHe,
    dataHe,
    whyHe: diagnosticBody,
    actionHe,
    patternHe: "",
    modeContextHe,
    engineDecision,
    safeSubskill: safeSubskill === true,
    subskillHe,
  };
}

/**
 * @param {ReturnType<typeof buildEngineDecisionParentTopicCopyHe>} engineCopy
 * @param {string} label
 */
export function buildExplainIdentifiedLineHe(engineCopy, label) {
  const t = clean(label);
  if (!engineCopy || !t) return "";
  switch (engineCopy.engineDecision) {
    case "mastery_stable":
      return `מה רואים: שליטה טובה בנושא ${t}.`;
    case "partial_stable":
      return `מה רואים: שליטה חלקית בנושא ${t}.`;
    case "clear_topic_gap":
      return "מה כדאי לחזק: נראה שיש כאן נושא שכדאי לתרגל עוד.";
    case "topic_needs_strengthening":
      return `מה רואים: נקודת חיזוק בנושא ${t}.`;
    case "early_direction_only":
      return `מה רואים: זו תמונה ראשונית בלבד בנושא ${t}.`;
    case "insufficient_data":
      return `מה רואים: נושא לסקירה בנושא ${t}.`;
    case "deferred_topic_only":
      return `מה רואים: תמונה כללית בנושא ${t}.`;
    case "speed_pressure_pattern":
      // No second sentence for this decision on the same surface: the canonical
      // buildSpeedPressurePatternFindingHe text already appears once (via
      // engineCopy.whyHe/meaning). Also — there is no evidence that the mistakes are
      // CAUSED BY speed ("קשורות למהירות"); the only proven fact is that they occurred
      // during fast/timed practice, which the canonical sentence already states without
      // overclaiming causation. Return empty so this line never renders.
      return "";
    default:
      return `מה רואים: מיקוד בנושא ${t}.`;
  }
}

/** Strip technical engine ids if they leak into parent text. */
export const PARENT_TECHNICAL_ID_STRIP_RE =
  /\b(clear_topic_gap|partial_stable|mastery_stable|topic_needs_strengthening|early_direction_only|insufficient_data|speed_pressure_pattern|engineDecision|safeSubskill|taxonomy|metadata|candidate|fallback)\b/g;

/**
 * One-line insight for parentFacing.insights array.
 * @param {Record<string, unknown>} row
 */
export function buildEngineDecisionInsightLineHe(row) {
  const copy = buildEngineDecisionParentTopicCopyHe({
    subjectId: row.subjectId,
    subjectLabelHe: row.subjectLabelHe,
    topic: row.label,
    topicKey: row.topicKey,
    q: row.questions,
    acc: row.accuracy,
    wrong: row.wrong,
    gradeKey: row.gradeKey,
    topicEngineRowSignals: row.topicEngineRowSignals,
  });
  return copy?.summaryHe || "";
}

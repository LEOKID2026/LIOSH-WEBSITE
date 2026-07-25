const COPY = Object.freeze({
  insufficient_information:
    "עדיין אין מספיק פעילות כדי לקבוע אם נדרש חיזוק. מומלץ להשלים מספר תרגולים נוספים.",
  verification_needed:
    "נראה דפוס שכדאי לבדוק בעזרת מספר שאלות ממוקדות לפני שינוי התרגול.",
  strengthening_needed:
    "במספר פעילויות עצמאיות חזר קושי בנושא {{topic}}. מומלץ תרגול ממוקד וקצר.",
  progress_or_mastery:
    "נראית התקדמות עקבית בנושא {{topic}}. מומלץ להמשיך במסלול הרגיל.",
});

const LABELS = Object.freeze({
  insufficient_information: "צריך עוד מידע",
  verification_needed: "בדיקת אימות",
  strengthening_needed: "חיזוק זמני",
  progress_or_mastery: "להמשיך במסלול",
});

const STRENGTHENING_ACTIONS = new Set([
  "practice_more",
  "targeted_practice",
  "strengthen_prerequisite",
  "remove_timer",
  "reduce_reading_load",
  "guided_to_independent_transition",
]);

export function parentActionDisplayStateV1(action) {
  if (action === "collect_more_evidence") return "insufficient_information";
  if (action === "give_probe_questions") return "verification_needed";
  if (STRENGTHENING_ACTIONS.has(action)) return "strengthening_needed";
  return "progress_or_mastery";
}

function fillTopic(template, topic) {
  return String(template || "").replace("{{topic}}", topic || "הנושא");
}

/**
 * ADC-only: what the system will do next — never replaces DE2 finding text.
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {{ topicLabel?: string }} [opts]
 */
export function buildParentSystemActionLineHe(contract, { topicLabel = "" } = {}) {
  if (!contract || contract.version !== "2.0.0") return "";
  const action = String(contract.action || "").trim();
  const topic =
    String(topicLabel || contract.target?.topic || "").trim() || "הנושא";
  const subskill =
    contract.target?.subskill && contract.target?.subskillId
      ? String(contract.target.subskill)
      : null;

  switch (action) {
    case "collect_more_evidence":
      return `המערכת תציג עוד שאלות ב${topic} כדי לבדוק אם הדפוס חוזר.`;
    case "give_probe_questions":
      return subskill
        ? `המערכת תציג שאלות בדיקה ב${topic} שמבדילות בין ${subskill} לבין אפשרויות אחרות.`
        : `המערכת תציג שאלות בדיקה ב${topic} שמבדילות בין האפשרויות הרלוונטיות.`;
    case "practice_more":
      return `המערכת תציג תרגול נוסף ב${topic} באותה רמה.`;
    case "targeted_practice":
      return subskill
        ? `המערכת תציג תרגול ממוקד ב${topic}, עם דגש על ${subskill}.`
        : `המערכת תציג תרגול ממוקד ב${topic}.`;
    case "strengthen_prerequisite":
      return contract.target?.prerequisiteDetail?.precision === "exact_skill"
        ? `המערכת תחזור לתרגל מיומנות בסיס קטנה לפני ${topic}.`
        : `המערכת תחזור לתרגל בסיס ב${topic} לפני שממשיכים הלאה.`;
    case "remove_timer":
      return `המערכת תוריד לזמן קצר את לחץ הזמן ב${topic}, בלי לשנות את הנושא.`;
    case "reduce_reading_load":
      return `המערכת תציג את השאלות ב${topic} בניסוח קצר יותר, בלי לשנות את המטרה.`;
    case "guided_to_independent_transition":
      return `המערכת תעבור בהדרגה מליווי לעבודה עצמאית ב${topic}.`;
    case "maintain":
      return `המערכת תמשיך במסלול הרגיל ב${topic}.`;
    case "monitor_before_escalation":
      return `המערכת תמשיך לעקוב ב${topic} לפני שינוי נוסף.`;
    case "advance_cautiously":
      return `המערכת תעלה בזהירות רמת אחת ב${topic}.`;
    default:
      return "";
  }
}

export function buildParentSafeActionDecisionV1(contract, {
  topicLabel = "",
} = {}) {
  if (!contract || contract.version !== "2.0.0") return null;
  const state = parentActionDisplayStateV1(contract.action);
  const topic =
    String(
      topicLabel ||
        contract.target?.topic ||
        "",
    ).trim() || "הנושא";
  const subskill =
    contract.target?.subskill && contract.target?.subskillId
      ? String(contract.target.subskill)
      : null;
  const prerequisiteDetail = contract.target?.prerequisiteDetail;
  const hasExactPrerequisite =
    prerequisiteDetail?.precision === "exact_skill" &&
    Boolean(contract.target?.prerequisite);
  const actionLine = buildParentSystemActionLineHe(contract, { topicLabel: topic });
  const actionText =
    actionLine || fillTopic(COPY[state], subskill || topic);
  const temporary = "הפעולה זמנית ואינה תיוג קבוע של הילד.";
  const reevaluation = contract.reevaluation?.afterActivities
    ? `ההחלטה תיבדק מחדש לאחר ${contract.reevaluation.afterActivities} פעילות או כאשר תתקבל ראיה עצמאית חדשה.`
    : "ההחלטה תיבדק מחדש כאשר תתקבל ראיה עצמאית חדשה.";
  return {
    contractVersion: "parent-action-decision-v1",
    state,
    label: LABELS[state],
    observed: "",
    recurrence: "action_only",
    recommendation: actionText,
    systemActionLineHe: actionLine || actionText,
    temporary,
    reevaluation,
    target: {
      subject: String(contract.target?.subject || ""),
      topic,
      subskill,
      hasExactPrerequisite,
      foundationReviewOnly:
        prerequisiteDetail?.precision === "grade_foundation_area",
    },
  };
}

export function buildExpiredParentActionDecisionV1() {
  return {
    contractVersion: "parent-action-decision-v1",
    state: "insufficient_information",
    label: LABELS.insufficient_information,
    observed: "",
    recurrence: "expired_evidence_window",
    recommendation:
      "ההחלטה מהתקופה שנבחרה אינה פעילה עוד, ולכן היא אינה משנה את מסלול הלמידה הנוכחי.",
    systemActionLineHe:
      "ההחלטה מהתקופה שנבחרה אינה פעילה עוד, ולכן היא אינה משנה את מסלול הלמידה הנוכחי.",
    temporary: "לא נשמרה התאמה פעילה על סמך ראיה ישנה.",
    reevaluation: "החלטה חדשה תתקבל רק לאחר פעילות עדכנית.",
    target: {
      subject: "",
      topic: "",
      subskill: null,
      hasExactPrerequisite: false,
      foundationReviewOnly: false,
    },
  };
}

export const PARENT_ACTION_DECISION_COPY_HE_V1 = COPY;

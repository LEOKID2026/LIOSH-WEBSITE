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

export function buildParentSafeActionDecisionV1(contract, {
  topicLabel = "",
} = {}) {
  if (!contract || contract.version !== "2.0.0") return null;
  const state = parentActionDisplayStateV1(contract.action);
  const wrongEvents =
    Number(
      contract.evidenceSnapshot?.wrongEvents ??
        contract.evidenceSnapshot?.wrong,
    ) || 0;
  const independentSessions =
    Number(contract.evidenceSnapshot?.independentSessions) ||
    (contract.evidenceSnapshot?.sessions === "cross_session" ? 2 : 0);
  const repeated = wrongEvents >= 3 && independentSessions >= 2;
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
  const observed = repeated
    ? `נצפה דפוס שחזר ביותר מפעילות עצמאית אחת בנושא ${topic}.`
    : `המידע בנושא ${topic} עדיין ראשוני ואינו מצביע לבדו על דפוס קבוע.`;
  const actionText = fillTopic(COPY[state], subskill || topic);
  const temporary = "הפעולה זמנית ואינה תיוג קבוע של הילד.";
  const reevaluation = contract.reevaluation?.afterActivities
    ? `ההחלטה תיבדק מחדש לאחר ${contract.reevaluation.afterActivities} פעילויות או כאשר תתקבל ראיה עצמאית חדשה.`
    : "ההחלטה תיבדק מחדש כאשר תתקבל ראיה עצמאית חדשה.";
  return {
    contractVersion: "parent-action-decision-v1",
    state,
    label: LABELS[state],
    observed,
    recurrence: repeated ? "repeated_pattern" : "single_or_limited_evidence",
    recommendation: actionText,
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
    observed:
      "ההחלטה מהתקופה שנבחרה אינה פעילה עוד, ולכן היא אינה משנה את מסלול הלמידה הנוכחי.",
    recurrence: "expired_evidence_window",
    recommendation: COPY.insufficient_information,
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

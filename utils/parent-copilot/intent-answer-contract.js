/**
 * Maps resolved scope + Stage A intent + utterance → intent-specific answer contract.
 */

import { foldUtteranceForHeMatch, normalizeFreeformParentUtteranceHe } from "./utterance-normalize-he.js";
import { isMistakePatternQuestion } from "./topic-evidence-answer.js";
import { isContextualFollowUpUtterance } from "./contextual-follow-up-he.js";
import { classifySubjectEvidenceTier, SUBJECT_EVIDENCE_TIER } from "../parent-report-language/subject-evidence-policy.js";

export const ANSWER_CONTRACT = Object.freeze({
  report_explanation: "report_explanation",
  important_focus: "important_focus",
  topic_problem: "topic_problem",
  topic_lookup: "topic_lookup",
  mistake_pattern: "mistake_pattern",
  home_practice: "home_practice",
  strength: "strength",
  progression: "progression",
  zero_evidence: "zero_evidence",
});

const REPORT_EXPLAIN_RE =
  /תסביר\s*(?:לי\s*)?(?:על\s*)?(?:ה)?דוח|מה\s*הדוח\s*אומר|תן\s*לי\s*סיכום|מה\s*רואים\s*פה|מה\s*מראה\s*הדוח|סיכום\s*הדוח|תמונה\s*כללית/u;

const IMPORTANT_FOCUS_RE =
  /מה\s*חשוב\s*כאן|מה\s*חשוב\s*עכשיו|מה\s*הכי\s*חשוב|תסביר\s*לי\s*מה\s*חשוב|מה\s*לשים\s*דגש|על\s*מה\s*לשים\s*דגש/u;

const TOPIC_LOOKUP_RE = /^מה\s*לגבי\s+/u;

const TOPIC_PROBLEM_RE =
  /מה\s*הבעיה|מה\s*הקושי|איפה\s*הבעיה|איפה\s*הקושי|למה\s*(?:הוא|היא|הילד)?\s*(?:חלש|קשה)|מה\s*לא\s*עובד|מה\s*חלש|למה\s*קשה/u;

const HOME_PRACTICE_RE =
  /מה\s*לעשות|איך\s*לתרגל|כמה\s*זמן|בבית|הצעד\s*הבא|מה\s*עושים\s*עכשיו|תרגול\s*בבית|איך\s*מתרגלים/u;

const STRENGTH_RE =
  /מה\s*הולך\s*טוב|במה\s*(?:הוא|היא|הילד)?\s*חזק|מה\s*חזק|איפה\s*חזק|מה\s*מצליח|תחומי\s*חוזק|(?:ה)?מקצוע\s*(?:הכי\s*)?(?:ה)?חזק|הכי\s*חזק|(?:ה)?חזק\s*ביותר/u;

// Progression family: advance / level up / level down / mastered / above-grade / below-grade / focus elsewhere.
const PROGRESSION_RE =
  /להתקדם|לעלות\s*(?:ב)?רמה|להעלות\s*(?:את\s*)?(?:ה)?רמה|לרדת\s*(?:ב)?רמה|להוריד\s*(?:את\s*)?(?:ה)?רמה|כבר\s*שולט|שולט\s*בנושא|כבר\s*יודע|מעל\s*(?:ה)?כיתה|מעל\s*הרמה|מתחת\s*(?:ל)?כיתה|מתקשה\s*(?:גם\s*)?מתחת|להתמקד\s*בנושא\s*אחר|לעבור\s*לנושא\s*אחר|מבזבז/u;

/**
 * @param {unknown} payload
 * @param {string} subjectId
 */
export function subjectQuestionCountFromPayload(payload, subjectId) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const sp = profiles.find((p) => String(p?.subject || "") === subjectId);
  if (!sp) return 0;
  const explicit = Math.max(0, Number(sp?.subjectQuestionCount ?? sp?.questionCount) || 0);
  if (explicit > 0) return explicit;
  const topics = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
  let sum = 0;
  for (const tr of topics) sum += Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
  if (sum > 0) return sum;
  for (const row of Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : []) {
    sum += Math.max(0, Number(row?.questions) || 0);
  }
  if (sum > 0) return sum;
  if (subjectId === "history") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    return Math.max(0, Number(summary.historyQuestions) || 0);
  }
  return sum;
}

/**
 * @param {object} params
 */
export function resolveAnswerContract(params) {
  const utteranceStr = String(params?.utteranceStr || "");
  const folded = foldUtteranceForHeMatch(normalizeFreeformParentUtteranceHe(utteranceStr));
  const scopeType = String(params?.scopeType || "");
  const stageAIntent = String(params?.stageAIntent || "");
  const payload = params?.payload;
  const subjectId =
    String(params?.subjectId || "").trim() ||
    String(params?.truthPacket?.surfaceFacts?.subjectId || "").trim();

  if (scopeType === "subject" && subjectId) {
    const tier = classifySubjectEvidenceTier(subjectQuestionCountFromPayload(payload, subjectId));
    if (tier === SUBJECT_EVIDENCE_TIER.none) return ANSWER_CONTRACT.zero_evidence;
  }

  if (isMistakePatternQuestion(utteranceStr)) return ANSWER_CONTRACT.mistake_pattern;

  if (IMPORTANT_FOCUS_RE.test(folded)) return ANSWER_CONTRACT.important_focus;

  if (TOPIC_LOOKUP_RE.test(folded) || /^מה\s*עם\s+/u.test(folded)) return ANSWER_CONTRACT.topic_lookup;

  if (
    HOME_PRACTICE_RE.test(folded) ||
    stageAIntent === "what_to_do_today" ||
    stageAIntent === "what_to_do_this_week" ||
    stageAIntent === "how_to_tell_child" ||
    (isContextualFollowUpUtterance(utteranceStr) && /מה\s*לעשות|איך\s*לתרגל|כמה\s*זמן/u.test(folded))
  ) {
    return ANSWER_CONTRACT.home_practice;
  }

  if (PROGRESSION_RE.test(folded)) {
    return ANSWER_CONTRACT.progression;
  }

  if (stageAIntent === "what_is_going_well" || STRENGTH_RE.test(folded)) {
    return ANSWER_CONTRACT.strength;
  }

  if (stageAIntent === "what_is_most_important" && scopeType === "executive") {
    return ANSWER_CONTRACT.important_focus;
  }

  if (
    scopeType === "executive" &&
    (stageAIntent === "explain_report" ||
      stageAIntent === "ask_topic_specific" ||
      stageAIntent === "ask_subject_specific" ||
      REPORT_EXPLAIN_RE.test(folded))
  ) {
    return ANSWER_CONTRACT.report_explanation;
  }

  if (scopeType === "topic") {
    if (
      TOPIC_PROBLEM_RE.test(folded) ||
      stageAIntent === "what_is_still_difficult" ||
      stageAIntent === "why_not_advance" ||
      stageAIntent === "what_not_to_do_now"
    ) {
      return ANSWER_CONTRACT.topic_problem;
    }
    if (stageAIntent === "what_is_most_important" || stageAIntent === "is_intervention_needed") {
      return ANSWER_CONTRACT.topic_problem;
    }
  }

  if (scopeType === "subject" && (TOPIC_PROBLEM_RE.test(folded) || stageAIntent === "what_is_still_difficult")) {
    return ANSWER_CONTRACT.topic_problem;
  }

  return null;
}

export default { ANSWER_CONTRACT, resolveAnswerContract, subjectQuestionCountFromPayload };

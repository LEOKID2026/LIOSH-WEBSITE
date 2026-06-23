/**
 * Stage A — free-form parent question interpretation (deterministic).
 * Output is the product interpretation object; not display copy and not final scope entity.
 */

import { normalizeFreeformParentUtteranceHe, foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import { SUBJECT_ORDER, subjectLabelHe } from "./contract-reader.js";

/**
 * @typedef {(
 *   "explain_report" |
 *   "what_is_most_important" |
 *   "what_to_do_today" |
 *   "what_to_do_this_week" |
 *   "why_not_advance" |
 *   "what_is_going_well" |
 *   "what_is_still_difficult" |
 *   "what_not_to_do_now" |
 *   "how_to_tell_child" |
 *   "question_for_teacher" |
 *   "is_intervention_needed" |
 *   "strength_vs_weakness_summary" |
 *   "clarify_term" |
 *   "clinical_boundary" |
 *   "sensitive_education_choice" |
 *   "report_trust_question" |
 *   "parent_policy_refusal" |
 *   "off_report_subject_clarification" |
 *   "off_topic_redirect" |
 *   "simple_parent_explanation" |
 *   "ask_topic_specific" |
 *   "ask_subject_specific" |
 *   "unclear"
 * )} CanonicalParentIntent
 */

/**
 * @typedef {(
 *   "executive" |
 *   "subject" |
 *   "topic" |
 *   "recommendation" |
 *   "confidence_uncertainty" |
 *   "strengths" |
 *   "weaknesses" |
 *   "blocked_advance"
 * )} ScopeClass
 */

/** @type {CanonicalParentIntent[]} */
export const CANONICAL_PARENT_INTENTS = [
  "explain_report",
  "what_is_most_important",
  "what_to_do_today",
  "what_to_do_this_week",
  "why_not_advance",
  "what_is_going_well",
  "what_is_still_difficult",
  "what_not_to_do_now",
  "how_to_tell_child",
  "question_for_teacher",
  "is_intervention_needed",
  "strength_vs_weakness_summary",
  "clarify_term",
  "clinical_boundary",
  "sensitive_education_choice",
  "report_trust_question",
  "parent_policy_refusal",
  "off_report_subject_clarification",
  "off_topic_redirect",
  "simple_parent_explanation",
  "ask_topic_specific",
  "ask_subject_specific",
  "unclear",
];

/**
 * @param {unknown} payload
 */
function listAnchoredTopicRows(payload) {
  /** @type {Array<{ subjectId: string; topicRowKey: string; displayName: string }>} */
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [String(sp?.subject || ""), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const displayNameHe = String(tr?.displayName || "").trim();
      const displayNameFolded = foldUtteranceForHeMatch(displayNameHe);
      const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
      const nar = tr?.contractsV1?.narrative;
      const anchored = !!(nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim());
      if (!topicRowKey || displayNameFolded.length < 2 || !anchored) continue;
      out.push({ subjectId: sid, topicRowKey, displayName: displayNameFolded, displayNameHe });
    }
  }
  return out;
}

/**
 * @param {string} utteranceFolded
 * @param {unknown} payload
 */
function extractTopicHint(utteranceFolded, payload) {
  const rows = listAnchoredTopicRows(payload);
  let best = null;
  for (const row of rows) {
    if (
      utteranceFolded.includes(row.displayName) &&
      (!best || row.displayName.length > best.displayName.length)
    ) {
      best = {
        subjectId: row.subjectId,
        topicRowKey: row.topicRowKey,
        displayName: row.displayNameHe || row.displayName,
      };
    }
  }
  return best;
}

/**
 * @param {string} utteranceFolded
 * @param {unknown} payload
 */
function extractSubjectHint(utteranceFolded, payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const present = new Set(profiles.map((p) => String(p?.subject || "")).filter(Boolean));
  const pairs = [];
  for (const sid of SUBJECT_ORDER) {
    if (!present.has(sid)) continue;
    const lf = foldUtteranceForHeMatch(subjectLabelHe(sid));
    if (lf.length < 2) continue;
    pairs.push({ id: sid, fold: lf });
  }
  pairs.sort((a, b) => b.fold.length - a.fold.length);
  for (const { id, fold } of pairs) {
    if (fold.length >= 4 && utteranceFolded.includes(fold)) return { subjectId: id, labelFolded: fold };
    if (
      fold.length >= 2 &&
      (utteranceFolded === fold ||
        utteranceFolded.startsWith(`${fold} `) ||
        utteranceFolded.endsWith(` ${fold}`) ||
        utteranceFolded.includes(` ${fold} `))
    ) {
      return { subjectId: id, labelFolded: fold };
    }
  }
  return null;
}

/**
 * @param {string} t
 */
function inferTimeframeHint(t) {
  if (/היום|עכשיו|היום\s*בבית|היום\s*בערב/.test(t)) return "today";
  if (/השבוע|שבוע\s*הקרוב|בשבוע|השבוע\s*הזה/.test(t)) return "week";
  if (/תקופ|בדוח|בטווח|החודש|התקופה/.test(t)) return "period";
  return "none";
}

/**
 * @param {string} t
 */
function inferToneHint(t) {
  if (/דאג|חושש|לחוץ|מודאג|פחד|לא\s+יוצא|לא\s*הולך/.test(t)) return "worried";
  if (/מצוין|מעולה|שמח|מתרשם|גאה|מעודד/.test(t)) return "encouraging";
  return "neutral";
}

/** @type {Record<CanonicalParentIntent, RegExp[]>} */
const INTENT_PARAPHRASES = {
  explain_report: [
    /תעשה\s*לי\s*סדר|תעשו\s*לי\s*סדר|תסדר\s*לי\s*את\s*זה|לעשות\s*סדר/u,
    /אני\s*לא\s*מבין\s*מה\s*רואים|אני\s*לא\s*מבין\s*כלום|לא\s*מבין\s*מה\s*רואים|לא\s*מבין\s*כלום/u,
    /אז\s*מה\s*בעצם\s*הדוח\s*אומר|מה\s*בעצם\s*הדוח\s*אומר|מה\s*הדוח\s*אומר\s*בעצם/u,
    /איך\s*אתה\s*קורא\s*את\s*הדוח|איך\s*לקרוא\s*את\s*הדוח|מה\s*המשמעות\s*של\s*זה|מה\s*המשמעות/u,
    /תסביר\s*פשוט|תסבירו\s*פשוט|במילים\s*פשוטות|פשוט\s*בלי\s*מילים\s*מסובכות/u,
    /תמונת\s*מצב|איך\s*נראית\s*תמונת|איך\s*נראית\s*התמונה|מבט\s*על\s*הדוח|מבט\s*כללי/u,
    /מה\s*רואים|מה\s*נמדד|מה\s*כתוב\s*בדוח|מה\s*הנתונים|מה\s*מופיע|תמונת\s*מצב|סיכום\s*הדוח|מה\s*המצב\s*בדוח|מה\s*המצב\s*בנושא|איך\s*המצב|מה\s*קורה\s*בדוח|מה\s*קורה\s*בנושא/u,
    /הסבר\s*על\s*הדוח|תסביר\s*לי\s*על\s*הדוח|תסביר\s*את\s*הדוח|מה\s*הדוח\s*אומר|מה\s*אומר\s*הדוח|מה\s*מספרים\s*אומרים|מה\s*המספרים|נתוני\s*התקופה/u,
    /בוא\s*נסביר\s*את\s*הדוח|תן\s*לי\s*סיכום|תני\s*לי\s*סיכום|מה\s*עשינו\s*בתקופה/u,
    /מה\s*למדנו\s*מהדוח|מה\s*אפשר\s*ללמוד\s*מהדוח|מה\s*התקדמות\s*לפי\s*הדוח/u,
    /איך\s*נראה\s*הדוח|איך\s*נראית\s*התקופה|מה\s*המצב\s*הכללי/u,
    /מה\s*המצב|מה\s*התמונה|תמונה\s*כללית|מבט\s*על/u,
    /פרטי\s*הדוח|תוכן\s*הדוח|מה\s*יש\s*בדוח/u,
    /הסבר\s*קצר|תסביר\s*לי\s*את\s*הדוח/u,
    /תסביר\s*לי\s*מה\s*חשוב\s*כאן|מה\s*חשוב\s*כאן\s*בדוח/u,
    /למה\s*אין\s*מספיק\s*המלצות/u,
    /האם\s*הילד\s*חלש\s*או\s*שפשוט\s*אין\s*מספיק\s*מידע/u,
    /^בקיצור\??$/u,
    /^ו?בקיצור\??$/u,
    /אז\s*מה\s*בעצם|מה\s*השורה\s*התחתונה|מה\s*לקחת\s*מזה/u,
  ],
  // what_is_most_important: /^במה להתמקד/ must not match "במה להתמקד השבוע" (prefix-only false positive).
  what_is_most_important: [
    /^במה\s*להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))/u,
    /^במה\s*כדאי\s*להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))/u,
    /^איפה\s*להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))/u,
    /^איפה\s*כדאי\s*להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))/u,
    /מה\s*הדגש/u,
    /מה\s*חשוב\s*לתרגל/u,
    /להתקדם\s*או\s*להמתין|לחכות\s*או\s*להמשיך|להמשיך\s*או\s*להמתין|להמתין\s*או\s*להתקדם|כדאי\s*להתקדם/u,
    /מה\s*הכי\s*חשוב(?!\s*עכשיו\s*בבית)|מה\s*חשוב\s*ביותר|מה\s*העיקר|על\s*מה\s*להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))|מה\s*דחוף|מה\s*דורש\s*תשומת\s*לב\s*ראשונה/u,
    /מה\s*הדבר\s*הראשון|מה\s*לטפל\s*בו\s*קודם|מה\s*הכי\s*דחוף|מה\s*הכי\s*קריטי/u,
    /איפה\s*להתחיל|מאיפה\s*להתחיל|מה\s*העדיפות/u,
    /מה\s*הכי\s*חשוב\s*כרגע|מה\s*הכי\s*חשוב\s*עכשיו(?!\s*בבית)|מה\s*הכי\s*חשוב\s*היום/u,
    /מה\s*לשים\s*על\s*הכוונת|מה\s*לשים\s*בראש/u,
    /מה\s*הכי\s*בולט\s*לטיפול|מה\s*דורש\s*טיפול\s*ראשון/u,
    /מה\s*הכי\s*משמעותי|מה\s*משמעותי\s*ביותר/u,
    /מה\s*הכי\s*חשוב\s*לשים\s*לב/u,
    /מה\s*העיקר\s*לטפל|מה\s*העיקר\s*כרגע/u,
    /מה\s*דחוף\s*לטפל|מה\s*דחוף\s*לטפל\s*בו/u,
    /מה\s*הכי\s*משמעותי\s*כרגע/u,
    // Common phrasings with כדאי / איפה (exclude weekly focus: "איפה כדאי להתמקד השבוע")
    /איפה\s*כדאי\s*(?:להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))|לשים\s*לב|לשים\s*דגש)/u,
    /על\s*מה\s*כדאי\s*(?:להתמקד(?!\s*(?:השבוע|בשבוע|שבוע\s*הקרוב|הימים\s*הקרובים|לימים\s*הקרובים))|לשים\s*לב)/u,
    /כדאי\s*לשים\s*(דגש|תשומת\s*לב)\s*ב/u,
    /איפה\s*כדאי\s*לשים/u,
  ],
  what_to_do_today: [
    /מה\s*הצעד\s*להיום|הצעד\s*להיום|צעד\s*קטן\s*להיום|פעולה\s*להיום|משימה\s*קטנה\s*להיום/u,
    /מה\s*מומלץ\s*לעשות\s*היום|מומלץ\s*לעשות\s*היום|מה\s*מומלץ\s*היום/u,
    /מה\s*לעשות\s*היום|מה\s*עושים\s*היום|מה\s*הצעד\s*היום|צעד\s*קטן\s*היום|היום\s*מה\s*לעשות|מה\s*לעשות\s*עכשיו/u,
    /מה\s*לעשות\s*הערב|מה\s*לעשות\s*אחרי\s*הבית\s*ספר|פעולה\s*להיום/u,
    /מה\s*לעשות\s*מיד|מה\s*לעשות\s*כעת|מה\s*עושים\s*עכשיו/u,
    /תכנון\s*ליום|משימה\s*להיום|משימות\s*להיום/u,
    /מה\s*לתרגל\s*היום|תרגול\s*להיום|מה\s*לחזק\s*היום/u,
    /מה\s*לעשות\s*בבית\s*היום|מה\s*לעשות\s*היום\s*בבית/u,
    /צעד\s*אחד\s*היום|דבר\s*אחד\s*להיום/u,
    /מה\s*המלצה\s*להיום|מה\s*מומלץ\s*היום/u,
  ],
  what_to_do_this_week: [
    /^מחר\s*\??$/u,
    /כמה\s*לתרגל/u,
    /כמה\s*זמן\s*לתרגל/u,
    /כמה\s*שאלות/u,
    /כמה\s*פעמים\s*בשבוע/u,
    /^איך\s*לתרגל/u,
    /במה\s*להתמקד\s*השבוע|להתמקד\s*השבוע|מה\s*חשוב\s*השבוע/u,
    /מה\s*הכי\s*חשוב\s*עכשיו\s*בבית|מה\s*הכי\s*חשוב\s*בבית\s*השבוע|מה\s*הכי\s*חשוב\s*עכשיו\s*לבית/u,
    /מה\s*היית\s*מציע\s*לימים\s*הקרובים|מה\s*היית\s*מציע\s*לנו\s*לימים\s*הקרובים|מה\s*להתמקד\s*בימים\s*הקרובים/u,
    /מה\s*כדאי\s*לעשות\s*בשבוע|כדאי\s*לעשות\s*בשבוע\s*הקרוב|מה\s*לעשות\s*בשבוע\s*הקרוב/u,
    /מה\s*לעשות\s*השבוע|מה\s*לעשות\s*בשבוע|תוכנית\s*לשבוע|השבוע\s*מה\s*לעשות|שבוע\s*הקרוב/u,
    /מה\s*לעשות\s*בשבוע\s*הזה|מה\s*לעשות\s*בשבוע\s*הקרוב|תכנון\s*שבועי/u,
    /איך\s*לחלק\s*לשבוע|חלוקה\s*לשבוע|יעדים\s*לשבוע/u,
    /מה\s*המלצה\s*לשבוע|מה\s*מומלץ\s*לשבוע|תוכנית\s*עבודה\s*לשבוע/u,
    /מה\s*לתרגל\s*השבוע|תרגול\s*לשבוע/u,
    /מה\s*לעשות\s*בימים\s*הקרובים|מה\s*לעשות\s*השבוע\s*בבית/u,
    /שבוע\s*קדימה|השבוע\s*הבא/u,
    /מסלול\s*לשבוע|מפת\s*דרכים\s*לשבוע/u,
    // Generic home-practice phrasings without time qualifier
    /מה\s*לעשות\s*בבית(?!\s*היום)/u,
    /מה\s*כדאי\s*(לתרגל|לעשות|לחזק)\s*בבית/u,
    /איך\s*לעזור\s*(לו|לה|לילד|לילדה)?/u,
    /מה\s*כדאי\s*לתרגל(?!\s*היום)/u,
    /תוכנית\s*(לבית|לתרגול|תרגול)/u,
  ],
  why_not_advance: [
    /למה\s*לא\s*להתקדם|למה\s*לא\s*להעלות\s*רמה|למה\s*לעצור\s*כאן|מה\s*הסיבה\s*שלא\s*ממשיכים/u,
    /למה\s*אתה\s*לא\s*ממליץ\s*להעלות\s*רמה|למה\s*לא\s*ממליצים\s*להעלות\s*רמה/u,
    /למה\s*לא\s*מתקדמים+|למה\s*לא\s*מתקדם+/u,
    /למה\s*לא\s*מתקדמים|למה\s*לא\s*מתקדם|למה\s*עדיין\s*לא|למה\s*לא\s*עולים\s*רמה|למה\s*נשארים/u,
    /למה\s*לא\s*מקדמים|למה\s*לא\s*מקדמים\s*רמה|למה\s*לא\s*עולים/u,
    /למה\s*לא\s*משפרים|למה\s*אין\s*קידום|למה\s*הקידום\s*נעצר/u,
    /למה\s*עדיין\s*באותה\s*רמה|למה\s*לא\s*משתנה\s*הרמה/u,
    /מה\s*חוסם\s*קידום|מה\s*עוצר\s*קידום|מה\s*מעכב/u,
    /למה\s*לא\s*עולים\s*שלב|למה\s*לא\s*עולים\s*דרגה/u,
    /למה\s*לא\s*מתקדמים\s*רמה|למה\s*לא\s*מתקדמים\s*שלב/u,
    /למה\s*נתקעים|למה\s*זה\s*נתקע/u,
  ],
  what_is_going_well: [
    // Category: strength / “where are results strong?” — compositional patterns, not a FAQ list.
    /יש\s*כאן\s*חוזקה\s*אמיתית|חוזקה\s*אמיתית|יש\s*פה\s*חוזקה/u,
    /מקצוע\s*החזק|המקצוע\s*החזק|מה\s*המקצוע\s*החזק|המקצוע\s*החזק\s*ביותר/u,
    /מה\s*המקצוע\s*(הכי\s*)?טוב/u,
    /המקצוע\s*(הכי\s*)?טוב/u,
    /איזה\s*מקצוע\s*(הכי\s*)?(חזק|חזקה|טוב|טובה)/u,
    /איפה\s*נראו\s*(התוצאות|תוצאות)/u,
    /מה\s*הולך\s*טוב|מה\s*עובד\s*טוב|מה\s*חזק|איפה\s*החוזקות|מה\s*מצוין|מה\s*טוב\s*בדוח/u,
    /מה\s*משתפר|איפה\s*יש\s*הצלחה|מה\s*ההצלחות|מה\s*עובד|מה\s*יציב/u,
    /מה\s*הילד\s*מצליח|איפה\s*יש\s*חיזוק|מה\s*חיובי/u,
    /מה\s*בולט\s*לטובה|מה\s*מרגיש\s*טוב|מה\s*נראה\s*טוב/u,
    /נקודות\s*חוזק|חוזקות|מה\s*עובד\s*במקצוע/u,
    /איפה\s*הכי\s*טוב|איפה\s*הכי\s*חזק|מה\s*הכי\s*טוב/u,
    /מה\s*משביע\s*רצון|מה\s*מרשים/u,
    /מה\s*התקדמות\s*חיובית|מה\s*משתפר\s*בדוח/u,
    // Common parent phrasings not covered above
    /במה\s*(הוא|היא|הילד|הילדה)\s*(חזק|חזקה|טוב|טובה)/u,
    /במה\s*(הוא|היא)?\s*(הכי\s*)?(חזק|חזקה)/u,
    /מה\s*(הוא|היא|הילד|הילדה)\s*(יודע|יודעת|טוב|טובה)\s*ב/u,
    /נקודות\s*ה?חוזק/u,
  ],
  what_not_to_do_now: [
    /מה\s*לא\s*לעשות\s*עכשיו/u,
    /מה\s*לא\s*לעשות/u,
    /ממה\s*להימנע\s*עכשיו/u,
    /מה\s*לא\s*כדאי\s*עכשיו/u,
    /מה\s*לא\s*כדאי\s*לעשות\s*עכשיו/u,
  ],
  what_is_still_difficult: [
    /מה\s*הטעויות|מה\s*הטעיות|הטעויות\s*הבולטות|איפה\s*הילד\s*טעה|איפה\s*טעה|במה\s*טעה|מה\s*חוזר\s*בטעות|סוג\s*הטעות|דפוס\s*טעות/u,
    /מה\s*לא\s*כדאי\s*לעשות(?!\s*עכשיו)|לא\s*כדאי\s*עכשיו|להימנע\s*מ/u,
    /מה\s*המקצוע\s*(החלש|הכי\s*חלש)|איזה\s*מקצוע\s*(הכי\s*חלש|דורש\s*חיזוק)|מקצוע\s*דורש\s*חיזוק/u,
    /מה\s*עדיין\s*קשה|מה\s*קשה|איפה\s*הקושי|מה\s*דורש\s*חיזוק|מה\s*חלש|מה\s*מתקשים/u,
    /איפה\s*(הוא|היא|הילד|הילדה)\s*(מתקשה|מתקשים|חלש|חלשה)/u,
    /במה\s*(הוא|היא|הילד|הילדה)\s*(מתקשה|חלש|חלשה|קשה\s*לו)/u,
    /מה\s*עדיין\s*לא\s*יושב|מה\s*עדיין\s*לא\s*הולך|מה\s*לא\s*יושב|מה\s*לא\s*הולך|מה\s*לא\s*צולח/u,
    /איפה\s*החולשות|מה\s*החולשות|מה\s*חלש\s*בדוח/u,
    /מה\s*דורש\s*עבודה|מה\s*דורש\s*תרגול|מה\s*עדיין\s*נופל/u,
    /מה\s*עדיין\s*בעייתי|מה\s*בעייתי|מה\s*עדיין\s*קורה/u,
    /מה\s*הכי\s*קשה|מה\s*הכי\s*חלש|איפה\s*הכי\s*קשה/u,
    /מה\s*לא\s*מסתדר|מה\s*לא\s*סגור|מה\s*עדיין\s*פתוח/u,
    /מה\s*דורש\s*ליווי|מה\s*דורש\s*תשומת\s*לב/u,
    /מה\s*דורש\s*חיזוק/u,
  ],
  how_to_tell_child: [
    /איך\s*להגיד\s*את\s*זה\s*לילד|איך\s*להסביר\s*לו\s*את\s*זה|באיזה\s*ניסוח\s*לדבר\s*איתו/u,
    /מה\s*לומר\s*לו\s*בלי\s*להלחיץ|איך\s*לדבר\s*איתו\s*בלי\s*להלחיץ/u,
    /איך\s*לומר\s*את\s*זה\s*לילד|איך\s*לומר\s*לילד|איך\s*לומר\s*בבית/u,
    /איך\s*להסביר\s*לילד|איך\s*לספר\s*לילד|ניסוח\s*לילד|במילים\s*פשוטות\s*לילד/u,
    /איך\s*להעביר\s*לילד|איך\s*לדבר\s*עם\s*הילד|איך\s*לשתף\s*את\s*הילד/u,
    /מה\s*לומר\s*בבית|איך\s*להציג\s*את\s*זה|איך\s*להציג\s*לילד/u,
    /הסבר\s*לילד|מילים\s*לילד|לשון\s*של\s*ילדים/u,
    /איך\s*לא\s*להלחיץ|איך\s*בלי\s*לחץ|איך\s*ברוגע/u,
    /איך\s*לבנות\s*משפט|משפט\s*לילד|משפטים\s*לילד/u,
    /איך\s*להסביר\s*בבית|איך\s*לדבר\s*בבית/u,
    /איך\s*להראות\s*לילד|איך\s*להדריך\s*את\s*הילד/u,
    /איך\s*לספר\s*לילד|ספר\s*לילד\s*בלי/u,
    /ניסוח\s*רך\s*לילד/u,
  ],
  question_for_teacher: [
    /מה\s*חשוב\s*לברר\s*מול\s*המורה|מה\s*לברר\s*מול\s*המורה/u,
    /מה\s*לשאול\s*את\s*המורה|שאלה\s*למורה|ניסוח\s*למורה|מכתב\s*למורה|לשלוח\s*למורה/u,
    /מה\s*לכתוב\s*למורה|איך\s*לפנות\s*למורה|פנייה\s*למורה/u,
    /שאלה\s*לבית\s*הספר|לשאול\s*את\s*המורה|לשאול\s*את\s*הגננת/u,
    /מה\s*להעביר\s*למורה|מה\s*לשתף\s*עם\s*המורה/u,
    /נקודות\s*לשיחה\s*עם\s*המורה|נושאים\s*לשיחה\s*עם\s*המורה/u,
    /איך\s*לשאול\s*את\s*המורה|איך\s*לשאול\s*במייל/u,
    /שאלה\s*מנוסחת|ניסוח\s*שאלה\s*למורה/u,
    /מה\s*חשוב\s*להעלות\s*למורה|מה\s*להעלות\s*בשיחה/u,
  ],
  is_intervention_needed: [
    /לבדוק\s*יותר\s*לעומק|לעומק\s*יותר|בדיקה\s*יותר\s*מעמיקה|משהו\s*שצריך\s*לבדוק/u,
    /אני\s*לא\s*בטוח\s*אם\s*זו\s*בעיה\s*אמיתית|לא\s*בטוחים\s*אם\s*זו\s*בעיה/u,
    /זה\s*דורש\s*עזרה\s*מעבר\s*לבית|צריך\s*לפנות\s*למורה\s*או\s*לאיש\s*מקצוע/u,
    /יש\s*פה\s*משהו\s*מדאיג|זה\s*משהו\s*מדאיג|האם\s*יש\s*פה\s*דאגה/u,
    /חוסר\s*ודאות|לא\s*ברור\s*לי|לא\s*ברור|ביטחון\s*נמוך|יש\s*חוסר\s*ודאות/u,
    /האם\s*צריך\s*התערבות|האם\s*נדרש\s*טיפול|האם\s*יש\s*צורך\s*בליווי|האם\s*צריך\s*ליווי/u,
    /האם\s*זה\s*דחוף|האם\s*זה\s*חמור|האם\s*זה\s*מדאיג|האם\s*לדאוג/u,
    /צריך\s*טיפול\s*מקצועי|צריך\s*התערבות|צריך\s*עזרה\s*מקצועית/u,
    /האם\s*לפנות\s*למומחה|האם\s*לפנות\s*לגורם/u,
    /האם\s*זה\s*נורמלי|האם\s*זה\s*בטווח\s*הנורמלי/u,
    /האם\s*יש\s*בעיה|האם\s*יש\s*משהו\s*לא\s*תקין/u,
    /האם\s*צריך\s*לדאוג|האם\s*כדאי\s*לדאוג/u,
    /האם\s*נדרשת\s*התערבות|האם\s*נדרש\s*ליווי\s*מיוחד/u,
    /התערבות\s*מקצועית|נדרשת\s*התערבות\s*מקצועית/u,
    // Common parent phrasings not covered above
    /סיבה\s*לדאגה|יש\s*ממה\s*לדאוג|יש\s*מה\s*לדאוג/u,
    /כדאי\s*לדאוג|צריך\s*לדאוג|(?:האם|יש)\s*(?:סיבה|מה)\s*לדאוג/u,
    /האם\s*יש\s*סיבה|האם\s*זה\s*מדאיג|מדאיג\b/u,
    /(?:ה?מצב|זה)\s*(גרוע|רע|חמור|בעייתי)/u,
    /האם\s*צריך\s*לדאוג|האם\s*כדאי\s*לדאוג/u,
  ],
  strength_vs_weakness_summary: [
    /מה\s*טוב\s*ומה\s*חלש|מה\s*עובד\s*טוב\s*ומה\s*דורש\s*חיזוק|חוזקות\s*מול\s*קושי/u,
    /מה\s*טוב\s*ומה\s*חלש\s*בדוח|מה\s*חלש\s*ומה\s*טוב/u,
    /מה\s*עובד\s*טוב\s*ומה\s*צריך\s*חיזוק|מה\s*עובד\s*ומה\s*דורש\s*חיזוק/u,
    /איפה\s*הוא\s*מצליח\s*ואיפה\s*פחות|תסכם\s*לי\s*חוזקות\s*מול\s*קושי/u,
    /חוזקות\s*מול\s*חולשות|חוזק\s*מול\s*חולשה|סיכום\s*חוזקות\s*וחולשות/u,
    /מה\s*חזק\s*ומה\s*חלש|מה\s*טוב\s*ומה\s*קשה|מה\s*עובד\s*ומה\s*לא/u,
    /השוואה\s*בין\s*נושאים|השוואה\s*בין\s*מקצועות|מבט\s*משווה/u,
    /מאזן\s*חיובי\s*שלילי|מאזן\s*כללי|תמונה\s*מלאה/u,
    /חוזקות\s*וחולשות|חוזקות\s*ו\s*חולשות|חוזקות\s*וגם\s*חולשות/u,
    /סיכום\s*מאוזן|מבט\s*מאוזן|תמונה\s*מאוזנת/u,
    /מה\s*בולט\s*לטובה\s*ולרעה|מה\s*עובד\s*ומה\s*נופל/u,
    /פערים\s*בין\s*נושאים|פערים\s*בין\s*מקצועות/u,
    /מבט\s*משווה\s*בין\s*נושאים/u,
  ],
  clinical_boundary: [
    /דיסלקציה|דיסלקסיה|דיסקלקוליה/u,
    /לקות\s*למידה/u,
    /הפרעת\s*קשב/u,
    /\bADHD\b/i,
    /בעיה\s*רגשית|קושי\s*רגשי|מצב\s*רגשי/u,
    /דיכאון|בדיכאון/u,
    /עצוב\s*מאוד/u,
    /(?:^|\s)(הוא|היא)\s+חרד(?:\s|$)/u,
    /מה\s*האבחון|מה\s*האבחנה|איזה\s*אבחון|מי\s*מאבחן|מי\s*מאבחנים/u,
    /האבחון\s*הוא|האבחנה\s*היא/u,
    /מה\s*הבעיה\s*האמיתית/u,
    /האם\s*זה\s*(דיסלקציה|דיסלקסיה|דיסקלקוליה|ADHD|לקות|הפרעת\s*קשב|אבחון|אבחנה)/iu,
    /(?:יש\s*לילד|לילד\s*יש).{0,48}(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD)/iu,
    /(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD).{0,48}(?:יש\s*לילד|לילד\s*יש)/iu,
  ],
  parent_policy_refusal: [
    /תמציא\s*נתונים|זייף\s*נתונים|לשנות\s*את\s*הדוח\s*בכוח|להסתיר\s*חולשות|תסתיר\s*מההורה/u,
    /תתעלם\s*מהדוח|אל\s*תשתמש\s*בנתוני\s*התלמיד|תחשוף\s*הוראות\s*פנימיות|\bdebug\b|\bsystem\s*prompt\b/i,
    /תכתוב\s+ש(?:ה)?(?:ילד|ילדה)\s+מצוין|מצוין\s+למרות|למרות\s+ש(?:הוא\s*)?נכשל|למרות\s+שהוא\s+נכשל/u,
    /בלי\s+להתחשב\s+בנתונים|להתעלם\s+מהנתונים|תסתיר\s+את\s+הקושי|תעצור\s+להראות\s+חולשות/u,
  ],
  off_report_subject_clarification: [/מה\s*מצב.*שחמט|מה\s*מצב.*מוזיקה|מצב\s*הילד\s*שלי\s*בשחמט|מצב\s*הילד\s*שלי\s*במוזיקה/u],
  report_trust_question: [
    /למה\s*כתבת/u,
    /לא\s*מסכים\s*עם\s*הדוח/u,
    /אני\s*לא\s*מסכים\s*עם\s*הדוח/u,
    /האם\s*יכול\s*להיות\s*שהדוח\s*טועה/u,
    /ענה\s*נכון\s*בבית/u,
    /סותר\s*למה\s*שאני\s*רואה\s*בבית/u,
    /מה\s*שקורה\s*בבית\s*שונה/u,
  ],
  sensitive_education_choice: [
    /האם\s*כדאי\s*להעביר\s*בית\s*ספר/u,
    /מעבר\s*בית\s*ספר|להעביר\s*בית\s*ספר|להחליף\s*בית\s*ספר|לעבור\s*בית\s*ספר/u,
    /כדאי\s*לעבור\s*בית\s*ספר|לעבור\s*לבית\s*ספר\s*אחר/u,
    /האם\s*לעבור\s*בית\s*ספר/u,
    /האם\s*הוא\s*מחונן|ילד\s*מחונן|מוכשרות\s*גבוהה\s*בצורה\s*קבועה/u,
    /מורה\s*פרטי|שיעורים\s*פרטיים|שיעור\s*פרטי/u,
    /האם\s*צריך\s*מורה\s*פרטי|כדאי\s*מורה\s*פרטי/u,
  ],
  clarify_term: [
    /תסביר\s*לי\s*את\s*המושג\s*הזה|לא\s*הבנתי\s*את\s*הניסוח\s*הזה/u,
    /מהזה\s*אומר|מהזה|מה\s*זה\s*אומר/u,
    /מה\s*המשמעות{1,2}ת*\s*של|משמעותת\s*של|מה\s*הכוונה\s*של|מה\s*זה\s*אומר|מה\s*זה\s*אומר\s*בפועל|מה\s*המונח/u,
    /לא\s*הבנתי\s*את\s*המושג|לא\s*הבנתי\s*את\s*המילה|תסביר\s*מונח/u,
    /מה\s*ההגדרה|מה\s*ההסבר|מה\s*המשמעות/u,
    /מה\s*הכוונה|מה\s*הכוונה\s*במילה|מה\s*הכוונה\s*בביטוי/u,
    /תרגם\s*לי|תרגום\s*להורים|בשפה\s*פשוטה/u,
    /מה\s*זה\s*אומר\s*במילים\s*פשוטות|מה\s*זה\s*בקצרה/u,
    /לא\s*הבנתי\s*את\s*המושגים|לא\s*הבנתי\s*את\s*הטקסט/u,
    /מה\s*ההבדל\s*בין|מה\s*ההבדל\s*ל/u,
    /מה\s*זה\s*אומר\s*בפשטות/u,
  ],
  /** Resolved via payload vocabulary when Stage‑A scores zero (see interpretFreeformStageA rescue). */
  ask_topic_specific: [],
  ask_subject_specific: [],
  off_topic_redirect: [
    // Weather — all spellings (with/without ה, אוויר/אויר)
    /מזג\s*ה?אוויר|מזג\s*ה?אויר/u,
    // Time
    /מה\s*ה?שעה|כמה\s*ה?שעה|שעון/u,
    // Jokes
    /תספר\s*בדיחה|ספר\s*בדיחה|^בדיחה\b/u,
    // Politics / prime minister
    /מי\s*ראש\s*ה?ממשלה|ראש\s*ה?ממשלה/u,
    // Sports / who won — includes all variants
    /כדורגל|מי\s*ניצח|ניצח\s*ב|משחק\s*אתמול/u,
    // Recipes / food (non-learning)
    /מתכון\b|עוגה\b/u,
    // Crypto
    /ביטקוין/u,
    // Code / programming
    /javascript\b|עזור\s*לי\s*עם\s*קוד|קוד\s*\(/iu,
    // Shopping
    /איפה\s*לקנות|נעליים\b/u,
    // Songs
    /תכתוב\s*לי\s*שיר|תכתוב\s*שיר|^שיר\s*על/u,
    // News (non-report)
    /מה\s*ה?חדשות|חדשות\s*היום/u,
    // General knowledge / hobbies not related to learning
    /מה\s*מצב.*שחמט|במוזיקה\b|שחמט\b/u,
  ],
  simple_parent_explanation: [
    /תסביר\s*לי\s*כמו\s*להורה|בלי\s*מושגים\s*מקצועיים/u,
    /תסביר\s*לי\s*במשפט\s*אחד/u,
    /תן\s*לי\s*רק\s*3\s*נקודות/u,
    /במילים\s*פשוטות\s*בלי\s*ז׳רגון/u,
  ],
  unclear: [/^$/u],
};

/** @type {Record<ScopeClass, RegExp[]>} */
const SCOPE_CLASS_SIGNALS = {
  recommendation: [
    /מלצ|המלצ|מה\s*לעשות|צעד\s*הבא|תוכנית|פעולה\s*מעשית|איך\s*לתרגל|תרגול\s*מומלץ/u,
    /מה\s*כדאי\s*לעשות|מה\s*מומלץ|מה\s*עושים\s*עכשיו|מה\s*לעשות\s*היום|מה\s*לעשות\s*השבוע/u,
  ],
  confidence_uncertainty: [
    /ודאות|ביטחון\s*במסקנה|לא\s*בטוחים|חוסר\s*ודאות|מוקדם\s*למסקנה|כמה\s*אפשר\s*לסמוך/u,
    /עד\s*כמה|רמת\s*ביטחון|עד\s*כמה\s*זה\s*ברור|כמה\s*זה\s*ברור/u,
  ],
  strengths: [
    /חוזק|חזקים|חזקה|מה\s*הולך\s*טוב|מצטיין|הצלח|מתקדמים\s*טוב|מה\s*טוב/u,
    /מה\s*עובד|נקודות\s*חיוביות|מה\s*מרגיש\s*טוב/u,
    /מה\s*חזק|חזק\s*ו/u,
  ],
  weaknesses: [
    /חולש|חלשים|חלשה|קושי|קשה\s*ל|מתקשים|מה\s*לא\s*הולך|מה\s*נופל/u,
    /נקודות\s*לשיפור|מה\s*דורש\s*חיזוק|מה\s*עדיין\s*קשה/u,
    /מה\s*חלש|חלש\s*ו/u,
  ],
  blocked_advance: [
    /למה\s*לא\s*מתקדמים|למה\s*לא\s*עולים|למה\s*נשארים|למה\s*עדיין\s*לא|נתקעים|חוסם\s*קידום/u,
    /למה\s*לא\s*מקדמים|למה\s*לא\s*משפרים/u,
  ],
  executive: [],
  subject: [],
  topic: [],
};

/**
 * @param {string} folded
 */
function bestScopeClassFromSignals(folded) {
  /** @type {Array<{ k: ScopeClass; s: number }>} */
  const scores = [];
  for (const [k, patterns] of Object.entries(SCOPE_CLASS_SIGNALS)) {
    if (!patterns.length) continue;
    let s = 0;
    for (const re of patterns) {
      if (re.test(folded)) s += 1;
    }
    if (s > 0) scores.push({ k: /** @type {ScopeClass} */ (k), s });
  }
  scores.sort((a, b) => b.s - a.s);
  return scores[0]?.k || null;
}

/**
 * Strength-vs-weakness: one-sided wording → strengths/weaknesses; both sides → executive.
 * @param {string} folded
 * @returns {ScopeClass}
 */
function strengthVsInterpretationScopeFromFolded(folded) {
  const st = SCOPE_CLASS_SIGNALS.strengths;
  const wk = SCOPE_CLASS_SIGNALS.weaknesses;
  let sStr = 0;
  let sWeak = 0;
  for (const re of st) {
    if (re.test(folded)) sStr += 1;
  }
  for (const re of wk) {
    if (re.test(folded)) sWeak += 1;
  }
  if (sStr > 0 && sWeak > 0) return "executive";
  if (sWeak > sStr) return "weaknesses";
  if (sStr > sWeak) return "strengths";
  return "executive";
}

/**
 * Obvious non-learning utterances (weather, shopping, code, news, …).
 * @param {string} t normalized lowercase utterance
 * @param {string} folded folded utterance
 */
function offTopicUtteranceHeuristic(t, folded) {
  const s = `${t}\n${folded}`;
  return (
    // Weather — all spellings (with/without ה, אוויר/אויר)
    /מזג\s*ה?אוויר|מזג\s*ה?אויר/u.test(s) ||
    /מה\s*ה?שעה|כמה\s*ה?שעה/u.test(s) ||
    /תספר\s*בדיחה|ספר\s*בדיחה/u.test(s) ||
    // Politics / prime minister
    /מי\s*ראש\s*ה?ממשלה|ראש\s*ה?ממשלה/u.test(s) ||
    // Sports / who won
    /כדורגל|מי\s*ניצח|ניצח\s*ב/u.test(s) ||
    /מתכון|עוגה/u.test(s) ||
    /ביטקוין/u.test(s) ||
    /javascript|עזור\s*לי\s*עם\s*קוד/iu.test(s) ||
    /איפה\s*לקנות|נעליים/u.test(s) ||
    /תכתוב\s*לי\s*שיר|תכתוב\s*שיר/u.test(s) ||
    /מה\s*ה?חדשות|חדשות\s*היום/u.test(s)
  );
}

/**
 * Free-form Stage A interpretation.
 * @param {string} utteranceRaw
 * @param {unknown} payload
 */
export function interpretFreeformStageA(utteranceRaw, payload) {
  const normalizedUtterance = normalizeFreeformParentUtteranceHe(String(utteranceRaw || ""));
  const t = normalizedUtterance.toLowerCase().replace(/\s+/g, " ").trim();
  const folded = foldUtteranceForHeMatch(normalizedUtterance);
  const topicHintEarly = payload ? extractTopicHint(folded, payload) : null;
  const subjectHintEarly = payload ? extractSubjectHint(folded, payload) : null;

  /** @type {Record<CanonicalParentIntent, number>} */
  const scores = /** @type {any} */ ({});
  for (const intent of CANONICAL_PARENT_INTENTS) scores[intent] = 0;

  for (const [intent, patterns] of Object.entries(INTENT_PARAPHRASES)) {
    if (intent === "unclear") continue;
    let s = 0;
    for (const re of patterns) {
      if (re.test(t) || re.test(folded)) s += 1;
    }
    scores[/** @type {CanonicalParentIntent} */ (intent)] = s;
  }

  if (offTopicUtteranceHeuristic(t, folded)) {
    scores.off_topic_redirect = Math.max(scores.off_topic_redirect || 0, 12);
  }

  // Product QA equivalence overrides for high-frequency free-form phrasings.
  if (/מה\s*הכי\s*חשוב\s*עכשיו\s*בבית/.test(t) || /מה\s*הכי\s*חשוב\s*עכשיו\s*בבית/.test(folded)) {
    scores.what_to_do_this_week += 3;
  }
  if (
    (/מה\s*טוב\s*ומה\s*חלש/.test(t) || /מה\s*טוב\s*ומה\s*חלש/.test(folded)) ||
    (/מה\s*עובד\s*טוב\s*ומה\s*דורש\s*חיזוק/.test(t) || /מה\s*עובד\s*טוב\s*ומה\s*דורש\s*חיזוק/.test(folded))
  ) {
    scores.strength_vs_weakness_summary += 3;
  }
  if (/מה\s*חזק\s*ומה\s*חלש/.test(t) || /מה\s*חזק\s*ומה\s*חלש/.test(folded)) {
    scores.strength_vs_weakness_summary += 4;
  }
  if (/האם\s*אפשר\s*להסיק\s*מסקנות/u.test(t) || /האם\s*אפשר\s*להסיק\s*מסקנות/u.test(folded)) {
    scores.explain_report += 4;
  }
  if (/מה\s*לעשות\s*מחר|מחר\s*מה\s*לעשות/u.test(t) || /מה\s*לעשות\s*מחר/u.test(folded)) {
    scores.what_to_do_today += 6;
  }
  if (/תסביר\s*לי\s*כמו\s*להורה|בלי\s*מושגים\s*מקצועיים/u.test(t) || /תסביר\s*לי\s*כמו\s*להורה/u.test(folded)) {
    scores.simple_parent_explanation += 10;
  }
  if (/מה\s*המקצוע\s*(הכי\s*)?טוב|המקצוע\s*(הכי\s*)?טוב/u.test(t) || /מה\s*המקצוע\s*(הכי\s*)?טוב/u.test(folded)) {
    scores.what_is_going_well += 10;
  }
  const weekPlanningCue = /השבוע|שבוע\s*הקרוב|בשבוע|הימים\s*הקרובים|לימים\s*הקרובים|השבוע\s*הזה/u;
  if (
    (/^במה\s*להתמקד|^במה\s*כדאי\s*להתמקד|^איפה\s*להתמקד|^איפה\s*כדאי\s*להתמקד/u.test(t) || /^במה\s*להתמקד/u.test(folded)) &&
    !weekPlanningCue.test(t) &&
    !weekPlanningCue.test(folded)
  ) {
    scores.what_is_most_important += 10;
  }
  if (/כמה\s*לתרגל|כמה\s*זמן\s*לתרגל/u.test(t) || /כמה\s*לתרגל/u.test(folded)) {
    scores.what_to_do_this_week += 10;
  }

  let best = /** @type {CanonicalParentIntent} */ ("unclear");
  let bestScore = 0;
  let second = 0;
  /** How many distinct intents share the top score (for ties). */
  let topIntentCount = 0;
  for (const intent of CANONICAL_PARENT_INTENTS) {
    if (intent === "unclear") continue;
    const v = scores[intent] || 0;
    if (v > bestScore) {
      second = bestScore;
      bestScore = v;
      best = intent;
    } else if (v > second) {
      second = v;
    }
  }
  if (bestScore === 0) best = "unclear";
  else {
    for (const intent of CANONICAL_PARENT_INTENTS) {
      if (intent === "unclear") continue;
      if ((scores[intent] || 0) === bestScore) topIntentCount += 1;
    }
  }

  if ((scores.clinical_boundary || 0) > 0) {
    best = "clinical_boundary";
    bestScore = scores.clinical_boundary || 0;
    topIntentCount = 1;
    second = 0;
  }

  if ((scores.off_topic_redirect || 0) >= 8 && best !== "clinical_boundary") {
    best = "off_topic_redirect";
    bestScore = scores.off_topic_redirect || 0;
    topIntentCount = 1;
    second = 0;
  }

  if (
    ((scores.off_report_subject_clarification || 0) > 0 ||
      /מה\s*מצב.*שחמט|מה\s*מצב.*מוזיקה/u.test(folded)) &&
    best !== "clinical_boundary"
  ) {
    best = "off_report_subject_clarification";
    bestScore = Math.max(scores.off_report_subject_clarification || 0, 8);
    topIntentCount = 1;
    second = 0;
  }

  if ((scores.parent_policy_refusal || 0) > 0 && best !== "clinical_boundary") {
    best = "parent_policy_refusal";
    bestScore = Math.max(scores.parent_policy_refusal || 0, 9);
    topIntentCount = 1;
    second = 0;
  }

  /** Product routing: clinical / health labels must hit clinical_boundary composer — not generic executive summary. */
  if (
    (/הפרעת\s*קשב|בעיית\s*קשב|\bADHD\b/i.test(t) ||
      /הפרעת\s*קשב|בעיית\s*קשב/u.test(folded) ||
      /(?:האם\s+)?(?:צריך|כדאי)\s+אבחון|המלצה\s+לאבחון|תכתוב\s+לי\s+המלצה\s+לאבחון|נוירולוג|פסיכולוג|בעיה\s+פסיכולוגית|בעיה\s+בראש|סימן\s+ל(?:לקות|וקות)|(?:זה\s+)?(?:אומר|מעיד)\s+.*(?:דיסלקצ|דיסלקס|הפרעת\s+קשב)/u.test(
        t,
      )) &&
    best !== "parent_policy_refusal"
  ) {
    best = "clinical_boundary";
    bestScore = 20;
    topIntentCount = 1;
    second = 0;
  }

  /** School placement / tutoring — use sensitive-education draft (bounded), not explain_report dump. */
  if (
    (/מורה\s+פרטי|שיעור\s+פרטי|מעבר\s+בית\s*ספר|ילד\s+מחונן|האם\s+כדאי\s+להעביר\s+בית\s*ספר/u.test(t) ||
      /מורה\s+פרטי|מעבר\s+בית\s*ספר/u.test(folded)) &&
    best !== "clinical_boundary" &&
    best !== "parent_policy_refusal"
  ) {
    best = "sensitive_education_choice";
    bestScore = 20;
    topIntentCount = 1;
    second = 0;
  }

  /** QA catalog: these read as תוכנית פעולה / תרגול שבועי — route to recommendation intent for numbered steps in Copilot. */
  if (
    (/איך\s+לעזור(?:\s+לו|\s+לה|\s+לי)?\s+בלי\s+לחץ|תבנה\s+לי\s+תוכנית\s+קצרה|מה\s+כדאי\s+לתרגל\s+השבוע|מה\s+לתרגל\s+השבוע/u.test(
      t,
    ) ||
      /איך\s+לעזור(?:\s+לו|\s+לה|\s+לי)?\s+בלי\s+לחץ|תבנה\s+לי\s+תוכנית\s+קצרה|מה\s+כדאי\s+לתרגל\s+השבוע|מה\s+לתרגל\s+השבוע/u.test(
        folded,
      )) &&
    best !== "clinical_boundary" &&
    best !== "parent_policy_refusal"
  ) {
    best = "what_to_do_this_week";
    bestScore = 20;
    topIntentCount = 1;
    second = 0;
  }

  if (
    (scores.sensitive_education_choice || 0) > 0 &&
    best !== "clinical_boundary" &&
    best !== "parent_policy_refusal" &&
    best !== "off_report_subject_clarification"
  ) {
    best = "sensitive_education_choice";
    bestScore = scores.sensitive_education_choice || 0;
    topIntentCount = 1;
    second = 0;
  }

  if (
    ((scores.report_trust_question || 0) > 0 ||
      /למה\s*כתבת|ענה\s*נכון\s*בבית|לא\s*מסכים\s*עם\s*הדוח|הדוח\s*טועה/u.test(folded)) &&
    best !== "clinical_boundary" &&
    best !== "sensitive_education_choice" &&
    best !== "parent_policy_refusal" &&
    best !== "off_report_subject_clarification"
  ) {
    best = "report_trust_question";
    bestScore = Math.max(scores.report_trust_question || 0, 5);
    topIntentCount = 1;
    second = 0;
  }

  if ((scores.what_not_to_do_now || 0) > 0 && best !== "clinical_boundary") {
    const n = scores.what_not_to_do_now || 0;
    const d = scores.what_is_still_difficult || 0;
    if (n >= d) {
      best = "what_not_to_do_now";
      bestScore = n;
      topIntentCount = 1;
      second = 0;
    }
  }

  // Short topic/subject follow-ups (e.g. "מה עם גאומטריה?") often score zero Stage‑A patterns.
  // When the utterance matches an anchored topic or subject row from the payload, route explicitly.
  if (best === "unclear" && topicHintEarly) {
    best = "ask_topic_specific";
    bestScore = 6;
    second = 0;
    topIntentCount = 1;
  } else if (best === "unclear" && subjectHintEarly && !topicHintEarly) {
    best = "ask_subject_specific";
    bestScore = 6;
    second = 0;
    topIntentCount = 1;
  }

  const scopeSignal = bestScopeClassFromSignals(folded);
  /** @type {ScopeClass} */
  let scopeClass =
    scopeSignal ||
    (best === "what_is_going_well"
      ? "strengths"
      : best === "what_is_still_difficult" || best === "what_not_to_do_now"
        ? "weaknesses"
        : best === "why_not_advance"
          ? "blocked_advance"
            : best === "what_to_do_today" || best === "what_to_do_this_week" || best === "is_intervention_needed"
            ? "recommendation"
            : "executive");

  if (best === "clinical_boundary" || best === "sensitive_education_choice") {
    scopeClass = "confidence_uncertainty";
  }

  if (best === "strength_vs_weakness_summary") {
    scopeClass = strengthVsInterpretationScopeFromFolded(folded);
  }

  const timeframeHint = inferTimeframeHint(t);
  const toneHint = inferToneHint(t);

  let ambiguityLevel = "low";
  if (bestScore > 0 && topIntentCount >= 2) ambiguityLevel = "high";
  else if (bestScore > 0 && second > 0 && second >= bestScore - 1 && bestScore <= 3) ambiguityLevel = "medium";

  const margin = best === "unclear" ? 0 : Math.max(0, bestScore - second);
  const canonicalIntentScore =
    best === "unclear"
      ? t.length >= 4
        ? 0.28
        : 0.22
      : Math.min(0.98, 0.4 + bestScore * 0.065 + Math.min(0.18, margin * 0.045));

  /** True when two+ intents tie for the top score — downstream may ask one short clarification. */
  const shouldClarifyIntent = ambiguityLevel === "high" && best !== "unclear";

  const intentHitSignals = { ...scores };

  return {
    canonicalIntent: best,
    canonicalIntentScore,
    intentReason: best === "unclear" ? "no_intent_signal" : `stage_a:${best}`,
    normalizedUtterance: t,
    scopeClass,
    subjectHint: subjectHintEarly,
    topicHint: topicHintEarly,
    timeframeHint,
    toneHint,
    ambiguityLevel,
    shouldClarifyIntent,
    /** Per-intent evidence counts — telemetry / tests only */
    intentHitSignals,
    /** @deprecated use intentHitSignals */
    intentHitCounts: intentHitSignals,
  };
}

export default { interpretFreeformStageA, CANONICAL_PARENT_INTENTS };

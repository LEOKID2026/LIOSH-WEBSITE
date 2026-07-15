/**
 * Approved continuity follow-up composers (round 3).
 */

import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { NO_DATA_FOR_REQUEST_RESPONSE_HE } from "./question-classifier.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import {
  collectTopicMetrics,
  extractTopicAnchorsFromSummary,
  pickStrongestTopic,
  pickWeakestTopic,
  resolveContextTopicMetrics,
  topicAnchorFields,
  STRONG_ACC_MIN,
  STRONG_Q_MIN,
} from "./pattern-topic-metrics.js";

const WHAT_NOW_RE = /^(?:אז\s+)?מה\s+עושים(?:\s+עכשיו)?(?:\s*[.?؟]*)?$/u;
const PRESERVE_RE = /^איך\s+לשמר(?:\s+א(?:ת|ת)?\s+ז(?:ה|ו))?(?:\s*[.?؟]*)?$/u;
const IF_WRONG_RE = /^ו?מה\s+אם\s+(?:ה(?:וא|יא)|(?:הילד|הילדה))\s+טוע(?:ה|ים|ות)\s*(?:ב(?:זה|נושא))?(?:\s*[.?؟]*)?$/u;
const SIMPLER_RE = /^(?:תסביר\s+)?(?:פשוט\s+יותר|תעש(?:ה|י)\s+.*\s+פשוט\s+יותר)(?:\s*[.?؟]*)?$/u;
const SHORTEN_RE = /^(?:תקצר\s+לי|תעש(?:ה|י)\s+.*\s+קצר)(?:\s*[.?؟]*)?$/u;
const WHY_RE = /^למה(?:\s*[.?؟]*)?$/u;
const SEVERITY_RE = /^(?:ז(?:ה|ו)\s+)?חמור(?:\s*[.?؟]*)?$/u;
const THEN_ACTIVITY_RE = /^אז\s+לפתוח\s+פעילות(?:\s*[.?؟]*)?$/u;
const WHICH_TOPIC_RE = /^באיזה\s+נושא(?:\s*[.?؟]*)?$/u;
const THEN_AFTER_RE = /^ו?מה\s+אחר(?:\s+כך)?(?:\s*[.?؟]*)?$/u;
const HOME_FOLLOWUP_RE = /^ו?מה\s+לעשות\s+(?:עם\s+ז(?:ה|ו)\s+)?בבית(?:\s*[.?؟]*)?$/u;

/**
 * @param {string} utterance
 */
export function matchesContinuityFollowUp(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (!t || t.length > 48) return false;
  return (
    WHAT_NOW_RE.test(t) ||
    PRESERVE_RE.test(t) ||
    IF_WRONG_RE.test(t) ||
    SIMPLER_RE.test(t) ||
    SHORTEN_RE.test(t) ||
    WHY_RE.test(t) ||
    SEVERITY_RE.test(t) ||
    THEN_ACTIVITY_RE.test(t) ||
    HOME_FOLLOWUP_RE.test(t) ||
    WHICH_TOPIC_RE.test(t) ||
    THEN_AFTER_RE.test(t)
  );
}

/**
 * @param {string} utterance
 */
export function classifyContinuityFollowUp(utterance) {
  const t = foldUtteranceForHeMatch(String(utterance || ""));
  if (SEVERITY_RE.test(t)) return "severity";
  if (HOME_FOLLOWUP_RE.test(t)) return "home_followup";
  if (WHAT_NOW_RE.test(t) || THEN_ACTIVITY_RE.test(t)) return "what_now";
  if (PRESERVE_RE.test(t)) return "preserve";
  if (IF_WRONG_RE.test(t)) return "if_wrong";
  if (SIMPLER_RE.test(t)) return "simpler";
  if (SHORTEN_RE.test(t)) return "shorten";
  if (WHY_RE.test(t)) return "why";
  if (WHICH_TOPIC_RE.test(t) || THEN_AFTER_RE.test(t)) return "what_now";
  return null;
}

function hasConversationContext(conv) {
  return (
    String(conv?.lastResolvedTopic || "").trim() ||
    String(conv?.lastResolvedSubject || "").trim() ||
    (Array.isArray(conv?.priorScopes) && conv.priorScopes.length > 0) ||
    String(conv?.lastAnswerSummary || "").trim().length > 12
  );
}

function priorTurnWasNoData(conv) {
  if (conv?.lastTurnWasNoData === true) return true;
  const s = String(conv?.lastAnswerSummary || conv?.lastAssistantAnswerDigestHe || "");
  return (
    s.includes("אין מספיק מידע") ||
    s.includes(NO_DATA_FOR_REQUEST_RESPONSE_HE.slice(0, 24)) ||
    s.includes("בדוח הנוכחי אין מספיק")
  );
}

function priorTurnWasWhatNotInfer(conv) {
  if (conv?.lastTurnWasWhatNotInfer === true) return true;
  const s = String(conv?.lastAnswerSummary || conv?.lastAssistantAnswerDigestHe || "");
  return s.includes("לא כדאי להסיק מהדוח") || s.includes("לא להסיק מסקנה אישית");
}

const WHY_NOT_INFER_EXPLANATION_HE =
  "כי הדוח מציג רק נתוני תרגול מהאתר בתקופה שנבחרה: אילו נושאים תורגלו, כמה שאלות נענו ומה הייתה רמת הדיוק. הנתונים האלה מספיקים כדי לבחור צעד לימודי קטן, אבל לא כדי להסיק מסקנה אישית על הילד או להשוות אותו לילדים אחרים.";

/**
 * @param {ReturnType<typeof topicAnchorFields>} a
 * @param {string} utterance
 * @param {string} plannerIntent
 * @param {unknown} payload
 */
function continuityDraft(textHe, a, utterance, plannerIntent, payload) {
  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "topic",
    scopeId: a.topicRowKey,
    scopeLabel: a.displayName || a.topicLabel,
    canonicalIntent: plannerIntent,
    parentUtterance: utterance,
  });
  if (!truthPacket) return null;
  return {
    answerBlocks: [{ type: "observation", textHe: String(textHe || "").trim(), source: "continuity_pattern_composer" }],
    plannerIntent,
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      continuityPattern: true,
      intentReason: "continuity:approved_pattern",
      scopeConfidence: 0.9,
      scopeReason: "continuity_followup",
    },
  };
}

function continuityExecutiveDraft(textHe, utterance, plannerIntent, payload) {
  const truthPacket = buildTruthPacketV1(payload, {
    scopeType: "executive",
    scopeId: "executive",
    scopeLabel: "סיכום דוח",
    canonicalIntent: plannerIntent,
    parentUtterance: utterance,
  });
  if (!truthPacket) return null;
  return {
    answerBlocks: [{ type: "observation", textHe: String(textHe || "").trim(), source: "continuity_pattern_composer" }],
    plannerIntent,
    truthPacket,
    scopeMeta: {
      generationPath: "pattern_composer",
      continuityPattern: true,
      intentReason: "continuity:approved_pattern",
      scopeConfidence: 0.88,
      scopeReason: "continuity_followup_no_data",
    },
  };
}

function resolveStrongOrLast(payload, conv) {
  const last = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
  if (last && last.q >= STRONG_Q_MIN && last.acc >= STRONG_ACC_MIN) return topicAnchorFields(last);
  const strong = pickStrongestTopic(collectTopicMetrics(payload));
  return strong ? topicAnchorFields(strong) : last ? topicAnchorFields(last) : null;
}

function resolveFollowUpAnchor(payload, conv, { allowWeakestForWhatNow = false } = {}) {
  const strict = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
  if (strict) return topicAnchorFields(strict);
  if (allowWeakestForWhatNow) {
    const weak = pickWeakestTopic(collectTopicMetrics(payload));
    return weak ? topicAnchorFields(weak) : null;
  }
  return null;
}

/**
 * @param {object} params
 */
export function tryComposeContinuityPatternDraft(params) {
  const utteranceStr = String(params?.utteranceStr || "");
  const payload = params?.payload;
  const conv = params?.conversationState || {};
  if (!matchesContinuityFollowUp(utteranceStr)) return null;
  if (!hasConversationContext(conv)) return null;

  const kind = classifyContinuityFollowUp(utteranceStr);
  if (!kind) return null;

  switch (kind) {
    case "home_followup": {
      const ctx = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
      if (!ctx?.q) return { noData: true };
      const anchor = topicAnchorFields(ctx);
      const text = `היום הייתי עושה דבר אחד: פעילות קצרה בנושא ${anchor.subjectLabel} - ${anchor.topicLabel}. בדוח מופיעות שם ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה, ולכן זה מקום טוב לתרגול ממוקד. לעשות 5–10 דקות בלבד, 3–5 שאלות, ובסוף לשאול את הילד: איך חשבת על התשובה?`;
      return continuityDraft(text, anchor, utteranceStr, "what_to_do_today", payload);
    }
    case "what_now": {
      if (priorTurnWasNoData(conv)) {
        let text =
          "כדי לבדוק את זה בצורה פשוטה, כדאי לפתוח תרגול רגיל אחד בלי לחץ זמן בנושא המרכזי שמופיע בדוח, 5–10 דקות בלבד. אחרי כמה שאלות אפשר לבדוק אם התשובות יציבות יותר. אם גם אז אין מספיק מידע בדוח, לא מסיקים מסקנה וממשיכים לצבור תרגול.";
        const anchor = resolveFollowUpAnchor(payload, conv, { allowWeakestForWhatNow: true });
        if (anchor) {
          text += ` הנושא להתחלה: ${anchor.subjectLabel} - ${anchor.topicLabel}.`;
          return continuityDraft(text, anchor, utteranceStr, "what_to_do_now", payload);
        }
        return continuityExecutiveDraft(text, utteranceStr, "what_to_do_now", payload);
      }
      const anchor = resolveFollowUpAnchor(payload, conv, { allowWeakestForWhatNow: true });
      if (!anchor) return { noData: true };
      const text = `הצעד הבא הוא תרגול קצר בנושא ${anchor.subjectLabel} - ${anchor.topicLabel}: 5–10 דקות, מעט שאלות, ואז בדיקה אם התשובות יציבות יותר. לא צריך לפתוח כמה נושאים יחד.`;
      return continuityDraft(text, anchor, utteranceStr, "what_to_do_now", payload);
    }
    case "severity": {
      const ctx = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
      if (!ctx?.q) return { noData: true };
      const anchor = topicAnchorFields(ctx);
      const text = `מהדוח אפשר להתייחס לזה רק כנושא לימודי לתרגול. ב-${anchor.subjectLabel} - ${anchor.topicLabel} מופיעות ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה, ולכן ההמלצה היא להתחיל מתרגול קצר וממוקד, לא להסיק מעבר למה שהדוח מראה.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    case "preserve": {
      const strong = resolveStrongOrLast(payload, conv);
      if (!strong || strong.questionCount < 1) return { noData: true };
      const text = `כדי לשמר את ${strong.subjectLabel} - ${strong.topicLabel}, מספיק תרגול קצר פעם-פעמיים בשבוע. המטרה היא לשמור על רצף בלי להעמיס, ולבדוק שהדיוק נשאר יציב.`;
      return continuityDraft(text, strong, utteranceStr, "what_is_going_well", payload);
    }
    case "if_wrong": {
      const anchor = resolveFollowUpAnchor(payload, conv);
      if (!anchor) return { noData: true };
      const text = `אם הוא טועה בנושא ${anchor.subjectLabel} - ${anchor.topicLabel}, עדיף לעצור אחרי שאלה אחת או שתיים, לבקש ממנו להסביר איך חשב, ואז לפתור יחד שאלה דומה. המטרה היא להבין את הדרך, לא למהר לעוד הרבה שאלות.`;
      return continuityDraft(text, anchor, utteranceStr, "what_to_do_now", payload);
    }
    case "simpler": {
      const anchor = resolveFollowUpAnchor(payload, conv);
      if (!anchor) return { noData: true };
      const text = `במילים פשוטות: הנושא שכדאי להתמקד בו עכשיו הוא ${anchor.subjectLabel} - ${anchor.topicLabel}. כדאי לעשות תרגול קצר, לבדוק איך הוא עונה, ולא להסיק מעבר למה שמופיע בדוח.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    case "shorten": {
      const anchors = extractTopicAnchorsFromSummary(payload, conv, 2);
      if (anchors.length >= 2) {
        const text = `בקצרה: השבוע להתמקד ב-${anchors[0].subjectLabel} - ${anchors[0].topicLabel} וב-${anchors[1].subjectLabel} - ${anchors[1].topicLabel}. לתרגל 5–10 דקות בכל פעם, בלי להעמיס עוד נושאים.`;
        return continuityDraft(text, anchors[0], utteranceStr, "explain_report", payload);
      }
      const anchor = resolveFollowUpAnchor(payload, conv) || (anchors[0] ?? null);
      if (!anchor) return { noData: true };
      const text = `בקצרה: להתמקד ב-${anchor.subjectLabel} - ${anchor.topicLabel}, לתרגל 5–10 דקות, ואז לבדוק אם יש שיפור בתשובות הבאות.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    case "why": {
      if (priorTurnWasWhatNotInfer(conv)) {
        return continuityExecutiveDraft(
          WHY_NOT_INFER_EXPLANATION_HE,
          utteranceStr,
          "report_trust_question",
          payload,
        );
      }
      const ctx = resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: false });
      const anchor = ctx ? topicAnchorFields(ctx) : resolveFollowUpAnchor(payload, conv);
      if (!anchor?.questionCount) return { noData: true };
      const text = `כי בדוח מופיעות ב-${anchor.subjectLabel} - ${anchor.topicLabel} ${anchor.questionCount} שאלות עם ${anchor.accuracyPercent}% הצלחה. זה הנתון שממנו מגיעה ההמלצה.`;
      return continuityDraft(text, anchor, utteranceStr, "explain_report", payload);
    }
    default:
      return null;
  }
}

export function continuityNoDataResponseHe() {
  return NO_DATA_FOR_REQUEST_RESPONSE_HE;
}
